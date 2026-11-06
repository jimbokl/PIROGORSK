import fs from 'node:fs/promises';
import sharp from 'sharp';

const root='research/content-sprint-20261106d/';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const articles=await read('src/data/monthly-articles.json'),meta=await read('src/data/monthly-article-meta.json'),artwork=await read('src/data/article-artwork.json'),figures=await read('src/data/monthly-article-figures.json'),matrix=await read('src/data/seo-matrix.json'),topics=await read('research/content-month-202611/topic-map.json');
const upsert=(xs,x,key)=>{const i=xs.findIndex(y=>y[key]===x[key]);if(i<0)xs.push(x);else xs[i]=x;};
const xml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const jobs=[
 {number:35,slug:'kraftovoe-pivo-kaliningrada',related:'/journal/regionalnaya-kuhnya-kaliningradskoy-oblasti/',relatedTitle:'Что попробовать из региональной кухни',plans:[
  {title:'Выберите формат посещения',labels:[['Экскурсия','Запись','и программа'],['Ужин','Стол','и меню кухни'],['Поездка','Адрес','и возвращение']],afterSection:0,caption:'Сначала определите цель визита, затем проверьте связанные с ней условия.'},
  {title:'Где варят, наливают и продают',labels:[['Пивоварня','Производство','напитка'],['Бар','Подборка','производителей'],['Магазин','Покупка','с собой']],afterSection:4,caption:'Собственная варка, барная подборка и розничная продажа — разные форматы места.'}
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
  const panels=p.labels.map(([heading,...lines],j)=>{const y=150+j*240;return `<rect x="40" y="${y}" width="920" height="210" rx="26" fill="${['#f3e3c8','#e0e9e5','#e6eaf0'][j]}"/><circle cx="98" cy="${y+64}" r="27" fill="#a46b27"/><text x="98" y="${y+74}" text-anchor="middle" font-size="30" fill="#fff">${j+1}</text><text x="160" y="${y+70}" font-size="48" fill="#15273d">${xml(heading)}</text>${lines.map((l,k)=>`<text x="160" y="${y+128+k*49}" font-size="42" fill="#40536c">${xml(l)}</text>`).join('')}`;}).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="900"><rect width="1000" height="900" rx="32" fill="#fbf8f2"/><g font-family="Arial,sans-serif"><text x="40" y="88" font-size="50" fill="#15273d">${xml(p.title)}</text>${panels}</g></svg>`;
  const name=job.slug+'-'+(i+1),dir='design/blog-source/month-202611/diagrams/';
  await fs.writeFile(dir+name+'.svg',svg);await sharp(Buffer.from(svg)).png().toFile(dir+name+'.png');
  figures[job.slug].push({afterSection:p.afterSection,source:name+'.png',alt:p.title+': '+p.labels.map(l=>l.join(' ')).join('; '),caption:p.caption});
 }
 const path='/journal/'+job.slug+'/';
 upsert(matrix,{path,cluster:'editorial',cohort:'month-202611',pageType:'article',title:article.title,query:article.title.toLocaleLowerCase('ru'),intent:article.intro,monthlySearches:null,demandSource:null,serpValidated:false,ownershipBasis:'editorial_scenario_primary_sources',nextStep:{path:'/podbor/',label:'Рассчитать пироги к общему столу'},relatedArticles:[...new Set([article.related,...article.sections.flatMap(s=>(s.links||[]).map(l=>l.href)).filter(h=>h.startsWith('/journal/'))])]},'path');
 Object.assign(topics.topics.find(x=>x.number===job.number),{topic:article.title,status:'integrated_new',dataGap:'',publicationDate:article.date,evidenceNote:'Дополнительный ручной спринт по запросу пользователя. Источники и приёмка: research/content-sprint-20261106d/README.md'});
}
for(const [owner,slug,title]of [['konigsbergskie-klopsy',jobs[0].slug,'Пивоварни Калининграда: три формата посещения']]){
 const a=articles.find(x=>x.slug===owner);if(!a)throw new Error('Missing incoming link owner: '+owner);
 const href='/journal/'+slug+'/';
 if(!a.sections.some(s=>s.links?.some(l=>l.href===href))){const s=a.sections[4];(s.links??=[]).push({href,title});}
}
for(const[file,data]of [['src/data/monthly-articles.json',articles],['src/data/monthly-article-meta.json',meta],['src/data/article-artwork.json',artwork],['src/data/monthly-article-figures.json',figures],['src/data/seo-matrix.json',matrix],['research/content-month-202611/topic-map.json',topics]])await write(file,data);
console.log('Integrated 1 article, 1 cover, 2 diagrams; monthly articles:',articles.length);
