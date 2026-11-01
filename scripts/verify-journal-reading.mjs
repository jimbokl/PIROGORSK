import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const output = process.env.QA_OUTPUT || 'qa/journal-polish-20261101';
const stage = process.env.QA_BASE ? 'production' : 'local';
const origin = 'https://pirogorsk.ru';
await mkdir(output, { recursive: true });
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const report = { stage, articles: [], views: [], errors: [] };
const cache = new Map();
const types = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.avif':'image/avif', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2', '.json':'application/json' };
async function setup(page) {
  page.setDefaultTimeout(15000);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  page.on('pageerror', error => report.errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async request => {
    if (request.url().startsWith('data:')) return request.continue();
    if (!request.url().startsWith(origin + '/') || request.method() !== 'GET') return request.abort();
    const path = new URL(request.url()).pathname;
    try {
      if (!cache.has(path)) {
        if (process.env.QA_BASE) {
          const response = await fetch(process.env.QA_BASE + path);
          assert(response.ok, `${response.status} ${path}`);
          cache.set(path, { status: 200, contentType: response.headers.get('content-type') || '', body: Buffer.from(await response.arrayBuffer()) });
        } else cache.set(path, { status: 200, contentType: types[extname(path)] || 'text/html', body: await readFile(resolve('site', '.' + decodeURIComponent(path) + (path.endsWith('/') ? 'index.html' : ''))) });
      }
      await request.respond(cache.get(path));
    } catch (error) { report.errors.push(error.message); await request.abort(); }
  });
}
const baseline = JSON.parse(await readFile('qa/journal-polish-20261101/baseline-sections.json', 'utf8'));
const page = await browser.newPage();
await setup(page);
const go = slug => page.goto(`${origin}/journal/${slug}/?qa=1`, { waitUntil: 'networkidle0' });
const normalized = value => value.replace(/\s+/gu, '');
try {
  await page.setViewport({width:1280,height:900});
  for (const [slug, sections] of Object.entries(baseline)) {
    await go(slug);
    const actual = await page.$$eval('.ed-article-section', nodes => nodes.map(node => node.textContent.replace(/\s+/gu,' ').trim()));
    assert.equal(actual.length,sections.length,`${slug}: section count`);
    sections.forEach((text,index) => assert(normalized(actual[index]).startsWith(normalized(text)),`${slug}: original text ${index}`));
    const audit = await page.evaluate(() => ({
      h1:document.querySelectorAll('h1').length,
      broken:[...document.querySelectorAll('.article-contents a')].filter(a => !document.getElementById(a.hash.slice(1))).map(a=>a.hash),
      pictures:document.querySelectorAll('.ed-body-figure picture').length,
      imageMetadata:[...document.querySelectorAll('.ed-body-figure img')].every(img=>img.width>0&&img.height>0&&img.alt&&img.loading==='lazy'&&img.srcset),
      tables:[...document.querySelectorAll('.ed-reading-table')].every(table=>table.caption&&table.querySelector('th[scope="col"]')&&table.querySelector('th[scope="row"]')),
      canonical:document.querySelector('link[rel="canonical"]').href,
      contents:document.querySelector('.article-contents')?.hasAttribute('open'),
    }));
    assert.equal(audit.h1,1);assert.deepEqual(audit.broken,[]);assert(audit.pictures>=1);assert(audit.imageMetadata);assert(audit.tables);assert(audit.contents);
    assert.equal(audit.canonical,`${origin}/journal/${slug}/`);
    report.articles.push({slug,sections:actual.length,figures:audit.pictures,originalTextPreserved:true,anchors:true,canonical:true});
  }
  const sample=['dostavka-edy-v-zelenogradske','gde-poest-v-zelenogradske','kak-hranit-pirogi','pirog-s-kapustoy-i-yaytsom','regionalnaya-kuhnya-kaliningradskoy-oblasti','piknik-na-kurshskoy-kose'];
  for (const width of [320,390,768,1280]) for (const slug of sample) {
    await page.setViewport({width,height:900});await go(slug);await page.evaluate(()=>document.fonts.ready);
    const metrics=await page.evaluate(()=>({
      overflow:document.documentElement.scrollWidth>innerWidth+1,
      bodyFont:parseFloat(getComputedStyle(document.querySelector('.ed-article-section p')).fontSize),
      readingWidth:document.querySelector('.article-reading-main').getBoundingClientRect().width,
      tocLinks:[...document.querySelectorAll('.article-contents a')].every(a=>a.getBoundingClientRect().height>=44),
    }));
    assert(!metrics.overflow,`${slug} ${width}: overflow`);assert(metrics.bodyFont>=16);assert(metrics.readingWidth<=761);assert(metrics.tocLinks);
    await page.click('.article-contents a');
    await page.waitForFunction(()=>location.hash.length>1);
    const target=await page.evaluate(()=>document.querySelector(location.hash).getBoundingClientRect().top);
    assert(target>=0&&target<900,`${slug}: anchor visibility`);
    const tools=await page.$('#article-tools');
    if(tools){await page.$eval('#article-tools',node=>node.scrollIntoView());await page.click('#article-tools > summary');assert(await page.$eval('#article-tools',node=>node.open));}
    if (slug==='dostavka-edy-v-zelenogradske'||(width===390&&slug==='piknik-na-kurshskoy-kose')) {
      await page.evaluate(async()=>{for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));document.querySelector('#article-tools')?.removeAttribute('open');window.scrollTo(0,0);});await page.screenshot({path:`${output}/${stage}-${slug}-${width}.png`,fullPage:true});
      if(slug==='dostavka-edy-v-zelenogradske'){
        await page.$eval('.ed-article-section',node=>node.scrollIntoView());
        await page.screenshot({path:`${output}/${stage}-reading-${width}.png`});
        await page.$eval('.ed-body-figure',node=>node.scrollIntoView({block:'center'}));
        await page.screenshot({path:`${output}/${stage}-illustration-${width}.png`});
      }
    }
    report.views.push({slug,width,...metrics,anchorVisible:true,tools:!!tools});
  }
  await page.setJavaScriptEnabled(false);await go(sample[0]);
  assert.equal(await page.$$eval('.article-contents a',nodes=>nodes.length),8);
  await page.click('.article-contents summary');assert.equal(await page.$eval('.article-contents',node=>node.open),false);
  await page.click('.article-contents summary');assert.equal(await page.$eval('.article-contents',node=>node.open),true);
  await page.click('#article-tools > summary');assert(await page.$eval('#article-tools',node=>node.open));
  report.noJavaScript={contents:true,expandTools:true,article:true};
  assert.deepEqual(report.errors,[]);
  await writeFile(`${output}/${stage}-report.json`,JSON.stringify(report,null,2));
  console.log(`PASS: ${report.articles.length} articles, ${report.views.length} responsive views, anchors, content preservation and no-JS.`);
} finally {await browser.close();await chrome.kill();}
