#!/usr/bin/env python3
"""Thị trường trái phiếu cho tab "Trái phiếu: FI · G-bond" ở nganh.html.

Đọc data/raw/wi/*.json (WiData: wi_data_cbond, wi_data_gbond, wi_data_macro) → data/bond-data.js (window.BOND_DATA).
Khung theo báo cáo thị trường tiền tệ: Thị trường 1 (lãi suất huy động 12T theo nhóm ngân hàng) & FI bond
(trái phiếu ngân hàng phát hành: lãi suất coupon theo kỳ hạn so với huy động), TPDN toàn thị trường (phát hành,
chậm trả, đáo hạn), G-bond (đường cong, đấu thầu, khối ngoại).
"""
import json, pathlib, sys, datetime as dt
from collections import defaultdict

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
from build_ctg_data import load_raw, rows, flt  # noqa: E402

TY = 1e9  # đồng → tỷ đồng

# Lãi suất huy động 12 tháng (bảng 46) — nhóm theo quy mô
TIERS = {
    'Big 4': [(202856, 'Vietcombank'), (202862, 'VietinBank'), (202700, 'BIDV'), (202682, 'Agribank')],
    'Tư nhân lớn': [(202820, 'Techcombank'), (202742, 'MB'), (202676, 'ACB'), (202868, 'VPBank')],
    'Tư nhân vừa': [(202814, 'SHB'), (202790, 'Sacombank'), (264805, 'LPBank'), (202730, 'HDBank'), (202832, 'VIB'), (202826, 'TPBank')],
    'Tư nhân nhỏ': [(202748, 'MSB'), (202808, 'SeABank'), (202766, 'OCB'), (202718, 'Eximbank'), (202754, 'Nam A Bank'), (202670, 'ABBank'),
                    (202688, 'Bac A Bank'), (202736, 'Kienlongbank'), (202838, 'VietABank'), (202850, 'BVBank'), (202778, 'PGBank'),
                    (202760, 'NCB'), (202844, 'Vietbank'), (202796, 'Saigonbank')],
}
CURVE = {'1Y': 234528, '3Y': 234530, '5Y': 234531, '10Y': 234526, '20Y': 234529}
BUCKETS = ['≤1 năm', '1-3 năm', '3-5 năm', '>5 năm']


def r(v, n=2):
    return None if v is None else round(v, n)


def ym(y, m):
    return f'{int(y)}-{int(m):02d}'


def mrange(a, b):
    y, m = map(int, a.split('-')); out = []
    while f'{y}-{m:02d}' <= b:
        out.append(f'{y}-{m:02d}'); m += 1
        if m > 12: y, m = y + 1, 1
    return out


def sel(raw, tool, ep, action=None, pred=lambda req, f: True):
    for d in raw:
        q = d['request']
        if d['tool'] == tool and q.get('endpoint_name') == ep and (action is None or q.get('action') == action) and pred(q, flt(q)):
            yield d


def agg(raw, tool, ep, group_by, metric, pred=lambda f: True):
    """Gộp các lần aggregate cùng group_by/metric; khoá = tuple các phần trong gia_tri."""
    out = {}
    for d in sel(raw, tool, ep, 'aggregate', lambda q, f: q.get('group_by') == group_by and q.get('metric') == metric and pred(f)):
        for g in d['response'].get('nhom', []):
            out[tuple(s.strip() for s in str(g['gia_tri']).split('·'))] = g['gia_tri_do']
    return out


def macro_series(raw, iid):
    """Mọi lần kéo của một chỉ tiêu (dạng bảng cot/dong hoặc list) → {ngày: giá trị}."""
    out = {}
    for d in raw:
        if d['tool'] != 'wi_data_macro':
            continue
        for s in rows(d['response']):
            if isinstance(s, dict) and s.get('indicator_id') == iid:
                for v in s.get('values', []):
                    if v.get('value') is not None:
                        out[v['date']] = v['value']
    return out


