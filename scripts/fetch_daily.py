"""Số liệu theo ngày, cập nhật nhanh hơn FRED (FRED trễ 1–7 ngày) — nguồn gốc công bố, chạy trên GitHub Actions → data/global/daily.json.

- U.S. Treasury: lợi suất par curve hằng ngày (1M…30Y), công bố cuối mỗi ngày giao dịch.
- MOF Nhật: lợi suất JGB theo kỳ hạn hằng ngày (jgbcme.csv + jgbcme_all.csv).
- ECB: tỷ giá tham chiếu 16:00 CET (EUR/USD, EUR/JPY, EUR/CNY → USD/JPY, USD/CNY chéo).
- Vietcombank: tỷ giá USD/VND mua, chuyển khoản, bán (ảnh chụp mỗi lần chạy, tích luỹ thành chuỗi).
"""
import csv, io, json, re, sys, time, urllib.request
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
    for cur in ['USD', 'JPY', 'CNY']:
        txt = get(f'https://data-api.ecb.europa.eu/service/data/EXR/D.{cur}.EUR.SP00.A?format=csvdata&startPeriod={FROM}')
        res[cur] = {r['TIME_PERIOD']: fnum(r['OBS_VALUE']) for r in csv.DictReader(io.StringIO(txt)) if r.get('OBS_VALUE')}
    out = {}
    for d, usd in res['USD'].items():
        if usd:
            out[d] = {'eurusd': usd, 'usdjpy': round(res['JPY'][d] / usd, 3) if res['JPY'].get(d) else None,
                      'usdcny': round(res['CNY'][d] / usd, 4) if res['CNY'].get(d) else None}
    return dict(sorted(out.items()))


def bund():
    """Bundesbank: lợi suất trái phiếu Chính phủ Đức 10 năm, theo ngày."""
    url = 'https://api.statistiken.bundesbank.de/rest/data/BBSIS/D.I.ZST.ZI.EUR.S1311.B.A604.R10XX.R.A.A._Z._Z.A?format=csv&lang=en&startPeriod=' + FROM
    txt = get(url)
    out = {}
    for line in txt.splitlines():
        m = re.match(r'^"?(\d{4}-\d{2}-\d{2})"?[,;]"?(-?[\d.]+)"?', line.strip())
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
    for name, fn in [('ust', ust), ('jgb', jgb), ('ecb', ecb), ('bund', bund), ('ecbyc', ecb_yc), ('vcb', lambda: vcb(old.get('vcb')))]:
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
