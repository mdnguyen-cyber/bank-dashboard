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
_xf = ROOT / 'data/backfill/report_dates_extra.json'   # nguồn bổ sung khi HOSE đăng chậm
if _xf.exists():
    for s_, m in json.loads(_xf.read_text(encoding='utf-8')).items():
        if s_.startswith('_') or s_ not in out:
            continue
        for p, day in m.items():
            if p not in out[s_]['q'] or day < out[s_]['q'][p]:
                out[s_]['q'][p] = day
        out[s_]['q'] = dict(sorted(out[s_]['q'].items())[-16:])
js = 'window.RPT_DATES=' + json.dumps({'fetched': d['fetched'], 'cos': out}, ensure_ascii=False, separators=(',', ':')) + ';\n'
(ROOT / 'data/report-dates.js').write_text(js, encoding='utf-8')
print('wrote data/report-dates.js', len(js), 'B')
