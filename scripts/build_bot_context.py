#!/usr/bin/env python3
"""Gói dữ liệu dashboard thành data/bot-context.json cho trang Trợ lý AI.

Trợ lý đọc file này qua các công cụ (list_data, get_series, get_banks, get_section),
nên giữ đủ chi tiết nhưng gọn: chuỗi tháng 36 kỳ gần nhất, chuỗi ngày 120 phiên,
dữ liệu ngân hàng theo quý, các bảng tổng hợp của dashboard.
Nguồn ghi theo cơ quan công bố gốc, không ghi nhà cung cấp dữ liệu trung gian.
"""
import json, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = json.loads((ROOT / 'data/sector-data.json').read_text())


def load_js(p):
    s = (ROOT / p).read_text()
    return json.loads(s[s.index('{'):s.rstrip().rstrip(';').rindex('}') + 1])


G = load_js('data/global-data.js')
V = load_js('data/vira-data.js')

M_LAST, D_LAST = 36, 120
series = {}


def add(key, label, unit, freq, src, pts):
    pts = [p for p in pts if p[1] is not None]
    if not pts:
        return
    pts = pts[-(D_LAST if freq == 'ngày' else M_LAST):]
    series[key] = {'label': label, 'unit': unit, 'freq': freq, 'src': src,
                   'last': pts[-1], 'pts': [[d, round(v, 4) if isinstance(v, float) else v] for d, v in pts]}


# ---- trong nước (sector-data.dom) ----
DOM = {
    'creditYtd': ('Tín dụng toàn hệ thống, % so với cuối năm trước (YTD)', '%', 'tháng', 'NHNN'),
    'creditYoY': ('Tín dụng toàn hệ thống, % so với cùng kỳ (YoY)', '%', 'tháng', 'NHNN'),
    'depYoY': ('Tiền gửi khách hàng tại TCTD, % YoY', '%', 'tháng', 'NHNN'),
    'depHH': ('Tiền gửi dân cư, % YoY', '%', 'tháng', 'NHNN'),
    'depCorp': ('Tiền gửi tổ chức kinh tế, % YoY', '%', 'tháng', 'NHNN'),
    'm2': ('Cung tiền M2, % YoY', '%', 'tháng', 'NHNN'),
    'cpi': ('CPI Việt Nam, % YoY', '%', 'tháng', 'Cục Thống kê'),
    'cpiCore': ('Lạm phát cơ bản Việt Nam, % YoY', '%', 'tháng', 'Cục Thống kê'),
    'cpiAvg': ('CPI bình quân từ đầu năm, % YoY', '%', 'tháng', 'Cục Thống kê'),
    'reserves': ('Dự trữ ngoại hối (triệu USD)', 'triệu USD', 'tháng', 'IMF IFS'),
    'trade': ('Cán cân thương mại hàng hoá (triệu USD)', 'triệu USD', 'tháng', 'Cục Thống kê, Cục Hải quan'),
    'fdi': ('FDI giải ngân (triệu USD)', 'triệu USD', 'tháng', 'Cục Thống kê'),
    'revQ': ('Thu NSNN theo quý (tỷ đồng)', 'tỷ đồng', 'quý', 'Bộ Tài chính'),
    'expQ': ('Chi NSNN theo quý (tỷ đồng)', 'tỷ đồng', 'quý', 'Bộ Tài chính'),
    'nhtmSell': ('USD/VND bán ra NHTM (cuối tháng, điểm cuối = mới nhất)', 'đồng', 'tháng', 'Vietcombank'),
    'free': ('USD/VND thị trường tự do', 'đồng', 'tháng', 'khảo sát thị trường'),
    'central': ('Tỷ giá trung tâm NHNN', 'đồng', 'tháng', 'NHNN'),
    'ceiling': ('Trần tỷ giá (trung tâm +5%)', 'đồng', 'tháng', 'NHNN'),
    'sbvSell': ('Giá bán USD can thiệp của NHNN', 'đồng', 'tháng', 'NHNN'),
    'on': ('Lãi suất liên ngân hàng VND qua đêm (cuối tháng)', '%', 'tháng', 'NHNN'),
    'omo': ('Lãi suất OMO', '%', 'tháng', 'NHNN'),
    'net': ('Bơm/hút ròng OMO + tín phiếu (tỷ đồng, cuối tháng)', 'tỷ đồng', 'tháng', 'NHNN'),
    'dep12State': ('Lãi suất huy động 12 tháng — Big 4', '%', 'tháng', 'niêm yết các ngân hàng'),
    'dep12Large': ('Lãi suất huy động 12 tháng — tư nhân lớn', '%', 'tháng', 'niêm yết các ngân hàng'),
    'dep12Other': ('Lãi suất huy động 12 tháng — ngân hàng khác', '%', 'tháng', 'niêm yết các ngân hàng'),
    'onDaily': ('Lãi suất qua đêm VND theo ngày', '%', 'ngày', 'NHNN'),
    'netDaily': ('Bơm/hút ròng OMO theo ngày (tỷ đồng)', 'tỷ đồng', 'ngày', 'NHNN'),
}
for k, (lab, u, f, src) in DOM.items():
    v = D['dom'].get(k)
    if isinstance(v, list):
        add('vn.' + k, lab, u, f, src, [(p['d'][:10], p['v']) for p in v])

