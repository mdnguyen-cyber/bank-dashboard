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
VER = 6


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


def cells(row):   # chịu được HTML cũ thiếu thẻ đóng </td>, </tr>
    parts = re.split(r'<t[hd](?:\s[^>]*)?>', row, flags=re.I)[1:]
    return [re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]+>', ' ', c))).strip() for c in parts]


def norm(lbl):
    return re.sub(r'\s+', ' ', re.sub(r'\([^)]*\)', ' ', lbl)).strip().lower()


def parse(h):
    """Bảng kết quả nằm ngang: một hàng tiêu đề (Security, Auction Date, …) và một hàng giá trị bên dưới."""
    head = text(h)[:800]
    if re.search(r'Inflation|Climate|Liquidity Enhancement|Treasury Discount|T-Bill', head, re.I):
        return None
    for tb in re.findall(r'<table.*?</table>', h, re.S | re.I):
        rows = [cells(r) for r in re.split(r'<tr(?:\s[^>]*)?>', tb, flags=re.I)[1:]]
        rows = [r for r in rows if r]
        for k, r in enumerate(rows):
            lab = [norm(x) for x in r]
            if 'auction date' in lab and k + 1 < len(rows) and len(rows[k + 1]) >= len(r):
                v = dict(zip(lab, rows[k + 1]))
                g = lambda key: num(v.get(key))
                m = re.match(r'(\d+)-Year', v.get('security', ''), re.I)
                if not m or int(m.group(1)) not in TENORS:
                    return None
                dm = re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})', v.get('auction date', ''))
                if not dm:
                    return None
                bids, acc = g('amounts of competitive bids'), g('amounts of bids accepted')
                low, avg = g('lowest accepted price'), g('weighted average price')
                yl, ya = g('yield at the lowest accepted price'), g('yield at the average price')
                if yl is None:   # 40Y đấu thầu theo lợi suất: tên cột có thể khác đôi chút
                    fk = lambda *ws: next((k for k in v if all(w in k for w in ws)), None)
                    yl, ya = num(v.get(fk('highest', 'yield'))), num(v.get(fk('average', 'yield')))
                if not bids or not acc:
                    return None
                return {'d': f'{dm.group(3)}-{int(dm.group(1)):02d}-{int(dm.group(2)):02d}', 't': f'{int(m.group(1))}Y', 'bids': bids, 'acc': acc,
                        'btc': round(bids / acc, 2), 'low': low, 'avg': avg, 'tail': round(avg - low, 3) if low and avg else None,
                        'y_low': yl, 'y_avg': ya}
    return None


def main():
    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    pages = old.get('pages', {})   # url → kết quả (None = không phải JGB coupon cần giữ)
    if old.get('ver') != VER:
        pages = {u: r for u, r in pages.items() if (r or r is False) and not (r and r.get('t') == '40Y' and r.get('y_low') is None)}   # đổi cách đọc trang → đọc lại các trang đã có nhưng chưa lấy được số (giữ trang không tồn tại = False)
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
    # 2021–2022: lịch tháng không còn trên trang MOF → thử trực tiếp trang kết quả theo ngày làm việc (đường dẫn cũ và mới)
    probe = old.get('probe', {})
    d0 = date(2021, 1, 4)
    while d0 < date(2023, 1, 1):
        if d0.weekday() < 5:
            for b in ('https://www.mof.go.jp/english/jgbs/auction/calendar/eresul/', BASE + 'eresul/'):
                for suf in ('', 'a'):
                    links.add(f'{b}eresul{d0:%Y%m%d}{suf}.htm')
        d0 = date.fromordinal(d0.toordinal() + 1)
    for u in sorted(links):
        if 'etbill' in u:
            continue
        if u in pages:
            continue
        try:
            h = get(u)
            pages[u] = (parse(h) if h else False); rep['new_pages'] += 1
            if h and pages[u] is None and 'eresul20' in u and u.rsplit('eresul', 1)[1][:4] in ('2021', '2022') and not (ROOT / 'data/global/jgb_debug.html').exists():
                (ROOT / 'data/global/jgb_debug.html').write_text(u + '\n' + h[:20000], encoding='utf-8')   # mẫu trang chưa đọc được, để chỉnh cách đọc
        except Exception as e:  # noqa: BLE001
            rep['err'].append(f'{u[-30:]}: {str(e)[:80]}')
        time.sleep(0.3)
    uniq = {}
    for r in pages.values():
        if r:
            uniq[(r['d'], r['t'])] = r   # cùng một phiên có thể có 2 đường dẫn (cũ, mới)
    rows = sorted(uniq.values(), key=lambda r: (r['d'], r['t']))
    # dữ liệu lịch sử MOF (2021–2022 không còn trang kết quả riêng): tìm file tải về ở trang Historical Data of Auction Results
    try:
        idx_u = 'https://www.mof.go.jp/english/policy/jgbs/auction/past_auction_results/index.html'
        hi = get(idx_u) or ''
        files = sorted({urljoin(idx_u, u) for u in re.findall(r'href="([^"]+\.(?:xlsx?|csv))"', hi, re.I)})
        rep['hist_files'] = files[:40]
        rawd = ROOT / 'data/global/jgb_hist_raw'; rawd.mkdir(parents=True, exist_ok=True)
        for u in files[:6]:
            fn = rawd / u.rsplit('/', 1)[1]
            if not fn.exists():
                with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60) as r_:
                    fn.write_bytes(r_.read())
        if not files:
            (ROOT / 'data/global/jgb_hist_index.html').write_text(hi[:30000], encoding='utf-8')
    except Exception as e:  # noqa: BLE001
        rep['hist_err'] = str(e)[:200]
    rep['rows'] = len(rows); rep['err'] = rep['err'][:20]
    OUT.write_text(json.dumps({'fetched': today.isoformat(), 'ver': VER, 'report': rep, 'cal': seen_cal, 'pages': pages, 'rows': rows}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('JGB đấu thầu:', rep)
    return 0


if __name__ == '__main__':
    sys.exit(main())
