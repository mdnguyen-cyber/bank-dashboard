#!/usr/bin/env python3
"""Số liệu vĩ mô Việt Nam tự động từ dulieukinhte.com (tổng hợp miễn phí từ Cục Thống kê, NHNN, Vietcombank, S&P Global…).
Mỗi trang /du-lieu/<slug> có các dòng (data-row-id); lấy tên dòng từ HTML rồi tải chuỗi qua /api/internal/data/series.
Ghi data/vn/dlkt.json: {slug: {row_id: {n: tên, d: [ngày], v: [giá trị]}}}. Lỗi một trang thì giữ bản cũ của trang đó.
Phần trước 2019 (cùng lần tải, không tốn thêm request) gộp theo tháng vào data/vn/dlkt_hist.json: {slug: {row_id: {n, a: {tháng: bình quân}, e: {tháng: số cuối tháng}}}}
— dùng cho bản đồ nhiệt nhiều năm."""
import html, json, re, sys, time, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'data/vn/dlkt.json'
HIST = ROOT / 'data/vn/dlkt_hist.json'
BASE = 'https://dulieukinhte.com'
UA = {'User-Agent': 'Mozilla/5.0 (FinSuccess dashboard; +https://github.com/mdnguyen-cyber/bank-dashboard)'}
FROM = '2019-01-01'
PAGES = ['pmi-271', 'chi-so-gia-tieu-dung-cpi-272', 'sbv-bomhut-tien-334', 'tang-truong-tin-dung-toc-do-353', 'cung-tien-m2-huy-dong-385',
         'lai-suat-dieu-hanh-lien-ngan-hang-391', 'lai-suat-cho-vay-binh-quan-ngan-hang-700', 'lai-suat-huy-dong-vietcombank-376',
         'ty-gia-usdvnd-cua-nhnn-427', 'ty-gia-cho-den-719', 'ty-gia-ngoai-te-vietcombank-379', 'gia-vang-407', 'can-can-thanh-toan-361',
         'tong-xuat-khau-292', 'tong-nhap-khau-293', 'von-fdi-dang-ky-cap-moi-405', 'gdp-so-sanh-theo-quy-269', 'iip-277', 'ban-le-hang-hoa-va-dich-vu-273',
         'gia-xang-dau-406', 'cpi-so-cung-ky-319', 'von-dau-tu-tu-nsnn-317', 'khach-quoc-te-theo-loai-hinh-295', 'von-dau-tu-phat-trien-xa-hoi-275']
TZ = timezone(timedelta(hours=7))


def get(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read().decode('utf-8')
        except Exception as e:  # noqa: BLE001
            err = e; time.sleep(2 * (i + 1))
    raise err


def rows(slug):
    h = get(f'{BASE}/du-lieu/{slug}')
    out = {}
    for m in re.finditer(r'data-row-id="(\d+)"(.{0,600}?)aria-label="Thêm &quot;(.*?)&quot; vào biểu đồ"', h, re.S):
        out[m.group(1)] = html.unescape(m.group(3)).strip()
    return out


def series(ids, hist=None):
    js = json.loads(get(f'{BASE}/api/internal/data/series?ids=' + ','.join(ids)))
    res = {}
    for s in js:
        d, v, old = [], [], {}
        for ts, x in s.get('data', []):
            if x is None:
                continue
            day = datetime.fromtimestamp(ts / 1000, TZ).date().isoformat()
            if day >= FROM:
                d.append(day); v.append(round(float(x), 4))
            else:
                old.setdefault(day[:7], []).append((day, float(x)))
        res[str(s['id'])] = (d, v)
        if hist is not None and old:
            hist[str(s['id'])] = {'a': {m: round(sum(x for _, x in p) / len(p), 4) for m, p in sorted(old.items())},
                                  'e': {m: round(max(p)[1], 4) for m, p in sorted(old.items())}}
    return res


def main():
    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    old = old.get('pages', old)
    oldh = json.loads(HIST.read_text(encoding='utf-8')).get('pages', {}) if HIST.exists() else {}
    data, rep, hist = {}, {}, {}
    for slug in PAGES:
        try:
            rw = rows(slug)
            ids = list(rw)
            got, h = {}, {}
            for i in range(0, len(ids), 40):
                got.update(series(ids[i:i + 40], h))
            data[slug] = {k: {'n': rw[k], 'd': got.get(k, ([], []))[0], 'v': got.get(k, ([], []))[1]} for k in ids}
            hist[slug] = {k: {'n': rw[k], **h[k]} for k in ids if k in h} or oldh.get(slug, {})
            rep[slug] = f'{len(ids)} dòng, {sum(1 for k in ids if got.get(k, ([], []))[0])} có số'
        except Exception as e:  # noqa: BLE001
            rep[slug] = 'lỗi: ' + str(e)[:150]
            if slug in old:
                data[slug] = old[slug]
            if slug in oldh:
                hist[slug] = oldh[slug]
        time.sleep(1)
    try:   # danh mục trang dữ liệu của nguồn, để chọn thêm chỉ tiêu (đầu tư công, FDI thực hiện…)
        idx = set()
        for u in [f'{BASE}/du-lieu', f'{BASE}/', f'{BASE}/sitemap.xml']:
            try:
                idx.update(re.findall(r'/du-lieu/([a-z0-9-]+-\d+)', get(u)))
            except Exception:  # noqa: BLE001
                pass
        (ROOT / 'data/vn/dlkt_index.json').write_text(json.dumps(sorted(idx), ensure_ascii=False, indent=0), encoding='utf-8')
    except Exception:  # noqa: BLE001
        pass
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'fetched': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), 'report': rep, 'pages': data}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    HIST.write_text(json.dumps({'note': 'trước 2019, gộp theo tháng', 'pages': {k: v for k, v in hist.items() if v}}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    for k, v in rep.items():
        print(k, '→', v, '· lịch sử từ', min([min(r['a']) for r in hist.get(k, {}).values() if r.get('a')] or ['—']))
    return 0


if __name__ == '__main__':
    sys.exit(main())
