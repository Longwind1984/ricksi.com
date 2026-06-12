/**
 * Liquid Glass surface shells: content section, hero index card, dark inset card.
 */
export interface GlassSectionProps {
  /** section (.sec, the page building block) | index (hero glass card) | card (dark inset paper) */
  variant?: 'section' | 'index' | 'card';
  id?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
