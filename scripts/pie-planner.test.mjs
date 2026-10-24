import test from 'node:test';
import assert from 'node:assert/strict';
import { planPies, parsePlan } from '../src/lib/pie-planner.ts';

const catalog = ['meat', 'cabbage', 'fish'].map((id, index) => ({ id, kind: 'pie', variants: [{ value: 500, price: 400 + index * 100 }, { value: 1000, price: 700 + index * 200 }] }));
test('rounds up to 500 g, distributes flavours, and prices the actual variants', () => {
  const plan = planPies(4, 300, ['meat', 'cabbage'], catalog);
  assert.equal(plan.requested, 1200);
  assert.equal(plan.weight, 1500);
  assert.deepEqual(plan.items, [{ id: 'meat', value: 1000, quantity: 1 }, { id: 'cabbage', value: 500, quantity: 1 }]);
  assert.equal(plan.total, 1200);
});
test('every supported guest/portion combination preserves mass and bounded rounding', () => {
  for (let guests = 1; guests <= 30; guests++) for (let grams = 100; grams <= 500; grams += 50) for (let flavours = 1; flavours <= 3; flavours++) {
    const result = planPies(guests, grams, catalog.slice(0, flavours).map(pie => pie.id), catalog);
    assert.ok(result.weight >= guests * grams && result.weight < guests * grams + 500);
    assert.equal(result.items.reduce((sum, item) => sum + item.value * item.quantity, 0), result.weight);
    assert.deepEqual(parsePlan(result.items.map(item => `${item.id}:${item.value}:${item.quantity}`).join(','), catalog), result.items);
  }
});
test('invalid input and empty/unknown/duplicate flavours fail', () => {
  for (const [guests, grams, ids] of [[0,300,['meat']],[31,300,['meat']],[1.5,300,['meat']],[4,351,['meat']],[4,300,[]],[4,300,['coffee']],[4,300,['meat','meat']]]) assert.throws(() => planPies(guests, grams, ids, catalog));
});
test('URL transfer rejects tampering, unsupported products, duplicate rows, and oversized values', () => {
  for (const value of [null,'','meat:500:0','meat:500:100','meat:100:1','coffee:500:1','meat:500:1,meat:500:2','meat:500:1<script>','a'.repeat(1001),'meat:500:1,fish:1000:2,']) assert.equal(parsePlan(value, catalog), null);
});
