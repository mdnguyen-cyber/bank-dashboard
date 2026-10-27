/* Ngành tài chính khác (đang xây dựng): Bảo hiểm nhân thọ, phi nhân thọ, môi giới bảo hiểm và Chứng khoán.
   Dữ liệu: window.FIN_DATA (data/fin-data.js, scripts/build_fin_data.py).
   - Thị trường bảo hiểm: số công bố của Bộ Tài chính (Niên giám, Bản tin thị trường bảo hiểm), IAV, GSO, báo chí dẫn nguồn; nguồn ghi theo từng điểm số.
   - Doanh nghiệp niêm yết, BCTC tổng hợp ngành, định giá: Wi MCP. */
(function () {
'use strict';
const F = window.FIN_DATA; if (!F) return;
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
const charts = {};
function mk(id, cfg, o = {}) {
  const el = document.getElementById(id); if (!el) return;
  if (charts[id]) charts[id].destroy();
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
const tbl = (head, rows, o = {}) => `<div class="tscroll"><table class="${o.cls || ''}"><thead><tr>${head.map((h, i) => `<th${i && o.num !== false ? ' class="n"' : ''}>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i && o.num !== false ? ' class="n"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
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
  $('#stockHead').innerHTML = `<div class="tick">TC KHÁC</div>
    <div class="cname">Ngành tài chính khác · Bảo hiểm và Chứng khoán <span class="pill watch">Đang xây dựng</span><small>Thị trường bảo hiểm theo số công bố của Bộ Tài chính, IAV; doanh nghiệp niêm yết và định giá theo Wi MCP · dựng ${dvn(F.built)}</small></div>
    <div class="hstats">
      <div class="hstat"><span>Phí BH ${kyShort(tP[0])}</span><b>${nf(tP[1])} tỷ</b></div>
      <div class="hstat"><span>Nhân thọ YoY</span><b>${sg(lP[2])}</b></div>
      <div class="hstat"><span>Phi nhân thọ YoY</span><b>${sg(nP[2])}</b></div>
      <div class="hstat"><span>P/B ngành CK</span><b>${nf(last(sv408.pb), 2)}x</b></div>
      <div class="hstat"><span>P/B ngành BH</span><b>${nf(last(sv406.pb), 2)}x</b></div>
    </div>`;
  $('#stamp').textContent = 'Dữ liệu dựng ngày ' + dvn(F.built);
}

/* =====================================================================
   TAB 1 · TỔNG QUAN
===================================================================== */
function paneOverview() {
  const tA = lastPt(ser('TOTAL', 'ASSETS')), tI = lastPt(ser('TOTAL', 'INVEST')), lNB = lastPt(ser('LIFE', 'NB_PREM')), lC = lastPt(ser('LIFE', 'CLAIMS'));
  const q = SEC_LASTQ, sr = rowAt(SECQ, q);
  const mEq = sv(sr, 'bs114') / sv(sr, 'bs400');
  $('#ov').innerHTML = `
  <h2 class="sec">Tổng quan · Bảo hiểm và Chứng khoán</h2>
  <p class="sec-sub">Hai ngành tài chính ngoài ngân hàng. Bảo hiểm: quy mô thị trường theo số công bố của Bộ Tài chính và IAV (lũy kế từ đầu năm). Chứng khoán: BCTC tổng hợp các công ty chứng khoán niêm yết và định giá ngành từ Wi MCP. Trang đang được xây tiếp.</p>
  <div class="kpis">
    ${kpi('Tổng phí bảo hiểm ' + kyShort(tP[0]), nf(tP[1]) + ' tỷ', 'YoY ' + sg(tP[2]), cls(tP[2]))}
    ${kpi('Phí nhân thọ ' + kyShort(lP[0]), nf(lP[1]) + ' tỷ', 'YoY ' + sg(lP[2]), cls(lP[2]))}
    ${kpi('Phí khai thác mới NT', nf(lNB[1]) + ' tỷ', kyShort(lNB[0]) + ' · YoY ' + sg(lNB[2]), cls(lNB[2]))}
    ${kpi('Phí phi nhân thọ ' + kyShort(nP[0]), nf(nP[1]) + ' tỷ', 'YoY ' + sg(nP[2]), cls(nP[2]))}
    ${kpi('Đầu tư trở lại nền KT', nf(tI[1] / 1000, 0) + ' nghìn tỷ', 'Tổng tài sản ' + nf(tA[1] / 1000, 0) + ' nghìn tỷ · ' + kyShort(tI[0]))}
    ${kpi('Cho vay ký quỹ / VCSH CTCK', pc(mEq, 0), 'tổng các CTCK niêm yết · ' + qLbl(q))}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'ovPrem', title: 'Doanh thu phí bảo hiểm theo năm', sub: 'Tỷ đồng · cột: phi nhân thọ và nhân thọ; đường: tổng phí so GDP (trục phải). Năm 2025 là số ước.', src: FY_SRC + '; Tổng cục Thống kê (GSO)',
      ins: `Phí nhân thọ đạt đỉnh <b>${nf(fy('LIFE|PREM|Tổng|Toàn TT')[6])} tỷ</b> năm 2022 rồi giảm ba năm liền, còn <b>${nf(fy('LIFE|PREM|Tổng|Toàn TT')[9])} tỷ</b> năm 2025. Phi nhân thọ tăng đều, nên tỷ trọng phi nhân thọ trong tổng phí lên ${pc(fy('NONLIFE|PREM|Tổng|Toàn TT')[9] / fy('TOTAL|PREM|Tổng|Toàn TT')[9], 0)} năm 2025 (2022: ${pc(fy('NONLIFE|PREM|Tổng|Toàn TT')[6] / fy('TOTAL|PREM|Tổng|Toàn TT')[6], 0)}).` })}
    ${card({ id: 'ovPb', title: 'Định giá ngành: P/B chứng khoán và bảo hiểm', sub: 'Lần · theo phiên, toàn bộ cổ phiếu niêm yết của từng ngành', src: WI + ' (định giá ngành theo ngày)',
      ins: `P/B ngành chứng khoán ${nf(last(sv408.pb), 2)}x, ngành bảo hiểm ${nf(last(sv406.pb), 2)}x (phiên ${dvn(last(sv408.d))}). Trung bình 3 năm: chứng khoán ${nf(avgN(sv408.pb, 750), 2)}x, bảo hiểm ${nf(avgN(sv406.pb, 750), 2)}x.` })}
  </div>
  <div class="grid g2 gap">
    ${card({ title: 'Bảo hiểm: điều đang diễn ra', body: `<ul class="ilist">
      <li><b>Nhân thọ thu hẹp sau 2022.</b> Phí khai thác mới năm 2025 bằng khoảng ${pc(fy('LIFE|NB_PREM|Tổng|Toàn TT')[9] / fy('LIFE|NB_PREM|Tổng|Toàn TT')[6], 0)} mức đỉnh 2022; số hợp đồng có hiệu lực ${nf(lastPt(ser('LIFE', 'INFORCE_CONTRACTS'))[1] / 1e6, 2)} triệu (${kyShort(lastPt(ser('LIFE', 'INFORCE_CONTRACTS'))[0])}), từ đỉnh ${(() => { const v = fy('LIFE|INFORCE_CONTRACTS|Tổng|Toàn TT'), m = Math.max(...v.filter(x => x != null)); return nf(m / 1e6, 1) + ' triệu cuối ' + FYY[v.indexOf(m)]; })()}.</li>
      <li><b>Chi trả tăng nhanh hơn phí.</b> ${kyLbl(lC[0])}: chi trả quyền lợi nhân thọ ${nf(lC[1])} tỷ (${sg(lC[2])}), phí ${sg(lP[2])}. Hợp đồng ký đợt 2018–2022 đang đáo hạn và bị hủy.</li>
      <li><b>Sản phẩm chuyển sang tử kỳ.</b> Tử kỳ chiếm ${pc(at(ser('LIFE', 'NB_CONTRACTS_MIX', 'Tử kỳ'), lP[0]), 1)} số hợp đồng mới ${kyShort(lP[0])}; phí mới bình quân mỗi hợp đồng giảm.</li>
      <li><b>Phi nhân thọ tăng nhanh nhất nhiều năm:</b> ${sg(nP[2])} ${kyShort(nP[0])}, sức khỏe và tài sản dẫn dắt.</li></ul>`,
      src: srcOf(ser('LIFE', 'PREM').slice(-3), ser('LIFE', 'CLAIMS').slice(-2), ser('NONLIFE', 'PREM').slice(-2)) })}
    ${card({ title: 'Chứng khoán: điều đang diễn ra', body: secOverviewList(), src: WI + ' (BCTC tổng hợp ngành chứng khoán, định giá ngành)' })}
  </div>
  <article class="card"><h3 class="sub">Lộ trình xây trang</h3>
    <div class="tscroll"><table><thead><tr><th>Phần</th><th>Đã có</th><th>Đang bổ sung</th></tr></thead><tbody>
      <tr><td><b>Bảo hiểm nhân thọ</b></td><td>Phí, khai thác mới, hợp đồng, cơ cấu sản phẩm, thị phần, chi trả, hoa hồng, BVH</td><td>Kênh phân phối theo kỳ, giá trị hoàn lại toàn thị trường, biên khả năng thanh toán</td></tr>
      <tr><td><b>Bảo hiểm phi nhân thọ</b></td><td>Phí, nghiệp vụ, tỷ lệ bồi thường, thị phần, 5 mã niêm yết, môi giới</td><td>Tái bảo hiểm (VNR), chuỗi cầu từng nghiệp vụ (ô tô, tín dụng, tiền gửi)</td></tr>
      <tr><td><b>Chứng khoán</b></td><td>Doanh thu theo mảng, cho vay ký quỹ, nợ vay, danh mục, định giá, 9 mã</td><td>Giá trị giao dịch toàn thị trường, thị phần môi giới HOSE, chi phí vốn (lãi suất, vay nước ngoài), phát hành TPDN theo tổ chức tư vấn, số IPO</td></tr>
    </tbody></table></div></article>`;
  const yrs = FYY.map(String);
  mk('ovPrem', { type: 'bar', data: { labels: yrs, datasets: [
    bar('Phi nhân thọ', fy('NONLIFE|PREM|Tổng|Toàn TT'), C.teal, { stack: 's', unit: ' tỷ' }),
    bar('Nhân thọ', fy('LIFE|PREM|Tổng|Toàn TT'), C.navy, { stack: 's', unit: ' tỷ' }),
    line('Phí / GDP', fy('TOTAL|PREM_GDP|Tổng|Toàn TT').map(v => v == null ? null : v * 100), C.purple, { yAxisID: 'y1', dp: 2 }) ] },
    options: { scales: { x: { stacked: true, grid: { display: false } }, y: yNum('tỷ đồng', { stacked: true }), y1: yPct('', { position: 'right', grid: { display: false }, ticks: { callback: v => nf(v, 1) + '%' } }) } } });
  const n = Math.min(sv408.d.length, sv406.d.length);
  mk('ovPb', { type: 'line', data: { labels: sv408.d.slice(-n).map(dvn), datasets: [
    line('Chứng khoán', sv408.pb.slice(-n), C.navy, { pointRadius: 0, unit: 'x', dp: 2 }), line('Bảo hiểm', sv406.pb.slice(-n), C.teal, { pointRadius: 0, unit: 'x', dp: 2 }) ] },
    options: { scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: yNum('lần', { ticks: { callback: v => nf(v, 1) + 'x' } }) } } }, { ts: true });
}
const avgN = (a, n) => { const b = a.slice(-n).filter(v => v != null); return b.length ? b.reduce((s, v) => s + v, 0) / b.length : null; };
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
  <article class="card"><h3 class="sub">Chuỗi giá trị bảo hiểm nhân thọ</h3>
    <p class="chart-sub">Phí thu vào được trích lập dự phòng và đem đầu tư; phần lớn quay lại khách hàng qua bồi thường, đáo hạn, bảo tức. Số liệu toàn thị trường, kỳ ${kyLbl(k)}.</p>
    ${chain([
      { t: '1 · Đầu vào: bán hàng', d: 'Kênh đại lý, ngân hàng (bancassurance), môi giới; nhượng tái bảo hiểm phần rủi ro lớn.', k: [['Tổng phí', nf(p[1]) + ' tỷ', 'YoY ' + sg(p[2])], ['Phí khai thác mới', nf(nb[1]) + ' tỷ', 'YoY ' + sg(nb[2])], ['HĐ khai thác mới', nf(nc[1]), kyShort(nc[0]) + (nc[2] != null ? ' · YoY ' + sg(nc[2]) : '')], ['HĐ có hiệu lực', nf(inf[1] / 1e6, 2) + ' triệu', kyShort(inf[0])]] },
      { t: '2 · Trích lập và đầu tư', d: 'Dự phòng nghiệp vụ là nợ phải trả với khách hàng; tài sản đầu tư chủ yếu trái phiếu Chính phủ, tiền gửi, trái phiếu ngân hàng.', k: [['Dự phòng nghiệp vụ', nf(rs[1] / 1000, 0) + ' nghìn tỷ', kyShort(rs[0]) + (rs[2] != null ? ' · YoY ' + sg(rs[2]) : '')], ['Tổng tài sản', nf(as[1] / 1000, 0) + ' nghìn tỷ', kyShort(as[0])], ['Dự phòng / tổng tài sản', rs[0] === as[0] ? pc(rs[1] / as[1], 0) : '—', ''], ['Đầu tư trở lại nền KT', nf(iv[1] / 1000, 0) + ' nghìn tỷ', kyShort(iv[0])], ['Vốn chủ sở hữu', nf(eq[1] / 1000, 0) + ' nghìn tỷ', kyShort(eq[0])]] },
      { t: '3 · Đầu ra: chi trả', d: 'Bồi thường, đáo hạn, giá trị hoàn lại khi hủy hợp đồng, bảo tức.', k: [['Chi trả quyền lợi', nf(cl[1]) + ' tỷ', kyShort(cl[0]) + ' · YoY ' + sg(cl[2])], ['Chi trả / phí', cp != null ? pc(cp, 1) : '—', cp0 != null ? 'cùng kỳ ' + pc(cp0, 1) : '']] }])}
    <div class="insight">Chỉ số theo dõi: <b>phí mới / HĐ có hiệu lực</b> (động lực tăng trưởng), <b>dự phòng / tài sản</b> và <b>cơ cấu danh mục × lợi suất</b> (thu nhập đầu tư), <b>chi trả / phí</b> và <b>đáo hạn / phí</b> (áp lực đầu ra). Chi trả / phí cùng kỳ tính từ số tăng trưởng nguồn công bố.</div>
    <div class="src">Nguồn: ${srcOf([p, nb, cl, inf, nc, rs, as, iv, eq])}</div></article>
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
  ${bvhBlock()}
  ${lawBlock()}`;
  drawLife(k);
}
function commTable() {
  const cos = [...new Set(I.comm.map(r => r.co))], ys = [2021, 2022, 2023, 2024];
  const cell = (c, y, f) => { const r = I.comm.find(x => x.co === c && x.y === y); if (!r || r[f] == null) return '<span class="muted">—</span>'; return pc(r[f], 1) + (/Báo chí/.test(r.st || '') ? '*' : ''); };
  return `<div class="tscroll"><table class="cmpt"><thead><tr><th rowspan="2">Doanh nghiệp</th><th colspan="4" class="n">Hoa hồng / tổng phí</th><th colspan="2" class="n">Hoa hồng / phí KTM</th></tr><tr>${ys.map(y => `<th class="n">${y}</th>`).join('')}<th class="n">2021</th><th class="n">2024</th></tr></thead><tbody>
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
  drawBvh();
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
  <article class="card"><h3 class="sub">Chỉ số chính của doanh nghiệp phi nhân thọ</h3>
    <p class="chart-sub">Doanh thu thuần (phí giữ lại sau nhượng tái, cộng nhận tái) tạo quỹ dự phòng và vốn để đầu tư; lợi nhuận = biên nghiệp vụ (100% − tỷ lệ kết hợp) + lợi suất danh mục × quy mô danh mục.</p>
    ${chain([
      { t: 'Doanh thu', d: 'Phí gốc, nhận tái; trừ phí nhượng tái và hoàn phí.', k: [['Doanh thu thuần / VCSH', 'đo tốc độ quay vốn của nghiệp vụ', ''], ['Phí nhận tái / tổng phí', '> 10% thì không so được bồi thường với DN chỉ bán gốc', '']] },
      { t: 'Chi phí nghiệp vụ', d: 'Bồi thường + chi phí khai thác, quản lý.', k: [['Tỷ lệ bồi thường', 'bồi thường / phí thuần', ''], ['Tỷ lệ chi phí', '(chi trực tiếp − bồi thường + bán hàng + quản lý) / doanh thu thuần', ''], ['Tỷ lệ kết hợp', 'bồi thường + chi phí; dưới 100% là nghiệp vụ có lãi', '']] },
      { t: 'Đầu tư', d: 'Tiền gửi, trái phiếu, cổ phiếu; lãi tiền gửi thường là phần lớn.', k: [['Danh mục / VCSH', '', ''], ['Lợi suất = Σ tỷ trọng × lợi suất từng loại', 'lãi suất huy động, lợi suất TPCP, TPDN', ''], ['LN tài chính / LNTT', '> 100% là nghiệp vụ lỗ, đầu tư bù', '']] }])}
  </article>
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
  <article class="card"><h3 class="sub">Chuỗi giá trị công ty chứng khoán</h3>
    <p class="chart-sub">Vốn chủ và vốn vay được đưa vào bốn mảng; số liệu tổng các công ty niêm yết, ${qLbl(q)} (số dư) và 4 quý gần nhất (doanh thu).</p>
    ${chain([
      { t: '1 · Đầu vào: vốn và khách hàng', d: 'Vốn chủ; vay ngân hàng, phát hành trái phiếu, vay nước ngoài; đội môi giới; nguồn thương vụ.', k: [['Vốn chủ sở hữu', nf(sv(r, 'bs400') / 1000, 0) + ' nghìn tỷ', ''], ['Vay và trái phiếu phát hành', nf(debtOf(r) / 1000, 0) + ' nghìn tỷ', pc(debtOf(r) / sv(r, 'bs400'), 0) + ' VCSH'], ['Tổng tài sản', nf(sv(r, 'bs270') / 1000, 0) + ' nghìn tỷ', '']] },
      { t: '2 · Hoạt động', d: 'Môi giới; cho vay ký quỹ và ứng trước; tự doanh (FVTPL, AFS, HTM); ngân hàng đầu tư (bảo lãnh, tư vấn).', k: [['Cho vay', nf(sv(r, 'bs114') / 1000, 0) + ' nghìn tỷ', pc(sv(r, 'bs114') / sv(r, 'bs400'), 0) + ' VCSH'], ['FVTPL', nf(sv(r, 'bs112') / 1000, 0) + ' nghìn tỷ', pc(sv(r, 'bs112') / sv(r, 'bs400'), 0) + ' VCSH'], ['HTM + AFS', nf(((sv(r, 'bs113') || 0) + (sv(r, 'bs115') || 0)) / 1000, 0) + ' nghìn tỷ', 'thu nhập cố định là chính']] },
      { t: '3 · Đầu ra: doanh thu 4 quý', d: 'Phí môi giới, lãi cho vay, lãi lỗ danh mục, phí ngân hàng đầu tư.', k: [['Môi giới', nf(tS(x => sv(x, 'is06'))) + ' tỷ', ''], ['Lãi cho vay và phải thu', nf(tS(x => sv(x, 'is03'))) + ' tỷ', ''], ['Lãi FVTPL ròng', nf(tS(x => (sv(x, 'is01') || 0) + (sv(x, 'is21') || 0))) + ' tỷ', 'đã trừ lỗ FVTPL'], ['Bảo lãnh và tư vấn', nf(tS(x => (sv(x, 'is07') || 0) + (sv(x, 'is10') || 0))) + ' tỷ', '']] }])}
    <div class="insight"><b>Mô hình dự phóng:</b> doanh thu môi giới = giá trị giao dịch thị trường × thị phần × phí bình quân; lãi cho vay = dư nợ thị trường × thị phần × lợi suất, giới hạn bởi trần cho vay 200% VCSH và cơ cấu nguồn vốn; danh mục tách thu nhập cố định khỏi cổ phiếu, phần cổ phiếu định giá lại theo ROE kỳ vọng, chỉ số và margin, từng mã hoặc đồng thuận. Thứ tự đánh giá một mã: P/B so đồng thuận, rồi thị phần môi giới và hiệu quả phí, thị phần margin và NIM, thương vụ IB, danh mục tự doanh.</div></article>
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
    ${card({ id: 'scPb', title: 'P/B ngành chứng khoán và VN-Index', sub: 'P/B theo phiên (trục trái); VN-Index cuối tháng (trục phải)', src: WI + ' (định giá ngành theo ngày; VN-Index)' })}
  </div>
  <article class="card"><h3 class="sub">Dữ liệu đang bổ sung</h3>
    ${tbl(['Chỉ số', 'Dùng để', 'Trạng thái'], [
      ['Giá trị giao dịch toàn thị trường theo tháng', 'Dự phóng doanh thu môi giới', '<span class="pill pending">Đang lấy</span>'],
      ['Thị phần môi giới HOSE theo quý', 'Thị phần × phí', '<span class="pill pending">Đang lấy</span>'],
      ['Dư nợ margin toàn thị trường (gồm CTCK chưa niêm yết)', 'Thị phần margin', '<span class="pill pending">Đang lấy</span>'],
      ['Chi phí vốn: lãi suất vay ngân hàng, vay hợp vốn nước ngoài', 'NIM mảng cho vay', '<span class="pill pending">Đang lấy</span>'],
      ['Lợi suất thu nhập cố định (tiền gửi, CD, TPDN)', 'Thu nhập danh mục FI', '<span class="pill pending">Đang lấy</span>'],
      ['Số thương vụ IPO, phát hành TPDN theo tổ chức tư vấn (TCBS, HDS, VPBS…)', 'Doanh thu ngân hàng đầu tư', '<span class="pill pending">Đang lấy</span>'],
      ['Danh mục tự doanh chi tiết theo mã', 'Định giá lại danh mục cổ phiếu', '<span class="pill pending">Đang lấy</span>']], { num: false })}</article>`;
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
  $('#src').innerHTML = `
  <h2 class="sec">Phương pháp · Nguồn</h2>
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
  <article class="card"><h3 class="sub">Chứng khoán và doanh nghiệp niêm yết</h3>
    <ul class="ilist">
      <li><b>BCTC</b>: báo cáo tài chính hợp nhất theo quý của từng công ty và báo cáo tổng hợp ngành chứng khoán, ngành bảo hiểm (${WI}). Số dư cuối quý; doanh thu, lợi nhuận cộng 4 quý gần nhất.</li>
      <li><b>Tỷ lệ kết hợp (phi nhân thọ)</b> = (|tổng chi trực tiếp kinh doanh bảo hiểm| + |chi phí quản lý| + |chi phí bán hàng|) / doanh thu thuần kinh doanh bảo hiểm. Không dùng cho nhân thọ vì chi trực tiếp gồm tăng dự phòng toán học.</li>
      <li><b>Tỷ lệ bồi thường</b> = |tổng chi bồi thường và trả tiền bảo hiểm| / doanh thu phí bảo hiểm thuần; đã gồm thay đổi dự phòng bồi thường.</li>
      <li><b>Nợ vay CTCK</b> = vay và nợ thuê tài chính ngắn hạn + trái phiếu phát hành ngắn hạn, dài hạn.</li>
      <li><b>Định giá</b>: P/B, P/E theo phiên của từng mã và toàn ngành (${WI}).</li></ul></article>`;
}
const srcType = t => ({ 'MOF - Niên giám/Báo cáo năm (chính thức)': 'Bộ Tài chính – Niên giám', 'MOF - Bản tin/Tổng quan (Cục QLGSBH)': 'Bộ Tài chính – Bản tin', 'IAV - Hiệp hội Bảo hiểm VN': 'IAV', 'Báo chí dẫn Bộ Tài chính/Cục QLGSBH': 'Báo chí dẫn Bộ Tài chính', 'Báo chí/khác': 'Báo chí', 'DN tự công bố': 'Doanh nghiệp công bố', 'Tổng cục Thống kê (GSO)': 'GSO' }[t] || t || '');

/* =====================================================================
   ĐIỀU HƯỚNG
===================================================================== */
const builders = { ov: paneOverview, life: paneLife, nonlife: paneNonlife, sec: paneSec, src: paneSrc };
const built = {};
function show(k) {
  if (!builders[k]) k = 'ov';
  $$('#tabbar button').forEach(b => { const on = b.dataset.tab === k; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
  $$('.pane').forEach(p => p.classList.toggle('active', p.id === k));
  if (!built[k]) { built[k] = true; try { builders[k](); } catch (e) { console.error(e); $('#' + k).insertAdjacentHTML('beforeend', '<p class="muted">Không dựng được phần này.</p>'); } }
  try { history.replaceState(null, '', '#' + k); } catch (e) {}
}
$$('#tabbar button').forEach(b => b.onclick = () => { show(b.dataset.tab); window.scrollTo({ top: 0 }); });
header();
$('#foot').innerHTML = `<div>FinSuccess · Dashboard Ngành tài chính khác (đang xây dựng) · dữ liệu dựng ${dvn(F.built)}. Không phải khuyến nghị đầu tư.</div>`;
show((location.hash || '#ov').slice(1));
window.FSSHARE = { prep() { Object.keys(builders).forEach(k => { if (!built[k]) { built[k] = true; builders[k](); } }); },
  path(c) { const p = c.closest('.pane'), b = p && document.querySelector(`#tabbar [data-tab="${p.id}"]`); return [b ? b.textContent.trim().replace(/^\d+\.\s*/, '') : '']; } };
})();
