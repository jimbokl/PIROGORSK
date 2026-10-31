import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../src/data/catalog.ts';
import { selectionPrice, mergeSelection } from '../src/lib/selection-offers.ts';
import { readComposition, readCompositionLink, compositionLink, guestAdditions } from '../src/lib/selection-tools.ts';

const composition = { version: 1, city: 'Калининград', items: [{ id: 'meat', value: 1000, quantity: 2 }, { id: 'tableware', value: 1, quantity: 4 }] };
test('a shared composition round trips privately in a fragment and uses current prices', () => {
  const url = new URL(compositionLink(composition, 'https://pirogorsk.ru/menu/?q=private'));
  assert.equal(url.origin + url.pathname + url.search, 'https://pirogorsk.ru/');
  const result = readCompositionLink(url.hash, catalog);
  assert.deepEqual(result, { composition, unavailable: 0 });
  const changed = catalog.map(product => product.id === 'meat' ? { ...product, variants: product.variants.map(v => ({ ...v, price: 1 })) } : product);
  assert.equal(selectionPrice(result.composition.items, changed), 142);
  assert.deepEqual(mergeSelection(composition.items, result.composition.items, catalog, 'ensure'), composition.items);
});
test('stale products and formats are reported while safe rows remain; empty remains visible', () => {
  const stale = { ...composition, items: [...composition.items, { id: 'gone', value: 1000, quantity: 1 }, { id: 'meat', value: 42, quantity: 1 }] };
  assert.deepEqual(readComposition(stale, catalog), { composition, unavailable: 2 });
  assert.deepEqual(readComposition({ ...composition, items: [{ id: 'gone', value: 1, quantity: 1 }] }, catalog), { composition: { ...composition, items: [] }, unavailable: 1 });
});
test('invalid or oversized links and aggregate quantities cannot silently alter selection', () => {
  for (const raw of [null, {}, { ...composition, version: 2 }, { ...composition, city: 'Москва' }, { ...composition, items: [] }, { ...composition, items: Array(25).fill(composition.items[0]) }, { ...composition, items: [{ id: 'meat', value: 500, quantity: -1 }] }, { ...composition, items: [{ id: 'meat', value: 500, quantity: 1.5 }] }, { ...composition, items: Array(2).fill({ id: 'meat', value: 500, quantity: 99 }) }]) assert.equal(readComposition(raw, catalog), null);
  for (const hash of ['', '#selection=%broken', '#selection=null', '#selection=%7B']) assert.equal(readCompositionLink(hash, catalog), null);
});
test('guest suggestions subtract all existing morse flavors/formats and place settings', () => {
  assert.deepEqual(guestAdditions([], 5, 1000), { selectedMl: 0, selectedSettings: 0, bottles: 2, settings: 5 });
  const items = [{ id: 'cranberry', value: 500, quantity: 1 }, { id: 'seabuckthorn', value: 1000, quantity: 1 }, { id: 'tableware', value: 1, quantity: 3 }];
  assert.deepEqual(guestAdditions(items, 8, 500), { selectedMl: 1500, selectedSettings: 3, bottles: 1, settings: 5 });
  assert.deepEqual(guestAdditions(items, 2, 1000), { selectedMl: 1500, selectedSettings: 3, bottles: 0, settings: 0 });
});
