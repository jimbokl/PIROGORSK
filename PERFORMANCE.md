# Скорость production-сборки

## Индивидуальные обложки 23 статей — 26.10, 19:19 Калининград

Runtime `2b6a569`, [CI40366612177 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40366612177). Новая графика: 15 сцен + восемь прежних индивидуальных сцен, оптимизированные AVIF/WebP и отдельные OG. 71 production URL совпал со сборкой. Проверена статья `/journal/rybnaya-nachinka-dlya-piroga/` без QA-параметра, с обычной Метрикой.

| Публичный PSI | P / A / BP / SEO | FCP | LCP | TBT | CLS | SI |
| --- | --- | --- | --- | --- | --- | --- |
| [mobile](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-rybnaya-nachinka-dlya-piroga/uqoytb7fgy?form_factor=mobile) | 90 / 100 / 100 / 100 | 0,9с | 3,6с | 20мс | 0 | 2,8с |
| [desktop](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-rybnaya-nachinka-dlya-piroga/uqoytb7fgy?form_factor=desktop) | 100 / 100 / 100 / 100 | 0,3с | 0,4с | 20мс | 0 | 0,5с |

CrUX нет. В mobile LCP — обложка; исходная разбивка: задержка ресурса210мс, загрузка250мс, отрисовка890мс. По одной разбивке нельзя приписать всю симулированную задержку одной причине. Требование 100 для всех шаблонов не закрыто, замеры прежнего выпуска не подменяются этими. [Показатели и readback](qa/article-artwork-20261026/public-psi-summary.json), [QA](qa/article-artwork-20261026/README.md).

Локальный Lighthouse preview4322 этой статьи: P/A/BP/SEO100 обоих, mobile LCP1,8с / desktop0,4с / TBT0 / CLS0. [Полные локальные отчёты](qa/article-artwork-20261026/local-lighthouse/). Это отдельная среда, не PSI.

## Текущий выпуск SEO-экспансии — 26.10

Runtime `4781207`, [CI40358029315 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40358029315). 42 production URL проверены по HTTP200 и точным хешам сборки. H1 статей использует локальный serif, не ожидающий web-font; остальные гарнитуры сохраняются. Калькуляторы, Метрика и backend не отключались для замеров.

| Страница / режим | P / A / BP / SEO | FCP | LCP | TBT | CLS | SI |
| --- | --- | --- | --- | --- | --- | --- |
| [home / mobile](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/cfapyaq905?form_factor=mobile) | 100 / 100 / 100 / 100 | 1,0 сек. | 1,8 сек. | 0 мс | 0 | 1,0 сек. |
| [home / desktop](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/cfapyaq905?form_factor=desktop) | 100 / 100 / 100 / 100 | 0,3 сек. | 0,4 сек. | 0 мс | 0.003 | 0,4 сек. |
| [scenario / mobile](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-povody-kaliningrad-v-ofis-na-den-rozhdeniya/csb7f9yf5w?form_factor=mobile) | 100 / 100 / 100 / 100 | 0,8 сек. | 1,2 сек. | 20 мс | 0 | 0,8 сек. |
| [scenario / desktop](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-povody-kaliningrad-v-ofis-na-den-rozhdeniya/csb7f9yf5w?form_factor=desktop) | 100 / 100 / 100 / 100 | 0,3 сек. | 0,3 сек. | 20 мс | 0 | 0,3 сек. |
| [guide / mobile](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-pekarni-i-pirogi-v-zelenogradske/xz1lacxsq1?form_factor=mobile) | 91 / 100 / 100 / 100 | 1,0 сек. | 3,5 сек. | 20 мс | 0 | 2,2 сек. |
| [guide / desktop](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-pekarni-i-pirogi-v-zelenogradske/xz1lacxsq1?form_factor=desktop) | 100 / 100 / 100 / 100 | 0,3 сек. | 0,4 сек. | 20 мс | 0 | 0,5 сек. |

