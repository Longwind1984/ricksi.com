// 把「自主上传的本地 ePub 书」+ 导言/副题/epub 合入 reading.json。
// 在 collect-weread 之后跑（见 sync.mjs）；独立、幂等、无微信 key 也能跑。
// 数据源（authored，sync 永不覆写）：data/local-books.json、data/book-extras.json。
// 设计要点：不改 generated_at，故单独重跑本步对 reading.json 零 diff（完全幂等）。
// 步骤 0：从 30书架（CONFIG.bookshelfDir）同步 epub 产物——本地有源才跑，CI/无目录静默跳过。
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { CONFIG } from './config.mjs';
import { readJson, writeJson } from './lib/util.mjs';

const OUT = path.join(CONFIG.dataDir, 'reading.json');
const PUB = path.resolve('public');
const COVER_W = 500, COVER_H = 800; // 与既有封面一致（500×800 png）

const reading =
  readJson(OUT, null) ||
  { generated_at: null, source: 'local-only', stats: {}, aiTopics: [], shelf: [], highlights: [] };
if (!Array.isArray(reading.aiTopics)) reading.aiTopics = [];

const local = readJson(path.join(CONFIG.dataDir, 'local-books.json'), { topics: [] });
const extras = readJson(path.join(CONFIG.dataDir, 'book-extras.json'), { byId: {}, byTitle: {} });

// ── 0) 书架同步：从 30书架拉 epub（源更新即覆盖）+ 缺失时从 epub 内提取封面压到 500×800 ──
// epub 永远以 30书架为准（always-update）；封面只在缺失时生成（既有封面是人工精修的缩图，不擅动）。
await syncBookshelf(local);

async function syncBookshelf(local) {
  const src = CONFIG.bookshelfDir;
  if (!src || !fs.existsSync(src)) {
    console.log('· 跳过书架同步（本地无 30书架 目录，沿用已提交产物）');
    return;
  }
  let copied = 0, covered = 0;
  for (const lt of local.topics || []) {
    for (const lb of lt.books || []) {
      if (!lb.sourceFile || !lb.epub) continue;
      const srcEpub = path.join(src, lb.sourceFile);
      if (!fs.existsSync(srcEpub)) {
        console.warn(`  ⚠ 书架源缺失，跳过：${lb.sourceFile}`);
        continue;
      }
      const slug = path.basename(lb.epub, '.epub');
      const destEpub = path.join(PUB, 'assets/books/epub', slug + '.epub');
      const destCover = path.join(PUB, 'assets/books/epub-covers', slug + '.png');
      // epub：源 mtime 更新或目标缺失 → 覆盖
      const srcM = fs.statSync(srcEpub).mtimeMs;
      if (!fs.existsSync(destEpub) || fs.statSync(destEpub).mtimeMs < srcM) {
        fs.mkdirSync(path.dirname(destEpub), { recursive: true });
        fs.copyFileSync(srcEpub, destEpub);
        copied++;
        console.log(`  ✓ epub  ${slug}`);
      }
      // 封面：仅缺失时从 epub 内 cover-image 提取并压到 500×800
      if (!fs.existsSync(destCover)) {
        try {
          await extractCover(srcEpub, destCover);
          covered++;
          console.log(`  ✓ 封面  ${slug}`);
        } catch (e) {
          console.warn(`  ⚠ 封面提取失败 ${slug}：${e.message}`);
        }
      }
    }
  }
  console.log(`✓ 书架同步：epub ${copied} 本，封面 ${covered} 张（源 ${src}）`);
}

// 从 epub（zip）内解析 cover-image 路径并提取，sharp 压到 500×800 png。
// 用系统 unzip（macOS/Linux CI 均自带）；本步只在本地有 30书架 时执行，CI 不会触达。
async function extractCover(epubPath, destCover) {
  const container = execFileSync('unzip', ['-p', epubPath, 'META-INF/container.xml'], { encoding: 'utf8' });
  const opfRel = /full-path="([^"]+)"/.exec(container)?.[1];
  if (!opfRel) throw new Error('container.xml 无 OPF 路径');
  const opf = execFileSync('unzip', ['-p', epubPath, opfRel], { encoding: 'utf8' });
  const opfDir = path.posix.dirname(opfRel);
  // 优先 EPUB3 properties="cover-image"，回退 EPUB2 <meta name="cover" content=ID>
  let href =
    /<item\b[^>]*\bproperties="[^"]*\bcover-image\b[^"]*"[^>]*\bhref="([^"]+)"/.exec(opf)?.[1] ||
    /<item\b[^>]*\bhref="([^"]+)"[^>]*\bproperties="[^"]*\bcover-image\b[^"]*"/.exec(opf)?.[1];
  if (!href) {
    const id = /<meta\s+name="cover"\s+content="([^"]+)"/.exec(opf)?.[1];
    if (id) {
      const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      href =
        new RegExp(`<item\\b[^>]*\\bid="${esc}"[^>]*\\bhref="([^"]+)"`).exec(opf)?.[1] ||
        new RegExp(`<item\\b[^>]*\\bhref="([^"]+)"[^>]*\\bid="${esc}"`).exec(opf)?.[1];
    }
  }
  if (!href) throw new Error('OPF 内未找到封面项');
  const inner = opfDir && opfDir !== '.' ? path.posix.join(opfDir, href) : href;
  const buf = execFileSync('unzip', ['-p', epubPath, inner], { maxBuffer: 64 * 1024 * 1024 });
  fs.mkdirSync(path.dirname(destCover), { recursive: true });
  await sharp(buf).resize(COVER_W, COVER_H, { fit: 'cover' }).png({ compressionLevel: 9 }).toFile(destCover);
}

// 1) 把本地话题组/书 splice 进 aiTopics（按 id 去重）
let added = 0;
for (const lt of local.topics || []) {
  let dest = reading.aiTopics.find((t) => t.id === lt.id);
  if (!dest) {
    dest = { id: lt.id, topic: lt.topic, blurb: lt.blurb, graphFocus: lt.graphFocus ?? null, books: [] };
    reading.aiTopics.push(dest);
  } else {
    // 话题级元数据以 local-books.json 为准，每次刷新（否则改 blurb/topic 不生效）
    dest.topic = lt.topic;
    dest.blurb = lt.blurb;
    dest.graphFocus = lt.graphFocus ?? null;
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
    if (e.cover) b.cover = e.cover; // authored 封面覆盖（如旧默认 png 换成重绘 svg）
  }
}

writeJson(OUT, reading);
console.log(`✓ 本地自上传书合入：新增 ${added} 本，导言 ${stamped} 条 → ${OUT}`);
