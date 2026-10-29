// Tiny static server for local testing: node scripts/serve.mjs [port]. No caching, correct module MIME types.
import { createServer } from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, extname, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +(process.argv[2] || process.env.PORT || 8123);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon'
};

createServer(async (req, res) => {
  // ?trace pages (site/trace.js) post their record here; it's saved in traces/ (not committed)
  if (req.method === 'POST' && new URL(req.url, 'http://x').pathname === '/__trace') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 20e6) req.destroy(); });
    req.on('end', async () => {
      const name = `trace-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      await mkdir(join(ROOT, 'traces'), { recursive: true });
      await writeFile(join(ROOT, 'traces', name), body);
      console.log('trace saved: traces/' + name);
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ file: name }));
    });
    return;
  }
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  let file = join(ROOT, path);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}/`));
