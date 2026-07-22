// 构建时分享卡：设计系统 components/share/ShareCard「玻璃明信片」的 satori 实现
// 竖版 360×640 @2x（720×1280），雪山照片 + v2 减压暗 + 太阳金晕 + 底部钴蓝玻璃面板。
// satori 不支持 backdrop-filter：面板内嵌预模糊照片（hero-blur）按 cover 几何精确对齐，
// 再叠钴蓝渐变着色——与站内实时玻璃同配方（blur + 钴蓝 tint）。
// 三形态：node（知识库节点）/ article（写作引文·文楷）/ site（整站名片·三格数据条）。
//
// 渲染成本控制（2026-06，EdgeOne 构建超时后定）：satori→resvg 的耗时由「嵌入的 2200px
// 大照片被 resvg 逐卡重栅格化」主导（~3s/卡），而每张卡的底图+渐变+玻璃面板 chrome 完全相同，
// 只有面板内文字/徽章/二维码在变。故拆两层：
//   base（照片+渐变+顶栏+玻璃 chrome+署名）—— 按 variant|brand|module|credit 只渲一次、进程内缓存；
//   overlay（面板内文字+二维码）—— 透明底、无照片，每卡现渲（≈OG 图速度），sharp 合成到 base 上。
// 同端点（前沿/blog/kb/site）brand|module|credit 恒定 → 每端点 base 只栅格化一次，
// 1300+ 张社交图从「全部嵌大图」降到「4 次嵌大图 + N 次纯文字」。输出像素不变。
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import QRCode from 'qrcode';
import { cachedSocialImage } from './social-image-cache.mjs';

export const SHARE_TEMPLATE_VERSION = 'glass-postcard-v2';
const SHARE_TEMPLATE_FILES = ['src/lib/share-card.mjs'];
const SHARE_ASSET_FILES = ['assets-src/fonts/MiSans-Regular.ttf', 'assets-src/fonts/MiSans-Semibold.ttf', 'assets-src/fonts/GeistMono-Regular.otf', 'assets-src/fonts/GeistMono-Medium.otf', 'assets-src/fonts/LXGWWenKai-Regular.ttf', 'assets-src/fonts/NotoSansCJKsc-Medium.otf', 'public/assets/hero-2200.jpg', 'public/assets/hero-blur.jpg'];

const F = (p) => fs.readFileSync(path.resolve(p));
const fonts = [
  { name: 'MiSans', data: F('assets-src/fonts/MiSans-Regular.ttf'), weight: 400, style: 'normal' },
  { name: 'MiSans', data: F('assets-src/fonts/MiSans-Semibold.ttf'), weight: 600, style: 'normal' },
  { name: 'Geist Mono', data: F('assets-src/fonts/GeistMono-Regular.otf'), weight: 400, style: 'normal' },
  { name: 'Geist Mono', data: F('assets-src/fonts/GeistMono-Medium.otf'), weight: 500, style: 'normal' },
  { name: 'LXGW WenKai', data: F('assets-src/fonts/LXGWWenKai-Regular.ttf'), weight: 400, style: 'normal' },
  // 兜底：MiSans v1 字库缺字时退到 Noto（全 CJK 覆盖）
  { name: 'Noto Sans SC', data: F('assets-src/fonts/NotoSansCJKsc-Medium.otf'), weight: 500, style: 'normal' },
];
const HERO = `data:image/jpeg;base64,${F('public/assets/hero-2200.jpg').toString('base64')}`;
const HERO_BLUR = `data:image/jpeg;base64,${F('public/assets/hero-blur.jpg').toString('base64')}`;

/* 几何（@2x 像素）。照片 2200×1237，cover 进 720×1280 时以高度定标：
   显示尺寸 2276×1280，水平偏移 = -(2276-720)·px */
const W = 720, H = 1280;
const DISP_W = Math.round(2200 * (H / 1237)); // 2276
const PANEL_X = 32, PANEL_W = W - PANEL_X * 2, PANEL_BOTTOM = 76;
const GOLD = '#F4C761';
const LINE = 'rgba(190,210,255,0.16)';
const MONO = 'Geist Mono';

