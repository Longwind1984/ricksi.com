// 前沿追踪人物头像生成 —— nano banana 2（gemini-3.1-flash-image）双轨管线
// 似真度：先取本人真实照片（config refPhoto 显式 URL / 'x:handle' 取 nitter 头像 / wiki 词条主图 /
//   兜底第一个 x source 的 nitter 头像）作为「本人长相参考图」传入，再按 stylePrompt 统一风格化。
//   ⚠ 两类参考图务必分清：本人照片=似真锚点（必须传）；别人的成品头像=串脸事故（禁止传，2026-06-12 实测）。
// 有 key（GEMINI_API_KEY 或 scripts/.gemini-key）：只为缺头像的人生成；产物压成 {size}px webp 落 portrait.dir
// 无 key：打印每人完整 prompt 清单，可贴 AI Studio 手动生成后把 PNG 丢进 dir 再跑本脚本压缩
// 用法：npm run frontier:portraits [-- --force slug]   （--force 重生成指定 slug）
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { CONFIG } from './config.mjs';

const F = CONFIG.frontier;
const P = F.portrait;
const KEY_FILE = path.resolve('scripts/.gemini-key');
// 注意：responseModalities/imageConfig 只在 v1beta 暴露（v1 会报 Unknown name，2026-06-12 实测）
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${P.model}:generateContent`;

/* 代理自重执行（同 collect-frontier：Node fetch 不读 http_proxy） */
if (F.proxy && process.env.NODE_USE_ENV_PROXY !== '1') {
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

let apiKey = process.env.GEMINI_API_KEY || '';
if (!apiKey && fs.existsSync(KEY_FILE)) apiKey = fs.readFileSync(KEY_FILE, 'utf8').trim();

const forceIdx = process.argv.indexOf('--force');
const forceSlug = forceIdx > -1 ? process.argv[forceIdx + 1] : null;

const dir = path.resolve(P.dir);
const REF_DIR = path.resolve('scripts/.frontier-refs'); // 本人照片缓存（gitignore，不入库不发布）
fs.mkdirSync(dir, { recursive: true });
fs.mkdirSync(REF_DIR, { recursive: true });
const webpOf = (slug) => path.join(dir, `${slug}.webp`);
const promptOf = (p) => P.stylePrompt.replaceAll('{name}', p.name).replaceAll('{title}', p.title);
const logoPromptOf = (p) => (P.logoPrompt ?? P.stylePrompt).replaceAll('{name}', p.name).replaceAll('{title}', p.title ?? '');

/* 去白边（系统化）：模型偶尔无视 prompt 给整图套白框。检测左上角近白 → sharp.trim 裁掉，
   调用方再 cover 回方图。非白边图原样返回（identity），避免误裁正常深色图。 */
async function trimWhiteBorder(buf) {
  try {
    const px = await sharp(buf).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
    if (!(px[0] > 226 && px[1] > 226 && px[2] > 226)) return buf; // 左上角非近白 → 无白边
    return await sharp(buf).trim({ background: '#ffffff', threshold: 40 }).toBuffer();
  } catch {
    return buf; // trim 失败兜底原图
  }
}
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function fetchBuf(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/* nitter 个人页 RSS 的 <image><url> 即 X 头像（400x400） */
async function nitterAvatar(handle) {
  for (const tpl of F.xMirrors) {
    try {
      const xml = await fetchBuf(tpl.replace('{handle}', handle));
      const m = xml.toString('utf8').match(/<image>[\s\S]*?<url>([^<]+)<\/url>/i);
      if (m) return await fetchBuf(m[1].trim());
    } catch { /* 下一个镜像 */ }
  }
  throw new Error(`nitter 头像获取失败 @${handle}`);
}

/* wiki 词条主图（config 显式指定词条名，防同名错人） */
async function wikiPhoto(title) {
  const j = JSON.parse(
    (await fetchBuf(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)).toString('utf8')
  );
  const src = j.originalimage?.source ?? j.thumbnail?.source;
  if (!src) throw new Error(`wiki 词条无主图：${title}`);
  return await fetchBuf(src);
}

/* 本人真实照片：refPhoto（'x:handle' 或直链）→ wiki → 第一个 x source 头像 → null。
   缓存为 768px jpeg（似真参考足够，控请求体积） */
async function refPhotoOf(p) {
  const cache = path.join(REF_DIR, `${p.slug}.jpg`);
  if (fs.existsSync(cache)) return fs.readFileSync(cache);
  let raw = null;
  try {
    if (p.refPhoto?.startsWith('x:')) raw = await nitterAvatar(p.refPhoto.slice(2));
    else if (p.refPhoto) raw = await fetchBuf(p.refPhoto);
    else if (p.wiki) raw = await wikiPhoto(p.wiki);
    else {
      const xs = (p.sources ?? []).find((s) => s.type === 'x');
      if (xs) raw = await nitterAvatar(xs.handle);
    }
  } catch (e) {
    console.warn(`[portrait] ⚠ ${p.slug} 真实照片获取失败（${e.message?.slice(0, 80)}），退化为纯文本生成（似真度无保证）`);
    return null;
  }
  if (!raw) {
    console.warn(`[portrait] ⚠ ${p.slug} 无照片源（config 加 wiki 或 refPhoto），退化为纯文本生成`);
    return null;
  }
  const jpg = await sharp(raw).resize(768, 768, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  fs.writeFileSync(cache, jpg);
  return jpg;
}

/* 机构 logo → i2i 参考：取真实 logo（SVG 光栅化 / 位图），contain 进深底方图缓存 png。
   失败返回 null（该机构退星座字母牌，不阻塞其它）。 */
async function logoImage(p) {
  const cache = path.join(REF_DIR, `${p.slug}.logo.png`);
  if (fs.existsSync(cache)) return fs.readFileSync(cache);
  let raw;
  try { raw = await fetchBuf(p.logo); }
  catch (e) { console.warn(`[portrait] ⚠ ${p.slug} logo 获取失败（${e.message?.slice(0, 80)}），退化字母牌`); return null; }
  try {
    const isSvg = /\.svg($|\?)/i.test(p.logo) || raw.slice(0, 300).toString('utf8').includes('<svg');
    const png = await sharp(raw, isSvg ? { density: 384 } : undefined)
      .resize(360, 360, { fit: 'contain', background: '#0A1222' })
      .flatten({ background: '#0A1222' })
      .png().toBuffer();
    fs.writeFileSync(cache, png);
    return png;
  } catch (e) {
    console.warn(`[portrait] ⚠ ${p.slug} logo 处理失败（${e.message?.slice(0, 80)}），退化字母牌`);
    return null;
  }
}

/* 修复模式：--repair 只对已有 webp 去白边（本地 sharp，不调 API、不需 key），幂等可重跑 */
if (process.argv.includes('--repair')) {
  let fixed = 0, kept = 0;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.webp')) continue;
    const fp = path.join(dir, f);
    const orig = fs.readFileSync(fp);
    const trimmed = await trimWhiteBorder(orig);
    if (trimmed === orig) { kept++; continue; }
    await sharp(trimmed).resize(P.size, P.size, { fit: 'cover' }).webp({ quality: 88 }).toFile(fp);
    fixed++;
    console.log(`[portrait] 去白边 ${f}`);
  }
  console.log(`[portrait] 修复完成：去白边 ${fixed}，无需处理 ${kept}`);
  process.exit(0);
}

/* 0. 先把目录里手动放入的 PNG/JPG 规整为 webp（手动轨的收口；顺带去白边） */
for (const f of fs.readdirSync(dir)) {
  const m = f.match(/^([a-z0-9-]+)\.(png|jpg|jpeg)$/i);
  if (!m) continue;
  const out = webpOf(m[1]);
  if (fs.existsSync(out) && !forceSlug) continue;
  const src = await trimWhiteBorder(fs.readFileSync(path.join(dir, f)));
  await sharp(src).resize(P.size, P.size, { fit: 'cover' }).webp({ quality: 88 }).toFile(out);
  console.log(`[portrait] 规整 ${f} → ${path.basename(out)}`);
}

const missing = (p) => (forceSlug ? p.slug === forceSlug : !fs.existsSync(webpOf(p.slug)));
const hasPhotoSrc = (p) => p.wiki || p.refPhoto || (p.sources ?? []).some((s) => s.type === 'x');
const todo = [
  // 人：仅当有真实照片源才生成；无源者保留星座字母牌（不做无似真度的纯文本脸）
  ...F.people.filter((p) => missing(p) && hasPhotoSrc(p)).map((p) => ({ p, isOrg: false })),
  ...(F.topics ?? []).filter((p) => p.logo && missing(p)).map((p) => ({ p, isOrg: true })),
];
if (!todo.length) {
  console.log('[portrait] 全员头像齐备，无需生成');
  process.exit(0);
}

if (!apiKey) {
  console.log(`[portrait] 未配置 GEMINI_API_KEY（或 scripts/.gemini-key）。缺 ${todo.length} 张，手动生成清单：`);
  console.log('  （贴到 https://aistudio.google.com 选 Nano Banana 2，1:1 构图；产物 PNG 放入 ' + P.dir + '/<slug>.png 后重跑本脚本）\n');
  for (const { p, isOrg } of todo) {
    console.log(`── ${p.slug}${isOrg ? '（机构 logo）' : ''} ──`);
    console.log((isOrg ? logoPromptOf(p) : promptOf(p)) + '\n');
  }
  process.exit(0);
}

/* 似真 = 本人照片做主体参考；风格 = stylePrompt 模板。
   注意只传「本人」的照片——传别人的成品头像会串脸（2026-06-12 实测） */
async function generate(p, isOrg) {
  let parts;
  if (isOrg) {
    const ref = await logoImage(p);
    if (!ref) throw new Error('logo 不可用，跳过（退字母牌）');
    parts = [
      { text: `The attached image is the real brand logo of ${p.name}. ` + logoPromptOf(p) },
      { inline_data: { mime_type: 'image/png', data: ref.toString('base64') } },
    ];
  } else {
    const ref = await refPhotoOf(p);
    if (!ref) throw new Error('无真实照片，跳过（保留字母牌，避免无似真度的脸）');
    parts = [
      {
        text:
          `The attached photograph shows the real appearance of ${p.name}. ` +
          "Accurately capture this exact person's recognizable facial structure, hairstyle, " +
          'eyebrows, eye shape, nose, jawline, facial hair and glasses (if any) so the portrait ' +
          'is clearly identifiable as the same person, then render it in the following style: ' +
          promptOf(p),
      },
      { inline_data: { mime_type: 'image/jpeg', data: ref.toString('base64') } },
    ];
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: '1:1' },
      },
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  const img = (j.candidates?.[0]?.content?.parts ?? []).find((x) => x.inline_data?.data || x.inlineData?.data);
  if (!img) throw new Error('响应中无图片数据：' + JSON.stringify(j).slice(0, 300));
  return Buffer.from((img.inline_data ?? img.inlineData).data, 'base64');
}

let ok = 0, fail = 0;
for (const { p, isOrg } of todo) {
  process.stdout.write(`[portrait] nano banana 2 生成 ${p.slug}${isOrg ? '(logo)' : ''} … `);
  try {
    const buf = await trimWhiteBorder(await generate(p, isOrg));
    await sharp(buf).resize(P.size, P.size, { fit: 'cover' }).webp({ quality: 88 }).toFile(webpOf(p.slug));
    ok++;
    console.log('✓');
  } catch (e) {
    fail++;
    console.log(`✗ ${e.message?.slice(0, 200)}`);
  }
}
console.log(`[portrait] 完成：成功 ${ok}，失败 ${fail}（失败的重跑本脚本即可，已成功的会跳过）`);
