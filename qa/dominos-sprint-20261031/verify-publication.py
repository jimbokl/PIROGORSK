import concurrent.futures
import hashlib
import json
import pathlib
import re
import sys
import tarfile
import urllib.request
from datetime import datetime, timezone

root = pathlib.Path(__file__).resolve().parent
archive, sha, ci = sys.argv[1:4]
expected = {}
with tarfile.open(archive) as tar:
    for member in tar.getmembers():
        name = member.name.removeprefix('./')
        if member.isfile() and (re.search(r'\.(html|css|js|json|xml|txt)$', name) or name == 'brand/pirogorsk-symbol.svg'):
            expected[name] = tar.extractfile(member).read()
assert sum(name.endswith('.html') for name in expected) == 247
assert b'data-selection-dock' in expected['menu/index.html']
assert b'data-catalog-fillings' in expected['index.html']

def check(item):
    name, body = item
    route = '/' if name == 'index.html' else '/' + name.removesuffix('index.html') if name.endswith('/index.html') else '/' + name
    request = urllib.request.Request('https://pirogorsk.ru' + route + '?qa=1', headers={'Cache-Control': 'no-cache'})
    try:
        with urllib.request.urlopen(request, timeout=40) as response:
            data = response.read()
            digest = hashlib.sha256(data).hexdigest()
            return dict(path=route, status=response.status, bytes=len(data), sha256=digest, matchesBuild=digest == hashlib.sha256(body).hexdigest())
    except Exception as error:
        return dict(path=route, error=str(error), matchesBuild=False)

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    files = sorted(pool.map(check, expected.items()), key=lambda entry: entry['path'])
failures = [entry for entry in files if not entry['matchesBuild'] or entry.get('status') != 200]
result = dict(checkedAt=datetime.now(timezone.utc).isoformat(), runtime=sha, ci=ci, source='Independently downloaded GitHub Actions Pages artifact', htmlPages=247, files=files, failures=failures)
(root / 'publication.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
assert not failures, failures
print(f'PASS: {len(files)} published resources match CI artifact, including all 247 HTML and runtime CSS/JS.')
