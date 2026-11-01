export function isProduction(location, origin) {
  return location.origin === origin && location.protocol === 'https:';
}

export function parseVisitorCount(value) {
  // 공개 API는 천 단위 쉼표가 포함된 문자열을 반환합니다. 오류를 0으로 바꾸지 않습니다.
  if (typeof value !== 'string' || !/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(value)) return null;
  const count = Number(value.replaceAll(',', ''));
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export async function showViews(element, fetchCount = fetch) {
  const value = element.querySelector('[data-view-value]');
  if (!value) return;
  try {
    const response = await fetchCount(`${element.dataset.viewSite}/counter/${encodeURIComponent(element.dataset.viewPath)}.json`, {
      credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(6000),
    });
    const count = parseVisitorCount((await response.json()).count);
    // 새 경로는 첫 집계 전 404와 count: "0"을 반환합니다. 다른 오류는 0으로 간주하지 않습니다.
    const empty = response.status === 404 && count === 0;
    if (!response.ok && !empty) throw new Error('Counter unavailable');
    if (count === null) throw new Error('Invalid counter');
    value.textContent = count.toLocaleString('ko-KR');
    element.dataset.viewState = empty ? 'empty' : 'ready';
  } catch (_) {
    value.textContent = '확인 불가';
    element.dataset.viewState = 'unavailable';
    element.title = '집계 준비 중이거나 조회수를 불러오지 못했습니다. 본문은 그대로 읽을 수 있습니다.';
  }
}

export function initializeAnalytics(doc, win) {
  const config = doc.querySelector('[data-analytics-site]');
  if (!config || !isProduction(win.location, config.dataset.productionOrigin)) return;
  const canonical = doc.querySelector('link[rel="canonical"]');
  if (!canonical) return;
  if (!doc.querySelector('script[data-goatcounter]')) {
    const script = doc.createElement('script');
    script.src = 'https://gc.zgo.at/count.js';
    script.async = true;
    script.dataset.goatcounter = config.dataset.analyticsSite + '/count';
    // 페이지 내 필터와 검색어는 보내지 않고, 이벤트 자동 수집도 끕니다.
    script.dataset.goatcounterSettings = JSON.stringify({ path: new URL(canonical.href).pathname, no_events: true });
    doc.head.appendChild(script);
  }
  const load = element => {
    if (!isProduction(win.location, element.dataset.productionOrigin)) return;
    if (element.dataset.viewState) return;
    element.dataset.viewState = 'loading';
    void showViews(element, win.fetch.bind(win));
  };
  const elements = doc.querySelectorAll('[data-view-site]');
  if (!win.IntersectionObserver) { elements.forEach(load); return; }
  const observer = new win.IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      observer.unobserve(entry.target);
      load(entry.target);
    }
  }, { rootMargin: '100px' });
  elements.forEach(element => observer.observe(element));
}

if (typeof document !== 'undefined') initializeAnalytics(document, window);
