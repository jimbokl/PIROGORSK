import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const origin = 'https://pirogorsk.ru';
const localLinks = html => [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].flatMap(match => {
  try {
    const url = new URL(match[1].replaceAll('&amp;', '&'), origin);
    return url.origin === origin ? [url.pathname] : [];
  } catch { return []; }
});
const normalQuery = query => query.toLocaleLowerCase('ru').replaceAll('ё', 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Audit the released HTML, rather than trusting source data alone. */
export function auditSeoMap({ matrix, pages, sitemapPaths }) {
  const errors = [], owners = new Map(), queries = new Map();
  const fail = message => errors.push(message);
  const sitemap = new Set(sitemapPaths);
  if (sitemap.size !== sitemapPaths.length) fail('Duplicate sitemap URL');
  for (const row of matrix) {
    if (owners.has(row.path)) fail(`Duplicate owner: ${row.path}`);
    owners.set(row.path, row);
    if (!/^\/(?:[a-z0-9-]+\/)*$/.test(row.path)) fail(`Noncanonical owner path: ${row.path}`);
    if (!row.query?.trim() || !row.intent?.trim() || !row.pageType) fail(`Missing intent: ${row.path}`);
    const query = normalQuery(row.query ?? '');
    if (queries.has(query)) fail(`Query shared by owners: ${queries.get(query)} and ${row.path}`);
    queries.set(query, row.path);
    if (row.monthlySearches !== null && (!Number.isFinite(row.monthlySearches) || row.monthlySearches < 0 || !row.demandSource)) fail(`Unsubstantiated demand: ${row.path}`);
    if (!sitemap.has(row.path)) fail(`Owner outside sitemap: ${row.path}`);
  }
  const inbound = new Map(), graph = new Map();
  for (const [route, html] of pages) {
    const indexable = !/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html);
    if (indexable && !owners.has(route)) fail(`Indexable page without owner: ${route}`);
    const links = [...new Set(localLinks(html))].filter(href => pages.has(href));
    graph.set(route, links);
    for (const link of links) if (link !== route) inbound.set(link, (inbound.get(link) ?? 0) + 1);
  }
  const depths = new Map([['/', 0]]), queue = ['/'];
  while (queue.length) {
    const route = queue.shift();
    for (const link of graph.get(route) ?? []) if (!depths.has(link)) { depths.set(link, depths.get(route) + 1); queue.push(link); }
  }
  const recommendationTargets = {}, rows = [];
  for (const route of sitemap) {
    const html = pages.get(route), row = owners.get(route);
    if (!row) fail(`Sitemap URL without owner: ${route}`);
    if (!html) { fail(`Sitemap page missing: ${route}`); continue; }
    if (!depths.has(route)) fail(`Orphan: ${route}`);
    else if (depths.get(route) > 2) fail(`More than 2 clicks: ${route}`);
    if (row?.pageType === 'article') {
      const related = row.relatedArticles ?? [];
      if (related.length < 2 || new Set(related).size !== related.length || related.includes(route)) fail(`Invalid article recommendations: ${route}`);
      for (const target of related) {
        if (owners.get(target)?.pageType !== 'article') fail(`Unknown recommended article: ${route} -> ${target}`);
        recommendationTargets[target] = (recommendationTargets[target] ?? 0) + 1;
      }
      const block = html.match(/<section\b[^>]*id="related-reading"[^>]*>(.*?)<\/section>/s)?.[1] ?? '';
      if (JSON.stringify(localLinks(block)) !== JSON.stringify(related)) fail(`Rendered recommendations differ: ${route}`);
      const next = row.nextStep?.path;
      if (!next || !owners.has(next) || ['article', 'about', 'partner'].includes(owners.get(next)?.pageType)) fail(`Invalid next step: ${route}`);
      const planning = html.match(/<aside\b[^>]*class="ed-next-step"[^>]*>(.*?)<\/aside>/s)?.[1] ?? '';
      if (!planning.includes('data-guide-catalog') || !localLinks(planning).includes(next)) fail(`Missing measured next step: ${route}`);
    }
    rows.push({ path: route, depth: depths.get(route) ?? null, inboundPages: inbound.get(route) ?? 0 });
  }
  return { errors, summary: { sitemapPages: sitemap.size, intentOwners: owners.size, articles: matrix.filter(row => row.pageType === 'article').length, measuredDemandPages: matrix.filter(row => row.monthlySearches !== null).length, maxDepth: Math.max(...rows.map(row => row.depth ?? 0)), recommendationTargets, pages: rows } };
}

async function main() {
  const pages = new Map();
  async function scan(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await scan(file);
      else if (file.endsWith('.html')) pages.set('/' + path.relative('site', file).replace(/index\.html$/, ''), await readFile(file, 'utf8'));
    }
  }
  await scan('site');
  const matrix = JSON.parse(await readFile('src/data/seo-matrix.json', 'utf8'));
  const sitemap = await readFile('site/sitemap.xml', 'utf8');
  const sitemapPaths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]).pathname);
  const result = auditSeoMap({ matrix, pages, sitemapPaths });
  const reportIndex = process.argv.indexOf('--report');
  if (reportIndex !== -1) await writeFile(process.argv[reportIndex + 1], JSON.stringify(result, null, 2) + '\n');
  if (result.errors.length) { console.error(result.errors.join('\n')); process.exitCode = 1; }
  else console.log(`SEO map PASS: ${result.summary.intentOwners} owners, ${result.summary.articles} curated article routes, maximum depth ${result.summary.maxDepth}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
