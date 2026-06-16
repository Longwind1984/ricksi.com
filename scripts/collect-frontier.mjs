// 前沿追踪采集 —— 学者/信息源公开动态 → claude 无头梳理 → data/frontier.json
// 流程：抓取(rss/arxiv/x/youtube) → lookback+去重+预过滤 → claude -p 逐条加工 → 滚动 90 天落盘
// 凭证：无（claude CLI 走本机订阅授权；--no-session-persistence 防止污染 usage/activity 统计）
// 单源/单条失败不阻塞整体；X 镜像全败 = 该源本次缺失，计入 stats.lastRun.skippedSources
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CONFIG } from './config.mjs';
import { readJson, writeJson, dayKey } from './lib/util.mjs';

const F = CONFIG.frontier;
const OUT = path.join(CONFIG.dataDir, 'frontier.json');
const SEEN = path.join(CONFIG.dataDir, 'frontier-seen.json');
const ARCHIVE_DIR = path.join(CONFIG.dataDir, 'frontier');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/* 云端 Routine 兜底模式（--remote / FRONTIER_REMOTE=1）：直连不走代理、跳过被墙的 X 源、claude 走 PATH。
   详见 docs/frontier-routine.md。本地 LaunchAgent 不传此标志，走完整管线（含 X 镜像 + 本机代理）。 */
const REMOTE = process.argv.includes('--remote') || process.env.FRONTIER_REMOTE === '1';

/* ── 代理：Node 的内置 fetch 不读 http_proxy，需 NODE_USE_ENV_PROXY=1；
   配置了代理且未生效时，注入 env 自我重执行（LaunchAgent 环境下也成立）。REMOTE 直连，跳过 ── */
if (F.proxy && !REMOTE && process.env.NODE_USE_ENV_PROXY !== '1') {
  const r = spawnSync(process.execPath, [process.argv[1], ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_USE_ENV_PROXY: '1',
      HTTPS_PROXY: F.proxy, HTTP_PROXY: F.proxy,
      https_proxy: F.proxy, http_proxy: F.proxy,
    },
  });
  process.exit(r.status ?? 1);
}

/* ════ 抓取层 ════ */

async function fetchText(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(F.fetchTimeoutMs),
    redirect: 'follow',
    headers: { 'user-agent': UA },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

/* RSS 2.0 / Atom 容错解析：只取 5 个字段，正则切块够用；
   若 ≥2 个真实源解析翻车，按约定升级 fast-xml-parser */
function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ');
}
function stripTags(s) {
  return decodeEntities(s)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}
function pickTag(block, ...tags) {
  for (const tag of tags) {
    const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
    if (m && m[1].trim()) return m[1].trim();
  }
  return '';
}
function parseFeed(xml) {
  const blocks = [
    ...(xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []),
    ...(xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || []),
  ];
  const items = [];
  for (const block of blocks) {
    const title = stripTags(pickTag(block, 'title'));
    let link = pickTag(block, 'link');
    if (!link || /</.test(link)) {
      const m =
        block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) ||
        block.match(/<link[^>]*href=["']([^"']+)["']/i);
      link = m ? m[1] : '';
    }
    link = decodeEntities(link).trim();
    const dateRaw = stripTags(pickTag(block, 'pubDate', 'published', 'updated', 'dc:date'));
    const publishedAt = Date.parse(dateRaw) || 0;
    const content = pickTag(block, 'content:encoded', 'media:description', 'content', 'description', 'summary');
    if (link) items.push({ title, link, publishedAt, text: stripTags(content) });
  }
  return items;
}

