# Месячный контент — QA

[Релиз и границы приёмки](../../research/content-month-202611/RELEASE.md), [карта 100 тем](../../research/content-month-202611/TOPIC-MAP.md), [календарь](../../research/content-month-202611/CALENDAR.md).

`check.log`, `build.log`, `final-checks.json` — финальная статическая/контентная приёмка. `unit.log`, `worker.log`, `tests.json` — 49 Node и Worker/API/SQL. `browser.log` — успешный полный браузерный прогон; `browser-build-race.log` — сохранённая первая остановка во время перезаписи сборки. `registry.log` — strict PASS, без drift.

`local-report.json` и `local-*.png` — шесть статей, две существующие страницы с обновлениями, 30 проверок ширины. `artwork-contact.png` — визуальная сверка оригинальных обложек. Снимки mobile/desktop и схемы просмотрены; исправлены остатки Markdown в лидах и alt.

После CI: `publication.json` сравнит production с отдельно скачанным Pages artifact, `production-report.json` и `production-*.png` подтвердят фактический текст, изображения и адаптивность опубликованных страниц. Скрипты только читают production; analytics/POST в content QA заблокированы.
