# Подложка Балтийского пикник-сета · BRAND-02 · 01.11.2026

Причина: `ProductVisual` подключал отдельный прозрачный foreground пикник-сета,
но в общей карте подложек не было этой позиции. `verify-product-backdrops`
допускал standalone-исключение и поэтому не обнаружил пропуск.
CodeGraph context вернул `Transport closed`; связи компонентов проверены
по исходникам. Исправляется общий путь, отдельных шаблонных патчей нет.

## Изменение

Встроенный imagegen создал [отдельную подложку](../../design/picnic-set-20261101/BACKDROP.md):
морской город, волны и облепиха в одобренной крафтово-синей айдентике.
Оригинал `picnic-set.png` сохранён. Подложка в общем manifest; AVIF/WebP
256/400/640/960 px. На телефоне 400px AVIF занимает около 15 KiB.
Общие композиция, прозрачность, движение и reduced-motion сохранены.
154 SKU/цены, ассортимент, лента, контакты и CRM не менялись.

## Проверки

- check: 0 errors/warnings; build: 262 HTML.
- SEO: 154 товара / 257 sitemap URL; release compatibility PASS.
- Все 154 позиции имеют отдельную подложку: 85 generated + 61 reused + 8 retained.
  Foreground-only исключение удалено. Обновлённая проверка на старом HTML
  поймала пропуск `picnic-set` (regression-before-build.log), на новой сборке PASS.
- Browser: 320/390/768/1280 px, 24 размещения — товар, главная, меню,
  `/nabory/`, `/nabor/piknik-u-morya/`, «С этим берут» мясного пирога.
  Проверены загруженные видимые foreground/background, заполнение поверхности,
  AVIF/WebP srcset, декоративность; overflow/errors нет. 350 ₽, 2×350=700,
  добавление и reload без дублей PASS. Телефон, планшет и desktop просмотрены.
- 65 Node tests, Worker typecheck/API/SQL и полный `test:browser` PASS.

## Скорость и публикация

[Локальное сравнение](performance-comparison.json): по одному cold mobile/desktop
Lighthouse sample на старом production HTML и новой сборке, один localhost server.
Mobile LCP 4.66 → 3.46 s, desktop 0.91 → 0.93 s; CLS/TBT = 0 в обоих вариантах.
Это малая лабораторная выборка: разницу mobile нельзя приписывать подложке.
[Публичный замер до публикации](public-pagespeed-before.json): mobile/desktop
100/100, LCP 1.503/0.322 s, CLS 0/0; CrUX данных нет.

Runtime `21d20e72e1fa2cf137bb82ec4ad04d22a2ae641b` опубликован.
[CI 41318265841](https://github.com/jimbokl/PIROGORSK/actions/runs/41318265841)
SUCCESS; [состояние CI](ci.json), [published contract](release-production.log).

[Production browser report](production-report.json): 24/24 размещения,
320/390/768/1280, 154 SKU в каталоге; 350 ₽, 2×350=700, добавление и reload PASS.
Оба видимых слоя декодированы, фон заполняет поверхность, AVIF/WebP responsive;
overflow/console errors нет. Визуально просмотрены телефон/планшет/desktop.
[8/8 публичных assets](production-assets.json) HTTP 200, image content types,
SHA-256 совпадает с локальными файлами; [read-only verifier](check-production-assets.py).

[PageSpeed после публикации](public-pagespeed-after.json),
[публичный отчёт](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-catalog-baltiyskiy-piknik-set/fu06r32079):
mobile/desktop 100/100, LCP 1.352/0.361 s, TBT 9/4 ms, CLS 0/0;
accessibility/best practices/SEO — 100/100 в обоих режимах. CrUX данных нет.
Это единичные лабораторные замеры, а не обещание стабильных оценок.

## Визуальные доказательства с production

- [Страница товара, телефон](production-product-390.png).
- [Страница товара, планшет](production-product-768.png).
- [Хаб наборов, телефон](production-hub-390.png).
- [Меню, desktop](production-menu-1280.png).

BRAND-02 закрыт. По этой задаче обязательных действий не осталось.
