"""Extract an independent CI artifact subset for live byte comparison."""
from pathlib import Path
import tarfile
root=Path(__file__).resolve().parent
originals=[p.stem for p in (root.parent.parent/'design/pie-city-site-20261030').glob('*.png')]
target=root/'artifact-site'
count=0
with tarfile.open(root/'downloaded-artifact/artifact.tar') as archive:
 for member in archive:
  if not member.isfile(): continue
  relative=Path(member.name.removeprefix('./'))
  if relative.is_absolute() or '..' in relative.parts: raise ValueError(relative)
  chosen=relative.suffix=='.html' or str(relative)=='release.json' or (relative.parts[0]=='_astro' and (relative.suffix=='.js' or any(relative.name.startswith(stem+'.') for stem in originals)))
  if chosen:
   path=target/relative
   path.parent.mkdir(parents=True,exist_ok=True)
   path.write_bytes(archive.extractfile(member).read())
   count+=1
assert len(list(target.rglob('*.html')))==217
print(f'Extracted {count} resources from independent CI artifact')
