#!/usr/bin/env python3
"""Lịch kinh tế: tải lịch tuần này của Forex Factory (JSON công khai, có mức tác động, dự báo, kỳ trước)
và lưu dồn vào data/calendar/ff.json để có lịch sử. Feed chỉ có tuần hiện tại và không có số thực tế;
số thực tế được bổ sung ở scripts/build_calendar.py."""
import json, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'data/calendar/ff.json'
URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'
KEEP = {'High': 'H', 'Medium': 'M'}


def main():
    req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0 (fs-bank-dashboard)'})
    try:
        raw = json.loads(urllib.request.urlopen(req, timeout=30).read().decode('utf-8'))
    except Exception as e:
        print('Không tải được lịch Forex Factory:', e); return 1
    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else []
    idx = {(e['c'], e['t'], e['d'][:10]): e for e in old}
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
    n_new = 0
    for r in raw:
        i = KEEP.get(r.get('impact'))
        if not i:
            continue
        d = datetime.fromisoformat(r['date']).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
        k = (r['country'], r['title'].strip(), d[:10])
        e = idx.get(k)
        if e is None:
            e = idx[k] = {'c': r['country'], 't': r['title'].strip(), 'd': d}; n_new += 1
        e.update({'d': d, 'i': i, 'f': (r.get('forecast') or '').strip(), 'p': (r.get('previous') or '').strip(), 'seen': now})
    out = sorted(idx.values(), key=lambda e: (e['d'], e['c'], e['t']))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding='utf-8')
    print(f'Lịch FF: {len(raw)} tin trong feed, {n_new} tin mới, tổng lưu {len(out)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
