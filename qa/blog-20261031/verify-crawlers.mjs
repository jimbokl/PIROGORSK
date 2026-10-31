// HTTP/indexability probe with a bot user agent; this is not evidence of a Google crawl.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const origin='https://pirogorsk.ru';
const articles=JSON.parse(await readFile('src/data/semantic-articles.json','utf8'));
const headers={'User-Agent':'Googlebot','Cache-Control':'no-cache'};
const robots=await fetch(`${origin}/robots.txt`,{headers});
assert.equal(robots.status,200);
const robotsText=await robots.text();
assert.ok(robotsText.includes(`Sitemap: ${origin}/sitemap.xml`));
assert.ok(!/^Disallow:\s*\/\s*$/mi.test(robotsText));
const sitemap=await fetch(`${origin}/sitemap.xml`,{headers});
assert.equal(sitemap.status,200);
const sitemapText=await sitemap.text();
const queue=[...articles],results=[];
await Promise.all(Array.from({length:4},async()=>{
 for(let article;(article=queue.shift());){
  const url=`${origin}/journal/${article.slug}/`;
  const response=await fetch(url,{headers,signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,200,url);
  const body=await response.text();
  const robotsHeader=response.headers.get('x-robots-tag')??'';
  assert.ok(!/noindex/i.test(robotsHeader),url);
  assert.ok(!/<meta[^>]+(?:name=["'](?:robots|googlebot)["'][^>]+content=["'][^"']*noindex|content=["'][^"']*noindex[^>]+name=["'](?:robots|googlebot))/i.test(body),url);
  assert.ok(body.includes(`<link rel="canonical" href="${url}"`),url);
  assert.ok(body.includes(article.title),url);
  assert.ok(sitemapText.includes(`<loc>${url}</loc>`),url);
  results.push({url,status:response.status,robotsHeader,canonical:true,inSitemap:true,serverRenderedContent:true});
 }
}));
await writeFile('qa/blog-20261031/crawler-probe.json',JSON.stringify({checkedAt:new Date().toISOString(),method:'HTTP requests using Googlebot user agent, without query parameters; not a verified Google crawl or indexing status',robotsStatus:robots.status,sitemapStatus:sitemap.status,results:results.sort((a,b)=>a.url.localeCompare(b.url))},null,2)+'\n');
console.log(`PASS: ${results.length} new URLs return indexable server-rendered HTML; robots/sitemap accessible. Indexing not asserted.`);
