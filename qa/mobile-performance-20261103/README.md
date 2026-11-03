# PERF-02 · Начальная отрисовка главной

## Исходный отчёт

[Public PSI, 03.11.2026 09:56 GMT+2](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/n1193g0kd6?form_factor=mobile), Lighthouse 13.6 / Chromium 153.
Runtime `09fff3853e21c0ae8022d9d0a6fd2d8e3f38e3a9`.

| Среда | Performance | LCP | TBT | CLS |
|---|---:|---:|---:|---:|
| Public PSI mobile | 88 | 3,792 s | 43 ms | 0,001 |
| Public PSI desktop | 89 | 0,543 s | 284 ms | 0,003 |

LCP — первый баннер города. В observed breakdown: TTFB 20 ms,
обнаружение ресурса 260 ms, загрузка 210 ms, задержка показа 960 ms.
Forced reflow: 121 ms в inline-коде главной (строка 13, позиция 38336),
96 ms в Metrika. Production HTML сопоставлен с исходником:
синхронный `getBoundingClientRect()` в цикле reveal-анимации.
Полный SSR-каталог уже существует, контроллер ленты скрывает последующие
пакеты; чтение геометрии вынуждало браузер закончить компоновку при старте.

Повторный public PSI **до публикации** в 10:41 GMT+2:
[mkojvupbgy](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/mkojvupbgy?form_factor=mobile).
Mobile 98 / LCP 2,251 s / TBT 6 ms / CLS 0,001; desktop 68 /
LCP 0,721 s / TBT 1358 ms / CLS 0,003. На той же версии сохраняется
forced reflow 70 ms, но observed render delay уже 130 ms вместо 960 ms.
Следовательно, исходные 88 включают существенный разброс лаборатории;
нельзя приписывать всю разницу после публикации только исправлению.
Mobile best practices 96: единичный HTTP 503 для golos-cyrillic.woff2.
Независимая проверка всех четырёх font URL вернула 200, cache max-age=600.

## Исправление

- Начальные измерения заменены геометрией IntersectionObserver.
  Начальный экран остаётся неподвижным, последующие reveal сохранены.
- Responsive AVIF preload первого баннера перенесён в head. Picture и preload
  используют общий генератор размеров/URL: один запрос нужного crop.
- Проверка 480 px выявила округление `min-width: 480.01px` и пересечение
  preload-условий. Широкий вариант использует точное дополнение `width > 480px`.
- Семь сцен, изображения, 154 SKU, лента, цены и аналитика сохранены.

## Локальная проверка

Lighthouse 13.5, Chrome, simulated throttling, новый процесс/профиль на каждый
замер. Измерения без `?qa=1`, аналитика включена. Полные отчёты сохранены
локально в before/local-before/local-after; компактные метрики и время —
[lab-comparison.json](lab-comparison.json). Разные лаборатории не сравниваются
как один контролируемый эксперимент.

| Сборка на localhost | Mobile score, 3 запуска | LCP, 3 запуска | Desktop score / LCP |
|---|---|---|---|
| До | 96 / 99 / 99 | 2,718 / 2,060 / 2,045 s | 100 / 0,553 s |
| После | 99 / 99 / 99 | 2,118 / 2,044 / 2,041 s | 100 / 0,516 s |

Медиана LCP почти не изменилась, худший из трёх запусков улучшился.
Это не доказательство стабильных 99 для всех посетителей.

check: 0 errors / 0 warnings; build: 262 страницы; SEO: 154 карточки,
257 sitemap URLs, 98 565 ссылок PASS; 66 Node-тестов PASS.
Каталог: все 154 SKU/варианты и qty 1→2→99→1 на шести ширинах PASS.

[verify-hero.mjs](verify-hero.mjs): 320/390/480/481/600/768/1280 px,
один подходящий preload и один запрос первого баннера; одинаковая высота
всех семи слайдов; клавиатура/reduced motion; все 154 товара без JS PASS.
[Локальный отчёт](local-hero/report.json). Телефон, планшет и desktop
просмотрены в эмуляции Chrome.
Forced reflow первой локальной трассы: 32,568 ms → отсутствует;
во всех трёх after-трассах аудит PASS. [Детали](forced-reflow.json).

## Публикация

Runtime `6e75d0d916b786386792f0152a717a882dcef069`,
[CI SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/41604982285),
03.11.2026 09:14:54 UTC. Полный CI прошёл сборку, SEO/content, Node/Worker,
browser, site-polish, journal, bundles/picnic, каталог, cutaway и release.

[verify-published.mjs](verify-published.mjs) сравнил опубликованную главную
с локальной сборкой: 7 inline-скриптов, inline-CSS и 6 внешних JS совпали по SHA256;
responsive preload совпал, все четыре шрифта ответили HTTP 200.
[Результат](published-assets.json), [CI receipt](ci.json).
`verify-release.mjs published https://pirogorsk.ru/` PASS.

[Production hero](production-hero/report.json): один нужный preload и запрос
баннера, семь сцен одинаковой высоты на семи ширинах, клавиатура,
reduced motion и 154 товара без JS PASS. Телефон и планшет просмотрены.
Первый production-прогон получил таймаут ожидания одного перехода;
диагностический повтор без изменений runtime прошёл все 49 переключений,
без page errors и зарегистрированных ошибок запросов. Причина исходного
таймаута не зафиксирована; считать его доказанной ошибкой CDN нельзя.

## Новые публичные отчёты Google

Обычная главная без `?qa=1`, аналитика включена. Lighthouse 13.6 / Chromium 153.

| Отчёт, 03.11.2026 GMT+2 | Mobile score / LCP | Mobile TBT / CLS | Desktop score / LCP |
|---|---|---|---|
| [11:15:53](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/nnvr15xszt?form_factor=mobile) | 99 / 2,101 s | 50 ms / 0,005 | 100 / 0,521 s |
| [11:18:08](https://pagespeed.web.dev/analysis/https-pirogorsk-ru/ltgjy6y7gs?form_factor=mobile) | 99 / 2,101 s | 12 ms / 0,001 | 100 / 0,521 s |

Accessibility / best practices / SEO — по 100 на обоих устройствах в обоих
отчётах. В первом after observed render delay 60 ms; исходный URL нашего
startup-reflow исчез, но остаются unattributed 107 ms. Во втором mobile
нет failing reflow insight. Это не означает отсутствия любой компоновки.
[Все исходные и повторные публичные метрики](public-psi.json).

Отдельная холодная серия на production, Lighthouse 13.5 / Chrome 156:
mobile 95 / 94 / 96, LCP 2,480 / 2,109 / 2,390 s; desktop 96 / 0,679 s.
Стартовая принудительная компоновка отсутствует во всех четырёх трассах,
аудит обнаружения LCP проходит. Best practices 77 обусловлены third-party
cookies и DevTools cookie issues Метрики, как и в исходной локальной серии;
ошибок console нет. Полные отчёты лежат локально в `after/`, компактные
результаты включены в [lab-comparison.json](lab-comparison.json).

Локальная production-серия не доказывает общего роста score относительно
95/96/95 до исправления. Публичная лаборатория дала два повторных 99,
но на старой версии уже наблюдался разброс 88→98. Подтверждённое изменение —
устранение конкретных стартовых синхронных измерений и ранний responsive
preload без двойной загрузки. Полевых CrUX-данных пока нет.