# ---- quốc tế (global-data.s) ----
SRC = {'us': 'BLS, BEA, Fed, U.S. Treasury', 'ea': 'ECB, Eurostat', 'jp': 'BOJ, MOF Nhật, Cục Thống kê Nhật', 'cn': 'PBOC, NBS',
       'de': 'Bundesbank', 'vn': 'NHNN', 'cb': 'Fed, ECB, BOJ', 'dx': 'ECB (tính DXY theo công thức ICE)'}
lab = dict(G.get('label', {}))
lab.update({'jp_cpi_main': 'CPI Nhật (các thước đo chính)', 'us_payems_chg': 'Việc làm phi nông nghiệp Mỹ, thay đổi (nghìn)',
    'cb_fed': 'Tổng tài sản Fed', 'cb_ecb': 'Tổng tài sản ECB', 'cb_boj': 'Tổng tài sản BOJ', 'tgcr_iorb': 'TGCR trừ IORB (bps)',
    'sofr_iorb': 'SOFR trừ IORB (bps)', 'sofr99_iorb': 'SOFR phân vị 99 trừ IORB (bps)', 'tsy_def12': 'Thâm hụt NS Mỹ 12 tháng',
    'tsy_def_m': 'Thâm hụt NS Mỹ theo tháng', 'jp_res_mof': 'Dự trữ ngoại hối Nhật (MOF)', 'jp_res_imf': 'Dự trữ ngoại hối Nhật (IMF)',
    'ea_assets_w': 'Tổng tài sản Eurosystem (tuần)', 'us_3m_d': 'Lợi suất TPCP Mỹ 3 tháng %', 'us_30y_d': 'Lợi suất TPCP Mỹ 30 năm %',
    'us_2y_d': 'Lợi suất TPCP Mỹ 2 năm %', 'us_10y_d': 'Lợi suất TPCP Mỹ 10 năm %', 'jp_2y_d': 'Lợi suất JGB 2 năm %',
    'jp_5y_d': 'Lợi suất JGB 5 năm %', 'jp_10y_d': 'Lợi suất JGB 10 năm %', 'jp_30y_d': 'Lợi suất JGB 30 năm %', 'dxy_d': 'Chỉ số USD (DXY)',
    'vn_sbv_central_d': 'Tỷ giá trung tâm NHNN (ngày)', 'vn_sbv_ceil_d': 'Trần tỷ giá (ngày)', 'vn_sbv_floor_d': 'Sàn tỷ giá (ngày)',
    'vn_sbv_buy_d': 'Giá mua USD của Sở giao dịch NHNN', 'vn_sbv_sell_d': 'Giá bán USD của Sở giao dịch NHNN',
    'usdvnd_vcb_sell': 'USD/VND bán ra Vietcombank', 'usdvnd_vcb_buy': 'USD/VND mua vào Vietcombank',
    'us_jp_10y_d': 'Chênh lệch lợi suất 10 năm Mỹ − Nhật', 'ea_aaa_10y_d': 'Lợi suất 10 năm TPCP khu vực euro hạng AAA %',
    'ea_all_10y_d': 'Lợi suất 10 năm TPCP khu vực euro (toàn bộ) %', 'cn_2y_d': 'Lợi suất TPCP Trung Quốc 2 năm %',
    'cn_10y_d': 'Lợi suất TPCP Trung Quốc 10 năm %', 'cn_30y_d': 'Lợi suất TPCP Trung Quốc 30 năm %',
    'sg_10y_d': 'Lợi suất TPCP Singapore 10 năm %', 'tw_10y_d': 'Lợi suất TPCP Đài Loan 10 năm %', 'kr_10y_d': 'Lợi suất TPCP Hàn Quốc 10 năm %',
    'us_effr_d': 'Lãi suất quỹ liên bang hiệu dụng (EFFR) %', 'us_wti_d': 'Giá dầu WTI USD/thùng', 'us_brent_d': 'Giá dầu Brent USD/thùng',
    'de_10y_d': 'Lợi suất Bund Đức 10 năm %'})
SRCK = {'cn_': 'ChinaBond', 'kr_': 'Ngân hàng Trung ương Hàn Quốc', 'sg_': 'MAS', 'tw_': 'TPEx', 'us_jp': 'U.S. Treasury, MOF Nhật',
        'dxy': 'ECB (tính DXY theo công thức ICE)', 'vn_': 'NHNN', 'usdvnd': 'Vietcombank', 'cpi_': 'các cơ quan thống kê quốc gia', 'y10_': 'OECD'}
