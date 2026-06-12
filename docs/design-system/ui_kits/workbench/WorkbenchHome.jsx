import React from 'react';
import { NavBar } from '../../components/glass/NavBar.jsx';
import { SiteFooter } from '../../components/glass/SiteFooter.jsx';
import { WorkbenchHero } from './WorkbenchHero.jsx';
import { WorkbenchProjects } from './WorkbenchProjects.jsx';
import { WorkbenchData } from './WorkbenchData.jsx';
import { WorkbenchKnowledge } from './WorkbenchKnowledge.jsx';
import { WorkbenchWriting, WorkbenchReading } from './WorkbenchWriting.jsx';

/* ricksi.com homepage recreation — Liquid Glass over the fixed snow-mountain photo.
   Scrollspy drives the nav's liquid pill; sections are the real five. */
export function WorkbenchHome() {
  const [active, setActive] = React.useState('projects');
  const [overHero, setOverHero] = React.useState(true);

  React.useEffect(() => {
    const ids = ['projects', 'workbench', 'knowledge', 'blog', 'reading'];
    const onScroll = () => {
      setOverHero(window.scrollY < window.innerHeight * 0.55);
      let cur = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) cur = id;
      }
      setActive(cur);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="page">
      <NavBar active={active} overHero={overHero} ctaHref="https://ricksi.com/assets/rick-si-resume.pdf" />
      <main>
        <WorkbenchHero />
        <div className="container">
          <WorkbenchProjects />
          <WorkbenchData />
          <WorkbenchKnowledge />
          <WorkbenchWriting />
          <WorkbenchReading />
        </div>
      </main>
      <SiteFooter ctaHref="https://ricksi.com/assets/rick-si-resume.pdf" />
    </div>
  );
}
