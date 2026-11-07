"""Read native Search Console CSV exports without altering the source ZIPs."""
import csv
import hashlib
import io
import json
import zipfile
from pathlib import Path

OUTPUT = Path(__file__).parent / 'gsc'
OUTPUT.mkdir(exist_ok=True)
DOWNLOADS = Path('/Users/dmitrij/Downloads')
NAMES = [
    'pirogorsk.ru-Performance-on-Search-2026-11-04.zip',
    'pirogorsk.ru-Performance-on-Search-2026-11-05.zip',
    'pirogorsk.ru-Performance-on-Search-2026-11-07.zip',
    'pirogorsk.ru-Performance-on-Search-2026-11-07 (1).zip',
]

def digest(data):
    return hashlib.sha256(data).hexdigest()

def parse(path, preserve=False):
    raw = path.read_bytes()
    files, hashes = {}, {}
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        for name in archive.namelist():
            assert Path(name).name == name and name.endswith('.csv')
            data = archive.read(name)
            rows = list(csv.reader(io.StringIO(data.decode('utf-8-sig'))))
            assert all(len(row) == len(rows[0]) for row in rows)
            files[name] = {'header': rows[0], 'rows': rows[1:]}
            hashes[name] = digest(data)
            if preserve:
                (OUTPUT / name).write_bytes(data)
    daily = files['Диаграмма.csv']['rows']
    dates = [r[0] for r in daily]
    assert dates == sorted(set(dates))
    clicks, impressions = sum(int(r[1]) for r in daily), sum(int(r[2]) for r in daily)
    dimensions = {}
    for name, table in files.items():
        if name in ['Диаграмма.csv', 'Фильтры.csv']:
            continue
        records = [{'key': r[0], 'clicks': int(r[1]), 'impressions': int(r[2]),
                    'ctrPctReported': float(r[3].rstrip('%')), 'position': float(r[4])}
                   for r in table['rows']]
        dimensions[name] = {'count': len(records), 'clicks': sum(r['clicks'] for r in records),
                            'impressions': sum(r['impressions'] for r in records), 'rows': records}
        for r in records:
            assert r['impressions'] > 0 and r['clicks'] >= 0
            assert abs(r['ctrPctReported'] - r['clicks'] / r['impressions'] * 100) < .011
    for name in ['Страны.csv', 'Устройства.csv']:
        assert dimensions[name]['clicks'] == clicks
        assert dimensions[name]['impressions'] == impressions
    return {'source': str(path), 'sha256': digest(raw), 'csvSha256': hashes,
            'firstDate': dates[0], 'lastDate': dates[-1], 'days': len(dates),
            'clicks': clicks, 'impressions': impressions, 'ctrPct': clicks / impressions * 100,
            'daily': daily, 'dimensions': dimensions, 'filters': files['Фильтры.csv']['rows']}

exports = [parse(DOWNLOADS / name, i == len(NAMES) - 1) for i, name in enumerate(NAMES)]
old, latest = exports[1], exports[-1]
before = {row[0]: row for row in old['daily']}
after = {row[0]: row for row in latest['daily']}
overlap_unchanged = all(after.get(date) == row for date, row in before.items())
assert overlap_unchanged
delta_days = [row for date, row in after.items() if date not in before]
assert sum(int(r[1]) for r in delta_days) == latest['clicks'] - old['clicks']
assert sum(int(r[2]) for r in delta_days) == latest['impressions'] - old['impressions']
identical_csv = latest['csvSha256'] == exports[2]['csvSha256']
summary = {'exports': exports, 'comparison': {'baseline': old['source'], 'overlapUnchanged': overlap_unchanged,
           'addedDays': delta_days, 'clicksDelta': latest['clicks'] - old['clicks'],
           'impressionsDelta': latest['impressions'] - old['impressions'],
           'ctrPercentagePointDelta': latest['ctrPct'] - old['ctrPct'],
           'identicalToNovember7Export': identical_csv},
           'limits': ['Clicks are not unique visitors or orders.',
                      'Query and page exports are independent marginals; no query-to-URL join is available.',
                      'Country Russia does not establish Kaliningrad Oblast.',
                      'No data after latest exported date; sparse samples do not establish ranking or conversion trends.']}
(OUTPUT / 'analysis.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'latest': {k: latest[k] for k in ['firstDate', 'lastDate', 'clicks', 'impressions', 'ctrPct']},
                  'comparison': summary['comparison'], 'dimensions': latest['dimensions']}, ensure_ascii=False, indent=2))
