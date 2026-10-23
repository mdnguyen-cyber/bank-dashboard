#!/usr/bin/env python3
"""Lớp cập nhật tự động (chạy trên GitHub Actions sau các script fetch_*): nối số mới từ nguồn công khai vào data/sector-data.json
mà không cần AI gọi WiData. Bản dựng đầy đủ từ WiData (build_sector_data.py) vẫn là nền; lớp này chỉ nối phần mới hơn.
- Giá, P/B, P/E, vốn hoá 26 ngân hàng: VNDirect (data/vn/market.json)
- Định giá ngành (secVal): co giãn theo tổng vốn hoá / vốn chủ / lợi nhuận suy ra từ P/B, P/E từng ngân hàng
- Giá vàng thế giới: COMEX qua Yahoo Finance
- Tin tức ngân hàng: RSS CafeF, VnExpress
- Vĩ mô Việt Nam: dulieukinhte.com (data/vn/dlkt.json) — xem DOM_MAP
Ghi lại data/sector-data.json và data/sector-data.js; ghi data/vn/auto-report.json để biết phần nào đã nối."""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
J = lambda p: json.loads((ROOT / p).read_text(encoding='utf-8')) if (ROOT / p).exists() else None

# dom key → (trang dulieukinhte, tên dòng chính xác, kiểu): 'd' = theo ngày (nối điểm mới), 'm' = theo tháng (ngày đầu tháng)
# (đã đối chiếu khớp số WiData; CPI và M2 của nguồn này khác định nghĩa/kỳ gốc nên không nối)
DOM_MAP = {
    'creditYtd': ('tang-truong-tin-dung-toc-do-353', 'TỔNG CỘNG', 'm'),
    'freeD': ('ty-gia-cho-den-719', 'Bán ra', 'd'),
    'dep12State': ('lai-suat-huy-dong-vietcombank-376', '12 tháng', 'd'),
}
DOM_CALC = {   # dom key → (hàm từ các dòng, kiểu)
    'trade': (lambda g: {m: g('tong-xuat-khau-292', 'Tổng').get(m) - g('tong-nhap-khau-293', 'Tổng').get(m) for m in g('tong-xuat-khau-292', 'Tổng') if g('tong-nhap-khau-293', 'Tổng').get(m) is not None}, 'm'),
}


def append(ser, pts, monthly=False):
    """ser: [{d, v}] ; pts: [(d, v)] → nối các điểm sau ngày cuối của ser. Trả số điểm nối."""
    last = ser[-1]['d'] if ser else ''
    n = 0
    for d, v in pts:
        if monthly:
            d = d[:7] + '-01'
        if d > last and v is not None:
            ser.append({'d': d, 'v': v}); last = d; n += 1
    return n


