"""Check the public destinations observed in GSC without recording user traffic."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
import hashlib
import json
import urllib.request

ROOT = Path(__file__).resolve().parent
BASE = 'https://pirogorsk.ru'
ui = json.loads((ROOT / 'ui-observations.json').read_text())
snapshot = json.loads((ROOT / 'gsc-snapshot.json').read_text())
paths = {row['path'] for query in ui['filteredQueryPages'] for row in query['pages']}
paths.update(row['path'] for row in ui['indexing']['individualInspection'])
paths.update(row['Популярные страницы'].removeprefix(BASE)
             for row in snapshot['tables']['pages'] if int(row['Kлики']))
paths.update(['/terms/', '/privacy/', '/?interest=city-zelenogradsk'])


class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = []
        self.robots = []
        self.title = ''
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical.append(attrs.get('href'))
        if tag == 'meta' and attrs.get('name', '').lower() == 'robots':
            self.robots.append(attrs.get('content'))
        if tag == 'title':
            self.in_title = True

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


def fetch(path):
    request = urllib.request.Request(BASE + path, headers={'User-Agent': 'Pirogorsk-Readback/1.0'})
    with urllib.request.urlopen(request, timeout=30) as response:
        data = response.read()
        head = Head()
        head.feed(data.decode('utf-8'))
        canonical = BASE + ('/' if '?' in path else path)
        assert response.status == 200, path
        assert head.canonical == [canonical], (path, head.canonical)
        noindex = any('noindex' in value.lower() for value in head.robots)
        assert noindex == (path in ['/terms/', '/privacy/']), (path, head.robots)
        assert head.title, path
        return {'path': path, 'status': response.status, 'finalUrl': response.url,
                'canonical': head.canonical[0], 'robots': head.robots, 'title': head.title,
                'sha256': hashlib.sha256(data).hexdigest()}


with ThreadPoolExecutor(max_workers=4) as executor:
    pages = list(executor.map(fetch, sorted(paths)))
result = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'method': 'HTTP readback, no browser analytics JavaScript executed', 'pages': pages}
(ROOT / 'production-readback.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(f'PASS {len(pages)} HTTP 200/title/canonical/robots checks')
