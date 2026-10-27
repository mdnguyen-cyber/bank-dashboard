"""Ước tính tỷ lệ an toàn thanh khoản theo TT 22/2019 cho 26 ngân hàng niêm yết → data/backfill/reg_ratios.json.

Nguồn: Wi MCP fs_bank, fs_bank_notes, bank_liquidity_risk (số hợp nhất; tỷ lệ NHNN giám sát trên số riêng lẻ nên có sai số).
  LDR (Điều 20 TT 22, sửa đổi bởi TT 26/2022, TT 09/2024, TT 25/2026):
    L = cho vay khách hàng − cho vay bằng vốn tài trợ, ủy thác
    D = tiền gửi khách hàng − tiền gửi vốn chuyên dùng − tiền gửi ký quỹ + hệ số × tiền gửi có kỳ hạn của Kho bạc
        + giấy tờ có giá phát hành + tiền gửi và vay các TCTD khác
    Biến thể chọn theo sai số với số ngân hàng tự công bố (A: không cộng liên ngân hàng; B: cộng tiền gửi TCTD; C: cộng cả tiền vay TCTD).
    C khớp nhất (lệch trung bình ~1,6 điểm %, 21/24 quan sát trong ±3 điểm %; lệch lớn ở VPB do hợp nhất FE Credit).
  Tỷ lệ vốn ngắn hạn ước tính từ thuyết minh kỳ hạn còn lại lệch 7–12 điểm % → chỉ dùng số ngân hàng tự công bố.
  Vốn ngắn hạn cho vay trung dài hạn (Điều 23), theo thời hạn còn lại (thuyết minh rủi ro thanh khoản):
    (cho vay còn hạn trên 1 năm − nguồn vốn còn hạn trên 1 năm) / nguồn vốn còn hạn đến 1 năm
  LDR thô = cho vay khách hàng / tiền gửi khách hàng.
Số ngân hàng tự công bố (báo cáo thường niên, nghị quyết phát hành trái phiếu, bản tin IR) ở data/backfill/self_ratios.json
dùng để đo sai số của ước tính.
"""
import json, statistics, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from build_ctg_data import load_raw, rows, flt  # noqa: E402

BANKS = 'VCB,BID,CTG,MBB,TCB,ACB,VPB,HDB,LPB,SHB,STB,VIB,TPB,MSB,SSB,OCB,EIB,NAB,ABB,KLB,VAB,BVB,BAB,PGB,SGB,NVB'.split(',')
KB = {(2025, 4): 0.0, (2026, 2): 0.2}   # hệ số tiền gửi có kỳ hạn KBNN tính vào D tại thời điểm (TT 25/2026: 20% từ Q2/2026, 50% từ Q3/2026)


def table(raw, endpoint, need):
    out = {}
    for d in raw:
        rq = d['request']
        if d['tool'] == 'wi_data_companies' and rq.get('endpoint_name') == endpoint and need in rq.get('columns', '') and \
                flt(rq).get('symbol', '').count(',') >= 10:
            for r in rows(d['response']):
                k = (r.get('symbol'), r.get('year'), r.get('quarter')) + ((r['maturity_bucket'],) if 'maturity_bucket' in r else ())
                out[k] = r
    return out


def compute(raw):
    fs, nt, lq = table(raw, 'fs_bank', 'bs320_1'), table(raw, 'fs_bank_notes', 'fnx115'), table(raw, 'bank_liquidity_risk', 'lr_16')
    res = {}
    for (y, q), kb in KB.items():
        for s in BANKS:
            f, n = fs.get((s, y, q)), nt.get((s, y, q))
            if not f or not n:
                continue
            g = lambda d, k: d.get(k) or 0
            L = g(f, 'bs160_1') - g(n, 'fnx19')
            dep = g(f, 'bs330') - g(n, 'fnx114') - g(n, 'fnx115') + kb * g(n, 'fnx109')
            v = {'raw': g(f, 'bs160_1') / g(f, 'bs330') * 100,
                 'A': L / (dep + g(f, 'bs360')) * 100,
                 'B': L / (dep + g(f, 'bs360') + g(f, 'bs320_1')) * 100,
                 'C': L / (dep + g(f, 'bs360') + g(f, 'bs320_1') + g(f, 'bs320_2')) * 100}
            B = {b: lq.get((s, y, q, b)) for b in ['Trong hạn - Đến 1 tháng', 'Trong hạn - Từ 1 đến 3 tháng', 'Trong hạn - Từ 3 đến 12 tháng', 'Trong hạn - Từ 1 đến 5 năm', 'Trong hạn - Trên 5 năm']}
            if all(B.values()) and not (s == 'CTG' and (y, q) == (2026, 2)):   # CTG Q2/2026: bảng thuyết minh trùng số VCB
                sh, lo = [B[k] for k in list(B)[:3]], [B[k] for k in list(B)[3:]]
                ln = sum(g(r, 'lr_06') for r in lo)
                for var, cols in (('S1', ['lr_13', 'lr_16']), ('S2', ['lr_13', 'lr_16', 'lr_12'])):
                    fl = sum(g(r, c) for r in lo for c in cols); fs_ = sum(g(r, c) for r in sh for c in cols)
                    v[var] = (ln - fl) / fs_ * 100 if fs_ else None
            res.setdefault(f'{y}Q{q}', {})[s] = {k: (round(x, 2) if x is not None else None) for k, x in v.items()}
    return res


