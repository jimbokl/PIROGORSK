# Месячный контент — QA

[Релиз и границы приёмки](../../research/content-month-202611/RELEASE.md), [карта 100 тем](../../research/content-month-202611/TOPIC-MAP.md), [календарь](../../research/content-month-202611/CALENDAR.md).

`check.log`, `build.log`, `final-checks.json` — финальная статическая/контентная приёмка. `unit.log`, `worker.log`, `tests.json` — 49 Node и Worker/API/SQL. `browser.log` — успешный полный браузерный прогон; `browser-build-race.log` — сохранённая первая остановка во время перезаписи сборки. `registry.log` — strict PASS, без drift.

`local-report.json` и `local-*.png` — шесть статей, две существующие страницы с обновлениями, 30 проверок ширины. `artwork-contact.png` — визуальная сверка оригинальных обложек. Снимки mobile/desktop и схемы просмотрены; исправлены остатки Markdown в лидах и alt.

Runtime `1b603f445730b6cb8335802c75f5dd0f5edc7cee`; [CI 41194878953 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/41194878953), полные статусы — `ci.json`. `publication.json`/`publication.log`: все ресурсы production (281), включая 254 HTML совпали с отдельно скачанным Pages artifact. `production-report.json`, `production-content.log` и `production-*.png`: 6 статей, 2 обновления, 30 проверок ширины PASS, ошибок консоли нет. `production-mobile-contact.png` и мобильная схема просмотрены.

Артефакт 216335641 байт получен частями через официальный GitHub Actions API; размер и ZIP CRC PASS (`artifact-parallel-download.log`). Первичная медленная последовательная загрузка остановлена после успешной загрузки по частям; её исходный пустой лог сохранён. Для воспроизведения: `gh run download 41194878953 -n github-pages`, затем `python3 qa/content-month-202611/verify-publication.py /path/to/artifact.tar 1b603f445730b6cb8335802c75f5dd0f5edc7cee 41194878953`. Сам архив находится вне репозитория. Скрипты только читают production; analytics/POST в content QA заблокированы.
