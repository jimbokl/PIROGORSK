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

Это Lighthouse на публичном домене. 100/100 — результат данного измерения, а не гарантия одинакового балла при любых условиях. Официальный PSI UI пока сообщает, что не может перейти по URL; API ранее вернул 429 с нулевой квотой. Причину недоступности PSI пока не установили. DNS-проверка 23.10 около 20:33 UTC: Google Public DNS вернул NOERROR и четыре GitHub Pages A-адреса; запросы AAAA и DS также NOERROR без записей. Оснований приписывать ошибку PSI проблеме DNS не нашли.

## Товарная страница

После ограничения hero-изображений их фактической шириной 520px и добавления варианта 700px отдельно проверена `http://127.0.0.1:4322/pirogi/myasnoy-pirog/`, 23.10.2026 20:31–20:32 UTC. Это локальный production preview: mobile Performance 99, desktop 100; Accessibility / Best Practices / SEO 100 на обоих. Mobile LCP 2.11 с, desktop 0.41 с, TBT 0. В этом аудите замечаний image-delivery не осталось. На домене независимо подтверждены новые sizes, загрузка обоих слоёв и переключение 500 г / 1 кг.

## Условия

Стандартный mobile-профиль Lighthouse и официальный desktop-config.js, без изменения throttling. Отдельный headless Chrome, холодное состояние аудита. `npm run check`, `npm run build`, `npm run preview -- --host 127.0.0.1 --port 4322`, затем `npm run audit:performance`. Для проверки домена: `npm run audit:performance -- https://pirogorsk.ru/`.

Astro отдаёт статический HTML; адаптивные AVIF/WebP, локальные WOFF2, небольшой TypeScript без UI-фреймворка. Первый экран использует отдельные подложку и прозрачный пирог. Sizes учитывает фактический размер каждого слоя; приоритет фонового LCP повышен. Остальные изображения загружаются лениво. GitHub Pages задаёт ресурсам cache lifetime 10 минут; этот диагностический пункт остаётся в отчёте и не помешал баллам 100.

## Доказательства

- mobile: `2026-10-23T20:35:12.424Z`, URL `https://pirogorsk.ru/`, `qa/lighthouse-mobile.json` и `.html`.
- desktop: `2026-10-23T20:35:20.578Z`, тот же URL, `qa/lighthouse-desktop.json` и `.html`.
- `qa/performance-summary.json` — сводка текущего доменного замера. Сырые отчёты локальные, исключены из Git.
- `qa/screenshots/production-home-20261023.png` — главная на публичном домене после публикации.

Typecheck (45 files, 0 errors/warnings/hints), build и SEO-проверка (23 HTML / 21 sitemap URL / 1587 local references) прошли. После этого кода не меняли; последующее обновление документации не изменяет проверенную сборку сайта.
