import React from 'react';
import { GlassSection } from '../../components/glass/GlassSection.jsx';
import { SectionHeader } from '../../components/content/SectionHeader.jsx';
import { Stat } from '../../components/content/Stat.jsx';
import { Heatmap } from '../../components/content/Heatmap.jsx';
import { Badge } from '../../components/core/Badge.jsx';

/* Sample 14-day trend (design-comp values from src/lib/sample.js). */
const DAYS14 = [0.6, 1.1, 0.9, 1.6, 0.7, 1.3, 2.0, 0.9, 1.4, 2.2, 0.7, 1.1, 1.8, 1.25].map((v, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  return { label: i === 13 ? '今天' : `${d.getMonth() + 1}/${d.getDate()}`, v };
});

function TrendBars({ days }) {
  const max = Math.max(...days.map((d) => d.v));
  return (
    <div className="tk-bars">
      {days.map((d, i) => (
        <div className="tk-day" key={i} title={`${d.label} · ${d.v}M tokens`}>
          <span
            className={'tk-bar' + (i === days.length - 1 ? ' today' : '')}
            style={{ height: Math.max(5, Math.round((d.v / max) * 100)) + '%' }}
          ></span>
          {i % 3 === 1 ? <span className="tk-label">{d.label}</span> : <span className="tk-label">&nbsp;</span>}
        </div>
      ))}
    </div>
  );
}

export function WorkbenchData() {
  return (
    <GlassSection id="workbench" data-screen-label="02 工作台数据">
      <SectionHeader no="02" title="工作台数据" en="WORKBENCH · DAILY" desc="5 月底以来逐日实测；更早部分按公开口径估算并标明" />
      <div className="wb-grid">
        <div className="wb-col">
          <div className="mono wb-label">今日 TOKEN 用量<Badge variant="sample" /></div>
          <span className="wb-static-num">1,247,832</span>
          <div className="mono wb-sub" style={{ color: 'var(--gold-dim)' }}>全口径（含缓存读写 41%）· 其中模型输出 89K</div>
          <div className="wb-stat-row">
            <Stat label="本周" value="8.7M" unit="tokens" />
            <Stat label="累计" value="142M" unit="tokens" />
          </div>
          <div className="wb-models">
            <span className="mono wb-model">Opus <b>38%</b></span>
            <span className="mono wb-model">Sonnet <b>54%</b></span>
            <span className="mono wb-model">Haiku <b>8%</b></span>
          </div>
          <div className="mono wb-stamp">数据更新于 2026-06-12 21:30 · 口径 v2</div>
        </div>
        <div className="wb-col">
          <div className="mono wb-label">近 14 日用量趋势（M TOKENS）<Badge variant="sample" /></div>
          <TrendBars days={DAYS14} />
        </div>
        <div className="wb-col no-border">
          <div className="mono wb-label">多源活跃 · 近 22 周<Badge variant="sample" /></div>
          <Heatmap dims={[['all', '全部'], ['git', '代码提交'], ['notes', '笔记'], ['ai', 'AI 会话'], ['gh', 'GitHub']]} />
          <div className="wb-stat-row">
            <Stat label="提交" value="486" unit="commits" />
            <Stat label="连续" value="37" unit="天" />
            <Stat label="仓库" value="9" unit="个" />
          </div>
        </div>
      </div>
    </GlassSection>
  );
}
