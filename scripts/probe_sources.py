"""Dò nguồn công khai (chạy trên GitHub Actions) → data/probe/*.json: mẫu phản hồi, danh sách link, để chọn endpoint."""
import json, re, sys, urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'data/probe'
UA = {'User-Agent': 'Mozilla/5.0 (FinSuccess dashboard; +https://github.com/mdnguyen-cyber/bank-dashboard)'}
FD = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service'
URLS = {
    'fd_mspd1': FD + '/v1/debt/mspd/mspd_table_1?sort=-record_date&page[size]=20',
    'fd_auctions': FD + '/v1/accounting/od/auctions_query?sort=-auction_date&page[size]=5',
    'fd_mts1': FD + '/v1/accounting/mts/mts_table_1?sort=-record_date&page[size]=5',
    'fd_dts_cash': FD + '/v1/accounting/dts/operating_cash_balance?sort=-record_date&page[size]=5',
    'tic_mfh': 'https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/mfh.txt',
    'tic_mfhhis01': 'https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/mfhhis01.txt',
    'mof_feio_en': 'https://www.mof.go.jp/english/policy/international_policy/reference/feio/index.html',
    'mof_feio_jp': 'https://www.mof.go.jp/policy/international_policy/reference/feio/index.html',
    'mof_reserves_en': 'https://www.mof.go.jp/english/policy/international_policy/reference/official_reserve_assets/index.html',
    'mof_jgb_holders': 'https://www.mof.go.jp/english/policy/jgbs/reference/appendix/index.html',
    'mof_jgb_stats': 'https://www.mof.go.jp/english/policy/jgbs/reference/index.html',
    'boj_acmai': 'https://www.boj.or.jp/en/statistics/boj/other/acmai/index.htm',
    'boj_acmai_rel': 'https://www.boj.or.jp/en/statistics/boj/other/acmai/release/index.htm',
    'boj_api_doc': 'https://www.stat-search.boj.or.jp/info/api_manual_en.pdf',
    'boj_api_try': 'https://www.stat-search.boj.or.jp/api/v1/getDataCode?format=json&lang=en&db=BS01&code=MABJMTA&startDate=202401',
    'boj_api_meta': 'https://www.stat-search.boj.or.jp/api/v1/getMetadata?format=json&lang=en&db=BS01',
    'boj_ssi': 'https://www.stat-search.boj.or.jp/index_en.html',
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rep = {}
    for k, u in URLS.items():
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60) as r:
                b = r.read(); ct = r.headers.get('Content-Type', '')
            txt = b.decode('utf-8', 'replace') if 'pdf' not in ct else ''
            info = {'url': u, 'status': 200, 'ct': ct, 'bytes': len(b)}
            if txt.lstrip().startswith('{'):
                js = json.loads(txt)
                info['json'] = {kk: (vv[:20] if isinstance(vv, list) else vv) for kk, vv in js.items()} if isinstance(js, dict) else js
                if isinstance(js, dict) and 'meta' in js:
                    info['json']['meta'] = js['meta']
                s = json.dumps(info['json'], ensure_ascii=False)
                if len(s) > 60000:
                    info['json'] = s[:60000]
            elif '<html' in txt[:2000].lower() or '<!doctype' in txt[:200].lower():
                info['links'] = sorted(set(re.findall(r'href="([^"]+\.(?:csv|xlsx?|pdf|htm|html|txt|zip))"', txt)))[:400]
                info['title'] = (re.search(r'<title>(.*?)</title>', txt, re.S) or [None, ''])[1].strip()[:200]
            else:
                info['head'] = txt[:6000]
            rep[k] = info
        except Exception as e:  # noqa: BLE001
            rep[k] = {'url': u, 'err': str(e)[:300]}
        print(k, rep[k].get('status', rep[k].get('err')), file=sys.stderr)
    (OUT / 'probe.json').write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
