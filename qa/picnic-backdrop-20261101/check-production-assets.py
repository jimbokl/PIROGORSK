"""Read-only byte verification for the eight published picnic backdrop assets."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from urllib.request import Request, urlopen
import json

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = Path(__file__).with_name('production-assets.json')
FILES = sorted((ROOT / 'public/product-backdrops').glob('picnic-set-*.*'))
assert len(FILES) == 8, 'Expected four AVIF and four WebP variants'


def check(path):
    url = 'https://pirogorsk.ru/' + path.relative_to(ROOT / 'public').as_posix()
    expected = sha256(path.read_bytes()).hexdigest()
    with urlopen(Request(url, headers={'Cache-Control': 'no-cache'}), timeout=30) as response:
        data = response.read()
        result = {
            'url': url,
            'status': response.status,
            'contentType': response.headers.get('Content-Type'),
            'bytes': len(data),
            'sha256': sha256(data).hexdigest(),
            'matchesLocal': sha256(data).hexdigest() == expected,
        }
    assert result['status'] == 200, result
    assert result['contentType'].split(';')[0] == 'image/' + path.suffix[1:], result
    assert result['matchesLocal'], result
    return result


with ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(check, FILES))
OUTPUT.write_text(json.dumps({
    'runtime': '21d20e72e1fa2cf137bb82ec4ad04d22a2ae641b',
    'capturedAt': datetime.now(timezone.utc).isoformat(),
    'assets': results,
}, indent=2) + '\n')
print('Production backdrop assets PASS: 8/8 HTTP 200, content types and SHA-256 match.')
