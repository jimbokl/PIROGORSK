import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as context from '../src/data/interest-context.ts';

const module = { exports: {}, require: () => context, URL };
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/interest-entry.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, module);
const { occasionFromEntry, createOccasionMemory } = module.exports;
const clean = value => JSON.parse(JSON.stringify(value));

test('published scenario, regional, article and planner entries resolve without fuzzy guesses', () => {
  const paths = {
    '/journal/uzhin-v-semnyh-apartamentah/': 'apartments',
    '/journal/piknik-na-kurshskoy-kose/': 'picnic',
    '/journal/obed-v-ofis-v-kaliningrade/': 'company',
    '/nabor/na-kompaniyu/': 'company',
    '/povody/eda-na-vypisku/': 'gift',
    '/povody/svetlogorsk/semeynyy-uzhin/': 'dinner',
    '/povody/zelenogradsk/eda-na-kurshskuyu-kosu/': 'picnic',
    '/podbor/?occasion=v-ofis-na-den-rozhdeniya': 'company',
    '/?interest=scenario-apartamenty': 'apartments',
    '/?interest=guide-piknik-s-pirogom-chto-vzyat': 'picnic',
    '/?interest=occasion-eda-na-vypisku': 'gift',
  };
  const inventory = new Set(JSON.parse(readFileSync(new URL('../src/data/seo-matrix.json', import.meta.url))).map(page => page.path));
  for (const [path, expected] of Object.entries(paths)) {
    assert.ok(inventory.has(new URL(path, 'https://pirogorsk.ru').pathname), path);
    assert.equal(occasionFromEntry(`https://pirogorsk.ru${path}`), expected, path);
  }
  for (const path of ['/menu/?occasion=picnic', '/?interest=__proto__', '/podbor/?occasion=constructor', '/podbor/?occasion=na-pominki&occasion=eda-na-vypisku', '/povody/baltiysk/semeynyy-uzhin/', '/nabor/semeynyy-uzhin/', '/journal/random-piknik/', '/catalog/rybnyy-pirog/']) assert.equal(occasionFromEntry(`https://pirogorsk.ru${path}`), undefined, path);
  assert.equal(occasionFromEntry('https://evil.example/nabor/na-kompaniyu/'), undefined);
  assert.equal(occasionFromEntry('javascript:alert(1)'), undefined);
});

test('cross-page memory keeps inference, updates thematic entries, and respects explicit undecided', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  let session = createOccasionMemory(storage);
  session.enter('https://pirogorsk.ru/journal/uzhin-v-semnyh-apartamentah/?email=private#secret');
  session = createOccasionMemory(storage);
  assert.equal(session.enter('https://pirogorsk.ru/menu/').value, 'apartments');
  assert.equal(session.enter('https://pirogorsk.ru/nabor/piknik-u-morya/').value, 'picnic');
  session.choose('undecided');
  session = createOccasionMemory(storage);
  assert.deepEqual(clean(session.enter('https://pirogorsk.ru/nabor/na-kompaniyu/')), { value: 'undecided', source: 'choice' });
  session.choose('gift');
  session.choose('private');
  assert.equal(session.current().value, 'gift');
  assert.ok(!JSON.stringify([...values]).includes('private'));
  assert.equal(createOccasionMemory().current(), undefined, 'independent tab has no stored choice');
});

test('corrupt or blocked storage does not prevent inference and local correction', () => {
  for (const storage of [
    { getItem: () => '{broken', setItem() {} },
    { getItem: () => '{"value":"private","source":"choice"}', setItem() {} },
    { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } },
  ]) {
    const session = createOccasionMemory(storage);
    assert.equal(session.current(), undefined);
    session.enter('https://pirogorsk.ru/nabor/na-kompaniyu/');
    session.choose('undecided');
    assert.deepEqual(clean(session.current()), { value: 'undecided', source: 'choice' });
  }
});
