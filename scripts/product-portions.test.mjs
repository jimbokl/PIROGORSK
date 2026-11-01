import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPiePortions, hasPortionPrice, portionSummary, portionPriceLabel } from '../src/lib/product-portions.ts';
import { compositionSummary } from '../src/lib/composition-summary.ts';
import { catalog } from '../src/data/catalog.ts';
import { bundles } from '../src/data/bundles.ts';

test('portion prices compare actual grams, preserve from prices and ignore the number of pies', () => {
  assert.equal(portionPriceLabel(690, 500), '≈ 345 ₽ за порцию 250 г');
  assert.equal(portionPriceLabel(1290, 1000), '≈ 323 ₽ за порцию 250 г');
  assert.equal(portionPriceLabel(5350, 2400), '≈ 557 ₽ за порцию 250 г');
  assert.equal(portionPriceLabel(1290, 1000, true), 'от 323 ₽ за порцию 250 г');
  for (const quantity of [1, 2, 99]) assert.equal(portionPriceLabel(1290 * quantity, 1000 * quantity), portionPriceLabel(1290, 1000));
  for (const args of [[0, 500], [-1, 500], [NaN, 500], [Infinity, 500], [690, 0], [690, 1.5], [690, Infinity]]) assert.equal(portionPriceLabel(...args), '');
});

test('only whole pies get a 250 g price; catalog prices and bundle totals remain unchanged', () => {
  const eligible = catalog.filter(hasPortionPrice);
  assert.equal(eligible.length, 69);
  for (const product of catalog.filter(p => ['mini-pies', 'drinks', 'accessories', 'bread', 'desserts', 'bake', 'dough'].includes(p.category))) assert.equal(hasPortionPrice(product), false, product.id);
  assert(eligible.every(p => p.variants.every(v => portionPriceLabel(v.price, v.value).endsWith('за порцию 250 г'))));
  const prices = bundles.map(bundle => bundle.items.reduce((sum, item) => sum + catalog.find(p => p.id === item.id).prices[item.value] * item.quantity, 0));
  assert.deepEqual(prices, [1280, 3470, 5350, 5350, 8630]);
  assert.deepEqual(prices.map((price, i) => portionPriceLabel(price, compositionSummary(bundles[i].items, catalog).pieGrams)), ['≈ 320 ₽ за порцию 250 г', '≈ 289 ₽ за порцию 250 г', '≈ 557 ₽ за порцию 250 г', '≈ 557 ₽ за порцию 250 г', '≈ 583 ₽ за порцию 250 г']);
});

test('pie portions use combined selected weight, round boundaries and Russian labels', () => {
  assert.equal(portionSummary(500), '≈ 2 порции · 500 г');
  assert.equal(portionSummary(1200), '≈ 4–5 порций · 1,2 кг');
  assert.equal(portionSummary(210, 5), '≈ 4–5 порций · 1,05 кг');
  assert.equal(portionSummary(250), '≈ 1 порция · 250 г');
  assert.equal(portionSummary(250, 21), '≈ 21 порция · 5,25 кг');
  for (const args of [[0], [-1], [NaN], [500, 0], [500, 1.5], [500, 100]]) assert.equal(portionSummary(...args), '');
});

test('drinks, flour and pastry dough do not inherit a finished pie portion estimate', () => {
  assert.equal(hasPiePortions({ kind: 'pie', unit: 'g', category: '' }), true);
  assert.equal(hasPiePortions({ kind: 'supplier', unit: 'g', category: 'mini-pies' }), true);
  assert.equal(hasPiePortions({ kind: 'supplier', unit: 'g', category: 'bread' }), false);
  assert.equal(hasPiePortions({ kind: 'supplier', unit: 'g', category: 'for-baking' }), false);
  assert.equal(hasPiePortions({ kind: 'drink', unit: 'ml', category: '' }), false);
});

test('set summaries distinguish edible pie weight, dough, drinks and place settings', () => {
  const dough = catalog.find(product => product.category === 'dough');
  const items = [
    { id: 'fish', value: 1000, quantity: 2 },
    { id: 'cheese', value: 500, quantity: 1 },
    { id: dough.id, value: dough.variants[0].value, quantity: 2 },
    { id: 'cranberry', value: 1000, quantity: 2 },
    { id: 'tableware', value: 1, quantity: 8 },
  ];
  const summary = compositionSummary(items, catalog);
  assert.equal(summary.pieGrams, 2500);
  assert.equal(summary.otherGrams, dough.variants[0].value * 2);
  assert.equal(summary.drinkMl, 2000);
  assert.equal(summary.settings, 8);
  assert.match(summary.text, /10 порций.*2,5 кг.*других продуктов.*Напитки — 2 л.*Посуда — 8 наб/);
  assert.deepEqual(compositionSummary([], catalog), { pieGrams: 0, otherGrams: 0, drinkMl: 0, settings: 0, text: '' });
});

test('all five sets have catalog-backed weight and portions; edits recalculate total mass', () => {
  assert.deepEqual(bundles.map(bundle => compositionSummary(bundle.items, catalog).pieGrams), [1000, 3000, 2400, 2400, 3700]);
  assert.match(compositionSummary(bundles.find(bundle => bundle.id === 'birthday').items, catalog).text, /14–15 порций.*3,7 кг/);
  const duplicate = [{ id: 'meat', value: 500, quantity: 1 }, { id: 'meat', value: 500, quantity: 2 }];
  assert.equal(compositionSummary(duplicate, catalog).pieGrams, 1500);
  for (const items of [
    [{ id: 'missing', value: 500, quantity: 1 }],
    [{ id: 'meat', value: 42, quantity: 1 }],
    [{ id: 'meat', value: 500, quantity: 1.5 }],
    [{ id: 'meat', value: 500, quantity: 99 }, { id: 'meat', value: 500, quantity: 1 }],
  ]) assert.equal(compositionSummary(items, catalog), null);
});
