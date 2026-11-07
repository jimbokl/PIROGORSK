# CI-03 — контрольная повторная публикация

Проверяется загрузка готового артефакта, его происхождение, Pages REST/Actions OIDC, ожидание завершения, Worker/Pages compatibility и IndexNow. Никакой повторной сборки и изменения runtime. Старый неуспешный источник не используется: он откатил бы новые статьи.

Источник: [Deploy Pages 42341955531](https://github.com/jimbokl/PIROGORSK/actions/runs/42341955531), SHA `782e750ff4f31fc6e8b1ba3dcab3a72a8341fd57`, artifact `13562727503`, digest `sha256:d38e6535041167050416b87d6afc5123a12a209d6ae5fa5c4058b8fa549a4f2b`.

`drill=true` допускает успешный источник только после тестов и production compatibility. Без флага остаётся исходная ветка failed-publication recovery. Общая проверка не допускает изменения сайта между проверенным источником и workflow, истёкший артефакт или несовпадение попытки/SHA/digest.

Локальные проверки: `node --test .github/scripts/recover-pages.test.cjs` — 7 PASS; `actionlint .github/workflows/recover-pages.yml`, `node --check`, Worker compatibility — PASS. Реальный прогон завершён успешно; результат ниже.

Production readback использует SHA256 шести HTML/восьми assets из принятого спринта f, проверяет 14 внутренних ссылок, release, блог82 и sitemap277. Байты проверяются заново; визуальный повтор не требуется для неизменённого артефакта. [Исходный протокол](../sprint-20261107f/README.md).

Основной API соответствует [реализации actions/deploy-pages v5](https://github.com/actions/deploy-pages/blob/v5/src/internal/api-client.js). Причина исторического timeout 42329859038 не объявляется установленной.

## Реальный прогон и приёмка

[Recover Pages42344310031 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/42344310031), workflow `a4f90c5f322f625266c93d00d1f44d327dc62414`. Проверка источника, скачивание/распаковка сохранённого артефакта, Worker, Pages, production compatibility и IndexNow — success. Pages `deployment_in_progress`→`succeed`, завершён **07.11.2026 05:50:06UTC**. IndexNow корректно `unchanged`, ноль повторных отправок.

До/после публикации шесть HTML и восемь assets совпали с принятым спринтом f по SHA256; 14 внутренних ссылокHTTP200, release, блог82 и sitemap277 неизменны. Независимый повтор `node scripts/verify-release.mjs published https://pirogorsk.ru/` — PASS. Лента/154 SKU/цены/runtime сохранены; визуальная приёмка неизменённых байтов остаётся подтверждённой спринтом f.

Доказательства: `ci-success.json`, `evidence/.pages-recovery.json`, `evidence/.indexnow/report.json`, `before-drill.json`, `after-drill.json`, `worker-after.log`, `unit.log`, `registry-strict.json`. CI-03 закрыта для проверенного пути повторной публикации артефакта. Это успешный drill текущей версии, а не повтор старого failed-source: старый артефакт откатил бы статьи. Исторический timeout не объявляется исправленным или объяснённым.
