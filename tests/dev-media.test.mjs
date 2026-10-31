import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
import { dev } from 'astro';

test('dev serves referenced images and PDF attachments with correct types', async t => {
  process.env.BLOG_CONTENT_DIR = 'tests/fixtures/posts';
  process.env.BLOG_OUTPUT = '.test-output/dev-media';
  process.env.BLOG_PREVIEW = 'false';
  process.env.SITE_URL = 'https://example.github.io';
  process.env.BASE_PATH = '';
  process.env.ASTRO_TELEMETRY_DISABLED = '1';
  const server = await dev({
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
    vite: { cacheDir: path.join(process.cwd(), '.test-output/dev-media-cache') },
  });
  t.after(() => server.stop());
  const origin = `http://127.0.0.1:${server.address.port}`;
  const response = await fetch(origin + '/posts/example/');
  assert.equal(response.status, 200);
  const $ = load(await response.text());
  assert.equal($('link[rel="canonical"]').attr('href'), 'https://example.github.io/posts/example/');
  const source = $('.article-body img').attr('src');
  assert.equal(source, '/media/src/content/images/example.svg');
  const image = await fetch(origin + source);
  assert.equal(image.status, 200);
  assert.match(image.headers.get('content-type'), /^image\/svg\+xml/);
  assert.equal(await image.text(), await fs.readFile('src/content/images/example.svg', 'utf8'));
  const attachmentSource = $('.article-body a[download]').attr('href');
  assert.equal(attachmentSource, '/media/src/content/attachments/_test-fixtures/example.pdf');
  const attachment = await fetch(origin + attachmentSource);
  assert.equal(attachment.status, 200);
  assert.match(attachment.headers.get('content-type'), /^application\/pdf/);
  assert.deepEqual(Buffer.from(await attachment.arrayBuffer()), await fs.readFile('src/content/attachments/_test-fixtures/example.pdf'));
  const unused = await fetch(origin + '/media/src/content/attachments/_test-fixtures/unreferenced.pdf');
  assert.equal(unused.status, 404);
});
