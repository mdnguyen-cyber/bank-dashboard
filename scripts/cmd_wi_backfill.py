#!/usr/bin/env python3
"""Tạo data/backfill/cmd_wi.json: chuỗi giá hàng hóa (theo ngày; đoạn cũ theo tuần/tháng) cho tab Hàng hóa, từ response
Wi MCP gốc (data/raw/wi, không commit). Dùng cho các mặt hàng chưa có nguồn công khai tự cập nhật: cước vận tải biển
Baltic, giá Trung Quốc (cao su, PVC, thép HRC), giá trong nước (phân bón, thép, heo hơi, thủy sản, vàng SJC, xăng)
và làm dự phòng cho vàng, bạc, đường. Gộp mọi file: cùng ngày thì lấy file sau. Chạy lại sau mỗi lần kéo số Wi MCP."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'data/raw/wi'
OUT = ROOT / 'data/backfill/cmd_wi.json'
IDS = {73983: 'bdti', 73984: 'bcti', 73982: 'bdi', 203181: 'rubber_cn', 203192: 'pvc_cn', 74128: 'urea_cm', 74335: 'dap_dv',
       74384: 'pangasius', 264825: 'pang_fry', 264644: 'shrimp', 74360: 'steel_hpg', 74124: 'hog_vn', 203148: 'hrc_cn',
       1224199: 'sjc', 1224193: 'sjc_buy', 1276638: 'ron95_e10', 80239: 'ron95v', 74407: 'gold', 74406: 'silver', 74400: 'sugar'}


def rows(resp):
    d = resp.get('data') if isinstance(resp, dict) else None
    if isinstance(d, list):
        return [(r.get('indicator_id'), r.get('values') or []) for r in d if isinstance(r, dict)]
    if isinstance(d, dict) and 'dong' in d and 'values' in d.get('cot', []):
        c = d['cot']; i, j = c.index('indicator_id'), c.index('values')
        return [(r[i], r[j] or []) for r in d['dong']]
    return []


def main():
    s = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}   # giữ lịch sử đã có (dữ liệu gốc có thể chỉ gồm phần mới)
    for f in sorted(RAW.glob('wi_data_commodity*.json'), key=lambda p: p.stat().st_mtime):
        try:
            j = json.loads(f.read_text(encoding='utf-8'))
        except Exception:  # noqa: BLE001
            continue
        resp = j.get('response') or {}
        if isinstance(resp, str):
            try: resp = json.loads(resp)
            except Exception: continue  # noqa: E701
        for iid, vals in rows(resp):
            k = IDS.get(int(iid)) if str(iid).isdigit() else None
            if not k:
                continue
            ser = s.setdefault(k, {})
            for p in vals:
                if p.get('value') is not None and p.get('date'):
                    ser[p['date'][:10]] = round(float(p['value']), 4)
    out = {k: dict(sorted(v.items())) for k, v in sorted(s.items())}
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    for k, v in out.items():
        print(f'{k:12s} {len(v):5d} {min(v)} → {max(v)}')


if __name__ == '__main__':
    main()
