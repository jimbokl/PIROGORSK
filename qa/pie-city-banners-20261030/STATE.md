# Баннеры пирогового города — 30.10.2026

Цель: заменить три визуала существующего слайдера главной иллюстрациями в стиле одобренного brand-v6. Главная ведёт к ассортименту; CTA, категории и подборка остаются рабочими.

Источник: design/brand-v6/pie-city-logo.png, пользователь одобрил и попросил продолжить эту айдентику в баннерах. Встроенный imagegen, три отдельных изображения: основной город, острова для компании, ягодный квартал. Текст и кнопки — HTML; изображения адаптивные AVIF/WebP; первый eager, остальные lazy.

Проверка: check/build/SEO, релевантные существующие тесты; визуально все слайды на 320/390/768/1024/1280px, переключение, клавиатура, свайп, reduced motion/no-JS, ссылки, отсутствие наложений/overflow/ошибок. Сравнить скорость с текущей production-базой, дождаться CI и проверить prod на телефоне и планшете.

Готово: три imagegen PNG1254×1254 с прозрачностью, Astro AVIF/WebP, все три слайда интегрированы. Исправлены min-width текстовой колонки на320px и CTA вишнёвого слайда. Check0errors/0warnings, build217HTML,41Node, SEO/product validator, registry strict,27 browser layout/slide checks PASS. Визуально просмотрены телефон/планшет/desktop, все сюжеты. Свайп — synthetic touch handler; normal/reduced motion/no-JS и назначения PASS.

В работе: локальный Lighthouse after; затем commit/push, дождаться CI, сверить публичные HTML/новые файлы с CI artifact, production UI и Lighthouse, публичный PSI mobile/desktop, финальный протокол. Локальный gzip server4323 session54561. База до изменений: local mobile95/LCP2724ms, desktop100/LCP506ms; production прошлого runtime4e5053a mobile99/LCP1816ms, desktop100/LCP565ms — разные замеры, каждый по одному запуску.
