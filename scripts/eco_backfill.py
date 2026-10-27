#!/usr/bin/env python3
"""Tạo data/backfill/eco_wi.json từ response Wi MCP gốc (data/raw/wi, không commit): các chuỗi vĩ mô VN mà nguồn
tự động (dulieukinhte.com) chưa có hoặc bị đổi kỳ gốc — CPI theo nhóm (YoY), lạm phát cơ bản, FDI thực hiện/đăng ký,
giải ngân vốn đầu tư từ ngân sách, GDP quý (YoY) — cùng dự báo CPI của các tổ chức. Chạy lại sau mỗi lần lấy số Wi MCP."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'data/raw/wi'
OUT = ROOT / 'data/backfill/eco_wi.json'
IDS = {75701: 'cpi', 75702: 'cpi_food', 75706: 'cpi_bev', 75707: 'cpi_cloth', 75708: 'cpi_house', 75709: 'cpi_equip', 75710: 'cpi_health',
       75712: 'cpi_trans', 75713: 'cpi_post', 75714: 'cpi_edu', 75716: 'cpi_cult', 75717: 'cpi_other', 202889: 'cpi_core',
       76951: 'fdi_real', 76887: 'fdi_real_yoy', 76952: 'fdi_reg', 76888: 'fdi_reg_yoy', 76903: 'fdi_real_ytd', 76911: 'fdi_real_ytd_yoy',
       76904: 'fdi_reg_ytd', 76912: 'fdi_reg_ytd_yoy', 76847: 'pub', 76717: 'pub_yoy', 76751: 'pub_ytd', 76767: 'pub_ytd_yoy', 80042: 'gdp_q', 75847: 'credit_yoy'}


def rows(resp):
    d = resp.get('data')
    if isinstance(d, dict) and 'dong' in d and 'indicator_id' in d['cot'] and 'values' in d['cot']:
        i = d['cot'].index('indicator_id'); j = d['cot'].index('values')
        return [(r[i], r[j]) for r in d['dong']]
    if isinstance(d, list):
        return [(r.get('indicator_id'), r.get('values')) for r in d if isinstance(r, dict) and 'values' in r]
    return []


def main():
    out = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    s = out.get('s', {})
    for f in sorted(RAW.glob('wi_data_macro*.json')):
        try:
            j = json.loads(f.read_text(encoding='utf-8'))
        except Exception:  # noqa: BLE001
            continue
        resp = j.get('response') or {}
        if isinstance(resp, str):
            try: resp = json.loads(resp)
            except Exception: continue  # noqa: E701
        for iid, vals in rows(resp):
            k = IDS.get(iid)
            if not k or not vals: continue  # noqa: E701
            ser = s.setdefault(k, {})
            for p in vals:
                if p.get('value') is not None:
                    ser[p['date'][:7]] = round(float(p['value']), 4)
        if 'forecast' in f.name:   # dự báo CPI: lấy bản mới nhất của mỗi tổ chức
            d = (resp.get('data') or {})
            if isinstance(d, dict) and 'dong' in d:
                c = d['cot']; R = [dict(zip(c, r)) for r in d['dong']]
                avg = {}
                for r in sorted(R, key=lambda r: r['release_date']):
                    if r['indicator_code'] == 'CPI_AVG_YOY' and r['period'] == '2026':
                        avg[(r['provider'], r.get('scenario') or '')] = [r['provider'], r.get('scenario') or '', r['value'], r['release_date']]
                surv = [r['value'] for r in R if r['indicator_code'] == 'CPI_YOY' and r['source_type'] == 'vira_survey' and len(r['period']) == 7]
                per = next((r['period'] for r in R if r['indicator_code'] == 'CPI_YOY' and r['source_type'] == 'vira_survey' and len(r['period']) == 7), None)
                date = next((r['release_date'] for r in R if r['source_type'] == 'vira_survey'), None)
                surv.sort()
                out['cpiFc'] = {'avg': sorted(avg.values(), key=lambda x: x[3], reverse=True),
                                'survey': {'per': per, 'date': date, 'n': len(surv), 'med': surv[len(surv) // 2] if surv else None, 'lo': surv[0] if surv else None, 'hi': surv[-1] if surv else None}}
    out['s'] = {k: dict(sorted(v.items())) for k, v in s.items()}
    out['src'] = 'Cục Thống kê; Bộ Tài chính (vốn ngân sách, FDI); dự báo: các tổ chức và khảo sát VIRA'
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding='utf-8')
    print({k: (len(v), max(v)) for k, v in out['s'].items()})
    print(out.get('cpiFc', {}).get('survey'))


if __name__ == '__main__':
    main()
