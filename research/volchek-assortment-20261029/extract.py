import re,csv,json
from pathlib import Path
folder=Path('research/volchek-assortment-20261029')
pages=(folder/'source.txt').read_text().split('\f')
sections=[(3,36,'Кондитерские изделия'),(37,60,'Выпечка'),(61,62,'Френч-доги'),(63,70,'Печенье и сладости'),(71,78,'Пироги'),(79,89,'Хлеб'),(90,98,'Мороженое и сорбеты'),(99,102,'Холодные напитки'),(103,103,'Горячие напитки'),(104,104,'Кофе в пачках')]
source='https://drive.google.com/file/d/1bOpUaQ33NBmQAeh1Gn3Z-oyNiNbQ9Wnq/view?usp=drivesdk'
rows=[]
for n in range(3,103):
    category=next(c for a,b,c in sections if a<=n<=b)
    text=pages[n-1]
    if n==15:
        head='ТОРТ НАПОЛЕОН, 100 гр / 600 гр';prices=['88','528']
    else:
        head=next(l.strip() for l in text.splitlines() if re.match(r'^\s*[А-ЯЁ«][А-ЯЁA-Z0-9\s«»“”.,()–—\-+/:]*[А-ЯЁ»],?\s*\d',l))
        prices=re.findall(r'(?<!\d)(\d+[,.]?\d*)\s*р\b',text)
    head=re.sub(r'\s+',' ',head)
    name,amount=head.split(',',1)
    amounts=[x.strip().replace('гр','г') for x in amount.split('/')]
    assert len(amounts)==len(prices),(n,head,prices)
    if n==64: amounts=['3 шт. · 150 г']
    rows.append(dict(category=category,name=name.capitalize(),variants=[{'amount':w,'price_rub':int(p)} for w,p in zip(amounts,prices)],source_page=n))
for line in pages[102].splitlines():
    m=re.match(r'\s*((?:\d+\s*р\s*)+)([А-ЯЁ].+?,)\s*(.+)$',line)
    if not m:continue
    prices=re.findall(r'\d+',m[1]);amounts=m[3].strip().split('/')
    assert len(prices)==len(amounts)
    rows.append(dict(category='Горячие напитки',name=m[2][:-1].capitalize(),variants=[{'amount':x.strip()+(' л' if 'мл' not in x else ''),'price_rub':int(p)} for x,p in zip(amounts,prices)],source_page=103))
for name in ['Кофе молотый','Кофе в зернах']:
    rows.append(dict(category='Кофе в пачках',name=name,variants=[{'amount':'250 г','price_rub':499}],source_page=104))
assert len(rows)==119,len(rows)
# The drinks page prints each cup size on its own line. Group sizes by name.
grouped={}
for row in rows:
    key=(row['category'],row['name'])
    if key in grouped:
        grouped[key]['variants'].extend(row['variants'])
    else:
        grouped[key]=row
rows=list(grouped.values())
assert len(rows)==113,len(rows)
with (folder/'assortment.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f,delimiter=';',lineterminator='\n');w.writerow(['Категория','Наименование','Вес / объём / количество','Цена, ₽','Страница PDF','Дата прайса','Источник'])
    for row in rows:
        for v in row['variants']:w.writerow([row['category'],row['name'],v['amount'],v['price_rub'],row['source_page'],'08.10.2026',source])
(folder/'assortment.json').write_text(json.dumps({'source':source,'source_title':'Ассортиментный перечень Булочных Ф. Вольчека от 08.10.2026','retrieved_at':'2026-10-29','products':rows},ensure_ascii=False,indent=2)+'\n')
count=sum(len(x['variants']) for x in rows)
md=['# Булочные Ф. Вольчека — отдельный ассортиментный список','',f'Источник: [ассортиментный перечень от 08.10.2026]({source}). Сохранено 29.10.2026.','',f'**113 наименований, {count} вариантов веса и объёма, 10 разделов.** Цены перенесены из PDF; это цены источника, а не расчёт цен Пирогорска. Список сохранён отдельно от каталога сайта.','', 'В оригинале указано, что вес может отличаться на 10% из-за ручного изготовления. Для каждой строки сохранён номер страницы PDF. На странице 103 единица объёма у части напитков не подписана: значения 0,2 / 0,3 / 0,4 приведены здесь в литрах. Страница 15 — изображение, название и цены считаны с него вручную.','', '[CSV для таблиц](assortment.csv) · [JSON](assortment.json) · [Исходный PDF](source.pdf)','']
for a,b,c in sections:
    md += ['## '+c,'','| Наименование | Вес / объём → цена | Страница PDF |','|---|---|---:|']
    for row in rows:
        if row['category']==c:
            v='; '.join(x['amount']+' → '+str(x['price_rub'])+' ₽' for x in row['variants'])
            md.append(f"| {row['name']} | {v} | {row['source_page']} |")
    md.append('')
(folder/'README.md').write_text('\n'.join(md))
print(json.dumps({'products':len(rows),'variants':count,'categories':len(sections)},ensure_ascii=False))
