#!/usr/bin/env python3
"""Gộp chuỗi quý dài hạn của các ngân hàng có trang riêng (Big 4: VCB, BID, CTG; tư nhân lớn: TCB, MBB, ACB) cho tab So sánh nhóm nhiều kỳ.

Đọc data/<mã>-data.json (sinh bởi build_ctg_data.py --ticker) → data/big3-data.js (window.BIG3).
Chạy sau khi đã dựng cả ba ngân hàng.
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
TICKERS = ['VCB', 'BID', 'CTG', 'TCB', 'MBB', 'ACB', 'STB']
GROUP = {'VCB': 'Big 4', 'BID': 'Big 4', 'CTG': 'Big 4', 'TCB': 'Tư nhân lớn', 'MBB': 'Tư nhân lớn', 'ACB': 'Tư nhân lớn', 'STB': 'Tư nhân vừa'}
KEYS = ['nim', 'yea', 'cof', 'cir', 'casa', 'npl', 'g2', 'llr', 'ldr', 'creditYoY', 'fundingYoY', 'roe', 'roa', 'nfiShare',
        'pb', 'pe', 'creditCost', 'nplFormationRate', 'accruedToTA', 'llrInclAccrued', 'nimAdj']


def qkey(q):
    n, y = q[1:].split('/')
    return int(y) * 10 + int(n)


def main():
    banks, allq = {}, set()
    for t in TICKERS:
        D = json.loads((ROOT / f'data/{t.lower()}-data.json').read_text(encoding='utf-8'))
        banks[t] = {q['q']: q for q in D['quarterly']}
        allq |= set(banks[t])
        banks[t]['_car'] = D['car']
    qs = sorted(allq, key=qkey)
    out = {'quarters': qs, 'series': {}, 'car': {}, 'group': {t: GROUP[t] for t in TICKERS}, 'note': 'Chuỗi quý từ BCTC hợp nhất qua Wi MCP; NIM, YEA, COF, CIR, ROE, ROA là TTM; chi phí tín dụng, hình thành nợ xấu, NIM sau dự phòng là số tự tính.'}
    for t in TICKERS:
        out['series'][t] = {k: [banks[t].get(q, {}).get(k) for q in qs] for k in KEYS}
        out['car'][t] = [{'period': c['period'], 'car': c['car'], 'tier1': c['tier1']} for c in banks[t]['_car']]
    js = '// Sinh tự động bởi scripts/build_big3.py — KHÔNG sửa tay.\nwindow.BIG3 = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
    (ROOT / 'data/big3-data.js').write_text(js, encoding='utf-8')
    print(f'wrote data/big3-data.js ({len(js) // 1024} KB, {qs[0]}–{qs[-1]})')


if __name__ == '__main__':
    main()