async function collectRss(src) {
  return parseFeed(await fetchText(src.url));
}
async function collectArxiv(src) {
  const url =
    'https://export.arxiv.org/api/query?search_query=' + encodeURIComponent(src.query) +
    '&sortBy=submittedDate&sortOrder=descending&max_results=' + (src.maxResults || 10);
  return parseFeed(await fetchText(url));
}
async function collectYoutube(src) {
  return parseFeed(await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${src.channelId}`));
}
/* X 请求全局串行 + 1.2s 间隔：并发打镜像站会触发限流（实测 nitter 连续请求返回 400） */
let xChain = Promise.resolve();
function xThrottle() {
  const turn = xChain.then(() => new Promise((r) => setTimeout(r, 1200)));
  xChain = turn.catch(() => {});
  return turn;
}
async function collectX(src) {
  await xThrottle();
  let lastErr = null;
  for (const tpl of F.xMirrors) {
    const url = tpl.replace('{handle}', src.handle);
    try {
      let items = parseFeed(await fetchText(url));
      if (!F.includeRetweets) items = items.filter((i) => !/^(RT by|R to)\s/i.test(i.title));
      // xcancel 对未白名单的抓取方返回占位 RSS（标题 "RSS reader not yet whitelisted!"），当垃圾过滤
      items = items.filter((i) => !/not yet whitelisted/i.test(i.title));
      if (items.length) return items;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('全部 X 镜像无数据');
}

const COLLECTORS = { rss: collectRss, arxiv: collectArxiv, youtube: collectYoutube, x: collectX };

function sourceName(src, owner) {
  if (src.type === 'x') return `X @${src.handle}`;
  if (src.type === 'youtube') return 'YouTube';
  if (src.type === 'arxiv') return 'arXiv';
  try { return new URL(src.url).hostname.replace(/^www\./, ''); } catch { return owner.name; }
}

/* ── canonical URL：剥跟踪参数/hash/尾斜杠；X 镜像域名归一为 x.com（跨镜像去重） ── */
const X_MIRROR_DOMAINS = new Set(
  F.xMirrors.flatMap((t) => {
    try {
      const host = new URL(t.replace('{handle}', 'u')).hostname;
      return [host, host.split('.').slice(-2).join('.')]; // 含注册域：rss.xcancel.com → xcancel.com
    } catch { return []; }
  })
);
function canonicalUrl(raw) {
  try {
    const u = new URL(raw);
    const base = u.hostname.split('.').slice(-2).join('.');
    if (/\/status\/\d+/.test(u.pathname) && (X_MIRROR_DOMAINS.has(u.hostname) || X_MIRROR_DOMAINS.has(base))) {
      u.hostname = 'x.com';
      u.search = '';
    }
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|ref$|source$|si$)/.test(k)) u.searchParams.delete(k);
    let s = u.toString();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s;
  } catch {
    return raw;
  }
}
const idOf = (url) => crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);

/* ── 正文增强：RSS 摘要过短时抓原文页剥标签（X 条目天然全文，不增强） ── */
async function enhanceText(item) {
  // REMOTE：原文页可能也在墙外，跳过增强避免逐条 fetch 空等超时（回退 RSS 摘要）
  if (REMOTE || item.sourceType === 'x' || item.text.length >= F.fullText.minChars) return;
  try {
    const html = await fetchText(item.url);
    const body = stripTags(html.replace(/^[\s\S]*?<body/i, '<body'));
    if (body.length > item.text.length) item.text = body;
  } catch { /* 增强失败用原摘要继续 */ }
  item.text = item.text.slice(0, F.fullText.maxChars);
}

/* ════ claude 无头加工 ════ */

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['titleZh', 'verdict', 'summaryZh', 'tags', 'contentType', 'apparent', 'absolute', 'gravity', 'periodic', 'singularity', 'rationale', 'relevant', 'insufficientContext'],
  properties: {
    titleZh: { type: 'string', description: '中文标题，≤40 字' },
    verdict: { type: 'string', description: '一句话判断：这条为什么重要，≤60 字' },
    summaryZh: { type: 'string', description: '中文摘要 200-400 字；信息不足时可短' },
    tags: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 },
    contentType: { type: 'string', enum: ['authored', 'statement', 'action', 'cited', 'business'] },
    // 星图评级三维（星类由前端 frontier-ui.starOf 确定性映射，此处只打分；详见 docs/star-rating.md）
    apparent: { type: 'integer', minimum: 1, maximum: 5, description: '声量/视亮度：当下动静多大' },
    absolute: { type: 'integer', minimum: 1, maximum: 5, description: '分量/绝对亮度：真实重要性，与热度无关' },
    gravity: { type: 'boolean', description: '隐体：本体不可观测但可由其对周围影响反推高分量（罕见）' },
    periodic: { type: 'boolean', description: '周期性回归的话题潮（少见）' },
    singularity: { type: 'boolean', description: '技术演进史的分水岭事件（如 Attention 论文/GPT-3.5/DeepSeek R1，日常抓取几乎一律 false）' },
    rationale: { type: 'string', description: '一句话评级理由' },
    relevant: { type: 'boolean' },
    insufficientContext: { type: 'boolean' },
  },
};

/* 既有标签词表：每次运行前从现有数据取 TOP30 注入 prompt，要求优先复用——
   控制标签漂移（同义新造），新增人物/源也自动继承同一套词表 */
let TAG_VOCAB = [];

function buildPrompt(item) {
  const vocabLine = TAG_VOCAB.length
    ? `\n7. 标签优先从既有词表复用（避免同义新造，确实没有合适的才造新词）：${TAG_VOCAB.join('、')}`
    : '';
  return `你是「前沿追踪」编辑，为 AI 产品经理的个人工作台梳理 AI 领域前沿动态。基于下面这条原始材料，输出结构化 JSON。

【硬约束】
1. 摘要与判断只能基于提供的材料，禁止补充材料之外的事实、数字、引语；材料信息不足时置 insufficientContext=true 并把摘要收短。
2. 与 AI/科技前沿无关（生活闲谈、转发抽奖、纯社交寒暄）→ relevant=false。
3. 涉及中国政治、地缘政治争议、选举政治的内容 → relevant=false（站点部署在备案域名，这是硬性合规线）。
4. contentType 分类：authored=本人署名作品（论文/博客/视频），statement=本人公开发言（推文观点/访谈/演讲），action=个人行动（联署/发布产品/创办组织），cited=他人引用或报道该人物，business=资本/商业事件（融资/IPO/估值/并购/上市）。
   ⚠ business 事件的 absolute 只按其对 AI 能力或行业格局的真实影响打分，不因金额大就给高分——融资/IPO 本身通常 absolute≤3（声量可高，但不改写能力边界）。
5. 星图评级（多维，替代单一分数）——独立打两个分，绝不用声量给分量充值：
   · apparent 声量 1-5：当下动静。5=出圈刷屏/主流科技媒体头条；4=圈内沸腾几乎人人转；3=子社区有明显讨论；2=零星少数人注意；1=几乎无声或本体刻意未公开。
   · absolute 分量 1-5：真实重要性，与热度无关。5=改写范式（6-12 月后仍必引参照）；4=实质推进（可靠新方法/新结果/重要数据，后续会建立其上）；3=有效增量（扎实改进/复现/有用工具/综述）；2=边角衍生/轻量观点；1=无实质/噪声/纯情绪。
   · 三个布尔（默认 false，极少为 true，置 true 须在 rationale 说明依据）：gravity=隐体黑洞，仅当「本体完全未公开、无法直接读到」（保密项目/未发布模型，其重量只能从第三方连锁反应反推）才 true——任何已公开可读的论文/帖子/发布/报道一律不是黑洞，gravity=false；periodic=可识别的周期性回归话题潮（每隔一阵就回来）；singularity=奇点，技术演进史的分水岭（如 Attention 论文 / GPT-3.5 发布 / DeepSeek R1 这种重定义时代的事件）——日常新发布几乎都不是，置 true 须在 rationale 说明为何是时代分水岭。
   · 法则：亮≠重，两个分相互独立；absolute 拿不准向下取整；在「炒作」与「实质」之间犹豫，按实质打 absolute、把热度交给 apparent。
   · rationale：一句话说明为何这样打分。
6. 全部输出用简体中文（专有名词保留英文）。${vocabLine}

【材料】
人物/来源：${item.ownerName}（${item.sourceName}）
发布时间：${item.date}
原始标题：${item.title || '（无标题，X 短帖）'}
原文链接：${item.url}
正文/摘录：
${item.text || '（仅有标题）'}`;
}

function runClaude(prompt) {
  const env = { ...process.env };
  if (F.proxy && !REMOTE) Object.assign(env, { HTTPS_PROXY: F.proxy, HTTP_PROXY: F.proxy, https_proxy: F.proxy, http_proxy: F.proxy });
  const r = spawnSync(
    REMOTE ? 'claude' : F.claude.bin,
    ['-p', '--output-format', 'json', '--json-schema', JSON.stringify(OUTPUT_SCHEMA),
     '--no-session-persistence', '--model', F.claude.model,
     '--disallowedTools', 'Bash', 'Edit', 'Write', 'WebFetch', 'WebSearch', 'Task', 'NotebookEdit'],
    {
      input: prompt, encoding: 'utf8',
      timeout: F.claude.timeoutMs, killSignal: 'SIGKILL',
      maxBuffer: 16 * 1024 * 1024,
      cwd: os.homedir(), // 避开本仓库，防止自动加载项目 CLAUDE.md
      env,
    }
  );
  if (r.error) throw r.error;
  if (r.status !== 0) {
    const msg = (r.stderr || r.stdout || '').slice(0, 500);
    const limited = /limit|rate|quota|usage/i.test(msg);
    const err = new Error(`claude 退出码 ${r.status}: ${msg}`);
    err.rateLimited = limited;
    throw err;
  }
  let envelope;
  try {
    envelope = JSON.parse(r.stdout);
  } catch {
    throw new Error(`claude stdout 不是合法 JSON（前 200 字符）：${r.stdout.slice(0, 200)}`);
  }
  // --output-format json 的包络：结构化结果优先取 structured_output，回退解析 result 文本
  const out = envelope.structured_output ?? envelope.structuredOutput ?? null;
  if (out) return out;
  if (typeof envelope.result === 'string') {
    const m = envelope.result.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* 落到下面的统一报错 */ }
    }
  }
  throw new Error('claude 输出中未找到结构化结果');
}

function enrichEntry(item) {
  let lastErr;
  for (let i = 0; i <= F.claude.retries; i++) {
    try {
      return runClaude(buildPrompt(item));
    } catch (e) {
      lastErr = e;
      if (e.rateLimited) throw e; // 限流不重试，直接上抛中止队列
    }
  }
  throw lastErr;
}

/* ════ 主流程 ════ */

/* config 守卫：新增人物/话题时的管线通断检查点——schema 不合法直接退出，
   软问题（缺头像/缺 bio）只警告。这是「批量加人保持一致」的第一道合同 */
function validateFrontierConfig() {
  const errs = [];
  const warns = [];
  const slugs = new Set();
  for (const [kind, list] of [['people', F.people], ['topics', F.topics]]) {
    for (const o of list) {
      if (!/^[a-z0-9-]+$/.test(o.slug ?? '')) errs.push(`${kind}: slug 不合法（须 kebab-case）：${o.slug}`);
      if (slugs.has(o.slug)) errs.push(`slug 重复：${o.slug}`);
      slugs.add(o.slug);
      if (!F.domains[o.domain]) errs.push(`${o.slug}: domain "${o.domain}" 不在枚举 ${Object.keys(F.domains).join('/')}（要扩分类先改 domains）`);
      if (!o.sources?.length) warns.push(`${o.slug}: 没有任何 source，永远抓不到内容`);
      for (const s of o.sources ?? []) {
        if (!COLLECTORS[s.type]) errs.push(`${o.slug}: 未知 source type "${s.type}"（可用：${Object.keys(COLLECTORS).join('/')}）`);
        if (s.type === 'x' && !/^\w{1,15}$/.test(s.handle ?? '')) errs.push(`${o.slug}: X handle 不合法：${s.handle}`);
        if (s.type === 'rss' && !/^https?:\/\//.test(s.url ?? '')) errs.push(`${o.slug}: rss url 不合法：${s.url}`);
      }
    }
  }
  for (const p of F.people) {
    if (!p.title || !p.bio) warns.push(`${p.slug}: title/bio 缺失（人物卡会空一块）`);
    if (!fs.existsSync(path.resolve(F.portrait.dir, `${p.slug}.webp`))) warns.push(`${p.slug}: 缺头像（npm run frontier:portraits 生成；缺图时前端用字母牌兜底）`);
  }
  if (errs.length) {
    errs.forEach((e) => console.error(`[frontier] ✗ config 校验失败：${e}`));
    process.exit(1);
  }
  warns.forEach((w) => console.warn(`[frontier] ⚠ config：${w}`));
}
validateFrontierConfig();

const now = Date.now();
const today = dayKey(new Date());
const cutoff = now - F.lookbackDays * 86400 * 1000;

/* 展开 源×归属 任务表 */
const jobs = [];
const srcOk = (s) => !REMOTE || s.type !== 'x'; // REMOTE：X 镜像被墙，云端跳过（详见 docs/frontier-routine.md）
for (const p of F.people) for (const s of p.sources) if (srcOk(s)) jobs.push({ src: s, owner: p, person: p.slug, topicSource: null });
for (const t of F.topics) for (const s of t.sources) if (srcOk(s)) jobs.push({ src: s, owner: t, person: null, topicSource: t.slug });
if (REMOTE) console.log(`[frontier] REMOTE 模式：直连、claude 走 PATH，已过滤 X 源 job（剩 ${jobs.length} 个公网源待抓）`);

console.log(`[frontier] ${F.people.length} 人 + ${F.topics.length} 话题，共 ${jobs.length} 个源`);

/* 抓取（并发 4，allSettled 单源失败不阻塞） */
const skippedSources = [];
const fetched = [];
for (let i = 0; i < jobs.length; i += 4) {
  const batch = jobs.slice(i, i + 4);
  const results = await Promise.allSettled(
    batch.map(async (job) => {
      const items = await COLLECTORS[job.src.type](job.src);
      return { job, items };
    })
  );
  results.forEach((res, j) => {
    const job = batch[j];
    const label = `${job.src.type}:${job.owner.slug ?? job.owner.name}${job.src.handle ? '@' + job.src.handle : ''}`;
    if (res.status === 'rejected') {
      console.warn(`[frontier] ✗ ${label} — ${res.reason?.message ?? res.reason}`);
      skippedSources.push(label);
      return;
    }
    const fresh = res.value.items
      .filter((it) => it.publishedAt >= cutoff && it.publishedAt <= now + 86400 * 1000)
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .slice(0, F.maxPerSource);
    console.log(`[frontier] ✓ ${label} — feed ${res.value.items.length} 条，窗口内 ${fresh.length} 条`);
    for (const it of fresh) {
      const url = canonicalUrl(it.link);
      fetched.push({
        id: idOf(url), url,
        title: it.title, text: it.text,
        publishedAt: it.publishedAt, date: dayKey(new Date(it.publishedAt)),
        person: job.person, topicSource: job.topicSource,
        ownerName: job.owner.name,
        sourceType: job.src.type, sourceName: sourceName(job.src, job.owner),
      });
    }
  });
}

/* 去重 + 预过滤 */
const seen = readJson(SEEN, {}) ?? {};
const existing = readJson(OUT, null);

/* 标签词表：现有条目 TOP30 高频标签 */
{
  const freq = new Map();
  for (const e of existing?.entries ?? []) for (const t of e.tags ?? []) freq.set(t, (freq.get(t) ?? 0) + 1);
  TAG_VOCAB = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([t]) => t);
}
const markSeen = (id, status) => {
  const rec = seen[id] || { firstSeen: today, attempts: 0 };
  rec.status = status;
  if (status === 'llm-failed') rec.attempts = (rec.attempts || 0) + 1;
  seen[id] = rec;
};

const dedup = new Map();
for (const it of fetched) if (!dedup.has(it.id)) dedup.set(it.id, it);

let queue = [];
for (const it of dedup.values()) {
  const rec = seen[it.id];
  if (rec && !(rec.status === 'llm-failed' && rec.attempts < 3)) continue;
  const probe = `${it.title}\n${it.text}`;
  if (F.excludePatterns.some((re) => re.test(probe))) {
    markSeen(it.id, 'excluded');
    continue;
  }
  queue.push(it);
}
queue.sort((a, b) => b.publishedAt - a.publishedAt);
const dropped = Math.max(0, queue.length - F.maxNewPerRun);
if (dropped) console.log(`[frontier] 待处理 ${queue.length} 条超出上限，截断丢弃最旧 ${dropped} 条（不标 seen，明日窗口内可补）`);
queue = queue.slice(0, F.maxNewPerRun);

console.log(`[frontier] 抓到 ${fetched.length} 条，去重/过滤后待加工 ${queue.length} 条`);

/* --dry-run：只看抓取/去重结果，不调 claude、不写任何文件 */
if (process.argv.includes('--dry-run')) {
  for (const it of queue) console.log(`  · ${it.date} [${it.sourceType}] ${it.ownerName} — ${(it.title || it.text).slice(0, 70)}`);
  console.log(`[frontier] dry-run 结束（未调用 claude、未写盘）`);
  process.exit(0);
}

/* claude 逐条加工（串行；限流即中止剩余，未处理条目不标 seen 次日补做） */
const newEntries = [];
let llmFailed = 0;
let rateLimited = false;
for (const [idx, item] of queue.entries()) {
  await enhanceText(item);
  process.stdout.write(`[frontier] claude ${idx + 1}/${queue.length} ${item.ownerName} … `);
  try {
    const out = enrichEntry(item);
    if (!out.relevant) {
      console.log('跳过（relevant=false）');
      markSeen(item.id, 'excluded');
      continue;
    }
    newEntries.push({
      id: item.id, date: item.date,
      person: item.person, topicSource: item.topicSource,
      sourceName: item.sourceName, sourceType: item.sourceType,
      contentType: out.contentType,
      titleZh: out.titleZh,
      titleOriginal: item.title || item.text.slice(0, 80),
      verdict: out.verdict, summaryZh: out.summaryZh,
      tags: out.tags.map((t) => t.replaceAll('|', '/')), // 前端 data-tags 以 | 分隔，标签内不允许出现
      url: item.url,
      excerpt: item.text.slice(0, 500),
      // 星图评级三维（星类前端算）；保留 importance=absolute 向后兼容旧前端选条逻辑
      apparent: out.apparent,
      absolute: out.absolute,
      importance: out.absolute,
      gravity: out.gravity,
      periodic: out.periodic,
      singularity: out.singularity,
      rationale: out.rationale,
      insufficientContext: out.insufficientContext,
      addedAt: today, // 入库日（≠发布日）：前端用来标 NEW
    });
    markSeen(item.id, 'published');
    console.log(`✓ ${out.titleZh}`);
  } catch (e) {
    if (e.rateLimited) {
      console.log(`限流，中止剩余 ${queue.length - idx} 条（次日补做）`);
      rateLimited = true;
      break;
    }
    console.log(`✗ ${e.message?.slice(0, 120)}`);
    markSeen(item.id, 'llm-failed');
    llmFailed++;
  }
}

/* 落盘：消毒 → 合并 → 滚动归档 */
const sanitizeText = (s) => (s ? CONFIG.sanitize.blockWords.reduce((acc, w) => acc.replaceAll(w, '〔□〕'), s) : s);
for (const e of newEntries) {
  e.titleZh = sanitizeText(e.titleZh);
  e.verdict = sanitizeText(e.verdict);
  e.summaryZh = sanitizeText(e.summaryZh);
}

const oldEntries = existing?.entries ?? [];
const newIds = new Set(newEntries.map((e) => e.id));
let entries = [...newEntries, ...oldEntries.filter((e) => !newIds.has(e.id))];
entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

const rollCutoff = dayKey(new Date(now - F.rollingDays * 86400 * 1000));
const keep = entries.filter((e) => e.date >= rollCutoff);
const roll = entries.filter((e) => e.date < rollCutoff);
if (roll.length) {
  const byMonth = new Map();
  for (const e of roll) {
    const m = e.date.slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m).push(e);
  }
  for (const [m, list] of byMonth) {
    const file = path.join(ARCHIVE_DIR, `archive-${m}.json`);
    const prev = readJson(file, { entries: [] });
    const ids = new Set(prev.entries.map((e) => e.id));
    prev.entries.push(...list.filter((e) => !ids.has(e.id)));
    prev.entries.sort((a, b) => (a.date < b.date ? 1 : -1));
    writeJson(file, prev);
  }
  console.log(`[frontier] ${roll.length} 条滚入月度归档`);
}

/* seen 过期清理（只清理日期格式合法且确实过期的；畸形 firstSeen 保留待人工查） */
const seenCutoff = dayKey(new Date(now - F.seenTtlDays * 86400 * 1000));
for (const [k, v] of Object.entries(seen)) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v.firstSeen || '') && v.firstSeen < seenCutoff) delete seen[k];
}

const totalAllTime = (existing?.stats?.totalAllTime ?? oldEntries.length) + newEntries.length;
writeJson(OUT, {
  generated_at: new Date().toISOString(),
  rollingDays: F.rollingDays,
  domains: F.domains,
  people: F.people.map(({ slug, name, domain, title, bio }) => ({ slug, name, domain, title, bio })),
  topics: F.topics.map(({ slug, name, domain }) => ({ slug, name, domain })),
  stats: {
    totalEntries: keep.length,
    totalAllTime,
    lastRun: {
      at: new Date().toISOString(),
      fetched: fetched.length,
      processed: queue.length,
      added: newEntries.length,
      llmFailed,
      rateLimited,
      skippedSources,
    },
  },
  entries: keep,
});
writeJson(SEEN, seen);

console.log(`[frontier] ✓ 新增 ${newEntries.length} 条（失败 ${llmFailed}），现存 ${keep.length} 条 → ${path.relative(process.cwd(), OUT)}`);
if (skippedSources.length) console.log(`[frontier] ⚠ 本次缺失源：${skippedSources.join(', ')}`);
