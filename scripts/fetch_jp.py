"""Nhật Bản: bảng cân đối BoJ theo cấu phần, ai nắm JGB, can thiệp tỷ giá và dự trữ ngoại hối (MOF) → data/global/jp.json.

Nguồn công khai, chạy trên GitHub Actions:
- BoJ Time-Series Data Search API (stat-search.boj.or.jp): BS01 (Bank of Japan Accounts, cuối tháng), FF (Flow of Funds, quý).
- MOF: foreign_exchange_intervention_operations.csv (từng lần can thiệp từ 1991), official_reserve_assets/historical.csv.
"""
import csv, io, json, re, sys, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/global'
UA = {'User-Agent': 'Mozilla/5.0 (FinSuccess dashboard; +https://github.com/mdnguyen-cyber/bank-dashboard)'}
BOJ = 'https://www.stat-search.boj.or.jp/api/v1/getDataCode?format=json&lang=en'
# Bank of Japan Accounts (100 triệu JPY, cuối tháng)
BS = {'total': 'MABJMTA', 'jgs': 'MABJMA5', 'tbills': 'MABJMA5A', 'jgb': 'MABJMA5B', 'cbond': 'MABJMA002', 'etf': 'MABJMA003', 'reit': 'MABJMA004',
      'loans': 'MABJMA@01', 'fx': 'MABJMA12', 'repo_a': 'MABJMAA',
      'notes': 'MABJML1', 'current': 'MABJML11', 'gov': 'MABJML3', 'other_dep': 'MABJML4', 'repo_l': 'MABJML8'}
# Flow of Funds: tín phiếu (A310) + JGB & FILP (A311) theo khu vực nắm giữ (100 triệu JPY, quý)
FFS = {'boj': '110', 'dep': '120', 'ins': '131', 'pen': '140', 'pub_pen': '424', 'ofi': '150', 'hh': '430', 'overseas': '500', 'total': '700'}
MOF_FEIO = 'https://www.mof.go.jp/english/policy/international_policy/reference/feio/foreign_exchange_intervention_operations.csv'
MOF_RES = 'https://www.mof.go.jp/policy/international_policy/reference/official_reserve_assets/historical.csv'
MON = {m: i + 1 for i, m in enumerate(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])}


def get(url, tries=3, raw=False):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                b = r.read()
                return b if raw else b.decode('utf-8', 'replace')
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(3 * (i + 1))
    raise err


def boj(db, codes, start):
    """→ {code: {period: value}}; period 'YYYY-MM' (tháng) hoặc 'YYYY-Qn' (quý)."""
    out = {}
    for i in range(0, len(codes), 50):
        js = json.loads(get(f'{BOJ}&db={db}&code={",".join(codes[i:i + 50])}&startDate={start}'))
        if js.get('STATUS') != 200:
            raise RuntimeError(f"BoJ {db}: {js.get('MESSAGE')}")
        for r in js.get('RESULTSET', []):
            v = r['VALUES']
            freq = r.get('FREQUENCY', '')
            d = {}
            for p, x in zip(v['SURVEY_DATES'], v['VALUES']):
                if x is None:
                    continue
                p = str(p)
                key = f'{p[:4]}-Q{int(p[4:])}' if freq.startswith('QUARTER') else f'{p[:4]}-{p[4:6]}'
                d[key] = float(x)
            out[r['SERIES_CODE']] = d
    return out


def bs01():
    raw = boj('BS01', list(BS.values()), '201201')
    return {k: dict(sorted(raw.get(c, {}).items())) for k, c in BS.items()}


def ff():
    codes = [f'FOF_FFAS{s}A31{t}' for s in FFS.values() for t in (0, 1)] + ['FOF_FFAS700L310', 'FOF_FFAS700L311']
    raw = boj('FF', codes, '201201')
    res = {}
    for k, s in FFS.items():
        a = 'L' if k == 'total' else 'A'
        b0, b1 = raw.get(f'FOF_FFAS{s}{a}310', {}), raw.get(f'FOF_FFAS{s}{a}311', {})
        res[k] = {q: b0.get(q, 0) + b1[q] for q in sorted(b1)}
    return res


def feio():
    """từng lần can thiệp: ngày, số tiền (100 triệu JPY, dương = bán USD mua JPY), cặp tiền."""
    b = get(MOF_FEIO, raw=True)
    txt = b.decode('cp932', 'replace')
    rows, y, m = [], None, None
    for r in csv.reader(io.StringIO(txt)):
        if len(r) < 9:
            continue
        yy, mm, dd, amt, pair = r[3].strip(), r[4].strip(), r[5].strip(), r[6].replace(',', '').strip(), r[8].strip()
        if re.fullmatch(r'\d{4}', yy):
            y = int(yy)
        elif yy:            # dòng tổng quý ("April - June 1991")
            continue
        if mm in MON:
            m = MON[mm]
        if not re.fullmatch(r'\d{1,2}', dd) or not amt or y is None or m is None:
            continue
        try:
            a = float(amt)
        except ValueError:
            continue
        sell_usd = 'dollar (sold)' in pair.lower()
        buy_usd = 'dollar (bought)' in pair.lower()
        rows.append({'d': f'{y:04d}-{m:02d}-{int(dd):02d}', 'amt': a if sell_usd else -a if buy_usd else a, 'pair': pair})
    return rows


def reserves():
    """MOF historical.csv: tổng dự trữ ngoại hối (triệu USD) cuối tháng. Định dạng do MOF đặt — dò cột 'Total' / 'Official reserve assets'."""
    b = get(MOF_RES, raw=True)
    txt = b.decode('cp932', 'replace')
    rows = list(csv.reader(io.StringIO(txt)))
    head = rows[:14]
    out = {}
    for r in rows:
        if not r:
            continue
        c0 = r[0].strip()
        m = re.match(r'^(\d{4})[./-](\d{1,2})', c0) or re.match(r'^(\d{4})\D+(\d{1,2})\D*$', c0)
        if not m:
            continue
        nums = []
        for x in r[1:]:
            try:
                nums.append(float(x.replace(',', '')))
            except ValueError:
                nums.append(None)
        if nums and nums[0] is not None:
            out[f'{int(m.group(1)):04d}-{int(m.group(2)):02d}'] = {'total': nums[0], 'row': nums[:8]}
    return dict(sorted(out.items())), head


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    p = OUT / 'jp.json'
    old = json.loads(p.read_text(encoding='utf-8')) if p.exists() else {}
    res, rep = {}, {}
    for name, fn in [('bs', bs01), ('ff', ff), ('feio', feio), ('reserves', reserves)]:
        try:
            v = fn()
            if name == 'reserves':
                res['reserves'], res['reserves_head'] = v
                rep[name] = f'ok {len(v[0])}'
            else:
                res[name] = v
                rep[name] = f'ok {len(v)}'
        except Exception as e:  # noqa: BLE001
            rep[name] = str(e)[:300]
            if name in old:
                res[name] = old[name]
        print(name, rep[name], file=sys.stderr)
    res['fetched'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    res['report'] = rep
    p.write_text(json.dumps(res, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


if __name__ == '__main__':
    main()
