import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectHomePosts } from '../src/lib/home.js';

const post = (slug, published = true, hasBody = true) => ({ slug, published, hasBody });
test('home picks the approved feature and preserves the chronological order of other posts', () => {
  const posts = [post('draft', false), post('newest'), post('second'), post('feature'), post('fourth'), post('fifth')];
  const result = selectHomePosts(posts, 'feature');
  assert.equal(result.featured.slug, 'feature');
  assert.deepEqual(result.recent.map(item => item.slug), ['newest', 'second', 'fourth']);
  assert.equal(posts.length, 6);
});
test('one published post is not repeated in a fake recent list', () => {
  const result = selectHomePosts([post('only')]);
  assert.equal(result.featured.slug, 'only');
  assert.deepEqual(result.recent, []);
});
test('missing or unpublished preferred posts fall back to the newest published post with a body', () => {
  for (const slug of ['missing', 'draft']) {
    const result = selectHomePosts([post('draft', false), post('empty', true, false), post('newest')], slug);
    assert.equal(result.featured.slug, 'newest');
    assert.deepEqual(result.recent, []);
  }
  assert.deepEqual(selectHomePosts([post('draft', false)]), { featured: null, recent: [] });
  assert.deepEqual(selectHomePosts([]), { featured: null, recent: [] });
});
