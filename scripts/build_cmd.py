#!/usr/bin/env python3
"""Dữ liệu tab Vĩ mô › Hàng hóa → data/cmd-data.js (window.CMD_DATA).

Nguồn (theo thứ tự ưu tiên của từng mặt hàng):
- data/global/cmd.json (scripts/fetch_cmd.py): dầu WTI, Brent (EIA qua FRED), vàng, bạc (COMEX), đường (ICE) — tự cập nhật hằng ngày.
- data/vn/dlkt.json + dlkt_hist.json (dulieukinhte.com): vàng SJC, xăng RON 95-V — tự cập nhật hằng ngày.
- data/backfill/cmd_wi.json (scripts/cmd_wi_backfill.py): cước Baltic, giá Trung Quốc, giá trong nước còn lại.
Nguồn sau chỉ bù phần trước điểm đầu / sau điểm cuối của nguồn trước. Giữ số theo ngày trong ~3 năm gần nhất,
phần cũ hơn lấy số cuối mỗi tháng cho file gọn."""
import calendar, json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
J = lambda p: json.loads((ROOT / p).read_text(encoding='utf-8')) if (ROOT / p).exists() else {}

GROUPS = [('nl', 'Năng lượng'), ('vt', 'Vận tải biển'), ('kl', 'Kim loại'), ('cn', 'Nguyên liệu công nghiệp, phân bón'), ('ns', 'Nông sản, thực phẩm')]
# khóa, tên, đơn vị, nhóm, [nguồn theo ưu tiên], số lẻ, nguồn gốc ghi trên trang
ITEMS = [
    ('brent', 'Dầu Brent', 'USD/thùng', 'nl', [('cmd', 'brent'), ('glob', 'us_brent')], 2, 'EIA (giá giao ngay)'),
    ('wti', 'Dầu WTI', 'USD/thùng', 'nl', [('cmd', 'wti'), ('glob', 'us_wti')], 2, 'EIA (giá giao ngay)'),
    ('ron95', 'Xăng RON 95-V (vùng 1)', 'nghìn đồng/lít', 'nl', [('wi', 'ron95_e10'), ('dl', 'gia-xang-dau-406', '35131', 0.001), ('wi', 'ron95v')], 2, 'Bộ Công Thương, Petrolimex (giá bán lẻ; từ 2026 là xăng E10 RON 95-V)'),
    ('bdti', 'Cước vận chuyển dầu thô (BDTI)', 'điểm', 'vt', [('wi', 'bdti')], 0, 'Baltic Exchange'),
    ('bcti', 'Cước vận chuyển dầu thành phẩm (BCTI)', 'điểm', 'vt', [('wi', 'bcti')], 0, 'Baltic Exchange'),
    ('bdi', 'Cước vận chuyển hàng rời (BDI)', 'điểm', 'vt', [('wi', 'bdi')], 0, 'Baltic Exchange'),
    ('gold', 'Vàng thế giới', 'USD/ounce', 'kl', [('cmd', 'gold'), ('wi', 'gold')], 0, 'COMEX (hợp đồng gần nhất)'),
    ('silver', 'Bạc thế giới', 'USD/ounce', 'kl', [('cmd', 'silver'), ('wi', 'silver')], 2, 'COMEX (hợp đồng gần nhất)'),
    ('sjc', 'Vàng miếng SJC (bán ra)', 'nghìn đồng/lượng', 'kl', [('wi', 'sjc'), ('dl', 'gia-vang-407', '35193', 1000)], 0, 'Công ty Vàng bạc Đá quý Sài Gòn (SJC)'),
    ('hrc_cn', 'Thép cuộn cán nóng (HRC) Trung Quốc', 'CNY/tấn', 'kl', [('wi', 'hrc_cn')], 0, 'SunSirs (giá giao ngay Trung Quốc)'),
    ('steel_hpg', 'Thép cuộn Hòa Phát CB240 D6', 'nghìn đồng/kg', 'kl', [('wi', 'steel_hpg')], 2, 'Hòa Phát (giá niêm yết)'),
    ('rubber_cn', 'Cao su thiên nhiên Trung Quốc', 'CNY/tấn', 'cn', [('wi', 'rubber_cn')], 0, 'SunSirs (giá giao ngay Trung Quốc)'),
    ('pvc_cn', 'Nhựa PVC Trung Quốc', 'CNY/tấn', 'cn', [('wi', 'pvc_cn')], 0, 'SunSirs (giá giao ngay Trung Quốc)'),
    ('urea', 'Phân urê Cà Mau', 'nghìn đồng/kg', 'cn', [('wi', 'urea_cm')], 2, 'giá bán buôn trong nước'),
    ('dap', 'Phân DAP Đình Vũ (xanh)', 'nghìn đồng/kg', 'cn', [('wi', 'dap_dv')], 2, 'giá bán buôn trong nước'),
    ('sugar', 'Đường thô thế giới (ICE số 11)', 'US cent/pound', 'ns', [('cmd', 'sugar'), ('wi', 'sugar')], 2, 'ICE (hợp đồng gần nhất)'),
    ('hog', 'Heo hơi Việt Nam', 'nghìn đồng/kg', 'ns', [('wi', 'hog_vn')], 1, 'bình quân giá thu mua ba miền'),
    ('pang', 'Cá tra nguyên liệu', 'nghìn đồng/kg', 'ns', [('wi', 'pangasius')], 1, 'VASEP (cá tra thịt trắng, ĐBSCL)'),
    ('pang_fry', 'Cá tra giống', 'nghìn đồng/kg', 'ns', [('wi', 'pang_fry')], 0, 'giá tại ĐBSCL'),
    ('shrimp', 'Tôm chân trắng', 'nghìn đồng/kg', 'ns', [('wi', 'shrimp')], 0, 'giá thu mua tại ĐBSCL'),
]


