# Скорость production-сборки

Последняя локальная проверка — 23.10.2026, Lighthouse 13.5.0, production preview `http://127.0.0.1:4322/`. Графика слоями и новый каталог включены. Это локальный Lighthouse; публичный PageSpeed проверяется отдельно.

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

- mobile: `2026-10-23T20:01:10.224Z`, `qa/lighthouse-mobile.json` и `.html`.
- desktop: `2026-10-23T20:01:16.920Z`, `qa/lighthouse-desktop.json` и `.html`.
- `qa/performance-summary.json` — сводка. Сырые отчёты локальные, исключены из Git.

100/100 — целевой результат, а не гарантия любого запуска. Для текущей версии мобильный результат 99; публичный замер ещё не выполнен. API PageSpeed ранее вернул 429 с нулевой квотой; проверка через официальный интерфейс остаётся доступной.
