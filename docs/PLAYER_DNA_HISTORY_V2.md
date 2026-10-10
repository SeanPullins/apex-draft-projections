# APEX Player DNA season-history expansion — October 9, 2026

## Release scope

- Source-checked **20** public prospect histories (40 completed 2024/2025 player seasons). This is a research-data and UX expansion, NOT a new validated NFL prediction model. The other 181 profiles retain earlier evidence fallback.
- Keep all 201 prospects visible. Show a reversible 20-player history filter and a one-click profile action. Mobile comparison cards stack.
- Three user-friendly perspectives: **opportunity** (usage volume and appearances where available), **efficiency** (yards per opportunity), **competition context** (verified team and conference labels, transfers, no opponent-strength grade).
- The separate frozen October 7 ESPN-derived APEX 2026 public feed is partial; it is not compared as if it were a finished season. QB passing attempts do not exist in that feed; Cam Coleman has unresolved 2026 official-vs-APEX values; injury-limited players never receive fake zeros.

## 2024–2025 public source register

Sources below are external public school career pages, ESPN historical tables and/or College Football Reference pages. All 40 source rows were checked for historical season outcomes and tied to frozen rank/name/position IDs; they have not all been cross-verified independently in a second feed. Source pages may continue updating 2026.

| Board | Player | Pos | 2024 team | 2025 team | Reference |
|---:|---|---|---|---|---|
| 1 | Jeremiah Smith | WR | Ohio State | Ohio State | [Source](https://ohiostatebuckeyes.com/sports/football/roster/jeremiah-smith/13335) |
| 5 | Arch Manning | QB | Texas | Texas | [Source](https://www.sports-reference.com/cfb/players/arch-manning-1.html) |
| 6 | Cam Coleman | WR | Auburn | Auburn | [Source](https://auburntigers.com/sports/football/roster/player/cam-coleman-1) |
| 7 | Dante Moore | QB | Oregon | Oregon | [Source](https://www.sports-reference.com/cfb/players/dante-moore-1.html) |
| 14 | Jamari Johnson | TE | Louisville | Oregon | [Source](https://www.sports-reference.com/cfb/players/jamari-johnson-1.html) |
| 16 | Jadan Baugh | RB | Florida | Florida | [Source](https://floridagators.com/sports/football/roster/jadan--baugh/18251) |
| 18 | TreyDez Green | TE | LSU | LSU | [Source](https://lsusports.net/sports/fb/roster/season/2024/player/treydez-green) |
| 21 | Julian Sayin | QB | Ohio State | Ohio State | [Source](https://ohiostatebuckeyes.com/sports/football/stats/2025) |
| 24 | Darian Mensah | QB | Tulane | Duke | [Source](https://www.sports-reference.com/cfb/players/darian-mensah-1.html) |
| 27 | Kewan Lacy | RB | Missouri | Ole Miss | [Source](https://olemisssports.com/sports/football/roster/kewan-lacy/6486) |
| 29 | Ahmad Hardy | RB | Louisiana-Monroe | Missouri | [Source](https://www.sports-reference.com/cfb/players/ahmad-hardy-1.html) |
| 31 | Drew Mestemaker | QB | North Texas | North Texas | [Source](https://www.sports-reference.com/cfb/players/drew-mestemaker-1.html) |
| 33 | Nick Marsh | WR | Michigan State | Michigan State | [Source](https://www.sports-reference.com/cfb/players/nick-marsh-3.html) |
| 41 | KJ Duff | WR | Rutgers | Rutgers | [Source](https://www.sports-reference.com/cfb/players/kj-duff-1.html) |
| 49 | Mario Craver | WR | Mississippi State | Texas A&M | [Source](https://www.sports-reference.com/cfb/players/mario-craver-1.html) |
| 52 | Deuce Alexander | WR | Wake Forest | Ole Miss | [Source](https://www.sports-reference.com/cfb/players/deuce-alexander-1.html) |
| 53 | Ryan Wingo | WR | Texas | Texas | [Source](https://www.espn.com/college-football/player/stats/_/id/5218633/ryan-wingo) |
| 54 | Jayden Maiava | QB | USC | USC | [Source](https://www.sports-reference.com/cfb/players/jayden-maiava-1.html) |
| 58 | LaNorris Sellers | QB | South Carolina | South Carolina | [Source](https://www.sports-reference.com/cfb/players/lanorris-sellers-1.html) |
| 62 | Omarion Miller | WR | Colorado | Colorado | [Source](https://www.espn.com/college-football/player/stats/_/id/4870850/omarion-miller) |

## Interpretation rules

- QB: yards/pass attempt, minimum 100 attempts in EACH completed season.
- RB: yards/rush attempt, minimum 30 carries in EACH completed season.
- WR / TE: yards/catch, minimum 20 catches in EACH completed season.
- Low-count years remain visible as recorded history but don't receive a directional growth verdict; raw rate changes do not equal talent changes.
- Usage per appearance is shown only when both real completed-season game counts are available; appearances, targets, routes, snaps, scheme, personnel and opponent difficulty are different concepts.
- Team and conference changes are highlighted but **no opponent-strength adjustments are claimed**. Conference membership does not establish schedule difficulty.
- Do not reuse NFL outcomes or protected PFF/CFBD raw rows in the public site or update APEX projections, market ranks or confidence flags.

### Examples

- **Kewan Lacy:** Missouri 2024 23 carries / 104 yards; Ole Miss 2025 306 / 1,567. A workload jump. The 23-carry prior year fails the sample floor, so do not assert a talent improvement.
- **Nick Marsh:** Michigan State 2024 41 receptions / 649 yards; 2025 59 / 662. Receptions rose while raw yards per catch declined. No route/target quality inference.
- **Jadan Baugh:** Florida 2024 133 carries / 673 yards; 2025 220 / 1,170. Opportunity increased, while raw yards per carry were similar.
- **Darian Mensah:** Tulane 2024 287 pass attempts / 2,723 yards; Duke 2025 500 / 3,973. School and conference changed, so opponent quality and scheme need independent adjustment before conclusions.

### Promotion requirements

Pass full npm and Python regression suites in PR CI; check mobile preview; verify Pages after merge. Model changes remain explicitly out of scope.

Next: fill the remaining 181 with stable player IDs and independently checked seasons; reconcile 2026 source windows; build a PRIVATE game/opponent join with as-of strength ratings and opponent-adjusted trend evaluation, then chronological holdout validation before any model promotion.
