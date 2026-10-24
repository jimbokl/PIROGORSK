# Анонимная проверка спроса Пирогорска

Состояние на 24 октября 2026 года: backend опубликован, endpoint в `src/config/analytics.ts` установлен на `https://pirogorsk-interest.mmotorin.workers.dev/api/interest`. В аккаунте jintronic создан счётчик «Пирогорск» **113767847**, домен `pirogorsk.ru`, часовой пояс Калининграда, RUB. Пользователь подтвердил принятие соглашения. Фактический ID включён в конфиг сайта; пять целей созданы в интерфейсе. Сведения о владельце пользователь отложил, форма продолжает собирать только анонимный интерес.

## Production и проверка сохранения

Worker опубликован через Cloudflare Dashboard. Сохранение независимо проверено чтением D1:

| Параметр | Фактическое значение |
| --- | --- |
| Worker | [pirogorsk-interest.mmotorin.workers.dev](https://pirogorsk-interest.mmotorin.workers.dev) |
| API | `https://pirogorsk-interest.mmotorin.workers.dev/api/interest` |
| Health | [GET /health](https://pirogorsk-interest.mmotorin.workers.dev/health): `{"ok":true,"storage":"d1","mode":"intent"}` |
| D1 | `pirogorsk-interest`, UUID `4d614db7-3ae1-4972-b76e-197f8174d758` |
| Binding / переменная | `DB` → указанная D1; `ALLOW_LOCALHOST=false` подтверждены |
| Workers Logs | OFF подтверждено |
| Cron | `*/10 * * * *`; 24.10 фактическое выполнение подтверждено контрольным опытом: в 14:50:55 UTC просроченный токен удалён, действующий сохранён. После его истечения в 15:24:25 UTC осталось 0 служебных токенов. [Доказательство](qa/cron-verification-20261024.md) |
| Публичный конфиг Worker | `worker/wrangler.jsonc`; UUID базы не является секретом |

Production проверен двумя независимыми способами:

- API: два POST с одним `requestId` дали одну запись. Чтение D1 вернуло `duplicate_count=1`, `value_total=1640` для UUID `bae9085e-2379-4c2b-9c32-c9f6f9c7dad8`.
- Опубликованная форма на `https://pirogorsk.ru/`: выбран мясной пирог 500 г, Зеленоградск, 16.05.2027, доставка, предварительная сумма 690 ₽. После отправки интерфейс показал подтверждение с UUID `1d6b3ff8-e23e-44cb-bcdb-5d98cc84c578`. Независимый SELECT в D1 вернул одну строку с тем же UUID, городом, датой, способом получения, суммой 690 и вариантом `meat/500`, количеством 1. В консоли браузера ошибок нет.

24.10 после публикации счётчика выполнена ещё одна отправка через production UI: `609e574e-b81e-4ca3-91a8-c6dddf38aba1`, Зеленоградск, мясной пирог 500 г × 1, доставка, 17.05.2027, ориентировочная сумма 690 ₽. Интерфейс показал «Заявка сохранена». Независимый SELECT в D1 подтвердил все поля и `duplicate_count=1`. Официальный отладчик Метрики показал ровно один `order_submit`, ошибок консоли нет. Затем отчёт Метрики показал **1 целевой визит и 1 достижение** цели «Сохранил анонимную заявку» (ID 674123845). Это сквозная проверка UI → D1 → Метрика, а не имитация вызова цели.

Все три UUID — служебный QA, а не реальный спрос. Они исключены из SQL ниже; записи не удалены. Тестовое достижение остаётся в отчёте Метрики: при анализе спроса исключать его по параметру цели `requestId` или сверять с очищенной выборкой D1. Это намерение заказать, не оплаченная продажа. Доказательства: `qa/screenshots/metrica-production-saved-20261024.png`, `qa/screenshots/metrica-conversion-received-20261024.png`, `qa/metrica-verification-20261024.md`. Скриншоты D1 остаются локальными.

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

Зафиксированный результат: `duplicate_count=1`, `value_total=1640`. Health сам по себе не проверяет всю отправку: подтверждение сохранения установлено двумя POST и последующим независимым чтением D1. Новых записей для повторного подтверждения этих фактов не требуется.

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

В `analyticsConfig.metricaId` указан фактический ID **113767847**. [Цели счётчика](https://metrika.yandex.ru/stat/conversion_rate?id=113767847&period=today&goalsConversionViewKind=List). Автоматические цели, Вебвизор / аналитика форм и электронная коммерция выключены в настройках. Не включать автоматическое отслеживание отправок форм. Код запускает `webvisor:false`, `clickmap:false`, `trackLinks:false`; сама форма имеет `ym-disable-submit`. Учёт происходит через явный `reachGoal`.

В Метрике: открыть счётчик → **Настройка → Цели → Добавить цель → Целевое событие / JavaScript-событие**. Для каждой строки создать отдельную цель; идентификатор скопировать точно. Не включать дополнительное автоматическое достижение по клику на кнопку.

| Название | Идентификатор | Факт достижения |
| --- | --- | --- |
| Добавил товар в подборку | `catalog_add` | storefront успешно добавил товар; вызывает основной агент |
| Открыл форму интереса | `order_form_open` | форма действительно открылась с составом подборки |
| Начал заполнять форму | `order_form_start` | первое изменение поля после открытия |
| Сохранил анонимную заявку | `order_submit` | сервер подтвердил сохранение и вернул совпадающий `requestId` |
| Не получил подтверждение заявки | `order_submit_error` | сетевой сбой или неуспешный ответ сервера после валидной отправки |

Все пять целей созданы 24.10.2026 с условием **«Совпадает»**, а не «Содержит»: `order_submit_error` не засчитывается как `order_submit`. Основная цель добавлена в избранное; статический доход не задан. Числовые ID: `order_submit` → **674123845**, `catalog_add` → 674123931, `order_form_open` → 674123960, `order_form_start` → 674123969, `order_submit_error` → 674123979. Подтверждение: `qa/screenshots/metrica-goals-20261024.png`. Предыдущие production QA-заявки 23.10 сделаны при выключенном счётчике и не являются конверсиями Метрики.

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

Один D1 batch транзакционно удаляет истёкшие rate-токены, выделяет слот, вставляет заявку и читает подтверждение. Лимит — 6 новых заявок за 10 минут на временный хеш IP+окна; идентичные повторы сохранённой заявки не расходуют слоты. Сырой IP нигде в таблицах не сохраняется. Таблица `submission_tokens` очищается при отправке и обработчиком cron; расписание каждые 10 минут сохранено и подтверждено после reload dashboard. 23.10 история Cron Events была пустой, а 0 строк D1 не доказывали запуск. 24.10 контрольный опыт отдельно подтвердил scheduled handler: просроченная строка исчезла при сохранении действующей, без API POST, ручной очистки или deploy. Позже контрольная строка также удалена после своего истечения; в 15:20:20 UTC она ещё была, в 15:24:25 — уже нет. Точное время второго запуска по этому чтению не устанавливается. [SQL и наблюдения](qa/cron-verification-20261024.md). Истёкшая строка может оставаться до следующего запуска очистки. В `interests` нет rate-хеша. Логи тела запроса/исключений отсутствуют, Workers Logs выключен в production и в конфиге.

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
WHERE request_id NOT IN (
  'bae9085e-2379-4c2b-9c32-c9f6f9c7dad8',
  '1d6b3ff8-e23e-44cb-bcdb-5d98cc84c578',
  '609e574e-b81e-4ca3-91a8-c6dddf38aba1'
)
ORDER BY created_at DESC LIMIT 100;
```

Количество анонимных заявок по городам без служебного QA:

```sql
SELECT city, COUNT(*) AS interests
FROM interests
WHERE request_id NOT IN (
  'bae9085e-2379-4c2b-9c32-c9f6f9c7dad8',
  '1d6b3ff8-e23e-44cb-bcdb-5d98cc84c578',
  '609e574e-b81e-4ca3-91a8-c6dddf38aba1'
)
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

## UTM подготовленных размещений — 24.10.2026

Код явного просмотра использует документированные `init({defer:true})` и `hit(url, {referer})`: один pageview вместо автоматического плюс ручного. Передаётся origin/path и только полная фиксированная комбинация четырёх UTM из `src/lib/analytics-pageview.ts`; остальные параметры и hash удалены, query/hash реферера также исключены. Старые недокументированные поля `url/referrer` в init удалены. Это изменение формирования pageview, а не целей. `order_submit` по-прежнему зависит от подтверждения backend и совпадающего UUID.

UTM — только в просмотре Метрики, не в параметрах `reachGoal` и не в D1. Два текста и ссылки — [TELEGRAM-TEST.md](TELEGRAM-TEST.md); размещения не выполнялись. Стандартный UTM-отчёт по реальным рекламным визитам пока не проверен: реклама не запущена. Локально проверены очистка URL, известные/чужие/неполные/повторные метки и инициализация реального модуля без лишнего pageview или цели — [QA](qa/traffic-attribution-20261024.md).

Основания: [init/defer](https://yandex.ru/support/metrica/ru/code/counter-initialize.html), [hit/referer](https://yandex.ru/support/metrica/ru/objects/hit), [метки первого просмотра](https://yandex.ru/support/metrica/ru/general/source-tags).
