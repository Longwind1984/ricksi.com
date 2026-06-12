/**
 * Capsule badge/chip — 人机光谱 semantics: 色温 = 人↔机 (暖→冷); 虚线 = 未验证.
 */
export interface BadgeProps {
  /** tag (neutral chip) | sample (样例数据, dashed gold) | prov-human (实测·金) | prov-co (共创·青) | prov-ai (AI 整理·紫) | wip (dashed) */
  variant?: 'tag' | 'sample' | 'prov-human' | 'prov-co' | 'prov-ai' | 'wip';
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
