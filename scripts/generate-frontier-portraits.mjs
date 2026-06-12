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

/* 0. 先把目录里手动放入的 PNG/JPG 规整为 webp（手动轨的收口） */
for (const f of fs.readdirSync(dir)) {
  const m = f.match(/^([a-z0-9-]+)\.(png|jpg|jpeg)$/i);
  if (!m) continue;
  const out = webpOf(m[1]);
  if (fs.existsSync(out) && !forceSlug) continue;
  await sharp(path.join(dir, f)).resize(P.size, P.size, { fit: 'cover' }).webp({ quality: 88 }).toFile(out);
  console.log(`[portrait] 规整 ${f} → ${path.basename(out)}`);
}

const todo = F.people.filter((p) => (forceSlug ? p.slug === forceSlug : !fs.existsSync(webpOf(p.slug))));
if (!todo.length) {
  console.log('[portrait] 全员头像齐备，无需生成');
  process.exit(0);
}

if (!apiKey) {
  console.log(`[portrait] 未配置 GEMINI_API_KEY（或 scripts/.gemini-key）。缺 ${todo.length} 张，手动生成清单：`);
  console.log('  （贴到 https://aistudio.google.com 选 Nano Banana 2，1:1 构图；产物 PNG 放入 ' + P.dir + '/<slug>.png 后重跑本脚本）\n');
  for (const p of todo) {
    console.log(`── ${p.slug} ──`);
    console.log(promptOf(p) + '\n');
  }
  process.exit(0);
}

/* 似真 = 本人照片做主体参考；风格 = stylePrompt 模板。
   注意只传「本人」的照片——传别人的成品头像会串脸（2026-06-12 实测） */
async function generate(p) {
  const ref = await refPhotoOf(p);
  const parts = ref
    ? [
        {
          text:
            `The attached photograph shows the real appearance of ${p.name}. ` +
            'Accurately capture this exact person\'s recognizable facial structure, hairstyle, ' +
            'eyebrows, eye shape, nose, jawline, facial hair and glasses (if any) so the portrait ' +
            'is clearly identifiable as the same person, then render it in the following style: ' +
            promptOf(p),
        },
        { inline_data: { mime_type: 'image/jpeg', data: ref.toString('base64') } },
      ]
    : [{ text: promptOf(p) }];
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
for (const p of todo) {
  process.stdout.write(`[portrait] nano banana 2 生成 ${p.slug} … `);
  try {
    const buf = await generate(p);
    await sharp(buf).resize(P.size, P.size, { fit: 'cover' }).webp({ quality: 88 }).toFile(webpOf(p.slug));
    ok++;
    console.log('✓');
  } catch (e) {
    fail++;
    console.log(`✗ ${e.message?.slice(0, 200)}`);
  }
}
console.log(`[portrait] 完成：成功 ${ok}，失败 ${fail}（失败的重跑本脚本即可，已成功的会跳过）`);
