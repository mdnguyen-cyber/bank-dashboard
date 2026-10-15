"""Tạm: tải trang Market Watch của VIRA + ảnh Money market để thiết kế bộ đọc số (OCR)."""
import re, urllib.request, pathlib
UA = {'User-Agent': 'Mozilla/5.0'}
out = pathlib.Path('data/vira/probe'); out.mkdir(parents=True, exist_ok=True)
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read()
for name, u in [('article.html', 'https://vira.org.vn/tin/Market-Watch/Market-Watch-15-10--1-2.html'), ('list.html', 'https://vira.org.vn/tin/Market-Watch.html')]:
    try:
        (out / name).write_bytes(get(u))
    except Exception as e:
        (out / (name + '.err')).write_text(str(e))
html = (out / 'article.html').read_text('utf-8', 'ignore')
for src in re.findall(r'<img[^>]+src="([^"]+\.(?:png|jpg|jpeg))"', html, re.I):
    if 'upload/news' in src:
        u = src if src.startswith('http') else 'https://vira.org.vn' + src
        (out / u.split('/')[-1]).write_bytes(get(u))
print(sorted(p.name for p in out.iterdir()))
