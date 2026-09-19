const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
(async()=>{
const root = path.resolve(__dirname, '..');
const dom = new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'), {
  url:'https://example.test/#board/2023', runScripts:'outside-only', pretendToBeVisual:true
});
const w = dom.window, d = w.document;
const errors=[];
w.addEventListener('error', e=>errors.push(e.error || e.message));
w.matchMedia=()=>({matches:false,addEventListener(){}});
for(const script of d.querySelectorAll('script[src]')) {
  const followup=['research-followup.js','accuracy-lab.js','external-research.js','college-context-research.js'].some(name=>script.getAttribute('src').startsWith(name));
  const before=followup?JSON.stringify(w.APEX.players):null;
  w.eval(fs.readFileSync(path.join(root,script.getAttribute('src').split('?')[0]),'utf8'));
  if(followup)assert.equal(JSON.stringify(w.APEX.players),before,'Research must not mutate live scores');
}
assert(d.querySelector('#researchFollowup').textContent.includes('failed the release gate'));
assert.equal(w.APEX_RESEARCH_FOLLOWUP.v14.promotion.approved,false);
assert.equal(w.APEX_RESEARCH_FOLLOWUP.n,4765);
assert.equal(w.APEX_ACCURACY_LAB.production_changed,false);
for(const report of Object.values(w.APEX_ACCURACY_LAB.reports))assert.equal(report.promotion.approved,false);
const scope=d.querySelector('#accuracyLabScope');
for(const option of scope.options){
 scope.value=option.value;scope.dispatchEvent(new w.Event('change'));
 const rows=d.querySelectorAll('#accuracyLabRows tr');assert.equal(rows.length,3);
 for(const [i,n] of ['hit','starter','probowl'].entries()){
  const cells=rows[i].querySelectorAll('td');
  assert.equal(Number(cells[0].textContent),w.APEX_ACCURACY_LAB.reports.v15.metrics[n][option.value].market.n);
  assert.equal(cells[6].textContent,w.APEX_ACCURACY_LAB.reports.v17.metrics[n][option.value].v17.brier.toFixed(6));
 }
}
scope.value='all';scope.dispatchEvent(new w.Event('change'));
assert.equal(w.APEX_EXTERNAL_RESEARCH.production_changed,false);
assert.equal(w.APEX_COLLEGE_RESEARCH.production_changed,false);
for(const [id,bodyId,payload,outcomes,models] of [
 ['fourYearScope','fourYearRows',w.APEX_EXTERNAL_RESEARCH.four_year,['hit4','starter4'],['market','existing_features','external_features','without_draft_position']],
 ['collegeScope','collegeRows',w.APEX_COLLEGE_RESEARCH,['hit','starter','probowl'],['without_context','with_context']]
]){
 const control=d.getElementById(id);
 for(const option of control.options){
  control.value=option.value;control.dispatchEvent(new w.Event('change'));
  const rows=d.querySelectorAll('#'+bodyId+' tr');assert.equal(rows.length,outcomes.length);
  outcomes.forEach((outcome,i)=>{
   const m=payload.metrics[outcome][option.value],cells=rows[i].querySelectorAll('td');
   assert.equal(Number(cells[0].textContent),m[models[0]].n);
   models.forEach((model,j)=>assert.equal(cells[j+1].textContent,m[model].brier.toFixed(6)));
  });
 }
 control.value='all';control.dispatchEvent(new w.Event('change'));
}

function active(name) {
  assert.equal(d.querySelectorAll('.tab-panel.is-active').length,1);
  assert.equal(d.querySelector('.tab-panel.is-active').id,'tab-'+name);
  assert.equal(d.querySelector('.tab[aria-selected="true"]').dataset.tab,name);
}
active('board');
assert.equal(d.querySelectorAll('#boardBody tr').length,253);
for(const button of d.querySelectorAll('.tab')) {button.click();active(button.dataset.tab);}
const board=d.querySelector('.tab[data-tab="board"]');board.click();board.focus();
for(const [key,name] of [['ArrowRight','insights'],['End','method'],['ArrowRight','board'],['ArrowLeft','method'],['Home','board']]) {
  d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
  active(name);assert.equal(d.activeElement.dataset.tab,name);
}
d.querySelector('#classSelect').value='2024';
d.querySelector('#classSelect').dispatchEvent(new w.Event('change',{bubbles:true}));
assert.equal(d.querySelectorAll('#boardBody tr').length,253);

