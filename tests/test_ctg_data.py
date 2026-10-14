"""Kiểm tra dữ liệu dựng ra khớp số gốc WiData và các phép tự tính nhất quán.
Chạy: python3 -m pytest tests/ (hoặc python3 tests/test_ctg_data.py)"""
import json, pathlib, statistics

ROOT = pathlib.Path(__file__).resolve().parents[1]
D = json.loads((ROOT / 'data/ctg-data.json').read_text(encoding='utf-8'))
Q = D['quarterly']


def test_balance_sheet_adds_up():
    for q in Q:
        assets = q['cash'] + q['interbankA'] + q['secs'] + q['loansNet']
        assert assets <= q['ta'] + 1, q['q']
        liab = q['deposits'] + q['interbankL'] + q['papers'] + q['govSbv'] + q['otherL'] + q['equity']
        assert abs(liab - q['ta']) / q['ta'] < 0.001, (q['q'], liab, q['ta'])


def test_quarters_sum_to_annual():
    for a in D['annual']:
        qs = [q for q in Q if q['year'] == a['y']]
        if len(qs) == 4:
            assert abs(sum(q['pbt'] for q in qs) - a['pbt']) < 1, a['y']
            assert abs(sum(q['toi'] for q in qs) - a['toi']) < 1, a['y']


def test_plan_ytd():
    P = D['plan']
    ytd = [q for q in Q if q['year'] == P['year']]
    assert abs(sum(q['pbt'] for q in ytd) - P['pbtYTD']) < 0.2
    assert abs(P['pbtDone'] - P['pbtYTD'] / P['pbt'] * 100) < 0.1


def test_snapshot_ratios_match_quarter():
    m, q = D['meta'], Q[-1]
    assert abs(m['nim'] - q['nim']) < 0.01 and abs(m['llr'] - q['llr']) < 0.1 and abs(m['npl'] - q['npl']) < 0.01


def test_consensus_excludes_stale():
    c = D['consensus']
    fresh = [r['tp'] for r in c['rows'] if not r['stale']]
    assert c['summary']['median'] == statistics.median(fresh)
    assert all(r['date'] >= c['fadeBefore'] for r in c['rows'] if not r['stale'])


def test_npl_formation_formula():
    q, p = Q[-1], Q[-2]
    wo = -p['llp'] - q['prov'] + q['llp']
    assert abs(q['nplFormation'] - (q['nplAmt'] - p['nplAmt'] + wo)) < 0.2


def test_no_personal_data_in_build():
    txt = (ROOT / 'data/ctg-data.json').read_text(encoding='utf-8')
    for bad in ['CMND', 'CCCD', 'Cư trú', 'Điện thoại']:
        assert bad not in txt


if __name__ == '__main__':
    for k, f in list(globals().items()):
        if k.startswith('test_'):
            f(); print('ok', k)
