# Иллюстрации · 05.11.2026

Две обложки созданы imagegen по текстовым описаниям. Это самостоятельные
редакционные сцены, не фотографии конкретных ресторанов и не изображения
поставщиков. Их происхождение подписано в метаданных статей.

## Выбор рыбного блюда

Исходник: `design/blog-source/month-202611/kak-edyat-rybu-v-kaliningradskoy-oblasti.png`.

Промпт:

> Create a premium editorial cover illustration for Pirogorsk, a Baltic pie-town food journal. Landscape wide 3:2 composition, no lettering, no logos, no numbers. A beautifully plated golden pan-seared zander fillet with delicate vegetables on an ivory ceramic plate, a smaller bowl of clear fish soup and a rye toast with fish spread arranged on a light oak table. Subtle Baltic sea horizon with a few recognizable generic gabled seaside houses and dunes in the distant upper third. Warm natural sunlight, appetizing realistic textures on the food combined with finely drawn watercolor architectural scenery, sophisticated ivory/navy/amber/sage palette. Plenty of breathing space. Camera at 35-degree overhead angle. Food must be credible and elegant, no whole raw fish, no people, no cutlery blocking food. This is an original illustrative scene, not a depiction of any particular restaurant. Crisp focal details, soft background, cohesive art direction, clean generous composition suitable for a 1200x630 crop.

## Завтрак на Балтике

Исходник: `design/blog-source/month-202611/zavtrak-na-baltike.png`.

Промпт:

> Original premium editorial cover for Pirogorsk Baltic pie-town food journal. Wide landscape 3:2, no text or logos. A lovely breakfast for two before a Baltic seaside walk: ceramic plates with softly folded omelette and tomatoes, golden syrniki with small bowls of berry sauce and sour cream, two cups of coffee and a small basket of sliced rye bread on a light oak cafe table. Beyond it a quiet curved promenade, sandy dunes, pale blue Baltic sea, a small cluster of charming amber-roofed Baltic gabled houses among pines. Early morning warm golden sunlight. Realistic appetizing food rendered with exquisite watercolor and ink detailing, soft painted scenery. Ivory, midnight navy, amber, desaturated sea blue, sage palette. Airy clean generous sophisticated composition, no people, no table clutter, no floral border. Eye level slightly overhead on food, horizon upper third, balanced objects. Visual consistency with Pirogorsk pie-city illustration identity, food editorial quality, crisp foreground and delicate distant architecture. Not a depiction of any specific restaurant. Suitable for 1200x630 crop.

## Производные файлы

`integrate.mjs` создаёт OG JPG 1200 × 630 и по две авторские схемы SVG/PNG для
каждой статьи. Astro выпускает адаптивные AVIF/WebP. Схемы дополняются
текстовыми таблицами в HTML; смысл доступен без чтения текста на изображении.
Проверки веса, размеров, подписей и уникальности входят в content/artwork QA.
