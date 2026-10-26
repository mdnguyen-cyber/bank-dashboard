#!/usr/bin/env python3
"""Lịch sử dài theo tháng cho bản đồ nhiệt "Việt Nam & Thế giới" → data/global/hm_hist.json.

Nguồn công khai, không cần API key:
- Lãi suất điều hành: BIS WS_CBPOL (theo ngày → số cuối tháng), từ 1990.
- Lạm phát CPI (% so cùng kỳ): BIS WS_LONG_CPI (tháng; Úc, New Zealand theo quý), dự phòng OECD/FRED.
- Lợi suất TPCP 10 năm: FRED (OECD MEI, bình quân tháng).
- Tỷ giá: ECB (cuối tháng, từ 1999), trước đó FRED H.10 (bình quân tháng); USD: chỉ số USD của Fed.
  Lưu sẵn % thay đổi giá trị đồng tiền so với USD từ đầu năm (dương = đồng tiền mạnh lên), mỗi nguồn tự tính trong chính nó.
Chạy hằng tuần (bỏ qua nếu file mới hơn 6 ngày, trừ khi đặt FORCE=1). Lỗi một chuỗi thì giữ bản cũ."""
import csv, io, json, os, sys, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/global/hm_hist.json'
START = '1990-01'
UA = {'User-Agent': 'Mozilla/5.0 (FinSuccess dashboard; +https://github.com/mdnguyen-cyber/bank-dashboard)'}

# mã nước trên trang → mã BIS
CC = {'us': 'US', 'ea': 'XM', 'jp': 'JP', 'cn': 'CN', 'gb': 'GB', 'kr': 'KR', 'ca': 'CA', 'au': 'AU', 'nz': 'NZ', 'ch': 'CH',
      'in': 'IN', 'id': 'ID', 'th': 'TH', 'my': 'MY', 'ph': 'PH', 'sg': 'SG', 'vn': 'VN'}
CPI_Q = {'au', 'nz'}
CPI_ALT = {'au': ['oecdq:AUS', 'oecd:AUS', 'fredq:CPALTT01AUQ659N'], 'nz': ['oecdq:NZL', 'fredq:CPALTT01NZQ659N'], 'ch': ['oecd:CHE', 'fred:CPALTT01CHM659N'], 'jp': ['oecd:JPN', 'fred:CPALTT01JPM659N'], 'gb': ['fred:CPALTT01GBM659N'],
           'ca': ['fred:CPALTT01CAM659N'], 'kr': ['fred:CPALTT01KRM659N'], 'us': ['fred:CPALTT01USM659N'], 'ea': ['fred:CPHPTT01EZM659N'],
           'in': ['fred:INDCPIALLMINMEI'], 'id': ['fred:CPALTT01IDM659N'], 'cn': ['fred:CPALTT01CNM659N']}
Y10 = {'us': ['fred:GS10', 'fred:IRLTLT01USM156N'], 'ea': ['fred:IRLTLT01DEM156N'], 'jp': ['fred:IRLTLT01JPM156N'], 'gb': ['fred:IRLTLT01GBM156N'],
       'kr': ['fred:IRLTLT01KRM156N'], 'ca': ['fred:IRLTLT01CAM156N'], 'au': ['fred:IRLTLT01AUM156N'], 'nz': ['fred:IRLTLT01NZM156N'],
       'ch': ['fred:IRLTLT01CHM156N'], 'in': ['fred:INDIRLTLT01STM', 'fred:IRLTLT01INM156N'], 'id': ['fred:IRLTLT01IDM156N'],
       'cn': ['fred:IRLTLT01CNM156N'], 'th': ['fred:IRLTLT01THM156N'], 'my': ['fred:IRLTLT01MYM156N'], 'ph': ['fred:IRLTLT01PHM156N'],
       'sg': ['fred:IRLTLT01SGM156N']}
# tỷ giá: (mã ECB, mã FRED H.10 bình quân tháng, FRED là USD/đơn vị ngoại tệ?)
FX = {'ea': ('USD', None, True), 'jp': ('JPY', 'EXJPUS', False), 'cn': ('CNY', 'EXCHUS', False), 'gb': ('GBP', 'EXUSUK', True), 'kr': ('KRW', 'EXKOUS', False),
      'ca': ('CAD', 'EXCAUS', False), 'au': ('AUD', 'EXUSAL', True), 'nz': ('NZD', 'EXUSNZ', True), 'ch': ('CHF', 'EXSZUS', False), 'in': ('INR', 'EXINUS', False),
      'id': ('IDR', None, False), 'th': ('THB', 'EXTHUS', False), 'my': ('MYR', 'EXMAUS', False), 'ph': ('PHP', None, False), 'sg': ('SGD', 'EXSIUS', False)}


