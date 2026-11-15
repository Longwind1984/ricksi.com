# Liquid Glass 技术方案重设计报告 — rick-homepage

> 来源：2026-07-01 调研 workflow（8 个开源实现精读 + 3 个承重论断对抗验证 + 合成）。
> 结论先行：**主路线保持「backdrop-filter:url() 真折射（仅 Chromium）+ 优雅降级」，把工程重心从"追更炫的跨浏览器真折射"转向"三档降级都达标 + 边缘光学做扎实 + 移动端不炸"。** 对抗验证已经把最诱人的两条替代路线（内容克隆折射、WebGL 全站）证伪或证贵，下面逐条给出确定结论，不粉饰。

---

## 1. 技术路线对比表

| 维度 | **A. backdrop-filter:url()**（rizroze / nikdelvin / mks2508 / kube.io）当前 nav-pill 路线 | **B. filter-on-content / clone**（PallavAg / samasante） | **C. WebGL shader**（iyinchao / naughtyduk liquidGL） | **D. 纯 CSS 近似**（blur+tint+边缘光+screen 高光）当前 .sec 路线 |
|---|---|---|---|---|
| **折射保真度** | 高：真·逐像素位移 + 色散，折射的是**元素背后真实背景**（正好是那张 fixed 照片） | 高，但折射的是**元素自身内容**，不是背景；要折射背景须手动喂副本 | 最高（可 SDF + 液态 blob + Fresnel + 色散 + 镜面），天花板 | 无真折射；靠 blur + 边缘光弧 + screen 高光"读起来像玻璃" |
| **跨浏览器（Safari!）** | **真折射仅 Chromium**。Safari/FF/iOS 全部退 blur。已由对抗验证坐实（WebKit Bug 245510 近 4 年 NEW，Firefox feature request 未排期）→ **引擎级缺口，不可修，别等** | 自身内容折射**跨浏览器成立**；但"折射 fixed 背景"在 Safari/FF 仍需 backdrop-filter=仅 Chromium，或喂全屏副本（见下方代价） | WebGL2 全浏览器（Safari 15+）→ **唯一能在 Safari 上真折射任意背景的路** | 全浏览器一致（blur 本就是 Safari 强项） |
| **性能 / 移动端** | 稳态零重算（位移图缓存），但 backdrop-filter 大面积/多实例逐帧重栅格化 → 移动 jank 风险；>800px 慎用。iOS 自动降级反而**免费避开最贵路径** | feDisplacementMap GPU 混合；Safari 强制 1×；喂全屏副本会撞 SVG filter 源尺寸上限（数千 px 退化）+ 每面板一张位移图 = **O(N) 成本** | 全 DPR × RGBA16F × 多 pass = retina 上 ~9× 片元；html2canvas 快照同步栅格化整页极贵；作者无移动基准。**移动最脆** | 最省；无逐帧滤镜，只有合成开销。移动首选 |
| **依赖 / 体积** | **零依赖**，可整段拷（rizroze 单文件 7.7KB / nikdelvin 4.3KB 纯函数） | 半可拷：core 零依赖可脱 React，但胶水要自写；整包绑 React 18/19 | iyinchao 绑 React19+MUI+leva（重）；liquidGL 硬依赖 html2canvas ~200KB | **零依赖，已全在库里** |
| **落地复杂度** | 低：拷位移图生成 + SVG filter + UA/特性门控（**现状已实现**） | 高：Astro 无 React 要自接 core + 背景副本定位对齐 | 很高：Canvas + shader + 背景纹理管线 + 降级；与无框架取向冲突 | 最低（纯 CSS + 少量 vanilla） |
| **与「全屏 fixed 照片 + 深色静态 Astro」契合** | **最契合**：backdrop 正好取那张照片；深底上色散/screen 更出效果；无框架 OK | 错配：本质折射自身内容，fixed 背景要重复渲染背景层，撞 O(N) 红线 | 概念契合（背景是**单张已知图**正是它的理想输入），但工程重量与移动成本不匹配静态个人站 | **最契合兜底**：本就是给深色照片上盖玻璃设计的 |

---

## 2. 主路线推荐 + 否决理由 + Safari 确定结论

### 推荐主路线：**A（backdrop-filter:url() 真折射，Chromium-only）+ D（纯 CSS 近似）作为 Safari/FF/兜底的一等降级** — 即"现状架构，但把降级和边缘光学做到可交付"。

