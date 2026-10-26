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
DAILY_FROM = '2021-01-01'   # chuỗi ngày giữ tối thiểu 5 năm


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
# PPI Trung Quốc: bù các tháng nguồn tự động thiếu bằng file bù (data/backfill/cn_ppi.json)
_bf = ROOT / 'data/backfill/cn_ppi.json' if 'ROOT' in globals() else None
if _bf and _bf.exists():
    _b = json.loads(_bf.read_text(encoding='utf-8'))['cn_ppi']
    _cur = dict(zip(G['s'].get('cn_ppi', {}).get('d', []), G['s'].get('cn_ppi', {}).get('v', [])))
    for _k, _v in _b.items():
        if _cur.get(_k) is None:
            _cur[_k] = _v
    put('cn_ppi', {k: v for k, v in _cur.items() if v is not None})
# CPI Nhật: ưu tiên chuỗi Cục Thống kê (chỉ số) nếu mới hơn
if 'jp_cpi_idx_yoy' in G['s']:
    G['s']['jp_cpi_main'] = G['s']['jp_cpi_idx_yoy']
elif 'jp_cpi' in G['s']:
    G['s']['jp_cpi_main'] = G['s']['jp_cpi']

# ---------------- lao động
pay = monthly('us_payems')
put('us_payems_chg', {m: v - pay[shift(m, -1)] for m, v in pay.items() if shift(m, -1) in pay and m >= '2015'}, 0)
put('us_claims', {d: v / 1000 for d, v in obs('us_claims') if d >= DAILY_FROM[:4]}, 0)
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

# ---------------- Mỹ: cấu phần bảng cân đối Fed (tỷ USD, theo tuần, từ 2019)
def wk2(k, frm='2019-01-01'):
    return {d: v / 1000 for d, v in obs(k) if d >= frm}
fa = {k: wk2(s_) for k, s_ in [('total', 'us_walcl'), ('bills', 'us_bills'), ('notes', 'fed_notes'), ('tips', 'fed_tips'), ('tipsic', 'fed_tips_ic'), ('mbs', 'fed_mbs'), ('loans', 'fed_loans'),
                               ('cur', 'fed_currency_wed' if 'fed_currency_wed' in SER else 'fed_currency'), ('res', 'fed_res_wed' if 'fed_res_wed' in SER else 'us_reserves'),
                               ('tga', 'fed_tga_wed' if 'fed_tga_wed' in SER else 'us_tga'), ('rrp', 'fed_rrp_all'), ('fima', 'fed_repo_fima'), ('srf', 'fed_repo_oth')]}
if fa['total'] and fa['notes']:
    ds = [d for d in sorted(fa['total']) if all(d in fa[k] for k in ['bills', 'notes', 'mbs'])]
    g = lambda k, d: fa[k].get(d) or 0
    G['fedbs'] = {'d': ds,
                  'a': {'Tín phiếu (bills)': [round(g('bills', d)) for d in ds], 'Trái phiếu notes & bonds': [round(g('notes', d)) for d in ds],
                        'TIPS (gồm bù lạm phát)': [round(g('tips', d) + g('tipsic', d)) for d in ds], 'MBS': [round(g('mbs', d)) for d in ds], 'Cho vay': [round(g('loans', d)) for d in ds],
                        'Repo FIMA (nước ngoài)': [round(g('fima', d), 1) for d in ds], 'Repo SRF (trong nước)': [round(g('srf', d), 1) for d in ds],
                        'Khác': [round(g('total', d) - g('bills', d) - g('notes', d) - g('tips', d) - g('tipsic', d) - g('mbs', d) - g('loans', d) - g('fima', d) - g('srf', d)) for d in ds]},
                  'l': {'Tiền mặt lưu hành': [round(g('cur', d)) for d in ds], 'Dự trữ NH': [round(g('res', d)) for d in ds], 'TGA (Kho bạc)': [round(g('tga', d)) for d in ds],
                        'Reverse repo': [round(g('rrp', d)) for d in ds],
                        'Khác (gồm vốn)': [max(0, round(g('total', d) - g('cur', d) - g('res', d) - g('tga', d) - g('rrp', d))) for d in ds]}}

