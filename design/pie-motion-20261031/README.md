# Тёплый пирог — motion study, 31.10.2026

Седьмая карточка главного hero: пирог мягко опускается на доску, кисточка
смазывает корочку двумя короткими движениями, затем отъезжает кусочек.
Каталожная лента и 153 SKU сохраняются.

Референс движения: https://animation.99px.ru/animations/26596/ —
cinemagraph Daria Khoroshavina с кисточкой над галетой. Референс просмотрен
во внешнем Chrome; исходное фото/анимация не используются в сайте.
Это оригинальная сцена, а не покадровая копия референса.

## Таймлайн

Общая длительность — 4400 мс, один автоматический показ при входе в экран.

| Интервал | Действие |
| --- | --- |
| 0–572 мс | Пирог опускается сверху, тень уплотняется |
| 572–1100 мс | Небольшая амортизация и остановка |
| 1056–1452 мс | Появление кисточки |
| 1452–2948 мс | Два мазка, короткий блик на корочке |
| 2948–3300 мс | Кисточка уходит |
| 3388–4400 мс | Кусочек плавно отъезжает вправо-вниз |

Слои: доска и тень; цельный пирог с маской; отдельная маска кусочка;
блик; оригинальная SVG-кисточка; три линии пара. Конечное состояние
сохраняется. Кнопка позволяет остановить, продолжить и повторить сцену.
Вне экрана и в скрытой вкладке движение приостанавливается. При reduced
motion остаётся статичная композиция с выдвинутым кусочком. Без JavaScript
главная показывает исходный первый баннер со ссылкой в меню.
Первые шесть баннеров сохранены; у всех семи единая высота в каждом breakpoint.

## Происхождение изображения

`whole-pie.png` создан встроенным imagegen с прозрачным фоном.
Референс текстуры — собственный `design/layered-assets-v2/meat/pie.png`.
Слои выделяются CSS-масками из одного изображения, поэтому узор совпадает.
Модель генерации не используется для изменения товарных данных.

Промпт:

> Use case: product-mockup. Asset type: isolated food artwork for a layered website animation for Pirogorsk. Use the input pie only as reference for appetizing golden pastry texture. Create ONE COMPLETE perfectly round uncut closed Russian savory pie, photographed EXACTLY straight down at 90 degrees: circular silhouette, centered, with ample clear margin around the entire circumference. Rich golden baked crust, elegant radial leaves of pastry across the lid, braided round rim, tiny center steam vent. The complete pie must have no missing wedge, no separated slice, no visible filling, no perspective ellipse. Ultra appetizing natural detailed pastry, restrained premium editorial food styling. Soft warm light from top left, subtle baked gloss. Genuinely transparent background, with no table, no board, no plate, no rack, no props, no text, no hands, no cast shadow outside the pie. Fill about 78 percent of the square canvas diameter. This whole pie will be split into exact matching moving pieces with CSS masks, so keep an uninterrupted circular outline and pastry pattern.

## Реализация и проверка

Astro Image генерирует WebP/srcset. Движение — Web Animations API,
без Reanimate в runtime. Reanimate используется как скилл и инструмент
покадровой проверки. Проверки и снимки: `qa/pie-motion-20261031/`.
