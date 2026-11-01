# Читаемые статьи · 01.11.2026

Единый макет 62 статей: заметное нумерованное содержание, закрепление на desktop, колонка до 760 px, основной текст 16 px, последовательные разделы, крафтовые ссылки, аккуратные таблицы и иллюстрации. Калькуляторы, карта и FAQ доступны в раскрывающемся блоке после текста. Исходный текст не сокращён; уникальные обложки и диаграммы сохранены.

## Проверки до публикации

- Astro/TypeScript: 0 errors, 0 warnings; сборка 262 HTML.
- SEO: 154 products, 257 sitemap URLs; artwork: 62 уникальных обложки; content-month PASS.
- 65 Node tests PASS.
- Новый verifier: все 62 статьи сохраняют исходные разделы и canonical; содержание ведёт на существующие разделы, изображения имеют размеры, alt, srcset и lazy-loading.
- Шесть типов статей × 320/390/768/1280: 24 просмотра без overflow, якоря и раскрытие инструментов PASS. Нативное содержание и инструменты работают без JavaScript.
- Визуально просмотрены телефон 390, планшет 768 и desktop 1280.
- Lighthouse локального несжатого HTTP: performance 75, accessibility/best practices/SEO 100; CLS 0. Это диагностический замер, не результат production.

Команды: `npm run check`, `npm run build`, `node scripts/verify-seo.mjs`, `node scripts/verify-article-artwork.mjs`, `node scripts/verify-content-month.mjs`, `npm test`, `node scripts/verify-journal-reading.mjs`.

Изображения и промпты: [PROMPTS.md](PROMPTS.md). Проверка исходного текста использует [baseline-sections.json](baseline-sections.json), снятый до изменений.

Первый [CI 41339954207](https://github.com/jimbokl/PIROGORSK/actions/runs/41339954207) остановился до публикации: старый браузерный сценарий нажимал калькулятор внутри свёрнутого блока. В `qa-site.mjs` добавлены раскрытие через summary и ожидание видимой ссылки. Полный `npm run test:browser` после исправления PASS (exit 0), включая калькулятор 320/390/1280.

## Публикация

Runtime `275b1cfd4df9175c48d9dee40770d8144f971607`, [CI 41341802001 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/41341802001). Все проверки, deploy и published compatibility прошли; [статус CI](ci.json). Отдельная проверка `verify-release.mjs published` также PASS.

Public [PageSpeed Insights после публикации](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-dostavka-edy-v-zelenogradske/917gjqgjq3): mobile/desktop performance 100/100, accessibility/best practices/SEO 100/100, LCP 1.651/0.361 s, CLS 0/0. До публикации performance также 100/100, LCP 1.651/0.316 s. Это единичные лабораторные замеры; данных CrUX нет. [До](psi-before.json), [после](psi-after.json).

Production-проверка PASS: все 62 статьи, 24 адаптивных просмотра на 320/390/768/1280, якоря, сохранность исходного текста и no-JS. Ошибок нет; [полный отчёт](production-report.json).

Визуальная приёмка: [desktop — содержание и иллюстрация](production-illustration-1280.png), [телефон — иллюстрация и текст](production-illustration-390.png), [планшет — таблица и ссылки](production-reading-768.png).
