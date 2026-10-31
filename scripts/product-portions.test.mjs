import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPiePortions, portionSummary } from '../src/lib/product-portions.ts';

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
