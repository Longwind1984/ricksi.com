import { Color } from 'three';
import { GRAPH_PALETTE } from '../../lib/sample.js';

// 移植自 galaxy-view src/render/palette.ts —— 着色策略改造：
// 原版按 folderTop + hash 上色（Obsidian 文件夹语义）；本站按 cluster 索引取 GRAPH_PALETTE。
// GRAPH_PALETTE 是设计系统 v2 的 12 色等明度色环，cluster id 可能非连续（实测最大 15），
// 故用 (cluster % len) 映射，与本站 2D/3d-force-graph 着色逐位一致。
//
// 节点形状对齐 galaxy 渲染器：colorFn(node) => THREE.Color，node 至少含 { cluster, unresolved }。

/** @typedef {(node: any) => Color} NodeColorFn */

const NEUTRAL = new Color('#9aa4b2'); // 未分组 / cluster 缺失
const UNRESOLVED = new Color('#7a8499'); // 幽灵（本站数据暂无，保留以兼容 galaxy 接口）

// 预解析为 THREE.Color 缓存，避免每帧 new Color
const PALETTE = GRAPH_PALETTE.map((hex) => new Color(hex));

/** 按 cluster 着色（本站默认）。cluster 为数字索引；非法值回退中性灰。 */
export function clusterColor(cluster) {
  if (typeof cluster !== 'number' || !Number.isFinite(cluster)) return NEUTRAL;
  return PALETTE[((cluster % PALETTE.length) + PALETTE.length) % PALETTE.length] ?? NEUTRAL;
}

/** @type {NodeColorFn} 本站默认调色函数：unresolved 走幽灵色，否则按 cluster */
export const clusterColorFn = (node) => {
  if (node && node.unresolved) return UNRESOLVED;
  return clusterColor(node ? node.cluster : undefined);
};

/** galaxy 渲染器 setColorFn 的兜底（与 clusterColorFn 同义，保留原命名以便对照） */
export const fallbackColorFn = clusterColorFn;

/** 链接色：端点色 50/50 混合 → 去饱和 60% + 压亮度（NASA 细灰线，辉光由 bloom 给） */
export function linkColor(a, b) {
  const c = a.clone().lerp(b, 0.5);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s * 0.4, Math.min(hsl.l, 0.35));
  return c;
}
