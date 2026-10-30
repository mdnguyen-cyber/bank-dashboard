/* Ngành tài chính khác (đang xây dựng): Bảo hiểm nhân thọ, phi nhân thọ, môi giới bảo hiểm và Chứng khoán.
   Dữ liệu: window.FIN_DATA (data/fin-data.js, scripts/build_fin_data.py).
   - Thị trường bảo hiểm: số công bố của Bộ Tài chính (Niên giám, Bản tin thị trường bảo hiểm), IAV, GSO, báo chí dẫn nguồn; nguồn ghi theo từng điểm số.
   - Doanh nghiệp niêm yết, BCTC tổng hợp ngành, định giá: Wi MCP. */
(function () {
'use strict';
const F = window.FIN_DATA; if (!F) return;
const PAGE = document.body.dataset.page || 'bh';   // bh = ngành Bảo hiểm · ck = ngành Chứng khoán · dn = doanh nghiệp
const I = F.ins, S = I.S, W = F.wi;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nf = (v, d = 0) => v == null || isNaN(v) ? '—' : Number(v).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });
const pc = (v, d = 1) => v == null || isNaN(v) ? '—' : nf(v * 100, d) + '%';          // v là tỷ lệ (0,123)
const sg = (v, d = 1) => v == null || isNaN(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + nf(Math.abs(v * 100), d) + '%';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dvn = s => s ? s.slice(0, 10).split('-').reverse().join('/') : '—';
const last = a => a && a.length ? a[a.length - 1] : null;
const C = { navy: '#1D2678', blue: '#2938A8', teal: '#59C5C8', tealInk: '#1f8a8d', purple: '#861C52', gold: '#d9a400', red: '#c0392b', grey: '#9aa3b2', green: '#1e8f5a',
  pal: ['#1D2678', '#59C5C8', '#861C52', '#d9a400', '#5576B8', '#1f8a8d', '#c0392b', '#9aa3b2', '#8997D6', '#6b4f2a'] };
const WI = 'Wi MCP';

/* ---------- dữ liệu thị trường bảo hiểm ---------- */
const ser = (seg, met, line = 'Tổng', co = 'Toàn TT') => I.ser[`${seg}|${met}|${line}|${co}`] || [];
const kyLbl = k => { const [y, m] = k.split('-'); return +m === 12 ? 'Năm ' + y : `${+m}T/${y}`; };
const kyShort = k => { const [y, m] = k.split('-'); return +m === 12 ? y : `${+m}T/${y.slice(2)}`; };
const at = (a, k) => (a.find(p => p[0] === k) || [])[1] ?? null;
const pt = (a, k) => a.find(p => p[0] === k) || null;
const srcName = i => S[i] ? S[i][0] : '';
function srcOf(...arrs) {   // nguồn của các điểm số đang hiển thị, xếp theo thứ hạng nguồn
  const m = new Map(); arrs.flat().forEach(p => { if (p && p[3] != null && S[p[3]]) { const s = S[p[3]]; if (!m.has(s[0]) || m.get(s[0]) > s[4]) m.set(s[0], s[4]); } });
  return [...m.entries()].sort((a, b) => a[1] - b[1]).map(e => e[0]).join('; ');
}
const latestRel = (...arrs) => { const ps = arrs.flat().filter(Boolean).sort((a, b) => (S[b[3]]?.[3] || '').localeCompare(S[a[3]]?.[3] || '')); const p = ps[0]; return p ? S[p[3]] : null; };
const relLink = s => s ? (s[2] && /^https?:/.test(s[2]) ? `<a href="${esc(s[2])}" target="_blank" rel="noopener">${esc(s[1])}</a>` : esc(s[1])) + (s[3] ? `, đăng ${dvn(s[3])}` : '') : '';
const FY = I.fy, FYY = FY.years;
const fy = k => (FY.rows.find(r => r.k === k) || { v: [] }).v;
const FY_SRC = 'Bộ Tài chính – Niên giám Thị trường bảo hiểm Việt Nam (2016–2024); Bộ Tài chính – Bản tin thị trường bảo hiểm (Cục QLGSBH), số ước năm 2025';
const yearEnds = a => a.filter(p => p[0].endsWith('-12'));
// điểm mới nhất và điểm cuối năm trước để so
const lastPt = a => last(a);

/* ---------- Wi MCP: BCTC ---------- */
const SK = W.secK, IK = W.insK;
const sv = (row, k) => row ? row[SK.indexOf(k) + 1] : null;
const iv = (row, k) => row ? row[IK.indexOf(k) + 1] : null;
const qLbl = q => q ? `Q${q.slice(5)}/${q.slice(0, 4)}` : '—';
const prevQ = q => { let y = +q.slice(0, 4), n = +q.slice(5) - 1; if (!n) { n = 4; y--; } return `${y}Q${n}`; };
const yoyQ = q => `${+q.slice(0, 4) - 1}Q${q.slice(5)}`;
const rowAt = (rows, q) => rows.find(r => r[0] === q) || null;
const ttm = (rows, q, f) => { let s = 0, k = q; for (let i = 0; i < 4; i++) { const r = rowAt(rows, k); if (!r) return null; const v = f(r); if (v == null) return null; s += v; k = prevQ(k); } return s; };
const avgBal = (rows, q, f) => { const a = f(rowAt(rows, q)), b = f(rowAt(rows, yoyQ(q))); return a != null && b != null ? (a + b) / 2 : a; };
// ngành chứng khoán: quý cuối có thể chưa đủ công ty báo cáo → bỏ quý mà VCSH ngành giảm > 8% so quý trước
const SECQ = (() => { const r = W.secSector.slice(); while (r.length > 2) { const a = sv(r[r.length - 1], 'bs400'), b = sv(r[r.length - 2], 'bs400'); if (a < b * 0.92) r.pop(); else break; } return r; })();
const SEC_LASTQ = last(SECQ)[0];
const INSQ = W.insSector;

/* ---------- Chart.js ---------- */
Chart.defaults.font.family = 'Arial, "Helvetica Neue", sans-serif'; Chart.defaults.font.size = 11.5; Chart.defaults.color = '#3f4656';
Chart.defaults.plugins.legend.labels.boxWidth = 12; Chart.defaults.plugins.legend.position = 'bottom';
Chart.defaults.maintainAspectRatio = false; Chart.defaults.animation = false;
Chart.defaults.plugins.tooltip.callbacks.label = ctx => {
  const ds = ctx.dataset, v = ctx.chart.options.indexAxis === 'y' ? ctx.parsed.x : ctx.parsed.y;
  if (v == null) return null;
  return `${ds.label}: ${nf(v, ds.dp ?? 1)}${ds.unit || ''}`;
};
Chart.defaults.plugins.tooltip.callbacks.footer = items => {   // nguồn của đúng điểm số đang trỏ
  const ss = [...new Set(items.map(it => { const s = it.dataset.$src && it.dataset.$src[it.dataIndex]; return s == null ? null : (typeof s === 'number' ? S[s] && S[s][1] : s); }).filter(Boolean))];
  return ss.length ? 'Nguồn: ' + ss.join(' · ') : '';
};
Chart.defaults.plugins.tooltip.footerFont = { weight: 'normal', size: 10.5 };
const charts = {}, SPEC = {};
const cl = o => Array.isArray(o) ? o.map(cl) : (o && Object.getPrototypeOf(o) === Object.prototype) ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, cl(v)])) : o;
const ptLbl = { id: 'ptLbl', afterDatasetsDraw(ch) {   // nhãn mã cạnh điểm của chart bubble
  if (ch.config.type !== 'bubble') return; const x = ch.ctx; x.save(); x.font = '700 11px Arial'; x.fillStyle = '#303540'; x.textBaseline = 'middle';
  ch.data.datasets.forEach((ds, i) => { const m = ch.getDatasetMeta(i); if (m.hidden) return; m.data.forEach(e => x.fillText(ds.label, e.x + (e.options.radius || 6) + 3, e.y)); }); x.restore(); } };
Chart.register(ptLbl);
function mk(id, cfg, o = {}) {
  const el = document.getElementById(id); if (!el) return;
  if (charts[id]) charts[id].destroy();
  if (!id.startsWith('cb-')) { const c = el.closest('article.card'), h = c && c.querySelector(':scope > h3.sub'), one = q => { const e = c && c.querySelector(':scope > ' + q); return e ? e.innerHTML : ''; };
    SPEC[id] = { cfg: cl(cfg), ts: !!o.ts, title: h ? h.textContent : id, sub: one('.chart-sub'), src: one('.src') }; }
  cfg.options = cfg.options || {};
  cfg.options.interaction = cfg.options.interaction || { mode: 'index', intersect: false, axis: cfg.options.indexAxis === 'y' ? 'y' : 'x' };
  if (window.FSK) FSK.prep(cfg);
  charts[id] = new Chart(el, cfg);
  if (window.FSK && o.ts) FSK.enhance(charts[id], { today: new Date(F.built) });
  return charts[id];
}
const grid = { color: '#eef0f4' };
const yNum = (t, x = {}) => Object.assign({ grid, ticks: { callback: v => nf(v, 0) }, title: t ? { display: true, text: t } : undefined }, x);
const yPct = (t, x = {}) => Object.assign({ grid, ticks: { callback: v => nf(v, 0) + '%' }, title: t ? { display: true, text: t } : undefined }, x);
const bar = (label, data, color, o = {}) => Object.assign({ type: 'bar', label, data, backgroundColor: color, borderColor: color, borderRadius: 3, unit: '', dp: 0 }, o);
const line = (label, data, color, o = {}) => Object.assign({ type: 'line', label, data, borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 2, tension: 0, spanGaps: true, unit: '%', dp: 1 }, o);

/* ---------- khung thẻ ---------- */
function card({ id, title, sub, ins, src, h = '', body = '', cls = '' }) {
  return `<article class="card ${cls}">
    <h3 class="sub">${title}</h3>${sub ? `<p class="chart-sub">${sub}</p>` : ''}
    ${id ? `<div class="cbox ${h}"><canvas id="${id}" role="img" aria-label="${esc(title)}"></canvas></div>` : ''}${body}
    ${ins ? `<div class="insight">${ins}</div>` : ''}${src ? `<div class="src">Nguồn: ${src}</div>` : ''}</article>`;
}
const kpi = (l, v, s, cls = '') => `<div class="kpi"><span>${l}</span><b>${v}</b><em class="${cls}">${s || ''}</em></div>`;
const cls = v => v == null ? '' : v >= 0 ? 'pos' : 'neg';
const tbl = (head, rows, o = {}) => `<div class="tscroll"><table class="fz ${o.cls || ''}"><thead><tr>${head.map((h, i) => `<th${i && o.num !== false ? ' class="n"' : ''}>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i && o.num !== false ? ' class="n"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
// chuỗi giá trị: 3 cột, mỗi cột có các ô số liệu
function chain(cols) {
  return `<div class="vchain">${cols.map(c => `<div class="vc-col"><h4>${c.t}</h4><p>${c.d}</p>${(c.k || []).map(k => `<div class="vc-k"><span>${k[0]}</span><b>${k[1]}</b>${k[2] ? `<em>${k[2]}</em>` : ''}</div>`).join('')}</div>`).join('')}</div>`;
}

/* =====================================================================
   HEADER
===================================================================== */
const lP = lastPt(ser('LIFE', 'PREM')), nP = lastPt(ser('NONLIFE', 'PREM')), tP = lastPt(ser('TOTAL', 'PREM'));
const sv408 = W.secVal['408'], sv406 = W.secVal['406'];
function header() {
  if (PAGE === 'bh') $('#stockHead').innerHTML = `<div class="tick">BẢO HIỂM</div>
    <div class="cname">Ngành Bảo hiểm · Nhân thọ, Phi nhân thọ, Môi giới <span class="pill watch">Đang xây dựng</span><small>Thị trường theo số công bố của Bộ Tài chính, IAV; doanh nghiệp niêm yết theo Wi MCP · dựng ${dvn(F.built)}</small></div>
    <div class="hstats">
      <div class="hstat"><span>Phí BH ${kyShort(tP[0])}</span><b>${nf(tP[1])} tỷ</b></div>
      <div class="hstat"><span>Tổng phí YoY</span><b>${sg(tP[2])}</b></div>
      <div class="hstat"><span>Nhân thọ YoY</span><b>${sg(lP[2])}</b></div>
      <div class="hstat"><span>Phi nhân thọ YoY</span><b>${sg(nP[2])}</b></div>
      <div class="hstat"><span>P/B ngành</span><b>${nf(last(sv406.pb), 2)}x</b></div>
    </div>`;
  else { const r = rowAt(SECQ, SEC_LASTQ), vk = Object.keys(F.vni).sort();
    $('#stockHead').innerHTML = `<div class="tick">CHỨNG KHOÁN</div>
    <div class="cname">Ngành Chứng khoán · Công ty chứng khoán niêm yết <span class="pill watch">Đang xây dựng</span><small>BCTC tổng hợp ngành, 9 công ty lớn và định giá theo Wi MCP · dựng ${dvn(F.built)}</small></div>
    <div class="hstats">
      <div class="hstat"><span>VN-Index</span><b>${nf(F.vni[last(vk)], 0)}</b></div>
      <div class="hstat"><span>Dư nợ cho vay ${qLbl(SEC_LASTQ)}</span><b>${nf(sv(r, 'bs114') / 1000, 0)} nghìn tỷ</b></div>
      <div class="hstat"><span>Cho vay / VCSH</span><b>${pc(sv(r, 'bs114') / sv(r, 'bs400'), 0)}</b></div>
      <div class="hstat"><span>P/B ngành</span><b>${nf(last(sv408.pb), 2)}x</b></div>
      <div class="hstat"><span>P/E ngành</span><b>${nf(last(sv408.pe), 1)}x</b></div>
    </div>`; }
  $('#stamp').textContent = 'Dữ liệu dựng ngày ' + dvn(F.built);
}
const avgN = (a, n) => { const b = a.slice(-n).filter(v => v != null); return b.length ? b.reduce((s, v) => s + v, 0) / b.length : null; };
const sdN = (a, n) => { const b = a.slice(-n).filter(v => v != null), m = avgN(b, b.length); return Math.sqrt(b.reduce((s, v) => s + (v - m) ** 2, 0) / b.length); };
const dnLink = s => `<a href="dn.html?s=${s}">${s}</a>`;
function pbBand(id, sv, color) {   // P/B ngành theo phiên + trung bình 3 năm ±1 độ lệch chuẩn
  const n = sv.pb.length, m = avgN(sv.pb, n), sd = sdN(sv.pb, n);
  mk(id, { type: 'line', data: { labels: sv.d.map(dvn), datasets: [
    line('P/B', sv.pb, color, { pointRadius: 0, unit: 'x', dp: 2 }),
    line('Trung bình', sv.pb.map(() => m), C.grey, { pointRadius: 0, borderDash: [5, 4], borderWidth: 1.4, unit: 'x', dp: 2 }),
    line('+1 độ lệch chuẩn', sv.pb.map(() => m + sd), C.red, { pointRadius: 0, borderDash: [2, 3], borderWidth: 1, unit: 'x', dp: 2 }),
    line('−1 độ lệch chuẩn', sv.pb.map(() => m - sd), C.green, { pointRadius: 0, borderDash: [2, 3], borderWidth: 1, unit: 'x', dp: 2 }) ] },
    options: { scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: yNum('lần', { ticks: { callback: v => nf(v, 1) + 'x' } }) } } }, { ts: true });
  return { m, sd, z: (last(sv.pb) - m) / sd };
}
const zTxt = z => z > 1 ? 'cao hơn trung bình trên 1 độ lệch chuẩn' : z > 0.3 ? 'cao hơn trung bình' : z < -1 ? 'thấp hơn trung bình trên 1 độ lệch chuẩn' : z < -0.3 ? 'thấp hơn trung bình' : 'quanh trung bình';

/* =====================================================================
   TỔNG QUAN NGÀNH BẢO HIỂM
===================================================================== */
const INS_ALL = ['BVH', 'PVI', 'MIG', 'BMI', 'BIC', 'PTI'];
function paneMktBH(T) {
  const tA = lastPt(ser('TOTAL', 'ASSETS')), tI = lastPt(ser('TOTAL', 'INVEST')), lNB = lastPt(ser('LIFE', 'NB_PREM')), lC = lastPt(ser('LIFE', 'CLAIMS'));
  const ms = INS_ALL.map(insMetrics), n = sv406.pb.length;
  const inf = lastPt(ser('LIFE', 'INFORCE_CONTRACTS')), fyIf = fy('LIFE|INFORCE_CONTRACTS|Tổng|Toàn TT'), mIf = Math.max(...fyIf.filter(x => x != null));
  T.innerHTML = `
  <p class="sec-sub">Quy mô thị trường theo số công bố của Bộ Tài chính và IAV (lũy kế từ đầu năm, tỷ đồng); doanh nghiệp niêm yết theo BCTC quý và định giá theo phiên.</p>
  <div class="kpis">
    ${kpi('Tổng phí ' + kyShort(tP[0]), nf(tP[1]) + ' tỷ', 'YoY ' + sg(tP[2]), cls(tP[2]))}
    ${kpi('Phí nhân thọ ' + kyShort(lP[0]), nf(lP[1]) + ' tỷ', 'YoY ' + sg(lP[2]), cls(lP[2]))}
    ${kpi('Phí khai thác mới NT', nf(lNB[1]) + ' tỷ', kyShort(lNB[0]) + ' · YoY ' + sg(lNB[2]), cls(lNB[2]))}
    ${kpi('Phí phi nhân thọ ' + kyShort(nP[0]), nf(nP[1]) + ' tỷ', 'YoY ' + sg(nP[2]), cls(nP[2]))}
    ${kpi('Đầu tư trở lại nền KT', nf(tI[1] / 1000, 0) + ' nghìn tỷ', 'Tổng tài sản ' + nf(tA[1] / 1000, 0) + ' nghìn tỷ · ' + kyShort(tI[0]))}
    ${kpi('P/B ngành', nf(last(sv406.pb), 2) + 'x', 'TB 3 năm ' + nf(avgN(sv406.pb, n), 2) + 'x · ' + dvn(last(sv406.d)))}
  </div>
  <article class="card"><h3 class="sub">Điều đang diễn ra</h3><ul class="ilist">
    <li><b>Nhân thọ thu hẹp sau 2022.</b> Phí khai thác mới năm 2025 bằng ${pc(fy('LIFE|NB_PREM|Tổng|Toàn TT')[9] / fy('LIFE|NB_PREM|Tổng|Toàn TT')[6], 0)} mức đỉnh 2022; hợp đồng có hiệu lực ${nf(inf[1] / 1e6, 2)} triệu (${kyShort(inf[0])}), từ đỉnh ${nf(mIf / 1e6, 1)} triệu cuối ${FYY[fyIf.indexOf(mIf)]}.</li>
    <li><b>Chi trả tăng nhanh hơn phí.</b> ${kyLbl(lC[0])}: chi trả quyền lợi nhân thọ ${nf(lC[1])} tỷ (${sg(lC[2])}), phí ${sg(lP[2])}. Hợp đồng ký đợt 2018–2022 đang đáo hạn và bị hủy.</li>
    <li><b>Sản phẩm chuyển sang tử kỳ:</b> ${pc(at(ser('LIFE', 'NB_CONTRACTS_MIX', 'Tử kỳ'), lP[0]), 1)} số hợp đồng mới ${kyShort(lP[0])}; phí mới bình quân mỗi hợp đồng giảm.</li>
    <li><b>Phi nhân thọ tăng nhanh:</b> ${sg(nP[2])} ${kyShort(nP[0])}, sức khỏe và tài sản dẫn dắt.</li>
    <li><b>Định giá:</b> P/B ngành ${nf(last(sv406.pb), 2)}x, ${zTxt((last(sv406.pb) - avgN(sv406.pb, n)) / sdN(sv406.pb, n))} 3 năm (${nf(avgN(sv406.pb, n), 2)}x).</li></ul>
    <div class="src">Nguồn: ${srcOf(ser('LIFE', 'PREM').slice(-2), ser('LIFE', 'CLAIMS').slice(-1), ser('NONLIFE', 'PREM').slice(-1), [inf])}; ${WI}</div></article>
  <div class="grid g2 gap">
    ${card({ id: 'ovPrem', title: 'Doanh thu phí bảo hiểm theo năm', sub: 'Tỷ đồng · cột: phi nhân thọ và nhân thọ; đường: tổng phí so GDP (trục phải). Năm 2025 là số ước.', src: FY_SRC + '; Tổng cục Thống kê (GSO)',
      ins: `Phí nhân thọ đạt đỉnh <b>${nf(fy('LIFE|PREM|Tổng|Toàn TT')[6])} tỷ</b> năm 2022 rồi giảm ba năm liền, còn <b>${nf(fy('LIFE|PREM|Tổng|Toàn TT')[9])} tỷ</b> năm 2025. Phi nhân thọ tăng đều, nên tỷ trọng phi nhân thọ trong tổng phí lên ${pc(fy('NONLIFE|PREM|Tổng|Toàn TT')[9] / fy('TOTAL|PREM|Tổng|Toàn TT')[9], 0)} năm 2025 (2022: ${pc(fy('NONLIFE|PREM|Tổng|Toàn TT')[6] / fy('TOTAL|PREM|Tổng|Toàn TT')[6], 0)}).` })}
    ${card({ id: 'ovPbBH', title: 'P/B ngành bảo hiểm', sub: 'Lần · theo phiên; đường đứt: trung bình 3 năm và ±1 độ lệch chuẩn', src: WI + ' (định giá ngành theo ngày)' })}
  </div>
  <article class="card"><h3 class="sub">Doanh nghiệp bảo hiểm niêm yết</h3>
    <p class="chart-sub">4 quý gần nhất đến quý mới nhất của từng mã; bấm mã để xem trang doanh nghiệp. Tỷ lệ kết hợp chỉ áp dụng cho phi nhân thọ.</p>
    ${insTable(ms)}
    <div class="src">Nguồn: ${WI} (BCTC hợp nhất, định giá phiên ${dvn(ms[0].v.d)})</div></article>`;
  drawPremFY();
  pbBand('ovPbBH', sv406, C.teal);
}
function insTable(ms) {
  return tbl(['Mã', 'Quý', 'Phí gốc 4Q', 'YoY', 'Tỷ lệ bồi thường', 'Tỷ lệ kết hợp', 'Danh mục / VCSH', 'LN tài chính / LNTT', 'ROE', 'P/B', 'P/E', 'Vốn hóa (tỷ)'],
    ms.map(m => [`<b>${dnLink(m.sym)}</b>`, qLbl(m.q), nf(m.gp), `<span class="${cls(m.gy)}">${sg(m.gy)}</span>`, pc(m.lr, 0), m.sym === 'BVH' ? '<span class="muted">—</span>' : `<span class="${m.cr > 1 ? 'neg' : 'pos'}">${pc(m.cr, 1)}</span>`, nf(m.invEq, 2) + 'x', pc(m.fin, 0), pc(m.roe, 1), nf(m.v.pb, 2) + 'x', nf(m.v.pe, 1) + 'x', nf(m.v.mcap)]));
}
function drawPremFY() {
  const yrs = FYY.map(String);
  mk('ovPrem', { type: 'bar', data: { labels: yrs, datasets: [
    bar('Phi nhân thọ', fy('NONLIFE|PREM|Tổng|Toàn TT'), C.teal, { stack: 's', unit: ' tỷ' }),
    bar('Nhân thọ', fy('LIFE|PREM|Tổng|Toàn TT'), C.navy, { stack: 's', unit: ' tỷ' }),
    line('Phí / GDP', fy('TOTAL|PREM_GDP|Tổng|Toàn TT').map(v => v == null ? null : v * 100), C.purple, { yAxisID: 'y1', dp: 2 }) ] },
    options: { scales: { x: { stacked: true, grid: { display: false } }, y: yNum('tỷ đồng', { stacked: true }), y1: yPct('', { position: 'right', grid: { display: false }, ticks: { callback: v => nf(v, 1) + '%' } }) } } });
}
// so sánh doanh nghiệp bảo hiểm niêm yết (Bức tranh ngành)
function panePeerBH(T) {
  const ms = INS_ALL.map(insMetrics);
  T.innerHTML = `
  <div class="grid g2 gap">
    ${card({ id: 'pbScBH', title: 'P/B và ROE: doanh nghiệp bảo hiểm niêm yết', sub: 'P/B phiên gần nhất (trục dọc), ROE 4 quý (trục ngang)', src: WI })}
    ${card({ id: 'pbFinBH', title: 'Lợi nhuận tài chính so với lợi nhuận trước thuế', sub: '% · 4 quý gần nhất; trên 100% là nghiệp vụ bảo hiểm lỗ sau chi phí, đầu tư bù lại', src: WI + ' (BCTC hợp nhất)',
      ins: 'Lợi nhuận của doanh nghiệp bảo hiểm Việt Nam đến chủ yếu từ danh mục đầu tư (tiền gửi, trái phiếu), nên lãi suất huy động và lợi suất trái phiếu Chính phủ quyết định phần lớn lợi nhuận.' })}
  </div>
  <article class="card"><h3 class="sub">Bảng so sánh</h3>${insTable(ms)}<div class="src">Nguồn: ${WI}</div></article>`;
  const pts = ms.filter(m => m.v && m.v.pb != null && m.roe != null);
  mk('pbScBH', { type: 'bubble', data: { datasets: pts.map((m, i) => ({ label: m.sym, data: [{ x: m.roe * 100, y: m.v.pb, r: Math.max(5, Math.sqrt(m.v.mcap || 0) / 12) }], backgroundColor: C.pal[i] + 'cc', borderColor: C.pal[i] })) },
    options: { interaction: { mode: 'nearest', intersect: true }, plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ROE ${nf(c.raw.x, 1)}%, P/B ${nf(c.raw.y, 2)}x` } } },
      scales: { x: yPct('ROE 4 quý'), y: yNum('P/B', { ticks: { callback: v => nf(v, 1) + 'x' } }) } } });
  mk('pbFinBH', { type: 'bar', data: { labels: ms.map(m => m.sym), datasets: [bar('LN tài chính / LNTT', ms.map(m => m.fin * 100), ms.map(m => m.fin > 1 ? C.purple : C.navy), { unit: '%', dp: 0 })] },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: yPct('%') } } });
}

/* =====================================================================
   TỔNG QUAN NGÀNH CHỨNG KHOÁN
===================================================================== */
function paneMktCK(T) {
  const q = SEC_LASTQ, r = rowAt(SECQ, q), r0 = rowAt(SECQ, yoyQ(q)), n = sv408.pb.length;
  const ms = SEC_L.map(s => secMetrics(s, q)).filter(Boolean);
  const tS = f => ttm(SECQ, q, f), tS0 = f => ttm(SECQ, yoyQ(q), f), pbt = tS(x => sv(x, 'is90')), pbt0 = tS0(x => sv(x, 'is90'));
  T.innerHTML = `
  <p class="sec-sub">Số tổng hợp các công ty chứng khoán niêm yết (BCTC hợp nhất), tỷ đồng. Kỳ chung để so sánh: ${qLbl(q)}; quý sau đó chưa đủ công ty báo cáo.</p>
  <div class="kpis">
    ${kpi('Dư nợ cho vay', nf(sv(r, 'bs114') / 1000, 0) + ' nghìn tỷ', 'YoY ' + sg(sv(r, 'bs114') / sv(r0, 'bs114') - 1), cls(sv(r, 'bs114') / sv(r0, 'bs114') - 1))}
    ${kpi('Cho vay / VCSH', pc(sv(r, 'bs114') / sv(r, 'bs400'), 0), 'trần 200% VCSH từng công ty')}
    ${kpi('Nợ vay / VCSH', pc(debtOf(r) / sv(r, 'bs400'), 0), 'cùng kỳ ' + pc(debtOf(r0) / sv(r0, 'bs400'), 0))}
    ${kpi('Doanh thu môi giới 4Q', nf(tS(x => sv(x, 'is06')) / 1000, 1) + ' nghìn tỷ', 'YoY ' + sg(tS(x => sv(x, 'is06')) / tS0(x => sv(x, 'is06')) - 1), cls(tS(x => sv(x, 'is06')) / tS0(x => sv(x, 'is06')) - 1))}
    ${kpi('LNTT 4 quý', nf(pbt / 1000, 1) + ' nghìn tỷ', 'YoY ' + sg(pbt / pbt0 - 1), cls(pbt / pbt0 - 1))}
    ${kpi('P/B ngành', nf(last(sv408.pb), 2) + 'x', 'TB 3 năm ' + nf(avgN(sv408.pb, n), 2) + 'x · ' + dvn(last(sv408.d)))}
  </div>
  <article class="card"><h3 class="sub">Điều đang diễn ra</h3>${secOverviewList()}
    <div class="src">Nguồn: ${WI} (BCTC tổng hợp ngành chứng khoán, định giá ngành)</div></article>
  <div class="grid g2 gap">
    ${card({ id: 'ovRevCK', title: 'Doanh thu theo mảng của các CTCK niêm yết', sub: 'Tỷ đồng/quý · lãi FVTPL đã trừ lỗ FVTPL; đường: VN-Index cuối quý (trục phải)', src: WI + ' (BCTC tổng hợp ngành chứng khoán; VN-Index)' })}
    ${card({ id: 'ovPbCK', title: 'P/B ngành chứng khoán', sub: 'Lần · theo phiên; đường đứt: trung bình 3 năm và ±1 độ lệch chuẩn', src: WI + ' (định giá ngành theo ngày)' })}
  </div>
  <article class="card"><h3 class="sub">9 công ty chứng khoán lớn</h3>
    <p class="chart-sub">4 quý đến ${qLbl(q)}; bấm mã để xem trang doanh nghiệp. Thị phần tính trong tổng các CTCK niêm yết.</p>
    ${tbl(['Mã', 'P/B', 'P/E', 'Vốn hóa (tỷ)', 'VCSH (tỷ)', 'Thị phần DT môi giới', 'Thị phần cho vay', 'Cho vay / VCSH', 'Nợ vay / VCSH', 'ROE 4Q'],
      ms.map(m => [`<b>${dnLink(m.sym)}</b>`, nf(m.v.pb, 2) + 'x', nf(m.v.pe, 1) + 'x', nf(m.v.mcap), nf(m.eq), pc(m.brkSh, 1), pc(m.loanSh, 1), `<span class="${m.loanEq > 1.7 ? 'neg' : ''}">${pc(m.loanEq, 0)}</span>`, pc(m.debtEq, 0), pc(m.roe, 1)]))}
    <div class="src">Nguồn: ${WI}</div></article>`;
  drawRevCK('ovRevCK');
  pbBand('ovPbCK', sv408, C.navy);
}
function secOverviewList() {
  const q = SEC_LASTQ, r = rowAt(SECQ, q), r0 = rowAt(SECQ, yoyQ(q));
  const rev = x => sv(x, 'is06'), mi = x => sv(x, 'is03');
  const debt = x => (sv(x, 'bs311') || 0) + (sv(x, 'bs316') || 0) + (sv(x, 'bs346') || 0);
  const pbt = ttm(SECQ, q, x => sv(x, 'is90')), pbt0 = ttm(SECQ, yoyQ(q), x => sv(x, 'is90'));
  return `<ul class="ilist">
    <li><b>Cho vay ký quỹ là nguồn thu lớn nhất.</b> ${qLbl(q)}: lãi cho vay ${nf(mi(r))} tỷ, gấp ${nf(mi(r) / rev(r), 1)} lần doanh thu môi giới ${nf(rev(r))} tỷ. Dư nợ cho vay ${nf(sv(r, 'bs114') / 1000, 0)} nghìn tỷ (${sg(sv(r, 'bs114') / sv(r0, 'bs114') - 1, 0)} so cùng kỳ).</li>
    <li><b>Đòn bẩy ${debt(r) / sv(r, 'bs400') > debt(r0) / sv(r0, 'bs400') ? 'tăng' : 'giảm'}:</b> nợ vay và trái phiếu phát hành bằng ${pc(debt(r) / sv(r, 'bs400'), 0)} VCSH (cùng kỳ ${pc(debt(r0) / sv(r0, 'bs400'), 0)}).</li>
    <li><b>Lợi nhuận trước thuế 4 quý</b> ${nf(pbt / 1000, 1)} nghìn tỷ, ${sg(pbt / pbt0 - 1, 0)} so 4 quý trước đó.</li>
    <li><b>Định giá:</b> P/B ngành ${nf(last(sv408.pb), 2)}x, P/E ${nf(last(sv408.pe), 1)}x.</li></ul>`;
}
function drawRevCK(id) {
  const R = SECQ.filter(r => r[0] >= '2019Q1');
  const qEnd = q2 => { const y = q2.slice(0, 4), m = String(+q2.slice(5) * 3).padStart(2, '0'); return F.vni[`${y}-${m}`] ?? null; };
  mk(id, { type: 'bar', data: { labels: R.map(r => qLbl(r[0])), datasets: [
    bar('Môi giới', R.map(r => sv(r, 'is06')), C.navy, { stack: 's', unit: ' tỷ' }),
    bar('Lãi cho vay và phải thu', R.map(r => sv(r, 'is03')), C.teal, { stack: 's', unit: ' tỷ' }),
    bar('Lãi FVTPL ròng', R.map(r => (sv(r, 'is01') || 0) + (sv(r, 'is21') || 0)), C.gold, { stack: 's', unit: ' tỷ' }),
    bar('HTM + AFS', R.map(r => (sv(r, 'is02') || 0) + (sv(r, 'is04') || 0)), C.grey, { stack: 's', unit: ' tỷ' }),
    bar('Bảo lãnh, tư vấn', R.map(r => (sv(r, 'is07') || 0) + (sv(r, 'is10') || 0)), C.purple, { stack: 's', unit: ' tỷ' }),
    line('VN-Index', R.map(r => qEnd(r[0])), C.red, { yAxisID: 'y1', unit: '', dp: 0, pointRadius: 1.5 }) ] },
    options: { scales: { x: { stacked: true, grid: { display: false } }, y: yNum('tỷ đồng', { stacked: true }), y1: yNum('VN-Index', { position: 'right', grid: { display: false } }) } } });
}
// Bức tranh ngành CK › Thị trường
function paneMkt(T) {
  const vk = Object.keys(F.vni).sort(), vl = last(vk), v12 = F.vni[vk[vk.length - 13]], vye = F.vni[`${+vl.slice(0, 4) - 1}-12`];
  T.innerHTML = `
  <div class="kpis k4">
    ${kpi('VN-Index', nf(F.vni[vl], 0), 'tháng ' + vl.slice(5) + '/' + vl.slice(0, 4))}
    ${kpi('So đầu năm', sg(F.vni[vl] / vye - 1), '', cls(F.vni[vl] / vye - 1))}
    ${kpi('So 12 tháng trước', sg(F.vni[vl] / v12 - 1), '', cls(F.vni[vl] / v12 - 1))}
    ${kpi('P/B ngành CK', nf(last(sv408.pb), 2) + 'x', 'P/E ' + nf(last(sv408.pe), 1) + 'x')}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'scPb', title: 'P/B ngành chứng khoán và VN-Index', sub: 'P/B theo phiên (trục trái); VN-Index cuối tháng (trục phải)', src: WI + ' (định giá ngành theo ngày; VN-Index)',
      ins: 'Cổ phiếu chứng khoán là nhóm có beta cao nhất với thị trường: doanh thu môi giới, cho vay ký quỹ và lãi danh mục đều đi theo thanh khoản và điểm số, nên P/B ngành thường dẫn trước VN-Index ở các nhịp tăng và giảm.' })}
    ${card({ title: 'Dữ liệu thị trường đang bổ sung', body: tbl(['Chỉ số', 'Dùng để', 'Trạng thái'], [
      ['Giá trị giao dịch toàn thị trường theo tháng', 'Dự phóng doanh thu môi giới', '<span class="pill pending">Đang lấy</span>'],
      ['Thị phần môi giới HOSE theo quý', 'Thị phần × phí', '<span class="pill pending">Đang lấy</span>'],
      ['Dư nợ margin toàn thị trường (gồm CTCK chưa niêm yết)', 'Thị phần margin', '<span class="pill pending">Đang lấy</span>'],
      ['Chi phí vốn: lãi suất vay ngân hàng, vay hợp vốn nước ngoài', 'NIM mảng cho vay', '<span class="pill pending">Đang lấy</span>'],
      ['Lợi suất thu nhập cố định (tiền gửi, CD, TPDN)', 'Thu nhập danh mục FI', '<span class="pill pending">Đang lấy</span>'],
      ['Số thương vụ IPO, phát hành TPDN theo tổ chức tư vấn', 'Doanh thu ngân hàng đầu tư', '<span class="pill pending">Đang lấy</span>'],
      ['Khối ngoại mua bán ròng theo tháng', 'Dòng vốn sau nâng hạng FTSE', '<span class="pill pending">Đang lấy</span>']], { num: false }) })}
  </div>`;
  drawMkt();
}

/* =====================================================================
   TAB 2 · BẢO HIỂM NHÂN THỌ
===================================================================== */
const LIFE_CO = ['Bảo Việt Nhân thọ', 'Manulife', 'Prudential', 'Dai-ichi', 'AIA', 'MB Ageas', 'FWD', 'Generali', 'Chubb Life', 'Hanwha Life', 'Sun Life', 'Cathay Life', 'BIDV MetLife'];
function paneLife() {
  const P = ser('LIFE', 'PREM'), NB = ser('LIFE', 'NB_PREM'), CL = ser('LIFE', 'CLAIMS'), IF = ser('LIFE', 'INFORCE_CONTRACTS'), NC = ser('LIFE', 'NB_CONTRACTS');
  const RS = ser('LIFE', 'RESERVES'), AS = ser('LIFE', 'ASSETS'), IV = ser('LIFE', 'INVEST'), EQ = ser('LIFE', 'EQUITY');
  const p = last(P), nb = last(NB), cl = last(CL), inf = last(IF), nc = last(NC), rs = last(RS), as = last(AS), iv = last(IV), eq = last(EQ);
  const k = p[0];   // kỳ mới nhất
  const cp = cl[0] === k ? cl[1] / p[1] : null, cp0 = (cl[0] === k && p[2] != null && cl[2] != null) ? (cl[1] / (1 + cl[2])) / (p[1] / (1 + p[2])) : null;
  const bvS = ser('LIFE', 'SHARE_CO', 'Tổng', 'Bảo Việt Nhân thọ'), bvN = ser('LIFE', 'NB_SHARE_CO', 'Tổng', 'Bảo Việt Nhân thọ');
  $('#life').innerHTML = `
  <h2 class="sec">Bảo hiểm nhân thọ</h2>
  <p class="sec-sub">Số liệu lũy kế từ đầu năm, tỷ đồng. Số tháng là số ước tại thời điểm công bố; số năm chính thức theo Niên giám của Bộ Tài chính. Rê chuột vào từng điểm để xem bản tin nguồn.</p>

  <div class="grid g2 gap">
    ${card({ id: 'lfFY', title: 'Phí, khai thác mới và chi trả theo năm', sub: 'Tỷ đồng · số chính thức năm; năm 2025 là số ước', src: FY_SRC,
      ins: `Phí khai thác mới năm 2025 bằng ${pc(fy('LIFE|NB_PREM|Tổng|Toàn TT')[9] / fy('LIFE|NB_PREM|Tổng|Toàn TT')[6], 0)} đỉnh 2022, hệ quả của khủng hoảng niềm tin 2023 với sản phẩm liên kết đầu tư bán qua ngân hàng và các quy định siết bán hàng sau đó. Chi trả quyền lợi trên 57 nghìn tỷ mỗi năm từ 2023, gần gấp đôi năm 2020.` })}
    ${card({ id: 'lfYtd', title: 'Tăng trưởng lũy kế từ đầu năm', sub: '% so cùng kỳ · tổng phí, phí khai thác mới, chi trả quyền lợi', src: srcOf(P.filter(x => x[0] >= '2023'), NB.filter(x => x[0] >= '2023'), CL.filter(x => x[0] >= '2023')),
      ins: `${kyLbl(k)}: phí ${sg(p[2])}, phí mới ${sg(nb[2])}, chi trả ${sg(cl[2])}. Khai thác mới vẫn giảm nên tổng phí chưa thể quay lại tăng trưởng.` })}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'lfMix', title: 'Cơ cấu số hợp đồng khai thác mới theo sản phẩm', sub: '% số hợp đồng mới · cuối năm và kỳ mới nhất', src: srcOf(['Liên kết đầu tư', 'Tử kỳ', 'Hỗn hợp', 'Còn lại'].map(l => ser('LIFE', 'NB_CONTRACTS_MIX', l).filter(x => x[0].endsWith('-12') || x[0] === k))),
      ins: `Tử kỳ chiếm ${pc(at(ser('LIFE', 'NB_CONTRACTS_MIX', 'Tử kỳ'), k), 1)} số hợp đồng mới ${kyShort(k)}. Tử kỳ là sản phẩm bảo vệ, phí thấp, biên lợi nhuận rủi ro cao nhưng ít tích lũy dự phòng, nên quỹ đầu tư của ngành sẽ tăng chậm hơn doanh thu phí trước đây.` })}
    ${card({ id: 'lfInf', title: 'Số hợp đồng có hiệu lực và khai thác mới', sub: 'Triệu hợp đồng · cuối năm và kỳ mới nhất. Từ 2023 số HĐ khai thác mới gồm cả HĐ bán kèm.', src: srcOf(yearEnds(IF), yearEnds(NC), [inf, nc]),
      ins: `Hợp đồng có hiệu lực ${nf(inf[1] / 1e6, 2)} triệu (${kyShort(inf[0])}). Không so thẳng số HĐ khai thác mới qua mốc 2022/2023 vì định nghĩa đổi.` })}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'lfShare', title: 'Thị phần tổng doanh thu phí: 5 doanh nghiệp lớn', sub: '% · cuối năm và kỳ mới nhất', src: srcOf(LIFE_CO.slice(0, 5).map(c => ser('LIFE', 'SHARE_CO', 'Tổng', c).filter(x => x[0].endsWith('-12') || x[0] === last(bvS)[0]))),
      ins: `Bảo Việt Nhân thọ giữ vị trí số 1 với ${pc(last(bvS)[1], 1)} (${kyShort(last(bvS)[0])}), từ đáy 18,6% năm 2022. Thị phần tăng sau 2022 chủ yếu vì các đối thủ dựa vào kênh ngân hàng giảm mạnh hơn, chưa chắc vì tăng trưởng tuyệt đối.` })}
    ${card({ id: 'lfNbShare', title: 'Thị phần khai thác mới', sub: '% phí khai thác mới · kỳ mới nhất so cùng kỳ năm trước', src: srcOf(LIFE_CO.map(c => { const a = ser('LIFE', 'NB_SHARE_CO', 'Tổng', c); return [last(a)]; })),
      ins: `Bảo Việt Nhân thọ chiếm ${pc(last(bvN)[1], 1)} phí khai thác mới ${kyShort(last(bvN)[0])}.`, h: 'tall' })}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'lfLob', title: 'Cơ cấu tổng doanh thu phí theo nghiệp vụ', sub: '% tổng phí · năm theo số chính thức, cột cuối là kỳ mới nhất. Liên kết đầu tư gồm liên kết chung và liên kết đơn vị; còn lại là phần chênh.', src: 'Bộ Tài chính – Niên giám Thị trường bảo hiểm Việt Nam (năm); ' + srcOf(['Liên kết đầu tư', 'Hỗn hợp', 'Bán kèm'].map(l => [last(ser('LIFE', 'MIX_LOB', l))])),
      ins: 'Cơ cấu tổng phí vẫn do hợp đồng cũ quyết định: liên kết đầu tư hơn 70%, nên làn sóng hủy và đáo hạn của nhóm này chi phối chi trả.' })}
    ${card({ title: 'Tỷ lệ hoa hồng: doanh nghiệp nhân thọ lớn', sub: 'Chi hoa hồng bảo hiểm gốc (BCTC, dòng 16.1) chia tổng phí và chia phí khai thác mới. Chưa gồm thưởng, hỗ trợ đại lý và phí độc quyền bancassurance.', body: commTable(),
      src: 'Báo cáo tài chính kiểm toán từng doanh nghiệp; báo chí (số làm tròn, đánh dấu *); phí theo Bộ Tài chính – Niên giám Thị trường bảo hiểm Việt Nam' })}
  </div>
