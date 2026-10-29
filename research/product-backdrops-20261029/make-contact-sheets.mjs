import sharp from 'sharp';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
const root = new URL('../../', import.meta.url);
const jobs = JSON.parse(await readFile(new URL('./prompts.json', import.meta.url), 'utf8'));
const available = [];
for (const [index, job] of jobs.entries()) {
  try { await stat(new URL(job.source, root)); available.push({ ...job, index }); } catch {}
}
const directory = new URL('../../qa/product-backdrops-20261029/', import.meta.url);
await mkdir(directory, { recursive:true });
const cellWidth = 250, cellHeight = 280, columns = 4, perSheet = 24;
const escape = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(let offset=0; offset<available.length; offset+=perSheet) {
  const group = available.slice(offset, offset+perSheet), overlays=[];
  for (const [index, job] of group.entries()) {
    const left=index%columns*cellWidth, top=Math.floor(index/columns)*cellHeight;
    overlays.push({ input:await sharp(new URL(job.source, root).pathname).resize(244,244,{fit:'contain'}).png().toBuffer(), left:left+3, top });
    const caption = `${job.index+1}. ${job.name}`;
    overlays.push({ input:Buffer.from(`<svg width="250" height="36"><text x="5" y="15" fill="#183847" font-family="Arial" font-size="10">${escape(caption.slice(0,39))}</text><text x="5" y="29" fill="#183847" font-family="Arial" font-size="10">${escape(caption.slice(39,78))}</text></svg>`),left,top:top+244 });
  }
  await sharp({create:{width:columns*cellWidth,height:Math.ceil(group.length/columns)*cellHeight,channels:3,background:'#fbf9f4'}}).composite(overlays).png().toFile(new URL(`contact-sheet-${Math.floor(offset/perSheet)+1}.png`,directory).pathname);
}
await writeFile(new URL('contact-index.json',directory),JSON.stringify(available.map(({id,name,index})=>({id,name,index:index+1})),null,2)+'\n');
console.log(JSON.stringify({images:available.length,sheets:Math.ceil(available.length/perSheet)}));
