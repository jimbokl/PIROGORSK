import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const base='https://pirogorsk.ru';
const slugs=['stroganina-iz-pelamidy','kuhnya-vostochnoy-prussii','baltiyskie-syry'];
const sha=process.argv[2];
assert.ok(sha,'Pass the deployed content commit SHA');
const report={base,checked:new Date().toISOString(),expectedSha:sha,articles:[],assets:[]};
const get=async path=>{
 const response=await fetch(base+path,{cache:'no-store',signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,200,path);
 return Buffer.from(await response.arrayBuffer());
};
const hash=b=>createHash('sha256').update(b).digest('hex');
report.release=JSON.parse((await get('/release.json')).toString());
const runs=JSON.parse(execFileSync('gh',['run','list','--workflow','pages.yml','--commit',sha,'--limit','1','--json','databaseId,headSha,conclusion,status,url'],{encoding:'utf8'}));
assert.equal(runs[0]?.headSha,sha,'CI content commit');
assert.equal(runs[0]?.conclusion,'success','Deployment CI');
report.deployment=runs[0];
const blog=(await get('/blog/')).toString();
const paths=[...new Set([...blog.matchAll(/href="(\/journal\/[^"?#]+\/)"/g)].map(m=>m[1]))];
assert.equal(paths.length,65,'Live journal article count');
report.journalArticles=paths.length;
const sitemap=(await get('/sitemap.xml')).toString();
report.sitemapUrls=[...sitemap.matchAll(/<loc>/g)].length;
assert.equal(report.sitemapUrls,260);
for(const slug of slugs){
 const path=`/journal/${slug}/`,html=(await get(path)).toString();
 assert.ok(paths.includes(path),'Blog link '+path);
 assert.ok(sitemap.includes(base+path),'Sitemap link '+path);
 assert.ok(html.includes(`rel="canonical" href="${base+path}"`),'Canonical '+path);
 assert.ok(html.includes('"datePublished":"2026-11-04"'),'Publication date '+path);
 const local=await fs.readFile(`site${path}index.html`,'utf8');
 const images=[...local.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
 const assets=new Set(images.map(tag=>tag.match(/\bsrc="([^"]+)"/)?.[1]).filter(p=>p&&p.startsWith('/_astro/')&&p.includes(slug)));
 assert.equal(assets.size,3,'Cover and two diagrams '+path);
 assets.add(`/seo/blog/${slug}.jpg`);
 for(const asset of assets){
  const expected=await fs.readFile('site'+asset),actual=await get(asset);
  assert.equal(hash(actual),hash(expected),'Asset SHA256 '+asset);
  report.assets.push({path:asset,bytes:actual.length,sha256:hash(actual)});
 }
 report.articles.push({path,status:200,canonical:base+path,datePublished:'2026-11-04',blog:true,sitemap:true});
}
const browserReport=JSON.parse(await fs.readFile('qa/content-next-20261104/production-report.json','utf8'));
assert.equal(browserReport.base,base,'Production browser report');
const coverage=browserReport.articles.filter(a=>slugs.some(slug=>a.path===`/journal/${slug}/`));
assert.equal(coverage.length,3);
report.links=[];
for(const path of new Set(coverage.flatMap(a=>[...a.bodyLinks,...a.cta.map(c=>c.href)]).map(href=>new URL(href,base).pathname))){
 await get(path);
 report.links.push({path,status:200});
}
await fs.writeFile('qa/content-next-20261104/live-readback.json',JSON.stringify(report,null,2)+'\n');
console.log(`Live PASS: ${report.articles.length} articles, ${report.assets.length} matching assets, ${report.links.length} internal links, ${paths.length} journal links, ${report.sitemapUrls} sitemap URLs, SHA ${sha}.`);
