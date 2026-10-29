"""Save Holland Bakery product photo references and factual text for artwork/SEO.

References stay outside published assets. Uses only Python standard library.
"""
import hashlib
import json
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'research/supplier-artwork-20261029'
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


class Node:
    def __init__(self, tag='', attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []
        self.parent = None

    def has(self, name):
        return name in self.attrs.get('class', '').split()

    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Node):
                yield from child.walk()

    def text(self):
        return ''.join(c.text() if isinstance(c, Node) else c for c in self.children)


class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        node.parent = self.stack[-1]
        self.stack[-1].children.append(node)
        if tag == 'br':
            self.stack[-1].children.append('\n')
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break

    def handle_data(self, text):
        self.stack[-1].children.append(text)


def clean(value):
    return re.sub(r'[ \t\r\f\v]+', ' ', value).strip()


def record(node):
    while node:
        if re.fullmatch(r'rec\d+', node.attrs.get('id', '')):
            return node.attrs['id']
        node = node.parent
    return ''


def main():
    tree = Tree()
    tree.feed((OUT / 'hollandbakery-reference-source.html').read_text())
    cards = {}
    for card in tree.root.walk():
        if not (card.has('t778__col') and card.has('js-product')):
            continue
        nodes = list(card.walk())
        title = next((clean(n.text()) for n in nodes if n.has('js-product-name')), '')
        photo = next((n.attrs.get('data-original', n.attrs.get('src')) for n in nodes if n.has('js-product-img')), '')
        cards[re.sub(r'\s+', ' ', title)] = {'record': record(card), 'lid': card.attrs.get('data-product-lid'), 'imageUrl': photo}
    popups = {}
    for node in tree.root.walk():
        if node.has('js-product') and node.attrs.get('data-product-lid'):
            descriptions = [clean(n.text()) for n in node.walk() if n.has('t778__descr')]
            if descriptions:
                text = max(descriptions, key=len)
                key = (record(node), node.attrs['data-product-lid'])
                if len(text) > len(popups.get(key, '')):
                    popups[key] = text
    source = json.loads((ROOT / 'src/data/holland-source.json').read_text())
    manifest = []
    for item in source:
        if item['sourceTitle'] not in cards:
            raise ValueError(f"Missing photo for {item['sourceTitle']}")
        card = cards[item['sourceTitle']]
        if not card['imageUrl']:
            raise ValueError(f"Empty photo for {item['id']}")
        manifest.append({**item, **card, 'sourceText': popups.get((card['record'], card['lid']), ''), 'referenceRole': 'appearance reference only; do not republish original photo'})
    refs = OUT / 'references'
    refs.mkdir(exist_ok=True)

    def download(item):
        suffix = Path(item['imageUrl'].split('?')[0]).suffix.lower() or '.jpg'
        path = refs / (item['id'] + suffix)
        if not path.exists():
            request = urllib.request.Request(item['imageUrl'], headers={'User-Agent': 'Mozilla/5.0'})
            path.write_bytes(urllib.request.urlopen(request, timeout=60).read())
        item['referencePath'] = str(path.relative_to(ROOT))
        item['referenceSha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
        return item

    with ThreadPoolExecutor(max_workers=6) as pool:
        manifest = list(pool.map(download, manifest))
    (OUT / 'references.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'products': len(manifest), 'photos': sum(bool(i['referencePath']) for i in manifest), 'detailedTexts': sum(len(i['sourceText']) > 200 for i in manifest)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
