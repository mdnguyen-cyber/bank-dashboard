"""Đường cong OIS (SOFR) Mỹ → data/global/ois.json.

Phương pháp: dựng đường lãi suất kỳ hạn qua đêm từ hợp đồng tương lai SOFR của CME, rồi tính lãi suất cố định (par) của hợp đồng hoán đổi
chỉ số qua đêm (OIS) theo từng kỳ hạn.
  - SOFR 1 tháng (SR1): 100 − giá = SOFR bình quân của tháng hợp đồng → dùng cho các tháng trước kỳ IMM kế tiếp.
  - SOFR 3 tháng (SR3): 100 − giá = SOFR cộng dồn (compounded) từ ngày IMM (thứ Tư thứ 3) của tháng hợp đồng tới IMM 3 tháng sau
    → các quý tiếp theo, nối liền nhau tới khoảng 6 năm.
  - Hệ số tích lũy G(t) = Π(1 + r·n/360). Kỳ hạn ≤ 1 năm (một lần thanh toán): OIS = (G − 1)·360/n.
    Kỳ hạn > 1 năm (trả cố định hằng năm): OIS = (1 − DF(T)) / Σ α_k·DF(t_k), DF = 1/G, α = số ngày/360.
  - Chưa điều chỉnh độ lồi (convexity) giữa hợp đồng tương lai và hoán đổi: kỳ hạn 2 năm lệch khoảng 1–2 bps, 5 năm vài bps.
Neo ngắn hạn: SOFR do Fed New York công bố (markets.newyorkfed.org).
Nguồn giá hợp đồng: CME qua Yahoo Finance (CME chặn truy cập tự động; giá có thể là giá khớp gần nhất thay vì giá thanh toán).
Nguồn hoán đổi chuẩn ICE Swap Rate (SOFR) là dữ liệu có bản quyền, không dùng được ở đây.
"""
import calendar, datetime as dt, json, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/global/ois.json'
UA = {'User-Agent': 'Mozilla/5.0 (FinSuccess dashboard; +https://github.com/mdnguyen-cyber/bank-dashboard)'}
MCODE = 'FGHJKMNQUVXZ'
TENORS = [('1M', 1), ('3M', 3), ('6M', 6), ('9M', 9), ('1Y', 12), ('18M', 18), ('2Y', 24), ('3Y', 36), ('4Y', 48), ('5Y', 60)]


def get(url, timeout=40):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8', 'replace'))


def yahoo(sym):
    """{ngày: giá đóng cửa} 3 tháng gần nhất của một hợp đồng."""
    try:
        js = get(f'https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range=3mo&interval=1d')
        r = js['chart']['result'][0]
        q = r['indicators']['quote'][0]['close']
        out = {}
        for t, c in zip(r.get('timestamp') or [], q):
            if c:
                out[dt.datetime.utcfromtimestamp(t - 4 * 3600).date().isoformat()] = round(c, 4)
        m = r['meta']
        if m.get('regularMarketPrice') and m.get('regularMarketTime'):
            out[dt.datetime.utcfromtimestamp(m['regularMarketTime'] - 4 * 3600).date().isoformat()] = round(m['regularMarketPrice'], 4)
        return out
    except Exception as e:  # noqa: BLE001
        print('yahoo lỗi', sym, e, file=sys.stderr)
        return {}


def imm(y, m):
    c = calendar.Calendar().itermonthdates(y, m)
    weds = [d for d in c if d.month == m and d.weekday() == 2]
    return weds[2]


