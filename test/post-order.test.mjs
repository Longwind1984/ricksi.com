import test from 'node:test';
import assert from 'node:assert/strict';
import { newestPostFirst, postOrderTime } from '../src/lib/post-order.mjs';

const post = (id, date, uploadedAt) => ({
  id,
  data: {
    date: new Date(date),
    ...(uploadedAt ? { uploadedAt: new Date(uploadedAt) } : {}),
  },
});

test('uses the original date when uploadedAt is absent', () => {
  const item = post('existing', '2026-06-12');
  assert.equal(postOrderTime(item), new Date('2026-06-12').valueOf());
});

test('puts newly uploaded archive posts ahead of newer original publication dates', () => {
  const posts = [
    post('existing', '2026-06-12'),
    post('colombia', '2026-04-07', '2026-07-28T16:40:00+08:00'),
    post('honduras', '2026-02-17', '2026-07-28T16:50:00+08:00'),
  ].sort(newestPostFirst);

  assert.deepEqual(posts.map(({ id }) => id), ['honduras', 'colombia', 'existing']);
});

test('uses original date and id as deterministic tie breakers', () => {
  const uploadedAt = '2026-07-28T16:50:00+08:00';
  const posts = [
    post('beta', '2026-02-17', uploadedAt),
    post('alpha', '2026-02-17', uploadedAt),
    post('newer-original', '2026-04-07', uploadedAt),
  ].sort(newestPostFirst);

  assert.deepEqual(posts.map(({ id }) => id), ['newer-original', 'alpha', 'beta']);
});
