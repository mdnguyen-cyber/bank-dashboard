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


def main():
    fs_sec = table(json.loads((RAW / 'fin' / 'fs_sec.json').read_text()))
    fs_ins = pick('fs_ins', lambda f: 'BVH' in f)
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
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
    print({k: (len(v) if isinstance(v, (list, dict)) else v) for k, v in out.items()}, OUT.stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main()
