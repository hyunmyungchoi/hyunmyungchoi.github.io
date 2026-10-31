// A short click opens the main series; a real drag must never open a link.
export function dragDestination({ distance, viewportWidth, startIndex, nearestIndex, count }) {
  const threshold = Math.max(44, Math.min(120, viewportWidth * .12));
  const index = Math.abs(distance) >= threshold && nearestIndex === startIndex
    ? startIndex + (distance < 0 ? 1 : -1) : nearestIndex;
  return Math.max(0, Math.min(count - 1, index));
}

export function createSeriesPointer({ track, panels, getIndex, nearestIndex, select }) {
  const document = track.ownerDocument;
  let gesture = null;
  let pendingClick = null;

  function stopClick(event) {
    event.preventDefault();
    event.stopPropagation();
  }
  function release(captured) {
    track.classList.remove('is-dragging');
    if (track.hasPointerCapture?.(captured.id)) track.releasePointerCapture(captured.id);
  }
  function cancel(event) {
    if (!gesture || (event.pointerId !== undefined && event.pointerId !== gesture.id)) return;
    const captured = gesture;
    gesture = null;
    pendingClick = null;
    release(captured);
    if (captured.dragging) select(nearestIndex());
  }

  track.addEventListener('pointerdown', event => {
    pendingClick = null;
    if (event.button !== 0 || event.isPrimary === false || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    gesture = { id: event.pointerId, mouse: event.pointerType === 'mouse', x: event.clientX, y: event.clientY,
      lastX: event.clientX, left: track.scrollLeft, index: getIndex(), dragging: false, moved: false };
  }, true);
  track.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture.lastX = event.clientX;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) gesture.moved = true;
    if (!gesture.mouse) return; // Touch and trackpad scrolling stay native.
    if (!gesture.dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      gesture.dragging = true;
      track.classList.add('is-dragging');
      track.setPointerCapture(event.pointerId);
    }
    if (!gesture.dragging) return;
    event.preventDefault();
    const maximum = Math.max(0, track.scrollWidth - track.clientWidth);
    track.scrollLeft = Math.max(0, Math.min(maximum, gesture.left - dx));
  });
  document.addEventListener('pointerup', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const captured = gesture;
    gesture = null;
    pendingClick = { index: captured.index, dragged: captured.dragging || captured.moved };
    if (captured.dragging) {
      const destination = dragDestination({ distance: captured.lastX - captured.x, viewportWidth: track.clientWidth,
        startIndex: captured.index, nearestIndex: nearestIndex(), count: panels.length });
      release(captured);
      select(destination);
    }
  });
  document.addEventListener('pointercancel', cancel);
  track.addEventListener('lostpointercapture', cancel);
  document.defaultView?.addEventListener('blur', cancel);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') cancel(event);
    if (!gesture) pendingClick = null;
  }, true);
  track.addEventListener('dragstart', event => event.preventDefault());
  track.addEventListener('click', event => {
    const pending = pendingClick;
    pendingClick = null;
    if (pending?.dragged) { stopClick(event); return; }
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const index = panels.indexOf(event.target.closest('.series-panel'));
    if (index < 0 || index === (pending?.index ?? getIndex())) return;
    stopClick(event);
    select(index);
  }, true); // Capture before the anchor's route handler in home.js.
  track.classList.add('is-pointer-ready');
  return { isPointerActive: () => Boolean(gesture || pendingClick), isDragging: () => Boolean(gesture?.dragging) };
}
