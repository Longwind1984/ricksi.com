// 把「自主上传的本地 ePub 书」+ 导言/副题/epub 合入 reading.json。
// 在 collect-weread 之后跑（见 sync.mjs）；独立、幂等、无微信 key 也能跑。
// 数据源（authored，sync 永不覆写）：data/local-books.json、data/book-extras.json。
// 设计要点：不改 generated_at，故单独重跑本步对 reading.json 零 diff（完全幂等）。
import path from 'node:path';
import { CONFIG } from './config.mjs';
import { readJson, writeJson } from './lib/util.mjs';

const OUT = path.join(CONFIG.dataDir, 'reading.json');

const reading =
  readJson(OUT, null) ||
  { generated_at: null, source: 'local-only', stats: {}, aiTopics: [], shelf: [], highlights: [] };
if (!Array.isArray(reading.aiTopics)) reading.aiTopics = [];

const local = readJson(path.join(CONFIG.dataDir, 'local-books.json'), { topics: [] });
const extras = readJson(path.join(CONFIG.dataDir, 'book-extras.json'), { byId: {}, byTitle: {} });

// 1) 把本地话题组/书 splice 进 aiTopics（按 id 去重）
let added = 0;
for (const lt of local.topics || []) {
  let dest = reading.aiTopics.find((t) => t.id === lt.id);
  if (!dest) {
    dest = { id: lt.id, topic: lt.topic, blurb: lt.blurb, graphFocus: lt.graphFocus ?? null, books: [] };
    reading.aiTopics.push(dest);
  }
  for (const lb of lt.books || []) {
    // 若同名书日后也进了微信书架（另一个 CB_* 版本），继承其 highlights/进度
    const twin = reading.aiTopics
      .flatMap((t) => t.books)
      .find((b) => b.title === lb.title && b.id !== lb.id);
    const merged = {
      ...lb,
      highlights: twin?.highlights?.length ? twin.highlights : lb.highlights || [],
      progress: twin?.progress ?? lb.progress ?? 0,
      notes: twin?.notes ?? lb.notes ?? 0,
      finished: twin?.finished ?? lb.finished ?? false,
    };
    if (!dest.books.some((b) => b.id === lb.id)) {
      dest.books.push(merged);
      added++;
    }
  }
}

// 2) 给所有 AI 书盖 subtitle / intro / epub（byId 优先于 byTitle；不覆盖本地书已带字段）
const byId = extras.byId || {};
const byTitle = extras.byTitle || {};
let stamped = 0;
for (const t of reading.aiTopics) {
  for (const b of t.books) {
    const e = { ...(byTitle[b.title] || {}), ...(byId[b.id] || {}) };
    const intro = (e.intro ?? '').trim();
    if (intro) {
      b.intro = intro;
      stamped++;
    }
    if (!b.subtitle && e.subtitle) b.subtitle = e.subtitle;
    if (!b.epub && e.epub) b.epub = e.epub;
  }
}

writeJson(OUT, reading);
console.log(`✓ 本地自上传书合入：新增 ${added} 本，导言 ${stamped} 条 → ${OUT}`);
