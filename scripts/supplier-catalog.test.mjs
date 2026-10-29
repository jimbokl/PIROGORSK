import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog, products, extras } from '../src/data/catalog.ts';
import { supplierProducts, supplierSource } from '../src/data/holland-catalog.ts';
import { estimatePrice, estimateDelivery } from '../src/data/pricing.ts';

test('all 78 Holland positions remain in the expanded catalog without ID collisions', () => {
  assert.equal(products.length, 8); assert.equal(extras.length, 6);
  assert.equal(supplierProducts.length, 78); assert.equal(catalog.length, 153);
  assert.equal(new Set(catalog.map(p => p.id)).size, 153);
  assert.deepEqual(products.map(p => p.variants.map(v => v.price)), [[690,1290],[790,1490],[390,690],[590,1090],[590,1090],[490,890],[590,1090],[590,1090]]);
  assert.deepEqual(extras.map(p => p.variants.map(v => v.price)), [[200,350],[200,350],[100],[160],[80],[35]]);
  for (const item of supplierSource) {
    const product = supplierProducts.find(p => p.id === item.id);
    assert.ok(product, item.sourceTitle);
    assert.ok(product.variants.some(v => v.value === item.packWeightG), 'factory pack remains selectable');
    assert.equal(new Set(product.variants.map(v => v.value)).size, product.variants.length);
    assert.ok(product.variants.some(v => v.value === product.defaultVariant));
    assert.ok(!product.name.endsWith('по') && !product.name.endsWith('(от'));
    assert.ok(product.supplier.form.includes('аморожен'));
    assert.equal(product.supplier.priceFrom, item.priceFrom);
  }
});

test('mini pies retain real 210g units and the 5-piece 1.05kg bundle', () => {
  const pies = supplierProducts.filter(p => p.category === 'mini-pies');
  assert.equal(pies.length, 14);
  for (const pie of pies) {
    assert.deepEqual(pie.variants.map(v => v.value), [210,1050,4200]);
    assert.equal(pie.defaultVariant, 1050);
  }
  assert.equal(pies.find(p => p.id === 'hb-osetinskiy-pirog-s-kartofelem-i-syrom').prices[1050], 1300);
  assert.equal(pies.find(p => p.id === 'hb-osetinskiy-pirog-s-govyadinoy').prices[1050], 1550);
});

test('price covers procurement, inbound, packaging, variable reserve and 35% contribution', () => {
  // Five beef mini pies: public purchase 782.50, inbound 25, packaging 40.
  const result = estimatePrice(782.5, 25);
  assert.equal(result.price, 1550);
  assert.equal(result.variableReserve, 155);
  assert.equal(result.contribution, 547.5);
  for (const product of supplierProducts) for (const variant of product.variants) {
    assert.ok(Number.isSafeInteger(variant.price) && variant.price > 0);
  }
  // Missing or undecided receiving must never silently pretend delivery is free.
  assert.equal(estimateDelivery('Калининград', 'delivery'), 350);
  assert.equal(estimateDelivery('Зеленоградск', 'delivery'), 500);
  assert.equal(estimateDelivery('Светлогорск', 'delivery'), 650);
  assert.equal(estimateDelivery('Калининград', 'pickup'), 0);
  assert.equal(estimateDelivery('Калининград', 'undecided'), null);
  assert.equal(estimateDelivery('Другой город', 'delivery'), null);
});
