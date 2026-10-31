import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../src/data/catalog.ts';
import { bundles, addOnGroups } from '../src/data/bundles.ts';
import { selectionPrice, mergeSelection, availableAddOns, readSavedSelection } from '../src/lib/selection-offers.ts';

test('published sets and add-ons use existing variants and their exact price', () => {
  assert.deepEqual(bundles.map(bundle => selectionPrice(bundle.items, catalog)), [1280, 3470, 5350, 5350, 8630]);
  for (const items of [...bundles.map(bundle => bundle.items), ...addOnGroups.map(group => group.choices)]) {
    assert.ok(mergeSelection([], items, catalog));
    assert.ok(selectionPrice(items, catalog) > 0);
  }
  assert.deepEqual(addOnGroups.find(group => group.id === 'tableware').choices.map(item => selectionPrice([item], catalog)), [35, 175, 350]);
});

test('sets merge matching variants; followed URLs preserve selection on reload', () => {
  const current = [{ id: 'meat', value: 500, quantity: 2 }, { id: 'cranberry', value: 1000, quantity: 1 }];
  const result = mergeSelection(current, bundles[0].items, catalog);
  assert.deepEqual(result, [...current.map(item => ({ ...item, quantity: item.id === 'meat' ? 3 : 1 })), { id: 'cheese', value: 500, quantity: 1 }]);
  assert.equal(current[0].quantity, 2);
  assert.deepEqual(mergeSelection(result, bundles[0].items, catalog, 'ensure'), result);
});

test('limit or invalid variant rejects entire set without partial additions', () => {
  const current = [{ id: 'cheese', value: 500, quantity: 99 }];
  assert.equal(mergeSelection(current, bundles[0].items, catalog), null);
  assert.deepEqual(current, [{ id: 'cheese', value: 500, quantity: 99 }]);
  const full = catalog.slice(0, 24).map(product => ({ id: product.id, value: product.variants[0].value, quantity: 1 }));
  assert.equal(mergeSelection(full, bundles[2].items, catalog), null);
  for (const item of [{ id: 'meat', value: 3, quantity: 1 }, { id: 'unknown', value: 1, quantity: 1 }, { id: 'meat', value: 500, quantity: 1.5 }]) assert.equal(mergeSelection([], [item], catalog), null);
});

test('recommendations follow contents, including supplier sweet pies and drinks', () => {
  assert.deepEqual(availableAddOns([], catalog), []);
  assert.deepEqual(availableAddOns([{ id: 'tableware' }], catalog), []);
  assert.deepEqual(availableAddOns(bundles[0].items, catalog), ['morse', 'sweet', 'tableware']);
  assert.deepEqual(availableAddOns(bundles[2].items, catalog), ['morse', 'tableware']);
  assert.deepEqual(availableAddOns([...bundles[0].items, { id: 'apple' }, { id: 'seabuckthorn' }, { id: 'tableware' }], catalog), []);
});


test('saved selection normalizes legacy weights, duplicates and stale or invalid entries', () => {
  const saved = [null, { id: 'meat', weight: '500', quantity: 2 }, { id: 'meat', value: 500, quantity: 98 }, { id: 'cherry', value: 500, quantity: 1 }, { id: 'removed', value: 500, quantity: 1 }, { id: 'meat', value: 42, quantity: 1 }, { id: 'tableware', value: 1, quantity: -1 }, { id: 'tableware', value: 1, quantity: 1.5 }];
  assert.deepEqual(readSavedSelection(saved, catalog), [{ id: 'meat', value: 500, quantity: 99 }, { id: 'cherry', value: 500, quantity: 1 }]);
  assert.deepEqual(readSavedSelection({ items: saved }, catalog), []);
  assert.equal(readSavedSelection(catalog.slice(0, 30).map(p => ({ id: p.id, value: p.variants[0].value, quantity: 1 })), catalog).length, 24);
});
