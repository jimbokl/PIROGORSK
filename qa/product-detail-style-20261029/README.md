# Единый стиль страниц товаров — 29.10.2026

Поручение: согласовать изображения, заголовки и кнопки на страницах товаров и проверить телефон. Применён `pirogorsk-landing-design`.

## Изменение

- Общий `ProductHero` для всех 153 товарных URL: иллюстрация в квадратной рамке, полный заголовок Playfair, одинаковые отступы и иерархия.
- На компьютере изображение слева, описание и выбор справа; на телефоне название → иллюстрация → выбор. Длинные названия переносятся без обрезки.
- Общий блок форматов: равные колонки и цели касания от 48px, цена Golos с табличными цифрами, единая кнопка. На телефоне кнопка занимает ширину панели.
- Расчёт доставки доступен и у восьми первоначальных пирогов. Существующие цены, маршруты, переход в подборку и анимации сохранены. `sizes` изображений соответствует новой геометрии.

## Локальная проверка

- `check`: 0 ошибок/предупреждений; `build`: 214 HTML.
- 36 Node-тестов, SEO 212 sitemap URL, все 153 товарные страницы, 139 иллюстраций поставщиков, подложки — PASS.
- Существующий browser QA: форма/Worker/SQLite, калькулятор, поиск/фильтры меню и смешанная подборка 320/390/1280 — PASS.
- `verify-ui.mjs`: все 153 страницы на 320/768/1280px; семь разных товаров на 390px. Проверены квадратность и границы изображения, H1, отсутствие горизонтальной прокрутки/пересечений, размеры кнопок, все форматы, цена/ссылка/доставка, клавиатура и reduced motion.
- Отдельная проверка с mobile/touch emulation: семь товаров на 320/390px. На 390px выполнен реальный переход с товара в подборку для исходного пирога, Holland и pirogi39. Производственные POST не отправлялись. JS/HTTP ошибок нет.
- Lighthouse production-build preview: mobile 99/LCP 1814мс, desktop 100/LCP 451мс, CLS 0; accessibility/best practices/SEO 100. По одному лабораторному замеру каждого режима; это не полевые показатели.
- Скриншоты `before-*`, `local-sample-*`; машинные результаты `local-readback.json`, `local-tablet-readback.json`, `local-sample-readback.json`, `local-touch-readback.json`.

## Публикация

Runtime **`283d836a09413c60b51ad2f8d0ee0d01587a7284`**. [CI 40952151718 — SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40952151718): check/build, SEO, изображения, Node/Worker/browser тесты, публикация и Pages/Worker compatibility прошли.

- `verify-publication.mjs`: все 214 HTML и общие ресурсы — 229 URL — HTTP 200, побайтовое совпадение с локальной сборкой. Включены все 153 товарных URL. Доказательство: `publication.json`.
- Независимая published Pages/Worker compatibility: PASS.
- `verify-ui.mjs https://pirogorsk.ru production samples`: семь типов товаров на 320/390/768/1280px, 28 проверок. На 320/390px включена эмуляция touch/mobile. Изображения, полные H1, варианты, цены, доставка, клавиатура/reduced motion и три перехода в подборку — PASS. JS/HTTP ошибок и POST нет. Доказательство: `production-readback.json`; скриншоты `production-*`.
- Публичный [PageSpeed товара, 29.10.2026 22:55 GMT+2](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-catalog-osetinskiy-pirog-s-kuritsey-i-syrom/ng0mp4dv9x?form_factor=mobile): **mobile 100/LCP 1059мс, desktop 100/LCP 330мс**, CLS 0, accessibility/best practices/SEO 100 в обоих режимах. Chrome 153, Lighthouse 13.5.0. Это один лабораторный запуск каждого режима; CrUX данных нет. Доказательство: `public-psi.json`.

Публикация и проверка завершены. Открытых пунктов этого поручения нет.
