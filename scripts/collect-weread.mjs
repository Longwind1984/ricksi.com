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
    console.warn(`[weread] ⚠ 官方 Skill 要求升级：${j.upgrade_info.message ?? JSON.stringify(j.upgrade_info)}`);
    console.warn('         请运行：npx skills add Tencent/WeChatReading 更新后重跑');
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

  /* 5. 「最近在读」候选用 /book/getprogress 拿精确进度（progress 1 = 1%） */
  const current = enriched.find((b) => !b.finished) ?? enriched[0] ?? null;
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

  /* 6. 封面下载（压缩到 240px） */
  fs.mkdirSync(COVER_DIR, { recursive: true });
  let newCovers = 0;
  for (const b of enriched.slice(0, 24)) {
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
    shelf: enriched.slice(0, 18).map(({ coverUrl, ...keep }) => keep),
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
