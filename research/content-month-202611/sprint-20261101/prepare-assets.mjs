import fs from 'node:fs/promises';
import sharp from 'sharp';
const dir='design/blog-source/month-202611/diagrams';
const plans={
 'ryba-baltiki-vidy':[
  ['Откуда рыба в меню', ['Море|и заливы','Местное|блюдо','Конкретный|улов'], 'География вида, традиция подачи и происхождение конкретной партии — три разных вопроса. Название блюда не подтверждает место вылова.'],
  ['Что спросить перед покупкой', ['Название|вида','Способ|обработки','Хранение|и дорога'], 'Памятка покупателю: уточнить вид рыбы и обработку, прочитать маркировку и подготовить подходящую упаковку для дороги.']],
 'konigsbergskie-klopsy':[
  ['Из чего складывается блюдо', ['Мясная|основа','Сливочный|соус','Гарнир|по меню'], 'Классическое сочетание клопсов: мясные шарики, светлый соус с каперсами и гарнир. Состав конкретной порции уточняют в меню.'],
  ['Как сравнить две порции', ['Вес|клопсов','Гарнир|в составе','Итоговая|цена'], 'Памятка для сравнения: выяснить, что входит в вес порции и цену, а затем сопоставить предложения с одинаковым составом.']],
 'rynki-kaliningrada-eda':[
  ['Покупки без лишнего круга', ['Список|к столу','Осмотр|прилавков','Покупка|и возврат'], 'План визита: определить покупки, сравнить предложения и оставить скоропортящиеся продукты на конец визита. Это не карта торговых рядов.'],
  ['Перед выходом с рынка', ['Чек|и этикетка','Раздельная|упаковка','Режим|хранения'], 'Памятка: сохранить данные о покупке, разделить сырые и готовые продукты и соблюдать условия хранения конкретного товара.']]
};
const manifest=JSON.parse(await fs.readFile('src/data/monthly-article-figures.json','utf8'));
await fs.mkdir(dir,{recursive:true});
await fs.mkdir('public/seo/blog',{recursive:true});
for(const [slug,figures] of Object.entries(plans)){
 manifest[slug]=[];
 for(const [i,[heading,labels,caption]] of figures.entries()){
  const cards=labels.map((label,j)=>{
   const x=40+j*390;
   return `<rect x="${x}" y="160" width="340" height="310" rx="24" fill="${['#f6e9cc','#dcece7','#e8e8f4'][j]}"/><circle cx="${x+170}" cy="220" r="24" fill="#c78b32"/><text x="${x+170}" y="229" text-anchor="middle" font-size="24" fill="white">${j+1}</text>${label.split('|').map((word,k)=>`<text x="${x+170}" y="${325+k*61}" text-anchor="middle" font-size="${word.length>10?37:44}" fill="#162b44">${word}</text>`).join('')}`;
  }).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="550" viewBox="0 0 1200 550"><rect width="1200" height="550" rx="24" fill="#fcfaf5"/><g font-family="Arial,sans-serif"><text x="40" y="90" font-size="42" fill="#162b44">${heading}</text>${cards}</g></svg>`;
  const name=`${slug}-${i+1}`;
  await fs.writeFile(`${dir}/${name}.svg`,svg);
  await sharp(Buffer.from(svg)).png().toFile(`${dir}/${name}.png`);
  manifest[slug].push({afterSection:i===0?1:3,source:name+'.png',alt:heading+': '+labels.join(', ').replaceAll('|',' '),caption});
 }
 await sharp(`design/blog-source/month-202611/${slug}.png`).resize(1200,630,{fit:'cover'}).jpeg({quality:74,mozjpeg:true}).toFile(`public/seo/blog/${slug}.jpg`);
}
await fs.writeFile('src/data/monthly-article-figures.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Prepared 6 diagrams and 3 OG covers; retained existing figure entries.');
