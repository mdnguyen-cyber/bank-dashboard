#!/usr/bin/env python3
"""Dựng data/calendar-data.js cho ngăn Lịch kinh tế.
Nguồn: data/calendar/ff.json (Forex Factory, lưu dồn) + data/calendar/manual.json (họp NHTW, lịch Cục Thống kê)
+ FOMC từ CME FedWatch (data/global/fedwatch.json). Số thực tế: tính từ chuỗi gốc đã có (BLS, BEA qua FRED; ECB; NBS;
Cục Thống kê VN) cho các chỉ tiêu khớp được; còn lại lấy "kỳ trước" của lần công bố kế tiếp (có thể đã điều chỉnh)."""
import json, re
from datetime import datetime, timedelta, timezone, date
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
CAL = ROOT / 'data/calendar'
UTC = timezone.utc


def load_js(path, var=None):
    t = (ROOT / path).read_text(encoding='utf-8')
    t = t[t.index('=') + 1:].strip().rstrip(';')
    return json.loads(t)


def series(G, k):
    s = G['s'].get(k)
    return dict(zip(s['d'], s['v'])) if s else {}


def prev_month(d, n=1):
    y, m = d.year, d.month - n
    while m < 1:
        m += 12; y -= 1
    return f'{y:04d}-{m:02d}'


def pct(v, dp=1):
    return None if v is None else f'{v:.{dp}f}%'.replace('-0.0%', '0.0%').replace('-0.00%', '0.00%')


def to_utc(day, hhmm, tz):
    h, m = map(int, hhmm.split(':'))
    dt = datetime.combine(date.fromisoformat(day), datetime.min.time()).replace(hour=h, minute=m, tzinfo=ZoneInfo(tz))
    return dt.astimezone(UTC).strftime('%Y-%m-%dT%H:%MZ')


