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

Публичный замер исправленного выпуска будет зафиксирован после публикации.
