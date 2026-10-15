"""Mô phỏng điểm xếp hạng TCTD theo Thông tư 21/2025/TT-NHNN (phần định lượng) cho 26 ngân hàng niêm yết.

Kết quả xếp hạng thật là mật (Điều 24), nên đây là ƯỚC TÍNH từ BCTC hợp nhất công khai:
- ngưỡng (Điều 14), trọng số chỉ tiêu (Điều 15), trọng số tiêu chí (Điều 19), hạng (Điều 21);
- chỉ tiêu không công khai → 'missing': điểm điểm giữa = 3, khoảng điểm = 1…5;
- chỉ tiêu dùng số gần đúng → 'proxy' kèm ghi chú.
Room ngụ ý = tổng điểm × 2,6% (công thức giao room 2026: điểm xếp hạng × 2,6%).
"""
from collections import defaultdict

ROOM_COEF = 2.6          # % room / 1 điểm xếp hạng (giao room 2026)
QUAL_DEFAULT = 4.0       # điểm định tính mặc định (chuyên viên chỉnh trên trang)
PRIORITY = {'VCB', 'MBB', 'VPB', 'HDB'}   # NH nhận chuyển giao bắt buộc: được ưu tiên room cao hơn công thức

# trọng số tiêu chí: (định lượng, định tính) — % tổng điểm (Điều 19)
CRIT = {'C': ('Vốn', 15, 5), 'A': ('Chất lượng tài sản', 25, 5), 'M': ('Quản trị điều hành', 8, 7),
        'E': ('Kết quả kinh doanh', 10, 5), 'L': ('Thanh khoản', 10, 5), 'S': ('Nhạy cảm rủi ro thị trường', 2, 3)}

# chỉ tiêu: id, tiêu chí, tên, hướng ('up' = càng lớn càng tốt, 'down', 'zero'), ngưỡng lớn, ngưỡng nhỏ, trọng số lớn, trọng số nhỏ
IND = [
    ('C1', 'C', 'Tỷ lệ an toàn vốn (CAR, TT41)', 'up', (11, 9, 7, 5), (11, 9, 7, 5), 50, 50),
    ('C2', 'C', 'Tỷ lệ an toàn vốn cấp 1 (TT41)', 'up', (8.5, 7, 5.5, 4), (8.5, 7, 5.5, 4), 50, 50),
    ('A1', 'A', 'Nợ xấu + VAMC + nợ cơ cấu tiềm ẩn / tổng nợ', 'down', (2, 3, 5, 7), (2, 3, 5, 7), 35, 35),
    ('A2', 'A', 'Nợ nhóm 2 / tổng nợ', 'down', (2.5, 4, 5.5, 7), (2.5, 4, 5.5, 7), 10, 10),
    ('A3', 'A', 'Dư nợ 100 KH lớn nhất / dư nợ TCKT, cá nhân', 'down', (20, 30, 40, 50), (30, 40, 50, 60), 25, 25),
    ('A4', 'A', 'Nợ + cam kết ngoại bảng nhóm 3–5 / nhóm 1–5', 'down', (1, 2, 3, 5), (1.5, 2.5, 3.5, 7), 5, 5),
    ('A6', 'A', 'Dư nợ BĐS / tổng dư nợ', 'down', (5, 10, 15, 20), (5, 10, 15, 20), 10, 10),
    ('A7', 'A', 'Dự phòng cụ thể / nợ nhóm 2–5', 'up', (25, 20, 15, 10), (25, 20, 15, 10), 5, 5),
    ('A8', 'A', 'Tài sản Có khác bq / tổng tài sản bq', 'down', (2.5, 3.5, 5, 6), (3, 4, 5.5, 7), 10, 10),
    ('M1', 'M', 'Chi phí hoạt động / tổng thu nhập hoạt động (CIR)', 'down', (35, 45, 50, 60), (40, 50, 60, 70), 100, 100),
    ('E1', 'E', 'LNTT / VCSH bình quân', 'up', (15, 13, 10, 8), (14, 12, 8, 6), 30, 30),
    ('E2', 'E', 'LNTT / tổng tài sản bình quân', 'up', (1.5, 1.1, 0.8, 0.6), (1.3, 1.0, 0.7, 0.5), 30, 30),
    ('E3', 'E', 'NIM', 'up', (3.0, 2.5, 2.0, 1.5), (2.8, 2.4, 1.9, 1.4), 20, 20),
    ('E4', 'E', 'Số ngày lãi phải thu', 'down', (55, 70, 85, 95), (60, 75, 90, 100), 20, 20),
    ('L1', 'L', 'Tài sản thanh khoản cao bq / tổng tài sản bq', 'up', (20, 15, 9, 5), (18, 14, 8, 4), 25, 20),
    ('L2', 'L', 'Vốn ngắn hạn cho vay trung, dài hạn', 'down', (25, 30, 35, 40), (30, 35, 40, 45), 25, 30),
    ('L3', 'L', 'Dư nợ cho vay / tổng tiền gửi (LDR)', 'down', (70, 80, 90, 95), (60, 70, 80, 90), 30, 30),
    ('L4', 'L', 'Tiền gửi 10 KH lớn nhất / tổng tiền gửi', 'down', (5, 10, 13, 18), (7, 12, 15, 20), 20, 20),
    ('S1', 'S', 'Tổng trạng thái ngoại tệ / vốn tự có', 'zero', (10, 15, 20, 25), (10, 15, 20, 25), 50, 50),
    ('S2', 'S', 'Chênh lệch TS – nợ nhạy cảm lãi suất / VCSH', 'zero', (50, 65, 80, 95), (55, 70, 85, 100), 50, 50),
]
NOTE = {
    'A1': 'proxy: chỉ nợ xấu nội bảng (nhóm 3–5); chưa cộng nợ bán VAMC và nợ cơ cấu tiềm ẩn → điểm có thể cao hơn thực tế',
    'A4': 'proxy: nợ xấu nội bảng, chưa gồm cam kết ngoại bảng',
    'A6': 'proxy: cho vay "xây dựng và kinh doanh BĐS" (rộng hơn định nghĩa TT21) → điểm có thể thấp hơn thực tế',
    'L1': 'proxy: tiền mặt + tiền gửi NHNN + chứng khoán đầu tư; chưa gồm tiền gửi không kỳ hạn tại TCTD khác, lại gồm cả trái phiếu DN',
    'L3': 'LDR theo công thức TT22 (có hệ số tiền gửi KBNN)',
    'S2': 'proxy: khe hở các dải định giá lại ≤ 12 tháng / VCSH (thuyết minh rủi ro lãi suất)',
    'C1': 'CAR hợp nhất theo TT41; ngân hàng áp dụng TT14/2025 trước 2030 được cộng 1 điểm (chưa cộng)',
    'C2': 'Vốn cấp 1 hợp nhất theo TT41',
}
MISSING_WHY = {'A3': 'không công bố', 'L2': 'không công bố đều đặn', 'L4': 'không công bố', 'S1': 'không công bố'}


