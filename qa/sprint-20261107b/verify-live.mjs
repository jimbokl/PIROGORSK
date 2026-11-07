import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const base='https://pirogorsk.ru',out='qa/sprint-20261107b';
const slugs=['kofe-i-vypechka-v-zelenogradske'];
const sha=process.argv[2];
assert.match(sha||'',/^[a-f0-9]{40}$/,'Pass the deployed runtime SHA');
const report={base,checked:new Date().toISOString(),expectedSha:sha,articles:[],assets:[],links:[]};
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
assert.equal(paths.length,79);report.journalArticles=paths.length;
const sitemap=(await get('/sitemap.xml')).toString();
report.sitemapUrls=[...sitemap.matchAll(/<loc>/g)].length;assert.equal(report.sitemapUrls,274);
const content=JSON.parse(await fs.readFile(`${out}/content-production/production-report.json`,'utf8'));
assert.equal(content.base,base);assert.deepEqual(content.errors,[]);
const linkPaths=new Set();
for(const slug of slugs){
 const path=`/journal/${slug}/`;
 const html=(await get(path)).toString(),local=await fs.readFile(`site${path}index.html`,'utf8');
 assert.ok(paths.includes(path));assert.ok(sitemap.includes(base+path));
 assert.ok(html.includes(`rel="canonical" href="${base+path}"`));
 assert.ok(html.includes('"datePublished":"2026-11-07"'));
 const title=local.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1];assert.ok(title&&html.includes(title));
 const stylesIn=source=>[...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]);
 const localStyles=stylesIn(local),liveStyles=stylesIn(html);
 assert.deepEqual(liveStyles,localStyles,'Inline stylesheet '+path);
 report.inlineStyles??=[];report.inlineStyles.push({path,blocks:liveStyles.map(css=>({bytes:Buffer.byteLength(css),sha256:hash(Buffer.from(css))}))});
 const assets=new Set([...local.matchAll(/<img\b[^>]*>/g)].map(m=>m[0].match(/\bsrc="([^"]+)"/)?.[1]).filter(p=>p&&p.startsWith('/_astro/')&&p.includes(slug)));
 assert.equal(assets.size,3);assets.add(`/seo/blog/${slug}.jpg`);
 const styles=new Set([...local.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(m=>m[0].match(/\bhref="([^"]+)"/)?.[1]).filter(Boolean));
 for(const asset of new Set([...assets,...styles])){
  if(report.assets.some(a=>a.path===asset))continue;
  const expected=await fs.readFile('site'+asset),actual=await get(asset);
  assert.equal(hash(actual),hash(expected),'Asset SHA256 '+asset);
  report.assets.push({path:asset,bytes:actual.length,sha256:hash(actual)});
 }
 report.articles.push({path,status:200,canonical:base+path,datePublished:'2026-11-07',blog:true,sitemap:true});
 const article=content.articles.find(a=>a.path===path);assert.ok(article);
 for(const link of [...article.bodyLinks,...article.cta.map(c=>c.href)])linkPaths.add(new URL(link,base).pathname);
}
const hub=(await get('/journal/gde-poest-v-zelenogradske/')).toString();
for(const slug of slugs)assert.ok(hub.includes(`href="/journal/${slug}/"`),'Incoming link '+slug);
report.incomingLinks={path:'/journal/gde-poest-v-zelenogradske/',slugs};
for(const path of linkPaths){await get(path);report.links.push({path,status:200});}
await fs.writeFile(`${out}/live-readback.json`,JSON.stringify(report,null,2)+'\n');
console.log(`Live PASS: 1 article, ${report.assets.length} matching images + inline CSS, ${report.links.length} links; journal 79 / sitemap 274, CI ${sha}.`);