# ---------------- Mỹ: UST Fed nắm theo thời gian còn lại đến đáo hạn (H.4.1 bảng 2, tỷ USD, thứ Tư)
MAT = [('fed_tm15', '≤15 ngày'), ('fed_tm90', '16–90 ngày'), ('fed_tm1y', '91 ngày–1 năm'), ('fed_tm5y', '1–5 năm'), ('fed_tm10y', '5–10 năm'), ('fed_tmlong', 'Trên 10 năm')]
mt = {lab: wk2(k) for k, lab in MAT if obs(k)}
if len(mt) == len(MAT):
    dm = sorted(set.intersection(*[set(x) for x in mt.values()]))
    G['fedMat'] = {'d': dm, 'm': {lab: [round(x[d]) for d in dm] for lab, x in mt.items()}}
fr = {k: wk2(k) for k in ['fed_repo_fima', 'fed_repo_oth'] if obs(k)}
if fr:
    dr = sorted(set().union(*[set(x) for x in fr.values()]))
    G['fedRepo'] = {'d': dr, 'fima': [round(fr.get('fed_repo_fima', {}).get(d, 0), 2) for d in dr], 'srf': [round(fr.get('fed_repo_oth', {}).get(d, 0), 2) for d in dr]}

# ---------------- Mỹ: ai nắm UST (Z.1, tỷ USD, quý)
HOLD = [('ust_fed', 'Fed'), ('ust_row', 'Nước ngoài'), ('ust_banks', 'Ngân hàng Mỹ'), ('ust_mmf', 'Quỹ thị trường tiền tệ'), ('ust_mf', 'Quỹ tương hỗ'),
        ('ust_etf', 'ETF'), ('ust_hh', 'Hộ gia đình (gồm quỹ phòng hộ)'), ('ust_pension', 'Quỹ hưu trí (tư nhân và công)'),
        ('ust_ins', 'Bảo hiểm'), ('ust_slg', 'Chính quyền bang, địa phương'), ('ust_broker', 'Công ty chứng khoán'), ('ust_nfc', 'Doanh nghiệp phi tài chính'), ('ust_gse', 'GSE')]
tot = {d[:7]: v / 1000 for d, v in obs('ust_total')}
sc = lambda k: 1 if SER.get(k, {}).get('src', '').startswith('fred:FDH') else 1000   # FDHBFIN/FDHBFRBN đã là tỷ USD; Z.1 là triệu USD
hs = {lab: {d[:7]: v / sc(k) for d, v in obs(k)} for k, lab in HOLD if obs(k)}
if tot and hs:
    qs = [q for q in sorted(tot) if q >= '2015' and all(q in h for h in hs.values())]
    G['ustHold'] = {'d': qs, 'total': [round(tot[q]) for q in qs], 'h': {lab: [round(h[q]) for q in qs] for lab, h in hs.items()}}
    G['ustHold']['h']['Khác'] = [max(0, round(tot[q] - sum(h[q] for h in hs.values()))) for q in qs]
    G['ustHoldSrc'] = {k: SER[k]['src'] for k, _ in HOLD if k in SER}

