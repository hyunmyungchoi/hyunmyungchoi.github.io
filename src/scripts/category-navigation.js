// One set of categories: always visible on desktop, a native disclosure on mobile.
export function createCategoryNavigation(root, viewport = matchMedia('(max-width: 760px)')) {
  const disclosure = root.querySelector('.category-browser');
  const current = root.querySelector('#category-current');
  let previousSelection = '';

  function resize() { disclosure.open = !viewport.matches; }
  viewport.addEventListener('change', resize);
  resize();

  return {
    update(selected, name) {
      const key = selected ? `${selected.type}:${selected.value}` : '';
      current.textContent = name || '전체 글';
      // Searching within the same category must not collapse an open disclosure.
      if (key !== previousSelection && viewport.matches) disclosure.open = false;
      previousSelection = key;
    },
  };
}
