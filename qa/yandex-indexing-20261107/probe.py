from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
import hashlib,json,re,urllib.request,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent
URLS=[x['url'] for x in json.loads((ROOT.parent/'yandex-indexing-20261104/priority-urls.json').read_text())]
UA='Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)'
class Tags(HTMLParser):
 def __init__(self): super().__init__(); self.canonical=[]; self.robots=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='link' and a.get('rel')=='canonical': self.canonical.append(a.get('href'))
  if tag=='meta' and a.get('name','').lower() in ['robots','yandex']: self.robots.append({'name':a['name'],'content':a.get('content','')})
def fetch(url):
 errors=[]
 for attempt in range(1,4):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA,'Cache-Control':'no-cache'}),timeout=18) as r:
    b=r.read(); return {'url':url,'finalUrl':r.url,'status':r.status,'xRobots':r.headers.get('X-Robots-Tag'),'sha256':hashlib.sha256(b).hexdigest(),'attempt':attempt,'recoveredErrors':errors},b
  except Exception as e: errors.append(type(e).__name__+': '+str(e))
 return {'url':url,'error':errors[-1],'attempts':errors},b''
def page(url):
 row,b=fetch(url); t=Tags(); t.feed(b.decode('utf-8','replace')); row.update(canonical=t.canonical,robots=t.robots)
 row['pass']=row.get('status')==200 and row.get('finalUrl')==url and t.canonical==[url] and not re.search('noindex|none',str(t.robots)+' '+(row.get('xRobots') or ''),re.I)
 return row
with ThreadPoolExecutor(max_workers=2) as ex: pages=list(ex.map(page,URLS))
robots,rb=fetch('https://pirogorsk.ru/robots.txt'); robots['text']=rb.decode(); robots['pass']=robots.get('status')==200 and 'Sitemap: https://pirogorsk.ru/sitemap.xml' in robots['text'] and not re.search(r'^Disallow:\s*/\s*$',robots['text'],re.M)
sitemap,sb=fetch('https://pirogorsk.ru/sitemap.xml'); ROOT.joinpath('sitemap.xml').write_bytes(sb)
locs=[e.text for e in ET.fromstring(sb).iter() if e.tag.endswith('}loc')]; sitemap.update(count=len(locs),unique=len(set(locs)),missingPriorityUrls=[u for u in URLS if u not in locs]); sitemap['pass']=sitemap.get('status')==200 and len(locs)==len(set(locs)) and len(locs)==279 and not sitemap['missingPriorityUrls'] and all(u.startswith('https://pirogorsk.ru/') for u in locs)
release,rj=fetch('https://pirogorsk.ru/release.json'); release['manifest']=json.loads(rj); release['matchesLocalArtifact']=rj==Path('site/release.json').read_bytes(); release['pass']=release.get('status')==200 and release['matchesLocalArtifact']
out={'checkedAt':datetime.now(timezone.utc).isoformat(),'route':'Public HTTP from workstation; YandexBot User-Agent, not Yandex IP','pages':pages,'robots':robots,'sitemap':sitemap,'release':release}; out['pass']=all(p['pass'] for p in pages+[robots,sitemap,release]); ROOT.joinpath('live-probe.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n'); print(json.dumps({'pass':out['pass'],'pages':len(pages),'sitemap':sitemap['count'],'releaseMatch':release['matchesLocalArtifact'],'errors':[p for p in pages if not p['pass']]},ensure_ascii=False)); raise SystemExit(0 if out['pass'] else 1)
