# APEX mobile <=480px: pre-code layout and overflow audit

Target: phone screens 320/360/375/390/430/480 CSS px; leave desktop untouched.

| Current site surface | Observed fixed-width / overflow issue | Mobile fix |
|---|---|---|
| Six top nav items: styles.css, decision-lab.css, player-intel.css | Conflicting grids (3, 4, 5 columns) and tab hiding | 5-slot fixed bottom navigation; separate More sheet |
| Sticky header and hero | Wrapping tall nav, two-column minmax(300px), verbose guide and buttons | 48px header, a single primary CTA, swipeable summary stats, closable education card |
| Board controls and six-column table | input[type=search] min-width 220px; table min-width 970px; statline min 190px; summary min 220px | Scrollable filter chips, position select, mobile cards, 25-at-a-time paging |
| Team board | 1050px min-width!important table, 5-column dashboard and long form | Existing small-screen responsive team cards plus stepper (team, needs, philosophy, results) |
| Compare | 220px minimum left panel and 130px comparison-cell label | Stacked selectors, searchable player picker and scrollable bottom results |
| Draft Advisor | fixed-width three-column controls (210px+130px+140px) | full-width control stack and scrollable story chips |
| How APEX Works, Model Lab | 260px KEEP/KILL decision column and 170px plain-label grid | single-column rows, collapsible long copy |
| Player DNA/profile | 240/260px sidebar minima, 180px context tag, 184px actions, 230px analyzer grid | minmax(0,1fr), wrapped labels, internal scrolling |
| Modals and sheets | 760px modal, 640px sheet; 5vh top-centered | 85dvh lower sheets; full-screen player profile, focus trap/close gestures |
| 201 board rows | all initially visible; costly to scan on phones | mobile 25-card initial render; original desktop model output unchanged |

Mobile QA must test 320/360/375/390/430/480 widths, no document horizontal overflow, 44px targets, safe-area insets, reduced motion, light/dark contrast. jsdom verifies behavior and scores. Browser screenshots and Lighthouse >=90 must be measured with a real browser: do not claim success without measurement.

No ranking, model, licensed-data or desktop behavior changes are authorized by this scope.