def main():
    S = J('data/sector-data.json')
    if not S:
        print('Chưa có data/sector-data.json'); return
    M, DL = J('data/vn/market.json') or {}, J('data/vn/dlkt.json') or {}
    rep = {}

    # 1) giá & định giá từng ngân hàng
    st = M.get('stocks') or {}
    rows = S['latest']['rows']
    old_mc = sum(r.get('mcap') or 0 for r in rows)
    old_eq = sum(r['mcap'] / r['pb'] for r in rows if r.get('mcap') and r.get('pb'))
    old_er = sum(r['mcap'] / r['pe'] for r in rows if r.get('mcap') and r.get('pe') and r['pe'] > 0)
    upd, pdate = 0, S['latest'].get('priceDate', '')
    for r in rows:
        x = st.get(r['s']) or {}
        px = x.get('px') or []
        if not px:
            continue
        d, close = px[-1][0], px[-1][1]
        if d < S['latest'].get('priceDate', ''):
            continue
        ra = x.get('ratio') or {}
        if r.get('price') and close:
            k = close / r['price']   # vốn hoá theo giá; P/B, P/E lấy VNDirect nếu có, không thì co giãn theo giá
            r['mcap'] = round(r['mcap'] * k) if r.get('mcap') else r.get('mcap')
            r['pb'] = round(r['pb'] * k, 2) if r.get('pb') else r.get('pb')   # giữ cách tính vốn chủ, lợi nhuận của bản WiData, chỉ co giãn theo giá
            r['pe'] = round(r['pe'] * k, 2) if r.get('pe') else r.get('pe')
            if r.get('pppop'):
                r['pppop'] = round(r['pppop'] * k, 2)
        r['price'] = close; upd += 1; pdate = max(pdate, d)
    S['latest']['priceDate'] = pdate
    px_of = {r['s']: r['price'] for r in rows}
    for c in (S.get('consensus') or {}).get('rows', []):   # upside theo giá mới
        tps = sorted(p['tp'] for p in c.get('reports', []) if p.get('tp'))
        if tps and px_of.get(c['s']):
            n = len(tps); med = tps[n // 2] if n % 2 else (tps[n // 2 - 1] + tps[n // 2]) / 2
            c['upside'] = round((med / px_of[c['s']] - 1) * 100, 1)
    rep['banks'] = f'{upd}/{len(rows)} ngân hàng, giá đến {pdate}'

    # 2) định giá ngành: co giãn mức WiData theo thay đổi tổng hợp từ các ngân hàng
    mc = sum(r.get('mcap') or 0 for r in rows)
    eq = sum(r['mcap'] / r['pb'] for r in rows if r.get('mcap') and r.get('pb'))
    er = sum(r['mcap'] / r['pe'] for r in rows if r.get('mcap') and r.get('pe') and r['pe'] > 0)
    sv = S.get('secVal') or {}
    if sv.get('now') and old_mc and old_eq and old_er and pdate > sv['now']['d']:
        n = sv['now']
        new = {'d': pdate, 'pb': round(n['pb'] * (mc / eq) / (old_mc / old_eq), 2), 'pe': round(n['pe'] * (mc / er) / (old_mc / old_er), 2),
               'mcap': round(n['mcap'] * mc / old_mc), 'pppop': round(n['pppop'] * mc / old_mc, 2) if n.get('pppop') else None}
        sv['now'] = new
        mo = sv.get('monthly') or []
        if mo and mo[-1]['d'][:7] == pdate[:7]:
            mo[-1] = new
        else:
            mo.append(new)
        rep['secVal'] = f"P/B ngành {new['pb']} ngày {pdate}"

    # 3) giá vàng
    g = M.get('gold') or []
    if g and isinstance(S.get('goldWi'), list):
        rep['gold'] = f"nối {append(S['goldWi'], g)} điểm"

    # 4) tin tức
    nw = M.get('news') or []
    if nw:
        have = {n.get('url') for n in S.get('news', [])}
        add = [n for n in nw if n.get('url') not in have]
        S['news'] = sorted(S.get('news', []) + add, key=lambda n: n['d'], reverse=True)[:200]
        rep['news'] = f'thêm {len(add)} tin'

    # 5) vĩ mô Việt Nam
    pages = DL.get('pages') or {}
    for key, (pg, name, kind) in DOM_MAP.items():
        rw = next((x for x in (pages.get(pg) or {}).values() if x.get('n') == name), None)
        if rw and key in S.get('dom', {}):
            rep['dom.' + key] = f"nối {append(S['dom'][key], list(zip(rw['d'], rw['v'])), kind == 'm')} điểm"

    def g(pg, name):
        rw = next((x for x in (pages.get(pg) or {}).values() if x.get('n') == name), None)
        return {d[:7] + '-01': v for d, v in zip(rw['d'], rw['v'])} if rw else {}
    for key, (fn, kind) in DOM_CALC.items():
        try:
            pts = sorted(fn(g).items())
            if pts and key in S.get('dom', {}):
                rep['dom.' + key] = f"nối {append(S['dom'][key], [(d, round(v, 4)) for d, v in pts], kind == 'm')} điểm"
        except Exception as e:  # noqa: BLE001
            rep['dom.' + key] = 'lỗi ' + str(e)[:80]

    S.setdefault('meta', {})['auto'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
    (ROOT / 'data/sector-data.json').write_text(json.dumps(S, ensure_ascii=False, indent=1), encoding='utf-8')
    (ROOT / 'data/sector-data.js').write_text('window.SECTOR_DATA = ' + json.dumps(S, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    (ROOT / 'data/vn').mkdir(parents=True, exist_ok=True)
    (ROOT / 'data/vn/auto-report.json').write_text(json.dumps({'at': S['meta']['auto'], 'report': rep}, ensure_ascii=False, indent=1), encoding='utf-8')
    print(rep)


if __name__ == '__main__':
    main()
