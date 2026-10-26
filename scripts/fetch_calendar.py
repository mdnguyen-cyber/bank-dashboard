#!/usr/bin/env python3
"""Lịch kinh tế: tải lịch tuần này của Forex Factory (JSON công khai, có mức tác động, dự báo, kỳ trước)
và lưu dồn vào data/calendar/ff.json để có lịch sử. Feed chỉ có tuần hiện tại và không có số thực tế;
số thực tế được bổ sung ở scripts/build_calendar.py."""
import json, sys, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'data/calendar/ff.json'
URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'
KEEP = {'High': 'H', 'Medium': 'M'}


TAS = 'https://home.treasury.gov/system/files/221/Tentative-Auction-Schedule.xml'


def ust_schedule():
    """Lịch đấu thầu TPCP Mỹ kỳ hạn coupon → data/calendar/ust_auctions.json (lưu dồn, giữ các phiên đã qua).
    Nguồn 1: lịch dự kiến theo quý của Kho bạc (XML, gồm cả ngày thông báo phát hành quý).
    Nguồn 2 (dự phòng, chỉ các phiên đã thông báo ~1 tuần trước): Fiscal Data API upcoming_auctions.
    Trạng thái từng nguồn ghi vào data/calendar/ust_status.json."""
    import re as _re
    import xml.etree.ElementTree as ET
    out_p = ROOT / 'data/calendar/ust_auctions.json'
    old = json.loads(out_p.read_text(encoding='utf-8')) if out_p.exists() else []
    idx = {(e['term'], e['tips'], e['frn'], e['auction']): e for e in old}
    st = {}
    def put(e):
        k = (e['term'], e['tips'], e['frn'], e['auction'])
        idx[k] = {**idx.get(k, {}), **{a: b for a, b in e.items() if b not in ('', None)}}
    hdr = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36', 'Accept': 'application/xml,text/xml,*/*'}
    try:
        raw = urllib.request.urlopen(urllib.request.Request(TAS, headers=hdr), timeout=40).read()
        root = ET.fromstring(raw)
        strip = lambda t: t.split('}')[-1]; n = 0
        for node in root.iter():
            if strip(node.tag) != 'AuctionCalendarDate':
                continue
            f = {strip(c.tag): (c.text or '').strip() for c in node}
            if f.get('SecurityType') not in ('Note', 'Bond') or not f.get('AuctionDate'):
                continue
            put({'term': f.get('SecurityTermWeekYear', ''), 'type': f['SecurityType'], 'tips': f.get('TIPS') == 'Yes', 'frn': f.get('FloatingRate') == 'Yes',
                 'reopen': f.get('ReOpeningIndicator') == 'Yes', 'ann': f.get('AnnouncementDate', '')[:10], 'auction': f['AuctionDate'][:10], 'settle': f.get('SettlementDate', '')[:10]}); n += 1
        st['xml'] = f'ok {n}' if n else 'không có phiên nào: ' + raw[:300].decode('utf-8', 'replace')
    except Exception as e:  # noqa: BLE001
        st['xml'] = 'lỗi: ' + str(e)[:200]
    try:
        url = ('https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/upcoming_auctions'
               '?fields=security_type,security_term,reopening,announcemt_date,auction_date,issue_date&page[size]=200')
        js = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': hdr['User-Agent']}), timeout=40).read().decode('utf-8'))
        n = 0
        for r in js.get('data', []):
            if r.get('security_type') not in ('Note', 'Bond', 'TIPS', 'FRN'):
                continue
            term = _re.sub(r'\s+', ' ', r.get('security_term') or '')
            m = _re.match(r'(\d+)-Year', term)
            if not m:
                continue
            au = (r.get('auction_date') or '')[:10]
            if au < (datetime.now(timezone.utc) - timedelta(days=10)).date().isoformat():
                continue   # bộ dữ liệu còn giữ bản ghi cũ
            tips, frn = r['security_type'] == 'TIPS', r['security_type'] == 'FRN'
            yrs = int(m.group(1)) + (1 if _re.search(r'(\d+)-Month', term) and int(_re.search(r'(\d+)-Month', term).group(1)) >= 6 else 0)
            if any(k[0] == f'{yrs}-Year' and k[3] == au for k in idx):
                continue   # đã có từ lịch dự kiến (phân biệt được TIPS, FRN)
            put({'term': f'{yrs}-Year', 'type': 'Bond' if yrs >= 20 else 'Note', 'tips': tips, 'frn': frn, 'reopen': r.get('reopening') == 'Yes',
                 'ann': (r.get('announcemt_date') or '')[:10], 'auction': (r.get('auction_date') or '')[:10], 'settle': (r.get('issue_date') or '')[:10]}); n += 1
        st['fiscaldata'] = f'ok {n}'
    except Exception as e:  # noqa: BLE001
        st['fiscaldata'] = 'lỗi: ' + str(e)[:200]
    out = sorted(idx.values(), key=lambda e: (e['auction'], e['term']))
    out_p.write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding='utf-8')
    (ROOT / 'data/calendar/ust_status.json').write_text(json.dumps({'at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), 'n': len(out), **st}, ensure_ascii=False), encoding='utf-8')
    print('Lịch đấu thầu UST:', st, len(out), 'phiên')


def main():
    ust_schedule()
    req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0 (fs-bank-dashboard)'})
    try:
        raw = json.loads(urllib.request.urlopen(req, timeout=30).read().decode('utf-8'))
    except Exception as e:
        print('Không tải được lịch Forex Factory:', e); return 1
    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else []
    idx = {(e['c'], e['t'], e['d'][:10]): e for e in old}
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
    n_new = 0
    for r in raw:
        i = KEEP.get(r.get('impact'))
        if not i:
            continue
        d = datetime.fromisoformat(r['date']).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
        k = (r['country'], r['title'].strip(), d[:10])
        e = idx.get(k)
        if e is None:
            e = idx[k] = {'c': r['country'], 't': r['title'].strip(), 'd': d}; n_new += 1
        e.update({'d': d, 'i': i, 'f': (r.get('forecast') or '').strip(), 'p': (r.get('previous') or '').strip(), 'seen': now})
    out = sorted(idx.values(), key=lambda e: (e['d'], e['c'], e['t']))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding='utf-8')
    print(f'Lịch FF: {len(raw)} tin trong feed, {n_new} tin mới, tổng lưu {len(out)}')
    return 0


BLS_KEYS = {'Consumer Price Index': 'cpi', 'Employment Situation': 'nfp', 'Producer Price Index': 'ppi', 'Job Openings and Labor Turnover Survey': 'jolts'}


def bls():
    """Làm mới lịch công bố của BLS (file iCalendar chính thức); lỗi thì giữ bản đã lưu."""
    import re
    req = urllib.request.Request('https://www.bls.gov/schedule/news_release/bls.ics', headers={'User-Agent': 'Mozilla/5.0 (fs-bank-dashboard; research use)', 'Accept': 'text/calendar,*/*'})
    try:
        t = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'replace')
    except Exception as e:
        print('Không tải được lịch BLS (giữ bản cũ):', e); return
    out = []
    for b in t.split('BEGIN:VEVENT')[1:]:
        d = re.search(r'DTSTART[^:]*:(\d{8})T(\d{4})', b); sm = re.search(r'SUMMARY:(.*)', b)
        if not d or not sm or sm.group(1).strip() not in BLS_KEYS or d.group(1) < '20260201':
            continue
        x = d.group(1); out.append({'k': BLS_KEYS[sm.group(1).strip()], 'd': f'{x[:4]}-{x[4:6]}-{x[6:]}', 'time': f'{d.group(2)[:2]}:{d.group(2)[2:]}'})
    if out:
        p = ROOT / 'data/calendar/bls.json'; j = json.loads(p.read_text(encoding='utf-8')) if p.exists() else {}
        j['ev'] = out; p.write_text(json.dumps(j, ensure_ascii=False, indent=0), encoding='utf-8')
        print('Lịch BLS:', len(out), 'kỳ công bố')


if __name__ == '__main__':
    bls()
    sys.exit(main())
