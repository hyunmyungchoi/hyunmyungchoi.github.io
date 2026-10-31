import { runAstro } from './astro.mjs';
import { outputDirectory } from '../src/lib/paths.js';
import { getSite } from '../src/lib/posts.js';

const args = process.argv.slice(2);
const preview = args.includes('--preview');
process.env.BLOG_PREVIEW = String(preview);
const output = process.env.BLOG_OUTPUT || (preview ? '.preview' : 'dist');
await outputDirectory(output);
// 글 검증 실패 시 기존 빌드 결과를 지우기 전에 중단합니다.
const site = await getSite({ preview });
if (args.includes('--require-posts') && (!site.settings.url || !site.posts.some(post => post.published))) {
  throw new Error('배포 전 SITE_URL과 발행 승인된 글 1개 이상이 필요합니다. README.md를 확인하세요.');
}
await runAstro(['build'], { BLOG_OUTPUT: output });
