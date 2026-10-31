import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeriesSpotlight } from '../src/scripts/series-spotlight.js';
import { dragDestination } from '../src/scripts/series-pointer.js';
import { series } from '../src/data/navigation.js';

function fixture(reduced = false, count = 4) {
  const element = () => ({
    classList: { values: new Set(), add(value) { this.values.add(value); }, remove(value) { this.values.delete(value); }, contains(value) { return this.values.has(value); } },
    attributes: {}, events: {}, textContent: '',
    setAttribute(key, value) { this.attributes[key] = value; },
    removeAttribute(key) { delete this.attributes[key]; },
    getAttribute(key) { return this.attributes[key]; },
    addEventListener(key, fn) { const previous = this.events[key]; this.events[key] = previous ? event => { previous(event); fn(event); } : fn; },
    focus(options) { this.focused = options; },
  });
  const selectors = Array.from({ length: count }, element);
  const panels = Array.from({ length: count }, (_, i) => {
    const panel = element();
    panel.offsetLeft = i * 804;
    panel.attributes['aria-label'] = `${i + 1} / ${count} · series ${i}`;
    return panel;
  });
  const document = { ...element(), defaultView: element() };
  const track = { ...element(), ownerDocument: document, clientWidth: 1000, scrollWidth: count * 804 - 24, scrollLeft: 0, calls: [],
    setPointerCapture(id) { this.captured = id; }, hasPointerCapture(id) { return this.captured === id; },
    releasePointerCapture() { this.captured = null; },
    scrollTo(options) { this.calls.push(options); this.scrollLeft = options.left; } };
  const previous = element(), next = element(), position = element(), status = element(), pagination = element();
  const singles = { '.series-track': track, '[data-series-prev]': previous, '[data-series-next]': next,
    '#series-position': position, '#series-status': status, '.series-pagination': pagination };
  const root = { querySelector: selector => singles[selector],
    querySelectorAll: selector => selector === '.series-panel' ? panels : selectors };
  const controller = createSeriesSpotlight(root, () => reduced);
  return { selectors, panels, track, document, previous, next, position, status, pagination, controller };
}

test('all five real series can be selected and the active cover follows the position', () => {
  const { selectors, panels, previous, next, status, position, controller } = fixture(false, series.length);
  assert.equal(selectors.length, 5);
  selectors[4].events.click();
  assert.equal(controller.index, 4);
  assert.equal(position.textContent, '5');
  assert.equal(status.textContent, '5 / 5 · series 4');
  assert.equal(next.disabled, true);
  assert.deepEqual(panels.map(panel => panel.attributes['data-current']), ['false', 'false', 'false', 'false', 'true']);
  previous.events.click();
  assert.equal(controller.index, 3);
  assert.equal(next.disabled, false);
});

test('selectors scroll to a real slide; no slide is hidden', () => {
  const { selectors, panels, track, controller, position, status } = fixture();
  selectors[2].events.click();
  assert.equal(controller.index, 2);
  assert.deepEqual(track.calls.at(-1), { left: 1608, behavior: 'smooth' });
  assert.equal(position.textContent, '3');
  assert.equal(status.textContent, '3 / 4 · series 2');
  assert.deepEqual(selectors.map(item => item.attributes['aria-current']), [undefined, undefined, 'true', undefined]);
  assert.ok(panels.every(panel => !panel.hidden));
});

test('previous/next clamp at both edges and final slide aligns to maximum scroll', () => {
  const { previous, next, track, controller } = fixture();
  assert.equal(previous.disabled, true);
  previous.events.click();
  assert.equal(controller.index, 0);
  for (let i = 0; i < 5; i++) next.events.click();
  assert.equal(controller.index, 3);
  assert.equal(next.disabled, true);
  assert.equal(track.scrollLeft, 2192);
  previous.events.click();
  assert.equal(controller.index, 2);
  assert.equal(next.disabled, false);
});

