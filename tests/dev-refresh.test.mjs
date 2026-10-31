import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { load } from 'cheerio';
import { dev } from 'astro';

test('content changes refresh cached article props and attachment routes without restarting', async t => {
  const directory = '.test-output/dev-refresh-posts';
  await fs.mkdir(directory, { recursive: true });
  const filename = path.join(directory, 'refresh-example.md');
  const markdown = (label, attachment) => `---\ntitle: "${label}"\nsummary: "refresh regression"\nseries: msa\ntags: [Linux]\ndraft: false\ndate: "2026-01-02"\n---\n\n## ${label}\n\n[PDF](../../src/content/attachments/_test-fixtures/${attachment})\n`;
  await fs.writeFile(filename, markdown('Before refresh', 'example.pdf'));
  process.env.BLOG_CONTENT_DIR = directory;
  process.env.BLOG_OUTPUT = '.test-output/dev-refresh';
  process.env.BLOG_PREVIEW = 'false';
  process.env.SITE_URL = 'https://example.github.io';
  process.env.BASE_PATH = '';
  process.env.ASTRO_TELEMETRY_DISABLED = '1';
  const server = await dev({
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
    vite: { cacheDir: path.join(process.cwd(), '.test-output/dev-refresh-cache') },
  });
  t.after(() => server.stop());
  const origin = `http://127.0.0.1:${server.address.port}`;
  const articleUrl = origin + '/posts/refresh-example/';
  const oldAttachment = origin + '/media/src/content/attachments/_test-fixtures/example.pdf';
  const newAttachment = origin + '/media/src/content/attachments/_test-fixtures/unreferenced.pdf';
  const initial = load(await (await fetch(articleUrl)).text());
  assert.equal(initial('h1').text(), 'Before refresh');
  assert.equal((await fetch(oldAttachment)).status, 200);
  assert.equal((await fetch(newAttachment)).status, 404);

  await fs.writeFile(filename, markdown('After refresh', 'unreferenced.pdf'));
  // 실제 사용자 원문을 수정하지 않고 같은 콘텐츠 감시 이벤트를 발생시킵니다.
  server.watcher.emit('all', 'change', path.join(process.cwd(), 'src/content/posts/refresh-example.md'));
  let updated;
  for (let attempt = 0; attempt < 40; attempt++) {
    updated = load(await (await fetch(articleUrl)).text());
    if (updated('h1').text() === 'After refresh') break;
    await delay(50);
  }
  assert.equal(updated('h1').text(), 'After refresh');
  assert.match(updated('.article-body a[download]').attr('href'), /unreferenced\.pdf$/);
  assert.equal((await fetch(oldAttachment)).status, 404);
  const attachment = await fetch(newAttachment);
  assert.equal(attachment.status, 200);
  assert.match(attachment.headers.get('content-type'), /^application\/pdf/);
});
