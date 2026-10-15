"""Dò nguồn công khai (chạy trên GitHub Actions) → data/probe/*.json: mẫu phản hồi, danh sách link, để chọn endpoint."""
import json, os, re, sys, urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'data/probe'
UA = {'User-Agent': 'Mozilla/5.0 (FinSuccess dashboard; +https://github.com/mdnguyen-cyber/bank-dashboard)'}
FD = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service'
BOJ = 'https://www.stat-search.boj.or.jp/api/v1'
URLS = {
    'mof_feio_csv': 'https://www.mof.go.jp/english/policy/international_policy/reference/feio/foreign_exchange_intervention_operations.csv',
    'mof_feio_data': 'https://www.mof.go.jp/policy/international_policy/reference/feio/data/index.html',
    'mof_feio_monthly': 'https://www.mof.go.jp/english/policy/international_policy/reference/feio/monthly/20260930e.html',
    'mof_reserves': 'https://www.mof.go.jp/english/policy/international_policy/reference/official_reserve_assets/index.htm',
    'mof_reserves_jp': 'https://www.mof.go.jp/policy/international_policy/reference/official_reserve_assets/index.htm',
    'mof_jgbstat': 'https://www.mof.go.jp/english/policy/jgbs/reference/jgbstat/index.htm',
    'mof_gbb': 'https://www.mof.go.jp/english/policy/jgbs/reference/gbb/index.htm',
    'tic_slt5': 'https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table5.txt',
    'tic_mfh_csv': 'https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/mfh.csv',
    'tic_page': 'https://home.treasury.gov/data/treasury-international-capital-tic-system/tic-forms-instructions/securities-b-portfolio-holdings-of-us-and-foreign-securities',
    'tic_mfh_page': 'https://home.treasury.gov/data/treasury-international-capital-tic-system-home-page/tic-system-home-page/major-foreign-holders-of-treasury-securities',
    'tsy_allot_page': 'https://home.treasury.gov/data/investor-class-auction-allotments',
    'boj_meta_BS01': BOJ + '/getMetadata?format=json&lang=en&db=BS01',
    'boj_meta_FF': BOJ + '/getMetadata?format=json&lang=en&db=FF',
    'boj_meta_MD01': BOJ + '/getMetadata?format=json&lang=en&db=MD01',
    'boj_meta_MD02': BOJ + '/getMetadata?format=json&lang=en&db=MD02',
    'boj_meta_BP01': BOJ + '/getMetadata?format=json&lang=en&db=BP01',
    'boj_meta_FM08': BOJ + '/getMetadata?format=json&lang=en&db=FM08',
    'boj_meta_PS01': BOJ + '/getMetadata?format=json&lang=en&db=PS01',
}
KEEP = re.compile(r'government|JGB|Treasury|reserve|Bank of Japan Accounts|current account|monetary base|intervention|ETF|loans', re.I)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rep = {}
    for k, u in URLS.items():
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60) as r:
                b = r.read(); ct = r.headers.get('Content-Type', '')
            txt = b.decode('utf-8', 'replace') if 'pdf' not in ct else ''
            info = {'url': u, 'status': 200, 'ct': ct, 'bytes': len(b)}
            if k.startswith('boj_meta'):
                js = json.loads(txt)
                info['series'] = [[x['SERIES_CODE'], x['NAME_OF_TIME_SERIES'][:160], x['FREQUENCY'], x['END_OF_THE_TIME_SERIES'], x['UNIT']] for x in js.get('RESULTSET', [])
                                  if x['SERIES_CODE'] and '(Discontinued)' not in x['NAME_OF_TIME_SERIES'] and (k != 'boj_meta_FF' or KEEP.search(x['NAME_OF_TIME_SERIES']))][:1500]
                info['n'] = len(js.get('RESULTSET', [])); info['msg'] = js.get('MESSAGE')
            elif txt.lstrip().startswith('{'):
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
    (OUT / os.environ.get('PROBE_OUT', 'probe2.json')).write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
