"""Red-team probes for APEX Phase 1 labels. Aggregate output only."""
import sys, csv, io, json
from collections import Counter, defaultdict
from pathlib import Path
sys.path.insert(0, "/home/claude/seanpullins/apex-draft-projections/scripts")
from phase1_nfl_snap_baseline import parse_sources, build_labels, band_for, FIRST, LAST_SNAP
from phase1_roster_reconciliation import roster_evidence

cache = Path(sys.argv[1])
picks, snaps, audit, _ = parse_sources(cache)
labels, _ = build_labels(picks, snaps, audit)
R = {}

# P3 unsupported positions
R["unsupported_positions"] = dict(Counter(l["position"] for l in labels if l["status"] == "POSITION_UNSUPPORTED"))
# P8 raw position mix for mapped edge/LB
R["raw_pos_core"] = dict(Counter(l["position"] for l in labels if l["year"] >= FIRST and l["position_group"] in ("EDGE", "LB", "IDL", "CB")))

# P4/P5/P9 snap feed integrity
gt, games_team, miss = Counter(), defaultdict(lambda: defaultdict(set)), Counter()
snap_ids_any_year = set()
for y in range(FIRST, LAST_SNAP + 1):
    for r in csv.DictReader(io.StringIO((cache / f"snap_counts_{y}.csv").read_text("utf-8-sig"))):
        g = (r.get("game_type") or "").strip().upper()
        gt[g or "<blank>"] += 1
        if g == "REG":
            games_team[y][r["team"]].add(r["game_id"])
            for c in ("offense_snaps", "defense_snaps"):
                if (r.get(c) or "").strip() == "": miss[(y, c)] += 1
        if r.get("pfr_player_id"): snap_ids_any_year.add(r["pfr_player_id"])
R["game_type_counts"] = dict(gt)
R["reg_games_per_season"] = {y: len(set().union(*t.values())) for y, t in games_team.items()}
R["teams_with_wrong_game_count"] = {y: {tm: len(g) for tm, g in t.items() if len(g) != (17 if y >= 2021 else 16)} for y, t in games_team.items()}
R["teams_with_wrong_game_count"] = {k: v for k, v in R["teams_with_wrong_game_count"].items() if v}
R["missing_snap_values"] = {f"{k[0]}:{k[1]}": v for k, v in miss.items()}

# P1 alternate-ID snap recovery
ev, gsis_ev, _, _ = roster_evidence(cache)
nos = [l for l in labels if l["status"] == "NO_SNAP_ENTRY_UNCONFIRMED"]
alt_found, draft_id_any_year, alt_ids = 0, 0, 0
for l in nos:
    if l["pfr_id"] in snap_ids_any_year: draft_id_any_year += 1
    g = gsis_ev.get(l["gsis_id"]) if l["gsis_id"] else None
    if g:
        others = g["pfr_ids"] - {l["pfr_id"]}
        if others: alt_ids += 1
        if any((y, o) in snaps for o in others for y in range(l["year"], l["year"] + 4)):
            alt_found += 1
R["no_snap_with_draft_pfr_in_snap_feed_any_year"] = draft_id_any_year
R["no_snap_gsis_roster_has_other_pfr_id"] = alt_ids
R["no_snap_recovered_via_alternate_pfr_id_in_window"] = alt_found

# P2 roster status of the 146 roster-seen players (window weeks)
st = Counter(); per_player = Counter()
for l in nos:
    yrs = set(range(l["year"], l["year"] + 4))
    e = ev.get(l["pfr_id"]) if l["pfr_id"] else None
    if not (e and e["years"] & yrs):
        e = None
    s = e["statuses"] if e else set()
    if not e and l["gsis_id"] in gsis_ev and gsis_ev[l["gsis_id"]]["years"] & yrs:
        s = {"<gsis-only:status-not-indexed>"}
    if e or s:
        per_player["ACT_ever" if "ACT" in s else "never_ACT"] += 1
        for x in s: st[x] += 1
R["roster_status_any_in_window"] = dict(st)
R["roster_seen_players_ever_ACT"] = dict(per_player)

# P6 bounds: excluded vs zero for no-snap
def band_mean(rows):
    return round(sum(rows) / len(rows)) if rows else None
bounds = {}
for lo, hi in [(1, 32), (33, 100), (101, 200), (201, 300)]:
    part = [l["four_year_unit_snaps"] for l in labels if l["status"] == "COMPLETE_OBSERVED_PARTICIPANT" and lo <= l["pick"] <= hi]
    zeros = [0] * sum(1 for l in nos if lo <= l["pick"] <= hi)
    bounds[f"{lo}-{hi}"] = {"participants_only": band_mean(part), "no_snap_as_zero": band_mean(part + zeros),
                            "n_part": len(part), "n_no_snap": len(zeros)}
R["late_band_bounds"] = bounds

# P7 era effect: per-season snaps of picks 1-64 participants, by number of 17-game seasons in window
era = defaultdict(list)
for l in labels:
    if l["status"] == "COMPLETE_OBSERVED_PARTICIPANT" and l["pick"] <= 64:
        n17 = sum(1 for y in range(l["year"], l["year"] + 4) if y >= 2021)
        era[n17].append(l["four_year_unit_snaps"])
R["picks1_64_mean_4yr_snaps_by_17game_seasons_in_window"] = {k: (band_mean(v), len(v)) for k, v in sorted(era.items())}

# P10 role_y3_proxy rate by class (era drift in absolute threshold)
rate = defaultdict(lambda: [0, 0])
for l in labels:
    if l["role_y3_proxy"] is not None:
        rate[l["year"]][0] += l["role_y3_proxy"]; rate[l["year"]][1] += 1
R["role_y3_proxy_rate_by_class"] = {y: round(a / b, 3) for y, (a, b) in sorted(rate.items())}
print(json.dumps(R, indent=1, default=str))
