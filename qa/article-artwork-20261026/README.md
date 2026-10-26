# Индивидуальные обложки — 26 октября 2026

Поручение: «у каждого материала должна быть своя собственная графика».

Результат: **23 статьи / 23 разных исходника / 23 OG**. 15 новых ImageGen-сцен; восемь прежних индивидуальных сцен сохранены. Разные сюжеты: начинка крупным планом, сравнение форматов, семейное кафе, выдача навынос, офис, разогрев, ужин и пикник. Исходники и точные промпты: [design/blog-source](../../design/blog-source/README.md).

## Подключение

Единый реестр `src/data/article-artwork.json` и типизированный модуль обслуживают статьи, карточки и alt. Dynamic journal и статический гид Зеленоградска имеют отдельные OG и BlogPosting.image. Иллюстративный характер сцен подписан на страницах; это не фотографии конкретных кафе или производства. Главная, логотип, backend и условия `order_submit` не менялись.

## Проверки до публикации

- Check: 90 файлов, 0 errors/warnings/hints — `check.log`.
- Build: 69 HTML — `build.log`.
- SEO: 67 sitemap URL / 3931 локальная ссылка / 8 концептов — `seo.log`.
- Expansion: 36 целей / 36 адресов / 16 сценариев — `expansion.log`.
- 19 tests PASS — `tests.log`; shared registry strict PASS — `registry.log`.
- Уникальность SHA-256 всех 23 источников и 23 OG, cover/card/alt/schema, размеры — `verification.log`. OG 1200×630: 123–196 КиБ; fallback WebP 44–88 КиБ.
- UI через CUA: блог, продуктовый гид, городской гид и прежняя статья; ширины 320/390/1280, горизонтального переполнения нет — `responsive.json`, PNG. Загрузка нижних карточек остаётся lazy.

## Публикация и скорость

Runtime `2b6a569292827e55834cd4027b36854facc2c644`, [CI40366612177 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40366612177). `production.json`: **71 URL HTTP200 / точное совпадение SHA-256 со сборкой** (23 статьи, 23 OG, 23 fallback WebP, блог и sitemap). Скрипт повторной проверки — `verify-production.mjs`. `production-cards.png` — карточки с домена.

`indexnow/report.json`: 25 изменённых URL, оба получателя HTTP200. Это приём уведомлений, не подтверждение индексации.

Публичный [PSI uqoytb7fgy](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-journal-rybnaya-nachinka-dlya-piroga/uqoytb7fgy?form_factor=mobile), 26.10 19:19 Калининград, статья о рыбной начинке, обычный production URL без QA. **P90 mobile / P100 desktop, A/BP/SEO100 обоих**. Mobile FCP0,9с / LCP3,6с / TBT20мс / CLS0 / SI2,8с. Desktop FCP0,3с / LCP0,4с / TBT20мс / CLS0 / SI0,5с. CrUX нет. Исходные readback `psi-*.txt`, показатели из видимого калькулятора — `public-psi-summary.json`. В разбивке LCP на мобильном — обложка: задержка ресурса210мс / загрузка250мс / отрисовка890мс; сама разбивка не доказывает единственной причины симулированного LCP3,6с. Не выполнено требование 100 на каждом шаблоне.

Отдельно локальный Lighthouse preview4322: **P/A/BP/SEO100 обоих**, mobile LCP1,8с, desktop0,4с, TBT0/CLS0. Полные JSON/HTML и summary — `local-lighthouse/`. Это не публичный PSI.

Документы выпуска: `BUILD-STATE.md`, `RECAP.md`, `PERFORMANCE.md`; heartbeat не возобновлялся.