def get(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return r.read().decode('utf-8')
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(2 * (i + 1))
    raise err


def bis(flow, key, start):
    txt = get(f'https://stats.bis.org/api/v1/data/{flow}/{key}?format=csv&startPeriod={start}')
    return [(r['TIME_PERIOD'], float(r['OBS_VALUE'])) for r in csv.DictReader(io.StringIO(txt)) if r.get('OBS_VALUE') not in (None, '', 'NaN')]


def fred(sid):
    txt = get(f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}&cosd={START}-01')
    rows = list(csv.reader(io.StringIO(txt)))
    return [(d[:7], float(v)) for d, v in rows[1:] if v not in ('', '.')]


def oecd_cpi(c3, f='M'):
    url = f'https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0/{c3}.{f}.N.CPI.PA._T.N.GY?startPeriod={START[:4] + "-Q1" if f == "Q" else START}&format=csvfile'
    return [(qmonth(r['TIME_PERIOD']), float(r['OBS_VALUE'])) for r in csv.DictReader(io.StringIO(get(url))) if r.get('OBS_VALUE') not in (None, '')]


def fred_q(sid):   # FRED theo quý ghi tháng đầu quý → tháng cuối quý
    return [(f'{m[:4]}-{int(m[5:]) + 2:02d}', v) for m, v in fred(sid)]


def qmonth(p):   # '2026-Q2' → '2026-06'
    if '-Q' in p:
        y, q = p.split('-Q')
        return f'{y}-{int(q) * 3:02d}'
    return p[:7]


def month_end(rows):
    out = {}
    for d, v in sorted(rows):
        out[d[:7]] = round(v, 4)
    return out


def ytd(lv, usd_per_unit):
    """% thay đổi giá trị đồng tiền so với USD, cuối tháng so với cuối năm trước (dương = mạnh lên)."""
    out = {}
    for m, v in lv.items():
        y0 = lv.get(f'{int(m[:4]) - 1}-12')
        if y0 and v:
            out[m] = round(((v / y0) if usd_per_unit else (y0 / v)) * 100 - 100, 3)
    return out


def main():
    if OUT.exists() and os.environ.get('FORCE') != '1':
        f = json.loads(OUT.read_text(encoding='utf-8')).get('fetched', '2000-01-01')
        if time.time() - time.mktime(time.strptime(f, '%Y-%m-%d')) < 6 * 86400:
            print('hm_hist: còn mới, bỏ qua'); return 0
    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    res = {'pol': {}, 'cpi': {}, 'y10': {}, 'fx': {}}
    src = {'pol': {}, 'cpi': {}, 'y10': {}, 'fx': {}}
    rep = []

    def keep(kind, c, ser, s):
        if ser:
            res[kind][c] = ser; src[kind][c] = s
            rep.append(f'{kind}.{c}: {s} {min(ser)}→{max(ser)} ({len(ser)})')
        elif c in old.get(kind, {}):
            res[kind][c] = old[kind][c]; src[kind][c] = old.get('src', {}).get(kind, {}).get(c, '')
            rep.append(f'{kind}.{c}: giữ bản cũ')
        else:
            rep.append(f'{kind}.{c}: KHÔNG CÓ')

    for c, b in CC.items():
        # lãi suất điều hành: BIS theo ngày → cuối tháng
        ser, s = {}, ''
        if c not in ('sg', 'vn'):
            try:
                ser = month_end(bis('WS_CBPOL', f'D.{b}', f'{START}-01')); s = 'BIS WS_CBPOL'
            except Exception as e:  # noqa: BLE001
                try:
                    ser = month_end(bis('WS_CBPOL', f'M.{b}', START)); s = 'BIS WS_CBPOL (tháng)'
                except Exception:  # noqa: BLE001
                    rep.append(f'pol.{c} lỗi {str(e)[:80]}')
            keep('pol', c, ser, s)
        # CPI
        ser, s = {}, ''
        try:
            if c in CPI_Q:
                ser = {qmonth(p): round(v, 4) for p, v in bis('WS_LONG_CPI', f'Q.{b}.771', '1990-Q1')}; s = 'BIS (quý)'
            else:
                ser = {p[:7]: round(v, 4) for p, v in bis('WS_LONG_CPI', f'M.{b}.771', START)}; s = 'BIS'
        except Exception:  # noqa: BLE001
            pass
        for alt in CPI_ALT.get(c, []):   # nguồn khác bù tháng BIS chưa có (đầu chuỗi hoặc tháng mới nhất)
            try:
                k, sid = alt.split(':', 1)
                rows = {'oecd': lambda: oecd_cpi(sid), 'oecdq': lambda: oecd_cpi(sid, 'Q'), 'fred': lambda: fred(sid), 'fredq': lambda: fred_q(sid)}[k]()
                add = {m: round(v, 4) for m, v in rows if m not in ser}
                if add:
                    ser.update(add); s = (s + ' + ' if s else '') + ('OECD' if k.startswith('oecd') else 'FRED') + (' (quý)' if k.endswith('q') else '')
            except Exception:  # noqa: BLE001
                pass
        if c != 'vn':
            keep('cpi', c, dict(sorted(ser.items())), s)
        # lợi suất 10 năm
        ser, s = {}, ''
        for alt in Y10.get(c, []):
            try:
                rows = fred(alt.split(':', 1)[1])
                add = {m: round(v, 4) for m, v in rows if m not in ser}
                if add:
                    ser.update(add); s = (s + ' + ' if s else '') + 'FRED/OECD'
            except Exception:  # noqa: BLE001
                pass
        if c in Y10:
            keep('y10', c, dict(sorted(ser.items())), s)
    # tỷ giá
    try:
        usd = month_end([(r['TIME_PERIOD'], float(r['OBS_VALUE'])) for r in csv.DictReader(io.StringIO(get('https://data-api.ecb.europa.eu/service/data/EXR/M.USD.EUR.SP00.E?format=csvdata'))) if r.get('OBS_VALUE') not in (None, '', 'NaN')])
    except Exception as e:  # noqa: BLE001
        usd = {}; rep.append(f'ECB USD lỗi {str(e)[:80]}')
    for c, (ecb, fr, usd_per) in FX.items():
        ser, s = {}, ''
        if usd:
            try:
                if ecb == 'USD':
                    lv = usd
                else:
                    x = month_end([(r['TIME_PERIOD'], float(r['OBS_VALUE'])) for r in csv.DictReader(io.StringIO(get(f'https://data-api.ecb.europa.eu/service/data/EXR/M.{ecb}.EUR.SP00.E?format=csvdata'))) if r.get('OBS_VALUE') not in (None, '', 'NaN')])
                    lv = {m: x[m] / usd[m] for m in x if m in usd and usd[m]}   # đơn vị ngoại tệ / 1 USD
                ser = ytd(lv, ecb == 'USD'); s = 'ECB (cuối tháng)'
            except Exception as e:  # noqa: BLE001
                rep.append(f'fx.{c} ECB lỗi {str(e)[:80]}')
        if fr:
            try:
                add = {m: v for m, v in ytd(dict(fred(fr)), usd_per).items() if m not in ser}
                if add:
                    ser.update(add); s = (s + ' + ' if s else '') + 'FRED H.10 (bình quân tháng, trước 1999)'
            except Exception:  # noqa: BLE001
                pass
        keep('fx', c, dict(sorted(ser.items())), s)
    ser, s = {}, ''   # Mỹ: chỉ số USD của Fed (nhóm đồng tiền chính đến 2019, rộng từ 2006)
    for sid, nm in [('TWEXMMTH', 'Fed, chỉ số USD so với nhóm đồng tiền chính'), ('TWEXBGSMTH', 'Fed, chỉ số USD danh nghĩa rộng')]:
        try:
            add = {m: v for m, v in ytd(dict(fred(sid)), True).items() if m not in ser}
            if add:
                ser.update(add); s = (s + ' + ' if s else '') + nm
        except Exception:  # noqa: BLE001
            pass
    keep('fx', 'us', dict(sorted(ser.items())), s)
    res['src'] = src
    res['fetched'] = time.strftime('%Y-%m-%d', time.gmtime())
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(res, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('\n'.join(rep))
    return 0


if __name__ == '__main__':
    sys.exit(main())
