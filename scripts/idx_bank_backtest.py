"""Kiểm định khung bốn kịch bản (IDX-FX × IDX-LIQ) với giá cổ phiếu và lợi nhuận ngành ngân hàng → data/backfill/idx_bank_bt.json.

Giả thuyết của khung: Nới lỏng mạnh, Dư địa bơm tiền → cổ phiếu ngân hàng tăng; NHNN hút tiền về, Thắt chặt kéo dài → giảm.
  - Giá: lợi nhuận chỉ số giá ngành Ngân hàng 3 và 6 tháng sau tháng tín hiệu; vượt trội = so với VN-Index.
  - Lợi nhuận: tăng trưởng LNST 4 quý (26 ngân hàng) trong 2 quý sau quý tín hiệu, so với trung vị toàn mẫu.
  - Đúng hướng: dấu kỳ vọng của ô × kết quả > 0. Mốc so sánh: luôn đoán "tăng".
Các cửa sổ chồng lên nhau theo tháng nên số quan sát độc lập ít hơn nhiều (6 tháng ≈ 11 cửa sổ độc lập từ 2021).
"""
import json, statistics as st
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SIGN = {'ease': 1, 'room': 1, 'drain': -1, 'tight': -1}


def addm(m, k):
    y, mm = int(m[:4]), int(m[5:]); t = y * 12 + mm - 1 + k
    return f'{t // 12}-{t % 12 + 1:02d}'


def main():
    D = json.loads((ROOT / 'data/sector-data.json').read_text(encoding='utf-8'))
    H = D['idx']['history']
    B = json.loads((ROOT / 'data/backfill/bank_index.json').read_text(encoding='utf-8'))['m']
    vn = {}
    for p in json.loads((ROOT / 'data/ctg-data.json').read_text(encoding='utf-8'))['price']['series']:
        if 'v' in p:
            vn[p['d'][:7]] = p['v']   # phiên cuối tháng (chuỗi tăng dần)
    P = D['ppopSector']; npq = dict(zip(P['q'], P['npat']))
    qof = lambda m: f'Q{(int(m[5:]) - 1) // 3 + 1}/{m[:4]}'
    def addq(q, k):
        n, y = int(q[1]), int(q[3:]); t = y * 4 + n - 1 + k
        return f'Q{t % 4 + 1}/{t // 4}'
    out = {'from': H[0]['m'], 'to': H[-1]['m'], 'price': {}, 'earn': {}}
    for h in (3, 6):
        rows = []
        for x in H:
            m, m2 = x['m'], addm(x['m'], h)
            if m in B and m2 in B:
                ex = ((B[m2] / B[m]) / (vn[m2] / vn[m]) - 1) * 100 if m in vn and m2 in vn else None
                rows.append((x['q'], (B[m2] / B[m] - 1) * 100, ex))
        byq = {}
        for q in SIGN:
            r = [a for qq, a, _ in rows if qq == q]; e = [b for qq, _, b in rows if qq == q and b is not None]
            byq[q] = {'n': len(r), 'mean': round(st.mean(r), 1) if r else None, 'pos': round(100 * sum(a > 0 for a in r) / len(r)) if r else None,
                      'nx': len(e), 'ex': round(st.mean(e), 1) if e else None}
        rx = [(q, b) for q, _, b in rows if b is not None]
        out['price'][f'h{h}'] = {'n': len(rows), 'byq': byq,
                                 'hit': round(100 * sum(1 for q, a, _ in rows if SIGN[q] * a > 0) / len(rows)),
                                 'base': round(100 * sum(1 for _, a, _ in rows if a > 0) / len(rows)),
                                 'hitX': round(100 * sum(1 for q, b in rx if SIGN[q] * b > 0) / len(rx)),
                                 'baseX': round(100 * sum(1 for _, b in rx if b > 0) / len(rx)), 'nX': len(rx)}
    er = []
    for x in H:
        q = qof(x['m']); q2 = addq(q, 2)
        if q in npq and q2 in npq:
            er.append((x['q'], (npq[q2] / npq[q] - 1) * 100))
    med = st.median([r for _, r in er])
    out['earn'] = {'n': len(er), 'median': round(med, 1), 'hit': round(100 * sum(1 for q, r in er if SIGN[q] * (r - med) > 0) / len(er)),
                   'byq': {q: {'n': len([r for qq, r in er if qq == q]), 'mean': round(st.mean([r for qq, r in er if qq == q]), 1)} for q in SIGN if any(qq == q for qq, _ in er)}}
    (ROOT / 'data/backfill/idx_bank_bt.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(json.dumps(out, ensure_ascii=False))


if __name__ == '__main__':
    main()
