"""data/global/series.json (nguồn public) → data/global-data.js (window.GLOBAL_DATA) cho tab Quốc tế.

Tính: YoY / MoM / 3 tháng quy năm từ chỉ số giá, Taylor rule (V1 lệch GDP, V2 lệch thất nghiệp × Okun −2),
bậc thang thanh khoản Mỹ, quy đổi tài sản NHTW sang tỷ USD. Không dùng WiData.
"""
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
S = json.loads((ROOT / 'data/global/series.json').read_text(encoding='utf-8'))
SER = S['series']
DAILY_FROM = '2023-07-01'


def obs(k):
    out = []
    for d, v in SER.get(k, {}).get('obs', []):
        try:
            out.append((d, float(v)))
        except (TypeError, ValueError):
            pass
    return out


def monthly(k, how='last'):
    """gom về tháng: 'last' (cuối tháng) hoặc 'avg'."""
    b = {}
    for d, v in obs(k):
        b.setdefault(d[:7], []).append(v)
    return {m: (sum(x) / len(x) if how == 'avg' else x[-1]) for m, x in sorted(b.items())}


def shift(m, n):
    y, mo = int(m[:4]), int(m[5:7]) + n
    while mo <= 0:
        y, mo = y - 1, mo + 12
    while mo > 12:
        y, mo = y + 1, mo - 12
    return f'{y:04d}-{mo:02d}'


def chg(series, lag, ann=None):
    out = {}
    for m, v in series.items():
        p = series.get(shift(m, -lag))
        if p:
            out[m] = round(((v / p) ** ann - 1) * 100 if ann else (v / p - 1) * 100, 2)
    return out


def pack(dct, digits=2):
    ks = sorted(dct)
    return {'d': ks, 'v': [None if dct[k] is None else round(float(dct[k]), digits) for k in ks]}


def ffill_q(qser, months):
    """chuỗi quý (ngày đầu quý) → tháng, giữ giá trị trong quý."""
    out, last = {}, None
    qm = {d[:7]: v for d, v in qser}
    for m in months:
        q0 = f'{m[:4]}-{((int(m[5:7]) - 1) // 3) * 3 + 1:02d}'
        if q0 in qm:
            last = qm[q0]
        out[m] = last
    return out


G = {'fetched': S['fetched'], 'src': {k: SER[k]['src'] for k in SER}, 'label': {k: SER[k]['label'] for k in SER}, 's': {}, 'stale': [k for k in SER if SER[k].get('stale')]}
put = lambda k, dct, dg=2: G['s'].__setitem__(k, pack(dct, dg))

# ---------------- giá: chỉ số → YoY, 3M quy năm, MoM
IDX = ['us_cpi', 'us_cpi_core', 'us_cpi_shelter', 'us_cpi_coregoods', 'us_cpi_svc_ex_energy', 'us_cpi_supercore', 'us_cpi_energy', 'us_cpi_food',
       'us_pce', 'us_pce_core', 'us_pce_supercore', 'us_pce_goods', 'us_pce_services', 'us_ppi_fd', 'us_ppi_core', 'us_ppi_inter', 'us_ppi_crude',
       'us_ahe', 'us_casehiller', 'jp_cpi_idx', 'jp_cpi_xff_idx', 'jp_cpi_xffe_idx']
for k in IDX:
    m = monthly(k)
    if not m:
        continue
    put(k + '_yoy', {kk: v for kk, v in chg(m, 12).items() if kk >= '2012'})
    put(k + '_m3', {kk: v for kk, v in chg(m, 3, 4).items() if kk >= '2019'})
    put(k + '_mom', {kk: v for kk, v in chg(m, 1).items() if kk >= '2019'})
# chuỗi đã là % YoY
for k in ['us_pce_trim', 'ea_hicp', 'ea_hicp_core', 'ea_hicp_serv', 'jp_cpi', 'cn_cpi', 'cn_ppi', 'us_unrate', 'ea_unrate', 'us_breakeven5']:
    if k in SER:
        put(k, monthly(k, 'avg' if k == 'us_breakeven5' else 'last'))
