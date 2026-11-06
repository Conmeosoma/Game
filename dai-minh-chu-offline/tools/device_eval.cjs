'use strict';
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const adb='C:\\Users\\NamTien\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const sh=(...a)=>execFileSync(adb,['-s','8e90fdff',...a],{encoding:'utf8'}).trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const pid=sh('shell','pidof','vn.personal.dmcoffline');sh('forward','tcp:9223','localabstract:webview_devtools_remote_'+pid);
 const tabs=await(await fetch('http://127.0.0.1:9223/json/list')).json();
 const ws=new WebSocket(tabs.find(t=>t.url.includes('android_asset')).webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 let serial=0;const pending=new Map();
 ws.onmessage=e=>{const r=JSON.parse(e.data);if(r.id&&pending.has(r.id)){pending.get(r.id)(r);pending.delete(r.id);}};
 function evaluate(expression){return new Promise(resolve=>{const id=++serial;pending.set(id,resolve);ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));});}
 for(let i=0;i<60;i++){const r=await evaluate('typeof state!=="undefined" && !!state');if(r.result?.result?.value)break;await sleep(150);}
 const expression=process.argv[2]==='--file'?fs.readFileSync(process.argv[3],'utf8'):process.argv.slice(2).join(' ');
 const r=await evaluate(expression);ws.close();if(r.result?.exceptionDetails)throw Error(JSON.stringify(r.result.exceptionDetails));console.log(JSON.stringify(r.result?.result?.value??r));
})().catch(e=>{console.error(e);process.exitCode=1;});
