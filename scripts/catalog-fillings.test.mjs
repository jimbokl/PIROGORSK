import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../src/data/catalog.ts';
import { productFillings, parseCriteria, fillingFilters } from '../src/lib/catalog-fillings.ts';

test('filling filters cover every catalog record with unique allowlisted tags', () => {
  const allowed = new Set(fillingFilters.slice(1).map(([id]) => id));
  assert.equal(catalog.length, 153);
  for (const product of catalog) {
    const tags = productFillings(product);
    assert.equal(new Set(tags).size, tags.length, product.id);
    assert.ok(tags.every(tag => allowed.has(tag)), product.id);
    if (['drink', 'accessory'].includes(product.kind)) assert.deepEqual(tags, []);
  }
  for (const tag of allowed) assert.ok(catalog.some(product => productFillings(product).includes(tag)), tag);
});

test('mixed and ambiguous supplier recipes use their actual filling', () => {
  const tags = id => productFillings(catalog.find(product => product.id === id));
  assert.deepEqual(tags('p39-485'), ['meat', 'cheese', 'vegetables']);
  assert.deepEqual(tags('p39-162'), ['fish', 'cheese', 'vegetables']);
  assert.deepEqual(tags('p39-151'), ['poultry']);
  assert.deepEqual(tags('p39-136'), ['meat', 'cheese', 'vegetables']);
  assert.deepEqual(tags('p39-415'), ['fruit']);
  assert.deepEqual(productFillings({ id: 'test', name: 'Пирог с курицей и сыром', kind: 'pie' }), ['poultry', 'cheese']);
  assert.deepEqual(productFillings({ id: 'test', name: 'Булочка с маком', kind: 'bakery' }), []);
});

test('URL criteria reject unknown filters and bound text while preserving Cyrillic', () => {
  assert.deepEqual(parseCriteria('?filling=fish&q=палтус'), { filling: 'fish', query: 'палтус' });
  assert.deepEqual(parseCriteria('?filling=private'), { filling: 'all', query: '' });
  assert.equal(parseCriteria(`?q=${'я'.repeat(120)}`).query.length, 100);
});