def main():
    G = load_js('data/global-data.js')
    S = load_js('data/sector-data.js')
    ev = json.loads((CAL / 'ff.json').read_text(encoding='utf-8')) if (CAL / 'ff.json').exists() else []
    for e in ev:
        e['src'] = 'ff'
    idx = {(e['c'], e['t'], e['d'][:10]): e for e in ev}

    def add(e):
        k = (e['c'], e['t'], e['d'][:10])
        if k not in idx:
            idx[k] = e; ev.append(e)
        return idx[k]
    man = json.loads((CAL / 'manual.json').read_text(encoding='utf-8'))
    today = datetime.now(UTC).date()

    # họp NHTW (dự kiến) — FF ghi đè khi tới tuần đó
    for cb in man['cb']:
        for day in cb['dates']:
            for t in (cb['t'] if isinstance(cb['t'], list) else [cb['t']]):
                add({'c': cb['c'], 't': t, 'd': to_utc(day, cb['time'], cb['tz']), 'i': 'H', 'f': '', 'p': '', 'est': 1, 'src': 'man'})
    # lịch công bố BLS (quá khứ và tương lai) — FF ghi đè khi tới tuần đó
    BT = {'cpi': ['CPI m/m', 'CPI y/y', 'Core CPI m/m'], 'nfp': ['Non-Farm Employment Change', 'Unemployment Rate'], 'ppi': ['PPI m/m', 'Core PPI m/m'], 'jolts': ['JOLTS Job Openings']}
    bp = CAL / 'bls.json'
    if bp.exists():
        for r in json.loads(bp.read_text(encoding='utf-8'))['ev']:
            for t in BT[r['k']]:
                add({'c': 'USD', 't': t, 'd': to_utc(r['d'], r['time'], 'America/New_York'), 'i': 'H', 'f': '', 'p': '', 'src': 'bls'})
    # FOMC: ngày họp và dự báo theo xác suất CME FedWatch
    fw = G.get('fedwatch') or {}
    tgt = fw.get('target') or []
    last_f = None
    for mt in fw.get('meetings', []):
        day = mt['date']
        e = add({'c': 'USD', 't': 'Federal Funds Rate', 'd': to_utc(day, '14:00', 'America/New_York'), 'i': 'H', 'f': '', 'p': '', 'est': 1, 'src': 'man'})
        if mt.get('probs'):
            rng, pr = max(mt['probs'].items(), key=lambda kv: kv[1])
            e['fw'] = f'{rng} ({pr:.0f}%)'.replace('.', ',')
            if not e.get('f'):
                e['f'] = pct(float(rng.split('-')[1]), 2)
        if not e.get('p') and tgt and day >= today.isoformat():
            e['p'] = last_f or pct(tgt[1], 2)
        if day >= today.isoformat():
            last_f = e.get('f') or last_f
    # Việt Nam: ngày 6 hằng tháng
    vn = man['vn']
    for k in range(-14, 4):
        y, m = today.year, today.month + k
        while m < 1:
            m += 12; y -= 1
        while m > 12:
            m -= 12; y += 1
        day = f'{y:04d}-{m:02d}-{vn["day"]:02d}'
        add({'c': 'VND', 't': vn['t'] + (' · GDP quý' if m in (1, 4, 7, 10) else ''), 'd': to_utc(day, vn['time'], vn['tz']), 'i': 'H', 'f': '', 'p': '', 'est': 1, 'src': 'man', 'note': vn['note']})

    # ---- số thực tế từ chuỗi gốc
    vcpi = {x['d'][:7]: x['v'] for x in S['dom'].get('cpi', [])}
    M = [  # (quốc gia, mẫu tiêu đề, chuỗi, kiểu kỳ, định dạng)
        ('USD', r'^CPI m/m$', series(G, 'us_cpi_mom'), 'm1', 'p1'),
        ('USD', r'^CPI y/y$', series(G, 'us_cpi_yoy'), 'm1', 'p1'),
        ('USD', r'^Core CPI m/m$', series(G, 'us_cpi_core_mom'), 'm1', 'p1'),
        ('USD', r'^Core CPI y/y$', series(G, 'us_cpi_core_yoy'), 'm1', 'p1'),
        ('USD', r'^Non-Farm Employment Change$', series(G, 'us_payems_chg'), 'm1', 'k'),
        ('USD', r'^Unemployment Rate$', series(G, 'us_unrate'), 'm1', 'p1'),
        ('USD', r'^Core PCE Price Index m/m$', series(G, 'us_pce_core_mom'), 'm1', 'p1'),
        ('USD', r'^Core PCE Price Index y/y$', series(G, 'us_pce_core_yoy'), 'm1', 'p1'),
        ('USD', r'^PCE Price Index m/m$', series(G, 'us_pce_mom'), 'm1', 'p1'),
        ('USD', r'^PCE Price Index y/y$', series(G, 'us_pce_yoy'), 'm1', 'p1'),
        ('USD', r'^PPI m/m$', series(G, 'us_ppi_fd_mom'), 'm1', 'p1'),
        ('USD', r'^Core PPI m/m$', series(G, 'us_ppi_core_mom'), 'm1', 'p1'),
        ('USD', r'^Federal Funds Rate$', series(G, 'us_fedtgt_up_d'), 'd+1', 'p2'),
        ('EUR', r'^CPI Flash Estimate y/y$', series(G, 'ea_hicp'), 'flash', 'p1'),
        ('EUR', r'^Core CPI Flash Estimate y/y$', series(G, 'ea_hicp_core'), 'flash', 'p1'),
        ('CNY', r'^CPI y/y$', series(G, 'cn_cpi'), 'm1', 'p1'),
        ('CNY', r'^PPI y/y$', series(G, 'cn_ppi'), 'm1', 'p1'),
        ('VND', r'^CPI y/y', vcpi, 'm1', 'p2'),
    ]

    def fmt(v, f):
        return None if v is None else (f'{round(v):d}K' if f == 'k' else pct(v, 2 if f == 'p2' else 1))

    now = datetime.now(UTC).strftime('%Y-%m-%dT%H:%MZ')
    for e in ev:
        d = date.fromisoformat(e['d'][:10])
        for c, rx, ser, kind, f in M:
            if e['c'] != c or not re.search(rx, e['t']) or not ser:
                continue
            if kind == 'd+1':
                ks = sorted(k for k in ser if k > e['d'][:10])
                a = ser[ks[0]] if ks and e['d'] < now else None
                pk = sorted(k for k in ser if k < e['d'][:10])
                pv = ser[pk[-1]] if pk else None
            else:
                per = d.strftime('%Y-%m') if kind == 'flash' and d.day >= 25 else prev_month(d)
                a = ser.get(per) if e['d'] < now else None
                pv = ser.get(prev_month(date.fromisoformat(per + '-01')))
                e['per'] = per
            if a is not None:
                e['a'] = fmt(a, f)
            if not e.get('p') and pv is not None:
                e['p'] = fmt(pv, f)
            e['lk'] = 1
            break
    # còn thiếu: lấy "kỳ trước" của lần công bố kế tiếp
    by = {}
    for e in sorted(ev, key=lambda x: x['d']):
        by.setdefault((e['c'], e['t']), []).append(e)
    for lst in by.values():
        for a, b in zip(lst, lst[1:]):
            if not a.get('a') and b.get('p') and a['d'] < now:
                a['a'] = b['p']; a['ap'] = 1

    lo = (today - timedelta(days=400)).isoformat()
    ev = [e for e in ev if e['d'][:10] >= lo]
    ev.sort(key=lambda e: (e['d'], e['c'], e['t']))
    for e in ev:
        e.pop('seen', None)
    ffs = [e['d'] for e in ev if e.get('src') == 'ff']
    out = {'built': now, 'ff0': min(ffs) if ffs else None, 'ev': ev}
    (ROOT / 'data/calendar-data.js').write_text('window.CAL_DATA = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(f'Lịch kinh tế: {len(ev)} tin ({sum(1 for e in ev if e.get("a"))} có số thực tế)')


if __name__ == '__main__':
    main()
