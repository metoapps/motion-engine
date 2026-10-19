import { createServer } from 'node:http';
import { stat, readFile, realpath } from 'node:fs/promises';
import { resolve, extname, sep, relative } from 'node:path';
const types = { '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.vtt': 'text/vtt', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.gif': 'image/gif' };
export async function serve(directory, port = 4173) {
  const root = await realpath(resolve(directory));
  const server = createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
      let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (path === '/') path = '/index.html';
      if (path.split('/').some(s => s.startsWith('.')) || /\.(state|quote)\.json$/.test(path)) throw new Error();
      let file = resolve(root, '.' + path);
      if (file !== root && !file.startsWith(root + sep)) throw new Error();
      if (!(await stat(file)).isFile()) throw new Error();
      file = await realpath(file);
      if (relative(root, file).startsWith('..')) throw new Error();
      const type = types[extname(file)]; if (!type) throw new Error();
      const data = await readFile(file);
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': data.length, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404).end('Not found'); }
  });
  await new Promise((yes, no) => { server.once('error', no); server.listen(port, '127.0.0.1', yes); });
  return server;
}
