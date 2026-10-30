import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve('site');
const cache = new Map();
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root + sep)) throw new Error('Invalid path');
    let body = cache.get(file);
    if (!body) { body = await readFile(file); cache.set(file, body); }
    const extension = extname(file);
    const headers = { 'Content-Type': types[extension] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
    if (/\.(html|css|js|json|svg)$/.test(file) && request.headers['accept-encoding']?.includes('gzip')) {
      body = gzipSync(body); headers['Content-Encoding'] = 'gzip';
    }
    response.writeHead(200, headers); response.end(body);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(4323, '127.0.0.1', () => console.log('Gzip static QA server: http://127.0.0.1:4323/'));
