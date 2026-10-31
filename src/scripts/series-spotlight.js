// Native scroll snap handles trackpads and touch. Nothing advances automatically.
import { createSeriesPointer } from './series-pointer.js';

export function createSeriesSpotlight(root, prefersReducedMotion = () => false) {
  const track = root.querySelector('.series-track');
  const panels = [...root.querySelectorAll('.series-panel')];
  const selectors = [...root.querySelectorAll('[data-series-select]')];
  const previous = root.querySelector('[data-series-prev]');
  const next = root.querySelector('[data-series-next]');
  const position = root.querySelector('#series-position');
  const status = root.querySelector('#series-status');
  let current = 0;
  let settleTimer;
  let pointer;
  let intendedIndex = null;

  function stops() {
    const maximum = Math.max(0, track.scrollWidth - track.clientWidth);
    return panels.map(panel => Math.max(0, Math.min(maximum, panel.offsetLeft - panels[0].offsetLeft)));
  }
  function update(index) {
    current = index;
    panels.forEach((panel, i) => panel.setAttribute('data-current', String(i === current)));
    selectors.forEach((button, i) => {
      if (i === current) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    previous.disabled = current === 0;
    next.disabled = current === panels.length - 1;
    position.textContent = String(current + 1);
    status.textContent = panels[current].getAttribute('aria-label');
  }
  function select(index, { focus = false, animate = true } = {}) {
    if (!Number.isInteger(index) || index < 0 || index >= panels.length) return;
    clearTimeout(settleTimer);
    intendedIndex = index;
    update(index);
    if (track.clientWidth > 0) track.scrollTo({ left: stops()[index], behavior: animate && !prefersReducedMotion() ? 'smooth' : 'instant' });
    if (focus) selectors[index].focus({ preventScroll: true });
  }
  function nearestIndex() {
    const targets = stops();
    let nearest = 0;
    for (let i = 1; i < targets.length; i++) {
      if (Math.abs(targets[i] - track.scrollLeft) < Math.abs(targets[nearest] - track.scrollLeft)) nearest = i;
    }
    return nearest;
  }
  function sync() {
    clearTimeout(settleTimer);
    if (!track.clientWidth || pointer?.isDragging()) return;
    if (intendedIndex !== null) {
      const index = intendedIndex;
      const target = stops()[index];
      // An older scrollend or a throttled animation is not the end of this move.
      // Let native smooth scrolling finish; forcing another scroll can overshoot.
      if (Math.abs(track.scrollLeft - target) > 1) return;
      intendedIndex = null;
      update(index);
      return;
    }
    update(nearestIndex());
  }
  function refresh() { if (track.clientWidth && !pointer?.isDragging()) select(current, { animate: false }); }
  function handleKeys(event) {
    const index = { ArrowRight: Math.min(current + 1, panels.length - 1), ArrowLeft: Math.max(current - 1, 0), Home: 0, End: panels.length - 1 }[event.key];
    if (index === undefined) return;
    event.preventDefault();
    select(index);
  }

  previous.addEventListener('click', () => select(Math.max(current - 1, 0)));
  next.addEventListener('click', () => select(Math.min(current + 1, panels.length - 1)));
  selectors.forEach((button, i) => button.addEventListener('click', () => select(i)));
  track.addEventListener('pointerdown', () => { intendedIndex = null; }, true);
  track.addEventListener('wheel', () => { intendedIndex = null; }, { passive: true });
  track.addEventListener('keydown', handleKeys);
  root.querySelector('.series-pagination').addEventListener('keydown', event => {
    const index = { ArrowRight: Math.min(current + 1, panels.length - 1), ArrowLeft: Math.max(current - 1, 0), Home: 0, End: panels.length - 1 }[event.key];
    if (index === undefined) return;
    event.preventDefault();
    select(index, { focus: true });
  });
  panels.forEach((panel, index) => panel.addEventListener('focusin', () => {
    if (!pointer.isPointerActive() && current !== index) select(index, { animate: false });
  }));
  pointer = createSeriesPointer({ track, panels, getIndex: () => current, nearestIndex, select });
  // Debounced scroll settling is a fallback for engines without scrollend, not autoplay.
  track.addEventListener('scroll', () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(sync, 140);
  }, { passive: true });
  track.addEventListener('scrollend', sync);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(refresh) : null;
  observer?.observe(track);
  update(0);
  return { select, refresh, finish: refresh, get index() { return current; } };
}
