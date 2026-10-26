"""Liệt kê mã chart (dùng trong Chart book và data/quick-updates.json) kèm tiêu đề, đọc từ assets/sector.js.

Chạy: python3 scripts/chart_ids.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def chart_ids():
    js = (ROOT / 'assets/sector.js').read_text(encoding='utf-8')
    out = {}
    for m in re.finditer(r"card\(\{\s*id:\s*'(\w+)',\s*title:\s*(['`])(.*?)\2", js, re.S):
        out[m.group(1)] = re.sub(r'\$\{[^}]*\}', '…', m.group(3))
    sm = re.search(r"const SAFE = \[(.*?)\];", js)   # chart nhóm trú ẩn an toàn: id ghép 'fxS_' + mã
    if sm:
        for m in re.finditer(r"\['(\w+)', '([^']+)'", sm.group(1)):
            out['fxS_' + m.group(1)] = m.group(2) + ' theo ngày so với DXY'
    for m in re.finditer(r"mk\('(ch\w+)'", js):
        out.setdefault(m.group(1), '(tiêu đề động)')
    return out


if __name__ == '__main__':
    for k, v in chart_ids().items():
        print(f'{k:16s} {v}')
