// 图谱作用域过滤：AI 知识库（仅 full 节点）vs 全部个人知识库（full + stub）。
// 两种视图共享同一份 graph.json（含 1127 节点）；按 tier 切子图并重建边下标。
// 同构供构建期（index.astro 首页 teaser 只取 AI）与运行期（graph-explore 切换）使用。
//
// 隐私保证由数据层保证（stub 节点本就无 slug/无正文），此处只做可见性子集，
// 不、也无法泄漏 stub 正文——stub 节点字段里压根没有正文。

/**
 * @param {{nodes:any[],edges:[number,number][],clusters:any[],stats:any}} graph 全量图（full+stub）
 * @param {'ai'|'all'} scope 'ai'=仅 full 节点；'all'=全部
 * @returns 子图（边下标已重建，stats.notes/links 已按子集更新）
 */
export function scopedGraph(graph, scope = 'ai') {
  // graph.stats 原始口径是「半 AI 半全量」（notes=AI 598 但 links=全量含 stub 边）。
  // 两种作用域都重算 notes/links/domains 使其自洽。
  if (scope === 'all') {
    return {
      ...graph,
      stats: { ...graph.stats, notes: graph.nodes.length, links: graph.edges.length, domains: graph.clusters.length },
    };
  }
  const keep = graph.nodes.map((n) => n.tier !== 'stub');
  const idMap = new Array(graph.nodes.length).fill(-1);
  const nodes = [];
  graph.nodes.forEach((n, i) => {
    if (keep[i]) {
      idMap[i] = nodes.length;
      nodes.push({ ...n, id: nodes.length });
    }
  });
  const edges = graph.edges
    .filter(([a, b]) => keep[a] && keep[b])
    .map(([a, b]) => [idMap[a], idMap[b]]);
  const clusters = graph.clusters.filter((c) => c.tier !== 'stub');
  return {
    nodes,
    edges,
    clusters,
    stats: { ...graph.stats, notes: nodes.length, links: edges.length, domains: clusters.length },
  };
}
