"""data/vira/mm.json → data/vira-data.js (window.VIRA_DATA) cho mục Thị trường tiền tệ.

Cấu trúc: d = các ngày (tăng dần); vnd/usd/sofr = {kỳ hạn: [giá trị theo d, null nếu thiếu]}; src = link số Market Watch của ngày mới nhất.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / 'data/vira/mm.json'
TEN = {'vnd': ['ON', '1W', '2W', '1M', '2M', '3M', '6M', '9M', '1Y'], 'usd': ['ON', '1W', '2W', '1M', '2M', '3M', '6M', '9M', '1Y'],
       'sofr': ['SW', '2W', '1M', '3M', '6M', '9M', '1Y']}


def main():
    db = json.loads(P.read_text(encoding='utf-8')) if P.exists() else {'days': {}}
    days = sorted(db['days'])
    out = {'fetched': db.get('fetched'), 'd': days, 'src': {d: db['days'][d].get('src') for d in days[-30:]}}
    for c, tens in TEN.items():
        out[c] = {t: [db['days'][d].get(c, {}).get(t) for d in days] for t in tens}
    js = 'window.VIRA_DATA = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
    (ROOT / 'data/vira-data.js').write_text(js, encoding='utf-8')
    print(f'wrote data/vira-data.js: {len(days)} ngày')


if __name__ == '__main__':
    main()
