/**
 * Writing list row: mono date, title, mono tag capsule, slide-right arrow.
 */
export interface BlogRowProps {
  /** "2026.05" format */
  date: string;
  title: string;
  /** One mono tag, e.g. "源码拆解" */
  tag?: string;
  href?: string;
  style?: React.CSSProperties;
}
