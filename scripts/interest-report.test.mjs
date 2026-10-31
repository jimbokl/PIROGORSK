import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { reportQuery, renderReport, knownQaIds } from './interest-report.mjs';

test('aggregate query excludes known QA, preserves unknowns and uses Kaliningrad day boundaries', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE interests(request_id TEXT, created_at TEXT, city TEXT, value_total INTEGER); CREATE TABLE interest_preferences(request_id TEXT, occasion TEXT, preferred_time TEXT); CREATE TABLE interest_attribution(request_id TEXT, channel TEXT, partner_code TEXT);`);
  const insert = db.prepare('INSERT INTO interests VALUES (?,?,?,?)');
  insert.run('old', Date.parse('2026-10-30T21:59:00Z'), 'Зеленоградск', 1500);
  insert.run('new', Date.parse('2026-10-30T22:00:00Z'), 'Зеленоградск', 2000);
  insert.run(knownQaIds[0], Date.parse('2026-10-31T00:00:00Z'), 'Зеленоградск', 100);
  db.exec("INSERT INTO interest_preferences VALUES ('new','company','evening'); INSERT INTO interest_attribution VALUES ('new','qr','p007');");
  const rows = db.prepare(reportQuery('2026-10-31', '2026-10-31')).all();
  assert.equal(rows.length, 1); assert.equal(rows[0].interests, 1); assert.equal(rows[0].selection_value, 2000); assert.equal(rows[0].channel, 'qr');
  assert.equal(db.prepare(reportQuery('2026-10-30', '2026-10-30')).get().channel, 'untagged');
  assert.ok(!JSON.stringify(rows).includes('request_id'));
});

test('report rejects invalid ranges and escapes all displayed data', () => {
  for (const dates of [['2026-02-30', '2026-03-01'], ["';DROP TABLE interests", '2026-10-31'], ['2026-11-01', '2026-10-31']]) assert.throws(() => reportQuery(...dates));
  const meta = { from: '2026-10-01', to: '2026-10-31' };
  assert.ok(renderReport([], meta).includes('сохранений нет'));
  const html = renderReport([{ day: '2026-10-31', city: '<img src=x onerror=alert(1)>', occasion: 'company', preferred_time: 'evening', channel: 'qr', partner_code: 'p007', interests: 2, selection_value: 4000 }], meta);
  assert.ok(!html.includes('<img')); assert.ok(html.includes('&lt;img')); assert.ok(html.includes('data-preferred-time="evening"'));
});