# ---------------- Kho bạc Mỹ: cơ cấu nợ, phát hành ròng, đấu thầu, TIC, thâm hụt
UP = ROOT / 'data/global/ust.json'
if UP.exists():
    U = json.loads(UP.read_text(encoding='utf-8'))
    ms = U.get('mspd', {})
    mk_ = sorted(m for m in ms if m >= '2015')
    cls = [('bills', 'Tín phiếu'), ('notes', 'Notes'), ('bonds', 'Bonds'), ('tips', 'TIPS'), ('frn', 'FRN')]
    G['mspd'] = {'d': mk_, 'c': {lab: [ms[m].get(k) for m in mk_] for k, lab in cls},
                 'billShare': [round(ms[m]['bills'] / sum(ms[m].get(k, 0) for k, _ in cls) * 100, 2) if ms[m].get('bills') else None for m in mk_]}
    # phát hành ròng (thay đổi dư nợ do công chúng nắm) theo tháng
    G['netIss'] = {'d': mk_[1:], 'bills': [round(ms[m].get('bills', 0) - ms[p_].get('bills', 0)) for p_, m in zip(mk_, mk_[1:])],
                   'coupons': [round(sum(ms[m].get(k, 0) - ms[p_].get(k, 0) for k in ['notes', 'bonds', 'tips', 'frn'])) for p_, m in zip(mk_, mk_[1:])]}
    au = U.get('auctions', {})
    am = sorted(m for m in au if m >= '2018')
    def share(g_, k):
        out = []
        for m in am:
            a = au[m].get(g_)
            out.append(round(a[k] / a['total_accepted'] * 100, 1) if a and a.get('total_accepted') else None)
        return out
    G['auct'] = {'d': am, **{g_: {'amt': [round(au[m][g_]['total_accepted']) if g_ in au[m] else None for m in am],
                                  'Primary dealer': share(g_, 'primary_dealer_accepted'), 'Direct (trong nước trực tiếp)': share(g_, 'direct_bidder_accepted'),
                                  'Indirect (nước ngoài, quỹ qua đại lý)': share(g_, 'indirect_bidder_accepted'), 'Fed (SOMA)': share(g_, 'soma_accepted'),
                                  'Không cạnh tranh + FIMA': [None if v is None else round(v + (w or 0), 1) for v, w in zip(share(g_, 'noncomp_accepted'), share(g_, 'fima_noncomp_accepted'))]}
                             for g_ in ['bills', 'coupons']}}
    G['auctRecent'] = U.get('recent', [])
    tic = U.get('tic', {})
    G['tic'] = {c: pack({m: v for m, v in tic[c].items() if m >= '2015'}, 1) for c in ['Japan', 'China', 'United Kingdom', 'Total', 'Official', 'Cayman Islands', 'Belgium', 'Luxembourg', 'Canada'] if c in tic}
    G['ustFetched'] = U.get('fetched')
df = monthly('tsy_deficit')
if df:
    ks = sorted(df)
    G['s']['tsy_def12'] = pack({m: sum(df[k] for k in ks[i - 11:i + 1]) / 1000 for i, m in enumerate(ks) if i >= 11 and m >= '2015'}, 0)
    G['s']['tsy_def_m'] = pack({m: v / 1000 for m, v in df.items() if m >= '2019'}, 0)

