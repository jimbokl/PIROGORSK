import test from 'node:test';
import assert from 'node:assert/strict';
import { planPies, parsePlan } from '../src/lib/pie-planner.ts';
import { occasionPresets } from '../src/data/occasion-presets.ts';
import { occasions } from '../src/data/occasions.ts';
import { portionTableRows, breakfastExamples } from '../src/data/planning-updates.ts';
import { catalog as actualCatalog } from '../src/data/catalog.ts';

const catalog = ['meat', 'cabbage', 'fish'].map((id, index) => ({ id, kind: 'pie', variants: [{ value: 500, price: 400 + index * 100 }, { value: 1000, price: 700 + index * 200 }] }));
test('published 2–15 guest table and breakfast budgets agree with real formats and prices', () => {
  assert.deepEqual(portionTableRows.map(row => Number(row[0])), Array.from({length:14}, (_, i) => i + 2));
  for (const row of portionTableRows) for (const [index, grams] of [150, 250, 350].entries()) {
    const kg = Number(row[index + 1].replace(' кг', '').replace(',', '.'));
    assert.ok(kg * 1000 >= Number(row[0]) * grams);
    assert.ok(kg * 1000 - Number(row[0]) * grams < 500);
    assert.equal(kg * 1000 % 500, 0);
  }
  const variantPrice = (id, value) => actualCatalog.find(p => p.id === id).variants.find(v => v.value === value).price;
  for (const example of breakfastExamples) {
    assert.equal(example.pieWeight, example.guests * 250);
    assert.equal(example.piePrice, example.pies.reduce((sum, p) => sum + variantPrice(p.id, p.value), 0));
    assert.equal(example.total - example.piePrice, example.guests * (variantPrice('tea',250) + variantPrice('tableware',1)));
  }
});
test('rounds up to 500 g, distributes flavours, and prices the actual variants', () => {
  const plan = planPies(4, 300, ['meat', 'cabbage'], catalog);
  assert.equal(plan.requested, 1200);
  assert.equal(plan.weight, 1500);
  assert.deepEqual(plan.items, [{ id: 'meat', value: 1000, quantity: 1 }, { id: 'cabbage', value: 500, quantity: 1 }]);
  assert.equal(plan.total, 1200);
});
test('every supported guest/portion combination preserves mass and bounded rounding', () => {
  for (let guests = 1; guests <= 50; guests++) for (let grams = 100; grams <= 500; grams += 50) for (let flavours = 1; flavours <= 3; flavours++) {
    const result = planPies(guests, grams, catalog.slice(0, flavours).map(pie => pie.id), catalog);
    assert.ok(result.weight >= guests * grams && result.weight < guests * grams + 500);
    assert.equal(result.items.reduce((sum, item) => sum + item.value * item.quantity, 0), result.weight);
    assert.deepEqual(parsePlan(result.items.map(item => `${item.id}:${item.value}:${item.quantity}`).join(','), catalog), result.items);
  }
});
test('a 50-person table with eight flavours transfers without losing rows or mass',()=>{
 const pies=['meat','fish','cabbage','cheese','chicken','apple','cherry','curd'].map(id=>({id,kind:'pie',variants:[{value:500,price:400},{value:1000,price:700}]}));
 const result=planPies(50,350,pies.map(p=>p.id),pies);
 assert.equal(result.weight,17500);
 assert.equal(result.items.reduce((s,i)=>s+i.value*i.quantity,0),17500);
 assert.deepEqual(parsePlan(result.items.map(i=>`${i.id}:${i.value}:${i.quantity}`).join(','),pies),result.items);
});
test('invalid input and empty/unknown/duplicate flavours fail', () => {
  for (const [guests, grams, ids] of [[0,300,['meat']],[51,300,['meat']],[1.5,300,['meat']],[4,351,['meat']],[4,300,[]],[4,300,['coffee']],[4,300,['meat','meat']]]) assert.throws(() => planPies(guests, grams, ids, catalog));
});
test('URL transfer rejects tampering, unsupported products, duplicate rows, and oversized values', () => {
  for (const value of [null,'','meat:500:0','meat:500:100','meat:100:1','coffee:500:1','meat:500:1,meat:500:2','meat:500:1<script>','a'.repeat(1001),'meat:500:1,fish:1000:2,']) assert.equal(parsePlan(value, catalog), null);
});
test('every published occasion has a usable, distinct calculator preset', () => {
  assert.deepEqual(occasions.map(item => item.slug).sort(), occasionPresets.map(item => item.slug).sort());
  assert.equal(new Set(occasions.map(item => item.slug)).size, occasions.length);
  const allPies = ['meat','fish','cabbage','cheese','apple','cherry','curd'].map(id => ({ id, kind: 'pie', variants: [{ value: 500, price: 400 }, { value: 1000, price: 700 }] }));
  for (const preset of occasionPresets) {
    const plan = planPies(preset.guests, preset.grams, [...preset.ids], allPies);
    assert.ok(plan.weight >= preset.guests * preset.grams);
    assert.equal(plan.items.length > 0, true);
  }
});
