# Баннеры пирогового города — завершено

Цель: продолжить одобренный логотип brand-v6 в трёх баннерах главной через встроенный imagegen и проверить телефон/планшет.

Готово: три прозрачных PNG1254×1254,33адаптивных AVIF/WebP, все три слайда и HTML CTA. Основной город, три острова для компании, вишнёвый квартал. Исправлены min-width текстовой колонки на320px и CTA вишнёвого пирога. Check0errors/0warnings, build217HTML,41Node, SEO/product validator, registry strict PASS. Local и production: по27 browser layout/slide проверок, Retina390@3/768@2, Chrome CDP touch swipe, normal/reduced motion/no-JS, ссылки PASS. Визуально просмотрены все сюжеты и полные экраны телефона/планшета/desktop.

Runtime b93272bb83dc35488cd0e27b6961b4cf9e4d4080 в main. CI41119062743 completed/success. Все267 production ресурсов (217HTML,33изображения,16JS,release.json) HTTP200 и совпадают с независимо скачанным Pages artifact.

Local gzip before/after, по одному холодному запуску: mobile95→96/LCP2724→2559ms, desktop100→100/LCP506→509ms, TBT0/A/BP/SEO100. Production Lighthouse CLI: mobile98/LCP2346ms/CLS0.0060/TBT47ms; desktop99/LCP591ms/CLS0.0021/TBT0, A/SEO100, BP77 из-за cookies/Issues Метрики. Одиночные лабораторные замеры не доказывают стабильность. Public PSI mobile/desktop не выдал отчёт: «Не удалось перейти по адресу https://pirogorsk.ru/. Проверьте правильность URL.» Не смешивать с CLI.

Доказательства: README.md, local-results.json, production-results.json, asset-checks.json, image-requests.json, ci-result.json, publication.json, public-psi.json, performance-{before,after,production} summary/ranges и production-снимки. Точные промпты и оригиналы — design/pie-city-banners-20261030. Открытых пунктов поручения нет. Следующий commit содержит только QA/протокол [skip ci].
