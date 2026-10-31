import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as context from '../src/data/interest-context.ts';
const scope = { exports: {}, require: () => context, URL };
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/entry-attribution.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, scope);
const { createAttributionMemory } = scope.exports;
const clean = value => JSON.parse(JSON.stringify(value));

test('only enum channels and anonymous allocation codes enter the payload', () => {
  assert.equal(context.parseAttribution(undefined), undefined);
  assert.deepEqual(context.parseAttribution({ channel: 'qr', partnerCode: 'p007' }), { channel: 'qr', partnerCode: 'p007' });
  for (const input of [null, [], {}, { channel: 'email' }, { channel: 'qr', name: 'private' }, { channel: 'qr', partnerCode: 'p000' }, { channel: 'qr', partnerCode: 'p1000' }, { channel: 'telegram', partnerCode: 'p007' }, { channel: 'partner', partnerCode: 'phone' }]) assert.equal(context.parseAttribution(input), null);
});

test('last explicit valid entry persists across navigation without retaining URL data', () => {
  const values = new Map(); const store = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  let memory = createAttributionMemory(store);
  assert.deepEqual(clean(memory.enter('https://pirogorsk.ru/?pg_channel=qr&pg_partner=p007&email=private#secret')), { channel: 'qr', partnerCode: 'p007' });
  memory = createAttributionMemory(store);
  for (const href of ['https://pirogorsk.ru/menu/', 'https://evil.test/?pg_channel=telegram', 'https://pirogorsk.ru/?pg_channel=qr&pg_channel=partner', 'https://pirogorsk.ru/?pg_channel=qr&pg_partner=private', 'javascript:alert(1)']) assert.equal(memory.enter(href).channel, 'qr');
  assert.deepEqual(clean(memory.enter('https://pirogorsk.ru/nabor/na-kompaniyu/?pg_channel=scenario')), { channel: 'scenario' });
  assert.ok(!JSON.stringify([...values]).includes('private'));
  assert.equal(createAttributionMemory().current(), undefined);
});

test('broken and blocked storage leave the current-document flow working', () => {
  for (const store of [{ getItem: () => '{broken', setItem() {} }, { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } }]) {
    const memory = createAttributionMemory(store);
    assert.equal(memory.current(), undefined);
    assert.equal(memory.enter('http://localhost:4321/?pg_channel=telegram').channel, 'telegram');
  }
});
