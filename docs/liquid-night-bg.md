# Liquid Night 背景组件（液态之夜）

全屏 WebGL 背景：钴蓝域扭曲流场为体，金色矿脉丝是「不确定信号」，整体亮度与扭曲随 ECG 心电图节律（P→QRS→T，3.15s 一拍）涌动。效果与参数逐字提取自已验收定稿的 `.private/ai-health-teardown-v3.html`（ai-health 拆解页 v3），零重写、零「优化」。

## 怎么在任意页面 opt-in

组件是自包含的（画布 + 内联脚本 + 回退画布全局样式），不进任何默认布局。在需要的页面：

```astro
---
import LiquidNight from '../components/LiquidNight.astro';
---

<LiquidNight />
```

一行即可。它渲染 `position:fixed; inset:0; z-index:-1; pointer-events:none` 的 `<canvas class="liquid-night">`，不影响页面内容与交互。预览验证页：`/liquid-night/`（未被任何页面链接）。

## 性能设计

- **0.55 渲染分辨率**：`RS = min(devicePixelRatio, 1.5) * 0.55`，着色器在远低于 CSS 像素的缓冲上渲染，由浏览器放大，全屏 GPU 开销可控；WebGL context 用 `powerPreference:'low-power'`、关抗锯齿/深度/模板。
- **rAF 驱动**：仅 `requestAnimationFrame` 循环，无定时器；浏览器标签页隐藏时 rAF 自动暂停，恢复时续跑，零后台空转。
- **prefers-reduced-motion**：静态帧——只画一帧 `draw(10)`，仅在 resize 时重画，无任何动画循环。
- **WebGL 失败回退**：拿不到 context / 着色器编译失败 / 链接失败时，自动换成 Canvas 2D「体征之球」（880 光点斐波那契球面 + 64 浮尘，同一 ECG 节律呼吸），保证任何环境都有背景而非黑屏。
- **幂等守卫**：`window.__liquidNightInit` 防止脚本重复执行导致双重初始化；脚本用 `is:inline` 逐字内联、不经打包改写，组件可在任意页面使用且只初始化一次。

## 调色语义

- **钴蓝流场**（`base #07182f → cobalt → elec`）：液明之夜的本体，域扭曲 fbm 流。
- **金色矿脉丝**（`gold #e0b961`）：流场中的「不确定信号」，随 beat 增强（`0.80+0.45*u_beat`）。
- **ECG 节律**：`beat()` 以高斯组合逼近 P 小波 → QRS 尖峰 → T 中波，驱动整体亮度（`col*=1.0+u_beat*0.07`）、电蓝丝亮度与金色矿脉强弱——背景以约 3 秒一拍的心电波形轻涌，闪光间隔落在「可感脉搏」而非「频闪」区间。

## 文件

- `src/components/LiquidNight.astro` —— 组件本体（唯一需要 import 的）
- `src/pages/liquid-night.astro` —— 预览/验证页（未链接）
- 源效果事实来源：`.private/ai-health-teardown-v3.html`（改动效果请先改源文件并重新提取，勿在组件里直接调参）
