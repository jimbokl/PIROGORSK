# Sprint 20261107h

Objective: продолжить доступную часть месячного контентного бэклога A6-60/80
в существующем гиде съедобных сувениров. Не создавать дублирующие городские
статьи. Каталог 154 SKU, цены, лента, CRM и контакты не меняются.

Plan:
- Проверить первоисточники: адреса Зеленоградска/Светлогорска и продуктовые форматы.
- Дополнить владельца конкретными таблицами, расчётом подарков и иллюстрацией.
- Проверить исходный текст, ссылки, метаданные, сборку и телефон/планшет.
- Опубликовать, дождаться CI и проверить фактические production HTML/ресурсы.

Done: источники сверены, материал и новая иллюстрация интегрированы; локальная приёмка пройдена.
Remaining: публикация, CI, фактический production readback.
Limits of evidence: нет подтверждения остатков, розничных цен и расписания
каждой точки; не выдавать их за проверенные. Исходные темы сохраняются
частичными, если прочие локальные продукты не подтверждены.

Baseline: runtime b891f802, docs HEAD 90c36785. Catalog SHA256
8f0167cee69690fdfa76d87a1b1edfe60354887dd0dfb16bd2c23dd7b6881a20.
Pre-existing BACKLOG working diff: 59 insertions / 4 deletions; preserve.

Local done: check0 errors/0 warnings, build282, unit66, SEO277 URLs, monthly185 viewports, focused5 widths/no-JS/new tables fit, catalog154/6 widths/physical formats3, artwork82, registry strict PASS. New inset WebP fallback145058 bytes. 28 neighboring monthly articles/meta/figures unchanged. Publication/CI/production remain.

Content priority: PASS — 3 владельца статей, 16 responsive views, 22 query cases, перенос подборки и no-JS fallback.
