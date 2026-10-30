"""data/vn/report_dates.json (HOSE) → data/report-dates.js: ngày công bố sớm nhất của BCTC từng quý theo mã."""
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
d = json.loads((ROOT / 'data/vn/report_dates.json').read_text(encoding='utf-8'))
out = {}
for s, c in d['cos'].items():
    first = {}
    for p, k, day, f in c['rows']:
        if k == 'Q' and day and (p not in first or day < first[p]):
            first[p] = day
    out[s] = {'n': c.get('name'), 'q': dict(sorted(first.items())[-16:])}
js = 'window.RPT_DATES=' + json.dumps({'fetched': d['fetched'], 'cos': out}, ensure_ascii=False, separators=(',', ':')) + ';\n'
(ROOT / 'data/report-dates.js').write_text(js, encoding='utf-8')
print('wrote data/report-dates.js', len(js), 'B')
