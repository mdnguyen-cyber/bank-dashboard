#!/usr/bin/env python3
"""Ngành tài chính khác: gom response Wi MCP (data/raw/wi, không đưa lên repo) thành data/backfill/fin_wi.json.

Gồm: BCTC quý công ty chứng khoán (fs_sec) và bảo hiểm (fs_ins) niêm yết ưu tiên; BCTC tổng hợp ngành chứng khoán (408)
và bảo hiểm (406); định giá ngành theo ngày (sector_ratio_daily); định giá từng mã phiên gần nhất (ratio_daily).
Tiền quy về tỷ đồng.
"""
import glob, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = ROOT / 'data' / 'raw' / 'wi'
OUT = ROOT / 'data' / 'backfill' / 'fin_wi.json'
SEC = ['SSI', 'HCM', 'VCI', 'TCX', 'VPX', 'VCK', 'MBS', 'VND', 'SHS']
INS = ['BVH', 'PVI', 'MIG', 'BMI', 'BIC', 'PTI']


def load(p):
    s = pathlib.Path(p).read_text()
    j = json.loads(s)
    if isinstance(j, dict) and 'response' in j:
        return j.get('request', {}), j['response']
    return {}, j


def table(resp):
    d = resp.get('data') if isinstance(resp, dict) else None
    if isinstance(d, dict) and 'cot' in d:
        return [dict(zip(d['cot'], r)) for r in d['dong']]
    if isinstance(d, list):
        return d
    return []


def pick(endpoint, test):
    best = []
    for f in sorted(glob.glob(str(RAW / '*.json'))):
        try:
            req, resp = load(f)
        except Exception:
            continue
        if req.get('endpoint_name') == endpoint and test(req.get('filters') or ''):
            rows = table(resp)
            if len(rows) > len(best):
                best = rows
    return best


ty = lambda v: None if v is None else round(v / 1e9, 2)


def fs_rows(rows, keys, sym=True):
    out = {}
    for r in rows:
        y = r.get('year') or r.get('period_year'); q = r.get('quarter') or r.get('period_quarter')
        if not y or not q:
            continue
        k = r['symbol'] if sym else '_'
        out.setdefault(k, []).append([f'{y}Q{q}'] + [ty(r.get(c)) for c in keys])
    for k in out:
        out[k].sort(key=lambda x: x[0])
    return out


SEC_K = ['is01', 'is21', 'is02', 'is03', 'is04', 'is06', 'is27', 'is07', 'is10', 'is20', 'is52', 'is62', 'is90', 'is200',
         'bs111', 'bs112', 'bs113', 'bs114', 'bs115', 'bs270', 'bs311', 'bs316', 'bs346', 'bs400']
INS_K = ['is01_1', 'is01_2', 'is02', 'is03', 'isx01', 'is15', 'is18', 'is19', 'is25', 'is26', 'isx27', 'is50', 'is60',
         'bs120', 'bs250', 'bs270', 'bs400']


def pick_all(endpoint, test):
    out = []
    for f in sorted(glob.glob(str(RAW / '*.json'))):
        try:
            req, resp = load(f)
        except Exception:
            continue
        if req.get('endpoint_name') == endpoint and test(req.get('filters') or ''):
            out.append((req, table(resp)))
    return out


def merge_q(*lists):
    seen = {}
    for rows in lists:
        for r in rows:
            seen[(r['symbol'], r['year'], r['quarter'])] = r
    return list(seen.values())


