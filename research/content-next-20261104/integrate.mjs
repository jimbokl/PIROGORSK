import fs from 'node:fs/promises';
import sharp from 'sharp';

const root='research/content-next-20261104/';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const drafts=await Promise.all(['stroganina','history','cheese'].map(x=>read(root+x+'.json')));
const articles=await read('src/data/monthly-articles.json');
const meta=await read('src/data/monthly-article-meta.json');
const artwork=await read('src/data/article-artwork.json');
const figures=await read('src/data/monthly-article-figures.json');
const matrix=await read('src/data/seo-matrix.json');
const topics=await read('research/content-month-202611/topic-map.json');
const generated='/Users/dmitrij/.codex/generated_images/01a1a728-0622-7772-9346-ea198ca61b61/';
const images=['exec-6d1c000a-d760-473e-bec2-4a17442efd0e.png','exec-7cd9c2b4-b019-4cc0-b261-131030952e44.png','exec-f76906c5-11c0-4f2e-901e-5a4c96aaf35b.png'];
const plans=[
 [
  ['Подача строганины',['Рыба','Добавки','Соус отдельно'],'Как пробовать строганину: рыба, сопровождение и отдельный соус.'],
  ['Три вопроса к меню',['Вид рыбы','Масса рыбы','Отдельно|или в сете'],'Сравнение предложений: вид рыбы, масса рыбной части и формат заказа.']
 ],
 [
  ['От названия к блюду',['История','Состав','Подача'],'Исторический источник объясняет название; меню и кухня — состав и сегодняшнюю подачу.'],
  ['Выбор выпечки',['Тесто','Начинка','К чаю|или к обеду'],'Выбор пирога по тесту, начинке и месту в вашем обеде.']
 ],
 [
  ['Поездка на сыроварню',['Магазин','Дегустация','Экскурсия'],'Три формата посещения: купить продукт, сравнить образцы или познакомиться с производством.'],
  ['Сырная тарелка',['Выбрать','Взвесить','Подписать'],'Выбрать разные вкусы, определить массу и сохранить названия для подачи.']
 ]
];
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
await fs.mkdir('public/seo/blog',{recursive:true});
for(let index=0;index<drafts.length;index++){
 const a=drafts[index],path=`/journal/${a.slug}/`;
 const existing=articles.findIndex(x=>x.slug===a.slug);
 if(existing===-1)articles.push(a);else articles[existing]=a;
 meta[a.slug]={seoTitle:a.title,caption:'Редакционная иллюстрация, созданная с помощью ИИ. Не фотография.',modified:a.date};
 const source=`design/blog-source/month-202611/${a.slug}.png`;
 await fs.copyFile(generated+images[index],source);
 const art={slug:a.slug,source,alt:a.imageAlt};
 const ai=artwork.findIndex(x=>x.slug===a.slug);if(ai===-1)artwork.push(art);else artwork[ai]=art;
 await sharp(source).resize(1200,630,{fit:'cover',position:'centre'}).jpeg({quality:82,mozjpeg:true}).toFile(`public/seo/blog/${a.slug}.jpg`);
 figures[a.slug]=[];
 for(let i=0;i<2;i++){
  const [heading,labels,caption]=plans[index][i];
  const cards=labels.map((label,j)=>{
   const x=40+j*390,words=label.split('|');
   return `<rect x="${x}" y="160" width="340" height="310" rx="22" fill="${j===1?'#d8e4dd':'#e8ddc6'}"/><text x="${x+170}" y="230" text-anchor="middle" font-size="32" fill="#8b592f">0${j+1}</text>${words.map((w,k)=>`<text x="${x+170}" y="${words.length===1?345:325+k*65}" text-anchor="middle" font-size="${w.length>10?39:48}" fill="#274b43">${escape(w)}</text>`).join('')}`;
  }).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="550"><rect width="1200" height="550" fill="#f4eee1"/><g font-family="Arial, sans-serif"><text x="40" y="90" font-size="43" fill="#274b43">${escape(heading)}</text>${cards}</g></svg>`;
  const name=`${a.slug}-${i+1}`,dir='design/blog-source/month-202611/diagrams/';
  await fs.writeFile(dir+name+'.svg',svg);
  await sharp(Buffer.from(svg)).png().toFile(dir+name+'.png');
  figures[a.slug].push({afterSection:i===0?1:3,source:name+'.png',alt:heading+': '+labels.join(', ').replaceAll('|',' '),caption});
 }
 const entry={path,cluster:'editorial',cohort:'month-202611',pageType:'article',title:a.title,query:a.title.toLocaleLowerCase('ru'),intent:a.intro,monthlySearches:null,demandSource:null,serpValidated:false,ownershipBasis:'editorial_scenario_primary_sources',nextStep:{path:'/podbor/',label:'Рассчитать пироги к общему столу'},relatedArticles:[a.related,'/journal/regionalnaya-kuhnya-kaliningradskoy-oblasti/','/journal/kak-perevezti-pirog/']};
 const mi=matrix.findIndex(x=>x.path===path);if(mi===-1)matrix.push(entry);else matrix[mi]=entry;
 const t=topics.topics.find(x=>x.ownerURL===path);t.topic=a.title;t.status='integrated_new';t.dataGap='';t.publicationDate=a.date;t.evidenceNote='Источники и приёмка: research/content-next-20261104/RELEASE.md';
}
for(const [p,x] of [['src/data/monthly-articles.json',articles],['src/data/monthly-article-meta.json',meta],['src/data/article-artwork.json',artwork],['src/data/monthly-article-figures.json',figures],['src/data/seo-matrix.json',matrix],['research/content-month-202611/topic-map.json',topics]])await write(p,x);
console.log('Integrated 3 articles, 3 covers, 6 diagrams, metadata and canonical routes.');
