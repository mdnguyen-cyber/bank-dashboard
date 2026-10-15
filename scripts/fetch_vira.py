"""Thị trường tiền tệ từ VIRA Market Watch (vira.org.vn): VNIBOR VND, VNIBOR USD, SOFR kỳ hạn.

VIRA đăng bảng dạng ẢNH, nên script đọc bằng OCR (tesseract) rồi tự kiểm tra từng dòng bằng chính số trong bảng:
  Last − Highest52W = "Change to H52W"  và  Last − Lowest52W = "Change to L52W" (sai số ≤ 0,011).
Dòng không qua kiểm tra thì bỏ (không đoán). Kết quả: data/vira/mm.json (theo ngày, theo kỳ hạn) + data/vira/log.json.

Chạy trên GitHub Actions: MAX_PAGES = số trang danh sách cần quét (mặc định 2; nạp lịch sử: 40).
"""
import datetime, io, json, os, re, sys, time, urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
import pytesseract

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/vira'
BASE = 'https://vira.org.vn'
UA = {'User-Agent': 'Mozilla/5.0 (FinSuccess dashboard; +https://github.com/mdnguyen-cyber/bank-dashboard)'}
TENORS = {'vnd': ['ON', '1W', '2W', '1M', '2M', '3M', '6M', '9M', '1Y'], 'usd': ['ON', '1W', '2W', '1M', '2M', '3M', '6M', '9M', '1Y'],
          'sofr': ['SW', '2W', '1M', '3M', '6M', '9M', '1Y']}
NUM = re.compile(r'^-?\d{1,3}[,.]\d{2}$')


def get(url, binary=False):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                b = r.read()
                return b if binary else b.decode('utf-8', 'replace')
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(3 * (i + 1))
    raise err


def issues(max_pages, start=1):
    out = []
    for p in range(start, max_pages + 1):
        html = get(f'{BASE}/tin/Market-Watch.html' + (f'?page={p}' if p > 1 else ''))
        links = re.findall(r'href="(/tin/Market-Watch/Market-Watch-[^"]+\.html)"', html)
        new = [l for l in dict.fromkeys(links) if l not in out]
        if not new:
            break
        out += new
    return out


def num(t):
    return float(t.replace('−', '-').replace('–', '-').replace(',', '.'))


def bands(mask_line):
    """các đoạn liên tiếp KHÔNG phải đường kẻ trắng → [(a, b)]."""
    out, a = [], None
    for i, sep in enumerate(list(mask_line) + [True]):
        if not sep and a is None:
            a = i
        elif sep and a is not None:
            if i - a >= 6:
                out.append((a, i))
            a = None
    return out


def clean(cell, scale=5, thr=150):
    """ô màu bất kỳ → chữ đen trên nền trắng: đo độ lệch so với màu nền (trung vị viền ô), phóng to mượt rồi mới cắt ngưỡng."""
    h, w, _ = cell.shape
    edge = np.concatenate([cell[:2].reshape(-1, 3), cell[-2:].reshape(-1, 3), cell[:, :2].reshape(-1, 3), cell[:, -2:].reshape(-1, 3)])
    bg = np.median(edge, axis=0)
    dist = np.sqrt(((cell.astype(float) - bg) ** 2).sum(axis=2))
    dist = np.clip(dist / max(dist.max(), 1) * 255, 0, 255)
    im = Image.fromarray((255 - dist).astype('uint8')).resize((w * scale, h * scale), Image.BICUBIC)
    im = im.point(lambda x: 0 if x < thr else 255)
    return ImageOps.expand(im, border=30, fill=255)


def ocr_cell(cell, num_only=True, alt=0):
    if not num_only:
        return pytesseract.image_to_string(clean(cell), config='--psm 6').strip()
    scale, thr = [(5, 150), (4, 120), (6, 180), (3, 150)][alt]
    t = pytesseract.image_to_string(clean(cell, scale, thr), config='--psm 7 -c tessedit_char_whitelist=0123456789,.-').strip().replace('.', ',')
    if re.fullmatch(r'-?\d{3,4}', t):          # mất dấu phẩy: mọi số trong bảng đều có 2 chữ số thập phân
        t = t[:-2] + ',' + t[-2:]
    return t


