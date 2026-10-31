import { getSettings, isPreview } from '../lib/settings.js';

export async function GET() {
  const settings = await getSettings();
  const body = isPreview() ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n${settings.url ? `Sitemap: ${settings.url}${settings.urlFor('sitemap.xml')}\n` : ''}`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
