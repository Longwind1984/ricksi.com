/**
 * Data stat: mono letterspaced label above a big tabular-numeral value with small unit.
 */
export interface StatProps {
  /** Mono label, e.g. "本周" */
  label: string;
  value: string | number;
  /** Small unit suffix, e.g. "tokens" / "天" */
  unit?: string;
  /** Faint mono footnote under the number */
  sub?: string;
  /** default 28px · big 42px hero number · kg 32px graph stat */
  size?: 'default' | 'big' | 'kg';
  style?: React.CSSProperties;
}
