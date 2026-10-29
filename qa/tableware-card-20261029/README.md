# Компактная карточка посуды — 29.10.2026

Причина: после добавления иллюстрации у карточки осталось три колонки на четыре элемента. Картинка занимала растягиваемую колонку, описание сжималось, действия переносились.

Исправление: явные области сетки visual/copy/variant/actions и ограниченная миниатюра 80/96/112px. Responsive sizes соответствует миниатюре; hero отдельной страницы, графика и движение сохранены.

| Ширина | Картинка до | Картинка после | Высота карточки до → после |
| --- | --- | --- | --- |
| 320 | 192px | 80px | 410 → 222px |
| 390 | 262px | 80px | 476 → 198px |
| 768 | 574px | 96px | 723 → 149px |
| 1280 | 792px | 112px | 899 → 148px |

До: production, `before-readback.json` и `before-*.png`. После: локальная production-сборка, `local-readback.json` и `local-*.png`. На каждой ширине нет переполнения и JS-ошибок; посуда добавляется в подборку, модальное окно открывается. Заявки на production не отправлялись. Скриншоты 390/1280 визуально просмотрены.

Локально PASS: astro check + tsc (143 файла, 0 errors/warnings, 10 прежних hints), build (214 HTML), SEO (212 sitemap URL, 16061 ссылка), product pages (153), backdrops (153 позиции). Публикация и production readback подтверждены ниже.

## Лабораторная проверка загрузки

Из-за уточнения responsive sizes выполнены замеры тем же `scripts/audit-performance.mjs`, Lighthouse 13.5.0, отдельные профили, один mobile и один desktop. До изменения на production: P99/99, LCP1603/638мс, CLS0,006/0,007, TBT28/0мс. После локально: P97/100, LCP2405/528мс, CLS0,005/0,007, TBT0/0мс. Источники различаются по сети и Метрике; это не парное доказательство изменения production-производительности. Компактные результаты: `before-performance.json`, `local-performance.json`; полные трассы — `/tmp/pirogorsk-tableware-*-performance/`. Публичный PSI и production после публикации записаны отдельно ниже.

## Публикация и проверка production

Runtime `dfd074e1fe12a3dd93036c6d4aa46b759b271dcf`, [CI40908423329 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40908423329). Check/build, все SEO/artwork-валидаторы, Node tests, Worker/API/SQL, browser fixtures, Pages deploy и опубликованная совместимость PASS. Полный результат — `runtime-ci.json`.

Production UI320/390/768/1280: миниатюра80/80/96/112px, карточка222/198/149/148px, без overflow и JS-ошибок. На всех ширинах работает добавление посуды в подборку и её открытие. Скриншот320 дополнительно просмотрен. Главная, меню и отдельная страница посуды HTTP200, точный SHA256 локальной сборки; стили главной встроены в HTML. `production-readback.json`, `production-bytes.json`, `production-*.png`. Published Pages/Worker compatibility PASS. Реальные заявки не отправлялись.

Публичный [PageSpeed](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/uzy09q2ogt?form_factor=mobile), 29.10.2026 18:16 GMT+2: mobile99, LCP≈2,0с (1951мс в ссылке калькулятора), CLS0,007, TBT60мс; desktop100, LCP≈0,5с (453мс), CLS0,007, TBT10мс. A/BP/SEO100 у обоих. Данные UI — `public-psi.json`. Отдельный CLI-контроль по production: mobile99/LCP1629мс/CLS0,003/TBT22,5мс, desktop100/513мс/CLS0,003/TBT0; A/SEO100, прежний BP77 Метрики. Результаты — `production-performance.json`. Это одиночные лабораторные замеры; CrUX отсутствует, прежняя нестабильность публичного LCP не объявляется устранённой этим изменением.
