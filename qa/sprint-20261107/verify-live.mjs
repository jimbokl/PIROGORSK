import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const base='https://pirogorsk.ru',out='qa/sprint-20261107';
const path='/journal/gde-poest-v-svetlogorske/';
const sha=process.argv[2];
assert.match(sha||'',/^[a-f0-9]{40}$/,'Pass the deployed runtime SHA');
const report={base,checked:new Date().toISOString(),expectedSha:sha,assets:[],links:[]};
const get=async path=>{
 const response=await fetch(base+path,{cache:'no-store',signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,200,path);return Buffer.from(await response.arrayBuffer());
};
const hash=b=>createHash('sha256').update(b).digest('hex');
const runs=JSON.parse(execFileSync('gh',['run','list','--workflow','pages.yml','--commit',sha,'--limit','1','--json','databaseId,headSha,conclusion,status,url'],{encoding:'utf8'}));
assert.equal(runs[0]?.headSha,sha);assert.equal(runs[0]?.conclusion,'success');report.deployment=runs[0];
report.release=JSON.parse((await get('/release.json')).toString());
assert.deepEqual(report.release,JSON.parse(await fs.readFile('site/release.json','utf8')));
const blog=(await get('/blog/')).toString();
const paths=[...new Set([...blog.matchAll(/href="(\/journal\/[^"?#]+\/)"/g)].map(m=>m[1]))];
assert.equal(paths.length,78);assert(paths.includes(path));report.journalArticles=paths.length;
const sitemap=(await get('/sitemap.xml')).toString();
report.sitemapUrls=[...sitemap.matchAll(/<loc>/g)].length;assert.equal(report.sitemapUrls,273);assert(sitemap.includes(base+path));
const html=(await get(path)).toString(),local=await fs.readFile(`site${path}index.html`,'utf8');
assert(html.includes(`rel="canonical" href="${base+path}"`));
for(const [field,value] of [['datePublished','2026-10-24'],['dateModified','2026-11-07']])assert(html.includes(`"${field}":"${value}"`));
for(const text of ['Кофе и десерт: сколько стоит сладкая пауза','За марципановым десертом: Local Baltic','Кофе с собой или десерт с детьми','131 г','1 140 ₽'])assert(html.includes(text));
const title=local.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1];assert(title&&html.includes(title));
const stylesIn=source=>[...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]);
const localStyles=stylesIn(local),liveStyles=stylesIn(html);assert.deepEqual(liveStyles,localStyles);
report.inlineStyles=liveStyles.map(css=>({bytes:Buffer.byteLength(css),sha256:hash(Buffer.from(css))}));
const images=[...local.matchAll(/<img\b[^>]*>/g)].map(m=>m[0].match(/\bsrc="([^"]+)"/)?.[1]).filter(p=>p?.startsWith('/_astro/'));
const styles=[...local.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(m=>m[0].match(/\bhref="([^"]+)"/)?.[1]).filter(Boolean);
for(const asset of new Set([...images,...styles,'/seo/blog/gde-poest-v-svetlogorske.jpg'])){
 const expected=await fs.readFile('site'+asset),actual=await get(asset);
 assert.equal(hash(actual),hash(expected),'Asset SHA256 '+asset);
 report.assets.push({path:asset,bytes:actual.length,sha256:hash(actual)});
}
const content=JSON.parse(await fs.readFile(`${out}/content-production/production-report.json`,'utf8'));
assert.equal(content.base,base);assert.deepEqual(content.errors,[]);
const guide=JSON.parse(await fs.readFile(`${out}/production-guide.json`,'utf8'));
assert.equal(guide.stage,'production');assert.deepEqual(guide.errors,[]);assert.equal(guide.content.sources,8);
const update=content.updates.find(a=>a.path===path);assert(update);assert.equal(update.sections,4);assert.equal(update.modified,'2026-11-07');
for(const link of new Set(update.links.map(link=>new URL(link,base).pathname))){await get(link);report.links.push({path:link,status:200});}
report.owner={path,canonical:base+path,published:'2026-10-24',modified:'2026-11-07',newSections:3,sources:8,blog:true,sitemap:true};
await fs.writeFile(`${out}/live-readback.json`,JSON.stringify(report,null,2)+'\n');
console.log(`Live PASS: owner refresh, ${report.assets.length} matching assets + inline CSS, ${report.links.length} links; journal 78 / sitemap 273, CI ${sha}.`);
