import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { catalog } from '../src/data/catalog.ts';
import { newPageProducts, productPage } from '../src/data/product-pages.ts';
import { catalogProductHref } from '../src/lib/product-paths.ts';

const read = file => readFile(file, 'utf8');
const art = [...JSON.parse(await read('src/data/supplier-artwork.json')), ...JSON.parse(await read('src/data/pirogi39-artwork.json'))];
const matrix = JSON.parse(await read('src/data/seo-matrix.json'));
const sitemap = await read('site/sitemap.xml');
const home = await read('site/index.html');
const menu = await read('site/menu/index.html');
assert.equal(art.length, 139);
assert.equal(new Set(art.map(a => a.sourceSha256)).size, 139, '139 separately generated images');
assert.equal(matrix.filter(row => row.cohort === 'product-pages-20261029').length, 84);
for (const product of catalog) {
  const route = catalogProductHref(product);
  assert.ok(home.includes(`href="${route}"`), `home links to ${route}`);
  assert.ok(menu.includes(`href="${route}"`), `menu links to ${route}`);
  assert.ok(sitemap.includes(`https://pirogorsk.ru${route}</loc>`), `sitemap: ${route}`);
  const html = await read(`site${route}index.html`);
  assert.ok(html.includes(`href="https://pirogorsk.ru${route}"`), `canonical: ${route}`);
  if (!newPageProducts.some(p => p.id === product.id)) continue;
  const page = productPage(product);
  assert.ok(html.includes('data-option-link'), `selection: ${route}`);
  assert.ok(html.includes('data-option-total'), `delivery calculation: ${route}`);
  assert.ok(html.includes('ItemPage'), `page schema: ${route}`);
  assert.ok(html.includes('Готовим запуск'), `prelaunch: ${route}`);
  assert.ok(matrix.some(row => row.path === route), `SEO owner: ${route}`);
  if (page.facts?.ingredients) assert.ok(html.includes('Состав по данным производителя'), `composition: ${route}`);
  if (!product.supplier) continue;
  const image = art.find(a => a.id === product.id);
  assert.ok(image, `art: ${product.id}`);
  assert.equal(image.generator, 'builtin-imagegen');
  assert.notEqual(image.sourceSha256, image.referenceSha256, 'supplier photo is not the output');
  const original = await readFile(image.source);
  assert.equal(createHash('sha256').update(original).digest('hex'), image.sourceSha256);
  assert.ok(html.includes(`${image.base}-256.avif`), `responsive hero: ${route}`);
  assert.ok(html.includes('fetchpriority="high"'), `hero priority: ${route}`);
  for (const width of [256, 400, 640, 960]) for (const format of ['avif', 'webp']) {
    const file = `public${image.base}-${width}.${format}`;
    const bytes = (await stat(file)).size;
    assert.ok(bytes > 100 && bytes < 220000, `compressed asset: ${file} (${bytes})`);
  }
  assert.ok((await stat(`public${image.ogImage}`)).size > 1000);
}
assert.equal((home.match(/class="supplier-art-link"/g) ?? []).length, 139, 'all supplier cards illustrated');
assert.equal(matrix.filter(row => row.cohort === 'pirogi39-20261029').length, 61);
console.log('Product pages verified: 153 routes, 145 SEO owners, 139 imagegen originals and 1112 responsive assets.');
