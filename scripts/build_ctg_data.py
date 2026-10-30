#!/usr/bin/env python3
"""Dựng data/ctg-data.js (window.PVS_DATA) từ các response Wi MCP gốc trong data/raw/wi/.

- Không chép tay số: mọi số lấy từ file raw (lưu bởi scripts/wi_capture_transcript.py).
- Số tự tính được gắn `derived: true` kèm công thức trong `formula`.
- Đơn vị tiền: tỷ VND (BCTC Wi tính bằng VND → chia 1e9). Tỷ lệ: % (đã nhân 100).
- Ngưỡng tín hiệu là GIẢ ĐỊNH THEO DÕI theo deck "Hướng dẫn xây dựng dashboard ngân hàng"
  (quy tắc R-xx), không phải ngưỡng thống kê đã kiểm định.

Dùng: python3 scripts/build_ctg_data.py [--ticker CTG|VCB|BID] [--raw data/raw/wi] [--out data/<mã>-data.js]
Hồ sơ, mã chỉ tiêu lãi suất niêm yết và phần lời bình theo ngân hàng: data/banks.json.
"""
import argparse, glob, json, math, re, statistics, sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
from datetime import date, datetime, timedelta

TICKER = 'CTG'   # đổi bằng --ticker
BANK = {}
GRP = 'Big 4'
BIG4 = ['VCB', 'BID', 'CTG']
PEER_GROUPS = {   # cùng cách nhóm với dashboard ngành (build_sector_data.py)
    'VCB': 'Big 4', 'BID': 'Big 4', 'CTG': 'Big 4',
    'MBB': 'Tư nhân lớn', 'TCB': 'Tư nhân lớn', 'ACB': 'Tư nhân lớn', 'VPB': 'Tư nhân lớn',
    'HDB': 'Tư nhân vừa', 'LPB': 'Tư nhân vừa', 'SHB': 'Tư nhân vừa', 'STB': 'Tư nhân vừa', 'VIB': 'Tư nhân vừa', 'TPB': 'Tư nhân vừa', 'MSB': 'Tư nhân vừa', 'SSB': 'Tư nhân vừa', 'OCB': 'Tư nhân vừa', 'EIB': 'Tư nhân vừa',
    'NAB': 'Tư nhân nhỏ', 'ABB': 'Tư nhân nhỏ', 'KLB': 'Tư nhân nhỏ', 'VAB': 'Tư nhân nhỏ', 'BVB': 'Tư nhân nhỏ', 'BAB': 'Tư nhân nhỏ', 'PGB': 'Tư nhân nhỏ', 'SGB': 'Tư nhân nhỏ', 'NVB': 'Tư nhân nhỏ'}


# ---------------------------------------------------------------- raw helpers
def load_raw(folder):
    out = []
    for p in sorted(glob.glob(f'{folder}/*.json')):
        d = json.load(open(p, encoding='utf-8'))
        d['_file'] = p.split('/')[-1]
        r = d.get('response')
        if d.get('tool') in ('wi_data_macro', 'wi_data_commodity') and isinstance(r, dict) and isinstance(r.get('data'), dict) and 'cot' in r['data']:
            # bản trả dạng bảng (cot/dong) → danh sách chuỗi như bản cũ; bảng danh mục (list_indicators) không phải chuỗi số → bỏ qua
            r['data'] = rows(r) if {'indicator_id', 'values'} <= set(r['data']['cot']) else []
        out.append(d)
    return out


def daily_fx(raw, iid):
    """Chuỗi ngày/tuần (Wi nén) của một chỉ tiêu vĩ mô từ mọi lần kéo, từ 2021."""
    out = {}
    for d in raw:
        if d.get('tool') != 'wi_data_macro':
            continue
        for s in (d['response'].get('data') or []):
            if isinstance(s, dict) and s.get('indicator_id') == iid and s.get('time_type') in ('daily', 'weekly'):
                for v in s.get('values', []):
                    if v.get('value') is not None and v['date'] >= '2021-01-01':
                        out[v['date']] = v['value']
    return [{'d': k, 'v': out[k]} for k in sorted(out)]


def rows(resp):
    if not isinstance(resp, (dict, list)):
        return []
    data = resp.get('data', resp) if isinstance(resp, dict) else resp
    if isinstance(data, dict) and 'cot' in data:
        return [dict(zip(data['cot'], r)) for r in data['dong']]
    if isinstance(data, list):
        return data
    return []


def merged(raw, tool, endpoint, pred, sym=None):
    """Gộp mọi lần kéo khớp điều kiện (vd 2010–17 + 2018–26) theo (mã, năm, quý); file sau ghi đè kỳ trùng."""
    out = {}
    for d in raw:
        req = d['request']
        if d['tool'] != tool or req.get('endpoint_name') != endpoint or not pred(req):
            continue
        for r in rows(d['response']):
            if sym and r.get('symbol') != sym:
                continue
            out.setdefault((r.get('symbol'), r['year'], r['quarter']), {}).update({k: v for k, v in r.items() if v is not None})
    if not out:
        raise SystemExit(f'thiếu raw: {tool} {endpoint}')
    return list(out.values())


def find(raw, tool, endpoint=None, pred=None):
    hits = []
    for d in raw:
        if d['tool'] != tool:
            continue
        req = d['request']
        if endpoint and req.get('endpoint_name', req.get('action')) != endpoint:
            continue
        if pred and not pred(req):
            continue
        hits.append(d)
    if not hits:
        raise SystemExit(f'thiếu raw: {tool} {endpoint}')
    return hits[-1]


def flt(req):
    try:
        return json.loads(req.get('filters') or '{}')
    except json.JSONDecodeError:
        return {}


def syms(req):
    f = flt(req)
    return [s.strip() for s in str(f.get('symbol') or req.get('symbol') or req.get('codetag') or '').split(',') if s.strip()]


def _next_deadline(Q):
    """Hạn công bố BCTC quý kế tiếp (≤ 20 ngày sau quý theo TT96/2020)."""
    y, q = Q[-1]['year'], Q[-1]['quarter'] + 1
    if q > 4:
        y, q = y + 1, 1
    m = q * 3 + 1
    d = f'{y + (m > 12)}-{(m - 1) % 12 + 1:02d}-20'
    return {'d': d, 'type': 'KQKD', 't': f'Hạn công bố BCTC hợp nhất Q{q}/{y} (≤ 20 ngày sau quý, TT96/2020)', 'impact': '?', 'status': 'pending',
            'src': 'Quy định công bố thông tin'}


def own(req):
    """Lần kéo riêng cho mã này (1–3 mã/lần), không phải bảng toàn ngành."""
    s = syms(req)
    return TICKER in s and len(s) <= 3


def mine(rs):
    def sym(r):
        s = r.get('symbol', TICKER)
        return s[0] if isinstance(s, list) and s else s
    return [r for r in rs if sym(r) == TICKER]


ROOT = __import__('pathlib').Path(__file__).resolve().parent.parent


def nf(v, d=0):
    return '—' if v is None else f'{v:,.{d}f}'.replace(',', 'X').replace('.', ',').replace('X', '.')


def ty(v):
    return None if v is None else round(v / 1e9, 1)


def pct(v, nd=2):
    return None if v is None else round(v * 100, nd)


def qlabel(y, q):
    return f'Q{q}/{y}'


def sort_q(rs):
    return sorted(rs, key=lambda r: (r['year'], r['quarter']))


