# Небольшие детали пирогового города — 31.10.2026

Общий слой айдентики для главной и ContentLayout: пирог-солнышко возле вводных
подзаголовков, золотая отметка активной категории, светлая тёплая поверхность
товаров и поиска, линейный силуэт города с морем в подвале. В статьях —
нумерация содержания и тёплые разделители. Белое поле и тёмные CTA сохранены.
Новых JS-модулей, шрифтов и тяжёлых растровых ресурсов нет.

## Проверка

- `npm run check`: 454 файла, 0 ошибок, 0 предупреждений, 55 прежних hints.
- `npm run build`: 247 HTML.
- 41 Node-тест, семь SEO/контентных валидаторов, Worker, полный browser QA.
- Shared registry `check --strict`: PASS.
- `verify-responsive.mjs`: 13 шаблонов × 320/390/768/1280 (52 проверки), проверка переполнения,
  браузерных ошибок, наличия декоративного знака и общих токенов; no-JS/reduced motion.
- Поиск, вес, количество, наборы, дополнения, диалоги и межвкладочная синхронизация
  проверены существующим полным browser QA на 320/390/1280.
- Дополнительно: 8 проверок страниц документов, открытие меню и выбора города на телефоне.
- Все 244 содержательные HTML-страницы используют общий декоративный слой; три старых URL — редиректы. Тексты документов и noindex сохранены.
- Phone/tablet screenshots просмотрены. Убрана лишняя дублирующая линия перед
  содержанием статьи. Калькулятор получил тот же знак во вводной.

Отчёты: [local-responsive.json](local-responsive.json),
[legal-local-responsive.json](legal-local-responsive.json),
[build-coverage.json](build-coverage.json),
[production-responsive.json](production-responsive.json).

## Публикация и production

Runtime: `0071d97594d7ffa76d83da4b4939b29f23c83019`.
[CI 41181258922](https://github.com/jimbokl/PIROGORSK/actions/runs/41181258922): SUCCESS,
публикация завершена. [ci.json](ci.json).

- На опубликованном сайте прошли те же 52 responsive-проверки, включая меню и выбор
  города на страницах документов. Ошибок браузера и горизонтального переполнения нет.
- Независимая сверка с загруженным GitHub Pages artifact: все 272 проверенных ресурса,
  включая 247 HTML и runtime CSS/JS, совпадают по SHA-256. [publication.json](publication.json).
- Pages/Worker compatibility: PASS. [production-release.log](production-release.log).
- Повторные мобильные лабораторные замеры: LCP 1,8–2,3 с, Performance 96–99;
  Accessibility/SEO 100. Это Lighthouse с включённой аналитикой, не полевые метрики.
  До публикации: LCP 1,77 с, Performance 99. Best Practices 77 в обеих версиях
  связан с cookies внешней аналитики. [Все замеры](performance-comparison.json).
  Один промежуточный запуск не завершил запись desktop-отчёта; финальный запуск
  с абсолютным путём вывода завершился успешно.
  Desktop после публикации: Performance 99/LCP 0,66 с и 59/LCP 4,34 с.
  В последнем замере загрузка существующего баннера заняла 3,89 с, TBT 0 мс.
  Выборка мала и неоднородна; стабильность скорости этими замерами не доказана.

Просмотрены production-снимки: [детали стиля](production-brand-preview.jpg),
[телефон](production-phone-contact.jpg), [планшет](production-tablet-contact.jpg).

## Повторение проверки

```sh
node qa/brand-details-20261031/verify-responsive.mjs
QA_BASE=https://pirogorsk.ru QA_STAGE=production node qa/brand-details-20261031/verify-responsive.mjs
gh run download 41181258922 -n github-pages -D /tmp/pirogorsk-brand-pages-artifact
python3 qa/brand-details-20261031/verify-publication.py /tmp/pirogorsk-brand-pages-artifact/artifact.tar
```

Это эмуляция viewport в Chromium, а не тест на физических iPhone/iPad.
