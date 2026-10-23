# Домен Пирогорска

Проверено 23 октября 2026, 17:48 UTC (19:48, Калининград).

## Настроено

- Домен: `pirogorsk.ru`, регистратор REG.RU, оплачен до 23.10.2027.
- DNS: Cloudflare Free, зона создана отдельно для Пирогорска.
- NS у регистратора: `dexter.ns.cloudflare.com`, `stella.ns.cloudflare.com`. Изменение подтверждено интерфейсом REG.RU и WHOIS реестра.
- Хостинг: [GitHub Pages](https://github.com/jimbokl/PIROGORSK/settings/pages), источник GitHub Actions, публикация каталога `site/`.
- Custom domain в Pages: `pirogorsk.ru`, назначен до переключения DNS.
- [Первый деплой](https://github.com/jimbokl/PIROGORSK/actions/runs/39997141054) успешен, коммит `1ac3806`.
- Пока опубликована временная страница «Сайт готовится», закрытая от индексации.

| Имя | Тип | Значение | Режим | TTL |
| --- | --- | --- | --- | --- |
| `@` | A | `185.199.108.153` | DNS only | 300 |
| `@` | A | `185.199.109.153` | DNS only | 300 |
| `@` | A | `185.199.110.153` | DNS only | 300 |
| `@` | A | `185.199.111.153` | DNS only | 300 |
| `www` | CNAME | `jimbokl.github.io` | DNS only | 300 |

Зона также сохранена в `dns-zone.bind`. У нового домена были только две парковочные A-записи REG.RU; почтовых записей и подтверждений сервисов не было. Сейчас записи управляются в Cloudflare. Схема взята из `/Volumes/DevSim/Projects/MALINA/dns.md`; проект MALINA не изменялся.

## Что ещё ожидает подтверждения

Авторитативные серверы Cloudflare уже возвращают четыре правильных A и CNAME `www`. CAA корня отвечает `NOERROR` без ограничений. WHOIS реестра показывает `REGISTERED, DELEGATED, VERIFIED` и новые NS, однако сервер родительской зоны `.ru`, а также резолверы 1.1.1.1 и 8.8.8.8 в последней проверке ещё возвращали `NXDOMAIN`. Cloudflare показывает ожидание распространения новых NS. У REG.RU указано, что обновление может занять до 24 часов.

HTTP-запрос напрямую к GitHub Pages с `Host: pirogorsk.ru` даёт 200 и опубликованную страницу. `Host: www.pirogorsk.ru` даёт 301 на корневой домен. Это подтверждает настройку хостинга, но не публичную доступность домена.

GitHub Pages пока возвращает `https_certificate: null`, `https_enforced: false`. Публичный HTTPS ещё не подтверждён. После появления делегирования нужно проверить сертификат и включить Enforce HTTPS. Отдельная TXT-верификация владения доменом в настройках профиля GitHub пока не выполнена; браузер GitHub не авторизован. Custom domain в репозитории сохранён.

## Завершение проверки

```sh
dig @a.dns.ripn.net pirogorsk.ru NS +noall +answer +authority +comments
dig @1.1.1.1 pirogorsk.ru A +noall +answer +comments
dig @8.8.8.8 www.pirogorsk.ru CNAME +noall +answer +comments
gh api repos/jimbokl/PIROGORSK/pages --jq '{cname,https_certificate,https_enforced}'
gh api repos/jimbokl/PIROGORSK/pages/health
curl --max-time 20 -IL https://pirogorsk.ru/
curl --max-time 20 -IL https://www.pirogorsk.ru/
```

После успешного обычного TLS-запроса и подтверждённого сертификата обоих имён:

```sh
gh api --method PUT repos/jimbokl/PIROGORSK/pages -F https_enforced=true
curl --max-time 20 -IL http://pirogorsk.ru/
curl --max-time 20 -IL http://www.pirogorsk.ru/
```

Проверить итоговый переход на `https://pirogorsk.ru/` и статус Cloudflare Active. Не считать `{}` от Pages health доказательством готовности HTTPS. Локальные снимки интерфейса и исходные результаты DNS сохранены в BHOUSE: `research/pirogi-2026-10-23/domain-evidence/`.

При запуске полноценного сайта убрать запрет индексации временной страницы, задать HTTPS canonical и sitemap.

Официальные инструкции: [домен GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), [подтверждение владения](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages), [Cloudflare Full setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).
