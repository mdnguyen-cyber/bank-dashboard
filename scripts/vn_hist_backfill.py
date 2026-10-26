#!/usr/bin/env python3
"""Tạo data/backfill/vn_hist.json: lịch sử dài (theo tháng) của các chỉ tiêu Việt Nam cho bản đồ nhiệt, từ response
WiData gốc (data/raw/wi, không commit). Nguồn gốc số liệu: Cục Thống kê, NHNN, Bộ Tài chính, S&P Global (PMI).
Chuỗi theo ngày/tuần được gộp theo tháng: bình quân (LNH qua đêm, TPCP 10 năm) hoặc số cuối tháng (tỷ giá, lãi suất).
Chạy lại sau mỗi lần lấy thêm số WiData."""
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'data/raw/wi'
OUT = ROOT / 'data/backfill/vn_hist.json'

DIRECT = {265963: 'dep', 265954: 'm2', 76885: 'res', 75804: 'cpi_avg', 75701: 'cpi', 202889: 'cpi_core', 76887: 'fdi_real_yoy',
          76888: 'fdi_reg_yoy', 76717: 'pub_yoy', 74409: 'ret', 202891: 'iip', 81621: 'pmi', 75847: 'credit', 255693: 'tb', 80042: 'gdp'}
LEVEL_YOY = {83479: 'xk', 92728: 'nk', 81412: 'tour'}
M_END = {82223: 'nhtm', 82226: 'free', 202886: 'dep12s', 81522: 'omo'}
M_AVG = {82237: 'on', 234526: 'vn10'}


def rows(resp):
    """(indicator_id, [(date, value)]) cho cả dạng macro get_values và gbond (bảng cot/dong)."""
    d = resp.get('data') if isinstance(resp, dict) else None
    out = []
    if isinstance(d, list):
        for r in d:
            if isinstance(r, dict) and 'values' in r:
                out.append((r.get('indicator_id'), [(p['date'], p['value']) for p in r['values'] or []]))
    elif isinstance(d, dict) and 'dong' in d:
        c = d['cot']
        if 'values' in c and 'indicator_id' in c:
            i, j = c.index('indicator_id'), c.index('values')
            out += [(r[i], [(p['date'], p['value']) for p in r[j] or []]) for r in d['dong']]
        elif {'indicator_id', 'date', 'value'} <= set(c):
            i, j, k = c.index('indicator_id'), c.index('date'), c.index('value')
            g = defaultdict(list)
            for r in d['dong']:
                g[r[i]].append((r[j], r[k]))
            out += list(g.items())
    return out


def main():
    pts = defaultdict(dict)   # iid -> {date: value}
    prev = json.loads(OUT.read_text(encoding='utf-8')).get('s', {}) if OUT.exists() else {}   # giữ lịch sử đã có
    for f in sorted(RAW.glob('wi_data_*.json')):
        if not (f.name.startswith('wi_data_macro') or f.name.startswith('wi_data_gbond')):
            continue
        try:
            j = json.loads(f.read_text(encoding='utf-8'))
        except Exception:  # noqa: BLE001
            continue
        resp = j.get('response') or {}
        if isinstance(resp, str):
            try: resp = json.loads(resp)
            except Exception: continue  # noqa: E701
        for iid, vals in rows(resp):
            try: iid = int(iid)
            except (TypeError, ValueError): continue  # noqa: E701
            if iid not in DIRECT and iid not in LEVEL_YOY and iid not in M_END and iid not in M_AVG:
                continue
            for d, v in vals:
                if v is not None and d:
                    pts[iid][d[:10]] = float(v)
    s = {}
    for iid, k in DIRECT.items():
        ser = {d[:7]: round(v / 1000 if k == 'tb' else v, 4) for d, v in sorted(pts[iid].items())}
        if ser: s[k] = ser  # noqa: E701
    for iid, k in LEVEL_YOY.items():
        lv = {d[:7]: v for d, v in sorted(pts[iid].items())}
        ser = {}
        for m, v in lv.items():
            p = f'{int(m[:4]) - 1}{m[4:]}'
            if p in lv and lv[p]:
                ser[m] = round((v / lv[p] - 1) * 100, 4)
        if ser: s[k] = ser  # noqa: E701
    for iid, k in M_END.items():
        ser = {}
        for d, v in sorted(pts[iid].items()):
            ser[d[:7]] = round(v, 4)
        if k == 'omo' and ser:   # OMO: giữ mức gần nhất cho tháng không có phiên
            ms, cur, y, mo = sorted(ser), None, None, None
            y, mo = int(ms[0][:4]), int(ms[0][5:])
            last = ms[-1]
            full = {}
            while f'{y}-{mo:02d}' <= last:
                m = f'{y}-{mo:02d}'
                cur = ser.get(m, cur); full[m] = cur
                mo += 1
                if mo > 12: y, mo = y + 1, 1  # noqa: E701
            ser = full
        if ser: s[k] = ser  # noqa: E701
    for iid, k in M_AVG.items():
        g = defaultdict(list)
        for d, v in pts[iid].items():
            g[d[:7]].append(v)
        ser = {m: round(sum(v) / len(v), 4) for m, v in sorted(g.items())}
        if ser: s[k] = ser  # noqa: E701
    for k, v in prev.items():   # tháng nào dữ liệu gốc lần này không có thì giữ số cũ
        s[k] = {**v, **s.get(k, {})}
        s[k] = dict(sorted(s[k].items()))
    OUT.write_text(json.dumps({'src': 'Cục Thống kê, NHNN, Bộ Tài chính, S&P Global; Vietcombank (tỷ giá NHTM)', 's': s}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    for k, v in s.items():
        print(f'{k:14s} {len(v):4d} {min(v)} → {max(v)}')


if __name__ == '__main__':
    main()
