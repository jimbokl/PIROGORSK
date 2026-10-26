# Доставка еды в Зеленоградске — редакционный протокол

## Задача
Самостоятельный ответ на намерение «доставка еды Зеленоградск»: действующие внешние меню, проверка адреса и итоговой суммы, заказ в апартаменты. Новая страница не является доказательством роста. Пирогорск пока собирает анонимный интерес, не принимает реальные заказы.

## Источники, 26 октября 2026
- https://restoran-oblaka.ru/dostavka — разделы меню; 300 ₽ при заказе до 2500 ₽, бесплатно от 2500 ₽; приём заказов ежедневно 12:00–21:00. В футере и на /contacts ресторан указан ПТ–ВС 12:00–23:00. Несогласованность явно сохранена в тексте; ежедневная работа не обещается.
- https://restoran-oblaka.ru/contacts — адрес Гагарина 2Г (2/1), ПТ–ВС; отдельная ссылка рядом с оговоркой.
- https://granaat.qr-cafe.ru/delivery — собственное меню кафе «Гранат», Крымская 5, доставка по Зеленоградску и самовывоз. В форме показан минимум 1000 ₽; фиксированный тариф и срок не найдены. Минимум привязан к дате проверки.
- https://yandex.ru/legal/termsofuse_eda/ru/ — п. 2.10 о доступности по адресу, п. 3.6 о минимуме, п. 3.7 об ориентировочном времени. Городская витрина дана как начало проверки адреса, не гарантия покрытия. Её автоматическое чтение вернуло Bad Request.
- Park House не включён: официальный сайт вернул timeout. PlushkinDelivery исключён: главная относится к Санкт-Петербургу; сниппет с Зеленоградском нельзя переносить в гид.

## Голос и проверка
Редакция Пирогорска, туристы в съёмном жилье. Задача — выбрать способ заказа и избежать ошибки с адресом/суммой. Нет личного опыта, рейтинга, комиссий, гарантий скорости, партнёрских отношений или неподтверждённых блюд. Таблица объясняет различия способов заказа; арифметический пример условный. Источники привязаны к разделам. Статус: READY WITH CAVEAT — расхождение часов «Облаков» указано читателю.

## Обложка
Built-in image_gen, новая редакционная иллюстрация, не фотография заведений. Исходник: `design/blog-source/zelenogradsk-delivery-supper.png`; OG: `public/seo/blog/dostavka-edy-v-zelenogradske.jpg`. Подпись ИИ и alt предусмотрены шаблоном.

Промпт:
```text
Create a premium editorial food photograph for Pirogorsk, a Baltic coast food journal. Landscape 3:2 composition, 1536x1024. A calm rented holiday apartment dining nook after a seaside walk: on a warm oak table sit an unbranded open kraft paper delivery bag, neatly opened plain recyclable takeaway boxes with a generous vegetable salad and roasted potatoes, a small golden savory pie with one wedge cut, two off-white ceramic plates, forks and folded navy linen. A glass bottle of berry drink without a label. Through the softly out-of-focus window: Baltic sea, pale sky, a hint of red tiled roofs, no identifiable building or real restaurant. Natural overcast coastal afternoon light from the left, realistic appetizing food textures, elegant warm ivory / deep navy / muted sea blue palette, tasteful magazine photography, restrained lived-in atmosphere. Main food and packaging in the central 75% so a 1200x630 crop stays useful. Distinct from a restaurant plated meal photo: the subject is a delivered supper being unpacked in an apartment. No people, no hands, no readable text, no lettering, no logos, no fake interface, no courier brand, no watermark. This is a general editorial illustration, not a photo of any named restaurant or actual products.
```

## Проверки выпуска
- Astro check: 70 файлов, 0 ошибок / предупреждений / hints; TypeScript PASS.
- Build: 40 HTML; SEO verifier: 8 product concepts / 38 sitemap URL / 2592 local references PASS.
- Существующие 14 тестов (analytics, planner, IndexNow) PASS. Registry strict: passed=true, hasDrift=false.
- CUA UI: фактические ширины 320/390/1280 px, scrollWidth равен ширине, таблица помещается. Оглавление переходит к #section-0, ссылка расчёта открывает /podbor/. Снимки: qa/screenshots/delivery-guide-20261026/.
- Локальный CLI Lighthouse: Performance 100 mobile / 100 desktop, Accessibility и SEO 100; Best Practices 77 в обоих режимах из-за third-party cookies / Issues Яндекса. Интеграция Метрики не изменялась. Это не публичный PSI. Числа: qa/traffic-20261026/delivery-local-lighthouse.json.
- Runtime `e4f5bf41038adeca26465948201e6ac019c90492` опубликован; CI40325343926 SUCCESS. Production HTML новой статьи, блога, гида по кафе, главной, OG и sitemap — HTTP200 и побайтовое совпадение со сборкой: `qa/traffic-20261026/delivery-production.json`.
- Production CUA: 1280 и390 px, scrollWidth совпадает с шириной; таблица354 px при390. Снимки `production-1280.png` / `production-390.png`. После resize снимок сохранён отдельным вызовом, временный viewport сброшен.
- IndexNow HTTP200, 12 изменённых URL, включая статью; не подтверждение индексации. `qa/traffic-20261026/delivery-indexnow.json`.
- Публичный PSI1eu8qmvnk3 от26.10 14:53:11 Калининград: mobile89 / desktop98; A/BP/SEO100. Mobile LCP3486мс / TBT26мс / CLS0.09; desktop LCP327мс / TBT28мс / CLS0.088. CrUX нет. В mobile аудит отмечает смещение `article.blog-article`, render delay1000мс; точная причина не установлена, исправление не заявляем. Числа, полный видимый текст и снимки сохранены в `qa/traffic-20261026/delivery-public-psi.json`, `delivery-psi-*-initial*.txt` и папке снимков.
- Новая CLI-трасса блога не воспроизвела public render1980мс: render2.92мс / LCP1575мс. Публичный PSI блога остаётся88/100. Санитизированная выжимка: `qa/traffic-20261026/blog-trace-summary.json`.
- Рост посещений новым выпуском не подтверждён. Метрика/формы/backend не менялись, тестовых намерений и внешних размещений не создавали. Heartbeat не восстанавливался.

