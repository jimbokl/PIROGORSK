import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const base='https://pirogorsk.ru',output='qa/sprint-20261107g';
const artifactRoot=process.env.QA_ARTIFACT_ROOT;
const sha=process.argv[2];assert.match(sha||'',/^[a-f0-9]{40}$/);
const report={base,checked:new Date().toISOString(),expectedSha:sha,artifactRoot:artifactRoot||null,pages:[],assets:[],links:[],localImageByteDifferences:[]};
const hash=b=>createHash('sha256').update(b).digest('hex');
const get=async path=>{
 const response=await fetch(base+path,{cache:'no-store',signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,200,path);return Buffer.from(await response.arrayBuffer());
};
const runs=JSON.parse(execFileSync('gh',['run','list','--workflow','pages.yml','--commit',sha,'--limit','1','--json','databaseId,headSha,conclusion,status,url'],{encoding:'utf8'}));
assert.equal(runs[0]?.headSha,sha);assert.equal(runs[0]?.conclusion,'success');report.deployment=runs[0];
report.release=JSON.parse((await get('/release.json')).toString());
assert.deepEqual(report.release,JSON.parse(await fs.readFile('site/release.json','utf8')));
if(artifactRoot)assert.deepEqual(report.release,JSON.parse(await fs.readFile(artifactRoot+'/release.json','utf8')));
const blog=(await get('/blog/')).toString();
const paths=[...new Set([...blog.matchAll(/href="(\/journal\/[^"?#]+\/)"/g)].map(m=>m[1]))];
assert.equal(paths.length,82);assert(paths.includes('/journal/gde-poest-s-detmi-v-kaliningrade/') && paths.includes('/journal/pozdniy-uzhin-v-kaliningrade/'));report.journalArticles=paths.length;
const sitemap=(await get('/sitemap.xml')).toString();
report.sitemapUrls=[...sitemap.matchAll(/<loc>/g)].length;assert.equal(report.sitemapUrls,277);
const assets=new Set(),links=new Set();
for(const path of ['/journal/gde-poest-s-detmi-v-kaliningrade/','/journal/pozdniy-uzhin-v-kaliningrade/','/journal/gde-poest-v-svetlogorske/']){
 const html=(await get(path)).toString(),local=await fs.readFile(`site${path}index.html`,'utf8');
 assert(html.includes(`rel="canonical" href="${base+path}"`));assert(sitemap.includes(base+path));
 assert.equal(hash(Buffer.from(html)),hash(Buffer.from(local)),`Published HTML ${path}`);
 if(artifactRoot)assert.equal(hash(Buffer.from(html)),hash(await fs.readFile(`${artifactRoot}${path}index.html`)),`Artifact HTML ${path}`);
 assert(html.includes('"dateModified":"2026-11-07"'));
 for(const match of local.matchAll(/\/_astro\/svetlogorsk-breakfast[^\s",]+/g))assets.add(match[0]);
 const article=html.slice(html.indexOf('<article'),html.indexOf('</article>'));
 for(const link of article.matchAll(/href="(\/(?:journal\/[^"?#]+\/|podbor\/))[^" ]*"/g))links.add(link[1]);
 const slug=path.split('/').at(-2);
 for(const image of local.matchAll(/<img\b[^>]*>/g)){
  const src=image[0].match(/\bsrc="([^"]+)"/)?.[1];
  if(src?.startsWith('/_astro/')&&(src.includes(slug)||src.includes('svetlogorsk-breakfast')))assets.add(src);
  for(const match of image[0].matchAll(/\/_astro\/svetlogorsk-breakfast[^\s",]+/g))assets.add(match[0]);
 }
 for(const stylesheet of local.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)){
  const href=stylesheet[0].match(/\bhref="([^"]+)"/)?.[1];if(href)assets.add(href);
 }
 if(slug!=='gde-poest-v-svetlogorske')assets.add(`/seo/blog/${slug}.jpg`);
 report.pages.push({path,canonical:base+path,bytes:Buffer.byteLength(html),sha256:hash(Buffer.from(html)),modified:'2026-11-07'});
}
for(const path of ['/', '/menu/', '/blog/']){
 const actual=await get(path),local=await fs.readFile(`site${path}index.html`);
 assert.equal(hash(actual),hash(local),`Published HTML ${path}`);
 if(artifactRoot)assert.equal(hash(actual),hash(await fs.readFile(`${artifactRoot}${path}index.html`)),`Artifact HTML ${path}`);
 report.pages.push({path,bytes:actual.length,sha256:hash(actual)});
 for(const match of local.toString().matchAll(/<link[^>]*href="(\/_astro\/[^"]+\.css)"[^>]*>/g))assets.add(match[1]);
}
for(const path of assets){
 const actual=await get(path),local=await fs.readFile('site'+path);
 const expected=artifactRoot?await fs.readFile(artifactRoot+path):local;
 assert.equal(hash(actual),hash(expected),path);
 const localMatches=hash(actual)===hash(local);
 if(!localMatches){
  assert.match(path,/^\/_astro\/[^/]+\.(?:avif|webp)$/,'Only encoded image bytes may differ from the local build');
  report.localImageByteDifferences.push({path,publishedSha256:hash(actual),localSha256:hash(local),publishedBytes:actual.length,localBytes:local.length});
 }
 report.assets.push({path,bytes:actual.length,sha256:hash(actual),localMatches,reference:artifactRoot?'CI Pages artifact':'local build'});
}
for(const path of links){await get(path);report.links.push({path,status:200});}
await fs.writeFile(`${output}/live-readback.json`,JSON.stringify(report,null,2)+'\n');
console.log(`Live PASS: 6 HTML SHA256, ${report.assets.length} assets, ${report.links.length} links; journal 82 / sitemap 277 / CI ${runs[0].databaseId}. Local image byte differences: ${report.localImageByteDifferences.length}; reference: ${artifactRoot?'CI Pages artifact':'local build'}.`);