`;
  drawLife(k);
}
function commTable() {
  const cos = [...new Set(I.comm.map(r => r.co))], ys = [2021, 2022, 2023, 2024];
  const cell = (c, y, f) => { const r = I.comm.find(x => x.co === c && x.y === y); if (!r || r[f] == null) return '<span class="muted">—</span>'; return pc(r[f], 1) + (/Báo chí/.test(r.st || '') ? '*' : ''); };
  return `<div class="tscroll"><table class="fz cmpt"><thead><tr><th rowspan="2">Doanh nghiệp</th><th colspan="4" class="n">Hoa hồng / tổng phí</th><th colspan="2" class="n">Hoa hồng / phí KTM</th></tr><tr>${ys.map(y => `<th class="n">${y}</th>`).join('')}<th class="n">2021</th><th class="n">2024</th></tr></thead><tbody>
    ${cos.map(c => `<tr><td>${esc(c)}</td>${ys.map(y => `<td class="n">${cell(c, y, 'r_prem')}</td>`).join('')}<td class="n">${cell(c, 2021, 'r_nb')}</td><td class="n">${cell(c, 2024, 'r_nb')}</td></tr>`).join('')}</tbody></table></div>`;
}
function drawLife(k) {
  const yrs = FYY.map(String);
  mk('lfFY', { type: 'bar', data: { labels: yrs, datasets: [
    bar('Tổng phí', fy('LIFE|PREM|Tổng|Toàn TT'), C.navy, { unit: ' tỷ' }),
    bar('Phí khai thác mới', fy('LIFE|NB_PREM|Tổng|Toàn TT'), C.teal, { unit: ' tỷ' }),
    bar('Chi trả quyền lợi', FYY.map(y => at(ser('LIFE', 'CLAIMS'), y + '-12')), C.purple, { unit: ' tỷ', $src: FYY.map(y => (pt(ser('LIFE', 'CLAIMS'), y + '-12') || [])[3]) }) ] },
    options: { scales: { x: { grid: { display: false } }, y: yNum('tỷ đồng') } } });
  const ks = [...new Set([...ser('LIFE', 'PREM'), ...ser('LIFE', 'NB_PREM')].map(p => p[0]).filter(x => x >= '2023-01'))].sort();
  const yv = (a) => ks.map(x => { const p = pt(a, x); return p && p[2] != null ? p[2] * 100 : null; }), ys = a => ks.map(x => (pt(a, x) || [])[3]);
  mk('lfYtd', { type: 'line', data: { labels: ks.map(kyShort), datasets: [
    line('Tổng phí', yv(ser('LIFE', 'PREM')), C.navy, { $src: ys(ser('LIFE', 'PREM')) }),
    line('Phí khai thác mới', yv(ser('LIFE', 'NB_PREM')), C.teal, { $src: ys(ser('LIFE', 'NB_PREM')) }),
    line('Chi trả quyền lợi', yv(ser('LIFE', 'CLAIMS')), C.purple, { $src: ys(ser('LIFE', 'CLAIMS')) }) ] },
    options: { scales: { x: { grid: { display: false } }, y: yPct('% so cùng kỳ') } } });
  const mixK = (met, lines) => { const all = lines.flatMap(l => ser('LIFE', met, l)); return [...new Set(all.map(p => p[0]).filter(x => (x.endsWith('-12') && x >= '2016') || x === k))].sort(); };
  const stack100 = (id, met, lines, cols) => { const kk = mixK(met, lines); mk(id, { type: 'bar', data: { labels: kk.map(kyShort), datasets: lines.map((l, i) => bar(l, kk.map(x => { const v = at(ser('LIFE', met, l), x); return v == null ? null : v * 100; }), cols[i], { stack: 's', unit: '%', dp: 1, $src: kk.map(x => (pt(ser('LIFE', met, l), x) || [])[3]) })) },
    options: { scales: { x: { stacked: true, grid: { display: false } }, y: yPct('%', { stacked: true, max: 100 }) } } }); };
  stack100('lfMix', 'NB_CONTRACTS_MIX', ['Liên kết đầu tư', 'Tử kỳ', 'Hỗn hợp', 'Còn lại'], [C.navy, C.teal, C.gold, C.grey]);
  {   // cơ cấu tổng phí: năm từ số chính thức (phí theo nghiệp vụ / tổng phí), kỳ mới nhất từ bản tin
    const L = ['Liên kết đầu tư', 'Hỗn hợp', 'Bán kèm'], tot = fy('LIFE|PREM|Tổng|Toàn TT');
    const fyv = l => fy(`LIFE|PREM_LOB|${l}|Toàn TT`);
    const yi = FYY.map((y, i) => i).filter(i => L.every(l => fyv(l)[i] != null) && tot[i]);
    const kL = last(ser('LIFE', 'MIX_LOB', 'Liên kết đầu tư'))[0];
    const labs = yi.map(i => String(FYY[i])).concat([kyShort(kL)]);
    const val = (l, i) => fyv(l)[i] / tot[i] * 100, rest = i => 100 - L.reduce((a, l) => a + val(l, i), 0);
    const lv = l => { const v = at(ser('LIFE', 'MIX_LOB', l), kL); return v == null ? null : v * 100; };
    const lr = 100 - L.reduce((a, l) => a + (lv(l) || 0), 0);
    mk('lfLob', { type: 'bar', data: { labels: labs, datasets: L.map((l, j) => bar(l, yi.map(i => val(l, i)).concat([lv(l)]), [C.navy, C.gold, C.teal][j], { stack: 's', unit: '%', dp: 1, $src: yi.map(() => 'Bộ Tài chính – Niên giám').concat([(pt(ser('LIFE', 'MIX_LOB', l), kL) || [])[3]]) }))
      .concat([bar('Còn lại', yi.map(rest).concat([lr]), C.grey, { stack: 's', unit: '%', dp: 1 })]) },
      options: { scales: { x: { stacked: true, grid: { display: false } }, y: yPct('%', { stacked: true, max: 100 }) } } });
  }
  const IF = ser('LIFE', 'INFORCE_CONTRACTS'), NC = ser('LIFE', 'NB_CONTRACTS');
  const kk = [...new Set([...yearEnds(IF), ...yearEnds(NC)].map(p => p[0]).concat([last(IF)[0]]))].sort();
  mk('lfInf', { type: 'bar', data: { labels: kk.map(kyShort), datasets: [
    bar('HĐ có hiệu lực', kk.map(x => { const v = at(IF, x); return v == null ? null : v / 1e6; }), C.navy, { unit: ' triệu', dp: 2, $src: kk.map(x => (pt(IF, x) || [])[3]) }),
    bar('HĐ khai thác mới', kk.map(x => { const v = at(NC, x); return v == null ? null : v / 1e6; }), C.teal, { unit: ' triệu', dp: 2, $src: kk.map(x => (pt(NC, x) || [])[3]) }) ] },
    options: { scales: { x: { grid: { display: false } }, y: yNum('triệu HĐ', { ticks: { callback: v => nf(v, 0) } }) } } });
  // thị phần tổng phí 5 DN lớn
  const top = LIFE_CO.slice(0, 5), lastK = last(ser('LIFE', 'SHARE_CO', 'Tổng', top[0]))[0];
  const sk = [...new Set(top.flatMap(c => ser('LIFE', 'SHARE_CO', 'Tổng', c)).map(p => p[0]).filter(x => x.endsWith('-12') || x === lastK))].sort();
  mk('lfShare', { type: 'line', data: { labels: sk.map(kyShort), datasets: top.map((c, i) => line(c, sk.map(x => { const v = at(ser('LIFE', 'SHARE_CO', 'Tổng', c), x); return v == null ? null : v * 100; }), C.pal[i], { $src: sk.map(x => (pt(ser('LIFE', 'SHARE_CO', 'Tổng', c), x) || [])[3]) })) },
    options: { scales: { x: { grid: { display: false } }, y: yPct('% tổng phí') } } });
  // thị phần khai thác mới: kỳ mới nhất vs cùng kỳ
  const nbK = last(ser('LIFE', 'NB_SHARE_CO', 'Tổng', 'Bảo Việt Nhân thọ'))[0], nbK0 = `${+nbK.slice(0, 4) - 1}${nbK.slice(4)}`;
  const rows = LIFE_CO.map(c => ({ c, v: at(ser('LIFE', 'NB_SHARE_CO', 'Tổng', c), nbK), v0: at(ser('LIFE', 'NB_SHARE_CO', 'Tổng', c), nbK0), s: (pt(ser('LIFE', 'NB_SHARE_CO', 'Tổng', c), nbK) || [])[3] })).filter(r => r.v != null).sort((a, b) => b.v - a.v);
  mk('lfNbShare', { type: 'bar', data: { labels: rows.map(r => r.c), datasets: [
    bar(kyShort(nbK), rows.map(r => r.v * 100), C.navy, { unit: '%', dp: 1, $src: rows.map(r => r.s) }),
    bar(kyShort(nbK0), rows.map(r => r.v0 == null ? null : r.v0 * 100), C.blue + '55', { unit: '%', dp: 1 }) ] },
    options: { indexAxis: 'y', scales: { x: yPct('%'), y: { grid: { display: false } } } } });
}

/* ---------- BVH ---------- */
function bvhBlock() {
  const B = W.ins.BVH, q = last(B)[0], r = last(B), r0 = rowAt(B, yoyQ(q)), v = W.val.BVH;
  const inv = x => (iv(x, 'bs120') || 0) + (iv(x, 'bs250') || 0);
  const g = ttm(B, q, x => iv(x, 'is01_1')), g0 = ttm(B, yoyQ(q), x => iv(x, 'is01_1'));
  const roe = ttm(B, q, x => iv(x, 'is60')) / avgBal(B, q, x => iv(x, 'bs400'));
  return `<h3 class="sec2">Bảo Việt (BVH) · doanh nghiệp niêm yết dẫn đầu nhân thọ</h3>
  <div class="kpis">
    ${kpi('Phí BH gốc 4 quý', nf(g / 1000, 1) + ' nghìn tỷ', 'YoY ' + sg(g / g0 - 1), cls(g / g0 - 1))}
    ${kpi('Danh mục đầu tư', nf(inv(r) / 1000, 0) + ' nghìn tỷ', 'gấp ' + nf(inv(r) / iv(r, 'bs400'), 1) + ' lần VCSH · ' + qLbl(q))}
    ${kpi('LN tài chính / LNTT', pc(ttm(B, q, x => iv(x, 'is25')) / ttm(B, q, x => iv(x, 'is50')), 0), '4 quý gần nhất')}
    ${kpi('ROE 4 quý', pc(roe, 1), qLbl(q))}
    ${kpi('P/B', nf(v.pb, 2) + 'x', 'P/E ' + nf(v.pe, 1) + 'x · ' + dvn(v.d))}
    ${kpi('LNST ' + qLbl(q), nf(iv(r, 'is60')) + ' tỷ', 'YoY ' + sg(iv(r, 'is60') / iv(r0, 'is60') - 1), cls(iv(r, 'is60') / iv(r0, 'is60') - 1))}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'bvhQ', title: 'BVH: phí gốc, chi bồi thường và lợi nhuận tài chính theo quý', sub: 'Tỷ đồng · chi bồi thường gồm cả tăng dự phòng nghiệp vụ, không phải số tiền đã chi', src: WI + ' (BCTC hợp nhất BVH)',
      ins: 'Ở doanh nghiệp nhân thọ, dự phòng toán học lập từ phí được đem đầu tư, nên nghiệp vụ bảo hiểm sau chi phí lỗ mà đầu tư có lãi là cấu trúc bình thường của hợp đồng. Lợi nhuận đến chủ yếu từ hoạt động tài chính.' })}
    ${card({ title: 'BVH: hủy hợp đồng tăng nhanh hơn doanh thu phí', sub: 'Chi trả bảo hiểm nhân thọ của BVH, tỷ đồng', body: tbl(['Khoản', '2024', '2025', '6T/2025', '6T/2026'], [
        ['Đáo hạn', '2.980', '3.473', '1.577', '1.968'], ['<b>Giá trị hoàn lại (hủy HĐ)</b>', '9.182', '<b>10.534</b>', '4.818', '<b>5.948</b>'], ['Rủi ro và khác', '2.902', '2.811', '1.360', '1.400'], ['<b>Tổng</b>', '15.064', '16.817', '7.755', '9.316']]),
      ins: 'Hủy hợp đồng 6T/2026 tăng 23,5% trong khi phí nhân thọ 6 tháng giảm 3,3% (16.662 → 16.119 tỷ); giá trị hoàn lại so với phí lên 36,9% từ 28,9%. Trích lập dự phòng nghiệp vụ 6 tháng giảm 28%. Hủy muộn thường không gây lỗ kế toán vì giá trị hoàn lại thấp hơn dự phòng đang giữ, nhưng làm co quỹ đầu tư, tức co nền tạo lợi nhuận tương lai.',
      src: 'Báo cáo tài chính Tập đoàn Bảo Việt (BVH), thuyết minh chi bồi thường' })}
  </div>`;
}
function drawBvh() {
  const B = W.ins.BVH.filter(r => r[0] >= '2022Q1');
  const a = k => B.map(r => { const v = iv(r, k); return v == null ? null : Math.abs(v); });
  mk('bvhQ', { type: 'bar', data: { labels: B.map(r => qLbl(r[0])), datasets: [
    bar('Phí BH gốc', a('is01_1'), C.navy, { unit: ' tỷ' }), bar('Chi bồi thường và trả tiền BH', a('is15'), C.purple, { unit: ' tỷ' }),
    line('LN hoạt động tài chính', B.map(r => iv(r, 'is25')), C.teal, { unit: ' tỷ', dp: 0 }), line('LN trước thuế', B.map(r => iv(r, 'is50')), C.gold, { unit: ' tỷ', dp: 0 }) ] },
    options: { scales: { x: { grid: { display: false } }, y: yNum('tỷ đồng') } } });
}
function lawBlock() {
  return `<h3 class="sec2">Khung pháp lý và dự phòng</h3>
  <div class="grid g2 gap">
    ${card({ title: 'Ba đời văn bản và các mốc chuyển tiếp', body: tbl(['Đời', 'Luật', 'Nghị định', 'Thông tư'], [
      ['1', 'Luật 24/2000', 'NĐ 42/2001 → 45/2007 (+123/2011); NĐ 43/2001 → 46/2007', 'TT 155/2007 → 124/2012; TT 156/2007 → 125/2012'],
      ['2', 'Luật 24/2000 (sửa đổi)', 'NĐ 73/2016 (+NĐ 80/2019)', 'TT 50/2017 (+TT 01/2019, TT 89/2020)'],
      ['3', '<b>Luật 08/2022</b> (+Luật 139/2025)', '<b>NĐ 46/2023</b>, NĐ 97/2026', '<b>TT 67/2023</b>, TT 96/2026 (hiệu lực 02/7/2026)']], { num: false }) +
      tbl(['Mốc', 'Nội dung', 'Căn cứ'], [
      ['<b>01/01/2027</b>', 'Các phần về hoa hồng của TT 96/2026 có hiệu lực', 'TT 96/2026'],
      ['<b>31/12/2027</b>', 'Hết áp dụng quy định đầu tư cũ (NĐ 73/2016 Điều 10, 61, 62)', 'NĐ 46/2023 Điều 122 khoản 4 điểm a, sửa bởi NĐ 97/2026 Điều 30'],
      ['<b>01/01/2028</b>', 'Cấm đầu tư một số loại tài sản', 'Luật 08/2022 Điều 99 khoản 3–4'],
      ['<b>31/12/2030</b>', 'Hết áp dụng cách tính biên khả năng thanh toán cũ (NĐ 73 Điều 63–67; TT 50/2017 Điều 20)', 'NĐ 97/2026 Điều 30; TT 96/2026 Điều 21']], { num: false }),
      ins: 'Giới hạn đầu tư hiện hành (NĐ 73/2016 Điều 61–62, đến 31/12/2027): phi nhân thọ tối đa 35% vào cổ phiếu, trái phiếu doanh nghiệp, góp vốn và 10% bất động sản; nhân thọ tối đa 50%, 20% bất động sản, 20% cho vay.',
      src: 'Luật Kinh doanh bảo hiểm 08/2022; Nghị định 46/2023, 97/2026; Thông tư 67/2023, 96/2026 (luatvietnam.vn)' })}
    ${card({ title: 'Dự phòng toán học và lãi suất kỹ thuật', body: `<ul class="ilist">
      <li><b>Sàn dự phòng</b> (TT 67/2023 Điều 38 khoản 2 điểm a): HĐ ≤ 5 năm dùng phí thuần; sinh kỳ, trọn đời, hỗn hợp, trả tiền định kỳ trên 5 năm dùng Zillmer 3% số tiền bảo hiểm; tử kỳ trên 5 năm dùng phí thuần 12 tháng.</li>
      <li><b>Lãi suất kỹ thuật</b> không vượt mức thấp nhất trong: 80% lợi suất bình quân trái phiếu Chính phủ kỳ hạn từ 10 năm trong 24 tháng; lợi suất đầu tư 4 quý của doanh nghiệp; lãi suất tính phí của sản phẩm.</li>
      <li><b>Bảng tử vong</b> tối thiểu 80% CSO 1980 (TT 96/2026 Điều 7).</li>
      <li><b>Lãi suất tính phí của HĐ đã ký không đổi</b>; liên kết chung chỉ có lãi suất cam kết tối thiểu. Ví dụ Bảo Việt Nhân thọ: An Tâm Học Vấn (2021) 5,0% năm đầu giảm về 2,0% từ năm 11; An Khang Như Ý (2025) 2,5% giảm về 0,25% từ năm 16, tức sản phẩm mới giảm mạnh rủi ro lãi suất.</li>
      <li><b>Biên khả năng thanh toán tối thiểu nhân thọ</b> (NĐ 73/2016 Điều 64, còn áp dụng đến 2030): 1,5% dự phòng với liên kết đơn vị; 4% với liên kết chung, hưu trí và sản phẩm khác; cộng 0,1–0,3% số tiền bảo hiểm chịu rủi ro.</li></ul>`,
      ins: 'Lãi suất tăng có lợi cho danh mục hợp đồng truyền thống đã chốt phí nhưng làm tăng động cơ hủy hợp đồng, khớp với giá trị hoàn lại đang tăng ở BVH.',
      src: 'Thông tư 67/2023, 96/2026; Nghị định 73/2016; quy tắc, điều khoản sản phẩm Bảo Việt Nhân thọ' })}
  </div>`;
}

/* =====================================================================
   TAB 3 · BẢO HIỂM PHI NHÂN THỌ (+ môi giới)
===================================================================== */
const NL_CO = ['PVI', 'Bảo hiểm Bảo Việt', 'Bảo Minh', 'BIC', 'MIC', 'PJICO', 'PTI', 'VBI', 'BSH', 'VNI/DBV'];
const NL_LOB = [['Sức khỏe', C.navy], ['Xe cơ giới', C.teal], ['Tài sản và thiệt hại', C.gold], ['Cháy nổ', C.purple], ['Hàng hóa vận chuyển', C.blue], ['Thân tàu và TNDS chủ tàu', C.tealInk]];
const INS_L = ['PVI', 'MIG', 'BMI', 'BIC', 'PTI'];
function insMetrics(sym) {
  const R = W.ins[sym], q = last(R)[0], r = last(R);
  const t = f => ttm(R, q, f), t0 = f => ttm(R, yoyQ(q), f), A = (x, k) => Math.abs(iv(x, k) || 0);
  const gp = t(x => iv(x, 'is01_1')), gp0 = t0(x => iv(x, 'is01_1'));
  const nr = t(x => iv(x, 'isx01')), lr = t(x => A(x, 'is15')) / t(x => iv(x, 'is03'));
  const cr = (t(x => A(x, 'is18')) + t(x => A(x, 'is26')) + t(x => A(x, 'isx27'))) / nr;
  const eq = avgBal(R, q, x => iv(x, 'bs400')), inv = (iv(r, 'bs120') || 0) + (iv(r, 'bs250') || 0);
  return { sym, q, gp, gy: gp / gp0 - 1, re: t(x => iv(x, 'is01_2')) / (gp + t(x => iv(x, 'is01_2'))), lr, cr, fin: t(x => iv(x, 'is25')) / t(x => iv(x, 'is50')), invEq: inv / iv(r, 'bs400'), nrEq: nr / eq, roe: t(x => iv(x, 'is60')) / eq, v: W.val[sym] };
}
function paneNonlife() {
  const P = ser('NONLIFE', 'PREM'), CL = ser('NONLIFE', 'CLAIMS'), LR = ser('NONLIFE', 'LOSS_RATIO'), p = last(P), cl = last(CL), lr = last(LR);
  const AS = last(ser('NONLIFE', 'ASSETS')), IV = last(ser('NONLIFE', 'INVEST')), EQ = last(ser('NONLIFE', 'EQUITY')), RS = last(ser('NONLIFE', 'RESERVES'));
  const ms = INS_L.map(insMetrics);
  const lobK = last(ser('NONLIFE', 'MIX_LOB', 'Sức khỏe'))[0];
  $('#nonlife').innerHTML = `
  <h2 class="sec">Bảo hiểm phi nhân thọ</h2>
  <p class="sec-sub">Doanh thu phí bảo hiểm gốc và bồi thường gốc, lũy kế từ đầu năm, tỷ đồng. Doanh nghiệp niêm yết theo BCTC quý (Wi MCP).</p>
  <div class="kpis">
    ${kpi('Phí gốc ' + kyShort(p[0]), nf(p[1]) + ' tỷ', 'YoY ' + sg(p[2]), cls(p[2]))}
    ${kpi('Bồi thường gốc ' + kyShort(cl[0]), nf(cl[1]) + ' tỷ', cl[2] != null ? 'YoY ' + sg(cl[2]) : '', cls(-(cl[2] || 0)))}
    ${kpi('Tỷ lệ bồi thường gốc', pc(lr[1], 1), kyLbl(lr[0]))}
    ${kpi('Tổng tài sản PNT', nf(AS[1] / 1000, 0) + ' nghìn tỷ', kyShort(AS[0]))}
    ${kpi('Đầu tư trở lại nền KT', nf(IV[1] / 1000, 0) + ' nghìn tỷ', kyShort(IV[0]))}
    ${kpi('Vốn chủ sở hữu PNT', nf(EQ[1] / 1000, 0) + ' nghìn tỷ', kyShort(EQ[0]))}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'nlFY', title: 'Phí gốc và bồi thường gốc theo năm', sub: 'Tỷ đồng · đường: tỷ lệ bồi thường gốc (trục phải). Năm 2025 là số ước.', src: FY_SRC,
      ins: `Phí phi nhân thọ tăng liên tục, ${nf(fy('NONLIFE|PREM|Tổng|Toàn TT')[0])} tỷ năm 2016 lên ${nf(fy('NONLIFE|PREM|Tổng|Toàn TT')[9])} tỷ năm 2025. ${kyLbl(p[0])} tăng ${sg(p[2])}, nhanh nhất trong nhiều năm.` })}
    ${card({ id: 'nlYtd', title: 'Tăng trưởng phí và tỷ lệ bồi thường lũy kế', sub: '% · tăng trưởng phí gốc so cùng kỳ và tỷ lệ bồi thường gốc theo từng kỳ công bố', src: srcOf(P.filter(x => x[0] >= '2023'), LR.filter(x => x[0] >= '2023')),
      ins: `Tỷ lệ bồi thường gốc ${pc(lr[1], 1)} (${kyLbl(lr[0])}).` })}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'nlLob', title: 'Cơ cấu phí theo nghiệp vụ', sub: '% phí gốc · cuối năm và kỳ mới nhất. Từ 2024 Bộ Tài chính tách "Tài sản và thiệt hại" thành Tài sản, Kỹ thuật, Cháy nổ; IAV vẫn dùng "Tài sản và thiệt hại".', src: srcOf(NL_LOB.map(([l]) => ser('NONLIFE', 'MIX_LOB', l).filter(x => x[0].endsWith('-12') || x[0] === lobK))),
      ins: `Sức khỏe ${pc(at(ser('NONLIFE', 'MIX_LOB', 'Sức khỏe'), lobK), 1)} và xe cơ giới ${pc(at(ser('NONLIFE', 'MIX_LOB', 'Xe cơ giới'), lobK), 1)} là hai nghiệp vụ lớn nhất (${kyShort(lobK)}).` })}
    ${card({ id: 'nlLr', title: 'Tỷ lệ bồi thường theo nghiệp vụ', sub: '% · năm 2024 so với năm 2021', src: srcOf(NL_LOB.map(([l]) => [pt(ser('NONLIFE', 'LOSS_RATIO', l), '2024-12'), pt(ser('NONLIFE', 'LOSS_RATIO', l), '2021-12')])),
      ins: 'Sức khỏe và xe cơ giới có tỷ lệ bồi thường cao nhất, nên biên lợi nhuận nghiệp vụ của doanh nghiệp tập trung vào hai mảng này phụ thuộc trước hết vào định phí lại.' })}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'nlShare', title: 'Thị phần phí phi nhân thọ: 10 doanh nghiệp lớn', sub: '% · năm 2024 so với 2020', h: 'tall', src: 'Bộ Tài chính – Niên giám Thị trường bảo hiểm Việt Nam (Phụ lục 3)',
      ins: `PVI dẫn đầu với ${pc(shareFY('NONLIFE', 'PVI', 2024), 1)} năm 2024, vượt Bảo hiểm Bảo Việt từ 2023. PTI giảm từ ${pc(shareFY('NONLIFE', 'PTI', 2020), 1)} năm 2020 xuống ${pc(shareFY('NONLIFE', 'PTI', 2024), 1)}.` })}
    ${card({ title: 'Doanh nghiệp phi nhân thọ niêm yết', sub: `4 quý gần nhất đến quý mới nhất của từng mã. Tỷ lệ kết hợp = (chi trực tiếp kinh doanh bảo hiểm + chi phí bán hàng + quản lý) / doanh thu thuần kinh doanh bảo hiểm.`,
      body: tbl(['Mã', 'Quý', 'Phí gốc 4Q', 'YoY', 'Nhận tái / tổng phí', 'Tỷ lệ bồi thường', 'Tỷ lệ kết hợp', 'DT thuần / VCSH', 'Danh mục / VCSH', 'LN tài chính / LNTT', 'ROE', 'P/B', 'P/E'],
        ms.map(m => [`<b>${m.sym}</b>`, qLbl(m.q), nf(m.gp), `<span class="${cls(m.gy)}">${sg(m.gy)}</span>`, pc(m.re, 0), pc(m.lr, 0), `<span class="${m.cr > 1 ? 'neg' : 'pos'}">${pc(m.cr, 1)}</span>`, nf(m.nrEq, 2) + 'x', nf(m.invEq, 2) + 'x', pc(m.fin, 0), pc(m.roe, 1), nf(m.v.pb, 2) + 'x', nf(m.v.pe, 1) + 'x'])),
      ins: insListIns(ms), src: WI + ' (BCTC hợp nhất, định giá phiên ' + dvn(ms[0].v.d) + ')' })}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'nlCr', title: 'Tỷ lệ kết hợp theo quý của các mã niêm yết', sub: '% · trên 100% là nghiệp vụ bảo hiểm lỗ sau chi phí', src: WI + ' (BCTC hợp nhất)' })}
    ${card({ id: 'nlBroker', title: 'Môi giới bảo hiểm', sub: 'Tỷ đồng · phí bảo hiểm thu xếp qua môi giới (gốc, tái) và hoa hồng môi giới theo năm; năm 2025 là số ước', src: FY_SRC,
      ins: `Phí thu xếp qua môi giới ${nf(fy('BROKER|PREM|Tổng|Toàn TT')[9])} tỷ năm 2025, trong đó phần tái bảo hiểm ${pc(fy('BROKER|PREM|Tái BH|Toàn TT')[9] / fy('BROKER|PREM|Tổng|Toàn TT')[9], 0)}. Hoa hồng môi giới gốc ${nf(fy('BROKER|COMM|Gốc|Toàn TT')[9])} tỷ.` })}
  </div>`;
  drawNonlife(ms, lobK);
}
const shareFY = (seg, co, y) => { const b = I.fydn[seg] && I.fydn[seg].share; if (!b) return null; const r = b.rows.find(x => x.co === co); return r ? r.v[b.years.indexOf(y)] : null; };
function insListIns(ms) {
  const best = ms.slice().sort((a, b) => a.cr - b.cr)[0], hiFin = ms.filter(m => m.fin > 1).map(m => m.sym);
  return `${best.sym} có tỷ lệ kết hợp thấp nhất (${pc(best.cr, 1)}).${hiFin.length ? ` ${hiFin.join(', ')} có lợi nhuận tài chính lớn hơn lợi nhuận trước thuế, tức nghiệp vụ lỗ sau chi phí và đầu tư bù lại.` : ''} PVI nhận tái nhiều nên tỷ lệ bồi thường không so thẳng với doanh nghiệp chỉ bán gốc.`;
}
function drawNonlife(ms, lobK) {
  const yrs = FYY.map(String), Pr = fy('NONLIFE|PREM|Tổng|Toàn TT'), Cl = fy('NONLIFE|CLAIMS|Tổng|Toàn TT');
  mk('nlFY', { type: 'bar', data: { labels: yrs, datasets: [bar('Phí gốc', Pr, C.navy, { unit: ' tỷ' }), bar('Bồi thường gốc', Cl, C.purple, { unit: ' tỷ' }),
    line('Tỷ lệ bồi thường', Pr.map((v, i) => v && Cl[i] ? Cl[i] / v * 100 : null), C.gold, { yAxisID: 'y1' })] },
    options: { scales: { x: { grid: { display: false } }, y: yNum('tỷ đồng'), y1: yPct('', { position: 'right', grid: { display: false } }) } } });
  const P = ser('NONLIFE', 'PREM'), LR = ser('NONLIFE', 'LOSS_RATIO');
  const ks = [...new Set([...P, ...LR].map(p => p[0]).filter(x => x >= '2023-01'))].sort();
  mk('nlYtd', { type: 'line', data: { labels: ks.map(kyShort), datasets: [
    line('Tăng trưởng phí gốc', ks.map(x => { const p = pt(P, x); return p && p[2] != null ? p[2] * 100 : null; }), C.navy, { $src: ks.map(x => (pt(P, x) || [])[3]) }),
    line('Tỷ lệ bồi thường gốc', ks.map(x => { const v = at(LR, x); return v == null ? null : v * 100; }), C.purple, { $src: ks.map(x => (pt(LR, x) || [])[3]) }) ] },
    options: { scales: { x: { grid: { display: false } }, y: yPct('%') } } });
  const kk = [...new Set(NL_LOB.flatMap(([l]) => ser('NONLIFE', 'MIX_LOB', l)).map(p => p[0]).filter(x => (x.endsWith('-12') && x >= '2018') || x === lobK))].sort();
  mk('nlLob', { type: 'bar', data: { labels: kk.map(kyShort), datasets: NL_LOB.map(([l, c]) => bar(l, kk.map(x => { const v = at(ser('NONLIFE', 'MIX_LOB', l), x); return v == null ? null : v * 100; }), c, { stack: 's', unit: '%', dp: 1, $src: kk.map(x => (pt(ser('NONLIFE', 'MIX_LOB', l), x) || [])[3]) })).concat([bar('Khác', kk.map(x => { const t = NL_LOB.reduce((a, [l]) => a + (at(ser('NONLIFE', 'MIX_LOB', l), x) || 0), 0); return t < 1 ? (1 - t) * 100 : null; }), '#d5d9e2', { stack: 's', unit: '%', dp: 1 })]) },
    options: { scales: { x: { stacked: true, grid: { display: false } }, y: yPct('%', { stacked: true, max: 100 }) } } });
  const lr = NL_LOB.map(([l]) => l).concat(['BB TNDS chủ xe cơ giới', 'Xe cơ giới tự nguyện']).filter(l => at(ser('NONLIFE', 'LOSS_RATIO', l), '2024-12') != null);
  mk('nlLr', { type: 'bar', data: { labels: lr, datasets: [
    bar('2024', lr.map(l => at(ser('NONLIFE', 'LOSS_RATIO', l), '2024-12') * 100), C.navy, { unit: '%', dp: 1, $src: lr.map(l => (pt(ser('NONLIFE', 'LOSS_RATIO', l), '2024-12') || [])[3]) }),
    bar('2021', lr.map(l => { const v = at(ser('NONLIFE', 'LOSS_RATIO', l), '2021-12'); return v == null ? null : v * 100; }), C.blue + '55', { unit: '%', dp: 1, $src: lr.map(l => (pt(ser('NONLIFE', 'LOSS_RATIO', l), '2021-12') || [])[3]) }) ] },
    options: { indexAxis: 'y', scales: { x: yPct('%'), y: { grid: { display: false } } } } });
  const sh = NL_CO.map(c => ({ c, v: shareFY('NONLIFE', c, 2024), v0: shareFY('NONLIFE', c, 2020) })).filter(r => r.v != null).sort((a, b) => b.v - a.v);
  mk('nlShare', { type: 'bar', data: { labels: sh.map(r => r.c), datasets: [bar('2024', sh.map(r => r.v * 100), C.navy, { unit: '%', dp: 1 }), bar('2020', sh.map(r => r.v0 == null ? null : r.v0 * 100), C.blue + '55', { unit: '%', dp: 1 })] },
    options: { indexAxis: 'y', scales: { x: yPct('%'), y: { grid: { display: false } } } } });
  const Q = [...new Set(INS_L.flatMap(s => W.ins[s].map(r => r[0])))].filter(q => q >= '2022Q1').sort();
  const crq = (s, q) => { const r = rowAt(W.ins[s], q); if (!r) return null; const n = iv(r, 'isx01'); return n ? (Math.abs(iv(r, 'is18') || 0) + Math.abs(iv(r, 'is26') || 0) + Math.abs(iv(r, 'isx27') || 0)) / n * 100 : null; };
  mk('nlCr', { type: 'line', data: { labels: Q.map(qLbl), datasets: INS_L.map((s, i) => line(s, Q.map(q => crq(s, q)), C.pal[i], { pointRadius: 1.5 })) },
    options: { scales: { x: { grid: { display: false } }, y: yPct('%') }, plugins: {} } });
  mk('nlBroker', { type: 'bar', data: { labels: yrs, datasets: [
    bar('Phí thu xếp: gốc', fy('BROKER|PREM|Gốc|Toàn TT'), C.navy, { stack: 'p', unit: ' tỷ' }), bar('Phí thu xếp: tái BH', fy('BROKER|PREM|Tái BH|Toàn TT'), C.teal, { stack: 'p', unit: ' tỷ' }),
    line('Hoa hồng môi giới (gốc + tái)', FYY.map((y, i) => { const a = fy('BROKER|COMM|Gốc|Toàn TT')[i], b = fy('BROKER|COMM|Tái BH|Toàn TT')[i]; return a != null && b != null ? a + b : null; }), C.purple, { yAxisID: 'y1', unit: ' tỷ', dp: 0 }) ] },
    options: { scales: { x: { stacked: true, grid: { display: false } }, y: yNum('phí thu xếp, tỷ đồng', { stacked: true }), y1: yNum('hoa hồng, tỷ đồng', { position: 'right', grid: { display: false } }) } } });
}

/* =====================================================================
   TAB 4 · CHỨNG KHOÁN
===================================================================== */
const SEC_L = ['SSI', 'TCX', 'VCK', 'VPX', 'HCM', 'VCI', 'MBS', 'VND', 'SHS'];
const debtOf = x => (sv(x, 'bs311') || 0) + (sv(x, 'bs316') || 0) + (sv(x, 'bs346') || 0);
function secMetrics(sym, q) {
  const R = W.sec[sym]; const r = rowAt(R, q); if (!r) return null;
  const t = f => ttm(R, q, f), tS = f => ttm(SECQ, q, f);
  const eq = avgBal(R, q, x => sv(x, 'bs400'));
  const brk = t(x => sv(x, 'is06')), brkC = t(x => sv(x, 'is27'));
  return { sym, q, eq: sv(r, 'bs400'), brkSh: brk / tS(x => sv(x, 'is06')), brkM: brk ? (brk + brkC) / brk : null, loan: sv(r, 'bs114'), loanSh: sv(r, 'bs114') / sv(rowAt(SECQ, q), 'bs114'),
    loanEq: sv(r, 'bs114') / sv(r, 'bs400'), debtEq: debtOf(r) / sv(r, 'bs400'), fvEq: sv(r, 'bs112') / sv(r, 'bs400'), fiEq: ((sv(r, 'bs113') || 0) + (sv(r, 'bs115') || 0)) / sv(r, 'bs400'),
    yld: t(x => sv(x, 'is03')) / avgBal(R, q, x => sv(x, 'bs114')), roe: t(x => sv(x, 'is200')) / eq, v: W.val[sym], lastQ: last(R)[0],
    pbtY: (() => { const a = last(R), b = rowAt(R, yoyQ(a[0])); return b && sv(b, 'is90') > 0 ? sv(a, 'is90') / sv(b, 'is90') - 1 : null; })() };
}
function paneSec() {
  const q = SEC_LASTQ, r = rowAt(SECQ, q), r0 = rowAt(SECQ, yoyQ(q));
  const tS = f => ttm(SECQ, q, f);
  const ms = SEC_L.map(s => secMetrics(s, q)).filter(Boolean);
  const vk = Object.keys(F.vni).sort(), vl = vk[vk.length - 1];
  $('#sec').innerHTML = `
  <h2 class="sec">Chứng khoán</h2>
  <p class="sec-sub">Số tổng hợp các công ty chứng khoán niêm yết (BCTC hợp nhất) và 9 mã lớn, tỷ đồng. Kỳ chung để so sánh: ${qLbl(q)}; quý sau đó chưa đủ công ty báo cáo.</p>
  <div class="kpis">
    ${kpi('VN-Index', nf(F.vni[vl], 0), 'cuối tháng ' + vl.slice(5) + '/' + vl.slice(0, 4))}
    ${kpi('P/B ngành', nf(last(sv408.pb), 2) + 'x', 'P/E ' + nf(last(sv408.pe), 1) + 'x · ' + dvn(last(sv408.d)))}
    ${kpi('Dư nợ cho vay', nf(sv(r, 'bs114') / 1000, 0) + ' nghìn tỷ', 'YoY ' + sg(sv(r, 'bs114') / sv(r0, 'bs114') - 1), cls(sv(r, 'bs114') / sv(r0, 'bs114') - 1))}
    ${kpi('Cho vay / VCSH', pc(sv(r, 'bs114') / sv(r, 'bs400'), 0), 'trần 200% VCSH từng công ty')}
    ${kpi('Nợ vay / VCSH', pc(debtOf(r) / sv(r, 'bs400'), 0), 'cùng kỳ ' + pc(debtOf(r0) / sv(r0, 'bs400'), 0))}
    ${kpi('LNTT 4 quý', nf(tS(x => sv(x, 'is90')) / 1000, 1) + ' nghìn tỷ', 'YoY ' + sg(tS(x => sv(x, 'is90')) / ttm(SECQ, yoyQ(q), x => sv(x, 'is90')) - 1), cls(tS(x => sv(x, 'is90')) / ttm(SECQ, yoyQ(q), x => sv(x, 'is90')) - 1))}
  </div>

  <div class="grid g2 gap">
    ${card({ id: 'scRev', title: 'Doanh thu theo mảng của các CTCK niêm yết', sub: 'Tỷ đồng/quý · lãi FVTPL đã trừ lỗ FVTPL; đường: VN-Index cuối quý (trục phải)', src: WI + ' (BCTC tổng hợp ngành chứng khoán; chỉ số VN-Index)',
      ins: `Lãi cho vay ${qLbl(q)} ${nf(sv(r, 'is03'))} tỷ, môi giới ${nf(sv(r, 'is06'))} tỷ. Cho vay ký quỹ giờ là nguồn thu ổn định và lớn nhất; môi giới bị cạnh tranh phí 0% kéo biên xuống.` })}
    ${card({ id: 'scLev', title: 'Cho vay, nợ vay và danh mục so với vốn chủ', sub: '% VCSH · tổng các CTCK niêm yết', src: WI + ' (BCTC tổng hợp ngành chứng khoán)',
      ins: `Cho vay bằng ${pc(sv(r, 'bs114') / sv(r, 'bs400'), 0)} VCSH, nợ vay ${pc(debtOf(r) / sv(r, 'bs400'), 0)}. Công ty có cho vay từ 170% VCSH thì dư nợ năm sau chỉ tăng theo mức tăng vốn chủ, nên các đợt tăng vốn là tín hiệu mở rộng margin.` })}
  </div>
  <article class="card"><h3 class="sub">So sánh 9 công ty chứng khoán lớn</h3>
    <p class="chart-sub">Thị phần tính trong tổng các CTCK niêm yết, 4 quý đến ${qLbl(q)}. Biên môi giới = (doanh thu − chi phí môi giới) / doanh thu môi giới. Lợi suất cho vay = lãi cho vay và phải thu 4 quý / dư nợ cho vay bình quân. P/B, P/E theo phiên ${dvn(ms[0].v.d)}.</p>
    ${tbl(['Mã', 'P/B', 'P/E', 'VCSH (tỷ)', 'Thị phần DT môi giới', 'Biên môi giới', 'Thị phần cho vay', 'Cho vay / VCSH', 'Lợi suất cho vay', 'Nợ vay / VCSH', 'FVTPL / VCSH', 'HTM+AFS / VCSH', 'ROE 4Q', 'LNTT quý mới nhất YoY'],
      ms.map(m => [`<b>${m.sym}</b>`, nf(m.v.pb, 2) + 'x', nf(m.v.pe, 1) + 'x', nf(m.eq), pc(m.brkSh, 1), pc(m.brkM, 0), pc(m.loanSh, 1), `<span class="${m.loanEq > 1.7 ? 'neg' : ''}">${pc(m.loanEq, 0)}</span>`, pc(m.yld, 1), pc(m.debtEq, 0), pc(m.fvEq, 0), pc(m.fiEq, 0), pc(m.roe, 1), m.pbtY == null ? '—' : `<span class="${cls(m.pbtY)}">${sg(m.pbtY, 0)}</span> <small class="muted">${qLbl(m.lastQ)}</small>`]))}
    <div class="insight">${secInsight(ms)}</div>
    <div class="src">Nguồn: ${WI} (BCTC hợp nhất từng công ty, BCTC tổng hợp ngành, định giá theo phiên)</div></article>
  <div class="grid g2 gap">
    ${card({ id: 'scLoan', title: 'Dư nợ cho vay theo công ty', sub: 'Nghìn tỷ đồng · cuối quý', src: WI + ' (BCTC hợp nhất)' })}
    ${card({ id: 'scSc', title: 'P/B và ROE: 9 công ty chứng khoán', sub: 'P/B theo phiên gần nhất (trục dọc), ROE 4 quý (trục ngang); cỡ điểm theo vốn chủ sở hữu', src: WI })}
  </div>`;
  drawSec(q, ms);
}
function secInsight(ms) {
  const tb = ms.slice().sort((a, b) => b.brkSh - a.brkSh)[0], tl = ms.slice().sort((a, b) => b.loanSh - a.loanSh)[0];
  const hi = ms.filter(m => m.loanEq > 1.7).map(m => m.sym), pbHi = ms.slice().sort((a, b) => b.v.pb - a.v.pb).slice(0, 3).map(m => `${m.sym} ${nf(m.v.pb, 2)}x`);
  return `${tb.sym} dẫn đầu doanh thu môi giới (${pc(tb.brkSh, 1)} nhóm niêm yết), ${tl.sym} dẫn đầu dư nợ cho vay (${pc(tl.loanSh, 1)}). ${hi.length ? `${hi.join(', ')} đã cho vay từ 170% VCSH, gần trần 200%. ` : ''}P/B cao nhất: ${pbHi.join(', ')}.`;
}
function drawSec(q, ms) {
  const R = SECQ.filter(r => r[0] >= '2019Q1');
  const qEnd = q2 => { const y = q2.slice(0, 4), m = String(+q2.slice(5) * 3).padStart(2, '0'); return F.vni[`${y}-${m}`] ?? null; };
  mk('scRev', { type: 'bar', data: { labels: R.map(r => qLbl(r[0])), datasets: [
    bar('Môi giới', R.map(r => sv(r, 'is06')), C.navy, { stack: 's', unit: ' tỷ' }),
    bar('Lãi cho vay và phải thu', R.map(r => sv(r, 'is03')), C.teal, { stack: 's', unit: ' tỷ' }),
    bar('Lãi FVTPL ròng', R.map(r => (sv(r, 'is01') || 0) + (sv(r, 'is21') || 0)), C.gold, { stack: 's', unit: ' tỷ' }),
    bar('HTM + AFS', R.map(r => (sv(r, 'is02') || 0) + (sv(r, 'is04') || 0)), C.grey, { stack: 's', unit: ' tỷ' }),
    bar('Bảo lãnh, tư vấn', R.map(r => (sv(r, 'is07') || 0) + (sv(r, 'is10') || 0)), C.purple, { stack: 's', unit: ' tỷ' }),
    line('VN-Index', R.map(r => qEnd(r[0])), C.red, { yAxisID: 'y1', unit: '', dp: 0, pointRadius: 1.5 }) ] },
    options: { scales: { x: { stacked: true, grid: { display: false } }, y: yNum('tỷ đồng', { stacked: true }), y1: yNum('VN-Index', { position: 'right', grid: { display: false } }) } } });
  const pE = (r, f) => f(r) / sv(r, 'bs400') * 100;
  mk('scLev', { type: 'line', data: { labels: R.map(r => qLbl(r[0])), datasets: [
    line('Cho vay / VCSH', R.map(r => pE(r, x => sv(x, 'bs114'))), C.teal, { dp: 0 }), line('Nợ vay / VCSH', R.map(r => pE(r, debtOf)), C.navy, { dp: 0 }),
    line('FVTPL / VCSH', R.map(r => pE(r, x => sv(x, 'bs112'))), C.gold, { dp: 0 }), line('HTM + AFS / VCSH', R.map(r => pE(r, x => (sv(x, 'bs113') || 0) + (sv(x, 'bs115') || 0))), C.grey, { dp: 0 }) ] },
    options: { scales: { x: { grid: { display: false } }, y: yPct('% VCSH') } } });
  const Q = [...new Set(SEC_L.flatMap(s => W.sec[s].map(r => r[0])))].sort();
  const top = ms.slice().sort((a, b) => b.loan - a.loan).slice(0, 7).map(m => m.sym);
  mk('scLoan', { type: 'line', data: { labels: Q.map(qLbl), datasets: top.map((s, i) => line(s, Q.map(q2 => { const r = rowAt(W.sec[s], q2); return r ? sv(r, 'bs114') / 1000 : null; }), C.pal[i], { unit: ' nghìn tỷ', dp: 1, pointRadius: 1.5 })) },
    options: { scales: { x: { grid: { display: false } }, y: yNum('nghìn tỷ đồng') } } });
  const pts = ms.filter(m => m.v && m.v.pb != null && m.roe != null);
  mk('scSc', { type: 'bubble', data: { datasets: pts.map((m, i) => ({ label: m.sym, data: [{ x: m.roe * 100, y: m.v.pb, r: Math.max(5, Math.sqrt(m.eq) / 10) }], backgroundColor: C.pal[i % 10] + 'cc', borderColor: C.pal[i % 10] })) },
    options: { interaction: { mode: 'nearest', intersect: true }, plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ROE ${nf(c.raw.x, 1)}%, P/B ${nf(c.raw.y, 2)}x` } } },
      scales: { x: yPct('ROE 4 quý'), y: yNum('P/B', { ticks: { callback: v => nf(v, 1) + 'x' } }) } } });
}

