import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/index.ts';
import { catalog as publicCatalog } from '../../src/data/catalog.ts';
import { releaseManifest } from '../../scripts/verify-release.mjs';

const migration = readFileSync(new URL('../migrations/0001_interests.sql', import.meta.url), 'utf8');
function storage() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(migration);
  function prepare(sql, values = []) {
    const execute = () => ({ success: true, results: sqlite.prepare(sql).all(...values) });
    return { bind: (...next) => prepare(sql, next), first: async () => execute().results[0] || null, all: async () => execute(), execute };
  }
  const DB = { prepare, batch: async statements => {
    sqlite.exec('BEGIN');
    try { const result = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return result; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  } };
  return { DB, sqlite, count: () => sqlite.prepare('SELECT count(*) AS n FROM interests').get().n, tokens: () => sqlite.prepare('SELECT count(*) AS n FROM submission_tokens').get().n };
}
function payload(overrides = {}) {
  return { version: 1, requestId: crypto.randomUUID(), city: 'Зеленоградск', items: [{ id: 'meat', value: '500', quantity: 2 }], desiredDate: '2099-12-12', delivery: 'pickup', priceConsent: true, website: '', ...overrides };
}
function request(body, origin = 'https://pirogorsk.ru', headers = {}) {
  return new Request('https://interest.example/api/interest', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.10', ...headers }, body: JSON.stringify(body) });
}

test('a successful acknowledgement refers to exactly one persisted anonymous record', async () => {
  const db = storage(); const data = payload();
  const res = await worker.fetch(request(data), db);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, saved: true, requestId: data.requestId });
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://pirogorsk.ru');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const row = db.sqlite.prepare('SELECT * FROM interests').get();
  assert.equal(row.city, data.city);
  assert.deepEqual(JSON.parse(row.items_json), data.items.map(item => ({ ...item, unitPrice: 690 })));
  assert.equal(row.value_total, 1380);
  assert.equal(row.price_consent, 1);
  assert.equal(row.desired_date, data.desiredDate);
  assert.equal(db.count(), 1);
  assert.equal(db.tokens(), 1);
  assert.equal(JSON.stringify(row).includes('192.0.2.10'), false);
  assert.equal(JSON.stringify(db.sqlite.prepare('SELECT * FROM submission_tokens').get()).includes('192.0.2.10'), false);
});

test('manual retry and simultaneous double submit retain one record and one rate token', async () => {
  const db = storage(); const data = payload();
  const result = await Promise.all([worker.fetch(request(data), db), worker.fetch(request(data), db)]);
  assert.deepEqual(result.map(r => r.status), [200, 200]);
  assert.equal((await worker.fetch(request(data), db)).status, 200);
  assert.equal(db.count(), 1); assert.equal(db.tokens(), 1);
});

test('every public catalog variant is accepted with its canonical price snapshot', async () => {
  const db = storage();
  const items = publicCatalog.flatMap(product => product.variants.map(variant => ({ id: product.id, value: String(variant.value), quantity: 1 })));
  const saved = [];
  let total = 0;
  for (let offset = 0; offset < items.length; offset += 24) {
    const data = payload({ items: items.slice(offset, offset + 24) });
    const res = await worker.fetch(request(data, 'https://pirogorsk.ru', { 'CF-Connecting-IP': `192.0.2.${10 + offset / 24}` }), db);
    assert.equal(res.status, 200);
    const row = db.sqlite.prepare('SELECT items_json, value_total FROM interests WHERE request_id = ?').get(data.requestId);
    saved.push(...JSON.parse(row.items_json)); total += row.value_total;
  }
  assert.equal(saved.length, items.length);
  for (const product of publicCatalog) for (const variant of product.variants) {
    assert.equal(saved.find(item => item.id === product.id && item.value === String(variant.value)).unitPrice, variant.price);
  }
  assert.equal(total, publicCatalog.reduce((sum, product) => sum + product.variants.reduce((a, v) => a + v.price, 0), 0));
});

test('reusing a request ID for a changed selection returns conflict without overwriting', async () => {
  const db = storage(); const data = payload();
  await worker.fetch(request(data), db);
  const changed = await worker.fetch(request({ ...data, city: 'Калининград' }), db);
  assert.equal(changed.status, 409);
  assert.equal((await changed.json()).code, 'idempotency_conflict');
  assert.equal(db.sqlite.prepare('SELECT city FROM interests').get().city, 'Зеленоградск');
});

test('reordered item keys and item order do not create a new submission', async () => {
  const db = storage(); const data = payload({ items: [{ id: 'meat', value: '500', quantity: 2 }, { id: 'fish', value: '1000', quantity: 1 }] });
  await worker.fetch(request(data), db);
  assert.equal((await worker.fetch(request({ ...data, items: [...data.items].reverse() }), db)).status, 200);
  assert.equal(db.count(), 1);
});

test('a full rate window rejects new requests while accepting a saved retry', async () => {
  const db = storage(); const first = payload();
  assert.equal((await worker.fetch(request(first), db)).status, 200);
  for (let n = 0; n < 5; n++) assert.equal((await worker.fetch(request(payload()), db)).status, 200);
  const res = await worker.fetch(request(payload()), db);
  assert.equal(res.status, 429); assert.equal(res.headers.get('retry-after'), '600');
  assert.equal((await worker.fetch(request(first), db)).status, 200);
  assert.equal(db.count(), 6); assert.equal(db.tokens(), 6);
  assert.equal((await worker.fetch(request(payload(), 'https://pirogorsk.ru', { 'CF-Connecting-IP': '192.0.2.11' }), db)).status, 200);
});

