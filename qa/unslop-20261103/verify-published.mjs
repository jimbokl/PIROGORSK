import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const base = 'https://pirogorsk.ru';
const paths = ['/', '/menu/', '/delivery/', '/zelenogradsk/', '/blog/',
  '/journal/dostavka-edy-v-zelenogradske/', '/pirogi/rybnyy-pirog/',
  '/catalog/pirog-rzhanoy-zakusochnyy-s-seldyu-1100-g/', '/nabory/', '/podbor/'];
const digest = value => createHash('sha256').update(value).digest('hex');
const blocks = html => [...html.matchAll(/<(script|style)\b([^>]*)>([\s\S]*?)<\/\1>/g)]
  .filter(([, tag, attributes]) => tag === 'style' || !/\bsrc=/.test(attributes))
  .map(([, tag, , code]) => ({ tag, sha256: digest(code) }));
const report = { timestamp: new Date().toISOString(), pages: [], assets: [], fonts: [] };
const assets = new Set();
for (const path of paths) {
  const response = await fetch(base + path, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, path);
  const html = await response.text();
  const local = await readFile(`site${path}index.html`, 'utf8');
  assert.deepEqual(blocks(html), blocks(local), `${path}: inline CSS/JS differs from tested build`);
  const extractAssets = source => [...new Set([...source.matchAll(/(?:src|href)="(\/_astro\/[^"?]+\.(?:js|css))"/g)].map(([, url]) => url))];
  assert.deepEqual(extractAssets(html), extractAssets(local), `${path}: asset references differ`);
  extractAssets(html).forEach(asset => assets.add(asset));
  report.pages.push({ path, blocks: blocks(html) });
}
for (const path of assets) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, path);
  const actual = digest(Buffer.from(await response.arrayBuffer()));
  assert.equal(actual, digest(await readFile(`site${path}`)), path);
  report.assets.push({ path, sha256: actual });
}
for (const name of ['golos-cyrillic', 'golos-latin', 'playfair-cyrillic', 'playfair-latin']) {
  const path = `/fonts/${name}.woff2`;
  const response = await fetch(base + path, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, path);
  report.fonts.push({ path, status: response.status });
}
await writeFile(new URL('./published-assets.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(`PASS: ${paths.length} published pages, ${report.pages.reduce((n, page) => n + page.blocks.length, 0)} inline blocks, ${assets.size} assets match tested build SHA256; four fonts HTTP 200.`);
