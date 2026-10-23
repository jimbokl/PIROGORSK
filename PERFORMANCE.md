# Скорость production-сборки

Lighthouse 13.5.0. Опубликованный сайт проверен отдельно от локальной сборки. Официальный PageSpeed Insights учитываем отдельно.

## Опубликованный сайт

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

## Официальный PageSpeed Insights

Последний [отчёт Google от 23.10.2026 20:49:42 UTC](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/5dulwgki3a?form_factor=mobile), после публикации preload Golos Latin: **100/100 Performance на мобильном и компьютере; Accessibility / Best Practices / SEO также 100 на обоих**. Agentic browsing 2/2. Lighthouse 13.5.0, HeadlessChromium 153.0.8010.36. Это результат конкретного официального измерения.

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
