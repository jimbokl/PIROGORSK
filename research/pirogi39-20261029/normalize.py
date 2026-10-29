import json,re,sys,hashlib
from pathlib import Path
from urllib.parse import urlparse
sys.path.insert(0,str(Path(__file__).parent))
from extract import parse,number
base=Path(__file__).parent
rows=json.loads((base/'extracted.json').read_text())
groups={'СЫТНЫЕ':'hearty-pies','СЛАДКИЕ':'sweet-pies','СИБИРСКИЕ':'siberian-pies','РУССКИЕ ПРАЗДНИЧНЫЕ (КУРНИКИ)':'kurniki','ПРУССКИЕ':'prussian-pies','ОСЕТИНСКИЕ':'ossetian-pies'}
source=[];prompts=[]
for row in rows:
 sid=row['sourceId'];root=parse((base/f'source-pages/{sid}.html').read_text())
 content=next((n.text() for n in root.walk() if n.cls('content') and 'Состав' in n.text()),'')
 options=[n for n in root.walk() if n.tag=='option' and n.attrs.get('data-weight')]
 price_nodes=[n for n in root.walk() if n.cls('msoptionsprice-cost') and n.cls(f'msoptionsprice-{sid}')]
 regular=next((number(n.text()) for n in price_nodes if n.cls('old_price')),None)
 variants=[{'weightG':int(n.attrs['data-weight']),'price':int(n.attrs['data-price']),'regularPrice':int(number(re.search(r'старая цена: ([\d\s]+)',n.text()).group(1))) if 'старая цена' in n.text() else None,'sourceVariantId':n.attrs['value']} for n in options]
 if not variants: variants=[{'weightG':int(row['weightG']),'price':int(row['price']),'regularPrice':regular,'sourceVariantId':str(sid)}]
 variants=sorted(variants,key=lambda v:v['weightG'])
 name=re.sub(r'\s*1[.,]3\s*[–—-]\s*2\s*кг\s*$','',row['name']).strip().replace('Пирог c','Пирог с').replace('твор."','творожный «').replace('"','»')
 ingredients=re.split(r'Состав\s*:',content,flags=re.I)[-1].split('Срок хранения')[0].strip(' .;') if 'Состав' in content else ''
 ingredients=re.sub(r'\s+',' ',ingredients)
 before=content.split('Состав')[0].strip()
 meta=next((n.attrs.get('content','') for n in root.walk() if n.tag=='meta' and n.attrs.get('name')=='description'),'')
 intro=before or meta
 if len(intro)>1200: intro=meta
 source.append({'id':f'p39-{sid}','sourceId':sid,'name':name,'group':groups[row['group']],'sourceGroup':row['group'],'sourceUrl':row['sourceUrl'],'imageUrl':row['imageUrl'],'variants':variants,'ingredients':ingredients,'sourceDescription':intro,'sourceStorage':content.split('Срок хранения')[-1].strip(' :') if 'Срок хранения' in content else '', 'checkedOn':'2026-10-29','slug':urlparse(row['sourceUrl']).path.strip('/')+'-'+str(variants[0]['weightG'])+'-g','packCount':1,'unitWeightG':variants[0]['weightG'],'packWeightG':variants[0]['weightG'],'sourceLabel':'Целый пирог · '+ ' / '.join(str(v['weightG'])+' г' for v in variants)})
 prompt=f'''Use case: stylized-concept
Asset type: Pirogorsk food catalog illustration, separate foreground layer.
Primary request: Create ONE original appetizing hand-painted watercolor/gouache illustration of {name}. Use the supplied bakery photograph only as a factual reference for the pastry shape and filling, not as an image to reproduce. Second image is a style reference: match its warm detailed Baltic bakery watercolor, golden crust, soft painterly texture.
Product facts: {intro[:550]}. Ingredients: {ingredients[:650]}.
Composition: centered single whole pie, three-quarter elevated view, one small slice pulled slightly outward to reveal the correct filling; follow the reference shape (round, rectangular, fish-shaped or high-sided). Entire pastry visible with 14% clear margin, square canvas. Do not enlarge to a collage or add ingredient props.
Background: genuine transparent alpha, no plate, no table, no scene. Soft contact shadow only immediately beneath pastry.
Constraints: original arrangement and brushwork, no text, numbers, logo, watermark, utensils, garnish unrelated to the product, or copied source background. Preserve real filling and pastry type. This is a warm editorial illustration, not a photographic cut-and-paste.'''
 prompts.append({'id':f'p39-{sid}','name':name,'prompt':prompt,'reference':str(base/f'references/{sid}.jpg'),'referenceSha256':hashlib.sha256((base/f'references/{sid}.jpg').read_bytes()).hexdigest(),'imageUrl':row['imageUrl']})
Path('src/data/pirogi39-source.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')
(base/'prompts.json').write_text(json.dumps(prompts,ensure_ascii=False,indent=2)+'\n')
print('normalized',len(source),'variants',sum(len(x['variants'])for x in source),'promos',sum(bool(v['regularPrice'])for x in source for v in x['variants']))
for x in source:
 if not x['ingredients']:print('NO INGREDIENTS',x['id'])
print([(x['name'],x['variants'])for x in source if len(x['variants'])>1])
