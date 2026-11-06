"""Reproducible offline Android build with tools already installed on this PC."""
import hashlib
import json
import os
import secrets
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SDK=Path(r'C:\Users\NamTien\AppData\Local\Android\Sdk')
BUILD_TOOLS=SDK/'build-tools/36.0.0'
JAVA=Path(r'C:\Program Files\Java\jdk-19/bin')
JAR=SDK/'platforms/android-37.0/android.jar'
BUILD=ROOT/'build'
SIGNING=ROOT/'signing'
OUTPUT=ROOT.parent/'output/dai-minh-chu-offline-0.1.0.apk'
DEBUG='--debug' in sys.argv
for d in [BUILD/'classes',BUILD/'dex',BUILD/'res/drawable',SIGNING,OUTPUT.parent]:d.mkdir(parents=True,exist_ok=True)
shutil.copyfile(JAR,BUILD/'android.jar')
JAR=BUILD/'android.jar'
logs=[]
def run(cmd,env=None):
    p=subprocess.run([str(x) for x in cmd],env=env,capture_output=True,text=True,encoding='utf-8',errors='replace')
    logs.append({'command':[str(x) for x in cmd], 'returncode':p.returncode, 'stdout':p.stdout,'stderr':p.stderr})
    if p.returncode:
        (BUILD/'commands.json').write_text(json.dumps(logs,indent=2),encoding='utf-8')
        print(p.stdout,p.stderr);raise SystemExit(p.returncode)
    return p.stdout

# Reuse the supplied APK's launcher artwork only as a local reference resource.
with zipfile.ZipFile(ROOT.parent/'work/dai-minh-chu-audit/dai-minh-chu-8.0.2.apk') as z:
    (BUILD/'res/drawable/icon.png').write_bytes(z.read('res/drawable-xxhdpi-v4/app_icon.png'))
manifest=(ROOT/'android/AndroidManifest.xml').read_text(encoding='utf-8')
if DEBUG:manifest=manifest.replace('android:debuggable="false"','android:debuggable="true"')
(BUILD/'AndroidManifest.xml').write_text(manifest,encoding='utf-8')
run([JAVA/'javac.exe','-encoding','UTF-8','-source','8','-target','8','-bootclasspath',str(JAR)+os.pathsep+str(BUILD_TOOLS/'core-lambda-stubs.jar'),'-d',BUILD/'classes',*sorted((ROOT/'android/src').rglob('*.java'))])
run([JAVA/'java.exe','-cp',BUILD_TOOLS/'lib/d8.jar','com.android.tools.r8.D8','--lib',JAR,'--min-api','26','--output',BUILD/'dex',*sorted((BUILD/'classes').rglob('*.class'))])
unsigned=BUILD/'unsigned.apk'
run([BUILD_TOOLS/'aapt.exe','package','-f','-M',BUILD/'AndroidManifest.xml','-S',BUILD/'res','-A',ROOT/'assets','-I',JAR,'-F',unsigned])
with zipfile.ZipFile(unsigned,'a',compression=zipfile.ZIP_DEFLATED) as z:
    for f in sorted((BUILD/'dex').glob('*.dex')):z.write(f,f.name)
info=SIGNING/'keystore-info.json'
if not info.exists():
    config={'alias':'dmcoffline','password':secrets.token_urlsafe(24)}
    info.write_text(json.dumps(config),encoding='utf-8')
else:config=json.loads(info.read_text(encoding='utf-8'))
env=os.environ.copy();env['DMC_KEY_PASS']=config['password']
key=SIGNING/'offline.jks'
if not key.exists():
    run([JAVA/'keytool.exe','-genkeypair','-keystore',key,'-storepass:env','DMC_KEY_PASS','-keypass:env','DMC_KEY_PASS','-alias',config['alias'],'-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=Personal Offline Game'],env)
aligned=BUILD/'aligned.apk'
run([BUILD_TOOLS/'zipalign.exe','-f','4',unsigned,aligned])
run([JAVA/'java.exe','-jar',BUILD_TOOLS/'lib/apksigner.jar','sign','--ks',key,'--ks-key-alias',config['alias'],'--ks-pass','env:DMC_KEY_PASS','--key-pass','env:DMC_KEY_PASS','--v4-signing-enabled','false','--out',OUTPUT,aligned],env)
verification=run([JAVA/'java.exe','-jar',BUILD_TOOLS/'lib/apksigner.jar','verify','--verbose',OUTPUT])
run([BUILD_TOOLS/'zipalign.exe','-c','4',OUTPUT])
badging=run([BUILD_TOOLS/'aapt.exe','dump','badging',OUTPUT])
assert 'uses-permission:' not in badging,'Offline app must have no permissions'
with zipfile.ZipFile(OUTPUT) as z:assert z.testzip() is None
report={'apk':str(OUTPUT),'bytes':OUTPUT.stat().st_size,'sha256':hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),'debug':DEBUG,'no_android_permissions':True,'signature':verification.strip()}
(BUILD/'commands.json').write_text(json.dumps(logs,indent=2),encoding='utf-8')
(BUILD/'build-result.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=True,indent=2))
