#!/usr/bin/env python3
"""Thị trường tự động (không cần AI): giá & định giá cổ phiếu ngân hàng (VNDirect finfo API), giá vàng thế giới (Yahoo Finance,
hợp đồng vàng COMEX), tin tức ngân hàng (RSS CafeF, VnExpress). Ghi data/vn/market.json; lỗi phần nào giữ bản cũ phần đó."""
import json, re, sys, time, urllib.request, html
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'data/vn/market.json'
UA = {'User-Agent': 'Mozilla/5.0 (FinSuccess dashboard; +https://github.com/mdnguyen-cyber/bank-dashboard)', 'Accept': 'application/json, text/xml, */*'}
BANKS = ['VCB', 'BID', 'CTG', 'MBB', 'TCB', 'ACB', 'VPB', 'HDB', 'LPB', 'SHB', 'STB', 'VIB', 'TPB', 'MSB', 'SSB', 'OCB', 'EIB', 'NAB', 'ABB', 'KLB',
         'VAB', 'BVB', 'BAB', 'PGB', 'SGB', 'NVB']
TZ = timezone(timedelta(hours=7))
NAMES = {'VCB': ['Vietcombank'], 'BID': ['BIDV'], 'CTG': ['VietinBank', 'Vietinbank'], 'MBB': ['MB Bank', 'MBBank', 'Ngân hàng Quân đội'], 'TCB': ['Techcombank'],
         'ACB': ['ACB'], 'VPB': ['VPBank'], 'HDB': ['HDBank'], 'LPB': ['LPBank', 'LienVietPostBank'], 'SHB': ['SHB'], 'STB': ['Sacombank'], 'VIB': ['VIB'],
         'TPB': ['TPBank'], 'MSB': ['MSB'], 'SSB': ['SeABank'], 'OCB': ['OCB'], 'EIB': ['Eximbank'], 'NAB': ['Nam A Bank', 'NamABank'], 'ABB': ['ABBank'],
         'KLB': ['KienlongBank'], 'VAB': ['VietABank', 'VietA Bank'], 'BVB': ['BVBank', 'Viet Capital Bank'], 'BAB': ['Bac A Bank', 'BacABank'],
         'PGB': ['PGBank'], 'SGB': ['Saigonbank'], 'NVB': ['NCB']}
NEWS_KEEP = re.compile(r'ngân hàng|lãi suất|tỷ giá|NHNN|tín dụng|huy động|nợ xấu|trái phiếu|thanh khoản|Ngân hàng Nhà nước|' + '|'.join(sum(NAMES.values(), [])), re.I)


def get(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=45) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception as e:  # noqa: BLE001
            err = e; time.sleep(2 * (i + 1))
    raise err


def stocks():
    out = {}
    frm = (datetime.now(TZ) - timedelta(days=45)).date().isoformat()
    for s in BANKS:
        try:
            px = json.loads(get(f'https://api-finfo.vndirect.com.vn/v4/stock_prices?sort=date&q=code:{s}~date:gte:{frm}&size=60'))['data']
            rt = json.loads(get(f'https://api-finfo.vndirect.com.vn/v4/ratios/latest?filter=ratioCode:PRICE_TO_BOOK,PRICE_TO_EARNINGS,MARKETCAP&where=code:{s}&order=reportDate&fields=ratioCode,value,reportDate'))['data']
            out[s] = {'px': sorted([[p['date'], round(p['close'] * 1000), round(p.get('adClose', p['close']) * 1000)] for p in px if p.get('close')]),
                      'ratio': {r['ratioCode']: [r['reportDate'], r['value']] for r in rt}}
        except Exception as e:  # noqa: BLE001
            out[s] = {'err': str(e)[:150]}
        time.sleep(0.4)
    return out


def gold():
    js = json.loads(get('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?range=2y&interval=1d'))['chart']['result'][0]
    ts, cl = js['timestamp'], js['indicators']['quote'][0]['close']
    return [[datetime.fromtimestamp(t, timezone(timedelta(hours=-5))).date().isoformat(), round(c, 1)] for t, c in zip(ts, cl) if c]


def rss(url, src, keep=None):
    t = get(url); items = []
    for it in re.findall(r'<item>(.*?)</item>', t, re.S):
        g = lambda tag: html.unescape(re.sub(r'<!\[CDATA\[|\]\]>', '', (re.search(rf'<{tag}>(.*?)</{tag}>', it, re.S) or [None, ''])[1])).strip()
        title, link, pub = g('title'), g('link'), g('pubDate')
        if not title or (keep and not keep.search(title)):
            continue
        try:
            d = parsedate_to_datetime(pub).astimezone(TZ).date().isoformat()
        except Exception:  # noqa: BLE001
            d = datetime.now(TZ).date().isoformat()
        sym = [s for s, ns in NAMES.items() if any(re.search(r'\b' + re.escape(n) + r'\b', title) for n in ns) or re.search(r'\b' + s + r'\b', title)]
        items.append({'d': d, 't': title, 'src': src, 'url': link, 'sym': sym})
    return items


def main():
    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    res, rep = {}, {}
    for k, f in [('stocks', stocks), ('gold', gold),
                 ('news', lambda: rss('https://cafef.vn/tai-chinh-ngan-hang.rss', 'CafeF') + rss('https://vnexpress.net/rss/kinh-doanh.rss', 'VnExpress', NEWS_KEEP))]:
        try:
            res[k] = f(); rep[k] = 'ok ' + str(len(res[k]))
        except Exception as e:  # noqa: BLE001
            rep[k] = 'lỗi: ' + str(e)[:150]
            if k in old:
                res[k] = old[k]
    if 'news' in res and 'news' in old:   # lưu dồn tin 60 ngày
        seen = {n['url'] for n in res['news']}
        lo = (datetime.now(TZ) - timedelta(days=60)).date().isoformat()
        res['news'] += [n for n in old['news'] if n['url'] not in seen and n['d'] >= lo]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'fetched': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), 'report': rep, **res}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(rep)
    return 0


if __name__ == '__main__':
    sys.exit(main())
