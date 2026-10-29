# Полировка Пирогорска без CRM — 29.10.2026

CRM отложена по последнему поручению пользователя. Текущее изменение касается сайта и подготовки к запуску; приём реальных заказов не включён.

## Изменения

- Общий поиск по 153 позициям: несколько слов независимо от порядка, русский регистр и ё/е, вес/формат, перезагрузка URL `q`. Canonical остаётся `/menu/`.
- Четыре раздела, счётчики результатов, доступный сброс и пустая выдача. Фильтры производителей и пагинация 24 карточки сохранены.
- Первые разделы — целые пироги и выпечка пекарен. Восемь концептов и шесть дополнений сохранены; 153 товарных URL не менялись.
- Возврат с каждой страницы товара в соответствующий раздел/категорию меню.
- Калькулятор явно объясняет применимость к восьми концептам 500 г / 1 кг. Существующая арифметика не менялась.
- Порядок планируемого запуска отражён на доставке и городских страницах: Калининград/Зеленоградск, затем Светлогорск после 30 дней работы.

## Проверки до публикации

| Проверка | Результат |
|---|---|
| `npm run check`, `npm run build` | PASS |
| `npm test` | 36/36 PASS |
| `npm run test:worker` | TypeScript, API, SQL PASS |
| `npm run test:browser` | Настоящий Astro/Worker, in-memory SQLite;320/390/1280 px PASS; production-запросов нет |
| SEO, expansion, SEO-map, city pages | 214 HTML,212 canonical в sitemap,145 товарных SEO-владельцев,3 городских страницы; PASS |
| Article artwork, product pages, product backdrops | 23 статьи,153 товара,139 иллюстраций; PASS |
| Shared skill/harness registry `check --strict` | PASS: 0 ошибок, drift отсутствует; 99 прежних предупреждений реестра |

Браузерная регрессия дополнена проверками общего поиска после локального фильтра, нескольких слов/регистра, веса 850 г, сохранения запроса после перезагрузки, canonical, пустой выдачи, фокуса после сброса, морса и 153 результатов. Старую проверку последней страницы пагинации перенесли до сброса фильтров. Для физического клика по ссылке товара после сжатия длинного раздела добавлена мгновенная предварительная прокрутка: smooth scroll мог смещать цель между определением координат и кликом.

Отдельный smoke: `node qa/polish-20261029/verify-ui.mjs [origin] [label]`. Проверяет ссылку возврата во всех 153 HTML, поиск и 12 физических переходов из товара в раздел, этапы трёх городов и калькулятор на 320/390/1280 px. Работает в QA-режиме; POST запрещены внутри этого теста, реальная форма в production не отправляется.

Локальная среда: Node 25.9.0, Chrome 156, Astro production-build preview 4322. Три свежих mobile-профиля: P 99/99/99, LCP 1831/1891/2044 мс; desktop P 100 / LCP 409мс. A/BP/SEO 100, CLS 0. Это лабораторные данные локальной сборки, не полевые данные. [Сводка](performance-local/performance-summary.json).

## Публикация

Первый runtime `83fa9703f99159ae816f00454a2e11ec6c730e75`: [CI40934645328 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40934645328), published compatibility PASS. Все153 товарные страницы и остальные изменённые ресурсы —170 URL — HTTP200 и побайтово совпали со сборкой. Production UI320/390/1280: поиск/перезагрузка, возврат из4 типов товаров, три города и калькулятор PASS; JS-ошибок, отсутствующих ресурсов, горизонтального переполнения и POST нет.

Публичный [PSI меню21:00:29 GMT+2](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-menu/xpys4l5mwp?form_factor=mobile) выявил задержку: P87/LCP3687мс, FCP1236мс, TBT14мс, CLS0.001; A/BP/SEO100. LCP — `p.ed-intro`, observed render delay2360мс, критический сетевой путь561мс. [Исходные метрики](psi-menu-before.json) сохранены. Локальный CLI production Chrome156 этого не воспроизвёл: LCP1451–1595мс; [все4 запуска](performance-production-before.json), отдельная среда от публичного PSI.

