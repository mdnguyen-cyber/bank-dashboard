#!/usr/bin/env python3
"""Database › Hướng dẫn xây dựng: docs/huong-dan/*.md → data/guide.js (window.GUIDE).
Mỗi file .md là một chương (tên file bắt đầu bằng số thứ tự); tiêu đề # đầu file là tên chương; ##/### thành mục lục."""
import json, pathlib, re, datetime as dt, html
import markdown

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'docs' / 'huong-dan'


def slug(s, used):
    s = re.sub(r'<[^>]+>', '', s)
    b = re.sub(r'[^0-9a-zA-ZÀ-ỹ]+', '-', s.lower()).strip('-')[:60] or 'muc'
    k, i = b, 2
    while k in used:
        k, i = f'{b}-{i}', i + 1
    used.add(k)
    return k


def main():
    chs, used = [], set()
    for f in sorted(SRC.glob('*.md')):
        md = f.read_text()
        m = re.match(r'#\s+(.+)\n', md)
        title = m.group(1).strip() if m else f.stem
        body = markdown.markdown(md, extensions=['tables', 'fenced_code', 'sane_lists'])
        cid = slug(f.stem, used)
        heads = []
        def h(mo):
            lv, txt = int(mo.group(1)), mo.group(2)
            if lv == 1:
                return f'<h1>{txt}</h1>'
            hid = slug(cid + '-' + html.unescape(txt), used)
            heads.append({'id': hid, 't': html.unescape(re.sub(r'<[^>]+>', '', txt)), 'l': lv})
            return f'<h{lv} id="g-{hid}">{txt}</h{lv}>'
        body = re.sub(r'<h([123])>(.*?)</h\1>', h, body)
        # bọc từng mục ## thành khối để lọc theo từ khóa
        parts = re.split(r'(?=<h2 )', body)
        body = parts[0] + ''.join(f'<div class="gd-sec">{p}</div>' for p in parts[1:])
        chs.append({'id': cid, 't': title, 'h': heads, 'html': body})
    out = {'built': dt.date.today().strftime('%d/%m/%Y'), 'intro': 'Tài liệu để dựng lại dashboard này gần như nguyên bản: cấu trúc trang, từng chart (loại, kích thước, dữ liệu, lời đọc), tính năng, dữ liệu và quy trình cập nhật.', 'ch': chs}
    (ROOT / 'data' / 'guide.js').write_text('window.GUIDE=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('data/guide.js', len(chs), 'chương', sum(len(c['h']) for c in chs), 'mục')


if __name__ == '__main__':
    main()
