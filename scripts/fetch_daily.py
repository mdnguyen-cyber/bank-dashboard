"""Số liệu theo ngày, cập nhật nhanh hơn FRED (FRED trễ 1–7 ngày) — nguồn gốc công bố, chạy trên GitHub Actions → data/global/daily.json.

- U.S. Treasury: lợi suất par curve hằng ngày (1M…30Y), công bố cuối mỗi ngày giao dịch.
- MOF Nhật: lợi suất JGB theo kỳ hạn hằng ngày (jgbcme.csv + jgbcme_all.csv).
- ECB: tỷ giá tham chiếu 16:00 CET (EUR/USD, EUR/JPY, EUR/CNY → USD/JPY, USD/CNY chéo).
- Vietcombank: tỷ giá USD/VND mua, chuyển khoản, bán (ảnh chụp mỗi lần chạy, tích luỹ thành chuỗi).
"""
import csv, io, json, re, sys, time, urllib.parse, urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / 'data/global/daily.json'
UA = {'User-Agent': 'Mozilla/5.0 (FinSuccess dashboard; +https://github.com/mdnguyen-cyber/bank-dashboard)'}
FROM = '2023-01-01'


def get(url, enc='utf-8', tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return r.read().decode(enc, 'replace')
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(3 * (i + 1))
    raise err


def fnum(x):
    try:
        return float(str(x).replace(',', '').strip())
    except ValueError:
        return None


def ust():
    out = {}
    for y in range(int(FROM[:4]), date.today().year + 1):
        url = ('https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/'
               f'{y}/all?type=daily_treasury_yield_curve&field_tdr_date_value={y}&page&_format=csv')
        for r in csv.DictReader(io.StringIO(get(url))):
            m, d, yy = r['Date'].split('/')
            k = f'{yy}-{m}-{d}'
            out[k] = {t: fnum(r.get(c)) for t, c in [('1M', '1 Mo'), ('2M', '2 Mo'), ('3M', '3 Mo'), ('4M', '4 Mo'), ('6M', '6 Mo'), ('1Y', '1 Yr'), ('2Y', '2 Yr'),
                                                     ('3Y', '3 Yr'), ('5Y', '5 Yr'), ('7Y', '7 Yr'), ('10Y', '10 Yr'), ('20Y', '20 Yr'), ('30Y', '30 Yr')]}
    return dict(sorted(out.items()))


ERA = {'R': 2018, 'H': 1988, 'S': 1925}


def jdate(s):
    s = s.strip()
    m = re.match(r'^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$', s)
    if m:
        return f'{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}'
    m = re.match(r'^([RHS])(\d{1,2})\.(\d{1,2})\.(\d{1,2})$', s)
    if m:
        return f'{ERA[m.group(1)] + int(m.group(2)):04d}-{int(m.group(3)):02d}-{int(m.group(4)):02d}'
    return None


def jgb():
    out = {}
    for url in ['https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/historical/jgbcme_all.csv',
                'https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/jgbcme.csv']:
        try:
            txt = get(url, 'cp932')
        except Exception as e:  # noqa: BLE001
            print('JGB', url, e, file=sys.stderr)
            continue
        rows = list(csv.reader(io.StringIO(txt)))
        hdr = next((r for r in rows if r and r[0].strip().lower() in ('date', '基準日')), None)
        if not hdr:
            continue
        idx = {h.strip(): i for i, h in enumerate(hdr)}
        for r in rows:
            d = jdate(r[0]) if r else None
            if not d or d < FROM:
                continue
            out[d] = {t: fnum(r[idx[c]]) if c in idx and idx[c] < len(r) else None for t, c in [('2Y', '2Y'), ('5Y', '5Y'), ('10Y', '10Y'), ('20Y', '20Y'), ('30Y', '30Y'), ('40Y', '40Y')]}
    return dict(sorted(out.items()))


def ecb():
    res = {}
    for cur in ['USD', 'JPY', 'CNY', 'GBP', 'CAD', 'SEK', 'CHF']:
        txt = get(f'https://data-api.ecb.europa.eu/service/data/EXR/D.{cur}.EUR.SP00.A?format=csvdata&startPeriod={FROM}')
        res[cur] = {r['TIME_PERIOD']: fnum(r['OBS_VALUE']) for r in csv.DictReader(io.StringIO(txt)) if r.get('OBS_VALUE')}
    out = {}
    for d, usd in res['USD'].items():
        if usd:
            out[d] = {'eurusd': usd, 'usdjpy': round(res['JPY'][d] / usd, 3) if res['JPY'].get(d) else None,
                      'usdcny': round(res['CNY'][d] / usd, 4) if res['CNY'].get(d) else None}
            g = {c: res[c].get(d) for c in ['JPY', 'GBP', 'CAD', 'SEK', 'CHF']}
            if all(g.values()):   # DXY theo công thức ICE: 50,14348112 × EURUSD^−0,576 × USDJPY^0,136 × GBPUSD^−0,119 × USDCAD^0,091 × USDSEK^0,042 × USDCHF^0,036
                out[d]['dxy'] = round(50.14348112 * usd ** -0.576 * (g['JPY'] / usd) ** 0.136 * (usd / g['GBP']) ** -0.119 * (g['CAD'] / usd) ** 0.091
                                      * (g['SEK'] / usd) ** 0.042 * (g['CHF'] / usd) ** 0.036, 3)
    return dict(sorted(out.items()))


def bund():
    """Bundesbank: lợi suất trái phiếu Chính phủ Đức 10 năm, theo ngày."""
    url = 'https://api.statistiken.bundesbank.de/rest/data/BBSIS/D.I.ZST.ZI.EUR.S1311.B.A604.R10XX.R.A.A._Z._Z.A?format=csv&lang=en&startPeriod=' + FROM
    txt = get(url)
    out = {}
    for line in txt.splitlines():
        m = re.match(r'^"?(\d{4}-\d{2}-\d{2})"?[,;]"?(-?\d+(?:\.\d+)?)"?', line.strip())
        if m:
            out[m.group(1)] = float(m.group(2))
    return dict(sorted(out.items()))


def ecb_yc():
    """ECB: đường cong lợi suất khu vực euro 10 năm — trái phiếu xếp hạng AAA và toàn bộ trái phiếu chính phủ."""
    out = {}
    for tag, k in [('aaa', 'G_N_A'), ('all', 'G_N_C')]:
        txt = get(f'https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.{k}.SV_C_YM.SR_10Y?format=csvdata&startPeriod={FROM}')
        for r in csv.DictReader(io.StringIO(txt)):
            if r.get('OBS_VALUE'):
                out.setdefault(r['TIME_PERIOD'], {})[tag] = round(float(r['OBS_VALUE']), 3)
    return dict(sorted(out.items()))


def cn():
    """Lợi suất TPCP Trung Quốc 2, 5, 10, 30 năm theo ngày (đường cong ChinaBond, qua cổng dữ liệu Eastmoney)."""
    out, page = {}, 1
    while page <= 6:
        js = json.loads(get('https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPTA_WEB_TREASURYYIELD&columns=ALL'
                            f'&sortColumns=SOLAR_DATE&sortTypes=-1&pageSize=500&pageNumber={page}'))
        rows = (js.get('result') or {}).get('data') or []
        for r in rows:
            d = r['SOLAR_DATE'][:10]
            if d < FROM:
                return dict(sorted(out.items()))
            out[d] = {'2Y': r.get('EMM00588704'), '5Y': r.get('EMM00166462'), '10Y': r.get('EMM00166466'), '30Y': r.get('EMM00166469')}
        if not rows:
            break
        page += 1
    return dict(sorted(out.items()))


def kr(old):
    """Lợi suất TPCP Hàn Quốc 10 năm theo ngày — Ngân hàng Trung ương Hàn Quốc (ECOS, khoá mẫu tối đa 10 dòng/lần → chia 12 ngày/lần)."""
    from datetime import timedelta
    out = dict(old or {})
    start = date.fromisoformat(max(out) if out else '2024-01-01') - timedelta(days=14)
    end = date.today()
    while start <= end:
        e = min(start + timedelta(days=11), end)
        js = json.loads(get(f'https://ecos.bok.or.kr/api/StatisticSearch/sample/json/en/1/10/817Y002/D/{start:%Y%m%d}/{e:%Y%m%d}/010210000'))
        for r in (js.get('StatisticSearch') or {}).get('row', []):
            t = r['TIME']; out[f'{t[:4]}-{t[4:6]}-{t[6:]}'] = fnum(r['DATA_VALUE'])
        start = e + timedelta(days=1)
        time.sleep(0.3)
    return dict(sorted(out.items()))


def sg():
    """Lợi suất SGS (TPCP Singapore) 2, 10, 30 năm theo ngày — Cơ quan Tiền tệ Singapore (MAS, giá & lợi suất chuẩn)."""
    base = 'https://eservices.mas.gov.sg/statistics/api/v1/bondsandbills/m/pricesandyields_chart'
    out = {}
    for y in range(int(FROM[:4]), date.today().year + 1):
        flt = urllib.parse.quote(f'product_type:B AND end_of_period:[{y}-01-01 TO {y}-12-31]')
        js = json.loads(get(f'{base}?rows=400&filters={flt}&sort=end_of_period%20asc'))
        for r in (js.get('result') or {}).get('records', []):
            out[r['end_of_period'][:10]] = {'2Y': r.get('bid_2y_bond_yield'), '10Y': r.get('bid_10y_bond_yield'), '30Y': r.get('bid_30y_bond_yield')}
        time.sleep(0.5)
    return dict(sorted(out.items()))


def tw(old):
    """Lợi suất TPCP Đài Loan chuẩn (benchmark) 2/5/10/20/30 năm theo ngày — Sở Giao dịch Đài Bắc (TPEx), file Daily Benchmarks Yield."""
    import xlrd
    from datetime import timedelta
    out = dict(old or {})
    d = date.fromisoformat(max(out)) + timedelta(days=1) if out else date(2025, 1, 2)
    n = 0
    while d <= date.today() and n < 400:
        if d.weekday() < 5:
            n += 1
            url = f'https://www.tpex.org.tw/storage/bond_zone/tradeinfo/govbond/{d:%Y}/{d:%Y%m}/BDdys100.{d:%Y%m%d}-E.xls'
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
                    sh = xlrd.open_workbook(file_contents=r.read()).sheet_by_index(0)
                row = {}
                for i in range(sh.nrows):
                    c = [x.value for x in sh.row(i)]
                    if isinstance(c[0], float) and fnum(c[2]) is not None:
                        row[f'{int(c[0])}Y'] = fnum(c[2])
                if row.get('10Y'):
                    out[d.isoformat()] = row
            except Exception:  # noqa: BLE001  (ngày nghỉ: không có file)
                pass
            time.sleep(0.2)
        d += timedelta(days=1)
    return dict(sorted(out.items()))


def sbv():
    """NHNN: tỷ giá trung tâm, trần, sàn, giá mua/bán USD của Sở Giao dịch NHNN theo ngày (qua dulieukinhte.com)."""
    from datetime import datetime, timedelta, timezone
    ids = {'33444': 'central', '37551': 'ceil', '37552': 'floor', '37553': 'buy', '37554': 'sell'}
    js = json.loads(get('https://dulieukinhte.com/api/internal/data/series?ids=' + ','.join(ids)))
    out = {}
    for ser in js:
        k = ids.get(str(ser['id']))
        for ts, v in ser.get('data', []):
            d = datetime.fromtimestamp(ts / 1000, timezone(timedelta(hours=7))).date().isoformat()
            if k and d >= '2022-01-01' and v is not None:
                out.setdefault(d, {})[k] = v
    return dict(sorted(out.items()))


def sfpce():
    """Fed San Francisco: đóng góp của hàng hoá, dịch vụ vào lạm phát PCE (tính từ số liệu chi tiết của BEA)."""
    out = {}
    for k, f in [('yoy', 'chart1-yoy-headline-pce-contributions'), ('mom', 'chart2-monthly-headline-pce-contributions'),
                 ('core', 'chart3-yoy-core-pce-contributions'), ('super', 'chart4-yoy-supercore-pce-contributions')]:
        rows = list(csv.reader(io.StringIO(get(f'https://www.frbsf.org/wp-content/uploads/{f}.csv'))))
        out[k] = {'cols': rows[0][1:], 'd': [r[0][:7] for r in rows[1:] if r], 'v': [[fnum(x) if x != '' else None for x in r[1:]] for r in rows[1:] if r]}
    return out


def vcb(old):
    """Vietcombank công bố XML tỷ giá; mỗi lần chạy lưu 1 điểm (ngày giờ công bố)."""
    txt = get('https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx')
    dt = re.search(r'<DateTime>([^<]+)</DateTime>', txt)
    m = re.search(r'CurrencyCode="USD"[^>]*Buy="([^"]+)"[^>]*Transfer="([^"]+)"[^>]*Sell="([^"]+)"', txt)
    if not m:
        raise ValueError('không thấy USD trong XML')
    stamp = dt.group(1).strip() if dt else time.strftime('%m/%d/%Y %I:%M:%S %p')
    mm = re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})', stamp)
    d = f'{mm.group(3)}-{int(mm.group(1)):02d}-{int(mm.group(2)):02d}' if mm else date.today().isoformat()
    out = dict(old or {})
    out[d] = {'buy': fnum(m.group(1)), 'transfer': fnum(m.group(2)), 'sell': fnum(m.group(3)), 'stamp': stamp}
    return dict(sorted(out.items()))


def main():
    old = json.loads(P.read_text(encoding='utf-8')) if P.exists() else {}
    res, rep = {}, {}
    for name, fn in [('ust', ust), ('jgb', jgb), ('ecb', ecb), ('bund', bund), ('ecbyc', ecb_yc), ('cn', cn), ('sg', sg), ('tw', lambda: tw(old.get('tw'))), ('kr', lambda: kr(old.get('kr'))), ('sbv', sbv), ('sfpce', sfpce), ('vcb', lambda: vcb(old.get('vcb')))]:
        try:
            v = fn()
            if not v:
                raise ValueError('rỗng')
            res[name] = v
            rep[name] = f'ok {len(v)} → {max(v)}'
        except Exception as e:  # noqa: BLE001
            rep[name] = 'LỖI ' + str(e)[:200]
            if name in old:
                res[name] = old[name]
        print(name, rep[name], file=sys.stderr)
    res['fetched'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    res['report'] = rep
    P.write_text(json.dumps(res, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


if __name__ == '__main__':
    main()
