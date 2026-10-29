import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { catalog } from '../../src/data/catalog.ts';
import { catalogProductHref } from '../../src/lib/product-paths.ts';
import artwork from '../../src/data/supplier-artwork.json' with { type: 'json' };
const origin = process.argv[2] || 'https://pirogorsk.ru';
const paths = ['/', '/menu/', '/sitemap.xml', '/release.json', '/journal/skolko-piroga-na-cheloveka/', ...catalog.map(catalogProductHref), ...artwork.flatMap(art => [`${art.base}-400.avif`, art.ogImage])];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const results = [];
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < paths.length) {
    const path = paths[next++];
    const local = `site${path}${path.endsWith('/') ? 'index.html' : ''}`;
    const expected = await readFile(local);
    const url = new URL(path, origin); url.searchParams.set('verify', String(Date.now()));
    const response = await fetch(url, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
    assert.equal(response.status, 200, `${path}: HTTP status`);
    const actual = Buffer.from(await response.arrayBuffer());
    assert.equal(sha(actual), sha(expected), `${path}: published bytes equal build`);
    results.push({ path, status: response.status, bytes: actual.length, sha256: sha(actual) });
  }
}));
assert.equal(results.length, paths.length);
const report = { origin, checkedAt: new Date().toISOString(), products: catalog.length, illustratedProducts: artwork.length, compared: results.length, results: results.sort((a,b) => a.path.localeCompare(b.path)) };
await writeFile(new URL('./production-byte-readback.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ origin, products: catalog.length, compared: results.length, byteEquality: true }));
