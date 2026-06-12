/**
 * Knowledge-base note capsule chip with accent backlink-degree count.
 */
export interface NoteChipProps {
  title: string;
  /** Backlink degree shown in accent mono */
  deg?: number;
  href?: string;
  /** Accent-washed featured variant (精选) */
  featured?: boolean;
  style?: React.CSSProperties;
}
