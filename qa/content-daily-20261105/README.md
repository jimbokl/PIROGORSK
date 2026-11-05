# Ежедневная статья · 05.11.2026 · A6-9

[Живая статья](https://pirogorsk.ru/journal/hleb-i-vypechka-kaliningradskoy-oblasti/) — опубликована и проверена.
Runtime `92205ea56e6a1775806994d74f54becdbde8c632`; [CI SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/41993220307).

Локально PASS: `npm run check` (0 ошибок / 0 предупреждений), `npm run build`,
`verify-seo.mjs`, `verify-seo-map.mjs`, `verify-article-artwork.mjs`, `npm test`
(66 тестов). Shared skill registry `check --strict`: exit 0.
`PIROGORSK_QA_OUTPUT=qa/content-daily-20261105 node scripts/verify-content-month.mjs`:
95 просмотров, 13 новых статей и 6 обновлений, ошибок нет.
[Локальный отчёт](local-report.json).

Production: та же команда с `QA_BASE=https://pirogorsk.ru`, 95 просмотров PASS.
[Отчёт](production-report.json). Телефон 390, планшет 768, desktop 1280,
обложка и схема просмотрены. Таблица: пять строк совпадают с исходным текстом;
на телефоне часы доступны горизонтальной прокруткой внутри блока.
[Детали](live-detail.json), снимки `production-bread-table-*.png`.

`node qa/content-daily-20261105/verify-live.mjs 92205ea56e6a1775806994d74f54becdbde8c632`: HTTP 200, текст/дата/canonical,
4 совпавших SHA256 ресурса, 4 внутренних перехода HTTP 200, 66 статей в журнале,
261 URL в sitemap, точный commit успешного CI. [Read-back](live-readback.json).
`node scripts/verify-release.mjs published https://pirogorsk.ru/`: PASS.
[Состояние CI и все шаги](ci-result.json).

[IndexNow artifact](indexnow/report.json): 261 URL, новый адрес включён;
api.indexnow.org — 200, yandex.com/indexnow — 200, `received-by-all`.
Проверка завершена 2026-11-05T10:49:21.851678+02:00.
