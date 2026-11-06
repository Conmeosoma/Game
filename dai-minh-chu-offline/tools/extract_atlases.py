"""Recover NGUI sprite rectangles and external alpha masks as reference artwork."""
import json
import re
import sys
import zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
AUDIT=ROOT.parent/'work/dai-minh-chu-audit'
sys.path[:0]=[str(ROOT.parent/'work/tools/python'),str(ROOT.parent/'work/tools/typetree-python')]
import UnityPy
from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
from PIL import Image

generator=TypeTreeGenerator('4.7.2f1')
with zipfile.ZipFile(AUDIT/'dai-minh-chu-8.0.2.apk') as apk:
    for n in apk.namelist():
        if '/Managed/' in n and n.endswith('.dll'):generator.load_dll(apk.read(n))
node=generator.get_nodes_up('Assembly-CSharp','UIAtlas')
env=UnityPy.load(str(AUDIT/'unity-shared/sharedassets0.assets'))
objects={o.path_id:o for o in env.objects}
script=next(o.path_id for o in env.objects if o.type.name=='MonoScript' and o.read().m_ClassName=='UIAtlas')
art={}; metadata=[]
dest=ROOT/'assets/art'; dest.mkdir(exist_ok=True)
for o in env.objects:
    if o.type.name!='MonoBehaviour':continue
    base=o.read_typetree(check_read=False)
    if base.get('m_Script',{}).get('m_PathID')!=script:continue
    tree=o.read_typetree(node);metadata.append({'id':o.path_id,'tree':tree})
    material=objects[tree['material']['m_PathID']].read_typetree()
    textures={a['name']:b['m_Texture']['m_PathID'] for a,b in material['m_SavedProperties']['m_TexEnvs']}
    color=objects[textures['_MainTex']].read().image.convert('RGBA')
    if textures.get('_AlphaMask'):
        alpha=objects[textures['_AlphaMask']].read().image.convert('RGB').getchannel('R')
        color.putalpha(alpha.resize(color.size,Image.Resampling.BILINEAR))
    for sprite in tree['sprites']:
        name=sprite['name']
        # UI background and ground are retained for study; avatar/icon paths are used by the app.
        if not name.startswith(('NV_','NC_','VC_','VK_','AG_','TS_','VP_','DH_')) and name not in ['background','nen_dat']:continue
        if not re.fullmatch(r'[A-Za-z0-9_]+',name):continue
        r=sprite['outer'];x,y,w,h=[int(round(r[k])) for k in ['x','y','width','height']]
        if w<1 or h<1:continue
        image=color.crop((x,y,x+w,y+h))
        if sprite.get('rotated'):image=image.transpose(Image.Transpose.ROTATE_90)
        image.save(dest/(name+'.png'));art[name]='art/'+name+'.png'
datafile=ROOT/'assets/data.js'
data=json.loads(datafile.read_text(encoding='utf-8').removeprefix('globalThis.DMC_DATA=').strip().removesuffix(';'))
data['art'].update(art)
datafile.write_text('globalThis.DMC_DATA='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
(AUDIT/'atlas-metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
report=json.loads((ROOT/'asset-report.json').read_text(encoding='utf-8'))
report.update({'atlas_sprites_extracted':len(art),'portraits_and_icons':len(data['art']),
    'recruitable_characters':258,'npc_records':71,'total_character_records':333})
(ROOT/'asset-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=True))