# ---------------- Nhật: BoJ theo cấu phần, ai nắm JGB, can thiệp, dự trữ
JP = ROOT / 'data/global/jp.json'
if JP.exists():
    J = json.loads(JP.read_text(encoding='utf-8'))
    bs = J.get('bs', {})
    if bs.get('total'):
        ms_ = sorted(m for m in bs['total'] if m >= '2012')
        t = lambda k, m: (bs.get(k, {}).get(m) or 0) / 10000      # 100 triệu JPY → nghìn tỷ JPY
        G['bojbs'] = {'d': ms_,
                      'a': {'JGB': [round(t('jgb', m), 1) for m in ms_], 'Tín phiếu (T-bills)': [round(t('tbills', m), 1) for m in ms_], 'ETF + J-REIT': [round(t('etf', m) + t('reit', m), 1) for m in ms_],
                            'Cho vay': [round(t('loans', m), 1) for m in ms_], 'Tài sản ngoại tệ': [round(t('fx', m), 1) for m in ms_],
                            'Khác': [round(t('total', m) - t('jgb', m) - t('tbills', m) - t('etf', m) - t('reit', m) - t('loans', m) - t('fx', m), 1) for m in ms_]},
                      'l': {'Tiền giấy': [round(t('notes', m), 1) for m in ms_], 'Tiền gửi NH (current account)': [round(t('current', m), 1) for m in ms_],
                            'Tiền gửi Chính phủ': [round(t('gov', m), 1) for m in ms_], 'Repo': [round(t('repo_l', m), 1) for m in ms_],
                            'Khác (gồm vốn)': [round(t('total', m) - t('notes', m) - t('current', m) - t('gov', m) - t('repo_l', m), 1) for m in ms_]}}
    ff = J.get('ff', {})
    if ff.get('total'):
        qs = [q for q in sorted(ff['total']) if q >= '2012']
        lab = [('boj', 'BoJ'), ('dep', 'Ngân hàng, tổ chức nhận tiền gửi'), ('ins', 'Bảo hiểm'), ('pen', 'Quỹ hưu trí'), ('pub_pen', 'Hưu trí công (GPIF…)'),
               ('ofi', 'Trung gian tài chính khác'), ('hh', 'Hộ gia đình'), ('overseas', 'Nước ngoài')]
        lab = [(k, l) for k, l in lab if ff.get(k)]
        qs = [q for q in qs if all(q in ff[k] for k, _ in lab)]
        G['jgbHold'] = {'d': qs, 'total': [round(ff['total'][q] / 10000, 1) for q in qs],
                        'h': {l: [round(ff[k][q] / 10000, 1) for q in qs] for k, l in lab}}
        G['jgbHold']['h']['Khác'] = [max(0, round(G['jgbHold']['total'][i] - sum(v[i] for v in G['jgbHold']['h'].values()), 1)) for i in range(len(qs))]
    fe = J.get('feio', [])
    G['feio'] = [x for x in fe if x['d'] >= '1998']
    rv = J.get('reserves', {})
    if rv:
        G['s']['jp_res_mof'] = pack({m: x['total'] / 1000 for m, x in rv.items() if m >= '2010'}, 1)
        ms_ = sorted(m for m in rv if m >= '2018')
        g = lambda k, m: round((rv[m].get(k) or 0) / 1000, 1)
        G['jpRes'] = {'d': ms_, 'c': {'Chứng khoán ngoại tệ': [g('sec', m) for m in ms_], 'Tiền gửi ngoại tệ': [g('dep', m) for m in ms_],
                                     'Vàng': [g('gold', m) for m in ms_], 'IMF + SDR': [round(g('imf', m) + g('sdr', m), 1) for m in ms_],
                                     'Khác': [round(g('total', m) - g('sec', m) - g('dep', m) - g('gold', m) - g('imf', m) - g('sdr', m), 1) for m in ms_]},
                      'total': [g('total', m) for m in ms_]}
    G['jpFetched'] = J.get('fetched')
if 'jp_reserves' in SER:
    put('jp_res_imf', {m: v / 1000 for m, v in monthly('jp_reserves').items() if m >= '2010'}, 1)
put('ea_assets_w', {d: v / 1000 for d, v in obs('ea_assets') if d >= '2015'}, 0)

