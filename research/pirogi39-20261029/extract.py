"""Read-only public catalog snapshot. Python standard library only."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import urlopen
import json
import re

ROOT = Path(__file__).parent
class Node:
    def __init__(self, tag='', attrs=(), parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []
    def text(self):
        return ' '.join(''.join(c if isinstance(c, str) else c.text()+' ' for c in self.children).split())
    def walk(self):
        for c in self.children:
            if isinstance(c, Node):
                yield c
                yield from c.walk()
    def find(self, predicate):
        return next((c for c in self.walk() if predicate(c)), None)
    def cls(self, value):
        return value in self.attrs.get('class', '').split()
class DOM(HTMLParser):
    def __init__(self):
        super().__init__(); self.root=Node(); self.current=self.root
    def handle_starttag(self, tag, attrs):
        n=Node(tag, attrs, self.current); self.current.children.append(n)
        if tag not in ['img','input','br','hr','meta','link','source','area','wbr']:
            self.current=n
    def handle_endtag(self, tag):
        p=self.current
        while p.parent and p.tag != tag: p=p.parent
        if p.parent: self.current=p.parent
    def handle_data(self, data): self.current.children.append(data)

def parse(html):
    d=DOM(); d.feed(html); return d.root
def number(text):
    digits=re.sub(r'[^0-9,.]', '', text)
    return float(digits.replace(',', '.')) if digits else None
def snapshot():
    html=urlopen('https://pirogi39.ru/',timeout=30).read().decode('utf-8')
    (ROOT/'catalog-source.html').write_text(html)
    root=parse(html); group=''; rows=[]
    groups=['СЫТНЫЕ','СЛАДКИЕ','СИБИРСКИЕ','РУССКИЕ ПРАЗДНИЧНЫЕ (КУРНИКИ)','ПРУССКИЕ','ОСЕТИНСКИЕ']
    for n in root.walk():
        if n.tag=='h2': group=n.text()
        if not n.cls('element') or group not in groups: continue
        ident=n.find(lambda x:x.tag=='input' and x.attrs.get('name')=='id')
        if ident is None: continue
        def text(cls):
            x=n.find(lambda x:x.cls(cls)); return x.text() if x else ''
        link=n.find(lambda x:x.tag=='a' and x.cls('absolute'))
        img=n.find(lambda x:x.tag=='img')
        price=n.find(lambda x:x.cls('msoptionsprice-cost') and not x.cls('old_price'))
        options=[x.attrs for x in n.walk() if x.tag=='option']
        rows.append(dict(sourceId=ident.attrs['value'],group=group,
            name=re.sub(r'\s+i$', '',text('title')),sourceUrl=urljoin('https://pirogi39.ru/',link.attrs['href']),
            imageUrl=urljoin('https://pirogi39.ru/',img.attrs['src']),
            weightG=number(text('msoptionsprice-weight')),price=number(price.text()) if price else None,
            regularPrice=number(text('old_price')),priceLabel=price.text() if price else '',
            options=options,description=text('element-text')))
    (ROOT/'extracted.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
    return rows
if __name__=='__main__':
    rows=snapshot()
    for r in rows: print(r['sourceId'],r['group'],r['name'],r['weightG'],r['price'],r['options'])
    print('Total',len(rows))
