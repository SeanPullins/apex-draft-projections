/* APEX front-end. No dependencies; data ships in data.js as window.APEX. */
(function () {
  "use strict";
  const D = window.APEX;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  const POS_GROUPS = ["ALL", "QB", "RB", "WR", "TE", "OL", "EDGE", "DL", "LB", "DB"];
  const LATEST = Math.max(...D.classes);
  const state = { tab: "board", year: LATEST, pos: "ALL", q: "", sort: "apex", dir: -1,
                  pick: null, lens: "drafted",
                  // Simple by default. The full table is a click away and the
                  // choice is remembered, so an analyst sets it once.
                  view: (function () {
                    try { return localStorage.getItem("apexView") || "simple"; }
                    catch (e) { return "simple"; }
                  })() };

  /* Two ways of scoring the same players. "drafted" is the shipped model, which
     knows where each player went. "predraft" withholds the pick entirely --
     the only lens that could score a class before its draft, and the only
     honest way to read a class that has not had one. The board reads every
     score through whichever lens is active. */
  const LENS = {
    drafted:  { apex: "apex", hit: "ph", starter: "ps", bust: "pbu" },
    predraft: { apex: "qapex", hit: "qh", starter: "qs", bust: "qbu" },
  };
  const lens = () => LENS[state.lens];

  const pct = p => (p == null ? "–" : Math.round(p * 100) + "%");
  // "93th" was appearing wherever a percentile met a bare "th". One helper, used
  // everywhere a rank or percentile is written out in words.
  const ord = n => {
    const v = Math.round(n), t = v % 100;
    if (t >= 11 && t <= 13) return v + "th";
    return v + ({ 1: "st", 2: "nd", 3: "rd" }[v % 10] || "th");
  };
  const ordPct = n => ord(n) + " percentile";
  // How literally to read the score on this card. A 2023 number is not a live
  // projection and never was: the model was trained through 2021, so 2022-2025
  // are frozen predictions made on draft night and 2026 is the only class still
  // open. Calling all three "live" flattened a distinction the whole site rests
  // on.
  function scoreStatus(p) {
    if (p.src === 1) return { short: "held-out historical backtest",
      long: "Held-out historical backtest — his class was kept out of training and scored blind." };
    if (p.yr >= 2026) return { short: "current projection",
      long: "Current projection — this class has not played an NFL snap." };
    return { short: "frozen " + p.yr + " draft-night projection",
      long: "Frozen " + p.yr + " draft-night projection — made before he played, never revised since." };
  }
  const fmt1 = v => (v == null ? "–" : (+v).toFixed(1));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- theme ---------- */
  $("#themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme === "dark" ||
      (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    root.dataset.theme = dark ? "light" : "dark";
    renderCharts(); // re-render SVGs against new surface
  });

  /* ---------- tabs + hash ----------
     #board/2023 selects a class, #board/2023/6 opens that pick's card, so any
     player on the site is a shareable link and the back button works. */
  const HASH = /^#(board|proj|insights|watch|method)(?:\/(\d{4}))?(?:\/(\d{1,3}))?/;
  let ownHash = false;
  function writeHash() {
    const h = state.tab !== "board" ? "#" + state.tab
      : "#board/" + state.year + (state.pick != null ? "/" + state.pick : "");
    if (location.hash !== h) { ownHash = true; location.hash = h; }
  }
  function setTab(tab, skipHash) {
    state.tab = tab;
    $$(".tab").forEach(b => {
      const on = b.dataset.tab === tab;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on);
    });
    $$(".tab-panel").forEach(p => p.classList.toggle("is-active", p.id === "tab-" + tab));
    if (!skipHash) writeHash();
  }
  $$(".tab").forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));

  function readHash() {
    const m = location.hash.match(HASH);
    if (!m) return;
    if (m[2] && D.classes.includes(+m[2])) state.year = +m[2];
    state.tab = m[1];
    state.pick = m[3] ? +m[3] : null;
  }
  readHash();
  addEventListener("hashchange", () => {
    if (ownHash) { ownHash = false; return; }
    const before = state.year;
    readHash();
    setTab(state.tab, true);
    if (state.year !== before) { classSelect.value = state.year; renderBoard(); }
    const p = state.pick != null && findPick(state.year, state.pick);
    if (p) openModal(p, true); else closeModal(true);
  });
  const findPick = (yr, pk) => D.players.find(x => x.yr === yr && x.pk === pk);

  /* ---------- board controls ---------- */
  const classSelect = $("#classSelect");
  [...D.classes].sort((a, b) => b - a).forEach(y => {
    const o = document.createElement("option");
    o.value = y;
    o.textContent = y + (y > 2021 ? " · projection" : " · backtest");
    classSelect.appendChild(o);
  });
  classSelect.value = state.year;
  classSelect.addEventListener("change", () => {
    state.year = +classSelect.value;
    state.pick = null;
    writeHash();
    renderBoard();
  });

  const pills = $("#posPills");
  POS_GROUPS.forEach(pg => {
    const b = document.createElement("button");
    b.className = "pill" + (pg === state.pos ? " is-active" : "");
    b.textContent = pg;
    b.addEventListener("click", () => {
      state.pos = pg;
      $$(".pill", pills).forEach(x => x.classList.toggle("is-active", x.textContent === pg));
      renderBoard();
    });
    pills.appendChild(b);
  });

  let qTimer;
  $("#searchBox").addEventListener("input", e => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); renderBoard(); }, 120);
  });
  wireFilm("#boardFilm", "#boardFilmWrap", D.players,
           on => { state.film = on; renderBoard(); });

  /* ---------- board table ---------- */
  // Quarterbacks only. Off the position the measurement does not exist, and a
  // blank is the honest cell -- a 0 would read as a terrible score rather than
  // as "not applicable here".
  // A bare "p93" is a convention, not a communication. The cell now says how
  // high it is and carries the exact figure on hover, so a fan reads a word and
  // an analyst still gets the number.
  const pctlWord = v => (v >= 90 ? "Very high" : v >= 70 ? "High"
                       : v >= 40 ? "Average" : v >= 20 ? "Low" : "Very low");
  const holdCell = p => (p.qbp == null
    ? '<span class="na" title="only measured for quarterbacks">–</span>'
    : '<b title="' + ordPct(p.qbp) + ' among drafted quarterbacks since 2014">' +
      pctlWord(p.qbp) + "</b>");

  // Outlook in words, taken straight from the published probability the analyst
  // table shows in the same row. No new number, no new judgement -- a label for
  // one that is already there.
  function outlookCell(p) {
    const v = p[lens().hit];
    if (v == null) return '<span class="na">–</span>';
    const w = outlookWord(v);
    return '<span class="outlook o-' + (v >= 0.60 ? "hi" : v >= 0.40 ? "mid" : v >= 0.22 ? "lo" : "vlo") +
      '" title="' + pct(v) + ' chance of a top-quartile career at his position">' + w[0] + "</span>";
  }

  const COLS = [
    { key: "rk", label: "Model rank", num: true },
    { key: "pk", label: "Draft pick", num: true },
    { key: "nm", label: "Player" },
    { key: "pg", label: "Pos" },
    { key: "apex", label: "APEX", num: true },
    { key: "ph", label: "Strong career", num: true },
    { key: "ps", label: "Starter", num: true },
    { key: "pbu", label: "Disappointment risk", num: true },
    { key: "ras", label: "Athletic score", num: true },
    // quarterbacks only; blank for everyone else, since the measurement does not
    // exist off the position and a zero would read as a bad score
    { key: "qbp", label: "Pocket poise", num: true, qbOnly: true },
    { key: "vd", label: "Model vs draft", num: true },
    { key: "out", label: "So far", sortKey: "wav" },
  ];
  // The reduced board. Same rows, same order, same numbers -- fewer of them, so
  // a reader who does not know what RAS is can still work down the page.
  const SIMPLE_COLS = [
    { key: "rk", label: "Model rank", num: true },
    { key: "nm", label: "Player" },
    { key: "pg", label: "Pos" },
    { key: "pk", label: "Draft pick", num: true },
    { key: "apex", label: "APEX", num: true },
    { key: "outlook", label: "Outlook", sortKey: "ph" },
    { key: "out", label: "So far", sortKey: "wav" },
  ];
  const activeCols = () => (state.view === "analyst" ? COLS : SIMPLE_COLS);

  const head = $("#boardHead");
  function buildHead() {
    head.innerHTML = "";
    activeCols().forEach(c => {
      const th = document.createElement("th");
      th.textContent = c.label;
      if (c.num) th.classList.add("num");
      th.classList.add("c-" + c.key);
      th.dataset.key = c.key;
      th.title = "Sort by " + c.label;
      th.addEventListener("click", () => {
        const k = c.sortKey || c.key;
        if (state.sort === k) state.dir *= -1;
        else { state.sort = k; state.dir = k === "pk" || k === "rk" ? 1 : -1; }
        renderBoard();
      });
      head.appendChild(th);
    });
  }
  buildHead();

  let filmEligible = 0;
  function rowsForState() {
    let rows;
    if (state.q) {
      rows = D.players.filter(p =>
        (p.nm || "").toLowerCase().includes(state.q) ||
        (p.cl || "").toLowerCase().includes(state.q) ||
        (p.tm || "").toLowerCase().includes(state.q));
    } else {
      rows = D.players.filter(p => p.yr === state.year);
    }
    if (state.pos !== "ALL") rows = rows.filter(p => p.pg === state.pos);
    // counted here, on exactly the rows the filter is about to be applied to.
    // Counting the whole payload instead is what put "(86)" on a 2023 board
    // holding three charted players.
    filmEligible = rows.filter(p => p.film).length;
    if (state.film) rows = rows.filter(p => p.film);
    // the sort keys name the drafted fields; route them through the active lens
    // so clicking "APEX" sorts the pre-draft board by its own score
    const L = lens();
    const remap = { apex: L.apex, ph: L.hit, ps: L.starter, pbu: L.bust };
    const k = remap[state.sort] || state.sort, dir = state.dir;
    // ties fall back to board rank, so equal values never shuffle arbitrarily
    const byRank = (a, b) => (a.rk || 1e9) - (b.rk || 1e9) || (a.yr - b.yr);
    rows = rows.slice().sort((a, b) => {
      const av = a[k], bv = b[k];
      if (av == null && bv == null) return byRank(a, b);
      if (av == null) return 1;
      if (bv == null) return -1;
      return av < bv ? -dir : av > bv ? dir : byRank(a, b);
    });
    return state.q ? rows.slice(0, 250) : rows;
  }

  // Bust risk gets its own colour ramp rather than the plain probability
  // styling: it is the number the model beats the draft order at most clearly,
  // and it reads backwards from every other column (high is bad).
  function riskCell(v) {
    if (v == null) return '<span class="prob">–</span>';
    const cls = v >= 0.45 ? "risk-hi" : v >= 0.28 ? "risk-mid" : "risk-lo";
    return '<span class="risk ' + cls + '">' + pct(v) + "</span>";
  }

  function outcomeCell(p) {
    if (p.src === 1) {          // career finished (or near enough): final verdict
      const b = [];
      if (p.lh) b.push('<span class="badge badge-hit">✓ HIT</span>');
      if (p.ls) b.push('<span class="badge badge-st">STARTER</span>');
      if (p.pb > 0) b.push('<span class="badge badge-pb">★ PB×' + p.pb + "</span>");
      if (!b.length) b.push('<span class="badge badge-none">—</span>');
      return b.join("");
    }
    if (p.ns > 0) {             // career in progress: how it is tracking so far
      const b = [];
      if (p.pb > 0) b.push('<span class="badge badge-pb">★ PB×' + p.pb + "</span>");
      else if (p.fh) b.push('<span class="badge badge-early">TOP 25%</span>');
      else if (p.fs) b.push('<span class="badge badge-early">STARTING</span>');
      else if (!p.wav) b.push('<span class="badge badge-none">—</span>');
      if (p.wav) b.push('<span class="prob">AV ' + p.wav + "</span>");
      return b.join("");
    }
    return '<span class="prob">not yet played</span>';
  }

  const viewPills = $("#viewPills");
  if (viewPills) {
    [["simple", "Simple"], ["analyst", "Analyst"]].forEach(([k, lbl]) => {
      const b = document.createElement("button");
      b.className = "pill" + (k === state.view ? " is-active" : "");
      b.textContent = lbl;
      b.setAttribute("aria-pressed", String(k === state.view));
      b.addEventListener("click", () => {
        state.view = k;
        try { localStorage.setItem("apexView", k); } catch (e) {}
        $$(".pill", viewPills).forEach(x => {
          const on = x.textContent === lbl;
          x.classList.toggle("is-active", on);
          x.setAttribute("aria-pressed", String(on));
        });
        // the sort key may not exist in the reduced set; fall back to the score
        if (!activeCols().some(c => (c.sortKey || c.key) === state.sort)) {
          state.sort = "apex"; state.dir = -1;
        }
        buildHead();
        renderBoard();
      });
      viewPills.appendChild(b);
    });
  }

  const lensPills = $("#lensPills");
  if (lensPills) {
    [["drafted", "As drafted"], ["predraft", "Pre-draft (no pick)"]].forEach(([v, lbl]) => {
      const b = document.createElement("button");
      b.className = "pill" + (v === state.lens ? " is-active" : "");
      b.textContent = lbl;
      b.addEventListener("click", () => {
        state.lens = v;
        $$(".pill", lensPills).forEach(x => x.classList.toggle("is-active", x.textContent === lbl));
        renderBoard();
      });
      lensPills.appendChild(b);
    });
  }

  function renderBoard() {
    const rows = rowsForState();
    setFilmCount("#boardFilmWrap", filmEligible);
    const band = $("#lensBand");
    if (band) {
      band.hidden = state.lens !== "predraft";
      if (state.lens === "predraft") {
        band.innerHTML =
          "<strong>Scored without the draft.</strong> These are the same players run through " +
          "a model that is never told where they were picked — only testing, college " +
          "production, grades, age and size. It is the only version that could score a class " +
          "before its draft, so it is what a 2027 board would look like. " +
          "<strong>It is also markedly worse at finding hits</strong>: on classes it had never " +
          "seen it reaches 0.691 AUC against 0.821 for draft position alone, and that gap is " +
          "wider out of sample than in backtest. On <em>bust risk</em> it is the better of the " +
          "two (0.627 against 0.582), which is the one place withholding the pick genuinely " +
          "pays. Board rank, tiers and value-vs-slot are hidden here because all three are " +
          "defined against draft position.";
      }
    }
    // header sort indicators
    const AC = activeCols();
    $$("th", head).forEach((th, i) => {
      if (!AC[i]) return;
      const k = AC[i].sortKey || AC[i].key;
      // the score column is not APEX when the pick is withheld, and calling it
      // APEX would claim the two numbers are the same thing
      if (k === "apex" || k === "rk") {
        const preLbl = { apex: "PRE-DRAFT", rk: "PRE-DRAFT RK" };
        th.childNodes[0].nodeValue =
          state.lens === "predraft" ? preLbl[k] : AC[i].label;
      }
      th.classList.toggle("sorted", k === state.sort);
      const a = th.querySelector(".arrow");
      if (a) a.remove();
      if (k === state.sort) {
        const s = document.createElement("span");
        s.className = "arrow";
        s.textContent = state.dir === -1 ? "▼" : "▲";
        th.appendChild(s);
      }
    });

    const body = $("#boardBody");
    // Tier bands only mean something on a board ordered by APEX. Sort by pick or
    // by RAS and the tiers would still be numbered 1,2,3 down the page while no
    // longer describing anything, so they are dropped outside that ordering.
    // Filtered to a position, tier by that position's own peers. Class tiers
    // down a list of quarterbacks read 1, 7, 12 with gaps where the other
    // positions were -- which looks broken, and implies a comparison the
    // filtered board is not making.
    const L = lens();
    const pre = state.lens === "predraft";
    // Tiers, board rank and value-vs-slot are all computed from the shipped
    // model's score against draft position. None of them describe the pre-draft
    // score, so rather than relabel them they are stood down in that lens.
    const tierKey = state.pos === "ALL" ? "tier" : "tierp";
    const showTiers = !pre && state.sort === "apex" && state.dir === -1 && !state.q
      // tiers describe a whole class; drawn over a filtered subset their
      // boundaries claim a grouping that is no longer there
      && !state.film
      && rows.some(p => p[tierKey] != null);
    const tierSize = {};
    if (showTiers) rows.forEach(p => { tierSize[p[tierKey]] = (tierSize[p[tierKey]] || 0) + 1; });
    let lastTier = null;

    let preRank = 0;
    body.innerHTML = rows.map(p => {
      let sep = "";
      if (pre) preRank++;
      if (showTiers && p[tierKey] !== lastTier) {
        lastTier = p[tierKey];
        const n = tierSize[p[tierKey]];
        const what = state.pos === "ALL" ? (n === 1 ? "player" : "players")
          : (n === 1 ? state.pos : state.pos + "s");
        sep = '<tr class="tier-row"><td colspan="' + AC.length + '">' +
          '<span class="tier-name">' + (state.pos === "ALL" ? "" : state.pos + " ") +
          "Tier " + p[tierKey] + "</span>" +
          '<span class="tier-meta">' + n + " " + what +
          (n > 1 ? " the model can’t separate" : "") + "</span></td></tr>";
      }
      const meta = [p.cl, p.tm, state.q ? p.yr : null].filter(Boolean).join(" · ");
      const vd = pre || p.vd == null ? '<span class="delta-flat">–</span>'
        : p.vd > 4 ? '<span class="delta-up">▲ ' + p.vd + "</span>"
        : p.vd < -4 ? '<span class="delta-down">▼ ' + (-p.vd) + "</span>"
        : '<span class="delta-flat">·</span>';
      const score = p[L.apex];
      // One definition per column, shared by both views, so Simple and Analyst
      // can never disagree about what a cell says.
      const CELL = {
        rk: () => '<td class="num c-rk">' + (pre ? preRank : (p.rk ?? "–")) + "</td>",
        pk: () => '<td class="num c-pk">' + (p.pk ?? "–") + "</td>",
        nm: () => '<td class="player-cell c-nm"><div class="player-name">' + esc(p.nm) +
          filmTag(p) + '</div><div class="player-meta">' + esc(meta) + "</div></td>",
        pg: () => '<td class="c-pg"><span class="pos-chip">' + p.pg + "</span></td>",
        apex: () => '<td class="c-apex"' +
          (!pre && p.sd != null ? ' title="± ' + p.sd.toFixed(1) + ' if the model had been trained on a different sample of draft history"' : "") +
          '><div class="score-cell"><span class="score-num">' + fmt1(score) + '</span>' +
          (!pre && p.sd != null ? '<span class="score-sd">± ' + p.sd.toFixed(1) + "</span>" : "") +
          '<span class="meter"><i style="width:' + Math.min(100, score || 0) + '%"></i></span></div></td>',
        ph: () => '<td class="num prob c-ph">' + pct(p[L.hit]) + "</td>",
        ps: () => '<td class="num prob c-ps">' + pct(p[L.starter]) + "</td>",
        pbu: () => '<td class="num c-pbu">' + riskCell(p[L.bust]) + "</td>",
        ras: () => '<td class="num prob c-ras"' +
          (p.ras == null ? ' title="no combine or pro-day workout on record"' : "") + ">" +
          (p.ras != null ? p.ras.toFixed(2) : "–") + "</td>",
        qbp: () => '<td class="num c-qbp">' + holdCell(p) + "</td>",
        vd: () => '<td class="num c-vd">' + vd + "</td>",
        outlook: () => '<td class="c-outlook">' + outlookCell(p) + "</td>",
        out: () => '<td class="c-out">' + outcomeCell(p) + "</td>",
      };
      return sep + "<tr data-id='" + p.yr + ":" + p.pk + "'>" +
        AC.map(c => (CELL[c.key] ? CELL[c.key]() : "<td></td>")).join("") + "</tr>";
    }).join("");
    $$("tr[data-id]", body).forEach(tr => tr.addEventListener("click", () => {
      const [yr, pk] = tr.dataset.id.split(":").map(Number);
      const p = D.players.find(x => x.yr === yr && x.pk === pk);
      if (p) openModal(p);
    }));

    renderTiles(rows);
  }

  const fwdClass = yr => (D.forward && D.forward.head_to_head || []).find(r => r.yr === yr);

  function renderTiles(rows) {
    const t = $("#boardTiles");
    const scope = state.q ? rows : D.players.filter(p => p.yr === state.year);
    const hist = !state.q && state.year <= D.train_years[1];
    const fwd = state.q ? null : fwdClass(state.year);
    // the tiles state facts about the score being shown, so they read through
    // the same lens as the table -- a "Board #1" from the drafted model sitting
    // above a pre-draft ranking would name a player who is not top of the list
    const L = lens(), pre = state.lens === "predraft";
    const top = scope.slice().sort((a, b) => (b[L.apex] || 0) - (a[L.apex] || 0))[0];
    const expHits = scope.reduce((s, p) => s + (p[L.hit] || 0), 0);
    const actHits = scope.filter(p => p.lh).length;
    const S = D.backtest.summary;
    const dep = pre ? S.predraft.hit.auc : S.deploy.hit.auc, mkt = S.market.hit.auc;
    const edgeLabel = pre ? "Cost of hiding the pick" : "Model edge";
    const edgeVal = ((dep - mkt) * 100).toFixed(1);
    const edgeTile = () => tile(edgeLabel, (dep >= mkt ? "+" : "") + edgeVal,
      pre ? "AUC pts vs draft-slot prior, held-out" : "AUC pts vs draft-slot prior, held-out");

    let third, fourth;
    if (hist) {
      third = tile("Hits delivered", actHits, "of " + expHits.toFixed(0) + " the model expected");
      fourth = edgeTile();
    } else if (fwd) {
      const onTrack = scope.filter(p => p.fh).length;
      third = tile("Tracking so far", onTrack,
        "top-quartile at their position, " + fwd.seasons + " season" + (fwd.seasons > 1 ? "s" : "") + " in");
      fourth = tile("Board vs draft order", pct(fwd.m32) + " · " + pct(fwd.d32),
        "top-quartile rate: APEX top 32 vs picks 1–32");
    } else {
      third = tile("Projected hits", expHits.toFixed(0), "expected top-quartile careers");
      fourth = edgeTile();
    }

    t.innerHTML =
      tile(state.q ? "Search results" : state.year + " draft class", scope.length, "drafted players scored") +
      tile(pre ? "Pre-draft #1" : "Board #1", top ? esc(top.nm) : "–",
           top ? top.pg + " · " + (pre ? "score " : "APEX ") + fmt1(top[L.apex]) : "") +
      third + fourth;

    $("#modeNote").innerHTML = state.q
      ? "Searching all classes 2000–" + LATEST + ". Clear the search to return to the class board."
      : hist
        ? '<span class="dot">●</span> <strong>Receipts mode.</strong> Scores for ' + state.year + " come from a model that never saw this class (leave-one-year-out backtest). The Outcome column shows what actually happened."
        : fwd
          ? '<span class="dot dot-live"></span> <strong>Forward test.</strong> The ' + state.year + " board was frozen on draft night, before anyone in this class played an NFL snap. " + fwd.seasons + " season" + (fwd.seasons > 1 ? "s are" : " is") + " now in the books — Outcome shows careers to date, not final grades."
          : '<span class="dot">●</span> <strong>Projection mode.</strong> True out-of-sample predictions — the model trained only on 2000–2021 outcomes. No NFL snaps played yet.';
  }
  const tile = (label, value, sub) =>
    '<div class="tile"><div class="tile-label">' + label + '</div><div class="tile-value">' + value + '</div><div class="tile-sub">' + sub + "</div></div>";

  /* ---------- modal ---------- */
  const backdrop = $("#modalBackdrop"), modal = $("#modal");
  let lastFocus = null;
  /* Why a player's two scores disagree, in words, from his own numbers.

     The model is a three-way decomposition and the card can just say so: what
     draft slot alone implies (mh), what the player's own profile alone implies
     (qh), and where the published number landed between them. The "why" is then
     whichever inputs are actually extreme for this player, not a template.

     The one thing this must not do is let a missing workout read as a bad one.
     Players with no testing on record score low pre-draft because the block
     carrying nearly all of the model's edge is empty, and they average a +5.7
     gap against -0.9 for tested players. That is absence, not evidence, and it
     gets said first when it applies. */
  function gapStory(p) {
    if (p.qh == null || p.qapex == null || p.apex == null) return "";
    const gap = p.apex - p.qapex;
    const rose = gap >= 8, fell = gap <= -8;
    const bits = [];

    // 1. the decomposition, in the player's own numbers
    let lead = "<p><strong>Where the two numbers come from.</strong> ";
    if (p.mh != null) {
      const lo = Math.min(p.mh, p.qh), hi = Math.max(p.mh, p.qh);
      // The published figure is not a weighted average of the other two: the
      // three tiers are calibrated separately and blended in log-odds, so it can
      // and does land outside both. Say which actually happened rather than
      // asserting "between" and being wrong for a third of the board.
      let where;
      if (p.ph >= lo && p.ph <= hi) {
        where = "sits between the two" + (Math.abs(p.ph - p.mh) < Math.abs(p.ph - p.qh)
          ? ", nearer the draft — the ordering the backtest supports, since on this question a " +
            "pick number is worth several times every scouting input combined"
          : ", nearer his own profile");
      } else {
        where = "lands " + (p.ph > hi ? "above" : "below") + " both, which a blend is allowed to " +
          "do here: the three are separate models with separate calibrations, combined in " +
          "log-odds rather than averaged";
      }
      lead += "Draft position alone puts his odds of a top-quartile career at <b>" + pct(p.mh) +
        "</b>. Everything known about the player and nothing about his pick puts them at <b>" +
        pct(p.qh) + "</b>. The published figure, <b>" + pct(p.ph) + "</b>, " + where + ".";
    } else {
      lead += "His profile alone implies <b>" + pct(p.qh) + "</b>; the published figure is <b>" +
        pct(p.ph) + "</b>.";
    }
    bits.push(lead + "</p>");

    // 2. why they disagree — only reasons this player actually has
    const why = [];
    const untested = p.ras == null;
    if (untested) {
      why.push("<strong>He has no workout on record.</strong> No combine or pro-day numbers means " +
        "the athletic block — where essentially the model's whole edge over the draft order lives — " +
        "is empty for him, so his pre-draft score is closer to <em>unknown</em> than to <em>poor</em>. " +
        "Untested players average a gap of +5.7 points against −0.9 for tested ones, so a good part " +
        "of the distance between his two numbers is missing data rather than disagreement.");
    } else if (p.rasp != null && p.rasp >= 70) {
      why.push("He <strong>tested well</strong> — RAS " + p.ras.toFixed(2) + ", around the " +
        ordPct(p.rasp) + " for his position. Athleticism is the input the pre-draft " +
        "model leans on hardest, so this is most of what is holding that number up.");
    } else if (p.rasp != null && p.rasp <= 30) {
      why.push("He <strong>tested poorly</strong> — RAS " + p.ras.toFixed(2) + ", about the " +
        ordPct(p.rasp) + " at his position — and athleticism is the block the " +
        "pre-draft model weights most heavily, so it pulls his profile score down hard.");
    }
    if (p.pffp != null && p.pffp >= 80) {
      why.push("His college grades were <strong>strong</strong> (" + ordPct(p.pffp) +
        " at his position), which helps, though production is worth roughly a tenth of what " +
        "testing is worth to this model.");
    } else if (p.pffp != null && p.pffp <= 25) {
      why.push("His college grades sat <strong>low for the position</strong> (" +
        ordPct(p.pffp) + "), a modest drag on the profile score.");
    }
    if (p.age != null && p.age <= 21) {
      why.push("He was <strong>young for the class</strong> at " + p.age + ", which the model treats as a plus.");
    } else if (p.age != null && p.age >= 24) {
      why.push("He was <strong>old for a rookie</strong> at " + p.age + ", which counts against him.");
    }

    if (why.length) {
      bits.push("<p><strong>" + (rose ? "Why the draft rated him higher"
        : fell ? "Why the draft rated him lower" : "What is driving each number") +
        ".</strong></p><ul class=\"gap-why\"><li>" + why.join("</li><li>") + "</li></ul>");
    }

    // 3. what to take from it, including the case where the two agree
    let close;
    if (rose) {
      close = "The league spent pick " + p.pk + " on him and the model's own inputs did not see " +
        "why — a gap of " + gap.toFixed(1) + " points. That is not evidence the draft was wrong. " +
        "Teams hold medicals, interviews and film that never reach a spreadsheet, and historically " +
        "the pick has been the better predictor of who becomes good.";
    } else if (fell) {
      close = "His own profile rated him " + Math.abs(gap).toFixed(1) + " points above where he was " +
        "picked — the model saw more than the league paid for. Read it with care: on finding hits " +
        "the draft order still beats the player-only model by a wide margin, so this is a flag " +
        "rather than a verdict.";
    } else {
      close = "The two agree to within " + Math.abs(gap).toFixed(1) + " points, so the draft and " +
        "this model are telling the same story about him — the published number is not leaning on " +
        "his pick to get there.";
    }
    if (p.qbu != null && p.pbu != null) {
      close += " On <strong>bust risk</strong> the ordering reverses: there the player-only model " +
        "is the better of the two, so his pre-draft figure of " + pct(p.qbu) + " carries more " +
        "weight than the " + pct(p.pbu) + " next to it.";
    }
    bits.push('<p class="gap-close">' + close + "</p>");
    return '<div class="gap-story">' + bits.join("") + "</div>";
  }

  /* ---------- plain-English card copy ----------
     Assembled from fields already on the row, with no new judgement of any kind.
     Every clause below is a restatement of a number the card also shows: the
     rank, the pick, the published probability, and whichever inputs are actually
     extreme for this player. Nothing here reads the film or invents a trait --
     the film has its own section and says who wrote it.

     The point is that a reader should be able to stop after three sentences and
     have the gist. The technical account is still on the card, one click down. */
  function outlookWord(v) {
    if (v == null) return null;
    if (v >= 0.60) return ["strong", "one of the better bets in his class"];
    if (v >= 0.40) return ["solid", "a better-than-even chance of a real career"];
    if (v >= 0.22) return ["middling", "roughly the typical outcome for his draft range"];
    return ["long-odds", "a below-average shot at a lasting career"];
  }

  function cardSummary(p) {
    const s = [];
    const st = scoreStatus(p);
    // 1. where the model had him against where the league did
    let one = "The model ranked him <b>" + ord(p.rk) + "</b> in the " + p.yr + " class";
    if (p.prk != null) one += " and " + ord(p.prk) + " among " + p.pg + "s";
    one += p.pk != null ? "; the league took him at <b>pick " + p.pk + "</b>." : ".";
    s.push(one);

    // 2. the headline outlook, in words, tied to the number shown above
    const ow = outlookWord(p.ph);
    if (ow) {
      s.push("It gave him " + ow[1] + " — <b>" + pct(p.ph) +
        "</b> to build a strong NFL career" +
        (p.src === 1 ? ", scored with his class held out of training" : "") + ".");
    }

    // 3. strongest input, then the most important gap — whichever he actually has
    const up = [], down = [];
    if (p.rasp != null && p.rasp >= 70) up.push("he tested near the top of his position (" + ordPct(p.rasp) + ")");
    if (p.pffp != null && p.pffp >= 75) up.push("his college grades beat most drafted " + p.pg + "s (" + ordPct(p.pffp) + ")");
    if (p.age != null && p.age <= 21) up.push("he was young for the class at " + p.age);
    if (p.pk != null && p.pk <= 32) up.push("first-round picks succeed far more often than the rest of the draft");
    if (p.ras == null) down.push("he has no combine or pro-day workout on record, which empties the input this model leans on hardest");
    else if (p.rasp != null && p.rasp <= 30) down.push("he tested poorly for the position (" + ordPct(p.rasp) + ")");
    if (p.pffp != null && p.pffp <= 25) down.push("his college grades sat low for a drafted " + p.pg + " (" + ordPct(p.pffp) + ")");
    if (p.age != null && p.age >= 24) down.push("he was old for a rookie at " + p.age);
    if (!p.sig || !p.sig.length) {
      if (POS_NO_SIGNAL[p.pg] && p.pg !== "QB") down.push("nothing measurable at his position has reliably predicted NFL success, so his pick carries almost all of the signal");
    }
    let three = "";
    if (up.length) three += "The strongest thing in his favour: " + up[0] + ".";
    if (down.length) three += (three ? " " : "") + "The biggest gap: " + down[0] + ".";
    if (three) s.push(three);

    return '<p class="card-summary">' + s.join(" ") + "</p>";
  }

  /* Two or three reasons, in the reader's language, for why the number is what
     it is. Deliberately not the calibration story -- that lives one click down
     under "How the model reached this score". */
  function whyBullets(p) {
    const b = [];
    if (p.pk != null && p.mh != null) {
      b.push("Selected at <b>pick " + p.pk + "</b>. On its own, that draft slot has " +
        "historically produced a strong career " + pct(p.mh) + " of the time — and where a " +
        "player is picked still predicts this better than everything else combined.");
    }
    if (p.pffp != null) {
      b.push("His college grade was better than <b>" + Math.round(p.pffp) + "%</b> of drafted " +
        p.pg + "s.");
    }
    if (p.ras == null) {
      b.push("<b>No complete combine or pro-day workout was available.</b> That is missing " +
        "information rather than a poor result, and it is the input the model weighs most.");
    } else if (p.rasp != null) {
      b.push("Athletic testing put him at the <b>" + ordPct(p.rasp) + "</b> for his position " +
        "(RAS " + p.ras.toFixed(2) + ").");
    }
    if (p.age != null && (p.age <= 21 || p.age >= 24)) {
      b.push("He entered the league at <b>" + p.age + "</b>, which the model treats as " +
        (p.age <= 21 ? "a plus" : "a negative") + ".");
    }
    return b.slice(0, 3);
  }

  function openModal(p, fromHash) {
    lastFocus = document.activeElement;
    if (!fromHash && p.yr === state.year && state.tab === "board") {
      state.pick = p.pk;
      writeHash();
    }
    // Renamed for a reader who does not already know the jargon. The underlying
    // fields, definitions and numbers are untouched; only the labels change, and
    // the exact definition is on the tooltip and in the methodology section.
    const probs = [
      ["Strong NFL career", p.ph, p.mh, false,
       "Top-quartile career value among players at his position from the same draft class."],
      ["Long-term starter", p.ps, p.ms, false,
       "Started at least three NFL seasons."],
      ["Makes a Pro Bowl", p.pp, p.mp, false,
       "Named to at least one Pro Bowl."],
      ["Disappoints for his draft position", p.pbu, p.mbu, true,
       "Finished in the bottom quarter of career value among picks made in the same range of the draft."],
    ];
    const facts = [];
    facts.push(["Draft capital", "Pick " + p.pk + " · Round " + (p.rd || "–") + (p.tm ? " · " + esc(p.tm) : "")]);
    facts.push(["Age at draft", p.age != null ? p.age : "–"]);
    facts.push(["Athletic score (RAS 0–10)", p.ras != null ? p.ras.toFixed(2) + pctlNote(p.rasp)
      : '<span class="pctl">did not test — no combine/pro-day workout on record</span>']);
    facts.push(["College grade", p.pffp != null ? ordPct(p.pffp) + ' <span class="pctl">among drafted players at his position</span>' : "not covered"]);
    facts.push(["Model rank in class", "#" + p.rk + " overall · #" + p.prk + " " + p.pg +
      (p.tier != null ? ' <span class="pctl">class tier ' + p.tier +
        (p.tierp != null ? " · " + p.pg + " tier " + p.tierp : "") + "</span>" : "")]);
    facts.push(["Model vs draft order", p.vd == null ? "–" : p.vd > 0 ? "model higher by " + p.vd : p.vd < 0 ? "model lower by " + (-p.vd) : "aligned"]);

    const story = gapStory(p);

    let predraft = "";
    if (p.qh != null) {
      const dh = Math.round((p.ph - p.qh) * 100);
      const verdict = dh >= 8 ? "the draft raised him" : dh <= -8 ? "the draft lowered him"
        : "the draft agreed";
      predraft =
        '<div class="predraft"><div class="predraft-h">Before the draft ' +
        '<span class="predraft-tag">' + verdict + "</span></div>" +
        '<div class="predraft-row"><span>Strong career</span><b>' + pct(p.qh) + "</b>" +
        '<span class="predraft-arrow">→ ' + pct(p.ph) + "</span></div>" +
        (p.qbu != null ? '<div class="predraft-row"><span>Disappointment risk</span><b>' + pct(p.qbu) +
          "</b><span class=\"predraft-arrow\">→ " + pct(p.pbu) + "</span></div>" : "") +
        '<p class="fine">Left: the model given only the player — testing, production, ' +
        'college grades, age — and no idea where he was picked. Right: the published ' +
        'number, which also knows his draft slot. On a strong career the draft is worth far ' +
        'more than everything else combined; on disappointment risk it adds almost nothing.</p>' +
        story + "</div>";
    }

    const signals = signalsPanel(p, true);
    const comps = compsPanel(p, true);
    const film = filmPanel(p);
    const st = scoreStatus(p);

    // Moved to the top of the card for anyone whose career has begun. What
    // actually happened outranks what was predicted about it, and burying the
    // result under the methodology had that backwards.
    let outcome = "";
    if (p.src === 1) {
      const bits = [];
      bits.push(p.lh ? "✓ Top-quarter career value at his position" : "✗ Did not reach top-quarter career value");
      bits.push(p.ls ? "✓ Started 3+ seasons" : "✗ Under 3 seasons started");
      if (p.pb > 0) bits.push("★ " + p.pb + "× Pro Bowl" + (p.ap > 0 ? " · " + p.ap + "× All-Pro" : ""));
      const stats = ["Career value " + (p.wav ?? 0), (p.g ?? 0) + " games", (p.st ?? 0) + " seasons started"].join(" · ");
      outcome = '<div class="outcome-band"><strong>How it turned out:</strong> ' + bits.join(" · ") +
        '<br><span class="prob">' + stats + "</span></div>";
    } else if (p.ns > 0) {
      const bits = [];
      if (p.fh) bits.push("✓ Top-quarter career value at his position so far");
      if (p.fs) bits.push("✓ 2+ seasons started");
      if (p.pb) bits.push("★ " + p.pb + "× Pro Bowl" + (p.ap > 0 ? " · " + p.ap + "× All-Pro" : ""));
      if (!bits.length) bits.push("Not yet tracking as a top-quarter career");
      const stats = ["Career value " + (p.wav ?? 0), (p.g ?? 0) + " games", (p.st ?? 0) + " seasons started"].join(" · ");
      outcome = '<div class="outcome-band outcome-live"><strong>Through ' + p.ns + " season" +
        (p.ns > 1 ? "s" : "") + ":</strong> " + bits.join(" · ") +
        '<br><span class="prob">' + stats +
        " — an active career, not a final result</span></div>";
    }

    const why = whyBullets(p);

    modal.innerHTML =
      '<div class="modal-head"><div><h2 class="modal-name" id="modalName">' + esc(p.nm) + '</h2>' +
      '<div class="modal-meta">' + p.pos + " · " + esc(p.cl || "") + " · " + p.yr + " class" +
      '<span class="status-chip" title="' + esc(st.long) + '">' + esc(st.short) + "</span></div></div>" +
      '<button class="modal-close" aria-label="Close">✕</button></div>' +
      '<div class="modal-body">' +
      '<div class="modal-score"><span class="hero">' + fmt1(p.apex) + '</span>' +
      (p.sd != null ? '<span class="hero-sd">± ' + p.sd.toFixed(1) + "</span>" : "") +
      '<span class="hero-sub">APEX score (0–100)<br>' + esc(st.short) + "</span></div>" +
      cardSummary(p) +
      outcome +
      '<section class="card-sec"><h4 class="sec-h">Outlook</h4>' +
      '<div class="prob-block">' +
      probs.map(([label, v, m, isRisk, def]) =>
        '<div class="prob-row' + (isRisk ? " prob-row-risk" : "") + '"><span class="prob-label" title="' +
        esc(def) + '">' + label + '<span class="info-dot" aria-hidden="true">i</span></span>' +
        '<span class="prob-track"><span class="prob-fill' + (isRisk ? " prob-fill-risk" : "") + '" style="width:' + Math.round((v || 0) * 100) + '%"></span>' +
        (m != null ? '<span class="prob-mark" style="left:' + Math.round(m * 100) + '%"></span>' : "") +
        "</span><span class=\"prob-val\">" + pct(v) + "</span></div>").join("") +
      '<div class="legend-inline"><span><span class="key" style="background:var(--series-1)"></span>APEX</span>' +
      '<span><span class="key" style="background:var(--series-2)"></span>Draft-slot prior</span></div>' +
      '<p class="fine prob-note">These outcomes overlap; they are not portions of a single ' +
      '100% total. Hover a label for its exact definition.</p></div></section>' +
      film +
      (why.length
        ? '<section class="card-sec"><h4 class="sec-h">Why APEX rated him this way</h4>' +
          '<ul class="why-list"><li>' + why.join("</li><li>") + "</li></ul></section>"
        : "") +
      '<details class="card-more card-more-lg"><summary>The numbers behind him</summary>' +
      '<div class="modal-grid">' +
      facts.map(([l, v]) => '<div class="fact"><div class="fact-label">' + l + '</div><div class="fact-value">' + v + "</div></div>").join("") +
      "</div></details>" +
      (predraft
        ? '<details class="card-more card-more-lg"><summary>How the model reached this score</summary>' +
          predraft + "</details>"
        : "") +
      (signals
        ? '<details class="card-more card-more-lg"><summary>College traits linked to NFL success at this position</summary>' +
          signals + "</details>"
        : "") +
      (comps
        ? '<details class="card-more card-more-lg"><summary>Statistical matches</summary>' +
          comps + "</details>"
        : "") +
      "</div>";
    backdrop.hidden = false;
    modal.scrollTop = 0;
    const body = $(".modal-body", modal);
    if (body) body.scrollTop = 0;
    $(".modal-close", modal).addEventListener("click", closeModal);
    $(".modal-close", modal).focus();
  }
  const pctlNote = p => (p == null ? "" : ' <span class="pctl">· ' + ordPct(p) + " at his position</span>");

  /* ---------- what matters at this position ----------
     Every PFF grade and rate the file carries was screened, per position,
     against whether the player became a top-quartile career. Only a handful
     survived, because the bar was set by shuffling the outcome and re-running
     the whole screen: with hundreds of correlated columns and a hundred-odd
     quarterbacks, noise alone reaches AUC 0.80, and most of what looked like
     signal was under that. Receivers and tight ends produced nothing that
     cleared, and the card says so instead of showing them a number. */
  const POS_NO_SIGNAL = {
    WR: "359 measurements were screened for receivers — grades, athletic " +
        "testing and college production — and not one separated hits from " +
        "misses by more than chance does at this sample size. The deep and slot " +
        "splits that looked strongest were the kind of thing hundreds of " +
        "correlated columns throw up on their own. Receivers are the position " +
        "this model has least to say about beyond where they were drafted.",
    TE: "331 measurements were screened for tight ends across grades, testing " +
        "and production, and none survived. The strongest candidate showed up " +
        "on one side of the field and not the mirrored other, which is a small " +
        "sample cut many ways rather than a finding.",
    // Shown only to quarterbacks the measurement is missing for; the rest get
    // the panel. It is a different statement from the receiver and tight end
    // notes, which say nothing was found at all.
    QB: "The one quarterback measurement that holds up — how much longer he " +
        "holds the ball under pressure than in a clean pocket — is not recorded " +
        "for him. Nothing else separated hits by more than chance does across " +
        "608 columns and 93 quarterbacks, so there is nothing to show in its place.",
  };
  const FAMILY_TAG = { Athletic: "testing", Production: "college production" };

  function signalsPanel(p, bare) {
    if (!p.sig || !p.sig.length) {
      const why = POS_NO_SIGNAL[p.pg];
      return why
        ? (bare ? '<div class="sig sig-bare"><p class="fine">' + why + "</p></div>"
                : '<section class="sig card-sec"><div class="sig-h">College traits linked to ' +
                  'NFL success at this position</div><p class="fine">' + why + "</p></section>")
        : "";
    }
    // Plain words, not statistics. A reader should not have to know what a
    // percentile or an AUC is to use this panel: the first says how he compares,
    // the second says how much that comparison is worth. The numbers stay in the
    // tooltip for anyone who wants them.
    const strength = a => (a >= 0.70 ? ["strong", "sg-strong"]
                        : a >= 0.62 ? ["useful", "sg-useful"]
                        : ["slight", "sg-slight"]);
    // Two traps at the ends of this scale. "Better than 100%" is impossible, and
    // "best of any of them" -- which replaced it -- reads as a claim of being
    // number one when it is not: the comparison is against a fixed group of past
    // drafted players, so any number of current prospects can clear all of them
    // at once. Roughly one row in three hundred does, which is rare overall and
    // common at the top of the board, exactly where people look. Capping with a
    // "+" keeps it true and takes the uniqueness out of it.
    const compareWord = v => {
      const n = Math.round(v);
      if (n >= 100) return "better than <b>99%+</b>";
      if (n <= 0) return "better than <b>under 1%</b>";
      return "better than <b>" + n + "%</b>";
    };
    const rows = p.sig.map(s => {
      const band = s.p >= 75 ? "sg-hi" : s.p >= 40 ? "sg-mid" : "sg-lo";
      const [word, wcls] = strength(s.auc);
      return '<li class="sig-row">' +
        '<span class="sig-label">' + esc(s.l) +
          (FAMILY_TAG[s.f] ? ' <span class="sig-fam">' + FAMILY_TAG[s.f] + "</span>" : "") +
          (s.n ? '<span class="sig-note">' + esc(s.n) + "</span>" : "") +
          (s.w ? '<span class="sig-why">' + esc(s.w) + "</span>" : "") + "</span>" +
        '<span class="sig-track" title="' + ordPct(s.p) + '"><span class="sig-fill ' +
          band + '" style="width:' + Math.max(2, Math.round(s.p)) + '%"></span></span>' +
        '<span class="sig-val">' + compareWord(s.p) + "</span>" +
        '<span class="sig-str ' + wcls + '" title="How much this one has been worth on ' +
          'its own: AUC ' + s.auc.toFixed(2) + ', where 0.50 would be a coin flip">' +
          word + "</span></li>";
    }).join("");

    const drafted = p.pk != null;
    const who = "drafted " + p.pg + "s since 2014";
    return (bare ? '<div class="sig sig-bare">'
                 : '<section class="sig card-sec"><div class="sig-h">College traits linked to ' +
                   'NFL success at this position</div>') +
      '<p class="fine">Of everything we can measure about a ' + p.pg +
      ", " + (p.sig.length === 1 ? "this is the only thing" : "these are the only things") +
      " that told us in advance who developed into a strong NFL player. " +
      "Each bar compares him with " + who + " — so half of them sit below the " +
      "middle, and those are all players good enough to be picked." +
      (drafted ? "" : " He has not been drafted yet, so he is being held to the " +
                      "standard of players who were.") + "</p>" +
      '<ul class="sig-list">' + rows + "</ul>" +
      '<p class="fine"><b>Strong</b>, <b>useful</b> and <b>slight</b> say how much ' +
      "each one has actually been worth for picking out the players who lasted. " +
      "Even a strong one is only part of the picture — where a player gets drafted " +
      "still tells you more than any of these." + "</p>" + (bare ? "</div>" : "</section>");
  }

  /* ---------- historical comparables ----------
     The players a prospect most resembles on measurables, college production and
     PFF grades, and what became of them. Deliberately not an input: stacked onto
     the model these are negative out of sample, and standalone they reach 0.65
     against the pre-draft model's 0.69, so they are here to make a projection
     legible rather than to move it. Similarity is reported honestly — a player
     with no real match in eight drafted classes is told so rather than handed
     six strangers. */
  const COMP_WEAK = 0.45;      // roughly the 10th percentile of top similarity
  // Verdicts are decided in the pipeline, where the bust label is in scope, and
  // arrive as codes. Reconstructing them here from the payload would silently
  // grade every bust as rotational, since lbl_bust is not shipped.
  const COMP_OUT = [
    ["never played", "co-bad"], ["bust", "co-bad"], ["rotational", "co-mid"],
    ["starter", "co-ok"], ["hit", "co-hit"],
  ];

  // Gemini's read of the all-22, kept visually apart from everything measured on
  // this site and attributed on its face. It is the only panel on a card that
  // was not screened against an outcome, and a reader weighing a scouting note
  // is entitled to know a model wrote it.
  // One definition for all three tables. The label says a card carries charted
  // film and who charted it; it deliberately claims nothing about whether the
  // player is good, because the notes underneath are judgement rather than a
  // measurement and a tag that implied a verdict would misread them.
  function filmTag(p) {
    if (!p.film) return "";
    const who = p.film.by || "film";
    return ' <span class="film-tag" title="' + esc(who) +
      " charted this player from all-22 cutups — open the card for the notes. " +
      'Judgement, not a measurement: it feeds no score on this site.">film</span>';
  }

  // The control only exists where there is something to filter to. A checkbox
  // that always returns an empty table is worse than no checkbox, and film
  // covers one position so far.
  function wireFilm(box, wrap, rows, apply) {
    const el = $(box), w = $(wrap);
    if (!el || !w) return;
    if (!rows.some(p => p.film)) return;      // nothing to filter to anywhere
    w.hidden = false;
    el.addEventListener("change", e => apply(e.target.checked));
  }
  // Called on every render with the count for the view as it currently stands.
  // A control that keeps a stale number is worse than one with no number.
  function setFilmCount(wrap, n) {
    const w = $(wrap);
    if (!w) return;
    const s = $("span", w), box = $("input", w);
    if (s) s.textContent = "Only players with film (" + n + ")";
    // an empty result is reachable by filtering; disable rather than offer it
    if (box && !box.checked) { box.disabled = !n; w.classList.toggle("is-off", !n); }
  }

  // Plain-English names for the charted headings. The scouting vocabulary is
  // precise and opaque in equal measure -- "drop sync" and "base under blitz"
  // mean something exact to someone who charts tape and nothing to a fan. The
  // underlying values are printed unchanged; only the label is translated, and
  // anything unrecognised falls through as written rather than being dropped.
  const FILM_LABEL = {
    "Pocket radius": "Pocket style",
    "Navigation": "Pocket movement",
    "Drop sync": "Timing and rhythm",
    "Processing": "Processing speed",
    "Base under blitz": "Composure under pressure",
    "Time to release": "Time to release",
    "Off platform": "Throwing off balance",
  };

  function filmPanel(p) {
    const f = p.film;
    if (!f) return "";                 // no empty shell for players without film
    // Strengths and concerns are pooled across the charted areas and capped, so
    // the default card shows the shape of the report rather than all of it. The
    // full thing, area by area, is one click down and nothing is dropped.
    const ups = [], dns = [];
    (f.t || []).forEach(a => {
      (a.pos || []).forEach(x => ups.push(x));
      (a.neg || []).forEach(x => dns.push(x));
    });
    const metrics = Object.keys(f.m || {}).map(k =>
      '<div class="film-m"><dt>' + esc(FILM_LABEL[k] || k) + "</dt><dd>" +
      esc(f.m[k]) + "</dd></div>").join("");
    const full = (f.t || []).map(a =>
      '<div class="film-area"><h5>' + esc(a.area) + "</h5><ul>" +
      (a.pos || []).map(x => '<li class="film-up">' + esc(x) + "</li>").join("") +
      (a.neg || []).map(x => '<li class="film-dn">' + esc(x) + "</li>").join("") +
      "</ul></div>").join("");

    const rank = f.rk
      ? '<span class="film-rank">' + ord(f.rk) + " of " + f.of +
        (f.scope === "board" ? "" : " at his position") +
        (f.grp ? " " + esc(f.grp) : "") + "</span>"
      : f.solo
        ? '<span class="film-rank">the only one at his position in this pass, ' +
          "so no ranking is shown</span>"
        : "";

    return '<section class="film card-sec">' +
      '<div class="film-h"><span>Film scouting report</span>' +
      (f.by ? '<span class="film-by">AI-assisted charting by ' + esc(f.by) + "</span>" : "") +
      "</div>" +
      '<p class="film-arch">' + esc(f.arch || "") + " " + rank + "</p>" +
      // the quick read is the film's own summary line where it wrote one, never
      // a sentence assembled here: this section is the one place on the card
      // that is somebody's judgement, and it should be their words
      (f.vd ? '<p class="film-quick">' + esc(f.vd) + "</p>" : "") +
      (ups.length
        ? '<div class="film-col"><h5 class="film-col-h film-col-up">What translates</h5><ul>' +
          ups.slice(0, 3).map(x => "<li>" + esc(x) + "</li>").join("") + "</ul></div>"
        : "") +
      (dns.length
        ? '<div class="film-col"><h5 class="film-col-h film-col-dn">What could hold him back</h5><ul>' +
          dns.slice(0, 2).map(x => "<li>" + esc(x) + "</li>").join("") + "</ul></div>"
        : "") +
      (metrics ? '<dl class="film-metrics">' + metrics + "</dl>" : "") +
      (full
        ? "<details class=\"card-more\"><summary>Full film notes</summary>" + full + "</details>"
        : "") +
      '<p class="film-note">' + esc(f.note || "") + "</p></section>";
  }

  function compsPanel(p, bare) {
    if (!p.cmp || !p.cmp.length) {
      // pre-2014 players have no college grades, so the only comparables
      // available would be the weaker traits-only kind. Better to say nothing.
      return p.yr < 2014
        ? (bare ? '<div class="comps comps-bare">' : '<section class="comps card-sec">' +
            '<div class="comps-h">Statistical matches</div>') +
          '<p class="fine">Not shown for classes before 2014. College grades only ' +
          'begin that year, and matching on measurables alone is a measurably ' +
          'worse comparison — presenting it in the same frame would imply a ' +
          'confidence it does not have.</p>' + (bare ? "</div>" : "</section>")
        : "";
    }
    const best = p.cmp[0][1];
    const lift = p.cmpr != null && p.cmpb != null ? p.cmpr - p.cmpb : null;
    const tag = lift == null ? ""
      : lift >= 0.05 ? '<span class="comps-tag comps-tag-up">matches outperformed</span>'
      : lift <= -0.05 ? '<span class="comps-tag comps-tag-down">matches underperformed</span>'
      : '<span class="comps-tag">matches ran typical</span>';

    const row = ([i, sim, code]) => {
      const c = D.players[i];
      if (!c) return "";
      const [label, cls] = COMP_OUT[code] || COMP_OUT[2];
      return '<li class="comp-row">' +
        '<span class="comp-bar"><span class="comp-bar-fill" style="width:' +
          Math.round(Math.min(1, sim / 0.9) * 100) + '%"></span></span>' +
        '<span class="comp-name">' + esc(c.nm) + "</span>" +
        '<span class="comp-meta">' + c.pos + " · " + c.yr + " pk" + c.pk + "</span>" +
        '<span class="comp-out ' + cls + '">' + label + "</span></li>";
    };
    const weak = best < COMP_WEAK;
    // With no real match, leading with six names invites the reader to treat
    // strangers as analogues. The finding is the absence, so that goes first and
    // the names go away entirely until asked for.
    const shown = weak ? [] : p.cmp.slice(0, 3);
    const rest = weak ? p.cmp : p.cmp.slice(3);

    return (bare ? '<div class="comps comps-bare">' + (tag ? '<div class="comps-h">' + tag + "</div>" : "")
                 : '<section class="comps card-sec"><div class="comps-h">Statistical matches ' +
                   tag + "</div>") +
      (weak
        ? '<p class="fine comps-weak"><strong>No reliable statistical match was found.</strong> ' +
          'His nearest one is further away than nine out of ten players’ are, which is itself ' +
          'the finding: nothing in eight drafted classes looks much like him.</p>'
        : '<p class="comps-lead">' + p.cmph + " of the " + p.cmpn + " players from 2014–21 " +
          "whose testing, college production and college grades most resemble his built strong " +
          "careers — <b>" + pct(p.cmpr) + "</b> once shrunk toward the " + pct(p.cmpb) +
          " base rate at his position.</p>") +
      (shown.length ? '<ul class="comp-list">' + shown.map(row).join("") + "</ul>" : "") +
      (rest.length
        ? '<details class="card-more"><summary>See all statistical matches</summary>' +
          '<ul class="comp-list">' + rest.map(row).join("") + "</ul>" +
          '<p class="fine">Distance is measured within position on standardised testing, ' +
          'production and grade columns, over the features both players actually have. ' +
          'These are <b>statistical</b> matches, not stylistic ones — a similar profile on ' +
          'paper, which is not the same as playing alike.</p></details>'
        : "") +
      '<p class="fine">Shown, not used: these do not affect his score. Adding them to the ' +
      'model is negative out of sample, and on their own they reach 0.65 AUC against the ' +
      'pre-draft model’s 0.69. They explain a projection; they do not make one.</p></section>';
  }

  /* ---------- watchlist card ----------
     Why a college player sits where he does, and what a 2026 season would have
     to look like to move him. The second half is not written advice, which would
     be unfalsifiable; it is the model re-scored with one lever moved to what a
     good season at the position actually looks like. */
  function openWatchCard(p, W) {
    lastFocus = document.activeElement;
    const C = (W && W.config) || {};
    const TIER_NAME = { 1: "Blue chip", 2: "Early watch", 3: "On the radar", 4: "Depth" };
    const has = p.nfl != null;

    const facts = [];
    facts.push(["Rank at position", "#" + p.r + " of " + p.pn + " " + p.pg +
      (p.t ? ' <span class="pctl">· ' + TIER_NAME[p.t] + "</span>" : "")]);
    facts.push(["2025 grade", "p" + p.p + ' <span class="pctl">within position, volume-adjusted' +
      (p.rp != null && Math.abs(p.rp - p.p) > 5 ? " · p" + p.rp + " unadjusted" : "") + "</span>"]);
    facts.push(["Playing time", (p.v != null ? "p" + p.v + " for snaps" : "–") +
      (p.g != null ? " · " + p.g + " games" : "") +
      (p.thin ? ' <span class="pctl">· thin sample</span>' : "")]);
    facts.push(["Career peak", p.cb != null ? "p" + p.cb +
      ' <span class="pctl">best season so far</span>' : "–"]);
    facts.push(["Seasons on tape", p.ns != null ? p.ns : "–"]);
    facts.push(["Level", p.pw === 1 ? "Power conference" : p.pw === 0 ? "Outside the power conferences" : "–"]);

    // why he sits where he does
    const why = [];
    if (has) {
      if (p.p >= 90) why.push("He graded <strong>near the top of his position</strong> (p" + p.p +
        "), which is the single strongest thing on his record.");
      else if (p.p <= 40) why.push("His grade sat <strong>below the position median</strong> (p" +
        p.p + "), which is most of what is holding the projection down.");
      if (p.thin) why.push("The grade rests on a <strong>thin sample</strong> — " +
        (p.v != null ? "p" + p.v + " for playing time" : "few snaps") +
        (p.g != null ? " across " + p.g + " games" : "") +
        ". The model discounts a small sample rather than trusting it, so more of the same " +
        "football would raise him even at the same level of play.");
      else if (p.v != null && p.v >= 75) why.push("He played a <strong>full workload</strong> (p" +
        p.v + " for snaps), so the grade is a claim about a season rather than a handful of games.");
      if (p.cb != null && p.p != null && p.cb - p.p >= 15)
        why.push("He has been <strong>better before</strong> — his best season sits at p" + p.cb +
          " against p" + p.p + " last year, and the model can see the peak as well as the present.");
      if (p.tr === 1) why.push("His grade <strong>moved up</strong> from the previous season.");
      else if (p.tr === -1) why.push("His grade <strong>slipped</strong> from the previous season.");
      if (p.pw === 0) why.push("He plays <strong>outside the power conferences</strong>, which the " +
        "model treats as a discount on the same grade — level of competition is the one thing a " +
        "grade cannot tell you.");
      if (p.ns != null && p.ns >= 4) why.push("There are <strong>" + p.ns + " seasons of tape</strong> " +
        "on him, so the record is unusually well established for a college player.");
    }

    // what a 2026 season would be worth
    let levers = "";
    if (p.cf) {
      const LBL = {
        snaps: ["Play a starter's snaps", "reaching the position's 75th percentile for volume"],
        health: ["Finish the season", "playing all 13 games"],
        grade: ["Play to a top-10% level", "grading at the position's 90th percentile"],
        all: ["All three together", "the best realistic version of a 2026 season"],
      };
      const base = p.cf.base;
      const rows = ["snaps", "health", "grade", "all"].filter(k => p.cf[k] != null)
        .map(k => {
          const lift = p.cf[k] - base;
          return '<div class="lever"><div class="lever-k">' + LBL[k][0] +
            '<span class="lever-sub">' + LBL[k][1] + "</span></div>" +
            '<div class="lever-v">' + Math.round(base * 100) + "% → <b>" +
            Math.round(p.cf[k] * 100) + "%</b>" +
            '<span class="lever-d">+' + Math.round(lift * 100) + "</span></div></div>";
        });
      levers = rows.length
        ? '<div class="levers"><h3>What a 2026 season is worth</h3>' +
          '<p class="fine">Not advice — the model re-scored with one thing changed and everything ' +
          'else held where it is. Levers he has already met are left out.</p>' +
          rows.join("") + "</div>"
        : '<div class="levers"><h3>What a 2026 season is worth</h3>' +
          '<p class="fine">He already meets every lever the model responds to — a full workload, ' +
          'a full season, and a top-decile grade. There is no ordinary improvement left for it to ' +
          'reward; from here the gain comes from things this model cannot see, chiefly a workout ' +
          'number in the spring.</p></div>';
    }

    modal.innerHTML =
      '<div class="modal-head"><div><h2 class="modal-name" id="modalName">' + esc(p.nm) + "</h2>" +
      '<div class="modal-meta">' + p.pg + " · " + esc(p.tm) + " · 2025 season</div></div>" +
      '<button class="modal-close" aria-label="Close">✕</button></div>' +
      (has
        ? '<div class="modal-score"><span class="hero">' + Math.round(p.nfl * 100) + "%</span>" +
          '<span class="hero-lbl">to reach an NFL roster' +
          (p.drf != null ? " · " + Math.round(p.drf * 100) + "% to be drafted" : "") + "</span></div>"
        : '<div class="warn-band" style="margin:12px 0"><strong>No projection for this player.</strong> ' +
          'The model has no historical grading it can train on for his position, so no probability ' +
          'is shown and his tier comes from production alone.</div>') +
      '<div class="modal-grid">' +
      facts.map(([k, v]) => '<div class="fact"><div class="fact-k">' + k +
        '</div><div class="fact-v">' + v + "</div></div>").join("") +
      "</div>" +
      (why.length
        ? '<div class="gap-story"><p><strong>Why he sits here.</strong></p><ul class="gap-why"><li>' +
          why.join("</li><li>") + "</li></ul></div>"
        : "") +
      // The same panel the drafted board shows, and deliberately the same
      // ruler: his percentile is against drafted players since 2014, not
      // against the college pool, so a number here means what it means there.
      // What the badge is worth, in the terms the watchlist is actually about:
      // reaching a roster and being drafted, measured on college players rather
      // than borrowed from a drafted population this player is not in.
      (p.mk
        ? '<div class="mk-band"><strong>No weak spot in his measurements.</strong> ' +
          "Ranked against college " + p.pg + "s who played a full season, his " +
          "<em>lowest</em> marker still lands in the top 5% &mdash; and a " +
          p.pg + " has " + (p.mk.mk === 1 ? "one marker" : p.mk.mk + " of them") +
          " to clear. Of the " + p.mk.n.toLocaleString() + " who did the same " +
          "since 2014, <b>" + Math.round(p.mk.nfl * 100) + "%</b> reached an NFL " +
          "roster against <b>" + Math.round(p.mk.base * 100) + "%</b> of all of " +
          "them, and " + Math.round(p.mk.drf * 100) + "% were drafted against " +
          Math.round(p.mk.dbase * 100) + "%. That is a record for players who " +
          "looked like this, not a forecast for him." +
          // The markers are inputs to the model that produced the number above,
          // so most of what the flag knows is already in that number. Measured
          // rather than assumed, and small enough that saying so is the only
          // honest option.
          (typeof p.mk.lift === "number"
            ? " Set against the probability at the top of this card, the flag is " +
              "worth about <b>" + Math.round(p.mk.lift * 100) + " points</b> more " +
              "&mdash; among players already in the top quarter at their position. " +
              "Lower down it adds nothing: these measurements are what the model " +
              "reads, so it mostly agrees with the number it sits beside."
            : "") + "</div>"
        : "") +
      signalsPanel(p) +
      filmPanel(p) +
      levers +
      (has
        ? '<p class="fine" style="margin-top:12px">This is a projection of whether he <em>arrives</em> ' +
          'in the NFL, not whether he is any good once there. Measured walk-forward at ' +
          C.auc_nfl.toFixed(3) + ' AUC across six cohorts.</p>'
        : "");
    backdrop.hidden = false;
    $(".modal-close", modal).addEventListener("click", closeModal);
    $(".modal-close", modal).focus();
  }
  function closeModal(fromHash) {
    if (backdrop.hidden) return;
    backdrop.hidden = true;
    if (!fromHash && state.pick != null) { state.pick = null; writeHash(); }
    if (lastFocus) lastFocus.focus();
  }
  backdrop.addEventListener("click", e => { if (e.target === backdrop) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !backdrop.hidden) closeModal(); });

  /* ---------- tooltip ---------- */
  let tip = null;
  function showTip(html, x, y) {
    if (!tip) { tip = document.createElement("div"); tip.className = "tip"; document.body.appendChild(tip); }
    tip.innerHTML = html;
    tip.style.display = "block";
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.min(x + 14, innerWidth - r.width - 10) + "px";
    tip.style.top = Math.max(8, y - r.height - 12) + "px";
  }
  function hideTip() { if (tip) tip.style.display = "none"; }

  /* ---------- charts (inline SVG) ---------- */
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function aucChart() {
    const box = $("#aucChart");
    box.innerHTML = "";
    const W = 560, H = 300, m = { t: 16, r: 16, b: 34, l: 44 };
    const years = D.backtest.auc_years;
    const S = [
      { name: "APEX", vals: D.backtest.auc_series.deploy, color: css("--series-1") },
      { name: "Draft-slot prior", vals: D.backtest.auc_series.market, color: css("--series-2") },
    ];
    const all = S.flatMap(s => s.vals);
    const y0 = Math.floor(Math.min(...all) * 20) / 20 - 0.05, y1 = Math.ceil(Math.max(...all) * 20) / 20 + 0.02;
    const X = i => m.l + (i / (years.length - 1)) * (W - m.l - m.r);
    const Y = v => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
    const svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "AUC by draft class, APEX vs draft-slot prior" });
    for (let g = Math.ceil(y0 * 10) / 10; g <= y1; g = +(g + 0.05).toFixed(2)) {
      svg.appendChild(svgEl("line", { x1: m.l, x2: W - m.r, y1: Y(g), y2: Y(g), stroke: css("--grid"), "stroke-width": 1 }));
      const t = svgEl("text", { x: m.l - 7, y: Y(g) + 4, "text-anchor": "end", "font-size": 11, fill: css("--ink-3") });
      t.textContent = g.toFixed(2);
      svg.appendChild(t);
    }
    years.forEach((yr, i) => {
      if (i % 3 === 0 || i === years.length - 1) {
        const t = svgEl("text", { x: X(i), y: H - 10, "text-anchor": "middle", "font-size": 11, fill: css("--ink-3") });
        t.textContent = yr;
        svg.appendChild(t);
      }
    });
    S.forEach(s => {
      const path = s.vals.map((v, i) => (i ? "L" : "M") + X(i) + " " + Y(v)).join(" ");
      svg.appendChild(svgEl("path", { d: path, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
      const last = s.vals.length - 1;
      svg.appendChild(svgEl("circle", { cx: X(last), cy: Y(s.vals[last]), r: 4.5, fill: s.color, stroke: css("--surface-1"), "stroke-width": 2 }));
    });
    // legend (end-labels would collide where the lines converge)
    const legend = document.createElement("div");
    legend.className = "legend-inline";
    legend.innerHTML = S.map(s =>
      '<span><span class="key" style="background:' + s.color + '"></span>' + s.name + "</span>").join("");
    box.appendChild(legend);
    // hover: nearest year
    const hot = svgEl("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent" });
    const cross = svgEl("line", { y1: m.t, y2: H - m.b, stroke: css("--axis"), "stroke-width": 1, opacity: 0 });
    svg.appendChild(cross);
    hot.addEventListener("mousemove", e => {
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(years.length - 1, Math.round(((px - m.l) / (W - m.l - m.r)) * (years.length - 1))));
      cross.setAttribute("x1", X(i)); cross.setAttribute("x2", X(i)); cross.setAttribute("opacity", 1);
      showTip('<div class="tip-h">' + years[i] + ' class</div><div class="tip-r">APEX: ' + S[0].vals[i].toFixed(3) + "<br>Prior: " + S[1].vals[i].toFixed(3) + "</div>", e.clientX, e.clientY);
    });
    hot.addEventListener("mouseleave", () => { cross.setAttribute("opacity", 0); hideTip(); });
    svg.appendChild(hot);
    box.appendChild(svg);
    $("#aucTable").innerHTML = "<table><tr><th>Class</th><th>APEX AUC</th><th>Prior AUC</th></tr>" +
      years.map((yr, i) => "<tr><td>" + yr + "</td><td>" + S[0].vals[i].toFixed(3) + "</td><td>" + S[1].vals[i].toFixed(3) + "</td></tr>").join("") + "</table>";
  }

  function calChart() {
    const box = $("#calChart");
    box.innerHTML = "";
    const W = 560, H = 300, m = { t: 14, r: 16, b: 36, l: 44 };
    const bins = D.calibration.deploy_hit;
    const X = v => m.l + v * (W - m.l - m.r);
    const Y = v => m.t + (1 - v) * (H - m.t - m.b);
    const svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Calibration: predicted vs observed hit rate" });
    for (let g = 0; g <= 1.0001; g += 0.25) {
      svg.appendChild(svgEl("line", { x1: m.l, x2: W - m.r, y1: Y(g), y2: Y(g), stroke: css("--grid"), "stroke-width": 1 }));
      const ty = svgEl("text", { x: m.l - 7, y: Y(g) + 4, "text-anchor": "end", "font-size": 11, fill: css("--ink-3") });
      ty.textContent = Math.round(g * 100) + "%";
      svg.appendChild(ty);
      const tx = svgEl("text", { x: X(g), y: H - 12, "text-anchor": "middle", "font-size": 11, fill: css("--ink-3") });
      tx.textContent = Math.round(g * 100) + "%";
      svg.appendChild(tx);
    }
    svg.appendChild(svgEl("line", { x1: X(0), y1: Y(0), x2: X(1), y2: Y(1), stroke: css("--axis"), "stroke-width": 1 }));
    bins.forEach(b => {
      const c = svgEl("circle", { cx: X(b.pred_mean), cy: Y(b.obs_rate), r: Math.max(4.5, Math.min(9, Math.sqrt(b.n) / 3)), fill: css("--series-1"), stroke: css("--surface-1"), "stroke-width": 2 });
      c.addEventListener("mousemove", e => showTip('<div class="tip-h">Predicted ' + pct(b.pred_mean) + "</div><div class='tip-r'>Actually hit: " + pct(b.obs_rate) + "<br>" + b.n + " players</div>", e.clientX, e.clientY));
      c.addEventListener("mouseleave", hideTip);
      svg.appendChild(c);
    });
    const lab = svgEl("text", { x: X(0.66), y: Y(0.66) + 18, "font-size": 11.5, fill: css("--ink-3"), transform: "" });
    lab.textContent = "perfect calibration";
    svg.appendChild(lab);
    const xl = svgEl("text", { x: (m.l + W - m.r) / 2, y: H - 0.5, "text-anchor": "middle", "font-size": 11, fill: css("--ink-3") });
    xl.textContent = "predicted hit probability → actual hit rate";
    svg.appendChild(xl);
    box.appendChild(svg);
    $("#calTable").innerHTML = "<table><tr><th>Predicted</th><th>Observed</th><th>Players</th></tr>" +
      bins.map(b => "<tr><td>" + pct(b.pred_mean) + "</td><td>" + pct(b.obs_rate) + "</td><td>" + b.n + "</td></tr>").join("") + "</table>";
  }

  function roundChart() {
    const box = $("#roundChart");
    box.innerHTML = "";
    const W = 900, H = 240, m = { t: 26, r: 12, b: 30, l: 44 };
    const rows = D.insights.by_round;
    const maxV = Math.max(...rows.map(r => r.hit)) * 1.15;
    const bw = 24, slot = (W - m.l - m.r) / rows.length;
    const Y = v => m.t + (1 - v / maxV) * (H - m.t - m.b);
    const svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Hit rate by draft round" });
    for (let g = 0; g <= maxV; g += 0.1) {
      svg.appendChild(svgEl("line", { x1: m.l, x2: W - m.r, y1: Y(g), y2: Y(g), stroke: css("--grid"), "stroke-width": 1 }));
      const t = svgEl("text", { x: m.l - 7, y: Y(g) + 4, "text-anchor": "end", "font-size": 11, fill: css("--ink-3") });
      t.textContent = Math.round(g * 100) + "%";
      svg.appendChild(t);
    }
    rows.forEach((r, i) => {
      const x = m.l + slot * i + (slot - bw) / 2;
      const rect = svgEl("path", {
        d: roundedBar(x, Y(r.hit), bw, H - m.b - Y(r.hit), 4),
        fill: css("--seq-400"),
      });
      rect.addEventListener("mousemove", e => showTip('<div class="tip-h">Round ' + r.rd + "</div><div class='tip-r'>Hit: " + pct(r.hit) + " · Starter: " + pct(r.starter) + "<br>Pro Bowl: " + pct(r.probowl) + " · n=" + r.n + "</div>", e.clientX, e.clientY));
      rect.addEventListener("mouseleave", hideTip);
      svg.appendChild(rect);
      const v = svgEl("text", { x: x + bw / 2, y: Y(r.hit) - 6, "text-anchor": "middle", "font-size": 11.5, "font-weight": 650, fill: css("--ink-2") });
      v.textContent = Math.round(r.hit * 100) + "%";
      svg.appendChild(v);
      const t = svgEl("text", { x: x + bw / 2, y: H - 9, "text-anchor": "middle", "font-size": 11.5, fill: css("--ink-3") });
      t.textContent = "R" + r.rd;
      svg.appendChild(t);
    });
    box.appendChild(svg);
    $("#roundTable").innerHTML = "<table><tr><th>Round</th><th>Hit</th><th>Starter</th><th>Pro Bowl</th><th>Players</th></tr>" +
      rows.map(r => "<tr><td>R" + r.rd + "</td><td>" + pct(r.hit) + "</td><td>" + pct(r.starter) + "</td><td>" + pct(r.probowl) + "</td><td>" + r.n + "</td></tr>").join("") + "</table>";
  }
  function roundedBar(x, y, w, h, r) {
    if (h <= r) return "M" + x + " " + (y + h) + "h" + w + "v-" + h + "h-" + w + "Z";
    return "M" + x + " " + (y + h) + " v-" + (h - r) + " a" + r + " " + r + " 0 0 1 " + r + " -" + r +
      " h" + (w - 2 * r) + " a" + r + " " + r + " 0 0 1 " + r + " " + r + " v" + (h - r) + " Z";
  }

  /* ---------- insights lists ---------- */
  function storyList(el, rows, kind) {
    el.innerHTML = rows.map(r => {
      const out = kind === "steal"
        ? '<span class="badge badge-hit">✓ HIT</span>' + (r.pb ? '<span class="badge badge-pb">★×' + r.pb + "</span>" : "")
        : '<span class="badge badge-none">AV ' + (r.wav ?? 0) + "</span>";
      return '<div class="story-row"><span class="story-pick">' + r.yr + " · #" + r.pk + '</span>' +
        '<span class="story-name">' + esc(r.nm) + ' <span class="story-meta">' + r.pos + " · " + esc(r.cl || r.tm || "") + '</span></span>' +
        '<span class="story-prob">APEX ' + pct(r.ph) + " vs slot " + pct(r.mh) + '</span>' +
        '<span class="story-out">' + out + "</span></div>";
    }).join("");
  }

  function renderInsights() {
    const dg = D.insights.disagree;
    $("#disagreeHero").innerHTML =
      '<div><div class="hero-num">' + Math.round(dg.win_rate * 100) + '%</div><div class="tile-label">disagreement win rate</div></div>' +
      '<div class="hero-copy">In the held-out backtest, whenever APEX moved a player&rsquo;s hit probability <strong>10+ points away from the draft-slot prior</strong>, the model&rsquo;s side of the argument won <strong>' + dg.model_right + " of " + dg.n + "</strong> times. Every score on this site was produced by a model that never saw that player&rsquo;s class.</div>";
    storyList($("#stealsList"), D.insights.steals, "steal");
    storyList($("#skepticList"), D.insights.skeptic, "skeptic");
    renderForward();
  }

  function renderForward() {
    const F = D.forward, S2 = D.backtest.summary;
    if (!F || !F.head_to_head.length) return;
    const rows = F.head_to_head.slice().sort((a, b) => a.yr - b.yr);
    const cell = (a, b) => {
      const cls = a > b ? "win" : a < b ? "loss" : "";
      return '<td class="' + cls + '">' + a.toFixed(3) + "</td><td>" + b.toFixed(3) + "</td>";
    };
    $("#fwdTable").innerHTML =
      '<table class="bt-table"><tr><th>Class</th><th>Seasons played</th><th>Players</th>' +
      '<th>APEX AUC</th><th>Draft-slot AUC</th><th>APEX top 32</th><th>Picks 1–32</th></tr>' +
      rows.map(r => {
        const c = F.classes[r.yr] && F.classes[r.yr].hit;
        return "<tr><td>" + r.yr + "</td><td>" + r.seasons + "</td><td>" + r.n + "</td>" +
          (c ? cell(c.apex, c.market) : "<td>–</td><td>–</td>") +
          '<td class="' + (r.m32 > r.d32 ? "win" : r.m32 < r.d32 ? "loss" : "") + '">' +
          pct(r.m32) + "</td><td>" + pct(r.d32) + "</td></tr>";
      }).join("") +
      (F.pooled && F.pooled.hit
        ? "<tr class='total'><td><strong>Pooled</strong></td><td>–</td><td>" + F.pooled.hit.n +
          "</td>" + cell(F.pooled.hit.apex, F.pooled.hit.market) + "<td>–</td><td>–</td></tr>"
        : "") + "</table>";

    const p = F.pooled && F.pooled.hit;
    const b = F.pooled && F.pooled.bust;
    const edge = p ? (p.apex - p.market) * 1000 / 10 : 0;
    const bedge = b ? (b.apex - b.market) * 1000 / 10 : 0;
    $("#fwdNote").innerHTML =
      "&ldquo;Top-quartile so far&rdquo; is the career label applied to a career in progress: weighted AV in the top 25% of the same class and position group. Bust is the same idea inverted and judged against the same draft-capital band. " +
      (p
        ? "Pooled across " + p.n + " players, APEX is <strong>" + (edge >= 0 ? "+" : "") + edge.toFixed(1) +
          " AUC points</strong> ahead of the draft-slot prior on finding hits — the same direction as the backtest, but far too small to call a win on this sample. "
        : "") +
      (b
        ? "<strong>Bust risk is worse, not better.</strong> On the " + b.n + " players from 2022–2023 whose careers " +
          "have had time to fail, APEX is <strong>" + (bedge >= 0 ? "+" : "") + bedge.toFixed(1) +
          " AUC points</strong> against the draft-slot prior on predicting who disappoints for his slot — so the " +
          "large backtest edge on that label (+" + ((S2.deploy.bust.auc - S2.market.bust.auc) * 100).toFixed(1) + " points) does <em>not</em> show up here either. " +
          "There are only " + b.pos + " busts across those two classes, far too few to resolve it in " +
          "either direction, but it is not evidence in the model’s favour and is not presented as any. "
        : "") +
      "Two or three seasons is early either way. Published as-is, win or lose.";
  }

  /* ---------- methodology ---------- */
  const FEAT_NAMES = {
    prior_p: "Market prior (draft slot curve)", mv_log_pick: "Draft pick (log)",
    mv_round: "Draft round", mv_otc: "OTC pick value", mv_stuart: "Stuart pick value",
    mv_johnson: "Jimmy Johnson pick value", mv_pos_depth: "Players taken earlier at position",
    ath_ras: "Relative Athletic Score", ath_age: "Age at draft", ath_height: "Height",
    ath_weight: "Weight", ath_bmi: "BMI", ath_forty: "40-yard dash", ath_bench: "Bench press",
    ath_vertical: "Vertical jump", ath_broad: "Broad jump", ath_cone: "3-cone drill",
    ath_shuttle: "Short shuttle", ath_speed_score: "Speed score",
    ath_height_posz: "Height vs position", ath_weight_posz: "Weight vs position",
    pos_code: "Position group", pff_games: "PFF college games logged",
    pff_grade: "PFF position grade", pff_grade2: "PFF secondary grade",
    cp_years: "College seasons recorded",
  };
  const featName = f => FEAT_NAMES[f] ||
    f.replace(/^cp_final_/, "Final college season: ").replace(/^cp_career_/, "College career: ")
     .replace(/^pff_/, "PFF ").replace(/_/g, " ");

  function renderMethod() {
    const S = D.backtest.summary;
    const rows = [["hit", "Hit (top-quartile career)"], ["starter", "3+ year starter"],
                  ["probowl", "Pro Bowler"], ["bust", "Bust (bottom 25% for draft range)"]];
    $("#btTable").innerHTML = '<table class="bt-table"><tr><th>Outcome</th><th>Base rate</th><th>Prior AUC</th><th>APEX AUC</th><th>Δ</th><th>APEX AUC 2015+</th><th>Brier ↓</th></tr>' +
      rows.map(([k, label]) => {
        const mkt = S.market[k], dep = S.deploy[k];
        return "<tr" + (k === "bust" ? " class='bt-hero'" : "") + "><td>" + label + "</td><td>" + pct(D.backtest.base_rates[k]) + "</td><td>" + mkt.auc.toFixed(3) +
          "</td><td><strong>" + dep.auc.toFixed(3) + "</strong></td><td class='win'>+" + ((dep.auc - mkt.auc) * 1000 / 10).toFixed(1) + "</td><td>" +
          dep.auc_2015_2021.toFixed(3) + "</td><td>" + dep.brier.toFixed(4) + " vs " + mkt.brier.toFixed(4) + "</td></tr>";
      }).join("") + "</table>" +
      '<p class="fine">The bust row is the point. Against the draft-slot prior the model gains ' +
      ((S.deploy.bust.auc - S.market.bust.auc) * 100).toFixed(1) + ' AUC points on who disappoints for his draft slot, versus ' +
      ((S.deploy.hit.auc - S.market.hit.auc) * 100).toFixed(1) + ' on who becomes good. Draft position barely predicts the first question at all, which is why there is room. The exception is round one, where the model has no edge on bust at all &mdash; that skill starts at pick 33.</p>' +
      '<p class="fine">Top-decile check: among the model&rsquo;s 10% most confident players, ' + pct(D.backtest.top_decile_hit_rate.deploy) + " hit vs " + pct(D.backtest.top_decile_hit_rate.market) + " for the draft-slot prior.</p>";

    /* The fuller metric suite. PR-AUC is the one that changes the picture:
       ROC AUC is computed against a base rate it ignores, so a rare outcome can
       post a healthy 0.80 while the precision-recall curve shows what finding
       one actually costs. Calibration slope and intercept say whether a
       published probability can be read literally. */
    const MF = D.metrics_full;
    if (MF && MF.models && MF.models.deploy) {
        const lbls = [["hit", "Hit"], ["starter", "Starter"],
                      ["probowl", "Pro Bowler"], ["bust", "Bust"]];
        const dep = MF.models.deploy;
        $("#fullMetrics").innerHTML =
          '<table class="bt-table"><tr><th>Outcome</th><th>Base rate</th>' +
          "<th>ROC AUC</th><th>PR AUC</th><th>Log loss ↓</th>" +
          "<th>Calib. slope</th><th>Intercept</th><th>ECE ↓</th></tr>" +
          lbls.filter(([k]) => dep[k]).map(([k, lbl]) => {
            const r = dep[k];
            const gap = r.roc_auc - r.pr_auc;
            return "<tr" + (gap > 0.3 ? " class='bt-hero'" : "") + "><td>" + lbl + "</td><td>" +
              pct(r.base_rate) + "</td><td>" + r.roc_auc.toFixed(3) + "</td><td><strong>" +
              r.pr_auc.toFixed(3) + "</strong></td><td>" + r.logloss.toFixed(3) + "</td><td>" +
              r.cal_slope.toFixed(2) + "</td><td>" + r.cal_intercept.toFixed(2) + "</td><td>" +
              r.ece.toFixed(4) + "</td></tr>";
          }).join("") + "</table>";
        const pb = dep.probowl;
        $("#fullMetricsNote").innerHTML =
          "<strong>Read the Pro Bowler row.</strong> Its ROC AUC of " + pb.roc_auc.toFixed(3) +
          " looks like the model&rsquo;s best work; its PR AUC of " + pb.pr_auc.toFixed(3) +
          " says otherwise. Pro Bowlers are only " + pct(pb.base_rate) + " of the field, and " +
          "ROC AUC is generous about rare outcomes in a way precision-recall is not. The gap of " +
          (pb.roc_auc - pb.pr_auc).toFixed(2) + " is the honest cost of going looking for one. " +
          "<strong>The calibration columns are the good news</strong>: slopes near 1.00 and " +
          "intercepts near 0.00 mean a published probability can be taken at face value — when " +
          "this model says 30%, about 30% of those players get there. That is a separate and " +
          "weaker claim than being able to tell which 30%.";
    }

    // pre-draft decomposition: what the draft is worth, and what we are worth
    const P = D.backtest.summary.predraft, M = D.backtest.summary.market,
          Dp = D.backtest.summary.deploy;
    if (P) {
      const row = (k, lbl) =>
        "<tr><td>" + lbl + "</td><td>" + M[k].auc.toFixed(4) + "</td><td><strong>" +
        P[k].auc.toFixed(4) + "</strong></td><td>" + Dp[k].auc.toFixed(4) + "</td>" +
        "<td class='" + (P[k].auc > M[k].auc ? "win" : "loss") + "'>" +
        ((P[k].auc - M[k].auc) * 100).toFixed(1) + "</td></tr>";
      $("#predraftTable").innerHTML =
        "<table class='bt-table'><tr><th>Question</th><th>Draft slot alone</th>" +
        "<th>Player only, no pick</th><th>Both (published)</th>" +
        "<th>Player-only vs draft slot</th></tr>" +
        row("hit", "Who becomes good") + row("bust", "Who busts for his slot") + "</table>";
      $("#predraftNote").innerHTML =
        "Held-out AUC, 2003&ndash;2021 classes. The last column is the player-only model " +
        "minus the draft-slot prior, in AUC points: negative means the pick number knows " +
        "more than everything we can measure about the player, positive means the reverse.";
    }

    const imp = D.importance.deploy || [];
    const maxG = Math.max(...imp.map(i => i.gain));
    $("#impList").innerHTML = imp.map(i =>
      '<div class="imp-row"><span class="imp-name">' + esc(featName(i.feature)) + '</span><span class="imp-bar" style="width:' + Math.max(2, (i.gain / maxG) * 320) + 'px"></span></div>').join("");
  }

  function renderCharts() {
    aucChart();
    calChart();
    roundChart();
  }

  /* ---------- projections ----------
     Every class drafted after the training window, ranked together rather than
     one at a time. Both scores are shown side by side instead of behind a
     toggle: the gap between what the model says with the pick and without it is
     the point of the page, and you cannot read a difference one column at a
     time. */
  const PROJ_YEARS = D.classes.filter(y => y > D.train_years[1]).sort((a, b) => a - b);
  const pState = { years: new Set(PROJ_YEARS), pos: "ALL", round: "0", q: "",
                   sort: "apex", dir: -1 };

  const P_COLS = [
    { key: "yr", label: "Class", num: true },
    { key: "pk", label: "Pick", num: true },
    { key: "nm", label: "Player" },
    { key: "pg", label: "Pos" },
    { key: "apex", label: "APEX", num: true },
    { key: "qapex", label: "Pre-draft", num: true },
    { key: "gap", label: "Gap", num: true },
    { key: "ph", label: "Hit", num: true },
    { key: "pbu", label: "Bust risk", num: true },
    { key: "ras", label: "RAS", num: true },
    { key: "qbp", label: "Stands in", num: true, qbOnly: true },
    { key: "out", label: "So far", sortKey: "wav" },
  ];

  const gapOf = p => (p.apex == null || p.qapex == null ? null : p.apex - p.qapex);

  function projRows() {
    let rows = D.players.filter(p => p.yr > D.train_years[1]);
    if (pState.years.size) rows = rows.filter(p => pState.years.has(p.yr));
    if (pState.pos !== "ALL") rows = rows.filter(p => p.pg === pState.pos);
    setFilmCount("#projFilmWrap", rows.filter(p => p.film).length);
    if (pState.film) rows = rows.filter(p => p.film);
    if (pState.round === "d3") rows = rows.filter(p => p.rd >= 4);
    else if (pState.round !== "0") rows = rows.filter(p => p.rd === +pState.round);
    if (pState.q) rows = rows.filter(p =>
      (p.nm || "").toLowerCase().includes(pState.q) ||
      (p.cl || "").toLowerCase().includes(pState.q) ||
      (p.tm || "").toLowerCase().includes(pState.q));

    const k = pState.sort, dir = pState.dir;
    const val = p => (k === "gap" ? gapOf(p) : p[k]);
    const byPick = (a, b) => (a.yr - b.yr) || ((a.pk ?? 999) - (b.pk ?? 999));
    return rows.slice().sort((a, b) => {
      const x = val(a), y = val(b);
      if (x == null && y == null) return byPick(a, b);
      if (x == null) return 1;              // missing always sorts last
      if (y == null) return -1;
      // dir -1 is descending, +1 ascending; ties fall back to class then pick
      const c = typeof x === "string" ? x.localeCompare(y) : x - y;
      return dir * c || byPick(a, b);
    });
  }

  const projHead = $("#projHead");
  if (projHead) {
    P_COLS.forEach(c => {
      const th = document.createElement("th");
      th.textContent = c.label;
      if (c.num) th.classList.add("num");
      th.dataset.key = c.key;
      th.title = "Sort by " + c.label;
      th.addEventListener("click", () => {
        const k = c.sortKey || c.key;
        if (pState.sort === k) pState.dir *= -1;
        else { pState.sort = k; pState.dir = (k === "pk" || k === "yr") ? 1 : -1; }
        renderProj();
      });
      projHead.appendChild(th);
    });

    const yp = $("#projYearPills");
    const mkYearPill = (label, on, fn) => {
      const b = document.createElement("button");
      b.className = "pill" + (on ? " is-active" : "");
      b.textContent = label;
      b.addEventListener("click", () => { fn(); renderProj(); syncYearPills(); });
      yp.appendChild(b);
      return b;
    };
    mkYearPill("All", true, () => { pState.years = new Set(PROJ_YEARS); });
    PROJ_YEARS.forEach(y => mkYearPill(String(y), false, () => {
      pState.years = new Set([y]);
    }));
    function syncYearPills() {
      const all = pState.years.size === PROJ_YEARS.length;
      $$(".pill", yp).forEach((b, i) => b.classList.toggle(
        "is-active", i === 0 ? all : !all && pState.years.has(+b.textContent)));
    }

    const pp = $("#projPosPills");
    POS_GROUPS.forEach(pg => {
      const b = document.createElement("button");
      b.className = "pill" + (pg === "ALL" ? " is-active" : "");
      b.textContent = pg;
      b.addEventListener("click", () => {
        pState.pos = pg;
        $$(".pill", pp).forEach(x => x.classList.toggle("is-active", x.textContent === pg));
        renderProj();
      });
      pp.appendChild(b);
    });

    $("#projRound").addEventListener("change", e => {
      pState.round = e.target.value; renderProj();
    });
    let pTimer;
    $("#projSearch").addEventListener("input", e => {
      clearTimeout(pTimer);
      pTimer = setTimeout(() => {
        pState.q = e.target.value.trim().toLowerCase(); renderProj();
      }, 120);
    });
    wireFilm("#projFilm", "#projFilmWrap", D.players.filter(p => PROJ_YEARS.includes(p.yr)),
             on => { pState.film = on; renderProj(); });
  }

  function renderProj() {
    if (!projHead) return;
    const rows = projRows();

    $$("th", projHead).forEach((th, i) => {
      const k = P_COLS[i].sortKey || P_COLS[i].key;
      th.classList.toggle("sorted", k === pState.sort);
      const a = th.querySelector(".arrow");
      if (a) a.remove();
      if (k === pState.sort) {
        const s = document.createElement("span");
        s.className = "arrow";
        s.textContent = pState.dir === -1 ? "▼" : "▲";
        th.appendChild(s);
      }
    });

    $("#projBody").innerHTML = rows.slice(0, 500).map(p => {
      const g = gapOf(p);
      // A player with no workout on record scores low pre-draft because the
      // block carrying the model's edge is simply absent, which inflates his
      // gap. Untested players average +5.7 against −0.9 for tested ones and are
      // three times over-represented at the top of this column, so the cell says
      // so rather than letting the number be read as disagreement.
      const untested = p.ras == null;
      const gapCell = (g == null ? '<span class="delta-flat">–</span>'
        : g > 8 ? '<span class="delta-up">▲ ' + g.toFixed(1) + "</span>"
        : g < -8 ? '<span class="delta-down">▼ ' + Math.abs(g).toFixed(1) + "</span>"
        : '<span class="delta-flat">' + (g >= 0 ? "+" : "−") + Math.abs(g).toFixed(1) + "</span>")
        + (untested && g != null
          ? ' <span class="untested" title="no combine or pro-day workout on record — the pre-draft score is low partly because the data is missing, so this gap is inflated">no test</span>'
          : "");
      const meta = [p.cl, p.tm].filter(Boolean).join(" · ");
      return "<tr data-id='" + p.yr + ":" + p.pk + "'>" +
        '<td class="num">' + p.yr + "</td>" +
        '<td class="num">' + (p.pk ?? "–") + "</td>" +
        '<td class="player-cell"><div class="player-name">' + esc(p.nm) + filmTag(p) +
          '</div><div class="player-meta">' + esc(meta) + "</div></td>" +
        '<td><span class="pos-chip">' + p.pg + "</span></td>" +
        '<td class="num"><span class="score-num">' + fmt1(p.apex) + "</span></td>" +
        '<td class="num"><span class="score-num dim">' + fmt1(p.qapex) + "</span></td>" +
        '<td class="num">' + gapCell + "</td>" +
        '<td class="num prob">' + pct(p.ph) + "</td>" +
        '<td class="num">' + riskCell(p.pbu) + "</td>" +
        '<td class="num prob">' + (p.ras != null ? p.ras.toFixed(2) : "–") + "</td>" +
        '<td class="num">' + holdCell(p) + "</td>" +
        '<td>' + outcomeCell(p) + "</td></tr>";
    }).join("");

    $$("tr[data-id]", $("#projBody")).forEach(tr => tr.addEventListener("click", () => {
      const [yr, pk] = tr.dataset.id.split(":").map(Number);
      const pl = D.players.find(x => x.yr === yr && x.pk === pk);
      if (pl) openModal(pl);
    }));

    // tiles describe the current filter, not the whole file
    const withGap = rows.filter(p => gapOf(p) != null);
    const meanGap = withGap.length
      ? withGap.reduce((s, p) => s + gapOf(p), 0) / withGap.length : null;
    const over = withGap.slice().sort((a, b) => gapOf(b) - gapOf(a))[0];
    const under = withGap.slice().sort((a, b) => gapOf(a) - gapOf(b))[0];
    $("#projTiles").innerHTML =
      tile("Players shown", rows.length,
           pState.years.size === PROJ_YEARS.length
             ? PROJ_YEARS[0] + "–" + PROJ_YEARS[PROJ_YEARS.length - 1] + ", never seen in training"
             : [...pState.years].join(", ") + " class") +
      tile("Median APEX", fmt1(median(rows.map(p => p.apex))), "on the 0–100 scale") +
      tile("Biggest draft-day premium", over ? esc(over.nm) : "–",
           over ? over.pg + " · " + fmt1(gapOf(over)) + " above his pre-draft score" : "") +
      tile("Biggest fall", under ? esc(under.nm) : "–",
           under ? under.pg + " · " + fmt1(-gapOf(under)) + " below his pre-draft score" : "");

    $("#projNote").innerHTML =
      "Showing " + Math.min(rows.length, 500) + " of " + rows.length + " players. " +
      "<strong>Gap</strong> is APEX minus the pre-draft score" +
      (meanGap != null ? ", averaging " + (meanGap >= 0 ? "+" : "−") +
        Math.abs(meanGap).toFixed(1) + " across this selection" : "") +
      ". A positive gap means the draft rated a player above what his own testing and production " +
      "support; it is not a claim that either number is right. <strong>Read the gap with the " +
      "&ldquo;no test&rdquo; tag in mind</strong>: a player with no workout on record scores low " +
      "pre-draft partly because the athletic block the model leans on is missing, not because the " +
      "model dislikes him. Untested players average a +5.7 gap against −0.9 for tested ones, and " +
      "make up about 45% of the largest gaps while being 16% of the field. " +
      "<strong>So far</strong> shows career value to date, which for the newest class is nothing " +
      "yet — these are the classes the model is being judged on, not the ones it learned from.";
  }

  function median(a) {
    const v = a.filter(x => x != null).sort((x, y) => x - y);
    if (!v.length) return null;
    const m = v.length >> 1;
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  }

  /* ---------- watchlist ----------
     A production board, not a projection. Ranked on what a player did in 2025;
     no APEX score, because these players have neither athletic testing nor a
     draft slot -- the two inputs the projection actually leans on. */
  const W = window.APEX_WATCH;
  if (W) {
    const wState = { pos: "ALL", q: "", tier: 0, hideThin: false, markers: false };
    const TIER_NAME = { 1: "Blue chip", 2: "Early watch", 3: "On the radar", 4: "Depth" };
    const TIER_SUB = {
      1: "85%+ likely to reach an NFL roster",
      2: "65–85% likely", 3: "40–65% likely", 4: "20–40% likely",
    };
    /* The "How this list is built" section describes what the build actually did,
       so every number in it comes from the payload rather than the markup. */
    const C = W.config || {};
    const setTxt = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    if (C.basis) {
      const TIER_BLURB = {
        1: "Already producing like a player who makes it.",
        2: "Clear starters worth tracking through the 2026 season.",
        3: "Solid, unfinished, one good year from moving up.",
        4: "On the list, not yet on a board.",
      };
      const legend = $("#tierLegend");
      if (legend) {
        legend.innerHTML = C.tiers.map(([t, cut], i) => {
          const hi = i === 0 ? 1 : C.tiers[i - 1][1];
          const lo = Math.round(cut * 100), up = Math.round(hi * 100);
          return '<li><span class="tier-chip t' + t + '">' + TIER_NAME[t] + "</span> " +
            "<strong>" + (i === 0 ? lo + "%+" : lo + "–" + up + "%") + "</strong> to reach an " +
            "NFL roster. " + TIER_BLURB[t] + "</li>";
        }).join("");
      }
      setTxt("#tierAuc", "");
      const auc = $("#tierAuc");
      if (auc && C.auc_nfl) {
        auc.innerHTML =
          "Measured walk-forward — trained on players whose college careers were over by one " +
          "season, scored on every player who took the field the next, six cohorts running: " +
          "<strong>" + C.auc_nfl.toFixed(3) + " AUC</strong> for reaching a roster and " +
          "<strong>" + C.auc_draft.toFixed(3) + "</strong> for being drafted, against " +
          C.auc_nfl_grade_only.toFixed(3) + " and " + C.auc_draft_grade_only.toFixed(3) +
          " for ranking on the grade percentile alone. Those are lower than the figures this " +
          "page used to show, because they are now measured on everyone rather than only on " +
          "players who had finished college — which is the harder and the honest population. " +
          (C.cal_nfl ? "Whether the numbers themselves are true is section 5. " : "") +
          (C.prod_only && C.prod_only.length
            ? "<strong>" + C.prod_only.join(", ") + " is the exception</strong>: this dataset has no " +
              "historical college grading for the position, so those players have no projection and " +
              "keep the older production-percentile tiers."
            : "");
      }
      // one canonical figure, read from the build rather than typed into the
      // page in two places — they had already drifted to 0.924 against 0.929
      setTxt("#cfgAucNfl2", C.auc_nfl ? C.auc_nfl.toFixed(3) : "");
      setTxt("#cfgAucNfl3", C.auc_nfl ? C.auc_nfl.toFixed(3) : "");
      if (C.mid_career_frac) setTxt("#calMid", Math.round(C.mid_career_frac * 100) + "%");

      // The reliability table. This is the page's own audit: what it said next
      // to what happened, on rows no part of the pipeline had seen.
      const cal = C.cal_nfl, calBody = $("#wlCalTable tbody");
      if (cal && cal.bands && calBody) {
        const fy = (C.folds || []).map(f => f.year).filter(y => y >= 2020);
        setTxt("#calFolds", fy.length ? fy[0] + "–" + fy[fy.length - 1] : "the held-out folds");
        calBody.innerHTML = cal.bands.map(b => {
          const off = b.said - b.was;
          return "<tr><td>" + b.band + '</td><td class="num">' + b.n.toLocaleString() +
            '</td><td class="num prob">' + (b.was * 100).toFixed(1) + "%</td>" +
            '<td class="num" style="color:' +
            (Math.abs(off) < 0.02 ? "var(--ok,#3a7)" : "var(--warn,#b70)") + '">' +
            (off > 0 ? "+" : "") + (off * 100).toFixed(1) + " pts</td></tr>";
        }).join("");
        const n = cal.bands.reduce((a, b) => a + b.n, 0);
        setTxt("#calSummary",
          n.toLocaleString() + " player-seasons. Expected calibration error " +
          cal.ece.toFixed(3) + " — on average the stated probability is off by about " +
          (cal.ece * 100).toFixed(1) + " points. Brier score " + cal.brier.toFixed(3) + ".");
      }
      const PROTO = {
        season: "Nothing from the scored season is in training",
        player: "No season of a scored <em>player</em> is in training",
        mature: "…and no training label that had not resolved yet"
      };
      const pb = $("#wlProtoTable tbody");
      if (C.protocols && pb) {
        pb.innerHTML = Object.keys(PROTO).filter(k => C.protocols[k]).map(k => {
          const v = C.protocols[k];
          return "<tr><td><strong>" + k + "</strong></td><td>" + PROTO[k] +
            '</td><td class="num prob">' + v.auc.toFixed(3) +
            '</td><td class="num">' + v.auc_lo.toFixed(3) + "–" + v.auc_hi.toFixed(3) +
            '</td><td class="num">' +
            (v.cal_ece != null ? v.cal_ece.toFixed(3) : "—") + "</td></tr>";
        }).join("");
      }
      const tb = $("#wlTopkTable tbody");
      if (C.topk && tb) {
        tb.innerHTML = C.topk.map(r =>
          "<tr><td>" + r.k + '</td><td class="num prob">' + r.found +
          '</td><td class="num">' + Math.round(r.precision * 100) + "%" +
          '</td><td class="num">' + r.baseline + "</td></tr>").join("");
        const best = C.topk.find(r => r.k === 100) || C.topk[0];
        setTxt("#wlTopkNote",
          "Pooled across all six held-out cohorts. Scouting the top " + best.k +
          " found " + best.found + " future NFL players; ranking on the production " +
          "grade alone found " + best.baseline +
          ". These are the same players the tiers are cut from.");
      }
      const pcb = $("#wlPosCalTable tbody");
      if (C.by_position && pcb) {
        pcb.innerHTML = C.by_position.map(r => {
          const gap = r.said - r.was;
          return "<tr><td><span class='pos-chip'>" + r.pos + "</span></td>" +
            '<td class="num">' + r.n.toLocaleString() +
            '</td><td class="num">' + (r.said * 100).toFixed(1) + "%" +
            '</td><td class="num prob">' + (r.was * 100).toFixed(1) + "%" +
            '</td><td class="num" style="color:' +
            (Math.abs(gap) < 0.025 ? "var(--ok,#3a7)" : "var(--warn,#b70)") + '">' +
            (gap > 0 ? "+" : "") + (gap * 100).toFixed(1) + '</td><td class="num">' +
            r.auc.toFixed(3) + "</td></tr>";
        }).join("");
        const worst = C.by_position.reduce((a, b) =>
          Math.abs(b.said - b.was) > Math.abs(a.said - a.was) ? b : a);
        setTxt("#wlPosCalNote",
          "No position is off by more than " +
          Math.abs((worst.said - worst.was) * 100).toFixed(1) +
          " points (" + worst.pos + "), and discrimination sits in a narrow band " +
          "across all nine. The tiers can be read across positions.");
      }
      const foldBody = $("#wlFoldTable tbody");
      if (C.folds && foldBody) {
        foldBody.innerHTML = C.folds.map(f =>
          "<tr><td>" + f.year + '</td><td class="num">' + f.train_n.toLocaleString() +
          '</td><td class="num">' + f.n.toLocaleString() +
          '</td><td class="num">' + Math.round(f.mid_career * 100) + "%" +
          '</td><td class="num prob">' + (f.base * 100).toFixed(1) + "%" +
          '</td><td class="num">' + f.auc.toFixed(3) + "</td></tr>").join("");
      }
      setTxt("#cfgGames", C.min_games);
      setTxt("#cfgDefSnaps", C.min_def_snaps);
      setTxt("#cfgOlSnaps", C.min_ol_snaps);
      setTxt("#cfgPool", W.n.toLocaleString());
      setTxt("#cfgMoved", W.moved10);
      setTxt("#cfgMovedMax", W.movedmax + " points");
      setTxt("#cfgThinVol", C.thin_vol_pctl);
      setTxt("#cfgThinGames", C.thin_games);

      $("#basisTable tbody").innerHTML = Object.keys(C.basis).sort().map(g =>
        '<tr><td><span class="pos-chip">' + g + "</span></td><td>" + esc(C.basis[g][0]) +
        "</td><td>" + esc(C.basis[g][1]) + '</td><td class="num prob">' +
        ((C.pool && C.pool[g]) || "–") + "</td></tr>").join("");

      // tier cuts are [tier, floor]; the ceiling is the previous tier's floor
      $("#cfgTierList").innerHTML = C.tiers.map(([t, cut], i) => {
        const hi = i === 0 ? 1 : C.tiers[i - 1][1];
        const lo = Math.round(cut * 100), up = Math.round(hi * 100);
        return '<li><span class="tier-chip t' + t + '">' + TIER_NAME[t] + "</span> " +
          (i === 0 ? lo + "% or better" : lo + "–" + up + "%") +
          " chance of reaching an NFL roster.</li>";
      }).join("");
    }

    // why a name someone remembers is missing: he is in the NFL now
    const sg = W.signed || {};
    if (sg.removed) {
      $("#watchSigned").innerHTML =
        "Anyone on an NFL roster for " + sg.rookie_year + " is off the list, <strong>including " +
        "the " + sg.udfa + " who signed as undrafted free agents</strong> — going undrafted is not " +
        "the same as still being a prospect. That removed " + sg.removed + " players." +
        (sg.ambiguous ? " " + sg.ambiguous + " more matched an NFL rookie by name only, with " +
          "neither position nor school agreeing, and were kept: name-matching alone is wrong " +
          "often enough that a removal needs a second signal." : "");
    }
    const wGroups = ["ALL"].concat([...new Set(W.players.map(p => p.pg))].sort());
    const wPills = $("#watchPills");
    wGroups.forEach(pg => {
      const b = document.createElement("button");
      b.className = "pill" + (pg === "ALL" ? " is-active" : "");
      b.textContent = pg;
      b.addEventListener("click", () => {
        wState.pos = pg;
        $$(".pill", wPills).forEach(x => x.classList.toggle("is-active", x.textContent === pg));
        renderWatch();
      });
      wPills.appendChild(b);
    });
    const tPills = $("#watchTierPills");
    [[0, "All tiers"], [1, "Blue chip"], [2, "Early watch"], [3, "On the radar"], [4, "Depth"]]
      .forEach(([t, lbl]) => {
        const b = document.createElement("button");
        b.className = "pill" + (t === 0 ? " is-active" : "");
        b.textContent = lbl;
        b.addEventListener("click", () => {
          wState.tier = t;
          $$(".pill", tPills).forEach(x => x.classList.toggle("is-active", x.textContent === lbl));
          renderWatch();
        });
        tPills.appendChild(b);
      });
    $("#watchThin").addEventListener("change", e => {
      wState.hideThin = e.target.checked; renderWatch();
    });
    $("#watchMarkers").addEventListener("change", e => {
      wState.markers = e.target.checked; renderWatch();
    });
    wireFilm("#watchFilm", "#watchFilmWrap", W.players,
             on => { wState.film = on; renderWatch(); });
    let wTimer;
    $("#watchSearch").addEventListener("input", e => {
      clearTimeout(wTimer);
      wTimer = setTimeout(() => { wState.q = e.target.value.trim().toLowerCase(); renderWatch(); }, 120);
    });

    function renderWatch() {
      let rows = W.players.filter(p => p.t > 0);
      if (wState.pos !== "ALL") rows = rows.filter(p => p.pg === wState.pos);
      if (wState.tier) rows = rows.filter(p => p.t === wState.tier);
      if (wState.hideThin) rows = rows.filter(p => !p.thin);
      if (wState.markers) rows = rows.filter(p => p.mk);
      setFilmCount("#watchFilmWrap", rows.filter(p => p.film).length);
      if (wState.film) rows = rows.filter(p => p.film);
      if (wState.q) rows = rows.filter(p =>
        (p.nm || "").toLowerCase().includes(wState.q) ||
        (p.tm || "").toLowerCase().includes(wState.q));
      // rank, not percentile: the top of every position rounds to p100, so sorting
      // on the percentile leaves the head of each tier in arbitrary order
      rows = rows.slice().sort((a, b) => a.t - b.t || a.r - b.r || b.p - a.p);

      let last = null, n = 0;
      const sizes = {};
      rows.forEach(p => { sizes[p.t] = (sizes[p.t] || 0) + 1; });
      // rows are filtered and re-sorted, so the card is looked up by render
      // position rather than by name — two players can share a name
      const shown = [];
      $("#watchBody").innerHTML = rows.slice(0, 400).map(p => {
        let sep = "";
        if (p.t !== last) {
          last = p.t; n = 0;
          // counted off the header rather than typed: it was left at 10 when
          // the "Stands in" column made eleven, and the divider under-spanned
          sep = '<tr class="tier-row t' + p.t + '"><td colspan="' +
            document.querySelectorAll("#watchTable thead th").length + '">' +
            '<span class="tier-name">' + TIER_NAME[p.t] + "</span>" +
            '<span class="tier-meta">' + sizes[p.t] + " shown · " + TIER_SUB[p.t] + "</span></td></tr>";
        }
        n++;
        return sep + "<tr class='clickable' data-w='" + shown.push(p) + "'><td class='num'>" + n + "</td>" +
          '<td class="player-cell"><div class="player-name">' + esc(p.nm) +
          (p.mk ? ' <span class="mk-tag" title="His weakest measurement is still top 5% at his position. ' +
                  Math.round(p.mk.nfl * 100) + '% of college players who did this reached an NFL roster, against ' +
                  Math.round(p.mk.base * 100) + '% overall.">no weak spot</span>' : "") +
          filmTag(p) +
          (p.thin ? ' <span class="thin-tag" title="few snaps or games — the grade is a small sample">thin sample</span>' : "") +
          "</div></td>" +
          "<td>" + esc(p.tm) + "</td>" +
          '<td class="num"><span class="pos-chip">' + p.pg + "</span></td>" +
          '<td class="num prob">' + (p.nfl != null ? Math.round(p.nfl * 100) + "%"
            : '<span class="no-proj" title="no historical college grading for this position, so no projection">–</span>') + "</td>" +
          '<td class="num prob">' + (p.drf != null ? Math.round(p.drf * 100) + "%" : "–") + "</td>" +
          '<td class="num prob">' + p.r + '<span class="of-pool"> / ' + p.pn + "</span></td>" +
          '<td class="num prob">p' + p.p + "</td>" +
          '<td class="num">' + holdCell(p) + "</td>" +
          '<td class="num prob">' + (p.v != null ? "p" + p.v : "–") + "</td>" +
          '<td class="num prob">' + (p.g != null ? p.g : "–") + "</td></tr>";
      }).join("");

      $$("tr[data-w]", $("#watchBody")).forEach(tr => tr.addEventListener("click", () => {
        const p = shown[+tr.dataset.w - 1];      // push() returns the new length
        if (p) openWatchCard(p, W);
      }));

      $("#watchNote").innerHTML =
        "Showing " + Math.min(rows.length, 400) + " of " + rows.length + " tiered players (" +
        W.n + " on the full list). <strong>Reaches NFL</strong> and <strong>Drafted</strong> are " +
        "modelled probabilities, calibrated so they can be read literally. " +
        "<strong>Grade percentile is within position and adjusted for " +
        "volume</strong>: a grade earned on 60 snaps is a claim about 60 snaps, so it is pulled " +
        "back toward the position average, while one earned across a season is left alone. That " +
        "is why the order here differs from raw grade &mdash; it moved " + (W.moved10 || 0) +
        " players by more than ten percentile points. " +
        "The underlying grades are licensed and are not published. " +
        "&ldquo;Thin sample&rdquo; marks players below the 25th percentile for volume or under " +
        "eight games; they are kept on the list rather than hidden, because a good player on a " +
        "bad team plays few snaps too.";
    }
    renderWatch();
  }

  /* ---------- boot ---------- */
  $("#genDate").textContent = "generated " + D.generated;
  renderBoard();
  renderProj();
  renderInsights();
  renderMethod();
  renderCharts();
  setTab(state.tab);
  if (state.pick != null) {
    const p = findPick(state.year, state.pick);
    if (p) openModal(p, true); else state.pick = null;
  }
})();
