import fs from 'node:fs/promises';
import sharp from 'sharp';

const root='research/content-daily-20261105/';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const article=await read(root+'article.json');
const path=`/journal/${article.slug}/`;
const articles=await read('src/data/monthly-articles.json');
const meta=await read('src/data/monthly-article-meta.json');
const artwork=await read('src/data/article-artwork.json');
const figures=await read('src/data/monthly-article-figures.json');
const matrix=await read('src/data/seo-matrix.json');
const topics=await read('research/content-month-202611/topic-map.json');
const source=`design/blog-source/month-202611/${article.slug}.png`;
await fs.copyFile('/Users/dmitrij/.codex/generated_images/01a1a728-0622-7772-9346-ea198ca61b61/exec-5d1388da-f20e-4fb1-92b5-7247a417d027.png',source);
const index=articles.findIndex(x=>x.slug===article.slug);
if(index<0)articles.push(article);else articles[index]=article;
meta[article.slug]={seoTitle:article.title,caption:'Редакционная иллюстрация, созданная с помощью ИИ. Не фотография.',modified:article.date};
const art={slug:article.slug,source,alt:article.imageAlt};
const artIndex=artwork.findIndex(x=>x.slug===article.slug);
if(artIndex<0)artwork.push(art);else artwork[artIndex]=art;
await sharp(source).resize(1200,630,{fit:'cover',position:'centre'}).jpeg({quality:82,mozjpeg:true}).toFile(`public/seo/blog/${article.slug}.jpg`);

const plans=[
 {title:'Выбор покупки',labels:[['Завтрак','Порционная','выпечка'],['Ужин','Хлеб к','основному блюду'],['Дорога','Удобный формат','и упаковка']],afterSection:0,caption:'Три повода зайти в пекарню. Формат покупки удобно выбирать под планы дня.'},
 {title:'Перед покупкой',labels:[['Состав','Что входит','в изделие'],['Масса','Какой размер','вам нужен'],['Хранение','Когда и как','съедите покупку']],afterSection:4,caption:'Состав, масса и условия хранения: три вопроса продавцу перед покупкой хлеба или выпечки.'}
];
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
figures[article.slug]=[];
for(const [i,plan] of plans.entries()){
 const cards=plan.labels.map(([title,...lines],j)=>{
  const x=40+j*390;
  return `<rect x="${x}" y="160" width="340" height="310" rx="22" fill="${j===1?'#d8e4dd':'#e8ddc6'}"/><text x="${x+170}" y="235" text-anchor="middle" font-size="40" fill="#274b43">${escape(title)}</text>${lines.map((line,k)=>`<text x="${x+170}" y="${330+k*55}" text-anchor="middle" font-size="32" fill="#274b43">${escape(line)}</text>`).join('')}`;
 }).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="550"><rect width="1200" height="550" fill="#f4eee1"/><g font-family="Arial, sans-serif"><text x="40" y="90" font-size="43" fill="#274b43">${escape(plan.title)}</text>${cards}</g></svg>`;
 const name=`${article.slug}-${i+1}`;
 const dir='design/blog-source/month-202611/diagrams/';
 await fs.writeFile(dir+name+'.svg',svg);
 await sharp(Buffer.from(svg)).png().toFile(dir+name+'.png');
 figures[article.slug].push({afterSection:plan.afterSection,source:name+'.png',alt:plan.title+': '+plan.labels.map(x=>x.join(' ')).join('; '),caption:plan.caption});
}
const seo={path,cluster:'editorial',cohort:'month-202611',pageType:'article',title:article.title,query:article.title.toLocaleLowerCase('ru'),intent:article.intro,monthlySearches:null,demandSource:null,serpValidated:false,ownershipBasis:'editorial_scenario_primary_sources',nextStep:{path:'/podbor/',label:'Рассчитать пироги к общему столу'},relatedArticles:[article.related,'/journal/baltiyskie-syry/','/journal/svetlogorsk-kaliningrad-edamarshrut/']};
const seoIndex=matrix.findIndex(x=>x.path===path);
if(seoIndex<0)matrix.push(seo);else matrix[seoIndex]=seo;
const topic=topics.topics.find(x=>x.number===9);
Object.assign(topic,{topic:article.title,status:'integrated_new',dataGap:'',publicationDate:article.date,evidenceNote:'Первый ежедневный выпуск. Источники и приёмка: research/content-daily-20261105/RELEASE.md'});
for(const [file,data] of [['src/data/monthly-articles.json',articles],['src/data/monthly-article-meta.json',meta],['src/data/article-artwork.json',artwork],['src/data/monthly-article-figures.json',figures],['src/data/seo-matrix.json',matrix],['research/content-month-202611/topic-map.json',topics]])await write(file,data);
console.log('Integrated A6-9: one article, cover, 2 diagrams, SEO owner and topic status.');
