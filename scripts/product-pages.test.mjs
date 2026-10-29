import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog, products } from '../src/data/catalog.ts';
import { newPageProducts, productPage } from '../src/data/product-pages.ts';
import { catalogProductHref, selectionHref } from '../src/lib/product-paths.ts';

test('every catalog position has one unique page and the eight published pie URLs stay stable', () => {
  assert.equal(newPageProducts.length, 84);
  const routes = catalog.map(catalogProductHref);
  assert.equal(new Set(routes).size, 92);
  assert.deepEqual(products.map(catalogProductHref), [
    '/pirogi/myasnoy-pirog/', '/pirogi/rybnyy-pirog/', '/pirogi/pirog-s-kapustoy/', '/pirogi/syrnyy-pirog/',
    '/pirogi/pirog-s-kuritsey-i-gribami/', '/pirogi/pirog-s-yablokom-i-brusnikoy/',
    '/pirogi/pirog-s-vishney/', '/pirogi/pirog-s-tvorogom-i-malinoy/',
  ]);
  const pages = newPageProducts.map(productPage);
  assert.equal(new Set(pages.map(p => p.heading)).size, 84, 'same-name dough packs have distinct headings');
  assert.equal(new Set(pages.map(p => p.intro)).size, 84, 'each position has its own introduction');
  for (const page of pages) {
    assert.ok(page.description.length >= 60 && page.description.length <= 240, page.heading);
    assert.ok(page.related.every(p => catalogProductHref(p) !== page.href));
  }
});

test('every variant links to the actual interest selection with the correct section', () => {
  for (const product of catalog) for (const variant of product.variants) {
    const url = new URL(selectionHref(product, variant.value), 'https://pirogorsk.ru');
    assert.equal(url.pathname, '/');
    assert.equal(url.searchParams.get('interest'), product.id);
    assert.equal(Number(url.searchParams.get('variant')), variant.value);
    assert.equal(url.hash, product.kind === 'bakery' ? '#holland' : product.kind === 'pie' ? '#pirogi' : '#extras');
  }
});
