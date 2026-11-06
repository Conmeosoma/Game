"""Extract reference data/art from the user's local APK. Never execute APK code."""
import collections
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
sys.path.insert(0, str(WORKSPACE / 'work/tools/python'))
import UnityPy

AUDIT = WORKSPACE / 'work/dai-minh-chu-audit'
DEST = ROOT / 'assets'
(DEST / 'art').mkdir(parents=True, exist_ok=True)
inventory = json.loads((AUDIT / 'asset-inventory.json').read_text(encoding='utf-8'))
art = {}
errors = []
with zipfile.ZipFile(AUDIT / 'dai-minh-chu-8.0.2.apk') as apk:
    for item in inventory['entries']:
        name = item['name']
        if item['type'] != 'Texture2D' or not name.startswith(('NV_', 'NC_', 'VC_', 'VK_', 'AG_', 'TS_', 'VP_', 'DH_')):
            continue
        if not re.fullmatch(r'[A-Za-z0-9_]+', name):
            continue
        try:
            if not (DEST / 'art' / (name + '.png')).exists():
                env = UnityPy.load(apk.read(item['file']))
                obj = next(o for o in env.objects if o.path_id == item['id']).read()
                obj.image.save(DEST / 'art' / (name + '.png'))
            art[name] = 'art/' + name + '.png'
        except Exception as exc:
            errors.append({'name': name, 'error': str(exc)})
    shared = AUDIT / 'unity-shared'
    shared.mkdir(exist_ok=True)
    chunks = [n for n in apk.namelist() if n.startswith('assets/bin/Data/sharedassets0.assets.split')]
    chunks.sort(key=lambda n: int(n.rsplit('split', 1)[1]))
    (shared / 'sharedassets0.assets').write_bytes(b''.join(apk.read(n) for n in chunks))
    (shared / 'sharedassets0.assets.resS').write_bytes(apk.read('assets/bin/Data/sharedassets0.assets.resS'))
    env = UnityPy.load(str(shared / 'sharedassets0.assets'))
    for obj in env.objects:
        if obj.type.name != 'Texture2D': continue
        texture = obj.read()
        name = texture.m_Name
        if not name.startswith(('NV_', 'NC_')): continue
        texture.image.save(DEST / 'art' / (name + '.png'))
        art[name] = 'art/' + name + '.png'

data = {}
for name in ['NhanVat', 'VoCong', 'TrangBi', 'GiangHo', 'VatPhamTieuThu', 'Other']:
    data[name] = json.loads((AUDIT / 'reference-text' / (name + '.txt')).read_text(encoding='utf-8-sig'))
# No connection, SDK login, remote update or billing configuration in the new game.
data['Other'].pop('LoginCfg', None)
data['art'] = art
(DEST / 'data.js').write_text('globalThis.DMC_DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
summary = {'portraits_and_icons': len(art), 'characters': len(data['NhanVat']),
           'skills': len(data['VoCong']), 'equipment': len(data['TrangBi']),
           'chapters': len(data['GiangHo']),
           'stages': sum(len(c['NhiemVuList']) for c in data['GiangHo']), 'errors': errors}
(ROOT / 'asset-report.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(summary, ensure_ascii=True))
