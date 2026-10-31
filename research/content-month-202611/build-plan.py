import json,re
from pathlib import Path
root=Path(__file__).parent
source=Path('research/backlog-intake-20261031/A6.txt').read_text()
titles={int(n):t for n,t in re.findall(r'^(\d+)\. (.+)$',source,re.M)}
rows=[]
for d,key in [('regional',None),('kaliningrad','topics'),('coast','items')]:
 a=json.loads((root/d/'cluster-map.json').read_text()); a=a[key] if key else a
 for x in a:
  n=x.get('source_number',x.get('number',x.get('sourceNumber')))
  rows.append(dict(number=n,sourceTitle=titles[n],topic=x.get('normalizedTopic',titles[n]),intent=x.get('intent',titles[n]),ownerURL=x.get('owner_url',x.get('ownerUrl',x.get('ownerURL'))),week=int(re.search(r'\d+',str(x.get('week',1))).group()),decision=x.get('decision',x.get('action')),scenario=x.get('cta_scenario',x.get('ctaScenario',x.get('scenarioCTA'))),status='evidence_needed',dataGap=x.get('data_gap',x.get('dataGap','')),cluster=d,brandReframe=x.get('brandReframe')))
# One owner for overlapping intents, including topics previously proposed as standalone drafts.
overrides={
 2:('/journal/ryba-baltiki-vidy/','Виды балтийской рыбы и чтение рыбного меню'),7:('/journal/ryba-baltiki-vidy/','Виды балтийской рыбы и чтение рыбного меню'),
 27:('/journal/rynki-kaliningrada-eda/','Продукты и еда на рынках Калининграда'),31:('/journal/vegetarianskaya-eda-v-kaliningrade/','Вегетарианская еда в Калининграде: овощные блюда без мяса и рыбы'),
 34:('/journal/kenigsbergskiy-martsipan/','Марципан в Калининграде: музей и выбор изделия'),35:('/journal/kraftovoe-pivo-kaliningrada/','Местные пивоварни Калининграда'),39:('/journal/eda-v-aeroportu-hrabrovo/','Еда перед вылетом из Храброво'),
 43:('/journal/gde-poest-v-zelenogradske/','Местные блюда в Зеленоградске'),48:('/journal/gde-poest-v-zelenogradske/','Кофе и выпечка в Зеленоградске'),59:('/journal/gde-poest-v-zelenogradske/','Еда на один день в Зеленоградске'),60:('/journal/sedobnye-suveniry-iz-kaliningrada/','Съедобные сувениры региона: проверка в Зеленоградске'),
 65:('/journal/gde-poest-v-svetlogorske/','Пекарни Светлогорска: ассортимент и формат покупки'),71:('/journal/svetlogorsk-kaliningrad-edamarshrut/','Светлогорск — Калининград: электричка и планирование еды'),78:('/journal/gde-poest-v-svetlogorske/','Еда на два дня в Светлогорске'),80:('/journal/sedobnye-suveniry-iz-kaliningrada/','Съедобные сувениры региона: проверка в Светлогорске')}
for x in rows:
 if x['number'] in overrides:x['ownerURL'],x['topic']=overrides[x['number']]
 if x['number']==31:x['brandReframe']='Исправлена ошибка исходника: рыба и морепродукты не относятся к вегетарианской еде. Варианты с рыбой не предлагаются.'
 if x['number'] in [42,56,62,65]:
  x['brandReframe']='Названия заведений исходника сохранены в sourceTitle; тема раскрывается через формат, ассортимент и меню по первоисточникам, без неподтверждённого рейтинга или дегустации.'
  if x['number']==42:x['topic']='Пекарни и пироги в Зеленоградске: как сравнить состав и формат'
  if x['number']==56:x['topic']='Рестораны Зеленоградска: как сравнить меню и условия'
  if x['number']==62:x['topic']='Рыбные рестораны Светлогорска: виды рыбы и способы приготовления'
