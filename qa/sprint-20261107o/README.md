# Спринт o · 07.11.2026

Новый [рецепт заливного пирога с капустой](https://pirogorsk.ru/journal/zalivnoy-pirog-s-kapustoy-na-kefire/):7 разделов,2 таблицы,7 шагов,3 источника. Две оригинальные imagegen-иллюстрации в балтийской айдентике. Выбор капустной начинки и осетинский рецепт сохранены, ссылки идут в обе стороны. Авторская рецептура атрибутирована; собственное испытание не заявлено.

[Бриф](../../research/content-sprint-20261107o/brief.md), [редакторский аудит](../../research/content-sprint-20261107o/editorial-audit.md), [промпты](../../research/content-sprint-20261107o/imagegen-prompts.txt). Блог86/SEO-карта281/HTML286.

Карточки журнала: время чтения не разрывается на строки; обложка приближается на2,5% при наведении мышью; стрелка отвечает на нажатие. Reduced motion отключает движение. Геометрия и лента не меняются.

Локально: check658 —0 ошибок/0 предупреждений; unit66; build286; Worker/API/SQL; SEO281; artwork86; monthly210; priority16; registry strict без drift — PASS. Статья/карточка на320/390/768/1024/1440; каталог154 на6 ширинах до1440, количество1→2→99→1 — PASS. Проверены все85 обычных карточек +1 выделенная статья, focus/физический переход/hover/reduced motion/no-JS. Снимки телефона и планшета просмотрены. [Локальная приёмка](acceptance-local.json).

Проверка social preview сначала поймала1200×800 вместо1200×630; размер исправлен, повтор artwork PASS. Дополнительный gallery-check сначала ожидал86 обычных карточек: фактически85+1 выделенная, проверка исправлена и повторена без отключения продуктовых проверок. Исходные логи сохранены.

Runtime `2c14834a8bed7f6b6bfa211769bc953e990a7369`; [CI42389346631 SUCCESS](https://github.com/jimbokl/PIROGORSK/actions/runs/42389346631), Pages07.11 16:24:14UTC; Worker/Pages/IndexNow PASS. Production9 HTML SHA256/144 ресурса (73 байт-совпадения,71 AVIF размеры/декодирование)/6 ссылок; блог86/sitemap281; focused5/blog-card5/catalog6 PASS, телефон/планшет просмотрены. Один connect timeout `/product-backdrops/tea-256.avif` восстановлен штатным повтором; причина не установлена. Лента/154 SKU/цены/CRM/контакты сохранены. W07-03/SEO-11, QA-17/PERF-01 и индексация открыты. [Итоговая приёмка](acceptance-final.json). Чужой diff BACKLOG59+/4− исключён.

CI-04/P2: Actions сообщает, что checkout/setup-node/cache/configure-pages/upload-artifact на Node20 принудительно запускаются на Node24; также отмечена миграция ubuntu-latest на Ubuntu26. Сборка и публикация успешны. Обновление закреплённых actions и повторная проверка выделены в бэклог.


Иллюстрации созданы встроенным imagegen (tool mode), затем оптимизированы для Astro:

- [Обложка: пирог с капустой](../../design/blog-source/month-202611/zalivnoy-pirog-s-kapustoy-na-kefire.png).
- [Подготовка начинки и теста](../../design/blog-source/reading-20261107/cabbage-recipe-preparation.png).
- [Полный набор промптов](../../research/content-sprint-20261107o/imagegen-prompts.txt).
