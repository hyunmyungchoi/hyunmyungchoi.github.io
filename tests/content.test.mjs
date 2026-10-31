import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';
import { parsePost, readPosts, getSite } from '../src/lib/posts.js';
import { renderMarkdown } from '../src/lib/markdown.js';
import { siteSettings } from '../src/lib/settings.js';
import { outputDirectory, safeSource } from '../src/lib/paths.js';

const metadata = { title: '제목', summary: '요약', series: 'msa', tags: ['Linux'], draft: true, date: null };
const markdown = (changes = {}, body = '## 본문\n\n테스트') => '---\n' + Object.entries({ ...metadata, ...changes }).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n') + '\n---\n' + body;

test('Markdown metadata and filename replace the separate posts.json catalog', () => {
  const post = parsePost(markdown(), 'my-post.md');
  assert.equal(post.slug, 'my-post');
  assert.equal(post.title, '제목');
  assert.equal(post.published, false);
  assert.equal(post.hasBody, true);
});

test('invalid fields, dates, slugs and premature publication fail closed', () => {
  for (const changes of [{ title: '' }, { summary: 5 }, { series: '__proto__' }, { tags: 'Linux' }, { tags: ['x,y'] }, { draft: 'false' }, { date: '2026-02-31' }, { draft: false }, { order: -1 }]) {
    assert.throws(() => parsePost(markdown(changes), 'my-post.md'));
  }
  assert.throws(() => parsePost(markdown(), 'INVALID SLUG.md'));
  assert.throws(() => parsePost(markdown({ draft: false, date: '2026-01-01' }, ''), 'my-post.md'));
  assert.throws(() => parsePost('본문만 있음', 'my-post.md'));
  assert.throws(() => parsePost('---\ntitle: one\ntitle: two\n---\nbody', 'my-post.md'));
});

test('preview includes drafts and planned entries; production only includes approved posts', async () => {
  const directory = 'tests/fixtures/posts';
  assert.equal((await readPosts({ preview: true, directory })).length, 3);
  assert.equal((await readPosts({ preview: false, directory })).length, 1);
  const posts = await readPosts({ preview: true, directory });
  assert.equal(posts.filter(post => post.hasBody).length, 2);
});

test('production filters unpublished posts before rendering and copying images', async () => {
  const site = await getSite({ preview: false, directory: 'tests/fixtures/posts' });
  assert.deepEqual(site.posts.map(post => post.slug), ['example']);
  assert.deepEqual([...site.images.keys()], ['src/content/images/example.svg']);
});

test('Markdown keeps tables, code and unique Korean section anchors', async () => {
  const result = await renderMarkdown('# 제목\n\n## 같은 제목\n\n- 하나\n- 둘\n\n## 같은 제목\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```yaml\nhello: world\n```');
  const $ = load(result.html);
  assert.equal($('h1').length, 0);
  assert.deepEqual(result.headings.map(heading => heading.id), ['같은-제목', '같은-제목-2']);
  assert.equal($('.table-scroll table').length, 1);
  assert.equal($('li').length, 2);
  assert.equal($('pre code.language-yaml').text(), 'hello: world\n');
});

test('executable HTML and unsafe URLs are removed from Markdown', async () => {
  const { html } = await renderMarkdown('<script>alert(1)</script>\n\n<a href="javascript:alert(1)" onclick="alert(2)">x</a>\n\n<img src="https://example.com/a.png" onerror="alert(3)"><iframe src="https://example.com"></iframe>');
  assert.doesNotMatch(html, /<script|onclick|onerror|javascript:|<iframe/);
});

test('local links only point to posts included in the current build', async () => {
  const source = 'src/content/posts/example.md';
  const result = await renderMarkdown('[link](next.md#part)', { source, posts: [{ slug: 'next', source: 'src/content/posts/next.md' }], urlFor: route => '/journal/' + route });
  assert.match(result.html, /href="\/journal\/posts\/next\/#part"/);
  await assert.rejects(renderMarkdown('[private](private.md)', { source }), /배포에 포함되지/);
  await assert.rejects(renderMarkdown('![outside](../../../../outside.png)', { source }), /폴더 밖/);
});

test('public origin, repository base path and generated output are validated', async () => {
  const site = siteSettings({ url: 'https://example.github.io', basePath: '/journal/' });
  assert.equal(site.urlFor('posts/example/'), '/journal/posts/example/');
  assert.throws(() => siteSettings({ basePath: '/../private' }));
  assert.throws(() => siteSettings({ url: 'https://user:secret@example.com' }));
  assert.throws(() => siteSettings({ url: 'https://example.com/journal' }));
  for (const value of ['.', '..', 'src', 'D:/', '.test-output/../private']) await assert.rejects(outputDirectory(value));
  await assert.rejects(safeSource('../outside'));
});

test('application source has no React, Vue or handwritten TypeScript', async () => {
  const manifest = JSON.parse(await fs.readFile('package.json', 'utf8'));
  for (const dependency of ['react', 'react-dom', 'vue', 'typescript', '@astrojs/react', '@astrojs/vue']) assert.equal(manifest.dependencies[dependency], undefined);
  const files = await fs.readdir('src', { recursive: true });
  assert.ok(files.every(file => !/\.(tsx?|jsx)$/.test(file)));
});
