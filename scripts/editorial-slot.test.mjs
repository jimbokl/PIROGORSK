import test from 'node:test';
import assert from 'node:assert/strict';
import { selectEditorialSlot } from './editorial-slot.mjs';

const first = { id: 'CNT-101', date: '2026-11-19', ownerURL: '/journal/holiday-pies/', decision: 'new' };
const second = { id: 'CNT-102', date: '2026-11-20', ownerURL: '/journal/cracked-pie/', decision: 'update' };
const topics = [first, second];

test('the first planned day opens CNT-101 and a repeated run resumes the same slot', () => {
  const now = new Date('2026-11-19T08:00:00Z');
  const initial = selectEditorialSlot(topics, [], now);
  assert.equal(initial.action, 'prepare');
  assert.equal(initial.topic.id, first.id);

  const entry = { date: first.date, topicId: first.id, status: 'preparing' };
  const repeated = selectEditorialSlot(topics, [entry], now);
  assert.equal(repeated.action, 'resume');
  assert.equal(repeated.topic.id, first.id);
  assert.equal(selectEditorialSlot(topics, [{ ...entry, status: 'published' }], now).action, 'done');
});

test('the release date follows Kaliningrad time, even when UTC is still the previous day', () => {
  const result = selectEditorialSlot(topics, [], new Date('2026-11-19T22:03:00Z'));
  assert.equal(result.date, '2026-11-20');
  assert.equal(result.topic.id, second.id);
});

test('an unfinished earlier slot must be reconciled before preparing a new one', () => {
  const entry = { date: first.date, topicId: first.id, status: 'pushed' };
  const result = selectEditorialSlot(topics, [entry], new Date('2026-11-20T08:00:00Z'));
  assert.equal(result.action, 'reconcile');
  assert.equal(result.topic.id, first.id);
});

test('no edition is selected outside the published calendar and invalid ledger entries block a run', () => {
  const now = new Date('2026-11-18T08:00:00Z');
  assert.equal(selectEditorialSlot(topics, [], now).action, 'no-slot');
  const nextDay = new Date('2026-11-19T08:00:00Z');
  assert.throws(() => selectEditorialSlot(topics, [
    { date: first.date, topicId: second.id, status: 'preparing' }
  ], nextDay), /Ledger entry does not match/);
});
