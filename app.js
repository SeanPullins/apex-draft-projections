/* APEX 2.0 front-end — 2027 decision intelligence. */
(function () {
  "use strict";
  const D = window.APEX2027;
  const L26 = window.APEX2026 || {coverage:{},players:{}};
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const state = { tab: "board", pos: "ALL", attention: "all", q: "", sort: "r", dir: 1 };

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const pct = v => v == null ? "—" : Math.round(v * 100) + "%";
  const one = v => v == null ? "—" : (+v).toFixed(2);
  const whole = v => v == null ? "—" : Math.round(+v).toLocaleString();
  const heightText = inches => {
    if (inches == null || !Number.isFinite(+inches)) return "—";
    const n=Math.round(+inches); return Math.floor(n/12)+"′"+(n%12)+"″";
  };
  const live2026 = p => (L26.players && L26.players[p.r]) || null;

  const TAKE = {
    HOLD_PRIOR: ["Market looks reasonable", "take-hold"],
    EXECUTIVE_REVIEW_UP: ["Review up ↑", "take-up"],
    EXECUTIVE_REVIEW_DOWN: ["Review down ↓", "take-down"],
    URGENT_DATA_GAP: ["Need more evidence", "take-data"],
    DATA_GAP: ["Need more evidence", "take-data"],
    SCOUT_MORE: ["Scout more", "take-data"],
    SLEEPER_DISCOVERY: ["Sleeper watch", "take-up"]
  };

  const COLUMN_HELP = {
    rank: {
      title: "Rank",
      body: "The current consensus 2027 draft-board rank. This is the market starting point, not an APEX-generated talent rank.",
      note: "APEX keeps the market visible so users can see when evidence agrees, disagrees, or is still incomplete."
    },
    player: {
      title: "Player",
      body: "The prospect's name, position, and school.",
      note: "Tap any player row to open the full APEX dossier."
    },
    take: {
      title: "APEX Take",
      body: "The action APEX recommends taking with the current market opinion: hold it, review the player up or down, gather more evidence, or watch for a sleeper.",
      note: "The underlying APEX decision is frozen as of October 7. For a former gap, the UI can display a newer source-received state without claiming the forecast was recalculated."
    },
    evidence: {
      title: "2026 Evidence",
      body: "What research is actually on hand today: position-relevant box-score statistics, a newly received licensed source awaiting validation, historical-only evidence because 2026 is unavailable, or an unresolved scouting gap.",
      note: "Evidence status and GREEN/AMBER/RED forecast stability are different. Source received is NOT model-validated, and existing APEX forecasts stay frozen."
    },
    confidence: {
      title: "Confidence",
      body: "How stable or fragile the projection looks based on validated Translation Topology uncertainty signals.",
      note: "GREEN, AMBER, and RED describe projection confidence — not player quality. RED means learn more before being confident."
    },
    why: {
      title: "Why it matters",
      body: "A one-line explanation of why APEX is holding the market view, questioning it, or asking for more evidence.",
      note: "The full dossier shows the underlying evidence tension and the next question that could change the decision."
    },
    priority: {
      title: "Scout priority",
      body: "Where the player ranks in APEX's scouting and research work queue — who deserves more investigation first.",
      note: "Scout Priority #1 does not mean APEX's #1 player. High draft stakes, uncertainty, disagreement, or missing evidence can all raise scouting priority."
    }
  };

  const NFL_TEAMS = [
    "Arizona Cardinals","Atlanta Falcons","Baltimore Ravens","Buffalo Bills","Carolina Panthers",
    "Chicago Bears","Cincinnati Bengals","Cleveland Browns","Dallas Cowboys","Denver Broncos",
    "Detroit Lions","Green Bay Packers","Houston Texans","Indianapolis Colts","Jacksonville Jaguars",
    "Kansas City Chiefs","Las Vegas Raiders","Los Angeles Chargers","Los Angeles Rams","Miami Dolphins",
    "Minnesota Vikings","New England Patriots","New Orleans Saints","New York Giants","New York Jets",
    "Philadelphia Eagles","Pittsburgh Steelers","San Francisco 49ers","Seattle Seahawks",
    "Tampa Bay Buccaneers","Tennessee Titans","Washington Commanders"
  ];

  const TEAM_NEED_ORDER = ["QB","RB","WR","TE","OL","ED","DT","DL","LB","CB","S"];
  const teamState = {
    team: "",
    picks: [],
    philosophy: "balanced",
    risk: "balanced",
    needs: new Set()
  };

  function isNo2026Opportunity(p) {
    const l=live2026(p);
    return !!l && ["OUT_INJURY_2026","LIMITED_INJURY_2026","SITTING_OUT_2026","ELIGIBILITY_NO_2026_GAMES"].includes(l.status);
  }

  // Fresh research state is separate from the frozen October 7 forecast.
  function evidenceMeta(p) {
    const l=live2026(p);
    if (!l) return ["Identity check","status-amber","identity"];
    if (l.muse_private_blocking_received) return ["Source received","status-amber","review"];
    if (isNo2026Opportunity(p)) return ["2026 unavailable","status-na","history"];
    if (l.ds==="LIVE_2026_SCORED") return ["2026 stats","status-green","scored"];
    if (l.ds==="OL_NO_TRUSTWORTHY_INDIVIDUAL_BOX_SCORE") return ["Film needed","status-red","missing"];
    return ["More scouting","status-amber","missing"];
  }

  function takeMeta(action,p) {
    if (p && p.a && p.a.includes("DATA_GAP") && live2026(p)?.muse_private_blocking_received)
      return ["New evidence · review","take-data"];
    if (p && ["DATA_GAP","URGENT_DATA_GAP","SCOUT_MORE"].includes(action) && isNo2026Opportunity(p))
      return ["Historical review","take-data"];
    return TAKE[action] || ["Monitor","take-hold"];
  }

  function confidenceMeta(p) {
    if (!p.ta) return ["Not covered", "status-na"];
    return [p.ta, "status-" + p.ta.toLowerCase()];
  }

  function shortWhy(p) {
    if (live2026(p)?.muse_private_blocking_received)
      return "New 2026 blocking records received; validation pending. The frozen snapshot still flags the earlier gap.";
    if (["DATA_GAP","URGENT_DATA_GAP","SCOUT_MORE"].includes(p.a) && isNo2026Opportunity(p))
      return "Limited or no 2026 opportunity; use prior seasons and verified availability instead of treating missing games as bad play.";
    if (p.a === "EXECUTIVE_REVIEW_UP") return "Current evidence is stronger than the market prior.";
    if (p.a === "EXECUTIVE_REVIEW_DOWN") return "Current evidence is weaker than the market prior — review, not a bust call.";
    if (p.a === "URGENT_DATA_GAP" || p.a === "DATA_GAP" || p.a === "SCOUT_MORE")
      return "The decision matters, but trustworthy evidence is incomplete.";
    if (p.a === "SLEEPER_DISCOVERY") return "Positive evidence is surfacing outside the premium board.";
    if (p.ta === "RED") return "The market looks reasonable, but the projection has multiple uncertainty flags.";
    if (p.ta === "AMBER") return "The market looks reasonable, with one elevated uncertainty signal.";
    return "No strong evidence currently justifies moving off the market.";
  }

  function nextQuestion(p) {
    if (live2026(p)?.muse_private_blocking_received)
      return "Validate the supplied licensed blocking export against season, position, snaps and opponent context. Retest the frozen data-gap assessment prospectively; do not silently overwrite it.";
    if (isNo2026Opportunity(p))
      return "Use earlier-season graded film and workload, verify return/eligibility status and record 2026 nonparticipation separately. Never treat missed games as a zero performance grade.";
    return p.tq || p.q || "Continue normal monitoring; no special evidence request is justified yet.";
  }

  function uncertaintyScore(p) {
    const vals = [p.fg, p.ig, p.rs].filter(v => Number.isFinite(v));
    return vals.length ? Math.max(...vals) : -1;
  }

  function warItem(p, detail) {
    const [take, takeClass] = takeMeta(p.a,p);
    const [conf, confClass] = confidenceMeta(p);
    return '<button class="war-item" type="button" data-rank="'+p.r+'">' +
      '<span class="war-rank">#'+p.r+'</span>' +
      '<span class="war-player"><strong>'+esc(p.n)+'</strong><small>'+esc(p.p)+' · '+esc(p.s)+'</small></span>' +
      '<span class="war-detail">'+esc(detail)+'</span>' +
      '<span class="war-badges"><span class="take '+takeClass+'">'+esc(take)+'</span>' +
      (p.ta ? '<span class="status '+confClass+'">'+esc(conf)+'</span>' : '') + '</span>' +
    '</button>';
  }

  function warCard(title, copy, players, detailFn, tone) {
    return '<article class="war-card war-'+tone+'"><div class="war-card-head"><h3>'+esc(title)+'</h3><p>'+esc(copy)+'</p></div>' +
      '<div class="war-list">'+(players.length ? players.map(p => warItem(p, detailFn(p))).join('') : '<div class="war-empty">No current cases.</div>')+'</div></article>';
  }

  function renderWarRoom() {
    const byRank = (a,b) => a.r-b.r;
    const reviewUp = D.players.filter(p => p.a === "EXECUTIVE_REVIEW_UP")
      .sort((a,b) => (b.uq ?? b.ee ?? -99) - (a.uq ?? a.ee ?? -99) || byRank(a,b)).slice(0,3);
    const reviewDown = D.players.filter(p => p.a === "EXECUTIVE_REVIEW_DOWN")
      .sort((a,b) => (a.uq ?? a.ee ?? 99) - (b.uq ?? b.ee ?? 99) || byRank(a,b)).slice(0,3);
    const uncertainty = D.players.filter(p => p.ta === "RED" || p.ta === "AMBER")
      .sort((a,b) => uncertaintyScore(b)-uncertaintyScore(a) || byRank(a,b)).slice(0,3);
    const scoutFirst = D.players.filter(p => Number.isFinite(p.cr))
      .sort((a,b) => a.cr-b.cr || byRank(a,b)).slice(0,3);

    $("#warRoomGrid").innerHTML =
      warCard("Review up", "Where current evidence most deserves a closer look above the market prior.", reviewUp,
        p => p.ee == null ? "Positive evidence tension" : "Evidence edge "+one(p.ee), "up") +
      warCard("Review down", "Where evidence is weaker than the market prior — review trigger, not a bust call.", reviewDown,
        p => p.ee == null ? "Negative evidence tension" : "Evidence edge "+one(p.ee), "down") +
      warCard("Biggest uncertainty", "Prospects where projection confidence deserves the most caution.", uncertainty,
        p => p.ctx ? "Question: "+humanContext(p.ctx) : "Multiple uncertainty signals", "uncertain") +
      warCard("Scout first", "Highest-value work queue right now — not a talent ranking.", scoutFirst,
        p => p.cr ? "Scout priority #"+p.cr : "High-value follow-up", "scout");

    document.querySelectorAll(".war-item").forEach(button => button.addEventListener("click", () => {
      const p = D.players.find(x => x.r === +button.dataset.rank);
      if (p) openModal(p);
    }));
  }

  function populateCompare() {
    const options = ['<option value="">Choose a prospect…</option>']
      .concat(D.players.slice().sort((a,b)=>a.r-b.r).map(p =>
        '<option value="'+p.r+'">#'+p.r+' · '+esc(p.n)+' · '+esc(p.p)+'</option>')).join('');
    $("#compareA").innerHTML = options;
    $("#compareB").innerHTML = options;
    const sync = () => {
      const a = $("#compareA").value, b = $("#compareB").value;
      $("#compareButton").disabled = !a || !b || a === b;
    };
    $("#compareA").addEventListener("change", sync);
    $("#compareB").addEventListener("change", sync);
    $("#compareButton").addEventListener("click", () => {
      const a = D.players.find(p => p.r === +$("#compareA").value);
      const b = D.players.find(p => p.r === +$("#compareB").value);
      if (a && b && a !== b) openCompare(a,b);
    });
  }

  /* theme */
  $("#themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme === "dark" ||
      (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    root.dataset.theme = dark ? "light" : "dark";
  });

  /* tabs */
  function setTab(tab) {
    state.tab = tab;
    $$(".tab").forEach(b => {
      const on = b.dataset.tab === tab;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    $$(".tab-panel").forEach(p => p.classList.toggle("is-active", p.id === "tab-" + tab));
    location.hash = "#" + tab;
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  $$(".tab").forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));
  const initial = (location.hash || "#board").slice(1);
  if (["board","team","how","validation"].includes(initial)) setTab(initial);

  const teamLauncher = $("#openTeamMode");
  if (teamLauncher) teamLauncher.addEventListener("click", () => setTab("team"));

  /* position filters */
  const positions = ["ALL", ...Array.from(new Set(D.players.map(p => p.p))).sort()];
  const pills = $("#posPills");
  positions.forEach(pos => {
    const b = document.createElement("button");
    b.className = "pill" + (pos === "ALL" ? " is-active" : "");
    b.textContent = pos;
    b.addEventListener("click", () => {
      state.pos = pos;
      $$(".pill", pills).forEach(x => x.classList.toggle("is-active", x.textContent === pos));
      render();
    });
    pills.appendChild(b);
  });

  $("#attentionSelect").addEventListener("change", e => {
    state.attention = e.target.value;
    render();
  });
  let timer;
  $("#searchBox").addEventListener("input", e => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.q = e.target.value.trim().toLowerCase();
      render();
    }, 100);
  });

  function needsAttention(p) {
    return p.a !== "HOLD_PRIOR" || p.ta === "RED" || p.ta === "AMBER";
  }

  function filteredRows() {
    let rows = D.players.slice();
    if (state.pos !== "ALL") rows = rows.filter(p => p.p === state.pos);
    if (state.attention === "attention") rows = rows.filter(needsAttention);
    if (state.attention === "evidence_review") rows = rows.filter(p => evidenceMeta(p)[2]==="review");
    if (state.attention === "evidence_missing") rows = rows.filter(p => ["missing","history","identity"].includes(evidenceMeta(p)[2]));
    if (state.attention === "red") rows = rows.filter(p => p.ta === "RED");
    if (state.attention === "topology") rows = rows.filter(p => !!p.ta);
    if (state.q) rows = rows.filter(p =>
      p.n.toLowerCase().includes(state.q) || p.s.toLowerCase().includes(state.q)
    );

    const confidenceOrder = { RED: 3, AMBER: 2, GREEN: 1, null: 0 };
    const attentionOrder = {
      URGENT_DATA_GAP: 6, EXECUTIVE_REVIEW_DOWN: 5, EXECUTIVE_REVIEW_UP: 4,
      SLEEPER_DISCOVERY: 3, SCOUT_MORE: 2, DATA_GAP: 2, HOLD_PRIOR: 1
    };
    rows.sort((a,b) => {
      let av=a[state.sort], bv=b[state.sort];
      if (state.sort === "ta") { av=confidenceOrder[a.ta]||0; bv=confidenceOrder[b.ta]||0; }
      if (state.sort === "a") { av=attentionOrder[a.a]||0; bv=attentionOrder[b.a]||0; }
      if (av == null && bv == null) return a.r-b.r;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return av.localeCompare(bv) * state.dir;
      return (av-bv) * state.dir;
    });
    return rows;
  }

  document.querySelectorAll("[data-sort]").forEach(th => th.addEventListener("click", () => {
    const k = th.dataset.sort;
    if (state.sort === k) state.dir *= -1;
    else {
      state.sort = k;
      state.dir = (k === "r" || k === "cr") ? 1 : -1;
    }
    render();
  }));

  const columnHelpSheet = $("#columnHelpSheet");
  function openColumnHelp(key) {
    const info = COLUMN_HELP[key];
    if (!info) return;
    $("#columnHelpTitle").textContent = info.title;
    $("#columnHelpBody").innerHTML =
      '<p class="column-help-lead">'+esc(info.body)+'</p>' +
      '<div class="column-help-note">'+esc(info.note)+'</div>';
    columnHelpSheet.hidden = false;
    document.body.classList.add("modal-open");
    $("[data-close-column-help]", columnHelpSheet).focus();
  }
  function closeColumnHelp() {
    columnHelpSheet.hidden = true;
    if (backdrop.hidden && sheet.hidden) document.body.classList.remove("modal-open");
  }
  document.querySelectorAll(".column-help").forEach(button => button.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    openColumnHelp(button.dataset.help);
  }));
  columnHelpSheet.addEventListener("click", e => {
    if (e.target === columnHelpSheet || e.target.closest("[data-close-column-help]")) closeColumnHelp();
  });

  function renderTiles(rows) {
    const states=rows.map(evidenceMeta);
    const scored=states.filter(m => m[2]==="scored").length;
    const received=states.filter(m => m[2]==="review").length;
    const other=states.filter(m => ["missing","history","identity"].includes(m[2])).length;
    $("#boardTiles").innerHTML =
      tile("Prospects shown", rows.length, "of " + D.summary.board + " on the frozen 2027 board") +
      tile("2026 stats available", scored, "position-relevant public season evidence") +
      tile("New source received", received, "licensed OL data under private validation") +
      tile("Scouting / history", other, "missing live data, injury or no 2026 opportunity");
  }
  function tile(label,value,sub){
    return '<div class="tile"><div class="tile-label">'+esc(label)+'</div><div class="tile-value">'+esc(value)+'</div><div class="tile-sub">'+esc(sub)+'</div></div>';
  }

  function render() {
    const rows = filteredRows();
    renderTiles(rows);
    const body = $("#boardBody");
    body.innerHTML = rows.map(p => {
      const [take, takeClass] = takeMeta(p.a,p);
      const [conf, confClass] = confidenceMeta(p);
      const [evidence,evidenceClass] = evidenceMeta(p);
      return '<tr data-rank="'+p.r+'">' +
        '<td class="num rank-cell">#'+p.r+'</td>' +
        '<td><div class="player-name">'+esc(p.n)+'</div><div class="player-meta">'+esc(p.p)+' · '+esc(p.s)+'</div></td>' +
        '<td><span class="take '+takeClass+'">'+esc(take)+'</span></td>' +
        '<td><span class="status '+confClass+'">'+esc(conf)+'</span></td>' +
        '<td><span class="status '+evidenceClass+'">'+esc(evidence)+'</span></td>' +
        '<td class="why-cell">'+esc(shortWhy(p))+'</td>' +
        '<td class="num">'+(p.cr ? "#"+p.cr : "—")+'</td>' +
      '</tr>';
    }).join("");
    $$("tr", body).forEach(tr => tr.addEventListener("click", () => {
      const p = D.players.find(x => x.r === +tr.dataset.rank);
      if (p) openModal(p);
    }));
  }

  function parsePicks(value) {
    return Array.from(new Set(String(value || "").split(/[^0-9]+/).filter(Boolean)
      .map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 257))).sort((a,b)=>a-b);
  }

  function actionScore(p) {
    const scores = {
      EXECUTIVE_REVIEW_UP: .95,
      SLEEPER_DISCOVERY: .90,
      HOLD_PRIOR: .70,
      SCOUT_MORE: .52,
      DATA_GAP: .46,
      URGENT_DATA_GAP: .42,
      EXECUTIVE_REVIEW_DOWN: .34
    };
    return scores[p.a] ?? .55;
  }

  function baseRiskScore(p) {
    if (p.ta === "GREEN") return 1;
    if (p.ta === "AMBER") return .65;
    if (p.ta === "RED") return .35;
    return .55;
  }

  function riskScore(p) {
    const base = baseRiskScore(p);
    if (teamState.risk === "conservative") return base;
    if (teamState.risk === "aggressive") return .80 + .20 * base;
    return .50 + .50 * base;
  }

  function needScore(p) {
    if (!teamState.needs.size) return .65;
    return teamState.needs.has(p.p) ? 1 : .25;
  }

  function pickFitScore(p, pick) {
    if (!pick) return .60;
    const gap = p.r - pick;
    if (gap <= 0) return Math.max(.35, 1 - Math.abs(gap) * .024);
    return Math.max(0, 1 - gap / 35);
  }

  function bestPickFit(p) {
    if (!teamState.picks.length) return .60;
    return Math.max(...teamState.picks.map(pick => pickFitScore(p,pick)));
  }

  function philosophyWeights() {
    if (teamState.philosophy === "bpa") return {pick:.45,need:.15,action:.25,risk:.15};
    if (teamState.philosophy === "need") return {pick:.25,need:.50,action:.15,risk:.10};
    return {pick:.35,need:.30,action:.20,risk:.15};
  }

  function teamFitBreakdown(p, pick=null) {
    const w = philosophyWeights();
    const scores = {
      pick: pick ? pickFitScore(p,pick) : bestPickFit(p),
      need: needScore(p),
      action: actionScore(p),
      risk: riskScore(p)
    };
    const exact = {
      pick: w.pick*scores.pick*100,
      need: w.need*scores.need*100,
      action: w.action*scores.action*100,
      risk: w.risk*scores.risk*100
    };
    const total = Math.round(exact.pick+exact.need+exact.action+exact.risk);
    const points = {
      pick: Math.round(exact.pick),
      need: Math.round(exact.need),
      action: Math.round(exact.action),
      risk: Math.round(exact.risk)
    };
    // Keep displayed component points mathematically reconciled to displayed Team Fit.
    points.risk += total-(points.pick+points.need+points.action+points.risk);
    return {total,points,scores,weights:w};
  }

  function teamFit(p, pick=null) {
    return teamFitBreakdown(p,pick).total;
  }

  function teamFitEquation(p,pick=null) {
    const b=teamFitBreakdown(p,pick);
    return "Pick +"+b.points.pick+" · Need +"+b.points.need+" · APEX +"+b.points.action+" · Risk +"+b.points.risk+" = "+b.total;
  }

  function teamFitDrivers(p,pick=null) {
    const b=teamFitBreakdown(p,pick);
    const items=[
      ["Pick fit",b.points.pick],
      ["Roster need",b.points.need],
      ["APEX evidence",b.points.action],
      ["Risk / confidence",b.points.risk]
    ].sort((a,b)=>b[1]-a[1]);
    return "Main drivers: "+items.slice(0,2).map(x=>x[0]+" "+x[1]+" pts").join(" • ");
  }

  function pickFitLabel(p,pick) {
    if (!pick) return "No pick set";
    const gap = p.r-pick;
    if (gap < -8) return "If he falls";
    if (gap <= 5) return "In range";
    if (gap <= 18) return "Small reach";
    return "Reach";
  }

  function teamWhy(p,pick=null) {
    const parts=[];
    if (teamState.needs.has(p.p)) parts.push("fills a selected need");
    if (p.a === "EXECUTIVE_REVIEW_UP" || p.a === "SLEEPER_DISCOVERY") parts.push("positive APEX evidence");
    if (p.a === "EXECUTIVE_REVIEW_DOWN") parts.push("negative evidence needs review");
    if (p.a === "DATA_GAP" || p.a === "URGENT_DATA_GAP" || p.a === "SCOUT_MORE") parts.push("information is incomplete");
    if (p.ta === "RED") parts.push("projection is fragile");
    else if (p.ta === "GREEN") parts.push("projection is comparatively stable");
    if (pick) parts.push(pickFitLabel(p,pick).toLowerCase()+" at pick "+pick);
    return parts.length ? parts.join("; ")+"." : "Neutral team context; evaluate on the underlying APEX dossier.";
  }

  function saveTeamState() {
    try {
      localStorage.setItem("apexTeamMode", JSON.stringify({
        team:teamState.team,picks:teamState.picks,philosophy:teamState.philosophy,
        risk:teamState.risk,needs:[...teamState.needs]
      }));
    } catch (_) {}
  }

  function restoreTeamState() {
    try {
      const raw=localStorage.getItem("apexTeamMode");
      if(!raw) return;
      const s=JSON.parse(raw);
      if(NFL_TEAMS.includes(s.team)) teamState.team=s.team;
      if(Array.isArray(s.picks)) teamState.picks=s.picks.filter(n=>Number.isInteger(n)&&n>=1&&n<=257);
      if(["balanced","bpa","need"].includes(s.philosophy)) teamState.philosophy=s.philosophy;
      if(["balanced","conservative","aggressive"].includes(s.risk)) teamState.risk=s.risk;
      if(Array.isArray(s.needs)) teamState.needs=new Set(s.needs);
    } catch (_) {}
  }

  function initTeamMode() {
    restoreTeamState();
    const teamSelect=$("#teamSelect");
    teamSelect.innerHTML='<option value="">Choose a team…</option>'+NFL_TEAMS.map(t=>'<option value="'+esc(t)+'">'+esc(t)+'</option>').join("");
    teamSelect.value=teamState.team;
    $("#teamPicks").value=teamState.picks.join(", ");
    $("#teamPhilosophy").value=teamState.philosophy;
    $("#teamRisk").value=teamState.risk;

    const present=new Set(D.players.map(p=>p.p));
    const needPositions=TEAM_NEED_ORDER.filter(p=>present.has(p)).concat(
      [...present].filter(p=>!TEAM_NEED_ORDER.includes(p)).sort()
    );
    $("#teamNeedPills").innerHTML=needPositions.map(pos =>
      '<button type="button" class="pill team-need '+(teamState.needs.has(pos)?"is-active":"")+'" data-pos="'+esc(pos)+'">'+esc(pos)+'</button>'
    ).join("");

    teamSelect.addEventListener("change",e=>{teamState.team=e.target.value;saveTeamState();renderTeamMode();});
    $("#teamPicks").addEventListener("input",e=>{teamState.picks=parsePicks(e.target.value);saveTeamState();renderTeamMode();});
    $("#teamPhilosophy").addEventListener("change",e=>{teamState.philosophy=e.target.value;saveTeamState();renderTeamMode();});
    $("#teamRisk").addEventListener("change",e=>{teamState.risk=e.target.value;saveTeamState();renderTeamMode();});
    document.querySelectorAll(".team-need").forEach(button=>button.addEventListener("click",()=>{
      const pos=button.dataset.pos;
      if(teamState.needs.has(pos)) teamState.needs.delete(pos); else teamState.needs.add(pos);
      button.classList.toggle("is-active",teamState.needs.has(pos));
      saveTeamState();renderTeamMode();
    }));
    $("#clearNeeds").addEventListener("click",()=>{
      teamState.needs.clear();
      document.querySelectorAll(".team-need").forEach(b=>b.classList.remove("is-active"));
      saveTeamState();renderTeamMode();
    });
  }

  function summaryChip(label,value) {
    return '<div class="team-summary-chip"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>';
  }

  function candidatePool(pick) {
    return D.players.filter(p=>p.r>=Math.max(1,pick-12) && p.r<=pick+30);
  }

  function uniqueAlternatives(pool,pick) {
    const sorted=pool.slice().sort((a,b)=>teamFit(b,pick)-teamFit(a,pick) || a.r-b.r);
    const best=sorted[0] || null;
    const remaining=sorted.filter(p=>!best || p.r!==best.r);
    const safer=remaining.slice().sort((a,b)=>riskScore(b)-riskScore(a) || teamFit(b,pick)-teamFit(a,pick))[0] || null;
    const used=new Set([best?.r,safer?.r].filter(Boolean));
    const edge=remaining.filter(p=>!used.has(p.r) && (p.a==="EXECUTIVE_REVIEW_UP" || p.a==="SLEEPER_DISCOVERY"))
      .sort((a,b)=>teamFit(b,pick)-teamFit(a,pick))[0] ||
      remaining.filter(p=>!used.has(p.r)).sort((a,b)=>teamFit(b,pick)-teamFit(a,pick))[0] || null;
    return {best,safer,edge};
  }

  function pickCandidate(kind,p,pick) {
    if(!p) return '<div class="pick-candidate empty">No qualifying alternative.</div>';
    const [take,takeClass]=takeMeta(p.a,p), [conf,confClass]=confidenceMeta(p);
    return '<button class="pick-candidate" type="button" data-rank="'+p.r+'">' +
      '<span class="pick-kind">'+esc(kind)+'</span>' +
      '<div class="pick-player"><strong>#'+p.r+' '+esc(p.n)+'</strong><span>'+esc(p.p)+' · '+esc(p.s)+'</span></div>' +
      '<div class="pick-score"><strong>'+teamFit(p,pick)+'</strong><span>Team Fit</span></div>' +
      '<div class="pick-tags"><span class="pick-fit-tag">'+esc(pickFitLabel(p,pick))+'</span><span class="take '+takeClass+'">'+esc(take)+'</span>'+
      (p.ta?'<span class="status '+confClass+'">'+esc(conf)+'</span>':'')+'</div>' +
      '<div class="fit-breakdown"><strong>'+esc(teamFitEquation(p,pick))+'</strong><span>'+esc(teamFitDrivers(p,pick))+'</span></div>' +
      '<p>'+esc(teamWhy(p,pick))+'</p>' +
    '</button>';
  }

  function renderPickPlans() {
    const host=$("#pickPlanGrid");
    if(!teamState.picks.length) {
      host.innerHTML='<div class="team-empty"><strong>Add your 2027 picks to build a pick-by-pick plan.</strong><span>APEX will create a transparent candidate window around each selection.</span></div>';
      return;
    }
    host.innerHTML=teamState.picks.map(pick=>{
      const alts=uniqueAlternatives(candidatePool(pick),pick);
      const coveredEnd=Math.max(...D.players.map(p=>p.r));
      const limit=pick>coveredEnd
        ? '<div class="live-note live-note-neutral"><strong>Limited late-round coverage:</strong> the current research board ends at rank #'+coveredEnd+'. This is not a complete candidate pool for pick #'+pick+'.</div>'
        : '';
      if(!alts.best) return '<article class="pick-card"><div class="pick-card-head"><span>Overall pick</span><strong>#'+pick+'</strong></div>'+
        '<div class="team-empty"><strong>No supported candidates at this pick yet.</strong><span>APEX only has ranked evidence for the top '+coveredEnd+' prospects. Do not interpret an empty plan as no talent available.</span></div></article>';
      return '<article class="pick-card"><div class="pick-card-head"><span>Overall pick</span><strong>#'+pick+'</strong></div>' +
        limit +
        pickCandidate("Best team fit",alts.best,pick) +
        pickCandidate("Safer profile",alts.safer,pick) +
        pickCandidate("APEX edge / alternative",alts.edge,pick) +
      '</article>';
    }).join("");
    document.querySelectorAll(".pick-candidate[data-rank]").forEach(b=>b.addEventListener("click",()=>{
      const p=D.players.find(x=>x.r===+b.dataset.rank); if(p) openModal(p);
    }));
  }

  function renderTeamBoard() {
    const rows=D.players.slice().sort((a,b)=>teamFit(b)-teamFit(a) || a.r-b.r).slice(0,24);
    $("#teamBoardBody").innerHTML=rows.map(p=>{
      const [take,takeClass]=takeMeta(p.a,p), [conf,confClass]=confidenceMeta(p);
      const pick=teamState.picks.length ? teamState.picks.slice().sort((a,b)=>pickFitScore(p,b)-pickFitScore(p,a))[0] : null;
      return '<tr data-rank="'+p.r+'">' +
        '<td class="num team-fit-score">'+teamFit(p)+'</td>' +
        '<td><div class="player-name">'+esc(p.n)+'</div><div class="player-meta">#'+p.r+' · '+esc(p.p)+' · '+esc(p.s)+'</div></td>' +
        '<td>'+(teamState.needs.has(p.p)?'<span class="need-match">NEED</span>':'<span class="need-neutral">—</span>')+'</td>' +
        '<td>'+esc(pick?pickFitLabel(p,pick)+" · #"+pick:"Set picks")+'</td>' +
        '<td><span class="take '+takeClass+'">'+esc(take)+'</span></td>' +
        '<td><span class="status '+confClass+'">'+esc(conf)+'</span></td>' +
        '<td class="why-cell"><div class="fit-equation">'+esc(teamFitEquation(p,pick))+'</div><div>'+esc(teamFitDrivers(p,pick))+'</div><div class="fit-narrative">'+esc(teamWhy(p,pick))+'</div></td>' +
      '</tr>';
    }).join("");
    document.querySelectorAll("#teamBoardBody tr").forEach(tr=>tr.addEventListener("click",()=>{
      const p=D.players.find(x=>x.r===+tr.dataset.rank); if(p) openModal(p);
    }));
  }

  function renderTeamMode() {
    const team=teamState.team || "No team selected";
    const picks=teamState.picks.length ? teamState.picks.map(n=>"#"+n).join(", ") : "Not set";
    const needs=teamState.needs.size ? [...teamState.needs].join(", ") : "Neutral";
    const philosophy={balanced:"Balanced",bpa:"Best player available",need:"Need-forward"}[teamState.philosophy];
    const risk={balanced:"Balanced",conservative:"Conservative",aggressive:"Aggressive"}[teamState.risk];
    $("#teamSummary").innerHTML =
      summaryChip("Team",team)+summaryChip("Picks",picks)+summaryChip("Needs",needs)+summaryChip("Philosophy",philosophy)+summaryChip("Risk",risk);
    renderPickPlans();
    renderTeamBoard();
  }

  const teamFormulaSheet=$("#teamFormulaSheet");
  function closeTeamFormula() {
    teamFormulaSheet.hidden=true;
    if(backdrop.hidden && compareBackdrop.hidden && sheet.hidden && columnHelpSheet.hidden) document.body.classList.remove("modal-open");
  }

  function liveStatusLabel(l) {
    if (!l) return ["2026 DATA UNAVAILABLE","live-status-muted"];
    const status=l.status || "ACTIVE_OR_NORMAL";
    if (status==="OUT_INJURY_2026") return ["OUT — INJURY","live-status-warn"];
    if (status==="LIMITED_INJURY_2026") return ["LIMITED — INJURY","live-status-warn"];
    if (status==="SITTING_OUT_2026") return ["SITTING OUT 2026","live-status-warn"];
    if (status==="ELIGIBILITY_NO_2026_GAMES") return ["ELIGIBILITY — NO 2026 GAMES","live-status-warn"];
    if (l.muse_private_blocking_received) return ["NEW DATA UNDER REVIEW","live-status-neutral"];
    if (l.ds==="OL_NO_TRUSTWORTHY_INDIVIDUAL_BOX_SCORE") return ["2026 ROSTER DATA","live-status-neutral"];
    if (l.ds==="PARTIAL_2026_DATA") return ["PARTIAL 2026 DATA","live-status-warn"];
    if (l.ds==="LIVE_2026_SCORED") return ["2026 LIVE","live-status-good"];
    return ["2026 STATUS","live-status-neutral"];
  }

  function liveStat(label,value) {
    return '<div class="live-stat"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>';
  }

  function liveStatsFor(p,l) {
    if (!l) return [];
    const out=[];
    if (p.p==="QB") {
      if(l.py!=null) out.push(["Pass yds",whole(l.py)]);
      if(l.ptd!=null) out.push(["Pass TD",whole(l.ptd)]);
      if(l.qbr!=null) out.push(["Adj QBR",one(l.qbr)]);
      if(l.ry!=null) out.push(["Rush yds",whole(l.ry)]);
      if(l.rtd!=null) out.push(["Rush TD",whole(l.rtd)]);
    } else if (["RB","WR","TE"].includes(p.p)) {
      if(l.rec!=null) out.push(["Receptions",whole(l.rec)]);
      if(l.rey!=null) out.push(["Rec yds",whole(l.rey)]);
      if(l.retd!=null) out.push(["Rec TD",whole(l.retd)]);
      if(l.ry!=null) out.push(["Rush yds",whole(l.ry)]);
      if(l.rtd!=null) out.push(["Rush TD",whole(l.rtd)]);
      if(l.sy!=null) out.push(["Scrimmage yds",whole(l.sy)]);
    } else if (p.p!=="OL") {
      if(l.tk!=null) out.push(["Tackles",one(l.tk)]);
      if(l.sk!=null) out.push(["Sacks",one(l.sk)]);
      if(l.tfl!=null) out.push(["TFL",one(l.tfl)]);
      if(l.pd!=null) out.push(["Pass defended",one(l.pd)]);
      if(l.int!=null) out.push(["INT",one(l.int)]);
      if(l.hu!=null) out.push(["Hurries",one(l.hu)]);
    }
    return out.slice(0,6);
  }

  function live2026Section(p) {
    const l=live2026(p);
    if(!l) return '<section class="dossier-section live-season"><div class="section-kicker">2026 season</div><h3>Current-season data unavailable</h3><p>The current evidence payload does not contain a defensible 2026 identity for this prospect.</p></section>';
    const [status,statusClass]=liveStatusLabel(l);
    const stats=liveStatsFor(p,l);
    const bio=[
      l.team ? esc(l.team) : null,
      l.rp ? esc(l.rp) : null,
      l.h!=null ? heightText(l.h) : null,
      l.w!=null ? whole(l.w)+" lb" : null
    ].filter(Boolean).join(" · ");
    const evidence=l.peer!=null
      ? '<div class="live-evidence-line"><span>Peer-relative 2026 production</span><strong>'+pct(l.peer)+'</strong><span>Evidence confidence</span><strong>'+pct(l.conf)+'</strong></div>'
      : '';
    const note=l.note ? '<div class="live-note">'+esc(l.note)+'</div>' : '';
    const olNote=l.muse_private_blocking_received
      ? '<div class="live-note live-note-neutral"><strong>New 2026 blocking evidence received.</strong> Private licensed source records are under validation, so the frozen evaluation and public grades are unchanged. Missing data no longer means a source was not supplied.</div>'
      : l.ds==="OL_NO_TRUSTWORTHY_INDIVIDUAL_BOX_SCORE"
        ? '<div class="live-note live-note-neutral"><strong>No validated 2026 OL evidence.</strong> Public box scores do not provide reliable individual blocking grades. More scouting evidence is required; missing is not a negative score.</div>'
        : '';
    return '<section class="dossier-section live-season">' +
      '<div class="live-season-head"><div><div class="section-kicker">2026 season</div><h3>Current evidence</h3></div><span class="live-status '+statusClass+'">'+esc(status)+'</span></div>' +
      (bio?'<div class="live-bio">'+bio+'</div>':'') +
      (l.gp!=null?'<div class="live-games">'+whole(l.gp)+' games with box-score data</div>':'') +
      (stats.length?'<div class="live-stat-grid">'+stats.map(([k,v])=>liveStat(k,v)).join("")+'</div>':'') +
      evidence+note+olNote+
      '<div class="live-source">Source snapshot: Oct. 7, 2026 · '+(l.source_url?'<a href="'+esc(l.source_url)+'" target="_blank" rel="noopener noreferrer">'+esc(l.source || "Source report")+'</a>':esc(l.source || "ESPN live roster/box data"))+'</div>' +
    '</section>';
  }

  /* modal */
  const backdrop = $("#modalBackdrop"), modal = $("#modal");
  const compareBackdrop = $("#compareBackdrop"), compareModal = $("#compareModal");

  function compareCell(p, label, value, copy="") {
    return '<div class="compare-cell"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong>' +
      (copy ? '<small>'+esc(copy)+'</small>' : '') + '</div>';
  }

  function compareColumn(p) {
    const [take] = takeMeta(p.a,p);
    const [conf] = confidenceMeta(p);
    return '<section class="compare-prospect">' +
      '<div class="compare-prospect-head"><div class="compare-rank">#'+p.r+'</div><div><h3>'+esc(p.n)+'</h3><p>'+esc(p.p)+' · '+esc(p.s)+'</p></div></div>' +
      compareCell(p,"APEX Take",take,shortWhy(p)) +
      compareCell(p,"Confidence",conf,p.ta ? "Projection stability, not talent." : "Topology not covered.") +
      compareCell(p,"Scout priority",p.cr ? "#"+p.cr : "—","Work queue, not talent rank.") +
      compareCell(p,"Evidence edge",p.ee==null ? "—" : one(p.ee),"Current evidence versus the market prior.") +
      compareCell(p,"Fragility",p.fg==null ? "—" : pct(p.fg),"Variation across demonstrated contexts.") +
      compareCell(p,"Information gap",p.ig==null ? "—" : pct(p.ig),"Missing or weakly supported context.") +
      compareCell(p,"Role sensitivity",p.rs==null ? "—" : pct(p.rs),"Change across paired roles/environments.") +
      '<div class="compare-question"><span>What would change our mind?</span><strong>'+esc(p.ctx ? humanContext(p.ctx) : "Next evidence request")+'</strong><p>'+esc(nextQuestion(p))+'</p></div>' +
    '</section>';
  }

  function openCompare(a,b) {
    compareModal.innerHTML =
      '<div class="modal-head"><div><div class="eyebrow">Head-to-head</div><h2 class="modal-name" id="compareModalTitle">'+esc(a.n)+' vs '+esc(b.n)+'</h2><div class="modal-meta">Same APEX surfaces, side-by-side. No synthetic winner.</div></div><button class="modal-close compare-close" aria-label="Close">×</button></div>' +
      '<div class="compare-grid">'+compareColumn(a)+compareColumn(b)+'</div>';
    compareBackdrop.hidden = false;
    document.body.classList.add("modal-open");
    $(".compare-close",compareModal).focus();
  }
  function closeCompare() {
    compareBackdrop.hidden = true;
    document.body.classList.remove("modal-open");
  }
  compareBackdrop.addEventListener("click", e => {
    if (e.target === compareBackdrop || e.target.closest(".compare-close")) closeCompare();
  });
  function metric(label, value, copy, cls="") {
    return '<div class="metric '+cls+'"><div class="metric-label">'+esc(label)+'</div><div class="metric-value">'+esc(value)+'</div><div class="metric-copy">'+esc(copy)+'</div></div>';
  }
  function meter(label, value, copy) {
    const v = value == null ? null : Math.max(0, Math.min(1, value));
    return '<div class="uncertainty-row"><div><strong>'+esc(label)+'</strong><span>'+esc(copy)+'</span></div>' +
      '<div class="uncertainty-value">'+(v==null?'—':Math.round(v*100)+'%')+'</div>' +
      '<div class="uncertainty-track"><i style="width:'+(v==null?0:Math.round(v*100))+'%"></i></div></div>';
  }
  function pffQBSection(p) {
    if(p.p !== "QB") return "";
    const dataset=window.APEX_PFF_QB_2026;
    if(!dataset) return "";
    const row=dataset.rows.find(x=>x[0]===p.r);
    if(!row) return '<section class="dossier-section"><div class="section-kicker">2026 QB evidence</div><h3>No QB charting comparison</h3><p>This prospect has no matching row in the October 2026 16-player sample. Missing data is not a negative evaluation.</p></section>';
    const games=row[1];
    const items=dataset.columns.slice(2).map((name,i)=>[name,"P"+row[i+2]]);
    return '<section class="dossier-section"><div class="section-kicker">2026 quarterback evidence</div><h3>Relative QB charting · '+games+' games</h3>'+
      '<div class="pff-metrics">'+items.map(([k,v])=>'<div><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>').join('')+'</div>'+
      '<p class="fine">Percentiles compare only the 16 QBs in the supplied October 2026 workbook, with direction adjusted so higher is better. They are <strong>not</strong> national percentiles, success probabilities, or adjustments to APEX forecasts. Exact licensed charting values are kept out of the public site.</p></section>';
  }

  function openModal(p) {
    const [take,takeClass]=takeMeta(p.a,p);
    const [conf,confClass]=confidenceMeta(p);
    const [evidence]=evidenceMeta(p);
    const topo = !!p.ta;
    const question = nextQuestion(p);
    modal.innerHTML =
      '<div class="modal-head"><div><div class="eyebrow">2027 prospect dossier</div><h2 class="modal-name" id="modalName">'+esc(p.n)+'</h2><div class="modal-meta">'+esc(p.p)+' · '+esc(p.s)+' · Market rank #'+p.r+'</div></div><button class="modal-close" aria-label="Close">×</button></div>' +
      '<div class="dossier-grid">' +
        metric("APEX Take",take,shortWhy(p),takeClass) +
        metric("Confidence",conf,topo ? "Projection stability, not talent." : "Topology coverage is not available for this prospect.",confClass) +
        metric("2026 Evidence",evidence,"Research status, not forecast certainty.") +
        metric("Scout priority",p.cr ? "#"+p.cr : "—","Where this player sits in the combined work queue.") +
      '</div>' +
      '<section class="dossier-section"><div class="section-kicker">The short version</div><h3>Why APEX is paying attention</h3><p>'+esc(shortWhy(p))+'</p><p class="fine">Frozen Oct. 7 take: '+esc(TAKE[p.a]?.[0] || "Monitor")+'. New evidence has not been scored against the forecast or used to change market rank.</p></section>' +
      live2026Section(p) +
      pffQBSection(p) +
      '<section class="dossier-section spotlight"><div class="section-kicker">What would change our mind?</div><h3>'+esc(p.ctx ? humanContext(p.ctx) : "Next evidence request")+'</h3><p>'+esc(question)+'</p>' +
        (p.ctx ? '<div class="swing-note">This is the context with the greatest estimated ability to change the topology under the frozen weak-vs-strong evidence test.</div>' : '') +
      '</section>' +
      (topo ?
        '<section class="dossier-section"><div class="section-kicker">Projection uncertainty</div><h3>Where the projection is fragile</h3>' +
          meter("Fragility",p.fg,"How much performance varies across demonstrated football contexts.") +
          meter("Information gap",p.ig,"How much expected context is still missing or weakly supported.") +
          meter("Role sensitivity",p.rs,"How much performance changes across paired roles/environments.") +
          meter("Topology stability",p.ts,"How stable the context profile has been across seasons.") +
        '</section>' :
        '<section class="dossier-section"><div class="section-kicker">Topology coverage</div><h3>Not available yet</h3><p>Translation Topology currently covers offense. APEX will not infer a defensive topology score from incomplete data.</p></section>'
      ) +
      '<details class="tech-details"><summary>Technical details</summary><div class="tech-grid">' +
        tech("Market uncertainty",pct(p.mu)) +
        tech("Live evidence confidence",pct(p.ec)) +
        tech("Evidence edge",p.ee==null?"—":one(p.ee)) +
        tech("Market tension",p.mt || "—") +
        tech("Priority driver",p.driver ? p.driver.replaceAll("_"," ") : "Existing front-office layer") +
        tech("Topology freshness",topo ? "through 2025" : "not covered") +
      '</div><p class="fine">Live 2026 evidence is a separate current-season sensor. Translation Topology for this frozen snapshot uses college history through 2025.</p></details>';
    backdrop.hidden = false;
    document.body.classList.add("modal-open");
    $(".modal-close",modal).focus();
  }
  function tech(k,v){ return '<div><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>'; }
  function humanContext(ctx) {
    return String(ctx).split("_").map(part => part ? part.charAt(0).toUpperCase()+part.slice(1) : "").join(" ");
  }
  function closeModal() {
    backdrop.hidden = true;
    document.body.classList.remove("modal-open");
  }
  backdrop.addEventListener("click", e => { if (e.target === backdrop || e.target.closest(".modal-close")) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); closeCompare(); closeSheet(); closeColumnHelp(); closeTeamFormula(); } });

  /* plain-English sheet */
  const sheet = $("#plainEnglishSheet");
  $("#teamFormulaButton").addEventListener("click",()=>{teamFormulaSheet.hidden=false;document.body.classList.add("modal-open");});
  teamFormulaSheet.addEventListener("click",e=>{if(e.target===teamFormulaSheet || e.target.closest("[data-close-team-formula]")) closeTeamFormula();});
  $("#plainEnglishButton").addEventListener("click", () => { sheet.hidden=false; document.body.classList.add("modal-open"); });
  function closeSheet(){ sheet.hidden=true; if(backdrop.hidden) document.body.classList.remove("modal-open"); }
  sheet.addEventListener("click", e => { if(e.target===sheet || e.target.closest("[data-close-sheet]")) closeSheet(); });

  renderWarRoom();
  populateCompare();
  initTeamMode();
  renderTeamMode();
  render();
})();