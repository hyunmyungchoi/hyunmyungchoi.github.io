export function integrationSettings(config = {}, overrides = {}) {
  const enabled = overrides.giscusEnabled ?? config.giscus?.enabled ?? false;
  if (![true, false, 'true', 'false'].includes(enabled)) throw new Error('GISCUS_ENABLED는 true 또는 false여야 합니다.');
  let giscus = null;
  if (enabled === true || enabled === 'true') {
    const value = config.giscus;
    if (!value || !/^[\w.-]+\/[\w.-]+$/.test(value.repo || '') ||
        !/^R_[\w-]+$/.test(value.repoId || '') || !/^DIC_[\w-]+$/.test(value.categoryId || '') ||
        typeof value.category !== 'string' || !value.category.trim()) {
      throw new Error('giscus 저장소와 Discussion 카테고리의 실제 ID를 설정하세요.');
    }
    giscus = { repo: value.repo, repoId: value.repoId, category: value.category, categoryId: value.categoryId };
  }
  const site = overrides.goatcounterSite ?? config.goatcounter?.site ?? '';
  if (typeof site !== 'string' || (site && !/^https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.goatcounter\.com\/?$/.test(site))) {
    throw new Error('GOATCOUNTER_SITE에는 https://계정이름.goatcounter.com 형식의 주소를 입력하세요.');
  }
  return { giscus, goatcounter: site ? { site: site.replace(/\/$/, '') } : null };
}

export function publicIntegrations(settings, { preview = false, noindex = false } = {}) {
  if (preview || noindex || !settings.url) return { giscus: null, goatcounter: null };
  return settings.integrations || { giscus: null, goatcounter: null };
}
