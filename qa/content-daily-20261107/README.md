# Ежедневная статья · 07.11.2026 · A6-17

[Живая статья](https://pirogorsk.ru/journal/kopchenie-na-sosnovyh-shishkah/) — опубликована и проверена.
Runtime `5d60c7add3c1d5b74f8a182736927989307f1147`; [CI SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/42354736410).
Pages 2026-11-07T08:36:16Z; проверка завершена 2026-11-07T10:42:56.049585+02:00.

Локально PASS: check (0 ошибок/предупреждений), build (283 страницы),
SEO/map (278 URL, 83 статьи), artwork (83 сцены), Node (66 тестов),
shared registry strict (passed=true, errors=0, drift=false).
Content month — 30 новых месячных статей + 8 обновлений / 190 просмотров.
[Локальный отчёт](local-report.json), [проверка таблиц](local-detail.json).

Первый проход из общей рабочей папки остановился на девятом, ещё не
опубликованном обновлении: [диагностика](production-update-diagnostic.json),
[первый лог](production-content-first.log). Отдельный проход прервался
с EncodingError изображения: [лог](production-content-decode.log);
полный повтор без изменения assertions PASS, причина сбоя не установлена.
Ожидания зафиксированы на runtime
SHA: [семь входных файлов](production-inputs.json). Повтор:
`QA_BASE=https://pirogorsk.ru node qa/content-daily-20261107/verify-deployed-content.mjs 5d60c7add3c1d5b74f8a182736927989307f1147` —
190 просмотров PASS. [Отчёт](production-report.json). Новая статья:
320/390/768/1024/1280, без переполнений, изображения загружены.
Телефон 390, планшет 768, desktop 1280, обложка и схемы просмотрены.
`QA_BASE=https://pirogorsk.ru node qa/content-daily-20261107/verify-detail.mjs` —
четыре ширины, дата, две таблицы и клавиатурная прокрутка PASS.
[Детали](production-detail.json); снимки `production-detail-*.png`.

`node qa/content-daily-20261107/verify-live.mjs 5d60c7add3c1d5b74f8a182736927989307f1147` —
HTTP 200, текст/дата/canonical, 4 совпавших WebP/JPEG SHA256 ресурса,
5 внутренних переходов HTTP 200, 83 статьи / 278 sitemap URL,
точный SHA успешного CI. [Read-back](live-readback.json).
`node scripts/verify-release.mjs published https://pirogorsk.ru/` — PASS.
[CI и все шаги](ci-result.json).

[IndexNow](indexnow/report.json): 278 URL, статья включена;
api.indexnow.org — 200, Яндекс — 200, received-by-all.
[Протокол](../../research/content-daily-20261107/RELEASE.md).
