import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { catalog } from '../../src/data/catalog.ts';
import { catalogProductHref } from '../../src/lib/product-paths.ts';

const root = new URL('../../', import.meta.url);
const inputs = [
  'src/data/catalog.ts', 'src/data/product-descriptions.ts',
  'src/data/pirogi39-source.json', 'src/data/pirogi39-content.json',
  'src/data/holland-source.json', 'src/data/supplier-content.json',
];
const read = path => readFileSync(new URL(path, root));
const facts = ['src/data/pirogi39-content.json', 'src/data/supplier-content.json']
  .flatMap(path => JSON.parse(read(path)));
const patterns = {
  cod: /треск/iu, zander: /судак/iu, seabuckthorn: /облепих/iu,
  lingonberry: /брусник/iu, marzipan: /марципан/iu,
};
assert.equal(catalog.length, 153);
assert.equal(new Set(catalog.map(product => product.id)).size, 153);
const matches = catalog.flatMap(product => {
  const fact = facts.find(item => item.id === product.id);
  const terms = Object.entries(patterns)
    .filter(([, pattern]) => pattern.test(`${product.name} ${fact?.ingredients ?? ''}`))
    .map(([term]) => term);
  return terms.length ? [{
    id: product.id, name: product.name, href: catalogProductHref(product),
    kind: product.kind, terms,
    evidence: fact?.ingredients ? 'supplier-composition-snapshot' : 'concept-name-only',
    ingredients: fact?.ingredients || null,
    sourceUrl: fact?.sourceUrl || null, checkedOn: fact?.checkedOn || null,
  }] : [];
});
const output = {
  auditedOn: '2026-10-31', catalogSize: catalog.length,
  scope: 'Named ingredients in the current catalog and saved supplier compositions; not live availability or provenance.',
  inputs: inputs.map(path => ({ path, sha256: createHash('sha256').update(read(path)).digest('hex') })),
  counts: Object.fromEntries(Object.keys(patterns).map(term => [term, matches.filter(item => item.terms.includes(term)).length])),
  lingonberryWithMarzipan: matches.filter(item => item.terms.includes('lingonberry') && item.terms.includes('marzipan')).length,
  matches,
};
writeFileSync(new URL('./audit.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
console.log(`CAT-02: ${catalog.length} SKU, ${matches.length} matches; ${JSON.stringify(output.counts)}. Saved ${fileURLToPath(new URL('./audit.json', import.meta.url))}`);
