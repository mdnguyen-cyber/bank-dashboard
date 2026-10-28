"""Dò lịch sử giá hợp đồng tương lai SOFR trên Yahoo (để dựng lại đường cong OIS theo ngày)."""
import json, urllib.request, datetime as dt
from pathlib import Path
UA = {'User-Agent': 'Mozilla/5.0'}
out = {}
for sym in ['SR3Z26.CME', 'SR3H27.CME', 'SR3Z27.CME', 'SR1X26.CME', 'SR1Z26.CME', 'SR3=F', 'SR1=F']:
    for rng in ['3mo', '1y', '5y']:
        try:
            u = f'https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range={rng}&interval=1d'
            js = json.loads(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40).read())
            r = js['chart']['result'][0]; ts = r.get('timestamp') or []; c = r['indicators']['quote'][0]['close']
            n = sum(1 for x in c if x)
            out[f'{sym} {rng}'] = {'n': n, 'first': dt.datetime.utcfromtimestamp(ts[0]).date().isoformat() if ts else None, 'last': dt.datetime.utcfromtimestamp(ts[-1]).date().isoformat() if ts else None}
        except Exception as e:
            out[f'{sym} {rng}'] = str(e)[:200]
Path('data/probe').mkdir(parents=True, exist_ok=True)
Path('data/probe/ois_probe.json').write_text(json.dumps(out, indent=1))
print(json.dumps(out, indent=1))
