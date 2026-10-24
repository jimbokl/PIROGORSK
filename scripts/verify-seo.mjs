import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

// Verify emitted HTML, rather than source templates. No network or account access.
// Usage: node scripts/verify-seo.mjs [--scope editorial] [--dir site]
const args = process.argv.slice(2);
const arg = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const output = path.resolve(arg('--dir') ?? 'site');
const scoped = arg('--scope') === 'editorial';
const origin = 'https://pirogorsk.ru';
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const decode = text => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
// Astro minimises an empty decorative alt to bare `alt`; that is valid HTML.
const attributes = tag => Object.fromEntries([...tag.replace(/^<[\w:-]+\b/, '').replace(/\/?>$/, '').matchAll(/(?:^|\s)([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)].map(([, name, double, single, bare]) => [name.toLowerCase(), decode(double ?? single ?? bare ?? '')]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match => attributes(match[0]));
const exists = async file => { try { return (await stat(file)).isFile(); } catch { return false; } };
const htmlFiles = async directory => {
  const entries = await readdir(directory, { withFileTypes: true });
  const lists = await Promise.all(entries.map(entry => entry.isDirectory() ? htmlFiles(path.join(directory, entry.name)) : entry.name.endsWith('.html') ? [path.join(directory, entry.name)] : []));
  return lists.flat();
};
const routeFor = file => `/${path.relative(output, file).split(path.sep).join('/')}`.replace(/index\.html$/, '');
const fileFor = pathname => path.join(output, pathname.endsWith('/') ? `${pathname}index.html` : pathname);
const isEditorial = route => /^\/(menu|delivery|partners|about|podbor|povody)\/$|^\/(pirogi|nabor|dostavka|journal|povody)\/[^/]+\/$/.test(route);

try {
  const all = await htmlFiles(output);
  const files = scoped ? all.filter(file => isEditorial(routeFor(file))) : all;
  assert(files.length >= 17, `Expected the editorial route families; found ${files.length} HTML pages in scope.`);
  const titles = new Map();
  const descriptions = new Map();
  const routes = new Map();
  const localChecks = [];
  let productCount = 0;
  for (const file of all) routes.set(routeFor(file), await readFile(file, 'utf8'));
  for (const file of files) {
    const route = routeFor(file);
    const html = routes.get(route);
    const title = decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '');
    const metas = tags(html, 'meta');
    const meta = (name, property = false) => metas.filter(item => item[property ? 'property' : 'name'] === name);
    const description = meta('description')[0]?.content ?? '';
    const canonicals = tags(html, 'link').filter(item => item.rel === 'canonical');
    const noindex = /noindex/.test(meta('robots')[0]?.content ?? '');
    assert(/^<html\b[^>]*lang="ru"/i.test(html.match(/<html\b[^>]*>/i)?.[0] ?? ''), `${route}: missing Russian document language.`);
    assert(title.length >= 12 && title.length <= 110, `${route}: missing or unusually long title (${title.length}).`);
    assert(description.length >= 60 && description.length <= 240, `${route}: missing or unusually long description (${description.length}).`);
    assert(meta('description').length === 1, `${route}: expected exactly one description.`);
    assert((html.match(/<h1\b/gi) ?? []).length === 1, `${route}: expected exactly one h1.`);
    assert(canonicals.length === 1 && canonicals[0].href === `${origin}${route}`, `${route}: incorrect canonical.`);
    assert(meta('og:url', true)[0]?.content === `${origin}${route}`, `${route}: OG URL differs from canonical.`);
    for (const name of ['og:title', 'og:description', 'og:image', 'og:type', 'og:image:alt']) assert(meta(name, true).length === 1 && meta(name, true)[0].content, `${route}: missing or duplicate ${name}.`);
    assert(meta('twitter:card')[0]?.content === 'summary_large_image', `${route}: missing large social card.`);
    if (!noindex) {
      assert(!titles.has(title), `${route}: title duplicated by ${titles.get(title)}.`);
      assert(!descriptions.has(description), `${route}: description duplicated by ${descriptions.get(description)}.`);
      titles.set(title, route);
      descriptions.set(description, route);
    }
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(match => attributes(match[1]).type === 'application/ld+json');
    const entities = [];
    for (const script of scripts) {
      try {
        const parsed = JSON.parse(script[2]);
        entities.push(...(Array.isArray(parsed) ? parsed : parsed['@graph'] ?? [parsed]));
      } catch { failures.push(`${route}: invalid JSON-LD.`); }
    }
    assert(entities.some(item => item['@type'] === 'Organization'), `${route}: missing Organization.`);
    assert(entities.some(item => item['@type'] === 'WebSite'), `${route}: missing WebSite.`);
    if (isEditorial(route)) assert(entities.some(item => item['@type'] === 'BreadcrumbList'), `${route}: missing BreadcrumbList.`);
    const visitSchema = node => {
      if (!node || typeof node !== 'object') return;
      assert(!['Offer', 'AggregateOffer', 'LocalBusiness', 'Bakery', 'AggregateRating', 'Review'].includes(node['@type']), `${route}: unsupported prelaunch schema ${node['@type']}.`);
      assert(!('availability' in node) && !('offers' in node), `${route}: availability/offers must wait for launch.`);
      Object.values(node).forEach(value => { if (Array.isArray(value)) value.forEach(visitSchema); else visitSchema(value); });
    };
    entities.forEach(visitSchema);
    if (route.startsWith('/pirogi/')) {
      productCount++;
      assert(entities.some(item => item['@type'] === 'Product'), `${route}: missing Product concept entity.`);
    }
    if (isEditorial(route)) {
      assert(/(?:готовим запуск|готовится к запуску|перед запуском|пока не запущен)/i.test(html), `${route}: missing visible launch status.`);
      assert(tags(html, 'a').some(item => item.href?.startsWith('/?interest=') && item.href.endsWith('#pirogi')), `${route}: missing interest CTA.`);
    }
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert(new Set(ids).size === ids.length, `${route}: duplicate HTML ids.`);
    const references = [...tags(html, 'a').map(item => ({ url: item.href, anchor: true })), ...tags(html, 'img').map(item => ({ url: item.src })), ...[...tags(html, 'img'), ...tags(html, 'source')].flatMap(item => (item.srcset ?? '').split(',').map(candidate => ({ url: candidate.trim().split(/\s+/)[0] }))), ...meta('og:image', true).map(item => ({ url: item.content }))];
    for (const image of tags(html, 'img')) {
      assert('alt' in image, `${route}: image missing alt.`);
      assert(image.width && image.height, `${route}: image missing dimensions.`);
    }
    for (const ref of references) {
      if (!ref.url || /^(mailto:|tel:|data:|javascript:)/.test(ref.url)) continue;
      const url = new URL(ref.url, `${origin}${route}`);
      if (url.origin !== origin) continue;
      localChecks.push((async () => {
        assert(await exists(fileFor(decodeURIComponent(url.pathname))), `${route}: broken local reference ${ref.url}.`);
        if (ref.anchor && url.hash) {
          const target = routes.get(url.pathname);
          const id = decodeURIComponent(url.hash.slice(1));
          assert(target?.includes(`id="${id}"`), `${route}: missing anchor ${ref.url}.`);
        }
      })());
    }
  }
  await Promise.all(localChecks);
  for (const route of ['/privacy/', '/terms/']) {
    const html = routes.get(route);
    assert(Boolean(html) && tags(html ?? '', 'meta').some(item => item.name === 'robots' && /noindex/.test(item.content ?? '')), `${route}: legal document must retain the requested noindex directive.`);
  }
  assert(productCount >= 4, 'Expected at least the four existing product concepts.');
  const sitemap = await readFile(path.join(output, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => decode(match[1]));
  assert(urls.length >= 18 && new Set(urls).size === urls.length, 'Sitemap must contain unique canonical pages.');
  for (const urlString of urls) {
    const url = new URL(urlString);
    assert(url.origin === origin && !url.search && !url.hash && url.pathname.endsWith('/'), `Sitemap contains noncanonical URL: ${urlString}.`);
    const html = routes.get(url.pathname);
    assert(Boolean(html), `Sitemap URL has no emitted HTML: ${urlString}.`);
    assert(!/name="robots"[^>]*content="[^"]*noindex/i.test(html ?? ''), `Sitemap contains noindex page: ${urlString}.`);
  }
  for (const [route, html] of routes) if (isEditorial(route) && !/name="robots"[^>]*content="[^"]*noindex/i.test(html)) assert(urls.includes(`${origin}${route}`), `${route}: missing from sitemap.`);
  const robots = await readFile(path.join(output, 'robots.txt'), 'utf8');
  assert(robots.includes(`Sitemap: ${origin}/sitemap.xml`), 'robots.txt must point to the canonical sitemap.');
  assert(!/^Disallow:\s*\/\s*$/m.test(robots), 'robots.txt unexpectedly blocks the whole site.');
  const og = await readFile(path.join(output, 'seo/pirogorsk-og.jpg'));
  assert(og[0] === 0xff && og[1] === 0xd8 && og.length > 10000, 'Expected a real JPEG social image.');
  if (failures.length) {
    console.error(`SEO verification failed (${failures.length}):\n${failures.map(item => `- ${item}`).join('\n')}`);
    process.exitCode = 1;
  } else console.log(`SEO verification passed: ${files.length} HTML pages, ${productCount} product concepts, ${urls.length} sitemap URLs, ${localChecks.length} local references. Scope: ${scoped ? 'editorial' : 'all'}.`);
} catch (error) {
  console.error(`SEO verification could not finish: ${error.message}. Build the site first (npm run build).`);
  process.exitCode = 1;
}
