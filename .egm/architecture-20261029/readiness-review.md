# Readiness review — architecture-improvements-20261029

- **Статус:** completed (сокращённый независимый проход: Implementation readiness, Codebase details, Style; область Detailed Implementation Plan и Приёмка, архитектура — контекст).
- **Версия документа:** SHA-256 `08edf90ae957351bb71c65b34dc71e839a006a7e9de53f5ac62d5d87c6f17caa`.
- **Основа исходников:** HEAD `ed3fc038b784d69812a70568d0c7547015b5c166`; рабочее дерево уже содержит посторонние незакоммиченные `.egm/`, `docs/`, `research/content-strategy-20261026/`. Код и план не менялись.
- **Итог:** 1 замечание Major, 0 Blocker, 0 Nit. Проверка статическая; команды выпуска, миграции, CI и браузера в этом ревью не запускались.

## Краткие пересказы для проверки понимания

**Что предлагается.** План усиливает путь выпуска Pages и Worker: запускает существующие backend/browser проверки в CI, сравнивает отпечаток каталога из build manifest с публичным `/health`, и добавляет браузерный проход по готовым страницам до отправки анонимного интереса в локальные Worker/SQLite. Параллельно оформляет D1 runbook, обновляет checkpoint/README/состояние сборки и повторяет диагностику Lighthouse с датированными свидетельствами.

**Как работает текущая система по документу.** Astro собирает статический сайт, который публикуется GitHub Pages; клиентские скрипты передают анонимную подборку в Cloudflare Worker, который проверяет её, сам рассчитывает цену и атомарно пишет её в D1 с идемпотентностью и ограничением частоты. Worker выпускается отдельно, тогда как Pages workflow сейчас проверяет сайт и публикует Pages; существующая браузерная fixture проверяет форму и Worker bundle, но не переход по собранным страницам. Схема D1 применялась вручную, и состояние истории Wrangler migrations в checkpoint не установлено.

## Замечания

### I-1-01 — Major — A3 / миграционный baseline

- **Место:** Detailed Implementation Plan, §4, шаг 4, строка 85; связанный контекст: § «Подтверждённые пробелы», A3 (строка 43).
- **Наблюдение:** план требует включить в новый `worker/RELEASE.md` «процедуру установления baseline без повторного выполнения `0001`», но не указывает, какой конкретно процесс/команда устанавливает baseline и как удостовериться, что он безопасен для уже существующей вручную созданной схемы.
- **Доказательство:** `worker/CHECKPOINT.md:7` говорит, что схема была применена через D1 Console, а история Wrangler migrations остаётся неподтверждённой; повторный запуск начальной CREATE TABLE миграции прямо запрещён checkpoint. `worker/migrations/0001_interests.sql:1-30` содержит CREATE TABLE для обеих таблиц и CREATE INDEX, поэтому её повторное применение к уже существующим объектам может завершиться ошибкой. `worker/wrangler.jsonc:10-13` задаёт binding D1 и migrations_dir, но не содержит подтверждения migration history.
- **Последствие:** исполнитель не может завершить runbook или безопасно отметить baseline установленным, опираясь только на описанный шаг; выбор механизма останется незафиксированным, а ошибочное повторное применение способно сорвать релиз/проверку.
- **Рекомендация:** добавить в план требование указать точную поддерживаемую процедуру baseline для уже существующей схемы и условия её выполнения после read-only сверки таблиц и migration history; если достоверная история недоступна, явно описать безопасное состояние и критерий остановки, не предлагая исполнять `0001` повторно.
- **Уверенность:** высокая для пробела спецификации; пригодность конкретного инструмента baseline намеренно не утверждается, поскольку внешние источники по условию ревью не использовались.

## Проверка codebase details

Подтверждены существующие пути/контракты, относящиеся к шагам плана:

- `package.json` уже содержит Node 24 совместимый проектный набор, но не команды для Worker/browser проверок; lockfile содержит `puppeteer-core@25.16.0`, а `worker/scripts/qa-browser.mjs` уже импортирует его, `chrome-launcher`, in-memory SQLite и Worker bundle. Это подтверждает обоснованность закрепить прямую devDependency и сохранить существующую fixture.
- `.github/workflows/pages.yml` уже выполняет `npm ci`, проверки Astro/SEO и Node tests перед upload/deploy; в нём сейчас нет Worker verify, bundle, syntax или browser шагов.
- `worker/scripts/verify.mjs`, `worker/scripts/bundle.mjs`, `worker/scripts/qa-browser.mjs`, `worker/tests/interest.test.mjs` существуют. Worker bundle в текущем виде читает `src/data/catalog.ts` и `worker/src/index.ts`, а `plainJavaScript` отклоняет неразрешённые импорты. При реализации новой общей contract-модели её включение в bundler действительно потребуется; план это прямо требует.
- Текущий GET `/health` в `worker/src/index.ts:132-139` возвращает `ok/storage/mode`, проверяет доступность D1 через SELECT из `interests` и возвращает 503 при ошибке. Текущий API endpoint конфигурируется в `src/config/analytics.ts:4-5` как URL с окончанием `/api/interest`; документ верно ссылается на существующий публичный config, но реализации извлечения health URL ещё нет (Create-файл, ожидаемо).
- Статья `/journal/skolko-piroga-na-cheloveka/` подтверждается slug в `src/data/blog-articles.ts:28` и маршрутом `src/pages/journal/[slug].astro:23-24`; в самой странице есть калькулятор и CTA. Путь не является отдельным исходным Astro-файлом, это ожидаемый динамический маршрут.
- SQL миграция, на которую ссылается QA, существует как `worker/migrations/0001_interests.sql`; её повторное применение и история deployment намеренно не выполнялись.

## Прочитанные материалы и непроверенные области

**Прочитано:** rubric `elephant-goldfish/references/rubrics.md`; целевой документ (полностью, архитектура как контекст); `package.json`, `package-lock.json` (только записи puppeteer-core), `.github/workflows/pages.yml`, `astro.config.mjs`, `src/config/analytics.ts`, `src/data/catalog.ts`, `src/data/blog-articles.ts`, `src/pages/journal/[slug].astro`, `src/pages/podbor.astro`, `src/pages/index.astro`, `worker/src/index.ts`, `worker/src/catalog.ts`, `worker/scripts/bundle.mjs`, `worker/scripts/transpile.mjs`, `worker/scripts/verify.mjs`, `worker/scripts/qa-browser.mjs`, `worker/tests/interest.test.mjs`, `worker/migrations/0001_interests.sql`, `worker/wrangler.jsonc`, `worker/wrangler.example.jsonc`, `worker/CHECKPOINT.md`. Использованы CodeGraph status/context/explore и прямое чтение для YAML, конфигураций и деталей, не покрытых индексом.

**Не проверялось:** применённая схема и таблица `d1_migrations` в production; наличие/состояние текущего Chrome на GitHub runner; точный формат CLI-аргументов будущего release verifier; фактический маршрут страниц из собранного `site/`; выполнение новых/существующих проверок, browser smoke, деплоя Worker/Pages и независимый production readback. Это вне статического readiness-прохода и не считается доказательством успешности.
