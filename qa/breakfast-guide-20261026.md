# Завтраки в Зеленоградске · редакционный протокол 26.10.2026

## Задача и самостоятельный интент

Статья `/journal/gde-pozavtrakat-v-zelenogradske/` отвечает на утренний сценарий: открытие до 09:00, окончание завтраков, формат и сумма на двоих. Существующий гид по кафе отвечает на обед/ужин для четверых; отдельная страница не создаётся только ради варианта ключа.

Основание: [сохранённый разбор запросов](../research/traffic/search-intent-20261026.json). В supplied Wordcraft есть отдельные формулировки про завтраки; оценки стороннего сервиса не являются посетителями Пирогорска. В выгрузке GSC **godune.ru**, строка «где позавтракать в зеленоградске» — 0 кликов / 7 показов / позиция 26.57 за указанные в выгрузке последние три месяца. Это другой сайт, не измерение частотности и не доказательство спроса на пироги. Файлы источников не изменялись; варианты запросов не суммируются как люди.

## Источники и доказанные факты

Проверены 26 октября 2026 года. Сайты могут менять цены и часы; материал показывает дату проверки, не личный опыт.

| Источник | Использовано | Ограничение |
| --- | --- | --- |
| [Завтра’К 7:45](https://zavtrak-7-45.clients.site/) | Большая Окружная 2Б, корпус 1; раскрывающееся расписание ежедневно 07:45–19:45; +7 911 468-44-92, навынос | Каталог цен не отобразился; график кафе не доказывает часы кухни |
| [Бранч на море](https://branchnamore.ru/#menu) | Пугачёва 4А; ПТ–ВС 09:00–21:00; изображение меню «готовим до 12:00»; блинчики 350 ₽, сырники 550 ₽, балтийский завтрак 790 ₽ | Не заявляем ежедневную работу или сумму с напитками |
| [Берег Моря](https://ghroyallions.ru/restaurants/bereg-morya/) | Гагарина 12Б; шведская линия ежедневно 07:00–11:00 для проживающих и внешних гостей; взрослый 2500 ₽, ребёнок 6–11 лет 1250 ₽; +7 905 241-14-15 | Обычные часы ресторана 12:00–23:00 отделены от завтрака; тарифы других возрастов не угадываем |

Скриншоты собственных сайтов: [расписание](screenshots/breakfast-guide-20261026/zavtrak-hours.png), [меню](screenshots/breakfast-guide-20261026/brunch-menu.png). Расчёты: 2×350=700; 2×550=1100; 2×2500=5000; 2×2500+1250=6250. Блюда и шведская линия не ранжируются как эквивалентные продукты. Вкус, посещение, рейтинги, наличие и срочная доставка не выдуманы. Пирогорск представлен как предзапуск; контакты посетителей и оплата не собираются.

## Графика

Инструмент: встроенный **ImageGen**. Один исходник 1536×1024, без изменений содержимого; изображение просмотрено. Это вымышленный стол у моря, не фотография названного заведения. На сайте используется общая подпись о генерации.

- Оригинал: `/Users/dmitrij/.codex/generated_images/01a167c6-1066-7432-b384-814320236427/exec-bc4dccbb-7d96-4194-b6b3-469643c94404.png`.
- Копия в проекте: `design/blog-source/zelenogradsk-breakfast.png`.
- OG: `public/seo/blog/gde-pozavtrakat-v-zelenogradske.jpg`, 1200×630, стандартное кадрирование/кодирование Sharp. Адаптивные AVIF/WebP — Astro.

### Промпт

```text
Use case: photorealistic-natural.
Asset type: original editorial cover for the Pirogorsk blog, article about where to have breakfast in Zelenogradsk on the Baltic coast.
Primary request: a beautifully composed natural breakfast still life by an open apartment window overlooking the Baltic sea, three small golden syrniki (cottage cheese pancakes), a little sour cream and blackcurrant preserve, one flaky croissant and two simple ceramic coffee cups on a weathered light oak table.
Scene/backdrop: quiet northern seaside morning, softly out of focus pale blue-grey sea and a small strip of beach beyond the window. An imagined scene, not any real cafe interior or a depiction of a named venue.
Style/medium: polished editorial food photography with tactile linen and glazed ceramics, candid natural texture rather than glossy advertising perfection.
Composition/framing: landscape 3:2, camera at a gentle three-quarter angle, food clustered within the middle 70% so the subject survives mobile crops; breathable negative space around the ceramics; no people.
Lighting/mood: fresh soft cool morning daylight with warm food highlights, restful coastal breakfast.
Color palette: deep Baltic navy linen, creamy ceramic, natural oak, pale sea blue, a small blackcurrant accent. No muddy olive.
Constraints: physically plausible food and tableware, two coffee cups only, no printed words, no logos, no signage, no watermarks. Do not depict or imply a real menu serving from a particular cafe.
```

## Редакторская проверка

Humanwriter: факты и расчёты сверены, личное посещение не имитируется, непроверенные цены не добавлены. Различия расписаний полезны для выбора времени; ссылки ведут на собственные сайты заведений. Статус **готово с оговоркой**: часы и тарифы сезонные, в тексте дана дата и предложена проверка перед визитом.

## Проверки и публикация

Astro/TS: 72 файла, 0 diagnostics. Build: 41 HTML. SEO: 39 sitemap URL / 2647 локальных ссылок / 8 концептов. Все 16 существующих tests PASS; shared registry strict PASS. UI: фактические 320/390/1280 px, ширина документа совпадает с viewport, таблица помещается; якоря section-0 и section-4 работают, новая карточка доступна с блога (11 материалов). Снимки в `screenshots/breakfast-guide-20261026/`. Перед первым замером viewport override не применился — сохранённый снимок переименован в local-1280, после повторного set размер 390 подтверждён через DOM; он не выдаётся за мобильный.

Локальный CLI Lighthouse 13.5: P/A/BP/SEO **100/100/100/100** на mobile и desktop; LCP1808/441мс, TBT0, CLS0. Локальный hostname исключает Метрику штатно; это не публичный PageSpeed. [Полный компактный результат](breakfast-lighthouse-20261026.json).

Опубликован runtime `f585200da33bd0941d959f587e17d6d9e88731b0`, [CI40337317191 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40337317191). Все шесть проверенных публичных ресурсов HTTP200 и побайтово совпадают с локальным build: главная, блог, статья, OG, sitemap и IndexNow manifest. [Production-проверка](breakfast-production-20261026.json), UI1280/390 без переполнения, обложка загружена. IndexNow [принял12 URL](breakfast-indexnow-20261026.json) с HTTP200, это не доказательство индексации.

Публичный [PSI dt2qwod6z3](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-gde-pozavtrakat-v-zelenogradske/dt2qwod6z3?form_factor=mobile), 26.10.2026 **16:16:19 Калининград**: P/A/BP/SEO100 на mobile и desktop. Видимые mobile FCP0.8с/LCP1.4с/TBT0/CLS0.005/SI0.8с; desktop0.3с/0.3с/10мс/0.004/0.4с. CrUX нет. Обычная конфигурация Метрики сохранена, URL PSI без QA-флага. [Компактные данные](breakfast-public-psi-20261026.json); снимки и видимый текст `screenshots/breakfast-guide-20261026/psi-*`. Это один новый публичный отчёт, отдельный от локального CLI и прежних проблем других страниц.

Верхний пирог сохранён с уже опубликованным центрированием. Внешних сообщений, платных размещений, backend-заявок и ложных целей не создавалось. 100 реальных внешних посетителей/день не доказаны; heartbeat не возобновлён.
