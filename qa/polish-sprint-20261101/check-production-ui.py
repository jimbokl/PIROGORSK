"""Read-only verification of published polish HTML and CSS/JS against local build."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen
import json

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).parent
ROUTES = ['/', '/menu/', '/blog/', '/pirogi/myasnoy-pirog/', '/delivery/', '/nabory/']


def fetch(path):
    with urlopen(Request('https://pirogorsk.ru' + path, headers={'Cache-Control': 'no-cache'}), timeout=30) as response:
        assert response.status == 200, (path, response.status)
        return response.read(), response.headers.get('Content-Type', '')


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = set()
        self.entries = 0
        self.search_in_layout = False
        self.inline_tag = None
        self.inline_buffer = []
        self.inline_hashes = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'style' or (tag == 'script' and not attrs.get('src') and attrs.get('type', 'module') == 'module'):
            self.inline_tag = tag
            self.inline_buffer = []
        if 'data-blog-entry' in attrs:
            self.entries += 1
        if 'data-blog-search-form' in attrs:
            self.search_in_layout = 'hidden' not in attrs
        path = attrs.get('src') if tag == 'script' else attrs.get('href') if tag == 'link' and attrs.get('rel') in ['stylesheet', 'modulepreload'] else None
        if path and path.startswith('/_astro/') and path.endswith(('.css', '.js')):
            self.paths.add(path)

    def handle_data(self, data):
        if self.inline_tag:
            self.inline_buffer.append(data)

    def handle_endtag(self, tag):
        if tag == self.inline_tag:
            self.inline_hashes.append(sha256(''.join(self.inline_buffer).encode()).hexdigest())
            self.inline_tag = None
            self.inline_buffer = []


assets = set()
pages = []
for route in ROUTES:
    local = (ROOT / 'site' / route.strip('/') / 'index.html').read_text()
    body, content_type = fetch(route)
    public = body.decode()
    assert content_type.startswith('text/html'), (route, content_type)
    expected, actual = Assets(), Assets()
    expected.feed(local)
    actual.feed(public)
    assert expected.paths == actual.paths, (route, 'Published CSS/JS references differ from the accepted build', expected.paths, actual.paths)
    assert expected.inline_hashes == actual.inline_hashes, (route, 'Published inline CSS/JS differs from accepted build')
    if route == '/blog/':
        assert actual.search_in_layout, 'SSR search must occupy space before JS'
        assert actual.entries == expected.entries == 62
    assets |= actual.paths
    pages.append({'path': route, 'status': 200, 'matchingAssetReferences': True, 'matchingInlineStyleScriptHashes': True})


def check_asset(path):
    expected = (ROOT / 'site' / path.lstrip('/')).read_bytes()
    body, content_type = fetch(path)
    digest = sha256(body).hexdigest()
    assert digest == sha256(expected).hexdigest(), (path, 'Byte mismatch')
    assert 'css' in content_type if path.endswith('.css') else 'javascript' in content_type, (path, content_type)
    return {'path': path, 'status': 200, 'contentType': content_type, 'bytes': len(body), 'sha256': digest, 'matchesLocal': True}


with ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(check_asset, sorted(assets)))
assert results, 'No application assets verified'
(OUT / 'production-ui-assets.json').write_text(json.dumps({
    'runtime': '7d961b3d26dbbe5a0632ce8787c705bfb36218f9',
    'capturedAt': datetime.now(timezone.utc).isoformat(),
    'pages': pages,
    'assets': results,
}, ensure_ascii=False, indent=2) + '\n')
print(f'Published UI PASS: {len(pages)} pages, {len(results)} CSS/JS files; references, HTTP types and SHA-256 match.')
