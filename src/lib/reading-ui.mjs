// 阅读模块共享视觉常量（首页阅读区 / /reading/ 总页 / 书籍落地页共用）

/* 无封面书的渐变占位（按索引循环取色） */
export const RD_GRADS = [
  'linear-gradient(160deg,#27416B,#0F1D38)',
  'linear-gradient(160deg,#2E5C50,#10241F)',
  'linear-gradient(160deg,#6B4A27,#2A1B0E)',
  'linear-gradient(160deg,#54306B,#1E1030)',
  'linear-gradient(160deg,#6B2738,#280E15)',
  'linear-gradient(160deg,#2A5A6B,#0E2228)',
];

/* AI 共创书字排封面的话题色 */
export const TOPIC_GRADS = {
  memory: 'linear-gradient(155deg,#3D2E6B 0%,#1A1238 100%)',
  evals: 'linear-gradient(155deg,#1F5B52 0%,#0C2522 100%)',
  prompt: 'linear-gradient(155deg,#6B4A1F 0%,#2A1C0C 100%)',
  agency: 'linear-gradient(155deg,#1F3F6B 0%,#0C1A2E 100%)',
  harness: 'linear-gradient(155deg,#6B3A1F 0%,#281209 100%)',
};

/* 字符串稳定哈希 → 渐变索引（同一本书永远同色） */
export function gradOf(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 997;
  return RD_GRADS[h % RD_GRADS.length];
}