def main():
    raw = load_raw(ROOT / 'data/raw/wi')
    today = dt.date.today().isoformat()

    # ---------- 1. Lãi suất huy động 12T theo nhóm ----------
    months = mrange('2024-01', today[:7])
    banks, tiers = [], {}
    asof = None
    for tier, lst in TIERS.items():
        tv = []
        for iid, name in lst:
            s = macro_series(raw, iid)
            if not s:
                continue
            bym = {}
            for d in sorted(s):
                bym[d[:7]] = s[d]           # giá trị cuối cùng trong tháng
            last = max(s); asof = max(asof or last, last)
            d30 = (dt.date.fromisoformat(last) - dt.timedelta(days=30)).isoformat()
            prev = s[max(k for k in s if k <= d30)] if any(k <= d30 for k in s) else None
            ys = s[max(k for k in s if k < today[:4] + '-01-01')] if any(k < today[:4] + '-01-01' for k in s) else None
            ser = [bym.get(m) for m in months]
            for i in range(1, len(ser)):     # đi ngang khi tháng thiếu số
                if ser[i] is None: ser[i] = ser[i - 1]
            banks.append({'n': name, 'id': iid, 'g': tier, 'v': s[last], 'd': last, 'm1': prev, 'ytd': ys})
            tv.append(ser)
        tiers[tier] = [r(sum(x[i] for x in tv if x[i] is not None) / max(1, sum(1 for x in tv if x[i] is not None)), 3) for i in range(len(months))]
    dep = {'months': months, 'tiers': tiers, 'banks': banks, 'asof': asof}

    # ---------- 2. FI bond: trái phiếu ngân hàng phát hành ----------
    iss = {}
    for d in sel(raw, 'wi_data_cbond', 'bonds_corp_issuance_monthly', 'get_data', lambda q, f: f.get('sector_l1') == 'Tài chính' and 'maturity_bucket' in (q.get('columns') or '')):
        for x in rows(d['response']):
            iss[(x['year'], x['month'], x['issuance_method'], x['sector_l2'], x['maturity_bucket'])] = x
    fm = mrange('2021-01', today[:7])
    fi = {'months': fm, 'val': {b: [0.0] * len(fm) for b in BUCKETS}, 'cpn': {b: [None] * len(fm) for b in BUCKETS},
          'pub': [0.0] * len(fm), 'priv': [0.0] * len(fm), 'cpnAll': [None] * len(fm), 'cpnPriv13': [None] * len(fm), 'n': [0] * len(fm)}
    acc = defaultdict(lambda: [0.0, 0.0])
    for (y, m, meth, l2, b), x in iss.items():
        if l2 != 'Ngân hàng' or ym(y, m) not in fm:
            continue
        i = fm.index(ym(y, m)); v = x['actual_issuance_value'] or 0
        fi['val'][b][i] += v / TY
        fi['pub' if meth == 'Công chúng' else 'priv'][i] += v / TY
        fi['n'][i] += x['issue_count'] or 0
        if x.get('wavg_coupon') is not None and v:
            for k in [(b, i), ('all', i)] + ([('p13', i)] if meth == 'Riêng lẻ' and b == '1-3 năm' else []):
                acc[k][0] += v * x['wavg_coupon']; acc[k][1] += v
    for (b, i), (s, w) in acc.items():
        val = r(s / w, 3) if w else None
        if b == 'all': fi['cpnAll'][i] = val
        elif b == 'p13': fi['cpnPriv13'][i] = val
        else: fi['cpn'][b][i] = val
    for k in ['pub', 'priv']:
        fi[k] = [r(v, 0) for v in fi[k]]
    for b in BUCKETS:
        fi['val'][b] = [r(v, 0) for v in fi['val'][b]]
    # dư nợ, gốc đến hạn/đã trả, mua lại của nhóm Ngân hàng
    cf = {}
    for d in sel(raw, 'wi_data_cbond', 'bonds_corp_cashflow_monthly', 'get_data', lambda q, f: f.get('sector_l1') == 'Tài chính'):
        for x in rows(d['response']):
            if x.get('sector_l2') == 'Ngân hàng' and x.get('currency', 'VND') == 'VND':
                cf[ym(x['year'], x['month'])] = x
    cm = sorted(cf)
    fi['cf'] = {'months': cm, 'out': [r(cf[m]['outstanding_value'] / TY, 0) for m in cm], 'due': [r((cf[m]['principal_due'] or 0) / TY, 0) for m in cm],
                'paid': [r((cf[m]['principal_paid'] or 0) / TY, 0) for m in cm], 'buyback': [r((cf[m]['principal_buyback'] or 0) / TY, 0) for m in cm],
                'late': [r((cf[m]['late_payment_debt'] or 0) / TY, 0) for m in cm], 'asof': cf[cm[-1]].get('as_of_date') if cm else None}
    mat2 = agg(raw, 'wi_data_cbond', 'bonds_corp_maturity_schedule_monthly', 'year,month,sector_l2', 'sum:due_at_outstanding', lambda f: 'year__gte' in f)
    nxt = [m for m in mrange(today[:7], '2027-12')]
    fi['mat'] = {'months': nxt, 'bank': [r(mat2.get((m[:4], str(int(m[5:])), 'Ngân hàng'), 0) / TY, 0) for m in nxt],
                 'fin': [r(mat2.get((m[:4], str(int(m[5:])), 'Dịch vụ tài chính'), 0) / TY, 0) for m in nxt]}

    # ---------- 3. TPDN toàn thị trường ----------
    cm2 = mrange('2023-01', today[:7])
    is1 = agg(raw, 'wi_data_cbond', 'bonds_corp_issuance_monthly', 'year,month,sector_l1', 'sum:actual_issuance_value', lambda f: 'year' in f or 'year__gte' in f)
    def pick(dct, m, sec=None):
        k = (m[:4], str(int(m[5:]))) + ((sec,) if sec else ())
        return dct.get(k)
    secs = ['Tài chính', 'Bất động sản']
    cb = {'months': cm2, 'iss': {s: [r((pick(is1, m, s) or 0) / TY, 0) for m in cm2] for s in secs}}
    cb['iss']['Khác'] = [r(sum(v for k, v in is1.items() if (k[0], k[1]) == (m[:4], str(int(m[5:]))) and k[2] not in secs) / TY, 0) for m in cm2]
    for key, met in [('out', 'outstanding_value'), ('late', 'late_payment_debt'), ('paid', 'principal_paid'), ('newLate', 'new_late_bond_count')]:
        a = agg(raw, 'wi_data_cbond', 'bonds_corp_cashflow_monthly', 'year,month', 'sum:' + met, lambda f: 'year__gte' in f)
        cb[key] = [None if pick(a, m) is None else (pick(a, m) if key == 'newLate' else r(pick(a, m) / TY, 0)) for m in cm2]
    ls = agg(raw, 'wi_data_cbond', 'bonds_corp_cashflow_monthly', 'sector_l1', 'sum:late_payment_debt', lambda f: 'month' in f)
    lsf = [d for d in sel(raw, 'wi_data_cbond', 'bonds_corp_cashflow_monthly', 'aggregate', lambda q, f: q.get('group_by') == 'sector_l1' and 'month' in f)]
    cb['lateBySec'] = sorted([{'s': k[0], 'v': r(v / TY, 0)} for k, v in ls.items() if v], key=lambda z: -z['v'])
    cb['lateBySecM'] = ym(flt(lsf[-1]['request'])['year'], flt(lsf[-1]['request'])['month']) if lsf else None
    mat1 = agg(raw, 'wi_data_cbond', 'bonds_corp_maturity_schedule_monthly', 'year,month,sector_l1', 'sum:due_at_outstanding', lambda f: 'year__gte' in f)
    cb['mat'] = {'months': nxt, 'sec': {s: [r((pick(mat1, m, s) or 0) / TY, 0) for m in nxt] for s in secs}}
    cb['mat']['sec']['Khác'] = [r(sum(v for k, v in mat1.items() if (k[0], k[1]) == (m[:4], str(int(m[5:]))) and k[2] not in secs) / TY, 0) for m in nxt]

    # ---------- 4. G-bond ----------
    curve = {}
    for t, iid in CURVE.items():
        s = {}
        for d in sel(raw, 'wi_data_gbond', 'bonds_gov_yield_curve', 'get_data', lambda q, f: str(f.get('indicator_id')) == str(iid)):
            for x in rows(d['response']):
                if x.get('value') is not None and x['date'] >= '2023-01-01':
                    s[x['date']] = x['value']
        curve[t] = s
    ds = sorted(set().union(*[set(v) for v in curve.values()]))
    last = {t: None for t in CURVE}
    cv = {'d': ds, **{t: [] for t in CURVE}}
    for d in ds:
        for t in CURVE:
            if d in curve[t]: last[t] = curve[t][d]
            cv[t].append(last[t])
    au = defaultdict(lambda: defaultdict(float)); auy = defaultdict(lambda: [0.0, 0.0])
    for d in sel(raw, 'wi_data_gbond', 'bonds_gov_auction_monthly', 'get_data'):
        for x in rows(d['response']):
            if x.get('bond_type') != 'Trái phiếu chính phủ':
                continue
            m = ym(x['year'], x['month'])
            au[m][('inv', x['maturity'])] = (x['bid_invitation_value'] or 0) / TY
            au[m][('bid', x['maturity'])] = (x['total_bid_value'] or 0) / TY
            au[m][('win', x['maturity'])] = (x['winning_bid_value'] or 0) / TY
            au[m][('y', x['maturity'])] = x.get('wavg_winning_yield')
    am = sorted(au)
    TEN = ['5 năm', '7 năm', '10 năm', '15 năm', '20 năm', '30 năm', '3 năm']
    def tot(m, k):
        return r(sum(v for (kk, t), v in au[m].items() if kk == k and v), 0)
    gb_auc = {'months': am, 'inv': [tot(m, 'inv') for m in am], 'bid': [tot(m, 'bid') for m in am], 'win': [tot(m, 'win') for m in am],
              'win10': [r(au[m].get(('win', '10 năm')), 0) for m in am], 'y': {t: [r(au[m].get(('y', t)), 3) for m in am] for t in ['5 năm', '10 năm', '15 năm']},
              'byTen': {t: [r(au[m].get(('win', t)), 0) for m in am] for t in TEN}}
    sy = defaultdict(dict)
    for d in sel(raw, 'wi_data_gbond', 'bonds_gov_secondary_yield_monthly', 'get_data'):
        for x in rows(d['response']):
            sy[ym(x['year'], x['month'])][x['remaining_term_bucket']] = x
    sm = sorted(sy)
    fnet = [r(sum((x.get('foreign_net_value') or 0) for x in sy[m].values()) / TY, 0) for m in sm]
    gb = {'curve': cv, 'auc': gb_auc, 'fx': {'months': sm, 'net': fnet}}

    # ---------- 5. tín hiệu tổng hợp ----------
    i_now = len(months) - 1
    big4 = tiers['Big 4'][i_now]
    p = [i for i, v in enumerate(fi['cpnPriv13']) if v is not None]
    li = p[-1] if p else None
    out = {
        'meta': {'updated': today, 'depAsof': asof, 'curveAsof': ds[-1] if ds else None, 'aucAsof': am[-1] if am else None,
                 'fiLast': fm[li] if li is not None else None, 'bigNow': big4},
        'dep': dep, 'fi': fi, 'cb': cb, 'gb': gb,
        'src': {
            'dep': 'WiData bảng 46 (lãi suất huy động 12 tháng, cá nhân, tại quầy) — các mã ' + ', '.join(str(i) for l in TIERS.values() for i, _ in l),
            'fi': 'WiData bonds_corp_issuance_monthly, bonds_corp_cashflow_monthly, bonds_corp_maturity_schedule_monthly (HNX), nhóm Ngân hàng',
            'cb': 'WiData bonds_corp_issuance_monthly, bonds_corp_cashflow_monthly, bonds_corp_maturity_schedule_monthly (HNX), VND',
            'curve': 'WiData bonds_gov_yield_curve 234528/234530/234531/234526/234529',
            'auc': 'WiData bonds_gov_auction_monthly (HNX, Kho bạc Nhà nước)', 'fx': 'WiData bonds_gov_secondary_yield_monthly (HNX)'},
    }
    js = '// Sinh tự động bởi scripts/build_bond_data.py — KHÔNG sửa tay.\nwindow.BOND_DATA = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
    (ROOT / 'data/bond-data.js').write_text(js, encoding='utf-8')
    print('bond-data.js', len(js) // 1024, 'KB · dep', asof, '· curve', ds[-1] if ds else None, '· auc', am[-1] if am else None, '· FI', fm[li] if li is not None else None)


if __name__ == '__main__':
    main()
