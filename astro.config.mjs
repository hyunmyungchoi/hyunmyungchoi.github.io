import { defineConfig } from 'astro/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSettings } from './src/lib/settings.js';
import { readPosts } from './src/lib/posts.js';
import { outputDirectory } from './src/lib/paths.js';

const settings = await getSettings();
const preview = process.env.BLOG_PREVIEW === 'true';
const outDir = await outputDirectory(process.env.BLOG_OUTPUT || (preview ? '.preview' : 'dist'));
const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export default defineConfig({
  output: 'static',
  site: settings.url || undefined,
  base: settings.basePath || '/',
  trailingSlash: 'always',
  outDir,
  devToolbar: { enabled: false },
  server: { host: '127.0.0.1', port: 8765 },
  build: { format: 'directory', inlineStylesheets: 'never' },
  vite: { server: { watch: { ignored: ['**/.test-output/**', '**/legacy/**', '**/dist/**', '**/.preview/**'] } } },
  integrations: [{
    name: 'blog-content',
    hooks: {
      'astro:server:setup': ({ server }) => {
        // Markdown은 fs로 읽으므로 편집 시 브라우저 갱신을 명시적으로 알립니다.
        server.watcher.on('all', (event, filename) => {
          if (['add', 'change', 'unlink'].includes(event) && /[/\\]src[/\\](content|data)[/\\]/.test(filename)) {
            server.ws.send({ type: 'full-reload', path: '*' });
          }
        });
      },
      'astro:build:done': async ({ dir }) => {
        const destination = fileURLToPath(dir);
        const posts = await readPosts({ preview });
        await fs.writeFile(path.join(destination, 'build-info.json'), JSON.stringify({ preview, postCount: posts.length, publishedCount: posts.filter(post => post.published).length, basePath: settings.basePath }));
        if (!preview && settings.url) {
          const entries = [{ route: '', date: null }, ...posts.map(post => ({ route: `posts/${post.slug}/`, date: post.publishedAt }))];
          const sitemap = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + entries.map(entry => `<url><loc>${xml(settings.url + settings.urlFor(entry.route))}</loc>${entry.date ? `<lastmod>${entry.date}</lastmod>` : ''}</url>`).join('') + '</urlset>';
          await fs.writeFile(path.join(destination, 'sitemap.xml'), sitemap);
        }
      },
    },
  }],
});
