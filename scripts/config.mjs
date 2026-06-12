// 数据采集配置 —— 所有本地路径集中在这里
import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();

export const CONFIG = {
  /* 本地 git 仓库扫描根（递归 2 层找 .git 目录；worktree 的 .git 是文件，自动排除避免重复计数） */
  repoRoots: [
    path.join(HOME, 'Claude_Code'),
    path.join(HOME, 'code'),
    HOME, // 仅一层：~/prac03-MuseumCollect、~/museum-guide 这类散仓
  ],
  repoScanDepth: { [HOME]: 1 },
  defaultScanDepth: 2,

  /* Obsidian 库 */
  vault: path.join(HOME, 'Library/Mobile Documents/iCloud~md~obsidian/Documents', "Rick's Second Brain"),
  /* 知识图谱 / 发布范围：AI 大文件夹 */
  vaultAiDir: '04AI',
  /* 默认不发布的主题域（Gate B 隐私评审的初始排除项） */
  excludeClusters: ['0404 AI PM 求职与职业发展', '0409 待解问题'],
  /* 下钻一层的大文件夹：其二级子文件夹（F1~F6 切面）各自成为主题域 */
  facetedClusters: ['04T 专题库'],
  /* 发布消毒（只作用于导出的发布版，不改 Obsidian 原文件） */
  sanitize: {
    /* 命中即整节剥离的小节标题（AI 协作的内部工作残桩） */
    stripSections: ['衍生对话存档', '来源对话'],
    /* 屏蔽词：发布版替换为 〔□〕 并在 manifest 报告 */
    blockWords: ['他妈', '妈的', '操你', '傻逼', '卧槽'],
    /* 指向库外、形如日记的 wikilink（YYYYMMDD- 开头）抹成〔私人记录〕 */
    diaryLinkPattern: /^\d{6,8}[-_－]/,
    /* 标题命中即默认不发布（manifest 标注原因，人工复核后可用 front-matter publish:true 解禁） */
    sensitiveTitles: [/政治敏感/, /立场对比/],
  },
  /* 活动热力图统计时跳过的目录（剪藏导入与归档不算「构建」） */
  vaultActivityExclude: ['.obsidian', '.trash', 'Cubox', 'Readwise', '99Archive', '00Meta'],

  /* 微信读书 · AI 共创导入书白名单（secret=1 默认全排除，唯白名单按书名显式放行；
     用户决策 2026-06-12：四组话题全展示。同名取 readUpdateTime 最新去重。 */
  wereadAiTopics: [
    {
      id: 'memory',
      topic: '记忆机制',
      blurb: '与 Claude 共写的三本小书，拆同一个问题：AI 的「记忆」到底是什么——和知识库的上下文工程专题互为印证。',
      titles: ['记忆的四种耦合', '记忆的梯度', '记忆 一个词的解剖'],
      graphFocus: '专题-工程与成本/_上下文工程系统化专题-总览',
    },
    {
      id: 'evals',
      topic: '评测与分数',
      blurb: 'Goodhart 定律在 AI 评测里的回声：当分数成为目标，分数就不再是好分数。',
      titles: ['当分数成为目标', '分数之外'],
      graphFocus: '专题-评测与度量/_评测系统化专题-总览',
    },
    {
      id: 'prompt',
      topic: '提示词工程',
      blurb: '从咒语到工程——这本写完之后，我再也没把提示词当玄学。',
      titles: ['提示词工程：从咒语，到工程'],
    },
    {
      id: 'agency',
      topic: '自主与信号',
      blurb: 'Agent 自主性的边界，以及人怎么读懂机器发出的信号。',
      titles: ['自主的尺度', '信号的阶梯'],
    },
  ],

  /* Claude Code 本地会话日志 */
  claudeProjects: path.join(HOME, '.claude', 'projects'),

  /* GitHub（Actions 内通过 GITHUB_TOKEN/PAT 抓取；本地有 token 也可跑） */
  githubUser: 'Longwind1984',

  /* 产物 */
  dataDir: path.resolve('data'),
  kbContentDir: path.resolve('content/kb'),

  /* 热力图周数 */
  heatmapWeeks: 22,
};
