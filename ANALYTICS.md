# Анонимная проверка спроса Пирогорска

Состояние на 23 октября 2026 года: backend опубликован, endpoint в `src/config/analytics.ts` установлен на `https://pirogorsk-interest.mmotorin.workers.dev/api/interest`. `metricaId: 0`: счётчик не создан и скрипт Яндекса не загружается. Создание остановлено на принятии соглашения; согласие в рамках этой задачи не предоставлялось. Сведения о владельце пользователь отложил, форма продолжает собирать только анонимный интерес.

## Production и проверка сохранения

Основной агент опубликовал Worker через Cloudflare Dashboard и сообщил результаты независимого чтения D1:

| Параметр | Фактическое значение |
| --- | --- |
| Worker | [pirogorsk-interest.mmotorin.workers.dev](https://pirogorsk-interest.mmotorin.workers.dev) |
| API | `https://pirogorsk-interest.mmotorin.workers.dev/api/interest` |
| Health | [GET /health](https://pirogorsk-interest.mmotorin.workers.dev/health): `{"ok":true,"storage":"d1","mode":"intent"}` |
| D1 | `pirogorsk-interest`, UUID `4d614db7-3ae1-4972-b76e-197f8174d758` |
| Binding / переменная | `DB` → указанная D1; `ALLOW_LOCALHOST=false` подтверждены |
| Workers Logs | OFF подтверждено |
| Cron | `*/10 * * * *` сохранён; 23.10 20:03 UTC после перезагрузки Dashboard показано Every 10 minutes, Next 20:10 UTC. Выполнение обработчика отдельно не подтверждено |
| Публичный конфиг Worker | `worker/wrangler.jsonc`; UUID базы не является секретом |

Два POST с одним `requestId` дали одну запись. Независимый запрос в D1 вернул `duplicate_count=1`, `value_total=1640` для UUID `bae9085e-2379-4c2b-9c32-c9f6f9c7dad8`. Это служебная QA-заявка, не реальный спрос; исключать её UUID из всех подсчётов и выгрузок спроса. Её удаление пока не подтверждено. Проверка подтверждает production API и D1; end-to-end отправку с опубликованной страницы нужно учитывать отдельно, когда основной агент её подтвердит.

Точная повторная проверка health не создаёт записей:

```sh
curl --fail-with-body https://pirogorsk-interest.mmotorin.workers.dev/health
```

Точное чтение QA-записи в D1 Console:

```sql
SELECT COUNT(*) AS duplicate_count, MIN(value_total) AS value_total
FROM interests
WHERE request_id = 'bae9085e-2379-4c2b-9c32-c9f6f9c7dad8';
```

Зафиксированный результат: `duplicate_count=1`, `value_total=1640`. Health сам по себе не проверяет всю отправку: подтверждение сохранения установлено двумя POST и последующим независимым чтением D1. Этот документационный проход не выполняет новых production POST, деплой или удаление QA-записи.

## Что означает конверсия

`order_submit` — сохранённая анонимная заявка с подтверждением желания заказать по ориентировочной цене. Это не покупка, оплата, бронь, подтверждённая доставка или заявка для обратной связи. Имя, телефон, email, Telegram, адрес и комментарий отсутствуют и в форме, и в API. Дополнительные поля API отклоняет.

Форма прямо говорит: «Готовим запуск. Заявка показывает интерес, заказ и оплата пока не подтверждаются». При пустом endpoint кнопка выключена. При сетевой ошибке подтверждения успеха нет; повтор использует прежний `requestId`. Только ответ `200 {ok:true,saved:true,requestId:<тот же UUID>}` показывает подтверждение и вызывает цель.

## Подключение на странице

В Astro-странице или общем layout:

```astro
---
import InterestForm from '../components/InterestForm.astro';
import Analytics from '../components/Analytics.astro';
---
<!-- по одному экземпляру на странице -->
<InterestForm />
<Analytics />
```

Нужен JSON-каталог `#catalog-data`: массив товаров или `{products:[...]}`. Схема варианта `{value,label,price}`; числа `value` приводятся к строкам. Legacy `prices:{500:690,1000:1290}` также читается. Для напитков и дополнений JSON должен включать полный `catalog`, а не только `products`.

Открытие из корзины:

```ts
document.dispatchEvent(new CustomEvent('pirogorsk:order-open', {
  detail: {
    items: selection.map(item => ({
      id: item.id,
      value: String(item.value ?? item.weight),
      quantity: item.quantity,
    })),
    city,
  },
}));
```

Либо `import {openInterestForm} from './interest'; openInterestForm(selection, city)`. Legacy `weight` поддерживается. Внешний `total` игнорируется: сумма на форме считается по каталогу. Подтверждённое сохранение вызывает ровно одно DOM-событие `pirogorsk:order-saved` с `{requestId}`. Контент заявки в это событие не попадает.

## Счётчик и цели Метрики

После создания счётчика вписать его фактический числовой ID в `analyticsConfig.metricaId`. При `0` скрипт Яндекса не загружается. Не включать Вебвизор / аналитику форм и автоматическое отслеживание отправок форм в настройках счётчика. Код запускает `webvisor:false`, `clickmap:false`, `trackLinks:false`; сама форма имеет `ym-disable-submit`. Учёт происходит через явный `reachGoal`.

В Метрике: открыть счётчик → **Настройка → Цели → Добавить цель → Целевое событие / JavaScript-событие**. Для каждой строки создать отдельную цель; идентификатор скопировать точно. Не включать дополнительное автоматическое достижение по клику на кнопку.

| Название | Идентификатор | Факт достижения |
| --- | --- | --- |
| Добавил товар в подборку | `catalog_add` | storefront успешно добавил товар; вызывает основной агент |
| Открыл форму интереса | `order_form_open` | форма действительно открылась с составом подборки |
| Начал заполнять форму | `order_form_start` | первое изменение поля после открытия |
| Сохранил анонимную заявку | `order_submit` | сервер подтвердил сохранение и вернул совпадающий `requestId` |
| Не получил подтверждение заявки | `order_submit_error` | сетевой сбой или неуспешный ответ сервера после валидной отправки |

Эти пять целей реализованы и согласованы основным агентом; дополнительные цели не требуются. Номер счётчика ещё не получен; цели в аккаунте этим кодом не создаются. При `metricaId: 0` production QA-заявка не вызывает событий Метрики.

Экспорт `trackGoal(goal, params)` из `src/scripts/analytics.ts` пропускает только известные идентификаторы и поля `city`, `productid`, `variant`, `qty`, `value`, `requestId`. В `productid/variant/qty` допускаются согласованные массивы для корзины. `value` — ориентировочная сумма, не выручка. Контакты, свободный текст, дата, доставка, IP, clientID и UTM не передаются. Повторный `order_submit` с тем же `requestId` подавляется в памяти и `sessionStorage`. Блокировщик Метрики не мешает `fetch` и D1.

Основная конверсия для оценки спроса — `order_submit`; открытия и начало заполнения нужны для воронки. Источник количества сохранённых заявок — D1: браузерная аналитика может блокироваться. Сравнивать добавления/открытия/отправки за одинаковый период, отдельно по городу, товару и варианту. Не считать ориентировочную стоимость оплаченной выручкой.

## API и хранение

`POST /api/interest`, `Content-Type: application/json`:

```json
{
  "version": 1,
  "requestId": "1f90155d-48a4-47bd-b917-0fe49f8bfac0",
  "city": "Зеленоградск",
  "items": [{"id":"meat","value":"500","quantity":2}],
  "desiredDate": "2026-12-12",
  "delivery": "pickup",
  "priceConsent": true,
  "website": ""
}
```

`delivery`: `pickup|delivery|undecided`. Дата — сегодняшний или будущий календарный день Калининграда. Варианты и цены берутся из общего `src/data/catalog.ts`, который входит в bundle Worker: отдельного списка товаров нет. Клиент не передаёт цену, сервер сохраняет `unitPrice` для каждой позиции и `value_total` на момент первой отправки. После изменения каталога надо заново собрать/опубликовать и сайт, и Worker.

Ответы: `200` подтверждённое сохранение/идентичный повтор; `409` тот же ID с другим содержимым; `422` валидация/ловушка; `403` недопустимый Origin; `413` тело свыше 16 KiB; `415` другой тип контента; `429` частые новые заявки; `503` хранилище недоступно. Ни один отказ не содержит `saved:true`. JSON-ошибки полей отображаются рядом с полями. База закрыта; публичного admin/export API нет.

Один D1 batch транзакционно удаляет истёкшие rate-токены, выделяет слот, вставляет заявку и читает подтверждение. Лимит — 6 новых заявок за 10 минут на временный хеш IP+окна; идентичные повторы сохранённой заявки не расходуют слоты. Сырой IP нигде в таблицах не сохраняется. Таблица `submission_tokens` очищается при отправке и обработчиком cron; расписание каждые 10 минут сохранено в dashboard, его повторная проверка ещё идёт. Истёкшая строка может оставаться до следующего запуска очистки. В `interests` нет rate-хеша. Логи тела запроса/исключений отсутствуют, Workers Logs выключен в production и в конфиге.

## Проверки без внешних аккаунтов

Из корня проекта с установленными зависимостями и Node.js 22.18+ (локально проверено на 25.9):

```sh
node worker/scripts/verify.mjs
node worker/scripts/bundle.mjs
node --check worker/dist/worker.js
node worker/scripts/qa-browser.mjs
```

Verifier проверяет отдельно браузерный TypeScript и Worker; тесты API используют настоящий SQLite и SQL-миграцию: сохранение, retry/double submit, конфликт ID, все варианты/цены каталога, валидация, CORS, размер тела, rate limit, очистка и rollback. Генератор dashboard-bundle использует уже установленный TypeScript, не требует установки Wrangler или авторизации. `worker/dist/worker.js` — готовый единый ES module, без импортов/секретов. Сгенерированный bundle, кэш Wrangler и локальный QA-конфиг исключены из Git. Исходный каталог остаётся в Git.

Браузерная QA использует установленный Chrome, реальные исходники формы и готовый bundle Worker с локальным SQLite. Проверяет ширину 320 px, ошибки и фокус, двойной submit, потерю ответа после сохранения, retry с прежним ID, одну запись и одну цель, закрытие Escape и выключенный endpoint. Яндекс перехватывается локально; рабочие сервисы не получают тестовых данных. Скриншот — `worker/dist/qa-interest-mobile.png`, результат — stdout.

## Повторная сборка и CLI

Production уже создан через dashboard. Конфиг существующего Worker и D1 записан в `worker/wrangler.jsonc`; `wrangler.example.jsonc` остаётся шаблоном для нового окружения. Новую production-базу создавать не требуется. Обязательная привязка — **D1 `DB`**. Секреты, API-токены в репозитории, KV, R2, email-сервис и платная подписка не нужны. Cloudflare Workers и D1 поддерживают Free; действуют квоты аккаунта, их нужно смотреть в dashboard.

```sh
cd /Volumes/DevSim/Projects/PIROGORSK/worker
npx wrangler d1 migrations apply pirogorsk-interest --local
npx wrangler deploy --dry-run --outdir dist/wrangler
```

Схема production создана SQL через D1 Console. История миграций Wrangler отдельно не подтверждена; повторный `migrations apply --remote` может попытаться выполнить уже применённый `CREATE TABLE`. Для следующих изменений сначала сверить фактическую схему и историю миграций, затем подготовить отдельную миграцию. Когда требуется обновить код существующего Worker через авторизованный CLI:

```sh
npx wrangler deploy
```

Для локального полноценного QA скопировать конфиг в `wrangler.local.jsonc`, включить только там `vars.ALLOW_LOCALHOST: "true"` и запустить `npx wrangler dev --config wrangler.local.jsonc`. Production: `ALLOW_LOCALHOST:false`. Production Origin допускает исключительно `https://pirogorsk.ru` и `https://www.pirogorsk.ru`. Отсутствующий Origin и `null` отклоняются.

После обновления проверить production `/health` по адресу выше; endpoint сайта уже установлен. Сайт может оставаться на GitHub Pages; custom domain Worker не нужен. Проверку опубликованной формы подтверждать независимым чтением её точного `request_id` в D1. QA-записи исключать из спроса по ID; удаление существующей QA-записи выполнять отдельно с проверкой точного ID.

## Воспроизведение настройки через Cloudflare Dashboard

Ниже инструкция для нового окружения. Текущие Worker, D1 и binding уже существуют, их значения и результаты проверок перечислены выше.

1. Локально выполнить `node worker/scripts/bundle.mjs`. Для dashboard нужен весь `worker/dist/worker.js` и SQL из `worker/migrations/0001_interests.sql`; исходные TS в редактор вставлять не нужно.
2. В Cloudflare выбранного аккаунта открыть **Storage & databases → D1 SQL database → Create database**, имя `pirogorsk-interest`. В новой базе открыть **Console**, выполнить SQL миграции, проверить наличие `interests` и `submission_tokens`. Этот SQL предназначен для новой пустой базы; при уже существующей схеме сначала сверить таблицы, повторно не запускать `CREATE TABLE` вслепую.
3. Открыть **Workers & Pages → Create application**, создать Worker `pirogorsk-interest` через доступный в аккаунте стартовый шаблон. Открыть **Edit code**, заменить стартовый `worker.js` полным содержимым готового bundle, сохранить/Deploy. Это ES module с `export default`.
4. В Worker **Bindings → Add binding → D1 database**: variable name **DB**, выбрать созданную базу. В **Settings → Variables and Secrets** добавить обычную переменную `ALLOW_LOCALHOST` со значением `false`. Секреты не требуются. Если UI попросит повторный Deploy после изменения binding, выполнить его.
5. В **Settings → Triggers / Cron Triggers** добавить `*/10 * * * *`; обработчик `scheduled` уже есть. В настройках observability оставить Workers Logs выключенным. Не включать запись тел запросов.
6. Оставить доступный по умолчанию адрес `workers.dev`, открыть `/health`, затем внести `/api/interest` в конфиг сайта и выполнить проверку сохранения из production-формы. При отсутствии редактора в текущем варианте dashboard использовать Git deployment с этим Worker как entrypoint; секреты в Git не добавлять. Официальные названия разделов могут меняться; обязательные сущности неизменны: Worker ES module, D1 `DB`, схема, обычная переменная, cron.

Владелец аккаунта может читать и выгружать заявки через D1 dashboard. Пример запроса в консоли:

```sql
SELECT request_id, datetime(created_at / 1000, 'unixepoch') AS created_utc,
       city, items_json, desired_date, delivery, price_consent, value_total
FROM interests
WHERE request_id <> 'bae9085e-2379-4c2b-9c32-c9f6f9c7dad8'
ORDER BY created_at DESC LIMIT 100;
```

Количество анонимных заявок по городам без служебного QA:

```sql
SELECT city, COUNT(*) AS interests
FROM interests
WHERE request_id <> 'bae9085e-2379-4c2b-9c32-c9f6f9c7dad8'
GROUP BY city;
```

Никаких платёжных, почтовых или Telegram-уведомлений этот модуль не отправляет. Контактную форму можно добавить отдельной задачей после появления сведений об операторе.

## Проверенные первичные источники

Проверено 23 октября 2026 года:

- [Яндекс: reachGoal, параметры и событие цели](https://yandex.ru/support/metrica/ru/objects/reachgoal).
- [Яндекс: создание и установка счётчика](https://yandex.ru/support/metrica/ru/general/creating-counter).
- [Яндекс: настройка сбора данных и класс ym-disable-submit](https://yandex.ru/support/metrica/ru/code/html-markup).
- [Cloudflare: D1 bindings и атомарный batch](https://developers.cloudflare.com/d1/worker-api/d1-database/).
- [Cloudflare: создание D1 и SQL через dashboard/CLI](https://developers.cloudflare.com/d1/get-started/).
- [Cloudflare: binding DB и редактор кода dashboard](https://developers.cloudflare.com/d1/best-practices/remote-development/).
- [Cloudflare: миграции D1](https://developers.cloudflare.com/d1/reference/migrations/).
- [Cloudflare: dry-run deploy и outdir](https://developers.cloudflare.com/workers/wrangler/commands/workers/).
- [Cloudflare Workers Free](https://developers.cloudflare.com/workers/platform/pricing/) и [D1 Free](https://developers.cloudflare.com/d1/platform/pricing/).
