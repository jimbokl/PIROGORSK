# Пирогорск — выразительная главная и восемь пирогов

26.10.2026. Запрос: заметный дизайн с анимациями и восьмой пирог для симметрии.

## Реализация

- Новый `TastingHero.astro`: крупный трёхстрочный заголовок, navy/coral, морская графика, башня Зеленоградска и композиция из отдельных слоёв. Три ручных сцены: рыба / мясо / вишня; подпись, ссылка, счётчик и aria-pressed обновляются вместе.
- Короткое вступление до 1.2 с, смена вкуса 620 мс, параллакс на точном указателе, появление карточек при входе в экран и наведение на их отдельные слои. Без автоперелистывания и бесконечных эффектов.
- В CSS содержимое видно по умолчанию. JS не скрывает каталог до загрузки. `prefers-reduced-motion` и уход вкладки в фон завершают движение; reduced motion проверен по исходникам, отдельная эмуляция не проводилась.
- Новый вкус — курица и грибы: 500 г / 1 кг, предварительно 590 / 1090 ₽. Отдельная страница `/pirogi/pirog-s-kuritsey-i-gribami/`, SEO и sitemap, единые варианты frontend/Worker. В каталоге 5 сытных и 3 сладких пирога; 4×2 на desktop, 2×4 на 390 px, одна колонка на 320 px.
- Два новых изображения действительно сгенерированы ImageGen: прозрачный пирог и отдельная бумажная подложка с ингредиентами. Промпты, происхождение и визуальная проверка — `design/layered-assets-v2/chicken/README.md` и manifest. Графика — концепт, не фото действующего производства.

## Проверки до публикации

- Astro/TypeScript: 69 файлов, 0 errors / warnings / hints.
- Build: 39 HTML; SEO: 8 product concepts, 37 sitemap URLs, 2520 local references — PASS.
- Node: 14 tests PASS. Worker typecheck, browser script typecheck, API / SQL integration — PASS.
- UI 320 / 390 / 1280 px: без горизонтального переполнения, каталог и hero помещаются. Смена сцены мышью и клавишей Enter, новый товар и 1 кг за 1090 ₽, переход к подборке — PASS. Добавленный для проверки новый пирог удалён из локальной подборки; ранее существовавший мясной оставлен. Форму не отправляли.
- Console errors: нет. `git diff --check` PASS. Shared skills registry strict check PASS / hasDrift false.
- Локальный Lighthouse до последней корректировки sizes / decoding: mobile P96 / A100 / BP77 / SEO100, LCP 2.6 с, TBT 20 мс, CLS 0; desktop P100 / A100 / BP77 / SEO100, LCP 0.5 с, TBT 0, CLS 0. Это не публичный PSI; BP77 связан с third-party cookies Метрики.

## Worker

В существующем Cloudflare Worker `pirogorsk-interest` опубликован точный локальный bundle. Dashboard: active/latest version **1c96aa90**. Binding D1, cron и ALLOW_LOCALHOST сохранены.

`GET /health` — 200, `{ok:true,storage:"d1",mode:"intent"}`. Безопасная проверка с новым chicken 500/1000 и `priceConsent:false` — 422, только `fields.priceConsent`; ошибок items нет. Это проверка актуального каталога без сохранения заявки и без ложной конверсии. Полный путь записи/повтора покрыт локальной API/SQL интеграцией. В production новую тестовую заявку не создавали.

## Доказательства

`qa/screenshots/design-motion-20261026/`: desktop-1280.png, mobile-320.png, mobile-390.png, catalog-desktop.png, catalog-mobile.png, chicken-product.png, worker-deployed.png.

## Первый выпуск и найденная регрессия

Frontend `884219b` опубликован, [CI 40311572615 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40311572615). Главная, новый товар, блог и sitemap — HTTP 200, побайтовое совпадение со сборкой (`qa/design-motion-production.json`).

Первый публичный [PSI mobile / desktop](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/75gwyvq9i4?form_factor=mobile): **87 / 99**, остальные категории 100. Mobile FCP 1.1 с, LCP 3.8 с, TBT 0, CLS 0, SI 4.1 с. Desktop FCP 0.3 с, LCP 0.9 с, TBT 20 мс, CLS 0.003, SI 0.6 с. Длинное вступление ухудшило SI; LCP — фоновая морская иллюстрация, element render delay 2000 мс. PSI также указал две некомпозитные анимации `stroke-dashoffset` волн.

Исправление: волны двигаются через transform, без перерисовки контура на каждом кадре; вступление пирога сокращено с 4.2 до 1.2 с, бейдж 900 мс и волны 1100 мс. Смена вкусов, параллакс, scroll reveal и hover сохранены. Build/SEO повторно PASS. Локальный LH после исправления: P98 / 100, A100 / SEO100, BP77; mobile LCP 2.3 с, SI 1.3 с, element render delay 130 мс, CLS 0. Это диагностический локальный результат, не публичный PSI.

## Второй публичный замер и touch-оптимизация

