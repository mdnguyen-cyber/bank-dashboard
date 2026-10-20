"""Thu nhập dịch vụ theo mảng (thuyết minh BCTC hợp nhất, số năm): thu, chi, ròng, biên, tăng trưởng.

Mảng = cặp (thu, chi) trong thuyết minh "Lãi thuần từ hoạt động dịch vụ".
'Khác' gồm phí dịch vụ khác (thẻ, bảo lãnh… tuỳ ngân hàng); phía chi gộp thêm chi viễn thông và chi môi giới kinh doanh
(không tách được theo mảng). Chứng khoán chỉ có phía thu.
"""
LINES = [
    ('pay', 'Thanh toán', ['fnx143'], ['fnx151']),
    ('ins', 'Bảo hiểm (bancassurance)', ['fnx146'], ['fnx155']),
    ('trust', 'Ủy thác, đại lý', ['fnx145'], ['fnx154']),
    ('sec', 'Chứng khoán', ['fnx147'], []),
    ('adv', 'Tư vấn', ['fnx148'], ['fnx157']),
    ('cash', 'Ngân quỹ, quản lý quỹ', ['fnx144'], ['fnx152']),
    ('oth', 'Khác (thẻ, bảo lãnh…)', ['fnx149'], ['fnx158', 'fnx153', 'fnx156']),
]


NO_EXP = {k for k, _, _, exp in LINES if not exp}   # mảng không có dòng chi riêng: không tính biên


def annual_rows(raw):
    """Gom các dòng thuyết minh năm (quarter=0) có tách mảng phí, dòng mới hơn ghi đè."""
    out = {}
    for d in raw:
        if d.get('tool') != 'wi_data_companies' or d['request'].get('endpoint_name') != 'fs_bank_notes':
            continue
        if 'fnx143' not in d['request'].get('columns', ''):
            continue
        resp = d['response'].get('data', {})
        if not isinstance(resp, dict) or 'cot' not in resp:
            continue
        for row in resp['dong']:
            r = dict(zip(resp['cot'], row))
            if r.get('quarter') == 0 and r.get('fnx142'):
                out[(r['symbol'], r['year'])] = r
    return out


def lines_of(r):
    T = lambda keys: sum((r.get(k) or 0) for k in keys) / 1e9
    res = {}
    for k, name, inc, exp in LINES:
        i, e = T(inc), -T(exp)   # chi ghi số âm → đổi dấu
        res[k] = {'inc': round(i, 1), 'exp': round(e, 1), 'net': round(i - e, 1)}
    res['_tot'] = {'inc': round((r.get('fnx142') or 0) / 1e9, 1), 'exp': round(-(r.get('fnx150') or 0) / 1e9, 1)}
    res['_tot']['net'] = round(res['_tot']['inc'] - res['_tot']['exp'], 1)
    return res


def table(series_by_year):
    """series_by_year: {year: lines_of(...)} → bảng theo mảng cho năm cuối: thu, ròng, biên, tăng trưởng thu & ròng."""
    ys = sorted(series_by_year)
    y, p = ys[-1], (ys[-2] if len(ys) > 1 else None)
    rows = []
    for k, name, *_ in LINES + [('_tot', 'Tổng', [], [])]:
        c = series_by_year[y][k]
        o = series_by_year[p][k] if p else None
        g = lambda a, b: round((a / b - 1) * 100, 1) if b and b > 0 and a is not None else None
        rows.append({'k': k, 'name': name, 'inc': c['inc'], 'net': c['net'],
                     'margin': round(c['net'] / c['inc'] * 100, 1) if c['inc'] > 0 and k not in NO_EXP else None,
                     'incYoY': g(c['inc'], o['inc']) if o else None, 'netYoY': g(c['net'], o['net']) if o else None,
                     'share': round(c['net'] / series_by_year[y]['_tot']['net'] * 100, 1) if series_by_year[y]['_tot']['net'] > 0 else None})
    return {'year': y, 'prev': p, 'rows': rows}
