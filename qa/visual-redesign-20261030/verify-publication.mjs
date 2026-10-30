import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { catalog } from '../../src/data/catalog.ts';
import { catalogProductHref } from '../../src/lib/product-paths.ts';

const runtime = execFileSync('git', ['rev-parse', process.argv[2] || 'HEAD'], { encoding: 'utf8' }).trim();
const origin = 'https://pirogorsk.ru';
const emitted = await readdir(new URL('../../site/', import.meta.url), { recursive: true });
const htmlPaths = emitted.filter(path => path.endsWith('.html')).map(path => `/${path}`.replace(/index\.html$/, ''));
const paths = new Set([...htmlPaths, '/sitemap.xml', '/release.json',
  ...['playfair-cyrillic', 'playfair-latin', 'golos-cyrillic', 'golos-latin'].map(face => `/fonts/${face}.woff2`)]);
// Product image components are also used by the home/menu: compare every emitted HTML document.
for (const product of catalog) paths.add(catalogProductHref(product));
const file = path => new URL(`../../site${path}${path.endsWith('/') ? 'index.html' : ''}`, import.meta.url);
for (const path of htmlPaths) {
  const html = await readFile(file(path), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="(\/_astro\/[^"?]+\.(?:js|css))"/g)) paths.add(match[1]);
}
// Read back every responsive hero scene asset as well as shared code and pages.
const home = await readFile(file('/'), 'utf8');
for (const asset of home.matchAll(/\/_astro\/hero-fish-scene[^\s"<>]+\.(?:avif|webp)/g)) paths.add(asset[0]);
const files = [];
const queue = [...paths];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const path = queue.shift();
    const expected = await readFile(file(path));
    const response = await fetch(new URL(path, origin), { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(30000) });
    const actual = Buffer.from(await response.arrayBuffer());
    const item = { path, status: response.status, sha256: createHash('sha256').update(actual).digest('hex'),
      bytes: actual.length, encoding: response.headers.get('content-encoding'), matchesBuild: expected.equals(actual) };
    files.push(item);
  }
}));
files.sort((a, b) => a.path.localeCompare(b.path));
await writeFile(new URL('./publication.json', import.meta.url), JSON.stringify({ checkedAt: new Date().toISOString(), runtime,
  ci: process.argv[3] || null, htmlPages: htmlPaths.length, productPages: catalog.length, files }, null, 2) + '\n');
assert.ok(files.every(file => file.status === 200 && file.matchesBuild), JSON.stringify(files.filter(file => file.status !== 200 || !file.matchesBuild)));
console.log(`Production readback PASS: ${files.length} HTML/XML/JSON/JS/CSS resources match the local build, runtime ${runtime}`);
