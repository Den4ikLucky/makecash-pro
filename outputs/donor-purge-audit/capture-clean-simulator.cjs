const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
const assert = require('node:assert/strict');
const [url, image, resultPath] = process.argv.slice(2);
const profile = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'makecash-purge-chrome-'));
const args = ['--headless=new','--window-size=1440,1080','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--hide-scrollbars','about:blank'];
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args,{stdio:['ignore','ignore','pipe']});
let stderr='', ws; chrome.stderr.on('data', b=>{stderr+=b.toString()});
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
try {
  const active = path.join(profile,'DevToolsActivePort');
  for(let i=0;i<120&&!fs.existsSync(active);i++){if(chrome.exitCode!==null)throw Error('Chrome exited: '+stderr.slice(-1000));await sleep(100)}
  const port = fs.readFileSync(active,'utf8').split('\n')[0];
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(tabs.find(x=>x.type==='page').webSocketDebuggerUrl);
  await new Promise((ok,no)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',no,{once:true})});
  let serial=0; const pending = new Map(), errors=[], requests=[];
  ws.addEventListener('message', ev=>{const m=JSON.parse(ev.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.no(Error(JSON.stringify(m.error))):p.ok(m.result)}else if(m.method==='Runtime.exceptionThrown'){errors.push(m.params.exceptionDetails.text+': '+(m.params.exceptionDetails.exception?.description||''))}else if(m.method==='Network.requestWillBeSent'){requests.push(m.params.request.url)}});
  const call = (method,params={})=>new Promise((ok,no)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);no(Error('CDP timeout: '+method))},45000);pending.set(id,{ok,no,timer});ws.send(JSON.stringify({id,method,params}))});
  const evaluate=async(expression,awaitPromise=false)=>{const r=await call('Runtime.evaluate',{expression,awaitPromise,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url});
  for(let i=0;i<160;i++){if(await evaluate('document.readyState === "complete" && !!document.querySelector("[onclick=\\"openMacroContext()\\"]")'))break;await sleep(100)}
  await evaluate('document.fonts.ready.then(()=>true)',true);
  await sleep(3500);
  const wanted='📚 MakeCashTrade Macro · 48 статей · Защита капитала 14 ур.';
  const badge=await evaluate('document.querySelector(\'[onclick="openMacroContext()"]\').textContent.trim()'); assert.equal(badge,wanted);
  const banned=/сафин|safin|zametkisafina|Экономика для людей|cryptology|copan|копан|adversa|адверз|antixgroup|Не хочу иксы|blockchaingerman|герман|cryptoattack|криптоатак|doubletop/ig;
  const text=await evaluate('document.body.innerText'); assert.equal((text.match(banned)||[]).length,0);
  await evaluate('Promise.resolve(openMacroContext()).then(()=>true)',true); await sleep(600);
  const modal=await evaluate('({title:document.querySelector("#macroContextTitle").textContent,text:document.querySelector("#macroContextDrawer").innerText})');
  assert.equal(modal.title,'Аналитика MakeCashTrade'); assert.equal((modal.text.match(banned)||[]).length,0);
  await evaluate('document.querySelector("#macroContextDrawer").close();(()=>{const b=document.querySelector(\'[onclick="openMacroContext()"]\');const r=b.getBoundingClientRect();window.scrollTo(0,Math.max(0,window.scrollY+r.bottom-window.innerHeight+100));return true})()');
  await evaluate('document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true)))))',true);
  const view=await evaluate('(()=>{const b=document.querySelector(\'[onclick="openMacroContext()"]\').getBoundingClientRect();const r=document.querySelector("#orderflow-radar");return {width:innerWidth,height:innerHeight,badge:{top:b.top,bottom:b.bottom,left:b.left,right:b.right},radarStatus:r?.innerText.slice(0,1000),fonts:document.fonts.status}})()');
  assert.ok(view.badge.top>=0&&view.badge.bottom<=view.height,'Badge must be fully visible'); assert.equal(view.fonts,'loaded');
  const shot=await call('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false}); fs.writeFileSync(image,Buffer.from(shot.data,'base64'));
  const result={status:'PASS',chromeArgs:args.filter(x=>!x.startsWith('--user-data-dir')),url,badge,donorMatches:0,modalTitle:modal.title,modalDonorMatches:0,view,javascriptErrors:errors,requests:requests.filter(x=>/api\/|data\//.test(x)),screenshot:image};
  assert.equal(errors.length,0,JSON.stringify(errors)); fs.writeFileSync(resultPath,JSON.stringify(result,null,2)+'\n'); console.log(JSON.stringify(result));
} finally {if(ws)ws.close();chrome.kill('SIGTERM');await sleep(800);if(chrome.exitCode===null)chrome.kill('SIGKILL');fs.rmSync(profile,{recursive:true,force:true})}
})().catch(e=>{console.error(e.stack);process.exitCode=1});