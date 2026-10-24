# Блог — проверка выпуска 24.10.2026

- Витрина `/blog/`, семь материалов в трёх рубриках; три новые статьи и три новые обложки ImageGen.
- Старые адреса journal сохранены, новые в sitemap; Blog/BlogPosting/BreadcrumbList, уникальные метаданные и OG.
- `npm run check`: 0 errors/warnings/hints. `npm run build`: 36 pages. `verify-seo`: 34 sitemap URLs, 2172 local references. 14 tests PASS. Shared registry `check --strict`: passed=true, no drift.
- UI: desktop 1440, mobile 390, article table 320 px. Нет горизонтального переполнения; оглавление ведёт к таблице, ссылка статьи открывает калькулятор. Новые страницы не отправляют заявку при чтении.
- Снимки `screenshots/blog-{desktop,mobile}-20261024.jpg`, `screenshots/blog-table-320-20261024.jpg`.
- Native Chrome, Метрика 113767847, «Сегодня», 24 октября: 7 посетителей, 8 визитов, 13 просмотров; все 8 визитов прямые. Возможный QA не отделён. Это исходная общая статистика, не подтверждённый спрос. Снимок `screenshots/metrica-baseline-blog-20261024.jpg`.
- Официальный PSI до выпуска: главная `hxmesh0nom`, 100 во всех четырёх категориях mobile/desktop. Новый блог ещё требует публичного измерения.

Публикация, IndexNow и новые PSI будут дописаны после независимой проверки домена.
