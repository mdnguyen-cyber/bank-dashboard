"""Gộp chi tiết thuyết minh BCTC của các CTCK (data/backfill/sec_detail/<MÃ>.json) và giá các mã niêm yết
trong danh mục (data/backfill/sec_detail/_px.json) thành data/sec-detail.js cho trang dn.html."""
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / 'data/backfill/sec_detail'
out = {}
for f in sorted(D.glob('*.json')):
    if f.name.startswith('_'):
        continue
    out[f.stem] = json.loads(f.read_text(encoding='utf-8'))
px = json.loads((D / '_px.json').read_text(encoding='utf-8')) if (D / '_px.json').exists() else {'px': {}}
js = 'window.SEC_DET=' + json.dumps({'co': out, 'px': px['px']}, ensure_ascii=False, separators=(',', ':')) + ';\n'
(ROOT / 'data/sec-detail.js').write_text(js, encoding='utf-8')
print('wrote data/sec-detail.js', len(js) // 1024, 'KB', list(out))
