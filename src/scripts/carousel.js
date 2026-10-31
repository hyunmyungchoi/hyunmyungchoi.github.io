export function createCarousel(reducedMotion) {
  const track = document.querySelector('#series-track');
  const cards = [...track.querySelectorAll('.home-series-entry')];
  const previous = document.querySelector('#series-prev');
  const next = document.querySelector('#series-next');

  function update() {
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= Math.max(0, track.scrollWidth - track.clientWidth) - 2;
  }

  function scroll(direction) {
    const positions = cards.map(card => card.offsetLeft - cards[0].offsetLeft);
    const target = direction > 0
      ? positions.find(position => position > track.scrollLeft + 4)
      : positions.slice().reverse().find(position => position < track.scrollLeft - 4);
    track.scrollTo({ left: target ?? (direction > 0 ? track.scrollWidth : 0), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }

  previous.addEventListener('click', () => scroll(-1));
  next.addEventListener('click', () => scroll(1));
  track.addEventListener('scroll', update, { passive: true });
  track.addEventListener('keydown', event => {
    if (event.target !== track) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      scroll(event.key === 'ArrowRight' ? 1 : -1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      track.scrollTo({ left: event.key === 'Home' ? 0 : track.scrollWidth, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    }
  });
  new ResizeObserver(update).observe(track);
  return { track, cards, update };
}