Runtime `7f3c54b`, [CI 40312321116 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40312321116). Четыре production URL совпали со сборкой. Новый [PSI b96owxkdni](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/b96owxkdni?form_factor=mobile): **87 mobile / 99 desktop**, A/BP/SEO 100. Mobile FCP 1.0, LCP 3.8, TBT 0, CLS 0, SI 4.0; desktop FCP 0.4, LCP 0.9, TBT 30, CLS 0, SI 0.6. Некомпозитные волны больше не отмечены, но LCP-подложка имеет render delay 1980 мс. Следовательно, первое исправление не устранило задержку публичного LCP; локальный быстрый результат её не опровергает.

В `c2a13d6` вступление ограничено hover/fine устройствами. На touch полный первый кадр статичен сразу, у подложки убраны transform/transition/mix-blend, у пирога — filter. Смена вкусов и scroll reveal остаются; reduced motion сохранён. Локальный LH: 98/100, A100/SEO100/BP77, mobile LCP 2.3 с, SI 1.2 с, TBT 0, CLS 0. Build/SEO PASS. Публичный [PSI 8v8kevqfni](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/8v8kevqfni?form_factor=mobile), 13:17:53 Europe/Kaliningrad: **87 mobile / 100 desktop**, A/BP/SEO 100. Mobile FCP 1.0 с, LCP 3.8 с, TBT 0, CLS 0, SI 4.0 с; desktop FCP 0.3 с, LCP 0.4 с, TBT 0, CLS 0, SI 0.3 с. [CI 40313544387 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40313544387), четыре production URL побайтово совпали со сборкой. Touch-правка восстановила desktop 100, но mobile LCP-подложка всё ещё имеет render delay 2000 мс. Это не устранённая задержка.

## Упрощение подложки

В `99d3bdf` CSS mask-image морской подложки заменён простым градиентным перекрытием в цвет бумаги. Отдельное изображение сохранено, визуальная композиция проверена на 1280 px; mask none, overflow false. На desktop blend/parallax остаются; на touch подложка статична. Локальный мобильный Lighthouse P98 / LCP 2.3 с, фактический element render delay 71 мс — отдельная диагностика, не публичный результат. Build/SEO PASS. Не объявляем mask-image установленной причиной задержки по одному локальному замеру.

На невысоких ноутбуках (`min-width:761px`, `max-height:850px`) hero компактнее; подложка кадрируется с сохранением башни. Проверено на 1280×720: controls bottom 630 px, все три кнопки полностью видны, overflow false. Этот media query не меняет мобильную композицию.

## Финальный выпуск — b5e6b2e

[CI 40315000160 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40315000160). Check/build/SEO/14 tests PASS; IndexNow принял изменённую главную, HTTP 200. В 11:30:45 UTC четыре production URL (главная, курица с грибами, блог, sitemap) HTTP 200 и побайтово совпали со сборкой: `qa/design-motion-production.json`.

Опубликованный UI повторно проверен: 1280×720 controls bottom 630 px, 390×844 hero 758 px; горизонтального переполнения нет. Первый рыбный слой загружен, скрытые альтернативы не блокируют первый кадр. Снимки `production-desktop.png` / `production-mobile-390.png` обновлены с домена.

[Свежий официальный PSI mobile](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/budopejsat?form_factor=mobile) / [desktop](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/budopejsat?form_factor=desktop), 26.10.2026 13:30:52 Europe/Kaliningrad: **100 / 100**, A/BP/SEO по 100 в обоих режимах. Mobile FCP 0.9 с / LCP 1.7 с / TBT 0 / CLS 0.003 / SI 0.9 с; desktop 0.3 с / 0.4 с / 20 мс / 0.007 / 0.5 с. Тексты `qa/psi-motion-b5e6b2e-{mobile,desktop}.txt`, снимки `psi-final-{mobile,desktop}.png`. CrUX без данных. Это один новый замер после изменения runtime; прежние 87 сохранены в истории. Один успех не доказывает стабильные 100 при любых условиях и не устанавливает причину переменной задержки LCP.

Задача выразительного дизайна и восьмого пирога завершена. Метрика и подтверждение backend-успеха сохранены; реальных заказов, сбора контактов и платежей нет. Heartbeat не создавался. Следующая самостоятельная работа — наблюдение реальных показов/визитов и подготовка производства после решения владельца; этот проход её не возобновляет.


## Уточнение пользователя — центрирование пирога

В `src/styles/tasting-hero.css` общий контейнер пищевого слоя имеет `inset:16% 0 -8%`: пирог опущен относительно овальной подложки, сохраняя пространство над подписью. При 1280×720 центр контейнера находится на 8 px выше центра овала (до правки — примерно на 54 px). Размер hero, подпись и кнопки не изменены. Проверены рыба/мясо/вишня, 320/390/1280 px; переполнения и перекрытия подписи нет. Доказательства: `center-desktop.png`, `center-mobile-390.png` в папке снимков этого прохода.

Check (69 файлов, 0 ошибок/предупреждений), build, SEO (39 HTML / 37 sitemap URL / 8 товаров / 2520 ссылок), registry strict PASS. Локальный Lighthouse: Performance 98 mobile / 100 desktop, Accessibility/SEO 100; мобильный LCP 2.3 с, TBT/CLS 0. Это локальная диагностика, не новый публичный PSI. Новых скриптов, ресурсов или бизнес-изменений нет.
