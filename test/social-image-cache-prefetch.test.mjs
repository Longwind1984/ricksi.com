import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const digest = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

test('prefetch restores reusable images concurrently and requests each route once', async (t) => {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'social-prefetch-'));
  t.after(() => fs.rmSync(cacheDir, { recursive: true, force: true }));
  const images = new Map([
    ['/og/a.png', Buffer.from('png-a')],
    ['/share/b.jpg', Buffer.from('jpg-b')],
    ['/share/fails.jpg', Buffer.from('never-returned')],
  ]);
  const entries = Object.fromEntries([...images].map(([route, buffer]) => {
    const cacheKey = digest(Buffer.from(`key:${route}`));
    return [route, {
      route,
      mediaType: route.endsWith('.jpg') ? 'image/jpeg' : 'image/png',
      cacheKey,
      digest: digest(buffer),
      bytes: buffer.length,
      file: `objects/${cacheKey}.${route.endsWith('.jpg') ? 'jpg' : 'png'}`,
    }];
  }));
  const requests = new Map();
  const server = http.createServer((request, response) => {
    requests.set(request.url, (requests.get(request.url) || 0) + 1);
    if (request.url === '/manifest.json') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ version: 1, entries }));
    } else if (request.url === '/share/fails.jpg') {
      response.statusCode = 503;
      response.end('no');
    } else if (images.has(request.url)) {
      response.end(images.get(request.url));
    } else {
      response.statusCode = 404;
      response.end('missing');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  process.env.SOCIAL_IMAGE_CACHE_DIR = cacheDir;
  process.env.SOCIAL_IMAGE_BOOTSTRAP_URL = `http://127.0.0.1:${address.port}/manifest.json`;
  t.after(() => {
    delete process.env.SOCIAL_IMAGE_CACHE_DIR;
    delete process.env.SOCIAL_IMAGE_BOOTSTRAP_URL;
  });

  const cache = await import(`../src/lib/social-image-cache.mjs?prefetch-test=${Date.now()}`);
  const result = await cache.prefetchSocialImageCache({ buildId: 'test-build' });
  assert.deepEqual({ fetched: result.fetched, failed: result.failed, total: result.total }, { fetched: 2, failed: 1, total: 3 });
  assert.equal(requests.get('/manifest.json'), 1);
  assert.equal(requests.get('/og/a.png'), 1);
  assert.equal(requests.get('/share/b.jpg'), 1);
  assert.equal(requests.get('/share/fails.jpg'), 1);
  const manifest = cache.readSocialImageManifest(path.join(cacheDir, 'manifest.json'));
  assert.deepEqual(Object.keys(manifest.entries).sort(), ['/og/a.png', '/share/b.jpg']);
  for (const route of Object.keys(manifest.entries)) {
    const entry = manifest.entries[route];
    assert.deepEqual(fs.readFileSync(path.join(cacheDir, entry.file)), images.get(route));
  }
});