for k, s in G['s'].items():
    if k.endswith('_m3'):
        continue
    d, v = s.get('d'), s.get('v')
    if not d or not v:
        continue
    daily = k.endswith('_d') or len(d[-1]) == 10
    base = k.rsplit('_', 1)[0] if k.rsplit('_', 1)[-1] in ('yoy', 'mom', 'd', 'm') else k
    name = lab.get(k) or lab.get(base) or k
    suf = {'yoy': ' (% YoY)', 'mom': ' (% MoM)'}.get(k.rsplit('_', 1)[-1], '')
    add('g.' + k, name + suf, s.get('u', ''), 'ngày' if daily else 'tháng', next((v2 for p2, v2 in SRCK.items() if k.startswith(p2)), SRC.get(k[:2], '')), list(zip(d, v)))

# ---- VIRA: lãi suất liên ngân hàng VND/USD theo kỳ hạn ----
for cur, nm in (('vnd', 'VND'), ('usd', 'USD')):
    for ten, arr in V.get(cur, {}).items():
        add(f'vira.{cur}.{ten}', f'Lãi suất liên ngân hàng {nm} kỳ hạn {ten} (bình quân giao dịch)', '%', 'ngày',
            'VIRA Market Watch, NHNN', list(zip(V['d'], arr)))

# ---- ngân hàng theo quý ----
B = D['banks']
banks = {'quarters': B['quarters'], 'metrics': {
    'nim': 'NIM %', 'cof': 'Chi phí vốn %', 'yea': 'Lợi suất tài sản sinh lãi %', 'cir': 'CIR %', 'casa': 'CASA %',
    'credit': 'Dư nợ tín dụng (tỷ đồng)', 'creditYoY': 'Tín dụng % YoY', 'g2': 'Nợ nhóm 2 %', 'npl': 'Nợ xấu %',
    'llr': 'Bao nợ xấu %', 'ldr': 'LDR %', 'mcap': 'Vốn hoá (tỷ đồng)', 'pb': 'P/B', 'pe': 'P/E', 'npYoY': 'LNST % YoY',
    'roa': 'ROA %', 'roe': 'ROE %'}, 'series': B['series']}

# ---- xếp hạng TT21 (tóm tắt) ----
cm = D['camel']
camel = {'roomCoef': cm['roomCoef'], 'qualDefault': cm['qualDefault'], 'priority': cm['priority'],
         'crit': cm['crit'], 'periods': {}}
for pk, P in cm['periods'].items():
    camel['periods'][pk] = {'label': P['label'], 'rows': [
        {'s': r['s'], 'big': r['big'], 'crit': {k: c['pt'] for k, c in r['crit'].items()}, 'quant': r['quant']['pt'],
         'total': r['total'], 'grade': r['grade'], 'room': r['room'], 'creditYtd': r.get('creditYtd'),
         'v': {k: x['v'] for k, x in r['v'].items()}} for r in P['rows']]}

qu = D['quick']['updates']
sections = {
    'meta': {k: v for k, v in D['meta'].items() if k != 'note'},
    'latest': D['latest'],
    'agg': D['agg'],
    'secVal': {k: v for k, v in D['secVal'].items() if k != 'monthly'} | {'monthly': D['secVal'].get('monthly', [])[-24:]},
    'ppopSector': D['ppopSector'],
    'consensus': {'from': D['consensus']['from'], 'to': D['consensus']['to'],
                  'rows': [{k: r.get(k) for k in ('s', 'group', 'n', 'nTP', 'buy', 'hold', 'sell', 'tpMed', 'tpMin', 'tpMax', 'upside', 'np26', 'peFwd', 'pbTP', 'latest')} for r in D['consensus']['rows']]},
    'ldrSens': D['ldrSens'],
    'camel': camel,
    'reg': D['reg'],
    'sbvPolicy': D['sbv']['current'],
    'sbvEvents': D['sbv']['events'][:25],
    'idx': {'now': D['idx']['now'], 'history': D['idx']['history'][-24:]},
    'signals': D['signals'],
    'events': D['events'],
    'quick': [{k: u.get(k) for k in ('id', 'date', 'headline', 'vsPrev', 'summary', 'kpis', 'concerns', 'watch')} for u in qu[:2]],
    'news': D['news'][:30],
}

out = {'built': datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).strftime('%Y-%m-%d %H:%M'),
       'dataAsOf': D['meta'].get('updated'), 'series': series, 'banks': banks, 'sections': sections}
p = ROOT / 'data/bot-context.json'
p.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
print(p, round(p.stat().st_size / 1024), 'KB,', len(series), 'chuỗi')