def main():
    fs_sec = merge_q(table(json.loads((RAW / 'fin' / 'fs_sec.json').read_text())), pick('fs_sec', lambda f: '2018' in f and 'SSI' in f))
    fs_ins = merge_q(pick('fs_ins', lambda f: 'BVH' in f and '2022' in f), pick('fs_ins', lambda f: 'BVH' in f and '2018' in f))
    s408 = pick('sector_fs_sec', lambda f: '"408"' in f)
    s406 = pick('sector_fs_ins', lambda f: '"406"' in f)
    val = pick('ratio_daily', lambda f: 'SSI' in f and 'BVH' in f)
    secval = {}
    for sid in ('408', '406'):
        rows = table(json.loads((RAW / 'fin' / f'secval_{sid}.txt').read_text()))
        rows.sort(key=lambda r: r['trading_date'])
        secval[sid] = {'d': [r['trading_date'] for r in rows], 'pb': [r['pb'] for r in rows], 'pe': [r['pe'] for r in rows],
                       'mcap': [ty(r['market_cap']) for r in rows]}
    out = {
        'secK': SEC_K, 'insK': INS_K,
        'sec': fs_rows([r for r in fs_sec if r['symbol'] in SEC], SEC_K),
        'ins': fs_rows([r for r in fs_ins if r['symbol'] in INS], INS_K),
        'secSector': fs_rows(s408, SEC_K, sym=False).get('_', []),
        'insSector': fs_rows(s406, INS_K, sym=False).get('_', []),
        'secVal': secval,
        'val': {r['symbol']: {'d': r['trading_date'], 'pb': r.get('pb'), 'pe': r.get('pe'), 'mcap': ty(r.get('market_cap')), 'bvps': r.get('bvps')} for r in val},
    }
    # ---- trang doanh nghiệp ----
    allsym = SEC + INS
    pb = {}
    for req, rows in pick_all('ratio_daily', lambda f: f.count(',') == 0 and any(f'"{x}"' in f for x in allsym)):
        rows = [r for r in rows if r.get('pb') is not None and 'trading_date' in r]
        if len(rows) < 200:
            continue
        sym = rows[0]['symbol']; rows.sort(key=lambda r: r['trading_date'])
        if sym not in pb or len(rows) > len(pb[sym]['d']):
            pb[sym] = {'d': [r['trading_date'] for r in rows], 'pb': [r['pb'] for r in rows], 'pe': [r.get('pe') for r in rows]}
    px = {}
    for req, rows in pick_all('eod_adjust', lambda f: any(x in f for x in allsym)):
        for r in rows:
            px.setdefault(r['symbol'], {})[r['trading_date']] = r['close']
    px = {k: {'d': sorted(v), 'c': [v[d] for d in sorted(v)]} for k, v in px.items()}
    vni = {}
    for req, rows in pick_all('index_eod', lambda f: True):
        for r in rows:
            if r.get('indicator_id') == 235211 and r.get('date'):
                vni[r['date']] = r['value']
    vni = {k: vni[k] for k in sorted(vni) if k >= '2025-09-01'}
    spx = {}
    for sid in ('406', '408'):
        rows = pick('sector_price_daily', lambda f, sid=sid: f'"{sid}"' in f); rows.sort(key=lambda r: r['trading_date'])
        spx[sid] = {'d': [r['trading_date'] for r in rows], 'c': [r['close'] for r in rows]}
    notes = {}
    for ep, keys in (('fs_sec_notes', ['fn114_2', 'fn114_3', 'fn112_8', 'fn112_9', 'fn112_11', 'fn112_12', 'fn113_3']), ('fs_ins_notes', ['fn23', 'fn23_1', 'fn111_1', 'fn111_2', 'fn111_3', 'fn111_4'])):
        rows = pick(ep, lambda f: True)
        notes[ep] = {'k': keys, 'v': fs_rows(rows, keys)}
    rep = []
    for r in pick('co_reports', lambda f: 'SSI' in f):
        rep.append({'s': r['symbol'], 'org': r['source'], 'd': r['recommendation_date'], 'rec': r['recommendation'], 'tp': r.get('target_price_adjusted'),
                    'np': r.get('net_income_forecast'), 'np1': r.get('net_income_forecast_n1'), 'y': r.get('year'), 'title': r.get('report_title')})
    plans = [{'s': r['symbol'], 'y': r['year'], 'rev': r.get('planned_revenue'), 'pbt': r.get('planned_profit_before_tax'), 'pat': r.get('planned_profit_after_tax')}
             for r in pick('co_plans', lambda f: 'SSI' in f)]
    holders = [{'s': r['symbol'], 'n': r['name'], 'pct': r.get('ownership_ratio'), 'sh': r.get('shares_held'), 'd': r.get('last_update')} for r in pick('co_holders', lambda f: 'SSI' in f)]
    events = [{'s': r['symbol'], 't': r.get('event_type'), 'title': r.get('event_title'), 'ex': r.get('ex_date'), 'rec': r.get('record_date'), 'exe': r.get('execution_date'),
               'cash': r.get('cash_dividend'), 'stk': r.get('stock_dividend_ratio'), 'iss': r.get('issuance_ratio'), 'ip': r.get('issuance_price')} for r in pick('co_events', lambda f: 'SSI' in f)]
    roe = {}
    for r in pick('ratio_common_ttm', lambda f: 'SSI' in f and 'BVH' in f):
        roe.setdefault(r['symbol'], []).append([f"{r['year']}Q{r['quarter']}", r.get('roe'), r.get('roa')])
    for k in roe:
        roe[k].sort()
    insr = {}
    for r in pick('ratio_ins_ttm', lambda f: 'BVH' in f):
        insr.setdefault(r['symbol'], []).append({k: v for k, v in r.items() if k != 'symbol'})
    names = {r['symbol']: {'n': r['name_vi'], 'ex': r['exchange'], 'lst': r['listing_date'], 't': r['company_type']} for r in pick('companies', lambda f: 'SSI' in f and 'BVH' in f)}
    out.update({'pb': pb, 'px': px, 'vniD': vni, 'spx': spx, 'notes': notes, 'rep': rep, 'plans': plans, 'holders': holders, 'events': events, 'roe': roe, 'insr': insr, 'names': names})
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
    print({k: (len(v) if isinstance(v, (list, dict)) else v) for k, v in out.items()}, OUT.stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main()
