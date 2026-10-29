"""Normalize the saved public Holland catalog; never fetches or publishes anything."""
import json
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
rows = json.loads(Path(sys.argv[1]).read_text())
alphabet = dict(zip('абвгдеёжзийклмнопрстуфхцчшщъыьэюя', ['a','b','v','g','d','e','yo','zh','z','i','y','k','l','m','n','o','p','r','s','t','u','f','h','ts','ch','sh','sch','','y','','e','yu','ya']))
def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', ''.join(alphabet.get(c, c) for c in text.lower())).strip('-')

result = []
for i, row in enumerate(rows):
    title = row['product']
    count, weight = row['pack_count'], row['unit_weight_g']
    if count is None:
        m = re.search(r'(\d+)\s*шт\.?\s*по\s*(\d+)\s*г', title)
        if not m:
            m = re.search(r'(\d+)\s*г[р.]?\.?\s*[хx]\s*(\d+)\s*шт', title)
            if m:
                weight, count = map(int, m.groups())
        else:
            count, weight = map(int, m.groups())
    group = 'bread' if i < 24 else 'desserts' if i < 35 else 'bake' if i < 58 else 'mini-pies' if i < 72 else 'dough'
    if i == 74 or i == 75:
        count, weight = 20, 450
    if i in [72, 73, 76, 77]:
        count, weight = 1, 15000 if i < 74 else 5000
    assert count and weight, title
    whole_weight = [2000, 1980, 2340, 1620][i - 24] if 24 <= i <= 27 else count * weight
    name = re.sub(r'\s*\(от\s+\d+.*$', '', title)
    name = re.sub(r'\s*\d+(?:[,.]\d+)?\s*(?:кг|г(?:р)?\.?|шт\.?).*$', '', name).strip(' ,')
    name = name.replace('Конверт яблоком', 'Конверт с яблоком')
    result.append({
        'id': 'hb-' + slug(title), 'name': name, 'sourceTitle': title, 'group': group,
        'packCount': count, 'unitWeightG': weight, 'packWeightG': whole_weight,
        'packPrice': row['pack_price_rub'], 'sourceLabel': row['pack_label'],
        'sourceUrl': row['url'], 'checkedOn': '2026-10-29',
        'priceFrom': 'от ' in row['pack_label'] or '51,5-65' in row['pack_label'],
    })
assert len(result) == 78 and len({r['id'] for r in result}) == 78
(root / 'src/data/holland-source.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(f'Normalized {len(result)} source products')
