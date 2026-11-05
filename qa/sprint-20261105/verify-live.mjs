import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const base='https://pirogorsk.ru';
const slugs=['kak-edyat-rybu-v-kaliningradskoy-oblasti','zavtrak-na-baltike'];
const sha=process.argv[2];
assert.match(sha||'',/^[a-f0-9]{40}$/,'Pass the deployed content commit SHA');
const report={base,checked:new Date().toISOString(),expectedSha:sha,articles:[],assets:[]};
const get=async path=>{
 const response=await fetch(base+path,{cache:'no-store',signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,200,path);
 return Buffer.from(await response.arrayBuffer());
};
const hash=b=>createHash('sha256').update(b).digest('hex');
const runs=JSON.parse(execFileSync('gh',['run','list','--workflow','pages.yml','--commit',sha,'--limit','1','--json','databaseId,headSha,conclusion,status,url'],{encoding:'utf8'}));
assert.equal(runs[0]?.headSha,sha,'CI content commit');
assert.equal(runs[0]?.conclusion,'success','Deployment CI');
report.deployment=runs[0];
report.release=JSON.parse((await get('/release.json')).toString());
assert.deepEqual(report.release,JSON.parse(await fs.readFile('site/release.json','utf8')));
const blog=(await get('/blog/')).toString();
const paths=[...new Set([...blog.matchAll(/href="(\/journal\/[^"?#]+\/)"/g)].map(m=>m[1]))];
assert.equal(paths.length,68,'Live journal article count');
report.journalArticles=paths.length;
const sitemap=(await get('/sitemap.xml')).toString();
report.sitemapUrls=[...sitemap.matchAll(/<loc>/g)].length;
assert.equal(report.sitemapUrls,263);
for(const slug of slugs){
 const path=`/journal/${slug}/`,html=(await get(path)).toString();
 assert.ok(paths.includes(path),'Blog link '+path);
 assert.ok(sitemap.includes(base+path),'Sitemap link '+path);
 assert.ok(html.includes(`rel="canonical" href="${base+path}"`),'Canonical '+path);
 assert.ok(html.includes('"datePublished":"2026-11-05"'),'Publication date '+path);
 const local=await fs.readFile(`site${path}index.html`,'utf8');
 const title=local.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1];
 assert.ok(title&&html.includes(title),'Published article title');
 const images=[...local.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
 const assets=new Set(images.map(tag=>tag.match(/\bsrc="([^"]+)"/)?.[1]).filter(p=>p&&p.startsWith('/_astro/')&&p.includes(slug)));
 assert.equal(assets.size,3,'Cover and two diagrams '+path);
 assets.add(`/seo/blog/${slug}.jpg`);
 for(const asset of assets){
  const expected=await fs.readFile('site'+asset),actual=await get(asset);
  assert.equal(hash(actual),hash(expected),'Asset SHA256 '+asset);
  report.assets.push({path:asset,bytes:actual.length,sha256:hash(actual)});
 }
 report.articles.push({path,status:200,canonical:base+path,datePublished:'2026-11-05',blog:true,sitemap:true});
}
const home=(await get('/')).toString();
const homeLocal=await fs.readFile('site/index.html','utf8');
const styles=[...homeLocal.matchAll(/<link[^>]+href="([^"\s]+\.css)"/g)].map(m=>m[1]);
const buyingStyles=[];
for(const path of styles){
 const expected=await fs.readFile('site'+path);
 if(!expected.toString().includes('#faf3e7'))continue;
 assert.ok(home.includes(path),'Live home references the new purchase stylesheet');
 const actual=await get(path);
 assert.equal(hash(actual),hash(expected),'Purchase CSS SHA256');
 buyingStyles.push({path,bytes:actual.length,sha256:hash(actual)});
}
assert.equal(buyingStyles.length,1,'Exactly one matching purchase stylesheet');
report.buyingStyles=buyingStyles;
const browserReport=JSON.parse(await fs.readFile('qa/sprint-20261105/content/production-report.json','utf8'));
assert.equal(browserReport.base,base,'Production browser report');
const coverage=browserReport.articles.filter(a=>slugs.some(slug=>a.path===`/journal/${slug}/`));
assert.equal(coverage.length,2);
report.links=[];
for(const path of new Set(coverage.flatMap(a=>[...a.bodyLinks,...a.cta.map(c=>c.href)]).map(href=>new URL(href,base).pathname))){
 await get(path);
 report.links.push({path,status:200});
}
const cards=JSON.parse(await fs.readFile('qa/sprint-20261105/production-cards-report.json','utf8'));
assert.equal(cards.base,base);
assert.equal(cards.pages.length,35);
assert.deepEqual(cards.errors,[]);
report.cards={pages:cards.pages.length,cards:cards.cards.length,widths:[...new Set(cards.pages.map(p=>p.width))]};
await fs.writeFile('qa/sprint-20261105/live-readback.json',JSON.stringify(report,null,2)+'\n');
console.log(`Live PASS: ${report.articles.length} articles, ${report.assets.length} matching images, purchase CSS SHA256, ${report.links.length} internal links, ${paths.length} journal links, ${report.sitemapUrls} sitemap URLs, CI ${sha}.`);
