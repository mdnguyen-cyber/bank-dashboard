#!/usr/bin/env python3
"""Nhập bộ dữ liệu thị trường bảo hiểm (workbook chuyên viên tổng hợp từ Bộ Tài chính, IAV, GSO, báo chí)
thành data/backfill/ins_market.json cho trang Ngành tài chính khác.

Dùng: python3 scripts/ins_import_xlsx.py <workbook.xlsx>
- Data: chỉ lấy dòng Chọn = 1, bỏ dòng kế hoạch; giữ nguồn (tên bài/bản tin, loại nguồn, link, ngày đăng) từng dòng.
- FY_ChinhThuc: số năm chính thức (Niên giám MOF), 2025 = số ước bản tin MOF tháng 1/2026.
- FY_DN: doanh thu phí và thị phần theo doanh nghiệp (Phụ lục 3 Niên giám).
- HoaHong_NT: tỷ lệ hoa hồng của các DN nhân thọ lớn.
- Release_Log: danh sách bài/bản tin nguồn.
"""
import json, pathlib, re, sys, datetime as dt
import openpyxl

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'data' / 'backfill' / 'ins_market.json'


def num(v):
    if v is None or v == '':
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return round(f, 6) if abs(f) < 10 else round(f, 3)


def rows_of(ws):
    return [list(r) for r in ws.iter_rows(values_only=True)]


def main(path):
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    # ---- nguồn ----
    srcs, sidx = [], {}

    def src_id(name, typ, url, date):
        k = (name or '', url or '')
        if k not in sidx:
            sidx[k] = len(srcs)
            srcs.append({'n': name, 't': typ, 'u': url, 'd': str(date)[:10] if date else None})
        return sidx[k]

    # ---- Data ----
    R = rows_of(wb['Data']); h = R[0]; ix = {c: i for i, c in enumerate(h)}
    data = []
    for r in R[1:]:
        if not r[0] or r[ix['Chọn']] != 1 or r[ix['Kế hoạch']]:
            continue
        v = num(r[ix['Giá trị']])
        if v is None:
            continue
        s = src_id(r[ix['Nguồn']], r[ix['Loại nguồn']], r[ix['URL']], r[ix['Ngày đăng']])
        data.append([r[ix['Kỳ']], r[ix['Mảng']], r[ix['Mã chỉ tiêu']], r[ix['Nghiệp vụ']], r[ix['DN (chuẩn)']], v,
                     num(r[ix['YoY']]), s, 1 if r[ix['Tính Σ']] == 1 else 0, (r[ix['Ghi chú']] or '')[:160] or None])
    data.sort(key=lambda x: (x[0], x[1], x[2], x[3], x[4]))

    # ---- FY_ChinhThuc ----
    F = rows_of(wb['FY_ChinhThuc'])
    hdr = next(r for r in F if r and r[0] == 'Chỉ tiêu')
    years = [int(y) for y in hdr[2:] if y]
    fy = []
    for r in F[F.index(hdr) + 1:]:
        if not r or not r[0] or not r[1] or not str(r[1]).startswith('|'):
            continue
        fy.append({'n': r[0], 'k': r[1].strip('|'), 'v': [num(x) for x in r[2:2 + len(years)]]})

    # ---- FY_DN ----
    D = rows_of(wb['FY_DN']); blocks = {}; cur = None; yrs = None
    for r in D:
        if not r or r[0] is None:
            continue
        if isinstance(r[1], str) and r[1].isdigit():
            cur = r[0]; yrs = [int(y) for y in r[1:] if y]; blocks[cur] = {'years': yrs, 'rows': []}
            continue
        if cur and not str(r[0]).startswith('Tổng'):
            blocks[cur]['rows'].append({'co': r[0], 'v': [num(x) for x in r[1:1 + len(yrs)]]})
    fydn = {}
    for k, b in blocks.items():
        seg = 'NONLIFE' if k.startswith('PHI') else 'LIFE'
        kind = 'share' if 'Thị phần' in k else 'prem'
        fydn.setdefault(seg, {})[kind] = b

    # ---- HoaHong_NT ----
    H = rows_of(wb['HoaHong_NT'])
    hh_hdr = next(i for i, r in enumerate(H) if r and r[0] == 'Công ty')
    hh = []
    for r in H[hh_hdr + 1:]:
        if not r or r[0] is None or not re.fullmatch(r'\d{4}', str(r[1] or '')):
            break
        hh.append({'co': r[0], 'y': int(r[1]), 'comm': num(r[2]), 'st': r[3], 'prem': num(r[6]), 'nb': num(r[11]),
                   'r_prem': num(r[12]), 'r_nb': num(r[13]), 'agent_other': num(r[14]), 'r_all': num(r[15])})

    # ---- Release_Log ----
    L = rows_of(wb['Release_Log']); lh = L[0]; li = {c: i for i, c in enumerate(lh)}
    rel = []
    for r in L[1:]:
        if not r or not r[0]:
            continue
        rel.append({'n': r[li['Tên bài / bản tin']], 'u': r[li['URL']], 'd': str(r[li['Ngày đăng']])[:10] if r[li['Ngày đăng']] else None,
                    't': r[li['Loại nguồn']], 'from': r[li['Kỳ số liệu từ']], 'to': r[li['Kỳ số liệu đến']], 'sel': r[li['Số dòng được chọn']] or 0})
    rel.sort(key=lambda x: x['d'] or '', reverse=True)

    out = {'built': dt.date.today().isoformat(), 'cols': ['ky', 'seg', 'metric', 'line', 'co', 'v', 'yoy', 'src', 'sum', 'note'],
           'data': data, 'src': srcs, 'fy': {'years': years, 'rows': fy}, 'fydn': fydn, 'comm': hh, 'releases': rel}
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
    print(f'{len(data)} dòng, {len(srcs)} nguồn, {len(fy)} chỉ tiêu năm, {len(hh)} dòng hoa hồng, {len(rel)} bản tin → {OUT} ({OUT.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main(sys.argv[1])
