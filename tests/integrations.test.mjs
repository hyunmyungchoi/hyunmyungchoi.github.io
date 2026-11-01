import { test } from 'node:test';
import assert from 'node:assert/strict';
import { integrationSettings, publicIntegrations } from '../src/lib/integrations.js';
import { siteSettings } from '../src/lib/settings.js';
import { isProduction, parseVisitorCount, showViews, initializeAnalytics } from '../src/scripts/analytics.js';
import { commentTheme, initializeComments } from '../src/scripts/comments.js';

const config = {
  giscus: { enabled: true, repo: 'example/blog', repoId: 'R_example', category: 'Announcements', categoryId: 'DIC_example' },
  goatcounter: { site: 'https://example.goatcounter.com/' },
};

test('integrations are optional, validate actual IDs and reject arbitrary counter hosts', () => {
  assert.deepEqual(integrationSettings(), { giscus: null, goatcounter: null });
  const settings = integrationSettings(config);
  assert.equal(settings.goatcounter.site, 'https://example.goatcounter.com');
  assert.equal(settings.giscus.repo, 'example/blog');
  assert.equal(integrationSettings(config, { giscusEnabled: 'false', goatcounterSite: '' }).giscus, null);
  assert.throws(() => integrationSettings(config, { giscusEnabled: 'yes' }));
  for (const site of ['https://evil.example', 'http://example.goatcounter.com', 'https://example.goatcounter.com/path', 'https://example.goatcounter.com?token=secret', 'https://user:secret@example.goatcounter.com', 123]) {
    assert.throws(() => integrationSettings(config, { goatcounterSite: site }));
  }
  for (const field of ['repo', 'repoId', 'category', 'categoryId']) {
    assert.throws(() => integrationSettings({ giscus: { ...config.giscus, [field]: '' } }));
  }
});

test('drafts, previews and sites without an origin have no active integrations', () => {
  const settings = siteSettings({ url: 'https://example.github.io', integrations: config });
  assert.ok(publicIntegrations(settings).giscus);
  for (const options of [{ preview: true }, { noindex: true }]) {
    assert.deepEqual(publicIntegrations(settings, options), { giscus: null, goatcounter: null });
  }
  assert.deepEqual(publicIntegrations({ ...settings, url: '' }), { giscus: null, goatcounter: null });
  for (const origin of ['http://127.0.0.1:8765', 'https://preview.example', 'http://example.github.io']) {
    assert.equal(isProduction(new URL(origin), settings.url), false);
  }
  assert.equal(isProduction(new URL(settings.url), settings.url), true);
});

test('visitor counts accept formatted zero and integers, never manufacture zero on malformed data', () => {
  for (const [value, expected] of [['0', 0], ['1234', 1234], ['1,234', 1234], ['1,234,567', 1234567]]) assert.equal(parseVisitorCount(value), expected);
  for (const value of [null, undefined, 12, '', '-1', '1.2', '1,23', '<script>', '9007199254740992']) assert.equal(parseVisitorCount(value), null);
});

function counterElement() {
  const value = { textContent: '—' };
  return { dataset: { viewSite: 'https://example.goatcounter.com', viewPath: '/journal/posts/example/' }, querySelector: () => value, value };
}

test('counter fetch uses the exact encoded canonical path with no cookies or referrer', async () => {
  const element = counterElement();
  await showViews(element, async (url, options) => {
    assert.equal(url, 'https://example.goatcounter.com/counter/%2Fjournal%2Fposts%2Fexample%2F.json');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.referrerPolicy, 'no-referrer');
    assert.ok(options.signal);
    return { ok: true, json: async () => ({ count: '1,234' }) };
  });
  assert.equal(element.value.textContent, '1,234');
  assert.equal(element.dataset.viewState, 'ready');
});

test('missing pages, blocked fetches, invalid JSON and malformed counters remain unavailable, not zero', async () => {
  for (const fetcher of [
    async () => ({ ok: false, status: 404 }),
    async () => { throw new Error('Blocked'); },
    async () => ({ ok: true, json: async () => { throw new Error('Invalid JSON'); } }),
    async () => ({ ok: true, json: async () => ({ count: '-1' }) }),
  ]) {
    const element = counterElement();
    await showViews(element, fetcher);
    assert.equal(element.value.textContent, '확인 불가');
    assert.equal(element.dataset.viewState, 'unavailable');
  }
});

test('analytics loads once on production, excludes query/hash, and does nothing on localhost', () => {
  const scripts = [];
  const doc = {
    querySelector(selector) {
      if (selector === '[data-analytics-site]') return { dataset: { analyticsSite: 'https://example.goatcounter.com', productionOrigin: 'https://example.github.io' } };
      if (selector === 'link[rel="canonical"]') return { href: 'https://example.github.io/journal/posts/example/' };
      if (selector === 'script[data-goatcounter]') return scripts[0];
    },
    createElement: () => ({ dataset: {} }), head: { appendChild: script => scripts.push(script) }, querySelectorAll: () => [],
  };
  initializeAnalytics(doc, { location: new URL('http://127.0.0.1:8765') });
  assert.equal(scripts.length, 0);
  const win = { location: new URL('https://example.github.io/journal/posts/example/?private=1#heading') };
  initializeAnalytics(doc, win);
  initializeAnalytics(doc, win);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, 'https://gc.zgo.at/count.js');
  assert.deepEqual(JSON.parse(scripts[0].dataset.goatcounterSettings), { path: '/journal/posts/example/', no_events: true });
});

test('comments use strict pathname mapping, Korean and live light/dark theme changes', () => {
  const scripts = [], messages = [];
  let mutation;
  const mount = { appendChild: script => scripts.push(script), querySelector: () => ({ contentWindow: { postMessage: (...args) => messages.push(args) } }) };
  const section = { dataset: { ...config.giscus, productionOrigin: 'https://example.github.io' }, querySelector: () => mount };
  const doc = { documentElement: { dataset: { theme: 'light' } }, querySelector: () => section, createElement: () => ({ dataset: {} }) };
  const win = {
    location: new URL('https://example.github.io/posts/example/'), addEventListener() {},
    MutationObserver: class { constructor(callback) { mutation = callback; } observe() {} disconnect() {} },
  };
  initializeComments(doc, { ...win, location: new URL('http://localhost:8765') });
  assert.equal(scripts.length, 0);
  initializeComments(doc, win);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, 'https://giscus.app/client.js');
  assert.equal(scripts[0].dataset.mapping, 'pathname');
  assert.equal(scripts[0].dataset.strict, '1');
  assert.equal(scripts[0].dataset.lang, 'ko');
  assert.equal(commentTheme(doc), 'light');
  doc.documentElement.dataset.theme = 'dark';
  mutation();
  assert.equal(commentTheme(doc), 'dark_high_contrast');
  assert.deepEqual(messages[0], [{ giscus: { setConfig: { theme: 'dark_high_contrast' } } }, 'https://giscus.app']);
});
