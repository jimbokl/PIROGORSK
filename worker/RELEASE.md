# Выпуск сайта и API Пирогорска

Обновлено 29.10.2026. Node.js 24, установленный Chrome для browser QA, npm, GitHub Actions и существующий Cloudflare OAuth-доступ Wrangler. Команды из корня проекта. Публичный endpoint задан в `src/config/analytics.ts`; секретов в нём нет.

## Порядок выпуска

1. `npm ci`, `npm run check`, `npm run build`, `npm test`, `npm run test:worker`, `npm run test:browser`. Четыре SEO-валидатора из Pages workflow также должны пройти. `build` создаёт `site/release.json`: версия API и SHA-256 отсортированных product ID, variant ID и цен. Подписи, изображения и порядок карточек не меняют этот контракт.
2. При изменении Worker или каталога сначала проверить целевой аккаунт через `npx wrangler@4.155.0 whoami`, записать текущую версию через `npx wrangler@4.155.0 deployments list --config worker/wrangler.jsonc`, затем `npx wrangler@4.155.0 deploy --config worker/wrangler.jsonc`. Привязка существующей D1 и cron заданы в конфиге. Эта команда не применяет SQL migrations.
3. `node scripts/verify-release.mjs check` должен подтвердить D1, API v1 и совпадение каталога живого Worker с `site/release.json`. Сначала завершить rollout Worker, затем публиковать Pages. Старая вкладка не фиксирует коммерческую цену: сервер всегда вычисляет предварительную сумму сам; удаление вариантов требует отдельного плана совместимости.
4. Публикация `main` запускает Pages workflow. Он повторяет проверки, сверяет живой Worker перед upload, публикует Pages, затем сверяет публичные `release.json` и `/health`. Post-check повторяется максимум 60 секунд, учитывая обновление CDN. Только после успеха запускается IndexNow. Успех IndexNow означает приём уведомления, индексация проверяется отдельно.
5. Сохранить commit, Actions run, Worker version и результат readback в `BUILD-STATE.md`. При необходимости независимо выполнить `node scripts/verify-release.mjs published https://pirogorsk.ru/`.

## Неудачный выпуск и восстановление

- Ошибка до upload останавливает Pages-публикацию. Сначала исправить причину, затем повторить весь затронутый набор проверок.
- Ошибка после deploy означает, что Pages уже опубликован; workflow останавливает IndexNow и сообщает ошибку проверки. Сверить активные версии, восстановить предыдущую совместимую пару: предыдущий Pages artifact/commit и соответствующий Worker version. Для Worker использовать `npx wrangler@4.155.0 rollback <VERSION_ID> --config worker/wrangler.jsonc`; для Pages повторно выпустить выбранный совместимый commit, предварительно сверив его manifest с Worker. Автоматически откатывать неизвестный ручной Worker-релиз нельзя.
- Проверки удостоверяют совместимость в моменты чтения. Они не создают глобальную блокировку между Pages и ручными Worker-релизами. Один координатор завершает последовательность Worker → Pages → readback. При появлении параллельных операторов/автоматических Worker-релизов понадобится общий механизм сериализации; Pages concurrency охватывает только Pages.
- Схема БД в этом спринте не меняется, откат Worker/Pages не удаляет сохранённые заявки.

## D1: фактический baseline

29.10.2026 выполнена read-only сверка рабочей D1 с `worker/migrations/0001_interests.sql`. Обе прикладные таблицы (`interests`, `submission_tokens`), CHECK/UNIQUE/PK и три явных индекса совпадают. Таблицы `d1_migrations` нет: схема применена вручную, история Wrangler не заведена. [Обезличенное свидетельство](../.egm/architecture-20261029/evidence/d1-baseline.json).

Повторяемая проверка, без чтения строк заявок:

```sh
npx wrangler@4.155.0 d1 execute pirogorsk-interest --remote --config worker/wrangler.jsonc --command "SELECT type,name,sql FROM sqlite_schema WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%'; PRAGMA table_info(interests); PRAGMA table_info(submission_tokens); PRAGMA index_list(interests); PRAGMA index_list(submission_tokens);"
```

Сначала проверить наличие `d1_migrations` в `sqlite_schema`; читать её содержимое только если таблица существует. Эта сверка документирует фактическое состояние, не регистрирует миграцию. Повторное применение `0001` или фиктивная вставка в migration history не являются частью выпуска. Будущее изменение схемы требует отдельного перехода: резервная копия/точка восстановления D1, испытание на копии, согласованный forward/backward контракт и проверка после применения. Текущее отсутствие истории записано, не замаскировано.

## Прежний bundle и браузерные проверки

`worker/scripts/bundle.mjs` создаёт единый JS для ручного Dashboard deployment из тех же исходников. Он использует общий catalog contract; bundle проходит синтаксическую и браузерную проверки в CI. CLI deploy берёт `worker/src/index.ts` напрямую. Browser QA не отправляет заявки или цели в production: все запросы перехвачены, D1 заменена настоящей SQLite в памяти, Метрика — локальной очередью.
