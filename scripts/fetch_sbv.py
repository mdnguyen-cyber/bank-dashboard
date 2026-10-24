#!/usr/bin/env python3
"""Chỉ tiêu ngân hàng toàn hệ thống từ NHNN (sbv.gov.vn): M2 và tiền gửi, dư nợ tín dụng theo ngành, LDR, nợ xấu.
Mỗi trang NHNN chỉ hiện THÁNG MỚI NHẤT, không có kho lưu trữ → chạy hằng ngày và lưu dồn vào data/vn/sbv.json theo
tháng tham chiếu đọc từ chính tiêu đề bảng ("Tháng 8 Năm 2026"); chạy lại không làm sai kỳ.
- Trang M2, tín dụng, LDR: HTML dựng sẵn ở máy chủ → đọc trực tiếp.
- Trang nợ xấu, tiền mặt/M2: bảng dựng bằng JavaScript → mở bằng trình duyệt headless (Playwright), nếu có.
NHNN đứng sau tường lửa F5: gọi dồn sẽ bị trả trang "Request Rejected" (mã 200) → giãn cách 6 giây, nhận diện và bỏ qua.
Cách đọc bảng tham khảo gói vnmacro (MIT, github.com/KhoaSampleTown/vnmacro)."""
import json, re, sys, time, unicodedata, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'data/vn/sbv.json'
BASE = 'https://sbv.gov.vn/vi/'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
PAGES = [('m2', 'tong-phuong-tien-thanh-toan', False), ('credit', 'du-no-tin-dung-doi-voi-nen-kt-dttktt', False),
         ('ldr', 'ty-le-du-no-cho-vay-so-voi-tong-tien-gui', False), ('npl', 'ty-le-no-xau-trong-tong-du-no-tin-dung', True),
         ('cash', 'tien-mat-luu-thong-tren-tong-phuong-tien-thanh-toan', True)]
GAP = 6.0


def fold(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').replace('đ', 'd').replace('Đ', 'D').lower()


def num(s):
    s = (s or '').strip().replace('\xa0', ' ').replace(' ', '')
    if not re.fullmatch(r'[-+(]?[\d.,]+%?\)?', s or 'x'):
        return None
    neg = s.startswith('(') or s.startswith('-')
    s = s.strip('()%+-')
    if ',' in s and '.' in s:               # 1.234,56 kiểu Việt Nam
        s = s.replace('.', '').replace(',', '.')
    elif ',' in s:
        s = s.replace(',', '.')
    elif s.count('.') > 1 or re.fullmatch(r'\d{1,3}(\.\d{3})+', s):   # dấu chấm ngăn nghìn
        s = s.replace('.', '')
    try:
        v = float(s)
    except ValueError:
        return None
    return -v if neg else v


def period(text):
    m = re.search(r'thang\s*(\d{1,2})\s*(?:/|nam)\s*(\d{4})', fold(text))
    return f'{int(m.group(2)):04d}-{int(m.group(1)):02d}' if m and 1 <= int(m.group(1)) <= 12 else None


def parse(html):
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'lxml')
    for t in soup.find_all(['nav', 'header', 'footer', 'script', 'style']):
        t.decompose()
    page_p = period(soup.get_text(' '))
    out, seen = [], set()
    for tb in soup.find_all('table'):
        rows = [[re.sub(r'\s+', ' ', c.get_text(' ')).strip() for c in tr.find_all(['td', 'th'])] for tr in tb.find_all('tr')]
        rows = [r for r in rows if any(r)]
        if len(rows) < 2:
            continue
        p, node = period(' '.join(' '.join(r) for r in rows[:3])), tb
        for _ in range(5):
            if p or node is None:
                break
            node = node.parent
            p = period(node.get_text(' ')) if node is not None else None
        p = p or page_p
        for r in rows:
            li = next((i for i, c in enumerate(r) if c and num(c) is None and not re.fullmatch(r'[IVX\d.]+', c)), None)
            label = r[li] if li is not None else None
            vals = [num(c) for c in r[li + 1:] if num(c) is not None] if li is not None else []   # bỏ cột STT trước tên dòng
            if not label or not vals or len(label) > 120 or len(vals) > 4 or fold(label).startswith(('stt', 'chi tieu', 'ghi chu')):   # bỏ dòng của bảng bọc ngoài
                continue
            key = (p, label, tuple(vals))
            if key in seen:
                continue
            seen.add(key); out.append({'p': p, 'label': label, 'v': vals})
    return out


def get_static(slug):
    req = urllib.request.Request(BASE + slug, headers={'User-Agent': UA, 'Accept-Language': 'vi,en;q=0.8'})
    h = urllib.request.urlopen(req, timeout=60).read().decode('utf-8', 'replace')
    if 'Request Rejected' in h or len(h) < 1000:
        raise RuntimeError('NHNN từ chối (tường lửa)')
    return h


def get_rendered(slug):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        pg = b.new_page(user_agent=UA)
        pg.goto(BASE + slug, wait_until='domcontentloaded', timeout=90000)
        pg.wait_for_timeout(10000)
        h = pg.content(); b.close()
    if 'Request Rejected' in h:
        raise RuntimeError('NHNN từ chối (tường lửa)')
    return h


def main():
    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {'pages': {}}
    pages, rep = old.get('pages', {}), {}
    for pid, slug, js in PAGES:
        try:
            h = get_rendered(slug) if js else get_static(slug)
            recs = [r for r in parse(h) if r['p']]
            for r in recs:
                pages.setdefault(pid, {}).setdefault(r['p'], {})[r['label']] = r['v']
            rep[pid] = f"{len(recs)} dòng, kỳ {sorted({r['p'] for r in recs})}"
        except Exception as e:  # noqa: BLE001
            rep[pid] = 'lỗi: ' + str(e)[:160]
        time.sleep(GAP)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'fetched': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), 'report': rep, 'pages': pages}, ensure_ascii=False, indent=0), encoding='utf-8')
    for k, v in rep.items():
        print(k, '→', v)
    return 0


if __name__ == '__main__':
    sys.exit(main())
