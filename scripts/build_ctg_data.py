#!/usr/bin/env python3
"""Dựng data/ctg-data.js (window.PVS_DATA) từ các response WiData gốc trong data/raw/wi/.

- Không chép tay số: mọi số lấy từ file raw (lưu bởi scripts/wi_capture_transcript.py).
- Số tự tính được gắn `derived: true` kèm công thức trong `formula`.
- Đơn vị tiền: tỷ VND (BCTC Wi tính bằng VND → chia 1e9). Tỷ lệ: % (đã nhân 100).
- Ngưỡng tín hiệu là GIẢ ĐỊNH THEO DÕI theo deck "Hướng dẫn xây dựng dashboard ngân hàng"
  (quy tắc R-xx), không phải ngưỡng thống kê đã kiểm định.

Dùng: python3 scripts/build_ctg_data.py [--raw data/raw/wi] [--out data/ctg-data.js]
"""
import argparse, glob, json, math, statistics, sys
from datetime import date, datetime, timedelta

TICKER = 'CTG'
BIG4 = ['VCB', 'BID', 'CTG']
PEER_GROUPS = {'VCB': 'Big 4', 'BID': 'Big 4', 'CTG': 'Big 4',
               'MBB': 'Tư nhân lớn', 'TCB': 'Tư nhân lớn', 'ACB': 'Tư nhân lớn', 'VPB': 'Tư nhân lớn',
               'HDB': 'Tư nhân vừa', 'VIB': 'Tư nhân vừa', 'TPB': 'Tư nhân vừa', 'SHB': 'Tư nhân vừa', 'STB': 'Tư nhân vừa'}


# ---------------------------------------------------------------- raw helpers
def load_raw(folder):
    out = []
    for p in sorted(glob.glob(f'{folder}/*.json')):
        d = json.load(open(p, encoding='utf-8'))
        d['_file'] = p.split('/')[-1]
        out.append(d)
    return out


def rows(resp):
    data = resp.get('data', resp)
    if isinstance(data, dict) and 'cot' in data:
        return [dict(zip(data['cot'], r)) for r in data['dong']]
    if isinstance(data, list):
        return data
    return []


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


