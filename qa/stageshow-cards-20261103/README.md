# UX-20 · Карточки переходов со stageshow · 03.11.2026

Общий `SceneCard.astro` объединяет иллюстрированные переходы главной, меню,
статей, городов, товаров и наборов. Крупный пироговый сюжет, полное название,
короткая подпись, отдельная строка действия и круглая стрелка. Компактные
сценарии на телефоне листаются нативно; планшет/desktop показывают три рядом.
Пикник получает собственную морскую сцену, ужин и компания — свои сюжеты.

Применён [stageshow](https://github.com/benjitaylor/skills): эталон
`opposite-corners` скопирован и снят до реализации. [Репетиция и сравнение](../../design/stageshow-cards-20261103/REHEARSAL.md).
Иллюстрации повторно использованы из утверждённой айдентики Пирогорска.
Адаптивные AVIF/WebP грузятся лениво. Небольшой обработчик фокуса полностью
показывает карточку при Tab/Shift+Tab; без JavaScript ссылки и листание работают.

Локально:

- check: 0 errors / 0 warnings; build: 262 HTML; 66 Node tests PASS.
- SEO: 262 HTML / 154 товара / 257 sitemap URL; 62 уникальные обложки PASS.
- `verify.mjs`: 943 ссылки на 247 страницах сохранены, все назначения существуют;
  24 вида шести шаблонов на 320/390/768/1280, декодированные изображения,
  полные заголовки, равные высоты и линии действий PASS. Tab открывает
  каждую карточку ряда в обоих направлениях; Enter и query атрибуции
  сохраняются без JavaScript. Полный occasion-context QA на четырёх ширинах PASS.
- Hover не меняет геометрию карточки; reduced motion отключает движение.
- `layout.mjs`: канонический auditLayout stageshow после прокрутки,
  390/1280 px — no-issues-detected в поддерживаемой области проверки.
- Catalog regression: все 154 SKU на главной/в меню, форматы, цена за порцию,
  qty1→2→99→1 и добавление на шести ширинах PASS.

[Local report](local-report.json), [desktop](local-article-1280.png),
[телефон](local-home-390.png), [планшет](local-home-768.png).

Опубликовано: runtime `eb09e16086682806525ee4734afa998936d72c50`,
[CI SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/41592445040).

На production повторно пройдены 24 вида на 320/390/768/1280 px:
главная, меню, статья, товар, набор и город. Картинки декодируются,
действия выровнены, полные заголовки читаются, overflow отсутствует.
Все 154 SKU на главной и в меню; Tab/Shift+Tab/Enter, scroll, no-JS,
query атрибуции, hover и reduced motion PASS. 943 назначения на 247
страницах совпадают с исходным списком; их цели существуют в build.
Runtime на шести публичных страницах сверён с build: SHA256 всех
20 inline CSS/JS-блоков и 11 внешних CSS/JS совпал. Release compatibility PASS.

[Production report](production-report.json), [SHA256](production-assets.json),
[телефон](production-home-390.png), [планшет](production-home-768.png),
[редакционные карточки на desktop](production-article-1280.png).
Физические устройства и Safari не проверялись; это Chrome responsive views.

В общем browser-прогоне первые три проверки прошли, четвёртая обнаружила
устаревшее требование вместить три сценария в 320 px. После обновления проверки
найдено реальное частичное скрытие второго фокуса Chromium: явная прокрутка
устранила его. Повторный occasion-context и усиленный verify.mjs PASS.
Shared registry: sync и check --strict PASS (без drift).


Контроль Lighthouse после публикации: mobile 98, LCP 1.925 s, CLS 0.014;
desktop 96, LCP 0.709 s, CLS 0.011. Accessibility / best practices / SEO —
100 в обоих режимах. До публикации mobile/desktop 94/94 и LCP 2.118/0.730 s.
Это по одному лабораторному образцу, не CrUX и не доказательство ускорения.
Небольшой рост CLS в этом образце относится к шрифтам/первому экрану:
layout-shifts указывает на tasting-description, а не на SceneCard.
[Сравнение и источники сдвигов](performance-comparison.json).
