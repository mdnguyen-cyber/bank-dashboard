"""Kiểm tra dữ liệu dashboard ngành: chỉ số tổng hợp, consensus, LDR độ nhạy khớp công thức và số gốc.
Chạy: python3 tests/test_sector_data.py"""
import json, pathlib, statistics, math

ROOT = pathlib.Path(__file__).resolve().parents[1]
D = json.loads((ROOT / 'data/sector-data.json').read_text(encoding='utf-8'))


def test_idx_is_mean_of_contributions():
    I = D['idx']
    for comp, key in ((I['fxComp'], 'fx'), (I['liqComp'], 'liq')):
        c = [x['contrib'] for x in comp if x['contrib'] is not None]
        assert abs(statistics.mean(c) - I['now'][key]) < 0.02, key


def test_quadrant_matches_signs():
    q = {(False, True): 'ease', (True, True): 'drain', (False, False): 'room', (True, False): 'tight'}
    for h in D['idx']['history']:
        assert h['q'] == q[(h['fx'] >= 0, h['liq'] >= 0)], h


def test_backtest_counts():
    for k in ('h3', 'h6'):
        b = D['idx']['backtest'][k]
        assert b['hit'] + b['miss'] + b['flat'] == len(b['rows'])
        assert abs(b['rate'] - b['hit'] / (b['hit'] + b['miss']) * 100) < 1


def test_consensus_median_and_upside():
    rows = {r['s']: r for r in D['latest']['rows']}
    for c in D['consensus']['rows']:
        tps = [p['tp'] for p in c['reports'] if p['tp']]
        if tps:
            assert c['tpMed'] == round(statistics.median(tps))
            assert abs(c['upside'] - (statistics.median(tps) / rows[c['s']]['price'] - 1) * 100) < 0.2
        assert len({p['src'] for p in c['reports']}) == len(c['reports'])  # mỗi CTCK một báo cáo


def test_ldr_sensitivity_formula():
    for r in D['ldrSens']['rows']:
        if r['kbnn'] < 1000:
            assert abs(r['ldr0'] - r['ldr50']) < 0.1
        else:
            assert r['ldr0'] > r['ldr20'] > r['ldr50']


def test_sector_valuation_now_matches_wi():
    assert abs(D['secVal']['now']['pb'] - 1.42) < 0.01 and abs(D['secVal']['now']['pe'] - 8.45) < 0.01


def test_no_nan():
    txt = (ROOT / 'data/sector-data.json').read_text(encoding='utf-8')
    assert 'NaN' not in txt and 'Infinity' not in txt



def test_sbv_log_has_sources():
    tools = {'Lãi suất điều hành', 'OMO · tín phiếu', 'Tỷ giá', 'Tín dụng', 'Quy định', 'Chỉ đạo · khác', 'Thị trường'}
    E = D['sbv']['events']
    assert len(E) >= 40 and [e['d'] for e in E] == sorted((e['d'] for e in E), reverse=True)
    for e in E:
        assert e['tool'] in tools and e['dir'] in ('nới', 'thắt', 'trung tính'), e['t']
        assert e['url'].startswith('http') and e['src'] and e['impact'], e['t']
        assert 'widata' not in (e['src'] + e['url']).lower(), e['t']
    cur = {c['k']: c for c in D['sbv']['current']}
    assert cur['Tái cấp vốn']['v'].startswith('4,5%')
    assert not any(r.get('flag') for r in D['reg'])


if __name__ == '__main__':
    for k, f in list(globals().items()):
        if k.startswith('test_'):
            f(); print('ok', k)
