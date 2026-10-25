# Пирогорск — айдентика v3 · 25.10.2026

## Идея

«Пирог-город»: румяный пирог соединён с силуэтом башни и приморских крыш. Волна связывает знак с Балтикой. Надпись в мягком регистре «Пирогорск», подпись — «Пироги с балтийским характером».

Архитектурный ориентир — реальная водонапорная башня Зеленоградска. Просмотрено исходное фото [Новожилова, 2021](https://visit-kaliningrad.ru/upload/medialibrary/776/pe9ngtin1t6zyq2izw2ct443mecvnu5d/Zelenogradsk-vodonapornya-bashnya-vid-sverkhu-Novozhilov-2021-_1_.jpg), сохранённое ранее в `design/layered-assets-v2/logo/references/water-tower-novozhilov-2021.jpg`. Финальный силуэт условный, нарисован отдельно в SVG; фотография не встроена.

Два направления ImageGen и точные промпты — [concepts/prompts.md](concepts/prompts.md). Они использованы для поиска композиции. Финальные знак, типографика и favicon выполнены отдельно в векторе; растровые концепты не загружаются на сайт.

## Файлы

- `public/brand/pirogorsk-symbol.svg` — основной знак, 978 байт, прозрачный фон, viewBox 96×96.
- `public/brand/pirogorsk-logo.svg` — самостоятельный логотип с надписью и подписью в кривых, 372×100, 16006 байт; не требует установки шрифта. Использован также в Organization JSON-LD.
- `public/favicon.svg` — упрощённые пирог и волна на тёмной плашке. Башня исключена только из миниатюрного знака, чтобы сохранить читаемость.
- `public/favicon.ico` — 16/32/48 px, `public/favicon-32.png` — 32 px.
- `public/apple-touch-icon.png` — 180 px, непрозрачный фон.
- `logo-preview.png`, `symbol-preview.png`, `icon-size-proof.png` — превью и проверка малых размеров, не веб-ресурсы.

## Применение

Общий компонент `src/components/Brand.astro` используется в шапке и подвале главной, каталога и редакционных страниц. В интерфейсе загружается маленький SVG-знак, название и подпись остаются доступным HTML-текстом с уже используемыми шрифтами. Дополнительного JavaScript нет.

Цвета: Балтика `#113e50`, корочка `#c4843d`, светлая корочка для favicon `#e2ad62`, тёплый фон `#fbf9f4`. Набор Playfair Display 800 и Golos Text 400; OFL-лицензии находятся в `public/fonts/LICENSE-Playfair.txt` и `public/fonts/LICENSE-Golos.txt`.

Все страницы подключают SVG/ICO/PNG и Apple Touch с версией `v=20261025`, чтобы сменить старую иконку Astro в кеше.

## Повторный экспорт

Из корня репозитория:

```sh
uv run --with fonttools --with brotli --with uharfbuzz python design/brand-v3/export-logo.py
node design/brand-v3/export-icons.mjs
```

Первый экспорт переводит шрифтовую композицию в кривые. Второй использует существующий Sharp для растровых размеров и собирает ICO из PNG. Никаких новых зависимостей во время работы сайта.

Проверки выпуска: [qa/brand-refresh-20261025.md](../../qa/brand-refresh-20261025.md).