# ---------------- số theo ngày từ nguồn gốc (Treasury, MOF, ECB, Vietcombank) — mới hơn FRED vài ngày
DP = ROOT / 'data/global/daily.json'
if DP.exists():
    DY = json.loads(DP.read_text(encoding='utf-8'))
    def merge_d(key, new, dg):   # ghép vào chuỗi _d có sẵn: số nguồn gốc ưu tiên
        cur = G['s'].get(key, {'d': [], 'v': []})
        m = dict(zip(cur['d'], cur['v']))
        m.update({d: v for d, v in new.items() if v is not None and d >= DAILY_FROM[:4] + '-01-01'})
        G['s'][key] = pack(m, dg)
    u = DY.get('ust', {})
    merge_d('us_2y_d', {d: x.get('2Y') for d, x in u.items()}, 3)
    merge_d('us_10y_d', {d: x.get('10Y') for d, x in u.items()}, 3)
    put('us_3m_d', {d: x['3M'] for d, x in u.items() if x.get('3M') is not None and d >= DAILY_FROM}, 3)
    put('us_30y_d', {d: x['30Y'] for d, x in u.items() if x.get('30Y') is not None and d >= DAILY_FROM}, 3)
    j = DY.get('jgb', {})
    for t in ['2Y', '5Y', '10Y', '30Y']:
        put(f'jp_{t.lower()}_d', {d: x[t] for d, x in j.items() if x.get(t) is not None and d >= DAILY_FROM}, 3)
    e = DY.get('ecb', {})
    merge_d('usdjpy_d', {d: x.get('usdjpy') for d, x in e.items()}, 3)
    merge_d('eurusd_d', {d: x.get('eurusd') for d, x in e.items()}, 4)
    merge_d('usdcny_d', {d: x.get('usdcny') for d, x in e.items()}, 4)
    put('dxy_d', {d: x['dxy'] for d, x in e.items() if x.get('dxy') and d >= DAILY_FROM}, 2)
    for k in ['gbpusd', 'usdcad', 'usdchf', 'usdinr', 'usdsgd', 'usdidr']:   # tỷ giá quốc tế theo ngày (ECB)
        put(k + '_d', {d: x[k] for d, x in e.items() if x.get(k) and d >= DAILY_FROM}, 4)
    put('gold_d', {d: v for d, v in DY.get('gold', {}).items() if v and d >= DAILY_FROM}, 2)
    for k in ['central', 'ceil', 'floor', 'buy', 'sell']:
        put(f'vn_sbv_{k}_d', {d: x[k] for d, x in DY.get('sbv', {}).items() if x.get(k)}, 0)
    if DY.get('sfpce'):
        G['pceC'] = DY['sfpce']
    v = DY.get('vcb', {})
    put('usdvnd_vcb_sell', {d: x['sell'] for d, x in v.items() if x.get('sell')}, 0)
    put('usdvnd_vcb_buy', {d: x['buy'] for d, x in v.items() if x.get('buy')}, 0)
    # chênh UST − JGB 10 năm theo ngày (bps)
    a, b = dict(zip(G['s']['us_10y_d']['d'], G['s']['us_10y_d']['v'])), dict(zip(G['s'].get('jp_10y_d', {'d': []})['d'], G['s'].get('jp_10y_d', {'v': []})['v']))
    put('us_jp_10y_d', {d: (a[d] - b[d]) * 100 for d in a if d in b and a[d] is not None and b[d] is not None}, 0)
    G['dailyReport'] = DY.get('report')
    G['dailyFetched'] = DY.get('fetched')

# ---------------- Khảo sát: PMI, niềm tin, kỳ vọng lạm phát — lịch sử dựng sẵn (data/backfill/surveys.json), nối tháng mới từ nguồn tự động
_sv = ROOT / 'data/backfill/surveys.json'
if _sv.exists():
    _B = json.loads(_sv.read_text(encoding='utf-8'))['series']
    _dl = ROOT / 'data/vn/dlkt.json'
    _vn = {}
    if _dl.exists():
        _pg = (json.loads(_dl.read_text(encoding='utf-8')).get('pages') or {}).get('pmi-271') or {}
        _r = next((x for x in _pg.values() if x.get('n') == 'PMI'), None)
        if _r:
            _vn = {d[:7]: v for d, v in zip(_r['d'], _r['v'])}
    for _k, _b in _B.items():
        _m = dict(_b)
        _auto = _vn if _k == 'vn_pmi' else (monthly(_k) if _k in ('us_umcsent', 'us_mich') and _k in SER else {})   # chỉ nối nguồn đã đối chiếu khớp
        for _mm, _v in _auto.items():
            if _mm >= '2021-01':
                _m[_mm] = round(_v, 2)
        put(_k, dict(sorted(_m.items())), 1)

# ---------------- Toàn cầu: lợi suất 10 năm (tháng), CPI các nước, dầu theo ngày, đường cong UST
for k in ['y10_de', 'y10_fr', 'y10_it', 'y10_es', 'y10_nl', 'y10_gb', 'y10_kr', 'y10_au', 'y10_ca']:
    if k in SER:
        put(k + '_m', {m: v for m, v in monthly(k, 'avg').items() if m >= '2019'}, 3)
