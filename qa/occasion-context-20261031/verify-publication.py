"""Compare a downloaded Pages CI artifact against public production resources."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import sys
import tarfile
import urllib.request

archive_path, runtime, run = sys.argv[1:4]
output = Path(sys.argv[4]) if len(sys.argv) > 4 else Path(__file__).resolve().parent
output.mkdir(parents=True, exist_ok=True)
expected = {}
with tarfile.open(archive_path) as archive:
    for member in archive.getmembers():
        name = member.name.removeprefix('./')
        if member.isfile() and re.search(r'\.(html|css|js|json|xml|txt)$', name):
            expected[name] = archive.extractfile(member).read()

html_pages = sum(name.endswith('.html') for name in expected)
product_pages = sum(bool(re.fullmatch(r'(?:pirogi|catalog)/[^/]+/index\.html', name)) for name in expected)
assert html_pages == 254 and product_pages == 153, (html_pages, product_pages)


def verify(item):
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


with ThreadPoolExecutor(max_workers=8) as pool:
    files = sorted(pool.map(verify, expected.items()), key=lambda item: item['path'])
failures = [item for item in files if not item['matchesBuild'] or item.get('status') != 200]
result = dict(checkedAt=datetime.now(timezone.utc).isoformat(), runtime=runtime,
              ci='https://github.com/jimbokl/PIROGORSK/actions/runs/' + run,
              source='Independently downloaded GitHub Actions Pages artifact',
              htmlPages=html_pages, productPages=product_pages, files=files, failures=failures)
(output / 'publication.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
assert not failures, failures
print(f'PASS: {len(files)} resources, {html_pages} HTML and {product_pages} product pages match CI artifact.')
