import { seriesNames } from '../data/navigation.js';
import { createPostFilter } from './post-filter.js';
import { createPageTransition } from './page-transition.js';
import { createSeriesSpotlight } from './series-spotlight.js';

const home = document.querySelector('#home');
const cards = [...home.querySelectorAll('.home-series-entry')];
const homeLinks = [...cards, ...home.querySelectorAll('.home-topic-link')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const spotlight = createSeriesSpotlight(document.querySelector('#series'), () => reducedMotion.matches);
const transition = createPageTransition(() => reducedMotion.matches);
const filter = createPostFilter(cards);
let selected = null;
let homeMode = true;
let homePosition = { top: 0, card: null };
let requestedHash = location.hash || '#home';
const update = () => filter.update(selected, homeMode);

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { transition.finish(); spotlight.finish(); } });

function applyRoute(scroll = true, restoreHome = false) {
  let hash;
  try { hash = decodeURIComponent(location.hash || '#home'); } catch (_) { hash = '#home'; }
  if (hash === '#archive') { hash = '#latest'; history.replaceState(null, '', hash); }
  if (hash === '#about' || hash === '#main-content') { update(); return; }
  selected = null;
  filter.input.value = '';
  if (hash.startsWith('#series/') && Object.hasOwn(seriesNames, hash.slice(8))) selected = { type: 'series', value: hash.slice(8) };
  if (hash.startsWith('#topic/')) selected = { type: 'topic', value: hash.slice(7) };
  const nextHome = !selected && hash !== '#latest' && hash !== '#feed';
  const returning = nextHome && !homeMode;
  if (homeMode && !nextHome) homePosition = { top: scrollY, card: selected ? '#' + selected.type + '/' + encodeURIComponent(selected.value) : null };
  homeMode = nextHome;
  home.hidden = !homeMode;
  filter.page.hidden = homeMode;
  if (homeMode) spotlight.refresh();
  update();
  if (scroll) {
    const restoring = returning && restoreHome;
    const savedCard = restoring ? homeLinks.find(link => link.hash === homePosition.card) : null;
    const target = savedCard || (homeMode ? document.querySelector('#home-title') : filter.title);
    if (!savedCard) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    if (hash === '#series') document.querySelector('#series').scrollIntoView({ block: 'start', behavior: 'instant' });
    else window.scrollTo({ top: restoring ? homePosition.top : 0, behavior: 'instant' });
  }
}

function changeRoute({ restoreHome = false, force = false } = {}) {
  const hash = location.hash || '#home';
  if (!force && hash === requestedHash) return;
  requestedHash = hash;
  if (hash === '#about' || hash === '#main-content') { update(); return; }
  return transition.run({ outgoing: homeMode ? home : filter.page, commit: () => applyRoute(true, restoreHome), incoming: () => homeMode ? home : filter.page });
}

function navigate(hash, { restoreHome = false } = {}) {
  if (location.hash !== hash) history.pushState(null, '', hash);
  return changeRoute({ restoreHome, force: true });
}

function choose(type, value) {
  navigate(selected?.type === type && selected.value === value ? '#latest' : '#' + type + '/' + encodeURIComponent(value));
}

filter.input.addEventListener('input', update);
document.querySelector('#reset-filter').addEventListener('click', () => navigate('#latest'));
document.querySelector('[data-all-posts]').addEventListener('click', () => navigate('#latest'));
for (const button of document.querySelectorAll('[data-series-filter]')) button.addEventListener('click', () => choose('series', button.dataset.seriesFilter));
for (const button of document.querySelectorAll('[data-topic]')) button.addEventListener('click', () => choose('topic', button.dataset.topic));
for (const link of document.querySelectorAll('a[href="#home"], a[href="#latest"], a.home-series-entry, a.home-topic-link')) {
  link.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(link.hash, { restoreHome: link.hasAttribute('data-return-series') });
  });
}
window.addEventListener('popstate', () => changeRoute({ restoreHome: true }));
window.addEventListener('hashchange', () => changeRoute({ restoreHome: true }));

const storageKey = 'nuxnux-home:' + location.pathname;
window.addEventListener('pagehide', () => {
  try { sessionStorage.setItem(storageKey, JSON.stringify({ hash: location.hash, top: scrollY, query: filter.input.value, homePosition, spotlightIndex: spotlight.index })); }
  catch (_) { /* 브라우저 저장소가 없어도 탐색할 수 있습니다. */ }
});
applyRoute(false);
if (performance.getEntriesByType('navigation')[0]?.type === 'back_forward') {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey));
    if (saved?.hash === location.hash) {
      homePosition = saved.homePosition || homePosition;
      spotlight.select(saved.spotlightIndex, { animate: false });
      filter.input.value = saved.query || '';
      update();
      requestAnimationFrame(() => window.scrollTo({ top: saved.top || 0, behavior: 'instant' }));
    }
  } catch (_) { /* 복원하지 못하면 새 경로를 표시합니다. */ }
}