function drawMkt() {
  const d = sv408.d, mOf = x => x.slice(0, 7);
  mk('scPb', { type: 'line', data: { labels: d.map(dvn), datasets: [
    line('P/B ngành chứng khoán', sv408.pb, C.navy, { pointRadius: 0, unit: 'x', dp: 2 }),
    line('VN-Index (cuối tháng)', d.map((x, i) => (i === d.length - 1 || mOf(d[i + 1]) !== mOf(x)) ? F.vni[mOf(x)] ?? null : null), C.red, { yAxisID: 'y1', pointRadius: 2, unit: '', dp: 0 }) ] },
    options: { scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: yNum('P/B', { ticks: { callback: v => nf(v, 1) + 'x' } }), y1: yNum('VN-Index', { position: 'right', grid: { display: false } }) } } }, { ts: true });
}

/* =====================================================================
   TAB 5 · PHƯƠNG PHÁP · NGUỒN
===================================================================== */
function paneSrc() {
  if (PAGE === 'ck') { $('#src').innerHTML = `<h2 class="sec">Sources</h2><p class="sec-sub">Nguồn và cách tính các chỉ số trên trang.</p>
  <article class="card"><h3 class="sub">Nguồn và cách tính</h3>
    <ul class="ilist">
      <li><b>BCTC</b>: báo cáo tài chính hợp nhất theo quý của từng công ty và báo cáo tổng hợp ngành chứng khoán, ngành bảo hiểm (${WI}). Số dư cuối quý; doanh thu, lợi nhuận cộng 4 quý gần nhất.</li>
      <li><b>Tỷ lệ kết hợp (phi nhân thọ)</b> = (|tổng chi trực tiếp kinh doanh bảo hiểm| + |chi phí quản lý| + |chi phí bán hàng|) / doanh thu thuần kinh doanh bảo hiểm. Không dùng cho nhân thọ vì chi trực tiếp gồm tăng dự phòng toán học.</li>
      <li><b>Tỷ lệ bồi thường</b> = |tổng chi bồi thường và trả tiền bảo hiểm| / doanh thu phí bảo hiểm thuần; đã gồm thay đổi dự phòng bồi thường.</li>
      <li><b>Nợ vay CTCK</b> = vay và nợ thuê tài chính ngắn hạn + trái phiếu phát hành ngắn hạn, dài hạn.</li>
      <li><b>Định giá</b>: P/B, P/E theo phiên của từng mã và toàn ngành (${WI}).</li></ul></article>`; return; }
  $('#src').innerHTML = `
  <h2 class="sec">Sources</h2>
  <p class="sec-sub">Bộ dữ liệu thị trường bảo hiểm gồm ${nf(I.nRows)} con số tháng/năm 2016–2026 từ ${nf(I.nRel)} bài, bản tin nguồn; mỗi con số giữ nguồn và ngày đăng của nó.</p>
  <div class="grid g2 gap">
    ${card({ title: 'Thứ tự ưu tiên nguồn (bảo hiểm)', body: tbl(['Hạng', 'Nguồn', 'Dùng cho'], [
      ['1', 'Bộ Tài chính – Niên giám Thị trường bảo hiểm Việt Nam', 'Số năm chính thức, doanh thu theo doanh nghiệp (Phụ lục 3)'],
      ['2', 'Bộ Tài chính – Bản tin thị trường bảo hiểm (Cục Quản lý, giám sát bảo hiểm)', 'Số tháng, quý; thị phần; cơ cấu sản phẩm'],
      ['3', 'Hiệp hội Bảo hiểm Việt Nam (IAV)', 'Số tháng của nhân thọ, phi nhân thọ'],
      ['3,5', 'Báo chí dẫn Bộ Tài chính', 'Kỳ không có bản tin gốc'],
      ['4', 'Tổng cục Thống kê (GSO)', 'Ước năm'],
      ['5–6', 'Báo chí khác, doanh nghiệp tự công bố', 'Khi không có nguồn cao hơn']], { num: false }),
      ins: 'Cùng một chỉ tiêu có nhiều số thì lấy nguồn hạng cao hơn, cùng hạng lấy bài đăng mới nhất; các số khác vẫn được lưu để đối chiếu. Số tháng là số ước tại thời điểm công bố; số năm ưu tiên Niên giám.' })}
    ${card({ title: 'Các bẫy dữ liệu cần nhớ', body: tbl(['Bẫy', 'Cách xử lý'], [
      ['IAV và Bộ Tài chính dùng số nền khác nhau (8T/2026: số HĐ mới năm trước hàm ý 1,005 triệu theo IAV, 1.161.502 theo Bộ)', 'Không ghép số năm nay của nguồn này với số năm trước của nguồn kia'],
      ['Số HĐ khai thác mới đến 2022 không gồm HĐ bán kèm, từ 2023 có gồm', 'Không so thẳng qua mốc 2022/2023'],
      ['Bản tin dùng "bồi thường gốc", Niên giám dùng "bồi thường và trả tiền bảo hiểm"', 'Ghi rõ định nghĩa từng chuỗi'],
      ['Liên kết chung, liên kết đơn vị nằm trong liên kết đầu tư', 'Không cộng trùng nhóm con với nhóm cha'],
      ['Kế hoạch năm của Cục lẫn trong bài (vd 151.762 tỷ phí nhân thọ 2026)', 'Không hiển thị như số thực hiện'],
      ['Tổng cơ cấu không bằng 100% khi bài chỉ nêu vài nhóm', 'Phần "Còn lại" là số suy ra']], { num: false }) })}
  </div>
  <div class="grid g2 gap">
    ${card({ title: 'Lịch công bố cần theo dõi', body: tbl(['Nguồn', 'Độ trễ thường gặp'], [
      ['Bản tin Bộ Tài chính', 'Khoảng 45–55 ngày sau kỳ (số 6T/2026 ra ngày 21/8/2026)'], ['IAV', 'Khoảng 35–60 ngày (số 8T/2026 ra ngày 05/10/2026)'],
      ['Niên giám', 'Năm N thường ra trong năm N+1'], ['BCTC công ty niêm yết', 'Quý: 20–30 ngày (hợp nhất 45 ngày); bán niên, năm chậm hơn']], { num: false }) })}
    ${card({ title: 'Câu hỏi còn mở', body: `<ol class="ilist">
      <li>Số HĐ có hiệu lực của Bảo Việt Nhân thọ sau 2017 (hiện là số ước 2,5–2,6 triệu từ thị phần phí).</li>
      <li>Chi giá trị hoàn lại của BVH trước 2024, để biết làn sóng hủy bắt đầu khi nào.</li>
      <li>Lãi suất tính phí thực tế của Bảo Việt Nhân thọ.</li>
      <li>Lợi suất TPCP kỳ hạn từ 10 năm bình quân 24 tháng, để tính trần lãi suất kỹ thuật hiện hành.</li>
      <li>Số tổng toàn thị trường 8T/2026 (tổng phi nhân thọ + nhân thọ đang lệch 369 tỷ so với số tổng công bố).</li>
      <li>Thị phần theo doanh nghiệp 8T/2026 (chờ bản tin Bộ Tài chính).</li></ol>` })}
  </div>
  <article class="card"><h3 class="sub">Bản tin, bài nguồn mới nhất</h3>
    <p class="chart-sub">${I.rel.length} bài gần nhất có số được dùng, trong tổng ${nf(I.nRel)} bài nguồn của bộ dữ liệu bảo hiểm.</p>
    ${tbl(['Ngày đăng', 'Bài / bản tin', 'Loại nguồn', 'Kỳ số liệu', 'Số dòng được dùng'], I.rel.map(r => [dvn(r.d), r.u && /^https?:/.test(r.u) ? `<a href="${esc(r.u)}" target="_blank" rel="noopener">${esc(r.n)}</a>` : esc(r.n), esc(srcType(r.t)), r.from === r.to ? kyLbl(r.from) : kyLbl(r.from) + ' → ' + kyLbl(r.to), nf(r.sel)]), { num: false })}</article>
`;
}
const srcType = t => ({ 'MOF - Niên giám/Báo cáo năm (chính thức)': 'Bộ Tài chính – Niên giám', 'MOF - Bản tin/Tổng quan (Cục QLGSBH)': 'Bộ Tài chính – Bản tin', 'IAV - Hiệp hội Bảo hiểm VN': 'IAV', 'Báo chí dẫn Bộ Tài chính/Cục QLGSBH': 'Báo chí dẫn Bộ Tài chính', 'Báo chí/khác': 'Báo chí', 'DN tự công bố': 'Doanh nghiệp công bố', 'Tổng cục Thống kê (GSO)': 'GSO' }[t] || t || '');

/* =====================================================================
   TỔNG QUAN NGÀNH: yếu tố cấu trúc, ít thay đổi (chuỗi giá trị, cấu trúc, động lực, chu kỳ, khung pháp lý, thuật ngữ)
===================================================================== */
const ovh = (n, t) => `<h3 class="sec2">${n} · ${t}</h3>`;
const goSub = (k, l) => `<button type="button" class="lnk" data-gosub="${k}">${l} →</button>`;
const gloss = items => `<dl class="gloss">${items.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl>`;
const drvTbl = rows => `<div class="tscroll"><table class="fz fdrv"><thead><tr><th>Yếu tố</th><th>Cơ chế</th><th>Tác động lên</th><th>Theo dõi</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table></div>`;
const wireGo = root => $$('[data-gosub]', root).forEach(b => b.onclick = () => { openSub(b.dataset.gosub); window.scrollTo({ top: 0 }); });
const topShare = (seg, y, n) => { const b = I.fydn[seg].share, i = b.years.indexOf(y); return b.rows.map(r => r.v[i]).filter(v => v != null).sort((a, c) => c - a).slice(0, n).reduce((a, v) => a + v, 0); };
const nCo = (seg, y) => { const b = I.fydn[seg].prem, i = b.years.indexOf(y); return b.rows.filter(r => r.v[i]).length; };

