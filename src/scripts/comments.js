import { isProduction } from './analytics.js';

export function commentTheme(doc) {
  return doc.documentElement.dataset.theme === 'dark' ? 'dark_high_contrast' : 'light';
}

export function initializeComments(doc, win) {
  const section = doc.querySelector('[data-comments]');
  if (!section || !isProduction(win.location, section.dataset.productionOrigin)) return;
  const mount = section.querySelector('[data-comments-mount]');
  if (!mount) return;
  let started = false;
  function load() {
    if (started) return;
    started = true;
    const script = doc.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    Object.assign(script.dataset, {
      repo: section.dataset.repo, repoId: section.dataset.repoId,
      category: section.dataset.category, categoryId: section.dataset.categoryId,
      mapping: 'pathname', strict: '1', reactionsEnabled: '1', emitMetadata: '0',
      inputPosition: 'top', theme: commentTheme(doc), lang: 'ko', loading: 'lazy',
    });
    mount.appendChild(script);
    const observer = new win.MutationObserver(() => {
      mount.querySelector('iframe.giscus-frame')?.contentWindow?.postMessage({ giscus: { setConfig: { theme: commentTheme(doc) } } }, 'https://giscus.app');
    });
    observer.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    win.addEventListener('pagehide', () => observer.disconnect(), { once: true });
  }
  if (!win.IntersectionObserver) { load(); return; }
  const observer = new win.IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load(); }
  }, { rootMargin: '300px' });
  observer.observe(section);
}

if (typeof document !== 'undefined') initializeComments(document, window);
