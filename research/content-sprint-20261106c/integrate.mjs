import fs from 'node:fs/promises';
import sharp from 'sharp';

const root='research/content-sprint-20261106c/';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const articles=await read('src/data/monthly-articles.json'),meta=await read('src/data/monthly-article-meta.json'),artwork=await read('src/data/article-artwork.json'),figures=await read('src/data/monthly-article-figures.json'),matrix=await read('src/data/seo-matrix.json'),topics=await read('research/content-month-202611/topic-map.json');
const upsert=(xs,x,key)=>{const i=xs.findIndex(y=>y[key]===x[key]);if(i<0)xs.push(x);else xs[i]=x;};
const xml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const jobs=[
 {number:19,slug:'kurschskaya-vorona-i-menyu',related:'/journal/regionalnaya-kuhnya-kaliningradskoy-oblasti/',relatedTitle:'Что попробовать из региональной кухни',plans:[
  {title:'Название: три разных контекста',labels:[['История','О прошлом','поселения'],['Вывеска','Об имени','места'],['Меню','О конкретном','заказе']],afterSection:1,caption:'Исторический рассказ, название места и позиция сегодняшнего меню требуют разных подтверждений.'},
  {title:'Понятный заказ: три шага',labels:[['Состав','Основа','и добавки'],['Подача','Горячее','или закуска'],['Порция','Масса','и гарнир']],afterSection:5,caption:'Перед заказом незнакомого блюда выясните состав, подачу и комплектность порции.'}
 ]}
];
for(const job of jobs){
 const article=await read(root+job.slug+'.json');
 Object.assign(article,{related:job.related,relatedTitle:job.relatedTitle});
 await write(root+job.slug+'.json',article);
 upsert(articles,article,'slug');
 meta[job.slug]={seoTitle:article.title,caption:'Редакционная иллюстрация, созданная с помощью ИИ. Не фотография.',modified:article.date};
 const source=`design/blog-source/month-202611/${job.slug}.png`;
 upsert(artwork,{slug:job.slug,source,alt:article.imageAlt},'slug');
 await sharp(source).resize(1200,630,{fit:'cover'}).jpeg({quality:82,mozjpeg:true}).toFile(`public/seo/blog/${job.slug}.jpg`);
 figures[job.slug]=[];
 for(const[i,p]of job.plans.entries()){
  const panels=p.labels.map(([heading,...lines],j)=>{const x=40+j*390;return `<rect x="${x}" y="150" width="340" height="310" rx="26" fill="${['#f3e3c8','#e0e9e5','#e6eaf0'][j]}"/><circle cx="${x+170}" cy="210" r="20" fill="#c28a3c"/><text x="${x+170}" y="218" text-anchor="middle" font-size="23" fill="#fff">${j+1}</text><text x="${x+170}" y="280" text-anchor="middle" font-size="${heading.length>12?31:36}" fill="#15273d">${xml(heading)}</text>${lines.map((l,k)=>`<text x="${x+170}" y="${350+k*47}" text-anchor="middle" font-size="30" fill="#40536c">${xml(l)}</text>`).join('')}`;}).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="530"><rect width="1200" height="530" rx="32" fill="#fbf8f2"/><g font-family="Arial,sans-serif"><text x="40" y="88" font-size="42" fill="#15273d">${xml(p.title)}</text>${panels}</g></svg>`;
  const name=job.slug+'-'+(i+1),dir='design/blog-source/month-202611/diagrams/';
  await fs.writeFile(dir+name+'.svg',svg);await sharp(Buffer.from(svg)).png().toFile(dir+name+'.png');
  figures[job.slug].push({afterSection:p.afterSection,source:name+'.png',alt:p.title+': '+p.labels.map(l=>l.join(' ')).join('; '),caption:p.caption});
 }
 const path='/journal/'+job.slug+'/';
 upsert(matrix,{path,cluster:'editorial',cohort:'month-202611',pageType:'article',title:article.title,query:article.title.toLocaleLowerCase('ru'),intent:article.intro,monthlySearches:null,demandSource:null,serpValidated:false,ownershipBasis:'editorial_scenario_primary_sources',nextStep:{path:'/podbor/',label:'Рассчитать пироги к общему столу'},relatedArticles:[...new Set([article.related,...article.sections.flatMap(s=>(s.links||[]).map(l=>l.href)).filter(h=>h.startsWith('/journal/'))])]},'path');
 Object.assign(topics.topics.find(x=>x.number===job.number),{topic:article.title,status:'integrated_new',dataGap:'',publicationDate:article.date,evidenceNote:'Дополнительный ручной спринт по запросу пользователя. Источники и приёмка: research/content-sprint-20261106c/README.md'});
}
for(const [owner,slug,title]of [['kuhnya-vostochnoy-prussii',jobs[0].slug,'Куршская ворона и словарь необычных названий в меню']]){
 const a=articles.find(x=>x.slug===owner);if(!a)throw new Error('Missing incoming link owner: '+owner);
 const href='/journal/'+slug+'/';
 if(!a.sections.some(s=>s.links?.some(l=>l.href===href))){const s=a.sections.at(-1);(s.links??=[]).push({href,title});}
}
for(const[file,data]of [['src/data/monthly-articles.json',articles],['src/data/monthly-article-meta.json',meta],['src/data/article-artwork.json',artwork],['src/data/monthly-article-figures.json',figures],['src/data/seo-matrix.json',matrix],['research/content-month-202611/topic-map.json',topics]])await write(file,data);
console.log('Integrated 1 article, 1 cover, 2 diagrams; monthly articles:',articles.length);
