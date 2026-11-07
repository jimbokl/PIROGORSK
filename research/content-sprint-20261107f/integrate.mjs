import fs from 'node:fs/promises';
import sharp from 'sharp';

const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const articles=await read('src/data/monthly-articles.json'),meta=await read('src/data/monthly-article-meta.json'),artwork=await read('src/data/article-artwork.json'),figures=await read('src/data/monthly-article-figures.json'),matrix=await read('src/data/seo-matrix.json'),topics=await read('research/content-month-202611/topic-map.json'),updates=await read('src/data/article-updates.json');
const upsert=(xs,x,key)=>{const i=xs.findIndex(y=>y[key]===x[key]);if(i<0)xs.push(x);else xs[i]=x;};
const xml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const jobs=[
 {number:30,slug:'gde-poest-s-detmi-v-kaliningrade',query:'где поесть с детьми в калининграде',
  decision:'Отдельный семейный интент: три примера с подтверждёнными условиями, таблицы выбора и бюджета. Исходная тема про десять мест не объявляется завершённой.',
  status:'integrated_new_partial',dataGap:'Подтверждены три примера из исходных десяти. Нужны ещё семь мест с первичными адресами, семейными условиями и проверкой по филиалу; очереди, скорость и личные посещения не измерены.',
  plans:[
   {title:'Что важно вашей семье?',labels:[['Поесть знакомое','Состав и размер блюда','Детское меню'],['Занять время','Часы игровой комнаты','Условия анимации'],['Удобно добраться','Точный адрес и вход','Коляска и стульчик']],afterSection:0,caption:'Редакционная схема выбора: меню, комната и доступность входа проверяются отдельно.'},
   {title:'Соберите семейный бюджет',labels:[['Каждому','Основные блюда','Количество × цена'],['На общий стол','Пирог и напитки','Размер каждой подачи'],['Проверьте итог','Упаковка и дополнения','Общая сумма для семьи']],afterSection:6,caption:'Шаблон расчёта, без вымышленных цен и возрастных норм порций.'},
  ]},
 {number:32,slug:'pozdniy-uzhin-v-kaliningrade',query:'где поесть поздно в калининграде',
  decision:'Отдельный интент позднего ужина: три адреса и опубликованные часы, разделение зала, бара и кухни; пример расписания помечен как условный.',
  status:'integrated_new_partial',dataGap:'Часы последнего заказа и возможность визита без брони в конкретный вечер не подтверждены. Расхождение расписаний Редюита показано в статье. Утверждение исходника про места «без очередей» не проверено.',
  plans:[
   {title:'Три времени перед ужином',labels:[['Ваш приход','Дорога до самого входа','Плюс заселение и вещи'],['Последний заказ','Уточните у кухни','Для выбранных блюд'],['Закрытие зала','Время закончить ужин','Отдельно от часов бара']],afterSection:0,caption:'Расписание зала само по себе не определяет время последнего заказа кухни.'},
   {title:'Пример: успеете заказать?',labels:[['Приход в 22:20','До заказа 25 минут','Если кухня до 22:45'],['Закрытие в 00:00','Это часы зала','Не последний заказ'],['Если опоздали','Согласуйте новое время','Или смените план']],afterSection:5,caption:'Условный редакционный пример. Эти часы не являются расписанием конкретного ресторана.'},
  ]},
];
for(const job of jobs){
 const article=await read(`research/content-sprint-20261107f/${job.slug}.json`);upsert(articles,article,'slug');
 meta[job.slug]={seoTitle:article.title,caption:'Редакционная иллюстрация, созданная с помощью ИИ. Не фотография.',modified:article.date};
 const source=`design/blog-source/month-202611/${job.slug}.png`;
 upsert(artwork,{slug:job.slug,source,alt:article.imageAlt},'slug');
 await sharp(source).resize(1200,630,{fit:'cover'}).jpeg({quality:76,mozjpeg:true}).toFile(`public/seo/blog/${job.slug}.jpg`);
 figures[job.slug]=[];
 for(const[i,p]of job.plans.entries()){
  const panels=p.labels.map(([heading,...lines],j)=>{const y=150+j*240;return `<rect x="40" y="${y}" width="920" height="210" rx="26" fill="${['#f3e3c8','#e0e9e5','#e6eaf0'][j]}"/><circle cx="98" cy="${y+64}" r="27" fill="#a46b27"/><text x="98" y="${y+74}" text-anchor="middle" font-size="30" fill="#fff">${j+1}</text><text x="160" y="${y+70}" font-size="48" fill="#15273d">${xml(heading)}</text>${lines.map((l,k)=>`<text x="160" y="${y+128+k*49}" font-size="42" fill="#40536c">${xml(l)}</text>`).join('')}`;}).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="900"><rect width="1000" height="900" rx="32" fill="#fbf8f2"/><g font-family="Arial,sans-serif"><text x="40" y="88" font-size="50" fill="#15273d">${xml(p.title)}</text>${panels}</g></svg>`;
  const name=job.slug+'-'+(i+1),dir='design/blog-source/month-202611/diagrams/';
  await fs.writeFile(dir+name+'.svg',svg);await sharp(Buffer.from(svg)).png().toFile(dir+name+'.png');
  figures[job.slug].push({afterSection:p.afterSection,source:name+'.png',alt:p.title+': '+p.labels.map(l=>l.join(' ')).join('; '),caption:p.caption});
 }
 const path='/journal/'+job.slug+'/';
 upsert(matrix,{path,cluster:'editorial',cohort:'month-202611',pageType:'article',title:article.title,query:job.query,intent:article.description,monthlySearches:null,demandSource:null,serpValidated:false,ownershipBasis:'editorial_scenario_primary_sources',nextStep:{path:article.related,label:article.relatedTitle},relatedArticles:article.sections.flatMap(s=>(s.links||[]).map(l=>l.href)).filter(h=>h.startsWith('/journal/'))},'path');
 Object.assign(topics.topics.find(x=>x.number===job.number),{topic:article.title,ownerURL:path,decision:job.decision,status:job.status,dataGap:job.dataGap,publicationDate:article.date,evidenceNote:'Ручной спринт по запросу пользователя. Источники и границы: research/content-sprint-20261107f/README.md'});
}
// The broad city guide introduces the two narrower owners, rather than duplicating them.
const hub=updates.find(x=>x.ownerURL==='/journal/gde-poest-v-kaliningrade/');
const intro={title:'Семейный обед и поздний ужин: отдельные планы',paragraphs:['Для обеда с детьми начните с меню, игровой комнаты и удобного входа. Для позднего ужина важны время прихода и последний заказ кухни. Подробности по этим двум сценариям вынесены в отдельные гиды с адресами и таблицами.'],links:jobs.map(j=>({href:'/journal/'+j.slug+'/',title:articles.find(a=>a.slug===j.slug).title}))};
hub.modified='2026-11-07';upsert(hub.sections,intro,'title');
const hubMatrix=matrix.find(x=>x.path===hub.ownerURL);if(hubMatrix)hubMatrix.relatedArticles=[...new Set([...(hubMatrix.relatedArticles||[]),...intro.links.map(l=>l.href)])];
for(const[file,data]of [['src/data/monthly-articles.json',articles],['src/data/monthly-article-meta.json',meta],['src/data/article-artwork.json',artwork],['src/data/monthly-article-figures.json',figures],['src/data/seo-matrix.json',matrix],['research/content-month-202611/topic-map.json',topics],['src/data/article-updates.json',updates]])await write(file,data);
console.log(`Integrated ${jobs.length} new guides, 2 covers, 4 diagrams and incoming city-hub links. Monthly articles: ${articles.length}.`);