ROOT = __import__('pathlib').Path(__file__).resolve().parent.parent


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

    snap = find(raw, 'wi_data_companies', 'snapshot')['response']
    fsq = sort_q([r for r in rows(find(raw, 'wi_data_companies', 'fs_bank', lambda q: flt(q).get('quarter') == '1,2,3,4')['response']) if r['symbol'] == TICKER])
    fsy = sorted(rows(find(raw, 'wi_data_companies', 'fs_bank', lambda q: flt(q).get('quarter') == '0')['response']), key=lambda r: r['year'])
    rbt = sort_q([r for r in rows(find(raw, 'wi_data_companies', 'ratio_bank_ttm', lambda q: flt(q).get('symbol') == TICKER)['response'])])
    rb = sort_q(rows(find(raw, 'wi_data_companies', 'ratio_bank', lambda q: flt(q).get('symbol') == TICKER and flt(q).get('quarter') == '1,2,3,4')['response']))
    rbmix = sort_q(rows(find(raw, 'wi_data_companies', 'ratio_bank', lambda q: flt(q).get('quarter') == '2,4')['response']))
    rct = sort_q(rows(find(raw, 'wi_data_companies', 'ratio_common_ttm', lambda q: flt(q).get('symbol') == TICKER)['response']))
    peers_rbt = rows(find(raw, 'wi_data_companies', 'ratio_bank_ttm', lambda q: ',' in flt(q).get('symbol', ''))['response'])
    peers_rb = rows(find(raw, 'wi_data_companies', 'ratio_bank', lambda q: ',' in flt(q).get('symbol', ''))['response'])
    peers_rc = rows(find(raw, 'wi_data_companies', 'ratio_common_ttm', lambda q: ',' in flt(q).get('symbol', ''))['response'])
    car = rows(find(raw, 'wi_data_companies', 'bank_car_tt41', lambda q: flt(q).get('symbol') == TICKER)['response'])
    plans = rows(find(raw, 'wi_data_companies', 'co_plans')['response'])
    ryear = sorted(rows(find(raw, 'wi_data_companies', 'ratio_common_year')['response']), key=lambda r: r['year'])
    holders = rows(find(raw, 'wi_data_companies', 'co_holders')['response'])
    leaders = rows(find(raw, 'wi_data_companies', 'co_leaders')['response'])
    insider = rows(find(raw, 'wi_data_companies', 'co_insider')['response'])
    events = rows(find(raw, 'wi_data_companies', 'co_events')['response'])
    reports = rows(find(raw, 'wi_data_companies', 'co_reports')['response'])
    ainews = rows(find(raw, 'wi_data_news', 'ai_news')['response'])
    exnews = rows(find(raw, 'wi_data_news', 'exchange_news')['response'])
    prices = sorted(rows(find(raw, 'wi_data_stock', 'eod_adjust')['response']), key=lambda r: r['trading_date'])
    macro = {}
    for d in raw:
        if d['tool'] == 'wi_data_macro':
            for s in d['response']['data']:
                key = (s['indicator_id'], s['time_type'])
                macro[key] = sorted(s['values'], key=lambda v: v['date'])

    # ------------------------------------------------ meta
    gia, dg, ho = snap['gia'], snap['dinh_gia'], snap['ho_so']
    shares_m = ho['so_cp_luu_hanh'] / 1e6
    last_q = fsq[-1]
    lq = qlabel(last_q['year'], last_q['quarter'])
    D['meta'] = {
        'ticker': TICKER, 'name': ho['ten'], 'exchange': ho['san'], 'sector': 'bank', 'peerGroup': 'Big 4',
        'updated': asof, 'price': gia['gia_dong_cua_vnd'], 'priceDate': gia['ngay'],
        'mcap': dg['von_hoa_ty_vnd'], 'pb': dg['pb_lan'], 'pe': dg['pe_lan'], 'bvps': dg['bvps_vnd'], 'eps': dg['eps_vnd'],
        'sharesOut': round(shares_m, 1), 'latestQuarter': lq,
        'view': None,  # analyst nhập ở tab FinSuccess; không tự gán
        'irUrl': 'https://investor.vietinbank.vn/',
        'src': f"WiData snapshot {gia['ngay']} (giá, P/B, P/E); BCTC hợp nhất {lq}",
    }
    sl = snap['sinh_loi']
    D['meta'].update({'roe': sl['roe_pct'], 'roa': sl['roa_pct'], 'nim': sl['nim_pct'], 'cir': sl['cir_pct'],
                      'casa': sl['casa_pct'], 'npl': sl['ty_le_no_xau_pct'], 'llr': sl['bao_phu_no_xau_pct'],
                      'ratioPeriod': f"TTM {snap['meta']['ky_bao_cao']}"})

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
    D['quarterly'] = Q
    D['quarterlyNote'] = ('BCTC hợp nhất từ WiData (fs_bank, ratio_bank, ratio_bank_ttm, ratio_common_ttm). '
                          'NIM, YEA, COF, CIR là TTM theo công thức Wi. Chi phí tín dụng, hình thành nợ xấu, '
                          'NIM điều chỉnh và LLR gồm lãi dự thu là số TỰ TÍNH (xem formula).')
    D['formula'] = {
        'creditCost': 'Chi phí dự phòng 4 quý gần nhất / dư nợ cho vay KH bình quân 5 quý (BNK-13)',
        'nplFormation': 'NPL cuối − NPL đầu + nợ xử lý bằng dự phòng; nợ xử lý ≈ dự phòng đầu kỳ + chi phí dự phòng − dự phòng cuối kỳ (BNK-11, ước tính; chi phí dự phòng gồm cả dự phòng khác ngoài cho vay)',
        'nplFormationRate': 'Hình thành nợ xấu quý / dư nợ bình quân đầu-cuối quý × 4 (quy năm)',
        'nimAdj': 'NIM × (1 − chi phí dự phòng TTM / thu nhập lãi thuần TTM) ≈ (NII − dự phòng) / TS sinh lời (BNK-07)',
        'llrInclAccrued': 'Dự phòng cho vay KH / (nợ xấu + lãi, phí phải thu) — stress test coi lãi dự thu là nợ xấu (BNK-14)',
        'pbFwd': 'Giá × CP lưu hành / VCSH 2026F; VCSH 2026F = VCSH Q2/2026 + (LNST dự phóng 2026 − LNST 6T/2026) − cổ tức tiền mặt 450đ/CP trả 27/08/2026',
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
    plan = next((p for p in plans if p.get('year') == cur_year and p.get('planned_profit_before_tax')), None)
    ytd = [q for q in Q if q['year'] == cur_year]
    D['plan'] = None
    if plan:
        D['plan'] = {'year': cur_year, 'pbt': plan['planned_profit_before_tax'], 'npat': plan.get('planned_profit_after_tax'),
                     'ytdQuarters': len(ytd), 'ytdLabel': f"{len(ytd) * 3}T/{cur_year}",
                     'pbtYTD': round(sum(q['pbt'] for q in ytd), 1), 'npatYTD': round(sum(q['npat'] for q in ytd), 1),
                     'src': 'WiData co_plans (ĐHĐCĐ 24/04/2026); YTD cộng từ BCTC quý'}
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

    # ------------------------------------------------ CAR (TT41, bán niên/năm)
    D['car'] = [{'period': (f"6T/{r['year']}" if r['quarter'] == 2 else f"{r['year']}"), 'y': r['year'], 'h': r['quarter'],
                 'car': pct(r['tt41_10']), 'tier1': pct(r['tt41_09']), 'ownFunds': ty(r['tt41_01']), 'rwaCredit': ty(r['tt41_05'])}
                for r in sorted(car, key=lambda r: (r['year'], r['quarter'] == 0))]

    # ------------------------------------------------ peers (Q2/2026)
    P = {}
    for r in peers_rbt:
        P.setdefault(r['symbol'], {}).update({'nim': pct(r['nim']), 'cof': pct(r['cof']), 'yea': pct(r['yea']), 'cir': pct(r['cir']),
                                              'toiYoY': pct(r['total_operating_income_growth_yoy'], 1)})
    for r in peers_rb:
        P.setdefault(r['symbol'], {}).update({'casa': pct(r['casa_ratio'], 1), 'npl': pct(r['npl_ratio']), 'g2': pct(r['group2_loan_ratio']),
                                              'llr': pct(r['npl_coverage_ratio'], 0), 'ldr': pct(r['ldr'], 1), 'creditYoY': pct(r['credit_growth_yoy'], 1),
                                              'accruedToTA': pct(r['accrued_interest_to_total_assets'])})
    for r in peers_rc:
        P.setdefault(r['symbol'], {}).update({'roe': pct(r['roe'], 1), 'roa': pct(r['roa']), 'npatYoY': pct(r['profit_parent_yoy'], 1)})
    D['peers'] = {'period': 'Q2/2026 (NIM, COF, YEA, CIR, ROE, ROA: TTM)',
                  'rows': [dict(symbol=s, group=PEER_GROUPS.get(s, 'Khác'), **v) for s, v in sorted(P.items(), key=lambda kv: (list(PEER_GROUPS).index(kv[0]) if kv[0] in PEER_GROUPS else 99))]}

    # ------------------------------------------------ governance
    D['governance'] = {
        'shareholders': [{'name': h['name'], 'shares': h['shares_held'], 'percent': round(h['ownership_ratio'], 3), 'asOf': h['last_update']}
                         for h in sorted(holders, key=lambda h: -h['ownership_ratio']) if h['ownership_ratio'] >= 0.5],
        'leadership': [], 'trades': [], 'src': 'WiData co_holders, co_leaders, co_insider (chỉ tên, chức vụ, ngày bổ nhiệm; không lưu thông tin cá nhân khác)'}
    seen = set()
    order = ['Chủ tịch HĐQT', 'Tổng Giám đốc', 'Thành viên HĐQT', 'Thành viên HĐQT độc lập', 'Trưởng Ban kiểm soát', 'Phó Tổng giám đốc', 'Kế toán trưởng']
    for l in leaders:
        key = (l['name'], l['position'])
        if key in seen or l['position'] not in order:
            continue
        seen.add(key)
        D['governance']['leadership'].append({'name': l['name'], 'role': l['position'], 'since': l.get('appointment_date')})
    D['governance']['leadership'].sort(key=lambda l: (order.index(l['role']), l['since'] or ''))
    for t in sorted(insider, key=lambda t: t.get('executed_to_date') or '', reverse=True):
        D['governance']['trades'].append({'name': t['insider_name'], 'role': t.get('insider_position'), 'side': t['transaction_type'],
                                          'executed': t.get('executed_volume'), 'to': t.get('executed_to_date'), 'after': t.get('ratio_after')})

    # ------------------------------------------------ price & valuation history
    px = [{'d': p['trading_date'], 'c': p['close']} for p in prices]
    one_year_ago = (datetime.fromisoformat(px[-1]['d']) - timedelta(days=365)).date().isoformat()
    y1 = [p for p in px if p['d'] > one_year_ago]
    hi = max(y1, key=lambda p: p['c']); lo = min(y1, key=lambda p: p['c'])
    D['price'] = {'series': px, 'high52': hi, 'low52': lo, 'src': 'WiData eod_adjust (giá đã điều chỉnh)'}
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
    latest = {}
    for r in sorted(reports, key=lambda r: r['recommendation_date']):
        if r.get('target_price'):
            latest[r['source']] = r
    cons = []
    for src, r in sorted(latest.items(), key=lambda kv: kv[1]['recommendation_date'], reverse=True):
        cons.append({'broker': src, 'date': r['recommendation_date'], 'rating': r['recommendation'], 'tp': r['target_price'],
                     'tpAdj': round(r['target_price_adjusted']) if r.get('target_price_adjusted') else r['target_price'],
                     'upside': round((r['target_price'] / D['meta']['price'] - 1) * 100, 1),
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
    div_paid = round(450 * shares_m / 1e3, 1)  # tỷ VND: 450đ × triệu CP / 1000
    np_med = statistics.median(nps) if nps else None
    bv26 = eq_q2 + (np_med - npat_h1) - div_paid if np_med else None
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
                'divPaid': div_paid},
        'src': 'WiData co_reports (giá mục tiêu, dự phóng TOI/LNST) + ai_news (luận điểm tóm tắt). Khuyến nghị là nhãn gộp 4 nhóm của Wi.',
    }
    summ = {}
    for n in ainews:
        if n.get('category_name') == 'Báo cáo phân tích':
            summ[n['title'].replace('CTG: ', '').strip()] = n['ai_summary']
    for c in cons + fc_only:
        c['summary'] = summ.get((c['thesis'] or '').strip())

    # ------------------------------------------------ events (catalyst)
    ev = []
    for e in events:
        if e['ex_date'] and e['ex_date'] >= '2024-01-01':
            ev.append({'d': e.get('execution_date') or e['ex_date'], 'type': 'Nghị quyết/CBTT' if 'ĐHCĐ' in e['event_title'] else 'Cổ tức',
                       't': e['event_title'], 'impact': '0', 'status': 'done' if (e.get('execution_date') or e['ex_date']) <= asof else 'pending',
                       'src': 'WiData co_events'})
    kw = [('trái phiếu', 'Vốn & huy động'), ('PHP', 'Thoái vốn'), ('Nhân sự', 'Nhân sự'), ('nhân sự', 'Nhân sự'),
          ('Phó TGĐ', 'Nhân sự'), ('MUFG', 'Cổ đông chiến lược'), ('kiểm toán', 'BCTC'), ('quản trị', 'Quản trị')]
    for n in exnews:
        t = n['title']
        typ = next((v for k, v in kw if k in t), None)
        if not typ:
            continue
        ev.append({'d': n['publish_time'][:10], 'type': typ, 't': t, 'impact': '0', 'status': 'done', 'src': 'HOSE CBTT qua WiData'})
    for n in ainews:
        if n.get('category_name') == 'Kết quả kinh doanh':
            ev.append({'d': n['publish_date'][:10], 'type': 'KQKD', 't': n['title'].replace('CTG: ', ''), 'detail': n['ai_summary'],
                       'impact': '+', 'status': 'done', 'src': 'WiData ai_news'})
    # Mốc sắp tới: chỉ những mốc có nguồn (quy định / CBTT / báo cáo CTCK trên WiData)
    ev += [
        {'d': '2026-10-20', 'type': 'KQKD', 't': 'Hạn công bố BCTC hợp nhất Q3/2026 (≤ 20 ngày sau quý, TT96/2020)', 'impact': '?', 'status': 'pending',
         'src': 'Quy định CBTT; ngày công bố thực tế theo CTG'},
        {'d': '2026-10-31', 'type': 'Vốn & huy động', 't': 'Chào bán trái phiếu ra công chúng (đã có Giấy chứng nhận 08/10, Bản cáo bạch 12/10)', 'impact': '+', 'status': 'pending',
         'detail': 'GTCG ổn định vì không rút trước hạn; theo TT50, GTCG do TCTD khác nắm giữ bị loại khỏi LDR.', 'src': 'HOSE CBTT qua WiData'},
        {'d': '2026-12-01', 'type': 'Luật/Chính sách', 't': 'TT50/2026/TT-NHNN có hiệu lực: LDR mới, LCR, NSFR thay SMLR', 'impact': '?', 'status': 'pending',
         'detail': 'Tiền gửi KBNN mặc định 20% trong LDR theo TT50 (Thống đốc có thể điều chỉnh); liên ngân hàng chỉ tính vị thế ròng.', 'src': 'Deck slide 21, 53; báo cáo TT50 FinSuccess'},
        {'d': '2026-12-31', 'type': 'Doanh nghiệp', 't': 'Chuyển nhượng dự án VietinBank Tower (Ciputra) — các CTCK kỳ vọng ghi nhận lợi nhuận một lần', 'impact': '+', 'status': 'pending',
         'detail': 'Ước tính khác nhau giữa CTCK: ~800 tỷ (VDS), ~1.000 tỷ (VDS 06/2026), 2.000–3.000 tỷ (KAFI); thời điểm từng được kỳ vọng Q2, rồi 08/2026, chưa xác nhận hoàn tất.', 'src': 'WiData ai_news — báo cáo CTCK 05–09/2026'},
        {'d': '2026-12-31', 'type': 'Vốn & huy động', 't': 'Phương án tăng vốn điều lệ và nâng sở hữu Nhà nước lên ≥ 65%', 'impact': '+', 'status': 'pending',
         'detail': 'Vốn điều lệ 77.669 tỷ (Q2/2026); Agriseco nêu kế hoạch lên hơn 105.000 tỷ. CAR 2025 9,89% là ràng buộc chính của tăng trưởng.', 'src': 'WiData ai_news; BCTC Q2/2026'},
        {'d': '2026-08-01', 'type': 'Luật/Chính sách', 't': 'Hệ số tiền gửi KBNN tính vào LDR nâng lên 50% (từ Q3/2026)', 'impact': '+', 'status': 'done',
         'detail': 'Big 4 hưởng lợi nhiều nhất do giữ nhiều tiền gửi KBNN; NHSV ước dư địa cho vay thêm ~55.000 tỷ cho CTG.', 'src': 'Công thức LDR WiData; WiData ai_news (NHSV 05/08/2026)'},
    ]
    D['events'] = sorted(ev, key=lambda e: e['d'], reverse=True)

    # ------------------------------------------------ macro (tab Vĩ mô & Tỉ lệ an toàn)
    def ser(iid, tt='monthly'):
        return [{'d': v['date'], 'v': v['value']} for v in macro.get((iid, tt), [])]
    M = {
        'fx': {'nhtmSell': ser(82223), 'central': ser(82227), 'ceiling': ser(82228), 'sbvSell': ser(82231), 'free': ser(82226), 'dxy': ser(235028),
               'note': 'Cuối tháng (Wi nén chuỗi ngày về tháng). Tỷ giá NHTM bán ra, trung tâm, trần biên độ, giá NHNN bán can thiệp, tỷ giá tự do bán ra.'},
        'rates': {'onMonthEnd': ser(82237), 'omo': ser(81522), 'dep12State': ser(202886), 'dep12Other': ser(202880), 'dep12CTG': ser(202862), 'effr': ser(7079)},
        'onDaily': ser(82237, 'daily'), 'omoNetDaily': ser(82268, 'daily'), 'omoRateDaily': ser(81522, 'daily'),
        'credit': {'ytd': ser(241732), 'yoy': ser(75847), 'depositsYoY': ser(265963)},
        'src': 'WiData macro: 82223, 82226, 82227, 82228, 82231, 235028, 82237, 81522, 82268, 202886, 202880, 202862, 7079, 241732, 75847, 265963',
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
         'impact': 'LS huy động TT1 → COF CTG (1–2 quý)'},
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

    # ------------------------------------------------ thesis pillars (theo khung 8 bước) — trạng thái theo quy tắc
    nim_min = min(q['nim'] for q in Q[-8:] if q['nim'])
    car_last = D['car'][-1]
    pb = D['valuation']['pbBand']
    D['thesisPillars'] = [
        {'id': 'p1', 'step': 'Bước 5 · Biên lãi', 't': 'NIM phục hồi từ đáy',
         'evidence': f"NIM TTM {qn['nim']}% ({qn['q']}) so với đáy 8 quý {nim_min}%; YEA {qn['yea']}%, COF {qn['cof']}%",
         'status': 'holding' if qn['nim'] > nim_min + 0.05 else 'watch'},
        {'id': 'p2', 'step': 'Bước 4 · Chất lượng tài sản', 't': 'Nợ xấu trong tầm kiểm soát, bộ đệm dự phòng đủ',
         'evidence': f"NPL {qn['npl']}% (Q trước {qp['npl']}%), nhóm 2 {qn['g2']}%, LLR {qn['llr']}% (Q trước {qp['llr']}%); hình thành nợ xấu quy năm {qn.get('nplFormationRate')}%",
         'status': 'watch' if qn['llr'] < qp['llr'] or qn['npl'] > qp['npl'] else 'holding'},
        {'id': 'p3', 'step': 'Bước 2–3 · Nguồn vốn & tăng trưởng', 't': 'Dư địa tăng tín dụng (LDR, room)',
         'evidence': f"LDR (công thức Wi, KBNN tính theo hệ số TT26/TT08) {qn['ldr']}%; tín dụng YoY {qn['creditYoY']}%, huy động YoY {qn['fundingYoY']}%; CASA {qn['casa']}%",
         'status': 'watch' if qn['casa'] < qp['casa'] else 'holding'},
        {'id': 'p4', 'step': 'Bước 7 · Vốn', 't': 'CAR đủ để tăng trưởng và chia cổ tức',
         'evidence': f"CAR {car_last['car']}% ({car_last['period']}, TT41), Tier 1 {car_last['tier1']}%; cổ tức tiền mặt 450đ/CP",
         'status': 'watch' if car_last['car'] < 10.5 else 'holding'},
        {'id': 'p5', 'step': 'Bước 8 · Định giá', 't': 'Định giá chưa phản ánh ROE',
         'evidence': f"P/B {D['meta']['pb']}x ({D['meta']['priceDate']}) vs trung bình 5 năm {pb['mean']}x (±1σ {pb['lo']}–{pb['hi']}x); ROE TTM {qn['roe']}%",
         'status': 'holding' if D['meta']['pb'] < pb['mean'] else 'watch'},
    ]
    D['thesisNote'] = 'Trạng thái tính theo quy tắc từ số mới nhất (AI dựng khung theo deck), CHƯA phải nhận định analyst/FinSuccess.'

    # ------------------------------------------------ quy định REG (deck slide 53, đã đối chiếu)
    _R = json.loads((ROOT / 'data/regs.json').read_text(encoding='utf-8'))   # danh mục quy định biên tập tay, dùng chung với nganh.html
    D['reg'] = _R['items']
    D['regRef'] = _R.get('analysis')
    D['sources'] = [
        {'n': 'WiData (MCP) — BCTC, chỉ số, giá, báo cáo CTCK, vĩ mô', 'u': 'https://widata.vn/CTG'},
        {'n': 'VietinBank — Quan hệ nhà đầu tư', 'u': 'https://investor.vietinbank.vn/'},
        {'n': 'Deck "Hướng dẫn xây dựng dashboard ngân hàng" (FinSuccess, 10/2026) — khung 8 bước, BNK/DOM/R/REG', 'u': ''},
        {'n': 'Báo cáo "Ngành Ngân hàng: Tác động Thông tư 50/2026" (FinSuccess, 05/10/2026)', 'u': 'https://fisc.vn/xu-huong-dau-tu/thong-tu-50-huong-toi-tang-truong-quan-tri-rui-ro-thuc-chat-p37070.html'},
    ]
    return D


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', default='data/raw/wi')
    ap.add_argument('--out', default='data/ctg-data.js')
    a = ap.parse_args()
    D = build(load_raw(a.raw))
    js = ('// Sinh tự động bởi scripts/build_ctg_data.py từ data/raw/wi — KHÔNG sửa tay.\n'
          'window.PVS_DATA = ' + json.dumps(D, ensure_ascii=False, separators=(',', ':')) + ';\n')
    open(a.out, 'w', encoding='utf-8').write(js)
    json.dump(D, open(a.out.replace('.js', '.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'wrote {a.out} ({len(js) // 1024} KB)', file=sys.stderr)


if __name__ == '__main__':
    main()
