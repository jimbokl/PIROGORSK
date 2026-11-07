import fs from 'node:fs/promises';
import sharp from 'sharp';

const root='research/content-sprint-20261107j/';
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
await fs.copyFile('/Users/dmitrij/.codex/generated_images/01a16a37-1bd2-7913-9c7b-ecd36e870428/exec-611dfb7d-0dde-4d4f-b18f-92678603e3da.png',source);
const index=articles.findIndex(x=>x.slug===article.slug);
if(index<0)articles.push(article);else articles[index]=article;
meta[article.slug]={seoTitle:article.title,caption:'Редакционная иллюстрация, созданная с помощью ИИ. Не фотография.',modified:article.date};
const art={slug:article.slug,source,alt:article.imageAlt};
const artIndex=artwork.findIndex(x=>x.slug===article.slug);
if(artIndex<0)artwork.push(art);else artwork[artIndex]=art;
await sharp(source).resize(1200,630,{fit:'cover',position:'centre'}).jpeg({quality:82,mozjpeg:true}).toFile(`public/seo/blog/${article.slug}.jpg`);

const wrap=(body,height=600)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}"><rect width="1200" height="${height}" rx="32" fill="#fcf8ef"/><g font-family="Arial, sans-serif" fill="#182b43">${body}</g></svg>`;
const diagrams=[
 {afterSection:1,alt:'Покупка под ваш план: на прогулку — порционное изделие и салфетки; к столу — хлеб, нарезка и дополнения.',caption:'Два сценария покупки: выбирайте выпечку под место подачи и свою компанию.',svg:wrap(`<text x="54" y="88" font-size="45" font-weight="700">Сначала — где будете есть?</text><rect x="48" y="140" width="536" height="394" rx="28" fill="#f6e8cd"/><rect x="616" y="140" width="536" height="394" rx="28" fill="#e6eef1"/><path d="M98 235h70m-35-35v70" stroke="#b66d20" stroke-width="7"/><text x="202" y="247" font-size="42" font-weight="700">На прогулке</text><text x="90" y="348" font-size="39">Порционное изделие</text><text x="90" y="414" font-size="39">Удобная упаковка</text><text x="90" y="480" font-size="39">Салфетки</text><path d="M666 225h70m-60 0v42m50-42v42" stroke="#547181" stroke-width="7"/><text x="774" y="247" font-size="42" font-weight="700">За столом</text><text x="658" y="348" font-size="39">Хлеб и дополнения</text><text x="658" y="414" font-size="39">Нарезка и посуда</text><text x="658" y="480" font-size="39">Количество гостей</text>`)},
 {afterSection:3,alt:'Сравнение размеров багета: 55 рублей за 115 граммов и 110 рублей за 230 граммов — около 48 рублей за 100 граммов в обоих случаях.',caption:'Маленький и большой багеты имеют одинаковую расчётную цену за 100 г. Пример по меню побережья на 07.11.2026.',svg:wrap(`<text x="54" y="84" font-size="43" font-weight="700">Сравниваем одинаковый вес</text><text x="54" y="160" font-size="42">Цена ÷ масса в граммах × 100</text><rect x="48" y="214" width="536" height="250" rx="28" fill="#f6e8cd"/><rect x="616" y="214" width="536" height="250" rx="28" fill="#e6eef1"/><text x="316" y="289" text-anchor="middle" font-size="42">55 ₽ / 115 г</text><text x="316" y="392" text-anchor="middle" font-size="52" font-weight="700">≈ 48 ₽ / 100 г</text><text x="884" y="289" text-anchor="middle" font-size="42">110 ₽ / 230 г</text><text x="884" y="392" text-anchor="middle" font-size="52" font-weight="700">≈ 48 ₽ / 100 г</text><text x="54" y="540" font-size="35" fill="#526279">Французский багет · расчёт по меню 07.11.2026</text>`)}
];
figures[article.slug]=[];
for(const [i,d] of diagrams.entries()){
 const name=`${article.slug}-${i+1}`,dir='design/blog-source/month-202611/diagrams/';
 await fs.writeFile(dir+name+'.svg',d.svg+'\n');
 await sharp(Buffer.from(d.svg)).png().toFile(dir+name+'.png');
 figures[article.slug].push({afterSection:d.afterSection,source:name+'.png',alt:d.alt,caption:d.caption});
}
const seo={path,cluster:'editorial',cohort:'month-202611',pageType:'article',title:article.title,query:'пекарни светлогорска выпечка с собой цены',intent:'Выбрать хлеб и порционную выпечку с собой в Светлогорске: адрес, масса, бюджет и упаковка.',monthlySearches:null,demandSource:null,serpValidated:false,ownershipBasis:'distinct_takeaway_bakery_intent_primary_sources_A6_65',nextStep:{path:'/podbor/',label:'Рассчитать пироги к общему столу'},relatedArticles:[article.related,'/journal/hleb-i-vypechka-kaliningradskoy-oblasti/','/journal/uzhin-v-semnyh-apartamentah/']};
const seoIndex=matrix.findIndex(x=>x.path===path);
if(seoIndex<0)matrix.push(seo);else matrix[seoIndex]=seo;
const topic=topics.topics.find(x=>x.number===65);
Object.assign(topic,{topic:article.title,ownerURL:path,decision:'new_after_primary_source_check',status:'integrated_new_partial',dataGap:'Подтверждены два адреса, формат навынос и пять строк цен/массы меню побережья. Меню «Наша Кухня» и остатки конкретных витрин не подтверждены; рейтинга и личной дегустации нет.',publicationDate:article.date,evidenceNote:'Спринт 20261107j: отдельный интент выпечки с собой, общий гид /journal/gde-poest-v-svetlogorske/ сохранён. Источники/редактура и QA: research/content-sprint-20261107j/README.md.'});
for(const [file,data] of [['src/data/monthly-articles.json',articles],['src/data/monthly-article-meta.json',meta],['src/data/article-artwork.json',artwork],['src/data/monthly-article-figures.json',figures],['src/data/seo-matrix.json',matrix],['research/content-month-202611/topic-map.json',topics]])await write(file,data);
console.log('Integrated A6-65: one new bakery/takeaway owner, cover, two diagrams and SEO mapping.');