const PHOTO_POS = { node: 0.30, article: 0.58, site: 0.5, frontier: 0.42 };
const PANEL_H = { node: 660, article: 690, site: 640, frontier: 660 };

const div = (style, children) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });
const txt = (style, text) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children: text } });
const clamp = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');

function pill(label, color) {
  return txt({
    fontFamily: MONO, fontSize: 19, letterSpacing: 1.2, color,
    border: `2px solid ${color}`, borderRadius: 999, padding: '5px 18px', opacity: 0.92,
  }, label);
}
function chip(label, dotColor) {
  return div({
    alignItems: 'center', gap: 11, fontFamily: MONO, fontSize: 19, color: 'rgba(225,236,255,0.78)',
    border: '2px solid rgba(190,210,255,0.22)', background: 'rgba(190,210,255,0.09)',
    borderRadius: 999, padding: '5px 18px',
  }, [
    ...(dotColor ? [div({ width: 13, height: 13, borderRadius: 99, background: dotColor })] : []),
    txt({}, label),
  ]);
}

/* 从 markdown 正文提取卡片摘录：优先首段 blockquote（kb 节点惯例的「一句话总结」），
   退而取首个普通段落；剥链接/加粗/行内代码等标记 */
export function mdExcerpt(body = '') {
  const lines = body.split('\n');
  let quote = '', para = '';
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!quote && l.startsWith('>')) {
      quote = l.replace(/^>+\s*/, '');
      continue;
    }
    if (!para && l && !/^[#>\-*|!\[`]/.test(l) && !l.startsWith('---')) para = l;
    if (quote || (para && i > 40)) break;
  }
  const raw = quote || para || '';
  return raw
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* 几何只取决于 variant */
function geomOf(variant) {
  const px = PHOTO_POS[variant] ?? 0.5;
  const panelH = PANEL_H[variant];
  return {
    photoLeft: -Math.round((DISP_W - W) * px),
    panelH,
    panelTop: H - PANEL_BOTTOM - panelH,
  };
}

/* base 层：照片 + 渐变 + 顶栏 + 玻璃面板 chrome + 署名（无面板内文字）。
   只取决于 variant|brand|module|credit，进程内缓存为「已解码的 raw RGBA」Promise
   （去重并发首调 + 省掉每卡重复解码 base PNG）。 */
const baseCache = new Map();
async function renderBaseRaw(ctx) {
  const png = await renderBasePng(ctx);
  return sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); // { data, info }
}
async function renderBasePng({ variant, brand, mod, credit }) {
  const { photoLeft, panelH, panelTop } = geomOf(variant);
  const svg = await satori(
    div({
      width: W, height: H, flexDirection: 'column', position: 'relative',
      fontFamily: 'MiSans', backgroundColor: '#070D20',
    }, [
      // 照片层（cover 手工几何，satori 不依赖 object-fit）
      { type: 'img', props: { src: HERO, width: DISP_W, height: H, style: { position: 'absolute', top: 0, left: photoLeft } } },
      // v2 减压暗 + 太阳金晕
      div({
        position: 'absolute', top: 0, left: 0, width: W, height: H,
        backgroundImage: 'radial-gradient(circle at 78% -6%, rgba(255,216,150,0.22) 0%, rgba(255,216,150,0) 38%)',
      }),
      div({
        position: 'absolute', top: 0, left: 0, width: W, height: H,
        backgroundImage: 'linear-gradient(180deg, rgba(10,16,40,0.14) 0%, rgba(10,18,48,0.34) 48%, rgba(5,9,28,0.68) 100%)',
      }),
      // 顶栏：品牌 + 模块徽标
      div({ justifyContent: 'space-between', alignItems: 'center', padding: '44px 48px 0' }, [
        txt({ fontFamily: MONO, fontSize: 20, letterSpacing: 3.2, color: 'rgba(255,255,255,0.85)', textShadow: '0 2px 16px rgba(4,10,32,0.6)' }, brand),
        ...(mod ? [txt({
          fontFamily: MONO, fontSize: 19, letterSpacing: 1.9, color: 'rgba(255,255,255,0.9)',
          background: 'rgba(190,210,255,0.14)', border: '2px solid rgba(220,232,255,0.30)',
          borderRadius: 999, padding: '10px 24px',
        }, mod)] : []),
      ]),
      // 钴蓝玻璃面板 chrome（预模糊照片对齐内嵌 + 钴蓝渐变着色，无文字）
      div({
        position: 'absolute', left: PANEL_X, top: panelTop, width: PANEL_W, height: panelH,
        borderRadius: 40, overflow: 'hidden', border: '2px solid rgba(180,204,255,0.26)',
        flexDirection: 'column',
      }, [
        { type: 'img', props: { src: HERO_BLUR, width: DISP_W, height: H, style: { position: 'absolute', top: -panelTop, left: photoLeft - PANEL_X } } },
        div({ position: 'absolute', top: 0, left: 0, width: PANEL_W, height: panelH, backgroundImage: 'linear-gradient(160deg, rgba(56,88,180,0.34) 0%, rgba(22,38,96,0.40) 100%)' }),
      ]),
      // 摄影署名（必须保留）
      txt({ position: 'absolute', right: 48, bottom: 20, fontFamily: MONO, fontSize: 17, letterSpacing: 1.4, color: 'rgba(255,255,255,0.4)', textShadow: '0 2px 12px rgba(4,10,32,0.6)' }, credit),
    ]),
    { width: W, height: H, fonts }
  );
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}
function getBaseRaw(ctx) {
  const key = `${ctx.variant}|${ctx.brand}|${ctx.mod ?? ''}|${ctx.credit}`;
  let p = baseCache.get(key);
  if (!p) {
    p = renderBaseRaw(ctx);
    // 失败不毒化缓存：剔除该 key 让下次重试（身份校验避免误删新的在途条目）。
    // 运行时（Vercel serverless 常驻进程）路径尤其重要——一次瞬时 base 渲染失败
    // 不应让该端点的全部卡常驻出 500，直到实例冷启动。
    p.catch(() => { if (baseCache.get(key) === p) baseCache.delete(key); });
    baseCache.set(key, p);
  }
  return p;
}