function lifeChainCard() {
  const P = ser('LIFE', 'PREM'), NB = ser('LIFE', 'NB_PREM'), CL = ser('LIFE', 'CLAIMS'), IF = ser('LIFE', 'INFORCE_CONTRACTS'), NC = ser('LIFE', 'NB_CONTRACTS');
  const RS = ser('LIFE', 'RESERVES'), AS = ser('LIFE', 'ASSETS'), IV = ser('LIFE', 'INVEST'), EQ = ser('LIFE', 'EQUITY');
  const p = last(P), nb = last(NB), cl = last(CL), inf = last(IF), nc = last(NC), rs = last(RS), as = last(AS), iv = last(IV), eq = last(EQ);
  const k = p[0];
  const cp = cl[0] === k ? cl[1] / p[1] : null, cp0 = (cl[0] === k && p[2] != null && cl[2] != null) ? (cl[1] / (1 + cl[2])) / (p[1] / (1 + p[2])) : null;
  return `  <article class="card"><h3 class="sub">Bảo hiểm nhân thọ</h3>
    <p class="chart-sub">Phí thu vào được trích lập dự phòng và đem đầu tư; phần lớn quay lại khách hàng qua bồi thường, đáo hạn, bảo tức. Số liệu toàn thị trường, kỳ ${kyLbl(k)}.</p>
    ${chain([
      { t: '1 · Đầu vào: bán hàng', d: 'Kênh đại lý, ngân hàng (bancassurance), môi giới; nhượng tái bảo hiểm phần rủi ro lớn.', k: [['Tổng phí', nf(p[1]) + ' tỷ', 'YoY ' + sg(p[2])], ['Phí khai thác mới', nf(nb[1]) + ' tỷ', 'YoY ' + sg(nb[2])], ['HĐ khai thác mới', nf(nc[1]), kyShort(nc[0]) + (nc[2] != null ? ' · YoY ' + sg(nc[2]) : '')], ['HĐ có hiệu lực', nf(inf[1] / 1e6, 2) + ' triệu', kyShort(inf[0])]] },
      { t: '2 · Trích lập và đầu tư', d: 'Dự phòng nghiệp vụ là nợ phải trả với khách hàng; tài sản đầu tư chủ yếu trái phiếu Chính phủ, tiền gửi, trái phiếu ngân hàng.', k: [['Dự phòng nghiệp vụ', nf(rs[1] / 1000, 0) + ' nghìn tỷ', kyShort(rs[0]) + (rs[2] != null ? ' · YoY ' + sg(rs[2]) : '')], ['Tổng tài sản', nf(as[1] / 1000, 0) + ' nghìn tỷ', kyShort(as[0])], ['Dự phòng / tổng tài sản', rs[0] === as[0] ? pc(rs[1] / as[1], 0) : '—', ''], ['Đầu tư trở lại nền KT', nf(iv[1] / 1000, 0) + ' nghìn tỷ', kyShort(iv[0])], ['Vốn chủ sở hữu', nf(eq[1] / 1000, 0) + ' nghìn tỷ', kyShort(eq[0])]] },
      { t: '3 · Đầu ra: chi trả', d: 'Bồi thường, đáo hạn, giá trị hoàn lại khi hủy hợp đồng, bảo tức.', k: [['Chi trả quyền lợi', nf(cl[1]) + ' tỷ', kyShort(cl[0]) + ' · YoY ' + sg(cl[2])], ['Chi trả / phí', cp != null ? pc(cp, 1) : '—', cp0 != null ? 'cùng kỳ ' + pc(cp0, 1) : '']] }])}
    <div class="insight">Chỉ số theo dõi: <b>phí mới / HĐ có hiệu lực</b> (động lực tăng trưởng), <b>dự phòng / tài sản</b> và <b>cơ cấu danh mục × lợi suất</b> (thu nhập đầu tư), <b>chi trả / phí</b> và <b>đáo hạn / phí</b> (áp lực đầu ra). Chi trả / phí cùng kỳ tính từ số tăng trưởng nguồn công bố.</div>
    <div class="src">Nguồn: ${srcOf([p, nb, cl, inf, nc, rs, as, iv, eq])}</div></article>`;
}
function secChainCard() {
  const q = SEC_LASTQ, r = rowAt(SECQ, q), tS = f => ttm(SECQ, q, f);
  return `  <article class="card"><h3 class="sub">Công ty chứng khoán</h3>
    <p class="chart-sub">Vốn chủ và vốn vay được đưa vào bốn mảng; số liệu tổng các công ty niêm yết, ${qLbl(q)} (số dư) và 4 quý gần nhất (doanh thu).</p>
    ${chain([
      { t: '1 · Đầu vào: vốn và khách hàng', d: 'Vốn chủ; vay ngân hàng, phát hành trái phiếu, vay nước ngoài; đội môi giới; nguồn thương vụ.', k: [['Vốn chủ sở hữu', nf(sv(r, 'bs400') / 1000, 0) + ' nghìn tỷ', ''], ['Vay và trái phiếu phát hành', nf(debtOf(r) / 1000, 0) + ' nghìn tỷ', pc(debtOf(r) / sv(r, 'bs400'), 0) + ' VCSH'], ['Tổng tài sản', nf(sv(r, 'bs270') / 1000, 0) + ' nghìn tỷ', '']] },
      { t: '2 · Hoạt động', d: 'Môi giới; cho vay ký quỹ và ứng trước; tự doanh (FVTPL, AFS, HTM); ngân hàng đầu tư (bảo lãnh, tư vấn).', k: [['Cho vay', nf(sv(r, 'bs114') / 1000, 0) + ' nghìn tỷ', pc(sv(r, 'bs114') / sv(r, 'bs400'), 0) + ' VCSH'], ['FVTPL', nf(sv(r, 'bs112') / 1000, 0) + ' nghìn tỷ', pc(sv(r, 'bs112') / sv(r, 'bs400'), 0) + ' VCSH'], ['HTM + AFS', nf(((sv(r, 'bs113') || 0) + (sv(r, 'bs115') || 0)) / 1000, 0) + ' nghìn tỷ', 'thu nhập cố định là chính']] },
      { t: '3 · Đầu ra: doanh thu 4 quý', d: 'Phí môi giới, lãi cho vay, lãi lỗ danh mục, phí ngân hàng đầu tư.', k: [['Môi giới', nf(tS(x => sv(x, 'is06'))) + ' tỷ', ''], ['Lãi cho vay và phải thu', nf(tS(x => sv(x, 'is03'))) + ' tỷ', ''], ['Lãi FVTPL ròng', nf(tS(x => (sv(x, 'is01') || 0) + (sv(x, 'is21') || 0))) + ' tỷ', 'đã trừ lỗ FVTPL'], ['Bảo lãnh và tư vấn', nf(tS(x => (sv(x, 'is07') || 0) + (sv(x, 'is10') || 0))) + ' tỷ', '']] }])}
    <div class="insight"><b>Mô hình dự phóng:</b> doanh thu môi giới = giá trị giao dịch thị trường × thị phần × phí bình quân; lãi cho vay = dư nợ thị trường × thị phần × lợi suất, giới hạn bởi trần cho vay 200% VCSH và cơ cấu nguồn vốn; danh mục tách thu nhập cố định khỏi cổ phiếu, phần cổ phiếu định giá lại theo ROE kỳ vọng, chỉ số và margin, từng mã hoặc đồng thuận. Thứ tự đánh giá một mã: P/B so đồng thuận, rồi thị phần môi giới và hiệu quả phí, thị phần margin và NIM, thương vụ IB, danh mục tự doanh.</div></article>`;
}
function paneOvBH() {
  const y = 2024, gi = FYY.indexOf(y), last9 = FYY.length - 1;
  $('#ov').innerHTML = `<h2 class="sec">Tổng quan ngành Bảo hiểm Việt Nam</h2>
  <p class="sec-sub">Những đặc điểm cấu trúc của ngành, thay đổi chậm: vai trò trong nền kinh tế, chuỗi giá trị, cấu trúc thị trường, các yếu tố tác động, chu kỳ và khung pháp lý. Số liệu diễn biến xem ở tab Bức tranh ngành.</p>
  ${ovh(1, 'Bảo hiểm trong nền kinh tế')}
  <div class="kpis">
    ${kpi('Phí bảo hiểm / GDP', pc(fy('TOTAL|PREM_GDP|Tổng|Toàn TT')[gi], 2), 'năm ' + y + ' · đỉnh ' + pc(Math.max(...fy('TOTAL|PREM_GDP|Tổng|Toàn TT').filter(v => v)), 2) + ' năm 2021')}
    ${kpi('Phí bình quân đầu người', nf(fy('TOTAL|PREM_PER_CAPITA|Tổng|Toàn TT')[gi] / 1000, 2) + ' triệu đồng', 'năm ' + y)}
    ${kpi('Tổng tài sản', nf(fy('TOTAL|ASSETS|Tổng|Toàn TT')[last9] / 1000, 0) + ' nghìn tỷ', 'năm ' + FYY[last9] + ' (ước)')}
    ${kpi('Đầu tư trở lại nền KT', nf(fy('TOTAL|INVEST|Tổng|Toàn TT')[last9] / 1000, 0) + ' nghìn tỷ', 'năm ' + FYY[last9] + ' (ước)')}
    ${kpi('Số doanh nghiệp', nCo('LIFE', y) + ' NT · ' + nCo('NONLIFE', y) + ' PNT', 'có doanh thu năm ' + y)}
    ${kpi('Đại lý và lao động', nf(fy('TOTAL|AGENTS|Tổng|Toàn TT')[gi] / 1000, 0) + ' nghìn người', 'năm ' + y)}
  </div>
  <div class="grid g2 gap">
    ${card({ title: 'Vai trò của ngành', body: `<ul class="ilist">
      <li><b>Chuyển giao rủi ro:</b> doanh nghiệp, hộ gia đình trả phí để chuyển rủi ro tài sản, sức khỏe, tính mạng sang doanh nghiệp bảo hiểm; doanh nghiệp bảo hiểm chia bớt rủi ro lớn qua tái bảo hiểm.</li>
      <li><b>Huy động vốn dài hạn:</b> phí nhân thọ được trích dự phòng và đầu tư nhiều năm, chủ yếu vào trái phiếu Chính phủ và tiền gửi; ngành bảo hiểm là một trong những nhà đầu tư lớn nhất của trái phiếu Chính phủ kỳ hạn dài.</li>
      <li><b>Mức độ thâm nhập còn thấp:</b> phí bảo hiểm khoảng ${pc(fy('TOTAL|PREM_GDP|Tổng|Toàn TT')[gi], 1)} GDP; dư địa tăng trưởng dài hạn đến từ thu nhập tăng, già hóa dân số và nhu cầu bảo vệ sức khỏe.</li></ul>` })}
    ${card({ id: 'ovPen', title: 'Mức độ thâm nhập bảo hiểm', sub: 'Cột: phí bình quân đầu người (triệu đồng); đường: phí so với GDP (trục phải)', src: 'Bộ Tài chính – Niên giám Thị trường bảo hiểm Việt Nam',
      ins: `Phí/GDP tăng liên tục tới 2021 nhờ nhân thọ bán qua ngân hàng, rồi giảm từ 2022 khi phí nhân thọ đi xuống trong lúc GDP vẫn tăng.` })}
  </div>
  ${ovh(2, 'Chuỗi giá trị')}
  ${lifeChainCard()}
  <article class="card"><h3 class="sub">Bảo hiểm phi nhân thọ</h3>
    <p class="chart-sub">Hợp đồng ngắn hạn (thường một năm): lợi nhuận = biên nghiệp vụ (100% − tỷ lệ kết hợp) + lợi suất danh mục × quy mô danh mục.</p>
    ${chain([
      { t: '1 · Doanh thu', d: 'Phí gốc, nhận tái; trừ phí nhượng tái và hoàn phí.', k: [['Doanh thu thuần + nhận tái / VCSH', 'tốc độ quay vốn của nghiệp vụ', ''], ['Phí nhận tái / tổng phí', 'trên 10% thì không so được bồi thường với DN chỉ bán gốc', '']] },
      { t: '2 · Chi phí nghiệp vụ', d: 'Bồi thường + chi phí khai thác, quản lý.', k: [['Tỷ lệ bồi thường', 'bồi thường / phí thuần', ''], ['Tỷ lệ chi phí', 'chi phí khai thác, quản lý / doanh thu thuần', ''], ['Tỷ lệ kết hợp', 'bồi thường + chi phí; dưới 100% là nghiệp vụ có lãi', '']] },
      { t: '3 · Đầu tư', d: 'Tiền gửi, trái phiếu, cổ phiếu; lãi tiền gửi thường là phần lớn.', k: [['Danh mục / VCSH', 'quy mô vốn đem đầu tư', ''], ['Lợi suất danh mục', 'lãi suất huy động, lợi suất TPCP, TPDN', ''], ['LN tài chính / LNTT', 'trên 100% là nghiệp vụ lỗ, đầu tư bù', '']] }])}</article>
  ${ovh(3, 'Cấu trúc ngành')}
  <div class="grid g2 gap">
    ${card({ title: 'Mức tập trung, sở hữu và kênh phân phối', body: `<ul class="ilist">
      <li><b>Nhân thọ tập trung cao:</b> ${nCo('LIFE', y)} doanh nghiệp, 5 doanh nghiệp lớn nhất chiếm ${pc(topShare('LIFE', y, 5), 0)} doanh thu phí năm ${y}. Phần lớn là doanh nghiệp vốn nước ngoài (Manulife, Prudential, Dai-ichi, AIA…); Bảo Việt Nhân thọ là doanh nghiệp trong nước duy nhất trong top 5.</li>
      <li><b>Phi nhân thọ phân tán hơn:</b> ${nCo('NONLIFE', y)} doanh nghiệp, top 5 chiếm ${pc(topShare('NONLIFE', y, 5), 0)}. Ba nhóm chính: doanh nghiệp có vốn nhà nước (Bảo Việt, PVI, PTI, Bảo Minh, PJICO), doanh nghiệp thuộc ngân hàng (MIC, BIC, VBI, ABIC, BSH) dựa vào khách hàng của ngân hàng mẹ, và doanh nghiệp vốn nước ngoài.</li>
      <li><b>Kênh phân phối nhân thọ:</b> đại lý hơn 50% phí khai thác mới, ngân hàng gần 45%, kênh khác khoảng 4% (8T/2026). Kênh ngân hàng tăng nhanh 2016–2022 và chịu siết mạnh từ 2023.</li></ul>`,
      src: 'Bộ Tài chính – Niên giám Thị trường bảo hiểm Việt Nam (Phụ lục 3); Hiệp hội Bảo hiểm Việt Nam (IAV)' })}
    ${card({ id: 'ovShareBH', title: `Thị phần doanh thu phí năm ${y}`, sub: '% · 6 doanh nghiệp lớn nhất của mỗi mảng', h: 'tall', src: 'Bộ Tài chính – Niên giám Thị trường bảo hiểm Việt Nam (Phụ lục 3)' })}
  </div>
  ${ovh(4, 'Các yếu tố tác động')}
  <article class="card">${drvTbl([
    ['Lãi suất huy động, lợi suất TPCP', 'Danh mục chủ yếu là tiền gửi và trái phiếu nên thu nhập đầu tư đi theo lãi suất (có độ trễ vì tiền gửi, trái phiếu đáo hạn dần). Lãi suất cao cũng làm hợp đồng tiết kiệm của bảo hiểm kém hấp dẫn hơn tiền gửi, khách dễ hủy.', 'Thu nhập đầu tư, tỷ lệ hủy hợp đồng', goSub('peerbh', 'So sánh doanh nghiệp')],
    ['Thu nhập và niềm tin của người dân', 'Nhân thọ là sản phẩm dài hạn, quyết định mua phụ thuộc thu nhập và niềm tin; khủng hoảng niềm tin năm 2023 làm phí khai thác mới giảm gần một nửa.', 'Phí khai thác mới nhân thọ', goSub('life', 'Nhân thọ')],
    ['Quy định bán hàng qua ngân hàng', 'Luật Kinh doanh bảo hiểm 2022, Thông tư 67/2023 và Luật Các tổ chức tín dụng 2024 siết bán bảo hiểm qua ngân hàng, cấm ràng buộc mua bảo hiểm với khoản vay.', 'Kênh bancassurance, cơ cấu sản phẩm', goSub('life', 'Nhân thọ')],
    ['Tín dụng, doanh số ô tô', 'Xe cơ giới là nghiệp vụ phi nhân thọ lớn thứ hai; doanh số xe mới và tín dụng mua xe quyết định phí bảo hiểm xe.', 'Phí và bồi thường xe cơ giới', goSub('nonlife', 'Phi nhân thọ')],
    ['Đầu tư, xây dựng, xuất nhập khẩu', 'Dự án và hàng hóa cần bảo hiểm tài sản, kỹ thuật, cháy nổ, hàng hóa vận chuyển.', 'Phí tài sản, kỹ thuật, hàng hóa', goSub('nonlife', 'Phi nhân thọ')],
    ['Chi phí y tế', 'Sức khỏe là nghiệp vụ phi nhân thọ lớn nhất; chi phí khám chữa bệnh tăng làm tỷ lệ bồi thường tăng nếu không định phí lại.', 'Tỷ lệ bồi thường sức khỏe', goSub('nonlife', 'Phi nhân thọ')],
    ['Thiên tai, tổn thất lớn', 'Bão, lũ, cháy nổ lớn làm bồi thường tài sản tăng đột biến; phần lớn được tái bảo hiểm nên phần doanh nghiệp giữ lại nhỏ hơn.', 'Bồi thường, lợi nhuận phi nhân thọ', goSub('nonlife', 'Phi nhân thọ')],
    ['Thị trường chứng khoán', 'Một phần danh mục là cổ phiếu, chứng chỉ quỹ; giá cổ phiếu ảnh hưởng lãi đầu tư và định giá cổ phiếu bảo hiểm.', 'Lãi đầu tư, P/B', goSub('whole', 'Toàn cảnh')]])}</article>
  ${ovh(5, 'Chu kỳ ngành')}
  <div class="grid g2 gap">
    ${card({ id: 'ovCyc', title: 'Tăng trưởng phí theo năm: nhân thọ và phi nhân thọ', sub: '% so với năm trước · số chính thức, năm 2025 là số ước', src: FY_SRC })}
    ${card({ title: 'Các giai đoạn của ngành', body: `<ul class="ilist">
      <li><b>2016–2021 · Bùng nổ nhân thọ:</b> phí nhân thọ tăng 20–30% mỗi năm nhờ sản phẩm liên kết đầu tư và kênh ngân hàng; phí/GDP lên gần 4%.</li>
      <li><b>2022 · Đỉnh:</b> phí nhân thọ ${nf(fy('LIFE|PREM|Tổng|Toàn TT')[6])} tỷ, phí khai thác mới ${nf(fy('LIFE|NB_PREM|Tổng|Toàn TT')[6])} tỷ.</li>
      <li><b>2023–nay · Điều chỉnh:</b> khủng hoảng niềm tin với sản phẩm liên kết đầu tư bán qua ngân hàng; luật mới siết bán hàng; phí khai thác mới giảm còn khoảng một nửa, hủy hợp đồng và đáo hạn tăng.</li>
      <li><b>Phi nhân thọ đi theo chu kỳ kinh tế:</b> chậm lại năm 2020–2021 (dịch bệnh), tăng nhanh trở lại từ 2022 cùng tín dụng, đầu tư và nhu cầu sức khỏe.</li></ul>` })}
  </div>
  ${ovh(6, 'Khung pháp lý chủ chốt: các tỷ lệ an toàn')}
  <article class="card">${tbl(['Quy định', 'Nhân thọ', 'Phi nhân thọ', 'Căn cứ'], [
    ['<b>Biên khả năng thanh toán tối thiểu</b>', '4% dự phòng nghiệp vụ (1,5% với liên kết đơn vị) + 0,1–0,3% số tiền bảo hiểm chịu rủi ro', 'Mức lớn hơn của 25% phí giữ lại và 12,5% phí gốc cộng phí nhận tái', 'NĐ 73/2016 (áp dụng đến 31/12/2030)'],
    ['<b>Giới hạn đầu tư</b>', 'Tối đa 50% vào cổ phiếu, trái phiếu doanh nghiệp, góp vốn; 20% bất động sản; 20% cho vay', 'Tối đa 35% vào cổ phiếu, trái phiếu doanh nghiệp, góp vốn; 10% bất động sản', 'NĐ 73/2016 Điều 61–62 (đến 31/12/2027)'],
    ['<b>Dự phòng toán học</b>', 'Sàn: Zillmer 3% với hợp đồng trên 5 năm; lãi suất kỹ thuật không vượt 80% lợi suất bình quân 24 tháng của TPCP từ 10Y', '—', 'TT 67/2023 Điều 38'],
    ['<b>Bảng tử vong</b>', 'Tối thiểu 80% CSO 1980', '—', 'TT 96/2026 Điều 7']], { num: false })}
    <div class="insight">Lộ trình chuyển sang khung mới và các mốc hiệu lực xem ở tab Chính sách · Quy định.</div>
    <div class="src">Nguồn: Nghị định 73/2016, 46/2023, 97/2026; Thông tư 67/2023, 96/2026</div></article>
  ${ovh(7, 'Thuật ngữ và chỉ số cần biết')}
  <article class="card">${gloss([
    ['Phí khai thác mới (KTM)', 'Phí năm đầu của hợp đồng mới ký trong kỳ; chỉ báo sớm nhất về tăng trưởng nhân thọ.'],
    ['Hợp đồng có hiệu lực', 'Hợp đồng còn đóng phí, chưa đáo hạn hay hủy; nền tạo phí tái tục những năm sau.'],
    ['Liên kết đầu tư', 'Gồm liên kết chung (lãi suất cam kết tối thiểu, doanh nghiệp chịu rủi ro lãi suất) và liên kết đơn vị (khách chịu rủi ro đầu tư).'],
    ['Tử kỳ, hỗn hợp, bán kèm', 'Tử kỳ: chỉ bảo vệ, phí thấp; hỗn hợp: bảo vệ + tiết kiệm, có đáo hạn; bán kèm: sản phẩm bổ trợ gắn hợp đồng chính.'],
    ['Phí gốc, nhận tái, nhượng tái', 'Phí thu từ khách; phí nhận từ doanh nghiệp bảo hiểm khác; phí chuyển cho nhà tái bảo hiểm.'],
    ['Tỷ lệ bồi thường', 'Bồi thường / phí thuần. Ở nhân thọ chi bồi thường gồm cả tăng dự phòng nên không đo trực tiếp lãi lỗ nghiệp vụ.'],
    ['Tỷ lệ kết hợp', 'Tỷ lệ bồi thường + tỷ lệ chi phí; dưới 100% là nghiệp vụ phi nhân thọ có lãi trước thu nhập đầu tư.'],
    ['Dự phòng toán học', 'Khoản doanh nghiệp nhân thọ phải giữ cho nghĩa vụ tương lai; tích lũy từ phần phí thừa những năm đầu cộng lãi.'],
    ['Giá trị hoàn lại', 'Tiền trả khách khi hủy hợp đồng trước hạn; hủy sớm gây lỗ cho doanh nghiệp, hủy muộn làm co quỹ đầu tư.'],
    ['Biên khả năng thanh toán', 'Vốn tự có vượt nghĩa vụ; phải cao hơn mức tối thiểu theo quy định.'],
    ['Bancassurance', 'Bán bảo hiểm qua ngân hàng; ngân hàng nhận phí hoa hồng và phí độc quyền phân phối.'],
    ['Lãi suất kỹ thuật', 'Lãi suất dùng để tính dự phòng; càng thấp thì dự phòng phải giữ càng lớn.']])}</article>`;
  const pg = fy('TOTAL|PREM_GDP|Tổng|Toàn TT'), pcp = fy('TOTAL|PREM_PER_CAPITA|Tổng|Toàn TT'), ix = FYY.map((y2, i) => i).filter(i => pg[i] != null);
  mk('ovPen', { type: 'bar', data: { labels: ix.map(i => String(FYY[i])), datasets: [bar('Phí bình quân đầu người', ix.map(i => pcp[i] / 1000), C.navy, { unit: ' triệu đồng', dp: 2 }), line('Phí / GDP', ix.map(i => pg[i] * 100), C.purple, { yAxisID: 'y1', dp: 2 })] },
    options: { scales: { x: { grid: { display: false } }, y: yNum('triệu đồng', { ticks: { callback: v => nf(v, 1) } }), y1: yPct('', { position: 'right', grid: { display: false }, ticks: { callback: v => nf(v, 1) + '%' } }) } } });
  const sh = seg => { const b = I.fydn[seg].share, i = b.years.indexOf(y); return b.rows.map(r => ({ c: r.co, v: r.v[i] })).filter(r => r.v != null).sort((a, c) => c.v - a.v).slice(0, 6); };
  const L1 = sh('LIFE'), N1 = sh('NONLIFE');
  mk('ovShareBH', { type: 'bar', data: { labels: [...L1.map(r => 'NT · ' + r.c), ...N1.map(r => 'PNT · ' + r.c)], datasets: [bar('Thị phần', [...L1, ...N1].map(r => r.v * 100), [...L1.map(() => C.navy), ...N1.map(() => C.teal)], { unit: '%', dp: 1 })] },
    options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: yPct('%'), y: { grid: { display: false } } } } });
  const g = k => fy(k).map((v, i, a) => i && v && a[i - 1] ? (v / a[i - 1] - 1) * 100 : null);
  mk('ovCyc', { type: 'bar', data: { labels: FYY.slice(1).map(String), datasets: [bar('Nhân thọ', g('LIFE|PREM|Tổng|Toàn TT').slice(1), C.navy, { unit: '%', dp: 1 }), bar('Phi nhân thọ', g('NONLIFE|PREM|Tổng|Toàn TT').slice(1), C.teal, { unit: '%', dp: 1 }), line('Khai thác mới nhân thọ', g('LIFE|NB_PREM|Tổng|Toàn TT').slice(1), C.purple, { dp: 1 })] },
    options: { scales: { x: { grid: { display: false } }, y: yPct('% so năm trước') } } });
  wireGo($('#ov'));
}

function paneOvCK() {
  const q = SEC_LASTQ, r = rowAt(SECQ, q), ms = SEC_L.map(s => secMetrics(s, q)).filter(Boolean), vk = Object.keys(F.vni).sort();
  const tS = f => ttm(SECQ, q, f), top = (k) => ms.reduce((a, m) => a + (m[k] || 0), 0);
  $('#ov').innerHTML = `<h2 class="sec">Tổng quan ngành Chứng khoán Việt Nam</h2>
  <p class="sec-sub">Những đặc điểm cấu trúc của ngành, thay đổi chậm: vai trò, chuỗi giá trị, cấu trúc cạnh tranh, các yếu tố tác động, chu kỳ và khung pháp lý. Số liệu diễn biến xem ở tab Bức tranh ngành.</p>
  ${ovh(1, 'Công ty chứng khoán trong thị trường vốn')}
  <div class="grid g2 gap">
    ${card({ title: 'Vai trò của ngành', body: `<ul class="ilist">
      <li><b>Trung gian của thị trường vốn:</b> công ty chứng khoán môi giới giao dịch, cho nhà đầu tư vay ký quỹ, tư vấn và bảo lãnh phát hành cổ phiếu, trái phiếu, và tự đầu tư bằng vốn của mình.</li>
      <li><b>Doanh thu đi theo thị trường:</b> cả bốn mảng (môi giới, cho vay ký quỹ, tự doanh, ngân hàng đầu tư) đều tăng giảm theo thanh khoản và điểm số, nên cổ phiếu chứng khoán là nhóm có beta cao nhất.</li>
      <li><b>Bảng cân đối như một tổ chức tín dụng nhỏ:</b> cho vay ký quỹ chiếm phần lớn tài sản, tài trợ bằng vay ngân hàng và trái phiếu; đòn bẩy bị giới hạn bởi trần cho vay 200% vốn chủ và tỷ lệ vốn khả dụng.</li>
      <li><b>Nâng hạng thị trường:</b> FTSE Russell đưa Việt Nam lên thị trường mới nổi thứ cấp từ 21/9/2026, giải ngân tỷ trọng tới 09/2027.</li></ul>` })}
    ${card({ id: 'ovVni', title: 'VN-Index dài hạn', sub: 'Điểm, cuối tháng', src: WI + ' (VN-Index)' })}
  </div>
  ${ovh(2, 'Chuỗi giá trị')}
  ${secChainCard()}
  ${ovh(3, 'Cấu trúc ngành')}
  <div class="grid g2 gap">
    ${card({ title: 'Mô hình và mức tập trung', body: `<ul class="ilist">
      <li><b>Tập trung cao:</b> 9 công ty lớn chiếm ${pc(top('brkSh'), 0)} doanh thu môi giới và ${pc(top('loanSh'), 0)} dư nợ cho vay của nhóm niêm yết (4 quý đến ${qLbl(q)}).</li>
      <li><b>CTCK thuộc ngân hàng:</b> TCX (Techcombank), VPX (VPBank), MBS (MB) có lợi thế khách hàng và nguồn vốn từ ngân hàng mẹ, mạnh ở trái phiếu và ngân hàng đầu tư.</li>
      <li><b>CTCK độc lập, theo tập đoàn:</b> SSI, VCI, HCM, VND, VCK (VPS), SHS cạnh tranh bằng nền tảng môi giới, nhóm khách tổ chức nước ngoài hoặc khách cá nhân quy mô lớn.</li>
      <li><b>Cạnh tranh phí:</b> phí môi giới cá nhân về gần 0% ở nhiều công ty; lợi nhuận chuyển sang cho vay ký quỹ và danh mục.</li></ul>`, src: WI + ' (BCTC hợp nhất, BCTC tổng hợp ngành)' })}
    ${card({ id: 'ovStrCK', title: 'Thị phần trong nhóm niêm yết', sub: `% · doanh thu môi giới và dư nợ cho vay, 4 quý đến ${qLbl(q)}`, h: 'tall', src: WI })}
  </div>
  ${ovh(4, 'Các yếu tố tác động')}
  <article class="card">${drvTbl([
    ['Thanh khoản thị trường', 'Giá trị giao dịch quyết định doanh thu môi giới và nhu cầu vay ký quỹ.', 'Môi giới, cho vay ký quỹ', goSub('mkt', 'Thị trường')],
    ['Lãi suất, thanh khoản ngân hàng', 'CTCK vay ngân hàng và phát hành trái phiếu để cho vay ký quỹ, nắm giữ trái phiếu; lãi suất tăng làm chi phí vốn và áp lực lên danh mục tăng.', 'NIM mảng cho vay, lãi danh mục', goSub('sec', 'Ngành CTCK')],
    ['Dòng vốn nước ngoài, nâng hạng', 'Nâng hạng FTSE, cơ chế không cần đủ tiền khi đặt lệnh (non pre-funding) thu hút quỹ ngoại, tăng giao dịch tổ chức.', 'Môi giới khách tổ chức, ngân hàng đầu tư', goSub('mkt', 'Thị trường')],
    ['Giá cổ phiếu, trái phiếu', 'Danh mục tự doanh đánh giá lại theo giá cuối kỳ (FVTPL); thị trường giảm mạnh thì dễ phát sinh lỗ và giải chấp ký quỹ.', 'Lãi lỗ tự doanh, dự phòng cho vay', goSub('sec', 'Ngành CTCK')],
    ['Quy định cho vay ký quỹ, vốn', 'Trần 200% vốn chủ, tỷ lệ vốn khả dụng; muốn mở rộng margin phải tăng vốn.', 'Tăng trưởng dư nợ, phát hành, ROE', goSub('sec', 'Ngành CTCK')],
    ['IPO, phát hành trái phiếu', 'Số thương vụ IPO, phát hành tăng khi thị trường thuận lợi và thủ tục rút ngắn (NĐ 245/2025).', 'Doanh thu ngân hàng đầu tư', goSub('sec', 'Ngành CTCK')]])}</article>
  ${ovh(5, 'Chu kỳ ngành')}
  <div class="grid g2 gap">
    ${card({ id: 'ovCycCK', title: 'Lợi nhuận trước thuế ngành và VN-Index', sub: 'Cột: LNTT các CTCK niêm yết theo quý (tỷ đồng); đường: VN-Index cuối quý (trục phải)', src: WI })}
    ${card({ title: 'Các giai đoạn của ngành', body: `<ul class="ilist">
      <li><b>2018–2019:</b> VN-Index lập đỉnh đầu 2018 rồi đi ngang; lợi nhuận ngành ổn định, thấp.</li>
      <li><b>2020–2021 · Bùng nổ:</b> lãi suất thấp, hàng triệu tài khoản cá nhân mới; thanh khoản và dư nợ ký quỹ tăng vọt, lợi nhuận ngành cao nhất lịch sử.</li>
      <li><b>2022 · Điều chỉnh:</b> lãi suất tăng, khủng hoảng trái phiếu doanh nghiệp, giải chấp ký quỹ; lỗ tự doanh.</li>
      <li><b>2023–nay · Phục hồi và mở rộng vốn:</b> CTCK tăng vốn, niêm yết các công ty lớn (TCX, VCK, VPX); dư nợ cho vay vượt đỉnh cũ; nâng hạng FTSE từ 09/2026.</li></ul>` })}
  </div>
  ${ovh(6, 'Khung pháp lý chủ chốt')}
  <article class="card">${tbl(['Quy định', 'Nội dung', 'Căn cứ'], [
    ['<b>Vốn điều lệ tối thiểu</b>', 'Môi giới 25 tỷ đồng; tự doanh 50 tỷ; bảo lãnh phát hành 165 tỷ; tư vấn đầu tư 10 tỷ (cộng dồn theo nghiệp vụ đăng ký)', 'NĐ 155/2020/NĐ-CP'],
    ['<b>Tỷ lệ vốn khả dụng</b>', 'Tối thiểu 180%; dưới mức này bị hạn chế hoạt động', 'TT 91/2020/TT-BTC'],
    ['<b>Cho vay ký quỹ</b>', 'Tổng dư nợ ≤ 200% vốn chủ; một khách hàng ≤ 3% vốn chủ; chỉ cho vay trên danh mục chứng khoán đủ điều kiện', 'TT 121/2020/TT-BTC'],
    ['<b>Giao dịch của nhà đầu tư nước ngoài</b>', 'Tổ chức nước ngoài được đặt lệnh mua không cần đủ tiền (non pre-funding); CTCK chịu rủi ro thanh toán', 'TT 68/2024/TT-BTC'],
    ['<b>IPO và niêm yết</b>', 'Hồ sơ niêm yết xét song song hồ sơ IPO, niêm yết ngay sau phát hành', 'NĐ 245/2025/NĐ-CP']], { num: false })}
    <div class="src">Nguồn: Nghị định 155/2020, 245/2025; Thông tư 91/2020, 121/2020, 68/2024</div></article>
  ${ovh(7, 'Thuật ngữ và chỉ số cần biết')}
  <article class="card">${gloss([
    ['Cho vay ký quỹ (margin)', 'CTCK cho nhà đầu tư vay để mua chứng khoán, chính chứng khoán đó làm tài sản bảo đảm.'],
    ['Ứng trước tiền bán', 'Cho nhà đầu tư nhận trước tiền bán chứng khoán chưa về tài khoản.'],
    ['FVTPL', 'Tài sản tài chính ghi nhận theo giá trị hợp lý qua lãi lỗ: thay đổi giá vào thẳng lợi nhuận kỳ đó.'],
    ['AFS', 'Sẵn sàng để bán: thay đổi giá vào vốn chủ, chỉ vào lợi nhuận khi bán.'],
    ['HTM', 'Giữ đến ngày đáo hạn: tiền gửi, chứng chỉ tiền gửi, trái phiếu; ghi theo giá gốc, thu lãi đều.'],
    ['Lợi nhuận chưa thực hiện', 'Lãi lỗ đánh giá lại danh mục khi chưa bán; biến động theo giá cuối kỳ.'],
    ['Tỷ lệ vốn khả dụng', 'Vốn khả dụng / tổng giá trị rủi ro; đo khả năng chịu tổn thất của CTCK.'],
    ['Bảo lãnh phát hành', 'CTCK cam kết mua phần chứng khoán chưa bán hết của đợt phát hành, nhận phí bảo lãnh.'],
    ['Non pre-funding', 'Nhà đầu tư tổ chức nước ngoài mua chứng khoán mà không cần có đủ tiền khi đặt lệnh.'],
    ['Biên môi giới', '(Doanh thu − chi phí môi giới) / doanh thu môi giới.']])}</article>`;
  const vv = vk.filter(k => k >= '2016-01');
  mk('ovVni', { type: 'line', data: { labels: vv.map(k => k.slice(5) + '/' + k.slice(0, 4)), datasets: [line('VN-Index', vv.map(k => F.vni[k]), C.navy, { pointRadius: 0, unit: '', dp: 0 })] },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } }, y: yNum('điểm') } } });
  const st = ms.slice().sort((a, b) => b.brkSh - a.brkSh);
  mk('ovStrCK', { type: 'bar', data: { labels: st.map(m => m.sym), datasets: [bar('Doanh thu môi giới', st.map(m => m.brkSh * 100), C.navy, { unit: '%', dp: 1 }), bar('Dư nợ cho vay', st.map(m => m.loanSh * 100), C.teal, { unit: '%', dp: 1 })] },
    options: { indexAxis: 'y', scales: { x: yPct('%'), y: { grid: { display: false } } } } });
  const R = SECQ, qEnd = q2 => F.vni[`${q2.slice(0, 4)}-${String(+q2.slice(5) * 3).padStart(2, '0')}`] ?? null;
  mk('ovCycCK', { type: 'bar', data: { labels: R.map(x => qLbl(x[0])), datasets: [bar('LNTT ngành', R.map(x => sv(x, 'is90')), R.map(x => sv(x, 'is90') < 0 ? C.red : C.navy), { unit: ' tỷ' }), line('VN-Index', R.map(x => qEnd(x[0])), C.red, { yAxisID: 'y1', unit: '', dp: 0, pointRadius: 1.5 })] },
    options: { scales: { x: { grid: { display: false } }, y: yNum('tỷ đồng'), y1: yNum('VN-Index', { position: 'right', grid: { display: false } }) } } });
  wireGo($('#ov'));
}

/* =====================================================================
   BỨC TRANH NGÀNH (tab con)
===================================================================== */
const SUBS = PAGE === 'bh' ? [['whole', 'Toàn cảnh', paneMktBH], ['life', 'Nhân thọ', paneLife], ['nonlife', 'Phi nhân thọ và môi giới', paneNonlife], ['peerbh', 'So sánh doanh nghiệp', panePeerBH]]
  : [['whole', 'Toàn cảnh', paneMktCK], ['sec', 'Ngành công ty chứng khoán', paneSec], ['mkt', 'Thị trường', paneMkt]];
const subDone = {};
function panePicture() {
  $('#picture').innerHTML = `<h2 class="sec">Bức tranh ngành</h2>
    <p class="sec-sub">${PAGE === 'bh' ? 'Thị trường nhân thọ, phi nhân thọ, môi giới bảo hiểm theo số công bố của Bộ Tài chính và IAV; doanh nghiệp niêm yết theo BCTC.' : 'Hoạt động của các công ty chứng khoán niêm yết (BCTC tổng hợp ngành) và thị trường cổ phiếu.'}</p>
    ${PAGE === 'bh' ? '<div class="banner chain">Lãi suất, thu nhập dân cư → Phí khai thác mới, hủy hợp đồng → Dự phòng và quỹ đầu tư → Lợi suất danh mục → Lợi nhuận, P/B doanh nghiệp bảo hiểm</div>'
      : '<div class="banner chain">Thanh khoản, VN-Index, dòng vốn ngoại → Doanh thu môi giới, dư nợ ký quỹ → Chi phí vốn và đòn bẩy → Lãi danh mục → Lợi nhuận, P/B công ty chứng khoán</div>'}
    <div class="subtabs" role="tablist">${SUBS.map(([k, l], i) => `<button type="button" data-p="${k}" class="${i ? '' : 'on'}">${l}</button>`).join('')}</div>
    ${SUBS.map(([k], i) => `<div class="sub${i ? '' : ' on'}" data-pp="${k}" id="${k}"></div>`).join('')}`;
  $$('#picture .subtabs button').forEach(b => b.onclick = () => openSub(b.dataset.p));
  openSub(SUBS[0][0], false);
}
function openSub(k, hash = true) {
  if (!built.picture || !$('#picture').classList.contains('active')) show('picture');
  $$('#picture .subtabs button').forEach(b => b.classList.toggle('on', b.dataset.p === k));
  $$('#picture .sub').forEach(x => x.classList.toggle('on', x.dataset.pp === k));
  if (!subDone[k]) { subDone[k] = true; const f = SUBS.find(x => x[0] === k)[2]; try { f($('#' + k)); } catch (e) { console.error(e); } }
  if (hash) try { history.replaceState(null, '', '#' + k); } catch (e) {}
}

/* =====================================================================
   CHÍNH SÁCH · QUY ĐỊNH
===================================================================== */
function panePolicy() {
  if (PAGE === 'bh') { $('#policy').innerHTML = `<h2 class="sec">Chính sách · Quy định</h2>
    <p class="sec-sub">Khung pháp lý kinh doanh bảo hiểm, các mốc chuyển tiếp và quy định về dự phòng, đầu tư, khả năng thanh toán.</p>${lawBlock()}`; return; }
  $('#policy').innerHTML = `<h2 class="sec">Chính sách · Quy định</h2>
  <p class="sec-sub">Khung pháp lý hoạt động công ty chứng khoán và các thay đổi cấu trúc thị trường.</p>
  <div class="grid g2 gap">
    ${card({ title: 'Văn bản và quy định chính', body: tbl(['Văn bản', 'Nội dung', 'Hiệu lực'], [
      ['<b>Luật Chứng khoán 54/2019/QH14</b>', 'Khung pháp lý thị trường chứng khoán', '01/01/2021'],
      ['Luật 56/2024/QH15 (sửa đổi)', 'Sửa đổi Luật Chứng khoán và các luật tài chính liên quan', '01/01/2025'],
      ['<b>Thông tư 121/2020/TT-BTC</b>', 'Hoạt động công ty chứng khoán; tổng dư nợ cho vay ký quỹ không vượt 200% vốn chủ sở hữu, cho vay một khách hàng không vượt 3% vốn chủ sở hữu', '2021'],
      ['<b>Thông tư 68/2024/TT-BTC</b>', 'Nhà đầu tư tổ chức nước ngoài được mua cổ phiếu không cần đủ tiền khi đặt lệnh (non pre-funding)', '02/11/2024'],
      ['Hệ thống giao dịch KRX tại HOSE', 'Hạ tầng giao dịch mới, nền tảng cho các sản phẩm và cơ chế giao dịch mới', '05/05/2025'],
      ['<b>Nghị định 245/2025/NĐ-CP</b>', 'Niêm yết ngay sau IPO (hồ sơ niêm yết xét song song hồ sơ IPO); bỏ quyền của ĐHĐCĐ hạ tỷ lệ sở hữu nước ngoài thấp hơn luật; chào bán trái phiếu ra công chúng phải có xếp hạng tín nhiệm', '09/2025']], { num: false }),
      ins: 'Trần cho vay 200% vốn chủ là giới hạn cứng của mảng ký quỹ: công ty đã cho vay từ 170% vốn chủ chỉ tăng được dư nợ khi tăng vốn, nên các đợt phát hành, IPO của CTCK thường đi trước một nhịp mở rộng margin.',
      src: 'Luật Chứng khoán 2019, Luật 56/2024/QH15; Thông tư 121/2020/TT-BTC, 68/2024/TT-BTC; Nghị định 245/2025/NĐ-CP; HOSE' })}
    ${card({ title: 'Nâng hạng thị trường FTSE Russell', body: tbl(['Mốc', 'Nội dung'], [
      ['08/10/2025', 'FTSE Russell xác nhận nâng hạng Việt Nam từ thị trường cận biên lên mới nổi thứ cấp'],
      ['03/2026', 'Rà soát giữa kỳ, công bố chi tiết triển khai'],
      ['<b>21/09/2026</b>', 'Hiệu lực, giai đoạn 1: 10% tỷ trọng'],
      ['03/2027', 'Giai đoạn 2: 30%'], ['06/2027', 'Giai đoạn 3: 65%'], ['09/2027', 'Giai đoạn 4: 100%']], { num: false }),
      ins: 'Dòng vốn vào theo từng giai đoạn tỷ trọng nên tác động lên thanh khoản và doanh thu môi giới kéo dài tới hết 2027. Ngân hàng Thế giới ước vốn gián tiếp vào khoảng 3–5 tỷ USD những năm đầu, có thể lên 25 tỷ USD vào 2030 nếu cải cách tiếp tục.',
      src: 'FTSE Russell (thông báo phân loại thị trường 10/2025); Tạp chí Công Thương; VietnamPlus' })}
  </div>`;
}

