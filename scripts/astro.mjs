import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

export async function runAstro(args, environment = {}) {
  const require = createRequire(import.meta.url);
  const manifestPath = require.resolve('astro/package.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const entry = path.resolve(path.dirname(manifestPath), manifest.bin.astro);
  const child = spawn(process.execPath, [entry, ...args], {
    stdio: 'inherit', env: { ...process.env, ...environment, ASTRO_TELEMETRY_DISABLED: '1' },
  });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
  // 터미널 종료 시 소유한 개발 서버도 함께 종료합니다.
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
  return child;
}
