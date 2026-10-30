# Полный ассортимент на главной — 30.10.2026

## Направление

Главная — витрина для выбора пирогов, вход из поиска и прямых переходов.
Сохраняем белый фон и морской синий. На desktop от1100px — широкий баннер и галерея: четыре карточки до1279px, пять от1280px; пирог сверху. На телефоне и планшете — непрерывная лента с пирогом слева. Общие строки CSS subgrid выравнивают изображения, заголовки, форматы, количество и действия внутри каждого ряда галереи.
Все 153 позиции в HTML, разделы с понятными названиями и количеством товаров.
Закреплённая горизонтальная навигация, непрерывная подгрузка порциями и ручная кнопка.
Вес, количество 1–99, пересчёт цены и добавление используют действующую подборку.
Фактический результат — товар с выбранным форматом и количеством в сохранённой подборке.
Проверяем весь ассортимент, якоря, телефон/планшет/desktop, клавиатуру, без JS и скорость.

## Проверки

Опубликован runtime **`ea381cb1f39d69faab09a2ad8ae7bbdecbfda981`**. [CI41092802345, попытка2 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/41092802345): check/build, семь validators, 41 Node tests, Worker/API/SQL, полный browser QA, обычные проверки совместимости до и после публикации, Pages deployment и IndexNow PASS. Предыдущая production-база: mobile Lighthouse CLI LCP median1656ms.

- 153 уникальные позиции в SSR, восемь категорий. Первые 12 видимы сразу, следующие подгружаются порциями по 12. Кнопка «Показать ещё» работает без IntersectionObserver, без JavaScript доступен весь ассортимент.
- Восемь ширин 320/390/768/1024/1100/1279/1280/1440px: все 153 карточки, все варианты и пересчёт при количестве3, границы1–99, клавиатура, повторное добавление/суммы/сохранение, восемь якорей и reload PASS. На390×740 первая кнопка до639px; 320px —648px. Автоподгрузка до153, fallback и no-JS PASS. JS/HTTP errors, overflow, axe WCAG A/AA violations нет.
- Astro check: 0errors/0warnings; build217 HTML; 41 Node tests; Worker/client types/API/SQL; полный browser QA 320/390/1280; семь SEO/artwork validators PASS. Shared registry strict: errors0, driftfalse, passedtrue.
- Стандартная локальная release-проверка получила ENOTFOUND от системного DNS. DNS1.1.1.1 и dns.google разрешили тот же Worker в188.114.96.0/97.0; curl с --resolve и исходным TLS hostname вернул health HTTP200. Та же verifyRelease с этим транспортом подтвердила API/catalog/D1 PASS; конфигурация проекта не изменялась. Свидетельство: release-resolved-dns.log. Обычная release-проверка и опубликованная совместимость также прошли в итоговом CI.
- Локальный Lighthouse CLI, три мобильных прогона: 96/98/97, LCP2654/1979/2272ms, медиана2272ms; desktop100/LCP469ms. A/BP/SEO100, CLS≈0.003. Итоговый production-замер приведён ниже.

Верификатор: `verify-home.mjs`; результаты: `local/results.json`, `performance-local-final/metrics.json`, `performance-local-final/performance-ranges.json`. Проверки не отправляют форму на production.

Первый CI41089696183 остановился в смешанном добавлении на1280px: ожидание проверяло только hidden=false, не завершение плавной прокрутки. Браузерный сценарий теперь ждёт прибытия раздела и стабильного scrollY, использует стабильный pointer click и дополнительно подтверждает каждую позицию в сохранённой подборке. Итоговые assertions сохранены. Локальный отдельный verifier также проверяет normal-motion на390/768/1280px: длинный переход → количество2 → добавление PASS. Основные восемь ширин, все153 карточки/варианты, fallback/no-JS повторно PASS.

CI41092802345, попытка1: check/build/семь validators/41 Node/Worker PASS; Chrome launcher остановился до browser assertions с `waiting for dynamic debugging port in chrome-err.log`. Полный job повторно запущен на том же runtime без изменения тестов или кода; попытка2 завершилась SUCCESS. Причина первого сбоя запуска Chrome не установлена.


## Production

- Независимая сверка с **GitHub Actions Pages artifact**, а не с локальной сборкой: все244 ресурса, включая217 HTML/153 товара, JS/CSS/fonts и responsive hero, HTTP200 и побайтно совпадают. Один исходный503 на `/catalog/tort-so-svininoj-1300-g/` адресно перепроверен: HTTP200/точное совпадение; оба результата сохранены в `publication.json`.
- UI на320/390/768/1024/1100/1279/1280/1440px: все153 карточки/варианты, геометрия галереи4–5 колонок, категории/hash/reload, количество1–99, цена/повторное добавление/сохранённая подборка, клавиатура и axe PASS. Нормальная плавная прокрутка390/768/1280, автоматическая/ручная подгрузка и no-JS PASS. JS/HTTP errors/overflow нет. Формы на production не отправлялись.
- Визуально просмотрены production-снимки390/768/1440px и галерея1440px: телефон и планшет — строки с иллюстрацией слева, desktop — изображения сверху и общие линии элементов. Первая CTA телефона заканчивается на639px при390×740.
- Публичный PageSpeed Insights отдельно проверен для mobile/desktop, но отчёт не выдан: «Не удалось перейти по адресу https://pirogorsk.ru/. Проверьте правильность URL». Этот ответ сохранён в `public-psi.json`; оценок PSI нет. Lighthouse CLI измеряется отдельно, его показатели не выдаются за публичный PSI.

- Production Lighthouse CLI (Chrome156, fresh profile для каждого запуска, simulated throttling): mobile98/100/100, LCP1541/1454/1449ms, медиана1454ms; desktop99/LCP600ms. Accessibility/SEO100, CLS0.0017–0.0027. Best Practices77 связан с cookies/Chrome Issues Яндекс Метрики, как в предыдущей production-базе. Observed LCP и разбивка реального trace сохранены отдельно от simulated headline metrics; причинное ускорение по сравнению с прошлой серией измерений не утверждается.

Свидетельства: `ci-result.json`, `production/results.json`, `publication.json`, `public-psi.json`, `production-performance/metrics.json`, `production-performance/performance-ranges.json`; скриншоты и полные Lighthouse reports находятся в `production/` и `production-performance/` (локальные QA-артефакты).

Поручение выполнено: весь ассортимент на главной, desktop-галерея по референсу, мобильная/планшетная лента, категории и количество; опубликовано и проверено. Открытых пунктов этого поручения нет.
