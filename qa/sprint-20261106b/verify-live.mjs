import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const base='https://pirogorsk.ru', out='qa/sprint-20261106b';
const slugs=['dich-i-myaso-kaliningradskoy-oblasti','eda-v-aeroportu-hrabrovo'];
const pies=['osetinskiy-pirog-s-kuritsey-i-syrom','osetinskiy-pirog-so-shpinatom-i-syrom'];
const sha=process.argv[2];
assert.match(sha||'',/^[a-f0-9]{40}$/,'Pass the deployed runtime SHA');
const report={base,checked:new Date().toISOString(),expectedSha:sha,articles:[],assets:[],links:[],galleries:[]};
const get=async path=>{
 const response=await fetch(base+path,{cache:'no-store',signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,200,path);
 return Buffer.from(await response.arrayBuffer());
};
const hash=b=>createHash('sha256').update(b).digest('hex');
const compare=async path=>{
 const expected=await fs.readFile('site'+path),actual=await get(path);
 assert.equal(hash(actual),hash(expected),'Asset SHA256 '+path);
 report.assets.push({path,bytes:actual.length,sha256:hash(actual)});
};
const runs=JSON.parse(execFileSync('gh',['run','list','--workflow','pages.yml','--commit',sha,'--limit','1','--json','databaseId,headSha,conclusion,status,url'],{encoding:'utf8'}));
assert.equal(runs[0]?.headSha,sha);assert.equal(runs[0]?.conclusion,'success');report.deployment=runs[0];
report.release=JSON.parse((await get('/release.json')).toString());
assert.deepEqual(report.release,JSON.parse(await fs.readFile('site/release.json','utf8')));
const blog=(await get('/blog/')).toString();
const paths=[...new Set([...blog.matchAll(/href="(\/journal\/[^"?#]+\/)"/g)].map(m=>m[1]))];
assert.equal(paths.length,72);report.journalArticles=paths.length;
const sitemap=(await get('/sitemap.xml')).toString();
report.sitemapUrls=[...sitemap.matchAll(/<loc>/g)].length;assert.equal(report.sitemapUrls,267);
for(const slug of slugs){
 const path=`/journal/${slug}/`,html=(await get(path)).toString();
 assert.ok(paths.includes(path));assert.ok(sitemap.includes(base+path));
 assert.ok(html.includes(`rel="canonical" href="${base+path}"`));
 assert.ok(html.includes('"datePublished":"2026-11-06"'));
 const local=await fs.readFile(`site${path}index.html`,'utf8');
 const title=local.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1];assert.ok(title&&html.includes(title));
 const images=[...local.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
 const assets=new Set(images.map(tag=>tag.match(/\bsrc="([^"]+)"/)?.[1]).filter(p=>p&&p.startsWith('/_astro/')&&p.includes(slug)));
 assert.equal(assets.size,3);assets.add(`/seo/blog/${slug}.jpg`);
 for(const asset of assets)await compare(asset);
 report.articles.push({path,status:200,canonical:base+path,datePublished:'2026-11-06',blog:true,sitemap:true});
}
for(const slug of pies){
 const path=`/catalog/${slug}/`,html=(await get(path)).toString();
 const local=await fs.readFile(`site${path}index.html`,'utf8');
 assert.ok(html.includes('data-pie-gallery="hb-'+slug+'"'));
 assert.ok(html.includes('template data-cutaway-template'));
 const assets=new Set([...local.matchAll(/\/_astro\/(?:chicken-cheese|spinach-cheese)[^" ,<>]+/g)].map(m=>m[0]));
 assert.equal(assets.size,3);for(const asset of assets)await compare(asset);
 report.galleries.push({path,status:200,template:true,assets:assets.size});
}
const home=(await get('/')).toString(),localHome=await fs.readFile('site/index.html','utf8');
report.styles=[];
for(const m of localHome.matchAll(/<link[^>]+href="([^"\s]+\.css)"/g)){
 const path=m[1],css=await fs.readFile('site'+path,'utf8');
 if(!css.includes('pie-gallery-cutaway'))continue;
 assert.ok(home.includes(path));await compare(path);report.styles.push(path);
}
for(const m of localHome.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)){
 if(!m[1].includes('pie-gallery-cutaway'))continue;
 assert.ok(home.includes(m[0]));report.styles.push({inline:true,sha256:hash(Buffer.from(m[1]))});
}
assert.equal(report.styles.length,1,'One matching shared gallery stylesheet');
const content=JSON.parse(await fs.readFile(`${out}/content-production/production-report.json`,'utf8'));
assert.equal(content.base,base);assert.deepEqual(content.errors,[]);
const coverage=content.articles.filter(a=>slugs.some(slug=>a.path===`/journal/${slug}/`));assert.equal(coverage.length,2);
for(const path of new Set(coverage.flatMap(a=>[...a.bodyLinks,...a.cta.map(c=>c.href)]).map(href=>new URL(href,base).pathname))){
 await get(path);report.links.push({path,status:200});
}
for(const [directory,count,key] of [['cutaways-production',5,'views'],['catalog-production',6,'widths']]){
 const file=directory==='cutaways-production'?'report.json':'production-report.json';
 const data=JSON.parse(await fs.readFile(`${out}/${directory}/${file}`,'utf8'));
 assert.deepEqual(data.errors,[]);assert.equal(data[key].length,count);
 report[directory]={widths:data[key].map(x=>x.width),errors:0};
}
await fs.writeFile(`${out}/live-readback.json`,JSON.stringify(report,null,2)+'\n');
console.log(`Live PASS: 2 articles, 2 supplier galleries, ${report.assets.length} matching assets, ${report.links.length} internal links, journal 72 / sitemap 267, CI ${sha}.`);