/* =====================================================================
   CATALYST · RISK
===================================================================== */
const imp = i => `<span class="imp ${i === '+' ? 'p' : i === '−' ? 'm' : 'z'}">${i}</span>`;
function paneCatalyst() {
  const rows = PAGE === 'bh' ? [
    ['Hàng tháng', 'Bản tin thị trường bảo hiểm của Bộ Tài chính, số liệu IAV', 'Tăng trưởng phí, khai thác mới, chi trả', '?', 'Bản tin tiếp theo khoảng 45–55 ngày sau kỳ'],
    ['Hàng quý', 'BCTC quý III/2026 của BVH, BMI, BIC, PTI', 'Lợi nhuận, chi giá trị hoàn lại', '?', 'Chờ công bố'],
    ['Đang diễn ra', 'Làn sóng hủy hợp đồng và đáo hạn hợp đồng nhân thọ ký 2018–2022', 'Quỹ đầu tư co lại, nền lợi nhuận tương lai giảm', '−', `Chi trả ${kyShort(last(ser('LIFE', 'CLAIMS'))[0])} ${sg(last(ser('LIFE', 'CLAIMS'))[2])}`],
    ['Đang diễn ra', 'Khai thác mới nhân thọ chưa hồi phục, dịch chuyển sang tử kỳ', 'Phí mới bình quân giảm, dự phòng tích lũy chậm', '−', `Phí mới ${kyShort(last(ser('LIFE', 'NB_PREM'))[0])} ${sg(last(ser('LIFE', 'NB_PREM'))[2])}`],
    ['Đang diễn ra', 'Phi nhân thọ tăng nhanh (sức khỏe, tài sản)', 'Doanh thu phí, quy mô danh mục', '+', `${sg(nP[2])} ${kyShort(nP[0])}`],
    ['Theo lãi suất', 'Lãi suất huy động, lợi suất TPCP', 'Lợi suất danh mục (tiền gửi, trái phiếu chiếm phần lớn)', '+', 'Lãi suất tăng có lợi cho thu nhập đầu tư nhưng tăng động cơ hủy hợp đồng'],
    ['01/01/2027', 'Phần hoa hồng của Thông tư 96/2026 có hiệu lực', 'Chi phí khai thác nhân thọ', '?', 'Sắp hiệu lực'],
    ['31/12/2027', 'Hết áp dụng quy định đầu tư cũ (NĐ 73/2016)', 'Cơ cấu danh mục đầu tư', '?', ''],
    ['01/01/2028', 'Cấm đầu tư một số loại tài sản (Luật 08/2022 Điều 99)', 'Cơ cấu danh mục đầu tư', '−', ''],
    ['31/12/2030', 'Hết cách tính biên khả năng thanh toán cũ', 'Yêu cầu vốn', '?', '']]
    : [
    ['21/09/2026 → 09/2027', 'FTSE Russell nâng hạng, giải ngân tỷ trọng 10% → 30% → 65% → 100%', 'Thanh khoản, dòng vốn ngoại, doanh thu môi giới', '+', 'Giai đoạn 1 đã hiệu lực'],
    ['Hàng quý', 'BCTC quý III/2026 của SSI và các CTCK còn lại', 'Lợi nhuận ngành, lãi danh mục', '?', 'Chờ công bố'],
    ['Đang diễn ra', 'Dư nợ cho vay ký quỹ tăng nhanh, một số công ty gần trần 200% vốn chủ', 'Phải tăng vốn để mở rộng margin; rủi ro giải chấp khi thị trường giảm', '−', `HCM ${pc(secMetrics('HCM', SEC_LASTQ).loanEq, 0)} vốn chủ`],
    ['Đang diễn ra', 'Cạnh tranh phí môi giới (0%)', 'Biên môi giới', '−', ''],
    ['2025–2026', 'Niêm yết các CTCK lớn: TCX, VCK, VPX', 'Cung cổ phiếu ngành, cạnh tranh vốn chủ lớn', '?', 'Đã niêm yết cuối 2025'],
    ['Theo lãi suất', 'Lãi suất liên ngân hàng, vay ngân hàng, vay hợp vốn nước ngoài', 'Chi phí vốn mảng cho vay và danh mục FI', '−', 'Nợ vay ngành bằng ' + pc(debtOf(rowAt(SECQ, SEC_LASTQ)) / sv(rowAt(SECQ, SEC_LASTQ), 'bs400'), 0) + ' vốn chủ'],
    ['Từ 09/2025', 'NĐ 245/2025: niêm yết ngay sau IPO', 'Số thương vụ IPO, doanh thu ngân hàng đầu tư', '+', '']];
  $('#catalyst').innerHTML = `<h2 class="sec">Catalyst · Risk</h2>
  <p class="sec-sub">Sự kiện có thể đoán trước thời điểm và rủi ro đang diễn ra; + hỗ trợ, − bất lợi, ? hai chiều hoặc chưa rõ.</p>
  <article class="card"><div class="tscroll"><table class="fz"><thead><tr><th>Thời điểm</th><th>Sự kiện / rủi ro</th><th>Kênh tác động</th><th>Tác động</th><th>Trạng thái</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td style="white-space:nowrap"><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${imp(r[3])}</td><td>${r[4]}</td></tr>`).join('')}</tbody></table></div>
    <div class="src">Nguồn: ${PAGE === 'bh' ? srcOf(ser('LIFE', 'CLAIMS').slice(-1), ser('LIFE', 'NB_PREM').slice(-1), ser('NONLIFE', 'PREM').slice(-1)) + '; văn bản pháp luật; ' + WI : 'FTSE Russell; Nghị định 245/2025/NĐ-CP; ' + WI}</div></article>
  ${PAGE === 'bh' ? `<h3 class="sec2">Chủ đề nóng: hủy hợp đồng nhân thọ</h3>${surrenderBlock()}` : ''}`;
  if (PAGE === 'bh') drawSurrender();
}
function surrenderBlock() {
  return `<div class="grid g2 gap">
    ${card({ title: 'BVH: hủy hợp đồng tăng nhanh hơn doanh thu phí', sub: 'Chi trả bảo hiểm nhân thọ của BVH, tỷ đồng', body: tbl(['Khoản', '2024', '2025', '6T/2025', '6T/2026'], [
        ['Đáo hạn', '2.980', '3.473', '1.577', '1.968'], ['<b>Giá trị hoàn lại (hủy HĐ)</b>', '9.182', '<b>10.534</b>', '4.818', '<b>5.948</b>'], ['Rủi ro và khác', '2.902', '2.811', '1.360', '1.400'], ['<b>Tổng</b>', '15.064', '16.817', '7.755', '9.316']]),
      ins: 'Hủy hợp đồng 6T/2026 tăng 23,5% trong khi phí nhân thọ 6 tháng giảm 3,3% (16.662 → 16.119 tỷ); giá trị hoàn lại so với phí lên 36,9% từ 28,9%. Trích lập dự phòng nghiệp vụ 6 tháng giảm 28%. Hủy muộn thường không gây lỗ kế toán vì giá trị hoàn lại thấp hơn dự phòng đang giữ, nhưng làm co quỹ đầu tư, tức co nền tạo lợi nhuận tương lai.',
      src: 'Báo cáo tài chính Tập đoàn Bảo Việt (BVH), thuyết minh chi bồi thường' })}
    ${card({ id: 'catClaims', title: 'Chi trả quyền lợi so với phí nhân thọ toàn thị trường', sub: '% · chi trả quyền lợi / tổng phí, lũy kế từ đầu năm tại các kỳ có đủ hai số', src: srcOf(ser('LIFE', 'CLAIMS').filter(p => p[0] >= '2021'), ser('LIFE', 'PREM').filter(p => p[0] >= '2021')),
      ins: 'Tỷ lệ chi trả trên phí tăng mạnh từ 2023, khi hợp đồng liên kết đầu tư bán qua ngân hàng giai đoạn 2018–2022 bắt đầu bị hủy và đáo hạn.' })}
  </div>`;
}
function drawSurrender() {
  const C1 = ser('LIFE', 'CLAIMS'), P1 = ser('LIFE', 'PREM'), ks = C1.map(p => p[0]).filter(k => k >= '2021' && at(P1, k));
  mk('catClaims', { type: 'line', data: { labels: ks.map(kyShort), datasets: [line('Chi trả / phí', ks.map(k => at(C1, k) / at(P1, k) * 100), C.purple, { $src: ks.map(k => pt(C1, k)[3]) })] },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: yPct('%') } } });
}

/* =====================================================================
   CONSENSUS CTCK
===================================================================== */
const SYMS = () => PAGE === 'bh' ? INS_ALL : SEC_L;
const lastPx = s => { const p = W.px[s]; return p ? last(p.c) : null; };
const med2 = a => { const b = a.filter(v => v != null).sort((x, y) => x - y); if (!b.length) return null; const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const xx = (v, d = 2) => v == null || isNaN(v) ? '—' : nf(v, d) + 'x';
// vạch tham chiếu (ngang hoặc dọc) có nhãn
const vref = { id: 'vref', afterDatasetsDraw(ch, _a, o) {
  const ls = o && o.lines; if (!ls) return; const { ctx, chartArea: A } = ch;
  ls.forEach(l => { const sc = ch.scales[l.axis || 'y']; if (!sc) return; const p = sc.getPixelForValue(l.value), hz = sc.isHorizontal();
    ctx.save(); ctx.strokeStyle = l.color || C.red; ctx.lineWidth = 1.3; ctx.setLineDash(l.dash || [5, 4]); ctx.beginPath();
    if (hz) { ctx.moveTo(p, A.top); ctx.lineTo(p, A.bottom); } else { ctx.moveTo(A.left, p); ctx.lineTo(A.right, p); } ctx.stroke(); ctx.setLineDash([]);
    if (l.label) { ctx.font = '600 10.5px Arial'; ctx.fillStyle = l.color || C.red; ctx.textBaseline = 'bottom'; if (hz) ctx.fillText(l.label, Math.min(p + 4, A.right - ctx.measureText(l.label).width), A.top + 12); else ctx.fillText(l.label, A.left + 4, p - 2); }
    ctx.restore(); }); } };
Chart.register(vref);
// consensus: mỗi CTCK lấy bản mới nhất (riêng cho giá mục tiêu, LNST dự phóng và khuyến nghị)
function consOf(s) {
  const R = W.rep.filter(r => r.s === s).sort((a, b) => b.d.localeCompare(a.d)), px = lastPx(s), v = W.val[s] || {};
  const per = f => { const m = new Map(); R.forEach(r => { if (f(r) && !m.has(r.org)) m.set(r.org, r); }); return [...m.values()]; };
  const T = per(r => r.tp), N = per(r => r.np && (!r.y || r.y === 2026)), K = per(r => r.rec && !/KHÁC/.test(r.rec));
  const tp = med2(T.map(r => r.tp)), np = med2(N.map(r => r.np)), plan = W.plans.find(p => p.s === s && p.y === 2026);
  const pbNow = v.pb, bvps = v.bvps || (px && v.pb ? px / v.pb : null);
  return { s, R, T, N, n: new Set(R.map(r => r.org)).size, nTP: T.length, tp, px, up: tp && px ? tp / px - 1 : null, np, plan, last: R[0],
    tpMin: T.length ? Math.min(...T.map(r => r.tp)) : null, tpMax: T.length ? Math.max(...T.map(r => r.tp)) : null,
    buy: K.filter(r => /MUA/.test(r.rec)).length, sell: K.filter(r => /BÁN/.test(r.rec)).length, hold: K.filter(r => !/MUA|BÁN/.test(r.rec)).length,
    pbNow, pbTP: tp && bvps ? tp / bvps : null, peFwd: np && v.mcap ? v.mcap / np : null, mcap: v.mcap };
}
const recPill = r => !r ? '—' : /MUA/.test(r) ? `<span class="pill ok">${esc(r)}</span>` : /BÁN/.test(r) ? `<span class="pill risk">${esc(r)}</span>` : /KHÁC/.test(r) ? '<span class="pill">Chưa phân loại</span>' : `<span class="pill watch">${esc(r)}</span>`;
const GRP = PAGE === 'bh' ? { BVH: 'Nhân thọ', PVI: 'Phi nhân thọ', MIG: 'Phi nhân thọ', BMI: 'Phi nhân thọ', BIC: 'Phi nhân thọ', PTI: 'Phi nhân thọ' }
  : { TCX: 'Thuộc ngân hàng', VPX: 'Thuộc ngân hàng', MBS: 'Thuộc ngân hàng', SSI: 'Độc lập', VCI: 'Độc lập', HCM: 'Độc lập', VND: 'Độc lập', VCK: 'Độc lập', SHS: 'Độc lập' };
const GCOL = { 'Nhân thọ': C.navy, 'Phi nhân thọ': C.teal, 'Thuộc ngân hàng': C.purple, 'Độc lập': C.navy };
const SECV = () => PAGE === 'bh' ? sv406 : sv408;
let consSel = null;
function paneCons() {
  const cs = SYMS().map(consOf), has = cs.filter(c => c.tp != null), full = has.filter(c => c.nTP >= 2), base = full.length ? full : has;
  const sv = SECV(), n = sv.pb.length, pbM = avgN(sv.pb, n);
  const lo = c => c.nTP < 2 ? '#d5d9e2' : GCOL[GRP[c.s]] || C.navy;
  $('#cons').innerHTML = `<h2 class="sec">Consensus CTCK</h2>
  <p class="sec-sub">Báo cáo phân tích của các công ty chứng khoán từ 01/04/2026; mỗi CTCK lấy bản mới nhất. Giá mục tiêu đã điều chỉnh theo sự kiện quyền; upside so với giá đóng cửa phiên gần nhất. Bấm một mã ở chart hoặc bảng để xem P/B của mã đó.</p>
  <div class="kpis">
    ${kpi('Mã có ≥ 2 CTCK định giá', nf(full.length), `trên ${has.length} mã có giá mục tiêu · ${cs.length} mã theo dõi`)}
    ${kpi('Upside trung vị', sg(med2(base.map(c => c.up)), 1), full.length ? 'mã có ≥ 2 giá mục tiêu' : 'mọi mã có giá mục tiêu', cls(med2(base.map(c => c.up))))}
    ${kpi('P/E fwd 2026 trung vị', xx(med2(cs.map(c => c.peFwd)), 1), `P/E TTM ngành ${xx(last(sv.pe), 1)}`)}
    ${kpi('P/B tại giá mục tiêu trung vị', xx(med2(base.map(c => c.pbTP))), `P/B hiện tại trung vị ${xx(med2(base.map(c => c.pbNow)))} · ngành ${xx(last(sv.pb))}`)}
    ${kpi('Khuyến nghị', `${cs.reduce((a, c) => a + c.buy, 0)} MUA`, `${cs.reduce((a, c) => a + c.hold, 0)} trung lập · ${cs.reduce((a, c) => a + c.sell, 0)} bán (theo CTCK)`)}
  </div>
  <article class="card" id="pbHistCard"><h3 class="sub" id="pbHistH"></h3><p class="chart-sub" id="pbHistSub"></p>
    <div class="cbox tall"><canvas id="chPbHist" role="img" aria-label="P/B lịch sử"></canvas></div>
    <div class="insight" id="pbHistIns"></div><div class="src">Nguồn: ${WI} (định giá theo phiên, báo cáo CTCK)</div></article>
  <div class="grid g2 gap">
    ${card({ id: 'chUp', title: 'Upside theo giá mục tiêu trung vị', h: 'tall', sub: 'Mỗi CTCK lấy bản mới nhất · số trong ngoặc = số giá mục tiêu · màu nhạt = dưới 2 CTCK (kém tin cậy)', ins: consUpIns(has), src: WI })}
    ${card({ id: 'chPeFwd', title: 'P/E forward 2026 theo LNST dự phóng trung vị', h: 'tall', sub: 'Lần · vốn hóa hiện tại / LNST 2026F trung vị các CTCK; đường đỏ: P/E TTM ngành', ins: consPeIns(cs, sv), src: WI })}
    ${card({ id: 'chPbTp', title: 'Định giá P/B: hiện tại so với tại giá mục tiêu', h: 'tall', sub: 'Lần · cột = P/B hiện tại · chấm = P/B tại giá mục tiêu trung vị (giá mục tiêu / giá trị sổ sách mỗi cổ phiếu hiện tại) · màu nhạt = dưới 2 CTCK', ins: consPbIns(has, pbM, sv), src: WI })}
    ${card({ id: 'chPbGrp', title: 'P/B theo nhóm: hiện tại và tại giá mục tiêu', h: 'tall', sub: `Lần · trung vị theo nhóm ${PAGE === 'bh' ? '(nhân thọ, phi nhân thọ)' : '(CTCK thuộc ngân hàng, độc lập)'}; vạch xám: trung bình 3 năm của P/B ngành`, src: WI })}
    ${card({ id: 'chNp', title: 'LNST 2026: dự phóng trung vị và kế hoạch ĐHĐCĐ', h: 'tall', sub: 'Tỷ đồng · chấm vàng = kế hoạch ĐHĐCĐ', ins: consNpIns(cs), src: WI + ' (báo cáo CTCK, kế hoạch ĐHĐCĐ)' })}
    ${card({ id: 'chRec', title: 'Khuyến nghị theo mã', h: 'tall', sub: 'Số CTCK theo khuyến nghị mới nhất của từng CTCK; báo cáo không ghi khuyến nghị không tính', src: WI })}
  </div>
  <article class="card"><h3 class="sub">Chi tiết theo mã</h3><div class="tscroll"><table class="fz" id="consTab"><thead><tr><th>Mã</th><th class="n">CTCK</th><th class="n">MUA / TL / BÁN</th><th class="n">GMT trung vị</th><th class="n">GMT thấp – cao</th><th class="n">Giá</th><th class="n">Upside</th><th class="n">P/B hiện tại</th><th class="n">P/B tại GMT</th><th class="n">LNST 26F (tỷ)</th><th class="n">KH LNST 26 (tỷ)</th><th class="n">P/E fwd</th><th>Báo cáo mới nhất</th></tr></thead><tbody>
    ${cs.map(c => `<tr class="${c.nTP < 2 ? 'stale' : ''}" data-s="${c.s}" style="cursor:pointer"><td><b>${c.s}</b> <a href="dn.html?s=${c.s}#cons" class="muted" style="font-size:11px">chi tiết</a>${c.R.length ? `<details class="more"><summary>${c.R.length} báo cáo</summary><div class="note">${c.R.map(r => `${esc(r.org)} ${dvn(r.d)} · ${esc(r.rec || '')}${r.tp ? ' · GMT ' + nf(r.tp) : ''}${r.np ? ' · LNST ' + nf(r.np) : ''}`).join('<br>')}</div></details>` : ''}</td>
      <td class="n">${c.n || '—'}</td><td class="n">${c.buy} / ${c.hold} / ${c.sell}</td><td class="n">${nf(c.tp)}</td><td class="n">${c.tpMin ? nf(c.tpMin) + ' – ' + nf(c.tpMax) : '—'}</td><td class="n">${nf(c.px)}</td>
      <td class="n">${c.up == null ? '—' : `<b class="${cls(c.up)}">${sg(c.up, 1)}</b>`}</td><td class="n">${xx(c.pbNow)}</td><td class="n">${xx(c.pbTP)}</td><td class="n">${nf(c.np)}</td><td class="n">${c.plan ? nf(c.plan.pat) : '—'}</td><td class="n">${xx(c.peFwd, 1)}</td><td>${c.last ? `${esc(c.last.org)} · ${dvn(c.last.d)}` : '<span class="muted">Chưa có</span>'}</td></tr>`).join('')}
  </tbody></table></div><div class="note">Dòng mờ: dưới 2 giá mục tiêu trong kỳ. Một số CTCK không ghi khuyến nghị (chưa phân loại) nên tổng MUA/TL/BÁN có thể nhỏ hơn số CTCK.</div><div class="src">Nguồn: ${WI}</div></article>`;
  const pick = (e, els, ch) => { if (!els || !els.length) return; consPick(String(ch.data.labels[els[0].index]).split(' ')[0]); };
  const s1 = has.slice().sort((a, b) => b.up - a.up);
  mk('chUp', { type: 'bar', data: { labels: s1.map(c => `${c.s} (${c.nTP})`), datasets: [bar('Upside', s1.map(c => c.up * 100), s1.map(lo), { unit: '%', dp: 1 })] },
    options: { indexAxis: 'y', onClick: pick, plugins: { legend: { display: false }, vref: { lines: [{ axis: 'x', value: 0, color: C.grey, dash: [] }] } }, scales: { x: yPct('%'), y: { grid: { display: false } } } } });
  const s2 = cs.filter(c => c.peFwd != null && c.peFwd < 60).sort((a, b) => a.peFwd - b.peFwd);
  mk('chPeFwd', { type: 'bar', data: { labels: s2.map(c => c.s), datasets: [bar('P/E fwd 2026', s2.map(c => c.peFwd), s2.map(c => c.N.length < 2 ? '#d5d9e2' : GCOL[GRP[c.s]]), { unit: 'x', dp: 1 })] },
    options: { indexAxis: 'y', onClick: pick, plugins: { legend: { display: false }, vref: { lines: [{ axis: 'x', value: last(sv.pe), label: 'P/E TTM ngành ' + xx(last(sv.pe), 1), color: C.red }] } }, scales: { x: yNum('lần', { ticks: { callback: v => nf(v, 0) + 'x' } }), y: { grid: { display: false } } } } });
  const s3 = has.filter(c => c.pbTP != null && c.pbNow != null).sort((a, b) => b.pbTP / b.pbNow - a.pbTP / a.pbNow);
  mk('chPbTp', { type: 'bar', data: { labels: s3.map(c => `${c.s} (${c.nTP})`), datasets: [
    bar('P/B hiện tại', s3.map(c => c.pbNow), s3.map(lo), { unit: 'x', dp: 2, order: 2 }),
    { type: 'line', label: 'P/B tại giá mục tiêu', data: s3.map(c => c.pbTP), showLine: false, pointRadius: 6, backgroundColor: '#fff', borderColor: '#1f2433', pointBorderWidth: 2, unit: 'x', dp: 2, order: 1 }] },
    options: { indexAxis: 'y', onClick: pick, interaction: { mode: 'index', intersect: false, axis: 'y' }, plugins: { vref: { lines: [{ axis: 'x', value: last(sv.pb), label: 'Ngành ' + xx(last(sv.pb)), color: C.red }, { axis: 'x', value: pbM, label: 'TB 3 năm ' + xx(pbM), color: C.grey }] } },
      scales: { x: yNum('lần', { ticks: { callback: v => nf(v, 1) + 'x' } }), y: { grid: { display: false } } } } });
  const G = [...new Set(Object.values(GRP))];
  mk('chPbGrp', { type: 'bar', data: { labels: G, datasets: [bar('P/B hiện tại (trung vị)', G.map(g => med2(cs.filter(c => GRP[c.s] === g).map(c => c.pbNow))), G.map(g => GCOL[g]), { unit: 'x', dp: 2 }),
    bar('P/B tại giá mục tiêu (trung vị)', G.map(g => med2(has.filter(c => GRP[c.s] === g).map(c => c.pbTP))), 'rgba(217,164,0,.75)', { unit: 'x', dp: 2 })] },
    options: { plugins: { vref: { lines: [{ value: pbM, label: 'TB 3 năm ngành ' + xx(pbM), color: C.grey }] } }, scales: { x: { grid: { display: false } }, y: yNum('lần', { ticks: { callback: v => nf(v, 1) + 'x' } }) } } });
  const s4 = cs.filter(c => c.np || c.plan);
  mk('chNp', { type: 'bar', data: { labels: s4.map(c => `${c.s} (${c.N.length})`), datasets: [bar('LNST 2026F trung vị', s4.map(c => c.np), s4.map(c => c.N.length < 2 ? '#d5d9e2' : GCOL[GRP[c.s]]), { unit: ' tỷ', order: 2 }),
    { type: 'line', label: 'Kế hoạch ĐHĐCĐ', data: s4.map(c => c.plan ? c.plan.pat : null), showLine: false, pointRadius: 6, backgroundColor: C.gold, borderColor: C.gold, unit: ' tỷ', dp: 0, order: 1 }] },
    options: { indexAxis: 'y', onClick: pick, interaction: { mode: 'index', intersect: false, axis: 'y' }, scales: { x: yNum('tỷ đồng'), y: { grid: { display: false } } } } });
  const s5 = cs.filter(c => c.buy + c.hold + c.sell);
  mk('chRec', { type: 'bar', data: { labels: s5.map(c => c.s), datasets: [bar('MUA', s5.map(c => c.buy), C.green, { stack: 'r' }), bar('Trung lập', s5.map(c => c.hold), C.gold, { stack: 'r' }), bar('BÁN', s5.map(c => c.sell), C.red, { stack: 'r' })] },
    options: { indexAxis: 'y', onClick: pick, scales: { x: yNum('số CTCK', { stacked: true, ticks: { stepSize: 1 } }), y: { stacked: true, grid: { display: false } } } } });
  $$('#consTab tbody tr[data-s]').forEach(tr => tr.onclick = e => { if (e.target.closest('details,a')) return; consPick(tr.dataset.s); });
  drPbHist();
}
function consPick(s) { consSel = consSel === s ? null : s; drPbHist(); const c = $('#pbHistCard'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
function drPbHist() {
  const sv = SECV(), nmS = PAGE === 'bh' ? 'ngành bảo hiểm' : 'ngành chứng khoán';
  let ser, title, c = null, peer = null;
  const sec = sv.d.map((d, i) => [d, sv.pb[i]]).filter(p => p[1] != null);
  if (consSel && W.pb[consSel]) { const p = W.pb[consSel]; ser = p.d.map((d, i) => [d, p.pb[i]]).filter(x => x[1] != null); c = consOf(consSel); peer = sec; title = `P/B ${consSel} theo phiên so với P/B ${nmS}`; }
  else { ser = sec; title = `P/B ${nmS} theo phiên`; const cs = SYMS().map(consOf).filter(x => x.pbTP != null && x.pbNow != null && x.mcap); const w = cs.reduce((a, x) => a + x.mcap, 0);
    c = w ? { pbTP: last(sv.pb) * cs.reduce((a, x) => a + x.mcap * x.pbTP / x.pbNow, 0) / w, nTP: cs.length, agg: true } : null; }
  const v = ser.map(p => p[1]), m = v.reduce((a, b) => a + b, 0) / v.length, sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length), now = last(v), lastD = last(ser)[0];
  const yEnd = `${lastD.slice(0, 4)}-12-31`, fut = [];
  if (c && c.pbTP != null && yEnd > lastD) { const d = new Date(lastD + 'T00:00:00Z'); for (;;) { d.setUTCDate(d.getUTCDate() + 1); const iso = d.toISOString().slice(0, 10); if (iso > yEnd) break; if (d.getUTCDay() % 6) fut.push(iso); } }
  const dates = ser.map(p => p[0]).concat(fut), n0 = ser.length;
  const ds = [line(consSel ? 'P/B ' + consSel : 'P/B ' + nmS, v.concat(fut.map(() => null)), consSel ? C.navy : C.teal, { pointRadius: 0, borderWidth: 1.8, unit: 'x', dp: 2 })];
  if (peer) { const mm = new Map(peer); ds.push(line('P/B ' + nmS, dates.map(d => mm.has(d) ? mm.get(d) : null), C.grey, { pointRadius: 0, borderWidth: 1.2, borderDash: [4, 3], unit: 'x', dp: 2 })); }
  if (c && c.pbTP != null && fut.length) ds.push(line(`Tới P/B tại giá mục tiêu ${xx(c.pbTP)} (31/12)`, dates.map((d, i) => i < n0 - 1 ? null : +(now + (c.pbTP - now) * (i - (n0 - 1)) / (dates.length - n0)).toFixed(3)), C.red, { pointRadius: 0, borderWidth: 1.8, borderDash: [6, 4], unit: 'x', dp: 2 }));
  mk('chPbHist', { type: 'line', data: { labels: dates.map(dvn), datasets: ds },
    options: { plugins: { vref: { lines: [{ value: m, label: `TB ${xx(m)}`, color: C.grey, dash: [2, 3] }, { value: m + sd, label: `+1σ ${xx(m + sd)}`, color: '#c9a227' }, { value: m - sd, label: `−1σ ${xx(m - sd)}`, color: '#c9a227' }] } },
      scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 9 } }, y: yNum('lần', { beginAtZero: false, ticks: { callback: v2 => nf(v2, 1) + 'x' } }) } } });
  $('#pbHistH').textContent = title;
  $('#pbHistSub').textContent = `Lần · theo phiên từ ${dvn(ser[0][0])} · nét đứt đỏ = P/B đi từ hiện tại tới P/B tại giá mục tiêu trung vị vào 31/12 · đường xám = trung bình, đường vàng = ±1 độ lệch chuẩn · bấm lại mã đang chọn để về P/B ngành`;
  const z = sd ? (now - m) / sd : 0, pct = v.filter(y => y <= now).length / v.length * 100;
  $('#pbHistIns').innerHTML = `${consSel || 'P/B ngành'}: hiện tại <b>${xx(now)}</b>, ${z >= 0 ? 'cao' : 'thấp'} hơn trung bình ${xx(m)} <b>${nf(Math.abs(z), 1)} độ lệch chuẩn</b>; cao hơn ${nf(pct, 0)}% số phiên trong chuỗi (thấp nhất ${xx(Math.min(...v))}, cao nhất ${xx(Math.max(...v))}).`
    + (c && c.pbTP != null ? ` Giá mục tiêu trung vị của CTCK tương ứng P/B <b>${xx(c.pbTP)}</b>${c.agg ? ` (bình quân theo vốn hóa của ${c.nTP} mã có giá mục tiêu)` : ` (${c.nTP} giá mục tiêu)`}.` : '')
    + (PAGE === 'bh' ? ' P/B của doanh nghiệp bảo hiểm đi theo ROE bền vững, mà ROE chủ yếu đến từ lợi suất danh mục; vì vậy P/B nhạy với lãi suất hơn với tăng trưởng phí.' : ' P/B công ty chứng khoán biến động mạnh theo chu kỳ thị trường: tăng nhanh khi thanh khoản và dư nợ ký quỹ tăng, giảm sâu khi thị trường điều chỉnh.');
}
function consUpIns(has) {
  const s = has.slice().sort((a, b) => b.up - a.up), neg = s.filter(c => c.up < 0);
  return s.length ? `Upside cao nhất: ${s.slice(0, 3).map(c => `<b>${c.s} ${sg(c.up, 0)}</b> (${c.nTP} CTCK)`).join(', ')}.${neg.length ? ' Giá đã vượt giá mục tiêu trung vị: ' + neg.map(c => `${c.s} ${sg(c.up, 0)}`).join(', ') + '.' : ''} Phần lớn mã chỉ có 1–2 giá mục tiêu nên trung vị nhạy với từng báo cáo.` : '';
}
function consPeIns(cs, sv) {
  const s = cs.filter(c => c.peFwd != null).sort((a, b) => a.peFwd - b.peFwd);
  return s.length ? `P/E fwd thấp nhất: ${s.slice(0, 3).map(c => `<b>${c.s} ${xx(c.peFwd, 1)}</b>`).join(', ')}; cao nhất ${s.slice(-2).map(c => `${c.s} ${xx(c.peFwd, 1)}`).join(', ')}; P/E TTM ngành ${xx(last(sv.pe), 1)}.` : '';
}
function consPbIns(has, pbM, sv) {
  const R = has.filter(c => c.pbTP != null && c.pbNow != null).sort((a, b) => b.pbTP / b.pbNow - a.pbTP / a.pbNow);
  return R.length ? `CTCK định giá ở P/B trung vị <b>${xx(med2(R.map(c => c.pbTP)))}</b>, so với <b>${xx(med2(R.map(c => c.pbNow)))}</b> hiện tại; P/B ngành ${xx(last(sv.pb))}, trung bình 3 năm ${xx(pbM)}. Chênh lớn nhất giữa P/B mục tiêu và hiện tại: ${R.slice(0, 3).map(c => `<b>${c.s}</b> ${xx(c.pbNow)} → ${xx(c.pbTP)}`).join(', ')}.` : '';
}
function consNpIns(cs) {
  const R = cs.filter(c => c.np && c.plan && c.plan.pat);
  return R.length ? `So với kế hoạch ĐHĐCĐ: ${R.map(c => `<b>${c.s}</b> ${sg(c.np / c.plan.pat - 1, 0)}`).join(', ')} (dự phóng trung vị so với kế hoạch LNST 2026).` : 'Chưa đủ mã có cả dự phóng và kế hoạch để so sánh.';
}

/* =====================================================================
   CHART BOOK
===================================================================== */
function buildAll() {
  Object.keys(builders).forEach(k => { if (k !== 'book' && !built[k]) { built[k] = true; try { builders[k](); } catch (e) { console.error(e); } } });
  if (typeof SUBS !== 'undefined') SUBS.forEach(([k, , f]) => { if (!subDone[k] && $('#' + k)) { subDone[k] = true; try { f($('#' + k)); } catch (e) { console.error(e); } } });
}
function paneBook() {
  buildAll();
  const ids = Object.keys(SPEC);
  $('#book').innerHTML = `<h2 class="sec">Chart book</h2><p class="sec-sub">${ids.length} chart của trang ở một chỗ, luôn theo dữ liệu mới nhất.</p>
  <div class="bk-bar"><input id="bkQ" type="search" placeholder="Tìm chart…" aria-label="Tìm chart"></div>
  <div class="grid g2 gap" id="bkGrid">${ids.map(id => { const s = SPEC[id]; return `<article class="card bk" data-id="${id}" data-s="${esc((s.title + ' ' + id).toLowerCase())}"><h3 class="sub">${esc(s.title)}</h3>${s.sub ? `<p class="chart-sub">${s.sub}</p>` : ''}<div class="cbox"><canvas id="cb-${id}"></canvas></div>${s.src ? `<div class="src">${s.src}</div>` : ''}</article>`; }).join('')}</div>`;
  const draw = c => { const id = c.dataset.id; if (c.dataset.dn) return; c.dataset.dn = 1; mk('cb-' + id, cl(SPEC[id].cfg), { ts: SPEC[id].ts }); };
  const ob = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) draw(e.target); }), { rootMargin: '300px' }) : null;
  $$('#bkGrid .bk').forEach(c => ob ? ob.observe(c) : draw(c));
  $('#bkQ').oninput = e => { const q = e.target.value.trim().toLowerCase(); $$('#bkGrid .bk').forEach(c => c.hidden = q && !c.dataset.s.includes(q)); };
}

/* =====================================================================
   TRANG DOANH NGHIỆP (dn.html?s=MÃ) — cấu trúc như trang ngân hàng
===================================================================== */
const SYM = PAGE === 'dn' ? (new URLSearchParams(location.search).get('s') || 'SSI').toUpperCase() : null;
const CO = SYM ? W.names[SYM] : null, IS_INS = CO && CO.t === 3, X = SYM ? (W.co || {})[SYM] || {} : {};
const QS = () => IS_INS ? W.ins[SYM] : W.sec[SYM];
const qv = (r, k) => IS_INS ? iv(r, k) : sv(r, k);
const noteRows = () => (W.notes[IS_INS ? 'fs_ins_notes' : 'fs_sec_notes'].v[SYM] || []);
const nk = k => W.notes[IS_INS ? 'fs_ins_notes' : 'fs_sec_notes'].k.indexOf(k) + 1;
const nv = (q, k) => { const r = noteRows().find(x => x[0] === q); return r ? r[nk(k)] : null; };
const NP_K = () => IS_INS ? 'is60' : 'is200', PBT_K = () => IS_INS ? 'is50' : 'is90';
const ttmRoe = (R, q) => { const n = ttm(R, q, r => qv(r, NP_K())), e = avgBal(R, q, r => qv(r, 'bs400')); return n != null && e ? n / e : null; };
const PEERS = () => IS_INS ? INS_ALL : SEC_L;
const DKEY = () => `fin-${SYM}-decision`;
const myDec = () => { try { const V = window.FSN ? FSN.versions(DKEY()) : []; return V[0] ? V[0].f : {}; } catch (e) { return {}; } };
const numv = v => +String(v || '').replace(/\D/g, '');
const pxS = () => X.px && X.px.d.length ? X.px : W.px[SYM];
const lastPrice = () => last(pxS().c);
const bvpsNow = () => { const v = W.val[SYM] || {}; return v.bvps || (v.pb ? lastPrice() / v.pb : null); };
const sharesM = () => X.shares ? X.shares / 1e6 : (W.val[SYM] && W.val[SYM].mcap && lastPrice() ? W.val[SYM].mcap * 1e9 / lastPrice() / 1e6 : null);   // triệu CP
const yearSum = (y, k) => { const qs = QS().filter(r => r[0].startsWith(String(y))); return { v: qs.reduce((a, r) => a + (qv(r, k) || 0), 0), n: qs.length }; };
const fwd = () => {   // dự phóng: LNST 2026F trung vị, BVPS 2026F = VCSH hiện tại + (LNST 2026F − LNST đã ghi nhận 2026) / số CP
  const c = consOf(SYM), np25 = yearSum(2025, NP_K()).v, ytd = yearSum(2026, NP_K()), R = QS(), eq = qv(last(R), 'bs400'), sh = sharesM();
  const bv26 = c.np && sh ? (eq + Math.max(0, c.np - ytd.v)) * 1e9 / (sh * 1e6) : null;
  return { c, np25, ytd, bv26, peFwd: c.np && W.val[SYM].mcap ? W.val[SYM].mcap / c.np : null, pbFwd: bv26 ? lastPrice() / bv26 : null };
};
const rqS = () => (X.rq || []).filter(r => r[1] != null);
const band = idx => { const v = rqS().slice(-20).map(r => r[idx]).filter(x => x != null && x > 0); if (!v.length) return null; const m = v.reduce((a, b) => a + b, 0) / v.length, sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); return { m, sd, lo: m - sd, hi: m + sd, n: v.length, from: rqS().slice(-20)[0][0], to: last(rqS())[0] }; };

function dnHeader() {
  const R = QS(), q = last(R)[0], v = W.val[SYM], px = pxS(), c250 = px.c.slice(-250);
  $('#stockHead').innerHTML = `<div class="tick">${SYM}</div>
    <div class="cname">${esc(CO.n)}<small>${IS_INS ? 'Bảo hiểm' : 'Chứng khoán'} · ${CO.ex} · niêm yết ${dvn(CO.lst)} · <a href="${IS_INS ? 'bh' : 'ck'}.html">Ngành ${IS_INS ? 'Bảo hiểm' : 'Chứng khoán'}</a></small></div>
    <div class="hstats">
      <div class="hstat"><span>Giá ${dvn(last(px.d))}</span><b>${nf(last(px.c))}</b></div>
      <div class="hstat"><span>52 tuần</span><b>${nf(Math.min(...c250))} – ${nf(Math.max(...c250))}</b></div>
      <div class="hstat"><span>P/B</span><b>${nf(v.pb, 2)}x</b></div>
      <div class="hstat"><span>P/E</span><b>${nf(v.pe, 1)}x</b></div>
      <div class="hstat"><span>Vốn hóa</span><b>${nf(v.mcap / 1000, 1)} nghìn tỷ</b></div>
      <div class="hstat"><span>ROE 4Q (${qLbl(q)})</span><b>${pc(ttmRoe(R, q), 1)}</b></div>
    </div>`;
  $('#stamp').textContent = 'Dữ liệu dựng ngày ' + dvn(F.built);
  const sel = $('.bank-pick.on select'); if (sel) sel.value = 'dn.html?s=' + SYM;
  document.title = `${SYM} · ${CO.n} · FinSuccess`;
}

/* ---------------- TAB 1 · TỔNG QUAN ---------------- */
function dnFacts() {
  const R = QS(), q = last(R)[0], r = last(R), v = W.val[SYM], sh = sharesM(), roa = (() => { const n = ttm(R, q, x => qv(x, NP_K())), a = avgBal(R, q, x => qv(x, 'bs270')); return n != null && a ? n / a : null; })();
  const eps = v.pe ? lastPrice() / v.pe : null, fo = X.foPct != null ? `${nf(X.foPct * 100, 1)}%` + (X.foMax != null ? (X.foMax >= 1 ? ' · không giới hạn room' : ` / room ${nf(X.foMax * 100, 0)}%`) : '') : '—';
  const base = [['Vốn hóa', nf(v.mcap) + ' tỷ', dvn(v.d)], ['CP lưu hành', sh ? nf(sh, 1) + ' triệu' : '—', ''], ['BVPS · EPS TTM', `${nf(bvpsNow())} · ${nf(eps)}đ`, qLbl(q)], ['ROE · ROA', `${pc(ttmRoe(R, q), 1)} · ${pc(roa, 1)}`, '4 quý · ' + qLbl(q)]];
  let spec;
  if (IS_INS) { const m = insMetrics(SYM); spec = [['Phí BH gốc 4 quý', nf(m.gp) + ' tỷ', 'YoY ' + sg(m.gy)], [SYM === 'BVH' ? 'Tỷ lệ bồi thường' : 'Bồi thường · kết hợp', SYM === 'BVH' ? pc(m.lr, 1) : `${pc(m.lr, 0)} · ${pc(m.cr, 1)}`, '4 quý'], ['Danh mục / VCSH · LN TC / LNTT', `${nf(m.invEq, 2)}x · ${pc(m.fin, 0)}`, qLbl(q)], ['Sở hữu nước ngoài', fo, X.foD ? dvn(X.foD) : '']]; }
  else { const m = secMetrics(SYM, SEC_LASTQ) || {}, mg = nv(q, 'fn114_2'); spec = [['Cho vay / VCSH · Nợ vay / VCSH', `${pc(sv(r, 'bs114') / sv(r, 'bs400'), 0)} · ${pc(debtOf(r) / sv(r, 'bs400'), 0)}`, qLbl(q) + (mg ? ` · ký quỹ ${nf(mg / 1000, 1)} nghìn tỷ` : '')],
    ['Thị phần môi giới · cho vay', `${pc(m.brkSh, 1)} · ${pc(m.loanSh, 1)}`, 'nhóm niêm yết, 4Q đến ' + qLbl(SEC_LASTQ)], ['FVTPL / VCSH', pc(sv(r, 'bs112') / sv(r, 'bs400'), 0), qLbl(q)], ['Sở hữu nước ngoài', fo, X.foD ? dvn(X.foD) : '']]; }
  return [...base, ...spec].map(([l, b, s]) => `<div class="fact"><span>${l}</span><b>${b}</b><small>${s}</small></div>`).join('');
}
function dnChecklist() {
  const R = QS(), q = last(R)[0], r = last(R), b = band(1), v = W.val[SYM], roe = ttmRoe(R, q), r0 = rowAt(R, yoyQ(q));
  const pbt = qv(r, PBT_K()), pbt0 = qv(r0, PBT_K());
  const L = [{ l: 'P/B ≤ trung bình 20 quý − 1σ', v: xx(v.pb), t: b ? '≤ ' + xx(b.lo) : '—', ok: b ? v.pb <= b.lo : false },
    { l: 'ROE 4 quý', v: pc(roe, 1), t: '≥ 12%', ok: roe >= 0.12 },
    { l: 'LNTT quý gần nhất tăng so cùng kỳ', v: pbt0 ? sg(pbt / pbt0 - 1, 0) : '—', t: '> 0%', ok: pbt0 > 0 && pbt > pbt0 }];
  if (IS_INS) { const m = insMetrics(SYM); L.push({ l: 'Phí bảo hiểm gốc 4 quý tăng', v: sg(m.gy, 1), t: '> 0%', ok: m.gy > 0 });
    if (SYM !== 'BVH') L.push({ l: 'Tỷ lệ kết hợp 4 quý', v: pc(m.cr, 1), t: '< 100%', ok: m.cr < 1 });
    const dep = (() => { const a = noteRows().slice(-4).reduce((s, x) => s + (x[nk('fn23_1')] || 0), 0), p = ttm(R, q, x => qv(x, 'is50')); return a && p ? a / p : null; })();
    L.push({ l: 'Lãi tiền gửi / LNTT 4 quý', v: dep != null ? pc(dep, 0) : '—', t: '≤ 70%', ok: dep != null && dep <= 0.7 }); }
  else { L.push({ l: 'Cho vay / VCSH', v: pc(sv(r, 'bs114') / sv(r, 'bs400'), 0), t: '≤ 170%', ok: sv(r, 'bs114') / sv(r, 'bs400') <= 1.7 });
    L.push({ l: 'Nợ vay / VCSH', v: pc(debtOf(r) / sv(r, 'bs400'), 0), t: '≤ 200%', ok: debtOf(r) / sv(r, 'bs400') <= 2 });
    const st = (() => { const a = (nv(q, 'fn112_8') || 0) + (nv(q, 'fn112_9') || 0); return a ? a / sv(r, 'bs400') : null; })();
    L.push({ l: 'Cổ phiếu FVTPL / VCSH', v: st != null ? pc(st, 0) : '—', t: '≤ 30%', ok: st != null && st <= 0.3 }); }
  return L;
}
function dnRecent() {
  const t = new Date(F.built), inW = d => d && Math.abs((t - new Date(d)) / 864e5) <= 45;
  const E = [];
  W.events.filter(e => e.s === SYM).forEach(e => { const d = e.ex || e.rec; if (inW(d)) E.push({ d, t: `${e.t || 'Sự kiện'}: ${e.title || ''}${e.cash ? ` · cổ tức ${nf(e.cash)}đ/CP` : ''}`, imp: e.cash ? '+' : '?' }); });
  (X.news || []).forEach(n => { if (inW(n.d)) E.push({ d: n.d, t: n.t, u: n.u, src: n.src, imp: '?' }); });
  (X.trades || []).forEach(x => { if (inW(x.to || x.regTo) && x.big) E.push({ d: x.to || x.regTo, t: `${x.name} ${x.side === 'Mua' ? 'mua' : 'bán'} ${nf(Math.abs(x.exe || x.reg))} CP`, imp: x.side === 'Mua' ? '+' : '−' }); });
  W.rep.filter(r => r.s === SYM && inW(r.d)).forEach(r => E.push({ d: r.d, t: `${r.org}: ${r.rec || ''}${r.tp ? ' · giá mục tiêu ' + nf(r.tp) : ''} — ${r.title || ''}`, imp: /MUA/.test(r.rec || '') ? '+' : /BÁN/.test(r.rec || '') ? '−' : '?' }));
  return E.sort((a, b) => b.d.localeCompare(a.d)).slice(0, 12);
}
function dnOv() {
  const R = QS(), q = last(R)[0], v = W.val[SYM], dec = myDec(), tp = numv(dec.tp), px = lastPrice(), fw = fwd(), c = fw.c, b = band(1), bE = band(2);
  const P = W.plans.find(p => p.s === SYM && p.y === 2026), ytd = yearSum(2026, PBT_K()), ytd0 = (() => { const n = ytd.n, qs = R.filter(x => x[0].startsWith('2025')).slice(0, n); return qs.reduce((a, x) => a + (qv(x, PBT_K()) || 0), 0); })();
  const checks = dnChecklist(), recent = dnRecent();
  $('#ov').innerHTML = `<h2 class="sec">Tổng quan</h2>
  <div class="banner"><b>Quyết định hiện tại của analyst:</b> ${dec.status ? esc(dec.status) + (dec.action ? ' · ' + esc(dec.action) : '') : 'chưa nhập — vào tab 💎 FinSuccess để ghi quyết định, giá mục tiêu và vùng mua.'}</div>
  <div class="kpis">
    ${kpi('Giá hiện tại', nf(px) + 'đ', 'đóng cửa ' + dvn(last(pxS().d)))}
    ${kpi('Upside vs TP của tôi', tp ? sg(tp / px - 1) : '—', tp ? 'TP ' + nf(tp) + 'đ' : 'chưa nhập TP', tp ? cls(tp / px - 1) : '')}
    ${kpi('Upside vs consensus', c.up != null ? sg(c.up) : '—', c.tp ? `TP trung vị ${nf(c.tp)}đ · ${c.nTP} CTCK` : 'chưa có giá mục tiêu', c.up != null ? cls(c.up) : '')}
    ${kpi('P/B', xx(v.pb), (b ? 'TB 20 quý ' + xx(b.m) : '') + (fw.pbFwd ? ' · fwd ' + xx(fw.pbFwd) : ''))}
    ${kpi('P/E TTM', xx(v.pe, 1), (fw.peFwd ? 'fwd 2026F ' + xx(fw.peFwd, 1) : '') + (bE ? ' · TB ' + xx(bE.m, 1) : ''))}
    ${kpi('LNTT ' + (ytd.n ? ytd.n + 'Q/2026' : '2026'), nf(ytd.v) + ' tỷ', (ytd0 ? sg(ytd.v / ytd0 - 1) + ' YoY' : '') + (P && P.pbt ? ' · ' + pc(ytd.v / P.pbt, 0) + ' KH ' + nf(P.pbt) : ''), ytd0 ? cls(ytd.v / ytd0 - 1) : '')}
  </div>
  <article class="card"><h3 class="sub">Thông tin doanh nghiệp</h3><div class="facts">${dnFacts()}</div>
    <div class="src">Nguồn: ${WI} (BCTC hợp nhất, định giá theo phiên, thông tin niêm yết)</div></article>
  ${window.sdOvHtml ? sdOvHtml() : ''}
  ${card({ id: 'chPrice', title: `Giá cổ phiếu so với ngành ${IS_INS ? 'bảo hiểm' : 'chứng khoán'} và VN-Index`, sub: `đ/CP · giá đóng cửa đã điều chỉnh từ ${dvn(pxS().d[0])} · đường ngang là đỉnh và đáy 52 tuần · chỉ số ngành và VN-Index quy về cùng điểm xuất phát với giá ${SYM} ở đầu khung đang xem`,
    ins: dnPerfTxt(), src: WI + ' (giá điều chỉnh, chỉ số giá ngành, VN-Index)' })}
  <div class="grid g2 gap">
    <article class="card"><h3 class="sub">Checklist điều kiện mua</h3><p class="chart-sub">Ngưỡng tham khảo theo loại hình ${IS_INS ? 'bảo hiểm' : 'công ty chứng khoán'}. ✓ = đạt điều kiện.</p>
      <table><thead><tr><th>Điều kiện</th><th class="n">Hiện tại</th><th class="n">Ngưỡng</th><th></th></tr></thead><tbody>
      ${checks.map(k => `<tr><td>${k.l}</td><td class="n">${k.v}</td><td class="n">${k.t}</td><td>${k.ok ? '<span class="pill ok">✓</span>' : '<span class="pill risk">✗</span>'}</td></tr>`).join('')}
      </tbody></table><div class="note keep">Đạt ${checks.filter(k => k.ok).length}/${checks.length} điều kiện.</div></article>
    <article class="card"><h3 class="sub">Có gì mới ±45 ngày</h3><p class="chart-sub">Sự kiện, tin tức, báo cáo CTCK và giao dịch nội bộ trong 45 ngày quanh ${dvn(F.built)}</p>
      ${recent.length ? `<table><tbody>${recent.map(e => `<tr><td style="white-space:nowrap">${dvn(e.d)}</td><td>${imp(e.imp)}</td><td>${e.u ? `<a href="${esc(e.u)}" target="_blank" rel="noopener">${esc(e.t)}</a>` : esc(e.t)}${e.src ? ` <span class="muted">· ${esc(e.src)}</span>` : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Không có sự kiện trong khoảng này.</p>'}
      <div class="note keep"><a href="#events" data-go="events">Xem toàn bộ Catalyst &amp; Sự kiện →</a></div></article>
  </div>
  ${govSection()}`;
  $$('#ov [data-go]').forEach(a => a.onclick = e => { e.preventDefault(); show(a.dataset.go); window.scrollTo({ top: 0 }); });
  drawPrice(); drawGov();
}
function dnPerfTxt() {
  const P = pxS(), sp = W.spxL ? W.spxL[IS_INS ? '406' : '408'] : W.spx[IS_INS ? '406' : '408'], vn = W.vniL || W.vniD;
  const sm = {}; sp.d.forEach((d, i) => sm[d] = sp.c[i]);
  const lD = last(P.d), lc = last(P.c), at = days => { const t = new Date(new Date(lD) - days * 864e5).toISOString().slice(0, 10); const i = P.d.findIndex(d => d >= t && sm[d] != null && vn[d] != null); return i < 0 ? null : i; };
  const lS = sm[lD] ?? last(sp.c), lV = vn[lD] ?? vn[Object.keys(vn).sort().pop()];
  const one = (lab, i) => { if (i == null || i === 0 && lab === '3 năm' && (new Date(lD) - new Date(P.d[0])) / 864e5 < 1000) return ''; const d = P.d[i]; const r = lc / P.c[i] - 1, rs = lS / sm[d] - 1, rv = lV / vn[d] - 1;
    return `${lab}: <b>${SYM} ${sg(r)}</b>, ngành ${sg(rs)}, VN-Index ${sg(rv)} → ${SYM} ${r - rs >= 0 ? 'vượt' : 'kém'} ngành <b>${nf(Math.abs(r - rs) * 100, 1)} điểm %</b> và ${r - rv >= 0 ? 'vượt' : 'kém'} VN-Index ${nf(Math.abs(r - rv) * 100, 1)} điểm %. `; };
  const c250 = P.c.slice(-250), hi = Math.max(...c250), lo = Math.min(...c250), hiD = P.d[P.c.length - 250 + c250.indexOf(hi)] || P.d[P.c.indexOf(hi)], loD = P.d[P.c.length - 250 + c250.indexOf(lo)] || P.d[P.c.indexOf(lo)];
  return one('1 năm', at(365)) + one('3 năm', at(365 * 3)) + `Giá hiện tại <b>${nf(lc)}đ</b> thấp hơn đỉnh 52 tuần <b>${nf(hi)}đ</b> (${dvn(hiD)}) <b>${sg(lc / hi - 1)}</b> và cao hơn đáy <b>${nf(lo)}đ</b> (${dvn(loD)}) <b>${sg(lc / lo - 1)}</b>.`;
}
function drawPrice() {
  const P = pxS(), sp = W.spxL ? W.spxL[IS_INS ? '406' : '408'] : W.spx[IS_INS ? '406' : '408'], vn = W.vniL || W.vniD, st = P.c;
  const sm = {}; sp.d.forEach((d, i) => sm[d] = sp.c[i]);
  const firstOk = (r, i) => { while (i < r.length && (r[i] == null || st[i] == null)) i++; return i; };
  const rebase = { id: 'rebase', beforeUpdate(ch) { const lo = Math.max(0, Math.round((ch.options.scales.x || {}).min ?? 0)); ch.$lo = firstOk(st, lo);
    ch.data.datasets.forEach((d, k) => { if (!d.$raw) return; const r = d.$raw, i = firstOk(r, lo); d.$i0 = i; d.data = r.map((v, j) => v == null || j < i || i >= r.length ? null : v / r[i] * st[i]); }); } };
  const c250 = st.slice(-250), hi = Math.max(...c250), lo = Math.min(...c250);
  const B = (label, raw, color) => ({ type: 'line', label, $raw: raw, data: [], borderColor: color, backgroundColor: color, pointRadius: 0, borderWidth: 1.3, spanGaps: true });
  mk('chPrice', { type: 'line', plugins: [rebase], data: { labels: P.d.map(dvn), datasets: [line('Giá ' + SYM, st, C.navy, { pointRadius: 0, borderWidth: 1.8, unit: 'đ', dp: 0 }),
    B('Ngành ' + (IS_INS ? 'bảo hiểm' : 'chứng khoán'), P.d.map(d => sm[d] ?? null), C.purple), B('VN-Index', P.d.map(d => vn[d] ?? null), C.grey)] },
    options: { scales: { x: { ticks: { maxTicksLimit: 8 }, grid: { display: false } }, y: yNum('đ/CP') },
      plugins: { vref: { lines: [{ value: hi, label: '52W High ' + nf(hi), color: C.teal }, { value: lo, label: '52W Low ' + nf(lo), color: C.red }] },
        tooltip: { callbacks: { label: cx => { const ch = cx.chart, d = cx.dataset; if (!d.$raw) { const b0 = st[ch.$lo]; return `Giá ${SYM}: ${nf(cx.raw)}đ (${sg(cx.raw / b0 - 1)} từ đầu khung)`; } const r = d.$raw[cx.dataIndex]; return r == null ? null : `${d.label}: ${nf(r, 2)} điểm (${sg(r / d.$raw[d.$i0] - 1)} từ đầu khung)`; } } } } } }, { ts: true });
}
/* ---------- Quản trị & sở hữu ---------- */
const GT = { side: 'all', q: '', n: 20 };
function govSection() {
  const sh = (X.holders || W.holders.filter(h => h.s === SYM)).slice().sort((a, b) => b.pct - a.pct), big = sh.filter(h => h.pct >= 5), other = Math.max(0, 100 - sh.reduce((a, h) => a + (h.pct || 0), 0));
  const L = X.leaders || [], S = X.subs || [], top = sh[0];
  return `<h2 class="sec">Quản trị &amp; sở hữu</h2>
  <div class="grid g2 gap">
    ${card({ id: 'chOwn', title: 'Cơ cấu cổ đông', h: 'short', sub: `% vốn · cổ đông lớn công bố và phần còn lại · ngày chốt gần nhất ${dvn(sh.map(h => h.d).sort().pop())}`,
      body: `<div class="tscroll"><table class="fz"><thead><tr><th>Cổ đông</th><th class="n">Số CP</th><th class="n">Tỷ lệ</th><th>Ngày chốt</th></tr></thead><tbody>
        ${sh.map(h => `<tr><td>${esc(h.n)}</td><td class="n">${h.sh ? nf(h.sh) : '—'}</td><td class="n">${nf(h.pct, 2)}%</td><td>${dvn(h.d)}</td></tr>`).join('')}
        <tr><td>Cổ đông khác</td><td class="n">—</td><td class="n">${nf(other, 2)}%</td><td></td></tr></tbody></table></div>`,
      ins: top ? `${esc(top.n)} nắm <b>${nf(top.pct, 1)}%</b>; ${big.length ? `nhóm cổ đông lớn (≥ 5%) <b>${nf(big.reduce((a, h) => a + h.pct, 0), 1)}%</b>` : 'không cổ đông nào nắm từ 5% trở lên'}, phần còn lại khoảng <b>${nf(other, 1)}%</b>.${X.foPct != null ? ` Nhà đầu tư nước ngoài sở hữu ${nf(X.foPct * 100, 1)}%${X.foMax && X.foMax < 1 ? ` trên mức tối đa ${nf(X.foMax * 100, 0)}%` : ''}.` : ''}` : '', src: WI + ' (cổ đông lớn, room nước ngoài)' })}
    <article class="card"><h3 class="sub">Cơ cấu quản trị</h3><p class="chart-sub">HĐQT, Ban điều hành, Ban kiểm soát · người đương nhiệm</p>
      ${L.length ? `<div class="tscroll"><table class="fz"><thead><tr><th>Họ tên</th><th>Vai trò</th><th>Bổ nhiệm</th></tr></thead><tbody>${L.map(l => `<tr><td>${esc(l.n)}</td><td>${esc(l.role)}</td><td>${dvn(l.since)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Chưa có danh sách lãnh đạo.</p>'}
      <div class="src">Nguồn: ${WI} (chỉ tên, chức vụ, ngày bổ nhiệm)</div></article>
  </div>
  <article class="card"><h3 class="sub">Công ty con · liên doanh, liên kết</h3><p class="chart-sub">tỷ lệ sở hữu · vốn điều lệ tỷ đồng</p>
    ${S.length ? `<div class="tscroll"><table class="fz"><thead><tr><th>Đơn vị</th><th>Loại</th><th class="n">Sở hữu</th><th class="n">Vốn điều lệ</th><th>Mã CK</th><th>Ngày chốt</th></tr></thead><tbody>${S.map(r => `<tr><td>${esc(r.n)}</td><td>${esc(r.kind || '')}</td><td class="n">${r.pct == null ? '—' : nf(r.pct, 2) + '%'}</td><td class="n">${r.cap == null ? '—' : nf(r.cap)}</td><td>${r.tk || '—'}</td><td>${dvn(r.d)}</td></tr>`).join('')}</tbody></table></div><div class="src">Nguồn: ${WI} (công ty con, liên kết theo BCTC năm gần nhất)</div>` : '<div class="note keep">Chưa có danh sách công ty con trong dữ liệu — xem thuyết minh BCTC hợp nhất.</div>'}</article>
  <article class="card"><h3 class="sub">Giao dịch cổ đông lớn &amp; người nội bộ</h3>
    <div class="grid g2 gap gov2">
      <div><p class="chart-sub"><b>Giá ${SYM} và giao dịch đã thực hiện</b></p><div class="cbox"><canvas id="chGovPx" role="img" aria-label="Giá và giao dịch nội bộ"></canvas></div></div>
      <div><p class="chart-sub"><b>Mua / bán lũy kế theo khoảng thời gian</b> · nghìn CP</p><div class="cbox"><canvas id="chGovCum" role="img" aria-label="Mua bán lũy kế"></canvas></div></div>
    </div>
    <div class="note keep">Chấm xanh: mua; cam: bán. Chấm đặt ở ngày kết thúc giao dịch; giao dịch nhiều ngày không có giá từng lệnh. Khối lượng 0 không tính vào mua/bán lũy kế.</div>
    <h4 class="gov-h">Danh sách giao dịch</h4>
    <div class="picker" id="govSide">${[['all', 'Tất cả'], ['Mua', 'Mua'], ['Bán', 'Bán']].map(([k, l]) => `<button type="button" data-k="${k}" class="${k === GT.side ? 'on' : ''}">${l}</button>`).join('')}<input id="govQ" class="gov-q" placeholder="Tìm cổ đông / người nội bộ" aria-label="Tìm giao dịch"></div>
    <div id="govTbl"></div><div class="insight" id="govIns"></div>
    <div class="src">Nguồn: ${WI} (giao dịch cổ đông lớn, người nội bộ); giá đóng cửa điều chỉnh. Lợi suất tính từ phiên đầu sau ngày kết thúc giao dịch tới mốc 1/3/12 tháng, không hàm ý giao dịch gây ra biến động giá.</div></article>`;
}
function drawGov() {
  const sh = (X.holders || W.holders.filter(h => h.s === SYM)).slice().sort((a, b) => b.pct - a.pct), other = Math.max(0, 100 - sh.reduce((a, h) => a + (h.pct || 0), 0));
  mk('chOwn', { type: 'bar', data: { labels: [''], datasets: sh.map((h, i) => bar(h.n, [h.pct], [C.navy, C.teal, C.purple, C.gold, C.blue][i % 5], { stack: 's', unit: '%', dp: 2 })).concat([bar('Cổ đông khác', [other], '#d9dee8', { stack: 's', unit: '%', dp: 2 })]) },
    options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { stacked: true, max: 100, ticks: { callback: v => v + '%' } }, y: { stacked: true, grid: { display: false } } } } });
  const P = pxS(), TR = (X.trades || []).filter(t => t.exe), idx = Object.fromEntries(P.d.map((d, i) => [d, i]));
  const at = d => { if (!d) return null; let i = idx[d]; if (i == null) { const k = P.d.findIndex(x => x >= d); i = k < 0 ? null : k; } return i; };
  const buy = P.d.map(() => null), sell = P.d.map(() => null);
  TR.forEach(t => { const i = at(t.to); if (i == null) return; (t.side === 'Mua' ? buy : sell)[i] = P.c[i]; });
  mk('chGovPx', { type: 'line', data: { labels: P.d.map(dvn), datasets: [line('Giá điều chỉnh', P.c, C.blue, { pointRadius: 0, borderWidth: 1.3, unit: 'đ', dp: 0, fill: true, backgroundColor: 'rgba(41,56,168,.08)' }),
    line('Mua', buy, '#2bbfa4', { showLine: false, pointRadius: 6, unit: 'đ', dp: 0 }), line('Bán', sell, '#ef7a4a', { showLine: false, pointRadius: 6, unit: 'đ', dp: 0 })] },
    options: { scales: { x: { ticks: { maxTicksLimit: 8 }, grid: { display: false } }, y: yNum('đ/CP') } } }, { ts: true });
  const end = last(P.d), per = [[1, '1 tháng'], [3, '3 tháng'], [6, '6 tháng'], [12, '12 tháng'], [24, '24 tháng']];
  const sum = (m, side) => { const f = new Date(new Date(end).getTime() - m * 30.44 * 864e5).toISOString().slice(0, 10); return TR.filter(t => t.side === side && t.to && t.to > f).reduce((a, t) => a + Math.abs(t.exe), 0) / 1e3; };
  mk('chGovCum', { type: 'bar', data: { labels: per.map(p => p[1]), datasets: [bar('Mua (nghìn CP)', per.map(([m]) => sum(m, 'Mua')), '#2bbfa4', { unit: '', dp: 0 }), bar('Bán (nghìn CP)', per.map(([m]) => sum(m, 'Bán')), '#ef7a4a', { unit: '', dp: 0 })] },
    options: { indexAxis: 'y', scales: { x: yNum('', { suggestedMax: 10 }), y: { grid: { display: false } } },
      plugins: { title: { display: !per.some(([m]) => sum(m, 'Mua') + sum(m, 'Bán') > 0), text: 'Không có giao dịch thực hiện trong 24 tháng gần nhất', color: '#8a90a0', font: { size: 12, weight: 'normal' } } } } });
  const b12 = sum(12, 'Mua'), s12 = sum(12, 'Bán'), lt = TR.slice().sort((a, b) => b.to.localeCompare(a.to))[0], sh2 = sharesM();
  $('#govIns').innerHTML = `12 tháng gần nhất: mua <b>${nf(b12)}</b> nghìn CP, bán <b>${nf(s12)}</b> nghìn CP${sh2 ? ` — ${nf((b12 + s12) / 1e3 / sh2 * 100, 3)}% số CP lưu hành` : ''}. ${lt ? `Giao dịch gần nhất: ${esc(lt.name)}${lt.role ? ' (' + esc(lt.role) + ')' : ''} ${lt.side === 'Mua' ? 'mua' : 'bán'} ${nf(Math.abs(lt.exe))} CP, kết thúc ${dvn(lt.to)}.` : 'Chưa có giao dịch thực hiện trong dữ liệu.'}`;
  const ret = t => { const i = at(t.to); if (i == null || i + 1 >= P.c.length) return {}; const b0 = P.c[i + 1], o = {}; [['m1', 21], ['m3', 63], ['y1', 250]].forEach(([k, n]) => { if (i + 1 + n < P.c.length) o[k] = P.c[i + 1 + n] / b0 - 1; }); return o; };
  const table = () => {
    const q = GT.q.trim().toLowerCase(), rows = (X.trades || []).filter(t => (GT.side === 'all' || t.side === GT.side) && (!q || (t.name + ' ' + (t.role || '')).toLowerCase().includes(q))).sort((a, b) => (b.to || b.regTo || '').localeCompare(a.to || a.regTo || ''));
    const rg = (a, b) => a || b ? `${dvn(a)}${b && b !== a ? ' → ' + dvn(b) : ''}` : '—';
    $('#govTbl').innerHTML = `<p class="chart-sub">Hiển thị ${Math.min(GT.n, rows.length)} / ${rows.length} bản ghi</p><div class="tscroll"><table class="fz"><thead><tr><th>Người giao dịch / quan hệ</th><th>Loại tin</th><th>Mua / bán</th><th class="n">Đăng ký (CP)</th><th class="n">Thực hiện (CP)</th><th>Thời gian đăng ký</th><th>Thời gian thực hiện</th><th class="n">Sở hữu sau</th><th class="n">Giá sau 1T · 3T · 12T</th></tr></thead><tbody>
      ${rows.slice(0, GT.n).map(t => { const r = t.exe ? ret(t) : {}; return `<tr><td>${esc(t.name)}${t.role ? `<div class="src">${esc(t.role)}</div>` : ''}</td><td>${esc(t.type || '—')}</td><td><b class="${t.side === 'Mua' ? 'pdl-u' : 'pdl-d'}">${esc(t.side || '—')}</b></td><td class="n">${t.reg ? nf(Math.abs(t.reg)) : '—'}</td><td class="n">${t.exe ? nf(Math.abs(t.exe)) : '—'}</td><td>${rg(t.regFrom, t.regTo)}</td><td>${rg(t.from, t.to)}</td><td class="n">${t.afterPct != null ? nf(t.afterPct, 2) + '%' : t.after ? nf(t.after) : '—'}</td><td class="n">${['m1', 'm3', 'y1'].map(k => r[k] != null ? `<span class="${r[k] >= 0 ? 'pdl-u' : 'pdl-d'}">${sg(r[k], 1)}</span>` : '—').join(' · ')}</td></tr>`; }).join('') || '<tr><td colspan="9" class="muted">Không có giao dịch trong dữ liệu.</td></tr>'}</tbody></table></div>
      ${rows.length > GT.n ? '<button type="button" class="btn ghost" id="govMore">Hiện thêm</button>' : ''}`;
    const mb = $('#govMore'); if (mb) mb.onclick = () => { GT.n += 20; table(); };
  };
  $$('#govSide button').forEach(b => b.onclick = () => { GT.side = b.dataset.k; GT.n = 20; $$('#govSide button').forEach(x => x.classList.toggle('on', x === b)); table(); });
  const qi = $('#govQ'); if (qi) { qi.value = GT.q; qi.oninput = () => { GT.q = qi.value; GT.n = 20; table(); }; }
  table();
}

/* ---------------- TAB 2 · TÀI CHÍNH ---------------- */
let pct100 = {};
/* waterfall cơ cấu bảng cân đối (như trang ngân hàng): % tổng, tooltip ghi tỷ đồng */
const WF_COL = [C.grey, C.gold, C.tealInk, C.navy, C.teal, C.purple, '#b9c0cf'];
function wfParts() {   // [tài sản], [nguồn vốn], tổng, kỳ — số tỷ đồng, kỳ BCTC mới nhất
  const A = QS(), rq = last(A); if (!rq) return null;
  if (!IS_INS) {
    const v = k => sv(rq, k) || 0, ta = v('bs270'); if (!ta) return null;
    const a = [['Tiền', v('bs111')], ['FVTPL', v('bs112')], ['HTM', v('bs113')], ['Cho vay ký quỹ & ứng trước', v('bs114')], ['AFS', v('bs115')]];
    a.push(['Phải thu & tài sản khác', ta - a.reduce((x, p) => x + p[1], 0)]);
    const bonds = v('bs316') + v('bs346'), l = [['Vay ngắn hạn', v('bs311')], ['Trái phiếu phát hành', bonds], ['Nợ khác', ta - v('bs400') - v('bs311') - bonds], ['Vốn chủ sở hữu', v('bs400')]];
    return { a, l, ta, q: rq[0] };
  }
  const B = X.bsw && X.bsw.length ? X.bsw[X.bsw.length - 1] : null; if (!B) return null;
  const b = B[1], v = k => b[k] || 0, ta = v('bs270'); if (!ta) return null;
  const a = [['Tiền', v('bs110')], ['Đầu tư tài chính ngắn hạn', v('bs120')], ['Phải thu', v('bs130') + v('bs210')], ['Tài sản tái bảo hiểm', v('bs190')], ['Đầu tư tài chính dài hạn', v('bs250')], ['TSCĐ & BĐS đầu tư', v('bs220') + v('bsx10')]];
  a.push(['Tài sản khác', ta - a.reduce((x, p) => x + p[1], 0)]);
  const debt = v('bs311') + v('bs334'), l = [['Dự phòng nghiệp vụ', v('bs329')], ['Phải trả hoạt động bảo hiểm', v('bs312_1')], ['Vay', debt], ['Nợ khác', v('bs300') - v('bs329') - v('bs312_1') - debt], ['Vốn chủ sở hữu', v('bs400')]];
  return { a: a.filter(p => Math.abs(p[1]) > ta * 0.001), l: l.filter(p => Math.abs(p[1]) > ta * 0.001), ta, q: B[0] };
}
function wfCards() {
  const W0 = wfParts(); if (!W0) return '';
  const sh = (arr, n) => (arr.find(p => p[0] === n) || [0, 0])[1] / W0.ta * 100;
  const top = arr => arr.slice().filter(p => p[0] !== 'Vốn chủ sở hữu').sort((x, y) => y[1] - x[1]).slice(0, 2).map(p => `${/^[A-Z]{2,}/.test(p[0]) ? p[0] : p[0][0].toLowerCase() + p[0].slice(1)} <b>${nf(p[1] / W0.ta * 100, 1)}%</b>`).join(', ');
  const insA = `${qLbl(W0.q)}: tổng tài sản ${nf(W0.ta / 1000, 1)} nghìn tỷ; lớn nhất là ${top(W0.a)}.`;
  const insL = IS_INS ? `Dự phòng nghiệp vụ chiếm <b>${nf(sh(W0.l, 'Dự phòng nghiệp vụ'), 1)}%</b> nguồn vốn — tiền thu phí trước, chi bồi thường sau là nguồn vốn chính để đầu tư; vốn chủ ${nf(sh(W0.l, 'Vốn chủ sở hữu'), 1)}%.`
    : `Nợ vay (vay ngắn hạn và trái phiếu) chiếm <b>${nf(sh(W0.l, 'Vay ngắn hạn') + sh(W0.l, 'Trái phiếu phát hành'), 1)}%</b> nguồn vốn, vốn chủ ${nf(sh(W0.l, 'Vốn chủ sở hữu'), 1)}%.`;
  return card({ id: 'dnWfA', title: `Cơ cấu tài sản ${qLbl(W0.q)}`, sub: '% tổng tài sản · rê chuột xem tỷ đồng', ins: insA, src: WI + ' (BCTC hợp nhất)' })
    + card({ id: 'dnWfL', title: `Cơ cấu nguồn vốn ${qLbl(W0.q)}`, sub: '% tổng nguồn vốn · rê chuột xem tỷ đồng', ins: insL, src: WI + ' (BCTC hợp nhất)' });
}
function wfDraw() {
  const W0 = wfParts(); if (!W0) return;
  const one = (id, parts, tl) => {
    let acc = 0; const P = parts.map(([l, v]) => [l, v / W0.ta * 100, v]), data = P.map(([, p]) => { const r = [acc, acc + p]; acc += p; return r; }), tyv = P.map(p => p[2]).concat([W0.ta]);
    mk(id, { type: 'bar', data: { labels: parts.map(p => p[0]).concat([tl]), datasets: [{ label: '% tổng', data: data.concat([[0, 100]]), backgroundColor: parts.map((_, i) => WF_COL[i % WF_COL.length]).concat([C.navy]), dp: 1 }] },
      options: { layout: { padding: { top: 18 } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${nf(c.raw[1] - c.raw[0], 1)}% · ${nf(tyv[c.dataIndex])} tỷ đồng` } } },
        scales: { y: { min: 0, max: 100, ticks: { callback: v => v + '%' } }, x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, callback: function (v) { const l = this.getLabelForValue(v); if (l.length <= 12) return l; const w = l.split(' '), h = Math.ceil(w.length / 2); return [w.slice(0, h).join(' '), w.slice(h).join(' ')]; } } } } },
      plugins: [{ id: 'wfLabels', afterDatasetsDraw(ch) { const ctx = ch.ctx; ch.getDatasetMeta(0).data.forEach((b, i) => { const r = ch.data.datasets[0].data[i]; ctx.save(); ctx.fillStyle = '#303540'; ctx.font = '600 11px Arial'; ctx.textAlign = 'center'; ctx.fillText(nf(r[1] - r[0], 1) + '%', b.x, Math.min(b.y, b.base) - 4); ctx.restore(); }); } }] });
  };
  one('dnWfA', W0.a, 'Tổng tài sản'); one('dnWfL', W0.l, 'Tổng nguồn vốn');
}
function stackCard(id, title, sub, ins, src) { return card({ id, title, sub: sub + ' · bấm nút để xem tỷ trọng', ins, src, body: `<div class="picker" data-pct="${id}"><button type="button" data-m="abs" class="on">Giá trị</button><button type="button" data-m="pct">100% tỷ trọng</button></div>` }); }
function stackDraw(id, labels, sets, unit) {   // cột chồng có chế độ 100%
  const draw = m => { const tot = labels.map((_, i) => sets.reduce((a, s) => a + Math.max(0, s.data[i] || 0), 0));
    mk(id, { type: 'bar', data: { labels, datasets: sets.map(s => bar(s.label, m === 'pct' ? s.data.map((v, i) => tot[i] ? (v || 0) / tot[i] * 100 : null) : s.data, s.color, { stack: 's', unit: m === 'pct' ? '%' : unit, dp: 1 })) },
      options: { scales: { x: { stacked: true, grid: { display: false } }, y: m === 'pct' ? yPct('%', { stacked: true, max: 100 }) : yNum(unit.trim(), { stacked: true }) } } }); };
  const box = document.querySelector(`[data-pct="${id}"]`); if (box) $$('button', box).forEach(b => b.onclick = () => { $$('button', box).forEach(x => x.classList.toggle('on', x === b)); draw(b.dataset.m); });
  draw('abs');
}
function dnFin() {
  const A = QS(), R = A.filter(r => r[0] >= '2019Q1'), L = R.map(r => qLbl(r[0])), q = last(R)[0], rq = last(R), rq0 = rowAt(A, yoyQ(q));
  const tyy = (r, k) => { const v = qv(r, k); return v == null ? null : v / 1000; };
  const years = [...new Set(A.map(r => r[0].slice(0, 4)))].filter(y => y >= '2018'), cy = last(years);
  const P = y => W.plans.find(p => p.s === SYM && String(p.y) === y);
  const pbtQ = qv(rq, PBT_K()), pbtQ0 = qv(rq0, PBT_K());
  const sec = (n, t) => `<h3 class="sec2">${n} · ${t}</h3>`;
  const yr = (y, f) => A.filter(r => r[0].startsWith(y)).reduce((a, r) => a + (f(r) || 0), 0), nQ = y => A.filter(r => r[0].startsWith(y)).length;
  let html;
  if (!IS_INS) {
    const debt = debtOf(rq), eq = sv(rq, 'bs400'), mg = nv(q, 'fn114_2');
    const cofT = (() => { const i = ttm(A, q, x => Math.abs(sv(x, 'is52') || 0)), d = avgBal(A, q, debtOf); return i && d ? i / d : null; })();
    const yldT = (() => { const a = ttm(A, q, x => sv(x, 'is03')), b = avgBal(A, q, x => sv(x, 'bs114')); return a != null && b ? a / b : null; })();
    html = `${sec(1, 'Bảng cân đối')}
    <div class="grid g2 gap">
      ${wfCards()}
      ${stackCard('dnA', 'Tài sản theo quý', 'nghìn tỷ đồng · cột chồng', `${qLbl(q)}: tổng tài sản ${nf(sv(rq, 'bs270') / 1000, 1)} nghìn tỷ; cho vay ${pc(sv(rq, 'bs114') / sv(rq, 'bs270'), 0)}, FVTPL ${pc(sv(rq, 'bs112') / sv(rq, 'bs270'), 0)}, HTM + AFS ${pc(((sv(rq, 'bs113') || 0) + (sv(rq, 'bs115') || 0)) / sv(rq, 'bs270'), 0)} tổng tài sản.`, WI + ' (BCTC hợp nhất)')}
      ${stackCard('dnL', 'Nguồn vốn theo quý', 'nghìn tỷ đồng · cột chồng', `Vay và trái phiếu phát hành ${nf(debt / 1000, 1)} nghìn tỷ, bằng ${pc(debt / eq, 0)} vốn chủ (cùng kỳ ${pc(debtOf(rq0) / sv(rq0, 'bs400'), 0)}).`, WI + ' (BCTC hợp nhất)')}
      ${card({ id: 'dnMg', title: 'Cho vay ký quỹ và ứng trước', sub: 'nghìn tỷ đồng · đường: cho vay / VCSH (trục phải), vạch đỏ: trần 200%', ins: `${mg ? `Dư nợ ký quỹ ${nf(mg / 1000, 1)} nghìn tỷ, bằng ${pc(mg / eq, 0)} vốn chủ. ` : ''}${sv(rq, 'bs114') / eq > 1.7 ? 'Cho vay đã từ 170% vốn chủ: dư nợ năm sau chỉ tăng theo mức tăng vốn chủ.' : 'Còn dư địa mở rộng cho vay trước trần 200% vốn chủ.'}`, src: WI + ' (thuyết minh cho vay)' })}
      ${card({ id: 'dnN', title: 'Danh mục FVTPL: cổ phiếu và thu nhập cố định', sub: 'nghìn tỷ đồng · giá trị hợp lý · đường: cổ phiếu FVTPL / VCSH (trục phải)', ins: 'Cổ phiếu FVTPL trên 30% vốn chủ thì lợi nhuận năm sau tăng giảm theo giá cổ phiếu cuối kỳ; trái phiếu, chứng chỉ tiền gửi cho thu nhập ổn định theo lãi suất.', src: WI + ' (thuyết minh FVTPL)' })}
    </div>${window.sdFinHtml ? sdFinHtml() : ''}
    ${sec(2, 'Kết quả kinh doanh')}
    <div class="grid g2 gap">
      ${card({ id: 'dnY', title: `Lợi nhuận trước thuế theo năm + kế hoạch ${cy}`, sub: `tỷ đồng · ${cy}: cột đặc = lũy kế ${nQ(cy)} quý, viền đứt = kế hoạch ĐHĐCĐ`, ins: dnPlanIns(), src: WI + ' (BCTC, kế hoạch ĐHĐCĐ)' })}
      ${stackCard('dnRY', 'Cơ cấu doanh thu hoạt động theo năm', 'tỷ đồng', 'Cơ cấu cho biết mức phụ thuộc vào thị trường: môi giới và lãi FVTPL biến động theo thanh khoản và giá; lãi cho vay, HTM ổn định hơn.', WI)}
      ${card({ id: 'dnIS', title: 'Doanh thu theo mảng và LNTT theo quý', sub: 'tỷ đồng · lãi FVTPL đã trừ lỗ FVTPL', ins: `${qLbl(q)}: môi giới ${nf(sv(rq, 'is06'))} tỷ, lãi cho vay ${nf(sv(rq, 'is03'))} tỷ, lãi FVTPL ròng ${nf((sv(rq, 'is01') || 0) + (sv(rq, 'is21') || 0))} tỷ; LNTT ${nf(pbtQ)} tỷ${pbtQ0 > 0 ? ` (${sg(pbtQ / pbtQ0 - 1)} so cùng kỳ)` : ''}.`, src: WI })}
      ${card({ id: 'dnRz', title: 'Lợi nhuận đã thực hiện và chưa thực hiện', sub: 'tỷ đồng/quý · chưa thực hiện = đánh giá lại danh mục theo giá cuối kỳ', ins: 'Lợi nhuận chưa thực hiện trên 35% lợi nhuận trước thuế thì nên so cùng kỳ bằng lợi nhuận đã thực hiện, vì phần chưa thực hiện đảo chiều khi giá giảm.', src: WI })}
    </div>
    ${sec(3, 'Hiệu quả và chi phí vốn')}
    <div class="grid g2 gap">
      ${card({ id: 'dnR2', title: 'ROE và ROA', sub: '% · 4 quý trượt', ins: `ROE 4 quý ${pc(ttmRoe(A, q), 1)}.`, src: WI })}
      ${card({ id: 'dnNim', title: 'Lợi suất cho vay và chi phí vốn vay', sub: '% · 4 quý trượt · lợi suất = lãi cho vay và phải thu / dư nợ bình quân; chi phí vốn = chi phí lãi vay / nợ vay bình quân', ins: `Lợi suất cho vay ${pc(yldT, 1)}, chi phí vốn vay ${pc(cofT, 1)} → chênh lệch ${yldT != null && cofT != null ? nf((yldT - cofT) * 100, 1) + ' điểm %' : '—'}. Chi phí lãi vay của một số công ty nằm trong chi phí hoạt động nên chi phí vốn có thể thấp hơn thực tế.`, src: WI })}
      ${card({ id: 'dnBrk', title: 'Môi giới: thị phần doanh thu và biên', sub: '% · 4 quý trượt · thị phần trong tổng các CTCK niêm yết', src: WI })}
      ${card({ id: 'dnCir', title: 'Chi phí quản lý so với doanh thu hoạt động', sub: '% · 4 quý trượt', src: WI })}
      ${card({ id: 'dnR1', title: 'Đòn bẩy: cho vay, nợ vay và FVTPL so với vốn chủ', sub: '% VCSH · cuối quý', src: WI })}
      ${card({ id: 'dnEq', title: 'Vốn chủ sở hữu và tổng tài sản / vốn chủ', sub: 'cột = VCSH (nghìn tỷ, trục trái) · đường = tổng tài sản / VCSH (lần, trục phải)', src: WI })}
    </div>`;
  } else {
    const m = insMetrics(SYM), ret = (() => { const g = ttm(A, q, x => (iv(x, 'is01_1') || 0) + (iv(x, 'is01_2') || 0)), c = ttm(A, q, x => Math.abs(iv(x, 'is02') || 0)); return g ? 1 - c / g : null; })();
    const invY = (() => { const p = ttm(A, q, x => iv(x, 'is25')), a = avgBal(A, q, x => (iv(x, 'bs120') || 0) + (iv(x, 'bs250') || 0)); return p != null && a ? p / a : null; })();
    html = `${sec(1, 'Bảng cân đối')}
    <div class="grid g2 gap">
      ${wfCards()}
      ${stackCard('dnA', 'Tài sản theo quý', 'nghìn tỷ đồng · cột chồng', `${qLbl(q)}: đầu tư tài chính ${nf(((iv(rq, 'bs120') || 0) + (iv(rq, 'bs250') || 0)) / 1000, 1)} nghìn tỷ, bằng ${nf(m.invEq, 2)} lần vốn chủ.`, WI + ' (BCTC hợp nhất)')}
      ${stackCard('dnL', 'Nguồn vốn theo quý', 'nghìn tỷ đồng · cột chồng', `Nợ phải trả, chủ yếu dự phòng nghiệp vụ, bằng ${pc(1 - iv(rq, 'bs400') / iv(rq, 'bs270'), 0)} tổng nguồn vốn.`, WI + ' (BCTC hợp nhất)')}
      ${X.inv ? stackCard('dnInv', 'Cơ cấu danh mục đầu tư', 'nghìn tỷ đồng · cuối quý', 'Tiền gửi và trái phiếu chiếm phần lớn danh mục, nên lợi suất đầu tư đi theo lãi suất huy động và lợi suất trái phiếu với độ trễ.', WI + ' (thuyết minh đầu tư tài chính)') : ''}
      ${card({ id: 'dnInvY', title: 'Lợi suất danh mục đầu tư', sub: '% · lợi nhuận hoạt động tài chính 4 quý / đầu tư tài chính bình quân', ins: `Lợi suất danh mục 4 quý ${pc(invY, 1)}.`, src: WI })}
    </div>
    ${sec(2, 'Kết quả kinh doanh')}
    <div class="grid g2 gap">
      ${card({ id: 'dnY', title: `Lợi nhuận trước thuế theo năm + kế hoạch ${cy}`, sub: `tỷ đồng · ${cy}: cột đặc = lũy kế ${nQ(cy)} quý, viền đứt = kế hoạch ĐHĐCĐ`, ins: dnPlanIns(), src: WI + ' (BCTC, kế hoạch ĐHĐCĐ)' })}
      ${card({ id: 'dnPY', title: 'Doanh thu phí theo năm', sub: 'tỷ đồng · phí gốc và phí nhận tái; đường: tăng trưởng phí gốc (trục phải)', src: WI })}
      ${card({ id: 'dnIS', title: 'Phí bảo hiểm, nhượng tái và bồi thường theo quý', sub: 'tỷ đồng · đường: tỷ lệ giữ lại (trục phải)', ins: `Tỷ lệ giữ lại 4 quý ${pc(ret, 0)}; phí nhận tái chiếm ${pc(m.re, 0)} tổng phí.${m.re > 0.1 ? ' Nhận tái trên 10% nên tỷ lệ bồi thường không so thẳng với doanh nghiệp chỉ bán gốc.' : ''}`, src: WI })}
      ${card({ id: 'dnR2', title: 'Nguồn lợi nhuận: nghiệp vụ và đầu tư', sub: 'tỷ đồng/quý · lợi nhuận gộp kinh doanh bảo hiểm, lợi nhuận hoạt động tài chính, LNTT', ins: `Lợi nhuận tài chính bằng ${pc(m.fin, 0)} lợi nhuận trước thuế 4 quý.${m.fin > 1 ? ' Nghiệp vụ bảo hiểm sau chi phí đang lỗ, đầu tư bù lại.' : ''}`, src: WI })}
    </div>
    ${sec(3, 'Hiệu quả nghiệp vụ và đầu tư')}
    <div class="grid g2 gap">
      ${card({ id: 'dnR1', title: SYM === 'BVH' ? 'Tỷ lệ bồi thường' : 'Tỷ lệ bồi thường, chi phí và kết hợp', sub: '% · 4 quý trượt' + (SYM === 'BVH' ? ' · chi bồi thường nhân thọ gồm tăng dự phòng toán học' : ''), ins: SYM === 'BVH' ? 'Ở doanh nghiệp nhân thọ, chi bồi thường gồm cả tăng dự phòng toán học, nên tỷ lệ bồi thường cao không có nghĩa nghiệp vụ lỗ.' : `Tỷ lệ kết hợp 4 quý ${pc(m.cr, 1)}${m.cr < 1 ? ': nghiệp vụ có lãi trước thu nhập đầu tư.' : ': nghiệp vụ lỗ, phụ thuộc thu nhập đầu tư.'}`, src: WI })}
      ${card({ id: 'dnDep', title: 'Lãi tiền gửi so với lợi nhuận trước thuế', sub: 'tỷ đồng/quý', ins: 'Lãi tiền gửi trên 70% lợi nhuận trước thuế thì dự phóng lợi nhuận dựa trước hết vào số dư tiền gửi và lãi suất huy động.', src: WI + ' (thuyết minh BCTC)' })}
      ${card({ id: 'dnRoe', title: 'ROE và ROA', sub: '% · 4 quý trượt', ins: `ROE 4 quý ${pc(m.roe, 1)}.`, src: WI })}
      ${card({ id: 'dnEq', title: 'Vốn chủ sở hữu và tổng tài sản / vốn chủ', sub: 'cột = VCSH (nghìn tỷ, trục trái) · đường = tổng tài sản / VCSH (lần, trục phải)', src: WI })}
      ${SYM === 'BVH' ? card({ id: 'dnBvh', title: 'Chi trả bảo hiểm nhân thọ theo loại', sub: 'tỷ đồng/quý · đáo hạn, giá trị hoàn lại (hủy hợp đồng), bồi thường; quý trống là chưa công bố chi tiết', src: WI + ' (thuyết minh chi bồi thường)' }) : ''}
    </div>${SYM === 'BVH' ? surrenderBlock() : ''}`;
  }
  $('#fin').innerHTML = `<h2 class="sec">Tài chính</h2><p class="sec-sub">BCTC hợp nhất theo quý từ 2019, quý mới nhất ${qLbl(q)}. Bảng cân đối → kết quả kinh doanh → hiệu quả.</p>${html}`;
  dnFinDraw(A, R, L, years, cy, P);
  if (window.sdFinDraw) sdFinDraw();
}
function dnPlanIns() {
  const ys = [...new Set(QS().map(r => r[0].slice(0, 4)))], done = W.plans.filter(p => p.s === SYM && p.pbt).sort((a, b) => b.y - a.y).map(p => { const s = yearSum(p.y, PBT_K()); return { y: p.y, r: s.v / p.pbt, n: s.n }; });
  if (!done.length) return 'Chưa có kế hoạch ĐHĐCĐ trong dữ liệu.';
  return done.slice(0, 4).map(d => `${d.y}: <b>${pc(d.r, 0)}</b> kế hoạch${d.n < 4 ? ` (${d.n} quý)` : ''}`).join(' · ') + '.';
}
function dnFinDraw(A, R, L, years, cy, P) {
  wfDraw();
  const st = { x: { stacked: true, grid: { display: false } }, y: yNum('nghìn tỷ đồng', { stacked: true }) };
  const tyy = (r, k) => { const v = qv(r, k); return v == null ? null : v / 1000; };
  const yr = (y, f) => A.filter(r => r[0].startsWith(y)).reduce((a, r) => a + (f(r) || 0), 0), nQ = y => A.filter(r => r[0].startsWith(y)).length;
  const pl = (P(cy) || {}).pbt;
  mk('dnY', { type: 'bar', data: { labels: years.map(y => y === cy && nQ(y) < 4 ? `${y} (${nQ(y)}Q)` : y), datasets: [
    bar('LNTT thực hiện', years.map(y => yr(y, x => qv(x, PBT_K()))), years.map(y => y === cy && nQ(y) < 4 ? C.teal : C.navy), { unit: ' tỷ', grouped: false }),
    bar('Kế hoạch ĐHĐCĐ', years.map(y => y === cy ? pl ?? null : null), 'rgba(0,0,0,0)', { unit: ' tỷ', borderColor: C.navy, borderWidth: 1.5, borderDash: [5, 4], grouped: false }),
    line('Kế hoạch các năm trước', years.map(y => y !== cy ? ((P(y) || {}).pbt ?? null) : null), C.gold, { showLine: false, pointRadius: 5, unit: ' tỷ', dp: 0 })] },
    options: { scales: { x: { grid: { display: false } }, y: yNum('tỷ đồng') } } });
  if (!IS_INS) {
    const oth = r => (sv(r, 'bs270') - ['bs111', 'bs112', 'bs113', 'bs114', 'bs115'].reduce((a, k) => a + (sv(r, k) || 0), 0)) / 1000;
    stackDraw('dnA', L, [{ label: 'Tiền', data: R.map(r => tyy(r, 'bs111')), color: C.grey }, { label: 'FVTPL', data: R.map(r => tyy(r, 'bs112')), color: C.gold }, { label: 'HTM', data: R.map(r => tyy(r, 'bs113')), color: C.tealInk }, { label: 'Cho vay', data: R.map(r => tyy(r, 'bs114')), color: C.navy }, { label: 'AFS', data: R.map(r => tyy(r, 'bs115')), color: C.teal }, { label: 'Khác', data: R.map(oth), color: '#d5d9e2' }], ' nghìn tỷ');
    stackDraw('dnL', L, [{ label: 'Vay ngắn hạn', data: R.map(r => tyy(r, 'bs311')), color: C.purple }, { label: 'Trái phiếu phát hành', data: R.map(r => ((sv(r, 'bs316') || 0) + (sv(r, 'bs346') || 0)) / 1000), color: C.gold }, { label: 'Nợ khác', data: R.map(r => (sv(r, 'bs270') - sv(r, 'bs400') - debtOf(r)) / 1000), color: '#d5d9e2' }, { label: 'Vốn chủ sở hữu', data: R.map(r => tyy(r, 'bs400')), color: C.navy }], ' nghìn tỷ');
    const NQ = noteRows().map(x => x[0]).filter(x => x >= '2022Q1').sort();
    mk('dnMg', { type: 'bar', data: { labels: R.map(r => qLbl(r[0])), datasets: [
      bar('Ký quỹ', R.map(r => { const v = nv(r[0], 'fn114_2'); return v ? v / 1000 : null; }), C.navy, { stack: 's', unit: ' nghìn tỷ', dp: 1 }),
      bar('Ứng trước tiền bán', R.map(r => { const v = nv(r[0], 'fn114_3'); return v ? v / 1000 : null; }), C.teal, { stack: 's', unit: ' nghìn tỷ', dp: 1 }),
      bar('Cho vay (chưa tách)', R.map(r => nv(r[0], 'fn114_2') ? null : tyy(r, 'bs114')), '#c9ced8', { stack: 's', unit: ' nghìn tỷ', dp: 1 }),
      line('Cho vay / VCSH', R.map(r => sv(r, 'bs114') / sv(r, 'bs400') * 100), C.red, { yAxisID: 'y1', dp: 0, pointRadius: 1.5 })] },
      options: { plugins: { vref: { lines: [{ axis: 'y1', value: 200, label: 'Trần 200%', color: C.red }] } }, scales: { x: { stacked: true, grid: { display: false } }, y: yNum('nghìn tỷ đồng', { stacked: true }), y1: yPct('% VCSH', { position: 'right', grid: { display: false }, suggestedMax: 210 }) } } });
    mk('dnN', { type: 'bar', data: { labels: NQ.map(qLbl), datasets: [bar('Cổ phiếu', NQ.map(x => ((nv(x, 'fn112_8') || 0) + (nv(x, 'fn112_9') || 0)) / 1000), C.gold, { stack: 's', unit: ' nghìn tỷ', dp: 1 }), bar('Trái phiếu, chứng chỉ tiền gửi', NQ.map(x => ((nv(x, 'fn112_11') || 0) + (nv(x, 'fn112_12') || 0)) / 1000), C.navy, { stack: 's', unit: ' nghìn tỷ', dp: 1 }),
      line('Cổ phiếu / VCSH', NQ.map(x => { const r = rowAt(A, x); return r ? ((nv(x, 'fn112_8') || 0) + (nv(x, 'fn112_9') || 0)) / sv(r, 'bs400') * 100 : null; }), C.red, { yAxisID: 'y1', dp: 0 })] },
      options: { scales: { x: { stacked: true, grid: { display: false } }, y: yNum('nghìn tỷ đồng', { stacked: true }), y1: yPct('% VCSH', { position: 'right', grid: { display: false } }) } } });
    const seg = [['Môi giới', x => sv(x, 'is06'), C.navy], ['Lãi cho vay', x => sv(x, 'is03'), C.teal], ['Lãi FVTPL ròng', x => (sv(x, 'is01') || 0) + (sv(x, 'is21') || 0), C.gold], ['HTM + AFS', x => (sv(x, 'is02') || 0) + (sv(x, 'is04') || 0), C.grey], ['Bảo lãnh, tư vấn', x => (sv(x, 'is07') || 0) + (sv(x, 'is10') || 0), C.purple]];
    stackDraw('dnRY', years.map(y => nQ(y) < 4 ? `${y} (${nQ(y)}Q)` : y), seg.map(([l, f, c]) => ({ label: l, data: years.map(y => yr(y, f)), color: c })), ' tỷ');
    mk('dnIS', { type: 'bar', data: { labels: L, datasets: seg.map(([l, f, c]) => bar(l, R.map(f), c, { stack: 's', unit: ' tỷ' })).concat([line('LNTT', R.map(r => sv(r, 'is90')), C.red, { unit: ' tỷ', dp: 0, pointRadius: 1.5 })]) }, options: { scales: { x: { stacked: true, grid: { display: false } }, y: yNum('tỷ đồng', { stacked: true }) } } });
    const XQ = X.rz || [], xk = (q2, i) => { const r = XQ.find(z => z[0] === q2); return r ? r[i] : null; };
    mk('dnRz', { type: 'bar', data: { labels: L, datasets: [bar('Đã thực hiện', R.map(r => xk(r[0], 1)), C.navy, { stack: 's', unit: ' tỷ' }), bar('Chưa thực hiện', R.map(r => xk(r[0], 2)), C.gold, { stack: 's', unit: ' tỷ' }), line('LNTT', R.map(r => sv(r, 'is90')), C.red, { unit: ' tỷ', dp: 0, pointRadius: 1.5 })] }, options: { scales: { x: { stacked: true, grid: { display: false } }, y: yNum('tỷ đồng', { stacked: true }) } } });
    mk('dnR2', { type: 'line', data: { labels: L, datasets: [line('ROE', R.map(r => { const v = ttmRoe(A, r[0]); return v == null ? null : v * 100; }), C.navy), line('ROA', R.map(r => { const n = ttm(A, r[0], x => sv(x, 'is200')), a = avgBal(A, r[0], x => sv(x, 'bs270')); return n != null && a ? n / a * 100 : null; }), C.teal)] }, options: { scales: { x: { grid: { display: false } }, y: yPct('%') } } });
    mk('dnNim', { type: 'line', data: { labels: L, datasets: [
      line('Lợi suất cho vay', R.map(r => { const a = ttm(A, r[0], x => sv(x, 'is03')), b = avgBal(A, r[0], x => sv(x, 'bs114')); return a != null && b ? a / b * 100 : null; }), C.teal),
      line('Chi phí vốn vay', R.map(r => { const i = ttm(A, r[0], x => Math.abs(sv(x, 'is52') || 0)), d = avgBal(A, r[0], debtOf); return i && d ? i / d * 100 : null; }), C.purple)] }, options: { scales: { x: { grid: { display: false } }, y: yPct('%') } } });
    const SA = W.secSector;
    mk('dnBrk', { type: 'line', data: { labels: L, datasets: [
      line('Thị phần doanh thu môi giới', R.map(r => { const a = ttm(A, r[0], x => sv(x, 'is06')), b = ttm(SA, r[0], x => sv(x, 'is06')); return a != null && b ? a / b * 100 : null; }), C.navy),
      line('Biên môi giới', R.map(r => { const a = ttm(A, r[0], x => sv(x, 'is06')), b = ttm(A, r[0], x => sv(x, 'is27')); return a ? (a + b) / a * 100 : null; }), C.teal, { yAxisID: 'y1' })] },
      options: { scales: { x: { grid: { display: false } }, y: yPct('thị phần %'), y1: yPct('biên %', { position: 'right', grid: { display: false } }) } } });
    mk('dnCir', { type: 'line', data: { labels: L, datasets: [line('Chi phí quản lý / doanh thu hoạt động', R.map(r => { const a = ttm(A, r[0], x => Math.abs(sv(x, 'is62') || 0)), b = ttm(A, r[0], x => sv(x, 'is20')); return a && b ? a / b * 100 : null; }), C.purple)] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: yPct('%') } } });
    const pE = (r, f) => f(r) / sv(r, 'bs400') * 100;
    mk('dnR1', { type: 'line', data: { labels: L, datasets: [line('Cho vay / VCSH', R.map(r => pE(r, x => sv(x, 'bs114'))), C.teal, { dp: 0 }), line('Nợ vay / VCSH', R.map(r => pE(r, debtOf)), C.navy, { dp: 0 }), line('FVTPL / VCSH', R.map(r => pE(r, x => sv(x, 'bs112'))), C.gold, { dp: 0 })] }, options: { scales: { x: { grid: { display: false } }, y: yPct('% VCSH') } } });
  } else {
    stackDraw('dnA', L, [{ label: 'Đầu tư tài chính ngắn hạn', data: R.map(r => tyy(r, 'bs120')), color: C.navy }, { label: 'Đầu tư tài chính dài hạn', data: R.map(r => tyy(r, 'bs250')), color: C.teal }, { label: 'Tài sản khác', data: R.map(r => (qv(r, 'bs270') - (qv(r, 'bs120') || 0) - (qv(r, 'bs250') || 0)) / 1000), color: '#d5d9e2' }], ' nghìn tỷ');
    stackDraw('dnL', L, [{ label: 'Nợ phải trả (chủ yếu dự phòng nghiệp vụ)', data: R.map(r => (qv(r, 'bs270') - qv(r, 'bs400')) / 1000), color: C.purple }, { label: 'Vốn chủ sở hữu', data: R.map(r => tyy(r, 'bs400')), color: C.navy }], ' nghìn tỷ');
    if (X.inv) { const IQ = X.inv.v.map(r => r[0]).filter(q2 => q2 >= '2022Q1'); stackDraw('dnInv', IQ.map(qLbl), X.inv.k.map((k, j) => ({ label: X.inv.n[j], data: IQ.map(q2 => { const r = X.inv.v.find(z => z[0] === q2); return r && r[j + 1] != null ? r[j + 1] / 1000 : null; }), color: C.pal[j % 10] })), ' nghìn tỷ'); }
    mk('dnInvY', { type: 'line', data: { labels: L, datasets: [line('Lợi suất danh mục', R.map(r => { const p = ttm(A, r[0], x => iv(x, 'is25')), a = avgBal(A, r[0], x => (iv(x, 'bs120') || 0) + (iv(x, 'bs250') || 0)); return p != null && a ? p / a * 100 : null; }), C.navy)] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: yPct('%') } } });
    const pY = y => yr(y, x => iv(x, 'is01_1'));
    mk('dnPY', { type: 'bar', data: { labels: years.map(y => nQ(y) < 4 ? `${y} (${nQ(y)}Q)` : y), datasets: [bar('Phí gốc', years.map(pY), C.navy, { stack: 's', unit: ' tỷ' }), bar('Phí nhận tái', years.map(y => yr(y, x => iv(x, 'is01_2'))), C.teal, { stack: 's', unit: ' tỷ' }),
      line('Tăng trưởng phí gốc', years.map((y, i) => i && nQ(y) === 4 && nQ(years[i - 1]) === 4 ? (pY(y) / pY(years[i - 1]) - 1) * 100 : null), C.red, { yAxisID: 'y1' })] },
      options: { scales: { x: { stacked: true, grid: { display: false } }, y: yNum('tỷ đồng', { stacked: true }), y1: yPct('%', { position: 'right', grid: { display: false } }) } } });
    mk('dnIS', { type: 'bar', data: { labels: L, datasets: [bar('Phí gốc', R.map(r => iv(r, 'is01_1')), C.navy, { unit: ' tỷ' }), bar('Phí nhận tái', R.map(r => iv(r, 'is01_2')), C.teal, { unit: ' tỷ' }), bar('Phí nhượng tái', R.map(r => Math.abs(iv(r, 'is02') || 0)), C.gold, { unit: ' tỷ' }), bar('Chi bồi thường', R.map(r => Math.abs(iv(r, 'is15') || 0)), C.purple, { unit: ' tỷ' }),
      line('Tỷ lệ giữ lại', R.map(r => { const g = (iv(r, 'is01_1') || 0) + (iv(r, 'is01_2') || 0); return g ? (1 - Math.abs(iv(r, 'is02') || 0) / g) * 100 : null; }), C.red, { yAxisID: 'y1', pointRadius: 1.5 })] },
      options: { scales: { x: { grid: { display: false } }, y: yNum('tỷ đồng'), y1: yPct('%', { position: 'right', grid: { display: false } }) } } });
    mk('dnR2', { type: 'bar', data: { labels: L, datasets: [bar('LN gộp kinh doanh bảo hiểm', R.map(r => iv(r, 'is19')), C.teal, { unit: ' tỷ' }), bar('LN hoạt động tài chính', R.map(r => iv(r, 'is25')), C.navy, { unit: ' tỷ' }), line('LNTT', R.map(r => iv(r, 'is50')), C.gold, { unit: ' tỷ', dp: 0 })] }, options: { scales: { x: { grid: { display: false } }, y: yNum('tỷ đồng') } } });
    const t4 = (q2, f) => ttm(A, q2, f), lr = R.map(r => { const a = t4(r[0], x => Math.abs(iv(x, 'is15') || 0)), b = t4(r[0], x => iv(x, 'is03')); return a != null && b ? a / b * 100 : null; });
    const cr = R.map(r => { const n = t4(r[0], x => iv(x, 'isx01')); if (!n) return null; return t4(r[0], x => Math.abs(iv(x, 'is18') || 0) + Math.abs(iv(x, 'is26') || 0) + Math.abs(iv(x, 'isx27') || 0)) / n * 100; });
    const er = R.map((r, i) => cr[i] != null && lr[i] != null ? cr[i] - (t4(r[0], x => Math.abs(iv(x, 'is15') || 0)) / t4(r[0], x => iv(x, 'isx01')) * 100) : null);
    mk('dnR1', { type: 'line', data: { labels: L, datasets: [line('Tỷ lệ bồi thường', lr, C.purple)].concat(SYM === 'BVH' ? [] : [line('Tỷ lệ chi phí', er, C.gold), line('Tỷ lệ kết hợp', cr, C.navy)]) }, options: { plugins: { vref: { lines: SYM === 'BVH' ? [] : [{ value: 100, label: '100%', color: C.red }] } }, scales: { x: { grid: { display: false } }, y: yPct('%') } } });
    const NQ = noteRows().map(x => x[0]).filter(x => x >= '2022Q1').sort();
    mk('dnDep', { type: 'bar', data: { labels: NQ.map(qLbl), datasets: [bar('Lãi tiền gửi', NQ.map(x => nv(x, 'fn23_1') || null), C.teal, { unit: ' tỷ' }), line('LNTT', NQ.map(x => iv(rowAt(A, x), 'is50')), C.navy, { unit: ' tỷ', dp: 0 })] }, options: { scales: { x: { grid: { display: false } }, y: yNum('tỷ đồng') } } });
    mk('dnRoe', { type: 'line', data: { labels: L, datasets: [line('ROE', R.map(r => { const v = ttmRoe(A, r[0]); return v == null ? null : v * 100; }), C.navy), line('ROA', R.map(r => { const n = ttm(A, r[0], x => iv(x, 'is60')), a = avgBal(A, r[0], x => iv(x, 'bs270')); return n != null && a ? n / a * 100 : null; }), C.teal)] }, options: { scales: { x: { grid: { display: false } }, y: yPct('%') } } });
    if (SYM === 'BVH') { drawSurrender(); const nz = v => v ? Math.abs(v) : null;
      mk('dnBvh', { type: 'bar', data: { labels: NQ.map(qLbl), datasets: [bar('Đáo hạn', NQ.map(x => nz(nv(x, 'fn111_2'))), C.navy, { stack: 's', unit: ' tỷ' }), bar('Giá trị hoàn lại', NQ.map(x => nz(nv(x, 'fn111_3'))), C.purple, { stack: 's', unit: ' tỷ' }), bar('Bồi thường nhân thọ', NQ.map(x => nz(nv(x, 'fn111_4'))), C.teal, { stack: 's', unit: ' tỷ' })] }, options: { scales: { x: { stacked: true, grid: { display: false } }, y: yNum('tỷ đồng', { stacked: true }) } } }); }
  }
  mk('dnEq', { type: 'bar', data: { labels: L, datasets: [bar('Vốn chủ sở hữu', R.map(r => tyy(r, 'bs400')), C.navy, { unit: ' nghìn tỷ', dp: 1 }), line('Tổng tài sản / VCSH', R.map(r => qv(r, 'bs270') / qv(r, 'bs400')), C.red, { yAxisID: 'y1', unit: 'x', dp: 2, pointRadius: 1.5 })] },
    options: { scales: { x: { grid: { display: false } }, y: yNum('nghìn tỷ đồng'), y1: yNum('lần', { position: 'right', grid: { display: false }, ticks: { callback: v => nf(v, 1) + 'x' } }) } } });
}

