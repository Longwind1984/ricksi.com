# 前沿追踪 · 邮件订阅（Phase C）— 进度与交接

> 状态（2026-06-16）：**未开始写代码**，架构已定、`.gitignore` 已就位。等用户备齐 3 个前置后开工。
> compact 后从「下一步」继续。

## 已定方案
自建 Serverless 表单 + **Resend**（发信）+ **Upstash Redis**（存订阅者，REST 跨平台）。
每日摘要由本地 `scripts/sync.mjs`（21:30 LaunchAgent）跑完 collect-frontier 后发送，按每个订阅者的「信息等级（事件星类 rank）/ 信源等级（源级 constellation rank）」过滤当日条目。

## ⏳ 需要用户先做的 3 件（不齐则代码写完也上不了线）
1. **Resend**：注册 → 加域名 `ricksi.com`（建议子域 `send`）→ 照抄它给的 MX/SPF/DKIM(+可选 DMARC) 加到 ricksi.com DNS → Verify 通过 → 建 Sending API key →
   `printf 're_xxx' > scripts/.resend-key`（已 gitignore）。免费档约 100 封/天。
2. **Upstash Redis**：注册 → Create Database（免费档）→ 复制 REST URL + TOKEN →
   `printf '{"url":"https://xxx.upstash.io","token":"AXX"}' > scripts/.upstash`（已 gitignore）。
3. **报名端点平台**（二选一，回报给我）：
   - **EdgeOne Pages Functions（推荐，国内同源快无跨域）**：确认 EdgeOne Pages 项目有「函数/Functions」+「环境变量」。
   - **Vercel（兜底）**：adapter 已就绪，但 ricksi.com→端点跨域 + 国内 POST 可能慢；给我 Vercel 项目域名。
   两条路都要把 4 个 env 加到所选平台：`RESEND_API_KEY`、`UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`、`SITE_URL`（=https://ricksi.com）。
   ⚠ 函数读不到本地 `scripts/.*`，所以这 4 个 key 要**同时**：本地文件（给 send-digest）+ 平台 env（给函数）。

## 架构 / 待建文件（我开工后写）
- `functions/api/subscribe.[js]`（或 Vercel Astro `prerender=false` 路由）：POST `{email,eventLevel,sourceLevel}` + 蜜罐防 spam → 写 Upstash（status=pending+token）→ Resend 发**双重确认**邮件（带 confirm 链接）。
- `functions/api/confirm.[js]`：GET `?token` → status=active。`functions/api/unsubscribe.[js]`：GET `?token` → 删。
- `src/components/SubscribeForm.astro` + `src/scripts/subscribe.js`：邮箱 + 两个下拉（信息等级=星类阈值、信源等级=源级阈值）+ 蜜罐 + 成功/失败态；挂到 `frontier.astro`（可选页脚）。
- `scripts/lib/email-template.mjs`：摘要 HTML（复用 `frontier-ui` 的 STAR_CLASS/CONSTELLATION 色 + 站点钴蓝；每条带退订链接）。
- `scripts/send-digest.mjs`：读 Upstash active 订阅者 + frontier.json **当日**条目 → 逐订阅者按 `starOf` rank≥eventLevel 且 con rank≥sourceLevel 过滤 → Resend 发；`--dry` 只打印不发。挂入 `sync.mjs`（collect-frontier 之后、soft-fail）。
- 复用 `src/pages/frontier.xml.ts` 的 frontier.json 读取/owner map 作为内容源。

## Upstash 数据模型（建议）
- key `sub:<email>` → JSON `{email, eventLevel(int 1-6 星类rank), sourceLevel(int 1-4 源级rank), status:'pending'|'active', token, createdAt}`。
- set `subs:active` 存 active email 列表（send-digest 遍历用）。

## 等级取值（与站点一致）
- 信息等级 = 事件星类 rank：奇点6 / 超新星5 / 深空·黑洞4 / 新星·彗星3 / 流星·微光2 / 星尘1（用户选「≥某档」）。
- 信源等级 = 源级 rank：北极星4 / 猎户座3 / 星辰2 / 行星1（用户选「≥某档」）。
- 过滤口径同落地页 frontier.js（`starOf`/`CONSTELLATION_RANK`，见 `src/lib/frontier-ui.mjs`）。

## 已就绪
- `.gitignore` 已加 `scripts/.resend-key`、`scripts/.upstash`。

## 下一步（compact 后）
用户回报「Resend Verified + key 落好 / Upstash 落好 / 端点走 EdgeOne 还是 Vercel」→ 我：① 写 send-digest + 模板，`--dry` 跑通 + 出邮件模板草案给用户看；② 写端点 + 表单；③ 接真发信 + 挂 sync；④ 测「报名→确认→收摘要→退订」全链路。账号未齐前可先做 ①（本地可验证）。
