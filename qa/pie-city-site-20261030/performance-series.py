from pathlib import Path
import os,subprocess,sys
stage=sys.argv[1]; base='https://pirogorsk.ru' if stage=='production' else 'http://127.0.0.1:4323'
for name,path in [('home','/'),('menu','/menu/'),('delivery','/delivery/'),('zelenogradsk','/zelenogradsk/'),('blog','/blog/')]:
 root=Path(f'qa/pie-city-site-20261030/performance-{stage}-{name}')
 env=dict(os.environ,LIGHTHOUSE_MOBILE_RUNS='1',LIGHTHOUSE_OUTPUT_DIR=str(root))
 with root.with_suffix('.log').open('w') as log: p=subprocess.run(['node','scripts/audit-performance.mjs',base+path],env=env,stdout=log,stderr=subprocess.STDOUT)
 print(f'{stage}/{name}: exit {p.returncode}',flush=True)
 if p.returncode:sys.exit(p.returncode)
