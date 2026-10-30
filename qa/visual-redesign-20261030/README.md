# Пирогорск: визуальная система · 30.10.2026

## Изменения

Пересобрана общая визуальная система главной, меню, 153 товаров, доставки, городов, сценариев и блога. Фокус на еде, спокойные поверхности oat/sage/berry, единый масштаб Playfair/Golos, углы20–28px, кнопки48px, сокращённые hover-движения. Убраны glass/noise/gradient text и вложенные рамки. Гравюры ингредиентов сохранены как едва заметная фактура.

На главной четыре основные категории и дополнительные текстовые ссылки вместо семи тесных плиток. Наборы компактнее; на телефоне категории и наборы листаются горизонтально с видимой следующей карточкой. Первый экран использует новую предметную композицию рыбного пирога на керамике и льне, полностью в HTML, eager/high priority, responsive AVIF/WebP. Декоративный берег больше не конкурирует за preload.

Сохранены153 позиции, цены и форматы, составы наборов, прямое добавление и блок «С этим берут», калькулятор, общая подборка, Worker/API, существующие URL и SEO. Сайт по-прежнему изучает спрос; цены предварительные.

## Основания и Imagegen

Применён `pirogorsk-landing-design` и встроенный `imagegen` (CLI не использовался).
[Apple HIG: Layout](https://developer.apple.com/design/human-interface-guidelines/layout) — адаптация, ясная иерархия, согласованные отступы и выравнивание.
[Apple HIG: Typography](https://developer.apple.com/design/human-interface-guidelines/typography) — читаемость и устойчивая типографическая иерархия. Балтийская палитра и бренд сохранены.

- Референс: `design/art-direction-20261030/reference.png`; точный промпт `prompt.txt` рядом.
- Production-иллюстрация: `design/art-direction-20261030/hero-fish-scene.png`; точный промпт `hero-prompt.txt` рядом. Референс продукта: `design/layered-assets-v2/hero/pie.png`.
- Оригиналы сохранены в `/Users/dmitrij/.codex/generated_images/01a16a37-1bd2-7913-9c7b-ecd36e870428/`: `exec-2647f226-85ec-4cc2-90ab-4ba009fd5596.png`, `exec-3a6503f9-9a4b-4806-8ddb-2bd56dbfc1c4.png`.
- Цены и тексты из сгенерированного макета не переносились; используются данные каталога.

## Проверка

Локально check/build,41 Node tests, Worker/API/SQL, полный browser QA PASS. Browser QA включает наборы, дополнения на страницах пирогов, размеры, точные суммы, доставку один раз, сохранение/reload, передачу в форму, keyboard/focus, storage errors, fixtures формы и записи в локальную SQLite.
Все SEO/artwork/city/153 product routes/release validators PASS. Registry strict PASS: ошибок0, drift=false (99 прежних предупреждений).

`verify-ui.mjs`: главная, меню, доставка, блог, статья, исходный и поставщикский пирог на320/390/768/1280. Touch и reduced-motion; H1, overflow, изображения, JS/HTTP ошибки; screenshots в `local/` и `production/`.
`verify-addons.mjs`: отдельный повтор прямого добавления морса/сладкого/посуды на production без реальных отправок формы.
`verify-publication.mjs`: сравнение всех214HTML, sitemap, release, шрифтов, общего CSS/JS и всех responsive-файлов новой hero-иллюстрации с production.

Локальная матрица UI: 28 сочетаний страниц и ширины, без overflow, сломанных изображений, JS/HTTP ошибок. У иллюстраций поставщика устранены прямоугольные стыки фона (`darken`); композиция и тени сохранены.

Lighthouse локальной сборки (13.5.0, simulated throttling): mobile ×3 — Performance98, LCP2119.64–2193.53ms, CLS0.01851, TBT0ms; desktop — Performance100, LCP473.32ms, CLS0.00185, TBT0ms. Accessibility/Best Practices/SEO100 во всех запусках. Это лабораторные замеры, не CrUX.

Статус: локальные проверки завершены; публикация, CI и production-проверка впереди.
