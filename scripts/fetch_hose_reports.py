"""Ngày công bố BCTC định kỳ của các mã trong danh sách theo dõi, lấy từ HOSE (api.hsx.vn, mục "Các báo cáo định kỳ").
Ngày công bố = ngày đầu tên file (YYYYMMDD do HOSE đặt khi đăng), dự phòng createdDate.
Ghi data/vn/report_dates.json: {fetched, report, cos: {MÃ: {id, name, rows: [[kỳ, loại, ngày, tên file]]}}}"""
import json, re, time, datetime as dt, pathlib, urllib.request, urllib.parse
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'data/vn/report_dates.json'
SYMS = ['VCB', 'BID', 'CTG', 'TCB', 'MBB', 'ACB', 'STB', 'VPB', 'HDB', 'SSI', 'VCI', 'HCM', 'VND', 'VCK', 'VPX', 'TCX', 'BVH', 'MIG', 'BMI', 'BIC']
API = 'https://api.hsx.vn'
H = {'User-Agent': 'Mozilla/5.0 (fs-dashboard)', 'Accept': 'application/json', 'Origin': 'https://www.hsx.vn', 'Referer': 'https://www.hsx.vn/'}

def get(url):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=30) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:
            err = e; time.sleep(2 + i * 3)
    raise err

def period(x):
    t, tm = (x.get('type') or ''), (x.get('time') or '')
    m = re.match(r'(\d{2})\.(\d{4})$', tm)
    if t == 'Quý' and m: return f'{m.group(2)}Q{int(m.group(1))}', 'Q'
    if t == 'Bán niên' and re.match(r'\d{4}$', tm): return f'{tm}H1', 'H'
    if t == 'Năm' and re.match(r'\d{4}$', tm): return f'{tm}FY', 'Y'
    return None, None

def rdate(x):
    m = re.match(r'(20\d{2})(\d{2})(\d{2})', x.get('fileName') or '')
    if m:
        try: return dt.date(int(m.group(1)), int(m.group(2)), int(m.group(3))).isoformat()
        except ValueError: pass
    c = x.get('createdDate')
    return dt.datetime.utcfromtimestamp(c + 7 * 3600).date().isoformat() if c else None

old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {'cos': {}}
cos, rep = old.get('cos', {}), {}
for s in SYMS:
    try:
        sid = (cos.get(s) or {}).get('id')
        name = (cos.get(s) or {}).get('name')
        if not sid:
            L = get(f'{API}/l/api/v1/1/securities/stock?pageIndex=1&pageSize=5&code={s}')['data']['list']
            L = [r for r in L if r.get('code') == s]
            if not L: rep[s] = 'không thấy trên HOSE'; continue
            sid, name = L[0]['id'], L[0].get('brief') or L[0].get('name')
        rows, page = [], 1
        while True:
            d = get(f'{API}/m/api/v1/1/mediafiles/5/{sid}?pageIndex={page}&pageSize=200&year=0')['data']
            rows += d['list']
            if page >= (d['paging'].get('totalPages') or 1): break
            page += 1
        out = []
        for x in rows:
            p, k = period(x)
            if not p: continue
            out.append([p, k, rdate(x), (x.get('fileName') or '')[:140]])
        out.sort(key=lambda r: (r[2] or '', r[0]), reverse=True)
        cos[s] = {'id': sid, 'name': name, 'rows': out}
        rep[s] = f'{len(out)} báo cáo'
    except Exception as e:
        rep[s] = 'lỗi: ' + str(e)[:120]
    time.sleep(0.5)
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({'fetched': dt.datetime.utcnow().isoformat(timespec='seconds') + 'Z', 'report': rep, 'cos': cos}, ensure_ascii=False, indent=0), encoding='utf-8')
print(json.dumps(rep, ensure_ascii=False))