/* overlay 层：面板内 kicker/标题/摘录/徽章/数据/落款/二维码。透明底、无照片 → 快。
   面板容器（位置/尺寸/2px 边框盒/圆角/overflow/padding）与 base 完全一致，
   边框设为 transparent 以保留同样的 2px 内盒偏移 → 文字落点与未拆分时逐像素一致。 */
async function renderOverlayPng({ variant, kicker, kickerColor, title, excerpt, quote, metaRow, statsRow, url, hook, qrData }) {
  const { panelH, panelTop } = geomOf(variant);
  const svg = await satori(
    div({
      width: W, height: H, flexDirection: 'column', position: 'relative',
      fontFamily: 'MiSans', backgroundColor: 'transparent',
    }, [
      div({
        position: 'absolute', left: PANEL_X, top: panelTop, width: PANEL_W, height: panelH,
        borderRadius: 40, overflow: 'hidden', border: '2px solid transparent',
        flexDirection: 'column',
      }, [
        div({ position: 'relative', flexDirection: 'column', justifyContent: 'space-between', flex: 1, padding: '40px 40px 32px' }, [
          div({ flexDirection: 'column' }, [
            ...(kicker ? [txt({ fontFamily: MONO, fontSize: 20, letterSpacing: 3.6, color: kickerColor || GOLD, marginBottom: 20 }, kicker)] : []),
            txt({ fontSize: variant === 'article' ? 46 : 50, fontWeight: 600, lineHeight: 1.42, letterSpacing: -1, color: '#FFFFFF', marginBottom: 20, textShadow: '0 4px 40px rgba(4,10,32,0.5)', lineClamp: 2 }, clamp(title, 30)),
            ...(quote ? [txt({
              fontFamily: 'LXGW WenKai', fontSize: 27, lineHeight: 1.9, color: 'rgba(238,243,252,0.88)',
              borderLeft: '5px solid rgba(244,199,97,0.55)', paddingLeft: 24, marginBottom: 26, lineClamp: 3,
            }, clamp(quote, 76))] : []),
            ...(excerpt ? [txt({ fontSize: 25, lineHeight: 1.8, color: 'rgba(230,240,255,0.84)', marginBottom: 26, lineClamp: 3 }, clamp(excerpt, 62))] : []),
            ...(metaRow ? [metaRow] : []),
            ...(statsRow ? [statsRow] : []),
          ]),
          // 统一落款：URL + 钩子 + QR
          div({ alignItems: 'center', justifyContent: 'space-between', gap: 28, borderTop: `2px solid ${LINE}`, paddingTop: 26 }, [
            div({ flexDirection: 'column', fontFamily: MONO }, [
              txt({ fontSize: 23, fontWeight: 500, color: '#FFFFFF' }, url),
              ...(hook ? [txt({ fontSize: 20, lineHeight: 1.7, color: 'rgba(225,236,255,0.75)', marginTop: 8 }, hook)] : []),
            ]),
            div({ width: 128, height: 128, background: '#FFFFFF', borderRadius: 24, padding: 14, flexShrink: 0 }, [
              { type: 'img', props: { src: qrData, width: 100, height: 100 } },
            ]),
          ]),
        ]),
      ]),
    ]),
    { width: W, height: H, fonts }
  );
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}

