"""Compare the independently downloaded CI artifact with production and audit schema."""
import concurrent.futures
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parent
SHA = 'af86de1aa8b21acd458550d02b7995327d432fdd'
CI = 'https://github.com/jimbokl/PIROGORSK/actions/runs/41219512929'


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = None
        self.schemas = []
        self.buffer = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical = attrs.get('href')
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.buffer = ''

    def handle_data(self, data):
        if self.buffer is not None:
            self.buffer += data

    def handle_endtag(self, tag):
        if tag == 'script' and self.buffer is not None:
            self.schemas.append(json.loads(self.buffer))
            self.buffer = None


def nodes(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from nodes(child)
    elif isinstance(value, list):
        for child in value:
            yield from nodes(child)


expected = {}
products = {}
with tarfile.open(sys.argv[1]) as archive:
    members = {item.name.removeprefix('./'): item for item in archive.getmembers() if item.isfile()}
    for name, member in members.items():
        if re.search(r'\.(html|css|js|json|xml|txt)$', name):
            expected[name] = archive.extractfile(member).read()
    for name, body in list(expected.items()):
        if not re.fullmatch(r'(?:pirogi|catalog)/[^/]+/index\.html', name):
            continue
        meta = Metadata()
        meta.feed(body.decode())
        route = '/' + name.removesuffix('index.html')
        assert meta.canonical == 'https://pirogorsk.ru' + route, route
        data = list(nodes(meta.schemas))
        assert not any(item.get('@type') == 'Product' for item in data), route
        pages = [item for item in data if item.get('@type') == 'ItemPage']
        assert len(pages) == 1, route
        page = pages[0]
        assert page['@id'] == meta.canonical + '#page' and page['url'] == meta.canonical, route
        assert page.get('name') and page.get('description'), route
        image = page.get('primaryImageOfPage')
        if name.startswith('pirogi/'):
            assert image and image['@type'] == 'ImageObject', route
            assert image['width'] > 0 and image['height'] > 0 and image['caption'], route
            image_path = image['url'].removeprefix('https://pirogorsk.ru/')
            assert image_path in members, image_path
            expected[image_path] = archive.extractfile(members[image_path]).read()
        products[route] = dict(canonical=meta.canonical, itemPage=page)

assert len(products) == 153, len(products)
html_count = sum(name.endswith('.html') for name in expected)
assert html_count == 254, html_count


def check(item):
    name, body = item
    route = '/' if name == 'index.html' else '/' + name.removesuffix('index.html') if name.endswith('/index.html') else '/' + name
    request = urllib.request.Request('https://pirogorsk.ru' + route + '?qa=1', headers={'Cache-Control': 'no-cache'})
    try:
        with urllib.request.urlopen(request, timeout=40) as response:
            actual = response.read()
            digest = hashlib.sha256(actual).hexdigest()
            return dict(path=route, status=response.status, bytes=len(actual), sha256=digest,
                        matchesBuild=digest == hashlib.sha256(body).hexdigest())
    except Exception as error:
        return dict(path=route, error=str(error), matchesBuild=False)


with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    files = sorted(pool.map(check, expected.items()), key=lambda item: item['path'])
failures = [item for item in files if not item['matchesBuild'] or item.get('status') != 200]
result = dict(checkedAt=datetime.now(timezone.utc).isoformat(), runtime=SHA, ci=CI,
              source='Independently downloaded GitHub Actions Pages artifact',
              htmlPages=html_count, itemPages=len(products), files=files, failures=failures)
(ROOT / 'publication.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
(ROOT / 'product-schema.json').write_text(json.dumps(dict(checkedAt=result['checkedAt'], runtime=SHA,
    products=products, originalPieImageObjects=sum(route.startswith('/pirogi/') for route in products)),
    ensure_ascii=False, indent=2) + '\n')
assert not failures, failures
print(f'PASS: {len(files)} resources, all {html_count} HTML and 153 ItemPages match CI artifact; eight original pie ImageObjects verified.')
