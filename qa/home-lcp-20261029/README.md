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

## Последующее поручение: применить визуальный референс

Пользователь прислал три приёма: стеклянные карточки, журнальная типографика, hover с инерцией. Реализованы в светлой палитре Пирогорска, только на главной. H1/H2 600 / 1.05 / −.035em и тёмный градиент; карточки с полупрозрачной поверхностью, белым верхним краем, inline SVG-шумом 2%; blur24px только при width≥761px + hover/fine pointer. Hover500ms (.16,1,.3,1) /−4px; reduced motion отключает подъём и transitions; forced colors/повышенный контраст/print сохраняют сплошной текст. JS, шрифты, данные и аналитика прежние.

Локально check/build/SEO и обе browser fixtures PASS. Визуально проверены 320/390/1280px, overflow отсутствует; mobile computed backdrop-filter:none; выбор1кг даёт1290₽ и эту же строку в подборке. [Скриншот desktop](home-glass-desktop.png), [320px](home-glass-mobile-320.png).

[Три local mobile + desktop](design-local-summary.json), [диапазоны](design-local-ranges.json): mobile98/99/98, LCP2368/2201/2287мс; desktop100/LCP524мс, остальные категории100. Протокол: Chrome156 / LH13.5 / стандартная симуляция; URL preview4322, обычный код с подавлением аналитики на localhost. Это отдельная среда, не доказательство улучшения относительно production.

## Проверка визуального выпуска на production

Runtime `e6af7ddb7283c8264e90ee22521a4ae47774ef3d`, [CI40837674941 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40837674941), включая Node/Worker/browser, SEO и совместимость опубликованных Pages/Worker. На09:59 GMT+2 production HTML с inline CSS точно совпадает со сборкой по SHA-256, Worker/D1 healthy, published release check PASS. [Readback](design-production-readback.json). В браузере desktop1280px: H2 font600/line-height1.05/−.035em и gradient, карточки blur24px/transition.5s; на320px blur:none, overflow0. [Production desktop](home-glass-production.png), [production320px](home-glass-production-320.png). Режим reduced motion проверен по условиям CSS, отдельная системная эмуляция не выполнялась.

[Production CLI Chrome156](design-production-summary.json), [диапазоны первоначальной серии](design-production-ranges.json), 09:54–09:55 GMT+2: три mobile99/99/100, LCP1736/1833/1749мс, observed LCP1585/853/1180мс, render33/44/49мс. Все процессы/профили свежие, стандартная симуляция, обычная Метрика. Desktop первоначально60/LCP4152мс, observed LCP1293мс/render20мс. В сетевых данных Playfair cyrillic/latin отвечают около3.9с; диагностика maxServerLatency3810мс, simulated TTFB3970мс. Это свидетельство сетевого выброса в этом отчёте, не доказательство причины всех случаев нестабильности. [Диагностика](design-desktop-outlier.json).

Для проверки выброса выполнены ещё **два** desktop-запуска с теми же Lighthouse desktop settings и свежими процессами, 09:58 GMT+2. P99/99, LCP621/595мс, observed LCP1537/1406мс, render46/38мс. [Все контрольные запуски](design-desktop-followup.json). Первоначальный60 сохранён, общий desktop-диапазон595–4152мс. CLI A100/SEO100; BP77 — прежние сторонние cookies/issues Метрики.

[Публичный PSI](public-psi-design.json), отчёт09:56:55 GMT+2, LH13.5.0 / HeadlessChromium153.0.8010.36: [mobile85](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/a0jll2o1fz?form_factor=mobile), LCP4002/FCP1033/TBT0/SI3974мс, CLS0; [desktop100](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/a0jll2o1fz?form_factor=desktop), LCP401/FCP277/TBT0/SI436мс, CLS.033. Остальные категории100, CrUX нет. Mobile insight: TTFB10/loadDelay170/load200/render1940мс (округлённые значения UI), тот же `.tasting-coast img`.

Визуальное поручение реализовано и опубликовано. **Публичная mobile-задержка воспроизводится после изменений; исправление нестабильного LCP не заявлено.** Сайт проверен без искусственной задержки/подавления production-аналитики и без специальных launcher flags.

## Повторное расследование: font preload — 10:26–10:36 GMT+2

На неизменённом e6af7dd публичный PSI вновь дал [100/LCP1651мс](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/pwu5wnhf2m?form_factor=mobile) и [86/LCP3859мс/render2000мс](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/c0alhxd5b1?form_factor=mobile). [Данные контрольных запусков](font-fix-psi-controls.json).

Дополнительные контролируемые серии: один production HTML, перехвачен только ответ главной; оригинальные ресурсы и Метрика, каждый раз новый полный Chrome153.0.8010.36/profile, CPU6.27, сеть без ограничения. **Это observed диагностика, а не публичный PSI и не стандартные performance scores.** [Скрипт](render-variants.mjs), [слои/decode/системные шрифты с preload](render-variants-summary.json), [изоляция DOM/JS/fonts](render-isolation-summary.json), [предзагрузка шрифтов](render-font-priority-summary.json).

| Вариант | FCP, мс | LCP, мс | Render delay, мс |
| --- | --- | --- | --- |
| Исходный, в начале/конце | 2216 / 2307 | 2216 / 2307 | 1099 / 1401 |
| Только без font preload, прямой/обратный порядок | 131 / 128 | 1157 / 963 | 86 / 124 |
| Только Cyrillic preload | 2330 / 2302 | 2330 / 2302 | 1627 / 1197 |
| Только font-display:optional | 2316 / 2267 | 2316 / 2273 | 1472 / 1020 |

Возврат исходного HTML возвращает задержку. NoFonts тоже ускорял FCP, однако подмена только CSS-переменных шрифтов с сохранёнными preload задержку не убирала. Bare обрезает основное содержимое и тоже ускоряется, но не является допустимой продуктовой правкой. NoScripts, content-visibility, положительные z-index и async decode не устраняют задержку.

Выбрана узкая правка: главная передаёт SeoHead preloadFonts=false. Шрифты загружаются из уже встроенного @font-face с прежним swap и unicode-range. LCP image preload/eager/high, оформление, содержимое и Метрика сохранены. Остальные страницы сохраняют прежние четыре font preload. Это устраняет воспроизведённый триггер; точный внутренний Chromium surface-throttling path этим опытом не доказан.

Check/build/SEO/expansion/map/artwork и29 Node tests PASS, UI320/390/1280 overflow0. [Local стандартный Lighthouse](font-fix-local-summary.json), [диапазоны](font-fix-local-ranges.json): mobile98/99/98, LCP2201/2037/2262мс, render51–61мс, CLS≤.0063; desktop100/LCP484мс. Публикация/публичные PSI ещё ожидаются.
