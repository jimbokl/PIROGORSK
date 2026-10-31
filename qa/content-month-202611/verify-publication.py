"""Compare production bytes with a separately downloaded GitHub Pages artifact."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import sys
import tarfile
import urllib.request
from datetime import datetime, timezone

archive, revision, run_id = sys.argv[1:4]
root = Path(__file__).resolve().parent
expected = {}
with tarfile.open(archive) as tar:
    for member in tar.getmembers():
        name = member.name.removeprefix('./')
        if member.isfile() and re.search(r'\.(html|css|js|json|xml|txt)$', name):
            expected[name] = tar.extractfile(member).read()
html_count = sum(name.endswith('.html') for name in expected)
assert html_count == 254, html_count
articles = json.loads(Path('src/data/monthly-articles.json').read_text())
for article in articles:
    assert f"journal/{article['slug']}/index.html" in expected

def check(item):
    name, body = item
    route = '/' if name == 'index.html' else '/' + name.removesuffix('index.html') if name.endswith('/index.html') else '/' + name
    request = urllib.request.Request('https://pirogorsk.ru' + route + '?qa=1', headers={'Cache-Control': 'no-cache'})
    try:
        with urllib.request.urlopen(request, timeout=40) as response:
            actual = response.read()
            digest = hashlib.sha256(actual).hexdigest()
            return dict(path=route, status=response.status, bytes=len(actual), sha256=digest, matchesArtifact=digest == hashlib.sha256(body).hexdigest())
    except Exception as error:
        return dict(path=route, error=str(error), matchesArtifact=False)

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    files = sorted(pool.map(check, expected.items()), key=lambda row: row['path'])
failures = [row for row in files if not row['matchesArtifact'] or row.get('status') != 200]
report = dict(checkedAt=datetime.now(timezone.utc).isoformat(), runtime=revision, ci=run_id, source='Independently downloaded GitHub Actions Pages artifact', htmlPages=html_count, files=files, failures=failures)
(root / 'publication.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
assert not failures, failures
print(f'PASS: {len(files)} production resources match the CI artifact, including all {html_count} HTML and runtime CSS/JS.')
