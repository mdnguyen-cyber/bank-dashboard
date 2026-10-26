#!/usr/bin/env python3
"""Dữ liệu tab Vĩ mô › Việt Nam › Kinh tế → data/eco-data.js (window.ECO_DATA).
Nguồn tự động: dulieukinhte.com (data/vn/dlkt.json — Cục Thống kê, S&P Global): PMI, IIP, bán lẻ, xuất nhập khẩu theo khu vực, GDP quý.
Bù kỳ: data/backfill/eco_wi.json (CPI theo nhóm, lạm phát cơ bản, FDI, vốn ngân sách — tạo bởi scripts/eco_backfill.py).
CPI của dulieukinhte đổi kỳ gốc từ 11/2025 nên chỉ tự tính YoY khi cả hai tháng cùng kỳ gốc; còn lại dùng số bù."""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
J = lambda p: json.loads((ROOT / p).read_text(encoding='utf-8')) if (ROOT / p).exists() else {}
FROM = '2019-01'
REBASE = '2025-11'


def months(a, b):
    y, m = map(int, a.split('-')); Y, M = map(int, b.split('-')); out = []
    while (y, m) <= (Y, M):
        out.append(f'{y}-{m:02d}'); m += 1
        if m > 12: m, y = 1, y + 1  # noqa: E701
    return out


def ly(k):
    return f'{int(k[:4]) - 1}{k[4:]}'


