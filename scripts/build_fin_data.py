#!/usr/bin/env python3
"""Dựng data/fin-data.js cho trang Ngành tài chính khác (bảo hiểm, chứng khoán).

Đầu vào (đều đã commit): data/backfill/ins_market.json (thị trường bảo hiểm, nguồn từng dòng: Bộ Tài chính, IAV, GSO, báo chí),
data/backfill/fin_wi.json (BCTC, định giá từ Wi MCP), data/backfill/vnindex_m.json.
"""
import json, pathlib, datetime as dt

ROOT = pathlib.Path(__file__).resolve().parent.parent
B = ROOT / 'data' / 'backfill'

# tên hiển thị theo loại nguồn trong bộ dữ liệu
SRC_T = {
    'MOF - Niên giám/Báo cáo năm (chính thức)': 'Bộ Tài chính – Niên giám Thị trường bảo hiểm Việt Nam',
    'MOF - Bản tin/Tổng quan (Cục QLGSBH)': 'Bộ Tài chính – Bản tin thị trường bảo hiểm (Cục QLGSBH)',
    'IAV - Hiệp hội Bảo hiểm VN': 'Hiệp hội Bảo hiểm Việt Nam (IAV)',
    'Tổng cục Thống kê (GSO)': 'Tổng cục Thống kê (GSO)',
}
RANK = {'MOF - Niên giám/Báo cáo năm (chính thức)': 1, 'MOF - Bản tin/Tổng quan (Cục QLGSBH)': 2, 'IAV - Hiệp hội Bảo hiểm VN': 3,
        'Báo chí dẫn Bộ Tài chính/Cục QLGSBH': 3.5, 'Tổng cục Thống kê (GSO)': 4, 'Báo chí/khác': 5, 'DN tự công bố': 6}


def press_name(n):
    """Tên báo từ tên bài: bỏ phần mô tả trong ngoặc / sau gạch."""
    n = (n or '').strip()
    for sep in [' (', ' - ', ' – ', ' dẫn ', ' theo ']:
        if sep in n:
            n = n.split(sep)[0]
    return ALIAS.get(n.lower(), n)


ALIAS = {'thời báo tài chính vn': 'Thời báo Tài chính Việt Nam', 'tinnhanhchungkhoan': 'Tin nhanh chứng khoán',
         'nhịp cầu đầu tư': 'Nhịp cầu Đầu tư', 'vietnambiz': 'VietnamBiz', 'kinh tế chứng khoán vn': 'Kinh tế Chứng khoán Việt Nam'}


def main():
    ins = json.loads((B / 'ins_market.json').read_text())
    src = ins['src']
    labels = []
    for s in src:
        t = s.get('t') or ''
        if t in SRC_T:
            lab = SRC_T[t]
        elif t == 'Báo chí dẫn Bộ Tài chính/Cục QLGSBH':
            lab = f"{press_name(s['n'])} (dẫn Bộ Tài chính)"
        elif t == 'DN tự công bố':
            lab = f"{press_name(s['n'])} (doanh nghiệp công bố)"
        else:
            lab = press_name(s['n'])
        labels.append(lab)
    # mỗi nguồn: [nhãn hiển thị, tên bài/bản tin, link, ngày đăng, hạng]
    S = [[labels[i], s['n'], s['u'], s['d'], RANK.get(s.get('t'), 9)] for i, s in enumerate(src)]
    ser = {}
    for ky, seg, met, line, co, v, yoy, si, sm, note in ins['data']:
        k = f'{seg}|{met}|{line}|{co}'
        ser.setdefault(k, []).append([ky, v, yoy, si] + ([note] if note and ('SUY RA' in note or 'ước' in note.lower()) else []))
    fin_wi = json.loads((B / 'fin_wi.json').read_text())
    vni = json.loads((B / 'vnindex_m.json').read_text())['m']
    out = {
        'built': dt.date.today().isoformat(),
        'ins': {'S': S, 'ser': ser, 'fy': ins['fy'], 'fydn': ins['fydn'], 'comm': ins['comm'], 'rel': [r for r in ins['releases'] if r['sel']][:40],
                'nRel': len(ins['releases']), 'nRows': len(ins['data'])},
        'wi': fin_wi,
        'vni': {**{k: v for k, v in vni.items() if k >= '2016-01'}, **{d[:7]: v for d, v in sorted(fin_wi.get('vniD', {}).items())}},
    }
    js = 'window.FIN_DATA=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
    (ROOT / 'data' / 'fin-data.js').write_text(js)
    print('data/fin-data.js', len(js) // 1024, 'KB', len(ser), 'chuỗi bảo hiểm')


if __name__ == '__main__':
    main()
