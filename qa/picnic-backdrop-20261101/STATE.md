Задача BRAND-02: устранить отсутствие подложки пикник-сета во всех размещениях.
Причина: специальный foreground ProductVisual без backdrop; verify-product-backdrops
допускал foreground-only исключение. CodeGraph context: Transport closed;
исходники проверены напрямую. Оригинал cutout и 154 SKU/цены сохраняются.
Готово: новая отдельная подложка built-in imagegen, морской город/волны/облепиха.
Осталось: responsive manifest, строгие проверки покрытия и видимых слоёв,
local check/build/QA 320/390/768/1280, CI, production readback.
