import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const base = process.env.QA_BASE || 'http://127.0.0.1:4331';
const stage = process.env.QA_BASE ? 'production' : 'local';
const output = new URL('./', import.meta.url).pathname;
await mkdir(output, {recursive: true});
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--disable-extensions']});
const slugs = ['gde-poest-s-detmi-v-kaliningrade', 'pozdniy-uzhin-v-kaliningrade'];
const report = {stage, base, widths:[], errors:[]};
try {
  for (const width of [320,390,768,1024,1280]) {
    const page = await browser.newPage();
    await page.setViewport({width,height:1000});
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    page.on('pageerror', error => report.errors.push(error.message));
    const row = {width, articles:[], search:[]};
    await page.goto(base+'/?qa=1',{waitUntil:'networkidle0'});
    assert.equal(await page.$$eval('.home-feed-card[data-product]', x=>x.length),154);
    assert(await page.$eval('html', el=>el.scrollWidth<=innerWidth+1));
    await page.$eval('.home-feed-card[data-product="meat"]', el=>el.scrollIntoView({block:'center',behavior:'instant'}));
    const typography = await page.$eval('.home-feed-card[data-product="meat"]', el=>({
      variant:parseFloat(getComputedStyle(el.querySelector('.variant-summary small')).fontSize),
      note:parseFloat(getComputedStyle(el.querySelector('[data-feed-price-note]')).fontSize),
    }));
    assert(typography.variant>=12); assert(typography.note>=11);
    row.typography=typography;
    if (width===1280) {
      await page.goto(base+'/?qa=1#nabory',{waitUntil:'networkidle0'});
      await page.waitForFunction(()=>document.querySelectorAll('.home-feed-card:not([hidden])').length===154);
      row.portionRows=await page.$$eval('.home-catalog-group', groups=>groups.flatMap(group=>{
        const rows=new Map();
        for(const card of group.querySelectorAll('.home-feed-card')) {
          const portion=card.querySelector('.pie-portions'); if(!portion)continue;
          const key=Math.round(card.getBoundingClientRect().top);
          if(!rows.has(key)) rows.set(key,[]);
          rows.get(key).push(portion.getBoundingClientRect().bottom);
        }
        return [...rows.values()].filter(row=>row.length>1).map(row=>({cards:row.length,spread:Math.max(...row)-Math.min(...row)}));
      }));
      assert(row.portionRows.length>10);
      assert(row.portionRows.every(r=>r.spread<=1),JSON.stringify(row.portionRows.filter(r=>r.spread>1)));
      await page.$eval('.home-feed-card[data-product="meat"]', el=>el.scrollIntoView({block:'center',behavior:'instant'}));
    }
    if([390,768,1280].includes(width))await page.screenshot({path:output+stage+'-cards-'+width+'.png'});
    await page.goto(base+'/blog/?qa=1',{waitUntil:'networkidle0'});
    assert.equal(await page.$$eval('[data-blog-entry]', els=>els.length),82);
    for(const [index,query] of ['С детьми в Калининграде','Поздний ужин в Калининграде'].entries()) {
      await page.locator('#blog-query').fill(query);
      const target=await page.waitForSelector(`[data-blog-entry]:not([hidden]) a[href="/journal/${slugs[index]}/"]`);
      await target.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
      await page.keyboard.press('Tab');
      await target.focus();
      const result=await target.evaluate(el=>({href:el.getAttribute('href'),overflow:el.scrollWidth>el.clientWidth+1,focus:getComputedStyle(el).outlineWidth,image:!!el.querySelector('img')?.complete}));
      assert(!result.overflow); assert.equal(result.focus,'3px'); assert(result.image);
      row.search.push(result);
      if(index===0&&[390,768,1280].includes(width))await page.screenshot({path:output+stage+'-blog-'+width+'.png'});
    }
    for(const slug of slugs) {
      const response=await page.goto(base+'/journal/'+slug+'/?qa=1',{waitUntil:'networkidle0'});
      assert.equal(response.status(),200);
      const article=await page.evaluate(()=>({
        h1:document.querySelectorAll('h1').length,
        canonical:document.querySelector('link[rel=canonical]').href,
        tables:document.querySelectorAll('article table').length,
        overflow:document.documentElement.scrollWidth>innerWidth+1,
        missingImages:[...document.querySelectorAll('article img')].filter(i=>i.complete&&i.naturalWidth===0).length,
      }));
      assert.equal(article.h1,1); assert.equal(article.canonical,'https://pirogorsk.ru/journal/'+slug+'/');
      assert(article.tables>=2); assert(!article.overflow); assert.equal(article.missingImages,0);
      row.articles.push({slug,...article});
      if([390,768].includes(width))await page.screenshot({path:output+stage+'-'+slug+'-'+width+'.png'});
    }
    report.widths.push(row); await page.close();
  }
  const page=await browser.newPage(); await page.setJavaScriptEnabled(false);
  await page.goto(base+'/blog/',{waitUntil:'networkidle0'});
  for(const slug of slugs)assert(await page.$(`a[href="/journal/${slug}/"]`));
  report.noJavaScript=true;
  assert.deepEqual(report.errors,[]);
  await writeFile(output+stage+'-focused.json',JSON.stringify(report,null,2)+'\n');
  console.log(`PASS ${stage}: 154 SKU, price typography, aligned desktop portions, 82 searchable articles, two guides on five widths, keyboard focus and no-JS links.`);
} finally {await browser.close();}