test('expired hashed rate keys are removed by scheduled cleanup', async () => {
  const db = storage();
  db.sqlite.exec("INSERT INTO submission_tokens VALUES ('old', 'digest-only', 0, 1, 1)");
  await worker.scheduled({}, db);
  assert.equal(db.tokens(), 0);
});

test('validation rejects unsupported catalog items, duplicates, quantities, dates and price refusal', async () => {
  const db = storage();
  const bad = [
    { city: 'Москва' }, { items: [] }, { items: [{ id: 'unknown', value: '500', quantity: 1 }] },
    { items: [{ id: '__proto__', value: '500', quantity: 1 }] }, { items: [{ id: 'meat', value: '999', quantity: 1 }] },
    { items: [{ id: 'meat', value: '500', quantity: 0 }] }, { items: [{ id: 'meat', value: '500', quantity: 1.5 }] },
    { items: Array(25).fill({ id: 'meat', value: '500', quantity: 1 }) },
    { items: [{ id: 'meat', value: '500', quantity: 1 }, { id: 'meat', value: '500', quantity: 1 }] },
    { desiredDate: '2026-02-30' }, { desiredDate: '2001-01-01' }, { desiredDate: 'x' },
    { delivery: 'express' }, { priceConsent: false }, { requestId: 'invalid' }, { version: 2 },
  ];
  for (const override of bad) assert.equal((await worker.fetch(request(payload(override)), db)).status, 422, JSON.stringify(override));
  assert.equal(db.count(), 0); assert.equal(db.tokens(), 0);
});

test('contact data, comments and arbitrary extra fields are rejected at the API boundary', async () => {
  const db = storage();
  for (const field of ['phone', 'email', 'contact', 'name', 'comment']) {
    assert.equal((await worker.fetch(request(payload({ [field]: 'not-stored' })), db)).status, 422);
  }
  assert.equal((await worker.fetch(request(payload({ items: [{ id: 'meat', value: '500', quantity: 1, comment: 'not-stored' }] })), db)).status, 422);
  assert.equal(db.count(), 0);
});

test('honeypot is rejected without a saved flag, record or conversion acknowledgement', async () => {
  const db = storage(); const res = await worker.fetch(request(payload({ website: 'spam' })), db);
  assert.equal(res.status, 422); assert.equal((await res.json()).saved, undefined); assert.equal(db.count(), 0);
});

test('origin allowlist is exact and local origins require QA configuration', async () => {
  const db = storage();
  for (const origin of ['https://evil.example', 'https://pirogorsk.ru.evil.example', 'http://pirogorsk.ru', 'null', 'http://localhost:4321']) {
    const res = await worker.fetch(request(payload(), origin), db);
    assert.equal(res.status, 403, origin); assert.equal(res.headers.get('access-control-allow-origin'), null);
  }
  assert.equal((await worker.fetch(request(payload(), 'https://www.pirogorsk.ru'), db)).status, 200);
  assert.equal((await worker.fetch(request(payload(), 'http://localhost:4321'), { ...db, ALLOW_LOCALHOST: 'true' })).status, 200);
  const noOrigin = request(payload()); noOrigin.headers.delete('origin');
  assert.equal((await worker.fetch(noOrigin, db)).status, 403);
  const options = await worker.fetch(new Request('https://interest.example/api/interest', { method: 'OPTIONS', headers: { Origin: 'https://pirogorsk.ru' } }), db);
  assert.equal(options.status, 204);
});

test('only bounded JSON bodies are accepted, including a chunk without Content-Length', async () => {
  const db = storage();
  assert.equal((await worker.fetch(request(payload(), 'https://pirogorsk.ru', { 'Content-Type': 'text/plain' }), db)).status, 415);
  assert.equal((await worker.fetch(request(payload(), 'https://pirogorsk.ru', { 'Content-Length': '999999' }), db)).status, 413);
  assert.equal((await worker.fetch(request(payload({ website: 'x'.repeat(17000) })), db)).status, 413);
  const broken = new Request('https://interest.example/api/interest', { method: 'POST', headers: { Origin: 'https://pirogorsk.ru', 'Content-Type': 'application/json' }, body: '{' });
  assert.equal((await worker.fetch(broken, db)).status, 400); assert.equal(db.count(), 0);
});

test('an interrupted database transaction cannot acknowledge success or spend a rate token', async () => {
  const db = storage();
  db.sqlite.exec("CREATE TRIGGER fail_test BEFORE INSERT ON interests BEGIN SELECT RAISE(ABORT, 'test-write-failure'); END");
  const res = await worker.fetch(request(payload()), db);
  assert.equal(res.status, 503); assert.equal((await res.json()).saved, undefined);
  assert.equal(db.count(), 0); assert.equal(db.tokens(), 0);
});

test('health confirms schema access, and a missing binding returns storage unavailable', async () => {
  assert.deepEqual(await (await worker.fetch(new Request('https://interest.example/health'), storage())).json(), { ok: true, storage: 'd1', mode: 'intent', ...releaseManifest() });
  const failed = { DB: { prepare: () => ({ all: async () => ({ success: false, results: [] }) }) } };
  assert.equal((await worker.fetch(new Request('https://interest.example/health'), failed)).status, 503);
  assert.equal((await worker.fetch(new Request('https://interest.example/health'), {})).status, 503);
  assert.equal((await worker.fetch(request(payload()), {})).status, 503);
});
