// 移植自 galaxy-view src/layout/WorkerForceLayout.ts —— 剥 TS 类型；
// 关键改造：原版用 esbuild 的 `worker:./forceWorker.ts` import 拿 source string + Blob URL，
// 这里改 Vite 原生 ES module worker：new Worker(new URL('./forceWorker.js', import.meta.url), {type:'module'})。
// Vite 会把 forceWorker.js 及其 d3-force-3d 依赖打成独立 worker chunk，主 chunk 不含 d3。
//
// LayoutEngine 接口（见 galaxy LayoutEngine.ts）：
//   positions: Float32Array（原地写，渲染器直接读）
//   ticks, init(data, positions, params, initialAlpha), step(): boolean,
//   isSettled(), reheat(alpha), updateParams(params), dispose()

export class WorkerForceLayout {
  constructor() {
    this.positions = new Float32Array(0);
    this.worker = null;
    this.dirty = false;
    this.settled = true;
    this._ticks = 0;
  }

  get ticks() {
    return this._ticks;
  }

  init(data, positions, params, initialAlpha = 1) {
    this.disposeWorker();
    this.positions = positions;
    this._ticks = 0;
    this.dirty = false;

    this.worker = new Worker(new URL('./forceWorker.js', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e) => {
      const m = e.data;
      if (m.type !== 'tick') return;
      const incoming = new Float32Array(m.buffer);
      this.positions.set(incoming.subarray(0, this.positions.length));
      this._ticks = m.ticks;
      this.settled = m.settled;
      this.dirty = true;
      // 归还 buffer（transferable 乒乓）
      this.worker?.postMessage({ type: 'buffer', buffer: m.buffer }, [m.buffer]);
    };

    const n = data.nodes.length;
    const posCopy = new Float32Array(positions); // worker 持有自己的副本
    const linkIdx = new Uint32Array(data.links.length * 2);
    data.links.forEach((l, i) => {
      linkIdx[i * 2] = l.source;
      linkIdx[i * 2 + 1] = l.target;
    });
    const degrees = new Float32Array(n);
    data.nodes.forEach((node, i) => (degrees[i] = Math.max(node.degree, 1)));
    const bufA = new ArrayBuffer(n * 3 * 4);
    const bufB = new ArrayBuffer(n * 3 * 4);

    this.settled = initialAlpha < 0.001;
    this.worker.postMessage(
      {
        type: 'init',
        count: n,
        positions: posCopy.buffer,
        links: linkIdx.buffer,
        degrees: degrees.buffer,
        params,
        initialAlpha,
        bufA,
        bufB,
      },
      [posCopy.buffer, linkIdx.buffer, degrees.buffer, bufA, bufB],
    );
  }

  /** 返回「本帧坐标有更新」——调用方据此刷新渲染缓冲 */
  step() {
    const had = this.dirty;
    this.dirty = false;
    return had;
  }

  isSettled() {
    return this.settled;
  }

  reheat(alpha = 0.3) {
    this.settled = false;
    this.worker?.postMessage({ type: 'reheat', alpha });
  }

  updateParams(params) {
    this.settled = false;
    this.worker?.postMessage({ type: 'params', params });
  }

  disposeWorker() {
    this.worker?.terminate();
    this.worker = null;
  }

  dispose() {
    this.disposeWorker();
    this.settled = true;
    this.dirty = false;
  }
}
