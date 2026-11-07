import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';

const base='https://pirogorsk.ru', output='qa/sprint-20261107q';
const sha=process.argv[2];assert.match(sha||'',/^[a-f0-9]{40}$/);
const hash=b=>createHash('sha256').update(b).digest('hex');
const report={checked:new Date().toISOString(),base,sha,pages:[],assets:[],links:[]};
const get=async path=>{const r=await fetch(base+path,{cache:'no-store',signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,path);return Buffer.from(await r.arrayBuffer());};
const runs=JSON.parse(execFileSync('gh',['run','list','--workflow','pages.yml','--commit',sha,'--limit','1','--json','databaseId,headSha,conclusion,status,url'],{encoding:'utf8'}));
assert.equal(runs[0]?.headSha,sha);assert.equal(runs[0]?.conclusion,'success');report.deployment=runs[0];
report.release=JSON.parse((await get('/release.json')).toString());
assert.deepEqual(report.release,JSON.parse(await readFile('site/release.json','utf8')));
assert.equal(report.release.catalogSha256,'8f0167cee69690fdfa76d87a1b1edfe60354887dd0dfb16bd2c23dd7b6881a20');
const slug='kish-s-kuritsey-i-gribami', articlePath=`/journal/${slug}/`;
const blog=(await get('/blog/')).toString();
report.articleCount=new Set([...blog.matchAll(/href="(\/journal\/[^"?#]+\/)"/g)].map(x=>x[1])).size;
assert.equal(report.articleCount,87);
const sitemap=(await get('/sitemap.xml')).toString();report.sitemapCount=[...sitemap.matchAll(/<loc>/g)].length;assert.equal(report.sitemapCount,282);
const assets=new Set([`/seo/blog/${slug}.jpg`]),links=new Set();
for(const path of ['/','/menu/','/pirogi/rybnyy-pirog/','/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/','/delivery/','/zelenogradsk/','/svetlogorsk/','/kaliningrad/','/blog/',articlePath]){
 const actual=await get(path),local=await readFile(`site${path}index.html`),html=actual.toString();
 assert.equal(hash(actual),hash(local),`Published HTML ${path}`);assert(html.includes(`rel="canonical" href="${base+path}"`));
 report.pages.push({path,bytes:actual.length,sha256:hash(actual)});
 for(const x of html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>|<link\b[^>]*href="([^"]+)"[^>]*rel="stylesheet"[^>]*>/g))assets.add(x[1]||x[2]);
 for(const x of html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*>/g))if(x[1].startsWith('/_astro/'))assets.add(x[1]);
 if(path===articlePath){
  assert(html.includes('"dateModified":"2026-11-07"'));assert(html.includes('"datePublished":"2026-11-07"'));
  for(const fact of ['250 г','400 г','200 мл','180 °C','74 °C','1 200 ÷ 8'])assert(html.includes(fact),fact);
  for(const x of html.matchAll(/\/_astro\/[^\s",]+\.(?:webp|avif)/g))assets.add(x[0]);
  const article=html.slice(html.indexOf('<article'),html.indexOf('</article>'));
  for(const x of article.matchAll(/href="(\/(?:journal\/[^"?#]+\/|podbor\/|zelenogradsk\/|svetlogorsk\/))[^" ]*"/g))links.add(x[1]);
 }
}
for(const path of assets){
 const actual=await get(path),local=await readFile('site'+path),same=hash(actual)===hash(local);
 const item={path,bytes:actual.length,sha256:hash(actual),localMatches:same};
 if(path.endsWith('.avif')){
  const [a,b]=await Promise.all([sharp(actual).metadata(),sharp(local).metadata()]);
  assert.equal(a.format,'heif');assert.equal(a.compression,'av1');assert.equal(a.width,b.width);assert.equal(a.height,b.height);
  await sharp(actual).raw().toBuffer();item.decoded=true;item.width=a.width;item.height=a.height;
  item.reference='local dimensions and successful decode; AVIF bytes may differ between platforms';
 }else{assert(same,`Published CSS/WebP bytes ${path}`);item.reference='local build SHA256';}
 report.assets.push(item);
}
assert(report.assets.some(x=>x.path.endsWith('.js')));assert(report.assets.some(x=>x.path.endsWith('.webp')));assert(report.assets.some(x=>x.path.endsWith('.avif')));
for(const path of links){await get(path);report.links.push({path,status:200});}
await writeFile(`${output}/live-readback.json`,JSON.stringify(report,null,2)+'\n');
console.log(`Live PASS: ${report.pages.length} HTML SHA256, CSS/JS/WebP SHA256, ${report.assets.length} assets including decoded AVIF, ${report.links.length} internal links, blog87/sitemap282/catalog154; CI ${runs[0].databaseId}.`);
