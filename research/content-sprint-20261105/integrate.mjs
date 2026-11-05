import fs from 'node:fs/promises';
import sharp from 'sharp';
const root='research/content-sprint-20261105/';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const articles=await read('src/data/monthly-articles.json'),meta=await read('src/data/monthly-article-meta.json'),artwork=await read('src/data/article-artwork.json'),figures=await read('src/data/monthly-article-figures.json'),matrix=await read('src/data/seo-matrix.json'),topics=await read('research/content-month-202611/topic-map.json');
const upsert=(xs,x,key)=>{const i=xs.findIndex(y=>y[key]===x[key]);if(i<0)xs.push(x);else xs[i]=x;};
const jobs=[
 {number:11,slug:'kak-edyat-rybu-v-kaliningradskoy-oblasti',image:'exec-a77cb9fc-2886-40f1-b733-2ca2b963a3a5.png',plans:[{title:'Рыбный обед: выберите формат',labels:[['Закуска','Попробовать','и поделиться'],['Суп','Остановиться','за столом'],['Горячее','Пообедать','без спешки']],afterSection:0},{title:'Цена целой рыбы',labels:[['Вес','До','приготовления'],['Ставка','Цена','за 100 г'],['Итог','Вес ÷ 100','× ставка']],afterSection:3}]},
 {number:14,slug:'zavtrak-na-baltike',image:'exec-0cf2e2b6-7872-4036-9a94-bcd99cf6596e.png',plans:[{title:'Завтрак перед прогулкой',labels:[['Место','Город','и адрес'],['Время','Часы подачи','завтраков'],['Маршрут','От жилья','до моря']],afterSection:1},{title:'Соберите свой завтрак',labels:[['Блюдо','Привычная','порция'],['Напиток','Входит','или отдельно?'],['Дополнения','Общие','на весь стол']],afterSection:5}]}
];
for(const job of jobs){
 const captions={"kak-edyat-rybu-v-kaliningradskoy-oblasti": ["Закуска — попробовать и поделиться; суп — остановиться за столом; горячее — пообедать без спешки.", "Сначала уточните массу рыбы до приготовления и цену за 100 г, затем рассчитайте итоговую стоимость."], "zavtrak-na-baltike": ["Перед прогулкой проверьте адрес, часы завтраков и дорогу от жилья к морю.", "Считайте блюдо и напиток на каждого, а общие дополнения — на весь стол."]};
 const article=await read(root+job.slug+'.json');
 for(const s of article.sections)for(const l of s.links||[])l.href=l.href.replace('/journal/uzhin-v-apartamentah/','/journal/uzhin-v-semnyh-apartamentah/');
 await write(root+job.slug+'.json',article);
 upsert(articles,article,'slug');meta[job.slug]={seoTitle:article.title,caption:'Редакционная иллюстрация, созданная с помощью ИИ. Не фотография.',modified:article.date};
 const source=`design/blog-source/month-202611/${job.slug}.png`;
 await fs.copyFile('/Users/dmitrij/.codex/generated_images/01a16a37-1bd2-7913-9c7b-ecd36e870428/'+job.image,source);
 upsert(artwork,{slug:job.slug,source,alt:article.imageAlt},'slug');
 await sharp(source).resize(1200,630,{fit:'cover'}).jpeg({quality:82,mozjpeg:true}).toFile(`public/seo/blog/${job.slug}.jpg`);
 figures[job.slug]=[];
 for(const[i,p]of job.plans.entries()){
  const panels=p.labels.map(([heading,...lines],j)=>{const x=40+j*390;return `<rect x="${x}" y="150" width="340" height="310" rx="26" fill="${['#f3e3c8','#e0e9e5','#e6eaf0'][j]}"/><circle cx="${x+170}" cy="210" r="20" fill="#c28a3c"/><text x="${x+170}" y="218" text-anchor="middle" font-size="23" fill="#fff">${j+1}</text><text x="${x+170}" y="280" text-anchor="middle" font-size="36" fill="#15273d">${heading}</text>${lines.map((l,k)=>`<text x="${x+170}" y="${350+k*47}" text-anchor="middle" font-size="30" fill="#40536c">${l}</text>`).join('')}`;}).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="530"><rect width="1200" height="530" rx="32" fill="#fbf8f2"/><g font-family="Arial,sans-serif"><text x="40" y="88" font-size="42" fill="#15273d">${p.title}</text>${panels}</g></svg>`;
  const name=job.slug+'-'+(i+1),dir='design/blog-source/month-202611/diagrams/';
  await fs.writeFile(dir+name+'.svg',svg);await sharp(Buffer.from(svg)).png().toFile(dir+name+'.png');
  figures[job.slug].push({afterSection:p.afterSection,source:name+'.png',alt:p.title+': '+p.labels.map(l=>l.join(' ')).join('; '),caption:captions[job.slug][i]});
 }
 const path='/journal/'+job.slug+'/';
 upsert(matrix,{path,cluster:'editorial',cohort:'month-202611',pageType:'article',title:article.title,query:article.title.toLocaleLowerCase('ru'),intent:article.intro,monthlySearches:null,demandSource:null,serpValidated:false,ownershipBasis:'editorial_scenario_primary_sources',nextStep:{path:'/podbor/',label:'Рассчитать пироги к общему столу'},relatedArticles:[article.related,'/journal/uzhin-v-semnyh-apartamentah/','/journal/hleb-i-vypechka-kaliningradskoy-oblasti/']},'path');
 Object.assign(topics.topics.find(x=>x.number===job.number),{topic:article.title,status:'integrated_new',dataGap:'',publicationDate:article.date,evidenceNote:'Дополнительный ручной спринт по запросу пользователя. Источники и приёмка: research/content-sprint-20261105/README.md'});
}
// Incoming contextual links from the existing monthly guide; preserve its body and ownership.
for(const [owner,slug,title]of [['ryba-baltiki-vidy',jobs[0].slug,'Выбрать рыбное блюдо и рассчитать стоимость'],['hleb-i-vypechka-kaliningradskoy-oblasti',jobs[1].slug,'Спланировать завтрак перед прогулкой у моря']]){
 const a=articles.find(x=>x.slug===owner);if(!a)continue;
 const href='/journal/'+slug+'/';
 if(!a.sections.some(s=>s.links?.some(l=>l.href===href))){const s=a.sections.find(s=>(s.links?.length||0)<2);(s.links??=[]).push({href,title});}
}
for(const[file,data]of [['src/data/monthly-articles.json',articles],['src/data/monthly-article-meta.json',meta],['src/data/article-artwork.json',artwork],['src/data/monthly-article-figures.json',figures],['src/data/seo-matrix.json',matrix],['research/content-month-202611/topic-map.json',topics]])await write(file,data);
console.log('Integrated 2 articles, 2 covers, 4 diagrams; monthly articles:',articles.length);
