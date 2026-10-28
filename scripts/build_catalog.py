"""Danh mục chuỗi dữ liệu của dashboard → data/catalog.js (window.CATALOG) cho trang backend.html.

Tự đọc từng file dữ liệu để lấy danh sách chuỗi, kỳ đầu – kỳ cuối, số điểm và tần suất (suy từ khoảng cách giữa các điểm);
nguồn, lịch cập nhật và phương pháp lấy từ bảng mô tả bên dưới. Chạy trong workflow số liệu nên ngày mới nhất luôn đúng.
"""
import json, re, statistics
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def js(p):
    f = ROOT / p
    if not f.exists():
        return None
    s = f.read_text(encoding='utf-8')
    return json.loads(s[s.index('{'):s.rindex('}') + 1])


def freq(ds):
    ds = [d for d in ds if d]
    if len(ds) < 3:
        return '—'
    def to_d(x):
        x = str(x)
        if re.match(r'^\d{4}-\d{2}-\d{2}', x):
            return date.fromisoformat(x[:10])
        if re.match(r'^\d{4}-\d{2}$', x):
            return date(int(x[:4]), int(x[5:]), 15)
        m = re.match(r'^Q(\d)/(\d{4})$', x)
        if m:
            return date(int(m[2]), int(m[1]) * 3, 15)
        return None
    dd = sorted(filter(None, (to_d(x) for x in ds[-60:])))
    if len(dd) < 3:
        return '—'
    g = statistics.median([(b - a).days for a, b in zip(dd, dd[1:])])
    return 'Ngày' if g <= 1.6 else 'Tuần' if g <= 8 else 'Tháng' if g <= 35 else 'Quý' if g <= 100 else 'Năm'


def rng(ds, vs=None):
    pairs = [(d, v) for d, v in zip(ds, vs)] if vs is not None else [(d, 1) for d in ds]
    pairs = [(str(d), v) for d, v in pairs if d is not None and v is not None]
    if not pairs:
        return None
    return {'from': pairs[0][0], 'to': pairs[-1][0], 'c': len(pairs), 'f': freq([d for d, _ in pairs])}


UPD = {
    'auto': 'Tự động hằng ngày: 06:17 (mọi ngày) và 16:47 (ngày làm việc) — GitHub Actions fetch-global',
    'vira': 'Tự động 17:47 các ngày làm việc — GitHub Actions fetch-vira',
    'sbv': 'Tự động 09:23 hằng ngày — GitHub Actions fetch-sbv (NHNN chỉ hiện tháng mới nhất, lưu dồn)',
    'wi': 'Bán tự động: AI gọi Wi MCP trong phiên làm việc, lưu kết quả gốc rồi chạy script build (khi có kỳ mới, thường hằng tuần và mỗi mùa BCTC)',
    'wi_auto': 'Nền từ Wi MCP (bán tự động); phần mới nhất nối tự động hằng ngày bởi build_auto.py (VNDirect, RSS, COMEX)',
    'manual': 'Biên tập tay khi có sự kiện/văn bản mới (có link nguồn từng dòng)',
}
SUF = {'_yoy': ' · % so cùng kỳ', '_mom': ' · % so tháng trước', '_m3': ' · % 3 tháng quy năm', '_d': ' · theo ngày', '_m': ' · bình quân tháng', '_chg': ' · thay đổi so kỳ trước'}

ECO_LBL = {'pmi': 'PMI sản xuất (S&P Global)', 'iip': 'Chỉ số sản xuất công nghiệp', 'iip_min': 'IIP khai khoáng', 'iip_mfg': 'IIP chế biến chế tạo', 'iip_elec': 'IIP điện', 'iip_water': 'IIP nước, xử lý rác',
           'ret': 'Tổng mức bán lẻ HH & DV (% YoY)', 'ret_lv': 'Tổng mức bán lẻ (nghìn tỷ)', 'ret_goods': 'Bán lẻ hàng hoá', 'ret_accom': 'Lưu trú, ăn uống', 'ret_travel': 'Du lịch lữ hành', 'ret_oth': 'Dịch vụ khác',
           'cpi': 'CPI chung (% YoY)', 'cpi_core': 'Lạm phát cơ bản', 'cpi_food': 'CPI hàng ăn & DV ăn uống', 'cpi_bev': 'CPI đồ uống, thuốc lá', 'cpi_cloth': 'CPI may mặc', 'cpi_house': 'CPI nhà ở, điện nước, VLXD',
           'cpi_equip': 'CPI thiết bị gia đình', 'cpi_health': 'CPI thuốc, dịch vụ y tế', 'cpi_trans': 'CPI giao thông', 'cpi_post': 'CPI bưu chính viễn thông', 'cpi_edu': 'CPI giáo dục', 'cpi_cult': 'CPI văn hoá, giải trí', 'cpi_other': 'CPI hàng hoá, dịch vụ khác',
           'xk': 'Xuất khẩu (% YoY)', 'nk': 'Nhập khẩu (% YoY)', 'tb': 'Cán cân thương mại', 'fdi_real': 'FDI giải ngân', 'fdi_reg': 'FDI đăng ký', 'pub': 'Giải ngân vốn đầu tư công', 'tour': 'Khách quốc tế'}