理由：
1. **场景天生适配 A。** rick-homepage 是"全屏 fixed 照片 + 上层玻璃"，backdrop-filter 取的正是"元素背后真实背景"=那张照片。这是 A 路线唯一真正省事的场景，也是 B/C 都要额外搭背景副本/纹理才能模拟的东西。
2. **零依赖、可整段拷、已实现。** 现状 nav-pill 已经在跑这条路，工程成本沉没为零；继续走它不新增依赖、不动构建期。
3. **降级本来就免费。** Safari/FF/iOS 自动退 blur——不用写 WebGL、不用 html2canvas、不用喂副本。对抗验证 #3 明确指出：iOS 自动降级"反而免费避开了最贵的实时折射"。

### 为什么否决 B（内容克隆/副本折射）
对抗验证 #2 判 **mostly-false** 并纠正了一个关键误解：PallavAg/samasante 的**默认**跨浏览器方案折射的是**元素自身像素**，不是背景。要在 Safari 折射那张 fixed 照片，必须把**全屏照片副本**喂进每块玻璃并逐块定位对齐 → 撞两条红线:(a) Safari SVG filter 源尺寸上限（数千 px 退化）;(b) 每面板一张位移图 = O(N) 成本，正撞"警惕随内容线性增长"。**性价比与鲁棒性都不过关，否决。**

### 为什么否决 C（WebGL shader）
- 视觉天花板最高，但：iyinchao 绑 React19+MUI+leva，liquidGL 硬依赖 html2canvas ~200KB 且**主动忽略 fixed 元素**（你的导航/玻璃卡常是 fixed/sticky → 直接踩空）。
- 移动端最脆（全 DPR × RGBA16F × 多 pass；无基准），与"320–430 撑住不卡"直接冲突。
- 与"无框架、零新依赖、构建期 O(N) 敏感"三条取向全面冲突。
- **唯一值得保留的**：把它当**数学配方**——SDF 边缘折射模型、IOR 三通道色散(0.98/1.0/1.02)、LCH Fresnel/glare——不整包引入。**整包否决，数学借鉴。**
- 注：repo 里的 `three` 是给 frontier 力导向图用的，不构成"反正已有 WebGL 不如全站上"的理由——那是另一套用途，全站玻璃 shader 仍是净新增重量。

### Safari 真折射：确定结论
> **在"全屏 fixed 照片背景"这个具体场景下，Safari 里做真折射 = 要么不可能（backdrop-filter:url 引擎级不支持，近 4 年零进展），要么代价过高且撞 O(N)/尺寸上限红线（喂全屏副本）。确定放弃在 Safari 追真折射。**
>
> Safari/FF/iOS 的目标不是"也折射"，而是"**优雅的假玻璃**"：`blur(24–28px) + saturate + 边缘光弧 + screen 静态高光 + 描边`——读起来是玻璃、不塌成透明板即达标。这不是妥协话术，是对抗验证 #1/#2 双重坐实后的最优解。

---

## 3. rick-homepage 逐区块落地设计

分层降级四档统一定义（现状已具备前三档骨架，补第四档）：

