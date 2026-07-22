// 静态社交图持久化增量缓存：路由只负责命中/生成并写 journal；
// scripts/build.mjs 在 Astro 成功退出后唯一地汇总、清理并发布 manifest。
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const SOCIAL_IMAGE_MANIFEST_VERSION = 1;
export const SOCIAL_IMAGE_DEFAULT_BOOTSTRAP_URL = 'https://ricksi.com/social-image-cache-manifest.json';
export const SOCIAL_IMAGE_DEFAULT_FALLBACK_ORIGIN = 'https://ricksi-com.vercel.app';
const REMOTE_TIMEOUT_MS = 5_000;
const REMOTE_CONCURRENCY = 8;
const REMOTE_PREFETCH_CONCURRENCY = 8;
const REMOTE_PREFETCH_TIMEOUT_MS = 10_000;
const REMOTE_MAX_CONSECUTIVE_FAILURES = 3;
const REMOTE_MAX_FAILURES = 5;
const IS_VERCEL = Boolean(process.env.VERCEL);
const BUILD_ID = process.env.SOCIAL_IMAGE_BUILD_ID || '';
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export function socialImageCachePaths(buildId = BUILD_ID) {
  const cacheDir = path.resolve(process.env.SOCIAL_IMAGE_CACHE_DIR || '.astro/social-image-cache');
  return {
    cacheDir,
    objectDir: path.join(cacheDir, 'objects'),
    localManifest: path.join(cacheDir, 'manifest.json'),
    journal: buildId ? path.join(cacheDir, 'runs', `${buildId}.jsonl`) : '',
    remoteManifest: buildId ? path.join(cacheDir, 'runs', `${buildId}.remote.json`) : '',
    publicManifest: path.resolve('dist/social-image-cache-manifest.json'),
  };
}

function canonical(value) {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value).filter((key) => value[key] !== undefined).sort().map((key) => [key, canonical(value[key])]));
}
export function readSocialImageManifest(file) {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    return value?.version === SOCIAL_IMAGE_MANIFEST_VERSION && value.entries && typeof value.entries === 'object' ? value : null;
  } catch { return null; }
}
export function writeSocialImageManifest(file, entries) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const payload = JSON.stringify({
    version: SOCIAL_IMAGE_MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    entries: Object.fromEntries([...entries].sort(([a], [b]) => a.localeCompare(b))),
  }, null, 2) + '\n';
  const temporary = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, payload);
  fs.renameSync(temporary, file);
}

class Semaphore {
  constructor(limit) { this.limit = limit; this.active = 0; this.waiters = []; }
  async run(fn) {
    if (this.active >= this.limit) await new Promise((resolve) => this.waiters.push(resolve));
    this.active += 1;
    try { return await fn(); } finally { this.active -= 1; this.waiters.shift()?.(); }
  }
}

// Vite 可能把 helper 分进多个 route bundle；Symbol.for 保证同一 JS realm 仍共用远端
// promise / 熔断器 / 文件哈希缓存。跨 realm/process 的最终一致性由 journal + build wrapper 保证。
const STATE_KEY = Symbol.for('rick.socialImageCache.v1');
const state = globalThis[STATE_KEY] ??= {
  localEntries: null,
  assetHashes: new Map(),
  templateHashes: new Map(),
  remotePromise: null,
  remoteSlots: new Semaphore(REMOTE_CONCURRENCY),
  remoteFailures: 0,
  consecutiveRemoteFailures: 0,
  remoteDisabled: false,
  remoteDisabledRecorded: false,
  tempSequence: 0,
};

