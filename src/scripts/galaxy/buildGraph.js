// 移植自 galaxy-view src/data/buildGraph.ts —— 剥 TS 类型，去掉 Obsidian FileRecord/LinkTable 语义。
// 本站不走 vault 快照，而是把已成形的 data/graph.json（index 边表）适配成 galaxy GraphData。
//
// galaxy GraphData 形状：
//   nodes: [{ id, name, cluster, slug, title, degree, inDegree, outDegree, fileSize, unresolved, created }]
//   links: [{ source, target }]   ← 数字下标，渲染器按索引 gather 坐标
//
// 本站 graph.json 形状：
//   nodes: [{ id:number, title, slug, cluster:number, deg:number, created }]
//   edges: [[a, b], ...]          ← a/b 是 nodes 数组下标
//   clusters: [{ id, name, count }]

/**
 * 把本站 data/graph.json 适配为 galaxy 渲染器吃的 GraphData。
 * @param {{ nodes: any[], edges: [number, number][] }} graph
 * @returns {{ nodes: any[], links: {source:number,target:number}[] }}
 */
export function buildGraphFromSiteJson(graph) {
  const nodes = graph.nodes.map((n, i) => ({
    // 渲染器 / 拾取需要的字段
    id: i, // galaxy 内部按数组下标引用；保留原 n.id 到 origId
    origId: n.id,
    name: n.title, // galaxy 标签字段叫 name
    title: n.title, // 站点面板用 title
    slug: n.slug, // 深链 / nodeBySlug 用
    cluster: n.cluster, // 着色用（clusterColorFn）
    created: n.created,
    degree: typeof n.deg === 'number' ? n.deg : 0, // galaxy 尺寸/锚定按 degree
    inDegree: 0,
    outDegree: 0,
    fileSize: 0, // 本站无字节信息；sizeMode='degree' 时不读
    unresolved: false, // 本站无未解析幽灵
  }));

  const links = [];
  for (const e of graph.edges) {
    const s = e[0];
    const t = e[1];
    if (typeof s !== 'number' || typeof t !== 'number') continue;
    if (s < 0 || t < 0 || s >= nodes.length || t >= nodes.length) continue;
    links.push({ source: s, target: t });
    // 度数按边重算（与 graph.json 的 deg 可能不同口径：deg 含外部统计，这里是图内度数）
    nodes[s].outDegree++;
    nodes[t].inDegree++;
  }
  // galaxy degree = 出+入；若 graph.json 已带 deg 则尊重之，否则用图内度数
  for (const n of nodes) {
    if (!n.degree) n.degree = n.inDegree + n.outDegree;
  }
  return { nodes, links };
}

// ----------------------------------------------------------------------------
// 以下为 galaxy 原版 buildGraph（Obsidian 解析路径），去 obsidian 化保留备用，
// 本站 spike 不调用。FileRecord/LinkTable 为纯记录，零依赖。
// ----------------------------------------------------------------------------

function topFolder(path) {
  const idx = path.indexOf('/');
  return idx === -1 ? '' : path.slice(0, idx);
}

/**
 * vault 快照 → 图模型（galaxy 原算法，剥类型）。
 * @param {{path:string,basename:string,size?:number}[]} files
 * @param {Record<string,Record<string,number>>} resolvedLinks
 * @param {Record<string,Record<string,number>>} unresolvedLinks
 * @param {{includeUnresolved:boolean,includeOrphans:boolean,nodeCap?:number|null,linkCap?:number|null}} opts
 */
export function buildGraph(files, resolvedLinks, unresolvedLinks, opts) {
  const nodes = [];
  const indexById = new Map();

  for (const f of files) {
    indexById.set(f.path, nodes.length);
    nodes.push({
      id: f.path,
      name: f.basename,
      folderTop: topFolder(f.path),
      degree: 0,
      inDegree: 0,
      outDegree: 0,
      fileSize: f.size ?? 0,
      unresolved: false,
    });
  }

  const links = [];
  const addLink = (si, ti) => {
    links.push({ source: si, target: ti });
    const s = nodes[si];
    const t = nodes[ti];
    if (s) {
      s.degree++;
      s.outDegree++;
    }
    if (t) {
      t.degree++;
      t.inDegree++;
    }
  };

  for (const src of Object.keys(resolvedLinks)) {
    const si = indexById.get(src);
    if (si === undefined) continue;
    const targets = resolvedLinks[src] ?? {};
    for (const dst of Object.keys(targets)) {
      const ti = indexById.get(dst);
      if (ti === undefined) continue;
      addLink(si, ti);
    }
  }

  if (opts.includeUnresolved) {
    for (const src of Object.keys(unresolvedLinks)) {
      const si = indexById.get(src);
      if (si === undefined) continue;
      const targets = unresolvedLinks[src] ?? {};
      for (const name of Object.keys(targets)) {
        const ghostId = `unresolved:${name}`;
        let gi = indexById.get(ghostId);
        if (gi === undefined) {
          gi = nodes.length;
          indexById.set(ghostId, gi);
          nodes.push({
            id: ghostId,
            name,
            folderTop: '__unresolved__',
            degree: 0,
            inDegree: 0,
            outDegree: 0,
            fileSize: 0,
            unresolved: true,
          });
        }
        addLink(si, gi);
      }
    }
  }

  let result = { nodes, links };
  if (!opts.includeOrphans) {
    result = filterNodes(result, (n) => n.degree > 0);
  }
  const nodeCap = opts.nodeCap ?? null;
  if (nodeCap !== null && result.nodes.length > nodeCap) {
    const ranked = [...result.nodes.entries()].sort((a, b) => b[1].degree - a[1].degree || a[0] - b[0]);
    const keepIdx = new Set(ranked.slice(0, nodeCap).map(([i]) => i));
    result = filterNodes(result, (_n, i) => keepIdx.has(i));
  }
  const linkCap = opts.linkCap ?? null;
  if (linkCap !== null && result.links.length > linkCap) {
    const deg = (i) => result.nodes[i]?.degree ?? 0;
    result = {
      nodes: result.nodes,
      links: [...result.links.entries()]
        .sort(
          (a, b) =>
            Math.min(deg(b[1].source), deg(b[1].target)) - Math.min(deg(a[1].source), deg(a[1].target)) || a[0] - b[0],
        )
        .slice(0, linkCap)
        .map(([, l]) => l),
    };
  }
  return result;
}

function filterNodes(g, keep) {
  const remap = new Map();
  const kept = [];
  g.nodes.forEach((n, i) => {
    if (keep(n, i)) {
      remap.set(i, kept.length);
      kept.push(n);
    }
  });
  const links = [];
  for (const l of g.links) {
    const s2 = remap.get(l.source);
    const t2 = remap.get(l.target);
    if (s2 !== undefined && t2 !== undefined) links.push({ source: s2, target: t2 });
  }
  return { nodes: kept, links };
}
