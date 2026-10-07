const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');

(async()=>{
  const root=path.resolve(__dirname,'..');
  const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{
    url:'https://example.test/#board',runScripts:'outside-only',pretendToBeVisual:true
  });
  const w=dom.window,d=w.document,errors=[];
  w.addEventListener('error',e=>errors.push(e.error||e.message));
  w.matchMedia=()=>({matches:false,addEventListener(){}});
  w.scrollTo=()=>{};

  for(const script of d.querySelectorAll('script[src]')){
    w.eval(fs.readFileSync(path.join(root,script.getAttribute('src').split('?')[0]),'utf8'));
  }

  assert(w.APEX2027,'2027 payload must load');
  const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
  assert(css.includes('.tab[data-tab="team"]{display:block!important}'),'Team Mode must remain visible on narrow phones');
  assert(css.includes('.tabs{order:3;width:100%;margin-left:0;display:grid'),'Mobile tabs must use a dedicated full-width row');
  assert.equal(w.APEX2027.players.length,201);
  assert.equal(d.querySelector('#classSelect'),null,'historical class selector must stay hidden');
  assert.equal(d.querySelectorAll('#boardBody tr').length,201);
  assert(d.body.textContent.includes('Know the player.'));
  assert(d.body.textContent.includes('Know the uncertainty.'));

  assert.equal(d.querySelectorAll('.column-help').length,6);
  const rankHelp=d.querySelector('.column-help[data-help="rank"]');
  assert(rankHelp,'Rank help button must exist');
  rankHelp.click();
  assert.equal(d.querySelector('#columnHelpSheet').hidden,false);
  assert.equal(d.querySelector('#columnHelpTitle').textContent,'Rank');
  assert(d.querySelector('#columnHelpBody').textContent.includes('consensus 2027 draft-board rank'));
  d.querySelector('[data-close-column-help]').click();
  assert.equal(d.querySelector('#columnHelpSheet').hidden,true);

  assert.equal(d.querySelectorAll('.war-card').length,4,'War Room must show four decision views');
  assert(d.querySelector('#warRoomGrid').textContent.includes('Review up'));
  assert(d.querySelector('#warRoomGrid').textContent.includes('Review down'));
  assert(d.querySelector('#warRoomGrid').textContent.includes('Biggest uncertainty'));
  assert(d.querySelector('#warRoomGrid').textContent.includes('Scout first'));
  assert(d.querySelectorAll('.war-item').length>=6,'War Room should surface multiple actionable prospects');

  const compareA=d.querySelector('#compareA'), compareB=d.querySelector('#compareB'), compareButton=d.querySelector('#compareButton');
  assert(compareA.options.length>200);
  compareA.value='1';compareA.dispatchEvent(new w.Event('change',{bubbles:true}));
  compareB.value='2';compareB.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(compareButton.disabled,false);
  compareButton.click();
  assert.equal(d.querySelector('#compareBackdrop').hidden,false);
  assert.equal(d.querySelectorAll('#compareModal .compare-prospect').length,2);
  assert(d.querySelector('#compareModal').textContent.includes('What would change our mind?'));
  assert(d.querySelector('#compareModal').textContent.includes('No synthetic winner.'));
  d.querySelector('#compareModal .compare-close').click();
  assert.equal(d.querySelector('#compareBackdrop').hidden,true);

  function active(name){
    assert.equal(d.querySelectorAll('.tab-panel.is-active').length,1);
    assert.equal(d.querySelector('.tab-panel.is-active').id,'tab-'+name);
    assert.equal(d.querySelector('.tab[aria-selected="true"]').dataset.tab,name);
  }
  active('board');
  for(const b of d.querySelectorAll('.tab')){b.click();active(b.dataset.tab);}
  d.querySelector('.tab[data-tab="board"]').click();

  // Team Mode is a downstream decision layer; changing settings must not mutate prospect data.
  const originalRank=w.APEX2027.players[0].r;
  const originalTake=w.APEX2027.players[0].a;
  d.querySelector('.tab[data-tab="team"]').click();
  active('team');
  const teamSelect=d.querySelector('#teamSelect');
  teamSelect.value='Cleveland Browns';teamSelect.dispatchEvent(new w.Event('change',{bubbles:true}));
  const picks=d.querySelector('#teamPicks');
  picks.value='12, 44';picks.dispatchEvent(new w.Event('input',{bubbles:true}));
  const qbNeed=[...d.querySelectorAll('.team-need')].find(x=>x.textContent==='QB');
  assert(qbNeed,'QB need pill must exist');qbNeed.click();
  assert.equal(d.querySelectorAll('.pick-card').length,2);
  assert(d.querySelector('#teamSummary').textContent.includes('Cleveland Browns'));
  assert(d.querySelector('#teamSummary').textContent.includes('#12'));
  assert(d.querySelector('#teamSummary').textContent.includes('QB'));
  assert.equal(d.querySelectorAll('#teamBoardBody tr').length,24);
  assert(d.querySelector('#teamBoardBody').textContent.includes('Team Fit')===false);
  assert([...d.querySelectorAll('#teamBoardBody .team-fit-score')].every(x=>Number(x.textContent)>=0 && Number(x.textContent)<=100));
  d.querySelector('#teamFormulaButton').click();
  assert.equal(d.querySelector('#teamFormulaSheet').hidden,false);
  assert(d.querySelector('#teamFormulaSheet').textContent.includes('not an APEX talent score'));
  d.querySelector('[data-close-team-formula]').click();
  assert.equal(d.querySelector('#teamFormulaSheet').hidden,true);
  assert.equal(w.APEX2027.players[0].r,originalRank);
  assert.equal(w.APEX2027.players[0].a,originalTake);
  d.querySelector('.tab[data-tab="board"]').click();
  active('board');

  const qb=[...d.querySelectorAll('#posPills button')].find(x=>x.textContent==='QB');
  assert(qb,'QB position pill must exist');
  qb.click();
  assert.equal(d.querySelectorAll('#boardBody tr').length,17);

  const show=d.querySelector('#attentionSelect');
  show.value='red';show.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert([...d.querySelectorAll('#boardBody tr')].every(r=>r.textContent.includes('RED')));

  show.value='all';show.dispatchEvent(new w.Event('change',{bubbles:true}));
  const all=[...d.querySelectorAll('#posPills button')].find(x=>x.textContent==='ALL');
  all.click();

  const search=d.querySelector('#searchBox');
  search.value='Arch Manning';search.dispatchEvent(new w.Event('input',{bubbles:true}));
  await new Promise(resolve=>w.setTimeout(resolve,130));
  assert.equal(d.querySelectorAll('#boardBody tr').length,1);
  assert(d.querySelector('#boardBody').textContent.includes('Arch Manning'));

  d.querySelector('#boardBody tr').click();
  assert.equal(d.querySelector('#modalBackdrop').hidden,false);
  assert(d.querySelector('#modal').textContent.includes('What would change our mind?'));
  assert(d.querySelector('#modal').textContent.includes('Topology freshness'));

  d.querySelector('#modal .modal-close').click();
  assert.equal(d.querySelector('#modalBackdrop').hidden,true);

  d.querySelector('#plainEnglishButton').click();
  assert.equal(d.querySelector('#plainEnglishSheet').hidden,false);
  assert(d.querySelector('#plainEnglishSheet').textContent.includes('Review down'));

  assert.equal(errors.length,0,errors.map(String).join('\n'));
  dom.window.close();
  console.log('PASS: 2027 board, filters, search, dossiers, tabs and historical-board hiding');
})().catch(error=>{console.error(error);process.exitCode=1;});
