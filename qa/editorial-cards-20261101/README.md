# Иллюстрированные переходы · 01.11.2026

Запрос: оформить карточки «Собрать стол в своём городе» и «Продолжить по теме» на странице `/journal/dostavka-edy-v-zelenogradske/`, применить imagegen и сохранить айдентику Пирогорска.

Общий `EditorialLinks` теперь включает иллюстрацию, HTML-заголовок, описание и строку действия со стрелкой. Три новые сцены созданы встроенным imagegen по утверждённому пикник-сету: крафтовый город у моря, семейный ужин, сытный и сладкий стол. [Оригиналы и полные промпты](../../design/editorial-cards-20261101/PROMPTS.md). Связанные статьи используют собственные обложки. AVIF/WebP, четыре ширины, `sizes`, размеры и lazy-loading; без нового клиентского JavaScript.

Сетка: три колонки desktop, две на планшете, одна на телефоне. Две карточки заполняют строку; пять распределены 3+2. На планшете последняя карточка нечётного набора занимает строку целиком. Высота в строке и нижняя линия действий выровнены; длинные названия доступны полностью. Исправлен конфликт порядка CSS на странице набора.

Локальная проверка:

- `npm run check`: 0 errors / 0 warnings; `npm run build`: 262 HTML.
- `npm test`: 65 PASS; SEO: 262 HTML / 154 товара / 257 sitemap URL; artwork: 62 уникальные обложки PASS.
- `node qa/editorial-cards-20261101/verify.mjs`: 943 назначения и заголовка на 247 страницах сохранены; 24 просмотра шести шаблонов на 320/390/768/1280. Изображения, полные заголовки, равная высота в строках, отсутствие переполнений, клавиатура и no-JS переход PASS. [Отчёт](local-report.json).
- Визуально просмотрены [телефон](local-viewport-390.png), [планшет](local-viewport-768.png), [desktop](local-viewport-1280.png), [связанные статьи](local-related-1280.png).

Лента, 154 SKU, цены, контакты и CRM в этой задаче не изменялись.

Локальный Lighthouse: mobile 89 / desktop 98; доступность, best practices и SEO — 100/100. CLS и TBT — 0 в обоих режимах. Один прогон на несжатом Python HTTP-сервере, не production PageSpeed. [Метрики](local-performance.json).

Опубликовано: runtime `42779fede5216f7681c36d7e51ebda026f69bb1e`, [CI 41346296496 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/41346296496). Полный CI включает browser, site-polish, journal-reading, bundle-pages, picnic-set, catalog-polish, pie-cutaways; все шаги успешны. [CI](ci.json), [release compatibility PASS](release.log).

Production: `QA_BASE=https://pirogorsk.ru node qa/editorial-cards-20261101/verify.mjs` — 24 просмотра шести шаблонов на 320/390/768/1280, изображения, отсутствие переполнений, равная высота в строках, полные заголовки, клавиатура и no-JS переход PASS; ошибок нет. Проверка сохранности всех 943 ссылок на 247 страницах выполняется по принятой статической сборке, адаптивные сценарии — по ресурсам production. [Отчёт](production-report.json).

Визуально просмотрены [телефон](production-viewport-390.png), [планшет](production-viewport-768.png), [desktop](production-viewport-1280.png), [связанные статьи](production-related-1280.png).

[Свежий публичный PSI](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-dostavka-edy-v-zelenogradske/nr5f560n7a): mobile/desktop 100/100; LCP 1.651/0.401 s, CLS 0/0. Доступность, best practices и SEO — 100 в обоих режимах. Единичные лабораторные замеры, CrUX отсутствует. [Точные метрики и время](public-psi.json).
