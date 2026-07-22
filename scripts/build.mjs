// Astro 构建包装器：为社交图缓存建立单次 journal，并在成功后唯一地发布 manifest。
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  readSocialImageManifest,
  socialImageCachePaths,
  writeSocialImageManifest,
} from '../src/lib/social-image-cache.mjs';

const buildId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
const paths = socialImageCachePaths(buildId);
fs.mkdirSync(path.dirname(paths.journal), { recursive: true });
fs.writeFileSync(paths.journal, '');

const astro = path.resolve('node_modules/astro/astro.js');
const child = spawn(process.execPath, [astro, 'build'], {
  stdio: 'inherit',
  env: { ...process.env, SOCIAL_IMAGE_BUILD_ID: buildId },
});
const exitCode = await new Promise((resolve) => {
  child.once('error', () => resolve(1));
  child.once('exit', (code, signal) => resolve(signal ? 1 : (code ?? 1)));
});
if (exitCode !== 0 || process.env.VERCEL) process.exit(exitCode);

const events = fs.readFileSync(paths.journal, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
const currentEntries = new Map();
const counts = { generated: 0, local: 0, remote: 0, remoteFailed: 0, remoteDisabled: false };
for (const event of events) {
  if (event.type === 'image') {
    currentEntries.set(event.route, event.entry);
    if (event.status === 'generated') counts.generated += 1;
    if (event.status === 'local') counts.local += 1;
    if (event.status === 'remote') counts.remote += 1;
  } else if (event.type === 'remote-failure') counts.remoteFailed += 1;
  else if (event.type === 'remote-disabled') counts.remoteDisabled = true;
}
const priorEntries = new Map();
for (const manifest of [readSocialImageManifest(paths.localManifest), readSocialImageManifest(paths.remoteManifest)]) {
  if (manifest) for (const [route, entry] of Object.entries(manifest.entries)) if (!priorEntries.has(route)) priorEntries.set(route, entry);
}
const removed = [...priorEntries.keys()].filter((route) => !currentEntries.has(route)).length;
const keptFiles = new Set([...currentEntries.values()].map((entry) => entry.file));
if (fs.existsSync(paths.objectDir)) for (const name of fs.readdirSync(paths.objectDir)) {
  if (!keptFiles.has(`objects/${name}`) && !name.includes('.tmp-')) fs.unlinkSync(path.join(paths.objectDir, name));
}
writeSocialImageManifest(paths.localManifest, currentEntries);
writeSocialImageManifest(paths.publicManifest, currentEntries);

const reused = counts.local + counts.remote;
const total = counts.generated + reused;
console.log(`[social-image-cache] generated=${counts.generated} reused=${reused} removed=${removed} (local=${counts.local} remote=${counts.remote} remote_failed=${counts.remoteFailed} remote_disabled=${counts.remoteDisabled} total=${total})`);
if (currentEntries.size !== total) {
  console.warn(`[social-image-cache] WARNING: duplicate or missing route events (entries=${currentEntries.size}, events=${total})`);
}
if (priorEntries.size >= 20 && total >= 20 && counts.generated / total >= 0.8) {
  const currentVersions = new Set([...currentEntries.values()].map((entry) => `${entry.templateHash}:${entry.assetHash}`));
  const comparable = [...priorEntries.values()].filter((entry) => currentVersions.has(`${entry.templateHash}:${entry.assetHash}`)).length;
  console.warn(comparable >= 20
    ? '[social-image-cache] WARNING: unexpected near-full redraw with unchanged template/assets; inspect content keys and cache restore'
    : '[social-image-cache] full redraw caused by template/assets version change');
} else if (process.env.CI && priorEntries.size === 0 && counts.generated >= 100) {
  console.warn('[social-image-cache] WARNING: CI performed a cold full redraw; configure cache restore or keep the deployed bootstrap manifest reachable');
}

fs.unlinkSync(paths.journal);
if (fs.existsSync(paths.remoteManifest)) fs.unlinkSync(paths.remoteManifest);
