import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pagePath = new URL('../src/pages/blog/li-auto-safety-alignment/index.astro', import.meta.url);
const postPath = new URL('../content/posts/li-auto-safety-alignment.md', import.meta.url);
const routePath = new URL('../src/pages/blog/[...slug].astro', import.meta.url);
const schemaPath = new URL('../src/content.config.ts', import.meta.url);
const sharePath = new URL('../src/pages/share/blog/[...slug].jpg.ts', import.meta.url);

test('publishes the interactive report as a standalone writing entry', async () => {
  const [page, post, route, schema, share] = await Promise.all([
    readFile(pagePath, 'utf8'),
    readFile(postPath, 'utf8'),
    readFile(routePath, 'utf8'),
    readFile(schemaPath, 'utf8'),
    readFile(sharePath, 'utf8'),
  ]);

  assert.match(post, /standalone:\s*true/);
  assert.match(post, /draft:\s*false/);
  assert.match(schema, /standalone:\s*z\.boolean\(\)\.default\(false\)/);
  assert.match(schema, /wordCount:\s*z\.number\(\)\.int\(\)\.positive\(\)\.optional\(\)/);
  assert.match(schema, /readMinutes:\s*z\.number\(\)\.int\(\)\.positive\(\)\.optional\(\)/);
  assert.match(post, /wordCount:\s*24000/);
  assert.match(post, /readMinutes:\s*40/);
  assert.match(share, /post\.data\.wordCount\s*\?\?/);
  assert.match(share, /post\.data\.readMinutes\s*\?\?/);
  assert.match(route, /!data\.draft\s*&&\s*!data\.standalone/);

  assert.match(page, /<style is:global>/);
  assert.match(page, /<script is:inline>/);
  assert.match(page, /href="\/blog\/">← 思考与写作/);
  assert.match(page, /司豪杰 Rick Si/);
  assert.match(page, /重点部分速读约 8 分钟/);
  assert.match(page, /期待加入理想汽车，探索智能边界，也为智能构建边界。/);
  assert.match(page, /https:\/\/ricksi\.com\/blog\/li-auto-safety-alignment\//);
  assert.doesNotMatch(page, /class="fast-path"/);
  assert.doesNotMatch(page, /<script[^>]+src=/i);
  assert.doesNotMatch(page, /<link[^>]+rel="stylesheet"/i);
});