def main():
    raw = load_raw(ROOT / 'data/raw/wi')
    R = compute(raw)
    sp = ROOT / 'data/backfill/self_ratios.json'
    S = json.loads(sp.read_text(encoding='utf-8')) if sp.exists() else {}
    # sai số so với số tự công bố tại 31/12/2025
    err = {}
    QE = {'2025-12-31': '2025Q4', '2026-06-30': '2026Q2'}
    def obs(key):   # (kỳ, mã, số tự công bố) ở đúng kỳ có ước tính
        for s_, f in S.items():
            for x in (f, f.get('prev') or {}):
                if x.get('asof') in QE and x.get(key) is not None:
                    yield QE[x['asof']], s_, x[key]
    for var, key in (('raw', 'ldr'), ('A', 'ldr'), ('B', 'ldr'), ('C', 'ldr'), ('S1', 'sflr'), ('S2', 'sflr')):
        d = [R[p][s_][var] - v for p, s_, v in obs(key) if R.get(p, {}).get(s_, {}).get(var) is not None]
        if d:
            a = sorted(abs(x) for x in d)
            err[var] = {'n': len(d), 'mae': round(statistics.mean(a), 2), 'bias': round(statistics.mean(d), 2), 'p80': round(a[int(0.8 * (len(a) - 1))], 2),
                        'w3': sum(1 for x in a if x <= 3)}
    print(json.dumps(err, ensure_ascii=False, indent=1))
    lv = min((v for v in ('A', 'B', 'C') if v in err), key=lambda v: err[v]['mae'], default='B')
    sv = min((v for v in ('S1', 'S2') if v in err), key=lambda v: err[v]['mae'], default='S1')
    group = json.loads((ROOT / 'data/sector-data.json').read_text(encoding='utf-8'))['meta']['groups']
    per = sorted(R, reverse=True)   # 2026Q2, 2025Q4
    qend = {k: {'2026Q2': '2026-06-30', '2025Q4': '2025-12-31'}[k] for k in per}
    out_rows = []
    for s_ in BANKS:
        f = S.get(s_) or {}
        out_rows.append({'s': s_, 'group': group.get(s_),
                         'ldr': {k: R[k].get(s_, {}).get(lv) for k in per}, 'raw': {k: R[k].get(s_, {}).get('raw') for k in per},
                         'sflr': {k: R[k].get(s_, {}).get(sv) for k in per},
                         'self': {x: f.get(x) for x in ('asof', 'ldr', 'sflr', 'reserve', 'pay30', 'lcr', 'nsfr', 'src', 'note')} if f.get('src') else None,
                         'selfPrev': f.get('prev')})
    agg = {}
    for k in per:   # toàn nhóm: trung vị có trọng số xấp xỉ bằng bình quân các ngân hàng
        xs = [R[k][b] for b in BANKS if b in R[k]]
        agg[k] = {m: round(statistics.median([x[m] for x in xs if x.get(m) is not None]), 1) for m in ('raw', lv, sv)}
        agg[k] = {'raw': agg[k]['raw'], 'ldr': agg[k][lv], 'sflr': agg[k][sv]}
    js = {'q': per[0], 'qPrev': per[1], 'qLbl': 'Q2/2026', 'qEnd': qend, 'var': {'ldr': lv, 'sflr': sv},
          'periods': [{'k': '2026Q2', 'l': '30/06/2026'}, {'k': '2025Q4', 'l': '31/12/2025 (đối chiếu số công bố)'}],
          'err': {'ldr': err.get(lv), 'sflr': err.get(sv), 'all': err}, 'agg': agg, 'rows': out_rows}
    (ROOT / 'data/backfill/reg_ratios.json').write_text(json.dumps(js, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('variant', lv, sv, 'agg', agg)
    return R, S, err


if __name__ == '__main__':
    main()
