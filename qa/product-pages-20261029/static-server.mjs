// Local HTTP/1.1 verification server with text compression, like production.
// Python's HTTP/1.0 server drops concurrent asset connections in Lighthouse.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { gzipSync } from 'node:zlib';
const root = resolve('site');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
createServer(async (request, response) => {
  try {
    let file = resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (file !== root && !file.startsWith(root + '/')) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file += '/index.html';
    let body = await readFile(file);
    const type = mime[extname(file)] || 'application/octet-stream';
    response.setHeader('Content-Type', type);
    if (/html|css|javascript|json|xml/.test(type) && /gzip/.test(request.headers['accept-encoding'] || '')) {
      body = gzipSync(body); response.setHeader('Content-Encoding', 'gzip'); response.setHeader('Vary', 'Accept-Encoding');
    }
    if (/\/_astro\/|\/fonts\/|\/catalog-art\//.test(file)) response.setHeader('Cache-Control', 'public, max-age=3600');
    response.setHeader('Content-Length', body.length);
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(404).end('Not found'); }
}).listen(4325, '127.0.0.1', () => console.log('QA server http://127.0.0.1:4325/'));
