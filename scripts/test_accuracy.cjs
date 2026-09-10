const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const context={window:{}}; vm.createContext(context);
function run(file){vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});}
run('data.js');
const before=context.window.APEX.players.find(p=>p.yr===2023&&p.pk===1).apex;
for(const f of ['qb-patch-2000-2007.js','qb-patch-2008-2014.js','qb-patch-2015-2020.js','qb-patch-2021-2026.js','qb-no-testing-apply.js','accuracy-audit.js'])run(f);
const A=context.window.APEX;
const player=A.players.find(p=>p.yr===2023&&p.pk===1);
assert.notEqual(before,player.apex);
assert.equal(player.sd,undefined);
assert.equal(player.score_revision,'qb-no-testing-2026-08-11');
assert(A.players.every(p=>p.tier===undefined&&p.tierp===undefined));
assert(A.players.filter(p=>p.yr<2003).every(p=>p.src!==1));
for(const k of ['market','deploy'])for(const label of ['hit','starter','probowl','bust']) {
  assert(Number.isFinite(A.backtest.summary[k][label].auc),`${k}.${label} must survive patching`);
}
const metric=context.window.APEX_METRICS;
assert.equal(metric([{p:.5,y:0},{p:.5,y:1}],'p','y').auc,.5);
assert.equal(metric([{p:.1,y:0},{p:.9,y:1}],'p','y').auc,1);
assert.equal(metric([{p:.9,y:0},{p:.1,y:1}],'p','y').auc,0);
assert.equal(A.backtest.summary.deploy.hit.n,4765);
assert.equal(A.metrics_full,undefined);
assert(Number.isFinite(A.forward.pooled.hit.apex));
for(const yr of A.classes){
 const players=A.players.filter(p=>p.yr===yr).sort((a,b)=>b.apex-a.apex||a.pk-b.pk);
 players.forEach((p,i)=>assert.equal(p.rk,i+1));
}
console.log('PASS: patched scores, rankings, metric availability, tie-safe AUC, provenance, uncertainty and forward statistics');
