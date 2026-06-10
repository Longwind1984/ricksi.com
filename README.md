# Rick 个人主页

司豪杰 Rick Si 的个人作品集主页 —— 从 Claude Design 设计稿（Liquid Glass 最终版）实现的纯静态单页，零构建、零依赖（仅 Google Fonts CDN）。

## 文件

- `index.html` — 全部页面、样式与交互（vanilla HTML/CSS/JS）
- `assets/hero-summit.jpg` — 雪山云海主视觉（无人机自摄）

## 本地预览

```bash
python3 -m http.server 8923 --directory .
# 打开 http://localhost:8923
```

## 部署到 Vercel

```bash
npx vercel --prod
```

或在 vercel.com 新建项目，直接拖入本文件夹（静态站点，无需任何构建配置）。

## 待替换的占位内容

- 三个项目卡的截图/录屏（`[ SlashGO 录屏 ]` 等占位框）
- 「下载简历」按钮的 PDF 链接（导航与页脚各一处，现为空链接）
- Blog 四篇文章的真实链接（现为占位 `#`）
- 知识库图谱为程序生成的样例数据，可换成 Obsidian 真实导出
- 工作台数据（token 用量、commits 等）为示意值，部署后可接真实统计
