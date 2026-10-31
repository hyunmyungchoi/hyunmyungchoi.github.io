import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { seriesNames } from '../data/navigation.js';
import { ROOT, safeSource, contained } from './paths.js';
import { getSettings, isPreview } from './settings.js';
import { renderMarkdown } from './markdown.js';
import { pickMostRead } from './popular-post.js';

export function parsePost(text, filename) {
  const match = text.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: 파일 상단에 --- 메타데이터가 필요합니다.`);
  const data = parse(match[1]);
  const slug = path.basename(filename, '.md');
  const body = match[2].trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${filename}: 파일명은 영문 소문자·숫자·하이픈만 사용하세요.`);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${filename}: 메타데이터 형식을 확인하세요.`);
  for (const field of ['title', 'summary']) {
    if (typeof data[field] !== 'string' || !data[field].trim()) throw new Error(`${filename}: ${field}가 필요합니다.`);
  }
  if (typeof data.series !== 'string' || !Object.hasOwn(seriesNames, data.series)) throw new Error(`${filename}: 연재는 ${Object.keys(seriesNames).join(', ')} 중 선택하세요.`);
  if (!Array.isArray(data.tags) || !data.tags.every(tag => typeof tag === 'string' && tag.trim() && !tag.includes(','))) throw new Error(`${filename}: tags 형식을 확인하세요.`);
  if (typeof data.draft !== 'boolean') throw new Error(`${filename}: draft는 true 또는 false여야 합니다.`);
  const date = data.date ?? null;
  if (date !== null && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) {
    throw new Error(`${filename}: date는 유효한 YYYY-MM-DD 날짜여야 합니다.`);
  }
  if (!data.draft && (!date || !body)) throw new Error(`${filename}: 발행하려면 실제 발행일과 본문이 필요합니다.`);
  if (data.order !== undefined && (!Number.isSafeInteger(data.order) || data.order < 0)) throw new Error(`${filename}: order는 0 이상의 정수여야 합니다.`);
  return { ...data, slug, body, published: !data.draft, publishedAt: date, hasBody: Boolean(body) };
}

export async function readPosts({ preview = isPreview(), directory = process.env.BLOG_CONTENT_DIR || 'src/content/posts' } = {}) {
  const folder = await safeSource(directory);
  const entries = await fs.readdir(folder, { withFileTypes: true });
  const posts = [];
  for (const entry of entries) {
    if (!entry.name.endsWith('.md')) continue;
    const filename = await safeSource(path.join(directory, entry.name));
    const post = parsePost(await fs.readFile(filename, 'utf8'), entry.name);
    // 미발행 본문은 렌더링하지 않습니다. 이미지도 공개 빌드로 복사하지 않습니다.
    if (!preview && post.draft) continue;
    posts.push({ ...post, source: path.relative(ROOT, filename).replaceAll('\\', '/') });
  }
  return posts.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '') || (a.order ?? 9999) - (b.order ?? 9999) || a.slug.localeCompare(b.slug));
}

export async function getSite({ preview = isPreview(), directory } = {}) {
  const settings = await getSettings();
  const posts = await readPosts({ preview, directory });
  const images = new Map();
  for (const post of posts) {
    const rendered = post.hasBody ? await renderMarkdown(post.body, {
      source: post.source, posts, urlFor: settings.urlFor,
      copyAsset: async absolute => {
        const relative = path.relative(ROOT, absolute).replaceAll('\\', '/');
        if ((!contained(path.join(ROOT, 'src/content/images'), absolute) && !contained(path.join(ROOT, 'assets'), absolute)) || !/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(relative)) {
          throw new Error(`허용되지 않은 본문 이미지: ${relative}`);
        }
        await safeSource(relative);
        images.set(relative, absolute);
        return settings.urlFor('media/' + relative.split('/').map(encodeURIComponent).join('/'));
      },
    }) : { html: '<p>아직 본문을 작성하지 않은 글입니다.</p>', headings: [] };
    Object.assign(post, rendered);
  }
  const metrics = JSON.parse(await fs.readFile(path.join(ROOT, 'src/data/views.json'), 'utf8'));
  const ranked = pickMostRead(posts.map(post => ({ id: post.slug, eligible: post.published })), metrics.views);
  const featured = ranked ? posts[ranked.index] : posts.find(post => post.slug === settings.featuredSlug && post.hasBody) || posts.find(post => post.hasBody);
  return { settings, posts, images, featured, ranked, preview };
}
