#!/usr/bin/env python3
"""Giá hàng hóa thế giới có nguồn công khai, toàn bộ lịch sử theo ngày → data/global/cmd.json.

- Dầu WTI, Brent giao ngay: EIA qua FRED (từ 1986/1987).
- Vàng, bạc (COMEX), đường thô số 11 (ICE): giá hợp đồng tương lai gần nhất qua Yahoo Finance (từ 2000).
Chạy trên GitHub Actions; lỗi một chuỗi thì giữ bản cũ của chuỗi đó."""
import csv, io, json, sys, time, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/global/cmd.json'
UA = {'User-Agent': 'Mozilla/5.0 (FinSuccess dashboard; +https://github.com/mdnguyen-cyber/bank-dashboard)', 'Accept': 'application/json, text/csv, */*'}
FRED = {'wti': 'DCOILWTICO', 'brent': 'DCOILBRENTEU'}
YH = {'gold': 'GC=F', 'silver': 'SI=F', 'sugar': 'SB=F'}


def get(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return r.read().decode('utf-8')
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(2 * (i + 1))
    raise err


def fred(sid):
    rows = list(csv.reader(io.StringIO(get(f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}&cosd=1980-01-01'))))
    return [[d, round(float(v), 3)] for d, v in rows[1:] if v not in ('', '.')]


def yahoo(sym):
    js = json.loads(get(f'https://query1.finance.yahoo.com/v8/finance/chart/{urllib.request.quote(sym)}?period1=946684800&period2={int(time.time())}&interval=1d'))['chart']['result'][0]
    ts, cl = js['timestamp'], js['indicators']['quote'][0]['close']
    tz = timezone(timedelta(seconds=js.get('meta', {}).get('gmtoffset', -18000)))
    out = {}
    for t, c in zip(ts, cl):
        if c:
            out[datetime.fromtimestamp(t, tz).date().isoformat()] = round(c, 3)
    return sorted([d, v] for d, v in out.items())


def main():
    old = json.loads(OUT.read_text(encoding='utf-8')).get('s', {}) if OUT.exists() else {}
    s, rep = {}, {}
    for k, f in [*((k, lambda sid=sid: fred(sid)) for k, sid in FRED.items()), *((k, lambda sym=sym: yahoo(sym)) for k, sym in YH.items())]:
        try:
            s[k] = f(); rep[k] = f'{len(s[k])} điểm {s[k][0][0]} → {s[k][-1][0]}'
        except Exception as e:  # noqa: BLE001
            rep[k] = 'lỗi: ' + str(e)[:150]
            if k in old:
                s[k] = old[k]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'fetched': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), 'report': rep, 's': s}, separators=(',', ':')), encoding='utf-8')
    for k, v in rep.items():
        print(k, '→', v)
    return 0


if __name__ == '__main__':
    sys.exit(main())