Требование 100 на всех проверенных шаблонах остаётся открытым: guide mobile — 91. Это публичный PSI, не локальный Lighthouse. CrUX пока без данных. Главная и офис измерены в 18:17 на `b489707`; их HTML побайтово не изменился в `4781207`. Гид заново измерен после изменения его H1. [Шесть записей и исходные readback](qa/seo-expansion-20261026/public-release-summary.json), [подтверждение неизменности страниц](qa/seo-expansion-20261026/unchanged-controls.json).

История сохранена: неудачная правка preload `baf9b3c` дала mobile86 у главной; её отменили. Optional-font `b489707` дал офис100, но гид91. Эти результаты не скрыты и не считаются доказательством единственной причины. Локальный системный H1 дал 100/100; он учитывается отдельно.

Контроль без изменения кода, 18:28 Калининград: [повторный публичный PSI](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-pekarni-i-pirogi-v-zelenogradske/va0lqtpzzm?form_factor=mobile) снова дал гиду mobile91 / desktop100, A/BP/SEO100. Mobile LCP3,5с, TBT40мс, CLS0. Результат не списывается на случайность; требование 100 остаётся открытым. [Исходные показатели](qa/seo-expansion-20261026/public-guide-repeat-summary.json).


## SEO-экспансия — публичный PSI 26.10, 17:55 Калининград

Runtime `0a59bc6`, CI40353514687 SUCCESS. Проверены три URL на домене без QA-параметра, с обычной Метрикой. Все шесть вкладок прочитаны отдельно. Lighthouse13.5.0, CrUX — нет данных.

| Страница / режим | P / A / BP / SEO | FCP | LCP | TBT | CLS | SI |
| --- | --- | --- | --- | --- | --- | --- |
| [home / mobile](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/a321688j2u?form_factor=mobile) | 100 / 100 / 100 / 100 | 1,0 сек. | 1,7 сек. | 10 мс | 0.007 | 1,0 сек. |
| [home / desktop](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/a321688j2u?form_factor=desktop) | 100 / 100 / 100 / 100 | 0,3 сек. | 0,4 сек. | 20 мс | 0.006 | 0,5 сек. |
| [scenario / mobile](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-povody-kaliningrad-v-ofis-na-den-rozhdeniya/vmor67q97l?form_factor=mobile) | 92 / 100 / 100 / 100 | 0,9 сек. | 3,3 сек. | 30 мс | 0 | 2,2 сек. |
| [scenario / desktop](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-povody-kaliningrad-v-ofis-na-den-rozhdeniya/vmor67q97l?form_factor=desktop) | 100 / 100 / 100 / 100 | 0,3 сек. | 0,3 сек. | 10 мс | 0 | 0,3 сек. |
| [guide / mobile](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-pekarni-i-pirogi-v-zelenogradske/o77ij6noka?form_factor=mobile) | 100 / 100 / 100 / 100 | 1,0 сек. | 1,4 сек. | 20 мс | 0 | 1,0 сек. |
| [guide / desktop](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-pekarni-i-pirogi-v-zelenogradske/o77ij6noka?form_factor=desktop) | 100 / 100 / 100 / 100 | 0,3 сек. | 0,4 сек. | 10 мс | 0 | 0,4 сек. |

После переноса краткой таблицы на первый экран гид поднялся с P90 до P100 mobile. Офис остался P92 mobile: LCP3.3с, задержка отрисовки H1 около1300мс; CLS0. Причина не установлена. Требование 100 на всех новых шаблонах пока не выполнено. Локальные 100 не подменяют этот публичный результат.

Первый runtime `5edf6af`, 17:39: главная100/100, офис92/100, гид90/100 (mobile/desktop), остальные категории100. Сохранены оба этапа: [исходные](qa/seo-expansion-20261026/public-initial-summary.json), [после первого экрана](qa/seo-expansion-20261026/public-first-screen-summary.json), тексты в той же папке.

## Завтраки в Зеленоградске — публичный PSI 26.10, 16:16 Калининград

Опубликованный runtime `f585200`, CI40337317191 SUCCESS; production совпала со сборкой. Один публичный отчёт [dt2qwod6z3](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-gde-pozavtrakat-v-zelenogradske/dt2qwod6z3?form_factor=mobile) от **26.10.2026 16:16:19 GMT+2**, Lighthouse13.5.0 / HeadlessChromium153.0.8010.36. Обычная production-конфигурация Метрики сохранена; URL теста без QA-флага.

