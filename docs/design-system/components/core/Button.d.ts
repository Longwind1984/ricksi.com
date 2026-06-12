/**
 * Liquid Glass button. `accent` is the single tinted control of the system;
 * `ghost` is the neutral capsule used for expand/secondary actions.
 */
export interface ButtonProps {
  /** 'accent' (tinted glass, primary) or 'ghost' (neutral capsule, mono label) */
  variant?: 'accent' | 'ghost';
  /** 'default' (40px) or 'big' (50px hero/footer CTA). Ghost ignores size. */
  size?: 'default' | 'big';
  /** Render as <a href> instead of <button> */
  href?: string;
  target?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