/* ---------------- TAB 3 · CATALYST & SỰ KIỆN ---------------- */
function dnEvents() {
  const R = QS(), q = last(R)[0], nq = (() => { let y = +q.slice(0, 4), n = +q.slice(5) + 1; if (n > 4) { n = 1; y++; } return { y, n }; })();
  const due = (() => { const m = nq.n * 3, d = new Date(Date.UTC(nq.y, m, 0)); d.setUTCDate(d.getUTCDate() + 30); return d.toISOString().slice(0, 10); })();
  const today = F.built, evs = W.events.filter(e => e.s === SYM);
  const up = [{ d: due, type: 'KQKD', imp: '?', t: `BCTC quý ${nq.n}/${nq.y} (dự kiến trong khoảng 20–45 ngày sau quý)` }]
    .concat(evs.filter(e => (e.ex || e.rec) > today).map(e => ({ d: e.ex || e.rec, type: e.t || 'Sự kiện', imp: e.cash ? '+' : '?', t: e.title + (e.cash ? ` · ${nf(e.cash)}đ/CP` : '') })))
    .concat(IS_INS ? [{ d: today, type: 'Ngành', imp: '?', t: 'Bản tin thị trường bảo hiểm hàng tháng của Bộ Tài chính (thị phần, tăng trưởng phí)' }, { d: '2027-01-01', type: 'Chính sách', imp: '?', t: 'Phần hoa hồng của Thông tư 96/2026 có hiệu lực' }]
      : [{ d: '2027-03-31', type: 'Thị trường', imp: '+', t: 'FTSE Russell: giai đoạn 2 nâng tỷ trọng Việt Nam lên 30%' }]).sort((a, b) => a.d.localeCompare(b.d));
  const E = [];
  evs.forEach(e => E.push({ d: e.ex || e.rec, type: e.t || 'Sự kiện', imp: e.cash || e.stk ? '+' : '?', t: e.title || '', det: [e.cash ? `Cổ tức tiền ${nf(e.cash)}đ/CP` : '', e.stk ? `cổ phiếu ${nf(e.stk * (e.stk < 1 ? 100 : 1), 1)}%` : '', e.iss ? `phát hành tỷ lệ ${nf(e.iss * (e.iss < 1 ? 100 : 1), 1)}% giá ${nf(e.ip)}đ` : ''].filter(Boolean).join(' · ') }));
  (X.news || []).forEach(n => E.push({ d: n.d, type: 'Tin tức', imp: '?', t: n.t, u: n.u, det: n.src || '' }));
  W.rep.filter(r => r.s === SYM).forEach(r => E.push({ d: r.d, type: 'Báo cáo CTCK', imp: /MUA/.test(r.rec || '') ? '+' : /BÁN/.test(r.rec || '') ? '−' : '?', t: `${r.org}: ${r.title || ''}`, det: [r.rec, r.tp ? 'GMT ' + nf(r.tp) : '', r.np ? 'LNST ' + nf(r.np) + ' tỷ' : ''].filter(Boolean).join(' · ') }));
  (X.trades || []).filter(t => t.exe || t.reg).forEach(t => E.push({ d: t.to || t.regTo || t.regFrom, type: 'Giao dịch nội bộ', imp: t.side === 'Mua' ? '+' : '−', t: `${t.name} ${t.side === 'Mua' ? 'mua' : 'bán'} ${nf(Math.abs(t.exe || t.reg))} CP${t.exe ? '' : ' (đăng ký)'}`, det: t.role || '' }));
  R.slice(-8).forEach(r => { const r0 = rowAt(R, yoyQ(r[0])), a = qv(r, PBT_K()), b = qv(r0, PBT_K()); const y = +r[0].slice(0, 4), n = +r[0].slice(5); E.push({ d: new Date(Date.UTC(y, n * 3, 20)).toISOString().slice(0, 10), type: 'KQKD', imp: b > 0 ? (a > b ? '+' : '−') : '?', t: `KQKD ${qLbl(r[0])}: LNTT ${nf(a)} tỷ${b > 0 ? ` (${sg(a / b - 1)} so cùng kỳ)` : ''}`, det: 'ngày ước tính theo thời hạn công bố' }); });
  E.sort((a, b) => (b.d || '').localeCompare(a.d || ''));
  const types = ['Tất cả', ...new Set(E.map(e => e.type))];
  $('#events').innerHTML = `<h2 class="sec">Catalyst &amp; sự kiện — KQKD, CBTT, giao dịch nội bộ, báo cáo CTCK</h2>
  <p class="sec-sub">Dấu ± là đánh giá sơ bộ chiều tác động tới lợi nhuận/định giá.</p>
  <article class="card"><h3 class="sub">Sắp tới</h3><div class="tscroll"><table class="fz"><thead><tr><th>Ngày (dự kiến)</th><th>Loại</th><th>±</th><th>Sự kiện</th></tr></thead><tbody>
    ${up.map(e => `<tr><td style="white-space:nowrap">${dvn(e.d)}</td><td>${esc(e.type)}</td><td>${imp(e.imp)}</td><td><b>${esc(e.t)}</b></td></tr>`).join('')}</tbody></table></div></article>
  <article class="card"><h3 class="sub">Dòng sự kiện</h3>
    <div class="filter" id="evFilter">${types.map((t, i) => `<button type="button" data-t="${esc(t)}" class="${i ? '' : 'on'}">${esc(t)}</button>`).join('')}</div>
    <div class="tscroll"><table class="fz"><thead><tr><th>Ngày</th><th>Loại</th><th>±</th><th>Sự kiện</th></tr></thead><tbody id="evBody"></tbody></table></div>
    <div class="src">Nguồn: ${WI} (sự kiện doanh nghiệp, tin tức, giao dịch nội bộ, báo cáo CTCK, BCTC)</div></article>`;
  const draw = t => { $('#evBody').innerHTML = E.filter(e => t === 'Tất cả' || e.type === t).map(e => `<tr><td style="white-space:nowrap">${dvn(e.d)}</td><td>${esc(e.type)}</td><td>${imp(e.imp)}</td><td>${e.u ? `<a href="${esc(e.u)}" target="_blank" rel="noopener">${esc(e.t)}</a>` : esc(e.t)}${e.det ? `<div class="src">${esc(e.det)}</div>` : ''}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Không có sự kiện.</td></tr>';
    $$('#evFilter button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); };
  $$('#evFilter button').forEach(b => b.onclick = () => draw(b.dataset.t)); draw('Tất cả');
}

/* ---------------- TAB 4 · CONSENSUS ---------------- */
let cpbSel = null;
function dnCons() {
  const fw = fwd(), c = fw.c, px = lastPrice(), dec = myDec(), myTp = numv(dec.tp), R = c.R;
  const fade = new Date(new Date(F.built) - 92 * 864e5).toISOString().slice(0, 10);
  const live = c.T.filter(r => r.d >= fade), tpL = live.map(r => r.tp), npL = c.N.filter(r => r.d >= fade).map(r => r.np);
  const ytd = fw.ytd, runRate = ytd.n ? ytd.v * 4 / ytd.n : null, plan = c.plan;
  $('#cons').innerHTML = `<h2 class="sec">Consensus CTCK</h2>
  <div class="kpis">
    ${kpi('Median TP', c.tp ? nf(c.tp) + 'đ' : '—', c.up != null ? sg(c.up) + ' vs giá' : 'chưa có giá mục tiêu', c.up != null ? cls(c.up) : '')}
    ${kpi('TB TP', c.T.length ? nf(c.T.reduce((a, r) => a + r.tp, 0) / c.T.length) + 'đ' : '—', c.T.length ? 'min ' + nf(c.tpMin) + ' · max ' + nf(c.tpMax) : '')}
    ${kpi('Khuyến nghị MUA', c.buy + '/' + (c.buy + c.hold + c.sell), 'CTCK có khuyến nghị')}
    ${kpi('TP của tôi', myTp ? nf(myTp) + 'đ' : '—', myTp ? sg(myTp / px - 1) + ' vs giá' : 'nhập ở tab 💎 FinSuccess')}
    ${kpi('LNST 2026F (median)', c.np ? nf(c.np) + ' tỷ' : '—', c.np && fw.np25 ? sg(c.np / fw.np25 - 1) + ' vs 2025 · ' + c.N.length + ' dự phóng' : '')}
    ${kpi('P/E · P/B forward', xx(fw.peFwd, 1) + ' · ' + xx(fw.pbFwd), fw.bv26 ? 'BVPS 2026F ' + nf(fw.bv26) + 'đ (ước tính)' : '')}
  </div>
  <article class="card" id="cpbCard"><h3 class="sub" id="cpbH"></h3><p class="chart-sub" id="cpbSub"></p><div class="picker" id="cpbPick"></div>
    <div class="cbox tall"><canvas id="chCpb" role="img" aria-label="P/B lịch sử"></canvas></div>
    <p class="cnote">BVPS 2026F ước tính = (vốn chủ quý gần nhất + LNST 2026F trung vị − LNST đã ghi nhận năm 2026) / số cổ phiếu hiện tại; chưa trừ cổ tức tiền chi trong năm.</p>
    <div class="insight" id="cpbIns"></div><div class="src">Nguồn: ${WI} (định giá theo phiên, báo cáo CTCK, BCTC)</div></article>
  <h3 class="sub" style="margin:6px 0 10px">Dải dự phóng của các công ty chứng khoán</h3>
  ${R.length ? `<div class="grid g2 gap">
    ${card({ id: 'chTp', title: 'Giá mục tiêu từng CTCK', sub: `đ/CP · đường đỏ = thị giá ${nf(px)}đ · nhãn = upside`, h: 'tall', body: `<p class="cnote">Màu xám = báo cáo trước ${dvn(fade)} (> 3 tháng).</p>`,
      ins: c.T.length ? `Dải giá mục tiêu <b>${nf(c.tpMin)}–${nf(c.tpMax)}đ</b> (upside ${sg(c.tpMin / px - 1, 0)} đến ${sg(c.tpMax / px - 1, 0)}); ${c.T.filter(r => r.tp < px).length ? c.T.filter(r => r.tp < px).length + ' CTCK có giá mục tiêu dưới thị giá' : 'không CTCK nào có giá mục tiêu dưới thị giá'}.` : 'Chưa có giá mục tiêu.', src: WI })}
    ${card({ id: 'chNp', title: 'LNST 2026F từng CTCK và kế hoạch ĐHĐCĐ', sub: `tỷ đồng · nhãn = YoY so với LNST 2025 ${nf(fw.np25)} tỷ · xám = run-rate ${ytd.n}Q × ${nf(4 / ytd.n, 2)}`, h: 'tall', body: `<p class="cnote">Màu nhạt = báo cáo trước ${dvn(fade)} (> 3 tháng). Kế hoạch ĐHĐCĐ luôn tô đậm.</p>`,
      ins: c.N.length ? `Dự phóng 2026 nằm trong khoảng <b>${nf(Math.min(...c.N.map(r => r.np)))}–${nf(Math.max(...c.N.map(r => r.np)))}</b> tỷ (${sg(Math.min(...c.N.map(r => r.np)) / fw.np25 - 1, 0)} đến ${sg(Math.max(...c.N.map(r => r.np)) / fw.np25 - 1, 0)} YoY)${plan && plan.pat ? `; kế hoạch ĐHĐCĐ ${nf(plan.pat)} tỷ` : ''}. LNST ${ytd.n} quý 2026 là ${nf(ytd.v)} tỷ, quy năm theo run-rate ${nf(runRate)} tỷ.` : 'Chưa có dự phóng LNST.', src: WI + ' (báo cáo CTCK, kế hoạch ĐHĐCĐ)' })}
  </div>
  <article class="card"><h3 class="sub">Chi tiết báo cáo</h3><div class="tscroll"><table class="fz"><thead><tr><th>CTCK</th><th>Ngày</th><th>KN</th><th class="n">TP</th><th class="n">Upside</th><th class="n">P/B tại TP</th><th class="n">LNST N</th><th class="n">LNST N+1</th><th>Tiêu đề</th></tr></thead><tbody>
    ${R.map(r => `<tr class="${r.d < fade ? 'stale' : ''}"><td><b>${esc(r.org)}</b></td><td>${dvn(r.d)}</td><td>${recPill(r.rec)}</td><td class="n">${r.tp ? nf(r.tp) : '—'}</td><td class="n">${r.tp ? sg(r.tp / px - 1, 1) : '—'}</td><td class="n">${r.tp && bvpsNow() ? xx(r.tp / bvpsNow()) : '—'}</td><td class="n">${nf(r.np)}</td><td class="n">${nf(r.np1)}</td><td>${esc(r.title || '')}</td></tr>`).join('')}
  </tbody></table></div><p class="cnote">Dòng mờ = báo cáo trước ${dvn(fade)} (> 3 tháng). Năm dự phóng N theo năm của báo cáo.</p><div class="src">Nguồn: ${WI}</div></article>`
  : '<article class="card"><p class="muted">Chưa có báo cáo phân tích của CTCK cho mã này trong dữ liệu.</p></article>'}`;
  cpbSel = SYM; drCpb();
  if (!R.length) return;
  const tr = c.T.slice().sort((a, b) => a.tp - b.tp), st = r => r.d < fade;
  const upLab = { id: 'upLab', afterDatasetsDraw(ch) { const x = ch.ctx; ch.getDatasetMeta(0).data.forEach((b, i) => { const r = tr[i], X0 = ch.scales.x.getPixelForValue(r.tp), col = st(r) ? '#b9c0cc' : C.navy;
    x.save(); x.fillStyle = col; x.beginPath(); x.arc(X0, b.y, 5, 0, 7); x.fill(); x.font = '600 10.5px Arial'; x.textBaseline = 'middle'; x.fillStyle = r.tp < px ? C.red : C.green; const t = sg(r.tp / px - 1, 0); x.fillText(t, r.tp < px ? X0 - x.measureText(t).width - 9 : X0 + 9, b.y); x.restore(); }); } };
  mk('chTp', { type: 'bar', plugins: [upLab], data: { labels: tr.map(r => `${r.org} ${dvn(r.d).slice(0, 5)}`), datasets: [{ label: 'TP', data: tr.map(r => [px, r.tp]), backgroundColor: tr.map(r => st(r) ? '#b9c0cc' : C.navy), barThickness: 4, dp: 0, unit: 'đ' }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false }, vref: { lines: [{ axis: 'x', value: px, label: 'Thị giá', color: C.red }] }, tooltip: { callbacks: { label: cx => { const r = tr[cx.dataIndex]; return `TP ${nf(r.tp)}đ · upside ${sg(r.tp / px - 1, 0)} · ${r.rec || ''}`; } } } },
      scales: { x: yNum('đ/CP', { min: Math.floor(Math.min(px, ...tr.map(r => r.tp)) * 0.9 / 1000) * 1000, max: Math.ceil(Math.max(px, ...tr.map(r => r.tp)) * 1.1 / 1000) * 1000 }), y: { ticks: { autoSkip: false, font: { size: 10.5 } } } } } });
  const nr = c.N.slice().sort((a, b) => a.np - b.np), yo = v => fw.np25 ? ` (${sg(v / fw.np25 - 1, 0)})` : '';
  const lab = nr.map(r => `${r.org} ${dvn(r.d).slice(0, 5)}${yo(r.np)}`).concat(plan && plan.pat ? ['KH ĐHĐCĐ' + yo(plan.pat)] : []).concat(runRate ? [`Run-rate ${ytd.n}Q${yo(runRate)}`] : []);
  mk('chNp', { type: 'bar', data: { labels: lab, datasets: [bar('LNST 2026F', nr.map(r => r.np).concat(plan && plan.pat ? [plan.pat] : []).concat(runRate ? [runRate] : []), nr.map(r => st(r) ? C.teal + '55' : C.teal).concat(plan && plan.pat ? [C.navy] : []).concat(runRate ? ['#c9ced8'] : []), { unit: ' tỷ', dp: 0 })] },
    options: { indexAxis: 'y', plugins: { legend: { display: false }, vref: { lines: fw.np25 ? [{ axis: 'x', value: fw.np25, label: 'LNST 2025', color: C.purple }] : [] } }, scales: { x: yNum('tỷ đồng', { min: 0 }), y: { ticks: { autoSkip: false, font: { size: 10.5 } } } } } });
  [['chTp', tr.length], ['chNp', lab.length]].forEach(([id, n]) => { const b = document.getElementById(id)?.parentElement; if (b) b.style.height = Math.max(340, n * 24 + 70) + 'px'; });
}
function drCpb() {
  const SV = IS_INS ? sv406 : sv408, P = W.pb[cpbSel], secSer = SV.d.map((d, i) => [d, SV.pb[i]]).filter(p => p[1] != null);
  const ser = cpbSel === '_sec' || !P ? secSer : P.d.map((d, i) => [d, P.pb[i]]).filter(p => p[1] != null);
  const v = ser.map(p => p[1]), m = v.reduce((a, b) => a + b, 0) / v.length, sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length), now = last(v), lastD = last(ser)[0];
  const own = cpbSel === SYM, nm = cpbSel === '_sec' ? 'P/B ngành' : cpbSel, fw = fwd(), dec = myDec();
  const tgt = own && fw.bv26 ? [[fw.c.tp, 'TP trung vị CTCK', C.red], [numv(dec.tp), 'TP của tôi', C.teal]].filter(t => t[0]).map(([tp, l, col]) => ({ tp, l, col, pb: tp / fw.bv26 })) : [];
  const yEnd = `${lastD.slice(0, 4)}-12-31`, fut = [];
  if (tgt.length && yEnd > lastD) { const d = new Date(lastD + 'T00:00:00Z'); for (;;) { d.setUTCDate(d.getUTCDate() + 1); const iso = d.toISOString().slice(0, 10); if (iso > yEnd) break; if (d.getUTCDay() % 6) fut.push(iso); } }
  const dates = ser.map(p => p[0]).concat(fut), n0 = ser.length;
  const ds = [line('P/B ' + nm, v.concat(fut.map(() => null)), own ? C.navy : C.blue, { pointRadius: 0, borderWidth: 1.8, unit: 'x', dp: 2 })];
  if (cpbSel !== '_sec') { const mm = new Map(secSer); ds.push(line('P/B ngành', dates.map(d => mm.has(d) ? mm.get(d) : null), C.grey, { pointRadius: 0, borderWidth: 1.2, borderDash: [4, 3], unit: 'x', dp: 2 })); }
  tgt.forEach(t => ds.push(line(`Tới ${t.l} ${nf(t.tp)}đ (P/B ${xx(t.pb)} cuối năm)`, dates.map((d, i) => i < n0 - 1 ? null : +(now + (t.pb - now) * (i - (n0 - 1)) / (dates.length - n0)).toFixed(3)), t.col, { pointRadius: 0, borderWidth: 1.8, borderDash: [6, 4], unit: 'x', dp: 2 })));
  mk('chCpb', { type: 'line', data: { labels: dates.map(dvn), datasets: ds }, options: { plugins: { vref: { lines: [{ value: m, label: `TB ${xx(m)}`, color: C.grey, dash: [2, 3] }, { value: m + sd, label: `+1σ ${xx(m + sd)}`, color: '#c9a227' }, { value: m - sd, label: `−1σ ${xx(m - sd)}`, color: '#c9a227' }] } },
    scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 9 } }, y: yNum('lần', { beginAtZero: false, ticks: { callback: y => nf(y, 1) + 'x' } }) } } });
  $('#cpbH').textContent = own ? `P/B ${SYM} theo phiên và P/B ngụ ý tại giá mục tiêu` : cpbSel === '_sec' ? `P/B ngành ${IS_INS ? 'bảo hiểm' : 'chứng khoán'}` : `P/B ${cpbSel} theo phiên so với ngành`;
  $('#cpbSub').textContent = `Lần · theo phiên từ ${dvn(ser[0][0])} · đường xám = trung bình, vàng = ±1 độ lệch chuẩn của chính chuỗi${tgt.length ? ' · nét đứt = P/B nếu giá đạt mục tiêu vào 31/12 (trên BVPS 2026F)' : ''}`;
  $('#cpbPick').innerHTML = [...PEERS(), '_sec'].map(b => `<button type="button" data-b="${b}" class="${b === cpbSel ? 'on' : ''}">${b === '_sec' ? 'P/B ngành' : b}</button>`).join('');
  $$('#cpbPick button').forEach(b => b.onclick = () => { cpbSel = b.dataset.b === cpbSel ? SYM : b.dataset.b; drCpb(); });
  const z = sd ? (now - m) / sd : 0, pctl = v.filter(y => y <= now).length / v.length * 100;
  $('#cpbIns').innerHTML = `${nm}: P/B <b>${xx(now)}</b> (${dvn(lastD)}), ${z >= 0 ? 'cao' : 'thấp'} hơn trung bình ${xx(m)} của chuỗi <b>${nf(Math.abs(z), 1)} độ lệch chuẩn</b>; cao hơn ${nf(pctl, 0)}% số phiên (thấp nhất ${xx(Math.min(...v))}, cao nhất ${xx(Math.max(...v))}).`
    + tgt.map((t, k) => ` ${k ? '' : 'Nếu giá đạt '}${t.l} <b>${nf(t.tp)}đ</b> vào cuối năm, P/B trên BVPS 2026F là <b>${xx(t.pb)}</b> — ${t.pb > m + sd ? 'cao hơn mốc +1σ' : t.pb > m ? 'trên trung bình nhưng trong dải ±1σ' : t.pb > m - sd ? 'dưới trung bình, trong dải ±1σ' : 'thấp hơn mốc −1σ'}.`).join('');
}

/* ---------------- TAB 5 · 💎 FINSUCCESS ---------------- */
const SCEN_K = () => `fin-${SYM}-scen`;
function dnVal() {
  const v = W.val[SYM], fw = fwd(), bP = band(1), bE = band(2), px = lastPrice(), bv = bvpsNow(), eps = v.pe ? px / v.pe : null, roeT = ttmRoe(QS(), last(QS())[0]);
  const def = IS_INS ? [{ n: 'Lãi suất tăng (lợi suất đầu tư cao)', roe: 15, coe: 13, g: 4 }, { n: 'Cơ sở', roe: 13, coe: 13, g: 4 }, { n: 'Lãi suất giảm, hủy hợp đồng tăng', roe: 11, coe: 13, g: 3 }]
    : [{ n: 'Thanh khoản cao, nâng hạng giải ngân', roe: 18, coe: 15, g: 5 }, { n: 'Cơ sở', roe: 14, coe: 15, g: 4 }, { n: 'Thị trường điều chỉnh', roe: 9, coe: 16, g: 3 }];
  let scen = def; try { scen = JSON.parse(localStorage.getItem(SCEN_K()) || 'null') || def; } catch (e) {}
  const r100 = n => nf(Math.round(n / 100) * 100);
  $('#val').innerHTML = `<h2 class="sec">FinSuccess — định giá &amp; quyết định đầu tư</h2>
  <article class="card fsn" id="decNote"></article>
  <article class="card"><h3 class="sub">Vị thế định giá so với lịch sử</h3><p class="chart-sub">Dải ±1σ trên ${bP ? bP.n : 0} quý (${bP ? qLbl(bP.from) + '–' + qLbl(bP.to) : '—'}); giá quy đổi = bội số × BVPS hiện tại / BVPS 2026F</p>
    <div class="grid g2">
      <div><h4 style="margin:0 0 8px;color:var(--navy)">P/B hiện tại ${xx(v.pb)} · forward ${xx(fw.pbFwd)}</h4>${bP ? `<table><thead><tr><th>Mốc</th><th class="n">P/B</th><th class="n">Giá (BVPS hiện tại)</th><th class="n">Giá (BVPS 2026F)</th></tr></thead><tbody>
        ${[['−1σ', bP.lo], ['Trung bình', bP.m], ['+1σ', bP.hi]].map(([l, b]) => `<tr><td>${l}</td><td class="n">${xx(b)}</td><td class="n">${r100(b * bv)} <small>(${sg(b * bv / px - 1, 0)})</small></td><td class="n">${fw.bv26 ? `${r100(b * fw.bv26)} <small>(${sg(b * fw.bv26 / px - 1, 0)})</small>` : '—'}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Chưa đủ lịch sử.</p>'}</div>
      <div><h4 style="margin:0 0 8px;color:var(--navy)">P/E TTM ${xx(v.pe, 1)} · forward ${xx(fw.peFwd, 1)}</h4>${bE && eps ? `<table><thead><tr><th>Mốc</th><th class="n">P/E</th><th class="n">Giá (EPS TTM)</th></tr></thead><tbody>
        ${[['−1σ', bE.lo], ['Trung bình', bE.m], ['+1σ', bE.hi]].map(([l, b]) => `<tr><td>${l}</td><td class="n">${xx(b, 1)}</td><td class="n">${r100(b * eps)} <small>(${sg(b * eps / px - 1, 0)})</small></td></tr>`).join('')}</tbody></table>` : '<p class="muted">Chưa đủ lịch sử.</p>'}</div>
    </div>
    ${bP ? `<div class="insight">P/B <b>${xx(v.pb)}</b> ${v.pb < bP.lo ? 'thấp hơn mốc −1σ' : v.pb < bP.m ? 'dưới trung bình, trên mốc −1σ' : v.pb < bP.hi ? 'trên trung bình, dưới mốc +1σ' : 'cao hơn mốc +1σ'} (${xx(bP.lo)}–${xx(bP.hi)}) trong khi ROE 4 quý <b>${pc(roeT, 1)}</b>.</div>` : ''}
    <div class="src">Nguồn: ${WI} (chỉ số định giá theo quý, BCTC); BVPS 2026F ước tính từ LNST dự phóng trung vị của CTCK</div></article>
  <div class="grid g2 gap">
    ${card({ id: 'chVal', title: 'P/B và P/E theo quý', sub: 'lần · cuối quý · đường đứt = trung bình 20 quý', src: WI })}
    ${card({ id: 'chPbRoe', title: `P/B và ROE: ${IS_INS ? 'doanh nghiệp bảo hiểm' : 'công ty chứng khoán'} niêm yết`, sub: 'P/B phiên gần nhất theo ROE 4 quý · đường đứt = hồi quy tuyến tính trong nhóm', ins: pbRoeIns(), src: WI })}
    ${card({ id: 'chDiv', title: 'Cổ tức', sub: 'cột xanh đậm = cổ tức tiền mặt (đ/CP, trục trái) · cột xanh ngọc = cổ tức cổ phiếu, cổ phiếu thưởng (%, trục phải) · theo năm GDKHQ', src: WI + ' (sự kiện doanh nghiệp)' })}
    ${card({ id: 'chPlanDone', title: 'Hoàn thành kế hoạch lợi nhuận', sub: '% kế hoạch LNTT ĐHĐCĐ · năm gần nhất tính lũy kế đến quý mới nhất', ins: dnPlanIns(), src: WI + ' (kế hoạch ĐHĐCĐ, BCTC)' })}
  </div>
  <article class="card"><h3 class="sub">Định giá theo kịch bản (thu nhập thặng dư)</h3>
    <p class="chart-sub">P/B hợp lý = (ROE − g)/(COE − g), áp lên BVPS 2026F ${fw.bv26 ? nf(fw.bv26) + 'đ' : '(chưa có dự phóng, dùng BVPS hiện tại ' + nf(bv) + 'đ)'}. <b>Giá trị khởi tạo chỉ để thử — chưa phải giả định của FinSuccess</b>; analyst sửa và lưu trên trình duyệt.</p>
    <div class="tscroll"><table id="scTable"><thead><tr><th>Kịch bản</th><th class="n">ROE bền vững %</th><th class="n">COE %</th><th class="n">g %</th><th class="n">P/B hợp lý</th><th class="n">Giá hợp lý</th><th class="n">Upside</th></tr></thead><tbody>
      ${scen.map(r => `<tr><td><input data-f="n" value="${esc(r.n)}" style="width:240px"></td><td class="n"><input data-f="roe" value="${r.roe}" style="width:70px"></td><td class="n"><input data-f="coe" value="${r.coe}" style="width:70px"></td><td class="n"><input data-f="g" value="${r.g}" style="width:60px"></td><td class="n" data-o="pb"></td><td class="n" data-o="px"></td><td class="n" data-o="up"></td></tr>`).join('')}
    </tbody></table></div>
    <div style="margin-top:10px;display:flex;gap:8px"><button class="btn" id="scSave" type="button">Lưu giả định</button><button class="btn ghost" id="scReset" type="button">Khôi phục mặc định</button><span class="calc" id="scMsg"></span></div>
    <div class="note">Đối chiếu: ROE 4 quý ${pc(roeT, 1)}; ROE theo năm ${[2022, 2023, 2024, 2025].map(y => { const n = yearSum(y, NP_K()).v, e = qv(rowAt(QS(), y + 'Q4'), 'bs400'), e0 = qv(rowAt(QS(), (y - 1) + 'Q4'), 'bs400'); return e && e0 ? pc(n / ((e + e0) / 2), 0) : '—'; }).join(' → ')} (2022 → 2025)${fw.c.tp && fw.bv26 ? `; TP trung vị ${nf(fw.c.tp)}đ tương đương P/B 2026F ${xx(fw.c.tp / fw.bv26)}` : ''}.</div></article>
  <article class="card"><h3 class="sub">Rủi ro chính</h3><table><thead><tr><th>Rủi ro</th><th>Dấu hiệu hiện tại</th><th>Theo dõi ở</th></tr></thead><tbody>${dnRisks().map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></article>`;
  const base = fw.bv26 || bv;
  const recalc = () => $$('#scTable tbody tr').forEach(tr => { const g = f => +$(`[data-f="${f}"]`, tr).value; const pb = g('coe') > g('g') ? (g('roe') - g('g')) / (g('coe') - g('g')) : null, p2 = pb ? pb * base : null;
    $('[data-o="pb"]', tr).textContent = xx(pb); $('[data-o="px"]', tr).textContent = p2 ? r100(p2) + 'đ' : '—'; $('[data-o="up"]', tr).textContent = p2 ? sg(p2 / px - 1) : '—'; });
  $$('#scTable input').forEach(i => i.oninput = recalc); recalc();
  $('#scSave').onclick = () => { const sc = $$('#scTable tbody tr').map(tr => ({ n: $('[data-f="n"]', tr).value, roe: +$('[data-f="roe"]', tr).value, coe: +$('[data-f="coe"]', tr).value, g: +$('[data-f="g"]', tr).value })); try { localStorage.setItem(SCEN_K(), JSON.stringify(sc)); $('#scMsg').textContent = 'Đã lưu.'; } catch (e) { $('#scMsg').textContent = 'Không lưu được.'; } };
  $('#scReset').onclick = () => { try { localStorage.removeItem(SCEN_K()); } catch (e) {} built.val = false; show('val'); };
  if (window.FSN) { const calcTxt = p2 => p2 ? `P/B <b>${xx(p2 / bv)}</b>${fw.bv26 ? ` · P/B fwd <b>${xx(p2 / fw.bv26)}</b>` : ''} · ${sg(p2 / px - 1)} vs giá` : '';
    FSN.mount($('#decNote'), { key: DKEY(), title: '1 · Quyết định hiện tại', textLabel: 'Lý do / điều kiện kích hoạt', placeholder: 'Mua khi: nêu điều kiện cụ thể…',
      sub: `Mỗi lần lưu là một bản mới theo ngày. Mỗi mức giá tự quy ra P/B hiện tại (BVPS ${nf(bv)}đ)${fw.bv26 ? ` và P/B forward (BVPS 2026F ${nf(fw.bv26)}đ)` : ''}.`,
      fields: f => `<div><label>Trạng thái</label><select data-k="status"><option value="">— chọn —</option>${['Tích cực', 'Trung lập', 'Tiêu cực'].map(o => `<option ${f.status === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
        <div><label>Hành động</label><select data-k="action"><option value="">— chọn —</option>${['Theo dõi', 'Chờ điểm mua', 'Mua thăm dò', 'Mua', 'Nắm giữ', 'Giảm tỷ trọng', 'Không đầu tư'].map(o => `<option ${f.action === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
        ${[['tp', 'Giá mục tiêu (đ)'], ['buy', 'Giá mua (đ)'], ['stop', 'Cắt lỗ (đ)']].map(([k, l]) => `<div><label>${l}</label><input data-k="${k}" inputmode="numeric" value="${esc(f[k] || '')}"><div class="calc" data-c="${k}"></div></div>`).join('')}`,
      afterFields: el => $$('input[data-k]', el).forEach(i => { const cc = $(`[data-c="${i.dataset.k}"]`, el); const f2 = () => cc.innerHTML = calcTxt(numv(i.value)); i.oninput = f2; f2(); }),
      read: el => Object.fromEntries($$('[data-k]', el).map(i => [i.dataset.k, i.tagName === 'INPUT' ? String(numv(i.value) || '') : i.value])),
      meta: f => [f.status && `<span class="fsn-chip">Trạng thái: <b>${esc(f.status)}</b></span>`, f.action && `<span class="fsn-chip">Hành động: <b>${esc(f.action)}</b></span>`,
        ...[['tp', 'Giá mục tiêu'], ['buy', 'Giá mua'], ['stop', 'Cắt lỗ']].filter(([k]) => numv(f[k])).map(([k, l]) => `<span class="fsn-chip">${l}: <b>${nf(numv(f[k]))}đ</b> <small>${calcTxt(numv(f[k]))}</small></span>`)].filter(Boolean).join(''),
      onSave: () => { built.ov = false; built.cons = false; } }); }
  const Q = rqS(), lb = Q.map(r => qLbl(r[0])), b2 = band(2);
  mk('chVal', { type: 'line', data: { labels: lb, datasets: [line('P/B', Q.map(r => r[1]), C.navy, { unit: 'x', dp: 2 }), line('TB P/B 20 quý', Q.map(() => bP ? bP.m : null), C.navy, { pointRadius: 0, borderDash: [5, 4], borderWidth: 1, unit: 'x', dp: 2 }),
    line('P/E', Q.map(r => r[2] > 0 && r[2] < 80 ? r[2] : null), C.teal, { yAxisID: 'y1', unit: 'x', dp: 1 }), line('TB P/E 20 quý', Q.map(() => b2 ? b2.m : null), C.teal, { yAxisID: 'y1', pointRadius: 0, borderDash: [5, 4], borderWidth: 1, unit: 'x', dp: 1 })] },
    options: { scales: { x: { grid: { display: false } }, y: yNum('P/B', { ticks: { callback: y => nf(y, 1) + 'x' } }), y1: yNum('P/E', { position: 'right', grid: { display: false }, ticks: { callback: y => nf(y, 0) + 'x' } }) } } });
  const pts = PEERS().map(s => { const R2 = IS_INS ? W.ins[s] : W.sec[s], q2 = last(R2)[0], e = avgBal(R2, q2, x => IS_INS ? iv(x, 'bs400') : sv(x, 'bs400')), n = ttm(R2, q2, x => IS_INS ? iv(x, 'is60') : sv(x, 'is200')); return { s, x: n != null && e ? n / e * 100 : null, y: W.val[s].pb }; }).filter(o => o.x != null && o.y != null);
  const nP = pts.length, mx = pts.reduce((a, o) => a + o.x, 0) / nP, my = pts.reduce((a, o) => a + o.y, 0) / nP, sl = pts.reduce((a, o) => a + (o.x - mx) * (o.y - my), 0) / pts.reduce((a, o) => a + (o.x - mx) ** 2, 0), ic = my - sl * mx;
  const xs = [Math.min(...pts.map(o => o.x)), Math.max(...pts.map(o => o.x))];
  mk('chPbRoe', { type: 'scatter', data: { datasets: [{ type: 'scatter', label: 'Doanh nghiệp', data: pts.map(o => ({ x: o.x, y: o.y, s: o.s })), backgroundColor: pts.map(o => o.s === SYM ? C.red : C.navy + 'aa'), pointRadius: pts.map(o => o.s === SYM ? 8 : 5) },
    { type: 'line', label: 'Hồi quy', data: xs.map(x => ({ x, y: ic + sl * x })), borderColor: C.grey, borderDash: [5, 4], borderWidth: 1.2, pointRadius: 0 }] },
    plugins: [{ id: 'sLbl', afterDatasetsDraw(ch) { const x = ch.ctx; x.save(); x.font = '700 11px Arial'; x.fillStyle = '#303540'; ch.getDatasetMeta(0).data.forEach((e, i) => x.fillText(pts[i].s, e.x + 8, e.y - 6)); x.restore(); } }],
    options: { interaction: { mode: 'nearest', intersect: true }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: cx => cx.raw.s ? `${cx.raw.s}: ROE ${nf(cx.raw.x, 1)}%, P/B ${nf(cx.raw.y, 2)}x` : '' } } }, scales: { x: yPct('ROE 4 quý'), y: yNum('P/B', { ticks: { callback: y => nf(y, 1) + 'x' } }) } } });
  const ev = W.events.filter(e => e.s === SYM && (e.cash || e.stk)), ys = [...new Set(ev.map(e => (e.ex || e.rec || '').slice(0, 4)))].filter(Boolean).sort();
  const stkPct = e => e.stk ? (e.stk < 1 ? e.stk * 100 : e.stk) : 0;
  mk('chDiv', { type: 'bar', data: { labels: ys, datasets: [bar('Cổ tức tiền (đ/CP)', ys.map(y => ev.filter(e => (e.ex || e.rec).startsWith(y)).reduce((a, e) => a + (e.cash || 0), 0) || null), C.navy, { unit: 'đ', dp: 0 }),
    bar('Cổ tức cổ phiếu, thưởng (%)', ys.map(y => ev.filter(e => (e.ex || e.rec).startsWith(y)).reduce((a, e) => a + stkPct(e), 0) || null), C.teal, { yAxisID: 'y1', unit: '%', dp: 1 })] },
    options: { plugins: { title: { display: !ys.length, text: 'Không có cổ tức trong dữ liệu', color: '#8a90a0', font: { size: 12, weight: 'normal' } } }, scales: { x: { grid: { display: false } }, y: yNum('đ/CP'), y1: yPct('%', { position: 'right', grid: { display: false } }) } } });
  const PL = W.plans.filter(p => p.s === SYM && p.pbt).sort((a, b) => a.y - b.y);
  mk('chPlanDone', { type: 'bar', data: { labels: PL.map(p => { const n = yearSum(p.y, PBT_K()).n; return n < 4 ? `${p.y} (${n}Q)` : String(p.y); }), datasets: [bar('% kế hoạch LNTT', PL.map(p => yearSum(p.y, PBT_K()).v / p.pbt * 100), PL.map(p => yearSum(p.y, PBT_K()).n < 4 ? C.teal : yearSum(p.y, PBT_K()).v >= p.pbt ? C.green : C.red), { unit: '%', dp: 0 })] },
    options: { plugins: { legend: { display: false }, vref: { lines: [{ value: 100, label: '100% kế hoạch', color: C.grey }] } }, scales: { x: { grid: { display: false } }, y: yPct('%') } } });
}
function pbRoeIns() {
  const pts = PEERS().map(s => { const R2 = IS_INS ? W.ins[s] : W.sec[s], q2 = last(R2)[0], e = avgBal(R2, q2, x => IS_INS ? iv(x, 'bs400') : sv(x, 'bs400')), n = ttm(R2, q2, x => IS_INS ? iv(x, 'is60') : sv(x, 'is200')); return { s, x: n != null && e ? n / e : null, y: W.val[s].pb }; }).filter(o => o.x != null && o.y != null);
  const me = pts.find(o => o.s === SYM); if (!me || pts.length < 3) return '';
  const mx = pts.reduce((a, o) => a + o.x, 0) / pts.length, my = pts.reduce((a, o) => a + o.y, 0) / pts.length, sl = pts.reduce((a, o) => a + (o.x - mx) * (o.y - my), 0) / pts.reduce((a, o) => a + (o.x - mx) ** 2, 0), fit = my + sl * (me.x - mx);
  return `${SYM}: ROE ${pc(me.x, 1)}, P/B ${xx(me.y)}; đường hồi quy của nhóm cho P/B ${xx(fit)} ở mức ROE này → ${SYM} đang được định giá ${me.y > fit ? 'cao' : 'thấp'} hơn nhóm <b>${pc(Math.abs(me.y / fit - 1), 0)}</b> so với khả năng sinh lời.`;
}
function dnRisks() {
  const R = QS(), q = last(R)[0], r = last(R);
  if (IS_INS) { const m = insMetrics(SYM);
    return [['Lãi suất giảm', `Lợi nhuận tài chính bằng ${pc(m.fin, 0)} LNTT; danh mục gấp ${nf(m.invEq, 1)} lần vốn chủ`, 'Tài chính › Lãi tiền gửi, lợi suất danh mục'],
      SYM === 'BVH' ? ['Hủy hợp đồng nhân thọ tăng', 'Giá trị hoàn lại 6T/2026 tăng 23,5% trong khi phí giảm 3,3%', 'Tài chính › Chi trả theo loại; ngành › Catalyst'] : ['Tỷ lệ bồi thường tăng', `Tỷ lệ kết hợp 4 quý ${pc(m.cr, 1)}; bồi thường ${pc(m.lr, 0)} phí thuần`, 'Tài chính › Tỷ lệ bồi thường, kết hợp'],
      ['Tăng trưởng phí chậm lại', `Phí gốc 4 quý ${sg(m.gy, 1)}`, 'Tài chính › Phí theo năm; ngành › Bức tranh'],
      ['Định giá', `P/B ${xx(W.val[SYM].pb)}, ROE ${pc(m.roe, 1)}`, 'Consensus; FinSuccess › P/B và ROE']]; }
  const debt = debtOf(r), eq = sv(r, 'bs400');
  return [['Thị trường điều chỉnh, thanh khoản giảm', `Môi giới và lãi FVTPL chiếm ${pc(((sv(r, 'is06') || 0) + (sv(r, 'is01') || 0) + (sv(r, 'is21') || 0)) / sv(r, 'is20'), 0)} doanh thu ${qLbl(q)}`, 'Tài chính › Doanh thu theo mảng'],
    ['Rủi ro cho vay ký quỹ', `Cho vay ${pc(sv(r, 'bs114') / eq, 0)} vốn chủ (trần 200%)`, 'Tài chính › Cho vay ký quỹ'],
    ['Chi phí vốn tăng', `Nợ vay ${pc(debt / eq, 0)} vốn chủ`, 'Tài chính › Lợi suất cho vay và chi phí vốn'],
    ['Danh mục tự doanh', `FVTPL ${pc(sv(r, 'bs112') / eq, 0)} vốn chủ`, 'Tài chính › Danh mục FVTPL; LN chưa thực hiện'],
    ['Định giá', `P/B ${xx(W.val[SYM].pb)}, ROE 4 quý ${pc(ttmRoe(R, q), 1)}`, 'Consensus; FinSuccess › P/B và ROE']];
}

/* =====================================================================
   ĐIỀU HƯỚNG
===================================================================== */
window.FSH = { W, SYM, IS_INS, QS, sv, last, card, tbl, kpi, mk, nf, pc, sg, cls, esc, qLbl, C, WI, bar, yNum };
const builders = PAGE === 'dn' ? { ov: dnOv, fin: dnFin, events: dnEvents, cons: dnCons, val: dnVal }
  : { ov: PAGE === 'bh' ? paneOvBH : paneOvCK, picture: panePicture, policy: panePolicy, catalyst: paneCatalyst, cons: paneCons, book: paneBook, src: paneSrc };
const built = {};
function show(k) {
  if (!builders[k]) k = 'ov';
  $$('#tabbar button').forEach(b => { const on = b.dataset.tab === k; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
  $$('.pane').forEach(p => p.classList.toggle('active', p.id === k));
  if (!built[k]) { built[k] = true; try { builders[k](); } catch (e) { console.error(e); $('#' + k).insertAdjacentHTML('beforeend', '<p class="muted">Không dựng được phần này.</p>'); } }
  try { history.replaceState(null, '', '#' + k); } catch (e) {}
}
$$('#tabbar button').forEach(b => b.onclick = () => { show(b.dataset.tab); window.scrollTo({ top: 0 }); });
if (PAGE === 'dn') { if (!CO) { $('main .wrap').innerHTML = '<p>Không có dữ liệu cho mã này.</p>'; return; } dnHeader(); } else header();
$('#foot').innerHTML = `<div>FinSuccess · ${PAGE === 'dn' ? SYM + ' · ' + esc(CO.n) : 'Dashboard ngành ' + (PAGE === 'bh' ? 'Bảo hiểm' : 'Chứng khoán')} (đang xây dựng) · dữ liệu dựng ${dvn(F.built)}. Không phải khuyến nghị đầu tư.</div>`;
{ const h = (location.hash || '#ov').slice(1); if (PAGE !== 'dn' && SUBS.some(x => x[0] === h)) openSub(h); else show(h); }
window.FSSHARE = { prep: PAGE === 'dn' ? () => Object.keys(builders).forEach(k => { if (!built[k]) { built[k] = true; builders[k](); } }) : buildAll,
  path(c) { const p = c.closest('.pane'), b = p && document.querySelector(`#tabbar [data-tab="${p.id}"]`), sb = c.closest('.sub'), t = SUBS && sb ? (SUBS.find(x => x[0] === sb.dataset.pp) || [])[1] : ''; return [b ? b.textContent.trim().replace(/^\d+\.\s*/, '') : '', t].filter(Boolean); } };
})();
