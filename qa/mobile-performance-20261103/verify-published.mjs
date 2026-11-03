import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const base = 'https://pirogorsk.ru/';
const digest = value => createHash('sha256').update(value).digest('hex');
const local = await readFile('site/index.html', 'utf8');
const response = await fetch(base, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
assert.equal(response.status, 200);
const published = await response.text();
const inline = html => [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(([, attributes]) => !/\bsrc=/.test(attributes)).map(([, , code]) => digest(code));
const styles = html => [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)]
  .map(([, css]) => digest(css));
const preload = html => [...html.matchAll(/<link\b[^>]*>/g)]
  .map(([tag]) => tag).filter(tag => /rel="preload"/.test(tag) && /as="image"/.test(tag));
assert.deepEqual(inline(published), inline(local), 'published inline scripts differ from tested build');
assert.deepEqual(styles(published), styles(local), 'published inline styles differ from tested build');
assert.equal(preload(published).length, 2);
assert.deepEqual(preload(published), preload(local), 'published responsive preload differs');
const report = { url: base, timestamp: new Date().toISOString(), inlineSha256: inline(published), styleSha256: styles(published), preloads: preload(published), assets: [], fonts: [] };
const assets = [...new Set([...published.matchAll(/(?:src|href)="(\/_astro\/[^"?]+\.(?:js|css))"/g)].map(([, url]) => url))];
for (const path of assets) {
  const asset = await fetch(new URL(path, base), { signal: AbortSignal.timeout(20000) });
  assert.equal(asset.status, 200, path);
  const actual = digest(Buffer.from(await asset.arrayBuffer()));
  assert.equal(actual, digest(await readFile(`site${path}`)), path);
  report.assets.push({ path, sha256: actual });
}
for (const name of ['golos-cyrillic', 'golos-latin', 'playfair-cyrillic', 'playfair-latin']) {
  const path = `/fonts/${name}.woff2`;
  const font = await fetch(new URL(path, base), { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(20000) });
  assert.equal(font.status, 200, path);
  report.fonts.push({ path, status: font.status, cacheControl: font.headers.get('cache-control') });
}
await writeFile('qa/mobile-performance-20261103/published-assets.json', JSON.stringify(report, null, 2) + '\n');
console.log(`PASS published: ${report.inlineSha256.length} inline scripts, ${report.styleSha256.length} inline styles, ${assets.length} assets match build SHA256, both responsive preload tags match, four fonts HTTP 200.`);