// Forward comparison tiles must use the visible position scope and the active
// lens. The old implementation reused whole-class drafted values for every
// filter, so a QB-only pre-draft board still showed the all-position APEX rate.
d.querySelector('#classSelect').value='2023';
d.querySelector('#classSelect').dispatchEvent(new w.Event('change',{bubbles:true}));
const tile = label => {
 const node=[...d.querySelectorAll('#boardTiles .tile')].find(x=>x.querySelector('.tile-label').textContent===label);
 assert(node,`missing tile: ${label}`);
 return {value:node.querySelector('.tile-value').textContent,sub:node.querySelector('.tile-sub').textContent};
};
const qbpill=[...d.querySelectorAll('#posPills button')].find(x=>x.textContent==='QB');
assert(qbpill);
qbpill.click();
const qbs=w.APEX.players.filter(p=>p.yr===2023&&p.pg==='QB');
const valid=p=>Number.isFinite(p.qapex)&&Number.isFinite(p.qh)&&p.qh>=0&&p.qh<=1&&Number.isFinite(p.pk)&&(p.fh===0||p.fh===1);
const eligible=qbs.filter(valid);
const topN=Math.min(32,eligible.length);
const top=eligible.slice().sort((a,b)=>b.qapex-a.qapex||a.pk-b.pk).slice(0,topN);
const draft=eligible.slice().sort((a,b)=>a.pk-b.pk).slice(0,topN);
const rate=xs=>xs.reduce((s,p)=>s+p.fh,0)/xs.length;
const expected=`${Math.round(rate(top)*100)}% · ${Math.round(rate(draft)*100)}%`;
const draftedTop=eligible.slice().sort((a,b)=>b.apex-a.apex||a.pk-b.pk).slice(0,topN);
const draftedExpected=`${Math.round(rate(draftedTop)*100)}% · ${Math.round(rate(draft)*100)}%`;
assert.equal(tile('Board vs draft order').value,draftedExpected);
const predraftPill=[...d.querySelectorAll('#lensPills button')].find(x=>x.textContent==='Pre-draft (no pick)');
assert(predraftPill);
predraftPill.click();
assert.equal(tile('Pre-draft vs draft order').value,expected);
assert(tile('Pre-draft vs draft order').sub.includes(`pre-draft top ${topN} vs first ${topN} eligible draft selections`));

// Restore the default scope before the search assertions below.
d.querySelector('#posPills button').click(); // ALL is the first pill
const allEligible=w.APEX.players.filter(p=>p.yr===2023&&valid(p));
const allTop=allEligible.slice().sort((a,b)=>b.qapex-a.qapex||a.pk-b.pk).slice(0,32);
const allDraft=allEligible.slice().sort((a,b)=>a.pk-b.pk).slice(0,32);
const allExpected=`${Math.round(rate(allTop)*100)}% · ${Math.round(rate(allDraft)*100)}%`;
assert.equal(tile('Pre-draft vs draft order').value,allExpected);
const allDraftedTop=allEligible.slice().sort((a,b)=>b.apex-a.apex||a.pk-b.pk).slice(0,32);
assert.notEqual(rate(allTop),rate(allDraftedTop),'fixture must distinguish lenses');
const draftedPill=[...d.querySelectorAll('#lensPills button')].find(x=>x.textContent==='As drafted');
assert(draftedPill);
draftedPill.click();
const search=d.querySelector('input[type="search"]');
search.value='Stroud';search.dispatchEvent(new w.Event('input',{bubbles:true}));
await new Promise(resolve=>w.setTimeout(resolve,160));
assert(d.querySelector('#boardBody').textContent.includes('Stroud'));
assert.equal(errors.length,0,errors.map(String).join('\n'));
dom.window.close();
console.log('PASS: full startup, all five tabs, keyboard wrap/Home/End, class switching and search');

})().catch(error=>{console.error(error);process.exitCode=1;});