test('arrow keys and Home/End work without hijacking unrelated keys', () => {
  const { track, pagination, selectors, controller } = fixture();
  function key(target, key) {
    let prevented = false;
    target.events.keydown({ key, preventDefault() { prevented = true; } });
    return prevented;
  }
  assert.equal(key(track, 'ArrowRight'), true);
  assert.equal(controller.index, 1);
  key(track, 'End');
  assert.equal(controller.index, 3);
  key(track, 'Home');
  assert.equal(controller.index, 0);
  key(pagination, 'ArrowRight');
  assert.deepEqual(selectors[1].focused, { preventScroll: true });
  assert.equal(key(track, 'Tab'), false);
});

test('native horizontal scroll updates indicators and edge buttons when settled', () => {
  const { track, position, controller, next } = fixture();
  track.scrollLeft = 1270;
  track.events.scrollend();
  assert.equal(controller.index, 2);
  assert.equal(position.textContent, '3');
  track.scrollLeft = 2192;
  track.events.scrollend();
  assert.equal(controller.index, 3);
  assert.equal(next.disabled, true);
});

test('reduced motion and restoring a hidden track keep the selected series', () => {
  const { controller, track } = fixture(true);
  controller.select(1);
  assert.equal(track.calls.at(-1).behavior, 'instant');
  track.clientWidth = 0;
  controller.select(2);
  const callsBefore = track.calls.length;
  controller.refresh();
  assert.equal(track.calls.length, callsBefore);
  track.clientWidth = 1000;
  controller.refresh();
  assert.equal(track.scrollLeft, 1608);
  for (const invalid of [undefined, -1, 4, NaN, 1.5]) controller.select(invalid);
  assert.equal(controller.index, 2);
});

test('keyboard focus entering an offscreen slide reveals it without animation', () => {
  const { controller, panels, track } = fixture();
  panels[2].events.focusin();
  assert.equal(controller.index, 2);
  assert.deepEqual(track.calls.at(-1), { left: 1608, behavior: 'instant' });
});

function pointerEvent(panel, values = {}) {
  return { button: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX: 500, clientY: 100,
    target: { closest: () => panel }, defaultPrevented: false, stopped: false,
    preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, ...values };
}

test('a peek click selects the series before routing; the second click is left to the router', () => {
  const { track, document, panels, controller } = fixture();
  track.events.pointerdown(pointerEvent(panels[1]));
  panels[1].events.focusin();
  assert.equal(controller.index, 0, 'pointer focus must not preselect the clicked peek');
  document.events.pointerup(pointerEvent(panels[1]));
  const first = pointerEvent(panels[1]);
  track.events.click(first);
  assert.equal(controller.index, 1);
  assert.equal(first.defaultPrevented, true);
  assert.equal(first.stopped, true);
  track.events.pointerdown(pointerEvent(panels[1]));
  document.events.pointerup(pointerEvent(panels[1]));
  const second = pointerEvent(panels[1]);
  track.events.click(second);
  assert.equal(second.defaultPrevented, false);
});

test('mouse drag follows the pointer, snaps forward and consumes the release click', () => {
  const { track, document, panels, controller } = fixture();
  track.events.pointerdown(pointerEvent(panels[0]));
  const move = pointerEvent(panels[0], { clientX: 280 });
  track.events.pointermove(move);
  assert.equal(track.scrollLeft, 220);
  assert.equal(track.classList.contains('is-dragging'), true);
  assert.equal(track.captured, 1);
  track.events.scrollend();
  assert.equal(controller.index, 0, 'scroll settling cannot preempt a held drag');
  document.events.pointerup(pointerEvent(null, { clientX: 280 }));
  assert.equal(controller.index, 1);
  assert.equal(track.classList.contains('is-dragging'), false);
  assert.equal(track.captured, null);
  const click = pointerEvent(null);
  track.events.click(click);
  assert.equal(click.defaultPrevented, true);
  assert.equal(click.stopped, true);
  track.events.pointerdown(pointerEvent(panels[1]));
  document.events.pointerup(pointerEvent(panels[1]));
  const nextClick = pointerEvent(panels[1]);
  track.events.click(nextClick);
  assert.equal(nextClick.defaultPrevented, false, 'a new click is not swallowed by a timer');
});

