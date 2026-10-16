"""Dò nguồn công khai (chạy trên GitHub Actions) → data/probe/*.json: mẫu phản hồi, danh sách link, để chọn endpoint."""
import json, os, re, sys, urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'data/probe'
UA = {'User-Agent': 'Mozilla/5.0 (FinSuccess dashboard; +https://github.com/mdnguyen-cyber/bank-dashboard)'}
FD = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service'
BOJ = 'https://www.stat-search.boj.or.jp/api/v1'
URLS = {
    'em_cn_us': 'https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPTA_WEB_TREASURYYIELD&columns=ALL&sortColumns=SOLAR_DATE&sortTypes=-1&pageSize=5&pageNumber=1',
    'chinabond_page': 'https://yield.chinabond.com.cn/cbweb-czb-web/czb/moreInfo?locale=en_US&nameType=1',
    'pboc': 'http://www.pbc.gov.cn/diaochatongjisi/116219/index.html',
    'tw_cbc_rates': 'https://www.cbc.gov.tw/en/lp-700-2.html',
    'tw_tpex_gov': 'https://www.tpex.org.tw/openapi/v1/tpex_gov_bond_yield',
    'tw_tpex_api_list': 'https://www.tpex.org.tw/openapi/swagger.json',
    'sg_datagov_search': 'https://api-production.data.gov.sg/v2/public/api/datasets?query=government%20securities%20yield',
    'sg_mas_api': 'https://eservices.mas.gov.sg/statistics/api/v1/bondsandbills/m/benchmarkyields?rows=5&sort=end_of_day%20desc',
    'sg_mas_page': 'https://www.mas.gov.sg/bonds-and-bills/singapore-government-securities-prices-and-yields',
    'kr_ecos_sample': 'https://ecos.bok.or.kr/api/StatisticSearch/sample/json/en/1/10/817Y002/D/20261001/20261016/010210000',
    'kr_ecos_items': 'https://ecos.bok.or.kr/api/StatisticItemList/sample/json/en/1/40/817Y002',
}
KEEP = re.compile(r'government|bond|yield', re.I)
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
