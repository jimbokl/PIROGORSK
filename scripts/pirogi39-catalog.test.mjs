import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../src/data/catalog.ts';
import { freshProducts, freshSource, freshPurchasePrice, freshPricingModel } from '../src/data/pirogi39-catalog.ts';
import { estimatePrice } from '../src/data/pricing.ts';
import { productPage } from '../src/data/product-pages.ts';
import { selectionHref } from '../src/lib/product-paths.ts';

test('all 61 fresh whole pies and their 63 real size variants are selectable', () => {
  assert.equal(freshProducts.length, 61);
  assert.equal(freshProducts.reduce((sum,p) => sum + p.variants.length,0),63);
  assert.equal(catalog.length,153);
  assert.deepEqual(Object.fromEntries(['hearty-pies','sweet-pies','siberian-pies','kurniki','prussian-pies','ossetian-pies'].map(g=>[g,freshProducts.filter(p=>p.category===g).length])),{'hearty-pies':18,'sweet-pies':17,'siberian-pies':5,kurniki:4,'prussian-pies':3,'ossetian-pies':14});
  for (const product of freshProducts) {
    const source = freshSource.find(s=>s.id===product.id);
    assert.deepEqual(product.variants.map(v=>v.value),source.variants.map(v=>v.weightG));
    assert.ok(productPage(product).facts.ingredients);
    assert.ok(!productPage(product).prep.includes('заморож'));
    for (const variant of product.variants) assert.equal(new URL(selectionHref(product,variant.value),'https://pirogorsk.ru').hash,'#pirogi39');
  }
  assert.deepEqual(freshProducts.find(p=>p.id==='p39-483').variants.map(v=>v.value),[1300,2000]);
  assert.deepEqual(freshProducts.find(p=>p.id==='p39-482').variants.map(v=>v.value),[1300,2000]);
});

test('pickup discount never stacks with a supplier promotion and each planned price covers the model', () => {
  assert.equal(freshPurchasePrice({price:1000,regularPrice:null}),900);
  assert.equal(freshPurchasePrice({price:900,regularPrice:1000}),900);
  assert.equal(freshPurchasePrice({price:1000,regularPrice:1000}),900);
  for (const source of freshSource) for (const variant of source.variants) {
    const estimate=estimatePrice(freshPurchasePrice(variant),freshPricingModel.inboundPerPie);
    const retail=freshProducts.find(p=>p.id===source.id).variants.find(v=>v.value===variant.weightG).price;
    assert.equal(retail,estimate.price);
    assert.ok(estimate.contribution/retail>=.35-1e-9);
  }
  const apricot=freshSource.find(s=>s.id==='p39-483');
  assert.equal(freshPurchasePrice(apricot.variants[1]),1599,'2kg apricot already promotional');
  assert.equal(freshPurchasePrice(freshSource.find(s=>s.id==='p39-487').variants[0]),2259);
});
