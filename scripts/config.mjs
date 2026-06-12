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

  /* AI 共创书封面：《记忆的四种耦合》为 epub 原版提取；其余 7 本源文件已删，
     按原版模板（深 navy/白宋体/金划线）重绘 SVG（副题为按主题补写，非原文） */
  wereadAiCovers: {
    记忆的四种耦合: '/assets/books/ai/memory-coupling.png',
    记忆的梯度: '/assets/books/ai/memory-gradient.svg',
    '记忆 一个词的解剖': '/assets/books/ai/memory-anatomy.svg',
    当分数成为目标: '/assets/books/ai/score-goal.svg',
    分数之外: '/assets/books/ai/beyond-score.svg',
    '提示词工程：从咒语，到工程': '/assets/books/ai/prompt-engineering.svg',
    自主的尺度: '/assets/books/ai/autonomy-scale.svg',
    信号的阶梯: '/assets/books/ai/signal-ladder.svg',
  },

  /* 微信读书 · 书架展示中间层（哪些书出现在公开站点由这里人工筛选）
     mode 'manual'：只展示 titles 列出的书（按此顺序）；'auto'：旧规则（读出过进度或读完，前 18）
     ⚠ 下列每本书的「划线」会被抓取并发布到 /reading/<id>/ 公开页——增删后重跑 npm run sync；
     候选清单（全部非私密书）每次采集会打印在控制台供挑选 */
  wereadShelf: {
    mode: 'manual',
    titles: [
      '论美国的民主',
      '美国生活中的反智主义',
      '施米特文集：政治的神学',
      '我们需要什么样的文明',
      '博尔赫斯，写作课（博尔赫斯全集）',
      '瓦尔登湖',
      'On the Duty of Civil Disobedience',
      '开放社会及其敌人（全二卷）',
      '忧郁的热带',
      '道德的谱系（经典与解释）',
      '论李维',
      '面对现代世界问题的人类学（列维-斯特劳斯文集16）',
      '如何做田野笔记',
      '鲁迅全集（全20卷）',
      '略萨作品：酒吧长谈（精装珍藏版）',
      '略萨作品：给青年小说家的信',
      '安第斯山脉的生与死：追寻土匪、英雄和革命者的足迹（甲骨文系列）',
    ],
  },

  /* Claude Code 本地会话日志 */
  claudeProjects: path.join(HOME, '.claude', 'projects'),

  /* GitHub（Actions 内通过 GITHUB_TOKEN/PAT 抓取；本地有 token 也可跑） */
  githubUser: 'Longwind1984',

  /* 产物 */
  dataDir: path.resolve('data'),
  kbContentDir: path.resolve('content/kb'),

  /* 热力图周数 */
  heatmapWeeks: 22,

  /* ── 前沿追踪 ──────────────────────────────────────────────
     每日抓取选定 AI 学者/信息源的公开动态 → claude 无头梳理 → data/frontier.json
     源 URL 验证于 2026-06-12（全部 200）；X 走镜像池，失效即从 xMirrors 删并补新实例 */
  frontier: {
    /* 本地代理（nitter/arXiv/官方博客直连大概率不通）；null = 直连 */
    proxy: 'http://127.0.0.1:7897',

    /* 抓取参数 */
    lookbackDays: 3,      // 只收最近 N 天发布的条目（宕机 1-2 天后自动补齐）
    maxPerSource: 5,      // 每源每次最多收 N 条新条目（控高频源如 simonwillison）
    maxNewPerRun: 20,     // 全局每次最多送 LLM 的条数（按发布时间倒序截断）
    fetchTimeoutMs: 15000,
    includeRetweets: false, // nitter RSS 里 "RT by"/"R to" 开头的转推与回复直接丢弃

    /* RSS 摘要短于 minChars 时抓原文页剥标签补全，截断到 maxChars（X 条目不补全） */
    fullText: { minChars: 500, maxChars: 8000 },

    /* 落盘与去重 */
    rollingDays: 90,      // frontier.json 只留最近 90 天，更早滚入 data/frontier/archive-YYYY-MM.json
    seenTtlDays: 180,     // 去重账本条目过期天数

    /* claude CLI 无头调用（用现有订阅，不走 API key；LaunchAgent 下无 alias 必须绝对路径） */
    claude: {
      bin: '/opt/homebrew/bin/claude',
      model: 'sonnet',
      timeoutMs: 120000,
      retries: 1,
    },

    /* X 镜像池：按序 fallback，{handle} 占位；2026-06-12 实测两个都活且数据新鲜。
       全部失败 = 该源本次静默缺失（计入 stats.lastRun.skippedSources），不阻塞管线 */
    xMirrors: [
      'https://nitter.net/{handle}/rss',
      'https://rss.xcancel.com/{handle}/rss',
    ],

    /* 预过滤：标题/正文命中即不送 LLM、标 excluded（涉政硬闸——站点部署目标是备案域名；
       第二道闸是 LLM 输出的 relevant=false） */
    excludePatterns: [
      /trump|biden|vance|election|democrat|republican|maga\b/i,
      /israel|gaza|palestin|ukraine|russia/i,
      /taiwan|台湾|台灣|香港|新疆|西藏|中共|共产党|习近平/i,
    ],

    /* 人物头像：统一风格只靠 stylePrompt 模板锁定（{name}/{title} 占位）——
       不要把已有头像当参考图传入：实测会「串脸」（模型连主体一起复制，2026-06-12）。
       生成：npm run frontier:portraits —— 有 GEMINI_API_KEY（env 或 scripts/.gemini-key，已 gitignore）
       时调 nano banana 2（gemini-3.1-flash-image，v1beta，约 $0.067/张）只为缺头像的人生成；
       无 key 时打印每人完整 prompt 供手动生成后放入 dir。改了 stylePrompt 想全员统一重生成：
       删掉 dir 下全部 webp 再跑。头像缺失不破版：人物卡自动回退程序化「星座字母牌」
      （frontier-ui.mjs，slug 种子确定性生成） */
    portrait: {
      dir: 'public/assets/frontier',
      model: 'gemini-3.1-flash-image',
      size: 512, // 落盘 webp 边长
      stylePrompt:
        'Minimalist editorial portrait illustration of {name} ({title}), recognizable likeness, ' +
        'three-quarter view, head and shoulders. Refined geometric line art with flat shading, ' +
        'no photorealism. Deep navy night-sky background (#0A1222) with a sparse subtle starfield ' +
        'and one thin warm gold accent line (#E8B36A). Palette strictly limited to: ink-white lines, ' +
        'muted glacier-blue rim light (#4D9FEC), single gold accent. Square 1:1 composition with ' +
        'generous negative space, subject slightly off-center. No text, no logo, no watermark, no frame.',
    },

    /* 人物名单（草案 2026-06-12，随时增删；domain 取值见 domains） */
    domains: {
      lab: '前沿实验室',
      engineering: '工程与教育',
      research: '研究与评测',
      writing: '综述与观察',
    },
    people: [
      {
        slug: 'karpathy', name: 'Andrej Karpathy', domain: 'engineering', wiki: 'Andrej_Karpathy',
        title: 'Eureka Labs 创始人，前 Tesla AI / OpenAI',
        bio: '把复杂 AI 知识压缩成人类可学习接口的教学型思想者，Software 3.0 与 agentic engineering 的提出者。',
        sources: [
          { type: 'x', handle: 'karpathy' },
          { type: 'rss', url: 'https://karpathy.bearblog.dev/feed/' },
          { type: 'youtube', channelId: 'UCXUPKJO5MZQN11PqgIvyuvQ' },
        ],
      },
      {
        slug: 'dario-amodei', name: 'Dario Amodei', domain: 'lab', wiki: 'Dario_Amodei',
        title: 'Anthropic CEO',
        bio: '把模型能力、安全叙事和政策表态放在同一张桌子上的公司型思想者。',
        sources: [{ type: 'x', handle: 'DarioAmodei' }], // 个人站无 RSS（2026-06-12 验证）
      },
      {
        slug: 'ilya-sutskever', name: 'Ilya Sutskever', domain: 'lab', wiki: 'Ilya_Sutskever',
        title: 'SSI 创始人，前 OpenAI 首席科学家',
        bio: '低频但高信号：能力跃迁与对齐叙事之间最关键的内部见证者之一。',
        sources: [{ type: 'x', handle: 'ilyasut' }],
      },
      {
        slug: 'demis-hassabis', name: 'Demis Hassabis', domain: 'lab', wiki: 'Demis_Hassabis',
        title: 'Google DeepMind CEO',
        bio: '科学发现型 AI 路线的代表，强调世界模型与科研加速。',
        sources: [{ type: 'x', handle: 'demishassabis' }],
      },
      {
        slug: 'yann-lecun', name: 'Yann LeCun', domain: 'research', wiki: 'Yann_LeCun',
        title: 'AMI Labs 创始人，前 Meta 首席 AI 科学家',
        bio: '在 LLM 主潮之外持续押注世界模型路线的反向坐标。',
        sources: [{ type: 'x', handle: 'ylecun' }],
      },
      {
        slug: 'francois-chollet', name: 'François Chollet', domain: 'research', wiki: 'François_Chollet',
        title: 'Keras 作者，ARC-AGI 设计者',
        bio: '通过重新定义「什么才算智能」来校准 AGI 讨论的概念边界。',
        sources: [{ type: 'x', handle: 'fchollet' }],
      },
      {
        slug: 'lilian-weng', name: 'Lilian Weng', domain: 'writing',
        title: 'Thinking Machines 联创，前 OpenAI 安全研究负责人',
        bio: '长文综述的标杆：把一个研究方向的全部脉络压进一篇可执行的 Lil\'Log。',
        sources: [
          { type: 'rss', url: 'https://lilianweng.github.io/index.xml' },
          { type: 'x', handle: 'lilianweng' },
        ],
      },
      {
        slug: 'simon-willison', name: 'Simon Willison', domain: 'engineering', wiki: 'Simon_Willison',
        title: 'Datasette 作者，独立开发者',
        bio: 'AI 工程实践的高频观察哨：新模型、新工具的第一手试用记录。',
        sources: [{ type: 'rss', url: 'https://simonwillison.net/atom/everything/' }], // 高频源，maxPerSource 控量；X 与博客高度重复故不抓
      },
      {
        slug: 'sam-altman', name: 'Sam Altman', domain: 'lab', wiki: 'Sam_Altman',
        title: 'OpenAI CEO',
        bio: '产品节奏与 AGI 叙事的风向标。',
        sources: [
          { type: 'x', handle: 'sama' },
          { type: 'rss', url: 'https://blog.samaltman.com/posts.atom' },
        ],
      },
      {
        slug: 'nathan-lambert', name: 'Nathan Lambert', domain: 'writing', refPhoto: 'x:natolambert',
        title: 'AI2 研究员，Interconnects 作者',
        bio: '开源模型与后训练（RLHF）生态最稳定的中文圈外解读源。',
        sources: [{ type: 'rss', url: 'https://www.interconnects.ai/feed' }],
      },
    ],

    /* 话题/机构源（person 为空，topicSource 落 slug） */
    topics: [
      {
        slug: 'anthropic', name: 'Anthropic 官方', domain: 'lab',
        sources: [{ type: 'x', handle: 'AnthropicAI' }], // 官网无 RSS（2026-06-12 验证）
      },
      {
        slug: 'openai', name: 'OpenAI 官方', domain: 'lab',
        sources: [{ type: 'rss', url: 'https://openai.com/news/rss.xml' }],
      },
      {
        slug: 'deepmind', name: 'DeepMind Blog', domain: 'lab',
        sources: [{ type: 'rss', url: 'https://deepmind.google/blog/rss.xml' }],
      },
      {
        slug: 'arc-prize', name: 'ARC Prize', domain: 'research',
        sources: [{ type: 'rss', url: 'https://arcprize.org/feed.xml' }],
      },
      {
        slug: 'arxiv-agents', name: 'arXiv · LLM Agent 论文', domain: 'research',
        sources: [{ type: 'arxiv', query: 'cat:cs.CL AND abs:"LLM agent"', maxResults: 10 }],
      },
    ],
  },
};
