# Выпуск сайта и API Пирогорска

Обновлено 31.10.2026. Node.js 24, установленный Chrome для browser QA, npm, GitHub Actions и существующий Cloudflare OAuth-доступ Wrangler. Команды из корня проекта. Публичный endpoint задан в `src/config/analytics.ts`; секретов в нём нет.

## Порядок выпуска

1. `npm ci`, `npm run check`, `npm run build`, `npm test`, `npm run test:worker`, `npm run test:browser`. Все девять валидаторов из Pages workflow также должны пройти. `build` создаёт `site/release.json`: версия API, версии необязательных пожеланий и атрибуции, SHA-256 отсортированных product ID, variant ID и цен. Подписи, изображения и порядок карточек не меняют этот контракт.
2. При изменении Worker или каталога сначала проверить целевой аккаунт через `npx wrangler@4.155.0 whoami`, записать текущую версию через `npx wrangler@4.155.0 deployments list --config worker/wrangler.jsonc`, затем `npx wrangler@4.155.0 deploy --config worker/wrangler.jsonc`. Привязка существующей D1 и cron заданы в конфиге. Эта команда не применяет SQL migrations.
3. `node scripts/verify-release.mjs check` должен подтвердить D1, API v1 и совпадение каталога живого Worker с `site/release.json`. Сначала завершить rollout Worker, затем публиковать Pages. Старая вкладка не фиксирует коммерческую цену: сервер всегда вычисляет предварительную сумму сам; удаление вариантов требует отдельного плана совместимости.
4. Публикация `main` запускает Pages workflow. Он повторяет проверки, сверяет живой Worker перед upload, публикует Pages, затем сверяет публичные `release.json` и `/health`. Post-check повторяется максимум 60 секунд, учитывая обновление CDN. Только после успеха запускается IndexNow. Успех IndexNow означает приём уведомления, индексация проверяется отдельно.
5. Сохранить commit, Actions run, Worker version и результат readback в `BUILD-STATE.md`. При необходимости независимо выполнить `node scripts/verify-release.mjs published https://pirogorsk.ru/`.

## Неудачный выпуск и восстановление

- Ошибка до upload останавливает Pages-публикацию. Сначала исправить причину, затем повторить весь затронутый набор проверок.
- Ошибка после deploy означает, что Pages уже опубликован; workflow останавливает IndexNow и сообщает ошибку проверки. Сверить активные версии, восстановить предыдущую совместимую пару: предыдущий Pages artifact/commit и соответствующий Worker version. Для Worker использовать `npx wrangler@4.155.0 rollback <VERSION_ID> --config worker/wrangler.jsonc`; для Pages повторно выпустить выбранный совместимый commit, предварительно сверив его manifest с Worker. Автоматически откатывать неизвестный ручной Worker-релиз нельзя.
- Проверки удостоверяют совместимость в моменты чтения. Они не создают глобальную блокировку между Pages и ручными Worker-релизами. Один координатор завершает последовательность Worker → Pages → readback. При появлении параллельных операторов/автоматических Worker-релизов понадобится общий механизм сериализации; Pages concurrency охватывает только Pages.
- Переход 31.10 добавляет только таблицу пожеланий. Откат Worker/Pages не требует удаления этой таблицы и не удаляет сохранённые заявки. Старые payload v1 и их повторы сохраняют прежний hash.

## D1: фактический baseline

29.10.2026 выполнена read-only сверка рабочей D1 с `worker/migrations/0001_interests.sql`. Обе прикладные таблицы (`interests`, `submission_tokens`), CHECK/UNIQUE/PK и три явных индекса совпадают. Таблицы `d1_migrations` нет: схема применена вручную, история Wrangler не заведена. [Обезличенное свидетельство](../.egm/architecture-20261029/evidence/d1-baseline.json).

Повторяемая проверка, без чтения строк заявок:

```sh
npx wrangler@4.155.0 d1 execute pirogorsk-interest --remote --config worker/wrangler.jsonc --command "SELECT type,name,sql FROM sqlite_schema WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%'; PRAGMA table_info(interests); PRAGMA table_info(submission_tokens); PRAGMA index_list(interests); PRAGMA index_list(submission_tokens);"
```

Сначала проверить наличие `d1_migrations` в `sqlite_schema`; читать её содержимое только если таблица существует. Эта сверка документирует фактическое состояние, не регистрирует миграцию. Повторное применение `0001` или фиктивная вставка в migration history не являются частью выпуска. Будущее изменение схемы требует отдельного перехода: резервная копия/точка восстановления D1, испытание на копии, согласованный forward/backward контракт и проверка после применения. Текущее отсутствие истории записано, не замаскировано.

### Переход 31.10: необязательные пожелания

`0002_interest_preferences.sql` создаёт дополнительную таблицу с FK на заявку
и закрытыми значениями повода, времени и типа партнёра. Поля контактов и CRM
не добавляются. Испытание на SQLite-копии проверяет повторную отправку,
совместимость старого v1 и атомарный rollback при ошибке второй таблицы.
Форма по умолчанию отправляет прежний payload без `context`.

Перед применением записаны D1 Time Travel bookmark и схема без чтения строк
заявок: `qa/site-closeout-20261031/d1-bookmark-before.json` и
`d1-schema-before.json`. Применяется только новый файл:

```sh
npx wrangler@4.155.0 d1 execute pirogorsk-interest --remote --config worker/wrangler.jsonc --file worker/migrations/0002_interest_preferences.sql
```

После применения — Worker deploy, `/health` с `interestContextVersion: 1`,
проверка manifest, затем Pages. Старые вкладки совместимы с новым Worker;
предыдущий Worker может работать при наличии дополнительной таблицы.

## Прежний bundle и браузерные проверки

`worker/scripts/bundle.mjs` создаёт единый JS для ручного Dashboard deployment из тех же исходников. Он использует общий catalog contract; bundle проходит синтаксическую и браузерную проверки в CI. CLI deploy берёт `worker/src/index.ts` напрямую. Browser QA не отправляет заявки или цели в production: все запросы перехвачены, D1 заменена настоящей SQLite в памяти, Метрика — локальной очередью.

## Переход текущего спринта: атрибуция v1

`0003_interest_attribution.sql` добавляет только таблицу канала и обезличенного
кода размещения с FK на заявку. Сохранение атомарно с прежними таблицами.
Старые payload без `attribution` сохраняют прежний hash и повторяются без дублей.
Невалидная атрибуция возвращает 422, повтор UUID с другим источником — 409.

31.10 перед применением сохранены bookmark Time Travel и схема в
`qa/sprint-p0-p1-20261031/`. Применён только `0003`, затем опубликован Worker
`dd7253d7-16be-4c2d-b7ea-aee299ee1d16`; `/health` подтверждает
`attributionVersion: 1`. Совместимость Pages проверяется по этой версии.
Откат Pages/Worker не требует удаления дополнительной таблицы.
Контактов, CRM и публичной административной страницы этот переход не добавляет.
