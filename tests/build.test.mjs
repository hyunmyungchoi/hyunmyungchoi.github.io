import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { load } from 'cheerio';
import { series } from '../src/data/navigation.js';

const root = process.cwd();
async function build(name, { preview = false, basePath = '', fixtures = true, requirePosts = false, site = 'https://example.github.io', integrations = false, contentDirectory } = {}) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/build.mjs', ...(preview ? ['--preview'] : []), ...(requirePosts ? ['--require-posts'] : [])], {
      cwd: root,
      env: { ...process.env, SITE_URL: site, BASE_PATH: basePath, BLOG_OUTPUT: '.test-output/' + name, BLOG_CONTENT_DIR: contentDirectory || (fixtures ? 'tests/fixtures/posts' : 'tests/fixtures/drafts'), ASTRO_TELEMETRY_DISABLED: '1', GISCUS_ENABLED: String(integrations), GOATCOUNTER_SITE: integrations ? 'https://example.goatcounter.com' : '' },
    });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, output, directory: path.join(root, '.test-output', name) }));
  });
  return result;
}

async function checkLocalLinks(directory, filename, basePath) {
  const $ = load(await fs.readFile(path.join(directory, filename), 'utf8'));
  for (const element of $('a[href],link[rel="stylesheet"],script[src],img[src]').toArray()) {
    const href = $(element).attr('href') || $(element).attr('src');
    if (!href || /^(https?:|data:|mailto:|#)/.test(href)) continue;
    const pathname = decodeURIComponent(href.split('#')[0]);
    assert.ok(pathname.startsWith(basePath + '/'), `${filename}: ${href}`);
    let target = path.join(directory, pathname.slice(basePath.length));
    if (pathname.endsWith('/')) target = path.join(target, 'index.html');
    await assert.doesNotReject(fs.access(target), `${filename}: ${href}`);
  }
  const ids = $('[id]').toArray().map(element => $(element).attr('id'));
  assert.equal(new Set(ids).size, ids.length, filename + ' duplicate IDs');
  assert.equal($('astro-island').length, 0);
  return $;
}

for (const basePath of ['', '/journal']) test(`Astro public build works at ${basePath || '/'} without leaking drafts`, async () => {
  const result = await build(basePath ? 'project' : 'root', { basePath, requirePosts: true });
  assert.equal(result.code, 0, result.output);
  const home = await checkLocalLinks(result.directory, 'index.html', basePath);
  const article = await checkLocalLinks(result.directory, 'posts/example/index.html', basePath);
  await checkLocalLinks(result.directory, '404.html', basePath);
  assert.equal(home('#post-list > .post').length, 1);
  assert.equal(home('#post-list .post-cover img').length, 1);
  assert.ok(home('#post-list .post-cover img').attr('src').endsWith('series-operations-editorial.svg'));
  assert.equal(home('.home-series-entry').length, 5);
  assert.equal(home('.sidebar .series-item img').length, 5);
  assert.equal(home('.sidebar .series-item small').length, 0);
  assert.equal(home('.category-browser > summary').length, 1);
  assert.equal(home('.sidebar [data-all-posts]').length, 1);
  assert.equal(home('.sidebar .topic-button').length, 9);
  assert.equal(home('.sidebar [data-topic="Linux"] .topic-count').text(), '1');
  assert.equal(home('.sidebar [data-topic="Docker"] .topic-count').text(), '0');
  assert.equal(home('#home .post').length, 0);
  assert.equal(home('#home .home-feature').length, 1);
  assert.equal(home('#home-title').text(), '본문 테스트');
  assert.equal(home('.feature-summary').text(), '정적 본문 생성 검증');
  assert.equal(home('.feature-artwork img').attr('src'), `${basePath}/assets/series-operations-editorial.svg`);
  assert.equal(home('.home-recent').length, 0);
  assert.equal(home('#home .series-panel:not([hidden])').length, 5);
  assert.equal(home('#series[aria-roledescription="carousel"]').length, 1);
  assert.equal(home('#home .series-select[aria-current="true"]').attr('data-series-select'), '0');
  assert.equal(home('#home .series-select').length, 5);
  assert.equal(home('#home .series-panel[data-current="true"]').length, 1);
  assert.deepEqual(home('.series-select span').toArray().map(element => home(element).text()), series.map(item => item.shortTitle));
  assert.equal(home('#home [data-series-prev][disabled]').length, 1);
  assert.equal(home('#home [data-series-next]:not([disabled])').length, 1);
  for (const panel of home('#home .series-panel').toArray()) {
    assert.equal(home(panel).attr('role'), 'group');
    assert.equal(home(panel).attr('aria-roledescription'), 'slide');
  }
  assert.equal(home('#home .home-topic-link').length, 9);
  assert.equal(home('#home-index-title').text(), 'INDEX');
  assert.ok(home('#home .home-topic-link').toArray().every(element => home(element).attr('href').startsWith('#topic/')));
  assert.deepEqual(home('#home .series-caption h3').toArray().map(element => home(element).text()), series.map(item => item.title));
  for (const item of series) {
    const label = home('#series-' + item.id + '-disciplines');
    assert.ok(item.disciplines.every(value => label.text().includes(value)));
    assert.equal(label.find('span:not([aria-hidden])').length, 3);
    assert.equal(home('#panel-' + item.id + ' .series-cover img').attr('height'), '600');
    assert.ok(home('#panel-' + item.id + ' a').attr('aria-describedby').includes(label.attr('id')));
  }
  assert.equal(home('#home .series-caption p').length, 5);
  assert.deepEqual(home('#series img').toArray().map(element => home(element).attr('src')), series.map(item => `${basePath}/${item.cover}`));
  assert.equal(home('dialog').length, 0);
  assert.equal(article('h1').text(), '본문 테스트');
  assert.equal(article('.article-cover img').length, 1);
  assert.equal(article('.article-cover img').attr('width'), '1200');
  assert.equal(article('.article-cover img').attr('height'), '600');
  assert.ok(article('.article-cover img').attr('src').endsWith('series-operations-editorial.svg'));
  assert.equal(article('link[rel="canonical"]').attr('href'), `https://example.github.io${basePath}/posts/example/`);
  assert.equal(article('.article-body table').length, 1);
  assert.equal(article('.article-body img').length, 1);
  assert.equal(article('.article-body a[download]').length, 1);
  assert.equal(article('.article-body a[download]').attr('href'), `${basePath}/media/src/content/attachments/_test-fixtures/example.pdf`);
  assert.deepEqual(
    await fs.readFile(path.join(result.directory, 'media/src/content/attachments/_test-fixtures/example.pdf')),
    await fs.readFile('src/content/attachments/_test-fixtures/example.pdf'),
  );
  await assert.rejects(fs.access(path.join(result.directory, 'media/src/content/attachments/_test-fixtures/private.pdf')));
  await assert.rejects(fs.access(path.join(result.directory, 'media/src/content/attachments/_test-fixtures/unreferenced.pdf')));
  assert.equal(article('meta[name="robots"]').length, 0);
  assert.doesNotMatch(article('.article-body').html(), /<script|onclick|javascript:/);
  assert.doesNotMatch(home.html(), /PRIVATE_TEST|배포하면 안 되는|작성 예정|가장 많이 읽은 글/);
  await assert.rejects(fs.access(path.join(result.directory, 'posts/private-draft/index.html')));
  const sitemap = await fs.readFile(path.join(result.directory, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /posts\/example\//);
  assert.doesNotMatch(sitemap, /private-draft|planned/);
  const outputFiles = await fs.readdir(result.directory, { recursive: true });
  assert.ok(outputFiles.every(file => !/\.md$|posts\.json|private-draft|\.astro$/.test(file)));
  for (const file of outputFiles.filter(file => /\.(html|js|json|xml|txt)$/.test(file))) {
    assert.doesNotMatch(await fs.readFile(path.join(result.directory, file), 'utf8'), /PRIVATE_TEST_BODY_MARKER|PRIVATE_TEST_MARKER/);
  }
});

test('preview renders drafts and planned pages with noindex; next public build removes them', async () => {
  const result = await build('preview-regression', { preview: true });
  assert.equal(result.code, 0, result.output);
  const draft = await fs.readFile(path.join(result.directory, 'posts/private-draft/index.html'), 'utf8');
  assert.match(draft, /검토 전 초안|PRIVATE_TEST_BODY_MARKER/);
  assert.match(draft, /noindex,nofollow/);
  assert.match(draft, /media\/src\/content\/attachments\/_test-fixtures\/private\.pdf/);
  await fs.access(path.join(result.directory, 'media/src/content/attachments/_test-fixtures/private.pdf'));
  assert.match(await fs.readFile(path.join(result.directory, 'posts/planned/index.html'), 'utf8'), /아직 본문을 작성하지/);
  assert.equal(await fs.readFile(path.join(result.directory, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n');
  await assert.rejects(fs.access(path.join(result.directory, 'sitemap.xml')));
  const publicResult = await build('preview-regression');
  assert.equal(publicResult.code, 0, publicResult.output);
  await assert.rejects(fs.access(path.join(result.directory, 'posts/private-draft/index.html')));
  await assert.rejects(fs.access(path.join(result.directory, 'media/src/content/attachments/_test-fixtures/private.pdf')));
});

test('empty public build stays empty and cannot deploy without an approved post', async () => {
  const result = await build('empty', { fixtures: false });
  assert.equal(result.code, 0, result.output);
  const home = await fs.readFile(path.join(result.directory, 'index.html'), 'utf8');
  assert.match(home, /아직 발행된 글이 없습니다/);
  const empty = load(home);
  assert.equal(empty('#post-list > .post').length, 0);
  assert.equal(empty('#result-count').text(), '0개');
  assert.ok(empty('.topic-count').toArray().every(element => empty(element).text() === '0'));
  assert.doesNotMatch(home, /VirtualBox|SQLite|Gemma가/);
  const blocked = await build('blocked', { fixtures: false, requirePosts: true });
  assert.notEqual(blocked.code, 0);
  assert.match(blocked.output, /발행 승인/);
  const missingOrigin = await build('blocked', { requirePosts: true, site: '' });
  assert.notEqual(missingOrigin.code, 0);
  assert.match(missingOrigin.output, /SITE_URL/);
});

test('deployment only uploads dist after the guarded public build', async () => {
  const workflow = await fs.readFile('.github/workflows/pages.yml', 'utf8');
  assert.match(workflow, /path: dist/);
  assert.match(workflow, /--require-posts/);
  assert.match(workflow, /needs: build/);
  assert.doesNotMatch(workflow, /path: \.preview|build:preview|pull_request_target/);
});

test('configured comments and counters render on public posts, not the homepage or preview drafts', async () => {
  const result = await build('integrations', { integrations: true, basePath: '/journal' });
  assert.equal(result.code, 0, result.output);
  const home = await checkLocalLinks(result.directory, 'index.html', '/journal');
  const article = await checkLocalLinks(result.directory, 'posts/example/index.html', '/journal');
  assert.equal(home('[data-comments]').length, 0);
  assert.equal(article('[data-comments]').length, 1);
  assert.equal(article('[data-comments]').attr('data-repo'), 'hyunmyungchoi/hyunmyungchoi.github.io');
  assert.equal(article('.article-heading [data-view-path]').attr('data-view-path'), '/journal/posts/example/');
  assert.equal(home('#post-list [data-view-path]').attr('data-view-path'), '/journal/posts/example/');
  assert.equal(home('.home-feature [data-view-path]').attr('data-view-path'), '/journal/posts/example/');
  assert.equal(article('[data-analytics-site]').attr('data-analytics-site'), 'https://example.goatcounter.com');
  assert.equal(home('[data-analytics-site]').length, 1);
  assert.equal(article('[data-view-value]').text(), '—');
  const preview = await build('integrations-preview', { preview: true, integrations: true });
  assert.equal(preview.code, 0, preview.output);
  for (const filename of ['index.html', 'posts/example/index.html', 'posts/private-draft/index.html']) {
    const page = load(await fs.readFile(path.join(preview.directory, filename), 'utf8'));
    assert.equal(page('[data-comments], [data-view-site], [data-analytics-site]').length, 0);
  }
});

test('home shows a selected feature, then newest other posts; no draft or duplicate appears in the home selection', async () => {
  const result = await build('home-reading', { contentDirectory: 'tests/fixtures/home-posts', basePath: '/journal' });
  assert.equal(result.code, 0, result.output);
  const home = await checkLocalLinks(result.directory, 'index.html', '/journal');
  assert.equal(home('#home-title').text(), '홈 대표 글 검증');
  assert.equal(home('#home-title a').attr('href'), '/journal/posts/promotion-start/');
  assert.deepEqual(home('.recent-link h3').toArray().map(el => home(el).text()), ['새로운 변경 검증', '이전 기록 검증']);
  assert.equal(home('.home-recent-list a[href$="/promotion-start/"]').length, 0);
  assert.equal(home('#post-list > .post').length, 3);
  assert.doesNotMatch(home('#home').text(), /PRIVATE_HOME_DRAFT/);
  const order = home('#home > section').toArray().map(el => home(el).attr('class'));
  assert.deepEqual(order, ['home-feature', 'home-recent', 'series-spotlight', 'home-index']);
});