def add_months(d, n):
    y, m = divmod(d.month - 1 + n, 12)
    y += d.year; m += 1
    return dt.date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def main():
    today = dt.date.today()
    try:
        sofr = {r['effectiveDate']: r['percentRate'] for r in get('https://markets.newyorkfed.org/api/rates/secured/sofr/last/120.json')['refRates']}
    except Exception as e:  # noqa: BLE001
        print('SOFR lỗi', e, file=sys.stderr); sofr = {}
    # SR1: từ 3 tháng trước tới 14 tháng tới; SR3: các quý có kỳ tham chiếu kết thúc sau 3 tháng trước, 26 quý
    sr1, sr3 = {}, {}
    for k in range(-3, 15):
        d = add_months(today.replace(day=1), k)
        p = yahoo(f'SR1{MCODE[d.month - 1]}{d.year % 100:02d}.CME')
        if p:
            sr1[(d.year, d.month)] = p
    q0 = add_months(today.replace(day=1), -6)
    k, n = 0, 0
    while n < 28 and k < 90:
        d = add_months(q0, k); k += 1
        if d.month % 3:
            continue
        n += 1
        p = yahoo(f'SR3{MCODE[d.month - 1]}{d.year % 100:02d}.CME')
        if p:
            sr3[(d.year, d.month)] = p
    days = sorted({x for p in list(sr1.values()) + list(sr3.values()) for x in p})
    if not days:
        print('không có giá hợp đồng', file=sys.stderr); return

    def px(p, d):   # giá của phiên gần nhất ≤ d
        ks = [x for x in p if x <= d]
        return p[max(ks)] if ks else None

    def curve(vd):
        v = dt.date.fromisoformat(vd)
        spot = [r for x, r in sofr.items() if x <= vd]
        spot = sofr[max(x for x in sofr if x <= vd)] if spot else None
        qy, qm = v.year, ((v.month - 1) // 3 + 1) * 3   # quý IMM kế tiếp (không phụ thuộc hợp đồng nào có giá)
        if imm(qy, qm) <= v:
            qy, qm = qy + qm // 12, qm % 12 + 3
        nxt = imm(qy, qm)
        per = []   # (bắt đầu, kết thúc, lãi suất %)
        cur = v
        while cur < nxt:   # các tháng trước IMM kế tiếp: SR1 (hoặc SOFR nếu thiếu)
            me = min(dt.date(cur.year, cur.month, calendar.monthrange(cur.year, cur.month)[1]) + dt.timedelta(days=1), nxt)
            p = sr1.get((cur.year, cur.month))
            r = 100 - px(p, vd) if p and px(p, vd) else spot
            if r is None:
                return None
            per.append((cur, me, r)); cur = me
        avail = {}   # quý → lãi suất SR3 tại phiên vd
        for (y, m), p in sr3.items():
            v_ = px(p, vd)
            if v_ is not None:
                avail[(y, m)] = 100 - v_
        if avail:
            y, m = qy, qm
            lastq = max(avail)
            gap = 0
            while y is not None and (y, m) <= lastq:
                s_, e_ = imm(y, m), imm(y + (m + 2) // 12, (m + 2) % 12 + 1)
                r = avail.get((y, m))
                if r is None:   # thiếu hợp đồng: nội suy tuyến tính giữa hai quý gần nhất có giá
                    lo_ = max((k_ for k_ in avail if k_ < (y, m)), default=None); hi_ = min((k_ for k_ in avail if k_ > (y, m)), default=None)
                    gap += 1
                    if lo_ is None or hi_ is None or gap > 2:
                        break
                    f_ = ((y * 12 + m) - (lo_[0] * 12 + lo_[1])) / ((hi_[0] * 12 + hi_[1]) - (lo_[0] * 12 + lo_[1]))
                    r = avail[lo_] + f_ * (avail[hi_] - avail[lo_])
                else:
                    gap = 0
                per.append((s_, e_, r)); cur = e_
                y, m = y + (m + 2) // 12, (m + 2) % 12 + 1
        if not per:
            return None
        end = per[-1][1]

        def G(t):
            g = 1.0
            for s, e, r in per:
                if t <= s:
                    break
                g *= 1 + r / 100 * (min(t, e) - s).days / 360
            return g
        out = {}
        for lab, mth in TENORS:
            T = add_months(v, mth)
            if T > end:
                continue
            if mth <= 12:
                out[lab] = round((G(T) - 1) * 360 / (T - v).days * 100, 3)
            else:
                pays = [add_months(v, 12 * j) for j in range(1, mth // 12 + 1)]
                if mth % 12:
                    pays.append(T)
                prev, ann = v, 0.0
                for t in pays:
                    ann += (t - prev).days / 360 / G(t); prev = t
                out[lab] = round((1 - 1 / G(T)) / ann * 100, 3)
        return out

    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    hist = old.get('hist', {})
    for d in days:
        if d < (today - dt.timedelta(days=95)).isoformat():
            continue
        c = curve(d)
        if c and len(c) >= 5:
            hist[d] = c
    last = max(hist) if hist else None
    if not last:
        print('không dựng được đường cong', file=sys.stderr); return
    js = {'asof': last, 'fetched': dt.datetime.utcnow().strftime('%Y-%m-%d %H:%M'), 'tenors': [t for t, _ in TENORS],
          'sofr': {'d': max(sofr), 'v': sofr[max(sofr)]} if sofr else None,
          'sofrHist': dict(sorted(sofr.items())),
          'hist': dict(sorted(hist.items())),
          'contracts': {'sr1': len(sr1), 'sr3': sorted(f'{MCODE[m - 1]}{y % 100:02d}' for y, m in sr3)}}
    OUT.write_text(json.dumps(js, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('ois', last, hist[last])


if __name__ == '__main__':
    main()
