// 移植自 galaxy-view src/constants.ts —— 剥 export const 类型，去掉 Obsidian VIEW_TYPE。
// 视觉口径对齐本站设计系统 v2 钴蓝之夜：深空底 #000005 / 选中青 #02bfe7 / UnrealBloom。

// 节点尺寸（世界单位）：2.2×(1+0.5√degree)，上限 6 倍——枢纽不能吞掉画面
export const NODE_BASE_RADIUS = 2.2;
export const NODE_MAX_RADIUS = NODE_BASE_RADIUS * 6;

// NASA / 钴蓝之夜 配方
export const BACKGROUND_COLOR = 0x000005; // 对齐本站 graph-view3d 的 BG
export const SELECT_CYAN = '#02bfe7'; // 设计系统 v2 选中/高亮专用青
export const BLOOM_DEFAULTS = { strength: 0.6, radius: 0.4, threshold: 0.18 };
export const LINK_OPACITY = 0.16;

// 镜头编排（数字来自视觉规格，实现者无需品味）
export const CRUISE = {
  angularSpeed: 0.022, // rad/s
  elevationDeg: 8,
  elevationPeriodS: 90,
  radiusBreath: 0.04,
  radiusPeriodS: 60,
  resumeDelayMs: 10_000,
  rampUpMs: 2_000,
};
export const FLY_TO = {
  distancePerRadius: 12,
  minDistance: 40,
  maxDistance: 140,
  azimuthOffsetRad: (15 * Math.PI) / 180,
  minMs: 800,
  maxMs: 1800,
  msPerWorldUnit: 0.45,
};

export const STARFIELD_ROTATION_RAD_PER_S = 0.0008;
