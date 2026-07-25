/* APEX front-end. No dependencies; data ships in data.js as window.APEX. */
(function () {
  "use strict";
  const D = window.APEX;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  const POS_GROUPS = ["ALL", "QB", "RB", "WR", "TE", "OL", "EDGE", "DL", "LB", "DB"];
  const LATEST = Math.max(...D.classes);
  const state = { tab: "board", year: LATEST, pos: "ALL", q: "", sort: "apex", dir: -1,
                  pick: null, lens: "drafted" };

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
  const HASH = /^#(board|insights|watch|method)(?:\/(\d{4}))?(?:\/(\d{1,3}))?/;
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

  /* ---------- board table ---------- */
  const COLS = [
    { key: "rk", label: "APEX RK", num: true },
    { key: "pk", label: "Pick", num: true },
    { key: "nm", label: "Player" },
    { key: "pg", label: "Pos" },
    { key: "apex", label: "APEX", num: true },
    { key: "ph", label: "Hit", num: true },
    { key: "ps", label: "Starter", num: true },
    { key: "pbu", label: "Bust risk", num: true },
    { key: "ras", label: "RAS", num: true },
    { key: "vd", label: "Value", num: true },
    { key: "out", label: "Outcome", sortKey: "wav" },
  ];
  const head = $("#boardHead");
  COLS.forEach(c => {
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
    $$("th", head).forEach((th, i) => {
      const k = COLS[i].sortKey || COLS[i].key;
      // the score column is not APEX when the pick is withheld, and calling it
      // APEX would claim the two numbers are the same thing
      if (k === "apex" || k === "rk") {
        const preLbl = { apex: "PRE-DRAFT", rk: "PRE-DRAFT RK" };
        th.childNodes[0].nodeValue =
          state.lens === "predraft" ? preLbl[k] : COLS[i].label;
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
        sep = '<tr class="tier-row"><td colspan="' + COLS.length + '">' +
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
      return sep + "<tr data-id='" + p.yr + ":" + p.pk + "'>" +
        '<td class="num c-rk">' + (pre ? preRank : (p.rk ?? "–")) + "</td>" +
        '<td class="num c-pk">' + (p.pk ?? "–") + "</td>" +
        '<td class="player-cell c-nm"><div class="player-name">' + esc(p.nm) + '</div><div class="player-meta">' + esc(meta) + "</div></td>" +
        '<td class="c-pg"><span class="pos-chip">' + p.pg + "</span></td>" +
        '<td class="c-apex"' + (!pre && p.sd != null ? ' title="± ' + p.sd.toFixed(1) + ' if the model had been trained on a different sample of draft history"' : "") +
          '><div class="score-cell"><span class="score-num">' + fmt1(score) + '</span>' +
          (!pre && p.sd != null ? '<span class="score-sd">± ' + p.sd.toFixed(1) + "</span>" : "") +
          '<span class="meter"><i style="width:' + Math.min(100, score || 0) + '%"></i></span></div></td>' +
        '<td class="num prob c-ph">' + pct(p[L.hit]) + "</td>" +
        '<td class="num prob c-ps">' + pct(p[L.starter]) + "</td>" +
        '<td class="num c-pbu">' + riskCell(p[L.bust]) + "</td>" +
        '<td class="num prob c-ras"' + (p.ras == null ? ' title="no combine or pro-day workout on record"' : "") +
          ">" + (p.ras != null ? p.ras.toFixed(2) : "–") + "</td>" +
        '<td class="num c-vd">' + vd + "</td>" +
        '<td class="c-out">' + outcomeCell(p) + "</td></tr>";
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
  function openModal(p, fromHash) {
    lastFocus = document.activeElement;
    if (!fromHash && p.yr === state.year && state.tab === "board") {
      state.pick = p.pk;
      writeHash();
    }
    const probs = [
      ["Top-quartile career (Hit)", p.ph, p.mh],
      ["3+ year starter", p.ps, p.ms],
      ["Pro Bowler", p.pp, p.mp],
      ["Bust — bottom 25% for his draft range", p.pbu, p.mbu, true],
    ];
    const facts = [];
    facts.push(["Draft capital", "Pick " + p.pk + " · Round " + (p.rd || "–") + (p.tm ? " · " + esc(p.tm) : "")]);
    facts.push(["Age at draft", p.age != null ? p.age : "–"]);
    facts.push(["RAS (0–10)", p.ras != null ? p.ras.toFixed(2) + pctlNote(p.rasp)
      : '<span class="pctl">did not test — no combine/pro-day workout on record</span>']);
    facts.push(["PFF college grade", p.pffp != null ? "p" + Math.round(p.pffp) + ' <span class="pctl">percentile at position</span>' : "not covered"]);
    facts.push(["APEX rank in class", "#" + p.rk + " overall · #" + p.prk + " " + p.pg +
      (p.tier != null ? ' <span class="pctl">class tier ' + p.tier +
        (p.tierp != null ? " · " + p.pg + " tier " + p.tierp : "") + "</span>" : "")]);
    facts.push(["Board vs draft order", p.vd == null ? "–" : p.vd > 0 ? "model higher by " + p.vd : p.vd < 0 ? "model lower by " + (-p.vd) : "aligned"]);

    // What the model said about the player alone, before knowing where he went.
    // Worth showing per player because the gap between the two is the draft's
    // opinion: a big drop means the league saw something the inputs did not.
    let predraft = "";
    if (p.qh != null) {
      const dh = Math.round((p.ph - p.qh) * 100);
      const db = p.qbu != null ? Math.round((p.pbu - p.qbu) * 100) : null;
      const verdict = dh >= 8 ? "the draft raised him" : dh <= -8 ? "the draft lowered him"
        : "the draft agreed";
      predraft =
        '<div class="predraft"><div class="predraft-h">Before the draft ' +
        '<span class="predraft-tag">' + verdict + "</span></div>" +
        '<div class="predraft-row"><span>Hit</span><b>' + pct(p.qh) + "</b>" +
        '<span class="predraft-arrow">→ ' + pct(p.ph) + "</span></div>" +
        (p.qbu != null ? '<div class="predraft-row"><span>Bust risk</span><b>' + pct(p.qbu) +
          "</b><span class=\"predraft-arrow\">→ " + pct(p.pbu) + "</span></div>" : "") +
        '<p class="fine">Left: the model given only the player — testing, production, ' +
        'college grades, age — and no idea where he was picked. Right: the published ' +
        'number, which also knows his draft slot. On hit the draft is worth far more than ' +
        'everything else combined; on bust risk it adds almost nothing.</p></div>';
    }

    let outcome = "";
    if (p.src === 1) {
      const bits = [];
      bits.push(p.lh ? "✓ Hit (top-quartile career value at position)" : "✗ Did not reach top-quartile value");
      bits.push(p.ls ? "✓ 3+ season starter" : "✗ Under 3 seasons started");
      if (p.pb > 0) bits.push("★ " + p.pb + "× Pro Bowl" + (p.ap > 0 ? " · " + p.ap + "× All-Pro" : ""));
      const stats = ["Career AV " + (p.wav ?? 0), (p.g ?? 0) + " games", (p.st ?? 0) + " seasons started"].join(" · ");
      outcome = '<div class="outcome-band"><strong>What actually happened:</strong> ' + bits.join(" · ") + '<br><span class="prob">' + stats + "</span></div>";
    } else if (p.ns > 0) {
      const bits = [];
      if (p.fh) bits.push("✓ Top-quartile value at his position so far");
      if (p.fs) bits.push("✓ 2+ seasons started");
      if (p.pb) bits.push("★ " + p.pb + "× Pro Bowl" + (p.ap > 0 ? " · " + p.ap + "× All-Pro" : ""));
      if (!bits.length) bits.push("Not yet tracking as a top-quartile career");
      const stats = ["AV " + (p.wav ?? 0), (p.g ?? 0) + " games", (p.st ?? 0) + " seasons started"].join(" · ");
      outcome = '<div class="outcome-band"><strong>' + p.ns + " season" + (p.ns > 1 ? "s" : "") +
        " in:</strong> " + bits.join(" · ") + '<br><span class="prob">' + stats +
        " — career to date, not a final grade</span></div>";
    }

    modal.innerHTML =
      '<div class="modal-head"><div><h2 class="modal-name" id="modalName">' + esc(p.nm) + '</h2>' +
      '<div class="modal-meta">' + p.pos + " · " + esc(p.cl || "") + " · " + p.yr + " class" + '</div></div>' +
      '<button class="modal-close" aria-label="Close">✕</button></div>' +
      '<div class="modal-score"><span class="hero">' + fmt1(p.apex) + '</span>' +
      (p.sd != null ? '<span class="hero-sd">± ' + p.sd.toFixed(1) + "</span>" : "") +
      '<span class="hero-sub">APEX score (0–100)<br>' + (p.src === 1 ? "held-out backtest score" : "live projection") + "</span></div>" +
      '<div class="prob-block">' +
      probs.map(([label, v, m, isRisk]) =>
        '<div class="prob-row' + (isRisk ? " prob-row-risk" : "") + '"><span class="prob-label">' + label + '</span>' +
        '<span class="prob-track"><span class="prob-fill' + (isRisk ? " prob-fill-risk" : "") + '" style="width:' + Math.round((v || 0) * 100) + '%"></span>' +
        (m != null ? '<span class="prob-mark" style="left:' + Math.round(m * 100) + '%"></span>' : "") +
        "</span><span class=\"prob-val\">" + pct(v) + "</span></div>").join("") +
      '<div class="legend-inline"><span><span class="key" style="background:var(--series-1)"></span>APEX</span>' +
      '<span><span class="key" style="background:var(--series-2)"></span>Draft-slot prior</span></div></div>' +
      '<div class="modal-grid">' +
      facts.map(([l, v]) => '<div class="fact"><div class="fact-label">' + l + '</div><div class="fact-value">' + v + "</div></div>").join("") +
      "</div>" + predraft + outcome;
    backdrop.hidden = false;
    $(".modal-close", modal).addEventListener("click", closeModal);
    $(".modal-close", modal).focus();
  }
  const pctlNote = p => (p == null ? "" : ' <span class="pctl">· p' + Math.round(p) + " at position</span>");
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

  /* ---------- watchlist ----------
     A production board, not a projection. Ranked on what a player did in 2025;
     no APEX score, because these players have neither athletic testing nor a
     draft slot -- the two inputs the projection actually leans on. */
  const W = window.APEX_WATCH;
  if (W) {
    const wState = { pos: "ALL", q: "", tier: 0, hideThin: false };
    const TIER_NAME = { 1: "Blue chip", 2: "Early watch", 3: "On the radar", 4: "Depth" };
    const TIER_SUB = {
      1: "top 3% at the position on volume-adjusted 2025 grade",
      2: "next 7%", 3: "next 15%", 4: "next 25%",
    };
    /* The "How this list is built" section describes what the build actually did,
       so every number in it comes from the payload rather than the markup. */
    const C = W.config || {};
    const setTxt = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    if (C.basis) {
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
        const hi = i === 0 ? 100 : C.tiers[i - 1][1];
        const span = i === 0 ? "top " + (100 - cut) + "%"
          : "the next " + (hi - cut) + "%";
        return '<li><span class="tier-chip t' + t + '">' + TIER_NAME[t] + "</span> " +
          "percentile " + cut + (i === 0 ? " and above" : "–" + (hi - 1)) +
          " at the position — " + span + ".</li>";
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
      if (wState.q) rows = rows.filter(p =>
        (p.nm || "").toLowerCase().includes(wState.q) ||
        (p.tm || "").toLowerCase().includes(wState.q));
      // rank, not percentile: the top of every position rounds to p100, so sorting
      // on the percentile leaves the head of each tier in arbitrary order
      rows = rows.slice().sort((a, b) => a.t - b.t || a.r - b.r || b.p - a.p);

      let last = null, n = 0;
      const sizes = {};
      rows.forEach(p => { sizes[p.t] = (sizes[p.t] || 0) + 1; });
      $("#watchBody").innerHTML = rows.slice(0, 400).map(p => {
        let sep = "";
        if (p.t !== last) {
          last = p.t; n = 0;
          sep = '<tr class="tier-row t' + p.t + '"><td colspan="8">' +
            '<span class="tier-name">' + TIER_NAME[p.t] + "</span>" +
            '<span class="tier-meta">' + sizes[p.t] + " shown · " + TIER_SUB[p.t] + "</span></td></tr>";
        }
        n++;
        return sep + "<tr><td class='num'>" + n + "</td>" +
          '<td class="player-cell"><div class="player-name">' + esc(p.nm) +
          (p.thin ? ' <span class="thin-tag" title="few snaps or games — the grade is a small sample">thin sample</span>' : "") +
          "</div></td>" +
          "<td>" + esc(p.tm) + "</td>" +
          '<td class="num"><span class="pos-chip">' + p.pg + "</span></td>" +
          '<td class="num prob">' + p.r + '<span class="of-pool"> / ' + p.pn + "</span></td>" +
          '<td class="num prob">p' + p.p + "</td>" +
          '<td class="num prob">' + (p.v != null ? "p" + p.v : "–") + "</td>" +
          '<td class="num prob">' + (p.g != null ? p.g : "–") + "</td></tr>";
      }).join("");

      $("#watchNote").innerHTML =
        "Showing " + Math.min(rows.length, 400) + " of " + rows.length + " tiered players (" +
        W.n + " on the full list). <strong>Grade percentile is within position and adjusted for " +
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
  renderInsights();
  renderMethod();
  renderCharts();
  setTab(state.tab);
  if (state.pick != null) {
    const p = findPick(state.year, state.pick);
    if (p) openModal(p, true); else state.pick = null;
  }
})();
