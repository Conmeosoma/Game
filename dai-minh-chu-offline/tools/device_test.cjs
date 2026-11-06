/* Integration verification on the user's connected phone. No package data clearing. */
'use strict';
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'), out=path.join(root,'verification');fs.mkdirSync(out,{recursive:true});
const adb='C:\\Users\\NamTien\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const shell=(...args)=>execFileSync(adb,['-s','8e90fdff',...args],{encoding:'utf8'}).trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws,seq=0,pending=new Map(),errors=[],checks=[];
async function connect(){
 let pid='';for(let i=0;i<40&&!pid;i++){try{pid=shell('shell','pidof','vn.personal.dmcoffline');}catch(_){}if(!pid)await sleep(150);}
 if(!pid)throw Error('App process did not start');
 shell('forward','tcp:9223','localabstract:webview_devtools_remote_'+pid);
 let tabs=[];for(let i=0;i<40;i++){try{tabs=await (await fetch('http://127.0.0.1:9223/json/list')).json();}catch(_){}if(tabs.some(t=>t.url.includes('android_asset')))break;await sleep(150);}
 ws=new WebSocket(tabs.find(t=>t.url.includes('android_asset')).webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
 await send('Runtime.enable');
 for(let i=0;i<60;i++){
  const r=await send('Runtime.evaluate',{expression:'typeof state!=="undefined" && !!state && typeof G!=="undefined"',returnByValue:true});
  if(r.result?.value===true)return;
  await sleep(150);
 }
 throw Error('App did not initialize');
}
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error('CDP timeout '+method));}},10000).unref();});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
const click=selector=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing selector '+${JSON.stringify(selector)});e.click();return true;})()`);
async function screenshot(name){await sleep(250);const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));}
function record(name){checks.push(name);console.log('PASS',name);}
(async()=>{
 await connect();const original=process.argv.includes('--recover')?fs.readFileSync(path.join(out,'pre-test-save.json'),'utf8'):await evaluate('Android.load()');
 fs.writeFileSync(path.join(out,'pre-test-save.json'),original);
 try{
  await evaluate(`state=G.fresh();writeSave();close();page='home';render();`);
  await sleep(600);
  assert.equal(await evaluate('saveError'),false);
  assert.equal(await evaluate(`document.querySelector('.hero-banner img').naturalWidth>0`),true);
  assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
  await screenshot('01-home');record('Home and original lead portrait render without horizontal overflow');
  await click('[data-page="team"]');await sleep(100);
  assert.ok(await evaluate(`document.querySelector('.squad .card').getBoundingClientRect().height>80`));
  await click('.roster-grid [data-action="hero"]');
  const code=await evaluate('state.formation[0]'),lv=await evaluate(`state.roster[${JSON.stringify(code)}].level`);
  await click('[data-action="train"]');assert.equal(await evaluate(`state.roster[${JSON.stringify(code)}].level`),lv+1);
  await screenshot('02-hero');await evaluate('close()');record('Team cards have height and training updates stats');
  await evaluate(`gearDetail(state.equipment[0].id)`);await click('[data-action="forge"]');
  assert.equal(await evaluate('state.equipment[0].level'),2);
  await click(`[data-action="equip"][data-code="${code}"]`);
  assert.equal(await evaluate(`state.roster[${JSON.stringify(code)}].gear.VK`),1);
  await evaluate('close()');record('Forging and equipment apply on device');
  await click('[data-page="summon"]');const gold=await evaluate('state.gold');
  await click('[data-action="draw"][data-mode="3"][data-count="1"]');
  assert.equal(await evaluate('state.gold'),gold-300);assert.equal(await evaluate('state.summons'),1);
  await screenshot('03-summon');await evaluate('close()');record('Summoning consumes exact cost and persists result');
  await click('[data-page="home"]');await click('[data-action="daily"]');
  const claimed=await evaluate('state.gold');await click('[data-action="daily"]');assert.equal(await evaluate('state.gold'),claimed);record('Daily reward cannot be claimed twice');
  await click('[data-page="map"]');await click('[data-action="mission"][data-index="0"]');
  await click('[data-action="fight"]');
  assert.ok(await evaluate('!!state.battle'));await evaluate('clearTimeout(battleTimer)');await screenshot('04-battle');
  await click('[data-action="finish"]');
  assert.equal(await evaluate('state.next'),1);assert.equal(await evaluate('state.wins'),1);
  await screenshot('05-victory');await evaluate('close()');
  await click('[data-action="mission"][data-index="0"]');await click('[data-action="sweep"][data-count="5"]');
  assert.equal(await evaluate('state.wins'),6);await evaluate('close()');record('Combat victory, unlocks, farming and rewards work');
  await evaluate(`window.importGame('{"version":999}')`);assert.equal(await evaluate('state.wins'),6);record('Invalid import preserves existing progress');
  const before=await evaluate('Android.load()');
  ws.close();shell('shell','am','force-stop','vn.personal.dmcoffline');shell('shell','am','start','-n','vn.personal.dmcoffline/.MainActivity');await sleep(1600);await connect();
  assert.equal(await evaluate('state.wins'),6);assert.equal(await evaluate('state.next'),1);
  assert.equal(await evaluate('JSON.parse(Android.load()).roster[state.formation[0]].level'),lv+1);record('Native save survives force-stop and relaunch');
  await evaluate(`window.importGame(${JSON.stringify(original)})`);await click('[data-action="confirm-import"]');
  assert.equal(await evaluate('JSON.parse(Android.load()).wins'),JSON.parse(original).wins);record('Valid backup imports through confirmation');
  await evaluate('close();go("home")');await screenshot('06-restored-home');
  assert.equal(errors.length,0);record('No JavaScript exceptions during device scenario');
 }finally{
  if(ws&&ws.readyState===WebSocket.OPEN){await evaluate(`state=G.validate(JSON.parse(${JSON.stringify(original)}));writeSave();close();page='home';render();if(state.battle)resumeBattle();`);ws.close();}
  fs.writeFileSync(path.join(out,'device-test.json'),JSON.stringify({checks,errors,restored_original_save:true},null,2));
 }
})().catch(e=>{console.error(e);if(ws)ws.close();process.exitCode=1;});
