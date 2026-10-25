# Новый логотип и favicon · 25.10.2026

Запрос: переделать логотип и favicon в духе Пирогорска. Объём: айдентика и её интеграция. Работа над трафиком остаётся на паузе, heartbeat не создавался.

## Изменено

- Знак «пирог-город»: пирог, башня/крыши, балтийская волна. Два плоских цвета, нативный SVG.
- Шапка и оба подвала используют общий Brand; название теперь «Пирогорск» с корректным Playfair.
- Вместо шаблонной иконки Astro — SVG, ICO 16/32/48, PNG 32 и Apple Touch 180.
- Полная версия логотипа в кривых доступна отдельно и указана в Organization JSON-LD.
- Исходники, ImageGen-промпты, экспорт и происхождение — `design/brand-v3/README.md`.

## До публикации

- `npm run check`: 65 файлов, 0 errors/warnings/hints.
- `npm run build`: 38 HTML.
- `node scripts/verify-seo.mjs`: 36 sitemap URL, 2359 локальных ссылок, 7 продуктовых концептов — PASS.
- 14 существующих Node tests IndexNow/калькулятора/аналитики — PASS.
- Shared registry strict: PASS, errors 0, hasDrift false, 25.10 17:54:38 UTC.
- Pillow прочитал ICO: размеры 16/32/48; PNG 32×32; Apple Touch 180×180 RGB, непрозрачный.
- Проверка CUA в свежей сборке: desktop 1280 px (document width 1280), мобильная главная в iframe 320 px, статья в iframe 390 px; новые шапки и подвалы визуально помещаются, кнопки города/подборки видимы. QA harness создан только в игнорируемом build-output и удалён перед публикацией.
- `git diff --check`: PASS.

Снимки: [мобильные шапки](screenshots/brand-mobile-headers-20261025.png), [мобильные подвалы](screenshots/brand-mobile-footers-20261025.png). [Малые иконки](../design/brand-v3/icon-size-proof.png).

Новый публичный PSI для этого изменения не запускался; исторические баллы не выдаются за замер нового выпуска. Backend, семантика целей, рецептуры и цены не менялись.

## Публикация

- Код **`c6174f1b29496d6f33028d505245f0bbbc6a4b2c`**, [GitHub Pages CI 40218830355](https://github.com/jimbokl/PIROGORSK/actions/runs/40218830355): completed / success. Все проверки, deployment и штатное уведомление IndexNow завершились успешно.
- Production 25.10.2026 **18:00:25 UTC**: главная и блог HTTP 200, присутствуют новый Brand, все версии favicon и Organization.logo. Все шесть файлов логотипа/иконок HTTP 200 с корректными MIME и побайтовым совпадением с локальными. [JSON-проверка](brand-production-20261025.json).
- CUA: публичная главная открыта на домене; логотип виден, новый набор favicon в DOM, viewport/document width 1280/1280. [Снимок production](screenshots/brand-production-20261025.png).
- На 320 px отдельно выбрана самая длинная подпись города «Зеленоградск»: логотип, переключатель и подборка помещаются, переключение работает.

После выпуска обновлены BUILD-STATE/RECAP и приложены доказательства. Пауза работы над трафиком сохранена.
