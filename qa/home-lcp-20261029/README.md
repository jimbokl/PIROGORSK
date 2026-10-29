# Мобильный LCP главной — 29.10.2026

Задача: устранить причину переменного LCP главной, сохранить композицию, переключение вкусов, калькулятор, форму и Метрику. Сырые отчёты с идентификаторами сторонних запросов остаются в ignored raw/.

## До изменения

Runtime e3cbdaf. Исторический PSI 27.10: LCP 3.871 с, render delay 2050 мс, P86; отдельный CLI не воспроизвёл. Свежий PSI 29.10 09:02 GMT+2: P100/A100/BP100/SEO100, FCP953 мс, LCP1651 мс, TBT0, CLS0.003. LCP — .tasting-coast img; load delay210 / load160 / render40 мс. https://pagespeed.web.dev/analysis/https-pirogorsk-ru/muq2oa2yop?form_factor=mobile

## Публичная перепроверка неизменённой production

Runtime `e3cbdaf`, обычная Метрика, канонический URL без QA. PSI: Lighthouse13.5.0, HeadlessChromium153.0.8010.36, Moto G Power, slow4G. [Все результаты](public-psi-before.json), без отбора лучшего.

| Время GMT+2 | PSI mobile | LCP, мс | Наблюдаемый render delay, мс |
| --- | --- | --- | --- |
| [09:02:44](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/muq2oa2yop?form_factor=mobile) | 100 | 1651 | 40 |
| [09:09:04](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/53r5t65xi7?form_factor=mobile) | 85 | 4007 | 2000 |
| [09:18:57](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/mis322ten8?form_factor=mobile) | 94 | 3101 | 50 |

Везде A/BP/SEO100. Последний desktop: P100, LCP421мс/TBT0/CLS0.019. CrUX нет. Headline LCP моделируется Lantern, разбивка insight описывает наблюдаемую трассу: их нельзя вычитать друг из друга. Третий отчёт показывает отдельную нестабильность модели при быстром фактическом paint; её причина не установлена.

## Проверки гипотез

- Фоновый LCP — один заранее обнаруженный AVIF800×533, 12589байт, eager/high; повторной загрузки нет. Мобильный CSS уже отключает parallax/transition/mix-blend-mode. Входная анимация на coarse pointer не выполняется.
- [Chrome156, три ранних аудита](before-summary.json): P99/100/100, LCP1862/1618/1302мс, observed render delay8–13мс. Один процесс Chrome, поэтому это не полностью независимые холодные соединения.
- [Fault injection шрифтов](observe-before.json): mobile390×844/DPR1.75, реальное ограничение сети150мс/1.6Mbps, CPU4. URL с `?qa=1` (без Метрики), поэтому не контроль PSI. Искусственная задержка всех шрифтов на2с не задержала фон: LCP1804мс против1724мс, геометрия hero/coast/H1 та же. Отдельно проверены Golos и Playfair. Это не подтверждает гипотезу двухсекундного ожидания шрифтов.
- `chrome153-summary.json` получен **chrome-headless-shell**, который использует old headless и отключает GPU compositing. Эти пять быстрых результатов не эквивалентны new headless PSI. Они сохранены как диагностические, не как подтверждение стабильности.

## Воспроизведение задержки первого кадра

[Полный Chrome for Testing153.0.8010.36](https://googlechromelabs.github.io/chrome-for-testing/), new headless; свежие процесс/профиль каждого из8 запусков; публичная production с Метрикой. В control изменён только RenderDocument в launcher flags. DevTools CPU6.27 и сеть без ограничения: **диагностические observed timings, не PSI и не стандартные баллы**. Порядок stock/control/stock/control/control/stock/control/stock исключает сравнение только одной пары.

| Запуск | Режим | Наблюдаемый LCP, мс | Render delay, мс |
| --- | --- | --- | --- |
| 1 | stock | 3262 | 2249 |
| 2 | RenderDocument | 1462 | 364 |
| 3 | stock | 1316 | 341 |
| 4 | RenderDocument | 1665 | 303 |
| 5 | RenderDocument | 1329 | 323 |
| 6 | stock | 1342 | 326 |
| 7 | RenderDocument | 1417 | 341 |
| 8 | stock | 1678 | 329 |

[Настройки и результаты](browser-diagnostic-summary.json), [воспроизводящий скрипт](browser-diagnostic.mjs). В stock1 ресурс загружен на1014мс, Decode Image завершён около1455мс, Paint на1906мс, первый contentful frame только3262мс. Нет непрерывного main-thread задания на2с; есть длительные промежутки без выдачи кадра. Трасса содержит `ThrottleUndrawnFrames`, но эти события не привязаны к surface, поэтому сами по себе не доказывают принадлежность основной странице.

Это воспроизводит характерную задержку new headless153 и согласуется с открытым [Lighthouse17148](https://github.com/GoogleChrome/lighthouse/issues/17148). В Chromium есть [исправление ожидания surface](https://github.com/chromium/chromium/commit/187751477c43dd00c681fd53db91be73271b7cea). **Не доказано**, что именно оно устраняет все плохие PSI-запуски этой страницы. Единственный медленный stock из4 также не позволяет исключить влияние прогрева по одной серии. Настройки удалённого PSI из репозитория не меняются.

## Изменение и финальная проверка

В `scripts/audit-performance.mjs` исправлена слабость проверки: вместо одного mobile-замера теперь три, каждый в новом процессе/профиле; сохраняются все результаты, версия Chrome, observed LCP и его разбивка отдельно от simulated LCP, min/median/max. Desktop остаётся стандартным Lighthouse desktop. Throttling и браузерные feature flags стандартные; диагностический RenderDocument control не включён в обычный аудит.

[Новая проверка production](final-cli-summary.json), 09:28–09:29 GMT+2, Chrome156/Lighthouse13.5.0: mobile P99/100/99, LCP1685/1368/1706мс; observed render delay55/50/15мс, TBT40/17/3мс, CLS≤0.0031. Desktop P100/LCP506мс. A100/SEO100 обоих; CLI BP77 — сторонние cookies/issues Метрики. [Диапазоны](final-cli-ranges.json). Это локальный CLI по публичному домену, **не** публичный PSI и не данные реальных посетителей.

Изменения HTML/CSS/изображений/форм/аналитики не внесены: проверенные гипотезы не дали подтверждённой причины в коде страницы. **Задача стабильного mobile PSI остаётся открытой**; исправление сайта и устойчивые100 не заявлены. Подтверждены воспроизводимость headless-задержки и пригодная для сравнения проверка. Для следующей правки нужен плохой PSI trace/проверка после обновления его Chromium либо полевые LCP; ещё один случайный успешный PSI проблему не закрывает.