def eco_label(k):
    base = re.sub(r'_(lv|ttm|ytd_yoy|ytd|yoy|dom|fdi)$', '', k)
    lab = ECO_LBL.get(k) or ECO_LBL.get(base) or k
    for s_, t in (('_dom', ' · khu vực trong nước'), ('_fdi', ' · khu vực FDI'), ('_ttm', ' · cộng 12 tháng'), ('_ytd_yoy', ' · lũy kế % YoY'), ('_ytd', ' · lũy kế từ đầu năm'), ('_yoy', ' · % YoY'), ('_lv', ' · giá trị')):
        if k.endswith(s_) and s_ not in ('_yoy',) or (s_ == '_yoy' and k.endswith('_yoy') and not k.endswith('_ytd_yoy')):
            if k.endswith(s_):
                lab += t if t not in lab else ''
    return lab


def main():
    groups = []
    def grp(id_, name, page, file, src, upd, method='', rows=None):
        groups.append({'id': id_, 'name': name, 'page': page, 'file': file, 'src': src, 'upd': UPD.get(upd, upd), 'updKey': upd, 'method': method, 'series': rows or []})

    # ---------------- Quốc tế (global-data.js)
    G = js('data/global-data.js')
    if G:
        rows = []
        for k, v in G['s'].items():
            base, suf = k, ''
            for s_ in SUF:
                if k.endswith(s_) and k[:-len(s_)] in G['label']:
                    base, suf = k[:-len(s_)], SUF[s_]
            src = G['src'].get(base) or G['src'].get(k) or ''
            src = re.sub(r'^fred:', 'FRED ', src); src = re.sub(r'^nyfed', 'NY Fed', src)
            r = rng(v['d'], v['v'])
            if r:
                rows.append({'k': k, 'n': (G['label'].get(base) or G['label'].get(k) or k) + suf, 'src': src or 'FRED / nguồn gốc công bố (xem fetch_global.py)', **r})
        grp('global', 'Quốc tế: Mỹ, Eurozone, Nhật, Trung Quốc', 'Vĩ mô › Quốc tế; Ngành › Vĩ mô tiền tệ (mục Mỹ)', 'data/global-data.js',
            'FRED (BLS, BEA, Fed H.15/H.4.1), NY Fed Markets API, U.S. Treasury Fiscal Data, ECB, BoJ, MOF Nhật, DBnomics, BIS', 'auto',
            'Chỉ số giá → % so cùng kỳ = chỉ số / chỉ số 12 tháng trước − 1; % so tháng trước; 3 tháng quy năm = (chỉ số / chỉ số 3 tháng trước)^4 − 1. Taylor rule: V1 = r* + π + 0,5(π − 2) + 0,5 × lệch GDP; V2 thay lệch GDP bằng −2 × lệch thất nghiệp (Okun). Tài sản NHTW quy đổi tỷ USD theo tỷ giá cuối kỳ.', rows)
        if G.get('fedwatch'):
            F = G['fedwatch']
            grp('fedwatch', 'Kỳ vọng lãi suất Fed theo phiên FOMC', 'Vĩ mô › Quốc tế › Mỹ; Ngành › Bức tranh ngành; Catalyst · Risk', 'data/global-data.js (fedwatch)',
                'CBOT hợp đồng tương lai lãi suất quỹ liên bang 30 ngày (ZQ) qua Yahoo Finance; đối chiếu Kalshi', 'auto',
                'Theo phương pháp CME FedWatch: lãi suất bình quân tháng ngụ ý = 100 − giá ZQ; tháng có họp: avg = f·r_trước + (1 − f)·r_sau, f = (ngày hiệu lực − 1) / số ngày của tháng; xác suất từng mức = nội suy giữa hai bậc 25 bps.',
                [{'k': 'fedwatch', 'n': f'{len(F.get("meetings", []))} phiên họp FOMC tới', 'src': 'ZQ (CBOT)', 'from': (F.get('meetings') or [{}])[0].get('date'), 'to': (F.get('meetings') or [{}])[-1].get('date'), 'c': len(F.get('meetings', [])), 'f': 'Theo phiên họp'}])
        if G.get('ois'):
            O = G['ois']; h = O.get('hist') or {}
            grp('ois', 'Đường cong OIS (SOFR) Mỹ', 'Vĩ mô › Quốc tế › Mỹ; Ngành › Bức tranh ngành', 'data/global-data.js (ois)',
                'CME hợp đồng tương lai SOFR 1 tháng (SR1) và 3 tháng (SR3) qua Yahoo Finance; SOFR của NY Fed', 'auto',
                'G(t) = Π(1 + r·n/360) nối SR1 (các tháng trước kỳ IMM kế tiếp) và SR3 (IMM → IMM). Kỳ hạn ≤ 1 năm: OIS = (G − 1)·360/n. Kỳ hạn > 1 năm: OIS = (1 − DF(T)) / Σ α·DF(t), DF = 1/G. Chưa điều chỉnh độ lồi. Lịch sử tích lũy từng ngày vì nguồn chỉ có giá mới nhất mỗi hợp đồng.',
                [{'k': 'ois', 'n': 'OIS ' + ', '.join(O.get('tenors', [])), 'src': 'CME SR1/SR3, NY Fed SOFR', **(rng(sorted(h)) or {})}])

    F = js('data/fx-daily.js')
    if F:
        rows = [{'k': k, 'n': {'vn_sbv_central_d': 'Tỷ giá trung tâm NHNN', 'vn_sbv_ceil_d': 'Trần tỷ giá', 'vn_sbv_floor_d': 'Sàn tỷ giá', 'vn_sbv_buy_d': 'NHNN mua USD', 'vn_sbv_sell_d': 'NHNN bán USD', 'usdvnd_vcb_sell': 'Vietcombank bán', 'usdvnd_vcb_buy': 'Vietcombank mua'}.get(k, k),
                 'src': 'NHNN (sbv.gov.vn)' if 'sbv' in k else 'Vietcombank' if 'vcb' in k else 'ECB', **(rng(v['d'], v['v']) or {})} for k, v in F['s'].items()]
        grp('fx', 'Tỷ giá theo ngày', 'Vĩ mô › Quốc tế › Tỷ giá; Vĩ mô › Việt Nam', 'data/fx-daily.js', 'NHNN, Vietcombank, ECB (tỷ giá tham chiếu)', 'auto', '', rows)

    V = js('data/vira-data.js')
    if V:
        rows = []
        for blk, nm in (('vnd', 'VNIBOR VND'), ('usd', 'VNIBOR USD'), ('sofr', 'SOFR kỳ hạn')):
            for t, vs in V[blk].items():
                r = rng(V['d'], vs)
                if r:
                    rows.append({'k': f'{blk}_{t}', 'n': f'{nm} {t}', 'src': 'VIRA Market Watch', **r})
        grp('vira', 'Thị trường tiền tệ (VIRA)', 'Vĩ mô › Việt Nam › Tiền tệ', 'data/vira-data.js', 'VIRA Market Watch (vira.org.vn)', 'vira',
            'Bảng VIRA đăng dạng ảnh → đọc bằng OCR; mỗi dòng phải khớp Last − cao nhất 52 tuần và Last − thấp nhất 52 tuần trong chính bảng (sai số ≤ 0,011), không khớp thì bỏ.', rows)

    # ---------------- Việt Nam: kinh tế, tiền tệ
    E = js('data/eco-data.js')
    if E:
        rows = [{'k': k, 'n': eco_label(k), 'src': 'S&P Global' if k == 'pmi' else 'Cục Thống kê', **(rng(E['m'], v) or {})} for k, v in E['s'].items() if rng(E['m'], v)]
        grp('eco', 'Kinh tế Việt Nam (tháng)', 'Vĩ mô › Việt Nam › Kinh tế; Catalyst · Risk', 'data/eco-data.js',
            'dulieukinhte.com (tổng hợp từ Cục Thống kê, S&P Global); bù kỳ thiếu bằng Wi MCP', 'auto',
            'CPI nguồn đổi kỳ gốc từ 11/2025 nên chỉ tự tính % so cùng kỳ khi hai tháng cùng kỳ gốc, còn lại dùng số bù. Đóng góp nhóm vào CPI = tỷ trọng rổ 2020 × % YoY của nhóm.', rows)
    D = json.loads((ROOT / 'data/sector-data.json').read_text(encoding='utf-8'))
    DOM = {'nhtmSell': ('Tỷ giá NHTM bán ra', 'Wi MCP 82223 (Vietcombank)'), 'nhtmBuy': ('Tỷ giá NHTM mua', 'Wi MCP 82224'), 'free': ('Tỷ giá tự do', 'Wi MCP 82226'), 'freeD': ('Tỷ giá tự do (ngày)', 'Wi MCP 82226; chogia.vn'),
           'central': ('Tỷ giá trung tâm', 'Wi MCP 82227 (NHNN)'), 'ceiling': ('Trần tỷ giá', 'Wi MCP 82228'), 'sbvSell': ('NHNN bán USD', 'Wi MCP 82231'), 'nhtmD': ('Tỷ giá NHTM (ngày)', 'Wi MCP 82223'),
           'on': ('LNH qua đêm (tháng)', 'Wi MCP 82237 (NHNN)'), 'onDaily': ('LNH qua đêm (phiên)', 'Wi MCP 82237'), 'omo': ('Lãi suất OMO (tháng)', 'Wi MCP 81522'), 'omoDaily': ('Lãi suất OMO (phiên)', 'Wi MCP 81522'),
           'net': ('NHNN bơm/hút ròng (tháng)', 'Wi MCP 82268'), 'netDaily': ('NHNN bơm/hút ròng (phiên)', 'Wi MCP 82268'), 'dep12State': ('LS huy động 12T NHTM Nhà nước', 'Wi MCP 202886'), 'dep12Large': ('LS huy động 12T NHTM lớn', 'Wi MCP 202874'),
           'dep12Other': ('LS huy động 12T NHTM khác', 'Wi MCP 202880'), 'dep12StateD': ('LS huy động 12T NHTM Nhà nước (ngày)', 'Wi MCP 202886'), 'dep12LargeD': ('LS huy động 12T NHTM lớn (ngày)', 'Wi MCP 202874'), 'dep12OtherD': ('LS huy động 12T NHTM khác (ngày)', 'Wi MCP 202880'),
           'm2': ('M2 (% YoY)', 'Wi MCP 265954 (NHNN)'), 'depYoY': ('Tổng tiền gửi (% YoY)', 'Wi MCP 265963'), 'creditYoY': ('Tín dụng (% YoY)', 'Wi MCP 75847'), 'creditYtd': ('Tín dụng so đầu năm', 'Wi MCP 241732'),
           'depHH': ('Tiền gửi dân cư (% YoY)', 'Wi MCP 265981'), 'depCorp': ('Tiền gửi TCKT (% YoY)', 'Wi MCP 265972'), 'cpi': ('CPI (% YoY)', 'Wi MCP 75701'), 'cpiCore': ('Lạm phát cơ bản', 'Wi MCP 202889'), 'cpiAvg': ('CPI bình quân', 'Wi MCP 75804'),
           'reserves': ('Dự trữ ngoại hối', 'Wi MCP 76885'), 'trade': ('Cán cân thương mại', 'Wi MCP 255693'), 'fdi': ('FDI giải ngân', 'Wi MCP 76951'), 'revQ': ('Thu NSNN (quý)', 'Wi MCP 82420'), 'expQ': ('Chi NSNN (quý)', 'Wi MCP 75598'),
           'omoOut': ('OMO lưu hành', 'Wi MCP'), 'tpOut': ('Tín phiếu NHNN lưu hành', 'Wi MCP')}
    rows = []
    for k, v in D['dom'].items():
        if isinstance(v, list) and v and isinstance(v[0], dict):
            n, s_ = DOM.get(k, (k, 'Wi MCP'))
            r = rng([p['d'] for p in v], [p['v'] for p in v])
            if r:
                rows.append({'k': k, 'n': n, 'src': s_, **r})
    for t, vs in (D['dom'].get('lnh') or {}).items():
        r = rng([p['d'] for p in vs], [p['v'] for p in vs])
        if r:
            rows.append({'k': 'lnh_' + t, 'n': f'Lãi suất LNH bình quân kỳ hạn {t}', 'src': 'NHNN qua Wi MCP', **r})
    for k, v in D['intl'].items():
        r = rng([p['d'] for p in v], [p['v'] for p in v])
        if r:
            rows.append({'k': 'intl_' + k, 'n': {'dxy': 'DXY', 'effr': 'EFFR', 'ust10': 'UST 10Y', 'vn10': 'TPCP Việt Nam 10Y', 'cny': 'USD/CNY', 'brent': 'Brent'}.get(k, k), 'src': 'Wi MCP', **r})
    grp('dom', 'Tiền tệ Việt Nam (tỷ giá, lãi suất, tín dụng, đối ngoại)', 'Vĩ mô › Việt Nam › Tiền tệ; Ngành › Vĩ mô tiền tệ; Catalyst · Risk', 'data/sector-data.js (dom, intl)',
        'NHNN, Cục Thống kê, Bộ Tài chính, Vietcombank qua Wi MCP (mã chỉ tiêu ghi từng dòng); phần mới nối tự động từ NHNN, dulieukinhte.com, VNDirect', 'wi_auto',
        'Chuỗi phiên Wi nén khoảng > 3 tháng thành tuần nên bù lịch sử theo từng quý. Số tháng = phiên cuối tháng (hoặc bình quân tháng với lãi suất).', rows)

    VNH = {'dep': 'tiền gửi % YoY', 'm2': 'M2 % YoY', 'res': 'dự trữ ngoại hối', 'cpi_avg': 'CPI bình quân', 'cpi_core': 'lạm phát cơ bản', 'fdi_real_yoy': 'FDI giải ngân % YoY', 'fdi_reg_yoy': 'FDI đăng ký % YoY', 'pub_yoy': 'đầu tư công % YoY',
           'credit': 'tín dụng % YoY', 'tb': 'cán cân thương mại', 'gdp': 'GDP % YoY', 'vn10': 'TPCP 10Y', 'cpi': 'CPI % YoY', 'pmi': 'PMI', 'iip': 'IIP', 'ret': 'bán lẻ', 'xk': 'xuất khẩu', 'nk': 'nhập khẩu', 'tour': 'khách quốc tế',
           'on': 'LNH qua đêm', 'omo': 'lãi suất OMO', 'dep12s': 'huy động 12T NHTM Nhà nước', 'dep12vcb': 'huy động 12T Vietcombank', 'refi': 'lãi suất tái cấp vốn', 'fx_ytd': 'tỷ giá % từ đầu năm', 'free_gap': 'chênh tỷ giá tự do'}
    H = js('data/hm-hist.js')
    if H:
        rows = []
        for met, by in H['w'].items():
            for c, v in by.items():
                if isinstance(v, dict) and 'v' in v:
                    ds = v.get('d') or []
                    if not ds and v.get('s'):
                        y, m = int(v['s'][:4]), int(v['s'][5:7]); ds = [f'{y + (m - 1 + i) // 12}-{(m - 1 + i) % 12 + 1:02d}' for i in range(len(v['v']))]
                    r = rng(ds, v['v'])
                    if r:
                        src = (H.get('wsrc') or {}).get(met, {}); src = src.get(c, '') if isinstance(src, dict) else src
                        rows.append({'k': f'{met}_{c}', 'n': f"{ {'pol': 'Lãi suất điều hành', 'cpi': 'CPI % YoY', 'y10': 'Lợi suất TPCP 10Y', 'fx': 'Tỷ giá (% thay đổi giá trị đồng tiền)'}.get(met, met)} · {c.upper()}", 'src': src, **r})
        for k, v in H['vn'].items():
            if isinstance(v, dict) and v.get('s'):
                y, m = int(v['s'][:4]), int(v['s'][5:7]); ds = [f'{y + (m - 1 + i) // 12}-{(m - 1 + i) % 12 + 1:02d}' for i in range(len(v['v']))]
                r = rng(ds, v['v'])
                if r:
                    rows.append({'k': 'vn_' + k, 'n': f'Việt Nam · {VNH.get(k, k)}', 'src': 'Cục Thống kê, NHNN, Bộ Tài chính, S&P Global, Vietcombank', **r, **({'hist': True} if r['to'] < '2021' else {})})
        grp('hm', 'Lịch sử dài cho bản đồ nhiệt Việt Nam & Thế giới', 'Vĩ mô › Việt Nam & Thế giới', 'data/hm-hist.js',
            'BIS (WS_CBPOL, WS_LONG_CPI), OECD, FRED, ECB; Việt Nam: Cục Thống kê, NHNN, Bộ Tài chính, S&P Global', 'auto',
            'Trang dùng số hiện hành trước, chỉ lấy số lịch sử ở đây cho những tháng chưa có. Tỷ giá lưu % thay đổi giá trị đồng tiền so với USD.', rows)

    C_ = js('data/cmd-data.js')
    if C_:
        rows = [{'k': x['k'], 'n': f"{x['n']} ({x['u']})", 'src': x.get('src', ''), **(rng(x['d'], x['v']) or {})} for x in C_['items']]
        grp('cmd', 'Giá hàng hóa', 'Vĩ mô › Hàng hóa; Catalyst · Risk', 'data/cmd-data.js',
            'EIA qua FRED (dầu), COMEX/ICE qua Yahoo Finance (vàng, bạc, đường), dulieukinhte.com (SJC, xăng RON95), Wi MCP (cước Baltic, giá Trung Quốc, giá trong nước còn lại)', 'auto',
            'Nguồn tự động ưu tiên; số Wi MCP chỉ bù phần lịch sử trước điểm đầu của nguồn tự động.', rows)

    B = js('data/bond-data.js')
    if B:
        rows = []
        for blk, nm in (('dep', 'Lãi suất huy động 12T từng ngân hàng'), ('fi', 'Trái phiếu ngân hàng phát hành (coupon, giá trị)'), ('cb', 'TPDN toàn thị trường: phát hành, đáo hạn, chậm trả'), ('gb', 'TPCP: đường cong, đấu thầu, khối ngoại'), ('oil', 'Giá xăng dầu trong nước'), ('big4', 'Tiền gửi Big 4 theo kỳ hạn')):
            v = B.get(blk) or {}
            ds = v.get('months') or v.get('d') or []
            r = rng(ds) if ds else None
            rows.append({'k': 'bond_' + blk, 'n': nm, 'src': (B.get('src') or {}).get(blk, 'Wi MCP')[:220], **(r or {'from': None, 'to': None, 'c': None, 'f': '—'})})
        grp('bond', 'Trái phiếu và lãi suất huy động', 'Ngành › Bức tranh ngành › Trái phiếu; Vĩ mô › Hàng hóa (xăng dầu)', 'data/bond-data.js', 'Wi MCP (wi_data_cbond, wi_data_gbond, wi_data_macro)', 'wi', '', rows)

    # ---------------- Ngành ngân hàng (sector-data)
    BQ = D['banks']['quarters']
    rows = [{'k': 'bank_' + m, 'n': {'nim': 'NIM (TTM)', 'cof': 'Chi phí vốn COF (TTM)', 'yea': 'Lợi suất tài sản sinh lãi YEA (TTM)', 'casa': 'CASA', 'credit': 'Dư nợ cho vay', 'creditYoY': 'Tăng trưởng tín dụng YoY', 'g2': 'Nợ nhóm 2', 'ldr': 'LDR (Wi)', 'llr': 'Bao phủ nợ xấu', 'npl': 'Nợ xấu', 'mcap': 'Vốn hoá', 'pb': 'P/B', 'pe': 'P/E', 'npYoY': 'LNST YoY', 'roa': 'ROA', 'roe': 'ROE', 'cir': 'CIR (TTM)'}.get(m, m) + ' · 26 ngân hàng',
             'src': 'Wi MCP ratio_bank, ratio_bank_ttm, ratio_common_ttm', 'from': BQ[0], 'to': BQ[-1], 'c': len(BQ), 'f': 'Quý'} for m in list(D['banks']['series']['VCB'].keys()) if m != 'group']
    P = D.get('ppopSector') or {}
    if P:
        rows.append({'k': 'ppopSector', 'n': 'LN trước dự phòng, dự phòng, LNST cộng 4 quý (26 NH)', 'src': P.get('src', 'Wi MCP fs_bank'), 'from': P['q'][0], 'to': P['q'][-1], 'c': len(P['q']), 'f': 'Quý'})
    PS = D.get('pbDailyS')
    if PS:
        rows.append({'k': 'pbDaily', 'n': f"P/B theo phiên ({len(PS['v']) - 1} ngân hàng + trung vị)", 'src': 'Wi MCP ratio_daily; trung vị: aggregate median:pb', **(rng(PS['d']) or {})})
    BI = js('data/backfill/bank_index.json') if False else json.loads((ROOT / 'data/backfill/bank_index.json').read_text(encoding='utf-8'))
    rows.append({'k': 'bankIdx', 'n': 'Chỉ số giá ngành Ngân hàng (cuối tháng)', 'src': BI.get('src', ''), **(rng(sorted(BI['m'])) or {})})
    VN = ROOT / 'data/backfill/vnindex_m.json'
    if VN.exists():
        v = json.loads(VN.read_text(encoding='utf-8')); rows.append({'k': 'vnindex', 'n': 'VN-Index (cuối tháng)', 'src': v['src'], **(rng(sorted(v['m'])) or {})})
    CS = D.get('consensus') or {}
    rows.append({'k': 'consensus', 'n': f"Giá mục tiêu, khuyến nghị, LNST dự phóng của CTCK ({len(CS.get('rows', []))} ngân hàng)", 'src': 'Wi MCP co_reports', 'from': None, 'to': D.get('latest', {}).get('priceDate'), 'c': sum(len(r.get('reports', [])) for r in CS.get('rows', [])), 'f': 'Theo báo cáo'})
    rows.append({'k': 'news', 'n': 'Tin tức ngân hàng', 'src': 'RSS CafeF, VnExpress; Wi MCP ai_news', 'from': None, 'to': None, 'c': len(D.get('news', [])), 'f': 'Ngày'})
    grp('sector', 'Ngành ngân hàng: chỉ số tài chính, định giá, đồng thuận', 'Ngành › Bức tranh ngành, So sánh ngân hàng, Consensus', 'data/sector-data.js',
        'Wi MCP (BCTC, chỉ số, giá theo phiên, báo cáo CTCK); giá và định giá mới nhất: VNDirect finfo API', 'wi_auto',
        'Chỉ số TTM = cộng 4 quý gần nhất / bình quân số dư. Trung vị nhóm = trung vị các ngân hàng trong nhóm (Big 4 gồm VCB, BID, CTG). Định giá ngành nối tự động: co giãn theo tổng vốn hoá / vốn chủ / lợi nhuận suy ra từ P/B, P/E từng ngân hàng.', rows)

    RR = D.get('regRatios')
    if RR:
        rr = [{'k': 'ldr22', 'n': 'LDR theo TT 22 ước tính (26 NH)', 'src': 'Wi MCP fs_bank, fs_bank_notes', 'from': RR['periods'][-1]['l'][:10], 'to': RR['periods'][0]['l'][:10], 'c': len(RR['rows']), 'f': 'Bán niên'},
              {'k': 'self22', 'n': 'Tỷ lệ an toàn ngân hàng tự công bố (LDR, vốn ngắn hạn cho vay TDH, dự trữ thanh khoản, chi trả 30 ngày)', 'src': 'Báo cáo thường niên, nghị quyết phát hành trái phiếu, bản tin IR (Cơ sở dữ liệu thông tin của Wi)', 'from': None, 'to': max((r['self'] or {}).get('asof') or '' for r in RR['rows']), 'c': sum(1 for r in RR['rows'] if r['self']), 'f': 'Năm / bán niên'}]
        e = (RR.get('err') or {}).get('ldr') or {}
        grp('reg', 'Tỷ lệ an toàn thanh khoản theo TT 22', 'Ngành › Chính sách · Quy định', 'data/backfill/reg_ratios.json, self_ratios.json', 'Wi MCP; tài liệu ngân hàng tự công bố', 'wi',
            f"L = cho vay KH − cho vay bằng vốn tài trợ, ủy thác. D = tiền gửi KH − vốn chuyên dùng − ký quỹ + hệ số × tiền gửi có kỳ hạn KBNN + giấy tờ có giá phát hành + tiền gửi và vay TCTD khác. LDR = L / D. Đối chiếu số tự công bố: lệch trung bình {e.get('mae')} điểm % ({e.get('w3')}/{e.get('n')} quan sát trong ±3 điểm %). Tỷ lệ vốn ngắn hạn chỉ dùng số tự công bố (ước tính từ thuyết minh kỳ hạn lệch 7–12 điểm %).", rr)

    # ---------------- Trang ngân hàng
    rows = []
    for t in ('ctg', 'vcb', 'bid', 'tcb', 'mbb', 'acb'):
        X = js(f'data/{t}-data.js')
        if not X:
            continue
        q = X.get('quarterly') or {}
        qs = q.get('q') or q.get('quarters') or [k for k in q] if isinstance(q, dict) else []
        pr = (X.get('price') or {}).get('series') or []
        rows.append({'k': t, 'n': f'{t.upper()}: BCTC quý, năm, giá điều chỉnh, P/B theo phiên, đồng thuận, sự kiện quyền', 'src': 'Wi MCP fs_bank, fs_bank_notes, ratio_daily, eod_adjust, co_reports, co_events, bank_car_tt41; tài liệu IR',
                     'from': pr[0]['d'] if pr else None, 'to': pr[-1]['d'] if pr else None, 'c': len(pr), 'f': 'Ngày (giá) · Quý (BCTC)'})
    grp('banks', 'Trang từng ngân hàng (CTG, VCB, BID, TCB, MBB, ACB, STB)', 'index.html, vcb.html, bid.html, tcb.html, mbb.html, acb.html, stb.html', 'data/<mã>-data.js', 'Wi MCP; tài liệu IR, BCTC của ngân hàng', 'wi',
        'P/B điều chỉnh theo sự kiện quyền: số cổ phiếu và vốn chủ tại mỗi ngày được tính lại khi có chia cổ tức cổ phiếu, phát hành thêm, phát hành riêng lẻ (cộng tiền thu về vào vốn chủ), cổ tức tiền (trừ vào vốn chủ); giá mục tiêu công bố trước ngày GDKHQ quy về cùng cơ sở: (P − cổ tức tiền + tỷ lệ quyền × giá phát hành) / (1 + tỷ lệ cổ phiếu mới).', rows)

    # ---------------- Chỉ số tự tính
    M = [
        ('IDX-FX, IDX-LIQ (khung kịch bản)', 'Vĩ mô › Kịch bản IDX', 'Mỗi thành phần chuẩn hoá z-score 36 tháng, nhân dấu theo hướng tác động; chỉ số = trung bình các đóng góp. Ô kịch bản = dấu của (IDX-FX, IDX-LIQ). Kiểm định với giá và lợi nhuận ngân hàng: không đạt.'),
        ('Kiểm định khung kịch bản', 'Vĩ mô › Kịch bản IDX', 'Giá: lợi nhuận chỉ số ngành 3 và 6 tháng sau tháng tín hiệu; vượt trội = so VN-Index; đúng hướng = dấu kỳ vọng × kết quả > 0, so với cách đoán "luôn tăng". Lợi nhuận: tăng trưởng LNST 4 quý trong 2 quý sau.'),
        ('Truyền dẫn giá dầu, heo hơi → CPI', 'Vĩ mô › Catalyst · Risk', 'Độ trễ = k có tương quan lớn nhất giữa y_t và x_{t−k} (k = 0..12). Hồi quy trễ phân phối y_t = a + Σ b_k x_{t−k}; truyền dẫn tích lũy = Σ b_k; sai số chuẩn Newey-West 12 trễ. Đóng góp hiện tại = Σ b_k × x hiện tại; quy ra CPI chung theo tỷ trọng rổ 2020.'),
        ('Chênh vàng SJC − thế giới', 'Vĩ mô › Catalyst · Risk', 'SJC (nghìn đồng/lượng) / (vàng thế giới USD/ounce × 1,20565 ounce/lượng × tỷ giá NHTM bán ra / 1.000) − 1.'),
        ('Mức rủi ro (Cao / Trung bình / Thấp)', 'Catalyst · Risk (Vĩ mô và Ngành)', 'Quy ước FinSuccess theo số hiện tại và xu hướng; với lạm phát: đóng góp vào CPI chung > 1 điểm % là cao, 0,5–1 là trung bình.'),
        ('COF theo cơ cấu nguồn vốn', 'Ngành › Catalyst · Risk', 'Trọng số = tỷ trọng tiền gửi KH, liên ngân hàng, giấy tờ có giá, nợ Chính phủ/NHNN trong nợ chịu lãi của từng nhóm (fs_bank bs330, bs320, bs360, bs310 quý mới nhất).'),
        ('Mô phỏng xếp hạng TT 21 và room tín dụng', 'Ngành › Xếp hạng TT21 & room', 'Chấm phần định lượng CAMELS theo TT 21/2025 từ BCTC (vốn, tài sản, thanh khoản, lợi nhuận, nhạy cảm lãi suất); phần định tính dùng giá trị mặc định, người dùng chỉnh được.'),
        ('P/B tại giá mục tiêu', 'Consensus, trang ngân hàng', 'Giá mục tiêu trung vị / BVPS hiện tại (ngành) hoặc / BVPS 2026F (trang ngân hàng). Nét đứt trên chart = đi tuyến tính từ P/B hiện tại tới P/B tại giá mục tiêu vào 31/12.'),
        ('Thu nhập dịch vụ theo mảng', 'Ngành › Bức tranh ngành', 'Cộng thu nhập, chi phí từng mảng phí (thanh toán, bảo hiểm, thẻ, ngân quỹ…) theo thuyết minh BCTC năm của 26 ngân hàng.'),
        ('Chu kỳ ngành (nền màu)', 'Ngành › Tổng quan', 'Phân giai đoạn Nới lỏng, Phục hồi, Thắt chặt, Xử lý nợ theo diễn biến lãi suất điều hành, tín dụng và nợ xấu; biên tập bởi FinSuccess.'),
        ('Taylor rule Mỹ', 'Vĩ mô › Quốc tế › Mỹ', 'V1 = r* + π + 0,5(π − 2) + 0,5 × lệch sản lượng; V2 dùng −2 × lệch thất nghiệp (Okun).'),
    ]
    pipes = [
        ('fetch-global', '06:17 hằng ngày; 16:47 ngày làm việc', 'fetch_global, fetch_ust, fetch_jp, fetch_jgb_auct, fetch_daily, fetch_fedwatch, fetch_ois, fetch_calendar, fetch_dlkt, fetch_market, fetch_cmd, fetch_hm_hist → build_global, build_calendar, build_auto, build_eco, build_hm_hist, build_cmd, vimo_risk_models, build_catalog', 'Commit số mới và deploy lại trang'),
        ('fetch-sbv', '09:23 hằng ngày', 'fetch_sbv (NHNN: M2, tiền gửi, tín dụng theo ngành, LDR, nợ xấu)', 'Lưu dồn theo tháng tham chiếu'),
        ('fetch-vira', '17:47 ngày làm việc', 'fetch_vira (OCR bảng VIRA) → build_vira', 'Commit và deploy'),
        ('pages', 'Khi có commit hoặc gọi tay', 'Dựng trang tĩnh, xuất PDF bản cập nhật nhanh', 'GitHub Pages'),
        ('Wi MCP (trong phiên AI)', 'Khi có kỳ mới / theo yêu cầu', 'wi_capture_transcript → build_sector_data, build_ctg_data --ticker <mã>, build_bond_data, reg_ratios, idx_bank_backtest', 'Commit dữ liệu dẫn xuất; dữ liệu gốc không đưa lên kho'),
    ]
    n = sum(len(g['series']) for g in groups)
    out = {'built': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'), 'n': n, 'groups': groups, 'methods': [{'n': a, 'where': b, 'f': c} for a, b, c in M],
           'pipes': [{'n': a, 'when': b, 'what': c, 'out': d} for a, b, c, d in pipes], 'upd': UPD}
    (ROOT / 'data/catalog.js').write_text('window.CATALOG=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    print('catalog', n, 'chuỗi,', len(groups), 'nhóm')


if __name__ == '__main__':
    main()
