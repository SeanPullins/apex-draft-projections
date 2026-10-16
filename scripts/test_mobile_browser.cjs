#!/usr/bin/env node
"use strict";
/* Smoke test in REAL Chrome, not jsdom. Test dimensions and capture screenshots. */
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const cp=require("node:child_process"),assert=require("node:assert/strict");
const URL=process.env.APEX_PREVIEW_URL||"http://127.0.0.1:8123/index.html";
const bin=process.env.CHROME_BIN||["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser"].find(fs.existsSync);
if(!bin){console.error("No Chrome executable; cannot certify browser layout");process.exit(2);}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"apex-browser-"));
const out=path.resolve("mobile-browser-artifacts");fs.mkdirSync(out,{recursive:true});
const chrome=cp.spawn(bin,["--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--no-first-run","--remote-debugging-port=0","--user-data-dir="+dir,"about:blank"],{stdio:"ignore"});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function browserPort(){
 for(let i=0;i<160;i++){
  const f=path.join(dir,"DevToolsActivePort");
  if(fs.existsSync(f))return Number(fs.readFileSync(f,"utf8").split("\n")[0]);
  if(chrome.exitCode!==null)throw Error("Chrome exited while starting");
  await wait(75);
 }
 throw Error("Chrome debugging endpoint timed out");
}
(async()=>{
 let ws;
 try{
  const port=await browserPort();
  const list=await fetch("http://127.0.0.1:"+port+"/json/list").then(r=>r.json());
  const target=list.find(v=>v.type==="page");
  assert(target?.webSocketDebuggerUrl,"No browser tab");
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((yes,no)=>{
   ws.addEventListener("open",yes,{once:true});ws.addEventListener("error",no,{once:true});
  });
  const waiting=new Map();let next=0;
  ws.addEventListener("message",e=>{
   const msg=JSON.parse(e.data),p=waiting.get(msg.id);
   if(!p)return;waiting.delete(msg.id);
   if(msg.error)p.reject(Error(msg.error.message));else p.resolve(msg.result);
  });
  function call(method,params={}){
   return new Promise((resolve,reject)=>{
    const id=++next;waiting.set(id,{resolve,reject});
    ws.send(JSON.stringify({id,method,params}));
    setTimeout(()=>{if(waiting.delete(id))reject(Error(method+" timed out"));},20000).unref();
   });
  }
  async function evalJs(src){
   const x=await call("Runtime.evaluate",{expression:src,returnByValue:true});
   if(x.exceptionDetails)throw Error(JSON.stringify(x.exceptionDetails));
   return x.result.value;
  }
  await call("Page.enable");await call("Runtime.enable");
  const results=[];
  for(const width of [320,360,375,390,430,480,481]){
   await call("Emulation.setDeviceMetricsOverride",{width,height:820,deviceScaleFactor:1,mobile:width<=480});
   await call("Page.navigate",{url:URL+"?qa="+width+"#board"});
   let x;
   for(let i=0;i<115;i++){
    await wait(85);
    x=await evalJs("(()=>({ready:document.readyState,mobile:!!window.APEX_MOBILE,cards:document.querySelectorAll('#apexMobBoard .apex-mob-card').length,desktopRows:document.querySelectorAll('#boardBody tr').length,nav:document.querySelectorAll('.apex-mob-bottomnav button').length,navDisplay:document.querySelector('#apexMobileChrome')?getComputedStyle(document.querySelector('#apexMobileChrome')).display:'none',viewport:window.innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,navHeight:Math.round(document.querySelector('.apex-mob-bottomnav')?.getBoundingClientRect().height||0)}))()");
    if(x.ready==="complete"&&(width<=480?x.cards===25:x.desktopRows===201))break;
   }
   assert.equal(x.ready,"complete","incomplete page "+width);
   if(width<=480){
    assert.equal(x.mobile,true,"mobile shell "+width);
    assert.equal(x.cards,25,"initial cards "+width);
    assert.equal(x.desktopRows,0,"hidden rows "+width);
    assert.equal(x.nav,5);
    assert.notEqual(x.navDisplay,"none");
    assert(x.navHeight>=56,"nav height "+width);
   }else{
    assert.equal(x.navDisplay,"none","desktop mobile shell leaked");
    assert.equal(x.desktopRows,201,"desktop board missing");
   }
   assert(x.documentWidth<=x.viewport+2,"horizontal page overflow "+JSON.stringify({width,...x}));
   assert(x.bodyWidth<=x.viewport+2,"horizontal body overflow "+JSON.stringify({width,...x}));
   results.push({width,...x});console.log("PASS",width,x.documentWidth,x.viewport,x.cards,x.desktopRows);
   if([360,390,481].includes(width)){
    const shot=await call("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
    fs.writeFileSync(path.join(out,"apex-"+width+"px.png"),Buffer.from(shot.data,"base64"));
   }
  }
  fs.writeFileSync(path.join(out,"measurements.json"),JSON.stringify(results,null,2));
 }finally{
  ws?.close();chrome.kill("SIGTERM");fs.rmSync(dir,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
