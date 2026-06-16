# 图像生成（文生图 / 图生图）

写给三个月后没有上下文的我：本项目哪里生图、用什么、key 在哪、怎么不浪费调用。

## 现状（2026-06-15 起）

| 用途 | 用什么 | 为什么 |
|---|---|---|
| **人物头像 /frontier** | **Nano Banana（Gemini `gemini-3.1-flash-image`）** | 它能稳定复刻「钴蓝之夜」细线稿、似真可控、无边框 |
| **机构头像 /frontier** | 同上，i2i 真实 logo | 取机构真 logo 做参考图风格化进同一套夜空风，保持可识别（2026-06-16 起） |
| 其他临时生图（如需要） | 火山方舟 Seedream（备选，未在用） | key 已配，但头像实测复刻不了这套风格、似真不可控，已弃用于头像 |

> ⚠ **头像不要再用 Seedream**：2026-06-15 实测 Seedream 风格漂移（厚涂/偏亮）、随机加白边/相框、串色，
> 似真也不如 Gemini。结论记录在 WORKLOG 2026-06-15。

## 人物头像管线（Nano Banana）

- **Key**：`scripts/.gemini-key`（或环境变量 `GEMINI_API_KEY`），已 gitignore。
- **代理**：Gemini 是境外服务，必须走代理——脚本自重执行注入 `frontier.proxy`（`127.0.0.1:7897`）。
- **配置**：[`scripts/config.mjs`](../scripts/config.mjs) → `frontier.portrait`（`model` / `size` / `stylePrompt`）。
- **生成**：`npm run frontier:portraits`。
- **似真**：取**本人**真实照片做图生图锚点（缓存 `scripts/.frontier-refs/`，gitignore）。
  ⚠ 只能传本人照片；传别人的成品头像会串脸（2026-06-12 实测）。
- **风格一致 + 识别度**（stylePrompt 已锁定）：似真优先（少几笔也认得出谁）、三七分头肩像、
  头占画面约 60%、近黑钴蓝满版底 + 星点 + 一条金线、调色板限白线/冰川蓝/金。
- **无照片的人不强生**：人只在有照片源（`wiki`/`refPhoto`/X source）时才生成；查不到照片
  退星座字母牌（`frontier-ui.portraitFallbackSvg`），不做无似真度的「随机脸」。

### 机构头像（i2i 真 logo · 2026-06-16）

- config 机构源（`frontier.topics[]`）加 `logo: '<url>'` 即纳入生成；用 `logoPrompt` 模板。
  来源经验：**clearbit 已失效、wiki summary 不暴露公司 logo（非自由版权）**；可用
  [simpleicons](https://simpleicons.org) CDN `https://cdn.simpleicons.org/<slug>/<hex>`（单色描白）
  或官方/Commons 的 SVG 直链。OpenAI 不在 simpleicons（商标移除），用 Commons SVG。
- 单色干净 logo 做 i2i 输入效果意外地好（模型忠实复刻轮廓再上夜空风）；Anthropic 的字标 glyph
  会被渲成偏通用的「AI」字样，可接受或换更具象的 logo 源。
- 没 logo 源的机构（arc-prize / metr / epoch-ai）暂不出头像，时间轴行只显名字。

### 去白边（系统化 · 2026-06-16）

- 模型偶尔无视「no border」给整图套白框。脚本后处理 `trimWhiteBorder()`：检测左上角近白 →
  `sharp.trim` 裁掉 → cover 回方图；非白边图原样不动。生成与手动收口两条路径都过这一步。
- 修旧图（不调 API、本地 sharp、幂等）：`npm run frontier:portraits -- --repair`。

### 经济性（避免无谓 token / 调用）

- 默认**只为缺头像的人生成**（已有 webp 直接跳过）。
- 改 `stylePrompt` **不会**自动重生旧图——刻意为之，防误触发批量计费。
- 单独重做某人：`npm run frontier:portraits -- --force <slug>`。
- 只有要全员统一重生才删 `public/assets/frontier/` 下全部 webp 再跑。
- 某人还原度差：先查参考图对不对（`scripts/.frontier-refs/<slug>.jpg`），用该人 config 的
  `refPhoto: '<直链>'` 覆盖、删缓存重跑——别盲目全量重生。

## 火山方舟（备选，非头像）

- **Key**：`scripts/.ark-key`（gitignore）或 `ARK_API_KEY`；一把 key 通用所有字节系模型。
- **统一入口**：[`scripts/lib/ark-image.mjs`](../scripts/lib/ark-image.mjs) 的 `arkImage({ prompt, images })`。
- 端点 `POST https://ark.cn-beijing.volces.com/api/v3/images/generations`、模型
  `doubao-seedream-4-0-250828`、**境内域名直连不走代理**。若将来有非头像生图需求可用；头像勿用。
