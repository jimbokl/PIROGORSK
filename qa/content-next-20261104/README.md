# Три новые статьи · QA 04.11.2026

Локально PASS: check (0 ошибок / 0 предупреждений), build (265 страниц),
SEO (260 URL sitemap / 154 товара), SEO map, 65 уникальных обложек,
66 Node-тестов. Контентная регрессия: 12 статей + 6 обновлённых владельцев,
90 просмотров на ширинах 320/390/768/1024/1280, без горизонтального переполнения.

| Новая статья | Слов | Контекстных ссылок | Источников | Вес обложки WebP |
| --- | --- | --- | --- | --- |
| Строганина | 1252 | 3 | 4 | 99 192 байта |
| Кухня Восточной Пруссии | 1232 | 4 | 4 | 82 878 байт |
| Сыры области | 1276 | 4 | 4 | 86 756 байт |

У всех трёх страниц HTTP 200, один H1/BlogPosting, собственный canonical,
короткие title/description, дата 04.11, один CTA, три загруженных изображения
с alt/размерами/srcset и подписями. Все локальные ссылки существуют.
Три обложки и шесть схем просмотрены; страницы просмотрены на телефоне,
планшете и desktop. Сводные изображения: local-contact-sheet.png,
local-desktop-sheet.png, diagrams.png. Машинный протокол: local-report.json.

[Описание выпуска и источники](../../research/content-next-20261104/RELEASE.md).
## Production

Runtime `0086e0e0fee80481b19eebb4f02e2b3b41d68649`,
[полный CI SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/41875477472),
завершён 04.11.2026 в 17:50 UTC. `ci.json` сохраняет результат всех шагов.

`production-report.json`: 12 статей + 6 обновлений, 90 просмотров на пяти
ширинах PASS, ошибок JavaScript и переполнения нет. Все изображения загрузились.
Новые страницы и схемы просмотрены на телефоне, планшете и desktop;
сводные снимки — `production-contact-sheet.png`, `production-tablet-sheet.png`,
`production-desktop-sheet.png`, `production-diagram-sheet.png`.

`live-readback.json`: три новые страницы HTTP 200, canonical и даты верны;
65 ссылок на статьи в журнале, 260 URL в sitemap, все три владельца найдены.
12 файлов обложек/схем/OG совпали с build по SHA256; девять внутренних
переходов из новых страниц HTTP 200. Production-release PASS.

`indexnow/report.json`: все 260 URL переданы, три новые статьи включены
в оба запроса. api.indexnow.org — HTTP 200; yandex.com — HTTP 202,
`received-key-validation-pending`.

Повтор проверки:

```sh
QA_BASE=https://pirogorsk.ru PIROGORSK_QA_OUTPUT=qa/content-next-20261104 node scripts/verify-content-month.mjs
node qa/content-next-20261104/verify-live.mjs 0086e0e0fee80481b19eebb4f02e2b3b41d68649
node scripts/verify-release.mjs published https://pirogorsk.ru/
```
