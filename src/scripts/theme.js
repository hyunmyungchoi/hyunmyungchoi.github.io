(() => {
  const toggle = document.querySelector('#theme-toggle');
  if (!toggle) return;
  function update() {
    const dark = document.documentElement.dataset.theme === 'dark';
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.setAttribute('aria-label', dark ? '라이트 모드로 전환' : '다크 모드로 전환');
    toggle.title = toggle.getAttribute('aria-label');
    document.querySelector('meta[name="theme-color"]').content = dark ? '#000000' : '#ffffff';
  }
  toggle.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('nuxnux-theme',theme); } catch (_) { /* Optional preference only. */ }
    update();
  });
  update();
})();