def grid(img):
    """→ danh sách hàng, mỗi hàng là danh sách ô (mảng RGB). Đường kẻ = dải pixel gần trắng chạy suốt."""
    a = np.asarray(img.convert('RGB')).astype(int)
    white = (a.min(axis=2) > 235)
    rows = bands(white.mean(axis=1) > 0.85)
    cols = bands(white.mean(axis=0) > 0.6)    # cột chung cho cả ảnh (hàng tiêu đề có ô gộp)
    return [[a[r0:r1, c0:c1].astype('uint8') for c0, c1 in cols] for r0, r1 in rows]


def parse(img):
    """→ {'vnd'|'usd'|'sofr': {tenor: {...}}}, header date nếu có, dòng thô để gỡ lỗi."""
    res, cur, hdr, raw, k = {}, None, None, [], 0
    for n, cells in enumerate(grid(img)):
        if len(cells) < 11 or len(cells) > 12:
            return res, hdr, raw              # không phải bảng VNIBOR/SOFR (11 cột)
        if n >= 2 and not cur:
            return res, hdr, raw
        name = ocr_cell(cells[1], False).upper().replace('\n', ' ')
        if 'VNIBOR' in name or 'SOFR' in name:
            cur = 'sofr' if 'SOFR' in name else 'usd' if 'USD' in name else 'vnd' if 'VND' in name else None
            k = 0
            if cur == 'vnd':
                m = re.search(r'(\d{2})\D(\d{2})\D(\d{2})', ocr_cell(cells[2], False))
                if m:
                    hdr = f'20{m.group(3)}-{m.group(2)}-{m.group(1)}'
            raw.append(f'[{cur}] {name}')
            continue
        if not cur:
            continue
        ten = name.strip().replace('O', '0').replace('0N', 'ON')
        ten = ten if ten in TENORS[cur] else (TENORS[cur][k] if k < len(TENORS[cur]) else None)
        k += 1
        if not ten:
            continue
        # cột cần: Last, D/D, W/W, (bỏ YTD, Y/Y), H52W, chg, L52W, chg
        need = [2, 3, 4, 7, 8, 9, 10]
        for alt in range(4):       # đọc lại với cách xử lý ảnh khác nếu dòng chưa khớp
            toks = [ocr_cell(cells[j], alt=alt) for j in need]
            raw.append(f'{cur} {ten} a{alt} ' + ' '.join(toks))
            if not all(NUM.match(t) for t in (toks[0], toks[3], toks[4], toks[5], toks[6])):
                ok = False; continue
            v = [num(x) if NUM.match(x) else None for x in toks]
            # dấu trừ trên nền đỏ hay bị mất; theo định nghĩa Last − H52W ≤ 0 và Last − L52W ≥ 0
            last, h52, ch, l52, cl = v[0], v[3], -abs(v[4]), v[5], abs(v[6])
            ok = abs(last - h52 - ch) <= 0.011 and abs(last - l52 - cl) <= 0.011
            if not ok and abs((h52 + ch) - (l52 + cl)) <= 0.011:   # ô Last đọc sai nhưng hai cặp đỉnh/đáy 52 tuần khớp → suy ra Last
                last, ok = round(h52 + ch, 2), True
            if ok:
                break
        if not all(NUM.match(t) for t in (toks[0], toks[3], toks[4], toks[5], toks[6])):
            res.setdefault(cur, {})[ten] = {'v': None, 'ok': False}
            continue
        res.setdefault(cur, {})[ten] = {'v': last, 'dd': v[1], 'ww': v[2], 'h52': h52, 'l52': l52, 'ok': ok}
    return res, hdr, raw


