import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {planPies} from '../src/lib/pie-planner.ts';
const json=async name=>JSON.parse(await readFile(`src/data/${name}.json`,'utf8'));
const [allPages,places,occasions]=await Promise.all(['seo-matrix','local-places','b2b-occasions'].map(json));
const matrix=allPages.filter(page=>page.cohort==='expansion-20261026');
assert.equal(matrix.length,36);assert.equal(new Set(matrix.map(p=>p.path)).size,36);
assert.deepEqual(['scenario','city','product'].map(c=>matrix.filter(p=>p.cluster===c).length),[16,14,6]);
assert.equal(matrix.filter(p=>p.new).length,28);
for(const city of ['Калининград','Зеленоградск','Светлогорск']){
 const rows=places.filter(p=>p.city===city);assert.ok(rows.length>=12);
 for(const p of rows){
  assert.ok(p.address&&p.sources.length&&p.verifiedAt);
  for(const s of p.sources){assert.equal(new URL(s.url).protocol,'https:');assert.match(s.checkedAt,/^2026-10-\d\d$/);}
  if(p.coords){assert.ok(p.coords[0]>54&&p.coords[0]<56&&p.coords[1]>19&&p.coords[1]<23,`Invalid coords: ${p.id}`);assert.ok(p.sources.some(s=>s.fields.includes('coords')));}
  if(p.familyOf4DinnerRub!==null){assert.ok(p.basket);assert.equal(p.basket.items.reduce((n,i)=>n+i.priceRub*i.quantity,0),p.familyOf4DinnerRub);assert.ok(p.sources.some(s=>s.fields.includes('basket')));}
  assert.equal(p.waitTimeMin,null,'No measured waiting-time dataset exists');
 }
}
const pages=new Map();
async function scan(dir){for(const e of await readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())await scan(f);else if(f.endsWith('.html'))pages.set('/'+path.relative('site',f).replace(/index\.html$/,''),await readFile(f,'utf8'));}}
await scan('site');
const links=html=>[...html.matchAll(/<a\b[^>]*href="([^"#]+)[^"]*"/g)].map(m=>{try{const u=new URL(m[1].replaceAll('&amp;','&'),'https://pirogorsk.ru');return u.origin==='https://pirogorsk.ru'?u.pathname:null;}catch{return null;}}).filter(Boolean);
const depths=new Map([['/',0]]),queue=['/'];
while(queue.length){const p=queue.shift();for(const next of links(pages.get(p)??''))if(pages.has(next)&&!depths.has(next)){depths.set(next,depths.get(p)+1);queue.push(next);}}
for(const [route,html] of pages){if(/name="robots"[^>]*content="[^"]*noindex/.test(html))continue;assert.ok(depths.has(route),`Orphan: ${route}`);assert.ok(depths.get(route)<=2,`Depth ${depths.get(route)}: ${route}`);}
for(const page of matrix){
 const html=pages.get(page.path);assert.ok(html,`Missing: ${page.path}`);
 assert.match(html,/data-party-form/);assert.match(html,/"@type":"FAQPage"/);assert.match(html,/"@type":"ItemList"/);
 const transfer=html.match(/data-party-apply[^>]*href="([^"]+)"/)[1].replaceAll('&amp;','&');
 const city=new URL(transfer,'https://pirogorsk.ru').searchParams.get('city');
 assert.ok(['kaliningrad','zelenogradsk','svetlogorsk'].includes(city),`Unsupported transfer city: ${page.path}`);
 if(page.cluster==='city'){assert.ok((html.match(/href="\/nabor\//g)??[]).length>=2);assert.ok((html.match(/href="\/povody\/(kaliningrad|zelenogradsk|svetlogorsk)\//g)??[]).length>=2);}
}
for(const row of occasions){
 const html=pages.get(`/povody/${row.city}/${row.slug}/`);
 const catalog=JSON.parse(html.match(/data-party-catalog[^>]*>(.*?)<\/script>/s)[1]);
 const plan=planPies(row.defaultGuestsCount,row.gramsPerGuest,row.recommendedSetIds,catalog);
 assert.equal(plan.weight,row.recommendedPieWeightGrams);assert.equal(Math.ceil(plan.total/row.defaultGuestsCount),row.costPerPersonRub);
 assert.ok(html.includes(`max="${row.slug==='na-pominki'?50:25}"`));
}
console.log(`Expansion PASS: 36 targets (28 new), ${places.length} sourced locations, ${occasions.length} scenarios, all indexable pages within 2 clicks.`);
