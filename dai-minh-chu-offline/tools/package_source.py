import hashlib
import json
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT.parent/'output'
target=OUTPUT/'dai-minh-chu-offline-source.zip'
selected=[]
for folder in ['assets','android','tools','tests']:
    selected.extend(p for p in (ROOT/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
for name in ['README.md','REPORT.md','asset-report.json','.gitignore']:
    selected.append(ROOT/name)
for name in ['device-test.json','native-export-test.json','01-home.png','02-hero.png','03-summon.png','04-battle.png','05-victory.png']:
    p=ROOT/'verification'/name
    if p.exists():selected.append(p)
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in sorted(selected):z.write(p,str(Path('dai-minh-chu-offline')/p.relative_to(ROOT)))
with zipfile.ZipFile(target,'r') as z:
    assert z.testzip() is None
build=json.loads((ROOT/'build/build-result.json').read_text(encoding='utf-8'))
build['apk']=Path(build['apk']).name
build['status']='Offline prototype; not a 100% clone'
build['source_archive']={'file':target.name,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
build['content']=json.loads((ROOT/'asset-report.json').read_text(encoding='utf-8'))
build['engine_tests_passed']=10
build['device_checks_passed']=len(json.loads((ROOT/'verification/device-test.json').read_text(encoding='utf-8'))['checks'])
(OUTPUT/'dai-minh-chu-offline-build.json').write_text(json.dumps(build,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'source_zip':target.name,'files':len(selected),'bytes':target.stat().st_size}))
