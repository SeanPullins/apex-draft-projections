/* Strict public-data assertions for 2027 player editorial summaries. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const context={window:{}};
vm.createContext(context);
for(const file of ["data2027.js","data2026.js","scouting-stories.js"]){
  vm.runInContext(fs.readFileSync(path.join(root,file),"utf8"),context,{filename:file});
}
const d=context.window.APEX2027.players;
const stats=context.window.APEX_STORIES;
const original=JSON.stringify(d);
assert.equal(d.length,201);
assert(stats&&typeof stats.profile==="function");
const player=n=>d.find(p=>p.r===n);
assert(stats.profile(player(1)).fact.includes("823 receiving yards"),"Jeremiah Smith observed receiving totals");
assert(stats.profile(player(5)).fact.includes("passing yards"),"Quarterbacks use passing totals");
assert(stats.profile(player(3)).fact.includes("sacks"),"EDGE players use pass-rush stats");
assert.equal(stats.profile(player(8)).kind,"ol");
assert(stats.profile(player(8)).fact.includes("public box scores"),"Public OL grades must not be invented");
assert(stats.profile(player(8)).note.includes("not been independently reconciled"),"Private OL receipt remains unverified");
assert.equal(stats.profile(player(29)).kind,"limited","Injured player cannot have fabricated current-season performance");
assert(stats.profile(player(29)).fact.includes("injury"),"Reason for missing snaps is explicit");
const seen=new Set();
for(const p of d){
  const result=stats.profile(p);
  for(const key of ["fact","take","interpretation","status","context","note"])
    assert(typeof result[key]==="string" && result[key].length>3,"Missing "+key+" for #"+p.r);
  assert(!result.fact.includes("Acquire scouting-grade"),"No generic scouting call to action");
  assert(!result.interpretation.includes("quick-game execution"),"No repeated quick-game task");
  assert(!result.interpretation.includes("short-area execution"),"No repeated short-area task");
  assert(!result.note.includes("pass_block_grade"),"Do not print licensed raw metrics");
  if(result.kind==="season"){
    const available=stats.stats(p);
    assert(available.length,"Season card must have observed position-specific numbers");
    assert(available.every(x=>Number.isFinite(x.value)));
  }
  seen.add(result.fact);
}
assert(seen.size>=50,"Season facts must be meaningfully differentiated rather than universal prompts");
assert.equal(JSON.stringify(d),original,"Read-only summaries must not mutate frozen player data");
console.log("PASS: 201 source-grounded 2027 stories, position specificity, missing-game safety, restricted metrics and immutable projections");
