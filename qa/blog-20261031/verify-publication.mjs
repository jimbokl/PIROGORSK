// Independently compare published resources with the downloaded CI Pages artifact.
import assert from 'node:assert/strict';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve('qa/blog-20261031');
const artifact = resolve(root, 'artifact-site');
const articles = JSON.parse(await readFile('src/data/semantic-articles.json','utf8'));
const paths=[];
async function walk(dir) {for(const item of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,item.name);if(item.isDirectory())await walk(path);else paths.push(relative(artifact,path));}}
await walk(artifact);
const html=paths.filter(p=>p.endsWith('.html'));assert.equal(html.length,247);
const selected=new Set(paths.filter(p=>/\.(?:html|css|js|json|xml|txt)$/.test(p)));
for(const article of articles){
 const file=`journal/${article.slug}/index.html`;const text=await readFile(resolve(artifact,file),'utf8');
 assert.ok(text.includes('id="sources"'));assert.ok(text.includes('"datePublished":"2026-10-31"'));
 for(const m of text.matchAll(/\/(?:_astro|seo\/blog)\/[^\s"'<>?,]+/g)){const p=decodeURI(m[0].slice(1));if(paths.includes(p))selected.add(p);}
}
const queue=[...selected],files=[],failures=[];const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
await Promise.all(Array.from({length:8},async()=>{
 for(let file;(file=queue.shift());){
  const expected=await readFile(resolve(artifact,file));
  const path=file==='index.html'?'/':file.endsWith('/index.html')?`/${file.slice(0,-10)}`:`/${file}`;
  const url=new URL(path,'https://pirogorsk.ru');url.searchParams.set('qa','1');
  try{
   const response=await fetch(url,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(30000)});
   const bytes=Buffer.from(await response.arrayBuffer());const sha256=hash(bytes),matchesBuild=sha256===hash(expected);
   assert.equal(response.status,200,path);assert.equal(matchesBuild,true,`Bytes differ: ${path}`);
   files.push({path,status:response.status,bytes:bytes.length,sha256,matchesBuild});
  }catch(error){failures.push({path,error:error.message});}
 }
}));
await writeFile(`${root}/publication.json`,JSON.stringify({checkedAt:new Date().toISOString(),source:'Independently downloaded GitHub Actions Pages artifact',htmlPages:html.length,newArticles:articles.length,files:files.sort((a,b)=>a.path.localeCompare(b.path)),failures},null,2)+'\n');
assert.deepEqual(failures,[]);console.log(`PASS: ${files.length} production resources match CI artifact; all ${html.length} HTML pages, runtime and new article images.`);