CPI_C = [('Châu Âu', [('cpi_de', 'Đức'), ('cpi_it', 'Ý'), ('cpi_es', 'Tây Ban Nha'), ('cpi_fr', 'Pháp'), ('cpi_nl', 'Hà Lan'), ('ea_hicp', 'Khu vực Euro')]),
         ('Mỹ', [('us_cpi_yoy', 'Mỹ')]),
         ('Phát triển khác', [('cpi_gb', 'Anh'), ('cpi_ca', 'Canada'), ('cpi_au', 'Úc'), ('cpi_nz', 'New Zealand')]),
         ('Châu Á phát triển', [('jp_cpi_main', 'Nhật Bản'), ('cpi_tw', 'Đài Loan'), ('cpi_sg', 'Singapore'), ('cpi_kr', 'Hàn Quốc')]),
         ('Châu Á mới nổi', [('cn_cpi', 'Trung Quốc'), ('cpi_in', 'Ấn Độ'), ('vn', 'Việt Nam'), ('cpi_th', 'Thái Lan'), ('cpi_id', 'Indonesia'), ('cpi_my', 'Malaysia'), ('cpi_ph', 'Philippines')])]
for k in ['cpi_gb', 'cpi_ca', 'cpi_au', 'cpi_nz', 'cpi_de', 'cpi_it', 'cpi_es', 'cpi_fr', 'cpi_nl', 'cpi_tw', 'cpi_sg', 'cpi_kr', 'cpi_in', 'cpi_th', 'cpi_id', 'cpi_my', 'cpi_ph']:
    if k in SER:
        put(k, {m: v for m, v in monthly(k).items() if m >= '2019'}, 2)
G['cpiTab'] = [[g, [[k, n] for k, n in cs if k in G['s'] or k == 'vn']] for g, cs in CPI_C]
G['cpiQ'] = [k for k in ('cpi_au', 'cpi_nz') if any(t in SER.get(k, {}).get('src', '') for t in ('bisq:', '.Q.', 'Q659'))]

# ---------------- Lãi suất điều hành các NHTW: ngày đổi lãi suất (BIS) → chuỗi tháng (giá trị cuối tháng) + bảng mức hiện tại, lần đổi gần nhất
POL = [('pol_us', 'Fed (cận trên)'), ('pol_xm', 'ECB (tiền gửi)'), ('pol_jp', 'BOJ'), ('pol_gb', 'BOE (Anh)'), ('pol_ca', 'BOC (Canada)'),
       ('pol_au', 'RBA (Úc)'), ('pol_nz', 'RBNZ (New Zealand)'), ('pol_ch', 'SNB (Thụy Sĩ)'), ('pol_kr', 'BOK (Hàn Quốc)')]
_pol_src = {'pol_us': 'us_fedtgt_up', 'pol_xm': 'ea_dfr'}
G['polTab'] = []
for k, n in POL:
    o = obs(_pol_src.get(k, k))
    if not o:
        continue
    chg_pts = [(d, v) for i, (d, v) in enumerate(o) if i == 0 or v != o[i - 1][1]]   # các lần đổi
    mm, cur, i = {}, None, 0
    first = '2019-01'
    m = first
    while m <= o[-1][0][:7]:
        while i < len(chg_pts) and chg_pts[i][0][:7] <= m:
            cur = chg_pts[i][1]; i += 1
        if cur is not None:
            mm[m] = cur
        m = shift(m, 1)
    put(k + '_m', mm, 2)
    last_chg = chg_pts[-1] if len(chg_pts) > 1 else None
    prev = chg_pts[-2][1] if len(chg_pts) > 1 else None
    ytd = next((v for d, v in reversed(o) if d < o[-1][0][:4] + '-01-01'), None)
    G['polTab'].append({'k': k, 'n': n, 'v': o[-1][1], 'd': o[-1][0], 'chg': last_chg[0] if last_chg else None, 'prev': prev, 'y0': ytd})
for k in ['us_wti', 'us_brent']:
    if k in SER:
        put(k + '_d', {d: v for d, v in obs(k) if d >= DAILY_FROM}, 2)