# CPI Nhật: ưu tiên chuỗi Cục Thống kê (chỉ số) nếu mới hơn
if 'jp_cpi_idx_yoy' in G['s']:
    G['s']['jp_cpi_main'] = G['s']['jp_cpi_idx_yoy']
elif 'jp_cpi' in G['s']:
    G['s']['jp_cpi_main'] = G['s']['jp_cpi']

# ---------------- lao động
pay = monthly('us_payems')
put('us_payems_chg', {m: v - pay[shift(m, -1)] for m, v in pay.items() if shift(m, -1) in pay and m >= '2015'}, 0)
put('us_claims', {d: v / 1000 for d, v in obs('us_claims') if d >= '2022'}, 0)
put('us_jolts', {m: v / 1000 for m, v in monthly('us_jolts').items() if m >= '2015'}, 2)

# ---------------- lãi suất (ngày, từ 2021) và tháng (dài)
for k in ['us_effr', 'us_fedtgt_up', 'us_fedtgt_lo', 'us_iorb', 'us_sofr', 'us_tgcr', 'us_sofr99', 'us_2y', 'us_10y', 'ea_dfr', 'eurusd', 'usdjpy', 'usdcny', 'us_dxy', 'us_rrp', 'us_repo']:
    if k in SER:
        put(k + '_d', {d: v for d, v in obs(k) if d >= DAILY_FROM}, 4 if k.startswith('usd') or k == 'eurusd' else 3)
for k in ['us_effr', 'us_2y', 'us_10y', 'ea_dfr', 'de_10y', 'jp_10y', 'jp_rate', 'cn_rate', 'us_wti', 'us_brent', 'usdjpy', 'eurusd', 'usdcny']:
    if k in SER:
        put(k + '_m', monthly(k, 'avg'), 3)

# ---------------- bảng cân đối NHTW (tỷ USD) và thanh khoản Mỹ (tỷ USD, theo tuần)
wk = lambda k, div: {d: v / div for d, v in obs(k) if d >= '2020'}
put('us_walcl', wk('us_walcl', 1000), 0)
put('us_reserves', wk('us_reserves', 1000), 0)
put('us_tga', wk('us_tga', 1000), 0)
put('us_bills', wk('us_bills', 1000), 0)
eur, jpy = monthly('eurusd', 'avg'), monthly('usdjpy', 'avg')
put('cb_fed', {m: v / 1000 for m, v in monthly('us_walcl').items() if m >= '2010'}, 0)
put('cb_ecb', {m: v / 1000 * eur[m] for m, v in monthly('ea_assets').items() if m >= '2010' and m in eur}, 0)
put('cb_boj', {m: v * 1e8 / jpy[m] / 1e9 for m, v in monthly('jp_assets').items() if m >= '2010' and m in jpy}, 0)

# ---------------- bậc thang thanh khoản (giá trị mới nhất + kỳ trước)
def last2(k):
    o = obs(k)
    return (o[-1], o[-2]) if len(o) >= 2 else (None, None)
def spread(a, b):   # bps, căn theo ngày chung
    da, db = dict(obs(a)), dict(obs(b))
    common = sorted(set(da) & set(db))
    return [(d, round((da[d] - db[d]) * 100, 1)) for d in common]
