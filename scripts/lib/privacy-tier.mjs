// 全库三态隐私分级（full / stub / hidden）—— 纯函数，无副作用，便于单测与 dry-run 复用
// full：04AI（含 04T）全文，维持现状，本模块不处理（由 sync-vault 主路径产出）。
// stub：privacyMigration.stubFolders 白名单域，逐篇过标题敏感审查，未命中 → stub（仅元数据）。
// hidden：hiddenFolders 黑名单整域，或任一标题敏感规则命中 → hidden（连标题都不发）。
import { CONFIG } from '../config.mjs';

const PM = CONFIG.privacyMigration;

/* 运行时把 frontier.excludePatterns（备案站硬红线）拼进政治规则——
   这样涉政正则只有一处真源（config.frontier），privacyMigration 只补译名。 */
const POLITICAL_FRONTIER = (CONFIG.frontier?.excludePatterns || []).map((re, i) => ({
  rule: `political:frontier#${i}`,
  re,
}));

/* 全部标题敏感规则 = frontier 涉政红线 + privacyMigration 七类补充 */
export const TITLE_RULES = [...POLITICAL_FRONTIER, ...PM.titleSensitivePatterns];

/* 取一个相对路径（相对 vault 根）的顶层文件夹标签。
   根目录散文件 → '(根目录)' 哨兵；04AI 子树由调用方单独识别为 full，不进这里。 */
export function topFolderOf(relFromVault) {
  const parts = relFromVault.split('/');
  return parts.length > 1 ? parts[0] : '(根目录)';
}

/* 对单个标题跑全部敏感规则，返回命中的 rule 标识数组（去重、保序）。 */
export function hitSensitiveRules(title) {
  const hits = [];
  for (const { rule, re } of TITLE_RULES) {
    if (re.test(title)) hits.push(rule);
  }
  return [...new Set(hits)];
}

/* 分级单篇笔记。
   入参：{ title, topFolder }（topFolder 由 topFolderOf 得出）。
   返回：{ tier:'stub'|'hidden', hitRules:[], reason } —— full 不经过这里。

   判定顺序【严格】（用户 2026-06-15 签字）：
     ① 政治命中(isPolitical) → hidden（备案红线，最高优先；放行白名单也不能覆盖）
     ② 否则 hiddenFolders 整域 → hidden（黑名单整域不出，保证 9 域 0 节点）
     ③ 否则标题 ∈ titleOverrideAllow → stub（误杀放行；只能在非黑名单域内救回）
     ④ 否则其他敏感规则命中 → hidden（finance/health/diary/... 七类）
     ⑤ 否则 stubFolders 内 → stub
     ⑥ 否则未知域 → hidden（默认不发）
   ② 排在 ③ 之前：黑名单整域优先于放行，放行只在候选域内生效，黑名单域 0 节点不被绕过。 */
export function classify({ title, topFolder }) {
  // ① 政治红线最高优先：命中即 hidden，放行白名单不可覆盖
  if (isPolitical(title)) {
    return { tier: 'hidden', hitRules: hitSensitiveRules(title), reason: 'political' };
  }
  // ② 硬排除整域 → hidden（整域不出，标题敏感规则无需再跑）
  if (PM.hiddenFolders.includes(topFolder)) {
    return { tier: 'hidden', hitRules: [], reason: 'hiddenFolder' };
  }
  // ③ 误杀放行白名单 → stub（政治已在 ① 拦下，此处放行的必非政治）
  if (PM.titleOverrideAllow.includes(title)) {
    return { tier: 'stub', hitRules: [], reason: 'titleOverrideAllow' };
  }
  // ④ 其他敏感规则命中 → hidden
  const hitRules = hitSensitiveRules(title);
  if (hitRules.length) {
    return { tier: 'hidden', hitRules, reason: 'sensitiveTitle' };
  }
  // ⑤ 白名单 stub 候选域 → stub
  if (PM.stubFolders.includes(topFolder)) {
    return { tier: 'stub', hitRules: [], reason: 'stubFolder' };
  }
  // ⑥ 既不在白名单也不在黑名单的域：保守起见 → hidden（未知域默认不发）
  return { tier: 'hidden', hitRules: [], reason: 'unknownFolder' };
}

/* 政治正则单独暴露：dry-run 末尾要对全部 stub 候选标题再跑一遍确认命中=0。 */
export const POLITICAL_RULES = [
  ...POLITICAL_FRONTIER,
  ...PM.titleSensitivePatterns.filter((p) => p.rule === 'political'),
];

export function isPolitical(title) {
  return POLITICAL_RULES.some(({ re }) => re.test(title));
}
