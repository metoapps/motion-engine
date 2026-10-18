import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

export const root = resolve(import.meta.dirname, '..');
export const json = async path => JSON.parse(await readFile(path, 'utf8'));
export async function saveJSON(path, value) {
  await mkdir(dirname(resolve(path)), { recursive: true });
  const tmp = `${path}.${process.pid}.part`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  await rename(tmp, path);
}
export const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function link(path = '', content = 'cli') {
  return `https://raywake.si/${path}?utm_source=github&utm_medium=motion-engine&utm_campaign=oss&utm_content=${encodeURIComponent(content)}`;
}
export async function loadEnv(path = '.env') {
  let text;
  try { text = await readFile(path, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(RAYWAKE_API_KEY|RAYWAKE_BASE_URL|CHROME_PATH)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
export function validateRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request) ||
      typeof request.model !== 'string' || !request.model.trim() ||
      !request.input || typeof request.input !== 'object' || Array.isArray(request.input)) {
    throw new Error('Request must contain a model string and an input object.');
  }
  if (Object.keys(request).some(k => !['model', 'input'].includes(k))) throw new Error('Only model and input belong in a request file.');
  return request;
}
export function decimal(value) {
  if (typeof value !== 'string' || !/^\d+(\.\d{1,8})?$/.test(value)) throw new Error('Expected a non-negative USD decimal string.');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100000000n + BigInt(fraction.padEnd(8, '0'));
}
