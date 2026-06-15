// 图谱渲染模式裁决：WebGL 能力 > 用户显式选择(localStorage) > reduced-motion > 默认 3D
// 轻量无依赖——绝不 import three（three 只允许出现在 graph-view-galaxy.js / galaxy/* 的异步 chunk 里）。
const KEY = 'kg-graph-mode';

export function webglOK() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext(); // 探针用完立即释放
    return true;
  } catch {
    return false;
  }
}

export function resolveMode() {
  if (!webglOK()) return '2d';
  const saved = localStorage.getItem(KEY);
  if (saved === '2d' || saved === '3d') return saved;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return '2d';
  return '3d';
}

export function saveMode(m) {
  try {
    localStorage.setItem(KEY, m);
  } catch {
    /* 隐私模式下静默 */
  }
}
