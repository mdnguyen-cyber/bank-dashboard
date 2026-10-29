"""Kho bạc Mỹ: cơ cấu nợ, phát hành và ai hấp thụ — nguồn công khai, chạy trên GitHub Actions → data/global/ust.json.

- MSPD bảng 1 (Fiscal Data): nợ do công chúng nắm theo loại (Bills, Notes, Bonds, TIPS, FRN), cuối tháng.
- Kết quả đấu thầu (Fiscal Data auctions_query): lượng trúng thầu theo nhóm người mua — primary dealer, direct, indirect
  (thường là NHTW/tổ chức nước ngoài qua Fed NY), SOMA (Fed tái đầu tư), FIMA, không cạnh tranh — gộp theo tháng, tách tín phiếu và coupon.
- TIC (Bộ Tài chính Mỹ): nắm giữ UST của các nước lớn, cuối tháng.
"""
import io, json, re, sys, time, urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/global'
UA = {'User-Agent': 'Mozilla/5.0 (FinSuccess dashboard; +https://github.com/mdnguyen-cyber/bank-dashboard)'}
FD = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service'
TIC = 'https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/'
MON = {m: i + 1 for i, m in enumerate(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])}


def get(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(3 * (i + 1))
    raise err


def fd_all(path, flt, fields):
    out, page = [], 1
    while True:
        js = json.loads(get(f'{FD}{path}?filter={flt}&fields={fields}&page[size]=5000&page[number]={page}'))
        out += js['data']
        if page >= js['meta'].get('total-pages', 1):
            return out
        page += 1


def f(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def mspd():
    rows = fd_all('/v1/debt/mspd/mspd_table_1', 'record_date:gte:2014-12-01', 'record_date,security_type_desc,security_class_desc,debt_held_public_mil_amt,total_mil_amt')
    out = defaultdict(dict)
    for r in rows:
        if r['security_type_desc'] != 'Marketable':
            continue
        c = r['security_class_desc'].strip()
        key = {'Bills': 'bills', 'Notes': 'notes', 'Bonds': 'bonds', 'Treasury Inflation-Protected Securities': 'tips', 'Treasury Inflation Protected Securities': 'tips',
               'TIPS': 'tips', 'Floating Rate Notes': 'frn', 'Total Marketable': 'total'}.get(c)
        if key is None and 'Inflation' in c:
            key = 'tips'
        if key is None and 'Floating' in c:
            key = 'frn'
        if key:
            out[r['record_date'][:7]][key] = round((f(r['debt_held_public_mil_amt']) or 0) / 1000, 1)   # tỷ USD
    return dict(sorted(out.items()))


def merge_td(rows):
    """Fiscal Data cập nhật kết quả đấu thầu chậm vài tuần → bổ sung các phiên gần đây từ TreasuryDirect (TA_WS), cùng tên trường."""
    have = {(r['auction_date'][:10], r['security_term'], r['security_type']) for r in rows if f(r.get('total_accepted'))}
    try:
        td = json.loads(get('https://www.treasurydirect.gov/TA_WS/securities/auctioned?format=json&days=60'))
    except Exception as e:  # noqa: BLE001
        print('TreasuryDirect lỗi', e, file=sys.stderr); return rows
    M = {'issue_date': 'issueDate', 'security_type': 'securityType', 'security_term': 'securityTerm', 'cash_management_bill_cmb': 'cashManagementBillCMB',
         'offering_amt': 'offeringAmount', 'total_accepted': 'totalAccepted', 'comp_accepted': 'competitiveAccepted', 'noncomp_accepted': 'noncompetitiveAccepted',
         'primary_dealer_accepted': 'primaryDealerAccepted', 'direct_bidder_accepted': 'directBidderAccepted', 'indirect_bidder_accepted': 'indirectBidderAccepted',
         'soma_accepted': 'somaAccepted', 'fima_noncomp_accepted': 'fimaNoncompetitiveAccepted', 'bid_to_cover_ratio': 'bidToCoverRatio', 'high_yield': 'highYield',
         'high_discnt_rate': 'highDiscountRate', 'high_investment_rate': 'highInvestmentRate', 'floating_rate': 'floatingRate', 'inflation_index_security': 'inflationIndexSecurity'}
    add = 0
    for t in td if isinstance(td, list) else []:
        d = (t.get('auctionDate') or '')[:10]
        if not d or not f(t.get('totalAccepted')):
            continue
        r = {'auction_date': d, **{k: (t.get(v) if t.get(v) not in ('', None) else None) for k, v in M.items()}}
        r['issue_date'] = (r['issue_date'] or d)[:10]
        if (d, r['security_term'], r['security_type']) in have:
            continue
        rows.append(r); have.add((d, r['security_term'], r['security_type'])); add += 1
    print('TreasuryDirect bổ sung', add, 'phiên')
    return rows


def auctions():
    fields = ('auction_date,issue_date,security_type,security_term,cash_management_bill_cmb,offering_amt,total_accepted,comp_accepted,noncomp_accepted,'
              'primary_dealer_accepted,direct_bidder_accepted,indirect_bidder_accepted,soma_accepted,fima_noncomp_accepted,bid_to_cover_ratio,high_yield,high_discnt_rate,high_investment_rate,floating_rate,inflation_index_security')
    rows = fd_all('/v1/accounting/od/auctions_query', 'auction_date:gte:2018-01-01', fields)
    rows = merge_td(rows)
    agg = defaultdict(lambda: defaultdict(float))
    last, hist = [], []
    for r in rows:
        tot = f(r['total_accepted'])
        if not tot:
            continue   # chưa có kết quả
        grp = 'bills' if r['security_type'] == 'Bill' else 'coupons'
        m = r['issue_date'][:7]
        a = agg[(m, grp)]
        for k in ['total_accepted', 'primary_dealer_accepted', 'direct_bidder_accepted', 'indirect_bidder_accepted', 'soma_accepted', 'noncomp_accepted', 'fima_noncomp_accepted']:
            a[k] += (f(r[k]) or 0) / 1e9
        a['n'] += 1
        if r['security_type'] != 'Bill':
            last.append({'d': r['auction_date'], 't': r['security_term'], 'type': r['security_type'] + (' TIPS' if r.get('inflation_index_security') == 'Yes' else '') + (' FRN' if r.get('floating_rate') == 'Yes' else ''),
                         'amt': round(tot / 1e9, 1), 'btc': f(r['bid_to_cover_ratio']), 'y': f(r['high_yield']) or f(r['high_investment_rate']),
                         'pd': round((f(r['primary_dealer_accepted']) or 0) / 1e9, 1), 'dir': round((f(r['direct_bidder_accepted']) or 0) / 1e9, 1),
                         'ind': round((f(r['indirect_bidder_accepted']) or 0) / 1e9, 1), 'soma': round((f(r['soma_accepted']) or 0) / 1e9, 1)})
            tc = term_class(r['security_term'])
            if tc and r.get('inflation_index_security') != 'Yes' and r.get('floating_rate') != 'Yes' and f(r['bid_to_cover_ratio']):
                comp = sum((f(r[k]) or 0) for k in ['primary_dealer_accepted', 'direct_bidder_accepted', 'indirect_bidder_accepted']) or tot   # phần cạnh tranh của khu vực tư nhân
                hist.append([r['auction_date'], tc, f(r['bid_to_cover_ratio']), f(r['high_yield']),
                             round((f(r['indirect_bidder_accepted']) or 0) / comp * 100, 1), round((f(r['primary_dealer_accepted']) or 0) / comp * 100, 1)])
    out = defaultdict(dict)
    for (m, g), a in sorted(agg.items()):
        out[m][g] = {k: round(v, 1) for k, v in a.items()}
    last.sort(key=lambda x: x['d']); hist.sort()
    return dict(sorted(out.items())), last[-40:], hist


def term_class(t):
    """'9-Year 10-Month' (tái phát hành) → '10Y'; chỉ các kỳ hạn coupon chuẩn."""
    m = re.match(r'(\d+)-Year(?:\s+(\d+)-Month)?', t or '')
    if not m:
        return None
    y = int(m.group(1)) + (int(m.group(2)) if m.group(2) else 0) / 12
    best = min([2, 3, 5, 7, 10, 20, 30], key=lambda k: abs(k - y))
    return f'{best}Y' if abs(best - y) <= 0.5 else None


def tic_parse(txt):
    """bảng 'Major foreign holders' dạng text (tab hoặc nhiều khoảng trắng), nhiều khối năm nối nhau → {country: {YYYY-MM: tỷ USD}}."""
    out = defaultdict(dict)
    keys = None
    lines = txt.splitlines()
    for i, ln in enumerate(lines):
        toks = [t for t in re.split(r'[\t\s]+', ln.strip()) if t]
        if len(toks) >= 3 and toks[0] == 'Country' and all(re.fullmatch(r'\d{4}-\d{2}', t) for t in toks[1:]):   # slt_table5: 'Country  2026-07 …'
            keys = toks[1:]
            continue
        if len(toks) >= 3 and all(t in MON for t in toks):            # dòng tháng → dòng năm kế tiếp
            yrs = [t for t in re.split(r'[\t\s]+', lines[i + 1].strip()) if re.fullmatch(r'\d{4}', t)] if i + 1 < len(lines) else []
            keys = [f'{y}-{MON[m]:02d}' for m, y in zip(toks, yrs)] if len(yrs) == len(toks) else None
            continue
        if not keys:
            continue
        raw = ln.rstrip()
        if '\t' in raw:
            parts = [x.strip().strip('"') for x in raw.split('\t')]
            name, vals = parts[0], [x for x in parts[1:] if x != '']
        else:
            mm = re.match(r'^\s*(.+?)\s{2,}(-?[\d.]+(?:\s+-?[\d.]+)+)\s*$', raw)
            name, vals = (mm.group(1).strip(), mm.group(2).split()) if mm else ('', [])
        if not name or len(vals) < len(keys):
            continue
        for k, v in zip(keys, vals):
            try:
                out[name.strip(' "')][k] = float(v)
            except ValueError:
                pass
    return out


def tic():
    out = defaultdict(dict)
    for fn in ['mfhhis01.txt', 'mfh.txt', 'slt_table5.txt']:
        try:
            for c, d in tic_parse(get(TIC + fn)).items():
                out[c].update(d)
        except Exception as e:  # noqa: BLE001
            print('TIC', fn, e, file=sys.stderr)
    norm = {'China, Mainland': 'China', 'China': 'China', 'Japan': 'Japan', 'United Kingdom': 'United Kingdom', 'Grand Total': 'Total',
            'For. Official': 'Official', 'Of which: For. Official': 'Official', 'Treasury Bills': 'Official bills', 'Belgium': 'Belgium', 'Luxembourg': 'Luxembourg',
            'Cayman Islands': 'Cayman Islands', 'Canada': 'Canada', 'Switzerland': 'Switzerland', 'Taiwan': 'Taiwan', 'Ireland': 'Ireland', 'France': 'France',
            'India': 'India', 'Hong Kong': 'Hong Kong', 'Saudi Arabia': 'Saudi Arabia', 'Singapore': 'Singapore', 'Norway': 'Norway'}
    res = {}
    for c, d in out.items():
        c2 = c.strip('" ')
        k = norm.get(c2) or ('Total' if c2.lower().startswith('grand total') else 'Official' if 'official' in c2.lower() and 'bill' not in c2.lower() else None)
        if k:
            res.setdefault(k, {}).update(d)
    return {k: dict(sorted(v.items())) for k, v in res.items()}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    p = OUT / 'ust.json'
    old = json.loads(p.read_text(encoding='utf-8')) if p.exists() else {}
    res, rep = {}, {}
    for name, fn in [('mspd', mspd), ('auctions', auctions), ('tic', tic)]:
        try:
            v = fn()
            if name == 'auctions':
                res['auctions'], res['recent'], res['btcHist'] = v
            else:
                res[name] = v
            rep[name] = 'ok'
        except Exception as e:  # noqa: BLE001
            rep[name] = str(e)[:300]
            for k in (['auctions', 'recent', 'btcHist'] if name == 'auctions' else [name]):
                if k in old:
                    res[k] = old[k]
        print(name, rep[name], file=sys.stderr)
    res['fetched'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    res['report'] = rep
    res['tic_last'] = {k: max(v) for k, v in res.get('tic', {}).items() if v}
    p.write_text(json.dumps(res, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


if __name__ == '__main__':
    main()
