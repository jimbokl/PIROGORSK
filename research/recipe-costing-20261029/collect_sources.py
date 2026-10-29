"""Collect ingredient facts and source URLs; do not mirror full recipe prose."""
import concurrent.futures
import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

SOURCES = [
 ("K01", "Картофыджын: картофель и сыр", "https://tekhnolog-ttk.ru/osetinskie-pirogi-kartofydzhyn-ttk_14026/"),
 ("K02", "Осетинский пирог с сыром и творогом", "https://tekhnolog-ttk.ru/osetinskie-pirogi-s-syrom-i-tvorogom-ttk_14294/"),
 ("K03", "Олибах, осетинский пирог", "https://tekhnolog-ttk.ru/olibah-osetinskiy-pirog-ttk_5096/"),
 ("K04", "Кабускаджын: капустный пирог", "https://tekhnolog-ttk.ru/a-lya-osetinskie-pirogi-kabuskadzhyn-ttk_4968/"),
 ("K05", "Осетинские пироги, базовая карта", "https://tekhnolog-ttk.ru/osetinskie-pirogi-ttk_12523/"),
 ("Q01", "Киш с брокколи и фетой", "https://tekhnolog.com/2024/09/25/kish-s-brokkoli-i-syrom-feta-ttk9360/"),
 ("Q02", "Киш с брокколи и лососем", "https://tekhnolog-ttk.ru/kish-s-brokkoli-i-lososem-ttk_4885/"),
 ("Q03", "Киш с грибами и помидорами", "https://tekhnolog.com/2024/09/25/kish-s-gribami-i-pomidorami-ttk11021/"),
 ("Q04", "Киш со шпинатом", "https://tekhnolog.com/2024/09/07/kish-so-shpinatom-ttk8432/"),
 ("Q05", "Киш с грибами и карбонадом", "https://tekhnolog.com/2024/09/25/kish-s-gribami-i-karbonadom-ttk9361/"),
 ("Q06", "Киш с луком", "https://tekhnolog.com/2024/09/25/kish-s-lukom-ttk11023/"),
 ("Q07", "Киш с зеленью", "https://tekhnolog.com/2024/09/25/kish-s-zelenyu-ttk11022/"),
]

class Facts(HTMLParser):
 def __init__(self):
  super().__init__(); self.tables=[]; self.table=None; self.row=None; self.cell=None; self.text=[]; self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ('script','style'): self.skip+=1
  if tag=='table': self.table=[]
  if tag=='tr' and self.table is not None:self.row=[]
  if tag in ('td','th') and self.row is not None:self.cell=[]
 def handle_data(self,data):
  if not self.skip:self.text.append(data)
  if self.cell is not None:self.cell.append(data)
 def handle_endtag(self,tag):
  if tag in ('script','style'):self.skip=max(0,self.skip-1)
  if tag in ('td','th') and self.cell is not None:
   self.row.append(' '.join(' '.join(self.cell).split()));self.cell=None
  if tag=='tr' and self.row is not None:
   self.table.append(self.row);self.row=None
  if tag=='table' and self.table is not None:
   self.tables.append(self.table);self.table=None

def collect(source):
 code,name,url=source
 try:
  request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
  with urllib.request.urlopen(request,timeout=30) as response:
   html=response.read().decode('utf-8');status=response.status
  parser=Facts();parser.feed(html)
  ingredient_tables=[t for t in parser.tables if any(re.search('брутто|нетто',c,re.I) for r in t for c in r)]
  text=' '.join(' '.join(parser.text).split())
  # Short audit snippets, not a full-text mirror.
  snippets=[text[max(0,m.start()-50):m.end()+90] for m in re.finditer(r'выход|дрожж|вод[ау]',text,re.I)][:8]
  return dict(id=code,name=name,url=url,checked_at='2026-10-29',http_status=status,ingredient_tables=ingredient_tables,audit_snippets=snippets)
 except Exception as exc:return dict(id=code,name=name,url=url,error=str(exc))

if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(collect,SOURCES))
 path=Path(__file__).with_name('recipe-source-facts.json');path.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
 for item in results:
  print(item['id'],item['name'],item.get('http_status',item.get('error')))
  print(json.dumps(item.get('ingredient_tables'),ensure_ascii=False))
  print(' / '.join(item.get('audit_snippets',[])))
