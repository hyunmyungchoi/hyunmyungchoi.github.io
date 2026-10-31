import path from 'node:path';
import { load } from 'cheerio';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { ROOT, contained } from './paths.js';

export async function renderMarkdown(markdown, {source, posts = [], urlFor = value => '/' + value, copyAsset, copyAttachment} = {}) {
  // 페이지 제목은 Markdown 메타데이터에서 표시하므로 첫 H1은 중복하지 않습니다.
  const body = markdown.replace(/^\uFEFF/, '').replace(/^# [^\r\n]+\r?\n+/, '');
  const clean = sanitizeHtml(marked.parse(body, {gfm:true}), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'details', 'summary'],
    allowedAttributes: {a:['href','title'], img:['src','alt','title','width','height'], code:['class']},
    allowedSchemes: ['https','http','mailto'], allowProtocolRelative:false
  });
  const $ = load(clean, null, false);
  const headings = [], used = new Set();
  $('h1').each((_, element) => { element.tagName = 'h2'; });
  $('h2,h3').each((_, element) => {
    const heading = $(element), text = heading.text();
    const stem = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'section';
    let id = stem, number = 2;
    while (used.has(id)) id = `${stem}-${number++}`;
    used.add(id); heading.attr('id', id);
    headings.push({id, text, level:element.tagName});
  });
  $('table').wrap('<div class="table-scroll" tabindex="0" role="region" aria-label="표 가로 스크롤"></div>');
  $('pre').attr('tabindex','0').attr('aria-label','코드 블록');
  $('img').attr('loading','lazy').attr('decoding','async');
  for (const element of $('a[href],img[src]').toArray()) {
    const item = $(element), attribute = element.tagName === 'img' ? 'src' : 'href';
    const original = item.attr(attribute);
    if (/^(https?:|mailto:|#)/i.test(original)) continue;
    if (!source) throw new Error(`상대 링크의 원본 경로가 없습니다: ${original}`);
    const [pathname, hash = ''] = original.split('#');
    const resolved = path.resolve(path.dirname(path.resolve(ROOT, source)), decodeURIComponent(pathname));
    if (!contained(ROOT, resolved)) throw new Error(`폴더 밖의 링크: ${original}`);
    const target = posts.find(post => post.source && path.resolve(ROOT, post.source) === resolved);
    if (target && attribute === 'href') {
      item.attr(attribute, urlFor(`posts/${target.slug}/`) + (hash ? '#' + hash : ''));
    } else if (attribute === 'href' && /\.pdf$/i.test(resolved) && copyAttachment) {
      item.attr(attribute, await copyAttachment(resolved) + (hash ? '#' + hash : ''));
      item.attr('download', path.basename(resolved));
    } else if (attribute === 'src' && copyAsset) {
      item.attr(attribute, await copyAsset(resolved));
    } else {
      throw new Error(`배포에 포함되지 않는 로컬 링크: ${original}`);
    }
  }
  return {html:$.html(), headings};
}
