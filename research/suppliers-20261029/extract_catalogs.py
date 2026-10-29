"""Extract public price facts from the saved official catalog HTML; stdlib only."""
import csv, json, re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

BASE = Path(__file__).resolve().parent
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
class Node:
    def __init__(self, tag='', attrs=(), parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []
    def has(self, cls): return cls in self.attrs.get('class','').split()
    def walk(self):
        yield self
        for c in self.children:
            if isinstance(c, Node): yield from c.walk()
    def text(self):
        if self.tag in {'script','style'}: return ''
        return ' '.join(c.text() if isinstance(c,Node) else c for c in self.children)
    def find(self, cls): return next((n for n in self.walk() if n.has(cls)), None)
class Tree(HTMLParser):
    def __init__(self): super().__init__(); self.root=Node(); self.current=self.root
    def handle_starttag(self,t,a):
        n=Node(t,a,self.current); self.current.children.append(n)
        if t not in VOID: self.current=n
    def handle_startendtag(self,t,a): self.handle_starttag(t,a); self.handle_endtag(t)
    def handle_endtag(self,t):
        n=self.current
        while n.parent:
            if n.tag==t: self.current=n.parent; return
            n=n.parent
    def handle_data(self,d): self.current.children.append(d)
def clean(s): return re.sub(r'\s+',' ',s).strip()
def tx(n): return clean(n.text()) if n else ''
def num(s):
    m=re.search(r'\d[\d\s]*(?:[.,]\d+)?', s)
    return float(re.sub(r'\s','',m[0]).replace(',','.')) if m else None

def load(name):
    p=Tree();p.feed((BASE/'sources'/f'{name}.html').read_text());return p.root

def main():
    retail=[];seen=set()
    for n in load('pirogi39-catalog').walk():
        if not n.has('element') or not n.has('relative'): continue
        title=tx(n.find('title'));title=re.sub(r'\s+i$','',title)
        href=next((x.attrs.get('href') for x in n.walk() if x.tag=='a' and x.has('absolute')), '')
        key=(title,href)
        if not title or key in seen: continue
        seen.add(key)
        weight=tx(n.find('element-weight'));pnode=n.find('element-price');price=tx(pnode)
        costs=[tx(x) for x in pnode.walk() if x.has('msoptionsprice-cost')] if pnode else []
        row={'supplier':'pirogi39','product':title,'weight_label':weight,'weight_g':num(weight),
             'price_rub':num(costs[0]) if costs else num(price),'price_label':price,
             'from_price':bool(re.search(r'\bот\b',price)),'sale':any(tx(x)=='Акция' for x in n.walk() if x.tag in ['div','span']),
             'url':urljoin('https://pirogi39.ru/',href)}
        retail.append(row)
    wholesale=[];seen=set()
    for n in load('hollandbakery-catalog').walk():
        if not n.has('t778__col') or not n.has('js-product'): continue
        title=tx(n.find('js-product-name'))
        if not title or title in seen: continue
        seen.add(title)
        desc=tx(n.find('t778__descr'));price=num(tx(n.find('js-product-price')))
        unit=re.search(r'(\d+)\s*шт\.?\s*по\s*(\d+)\s*г',desc)
        count,weight=(int(unit[1]),int(unit[2])) if unit else (None,None)
        rec=n
        while rec.parent and not rec.attrs.get('id','').startswith('rec'): rec=rec.parent
        wholesale.append({'supplier':'hollandbakery','product':title,'pack_label':desc,'pack_count':count,
           'unit_weight_g':weight,'pack_price_rub':price,'unit_price_rub':round(price/count,2) if price and count else None,
           'url':'https://hollandbakery.ru/#'+rec.attrs.get('id','')})
    for name,rows in [('pirogi39-prices',retail),('hollandbakery-prices',wholesale)]:
        (BASE/f'{name}.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
        with (BASE/f'{name}.csv').open('w',encoding='utf-8-sig',newline='') as f:
            w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
    print('Unique rows:',len(retail),'retail;',len(wholesale),'wholesale')
    print('Retail pies priced <=1600:')
    for r in retail:
        if 'пирог' in r['product'].lower() and r['price_rub'] and r['price_rub']<=1600: print(json.dumps(r,ensure_ascii=False))
    print('Wholesale mini pies:')
    for r in wholesale:
        if 'Осетинский' in r['product']: print(json.dumps(r,ensure_ascii=False))

if __name__ == "__main__":
    main()