| Режим | P / A / BP / SEO | FCP | LCP | TBT | CLS | SI |
| --- | --- | --- | --- | --- | --- | --- |
| Mobile | **100 / 100 / 100 / 100** | 0.8с | 1.4с | 0мс | 0.005 | 0.8с |
| Desktop | **100 / 100 / 100 / 100** | 0.3с | 0.3с | 10мс | 0.004 | 0.4с |

Здесь показаны видимые округлённые показатели интерфейса. CrUX — нет данных. Результат относится к новой статье, не доказывает исправление прежних mobile88 у блога и91/95 у статьи доставки. Локальный CLI с исключённой по hostname Метрикой также100/100, учитывается отдельно. Скриншоты, текст отчёта и компактный JSON: `qa/screenshots/breakfast-guide-20261026/psi-*`, `qa/breakfast-public-psi-20261026.json`. Повторного анализа неизменной страницы ради балла не проводили.

## Статья после стабилизации — публичный PSI 26.10, 15:39 Калининград

Опубликован runtime `2d3ca0c`, [CI 40331597138 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40331597138). Production совпала со сборкой. Публичный отчёт **1desv5tjcc**, 26.10.2026 15:39:49 Europe/Kaliningrad, Lighthouse13.5.0, CrUX без данных:

| Режим | P / A / BP / SEO | FCP / LCP / TBT | CLS / SI |
| --- | --- | --- | --- |
| [Mobile](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-dostavka-edy-v-zelenogradske/1desv5tjcc?form_factor=mobile) | **91 / 100 / 100 / 100** | 870 / 3493 / 27 мс | 0.005 / 2211 мс |
| [Desktop](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-dostavka-edy-v-zelenogradske/1desv5tjcc?form_factor=desktop) | **95 / 100 / 100 / 100** | 230 / 329 / 0 мс | 0.141 / 330 мс |

Мобильный CLS улучшился с0.09 до0.005; desktop вырос с0.088 до0.141. Отчёт связывает основной сдвиг `.ed-hero-copy` с загрузкой Golos Cyrillic, но это не доказательство единственной причины. Изолированные локальные задержки Golos/Playfair на Mac не повторили большой сдвиг. Сохранённые первые два desktop-кадра показывают одинаковый трёхстрочный H1 и почти одинаковое расположение текста; кадры могут пропустить ранний сдвиг. Desktop CLS и mobile LCP3.5с остаются открытыми.

Контролируемый опыт с WOFF2+2000мс дал 0.085672→0.003218 на390px и0.087161→0.023871 на1350px. Локальный LH13.5.0 26.10 13:23UTC — P/A/BP/SEO100 обоих, LCP1812/428мс, TBT0, CLS0; локальный hostname исключает Метрику. Это не публичные баллы. Production счётчик сохранён; явная QA-сессия проверена отдельно. [Протокол и доказательства](qa/layout-20261026/README.md). Новый публичный тест неизменного кода не запускался.

## Новый гид доставки — публичный PSI 26.10, 14:53 Калининград

Runtime `e4f5bf4`, новая страница `/journal/dostavka-edy-v-zelenogradske/`. [Публичный mobile](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-dostavka-edy-v-zelenogradske/1eu8qmvnk3?form_factor=mobile) — **89**, LCP3486мс / TBT26мс / CLS0.09; [desktop](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-dostavka-edy-v-zelenogradske/1eu8qmvnk3?form_factor=desktop) — **98**, LCP327мс / TBT28мс / CLS0.088. Accessibility / Best Practices / SEO100 в обоих режимах; CrUX нет. Счётчики/скрипты не отключались ради балла. Подробности и видимые отчёты: `qa/traffic-20261026/delivery-public-psi.json`, `delivery-psi-*-initial*.txt`, `qa/screenshots/delivery-guide-20261026/psi-*-initial.png`.

