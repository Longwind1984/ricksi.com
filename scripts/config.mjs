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

  /* AI 共创书封面：8 本均为「定制信息图」SVG（2026-06-16 multi-agent 按各书主题重绘，
     仿两本新书 epub 内精装封面的 house 语言：mono 元信息条 + 大标题 + accent 副题 + 专属 motif + credit）。
     封面覆盖也可在 data/book-extras.json 的 byTitle.cover 指定（merge 步会盖，survive sync）。 */
  wereadAiCovers: {
    记忆的四种耦合: '/assets/books/ai/memory-coupling.svg',
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

  /* 其他 Agent harness 的本地用量库（口径 v3：Token 用量按 harness 分源汇总）。
     缺库（如 CI、未装该工具）自动跳过——已提交的 usage.json 里的历史分源数据照用。
     去重：Hermes 经 claude-proxy(localhost) 跑的 `claude -p` 已落 Claude JSONL、计入 Claude Code，
           故 Hermes 侧按 billing_base_url 含 localhost 排除，避免与 Claude Code 重复计。 */
  agentUsage: {
    zcodeDb: path.join(HOME, '.zcode', 'cli', 'db', 'db.sqlite'), // model_usage 表，started_at=毫秒
    hermesDb: path.join(HOME, '.hermes', 'state.db'),             // sessions 表，started_at=秒(REAL)
    hermesExcludeUrlLike: '%localhost%',                          // claude-proxy 去重
  },

  /* 自制 ePub 书架源（30书架）：merge-local-books.mjs 每次同步从这里拉最新 epub + 缺失时提取封面。
     本地有此目录才同步；CI / 无目录静默跳过（已提交的产物照用）。
     新增一本：epub 放进此目录 → 在 data/local-books.json 登记一条（含 sourceFile=此处文件名、epub=目标路径）。 */
  bookshelfDir: path.join(HOME, 'Documents', '30书架'),

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

    /* 人物头像：风格靠 stylePrompt 模板锁定（{name}/{title} 占位）+ 本人真实照片做似真锚点。
       似真：refPhotoOf 自动取「本人」真实照片做参考图（图生图）——必须传，这是还原度的来源。
       ⚠ 只能传本人照片；传「别人的成品头像」会串脸（模型连主体一起复制，2026-06-12 实测）。
       生成：npm run frontier:portraits —— 有 GEMINI_API_KEY（env 或 scripts/.gemini-key，已 gitignore）
       时调 nano banana 2（gemini-3.1-flash-image，v1beta，约 $0.067/张）。
       经济性（避免无谓调用）：默认只为「缺头像」的人生成（已有 webp 直接跳过）；改 stylePrompt 不会
       自动重生旧图；单独重做某人用 `-- --force <slug>`；只有要全员统一重生才删 dir 下全部 webp。
       某人还原度差先查「参考图对不对」：refPhotoOf 默认按 config 的 wiki 词条取图，偶尔会取到
       旧照/错图——用该人的 `refPhoto: '<直链>'` 覆盖、删掉 .frontier-refs/<slug>.jpg 重跑即可。
       无 key 时打印每人 prompt 供 AI Studio 手动生成后放入 dir。头像缺失不破版：人物卡回退程序化
      「星座字母牌」（frontier-ui.mjs，slug 种子确定性）。
       （Seedream/火山方舟实测复刻不了这套线稿风、似真不可控，2026-06-15 弃用于头像，仅留作其他生图备选） */
    portrait: {
      dir: 'public/assets/frontier',
      model: 'gemini-3.1-flash-image',
      size: 512, // 落盘 webp 边长
      // 风格只锁「一致性」（钴蓝深空 + 星点 + 自然的金色点缀 + 白线稿/冰川蓝调色板），
      // 不 micro-管构图/姿态/金线形状——留给模型自由发挥，换取更丰富有神的面部细节（别卡通化）。
      // 教训 2026-06-15：过度具象的 prompt（强制金线横穿/头占 60%/少几笔）反而把脸做塌、卡通化。
      stylePrompt:
        'Editorial portrait illustration of {name} ({title}), with a strong, expressive, ' +
        'recognizable likeness and rich facial detail — refined and characterful, not ' +
        'over-simplified or cartoonish. Refined ink line-art with flat shading, no photorealism. ' +
        'A cohesive house look across the whole set: a deep near-black navy night-sky setting ' +
        '(#0A1222) with a subtle starfield and an understated warm gold accent (#E8B36A) worked ' +
        'naturally into the composition (any shape — a fine line, curve or arc, however it fits). ' +
        'Palette kept consistent: ink-white linework, muted glacier-blue rim light (#4D9FEC), a ' +
        'single warm gold accent. Three-quarter head-and-shoulders, square composition with ' +
        'generous negative space. The dark night-sky background must fill the entire frame edge ' +
        'to edge and bleed off all four sides — absolutely no white margin, no light border, no ' +
        'outline, no frame, no rounded card. No text, no logo, no watermark.',
      // 机构源用：以真实 logo（i2i 参考图）风格化进同一套房屋夜空风，保持可识别。
      logoPrompt:
        'A stylized emblem for {name}, derived from its real brand logo shown in the attached image. ' +
        "Re-draw the logo's exact, recognizable silhouette and mark as clean ink-white line-art, " +
        'centered, on a deep near-black navy night-sky background (#0A1222) that fills the entire ' +
        'frame edge to edge, with a subtle starfield and one understated warm gold accent (#E8B36A) ' +
        'and a muted glacier-blue rim light (#4D9FEC). Keep it unmistakably the same brand mark; do ' +
        'not invent a different symbol. Square, generous negative space. No extra text, no white ' +
        'margin, no border, no frame.',
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
        slug: 'karpathy', name: 'Andrej Karpathy', domain: 'engineering', constellation: 'polaris', wiki: 'Andrej_Karpathy',
        title: 'Eureka Labs 创始人，前 Tesla AI / OpenAI',
        bio: '把复杂 AI 知识压缩成人类可学习接口的教学型思想者，Software 3.0 与 agentic engineering 的提出者。',
        sources: [
          { type: 'x', handle: 'karpathy' },
          { type: 'rss', url: 'https://karpathy.bearblog.dev/feed/' },
          { type: 'youtube', channelId: 'UCXUPKJO5MZQN11PqgIvyuvQ' },
        ],
      },
      {
        slug: 'dario-amodei', name: 'Dario Amodei', domain: 'lab', constellation: 'polaris', wiki: 'Dario_Amodei',
        title: 'Anthropic CEO',
        bio: '把模型能力、安全叙事和政策表态放在同一张桌子上的公司型思想者。',
        sources: [{ type: 'x', handle: 'DarioAmodei' }], // 个人站无 RSS（2026-06-12 验证）
      },
      {
        slug: 'ilya-sutskever', name: 'Ilya Sutskever', domain: 'lab', constellation: 'polaris', wiki: 'Ilya_Sutskever',
        title: 'SSI 创始人，前 OpenAI 首席科学家',
        bio: '低频但高信号：能力跃迁与对齐叙事之间最关键的内部见证者之一。',
        sources: [{ type: 'x', handle: 'ilyasut' }],
      },
      {
        slug: 'demis-hassabis', name: 'Demis Hassabis', domain: 'lab', constellation: 'polaris', wiki: 'Demis_Hassabis',
        title: 'Google DeepMind CEO',
        bio: '科学发现型 AI 路线的代表，强调世界模型与科研加速。',
        sources: [{ type: 'x', handle: 'demishassabis' }],
      },
      {
        slug: 'yann-lecun', name: 'Yann LeCun', domain: 'research', constellation: 'polaris', wiki: 'Yann_LeCun',
        title: 'AMI Labs 创始人，前 Meta 首席 AI 科学家',
        bio: '在 LLM 主潮之外持续押注世界模型路线的反向坐标。',
        sources: [{ type: 'x', handle: 'ylecun' }],
      },
      {
        slug: 'francois-chollet', name: 'François Chollet', domain: 'research', constellation: 'constellation', wiki: 'François_Chollet',
        title: 'Keras 作者，ARC-AGI 设计者',
        bio: '通过重新定义「什么才算智能」来校准 AGI 讨论的概念边界。',
        sources: [{ type: 'x', handle: 'fchollet' }],
      },
      {
        slug: 'lilian-weng', name: 'Lilian Weng', domain: 'writing', constellation: 'star',
        title: 'Thinking Machines 联创，前 OpenAI 安全研究负责人',
        bio: '长文综述的标杆：把一个研究方向的全部脉络压进一篇可执行的 Lil\'Log。',
        sources: [
          { type: 'rss', url: 'https://lilianweng.github.io/index.xml' },
          { type: 'x', handle: 'lilianweng' },
        ],
      },
      {
        slug: 'simon-willison', name: 'Simon Willison', domain: 'engineering', constellation: 'star', wiki: 'Simon_Willison',
        title: 'Datasette 作者，独立开发者',
        bio: 'AI 工程实践的高频观察哨：新模型、新工具的第一手试用记录。',
        sources: [{ type: 'rss', url: 'https://simonwillison.net/atom/everything/' }], // 高频源，maxPerSource 控量；X 与博客高度重复故不抓
      },
      {
        slug: 'sam-altman', name: 'Sam Altman', domain: 'lab', constellation: 'constellation', wiki: 'Sam_Altman',
        title: 'OpenAI CEO',
        bio: '产品节奏与 AGI 叙事的风向标。',
        sources: [
          { type: 'x', handle: 'sama' },
          { type: 'rss', url: 'https://blog.samaltman.com/posts.atom' },
        ],
      },
      {
        slug: 'nathan-lambert', name: 'Nathan Lambert', domain: 'writing', constellation: 'star', refPhoto: 'x:natolambert',
        title: 'AI2 研究员，Interconnects 作者',
        bio: '开源模型与后训练（RLHF）生态最稳定的中文圈外解读源。',
        sources: [{ type: 'rss', url: 'https://www.interconnects.ai/feed' }],
      },
      {
        slug: 'fei-fei-li', name: 'Fei-Fei Li 李飞飞', domain: 'research', constellation: 'constellation', wiki: 'Fei-Fei_Li',
        title: 'World Labs 创始人/CEO，斯坦福教授',
        bio: '空间智能旗手，ImageNet 之后再押一个新范式：3D 世界模型。',
        sources: [],
      },
      {
        slug: 'chris-olah', name: 'Chris Olah', domain: 'research', constellation: 'constellation', wiki: 'Christopher_Olah',
        title: 'Anthropic 可解释性负责人/联合创始人',
        bio: '机制可解释性奠基人，看模型内部到底在算什么。',
        sources: [],
      },
      {
        slug: 'subbarao-kambhampati', name: 'Subbarao Kambhampati', domain: 'research', constellation: 'constellation',
        title: 'Arizona State University 教授',
        bio: 'LLM 不会真正规划——对 agent/推理宣称最严谨的批评者。',
        sources: [],
      },
      {
        slug: 'josh-tenenbaum', name: 'Josh Tenenbaum', domain: 'research', constellation: 'constellation',
        title: 'MIT 教授',
        bio: '计算认知科学旗手，用人怎么少样本学习对照 LLM。',
        sources: [],
      },
      {
        slug: 'noam-shazeer', name: 'Noam Shazeer', domain: 'lab', constellation: 'constellation',
        title: 'Transformer 架构共创者、Gemin…',
        bio: 'Noam Shazeer 是 Transformer 架构的联合发明者，现为 Google DeepMind 副总裁，…',
        sources: [],
      },
      {
        slug: 'jeff-dean', name: 'Jeff Dean', domain: 'lab', constellation: 'constellation',
        title: 'AI前沿实验室掌舵人',
        bio: '谷歌首席科学家，Gemini与Google DeepMind技术负责人，从分布式系统到推理系统的架构设计者，AI工业化…',
        sources: [],
      },
      {
        slug: 'neel-nanda', name: 'Neel Nanda', domain: 'research', constellation: 'star',
        title: 'Google DeepMind机械可解释性团队…',
        bio: 'Google DeepMind Staff Research Scientist，26岁，领导机械可解释性团队，专注通…',
        sources: [],
      },
      {
        slug: 'jan-leike', name: 'Jan Leike', domain: 'research', constellation: 'constellation',
        title: 'Anthropic 对齐科学团队负责人',
        bio: '前 OpenAI 超级对齐项目联合负责人，现任 Anthropic 对齐科学团队主任，致力于弱到强监督、可扩展监督与自…',
        sources: [],
      },
      {
        slug: 'jared-kaplan', name: 'Jared Kaplan', domain: 'lab', constellation: 'constellation',
        title: 'Anthropic 联合创始人兼首席科学家',
        bio: '神经网络缩放律先驱、Constitutional AI 方法论奠基人、Anthropic 首席科学官与负责任缩放官，掌…',
        sources: [],
      },
      {
        slug: 'percy-liang', name: 'Percy Liang', domain: 'research', constellation: 'constellation',
        title: 'Percy Liang - 基础模型与开源 A…',
        bio: '斯坦福计算机科学教授、基础模型研究中心（CRFM）创始主任、Together AI 与 Simile AI 联合创始人…',
        sources: [],
      },
      {
        slug: 'jacob-steinhardt', name: 'Jacob Steinhardt', domain: 'research', constellation: 'star',
        title: 'AI对齐与可解释性研究者',
        bio: 'UC Berkeley统计学副教授、Transluce非营利研究室创始人兼首席执行官，致力于机器学习系统的可靠性、对齐…',
        sources: [],
      },
      {
        slug: 'sebastien-bubeck', name: 'Sébastien Bubeck', domain: 'research', constellation: 'star',
        title: 'OpenAI数学与推理研究领导者',
        bio: 'Sébastien Bubeck是OpenAI数学研究团队负责人，前微软AI研究副总裁，专长优化理论与深度学习理论，在…',
        sources: [],
      },
      {
        slug: 'surya-ganguli', name: 'Surya Ganguli', domain: 'research', constellation: 'star',
        title: 'AI与神经科学融合的理论家',
        bio: '斯坦福应用物理副教授，HAI高级研究员，研究神经网络学习、神经编码与AI理论的计算机制，近三年推动NeuroAI科学范…',
        sources: [],
      },
      {
        slug: 'tom-griffiths', name: 'Tom Griffiths', domain: 'research', constellation: 'star',
        title: '普林斯顿计算认知科学与AI实验室负责人',
        bio: 'Tom Griffiths是普林斯顿大学心理学与计算机科学系的Henry R. Luce教授，致力于建立人类与机器学习…',
        sources: [],
      },
      {
        slug: 'brenden-lake', name: 'Brenden Lake', domain: 'research', constellation: 'star',
        title: '认知与机器智能桥梁者',
        bio: '普林斯顿计算机与心理学双聘副教授，以整合认知科学与神经网络，探究人与机器学习本质差异著称，2016年被科学美国人评为十…',
        sources: [],
      },
      {
        slug: 'ev-fedorenko', name: 'Ev Fedorenko', domain: 'research', constellation: 'star',
        title: 'MIT神经语言学家 · LLM-脑对齐研究先驱',
        bio: '麻省理工学院McGovern脑研究所副教授，EvLab主任。聚焦用脑成像/计算建模解析人类语言系统内部架构，近年主导大…',
        sources: [],
      },
      {
        slug: 'karl-friston', name: 'Karl Friston', domain: 'research', constellation: 'star',
        title: '神经科学与AI理论家·自由能原理奠基人',
        bio: '英国神经影像学教授，伦敦大学学院；自由能原理创立者；VERSES AI首席科学家；约8万篇论文引用；架构感知、推理、学…',
        sources: [],
      },
      {
        slug: 'stanislas-dehaene', name: 'Stanislas Dehaene', domain: 'research', constellation: 'star',
        title: '意识神经机制与 AI 认知的奠基人',
        bio: '法国认知神经科学家，Collège de France 讲座教授，提出全局神经工作区理论（GNW），在意识科学、数学认…',
        sources: [],
      },
      {
        slug: 'anil-seth', name: 'Anil Seth', domain: 'research', constellation: 'star',
        title: '意识科学与AI伦理的北极星',
        bio: '牛津大学认知与计算神经科学教授，Sussex意识科学中心主任，2025年Berggruen哲学奖得主，倡导生物自然主义…',
        sources: [],
      },
      {
        slug: 'anthony-zador', name: 'Anthony Zador', domain: 'research', constellation: 'star',
        title: 'NeuroAI 先驱：脑神经科学与人工智能交叉',
        bio: 'Cold Spring Harbor 实验室生物学教授，Alle Davis Harris 讲座人，COSYNE 会议…',
        sources: [],
      },
      {
        slug: 'jeff-hawkins', name: 'Jeff Hawkins', domain: 'research', constellation: 'star',
        title: '生物神经启发 AI 理论与系统研究者',
        bio: 'Palm 联合创始人，Numenta 与 Thousand Brains Project 创办人，专注神经皮层计算原理…',
        sources: [],
      },
      {
        slug: 'melanie-mitchell', name: 'Melanie Mitchell', domain: 'research', constellation: 'constellation',
        title: 'AI评测与认知能力评估专家',
        bio: '圣塔菲研究所詹姆斯·艾利教授，专攻AI认知能力评估、类比推理、抽象能力。通过心理学实验范式重新定义AI评测方法，质疑大…',
        sources: [],
      },
      {
        slug: 'emily-bender', name: 'Emily Bender', domain: 'research', constellation: 'constellation',
        title: '语言学家·AI伦理评论家',
        bio: '华盛顿大学计算语言学实验室主任、Wyckoff讲席教授。通过"随机鹦鹉"等概念揭示大语言模型的本质，推动AI伦理与人文…',
        sources: [],
      },
      {
        slug: 'gary-marcus', name: 'Gary Marcus', domain: 'writing', constellation: 'constellation',
        title: 'AI批评家与神经符号论倡导者',
        bio: '认知科学家、创业者，以对大型语言模型的深度批判和对神经符号AI方法的倡导著称。长期通过Substack和公开发言塑造A…',
        sources: [],
      },
    ],

    /* 话题/机构源（person 为空，topicSource 落 slug） */
    topics: [
      {
        // logo：机构头像 i2i 参考（simpleicons 单色描白 / 官方 SVG）；缺源者退星座字母牌
        slug: 'anthropic', name: 'Anthropic 官方', domain: 'lab', constellation: 'polaris',
        logo: 'https://cdn.simpleicons.org/anthropic/cfe0f5',
        sources: [{ type: 'x', handle: 'AnthropicAI' }], // 官网无 RSS（2026-06-12 验证）
      },
      {
        slug: 'openai', name: 'OpenAI 官方', domain: 'lab', constellation: 'polaris',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg',
        sources: [{ type: 'rss', url: 'https://openai.com/news/rss.xml' }],
      },
      {
        slug: 'deepmind', name: 'DeepMind Blog', domain: 'lab', constellation: 'polaris',
        logo: 'https://cdn.simpleicons.org/deepmind/cfe0f5',
        sources: [{ type: 'rss', url: 'https://deepmind.google/blog/rss.xml' }],
      },
      {
        slug: 'arc-prize', name: 'ARC Prize', domain: 'research', constellation: 'star',
        sources: [{ type: 'rss', url: 'https://arcprize.org/feed.xml' }],
      },
      {
        slug: 'arxiv-agents', name: 'arXiv · LLM Agent 论文', domain: 'research', constellation: 'planet',
        logo: 'https://cdn.simpleicons.org/arxiv/cfe0f5',
        sources: [{ type: 'arxiv', query: 'cat:cs.CL AND abs:"LLM agent"', maxResults: 10 }],
      },
      {
        slug: 'deepseek', name: 'DeepSeek 深度求索', domain: 'lab', constellation: 'polaris',
        logo: 'https://cdn.simpleicons.org/deepseek/cfe0f5',
        sources: [],
      },
      {
        slug: 'bytedance-seed', name: 'ByteDance Seed / 豆包', domain: 'lab', constellation: 'constellation',
        logo: 'https://cdn.simpleicons.org/bytedance/cfe0f5',
        sources: [],
      },
      {
        slug: 'metr', name: 'METR', domain: 'research', constellation: 'constellation',
        sources: [],
      },
      {
        slug: 'epoch-ai', name: 'Epoch AI', domain: 'research', constellation: 'constellation',
        sources: [],
      },
      {
        slug: 'xai', name: 'xAI', domain: 'lab', constellation: 'constellation',
        sources: [],
      },
      {
        slug: 'meta-msl', name: 'Meta Superintelligence Labs', domain: 'lab', constellation: 'constellation',
        sources: [],
      },
      {
        slug: 'ssi', name: 'Safe Superintelligence (SSI)', domain: 'lab', constellation: 'constellation',
        sources: [],
      },
      {
        slug: 'thinking-machines', name: 'Thinking Machines Lab', domain: 'lab', constellation: 'constellation',
        sources: [],
      },
      {
        slug: 'mistral', name: 'Mistral AI', domain: 'lab', constellation: 'constellation',
        sources: [],
      },
      {
        slug: 'cohere', name: 'Cohere', domain: 'lab', constellation: 'star',
        sources: [],
      },
      {
        slug: 'world-labs', name: 'World Labs', domain: 'lab', constellation: 'star',
        sources: [],
      },
      {
        slug: 'qwen', name: 'Qwen 通义千问（阿里）', domain: 'lab', constellation: 'constellation',
        sources: [],
      },
      {
        slug: 'zhipu', name: '智谱 AI（Z.ai / GLM）', domain: 'lab', constellation: 'constellation',
        sources: [],
      },
      {
        slug: 'moonshot', name: '月之暗面 Moonshot（Kimi）', domain: 'lab', constellation: 'constellation',
        sources: [],
      },
      {
        slug: 'minimax', name: 'MiniMax', domain: 'lab', constellation: 'star',
        sources: [],
      },
      {
        slug: 'stepfun', name: '阶跃星辰 StepFun', domain: 'lab', constellation: 'star',
        sources: [],
      },
      {
        slug: 'baidu-ernie', name: '百度文心 Baidu ERNIE', domain: 'lab', constellation: 'star',
        sources: [],
      },
      {
        slug: 'xiaomi-mimo', name: '小米 MiMo', domain: 'lab', constellation: 'planet',
        sources: [],
      },
      {
        slug: 'lmarena', name: 'LMArena（Chatbot Arena）', domain: 'research', constellation: 'constellation',
        sources: [],
      },
      {
        slug: 'artificial-analysis', name: 'Artificial Analysis', domain: 'research', constellation: 'star',
        sources: [],
      },
      {
        slug: 'stanford-crfm', name: 'Stanford CRFM / HELM', domain: 'research', constellation: 'star',
        sources: [],
      },
      {
        slug: 'semianalysis', name: 'SemiAnalysis', domain: 'research', constellation: 'constellation',
        sources: [],
      },
      {
        slug: 'uk-aisi', name: 'UK AI Safety Institute', domain: 'research', constellation: 'constellation',
        sources: [],
      },
      {
        slug: 'us-aisi', name: 'US AI Safety Institute (CAISI)', domain: 'research', constellation: 'star',
        sources: [],
      },
      {
        slug: 'govai', name: 'GovAI（Centre for the Governance of AI）', domain: 'research', constellation: 'star',
        sources: [],
      },
      {
        slug: 'apollo-research', name: 'Apollo Research', domain: 'research', constellation: 'star',
        sources: [],
      },
    ],
  },

  /* ── 全库三态隐私迁移 · 保守发布配置 ──────────────────────────
     现状：管线只读 vaultAiDir='04AI'，产出 598 full 节点（全文）。
     目标：把库里【明确中性】的域以「stub」形态纳入（仅 title/id/cluster/links，
           正文永不进任何产物、无 slug、无 content/kb 页），其余整域 + 任何域里命中
           敏感规则的标题一律 hidden（连标题都不发）。
     三态定义：
       full   —— 全文发布，维持现状，仅 04AI（含 04T）。
       stub   —— 仅元数据（标题/聚类/双链），正文不进产物。
       hidden —— 不出现在任何产物（连标题都不发）。
     ⚠ 本配置块只被「三态迁移管线」读取；不改动 04AI 既有 full 行为。
        每篇 stub 候选还要逐条过 titleSensitivePatterns（命中→降级 hidden），
        最终发布前由用户在 data/title-review.json 逐条签字（disposition）。 */
  privacyMigration: {
    /* 顶层文件夹（vault 一级目录名，须与磁盘完全一致）。
       这些域【整域纳入 stub 候选】，再逐篇过标题敏感审查；命中即降 hidden。 */
    stubFolders: ['05读书', '60流浪', '06人', '01学习', '03产品'],

    /* 硬排除整域 → hidden（连标题都不出）。'(根目录)' 是哨兵值，
       表示 vault 根目录下的散落 .md（非 04AI/非白名单子目录的顶层文件）。 */
    hiddenFolders: [
      '02工作', '30认真活着', '80随记', '99Archive',
      'Cubox', 'Readwise', '00Meta', '90故纸堆',
      '(根目录)',
    ],

    /* 标题敏感规则（命中任一 → 该笔记强制降级 hidden，无论它落在哪个白名单域）。
       每条带 rule 标识，title-review.json 的 hitRules 里逐条记录命中了哪几类。 */
    titleSensitivePatterns: [
      /* ① 政治 / 地缘 —— 复用 frontier.excludePatterns（备案站硬红线）+ 显式补全
         （特朗普/拜登/内塔尼亚胡/毛泽东/伊朗/马杜罗/伊以/美以 等中文译名）。
         frontier.excludePatterns 在运行时由管线 spread 进来，这里只放它没覆盖的补充项。 */
      { rule: 'political', re: /特朗普|拜登|内塔尼亚胡|毛泽东|伊朗|马杜罗|伊以|美以|中美|地缘|大选|政变|战争|冲突|局势|普京|泽连斯基|哈马斯|加沙|乌克兰|俄罗斯|以色列|巴勒斯坦/i },
      /* ② 私人日记 —— YYYYMMDD- 开头的日记文件名 + 自我档案/职业决策/复盘/flomo/微博草稿 */
      { rule: 'diary', re: /^\d{6,8}[-_－]/ },
      { rule: 'diary', re: /自我档案|职业决策|复盘|flomo|微博草稿|日记|随想|碎念/i },
      /* ③ 财务 —— 投资/持仓/估值/薪资/期权 */
      { rule: 'finance', re: /投资|持仓|估值|薪资|薪酬|期权|股权|财务|资产|理财|收入|工资/i },
      /* ④ 健康 —— 冒名顶替/焦虑/抑郁/体检/就医 */
      { rule: 'health', re: /冒名顶替|焦虑|抑郁|体检|就医|心理|病|抑鬱|疗愈|情绪/i },
      /* ⑤ 关系 —— 恋爱/分手/家庭 */
      { rule: 'relationship', re: /恋爱|分手|家庭|家族|婚|情感|相亲|前任|暗恋/i },
      /* ⑥ 求职 —— 跳槽/offer/面试/求职 + 简历/履历/晋升/OKR/离职/Gap/JD（03产品 职业生涯子树） */
      { rule: 'jobhunt', re: /跳槽|offer|面试|求职|简历|履历|晋升|OKR|离职|gap\b|\bJD\b|内推|猎头/i },
      /* ⑦ 未命名 / Untitled */
      { rule: 'untitled', re: /^(未命名|untitled)/i },
    ],

    /* 误杀放行白名单（用户 2026-06-15 签字复核）：这些标题被上面的规则误命中（finance 的「收入」、
       health 的「心理」），但实为中性学术/读书笔记，显式放行为 stub。
       注意：放行【不覆盖政治红线】——政治命中者即便在此列表也仍 hidden（classify 里政治判定优先）。 */
    titleOverrideAllow: [
      '中国农民亩均收入',
      '中等收入陷阱',
      '0163心理学',
      '心理',
      '心理动机：激发行动力的底层逻辑',
    ],

    /* dry-run 产物：扫描 + 分级结果，给用户审标题用。落 .private/（已 gitignore），绝不入库；
       hidden 整域排除条目只出文件夹摘要、不出明文标题（防审阅文件被传阅/截图泄漏）。 */
    titleReviewOut: path.resolve('.private', 'title-review.json'),
  },
};
