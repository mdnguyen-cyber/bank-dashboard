#!/usr/bin/env python3
"""Lưu nguyên văn kết quả WiMCP từ log phiên Claude vào data/raw/wi/.

WiData chỉ truy cập được qua connector trong phiên Claude (không có API key),
nên số liệu không chép tay: script đọc transcript .jsonl, ghép từng lời gọi
mcp__WiMCP__* với kết quả của nó và ghi thành file JSON {tool, request, response}.

Dùng: python3 scripts/wi_capture_transcript.py <transcript.jsonl> [--out data/raw/wi]
Tên file = <tool>_<endpoint|indicator>_<hash8>.json; ghi đè idempotent.
"""
import argparse, hashlib, json, pathlib, re, sys


def text_of(content):
    if isinstance(content, str):
        return content
    out = []
    for c in content or []:
        if isinstance(c, dict) and c.get('type') == 'text':
            out.append(c.get('text', ''))
    return ''.join(out)


PII_KEYS = {'contacts'}  # co_leaders: CCCD, địa chỉ, điện thoại cá nhân — không lưu vào repo


def strip_pii(obj):
    """Bỏ trường thông tin cá nhân; ở dạng bảng (cot/dong) bỏ cả cột tương ứng."""
    if isinstance(obj, dict):
        if isinstance(obj.get('cot'), list) and isinstance(obj.get('dong'), list):
            drop = [i for i, c in enumerate(obj['cot']) if c in PII_KEYS]
            if drop:
                obj = dict(obj)
                obj['cot'] = [c for i, c in enumerate(obj['cot']) if i not in drop]
                obj['dong'] = [[v for i, v in enumerate(r) if i not in drop] for r in obj['dong']]
        return {k: strip_pii(v) for k, v in obj.items() if k not in PII_KEYS}
    if isinstance(obj, list):
        return [strip_pii(v) for v in obj]
    return obj


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('transcripts', nargs='+')
    ap.add_argument('--out', default='data/raw/wi')
    a = ap.parse_args()
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    calls, results = {}, {}
    for t in a.transcripts:
        for line in open(t, encoding='utf-8'):
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            msg = rec.get('message') or {}
            for c in msg.get('content') or [] if isinstance(msg.get('content'), list) else []:
                if c.get('type') == 'tool_use' and str(c.get('name', '')).startswith('mcp__WiMCP__'):
                    calls[c['id']] = (c['name'].replace('mcp__WiMCP__', ''), c.get('input') or {})
                elif c.get('type') == 'tool_result':
                    results[c.get('tool_use_id')] = text_of(c.get('content'))
    n = 0
    for tid, (tool, req) in calls.items():
        raw = results.get(tid)
        if not raw:
            continue
        try:
            # Wi đôi khi nối thêm ghi chú chính sách sau JSON: chỉ lấy object đầu tiên.
            resp, _ = json.JSONDecoder().raw_decode(raw.lstrip())
        except json.JSONDecodeError:
            continue  # lỗi / bị cắt: không lưu
        if req.get('action') == 'get_schema' or tool == 'wi_data_search':
            continue  # schema / bộ hướng dẫn nội bộ của Wi: không phải số liệu, không lưu
        resp = strip_pii(resp)
        key = req.get('endpoint_name') or req.get('indicator_id') or req.get('symbol') or req.get('action') or 'x'
        key = re.sub(r'[^A-Za-z0-9_]+', '-', str(key))[:40]
        h = hashlib.sha1(json.dumps([tool, req], sort_keys=True).encode()).hexdigest()[:8]
        p = out / f'{tool}_{key}_{h}.json'
        p.write_text(json.dumps({'tool': tool, 'request': req, 'response': resp}, ensure_ascii=False, indent=1), encoding='utf-8')
        n += 1
    print(f'saved {n} WiMCP responses to {out}', file=sys.stderr)


if __name__ == '__main__':
    main()