CLS отмечен для `article.blog-article`; в mobile LCP breakdown — render delay1000мс. Это признаки для диагностики, не установленная причина. Локальный CLI новой статьи дал P100/100, A/SEO100, BP77 (Yandex third-party cookie / Issues), с LCP1663/404мс и CLS0. Он не заменяет публичные 89/98. Новая трасса CLI по публичному `/blog/` дала P100/LCP1575мс/render2.92мс и не воспроизвела публичные 88/LCP3.6с/render1980мс. Причина расхождения не установлена, speculative rendering fixes не делались. Санитизированная трасса: `qa/traffic-20261026/blog-trace-summary.json`. Последние публичные баллы блога остаются 88 mobile / 100 desktop.

Lighthouse 13.5.0. Опубликованный сайт проверен отдельно от локальной сборки. Официальный PageSpeed Insights учитываем отдельно.

## Блог и гид Зеленоградска — 26.10.2026

Первый runtime `cb061ad`, [CI 40320349147 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40320349147): новая обложка и три кафе в гиде, он же главный материал блога. Главная не изменилась и сохранила HTML выпуска с центрированием пирога. Production сверена со сборкой, HTTP 200.

| Страница / публичный PSI | Mobile P / A / BP / SEO | Desktop P / A / BP / SEO | Mobile LCP / TBT / CLS | Desktop LCP / TBT / CLS |
| --- | --- | --- | --- | --- |
| [Гид, ivztaq4855](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-gde-poest-v-zelenogradske/ivztaq4855?form_factor=mobile), 14:14:30 Калининград | **100 / 100 / 100 / 100** | **100 / 100 / 100 / 100** | 1.5 с / 20 мс / 0 | 0.3 с / 10 мс / 0 |
| [Блог, on9ftsivld](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-blog/on9ftsivld?form_factor=mobile), 14:14:26 | **89 / 100 / 100 / 100** | **100 / 100 / 100 / 100** | 3.6 с / 10 мс / 0 | 0.3 с / 30 мс / 0.026 |

В мобильном отчёте блога LCP-изображение AVIF 27 КБ загружалось с высоким приоритетом; основная задержка — отрисовка 1950 мс. После изменения только `decoding="sync"` на `"async"` локальный Lighthouse дал **100 mobile / 100 desktop**, мобильный LCP 1.7 с против 3.0 с в исходном локальном замере (P93). A100/BP77/SEO100 локально; BP связан со сторонними cookies/issues Метрики, интеграция сохранена. Это один эксперимент, который не устанавливает единственную причину переменной задержки.

Async-runtime `e0b88e4` опубликован, [CI 40321639727 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40321639727); production HTML совпал со сборкой. Новый [публичный PSI e3xbz9fgep](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-blog/e3xbz9fgep?form_factor=mobile), **26.10 14:24:01 Калининград**: **P88 mobile / P100 desktop**, A/BP/SEO по 100. Mobile FCP 0.8 с / LCP 3.6 с / TBT 80 мс / CLS 0 / SI 3.6 с; desktop 0.4 с / 0.4 с / 60 мс / 0.004 / 0.6 с. Отрисовка LCP задерживается на 1980 мс при загрузке 160 мс. Локальный выигрыш не подтвердился на домене, проблема остаётся открытой; async не считается её решением. Неизменный код ради удачного балла повторно не тестировали. Следующий технический шаг — трассировка публичной задержки, без отключения Метрики или изменения интеграций. CrUX на этих страницах пока без данных. Доказательства: `qa/traffic-20261026/`, [QA](qa/zelenogradsk-guide-20261026.md).

## Центрирование пирога — 26.10.2026

Runtime `219b240`, [CI 40316808707 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40316808707). Свежий официальный [PSI 3gi82ys8hq](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/3gi82ys8hq?form_factor=mobile), 26.10.2026 13:44:38 Europe/Kaliningrad: **100 mobile / 100 desktop**, A/BP/SEO по 100. Mobile FCP 1.0 с / LCP 1.7 с / TBT 0 / CLS 0.003 / SI 1.0 с; desktop 0.3 с / 0.4 с / 0 / 0.003 / 0.4 с. Обе вкладки прочитаны отдельно, один анализ после правки. Это отдельный публичный результат; локальный LH 98/100 указан отдельно. CrUX пока без данных.

