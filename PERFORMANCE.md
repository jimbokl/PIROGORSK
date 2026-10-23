# Скорость production-сборки

Lighthouse 13.5.0. Проверены и production preview, и опубликованный сайт. Официальный PageSpeed Insights учитываем отдельно.

## Опубликованный сайт

Замер `https://pirogorsk.ru/` от 23.10.2026 20:08 UTC, commit `60a3d5f`. Mobile Performance 99, Desktop 100. Accessibility, Best Practices и SEO — 100 на обоих профилях.

| Метрика | Mobile | Desktop |
| --- | ---: | ---: |
| FCP | 1.26 с | 0.35 с |
| LCP | 1.26 с | 0.41 с |
| TBT | 7.5 мс | 0 мс |
| CLS | 0.0014 | 0 |
| Speed Index | 2.73 с | 0.35 с |

Это Lighthouse на публичном домене. Официальный PSI UI пока сообщает, что не может перейти по URL; API ранее вернул 429 с нулевой квотой. Причину недоступности PSI пока не установили.

## Локальная сборка после уточнения размеров изображений

23.10.2026 20:17 UTC, `http://127.0.0.1:4322/`. В этом замере ещё нет последующей правки текста и выбора размера на товарных страницах; главная и её графика соответствуют проверенной версии.

| Категория | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 99 | 100 |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

| Метрика | Mobile | Desktop |
| --- | ---: | ---: |
| FCP | 1.3 s | 0.3 s |
| LCP | 2.2 s | 0.6 s |
| TBT | 0 ms | 0 ms |
| CLS | 0 | 0 |
| Speed Index | 1.3 s | 0.3 s |

## Условия

Стандартный mobile-профиль Lighthouse и официальный desktop-config.js, без изменения throttling. Отдельный headless Chrome, холодное состояние аудита. `npm run check`, `npm run build`, `npm run preview -- --host 127.0.0.1 --port 4322`, затем `npm run audit:performance`. Для проверки домена: `npm run audit:performance -- https://pirogorsk.ru/`.

Astro отдаёт статический HTML; адаптивные AVIF/WebP, локальные WOFF2, небольшой TypeScript без UI-фреймворка. Первый экран использует отдельные подложку и прозрачный пирог. Sizes учитывает фактический размер пирога, приоритет фонового LCP повышен. Остальные изображения загружаются лениво.

## Доказательства

- mobile: `2026-10-23T20:17:17.452Z`, `qa/lighthouse-mobile.json` и `.html`.
- desktop: `2026-10-23T20:17:23.359Z`, `qa/lighthouse-desktop.json` и `.html`.
- `qa/performance-summary.json` — сводка. Сырые отчёты локальные, исключены из Git.

100/100 — целевой результат. Новый доменный замер выполняется после публикации правок; отчёты будут заменены его результатами с точным URL и временем.
