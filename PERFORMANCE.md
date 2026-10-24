# Скорость production-сборки

Lighthouse 13.5.0. Опубликованный сайт проверен отдельно от локальной сборки. Официальный PageSpeed Insights учитываем отдельно.

## Последний замер — гид Калининграда, 24.10.2026 19:42:09 Калининград

Релиз `80e61827eb5a7f29a6187d79094d03427e0ea4dc`, [CI 40116892879](https://github.com/jimbokl/PIROGORSK/actions/runs/40116892879) SUCCESS. [Официальный PSI — mobile](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-gde-poest-v-kaliningrade/yk9qma3xyb?form_factor=mobile) и [desktop](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-gde-poest-v-kaliningrade/yk9qma3xyb?form_factor=desktop) проверены отдельно.

| Категория | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | **91** | **100** |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

Mobile: FCP 0.8 с, LCP 3.5 с, TBT 10 мс, CLS 0.002, SI 2.1 с. Desktop: FCP 0.3 с, LCP 0.3 с, TBT 10 мс, CLS 0.003, SI 0.4 с. Значения как показаны интерфейсом. CrUX без данных, Agentic browsing 2/2 на обоих. Снимки `qa/screenshots/psi-kal-{mobile,desktop}-20261024.jpg`.

В развёрнутом mobile-аудите LCP — `section.ed-hero > figure.ed-hero-art > picture > img`, `kaliningrad-lunch.O1Vq7ZBe_GFH6B.avif`: TTFB 0 мс, задержка загрузки 170 мс, загрузка 160 мс, задержка отрисовки 990 мс. Изображение eager/high, размеры заданы. В отличие от главной здесь нет CSS-маски; общая причина пока не установлена. Эта трасса не складывается напрямую в смоделированный LCP. Нельзя объявлять восстановленные 100 на всём сайте по успешному отчёту другой страницы.

### Диагностика без изменения кода

24.10 17:46:52 UTC: локальный Lighthouse 13.5.0 с `throttlingMethod=devtools` на публичной главной — Performance 93, FCP 1.6 с, LCP 3.1 с, TBT 50 мс. TTFB 1097 мс, задержка загрузки LCP 398 мс, загрузка 1629 мс, задержка отрисовки **8.7 мс**. Это прямое замедление сети в другом окружении, не официальный PSI и не сопоставимый балл. Большая задержка отрисовки PSI не воспроизвелась: гипотеза о дорогой AVIF-декодировке/маске не подтверждена. Код на основании этого опыта не менялся. Компактное свидетельство — `qa/lcp-render-diagnostic-20261024.json`.

## Предыдущий выпуск — 24.10.2026, 19:22–19:24 Калининград

Релиз `45d995ffad8f3c837a08210d4323c740abfc1542`, [CI 40115451690](https://github.com/jimbokl/PIROGORSK/actions/runs/40115451690) SUCCESS. Обе desktop-вкладки проверены отдельно; это официальный публичный PSI, не локальный Lighthouse.

| Страница / время Europe/Kaliningrad | Mobile Performance | Desktop Performance | Accessibility / Best Practices / SEO |
| --- | ---: | ---: | --- |
| [Главная, li9klo0p4k](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/li9klo0p4k?form_factor=mobile), 19:22:05 | **87** | **100** | 100 / 100 / 100 на обоих |
| [Гид Светлогорска, iv8ywsib2a](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-gde-poest-v-svetlogorske/iv8ywsib2a?form_factor=mobile), 19:24:09 | **100** | **100** | 100 / 100 / 100 на обоих |

Главная mobile: FCP 1.0 с, LCP 4.1 с, TBT 0 мс, CLS 0.003, SI 2.6 с; desktop 0.3 / 0.4 с, TBT 0, CLS 0, SI 0.4 с. Статья mobile: FCP 0.8 с, LCP 1.4 с, TBT 0 мс, CLS 0.013, SI 0.8 с; desktop FCP 0.3 с, LCP 0.4 с, TBT 0, CLS 0.006, SI 0.3 с. Значения записаны как показаны интерфейсом; score calculator округляет иначе. CrUX без данных, Agentic browsing 2/2 на обоих.

Замена `decoding=async` на `sync` у двух eager/high изображений главной **не устранила задержку**. Развёрнутый аудит главной: LCP — `section.hero > div.hero-landscape > picture > img`, ресурс `background.CF7ZZ9Af_285HE2.avif`; TTFB 0 мс, задержка загрузки 180 мс, загрузка 150 мс, задержка отрисовки 1000 мс. Эти этапы относятся к наблюдению трассы и не складываются напрямую в смоделированные 4.1 с. Метрика и слои остаются. Следующая диагностика должна проверять отрисовку слоя, а не повторять неизменный PSI ради балла.

Снимки: `qa/screenshots/psi-home-{mobile,desktop}-svet-20261024.jpg`, `qa/screenshots/psi-svet-{mobile,desktop}-20261024.jpg`. Витрина `/blog/` после добавления восьмой статьи отдельно не измерялась; её последний результат 88/100 приведён ниже и относится к предыдущему выпуску.

## Предыдущий официальный замер — 24.10.2026, 18:52:41 Калининград

Релиз `da17a4d3f2727fdd02303ae1d7b7483db5627b6a`, [CI 40113029047](https://github.com/jimbokl/PIROGORSK/actions/runs/40113029047) SUCCESS. Responsive AVIF preload и четвёртый локальный шрифт доступны на домене. Обе desktop-вкладки проверены отдельно.

| Страница | Mobile Performance | Desktop Performance | Accessibility / Best Practices / SEO |
| --- | ---: | ---: | --- |
| [Блог](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-blog/emmasrz4v2?form_factor=mobile) | **88** | **100** | 100 / 100 / 100 на обоих |
| [Главная](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/yfoqpwx1ye?form_factor=mobile) | **87** | **100** | 100 / 100 / 100 на обоих |

Блог mobile: FCP 0.8 с, LCP 3.7 с, TBT 40 мс, CLS 0, SI 3.5 с. Desktop: FCP 0.2 с, LCP 0.3 с, TBT 10 мс, CLS 0.008, SI 0.4 с. Главная mobile: FCP 1.0 с, LCP 4.1 с, TBT 0, CLS 0.003, SI 2.6 с. Desktop: FCP 0.3 с, LCP 0.5 с, TBT 0, CLS 0.011, SI 0.4 с. CrUX без данных, Agentic browsing 2/2. Снимки `qa/screenshots/psi-{blog,home}-{mobile,desktop}-preload-20261024.jpg`.

Preload не устранил задержку LCP; нельзя считать мобильные 100 восстановленными. Следующая техническая задача — разобрать отрисовку первого изображения на медленной сети и нагрузку ранних ресурсов; не повторять одну и ту же проверку ради удачного балла. Метрика, реальные цели и контент работают без отключений. После этого замера подготовлена редактура внутренних абзацев трёх статей, без изменения кода первого экрана; результат этой версии отдельно не измерен.

## Блог и повторная проверка первого экрана — 24.10.2026

После добавления блога получены отдельные официальные отчёты, релиз `fed8f400adc1c270471fa8f01d632a74a01ee867`:

| Страница / время Europe/Kaliningrad | Mobile Performance | Desktop Performance | Accessibility / Best Practices / SEO |
| --- | ---: | ---: | --- |
| [Блог, gtlfb4g68l](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-blog/gtlfb4g68l?form_factor=mobile), 18:38:07 | 89 | 100 | 100 / 100 / 100 на обоих |
| [Главная, trcth3oxcn](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/trcth3oxcn?form_factor=mobile), 18:38:11 | 86 | 100 | 100 / 100 / 100 на обоих |

Блог mobile: LCP 3.7 с, FCP 0.9 с, TBT 0, CLS 0.002, SI 2.6 с. Главная mobile: LCP 4.1 с, FCP 1.1 с, TBT 0, CLS 0, SI 3.7 с. Блог desktop LCP 0.3 с / TBT 20 мс / CLS 0.006; главная desktop LCP 0.4 с / TBT 0 / CLS 0. CrUX пока без данных. Обе desktop-вкладки проверены независимо, Agentic browsing 2/2. Снимки и предыдущий первый замер блога — [QA выпуска](qa/blog-release-20261024.md).

Уменьшение вариантов обложек сняло предупреждение об их размере, но мобильная отрисовка осталась медленной. Далее опубликован matching responsive preload изображения и позднего Playfair Latin; его результат приведён выше. Метрика не отключалась, контент ради измерения не скрывался. Локальный Lighthouse 100 Performance на публичном блоге — только диагностика, не подмена этих официальных результатов.

## Исторический официальный PageSpeed перед блогом — 24.10.2026


[Mobile](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/hxmesh0nom?hl=ru&form_factor=mobile) и [desktop](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/hxmesh0nom?hl=ru&form_factor=desktop) независимо проверены в официальном интерфейсе Google. Отчёт **24.10.2026 17:54:49 Europe/Kaliningrad / 15:54:49 UTC**, релиз `abce049008b7e07921c474f62b4810bffc366d78`, [CI 40108888625](https://github.com/jimbokl/PIROGORSK/actions/runs/40108888625) SUCCESS. Калькулятор, страницы поводов, гид и явный pageview Метрики уже опубликованы; публичный manifest независимо совпал с локальной сборкой в 15:54:43 UTC.

| Категория | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | **100** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

| Метрика, отображение PSI | Mobile | Desktop |
| --- | ---: | ---: |
| FCP | 1.0 с | 0.3 с |
| LCP | 1.7 с | 0.4 с |
| TBT | 0 мс | 0 мс |
| CLS | 0.003 | 0.014 |
| Speed Index | 1.0 с | 0.4 с |

Agentic browsing 2/2 на обоих. Lighthouse 13.5.0 / HeadlessChromium 153.0.8010.36; mobile Moto G Power, slow 4G. Метрики записаны как показаны интерфейсом, ссылка score calculator округляет некоторые значения иначе. CrUX без данных. Это проверка главной страницы, не всех 30 URL. Метрика не отключалась. Снимки: [mobile](qa/screenshots/psi-mobile-traffic-20261024.jpg), [desktop](qa/screenshots/psi-desktop-traffic-20261024.jpg).

## Предыдущий официальный PageSpeed Insights после подключения Метрики — 24.10.2026

[Мобильный отчёт Google](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/gosvs1aafm?hl=ru&form_factor=mobile) и [компьютер](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/gosvs1aafm?hl=ru&form_factor=desktop) независимо открыты и проверены. Дата отчёта: **24.10.2026 16:12:22 Europe/Kaliningrad (14:12:22 UTC)**. Это официальный PSI на публичном домене после подключения Метрики; код приложения `b7cc1a3`, опубликованная версия на момент проверки `4e92f99` (последний коммит менял документацию).

| Категория | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | **100** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

| Метрика, как показана в PSI | Mobile | Desktop |
| --- | ---: | ---: |
| FCP | 1.1 с | 0.3 с |
| LCP | 1.7 с | 0.5 с |
| TBT | 50 мс | 20 мс |
| CLS | 0 | 0.014 |
| Speed Index | 1.1 с | 0.5 с |

Lighthouse 13.5.0, HeadlessChromium 153.0.8010.36. Mobile: Moto G Power, slow 4G; оба замера — начальная загрузка одной страницы. Agentic browsing: 2/2 на обоих. Полевых данных CrUX пока нет. Баллы относятся к главной странице и этому измерению; товарные страницы не выдаются за проверенные официальным PSI.

Подтверждения: [mobile](qa/screenshots/psi-mobile-final-20261024.jpg), [desktop](qa/screenshots/psi-desktop-final-20261024.jpg). Диагностические рекомендации по кешу, изображениям и стороннему JavaScript в отчёте остаются; оценка всех четырёх категорий — 100. Код сайта ради фиксации результата не менялся, Метрика не отключалась.

## Исторический локальный Lighthouse после подключения Метрики — 24.10.2026

Локальный Lighthouse 13.5 на публичном `https://pirogorsk.ru/`, опубликованный код `b7cc1a3`, 11:05 UTC. Счётчик 113767847 включён и загружается в проверяемой странице.

| Категория | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 100 | 100 |
| Accessibility | 100 | 100 |
| Best Practices | 77 | 77 |
| SEO | 100 | 100 |

Mobile: FCP 1.213 с, LCP 1.250 с, TBT 2.5 мс, CLS 0.00142, Speed Index 2.062 с. Desktop: FCP 0.355 с, LCP 0.537 с, TBT 0, CLS 0.01357, Speed Index 0.355 с.

Best Practices снизился из-за сторонних cookies Яндекса (`third-party-cookies`, `inspector-issues`: Cookie). Ошибок консоли нет. Счётчик при измерении не блокировался и не отключался. Это отдельный локальный запуск Lighthouse на домене; его результат сохранён как исторический и не подменяет актуальный официальный PSI выше. Различие оценок не означает, что отдельное исправление cookies было внесено: код с тех пор не менялся. Санитизированные результаты без URL синхронизации cookies: `qa/metrica-verification-20261024.md`; сырые отчёты остаются локальными.

## Исторический Lighthouse до Метрики — 23.10.2026

Замер `https://pirogorsk.ru/` от 23.10.2026 20:35 UTC, опубликованный commit `38da7a13ca0dcfc811c8b6ee2354b391369776b6`, workflow `40019923031` SUCCESS.

| Категория | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 100 | 100 |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

| Метрика | Mobile | Desktop |
| --- | ---: | ---: |
| FCP | 1.21 с | 0.35 с |
| LCP | 1.40 с | 0.45 с |
| TBT | 0 мс | 0 мс |
| CLS | 0.0022 | 0 |
| Speed Index | 2.13 с | 0.35 с |

Это Lighthouse на публичном домене. 100/100 — результат данного измерения, а не гарантия одинакового балла при любых условиях.

## Предыдущий официальный PageSpeed Insights до Метрики — 23.10.2026

Предыдущий [отчёт Google от 23.10.2026 20:49:42 UTC](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/5dulwgki3a?form_factor=mobile), после публикации preload Golos Latin: **100/100 Performance на мобильном и компьютере; Accessibility / Best Practices / SEO также 100 на обоих**. Agentic browsing 2/2. Lighthouse 13.5.0, HeadlessChromium 153.0.8010.36. Это результат конкретного официального измерения.

| Метрика | Mobile | Desktop |
| --- | ---: | ---: |
| FCP | 1.072 с | 0.265 с |
| LCP | 1.651 с | 0.381 с |
| TBT | 0 мс | 0 мс |
| CLS | 0 | 0.014 |
| Speed Index | 1.072 с | 0.358 с |

Скриншоты: `qa/screenshots/psi-mobile-font-20261023.png`, `psi-desktop-font-20261023.png`. Опубликованный код `b7cf868d199c0547ec1926be3f90fbef6750109e`, workflow `40021592025` SUCCESS; три font preload подтверждены на домене. CrUX пока без данных. Диагностика кеша GitHub Pages и части изображений ниже первого экрана остаётся и не мешает оценке 100.

### Предыдущий официальный замер

[Отчёт Google от 23.10.2026 20:39:50 UTC](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/ktw8leuo8q?form_factor=mobile): mobile Performance **98**, desktop **100**. Accessibility / Best Practices / SEO — **100** на обоих. Lighthouse 13.5.0, HeadlessChromium 153.0.8010.36; mobile Moto G Power, slow 4G. Данных CrUX у нового домена пока нет.

| Метрика | Mobile | Desktop |
| --- | ---: | ---: |
| FCP | 1.051 с | 0.302 с |
| LCP | 1.801 с | 0.421 с |
| TBT | 0 мс | 0 мс |
| CLS | 0 | 0.014 |
| Speed Index | 3.671 с | 0.489 с |

Мобильная критическая цепочка включала поздний `golos-latin.woff2` (714 мс); добавлен preload этого используемого шрифта. После изменения: check/build/SEO PASS, локальный Lighthouse mobile 99 / desktop 100, TBT и CLS 0 на обоих. Новый официальный замер после публикации дал 100 на обоих устройствах (см. выше). Первый официальный отчёт и скриншоты сохранены отдельно: `qa/screenshots/psi-mobile-20261023.png`, `psi-desktop-20261023.png`. Ранняя недоступность PSI больше не воспроизводится.

## Товарная страница

После ограничения hero-изображений их фактической шириной 520px и добавления варианта 700px отдельно проверена `http://127.0.0.1:4322/pirogi/myasnoy-pirog/`, 23.10.2026 20:31–20:32 UTC. Это локальный production preview: mobile Performance 99, desktop 100; Accessibility / Best Practices / SEO 100 на обоих. Mobile LCP 2.11 с, desktop 0.41 с, TBT 0. В этом аудите замечаний image-delivery не осталось. На домене независимо подтверждены новые sizes, загрузка обоих слоёв и переключение 500 г / 1 кг.

## Условия

Стандартный mobile-профиль Lighthouse и официальный desktop-config.js, без изменения throttling. Отдельный headless Chrome, холодное состояние аудита. `npm run check`, `npm run build`, `npm run preview -- --host 127.0.0.1 --port 4322`, затем `npm run audit:performance`. Для проверки домена: `npm run audit:performance -- https://pirogorsk.ru/`.

Astro отдаёт статический HTML; адаптивные AVIF/WebP, локальные WOFF2, небольшой TypeScript без UI-фреймворка. Первый экран использует отдельные подложку и прозрачный пирог. Sizes учитывает фактический размер каждого слоя; приоритет фонового LCP повышен. Остальные изображения загружаются лениво. GitHub Pages задаёт ресурсам cache lifetime 10 минут; этот диагностический пункт остаётся в отчёте и не помешал баллам 100.

## Доказательства

- mobile: `2026-10-23T20:35:12.424Z`, URL `https://pirogorsk.ru/`, `qa/lighthouse-mobile.json` и `.html`.
- desktop: `2026-10-23T20:35:20.578Z`, тот же URL, `qa/lighthouse-desktop.json` и `.html`.
- `qa/performance-summary.json` — сводка последнего запуска (сейчас локальный preview после preload шрифта, 20:44 UTC). Сырые отчёты локальные, исключены из Git; последующий запуск перезаписывает их, время каждого зафиксированного замера указано в этом документе.
- `qa/screenshots/production-home-20261023.png` — главная на публичном домене после публикации.

Typecheck (45 files, 0 errors/warnings/hints), build и SEO-проверка (23 HTML / 21 sitemap URL / 1587 local references) прошли. После добавления preload Golos Latin эти проверки повторены и прошли; commit `b7cf868d199c0547ec1926be3f90fbef6750109e` опубликован workflow `40021592025` SUCCESS. Три preload шрифтов подтверждены на публичном домене.
