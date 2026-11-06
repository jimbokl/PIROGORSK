import fs from 'node:fs/promises';
import sharp from 'sharp';
const root='research/content-sprint-20261106/';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const articles=await read('src/data/monthly-articles.json'),meta=await read('src/data/monthly-article-meta.json'),artwork=await read('src/data/article-artwork.json'),figures=await read('src/data/monthly-article-figures.json'),matrix=await read('src/data/seo-matrix.json'),topics=await read('research/content-month-202611/topic-map.json');
const upsert=(xs,x,key)=>{const i=xs.findIndex(y=>y[key]===x[key]);if(i<0)xs.push(x);else xs[i]=x;};
const jobs=[
 {number:15,slug:'uzhin-na-baltike-posle-21',image:'exec-ea901d92-3db5-4ed5-87a7-f80d7d3f4855.png',plans:[{title:'Поздний ужин: три вопроса',labels:[['Кухня','Принимает','заказы?'],['Время','Когда','приходить?'],['Дорога','Как','вернуться?']],afterSection:0},{title:'План на вечер',labels:[['Основной','Подтвердить','кухню и стол'],['Запасной','Рядом','с жильём'],['Домашний','Посуда','и простая еда']],afterSection:4}]},
 {number:16,slug:'baltiyskaya-kuhnya-dlya-detey',image:'exec-1434eb82-ef72-40ed-8687-38e274ac124c.png',plans:[{title:'Семейный обед: начните с привычного',labels:[['Основа','Знакомое','блюдо'],['Подача','Гарнир','и соус'],['Условия','Посадка','и ожидание']],afterSection:0},{title:'За одним столом',labels:[['Ребёнку','Понятное','по составу'],['Взрослым','То, что','хочется'],['Всем','Удобный','ритм обеда']],afterSection:5}]}
];
for(const job of jobs){
 const captions={"uzhin-na-baltike-posle-21": ["Уточните, принимает ли кухня заказы, согласуйте время прихода и обратную дорогу.", "Оставьте основной вариант, запасное место рядом с жильём и простой домашний ужин."], "baltiyskaya-kuhnya-dlya-detey": ["Сначала выберите знакомое блюдо, затем уточните подачу и условия семейного обеда.", "Разные блюда можно выбрать за одним столом; общий ритм важнее одинакового заказа."]};
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
 upsert(matrix,{path,cluster:'editorial',cohort:'month-202611',pageType:'article',title:article.title,query:article.title.toLocaleLowerCase('ru'),intent:article.intro,monthlySearches:null,demandSource:null,serpValidated:false,ownershipBasis:'editorial_scenario_primary_sources',nextStep:{path:'/podbor/',label:'Рассчитать пироги к общему столу'},relatedArticles:[...new Set([article.related,'/journal/uzhin-v-semnyh-apartamentah/','/journal/hleb-i-vypechka-kaliningradskoy-oblasti/'])]},'path');
 Object.assign(topics.topics.find(x=>x.number===job.number),{topic:article.title,status:'integrated_new',dataGap:'',publicationDate:article.date,evidenceNote:'Дополнительный ручной спринт по запросу пользователя. Источники и приёмка: research/content-sprint-20261106/README.md'});
}
// Incoming contextual links from the existing monthly guide; preserve its body and ownership.
for(const [owner,slug,title]of [['zavtrak-na-baltike',jobs[0].slug,'Спланировать поздний ужин после прогулки'],['vegetarianskaya-eda-v-kaliningrade',jobs[1].slug,'Выбрать семейный обед, если ребёнок не любит рыбу']]){
 const a=articles.find(x=>x.slug===owner);if(!a)continue;
 const href='/journal/'+slug+'/';
 if(!a.sections.some(s=>s.links?.some(l=>l.href===href))){const s=a.sections.find(s=>(s.links?.length||0)<2);(s.links??=[]).push({href,title});}
}
for(const[file,data]of [['src/data/monthly-articles.json',articles],['src/data/monthly-article-meta.json',meta],['src/data/article-artwork.json',artwork],['src/data/monthly-article-figures.json',figures],['src/data/seo-matrix.json',matrix],['research/content-month-202611/topic-map.json',topics]])await write(file,data);
console.log('Integrated 2 articles, 2 covers, 4 diagrams; monthly articles:',articles.length);