В общих шаблонах сохранены четыре font preload, которые ранее воспроизводимо задерживали первый кадр главной в Chrome153. В меню повторили диагностический A/B: один исходный HTML с production, оригинальные ресурсы/Метрика, fresh Chrome for Testing153 new headless/profile, DevTools CPU6.27 и сеть без ограничения. [Скрипт](render-font-control.mjs), [все6 результатов](render-menu-font-control-summary.json): baseline FCP1311/2208/2264мс, без preload314/1200/1305мс, CLS0. Третий запуск пересёкся с локальной сборкой; эти observed данные не являются PSI scores и не доказывают полную стабильность.

В `ContentLayout` и `SeoHead` font preload по умолчанию выключены. Playfair/Golos и inline font-face сохранены; аналитика и содержимое не менялись. Check/build/36tests/SEO PASS: все214 HTML без font preload, четыре файла шрифтов сохранены. Runtime `07c3b94`, [CI40937403004 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/40937403004), [снимок CI](font-ci.json). Независимый [production readback](publication.json): все214 HTML и ресурсы —229 URL — HTTP200 и точные SHA256 сборки; Pages/Worker compatibility PASS. Повторный [UI smoke](production-readback.json) на320/390/1280 px: все153 ссылки, поиск/перезагрузка/возврат, три города и калькулятор PASS, без overflow/JS-ошибок/потерянных ресурсов/POST.

В дополнительной [серии из восьми запусков](render-menu-render-isolation-summary.json) после удаления preload смена optional на swap, удаление скриптов и content-visibility для разделов не устранили остаточный разброс первого кадра: контроль288/1261мс, swap1273/1281мс (CLS0.0027), без скриптов1237/1257мс, content-visibility1289/1287мс. Поэтому эти экспериментальные изменения в сайт не внесены. Все варианты, включая неудачные, сохранены; observed timing этой диагностики не заменяет публичный PSI.

## Итоговая проверка опубликованной версии

Публичный PSI после исправления; три независимых свежих mobile-отчёта, Chrome153/Lighthouse13.5, Moto G Power, slow4G. Во всех mobile/desktop Performance/Accessibility/Best Practices/SEO —100, CLS0. [Все метрики и время отчётов](psi-menu-after.json).

| Отчёт 29.10, GMT+2 | LCP | TBT | Observed render delay |
|---|---:|---:|---:|
| [Mobile21:15:12](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-menu/o2cbvn72af?form_factor=mobile) | 1501мс | 41мс | 210мс |
| [Mobile21:16:25](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-menu/kin9gkxmqc?form_factor=mobile) | 1109мс | 14мс | 270мс |
| [Mobile21:17:17](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-menu/aarvapdnp8?form_factor=mobile) | 1091мс | 0мс | 320мс |
| [Desktop21:15:12](https://pagespeed.web.dev/analysis/https-pirogorsk-ru-menu/o2cbvn72af?form_factor=desktop) | 323мс | 2мс | — |

Повторные mobile-запросы использовали обычный `lcpcheck`, чтобы получить новые trace ID. [Эквивалентность ответа](psi-query-equivalence.json): canonical и оба query URL вернули одинаковые691260 байт/SHA256, canonical `/menu/`, QA выключен; обычная аналитика сохранена. В этой серии задержка3.69с больше не воспроизвелась. Это лабораторные результаты; полевых CrUX-данных пока нет.

Отдельная [CLI-серия по production](performance-production-after.json), Chrome156: mobile100/100/100, LCP1294/1383/1284мс; desktop100/LCP458мс. CLS0, Accessibility/SEO100, прежний Best Practices77 из-за сторонних cookies/Issues Метрики. Эта среда отличается от публичного PSI; все четыре результата сохранены.

[Меню на телефоне390px](production-menu-sections-390.png). Программная часть спринта и публикация завершены. CRM отложена.

Перед реальными продажами остаются подтверждение поставок, фасовки/наличия, логистики/тарифов, собственных контактов и рабочего процесса приёма заказов. CRM в текущую работу не входит.