- **L0 Chromium 全效**：`html.lg-refract` → backdrop-filter:url(#lg-lens) 真折射 + 色散 + 边缘光 + 高光
- **L1 Safari/FF 次优**：backdrop-filter: blur+saturate + 边缘光弧 + screen 静态高光 + 描边（**无折射**）
- **L2 无 backdrop-filter 兜底**（`@supports not`）：半透明实色 tint + 描边 + inset 高光，保证可读对比
- **L3 a11y**：`prefers-reduced-transparency` → 拉高不透明度、关 screen 高光；`prefers-reduced-motion` → 关追光/拉伸/reveal（保留静态光学）

| 区块 | 技术 | L0 Chromium | L1 Safari/FF | L2 无 backdrop | 说明 |
|---|---|---|---|---|---|
| **导航胶囊 nav-pill** | **真折射（保持现状）** | url(#lg-lens) 折射 + velocity→拉伸/折射强度联动 | blur + 边缘光 + 静态高光 | 实色 tint + 描边 | 小面积 <800px、浮动 UI = 对抗验证 #3 认定的**唯一安全开真折射的地方**。加 `contain:layout paint` + `will-change:transform` 隔离合成层 |
| **按钮 button** | **纯 CSS 近似（保持现状）** | 不叠 backdrop-filter（避免玻璃叠玻璃），只做 screen 高光 + 按压光晕 | 同 L0 | 同 L0 | 按钮在玻璃父层之上，**永远不开真折射**。合成预算敏感，现状决策正确，保留 |
| **大面积 .sec** | **纯 CSS 近似为主（D），真折射不铺**（现状） | blur+saturate + mask-composite 边缘光弧 + screen 高光 + 可选**追光** | 去掉追光，保留静态高光 + 边缘光 | 实色 tint | **绝不给大面积/多实例 .sec 逐块开 backdrop-filter:url()**——撞 >800px jank + O(N)。这是硬红线 |
| **hero 卡** | **真折射（受控单实例，可选升级）** | 若 hero 卡是单个、<800px 的浮动卡：可开 url(#lg-lens)；若是大面板：退回 .sec 的 D 方案 | blur + 边缘光 + 高光 | 实色 tint | **判据 = 尺寸**：单个小卡→真折射惊艳；大面板→纯 CSS。不为"hero 很重要"就给大面板开真折射 |

**关键裁剪原则（写进 design-system 文档就近标注）**：真折射 = 只给"小面积 + 单/少实例 + 浮动"的元素（nav-pill、可能的 hero 小卡、单个 CTA）；一切"大面积 + 多实例 + 随内容增长"的（.sec、卡片列表、1318 张社交图）**只走纯 CSS 近似**。

---

## 4. 近两阶段已做工作的处置

| 你做的 | 处置 | 理由 |
|---|---|---|
| **mask-composite 边缘光弧环** | **保留，升级为主力** | 跨浏览器一致、零成本、是 L1/L2 降级态"读起来像玻璃"的核心承重件。在无真折射的 Safari 上，边缘光是玻璃感的最大来源。**建议再吸收 kube.io 的 4 种边缘剖面方程/法线求高光思路，让光弧有方向感** |
| **screen 混合静态镜面高光** | **保留** | 跨浏览器、零依赖、深底上 screen 出效果。是 L0–L2 全档都在的静态光学层 |
| **追光镜面高光（--mx/--my via glass-motion.js）** | **保留但收紧作用域** | 只在 `hover:hover + reduced-motion:no-preference` 开（现状已这么门控，正确）；**移动端不开**（无 hover，且省合成）。不废弃，但明确是"桌面锦上添花" |
| **按压光晕** | **保留** | 交互反馈、零成本、跨浏览器。按钮的主要"玻璃活性"来源 |
| **reveal 入场** | **保留，受 reduced-motion 门控** | 零成本、跨浏览器。确认已在 `prefers-reduced-motion` 下关闭 |
| **velocity→胶囊拉伸+折射强度联动（nav.js）** | **保留** | 这是最接近"液态跟手"的真效果，且限定在 nav-pill 单个小元素上，成本可控。**注意**：所有源库都**没有**真正的 Apple 果冻形变（spring/rubber-band），你现有的 velocity 拉伸已经是同类实现里少见的"跟手"，是差异化亮点，别因为"不够液态"去上 WebGL 换它 |
| **UA 判定加 .lg-refract** | **保留，但建议改特性检测** | 见第 5 节坑。UA 嗅探 `/Chrome\//` 会误判 iOS Chrome（WebKit 内核）走全效路径实则失效 |

**没有任何一项被"更好的方案取代"或"废弃"** —— 因为主路线不变，它们全是主路线的降级承重件。唯一要动的是"把它们从 nav-pill 的附属，提升为 .sec/Safari 态的一等玻璃语言"。

---

## 5. 可借鉴片段 / 库（含 license 体积）+ 必避坑

### 可直接拷（推荐优先级）
1. **rizroze/liquid-glass** — MIT，单文件 `core/liquid-glass.js` 7.7KB/202 行，零依赖 ESM。`Canvas 2D 画位移图 → feImage → 3×feDisplacementMap(色散) → backdrop-filter`。**最接近你现状架构，可整段参考重构 #lg-lens 的位移图生成**。缺点：无镜面高光（你已自补）、UA 嗅探（要换特性检测）。
2. **nikdelvin/liquid-glass** — MIT，`liquidGlass.ts` 4.3KB 纯函数返回 data-URI 位移图（红/绿渐变编码 XY + 中心压平只折射边缘）+ 三通道色散链。**纯字符串零依赖，可整段抄进 Astro**，比 Canvas 版更轻。忽略其 animejs 背景自转。
3. **kube.io 配方（reference-grade，无仓库不可拷代码）** — Snell 定律逐点折射 → R/G 通道编码；**4 种边缘剖面方程 + 法线求高光** → 用来升级你的 mask-composite 光弧，让它有方向/剖面感。
4. **iyinchao GLSL 数学（MIT，仅抄片段）** — IOR 三通道色散(0.98/1.0/1.02)、LCH Fresnel。仅当未来某天做单个 WebGL hero 时参考，**当前不引入**。

### 必避坑（Safari + 移动端）
- **Safari filter id 缓存坑**：Safari 会缓存 SVG filter，同一 id 复用时折射不刷新。→ **每次形状变化给 filter 生成新 id（cache-busting），或形状不变时绝不改 id**（PallavAg/samasante 都这么绕）。
- **Safari 强制 1×、无 supersample**：别指望 Safari 上边缘和 Chromium 一样利落；接受"外观一致、精度略低"。**别为对齐 Safari 精度去开 filterResolution=2**（Safari 忽略，Chromium 徒增成本）。
- **位移图重生成 = 最贵操作**：kube.io/rizroze 都点名"任何形状/尺寸变化强制重建整张位移图"。→ **位移图按几何参数 Map 缓存，只在 resize 时 rAF 防抖重建；velocity 联动只改 filter 的 scale/subregion 属性，绝不触发重建**（scale 补间是唯一便宜的动画）。你现有 velocity→折射强度联动务必确认走的是改 scale 而非重画位移图。
- **UA 嗅探误判 iOS Chrome**：`/Chrome\//` 在 iOS Chrome（WebKit 内核）为 true 但真折射失效。→ 改**运行时特性检测**：建一个隐藏元素试 `backdrop-filter: url(#probe)` 看是否生效，或至少叠加 iOS 排除（`!/iP(hone|ad|od)/`）。这是现状唯一的正确性 bug。
- **移动 jank 规避（对抗验证 #3 可操作清单）**：真折射元素加 `contain:strict`（或 `layout paint`）隔离绘制边界 + `will-change:transform` 提独立合成层 + 宽度 <800px；**色散只算边缘像素省 ~30% 负载**；避免文字直接压在折射玻璃上；真机 320–430 量 INP 与滚动帧率。
- **绝不对 blur 半径做动画**（性能纪律，源库也印证）——保持。
- **别踩"假毛玻璃底图"旧坑**：backdrop-filter 是真取背景，不是贴模糊底图；nikdelvin 那种覆盖层取背景是对的，别退化成预渲染底图。

---

## 6. 重设后分期路线（替换原 Phase 3–5）

| Phase | 目标 | 风险 | 验证方式 |
|---|---|---|---|
| **P3 — 正确性 + 降级补齐（先修 bug，最高优先）** | ① UA 嗅探换特性检测（修 iOS Chrome 误判）② 补 L2 `@supports not (backdrop-filter)` 兜底态 ③ 确认 L1 Safari 态"边缘光+高光"读起来是玻璃、不塌 | 特性检测探针本身在个别浏览器行为差异 | 三真机各一：Chrome(L0)/Safari(L1)/关 backdrop 的模拟(L2)，截图比对"都像玻璃" |
| **P4 — 边缘光学升级（把降级态做成卖点）** | 用 kube.io 剖面方程/法线思路，把 mask-composite 光弧升级为**有方向、有剖面**的边缘光；让 Safari 无折射态也有"高级玻璃"观感 | 纯 CSS 表现力上限；多层 mask 合成成本 | 桌面 Safari/FF 肉眼评审（设计空间开放，给 2 个方向草案过目）；移动帧率不回退 |
| **P5 — 真折射受控扩位 + 移动加固** | ① 评估 hero 是否为"单个小卡"→ 若是则开真折射（+contain+will-change）② 给所有真折射元素上移动 jank 规避清单 ③ 位移图缓存/scale-only 动画审计 | hero 若是大面板则**不做**（守红线）；移动合成层预算 | 真机 320–430 量滚动帧率 + INP；Chromium GPU 占用不超阈值；确认 velocity 联动不触发位移图重建 |
| **P6（可选，明确标注不做除非有第二用例）** | WebGL 单 hero shader | 与无框架/零依赖/移动成本全冲突 | **默认不启动**；仅当出现"必须 Safari 也真折射某个关键单卡"的真实需求，才按数学借鉴路线评估 |

**分期纪律**：P3→P4→P5 按 CLAUDE.md「分阶段默认顺序执行」连续跑，不逐阶段请示；仅在 P4/P5 涉及**用户可见层视觉定稿**时给可预览草案过目（这是硬确认项）。P6 是范围变更，需单独发决策请求。

---

## 一句话总纲
不追"Safari 也能真折射"这个已被验证为不可能/过贵的幻影；把力气花在**三档降级都像玻璃、边缘光学做出高级感、真折射只用在小浮动元素、移动端不炸**——这是当前约束下最优而非最炫的方案。

## 对抗验证结论（存档）
- **#1 backdrop-filter:url() 仅 Chromium** → verdict **true**（high）。WebKit Bug 245510 报于 2022-09 仍 NEW；Firefox 未排期。引擎级缺口，别等。
- **#2 filter 折射「背景克隆」跨浏览器可行** → verdict **mostly-false**（high）。PallavAg/samasante 默认折射的是元素自身像素，非背景；折射 fixed 照片须喂全屏副本，撞 Safari 源尺寸上限 + O(N)。
- **#3 SVG/WebGL 真折射移动端有 jank** → verdict **mostly-true**（medium）。有 M4-Max 滚动 judder、耗电抱怨、M3 Pro Chromium GPU ~40% vs Firefox <20% 等实证；缺命名机型硬 FPS 基准。大面积/多实例尤危；规避见第 5 节。
