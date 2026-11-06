# Дополнительный спринт · 06.11.2026 · третий выпуск

## Изменения

A6-19 / CNT-08: «Куршская ворона и другие названия в меню Калининграда».
Один новый владелец, imagegen-обложка, две схемы, две таблицы, три первичных
источника и перелинковка. Статья отделяет историю Заркау от современного
меню; доступность блюда из вороны не утверждается. Блог 72 → 73 статьи,
273 HTML / 268 sitemap URL. Ежедневная автоматизация и её ledger не менялись.

Лента, 154 SKU, варианты/цены, CRM и контакты не менялись. Дополнительной
полировки карточек в этом выпуске нет: UX-25 уже опубликована и проверена
в предыдущем выпуске `6e14092d4154cc18036ebc2bc11bdf256e76dedb`.

## Локальная приёмка

- Astro check: 583 файла, 0 errors/warnings, 104 hints; build PASS.
- 66 unit tests; Worker/browser script typecheck, API/SQL integration PASS.
- SEO: 273 HTML, 154 товарные страницы, 268 sitemap URL.
- SEO map: 268 owners, 73 article routes, глубина не больше двух переходов.
- Artwork: 73 уникальные исходные сцены; product pages/backdrops PASS.
- Контент: 100 тем в карте, 20 новых статей и 6 обновлённых владельцев;
  130 просмотров на 320/390/768/1024/1280. Проверены metadata/canonical/
  schema, слова/содержание/источники, 3 изображения, подписи и переходы.
- Визуально просмотрены новая статья на 390/768 px и схема на 390 px.
- Найден и исправлен дубль рекомендации в SEO-map; интегратор теперь
  сохраняет уникальные направления. После исправления build/SEO/content PASS.

## QA-17 · открыта

Один исходный прогон и восемь стресс-повторов на 320 px / CPU×4: девять
PASS, 126 точных сравнений подборки и 45 товарных просмотров. Проблема
холодного CI не воспроизведена, причина не установлена. Это не исправление
дефекта. Код сайта, физические клики и строгость сравнения не менялись.
Сценарий: `qa/catalog-click-20261106c/reproduce.mjs`; восемь проходов
с трассами — `qa/catalog-click-20261106c/reproduction-cpu4.json`.

## Публикация

CI [42241913842](https://github.com/jimbokl/PIROGORSK/actions/runs/42241913842)
**SUCCESS**, runtime `cb98837438c91a260c7c0b1ec671353175dcf029`.
Полная CI browser/site/UX/occasion, journal/bundle/picnic/catalogue/gallery/
control-name регрессия и published Pages/Worker compatibility PASS.

Production readback `2026-11-06T15:43:35.919Z` — **PASS**:

- Новая статья HTTP 200, title/canonical/datePublished соответствуют сборке.
- 73 статьи в хабе, 268 URL в sitemap; новый URL присутствует в обоих.
- Четыре image assets побайтно совпали со сборкой (SHA256), четыре
  внутренних направления HTTP 200, release manifest совпал.
- 130 production viewport checks: 20 новых статей месячного плана + шесть
  обновлённых владельцев × 320/390/768/1024/1280.
- Опубликованная новая статья на 390/768 px и схема на 390 px просмотрены.
- QA-17 в этом CI не повторилась; задача остаётся открытой.

[CI](ci-success.json), [readback](live-readback.json),
[контент](content-production/production-report.json),
[телефон](content-production/production-kurschskaya-vorona-i-menyu-390.png),
[планшет](content-production/production-kurschskaya-vorona-i-menyu-768.png).
Новый Lighthouse не запускался. Формы production не отправлялись.

Источники и редактура: [brief](../../research/content-sprint-20261106c/README.md).
Промпт и исходник: [imagegen](../../research/content-sprint-20261106c/PROMPTS.md).
