import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cityMenu } from '../src/data/city-menu.ts';

const sitemap = await readFile('site/sitemap.xml', 'utf8');
const matrix = JSON.parse(await readFile('src/data/seo-matrix.json', 'utf8'));
const home = await readFile('site/index.html', 'utf8');
const delivery = await readFile('site/delivery/index.html', 'utf8');
const occasions = JSON.parse(await readFile('src/data/b2b-occasions.json', 'utf8'));
for (const slug of ['kaliningrad', 'zelenogradsk', 'svetlogorsk']) {
  const menu = cityMenu(slug);
  const html = await readFile(`site/${slug}/index.html`, 'utf8');
  const schema = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(match => JSON.parse(match[1]));
  const graph = schema.flatMap(schema => schema['@graph'] ?? [schema]);
  const list = graph.find(node => node['@type'] === 'ItemList');
  assert.deepEqual(list.itemListElement.map(item => item.url), menu.entries.map(entry => `https://pirogorsk.ru${entry.href}`));
  assert.equal((html.match(/data-city-product="/g) ?? []).length, 3);
  assert.ok(html.includes(`data-city-total="${menu.example.reduce((sum, entry) => sum + entry.variant.price, 0) + menu.delivery}"`), 'delivery included once');
  assert.ok(html.includes(`href="https://pirogorsk.ru/${slug}/"`), 'self canonical');
  assert.equal((html.match(/data-city-add/g) ?? []).length, 3);
  assert.ok(sitemap.includes(`<loc>https://pirogorsk.ru/${slug}/</loc>`));
  assert.ok(!sitemap.includes(`https://pirogorsk.ru/dostavka/${slug}/`));
  assert.equal(matrix.filter(row => row.path === `/${slug}/`).length, 1);
  assert.ok(!matrix.some(row => row.path === `/dostavka/${slug}/`));
  for (const hub of [home, delivery]) assert.ok(hub.includes(`href="/${slug}/"`));
  const redirect = await readFile(`site/dostavka/${slug}/index.html`, 'utf8');
  assert.ok(redirect.includes(`content="0;url=/${slug}/"`));
  assert.ok(redirect.includes('content="noindex, follow"'));
  assert.ok(redirect.includes(`rel="canonical" href="https://pirogorsk.ru/${slug}/"`));
  assert.ok(redirect.includes('location.search + location.hash'));
  assert.ok(!html.includes('href="/dostavka/'), 'no links back to migrated URLs');
  for (const category of menu.categories) assert.ok(html.includes(`href="${category.href}"`) && html.includes(category.title));
  for (const entry of menu.entries) {
    assert.ok(html.includes(`href="${entry.href}"`));
    const selection = new URL(entry.selectionHref, 'https://pirogorsk.ru');
    assert.equal(selection.searchParams.get('city'), slug);
    assert.equal(selection.searchParams.get('interest'), entry.product.id);
    assert.equal(Number(selection.searchParams.get('variant')), entry.variant.value);
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
console.log('City pages PASS: three root canonical URLs, three permanent HTML redirects, nine catalog cards with city-aware selection, distinct categories/FAQs, sitemap/ownership and delivery once.');
