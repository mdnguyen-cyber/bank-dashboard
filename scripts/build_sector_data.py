#!/usr/bin/env python3
"""Dựng data/sector-data.js (window.SECTOR_DATA) cho dashboard CSTT + ngành Ngân hàng.

- Mọi số lấy từ response Wi MCP gốc trong data/raw/wi/ (lưu bởi scripts/wi_capture_transcript.py).
- Chỉ số tổng hợp IDX-FX, IDX-LIQ theo deck "Hướng dẫn xây dựng dashboard ngân hàng" (slide 39, 52):
  z = (x − TB 36 tháng) / ĐLC 36 tháng; chỉ số = trung bình (dấu × z), trọng số bằng nhau.
  Tính theo THÁNG (Wi nén chuỗi ngày về giá trị cuối tháng); chuỗi tháng/quý giữ số gần nhất tới khi có số mới.
- Các chỗ lệch so với deck (do dữ liệu Wi MCP) ghi ở D['idx']['deviations'] và hiện trên dashboard.

Dùng: python3 scripts/build_sector_data.py
"""
import json, math, statistics, sys, pathlib
import datetime as dt
from collections import defaultdict

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from build_ctg_data import load_raw, rows, flt  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[1]
TODAY = __import__('datetime').date.today().isoformat()   # ngày dựng dữ liệu
BANKS = ['VCB', 'BID', 'CTG', 'MBB', 'TCB', 'ACB', 'VPB', 'HDB', 'LPB', 'SHB', 'STB', 'VIB', 'TPB', 'MSB',
         'SSB', 'OCB', 'EIB', 'NAB', 'ABB', 'KLB', 'VAB', 'BVB', 'BAB', 'PGB', 'SGB', 'NVB']
GROUP = {'VCB': 'Big 4', 'BID': 'Big 4', 'CTG': 'Big 4'}
GROUP.update({s: 'Tư nhân lớn' for s in ['MBB', 'TCB', 'ACB', 'VPB', 'HDB', 'LPB']})
GROUP.update({s: 'Tư nhân vừa' for s in ['SHB', 'STB', 'VIB', 'TPB', 'MSB', 'SSB', 'OCB', 'EIB']})
GROUP.update({s: 'Tư nhân nhỏ' for s in ['NAB', 'ABB', 'KLB', 'VAB', 'BVB', 'BAB', 'PGB', 'SGB', 'NVB']})
WIN, MINW = 36, 24  # cửa sổ z-score (tháng) và số điểm tối thiểu


def r(v, n=2):
    return None if v is None or (isinstance(v, float) and math.isnan(v)) else round(v, n)


def ym(d):
    return d[:7]


def months(a, b):
    y, m = int(a[:4]), int(a[5:7])
    out = []
    while f'{y:04d}-{m:02d}' <= b:
        out.append(f'{y:04d}-{m:02d}')
        m += 1
        if m == 13:
            y, m = y + 1, 1
    return out



def daily_merged(raw, iid):
    """Gộp chuỗi ngày (và tuần do Wi nén) của một chỉ tiêu vĩ mô từ mọi lần kéo; trùng ngày lấy file sau."""
    out = {}
    for d in raw:
        if d['tool'] != 'wi_data_macro':
            continue
        for s in (d['response'].get('data') or []):
            if s.get('indicator_id') != iid or s.get('time_type') in ('monthly', 'quarterly', 'yearly'):
                continue
            for v in s.get('values', []):
                if v.get('value') is not None:
                    out[v['date']] = v['value']
    return [{'d': k, 'v': out[k]} for k in sorted(out)]

