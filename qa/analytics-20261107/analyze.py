"""Reproduce aggregate GSC comparison; UI observations are a separate source."""
from pathlib import Path
import csv
import hashlib
import io
import json
import zipfile

ROOT = Path(__file__).resolve().parent
FILES = {
    'Диаграмма.csv': 'dates', 'Запросы.csv': 'queries', 'Страницы.csv': 'pages',
    'Страны.csv': 'countries', 'Устройства.csv': 'devices',
    'Вид в поиске.csv': 'searchAppearance', 'Фильтры.csv': 'filters',
}


def read_export(path):
    with zipfile.ZipFile(path) as archive:
        tables = {}
        for name, key in FILES.items():
            rows = list(csv.DictReader(io.StringIO(archive.read(name).decode('utf-8-sig'))))
            tables[key] = rows
    return tables


def totals(rows):
    clicks = sum(int(row['Kлики']) for row in rows)
    impressions = sum(int(row['Показы']) for row in rows)
    return {'clicks': clicks, 'impressions': impressions,
            'ctrPercent': round(100 * clicks / impressions, 6) if impressions else None}


old = read_export(ROOT / 'gsc-export-20261105.zip')
new = read_export(ROOT / 'gsc-export-20261107.zip')
old_dates = {row['Дата']: row for row in old['dates']}
new_dates = {row['Дата']: row for row in new['dates']}
assert all(new_dates[date] == row for date, row in old_dates.items())
additional = [row for date, row in new_dates.items() if date not in old_dates]
assert totals(old['dates']) == {'clicks': 5, 'impressions': 108, 'ctrPercent': 4.62963}
assert totals(new['dates']) == {'clicks': 8, 'impressions': 147, 'ctrPercent': 5.442177}
assert additional == [{'Дата': '2026-11-04', 'Kлики': '3', 'Показы': '39', 'CTR': '7.69%', 'Позиция': '19.5'}]
snapshot = {
    'source': 'Authenticated GSC native Chrome CSV export; property sc-domain:pirogorsk.ru',
    'capturedDate': '2026-11-07',
    'archives': {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
                 for name in ['gsc-export-20261105.zip', 'gsc-export-20261107.zip']},
    'performance': {'dateFrom': min(new_dates), 'dateTo': max(new_dates), **totals(new['dates'])},
    'comparison': {'previous': totals(old['dates']), 'sharedDatesUnchanged': True,
                   'additionalDates': additional, 'additionalTotals': totals(additional),
                   'note': 'Cumulative windows differ; this is one added day, not a same-length growth rate.'},
    'coverage': {key: {'rows': len(rows), **totals(rows)} for key, rows in new.items() if key != 'filters'},
    'tables': new,
    'limits': [
        'Aggregate query/page tables are independent; never infer pairs from matching totals.',
        'Confirmed filtered query-page pairs are recorded separately in ui-observations.json.',
        'Query rows do not represent every click/impression; unlisted queries cannot be reconstructed.',
        'Clicks are not people, sessions, leads or sales; RU country does not establish Kaliningrad region.',
        'Do not infer full index coverage, causality or stable CTR/ranking from this small sample.',
    ],
}
(ROOT / 'gsc-snapshot.json').write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({key: snapshot[key] for key in ['performance', 'comparison', 'coverage']}, ensure_ascii=False))
