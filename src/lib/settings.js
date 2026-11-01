import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './paths.js';
import { integrationSettings } from './integrations.js';

export function siteSettings(config, overrides = {}) {
  const value = overrides.url ?? config.url;
  let url = '';
  if (value) {
    const parsed = new URL(value);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
      throw new Error('SITE_URL에는 공개 HTTP(S) 도메인만 입력하세요. 하위 경로는 BASE_PATH로 지정합니다.');
    }
    url = parsed.origin;
  }
  const basePath = (overrides.basePath ?? config.basePath ?? '').replace(/\/$/, '');
  if (basePath && !/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(basePath)) {
    throw new Error('BASE_PATH는 /repository 형식이어야 합니다.');
  }
  return { ...config, url, basePath, integrations: integrationSettings(config.integrations, overrides.integrations), urlFor: route => `${basePath}/${route.replace(/^\//, '')}` };
}

export async function getSettings() {
  const config = JSON.parse(await fs.readFile(path.join(ROOT, 'src/data/site.json'), 'utf8'));
  return siteSettings(config, {
    url: process.env.SITE_URL,
    basePath: process.env.BASE_PATH,
    integrations: { giscusEnabled: process.env.GISCUS_ENABLED, goatcounterSite: process.env.GOATCOUNTER_SITE },
  });
}

export function isPreview() {
  return process.env.BLOG_PREVIEW === 'true' || Boolean(import.meta.env?.DEV);
}
