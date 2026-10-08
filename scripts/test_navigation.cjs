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
  assert(w.APEX_PFF_QB_2026,'PFF QB workbook data must load');
  assert.equal(w.APEX_PFF_QB_2026.rows.length,16);
  assert.equal(w.APEX_PFF_QB_2026.cohort,16);
  assert(w.APEX_PFF_QB_2026.rows.every(row => row.length===8 && row.slice(2).every(v=>Number.isInteger(v)&&v>=0&&v<=100)),'No raw charting values should ship');
  assert(w.APEX2026,'2026 live-detail payload must load');
  assert.equal(Object.keys(w.APEX2026.players).length,201);
  assert.equal(w.APEX2026.coverage.identified,199);
  assert.equal(w.APEX2026.coverage.liveScored,159);
  assert.notEqual(w.APEX2027.players.find(p=>p.r===19).a,'URGENT_DATA_GAP','Tae Johnson must use refreshed 2026 evidence');
  assert.equal(w.APEX2027.players.find(p=>p.r===70).a,'SCOUT_MORE','OJ Frederique should use refreshed 2026 evidence');
  assert(d.querySelector('link[rel="stylesheet"]').getAttribute('href').includes('?v=20261008-board1'));
  assert([...d.querySelectorAll('script[src]')].every(s=>/\?v=(?:20261007-(?:data7|pff5)|20261008-(?:board1|recover1|verify2))$/.test(s.getAttribute('src'))),'All JS assets must be cache-busted');
  const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
  assert(css.includes('.tab[data-tab="team"]{display:block!important}'),'Team Mode must remain visible on narrow phones');
  assert(css.includes('.tabs{order:3;width:100%;margin-left:0;display:grid'),'Mobile tabs must use a dedicated full-width row');
  assert.equal(w.APEX2026.muse_receipt.blocking_received,35);
  for(const rank of [8,9,26,38,45,46,63]){
    assert.equal(w.APEX2026.players[rank].muse_private_blocking_received,true,'Urgent OL has new licensed-source receipt');
  }
  for(const rank of [70,71,144,187]){
    assert.equal(w.APEX2026.players[rank].status,'OUT_INJURY_2026','Injury status corrected');
  }
  assert(!w.APEX2026.players[134].muse_private_blocking_received,'FCS OL should remain missing validated 2026 blocking source');
  assert(!w.APEX2026.players[187].muse_private_blocking_received,'Injured OL has no 2026 blocking source');
  assert(!JSON.stringify(w.APEX2026).includes('"pass_block_grade"'),'No licensed blocking grades may be serialized into public payload');
  d.querySelector('#boardBody tr[data-rank="8"]').click();
  assert(d.querySelector('#modal').textContent.includes('New 2026 blocking evidence received.'));
  d.querySelector('.modal-close').click();
  assert.equal(w.APEX2027.players.length,201);
  assert.equal(d.querySelector('#classSelect'),null,'historical class selector must stay hidden');
  assert.equal(d.querySelectorAll('#boardBody tr').length,201);
  assert(d.querySelector('#boardBody tr[data-rank="1"]').textContent.includes('823 receiving yards'),'Jeremiah Smith must have actual 2026 production on the board');
  assert(d.querySelector('#boardBody tr[data-rank="8"]').textContent.includes('individual blocking grade not published'),'OL must never get an invented blocking grade');
  assert(d.querySelector('#boardBody tr[data-rank="187"]').textContent.includes('2026'),'Injury or nonparticipation must remain distinguishable');
  assert(!d.querySelector('#boardBody').textContent.includes('New evidence · review'),'Do not put internal intake status on fan-facing cards');
  assert.equal(d.querySelectorAll('#boardTable th').length,6,'Simplified board has six meaningful columns');
  assert(d.querySelector('#boardTiles').textContent.includes('2026 production'));
  d.querySelector('#attentionSelect').value='season';
  d.querySelector('#attentionSelect').dispatchEvent(new w.Event('change'));
  assert([...d.querySelectorAll('#boardBody tr')].every(tr=>tr.querySelector('.statline-cell')),'2026 production rows render stat lines');
  d.querySelector('#attentionSelect').value='limited';
  d.querySelector('#attentionSelect').dispatchEvent(new w.Event('change'));
  assert([...d.querySelectorAll('#boardBody tr')].every(tr=>!tr.textContent.includes('823 receiving yards')),'Limited list excludes season-stats rows');
  d.querySelector('#attentionSelect').value='all';
  d.querySelector('#attentionSelect').dispatchEvent(new w.Event('change'));
  assert(d.body.textContent.includes('Know the prospects.'));
  assert(d.body.textContent.includes('See what matters.'));

  assert.equal(d.querySelectorAll('.column-help').length,6);
  const rankHelp=d.querySelector('.column-help[data-help="rank"]');
  assert(rankHelp,'Rank help button must exist');
  rankHelp.click();
  assert.equal(d.querySelector('#columnHelpSheet').hidden,false);
  assert.equal(d.querySelector('#columnHelpTitle').textContent,'Market rank');
  assert(d.querySelector('#columnHelpBody').textContent.includes('consensus order'));
  d.querySelector('[data-close-column-help]').click();
  assert.equal(d.querySelector('#columnHelpSheet').hidden,true);

  assert.equal(d.querySelectorAll('.war-card').length,4,'War Room must show four decision views');
  assert(d.querySelector('#warRoomGrid').textContent.includes('Possible risers'));
  assert(d.querySelector('#warRoomGrid').textContent.includes('Market cautions'));
  assert(d.querySelector('#warRoomGrid').textContent.includes('More uncertainty'));
  assert(d.querySelector('#warRoomGrid').textContent.includes('2026 at a glance'));
  assert(d.querySelectorAll('.war-item').length>=6,'War Room should surface multiple actionable prospects');

  const compareA=d.querySelector('#compareA'), compareB=d.querySelector('#compareB'), compareButton=d.querySelector('#compareButton');
  assert(compareA.options.length>200);
  compareA.value='1';compareA.dispatchEvent(new w.Event('change',{bubbles:true}));
  compareB.value='2';compareB.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(compareButton.disabled,false);
  compareButton.click();
  assert.equal(d.querySelector('#compareBackdrop').hidden,false);
  assert.equal(d.querySelectorAll('#compareModal .compare-prospect').length,2);
  assert(d.querySelector('#compareModal').textContent.includes('What the totals cannot tell you'));
  assert(d.querySelector('#compareModal').textContent.includes('No synthetic winner.'));
  d.querySelector('#compareModal .compare-close').click();
  assert.equal(d.querySelector('#compareBackdrop').hidden,true);

  function active(name){
    assert.equal(d.querySelectorAll('.tab-panel.is-active').length,1);
    assert.equal(d.querySelector('.tab-panel.is-active').id,'tab-'+name);
    assert.equal(d.querySelector('.tab[aria-selected="true"]').dataset.tab,name);
  }
  active('board');
  assert(d.querySelector('#openTeamMode'),'Homepage Team Mode launcher must exist');
  d.querySelector('#openTeamMode').click();
  active('team');
  d.querySelector('.tab[data-tab="board"]').click();
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
  const firstTeamRow=d.querySelector('#teamBoardBody tr');
  const equation=firstTeamRow.querySelector('.fit-equation').textContent;
  const nums=[...equation.matchAll(/\+(\d+)/g)].map(m=>Number(m[1]));
  const total=Number(equation.match(/=\s*(\d+)/)[1]);
  assert.equal(nums.length,4);
  assert.equal(nums.reduce((a,b)=>a+b,0),total,'Displayed Team Fit components must sum to Team Fit');
  assert(firstTeamRow.textContent.includes('Main drivers:'));
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
  assert(d.querySelector('#modal').textContent.includes('What these numbers cannot prove'));
  assert(d.querySelector('#modal').textContent.includes('Topology freshness'));
  assert(d.querySelector('#modal').textContent.includes('Relative QB charting'));
  assert(d.querySelector('#modal').textContent.includes('16 QBs'));
  assert(d.querySelector('#modal').textContent.includes('percentile'));
  assert(!d.querySelector('#modal').textContent.includes('80.4'),'Raw licensed PFF grade must not appear');
  assert(d.querySelector('#modal').textContent.includes('Ball security'));
  assert(d.querySelector('#modal').textContent.includes('2026 season'));
  assert(d.querySelector('#modal').textContent.includes('664'));
  assert(d.querySelector('#modal').textContent.includes('Pass yds'));

  d.querySelector('#modal .modal-close').click();
  assert.equal(d.querySelector('#modalBackdrop').hidden,true);

  // OL dossiers should show current roster/bio without inventing a public individual grade.
  search.value='Trevor Goosby';search.dispatchEvent(new w.Event('input',{bubbles:true}));
  await new Promise(resolve=>w.setTimeout(resolve,130));
  assert.equal(d.querySelectorAll('#boardBody tr').length,1);
  d.querySelector('#boardBody tr').click();
  assert(d.querySelector('#modal').textContent.includes('New 2026 blocking evidence received.'));
  assert(d.querySelector('#modal').textContent.includes('Private licensed source records are under validation'));
  assert(d.querySelector('#modal').textContent.includes('6′7″'));
  assert(d.querySelector('#modal').textContent.includes('325 lb'));
  d.querySelector('#modal .modal-close').click();

  const deepPick=d.querySelector('#teamPicks');
  d.querySelector('.tab[data-tab="team"]').click();
  deepPick.value='205, 250';deepPick.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(d.querySelectorAll('.pick-card').length,2);
  assert(d.querySelector('#pickPlanGrid').textContent.includes('Limited late-round coverage'));
  assert(d.querySelector('#pickPlanGrid').textContent.includes('No supported candidates at this pick yet.'));
  assert(d.querySelector('#tab-team').textContent.includes('does not automatically load'));
  d.querySelector('.tab[data-tab="board"]').click();

  d.querySelector('#plainEnglishButton').click();
  assert.equal(d.querySelector('#plainEnglishSheet').hidden,false);
  assert(d.querySelector('#plainEnglishSheet').textContent.includes('Market caution'));

  assert.equal(errors.length,0,errors.map(String).join('\n'));
  dom.window.close();
  console.log('PASS: 2027 board, filters, search, dossiers, tabs and historical-board hiding');
})().catch(error=>{console.error(error);process.exitCode=1;});
