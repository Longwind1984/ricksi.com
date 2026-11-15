// 游记故事层校验：data/travel-stories.json 的字段完整性、图片文件与尺寸、坐标合理性。
// 用法：npm run audit:stories（新增游记条目后必跑；错误退 1，仅警告退 0）
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const stories = JSON.parse(fs.readFileSync('data/travel-stories.json', 'utf8'));
const travels = JSON.parse(fs.readFileSync('data/travels.json', 'utf8'));

const errors = [];
const warns = [];
const REQ = ['n', 'co', 'la', 'ln', 'img', 'w', 'h', 'alt', 'x', 'post'];

function hav(aLa, aLn, bLa, bLn) {
  const R = 6371, t = Math.PI / 180;
  const h =
    Math.sin(((bLa - aLa) * t) / 2) ** 2 +
    Math.cos(aLa * t) * Math.cos(bLa * t) * Math.sin(((bLn - aLn) * t) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const posts = stories.posts ?? {};
const list = stories.stories ?? [];
if (!list.length) errors.push('stories 为空');

const seen = new Map();
for (const [i, s] of list.entries()) {
  const tag = `#${i} ${s?.n ?? '(无名)'}`;
  for (const k of REQ) if (s[k] == null || s[k] === '') errors.push(`${tag}: 缺字段 ${k}`);
  // 片段全文 b：非空段落数组（卡内分片阅读的内容源）
  if (!Array.isArray(s.b) || !s.b.length) errors.push(`${tag}: 缺片段全文 b（非空段落数组）`);
  else {
    const bad = s.b.findIndex((p) => typeof p !== 'string' || p.trim().length < 2);
    if (bad >= 0) errors.push(`${tag}: b[${bad}] 段落为空或过短`);
    const total = s.b.join('').length;
    if (total > 2000) warns.push(`${tag}: 片段全文 ${total} 字，卡内阅读偏长，请确认章节切分`);
  }
  if (s.post && !posts[s.post]) errors.push(`${tag}: post "${s.post}" 未在 posts 登记`);
  if (typeof s.la === 'number' && (s.la < -90 || s.la > 90)) errors.push(`${tag}: la 越界 ${s.la}`);
  if (typeof s.ln === 'number' && (s.ln < -180 || s.ln > 180)) errors.push(`${tag}: ln 越界 ${s.ln}`);

  const key = `${s.la?.toFixed(2)},${s.ln?.toFixed(2)}`;
  if (seen.has(key)) warns.push(`${tag}: 与 #${seen.get(key)} 坐标近似重复（${key}）`);
  else seen.set(key, i);

  // 图片存在 + 声明尺寸与实际一致
  if (s.img) {
    const f = path.join('public', s.img);
    if (!fs.existsSync(f)) {
      errors.push(`${tag}: 图片不存在 ${s.img}`);
    } else {
      const meta = await sharp(f).metadata();
      if (meta.width !== s.w || meta.height !== s.h)
        errors.push(`${tag}: 声明 ${s.w}×${s.h} ≠ 实际 ${meta.width}×${meta.height}`);
    }
  }

  // 与足迹城市词典的最近距离（荒野条目离城远是正常的，>80km 提示人工复核）
  if (typeof s.la === 'number' && typeof s.ln === 'number' && travels?.cities?.length) {
    let best = null;
    for (const c of travels.cities) {
      const d = hav(s.la, s.ln, c.la, c.ln);
      if (!best || d < best.d) best = { d, n: c.n, co: c.co };
    }
    if (best.d > 80) warns.push(`${tag}: 最近城市 ${best.n}（${best.co}）距 ${Math.round(best.d)}km，荒野/路段条目请目检`);
    console.log(`${tag.padEnd(24)} → 最近城市 ${best.n}（${best.co}） ${Math.round(best.d)}km`);
  }
}

console.log(`\n${list.length} 条故事 · ${Object.keys(posts).length} 篇文章`);
if (warns.length) console.log(`\n⚠ ${warns.length} 条警告：\n  ${warns.join('\n  ')}`);
if (errors.length) {
  console.error(`\n✗ ${errors.length} 个错误：\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(warns.length ? '✓ 通过（有警告，人工复核上文）' : '✓ 全部通过');
