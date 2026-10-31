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

## Балтийские фотореалистичные слои — MOT-02

Оба слоя созданы встроенным imagegen, оригиналы сохранены рядом:
`oak-board.png` (1254×1254, RGBA) и `baltic-terrace.png` (2098×749, RGB).
Доска отдельная, с настоящей прозрачностью; пирог занимает 86% сцены,
поэтому видны волокна и край дуба. Фон заполняет всю карточку, поверх него
адаптивная светлая вуаль и живой HTML-текст. Первые шесть сюжетов сохранены.
Все три изображения lazy: до открытия седьмого слайда запросов к ним нет.

Промпт доски:

> Use case: product-mockup. Asset type: separate photorealistic transparent image layer for a premium food website animation. One empty ROUND OAK SERVING BOARD photographed EXACTLY straight down at 90 degrees, perfectly circular, centered, diameter 90 percent of a square canvas. Warm honey oak, clearly visible natural wood grain and subtle end-grain pores, a few fine knife marks, elegant thin bevelled rim, realistic material depth. No handle. Soft daylight from upper left, natural warm-neutral color, extremely detailed food editorial photography, not an illustration or plastic 3D render. The board must be EMPTY because a golden pie will be composited onto it later. Genuinely transparent background around the entire round board with clean alpha edges. No table, no food, no objects, no lettering, no engraving, no logos, no watermark, no large external cast shadow. Square composition.

Промпт моря:

> Use case: photorealistic-natural. Asset type: panoramic photographic background layer for a premium Russian pie website hero banner, extra-wide horizontal composition about 2.8:1. A serene real-looking Baltic Sea coast in the Kaliningrad region on a clear mild morning. Muted turquoise and slate-blue water, gentle low waves, pale sandy beach and subtle distant dunes with a few Baltic pines at the far right edge, spacious soft pale sky with natural thin clouds. An EMPTY warm pale weathered oak terrace table occupies the lower 30 percent of the frame, edge extending across the width. The sea is visible behind the table; horizon around upper third. On the RIGHT foreground leave generous clear empty tabletop for a separate round board and pie animation to be layered later. The LEFT half should be luminous and visually calm for dark HTML heading and paragraph. Premium editorial lifestyle photography, natural detailed wood grain, realistic light from upper left, restrained fresh Baltic colors, subtle depth of field, photographic not illustrated or cartoon. Fill the entire image edge to edge. No pie, no board, no food, no plates, no props, no people, no buildings, no railings, no text, no logos, no watermark.

[Проверка балтийской сцены](../../qa/pie-motion-baltic-20261031/README.md).