def main():
    DL = (J('data/vn/dlkt.json') or {}).get('pages', {})
    BF = J('data/backfill/eco_wi.json') or {}
    B = BF.get('s', {})

    def row(slug, name):
        for r in DL.get(slug, {}).values():
            if r['n'] == name:
                return {d[:7]: v for d, v in zip(r['d'], r['v'])}
        return {}

    def yoy(lv):
        return {k: round((v / lv[ly(k)] - 1) * 100, 2) for k, v in lv.items() if lv.get(ly(k))}

    S = {}
    # sản xuất
    S['pmi'] = row('pmi-271', 'PMI')
    for k, n in [('iip', 'Toàn ngành công nghiệp'), ('iip_min', 'Khai khoáng'), ('iip_mfg', 'Công nghiệp chế biến, chế tạo'),
                 ('iip_elec', 'Sản xuất và phân phối điện'), ('iip_water', 'Cung cấp nước, hoạt động quản lý và xử lý rác thải, nước thải')]:
        S[k] = row('iip-277', n)
    if not S['iip_elec']:   # tên dòng khác nhau giữa các kỳ: dò theo từ khoá
        for r in DL.get('iip-277', {}).values():
            if r['n'].startswith('Sản xuất') and 'điện' in r['n'] and 'phân phối' in r['n']: S['iip_elec'] = {d[:7]: v for d, v in zip(r['d'], r['v'])}
    if not S['iip_water']:
        for r in DL.get('iip-277', {}).values():
            if r['n'].startswith('Cung cấp nước'): S['iip_water'] = {d[:7]: v for d, v in zip(r['d'], r['v'])}
    # IIP ngành cấp 2 của chế biến, chế tạo: mới nhất, tháng trước, bình quân 12 tháng
    skip = {'Toàn ngành công nghiệp', 'Khai khoáng', 'Công nghiệp chế biến, chế tạo'}
    sub = []
    for r in DL.get('iip-277', {}).values():
        if r['n'] in skip or not r['v'] or r['n'].startswith('Cung cấp nước') or ('điện' in r['n'] and 'phân phối' in r['n']): continue  # noqa: E701
        if r['n'].startswith('Khai thác') or r['n'].startswith('Hoạt động dịch vụ hỗ trợ khai thác') or r['n'] == 'Khai khoáng khác': continue  # noqa: E701
        if r['n'].startswith(('Thoát nước', 'Thu gom', 'Khai thác, xử lý')): continue  # noqa: E701
        d = {a[:7]: b for a, b in zip(r['d'], r['v'])}; ks = sorted(d)
        if not ks: continue  # noqa: E701
        last = ks[-1]; l12 = [d[k] for k in ks[-12:]]
        sub.append([r['n'], last, d[last], d.get(ks[-2]) if len(ks) > 1 else None, round(sum(l12) / len(l12), 2)])
    # tiêu dùng
    RET = {'ret': 'Tổng mức bán lẻ HH và DV', 'ret_goods': 'Bán lẻ hàng hoá', 'ret_accom': 'Dịch vụ lưu trữ, ăn uống', 'ret_travel': 'Du lịch lữ hành', 'ret_oth': 'Dịch vụ khác'}
    for k, n in RET.items():
        lv = row('ban-le-hang-hoa-va-dich-vu-273', n); S[k + '_lv'] = {m: round(v / 1000, 1) for m, v in lv.items()}; S[k] = yoy(lv)
    # CPI: tự tính từ chỉ số khi cùng kỳ gốc, còn lại dùng số bù
    CPI = {'cpi': 'CPI', 'cpi_food': 'Hàng ăn và dịch vụ ăn uống', 'cpi_bev': 'Đồ uống và thuốc lá', 'cpi_cloth': 'May mặc, mũ nón, giầy dép', 'cpi_house': 'Nhà ở và vật liệu xây dựng',
           'cpi_equip': 'Thiết bị và đồ dùng gia đình', 'cpi_health': 'Thuốc và dịch vụ y tế', 'cpi_trans': 'Giao thông', 'cpi_post': 'Bưu chính viễn thông', 'cpi_edu': 'Giáo dục',
           'cpi_cult': 'Văn hoá, giải trí và du lịch', 'cpi_other': 'Hàng hoá và dịch vụ khác'}
    for k, n in CPI.items():
        ix = row('chi-so-gia-tieu-dung-cpi-272', n)
        calc = {m: round((v / ix[ly(m)] - 1) * 100, 2) for m, v in ix.items() if ix.get(ly(m)) and (m < REBASE) == (ly(m) < REBASE)}
        S[k] = dict(B.get(k, {})); S[k].update({m: v for m, v in calc.items() if m not in S[k] or m >= REBASE})
    S['cpi_core'] = dict(B.get('cpi_core', {}))
    # thương mại (triệu USD → tỷ USD)
    for k, slug in [('xk', 'tong-xuat-khau-292'), ('nk', 'tong-nhap-khau-293')]:
        for sk, n in [('', 'Tổng'), ('_dom', 'Khu vực trong nước'), ('_fdi', 'Khu vực trong FDI')]:
            lv = row(slug, n); S[k + sk + '_lv'] = {m: round(v / 1000, 3) for m, v in lv.items()}; S[k + sk] = yoy(lv)
    for sk in ['', '_dom', '_fdi']:
        a, b = S['xk' + sk + '_lv'], S['nk' + sk + '_lv']
        S['tb' + sk] = {m: round(a[m] - b[m], 3) for m in a if m in b}
        ms = sorted(S['tb' + sk]); S['tb' + sk + '_ttm'] = {m: round(sum(S['tb' + sk][x] for x in ms[i - 11:i + 1]), 2) for i, m in enumerate(ms) if i >= 11 and months(ms[i - 11], m) == ms[i - 11:i + 1]}
    # FDI, vốn ngân sách (bù kỳ)
    for k in ['fdi_real', 'fdi_reg', 'fdi_real_yoy', 'fdi_reg_yoy', 'fdi_real_ytd', 'fdi_reg_ytd', 'fdi_real_ytd_yoy', 'fdi_reg_ytd_yoy', 'pub', 'pub_yoy', 'pub_ytd', 'pub_ytd_yoy']:
        S[k] = dict(B.get(k, {}))
    for k in ['fdi_real', 'fdi_reg']:
        S[k] = {m: round(v / 1000, 3) for m, v in S[k].items()}
        S[k + '_ytd'] = {m: round(v / 1000, 3) for m, v in S[k + '_ytd'].items()}
    for k in ['pub', 'pub_ytd']:
        S[k] = {m: round(v / 1000, 2) for m, v in S[k].items()}   # nghìn tỷ đồng
    # GDP quý (YoY) theo khu vực, từ chuỗi giá so sánh
    G = {'gdp': 'GDP theo giá so sánh', 'gdp_agri': 'Nông nghiệp, lâm nghiệp và thủy sản', 'gdp_ind': 'Công nghiệp và xây dựng', 'gdp_mfg': 'Công nghiệp chế biến, chế tạo',
         'gdp_con': 'Xây dựng', 'gdp_svc': 'Dịch vụ'}
    Q = {}
    for k, n in G.items():
        Q[k] = yoy(row('gdp-so-sanh-theo-quy-269', n))
    Q['gdp'].update(B.get('gdp_q', {}))   # số công bố chính thức ưu tiên; tự tính chỉ cho quý mới hơn
    last = max(max(v) for v in S.values() if v)
    M = months(FROM, last)
    al = lambda d: [d.get(m) for m in M]
    qs = sorted({m for v in Q.values() for m in v if m >= FROM})
    out = {'upd': datetime.now(timezone.utc).strftime('%Y-%m-%d'), 'm': M, 's': {k: al(v) for k, v in S.items()},
           'q': qs, 'gq': {k: [v.get(m) for m in qs] for k, v in Q.items()}, 'iipSub': sorted(sub, key=lambda r: -(r[2] or -99)),
           'fc': BF.get('cpiFc'), 'bankIdx': (J('data/backfill/bank_index.json') or {}).get('m'), 'credY': {m: v for m, v in B.get('credit_yoy', {}).items() if m >= '2011'}, 'dlkt': (J('data/vn/dlkt.json') or {}).get('fetched')}
    (ROOT / 'data/eco-data.js').write_text('window.ECO_DATA=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    print('eco:', len(M), 'tháng đến', last, '·', len(qs), 'quý ·', {k: max(v) if v else None for k, v in S.items() if k in ('pmi', 'iip', 'ret', 'cpi', 'xk', 'fdi_real', 'pub')})


if __name__ == '__main__':
    main()