## Выразительная главная и восьмой пирог — 26.10.2026

Первый выпуск `884219b`: [публичный PSI 75gwyvq9i4](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/75gwyvq9i4?form_factor=mobile) **87 mobile / 99 desktop**. После сокращения вступления и замены некомпозитного stroke-dashoffset на transform (`7f3c54b`): [b96owxkdni](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/b96owxkdni?form_factor=mobile) **87 / 99**. Задержка мобильного LCP сохранилась; эти правки её не устранили.

`c2a13d6`, [CI 40313544387 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40313544387): на touch первый кадр сразу статичен, убраны лишние transform/blend/filter; смена вкусов и scroll motion сохранены. [PSI 8v8kevqfni](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/8v8kevqfni?form_factor=mobile), 13:17:53 Europe/Kaliningrad — **87 mobile / 100 desktop**, A/BP/SEO 100. Mobile FCP 1.0 с / LCP 3.8 с / TBT 0 / CLS 0 / SI 4.0 с. Desktop FCP 0.3 с / LCP 0.4 с / TBT 0 / CLS 0 / SI 0.3 с. Подложка — мобильный LCP, render delay 2000 мс.

Финальный runtime **`b5e6b2e`**, [CI 40315000160 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40315000160), включает простое градиентное перекрытие вместо CSS-маски и компактную композицию на невысоких экранах ноутбуков. Production сверена со сборкой по SHA-256: главная, новый пирог, блог и sitemap — HTTP 200, точное совпадение.

26.10.2026 **13:30:52 Europe/Kaliningrad** — новый официальный публичный [PSI budopejsat](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/budopejsat?form_factor=mobile):

| Режим | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | SI |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| [Mobile](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/budopejsat?form_factor=mobile) | **100** | **100** | **100** | **100** | 0.9 с | 1.7 с | 0 мс | 0.003 | 0.9 с |
| [Desktop](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/budopejsat?form_factor=desktop) | **100** | **100** | **100** | **100** | 0.3 с | 0.4 с | 20 мс | 0.007 | 0.5 с |

Обе вкладки прочитаны отдельно. Lighthouse 13.5.0; CrUX пока без данных; Agentic browsing 2/2. Тексты: `qa/psi-motion-b5e6b2e-{mobile,desktop}.txt`; снимки `qa/screenshots/design-motion-20261026/psi-final-*.png`. Это один новый анализ после изменения runtime; не повторяли неизменный код ради удачного балла. 100/100 подтверждены для финального выпуска, но один замер не доказывает устойчивое устранение прежнего переменного медленного LCP или его причину.

Локальный мобильный LH с градиентом: **P98 / LCP 2.3 с**, фактический element render delay 71 мс. Это отдельная диагностика. Метрика не отключалась, UA-особых веток для теста нет.

Подробности и доказательства: [QA](qa/design-motion-20261026.md). Предыдущие 100/100 ниже относятся к другому runtime.

## Предыдущий дизайн — 26.10.2026 12:06

26.10.2026 12:06:04 Europe/Kaliningrad, runtime `334a93856ffab9e5f6b2982d2557b121112b2a4a`, [CI 40304164336 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40304164336). Главная проверена на домене после публикации. HTML главной/товара/блога и sitemap побайтово совпали с локальной сборкой, HTTP 200: [proof](qa/design-refresh-production-20261026.json).

| Режим | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | SI |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| [Mobile](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/qz48pestwa?form_factor=mobile) | **100** | **100** | **100** | **100** | 1.0 с | 1.8 с | 10 ms | 0.008 | 1.4 с |
| [Desktop](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/qz48pestwa?form_factor=desktop) | **100** | **100** | **100** | **100** | 0.3 с | 0.5 с | 40 ms | 0.013 | 0.6 с |

