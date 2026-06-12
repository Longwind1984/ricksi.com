/**
 * Activity heatmap: 22-week × 7-day grid of 11px cells on the 雪夜→日出 ramp
 * (5 levels, gold top tier), with optional mono dimension-filter capsules.
 */
export interface HeatmapProps {
  weeks?: number;
  /** [week][day] levels 0–4. Omit for the site's seeded sample (seed 5). */
  data?: number[][];
  /** Dimension chips as [key, label] pairs */
  dims?: [string, string][];
  activeDim?: string;
  onDimChange?: (key: string) => void;
  style?: React.CSSProperties;
}
