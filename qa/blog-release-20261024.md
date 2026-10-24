# Блог — проверка выпуска 24.10.2026

- Витрина `/blog/`, семь материалов в трёх рубриках; три новые статьи и три новые обложки ImageGen.
- Старые адреса journal сохранены, новые в sitemap; Blog/BlogPosting/BreadcrumbList, уникальные метаданные и OG.
- `npm run check`: 0 errors/warnings/hints. `npm run build`: 36 pages. `verify-seo`: 34 sitemap URLs, 2205 local references after image/UTM follow-up. 14 tests PASS. Shared registry `check --strict`: passed=true, no drift.
- UI: desktop 1440, mobile 390, article table 320 px. Нет горизонтального переполнения; оглавление ведёт к таблице, ссылка статьи открывает калькулятор. Новые страницы не отправляют заявку при чтении.
- Снимки `screenshots/blog-{desktop,mobile}-20261024.jpg`, `screenshots/blog-table-320-20261024.jpg`.
- Native Chrome, Метрика 113767847, «Сегодня», 24 октября: 7 посетителей, 8 визитов, 13 просмотров; все 8 визитов прямые. Возможный QA не отделён. Это исходная общая статистика, не подтверждённый спрос. Снимок `screenshots/metrica-baseline-blog-20261024.jpg`.
- Официальный PSI до выпуска: главная `hxmesh0nom`, 100 во всех четырёх категориях mobile/desktop; это прежняя главная.

## Публикация и первый замер

Коммит `76ce20801b959e5e103884ea8a1ede6fecbc522a`, [CI 40111425400](https://github.com/jimbokl/PIROGORSK/actions/runs/40111425400) SUCCESS. IndexNow: HTTP 200, 34 URL, `2026-10-24T16:28:02.987Z`; receipt `/tmp/pirogorsk-blog-indexnow-20261024/report.json`. Публичные статьи, блог и sitemap возвращают HTTP 200, канонические адреса совпадают.

Первый официальный PSI блога — [mobile](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-blog/pk4gi5chtq?form_factor=mobile), [desktop](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-blog/pk4gi5chtq?form_factor=desktop), 24.10 18:28:37 Europe/Kaliningrad. Mobile: Performance 89, остальные категории 100; FCP 0.9 с, LCP 3.6 с, TBT 40 мс, CLS 0. Desktop: все четыре категории 100; FCP 0.3 с, LCP 0.4 с, TBT 20 мс, CLS 0. CrUX без данных.

Диагностика указала на слишком большой вариант ведущей обложки и задержку отрисовки LCP. Подготовлены варианты 360/480/680/960 px, точный `sizes` и качество 48. Новый замер нужен после публикации; причинность всей задержки одним размером изображения не утверждается.

Локальный Lighthouse на публичном блоге — отдельная диагностика, `/tmp/pirogorsk-blog-lh-before.json`: Performance/A/SEO 100, Best Practices 77 (third-party cookies / Issues), LCP 1.696 с. Это не официальный PSI и не замена его mobile 89.

## Поисковые консоли после блога

24.10 около 16:35 UTC Google Search Console подтвердил повторную отправку `https://pirogorsk.ru/sitemap.xml`: «Файл Sitemap отправлен». До отправки строка карты: обработка 23.10, успешно, 21 выявленная страница. Свежие 34 публичных URL ещё не считаются обнаруженными или проиндексированными Google. Отчёт эффективности ресурса `sc-domain:pirogorsk.ru` показывает только 22.10 — 0 кликов и 0 показов, обновлён 3.5 часа назад.

Яндекс.Вебмастер после обновления всё ещё сообщает «Только для чтения», добавление disabled. Ручная отправка в Яндекс не заявляется. Снимки: `screenshots/gsc-blog-sitemap-sent-20261024.jpg`, `screenshots/gsc-baseline-blog-20261024.jpg`, `screenshots/yandex-sitemap-blog-readonly-20261024.jpg`.


## Повтор после уменьшения обложек

Опубликован `fed8f400adc1c270471fa8f01d632a74a01ee867`, [CI 40112150464](https://github.com/jimbokl/PIROGORSK/actions/runs/40112150464) SUCCESS. IndexNow принял 34 URL, HTTP 200, `2026-10-24T16:37:36.501Z`.

| Страница, официальный PSI 24.10 | Mobile Performance | Desktop Performance | Остальные категории |
| --- | ---: | ---: | --- |
| [Блог, gtlfb4g68l, 18:38:07 Калининград](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-blog/gtlfb4g68l?form_factor=mobile) | 89 | 100 | 100 на обоих |
| [Главная, trcth3oxcn, 18:38:11 Калининград](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/trcth3oxcn?form_factor=mobile) | 86 | 100 | 100 на обоих |

Блог mobile: FCP 0.9 с, LCP 3.7 с, TBT 0, CLS 0.002, SI 2.6 с; desktop: FCP 0.3 с, LCP 0.3 с, TBT 20 мс, CLS 0.006, SI 0.4 с. Главная mobile: FCP 1.1 с, LCP 4.1 с, TBT 0, CLS 0, SI 3.7 с; desktop: FCP 0.3 с, LCP 0.4 с, TBT 0, CLS 0, SI 0.5 с. CrUX без данных. Снимки `psi-blog-{mobile,desktop}-size-20261024.jpg` и `psi-home-{mobile,desktop}-blog-size-20261024.jpg`.

Уменьшение изображений убрало предупреждение о размере на блоге, но не устранило mobile LCP. Диагностика фактической отрисовки: задержка изображения блога 1020 мс, главной 1950 мс; Playfair Latin был в поздней критической цепочке. Следующая проверяемая правка: responsive AVIF preload ровно того srcset/sizes, что у Picture, и preload Playfair Latin. Ранний запрос не гарантирует устранение всей задержки; результат проверяется после публикации. Метрика включена, цели и обработчик заявок не изменены.

Проверка правки preload: Astro/TS 0 ошибок/предупреждений/подсказок; build 36 HTML; SEO 34 URL / 2205 ссылок; 14 тестов PASS. Обе head-preload пары побайтово совпадают с srcset/sizes первого AVIF source на главной и блоге.
