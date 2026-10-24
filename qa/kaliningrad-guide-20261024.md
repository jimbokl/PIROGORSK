# Гид Калининграда · 24.10.2026

Статус: опубликован и независимо проверен на production; официальный PSI mobile 91 / desktop 100.

## Содержание и источники

- Статья `/journal/gde-poest-v-kaliningrade/`: семейный обед в центре, два места у площади Победы/зоопарка, формат зала/готовой еды/самовывоза/доставки не смешан. Около 900 слов с оглавлением и таблицей.
- Первичные страницы повторно прочитаны через web 24.10: https://borshsalo.ru/menu/hits/ , https://borshsalo.ru/contacts/ , https://patisson-markt.ru/ , региональный ТИЦ https://visit-kaliningrad.ru/food/restoran-patisson-markt/ . Ссылки стоят рядом с фактами.
- Борщ 435 ₽ и котлета 619 ₽ взяты из меню доставки; 2 × 435 + 2 × 619 = 2 108 ₽. Четыре блюда, не комплекс на четверых; напитки и получение не включены.
- Патиссон: сайт принимает только самовывоз с пл. Победы, 4, 11–21. Цена бургера 597 ₽ / 750 г не переносится на линию самообслуживания или зал.
- Нет выдуманного посещения, оценок, отзывов и обещаний текущей доставки Пирогорска.
- Добавлены категория Калининград, ссылка с городской страницы, переходы к двум прибрежным гидам, порциям и калькулятору. Убрано повторение одного материала в блоке связанных статей.

## Графика

ImageGen создал оригинальную обложку: `/Users/dmitrij/.codex/generated_images/01a167c6-1066-7432-b384-814320236427/exec-e89205a8-ae2d-4ca3-a1a1-eec5dbea368f.png`. Копия `design/blog-source/kaliningrad-lunch.png`, 1536×1024; OG `public/seo/blog/gde-poest-v-kaliningrade.jpg`, 1200×630.

Задание: premium editorial food photograph-style illustration, relaxed family lunch in central Kaliningrad, landscape 3:2, pale warm limestone table by softly lit window, sage linen/cream ceramics, bowl of borscht and golden breaded herb chicken cutlet with potatoes/cabbage salad, second setting partly visible; blurred brick/greenery without recognizable landmark or real restaurant interior; no people/hands/text/logos/watermarks/collage.

Визуально просмотрена: читаемая еда, спокойный свет, единая балтийская палитра. Подпись на странице прямо обозначает ИИ-иллюстрацию, не фото заведения. Web-форматы и размеры генерирует Astro; PNG не отдаётся посетителю.

## Локальная проверка

- Astro/TS 64 files: 0 errors / warnings / hints (`/tmp/pirogorsk-kal-final-check.log`).
- Build 38 HTML (`/tmp/pirogorsk-kal-final-build.log`); SEO 36 sitemap URL / 2324 local references / 7 concepts (`/tmp/pirogorsk-kal-final-seo.log`).
- 14 Node tests PASS (`/tmp/pirogorsk-kal-tests.log`).
- UI 1280×900, 390×844 и таблица 320×740: overflow отсутствует, hero загружен, оглавление ведёт к нужному разделу, новая рубрика ведёт к статье. Заголовок колонки сокращён до «Порций» для узкого экрана.
- Снимки: `kaliningrad-desktop-20261024.jpg`, `kaliningrad-mobile-20261024.jpg`, `kaliningrad-table-320-20261024.jpg`, `blog-kaliningrad-mobile-20261024.jpg`.
- Worker/D1/цели/сбор контактов не изменялись.

## Production и поисковое уведомление

- Релиз `80e61827eb5a7f29a6187d79094d03427e0ea4dc`, [CI 40116892879](https://github.com/jimbokl/PIROGORSK/actions/runs/40116892879) SUCCESS.
- Независимые GET новой статьи, `/blog/`, `/dostavka/kaliningrad/`, `/sitemap.xml`, `/indexnow-manifest.json`: HTTP 200. Canonical точный, AI-подпись присутствует; ссылки на статью есть на витрине и городской странице. Sitemap содержит 36 URL, manifest содержит новую статью.
- IndexNow HTTP 200 / 4 изменённых URL / 24.10 17:40:16 UTC. Артефакт `indexnow-kaliningrad-20261024.json`; принятие уведомления не доказывает индексацию.
- Production просмотрен в браузере: `kaliningrad-production-20261024.jpg`.
- Официальный [PSI](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-gde-poest-v-kaliningrade/yk9qma3xyb?form_factor=mobile), 24.10 19:42:09 Europe/Kaliningrad: Performance mobile 91 / desktop 100, остальные три категории 100 на обоих. Снимки в `screenshots/psi-kal-{mobile,desktop}-20261024.jpg`; метрики и LCP — PERFORMANCE.md. CrUX без данных.
