# Начинка и подача · 31.10.2026

REF-03/05/06: шесть вторых ракурсов imagegen, доступных по нажатию;
единый маршрут из четырёх существующих гайдов; схемы нарезки на 6/8/12
частей и примеры товаров; компактные фактические возможности каталога.
153 SKU и одобренная лента сохранены. Новых URL, скидок, отзывов и обещаний
доставки не добавлено. Реальные условия запуска остаются отложенными.

## Локальная приёмка

Astro check: 497 файлов, 0 ошибок и предупреждений, 62 подсказки.
Build: 254 HTML. 53 Node-теста, Worker/API/SQL и восемь валидаторов PASS.
Registry strict PASS, ошибок и дрейфа нет.
Полная браузерная регрессия PASS: формы и Worker/SQLite, форматы/количества,
наборы/редактор, синхронизация вкладок, ссылки и аналитика; отдельный UX-прогон
на пяти ширинах, включая no-JS.

[Адаптивный прогон](local/report.json): 320/390/768/1024/1280 PASS,
ошибок JavaScript нет. Все шесть срезов главной/меню, страницы товаров,
четыре гайда, текущий пункт маршрута, три примера товаров, три схемы.
153 карточки на главной и 153 в меню. Размеры ракурсов одинаковы,
горизонтального переполнения нет, область кнопки не менее 44 px.
До нажатия изображения срезов не запрашиваются. Клавиатура, возврат
к целому пирогу, ошибка сети с повтором и no-JS PASS.

Просмотрены [мобильная лента](local/home-390.png),
[меню на планшете](local/menu-768.png),
[товар на телефоне](local/product-meat-390.png),
[товар на планшете](local/product-meat-768.png) и
[схемы нарезки](local/cutting-390.png).
Телефон/планшет здесь — viewport Chrome, не физические устройства.
Изображения срезов и полные промпты — в
[спецификации](../../design/pie-cutaways-20261031/README.md).

Проверка воспроизводится: `node scripts/verify-pie-cutaways.mjs`.
Для production: `QA_BASE=https://pirogorsk.ru QA_STAGE=production node scripts/verify-pie-cutaways.mjs`.

## Выпуск

Runtime `ba8f40d32fa2f686eaad855e26fdec0bfea855f6`;
[CI 41213244009 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/41213244009),
[результат и jobs](ci-result.json).
[Независимая сверка](publication.json): все 313 ресурсов, включая 254 HTML,
runtime CSS/JS и 30 новых WebP, совпали с отдельно скачанным CI-артефактом.

[Production QA](production/report.json): 320/390/768/1024/1280 PASS,
ошибок JavaScript нет. Шесть ракурсов, загрузка по нажатию, клавиатура,
неизменная высота, сетевой сбой/повтор, no-JS, четыре гайда и три схемы.
[Регрессия каталога](catalog-production/report.json): все 153 SKU главной
и меню, форматы/цены/количество, пять наборов, редактор/ссылки/дополнения,
storage и no-JS на тех же пяти ширинах PASS.
Просмотрены [лента 390 px](production/home-390.png),
[меню 768 px](production/menu-768.png),
[товар 768 px](production/product-meat-768.png) и
[нарезка 390 px](production/cutting-390.png).

## Скорость и доступность внешнего измерителя

Lighthouse CLI 13.5.0, simulated throttling; три mobile и один desktop.

| Среда | Performance | LCP, с | CLS | Accessibility / Best Practices / SEO |
| --- | --- | --- | --- | --- |
| Local mobile | 96 / 95 / 99 | 2,71 / 2,56 / 2,04 | 0,001 | 100 / 100 / 100 |
| Local desktop | 100 | 0,47 | 0,002 | 100 / 100 / 100 |
| Production mobile | 97 / 98 / 98 | 2,21 / 2,31 / 2,30 | 0,003 / 0,001 / 0,013 | 100 / 77 / 100 |
| Production desktop | 99 | 0,65 | 0,002 | 100 / 77 / 100 |

Медиана production mobile LCP — 2,30 с. Разброс render delay в наблюдаемой
шкале 18–54 мс; срезы до нажатия не загружаются. Best Practices 77 связан
с `third-party-cookies` и `inspector-issues` типа Cookie у Яндекс Метрики;
ошибок JavaScript в консоли нет. Интеграция аналитики этим выпуском не менялась.
[Локальные метрики](performance-local/metrics.json),
[production-метрики](performance-production/metrics.json),
[production-диапазоны](performance-production/performance-ranges.json).
Метрики содержат SHA-256 исходных CLI-отчётов, полные отчёты сохранены локально
в этих же каталогах. Это лабораторные замеры, не полевые Core Web Vitals.

Публичный PageSpeed: по две попытки mobile/desktop вернули
«Не удалось перейти по адресу https://pirogorsk.ru/. Проверьте правильность URL».
[Ответ интерфейса](public-psi-raw.json), [mobile](pagespeed-mobile.png),
[desktop](pagespeed-desktop.png), [скрипт воспроизведения](verify-pagespeed.mjs).
Отдельный [запрос API без ключа](public-psi-api.json) получил HTTP 429
`RESOURCE_EXHAUSTED`: превышена суточная квота указанного в ответе consumer
project. Это ответ конкретного API-запроса, не доказательство причины ошибки
в интерфейсе PSI. Отчёт и оценки публичного PSI не получены.
[Google DNS JSON](public-dns.json) вернул A-записи GitHub Pages со статусом 0;
отсутствие A-записи в проверенном резолвере не подтвердилось. Production
открывается и проходит браузерную приёмку; причина ответа PSI не установлена.
