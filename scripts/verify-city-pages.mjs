import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cityMenu } from '../src/data/city-menu.ts';

const occasions = JSON.parse(await readFile('src/data/b2b-occasions.json', 'utf8'));
for (const slug of ['kaliningrad', 'zelenogradsk', 'svetlogorsk']) {
  const menu = cityMenu(slug);
  const html = await readFile(`site/dostavka/${slug}/index.html`, 'utf8');
  const schema = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(match => JSON.parse(match[1]));
  const graph = schema.flatMap(schema => schema['@graph'] ?? [schema]);
  const list = graph.find(node => node['@type'] === 'ItemList');
  assert.deepEqual(list.itemListElement.map(item => item.url), menu.entries.map(entry => `https://pirogorsk.ru${entry.href}`));
  assert.equal((html.match(/data-city-product="/g) ?? []).length, 3);
  assert.ok(html.includes(`data-city-total="${menu.example.reduce((sum, entry) => sum + entry.variant.price, 0) + menu.delivery}"`), 'delivery included once');
  assert.ok(html.includes(`href="https://pirogorsk.ru/dostavka/${slug}/"`), 'self canonical');
  for (const entry of menu.entries) {
    assert.ok(html.includes(`href="${entry.href}"`));
    assert.ok((await readFile(`site${entry.href}index.html`, 'utf8')).includes(entry.product.name));
  }
  for (const occasion of menu.occasionSlugs) {
    assert.ok(occasions.some(page => page.city === slug && page.slug === occasion));
    assert.ok(html.includes(`href="/povody/${slug}/${occasion}/"`));
  }
  for (const faq of menu.faq) assert.ok(html.includes(faq.question) && html.includes(faq.answer));
  assert.ok(html.includes('href="/menu/#holland"') && html.includes('href="/menu/#pirogi39"'));
  assert.ok(!graph.some(node => ['LocalBusiness', 'Bakery'].includes(node['@type'])), 'no invented physical business');
}
console.log('City pages PASS: three existing canonical URLs, nine catalog cards, matching ItemLists, nine occasion links and delivery once.');
