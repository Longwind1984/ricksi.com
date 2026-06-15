// 双视觉方向的全部 token 集中在此（按 Rick 协议：跑起来看着选，G2 门定默认）
// 移植自 galaxy-view src/render/presets.ts —— VisualTokens 接口转为 JSDoc，值不变
// 默认 DEEP_SPACE 对齐本站设计系统 v2 钴蓝之夜（深空底 + bloom）

/**
 * @typedef {Object} VisualTokens
 * @property {'deep-space'|'daylight'} id
 * @property {number} background
 * @property {boolean} starfield
 * @property {boolean} motes              晨昼的尘埃微粒（替代星空）
 * @property {boolean} bloomEnabled       亮底辉光=雾霾，晨昼强制关
 * @property {boolean} lightMode          节点 shader 变体：墨水圆盘 + rim
 * @property {number|null} nodeLightness  晨昼把色相重定向到纸面对比度（保色相、压亮度）
 * @property {string|null} linkInk        晨昼链接 = 铅笔线（统一墨色，不用端点混色）
 * @property {number} linkOpacityScale
 * @property {string} panelClass
 */

/** @type {VisualTokens} */
export const DEEP_SPACE = {
  id: 'deep-space',
  background: 0x000005, // 钴蓝之夜：纯黑深空带极微蓝（对齐本站 graph-view3d 的 BG=#000005）
  starfield: true,
  motes: false,
  bloomEnabled: true,
  lightMode: false,
  nodeLightness: null,
  linkInk: null,
  linkOpacityScale: 1,
  panelClass: 'gx-theme-dark',
};

/** @type {VisualTokens} */
export const DAYLIGHT = {
  id: 'daylight',
  background: 0xf6f4ef, // 暖纸底
  starfield: false,
  motes: true,
  bloomEnabled: false,
  lightMode: true,
  nodeLightness: 0.44,
  linkInk: '#2e2a24',
  linkOpacityScale: 0.65,
  panelClass: 'gx-theme-light',
};
