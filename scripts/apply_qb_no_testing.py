#!/usr/bin/env python3
from pathlib import Path

p = Path('index.html')
s = p.read_text()
anchor = '<script src="data.js?v=d6220d4135"></script>'
block = '''<script src="data.js?v=d6220d4135"></script>
<script src="qb-patch-2000-2007.js?v=20260811"></script>
<script src="qb-patch-2008-2014.js?v=20260811"></script>
<script src="qb-patch-2015-2020.js?v=20260811"></script>
<script src="qb-patch-2021-2026.js?v=20260811"></script>
<script src="qb-no-testing-apply.js?v=20260811"></script>'''
if 'qb-no-testing-apply.js' not in s:
    if anchor not in s:
        raise RuntimeError('data.js script anchor not found')
    s = s.replace(anchor, block, 1)

old = '<li>College production and PFF grades only exist from 2014, and PFF coverage is offense-heavy. Older classes and defenders lean more on the market + athleticism blocks.</li>'
new = old + '\n        <li><strong>QB-specific update (Aug. 2026):</strong> generic combine/RAS testing is no longer used as a predictive input for quarterbacks after a held-out ablation improved QB starter/hit performance. QB age and size remain; testing remains active for other positions. No QBASE data is included.</li>'
if 'QB-specific update (Aug. 2026)' not in s and old in s:
    s = s.replace(old, new, 1)

p.write_text(s)
print('updated index.html')
