import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { series } from '../src/data/navigation.js';

const read = file => fs.readFile(file, 'utf8');

test('header keeps home and posts; theme remains terminal and monitor icons', async () => {
  const source = await read('src/components/SiteHeader.astro');
  assert.match(source, /#home/);
  assert.match(source, /#latest/);
  assert.doesNotMatch(source, /#archive|#series/);
  assert.match(source, /theme-terminal/);
  assert.match(source, /theme-monitor/);
});

test('light and dark backgrounds remain pure white and black', async () => {
  const css = await read('src/styles/base.css');
  assert.match(css, /--paper: #ffffff;/);
  assert.match(css, /--paper: #000000;/);
  for (const [, red, green, blue] of css.matchAll(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/g)) {
    assert.equal(red, green);
    assert.equal(green, blue);
  }
});

test('five series follow the requested titles and order, retaining previous URLs', async () => {
  assert.deepEqual(series.map(item => item.id), ['promotion', 'msa', 'nubo', 'bbibik', 'streaming']);
  assert.deepEqual(series.map(item => item.title), ['판매자를 위한 프로모션 서비스 개발기', '서비스 운영 문제 재현과 개선', 'AI 주거지원 서비스 누보 개발기', '주차 알림 앱 삐빅 개발기', '비디오 스트리밍 시스템 연구']);
  assert.equal(new Set(series.map(item => item.shortTitle)).size, 5);
  for (const item of series) {
    assert.ok(item.sentence && item.imageAlt && item.cover && item.shortTitle);
    assert.equal(item.disciplines.length, 3);
    assert.ok(item.disciplines.every(value => typeof value === 'string' && value.length > 0));
    assert.doesNotMatch(JSON.stringify(item), /codex:|threads\/|PRIVATE|초안|연재 예정/);
  }
  const source = await read('src/components/SeriesGallery.astro');
  const card = source.match(/<a class="home-series-entry"([\s\S]*?)<\/a>/)[1];
  assert.match(card, /#series\//);
  assert.match(card, /aria-labelledby/);
  assert.match(card, /aria-describedby/);
  assert.doesNotMatch(card, /<(?:a|button|input|select|textarea)\b/);
  assert.match(card, /item.sentence/);
});

test('five editorial illustrations are self-contained lightweight SVG assets', async () => {
  for (const { cover } of series) {
    const bytes = await fs.readFile('public/' + cover);
    assert.match(bytes.toString(), /viewBox="0 0 1200 600"/);
    assert.match(bytes.toString(), /<title/);
    assert.doesNotMatch(bytes.toString(), /<script|<image|href=|onload=|<foreignObject/);
    assert.ok(bytes.length < 10_000, cover + ' should stay under 10 KB');
  }
  const source = await read('src/components/SeriesGallery.astro');
  assert.match(source, /width="1200" height="600"/);
  assert.match(source, /'eager' : 'lazy'/);
  assert.match(source, /item.shortTitle/);
  assert.doesNotMatch(await read('src/styles/home.css'), /grayscale/);
});

test('covers show domain relationships, not unrelated decorative code or logos', async () => {
  const labels = [
    ['AVAILABLE', 'USED', 'EXPIRED', 'expires'],
    ['REQUEST', 'SERVICE', 'STORAGE', 'retry', 'trace'],
    ['DOCUMENTS', 'RETRIEVE', 'ANSWER'],
    ['MOVING', 'STOPPED', 'PARKED', 'NOTIFY'],
    ['RTMP', 'FFmpeg', 'HLS/DASH', 'WebRTC', 'SFU'],
  ];
  for (const [i, item] of series.entries()) {
    const source = await read('public/' + item.cover);
    for (const label of labels[i]) assert.ok(source.includes(label), item.id + ': ' + label);
    assert.match(source, /개념도|전송 경로/);
  }
});

test('technical classification is accessible and the hero keeps a compact two-to-one cover', async () => {
  const source = await read('src/components/SeriesGallery.astro');
  assert.match(source, /item.disciplines.map/);
  assert.match(source, /aria-describedby=\{`series-\$\{item.id\}-disciplines series-\$\{item.id\}-sentence`\}/);
  const css = await read('src/styles/home.css');
  assert.match(css, /aspect-ratio: 2 \/ 1/);
  assert.match(css, /font-family: var\(--technical-font\)/);
  assert.match(css, /\.home-page \{ padding-top: 14px/);
});

test('carousel exposes adjacent slides and uses native scroll snap without autoplay', async () => {
  const css = await read('src/styles/home.css');
  assert.match(css, /flex: 0 0 62%/);
  assert.match(css, /scroll-snap-type: x mandatory/);
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /max-width: 760px/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  const behavior = await read('src/scripts/home.js');
  assert.doesNotMatch(behavior, /createCarousel|setInterval|scrollLeft/);
  assert.match(behavior, /preventScroll: true/);
  assert.match(behavior, /homePosition/);
  assert.match(behavior, /home-topic-link/);
  const spotlight = await read('src/scripts/series-spotlight.js');
  assert.doesNotMatch(spotlight, /setInterval/);
  assert.match(spotlight, /setTimeout\(sync, 140\)/);
  assert.match(spotlight, /scrollend/);
  assert.match(spotlight, /prefersReducedMotion/);
  for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) assert.ok(spotlight.includes(key));
});

test('editorial typography stays separate from body text and does not add a marketing introduction', async () => {
  const css = await read('src/styles/base.css') + await read('src/styles/home.css');
  assert.match(css, /--display-font:/);
  assert.match(css, /font-family: var\(--display-font\)/);
  assert.doesNotMatch(css, /linear-gradient|box-shadow:/);
  const page = await read('src/pages/index.astro');
  assert.match(page, /class="home-title" id="home-title">연재/);
  assert.doesNotMatch(page, /hero-intro|tagline|manifesto/);
});

test('home contains a series spotlight and clickable INDEX, not draft or feed widgets', async () => {
  const source = await read('src/pages/index.astro');
  const home = source.match(/<div class="home-page shell"([\s\S]*?)<\/div>/)[1];
  assert.match(home, /SeriesGallery/);
  assert.match(home, /HomeIndex/);
  assert.doesNotMatch(home, /FeaturedPost|PostCard|PostFeed|TopicIndex|ProfileLinks|최근 글|조회수|초안|대표 글/);
  assert.doesNotMatch(await read('src/components/SiteFooter.astro'), /미발행 초안 포함/);
  const index = await read('src/components/HomeIndex.astro');
  assert.match(index, /<h2 id="home-index-title">INDEX<\/h2>/);
  assert.match(index, /href=\{`#topic\/\$\{encodeURIComponent\(topic\)\}`\}/);
  assert.doesNotMatch(index, /data-topic=|<button/);
});

test('hover, keyboard focus and reduced-motion remain accessible', async () => {
  const css = await read('src/styles/base.css') + await read('src/styles/interactions.css');
  const rule = css.match(/\.theme-button \{([^}]+)\}/)[1];
  assert.match(rule, /width: 44px/);
  assert.match(rule, /height: 44px/);
  assert.match(css, /home-series-entry:focus-visible h2/);
  assert.match(css, /hover: hover/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /transform: none/);
});

test('Markdown rendering, templates and browser behavior stay separate', async () => {
  const layout = await read('src/pages/index.astro');
  for (const component of ['SeriesGallery', 'PostFeed']) assert.ok(layout.includes('<' + component));
  assert.doesNotMatch(await read('scripts/build.mjs'), /<!doctype|<article|<header/);
  assert.match(await read('src/styles/article.css'), /background: #111111; color: #f5f5f5/);
});
