"""Đăng một bản Cập nhật nhanh (bản chuyên viên sửa trên trang và bấm "Sao chép để đăng", hoặc bản AI viết).

Dùng: python3 scripts/add_update.py bản_mới.json   (hoặc dán JSON qua stdin)
- bỏ dòng chữ dẫn trước dấu '{' nếu có; kiểm tra tác giả, follows, trạng thái, mã chart;
- thêm vào data/quick-updates.json (không sửa bản cũ), rồi chạy build_sector_data.py.
"""
import json, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from chart_ids import chart_ids

ROOT = pathlib.Path(__file__).resolve().parents[1]
txt = open(sys.argv[1], encoding='utf-8').read() if len(sys.argv) > 1 else sys.stdin.read()
u = json.loads(txt[txt.index('{'):])
u.pop('_draft', None)
data = json.loads((ROOT / 'data/quick-updates.json').read_text(encoding='utf-8'))
ids = {x['id'] for x in data['updates']}
assert u['id'] not in ids, 'id đã có'
assert u['author']['type'] in ('AI', 'Chuyên viên') and u['author']['name'], 'thiếu tác giả'
assert u.get('follows') in (None, *ids), 'follows trỏ tới bản không tồn tại'
known = chart_ids()
for c in u['concerns']:
    assert c['status'] in ('mới', 'nóng lên', 'tiếp diễn', 'hạ nhiệt'), c['title']
    for g in c['charts']:
        assert g['id'] in known, g['id']
assert 'widata' not in json.dumps(u, ensure_ascii=False).lower(), 'không ghi WiData làm nguồn'
data['updates'].insert(0, u)
(ROOT / 'data/quick-updates.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
print('đã thêm', u['id'], '·', u['author']['type'], u['author']['name'], '· sửa', len(u.get('edited', [])), 'chỗ')