export async function renderShareCard({
  variant = 'node',          // node | article | site | frontier
  brand = 'RICK SI',
  module: mod,               // mono 模块徽标，如 KNOWLEDGE · NODE
  kicker,                    // kicker 文案（默认金色）
  kickerColor,               // kicker 颜色覆盖（前沿卡用星类色）
  title,
  excerpt,                   // node/site：摘录
  quote,                     // article：文楷引文（人的声音）
  badges = [],               // [{label, color}] 人机光谱来源徽章
  chips = [],                // [{label, color?}] 主题域 chip
  stats = [],                // site：[{label, value, gold?}] 三格数据
  url,                       // 展示用短址
  qrUrl,                     // 二维码编码的完整 URL
  hook,                      // 钩子文案
  credit = '云海之上 · 无人机自摄',
}) {
  const qrData = await QRCode.toDataURL(qrUrl || `https://ricksi.com/`, {
    width: 200, margin: 0, color: { dark: '#0A1230', light: '#FFFFFF' },
  });

  const metaRow = (badges.length || chips.length)
    ? div({ gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 26 }, [
        ...badges.map((b) => pill(b.label, b.color)),
        ...chips.map((c) => chip(c.label, c.color)),
      ])
    : null;

  const statsRow = stats.length
    ? div({ marginBottom: 26 }, stats.map((s, i) => div({
        flexDirection: 'column', flex: 1,
        ...(i > 0 ? { borderLeft: `2px solid ${LINE}`, paddingLeft: 28 } : {}),
      }, [
        txt({ fontFamily: MONO, fontSize: 38, fontWeight: 500, color: s.gold ? GOLD : '#FFFFFF' }, s.value),
        txt({ fontFamily: MONO, fontSize: 17, letterSpacing: 2, color: 'rgba(210,226,255,0.55)', marginTop: 7 }, s.label),
      ])))
    : null;

  // base（缓存·已解码 raw 照片层）与 overlay（每卡·文字层）并发出图，再 sharp 合成
  const [base, overlayPng] = await Promise.all([
    getBaseRaw({ variant, brand, mod, credit }),
    renderOverlayPng({ variant, kicker, kickerColor, title, excerpt, quote, metaRow, statsRow, url, hook, qrData }),
  ]);

  return sharp(base.data, { raw: { width: base.info.width, height: base.info.height, channels: base.info.channels } })
    .composite([{ input: overlayPng, top: 0, left: 0 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

export function renderCachedShareCard(route, input) {
  return cachedSocialImage({ route, mediaType: 'image/jpeg', templateVersion: SHARE_TEMPLATE_VERSION, templateFiles: SHARE_TEMPLATE_FILES, assetFiles: SHARE_ASSET_FILES, input, render: () => renderShareCard(input) });
}
