"""Kỳ vọng lãi suất Fed theo từng phiên họp FOMC → data/global/fedwatch.json (+ lịch sử fedwatch_hist.json).

Phương pháp: giống CME FedWatch — xác suất ngụ ý từ giá hợp đồng tương lai lãi suất quỹ liên bang 30 ngày (ZQ, CBOT).
  - Lãi suất bình quân tháng ngụ ý = 100 − giá ZQ tháng đó.
  - Tháng có họp: avg = f·r_trước + (1−f)·r_sau, f = (ngày hiệu lực − 1)/số ngày tháng (ngày hiệu lực = ngày cuối cuộc họp + 1).
    Neo r_sau bằng tháng kế tiếp không họp, hoặc r_trước bằng tháng liền trước không họp, hoặc nối chuỗi từ phiên trước.
  - Mỗi phiên: Δ = r_sau − r_trước (bước 25 bps): k = sàn(Δ/0,25) bước với xác suất 1 − phần lẻ, k+1 bước với xác suất phần lẻ;
    phân phối khoảng lãi suất mục tiêu sau từng phiên = tích chập các phiên trước.
Nguồn giá: Yahoo Finance (ZQ<tháng><năm>.CBT, giá giao dịch gần nhất); CME chặn truy cập tự động nên số có thể lệch nhẹ với CME FedWatch
(CME dùng giá thanh toán cuối ngày). Đối chiếu: thị trường dự đoán Kalshi (KXFEDDECISION) theo từng phiên.
Khoảng mục tiêu hiện hành: FRED DFEDTARL/DFEDTARU (data/global/series.json do fetch_global.py tải trước).
"""
import calendar, datetime as dt, json, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/global'
UA = {'User-Agent': 'Mozilla/5.0 (FinSuccess dashboard; +https://github.com/mdnguyen-cyber/bank-dashboard)'}
MCODE = 'FGHJKMNQUVXZ'
# dự phòng khi không đọc được lịch trên federalreserve.gov (ngày cuối mỗi cuộc họp)
FOMC_FALLBACK = ['2026-01-28', '2026-03-18', '2026-04-29', '2026-06-17', '2026-07-29', '2026-09-16', '2026-10-28', '2026-12-09']
MONTHS = {m: i for i, m in enumerate(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], 1)}
MONTHS.update({k[:3]: v for k, v in list(MONTHS.items())}); MONTHS['Sept'] = 9


def get(url, timeout=40):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read().decode('utf-8', 'replace')


def fomc_dates():
    """Ngày cuối của mỗi cuộc họp FOMC (đã công bố) từ trang lịch của Fed."""
    try:
        html = get('https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm')
    except Exception as e:  # noqa: BLE001
        print('fomc calendar lỗi', e, file=sys.stderr)
        return FOMC_FALLBACK
    out = set()
    heads = [(m.start(), int(m.group(1))) for m in re.finditer(r'(\d{4}) FOMC Meetings', html)]
    for m in re.finditer(r'fomc-meeting__month[^>]*>\s*(?:<strong>)?\s*([A-Za-z/]+)\s*(?:</strong>)?.*?fomc-meeting__date[^>]*>\s*([^<]+)<', html, re.S):
        ys = [y for pos, y in heads if pos < m.start()]
        if not ys:
            continue
        mon_last = m.group(1).split('/')[-1]
        dd = re.findall(r'\d+', m.group(2))
        if mon_last not in MONTHS or not dd:
            continue
        out.add(f'{ys[-1]}-{MONTHS[mon_last]:02d}-{int(dd[-1]):02d}')
    out = sorted(out)
    print('FOMC đọc được:', out[-12:], file=sys.stderr)
    if len(out) < 8:
        i = html.find('fomc-meeting__'); print('mẫu HTML:', html[i - 300:i + 700] if i >= 0 else 'không thấy fomc-meeting__', file=sys.stderr)
    return out if len(out) >= 8 else FOMC_FALLBACK


def zq_price(y, m):
    t = f'ZQ{MCODE[m - 1]}{str(y)[2:]}.CBT'
    try:
        js = json.loads(get(f'https://query1.finance.yahoo.com/v8/finance/chart/{t}?range=5d&interval=1d'))
        meta = js['chart']['result'][0]['meta']
        px = meta.get('regularMarketPrice')
        return t, px, dt.datetime.utcfromtimestamp(meta.get('regularMarketTime', 0)).strftime('%Y-%m-%d %H:%M')
    except Exception as e:  # noqa: BLE001
        print('ZQ lỗi', t, e, file=sys.stderr)
        return t, None, None


def target_now():
    S = json.loads((OUT / 'series.json').read_text(encoding='utf-8'))['series']
    def last(k):
        s = S.get(k) or {}
        obs = s.get('obs') or s.get('data') or []
        if isinstance(obs, dict):
            ks = sorted(obs); return obs[ks[-1]] if ks else None
        return obs[-1][1] if obs else None
    return last('us_fedtgt_lo'), last('us_fedtgt_up'), last('us_effr')


