# Происхождение

Адаптировано для Пирогорска 26.10.2026 из `skills/design-to-motion/SKILL.md` репозитория [elayadesign/ai-design-skills](https://github.com/elayadesign/ai-design-skills) на commit [`a2735a3eaf092eaaffb6dc17df25de33ef3bd048`](https://github.com/elayadesign/ai-design-skills/tree/a2735a3eaf092eaaffb6dc17df25de33ef3bd048).

Copyright (c) 2026 Elaya. MIT License, полный текст в [LICENSE](LICENSE).

Сохранены указания авторов исходного навыка на источники общих принципов движения, адаптированных ими из MIT-коллекций:

- [emilkowalski/skills](https://github.com/emilkowalski/skills): стоимость анимируемых свойств, ограничение blur, reduced motion.
- [Owl-Listener/designer-skills](https://github.com/Owl-Listener/designer-skills): соответствие skeleton реальной форме, последовательность появления.
- [dylantarre/animation-principles](https://github.com/dylantarre/animation-principles): разнесённые по времени соседние движения и непрерывная петля.

Местная версия разделяет лёгкое движение в Astro и отдельный проморолик, использует слои пирога, сохраняет полезный первый экран и условия подтверждения формы. Длительный пустой старт, обязательные бесконечные эффекты и экспорт трёх файлов для любого запроса заменены выбором по задаче. Порядок статической проверки, воспроизводимого захвата и проверки границы цикла сохранён в адаптированном виде.

При обновлении upstream сравнить ревизии и перенести подходящие изменения вручную; поля `upstream-*` фиксируют происхождение, не подменяют локальный навык оригиналом.