test('small mouse jitter stays a click; tiny intentional drags snap back but do not navigate', () => {
  const { track, document, panels, controller } = fixture();
  track.events.pointerdown(pointerEvent(panels[0]));
  track.events.pointermove(pointerEvent(panels[0], { clientX: 496 }));
  document.events.pointerup(pointerEvent(panels[0], { clientX: 496 }));
  const click = pointerEvent(panels[0]);
  track.events.click(click);
  assert.equal(click.defaultPrevented, false);
  track.events.pointerdown(pointerEvent(panels[0]));
  track.events.pointermove(pointerEvent(panels[0], { clientX: 470 }));
  document.events.pointerup(pointerEvent(panels[0], { clientX: 470 }));
  const dragClick = pointerEvent(panels[0]);
  track.events.click(dragClick);
  assert.equal(dragClick.defaultPrevented, true);
  assert.equal(controller.index, 0);
});

test('cancelled gestures restore snapping and do not leave capture or stale click guards', () => {
  for (const event of ['pointercancel', 'lostpointercapture', 'blur']) {
    const { track, document, panels } = fixture();
    track.events.pointerdown(pointerEvent(panels[0]));
    track.events.pointermove(pointerEvent(panels[0], { clientX: 240 }));
    const target = event === 'pointercancel' ? document : event === 'blur' ? document.defaultView : track;
    target.events[event](pointerEvent(null));
    assert.equal(track.classList.contains('is-dragging'), false);
    assert.equal(track.captured, null);
    const click = pointerEvent(panels[0]);
    track.events.click(click);
    assert.equal(click.defaultPrevented, false);
  }
});

test('touch stays native and modified clicks keep the normal browser behavior', () => {
  const { track, document, panels, controller } = fixture();
  track.events.pointerdown(pointerEvent(panels[0], { pointerType: 'touch' }));
  const move = pointerEvent(panels[0], { pointerType: 'touch', clientX: 200 });
  track.events.pointermove(move);
  assert.equal(move.defaultPrevented, false);
  assert.equal(track.scrollLeft, 0);
  assert.equal(track.classList.contains('is-dragging'), false);
  document.events.pointercancel(move);
  const modified = pointerEvent(panels[1], { ctrlKey: true });
  track.events.pointerdown(modified);
  track.events.click(modified);
  assert.equal(modified.defaultPrevented, false);
  assert.equal(controller.index, 0);
});

test('drag destination respects short drags, long traversals and both edges', () => {
  const resolve = options => dragDestination({ distance: -140, viewportWidth: 1000, startIndex: 0, nearestIndex: 0, count: 4, ...options });
  assert.equal(resolve({}), 1);
  assert.equal(resolve({ distance: -30 }), 0);
  assert.equal(resolve({ nearestIndex: 2 }), 2);
  assert.equal(resolve({ distance: 200 }), 0);
  assert.equal(resolve({ startIndex: 3, nearestIndex: 3 }), 3);
  assert.equal(resolve({ distance: 150, startIndex: 2, nearestIndex: 2 }), 1);
});

test('stale scrollend cannot interrupt a smooth move or overwrite the chosen series', () => {
  const { track, controller } = fixture();
  controller.select(1);
  const calls = track.calls.length;
  track.scrollLeft = 84;
  track.events.scrollend();
  assert.equal(track.calls.length, calls, 'do not start another scroll while native animation is running');
  assert.equal(controller.index, 1);
  track.scrollLeft = 804;
  track.events.scrollend();
  assert.equal(controller.index, 1);
});

test('manual wheel input overrides an unfinished automatic positioning request', () => {
  const { track, controller } = fixture();
  controller.select(2);
  track.events.wheel({});
  track.scrollLeft = 40;
  track.events.scrollend();
  assert.equal(controller.index, 0);
});

test('layout refresh does not fight an active mouse drag', () => {
  const { track, panels, controller } = fixture();
  controller.select(1);
  track.events.pointerdown(pointerEvent(panels[1]));
  track.events.pointermove(pointerEvent(panels[1], { clientX: 300 }));
  const calls = track.calls.length;
  controller.refresh();
  assert.equal(track.scrollLeft, 1004);
  assert.equal(track.calls.length, calls);
});
