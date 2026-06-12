/**
 * Capsule glass search input with optional mono accent hint (e.g. result count).
 */
export interface SearchInputProps {
  placeholder?: string;
  /** Accent mono hint shown right of the field, e.g. "12 篇" */
  hint?: string;
  value?: string;
  onChange?: (e: any) => void;
  style?: React.CSSProperties;
}