lad = []
for key, name, ref, unit, kind in [
        ('us_rrp', 'Khối lượng ON RRP', '> 1.000 thừa · ≈ 0 cạn đệm', 'tỷ USD', 'level'),
        ('tgcr_iorb', 'Chênh lệch TGCR − IORB', '< −7 thừa · ≥ 0 khát vốn', 'bps', 'spread'),
        ('sofr_iorb', 'Chênh lệch SOFR − IORB', '< 0 bình thường · > 0 tắc nghẽn', 'bps', 'spread'),
        ('sofr99_iorb', 'SOFR phân vị 99 − IORB', '< 5 bình thường · > 10 căng', 'bps', 'spread'),
        ('us_repo', 'Repo thường trực (SRF) sử dụng', '0 bình thường · tăng = căng', 'tỷ USD', 'level'),
        ('us_reserves', 'Dự trữ NH tại Fed', '> 3.000 dồi dào · < 2.800 sát ngưỡng', 'tỷ USD', 'level'),
        ('bills4w', 'Fed mua ròng tín phiếu 4 tuần (RMP)', '< 0 QT · > 0 đang bơm', 'tỷ USD', 'delta')]:
    if kind == 'spread':
        a, b = {'tgcr_iorb': ('us_tgcr', 'us_iorb'), 'sofr_iorb': ('us_sofr', 'us_iorb'), 'sofr99_iorb': ('us_sofr99', 'us_iorb')}[key]
        sp = spread(a, b)
        if len(sp) >= 6:
            lad.append({'k': key, 'n': name, 'd': sp[-1][0], 'v': sp[-1][1], 'p': sp[-6][1], 'ref': ref, 'u': unit})
            put(key, {d: v for d, v in sp if d >= DAILY_FROM}, 1)
    elif kind == 'delta':
        o = obs('us_bills')
        if len(o) >= 5:
            lad.append({'k': key, 'n': name, 'd': o[-1][0], 'v': round((o[-1][1] - o[-5][1]) / 1000, 1), 'p': round((o[-2][1] - o[-6][1]) / 1000, 1) if len(o) >= 6 else None, 'ref': ref, 'u': unit})
    else:
        o = obs(key)
        if len(o) >= 6:
            div = 1000 if key == 'us_reserves' else 1
            lad.append({'k': key, 'n': name, 'd': o[-1][0], 'v': round(o[-1][1] / div, 1), 'p': round(o[-6][1] / div, 1), 'ref': ref, 'u': unit})
G['ladder'] = lad

# ---------------- Taylor rule (π* = 2, α = β = 0,5, Okun −2; r* = HLW)
pce_core = chg(monthly('us_pce_core'), 12)
trim = monthly('us_pce_trim')
months = [m for m in sorted(pce_core) if m >= '2012-01']
rstar = ffill_q(obs('us_rstar'), months)
gdp = {d[:7]: v for d, v in obs('us_gdp')}
pot = {d[:7]: v for d, v in obs('us_gdppot')}
gap_q = [(d + '-01', (gdp[d] / pot[d] - 1) * 100) for d in sorted(gdp) if d in pot]
gap1 = ffill_q(gap_q, months)
un, nr = monthly('us_unrate'), ffill_q(obs('us_nrou'), months)
ffr = monthly('us_effr', 'avg')
tay = {k: {} for k in ['pi', 'pi_trim', 'rstar', 'gap1', 'ugap', 'v1', 'v2', 'v1_trim', 'v2_trim', 'ffr']}
for m in months:
    pi, rs, g1 = pce_core.get(m), rstar.get(m), gap1.get(m)
    u, n = un.get(m), nr.get(m)
    g2 = -2 * (u - n) if u is not None and n is not None else None
    tay['pi'][m], tay['rstar'][m], tay['gap1'][m], tay['ffr'][m] = pi, rs, g1, ffr.get(m)
    tay['pi_trim'][m] = trim.get(m)
    tay['ugap'][m] = (u - n) if u is not None and n is not None else None
    for tag, p in [('', pi), ('_trim', trim.get(m))]:
        if None not in (p, rs):
            tay['v1' + tag][m] = rs + p + 0.5 * (p - 2) + 0.5 * g1 if g1 is not None else None
            tay['v2' + tag][m] = rs + p + 0.5 * (p - 2) + 0.5 * g2 if g2 is not None else None
G['taylor'] = {k: pack({m: v for m, v in d.items() if v is not None}) for k, d in tay.items()}
G['taylor']['params'] = {'piStar': 2, 'alpha': 0.5, 'beta': 0.5, 'okun': -2}

js = 'window.GLOBAL_DATA = ' + json.dumps(G, ensure_ascii=False, separators=(',', ':')) + ';\n'
(ROOT / 'data/global-data.js').write_text(js, encoding='utf-8')
print(f'wrote data/global-data.js ({len(js) // 1024} KB), {len(G["s"])} chuỗi')
