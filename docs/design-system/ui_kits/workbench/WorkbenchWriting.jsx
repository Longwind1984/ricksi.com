import React from 'react';
import { GlassSection } from '../../components/glass/GlassSection.jsx';
import { SectionHeader } from '../../components/content/SectionHeader.jsx';
import { BlogRow } from '../../components/content/BlogRow.jsx';
import { Button } from '../../components/core/Button.jsx';
import { Stat } from '../../components/content/Stat.jsx';

const POSTS = [
  { date: '2026.05', title: '从 Codex 源码看 Slash 命令的交互设计', tag: '源码拆解' },
  { date: '2026.04', title: 'AI PM 的第一性原理：上下文管理', tag: '产品方法' },
  { date: '2026.03', title: 'RAG 已死？知识库产品的三条路线', tag: '技术判断' },
];

export function WorkbenchWriting() {
  return (
    <GlassSection id="blog" data-screen-label="04 思考与写作">
      <SectionHeader no="04" title="思考与写作" en="WRITING" desc="做的时候想清楚，写下来才算数" href="#blog" />
      <div>
        {POSTS.map((p) => (
          <BlogRow key={p.title} {...p} />
        ))}
      </div>
      <div className="proj-expand-row">
        <Button variant="ghost">查看全部 4 篇 →</Button>
      </div>
    </GlassSection>
  );
}

/* Sample shelf (src/lib/sample.js) — gradient placeholder covers, never fake real book covers. */
const RD_GRADS = [
  'linear-gradient(160deg,#27416B,#0F1D38)',
  'linear-gradient(160deg,#2E5C50,#10241F)',
  'linear-gradient(160deg,#6B4A27,#2A1B0E)',
  'linear-gradient(160deg,#54306B,#1E1030)',
  'linear-gradient(160deg,#6B2738,#280E15)',
  'linear-gradient(160deg,#2A5A6B,#0E2228)',
];

const SHELF = [
  { title: '思考，快与慢', author: '丹尼尔·卡尼曼', progress: 62, finished: false },
  { title: '创新者的窘境', author: '克莱顿·克里斯坦森', progress: 100, finished: true },
  { title: '人月神话', author: '弗雷德里克·布鲁克斯', progress: 100, finished: true },
  { title: '设计中的设计', author: '原研哉', progress: 34, finished: false },
  { title: '失控', author: '凯文·凯利', progress: 100, finished: true },
  { title: '禅与摩托车维修艺术', author: '罗伯特·波西格', progress: 18, finished: false },
];

export function WorkbenchReading() {
  const current = SHELF[0];
  return (
    <GlassSection id="reading" data-screen-label="05 阅读">
      <SectionHeader no="05" title="阅读" en="READING · WEREAD" desc="真实书架与 AI 共创分区展示，统计来自微信读书官方接口" />
      <div className="rd-stats">
        <Stat label="藏书" value="36" unit="本" />
        <Stat label="读完" value="21" unit="本" />
        <Stat label="在读" value="3" unit="本" />
        <Stat label="划线与想法" value="412" unit="条" />
      </div>
      <div className="rd-grid">
        <div className="rd-current">
          <div className="mono wb-label">最近在读</div>
          <div className="rd-current-card">
            <div className="rd-cover rd-cover-lg rd-cover-ph" style={{ background: RD_GRADS[0] }}>
              <span>{current.title.slice(0, 1)}</span>
            </div>
            <div className="rd-current-info">
              <div className="rd-book-title">{current.title}</div>
              <div className="rd-book-author mono">{current.author}</div>
              <div className="rd-progress">
                <div className="rd-progress-bar"><span style={{ width: current.progress + '%' }}></span></div>
                <span className="mono rd-progress-num">{current.progress}%</span>
              </div>
              <div className="mono rd-book-notes">38 条划线与想法</div>
            </div>
          </div>
        </div>
        <div className="rd-shelf-col">
          <div className="mono wb-label">书架 · 按最近阅读排序</div>
          <div className="rd-shelf">
            {SHELF.map((b, i) => (
              <div className="rd-book" key={b.title} title={`《${b.title}》 · ${b.author}`}>
                <div className="rd-cover rd-cover-ph" style={{ background: RD_GRADS[i % RD_GRADS.length] }}>
                  <span>{b.title.slice(0, 1)}</span>
                </div>
                {!b.finished && b.progress > 0 ? (
                  <div className="rd-mini-bar"><span style={{ width: b.progress + '%' }}></span></div>
                ) : null}
                <div className="rd-book-name">{b.title}</div>
              </div>
            ))}
          </div>
          <div className="mono wb-stamp">样例书架——接入微信读书后展示真实在读与划线</div>
        </div>
      </div>
    </GlassSection>
  );
}
