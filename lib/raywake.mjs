import { randomUUID } from 'node:crypto';
import { mkdir, open, rm, rename, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { json, saveJSON, fingerprint, validateRequest, decimal, link } from './util.mjs';
import { verifyMedia } from './render.mjs';

const pending = new Set(['queued', 'submitting', 'submitted', 'running', 'processing', 'finalizing']);
const success = new Set(['succeeded', 'completed']);
const retryable = new Set([429, 500, 502, 503, 504]);
const extensions = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif',
  'video/mp4': '.mp4', 'video/webm': '.webm', 'audio/mpeg': '.mp3', 'audio/mp3': '.mp3',
  'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/ogg': '.ogg', 'audio/flac': '.flac', 'audio/mp4': '.m4a' };
const wait = ms => new Promise(r => setTimeout(r, ms));
export class RaywakeError extends Error { constructor(message, status) { super(message); this.status = status; } }

function safeURL(value) {
  const u = new URL(value);
  if (u.username || u.password || (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname)))) {
    throw new Error('Use HTTPS for Raywake and media URLs. HTTP is only allowed on loopback for local tests.');
  }
  return u;
}

export class Raywake {
  constructor({ key = process.env.RAYWAKE_API_KEY, base = process.env.RAYWAKE_BASE_URL || 'https://api.raywake.com', fetch: transport = globalThis.fetch, sleep = wait, pollMs = 3000, timeoutMs = 60_000, attempts = 3 } = {}) {
    if (!key) throw new Error(`RAYWAKE_API_KEY is missing. Create a key: ${link('api-keys', 'missing-key')}`);
    this.key = key; this.base = safeURL(base).href.replace(/\/$/, ''); this.fetch = transport;
    this.sleep = sleep; this.pollMs = pollMs; this.timeoutMs = timeoutMs; this.attempts = attempts;
  }
  async request(method, path, body, key) {
    for (let attempt = 0; attempt < this.attempts; attempt++) {
      let response;
      try {
        response = await this.fetch(`${this.base}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(this.timeoutMs),
          headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json', 'User-Agent': 'motion-engine/0.1.0', ...(key ? { 'Idempotency-Key': key } : {}) },
          ...(body ? { body: JSON.stringify(body) } : {}) });
      } catch {
        if (attempt + 1 < this.attempts) { await this.sleep(1000 * 2 ** attempt); continue; }
        throw new RaywakeError('Raywake could not be reached. Keep the saved state and resume; do not start a replacement job.');
      }
      if (response.ok) {
        try { return await response.json(); } catch { throw new RaywakeError('Raywake returned an unreadable response. Keep the saved state and resume.'); }
      }
      if (retryable.has(response.status) && attempt + 1 < this.attempts) {
        const retryAfter = Number(response.headers.get('Retry-After'));
        await response.body?.cancel();
        await this.sleep(Math.min(30_000, retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt));
        continue;
      }
      const messages = { 401: 'Invalid or revoked API key.', 402: `Insufficient funds. ${link('billing', 'insufficient-funds')}`,
        403: 'Missing API-key permission. Check models:read, generate, jobs:read or wallet:read.',
        409: 'Quote expired, input changed, or idempotency conflict. Existing jobs must be resumed, never silently replaced.' };
      let detail = '';
      try { const body = await response.json(); detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail || ''); } catch {}
      detail = detail.split(this.key).join('[redacted]').slice(0, 400);
      throw new RaywakeError(`Raywake HTTP ${response.status}: ${messages[response.status] || detail || response.statusText}`, response.status);
    }
  }
  models(search = '', category = '') { return this.request('GET', `/v1/models?${new URLSearchParams({ search, category, limit: '50' })}`); }
  model(id) { return this.request('GET', `/v1/models/${id.split('/').map(encodeURIComponent).join('/')}`); }
  wallet() { return this.request('GET', '/v1/wallet'); }
  job(id) { return this.request('GET', `/v1/jobs/${encodeURIComponent(id)}`); }
  async quote(request) {
    validateRequest(request);
    const result = await this.request('POST', '/v1/quotes', request);
    if (!result.quote_id || !Number.isFinite(Date.parse(result.expires_at))) throw new Error('Incomplete Raywake quote. No generation started.');
    decimal(result.price_usd);
    return { version: 1, request_hash: fingerprint(request), request, quote: result, created_at: new Date().toISOString() };
  }
  async poll(job, { timeoutMs = 600_000, onUpdate = () => {} } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (true) {
      const status = job.status?.toLowerCase();
      onUpdate({ job_id: job.job_id, status });
      if (success.has(status)) return job;
      if (!pending.has(status)) throw new RaywakeError(`Job ${job.job_id || 'unknown'} is ${status || 'unknown'}. No replacement generation was started. Check it in Raywake or resume later.`);
      if (!job.job_id || Date.now() >= deadline) throw new RaywakeError(`Stopped waiting for job ${job.job_id || 'unknown'}. Resume from the saved state.`);
      await this.sleep(this.pollMs);
      job = await this.job(job.job_id);
    }
  }
  async download(job, out) {
    const outputs = job.outputs?.length ? job.outputs : job.image_url ? [{ url: job.image_url, type: 'image' }] : [];
    if (!outputs.length) throw new Error(`Job ${job.job_id} has no stored output yet. Resume later; no new generation is needed.`);
    await mkdir(dirname(resolve(out)), { recursive: true });
    const files = [];
    for (const [i, output] of outputs.entries()) {
      let url = safeURL(output.url), response;
      for (let redirect = 0; redirect <= 5; redirect++) {
        response = await this.fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(120_000) });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const next = response.headers.get('location'); await response.body?.cancel();
        if (!next || redirect === 5) throw new Error('Media redirect could not be followed. Resume to refresh the output link.');
        url = safeURL(new URL(next, url).href);
      }
      if (!response.ok) throw new Error(`Output download failed (${response.status}). Resume to refresh the link.`);
      const mime = (response.headers.get('content-type') || '').split(';')[0].trim();
      const declared = output.mime_type;
      const resolvedMime = mime === 'application/octet-stream' ? declared : mime;
      const ext = extensions[resolvedMime];
      if (!ext || (output.type && !resolvedMime.startsWith(`${output.type}/`))) { await response.body?.cancel(); throw new Error('Output is not a supported image, video or audio file.'); }
      const target = `${out}${outputs.length > 1 ? `-${i + 1}` : ''}${ext}`;
      const part = `${target}.part`;
      let size = 0;
      const limit = new Transform({ transform(chunk, encoding, callback) {
        size += chunk.length;
        callback(size > 512 * 1024 * 1024 ? new Error('Output exceeds the 512 MiB download limit.') : null, chunk);
      } });
      try {
        await pipeline(Readable.fromWeb(response.body), limit, createWriteStream(part, { mode: 0o600 }));
        if (!(await stat(part)).size) throw new Error('Output was empty.');
        await rename(part, target);
      } catch (e) { await rm(part, { force: true }); throw e; }
      files.push({ path: resolve(target), type: output.type || resolvedMime.split('/')[0], mime_type: resolvedMime, bytes: size });
    }
    return files;
  }
}

export async function withStateLock(path, work) {
  await mkdir(dirname(resolve(path)), { recursive: true });
  let lock;
  try { lock = await open(`${path}.lock`, 'wx', 0o600); }
  catch (e) { if (e.code === 'EEXIST') throw new Error(`Another process owns ${path}.lock. If it crashed, confirm it has stopped before removing that lock and resuming.`); throw e; }
  try { await lock.writeFile(String(process.pid)); return await work(); }
  finally { await lock.close(); await rm(`${path}.lock`, { force: true }); }
}

// Persist the exact body and key before the only call that can spend funds.
export async function generate(client, { request, quoted, statePath, out, maxUSD, approved = false, resume = false, onUpdate, verifyFile = verifyMedia }) {
  return withStateLock(statePath, async () => {
    let state;
    try { state = await json(statePath); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (state) {
      if (request && fingerprint(request) !== state.request_hash) throw new Error('This output already belongs to a different request. Choose another output name.');
      if (!resume) throw new Error(`A job already exists at ${statePath}. Use resume; this command will not create another.`);
      out = state.out;
    } else {
      if (resume) throw new Error('No saved state to resume.');
      validateRequest(request);
      if (!approved) throw new Error('Generation requires --yes and --max-usd after reviewing a quote.');
      if (quoted?.request_hash !== fingerprint(request) || fingerprint(quoted.request) !== fingerprint(request)) throw new Error('Quote does not match the exact request.');
      if (Date.parse(quoted.quote.expires_at) <= Date.now() || !Number.isFinite(Date.parse(quoted.quote.expires_at))) throw new Error('Quote expired. Request a fresh quote before starting.');
      if (!quoted.quote.quote_id) throw new Error('Missing quote ID.');
      if (decimal(quoted.quote.price_usd) > decimal(maxUSD)) throw new Error('Quoted amount exceeds --max-usd. No generation started.');
      state = { version: 1, request_hash: fingerprint(request), body: { ...request, quote_id: quoted.quote.quote_id },
        idempotency_key: randomUUID(), out: resolve(out), price_usd: quoted.quote.price_usd, status: 'prepared', created_at: new Date().toISOString() };
      await saveJSON(statePath, state);
    }
    if (state.status === 'downloaded') {
      try {
        if (!state.files?.length) throw new Error('Saved outputs are missing.');
        for (const file of state.files) await verifyFile(file.path, file.type);
        return state;
      } catch {
        // Refresh this job's output links if local media is missing or corrupt.
        state.status = 'download_pending';
        delete state.completed_at;
        await saveJSON(statePath, state);
      }
    }
    let job;
    if (state.job_id) job = await client.job(state.job_id);
    else {
      state.status = 'submitting'; await saveJSON(statePath, state);
      job = await client.request('POST', '/v1/generate', state.body, state.idempotency_key);
      if (!job.job_id) throw new Error('Submission returned no job ID. Resume with the saved idempotency key.');
      state.job_id = job.job_id; state.status = job.status; await saveJSON(statePath, state);
    }
    job = await client.poll(job, { onUpdate });
    state.status = job.status; state.charged_usd = job.charged_usd ?? null; await saveJSON(statePath, state);
    state.files = await client.download(job, state.out);
    for (const file of state.files) await verifyFile(file.path, file.type);
    state.status = 'downloaded'; state.completed_at = new Date().toISOString();
    await saveJSON(statePath, state);
    return state;
  });
}
