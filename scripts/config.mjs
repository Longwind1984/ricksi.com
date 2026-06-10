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
  /* 活动热力图统计时跳过的目录（剪藏导入与归档不算「构建」） */
  vaultActivityExclude: ['.obsidian', '.trash', 'Cubox', 'Readwise', '99Archive', '00Meta'],

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