def main():
    raw = load_raw(ROOT / 'data/raw/wi')

    # ------------------------------------------------ macro: gộp mọi file, ưu tiên tháng > quý > tuần, số mới ghi đè
    pref = {'monthly': 3, 'quarterly': 1, 'weekly': 2, 'daily': 4}
    series = defaultdict(dict)   # id -> {YYYY-MM: (prio, date, value)}
    for d in raw:
        if d['tool'] != 'wi_data_macro':
            continue
        dat = d['response'].get('data', []) if isinstance(d['response'], dict) else []
        for s in (dat if isinstance(dat, list) else []):
            if not isinstance(s, dict) or 'values' not in s:   # bỏ qua kết quả list_indicators hoặc dạng bảng
                continue
            p = pref.get(s.get('time_type'), 0)
            for v in s['values']:
                k = ym(v['date'])
                old = series[s['indicator_id']].get(k)
                if v['value'] is None:
                    continue
                if old is None or p > old[0] or (p == old[0] and v['date'] >= old[1]):
                    series[s['indicator_id']][k] = (p, v['date'], v['value'])
    # trái phiếu (ngày → cuối tháng)
    for d in raw:
        if d['tool'] == 'wi_data_gbond' and d['request'].get('endpoint_name') == 'bonds_gov_yield_curve':
            for row in rows(d['response']):
                k = ym(row['date'])
                old = series[row['indicator_id']].get(k)
                if old is None or row['date'] >= old[1]:
                    series[row['indicator_id']][k] = (4, row['date'], row['value'])
    # Brent (commodity)
    for d in raw:
        if d['tool'] == 'wi_data_commodity':
            for s in d['response'].get('data', []):
                for v in s['values']:
                    o = series[s['indicator_id']].get(ym(v['date']))
                    if v['value'] is not None and (o is None or v['date'] >= o[1]):
                        series[s['indicator_id']][ym(v['date'])] = (4, v['date'], v['value'])

    def S(iid):
        return {k: v[2] for k, v in sorted(series[iid].items())}

    def last(iid):
        k = max(series[iid])
        return {'d': series[iid][k][1], 'v': series[iid][k][2]}

    def lst(iid, frm='2019-01'):
        return [{'d': series[iid][k][1], 'v': r(series[iid][k][2], 4)} for k in sorted(series[iid]) if k >= frm]

    M = months('2019-01', TODAY[:7])

    def ffill(dct, maxgap=6):
        out, lastv, lastk = {}, None, None
        for k in M:
            if k in dct:
                lastv, lastk = dct[k], k
            if lastv is not None and M.index(k) - M.index(lastk) <= maxgap:
                out[k] = lastv
        return out

    dxy, usdvnd, effr, ust10, on, omo = S(235028), S(82223), S(7079), S(234521), S(82237), S(81522)
    dep12 = S(202886)
    m2, depy, cry = S(265954), S(265963), S(75847)
    trade, fdi = S(255693), S(76951)
    rev, exp = S(82420), S(75598)  # quý, tỷ VND, ngày = tháng đầu quý cuối (03, 06, 09, 12)

    def pchg(dct, k, n):
        i = M.index(k)
        if i < n:
            return None
        a, b = dct.get(k), dct.get(M[i - n])
        return None if a is None or b is None else (a / b - 1) * 100

    def roll_mean(dct, k, n):
        i = M.index(k)
        vals = [dct.get(M[j]) for j in range(max(0, i - n + 1), i + 1)]
        vals = [v for v in vals if v is not None]
        return statistics.mean(vals) if len(vals) == n else None

    def roll_sum(dct, k, n):
        i = M.index(k)
        vals = [dct.get(M[j]) for j in range(max(0, i - n + 1), i + 1)]
        return sum(vals) if all(v is not None for v in vals) and len(vals) == n else None

    on3 = {k: roll_mean(on, k, 3) for k in M}
    # thành phần thô theo tháng
    fx_raw = {
        'dxy3m': {k: pchg(dxy, k, 3) for k in M},
        'usdvnd3m': {k: pchg(usdvnd, k, 3) for k in M},
        'ust10': {k: ust10.get(k) for k in M},
        'spread': {k: (on3[k] - effr[k]) if on3.get(k) is not None and effr.get(k) is not None else None for k in M},
        'ext12': {k: ((roll_sum(trade, k, 12) or 0) + (roll_sum(fdi, k, 12) or 0)) / 1000
                  if roll_sum(trade, k, 12) is not None and roll_sum(fdi, k, 12) is not None else None for k in M},
    }
    # tài khóa: chi − thu 4 quý gần nhất (tỷ VND), gán cho các tháng sau quý đó (giữ tới khi có số mới)
    fq = sorted(k for k in rev if k in exp)
    fisc_q = {}
    for i, k in enumerate(fq):
        if i >= 3:
            fisc_q[k] = sum(exp[fq[j]] - rev[fq[j]] for j in range(i - 3, i + 1)) / 1000
    liq_raw = {
        'm2': ffill({k: m2[k] for k in m2}),
        'on3': {k: on3[k] for k in M},
        'depcr': ffill({k: depy[k] - cry[k] for k in depy if k in cry}),
        'fiscal': ffill(fisc_q, maxgap=5),
    }
    for kk in ['ext12']:
        fx_raw[kk] = ffill({k: v for k, v in fx_raw[kk].items() if v is not None}, maxgap=3)

    FXC = [('dxy3m', 'DXY, % 3 tháng', 1, 'INT-01'), ('usdvnd3m', 'USD/VND NHTM bán ra, % 3 tháng', 1, 'DOM-02'),
           ('ust10', 'Lợi suất UST 10Y, %', 1, 'INT-06'), ('spread', 'LNH qua đêm (TB 3 tháng) − EFFR, điểm %', -1, 'DOM-04'),
           ('ext12', 'Cán cân XNK + FDI giải ngân 12 tháng, tỷ USD', -1, 'DOM-06')]
    LQC = [('m2', 'M2, % YoY (thay tiền cơ sở)', 1, 'DOM-12'), ('on3', 'LNH qua đêm TB 3 tháng, %', -1, 'DOM-07'),
           ('depcr', 'Tiền gửi YoY − tín dụng YoY, điểm %', 1, 'DOM-11/10'), ('fiscal', 'Chi − thu NSNN 4 quý, nghìn tỷ', 1, 'DOM-15')]

    def zser(dct):
        out = {}
        for i, k in enumerate(M):
            if dct.get(k) is None:
                continue
            win = [dct[M[j]] for j in range(max(0, i - WIN + 1), i + 1) if dct.get(M[j]) is not None]
            if len(win) >= MINW:
                sd = statistics.pstdev(win)
                if sd > 0:
                    out[k] = (dct[k] - statistics.mean(win)) / sd
        return out

    def build_idx(comp, rawd):
        zs = {key: zser(rawd[key]) for key, *_ in comp}
        idx = {}
        for k in M:
            vals = [sign * zs[key][k] for key, _, sign, _ in comp if k in zs[key]]
            if len(vals) >= max(2, len(comp) - 2):
                idx[k] = statistics.mean(vals)
        return zs, idx

    zfx, IFX = build_idx(FXC, fx_raw)
    zlq, ILQ = build_idx(LQC, liq_raw)
    common = [k for k in M if k in IFX and k in ILQ and k >= '2021-01']

    def quad(fx, lq):
        hi, rich = fx >= 0, lq >= 0
        return {(False, True): 'ease', (True, True): 'drain', (False, False): 'room', (True, False): 'tight'}[(hi, rich)]

    hist = [{'m': k, 'fx': r(IFX[k]), 'liq': r(ILQ[k]), 'q': quad(IFX[k], ILQ[k])} for k in common]
    now = hist[-1]

    def comps(comp, rawd, zs, k):
        return [{'id': cid, 'key': key, 'label': lab, 'sign': '+' if sg > 0 else '−', 'raw': r(rawd[key].get(k), 2),
                 'z': r(zs[key].get(k)), 'contrib': r(sg * zs[key][k]) if k in zs[key] else None} for key, lab, sg, cid in comp]

    # backtest: P = IDX-FX − IDX-LIQ ; dự báo chiều LS huy động 12T NHTM Nhà nước sau H tháng
    def backtest(H):
        out = []
        for k in common:
            j = M.index(k) + H
            if j >= len(M) or M[j] not in dep12 or k not in dep12:
                continue
            p = IFX[k] - ILQ[k]
            if abs(p) < 0.5:
                continue
            chg = dep12[M[j]] - dep12[k]
            res = 'flat' if abs(chg) < 0.05 else ('hit' if (p > 0) == (chg > 0) else 'miss')
            out.append({'m': k, 'p': r(p), 'chg': r(chg, 3), 'res': res})
        n = {x: sum(1 for b in out if b['res'] == x) for x in ('hit', 'miss', 'flat')}
        dirn = n['hit'] + n['miss']
        return {'h': H, **n, 'rate': r(n['hit'] / dirn * 100, 0) if dirn else None, 'rows': out}

    D = {'meta': {'title': 'CSTT & Ngành Ngân hàng', 'updated': TODAY,
                  'banks': BANKS, 'groups': GROUP,
                  'note': 'Số liệu Wi MCP; phần tự tính có công thức ở chân trang và tab Sources.'}}
    D['idx'] = {
        'now': now, 'history': hist,
        'fxComp': comps(FXC, fx_raw, zfx, now['m']), 'liqComp': comps(LQC, liq_raw, zlq, now['m']),
        'backtest': {'h3': backtest(3), 'h6': backtest(6), 'target': 60,
                     'rule': 'P = IDX-FX − IDX-LIQ, chỉ xét tháng có |P| ≥ 0,5. P > 0 → dự báo LS huy động 12T NHTM Nhà nước tăng; P < 0 → giảm. Thay đổi < 5 bps = đi ngang (không tính vào tỷ lệ đúng hướng).'},
        'deviations': [
            'Tính theo tháng (giá trị cuối tháng Wi nén từ chuỗi ngày), deck đề xuất theo tuần.',
            'Tiền cơ sở (DOM-12) chưa có trong Wi MCP → dùng M2 % YoY.',
            'USD/VND liên ngân hàng → dùng tỷ giá NHTM bán ra (82223).',
            'Chênh lệch VND–USD dùng LNH qua đêm trung bình 3 cuối tháng − EFFR (deck: LNH 1 tháng − SOFR).',
            'Cán cân đối ngoại chưa gồm kiều hối và khối ngoại ròng (deck DOM-06).',
            'Tài khóa: Wi chỉ có số quý → chi − thu 4 quý gần nhất (deck: 3 tháng) để khử mùa vụ chi cuối năm; chưa có tiền gửi KBNN (DOM-16).',
            'UST 10Y chỉ có từ 08/2023 → thành phần này vào chỉ số từ 08/2025 (đủ 24 tháng).',
        ],
    }

    # ------------------------------------------------ chuỗi vĩ mô cho tab Bức tranh
    D['intl'] = {
        'dxy': lst(235028), 'effr': lst(7079), 'ust10': lst(234521, '2021-01'), 'vn10': lst(234526, '2021-01'),
        'cny': lst(235032, '2021-01'), 'brent': lst(203084, '2021-01'),
    }
    D['dom'] = {
        'nhtmSell': lst(82223), 'nhtmBuy': lst(82224), 'free': lst(82226), 'central': lst(82227),
        'freeD': [p for p in daily_merged(raw, 82226) if p['d'] >= '2021-01-01'], 'nhtmD': [p for p in daily_merged(raw, 82223) if p['d'] >= '2021-01-01'],
        'ceiling': lst(82228), 'sbvSell': lst(82231),
        'on': lst(82237), 'omo': lst(81522), 'net': lst(82268, '2021-01'),
        'dep12State': lst(202886), 'dep12Large': lst(202874, '2021-01'), 'dep12Other': lst(202880, '2021-01'),
        'm2': lst(265954), 'depYoY': lst(265963), 'creditYoY': lst(75847), 'creditYtd': lst(241732),
        'depHH': lst(265981), 'depCorp': lst(265972),
        'cpi': lst(75701), 'cpiCore': lst(202889), 'cpiAvg': lst(75804),
        'reserves': lst(76885), 'trade': lst(255693), 'fdi': lst(76951),
        'revQ': lst(82420), 'expQ': lst(75598),
    }
    # bơm/hút OMO và LNH qua đêm theo phiên (gộp các lần kéo theo quý, từ 2021)
    D['dom']['netDaily'] = daily_merged(raw, 82268)
    D['dom']['onDaily'] = daily_merged(raw, 82237)
    D['dom']['omoDaily'] = daily_merged(raw, 81522)
    for _k, _iid in [('dep12StateD', 202886), ('dep12LargeD', 202874), ('dep12OtherD', 202880)]:   # lãi suất huy động 12T theo ngày (từ 10/2024)
        D['dom'][_k] = [p for p in daily_merged(raw, _iid) if p['d'] >= '2024-10-01']

    # ------------------------------------------------ ngân hàng
    def bank_rows(endpoint, cols):
        out = []   # gộp mọi file 26 NH theo quý (2021–22 + 2023–26); file sau ghi đè kỳ trùng
        for d in raw:
            if d['tool'] == 'wi_data_companies' and d['request'].get('endpoint_name') == endpoint:
                f = flt(d['request'])
                if f.get('symbol', '').count(',') >= 20 and f.get('quarter') == '1,2,3,4':
                    out += rows(d['response'])
        return out

    panel = defaultdict(dict)
    for ep in ['ratio_bank_ttm', 'ratio_bank', 'ratio_common_ttm']:
        for row in bank_rows(ep, None):
            key = (row['symbol'], row['year'], row['quarter'])
            panel[key].update({k: v for k, v in row.items() if k not in ('symbol', 'year', 'quarter')})
    PCT = ['nim', 'cof', 'yea', 'cir', 'casa_ratio', 'npl_ratio', 'group2_loan_ratio', 'npl_coverage_ratio', 'ldr',
           'credit_growth_yoy', 'roe', 'roa', 'profit_parent_yoy']
    REN = {'casa_ratio': 'casa', 'npl_ratio': 'npl', 'group2_loan_ratio': 'g2', 'npl_coverage_ratio': 'llr',
           'credit_growth_yoy': 'creditYoY', 'profit_parent_yoy': 'npYoY', 'market_cap': 'mcap', 'credit_balance': 'credit'}
    quarters = sorted({(y, q) for (_, y, q) in panel})
    QL = [f'Q{q}/{y}' for y, q in quarters]
    banks = {}
    for s in BANKS:
        ser = defaultdict(list)
        for (y, q) in quarters:
            row = panel.get((s, y, q), {})
            for k, v in row.items():
                name = REN.get(k, k)
                if v is None:
                    val = None
                elif k in PCT:
                    val = r(v * 100, 2)
                elif k in ('market_cap', 'credit_balance'):
                    val = r(v / 1e9, 0)
                else:
                    val = r(v, 2)
                # NVB/CIR âm hoặc > 100%: bất thường do thu nhập hoạt động âm — bỏ để không méo chart
                if name == 'cir' and val is not None and (val < 0 or val > 150):
                    val = None
                ser[name].append(val)
        banks[s] = {'group': GROUP[s], **ser}
    D['banks'] = {'quarters': QL, 'series': banks}

    # định giá theo phiên gần nhất
    daily = None
    for d in raw:
        if d['tool'] == 'wi_data_companies' and d['request'].get('endpoint_name') == 'ratio_daily':
            daily = rows(d['response'])
    lastday = max(x['trading_date'] for x in daily)
    val = {x['symbol']: x for x in daily if x['trading_date'] == lastday}
    latest = []
    for s in BANKS:
        b, v = banks[s], val.get(s, {})
        g = lambda k: (b.get(k) or [None])[-1]
        price = r(v['pb'] * v['bvps'], 0) if v.get('pb') and v.get('bvps') else None
        latest.append({'s': s, 'group': GROUP[s], 'price': price, 'pb': r(v.get('pb')), 'pe': r(v.get('pe')),
                       'mcap': r((v.get('market_cap') or 0) / 1e9, 0), 'bvps': r(v.get('bvps'), 0),
                       'nim': g('nim'), 'cof': g('cof'), 'yea': g('yea'), 'cir': g('cir'), 'casa': g('casa'),
                       'npl': g('npl'), 'g2': g('g2'), 'llr': g('llr'), 'ldr': g('ldr'), 'creditYoY': g('creditYoY'),
                       'roe': g('roe'), 'roa': g('roa'), 'npYoY': g('npYoY'), 'credit': g('credit')})
    # ---- lợi nhuận trước dự phòng (PPOP = is130), chi phí dự phòng (is140), LNST (is190): TTM từng NH và toàn ngành
    pq = {}
    for d in raw:
        if d['tool'] == 'wi_data_companies' and d['request'].get('endpoint_name') == 'fs_bank' and d['request'].get('tag') == 'ppop':
            for x in rows(d['response']):
                pq.setdefault((x['year'], x['quarter']), {})[x['symbol']] = x
    pqs = sorted(pq)
    def pttm(i, k, sym=None):
        return sum((pq[pqs[j]].get(s_, {}).get(k) or 0) for j in range(i - 3, i + 1) for s_ in ([sym] if sym else BANKS)) / 1e9
    if len(pqs) >= 8:
        li = len(pqs) - 1
        for row in latest:
            s_ = row['s']; p, p0, pv = pttm(li, 'is130', s_), pttm(li - 4, 'is130', s_), -pttm(li, 'is140', s_)
            row['ppop'] = r(p, 0)
            row['pppop'] = r(row['mcap'] / p) if p > 0 and row.get('mcap') else None
            row['provRatio'] = r(pv / p * 100, 1) if p > 0 else None
            row['ppopYoY'] = r((p / p0 - 1) * 100, 1) if p0 > 0 else None
        D['ppopSector'] = {'q': [f'Q{q}/{y}' for y, q in pqs[3:]], 'end': [f'{y}-{q * 3:02d}' for y, q in pqs[3:]],
                           'ppop': [r(pttm(i, 'is130') / 1e3, 1) for i in range(3, len(pqs))],
                           'prov': [r(-pttm(i, 'is140') / 1e3, 1) for i in range(3, len(pqs))],
                           'npat': [r(pttm(i, 'is190') / 1e3, 1) for i in range(3, len(pqs))],
                           'src': 'BCTC hợp nhất 26 ngân hàng niêm yết, cộng 4 quý gần nhất'}
    D['latest'] = {'quarter': QL[-1], 'priceDate': lastday, 'rows': latest}

    # P/B lịch sử từng NH: cuối mỗi quý (ratio_bank) + mọi phiên có trong các lần kéo ratio_daily; trung vị ngành theo cùng ngày
    import calendar as _cal
    pbh = {s_: {} for s_ in BANKS}
    for qi, ql in enumerate(QL):
        q_, y_ = int(ql[1]), int(ql[3:])
        dq = f'{y_}-{q_ * 3:02d}-{_cal.monthrange(y_, q_ * 3)[1]:02d}'
        for s_ in BANKS:
            v = (banks[s_].get('pb') or [None] * len(QL))[qi]
            if v: pbh[s_][dq] = v
    for d in raw:
        if d['tool'] == 'wi_data_companies' and d['request'].get('endpoint_name') == 'ratio_daily':
            for x in rows(d['response']):
                if x.get('symbol') in pbh and x.get('pb'):
                    pbh[x['symbol']][x['trading_date'][:10]] = r(x['pb'])
    days = sorted({k for v in pbh.values() for k in v})
    medv = []
    for k in days:
        xs = [v[k] for v in pbh.values() if k in v]
        if len(xs) >= 10:
            medv.append([k, r(statistics.median(xs))])
    D['pbHist'] = {'banks': {s_: sorted([k, v] for k, v in pbh[s_].items()) for s_ in BANKS}, 'median': medv,
                   'note': 'cuối mỗi quý và các phiên gần đây'}
    # P/B theo phiên (data/backfill/pb_daily.json, Wi MCP ratio_daily): trục ngày chung + giá trị từng mã; null = không có phiên
    _pdf = ROOT / 'data/backfill/pb_daily.json'
    if _pdf.exists():
        _pd = json.loads(_pdf.read_text(encoding='utf-8'))
        _days = sorted(d_ for d_ in _pd.get('_median', {}) if d_ >= '2022-10-21')
        D['pbDailyS'] = {'d': _days, 'v': {k: [round(_pd[k][d_], 3) if d_ in _pd[k] else None for d_ in _days]
                                           for k in BANKS + ['_median'] if k in _pd and sum(1 for d_ in _days if d_ in _pd[k]) >= 200}}

    # tổng hợp ngành: trung vị theo nhóm + bình quân gia quyền theo dư nợ cho NPL, LDR, CASA (xấp xỉ)
    def wavg(key, qi, grp=None):
        num = den = 0
        for s in BANKS:
            if grp and GROUP[s] != grp:
                continue
            v, w = banks[s].get(key, [None] * len(QL))[qi], banks[s].get('credit', [None] * len(QL))[qi]
            if v is not None and w:
                num += v * w
                den += w
        return r(num / den) if den else None

    def med(key, qi, grp=None):
        vals = [banks[s].get(key, [None] * len(QL))[qi] for s in BANKS if (not grp or GROUP[s] == grp)]
        vals = [v for v in vals if v is not None]
        return r(statistics.median(vals)) if vals else None

    grp_names = ['Big 4', 'Tư nhân lớn', 'Tư nhân vừa', 'Tư nhân nhỏ']
    agg = {}
    for key in ['nim', 'cof', 'yea', 'casa', 'npl', 'g2', 'llr', 'ldr', 'creditYoY', 'roe', 'cir']:
        agg[key] = {'all': [wavg(key, i) for i in range(len(QL))],
                    **{gname: [wavg(key, i, gname) for i in range(len(QL))] for gname in grp_names}}
    D['agg'] = {'method': 'Bình quân gia quyền theo dư nợ tín dụng (credit_balance) của 26 ngân hàng niêm yết — xấp xỉ, không thay số toàn hệ thống của NHNN.',
                'series': agg}

    # định giá ngành theo ngày (sector_id 107) → cuối tháng + dải ±1σ
    secd = {}   # gộp mọi lần kéo (2021→nay), phiên trùng lấy file sau
    for d in raw:
        if d['tool'] == 'wi_data_sector' and d['request'].get('endpoint_name') == 'sector_ratio_daily':
            for x in rows(d['response']):
                secd[x['trading_date']] = x
    sec = [secd[k] for k in sorted(secd)]
    mon = {}
    for x in sec:
        mon[ym(x['trading_date'])] = x
    secm = [{'d': v['trading_date'], 'pb': r(v['pb']), 'pe': r(v['pe']), 'mcap': r(v['market_cap'] / 1e12, 0)} for _, v in sorted(mon.items())]
    if D.get('ppopSector'):   # P/PPOP ngành theo tháng: vốn hoá / PPOP 4 quý đã công bố (quý kết thúc + 30 ngày)
        import datetime as _dt
        PS = D['ppopSector']
        def _avail(e):
            y, m = int(e[:4]), int(e[5:]); n = _dt.date(y + (m == 12), m % 12 + 1, 1)
            return (n + _dt.timedelta(days=29)).isoformat()
        for x in secm:
            ks = [i for i, e in enumerate(PS['end']) if _avail(e) <= x['d']]
            x['pppop'] = r(x['mcap'] / PS['ppop'][ks[-1]]) if ks else None
    pbs = [x['pb'] for x in secm]
    pes = [x['pe'] for x in secm]
    D['secVal'] = {'monthly': secm, 'from': secm[0]['d'], 'now': secm[-1],
                   'pb': {'mean': r(statistics.mean(pbs)), 'sd': r(statistics.pstdev(pbs))},
                   'pe': {'mean': r(statistics.mean(pes)), 'sd': r(statistics.pstdev(pes))},
                   'pppop': ({'mean': r(statistics.mean(v)), 'sd': r(statistics.pstdev(v))} if (v := [x['pppop'] for x in secm if x.get('pppop')]) else None),
                   'profitTTM': r(sec[-1]['profit'] / 1e12, 1)}

    # ------------------------------------------------ consensus theo ngân hàng (báo cáo ≤ 92 ngày, mỗi CTCK lấy bản mới nhất)
    rep = None
    for d in raw:
        if d['tool'] == 'wi_data_companies' and d['request'].get('endpoint_name') == 'co_reports' and \
                flt(d['request']).get('symbol', '').count(',') >= 10:
            rep = rows(d['response'])
    cons = []
    for s in BANKS:
        rs = sorted([x for x in rep if x['symbol'] == s], key=lambda x: x['recommendation_date'], reverse=True)
        seen, use = set(), []
        for x in rs:
            if x['source'] in seen:
                continue
            seen.add(x['source'])
            use.append(x)
        tps = [x['target_price_adjusted'] for x in use if x['target_price_adjusted']]
        nps = [x['net_income_forecast'] for x in use if x['net_income_forecast']]
        L = next(x for x in latest if x['s'] == s)
        if not use:
            continue
        mtp = statistics.median(tps) if tps else None
        mnp = statistics.median(nps) if nps else None
        cons.append({'s': s, 'group': GROUP[s], 'n': len(use), 'nTP': len(tps),
                     'buy': sum(1 for x in use if x['recommendation'] == 'MUA'),
                     'hold': sum(1 for x in use if x['recommendation'] == 'TRUNG LẬP'),
                     'sell': sum(1 for x in use if x['recommendation'] == 'BÁN'),
                     'tpMed': r(mtp, 0), 'tpMin': r(min(tps), 0) if tps else None, 'tpMax': r(max(tps), 0) if tps else None,
                     'upside': r((mtp / L['price'] - 1) * 100, 1) if mtp and L['price'] else None,
                     'np26': r(mnp, 0), 'peFwd': r(L['mcap'] / mnp, 2) if mnp and L['mcap'] else None,
                     'pbTP': r(mtp / L['bvps'], 2) if mtp and L['bvps'] else None,
                     'latest': rs[0]['recommendation_date'],
                     'reports': [{'src': x['source'], 'd': x['recommendation_date'], 'rec': x['recommendation'],
                                  'tp': r(x['target_price_adjusted'], 0), 'np26': x['net_income_forecast'], 'np27': x['net_income_forecast_n1'],
                                  'title': x['report_title'].strip()} for x in use]})
    D['consensus'] = {'from': '2026-07-14', 'to': TODAY, 'rows': cons,
                      'note': 'Mỗi CTCK lấy báo cáo mới nhất trong 92 ngày. Upside tính trên giá đóng cửa ' + '/'.join(lastday.split('-')[::-1]) + '. P/E fwd = vốn hóa / LNST 2026F trung vị.'}

    # ------------------------------------------------ tin tức: tiêu đề news_feed ngân hàng (chỉ tiêu đề + nguồn + link)
    news = []
    for d in raw:
        if d['tool'] == 'wi_data_news' and d['request'].get('action') == 'news_feed':
            for x in rows(d['response']):
                news.append({'d': x['publish_time'][:10], 't': x['title'], 'src': x['source_name'], 'url': x['url'],
                             'sym': x.get('symbol') or []})
    D['news'] = news

    # ------------------------------------------------ giá vàng thế giới (Wi MCP 74407, CME, USD/ounce): tháng → tuần → ngày tuỳ độ dài mỗi lần kéo; dự phòng khi chưa có chuỗi ngày Stooq
    gold = {}
    for d in raw:
        if d['tool'] == 'wi_data_commodity':
            for x in (d['response'].get('data') or []):
                if isinstance(x, dict) and x.get('indicator_id') == 74407:
                    for v in x.get('values', []):
                        if v.get('value') is not None:
                            gold[v['date']] = v['value']
    D['goldWi'] = [{'d': k, 'v': gold[k]} for k in sorted(gold) if k >= '2021-01-01']

    # ------------------------------------------------ LDR: độ nhạy theo hệ số tiền gửi KBNN (Q2/2026)
    def latest_rows(endpoint, need):
        """Gộp mọi lần kéo nhiều mã của endpoint (khác năm/kỳ), lần kéo sau ghi đè cùng (mã, năm, quý)."""
        out = {}
        for d in raw:
            if d['tool'] == 'wi_data_companies' and d['request'].get('endpoint_name') == endpoint and \
                    flt(d['request']).get('symbol', '').count(',') >= 10 and need in d['request'].get('columns', ''):
                for r in rows(d['response']):
                    out[(r.get('symbol'), r.get('year'), r.get('quarter'))] = r
        return list(out.values())
    kb = {x['symbol']: x['fnx107'] for x in sorted(latest_rows('fs_bank_notes', 'fnx107'), key=lambda r: (r.get('year') or 0, r.get('quarter') or 0))}   # kỳ mới nhất
    fs = {x['symbol']: x for x in latest_rows('fs_bank', 'bs160_1') if x.get('year') == 2026 and x.get('quarter') == 2}
    sens = []
    for s, K in kb.items():
        L = fs.get(s, {}).get('bs160_1')
        ldr20 = banks[s]['ldr'][-1]
        if not L or not ldr20:
            continue
        D20 = L / (ldr20 / 100)
        row = {'s': s, 'group': GROUP[s], 'kbnn': r(K / 1e9, 0), 'kbnnPctDep': r(K / fs[s]['bs330'] * 100, 1), 'ldr20': ldr20}
        for c in (0, 0.5):
            row['ldr%d' % int(c * 100)] = r(L / (D20 + (c - 0.2) * K) * 100, 2)
        sens.append(row)
    sens.sort(key=lambda x: -x['kbnn'])
    # ------------------------------------------------ thu nhập dịch vụ theo mảng: cộng 26 ngân hàng = đại diện ngành
    import fee_lines as FL
    _A = FL.annual_rows(raw)
    keys = [k for k, *_ in FL.LINES] + ['_tot']
    def _sum(items):
        o = {k: {'inc': 0.0, 'exp': 0.0, 'net': 0.0} for k in keys}
        for L in items:
            for k in keys:
                for z in ('inc', 'exp', 'net'):
                    o[k][z] += L[k][z]
        return {k: {z: round(v, 1) for z, v in d.items()} for k, d in o.items()}
    yrs = sorted({y for (_, y) in _A})
    full = [y for y in yrs if sum(1 for (s_, y_) in _A if y_ == y) >= len(BANKS) - 2]
    sec = {y: _sum([FL.lines_of(r) for (s_, y_), r in _A.items() if y_ == y and s_ in BANKS]) for y in full}
    grp = {g: {y: _sum([FL.lines_of(r) for (s_, y_), r in _A.items() if y_ == y and GROUP.get(s_) == g]) for y in full} for g in sorted(set(GROUP.values()))}
    per = []
    for s_ in BANKS:
        ser = {y: FL.lines_of(_A[(s_, y)]) for y in full if (s_, y) in _A}
        if len(ser) < 2:
            continue
        t = FL.table(ser)
        lr = [r for r in t['rows'] if r['k'] != '_tot' and r['inc'] > 0]
        tot = next(r for r in t['rows'] if r['k'] == '_tot')
        big = max(lr, key=lambda r: r['share'] or -1e9) if lr else None
        fast = max((r for r in lr if r['incYoY'] is not None and r['inc'] >= 0.05 * tot['inc']), key=lambda r: r['incYoY'], default=None)
        per.append({'s': s_, 'group': GROUP[s_], 'inc': tot['inc'], 'net': tot['net'], 'margin': tot['margin'], 'incYoY': tot['incYoY'], 'netYoY': tot['netYoY'],
                    'big': big and big['name'], 'bigShare': big and big['share'], 'fast': fast and fast['name'], 'fastYoY': fast and fast['incYoY']})
    D['fee'] = {'lines': [{'k': k, 'name': n} for k, n, *_ in FL.LINES], 'years': full, 'sector': {str(y): v for y, v in sec.items()},
                'group': {g: {str(y): v for y, v in d.items()} for g, d in grp.items()}, 'table': FL.table(sec), 'banks': per,
                'n': len(BANKS)}

    D['ldrSens'] = {'quarter': QL[-1], 'rows': sens,
                    'formula': 'LDR(c) = Cho vay KH / (Mẫu số LDR Wi ở hệ số 20% + (c − 20%) × Tiền gửi KBNN). Wi tính Q2/2026 với hệ số 20%; tiền gửi KBNN lấy tổng (fnx107) chứ không riêng có kỳ hạn → mức nhạy là cận trên.'}

    # ------------------------------------------------ mô phỏng xếp hạng TT21 + room ngụ ý (26 NH)
    from camel_tt21 import build as camel_build
    D['camel'] = camel_build(latest_rows('fs_bank', 'bs210_2'), latest_rows('fs_bank_notes', 'fnx79'),
                             latest_rows('ratio_bank', 'interest_rate_gap'), latest_rows('bank_car_tt41', 'tt41_10'),
                             banks, QL, BANKS, GROUP)

    # ------------------------------------------------ REG (dùng chung bảng của dashboard CTG)
    R = json.loads((ROOT / 'data/regs.json').read_text(encoding='utf-8'))   # danh mục quy định biên tập tay (văn bản mới nhất lên trước)
    D['reg'] = R['items']
    D['regRef'] = R.get('analysis')

    # ------------------------------------------------ nhật ký điều hành NHNN (biên tập tay, nguồn gốc public: data/sbv-log.json)
    sbv = json.loads((ROOT / 'data/sbv-log.json').read_text(encoding='utf-8'))
    sbv['events'].sort(key=lambda e: e['d'], reverse=True)
    D['sbv'] = sbv

    # ------------------------------------------------ cập nhật nhanh (chuyên viên / AI): data/quick-updates.json, mới nhất trước
    qu = json.loads((ROOT / 'data/quick-updates.json').read_text(encoding='utf-8'))
    qu['updates'].sort(key=lambda u: (u['date'], u['id']), reverse=True)
    D['quick'] = qu

    # ------------------------------------------------ tín hiệu R-01…R-16 (ngưỡng = giả định theo deck slide 50–51)
    def vn(x, nd=1, sign=False):
        s = f'{x:+,.{nd}f}' if sign else f'{x:,.{nd}f}'
        return s.replace(',', '§').replace('.', ',').replace('§', '.')

    def lv(dct):
        k = max(dct)
        return k, dct[k]
    km = max(k for k in dxy)
    dxy1 = pchg(dxy, km, 1)
    dxy1z = zser({k: pchg(dxy, k, 1) for k in M if pchg(dxy, k, 1) is not None}).get(km)
    cny3 = pchg(S(235032), km, 3)
    brent = S(203084)
    br_yoy = (brent[km] / brent[M[M.index(km) - 12]] - 1) * 100
    kc, cr = lv(cry)
    kd, dp = lv(depy)
    gap = cr - depy[kd]
    on_now, omo_now = last(82237)['v'], last(81522)['v']
    fq_last = fq[-1]
    fis_q = exp[fq_last] - rev[fq_last]
    fis_q_ly = exp[M[M.index(fq_last) - 12]] - rev[M[M.index(fq_last) - 12]]
    dep_now, dep_3m = dep12[max(dep12)], dep12[M[M.index(max(dep12)) - 3]]
    dep_ytd = dep12[max(dep12)] - dep12['2025-12']
    _dd = {x['d']: x['v'] for x in daily_merged(raw, 202886)}
    _dl = max(_dd)
    _d30 = (dt.date.fromisoformat(_dl) - dt.timedelta(days=30)).isoformat()
    _base = [k for k in sorted(_dd) if k <= _d30] or sorted(_dd)[:1]
    _b = _base[-1]
    dep_1m = _dd[_dl] - _dd[_b]
    dep_cut = dep_1m <= -0.3
    dep_txt = f'{vn(dep_1m, 2, True)} điểm % từ {_b[8:]}/{_b[5:7]} đến {_dl[8:]}/{_dl[5:7]}'
    vn10 = S(234526)
    vn10_chg = (vn10[km] - vn10[M[M.index(km) - 12]]) * 100
    npl_now, npl_ly = agg['npl']['all'][-1], agg['npl']['all'][-5]
    cof_now, cof_ly = agg['cof']['all'][-1], agg['cof']['all'][-5]
    sv = D['secVal']
    # kỳ vọng Fed theo phiên FOMC (scripts/fetch_fedwatch.py: phương pháp CME FedWatch từ giá ZQ)
    fw_txt, fw_state = '', 'risk'
    _fwp = ROOT / 'data/global/fedwatch.json'
    if _fwp.exists():
        _F = json.loads(_fwp.read_text(encoding='utf-8')); _lo = _F['target'][0]; _M = _F['meetings']
        if _M:
            _ab = lambda m: sum(p for k, p in m['probs'].items() if float(k.split('-')[0]) > _lo)
            _be = lambda m: sum(p for k, p in m['probs'].items() if float(k.split('-')[0]) < _lo)
            _n, _y = _M[0], [m for m in _M if m['date'][:4] == _M[0]['date'][:4]][-1]
            fw_txt = (f"; kỳ vọng (phương pháp FedWatch, giá ZQ {_F['asOf'][:10]}): phiên {_n['date'][8:]}/{_n['date'][5:7]} tăng {vn(_ab(_n), 0)}%, giảm {vn(_be(_n), 0)}%; "
                      f"đến {_y['date'][8:]}/{_y['date'][5:7]} xác suất cao hơn hiện hành {vn(_ab(_y), 0)}%")
            fw_state = 'risk' if _ab(_y) > 50 else ('ok' if _be(_y) > 50 else 'watch')
    SIG = [
        ('R-01', 'Quốc tế', 'DXY tăng > 1σ trong tháng', f'DXY {vn(dxy[km], 1)} · {vn(dxy1, 1, True)}% 1 tháng (z {vn(dxy1z or 0, 1, True)})', 'risk' if (dxy1z or 0) > 1 else ('watch' if dxy1 > 0 else 'ok'), 'Áp lực USD/VND, NHNN ưu tiên ổn định tỷ giá'),
        ('R-02', 'Quốc tế', 'Fed hạ lãi suất / kỳ vọng cắt tăng', 'Fed TĂNG 25 bps ngày 16/09/2026 lên 3,75–4,00%; EFFR ' + vn(effr[max(effr)], 2) + '%' + fw_txt, fw_state, 'Chênh lệch VND–USD hẹp lại, dư địa nới của NHNN giảm'),
        ('R-03', 'Quốc tế', 'Thanh khoản ròng Fed giảm / SOFR > IORB', 'Chưa có chuỗi trong Wi MCP (FRED WALCL, WTREGEN, RRP)', 'na', '—'),
        ('R-06', 'Quốc tế', 'Brent tăng > 20% YoY', f'Brent {vn(brent[km], 1)} USD/thùng · {vn(br_yoy, 0, True)}% YoY', 'risk' if br_yoy > 20 else 'ok', 'Kỳ vọng lạm phát tăng, NHNN thận trọng hơn'),
        ('R-08', 'Quốc tế', 'USD/CNY tăng > 1σ', f'USD/CNY {vn(S(235032)[km], 3)} · {vn(cny3, 1, True)}% 3 tháng (CNY mạnh lên)', 'ok' if cny3 < 0 else 'watch', 'CNY mạnh lên giảm sức ép cạnh tranh lên VND'),
        ('R-09', 'Nội địa → NH', 'Tín dụng tăng nhanh hơn huy động', f'Tín dụng {vn(cr, 1)}% YoY ({kc[5:]}/{kc[:4]}) vs tiền gửi {vn(depy[kd], 1)}% ({kd[5:]}/{kd[:4]}) · chênh {vn(gap, 1)} điểm %', 'risk' if gap > 3 else ('watch' if gap > 0 else 'ok'), 'LDR căng, tranh giành tiền gửi → LS huy động TT1 tăng'),
        ('R-10', 'Nội địa → NH', 'OMO bơm ròng kéo dài mà LNH > OMO', f'LNH qua đêm {vn(on_now, 2)}% vs OMO {vn(omo_now, 1)}%; OMO lưu hành 110,9 nghìn tỷ (14/10), giảm từ đỉnh 255,2 nghìn tỷ giữa tháng 9', 'watch' if on_now > omo_now else 'ok', 'TT2 thiếu vốn nhưng OMO không giúp tuân thủ LDR'),
        ('R-11', 'Nội địa → NH', 'NHNN nới tỷ lệ an toàn / loại trừ room', 'Hệ số tiền gửi KBNN vào LDR lên 50% từ Q3/2026; CV 4551 loại trừ dự án trọng điểm khỏi room', 'ok', 'Áp lực huy động giảm, tín dụng tăng nhanh hơn'),
        ('R-12', 'Nội địa → NH', 'Chi NSNN vượt thu', f'Q{int(fq_last[5:])//3}/{fq_last[:4]}: chi − thu {vn(fis_q/1000, 1)} nghìn tỷ (cùng kỳ {vn(fis_q_ly/1000, 1)})', 'watch' if fis_q < 0 else 'ok', 'Thu > chi → Kho bạc hút tiền khỏi hệ thống, LNH khó giảm'),
        ('R-13', 'Ngân hàng', 'LS huy động 12T tăng', f'NHTM Nhà nước {vn(_dd[_dl], 2)}% · {dep_txt} · {vn(dep_ytd, 2, True)} điểm % từ đầu năm; COF ngành {vn(cof_now, 2)}% (cùng kỳ {vn(cof_ly, 2)}%)', 'ok' if dep_cut else ('risk' if dep_ytd > 0.3 else 'watch'), ('COF giảm dần theo kỳ đáo hạn tiền gửi; lợi ích bị bù trừ bởi yêu cầu giảm LS cho vay 1,5–2 điểm %' if dep_cut else 'COF tăng theo kỳ tái định giá, NIM co nếu YOEA không theo kịp')),
        ('R-14', 'Ngân hàng', 'LS cho vay cao kéo dài', f'NPL ngành {vn(npl_now, 2)}% (cùng kỳ {vn(npl_ly, 2)}%)', 'watch' if npl_now >= npl_ly else 'ok', 'Nợ nhóm 2, NPL, chi phí tín dụng tăng sau 2–4 quý'),
        ('R-15', 'Ngân hàng', 'Lợi suất TPCP tăng', f'TPCP 10Y {vn(vn10[km], 2)}% · {vn(vn10_chg, 0, True)} bps 12 tháng', 'risk' if vn10_chg > 50 else 'watch', 'Lỗ/giảm lãi chứng khoán đầu tư ở NH nắm nhiều TPCP'),
        ('R-16', 'Ngân hàng', 'Lãi suất thị trường giảm', f'P/B ngành {vn(sv["now"]["pb"], 2)}x vs TB {vn(sv["pb"]["mean"], 2)}x từ {sv["from"][5:7]}/{sv["from"][:4]}; ' + (f'LS huy động 12T NHTM Nhà nước {dep_txt}' if dep_cut else 'LS chưa giảm'), 'watch', 'Chiết khấu giảm khi LS hạ → P/B mở rộng' + ('; điều kiện bắt đầu xuất hiện, nhưng LS cho vay phải giảm nhiều hơn LS huy động nên NIM chịu sức ép' if dep_cut else '; hiện chưa có điều kiện')),
    ]
    D['signals'] = [{'id': a, 'layer': b, 'rule': c, 'now': d_, 'state': e, 'impact': f} for a, b, c, d_, e, f in SIG]

    # ------------------------------------------------ catalyst & sự kiện (có nguồn)
    _fm = ROOT / 'data/backfill/fund_mix.json'   # cơ cấu nguồn vốn nợ theo nhóm (fs_bank bs330/bs320/bs360/bs310 quý mới nhất)
    if _fm.exists():
        D['fundMix'] = json.loads(_fm.read_text(encoding='utf-8'))
    _bt = ROOT / 'data/backfill/idx_bank_bt.json'   # kiểm định khung kịch bản với giá, lợi nhuận ngân hàng (scripts/idx_bank_backtest.py)
    if _bt.exists():
        D['idxBankBt'] = json.loads(_bt.read_text(encoding='utf-8'))
    _rr = ROOT / 'data/backfill/reg_ratios.json'   # LDR, vốn ngắn hạn cho vay TDH theo TT 22 (scripts/reg_ratios.py) + số NH tự công bố
    if _rr.exists():
        D['regRatios'] = json.loads(_rr.read_text(encoding='utf-8'))
    D['events'] = sorted([
        {'d': '2026-10-20', 'type': 'Doanh nghiệp', 't': 'Mùa công bố KQKD Q3/2026 của các ngân hàng niêm yết', 'impact': '?', 'status': 'pending',
         'detail': 'Theo dõi NIM khi COF tăng (R-13), chi phí dự phòng và tín dụng 9 tháng so với room.', 'src': 'Quy định CBTT; tin báo chí 14/10/2026'},
        {'d': '2026-10-28', 'type': 'Quốc tế', 't': 'FOMC 27–28/10: Fed sau đợt tăng 25 bps tháng 9', 'impact': '?', 'status': 'pending',
         'detail': 'Tăng tiếp → chênh lệch VND–USD hẹp thêm, IDX-FX tăng; giữ nguyên → áp lực tỷ giá hạ nhiệt.', 'src': 'fedratecalc.com/fomc-meeting-schedule'},
        {'d': '2026-11-06', 'type': 'Vĩ mô VN', 't': 'CPI tháng 10 (NSO) — CPI bình quân 9T đã 4,52%, sát mục tiêu ~4,5%', 'impact': '−', 'status': 'pending',
         'detail': 'Vượt mục tiêu làm NHNN khó hạ lãi suất điều hành; Brent +60% YoY là nguồn đẩy giá.', 'src': 'Wi MCP 75804, 203084; ngày công bố dự kiến'},
        {'d': '2026-12-01', 'type': 'Quy định', 't': 'TT50/2026/TT-NHNN có hiệu lực: LDR mới, LCR, NSFR thay SMLR', 'impact': '?', 'status': 'pending',
         'detail': 'Liên ngân hàng tính vị thế ròng; tiền gửi KBNN mặc định 20% theo TT50 (Thống đốc có thể điều chỉnh) — xem bảng độ nhạy LDR tab Chính sách.', 'src': 'Deck slide 21, 53; báo cáo TT50 FinSuccess; NHNN tập huấn 12/10/2026'},
        {'d': '2026-12-09', 'type': 'Quốc tế', 't': 'FOMC 8–9/12 kèm dự phóng kinh tế (SEP)', 'impact': '?', 'status': 'pending', 'detail': '', 'src': 'fedratecalc.com/fomc-meeting-schedule'},
        {'d': '2026-12-31', 'type': 'Quy định', 't': 'Hết hạn loại trừ khỏi room theo CV 4551 (dự án trọng điểm, NOXH, KCN)', 'impact': '?', 'status': 'pending',
         'detail': 'Room 2027 và chỉ tiêu tín dụng năm mới là catalyst đầu năm.', 'src': 'CV 4551/NHNN-CSTT'},
        {'d': '2026-09-16', 'type': 'Quốc tế', 't': 'Fed tăng 25 bps lên 3,75–4,00% (12–0)', 'impact': '−', 'status': 'done',
         'detail': 'Đảo chiều sau chu kỳ hạ 2024–2025; UST 10Y lên 5,2%.', 'src': 'fedratecalc.com; Wi MCP 7079, 234521'},
        {'d': '2026-09-15', 'type': 'Thanh khoản', 't': 'OMO lưu hành đạt đỉnh 255,2 nghìn tỷ, sau đó NHNN rút dần về 110,9 nghìn tỷ (14/10)', 'impact': '0', 'status': 'done',
         'detail': 'LNH qua đêm dao động 0,5–7% quanh các kỳ cuối tháng.', 'src': 'Wi MCP ai_news 14/10/2026'},
        {'d': '2026-08-01', 'type': 'Quy định', 't': 'QĐ 1743: tiền gửi có kỳ hạn KBNN tính vào LDR lên 50% (1/8/2026 – 31/7/2028)', 'impact': '+', 'status': 'done',
         'detail': 'Big 4 hưởng lợi nhiều nhất (VCB, BID, CTG giữ ~185–195 nghìn tỷ tiền gửi KBNN mỗi bên).', 'src': 'QĐ 1743/QĐ-NHNN (VnEconomy 31/7/2026); tiền gửi KBNN theo thuyết minh BCTC Q2/2026'},
        {'d': '2026-03-31', 'type': 'Lãi suất', 't': 'LS huy động 12T NHTM Nhà nước tăng 5,2% → 5,9%; tỷ giá tự do vọt 28.080', 'impact': '−', 'status': 'done',
         'detail': 'Brent lên 118 USD/thùng cùng tháng; chênh tự do − NHTM +1.723đ.', 'src': 'Wi MCP 202886, 82226, 203084'},
        {'d': '2026-10-14', 'type': 'Doanh nghiệp', 't': 'Eximbank bỏ trần sở hữu nước ngoài 6%; MSB dự kiến chào bán 936 triệu CP; SHB vay 340 triệu USD từ SMBC', 'impact': '+', 'status': 'done',
         'detail': 'Dòng vốn ngoại và tăng vốn — hỗ trợ CAR nhóm tư nhân.', 'src': 'Wi MCP news_feed 13–14/10/2026'},
        {'d': '2026-10-14', 'type': 'Tín dụng', 't': 'Phó Thống đốc: cho vay kinh doanh BĐS tăng 19,6% đến cuối tháng 8; VIS Rating điểm tên NH có dư nợ BĐS lớn', 'impact': '−', 'status': 'done',
         'detail': 'Rủi ro tập trung BĐS khi LS tăng (R-14).', 'src': 'vietnambiz, kinhtechungkhoan 14/10/2026'},
    ], key=lambda e: e['d'], reverse=True)

    D['sources'] = [
        ['Quốc tế', 'DXY 235028 · EFFR 7079 · UST10Y 234521 (bonds_gov_yield_curve) · USD/CNY 235032 · Brent 203084'],
        ['Tỷ giá', 'NHTM bán 82223 · mua 82224 · tự do 82226 · trung tâm 82227 · trần 82228 · NHNN bán 82231'],
        ['Thanh khoản', 'LNH qua đêm 82237 · OMO 81522 · bơm/hút ròng 82268'],
        ['Lãi suất huy động', '12T NHTM Nhà nước 202886 · NHTM lớn 202874 · NHTM khác 202880'],
        ['Tiền tệ, tín dụng', 'M2 YoY 265954 · tổng tiền gửi YoY 265963 · dân cư 265981 · TCKT 265972 · tín dụng YoY 75847 · YTD 241732'],
        ['Giá cả, tài khóa', 'CPI 75701 · lạm phát cơ bản 202889 · CPI bình quân 75804 · thu NSNN 82420 · chi NSNN 75598 · TPCP 10Y 234526'],
        ['Đối ngoại', 'Dự trữ ngoại hối 76885 · cán cân XNK 255693 · FDI giải ngân 76951'],
        ['Ngân hàng', 'ratio_bank, ratio_bank_ttm, ratio_common_ttm (26 NH, Q1/2021–Q2/2026) · ratio_daily · sector_ratio_daily (ngành 107) · co_reports'],
        ['Tin tức', 'wi_data_news news_feed (Ngân hàng) · ai_news (Vĩ mô VN, Mỹ)'],
        ['Lịch Fed', 'fedratecalc.com/fomc-meeting-schedule (FOMC 27–28/10, 8–9/12/2026; tăng 25 bps ngày 16/09/2026)'],
    ]

    js = 'window.SECTOR_DATA = ' + json.dumps(D, ensure_ascii=False, separators=(',', ':')) + ';\n'
    (ROOT / 'data/sector-data.js').write_text(js, encoding='utf-8')
    (ROOT / 'data/sector-data.json').write_text(json.dumps(D, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'wrote data/sector-data.js ({len(js) // 1024} KB)')
    try:   # nối lại phần số mới từ nguồn tự động (giá, định giá, vàng, tin, vĩ mô VN)
        import importlib.util
        sp = importlib.util.spec_from_file_location('build_auto', ROOT / 'scripts/build_auto.py'); m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m); m.main()
    except Exception as e:  # noqa: BLE001
        print('build_auto lỗi:', e)


if __name__ == '__main__':
    main()
