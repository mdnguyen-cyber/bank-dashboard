"""Đăng ghi chép của chuyên viên (nhận định ngành, quyết định từng mã) vào lịch sử chung để AI đọc lại.

Dùng: python3 scripts/add_note.py <file.json>   (file = nội dung nút "Sao chép để đăng": {"key": ..., "versions": [...]})
Trước khi chạy, AI rà chính tả và Việt hoá thuật ngữ trong "html"/"text" (giữ thuật ngữ gốc trong ngoặc), ghi chỗ sửa vào "aiEdits".
Ghi data/notes.json (nguồn) và data/notes-data.js (window.FS_NOTES cho trang).
"""
import json, re, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / 'data/notes.json'
ALLOWED = re.compile(r'</?(b|i|u|ul|ol|li)>|<br>')


def safe_html(h):
    """chỉ giữ thẻ định dạng cơ bản; mọi thẻ khác bỏ."""
    return re.sub(r'<[^>]*>', lambda m: m.group(0) if ALLOWED.fullmatch(m.group(0)) else '', h or '')


def build():
    db = json.loads(P.read_text(encoding='utf-8')) if P.exists() else {'notes': {}}
    db['built'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    (ROOT / 'data/notes-data.js').write_text('window.FS_NOTES = ' + json.dumps(db, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    return db


def main(fn):
    inc = json.loads(Path(fn).read_text(encoding='utf-8'))
    db = json.loads(P.read_text(encoding='utf-8')) if P.exists() else {'notes': {}}
    cur = db['notes'].setdefault(inc['key'], [])
    ids = {v['id'] for v in cur}
    n = 0
    for v in inc['versions']:
        if v['id'] in ids:
            continue
        for k in ('id', 'at', 'html'):
            assert k in v, f'thiếu {k}'
        v['html'] = safe_html(v['html'])
        cur.append(v)
        n += 1
    cur.sort(key=lambda v: v['at'])
    P.write_text(json.dumps(db, ensure_ascii=False, indent=1), encoding='utf-8')
    build()
    print(f"{inc['key']}: thêm {n} bản, tổng {len(cur)}")


if __name__ == '__main__':
    if len(sys.argv) > 1:
        main(sys.argv[1])
    else:
        build()
