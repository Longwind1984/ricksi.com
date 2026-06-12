/**
 * Full-width glass footer band: headline + mono contact links, big tinted CTA, colophon.
 */
export interface SiteFooterProps {
  title?: string;
  email?: string;
  github?: string;
  cta?: string | null;
  ctaHref?: string;
  copyright?: string;
  style?: React.CSSProperties;
}
