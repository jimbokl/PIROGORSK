import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalSeoPath, isConversionHref, guideTransition, articleRoute } from '../src/lib/seo-navigation.ts';
import { auditSeoMap } from './verify-seo-map.mjs';

test('editorial attribution allows only registered routes and strips all URL payloads', () => {
  const source = 'https://pirogorsk.ru/journal/skolko-piroga-na-cheloveka/?email=private#private';
  assert.deepEqual(guideTransition(source, '/podbor/?phone=private#selection'), { source_page: '/journal/skolko-piroga-na-cheloveka/', destination_page: '/podbor/' });
  assert.deepEqual(guideTransition(source.replace('https://pirogorsk', 'https://www.pirogorsk'), '/podbor/'), { source_page: '/journal/skolko-piroga-na-cheloveka/', destination_page: '/podbor/' });
  for (const destination of ['https://evil.example/podbor/', '//evil.example/menu/', '/podbor/private-email/', 'javascript:alert(1)', '/blog/', source]) assert.equal(guideTransition(source, destination), undefined);
  for (const badSource of ['https://evil.example/blog/', 'https://pirogorsk.ru/private-email/', 'https://[']) assert.equal(guideTransition(badSource, '/podbor/'), undefined);
  assert.equal(canonicalSeoPath('/missing/'), undefined);
  assert.equal(isConversionHref('/povody/kaliningrad/semeynyy-uzhin/'), true);
  for (const city of ['kaliningrad', 'zelenogradsk', 'svetlogorsk']) {
    assert.equal(isConversionHref(`/${city}/`), true);
    assert.equal(canonicalSeoPath(`/dostavka/${city}/`), undefined);
  }
  assert.equal(isConversionHref('/journal/rybnye-pirogi-v-kaliningrade/'), false);
});

test('quantity article continues to sizing and selection rather than unrelated city guides', () => {
  const route = articleRoute('/journal/skolko-piroga-na-cheloveka/');
  assert.equal(route.nextStep.path, '/podbor/');
  assert.deepEqual(route.relatedArticles, ['/journal/pirog-500-g-ili-1-kg/', '/journal/kak-vybrat-pirogi-na-kompaniyu/']);
  assert.throws(() => articleRoute('/not-a-registered-article/'), /Missing editorial route/);
});

const fixture = () => ({
  matrix: [
    { path: '/', pageType: 'home', query: 'brand', intent: 'find brand', monthlySearches: null },
    { path: '/menu/', pageType: 'hub', query: 'menu', intent: 'choose a taste', monthlySearches: null },
  ],
  pages: new Map([['/', '<a href="/menu/">Menu</a>'], ['/menu/', '<a href="/">Home</a>'], ['/privacy/', '<meta name="robots" content="noindex,follow">']]),
  sitemapPaths: ['/', '/menu/'],
});

test('coverage audit accepts complete ownership and ignores noindex legal pages', () => {
  const result = auditSeoMap(fixture());
  assert.deepEqual(result.errors, []);
  assert.equal(result.summary.maxDepth, 1);
});

test('coverage audit catches missing owners, unreachable pages, duplicate queries and invented demand', () => {
  const input = fixture();
  input.matrix[1].query = 'BRAND';
  input.matrix[1].monthlySearches = 100;
  input.pages.set('/', 'No links');
  input.pages.set('/unowned/', '<h1>Missing</h1>');
  const errors = auditSeoMap(input).errors.join('\n');
  assert.match(errors, /Query shared by owners/);
  assert.match(errors, /Unsubstantiated demand/);
  assert.match(errors, /Indexable page without owner: \/unowned\//);
  assert.match(errors, /Orphan: \/menu\//);
});

test('coverage audit checks actual emitted recommendations and measured next step', () => {
  const input = fixture();
  input.matrix[1] = { ...input.matrix[1], pageType: 'article', relatedArticles: ['/menu/', '/menu/'], nextStep: { path: '/unknown/' } };
  const errors = auditSeoMap(input).errors.join('\n');
  assert.match(errors, /Invalid article recommendations/);
  assert.match(errors, /Rendered recommendations differ/);
  assert.match(errors, /Invalid next step/);
  assert.match(errors, /Missing measured next step/);
});
