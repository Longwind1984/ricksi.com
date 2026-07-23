// 微信读书数据采集 —— 官方 Agent API Gateway 版
// 文档：~/.claude/skills/weread-skills/（官方 Skill：npx skills add Tencent/WeChatReading）
// 凭证：环境变量 WEREAD_API_KEY 或 scripts/.weread-key 文件（wrk- 开头，已 gitignore，绝不入库）
// 获取：https://weread.qq.com/r/weread-skills 登录后复制 API Key
// 隐私：secret=1 的私密阅读书目一律排除，不出现在公开站点
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { CONFIG } from './config.mjs';
import { readJson, writeJson } from './lib/util.mjs';

const OUT = path.join(CONFIG.dataDir, 'reading.json');
const COVER_DIR = path.resolve('public/assets/books');
const KEY_FILE = path.resolve('scripts/.weread-key');
const GATEWAY = 'https://i.weread.qq.com/api/agent/gateway';
const SKILL_VERSION = '1.0.3';

let apiKey = process.env.WEREAD_API_KEY || '';
if (!apiKey && fs.existsSync(KEY_FILE)) apiKey = fs.readFileSync(KEY_FILE, 'utf8').trim();
if (!apiKey) {
  console.log('[weread] 未配置 API Key（WEREAD_API_KEY 或 scripts/.weread-key），跳过');
  console.log('         获取方式：https://weread.qq.com/r/weread-skills 登录后复制');
  process.exit(0);
}

async function gw(api_name, params = {}) {
  const res = await fetch(GATEWAY, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_name, skill_version: SKILL_VERSION, ...params }),
  });
  if (!res.ok) throw new Error(`${api_name} → HTTP ${res.status}`);
  const j = await res.json();
  if (j.upgrade_info) {
    const detail = j.upgrade_info.message ?? JSON.stringify(j.upgrade_info);
    const error = new Error(`官方 Skill 要求升级：${detail}（请运行 npx skills add Tencent/WeChatReading 后重跑）`);
    error.code = 'WEREAD_SKILL_UPGRADE';
    throw error;
  }
  if (j.errcode && j.errcode !== 0) throw new Error(`${api_name} → 业务错误 ${j.errcode}: ${j.errmsg ?? ''}`);
  return j;
}

