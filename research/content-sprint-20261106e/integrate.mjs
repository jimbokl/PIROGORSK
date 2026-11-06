import fs from 'node:fs/promises';
import sharp from 'sharp';

const root='research/content-sprint-20261106e/';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const articles=await read('src/data/monthly-articles.json'),meta=await read('src/data/monthly-article-meta.json'),artwork=await read('src/data/article-artwork.json'),figures=await read('src/data/monthly-article-figures.json'),matrix=await read('src/data/seo-matrix.json'),topics=await read('research/content-month-202611/topic-map.json');
const upsert=(xs,x,key)=>{const i=xs.findIndex(y=>y[key]===x[key]);if(i<0)xs.push(x);else xs[i]=x;};
const xml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const jobs=[
 {number:23,slug:'zavtraki-v-kaliningrade',plans:[
  {title:'Завтрак под ваш маршрут',labels:[['Ранний выезд','Адрес','и открытие кухни'],['После прогулки','Завтраки','весь день'],['Общий стол','Блюда','и напитки каждого']],afterSection:0,caption:'Для раннего выезда важны часы кухни, для позднего завтрака — доступность меню в выбранное время.'},
  {title:'Бюджет без среднего чека',labels:[['Блюдо','Выбор','каждого гостя'],['Напиток','Объём','и дополнения'],['Итог','Общие позиции','плюс личные заказы']],afterSection:4,caption:'Считайте конкретные позиции своего заказа; примеры из статьи не являются комплексами заведения.'}
 ]},
 {number:24,slug:'kofeyni-kaliningrada',plans:[
  {title:'Три кофейных сценария',labels:[['По дороге','Адрес','и упаковка с собой'],['За столом','Места для компании','и выпечка'],['Знакомство с кофе','Зерно','и доступный способ']],afterSection:0,caption:'Выберите цель остановки до поиска места: кофе по пути, общий стол или знакомство с зерном.'},
  {title:'Кофе для апартаментов',labels:[['Что есть дома','Чайник','и другое оборудование'],['Что купить','Зерно или помол','под ваш способ'],['Как получить','Заказ','и согласованное получение']],afterSection:5,caption:'Обжарщик и кафе — разные форматы: возможность покупки зерна не подтверждает наличие зала с посадкой.'}
 ]}
];
for(const job of jobs){
 const article=await read(root+job.slug+'.json');upsert(articles,article,'slug');
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
 Object.assign(topics.topics.find(x=>x.number===job.number),{topic:article.title,ownerURL:path,decision:'Отдельный поисковый сценарий; семейный обед остаётся у исходного владельца. Обе страницы связаны с ним и между собой.',status:'integrated_new',dataGap:'',publicationDate:article.date,evidenceNote:'Ручной спринт по запросу пользователя. Первичные источники, границы выводов и приёмка: research/content-sprint-20261106e/README.md'});
}
const hub=matrix.find(x=>x.path==='/journal/gde-poest-v-kaliningrade/');
if(hub)hub.relatedArticles=[...new Set([...(hub.relatedArticles||[]),...jobs.map(j=>'/journal/'+j.slug+'/')])];
for(const[file,data]of [['src/data/monthly-articles.json',articles],['src/data/monthly-article-meta.json',meta],['src/data/article-artwork.json',artwork],['src/data/monthly-article-figures.json',figures],['src/data/seo-matrix.json',matrix],['research/content-month-202611/topic-map.json',topics]])await write(file,data);
console.log('Integrated 2 articles, 2 covers, 4 diagrams; monthly articles:',articles.length);
