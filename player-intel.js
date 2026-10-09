/* APEX Player DNA v3 — full 201 prospect index + clear evidence-first profile.
 * No changes to models, rankings, or private source payloads. */
(function(){
  "use strict";
  const D=window.APEX2027, Stories=window.APEX_STORIES;
  const live=(window.APEX2026&&window.APEX2026.players)||{};
  const root=document.getElementById("playerDNAApp"),lab=document.getElementById("modelLabApp");
  if(!D||!Array.isArray(D.players)||!Stories||!root||!lab)return;
  const players=D.players.slice().sort((a,b)=>a.r-b.r);
  const byRank=new Map(players.map(p=>[p.r,p]));
  const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const norm=v=>String(v||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const safeUrl=v=>/^https:\/\/[a-z0-9.-]+\/[^"'<>]*$/i.test(String(v||""))?v:null;
  const state={rank:players[0].r,position:"ALL",query:"",view:"browse"};
  const positions=["ALL",...Array.from(new Set(players.map(p=>p.p))).sort()];
  const titleByPos={QB:"Quarterbacks",RB:"Running backs",WR:"Wide receivers",TE:"Tight ends",OL:"Offensive line",ED:"Edge",DT:"Defensive line",LB:"Linebackers",CB:"Cornerbacks",S:"Safeties"};
  const take=p=>({
    HOLD_PRIOR:"Aligned with consensus",
    EXECUTIVE_REVIEW_UP:"Upside worth reviewing",
    SLEEPER_DISCOVERY:"Sleeper watch",
    EXECUTIVE_REVIEW_DOWN:"More cautious than consensus",
    DATA_GAP:"Need more evidence",
    URGENT_DATA_GAP:"Need more evidence",
    SCOUT_MORE:"Need more evidence"
  })[p.a]||"Research in progress";
  const label=p=>p.p==="OL"?"OL data limited":Stories.profile(p).kind==="season"?"2026 stats":Stories.profile(p).kind==="limited"?"Limited activity":"Needs context";
  const statsFor=p=>Stories.profile(p).kind==="season"?Stories.stats(p).filter(x=>typeof x.value==="number"&&Number.isFinite(x.value)).slice(0,4):[];
  function available(p){
    const info=Stories.profile(p);
    return {l:live[p.r],info,stats:statsFor(p),research:info.research||null,trend:take(p)};
  }
  function matches(){
    const q=norm(state.query);
    return players.filter(p=>(state.position==="ALL"||p.p===state.position)&&
      (!q||norm([p.n,p.s,p.p,p.r].join(" ")).includes(q)||
       [p.n,p.s,p.p,String(p.r)].some(x=>norm(x).includes(q))));
  }
  function drawDirectory(){
    const rows=matches(),host=document.getElementById("intelDirectory");
    const count=rows.length;
    document.getElementById("intelCount").textContent=count+" prospect"+(count===1?"":"s");
    document.getElementById("intelShown").textContent=count+" of "+players.length+" shown";
    host.innerHTML=rows.length?rows.map(p=>{
      const selected=p.r===state.rank;
      return '<button class="dna-result'+(selected?' is-selected':'')+'" type="button" data-intel-rank="'+p.r+'" aria-pressed="'+selected+'">' +
        '<span class="dna-result-rank">'+p.r+'</span>'+
        '<span class="dna-result-name"><strong>'+esc(p.n)+'</strong><small>'+esc(p.s)+' <span aria-hidden="true">·</span> '+esc(p.p)+'</small></span>'+
        '<span class="dna-result-state">'+esc(label(p))+'</span>'+
        '<span class="dna-result-arrow" aria-hidden="true">›</span></button>';
    }).join(""):'<p class="dna-empty">No players match. Try a different school, name, or position.</p>';
  }
  function statText(n){return typeof n==="number"&&Number.isFinite(n)?n.toLocaleString("en-US",{maximumFractionDigits:1}):"—"}
  function evidenceCard(eyebrow,headline,detail,status,extra=""){
    return '<article class="dna-evidence-card"><div class="dna-evidence-meta"><span>'+esc(eyebrow)+'</span><span class="dna-evidence-status">'+esc(status)+'</span></div>'+
      '<strong>'+esc(headline)+'</strong><p>'+esc(detail)+'</p>'+extra+'</article>';
  }
  function drawProfile(){
    const p=byRank.get(state.rank);if(!p)return;
    const d=available(p),info=d.info,stat=d.stats,c=d.research;
    const enough=stat.length>0;
    const production=enough?stat.slice(0,3).map(x=>statText(x.value)+" "+x.label).join(" · "):
      p.p==="OL"?"No individual blocking grade from box scores":"No usable individual 2026 stat line";
    const next=info.context||"What is missing from this player's available college evidence?";
    const extra=c&&info.contextVerified&&safeUrl(info.sourceUrl)?
      '<a class="dna-source" href="'+esc(info.sourceUrl)+'" target="_blank" rel="noopener noreferrer">See source ↗</a>':"";
    const researchLine=c?.detail||"We have not verified a separate player-specific role or development claim.";
    const researchStatus=c?info.contextVerified?"Source checked":"Needs independent check":"Not available";
    const contextStatus=p.ta==="GREEN"?"More stable":p.ta==="AMBER"?"Some uncertainty":p.ta==="RED"?"Higher uncertainty":"Not evaluated";
    const contextDetail=p.ta?"Older offensive context-stability assessment; not a talent grade.":"No comparable historical context-stability measure for this position.";
    const pg=typeof d.l?.gp==="number"?d.l.gp+" recorded-stat games":"Recorded-game count unavailable";
    const index=players.findIndex(x=>x.r===p.r);
    document.getElementById("intelProfile").innerHTML=
      '<div class="dna-profile-nav"><button id="dnaBack" type="button">← All prospects</button>'+
        '<div class="dna-step"><button id="dnaPrev" type="button" '+(index===0?'disabled':'')+' aria-label="Previous prospect">←</button>'+
        '<span>'+ (index+1)+' / '+players.length+'</span>'+
        '<button id="dnaNext" type="button" '+(index===players.length-1?'disabled':'')+' aria-label="Next prospect">→</button></div></div>'+
      '<div class="dna-identity"><div><span class="dna-kicker">2027 DRAFT / CONSENSUS #'+p.r+'</span>'+
      '<h2 id="dnaPlayerName">'+esc(p.n)+'</h2><p>'+esc(p.s)+' <span aria-hidden="true">·</span> '+esc(p.p)+'</p></div>'+
      '<span class="dna-profile-position">'+esc(p.p)+'</span></div>'+
      '<div class="dna-verdict"><div><span>THE APEX READ</span><strong>'+esc(d.trend)+'</strong>'+
      '<p>'+esc(info.interpretation)+'</p></div>'+
      '<span class="dna-verdict-note">Research view · not an NFL success probability</span></div>'+
      '<div class="dna-quickfacts">'+
        '<div><span>MARKET RANK</span><strong>#'+p.r+'</strong><small>Consensus, not an APEX talent grade</small></div>'+
        '<div><span>2026 PRODUCTION</span><strong>'+esc(enough?"Recorded":p.p==="OL"?"Unmeasured":"Limited")+'</strong><small>'+esc(pg)+'</small></div>'+
        '<div><span>CONTEXT STABILITY</span><strong>'+esc(contextStatus)+'</strong><small>'+esc(contextDetail)+'</small></div></div>'+
      '<div class="dna-section-title"><span>01 / FACT CHECK</span><h3>What do we actually know?</h3></div>'+
      '<div class="dna-evidence-grid">'+
        evidenceCard("ON THE FIELD",production,enough?pg+" · ESPN-derived Oct. 7 public summary":info.status,enough?"Recorded":"Incomplete")+
        evidenceCard("ROLE & BACKGROUND",researchLine,c?"Verification applies only to this individual dated fact.":"No evidence is not a negative grade.",researchStatus,extra)+
      '</div>'+
      '<div class="dna-question"><div><span>02 / THE QUESTION</span><h3>What still needs to be proved?</h3><p>'+esc(next)+'</p>'+
        '<small>Scouting question, not a diagnosed weakness.</small></div></div>'+
      '<details class="dna-expand" id="dnaMoreResearch"><summary><span>03 / GO DEEPER</span><strong>Historical comparisons & development</strong><span class="dna-expand-icon" aria-hidden="true">+</span></summary>'+
        '<p class="dna-expand-intro">Position peers and size-only comparisons are context, not look-alike career forecasts. This section has more detailed source limitations.</p><div id="intelDevelopment"></div></details>'+
      '<div class="dna-actions"><button id="intelDossier" class="dna-button dna-primary" type="button">Open full dossier →</button>'+
      '<button id="intelAdvisor" class="dna-button" type="button">Explore Draft Advisor →</button></div>'+
      '<p class="dna-bottom-note"><strong>Source boundary:</strong> 2026 public statistics reflect an ESPN-derived Oct. 7 snapshot. The independently replayed private CFBD Week 5 dataset and historical NFL experiments are not published as new player grades. Missing is not poor performance.</p>';
    window.APEX_DEVELOP?.render(p);
    document.getElementById("dnaBack").addEventListener("click",()=>{state.view="browse";root.dataset.view="browse";document.getElementById("intelSearch").focus()});
    document.getElementById("dnaPrev").addEventListener("click",()=>{if(index>0)select(players[index-1].r)});
    document.getElementById("dnaNext").addEventListener("click",()=>{if(index<players.length-1)select(players[index+1].r)});
    document.getElementById("intelDossier").addEventListener("click",()=>{
      window.dispatchEvent(new CustomEvent("apex:open-dossier",{detail:{rank:p.r}}));
    });
    document.getElementById("intelAdvisor").addEventListener("click",()=>{
      document.querySelector('[data-tab="lab"]').click();
      window.dispatchEvent(new CustomEvent("apex:focus-lab-player",{detail:{rank:p.r}}));
    });
  }
  function select(rank){
    rank=Number(rank);if(!byRank.has(rank))return;
    state.rank=rank;
    state.view="profile";root.dataset.view="profile";
    drawDirectory();drawProfile();
    const a=document.getElementById("intelAnnouncement");
    if(a)a.textContent="Selected "+byRank.get(rank).n+" ("+rank+" of "+players.length+")";
  }
  const withStat=players.filter(p=>statsFor(p).length>0).length;
  root.className="dna-v3";
  root.dataset.view="browse";
  root.innerHTML=
    '<header class="dna-header"><div><span class="dna-kicker">APEX SCOUTING / 2027</span>'+
      '<h1>The player comes first.</h1><p>Explore every prospect. Clear evidence, real context, no mystery scores.</p></div>'+
      '<div class="dna-header-count"><strong>'+players.length+'</strong><span>prospects on the board</span><small>'+withStat+' with position stats in the public snapshot</small></div></header>'+
    '<div class="dna-browser"><aside class="dna-list" aria-label="All 2027 prospects"><div class="dna-directory-head">'+
      '<div><strong>Find your player</strong><span id="intelShown">'+players.length+' of '+players.length+' shown</span></div>'+
      '<small id="intelCount">'+players.length+' prospects</small></div>'+
      '<label class="dna-search"><span class="dna-sr">Search every 2027 prospect</span><input id="intelSearch" type="search" placeholder="Search name, team, rank..." autocomplete="off" aria-label="Search every prospect"></label>'+
      '<label class="dna-position"><span>POSITION</span><select id="intelPosition" aria-label="Filter by position">'+positions.map(x=>
        '<option value="'+esc(x)+'">'+esc(x==="ALL"?"All positions":titleByPos[x]||x)+'</option>').join("")+'</select></label>'+
      '<div class="dna-list-help">All '+players.length+' prospects are listed below. Scroll or search to find anyone.</div>'+
      '<div id="intelDirectory" class="dna-all-players" aria-label="Complete prospect directory"></div></aside>'+
      '<section id="intelProfile" class="dna-profile" aria-label="Selected prospect"></section></div>'+
    '<div id="intelAnnouncement" class="dna-sr" aria-live="polite"></div>';
  root.addEventListener("click",event=>{
    const button=event.target.closest("[data-intel-rank]");
    if(button)select(button.dataset.intelRank);
  });
  document.getElementById("intelSearch").addEventListener("input",event=>{
    state.query=event.target.value;drawDirectory();
  });
  document.getElementById("intelPosition").addEventListener("change",event=>{
    state.position=event.target.value;drawDirectory();
  });
  window.addEventListener("apex:focus-dna-player",event=>{
    const rank=Number(event?.detail?.rank);
    if(byRank.has(rank)){
      state.position="ALL";state.query="";
      document.getElementById("intelPosition").value="ALL";
      document.getElementById("intelSearch").value="";
      select(rank);
    }
  });
  drawDirectory();drawProfile();

  const outcomes=[
    {id:"role",name:"Earns an NFL role",desc:"At least one season with 25%+ offensive or defensive snap share in the first four NFL seasons.",scores:[0.22772,0.21905,0.21345,0.21919]},
    {id:"sustained",name:"Sustains a role",desc:"At least three seasons meeting the 25% workload definition.",scores:[0.23469,0.22993,0.22347,0.22499]},
    {id:"high",name:"High workload",desc:"Two seasons meeting the locked position-relative starter-equivalent workload definition.",scores:[0.22284,0.21437,0.20947,0.21416]}
  ];
  const models=[
    {name:"Position-only baseline",kind:"Benchmark",accent:"baseline"},
    {name:"X9 age + athletic",kind:"Earlier experiment",accent:"past"},
    {name:"X10 age + athletic",kind:"Lowest observed Brier",accent:"best"},
    {name:"X10 athletic + college",kind:"College-feature experiment",accent:"college"}
  ];
  lab.innerHTML=
    '<section class="intel-lab-head"><div><span class="intel-overline">APEX / MODEL LAB</span>'+
    '<h1>Show the results.<br><em>Not just the promises.</em></h1>'+
    '<p>We backtest historical forecasts against real NFL participation. Here’s what improved, what failed, and what is still unproven.</p></div>'+
    '<div class="intel-lab-state"><strong>Research only</strong><span>No live 2027 NFL probabilities were changed</span></div></section>'+
    '<div class="intel-lab-statrow"><article><strong>1,010</strong><span>Drafted players tested</span></article>'+
      '<article><strong>2019–2022</strong><span>Four chronological test classes</span></article>'+
      '<article><strong>4 years</strong><span>Workload outcome window</span></article></div>'+
    '<section class="intel-lab-experiment"><div class="intel-lab-section-top"><div><span class="intel-label">01 / EXPERIMENT RESULTS</span>'+
      '<h2>Which approach forecasts NFL playing time best?</h2></div>'+
      '<label>Choose the outcome<select id="intelOutcome">'+outcomes.map(o=>'<option value="'+o.id+'">'+esc(o.name)+'</option>').join("")+'</select></label></div>'+
      '<p id="intelOutcomeHelp" class="intel-lab-context"></p>'+
      '<div id="intelBrierRows" class="intel-brier-rows" aria-live="polite"></div>'+
      '<div id="intelExperimentConclusion" class="intel-lab-bottom"></div>'+
    '</section>'+
    '<div class="intel-lab-lessons"><article><span class="intel-label">02 / THE FINDING</span><h3>Athletic inputs look promising.</h3>'+
      '<p>The more strongly regularized X10 athletic model had lower Brier scores on these historical classes. That’s a useful research signal—not a new forecast for the 2027 board.</p></article>'+
      '<article><span class="intel-label">03 / THE PROBLEM</span><h3>Raw college stats can mislead.</h3>'+
      '<p>The X9 raw-college model was substantially worse than the baseline. Better X10 feature handling helped, but it still did not beat athletic-only on pooled Brier.</p></article>'+
      '<article><span class="intel-label">04 / THE STANDARD</span><h3>We need a truly new test.</h3>'+
      '<p>X10 reused draft classes examined during X9. That makes these improvements exploratory until a genuinely untouched cohort confirms them.</p></article></div>'+
    '<details class="intel-lab-method"><summary>What do these scores mean? <span>Expand the methodology ↓</span></summary>'+
      '<p><strong>Brier score:</strong> the average squared distance between a predicted probability and what actually happened. Lower is better. A good historical score does not make every individual forecast reliable.</p>'+
      '<p><strong>Chronological testing:</strong> each 2019–2022 test draft only used training classes at most test year minus four, so four-year NFL outcomes were observable before evaluation.</p>'+
      '<p><strong>Important limitations:</strong> the cohort includes drafted players, not all undrafted prospects; college data have missing years and some name-based historical joins; the X10 experiment follows a review of X9 results on the same years. These outcomes measure snaps, not Pro Football Reference Approximate Value or official starts.</p>'+
      '<p><strong>What ships today:</strong> existing 2027 market-relative evidence and context explanations. No X9/X10 probabilities, new talent grades, or automated changes to current player order.</p></details>';
  function drawExperiment(id){
    const o=outcomes.find(x=>x.id===id)||outcomes[0],best=Math.min(...o.scores);
    document.getElementById("intelOutcomeHelp").textContent=o.desc+" Lower Brier score is better.";
    document.getElementById("intelBrierRows").innerHTML=models.map((m,i)=>{
      const score=o.scores[i],pct=Math.min(100,100*score/.3);
      return '<div class="intel-brier-row '+m.accent+'"><div class="intel-brier-name"><strong>'+esc(m.name)+'</strong><span>'+esc(m.kind)+'</span></div>'+
        '<div class="intel-brier-bar" role="img" aria-label="'+esc(m.name)+': Brier '+score.toFixed(4)+'"><i style="width:'+pct.toFixed(1)+'%"></i></div>'+
        '<strong class="intel-brier-score">'+score.toFixed(4)+'</strong></div>';
    }).join("")+'<div class="intel-brier-scale"><span>0 (best)</span><span>0.30</span></div>';
    const delta=o.scores[0]-best;
    document.getElementById("intelExperimentConclusion").innerHTML=
      '<div><strong>'+delta.toFixed(4)+'</strong><span>Observed Brier reduction versus position-only</span></div>'+
      '<p>The lowest score here is exploratory, not evidence of a deployed accuracy gain. We have already inspected these test years, so they are not an untouched confirmation.</p>';
  }
  document.getElementById("intelOutcome").addEventListener("change",event=>drawExperiment(event.target.value));
  drawExperiment("role");
  window.APEX_INTEL={select,available,drawExperiment};
})();