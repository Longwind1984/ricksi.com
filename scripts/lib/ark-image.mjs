// 火山方舟（Volcengine Ark）图像生成统一入口 —— 本项目所有文生图 / 图生图都走这里。
//
// 为什么集中在这一个文件：模型 ID、端点、鉴权方式、参考图编码规则只在这里写一次，
// 其余脚本（人物快照、未来的封面/插画等）只调 arkImage()，不重复记忆 API 细节。
//
// 鉴权：scripts/.ark-key 文件（已 gitignore，不入库不发布）或环境变量 ARK_API_KEY。
// 端点 / 模型 / 参数核对于 2026-06-15：
//   端点  POST https://ark.cn-beijing.volces.com/api/v3/images/generations
//   鉴权  Authorization: Bearer <ARK_API_KEY>
//   模型  doubao-seedream-4-0-250828 —— 文生图与图生图同一模型（多图融合 / 风格迁移）
//   ⚠ 境内域名，必须直连，不能走翻墙代理（调用方在 NO_PROXY 里放行 volces.com）。
//
// 文生图：arkImage({ prompt })
// 图生图：arkImage({ prompt, images: [<Buffer | 本地路径 | http(s) URL | dataURI>] })
//   —— Buffer / 本地路径会自动转 base64 data URI；多张参考图传数组（Seedream 多图融合）。
import fs from 'node:fs';
import path from 'node:path';

export const ARK_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
export const ARK_DEFAULT_MODEL = 'doubao-seedream-4-0-250828';

/** 取 key：环境变量优先，其次 scripts/.ark-key 文件；都没有返回空串 */
export function arkKey() {
  if (process.env.ARK_API_KEY) return process.env.ARK_API_KEY.trim();
  const f = path.resolve('scripts/.ark-key');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  return '';
}

/** 把参考图统一成 data URI 或直链字符串（API 的 image 字段接受 URL 或 base64 data URI） */
function toImageRef(img) {
  if (Buffer.isBuffer(img)) return `data:image/jpeg;base64,${img.toString('base64')}`;
  if (typeof img === 'string') {
    if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) return img;
    const buf = fs.readFileSync(path.resolve(img)); // 当作本地文件路径
    const ext = path.extname(img).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  }
  throw new Error('arkImage: 参考图须为 Buffer / 路径 / URL / dataURI');
}

/**
 * 调用方舟生成一张图，返回图片 Buffer。
 * @param {object} o
 * @param {string} o.prompt   文本提示（必填）
 * @param {Array}  [o.images] 参考图列表；非空即图生图，空即文生图
 * @param {string} [o.size]   '1K' | '2K' | '4K' 或 '宽x高'（默认 '2K'）
 * @param {string} [o.model]  覆盖模型 ID
 * @param {boolean}[o.watermark] 是否加水印（默认 false）
 * @param {string} [o.key]    覆盖 key
 * @param {number} [o.timeoutMs]
 */
export async function arkImage({
  prompt,
  images = [],
  size = '2K',
  model = ARK_DEFAULT_MODEL,
  watermark = false,
  key = arkKey(),
  timeoutMs = 120000,
} = {}) {
  if (!prompt) throw new Error('arkImage: prompt 必填');
  if (!key) throw new Error('arkImage: 缺少 key（scripts/.ark-key 或环境变量 ARK_API_KEY）');

  const body = {
    model,
    prompt,
    size,
    response_format: 'b64_json',
    watermark,
    sequential_image_generation: 'disabled', // 单图：不开组图
  };
  if (images.length) {
    const refs = images.map(toImageRef);
    body.image = refs.length === 1 ? refs[0] : refs;
  }

  const res = await fetch(ARK_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Ark HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);

  const j = await res.json();
  const d = j.data?.[0];
  if (d?.b64_json) return Buffer.from(d.b64_json, 'base64');
  if (d?.url) return Buffer.from(await (await fetch(d.url, { signal: AbortSignal.timeout(timeoutMs) })).arrayBuffer());
  throw new Error('Ark 响应无图片数据：' + JSON.stringify(j).slice(0, 400));
}
