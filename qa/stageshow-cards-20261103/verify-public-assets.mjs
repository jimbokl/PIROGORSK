import assert from'node:assert/strict';import{readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';
const origin='https://pirogorsk.ru';const paths=['/','/menu/','/journal/dostavka-edy-v-zelenogradske/','/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/','/nabor/piknik-u-morya/','/zelenogradsk/'];
const hash=x=>createHash('sha256').update(x).digest('hex');
const inline=html=>({styles:[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(x=>hash(x[1])),scripts:[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(x=>!/\bsrc=/.test(x[1])&&(!/\btype=/.test(x[1])||/\btype="(?:module|text\/javascript|application\/javascript)"/.test(x[1]))).map(x=>hash(x[2]))});
const assets=new Set(),pages=[];
for(const path of paths){const local=await readFile(`site${path}index.html`,'utf8');const r=await fetch(origin+path+'?qa=1',{cache:'no-store'});assert(r.ok);const remote=await r.text();assert.deepEqual(inline(remote),inline(local),`${path} inline CSS/JS`);pages.push({path,...inline(local)});for(const m of local.matchAll(/(?:href|src)="(\/_astro\/[^"?]+\.(?:css|js))"/g)){assert(remote.includes(m[1]));assets.add(m[1]);}}
const external={};for(const path of assets){const r=await fetch(origin+path);assert(r.ok);const actual=hash(Buffer.from(await r.arrayBuffer()));assert.equal(actual,hash(await readFile('site'+path)),path);external[path]=actual;}
const inlineBlocks=pages.reduce((n,p)=>n+p.styles.length+p.scripts.length,0);assert(inlineBlocks>0);
await writeFile('qa/stageshow-cards-20261103/production-assets.json',JSON.stringify({pages,external,inlineBlocks,pass:true},null,2)+'\n');console.log(`PASS: ${pages.length} production pages, ${inlineBlocks} inline CSS/JS blocks and ${assets.size} external assets match build by SHA256.`);
