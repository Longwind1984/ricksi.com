/**
 * Section header row: accent mono number, CJK title with mono EN echo, right-aligned one-liner.
 */
export interface SectionHeaderProps {
  /** Zero-padded section number, e.g. "03" */
  no?: string;
  title: string;
  /** Mono uppercase EN echo, e.g. "KNOWLEDGE GRAPH" */
  en?: string;
  /** Right-aligned one-line description */
  desc?: string;
  /** Make the title a link */
  href?: string;
  style?: React.CSSProperties;
}
