// 生成首屏雪山图的 webp 版本（与 public/assets/hero-2200.jpg 同尺寸、更小体积）。
// 手动跑：node scripts/gen-hero.mjs（改了源图或想重生时）。源图 = assets-src/hero-summit-original.jpg。
// CSS 用 image-set() 优先 webp、回退 jpg（见 src/styles/glass.css body::before）。
import sharp from 'sharp';
import path from 'node:path';

const SRC = path.resolve('assets-src/hero-summit-original.jpg');
const OUT = path.resolve('public/assets/hero-2200.webp');

const info = await sharp(SRC)
  .resize({ width: 2200, withoutEnlargement: true })
  .webp({ quality: 80 })
  .toFile(OUT);

console.log(`wrote ${OUT} · ${info.width}x${info.height} · ${(info.size / 1024).toFixed(0)} KB`);
