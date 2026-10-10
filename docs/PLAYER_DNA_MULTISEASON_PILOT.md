# APEX Player DNA — public multi-season development pilot (Oct 9, 2026)

## Scope and provenance

**Descriptive, not predictive.** Four of 201 2027-board prospects have manually source-checked complete 2024 and 2025 production histories: Jeremiah Smith (#1), Arch Manning (#5), Cam Coleman (#6), Julian Sayin (#21). The other 197 prospects retain the existing honest prior-season evidence fallback.

- Jeremiah Smith: ESPN [college receiving stats](https://www.espn.com/college-football/player/stats/_/id/5079720/jeremiah-smith); 2024 76 catches/1315 yards/15 TD; 2025 87/1243/12.
- Arch Manning: ESPN [career passing table](https://www.espn.com/college-football/player/stats/_/id/4870906/arch-manning); 2024 90 attempts/939 yards/9 pass TD; 2025 404/3163/26.
- Cam Coleman: [Texas official player bio](https://texaslonghorns.com/sports/football/roster/cam-coleman/16950) with Auburn historical summary, plus [Auburn 2024](https://auburntigers.com/sports/football/roster/season/2024/player/cam-coleman-1) and [Auburn 2025](https://auburntigers.com/sports/football/roster/player/cam-coleman-1): 2024 37 catches/598 yards/8 TD; 2025 56/708/5. Explicitly show Auburn historical years, Texas 2026.
- Julian Sayin: ESPN [career passing table](https://www.espn.com/college-football/player/stats/_/id/5079712/julian-sayin); 2024 12 attempts/84 yards/1 pass TD; 2025 391/3610/32.

2026 is read only from the public site's existing **October 7 ESPN-derived snapshot**, not from new private CFBD exports. For Jeremiah Smith, the source-supported frozen 2026 rate is displayed with a strong incomplete-season warning. For Cam Coleman, Texas's four-game official bio lists 11 receptions/194 yards while the existing Oct 7 APEX feed lists 12/208; the 2026 rate is deliberately withheld until source reconciliation. For QBs, the public 2026 object has **no passing-attempt denominator**, so it explicitly abstains from a 2026 efficiency rate instead of inventing one. That does not assert that 2026 has been independently reconciled against new official school records.

## User experience

The 2024→2025 public history appears within **Player DNA → Historical comparisons & development → Development evidence**; cards are responsive and source-linked. It compares *yards per reception* for WRs and *yards per passing attempt* for QBs, with denominator and totals, retaining school for transfer. Bars have a stable metric-specific scale; unfinished 2026 totals are not shown as equivalent completed-year totals.

- Interpretation requires at least **20 receptions** or **100 attempts** in *each* completed year; below this, the UI explains the inadequate workload (both QBs' 2024 seasons) rather than concluding growth/decline.
- These are *unadjusted* rates and may include postseason. A change in efficiency or usage **is not evidence of improved skill** without opponent, playing-time, charting, health and scheme context.
- Every missing prospect and position preserves the pre-existing narrative; no false zero data or green quality status.
- No extra NFL career predictions, player ranks, quality scores, confidence upgrades or model retraining.

## Release criteria

- Assert source-backed identities, 2024/25 values and known ratios for curated records.
- Assert WR 2026 uses existing frozen summary only; QB 2026 rate is null, not guessed.
- Assert not one of 197 other prospects gets made-up cross-season statistics.
- Include module in GitHub Pages and DNA preview allowlist, mobile styles and tests.
- Confirm PR validation CI before merge; confirm Pages publishing separately.

## Remaining work

Import *independently reviewed*, distribution-permitted 2024 and 2025 player-season records for the other prospects, with source link, data vintage, school-by-season, denominator/participation and transfer identity. Reconcile the 2026 public source window against private CFBD research without republishing private raw values. Only then evaluate exposure/opponent-normalized development and chronological NFL-outcome predictive value.