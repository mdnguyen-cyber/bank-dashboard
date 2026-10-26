#!/usr/bin/env python3
"""Kết quả đấu thầu JGB (Bộ Tài chính Nhật Bản) → data/global/jgb_auct.json, lưu dồn từ 2021.

Cách lấy: đọc lịch đấu thầu theo tháng (calendar/YYMMe.htm), lấy các link kết quả (eresul…htm), đọc từng trang kết quả.
Chỉ giữ JGB coupon thường kỳ hạn 2, 5, 10, 20, 30, 40 năm (bỏ tín phiếu, JGB chỉ số lạm phát, đấu thầu tăng thanh khoản, trái phiếu chuyển đổi khí hậu).
Chỉ số tính thêm:
- bid-to-cover = khối lượng đặt thầu cạnh tranh / khối lượng trúng thầu (cách thị trường vẫn tính, MOF không công bố trực tiếp)
- tail = giá bình quân − giá trúng thầu thấp nhất (yên/100 yên); tail càng nhỏ càng tốt
Trang đã đọc được lưu lại, lần sau chỉ đọc trang mới."""
import json, re, sys, time, urllib.request
from datetime import date
from html import unescape
from pathlib import Path
from urllib.parse import urljoin
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/global/jgb_auct.json'
BASE = 'https://www.mof.go.jp/english/policy/jgbs/auction/calendar/'
OLD_BASE = 'https://www.mof.go.jp/english/jgbs/auction/calendar/'
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'}
START = (2021, 1)
TENORS = {2, 5, 10, 20, 30, 40}


def get(url):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=45) as r:
                return r.read().decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            err = e
        except Exception as e:  # noqa: BLE001
            err = e
        time.sleep(2 * (i + 1))
    raise err


def text(h):
    h = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', h, flags=re.S | re.I)
    h = re.sub(r'<br\s*/?>|</(td|th|tr|p|div|li)>', '\n', h, flags=re.I)
    return re.sub(r'[ \t\xa0]+', ' ', unescape(re.sub(r'<[^>]+>', ' ', h)))


def num(s):
    s = (s or '').replace(',', '').strip()
    m = re.search(r'-?\d+(?:\.\d+)?', s)
    return float(m.group(0)) if m else None


def field(t, label):
    t = re.sub(r'\([^)]*\)', ' ', t)   # bỏ chú thích đơn vị trong ngoặc, ví dụ "(per 100 yen)"
    m = re.search(re.escape(label) + r'[^\n\d]*\n?\s*([-\d.,]+)', t, re.I)
    return num(m.group(1)) if m else None


def parse(h):
    t = text(h)
    sec = re.search(r'(\d+)-Year\s+(?:JGBs?|Japanese Government Bonds?)', t)
    if not sec or re.search(r'Inflation|Climate|Liquidity Enhancement|Treasury Discount', t[:600], re.I):
        return None
    ten = int(sec.group(1))
    if ten not in TENORS:
        return None
    m = re.search(r'Auction Date\s*\n?\s*(\d{1,2})/(\d{1,2})/(\d{4})', t)
    if not m:
        return None
    d = f'{m.group(3)}-{int(m.group(1)):02d}-{int(m.group(2)):02d}'
    bids, acc = field(t, 'Amounts of Competitive Bids'), field(t, 'Amounts of Bids Accepted')
    low, avg = field(t, 'Lowest Accepted Price'), field(t, 'Weighted Average Price')
    y_low, y_avg = field(t, 'Yield at the Lowest Accepted Price'), field(t, 'Yield at the Average Price')
    if not bids or not acc:
        return None
    return {'d': d, 't': f'{ten}Y', 'bids': bids, 'acc': acc, 'btc': round(bids / acc, 2),
            'low': low, 'avg': avg, 'tail': round(avg - low, 3) if low and avg else None, 'y_low': y_low, 'y_avg': y_avg}


def main():
    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    pages = old.get('pages', {})   # url → kết quả (None = không phải JGB coupon cần giữ)
    seen_cal = old.get('cal', {})
    today = date.today()
    y, m = START
    links, rep = set(), {'cal_ok': 0, 'cal_404': 0, 'new_pages': 0, 'err': []}
    while (y, m) <= (today.year, today.month):
        key = f'{y % 100:02d}{m:02d}'
        recent = (today.year - y) * 12 + today.month - m <= 2   # lịch 3 tháng gần nhất đọc lại mỗi ngày
        if key in seen_cal and not recent:
            links.update(seen_cal[key])
        else:
            try:
                h, cu = None, None
                for b in (BASE, OLD_BASE):
                    h = get(f'{b}{key}e.htm')
                    if h is not None:
                        cu = f'{b}{key}e.htm'; break
                if h is None:
                    rep['cal_404'] += 1; ls = []
                else:
                    ls = sorted({urljoin(cu, u) for u in re.findall(r'href="([^"]*eresul[^"]*\.htm)"', h, re.I)})
                    rep['cal_ok'] += 1
                seen_cal[key] = ls; links.update(ls)
            except Exception as e:  # noqa: BLE001
                rep['err'].append(f'{key}: {str(e)[:80]}')
            time.sleep(0.3)
        m += 1
        if m > 12:
            y, m = y + 1, 1
    for u in sorted(links):
        if u in pages:
            continue
        try:
            h = get(u)
            pages[u] = parse(h) if h else None; rep['new_pages'] += 1
        except Exception as e:  # noqa: BLE001
            rep['err'].append(f'{u[-30:]}: {str(e)[:80]}')
        time.sleep(0.3)
    rows = sorted((r for r in pages.values() if r), key=lambda r: (r['d'], r['t']))
    rep['rows'] = len(rows); rep['err'] = rep['err'][:20]
    OUT.write_text(json.dumps({'fetched': today.isoformat(), 'report': rep, 'cal': seen_cal, 'pages': pages, 'rows': rows}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('JGB đấu thầu:', rep)
    return 0


if __name__ == '__main__':
    sys.exit(main())
