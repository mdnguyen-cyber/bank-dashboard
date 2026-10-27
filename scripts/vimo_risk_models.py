"""Mô hình truyền dẫn cho Vĩ mô › Catalyst · Risk → data/vimo-risk.js (window.VRISK).

Mỗi cặp (biến gây sốc x → nhóm CPI y), số liệu tháng, % so cùng kỳ:
  1) Độ trễ: tương quan y_t với x_{t−k}, k = 0..12; chọn k có tương quan lớn nhất.
  2) Hồi quy trễ phân phối y_t = a + Σ_{k=0..K} b_k x_{t−k} (K = độ trễ đã chọn, tối thiểu 3):
     truyền dẫn tích lũy = Σ b_k (điểm % của y khi x tăng 1% kéo dài), sai số chuẩn Newey-West (12 trễ).
  3) Hiện tại: đóng góp ước tính = Σ b_k × x hiện tại theo từng trễ (các tháng tới dùng giá trị mới nhất).
Nguồn: ECO_DATA (Cục Thống kê, nhóm CPI), CMD_DATA (Brent EIA, xăng RON95 Bộ Công Thương, heo hơi bình quân ba miền).
"""
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def js_obj(p):
    s = (ROOT / p).read_text(encoding='utf-8')
    return json.loads(s[s.index('{'):s.rindex('}') + 1])


def monthly(item):   # giá trị cuối tháng
    out = {}
    for d, v in zip(item['d'], item['v']):
        if v is not None:
            out[d[:7]] = v
    return out


def yoy(m):
    ks = sorted(m); out = {}
    for k in ks:
        y, mm = int(k[:4]), k[5:]
        p = f'{y - 1}-{mm}'
        if p in m and m[p]:
            out[k] = (m[k] / m[p] - 1) * 100
    return out


def addm(m, k):
    y, mm = int(m[:4]), int(m[5:]); t = y * 12 + mm - 1 + k
    return f'{t // 12}-{t % 12 + 1:02d}'


def nw_se(X, e, L=12):
    n = len(e); XtX_i = np.linalg.inv(X.T @ X); S = (X * e[:, None]).T @ (X * e[:, None])
    for l in range(1, L + 1):
        w = 1 - l / (L + 1); G = (X[l:] * e[l:, None]).T @ (X[:-l] * e[:-l, None]); S += w * (G + G.T)
    return XtX_i @ S @ XtX_i


def model(x, y, kmax=12, kmin=3):
    months = sorted(y)
    cors = []
    for k in range(kmax + 1):
        pr = [(x[addm(m, -k)], y[m]) for m in months if addm(m, -k) in x]
        if len(pr) > 24:
            a = np.array(pr); cors.append((k, float(np.corrcoef(a[:, 0], a[:, 1])[0, 1]), len(pr)))
    best = max(cors, key=lambda c: c[1])
    K = max(best[0], kmin)
    rows = [(m, [x.get(addm(m, -k)) for k in range(K + 1)], y[m]) for m in months]
    rows = [r for r in rows if all(v is not None for v in r[1])]
    X = np.array([[1.0] + r[1] for r in rows]); Y = np.array([r[2] for r in rows])
    b, *_ = np.linalg.lstsq(X, Y, rcond=None); e = Y - X @ b
    V = nw_se(X, e); cum = float(b[1:].sum()); g = np.r_[0, np.ones(K + 1)]; se = float(np.sqrt(g @ V @ g))
    r2 = 1 - float(e @ e) / float(((Y - Y.mean()) ** 2).sum())
    last = max(x)
    cur = [x.get(addm(last, -k)) for k in range(K + 1)]
    # đóng góp vào y ở tháng mới nhất của y và dự kiến 1..K tháng tới (x giữ nguyên mức mới nhất)
    path = []
    for h in range(0, K + 1):
        xs = [x.get(addm(last, h - k), x[last]) if addm(last, h - k) <= last else x[last] for k in range(K + 1)]
        path.append({'m': addm(last, h), 'v': round(float(np.dot(b[1:], xs)), 2)})
    return {'lagBest': best[0], 'corBest': round(best[1], 2), 'cors': [{'k': k, 'r': round(r, 2)} for k, r, _ in cors], 'K': K,
            'b': [round(float(v), 4) for v in b[1:]], 'cum': round(cum, 3), 'se': round(se, 3), 't': round(cum / se, 1) if se else None,
            'r2': round(r2, 2), 'n': len(rows), 'from': rows[0][0], 'to': rows[-1][0], 'xLast': {'m': last, 'v': round(x[last], 1)},
            'path': path, 'fit': [{'m': r[0], 'y': round(r[2], 2), 'f': round(float(f), 2)} for r, f in zip(rows, X @ b)]}


def main():
    E = js_obj('data/eco-data.js'); C = js_obj('data/cmd-data.js')
    it = {x['k']: x for x in C['items']}
    ser = lambda k: {m: v for m, v in zip(E['m'], E['s'][k]) if v is not None}
    brent, ron, hog = yoy(monthly(it['brent'])), yoy(monthly(it['ron95'])), yoy(monthly(it['hog']))
    out = {'upd': E['upd'],
           'oilTrans': {'x': 'Brent', 'y': 'CPI giao thông', **model(brent, ser('cpi_trans'))},
           'ronTrans': {'x': 'Xăng RON95 bán lẻ', 'y': 'CPI giao thông', **model(ron, ser('cpi_trans'), kmax=6, kmin=1)},
           'oilHouse': {'x': 'Brent', 'y': 'CPI nhà ở, điện, nước, chất đốt', **model(brent, ser('cpi_house'))},
           'hogFood': {'x': 'Giá heo hơi', 'y': 'CPI hàng ăn và dịch vụ ăn uống', **model(hog, ser('cpi_food'))}}
    (ROOT / 'data/vimo-risk.js').write_text('window.VRISK=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    for k, v in out.items():
        if isinstance(v, dict):
            print(k, {z: v[z] for z in ('lagBest', 'corBest', 'K', 'cum', 't', 'r2', 'n', 'from', 'xLast')}, v['path'][:1], v['path'][-1])


if __name__ == '__main__':
    main()
