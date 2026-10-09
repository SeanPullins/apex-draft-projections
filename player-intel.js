/* APEX Player DNA + Model Lab — explanatory UI only, no new predictions. */
(function () {
  "use strict";
  const data=window.APEX2027, stories=window.APEX_STORIES, current=(window.APEX2026||{}).players||{};
  const root=document.getElementById("playerDNAApp"), lab=document.getElementById("modelLabApp");
  if(!data||!Array.isArray(data.players)||!stories||!root||!lab)return;
  const players=data.players.slice().sort((a,b)=>a.r-b.r);
  const byRank=new Map(players.map(p=>[p.r,p]));
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const cleanURL=v=>/^https:\/\/[a-z0-9.-]+\//i.test(String(v||""))?v:null;
  const titleCase=v=>String(v||"").toLowerCase().replace(/(^|\s)\S/g,x=>x.toUpperCase());
  const state={rank:players[0].r,pos:"ALL",query:"",limit:12};
  const positions=["ALL",...new Set(players.map(p=>p.p))].sort((a,b)=>a==="ALL"?-1:b==="ALL"?1:a.localeCompare(b));
  function panel(label,value,detail,kind=""){
    return '<article class="intel-evidence '+kind+'"><span class="intel-evidence-label">'+esc(label)+'</span><strong>'+esc(value)+'</strong><p>'+esc(detail)+'</p></article>';
  }
  function usableStats(p){
    const info=stories.profile(p);
    return info.kind==="season" ? stories.stats(p).filter(x=>typeof x.value==="number"&&Number.isFinite(x.value)).slice(0,4):[];
  }
  function available(p){
    const l=current[p.r],info=stories.profile(p);
    return {
      l,info,stats:usableStats(p),
      research:info.research||null,
      source:info.contextVerified?"Corroborated dated fact":info.research?"Research on file":"No independent role receipt",
      trend:p.a==="EXECUTIVE_REVIEW_UP"?"Possible upside vs consensus":
        p.a==="SLEEPER_DISCOVERY"?"Sleeper watch":
        p.a==="EXECUTIVE_REVIEW_DOWN"?"More cautious than consensus":
        p.a==="HOLD_PRIOR"?"In line with consensus":"Still needs evidence"
    };
  }
  function list(){
    const q=state.query.toLowerCase().trim();
    return players.filter(p=>(state.pos==="ALL"||p.p===state.pos) &&
      (!q||[p.n,p.s,p.p,String(p.r)].some(v=>String(v).toLowerCase().includes(q))));
  }
  function drawDirectory(){
    const options=list(),host=document.getElementById("intelDirectory");
    if(!host)return;
    document.getElementById("intelCount").textContent=options.length+" prospects";
    if(!options.length){host.innerHTML='<div class="intel-empty">No matches. Try another name, school, or position.</div>';return;}
    host.innerHTML=options.slice(0,state.limit).map(p=>{
      const note=stories.profile(p),active=p.r===state.rank;
      return '<button class="intel-player-row'+(active?' is-selected':'')+'" type="button" data-intel-rank="'+p.r+'" aria-pressed="'+active+'">' +
        '<span class="intel-list-rank">'+p.r+'</span><span class="intel-list-person"><strong>'+esc(p.n)+'</strong><small>'+esc(p.s)+' · '+esc(p.p)+'</small></span>'+
        '<span class="intel-list-indicator">'+(note.kind==="season"?"Stats":"Review")+'</span></button>';
    }).join("");
    document.getElementById("intelMore").hidden=options.length<=state.limit;
    const chosen=host.querySelector(".is-selected");
    if(chosen)chosen.setAttribute("aria-current","true");
  }
  function drawProfile(){
    const p=byRank.get(state.rank);if(!p)return;
    const e=available(p),l=e.l,info=e.info,c=e.research;
    const hasStats=e.stats.length>0;
    const numberText=hasStats?e.stats.map(x=>Number(x.value).toLocaleString("en-US")+" "+x.label).join(" · "):"No individual box-score production supported";
    const contextLine=c?.detail||"No corroborated player-specific role or historical source is on file.";
    const sourceLink=info.contextVerified&&cleanURL(info.sourceUrl)?
      '<a class="intel-source-link" href="'+esc(info.sourceUrl)+'" target="_blank" rel="noopener noreferrer">View original source ↗</a>':"";
    const next=info.context||"Which NFL-relevant skills are not captured by college box scores?";
    const opinion=info.interpretation;
    const stable=p.ta ? p.ta==="GREEN"?"Relatively stable":p.ta==="AMBER"?"Some uncertainty":"More uncertainty":"Not assessed";
    const stableHelp=p.ta ?
      "Historical offensive context stability through 2025. Not a player talent grade.":
      "APEX has no validated context-stability measure for this position.";
    const stage=l?.gp!=null?l.gp+" recorded box-score games":"Game count unconfirmed";
    document.getElementById("intelProfile").innerHTML=
      '<div class="intel-profile-banner"><div><span class="intel-label">PLAYER DNA / MARKET #'+p.r+'</span>'+
      '<h2 id="dnaPlayerName">'+esc(p.n)+'</h2><p>'+esc(p.p)+' · '+esc(p.s)+'</p></div>'+
      '<div class="intel-take"><span>Current APEX view</span><strong>'+esc(e.trend)+'</strong><small>Frozen research action, not an NFL success probability</small></div></div>'+
      '<div class="intel-kpis">'+
        panel("2027 market rank","#"+p.r,"Consensus order, not a new APEX talent score.")+
        panel("Context stability",stable,stableHelp)+
        panel("2026 public snapshot",info.kind==="season"?"Stats on file":info.kind==="ol"?"OL box score limited":"Limited evidence",
            "October 7 ESPN-derived summary; not the privately verified CFBD research archive.")+
      '</div>'+
      '<section class="intel-insight"><div class="intel-section-head"><span>01 / THE READ</span><h3>What APEX sees so far</h3></div>'+
        '<p class="intel-big-copy">'+esc(opinion)+'</p>'+
        '<div class="intel-disclosure">A market-relative view is not a prediction of NFL success. APEX has not deployed the X9/X10 workload models.</div>'+
      '</section>'+
      '<section class="intel-sources"><div class="intel-section-head"><span>02 / THE EVIDENCE</span><h3>Follow the facts, not just a grade</h3></div>'+
        '<div class="intel-source-grid">'+
          '<article class="intel-source-tile"><div class="intel-source-top"><span class="intel-source-pill '+(hasStats?'has-evidence':'')+'">'+(hasStats?'Recorded':'Limited')+'</span><span>2026 production</span></div>'+
            '<strong>'+esc(hasStats?numberText:"No reliable individual stat line")+'</strong>'+
            '<p>'+esc(hasStats?stage+" · "+info.status:info.kind==="ol"?"Individual OL blocking grades are not supplied by public box scores.":info.status)+'</p>'+
            '<small>Source: public ESPN-derived Oct. 7 snapshot; descriptive statistics only</small></article>'+
          '<article class="intel-source-tile"><div class="intel-source-top"><span class="intel-source-pill '+(info.contextVerified?'has-evidence':'')+'">'+esc(info.contextVerified?"Source checked":c?"Research filed":"Not recorded")+'</span><span>Role & background</span></div>'+
            '<strong>'+esc(contextLine)+'</strong><p>'+esc(c?(info.contextVerified?"Verified only for this dated fact; not a complete scouting grade.":"Research summary has not been independently checked."):"No player-specific official role evidence available yet.")+'</p>'+sourceLink+'</article>'+
          '<article class="intel-source-tile"><div class="intel-source-top"><span class="intel-source-pill">Evaluation gap</span><span>NFL translation</span></div>'+
            '<strong>What the numbers cannot answer</strong><p>'+esc(next)+'</p><small>No inferred PFF grades, fake film ratings, or made-up probabilities.</small></article>'+
        '</div></section>'+
      '<div id="intelDevelopment"></div>'+
      '<section class="intel-next"><div><span class="intel-label">06 / NEXT SCOUTING QUESTION</span><h3>What would change the assessment?</h3>'+
        '<p>'+esc(next)+'</p><small>Position-specific research question; not an identified weakness or a guaranteed score change.</small></div>'+
        '<div class="intel-profile-actions"><button type="button" class="intel-action primary" id="intelDossier">Full player dossier ↗</button>'+
          '<button type="button" class="intel-action" id="intelAdvisor">View in Draft Advisor →</button></div></section>'+
      '<div class="intel-freshness"><strong>Know the data boundary.</strong> Public box scores: Oct. 7, 2026 secondary snapshot. Context receipts: through Oct. 8, 2026. Licensed 2026 CFBD and historical model experiments are being researched privately and are not represented as current live player probabilities.</div>';
    window.APEX_DEVELOP?.render(p);
    document.getElementById("intelDossier").addEventListener("click",()=>{
      window.dispatchEvent(new CustomEvent("apex:open-dossier",{detail:{rank:p.r}}));
    });
    document.getElementById("intelAdvisor").addEventListener("click",()=>{
      document.querySelector('[data-tab="lab"]').click();
      window.dispatchEvent(new CustomEvent("apex:focus-lab-player",{detail:{rank:p.r}}));
    });
  }
  function select(rank){
    if(!byRank.has(Number(rank)))return;
    state.rank=Number(rank);
    drawDirectory();drawProfile();
    const announce=document.getElementById("intelAnnouncement");
    if(announce)announce.textContent="Showing Player DNA for "+byRank.get(state.rank).n;
  }
  root.innerHTML=
    '<div class="intel-hero"><div><span class="intel-overline">APEX / 2027 SCOUTING INTELLIGENCE</span>'+
    '<h1>Don’t just see a ranking.<br><em>Understand the player.</em></h1>'+
    '<p>Every prospect has a story. Explore the evidence behind the current APEX view, see where it comes from, and learn what we still need to know.</p>'+
    '<div class="intel-hero-chips"><span>201 prospects</span><span>Source-aware</span><span>No invented grades</span></div></div>'+
    '<aside class="intel-hero-note"><span>HOW TO USE PLAYER DNA</span><strong>Read → Verify → Question</strong>'+
    '<p>Start with the current evidence, check the source, then ask what would actually change your mind.</p></aside></div>'+
    '<div class="intel-layout"><aside class="intel-sidebar" aria-label="Choose a prospect">'+
      '<div class="intel-picker-title"><h2>Find a prospect</h2><small id="intelCount">201 prospects</small></div>'+
      '<label class="intel-field"><span>Search by player or school</span><input id="intelSearch" type="search" placeholder="e.g. Jeremiah Smith" autocomplete="off"></label>'+
      '<label class="intel-field"><span>Position</span><select id="intelPosition">'+positions.map(p=>'<option value="'+esc(p)+'">'+esc(p==="ALL"?"All positions":p)+'</option>').join("")+'</select></label>'+
      '<div class="intel-directory" id="intelDirectory" aria-label="Prospect results"></div>'+
      '<button id="intelMore" class="intel-more" type="button">Show more prospects ↓</button></aside>'+
      '<div class="intel-profile" id="intelProfile" aria-live="off"></div></div>'+
      '<div id="intelAnnouncement" class="intel-visually-hidden" aria-live="polite"></div>';
  root.addEventListener("click",event=>{
    const b=event.target.closest("[data-intel-rank]");
    if(b)select(Number(b.dataset.intelRank));
  });
  document.getElementById("intelSearch").addEventListener("input",event=>{
    state.query=event.target.value;state.limit=12;drawDirectory();
  });
  document.getElementById("intelPosition").addEventListener("change",event=>{
    state.pos=event.target.value;state.limit=12;drawDirectory();
  });
  document.getElementById("intelMore").addEventListener("click",()=>{
    state.limit+=24;drawDirectory();
  });
  window.addEventListener("apex:focus-dna-player",event=>{
    const rank=Number(event?.detail?.rank);if(byRank.has(rank)){
      state.pos="ALL";state.query="";state.limit=Math.max(12,rank);
      document.getElementById("intelPosition").value="ALL";
      document.getElementById("intelSearch").value="";
      select(rank);
    }
  });
  select(state.rank);

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