def one(url):
    """một số Market Watch → (ngày, bản ghi hoặc None, dòng log)."""
    try:
        html = get(url)
        imgs = re.findall(r'<img[^>]+src="(https://static\.vira\.org\.vn/upload/news/(\d\d)/(\d\d)/(\d\d)/[A-Z0-9]+\.(?:png|jpg|jpeg))"', html)
        if not imgs:
            return None, None, {'src': url, 'err': 'không thấy ảnh'}
        day = imgs[0][1:]          # chỉ ảnh của chính số này: cùng ngày đăng với ảnh đầu tiên
        pub = f'20{day[0]}-{day[1]}-{day[2]}'
        got, hdr, raws = {}, None, []
        for src, yy, mm, dd in imgs:
            if (yy, mm, dd) != day:
                continue
            res, h, raw = parse(Image.open(io.BytesIO(get(src, True))))
            if res:
                raws.append(raw)
            for k, v in res.items():
                got.setdefault(k, {}).update(v)
            hdr = hdr or h
        n_ok = sum(1 for k in got for t in got[k].values() if t['ok'])
        n_all = sum(len(got[k]) for k in got)
        # ngày số liệu = ngày trên tiêu đề bảng VND (thường là phiên trước ngày đăng); đọc lỗi → phiên làm việc liền trước ngày đăng
        pd = datetime.date.fromisoformat(pub)
        try:
            ok_hdr = hdr is not None and 0 <= (pd - datetime.date.fromisoformat(hdr)).days <= 7
        except ValueError:
            ok_hdr = False
        if ok_hdr:
            date = hdr
        else:
            g = pd - datetime.timedelta(days=1)
            while g.weekday() >= 5:
                g -= datetime.timedelta(days=1)
            date = g.isoformat()
        rec = {'pub': pub, 'src': url, 'dateFromHeader': ok_hdr, 'ok': n_ok, 'rows': n_all,
               **{k: {t: x['v'] for t, x in got[k].items() if x['ok']} for k in got}} if n_ok else None
        lg = {'src': url, 'date': date, 'ok': n_ok, 'rows': n_all, 'bad': [f'{k}:{t}' for k in got for t, x in got[k].items() if not x['ok']],
              'raw': [r for rr in raws for r in rr if not r.startswith('[')][-40:] if n_ok < 20 else None}
        return date, rec, lg
    except Exception as e:  # noqa: BLE001
        return None, None, {'src': url, 'err': str(e)[:200]}


def main():
    from multiprocessing import Pool
    OUT.mkdir(parents=True, exist_ok=True)
    pth = OUT / 'mm.json'
    db = json.loads(pth.read_text(encoding='utf-8')) if pth.exists() else {'days': {}}
    seen = {d.get('src') for d in db['days'].values()}
    part = os.environ.get('OUT_PART')          # chạy song song theo khúc trang: chỉ ghi phần mới vào file riêng, job gộp sau
    if part:
        db, seen = {'days': {}}, set()
    todo = [BASE + l for l in issues(int(os.environ.get('MAX_PAGES', '2')), int(os.environ.get('START_PAGE', '1'))) if BASE + l not in seen]
    print(len(todo), 'số cần đọc', file=sys.stderr)
    log = []
    with Pool(int(os.environ.get('WORKERS', '4'))) as pool:
        for date, rec, lg in pool.imap_unordered(one, todo):
            log.append(lg)
            if rec:
                old = db['days'].get(date)
                if not old or old.get('ok', 0) <= rec['ok']:
                    db['days'][date] = rec
            print(lg.get('date'), lg.get('ok'), '/', lg.get('rows'), lg.get('err', ''), file=sys.stderr)
            if len(log) % 20 == 0 and not part:
                save(db, log)
    if part:
        Path(part).parent.mkdir(parents=True, exist_ok=True)
        Path(part).write_text(json.dumps({'days': db['days'], 'log': log}, ensure_ascii=False), encoding='utf-8')
        return
    save(db, log)


def save(db, log):
    db['days'] = dict(sorted(db['days'].items()))
    db['fetched'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    (OUT / 'mm.json').write_text(json.dumps(db, ensure_ascii=False, indent=0), encoding='utf-8')
    (OUT / 'log.json').write_text(json.dumps({'fetched': db['fetched'], 'log': log}, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
