import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { cityMenu } from '../../src/data/city-menu.ts';

const production = process.argv.includes('--production');
const origin = 'https://pirogorsk.ru';
const site = resolve('site');
const output = resolve('qa/city-landings-20261030', production ? 'production' : 'local');
const axe = await readFile('node_modules/axe-core/axe.min.js', 'utf8');
const types = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.woff2':'font/woff2', '.avif':'image/avif', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.jpg':'image/jpeg' };
const results = [], errors = [], failed = [], redirects = [], flows = [];
const chrome = await launch({ chromeFlags:['--headless=new','--no-first-run','--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL:`http://localhost:${chrome.port}` });
await mkdir(output, {recursive:true});
async function pageFor(context, width, javascript = true) {
  const page = await context.newPage();
  await page.setViewport({width,height:900,deviceScaleFactor:1,isMobile:width<700,hasTouch:width<1000});
  await page.setJavaScriptEnabled(javascript);
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  page.on('pageerror', error=>errors.push(error.message));
  page.on('response', response=>{ if(response.status()>=400) failed.push(`${response.status()} ${response.url()}`); });
  await page.setRequestInterception(true);
  page.on('request', async request=>{
    const url = new URL(request.url());
    try {
      if(url.protocol==='data:') return await request.continue();
      if(url.origin==='https://mc.yandex.ru') return await request.respond({status:200,body:''});
      assert.equal(url.origin,origin);
      assert.equal(request.method(),'GET', 'Production forms must not be sent');
      if(production) return await request.continue();
      const path=resolve(site, `.${decodeURIComponent(url.pathname)}${url.pathname.endsWith('/')?'index.html':''}`);
      assert.ok(path.startsWith(site+sep));
      await request.respond({status:200,contentType:types[extname(path)]||'application/octet-stream',body:await readFile(path)});
    } catch(error) { failed.push(`${url.href}: ${error.message}`); await request.abort(); }
  });
  return page;
}
try {
  for(const width of [320,390,768,1280]) {
    const context=await browser.createBrowserContext();
    const page=await pageFor(context,width);
    for(const slug of ['kaliningrad','zelenogradsk','svetlogorsk']) {
      const menu=cityMenu(slug);
      await page.goto(`${origin}/${slug}/?qa=1`,{waitUntil:'networkidle0'});
      await page.evaluate(()=>document.fonts.ready);
      await page.screenshot({path:`${output}/${slug}-${width}.jpg`,type:'jpeg',quality:80});
      await page.$eval('#city-menu',section=>section.scrollIntoView());
      // Trigger lazy artwork and allow its actual image to finish decoding.
      await page.waitForFunction(()=>[...document.querySelectorAll('#city-menu img')].every(img=>img.complete&&img.naturalWidth>0));
      await page.screenshot({path:`${output}/${slug}-menu-${width}.jpg`,type:'jpeg',quality:80});
      const state=await page.evaluate(()=>({
        overflow:document.documentElement.scrollWidth>innerWidth,
        h1:[...document.querySelectorAll('h1')].map(h=>h.textContent),
        canonical:document.querySelector('link[rel=canonical]').href,
        buttons:[...document.querySelectorAll('[data-city-add]')].map(a=>({height:a.getBoundingClientRect().height,href:a.getAttribute('href')})),
        clippedTotals:[...document.querySelectorAll('.city-budget dd')].some(e=>e.getBoundingClientRect().right>innerWidth),
      }));
      await page.evaluate(axe);
      const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
      results.push({slug,width,...state,violations});
      assert.equal(state.overflow,false);
      assert.equal(state.h1.length,1);
      assert.equal(state.canonical,`${origin}/${slug}/`);
      assert.equal(state.clippedTotals,false);
      assert.ok(state.buttons.length===3&&state.buttons.every(button=>button.height>=44));
      assert.deepEqual(violations,[]);
      // Direct add preserves city, precise product/variant and updates the drawer.
      await page.evaluate(()=>localStorage.clear());
      await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('[data-city-add]')]);
      assert.equal(await page.$eval('#selection-dialog',dialog=>dialog.open),true);
      assert.equal(await page.$eval('[data-city]',el=>el.textContent),menu.city);
      const selected=await page.evaluate(()=>JSON.parse(localStorage.getItem('pirogorsk-selection')||'[]'));
      assert.deepEqual(selected,[{id:menu.entries[0].product.id,value:menu.entries[0].variant.value,quantity:1}]);
      await page.keyboard.press('Escape');
      flows.push({slug,width,city:menu.city,selected,pass:true});
      await page.evaluate(()=>localStorage.clear());
    }
    await context.close();
  }
  for(const javascript of [true,false]) {
    const context=await browser.createBrowserContext();
    const page=await pageFor(context,390,javascript);
    for(const slug of ['kaliningrad','zelenogradsk','svetlogorsk']) {
      await page.goto(`${origin}/dostavka/${slug}/?qa=1&source=legacy#city-budget`,{waitUntil:'networkidle0'});
      await page.waitForFunction(slug=>location.pathname===`/${slug}/`,{},slug);
      const url=new URL(page.url());
      if(javascript) {
        assert.equal(url.searchParams.get('source'),'legacy');
        assert.equal(url.hash,'#city-budget');
      }
      redirects.push({slug,javascript,destination:url.pathname,payloadPreserved:javascript?url.searchParams.get('source')==='legacy':null});
    }
    await context.close();
  }
  assert.deepEqual(errors,[]); assert.deepEqual(failed,[]);
  console.log(`City UI ${production?'production':'local'} PASS: ${results.length} page/viewport audits, ${flows.length} city-aware additions, six legacy redirects with/without JS.`);
} finally {
  await writeFile(`${output}/results.json`,JSON.stringify({checkedAt:new Date().toISOString(),production,results,flows,redirects,errors,failed},null,2)+'\n');
  await browser.close(); await chrome.kill();
}
