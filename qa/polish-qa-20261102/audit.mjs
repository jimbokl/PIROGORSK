import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { verifyMenuQuantity } from '../../worker/scripts/qa-menu-quantity.mjs';

const output = 'qa/polish-qa-20261102';
const stage = process.env.QA_STAGE || 'before';
const origin = 'https://pirogorsk.ru';
const paths = [['home','/'],['menu','/menu/'],['delivery','/delivery/'],['city','/zelenogradsk/'],['blog','/blog/'],['article','/journal/dostavka-edy-v-zelenogradske/'],['product','/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/'],['bundles','/nabory/'],['bundle','/nabor/piknik-u-morya/'],['occasion','/povody/zelenogradsk/semeynyy-uzhin/'],['planner','/podbor/'],['about','/about/'],['original','/pirogi/myasnoy-pirog/'],['picnic','/catalog/baltiyskiy-piknik-set/'],['occasions','/povody/'],['ossetian','/osetinskie-pirogi/'],['partners','/partners/'],['privacy','/privacy/'],['terms','/terms/']];
const types = {'.html':'text/html','.css':'text/css','.js':'application/javascript','.avif':'image/avif','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.json':'application/json'};
const report = { stage, views: [], errors: [] };
await mkdir(output,{recursive:true});
const chrome = await launch({chromeFlags:['--headless=new','--disable-extensions','--disable-features=OverlayScrollbar']});
const browser = await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
const page = await browser.newPage(); const cache = new Map();
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
page.on('pageerror', e=>report.errors.push(e.message));
await page.setRequestInterception(true);
page.on('request',async request=>{
  if(request.url().startsWith('data:')) return request.continue();
  if(!request.url().startsWith(origin+'/') || request.method()!=='GET') return request.abort();
  const path = new URL(request.url()).pathname;
  try {
    if(!cache.has(path)) {
      if(process.env.QA_BASE){
        const response = await fetch(process.env.QA_BASE+path);
        if(!response.ok) throw new Error(`${response.status}: ${path}`);
        cache.set(path,{status:200,contentType:response.headers.get('content-type')||'',body:Buffer.from(await response.arrayBuffer())});
      } else cache.set(path,{status:200,contentType:types[extname(path)]||'text/html',body:await readFile(resolve('site','.'+decodeURIComponent(path)+(path.endsWith('/')?'index.html':'')))});
    }
    await request.respond(cache.get(path));
  }catch(e){report.errors.push(e.message);await request.abort();}
});
try {
  for(const width of [320,390,768,1280]) for(const [id,path] of paths){
    await page.setViewport({width,height:900});
    await page.goto(origin+path+'?qa=1',{waitUntil:'networkidle0'});
    await page.evaluate(()=>document.fonts.ready);
    const metrics = await page.evaluate(()=>{
      const visible = e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden';};
      const rect=e=>{const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};};
      return {
        overflow:document.documentElement.scrollWidth>innerWidth+1,
        outliers:[...document.querySelectorAll('main *')].filter(visible).filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+2||r.left< -2;}).slice(0,12).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,70),...rect(e)})),
        tinyControls:[...document.querySelectorAll('header a,header button,footer a,main button,main input,main select')].filter(visible).filter(e=>e.getBoundingClientRect().height<40).slice(0,15).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,60),...rect(e)})),
        clipped:[...document.querySelectorAll('h1,h2,h3,button')].filter(visible).filter(e=>e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2).slice(0,10).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,90),...rect(e)})),
        h1:[...document.querySelectorAll('h1')].map(e=>({text:e.textContent,...rect(e)})),
        statusHeight:document.querySelector('.masthead-bottom>a.masthead-status')?.getBoundingClientRect().height,
        breadcrumbMargins:[...document.querySelectorAll('.ed-breadcrumbs li:nth-child(n+3):last-child')].map(e=>parseFloat(getComputedStyle(e,'::before').marginRight)),
        invitations:[...document.querySelectorAll('.town-invitation')].map(e=>{
          const h=e.querySelector('h2'),p=e.querySelector('div>p:last-child');
          return {headingWidth:h.clientWidth,headingOverflow:h.scrollWidth>h.clientWidth+1,bodyFont:parseFloat(getComputedStyle(p).fontSize),cardWidth:e.clientWidth,contentWidth:e.clientWidth-parseFloat(getComputedStyle(e).paddingLeft)-parseFloat(getComputedStyle(e).paddingRight),buttonWidth:e.querySelector('.ed-button').getBoundingClientRect().width};
        }),
        activeSections:[...document.querySelectorAll('.site-navigation--drawer a[aria-current]')].map(e=>e.getAttribute('href')),
      };
    });
    report.views.push({id,path,width,...metrics});
    assert.equal(metrics.overflow,false,`${id} ${width}: horizontal overflow`);
    if(stage!=='before'){
      if(metrics.statusHeight) assert(metrics.statusHeight>=44,`${id} ${width}: status touch target`);
      if(width<=760) assert(metrics.breadcrumbMargins.every(margin=>margin>=10),`${id} ${width}: breadcrumb separator spacing`);
      for(const invitation of metrics.invitations){
        assert(!invitation.headingOverflow,`${id} ${width}: invitation heading overflow`);
        assert(invitation.bodyFont>=14,`${id} ${width}: readable invitation copy`);
        if(width<=600) assert(Math.abs(invitation.headingWidth-invitation.contentWidth)<=2,`${id} ${width}: invitation text uses the mobile column`);
      }
      if(id==='bundle') assert.deepEqual(metrics.activeSections,['/nabory/'],'Bundle parent navigation');
    }
    if([390,768,1280].includes(width)){
      await page.mouse.move(width-1,899);
      await page.screenshot({path:`${output}/${stage}-${id}-${width}.png`});
      if(['menu','city'].includes(id)){
        await page.$eval('.town-invitation',e=>e.scrollIntoView({block:'center'}));
        await page.screenshot({path:`${output}/${stage}-${id}-invitation-${width}.png`});
      }
      if(id==='about'){
        await page.$eval('footer',e=>e.scrollIntoView({block:'end'}));
        await page.screenshot({path:`${output}/${stage}-footer-${width}.png`});
      }
    }
  }
  for(const width of [320,390,768,1280]){
  await page.setViewport({width,height:500});await page.goto(origin+'/?qa=1',{waitUntil:'networkidle0'});
  for(const [trigger,dialog] of [['[data-menu-open]','#site-menu-dialog'],[width<=1000?'.masthead-city--mobile':'.masthead-city--desktop','#city-dialog']]){
    await page.click(trigger);await page.$eval(dialog,e=>{e.scrollTop=e.scrollHeight;});
    const close = await page.$eval(dialog,e=>{const r=e.getBoundingClientRect(),c=e.querySelector('button').getBoundingClientRect(),hit=document.elementFromPoint(c.x+c.width/2,c.y+c.height/2);return {top:c.top,bottom:c.bottom,dialogTop:r.top,visible:c.top>=r.top&&c.bottom<=r.bottom,clickable:!!hit?.closest('button')};});
    report.views.push({dialog,width,height:500,close});
    if(stage!=='before') assert(close.visible&&close.clickable,`${dialog} ${width}: close remains reachable`);
    await page.screenshot({path:`${output}/${stage}-${dialog.slice(1)}-short-${width}.png`});
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval(dialog,e=>e.open),false,'Escape closes');
    assert.equal(await page.$eval(trigger,e=>e===document.activeElement),true,'Focus returns to opener');
    if(stage!=='before'){
      await page.click(trigger);await page.$eval(dialog,e=>{e.scrollTop=e.scrollHeight;});
      await page.click(`${dialog} button`);
      assert.equal(await page.$eval(dialog,e=>e.open),false,'Close button works after scrolling');
    }
  }
  }
  if(stage!=='before'){
    await page.setViewport({width:390,height:900});
    await verifyMenuQuantity(page,origin,390,output);
    report.quantityPath = 'PASS: all three menu renderers, variants, typed quantity, limits, selection/reload';
  }
  assert.deepEqual(report.errors,[],'No JS or own-asset failures');
  await writeFile(`${output}/${stage}-audit.json`,JSON.stringify(report,null,2));
  console.log(`PASS ${stage}: ${report.views.length} responsive views/dialog states; no overflow, JS or asset errors.`);
} finally{await browser.close();await chrome.kill();}
