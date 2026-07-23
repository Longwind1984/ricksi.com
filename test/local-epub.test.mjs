import test from 'node:test';
import assert from 'node:assert/strict';
import {
  autoBookSlug,
  makeAutoBook,
  normalizeBookTitle,
  parseEpubMetadata,
} from '../scripts/lib/local-epub.mjs';

test('parses EPUB metadata and decodes XML entities', () => {
  const metadata = parseEpubMetadata(`<?xml version="1.0"?>
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:identifier>urn:uuid:test</dc:identifier>
      <dc:title>AI &amp; Commerce</dc:title>
      <dc:creator>Rick&#39;s GPT</dc:creator>
      <dc:date>2026-07-23</dc:date>
    </metadata>`);
  assert.deepEqual(metadata, {
    title: 'AI & Commerce',
    author: "Rick's GPT",
    identifier: 'urn:uuid:test',
    date: '2026-07-23',
  });
});

test('generates stable, URL-safe paths without a manual registry entry', () => {
  assert.equal(autoBookSlug('AI 如何重构 TikTok Shop.epub'), 'ai-tiktok-shop-1e5e375b');
  assert.equal(autoBookSlug('谁替你决定.epub'), 'book-dfdeaaee');
  const book = makeAutoBook({
    sourceFile: 'AI 如何重构 TikTok Shop.epub',
    title: 'AI 如何重构 TikTok Shop',
    author: 'Rick’s GPT-5 High',
  });
  assert.equal(book.id, 'CB_local_ai-tiktok-shop-1e5e375b');
  assert.equal(book.epub, '/assets/books/epub/ai-tiktok-shop-1e5e375b.epub');
  assert.equal(book.cover, '/assets/books/epub-covers/ai-tiktok-shop-1e5e375b.png');
});

test('normalizes equivalent title forms for duplicate detection', () => {
  assert.equal(normalizeBookTitle('  AI  如何重构 TikTok Shop  '), normalizeBookTitle('AI 如何重构 TikTok Shop'));
  assert.equal(normalizeBookTitle('Rick’s Book'), normalizeBookTitle("Rick's Book"));
});