# Parent cluster: source numbers and full original titles never change.
extra={
81:('piknik-na-kurshskoy-kose','пикник','Объединить с 84; обзор официальных вариантов питания, без полного каталога и часов.'),
82:('piknik-na-kurshskoy-kose','пикник','Официальный каталог парка подтверждает заведение, но не актуальное копчёное меню, цены и качество; отдельная оценка не готова.'),
83:('piknik-na-kurshskoy-kose','пикник','Не называть полным гидом: нужен подтверждённый перечень остановок, меню и часы каждой кухни.'),
84:('piknik-na-kurshskoy-kose','пикник',''),
85:('gde-poest-v-zelenogradske','пикник','Для цельного маршрута проверить остановки парка, путь до обеда и часы кухни; не указывать расчётное время как проверенное.'),
86:('ryba-baltiki-vidy','пикник','Нужны первичные предложения именно корюшки на косе, вид обработки, дата цены и условия хранения; рыбу из общего каталога не подменять корюшкой.'),
87:('piknik-na-kurshskoy-kose','пикник','Официальный раздел парка даёт отправную точку; работа кухни в день визита требует уточнения.'),
88:('piknik-na-kurshskoy-kose','пикник','Есть семейный сценарий упаковки; полноценный список детских блюд/оснащения требует меню и данных конкретных мест.'),
89:('gde-poest-v-zelenogradske','апартаменты','Проверить вечерние кухни Зеленоградска и Лесного; не обещать свободный стол или открытое кафе.'),
90:('svetlogorsk-kaliningrad-edamarshrut','пикник','Нет проверенного маршрута между тремя точками с остановками на еду; опубликованный материал отвечает только за поездку на электричке, не за эту комбинацию.'),
91:('uzhin-v-semnyh-apartamentah','апартаменты','Для численного сравнения нужны сопоставимые масса, цена, состав, доставка пирога и пиццы на одну дату; сценарий без цифр уже раскрыт.'),
92:('skolko-piroga-na-cheloveka','компания','Существующий расчёт не гарантирует насыщение; обновление диапазона 2–15 человек требует проверки интерфейса калькулятора и порционных допущений.'),
93:('kak-perevezti-pirog','пикник','Сравнить упаковку, хранение и условия пути по маркировке конкретных товаров; не давать общую гарантию рыбе/сэндвичу.'),
94:('uzhin-v-semnyh-apartamentah','апартаменты','Сценарий дополнен проверкой кухни и общего стола; услуги приготовления/доставки Пирогорска ещё не подтверждены.'),
95:('pirogi-na-kofe-breyk','апартаменты','Добавить домашний завтрак отдельным подразделом: напиток, посуда, фактическая начинка и условия хранения, без обещания утренней доставки.'),
96:('piknik-s-pirogom-chto-vzyat','пикник','Нужна реальная проверка упаковки во влажную/ветреную погоду; без неё не обещать, что пирог не размокнет.'),
97:('myasnoy-pirog-nachinka-i-testo','компания','Нужны две конкретные рецептуры и массы начинки/теста; название изделия само по себе не доказывает разницу.'),
98:('sladkie-pirogi-k-chayu','компания','Сопоставить реальные изделия и составы с облепихой, брусникой и марципаном; не приписывать марципан ассортименту Пирогорска.'),
99:('kak-vybrat-pirogi-na-kompaniyu','компания','Есть владелец и расчёт порций; обещания заказа, слота и упаковки требуют операционных данных.'),
100:('gde-poest-v-kaliningrade','апартаменты','Выбрать один город и подтвердить точки/часы для двух дней; не делать три одинаковых геотекста заменой топонима.')}
for n,(slug,scenario,gap) in extra.items():
 rows.append(dict(number=n,sourceTitle=titles[n],topic=titles[n],intent=titles[n].split(':')[0],ownerURL=f'/journal/{slug}/',week=3 if n<91 else 4,decision='merge_or_strengthen',scenario=scenario,status='evidence_needed',dataGap=gap,cluster='journey' if n<91 else 'scenarios',brandReframe=None))
