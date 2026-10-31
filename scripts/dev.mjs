import { runAstro } from './astro.mjs';

const production = process.argv.includes('--production');
await runAstro([production ? 'preview' : 'dev'], { BLOG_PREVIEW: String(!production) });
