import React from 'react';
import { GlassSection } from '../../components/glass/GlassSection.jsx';

/* Hero — full-bleed photo (site background) with title bottom-left, index glass card bottom-right. */
export function WorkbenchHero({ onNavigate }) {
  const index = [
    ['projects', '01', '项目', "What I've built · 5"],
    ['workbench', '02', '工作台数据', 'Tokens & activity'],
    ['knowledge', '03', '知识库图谱', "What I've learned"],
    ['blog', '04', '思考与写作', "What I've been thinking"],
    ['reading', '05', '阅读', "What I've been reading"],
  ];
  return (
    <section className="hero-photo" id="top" data-screen-label="Hero">
      <div className="container hero-grid">
        <div className="hero-text">
          <div className="mono kicker">AI 时代的思考与足迹</div>
          <h1 className="hero-title">把产品判断，<br />变成能跑起来的东西。</h1>
          <p className="hero-sub">
            我是司豪杰 Rick Si——3 年滴滴出行国际化安全与体验治理产品经理，主导的司机安全产品让安全感知指数提升
            19pp、历史首次反超 Uber。背包拉美半年后，转型 AI 产品经理：读源码、建工具、写思考、养知识库——这个工作台就是转型的证据。
          </p>
        </div>
        <GlassSection variant="index">
          <div className="mono index-label">INDEX · 目录</div>
          <div className="index-list">
            {index.map(([id, no, t, s]) => (
              <a
                key={id}
                href={`#${id}`}
                className="index-item"
                onClick={() => onNavigate && onNavigate(id)}
              >
                <span className="index-no">{no}</span>
                <span className="index-t">{t}</span>
                <span className="index-s">{s}</span>
              </a>
            ))}
          </div>
        </GlassSection>
      </div>
      <div className="mono hero-credit">云海之上 · 无人机自摄</div>
    </section>
  );
}
