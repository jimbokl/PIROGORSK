# Иллюстрации и страницы товаров — 29.10.2026

## Объём

- 78 отдельных иллюстраций встроенного imagegen по референсам производителя. У каждого SKU свой исходник, prompt и контрольная сумма; это художественные иллюстрации, не фотографии товара.
- 624 адаптивных AVIF/WebP и 78 OG JPEG. Каталог использует lazy loading, товарная hero — eager/high с заданными размерами.
- 84 новые страницы `/catalog/`, 8 прежних товарных URL сохранены. Всего 92 позиции и 183 варианта; цены и контракт Worker не менялись.
- Уникальные описания, подача, фактический состав при наличии источника, форматы, выбор варианта, плановый расчёт доставки, связанные товары и переход в анонимную подборку.
- 151 адрес в sitemap; карта интентов без выдуманной частотности. На новых страницах ItemPage без фиктивных наличия, рейтингов и предложений продажи.

## Проверка до публикации

Astro/TypeScript: 0 errors / 0 warnings. 153 HTML; валидаторы SEO, расширения, карты, статейных иллюстраций и товарных страниц PASS. 34 unit tests, Worker/API/SQLite и обе реальные browser fixtures PASS. Worker compatibility PASS.

`local-readback.json`: 27 проверок девяти разных товарных страниц на ширинах 320/390/1280, декодированы все 78 иллюстраций. Последняя фасовка, цена, четыре итоговых расчёта доставки и вариант в CTA проверяются программно. Переход в подборку и форма проверяются без отправки production-заявок. Общий каталог дополнительно проверен в `../supplier-catalog-20261029/product-pages-local-readback.json`.

Для повторения: `node qa/product-pages-20261029/static-server.mjs`, затем `node qa/product-pages-20261029/verify-ui.mjs http://127.0.0.1:4325 local`. Для production передать `https://pirogorsk.ru` и метку `production`.

Локальные `python-http10-*-summary.json` оставлены как диагностика сервера: HTTP/1.0 без сжатия и сбросы параллельных подключений делают их непригодными для оценки production. Финальные локальные прогоны `local-*-summary.json` используют HTTP/1.1 с gzip. Production и публичный PSI фиксируются отдельно после выпуска.

Промпты: `../../research/supplier-artwork-20261029/prompts.json`. Исходники: `../../design/supplier-source/`. Соответствие SKU/изображений/источников: `../../src/data/supplier-artwork.json`.

## Опубликованный выпуск

Runtime `bf26eb4285ccad26abb7d80ad9f27ec9cd27991f`, [CI 40875203722 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40875203722). Все проверки, публикация Pages, совместимость с действующим Worker и уведомление IndexNow прошли. Worker и схема D1 не менялись; catalog SHA `c09cb628c9f719a00a7c41180ecaecde707886410e0be864cdc4fefbbd693425`.

`production-byte-readback.json`: 253 ответа HTTP 200 с точным совпадением SHA-256 со сборкой: все 92 товарных URL, главная, меню, контрольная статья, sitemap, release manifest, по одному AVIF и OG JPEG каждого из 78 товаров. `verify-release.mjs published` PASS.

`production-readback.json`: все 78 иллюстраций декодированы; 27 проверок товарных страниц на 320/390/1280px, цены и четыре итога доставки, вариант в CTA и открытие подборки. Общий каталог дополнительно проверен в `../supplier-catalog-20261029/product-pages-production-readback.json`: 92 позиции, поиск, разделы, форматы, смешанная подборка, мобильное меню. Overflow и JS-ошибок нет; production-заявок не отправляли.

### Публичный PageSpeed

Свежие отчёты 29.10.2026, 14:45 GMT+2, Lighthouse 13.5.0 / Chromium 153. Один отчёт на каждый URL, mobile и desktop. На обеих страницах **P/A/BP/SEO 100** на обоих устройствах.

| Страница | Mobile LCP | Desktop LCP | Отчёт |
| --- | --- | --- | --- |
| Главная | 1726 мс | 441 мс | [Публичный PSI](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/xtdsdnlmtc?form_factor=mobile) |
| Осетинский пирог с курицей и сыром | 1215 мс | 288 мс | [Публичный PSI](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-catalog-osetinskiy-pirog-s-kuritsey-i-syrom/j50udkn00t?form_factor=mobile) |

Метрики и ссылки сохранены в `production-public-psi.json`, исходный видимый текст — `public-psi-*-ax.txt`. Это лабораторные результаты; CrUX данных пока нет.

Независимая CLI-серия production, Chrome156, три свежих mobile-профиля: **P99/100/100, LCP1899/1541/1606мс**, render delay11–32мс. Desktop100/LCP509мс. A100/SEO100; CLI BP77 связан с существующими сторонними аудитами Метрики, в публичном PSI BP100. Все запуски сохранены в `production-home-summary.json` и `production-home-ranges.json`; неудачные баллы не отбрасываются.

Товарная страница: отдельный CLI mobile100/LCP1093мс, desktop100/LCP379мс, A100/SEO100/BP77. По одному запуску каждого устройства, `production-product-summary.json` и `production-product-ranges.json`.

### Индексация и следующий этап

`indexnow/report.json`: 151 URL принят обоими получателями, HTTP 200. Приём уведомления не подтверждает обход, индексацию или трафик. Дальше оцениваются реальные показы, переходы и состав подборок. Наличие, условия поставщика, холодовая цепь и розничная фасовка остаются операционными вопросами модели из `../../research/suppliers-20261029/RETAIL-MODEL.md`.
