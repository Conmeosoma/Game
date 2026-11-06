"""Prepare private APK-derived resources after cloning this code-only repository."""
import argparse
import collections
import json
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
WORKSPACE=ROOT.parent
sys.path.insert(0,str(WORKSPACE/'work/tools/python'))
try:
    import UnityPy
except ImportError:
    raise SystemExit('Missing UnityPy. Prepare a Python environment with requirements.txt first; this script does not install packages.')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('apk',type=Path,help='Local Dai Minh Chu 8.0.2 APK; never executed or modified')
    args=parser.parse_args()
    source=args.apk.resolve(strict=True)
    audit=WORKSPACE/'work/dai-minh-chu-audit'
    audit.mkdir(parents=True,exist_ok=True)
    apk_copy=audit/'dai-minh-chu-8.0.2.apk'
    # Check the expected engine layout before replacing this generated reference copy.
    with zipfile.ZipFile(source) as apk:
        header=apk.read('assets/bin/Data/mainData')[:100]
        if b'4.7.2f1' not in header:
            raise SystemExit('Unsupported APK: expected the inspected Unity 4.7.2f1 layout.')
        if 'assets/bin/Data/Managed/Assembly-CSharp.dll' not in apk.namelist():
            raise SystemExit('Missing managed game assembly.')
    if source!=apk_copy.resolve():shutil.copyfile(source,apk_copy)
    text_dir=audit/'reference-text';text_dir.mkdir(exist_ok=True)
    entries=[];errors=[];counts=collections.Counter()
    with zipfile.ZipFile(apk_copy) as apk:
        names=apk.namelist()
        for n in names:
            if not n.startswith('assets/bin/Data/') or '/Managed/' in n or n.endswith('.resS') or re.search(r'\.split\d+$',n):continue
            try:
                env=UnityPy.load(apk.read(n))
                for obj in env.objects:
                    kind=obj.type.name;counts[kind]+=1
                    if kind not in ['Texture2D','TextAsset','AudioClip']:continue
                    data=obj.read()
                    entries.append({'file':n,'id':obj.path_id,'type':kind,'name':data.m_Name,
                                    'width':getattr(data,'m_Width',None),'height':getattr(data,'m_Height',None)})
                    if kind=='TextAsset' and re.fullmatch(r'[A-Za-z0-9_-]+',data.m_Name):
                        body=data.m_Script
                        if isinstance(body,str):body=body.encode('utf-8',errors='surrogateescape')
                        (text_dir/(data.m_Name+'.txt')).write_bytes(body)
            except Exception as exc:
                errors.append({'file':n,'error':str(exc)[:200]})
        (audit/'apk-files.txt').write_text('\n'.join(names),encoding='utf-8')
    (audit/'asset-inventory.json').write_text(json.dumps({'counts':dict(counts),'entries':entries,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
    for name in ['NhanVat','VoCong','TrangBi','GiangHo','VatPhamTieuThu','Other']:
        if not (text_dir/(name+'.txt')).exists():raise SystemExit('Missing required configuration: '+name)
    subprocess.run([sys.executable,str(ROOT/'tools/prepare_assets.py')],check=True)
    subprocess.run([sys.executable,str(ROOT/'tools/extract_atlases.py')],check=True)
    print('Private resources prepared locally. They are excluded by .gitignore.')

if __name__=='__main__':main()
