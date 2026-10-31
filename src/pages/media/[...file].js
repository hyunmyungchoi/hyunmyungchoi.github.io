import fs from 'node:fs/promises';
import path from 'node:path';
import { getSite } from '../../lib/posts.js';

export async function getStaticPaths() {
  const { images } = await getSite();
  return [...images].map(([file, absolute]) => ({ params: { file }, props: { absolute } }));
}

export async function GET({ props }) {
  const types = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif' };
  return new Response(await fs.readFile(props.absolute), { headers: { 'Content-Type': types[path.extname(props.absolute).toLowerCase()] } });
}