Обе вкладки открыты отдельно. Lighthouse 13.5.0, mobile Moto G Power / slow 4G; CrUX пока без данных, Agentic browsing 2/2. Текст отчётов — `qa/psi-design-20261026-mobile.txt` и `qa/psi-design-20261026-desktop.txt`; снимки — `qa/screenshots/design-20261026/psi-*.png`. Это один новый публичный анализ: он подтверждает результат данного выпуска, но не доказывает устранение прежнего переменного медленного LCP. Дополнительных повторов ради балла не было; Метрика не отключалась.

## Предыдущая проверка — главная, 25.10.2026 20:25–20:30 Калининград

По запросу пользователя проверен открытый во внешнем Chrome отчёт **86**, затем выполнены два новых официальных публичных анализа без изменения кода. Опубликованный runtime — `c6174f1b29496d6f33028d505245f0bbbc6a4b2c` (обновление айдентики). HTML production совпал с локальным `site/index.html`: SHA-256 `edd832718292c37dce29fec855f05a06cd4471e8ed00f77fee5b6bbd9c2fe356`.

| Отчёт / время Europe/Kaliningrad | Mobile Performance | Desktop Performance | Mobile FCP / LCP / TBT / CLS / SI |
| --- | ---: | ---: | --- |
| [Открытый пользователем, fshq3ex14t](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/fshq3ex14t?hl=ru&form_factor=mobile), 20:25:07 | **86** | Не проверен | 1.0 с / 4.1 с / 60 мс / 0 / 3.7 с |
| [Свежий, czeot7hm4z](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/czeot7hm4z?form_factor=mobile), 20:29:15 | **100** | **[100](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/czeot7hm4z?form_factor=desktop)** | 1.0 с / 1.8 с / 0 мс / 0 / 1.2 с |
| [Контрольный, n7ftihet7m](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/n7ftihet7m?form_factor=mobile), 20:30:02 | **100** | Не проверен | 1.0 с / 1.8 с / 30 мс / 0 / 1.0 с |

Accessibility / Best Practices / SEO — **100 / 100 / 100** во всех четырёх прочитанных результатах. Desktop свежего отчёта: FCP 0.3 с, LCP 0.5 с, TBT 20 мс, CLS 0.014, SI 0.5 с. Значения как показаны интерфейсом. Lighthouse 13.5.0; mobile Moto G Power / slow 4G. CrUX пока без данных, Agentic browsing 2/2.

В открытом и первом свежем mobile-отчётах LCP — тот же `section.hero > div.hero-landscape > picture > img`, `background.CF7ZZ9Af_285HE2.avif`, eager/high, `decoding=sync`. Разница в наблюдаемой трассе:

| Этап LCP | Отчёт 86 | Свежий отчёт 100 |
| --- | ---: | ---: |
| TTFB | 0 мс | 0 мс |
| Задержка загрузки | 250 мс | 50 мс |
| Длительность загрузки | 150 мс | 140 мс |
| Задержка отрисовки | **1980 мс** | **60 мс** |

Этапы трассы не складываются напрямую в смоделированный LCP. Причина переменной задержки отрисовки **не установлена**; эти измерения не доказывают вину логотипа, Метрики, AVIF или CSS-маски. Сходные 86–87 на главной были до обновления айдентики. Два новых результата 100 показывают достижимость балла на текущем коде, но не доказывают устранение медленного сценария или стабильные 100. Изменений runtime, отключений интеграций и повторного деплоя в этой проверке не было. Общая оговорка о вариативности измерений — [официальная документация Lighthouse](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md).

Доказательства: `qa/psi-20261025-{opened-mobile,fresh-mobile,fresh-desktop,repeat-mobile}.txt` и одноимённые PNG в `qa/screenshots/`. Контрольный mobile screenshot показывает все четыре оценки 100; desktop screenshot сохранён на диагностике, его оценки подтверждены текстом интерфейса. Проверка завершена; при дальнейшей оптимизации нужна воспроизводимая диагностика задержки отрисовки, а не выбор удачного отчёта. Исторические результаты других URL ниже остаются действующими для указанных выпусков.

## Предыдущий замер — гид Калининграда, 24.10.2026 19:42:09 Калининград

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
