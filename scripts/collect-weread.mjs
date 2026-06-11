// 微信读书数据采集：书架 + 进度 + 笔记数 → data/reading.json + 封面下载
// 凭证：环境变量 WEREAD_COOKIE 或 scripts/.weread-cookie 文件（已 gitignore，绝不入库）。
// 无凭证时静默跳过 —— 页面回退样例书架并标注。
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { CONFIG } from './config.mjs';
import { readJson, writeJson } from './lib/util.mjs';

const OUT = path.join(CONFIG.dataDir, 'reading.json');
const COVER_DIR = path.resolve('public/assets/books');
const COOKIE_FILE = path.resolve('scripts/.weread-cookie');

let cookie = process.env.WEREAD_COOKIE || '';
if (!cookie && fs.existsSync(COOKIE_FILE)) cookie = fs.readFileSync(COOKIE_FILE, 'utf8').trim();
if (!cookie) {
  console.log('[weread] 未配置 cookie（WEREAD_COOKIE 或 scripts/.weread-cookie），跳过');
  process.exit(0);
}

const H = {
  Cookie: cookie,
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
  Referer: 'https://weread.qq.com/',
};

async function api(url) {
  const res = await fetch(url, { headers: H });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const j = await res.json();
  if (j.errcode || j.errCode) throw new Error(`${url} → 业务错误 ${j.errcode ?? j.errCode}: ${j.errmsg ?? j.errMsg ?? ''}`);
  return j;
}

try {
  /* 1. 书架（含书目与进度摘要） */
  const shelf = await api('https://weread.qq.com/web/shelf/sync');
  const books = shelf.books || [];
  const progressMap = new Map((shelf.bookProgress || []).map((p) => [p.bookId, p]));

  /* 2. 笔记本（每本书的划线/想法数） */
  let noteMap = new Map();
  let notesTotal = 0;
  try {
    const nb = await api('https://i.weread.qq.com/user/notebooks');
    for (const b of nb.books || []) {
      const n = (b.noteCount || 0) + (b.reviewCount || 0) + (b.bookmarkCount || 0);
      noteMap.set(b.bookId, n);
      notesTotal += n;
    }
  } catch (e) {
    console.warn('[weread] 笔记本接口失败（不阻塞）：', e.message);
  }

  /* 3. 规整 + 封面下载 */
  fs.mkdirSync(COVER_DIR, { recursive: true });
  const enriched = books
    .map((b) => {
      const prog = progressMap.get(b.bookId) || {};
      return {
        id: b.bookId,
        title: b.title,
        author: b.author,
        coverUrl: (b.cover || '').replace('/s_', '/t6_'),
        progress: prog.progress ?? (b.finishReading ? 100 : 0),
        finished: !!b.finishReading || (prog.progress ?? 0) >= 100,
        notes: noteMap.get(b.bookId) || 0,
        lastRead: b.readUpdateTime || prog.updateTime || 0,
      };
    })
    .sort((a, b) => b.lastRead - a.lastRead);

  const covers = [];
  for (const b of enriched.slice(0, 24)) {
    if (!b.coverUrl) continue;
    const file = path.join(COVER_DIR, `${b.id}.jpg`);
    b.cover = `/assets/books/${b.id}.jpg`;
    if (fs.existsSync(file)) continue;
    try {
      const res = await fetch(b.coverUrl, { headers: { Referer: 'https://weread.qq.com/' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await sharp(buf).resize(240).jpeg({ quality: 78 }).toFile(file);
      covers.push(b.id);
    } catch (e) {
      b.cover = null;
      console.warn(`[weread] 封面下载失败 ${b.title}: ${e.message}`);
    }
  }

  const prev = readJson(OUT, null);
  const reading = enriched.filter((b) => !b.finished && b.progress > 0);
  const out = {
    generated_at: new Date().toISOString(),
    stats: {
      total: enriched.length,
      finished: enriched.filter((b) => b.finished).length,
      reading: reading.length,
      notes: notesTotal || prev?.stats?.notes || 0,
    },
    current: enriched.find((b) => !b.finished && b.progress > 0) ?? enriched[0] ?? null,
    shelf: enriched.slice(0, 18).map(({ coverUrl, ...keep }) => keep),
  };
  writeJson(OUT, out);
  console.log(
    `[weread] 书架 ${out.stats.total} 本（在读 ${out.stats.reading} / 读完 ${out.stats.finished}）` +
      ` 笔记 ${out.stats.notes} 条，新增封面 ${covers.length} → ${OUT}`
  );
} catch (e) {
  console.error('[weread] ✗ 采集失败（cookie 可能过期）：', e.message);
  process.exit(1);
}
