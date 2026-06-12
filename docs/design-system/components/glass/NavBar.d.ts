/**
 * Floating capsule glass nav with sliding liquid-lens pill, ⌘K search capsule
 * and the single tinted CTA.
 */
export interface NavBarProps {
  brand?: string;
  /** [id, label] pairs */
  items?: [string, string][];
  /** Controlled active tab id; uncontrolled (click-to-move pill) when omitted */
  active?: string;
  onNavigate?: (id: string, e: any) => void;
  /** Tinted CTA label; null hides it */
  cta?: string | null;
  ctaHref?: string;
  /** position:fixed like the real site (default). false = inline for embedding. */
  fixed?: boolean;
  /** More transparent variant used over the hero photo */
  overHero?: boolean;
  showSearch?: boolean;
  style?: React.CSSProperties;
}