const paths = socialImageCachePaths();
if (!state.localEntries) {
  const local = readSocialImageManifest(paths.localManifest);
  state.localEntries = new Map(local ? Object.entries(local.entries) : []);
}
function record(event) {
  if (!BUILD_ID || !paths.journal) return;
  fs.mkdirSync(path.dirname(paths.journal), { recursive: true });
  fs.appendFileSync(paths.journal, `${JSON.stringify(event)}\n`);
}
function hashFiles(files, memo) {
  const resolved = files.map((file) => path.resolve(file));
  const memoKey = resolved.join('\0');
  if (memo.has(memoKey)) return memo.get(memoKey);
  const hash = crypto.createHash('sha256');
  for (const file of resolved) {
    hash.update(path.relative(process.cwd(), file)); hash.update('\0');
    hash.update(fs.readFileSync(file)); hash.update('\0');
  }
  const digest = hash.digest('hex'); memo.set(memoKey, digest); return digest;
}
function bootstrapUrl() {
  const configured = process.env.SOCIAL_IMAGE_BOOTSTRAP_URL;
  if (configured?.toLowerCase() === 'off') return null;
  try {
    const url = new URL(configured || SOCIAL_IMAGE_DEFAULT_BOOTSTRAP_URL);
    return ['http:', 'https:'].includes(url.protocol) ? url : null;
  } catch { return null; }
}
function fallbackOrigin() {
  try {
    const url = new URL(process.env.SOCIAL_IMAGE_FALLBACK_ORIGIN || SOCIAL_IMAGE_DEFAULT_FALLBACK_ORIGIN);
    return ['http:', 'https:'].includes(url.protocol) ? url : null;
  } catch { return null; }
}
async function fetchOnce(url) {
  return state.remoteSlots.run(() => fetch(url, {
    signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS),
    headers: { accept: 'application/json,image/*' },
  }));
}
function disableRemote(reason) {
  state.remoteDisabled = true;
  if (!state.remoteDisabledRecorded) {
    state.remoteDisabledRecorded = true;
    record({ type: 'remote-disabled', reason });
  }
}
function remoteFailure(reason) {
  state.remoteFailures += 1;
  state.consecutiveRemoteFailures += 1;
  record({ type: 'remote-failure', reason });
  if (state.consecutiveRemoteFailures >= REMOTE_MAX_CONSECUTIVE_FAILURES || state.remoteFailures >= REMOTE_MAX_FAILURES) {
    disableRemote('circuit-breaker');
  }
}
async function getRemoteManifest() {
  if (!BUILD_ID || state.remoteDisabled) return null;
  if (state.remotePromise) return state.remotePromise;
  state.remotePromise = (async () => {
    const url = bootstrapUrl();
    if (!url) return null;
    try {
      const response = await fetchOnce(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json();
      if (manifest?.version !== SOCIAL_IMAGE_MANIFEST_VERSION || !manifest.entries) throw new Error('manifest 格式不兼容');
      fs.mkdirSync(path.dirname(paths.remoteManifest), { recursive: true });
      fs.writeFileSync(paths.remoteManifest, JSON.stringify(manifest));
      state.consecutiveRemoteFailures = 0;
      return { manifest, url };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      disableRemote(`manifest: ${reason}`);
      console.warn(`[social-image-cache] bootstrap unavailable (${reason}); falling back to local render`);
      return null;
    }
  })();
  return state.remotePromise;
}

const extensionFor = (mediaType) => mediaType === 'image/jpeg' ? 'jpg' : 'png';
const objectPath = (entry) => path.join(paths.cacheDir, entry.file);
const bufferMatches = (buffer, entry) => buffer.length === entry.bytes && sha256(buffer) === entry.digest;
async function readKnownLocal(entry) {
  if (!entry?.file) return null;
  try { const buffer = await fs.promises.readFile(objectPath(entry)); return bufferMatches(buffer, entry) ? buffer : null; } catch { return null; }
}
async function readContentAddressed(expected) {
  try {
    const buffer = await fs.promises.readFile(objectPath(expected));
    return { buffer, entry: { ...expected, digest: sha256(buffer), bytes: buffer.length } };
  } catch { return null; }
}
async function writeObject(entry, buffer) {
  await fs.promises.mkdir(paths.objectDir, { recursive: true });
  const target = objectPath(entry); const temporary = `${target}.tmp-${process.pid}-${state.tempSequence++}`;
  await fs.promises.writeFile(temporary, buffer);
  try { await fs.promises.rename(temporary, target); }
  catch (error) { await fs.promises.unlink(temporary).catch(() => {}); if (!fs.existsSync(target)) throw error; }
}

// Clean CI workspaces must not fetch one image per Astro route: Astro expands the
// routes mostly sequentially, so network latency would still scale with N even
// when every image is reusable. Restore the previous deployment concurrently
// before Astro starts, then let route handlers use the normal local-cache path.
export async function prefetchSocialImageCache({ buildId = BUILD_ID } = {}) {
  if (IS_VERCEL) return { attempted: false, reason: 'vercel', local: 0, fetched: 0, failed: 0, total: 0, durationMs: 0 };
  const targetPaths = socialImageCachePaths(buildId);
  const previous = readSocialImageManifest(targetPaths.localManifest);
  if (previous) {
    const localEntries = Object.values(previous.entries);
    const complete = localEntries.length > 0 && localEntries.every((entry) => {
      try { return fs.statSync(objectPath(entry)).size === entry.bytes; } catch { return false; }
    });
    if (complete) {
      return { attempted: false, reason: 'local-complete', local: localEntries.length, fetched: 0, failed: 0, total: localEntries.length, durationMs: 0 };
    }
  }
  const url = bootstrapUrl();
  if (!url) return { attempted: false, reason: 'disabled', local: 0, fetched: 0, failed: 0, total: 0, durationMs: 0 };
  const startedAt = Date.now();
  let manifest;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    manifest = await response.json();
    if (manifest?.version !== SOCIAL_IMAGE_MANIFEST_VERSION || !manifest.entries || typeof manifest.entries !== 'object') {
      throw new Error('manifest 格式不兼容');
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`[social-image-cache] prefetch unavailable (${reason}); falling back to local render`);
    return { attempted: true, reason, local: 0, fetched: 0, failed: 0, total: 0, durationMs: Date.now() - startedAt };
  }

  const ready = new Map();
  const pending = [];
  for (const [route, entry] of Object.entries(manifest.entries)) {
    const local = previous?.entries?.[route];
    let reusable = false;
    if (local?.cacheKey === entry.cacheKey && local.digest === entry.digest && local.bytes === entry.bytes && local.file === entry.file) {
      try { reusable = fs.statSync(objectPath(local)).size === local.bytes; } catch { reusable = false; }
    }
    if (reusable) ready.set(route, local);
    else pending.push([route, entry]);
  }

  let cursor = 0;
  let fetched = 0;
  let fallback = 0;
  let failed = 0;
  const secondary = fallbackOrigin();
  const fetchImage = async (source, route, entry) => {
    const response = await fetch(new URL(route, source), {
      signal: AbortSignal.timeout(REMOTE_PREFETCH_TIMEOUT_MS),
      headers: { accept: 'image/*' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!bufferMatches(buffer, entry)) throw new Error('digest mismatch');
    return buffer;
  };
  const workers = Array.from({ length: Math.min(REMOTE_PREFETCH_CONCURRENCY, pending.length) }, async () => {
    while (cursor < pending.length) {
      const [route, entry] = pending[cursor++];
      try {
        let buffer;
        try { buffer = await fetchImage(url, route, entry); }
        catch (primaryError) {
          if (!secondary || secondary.origin === url.origin) throw primaryError;
          buffer = await fetchImage(secondary, route, entry);
          fallback += 1;
        }
        await writeObject(entry, buffer);
        ready.set(route, entry);
        fetched += 1;
      } catch {
        // One bounded request per URL. Failed entries are rendered locally by
        // the child build; do not retry the same remote URL in route handlers.
        failed += 1;
      }
    }
  });
  await Promise.all(workers);
  writeSocialImageManifest(targetPaths.localManifest, ready);
  if (targetPaths.remoteManifest) {
    fs.mkdirSync(path.dirname(targetPaths.remoteManifest), { recursive: true });
    fs.writeFileSync(targetPaths.remoteManifest, JSON.stringify(manifest));
  }
  return {
    attempted: true,
    reason: null,
    local: ready.size - fetched,
    fetched,
    fallback,
    failed,
    total: Object.keys(manifest.entries).length,
    durationMs: Date.now() - startedAt,
  };
}
async function readRemote(route, expected) {
  if (state.remoteDisabled) return null;
  const remote = await getRemoteManifest(); const entry = remote?.manifest?.entries?.[route];
  if (!entry || entry.cacheKey !== expected.cacheKey || !entry.digest || !entry.bytes || state.remoteDisabled) return null;
  try {
    const response = await fetchOnce(new URL(route, remote.url));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!bufferMatches(buffer, entry)) throw new Error('digest mismatch');
    state.consecutiveRemoteFailures = 0;
    return { buffer, entry: { ...expected, digest: entry.digest, bytes: entry.bytes } };
  } catch (error) {
    remoteFailure(error instanceof Error ? error.message : String(error));
    return null;
  }
}

export async function cachedSocialImage({ route, mediaType, templateVersion, templateFiles, assetFiles, input, render }) {
  if (IS_VERCEL) return Buffer.from(await render());
  if (!route.startsWith('/og/') && !route.startsWith('/share/')) throw new Error(`Invalid social image route: ${route}`);
  const contentHash = sha256(JSON.stringify(canonical(input)));
  const templateHash = sha256(`${templateVersion}\0${hashFiles(templateFiles, state.templateHashes)}`);
  const assetHash = hashFiles(assetFiles, state.assetHashes);
  const cacheKey = sha256(`${templateHash}\0${contentHash}\0${assetHash}\0${mediaType}`);
  const expected = { route, mediaType, cacheKey, contentHash, templateVersion, templateHash, assetHash, file: `objects/${cacheKey}.${extensionFor(mediaType)}` };
  const local = state.localEntries.get(route);
  if (local?.cacheKey === cacheKey) {
    const buffer = await readKnownLocal(local);
    if (buffer) { record({ type: 'image', status: 'local', route, entry: local }); return buffer; }
  }
  // 上次构建若中断在 manifest 发布前，原子写完的内容寻址对象仍可直接复用。
  const orphan = await readContentAddressed(expected);
  if (orphan) { record({ type: 'image', status: 'local', route, entry: orphan.entry }); return orphan.buffer; }
  const remote = await readRemote(route, expected);
  if (remote) {
    await writeObject(remote.entry, remote.buffer);
    record({ type: 'image', status: 'remote', route, entry: remote.entry });
    return remote.buffer;
  }
  const buffer = Buffer.from(await render());
  const entry = { ...expected, digest: sha256(buffer), bytes: buffer.length };
  await writeObject(entry, buffer);
  record({ type: 'image', status: 'generated', route, entry });
  return buffer;
}
