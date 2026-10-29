# Подложки и движение карточек — 29.10.2026

## Изменение

Для 84 позиций созданы отдельные фоны встроенного imagegen: 78 товаров Holland Bakery, пять напитков и набор посуды. Восемь прежних подложек пирогов сохранены. Каждой из 92 позиций соответствует своя композиция. Для посуды дополнительно создан отдельный прозрачный рисунок тарелок, приборов и салфетки.

Подложки — оригинальные гравюры ингредиентов на светлой бумаге с пустым центром. Продукт остаётся самостоятельным слоем. Существующие непрозрачные иллюстрации поставщика соединены с фоном через multiply и мягкую маску; новая фактура или скрытые части продукта не дорисовывались. Иллюстрации остаются художественными референсами, состав определяется текстом карточки.

Движение повторяет первые пироги: лёгкий подъём, поворот продукта и отдельный поворот/увеличение фона. Отклик на hover, фокус клавиатуры и нажатие; на странице товара — hover/press. Пассивный pointer-обработчик отмечает касание без перехвата прокрутки или перехода. Нет входного скрытия, постоянного цикла или анимационной JavaScript-библиотеки. Reduced motion отключает движение. Название, цена, ссылки и выбор формата остаются HTML.

## Воспроизведение

- Промпты: `../../research/product-backdrops-20261029/prompts.json` и `tableware-subject.json`; исходные PNG: `../../design/product-backdrops-source/`.
- `node scripts/prepare-product-backdrops.mjs`: 256/400/640/960px, AVIF и WebP, исходники и SHA-256 — `../../src/data/product-backdrops.json`. PNG не передаются браузеру. Скрипт повторно использует неизменённые оптимизированные файлы.
- `node research/product-backdrops-20261029/make-contact-sheets.mjs`: обзорные листы и индекс. Они предназначены для QA и не используются в карточках.
- `npm run build`, затем `node scripts/verify-product-backdrops.mjs`: соответствие каталогу, источники/хеши, размеры файлов, все 92 страницы и 84 фоновых слоя меню. Верификатор добавлен в CI.
- Сервер: `node qa/product-pages-20261029/static-server.mjs`; UI: `node qa/product-backdrops-20261029/verify-ui.mjs http://127.0.0.1:4325 local`. Production — тот же скрипт с `https://pirogorsk.ru production`.

## Проверка

Локально: check без ошибок/предупреждений, build153HTML; шесть SEO/artwork-валидаторов, 34 теста, Worker/API/SQLite и обе browser fixtures PASS. Проверка источников: 84 уникальных SHA-256, восемь сохранённых фонов, 672 responsive-файла, 26 728 970 байт; средний фон400px — 18 263 байта. Registry strict PASS.

UI: 24 сочетания страницы и ширины320/390/1280, на каждой ширине декодированы все162 слоя меню; девять проверок hover/focus/press/reduced motion, включая напиток и касание. Переполнения и JS-ошибок нет. [Readback](local-readback.json).

Локальный Lighthouse (по одному mobile/desktop): главная P97/100, LCP2406/528мс; товар P100/100, LCP1727/404мс; A/BP/SEO100. Все результаты сохранены в `local-home/` и `local-product/`. Изменений цен, ID, API, формы и оплаты нет.

## Первая публикация и исправление приоритета

Runtime `26e1852`, [CI40890541811 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40890541811). Production: все421 проверенных URL/файла HTTP200 и точно совпадают с локальной сборкой; Worker compatibility PASS. UI:24 сочетания маршрута/ширины, девять проверок движения,162 декодированных слоя на каждой ширине; без overflow/JS-ошибок. См. `production-byte-readback.json`, `production-readback.json`, `runtime-ci.json`.

Публичный PSI29.10,16:29 GMT+2: [главная mobile86/LCP4061мс](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/fxsfqowvci?form_factor=mobile), [товар90/3573мс](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-catalog-osetinskiy-pirog-s-kuritsey-i-syrom/jrt9dy1vep?form_factor=mobile); desktop100/441мс и100/331мс; A/BP/SEO100 везде. Полные записанные показатели и LCP breakdown — `public-psi-before-priority.json`. CrUX нет. На главной LCP — прежняя иллюстрация берега с high priority; стабильные4с не считаем исправленными.

На товаре PSI выбрал подложку как LCP и потребовал fetchpriority=high. Hero исправлен на eager/high; меню остаётся lazy/low. Соответствие проверяется в построенном HTML всех84 новых страниц. Результаты повторной публикации приведены ниже.

## Финальная публикация

Runtime `fa84c22f8efc6f00d3f77e062c2e8e1bc86af032`, [CI40893141008 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40893141008); все шаги, включая34 теста, Worker/API/SQLite, browser fixtures, deploy и published compatibility, успешны. Сохранён `priority-ci.json`. Финальный production readback:421 URL/файл HTTP200 и точное SHA256-совпадение; UI24 сочетания маршрута/ширины,162 декодированных слоя меню на каждой ширине320/390/1280 и девять проверок движения PASS; переполнения и JS-ошибок нет. Обновлены `production-byte-readback.json`, `production-readback.json` и12 скриншотов. Визуально приняты карточки320/390/1280, страницы пирога, напитка и посуды.

Повторный [публичный PSI товара](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-catalog-osetinskiy-pirog-s-kuritsey-i-syrom/jupwbxur21?form_factor=mobile),29.10,16:44 GMT+2: **mobile100/LCP1207мс, desktop100/369мс; A/BP/SEO100, CLS0 у обоих**. LCP discovery проходит: eager/high, запрос доступен в HTML. Наблюдаемая задержка отрисовки фона10мс вместо1030мс в предыдущем отчёте. Данные — `public-psi-after-priority.json`. Это повтор одного лабораторного замера; устойчивость в реальном трафике и объяснение всей прежней вариативности не доказаны.

## Независимые замеры production

Главная, Lighthouse13.5.0 / HeadlessChrome156, три mobile + один desktop, отдельный профиль на каждый запуск: mobile P99/100/100, LCP1572/1237/1448мс (медиана1448мс); desktop100/617мс. A100/SEO100, прежний CLI BP77 из-за Метрики. Наблюдаемый mobile LCP857–1506мс, задержка отрисовки8,5–13,8мс. Полные отчёты и агрегаты — `production-home/`. Главная между первым выпуском и исправлением приоритета товара не менялась. Расхождение с публичным PSI4061мс сохраняется; CrUX нет, полевую стабильность по этим лабораторным тестам не заявляем.

Товар после исправления, один mobile + один desktop: P100/100, LCP1599/376мс, CLS0, A100/SEO100; прежний CLI BP77 Метрики. Наблюдаемая задержка отрисовки18/20мс. Полные отчёты — `production-product/`. Эти CLI-замеры и публичный PSI выполнены разными версиями Chromium и отражают лабораторную производительность, не статистику посетителей.
