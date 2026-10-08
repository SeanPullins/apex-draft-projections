/* APEX Decision Lab — publicly usable scouting workflow, NOT a new forecast.
   No licensed source data, generated probabilities, or synthetic outcome grades. */
(function () {
  "use strict";
  const board = window.APEX2027;
  if (!board || !Array.isArray(board.players)) return;
  const live = (window.APEX2026 && window.APEX2026.players) || {};
  const root = document.getElementById("tab-lab");
  if (!root) return;
  const get = id => document.getElementById(id);
  const esc = value => String(value == null ? "" : value)
    .replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const positions = ["ALL"].concat([...new Set(board.players.map(p=>p.p))].sort());
  const PLAYERS = new Map(board.players.map(p => [p.r,p]));
  const FOCI = {
    premium: {
      label:"Protect premium capital",
      description:"High-consequence decisions: prioritize uncertainty and disagreement near the top of the board.",
      accept: p => p.r <= 64 && (p.a !== "HOLD_PRIOR" || p.ta !== "GREEN")
    },
    challenge: {
      label:"Challenge the consensus",
      description:"Find disagreements worth confirming or disproving. This is a scouting list, not a new ranking.",
      accept: p => ["EXECUTIVE_REVIEW_UP","EXECUTIVE_REVIEW_DOWN","SLEEPER_DISCOVERY"].includes(p.a)
    },
    gaps: {
      label:"Close evidence gaps",
      description:"Locate missing games, pending licensed-source checks and uncertain roles. Absence is not failure.",
      accept: p => ["review","history","missing","identity"].includes(evidence(p).kind)
    },
    surprise: {
      label:"Find overlooked talent",
      description:"Look beyond the premium tier for positive market tension; verify football context before changing a grade.",
      accept: p => p.r > 32 && ["EXECUTIVE_REVIEW_UP","SLEEPER_DISCOVERY"].includes(p.a)
    }
  };
  const ACTIONS = {
    HOLD_PRIOR:"Market looks reasonable", EXECUTIVE_REVIEW_UP:"Review up",
    EXECUTIVE_REVIEW_DOWN:"Review down", URGENT_DATA_GAP:"Need more evidence",
    DATA_GAP:"Need more evidence", SCOUT_MORE:"Scout more",
    SLEEPER_DISCOVERY:"Sleeper watch"
  };
  const NONPLAY = ["OUT_INJURY_2026","LIMITED_INJURY_2026","SITTING_OUT_2026","ELIGIBILITY_NO_2026_GAMES"];
  const POSITION_TESTS = {
    QB:"Pressure vs clean-pocket decision-making, processing time and turnover-worthy plays; use matched dropbacks and opponent caliber.",
    WR:"Separation and route success vs coverage type and alignment; distinguish targets, routes, contested chances and scheme-created space.",
    TE:"Receiving-route value vs inline blocking and alignment; compare genuine assignments rather than raw catch totals.",
    RB:"Missed tackles and post-contact production vs run-blocking opportunity, plus routes and pass protection.",
    OL:"True pass sets vs run-blocking assignments, protection calls, opponents and snaps at each line position.",
    ED:"One-on-one pass-rush wins vs pass-set depth and quality of opposing tackles; distinguish effort, role and pressure rate.",
    DT:"Interior pass-rush disruption vs double-teams, gap responsibility and run defense on comparable snaps.",
    LB:"Coverage responsibility, processing and missed tackles vs assignment difficulty and snap alignment.",
    CB:"Man/zone coverage responsibilities vs opponent receiver quality, targets and coverage snap exposure.",
    S:"Deep/middle-field responsibilities vs box work, coverage assignments and tackling opportunities."
  };
  const STORE = "apex-decision-lab-plan-v1";
  const UI = {focus:"premium", position:"ALL", count:5, selected:new Set(), player:board.players[0].r,
              finding:"unverified"};
  try {
    const saved=JSON.parse(localStorage.getItem(STORE)||"[]");
    if (Array.isArray(saved)) for (const rank of saved) if (Number.isInteger(rank)&&PLAYERS.has(rank)&&UI.selected.size<12) UI.selected.add(rank);
  } catch (_) {}

  function evidence(p) {
    const l=live[p.r];
    if (!l) return {kind:"identity",label:"Identity pending",why:"Player source match must be checked."};
    if (l.muse_private_blocking_received)
      return {kind:"review",label:"Source pending review",why:"Licensed 2026 blocking source received; not independently reconciled."};
    if (NONPLAY.includes(l.status) && l.ds==="LIVE_2026_SCORED")
      return {kind:"history",label:"Limited 2026 sample",why:"Account for injury and available games; do not turn missed snaps into zero."};
    if (NONPLAY.includes(l.status))
      return {kind:"history",label:"2026 opportunity limited",why:"Verify injury/eligibility and rely on dated earlier seasons."};
    if (l.ds==="LIVE_2026_SCORED")
      return {kind:"scored",label:"2026 season stats",why:"Public season-level information exists; contextual play evidence may still be missing."};
    if (l.ds==="OL_NO_TRUSTWORTHY_INDIVIDUAL_BOX_SCORE")
      return {kind:"missing",label:"Individual film needed",why:"Available team box scores cannot establish reliable OL individual performance."};
    return {kind:"missing",label:"Further scouting needed",why:"No sufficiently supported current-season individual evidence for this view."};
  }
  function topic(p) {
    const context=p.ctx ? p.ctx.split("_").join(" ") : "position-specific play";
    const supplied=(p.tq||p.q||"").trim();
    return supplied || "Verify "+context+" against matched opponents and opportunities.";
  }
  function reason(p) {
    const m=evidence(p);
    if (m.kind==="review") return "New source not yet reconciled with the frozen assessment.";
    if (m.kind==="history") return "Limited playing opportunity needs a fair historical comparison.";
    if (m.kind==="missing"||m.kind==="identity") return "The current evidence record cannot settle this scouting question.";
    if (p.a==="EXECUTIVE_REVIEW_DOWN") return "Current APEX research questions the market's optimism; verify the discrepancy.";
    if (p.a==="EXECUTIVE_REVIEW_UP") return "Possible positive disagreement with consensus deserves independent film review.";
    if (p.a==="SLEEPER_DISCOVERY") return "Potential sleeper: investigate before accepting a higher talent assessment.";
    if (p.ta==="RED"||p.ta==="AMBER") return "Historical uncertainty signals indicate a fragile projection.";
    return "Confirm whether the current evidence can support the market view.";
  }
  // Deterministic transparent assignment order; NOT a likelihood, ROI or new talent score.
  function sortKey(p) {
    const m=evidence(p);
    const first=(m.kind==="review"||m.kind==="identity")?0:(m.kind==="missing")?1:(m.kind==="history")?2:3;
    const uncertainty=p.ta==="RED"?0:p.ta==="AMBER"?1:p.ta==="GREEN"?2:3;
    const priority=Number.isInteger(p.cr) ? p.cr : 1000+p.r;
    return [first,priority,uncertainty,p.r];
  }
  function compareKey(a,b) {
    const x=sortKey(a),y=sortKey(b);
    for(let i=0;i<x.length;i++) if(x[i]!==y[i]) return x[i]-y[i];
    return 0;
  }
  function pool() {
    return board.players.filter(p => FOCI[UI.focus].accept(p) &&
      (UI.position==="ALL"||p.p===UI.position)).sort(compareKey);
  }
  function status(p) {
    return p.ta ? p.ta+" (forecast stability)" : "Not covered (forecast stability)";
  }
  function card(p) {
    const m=evidence(p);
    const selected=UI.selected.has(p.r);
    const label=selected?"Remove from scouting desk":"Add to scouting desk";
    const flag = m.kind==="review"?"Needs verification":m.kind==="history"?"History-only review":
      m.kind==="missing"?"Missing football evidence":"2026 information available";
    return '<article class="lab-case" data-lab-rank="'+p.r+'">'+
      '<div class="lab-case-top"><span class="lab-rank">Market #'+p.r+'</span><span class="lab-source lab-source-'+esc(m.kind)+'">'+esc(flag)+'</span></div>'+
      '<h3>'+esc(p.n)+'</h3><p class="lab-case-school">'+esc(p.p)+' · '+esc(p.s)+'</p>'+
      '<div class="lab-chips"><span>'+esc(ACTIONS[p.a]||"Monitor")+'</span><span>'+esc(status(p))+'</span></div>'+
      '<div class="lab-docket"><strong>Why this case?</strong><p>'+esc(reason(p))+'</p></div>'+
      '<div class="lab-docket"><strong>The next scouting test</strong><p>'+esc(topic(p))+'</p></div>'+
      '<div class="lab-case-actions"><button type="button" class="lab-add '+(selected?'is-selected':'')+'" data-lab-action="toggle" data-rank="'+p.r+'">'+esc(label)+'</button>'+
      '<button type="button" class="lab-link" data-lab-action="investigate" data-rank="'+p.r+'">Test the case →</button></div>'+
      '</article>';
  }
  function renderQueue() {
    const candidates=pool();
    get("labContext").textContent=FOCI[UI.focus].description;
    const match=get("labMatchCount");
    match.textContent=candidates.length+" matching players";
    get("labQueue").innerHTML=candidates.length ?
      candidates.slice(0,Math.max(8,UI.count)).map(card).join("") :
      '<div class="lab-empty">No players match this question and position. Choose another view.</div>';
    const receipt=candidates.filter(p=>evidence(p).kind==="review").length;
    get("labStats").innerHTML=
      '<div><strong>'+candidates.length+'</strong><span>Players to investigate</span></div>'+
      '<div><strong>'+receipt+'</strong><span>Licensed receipts to reconcile</span></div>'+
      '<div><strong>'+UI.selected.size+'</strong><span>On your scouting desk</span></div>';
    get("labPlanCount").textContent=UI.selected.size+" selected";
    get("labPlan").innerHTML=UI.selected.size ? [...UI.selected].map(rank=>{
      const p=PLAYERS.get(rank), m=evidence(p);
      return '<li><div><strong>'+esc(p.n)+'</strong><span>'+esc(p.p)+' · '+esc(m.label)+' · '+esc(ACTIONS[p.a]||"Monitor")+'</span></div>'+
        '<button type="button" class="lab-remove" data-lab-action="toggle" data-rank="'+p.r+'" aria-label="Remove '+esc(p.n)+'">×</button></li>';
    }).join("") : '<li class="lab-no-plan">Choose assignments or build an automatic scouting desk.</li>';
    get("labExport").disabled=!UI.selected.size;
  }
  function save() {
    try { localStorage.setItem(STORE,JSON.stringify([...UI.selected])); } catch (_) {}
  }
  function renderFocus() {
    const p=PLAYERS.get(UI.player) || board.players[0], m=evidence(p);
    get("labSelectedName").textContent=p.n+" · "+p.p+" · "+p.s;
    get("labCurrentTake").textContent=ACTIONS[p.a]||"Monitor";
    get("labCurrentStatus").textContent=status(p);
    get("labCurrentSource").textContent=m.label;
    get("labCurrentWhy").textContent=reason(p);
    get("labQuestion").textContent=topic(p);
    get("labPositionCheck").textContent=POSITION_TESTS[p.p]||"Verify role, opportunity, opponent and historic source timing.";
    const finding=UI.finding;
    const scenarios={
      verified:"A trusted, same-role sample SUPPORTS the working case. Reopen the scout discussion and compare it with the frozen APEX take. Do not change grades without historical validation.",
      contradiction:"A trusted, same-role sample CONTRADICTS the working case. Flag the discrepancy for an independent second evaluator; review scheme and opponent effects before any ranking change.",
      unverified:"The observation is MISSING, inconsistent or not yet source-verified. Keep the frozen assessment and its uncertainty; request provenance or comparable earlier-season film."
    };
    get("labScenarioResult").textContent=scenarios[finding];
    get("labScenarioBadge").textContent=finding==="verified"?"Re-review — no auto promotion":
      finding==="contradiction"?"Escalate second opinion":"Abstain pending evidence";
  }
  function dispatchDossier(rank) {
    window.dispatchEvent(new CustomEvent("apex:open-dossier",{detail:{rank:rank}}));
  }
  function brief() {
    const now=board.generated||"2026-10-07";
    const chosen=[...UI.selected].map(rank=>PLAYERS.get(rank)).filter(Boolean);
    const text=[
      "APEX — PUBLIC DECISION LAB / SCOUTING DESK",
      "Frozen 2027 board generated: "+now,
      "Question: "+FOCI[UI.focus].label,
      "POSITION: "+UI.position,
      "RESEARCH ONLY: No new grade, draft probability or projection is created by this tool.",
      "Missing evidence is not negative player performance. Licensed records need private source verification.",
      "",
    ];
    chosen.forEach((p,i)=>{
      const m=evidence(p);
      text.push("MISSION "+(i+1)+" — "+p.n+" ("+p.p+", "+p.s+")",
        "MARKET #"+p.r+" | APEX TAKE: "+(ACTIONS[p.a]||"Monitor"),
        "FORECAST STABILITY: "+status(p),
        "EVIDENCE: "+m.label+" — "+m.why,
        "WHY: "+reason(p),
        "WHAT TO VERIFY: "+topic(p),
        "POSITION CHECK: "+(POSITION_TESTS[p.p]||"Verify role and opportunity."),
        "RELEASE GATE: identity + licensed source rights + matching games/denominator + historical out-of-sample validation",
        "");
    });
    return text.join("\n");
  }
  function downloadBrief() {
    const content=brief();
    const blob=new Blob([content],{type:"text/plain;charset=utf-8"});
    const uri=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=uri;
    a.download="APEX-2027-scouting-desk.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(uri);
  }

  const positionSelect=get("labPosition");
  positionSelect.innerHTML=positions.map(x=>'<option value="'+esc(x)+'">'+(x==="ALL"?"All positions":esc(x))+'</option>').join("");
  const playerSelect=get("labPlayer");
  playerSelect.innerHTML=board.players.slice().sort((a,b)=>a.r-b.r)
    .map(p=>'<option value="'+p.r+'">#'+p.r+' · '+esc(p.n)+' · '+esc(p.p)+'</option>').join("");
  playerSelect.value=String(UI.player);
  get("labFocus").addEventListener("change",e=>{UI.focus=e.target.value;renderQueue();});
  positionSelect.addEventListener("change",e=>{UI.position=e.target.value;renderQueue();});
  get("labCapacity").addEventListener("change",e=>{UI.count=+e.target.value;renderQueue();});
  get("labBuild").addEventListener("click",()=>{
    // Rebuild deliberately, so the selected research question determines the desk.
    UI.selected=new Set(pool().slice(0,UI.count).map(p=>p.r));
    save();renderQueue();
    get("labPlan").scrollIntoView?.({behavior:"smooth",block:"nearest"});
  });
  get("labClear").addEventListener("click",()=>{UI.selected.clear();save();renderQueue();});
  get("labQueue").addEventListener("click",onCaseAction);
  get("labPlan").addEventListener("click",onCaseAction);
  function onCaseAction(event) {
    const button=event.target.closest("button[data-lab-action]");
    if (!button) return;
    const rank=Number(button.dataset.rank);
    if (!PLAYERS.has(rank)) return;
    if (button.dataset.labAction==="toggle") {
      if(UI.selected.has(rank)) UI.selected.delete(rank);
      else if(UI.selected.size<12) UI.selected.add(rank);
      save();renderQueue();
    } else if(button.dataset.labAction==="investigate") {
      UI.player=rank;
      playerSelect.value=String(rank);
      renderFocus();
      get("labCaseFile").scrollIntoView?.({behavior:"smooth",block:"start"});
    }
  }
  playerSelect.addEventListener("change",e=>{UI.player=+e.target.value;renderFocus();});
  get("labFinding").addEventListener("change",e=>{UI.finding=e.target.value;renderFocus();});
  get("labViewDossier").addEventListener("click",()=>dispatchDossier(UI.player));
  get("labExport").addEventListener("click",downloadBrief);
  renderQueue();
  renderFocus();
  // Explicitly testable public, pure-data helpers. Exposes NO private metric records.
  window.APEX_DECISION_LAB={
    evidence, pool:focus=>board.players.filter(FOCI[focus||"premium"].accept),
    reason, brief, select:rank=>{if(PLAYERS.has(rank)){UI.player=rank;playerSelect.value=String(rank);renderFocus();}},
    current:()=>({focus:UI.focus,position:UI.position,count:UI.count,chosen:[...UI.selected]})
  };
})();