def kalshi():
    try:
        js = json.loads(get('https://api.elections.kalshi.com/trade-api/v2/events?series_ticker=KXFEDDECISION&status=open&with_nested_markets=true'))
    except Exception as e:  # noqa: BLE001
        print('kalshi lỗi', e, file=sys.stderr); return {}
    out = {}
    for ev in js.get('events', []):
        mk = {}
        for m in ev.get('markets', []):
            lab = m.get('yes_sub_title') or m.get('subtitle') or ''
            bid, ask, last = (float(m.get(k) or 0) for k in ('yes_bid_dollars', 'yes_ask_dollars', 'last_price_dollars'))
            p = (bid + ask) / 2 if ask > 0 and ask - bid <= 0.1 else last
            mk[lab] = round(p * 100, 1)
        close = (ev.get('markets') or [{}])[0].get('close_time', '')[:10]
        out[close] = {'ticker': ev.get('event_ticker'), 'p': mk}
    return out


def main():
    today = dt.date.today()
    meets = [d for d in fomc_dates() if d >= today.isoformat()][:10]
    lo, up, effr = target_now()
    if lo is None:
        print('thiếu khoảng mục tiêu hiện hành', file=sys.stderr); return
    # giá ZQ: từ tháng hiện tại tới hết tháng sau phiên cuối + 1
    last = dt.date.fromisoformat(meets[-1])
    months, (y, m) = [], (today.year, today.month)
    while (y, m) <= (last.year + (last.month == 12), last.month % 12 + 1):
        months.append((y, m)); y, m = (y + (m == 12), m % 12 + 1)
    px = {ym: zq_price(*ym) for ym in months}
    rate = {ym: (round(100 - v[1], 4) if v[1] else None) for ym, v in px.items()}
    meet_m = {(int(d[:4]), int(d[5:7])): d for d in meets}
    # chuỗi r_trước / r_sau từng phiên
    res, prev_end = [], (effr if effr is not None else (lo + up) / 2)
    for i, d in enumerate(meets):
        y, m = int(d[:4]), int(d[5:7]); N = calendar.monthrange(y, m)[1]
        eff = int(d[8:]) + 1
        f = min(1.0, (eff - 1) / N)
        avg = rate.get((y, m))
        nxt = (y + (m == 12), m % 12 + 1); prv = (y - (m == 1), (m - 2) % 12 + 1)
        if avg is None:
            break
        if nxt not in meet_m and rate.get(nxt) is not None and f > 0:
            end = rate[nxt]; start = (avg - (1 - f) * end) / f          # neo bằng tháng sau không họp (cách của CME)
        else:
            start = rate[prv] if (prv not in meet_m and rate.get(prv) is not None) else prev_end
            end = (avg - f * start) / (1 - f) if f < 1 else avg
        res.append({'date': d, 'start': round(start, 4), 'end': round(end, 4), 'chg_bps': round((end - start) * 100, 1)})
        prev_end = end
    # phân phối khoảng lãi suất (đơn vị: bước 25 bps so với hiện hành)
    dist = {0: 1.0}
    for r in res:
        steps = r['chg_bps'] / 25
        k = int(steps // 1); frac = steps - k
        nd = {}
        for s, p in dist.items():
            nd[s + k] = nd.get(s + k, 0) + p * (1 - frac)
            if frac > 1e-9:
                nd[s + k + 1] = nd.get(s + k + 1, 0) + p * frac
        dist = nd
        r['probs'] = {f'{lo + s * 0.25:.2f}-{up + s * 0.25:.2f}': round(p * 100, 1) for s, p in sorted(dist.items()) if p > 0.0005}
        r['exp_rate'] = round(sum(((lo + up) / 2 + s * 0.25) * p for s, p in dist.items()), 3)   # điểm giữa khoảng, bình quân theo xác suất
    K = kalshi()
    for r in res:
        if r['date'] in K:
            r['kalshi'] = K[r['date']]
    asof = max((v[2] for v in px.values() if v[2]), default=None)
    out = {'asOf': asof, 'fetched': dt.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC'), 'target': [lo, up], 'effr': effr,
           'meetings': res, 'zq': {f'{y}-{m:02d}': {'ticker': v[0], 'px': v[1], 'rate': rate[(y, m)]} for (y, m), v in px.items()},
           'method': __doc__.strip()}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'fedwatch.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    # lịch sử: mỗi ngày một dòng cho 4 phiên gần nhất
    hp = OUT / 'fedwatch_hist.json'
    H = json.loads(hp.read_text(encoding='utf-8')) if hp.exists() else {}
    H[today.isoformat()] = {r['date']: {'exp_rate': r['exp_rate'], 'chg_bps': r['chg_bps'], 'probs': r['probs']} for r in res[:4]}
    hp.write_text(json.dumps(dict(sorted(H.items())), ensure_ascii=False), encoding='utf-8')
    for r in res:
        print(r['date'], r['chg_bps'], max(r['probs'].items(), key=lambda x: x[1]), r.get('kalshi', {}).get('p'), file=sys.stderr)


if __name__ == '__main__':
    main()
