import { CSSProperties, ReactNode } from 'react';

/**
 * Share card — direction-one 玻璃明信片: the site's glass language mailed out
 * as a 360×640 vertical card (export @2x for WeChat/RedNote). Photo backdrop +
 * cobalt glass panel + gold kicker + QR slot, footer URL + hook line.
 */
export interface ShareCardProps {
  /** node = 知识库节点 · article = 思考与写作 · site = 整站名片 */
  variant?: 'node' | 'article' | 'site';
  /** Top-left mono brand line, e.g. "RICK SI · 知识库" */
  brand?: string;
  /** Top-right clear-glass module pill, e.g. "KNOWLEDGE · NODE" */
  module?: string;
  /** Gold mono kicker above the title, e.g. "节点 · 已沉淀 47 天" */
  kicker?: string;
  title: ReactNode;
  /** Body sans excerpt (node / site) */
  excerpt?: string;
  /** 文楷 quote with gold left rule (article) — 人的声音 */
  quote?: string;
  /** Provenance badges — pass <Badge> elements (人机光谱) */
  badges?: ReactNode;
  /** Capsule chips; string or { label, color } for a graph-domain dot */
  chips?: Array<string | { label: string; color?: string }>;
  /** Stat triplet (site variant): { value, label, gold? } */
  stats?: Array<{ value: string; label: string; gold?: boolean }>;
  /** Footer URL (bold white mono line) */
  url: string;
  /** Footer hook line under the URL, e.g. "扫码进入图谱 · 看它的 12 个邻居" */
  hook?: string;
  /** QR image src; omitted → placeholder grid */
  qr?: string;
  /** CSS background-position for the photo; per-variant default otherwise */
  photoPosition?: string;
  /** Photography credit stamp; defaults to 云海之上 · 无人机自摄 */
  credit?: string;
  style?: CSSProperties;
}

export function ShareCard(props: ShareCardProps): JSX.Element;
