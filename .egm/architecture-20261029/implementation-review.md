# Независимое сокращённое ревью реализации: архитектура Пирогорска

Дата: 2026-10-29. Область: актуальная реализация release contract/checks и browser QA по плану `docs/designs/architecture-improvements-20261029.md`. Проверенные роли: Design (соответствие плана и целевому поведению), Implementation readiness (исполняемость релизной проверки), Codebase grounding (источники, бандл, Worker, тесты и CI). Это самостоятельное чтение автора отчёта; отдельные Goldfish-ревьюеры не запускались по прямому указанию не делегировать.

## Проверенная версия

- Репозиторий: `/Volumes/DevSim/Projects/PIROGORSK`
- HEAD: `ed3fc038b784d69812a70568d0c7547015b5c166`
- Рабочая копия содержит изменения и новые файлы; статус Git включал все девять файлов целевой области как изменённые или неотслеживаемые.
- SHA-256 целевых файлов (содержимое на момент чтения):

| Файл | SHA-256 |
|---|---|
| `src/data/catalog-contract.ts` | `629bc17e1be5b8008eae961695da5c0536629b550ff567a45104502b8afa1178` |
| `scripts/verify-release.mjs` | `41d7a6a5a340792cbe7e391a59102db8d2710c25361f26ab851c8b522d19c415` |
| `scripts/release.test.mjs` | `6a53a066348e8637114996ccc9ea99d2dc4c327c1d188e0006ae28545d6fce5c` |
| `worker/src/index.ts` | `7dbab47e7e63ec69557c07df3baa9e8da7ea5c1db62f93127edd1150fc04a7bf` |
| `worker/scripts/bundle.mjs` | `6e31e66ecdd049d5634aa30cfebc3443b305748ff406506410d19df6b5cab9fe` |
| `worker/scripts/qa-site.mjs` | `d275f901162cfa4ab82d02f40a3d2c74ce53ce264e7209dec46627ab717a08fd` |
| `worker/tests/interest.test.mjs` | `028fec338d949180e380da4697a58567c141e58c5b3696e4fbb92f72bf9fa9ed` |
| `package.json` | `27d524915378fcc42644deaf1f2bf47ce30640261d41811e3c321323e0b57901` |
| `.github/workflows/pages.yml` | `02de99ff07fe72318409b4a0affac643c4a86668b02fefd53fd19f1b73702690` |

Tracked-only Git diff SHA-256 for the two tracked files among the target set (`.github/workflows/pages.yml`, `package.json`, `worker/scripts/bundle.mjs`, `worker/src/index.ts`, `worker/tests/interest.test.mjs`): `2e592dbcb940adcdf05af2ae179b52423daf1a2cf18b24731f763d79c64b34ca`. This hash excludes untracked files; per-file hashes above cover every target source.

## Результат ролей

| Роль | Статус | Версия | Проверенные источники | Пробелы |
|---|---|---|---|---|
| Design | completed | указанный HEAD + локальные файлы по SHA-256 выше | архитектурный план, contract, release verifier, Worker health/POST, QA site | Не выполнялась проверка production; production не запускался. |
| Implementation readiness | completed | та же | `verify-release.mjs`, `release.test.mjs`, `pages.yml`, `package.json` | Не запускалась публикация. |
| Codebase grounding | completed | та же | все девять целевых файлов; тесты ниже | Браузерный сценарий не запускался в этом проходе; реализацию сценария прочитал статически. |

## Существенные замечания

Нет подтверждённых существенных actionable findings (Blocker/Major) в проверенной области. ID IMPL-1-NN не присваивались, поскольку замечаний нет.

Подтверждения ключевых контрактов:

- Каталог канонизируется в `src/data/catalog-contract.ts`; и manifest, и Worker импортируют один сериализатор. `worker/scripts/bundle.mjs` встраивает исходный каталог отдельно от серверной проекции цен, поэтому `serializeCatalog()` получает тот же набор `id`, `value`, `price`, что и локальная сборка.
- `/health` оставляет `ok/storage/mode`, добавляет версию API и SHA-256, продолжает отвечать 503 при недоступной D1. Ветка POST сохранена: проверяет прежний payload, возвращает `saved: true` с прежним UUID, а транзакция и серверная цена остаются на месте (`worker/src/index.ts`).
- `verify-release.mjs` ограничивает endpoint pathname `/api/interest`, строит GET к `/health`, убирает query/hash, проверяет D1/intent и оба отпечатка; published-проверка сверяет также отданный Pages `release.json`. Негативные тесты покрывают несовпадение, 503, некорректный JSON и timeout.
- Workflow запускает release check до upload/deploy; опубликованная пара проверяется после deploy до IndexNow. Browser QA подключён к `test:browser`, который включён в Pages workflow; QA site изолирует заявочные данные в SQLite in-memory, перехватывает Metrica и блокирует прочие внешние источники. Сценарий содержит переход статья → подборка → форма → Worker/SQLite и размеры 320/1280 px.

## Выполненные проверки

- `npm test` — PASS, 29/29 тестов, включая release tests.
- `node worker/scripts/verify.mjs` — PASS: Worker typecheck, browser script typecheck и API/SQL integration tests.
- `worker/scripts/qa-site.mjs` и полный `test:browser` в этом проходе не запускались; для браузерного сценария выполнен статический разбор исходника. Поэтому отчёт не утверждает, что браузерная проверка фактически прошла.

Проверка локальная. Она не подтверждает состояние Worker/Pages в production и не выполняла deploy.

## Addendum — 2026-10-29

Повторно проверен актуальный `worker/scripts/qa-site.mjs` после уточнений. SHA-256 текущей версии: `9c05dc4f614519da7e25ff7917eab19baa90977adc003dea198139ded472ed28` (заменяет его прежний хеш из таблицы версий выше; прочие зафиксированные исходники не пересматривались).

Уточнённые детали подтверждаются кодом: в начале smoke фактический health встроенного Worker сравнивается с `releaseManifest()`; запросы `data:` продолжаются через `request.continue()`; ожидаемый город берётся из `city` transfer URL и затем сверяется со значением в форме. Статья выбирает Зеленоградск, согласно уточнению автора основной проверки.

Новый статус браузерной проверки: родительский ревьюер сообщил, что `npm run test:browser` и `check101` завершились успешно, 0 diagnostics, на Node `24.22.2`. Эти проверки не запускались повторно в рамках данного addendum; статус основан на переданном результате. До addendum браузерный сценарий был проверен статически. Production и deploy по-прежнему не затрагивались. Существенных findings нет.
