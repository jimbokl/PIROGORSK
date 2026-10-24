# Метрика: production-проверка 24.10.2026

Код b7cc1a39a0afeb5761041aa1585a14aee06bbf84 опубликован успешно: https://github.com/jimbokl/PIROGORSK/actions/runs/40088193551 (exit 0).

Счётчик 113767847, jintronic, pirogorsk.ru. Основная цель order_submit, ID 674123845, условие «Совпадает»; не совпадает с order_submit_error. Автоцели, Вебвизор/аналитика форм, ecommerce OFF. Дополнительные цели: catalog_add, order_form_open, order_form_start, order_submit_error.

## Реальная отправка

Заявка через UI опубликованного сайта: 609e574e-b81e-4ca3-91a8-c6dddf38aba1. Зеленоградск; meat / 500 г / 1; 17.05.2027; delivery; предварительная сумма 690 ₽. UI подтвердил сохранение. Независимый SELECT в D1 вернул те же значения и duplicate_count=1.

Официальный отладчик Яндекса, ?_ym_debug=2:

```text
2026-10-24T11:04:37.257Z PageView. Counter 113767847. URL: https://pirogorsk.ru/. Referrer:
2026-10-24T11:04:58.916Z Reach goal. Counter: 113767847. Goal id: order_form_open.
2026-10-24T11:05:13.568Z Reach goal. Counter: 113767847. Goal id: order_form_start.
2026-10-24T11:05:15.972Z Reach goal. Counter: 113767847. Goal id: order_submit.
```

Один order_submit, ошибок консоли нет. Вызов цели вручную не имитировался. В отчёте Метрики после обновления: 1 целевой визит, 1 достижение цели «Сохранил анонимную заявку». Скриншот `screenshots/metrica-conversion-received-20261024.png`. Подтверждение UI: `screenshots/metrica-production-saved-20261024.png`. D1 screenshot хранится локально.

Служебный UUID исключён из обоих SQL-отчётов ANALYTICS.md; записи не удалялись. Полученное достижение — QA, а не спрос или оплаченный заказ.

## Проверки

- Astro check: 45 файлов, 0 ошибок/предупреждений/подсказок.
- Build PASS; SEO 23 HTML / 21 sitemap URL / 1587 local references.
- Worker/client typechecks; 14 API/SQL integration tests; bundle PASS.
- Browser QA: validation/focus, 320 px, двойная pending-отправка, потерянное подтверждение без цели, повтор с тем же UUID — одна строка/одна цель. Лог `/tmp/pirogorsk-metrica-tests.log`.
- Shared registry strict: PASS, errors 0, hasDrift false.

## Lighthouse на публичном домене

Это локальный запуск Lighthouse, не официальный PageSpeed Insights. Счётчик работал при измерении. Best Practices 77 из-за cookies Яндекса; тесты не обходили загрузку аналитики. Ниже только безопасные поля без cookie URL/идентификаторов.

```json
[
  {
    "mode": "mobile",
    "timestamp": "2026-10-24T11:05:09.849Z",
    "lighthouseVersion": "13.5.0",
    "url": "https://pirogorsk.ru/",
    "scores": {
      "performance": 100,
      "accessibility": 100,
      "best-practices": 77,
      "seo": 100
    },
    "metrics": {
      "first-contentful-paint": 1213.289,
      "largest-contentful-paint": 1250.289,
      "total-blocking-time": 2.5,
      "cumulative-layout-shift": 0.0014192773875273388,
      "speed-index": 2061.68684398303
    },
    "failedBestPractices": [
      "third-party-cookies",
      "inspector-issues"
    ]
  },
  {
    "mode": "desktop",
    "timestamp": "2026-10-24T11:05:19.692Z",
    "lighthouseVersion": "13.5.0",
    "url": "https://pirogorsk.ru/",
    "scores": {
      "performance": 100,
      "accessibility": 100,
      "best-practices": 77,
      "seo": 100
    },
    "metrics": {
      "first-contentful-paint": 354.9629,
      "largest-contentful-paint": 536.9629,
      "total-blocking-time": 0,
      "cumulative-layout-shift": 0.0135679487347868,
      "speed-index": 354.9629
    },
    "failedBestPractices": [
      "third-party-cookies",
      "inspector-issues"
    ]
  }
]
```