# ---------------------------------------------------------------- build
def build(raw):
    D = {}
    asof = date.today().isoformat()

    q1234 = lambda q: flt(q).get('quarter') == '1,2,3,4'
    fsq = sort_q(merged(raw, 'wi_data_companies', 'fs_bank', lambda q: own(q) and q1234(q), TICKER))
    fsy = sorted(merged(raw, 'wi_data_companies', 'fs_bank', lambda q: own(q) and flt(q).get('quarter') == '0', TICKER), key=lambda r: r['year'])
    rbt = sort_q(merged(raw, 'wi_data_companies', 'ratio_bank_ttm', own, TICKER))
    rb = sort_q(merged(raw, 'wi_data_companies', 'ratio_bank', lambda q: own(q) and q1234(q), TICKER))
    rbmix = sort_q(mine(rows(find(raw, 'wi_data_companies', 'ratio_bank', lambda q: own(q) and flt(q).get('quarter') == '2,4' and 'pct_loans' in q.get('columns', ''))['response'])))
    rct = sort_q(merged(raw, 'wi_data_companies', 'ratio_common_ttm', own, TICKER))
    def peer_rows(ep):   # mọi lần kéo toàn ngành có Q2/2026 (bảng 26 NH theo quý + bảng 12 NH kỳ Q2/2026), gộp theo mã
        pq = lambda q: len(syms(q)) >= 10 and str(PEER_Y) in str(flt(q).get('year', '')) and str(PEER_Q) in str(flt(q).get('quarter', '')).split(',')
        return [r for r in merged(raw, 'wi_data_companies', ep, pq) if r['year'] == PEER_Y and r['quarter'] == PEER_Q]
    # kỳ so sánh nhóm = quý BCTC mới nhất của chính ngân hàng; NH chưa công bố quý đó để trống
    PEER_Y, PEER_Q = max((r['year'], r['quarter']) for r in fsq)
    peers_rbt, peers_rb, peers_rc = peer_rows('ratio_bank_ttm'), peer_rows('ratio_bank'), peer_rows('ratio_common_ttm')
    car = mine(rows(find(raw, 'wi_data_companies', 'bank_car_tt41', own)['response']))
    car_all = rows(find(raw, 'wi_data_companies', 'bank_car_tt41', lambda q: len(syms(q)) >= 10)['response'])
    plans = mine(rows(find(raw, 'wi_data_companies', 'co_plans', own)['response']))
    ryear = sorted(mine(rows(find(raw, 'wi_data_companies', 'ratio_common_year', own)['response'])), key=lambda r: r['year'])
    holders = mine(rows(find(raw, 'wi_data_companies', 'co_holders', own)['response']))
    leaders = mine(rows(find(raw, 'wi_data_companies', 'co_leaders', own)['response']))
    insider = list({r['id']: r for d in raw if d['tool'] == 'wi_data_companies' and d['request'].get('endpoint_name') == 'co_insider' and own(d['request'])
                    for r in mine(rows(d['response']))}.values())   # gộp mọi lần kéo theo id
    subs = [r for d in raw if d['tool'] == 'wi_data_companies' and d['request'].get('endpoint_name') == 'co_subsidiaries' and own(d['request'])
            for r in mine(rows(d['response']))]
    events = mine(rows(find(raw, 'wi_data_companies', 'co_events', own)['response']))
    # báo cáo CTCK: gộp mọi lần kéo có mã này (riêng mã hoặc cả nhóm ngân hàng), trùng CTCK + ngày thì lấy bản sau
    _rp = {}
    for d in raw:
        if d['tool'] == 'wi_data_companies' and d['request'].get('endpoint_name') == 'co_reports' and TICKER in syms(d['request']):
            for r in mine(rows(d['response'])):
                k = (r.get('source'), r.get('recommendation_date'), r.get('report_title'), r.get('year'))
                _rp[k] = {**_rp.get(k, {}), **{a: v for a, v in r.items() if v is not None}}   # giữ cột mà lần kéo sau không có
    reports = list(_rp.values())
    ainews = rows(find(raw, 'wi_data_news', 'ai_news', lambda q: q.get('codetag') == TICKER)['response'])
    exnews = mine(rows(find(raw, 'wi_data_news', 'exchange_news', lambda q: q.get('symbol') == TICKER)['response']))
    pxd = {}   # gộp mọi lần kéo giá điều chỉnh của mã này
    for d in raw:
        if d['tool'] == 'wi_data_stock' and d['request'].get('endpoint_name') == 'eod_adjust' and syms(d['request']) == [TICKER]:
            for r in rows(d['response']):
                pxd[r['trading_date']] = r
    for d in raw:   # phiên chưa có trong các lần kéo riêng: lấy từ lần kéo nhiều mã
        if d['tool'] == 'wi_data_stock' and d['request'].get('endpoint_name') == 'eod_adjust' and TICKER in syms(d['request']) and len(syms(d['request'])) > 1:
            for r in mine(rows(d['response'])):
                pxd.setdefault(r['trading_date'], r)
    prices = [pxd[k] for k in sorted(pxd)]
    rd = {}   # định giá theo phiên (ratio_daily) — lấy giá trị mới nhất có số cho từng trường
    for d in raw:
        if d['tool'] == 'wi_data_companies' and d['request'].get('endpoint_name') == 'ratio_daily':
            for r in mine(rows(d['response'])):
                for k, v in r.items():
                    if v is not None and (k not in rd or r['trading_date'] >= rd[k][0]):
                        rd[k] = (r['trading_date'], v)
    macro = {}
    for d in raw:
        if d['tool'] == 'wi_data_macro':
            for s in (d['response'].get('data') or []):
                if not isinstance(s, dict) or 'indicator_id' not in s or 'values' not in s:
                    continue
                key = (s['indicator_id'], s.get('time_type'))
                macro[key] = sorted(s['values'], key=lambda v: v['date'])

    # ------------------------------------------------ meta
    last_px = prices[-1]
    v_ = lambda k: rd.get(k, (None, None))[1]
    price = last_px['close']
    px_mc = next(p['close'] for p in reversed(prices) if p['trading_date'] <= rd['market_cap'][0])   # giá đóng cửa ngày của số vốn hóa
    shares_m = v_('market_cap') / px_mc / 1e6
    mcap_ty = round(price * shares_m / 1e3)   # vốn hóa theo giá đóng cửa mới nhất × CP lưu hành (tỷ đồng)
    last_q = fsq[-1]
    lq = qlabel(last_q['year'], last_q['quarter'])
    bvps, eps = v_('bvps'), v_('eps')
    D['meta'] = {
        'ticker': TICKER, 'name': BANK['name'], 'short': BANK.get('short'), 'exchange': BANK.get('exchange', 'HOSE'), 'sector': 'bank', 'peerGroup': GRP,
        'updated': asof, 'price': price, 'priceDate': last_px['trading_date'],
        'mcap': mcap_ty, 'pb': round(price / bvps, 2) if bvps else None, 'pe': round(price / eps, 2) if eps else None,
        'bvps': round(bvps) if bvps else None, 'eps': round(eps) if eps else None,
        'sharesOut': round(shares_m, 1), 'latestQuarter': lq,
        'view': None,  # analyst nhập ở tab FinSuccess; không tự gán
        'irUrl': BANK.get('irUrl'), 'strategic': BANK.get('strategic'),
        'src': f"Wi MCP eod_adjust {last_px['trading_date']} (giá), ratio_daily {rd['bvps'][0]} (BVPS, EPS TTM, vốn hóa); BCTC hợp nhất {lq}",
    }

    # ------------------------------------------------ quarterly financial block (tỷ VND)
    Q = []
    prev = None
    for r in fsq:
        row = {
            'q': qlabel(r['year'], r['quarter']), 'year': r['year'], 'quarter': r['quarter'], 'audit': r.get('audit_status_id'),
            # Tài sản
            'ta': ty(r['bs100']), 'cash': ty((r['bs110'] or 0) + (r['bsx01'] or 0)), 'interbankA': ty(r['bs130']),
            'secs': ty((r['bs140'] or 0) + (r['bs170'] or 0)), 'loansGross': ty(r['bs160_1']), 'llp': ty(r['bs160_2']),
            'loansNet': ty((r['bs160_1'] or 0) + (r['bs160_2'] or 0)), 'ltInv': ty(r['bs180']), 'fixed': ty(r['bs190']),
            'otherA': ty(r['bs210']), 'accrued': ty(r['bs210_2']),
            # Nguồn vốn
            'govSbv': ty(r['bs310']), 'interbankL': ty(r['bs320']), 'deposits': ty(r['bs330']), 'papers': ty(r['bs360']),
            'otherL': ty((r['bsx10'] or 0) - sum((r[k] or 0) for k in ['bs310', 'bs320', 'bs330', 'bs360'])),
            'equity': ty(r['bsx12']), 'charter': ty(r['bsx14']), 'writtenOff': ty(r.get('obs11')),
            # KQKD quý
            'nii': ty(r['is20']), 'intInc': ty(r['is220']), 'intExp': ty(r['is10']), 'nfi': ty(r['isx03']), 'fx': ty(r['is50']),
            'secInc': ty((r['isx04'] or 0) + (r['isx05'] or 0)), 'otherInc': ty(r['isx07']), 'equityInc': ty(r['is110']),
            'toi': ty(r['isx08']), 'opex': ty(r['isx09']), 'ppop': ty(r['is130']), 'prov': ty(r['is140']),
            'pbt': ty(r['is150']), 'npat': ty(r['is190']), 'npatParent': ty(r['isx02']), 'recoveries': ty(r.get('cfx04')),
        }
        Q.append(row)
        prev = row
    rbt_by = {qlabel(r['year'], r['quarter']): r for r in rbt}
    rb_by = {qlabel(r['year'], r['quarter']): r for r in rb}
    rct_by = {qlabel(r['year'], r['quarter']): r for r in rct}
    for i, row in enumerate(Q):
        t, b, c = rbt_by.get(row['q'], {}), rb_by.get(row['q'], {}), rct_by.get(row['q'], {})
        row.update({
            'nim': pct(t.get('nim')), 'yea': pct(t.get('yea')), 'cof': pct(t.get('cof')), 'spread': pct(t.get('earning_spread')),
            'cir': pct(t.get('cir')), 'nfiShare': pct(t.get('pct_net_service_income')), 'otherShare': pct(t.get('pct_other_income')),
            'toiYoY': pct(t.get('total_operating_income_growth_yoy'), 1),
            'casa': pct(b.get('casa_ratio')), 'npl': pct(b.get('npl_ratio')), 'g2': pct(b.get('group2_loan_ratio')),
            'llr': pct(b.get('npl_coverage_ratio'), 1), 'nplAmt': ty(b.get('npl')), 'ldr': pct(b.get('ldr'), 1),
            'creditYoY': pct(b.get('credit_growth_yoy'), 1), 'creditQoQ': pct(b.get('credit_growth_qoq'), 1),
            'fundingYoY': pct(b.get('customer_funding_growth_yoy'), 1), 'mltLoans': pct(b.get('mid_long_term_loan_ratio'), 1),
            'accruedToTA': pct(b.get('accrued_interest_to_total_assets')), 'irGap': ty(b.get('interest_rate_gap')),
            'roe': pct(c.get('roe'), 1), 'roa': pct(c.get('roa')), 'pb': c.get('pb'), 'pe': c.get('pe'), 'bvps': c.get('bvps'),
            'eps': c.get('eps'), 'npatYoY': pct(c.get('profit_parent_yoy'), 1),
        })
        # --- derived (công thức theo deck BNK-11, BNK-12, BNK-13, BNK-07)
        if i >= 1:
            p = Q[i - 1]
            avg_loans = (row['loansGross'] + p['loansGross']) / 2
            # nợ xử lý bằng dự phòng ≈ dự phòng đầu kỳ + chi phí dự phòng − dự phòng cuối kỳ (giá trị dương)
            wo = (-p['llp']) + (-row['prov']) - (-row['llp'])
            row['writeOffEst'] = round(wo, 1)
            if row['nplAmt'] is not None and p.get('nplAmt') is not None:
                form = row['nplAmt'] - p['nplAmt'] + wo
                row['nplFormation'] = round(form, 1)
                row['nplFormationRate'] = round(form / avg_loans * 400, 2)  # quy năm, %
        if i >= 4:
            last4 = Q[i - 3:i + 1]
            prov_ttm = -sum(x['prov'] for x in last4)
            avg_loans5 = sum(x['loansGross'] for x in Q[i - 4:i + 1]) / 5
            row['creditCost'] = round(prov_ttm / avg_loans5 * 100, 2)
            nii_ttm = sum(x['nii'] for x in last4)
            if row['nim']:
                row['nimAdj'] = round(row['nim'] * (1 - prov_ttm / nii_ttm), 2)
            row['recoveriesTTM'] = round(sum((x['recoveries'] or 0) for x in last4), 1)
            row['pbtTTM'] = round(sum(x['pbt'] for x in last4), 1)
            row['ppopTTM'] = round(sum(x['ppop'] for x in last4), 1)
        if row['nplAmt']:
            row['llrInclAccrued'] = round(-row['llp'] / (row['nplAmt'] + row['accrued']) * 100, 1)
    # nợ xử lý bằng dự phòng THỰC TẾ (thuyết minh biến động dự phòng cho vay KH, lũy kế đầu năm) thay cho số ước tính khi có
    _wf = ROOT / f'data/backfill/{TICKER.lower()}_writeoff.json'
    if _wf.exists():
        _y = json.loads(_wf.read_text(encoding='utf-8'))['ytd']
        for i, row in enumerate(Q):
            yy, qq = _y.get(str(row['year']), {}), row['quarter']
            cur, prv = yy.get(str(qq)), (0 if qq == 1 else yy.get(str(qq - 1)))
            if cur is None or prv is None or i == 0:
                continue
            wo = round((cur - prv) / 1e3, 1)   # triệu → tỷ
            row['writeOffAct'] = wo
            p = Q[i - 1]
            if row.get('nplAmt') is not None and p.get('nplAmt') is not None:
                form = row['nplAmt'] - p['nplAmt'] + wo
                row['nplFormation'] = round(form, 1)
                row['nplFormationRate'] = round(form / ((row['loansGross'] + p['loansGross']) / 2) * 400, 2)
        D['writeOffSrc'] = json.loads(_wf.read_text(encoding='utf-8'))['_src']
    D['quarterly'] = Q
    qn_ = Q[-1]
    D['meta'].update({'roe': qn_['roe'], 'roa': qn_['roa'], 'nim': qn_['nim'], 'cir': qn_['cir'], 'casa': qn_['casa'],
                      'npl': qn_['npl'], 'llr': qn_['llr'], 'ratioPeriod': f"TTM {qn_['q']}"})
    D['quarterlyNote'] = ('BCTC hợp nhất từ Wi MCP (fs_bank, ratio_bank, ratio_bank_ttm, ratio_common_ttm). '
                          'NIM, YEA, COF, CIR là TTM theo công thức Wi. Chi phí tín dụng, hình thành nợ xấu, '
                          'NIM điều chỉnh và LLR gồm lãi dự thu là số TỰ TÍNH (xem formula).')
    D['formula'] = {
        'creditCost': 'Chi phí dự phòng 4 quý gần nhất / dư nợ cho vay KH bình quân 5 quý (BNK-13)',
        'nplFormation': 'Hình thành nợ xấu ròng = NPL cuối − NPL đầu + nợ xử lý bằng dự phòng. Nợ xử lý lấy số thực tế trong thuyết minh (sử dụng dự phòng rủi ro tín dụng) khi có; kỳ không có thì ước tính = dự phòng đầu kỳ + chi phí dự phòng − dự phòng cuối kỳ. Ròng: đã trừ nợ xấu thu hồi, bán, nâng nhóm',
        'nplFormationRate': 'Hình thành nợ xấu quý / dư nợ bình quân đầu-cuối quý × 4 (quy năm)',
        'nimAdj': 'NIM × (1 − chi phí dự phòng TTM / thu nhập lãi thuần TTM) ≈ (NII − dự phòng) / TS sinh lời (BNK-07)',
        'llrInclAccrued': 'Dự phòng cho vay KH / (nợ xấu + lãi, phí phải thu) — stress test coi lãi dự thu là nợ xấu (BNK-14)',
        'pbFwd': 'Giá × CP lưu hành / VCSH năm dự phóng; VCSH dự phóng = VCSH quý mới nhất + (LNST dự phóng cả năm − LNST lũy kế) − cổ tức tiền mặt đã trả sau ngày khóa sổ quý',
    }

    # ------------------------------------------------ annual block
    A = []
    for r in fsy:
        A.append({'y': r['year'], 'toi': ty(r['isx08']), 'nii': ty(r['is20']), 'nfi': ty(r['isx03']), 'fx': ty(r['is50']),
                  'secInc': ty((r['isx04'] or 0) + (r['isx05'] or 0)), 'otherInc': ty(r['isx07']), 'opex': ty(r['isx09']),
                  'ppop': ty(r['is130']), 'prov': ty(r['is140']), 'pbt': ty(r['is150']), 'npat': ty(r['is190']),
                  'npatParent': ty(r['isx02']), 'loans': ty(r['bs160_1']), 'deposits': ty(r['bs330']), 'equity': ty(r['bsx12']),
                  'ta': ty(r['bs100']), 'recoveries': ty(r.get('cfx04'))})
    yr_by = {r['year']: r for r in ryear}
    for a in A:
        y = yr_by.get(a['y'], {})
        a.update({'cashDiv': y.get('cash_dividend'), 'stockDiv': pct(y.get('stock_dividend_ratio'), 1),
                  'payout': pct(y.get('cash_payout_ratio'), 1), 'planDone': pct(y.get('profit_plan_completion'), 1),
                  'roe': pct(y.get('roe'), 1), 'eps': y.get('eps')})
    D['annual'] = A

    # Kế hoạch & YTD năm hiện tại
    cur_year = last_q['year']
    agm = next((e for e in events if e.get('event_type') == 'Họp ĐHCĐ thường niên' and str(e.get('execution_date') or '').startswith(str(cur_year))), None)
    agm_d = '/'.join(reversed(agm['execution_date'][:10].split('-'))) if agm else str(cur_year)
    q_end = f"{last_q['year']}-{last_q['quarter'] * 3:02d}-{30 if last_q['quarter'] in (2, 3) else 31}"
    div_ev = [e for e in events if (e.get('cash_dividend') or 0) > 0 and e.get('execution_date') and q_end < e['execution_date'] <= asof]
    div_cash = sum(e['cash_dividend'] for e in div_ev)   # cổ tức tiền mặt đã trả sau ngày khóa sổ quý mới nhất (giảm VCSH dự phóng)
    stock_ev = sorted([e for e in events if (e.get('stock_dividend_ratio') or 0) > 0 and e.get('ex_date')], key=lambda e: e['ex_date'])
    D['lastStockDiv'] = ({'t': stock_ev[-1]['event_title'], 'ratio': round(stock_ev[-1]['stock_dividend_ratio'] * 100, 2), 'ex': stock_ev[-1]['ex_date']} if stock_ev else None)
    D['divPaidAfterQ'] = [{'d': e['execution_date'], 'v': e['cash_dividend'], 't': e['event_title']} for e in div_ev]
    plan = next((p for p in plans if p.get('year') == cur_year and p.get('planned_profit_before_tax')), None)
    ytd = [q for q in Q if q['year'] == cur_year]
    D['plan'] = None
    if plan:
        D['plan'] = {'year': cur_year, 'pbt': plan['planned_profit_before_tax'], 'npat': plan.get('planned_profit_after_tax'),
                     'ytdQuarters': len(ytd), 'ytdLabel': f"{len(ytd) * 3}T/{cur_year}",
                     'pbtYTD': round(sum(q['pbt'] for q in ytd), 1), 'npatYTD': round(sum(q['npat'] for q in ytd), 1),
                     'src': f"Wi MCP co_plans (ĐHĐCĐ {agm_d}); YTD cộng từ BCTC quý"}
        D['plan']['pbtDone'] = round(D['plan']['pbtYTD'] / plan['planned_profit_before_tax'] * 100, 1)
        if plan.get('planned_profit_after_tax'):
            D['plan']['npatDone'] = round(D['plan']['npatYTD'] / plan['planned_profit_after_tax'] * 100, 1)
        prev_ytd = [q for q in Q if q['year'] == cur_year - 1 and q['quarter'] <= len(ytd)]
        D['plan']['pbtYTDyoy'] = round((D['plan']['pbtYTD'] / sum(q['pbt'] for q in prev_ytd) - 1) * 100, 1)
        D['plan']['npatYTDyoy'] = round((D['plan']['npatYTD'] / sum(q['npat'] for q in prev_ytd) - 1) * 100, 1)

    # ------------------------------------------------ loan mix (BNK-01)
    mix = []
    for r in rbmix:
        if r['quarter'] != 4 and r is not rbmix[-1]:
            continue
        mix.append({'q': qlabel(r['year'], r['quarter']),
                    'byCustomer': {k: pct(r.get(f'pct_loans_{k}'), 1) for k in ['private_enterprises', 'individuals_households', 'soe', 'fdi_enterprises']},
                    'bySector': {k: pct(r.get(f'pct_loans_{k}'), 1) for k in ['wholesale_retail', 'manufacturing', 'trade_services', 'household_activities', 'utilities', 'construction_realestate', 'agriculture', 'transport_storage']},
                    'byTenor': {k: pct(r.get(f'pct_loans_{k}'), 1) for k in ['short_term', 'medium_term', 'long_term']}})
    D['loanMix'] = mix

    # ------------------------------------------------ cơ cấu cho vay / huy động / GTCG theo thuyết minh BCTC (fs_bank_notes, tỷ VND)
    try:
        notes = sort_q(merged(raw, 'wi_data_companies', 'fs_bank_notes', lambda q: TICKER in syms(q) and 'fnx112' in q.get('columns', ''), TICKER))
    except SystemExit:
        notes = []
    G = lambda r, k: ty(r.get(f'fnx{k}'))
    def grp(r, spec, need=0.9):
        """spec: [(nhãn, [mã fnx])]; trả {nhãn: tỷ} nếu tổng ≥ need × tổng dư nợ/huy động, ngược lại None."""
        out = {lab: round(sum((r.get(f'fnx{k}') or 0) for k in ks) / 1e9, 1) for lab, ks in spec}
        out = {k: v for k, v in out.items() if v}
        return out or None
    SECT = [('Bán buôn, bán lẻ', [62]), ('Công nghiệp chế biến, chế tạo', [52]), ('Bất động sản', [65]), ('Xây dựng', [54]),
            ('Điện, khí đốt, nước', [53, 63]), ('Vận tải, kho bãi, thông tin', [55]), ('Nông, lâm, thủy sản', [59]), ('Khai khoáng', [58]),
            ('Tài chính, bảo hiểm', [61]), ('Hộ gia đình, cá nhân', [64, 75]), ('Dịch vụ khác', [60, 66, 67, 68, 69, 70, 71, 74]), ('Khác', [76])]
    CUST = [('Doanh nghiệp nhà nước', [38]), ('Doanh nghiệp tư nhân', [39]), ('Doanh nghiệp FDI', [44]), ('Cá nhân, hộ kinh doanh', [45]),
            ('Khác', [46, 47, 48, 50])]
    mixq = []
    for r in notes:
        tot = (r.get('fnx13') or 0)
        if not tot:
            continue
        sec, cus = grp(r, SECT), grp(r, CUST)
        if sec and sum(sec.values()) < 0.9 * tot / 1e9: sec = None   # noqa: E701
        if cus and sum(cus.values()) < 0.9 * tot / 1e9: cus = None   # noqa: E701
        dep = grp(r, [('Không kỳ hạn', [112]), ('Có kỳ hạn', [113]), ('Vốn chuyên dùng', [114]), ('Ký quỹ', [115]), ('Khác', [116])])
        mixq.append({'q': qlabel(r['year'], r['quarter']), 'loans': ty(tot),
                     'tenor': grp(r, [('Ngắn hạn', [33]), ('Trung hạn', [34]), ('Dài hạn', [35])]),
                     'sector': sec, 'cust': cus, 'dep': dep,
                     'depCust': grp(r, [('Tổ chức kinh tế', [118]), ('Cá nhân', [119])]),
                     'gov': {'sbvBorrow': G(r, 104), 'kbnn': G(r, 107)},
                     'gtcg': grp(r, [('Chứng chỉ tiền gửi', [121]), ('Trái phiếu', [122]), ('Khác', [123])]),
                     'gtcgTenor': grp(r, [('Dưới 12 tháng', [125]), ('12 tháng – 5 năm', [126]), ('Trên 5 năm', [127])])})
    _bf = ROOT / 'data/backfill/notes_mix.json'   # bản dẫn xuất đã commit: build ở máy không có raw vẫn giữ được lịch sử
    _all = json.loads(_bf.read_text(encoding='utf-8')) if _bf.exists() else {}
    _m = {r['q']: r for r in _all.get(TICKER, [])}
    _m.update({r['q']: r for r in mixq})
    mixq = sorted(_m.values(), key=lambda r: (int(r['q'][3:]), int(r['q'][1])))
    _all[TICKER] = mixq
    _bf.write_text(json.dumps(_all, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    D['mixQ'] = mixq
    # P/B theo phiên (ratio_daily) của mã này và các NH cùng nhóm có trang riêng; bản dẫn xuất commit ở data/backfill/pb_daily.json
    _pf = ROOT / 'data/backfill/pb_daily.json'
    _pd = json.loads(_pf.read_text(encoding='utf-8')) if _pf.exists() else {}
    # lần kéo có phiên mới hơn ghi đè sau cùng: số của một phiên lấy trong giờ giao dịch được thay bằng số chốt theo giá đóng cửa
    _rd = [d for d in raw if d['tool'] == 'wi_data_companies' and d['request'].get('endpoint_name') == 'ratio_daily']
    _rd.sort(key=lambda d: max([str(r.get('trading_date') or '') for r in rows(d['response'])] or ['']))
    for d in _rd:
        for r in rows(d['response']):
            sy = r.get('symbol'); sy = sy[0] if isinstance(sy, list) else sy
            if sy and r.get('pb') is not None and r.get('trading_date'):
                _pd.setdefault(sy, {})[r['trading_date'][:10]] = round(float(r['pb']), 4)
    # trung vị P/B 26 NH theo phiên: từ các lần gom (aggregate median:pb theo trading_date) và từ bảng ratio_daily đủ ≥ 20 mã/phiên
    _md, _cnt = _pd.setdefault('_median', {}), {}
    for d in raw:
        rq = d['request']
        if d['tool'] == 'wi_data_companies' and rq.get('endpoint_name') == 'ratio_daily' and rq.get('action') == 'aggregate' and rq.get('metric') == 'median:pb':
            for g in (d['response'].get('nhom') or []):
                if (g.get('n') or 0) >= 20 and g.get('gia_tri_do') is not None:
                    _md[str(g['gia_tri'])[:10]] = round(float(g['gia_tri_do']), 4)
        elif d['tool'] == 'wi_data_companies' and rq.get('endpoint_name') == 'ratio_daily' and len(syms(rq)) >= 20:
            for r in rows(d['response']):
                if r.get('pb') is not None and r.get('trading_date'):
                    _cnt.setdefault(r['trading_date'][:10], {})[r.get('symbol')] = float(r['pb'])
    for dt, mp in _cnt.items():
        if len(mp) >= 20:
            _md[dt] = round(statistics.median(mp.values()), 4)
    _pd = {k: dict(sorted(v.items())) for k, v in sorted(_pd.items())}
    _pf.write_text(json.dumps(_pd, separators=(',', ':')), encoding='utf-8')
    _own = [k for k in json.loads((ROOT / 'data/banks.json').read_text(encoding='utf-8')) if not k.startswith('_')]
    # ---- Sự kiện quyền (cổ tức tiền, cổ tức/thưởng cổ phiếu, phát hành thêm) và BVPS theo phiên: bản dẫn xuất commit ở data/backfill
    _ef = ROOT / 'data/backfill/corp_events.json'
    _ev = json.loads(_ef.read_text(encoding='utf-8')) if _ef.exists() else {}
    for d in raw:
        if d['tool'] == 'wi_data_companies' and d['request'].get('endpoint_name') == 'co_events':
            for r in rows(d['response']):
                sy = r.get('symbol'); ex = (r.get('ex_date') or '')[:10]
                cd, sr, ir = r.get('cash_dividend') or 0, r.get('stock_dividend_ratio') or 0, r.get('issuance_ratio') or 0
                if sy in _own and ex and (cd or sr or ir):
                    k = f"{ex}|{r.get('event_title')}"
                    _ev.setdefault(sy, {})[k] = {'ex': ex, 'cash': cd, 'stock': sr, 'iss': ir, 'issPx': r.get('issuance_price') or 0, 't': r.get('event_title')}
    _ev = {k: dict(sorted(v.items())) for k, v in sorted(_ev.items())}
    _ef.write_text(json.dumps(_ev, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    _bf2 = ROOT / 'data/backfill/bvps_daily.json'   # điểm đổi giá trị BVPS của nguồn (giá trị giữ nguyên tới điểm đổi kế tiếp)
    _bvd = {k: dict(v) for k, v in (json.loads(_bf2.read_text(encoding='utf-8')) if _bf2.exists() else {}).items()}
    _full = {}
    for k, v in _bvd.items():   # bung điểm đổi thành từng phiên theo lịch phiên của P/B để gộp với raw mới
        cps = sorted(v.items()); dts = sorted(_pd.get(k, {}))
        j, cur = 0, None
        for dt in dts:
            while j < len(cps) and cps[j][0] <= dt:
                cur = cps[j][1]; j += 1
            if cur is not None and dt >= cps[0][0]:
                _full.setdefault(k, {})[dt] = cur
    for d in raw:
        if d['tool'] == 'wi_data_companies' and d['request'].get('endpoint_name') == 'ratio_daily':
            for r in rows(d['response']):
                sy = r.get('symbol'); sy = sy[0] if isinstance(sy, list) else sy
                if sy in _own and r.get('bvps') is not None and r.get('trading_date'):
                    _full.setdefault(sy, {})[r['trading_date'][:10]] = round(float(r['bvps']), 4)
    _bvd = {}
    for k, v in sorted(_full.items()):
        prev = None
        for dt, x in sorted(v.items()):
            if x != prev:
                _bvd.setdefault(k, {})[dt] = x; prev = x
    _bf2.write_text(json.dumps(_bvd, separators=(',', ':')), encoding='utf-8')

    # ---- P/B điều chỉnh theo sự kiện quyền của chính mã này. P/B = vốn hóa thực tại phiên / VCSH thuộc cổ đông NH mẹ:
    #   giá đóng cửa gốc = P/B nguồn × BVPS nguồn (cùng một dòng, đúng giá khớp phiên);
    #   CP lưu hành đổi NGAY ngày GDKHQ (cổ tức cổ phiếu, thưởng, quyền mua) — nguồn chỉ cập nhật khi CP mới niêm yết;
    #     phát hành riêng lẻ/ESOP (không có trong lịch sự kiện) nhận ra từ bước tăng bền của số CP nguồn;
    #   VCSH = BCTC quý chứa phiên đó nếu đã công bố, nếu chưa thì quý mới nhất (cùng quy ước với P/B nguồn và trung vị ngành),
    #     + tiền thu từ quyền mua − cổ tức tiền mặt có GDKHQ sau ngày khóa sổ quý đó (chưa nằm trong BCTC).
    _g = {}   # gộp các sự kiện cùng ngày GDKHQ (vd cổ tức cổ phiếu + quyền mua): tỷ lệ cộng, không nhân
    for e in _ev.get(TICKER, {}).values():
        g = _g.setdefault(e['ex'], {'ex': e['ex'], 'cash': 0, 'stock': 0, 'iss': 0, 'issCash': 0, 't': []})
        g['cash'] += e['cash']; g['stock'] += e['stock']; g['iss'] += e['iss']; g['issCash'] += e['iss'] * e['issPx']; g['t'].append(e['t'])
    EV = sorted(_g.values(), key=lambda e: e['ex'])
    for e in EV:
        e['t'] = '; '.join(e['t'])
    EVp = [e for e in EV if e['ex'] <= asof]
    S_now = shares_m
    _sf = ROOT / 'data/backfill/shares_daily.json'   # điểm đổi số CP lưu hành mà nguồn dùng (triệu CP) = vốn hóa / giá
    _sd = {k: dict(v) for k, v in (json.loads(_sf.read_text(encoding='utf-8')) if _sf.exists() else {}).items()}
    for d in raw:
        if d['tool'] == 'wi_data_companies' and d['request'].get('endpoint_name') == 'ratio_daily':
            for r in rows(d['response']):
                sy = r.get('symbol'); sy = sy[0] if isinstance(sy, list) else sy
                dt = (r.get('trading_date') or '')[:10]
                if sy in _own and r.get('market_cap') and r.get('pb') and _full.get(sy, {}).get(dt):
                    _sd.setdefault(sy, {})[dt] = round(r['market_cap'] / (r['pb'] * _full[sy][dt]) / 1e6, 1)
    _sdc = {}
    for k, v in sorted(_sd.items()):   # nén thành điểm đổi (> 0,2%)
        prev = None
        for dt, x in sorted(v.items()):
            if prev is None or abs(x / prev - 1) > 0.002:
                _sdc.setdefault(k, {})[dt] = x; prev = x
    _sf.write_text(json.dumps(_sdc, separators=(',', ':')), encoding='utf-8')
    if _sdc.get(TICKER):   # số CP nguồn mới nhất (vốn hóa / giá gốc) chính xác hơn vốn hóa / giá điều chỉnh
        _l = sorted(_sdc[TICKER].items())[-1][1]
        if abs(_l / S_now - 1) < 0.05:
            S_now = _l
    fac = lambda e: 1 + e['stock'] + e['iss']
    # bước tăng bền của số CP nguồn không khớp sự kiện quyền trong 150 ngày trước đó = phát hành riêng lẻ / ESOP
    PL = []
    seg = sorted(_sdc.get(TICKER, {}).items())
    dts_all = sorted(_pd.get(TICKER, {}))
    def nsess(a, b):
        return sum(1 for x in dts_all if a <= x < b)
    clean = []
    for k, (dt, x) in enumerate(seg):   # bỏ đoạn ngắn (≤ 10 phiên) rồi quay về mức cũ: lỗi tạm thời của nguồn
        if 0 < k < len(seg) - 1 and abs(seg[k + 1][1] / seg[k - 1][1] - 1) < 0.003 and nsess(dt, seg[k + 1][0]) <= 10:
            continue
        clean.append((dt, x))
    L, pend = None, []
    for dt, x in clean:
        if L is None:
            L = x; continue
        if x < L * 0.997 or abs(x / L - 1) <= 0.003:
            continue   # giảm (lỗi nguồn) hoặc không đổi
        lo = (date.fromisoformat(dt) - timedelta(days=150)).isoformat()
        cand = [e for e in EVp if lo < e['ex'] <= dt and e not in pend]
        f = 1.0
        for e in cand:
            f *= fac(e)
        r = x / L / (f if cand and abs(x / L / f - 1) < 0.02 else 1)
        if cand and abs(x / L / f - 1) < 0.02:
            pend += cand
        if r > 1.003:
            PL.append({'d': dt, 'r': r})
        L = x
    def S_at(t):   # triệu CP lưu hành tại phiên t
        s = S_now
        for e in EVp:
            if e['ex'] > t:
                s /= fac(e)
        for p_ in PL:
            if p_['d'] > t:
                s /= p_['r']
        return s
    def qend_of(y, q):
        return f"{y}-{q * 3:02d}-{30 if q in (2, 3) else 31}"
    _mf = ROOT / 'data/backfill/equity_parent.json'   # VCSH thuộc cổ đông ngân hàng mẹ = bsx12 − lợi ích CĐ thiểu số (bs390), tỷ đồng
    _mp = json.loads(_mf.read_text(encoding='utf-8')) if _mf.exists() else {}
    for d in raw:
        if d['tool'] == 'wi_data_companies' and d['request'].get('endpoint_name') == 'fs_bank':
            for r in rows(d['response']):
                if r.get('symbol') in _own and r.get('quarter') in (1, 2, 3, 4) and r.get('bsx12') is not None and r.get('bs390') is not None:
                    _mp.setdefault(r['symbol'], {})[f"{r['year']}Q{r['quarter']}"] = round((r['bsx12'] - r['bs390']) / 1e9, 1)
    _mp = {k: dict(sorted(v.items())) for k, v in sorted(_mp.items())}
    _mf.write_text(json.dumps(_mp, separators=(',', ':')), encoding='utf-8')
    _pe = _mp.get(TICKER, {})
    QE = [(qend_of(q['year'], q['quarter']), _pe.get(f"{q['year']}Q{q['quarter']}", q['equity'])) for q in Q if q.get('equity')]
    def bv_at(t):
        cur = None
        for qe, eq in QE:   # quý chứa phiên t (nếu đã có) hoặc quý mới nhất trước đó
            qs = (date.fromisoformat(qe) - timedelta(days=88)).isoformat()[:8] + '01'
            if qs <= t:
                cur = (qe, eq)
        if not cur:
            return None, None
        qe, bv = cur
        for e in EVp:
            if qe < e['ex'] <= t:
                bv += e['issCash'] * S_at((date.fromisoformat(e['ex']) - timedelta(days=1)).isoformat()) / 1e3
                bv -= e['cash'] * S_at(e['ex']) / 1e3
        return bv, qe
    _bvs = _full.get(TICKER, {})
    _adj = {}
    for dt, pbv in _pd.get(TICKER, {}).items():
        b = _bvs.get(dt)
        if b is None or dt < '2021-01-01':
            continue
        bv, _ = bv_at(dt)
        if bv:
            _adj[dt] = round(pbv * b * S_at(dt) / 1e3 / bv, 4)
    _af = ROOT / 'data/backfill/pb_adj.json'
    _pa = json.loads(_af.read_text(encoding='utf-8')) if _af.exists() else {}
    if _adj:
        _pa[TICKER] = dict(sorted(_adj.items()))
        _af.write_text(json.dumps(dict(sorted(_pa.items())), separators=(',', ':')), encoding='utf-8')
        _bvn, _qn = bv_at(asof)
        D['meta']['pbProvider'] = D['meta']['pb']
        D['meta']['pb'] = round(price * S_now / 1e3 / _bvn, 2)
        D['meta']['bvps'] = round(_bvn * 1e3 / S_now)
        _adjEv = [e for e in EVp if e['ex'] > _qn]
        D['pbAdjNote'] = {'q': _qn, 'events': [{'ex': e['ex'], 't': e['t']} for e in _adjEv], 'placements': [{'d': p_['d'], 'pct': round((p_['r'] - 1) * 100, 2)} for p_ in PL]}
    _src = lambda k: {**_pd[k], **_pa[k]} if k in _pa else _pd[k]   # mã có trang riêng: P/B đã điều chỉnh sự kiện quyền
    D['pbDaily'] = {k: [[d_, v_] for d_, v_ in sorted(_src(k).items()) if d_ >= '2021-01-01'] for k in _own + ['_median']
                    if k in _pd and (k == TICKER or k == '_median' or PEER_GROUPS.get(k) == GRP)}
    _ir = ROOT / f'data/backfill/{TICKER.lower()}_ir_segments.json'   # phân khúc khách hàng theo cách ngân hàng tự trình bày (tài liệu nhà đầu tư)
    if _ir.exists():
        _j = json.loads(_ir.read_text(encoding='utf-8'))
        _qs = sorted(set(_j['loans']) | set(_j['deposits']), key=lambda q: (int(q[3:]), int(q[1])))
        D['irSeg'] = {'src': _j['_src'], 'depNote': _j.get('depNote'),
                      'rows': [{'q': q, 'loans': dict(zip(_j['segs'], [v * 1000 for v in _j['loans'][q]])) if q in _j['loans'] else None,
                                'deps': dict(zip(_j.get('depSegs', _j['segs']), [v * 1000 for v in _j['deposits'][q]])) if q in _j['deposits'] else None} for q in _qs]}
    _ix = ROOT / f'data/backfill/{TICKER.lower()}_ir_extra.json'   # số liệu chỉ có trong tài liệu nhà đầu tư (nhập tay, có nguồn)
    if _ix.exists():
        D['irExtra'] = json.loads(_ix.read_text(encoding='utf-8'))
    D['mixNote'] = ('Thuyết minh BCTC hợp nhất: dư nợ theo kỳ hạn, ngành, loại khách hàng; tiền gửi theo loại và đối tượng; '
                    'giấy tờ có giá phát hành. Nhiều ngân hàng chỉ công bố cơ cấu ngành và khách hàng ở BCTC bán niên, năm.')

    # ------------------------------------------------ CAR (TT41, bán niên/năm)
    D['car'] = [{'period': (f"6T/{r['year']}" if r['quarter'] == 2 else f"{r['year']}"), 'y': r['year'], 'h': r['quarter'],
                 'car': pct(r['tt41_10']), 'tier1': pct(r['tt41_09']), 'ownFunds': ty(r['tt41_01']), 'rwaCredit': ty(r['tt41_05'])}
                for r in sorted(car, key=lambda r: (r['year'], r['quarter'] == 0))]
    lc = max(((r['year'], r['quarter'] == 0, r['quarter']) for r in car_all if r.get('tt41_10')))
    D['carPeers'] = {'period': (f"6T/{lc[0]}" if lc[2] == 2 else str(lc[0])),
                     'rows': sorted([{'s': r['symbol'], 'group': PEER_GROUPS.get(r['symbol'], 'Khác'), 'car': pct(r['tt41_10']), 'tier1': pct(r.get('tt41_09'))}
                                     for r in car_all if r['year'] == lc[0] and r['quarter'] == lc[2] and r.get('tt41_10')], key=lambda r: -r['car'])}

    # ------------------------------------------------ peers (Q2/2026)
    P = {}
    for r in peers_rbt:
        P.setdefault(r['symbol'], {}).update({'nim': pct(r.get('nim')), 'cof': pct(r.get('cof')), 'yea': pct(r.get('yea')), 'cir': pct(r.get('cir')),
                                              'toiYoY': pct(r.get('total_operating_income_growth_yoy'), 1)})
    for r in peers_rb:
        P.setdefault(r['symbol'], {}).update({'casa': pct(r.get('casa_ratio'), 1), 'npl': pct(r.get('npl_ratio')), 'g2': pct(r.get('group2_loan_ratio')),
                                              'llr': pct(r.get('npl_coverage_ratio'), 0), 'ldr': pct(r.get('ldr'), 1), 'creditYoY': pct(r.get('credit_growth_yoy'), 1),
                                              'accruedToTA': pct(r.get('accrued_interest_to_total_assets'))})
    for r in peers_rc:
        P.setdefault(r['symbol'], {}).update({'roe': pct(r.get('roe'), 1), 'roa': pct(r.get('roa')), 'npatYoY': pct(r.get('profit_parent_yoy'), 1)})
    _nrep = sum(1 for v in P.values() if v.get('nim') is not None or v.get('npl') is not None)
    D['peers'] = {'period': f'Q{PEER_Q}/{PEER_Y} (NIM, COF, YEA, CIR, ROE, ROA: TTM)' + (f' · {_nrep}/26 NH đã công bố, đang cập nhật' if _nrep < 26 else ''), 'nRep': _nrep,
                  'rows': [dict(symbol=s, group=PEER_GROUPS.get(s, 'Khác'), **v) for s, v in sorted(P.items(), key=lambda kv: (list(PEER_GROUPS).index(kv[0]) if kv[0] in PEER_GROUPS else 99))]}

    # ------------------------------------------------ governance
    hs = BANK.get('holderSwap')
    if hs:   # nguồn ghi đảo tỷ lệ giữa hai cổ đông — hoán đổi theo CBTT giao dịch (xem note)
        ha = next((h for h in holders if h['name'] == hs['a']), None); hb = next((h for h in holders if h['name'] == hs['b']), None)
        if ha and hb and hb['ownership_ratio'] > ha['ownership_ratio']:
            for k in ('ownership_ratio', 'shares_held'):
                ha[k], hb[k] = hb[k], ha[k]
    D['governance'] = {
        'shareholders': [{'name': h['name'], 'shares': h['shares_held'], 'percent': round(h['ownership_ratio'], 3), 'asOf': h['last_update']}
                         for h in sorted(holders, key=lambda h: -h['ownership_ratio']) if h['ownership_ratio'] >= 0.5],
        'holderNote': hs['note'] if hs else None,
        'leadership': [], 'trades': [], 'src': 'Wi MCP co_holders, co_leaders, co_insider (chỉ tên, chức vụ, ngày bổ nhiệm; không lưu thông tin cá nhân khác)'}
    seen = set()
    order = ['Chủ tịch HĐQT', 'Tổng Giám đốc', 'Thành viên HĐQT', 'Thành viên HĐQT độc lập', 'Thành viên HĐQT không điều hành', 'Trưởng Ban kiểm soát', 'Phó Tổng giám đốc', 'Kế toán trưởng']
    for l in leaders:
        key = (l['name'], l['position'])
        if key in seen or l['position'] not in order:
            continue
        seen.add(key)
        D['governance']['leadership'].append({'name': l['name'], 'role': l['position'], 'since': l.get('appointment_date')})
    D['governance']['leadership'].sort(key=lambda l: (order.index(l['role']), l['since'] or ''))
    for t in sorted(insider, key=lambda t: t.get('executed_to_date') or '', reverse=True):
        d_to = t.get('executed_to_date')
        ret = {}
        if d_to and t.get('report_type') == 'Kết quả':   # lợi suất giá từ phiên đầu sau ngày kết thúc giao dịch (không hàm ý GD gây biến động)
            i0 = next((i for i, p in enumerate(prices) if p['trading_date'] > d_to), None)
            if i0 is not None:
                for k, n in (('m1', 21), ('m3', 63), ('y1', 252)):
                    if i0 + n < len(prices):
                        ret[k] = round((prices[i0 + n]['close'] / prices[i0]['close'] - 1) * 100, 2)
        D['governance']['trades'].append({'name': t['insider_name'], 'role': t.get('insider_position'), 'side': t['transaction_type'], 'type': t.get('report_type'),
                                          'reg': t.get('registered_volume'), 'regFrom': t.get('registered_from_date'), 'regTo': t.get('registered_to_date'),
                                          'executed': t.get('executed_volume'), 'from': t.get('executed_from_date'), 'to': d_to,
                                          'volAfter': t.get('volume_after'), 'after': t.get('ratio_after'), 'ret': ret})
    D['governance']['subs'] = [{'name': r['subcompany_name'], 'kind': 'Công ty con' if r.get('subcompany_type') == 1 else 'Công ty liên doanh, liên kết',
                                'pct': r.get('benefit_ratio'), 'capital': ty(r.get('charter_capital')), 'ticker': r.get('ma_ck'), 'asOf': r.get('last_update')}
                               for r in sorted(subs, key=lambda r: (r.get('subcompany_type', 9), -(r.get('charter_capital') or 0)))]
    tot = sum(h['ownership_ratio'] for h in holders if h['ownership_ratio'] >= 0.5)
    D['governance']['other'] = round(100 - tot, 2)

    # ------------------------------------------------ price & valuation history
    px = [{'d': p['trading_date'], 'c': p['close']} for p in prices]
    one_year_ago = (datetime.fromisoformat(px[-1]['d']) - timedelta(days=365)).date().isoformat()
    y1 = [p for p in px if p['d'] > one_year_ago]
    hi = max(y1, key=lambda p: p['c']); lo = min(y1, key=lambda p: p['c'])
    # chuẩn so sánh: chỉ số giá ngành ngân hàng (sector_price_daily, sector 405) và VN-Index (eod_adjust VNINDEX)
    secd, vnid = {}, {}
    for d in raw:
        ep = d['request'].get('endpoint_name')
        if d['tool'] == 'wi_data_sector' and ep == 'sector_price_daily' and '405' in [x.strip() for x in str(flt(d['request']).get('sector_id')).split(',')]:
            for r in rows(d['response']):
                if r.get('close') is not None and str(r.get('sector_id', 405)) == '405': secd[r['trading_date']] = r['close']
        elif d['tool'] == 'wi_data_stock' and ep == 'eod_adjust' and syms(d['request']) == ['VNINDEX']:
            for r in rows(d['response']):
                if r.get('close') is not None: vnid[r['trading_date']] = r['close']
    for d in raw:   # VN-Index từ index_eod cho phiên chưa có
        if d['tool'] == 'wi_data_stock' and d['request'].get('endpoint_name') == 'index_eod':
            for r in rows(d['response']):
                if r.get('indicator_id') == 235211 and r.get('value') is not None: vnid.setdefault(r['date'], r['value'])
    for p in px:
        if p['d'] in secd: p['s'] = round(secd[p['d']], 2)
        if p['d'] in vnid: p['v'] = round(vnid[p['d']], 2)
    D['price'] = {'series': px, 'high52': hi, 'low52': lo, 'src': 'Wi MCP eod_adjust (giá đã điều chỉnh, VN-Index), sector_price_daily (chỉ số giá ngành ngân hàng, gia quyền vốn hóa)'}
    vh = [{'q': q['q'], 'pb': q['pb'], 'pe': q['pe']} for q in Q if q['pb']]
    last20 = [v for v in vh][-20:]  # 5 năm quý
    def band(key):
        xs = [v[key] for v in last20 if v[key]]
        m, s = statistics.mean(xs), statistics.pstdev(xs)
        return {'mean': round(m, 2), 'median': round(statistics.median(xs), 2), 'sd': round(s, 2), 'lo': round(m - s, 2), 'hi': round(m + s, 2),
                'n': len(xs), 'from': last20[0]['q'], 'to': last20[-1]['q']}
    D['valuation'] = {'history': vh, 'pbBand': band('pb'), 'peBand': band('pe'),
                      'note': 'P/B, P/E cuối quý (giá cuối quý / BVPS, EPS TTM theo Wi). Dải ±1σ tính trên 20 quý gần nhất.'}

    # ------------------------------------------------ consensus (co_reports)
    cutoff_fade = (date.fromisoformat(asof) - timedelta(days=92)).isoformat()
    def adj_px(p, d0):   # quy giá mục tiêu công bố trước GDKHQ về cùng cơ sở CP hiện tại: (P − cổ tức tiền + tỷ lệ quyền × giá phát hành) / (1 + tỷ lệ CP mới)
        for e in sorted([e for e in EVp if d0 < e['ex']], key=lambda e: e['ex']):
            p = (p - e['cash'] + e['issCash']) / (1 + e['stock'] + e['iss'])
        return round(p)
    latest = {}
    for r in sorted(reports, key=lambda r: r['recommendation_date']):
        if r.get('target_price'):
            latest[r['source']] = r
    cons = []
    for src, r in sorted(latest.items(), key=lambda kv: kv[1]['recommendation_date'], reverse=True):
        tp0, tpa = r['target_price'], adj_px(r['target_price'], r['recommendation_date'])
        cons.append({'broker': src, 'date': r['recommendation_date'], 'rating': r['recommendation'], 'tp': tpa, 'tpOrig': tp0 if round(tpa) != round(tp0) else None,
                     'upside': round((tpa / D['meta']['price'] - 1) * 100, 1),
                     'toiF': r.get('revenue_forecast'), 'toiF1': r.get('revenue_forecast_n1'),
                     'npF': r.get('net_income_forecast'), 'npF1': r.get('net_income_forecast_n1'),
                     'thesis': r.get('report_title'), 'stale': r['recommendation_date'] < cutoff_fade})
    # Bản cập nhật không có TP nhưng có dự phóng (KHÁC) — giữ để đếm dự phóng LNST
    fc_only = []
    for r in sorted(reports, key=lambda r: r['recommendation_date'], reverse=True):
        if not r.get('target_price') and r.get('net_income_forecast') and r['source'] not in latest:
            if r['source'] not in [f['broker'] for f in fc_only]:
                fc_only.append({'broker': r['source'], 'date': r['recommendation_date'], 'rating': r['recommendation'], 'tp': None,
                                'npF': r['net_income_forecast'], 'npF1': r.get('net_income_forecast_n1'), 'toiF': r.get('revenue_forecast'),
                                'thesis': r.get('report_title'), 'stale': r['recommendation_date'] < cutoff_fade})
    tps = [c['tp'] for c in cons if not c['stale']]
    nps = [c['npF'] for c in cons + fc_only if c.get('npF') and not c['stale']]
    eq_q2 = Q[-1]['equity']
    npat_h1 = D['plan']['npatYTD'] if D['plan'] else None
    div_paid = round(div_cash * shares_m / 1e3, 1)  # tỷ VND: đ/CP × triệu CP / 1000
    np_med = statistics.median(nps) if nps else None
    _qe2 = qend_of(Q[-1]['year'], Q[-1]['quarter'])
    rights_cash = round(sum(e['issCash'] * S_at((date.fromisoformat(e['ex']) - timedelta(days=1)).isoformat()) / 1e3 for e in EVp if e['ex'] > _qe2 and e['iss']), 1)
    bv26 = eq_q2 + (np_med - npat_h1) - div_paid + rights_cash if np_med else None
    D['consensus'] = {
        'rows': cons, 'forecastOnly': fc_only, 'fadeBefore': cutoff_fade,
        'summary': {'n': len(tps), 'median': statistics.median(tps), 'mean': round(statistics.mean(tps)), 'min': min(tps), 'max': max(tps),
                    'upsideMedian': round((statistics.median(tps) / D['meta']['price'] - 1) * 100, 1),
                    'buy': sum(1 for c in cons if c['rating'] == 'MUA' and not c['stale']),
                    'npMedian': np_med, 'npMin': min(nps), 'npMax': max(nps), 'npN': len(nps)},
        'fwd': {'bv2026F': round(bv26, 1) if bv26 else None, 'npat2026F': np_med,
                'pbFwd': round(D['meta']['mcap'] / bv26, 2) if bv26 else None,
                'peFwd': round(D['meta']['mcap'] / np_med, 2) if np_med else None,
                'bvps2026F': round(bv26 * 1e3 / shares_m) if bv26 else None,
                'npatH1': npat_h1, 'impliedH2': round(np_med - npat_h1, 1) if np_med else None,
                'npat2025': next((a['npat'] for a in A if a['y'] == cur_year - 1), None),
                'h2_2025': round(sum(q['npat'] for q in Q if q['year'] == cur_year - 1 and q['quarter'] >= 3), 1),
                'divPaid': div_paid, 'rightsCash': rights_cash},
        'src': 'Wi MCP co_reports (giá mục tiêu, dự phóng TOI/LNST) + ai_news (luận điểm tóm tắt). Khuyến nghị là nhãn gộp 4 nhóm của Wi.',
    }
    summ = {}
    for n in ainews:
        if n.get('category_name') == 'Báo cáo phân tích':
            summ[n['title'].replace(f'{TICKER}: ', '').strip()] = n['ai_summary']
    for c in cons + fc_only:
        c['summary'] = summ.get((c['thesis'] or '').strip())

    # ------------------------------------------------ events (catalyst)
    ev = []
    for e in events:
        if e['ex_date'] and e['ex_date'] >= '2024-01-01':
            ev.append({'d': e.get('execution_date') or e['ex_date'], 'type': 'Cổ tức' if re.search(r'cổ tức|cổ phiếu', e.get('event_type') or e['event_title'], re.I) else 'Nghị quyết/CBTT',
                       't': e['event_title'], 'impact': '0', 'status': 'done' if (e.get('execution_date') or e['ex_date']) <= asof else 'pending',
                       'src': 'Wi MCP co_events'})
    kw = [('trái phiếu', 'Vốn & huy động'), ('Trái phiếu', 'Vốn & huy động'), ('tăng vốn', 'Vốn & huy động'), ('vốn điều lệ', 'Vốn & huy động'),
          ('PHP', 'Thoái vốn'), ('Nhân sự', 'Nhân sự'), ('nhân sự', 'Nhân sự'), ('Phó TGĐ', 'Nhân sự'), ('nghỉ hưu', 'Nhân sự'),
          ('MUFG', 'Cổ đông chiến lược'), ('Mizuho', 'Cổ đông chiến lược'), ('Hana', 'Cổ đông chiến lược'),
          ('kiểm toán', 'BCTC'), ('quản trị', 'Quản trị')]
    for n in exnews:
        t = n['title']
        typ = next((v for k, v in kw if k in t), None)
        if not typ:
            continue
        ev.append({'d': n['publish_time'][:10], 'type': typ, 't': t, 'impact': '0', 'status': 'done', 'src': 'HOSE CBTT qua Wi MCP'})
    for n in ainews:
        if n.get('category_name') == 'Kết quả kinh doanh':
            ev.append({'d': n['publish_date'][:10], 'type': 'KQKD', 't': n['title'].replace(f'{TICKER}: ', ''), 'detail': n['ai_summary'],
                       'impact': '+', 'status': 'done', 'src': 'Wi MCP ai_news'})
    # KQKD quý mới nhất từ BCTC (nếu chưa có tin KQKD cùng quý)
    _ql = Q[-1]; _q0 = next((x for x in Q if x['year'] == _ql['year'] - 1 and x['quarter'] == _ql['quarter']), None)
    _lbl = f"Q{_ql['quarter']}/{_ql['year']}"
    if not any(e['type'] == 'KQKD' and (_lbl in e['t'] or f"Quý {_ql['quarter']}/{_ql['year']}" in e['t']) for e in ev):
        _y = (_ql['pbt'] / _q0['pbt'] - 1) * 100 if _q0 and _q0.get('pbt') else None
        ev.append({'d': qend_of(_ql['year'], _ql['quarter']), 'type': 'KQKD', 't': f"BCTC hợp nhất {_lbl}: LNTT {_ql['pbt']:,.0f} tỷ".replace(',', '.') + (f" ({_y:+.1f}% so cùng kỳ)".replace('.', ',') if _y is not None else ''),
                   'impact': '+' if _y and _y > 0 else ('−' if _y is not None and _y < 0 else '0'), 'status': 'done', 'src': 'Wi MCP fs_bank'})
    # Mốc sắp tới: chỉ những mốc có nguồn (quy định / CBTT / báo cáo CTCK trên Wi MCP)
    ev += [
        _next_deadline(Q),
        {'d': '2026-12-01', 'type': 'Luật/Chính sách', 't': 'TT50/2026/TT-NHNN có hiệu lực: LDR mới, LCR, NSFR thay SMLR', 'impact': '?', 'status': 'pending',
         'detail': 'Tiền gửi KBNN mặc định 20% trong LDR theo TT50 (Thống đốc có thể điều chỉnh); liên ngân hàng chỉ tính vị thế ròng.', 'src': 'Deck slide 21, 53; báo cáo TT50 FinSuccess'},
        {'d': '2026-08-01', 'type': 'Luật/Chính sách', 't': 'Hệ số tiền gửi KBNN tính vào LDR nâng lên 50% (từ Q3/2026)', 'impact': '+', 'status': 'done',
         'detail': ('Big 4 hưởng lợi nhiều nhất do giữ nhiều tiền gửi KBNN. ' if GRP == 'Big 4' else 'Ngân hàng tư nhân giữ ít tiền gửi KBNN nên hưởng lợi ít hơn Big 4. ') + BANK.get('kbnnNote', ''), 'src': 'Công thức LDR Wi MCP; Wi MCP ai_news'},
    ] + [dict(e) for e in BANK.get('events', [])]
    # mốc 'pending' đã qua ngày cập nhật mà chưa xác nhận → giữ là mốc theo dõi (không tự đổi trạng thái)
    D['events'] = sorted(ev, key=lambda e: e['d'], reverse=True)

    # ------------------------------------------------ macro (lãi suất niêm yết, tỷ giá: dùng cho COF và bảng rủi ro)
    def ser(iid, tt='monthly'):   # gộp mọi lần kéo theo tháng (từ 2019); trùng tháng lấy ngày muộn nhất
        bym = {}
        for d in raw:
            if d['tool'] != 'wi_data_macro':
                continue
            for s in (d['response'].get('data') or []):
                if s.get('indicator_id') == iid and (s.get('time_type') == tt or (tt == 'monthly' and s.get('time_type') == 'weekly')):
                    for v in s['values']:
                        if v.get('value') is None:
                            continue
                        k = v['date'][:7]
                        if k not in bym or v['date'] >= bym[k]['d']:
                            bym[k] = {'d': v['date'], 'v': v['value']}
        return [bym[k] for k in sorted(bym)]
    M = {
        'fx': {'nhtmSell': ser(82223), 'central': ser(82227), 'ceiling': ser(82228), 'sbvSell': ser(82231), 'free': ser(82226), 'freeD': daily_fx(raw, 82226), 'nhtmD': daily_fx(raw, 82223), 'dxy': ser(235028),
               'note': 'Cuối tháng (Wi nén chuỗi ngày về tháng). Tỷ giá NHTM bán ra, trung tâm, trần biên độ, giá NHNN bán can thiệp, tỷ giá tự do bán ra.'},
        'rates': {'onMonthEnd': ser(82237), 'omo': ser(81522), 'dep12State': ser(202886), 'dep12Other': ser(202880), 'dep12Bank': ser(BANK['dep12']), 'dep12Id': BANK['dep12'], 'effr': ser(7079)},
        'onDaily': daily_merged(raw, 82237), 'omoNetDaily': daily_merged(raw, 82268), 'omoRateDaily': daily_merged(raw, 81522),
        'credit': {'ytd': ser(241732), 'yoy': ser(75847), 'depositsYoY': ser(265963)},
        'src': f"Wi MCP macro: 82223, 82226, 82227, 82228, 82231, 235028, 82237, 81522, 82268, 202886, 202880, {BANK['dep12']}, 7079, 241732, 75847, 265963",
    }
    D['macro'] = M

    # ------------------------------------------------ rule signals (R-xx, deck slide 50–51) — giả định theo dõi
    on20 = [v['v'] for v in M['onDaily'][-20:]]
    net20 = sum(v['v'] for v in M['omoNetDaily'][-20:])
    cy, dy = M['credit']['yoy'][-1], M['credit']['depositsYoY'][-1]
    dep = M['rates']['dep12State']
    dep_3m = next((v for v in reversed(dep) if v['d'] <= (date.fromisoformat(dep[-1]['d']) - timedelta(days=90)).isoformat()), dep[0])
    dxy = M['fx']['dxy']
    dxy_3m = next((v for v in reversed(dxy) if v['d'] <= (date.fromisoformat(dxy[-1]['d']) - timedelta(days=90)).isoformat()), dxy[0])
    fxs, ceil, sbv = M['fx']['nhtmSell'][-1], M['fx']['ceiling'][-1], M['fx']['sbvSell'][-1]
    cen = M['fx']['central']
    cen_ytd0 = next(v for v in cen if v['d'].startswith(f'{int(cen[-1]["d"][:4]) - 1}-12'))
    qn, qp = Q[-1], Q[-2]
    sig = [
        {'id': 'R-01', 'label': 'DXY 3 tháng', 'value': round((dxy[-1]['v'] / dxy_3m['v'] - 1) * 100, 1), 'unit': '%',
         'asOf': dxy[-1]['d'], 'rule': 'DXY tăng mạnh → áp lực USD/VND, NHNN ưu tiên ổn định', 'threshold': '> +3% / 3 tháng (giả định)',
         'state': 'risk' if (dxy[-1]['v'] / dxy_3m['v'] - 1) > 0.03 else 'watch' if dxy[-1]['v'] > dxy_3m['v'] else 'ok',
         'impact': 'Dư địa nới lỏng của NHNN → COF, định giá'},
        {'id': 'FX', 'label': 'Tỷ giá NHTM bán / trần biên độ', 'value': round((fxs['v'] / ceil['v'] - 1) * 100, 2), 'unit': '% (âm = còn cách trần)',
         'asOf': fxs['d'], 'rule': 'Khoảng cách tới trần thu hẹp → NHNN phải bán USD, hút VND', 'threshold': '> −1% (giả định)',
         'state': 'risk' if fxs['v'] / ceil['v'] - 1 > -0.01 else 'ok', 'impact': f"Tỷ giá trung tâm +{round((cen[-1]['v'] / cen_ytd0['v'] - 1) * 100, 1)}% từ đầu năm"},
        {'id': 'R-09', 'label': 'Tín dụng − tiền gửi (YoY)', 'value': round(cy['v'] - dy['v'], 1), 'unit': 'điểm %',
         'asOf': f"tín dụng {cy['d'][:7]}, tiền gửi {dy['d'][:7]}", 'rule': 'Tín dụng tăng nhanh hơn huy động → LDR căng, cạnh tranh tiền gửi',
         'threshold': '> +3 điểm % (giả định)', 'state': 'risk' if cy['v'] - dy['v'] > 3 else 'watch' if cy['v'] > dy['v'] else 'ok',
         'impact': f'LS huy động TT1 → COF {TICKER} (1–2 quý)'},
        {'id': 'R-10', 'label': 'LNH qua đêm TB 20 phiên vs OMO', 'value': round(statistics.mean(on20) - M['omoRateDaily'][-1]['v'], 2), 'unit': 'điểm %',
         'asOf': M['onDaily'][-1]['d'], 'rule': f"OMO bơm ròng 20 phiên {round(net20):,} tỷ; LNH > OMO kéo dài → TT2 thiếu vốn".replace(',', '.'),
         'threshold': '> 0 kéo dài (giả định)', 'state': 'watch' if statistics.mean(on20) > M['omoRateDaily'][-1]['v'] else 'ok',
         'impact': 'OMO không giúp tuân thủ LDR; TT1 chỉ hạ khi có nới tỉ lệ'},
        {'id': 'R-13', 'label': 'LS huy động 12T NHTM Nhà nước, Δ 3 tháng', 'value': round(dep[-1]['v'] - dep_3m['v'], 2), 'unit': 'điểm %',
         'asOf': dep[-1]['d'], 'rule': f"Mức {dep[-1]['v']}%; tăng → COF tăng theo kỳ tái định giá", 'threshold': '> +0,3 điểm % (giả định)',
         'state': 'risk' if dep[-1]['v'] - dep_3m['v'] > 0.3 else 'watch' if dep[-1]['v'] > dep_3m['v'] else 'ok', 'impact': 'COF, NIM (1–3 quý)'},
        {'id': 'R-14', 'label': 'Hình thành nợ xấu quy năm', 'value': qn.get('nplFormationRate'), 'unit': '% dư nợ',
         'asOf': qn['q'], 'rule': f"NPL {qn['npl']}% (quý trước {qp['npl']}%), LLR {qn['llr']}%", 'threshold': '> 1,5% (giả định)',
         'state': 'risk' if (qn.get('nplFormationRate') or 0) > 1.5 else 'watch' if (qn.get('nplFormationRate') or 0) > (qp.get('nplFormationRate') or 0) else 'ok',
         'impact': 'Chi phí tín dụng tăng sau lãi suất cao 2–4 quý'},
    ]
    D['signals'] = sig

    # ------------------------------------------------ thu nhập dịch vụ theo mảng (thuyết minh năm)
    import fee_lines as FL
    _A = FL.annual_rows(raw)
    _ser = {y: FL.lines_of(r) for (sym, y), r in _A.items() if sym == TICKER}
    if _ser:
        D['fee'] = {'lines': [{'k': k, 'name': n} for k, n, *_ in FL.LINES], 'series': {str(y): v for y, v in sorted(_ser.items())},
                    'table': FL.table(_ser), 'src': 'Thuyết minh BCTC hợp nhất năm — thu, chi hoạt động dịch vụ theo loại'}

    # ------------------------------------------------ thesis pillars — tối thiểu: Room & an toàn, NIM, nợ xấu, thu nhập phí (+ định giá)
    nim_min = min(q['nim'] for q in Q[-8:] if q['nim'])
    car_last = D['car'][-1]
    pb = D['valuation']['pbBand']
    q4 = Q[-5] if len(Q) >= 5 else Q[0]
    yoy = lambda a, b: round((a / b - 1) * 100, 1) if a and b else None
    acc_yoy, loan_yoy = yoy(qn['accrued'], q4['accrued']), yoy(qn['loansGross'], q4['loansGross'])
    acc_loan = round(qn['accrued'] / qn['loansGross'] * 100, 2) if qn['loansGross'] else None
    try:
        _S = json.loads((ROOT / 'data/sector-data.json').read_text(encoding='utf-8'))
        _ls = next((r for r in _S['ldrSens']['rows'] if r['s'] == TICKER), None)
        _cmk = next(k for k in reversed(list(_S['camel']['periods'])) if any(r['s'] == TICKER for r in _S['camel']['periods'][k]['rows']))   # kỳ mới nhất có NH này
        _cm = next((r for r in _S['camel']['periods'][_cmk]['rows'] if r['s'] == TICKER), None)
        _bigNim = _S['agg']['series']['nim'][GRP][-1]
    except Exception:  # noqa: BLE001
        _ls = _cm = _bigNim = None
    try:   # bối cảnh ngành cho các tab Tài chính (từ dashboard ngành)
        _ag = _S['agg']['series']; _bq = _S['banks']['quarters']
        D['ctx'] = {'quarters': _bq, 'ldrSens': _ls, 'nRep': _S['banks'].get('nRep'), 'nAll': _S['banks'].get('nAll', 26), 'camelPeriod': _cmk,
                    'camel': {k: _cm.get(k) for k in ('room', 'creditYtd', 'grade', 'total')} if _cm else None,
                    'roomCoef': _S['camel']['roomCoef'],
                    'agg': {m: {g: _ag[m][g] for g in dict.fromkeys(('Big 4', GRP, 'all')) if g in _ag[m]} for m in ('nim', 'cof', 'yea', 'npl', 'g2', 'llr', 'ldr', 'casa', 'cir', 'roe') if m in _ag},
                    'peerLdr': [{'s': r['s'], 'group': r['group'], 'ldr20': r['ldr20'], 'ldr0': r['ldr0'], 'ldr50': r['ldr50'], 'kbnnPctDep': r['kbnnPctDep']} for r in _S['ldrSens']['rows'] if r['group'] == GRP]}
    except Exception:  # noqa: BLE001
        pass
    nfi_ttm = sum(q['nfi'] for q in Q[-4:]); nfi_ttm0 = sum(q['nfi'] for q in Q[-8:-4]) if len(Q) >= 8 else None
    toi_ttm = sum(q['toi'] for q in Q[-4:])
    fee_t = D.get('fee', {}).get('table')
    fee_txt = ''
    if fee_t:
        rws = [r for r in fee_t['rows'] if r['k'] != '_tot' and r['inc'] > 0]
        top = max(rws, key=lambda r: r['incYoY'] if r['incYoY'] is not None else -1e9)
        fee_txt = (f"; năm {fee_t['year']}: " + ', '.join(f"{r['name'].split(' (')[0].lower()} {r['share']:.0f}%" + (f" (biên {r['margin']:.0f}%" if r.get('margin') is not None else ' (') + (f", thu {r['incYoY']:+.1f}%)" if r.get('incYoY') is not None else ')')
                   for r in sorted(rws, key=lambda r: -(r['share'] or 0))[:3]) + f"; tăng nhanh nhất: {top['name'].split(' (')[0].lower()}")
    room_ok = (qn['ldr'] or 99) < 85 - 1 and car_last['car'] >= 9.5
    D['thesisPillars'] = [
        {'id': 'p1', 'go': {'sub': 'safe', 'card': 'chLdrQ'}, 'step': 'Bước 2–3, 7 · Nguồn vốn, an toàn vốn', 't': 'Room tăng trưởng: LDR và an toàn vốn',
         'evidence': (f"LDR {qn['ldr']}% ({qn['q']}, trần 85% theo TT22)" + (f"; theo TT50 (TGKB tính 20%) {_ls['ldr20']}%" if _ls else '')
                      + f"; CAR {car_last['car']}%, vốn cấp 1 {car_last['tier1']}% ({car_last['period']}); tín dụng YoY {qn['creditYoY']}% vs huy động {qn['fundingYoY']}%"
                      + (f"; room ngụ ý theo xếp hạng TT21 {_cm['room']}%" if _cm else '')),
         'status': 'holding' if room_ok and qn['fundingYoY'] >= qn['creditYoY'] - 3 else 'watch'},
        {'id': 'p2', 'go': {'sub': 'nim', 'card': 'chNimPeer'}, 'step': 'Bước 5 · Biên lãi', 't': 'NIM giữ được trước áp lực giảm lãi suất',
         'evidence': f"NIM TTM {qn['nim']}% ({qn['q']}) so với đáy 8 quý {nim_min}%" + (f", bình quân {GRP} {_bigNim}%" if _bigNim else '') + f"; YEA {qn['yea']}%, COF {qn['cof']}%; CASA {qn['casa']}% (quý trước {qp['casa']}%)",
         'status': 'holding' if qn['nim'] > nim_min + 0.05 and qn['casa'] >= qp['casa'] - 0.5 else 'watch'},
        {'id': 'p3', 'go': {'sub': 'aq', 'card': 'chAccr'}, 'step': 'Bước 4 · Chất lượng tài sản', 't': 'Nợ xấu: nhóm 2, nhóm 3–5 và lãi phải thu',
         'evidence': (f"Nợ nhóm 2 {qn['g2']}%, nợ xấu nhóm 3–5 {qn['npl']}% dư nợ (quý trước {qp['npl']}%); LLR {qn['llr']}%, tính cả lãi phải thu {qn.get('llrInclAccrued')}%"
                      + f"; lãi phải thu (tài sản Có khác) {nf(qn['accrued'] / 1000, 1)} nghìn tỷ = {acc_loan}% dư nợ, {acc_yoy:+.1f}% YoY so với cho vay {loan_yoy:+.1f}%"),
         'status': 'watch' if (qn['npl'] > qp['npl'] or qn['llr'] < qp['llr'] or (acc_yoy or 0) > (loan_yoy or 0) + 5) else 'holding'},
        {'id': 'p4', 'go': {'sub': 'nfi', 'card': 'chFee'}, 'step': 'Bước 6 · Thu nhập ngoài lãi', 't': 'Thu nhập phí (NFI) bù đắp NIM',
         'evidence': (f"NFI TTM {nf(nfi_ttm / 1000, 1)} nghìn tỷ = {round(nfi_ttm / toi_ttm * 100, 1)}% TOI" + (f", {yoy(nfi_ttm, nfi_ttm0):+.1f}% YoY" if nfi_ttm0 else '') + fee_txt),
         'status': 'holding' if nfi_ttm0 and nfi_ttm > nfi_ttm0 else 'watch'},
        {'id': 'p5', 'go': {'sub': 'pv', 'card': 'chValF'}, 'step': 'Bước 8 · Định giá', 't': 'Định giá chưa phản ánh ROE',
         'evidence': f"P/B {D['meta']['pb']}x ({D['meta']['priceDate']}) vs trung bình 5 năm {pb['mean']}x (±1σ {pb['lo']}–{pb['hi']}x); ROE TTM {qn['roe']}%",
         'status': 'holding' if D['meta']['pb'] < pb['mean'] else 'watch'},
    ]
    for _p in D['thesisPillars']:
        _p['evidence'] = re.sub(r'(\d)\.(\d)', r'\1,\2', _p['evidence'])
    D['thesisNote'] = 'Trạng thái tính theo quy tắc từ số mới nhất (AI dựng khung theo deck), CHƯA phải nhận định analyst/FinSuccess.'

    # ------------------------------------------------ quy định REG (deck slide 53, đã đối chiếu)
    _R = json.loads((ROOT / 'data/regs.json').read_text(encoding='utf-8'))   # danh mục quy định biên tập tay, dùng chung với nganh.html
    D['reg'] = _R['items']
    D['regRef'] = _R.get('analysis')
    D['sources'] = [
        {'n': 'Wi MCP — BCTC, chỉ số, giá, báo cáo CTCK, vĩ mô', 'u': f'https://widata.vn/{TICKER}'},
        {'n': f"{BANK.get('short', TICKER)} — Quan hệ nhà đầu tư", 'u': BANK.get('irUrl', '')},
        {'n': 'Deck "Hướng dẫn xây dựng dashboard ngân hàng" (FinSuccess, 10/2026) — khung 8 bước, BNK/DOM/R/REG', 'u': ''},
        {'n': 'Báo cáo "Ngành Ngân hàng: Tác động Thông tư 50/2026" (FinSuccess, 05/10/2026)', 'u': 'https://fisc.vn/xu-huong-dau-tu/thong-tu-50-huong-toi-tang-truong-quan-tri-rui-ro-thuc-chat-p37070.html'},
    ]
    return D



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
    global TICKER, BANK, GRP
    ap = argparse.ArgumentParser()
    ap.add_argument('--ticker', default='CTG')
    ap.add_argument('--raw', default='data/raw/wi')
    ap.add_argument('--out', default=None)
    a = ap.parse_args()
    TICKER = a.ticker.upper()
    BANK = json.loads((ROOT / 'data/banks.json').read_text(encoding='utf-8'))[TICKER]
    GRP = PEER_GROUPS.get(TICKER, 'Big 4')
    a.out = a.out or f'data/{TICKER.lower()}-data.js'
    D = build(load_raw(a.raw))
    D['narr'] = BANK.get('narr', {})
    D['pages'] = {k: v['page'] for k, v in json.loads((ROOT / 'data/banks.json').read_text(encoding='utf-8')).items() if not k.startswith('_')}
    js = ('// Sinh tự động bởi scripts/build_ctg_data.py từ data/raw/wi — KHÔNG sửa tay.\n'
          'window.PVS_DATA = ' + json.dumps(D, ensure_ascii=False, separators=(',', ':')) + ';\n')
    open(a.out, 'w', encoding='utf-8').write(js)
    json.dump(D, open(a.out.replace('.js', '.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'wrote {a.out} ({len(js) // 1024} KB)', file=sys.stderr)


if __name__ == '__main__':
    main()
