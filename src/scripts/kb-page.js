// 知识库页面图谱挂载：/kb/（全图）与 /kb/<slug>/（局部图）共用
import { renderGraph } from './graph-view.js';

const dataEl = document.getElementById('kb-graph-data');
const host = document.getElementById('kb-graph');
if (dataEl && host) {
  try {
    const { graph, focus, mode } = JSON.parse(dataEl.textContent);
    if (graph?.nodes?.length) {
      renderGraph(host, graph, { mode: mode || 'full', focusSlug: focus || undefined });
    }
  } catch (e) {
    console.error('kb graph init failed:', e);
  }
}
