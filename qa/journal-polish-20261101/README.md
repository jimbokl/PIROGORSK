# Читаемые статьи · 01.11.2026

Единый макет 62 статей: заметное нумерованное содержание, закрепление на desktop, колонка до 760 px, основной текст 16 px, последовательные разделы, крафтовые ссылки, аккуратные таблицы и иллюстрации. Калькуляторы, карта и FAQ доступны в раскрывающемся блоке после текста. Исходный текст не сокращён; уникальные обложки и диаграммы сохранены.

## Проверки до публикации

- Astro/TypeScript: 0 errors, 0 warnings; сборка 262 HTML.
- SEO: 154 products, 257 sitemap URLs; artwork: 62 уникальных обложки; content-month PASS.
- 65 Node tests PASS.
- Новый verifier: все 62 статьи сохраняют исходные разделы и canonical; содержание ведёт на существующие разделы, изображения имеют размеры, alt, srcset и lazy-loading.
- Шесть типов статей × 320/390/768/1280: 24 просмотра без overflow, якоря и раскрытие инструментов PASS. Нативное содержание и инструменты работают без JavaScript.
- Визуально просмотрены телефон 390, планшет 768 и desktop 1280.
- Lighthouse локального несжатого HTTP: performance 75, accessibility/best practices/SEO 100; CLS 0. Это диагностический замер; результат production будет записан после публикации.

Команды: `npm run check`, `npm run build`, `node scripts/verify-seo.mjs`, `node scripts/verify-article-artwork.mjs`, `node scripts/verify-content-month.mjs`, `npm test`, `node scripts/verify-journal-reading.mjs`.

Изображения и промпты: [PROMPTS.md](PROMPTS.md). Проверка исходного текста использует [baseline-sections.json](baseline-sections.json), снятый до изменений. Production и CI ожидаются.
