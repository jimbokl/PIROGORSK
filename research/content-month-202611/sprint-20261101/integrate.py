import json,re
from pathlib import Path

def load(p):return json.loads(Path(p).read_text())
def save(p,d):Path(p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
root='research/content-month-202611/sprint-20261101/'
new=load(root+'articles.json')
fish,klopsy,market=new
fish['sections'][3]['paragraphs'].append('Для сравнения цены прочитайте, за какую единицу она указана. Стоимость за сто граммов целой рыбы нельзя напрямую сопоставить с фиксированной порцией филе. Уточните, взвешивают ли продукт до приготовления и отдельно ли оплачиваются гарнир и соус. Если за столом несколько человек, спросите, удобно ли разделить выбранную рыбу и как её подадут: целиком, порционными кусками или уже разобранной. Эти детали влияют на удобство общего обеда больше, чем знакомое название в меню.')
fish['sections'][6]['paragraphs'][-1]='После обеда запишите название рыбы и способ приготовления: например, целая камбала, закуска из сельди или судак с гарниром. В следующий раз будет проще выбрать другое блюдо и сравнить собственные впечатления. В заметке о покупке оставьте также изготовителя или продавца, дату и название продукта с этикетки. По этим сведениям легче найти понравившийся вариант, чем по общему воспоминанию о «местной рыбке». Для первого дня хватит одной рыбной остановки: оставьте время на прогулку и другие блюда региона.'
klopsy['sections'][2]['links'][0]['href']='/journal/gde-poest-v-kaliningrade/'
klopsy['sections'][4]['paragraphs'].append('Если берёте обед с собой в апартаменты, обсудите упаковку соуса и гарнира. Отдельная ёмкость для соуса может быть удобнее для дороги, но способ упаковки определяет кухня с учётом своего блюда. До заказа проверьте, где будете есть: понадобится ли стол, есть ли приборы и можно ли сразу подать еду. Для большой компании удобнее заранее записать, сколько полных порций нужно каждому, чем делить на месте общее количество мясных шариков и пытаться угадать вес соуса.')
save(root+'articles.json',new)
articles=load('src/data/monthly-articles.json')
for x in new:
 if not any(a['slug']==x['slug'] for a in articles):articles.append(x)
reg=articles[0]
reg['takeaway']='Начните с одного блюда на месте: клопсов или рыбной позиции с понятным составом. Для подарка посмотрите марципан и упакованные продукты; для покупки на ужин — продуктовые ряды Калининграда. Происхождение ингредиентов и условия хранения проверяйте у конкретного изготовителя или заведения.'
# Keep five internal contextual links, all attached to relevant passages.
reg['sections'][0]['links']=[{'title':'Кёнигсбергские клопсы: состав, соус и выбор порции','href':'/journal/konigsbergskie-klopsy/'}]
reg['sections'][1]['links']=[{'title':'Рыба Балтики: виды и вопросы к меню','href':'/journal/ryba-baltiki-vidy/'}]
reg['sections'][2]['links']=[{'title':'Кёнигсбергский марципан: история и выбор','href':'/journal/kenigsbergskiy-martsipan/'}]
reg['sections'][3]['links']=[{'title':'Центральный рынок Калининграда: продуктовые покупки','href':'/journal/rynki-kaliningrada-eda/'}]
reg['sections'][4]['links']=[x for x in reg['sections'][4].get('links',[]) if not x['href'].startswith('/')]
save('src/data/monthly-articles.json',articles)
meta=load('src/data/monthly-article-meta.json')
for k in meta:meta[k]['modified']='2026-11-01' if k==reg['slug'] else '2026-10-31'
seo=['Рыба Балтики: что попробовать в Калининградской области','Кёнигсбергские клопсы: состав и выбор в Калининграде','Центральный рынок Калининграда: еда и план покупок']
for x,title in zip(new,seo):meta[x['slug']]={'seoTitle':title,'caption':'Редакционная иллюстрация Пирогорска, созданная с помощью ИИ. Не фотография места или готового продукта.','modified':'2026-11-01'}
save('src/data/monthly-article-meta.json',meta)
art=load('src/data/article-artwork.json')
for x in new:
 if not any(a['slug']==x['slug'] for a in art):art.append({'slug':x['slug'],'source':f"design/blog-source/month-202611/{x['slug']}.png",'alt':x['imageAlt']})
save('src/data/article-artwork.json',art)
updates=load('src/data/article-updates.json')
for x in updates:x.setdefault('modified','2026-10-31')
breakfast={
 'ownerURL':'/journal/gde-pozavtrakat-v-zelenogradske/','modified':'2026-11-01',
 'sections':[
  {'title':'Ещё два утренних окна: «Гранд Монополь» и «Ривьера»','paragraphs':[
   'На 1 ноября 2026 года собственный сайт «Гранд Монополь» указывает завтраки ежедневно с 09:00 до 12:00. Адрес ресторана — Зеленоградск, улица Володарского, 32. Обычные часы работы ресторана, 09:00–23:00, длиннее утреннего меню: поздний ужин по этому графику не означает завтрак в течение всего дня.',
   'У ресторана «Ривьера» на сайте выделено другое окно: ежедневно с 08:30 до 11:00, на первом этаже. Для раннего выхода это полезная альтернатива завтраку с девяти. Стоимость и доступ для гостей без проживания на этой странице не уточнены; эти условия нужно выяснить перед визитом. Источник не даёт основания добавлять к вашему маршруту выдуманный средний чек.'
  ],'table':{'caption':'Дополнение к утреннему выбору, проверено 1 ноября 2026 года','headers':['Вариант','Часы завтрака на сайте','Что проверить перед выходом'],'rows':[
   ['Гранд Монополь · Володарского, 32','Ежедневно 09:00–12:00','Актуальное меню завтраков, стоимость и последний приём заказа'],
   ['Ривьера · ресторан на первом этаже','Ежедневно 08:30–11:00','Точную точку входа, тариф и условия для внешних гостей']
  ]}},
  {'title':'Как выбрать время до прогулки по Зеленоградску','paragraphs':[
   'Сначала назначьте время выхода из кафе, затем добавьте дорогу от жилья и ожидание приготовления. Если экскурсия или поезд не ждут, спросите о возможности уложиться в ваш интервал ещё до заказа. Завтрак с отдельным меню и шведская линия могут требовать разного времени; скорость обслуживания по часам работы определить нельзя.',
   'В первой части статьи сведения и цены сохранены с датой проверки 26 октября. Два новых окна выше сверены 1 ноября. Перед конкретным визитом откройте первоисточник нужного заведения: для праздничного дня или конца сезона оно может опубликовать отдельный график. Завтрак на кухне в апартаментах остаётся самостоятельным вариантом, если заранее есть продукты, посуда и время на приготовление.'
  ],'links':[{'href':'/journal/uzhin-v-semnyh-apartamentah/','title':'Что проверить на кухне в съёмных апартаментах'},{'href':'/journal/regionalnaya-kuhnya-kaliningradskoy-oblasti/','title':'Что попробовать из кухни Калининградской области'}]}
 ],
 'sources':[{'href':'https://grandmonopol.com/restaurant','title':'Гранд Монополь — адрес, режим ресторана и отдельные часы завтраков','checked':'2026-11-01'},{'href':'https://riviera-restaurant.ru/','title':'Ривьера — утреннее окно завтраков на официальном сайте ресторана','checked':'2026-11-01'}]
}
road={
 'ownerURL':'/journal/kak-perevezti-pirog/','modified':'2026-11-01',
 'sections':[
  {'title':'Пирог, рыба или сэндвич: что удобнее для вашей дороги','paragraphs':[
   'Удобство дорожной еды складывается из упаковки, условий хранения и места, где получится поесть. Для прогулки по Калининграду, поездки к побережью и дороги в апартаменты ответы различаются. Сначала решите, нужен ли перекус в пути или полноценный приём пищи по прибытии. Затем проверьте конкретный продукт: один и тот же формат бывает с разными начинками и требованиями.',
   'Рыба с прилавка и готовая рыбная закуска — разные продукты. Для сырой рыбы понадобится ещё и приготовление на месте. Сэндвич с охлаждаемой начинкой не становится продуктом для долгого хранения только из-за компактного размера. Пирогу тоже нужны условия изготовителя; плотное тесто не заменяет холодильник. В таблице сравниваются бытовые задачи, а не гарантированные сроки хранения.'
  ],'table':{'caption':'Сравнение еды для поездки по Калининградской области','headers':['Формат','Удобство подачи','Что подготовить','Что проверить у продукта'],'rows':[
   ['Целый готовый пирог','Общий стол после приезда','Жёсткая коробка, ровная опора, нож и тарелки','Условия перевозки, хранения и разогрева'],
   ['Порционный пирог','Отдельная порция в дороге','Пищевой контейнер и салфетки','Состав начинки, время и температура по инструкции'],
   ['Готовая рыбная закуска','Стол с приборами и дополнениями','Герметичная пищевая упаковка; холод, если требуется','Вид, обработка, маркировка и условия после вскрытия'],
   ['Сырая рыба','Приготовление по прибытии','Отдельная упаковка, подходящая перевозка и кухня','Срок, режим хранения и готовность кухни'],
   ['Сэндвич','Порционный перекус','Защита от сдавливания и подходящий контейнер','Скоропортящиеся ингредиенты и их температурный режим']
  ]}},
  {'title':'Список перед покупкой еды в дорогу','paragraphs':[
   'Запишите путь целиком: от прилавка или кухни до момента подачи. Если после покупки планируется музей, прогулка у моря или ожидание заселения, включите это в маршрут. Термосумку и хладоэлементы готовят до получения охлаждённой еды, а не ищут после покупки. Местное управление Роспотребнадзора рекомендует термосумку при поездке на пикник и напоминает о гигиене и раздельном обращении с продуктами.',
   'Для ужина в апартаментах удобнее заранее выделить место в холодильнике и проверить оборудование. Для еды на прогулке возьмите готовые порции, которые не требуют разделки, соблюдая условия их хранения. Если перевозочный режим обеспечить нельзя, перенесите покупку ближе ко времени еды или выберите другой продукт по маркировке. Универсального безопасного количества часов для всех начинок нет.'
  ],'links':[{'href':'/journal/ryba-baltiki-vidy/','title':'Рыба Балтики: название, обработка и покупка'},{'href':'/journal/rynki-kaliningrada-eda/','title':'Как спланировать продуктовые покупки на Центральном рынке'}]}
 ],
 'sources':[{'href':'https://39.rospotrebnadzor.ru/content/23-aprelya-den-piknika-pravila-bezopasnogo-otdyha-na-prirode','title':'Управление Роспотребнадзора по Калининградской области — правила еды и перевозки на пикник','checked':'2026-11-01'}]
}
for x in [breakfast,road]:
 updates=[a for a in updates if a['ownerURL']!=x['ownerURL']];updates.append(x)
save('src/data/article-updates.json',updates)
# New owners; no competitor-brand queries or invented demand metrics.
matrix=load('src/data/seo-matrix.json')
queries=['рыба балтики что попробовать в калининградской области','кёнигсбергские клопсы состав калининград','центральный рынок калининград продукты']
intents=['Разобраться в видах рыбы и выбрать блюдо или продукт в Калининградской области.','Узнать состав клопсов и сравнить полные порции в меню Калининграда.','Узнать адрес и часы Центрального рынка и составить план продуктовых покупок.']
related=[['regionalnaya-kuhnya-kaliningradskoy-oblasti','rynki-kaliningrada-eda','kak-perevezti-pirog'],['regionalnaya-kuhnya-kaliningradskoy-oblasti','ryba-baltiki-vidy','gde-poest-v-kaliningrade'],['ryba-baltiki-vidy','sedobnye-suveniry-iz-kaliningrada','kak-perevezti-pirog']]
for a,q,intent,rr in zip(new,queries,intents,related):
 path=f"/journal/{a['slug']}/"; matrix=[x for x in matrix if x['path']!=path];matrix.append({'path':path,'cluster':'editorial','cohort':'month-202611','pageType':'article','title':a['title'],'query':q,'intent':intent,'monthlySearches':None,'demandSource':None,'serpValidated':False,'ownershipBasis':'editorial_scenario_primary_sources','nextStep':{'path':'/podbor/','label':'Рассчитать пироги к общему столу'},'relatedArticles':[f'/journal/{s}/' for s in rr]})
for x in matrix:
 if x['path']=='/journal/regionalnaya-kuhnya-kaliningradskoy-oblasti/':x['relatedArticles']=[f"/journal/{a['slug']}/" for a in new]
save('src/data/seo-matrix.json',matrix)
plan=load('research/content-month-202611/topic-map.json')
owners={2:fish['slug'],7:fish['slug'],4:klopsy['slug'],27:market['slug'],44:'gde-pozavtrakat-v-zelenogradske',58:'gde-pozavtrakat-v-zelenogradske',93:'kak-perevezti-pirog'}
for x in plan['topics']:
 if x['number'] in owners:
  x['ownerURL']='/journal/'+owners[x['number']]+'/'
  x['status']='integrated_update_ready_for_qa' if x['number'] in [44,58,93] else 'integrated_ready_for_qa'
  x['dataGap']='';x['sprint']='2026-11-01'
save('research/content-month-202611/topic-map.json',plan)
# Accurate dates in visible byline and structured data, with reading time based on expanded content.
p=Path('src/pages/journal/[slug].astro');s=p.read_text();s=s.replace("const dateLabel =", "const modified = update?.modified ?? monthly?.modified ?? (servingGuide ? '2026-10-31' : undefined);\nconst modifiedLabel = modified ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${modified}T00:00:00Z`)).replace(/\\s*г\\.$/, '') : undefined;\nconst readingMinutes = update ? Math.max(entry.minutes, Math.ceil(JSON.stringify(item.sections).split(/\\s+/u).length / 180)) : entry.minutes;\nconst dateLabel =")
s=s.replace("...((update || servingGuide) ? { dateModified: '2026-10-31' } : {})", "...(modified ? { dateModified: modified } : {})")
s=s.replace('(monthly || update || servingGuide) &&', 'modified &&').replace('{update && <> · Обновлено', '{modified && <> · Обновлено')
s=s.replace('<time datetime="2026-10-31">31 октября 2026</time>', '<time datetime={modified}>{modifiedLabel}</time>').replace('{entry.minutes} мин', '{readingMinutes} мин');p.write_text(s)
# Keep existing dated breakfast details; update framing to include five sourced options.
p=Path('src/data/breakfast-guide.ts');s=p.read_text();s=s.replace("description: 'Три варианта завтрака в Зеленоградске: Завтра’К 7:45, Бранч на море и шведская линия Берега Моря. Адреса, часы и цены из официальных источников.'", "description: 'Где позавтракать в Зеленоградске: пять вариантов, утренние часы и форматы. Официальные источники, даты проверки цен и план завтрака перед прогулкой.'")
s=s.replace('Собрали три варианта с официальными ссылками и временем работы.', 'Собрали пять вариантов с официальными ссылками и временем завтрака. Первые три проверены 26 октября, два дополнения — 1 ноября 2026 года.')
s=s.replace('Часы и цены сверены 26 октября 2026 года.', 'У «Гранд Монополь» завтраки 09:00–12:00, у «Ривьеры» — 08:30–11:00 по сайтам на 1 ноября. Даты проверки других часов и цен указаны в разделах.');p.write_text(s)
# Validation follows the actual publication registry and checks both plain-text fields.
p=Path('scripts/verify-content-month.mjs');s=p.read_text();s=s.replace("const plan=", "const metadata=JSON.parse(await readFile('src/data/monthly-article-meta.json','utf8'));\nconst plan=")
s=s.replace('assert.equal(articles.length,6);', "assert.deepEqual(articles.map(x=>x.slug).sort(),Object.keys(metadata).sort(),'Publication registry matches metadata');\nassert.equal(new Set(articles.map(x=>x.slug)).size,articles.length,'Unique article owners');")
s=s.replace("for(const article of articles)assert.ok(!/^#|\\*\\*|\\]\\(/u.test(article.intro),`Plain-text intro ${article.slug}`);", "for(const article of articles)for(const field of ['intro','takeaway'])assert.ok(!/^#|\\*\\*|\\]\\(/u.test(article[field]),`Plain-text ${field} ${article.slug}`);")
s=s.replace("assert.equal(data.blogPosting[0].datePublished,'2026-10-31');assert.equal(data.blogPosting[0].dateModified,'2026-10-31');", "assert.equal(data.blogPosting[0].datePublished,article.date);assert.equal(data.blogPosting[0].dateModified,metadata[article.slug].modified);")
s=s.replace('if([390,1280].includes(width))', 'if([390,768,1280].includes(width))')
s=s.replace("data.structured.includes('\"dateModified\":\"2026-10-31\"')", "data.structured.includes(`\"dateModified\":\"${update.modified}\"`)")
s=s.replace("modified:'2026-10-31'", 'modified:update.modified');p.write_text(s)
print('Integrated',len(new),'new articles;',len(updates),'updated owners')
