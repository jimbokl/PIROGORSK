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

Сравнение лабораторной скорости, CI и production:
результаты будут дописаны после завершения.
