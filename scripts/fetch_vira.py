"""Thị trường tiền tệ từ VIRA Market Watch (vira.org.vn): VNIBOR VND, VNIBOR USD, SOFR kỳ hạn.

VIRA đăng bảng dạng ẢNH, nên script đọc bằng OCR (tesseract) rồi tự kiểm tra từng dòng bằng chính số trong bảng:
  Last − Highest52W = "Change to H52W"  và  Last − Lowest52W = "Change to L52W" (sai số ≤ 0,011).
Dòng không qua kiểm tra thì bỏ (không đoán). Kết quả: data/vira/mm.json (theo ngày, theo kỳ hạn) + data/vira/log.json.

Chạy trên GitHub Actions: MAX_PAGES = số trang danh sách cần quét (mặc định 2; nạp lịch sử: 40).
"""
import io, json, os, re, sys, time, urllib.request
from pathlib import Path

from PIL import Image, ImageOps
import pytesseract

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/vira'
BASE = 'https://vira.org.vn'
UA = {'User-Agent': 'Mozilla/5.0 (FinSuccess dashboard; +https://github.com/mdnguyen-cyber/bank-dashboard)'}
TENORS = {'vnd': ['ON', '1W', '2W', '1M', '2M', '3M', '6M', '9M', '1Y'], 'usd': ['ON', '1W', '2W', '1M', '2M', '3M', '6M', '9M', '1Y'],
          'sofr': ['SW', '2W', '1M', '3M', '6M', '9M', '1Y']}
NUM = re.compile(r'^[-−–]?\d{1,3}[,.]\d{2}$')


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


def issues(max_pages):
    out = []
    for p in range(1, max_pages + 1):
        html = get(f'{BASE}/tin/Market-Watch.html' + (f'?page={p}' if p > 1 else ''))
        links = re.findall(r'href="(/tin/Market-Watch/Market-Watch-[^"]+\.html)"', html)
        new = [l for l in dict.fromkeys(links) if l not in out]
        if not new:
            break
        out += new
    return out


def num(t):
    return float(t.replace('−', '-').replace('–', '-').replace(',', '.'))


def ocr_rows(img):
    """trả các dòng: [token…] theo thứ tự trái → phải."""
    g = ImageOps.grayscale(img)
    g = g.resize((g.width * 3, g.height * 3), Image.LANCZOS)
    g = ImageOps.autocontrast(g)
    d = pytesseract.image_to_data(g, config='--psm 6', output_type=pytesseract.Output.DICT)
    lines = {}
    for i, w in enumerate(d['text']):
        w = w.strip()
        if not w or float(d['conf'][i]) < 0:
            continue
        key = (d['block_num'][i], d['par_num'][i], d['line_num'][i])
        lines.setdefault(key, []).append((d['left'][i], w))
    return [[w for _, w in sorted(v)] for _, v in sorted(lines.items(), key=lambda kv: min(x for x, _ in kv[1]) * 0 + kv[0][2] + kv[0][0] * 1000)]


def parse(img):
    """→ {'vnd'|'usd'|'sofr': {tenor: {...}}}, header date nếu có, dòng thô để gỡ lỗi."""
    rows = ocr_rows(img)
    res, cur, hdr, raw = {}, None, None, []
    for toks in rows:
        line = ' '.join(toks)
        raw.append(line)
        up = line.upper()
        if 'VNIBOR' in up and 'VND' in up:
            cur = 'vnd'
        elif 'VNIBOR' in up and 'USD' in up:
            cur = 'usd'
        elif 'SOFR' in up:
            cur = 'sofr'
        m = re.search(r'(\d{2})-(\d{2})-(\d{2})', line)
        if m and cur == 'vnd':
            hdr = f'20{m.group(3)}-{m.group(2)}-{m.group(1)}'
        if not cur:
            continue
        ten = next((t for t in toks if t.upper() in TENORS[cur]), None)
        nums = [t for t in toks if NUM.match(t)]
        if not ten or len(nums) < 9:
            continue
        v = [num(x) for x in nums[-9:]]   # Last, D/D, W/W, YTD, Y/Y, H52, chgH, L52, chgL
        last, h52, ch, l52, cl = v[0], v[5], v[6], v[7], v[8]
        ok = abs(last - h52 - ch) <= 0.011 and abs(last - l52 - cl) <= 0.011
        res.setdefault(cur, {})[ten.upper()] = {'v': last, 'dd': v[1], 'ww': v[2], 'h52': h52, 'l52': l52, 'ok': ok}
    return res, hdr, raw


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    pth = OUT / 'mm.json'
    db = json.loads(pth.read_text(encoding='utf-8')) if pth.exists() else {'days': {}}
    seen = {d.get('src') for d in db['days'].values()}
    log = []
    max_pages = int(os.environ.get('MAX_PAGES', '2'))
    for link in issues(max_pages):
        url = BASE + link
        if url in seen:
            continue
        try:
            html = get(url)
            imgs = re.findall(r'<img[^>]+src="(https://static\.vira\.org\.vn/upload/news/(\d\d)/(\d\d)/(\d\d)/[A-Z0-9]+\.(?:png|jpg|jpeg))"', html)
            # chỉ ảnh của chính số này: cùng ngày đăng với ảnh đầu tiên
            if not imgs:
                log.append({'src': url, 'err': 'không thấy ảnh'}); continue
            day = imgs[0][1:]
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
            date = hdr or pub
            if n_ok:
                db['days'][date] = {'pub': pub, 'src': url, 'ok': n_ok, 'rows': n_all,
                                    **{k: {t: x['v'] for t, x in got[k].items() if x['ok']} for k in got}}
            log.append({'src': url, 'date': date, 'ok': n_ok, 'rows': n_all, 'bad': [f'{k}:{t}' for k in got for t, x in got[k].items() if not x['ok']],
                        'raw': raws if n_ok < 20 else None})
            print(date, n_ok, '/', n_all, file=sys.stderr)
        except Exception as e:  # noqa: BLE001
            log.append({'src': url, 'err': str(e)[:200]})
    db['days'] = dict(sorted(db['days'].items()))
    db['fetched'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    pth.write_text(json.dumps(db, ensure_ascii=False, indent=0), encoding='utf-8')
    (OUT / 'log.json').write_text(json.dumps({'fetched': db['fetched'], 'log': log}, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