try {
  /* 1. 书架（排除私密书；albums = 有声书也计入藏书数） */
  const shelf = await gw('/shelf/sync');
  const books = (shelf.books || []).filter((b) => b.secret !== 1);
  const secretCount = (shelf.books || []).length - books.length;
  const albums = shelf.albums || [];
  const shelfTotal = (shelf.books || []).length + albums.length + (shelf.mp && Object.keys(shelf.mp).length ? 1 : 0);

  /* 2. 笔记本概览（游标分页拉全；总笔记口径 = review + note + bookmark） */
  const noteMap = new Map();
  let totalNoteCount = 0;
  let lastSort;
  for (let page = 0; page < 30; page++) {
    const nb = await gw('/user/notebooks', { count: 100, ...(lastSort ? { lastSort } : {}) });
    if (page === 0) totalNoteCount = nb.totalNoteCount ?? 0;
    for (const b of nb.books || []) {
      noteMap.set(b.bookId, {
        notes: (b.reviewCount || 0) + (b.noteCount || 0) + (b.bookmarkCount || 0),
        progress: b.readingProgress ?? null,
        finished: b.markedStatus === 1,
      });
    }
    if (!nb.hasMore || !(nb.books || []).length) break;
    lastSort = nb.books[nb.books.length - 1].sort;
  }

  /* 3. 总计阅读统计（时长单位是秒） */
  let readDays = null, hours = null;
  try {
    const rd = await gw('/readdata/detail', { mode: 'overall', baseTime: 0 });
    if (rd.totalReadTime) hours = Math.round(rd.totalReadTime / 3600);
    if (rd.readDays) readDays = rd.readDays;
  } catch (e) {
    console.warn('[weread] 阅读统计接口失败（不阻塞）：', e.message);
  }

  /* 4. 规整书目（按最近阅读排序） */
  const enriched = books
    .map((b) => {
      const nb = noteMap.get(b.bookId) || {};
      return {
        id: b.bookId,
        title: b.title,
        author: b.author,
        coverUrl: b.cover || '',
        progress: nb.progress ?? 0,
        finished: b.finishReading === 1 || nb.finished === true,
        notes: nb.notes || 0,
        lastRead: b.readUpdateTime || 0,
      };
    })
    .sort((a, b) => b.lastRead - a.lastRead);

  /* 5. 「最近在读」= 最近碰过且真的读出进度的书（刚加书架未开读的 0% 不算）；
        再用 /book/getprogress 拿精确进度（progress 1 = 1%） */
  const current =
    enriched.find((b) => !b.finished && b.progress > 0) ??
    enriched.find((b) => !b.finished) ??
    enriched[0] ??
    null;
  if (current) {
    try {
      const p = await gw('/book/getprogress', { bookId: current.id });
      if (p.book) {
        current.progress = p.book.progress ?? current.progress;
        current.finished = current.finished || p.book.progress === 100;
        if (p.book.recordReadingTime) current.readSeconds = p.book.recordReadingTime;
      }
    } catch (e) {
      console.warn('[weread] 进度接口失败（沿用笔记本进度）：', e.message);
    }
  }

  /* 5b. AI 共创导入书（CB_ 前缀）：secret 书默认全排除，仅 config 白名单按书名放行。
        同名取 readUpdateTime 最新去重；无封面（导入书拿不到），前端用字排封面。 */
  const cbAll = (shelf.books || []).filter((b) => String(b.bookId).startsWith('CB_'));
  const aiTopics = [];
  for (const t of CONFIG.wereadAiTopics || []) {
    const books = [];
    for (const title of t.titles) {
      const cands = cbAll
        .filter((b) => (b.title || '').trim() === title)
        .sort((a, b) => (b.readUpdateTime || 0) - (a.readUpdateTime || 0));
      const b = cands[0];
      if (!b) {
        console.warn(`[weread] ⚠ 白名单书未在书架找到：《${title}》`);
        continue;
      }
      const nb = noteMap.get(b.bookId) || {};
      books.push({
        id: b.bookId,
        title,
        author: b.author || '',
        cover: (CONFIG.wereadAiCovers || {})[title] ?? null, // 导入书 API 无封面，用本地原版/重绘资产
        progress: nb.progress ?? 0,
        finished: b.finishReading === 1 || nb.finished === true,
        notes: nb.notes || 0,
        lastRead: b.readUpdateTime || 0,
      });
    }
    if (books.length) {
      aiTopics.push({ id: t.id, topic: t.topic, blurb: t.blurb, graphFocus: t.graphFocus || null, books });
    }
  }

  /* 5c. 书架展示中间层：config.wereadShelf 人工白名单（同名版本取读得最深的那本）
        或 auto 旧规则；manual 模式下打印候选清单供筛选 */
  const sh = CONFIG.wereadShelf || {};
  let shelfDisplay;
  if (sh.mode === 'manual' && Array.isArray(sh.titles) && sh.titles.length) {
    shelfDisplay = [];
    for (const t of sh.titles) {
      const cands = enriched
        .filter((b) => b.title === t)
        .sort((a, b) => b.finished - a.finished || b.progress - a.progress || b.lastRead - a.lastRead);
      if (cands[0]) shelfDisplay.push(cands[0]);
      else console.warn(`[weread] ⚠ 书架白名单未找到：《${t}》`);
    }
    const shown = new Set(shelfDisplay.map((b) => b.id));
    const candidates = enriched.filter((b) => !shown.has(b.id) && (b.finished || b.progress > 0 || b.notes > 0));
    if (candidates.length) {
      console.log(`[weread] 候选书目（有阅读痕迹但未在白名单，共 ${candidates.length} 本，前 25 供挑选）：`);
      candidates
        .slice(0, 25)
        .forEach((b) =>
          console.log(
            `    《${b.title}》${b.finished ? ' 读完' : b.progress ? ` ${b.progress}%` : ''}${b.notes ? ` · ${b.notes} 注` : ''}`
          )
        );
    }
  } else {
    shelfDisplay = enriched.filter((b) => b.finished || b.progress > 0);
  }

  /* 5d. 每本展示书抓划线（公开发布到 /reading/<id>/，由白名单中间层控制范围） */
  const detailBooks = [
    ...new Map(
      [...shelfDisplay.slice(0, 24), ...aiTopics.flatMap((t) => t.books), ...(current ? [current] : [])].map((b) => [
        b.id,
        b,
      ])
    ).values(),
  ];
  for (const b of detailBooks) {
    try {
      const bm = await gw('/book/bookmarklist', { bookId: b.id });
      b.highlights = (bm.updated || [])
        .map((m) => (m.markText || '').trim())
        .filter((t) => t.length >= 8)
        .slice(0, 60)
        .map((t) => (t.length > 300 ? t.slice(0, 300) + '…' : t));
    } catch (e) {
      b.highlights = [];
      console.warn(`[weread] 划线抓取失败《${b.title}》：`, e.message);
    }
  }

  /* 5e. 首页代表划线：从 AI 共创书的已抓划线里取 ≤3 条（题材天然可控——2026-06-12 决策） */
  let highlights = [];
  for (const b of aiTopics
    .flatMap((t) => t.books)
    .filter((x) => (x.highlights || []).length)
    .sort((a, b) => b.notes - a.notes)) {
    for (const t of b.highlights) {
      if (highlights.length >= 3) break;
      if (t.length >= 16 && t.length <= 110 && !highlights.some((h) => h.text === t)) {
        highlights.push({ text: t, from: b.title });
      }
    }
    if (highlights.length >= 3) break;
  }

  /* 6. 封面下载（压缩到 240px） */
  fs.mkdirSync(COVER_DIR, { recursive: true });
  let newCovers = 0;
  for (const b of shelfDisplay.slice(0, 24)) {
    if (!b.coverUrl) continue;
    const file = path.join(COVER_DIR, `${b.id}.jpg`);
    b.cover = `/assets/books/${b.id}.jpg`;
    if (fs.existsSync(file)) continue;
    try {
      const res = await fetch(b.coverUrl.replace('/s_', '/t6_'), { headers: { Referer: 'https://weread.qq.com/' } });
      const buf = Buffer.from(await res.arrayBuffer());
      await sharp(buf).resize(240).jpeg({ quality: 78 }).toFile(file);
      newCovers++;
    } catch {
      try {
        const res2 = await fetch(b.coverUrl);
        await sharp(Buffer.from(await res2.arrayBuffer())).resize(240).jpeg({ quality: 78 }).toFile(file);
        newCovers++;
      } catch (e2) {
        b.cover = null;
        console.warn(`[weread] 封面下载失败 ${b.title}: ${e2.message}`);
      }
    }
  }

  const prev = readJson(OUT, null);
  const out = {
    generated_at: new Date().toISOString(),
    source: 'weread-official-gateway',
    stats: {
      total: shelfTotal,
      ebooks: books.length,
      audiobooks: albums.length,
      finished: enriched.filter((b) => b.finished).length,
      reading: enriched.filter((b) => !b.finished && b.progress > 0).length,
      notes: totalNoteCount || prev?.stats?.notes || 0,
      readDays,
      hours,
    },
    current,
    highlights,
    aiTopics,
    shelf: shelfDisplay.slice(0, 24).map(({ coverUrl, ...keep }) => keep),
  };
  writeJson(OUT, out);
  console.log(
    `[weread] 书架 ${out.stats.total}（电子书 ${books.length} + 有声 ${albums.length}）` +
      `${secretCount ? `，已排除私密 ${secretCount} 本` : ''}` +
      ` · 读完 ${out.stats.finished} · 笔记 ${out.stats.notes}` +
      `${hours ? ` · 累计 ${hours}h/${readDays}天` : ''} · 新封面 ${newCovers} → ${OUT}`
  );
} catch (e) {
  console.error('[weread] ✗ 采集失败（API Key 可能无效或过期）：', e.message);
  process.exit(1);
}
