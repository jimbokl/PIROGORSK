import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const {validateSource}=createRequire(import.meta.url)('../../.github/scripts/recover-pages.cjs');

const base='https://pirogorsk.ru',output='qa/sprint-20261107c';
const path='/journal/gde-poest-v-zelenogradske/';
const sha=process.argv[2];assert.match(sha||'',/^[a-f0-9]{40}$/);
const report={base,path,checked:new Date().toISOString(),expectedSha:sha,assets:[],links:[]};
const get=async path=>{
 const response=await fetch(base+path,{cache:'no-store',signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,200,path);return Buffer.from(await response.arrayBuffer());
};
const hash=b=>createHash('sha256').update(b).digest('hex');
const api=route=>JSON.parse(execFileSync('gh',['api',`repos/jimbokl/PIROGORSK/${route}`],{encoding:'utf8'}));
const recoveryId=process.argv[3];
if(recoveryId){
 assert.match(recoveryId,/^\d+$/);
 const recovery=JSON.parse(await fs.readFile(`${output}/recovery-evidence/.pages-recovery.json`,'utf8'));
 const run=api(`actions/runs/${recoveryId}`);
 assert.equal(run.path,'.github/workflows/recover-pages.yml');assert.equal(run.conclusion,'success');
 assert.equal(run.head_sha,recovery.deploymentWorkflowSha);assert.equal(run.id,recovery.recoveryRunId);
 assert.equal(recovery.testedSourceSha,sha);assert.equal(recovery.statuses.at(-1)?.status,'succeed');assert(!recovery.error);
 const source=api(`actions/runs/${recovery.sourceRunId}`);
 assert.equal(source.head_sha,sha);assert.equal(source.run_attempt,recovery.sourceAttempt);
 const jobs=api(`actions/runs/${source.id}/attempts/${source.run_attempt}/jobs?per_page=100`).jobs;
 const artifacts=api(`actions/runs/${source.id}/artifacts?per_page=100`).artifacts;
 const comparison=api(`compare/${sha}...${run.head_sha}`);
 const artifact=validateSource(source,jobs,artifacts,comparison);
 assert.equal(artifact.id,recovery.artifactId);assert.equal(artifact.digest,recovery.artifactDigest);
 report.deployment={recoveryRun:run.html_url,conclusion:run.conclusion,...recovery};
}else{
 const runs=JSON.parse(execFileSync('gh',['run','list','--workflow','pages.yml','--commit',sha,'--limit','1','--json','databaseId,headSha,conclusion,status,url'],{encoding:'utf8'}));
 assert.equal(runs[0]?.headSha,sha);assert.equal(runs[0]?.conclusion,'success');report.deployment=runs[0];
}
report.release=JSON.parse((await get('/release.json')).toString());
assert.deepEqual(report.release,JSON.parse(await fs.readFile('site/release.json','utf8')));
const blog=(await get('/blog/')).toString();
const paths=[...new Set([...blog.matchAll(/href="(\/journal\/[^"?#]+\/)"/g)].map(m=>m[1]))];
assert.equal(paths.length,79);assert(paths.includes(path));report.journalArticles=paths.length;
const sitemap=(await get('/sitemap.xml')).toString();
report.sitemapUrls=[...sitemap.matchAll(/<loc>/g)].length;assert.equal(report.sitemapUrls,274);assert(sitemap.includes(base+path));
const html=(await get(path)).toString(),local=await fs.readFile(`site${path}index.html`,'utf8');
assert(html.includes(`rel="canonical" href="${base+path}"`));
assert(html.includes('"datePublished":"2026-10-24"'));assert(html.includes('"dateModified":"2026-11-07"'));
const title=local.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1];assert(title&&html.includes(title));
for(const token of ['Семь блюд до 700','Курортный проспект, 28б','анчоусы','2 700','4 900','https://cafehorizont.ru/#menu'])assert(html.includes(token),token);
const stylesIn=source=>[...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]);
const localStyles=stylesIn(local),liveStyles=stylesIn(html);
assert.deepEqual(liveStyles,localStyles,'Published inline styles');
report.inlineStyles=liveStyles.map(css=>({bytes:Buffer.byteLength(css),sha256:hash(Buffer.from(css))}));
const images=[...local.matchAll(/<img\b[^>]*>/g)].map(m=>m[0].match(/\bsrc="([^"]+)"/)?.[1]).filter(p=>p?.startsWith('/_astro/')&&p.includes('gde-poest-v-zelenogradske'));
const styles=[...local.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(m=>m[0].match(/\bhref="([^"]+)"/)?.[1]).filter(Boolean);
for(const asset of new Set([...images,...styles,'/seo/blog/gde-poest-v-zelenogradske.jpg'])){
 const expected=await fs.readFile('site'+asset),actual=await get(asset);
 assert.equal(hash(actual),hash(expected),'Asset '+asset);
 report.assets.push({path:asset,bytes:actual.length,sha256:hash(actual)});
}
const article=html.slice(html.indexOf('<article'),html.indexOf('</article>'));
const links=new Set([...article.matchAll(/href="(\/(?:journal\/[^"?#]+\/|podbor\/))[^" ]*"/g)].map(m=>m[1]));
assert(links.size>=4);
for(const link of links){await get(link);report.links.push({path:link,status:200});}
report.content={canonical:base+path,datePublished:'2026-10-24',dateModified:'2026-11-07',blog:true,sitemap:true};
await fs.writeFile(`${output}/live-readback.json`,JSON.stringify(report,null,2)+'\n');
console.log(`Live PASS: guide dates/content, inline styles + ${report.assets.length} image/CSS assets, ${report.links.length} links; journal 79, sitemap 274, tested source ${sha}${recoveryId?' / recovery '+recoveryId:''}.`);
