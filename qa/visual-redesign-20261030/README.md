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
`verify-publication.mjs`: сравнение всех214HTML, sitemap, release, шрифтов, общего CSS/JS и всех responsive-файлов новой hero-иллюстрации с production. `PUBLICATION_BUILD_DIR` позволяет использовать распакованный Pages artifact CI как эталон.

Локальная матрица UI: 28 сочетаний страниц и ширины, без overflow, сломанных изображений, JS/HTTP ошибок. У иллюстраций поставщика устранены прямоугольные стыки фона (`darken`); композиция и тени сохранены.

Lighthouse локальной сборки (13.5.0, simulated throttling): mobile ×3 — Performance98, LCP2119.64–2193.53ms, CLS0.01851, TBT0ms; desktop — Performance100, LCP473.32ms, CLS0.00185, TBT0ms. Accessibility/Best Practices/SEO100 во всех запусках. Это лабораторные замеры, не CrUX.

Дополнительно: «О проекте», калькулятор, доставка в Зеленоградск и поводы — ещё12 сочетаний на320/390/1280 PASS, визуально просмотрены калькулятор и городская страница.

## Production: опубликовано и проверено

Runtime **`d272f8884428351a221bd5defbb9523fea974812`**. [CI41017902221 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/41017902221), включая полный browser QA, published compatibility и IndexNow.

- Все241 ресурса HTTP200 и побайтово совпадают с Pages artifact этого CI:214HTML, шрифты, код, sitemap/release и responsive hero. Первое сравнение с macOS показало разницу пяти AVIF; WebP/HTML/CSS/JS совпадали. Для окончательного сравнения скачан исходный Linux CI artifact; все241 совпали. Размеры AVIF совпадают; из-за платформенного кодирования пиксели не идентичны (`avif-comparison.json`); опубликованные изображения просмотрены визуально.
- Production UI: все40 сочетаний страниц/ширины PASS. Нет overflow, сломанных изображений, JS/HTTP ошибок. Главная/меню/доставка/блог/статья/2 вида товаров:320/390/768/1280; о проекте/калькулятор/город/поводы:320/390/1280. Скриншоты в `production/`, `production-other/`.
- Дополнения на товарах: touch320/390 и desktop1280 PASS — прямое добавление, форматы, точные суммы, reload, передача в форму, ошибки storage. Реальные формы не отправлялись. Worker/API и Pages совместимы.
- Lighthouse CLI по реальному URL30.10.2026,09:15–09:16 Europe/Kaliningrad: mobile×3 Performance99/99/100; LCP1556.54/1893.13/1441.07ms; CLS0.01537–0.01852; TBT12/0/0ms. Desktop Performance100,LCP552.11ms,CLS0.00186,TBT0. Accessibility/SEO100 во всех запусках. (UTC07:15–07:16). Лабораторные данные, не CrUX. Полные timestamps и метрики в `production-performance.json`.
- Best Practices77 в прямом production Lighthouse: `third-party-cookies`/`inspector-issues` относятся к существующей Яндекс.Метрике. Аналитика сохранена. Это отдельные замечания, не оценка скорости.
- **Public PageSpeed отчёт недоступен**: UI после повторов mobile/desktop пишет «Не удалось перейти по адресу https://pirogorsk.ru/. Проверьте правильность URL.». Отдельная попытка с query также не дала отчёт. API fallbackHTTP429: shared consumer daily quota exceeded. Оценок публичного PSI и данных CrUX не получено; CLI-замеры выше не выдаются за PSI. `public-psi.json`, `public-psi-raw.json` и screenshots `pagespeed-mobile.png`/`pagespeed-desktop.png` сохраняют результат.

Дизайн опубликован. Все проверки реализации и production завершены; ограничение внешнего PSI зафиксировано отдельно.