def score(v, direction, th):
    if v is None:
        return None
    t1, t2, t3, t4 = th
    if direction == 'up':
        return 5 if v >= t1 else 4 if v >= t2 else 3 if v >= t3 else 2 if v >= t4 else 1
    x = abs(v) if direction == 'zero' else v
    return 5 if x <= t1 else 4 if x <= t2 else 3 if x <= t3 else 2 if x <= t4 else 1


def grade(t):
    return 'A' if t >= 4.5 else 'B' if t >= 3.5 else 'C' if t >= 2.5 else 'D' if t >= 1.5 else 'E'


def build(fs_rows, note_rows, ratio_rows, car_rows, banks_panel, quarters, BANKS, GROUP):
    """fs_rows: fs_bank quý (VND); note_rows: fs_bank_notes Q2/Q4; ratio_rows: ratio_bank Q2/Q4; car_rows: bank_car_tt41."""
    fs = {(r['symbol'], r['year'], r['quarter']): r for r in fs_rows}
    nt = {(r['symbol'], r['year'], r['quarter']): r for r in note_rows}
    rb = {(r['symbol'], r['year'], r['quarter']): r for r in ratio_rows}
    car = {(r['symbol'], r['year'], r['quarter']): r for r in car_rows}
    T = lambda v: (v or 0) / 1e9   # VND → tỷ

    periods = {
        'FY2025': {'label': 'Năm 2025', 'end': (2025, 4), 'qs': [(2025, 1), (2025, 2), (2025, 3), (2025, 4)],
                   'car': [(2025, 0)]},
        'TTM2Q26': {'label': 'TTM Q2/2026', 'end': (2026, 2), 'qs': [(2025, 3), (2025, 4), (2026, 1), (2026, 2)],
                    'car': [(2026, 2), (2025, 0)]},
    }
    out = {'periods': {}, 'crit': {k: {'name': v[0], 'wq': v[1], 'wl': v[2]} for k, v in CRIT.items()},
           'ind': [{'id': i[0], 'c': i[1], 'name': i[2], 'dir': i[3], 'thL': i[4], 'thS': i[5], 'wL': i[6], 'wS': i[7],
                    'note': NOTE.get(i[0], ''), 'missing': MISSING_WHY.get(i[0], '')} for i in IND],
           'roomCoef': ROOM_COEF, 'qualDefault': QUAL_DEFAULT, 'priority': sorted(PRIORITY)}
    qidx = {q: i for i, q in enumerate(quarters)}
    for pk, P in periods.items():
        ey, eq = P['end']
        rows = []
        for s in BANKS:
            bal = [fs.get((s, y, q)) for y, q in P['qs']]
            if any(b is None for b in bal):
                continue
            avg = lambda k: sum(T(b.get(k)) for b in bal) / len(bal)
            flow = lambda k: sum(T(b.get(k)) for b in bal)
            end = fs[(s, ey, eq)]
            ta_avg = avg('bs100')
            big = ta_avg > 300000
            n = nt.get((s, ey, eq), {})
            r = rb.get((s, ey, eq), {})
            c = next((car[(s, y, q)] for y, q in P['car'] if (s, y, q) in car), None)
            loans = T(n.get('fnx25'))
            npl = T(n.get('fnx28')) + T(n.get('fnx29')) + T(n.get('fnx30'))
            g2 = T(n.get('fnx27'))
            qlab = f'Q{eq}/{ey}'
            nim = None
            if qlab in qidx:
                nim = banks_panel[s].get('nim', [None] * len(quarters))[qidx[qlab]]
            eq_avg = avg('bsx12')
            a6, a6from = None, None   # thiếu kỳ cuối → lấy kỳ gần nhất trước đó có số
            for (y2, q2) in sorted({(y, q) for (ss, y, q) in rb if ss == s and (y, q) <= (ey, eq)}, reverse=True):
                x = rb[(s, y2, q2)].get('pct_loans_construction_realestate')
                if x is not None:
                    a6, a6from = x * 100, None if (y2, q2) == (ey, eq) else f'Q{q2}/{y2}'
                    break
            v = {
                'C1': c['tt41_10'] * 100 if c and c.get('tt41_10') else None,
                'C2': c['tt41_09'] * 100 if c and c.get('tt41_09') else None,
                'A1': npl / loans * 100 if loans else None,
                'A2': g2 / loans * 100 if loans else None,
                'A3': None,
                'A4': npl / loans * 100 if loans else None,
                'A6': a6,
                'A7': T(n.get('fnx79')) / (g2 + npl) * 100 if (g2 + npl) else None,
                'A8': avg('bs210') / ta_avg * 100 if ta_avg else None,
                'M1': abs(flow('isx09')) / flow('isx08') * 100 if flow('isx08') > 0 else None,
                'E1': flow('is150') / eq_avg * 100 if eq_avg > 0 else None,
                'E2': flow('is150') / ta_avg * 100 if ta_avg else None,
                'E3': nim,
                'E4': T(end.get('bs210_2')) / flow('is220') * 365 if flow('is220') > 0 else None,
                'L1': (avg('bs110') + avg('bsx01') + avg('bs170')) / ta_avg * 100 if ta_avg else None,
                'L2': None,
                'L3': r['ldr'] * 100 if r.get('ldr') is not None else None,
                'L4': None,
                'S1': None,
                'S2': r['interest_rate_gap'] / 1e9 / T(end.get('bsx12')) * 100 if r.get('interest_rate_gap') is not None and end.get('bsx12') else None,
            }
            det, crit = {}, {}
            for (iid, ci, name, d, thL, thS, wL, wS) in IND:
                th, w = (thL, wL) if big else (thS, wS)
                sc = score(v[iid], d, th)
                det[iid] = {'v': None if v[iid] is None else round(v[iid], 2), 's': sc}
                if w == 0:
                    continue
                cc = crit.setdefault(ci, {'pt': 0, 'lo': 0, 'hi': 0, 'cov': 0, 'w': 0})
                cc['w'] += w
                if sc is None:
                    cc['pt'] += 3 * w; cc['lo'] += 1 * w; cc['hi'] += 5 * w
                else:
                    cc['pt'] += sc * w; cc['lo'] += sc * w; cc['hi'] += sc * w; cc['cov'] += w
            for ci, cc in crit.items():
                for k in ('pt', 'lo', 'hi'):
                    cc[k] = round(cc[k] / cc['w'], 3)
                cc['cov'] = round(cc['cov'] / cc['w'] * 100)
            quant = {k: round(sum(crit[c][k] * CRIT[c][1] for c in CRIT) / 100, 3) for k in ('pt', 'lo', 'hi')}
            covW = sum(crit[c]['cov'] * CRIT[c][1] for c in CRIT) / sum(CRIT[c][1] for c in CRIT)
            cr = banks_panel[s].get('credit', [])
            def credit_at(lbl):
                return cr[qidx[lbl]] if lbl in qidx and qidx[lbl] < len(cr) else None
            c_end, c_ye = credit_at(qlab), credit_at(f'Q4/{ey - 1}' if eq != 4 else f'Q4/{ey - 1}')
            c_ly = credit_at(f'Q{eq}/{ey - 1}')
            total = round(quant['pt'] + 0.30 * QUAL_DEFAULT, 2)
            rows.append({'s': s, 'group': GROUP[s], 'big': big, 'taAvg': round(ta_avg), 'v': det, 'crit': crit, 'quant': quant,
                         'total': total, 'grade': grade(total), 'room': round(total * ROOM_COEF, 1),
                         'cov': round(covW), 'a6From': a6from, 'carPeriod': None if not c else ('H1/2026' if c is car.get((s, 2026, 2)) else 'Năm 2025'),
                         'creditYtd': round((c_end / c_ye - 1) * 100, 2) if c_end and c_ye else None,
                         'creditYoY': round((c_end / c_ly - 1) * 100, 2) if c_end and c_ly else None,
                         'priority': s in PRIORITY})
        out['periods'][pk] = {'label': P['label'], 'rows': rows}
    return out
