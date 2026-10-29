import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { freshProducts } from '../../src/data/pirogi39-catalog.ts';
import { catalogProductHref } from '../../src/lib/product-paths.ts';
const origin = process.argv[2] || 'https://pirogorsk.ru';
const sha = data => createHash('sha256').update(data).digest('hex');
const results = [];
let cursor = 0;
async function runner() {
  while (cursor < freshProducts.length) {
    const product = freshProducts[cursor++];
    const path = catalogProductHref(product);
    const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.equal(sha(html), sha(await readFile(`site${path}index.html`)), `published HTML: ${path}`);
    assert.ok(html.includes(`href="https://pirogorsk.ru${path}"`));
    assert.ok(html.includes('fetchpriority="high"'));
    const imagePath = `/catalog-art/${product.id}-400.avif`;
    const image = await fetch(`${origin}${imagePath}`, { signal: AbortSignal.timeout(30000) });
    assert.equal(image.status, 200, imagePath);
    const pixels = Buffer.from(await image.arrayBuffer());
    assert.equal(sha(pixels), sha(await readFile(`public${imagePath}`)), imagePath);
    results.push({ id: product.id, path, status: response.status, htmlSha256: sha(html), imagePath, imageSha256: sha(pixels) });
  }
}
await Promise.all(Array.from({ length: 6 }, runner));
for (const path of ['/', '/menu/']) {
  const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.equal(sha(html), sha(await readFile(path === '/' ? 'site/index.html' : 'site/menu/index.html')), path);
  assert.equal((html.match(/class="supplier-art-link"/g) || []).length, 139);
}
const sitemap = await fetch(`${origin}/sitemap.xml`).then(r => r.text());
for (const product of freshProducts) assert.ok(sitemap.includes(`https://pirogorsk.ru${catalogProductHref(product)}</loc>`));
const release = await fetch(`${origin}/release.json`).then(r => r.json());
assert.deepEqual(release, JSON.parse(await readFile('site/release.json', 'utf8')));
await writeFile(new URL('published-readback.json', import.meta.url), JSON.stringify({ origin, checkedAt: new Date().toISOString(), release, pages: results.sort((a,b) => a.id.localeCompare(b.id)), catalogCards: 139 }, null, 2) + '\n');
console.log(JSON.stringify({ origin, pages: results.length, matchingOriginals: results.length, catalogCards: 139, release }));
