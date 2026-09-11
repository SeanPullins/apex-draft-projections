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
  const followup=script.getAttribute('src').startsWith('research-followup.js');
  const before=followup?JSON.stringify(w.APEX.players):null;
  w.eval(fs.readFileSync(path.join(root,script.getAttribute('src').split('?')[0]),'utf8'));
  if(followup)assert.equal(JSON.stringify(w.APEX.players),before,'Research must not mutate live scores');
}
assert(d.querySelector('#researchFollowup').textContent.includes('failed the release gate'));
assert.equal(w.APEX_RESEARCH_FOLLOWUP.v14.promotion.approved,false);
assert.equal(w.APEX_RESEARCH_FOLLOWUP.n,4765);
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
const search=d.querySelector('input[type="search"]');
search.value='Stroud';search.dispatchEvent(new w.Event('input',{bubbles:true}));
await new Promise(resolve=>w.setTimeout(resolve,160));
assert(d.querySelector('#boardBody').textContent.includes('Stroud'));
assert.equal(errors.length,0,errors.map(String).join('\n'));
dom.window.close();
console.log('PASS: full startup, all five tabs, keyboard wrap/Home/End, class switching and search');

})().catch(error=>{console.error(error);process.exitCode=1;});
