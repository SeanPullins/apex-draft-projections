/* APEX Draft Advisor: make existing 2027 research useful to a fan.
   Read-only, no synthetic predictions, private-source values, or fake live updates. */
(function () {
  "use strict";
  const D=window.APEX2027;
  const Stories=window.APEX_STORIES;
  if(!Stories)throw new Error("APEX player editorial data is required");
  if (!D || !Array.isArray(D.players) || !document.getElementById("tab-lab")) return;
  const L=(window.APEX2026 && window.APEX2026.players) || {};
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const PLAYERS=new Map(D.players.map(p=>[p.r,p]));
  const NONPLAY=["OUT_INJURY_2026","LIMITED_INJURY_2026","SITTING_OUT_2026","ELIGIBILITY_NO_2026_GAMES"];
  const STORE="apex-fan-watchlist-v1";
  const ui={focus:"sleepers",position:"ALL",rank:D.players[0].r,favorites:new Set()};
  try {
    const saved=JSON.parse(localStorage.getItem(STORE)||"[]");
    if(Array.isArray(saved))for(const rank of saved)if(PLAYERS.has(rank)&&ui.favorites.size<25)ui.favorites.add(rank);
  }catch(_){/* storage can be disabled */}
  const TAKE={
    EXECUTIVE_REVIEW_UP:"Possibly underrated",
    EXECUTIVE_REVIEW_DOWN:"Worth questioning",
    SLEEPER_DISCOVERY:"Sleeper watch",
    HOLD_PRIOR:"Market looks reasonable",
    URGENT_DATA_GAP:"No public 2026 grade",
    DATA_GAP:"No public 2026 grade",
    SCOUT_MORE:"Limited 2026 snapshot"
  };
  const VERDICT={
    EXECUTIVE_REVIEW_UP:"APEX sees a positive disagreement with the current market. It merits another look, but it is not a proven bargain.",
    EXECUTIVE_REVIEW_DOWN:"The current evidence conflicts with market optimism. This is a reason for caution, not a prediction that the player will fail.",
    SLEEPER_DISCOVERY:"APEX has flagged a possible sleeper outside the most prominent names. The signal needs further validation.",
    HOLD_PRIOR:"APEX hasn't found a strong, validated reason to move away from the existing market assessment.",
    URGENT_DATA_GAP:"APEX cannot justify a firm conclusion from the available current-season evidence.",
    DATA_GAP:"Important player evidence is incomplete, so APEX should avoid a stronger claim.",
    SCOUT_MORE:"APEX has a question worth investigating but does not have an independently validated answer yet."
  };
  function evidence(p){
    const x=L[p.r];
    if(!x)return {kind:"identity",label:"Identity/source check",details:"Reliable matching to the current source is not established."};
    if(x.muse_private_blocking_received)return {kind:"review",label:"New source · verification pending",details:"New licensed blocking evidence was received but not independently reconciled. The original forecast has not been recomputed."};
    if(NONPLAY.includes(x.status)&&x.ds==="LIVE_2026_SCORED")
      return {kind:"history",label:"Short season sample",details:"2026 opportunity is limited. Missing games cannot be interpreted as poor play."};
    if(NONPLAY.includes(x.status))return {kind:"history",label:"2026 opportunity limited",details:"Injury, eligibility or nonparticipation limits the 2026 comparison."};
    if(x.ds==="LIVE_2026_SCORED")return {kind:"scored",label:"2026 statistics available",details:"Position-relevant season information is available, but this does not establish independent predictive validity."};
    if(x.ds==="OL_NO_TRUSTWORTHY_INDIVIDUAL_BOX_SCORE")
      return {kind:"missing",label:"Individual film/context missing",details:"Public box scores cannot independently grade an offensive lineman."};
    return {kind:"missing",label:"Evidence incomplete",details:"Additional usable 2026 individual evidence has not been established."};
  }
  function reasons(p){
    return Stories.profile(p).interpretation;
  }
  function next(p){
    return Stories.profile(p).context;
  }
  const MODES={
    sleepers:{title:"Potential sleepers",desc:"Players beyond the first 32 on the market board where APEX flagged a positive signal. These are watch candidates, not confirmed hidden stars.",
      match:p=>p.r>32&&(p.a==="SLEEPER_DISCOVERY"||p.a==="EXECUTIVE_REVIEW_UP")},
    alerts:{title:"Big names APEX questions",desc:"High-interest market prospects with negative APEX evidence tension. A disagreement is not a bust prediction.",
      match:p=>p.a==="EXECUTIVE_REVIEW_DOWN"},
    uncertain:{title:"Where the evidence is fragile",desc:"High-uncertainty profiles and genuine source gaps. A lack of information is not a negative talent grade.",
      match:p=>p.ta==="RED"||evidence(p).kind==="missing"||evidence(p).kind==="review"||evidence(p).kind==="identity"},
    updates:{title:"2026 season numbers",desc:"Actual public 2026 production, grouped by position. Different roles and game counts are not directly comparable.",
      match:p=>Stories.profile(p).kind==="season"},
    top:{title:"The board's biggest names",desc:"The current consensus top 32, with APEX's existing take and data limitations shown alongside the rank.",
      match:p=>p.r<=32}
  };
  function pool(mode=ui.focus){
    let out=D.players.filter(p=>MODES[mode].match(p)&&(ui.position==="ALL"||p.p===ui.position));
    if(mode==="sleepers")out.sort((a,b)=>(a.a==="SLEEPER_DISCOVERY"?0:1)-(b.a==="SLEEPER_DISCOVERY"?0:1)||a.r-b.r);
    else if(mode==="uncertain")out.sort((a,b)=>{
      const pa=a.ta==="RED"?0:a.ta==="AMBER"?1:2;
      const pb=b.ta==="RED"?0:b.ta==="AMBER"?1:2;
      return pa-pb||(a.cr||999)-(b.cr||999)||a.r-b.r;
    });
    else if(mode==="updates")out.sort((a,b)=>a.r-b.r);
    else out.sort((a,b)=>a.r-b.r);
    return out;
  }
  function flag(p){return Stories.profile(p).status;}
  function stability(p) {
    return p.ta==="GREEN"?"Relatively stable":p.ta==="AMBER"?"Some uncertainty":p.ta==="RED"?"Significant uncertainty":"Not assessed";
  }
  function card(p) {
    const followed=ui.favorites.has(p.r);
    return '<article class="lab-case fan-card">'+
      '<div class="lab-case-top"><span class="lab-rank">Market #'+p.r+'</span><span class="lab-source">'+esc(flag(p))+'</span></div>'+
      '<h3>'+esc(p.n)+'</h3><p class="lab-case-school">'+esc(p.p)+' · '+esc(p.s)+'</p>'+
      '<div class="lab-chips"><span>'+esc(Stories.take(p))+'</span><span>'+esc(stability(p))+'</span></div>'+
      '<div class="fan-card-fact">'+esc(Stories.factLine(p))+'</div>'+
      '<div class="lab-docket"><strong>What APEX sees</strong><p>'+esc(reasons(p).replace(Stories.factLine(p)+". ",""))+'</p></div>'+
      '<div class="lab-case-actions">'+
      '<button type="button" class="lab-primary" data-fan-action="open" data-rank="'+p.r+'">Why this player? →</button>'+
      '<button type="button" class="lab-secondary" data-fan-action="follow" data-rank="'+p.r+'" aria-pressed="'+followed+'">'+(followed?"Following ✓":"+ Follow")+'</button>'+
      '</div></article>';
  }
  function renderStories(){
    const list=pool(),mode=MODES[ui.focus];
    $("labContext").textContent=mode.desc;
    $("labMatchCount").textContent=list.length+" players match";
    $("labStats").innerHTML=
      '<div><strong>'+list.length+'</strong><span>'+esc(mode.title)+'</span></div>'+
      '<div><strong>'+list.filter(p=>Stories.profile(p).kind==="season").length+'</strong><span>2026 season summaries</span></div>'+
      '<div><strong>'+ui.favorites.size+'</strong><span>Players you follow</span></div>';
    $("labQueue").innerHTML=list.length?list.slice(0,8).map(card).join("") :
      '<div class="lab-empty">No prospects match these filters. Try another position or storyline.</div>';
  }
  function setCurrent(rank,scroll=false){
    if(!PLAYERS.has(rank))return;
    ui.rank=rank;
    const p=PLAYERS.get(rank),ev=evidence(p);
    $("labPlayer").value=String(rank);
    $("labSelectedName").textContent=p.n+" · "+p.p+" · "+p.s;
    $("labCurrentTake").textContent=Stories.take(p);
    $("labCurrentStatus").textContent=stability(p);
    $("labCurrentSource").textContent=Stories.profile(p).status;
    $("labCurrentWhy").textContent=reasons(p);
    $("labQuestion").textContent=next(p);
    $("fanFollow").textContent=ui.favorites.has(rank)?"Following ✓":"Follow this player";
    $("fanFollow").setAttribute("aria-pressed",String(ui.favorites.has(rank)));
    if(scroll)$("fanPlayerFile").scrollIntoView?.({behavior:"smooth",block:"start"});
  }
  function store(){
    try{localStorage.setItem(STORE,JSON.stringify([...ui.favorites]));}catch(_){}
  }
  function toggle(rank){
    if(!PLAYERS.has(rank))return;
    if(ui.favorites.has(rank))ui.favorites.delete(rank);
    else if(ui.favorites.size<25)ui.favorites.add(rank);
    store();renderStories();renderFavorites();setCurrent(ui.rank);
  }
  function renderFavorites(){
    const players=[...ui.favorites].map(r=>PLAYERS.get(r)).filter(Boolean);
    $("fanFavoriteCount").textContent=players.length+" followed";
    $("fanFavorites").innerHTML=players.length?players.map(p=>
      '<div class="fan-favorite"><div><strong>'+esc(p.n)+'</strong><span>Market #'+p.r+' · '+esc(p.p)+' · '+esc(TAKE[p.a]||"Monitor")+'</span></div>'+
      '<button class="lab-secondary" data-fan-action="open" data-rank="'+p.r+'" type="button">View APEX take</button>'+
      '<button class="lab-secondary" data-fan-action="follow" data-rank="'+p.r+'" type="button" aria-label="Unfollow '+esc(p.n)+'">Unfollow</button></div>').join("") :
      '<p class="lab-explainer">Nobody on your list yet. Tap Follow on any player to save them here.</p>';
  }
  function handleCase(e){
    const btn=e.target.closest("button[data-fan-action]");
    if(!btn)return;
    const rank=+btn.dataset.rank;
    if(btn.dataset.fanAction==="follow")toggle(rank);
    else if(btn.dataset.fanAction==="open")setCurrent(rank,true);
  }
  const pos=$("labPosition");
  const positions=["ALL",...[...new Set(D.players.map(p=>p.p))].sort()];
  pos.innerHTML=positions.map(v=>'<option value="'+esc(v)+'">'+(v==="ALL"?"Every position":esc(v))+'</option>').join("");
  const options=D.players.slice().sort((a,b)=>a.r-b.r).map(p=>
    '<option value="'+p.r+'">#'+p.r+' · '+esc(p.n)+' ('+esc(p.p)+')</option>').join("");
  $("labPlayer").innerHTML=options;
  $("labPlayer").value=String(ui.rank);
  $("labFocus").addEventListener("change",e=>{ui.focus=e.target.value;renderStories();});
  pos.addEventListener("change",e=>{ui.position=e.target.value;renderStories();});
  $("labPlayer").addEventListener("change",e=>setCurrent(+e.target.value));
  $("labViewDossier").addEventListener("click",()=>window.dispatchEvent(new CustomEvent("apex:open-dossier",{detail:{rank:ui.rank}})));
  $("fanFollow").addEventListener("click",()=>toggle(ui.rank));
  /* Portable, user-controlled JSON watchlist. No network or accounts required. */
  function exportWatchlist(){
    return JSON.stringify({
      format:"APEX_WATCHLIST",schema_version:1,board_year:2027,
      ranks:[...ui.favorites].sort((a,b)=>a-b)
    },null,2)+"\n";
  }
  function importWatchlist(raw){
    if(typeof raw!=="string" || raw.length>16384)
      throw new Error("Watchlist file is missing or too large (16 KB maximum).");
    let record;
    try{record=JSON.parse(raw);}catch(_){throw new Error("This is not valid JSON.");}
    const ranks=record&&record.ranks;
    if(!record||record.format!=="APEX_WATCHLIST"||record.schema_version!==1||
       record.board_year!==2027||!Array.isArray(ranks)||ranks.length>25||
       new Set(ranks).size!==ranks.length||
       !ranks.every(n=>Number.isInteger(n)&&PLAYERS.has(n))){
      throw new Error("Invalid APEX 2027 watchlist: use 25 or fewer unique board ranks.");
    }
    ui.favorites=new Set(ranks);
    store();renderStories();renderFavorites();setCurrent(ui.rank);
    return ui.favorites.size;
  }
  const watchMessage=$("watchlistMessage");
  $("fanExportWatchlist").addEventListener("click",()=>{
    const value=exportWatchlist();
    const blob=new Blob([value],{type:"application/json"});
    const href=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=href;a.download="APEX_2027_watchlist.json";
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(href),2000);
    watchMessage.textContent="Watchlist JSON prepared for download.";
  });
  const fileInput=$("fanImportFile");
  $("fanImportWatchlist").addEventListener("click",()=>fileInput.click());
  fileInput.addEventListener("change",()=>{
    const file=fileInput.files&&fileInput.files[0];
    if(!file)return;
    if(file.size>16384){watchMessage.textContent="File too large; maximum 16 KB.";fileInput.value="";return;}
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const n=importWatchlist(reader.result);
        watchMessage.textContent="Imported "+n+" followed players. Previous list replaced.";
      }catch(error){watchMessage.textContent=error.message;}
      fileInput.value="";
    };
    reader.onerror=()=>{watchMessage.textContent="Unable to read this file.";fileInput.value="";};
    reader.readAsText(file);
  });

  $("labQueue").addEventListener("click",handleCase);
  $("fanFavorites").addEventListener("click",handleCase);
  $("fanTeamMode").addEventListener("click",()=>document.querySelector('.tab[data-tab="team"]').click());
  window.addEventListener("apex:focus-lab-player",e=>setCurrent(Number(e.detail&&e.detail.rank),true));
  // Read-only utilities for regression checks; no scoring model is executed here.
  window.APEX_FAN_ADVISOR={
    pool,evidence,reasons,stability,select:setCurrent,exportWatchlist,importWatchlist,current:()=>({focus:ui.focus,position:ui.position,rank:ui.rank,following:[...ui.favorites]})
  };
  renderStories();setCurrent(ui.rank);renderFavorites();compareState();
})();