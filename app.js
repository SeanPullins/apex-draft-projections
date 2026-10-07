/* APEX 2.0 front-end — 2027 decision intelligence. */
(function () {
  "use strict";
  const D = window.APEX2027;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const state = { tab: "board", pos: "ALL", attention: "all", q: "", sort: "r", dir: 1 };

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const pct = v => v == null ? "—" : Math.round(v * 100) + "%";
  const one = v => v == null ? "—" : (+v).toFixed(2);

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
      note: "This is a decision label, not a second draft ranking."
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

  function takeMeta(action) {
    return TAKE[action] || ["Monitor", "take-hold"];
  }

  function confidenceMeta(p) {
    if (!p.ta) return ["Not covered", "status-na"];
    return [p.ta, "status-" + p.ta.toLowerCase()];
  }

  function shortWhy(p) {
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
    return p.tq || p.q || "Continue normal monitoring; no special evidence request is justified yet.";
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
  if (["board","how","validation"].includes(initial)) setTab(initial);

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
    const covered = rows.filter(p => !!p.ta);
    const red = covered.filter(p => p.ta === "RED").length;
    const attention = rows.filter(needsAttention).length;
    const topoDriven = rows.filter(p => p.driver === "TOPOLOGY_UNCERTAINTY").length;
    $("#boardTiles").innerHTML =
      tile("Prospects shown", rows.length, "of " + D.summary.board + " on the frozen 2027 board") +
      tile("Needs attention", attention, "review, data gap, or elevated uncertainty") +
      tile("RED confidence", red, "multiple uncertainty signals — not a talent grade") +
      tile("Topology changed priority", topoDriven, "cases where uncertainty raised scouting priority");
  }
  function tile(label,value,sub){
    return '<div class="tile"><div class="tile-label">'+esc(label)+'</div><div class="tile-value">'+esc(value)+'</div><div class="tile-sub">'+esc(sub)+'</div></div>';
  }

  function render() {
    const rows = filteredRows();
    renderTiles(rows);
    const body = $("#boardBody");
    body.innerHTML = rows.map(p => {
      const [take, takeClass] = takeMeta(p.a);
      const [conf, confClass] = confidenceMeta(p);
      return '<tr data-rank="'+p.r+'">' +
        '<td class="num rank-cell">#'+p.r+'</td>' +
        '<td><div class="player-name">'+esc(p.n)+'</div><div class="player-meta">'+esc(p.p)+' · '+esc(p.s)+'</div></td>' +
        '<td><span class="take '+takeClass+'">'+esc(take)+'</span></td>' +
        '<td><span class="status '+confClass+'">'+esc(conf)+'</span></td>' +
        '<td class="why-cell">'+esc(shortWhy(p))+'</td>' +
        '<td class="num">'+(p.cr ? "#"+p.cr : "—")+'</td>' +
      '</tr>';
    }).join("");
    $$("tr", body).forEach(tr => tr.addEventListener("click", () => {
      const p = D.players.find(x => x.r === +tr.dataset.rank);
      if (p) openModal(p);
    }));
  }

  /* modal */
  const backdrop = $("#modalBackdrop"), modal = $("#modal");
  function metric(label, value, copy, cls="") {
    return '<div class="metric '+cls+'"><div class="metric-label">'+esc(label)+'</div><div class="metric-value">'+esc(value)+'</div><div class="metric-copy">'+esc(copy)+'</div></div>';
  }
  function meter(label, value, copy) {
    const v = value == null ? null : Math.max(0, Math.min(1, value));
    return '<div class="uncertainty-row"><div><strong>'+esc(label)+'</strong><span>'+esc(copy)+'</span></div>' +
      '<div class="uncertainty-value">'+(v==null?'—':Math.round(v*100)+'%')+'</div>' +
      '<div class="uncertainty-track"><i style="width:'+(v==null?0:Math.round(v*100))+'%"></i></div></div>';
  }
  function openModal(p) {
    const [take,takeClass]=takeMeta(p.a);
    const [conf,confClass]=confidenceMeta(p);
    const topo = !!p.ta;
    const question = nextQuestion(p);
    modal.innerHTML =
      '<div class="modal-head"><div><div class="eyebrow">2027 prospect dossier</div><h2 class="modal-name" id="modalName">'+esc(p.n)+'</h2><div class="modal-meta">'+esc(p.p)+' · '+esc(p.s)+' · Market rank #'+p.r+'</div></div><button class="modal-close" aria-label="Close">×</button></div>' +
      '<div class="dossier-grid">' +
        metric("APEX Take",take,shortWhy(p),takeClass) +
        metric("Confidence",conf,topo ? "Projection stability, not talent." : "Topology coverage is not available for this prospect.",confClass) +
        metric("Scout priority",p.cr ? "#"+p.cr : "—","Where this player sits in the combined work queue.") +
      '</div>' +
      '<section class="dossier-section"><div class="section-kicker">The short version</div><h3>Why APEX is paying attention</h3><p>'+esc(p.why || shortWhy(p))+'</p></section>' +
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
    return String(ctx).replaceAll("_"," ").replace(/w/g, m => m.toUpperCase());
  }
  function closeModal() {
    backdrop.hidden = true;
    document.body.classList.remove("modal-open");
  }
  backdrop.addEventListener("click", e => { if (e.target === backdrop || e.target.closest(".modal-close")) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); closeSheet(); closeColumnHelp(); } });

  /* plain-English sheet */
  const sheet = $("#plainEnglishSheet");
  $("#plainEnglishButton").addEventListener("click", () => { sheet.hidden=false; document.body.classList.add("modal-open"); });
  function closeSheet(){ sheet.hidden=true; if(backdrop.hidden) document.body.classList.remove("modal-open"); }
  sheet.addEventListener("click", e => { if(e.target===sheet || e.target.closest("[data-close-sheet]")) closeSheet(); });

  render();
})();