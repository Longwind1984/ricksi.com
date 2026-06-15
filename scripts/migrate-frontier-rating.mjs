// 一次性迁移：给 frontier.json 存量条目补「星图」三维评级
// 旧 importance 时代抓的条目只有单一分数；本脚本调 claude 仅评级（基于已梳理好的
// titleZh+verdict+summaryZh，不改任何内容），补 apparent/absolute/gravity/periodic/canon。
// 口径与新采集（collect-frontier）统一（评级措辞逐字对齐）。已有 absolute 的条目自动跳过。幂等，可重跑。
// 仅本地一次性运行（依赖本机 claude + 代理）；不用于云端 Routine——云端只跑 collect-frontier --remote。
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { CONFIG } from './config.mjs';
import { readJson, writeJson } from './lib/util.mjs';

const F = CONFIG.frontier;
const OUT = path.join(CONFIG.dataDir, 'frontier.json');

/* 代理自重执行（Node fetch/claude 都需要） */
if (F.proxy && process.env.NODE_USE_ENV_PROXY !== '1') {
  const r = spawnSync(process.execPath, [process.argv[1], ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, NODE_USE_ENV_PROXY: '1', HTTPS_PROXY: F.proxy, HTTP_PROXY: F.proxy, https_proxy: F.proxy, http_proxy: F.proxy },
  });
  process.exit(r.status ?? 1);
}

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['apparent', 'absolute', 'gravity', 'periodic', 'canon', 'rationale'],
  properties: {
    apparent: { type: 'integer', minimum: 1, maximum: 5 },
    absolute: { type: 'integer', minimum: 1, maximum: 5 },
    gravity: { type: 'boolean' }, periodic: { type: 'boolean' }, canon: { type: 'boolean' },
    rationale: { type: 'string' },
  },
};

function rate(e) {
  const prompt = `你是「前沿追踪」星图评级 Agent。给下面这条已梳理好的 AI 前沿动态打多维评级，只输出 JSON。
独立打两个分，绝不用声量给分量充值：
· apparent 声量 1-5：当下动静。5=出圈刷屏/主流科技媒体头条；4=圈内沸腾几乎人人转；3=子社区有明显讨论；2=零星少数人注意；1=几乎无声。
· absolute 分量 1-5：真实重要性，与热度无关。5=改写范式（6-12 月后仍必引参照）；4=实质推进（可靠新方法/新结果/重要数据，后续会建立其上）；3=有效增量（扎实改进/复现/有用工具/综述）；2=边角衍生/轻量观点；1=无实质/噪声/纯情绪。
· 三个布尔默认 false，极少为 true（置 true 须在 rationale 说明）：gravity=隐体黑洞，仅当「本体完全未公开、无法直接读到」（保密项目/未发布模型，其重量只能从第三方连锁反应反推）才 true——任何已公开可读的论文/帖子/发布/报道一律 gravity=false；periodic=可识别的周期性回归话题潮；canon=已被领域确立为奠基正典/必读参照（当下新发布几乎都不是）。
· 法则：亮≠重，两分独立；absolute 拿不准向下取整；在「炒作」与「实质」间犹豫按实质打 absolute。
· rationale：一句话评级理由。

人物/来源：${e.ownerName ?? e.sourceName}
类型：${e.contentType}
标题：${e.titleZh}
判断：${e.verdict}
摘要：${e.summaryZh}`;
  const env = { ...process.env };
  if (F.proxy) Object.assign(env, { HTTPS_PROXY: F.proxy, HTTP_PROXY: F.proxy, https_proxy: F.proxy, http_proxy: F.proxy });
  const r = spawnSync(
    F.claude.bin,
    ['-p', '--output-format', 'json', '--json-schema', JSON.stringify(SCHEMA),
     '--no-session-persistence', '--model', F.claude.model,
     '--disallowedTools', 'Bash', 'Edit', 'Write', 'WebFetch', 'WebSearch', 'Task', 'NotebookEdit'],
    { input: prompt, encoding: 'utf8', timeout: F.claude.timeoutMs, killSignal: 'SIGKILL', maxBuffer: 16 * 1024 * 1024, cwd: os.homedir(), env }
  );
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || '').slice(0, 200));
  const env2 = JSON.parse(r.stdout);
  return env2.structured_output ?? env2.structuredOutput ?? JSON.parse(env2.result.match(/\{[\s\S]*\}/)[0]);
}

const FORCE = process.argv.includes('--force'); // 重评所有条目（prompt 调整后覆盖旧评级）
const data = readJson(OUT);
if (!data) { console.error('无 frontier.json，先跑 collect-frontier'); process.exit(1); }

/* 补全归属名（schema 没存 ownerName，这里从 config 解析仅供 prompt 用） */
const owner = new Map();
for (const p of F.people) owner.set(p.slug, p.name);
for (const t of F.topics) owner.set(t.slug, t.name);

let done = 0, skip = 0, fail = 0;
for (const e of data.entries) {
  if (!FORCE && typeof e.absolute === 'number' && typeof e.apparent === 'number') { skip++; continue; }
  e.ownerName = owner.get(e.person ?? e.topicSource) ?? e.sourceName;
  process.stdout.write(`[migrate] ${e.titleZh.slice(0, 28)} … `);
  try {
    const o = rate(e);
    e.apparent = o.apparent; e.absolute = o.absolute; e.importance = o.absolute;
    e.gravity = o.gravity; e.periodic = o.periodic; e.canon = o.canon; e.rationale = o.rationale;
    delete e.ownerName;
    done++;
    console.log(`✓ 声${o.apparent}/量${o.absolute}${o.gravity ? ' 黑洞' : ''}${o.canon ? ' 正典' : ''}`);
  } catch (err) {
    delete e.ownerName;
    fail++;
    console.log('✗ ' + err.message?.slice(0, 80));
  }
}
writeJson(OUT, data);
console.log(`[migrate] 补评级 ${done} 条，跳过 ${skip}，失败 ${fail} → ${path.relative(process.cwd(), OUT)}`);
