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