def eom(m):
    y, mo = int(m[:4]), int(m[5:7])
    return f'{m}-{calendar.monthrange(y, mo)[1]:02d}'


def main():
    CM = (J('data/global/cmd.json') or {}).get('s', {})
    GL = (J('data/global/series.json') or {}).get('series', {})
    WI = J('data/backfill/cmd_wi.json') or {}
    DL = (J('data/vn/dlkt.json') or {}).get('pages', {})
    DH = (J('data/vn/dlkt_hist.json') or {}).get('pages', {})

    def load(src):
        kind = src[0]
        if kind == 'cmd':
            return {d: v for d, v in CM.get(src[1], [])}
        if kind == 'glob':
            return {d: v for d, v in (GL.get(src[1]) or {}).get('obs', [])}
        if kind == 'wi':
            return dict(WI.get(src[1], {}))
        if kind == 'dl':
            _, slug, rid, mult = src
            out = {eom(m): v * mult for m, v in (DH.get(slug, {}).get(rid, {}).get('e') or {}).items()}
            r = DL.get(slug, {}).get(rid) or {}
            out.update({d: v * mult for d, v in zip(r.get('d', []), r.get('v', []))})
            return out
        return {}

    items, rep = [], {}
    for k, name, unit, grp, srcs, dp, org in ITEMS:
        ser = {}
        for i, s in enumerate(srcs):
            x = {d: v for d, v in load(s).items() if v is not None}
            if not x:
                continue
            if not ser:
                ser = dict(x); continue
            lo, hi = min(ser), max(ser)
            ser.update({d: v for d, v in x.items() if d < lo or d > hi})   # nguồn sau chỉ nối hai đầu
        if not ser:
            rep[k] = 'không có số'; continue
        ds = sorted(ser)
        cut = (date.fromisoformat(ds[-1]) - timedelta(days=int(3.3 * 365))).isoformat()
        keep, last_m = [], {}
        for d in ds:
            if d >= cut:
                keep.append(d)
            else:
                last_m[d[:7]] = d
        keep = sorted(set(last_m.values())) + keep
        items.append({'k': k, 'n': name, 'u': unit, 'g': grp, 'dp': dp, 'src': org, 'd': keep, 'v': [round(ser[d], 4) for d in keep]})
        rep[k] = f'{ds[0]} → {ds[-1]} ({len(keep)} điểm)'
    out = {'built': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), 'groups': GROUPS, 'items': items}
    (ROOT / 'data/cmd-data.js').write_text('window.CMD_DATA = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    for k, v in rep.items():
        print(f'{k:10s} {v}')


if __name__ == '__main__':
    main()
