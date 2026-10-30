"""Extract HTML and runtime files from the independently downloaded CI artifact."""
from pathlib import Path
import tarfile
root=Path(__file__).resolve().parent
target=root/'artifact-site'
count=0
with tarfile.open(root/'downloaded-artifact/artifact.tar') as archive:
 for member in archive:
  if not member.isfile(): continue
  relative=Path(member.name.removeprefix('./'))
  if relative.is_absolute() or '..' in relative.parts: raise ValueError(relative)
  if relative.suffix not in ('.html','.js','.css') and str(relative)!='release.json': continue
  path=target/relative
  path.parent.mkdir(parents=True,exist_ok=True)
  path.write_bytes(archive.extractfile(member).read())
  count+=1
assert len(list(target.rglob('*.html')))==217
print(f'Extracted {count} resources from independent CI artifact')
