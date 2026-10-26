#!/usr/bin/env python3
"""Lịch sử dài cho bản đồ nhiệt "Việt Nam & Thế giới" → data/hm-hist.js (window.HM_HIST).

Trang dùng số hiện hành trước, chỉ lấy số ở đây cho những tháng số hiện hành chưa có (thường là trước 2019–2021).
- Thế giới: data/global/hm_hist.json (scripts/fetch_hm_hist.py: BIS, OECD, FRED, ECB).
- Việt Nam: data/backfill/vn_hist.json (Cục Thống kê, NHNN, Bộ Tài chính, S&P Global; scripts/vn_hist_backfill.py),
  bù bằng phần trước 2019 của dulieukinhte.com (data/vn/dlkt_hist.json) và lãi suất tái cấp vốn (data/vn/dlkt.json).
Mỗi chuỗi lưu gọn dạng {s: tháng đầu, v: [giá trị theo tháng, null nếu trống]}."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
J = lambda p: json.loads((ROOT / p).read_text(encoding='utf-8')) if (ROOT / p).exists() else {}


def nxt(m):
    y, mo = int(m[:4]), int(m[5:])
    return f'{y + (mo == 12)}-{1 if mo == 12 else mo + 1:02d}'


def pack(d):
    d = {m: v for m, v in d.items() if v is not None}
    if not d:
        return None
    ks = sorted(d); m, out = ks[0], []
    while m <= ks[-1]:
        v = d.get(m)
        out.append(None if v is None else round(v, 3))
        m = nxt(m)
    return {'s': ks[0], 'v': out}


def ly(m):
    return f'{int(m[:4]) - 1}{m[4:]}'


def yoy(lv):
    return {m: (v / lv[ly(m)] - 1) * 100 for m, v in lv.items() if lv.get(ly(m))}


def main():
    G = J('data/global/hm_hist.json')
    w = {k: {c: pack(v) for c, v in G.get(k, {}).items() if pack(v)} for k in ('pol', 'cpi', 'y10', 'fx')}

    V = (J('data/backfill/vn_hist.json') or {}).get('s', {})
    H = (J('data/vn/dlkt_hist.json') or {}).get('pages', {})
    DL = (J('data/vn/dlkt.json') or {}).get('pages', {})

    def hrow(slug, name, kind='a'):
        for r in H.get(slug, {}).values():
            if r.get('n') == name:
                return dict(r.get(kind, {}))
        return {}

    def fill(key, extra):   # WiData trước, dulieukinhte bù tháng còn trống
        base = dict(V.get(key, {}))
        for m, v in extra.items():
            base.setdefault(m, v)
        return base

    vn = {}
    for k in ('dep', 'm2', 'res', 'cpi_avg', 'cpi_core', 'fdi_real_yoy', 'fdi_reg_yoy', 'pub_yoy', 'credit', 'tb', 'gdp', 'vn10'):
        vn[k] = dict(V.get(k, {}))
    vn['cpi'] = fill('cpi', {m: v for r in H.get('cpi-so-cung-ky-319', {}).values() if r.get('n') == 'CPI' for m, v in r.get('a', {}).items()})
    vn['pmi'] = fill('pmi', hrow('pmi-271', 'PMI'))
    vn['iip'] = fill('iip', hrow('iip-277', 'Toàn ngành công nghiệp'))
    vn['ret'] = fill('ret', yoy(hrow('ban-le-hang-hoa-va-dich-vu-273', 'Tổng mức bán lẻ HH và DV')))
    vn['xk'] = fill('xk', yoy(hrow('tong-xuat-khau-292', 'Tổng')))
    vn['nk'] = fill('nk', yoy(hrow('tong-nhap-khau-293', 'Tổng')))
    vn['tour'] = fill('tour', yoy(hrow('khach-quoc-te-theo-loai-hinh-295', 'Tổng số')))
    vn['on'] = fill('on', hrow('lai-suat-dieu-hanh-lien-ngan-hang-391', 'Qua đêm'))
    vn['omo'] = dict(V.get('omo', {}))
    vn['nhtm'] = dict(V.get('nhtm', {}))
    vn['central'] = hrow('ty-gia-usdvnd-cua-nhnn-427', 'Trung tâm', 'e')
    vn['free'] = fill('free', hrow('ty-gia-cho-den-719', 'Bán ra', 'e'))
    vn['dep12s'] = dict(V.get('dep12s', {}))
    vn['dep12vcb'] = hrow('lai-suat-huy-dong-vietcombank-376', '12 tháng', 'e')
    refi = hrow('lai-suat-dieu-hanh-lien-ngan-hang-391', 'Lãi suất tái cấp vốn', 'e')   # lãi suất tái cấp vốn: lịch sử + hiện hành, giữ mức gần nhất
    for r in DL.get('lai-suat-dieu-hanh-lien-ngan-hang-391', {}).values():
        if r['n'] == 'Lãi suất tái cấp vốn':
            for d, v in zip(r['d'], r['v']):
                refi[d[:7]] = v
    if refi:
        ks, cur, m = sorted(refi), None, None
        m, full = ks[0], {}
        last = max(ks[-1], max((d[:7] for r in DL.get('lai-suat-dieu-hanh-lien-ngan-hang-391', {}).values() for d in r['d']), default=ks[-1]))
        while m <= last:
            cur = refi.get(m, cur); full[m] = cur; m = nxt(m)
        refi = full
    vn['refi'] = refi
    # tỷ giá VND: % thay đổi từ đầu năm (dương = VND mất giá), NHTM bán ra; trước đó tỷ giá trung tâm/bình quân liên NH của NHNN
    # (mỗi nguồn tự tính so với cuối năm trước của chính nó, không ghép hai mức tỷ giá khác nhau)
    ytd = lambda lv: {m: (v / lv[f'{int(m[:4]) - 1}-12'] - 1) * 100 for m, v in lv.items() if lv.get(f'{int(m[:4]) - 1}-12')}
    vn['fx_ytd'] = ytd(vn['central']); vn['fx_ytd'].update(ytd(vn['nhtm']))
    vn['free_gap'] = {m: vn['free'][m] - vn['nhtm'][m] for m in vn['free'] if m in vn['nhtm']}
    for k in ('central', 'nhtm', 'free'):
        vn.pop(k)
    vn = {k: pack(v) for k, v in vn.items() if pack(v)}

    out = {'w': w, 'wsrc': G.get('src', {}), 'vn': vn, 'built': G.get('fetched')}
    (ROOT / 'data/hm-hist.js').write_text('window.HM_HIST = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    print('thế giới:', {k: {c: v['s'] for c, v in d.items()} for k, d in w.items()})
    print('Việt Nam:', {k: v['s'] for k, v in vn.items()})


if __name__ == '__main__':
    main()