rows.sort(key=lambda x:x['number'])
for x in rows:
 n=x['number'];x['week']=max(1,min(4,x['week']))
 x['window']={1:'2026-11-01 — 2026-11-07',2:'2026-11-08 — 2026-11-14',3:'2026-11-15 — 2026-11-21',4:'2026-11-22 — 2026-11-30'}[x['week']]
 if n in [1,6,12,31,71,84]:x.update(status='integrated_ready_for_qa',decision='new_article',dataGap='')
 elif n in [36,70]:x.update(status='integrated_update_ready_for_qa',decision='owner_updated')
 elif n in [10,20,34,81,87,88,94]:x['status']='consolidated_partial';x['decision']='merge_into_owner'
 if n==82:x['brandReframe']='Вместо оценки конкретного бренда — проверка остановки по официальному каталогу парка. Без заявления о дегустации и качестве копчёной рыбы.';x['topic']='Остановка на еду в Рыбачьем: как проверить меню и часы'
 if not x['ownerURL']:raise ValueError(n)
 assert x['status'] in ['integrated_ready_for_qa','integrated_update_ready_for_qa'] or x['dataGap']
assert [x['number'] for x in rows]==list(range(1,101))
(root/'topic-map.json').write_text(json.dumps(dict(month='2026-11',source='../backlog-intake-20261031/A6.txt',publicationNote='Календарь редакционных действий. Интегрированные материалы подготовлены 31 октября; будущие строки не означают обещание публикации без данных.',topics=rows),ensure_ascii=False,indent=2)+'\n')
lines=['# Карта 100 тем A6 — ноябрь 2026','','Источник: [A6](../backlog-intake-20261031/A6.txt). Сохранены все номера и исходные формулировки. URL означает владельца интента; существование страницы проверяется отдельно. Для ещё не созданного владельца это проектный адрес, а не опубликованная ссылка.','','Шесть новых текстов и два дополнения интегрированы 31 октября. Объединение означает работу в одной статье, а не выполнение неподтверждённого рейтинга, цены или полного каталога. Точный статус публикации — в [протоколе](RELEASE.md).','','| № | Исходная тема | Владелец | Неделя | Результат / пробел |','| --- | --- | --- | --- | --- |']
for x in rows:
 result={'integrated_ready_for_qa':'Новая статья; QA и публикация в протоколе','integrated_update_ready_for_qa':'Дополнен владелец; QA и публикация в протоколе','consolidated_partial':'Объединено частично: '+x['dataGap'],'evidence_needed':x['dataGap']}[x['status']]
 lines.append(f"| {x['number']} | {x['sourceTitle']} | `{x['ownerURL']}` | {x['week']} | {result.replace('|','/')} |")
(root/'TOPIC-MAP.md').write_text('\n'.join(lines)+'\n')
lines=['# Редакционный календарь — ноябрь 2026','','Это график следующей работы с 100 входными темами, а не 100 обязательных отдельных URL. Первые шесть статей и два обновления подготовлены 31 октября. Публикация остального зависит от указанных фактов; неподтверждённые строки остаются в очереди с точным пробелом.','','| Неделя | Темы A6 | Действие |','| --- | --- | --- |']
for w in range(1,5):
 ns=[str(x['number']) for x in rows if x['week']==w]
 actions={1:'Сверить первые материалы и владельцев; получить официальные меню и сезонные данные Калининграда.',2:'Усилить прибрежные владельцы; проверить составы, адреса и часы заведений, без брендовых рейтингов.',3:'Уточнить еду на косе, остановки и обратный путь по парку и самим кухням.',4:'Проверить практические сравнения, порции, упаковку; оценить фактические переходы в подборку.'}
 lines.append(f"| {w} ({[x for x in rows if x['week']==w][0]['window']}) | {', '.join(ns)} | {actions[w]} |")
lines+=['','Внутри недели: сначала источники → обновление владельца → редактура → изображения/подписи → SEO и мобильный QA → публикация → read-back. Если первоисточника нет, результатом недели остаётся конкретный запрос данных в карте.','','Повторы: 2/7 — одна рыбная статья; 1/10/20 — региональный обзор с границами, без искусственных чисел; 6/34 — марципан; 12/60/80 — сувениры с локальными пробелами; 50/81/83/84/87/88 — общий контур пикника, коммерческий сценарий сохраняется отдельно; 36/91/94 — апартаменты; 92/99 — расчёт и выбор компании.','','Еженедельный readout: просмотры владельца, переходы по `ed-next-step`, завершения подбора и анонимный интерес. Контакты, реальные заказы и выручка считаются отдельно после появления соответствующего пути. Метрик результата пока нет.']
(root/'CALENDAR.md').write_text('\n'.join(lines)+'\n')
