# DNS и HTTPS pirogorsk.ru

23.10.2026 20:03 UTC: делегирование Cloudflare работает; 1.1.1.1 возвращает четыре GitHub Pages A. Обычный HTTPS-запрос к корню возвращает HTTP/2 200 без обхода проверки сертификата. GitHub certificate state=approved, имена pirogorsk.ru и www.pirogorsk.ru, срок до 21.01.2027. Enforce HTTPS включён. Итоговые перенаправления www/HTTP проверяются после публикации.

NS: dexter.ns.cloudflare.com и stella.ns.cloudflare.com. Cloudflare account aa508810903f574fb377968085432467, zone 6497ad0709452fe7de357cf3b5b56c13. GitHub Pages: jimbokl/PIROGORSK, custom domain pirogorsk.ru.

| Имя | Тип | Значение | Режим | TTL |
| --- | --- | --- | --- | --- |
| @ | A | 185.199.108.153 | DNS only | 300 |
| @ | A | 185.199.109.153 | DNS only | 300 |
| @ | A | 185.199.110.153 | DNS only | 300 |
| @ | A | 185.199.111.153 | DNS only | 300 |
| www | CNAME | jimbokl.github.io | DNS only | 300 |

CAA отвечает без ограничений. Делегирование в .ru появилось 23.10 около 19:26 UTC. После DNS GitHub выпускал сертификат; в 19:57 UTC custom domain удалён и возвращён по официальной процедуре GitHub, в 20:01 UTC сертификат approved. Повторный сброс не требуется.

Google Search Console: domain property sc-domain:pirogorsk.ru подтверждён DNS. Яндекс.Вебмастер: https://pirogorsk.ru подтверждён DNS. TXT подтверждения сохранены в зоне. Sitemap https://pirogorsk.ru/sitemap.xml отправить после публикации новых страниц.

Проверки: `dig @1.1.1.1 pirogorsk.ru A`, `gh api repos/jimbokl/PIROGORSK/pages`, `curl --max-time 20 -IL https://pirogorsk.ru/`, аналогично www и HTTP. Наличие записи и успешный TLS — отдельные проверки от индексации и PageSpeed.

[GitHub Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https), [устранение проблем домена](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages). Схема основана на /Volumes/DevSim/Projects/MALINA/dns.md; MALINA не изменялся.