if DP.exists():
    put('de_10y_d', {d: v for d, v in DY.get('bund', {}).items() if d >= DAILY_FROM}, 3)
    yc = DY.get('ecbyc', {})
    put('ea_aaa_10y_d', {d: x['aaa'] for d, x in yc.items() if x.get('aaa') is not None and d >= DAILY_FROM}, 3)
    put('ea_all_10y_d', {d: x['all'] for d, x in yc.items() if x.get('all') is not None and d >= DAILY_FROM}, 3)
    for t in ['2Y', '10Y', '30Y']:   # Trung Quốc: đường cong ChinaBond
        put(f'cn_{t.lower()}_d', {d: float(x[t]) for d, x in DY.get('cn', {}).items() if x.get(t) is not None and d >= DAILY_FROM}, 4)
    put('sg_10y_d', {d: x['10Y'] for d, x in DY.get('sg', {}).items() if x.get('10Y') is not None and d >= DAILY_FROM}, 3)
    put('tw_10y_d', {d: x['10Y'] for d, x in DY.get('tw', {}).items() if isinstance(x, dict) and x.get('10Y') is not None and d >= DAILY_FROM}, 4)
    put('kr_10y_d', {d: v for d, v in DY.get('kr', {}).items() if v is not None and d >= DAILY_FROM}, 3)
    U = DY.get('ust', {})
    if U:
        TEN = ['1M', '2M', '3M', '4M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y']
        ds = sorted(U)
        def at(target):   # phiên gần nhất trước hoặc bằng mốc
            c = [d for d in ds if d <= target]
            return c[-1] if c else None
        last = ds[-1]
        from datetime import date as _d, timedelta as _t
        ld = _d.fromisoformat(last)
        snaps = [('Hiện tại', last), ('1 tuần trước', at((ld - _t(days=7)).isoformat())), ('1 tháng trước', at((ld - _t(days=30)).isoformat())), ('Đầu năm', next((d for d in ds if d >= f'{ld.year}-01-01'), None)), ('1 năm trước', at((ld - _t(days=365)).isoformat()))]
        G['ustCurve'] = {'t': TEN, 'c': [{'n': n, 'd': d, 'v': [U[d].get(t) for t in TEN]} for n, d in snaps if d]}

# kỳ vọng lãi suất Fed theo phiên FOMC (scripts/fetch_fedwatch.py)
_fw = ROOT / 'data/global/fedwatch.json'
if _fw.exists():
    G['fedwatch'] = json.loads(_fw.read_text(encoding='utf-8'))
    G['fedwatch'].pop('method', None); G['fedwatch'].pop('zq', None)
    if G['fedwatch'].get('mpt'):
        for w in G['fedwatch']['mpt']['windows']: w.pop('probs', None)
    _lr = (G['fedwatch'].get('dots') or {}).get('FEDTARMDLR')
    if _lr:
        _k = max(_lr); G['fedwatch']['dots']['FEDTARMDLR'] = {_k: _lr[_k]}
    _fh = ROOT / 'data/global/fedwatch_hist.json'
    if _fh.exists():
        G['fedwatchHist'] = json.loads(_fh.read_text(encoding='utf-8'))
js = 'window.GLOBAL_DATA = ' + json.dumps(G, ensure_ascii=False, separators=(',', ':')) + ';\n'
(ROOT / 'data/global-data.js').write_text(js, encoding='utf-8')
print(f'wrote data/global-data.js ({len(js) // 1024} KB), {len(G["s"])} chuỗi')
# tập con tỷ giá theo ngày dùng chung cho chart hành lang tỷ giá ở trang ngành và trang từng ngân hàng
FXK = ['vn_sbv_central_d', 'vn_sbv_ceil_d', 'vn_sbv_floor_d', 'vn_sbv_sell_d', 'dxy_d', 'usdvnd_vcb_sell']
FX = {'fetched': G.get('fetched'), 's': {k: G['s'][k] for k in FXK if k in G['s']}}
(ROOT / 'data/fx-daily.js').write_text('window.FX_DAILY = ' + json.dumps(FX, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
