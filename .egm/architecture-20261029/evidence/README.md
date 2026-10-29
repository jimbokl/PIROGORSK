# Проверка архитектурного выпуска — 29.10.2026

Runtime `e3cbdafead3dc45b6ade36c0b1155fe96d05c157`, Worker `e3d63b59-872f-4f7c-8425-562f38f15cb0`. [GitHub Actions 40829728685 — SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40829728685), завершён в 06:37:40 UTC / 08:37:40 Калининград. Последующий коммит только документации и свидетельств не меняет опубликованный код.

| Проверка | Результат | Свидетельство |
| --- | --- | --- |
| Локальные Node-тесты | 29/29 PASS | [node-tests.log](node-tests.log) |
| Worker/API/SQLite/typecheck | PASS | [worker-tests.log](worker-tests.log) |
| Chrome на Node24.22.2 | старая fixture + готовый Astro 320/1280 PASS | [node24-browser.log](node24-browser.log) |
| CI | check, build, 4 SEO-валидатора, Node, Worker, browser, release gates, Pages — SUCCESS | [ci-run.json](ci-run.json) |
| Worker | deploy и health: D1, API v1, catalog SHA совпали | [worker-release.json](worker-release.json), [worker-health.json](worker-health.json) |
| Рабочая D1 | read-only schema/index baseline совпал с 0001; migration history отсутствует | [d1-baseline.json](d1-baseline.json) |
| Production readback | 74/74 HTTP200 и точные SHA-256 сборки | [production-readback.json](production-readback.json) |
| Опубликованные Pages + Worker | совместимые API/catalog | [published-check.log](published-check.log) |
| IndexNow | unchanged, 0 отправок | [indexnow-report.json](indexnow-report.json) |
| Публичный CLI Lighthouse | P99 mobile / P100 desktop; BP77 из-за сторонних аудитов | [performance-summary.json](performance-summary.json) |

Readback выполнен в 06:37:53 UTC: все 69 файлов HTML из `site/`, плюс `robots.txt`, `sitemap.xml`, `indexnow-manifest.json`, `release.json` и файл IndexNow-ключа. Для каждого сохранены HTTP status и ожидаемый/полученный SHA-256 тела ответа. Локальный `site/` собран из runtime commit выше. Manifest IndexNow сгенерирован штатным `node scripts/indexnow.mjs manifest`. Чтение production — GET; реальные заявки и цели Метрики в этом спринте не отправлялись.

Независимая повторная проверка совместимости: `node scripts/verify-release.mjs published https://pirogorsk.ru/` после сборки из указанного commit. Это проверка текущего состояния, не гарантия от последующего независимого Worker-релиза. Browser smoke исполняет настоящий Worker bundle и миграцию в SQLite в памяти с перехватом сетевых запросов; он не заменяет проверку подключения рабочей D1, которую подтверждает live health.

Индексация, поисковые клики и покупательский спрос этим выпуском не подтверждаются. PSI и CLI Lighthouse различаются: причина исторического PSI86 главной остаётся открытой, свежий CLI её не воспроизвёл. [Оставшиеся задачи](../../../RECAP.md), [архитектурный план](../../../docs/designs/architecture-improvements-20261029.md).
