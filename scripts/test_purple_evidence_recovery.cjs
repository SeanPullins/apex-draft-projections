const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const {JSDOM}=require("jsdom");
const root=path.resolve(__dirname,"..");
const context={window:{}};vm.createContext(context);
for(const name of ["data2027.js","data2026.js","data2027-context.js","scouting-stories.js"])
  vm.runInContext(fs.readFileSync(path.join(root,name),"utf8"),context,{filename:name});
const D=context.window.APEX2027;
const L=context.window.APEX2026;
const C=context.window.APEX2027Context;
const S=context.window.APEX_STORIES;
const purple=D.players.filter(p=>["DATA_GAP","URGENT_DATA_GAP","SCOUT_MORE"].includes(p.a));
assert.equal(purple.length,44,"Original count of purple records must remain frozen");
assert.equal(Object.keys(C.rows).length,44,"Every old purple record should have an evidence record");
assert(purple.every(p=>C.rows[p.r]),"Source records cannot silently skip a purple player");
assert.equal(purple.filter(p=>p.p==="OL"&&L.players[p.r]?.muse_private_blocking_received).length,35);
assert.equal(Object.values(C.rows).filter(r=>r.verified===true).length,7);
assert.equal(C.rows[134].source,"official");
assert.equal(C.rows[144].source,"official");
assert.equal(C.rows[147].source,"official");
assert.equal(C.rows[186].source,"official");
const frozen=JSON.stringify(D.players),snap=JSON.stringify(L.players);
for(const p of purple) {
  const r=C.rows[p.r],profile=S.profile(p);
  assert(profile.research,"No evidence on file for old purple player rank "+p.r);
  assert(profile.take!=="No supported 2026 verdict", "Old purple placeholder should not remain for "+p.r);
  assert(profile.fact && profile.fact.length>=15,"Player must have usable role or history context");
  if(p.p==="OL" && r.kind==="role"){
    assert(profile.fact.includes("grade not published"),"Blocking data cannot be republished: "+p.r);
    assert(!profile.fact.includes("PFF")&&!profile.fact.includes("pass_block"),"No restricted charting data");
  }
  if(r.verified){
    assert(r.url&&r.url.startsWith("https://"),"Only source-linked facts may be called independently checked");
  } else {
    assert(!r.verified,"Unreviewed Muse research cannot be labeled independently checked");
  }
}
assert(S.profile(purple.find(p=>p.r===8)).take.includes("research received"));
assert(S.profile(purple.find(p=>p.r===134)).fact.includes("2025: 13 starts"));
assert(S.profile(purple.find(p=>p.r===144)).fact.includes("five interceptions"));
assert(S.profile(purple.find(p=>p.r===186)).fact.includes("27 games"));
assert.equal(JSON.stringify(D.players),frozen,"Frozen model research actions must remain unchanged");
assert.equal(JSON.stringify(L.players),snap,"Source receipt status must remain unchanged");
assert(!JSON.stringify(C).includes('"pff_pass_block_grade"'));
assert(!JSON.stringify(C).includes('"pff_run_block_grade"'));

const dom=new JSDOM(fs.readFileSync(path.join(root,"index.html"),"utf8"),{
  url:"https://example.test/#board",runScripts:"outside-only",pretendToBeVisual:true
});
try{
 const w=dom.window;w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};
 for(const node of w.document.querySelectorAll("script[src]"))w.eval(
   fs.readFileSync(path.join(root,node.getAttribute("src").split("?")[0]),"utf8"));
 assert.equal(w.document.querySelectorAll("#boardBody tr").length,201);
 const marked=[...w.document.querySelectorAll("#boardBody tr")].filter(tr=>tr.querySelector(".take-data"));
 assert.equal(marked.length,0,"No old work-queue purple badges remain once sourced context is on file");
 assert(w.document.querySelector('#boardBody tr[data-rank="8"]').textContent.includes("research received"));
 assert(w.document.querySelector('#boardBody tr[data-rank="134"]').textContent.includes("2025: 13 starts"));
 assert(!w.document.querySelector("#boardBody").textContent.includes("PFF pass-block grade"),"Do not leak restricted numeric columns");
 console.log("PASS: all 44 purple records audited, 35 OL receipts preserved, 7 school-linked profiles, no private metrics, no false green grades");
}finally{dom.window.close();}
