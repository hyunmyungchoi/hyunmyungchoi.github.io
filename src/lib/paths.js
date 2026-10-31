import fs from 'node:fs/promises';
import path from 'node:path';

export const ROOT = process.cwd();

export function contained(root, target) {
  const relative = path.relative(root, target);
  return Boolean(relative) && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}

export async function safeSource(relative) {
  const resolved = path.resolve(ROOT, relative);
  if (!contained(ROOT, resolved) || !contained(await fs.realpath(ROOT), await fs.realpath(resolved))) {
    throw new Error(`작업 폴더 밖의 파일: ${relative}`);
  }
  return resolved;
}

// Astro가 비우는 경로는 생성물 폴더로만 한정합니다.
export async function outputDirectory(relative = 'dist') {
  if (!['dist', '.preview'].includes(relative) && !/^\.test-output\/[a-zA-Z0-9_-]+$/.test(relative)) {
    throw new Error('출력은 dist, .preview, .test-output/<name>만 허용합니다.');
  }
  const output = path.resolve(ROOT, relative);
  for (const location of [path.dirname(output), output]) {
    const stat = await fs.lstat(location).catch(error => {
      if (error.code !== 'ENOENT') throw error;
    });
    if (stat?.isSymbolicLink()) throw new Error('심볼릭 링크 출력 경로는 허용하지 않습니다.');
  }
  return output;
}
