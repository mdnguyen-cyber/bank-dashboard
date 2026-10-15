"""Gộp các phần đọc song song (parts/*.json) vào data/vira/mm.json; giữ bản có nhiều dòng hợp lệ hơn nếu trùng ngày."""
import glob, json, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / 'data/vira/mm.json'
db = json.loads(P.read_text(encoding='utf-8')) if P.exists() else {'days': {}}
log, n = [], 0
for f in sorted(glob.glob(sys.argv[1] + '/**/*.json', recursive=True)):
    part = json.loads(Path(f).read_text(encoding='utf-8'))
    log += part.get('log', [])
    for d, rec in part['days'].items():
        old = db['days'].get(d)
        if not old or old.get('ok', 0) <= rec.get('ok', 0):
            db['days'][d] = rec
            n += 1
db['days'] = dict(sorted(db['days'].items()))
db['fetched'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
P.write_text(json.dumps(db, ensure_ascii=False, indent=0), encoding='utf-8')
bad = [x for x in log if x.get('err') or (x.get('ok') or 0) < 20]
(ROOT / 'data/vira/backfill-log.json').write_text(json.dumps({'fetched': db['fetched'], 'issues': len(log), 'weak': bad[:200]}, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'gộp {n} ngày; tổng {len(db["days"])} ngày ({min(db["days"])} → {max(db["days"])}); {len(bad)} số đọc yếu/lỗi')
