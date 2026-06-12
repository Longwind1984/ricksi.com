/**
 * Project list row: accent number, 18px-stroke icon, title with arrow, role/decision/result
 * description, mono tech tags, 320px cover. Whole row hovers & presses.
 */
export interface ProjectRowProps {
  /** Zero-padded number, e.g. "02" */
  no?: string;
  title: string;
  /** 角色/关键决策/结果 description (2–4 sentences) */
  desc?: string;
  /** Mono capsule tags, 2–3 max */
  tags?: string[];
  /** Inline SVG string, 18px 1.8-stroke style */
  icon?: string;
  /** Cover image path (150px-tall media card) */
  img?: string;
  imgAlt?: string;
  href?: string;
  /** No public repo yet — dashed 仓库整理中 tag, no link */
  wip?: boolean;
  style?: React.CSSProperties;
}
