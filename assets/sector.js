/* Ngành Ngân hàng · CSTT — renderer. Dữ liệu: window.SECTOR_DATA (data/sector-data.js, sinh từ WiData bằng
   scripts/build_sector_data.py). Lời đọc (insight) do AI viết từ số đang hiển thị; quan điểm FinSuccess chỉ ở ô
   "Nhận định FinSuccess" (lưu trên trình duyệt). Layout theo dashboard ngành của công ty (bản Dầu khí). */
(function () {
'use strict';
const D = window.SECTOR_DATA;
const PAGE = document.body.dataset.page || 'nganh';   // 'nganh' = Ngành ngân hàng · 'vimo' = Vĩ mô
const ECO = window.ECO_DATA || null;
const C = { navy: '#002060', blue: '#97BAFF', teal: '#59C5C8', tealInk: '#1f8a8d', purple: '#861C52', gold: '#d9a400', red: '#c0392b', grey: '#9aa3b2',
  steps: ['#002060', '#3D5C99', '#5576B8', '#6171C5', '#8997D6', '#B3BDE8', '#D9DEF4'] };
const GC = { 'Big 4': C.navy, 'Tư nhân lớn': C.tealInk, 'Tư nhân vừa': C.purple, 'Tư nhân nhỏ': C.grey };
const GROUPS = ['Big 4', 'Tư nhân lớn', 'Tư nhân vừa', 'Tư nhân nhỏ'];
const SCN = {
  ease: { t: 'Nới lỏng mạnh', fx: 'thấp', liq: 'dồi dào', rate: 'Lãi suất giảm nhanh', bank: 'NIM mở rộng, định giá lại tăng' },
  drain: { t: 'NHNN hút tiền về', fx: 'cao', liq: 'dồi dào', rate: 'Liên ngân hàng tăng', bank: 'Tăng trưởng chậm lại' },
  room: { t: 'Dư địa bơm tiền', fx: 'thấp', liq: 'thiếu', rate: 'Huy động gần đỉnh', bank: 'Theo dõi tín hiệu nới sớm' },
  tight: { t: 'Thắt chặt kéo dài', fx: 'cao', liq: 'thiếu', rate: 'Lãi suất cao kéo dài', bank: 'COF tăng, nợ xấu tăng' },
};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nf = (v, d = 0) => v == null || isNaN(v) ? '—' : Number(v).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });
const pc = (v, d = 1) => v == null ? '—' : nf(v, d) + '%';
const sg = (v, d = 1, u = '%') => v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + nf(Math.abs(v), d) + u;
const x = (v, d = 2) => v == null ? '—' : nf(v, d) + 'x';
const dvn = s => s ? s.slice(0, 10).split('-').reverse().join('/') : '—';
const mvn = s => s ? s.slice(5, 7) + '/' + s.slice(0, 4) : '—';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lastv = a => a[a.length - 1];
const med = arr => { const v = arr.filter(z => z != null).sort((a, b) => a - b); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const M = D.meta, TODAY = M.updated, I = D.idx, Lr = D.latest.rows, BQ = D.banks.quarters, AG = D.agg.series;
const NOW = I.now, SV = D.secVal;
const byM = arr => Object.fromEntries(arr.map(p => [p.d.slice(0, 7), p.v]));
const monthsFrom = (a, b) => { const out = []; let [y, m] = a.split('-').map(Number); const [Y, MM] = b.split('-').map(Number); while (y < Y || (y === Y && m <= MM)) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } } return out; };
const al = (arr, labs) => { const m = byM(arr); return labs.map(k => m[k] ?? null); };
const yoyAt = (arr, d) => { const m = byM(arr); const k = d.slice(0, 7); const [y, mm] = k.split('-'); return m[k] != null && m[`${+y - 1}-${mm}`] != null ? (m[k] / m[`${+y - 1}-${mm}`] - 1) * 100 : null; };

/* ---------- storage ---------- */
const KEY = 'fs-bank-sector';
const store = {
  get() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } },
  set(o) { try { localStorage.setItem(KEY, JSON.stringify(Object.assign(store.get(), o))); return true; } catch (e) { return false; } },
};

/* ---------- Chart.js ---------- */
Chart.defaults.font.family = 'Arial, "Helvetica Neue", sans-serif';
Chart.defaults.font.size = 11.5;
Chart.defaults.color = '#3f4656';
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.legend.position = 'bottom';
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.animation = false;
Chart.defaults.plugins.tooltip.callbacks.label = ctx => {
  const v = ctx.chart.options.indexAxis === 'y' ? ctx.parsed.x : (ctx.parsed.y ?? ctx.parsed.x); const ds = ctx.dataset;
  if (ds.$tip) return ds.$tip(ctx.dataIndex);
  return `${ds.label}: ${nf(v, ds.dp ?? 1)}${ds.unit || ''}`;
};
const refLines = { id: 'refLines',
  afterDatasetsDraw(chart, _a, opt) {
    const lines = opt && opt.lines; if (!lines) return; const { ctx, chartArea: a } = chart, tags = [];
    lines.forEach(l => {
      const sc = chart.scales[l.axis || 'y']; if (!sc) return; const p = sc.getPixelForValue(l.value), hz = sc.isHorizontal();
      if (!hz && (p < a.top - 1 || p > a.bottom + 1)) return; if (hz && (p < a.left - 1 || p > a.right + 1)) return;
      ctx.save(); ctx.strokeStyle = l.color || C.red; ctx.lineWidth = l.width || 1.5; ctx.setLineDash(l.dash || [5, 4]);
      ctx.beginPath(); if (hz) { ctx.moveTo(p, a.top); ctx.lineTo(p, a.bottom); } else { ctx.moveTo(a.left, p); ctx.lineTo(a.right, p); }
      ctx.stroke(); ctx.restore();
      if (l.label) tags.push({ l, p, hz });
    });
    ctx.save(); ctx.font = '600 11px Arial'; ctx.textBaseline = 'middle';
    const pill = (t, x, y, c, align) => { const w = ctx.measureText(t).width; let x0 = align === 'right' ? x - w : x; x0 = Math.max(a.left + 1, Math.min(x0, chart.width - w - 4));
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(x0 - 3, y - 7, w + 6, 14); ctx.fillStyle = c; ctx.textAlign = 'left'; ctx.fillText(t, x0, y); };
    tags.filter(t => t.hz).forEach(t => { const w = ctx.measureText(t.l.label).width, right = t.p + 4 + w > a.right; pill(t.l.label, right ? t.p - 4 : t.p + 4, a.top - 9, t.l.color || C.red, right ? 'right' : 'left'); });
    const hs = tags.filter(t => !t.hz).map(t => ({ ...t, y: t.p - 9 })).sort((u, v) => u.y - v.y);
    for (let i = 1; i < hs.length; i++) if (hs[i].y - hs[i - 1].y < 15) hs[i].y = hs[i - 1].y + 15;
    hs.forEach(t => pill(t.l.label, a.left + 6, Math.max(a.top + 7, t.y), t.l.color || C.red, 'left'));
    ctx.restore();
  } };
/* nền 4 ô kịch bản cho chart ma trận */
const quadBg = { id: 'quadBg', beforeDatasetsDraw(chart, _a, opt) {
  if (!opt || !opt.on) return; const { ctx, chartArea: a, scales: { x: sx, y: sy } } = chart;
  const x0 = sx.getPixelForValue(0), y0 = sy.getPixelForValue(0);
  const cells = [[a.left, a.top, x0, y0, '#e3f5ec', 'Nới lỏng mạnh'], [x0, a.top, a.right, y0, '#fff4d6', 'NHNN hút tiền về'],
    [a.left, y0, x0, a.bottom, '#eef1fb', 'Dư địa bơm tiền'], [x0, y0, a.right, a.bottom, '#fde8e6', 'Thắt chặt kéo dài']];
  ctx.save();
  cells.forEach(([l, t, r, b, c, txt]) => { ctx.fillStyle = c; ctx.fillRect(l, t, r - l, b - t); ctx.fillStyle = '#5a6682'; ctx.font = '700 11.5px Arial';
    const tx = l < x0 ? l + 8 : r - ctx.measureText(txt).width - 8; const ty = t < y0 ? t + 16 : b - 8; ctx.fillText(txt, tx, ty); });
  ctx.strokeStyle = '#c3c9d6'; ctx.setLineDash([3, 3]);
  [-1, 1].forEach(v => { const px = sx.getPixelForValue(v), py = sy.getPixelForValue(v); ctx.beginPath(); ctx.moveTo(px, a.top); ctx.lineTo(px, a.bottom); ctx.moveTo(a.left, py); ctx.lineTo(a.right, py); ctx.stroke(); });
  ctx.restore();
} };
Chart.register(refLines, quadBg);

const charts = {};
/* ---------- Chart book: mk() lưu cấu hình từng chart theo id để vẽ lại ở Chart book / Cập nhật nhanh ---------- */
const SPEC = {};
const cl = o => Array.isArray(o) ? o.map(cl) : (o && Object.getPrototypeOf(o) === Object.prototype) ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, cl(v)])) : o;
const PANE_LBL = { camel: 'Xếp hạng TT21', overview: 'Tổng quan', policy: 'Chính sách', catalyst: 'Catalyst', cons: 'Consensus', hot: 'Chủ đề nóng', intl: 'Quốc tế', dom: PAGE === 'vimo' ? 'Tiền tệ Việt Nam' : 'Vĩ mô tiền tệ', mm: 'Tỷ giá', bank: 'Ngân hàng', peer: 'So sánh ngân hàng', idx: 'Kịch bản IDX', eco: 'Kinh tế Việt Nam', bond: 'Trái phiếu', heat: 'Việt Nam & Thế giới', cmd: 'Hàng hóa' };
function cardMeta(el) {
  const c = el.closest('article.card'), pp = el.closest('[data-pp]'), pane = el.closest('.pane'), cc = el.closest('[data-cc]');
  const h = c && c.querySelector(':scope > h3.sub'), one = sel => { const e = c && c.querySelector(':scope > ' + sel); return e ? e.innerHTML : ''; };
  return { title: h ? (h.childNodes[0] || {}).textContent || '' : el.id, sub: one('.chart-sub'), src: one('.src'), insight: one('.insight'),
    group: cc && cc.dataset.cc !== 'ov' ? (cc && cc.dataset.cc === 'gl' ? 'Toàn cầu: lợi suất & lạm phát' : 'Quốc tế · ' + (GCOUNTRY.find(x => x[0] === cc.dataset.cc) || ['', ''])[1]) : PANE_LBL[pp ? pp.dataset.pp : pane ? pane.id : ''] || 'Khác', pane: pane ? pane.id : '', sp: pp ? pp.dataset.pp : '', cc: cc ? cc.dataset.cc : '' };
}
function buildAll() {   // dựng mọi tab (ẩn) để có đủ cấu hình chart
  Object.keys(builders).forEach(k => { if (!['quick', 'book'].includes(k) && !built[k]) { built[k] = true; builders[k](); } });
  Object.keys(P2PANE).forEach(k => { if (!pDone[k]) { pDone[k] = true; PDRAW[k](); } });
  vmxBuild();
  GCOUNTRY.forEach(([k]) => { if (!gDone[k] && document.querySelector(`[data-cc="${k}"]`)) { gDone[k] = true; ({ gl: drGL, us: drUS, ea: drEA, jp: drJP, cn: drCN, ov: chIntlOverview })[k](); } });
}
/* Trang Ngành: các chart vĩ mô (đã chuyển sang trang Vĩ mô) vẫn được dựng ẩn để Nhật ký chuyên viên, Chart book và hộp chia sẻ dùng được */
function vmxBuild() {
  if (PAGE !== 'nganh' || $('#vmx')) return;
  const d = document.createElement('section'); d.className = 'pane'; d.id = 'vmx'; d.hidden = true;
  d.innerHTML = `<div class="sub" data-pp="eco">${subEco()}</div><div class="sub" data-pp="bond">${subBond()}</div><div class="sub" data-pp="intl">${subIntl(true)}</div><div class="sub" data-pp="mm">${subMM()}</div><div class="sub" data-pp="idx">${subIdx()}</div>`;
  $('main .wrap').appendChild(d);
  chEco(); chBond(); chIntl(); chMM(); chIdx();
}
function drawSpec(src, cid, last, o = {}) {   // vẽ lại chart `src` vào canvas `cid`; last = mở sẵn khung N điểm cuối; o.win = khung N tháng; o.marks = [{d, t}] vạch mốc (chỉ ở bản vẽ lại này)
  const sp = SPEC[src]; if (!sp) return false;
  const cfg = cl(sp.cfg);
  if (cfg.options) { delete cfg.options.onClick; if (cfg.options.scales && cfg.options.scales.x) { delete cfg.options.scales.x.min; delete cfg.options.scales.x.max; } }
  if (o.marks && o.marks.length) { cfg.plugins = [...(cfg.plugins || []), markPlug]; cfg.options.plugins = cfg.options.plugins || {}; cfg.options.plugins.qMarks = { marks: o.marks }; }
  mk(cid, cfg, { last: o.win ? undefined : last, win: o.win }); return true;
}
const markPlug = { id: 'qMarks', afterDatasetsDraw(ch, _a, o) {   // vạch dọc tại mốc sự kiện; trục ngày (dd/mm/yyyy) hoặc tháng (mm/yyyy)
  const ms = o && o.marks; if (!ms) return; const { ctx, chartArea: A, scales: { x } } = ch; const L = ch.data.labels || [];
  const key = l => { const m = String(l).match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (m) return `${m[3]}-${m[2]}-${m[1]}`; const n = String(l).match(/^(\d{2})\/(\d{4})$/); return n ? `${n[2]}-${n[1]}-99` : null; };
  const ks = L.map(key);
  ms.forEach((mk_, j) => {
    let i = ks.findIndex(k => k && k >= mk_.d); if (i < 0) return;
    if (ks[i].endsWith('-99') && ks[i].slice(0, 7) !== mk_.d.slice(0, 7)) return;
    const px = x.getPixelForValue(i); if (px < A.left - 1 || px > A.right + 1) return;
    ctx.save(); ctx.strokeStyle = '#861C52'; ctx.lineWidth = 1.4; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(px, A.top); ctx.lineTo(px, A.bottom); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '700 10px Arial, sans-serif'; const w = ctx.measureText(mk_.t).width + 8, y = A.top + 2 + j * 17, bx = px + w + 4 > A.right ? px - w - 3 : px + 3;
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillRect(bx, y, w, 15); ctx.fillStyle = '#861C52'; ctx.textBaseline = 'middle'; ctx.fillText(mk_.t, bx + 4, y + 7.5); ctx.restore();
  });
} };
function chartBox(src, cid, h = '') { return `<div class="cbox ${h}"><canvas id="${cid}" role="img" aria-label="${esc(SPEC[src] ? cardMeta(SPEC[src].el).title : src)}"></canvas></div>`; }

function mk(id, cfg, opt = {}) {
  const el = document.getElementById(id); if (!el) return;
  if (charts[id]) charts[id].destroy();
  cfg.options = cfg.options || {};
  cfg.options.interaction = cfg.options.interaction || { mode: 'index', intersect: false, axis: cfg.options.indexAxis === 'y' ? 'y' : 'x' };
  { const rl = ((cfg.options.plugins || {}).refLines || {}).lines;   // đường dọc có nhãn: chừa khoảng trắng phía trên cho nhãn
    if (rl && rl.some(l => l.label && /^x/.test(l.axis || 'y'))) { const L = cfg.options.layout = cfg.options.layout || {}, pd = L.padding; L.padding = typeof pd === 'number' ? { top: Math.max(pd, 18), right: pd, bottom: pd, left: pd } : Object.assign({}, pd || {}, { top: Math.max((pd || {}).top || 0, 18) }); } }
  FSK.prep(cfg);
  if (!id.startsWith('cb-') && !id.startsWith('qu-')) SPEC[id] = { cfg: cl(cfg), el };
  charts[id] = new Chart(el, cfg);
  FSK.enhance(charts[id], { today: new Date(TODAY), last: opt.last, win: opt.win });
  if (opt.switch) {
    const box = document.querySelector(`[data-ctl="${id}"]`);
    if (box) {
      box.innerHTML = [['bar', 'Cột'], ['line', 'Đường']].map(([t, l]) => `<button type="button" data-t="${t}">${l}</button>`).join('');
      const set = t => { const ch = charts[id]; ch.data.datasets.forEach(d => { if (!d.keep) { d.type = t; d.fill = false; d.pointRadius = t === 'line' ? 2 : 0; } }); (ch.options.scales.x = ch.options.scales.x || {}).offset = ch.data.datasets.some(d => (d.type || ch.config.type) === 'bar'); const bz = ch.$bz0 || (ch.$bz0 = Object.fromEntries(Object.entries(ch.config.options.scales || {}).map(([k, sc]) => [k, !!sc.beginAtZero]))); Object.keys(bz).forEach(k => { const sc = ch.config.options.scales[k]; if (k[0] === 'y' && !sc.stacked) sc.beginAtZero = t === 'bar' ? true : bz[k]; }); FSK.reorder(ch); ch.update(); $$('button', box).forEach(b => b.classList.toggle('on', b.dataset.t === t)); };
      $$('button', box).forEach(b => b.onclick = () => set(b.dataset.t));
      $$('button', box).forEach(b => b.classList.toggle('on', b.dataset.t === opt.switch));
    }
  }
  return charts[id];
}
const pctAxis = (title, extra = {}) => Object.assign({ ticks: { callback: v => nf(v, 1) + '%' }, title: title ? { display: true, text: title } : undefined, grid: { color: '#eef0f4' } }, extra);
const numAxis = (title, extra = {}) => Object.assign({ ticks: { callback: v => nf(v, 0) }, title: title ? { display: true, text: title } : undefined, grid: { color: '#eef0f4' } }, extra);
const L = (label, data, color, o = {}) => Object.assign({ type: 'line', label, data, borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 0, pointBorderWidth: 0, pointHoverBorderWidth: 0, dp: 2, unit: '%', spanGaps: true }, o);

/* ---------- templates ---------- */
function card({ id, title, sub, insight, src, h = '', ctl = false, body = '', cls = '' }) {
  if (!insight && id && typeof INS !== 'undefined' && INS[id]) { try { insight = INS[id](); } catch (e) { insight = ''; } }   // insight tự tính từ số (khối INS)
  if (src) src = String(src).replace(/^Nguồn:\s*/, '');
  return `<article class="card ${cls}">
    <h3 class="sub">${title}${ctl ? `<span class="ctl" data-ctl="${id}"></span>` : ''}</h3>
    ${sub ? `<p class="chart-sub">${sub}</p>` : ''}
    ${id ? `<div class="cbox ${h}"><canvas id="${id}" role="img" aria-label="${esc(title)}"></canvas></div>` : ''}
    ${body}
    ${insight ? `<div class="insight">${insight}</div>` : ''}
    ${src ? `<div class="src">Nguồn: ${src}</div>` : ''}
  </article>`;
}
const kpi = (l, v, s, cls = '') => `<div class="kpi"><span>${l}</span><b>${v}</b><em class="${cls}">${s || ''}</em></div>`;
const pill = st => ({ ok: '<span class="pill ok">Hỗ trợ</span>', watch: '<span class="pill watch">Theo dõi</span>', risk: '<span class="pill risk">Rủi ro</span>', na: '<span class="pill">Chưa có số</span>' }[st] || `<span class="pill">${esc(st)}</span>`);
const impact = i => i === '+' ? '<span class="imp p">+</span>' : i === '−' || i === '-' ? '<span class="imp m">−</span>' : i === '?' ? '<span class="imp z">?</span>' : '<span class="imp z">0</span>';
const gdot = g => `<span class="grpdot" style="background:${GC[g]}"></span>`;

/* ---------- số dùng nhiều nơi ---------- */
const QI = BQ.length - 1, QY = BQ.length - 5;
const dom = D.dom, intl = D.intl;
const ytdNow = lastv(dom.creditYtd), ytdLY = dom.creditYtd.find(p => p.d.slice(5, 7) === ytdNow.d.slice(5, 7) && +p.d.slice(0, 4) === +ytdNow.d.slice(0, 4) - 1);
const grpMed = (k, g) => med(Lr.filter(r => r.group === g).map(r => r[k]));
const view = () => store.get().view || {};

/* ---------- header ---------- */
function headerVimo() {
  const g = ECO ? gqLast('gdp') : { v: null }, c = lastv(dom.cpi), on = lastv(dom.onDaily), fx = (dom.nhtmD && dom.nhtmD.length ? lastv(dom.nhtmD) : lastv(dom.nhtmSell)), u = glast('us_10y_d');
  $('#stockHead').innerHTML = `<div class="tick">VĨ MÔ</div>
    <div class="cname">Việt Nam và thế giới · Kinh tế, tiền tệ, thị trường<small>số liệu tự cập nhật từ nguồn công bố · lần dựng ${dvn(TODAY)}</small></div>
    <div class="hstats">
      <div class="hstat"><span>GDP ${g.d ? qLabQ(g.d) : ''}</span><b>${pc(g.v, 2)}</b></div>
      <div class="hstat"><span>CPI ${mvn(c.d)}</span><b>${pc(c.v, 2)}</b></div>
      <div class="hstat"><span>LNH qua đêm</span><b>${pc(on.v, 2)}</b></div>
      <div class="hstat"><span>USD/VND NHTM</span><b>${nf(fx.v)}</b></div>
      <div class="hstat"><span>UST 10Y</span><b>${pc(u.v, 2)}</b></div>
    </div>`;
  $('#stamp').textContent = `Cập nhật dữ liệu ${dvn(TODAY)}`;
}
function header() {
  if (PAGE === 'vimo') return headerVimo();
  const v = view();
  $('#stockHead').innerHTML = `<div class="tick">NGÀNH</div>
    <div class="cname">Ngân hàng Việt Nam · Chính sách tiền tệ<small>${M.banks.length} NH niêm yết · BCTC mới nhất ${D.latest.quarter} · giá ${dvn(D.latest.priceDate)}</small></div>
    <div class="hstats">
      <div class="hstat"><span>P/B ngành</span><b>${x(SV.now.pb)}</b></div>
      <div class="hstat"><span>P/E ngành</span><b>${x(SV.now.pe)}</b></div>
      <div class="hstat"><span>Vốn hóa</span><b>${nf(SV.now.mcap)} nghìn tỷ</b></div>
      <div class="hstat"><span>Kịch bản (IDX)</span><b>${SCN[NOW.q].t}</b></div>
      <div class="view-chip ${v.stance ? '' : 'none'}">${v.stance ? esc(v.stance).toUpperCase() : 'CHƯA NHẬP'}<small>QUAN ĐIỂM NGÀNH</small></div>
    </div>`;
  $('#stamp').textContent = `Cập nhật dữ liệu ${dvn(TODAY)}`;
}

/* =====================================================================
   TAB 1 · TỔNG QUAN NGÀNH
===================================================================== */
const regSt = r => { const t = new Date().toISOString().slice(0, 10), f = d => d.split('-').reverse().join('/');
  return r.eff && r.eff > t ? `<span class="pill rs-soon">Chưa hiệu lực</span><div class="rs-d">từ ${f(r.eff)}</div>`
    : `<span class="pill rs-on">Đang hiệu lực</span>${r.until ? `<div class="rs-d">đến ${f(r.until)}</div>` : r.eff ? `<div class="rs-d">từ ${f(r.eff)}</div>` : ''}`; };
const regDoc = (r, ref) => esc(r.doc) + (r.ref && ref ? `<div><a href="${ref.u}" target="_blank" rel="noopener" class="rs-a">Phân tích FinSuccess →</a></div>` : '');
function collapsify(root, key, openIds = [], sel = 'h3.ovh:not(.dsec)') {   // mỗi tiêu đề h3.ovh thành nút thu gọn/mở phần nội dung phía sau nó (tới tiêu đề kế tiếp)
  let st = {}; try { st = JSON.parse(localStorage.getItem('fs-col:' + key) || '{}'); } catch (e) {}
  $$(sel, root).forEach(h => {
    const body = document.createElement('div'); body.className = 'ovbody';
    while (h.nextElementSibling && !h.nextElementSibling.matches(sel)) body.appendChild(h.nextElementSibling);
    h.after(body); h.classList.add('coll'); h.setAttribute('role', 'button'); h.tabIndex = 0;
    const set = open => { h.classList.toggle('shut', !open); body.hidden = !open; h.setAttribute('aria-expanded', open); if (open) body.querySelectorAll('canvas').forEach(c => { const ch = Chart.getChart(c); if (ch) ch.resize(); }); };
    set(st[h.id] != null ? st[h.id] : openIds.includes(h.id));
    const tog = () => { const open = h.classList.contains('shut'); set(open); st[h.id] = open; try { localStorage.setItem('fs-col:' + key, JSON.stringify(st)); } catch (e) {} };
    h.onclick = tog; h.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } };
  });
  const bar = document.createElement('div'); bar.className = 'colbar';
  bar.innerHTML = '<button type="button" class="lnk" data-c="1">Mở tất cả</button> · <button type="button" class="lnk" data-c="0">Thu gọn tất cả</button>';
  const first = $(sel, root); if (first) first.before(bar);
  bar.onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; $$(sel, root).forEach(h => { if (h.classList.contains('shut') === (b.dataset.c === '1')) h.click(); }); };
}
function paneOverview() {
  const qu = D.quick && D.quick.updates[0];
  const tk = g => M.banks.filter(s => (D.meta.groups || {})[s] === g);
  const S = (l, sh) => `<span class="tl">${l}</span><span class="ts">${sh}</span>`;   // bản đầy đủ / bản ngắn của cùng một đoạn
  const T = x => Array.isArray(x) ? S(x[0], x[1]) : x;
  const sz = (t, c = '') => `<em class="vsz ${c}">${t}</em>`;   // nhãn quy mô của một nguồn vốn / khoản sử dụng vốn
  const box = (h, b, cls = '', lim = '', tag = '') => `<div class="vbox ${cls}"><b>${h}${tag}</b>${b ? `<span>${T(b)}</span>` : ''}${lim ? `<em class="vlim">Giới hạn: ${lim}</em>` : ''}</div>`;
  const go = (p, l) => `<button type="button" class="lnk" data-gop="${p}">${l} →</button>`;
  /* Các yếu tố tác động, gom 4 nhóm: [tên nhóm, mô tả nhóm, [[yếu tố, cơ chế, tác động, [tab, nhãn], chỉ số]]] */
  const DRV = [
    ['Vĩ mô tiền tệ', ['Nhóm quyết định giá vốn và lượng tiền trong hệ thống. Tác động nhanh nhất (vài tuần đến vài tháng) và trực tiếp nhất lên chi phí vốn, thanh khoản và định giá cổ phiếu ngân hàng.', 'Quyết định giá vốn và thanh khoản; tác động nhanh nhất.'], [
      ['Lãi suất điều hành và thanh khoản', ['NHNN dùng nghiệp vụ thị trường mở (OMO) và tín phiếu để bơm, hút tiền hằng ngày; lãi suất tái cấp vốn, tái chiết khấu làm trần, sàn cho lãi suất liên ngân hàng; thêm dự trữ bắt buộc và trần lãi suất tiền gửi dưới 6 tháng.', 'NHNN bơm, hút tiền hằng ngày và đặt trần, sàn cho lãi suất liên ngân hàng.'],
        ['Bơm tiền → lãi suất liên ngân hàng giảm → lãi suất huy động và chi phí vốn (COF) giảm sau 1–3 quý. Hút tiền → ngược lại; ngân hàng thiếu vốn phải tăng lãi suất huy động.', 'Bơm tiền → vốn rẻ hơn sau vài tháng; hút tiền → ngược lại.'], ['dom', 'Vĩ mô tiền tệ'], 'COF · NIM'],
      ['Tỷ giá USD/VND', ['NHNN công bố tỷ giá trung tâm mỗi ngày, ngân hàng giao dịch trong biên độ ±5%. Khi USD mạnh lên hoặc cầu ngoại tệ trong nước tăng, NHNN bán USD dự trữ và rút VND về.', 'USD mạnh lên thì NHNN bán USD dự trữ, rút VND về.'],
        ['Bán USD là hút VND khỏi hệ thống → thanh khoản căng, lãi suất tăng; áp lực tỷ giá khiến NHNN khó hạ lãi suất dù kinh tế cần vốn rẻ.', 'Áp lực tỷ giá → lãi suất tăng, NHNN khó nới.'], ['dom', 'Vĩ mô tiền tệ'], 'COF · thanh khoản'],
      ['Fed và đồng USD', ['Lãi suất Fed và lợi suất trái phiếu Mỹ quyết định mặt bằng lãi suất USD; chênh lệch lãi suất VND − USD quyết định động cơ giữ VND hay USD.', 'Lãi suất Mỹ cao kéo USD mạnh, ép chênh lệch lãi suất VND − USD.'],
        ['Fed giữ lãi suất cao hoặc tăng → chênh lệch VND − USD hẹp → áp lực tỷ giá → NHNN giữ lãi suất cao. Đây là kênh chính để bên ngoài tác động tới ngân hàng Việt Nam.', 'Fed tăng → áp lực tỷ giá → lãi suất trong nước khó giảm.'], ['intl', 'Vĩ mô › Quốc tế'], 'Tỷ giá · COF']]],
    ['Sức khoẻ nền kinh tế', ['Nhóm quyết định nhu cầu vay và khả năng trả nợ. Tác động chậm hơn (2–4 quý) nhưng quyết định tăng trưởng tín dụng và nợ xấu.', 'Quyết định nhu cầu vay và khả năng trả nợ; tác động chậm hơn.'], [
      ['Tăng trưởng kinh tế và doanh nghiệp', ['Sản xuất, xuất khẩu, FDI, đầu tư công và tiêu dùng tạo nhu cầu vay vốn; dòng tiền của doanh nghiệp, hộ gia đình quyết định khả năng trả nợ.', 'Sản xuất, xuất khẩu, đầu tư, tiêu dùng tạo nhu cầu vay.'],
        ['Kinh tế tốt → tín dụng tăng, nợ xấu giảm. Kinh tế chậm lại → nợ quá hạn tăng và thể hiện trong nợ xấu sau 2–4 quý.', 'Kinh tế tốt → cho vay tăng, nợ xấu giảm.'], ['eco', 'Vĩ mô › Kinh tế'], 'Tín dụng · NPL'],
      ['Lạm phát', ['Quốc hội giao mục tiêu lạm phát hằng năm (quanh 4–4,5%); giá xăng dầu, lương thực, dịch vụ do Nhà nước quản lý và tỷ giá là các nguồn chính.', 'Mục tiêu khoảng 4–4,5%/năm.'],
        ['Lạm phát vượt mục tiêu → NHNN ưu tiên giữ giá, không nới lãi suất; người gửi tiền đòi lãi suất cao hơn để bù trượt giá → COF tăng.', 'Lạm phát cao → không nới lãi suất, chi phí vốn tăng.'], ['eco', 'Vĩ mô › Kinh tế'], 'Lãi suất · COF'],
      ['Bất động sản', ['Khoảng 1/4 dư nợ toàn hệ thống là tín dụng bất động sản, và nhà đất là tài sản bảo đảm phổ biến nhất của cả các khoản vay khác.', 'Khoảng 1/4 dư nợ; tài sản thế chấp phổ biến nhất.'],
        ['Thị trường trầm lắng → khó bán tài sản bảo đảm, nợ xấu xử lý chậm, dự phòng tăng; thị trường sôi động → tín dụng mua nhà, kinh doanh BĐS tăng nhanh.', 'BĐS trầm lắng → khó xử lý nợ xấu, dự phòng tăng.'], ['bank', 'Ngân hàng'], 'NPL · dự phòng'],
      ['Tài khoá và Kho bạc', ['Kho bạc Nhà nước gửi tiền tại ngân hàng (tiền gửi có kỳ hạn chỉ ở nhóm Nhà nước), giải ngân đầu tư công và phát hành trái phiếu Chính phủ.', 'Kho bạc gửi tiền, giải ngân đầu tư công, phát hành TPCP.'],
        ['Giải ngân đầu tư công bơm tiền ra hệ thống và tạo nhu cầu vay của nhà thầu; phát hành TPCP hút tiền vào. Tiền gửi Kho bạc là vốn rẻ của Big 4.', 'Giải ngân bơm tiền ra; phát hành TPCP hút tiền vào.'], ['eco', 'Vĩ mô › Kinh tế'], 'COF · thanh khoản']]],
    ['Định hướng chính sách', ['Ở Việt Nam, Nhà nước không chỉ đặt luật chơi mà còn trực tiếp định lượng: giao hạn mức tín dụng, kêu gọi giảm lãi suất, chỉ định ngân hàng nhận chuyển giao. Các quyết định này có thể làm lệch kết quả kinh doanh so với chu kỳ thị trường.', 'Nhà nước giao room, định hướng lãi suất, tái cơ cấu ngân hàng yếu.'], [
      ['Room tín dụng', ['Mỗi năm NHNN đặt chỉ tiêu tăng trưởng tín dụng toàn hệ thống (2026: khoảng 15%) rồi giao hạn mức cho từng ngân hàng theo kết quả xếp hạng (TT 21/2025).', 'NHNN giao hạn mức tăng tín dụng theo xếp hạng.'],
        ['Room quyết định ngân hàng được lớn thêm bao nhiêu: ngân hàng xếp hạng cao được room rộng; room hẹp thì dù có khách hàng cũng không cho vay thêm được.', 'Room quyết định quy mô cho vay thêm.'], ['camel', 'Xếp hạng TT21 & room'], 'Tăng trưởng tín dụng'],
      ['Chủ trương lãi suất và tín dụng ưu tiên', ['NHNN và Chính phủ thường yêu cầu ngân hàng giảm lãi suất cho vay, cơ cấu nợ, mở gói tín dụng ưu đãi (nhà ở xã hội, nông nghiệp, hạ tầng).', 'Yêu cầu giảm lãi suất, gói tín dụng ưu đãi.'],
        ['Hỗ trợ tăng trưởng nhưng ép biên lãi (NIM), nhất là với nhóm ngân hàng Nhà nước đi đầu thực hiện; cơ cấu nợ làm chậm việc ghi nhận nợ xấu.', 'Ép biên lãi, nhất là nhóm Nhà nước.'], ['policy', 'tab Chính sách'], 'NIM · NPL'],
      ['Tái cơ cấu và xử lý nợ xấu', ['Chuyển giao bắt buộc ngân hàng yếu kém, khung pháp lý xử lý nợ xấu và tài sản bảo đảm (Luật Các TCTD 2024).', 'Chuyển giao ngân hàng yếu, khung xử lý nợ xấu.'],
        ['Ngân hàng nhận chuyển giao được ưu đãi room; khung xử lý tài sản bảo đảm rõ ràng giúp thu hồi nợ nhanh hơn, giảm dự phòng.', 'Ưu đãi room cho bên nhận chuyển giao.'], ['policy', 'tab Chính sách'], 'Room · dự phòng']]],
    ['Tỷ lệ an toàn', ['Các giới hạn định lượng bắt buộc. Chúng không thay đổi theo ngày nhưng khi bị chạm sẽ chặn tăng trưởng ngay lập tức, và khi văn bản đổi cách tính (như TT 50/2026) thì dư địa của từng ngân hàng thay đổi. Chi tiết ở mục 6.', 'Giới hạn bắt buộc; khi bị chạm sẽ chặn tăng trưởng. Chi tiết mục 6.'], [
      ['Tỷ lệ thanh khoản: LDR, vốn ngắn hạn cho vay dài hạn, LCR, NSFR', ['Giới hạn cho vay so với vốn huy động, vốn ngắn hạn dùng cho vay dài hạn, và (từ TT 50) tài sản thanh khoản phải đủ cho 30 ngày căng thẳng, tài sản dài hạn phải đi với vốn ổn định.', 'Giới hạn cho vay so với huy động và thanh khoản.'],
        ['Ngân hàng sát trần LDR hoặc thiếu vốn ổn định phải tăng huy động (thường bằng lãi suất cao hơn) hoặc chậm cho vay.', 'Sát trần → phải huy động đắt hơn hoặc chậm cho vay.'], ['peer', 'So sánh ngân hàng'], 'LDR · COF'],
      ['Vốn (CAR), giới hạn cấp tín dụng, phân loại nợ', ['Hệ số an toàn vốn tối thiểu 8% cộng đệm (TT 14/2025); dư nợ một khách hàng, nhóm khách hàng liên quan bị giới hạn theo vốn tự có; nợ phân 5 nhóm, trích dự phòng theo nhóm.', 'Vốn tối thiểu, giới hạn một khách hàng, phân loại nợ.'],
        ['Thiếu vốn → phải tăng vốn (phát hành, giữ lại lợi nhuận, hạn chế cổ tức tiền mặt) và tăng trưởng chậm lại.', 'Thiếu vốn → phải tăng vốn, tăng trưởng chậm lại.'], ['policy', 'tab Chính sách'], 'CAR · ROE']]],
  ];
  const CYC = [
    ['Nới lỏng', ['NHNN hạ lãi suất, bơm tiền', 'Giảm, bơm tiền'], ['Tăng dần khi room nới', 'Tăng dần'], ['Thường mở rộng: COF giảm nhanh hơn lãi suất cho vay', 'Mở rộng'], ['Giảm dần nhờ doanh nghiệp dễ vay đảo nợ', 'Giảm dần'], ['Thường tăng sớm nhất', 'Tăng sớm nhất']],
    ['Phục hồi', ['Lãi suất thấp, ổn định', 'Thấp, ổn định'], 'Tăng nhanh', ['Hẹp lại khi cạnh tranh cho vay', 'Hẹp lại'], 'Thấp', ['Theo tăng trưởng lợi nhuận', 'Theo lợi nhuận']],
    ['Thắt chặt', ['NHNN hút tiền, lãi suất liên NH tăng', 'Tăng, hút tiền'], 'Chậm lại', ['Bị ép: COF tăng trước, lãi suất cho vay tăng sau', 'Bị ép'], ['Bắt đầu tăng sau 2–4 quý', 'Tăng sau 2–4 quý'], ['Giảm, thường về vùng thấp', 'Giảm']],
    ['Xử lý nợ', ['Lãi suất cao rồi hạ dần', 'Cao rồi hạ'], 'Thấp', 'Thấp', ['Cao, trích lập dự phòng lớn', 'Cao'], ['Đáy chu kỳ, phục hồi trước lợi nhuận', 'Đáy, hồi trước lợi nhuận']],
  ];
  const GL = [
    ['NIM', 'Biên lãi thuần', 'Thu nhập lãi thuần / tài sản sinh lãi bình quân', 'Cao = cho vay sinh lời tốt hoặc vốn rẻ'],
    ['COF', 'Chi phí vốn', 'Chi phí lãi / nguồn vốn chịu lãi bình quân', 'Thấp = huy động rẻ (CASA cao, tiền gửi Kho bạc)'],
    ['CASA', 'Tiền gửi không kỳ hạn', 'Tiền gửi thanh toán / tổng tiền gửi khách hàng', 'Cao = nguồn vốn gần như miễn phí, ít nhạy với lãi suất'],
    ['LDR', 'Tỷ lệ cho vay / huy động', 'Dư nợ cho vay / tiền gửi (theo công thức NHNN)', 'Sát trần = khó tăng cho vay nếu không huy động thêm'],
    ['LCR', 'Tỷ lệ bao phủ thanh khoản', 'Tài sản thanh khoản cao / dòng tiền ra ròng 30 ngày căng thẳng', 'Từ 100% = đủ tài sản bán ngay để chi trả 30 ngày'],
    ['NSFR', 'Tỷ lệ nguồn vốn ổn định ròng', 'Nguồn vốn ổn định sẵn có / nguồn vốn ổn định yêu cầu', 'Từ 100% = tài sản dài hạn được tài trợ bằng vốn ở lại lâu'],
    ['CAR', 'Hệ số an toàn vốn', 'Vốn tự có / tài sản có rủi ro', 'Cao = đủ đệm vốn để tăng trưởng, chịu lỗ'],
    ['NPL', 'Tỷ lệ nợ xấu', 'Nợ nhóm 3–5 / tổng dư nợ', 'Thấp; nhóm 2 (quá hạn 10–90 ngày) là chỉ báo sớm'],
    ['LLR', 'Tỷ lệ bao phủ nợ xấu', 'Dự phòng rủi ro tín dụng / nợ xấu', 'Cao = đệm dày, lợi nhuận tương lai ít bị ăn mòn'],
    ['CIR', 'Chi phí / thu nhập', 'Chi phí hoạt động / tổng thu nhập hoạt động', 'Thấp = vận hành hiệu quả'],
    ['ROE', 'Lợi nhuận / vốn chủ', 'LNST / vốn chủ sở hữu bình quân', 'Cao bền vững = được định giá P/B cao hơn'],
    ['P/B', 'Giá / giá trị sổ sách', 'Vốn hoá / vốn chủ sở hữu', 'Thước đo định giá chính của ngân hàng, đi cùng ROE'],
  ];
  /* Khung pháp lý: các tỷ lệ chính, so TT 22/2019 (đang áp dụng) với TT 50/2026 */
  const RAT = [
    ['LDR', 'Tỷ lệ dư nợ cho vay so với tổng tiền gửi',
      ['Dư nợ cho vay (L) / tiền gửi và nguồn vốn được tính (D). Cho biết ngân hàng đã dùng bao nhiêu vốn huy động để cho vay; sát trần thì muốn cho vay thêm phải huy động thêm.', 'Cho vay / huy động; sát trần thì phải huy động thêm mới cho vay được.'],
      ['Tối đa <b>85%</b> (Điều 20 TT 22/2019, sửa đổi bởi TT 26/2022, TT 09/2024, TT 25/2026). Tiền gửi có kỳ hạn của Kho bạc tính 20% vào D (TT 25/2026). 27 ngân hàng niêm yết ở khoảng 83% (06/2026), dư địa cho vay khoảng 320 nghìn tỷ.', 'Trần <b>85%</b> (TT 22/2019); toàn nhóm khoảng 83%.'],
      ['Trần lên <b>95%</b> (Điều 12). D được cộng vốn chủ sở hữu trừ tài sản cố định, vị thế vay ròng liên ngân hàng và vốn vay nước ngoài; bị loại tiền gửi của TCTD khác, trái phiếu thường do ngân hàng phát hành, chứng chỉ tiền gửi mua chéo và trừ phần đầu tư trái phiếu doanh nghiệp. Ước tính toàn nhóm 86–97%, kịch bản trung tâm 90–91%.', 'Trần <b>95%</b>; D tính lại: cộng vốn chủ, loại tiền gửi liên ngân hàng.'],
      ['<b>Không còn phải tuân thủ</b> khi ngân hàng đạt 100% cả LCR và NSFR (chỉ báo cáo): sớm nhất từ 01/01/2027 nếu đăng ký ngưỡng 100%; với mọi ngân hàng từ 01/10/2033.', 'Bỏ LDR khi đạt 100% cả LCR và NSFR.']],
    ['Vốn ngắn hạn cho vay trung, dài hạn', 'Tỷ lệ tối đa nguồn vốn ngắn hạn được dùng để cho vay trung hạn, dài hạn',
      ['(Dư nợ trung dài hạn − nguồn vốn trung dài hạn) / nguồn vốn ngắn hạn. Đo rủi ro kỳ hạn: huy động ngắn để cho vay dài thì khi lãi suất tăng, chi phí vốn tăng trước thu nhập.', 'Đo rủi ro huy động ngắn, cho vay dài.'],
      ['Tối đa <b>40%</b> từ 01/07/2026 (TT 25/2026 nới từ 30%); tiền gửi Kho bạc bị loại toàn bộ khỏi nguồn vốn ngắn hạn.', 'Trần <b>40%</b> từ 07/2026 (nới từ 30%).'],
      ['Được thay bằng <b>NSFR</b> (dưới đây). Tỷ lệ cũ thực chất là NSFR rút gọn với hai hệ số: vốn trên 1 năm tính 100%, vốn đến 1 năm tính 40%; tài sản trên 1 năm cần 100% vốn ổn định.', 'Thay bằng <b>NSFR</b>.'],
      ['Việc nới lên 40% năm 2026 là bước đệm trước khi chuyển sang NSFR.', 'Nới 40% là bước đệm.']],
    ['NSFR', 'Tỷ lệ nguồn vốn ổn định ròng (mới, Điều 22–26 TT 50)',
      ['Nguồn vốn ổn định sẵn có (ASF) / nguồn vốn ổn định yêu cầu (RSF). Hỏi: tài sản khó thu hồi trong một năm có được tài trợ bằng nguồn vốn ở lại với ngân hàng trong một năm không.', 'Tài sản dài hạn có đi cùng vốn ở lại lâu không.'],
      ['Chưa áp dụng; đang dùng tỷ lệ vốn ngắn hạn cho vay trung, dài hạn (trên).', 'Chưa áp dụng.'],
      ['Tối thiểu <b>90%</b> năm đầu, 95%, rồi <b>100%</b> (bắt buộc 100% từ 01/10/2030). Nới: tiền gửi cá nhân dưới 1 năm tính 90–95% là vốn ổn định (cách cũ 40%); cho vay dài hạn chỉ cần 65–85% (cũ 100%). Thắt: cho vay ngắn hạn cần 50% (cũ 0%); vốn từ tổ chức tài chính dưới 6 tháng tính 0%.', 'Từ <b>90%</b> lên <b>100%</b> (10/2030); tiền gửi cá nhân được tính 90–95%.'],
      ['Có lợi cho ngân hàng có nhiều tiền gửi cá nhân; bất lợi cho ngân hàng cho vay dài hạn nhiều trên nền vốn ổn định thấp.', 'Lợi cho ngân hàng bán lẻ.']],
    ['LCR', 'Tỷ lệ bao phủ thanh khoản (thay hai tỷ lệ thanh khoản cũ)',
      ['TT 22/2019 dùng hai tỷ lệ: <b>dự trữ thanh khoản</b> = tài sản thanh khoản cao / tổng nợ phải trả ≥ 10%; <b>khả năng chi trả 30 ngày</b> = tài sản thanh khoản cao / (dòng ra − dòng vào theo hợp đồng trong 30 ngày) ≥ 50% với VND. Tài sản thanh khoản gồm cả tiền gửi tại TCTD khác và vàng.', 'Cũ: dự trữ thanh khoản ≥ 10%, khả năng chi trả 30 ngày ≥ 50%.'],
      ['Đang áp dụng hai tỷ lệ trên cho tới khi ngân hàng chuyển sang LCR (đăng ký sớm hoặc bắt buộc từ 01/10/2028).', 'Đang áp dụng đến khi chuyển sang LCR.'],
      ['<b>LCR = tài sản thanh khoản cao (HQLA) / [dòng ra − min(dòng vào; 75% dòng ra)]</b> trong 30 ngày căng thẳng. Ngưỡng 50% năm đầu, mỗi năm +10 điểm, <b>100% từ 01/10/2033</b>. Tử số chia cấp: cấp 1 (tiền, tiền gửi NHNN, TPCP) tính 100%; cấp 2A (trái phiếu doanh nghiệp từ AA−) 85%; cấp 2B (BBB− đến A+, cổ phiếu VN30) 50–75%; tiền gửi tại TCTD khác và vàng bị loại. Mẫu số chấm theo người gửi: tiền gửi cá nhân tính rút 5–10%, tổ chức kinh tế 25–40%, tổ chức tài chính 100%; nợ vay đến hạn chỉ tính 50% dòng vào.', 'HQLA / dòng tiền ra ròng 30 ngày; 50% → <b>100%</b> (2033); loại tiền gửi liên ngân hàng khỏi tử số.'],
      ['Tài sản cấp 1 của 27 ngân hàng niêm yết chỉ khoảng 1.472 nghìn tỷ (6,5% tổng tài sản), so với 22,8% nếu tính cả gửi, cho vay liên ngân hàng như cách cũ: tử số hẹp lại mạnh. Ngân hàng dựa vào vốn TCTD khác (trên 30% nguồn vốn) chịu áp lực nhất.', 'Tử số hẹp lại mạnh; ngân hàng dựa vốn liên ngân hàng chịu áp lực.']],
  ];
  const rp = D.regRef;
  $('#overview').innerHTML = `
  ${qu ? `<button type="button" class="qbar" id="goQuick"><span class="qdate">Nhật ký chuyên viên ${dvn(qu.date)}</span><span class="who ${qu.author.type === 'AI' ? 'ai' : 'cv'}">${qu.author.type === 'AI' ? 'AI' : 'Chuyên viên'}</span><span class="qbar-t">${esc(qu.headline)}</span><span class="qbar-go">Xem →</span></button>` : ''}
  <h2 class="sec">Tổng quan ngành ngân hàng Việt Nam</h2>
  <p class="sec-sub">${S('Phần nền tảng, ít thay đổi theo thời gian: ngân hàng làm gì trong nền kinh tế, vốn đến từ đâu và đi về đâu, chịu tác động của những yếu tố nào và bị quản lý bằng những tỷ lệ nào. Diễn biến và số liệu mới nhất nằm ở Bức tranh ngành, Nhật ký chuyên viên và trang Vĩ mô.', 'Kiến thức nền về ngành. Số liệu mới nhất xem ở Bức tranh ngành và trang Vĩ mô.')}</p>
  <div class="ovmode" role="tablist" aria-label="Độ dài câu chữ"><button type="button" role="tab" data-ovm="short">Ngắn gọn <small>ít chữ, dễ đọc</small></button><button type="button" role="tab" data-ovm="long">Đầy đủ <small>giải thích chi tiết, có số liệu</small></button></div>
  <nav class="ovnav">${[['ov1', '1 · Vai trò'], ['ov2', '2 · Chuỗi giá trị'], ['ov4', '3 · Cấu trúc ngành'], ['ov5', '4 · Yếu tố tác động'], ['ov6', '5 · Chu kỳ ngành'], ['ov7', '6 · Khung pháp lý'], ['ov8', '7 · Thuật ngữ']].map(([a, l]) => `<a href="#${a}" data-ov="${a}">${l}</a>`).join('')}</nav>

  <h3 class="ovh" id="ov1">1 · Ngân hàng trong nền kinh tế</h3>
  <article class="card ovlead"><p>${S(`Ngân hàng làm trung gian giữa người có tiền nhàn rỗi và người cần vốn: <b>nhận tiền gửi</b> của dân cư, doanh nghiệp rồi <b>cho vay lại</b>, hưởng chênh lệch lãi suất; đồng thời cung cấp <b>dịch vụ tài chính</b> như thanh toán, thẻ, ngoại hối, bảo lãnh, bảo hiểm qua ngân hàng. Ở Việt Nam, tín dụng ngân hàng là kênh vốn chính của nền kinh tế: dư nợ gần 20 triệu tỷ đồng (06/2026), lớn hơn GDP một năm, trong khi thị trường trái phiếu doanh nghiệp và cổ phiếu còn nhỏ.`, 'Ngân hàng <b>nhận tiền gửi để cho vay</b>, hưởng chênh lệch lãi suất, và cung cấp <b>dịch vụ tài chính</b> (thanh toán, thẻ, ngoại hối). Ở Việt Nam đây là kênh vốn chính của nền kinh tế.')}</p>
    <p>${S(`Ngân hàng dùng đòn bẩy rất cao (vốn chủ chỉ khoảng 8,5% tổng tài sản của 27 ngân hàng niêm yết) và giữ tiền gửi của cả xã hội, nên một ngân hàng mất khả năng chi trả có thể lan sang ngân hàng khác qua thị trường liên ngân hàng và tâm lý rút tiền: đó là <b>rủi ro hệ thống</b>. Vì vậy đây là ngành bị quản lý chặt nhất. Ngoài điều hành lãi suất và giao hạn mức tín dụng, NHNN giới hạn bảng cân đối của từng ngân hàng bằng các tỷ lệ an toàn: cho vay so với huy động (LDR), vốn ngắn hạn cho vay dài hạn, thanh khoản (LCR, NSFR theo TT 50/2026) và vốn tối thiểu (CAR); chi tiết ở mục 6.`, `Đòn bẩy cao và giữ tiền của cả xã hội nên một ngân hàng đổ vỡ có thể lan ra toàn hệ thống (<b>rủi ro hệ thống</b>). Vì vậy NHNN quản lý rất chặt bằng các tỷ lệ an toàn như LDR, LCR, NSFR, CAR (mục 6).`)}</p></article>

  <h3 class="ovh" id="ov2">2 · Chuỗi giá trị</h3>
  <article class="card vcard vshort" id="vcCard">
    <label class="vswitch tl"><input type="checkbox" id="vmSw"><span class="vtrack"><span class="vknob"></span></span><span>Hiện giới hạn tỷ lệ theo quy định</span></label>
    <div class="vreg">${box('Ngân hàng Nhà nước (NHNN)', ['lãi suất điều hành · OMO · room tín dụng · tỷ giá trung tâm · dự trữ bắt buộc · tỷ lệ an toàn · thanh tra, giám sát', 'lãi suất · room tín dụng · tỷ giá · an toàn'], 'reg')}</div>
    <div class="vflow">
      <div class="vcol c1"><h4>Nguồn vốn</h4>
        ${box('Tiền gửi dân cư và doanh nghiệp', ['<b>Có kỳ hạn</b>: phần lớn tiền gửi, chi phí cao (12 tháng khoảng 5–6%/năm), nhạy với lãi suất thị trường. <b>Không kỳ hạn (CASA)</b>: gần như miễn phí, quyết định ngân hàng nào có vốn rẻ. Khoảng 73% nguồn huy động; dân cư chiếm khoảng một nửa, tổ chức kinh tế khoảng 1/4.', 'có kỳ hạn: đắt · không kỳ hạn (CASA): rẻ'], 'core', '', sz('lớn nhất', 'big'))}
        ${box('Tiền gửi, vay các TCTD khác (liên ngân hàng)', ['Ngân hàng gửi, cho vay lẫn nhau kỳ hạn rất ngắn để điều hoà thanh khoản; chi phí theo lãi suất liên ngân hàng. Khoảng 16% nguồn huy động: <b>quy mô bất thường lớn</b> so với thông lệ, nhiều ngân hàng nhỏ dựa vào kênh này. TT 50 không còn tính khoản này vào mẫu số LDR.', 'vay giữa các ngân hàng, kỳ hạn ngắn; lớn bất thường'], '', '', sz('lớn, bất thường', 'odd'))}
        ${box('Giấy tờ có giá', ['Chứng chỉ tiền gửi và trái phiếu do ngân hàng phát hành, khoảng 11% nguồn huy động. Đắt hơn tiền gửi (trái phiếu 1–3 năm khoảng 7,5–8%/năm) nhưng kỳ hạn dài, giúp đạt tỷ lệ vốn trung, dài hạn.', 'chứng chỉ tiền gửi, trái phiếu: đắt, kỳ hạn dài'], '', '', sz('vừa'))}
        ${box('Tiền gửi Kho bạc Nhà nước', ['Tiền gửi có kỳ hạn của Kho bạc <b>chỉ gửi tại nhóm ngân hàng Nhà nước</b> (Vietcombank, BIDV, VietinBank, Agribank): nguồn vốn rẻ, quy mô lớn với Big 4 nhưng nhỏ với toàn ngành; chỉ 20% được tính vào mẫu số LDR.', 'chỉ ở Big 4; rẻ'], '', '', sz('đặc thù Big 4', 'odd'))}
        ${box('Vốn chủ sở hữu, vay NHNN', ['Vốn chủ khoảng 8,5% tổng tài sản: đệm chịu lỗ, quyết định CAR. Vay NHNN (OMO, tái cấp vốn) chỉ dùng khi thiếu thanh khoản ngắn hạn.', 'vốn chủ: đệm chịu lỗ · vay NHNN khi thiếu tiền'], '', '', sz('nhỏ'))}</div>
      <div class="varr" aria-hidden="true"></div>
      <div class="vcol c2"><h4>Ngân hàng</h4>
        ${box('Huy động và quản lý nguồn vốn', ['định giá lãi suất tiền gửi · cân đối kỳ hạn tài sản và nguồn vốn · giữ chi phí vốn thấp', 'giữ chi phí vốn thấp'], 'core', 'LDR ≤ 85% (TT 22; 95% theo TT 50) · vốn ngắn hạn cho vay trung, dài hạn ≤ 40% · LCR, NSFR theo TT 50 · dự trữ bắt buộc')}
        ${box('Thẩm định và cấp tín dụng', ['chọn người vay · định giá khoản vay theo rủi ro · phân bổ room', 'chọn người vay, định giá khoản vay'], 'core', 'room tín dụng NHNN giao theo xếp hạng · một khách hàng, nhóm liên quan giới hạn theo vốn tự có')}
        ${box('Quản trị rủi ro', ['phân loại nợ, trích lập dự phòng · xử lý nợ xấu · giữ đủ vốn', 'phân loại nợ, dự phòng, giữ đủ vốn'], '', 'CAR ≥ 8% cộng đệm bảo toàn vốn · dự phòng theo nhóm nợ')}
        ${box('Thanh toán và dịch vụ', ['tài khoản, ngân hàng số, thẻ, ngoại hối · thu phí · tạo tiền gửi không kỳ hạn', 'tài khoản, thẻ, thu phí'])}</div>
      <div class="varr" aria-hidden="true"></div>
      <div class="vcol c3"><h4>Sử dụng vốn: cho vay theo mục đích</h4>
        ${box('Cho vay sản xuất, kinh doanh', ['Khoảng <b>78%</b> dư nợ. Theo ngành: thương mại, dịch vụ khoảng 70%; công nghiệp, xây dựng 24%; nông, lâm, thuỷ sản 6% (09/2025). Khoảng một nửa dư nợ toàn ngành là ngắn hạn (vốn lưu động), phần còn lại là trung, dài hạn (dự án, máy móc).', 'khoảng 78% dư nợ: vốn lưu động, dự án'], 'core', '', sz('lớn nhất', 'big'))}
        ${box('Cho vay tiêu dùng, đời sống', ['Khoảng <b>22%</b> dư nợ: phần lớn là vay mua nhà để ở; còn lại vay tiêu dùng, thẻ tín dụng, mua xe.', 'khoảng 22%: chủ yếu vay mua nhà'], '', '', sz('vừa'))}
        ${box('Trong đó: bất động sản', ['Tính chung cả hai nhóm trên, tín dụng bất động sản khoảng <b>5,2 triệu tỷ đồng, 25% tổng dư nợ</b> (31/08/2026): một nửa cho vay kinh doanh bất động sản (tăng 19,6% từ đầu năm), một nửa cho vay mua nhà để ở (tăng 1%).', 'khoảng 25% tổng dư nợ'], 'odd', '', sz('khoảng 1/4', 'odd'))}
        ${box('Dịch vụ', ['thanh toán · thẻ · ngoại hối · bảo hiểm qua ngân hàng: không dùng vốn, tạo thu phí', 'thanh toán · thẻ · bảo hiểm'])}</div>
    </div>
    <div class="vinfra">${S('<b>Hạ tầng và bên liên quan:</b> NAPAS (chuyển mạch thanh toán) · CIC (thông tin tín dụng) · Bảo hiểm tiền gửi Việt Nam · VAMC và công ty quản lý nợ · công ty bảo hiểm (bancassurance) · công ty chứng khoán, quỹ (cạnh tranh dòng tiền gửi) · công ty tài chính tiêu dùng', '<b>Hạ tầng:</b> NAPAS · CIC · Bảo hiểm tiền gửi · VAMC')}</div>
    <p class="vnote">${S('Tỷ trọng nguồn vốn tính trên tiền gửi khách hàng, tiền gửi TCTD khác và giấy tờ có giá của 27 ngân hàng niêm yết tại 30/06/2026 (FinSuccess tổng hợp từ BCTC). Cơ cấu cho vay: NHNN (09/2025, 08/2026). Các khoản ngân hàng gửi, cho vay lẫn nhau, dự trữ tại NHNN và danh mục chứng khoán không vẽ ở cột sử dụng vốn vì không phải nơi vốn đến với nền kinh tế.', 'Nguồn: BCTC 27 ngân hàng niêm yết (06/2026), NHNN.')}</p>
  </article>
  <div class="grid g2 gap">
    <article class="card"><h4>Vì sao bất động sản chiếm tỷ trọng lớn trong tín dụng Việt Nam</h4>${S(`<ul class="ovul">
      <li><b>Tài sản bảo đảm được ưa chuộng nhất.</b> Nhà đất giữ giá tốt và dễ xử lý pháp lý hơn máy móc, hàng tồn kho, nên ngân hàng ưu tiên cho vay có thế chấp bất động sản, kể cả khoản vay sản xuất, kinh doanh.</li>
      <li><b>Thị trường vốn còn mỏng.</b> Trái phiếu doanh nghiệp và cổ phiếu chưa đủ sâu, nhất là sau khủng hoảng trái phiếu 2022, nên chủ đầu tư dựa chủ yếu vào vốn vay ngân hàng.</li>
      <li><b>Nhu cầu nhà ở và tài sản hộ gia đình.</b> Đô thị hoá nhanh, tài sản của hộ gia đình tập trung vào nhà đất; khoản vay mua nhà có giá trị lớn và kỳ hạn dài nên chiếm nhiều dư nợ.</li>
      <li><b>Lãi suất cao, hấp dẫn ngân hàng tư nhân.</b> Tỷ trọng cho vay kinh doanh bất động sản chênh lệch lớn: khoảng 30–50% ở một số ngân hàng tư nhân, dưới 6% ở Vietcombank, VietinBank, ACB (cuối 2025).</li></ul>
      <p class="muted">Hệ quả: chu kỳ bất động sản là nguồn rủi ro nợ xấu lớn nhất; NHNN theo dõi riêng và áp hệ số rủi ro cao hơn cho mảng này.</p>`, '<p>Nhà đất là tài sản thế chấp được ưa chuộng nhất, thị trường vốn còn mỏng nên chủ đầu tư dựa vào ngân hàng, và khoản vay mua nhà có giá trị lớn, kỳ hạn dài. Chu kỳ bất động sản vì thế là nguồn rủi ro nợ xấu lớn nhất.</p>')}</article>
    <article class="card"><h4>Hai rủi ro cốt lõi của mô hình</h4><p>${S('<b>Rủi ro kỳ hạn:</b> huy động ngắn, cho vay dài nên khi lãi suất tăng nhanh, chi phí vốn tăng trước thu nhập. <b>Rủi ro tín dụng:</b> người vay không trả được nợ, ngân hàng phải trích lập dự phòng, ăn vào lợi nhuận. Phí dịch vụ (thanh toán, thẻ, bảo hiểm) giúp lợi nhuận bớt phụ thuộc vào hai rủi ro này.', 'Huy động ngắn, cho vay dài (rủi ro kỳ hạn) và người vay không trả được nợ (rủi ro tín dụng).')}</p></article>
  </div>

  <h3 class="ovh" id="ov4">3 · Cấu trúc ngành</h3>
  <article class="card"><h3 class="sub">Các loại tổ chức tín dụng${S(' (Luật Các tổ chức tín dụng 2024)', '')}</h3>
    <div class="tscroll"><table><thead><tr><th>Loại hình</th><th>Đại diện</th><th>Đặc điểm kinh doanh</th></tr></thead><tbody>
      <tr><td><b>NHTM Nhà nước</b></td><td>${S('Agribank (100% vốn Nhà nước); VCB, BID, CTG (Nhà nước nắm chi phối, niêm yết)', 'Agribank, VCB, BID, CTG')}</td><td>${S('Mạng lưới lớn nhất, giữ tiền gửi Kho bạc và doanh nghiệp Nhà nước, cho vay dự án hạ tầng; thực hiện chủ trương của NHNN (giảm lãi suất, hỗ trợ ngành ưu tiên). Tăng vốn phụ thuộc phê duyệt của Nhà nước.', 'Lớn nhất, vốn rẻ, đi đầu thực hiện chủ trương của NHNN.')}</td></tr>
      <tr><td><b>NHTM cổ phần</b></td><td>${S('MBB, TCB, ACB, VPB, HDB và các ngân hàng tư nhân khác', 'MBB, TCB, ACB, VPB…')}</td><td>${S('Cạnh tranh bằng bán lẻ, số hoá, hệ sinh thái tập đoàn; quy mô và chất lượng chênh lệch lớn giữa các ngân hàng.', 'Cạnh tranh bằng bán lẻ, số hoá; chất lượng chênh lệch lớn.')}</td></tr>
      <tr><td><b>Ngân hàng được chuyển giao bắt buộc</b></td><td>${S('Bốn ngân hàng yếu kém được chuyển giao cho VCB, MB, VPBank, HDBank (2024–2025)', '4 ngân hàng yếu kém')}</td><td>${S('Ngân hàng nhận chuyển giao được ưu đãi (room tín dụng, giãn lộ trình tuân thủ) đổi lại phải tái cơ cấu ngân hàng yếu.', 'Ngân hàng nhận chuyển giao được ưu đãi room.')}</td></tr>
      <tr><td><b>${S('Ngân hàng 100% vốn nước ngoài, chi nhánh ngân hàng nước ngoài', 'Ngân hàng nước ngoài')}</b></td><td>HSBC, Shinhan, Standard Chartered, UOB…</td><td>${S('Phục vụ doanh nghiệp FDI, thanh toán quốc tế, ngoại hối; thị phần cho vay nhỏ.', 'Phục vụ doanh nghiệp FDI; thị phần nhỏ.')}</td></tr>
      <tr><td><b>Công ty tài chính, quỹ tín dụng nhân dân</b></td><td>—</td><td>${S('Quy mô nhỏ: cho vay tiêu dùng lãi cao, rủi ro cao; tín dụng vi mô ở nông thôn.', 'Nhỏ; cho vay tiêu dùng lãi cao.')}</td></tr>
    </tbody></table></div></article>
  <h3 class="sub" style="margin:6px 0 10px">${M.banks.length} ngân hàng niêm yết dashboard theo dõi, chia theo nhóm</h3>
  <div class="gcards gap">${GROUPS.map(g => `<div class="gcard" style="--gc:${GC[g]}"><h4>${g}</h4><small>${tk(g).join(' · ')}</small><p>${S(GDESC[g], GDESC[g].split(';')[0] + '.')}</p></div>`).join('')}</div>
  <p class="muted">Số liệu so sánh từng ngân hàng (NIM, CASA, nợ xấu, ROE, P/B…) xem ở ${go('peer', 'Bức tranh ngành › So sánh ngân hàng')}</p>

  <h3 class="ovh" id="ov5">4 · Các yếu tố tác động</h3>
  <div class="banner chain">${S('Fed, USD, giá dầu → Tỷ giá → NHNN điều hành → Lãi suất liên ngân hàng → Lãi suất huy động, cho vay → NIM, nợ xấu, tăng trưởng → Lợi nhuận → P/B ngân hàng', 'Fed, USD → Tỷ giá → NHNN → Lãi suất → NIM, nợ xấu → Lợi nhuận → P/B')}</div>
  ${DRV.map(([gname, gdesc, items], gi) => `<section class="dgrp"><div class="dgh"><span class="dn">${String.fromCharCode(65 + gi)}</span><div><h4>${gname}</h4><p>${T(gdesc)}</p></div></div>
    <div class="drv gap">${items.map(([t, how, imp, [p, l], m]) => `<article class="card dcard"><div class="dh"><h4>${t}</h4><span class="pill">${m}</span></div>
      <p><b>Cơ chế:</b> ${T(how)}</p><p><b>Tác động đến ngân hàng:</b> ${T(imp)}</p><p class="dgo">Theo dõi: ${go(p, l)}</p></article>`).join('')}</div></section>`).join('')}

  <h3 class="ovh" id="ov6">5 · Chu kỳ ngành</h3>
  ${card({ id: 'ovCycle', title: 'Chỉ số giá cổ phiếu ngân hàng qua các chu kỳ', h: 'xl', sub: 'chỉ số giá ngành Ngân hàng (20/03/2012 = 100, cuối tháng, trục trái, thang log) · nét đứt = tăng trưởng tín dụng toàn hệ thống so cùng kỳ (%, trục phải) · nền màu = giai đoạn chu kỳ theo FinSuccess', insight: cycleIns(), src: 'Chỉ số giá ngành Ngân hàng; NHNN (tăng trưởng tín dụng); phân giai đoạn: FinSuccess' })}
  <div class="grid g2 gap">
    <article class="card"><h3 class="sub">Ngân hàng đi theo chu kỳ lãi suất và tín dụng</h3><p class="chart-sub">${S('Mô tả xu hướng điển hình; mỗi chu kỳ có khác biệt về độ trễ', 'Xu hướng điển hình')}</p>
      <div class="tscroll"><table><thead><tr><th>Giai đoạn</th><th>Lãi suất</th><th>Tín dụng</th><th>NIM</th><th>Nợ xấu</th><th>P/B</th></tr></thead>
      <tbody>${CYC.map(r => `<tr>${r.map((c, j) => `<td>${j ? T(c) : `<b>${c}</b>`}</td>`).join('')}</tr>`).join('')}</tbody></table></div></article>
    <article class="card"><h3 class="sub">Khung bốn kịch bản: áp lực tỷ giá × thanh khoản</h3>
      <p class="chart-sub">${S('Hai biến quyết định NHNN nới hay siết. Ô sáng là vị trí hiện tại; bấm (i) để xem từng biến đo gì. Cách tính chi tiết ở trang Vĩ mô › Quốc tế › Kịch bản IDX-FX × IDX-LIQ.', 'Ô sáng là vị trí hiện tại.')}</p>
      ${miniMatrix()}</article>
  </div>

  <h3 class="ovh" id="ov7">6 · Khung pháp lý chủ chốt: các tỷ lệ an toàn</h3>
  <p class="ovintro">${S(`Thông tư 50/2026/TT-NHNN thay Thông tư 22/2019 từ 01/12/2026: chuyển cách giám sát thanh khoản từ kỳ hạn hợp đồng sang chất lượng tài sản và độ ổn định của nguồn vốn. LCR và NSFR bắt buộc từ 01/10/2028; ngân hàng được đăng ký áp dụng sớm từ 01/01/2027.${rp ? ` Phân tích đầy đủ: <a href="${rp.u}" target="_blank" rel="noopener">${esc(rp.t)}</a>.` : ''}`, `TT 50/2026 thay TT 22/2019 từ 01/12/2026; LCR, NSFR bắt buộc từ 10/2028.${rp ? ` <a href="${rp.u}" target="_blank" rel="noopener">Phân tích đầy đủ</a>` : ''}`)}</p>
  <div class="ratg gap">${RAT.map(([k, n, what, now, tt50, imp]) => `<article class="card rcard"><div class="rh"><b>${k}</b><span>${n}</span></div>
    <dl><dt>Đo gì</dt><dd>${T(what)}</dd><dt>Đang áp dụng</dt><dd>${T(now)}</dd><dt>Theo TT 50/2026</dt><dd>${T(tt50)}</dd><dt>Hàm ý</dt><dd>${T(imp)}</dd></dl></article>`).join('')}</div>
  <article class="card"><h3 class="sub">Lộ trình áp dụng: ba lựa chọn của mỗi ngân hàng</h3>
    <div class="tscroll"><table><thead><tr><th>Lộ trình</th><th>Bắt đầu</th><th>LCR</th><th>NSFR</th><th>LDR</th></tr></thead><tbody>
      <tr><td><b>1. Bắt buộc</b> (không đăng ký)</td><td>01/10/2028</td><td>50%, +10 điểm/năm, 100% từ 01/10/2033</td><td>90%, 95%, 100% từ 01/10/2030</td><td>85% (cách cũ) đến 30/09/2028; 95% (cách mới); bỏ từ 10/2033</td></tr>
      <tr><td><b>2. Đăng ký sớm theo lộ trình</b> (trước 01/01/2028)</td><td>sớm nhất 01/01/2027</td><td>50% → 100% trong 5 năm</td><td>90% → 100% trong 2 năm</td><td>95% ngay; bỏ khi LCR đạt 100%</td></tr>
      <tr><td><b>3. Đăng ký ngưỡng 100%</b></td><td>sớm nhất 01/01/2027</td><td>100% ngay</td><td>100% ngay</td><td>Không phải tuân thủ (chỉ báo cáo)</td></tr>
    </tbody></table></div>
    <div class="insight">${S('Ba tỷ lệ cùng ưu ái <b>tiền gửi cá nhân có kỳ hạn</b>: được tính đủ vào mẫu số LDR, chỉ bị tính rút 5–10% trong LCR và được coi là 90–95% ổn định trong NSFR. Cạnh tranh huy động dân cư vì vậy sẽ tăng và biên lãi chịu sức ép. Ngân hàng hưởng lợi là nhóm có nền tiền gửi cá nhân lớn, vốn chủ dày và nhiều tài sản cấp 1; chịu áp lực là nhóm dựa vào vốn liên ngân hàng, tài sản cấp 1 mỏng hoặc giữ nhiều trái phiếu doanh nghiệp chưa xếp hạng. Nhóm ngân hàng lớn có nền tiền gửi dân cư mạnh nhiều khả năng đăng ký ngưỡng 100% để thoát trần LDR.', 'Ba tỷ lệ cùng ưu ái tiền gửi cá nhân có kỳ hạn → cạnh tranh huy động dân cư tăng. Lợi cho ngân hàng bán lẻ, vốn dày; bất lợi cho ngân hàng dựa vốn liên ngân hàng.')}</div>
    <div class="src">Nguồn: Thông tư 50/2026/TT-NHNN; Thông tư 22/2019/TT-NHNN (văn bản hợp nhất); Thông tư 25/2026/TT-NHNN; số liệu 27 ngân hàng niêm yết 30/06/2026 do FinSuccess tổng hợp.</div></article>
  <details class="morex"><summary>Toàn bộ các quy định khác (CAR, giới hạn cấp tín dụng, dự phòng…)</summary>
  <article class="card"><p class="chart-sub">Văn bản mới nhất lên trước · nhãn <span class="pill rs-soon">Chưa hiệu lực</span> = đã ban hành nhưng chưa bắt buộc áp dụng</p>
  <div class="tscroll"><table class="regt"><thead><tr><th>Trạng thái</th><th>Quy định</th><th>Mức</th><th class="lo">Văn bản</th><th class="lo">Lộ trình</th></tr></thead><tbody>
    ${(D.reg || []).map(r => `<tr class="${r.eff > TODAY ? 'soon' : ''}"><td style="white-space:nowrap">${regSt(r)}</td><td><b>${esc(r.rule)}</b></td><td>${esc(r.level)}</td><td class="lo">${regDoc(r, D.regRef)}</td><td class="lo">${esc(r.path || '')}</td></tr>`).join('')}
  </tbody></table></div><div class="src">Nguồn: văn bản pháp luật của Quốc hội, Chính phủ, NHNN.</div></article></details>

  <h3 class="ovh" id="ov8">7 · Thuật ngữ và chỉ số cần biết</h3>
  <article class="card"><div class="tscroll"><table><thead><tr><th>Viết tắt</th><th>Tên</th><th class="lo">Cách tính</th><th>Đọc thế nào</th></tr></thead>
    <tbody>${GL.map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td class="lo">${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table></div></article>`;
  const ovm = m => { $('#overview').classList.toggle('ovs-on', m === 'short'); $$('#overview [data-ovm]').forEach(b => { const on = b.dataset.ovm === m; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }); try { localStorage.setItem('fs-ov-mode', m); } catch (e) {} };
  $$('#overview [data-ovm]').forEach(b => b.onclick = () => ovm(b.dataset.ovm));
  let ovm0 = 'short'; try { ovm0 = localStorage.getItem('fs-ov-mode') || 'short'; } catch (e) {}
  ovm(ovm0);

  const gq = $('#goQuick'); if (gq) gq.onclick = () => { show('quick'); window.scrollTo({ top: 0 }); };
  const vm = m => { $('#vcCard').classList.toggle('vshort', m !== 'long'); $('#vmSw').checked = m === 'long'; try { localStorage.setItem('fs-vc-mode', m); } catch (e) {} };
  $('#vmSw').onchange = e => vm(e.target.checked ? 'long' : 'short');
  try { vm(localStorage.getItem('fs-vc-mode') || 'short'); } catch (e) { vm('short'); }
  $$('#overview [data-gop]').forEach(b => b.onclick = () => { const p = b.dataset.gop; if (p === 'policy') { show('policy'); } else { openP(p); } window.scrollTo({ top: 0 }); });
  collapsify($('#overview'), 'ov2', ['ov1', 'ov2']);
  $$('#overview [data-ov]').forEach(a => a.onclick = e => { e.preventDefault(); const t = document.getElementById(a.dataset.ov); if (t) { if (t.classList.contains('shut')) t.click(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
  drCycle();
}
/* ---- Chu kỳ ngành: chỉ số giá ngân hàng + tăng trưởng tín dụng, nền màu theo giai đoạn ---- */
const CYCLES = [['2012-03', '2013-12', 'Xử lý nợ xấu', 'x'], ['2014-01', '2017-06', 'Phục hồi', 'r'], ['2017-07', '2018-04', 'Tăng tốc', 'e'], ['2018-05', '2019-12', 'Siết room, chuẩn hoá vốn', 't'],
  ['2020-01', '2021-12', 'Nới lỏng (COVID)', 'e'], ['2022-01', '2022-12', 'Thắt chặt (lạm phát, trái phiếu)', 't'], ['2023-01', '2024-12', 'Nới lỏng, xử lý nợ', 'x'], ['2025-01', '2025-08', 'Phục hồi', 'r'], ['2025-09', '2099-12', 'Thắt chặt (lãi suất huy động, Fed)', 't']];
const CYC_COL = { e: 'rgba(31,138,141,.10)', r: 'rgba(41,56,168,.07)', t: 'rgba(192,57,43,.09)', x: 'rgba(217,164,0,.11)' };
function cycleSer() {   // chỉ số cuối tháng; sau tháng cuối của chuỗi chỉ số thì nối theo biến động vốn hoá ngành
  const B = (ECO && ECO.bankIdx) || {}, ms = Object.keys(B).sort(); if (!ms.length) return null;
  const lastM = ms[ms.length - 1], mc = Object.fromEntries((SV.monthly || []).map(p => [p.d.slice(0, 7), p.mcap])), out = ms.map(m => [m, B[m]]);
  const tail = Object.keys(mc).filter(m => m > lastM).sort(); if (tail.length && mc[lastM]) tail.forEach(m => out.push([m, B[lastM] * mc[m] / mc[lastM]]));
  return out;
}
function cycleIns() {
  const S2 = cycleSer(); if (!S2) return '';
  const idx = Object.fromEntries(S2), C2 = (ECO && ECO.credY) || {};
  const ms = S2.map(x => x[0]).filter(m => C2[m] != null), r12 = m => { const y = (+m.slice(0, 4) - 1) + m.slice(4); return idx[y] ? (idx[m] / idx[y] - 1) * 100 : null; };
  const pr = ms.map(m => [r12(m), C2[m]]).filter(([a, b]) => a != null && b != null), cr = pr.length > 24 ? corr(pr.map(p => p[0]), pr.map(p => p[1])) : null;
  const last = S2[S2.length - 1], pk = S2.reduce((a, b) => b[1] > a[1] ? b : a);
  return `Chỉ số ngành tăng khoảng ${nf(last[1] / 100, 1)} lần từ 03/2012, mạnh nhất ở các giai đoạn nới lỏng (2017 – đầu 2018, 2020–2021) và giảm sâu khi thắt chặt (giữa 2018, 2022). Đỉnh cao nhất ${mvn(pk[0])}; hiện thấp hơn đỉnh ${pc((1 - last[1] / pk[1]) * 100, 0)}.${cr != null ? ` Tương quan giữa mức thay đổi 12 tháng của chỉ số và tăng trưởng tín dụng so cùng kỳ là <b>${nf(cr, 2)}</b>.` : ''}`
    + how('Giá cổ phiếu ngân hàng thường đi trước lợi nhuận: tăng khi NHNN bắt đầu nới lỏng (vốn rẻ, room rộng) dù nợ xấu chưa giảm, và giảm khi lãi suất huy động bắt đầu tăng, trước khi nợ xấu tăng 2–4 quý. Tăng trưởng tín dụng xác nhận chu kỳ nhưng thường đi sau giá cổ phiếu.');
}
const cycBand = { id: 'cycBand', beforeDatasetsDraw(ch, _a, o) {
  const B = o && o.bands; if (!B) return; const { ctx, chartArea: A, scales: { x } } = ch, L = ch.data.labels;
  ctx.save(); ctx.font = '600 10px Arial, sans-serif'; ctx.textBaseline = 'top';
  B.forEach(([a, b, t, k]) => { const i0 = L.indexOf(mvn(a)), i1 = (() => { let j = -1; L.forEach((l, i) => { const m = l.slice(3) + '-' + l.slice(0, 2); if (m <= b) j = i; }); return j; })(); if (i0 < 0 && i1 < 0) return;
    const j1 = Math.max(i0, i1), x0 = Math.max(A.left, x.getPixelForValue(Math.max(0, i0))), x1 = Math.min(A.right, j1 + 1 < L.length ? x.getPixelForValue(j1 + 1) : A.right); if (x1 <= x0) return;
    ctx.fillStyle = CYC_COL[k]; ctx.fillRect(x0, A.top, x1 - x0, A.bottom - A.top);
    if (x1 - x0 > 34) { ctx.fillStyle = '#3f4656'; const w = x1 - x0 - 6; let s = t; while (ctx.measureText(s).width > w && s.length > 4) s = s.slice(0, -2); if (s !== t) s = s.replace(/\s*\S?$/, '') + '…'; ctx.fillText(s, x0 + 3, A.top + 3); } });
  ctx.restore(); } };
function drCycle() {
  const S2 = cycleSer(); if (!S2 || !document.getElementById('ovCycle')) return;
  const C2 = (ECO && ECO.credY) || {}, labs = S2.map(x => mvn(x[0]));
  mk('ovCycle', { type: 'line', data: { labels: labs, datasets: [L('Chỉ số giá ngành Ngân hàng', S2.map(x => +x[1].toFixed(1)), C.navy, { unit: '', dp: 1, borderWidth: 2.4 }),
    L('Tín dụng so cùng kỳ', S2.map(x => C2[x[0]] ?? null), C.red, { yAxisID: 'y1', dp: 1, borderDash: [5, 4], borderWidth: 1.6 })] },
    options: { plugins: { cycBand: { bands: CYCLES } }, scales: { x: { ticks: { maxTicksLimit: 14 } }, y: { type: 'logarithmic', title: { display: true, text: 'chỉ số (log)' }, ticks: { callback: v => [80, 100, 150, 200, 300, 400, 500, 600].includes(Math.round(v)) ? nf(v, 0) : '' }, grid: { color: '#eef0f4' } }, y1: pctAxis('', { position: 'right', grid: { display: false } }) } },
    plugins: [cycBand] });
}
function ppopBurdenIns() {
  const P = D.ppopSector, n = P.ppop.length - 1, rt = i => P.prov[i] / P.ppop[i] * 100, i0 = P.end.indexOf('2022-12');
  return `${P.q[n]}: lợi nhuận trước dự phòng 4 quý <b>${nf(P.ppop[n], 1)} nghìn tỷ</b> (${sg((P.ppop[n] / P.ppop[n - 4] - 1) * 100, 1, '%')} so với cùng kỳ), chi phí dự phòng ${nf(P.prov[n], 1)} nghìn tỷ (${sg((P.prov[n] / P.prov[n - 4] - 1) * 100, 1, '%')}), LNST ${nf(P.npat[n], 1)} nghìn tỷ. Dự phòng chiếm <b>${pc(rt(n), 1)}</b> lợi nhuận trước dự phòng, thấp hơn mức ~${pc(rt(0), 0)} giai đoạn 2018–2021${i0 >= 0 ? ` và ${pc(rt(i0), 1)} cuối 2022` : ''}.`
    + how('Tỷ lệ dự phòng / lợi nhuận trước dự phòng giảm là nguồn tăng LNST nhanh hơn hoạt động cốt lõi. Nếu nợ xấu tăng và tỷ lệ này quay về vùng 35–40%, LNST sẽ tăng chậm hơn PPOP dù kinh doanh cốt lõi vẫn tốt — đây là rủi ro chính khi đọc P/E ở giai đoạn hiện tại.');
}
function drPpop() {
  if (!D.ppopSector) return;
  const P = D.ppopSector;
  mk('chPpopBurden', { type: 'line', data: { labels: P.q, datasets: [
    L('Lợi nhuận trước dự phòng', P.ppop, C.tealInk, { unit: ' nghìn tỷ', dp: 1, borderWidth: 2.4, pointRadius: 2 }),
    L('Chi phí dự phòng', P.prov, C.red, { unit: ' nghìn tỷ', dp: 1, pointRadius: 2 }),
    L('LNST', P.npat, C.navy, { unit: ' nghìn tỷ', dp: 1, borderWidth: 2.4, pointRadius: 2 }),
    L('Dự phòng / LN trước dự phòng', P.ppop.map((v, i) => +(P.prov[i] / v * 100).toFixed(1)), C.gold, { yAxisID: 'y1', dp: 1, borderWidth: 2, borderDash: [5, 4], keep: true })] },
    options: { scales: { y: numAxis('nghìn tỷ đồng'), y1: pctAxis('', { position: 'right', grid: { display: false }, min: 0, max: 50 }) } } }, { switch: 'line' });

}
function subPeer() {
  const nimY = AG.nim.all[QY], nimN = AG.nim.all[QI];
  const pbZ = (SV.now.pb - SV.pb.mean) / SV.pb.sd;
  return `
  <div class="kpis">
    ${kpi('P/B ngành', x(SV.now.pb), `TB từ ${mvn(SV.from)}: ${x(SV.pb.mean)} (${sg(pbZ, 1, 'σ')})`, pbZ < 0 ? 'pos' : '')}
    ${kpi('P/E ngành', x(SV.now.pe), `TB ${x(SV.pe.mean)} · LNST TTM ${nf(SV.profitTTM, 1)} nghìn tỷ`)}
    ${kpi('NIM ngành ' + BQ[QI], pc(nimN, 2), `cùng kỳ ${pc(nimY, 2)}`, nimN < nimY ? 'neg' : 'pos')}
    ${kpi('NPL ngành', pc(AG.npl.all[QI], 2), `cùng kỳ ${pc(AG.npl.all[QY], 2)} · nhóm 2 ${pc(AG.g2.all[QI], 2)}`)}
    ${kpi('Tín dụng so đầu năm', pc(ytdNow.v, 2), `${mvn(ytdNow.d)} · cùng kỳ ${pc(ytdLY && ytdLY.v, 2)}`, ytdLY && ytdNow.v < ytdLY.v ? 'neg' : '')}
    ${kpi('Huy động 12T NHTM NN', pc(lastv(dom.dep12State).v, 2), `${sg(lastv(dom.dep12State).v - (byM(dom.dep12State)['2025-12']), 2, ' điểm %')} từ đầu năm`, 'neg')}
  </div>
  <h3 class="sub" style="margin:6px 0 10px">Chỉ số theo nhóm · trung vị, ${BQ[QI]}</h3>
  <div class="gcards gap">${GROUPS.map(g => groupCard(g)).join('')}</div>
  ${card({ id: 'chCompare', title: 'So sánh tài chính & định giá', h: 'tall', sub: `Chọn chỉ tiêu và nhóm · ${BQ[QI]} (NIM, COF, CIR, ROE: TTM) · P/B, P/E theo giá ${dvn(D.latest.priceDate)}`,
    body: `<div class="picker" id="cmpMetric">${CMP.map(([k, l]) => `<button type="button" data-k="${k}">${l}</button>`).join('')}</div><div class="picker" id="cmpGroup">${['Tất cả', ...GROUPS].map(g => `<button type="button" data-g="${g}">${g}</button>`).join('')}</div>`,
    insight: '<span id="cmpIns"></span>', src: 'WiData ratio_bank, ratio_bank_ttm, ratio_common_ttm, ratio_daily' })}
  <div class="grid g2 gap">
    ${card({ id: 'chRoePb', title: 'ROE và P/B: ai đang được định giá cao/thấp so với khả năng sinh lời', sub: `ROE TTM ${BQ[QI]} (trục ngang) · P/B ${dvn(D.latest.priceDate)} (trục dọc) · màu theo nhóm (bấm chú thích để ẩn/hiện nhóm) · đường đứt = hồi quy P/B theo ROE của các mã đang hiện · tick ô "Chọn" ở bảng bên cạnh để làm nổi hoặc chỉ hiện các mã đó`, h: 'tall',
      body: `<div class="picker" id="rpMode"><button type="button" data-m="all">Tất cả, làm nổi mã đã chọn</button><button type="button" data-m="sel">Chỉ mã đã chọn</button><button type="button" data-m="clr">Bỏ chọn</button></div>`,
      insight: '<span id="rpIns"></span>', src: 'WiData ratio_common_ttm, ratio_daily · hồi quy tuyến tính bình phương nhỏ nhất, tự tính' })}
    <article class="card"><h3 class="sub">Bảng so sánh ${M.banks.length} ngân hàng</h3><p class="chart-sub">Bấm tiêu đề cột để sắp xếp · tick "Chọn" để đưa mã lên chart ROE–P/B · % · P/B, P/E: lần</p>
      <div class="tscroll" id="cmpTable"></div><div class="src">Nguồn: WiData</div></article>
  </div>`;
}
function chPeer() {
  drawCompare('nim', 'Tất cả');
  $$('#cmpMetric button').forEach(b => b.onclick = () => drawCompare(b.dataset.k, $('#cmpGroup button.on').dataset.g));
  $$('#cmpGroup button').forEach(b => b.onclick = () => drawCompare($('#cmpMetric button.on').dataset.k, b.dataset.g));
  $$('#rpMode button').forEach(b => b.onclick = () => { if (b.dataset.m === 'clr') rpS.sel = []; else rpS.mode = b.dataset.m; drawRoePb(); drawTable(tblS.k, tblS.dir); });
  drawTable('roe', -1);
  drawRoePb();
}
function viewNoteMount() {
  const v = view(); const el = $('#viewNote'); if (!el) return;
  FSN.mount(el, {
    key: 'sector-view', title: '💎 Nhận định FinSuccess <span class="pill">analyst</span>', textLabel: 'Luận điểm', placeholder: 'Vì sao, điều kiện thay đổi quan điểm…',
    sub: 'Quan điểm do chuyên viên viết. Mỗi lần lưu là một bản mới theo ngày; bản đã đăng được AI đọc lại khi viết cập nhật nhanh. Số liệu bên dưới lấy từ nguồn công bố, lời đọc là AI viết theo số.',
    fields: f => `<div><label>Quan điểm ngành</label><select data-k="stance"><option value="">—</option>${['Tích cực', 'Trung lập', 'Tiêu cực'].map(o => `<option ${f.stance === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
      <div><label>Kịch bản analyst chọn</label><select data-k="scn"><option value="">— theo IDX: ${SCN[NOW.q].t}</option>${Object.entries(SCN).map(([k, x]) => `<option value="${k}" ${f.scn === k ? 'selected' : ''}>${x.t}</option>`).join('')}</select></div>
      <div><label>Nhóm ưu tiên</label><select data-k="group"><option value="">—</option>${GROUPS.map(g => `<option ${f.group === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      <div><label>Mã ưu tiên</label><input data-k="picks" value="${esc(f.picks || '')}" placeholder="VD: CTG, MBB"></div>`,
    read: el => Object.fromEntries($$('[data-k]', el).map(i => [i.dataset.k, i.value.trim()])),
    meta: f => [f.stance && `<span class="fsn-chip">Quan điểm: <b>${esc(f.stance)}</b></span>`, `<span class="fsn-chip">Kịch bản: <b>${esc(f.scn ? SCN[f.scn].t : 'theo IDX — ' + SCN[NOW.q].t)}</b></span>`,
      f.group && `<span class="fsn-chip">Nhóm ưu tiên: <b>${esc(f.group)}</b></span>`, f.picks && `<span class="fsn-chip">Mã ưu tiên: <b>${esc(f.picks)}</b></span>`].filter(Boolean).join(''),
    seed: () => v.note || v.stance ? { id: 'sector-view-seed', at: (v.at || TODAY) + ' 00:00', author: 'Minh Đức', f: { stance: v.stance || '', scn: v.scn || '', group: v.group || '', picks: v.picks || '' }, html: FSN.textToHtml(v.note), text: v.note || '' } : null,
    onSave: x => { store.set({ view: Object.assign({}, x.f, { note: x.text, html: x.html, at: x.at.slice(0, 10) }) }); header(); },
  });
}
function chainCard() {
  const nimY = AG.nim.all[QY], nimN = AG.nim.all[QI];
  const sigBy = id => D.signals.find(s => s.id === id);
  return `    <article class="card"><h3 class="sub">Chuỗi truyền dẫn: Thế giới → NHNN → Ngân hàng</h3>
      <p class="chart-sub">Đầu ra của khâu trước là đầu vào của khâu sau (deck slide 35). Trạng thái lấy từ quy tắc R-xx ở tab Catalyst · Risk.</p>
      <div class="chain3">
        <div class="st"><h4>1 · Quốc tế</h4><p>Fed tăng 25 bps (16/09) lên 3,75–4,00%</p><p>UST 10Y ${pc(lastv(intl.ust10).v, 2)}, DXY ${nf(lastv(intl.dxy).v, 1)}</p><p>Brent ${nf(lastv(intl.brent).v, 0)} USD (${sg(yoyAt(intl.brent, lastv(intl.brent).d), 0)} YoY)</p>${pill('risk')}</div>
        <div class="st"><h4>2 · Nội địa</h4><p>USD/VND NHTM ${nf(lastv(dom.nhtmSell).v)}, tự do ${nf(lastv(dom.free).v)}</p><p>LNH qua đêm ${pc(lastv(dom.on).v, 2)} vs OMO ${pc(lastv(dom.omo).v, 1)}</p><p>CPI ${pc(lastv(dom.cpi).v, 2)} (mục tiêu ~4,5%)</p>${pill(sigBy('R-10').state)}</div>
        <div class="st"><h4>3 · Ngân hàng</h4><p>COF ${pc(AG.cof.all[QI], 2)} (cùng kỳ ${pc(AG.cof.all[QY], 2)})</p><p>NIM ${pc(nimN, 2)}, NPL ${pc(AG.npl.all[QI], 2)}</p><p>Tín dụng YoY ${pc(lastv(dom.creditYoY).v, 1)} &gt; tiền gửi ${pc(lastv(dom.depYoY).v, 1)}</p>${pill(sigBy('R-13').state)}</div>
      </div>
      <div class="insight">Cú sốc đang đi từ ngoài vào: Fed đảo chiều tăng lãi suất cùng giá dầu cao khiến NHNN khó nới; trong nước, cuộc đua tiền gửi đẩy COF ngành tăng <b>${sg(AG.cof.all[QI] - AG.cof.all[QY], 2, ' điểm %')}</b> so với cùng kỳ, nhanh hơn mức NIM thu hẹp <b>${sg(nimN - nimY, 2, ' điểm %')}</b>.</div>
    </article>`;
}
function idxTip(kind) {
  const fx = kind === 'fx', C2 = fx ? I.fxComp : I.liqComp, v = fx ? NOW.fx : NOW.liq;
  const row = c => `${esc(c.label)}: z ${nf(c.z, 2)} → đóng góp <b>${sg(c.contrib, 2, '')}</b>`;
  const up = C2.filter(c => c.contrib > 0.2).sort((a, b) => b.contrib - a.contrib), dn = C2.filter(c => c.contrib < -0.2).sort((a, b) => a.contrib - b.contrib);
  const fxNote = fx ? (C2.find(c => c.key === 'usdvnd3m') || {}).contrib < 0
    ? `<p><b>Vì sao chỉ số chưa "cao" dù DXY cao và Fed tăng lãi suất:</b> các nguồn gây sức ép đều lớn, nhưng USD/VND 3 tháng gần như đứng yên do NHNN giữ tỷ giá (bán USD từ dự trữ, nâng dần tỷ giá trung tâm, hút VND) nên thành phần này kéo chỉ số xuống. Trong điều kiện thông thường — để tỷ giá tự điều chỉnh — áp lực sẽ cao hơn mức hiển thị; cái giá đang được trả bằng thanh khoản và lãi suất trong nước.</p>` : '' : '';
  return `<h5>${fx ? 'Áp lực tỷ giá (IDX-FX)' : 'Thanh khoản trong nước (IDX-LIQ)'}</h5>
  <p>${fx ? 'Đo sức ép khiến VND mất giá so với USD: USD mạnh lên (DXY), lợi suất Mỹ cao kéo vốn về USD, chênh lãi suất VND − USD hẹp, cán cân thương mại + FDI yếu, và mức tăng thực tế của USD/VND.'
    : 'Đo độ dồi dào của tiền VND trong hệ thống ngân hàng: cung tiền M2, lãi suất liên ngân hàng qua đêm (cao = thiếu tiền), tiền gửi tăng nhanh hay chậm hơn tín dụng, và Kho bạc đang bơm (chi > thu) hay hút tiền.'}
  Mỗi thành phần tính bằng độ lệch so với trung bình 36 tháng (z-score) rồi cộng trung bình. ${fx ? '&gt; 0 = áp lực cao hơn bình thường' : '&gt; 0 = dồi dào hơn bình thường, &lt; 0 = thiếu'}; vượt ±1 là mức mạnh.</p>
  <p><b>Hiện tại ${sg(v, 2, '')}</b> (${mvn(NOW.m)}). ${up.length ? 'Đẩy lên: ' + up.map(row).join('; ') + '. ' : ''}${dn.length ? 'Kéo xuống: ' + dn.map(row).join('; ') + '.' : ''}</p>${fxNote}`;
}
function miniMatrix() {
  const cell = k => `<div class="cell ${NOW.q === k ? 'on' : ''}"><b>${SCN[k].t}</b>${SCN[k].rate} → ${SCN[k].bank}${NOW.q === k ? '<br><span class="now">Hiện tại</span>' : ''}</div>`;
  const ib = k => `<button type="button" class="info" data-k="txt" data-t="${esc(idxTip(k))}" aria-label="Giải thích">i</button>`;
  return `<div class="mxhelp">Hai trục đo gì: <span>Áp lực tỷ giá ${ib('fx')}</span><span>Thanh khoản ${ib('liq')}</span></div><div class="matrix"><div></div><div class="ax">Áp lực tỷ giá THẤP</div><div class="ax">Áp lực tỷ giá CAO</div>
    <div class="ax">Thanh khoản DỒI DÀO</div>${cell('ease')}${cell('drain')}<div class="ax">Thanh khoản THIẾU</div>${cell('room')}${cell('tight')}</div>`;
}
const GDESC = {
  'Big 4': 'Vốn rẻ nhờ CASA và tiền gửi Kho bạc; tăng trưởng theo room và dự án hạ tầng; hưởng lợi nhiều nhất khi hệ số KBNN vào LDR tăng.',
  'Tư nhân lớn': 'NIM cao nhờ bán lẻ, hệ sinh thái; ROE cao nhất ngành; nhạy với cuộc đua tiền gửi vì LDR sát trần.',
  'Tư nhân vừa': 'Chi phí vốn cao hơn, phụ thuộc huy động kỳ hạn; một số mã còn gánh nợ xấu/tài sản tồn đọng.',
  'Tư nhân nhỏ': 'Quy mô nhỏ, CIR cao, CASA thấp; lợi nhuận biến động mạnh theo chi phí dự phòng.',
};
function groupCard(g) {
  const n = Lr.filter(r => r.group === g);
  const row = (l, k, d = 2, f = pc) => `<dt>${l}</dt><dd>${f(grpMed(k, g), d)}</dd>`;
  return `<div class="gcard" style="--gc:${GC[g]}"><h4>${g}</h4><small>${n.map(r => r.s).join(' · ')}</small>
    <dl>${row('NIM', 'nim')}${row('COF', 'cof')}${row('CASA', 'casa', 1)}${row('NPL', 'npl')}${row('Bao phủ nợ xấu', 'llr', 0)}${row('ROE', 'roe', 1)}${row('P/B', 'pb', 2, x)}</dl>
    <p>${GDESC[g]}</p></div>`;
}
const CMP = [['nim', 'NIM'], ['cof', 'COF'], ['casa', 'CASA'], ['npl', 'NPL'], ['g2', 'Nợ nhóm 2'], ['llr', 'Bao phủ nợ xấu'], ['ldr', 'LDR'], ['creditYoY', 'Tín dụng YoY'], ['roe', 'ROE'], ['cir', 'CIR'], ['pb', 'P/B'], ['pe', 'P/E'], ['provRatio', 'Dự phòng / LN trước DP']];
function drawCompare(k, g) {
  $$('#cmpMetric button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
  $$('#cmpGroup button').forEach(b => b.classList.toggle('on', b.dataset.g === g));
  const lab = Object.fromEntries(CMP)[k], isX = k === 'pb' || k === 'pe';
  const rows = Lr.filter(r => (g === 'Tất cả' || r.group === g) && r[k] != null && !(k === 'pe' && r[k] > 60)).sort((a, b) => b[k] - a[k]);
  const sector = k === 'pb' ? SV.now.pb : k === 'pe' ? SV.now.pe : k === 'provRatio' && D.ppopSector ? D.ppopSector.prov.at(-1) / D.ppopSector.ppop.at(-1) * 100 : (AG[k] ? AG[k].all[QI] : null);
  mk('chCompare', { type: 'bar', data: { labels: rows.map(r => r.s), datasets: [{ label: lab, data: rows.map(r => r[k]), backgroundColor: rows.map(r => GC[r.group]), dp: 2, unit: isX ? 'x' : '%' }] },
    options: { plugins: { legend: { display: false }, refLines: sector != null ? { lines: [{ value: sector, label: 'Ngành ' + (isX ? x(sector) : pc(sector, 2)), color: C.red }] } : {} },
      scales: { y: isX ? numAxis('', { ticks: { callback: v => nf(v, 1) + 'x' } }) : pctAxis(), x: { ticks: { autoSkip: false, maxRotation: 60 } } } } });
  const top = rows[0], bot = rows[rows.length - 1];
  const fmt = v => isX ? x(v) : pc(v, 2);
  const byG = GROUPS.map(gg => `${gg} ${fmt(med(Lr.filter(r => r.group === gg).map(r => r[k])))}`).join(' · ');
  $('#cmpIns').innerHTML = rows.length ? `${lab} cao nhất <b>${top.s} ${fmt(top[k])}</b>, thấp nhất <b>${bot.s} ${fmt(bot[k])}</b>${sector != null ? `; bình quân ngành ${fmt(sector)}` : ''}. Trung vị theo nhóm: ${byG}.${k === 'pe' ? ' Ẩn mã có P/E > 60x (lợi nhuận gần 0).' : ''}` : '';
}
/* ROE – P/B: chọn mã từ bảng, hồi quy tuyến tính trên các mã đang hiện */
const rpS = { mode: 'all', sel: [], hid: [] };
try { Object.assign(rpS, JSON.parse(localStorage.getItem('fs-roepb') || '{}')); } catch (e) {}
const rpSave = () => { try { localStorage.setItem('fs-roepb', JSON.stringify(rpS)); } catch (e) {} };
function olsFit(pts) {   // y = a + b·x
  const n = pts.length; if (n < 3) return null;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n;
  const sxx = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0), sxy = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0), syy = pts.reduce((s, p) => s + (p.y - my) ** 2, 0);
  if (!sxx) return null; const b = sxy / sxx, a = my - b * mx; return { a, b, r2: syy ? (sxy * sxy) / (sxx * syy) : 0, n };
}
function drawRoePb() {
  rpSave();
  $$('#rpMode button').forEach(b => b.classList.toggle('on', b.dataset.m === rpS.mode));
  const sel = new Set(rpS.sel), base = Lr.filter(r => r.roe != null && r.pb != null && r.roe > 3 && (rpS.mode === 'all' || sel.has(r.s)));
  const vis = base.filter(r => !rpS.hid.includes(r.group)), fit = olsFit(vis.map(r => ({ x: r.roe, y: r.pb })));
  const xs = vis.map(r => r.roe), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const ds = GROUPS.map(g => ({ label: g, hidden: rpS.hid.includes(g), data: base.filter(r => r.group === g).map(r => ({ x: r.roe, y: r.pb, s: r.s })), backgroundColor: GC[g],
    pointRadius: base.filter(r => r.group === g).map(r => sel.has(r.s) ? 8 : rpS.mode === 'all' && sel.size ? 4 : 5), pointBorderColor: base.filter(r => r.group === g).map(r => sel.has(r.s) ? '#d9a400' : GC[g]), pointBorderWidth: base.filter(r => r.group === g).map(r => sel.has(r.s) ? 3 : 1), pointHoverRadius: 8 }));
  if (fit && isFinite(x0)) ds.push({ type: 'line', label: `Hồi quy: P/B = ${nf(fit.a, 2)} + ${nf(fit.b, 3)} × ROE (R² ${nf(fit.r2, 2)}, ${fit.n} mã)`, data: [{ x: x0, y: fit.a + fit.b * x0 }, { x: x1, y: fit.a + fit.b * x1 }], borderColor: C.grey, backgroundColor: C.grey, borderDash: [6, 4], borderWidth: 1.6, pointRadius: 0, fit: 1 });
  mk('chRoePb', { type: 'scatter', data: { datasets: ds },
    options: { interaction: { mode: 'nearest', intersect: true }, plugins: { tooltip: { filter: c => !c.dataset.fit, callbacks: { label: c => { const r = c.raw, e = fit ? r.y - (fit.a + fit.b * r.x) : null; return `${r.s}: ROE ${pc(r.x, 1)} · P/B ${x(r.y)}${e != null ? ` · ${e >= 0 ? 'cao' : 'thấp'} hơn đường hồi quy ${nf(Math.abs(e), 2)}x` : ''}`; } } },
      legend: { onClick: (e, it, lg) => { const g = it.text; if (!GROUPS.includes(g)) return; rpS.hid = rpS.hid.includes(g) ? rpS.hid.filter(z => z !== g) : [...rpS.hid, g]; drawRoePb(); } } },
      scales: { x: pctAxis('ROE TTM'), y: numAxis('P/B', { ticks: { callback: v => nf(v, 1) + 'x' } }) } },
    plugins: [{ id: 'lbl', afterDatasetsDraw(ch) { const { ctx } = ch; ctx.save(); ctx.font = '600 10.5px Arial'; ctx.fillStyle = '#3f4656';
      ch.data.datasets.forEach((d, i) => { if (d.fit || !ch.isDatasetVisible(i)) return; ch.getDatasetMeta(i).data.forEach((p, j) => ctx.fillText(d.data[j].s, p.x + 6, p.y - 4)); }); ctx.restore(); } }] });
  const el = $('#rpIns'); if (!el) return;
  if (!fit) { el.innerHTML = 'Chọn ít nhất 3 mã để vẽ đường hồi quy.'; return; }
  const res = vis.map(r => ({ s: r.s, e: r.pb - (fit.a + fit.b * r.roe), r })).sort((a, b) => a.e - b.e);
  el.innerHTML = `Trên ${fit.n} mã đang hiện, mỗi 1 điểm % ROE tương ứng P/B cao hơn khoảng <b>${nf(fit.b, 3)}x</b> (R² ${nf(fit.r2, 2)}${fit.r2 < 0.3 ? ': ROE giải thích được ít khác biệt định giá' : ''}). Thấp hơn đường hồi quy nhiều nhất: ${res.slice(0, 3).map(z => `<b>${z.s}</b> (${sg(z.e, 2, 'x')})`).join(', ')}; cao hơn nhiều nhất: ${res.slice(-3).reverse().map(z => `${z.s} (${sg(z.e, 2, 'x')})`).join(', ')}.`
    + how('Mã nằm dưới đường hồi quy đang được định giá thấp hơn mức thị trường trả cho cùng ROE; trước khi coi là "rẻ" cần xem lý do: chất lượng tài sản (nợ xấu, bao phủ), ROE có bền không, hay rủi ro riêng.');
}
function roePbInsight() {
  const ok = Lr.filter(r => r.roe > 3 && r.pb);
  const cheap = ok.filter(r => r.roe >= 18 && r.pb <= 1.3).sort((a, b) => a.pb - b.pb).map(r => `${r.s} (ROE ${pc(r.roe, 0)}, P/B ${x(r.pb)})`);
  const rich = ok.filter(r => r.pb >= 1.9).map(r => `${r.s} ${x(r.pb)}`);
  return `Vùng "ROE cao, P/B thấp" (ROE ≥ 18%, P/B ≤ 1,3x): <b>${cheap.join(', ') || '—'}</b>. P/B cao vượt trội: ${rich.join(', ')} — VCB do chất lượng tài sản, LPB, STB, NVB vì kỳ vọng tái cơ cấu/sáp nhập chứ không vì ROE hiện tại.`;
}
const TCOLS = [['s', 'Mã'], ['group', 'Nhóm'], ['nim', 'NIM'], ['cof', 'COF'], ['casa', 'CASA'], ['npl', 'NPL'], ['g2', 'Nhóm 2'], ['llr', 'Bao phủ'], ['ldr', 'LDR'], ['creditYoY', 'TD YoY'], ['roe', 'ROE'], ['cir', 'CIR'], ['pb', 'P/B'], ['pe', 'P/E'], ['provRatio', 'DP/LN trước DP'], ['mcap', 'Vốn hóa (tỷ)']];
const tblS = { k: 'roe', dir: -1 };
function drawTable(k, dir) {
  tblS.k = k; tblS.dir = dir; const sel = new Set(rpS.sel);
  const rows = [...Lr].sort((a, b) => { const A = a[k], B = b[k]; if (A == null) return 1; if (B == null) return -1; return typeof A === 'string' ? dir * A.localeCompare(B) : dir * (A - B); });
  const fmt = (c, v) => c === 's' ? `<b>${v}</b>` : c === 'group' ? gdot(v) + v : c === 'pb' || c === 'pe' ? x(v) : c === 'provRatio' ? pc(v, 0) : c === 'mcap' ? nf(v) : c === 'llr' ? pc(v, 0) : pc(v, 2);
  $('#cmpTable').innerHTML = `<table><thead><tr><th title="Đưa lên chart ROE–P/B">Chọn</th>${TCOLS.map(([c, l]) => `<th class="sortable ${c === 's' || c === 'group' ? '' : 'n'}" data-c="${c}">${l}${c === k ? (dir < 0 ? ' ↓' : ' ↑') : ''}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr${sel.has(r.s) ? ' class="rp-on"' : ''}><td><input type="checkbox" data-rp="${r.s}"${sel.has(r.s) ? ' checked' : ''} aria-label="Chọn ${r.s}"></td>${TCOLS.map(([c]) => `<td class="${c === 's' || c === 'group' ? '' : 'n'}" style="${c === 'group' ? 'white-space:nowrap' : ''}">${fmt(c, r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  $$('#cmpTable th[data-c]').forEach(th => th.onclick = () => drawTable(th.dataset.c, th.dataset.c === k ? -dir : -1));
  $$('#cmpTable [data-rp]').forEach(cb => cb.onchange = () => { const s = cb.dataset.rp; rpS.sel = cb.checked ? [...new Set([...rpS.sel, s])] : rpS.sel.filter(z => z !== s); cb.closest('tr').classList.toggle('rp-on', cb.checked); drawRoePb(); });
}

/* =====================================================================
   TAB 2 · BỨC TRANH NGÀNH (Quốc tế → Nội địa → Ngân hàng → Kịch bản IDX)
===================================================================== */
const SUBS = PAGE === 'vimo'
  ? { vn: [['eco', 'Kinh tế'], ['dom', 'Tiền tệ']], world: [['intl', 'Các nền kinh tế'], ['mm', 'Tỷ giá'], ['idx', 'Kịch bản IDX-FX × IDX-LIQ']] }
  : { picture: [['dom', 'Vĩ mô tiền tệ'], ['bank', 'Ngân hàng'], ['peer', 'So sánh ngân hàng'], ['camel', 'Xếp hạng TT21 & room']] };
const P2PANE = Object.fromEntries(Object.entries(SUBS).flatMap(([p, l]) => l.map(([k]) => [k, p])));
const PSUB = Object.values(SUBS).flat();
const PDRAW = { intl: () => chIntl(), dom: () => { chDom(); chBond(); if (PAGE === 'nganh') drUsMini(); }, mm: () => chMM(), bank: () => chBank(), peer: () => chPeer(), camel: () => chCamel(), idx: () => chIdx(), eco: () => chEco() };
const pDone = {};
const subBar = p => `<div class="subtabs" data-sn="${p}" role="tablist">${SUBS[p].map(([k, l], i) => `<button type="button" data-p="${k}" class="${i ? '' : 'on'}">${l}</button>`).join('')}</div>`;
function wireSubs(p) {
  const bar = $(`[data-sn="${p}"]`); if (!bar) return;
  $$('button', bar).forEach(b => b.onclick = () => openP(b.dataset.p));
  FSK.sortable(bar, p === 'picture' ? 'picture' : 'vm-' + p, 'p');
  openP($('button', bar).dataset.p, false);   // mở tab đứng đầu theo thứ tự người dùng xếp
}
function panePicture() {
  $('#picture').innerHTML = `
  <h2 class="sec">Bức tranh ngành</h2>
  <h3 class="ovh" id="pic1">1 · Nhận định FinSuccess</h3>
  <article class="card fsn" id="viewNote"></article>
  <h3 class="ovh" id="pic2">2 · Diễn biến chi tiết: từ vĩ mô tiền tệ tới định giá ngân hàng</h3>
  <p class="sec-sub">Vĩ mô tiền tệ (tỷ giá, tín dụng, chi phí vốn) → lợi nhuận, rủi ro và định giá ngân hàng. Kinh tế Việt Nam, thế giới và kịch bản IDX xem ở trang <a href="vimo.html">Vĩ mô</a>.</p>
  <div class="banner chain">Fed, USD → Tỷ giá → NHNN (OMO, tỷ giá trung tâm, tỷ lệ an toàn) → Lãi suất TT2 → TT1 → COF, NIM, nợ xấu → P/B ngân hàng</div>
  ${subBar('picture')}
  <div class="sub on" data-pp="dom">${subDom('n')}</div>
  <div class="sub" data-pp="bank">${subBank()}</div>
  <div class="sub" data-pp="peer">${subPeer()}</div>
  <div class="sub" data-pp="camel">${subCamel()}</div>`;
  viewNoteMount();
  collapsify($('#picture'), 'pic', ['pic1', 'pic2']);
  collapsify($('#picture [data-pp="dom"]'), 'dom3', ['d-fx'], 'h3.dsec');
  ['dom', 'bank', 'peer', 'camel'].forEach(k => delete pDone[k]);
  wireSubs('picture');
}
function paneVN() {
  $('#vn').innerHTML = `
  <h2 class="sec">Việt Nam</h2>
  <p class="sec-sub">Kinh tế thực (tăng trưởng, sản xuất, tiêu dùng, giá cả, thương mại, đầu tư) và tiền tệ (tỷ giá, tín dụng, chi phí vốn, trái phiếu).</p>
  ${subBar('vn')}
  <div class="sub on" data-pp="eco">${subEco()}</div>
  <div class="sub" data-pp="dom">${subDom('v')}</div>`;
  collapsify($('#vn [data-pp="dom"]'), 'vdom', ['d-fx'], 'h3.dsec');
  wireSubs('vn');
}
function paneWorld() {
  $('#world').innerHTML = `
  <h2 class="sec">Quốc tế</h2>
  <p class="sec-sub">Các nền kinh tế lớn (Mỹ, Nhật Bản chi tiết; khu vực euro, Trung Quốc đang bổ sung), thị trường tiền tệ và tỷ giá, kịch bản tổng hợp IDX-FX × IDX-LIQ.</p>
  ${subBar('world')}
  <div class="sub on" data-pp="intl">${subIntl(false)}</div>
  <div class="sub" data-pp="mm">${subMM()}</div>
  <div class="sub" data-pp="idx">${subIdx()}</div>`;
  wireSubs('world');
}
function openP(k, reveal = true) {
  const p = P2PANE[k];
  if (!p) { location.href = (PAGE === 'vimo' ? 'nganh.html' : 'vimo.html') + '#' + k; return; }   // mục nằm ở trang kia
  if (!built[p] || !$('#' + p).classList.contains('active')) show(p);
  const h2 = $('#pic2'); if (p === 'picture' && reveal && h2 && h2.classList.contains('shut')) h2.click();   // đi tới một mục con thì mở phần chi tiết nếu đang thu gọn
  $$(`[data-sn="${p}"] button`).forEach(b => b.classList.toggle('on', b.dataset.p === k));
  $$(`#${p} .sub[data-pp]`).forEach(x => x.classList.toggle('on', x.dataset.pp === k));
  if (!pDone[k]) { pDone[k] = true; PDRAW[k](); }
  if (reveal) try { history.replaceState(null, '', '#' + k); } catch (e) {}
}

/* ---- Xếp hạng TT21 & room (mô phỏng phần định lượng) ---- */
const CM = D.camel, CK = ['C', 'A', 'M', 'E', 'L', 'S'];
const cmS = { p: 'TTM2Q26', sel: 'CTG' };
const qualOf = s => { const q = (store.get().qual || {})[s]; return q == null ? CM.qualDefault : +q; };
const cmTot = r => { const q = qualOf(r.s), qp = CK.reduce((a, k) => a + CM.crit[k].wl, 0) / 100 * q; return { pt: r.quant.pt + qp, lo: r.quant.lo + qp, hi: r.quant.hi + qp }; };
const cmGrade = t => t >= 4.5 ? 'A' : t >= 3.5 ? 'B' : t >= 2.5 ? 'C' : t >= 1.5 ? 'D' : 'E';
const cmCol = v => v == null ? '#eef0f4' : v >= 4.5 ? '#1e8f5a' : v >= 3.75 ? '#7cc49b' : v >= 3 ? '#f2d27a' : v >= 2.25 ? '#ef9f76' : '#c0392b';
const cmInk = v => v != null && (v >= 4.5 || v < 2.25) ? '#fff' : '#303540';
function cmRows() { return CM.periods[cmS.p].rows.map(r => Object.assign({}, r, { T: cmTot(r) })).sort((a, b) => b.T.pt - a.T.pt); }
function subCamel() {
  return `<div class="banner chain">TT 21/2025: 6 tiêu chí C·A·M·E·L·S (định lượng 70%, định tính 30%) → điểm 1–5 → hạng A–E · Room năm N+2 = điểm × ${nf(CM.roomCoef, 1)}% (công văn giao room 2026)</div>
  <div class="picker" id="cmP">${Object.entries(CM.periods).map(([k, P]) => `<button type="button" data-k="${k}">${P.label}</button>`).join('')}<span class="muted" style="margin-left:8px">Số liệu năm 2025 chấm điểm cho room 2027 (theo TT52); số liệu năm 2026 chấm theo TT21 cho room 2028.</span></div>
  <div class="kpis k4" id="cmK"></div>
  <article class="card"><h3 class="sub">Bảng điểm CAMELS ước tính · 26 ngân hàng</h3>
    <p class="chart-sub">Điểm 1–5 từng tiêu chí theo ngưỡng TT21 của nhóm đồng hạng (tổng tài sản bq &gt; 300 nghìn tỷ = nhóm lớn) · ô định tính chỉnh được (mặc định ${nf(CM.qualDefault, 1)}) · khoảng điểm = chỉ tiêu không công bố chấm từ 1 đến 5 · bấm 1 dòng để xem chi tiết</p>
    <div class="tscroll"><table class="cm"><thead><tr><th>#</th><th>NH</th><th>Nhóm</th>${CK.map(k => `<th class="c" title="${esc(CM.crit[k].name)}">${k}</th>`).join('')}<th class="c">Định tính</th><th class="n">Tổng điểm</th><th class="c">Hạng</th><th class="n">Room ngụ ý</th><th class="n">Tín dụng YTD</th></tr></thead><tbody id="cmBody"></tbody></table></div>
    <div class="src">Nguồn: BCTC hợp nhất, thuyết minh và báo cáo CAR (TT41) của 26 ngân hàng niêm yết · ngưỡng, trọng số theo Điều 14, 15, 19, 21 TT 21/2025/TT-NHNN · tự tính. Kết quả xếp hạng thật là mật (Điều 24) — đây là ước tính.</div>
  </article>
  <div class="grid g2 gap">
    ${card({ id: 'chCmRoom', title: 'Room ngụ ý so với tăng trưởng tín dụng thực tế', h: 'tall',
      sub: 'trục ngang = điểm ước tính × 2,6% · trục dọc = tăng trưởng tín dụng (TTM Q2/2026: từ đầu năm, so với nửa room; năm 2025: cả năm) · trên đường đỏ = chạy nhanh hơn room theo công thức (thường là NH được ưu tiên hoặc được nới)',
      insight: '<span id="cmIns"></span>', src: 'tự tính từ bảng điểm bên cạnh và tín dụng (cho vay + trái phiếu DN) theo BCTC' })}
    <article class="card" id="cmDet"></article>
  </div>
  ${card({ id: 'chCmHist', title: '<span id="cmHistT">Lịch sử điểm</span>', h: 'tall', sub: 'điểm 1–5 theo từng kỳ, cùng ngưỡng TT 21/2025 và cùng điểm định tính cho mọi kỳ để so sánh được · đường đậm = tổng điểm · nét đứt = ranh giới hạng A (4,5) và B (3,5) · bấm 1 dòng ở bảng trên để đổi ngân hàng',
    insight: '<span id="cmHistIns"></span>', src: 'tự tính từ BCTC, thuyết minh và báo cáo CAR (TT41) các năm 2021–2025 và 4 quý gần nhất' })}
  ${cmMethod()}`;
}
function cmMethod() {
  const wq = CK.map(k => `${k} ${nf(CM.crit[k].wq, 0)}%`).join(' · '), wl = CK.map(k => `${k} ${nf(CM.crit[k].wl, 0)}%`).join(' · ');
  const px = CM.ind.filter(I => I.note), ms = CM.ind.filter(I => I.missing);
  return `<article class="card cm-method"><h3 class="sub">Phương pháp luận và nguồn</h3>
    <ol class="mlist">
      <li><b>Khung chấm điểm.</b> Thông tư 21/2025/TT-NHNN quy định xếp hạng tổ chức tín dụng theo 6 tiêu chí C·A·M·E·L·S: Vốn (C), Chất lượng tài sản (A), Quản trị điều hành (M), Kết quả kinh doanh (E), Thanh khoản (L), Mức độ nhạy cảm với rủi ro thị trường (S). Mỗi tiêu chí gồm phần định lượng (tổng 70%) và định tính (tổng 30%).</li>
      <li><b>Chấm từng chỉ tiêu.</b> Mỗi chỉ tiêu định lượng được chấm 1–5 điểm theo ngưỡng tại Điều 14; ngưỡng khác nhau giữa nhóm ngân hàng quy mô lớn (tổng tài sản bình quân &gt; 300 nghìn tỷ đồng) và nhóm quy mô nhỏ. Điểm tiêu chí = bình quân gia quyền điểm các chỉ tiêu theo trọng số Điều 15.</li>
      <li><b>Tổng điểm.</b> Trọng số định lượng (Điều 19): ${wq}. Trọng số định tính: ${wl}. Phần định tính không có số công khai nên dùng một điểm chung cho cả 6 tiêu chí, mặc định ${nf(CM.qualDefault, 1)}, chỉnh được trên bảng. Tổng điểm = phần định lượng + 30% × điểm định tính.</li>
      <li><b>Hạng (Điều 21).</b> A: từ 4,5 điểm · B: 3,5 đến dưới 4,5 · C: 2,5 đến dưới 3,5 · D: 1,5 đến dưới 2,5 · E: dưới 1,5.</li>
      <li><b>Room ngụ ý.</b> Tổng điểm × ${nf(CM.roomCoef, 1)}%, theo cách giao chỉ tiêu tăng trưởng tín dụng năm 2026 (điểm xếp hạng × 2,6%). Ngân hàng đánh dấu ★ nhận chuyển giao bắt buộc ngân hàng yếu kém, thường được giao room cao hơn công thức.</li>
      <li><b>Kỳ số liệu.</b> TTM Q2/2026: số dư bình quân 4 quý Q3/2025–Q2/2026, thu nhập và chi phí cộng 4 quý. Năm 2025: 4 quý năm 2025. Tỷ lệ an toàn vốn lấy từ báo cáo CAR gần nhất (H1/2026 hoặc năm 2025). Cả hai kỳ chấm theo ngưỡng TT 21/2025 để so sánh được với nhau.</li>
      <li><b>Chỉ tiêu không công bố</b> (${ms.map(I => esc(I.name.split(' (')[0])).join('; ')}): tính điểm giữa 3 và để khoảng điểm 1–5; dấu * trên bảng cho biết tiêu chí có chỉ tiêu thiếu số. Thanh dưới tổng điểm thể hiện khoảng điểm này.</li>
      <li><b>Ghi chú từng chỉ tiêu</b> (số gần đúng khi BCTC không tách đúng định nghĩa của thông tư):<ul>${px.map(I => `<li>${I.id} · ${esc(I.name)}: ${esc(I.note.replace(/^proxy: /, 'gần đúng — '))}</li>`).join('')}</ul></li>
      <li><b>Tín dụng YTD</b> = cho vay khách hàng + trái phiếu doanh nghiệp nắm giữ, so với cuối năm trước.</li>
    </ol>
    <p class="cm-lim"><b>Giới hạn.</b> Kết quả xếp hạng chính thức của NHNN được bảo mật (Điều 24), nên bảng này là ước tính từ số liệu công khai. Điểm định lượng dựa trên lợi nhuận và chi phí của 4 quý gần nhất, nên các khoản thu nhập bất thường (thu hồi nợ đã xử lý, lãi chứng khoán) có thể nâng điểm E và M. Chỉ tiêu nợ xấu chưa gồm nợ bán VAMC và nợ cơ cấu, nên điểm A có thể cao hơn thực tế. Chênh lệch tổng điểm dưới 0,1 giữa các ngân hàng nằm trong sai số của phương pháp.</p>
    <p class="cm-src"><b>Nguồn:</b> Thông tư 21/2025/TT-NHNN quy định xếp hạng tổ chức tín dụng, chi nhánh ngân hàng nước ngoài (Điều 14, 15, 19, 21, 24); Thông tư 41/2016/TT-NHNN về tỷ lệ an toàn vốn; Thông tư 22/2019/TT-NHNN về tỷ lệ cho vay so với tiền gửi; công văn giao chỉ tiêu tăng trưởng tín dụng năm 2026 của NHNN; báo cáo tài chính hợp nhất, thuyết minh (phân loại nợ, dự phòng, cho vay theo ngành, rủi ro lãi suất) và công bố tỷ lệ an toàn vốn của 26 ngân hàng niêm yết. Tính toán: FinSuccess.</p>
  </article>`;
}
function cmLever(r) {   // chỉ tiêu nào nhích lên 1 điểm thì được thêm bao nhiêu room
  const out = [];
  CM.ind.forEach(I => {
    const d = r.v[I.id], th = r.big ? I.thL : I.thS, w = r.big ? I.wL : I.wS; if (!d || d.s == null || d.s >= 5 || !w) return;
    const t = th[4 - d.s], gap = I.dir === 'up' ? t - d.v : (I.dir === 'zero' ? Math.abs(d.v) - t : d.v - t);
    const wsum = CM.ind.filter(J => J.c === I.c).reduce((a, J) => a + (r.big ? J.wL : J.wS), 0);
    const dT = w / wsum * CM.crit[I.c].wq / 100;
    out.push({ I, d, t, gap, dT, dRoom: dT * CM.roomCoef });
  });
  return out.sort((a, b) => b.dRoom - a.dRoom);
}
function cmDetail() {
  const r = cmRows().find(x => x.s === cmS.sel) || cmRows()[0]; const T = r.T;
  const lev = cmLever(r).slice(0, 4);
  $('#cmDet').innerHTML = `<h3 class="sub">${r.s} · chi tiết chấm điểm</h3>
    <p class="chart-sub">${r.big ? 'Nhóm NH quy mô lớn' : 'Nhóm NH quy mô nhỏ'} (TTS bq ${nf(r.taAvg / 1000, 0)} nghìn tỷ) · tổng ${nf(T.pt, 2)} (${nf(T.lo, 2)}–${nf(T.hi, 2)}) · hạng ${cmGrade(T.pt)} · room ngụ ý ${nf(T.pt * CM.roomCoef, 1)}%${r.priority ? ' · <b>NH nhận chuyển giao bắt buộc: room thực tế cao hơn công thức</b>' : ''}</p>
    <div class="tscroll"><table class="cmd"><thead><tr><th>Chỉ tiêu</th><th class="n">Giá trị</th><th class="n">Ngưỡng 5 · 4 · 3 · 2</th><th class="c">Điểm</th></tr></thead><tbody>
    ${CK.map(k => `<tr class="grp"><td colspan="4"><b>${k} · ${esc(CM.crit[k].name)}</b> <span class="muted">· ${nf(CM.crit[k].wq, 0)}% định lượng + ${nf(CM.crit[k].wl, 0)}% định tính · điểm ${nf(r.crit[k].pt, 2)}${r.crit[k].cov < 100 ? ` · có số ${r.crit[k].cov}% trọng số` : ''}</span></td></tr>` +
      CM.ind.filter(I => I.c === k && (r.big ? I.wL : I.wS) > 0).map(I => { const d = r.v[I.id], th = r.big ? I.thL : I.thS;
        return `<tr><td>${esc(I.name)} <span class="muted">(${r.big ? I.wL : I.wS}%)</span>${I.note ? `<div class="note">${esc(I.note)}</div>` : ''}</td>
        <td class="n">${d.v == null ? `<span class="muted">${esc(I.missing || 'thiếu số')}</span>` : nf(d.v, I.id === 'E4' ? 0 : 2) + (I.id === 'E4' ? ' ngày' : '%')}${I.c === 'C' && r.carPeriod && d.v != null ? `<div class="muted">${r.carPeriod}</div>` : ''}${I.id === 'A6' && r.a6From ? `<div class="muted">số ${r.a6From}</div>` : ''}</td>
        <td class="n muted">${th.map(x => nf(x, x % 1 ? 1 : 0)).join(' · ')}</td>
        <td class="c"><span class="sc" style="background:${cmCol(d.s)};color:${cmInk(d.s)}">${d.s == null ? '1–5' : d.s}</span></td></tr>`; }).join('')).join('')}
    </tbody></table></div>
    ${lev.length ? `<div class="insight"><b>Đòn bẩy room:</b> ${lev.map(x => `${esc(x.I.name.split(' (')[0])} ${x.I.dir === 'up' ? 'tăng' : 'giảm'} thêm <b>${nf(Math.abs(x.gap), 2)}${x.I.id === 'E4' ? ' ngày' : ' điểm %'}</b> (về ${nf(x.t, 1)}) → +${nf(x.dT, 2)} điểm, +${nf(x.dRoom, 2)} điểm % room`).join('; ')}.</div>` : ''}`;
}
/* Lịch sử điểm từng ngân hàng qua các kỳ + nhận định tự động: xu hướng, kỳ nhảy điểm, điểm bất thường */
function cmHist(sym) {
  const ks = Object.keys(CM.periods);
  return ks.map(k => { const R = CM.periods[k].rows.map(r => Object.assign({}, r, { T: cmTot(r) })).sort((a, b) => b.T.pt - a.T.pt), i = R.findIndex(r => r.s === sym);
    return { k, label: CM.periods[k].label, r: i < 0 ? null : R[i], rank: i + 1, n: R.length }; }).filter(h => h.r);
}
function cmHistIns(sym) {
  const H = cmHist(sym); if (H.length < 2) return 'Chưa đủ kỳ để so sánh.';
  const f = H[0], l = H[H.length - 1], ann = H.filter(h => /^FY/.test(h.k)), base = ann.slice(0, -1);
  const indName = id => (CM.ind.find(I => I.id === id) || {}).name.split(' (')[0];
  const fmtV = (id, v) => v == null ? '—' : nf(v, id === 'E4' ? 0 : 2) + (id === 'E4' ? ' ngày' : '%');
  const drivers = (a, b) => CM.ind.filter(I => (b.r.big ? I.wL : I.wS) > 0).map(I => ({ I, a: a.r.v[I.id], b: b.r.v[I.id] }))
    .filter(x => x.a && x.b && x.a.s != null && x.b.s != null && x.b.s !== x.a.s).sort((x, y) => Math.abs(y.b.s - y.a.s) - Math.abs(x.b.s - x.a.s)).slice(0, 3)
    .map(x => `${indName(x.I.id)} ${fmtV(x.I.id, x.a.v)} → ${fmtV(x.I.id, x.b.v)} (${x.a.s}→${x.b.s} điểm)`);
  const steps = H.slice(1).map((h, i) => ({ a: H[i], b: h, d: h.r.T.pt - H[i].r.T.pt }));
  const big = steps.filter(x => Math.abs(x.d) >= 0.3).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
  let t = `${sym}: tổng điểm ${nf(f.r.T.pt, 2)} (${f.label}, hạng ${cmGrade(f.r.T.pt)}, thứ ${f.rank}/${f.n}) → <b>${nf(l.r.T.pt, 2)}</b> (${l.label}, hạng ${cmGrade(l.r.T.pt)}, thứ <b>${l.rank}/${l.n}</b>). `;
  t += big.length ? `Kỳ đổi điểm mạnh nhất: <b>${big[0].a.label} → ${big[0].b.label} ${sg(big[0].d, 2, ' điểm')}</b>${drivers(big[0].a, big[0].b).length ? ' — do ' + drivers(big[0].a, big[0].b).join('; ') : ''}. ` : 'Điểm đi trong biên độ hẹp (không kỳ nào đổi quá 0,3 điểm). ';
  const flags = [];
  const jump = steps.filter(x => x.d >= 0.5);
  jump.forEach(x => flags.push(`<b>nhảy ${sg(x.d, 2, ' điểm')} trong một kỳ</b> (${x.a.label} → ${x.b.label}) — mức tăng hiếm gặp với ngân hàng, cần kiểm tra có bền không`));
  if (base.length >= 2) { const avg = base.reduce((a, h) => a + h.r.T.pt, 0) / base.length;
    if (l.r.T.pt - avg >= 0.4) flags.push(`điểm hiện tại cao hơn bình quân ${base[0].label.replace('Năm ', '')}–${base[base.length - 1].label.replace('Năm ', '')} (${nf(avg, 2)}) <b>${nf(l.r.T.pt - avg, 2)} điểm</b>`);
    if (avg - l.r.T.pt >= 0.4) flags.push(`điểm hiện tại thấp hơn bình quân các năm trước (${nf(avg, 2)}) <b>${nf(avg - l.r.T.pt, 2)} điểm</b> — xu hướng xấu đi`); }
  steps.forEach(x => { const up = ['E', 'M'].map(c => [c, x.b.r.crit[c].pt - x.a.r.crit[c].pt]).filter(([, d]) => d >= 1.5);
    if (up.length) flags.push(`${up.map(([c, d]) => `${c} (${CM.crit[c].name.toLowerCase()}) +${nf(d, 1)} điểm`).join(', ')} ở ${x.b.label} — hai tiêu chí này dựa trên lợi nhuận 4 quý, dễ bị đẩy lên bởi thu nhập bất thường (thu hồi nợ đã xử lý, bán khoản đầu tư, hoàn nhập dự phòng); cần đối chiếu thuyết minh BCTC`); });
  steps.forEach(x => { const d = x.b.r.crit.A.pt - x.a.r.crit.A.pt, a7 = [x.a.r.v.A7, x.b.r.v.A7];
    if (d >= 0.9) flags.push(`chất lượng tài sản (A) tăng ${nf(d, 1)} điểm ở ${x.b.label}${a7[0] && a7[1] && a7[1].v != null && a7[0].v != null ? ` trong khi bao phủ nhóm 2–5 ${a7[1].v < a7[0].v ? 'giảm' : 'tăng'} từ ${nf(a7[0].v, 0)}% còn ${nf(a7[1].v, 0)}%` : ''} — nợ xấu giảm có thể đến từ xử lý bằng dự phòng hoặc bán nợ, chưa chắc là chất lượng cho vay tốt lên`); });
  const rk = steps.filter(x => x.a.rank - x.b.rank >= 8);
  rk.forEach(x => flags.push(`thứ hạng tăng ${x.a.rank - x.b.rank} bậc (${x.a.rank} → ${x.b.rank}) ở ${x.b.label}`));
  if (l.r.cov < 70) flags.push(`chỉ ${l.r.cov}% trọng số định lượng có số công khai — điểm dao động rộng (${nf(l.r.T.lo, 2)}–${nf(l.r.T.hi, 2)})`);
  t += flags.length ? `<br><b>Điểm cần chú ý:</b><ul style="margin:4px 0 0 18px;padding:0">${flags.slice(0, 5).map(x => `<li>${x}</li>`).join('')}</ul>` : '<br>Không thấy dấu hiệu bất thường: điểm ổn định, không kỳ nào nhảy mạnh.';
  return t + how('Room tín dụng giao theo điểm của năm trước, nên một năm lợi nhuận đột biến có thể kéo room lên trong khi nền tảng (vốn, chất lượng tài sản, thanh khoản) chưa đổi. Điểm đáng tin hơn khi tăng đều qua nhiều kỳ và được C, A, L cùng xác nhận chứ không chỉ E và M.');
}
function cmHistDraw() {
  const H = cmHist(cmS.sel); if (!H.length) return;
  const col = { C: '#1f8a8d', A: '#861C52', M: '#d9a400', E: '#2938A8', L: '#7a5bb5', S: '#9aa3b2' };
  mk('chCmHist', { type: 'line', data: { labels: H.map(h => h.label.replace('Năm ', '')), datasets: [
      { label: 'Tổng điểm', data: H.map(h => +h.r.T.pt.toFixed(2)), borderColor: '#1D2678', backgroundColor: '#1D2678', borderWidth: 3, pointRadius: 4, dp: 2, unit: '' },
      ...CK.map(k => ({ label: `${k} · ${CM.crit[k].name}`, data: H.map(h => +h.r.crit[k].pt.toFixed(2)), borderColor: col[k], backgroundColor: col[k], borderWidth: 1.4, pointRadius: 2, dp: 1, unit: '' }))] },
    options: { scales: { y: { min: 1, max: 5, title: { display: true, text: 'điểm' }, ticks: { stepSize: 0.5, callback: v => nf(v, 1) } } },
      plugins: { refLines: { lines: [{ value: 4.5, label: 'A', color: '#1e8f5a' }, { value: 3.5, label: 'B', color: '#c0392b' }] },
        tooltip: { callbacks: { afterTitle: it => { const h = H[it[0].dataIndex]; return `Hạng ${cmGrade(h.r.T.pt)} · thứ ${h.rank}/${h.n}`; } } } } } });
  $('#cmHistT').textContent = `${cmS.sel} · lịch sử điểm CAMELS 2021 → nay`;
  $('#cmHistIns').innerHTML = cmHistIns(cmS.sel);
}
function cmRender() {
  const R = cmRows();
  $$('#cmP button').forEach(b => b.classList.toggle('on', b.dataset.k === cmS.p));
  $('#cmBody').innerHTML = R.map((r, i) => `<tr data-s="${r.s}" class="${r.s === cmS.sel ? 'sel' : ''}"><td>${i + 1}</td><td><b>${r.s}</b>${r.priority ? ' <span class="pri" title="Nhận chuyển giao bắt buộc — được ưu tiên room">★</span>' : ''}</td><td style="white-space:nowrap">${gdot(r.group)}${r.big ? 'Lớn' : 'Nhỏ'}</td>
    ${CK.map(k => `<td class="c"><span class="sc" style="background:${cmCol(r.crit[k].pt)};color:${cmInk(r.crit[k].pt)}" title="${esc(CM.crit[k].name)}${r.crit[k].cov < 100 ? ' · có số ' + r.crit[k].cov + '% trọng số' : ''}">${nf(r.crit[k].pt, 1)}${r.crit[k].cov < 100 ? '*' : ''}</span></td>`).join('')}
    <td class="c"><input class="qin" type="number" min="1" max="5" step="0.5" value="${qualOf(r.s)}" data-s="${r.s}" aria-label="Điểm định tính ${r.s}"></td>
    <td class="n"><b>${nf(r.T.pt, 2)}</b><div class="rgbar"><span style="left:${(r.T.lo - 1) / 4 * 100}%;width:${(r.T.hi - r.T.lo) / 4 * 100}%"></span><i style="left:${(r.T.pt - 1) / 4 * 100}%"></i></div></td>
    <td class="c"><span class="gr g${cmGrade(r.T.pt)}">${cmGrade(r.T.pt)}</span></td><td class="n">${nf(r.T.pt * CM.roomCoef, 1)}%</td><td class="n">${r.creditYtd == null ? '—' : pc(r.creditYtd, 1)}</td></tr>`).join('');
  $$('#cmBody tr').forEach(tr => tr.onclick = e => { if (e.target.tagName === 'INPUT') return; cmS.sel = tr.dataset.s; cmRender(); });
  $$('#cmBody .qin').forEach(inp => inp.onchange = () => { const v = Math.min(5, Math.max(1, +inp.value || CM.qualDefault)); const q = store.get().qual || {}; q[inp.dataset.s] = v; store.set({ qual: q }); cmRender(); });
  const ctg = R.find(r => r.s === 'CTG'), rk = R.indexOf(ctg) + 1, big = R.filter(r => r.big), rkB = big.indexOf(ctg) + 1;
  const cnt = g => R.filter(r => cmGrade(r.T.pt) === g).length;
  $('#cmK').innerHTML = kpi('CTG · điểm ước tính', nf(ctg.T.pt, 2) + ' · ' + cmGrade(ctg.T.pt), `hạng ${rk}/${R.length} toàn ngành · ${rkB}/${big.length} nhóm lớn`) +
    kpi('Room ngụ ý CTG', nf(ctg.T.pt * CM.roomCoef, 1) + '%', `trung vị ngành ${nf(med(R.map(r => r.T.pt * CM.roomCoef)), 1)}%`) +
    kpi('Phân bố hạng', `${cnt('A')} A · ${cnt('B')} B · ${cnt('C') + cnt('D') + cnt('E')} C–E`, 'với định tính hiện tại') +
    kpi('Độ phủ dữ liệu', `${med(R.map(r => r.cov))}%`, 'trọng số định lượng có số công khai');
  const half = cmS.p === 'TTM2Q26', f = half ? 0.5 : 1;   // H1/2026: so với nửa room cả năm
  const pts = R.map(r => ({ x: r.T.pt * CM.roomCoef, y: half ? r.creditYtd : r.creditYoY, s: r.s, g: r.group })).filter(p => p.y != null);
  const mx = Math.max(...pts.map(p => p.x)), mn = Math.min(...pts.map(p => p.x));
  mk('chCmRoom', { type: 'scatter', data: { datasets: [...GROUPS.map(g => ({ label: g, data: pts.filter(p => p.g === g), backgroundColor: GC[g], pointRadius: 5, pointHoverRadius: 7 })),
      { type: 'line', label: half ? 'Nửa room ngụ ý (nhịp 6 tháng)' : 'Tăng trưởng = room ngụ ý', data: [{ x: mn - 0.3, y: (mn - 0.3) * f }, { x: mx + 0.3, y: (mx + 0.3) * f }], borderColor: '#c0392b', borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, fill: false }] },
    options: { plugins: { tooltip: { callbacks: { label: c => c.raw.s ? `${c.raw.s}: room ngụ ý ${nf(c.raw.x, 1)}% · tín dụng ${pc(c.raw.y, 1)}` : '' } } },
      scales: { x: { title: { display: true, text: 'Room ngụ ý (%)' }, ticks: { callback: v => nf(v, 1) + '%' } }, y: { title: { display: true, text: half ? 'Tín dụng tăng từ đầu năm 2026 (%)' : 'Tín dụng 2025 (%)' }, ticks: { callback: v => nf(v, 0) + '%' } } } },
    plugins: [{ id: 'cmLbl', afterDatasetsDraw(ch) { const { ctx } = ch; ctx.save(); ctx.font = '600 10px Arial'; ctx.fillStyle = '#3f4656';
      ch.data.datasets.forEach((d, i) => { if (!d.data[0] || !d.data[0].s) return; ch.getDatasetMeta(i).data.forEach((e, j) => ctx.fillText(d.data[j].s, e.x + 6, e.y - 4)); }); ctx.restore(); } }] });
  const over = pts.filter(p => p.y > p.x * f + (half ? 1.5 : 3)).sort((a, b) => (b.y - b.x * f) - (a.y - a.x * f));
  $('#cmIns').innerHTML = `CTG xếp <b>${rk}/${R.length}</b> (${nf(ctg.T.pt, 2)} điểm, hạng ${cmGrade(ctg.T.pt)}) → room ngụ ý <b>${nf(ctg.T.pt * CM.roomCoef, 1)}%</b>; tiêu chí kéo điểm xuống: ${CK.filter(k => ctg.crit[k].pt < 4).map(k => `${k} ${nf(ctg.crit[k].pt, 1)}`).join(', ') || 'không có'}. ${over.length ? `${half ? 'Nửa đầu 2026 đã tăng vượt nửa room ngụ ý trên 1,5 điểm %' : 'Năm 2025 tăng vượt room ngụ ý trên 3 điểm %'}: ${over.slice(0, 6).map(p => `<b>${p.s}</b> ${pc(p.y, 0)}`).join(', ')} — phần lớn là NH được ưu tiên (★) hoặc được nới room trong năm; NH khác vượt chỉ tiêu bị trừ 1 điểm M định tính (Điều 16.6).` : ''}`;
  cmDetail(); cmHistDraw(); decorate && decorate();
}
function chCamel() {
  $$('#cmP button').forEach(b => b.onclick = () => { cmS.p = b.dataset.k; cmRender(); });
  cmRender();
}

/* ---- Insight tự tính cho các chart Quốc tế & Tiền tệ: "số đang nói gì" + "cách đọc" ---- */
const gv = k => glast(k).v, gd = k => glast(k).d;
const gback = (k, n) => gprev(k, n);
const dir = (a, b, up = 'tăng', dn = 'giảm', eps = 0.05) => a == null || b == null ? '' : a - b > eps ? up : b - a > eps ? dn : 'đi ngang';
const how = t => `<br><span class="howto"><b>Hàm ý:</b> ${t}</span>`;
const INS = {
  gGlY10: () => { const ch = k => { const a = glast(k).v, b = yStart(k); return a != null && b != null ? (a - b) * 100 : null; }, w = k => gprev(k, 5);
    const rows = Y10D.filter(([k]) => gs(k).v.length).map(([k, n]) => `${n} <b>${pc(glast(k).v, 2)}</b> (${sg(ch(k), 0, ' bps')} từ đầu năm, ${sg((glast(k).v - w(k)) * 100, 0, ' bps')} 1 tuần)`);
    return `${rows.join('; ')}. Lợi suất cả bốn thị trường đều cao hơn đầu năm — mặt bằng lãi suất dài hạn toàn cầu dịch lên do lạm phát vòng 2 (dầu, dịch vụ) và lượng phát hành nợ lớn.`
      + how('Nhìn "thay đổi từ đầu năm" để so sức ép giữa các nước. Nhật tăng nhanh nhất là dấu hiệu dòng vốn Nhật hồi hương (bán trái phiếu nước ngoài); Mỹ tăng kèm Đức, Nhật nghĩa là áp lực mang tính toàn cầu chứ không riêng Fed. Lợi suất 10 năm Mỹ cao hơn TPCP VN 10 năm là bất lợi cho VND.'); },
  gGlAsia: () => { const ch = k => { const a = glast(k).v, b = yStart(k); return a != null && b != null ? (a - b) * 100 : null; }, w = k => gprev(k, 5);
    const S = Y10A.filter(([k]) => gs(k).v.length); if (!S.length) return '';
    const rows = S.map(([k, n]) => `${n} <b>${pc(glast(k).v, 2)}</b> (${sg(ch(k), 0, ' bps')} từ đầu năm, ${sg((glast(k).v - w(k)) * 100, 0, ' bps')} 1 tuần)`);
    const cn = gs('cn_10y_d').v.length ? glast('cn_10y_d').v : null, us = glast('us_10y_d').v;
    return `${rows.join('; ')}.${cn != null ? ` Chênh Mỹ − Trung Quốc 10 năm <b>${nf((us - cn) * 100, 0)} bps</b>.` : ''}`
      + how('Trung Quốc đi ngược chiều thế giới: lợi suất thấp phản ánh giảm phát và PBoC nới lỏng, khiến chênh lệch với Mỹ rất rộng và CNY chịu sức ép giảm giá — kéo theo các đồng tiền châu Á, gồm VND. Hàn Quốc và Nhật tăng theo Mỹ cho thấy áp lực lãi suất dài hạn lan sang châu Á phát triển; chênh lệch Mỹ − châu Á càng rộng thì dòng vốn càng nghiêng về USD.'); },
  gGlY10m: () => { const s = Y10M.eu.filter(([k]) => gs(k).v.length); if (!s.length) return ''; const r = s.map(([k, n]) => [n, glast(k).v, gprev(k, 12)]);
    const sp = gs('y10_it_m').v.length && gs('y10_de_m').v.length ? (glast('y10_it_m').v - glast('y10_de_m').v) * 100 : null;
    return `${mvn(glast(s[0][0]).d)}: ${r.map(([n, v, p]) => `${n} ${pc(v, 2)} (${sg((v - p) * 100, 0, ' bps')} 12 tháng)`).join('; ')}.${sp != null ? ` Chênh Ý − Đức <b>${nf(sp, 0)} bps</b>.` : ''}`
      + how('Chênh lợi suất Ý, Tây Ban Nha, Pháp so với Đức đo rủi ro tài khoá trong khu vực euro: nới rộng nhanh là tín hiệu căng thẳng. Số theo tháng (bình quân), đi sau chuỗi theo ngày.'); },
  gGlCurve: () => { const U = GD.ustCurve; if (!U) return ''; const c = U.c, iy = t => U.t.indexOf(t), d = (a, b, t) => a && b && a.v[iy(t)] != null && b.v[iy(t)] != null ? (a.v[iy(t)] - b.v[iy(t)]) * 100 : null, cur = c[0], st = c.find(x => x.n === 'Đầu năm');
    return `So với đầu năm: 3 tháng ${sg(d(cur, st, '3M'), 0, ' bps')}, 2 năm ${sg(d(cur, st, '2Y'), 0, ' bps')}, 10 năm ${sg(d(cur, st, '10Y'), 0, ' bps')}, 30 năm ${sg(d(cur, st, '30Y'), 0, ' bps')}. Độ dốc 10Y − 3M hiện ${sg((cur.v[iy('10Y')] - cur.v[iy('3M')]) * 100, 0, ' bps')}.`
      + how('Cả đường cong dịch lên = thị trường định giá Fed tăng lãi suất (đầu ngắn) và phần bù kỳ hạn cao hơn (đầu dài). Đầu dài tăng nhiều hơn đầu ngắn (đường dốc lên) thường do lượng phát hành và lạm phát kỳ vọng, không chỉ do Fed.'); },
  gGlOil: () => { const w = glast('us_wti_d'), b = glast('us_brent_d'), x = gs('us_wti_d'), mx = Math.max(...x.v.filter(v => v != null));
    return `WTI <b>${nf(w.v, 1)} USD</b> (${dvn(w.d)}), Brent ${nf(b.v, 1)} USD; WTI đỉnh ${nf(mx, 1)} USD từ 9/2025.`
      + how('Giá dầu neo cao giữ lạm phát chi phí ở các nước nhập khẩu năng lượng (Việt Nam, Nhật, châu Âu) và nuôi kỳ vọng lạm phát — lý do lợi suất dài hạn khó giảm.'); },
  gUsCpi: () => { const h = gv('us_cpi_yoy'), c = gv('us_cpi_core_yoy'), sc = gv('us_cpi_supercore_yoy'), c3 = gv('us_cpi_core_m3');
    return `${mvn(gd('us_cpi_yoy'))}: CPI <b>${pc(h, 1)}</b>, lõi <b>${pc(c, 1)}</b>, supercore <b>${pc(sc, 1)}</b> YoY. Lõi 3 tháng quy năm ${pc(c3, 1)} — ${c3 > c + 0.2 ? '<b>cao hơn</b> YoY: lạm phát đang tăng tốc trở lại' : c3 < c - 0.2 ? 'thấp hơn YoY: đà tăng giá đang chậm lại' : 'xấp xỉ YoY: đà tăng giá ổn định'}. ${c > 3 ? 'Lõi còn xa mục tiêu 2% → Fed khó nới.' : ''}`
      + how('YoY cho xu hướng, "3 tháng quy năm" cho tín hiệu sớm (đường này cắt lên trên YoY = lạm phát tăng tốc). Supercore (dịch vụ trừ nhà ở) gắn với tiền lương — Fed theo dõi sát nhất. Lạm phát Mỹ cao → Fed giữ/tăng lãi suất → USD mạnh → áp lực lên tỷ giá USD/VND.'); },
  gUsCpiC: () => { const it = [['Nhà ở', 'us_cpi_shelter_yoy'], ['Hàng hóa lõi', 'us_cpi_coregoods_yoy'], ['Dịch vụ trừ năng lượng', 'us_cpi_svc_ex_energy_yoy'], ['Năng lượng', 'us_cpi_energy_yoy'], ['Lương thực', 'us_cpi_food_yoy']].map(([n, k]) => [n, gv(k), gback(k, 3)]);
    const mx = it.reduce((a, b) => b[1] > a[1] ? b : a);
    return `Tăng mạnh nhất: <b>${mx[0]}</b> ${pc(mx[1], 1)} YoY. ${it.map(([n, v, p]) => `${n} ${pc(v, 1)} (${dir(v, p)} so với 3 tháng trước)`).join('; ')}.`
      + how('Nhà ở (chiếm ~1/3 CPI) đi chậm sau giá thuê thị trường 9–12 tháng; hàng hóa lõi phản ánh thuế quan, chuỗi cung ứng; năng lượng biến động theo dầu. Nếu lạm phát do dịch vụ và nhà ở thì dai dẳng; do năng lượng thì thường tự hạ.'); },
  gUsPceC: () => { const P = (GD.pceC || {}).yoy, C2 = (GD.pceC || {}).super; if (!P) return '';
    const r = P.v[P.v.length - 1], r12 = P.v[P.v.length - 13] || [], tot = r.reduce((a, x) => a + (x || 0), 0), nm = P.cols.map(c => PCEC_VN[c] || c);
    const parts = nm.map((n, j) => `${n} <b>${nf(r[j], 2)}</b>${r12[j] != null ? ` (${sg(r[j] - r12[j], 2)} so với 12 tháng trước)` : ''}`);
    const sr = C2 ? C2.v[C2.v.length - 1] : null, top = sr ? C2.cols.map((c, j) => [PCEC_VN[c] || c, sr[j]]).sort((a, b) => b[1] - a[1])[0] : null;
    return `${mvn(P.d[P.d.length - 1])}: PCE tổng ${pc(tot, 2)} YoY, gồm ${parts.join('; ')} điểm %.${top ? ` Trong supercore, đóng góp lớn nhất là ${top[0]} (${nf(top[1], 2)} điểm %).` : ''}`
      + how('Dịch vụ lõi trừ nhà ở (supercore) gắn với tiền lương nên giảm chậm nhất — đây là phần Fed theo dõi sát. Hàng hoá lõi đóng góp dương trở lại thường là dấu hiệu thuế quan, giá đầu vào truyền sang giá bán. Lương thực & năng lượng biến động mạnh, phản ánh giá dầu; nhà ở giảm dần theo giá thuê mới với độ trễ 12–18 tháng.'); },
  gUsPce: () => { const c = gv('us_pce_core_yoy'), sc = gv('us_pce_supercore_yoy'), t = gv('us_pce_trim');
    return `${mvn(gd('us_pce_core_yoy'))}: PCE lõi <b>${pc(c, 2)}</b>, supercore ${pc(sc, 2)}, trimmed mean ${pc(t, 2)}. ${c > 2.5 ? `Còn cao hơn mục tiêu 2% <b>${nf((c - 2) * 100, 0)} bps</b>.` : 'Đã gần mục tiêu 2%.'} ${t != null && Math.abs(t - c) > 0.3 ? (t > c ? 'Trimmed mean cao hơn lõi: tăng giá lan rộng chứ không do vài mặt hàng.' : 'Trimmed mean thấp hơn lõi: tăng giá tập trung ở vài mặt hàng.') : ''}`
      + how('PCE lõi là thước đo Fed dùng cho mục tiêu 2% (khác CPI ở trọng số: nhà ở nhẹ hơn, y tế nặng hơn). Trimmed mean bỏ các mặt hàng biến động cực đoan → cho biết lạm phát "nền".'); },
  gUsPpi: () => { const f = gv('us_ppi_fd_yoy'), c = gv('us_ppi_core_yoy'), i = gv('us_ppi_inter_yoy'), cr = gv('us_ppi_crude_yoy');
    return `PPI cầu cuối cùng <b>${pc(f, 1)}</b>, lõi ${pc(c, 1)}; giá trung gian ${pc(i, 1)}, nguyên liệu thô ${pc(cr, 1)} YoY. ${i > f ? 'Chi phí đầu vào tăng nhanh hơn giá đầu ra → doanh nghiệp sẽ chuyển dần sang giá bán lẻ.' : 'Đầu vào tăng chậm hơn đầu ra → áp lực chi phí đang dịu.'}`
      + how('Đọc theo chuỗi: thô → trung gian → cầu cuối cùng → CPI hàng hóa, độ trễ 1–6 tháng. PPI thô/trung gian tăng là tín hiệu sớm cho CPI hàng hóa.'); },
  gUsJobs: () => { const p = gs('us_payems_chg').v.slice(-3), avg = p.reduce((a, v) => a + v, 0) / p.length, u = gv('us_unrate'), u12 = gback('us_unrate', 12);
    return `Việc làm tăng thêm trung bình 3 tháng <b>${nf(avg, 0)} nghìn</b>/tháng; thất nghiệp <b>${pc(u, 1)}</b> (${sg(u - u12, 1, ' đ%')} so với 12 tháng trước). ${avg < 50 ? 'Thị trường lao động đang <b>yếu</b> — đủ để Fed cân nhắc nới.' : avg > 150 ? 'Lao động còn mạnh — Fed không vội nới.' : 'Tạo việc làm chậm lại nhưng chưa xấu.'}`
      + how('Mỹ cần khoảng 50–100 nghìn việc làm mới mỗi tháng để giữ thất nghiệp ổn định. Cột âm hoặc thất nghiệp tăng ≥ 0,5 đ% từ đáy (quy tắc Sahm) thường báo suy thoái → Fed hạ lãi suất → USD yếu đi, tốt cho VND.'); },
  gUsSpr: () => { const s1 = gv('sofr_iorb'), t = gv('tgcr_iorb'), p = gv('sofr99_iorb'), m = gs('sofr99_iorb').v.slice(-21), mx = Math.max(...m);
    return `${dvn(gd('sofr_iorb'))}: SOFR − IORB <b>${sg(s1, 0, ' bps')}</b>, TGCR − IORB ${sg(t, 0, ' bps')}, SOFR p99 − IORB <b>${sg(p, 0, ' bps')}</b> (cao nhất 1 tháng ${sg(mx, 0, ' bps')}). ${s1 > 0 ? 'Repo đắt hơn lãi dự trữ: <b>thanh khoản USD đang căng</b>.' : p > 10 ? 'Mặt bằng ổn nhưng phần đuôi (p99) căng — một số bên phải vay rất đắt.' : 'Thị trường repo bình thường, dự trữ còn đủ.'}`
      + how('IORB là lãi Fed trả cho dự trữ ngân hàng — "trần mềm" của lãi qua đêm. Lãi repo vượt IORB nghĩa là ngân hàng thiếu tiền mặt để cho vay (dự trữ khan) — dấu hiệu Fed phải dừng QT hoặc bơm thêm. Đỉnh thường rơi vào cuối tháng/cuối quý, ngày nộp thuế, ngày thanh toán TPCP.'); },
  gUsRates: () => { const e = gv('us_effr_d'), y2 = gv('us_2y_d'), y10 = gv('us_10y_d'), y2m = gback('us_2y_d', 21), y10m = gback('us_10y_d', 21);
    return `EFFR <b>${pc(e, 2)}</b>, UST 2 năm <b>${pc(y2, 2)}</b> (${sg((y2 - y2m) * 100, 0, ' bps')} 1 tháng), 10 năm <b>${pc(y10, 2)}</b> (${sg((y10 - y10m) * 100, 0, ' bps')}). Chênh 10Y − 2Y ${sg((y10 - y2) * 100, 0, ' bps')}; 2Y ${y2 < e - 0.15 ? 'thấp hơn EFFR → thị trường đặt cược Fed <b>hạ</b> lãi suất' : y2 > e + 0.15 ? 'cao hơn EFFR → thị trường đặt cược Fed <b>tăng</b> lãi suất' : 'sát EFFR → kỳ vọng Fed đứng yên'}.`
      + how('Lợi suất 2 năm phản ánh kỳ vọng lãi suất Fed 1–2 năm tới; 10 năm gồm kỳ vọng + phần bù kỳ hạn (term premium, tăng khi thâm hụt và lượng phát hành lớn). UST 10Y cao → chênh với TPCP VN âm sâu → nhà đầu tư thích giữ USD hơn.'); },
  gUsDebt: () => { const M = GD.mspd; if (!M) return ''; const n = M.d.length - 1, tot = Object.values(M.c).reduce((a, v) => a + (v[n] || 0), 0), tot12 = Object.values(M.c).reduce((a, v) => a + (v[n - 12] || 0), 0);
    return `${mvn(M.d[n])}: nợ thị trường do công chúng nắm <b>${nf(tot / 1000, 2)} nghìn tỷ USD</b> (${sg((tot / tot12 - 1) * 100, 1)} 12 tháng); tín phiếu chiếm <b>${pc(M.billShare[n], 1)}</b> (${sg(M.billShare[n] - M.billShare[n - 12], 1, ' đ%')}).`
      + how('Kho bạc tài trợ thâm hụt bằng tín phiếu (≤ 1 năm) hay trái phiếu dài hạn. Tỷ trọng tín phiếu vượt ~20% (mức TBAC khuyến nghị) = Kho bạc né phát hành dài hạn để giữ lợi suất dài thấp; tín phiếu được quỹ thị trường tiền tệ hấp thụ bằng tiền rút từ RRP. Khi chuyển sang phát hành coupon nhiều hơn → áp lực lên lợi suất 10Y.'); },
  gUsNet: () => { const ni = GD.netIss; if (!ni) return ''; const b3 = ni.bills.slice(-3).reduce((a, v) => a + v, 0), c3 = ni.coupons.slice(-3).reduce((a, v) => a + v, 0);
    return `3 tháng gần nhất: phát hành ròng tín phiếu <b>${sg(b3, 0, ' tỷ USD')}</b>, coupon <b>${sg(c3, 0, ' tỷ USD')}</b>. ${b3 > c3 ? 'Kho bạc đang dựa vào <b>tín phiếu</b> — hút tiền từ quỹ thị trường tiền tệ/RRP, ít áp lực lên lợi suất dài.' : 'Phần lớn là <b>coupon</b> — cần nhà đầu tư dài hạn hấp thụ, dễ đẩy lợi suất dài lên.'}`
      + how('Cột dương = dư nợ tăng (phát hành mới nhiều hơn đáo hạn). Tín phiếu âm vào tháng 4 là bình thường (tiền thuế về, Kho bạc trả bớt nợ ngắn hạn). Phát hành ròng lớn + TGA tăng = rút thanh khoản khỏi hệ thống ngân hàng.'); },
  gUsHold: () => { const H = GD.ustHold; if (!H) return ''; const n = H.d.length - 1, sh = k => H.h[k][n] / H.total[n] * 100, sh8 = k => H.h[k][n - 8] / H.total[n - 8] * 100;
    return `${qLab(H.d[n])}: nước ngoài <b>${pc(sh('Nước ngoài'), 1)}</b> (${sg(sh('Nước ngoài') - sh8('Nước ngoài'), 1, ' đ%')} so với 2 năm trước), Fed ${pc(sh('Fed'), 1)} (${sg(sh('Fed') - sh8('Fed'), 1, ' đ%')}), quỹ thị trường tiền tệ ${pc(sh('Quỹ thị trường tiền tệ'), 1)} (${sg(sh('Quỹ thị trường tiền tệ') - sh8('Quỹ thị trường tiền tệ'), 1, ' đ%')}), hộ gia đình ${pc(sh('Hộ gia đình (gồm quỹ phòng hộ)'), 1)}.`
      + how('Người mua "không nhạy giá" (Fed, NHTW nước ngoài) đang giảm tỷ trọng; phần còn lại phải do người mua "nhạy giá" (quỹ, hộ gia đình, quỹ phòng hộ) gánh — họ chỉ mua khi lợi suất đủ hấp dẫn. Đây là lý do lợi suất dài hạn Mỹ khó giảm sâu dù Fed hạ lãi suất.'); },
  gUsAuct: () => { const A = GD.auct; if (!A) return ''; const g = A.coupons, last = k => g[k].slice(-4, -1).filter(x => x != null), av = k => { const x = last(k); return x.reduce((a, v) => a + v, 0) / (x.length || 1); }, prev = k => { const x = g[k].slice(-16, -4).filter(v => v != null); return x.reduce((a, v) => a + v, 0) / (x.length || 1); };
    const ind = av('Indirect (nước ngoài, quỹ qua đại lý)'), indP = prev('Indirect (nước ngoài, quỹ qua đại lý)'), pd = av('Primary dealer'), pdP = prev('Primary dealer');
    return `Đấu thầu coupon 3 tháng gần nhất: indirect <b>${pc(ind, 1)}</b> (TB 12 tháng trước đó ${pc(indP, 1)}), primary dealer phải nhận <b>${pc(pd, 1)}</b> (trước ${pc(pdP, 1)}). ${pd > pdP + 2 ? 'Đại lý phải ôm nhiều hơn → <b>cầu cuối cùng yếu đi</b>.' : pd < pdP - 2 ? 'Đại lý nhận ít hơn → cầu cuối cùng <b>tốt lên</b>.' : 'Cơ cấu người mua ổn định.'}`
      + how('Primary dealer bắt buộc đặt thầu và nhận phần còn thừa — tỷ lệ này cao (> 15–20%) là phiên yếu, đại lý sẽ bán lại sau, gây áp lực lợi suất. Indirect cao = cầu từ nước ngoài và quỹ lớn tốt. Fed (SOMA) chỉ tái đầu tư phần đáo hạn, không làm thay đổi lượng bán cho công chúng.'); },
  gUsTic: () => { const t = GD.tic || {}, f = (c, n = 0) => t[c] ? t[c].v[t[c].v.length - 1 - n] : null, d = t.Japan ? t.Japan.d[t.Japan.d.length - 1] : '';
    return `${mvn(d)}: Nhật <b>${nf(f('Japan'), 0)} tỷ USD</b> (${sg(f('Japan') - f('Japan', 12), 0, ' tỷ')} 12 tháng), Trung Quốc <b>${nf(f('China'), 0)}</b> (${sg(f('China') - f('China', 12), 0, ' tỷ')}), Anh ${nf(f('United Kingdom'), 0)} (${sg(f('United Kingdom') - f('United Kingdom', 12), 0, ' tỷ')}). Tổng nước ngoài ${nf(f('Total'), 0)} tỷ, trong đó khu vực chính thức ${nf(f('Official'), 0)} tỷ.`
      + how('Trung Quốc giảm đều = đa dạng hóa dự trữ khỏi USD. Nhật giảm đột ngột thường trùng các đợt MOF bán USD can thiệp (xem tab Nhật Bản). Anh, Bỉ, Luxembourg, Cayman là trung tâm lưu ký/quỹ phòng hộ — biến động theo giao dịch basis, không phải NHTW.'); },
  gUsDef: () => { const d12 = glast('tsy_def12');
    return `Thâm hụt cộng dồn 12 tháng đến ${mvn(d12.d)}: <b>${nf(-d12.v, 0)} tỷ USD</b> (${sg((d12.v - gback('tsy_def12', 12)) / 1, 0, ' tỷ')} so với 12 tháng trước; dương = thâm hụt thu hẹp).`
      + how('Thâm hụt quyết định lượng TPCP Kho bạc phải bán. Tháng 4, 6, 9, 12 thường thặng dư nhờ thuế. Thâm hụt ~6–7% GDP khi kinh tế không suy thoái là nguồn cung UST lớn kéo dài → phần bù kỳ hạn cao.'); },
  gEaHicp: () => { const h = gv('ea_hicp'), c = gv('ea_hicp_core'), s_ = gv('ea_hicp_serv');
    return `${mvn(gd('ea_hicp'))}: HICP <b>${pc(h, 1)}</b>, lõi ${pc(c, 1)}, dịch vụ <b>${pc(s_, 1)}</b> (${dir(s_, gback('ea_hicp_serv', 3))} so với 3 tháng trước).`
      + how('ECB nhắm HICP 2% trung hạn; lạm phát dịch vụ gắn với lương là phần dai dẳng nhất. HICP về quanh 2% mà dịch vụ vẫn > 3% thì ECB thận trọng khi hạ tiếp.'); },
  gEaRate: () => { const r = gv('ea_dfr_m'), c = gv('ea_hicp_core');
    return `Lãi suất tiền gửi ECB <b>${pc(r, 2)}</b>, lạm phát lõi ${pc(c, 1)} → lãi suất thực ${sg(r - c, 2, ' đ%')}; Bund 10 năm ${pc(gv('de_10y_m'), 2)}.`
      + how('Lãi suất thực (lãi điều hành − lạm phát lõi) dương = chính sách thắt chặt, âm = nới lỏng. Chênh lãi suất ECB với Fed hẹp lại → EUR mạnh lên, DXY yếu đi.'); },
  gEaFx: () => { const x = gv('eurusd_d'), x1 = gback('eurusd_d', 21);
    return `EUR/USD <b>${nf(x, 4)}</b> (${sg((x / x1 - 1) * 100, 1)} 1 tháng); thất nghiệp khu vực Euro ${pc(gv('ea_unrate'), 1)}.`
      + how('EUR chiếm ~58% rổ DXY: EUR/USD tăng ≈ USD yếu toàn cầu → giảm áp lực lên USD/VND. Thất nghiệp thấp kỷ lục giữ lương và lạm phát dịch vụ cao.'); },
  gJpCpi: () => { const h = gv('jp_cpi_idx_yoy'), c = gv('jp_cpi_xff_idx_yoy'), cc = gv('jp_cpi_xffe_idx_yoy');
    return `${mvn(gd('jp_cpi_idx_yoy'))}: CPI <b>${pc(h, 1)}</b>, trừ thực phẩm tươi sống (core) <b>${pc(c, 1)}</b>, core-core ${pc(cc, 1)}. ${cc >= 2 ? 'Lạm phát nền đã ở/ trên 2% → BoJ có lý do tiếp tục tăng lãi suất.' : 'Lạm phát nền dưới 2% → BoJ khó tăng lãi suất nhanh.'}`
      + how('BoJ chủ yếu nhìn core và core-core (bỏ năng lượng), cùng với tăng lương (đàm phán shunto). JPY yếu làm giá nhập khẩu tăng — nên lạm phát Nhật cao một phần do chính đồng yên.'); },
  gJpRate: () => { const r = gv('jp_rate_m'), y = gv('jp_10y_m'), y12 = gback('jp_10y_m', 12);
    return `Lãi suất qua đêm <b>${pc(r, 2)}</b>, JGB 10 năm <b>${pc(y, 2)}</b> (${sg((y - y12) * 100, 0, ' bps')} 12 tháng). Chênh UST 10Y − JGB 10Y ≈ ${nf((gv('us_10y_m') - y) * 100, 0)} bps.`
      + how('Chênh lãi suất Mỹ − Nhật là động lực chính của USD/JPY và của giao dịch carry (vay JPY rẻ đầu tư tài sản lãi cao). Chênh thu hẹp nhanh → JPY tăng giá, carry bị đóng → bán tháo tài sản rủi ro toàn cầu (như 08/2024).'); },
  gJpJgb: () => { const t = k => glast(k), w = k => gprev(k, 5), y2 = t('jp_2y_d'), y10 = t('jp_10y_d'), y30 = t('jp_30y_d');
    return `${dvn(y10.d)}: JGB 2 năm <b>${pc(y2.v, 3)}</b>, 10 năm <b>${pc(y10.v, 3)}</b> (${sg((y10.v - w('jp_10y_d')) * 100, 1, ' bps')} 1 tuần), 30 năm <b>${pc(y30.v, 3)}</b>. Chênh 30Y − 10Y ${sg((y30.v - y10.v) * 100, 0, ' bps')}.`
      + how('JGB 2 năm phản ánh kỳ vọng BoJ tăng lãi suất; 30 năm phản ánh cung – cầu trái phiếu siêu dài (bảo hiểm nhân thọ giảm mua, BoJ thu hẹp). Lợi suất Nhật tăng kéo vốn của nhà đầu tư Nhật về nước — giảm cầu với UST và tài sản nước ngoài.'); },
  gJpSpr: () => { const s_ = glast('us_jp_10y_d'), fx = glast('usdjpy_d');
    return `Chênh UST − JGB 10 năm <b>${nf(s_.v, 0)} bps</b> (${sg(s_.v - gprev('us_jp_10y_d', 20), 0, ' bps')} 1 tháng); USD/JPY <b>${nf(fx.v, 2)}</b> (${dvn(fx.d)}).`
      + how('USD/JPY thường đi cùng chiều chênh lãi suất Mỹ − Nhật. Khi hai đường tách nhau (chênh giảm mà USD/JPY vẫn tăng), JPY yếu do dòng vốn ra ngoài và carry trade chứ không do lãi suất — vùng MOF dễ can thiệp.'); },
  gJpBsL: () => { const B = GD.bojbs; if (!B) return ''; const n = B.d.length - 1, c = B.l['Tiền gửi NH (current account)'];
    return `Tiền gửi NH tại BoJ <b>${nf(c[n], 0)} nghìn tỷ JPY</b> (${sg(c[n] - c[n - 12], 0, ' nghìn tỷ')} 12 tháng), tiền giấy ${nf(B.l['Tiền giấy'][n], 0)} nghìn tỷ.`
      + how('Khi BoJ giảm mua JGB, tài sản co lại và tiền gửi của ngân hàng tại BoJ (thanh khoản dư thừa) giảm tương ứng — đây là "QT kiểu Nhật". Tiền giấy ổn định, nên thay đổi gần như dồn hết vào current account.'); },
  gJpHold: () => { const H = GD.jgbHold; if (!H) return ''; const n = H.d.length - 1, sh = (k, i = n) => H.h[k][i] / H.total[i] * 100;
    return `${qLab(H.d[n])}: BoJ nắm <b>${pc(sh('BoJ'), 1)}</b> (đỉnh ${pc(Math.max(...H.h.BoJ.map((v, i) => v / H.total[i] * 100)), 1)}), nước ngoài ${pc(sh('Nước ngoài'), 1)}, ngân hàng ${pc(sh('Ngân hàng, tổ chức nhận tiền gửi'), 1)}, bảo hiểm ${pc(sh('Bảo hiểm'), 1)}.`
      + how('BoJ từng hấp thụ gần một nửa JGB. Khi BoJ rút, ngân hàng và nhà đầu tư nước ngoài phải mua thay — họ đòi lợi suất cao hơn. Bảo hiểm nhân thọ giảm nắm giữ JGB siêu dài là điểm yếu của đầu dài đường cong.'); },
  gJpFx: () => { const x = gv('usdjpy_d'), ep = jpEpisodes(), le = ep[ep.length - 1];
    return `USD/JPY <b>${nf(x, 2)}</b> (${dvn(gd('usdjpy_d'))}). ${le ? `Đợt can thiệp gần nhất ${dvn(le.from)}–${dvn(le.to)}: ${le.amt > 0 ? 'bán USD' : 'mua USD'} <b>${nf(Math.abs(le.amt) / 10000, 2)} nghìn tỷ JPY</b>.` : ''} ${x > 155 ? 'Tỷ giá đang ở vùng MOF từng can thiệp (155–162) → rủi ro can thiệp cao.' : ''}`
      + how('MOF thường can thiệp khi JPY mất giá nhanh (vài yên trong vài ngày) quanh 150–162, thường sau phát biểu cảnh báo của Thứ trưởng Tài chính về tiền tệ. Số ngày/lượng can thiệp chỉ công bố cuối tháng (tổng) và cuối quý (từng ngày), nên cột đỏ có độ trễ.'); },
  gJpResC: () => { const R = GD.jpRes; if (!R) return ''; const n = R.d.length - 1, c = R.c, p12 = n - 12, ch = k => c[k][n] - c[k][p12];
    return `${mvn(R.d[n])}: tổng <b>${nf(R.total[n], 1)} tỷ USD</b> (${sg(R.total[n] - R.total[p12], 1, ' tỷ')} 12 tháng). Chứng khoán ${nf(c['Chứng khoán ngoại tệ'][n], 0)} tỷ (${sg(ch('Chứng khoán ngoại tệ'), 0, ' tỷ')}), tiền gửi ${nf(c['Tiền gửi ngoại tệ'][n], 0)} tỷ (${sg(ch('Tiền gửi ngoại tệ'), 0, ' tỷ')}), vàng ${nf(c['Vàng'][n], 0)} tỷ (${sg(ch('Vàng'), 0, ' tỷ')}).`
      + how('Khi can thiệp bán USD, Bộ Tài chính Nhật dùng tiền gửi ngoại tệ trước, rồi bán chứng khoán (chủ yếu UST). Tiền gửi giảm mạnh mà chứng khoán đứng yên là dấu hiệu đã can thiệp và còn dư địa; vàng tăng thường do giá vàng, không phải mua thêm.'); },
  gJpRes: () => { const r = gs('jp_res_mof').v.length ? glast('jp_res_mof') : glast('jp_res_imf'), tj = (GD.tic || {}).Japan;
    return `Dự trữ ${mvn(r.d)}: <b>${nf(r.v, 0)} tỷ USD</b> (${sg(r.v - gback(gs('jp_res_mof').v.length ? 'jp_res_mof' : 'jp_res_imf', 12), 0, ' tỷ')} 12 tháng)${tj ? `; UST Nhật nắm ${nf(tj.v[tj.v.length - 1], 0)} tỷ (${mvn(tj.d[tj.d.length - 1])})` : ''}.`
      + how('Để có USD bán ra khi can thiệp, MOF rút tiền gửi USD rồi bán UST trong dự trữ → dự trữ và lượng UST Nhật nắm giảm cùng lúc với cột can thiệp. Đây là kênh Nhật can thiệp tác động ngược lên lợi suất UST.'); },
  gCnPx: () => { const c = gv('cn_cpi'), p = gv('cn_ppi');
    return `CPI <b>${pc(c, 1)}</b> (${mvn(gd('cn_cpi'))}), PPI <b>${pc(p, 1)}</b> (${mvn(gd('cn_ppi'))}). ${p < 0 ? 'PPI âm = giảm phát giá xuất xưởng: Trung Quốc "xuất khẩu giảm phát" sang các nước nhập hàng (kể cả VN).' : 'PPI đã dương lại — giảm phát công nghiệp kết thúc.'}`
      + how('PPI âm kéo dài làm giá hàng nhập khẩu từ Trung Quốc rẻ → kìm CPI hàng hóa ở VN nhưng gây áp lực cạnh tranh cho sản xuất trong nước. CPI gần 0 cho thấy cầu nội địa yếu → PBOC tiếp tục nới.'); },
  gCnFx: () => { const x = gv('usdcny_d'), x3 = gback('usdcny_d', 63);
    return `USD/CNY <b>${nf(x, 4)}</b> (${sg((x / x3 - 1) * 100, 1)} 3 tháng; âm = CNY tăng giá); lãi suất liên NH 3 tháng ${pc(gv('cn_rate_m'), 2)}.`
      + how('CNY là đồng tiền tham chiếu quan trọng của VND (đối tác thương mại lớn nhất). CNY mạnh lên giúp NHNN dễ giữ tỷ giá; CNY mất giá mạnh thường kéo VND theo.'); },
  mmSpTs: () => { if (!VR.d.length) return ''; const n = VR.d.length - 1, sp = t => mmSp(t, n), sp0 = t => { for (let i = Math.max(0, n - 20); i <= n; i++) { const v = mmSp(t, i); if (v != null) return v; } return null; };
    return `Chênh VND − USD hôm nay: qua đêm ${sg(sp('ON'), 2, '')}, 1 tháng ${sg(sp('1M'), 2, '')}, 3 tháng <b>${sg(sp('3M'), 2, '')}</b>, 1 năm <b>${sg(sp('1Y'), 2, '')}</b> điểm %. So với khoảng 1 tháng trước, chênh 3 tháng ${dir(sp('3M'), sp0('3M'), 'nới rộng', 'thu hẹp', 0.1)}.`
      + how('Chênh dương và nới rộng = giữ VND ngày càng có lợi → hỗ trợ tỷ giá. Chênh qua đêm dao động mạnh theo thanh khoản ngắn hạn (cuối tháng, cuối quý, đợt NHNN hút/bơm), nên nhìn kỳ 3 tháng–1 năm cho xu hướng.'); },
  mmFx: () => { const v = glast('usdvnd_vcb_sell'); if (v.v == null) return '';
    return `USD/VND Vietcombank bán ra <b>${nf(v.v, 0)}</b> (${dvn(v.d)}), mua ${nf(glast('usdvnd_vcb_buy').v, 0)}.` + how('Giá NHTM bán ra so với trần biên độ (trung tâm +5%) cho biết NHNN còn dư địa bao nhiêu trước khi phải bán USD can thiệp. Chuỗi mới bắt đầu tích luỹ; xem lịch sử dài ở tab Nội địa.'); },
  mmLvTs: () => { if (!VR.d.length) return ''; const n = VR.d.length - 1, v = (c, t) => VR[c][t] ? VR[c][t][n] : null;
    return `VNIBOR VND: qua đêm ${pc(v('vnd', 'ON'), 2)}, 3 tháng <b>${pc(v('vnd', '3M'), 2)}</b>, 1 năm ${pc(v('vnd', '1Y'), 2)}; VNIBOR USD 3 tháng ${pc(v('usd', '3M'), 2)}, SOFR 3 tháng ${pc(v('sofr', '3M'), 2)}.`
      + how('VND qua đêm phản ánh thanh khoản hằng ngày (NHNN điều tiết qua OMO); 3 tháng–1 năm phản ánh chi phí vốn mà ngân hàng chấp nhận trả → đi trước lãi suất huy động và COF. VNIBOR USD bám SOFR; khi VNIBOR USD cao hơn SOFR là USD trong nước khan.'); },
};
/* ---- Quốc tế ---- */
function subIntlOverview() {
  const b = lastv(intl.brent);
  return `<div class="kpis k4">
    ${kpi('Fed (EFFR)', pc(lastv(intl.effr).v, 2), 'tăng 25 bps 16/09/2026 · FOMC tới 27–28/10', 'neg')}
    ${kpi('UST 10Y', pc(lastv(intl.ust10).v, 2), `${sg((lastv(intl.ust10).v - intl.ust10[intl.ust10.length - 13].v) * 100, 0, ' bps')} 12 tháng`, 'neg')}
    ${kpi('DXY', nf(lastv(intl.dxy).v, 1), `${sg(yoyAt(intl.dxy, lastv(intl.dxy).d), 1)} YoY · USD/CNY ${nf(lastv(intl.cny).v, 3)}`)}
    ${kpi('Brent', nf(b.v, 1) + ' USD', `${sg(yoyAt(intl.brent, b.d), 0)} YoY · đỉnh 118 (03/2026)`, 'neg')}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'chRates', title: 'Lãi suất Mỹ: Fed funds và lợi suất 10 năm', sub: '%/năm · cuối tháng · EFFR, UST 10Y; thêm TPCP VN 10Y để so mặt bằng', ctl: true,
      insight: `Sau chu kỳ hạ 2024–2025 (EFFR về 3,63%), Fed đảo chiều tăng 25 bps tháng 9/2026. UST 10Y lên <b>${pc(lastv(intl.ust10).v, 2)}</b> — cao nhất trong chuỗi từ 08/2023 — trong khi TPCP VN 10Y chỉ <b>${pc(lastv(intl.vn10).v, 2)}</b>: chênh âm <b>${sg((lastv(intl.vn10).v - lastv(intl.ust10).v) * 100, 0, ' bps')}</b>, giữ USD hấp dẫn hơn VND (R-02).`,
      src: 'WiData 7079, bonds_gov_yield_curve 234521, 234526' })}
    ${card({ id: 'chUsd', title: 'Đồng USD: DXY và USD/CNY', sub: 'Điểm · cuối tháng · trục phải USD/CNY (tăng = CNY mất giá)',
      insight: `DXY ${nf(lastv(intl.dxy).v, 1)} tăng lại từ đáy 96,4 (01/2026) nhưng vẫn thấp hơn đỉnh 108 cuối 2024. CNY mạnh lên liên tục (USD/CNY ${nf(lastv(intl.cny).v, 3)}, thấp nhất kể từ ${(p => p ? mvn(p.d.slice(0, 7)) : 'đầu chuỗi')([...intl.cny].reverse().slice(1).find(p => p.v <= lastv(intl.cny).v))}) — kênh Trung Quốc đang <b>đỡ</b> cho VND (R-08), áp lực đến từ lãi suất Mỹ chứ không từ đồng USD mạnh toàn diện.`,
      src: 'WiData 235028, 235032' })}
  </div>
  ${card({ id: 'chBrent', title: 'Giá dầu Brent', sub: 'USD/thùng · cuối tháng · đường đỏ = ngưỡng +20% YoY của R-06 so với cùng kỳ',
    insight: `Brent <b>${nf(b.v, 1)} USD</b>, ${sg(yoyAt(intl.brent, b.d), 0)} so với cùng kỳ — vượt xa ngưỡng +20% của R-06. Cú sốc tháng 3–4/2026 (118 USD) trùng thời điểm LS huy động 12T NHTM Nhà nước tăng 5,2% → 5,9% và tỷ giá tự do vọt 28.080. CPI VN đang ${pc(lastv(dom.cpi).v, 2)}, CPI bình quân 9T ${pc(lastv(dom.cpiAvg).v, 2)} — sát mục tiêu ~4,5%.`,
    src: 'WiData commodity 203084' })}`;
}
/* ---- Quốc tế theo nước: số liệu public tự cập nhật hằng ngày (data/global-data.js) ---- */
const GD = window.GLOBAL_DATA || { s: {}, ladder: [], taylor: {}, label: {}, src: {} };
const gs = k => GD.s[k] || { d: [], v: [] };
const glast = k => { const x = gs(k); for (let i = x.v.length - 1; i >= 0; i--) if (x.v[i] != null) return { d: x.d[i], v: x.v[i] }; return { d: null, v: null }; };
const gprev = (k, n = 1) => { const x = gs(k); let c = 0; for (let i = x.v.length - 1; i >= 0; i--) if (x.v[i] != null && c++ === n) return x.v[i]; return null; };
const gLab = d => d.length === 7 ? mvn(d) : dvn(d);
function gLines(keys, names, colors, o = {}) {   // nhiều chuỗi → labels hợp nhất theo ngày
  const all = [...new Set(keys.flatMap(k => gs(k).d))].sort().filter(d => !o.from || d >= o.from);
  const maps = keys.map(k => { const x = gs(k), m = {}; x.d.forEach((d, i) => m[d] = x.v[i]); return m; });
  return { labels: all.map(gLab), datasets: keys.map((k, i) => L(names[i], all.map(d => maps[i][d] ?? null), colors[i], Object.assign({ unit: o.unit ?? '%', dp: o.dp ?? 2, spanGaps: true }, (o.ds || [])[i] || {}))) };
}
const GCOUNTRY = [['gl', 'Toàn cầu: lợi suất & lạm phát'], ['us', 'Mỹ'], ['ea', 'Khu vực đồng Euro'], ['jp', 'Nhật Bản'], ['cn', 'Trung Quốc'], ['ov', 'Tổng quan (chuỗi IDX)']];
const gDone = {};
const PAL = ['#1D2678', '#c0392b', '#1f8a8d', '#d9a400', '#861C52', '#4f9bd1', '#7a8291'];
const gsrc = keys => 'Nguồn: ' + [...new Set(keys.map(k => (GD.src[k.replace(/_(yoy|m3|mom|d|m)$/, '')] || '').split(':')[0]).filter(Boolean))].map(x => ({ fred: 'FRED (BLS, BEA, Fed, CBO, Kho bạc Mỹ)', ecb: 'ECB Data Portal', dbn: 'DBnomics (Eurostat, Cục Thống kê Nhật Bản, NBS)', oecd: 'OECD', nbs: 'NBS Trung Quốc qua DBnomics', nyfed: 'NY Fed Markets', hlw: 'NY Fed (Holston–Laubach–Williams)' }[x] || x)).join(' · ') + ` · tự động cập nhật ${dvn((GD.fetched || '').slice(0, 10))}`;
function on3(arr) { const end = arr[arr.length - 1].d, from = new Date(new Date(end).getTime() - 92 * 864e5).toISOString().slice(0, 10); return arr.filter(p => p.d >= from).map(p => p.v); }
function tfPick(id, opts) { return `<div class="picker tf" data-tf="${id}">${opts.map(([k, l], i) => `<button type="button" data-k="${k}" class="${i ? '' : 'on'}">${l}</button>`).join('')}</div>`; }
function wireTf(id, draw) { const box = document.querySelector(`[data-tf="${id}"]`); if (!box) { draw(); return; } const btns = [...box.querySelectorAll('button')]; btns.forEach(b => b.onclick = () => { btns.forEach(x => x.classList.toggle('on', x === b)); draw(b.dataset.k); }); draw(btns[0].dataset.k); }
const TF = [['yoy', 'YoY'], ['m3', '3 tháng quy năm'], ['mom', 'MoM']];

function subIntl(withGl = true) {
  return `<div class="subtabs cty" role="tablist">${GCOUNTRY.filter(([k]) => k !== 'gl').map(([k, l], i) => `<button type="button" data-c="${k}" class="${i ? '' : 'on'}">${l}</button>`).join('')}</div>
  <p class="muted" style="margin:-4px 0 12px">Số liệu quốc tế lấy trực tiếp từ nguồn công bố (FRED, ECB, NY Fed, Cục Thống kê Nhật Bản, NBS, OECD) và tự cập nhật mỗi sáng · lần tải gần nhất ${dvn((GD.fetched || '').slice(0, 10))}${GD.stale && GD.stale.length ? ' · <b>' + GD.stale.length + ' chuỗi dùng bản cũ do lỗi tải</b>' : ''}</p>
  ${GCOUNTRY.filter(([k]) => withGl || k !== 'gl').map(([k]) => `<div class="csub${k === 'us' ? ' on' : ''}" data-cc="${k}"${k === 'gl' ? ' data-book="1"' : ''}>${k === 'ov' ? subIntlOverview() : ({ gl: gGL, us: gUS, ea: gEA, jp: gJP, cn: gCN })[k]()}</div>`).join('')}`;
}
function openC(k) {
  if (k === 'gl') { if (PAGE === 'vimo') show('heat'); return; }
  $$('.cty button').forEach(b => b.classList.toggle('on', b.dataset.c === k));
  $$('.csub[data-cc]').forEach(p => p.classList.toggle('on', p.dataset.cc === k));
  if (!gDone[k]) { gDone[k] = true; ({ gl: drGL, us: drUS, ea: drEA, jp: drJP, cn: drCN, ov: chIntlOverview })[k](); }
}
/* -------- Toàn cầu: lợi suất trái phiếu chính phủ và lạm phát -------- */
const Y10D = [['us_10y_d', 'Mỹ', C.navy], ['de_10y_d', 'Đức', C.gold], ['ea_all_10y_d', 'Khu vực euro (toàn bộ TPCP)', C.tealInk], ['jp_10y_d', 'Nhật Bản', C.red], ['gb_10y_d', 'Anh', C.purple]];
const Y10A = [['us_10y_d', 'Mỹ', C.navy], ['jp_10y_d', 'Nhật Bản', C.red], ['cn_10y_d', 'Trung Quốc', C.gold], ['kr_10y_d', 'Hàn Quốc', C.tealInk], ['tw_10y_d', 'Đài Loan', C.grey], ['sg_10y_d', 'Singapore', '#7a5bb5']];
const Y10M = { eu: [['y10_de_m', 'Đức'], ['y10_fr_m', 'Pháp'], ['y10_it_m', 'Ý'], ['y10_es_m', 'Tây Ban Nha'], ['y10_nl_m', 'Hà Lan'], ['y10_gb_m', 'Anh']],
  ap: [['jp_10y_m', 'Nhật Bản'], ['y10_kr_m', 'Hàn Quốc'], ['y10_au_m', 'Úc'], ['y10_ca_m', 'Canada'], ['us_10y_m', 'Mỹ']] };
const yStart = k => { const x = gs(k), y0 = (gd(k) || '').slice(0, 4); const i = x.d.findIndex(d => d >= y0 + '-01-01'); return i >= 0 ? x.v[i] : null; };
const cpiSer = k => k === 'vn' ? { d: (dom.cpi || []).map(p => p.d.slice(0, 7)), v: (dom.cpi || []).map(p => p.v) } : (() => { const x = gs(k); return { d: x.d.map(d => d.slice(0, 7)), v: x.v }; })();
const qCharts = c => [...(c.charts || []), ...(c.tables || []).filter(t => t === 'cpi').map(() => ({ id: 'gGlCpiBar' }))];   // bảng CPI cũ trong báo cáo → chart
const CPI_SRC = 'Eurostat, BLS, ONS (Anh), Statistics Canada, ABS (Úc), Stats NZ, OECD, BIS, Cục Thống kê Nhật Bản, NBS Trung Quốc, Cục Thống kê Việt Nam';
const CPI_G = { eu: ['Châu Âu', 'Mỹ'], dm: ['Phát triển khác'], ad: ['Châu Á phát triển'], em: ['Châu Á mới nổi'] }, CPI_GC = { 'Châu Âu': C.navy, 'Mỹ': C.purple, 'Phát triển khác': '#4f9bd1', 'Châu Á phát triển': C.tealInk, 'Châu Á mới nổi': C.gold };
const cpiPer = (k, d) => (GD.cpiQ || []).includes(k) ? `Q${Math.ceil(+d.slice(5, 7) / 3)}/${d.slice(0, 4)}` : `T${+d.slice(5, 7)}`;
function cpiRows() {   // [nhóm, khoá, tên, mới nhất, kỳ, cùng kỳ năm trước]
  return (GD.cpiTab || []).flatMap(([g, cs]) => cs.map(([k, n]) => { const x = cpiSer(k); let i = x.v.length - 1; while (i >= 0 && x.v[i] == null) i--; if (i < 0) return null;
    const d = x.d[i], y = (+d.slice(0, 4) - 1) + d.slice(4), j = x.d.indexOf(y); return [g, k, n, x.v[i], d, j >= 0 ? x.v[j] : null]; })).filter(Boolean);
}
function cpiBarIns() {
  const R = cpiRows().sort((a, b) => b[3] - a[3]); if (!R.length) return '';
  const vn = R.find(r => r[1] === 'vn'), up = R.filter(r => r[5] != null && r[3] > r[5]).length, hi3 = R.filter(r => r[3] >= 3).length;
  return `Cao nhất <b>${esc(R[0][2])} ${pc(R[0][3], 1)}</b>, thấp nhất ${esc(R[R.length - 1][2])} ${pc(R[R.length - 1][3], 1)}. <b>${up}/${R.length}</b> nước có lạm phát cao hơn cùng kỳ năm trước; ${hi3} nước từ 3% trở lên.${vn ? ` Việt Nam <b>${pc(vn[3], 2)}</b> (${mvn(vn[4])}), xếp thứ ${R.indexOf(vn) + 1}/${R.length}.` : ''}`
    + how('Lạm phát tăng đồng loạt ở nhiều nước thường đến từ cú sốc chung (giá dầu, giá lương thực, đồng USD mạnh) và khiến các ngân hàng trung ương cùng giữ lãi suất cao; nếu chỉ tăng ở vài nước thì là yếu tố trong nước. Việt Nam lạm phát cao hơn các nước châu Á khác thu hẹp dư địa hạ lãi suất của NHNN.');
}
function cpiGrpIns() {
  const R = cpiRows(); if (!R.length) return '';
  const avg = gs => { const r = R.filter(x => gs.includes(x[0])); return r.length ? r.reduce((a, x) => a + x[3], 0) / r.length : null; };
  const dm = R.filter(x => x[0] === 'Phát triển khác').map(x => `${esc(x[2])} <b>${pc(x[3], 1)}</b> (${cpiPer(x[1], x[4])})`).join(', ');
  return `Bình quân giản đơn mới nhất: châu Âu và Mỹ <b>${pc(avg(CPI_G.eu), 1)}</b>, nhóm Anh, Canada, Úc, New Zealand <b>${pc(avg(CPI_G.dm), 1)}</b>, châu Á phát triển <b>${pc(avg(CPI_G.ad), 1)}</b>, châu Á mới nổi <b>${pc(avg(CPI_G.em), 1)}</b>.${dm ? ` Nhóm phát triển khác: ${dm}; Úc và New Zealand công bố CPI theo quý.` : ''}`;
}
const POL_C = { pol_us: C.navy, pol_xm: C.tealInk, pol_jp: C.red, pol_gb: C.purple, pol_ca: '#b5651d', pol_au: C.gold, pol_nz: '#7cc49b', pol_ch: C.grey, pol_kr: '#4f9bd1' };
function polIns() {
  const T = (GD.polTab || []).filter(t => !t.em); if (!T.length) return '';
  const row = t => { const up = t.prev != null && t.v > t.prev; return `${esc(t.n)} <b>${pc(t.v, 2)}</b>${t.chg ? ` (${up ? 'tăng' : 'giảm'} từ ${pc(t.prev, 2)} ngày ${dvn(t.chg)})` : ''}`; };
  const yUp = T.filter(t => t.y0 != null && t.v > t.y0).length, yDn = T.filter(t => t.y0 != null && t.v < t.y0).length;
  return `Mức hiện tại: ${T.map(row).join('; ')}. Từ đầu năm <b>${yUp} ngân hàng trung ương đã tăng</b>, ${yDn} đã giảm lãi suất.`
    + how('Khi nhiều ngân hàng trung ương cùng tăng lãi suất, nguyên nhân thường là cú sốc lạm phát chung (giá dầu, giá lương thực) chứ không phải yếu tố riêng một nước; mặt bằng lãi suất toàn cầu cao giữ lợi suất trái phiếu và đồng USD ở mức cao, thu hẹp dư địa nới lỏng của NHNN.');
}
function jgbCurveIns() {
  const J = GD.jgbCurve; if (!J) return '';
  const c = n => J.c.find(x => x.n === n), now = c('Hiện tại'), y0 = c('Đầu năm'), y5 = c('5 năm trước'), ix = t => J.t.indexOf(t);
  const ch = (a, t) => a && now ? (now.v[ix(t)] - a.v[ix(t)]) * 100 : null;
  const T = ['2Y', '10Y', '30Y'].filter(t => ix(t) >= 0);
  return `Hiện tại (${dvn(now.d)}): ${T.map(t => `${t} <b>${pc(now.v[ix(t)], 3)}</b>`).join(', ')}. Từ đầu năm: ${T.map(t => `${t} ${sg(ch(y0, t), 0, ' bps')}`).join(', ')}${y5 ? `; so với 5 năm trước: ${T.map(t => `${t} ${sg(ch(y5, t), 0, ' bps')}`).join(', ')}` : ''}.`
    + how('Lợi suất JGB tăng khi BoJ tăng lãi suất và mua ít trái phiếu hơn; kỳ hạn dài còn chịu thêm lo ngại về chi tiêu ngân sách. JGB lợi suất cao hơn khiến nhà đầu tư Nhật bớt mua trái phiếu nước ngoài (trong đó có UST), tạo áp lực lên lợi suất toàn cầu và hỗ trợ đồng yên.');
}
function jgbSlopeIns() {
  const a = glast('jp_s30_10_d'), b = glast('jp_s10_2_d'); if (a.v == null) return '';
  const y0 = k => { const x = gs(k), i = x.d.findIndex(d => d >= a.d.slice(0, 4) + '-01-01'); return i >= 0 ? x.v[i] : null; };
  return `30Y − 10Y <b>${nf(a.v, 0)} bps</b> (đầu năm ${nf(y0('jp_s30_10_d'), 0)}), 10Y − 2Y <b>${nf(b.v, 0)} bps</b> (đầu năm ${nf(y0('jp_s10_2_d'), 0)}) · ${dvn(a.d)}.`;
}
function jgbBtcIns() {
  const S = (GD.jgbAuct || {}).stats; if (!S || !Object.keys(S).length) return 'Đang nạp kết quả đấu thầu.';
  const row = (k) => { const t = S[k]; if (!t) return ''; return `<b>${k}</b> phiên ${dvn(t.d)}: bid-to-cover <b>${nf(t.btc, 2)}</b> (bình quân 5 năm qua ${nf(t.avg5y, 2)}${t.pct5y != null ? `, cao hơn ${t.pct5y}% số phiên` : ''}), tail ${t.tail != null ? nf(t.tail, 1) + ' bps' : '–'} (bình quân ${t.tail5y != null ? nf(t.tail5y, 1) + ' bps' : '–'})`; };
  return ['10Y', '20Y', '30Y', '40Y'].map(row).filter(Boolean).join('. ') + '.'
    + how('Phiên yếu (bid-to-cover thấp hơn bình quân, tail lớn) cho thấy nhà đầu tư chỉ mua khi được giảm giá, thường đẩy lợi suất kỳ hạn đó tăng ngay trong ngày; với JGB kỳ hạn siêu dài (20Y–40Y), cầu phụ thuộc lớn vào công ty bảo hiểm nhân thọ.');
}
function btcIns() {
  const S = (GD.btc || {}).stats; if (!S) return '';
  const row = (k, n) => { const t = S[k]; if (!t) return ''; const up = t.btc >= t.avg5y;
    return `<b>${n}</b> phiên ${dvn(t.d)}: <b>${nf(t.btc, 2)}</b> lần, ${up ? 'cao hơn' : 'thấp hơn'} bình quân 5 năm qua ${nf(t.avg5y, 2)} (cao hơn ${t.pct5y}% số phiên trong 5 năm qua); indirect ${pc(t.ind, 0)} so với bình quân ${pc(t.ind5y, 0)}, đại lý sơ cấp phải nhận ${pc(t.pd, 0)} so với ${pc(t.pd5y, 0)}`; };
  const av = k => S[k] ? nf(S[k].avg5y, 2) : '–';
  return `Bid-to-cover = tổng tiền nhà đầu tư đặt mua chia cho lượng Kho bạc bán ra; 2,5 nghĩa là cứ 1 USD trái phiếu chào bán có 2,5 USD đặt mua. Bình quân 5 năm qua: 2Y ${av('2Y')}, 5Y ${av('5Y')}, 10Y ${av('10Y')}, 30Y ${av('30Y')}. Hai dấu hiệu đi kèm: tỷ trọng người mua indirect cao và phần đại lý sơ cấp (primary dealer — các ngân hàng có nghĩa vụ mua phần còn thừa) thấp nghĩa là trái phiếu được nhà đầu tư cuối cùng mua thật, không phải dồn vào kho của đại lý. `
    + [row('10Y', '10Y'), row('30Y', '30Y'), row('5Y', '5Y')].filter(Boolean).join('. ') + '.'
    + how('Phiên đấu thầu yếu (bid-to-cover thấp hơn bình quân, đại lý sơ cấp phải nhận nhiều) thường đẩy lợi suất lên ngay trong ngày vì thị trường hiểu là cầu không theo kịp lượng phát hành; phiên mạnh cho thấy ở mức lợi suất đó đã có người mua sẵn sàng, giúp lợi suất khó tăng thêm.');
}
const PMI_K = [['us_ism_mfg', 'Mỹ (ISM)', C.navy], ['ea_pmi_mfg', 'Khu vực euro', C.tealInk], ['de_pmi_mfg', 'Đức', C.grey], ['cn_pmi_mfg', 'Trung Quốc (NBS)', C.gold], ['vn_pmi', 'Việt Nam', C.red]];
function pmiIns() {
  const r = PMI_K.map(([k, n]) => [n, glast(k)]).filter(([, l]) => l.v != null); if (!r.length) return '';
  const up = r.filter(([, l]) => l.v >= 50).map(([n]) => n), ch = k => { const x = gs(k); const n = x.v.length; return n > 3 ? x.v[n - 1] - x.v[n - 4] : null; };
  const vn = glast('vn_pmi');
  return `${r.map(([n, l]) => `${n} <b>${nf(l.v, 1)}</b>`).join(', ')} (${mvn(r[0][1].d)}). ${up.length ? `Đang mở rộng: ${up.join(', ')}.` : 'Tất cả đang thu hẹp.'}${vn.v != null ? ` PMI Việt Nam ${sg(ch('vn_pmi'), 1, ' điểm')} trong 3 tháng.` : ''}`
    + how('PMI là số liệu sớm nhất của mỗi tháng. PMI Mỹ, châu Âu và Trung Quốc cùng trên 50 là cầu hàng hoá toàn cầu đang mạnh lên, có lợi cho xuất khẩu và sản xuất của Việt Nam; PMI Việt Nam giảm dưới 50 thường đi trước số xuất khẩu và tăng trưởng tín dụng doanh nghiệp yếu đi.');
}
function fedMatIns() {
  const M = GD.fedMat; if (!M) return ''; const n = M.d.length - 1, v = k => M.m[k][n], t = Object.keys(M.m).reduce((a, k) => a + v(k), 0), y1 = v('≤15 ngày') + v('16–90 ngày') + v('91 ngày–1 năm');
  const b = n >= 13 ? Object.keys(M.m).reduce((a, k) => a + M.m[k][n - 13], 0) : null;
  return `${dvn(M.d[n])}: Fed nắm <b>${nf(t, 0)} tỷ USD</b> UST, trong đó <b>${nf(y1, 0)} tỷ</b> (${pc(y1 / t * 100, 0)}) đáo hạn trong 1 năm, ${nf(v('Trên 10 năm'), 0)} tỷ trên 10 năm.${b ? ` So với 13 tuần trước: ${sg(t - b, 0, ' tỷ')}.` : ''}`
    + how('Phần đáo hạn ngắn càng lớn thì Fed càng dễ điều chỉnh tốc độ thu hẹp bảng cân đối (QT) chỉ bằng việc không tái đầu tư; Fed chuyển dần danh mục sang tín phiếu ngắn hạn cũng làm giảm áp lực lên lợi suất dài hạn.');
}
function fedRepoIns() {
  const R = GD.fedRepo; if (!R) return ''; const n = R.d.length - 1, mx = (a, w) => Math.max(...a.slice(-w));
  return `${dvn(R.d[n])}: repo FIMA <b>${nf(R.fima[n], 1)} tỷ USD</b>, SRF <b>${nf(R.srf[n], 1)} tỷ USD</b>. Cao nhất 52 tuần: FIMA ${nf(mx(R.fima, 52), 1)} tỷ, SRF ${nf(mx(R.srf, 52), 1)} tỷ.`
    + how('FIMA cho ngân hàng trung ương nước ngoài vay USD bằng cách cầm cố UST thay vì bán ra thị trường; dùng nhiều là dấu hiệu thiếu USD ngoài nước Mỹ. SRF là cửa vay cuối cùng của ngân hàng Mỹ; số dư tăng khi lãi suất repo thị trường vượt trần, cho thấy dự trữ đã gần mức tối thiểu.');
}
function usSurveyIns() {
  const m = glast('us_ism_mfg'), sv = glast('us_ism_svc'), u = glast('us_umcsent');
  return `PMI sản xuất ISM <b>${nf(m.v, 1)}</b>, dịch vụ <b>${nf(sv.v, 1)}</b> (${mvn(m.d)}); niềm tin tiêu dùng ĐH Michigan <b>${nf(u.v, 1)}</b> (${mvn(u.d)}).`
    + how('Doanh nghiệp mở rộng (PMI trên 50) trong khi niềm tin hộ gia đình thấp là dấu hiệu tăng trưởng dựa vào đầu tư và nhóm thu nhập cao; niềm tin tiêu dùng thấp kéo dài thường đi trước chi tiêu yếu đi.');
}
function usInfExpIns() {
  const e1 = glast('us_mich'), e5 = glast('us_mich5'), c = glast('us_cpi_yoy');
  return `Kỳ vọng lạm phát 1 năm <b>${pc(e1.v, 1)}</b>, 5–10 năm <b>${pc(e5.v, 1)}</b> (${mvn(e1.d)}); CPI thực tế ${pc(c.v, 1)} (${mvn(c.d)}).`
    + how('Kỳ vọng dài hạn (5–10 năm) là thước đo Fed theo dõi để biết lạm phát có "neo" hay không; kỳ vọng dài hạn tăng lên trên 3% là rủi ro lạm phát ngấm vào đòi hỏi tiền lương, khiến Fed khó hạ lãi suất.');
}
const LNH_T = [['ON', 'Qua đêm', C.navy], ['1W', '1 tuần', C.blue], ['1M', '1 tháng', C.tealInk], ['3M', '3 tháng', C.gold], ['6M', '6 tháng', C.purple], ['9M', '9 tháng', C.red]];
function lnhIns() {
  const X = dom.lnh; if (!X) return ''; const l = t => (X[t] || []).slice(-1)[0], b = (t, n) => { const a = X[t] || []; return a[Math.max(0, a.length - 1 - n)]; };
  const ch = t => l(t) && b(t, 5) ? (l(t).v - b(t, 5).v) * 100 : null;
  return `${dvn(l('ON').d)}: ${LNH_T.map(([t, n]) => `${n} <b>${pc(l(t) && l(t).v, 2)}</b>`).join(', ')}. So với 5 phiên trước: qua đêm ${sg(ch('ON'), 0, ' bps')}, 3 tháng ${sg(ch('3M'), 0, ' bps')}, 6 tháng ${sg(ch('6M'), 0, ' bps')}, 9 tháng ${sg(ch('9M'), 0, ' bps')}.`
    + how('Chi phí vốn trên TT2 không chỉ là qua đêm: ngân hàng thiếu vốn kỳ hạn phải vay 3–9 tháng, và mức này cao hơn nhiều so với lãi suất OMO 4,5%. Kỳ hạn dài giảm mới là dấu hiệu chi phí vốn liên ngân hàng hạ thật; khối lượng giao dịch kỳ hạn dài nhỏ nên số dao động mạnh.');
}
function omoOutIns() {
  const O = dom.omoOut || []; if (!O.length) return ''; const l = O[O.length - 1], mx = O.filter(p => p.d >= (+l.d.slice(0, 4) - 1) + l.d.slice(4)).reduce((m, p) => p.v > m.v ? p : m);
  const w = O.find(p => p.d >= new Date(new Date(l.d) - 30 * 864e5).toISOString().slice(0, 10)) || O[0];
  return `${dvn(l.d)}: OMO lưu hành <b>${nf(l.v / 1000, 1)} nghìn tỷ</b>, ${sg((l.v - w.v) / 1000, 1, ' nghìn tỷ')} trong 1 tháng; đỉnh 12 tháng ${nf(mx.v / 1000, 1)} nghìn tỷ (${dvn(mx.d)}).`
    + how('OMO lưu hành là lượng tiền NHNN đang cho ngân hàng vay có kỳ hạn qua thị trường mở. Lãi suất liên ngân hàng giảm trong lúc OMO lưu hành cũng giảm thì thanh khoản cải thiện không đến từ NHNN bơm tiền mà từ nguồn khác (tiền gửi Kho bạc, mua ngoại tệ, cầu vốn giảm).');
}
function gGL() {
  const u = glast('us_10y_d'), de = glast('de_10y_d'), jp = glast('jp_10y_d'), ea = glast('ea_all_10y_d'), gb = glast('gb_10y_d'), w = glast('us_wti_d');
  const ytd = k => { const a = glast(k).v, b = yStart(k); return a != null && b != null ? (a - b) * 100 : null; };
  return `<div class="kpis">
    ${kpi('UST 10 năm', pc(u.v, 2), `${sg(ytd('us_10y_d'), 0, ' bps')} từ đầu năm · ${dvn(u.d)}`, ytd('us_10y_d') > 0 ? 'neg' : '')}
    ${kpi('Bund Đức 10 năm', pc(de.v, 2), `${sg(ytd('de_10y_d'), 0, ' bps')} từ đầu năm · ${dvn(de.d)}`, ytd('de_10y_d') > 0 ? 'neg' : '')}
    ${kpi('TPCP khu vực euro 10 năm', pc(ea.v, 2), `${sg(ytd('ea_all_10y_d'), 0, ' bps')} từ đầu năm · ECB`)}
    ${kpi('JGB 10 năm', pc(jp.v, 3), `${sg(ytd('jp_10y_d'), 0, ' bps')} từ đầu năm · ${dvn(jp.d)}`, ytd('jp_10y_d') > 0 ? 'neg' : '')}
    ${gb.v != null ? kpi('Gilt Anh 10 năm', pc(gb.v, 2), `${sg(ytd('gb_10y_d'), 0, ' bps')} từ đầu năm · ${dvn(gb.d)}`, ytd('gb_10y_d') > 0 ? 'neg' : '') : (gm => kpi('Gilt Anh 10 năm', pc(gm.v, 2), `bình quân tháng ${mvn(gm.d)}`))(glast('y10_gb_m'))}
    ${kpi('Dầu WTI', nf(w.v, 1) + ' USD', `${dvn(w.d)} · Brent ${nf(glast('us_brent_d').v, 1)}`)}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'gGlY10', title: 'Lợi suất TPCP 10 năm theo ngày: Mỹ, Đức, khu vực euro, Nhật, Anh', h: 'tall', sub: 'chọn: mức lợi suất · chỉ số (phiên đầu năm = 1, như slide) · thay đổi từ đầu năm (bps)', body: tfPick('glY', [['chg', 'Thay đổi từ đầu năm (bps)'], ['idx', 'Chỉ số đầu năm = 1'], ['lvl', 'Mức %']]), src: 'U.S. Treasury; Deutsche Bundesbank; ECB (đường cong lợi suất khu vực euro); Bộ Tài chính Nhật Bản; Ngân hàng Trung ương Anh' })}
    ${card({ id: 'gGlAsia', title: 'Lợi suất TPCP 10 năm châu Á theo ngày: Trung Quốc, Đài Loan, Hàn Quốc, Singapore, Nhật (so với Mỹ)', h: 'tall', sub: 'chọn: thay đổi từ đầu năm (bps) · chỉ số đầu năm = 1 · mức %', body: tfPick('glA', [['chg', 'Thay đổi từ đầu năm (bps)'], ['idx', 'Chỉ số đầu năm = 1'], ['lvl', 'Mức %']]), src: 'ChinaBond (Trung Quốc); Sở Giao dịch Đài Bắc TPEx (Đài Loan); Ngân hàng Trung ương Hàn Quốc (ECOS); MAS (Singapore); Bộ Tài chính Nhật Bản; U.S. Treasury' })}
    ${card({ id: 'gGlY10m', title: 'Lợi suất 10 năm theo tháng: châu Âu và các nước phát triển khác', h: 'tall', sub: '%/năm, bình quân tháng · ECB (lãi suất dài hạn hội tụ) và OECD', body: tfPick('glM', [['eu', 'Châu Âu'], ['ap', 'Mỹ, Nhật, Hàn, Úc, Canada']]), src: 'ECB; OECD qua FRED' })}
    ${card({ id: 'gGlCurve', title: 'Đường cong lợi suất TPCP Mỹ', h: 'tall', sub: '%/năm theo kỳ hạn · hiện tại so với 1 tháng trước, đầu năm và 1 năm trước', src: 'U.S. Treasury (Daily Treasury Par Yield Curve)' })}
    ${card({ id: 'gGlOil', title: 'Giá dầu WTI và Brent theo ngày', h: 'tall', sub: 'USD/thùng · giá giao ngay', src: 'EIA qua FRED' })}
    ${card({ id: 'gGlCpi', title: 'Lạm phát CPI các nước theo nhóm', h: 'tall', sub: '% so cùng kỳ, theo tháng · chọn nhóm nước', body: tfPick('glC', [['eu', 'Châu Âu và Mỹ'], ['dm', 'Anh, Canada, Úc, NZ'], ['ad', 'Châu Á phát triển'], ['em', 'Châu Á mới nổi']]), insight: cpiGrpIns(), src: CPI_SRC })}
    ${card({ id: 'gGlCpiBar', title: 'Lạm phát CPI mới nhất theo nước', h: 'tall', sub: '% so cùng kỳ · cột = tháng mới nhất của từng nước, chấm = cùng kỳ năm trước · màu theo nhóm nước', insight: cpiBarIns(), src: CPI_SRC })}
    ${card({ id: 'gGlPol', title: 'Lãi suất điều hành các ngân hàng trung ương phát triển', h: 'tall', sub: '%/năm, mức cuối tháng · Fed: cận trên biên độ; ECB: lãi suất tiền gửi', insight: polIns(), src: 'BIS (Central bank policy rates); Fed; ECB' })}
    ${card({ id: 'gGlPmi', title: 'PMI sản xuất các nền kinh tế lớn và Việt Nam', h: 'tall', sub: 'điểm · trên 50 = mở rộng, dưới 50 = thu hẹp · Mỹ: ISM; khu vực euro, Đức: HCOB/S&P Global; Trung Quốc: NBS; Việt Nam: S&P Global', insight: pmiIns(), src: 'ISM, S&P Global, HCOB, NBS Trung Quốc' })}
  </div>`;
}
function drGL() {
  const drY = (id, list, from) => k => {
    const ks = list.filter(([kk]) => gs(kk).v.length);
    const all = [...new Set(ks.flatMap(([kk]) => gs(kk).d))].sort().filter(d => d >= from);
    const ds = ks.map(([kk, n, c]) => { const x = gs(kk), m = {}; x.d.forEach((d, i) => m[d] = x.v[i]); const b = yStart(kk);
      return L(n, all.map(d => m[d] == null ? null : k === 'idx' ? +(m[d] / b).toFixed(4) : k === 'chg' ? +((m[d] - b) * 100).toFixed(1) : m[d]), c, { unit: k === 'chg' ? ' bps' : k === 'idx' ? '' : '%', dp: k === 'idx' ? 3 : k === 'chg' ? 0 : 3, spanGaps: true }); });
    mk(id, { type: 'line', data: { labels: all.map(dvn), datasets: ds }, options: { plugins: { refLines: { lines: k === 'lvl' ? [] : [{ value: k === 'idx' ? 1 : 0, label: '' }] } }, scales: { y: k === 'lvl' ? pctAxis('') : numAxis(k === 'chg' ? 'bps' : '', { beginAtZero: false, ticks: { callback: v => nf(v, k === 'idx' ? 2 : 0) } }) } } });
  };
  wireTf('glY', drY('gGlY10', Y10D, '2021-01-01'));
  wireTf('glA', drY('gGlAsia', Y10A, '2021-01-01'));
  wireTf('glM', k => { const S = Y10M[k || 'eu'].filter(([kk]) => gs(kk).v.length); mk('gGlY10m', { type: 'line', data: gLines(S.map(x => x[0]), S.map(x => x[1]), PAL2, { from: '2021-01', dp: 2 }), options: { scales: { y: pctAxis('') } } }); });
  const UC = GD.ustCurve; if (UC) mk('gGlCurve', { type: 'line', data: { labels: UC.t, datasets: UC.c.map((c, i) => L(`${c.n} (${dvn(c.d)})`, c.v, [C.navy, C.teal, C.tealInk, C.red, C.grey][i] || C.grey, { pointRadius: 3, borderWidth: i ? 1.6 : 2.6, borderDash: i === 1 ? [2, 2] : i === 4 ? [4, 3] : [], dp: 2 })) }, options: { scales: { y: pctAxis('', { beginAtZero: false }) } } });
  mk('gGlOil', { type: 'line', data: gLines(['us_wti_d', 'us_brent_d'], ['WTI', 'Brent'], [C.navy, C.gold], { unit: ' USD', dp: 2, from: '2021-01-01' }), options: { scales: { y: numAxis('USD/thùng', { beginAtZero: false }) } } });
  { const T = (GD.polTab || []).filter(t => !t.em && gs(t.k + '_m').v.length);
    mk('gGlPol', { type: 'line', data: gLines(T.map(t => t.k + '_m'), T.map(t => t.n), T.map(t => POL_C[t.k] || C.grey), { from: '2021-01', dp: 2, ds: T.map(t => ({ stepped: true, borderWidth: ['pol_us', 'pol_xm', 'pol_jp'].includes(t.k) ? 2.4 : 1.6 })) }), options: { scales: { y: pctAxis('') } } }); }
  mk('gGlPmi', { type: 'line', data: gLines(PMI_K.map(x => x[0]), PMI_K.map(x => x[1]), PMI_K.map(x => x[2]), { unit: '', dp: 1, from: '2021-01', ds: { borderWidth: 1.8 } }), options: { scales: { y: numAxis('điểm', { beginAtZero: false }) }, plugins: { refLines: { lines: [{ value: 50, label: '50', color: C.grey }] } } } }, { win: 36 });
  wireTf('glC', k => { const gs_ = CPI_G[k || 'eu'], cs = (GD.cpiTab || []).filter(([g]) => gs_.includes(g)).flatMap(([, c]) => c);
    const sers = cs.map(([kk, n]) => [n, cpiSer(kk)]).filter(([, x]) => x.v.length), all = [...new Set(sers.flatMap(([, x]) => x.d))].filter(d => d >= '2021-01').sort();
    mk('gGlCpi', { type: 'line', data: { labels: all.map(mvn), datasets: sers.map(([n, x], i) => { const m = {}; x.d.forEach((d, j) => m[d] = x.v[j]); return L(n, all.map(d => m[d] ?? null), n === 'Việt Nam' ? C.red : n === 'Mỹ' ? C.navy : PAL2[(i + 2) % PAL2.length], { borderWidth: n === 'Việt Nam' || n === 'Mỹ' || /Euro/.test(n) ? 2.6 : 1.6, dp: 1, spanGaps: true }); }) },
      options: { scales: { y: pctAxis('') }, plugins: { refLines: { lines: [{ value: 2, label: '2%', color: C.grey }] } } } }); });
  { const R = cpiRows().sort((a, b) => b[3] - a[3]);
    mk('gGlCpiBar', { type: 'bar', data: { labels: R.map(r => `${r[2]} (${cpiPer(r[1], r[4]).replace(/\/\d{4}$/, '')})`), datasets: [
      { label: 'Mới nhất', data: R.map(r => r[3]), grouped: false, backgroundColor: R.map(r => r[1] === 'vn' ? C.red : CPI_GC[r[0]] || C.grey), dp: 1, unit: '%', order: 2 },
      { type: 'line', label: 'Cùng kỳ năm trước', data: R.map(r => r[5]), showLine: false, pointRadius: 4, pointStyle: 'circle', backgroundColor: '#fff', borderColor: '#1f2433', pointBorderWidth: 1.5, dp: 1, unit: '%', order: 1 },
      ...[['Châu Âu', C.navy], ['Mỹ', C.purple], ['Phát triển khác', '#4f9bd1'], ['Châu Á phát triển', C.tealInk], ['Châu Á mới nổi', C.gold], ['Việt Nam', C.red]].map(([g, c]) => ({ label: g, data: [], backgroundColor: c, order: 3 }))] },
      options: { indexAxis: 'y', interaction: { mode: 'index', intersect: false, axis: 'y' }, plugins: { legend: { labels: { filter: it => it.text !== 'Mới nhất' } }, refLines: { lines: [{ value: 2, axis: 'x', label: '', color: C.grey }] } }, scales: { x: pctAxis(''), y: { ticks: { autoSkip: false, font: { size: 11 } }, grid: { display: false } } } } }); }
}
/* -------- Mỹ -------- */
function gUS() {
  const t = GD.taylor || {}, tl = k => (t[k] && t[k].v.length) ? t[k].v[t[k].v.length - 1] : null;
  const up = glast('us_fedtgt_up_d'), lo = glast('us_fedtgt_lo_d');
  const lad = GD.ladder || [];
  const st = r => { const v = r.v; const m = { us_rrp: v < 50 ? ['risk', 'Cạn đệm'] : v > 1000 ? ['ok', 'Thừa'] : ['watch', 'Trung tính'], tgcr_iorb: v >= 0 ? ['risk', 'Khát vốn'] : v < -7 ? ['ok', 'Thừa'] : ['watch', 'Trung tính'],
    sofr_iorb: v > 0 ? ['risk', 'Tắc nghẽn'] : ['ok', 'Bình thường'], sofr99_iorb: v > 10 ? ['risk', 'Căng'] : v > 5 ? ['watch', 'Theo dõi'] : ['ok', 'Bình thường'], us_repo: v > 1 ? ['risk', 'Đang dùng'] : ['ok', 'Bình thường'],
    us_reserves: v < 2800 ? ['risk', 'Sát ngưỡng'] : v < 3000 ? ['watch', 'Vừa đủ'] : ['ok', 'Dồi dào'], bills4w: v > 0 ? ['watch', 'Đang bơm'] : ['ok', 'QT'] }[r.k] || ['', '']; return `<span class="pill ${m[0]}">${m[1]}</span>`; };
  return `<div class="kpis">
    ${kpi('Lãi suất Fed', `${nf(lo.v, 2)}–${nf(up.v, 2)}%`, `EFFR ${pc(glast('us_effr_d').v, 2)} · IORB ${pc(glast('us_iorb_d').v, 2)}`)}
    ${kpi('Taylor V1 (PCE lõi)', pc(tl('v1'), 2), `trimmed ${pc(tl('v1_trim'), 2)} · FFR ${pc(tl('ffr'), 2)}`, tl('v1') - tl('ffr') > 0.5 ? 'neg' : '')}
    ${kpi('CPI', pc(glast('us_cpi_yoy').v, 2), `lõi ${pc(glast('us_cpi_core_yoy').v, 2)} · ${mvn(glast('us_cpi_yoy').d)}`, glast('us_cpi_yoy').v > 3 ? 'neg' : '')}
    ${kpi('PCE lõi', pc(glast('us_pce_core_yoy').v, 2), `supercore ${pc(glast('us_pce_supercore_yoy').v, 2)} · ${mvn(glast('us_pce_core_yoy').d)}`, 'neg')}
    ${kpi('Thất nghiệp', pc(glast('us_unrate').v, 1), `NFP ${sg(glast('us_payems_chg').v, 0, ' nghìn')} · ${mvn(glast('us_unrate').d)}`)}
    ${(() => { const br = glast('us_brent_d'), x = gs('us_brent_d'), i0 = x.d.findIndex(d => d >= (br.d || '').slice(0, 4) + '-01-01'), b0 = i0 >= 0 ? x.v[i0] : null;
      return kpi('Giá dầu Brent', nf(br.v, 1) + ' USD', `${b0 ? sg((br.v / b0 - 1) * 100, 0) + ' từ đầu năm · ' : ''}WTI ${nf(glast('us_wti_d').v, 1)} · ${dvn(br.d)}`, b0 && br.v > b0 * 1.2 ? 'neg' : ''); })()}
  </div>
  <h3 class="sec2">Lãi suất Fed và kỳ vọng lãi suất</h3>
  ${fedWatchCard()}
  <div class="grid g2 gap">
  ${card({ id: 'gUsRates', title: 'Lợi suất TPCP Mỹ và lãi suất Fed', sub: '%/năm, theo ngày · EFFR, 2 năm, 10 năm', src: gsrc(['us_10y']) })}
    ${card({ id: 'gUsTaylor', title: 'Quy tắc Taylor so với lãi suất Fed thực tế', h: 'tall', sub: `i* = r* + π + 0,5(π − 2) + 0,5 × độ lệch sản lượng · V1: lệch GDP (CBO) · V2: lệch thất nghiệp × (−2) (Okun) · r* = HLW (NY Fed)`, body: tfPick('usTay', [['core', 'π = PCE lõi'], ['trim', 'π = PCE trimmed mean']]), insight: '<span id="gTayIns"></span>', src: gsrc(['us_pce_core', 'us_rstar', 'us_gdp']) })}
  </div>
  <h3 class="sec2">Thanh khoản hệ thống ngân hàng Mỹ</h3>
  ${card({ id: 'gUsSpr', title: 'Áp lực thị trường repo', h: 'tall', sub: 'bps, theo ngày · SOFR, TGCR và SOFR phân vị 99 so với IORB · trên 0 = tiền qua đêm đắt hơn lãi Fed trả cho dự trữ', src: gsrc(['us_sofr', 'us_sofr99']) })}
  <article class="card"><h3 class="sub">Bậc thang thanh khoản hệ thống ngân hàng Mỹ</h3><p class="chart-sub">①–② đo độ thừa tiền → ③–④ áp lực giá → ⑤–⑦ phản ứng của Fed · cột "Kỳ trước" = 5 phiên/tuần trước</p>
    <div class="tscroll"><table><thead><tr><th>Chỉ báo</th><th class="n">Mới nhất</th><th class="n">Kỳ trước</th><th>Ngưỡng tham chiếu</th><th>Trạng thái</th><th>Ngày</th></tr></thead><tbody>
    ${lad.map(r => `<tr><td><b>${esc(r.n)}</b></td><td class="n">${nf(r.v, 1)} ${r.u}</td><td class="n">${r.p == null ? '—' : nf(r.p, 1)}</td><td class="muted">${esc(r.ref)}</td><td>${st(r)}</td><td>${dvn(r.d)}</td></tr>`).join('')}</tbody></table></div>
    <div class="src">${gsrc(['us_rrp', 'us_sofr99', 'us_walcl'])}</div></article>
  ${gUSFlow()}
  <h3 class="sec2">Lạm phát</h3>
  <div class="grid g2 gap">
    ${card({ id: 'gUsCpi', title: 'CPI: tổng, lõi và supercore', sub: 'supercore = dịch vụ trừ nhà ở (CUSR0000SASL2RS) · chọn YoY / 3 tháng quy năm / MoM', body: tfPick('usCpi', TF), src: gsrc(['us_cpi']) })}
    ${card({ id: 'gUsCpiC', title: 'CPI theo cấu phần', sub: 'YoY · nhà ở (shelter), hàng hóa lõi, dịch vụ trừ năng lượng, năng lượng, lương thực', body: tfPick('usCpiC', TF), src: gsrc(['us_cpi']) })}
    ${card({ id: 'gUsPce', title: 'PCE: tổng, lõi, supercore và trimmed mean', sub: 'thước đo lạm phát Fed theo dõi · supercore = dịch vụ trừ năng lượng và nhà ở (IA001260M) · trimmed mean của Dallas Fed chỉ có YoY', body: tfPick('usPce', TF), src: gsrc(['us_pce', 'us_pce_trim']) })}
    ${card({ id: 'gUsPpi', title: 'PPI: cầu cuối cùng, lõi, trung gian, thô', sub: 'chuỗi dẫn dắt của CPI hàng hóa · lõi = trừ thực phẩm, năng lượng, dịch vụ thương mại', body: tfPick('usPpi', TF), src: gsrc(['us_ppi_fd']) })}
  </div>
  ${GD.pceC ? card({ id: 'gUsPceC', title: 'Đóng góp vào lạm phát PCE: hàng hoá và dịch vụ', h: 'tall', sub: 'điểm % · cột chồng = đóng góp từng nhóm, đường = tổng · nhà ở, dịch vụ lõi trừ nhà ở, hàng hoá lõi, lương thực & năng lượng', body: tfPick('usPceC', [['yoy', 'PCE tổng · YoY'], ['mom', 'PCE tổng · theo tháng'], ['core', 'PCE lõi · YoY'], ['super', 'Supercore theo ngành · YoY']]), src: 'Fed San Francisco (tính từ số liệu chi tiết PCE của BEA)' }) : ''}
  <h3 class="sec2">Việc làm</h3>
  ${card({ id: 'gUsJobs', title: 'Thị trường lao động', h: 'tall', sub: 'cột = việc làm phi nông nghiệp tăng thêm (nghìn) · đường = tỷ lệ thất nghiệp (trục phải)', src: gsrc(['us_payems']) })}
  <h3 class="sec2">Khảo sát doanh nghiệp và hộ gia đình</h3>
  <div class="grid g2 gap">
  ${card({ id: 'gUsSurvey', title: 'PMI ISM và niềm tin tiêu dùng', h: 'tall', sub: 'PMI: trên 50 = mở rộng (trục trái) · niềm tin tiêu dùng ĐH Michigan (trục phải, 1966 = 100)', insight: usSurveyIns(), src: 'ISM; Đại học Michigan (qua FRED)' })}
  ${card({ id: 'gUsInfExp', title: 'Kỳ vọng lạm phát của hộ gia đình so với CPI', h: 'tall', sub: '% · kỳ vọng 1 năm và 5–10 năm (khảo sát ĐH Michigan) so với CPI thực tế so cùng kỳ', insight: usInfExpIns(), src: 'Đại học Michigan (qua FRED); BLS' })}
  </div>`;
}
/* ---- Kỳ vọng lãi suất Fed theo phiên FOMC (phương pháp CME FedWatch, tính từ giá ZQ) ---- */
function fedWatchCard(o = {}) {
  const F = GD.fedwatch; if (!F || !F.meetings || !F.meetings.length) return '';
  const M = F.meetings, [lo, up] = F.target, cur = `${lo.toFixed(2)}-${up.toFixed(2)}`;
  const keys = [...new Set(M.flatMap(m => Object.keys(m.probs)))].sort((a, b) => parseFloat(a) - parseFloat(b));
  const rl = k => k.split('-').map(v => nf(+v, 2)).join('–');
  const above = m => Object.entries(m.probs).filter(([k]) => parseFloat(k) > lo).reduce((a, [, p]) => a + p, 0);
  const below = m => Object.entries(m.probs).filter(([k]) => parseFloat(k) < lo).reduce((a, [, p]) => a + p, 0);
  const top = m => Object.entries(m.probs).sort((a, b) => b[1] - a[1])[0];
  const n0 = M[0], t0 = top(n0), lastM = M[M.length - 1], dec = M.filter(m => m.date.slice(0, 4) === n0.date.slice(0, 4)).pop() || n0;
  const pm3 = o => { const k = o && o.p; if (!k) return null; const g = re => Object.entries(k).filter(([l]) => re.test(l)).reduce((a, [, p]) => a + p, 0);
    return { cut: g(/cut|decrease/i), hold: g(/hold|maintain|unchanged|no change/i), hike: g(/hike|raise|increase/i) }; };
  const fmt3 = o => o ? `giảm ${nf(o.cut, 0)} · giữ ${nf(o.hold, 0)} · tăng ${nf(o.hike, 0)}` : '—';
  const kal = m => fmt3(pm3(m.kalshi)), poly = m => fmt3(pm3(m.poly));
  const yrs = [...new Set(M.map(m => m.date.slice(0, 4)))];
  const W = (F.mpt && F.mpt.windows) || [], D = (F.dots || {}).FEDTARMD || {}, LR = Object.values((F.dots || {}).FEDTARMDLR || {}).pop();
  const cmpTbl = () => `<p class="chart-sub" style="margin-top:12px"><b>Đối chiếu mức lãi suất cuối năm theo từng nguồn</b> (%/năm)</p><div class="tscroll"><table><thead><tr><th>Mốc</th><th class="n">Từ giá ZQ (phương pháp FedWatch)</th><th class="n">Atlanta Fed MPT (quyền chọn SOFR) · bình quân [25–75%]</th><th class="n">Dot plot FOMC (trung vị)</th></tr></thead><tbody>
    ${yrs.map(y => { const lm = M.filter(m => m.date.slice(0, 4) === y).pop(); const w = W.filter(x => x.start >= lm.date).sort((a, b) => a.start.localeCompare(b.start))[0];
      return `<tr><td>Sau phiên ${dvn(lm.date)}</td><td class="n">${nf(lm.exp_rate, 2)}</td><td class="n">${w ? `${nf(w.mean, 2)} [${nf(w.p25, 2)}–${nf(w.p75, 2)}] · cửa sổ từ ${dvn(w.start)}` : '—'}</td><td class="n">${D[y] != null ? nf(D[y], 2) : '—'}</td></tr>`; }).join('')}
    ${LR != null ? `<tr><td>Dài hạn</td><td class="n">—</td><td class="n">—</td><td class="n">${nf(LR, 2)}</td></tr>` : ''}
    </tbody></table></div><p class="chart-sub">ZQ: giá hợp đồng tương lai lãi suất quỹ liên bang 30 ngày, điểm giữa khoảng bình quân theo xác suất. MPT: SOFR bình quân 3 tháng (thường thấp hơn EFFR vài bps)${F.mpt ? `, số ngày ${dvn(F.mpt.date)}` : ''}. Dot plot: trung vị dự báo của thành viên FOMC tại kỳ SEP gần nhất.</p>`;
  const ins = `Phiên ${dvn(n0.date)}: khả năng cao nhất là khoảng <b>${rl(t0[0])}%</b> (<b>${nf(t0[1], 1)}%</b>)${t0[0] === cur ? ' — giữ nguyên' : ''}; xác suất tăng <b>${nf(above(n0), 1)}%</b>, giảm ${nf(below(n0), 1)}%.`
    + ` Đến phiên ${dvn(dec.date)}, tổng xác suất lãi suất cao hơn mức hiện hành ${rl(cur)}% là <b>${nf(above(dec), 1)}%</b>; đến ${dvn(lastM.date)} mức kỳ vọng (điểm giữa, bình quân theo xác suất) là <b>${nf(lastM.exp_rate, 2)}%</b> so với ${nf((lo + up) / 2, 3)}% hiện nay.`
    + (n0.kalshi || n0.poly ? ` Thị trường dự đoán cho phiên ${dvn(n0.date)}: Kalshi ${kal(n0)}; Polymarket ${poly(n0)} (%).` : '')
    + (() => { const y2 = yrs[yrs.length - 1], lm = M.filter(m => m.date.slice(0, 4) === y2).pop(), w = W.filter(x => x.start >= lm.date).sort((a, b) => a.start.localeCompare(b.start))[0];
        return D[y2] != null ? ` Cuối ${y2}: thị trường định giá <b>${nf(lm.exp_rate, 2)}%</b> (ZQ)${w ? `, ${nf(w.mean, 2)}% (quyền chọn SOFR)` : ''} so với dot plot FOMC <b>${nf(D[y2], 2)}%</b> — ${lm.exp_rate - D[y2] > 0.2 ? `thị trường kỳ vọng Fed tăng nhiều hơn chính Fed dự báo khoảng ${nf((lm.exp_rate - D[y2]) * 100 / 25, 1)} lần 25 bps` : lm.exp_rate - D[y2] < -0.2 ? `thị trường kỳ vọng thấp hơn dự báo của Fed khoảng ${nf((D[y2] - lm.exp_rate) * 100 / 25, 1)} lần 25 bps` : 'thị trường và Fed gần như đồng thuận'}.` : ''; })()
    + ` <b>Hàm ý:</b> kỳ vọng Fed ${above(dec) > 50 ? 'nghiêng về tăng tiếp, chênh lệch lãi suất VND–USD bị ép, NHNN ít dư địa nới' : below(dec) > 50 ? 'nghiêng về giảm, mở thêm dư địa nới lỏng cho NHNN' : 'giữ nguyên là kịch bản chính, áp lực tỷ giá từ phía Fed không tăng thêm'} (R-02).`;
  const body = `<div class="tscroll"><table><thead><tr><th>Phiên FOMC</th>${keys.map(k => `<th class="n">${rl(k)}</th>`).join('')}<th class="n">Kỳ vọng</th><th>Kalshi · quyết định tại phiên (%)</th><th>Polymarket · quyết định tại phiên (%)</th></tr></thead><tbody>
    ${M.map(m => { const tk = top(m)[0]; return `<tr><td style="white-space:nowrap">${dvn(m.date)}</td>${keys.map(k => { const p = m.probs[k]; return `<td class="n"${k === tk ? ' style="background:#fff3c4;font-weight:700"' : ''}>${p == null ? '' : nf(p, 1)}</td>`; }).join('')}<td class="n">${nf(m.exp_rate, 2)}%</td><td class="muted" style="white-space:nowrap">${kal(m)}</td><td class="muted" style="white-space:nowrap">${poly(m)}</td></tr>`; }).join('')}
    </tbody></table></div>${cmpTbl()}`;
  return card({ id: o.id || 'gFedPath', title: 'Kỳ vọng lãi suất Fed theo từng phiên họp FOMC', h: o.compact ? 'tall' : 'short',
    sub: o.compact ? `%/năm · đường = lãi suất kỳ vọng sau mỗi phiên (điểm giữa khoảng, bình quân theo xác suất), so với 1 tuần và 1 tháng trước · khoảng hiện hành ${rl(cur)}% · bảng xác suất đầy đủ ở trang Vĩ mô › Quốc tế › Mỹ` : `đường = lãi suất kỳ vọng sau mỗi phiên (điểm giữa khoảng, bình quân theo xác suất) · bảng = % xác suất khoảng lãi suất mục tiêu · khoảng hiện hành ${rl(cur)}% · ô tô vàng = xác suất cao nhất · giá ZQ lúc ${esc(F.asOf || F.fetched)} (giờ UTC)`,
    body: o.compact ? '' : body, insight: ins,
    src: 'Ước tính FinSuccess theo phương pháp CME FedWatch từ giá hợp đồng tương lai lãi suất quỹ liên bang 30 ngày (CBOT, qua Yahoo Finance); có thể lệch nhẹ so với CME FedWatch (CME dùng giá thanh toán cuối ngày). Đối chiếu: Kalshi (KXFEDDECISION), Polymarket, Atlanta Fed Market Probability Tracker, dot plot FOMC (Federal Reserve qua FRED). Lịch họp: Federal Reserve.' });
}
function drawFedPath(id = 'gFedPath') {
  const F = GD.fedwatch; if (!F || !document.getElementById(id)) return;
  const M = F.meetings, H = GD.fedwatchHist || {}, days = Object.keys(H).sort();
  const ago = n => { const t = new Date(Date.now() - n * 864e5).toISOString().slice(0, 10); return days.filter(d => d <= t).pop(); };
  const ds = [{ label: 'Hiện tại', data: M.map(m => m.exp_rate), borderColor: C.navy, backgroundColor: C.navy, borderWidth: 2.4, pointRadius: 3, dp: 2, unit: '%' }];
  [[7, '1 tuần trước', C.tealInk], [30, '1 tháng trước', C.grey]].forEach(([n, lab, col]) => { const d = ago(n); if (d && d !== days[days.length - 1]) ds.push({ label: `${lab} (${dvn(d)})`, data: M.map(m => (H[d][m.date] || {}).exp_rate ?? null), borderColor: col, backgroundColor: col, borderDash: [4, 3], pointRadius: 2, dp: 2, unit: '%', spanGaps: true }); });
  ds.push({ label: 'Điểm giữa khoảng hiện hành', data: M.map(() => (F.target[0] + F.target[1]) / 2), borderColor: C.red, backgroundColor: C.red, borderDash: [2, 3], pointRadius: 0, borderWidth: 1.2, dp: 3, unit: '%' });
  mk(id, { type: 'line', data: { labels: M.map(m => dvn(m.date)), datasets: ds }, options: { plugins: { legend: { display: true, position: 'bottom' } }, scales: { y: pctAxis('', { beginAtZero: false }) } } });
}
/* ---- dùng chung: chart chồng (stacked), nhãn quý ---- */
const PAL2 = ['#1D2678', '#c0392b', '#1f8a8d', '#d9a400', '#861C52', '#4f9bd1', '#7cc49b', '#ef9f76', '#8997D6', '#5b3a8c', '#b5651d', '#2e8b57', '#e377c2', '#6b6b00', '#17becf', '#9aa3b2'];
const qLab = d => /Q\d$/.test(d) ? `Q${d.slice(-1)}/${d.slice(2, 4)}` : `Q${Math.ceil(+d.slice(5, 7) / 3)}/${d.slice(2, 4)}`;
const PCEC_VN = { 'Housing': 'Nhà ở', 'Core Services exc. Housing': 'Dịch vụ lõi trừ nhà ở', 'Core Goods': 'Hàng hoá lõi', 'Food and Energy': 'Lương thực & năng lượng',
  'Health Care': 'Y tế', 'Financial & Insurance': 'Tài chính & bảo hiểm', 'Food Svcs & Accommodations': 'Ăn uống & lưu trú', 'Transportation Services': 'Dịch vụ vận tải', 'Other Services': 'Dịch vụ khác' };
function drPceC(k = 'yoy') {
  const P = (GD.pceC || {})[k]; if (!P) return;
  const i0 = P.d.findIndex(d => d >= '2021-01'), d = P.d.slice(i0), v = P.v.slice(i0), obj = {};
  P.cols.forEach((c, j) => obj[PCEC_VN[c] || c] = v.map(r => r[j]));
  const tot = v.map(r => r.some(x => x == null) ? null : +r.reduce((a, x) => a + x, 0).toFixed(2));
  stk('gUsPceC', d.map(mvn), obj, { unit: ' điểm %', dp: 2, colors: [C.navy, C.tealInk, C.gold, C.red, C.grey], y: { beginAtZero: false, ticks: { callback: v => nf(v, k === 'mom' ? 2 : 1) } },
    extra: [L(k === 'super' ? 'Supercore' : k === 'core' ? 'PCE lõi' : 'PCE tổng', tot, '#111', { type: 'line', unit: '%', dp: 2, borderWidth: 2, pointRadius: 0 })] });
}
function stk(id, labels, obj, o = {}) {   // obj = {tên: [giá trị]}; o.pct = quy về % tổng; o.type = 'bar' | 'line'
  const names = Object.keys(obj), n = labels.length;
  const tot = o.pct ? labels.map((_, i) => names.reduce((a, k) => a + Math.max(0, obj[k][i] || 0), 0)) : null;
  const ds = names.map((k, j) => {
    const data = obj[k].map((v, i) => v == null ? null : (o.type === 'line' && v < 0) ? 0 : o.pct ? (tot[i] ? +(v / tot[i] * 100).toFixed(1) : null) : v);   // diện tích chồng: số âm (vị thế bán) vẽ bằng 0
    const col = (o.colors || PAL2)[j % PAL2.length];
    return o.type === 'line' ? { type: 'line', label: k, data, borderColor: col, backgroundColor: col + 'cc', fill: j ? '-1' : 'origin', pointRadius: 0, borderWidth: 1, stack: 's', unit: o.pct ? '%' : (o.unit ?? ''), dp: o.dp ?? 0 }
      : { type: 'bar', label: k, data, backgroundColor: col, stack: 's', unit: o.pct ? '%' : (o.unit ?? ''), dp: o.dp ?? 0 };
  });
  const extra = [...(o.extra || [])];
  if (o.total) extra.push({ type: 'line', label: 'Tổng', data: labels.map((_, i) => { let t = 0, any = false; names.forEach(k => { const v = obj[k][i]; if (v != null) { t += v; any = true; } }); return any ? +t.toFixed(o.dp ?? 0) : null; }),
    borderColor: '#1f2433', backgroundColor: '#1f2433', borderWidth: 2.2, pointRadius: 0, fill: false, stack: 'tot', unit: o.unit ?? '', dp: o.dp ?? 0, spanGaps: true });
  return mk(id, { type: o.type === 'line' ? 'line' : 'bar', data: { labels, datasets: [...ds, ...extra] }, options: Object.assign({
    plugins: { tooltip: { callbacks: { footer: o.pct ? undefined : items => { const t = items.filter(x => x.dataset.stack === 's').reduce((a, x) => a + (x.raw || 0), 0); return 'Tổng: ' + nf(t, o.dp ?? 0) + (o.unit || ''); } } } },
    scales: Object.assign({ x: { stacked: true }, y: Object.assign({ stacked: true, beginAtZero: true, ticks: { callback: v => nf(v, 0) + (o.pct ? '%' : '') }, grid: { color: '#eef0f4' } }, o.pct ? { min: 0, max: 100 } : {}, o.y || {}) }, o.scales || {}) }, o.options || {}) });
}
function deltaBars(id, labels, obj, back, o = {}) {   // thay đổi nắm giữ theo nhóm trong `back` kỳ → cột ngang
  const n = labels.length - 1, rows = Object.entries(obj).filter(([k]) => !(o.skip || []).includes(k)).map(([k, v]) => [k, v[n] != null && v[n - back] != null ? +(v[n] - v[n - back]).toFixed(1) : null]).filter(r => r[1] != null).sort((a, b) => b[1] - a[1]);
  mk(id, { type: 'bar', data: { labels: rows.map(r => r[0]), datasets: [{ label: `Thay đổi ${labels[n - back]} → ${labels[n]}`, data: rows.map(r => r[1]), backgroundColor: rows.map(r => r[1] >= 0 ? 'rgba(31,138,141,.8)' : 'rgba(192,57,43,.75)'), unit: o.unit || '', dp: o.dp ?? 0 }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { callback: v => nf(v, 0) }, grid: { color: '#eef0f4' } } } } });
  return rows;
}


function gUSFlow() {
  const F = GD.fedbs, H = GD.ustHold, M = GD.mspd, A = GD.auct;
  if (!F || !H || !M || !A) return '<p class="muted">Đang chờ số liệu Kho bạc/Fed.</p>';
  const nF = F.d.length - 1, fa = k => F.a[k][nF], fl = k => F.l[k][nF];
  const nM = M.d.length - 1, bs = M.billShare[nM], bs12 = M.billShare[nM - 12];
  const ni = GD.netIss, n12 = k => ni[k].slice(-12).reduce((a, v) => a + (v || 0), 0);
  const def = glast('tsy_def12');
  const nA = A.d.length - 1, ind3 = A.coupons['Indirect (nước ngoài, quỹ qua đại lý)'].slice(-4, -1).filter(x => x != null), indAvg = ind3.reduce((a, v) => a + v, 0) / (ind3.length || 1);
  const pdc = A.coupons['Primary dealer'].slice(-4, -1).filter(x => x != null), pdAvg = pdc.reduce((a, v) => a + v, 0) / (pdc.length || 1);
  const rec = (GD.auctRecent || []).slice(-12).reverse();
  return `<h3 class="sec2">Fed và Kho bạc: UST đang được phát hành thế nào, ai hấp thụ</h3>
  <div class="kpis">
    ${kpi('Fed nắm UST', nf((fa('Tín phiếu (bills)') + fa('Trái phiếu notes & bonds') + fa('TIPS (gồm bù lạm phát)')) / 1000, 2) + ' nghìn tỷ', `tín phiếu ${nf(fa('Tín phiếu (bills)'), 0)} tỷ · MBS ${nf(fa('MBS'), 0)} tỷ · ${dvn(F.d[nF])}`)}
    ${kpi('Thâm hụt 12 tháng', nf(-def.v / 1000, 2) + ' nghìn tỷ USD', mvn(def.d), 'neg')}
    ${kpi('Tỷ trọng tín phiếu', pc(bs, 1), `${sg(bs - bs12, 1, ' đ%')} 12 tháng · nợ do công chúng nắm`, bs > 22 ? 'neg' : '')}
    ${kpi('Phát hành ròng 12 tháng', nf((n12('bills') + n12('coupons')) / 1000, 2) + ' nghìn tỷ', `tín phiếu ${nf(n12('bills'), 0)} tỷ · coupon ${nf(n12('coupons'), 0)} tỷ`)}
    ${kpi('Indirect ở đấu thầu coupon', pc(indAvg, 1), `TB 3 tháng · primary dealer phải nhận ${pc(pdAvg, 1)}`, pdAvg > 20 ? 'neg' : '')}
    ${kpi('Nước ngoài nắm UST', nf(H.h['Nước ngoài'][H.d.length - 1] / 1000, 2) + ' nghìn tỷ', `${pc(H.h['Nước ngoài'][H.d.length - 1] / H.total[H.d.length - 1] * 100, 1)} tổng · ${qLab(H.d[H.d.length - 1])}`)}
  </div>

  <article class="card"><h3 class="sub">Các loại chứng khoán trong bảng cân đối Fed và trong nợ của Kho bạc</h3>
    <p class="chart-sub">Kỳ hạn tính lúc phát hành · tín phiếu và trái phiếu do Kho bạc Mỹ phát hành; MBS do Fannie Mae, Freddie Mac, Ginnie Mae bảo lãnh</p>
    <div class="tscroll"><table><thead><tr><th>Loại</th><th>Kỳ hạn</th><th>Trả lãi</th><th>Ai mua chủ yếu</th><th>Ý nghĩa khi Fed nắm nhiều hay ít</th></tr></thead><tbody>
      <tr><td><b>Tín phiếu (T-bills)</b></td><td>4, 6, 8, 13, 17, 26, 52 tuần (≤ 1 năm)</td><td>Không có coupon: mua giá chiết khấu, đáo hạn nhận mệnh giá</td><td>Quỹ thị trường tiền tệ, ngân hàng, NHTW nước ngoài</td><td>Fed mua tín phiếu để giữ dự trữ ngân hàng ở mức đủ (quản lý dự trữ), gần như không tác động lợi suất dài hạn</td></tr>
      <tr><td><b>Notes</b></td><td>2, 3, 5, 7, 10 năm</td><td>Coupon cố định, 6 tháng/lần</td><td>Nước ngoài, quỹ đầu tư, ngân hàng, quỹ hưu trí</td><td>Phần lớn tài sản Fed mua trong các đợt nới lỏng định lượng (QE); để đáo hạn không tái đầu tư (QT) thì thị trường phải hấp thụ thêm kỳ hạn dài</td></tr>
      <tr><td><b>Bonds</b></td><td>20, 30 năm</td><td>Coupon cố định, 6 tháng/lần</td><td>Quỹ hưu trí, bảo hiểm (cần tài sản dài khớp nghĩa vụ trả)</td><td>Nhạy nhất với lạm phát và phần bù kỳ hạn; trên chart gộp chung với notes</td></tr>
      <tr><td><b>TIPS</b></td><td>5, 10, 30 năm</td><td>Coupon trên gốc đã điều chỉnh theo CPI, 6 tháng/lần</td><td>Quỹ hưu trí, nhà đầu tư cần phòng vệ lạm phát</td><td>"Bù lạm phát" là phần gốc tăng thêm theo CPI — vì vậy TIPS của Fed tăng dần dù không mua thêm</td></tr>
      <tr><td><b>FRN</b></td><td>2 năm</td><td>Lãi thả nổi theo lợi suất tín phiếu 13 tuần, trả hằng quý</td><td>Quỹ thị trường tiền tệ</td><td>Quy mô nhỏ; gần giống tín phiếu về rủi ro lãi suất</td></tr>
      <tr><td><b>MBS</b> (chứng khoán bảo đảm bằng nợ thế chấp nhà)</td><td>Danh nghĩa 15–30 năm, thực tế ngắn hơn vì người vay trả trước</td><td>Gốc + lãi hằng tháng từ khoản vay mua nhà</td><td>Ngân hàng, quỹ, Fed (từ QE 2009)</td><td>Fed không bán MBS, chỉ để thu gốc dần — phần MBS trên chart giảm theo tốc độ người dân trả nợ nhà; tiền thu về hiện được chuyển sang mua tín phiếu</td></tr>
      <tr><td><b>Cho vay</b></td><td>Qua đêm đến 1 năm</td><td>—</td><td>Ngân hàng vay Fed (cửa sổ chiết khấu, chương trình khẩn cấp)</td><td>Tăng vọt khi có sự cố (chương trình cho vay kỳ hạn ngân hàng BTFP năm 2023 sau vụ SVB)</td></tr>
      <tr><td><b>Khác</b></td><td>—</td><td>—</td><td>—</td><td>Repo thường trực, hoán đổi USD với NHTW khác, phần chênh giá mua chưa phân bổ… (đỉnh 2020 là hoán đổi USD và các quỹ hỗ trợ thời Covid)</td></tr>
    </tbody></table></div>
    <p class="muted" style="margin-top:8px">Phân biệt theo kỳ hạn: <b>tín phiếu</b> = nợ ngắn hạn (≤ 1 năm, coi như "tiền mặt có lãi"); <b>notes và bonds</b> = nợ trung và dài hạn, rủi ro giá cao khi lãi suất biến động. Fed nắm nhiều nợ dài thì đang ép lợi suất dài xuống (QE); chuyển dần sang tín phiếu là trả rủi ro kỳ hạn lại cho thị trường.</p>
    <div class="src">Nguồn: U.S. Treasury (TreasuryDirect, lịch đấu thầu); Federal Reserve H.4.1</div></article>
  <div class="grid g2 gap">
    ${card({ id: 'gUsFedA', title: 'Bảng cân đối Fed: tài sản theo cấu phần', h: 'tall', sub: 'tỷ USD, theo tuần (H.4.1) · tín phiếu ≤ 1 năm; notes 2–10 năm & bonds 20–30 năm; TIPS chống lạm phát; MBS = nợ thế chấp nhà (xem bảng giải thích phía trên)',
      insight: `Tổng tài sản ${nf(F.a['Tín phiếu (bills)'].map((_, i) => Object.values(F.a).reduce((a, v) => a + v[i], 0))[nF], 0)} tỷ USD (${dvn(F.d[nF])}). Trong 13 tuần: tín phiếu ${sg(fa('Tín phiếu (bills)') - F.a['Tín phiếu (bills)'][nF - 13], 0, ' tỷ')}, notes & bonds ${sg(fa('Trái phiếu notes & bonds') - F.a['Trái phiếu notes & bonds'][nF - 13], 0, ' tỷ')}, MBS ${sg(fa('MBS') - F.a['MBS'][nF - 13], 0, ' tỷ')}. Tín phiếu chiếm ${pc(fa('Tín phiếu (bills)') / Object.values(F.a).reduce((a, v) => a + v[nF], 0) * 100, 1)} tài sản Fed.` + how('Tín phiếu tăng trong khi MBS giảm = Fed đã dừng thu hẹp bảng cân đối (QT) và đang rút ngắn kỳ hạn danh mục: tiền MBS đáo hạn chuyển sang tín phiếu, cộng mua thêm tín phiếu để giữ dự trữ ngân hàng đủ. Việc này bơm thanh khoản ngắn hạn nhưng không ép lợi suất dài hạn như QE (mua notes, bonds, MBS).'), src: gsrc(['us_walcl', 'fed_notes', 'fed_mbs']) })}
    ${card({ id: 'gUsFedL', title: 'Bảng cân đối Fed: nguồn vốn theo cấu phần', h: 'tall', sub: 'tỷ USD, theo tuần · TGA tăng hoặc RRP tăng = hút dự trữ khỏi hệ thống ngân hàng',
      insight: `Dự trữ NH ${nf(fl('Dự trữ NH'), 0)} tỷ, TGA ${nf(fl('TGA (Kho bạc)'), 0)} tỷ, reverse repo ${nf(fl('Reverse repo'), 0)} tỷ. 13 tuần: TGA ${sg(fl('TGA (Kho bạc)') - F.l['TGA (Kho bạc)'][nF - 13], 0, ' tỷ')}, dự trữ ${sg(fl('Dự trữ NH') - F.l['Dự trữ NH'][nF - 13], 0, ' tỷ')}.`, src: gsrc(['us_reserves', 'us_tga', 'fed_rrp_all']) })}
    ${GD.fedMat ? card({ id: 'gUsFedMat', title: 'UST Fed nắm theo thời gian còn lại đến đáo hạn', h: 'tall', sub: 'tỷ USD, số ngày thứ Tư (H.4.1, bảng 2) · cho biết bao nhiêu trái phiếu sắp đáo hạn và được tái đầu tư hoặc để chảy ra (QT)', insight: fedMatIns(), src: 'Federal Reserve H.4.1 qua FRED' }) : ''}
    ${GD.fedRepo ? card({ id: 'gUsFedRepo', title: 'Repo của Fed: FIMA (tổ chức nước ngoài) và SRF (trong nước)', h: 'tall', sub: 'tỷ USD, số ngày thứ Tư · tăng vọt = có nơi thiếu thanh khoản USD (thường cuối quý, kỳ nộp thuế)', insight: fedRepoIns(), src: 'Federal Reserve H.4.1 qua FRED (H41RESPPALGTRFNWW, H41RESPPALGTRONWW)' }) : ''}
    ${card({ id: 'gUsDebt', title: 'Kho bạc phát hành gì: cơ cấu nợ thị trường', h: 'tall', sub: 'nghìn tỷ USD, cuối tháng (MSPD) · cột = Tín phiếu, Notes, Bonds, TIPS, FRN · đường = tỷ trọng tín phiếu (trục phải, khuyến nghị TBAC ~20%)',
      src: 'Nguồn: U.S. Treasury Fiscal Data — Monthly Statement of the Public Debt' })}
    ${card({ id: 'gUsNet', title: 'Phát hành ròng hằng tháng: tín phiếu và coupon', h: 'tall', sub: 'tỷ USD · thay đổi dư nợ do công chúng nắm · tín phiếu do quỹ thị trường tiền tệ hấp thụ (rút từ RRP); coupon cần nhà đầu tư dài hạn',
      src: 'Nguồn: U.S. Treasury Fiscal Data (MSPD)' })}
    ${card({ id: 'gUsHold', title: 'Ai nắm UST: cơ cấu theo nhóm', h: 'tall', sub: '% tổng TPCP Mỹ lưu hành, theo quý (Fed Z.1) · "Khác" gồm doanh nghiệp, GSE, chính phủ liên bang…', src: 'Nguồn: Federal Reserve Z.1 Financial Accounts qua FRED' })}
    ${card({ id: 'gUsAbs', title: 'Ai hấp thụ lượng phát hành 4 quý gần nhất', h: 'tall', sub: 'tỷ USD · thay đổi lượng UST nắm giữ theo nhóm (không gồm "Khác")', insight: '<span id="gUsAbsIns"></span>', src: 'Nguồn: Federal Reserve Z.1 qua FRED' })}
    ${card({ id: 'gUsAuct', title: 'Đấu thầu: ai trúng thầu', h: 'tall', sub: '% lượng trúng thầu theo tháng phát hành · indirect = NHTW, tổ chức nước ngoài và quỹ đặt qua đại lý; direct = tổ chức trong nước đặt trực tiếp; primary dealer = phần còn lại đại lý phải nhận', body: tfPick('usAuct', [['coupons', 'Coupon (notes, bonds, TIPS, FRN)'], ['bills', 'Tín phiếu']]), src: 'Nguồn: U.S. Treasury Fiscal Data — Treasury Securities Auctions Data' })}
    ${card({ id: 'gUsBtc', title: 'Sức cầu tại phiên đấu thầu: tỷ lệ đặt mua/chào bán (bid-to-cover)', h: 'tall', sub: 'mỗi điểm = một phiên đấu thầu · đường đứt = bình quân 5 năm qua của chính kỳ hạn đó · cột mờ = % người mua indirect (NHTW, tổ chức nước ngoài, quỹ) trong phần trúng thầu cạnh tranh', body: tfPick('usBtc', [['10Y', '10Y'], ['30Y', '30Y'], ['20Y', '20Y'], ['5Y', '5Y'], ['2Y', '2Y']]), insight: btcIns(), src: 'Nguồn: U.S. Treasury Fiscal Data — Treasury Securities Auctions Data' })}
    ${card({ id: 'gUsTic', title: 'Nước ngoài nắm UST theo quốc gia', h: 'tall', sub: 'tỷ USD, cuối tháng (TIC) · Nhật, Trung Quốc, Anh và các trung tâm lưu ký (Bỉ, Luxembourg, Cayman)', src: 'Nguồn: U.S. Treasury — TIC Major Foreign Holders of Treasury Securities' })}
    ${card({ id: 'gUsDef', title: 'Thâm hụt ngân sách liên bang', sub: 'tỷ USD · cột = thặng dư/thâm hụt từng tháng · đường = cộng dồn 12 tháng', src: gsrc(['tsy_deficit']) })}
  </div>
  <article class="card"><h3 class="sub">12 phiên đấu thầu coupon gần nhất</h3><p class="chart-sub">bid-to-cover cao và indirect cao = cầu tốt; primary dealer phải nhận nhiều = cầu yếu</p>
    <div class="tscroll"><table><thead><tr><th>Ngày</th><th>Loại</th><th class="n">Lượng (tỷ USD)</th><th class="n">Bid-to-cover</th><th class="n">Lợi suất trúng</th><th class="n">Indirect</th><th class="n">Direct</th><th class="n">Primary dealer</th><th class="n">Fed (SOMA)</th></tr></thead><tbody>
    ${rec.map(r => { const t = r.amt || 1; return `<tr><td>${dvn(r.d)}</td><td>${esc(r.t)} ${esc(r.type)}</td><td class="n">${nf(r.amt, 1)}</td><td class="n">${nf(r.btc, 2)}</td><td class="n">${r.y == null ? '—' : pc(r.y, 3)}</td><td class="n">${pc(r.ind / t * 100, 1)}</td><td class="n">${pc(r.dir / t * 100, 1)}</td><td class="n${r.pd / t > 0.2 ? ' neg' : ''}">${pc(r.pd / t * 100, 1)}</td><td class="n">${nf(r.soma, 1)}</td></tr>`; }).join('')}</tbody></table></div>
    <div class="src">Nguồn: U.S. Treasury Fiscal Data — Treasury Securities Auctions Data · tỷ lệ tính trên tổng trúng thầu (gồm Fed)</div></article>`;
}
function drUSFlow() {
  const F = GD.fedbs, H = GD.ustHold, M = GD.mspd, A = GD.auct, ni = GD.netIss;
  if (!F || !H || !M || !A) return;
  stk('gUsFedA', F.d.map(dvn), F.a, { type: 'line', total: true, unit: ' tỷ USD' });
  stk('gUsFedL', F.d.map(dvn), F.l, { type: 'line', total: true, unit: ' tỷ USD' });
  if (GD.fedMat) stk('gUsFedMat', GD.fedMat.d.map(dvn), GD.fedMat.m, { type: 'line', total: true, unit: ' tỷ USD', colors: [C.red, C.gold, C.teal, C.tealInk, C.navy, C.purple] });
  if (GD.fedRepo) { const R = GD.fedRepo; mk('gUsFedRepo', { type: 'bar', data: { labels: R.d.map(dvn), datasets: [{ label: 'Repo FIMA (nước ngoài)', data: R.fima, backgroundColor: C.gold, stack: 's', unit: ' tỷ USD', dp: 1 }, { label: 'Repo SRF (trong nước)', data: R.srf, backgroundColor: C.navy, stack: 's', unit: ' tỷ USD', dp: 1 }] },
    options: { scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { callback: v => nf(v, 0) } } } } }, { win: 24 }); }
  const mf = M.d.findIndex(d => d >= '2018-01'), md = M.d.slice(mf);
  const debt = Object.fromEntries(Object.entries(M.c).map(([k, v]) => [k, v.slice(mf).map(x => x == null ? null : +(x / 1000).toFixed(2))]));
  stk('gUsDebt', md.map(mvn), debt, { unit: ' nghìn tỷ', dp: 2, extra: [L('Tỷ trọng tín phiếu', M.billShare.slice(mf), C.red, { yAxisID: 'y1', borderWidth: 2.4, dp: 1 })],
    scales: { y1: pctAxis('', { position: 'right', grid: { display: false } }) }, options: { plugins: { refLines: { lines: [] } } } });
  const nf0 = ni.d.findIndex(d => d >= '2021-01');
  stk('gUsNet', ni.d.slice(nf0).map(mvn), { 'Tín phiếu': ni.bills.slice(nf0), 'Coupon': ni.coupons.slice(nf0) }, { unit: ' tỷ USD', colors: [C.gold, C.navy], y: { stacked: true } });
  stk('gUsHold', H.d.map(qLab), H.h, { type: 'line', pct: true });
  const rows = deltaBars('gUsAbs', H.d.map(qLab), H.h, 4, { unit: ' tỷ USD', skip: ['Khác'] });
  const totCh = H.total[H.total.length - 1] - H.total[H.total.length - 5];
  $('#gUsAbsIns').innerHTML = `${qLab(H.d[H.d.length - 5])} → ${qLab(H.d[H.d.length - 1])}: tổng UST tăng <b>${nf(totCh, 0)} tỷ USD</b>. Hấp thụ nhiều nhất: ${rows.slice(0, 3).map(r => `<b>${esc(r[0])}</b> ${sg(r[1], 0, ' tỷ')} (${pc(r[1] / totCh * 100, 0)})`).join(', ')}. ${rows.filter(r => r[1] < 0).length ? 'Giảm nắm giữ: ' + rows.filter(r => r[1] < 0).map(r => `${esc(r[0])} ${sg(r[1], 0, ' tỷ')}`).join(', ') + '.' : ''} Khi Fed và NHTW nước ngoài rút lui, lượng phát hành phải đổ vào nhà đầu tư nhạy giá (quỹ, hộ gia đình, quỹ phòng hộ) → đòi kỳ hạn bù (term premium) cao hơn.`;
  wireTf('usAuct', k => { const g = A[k || 'coupons'], a0 = A.d.findIndex(d => d >= '2021-01');
    const obj = Object.fromEntries(Object.entries(g).filter(([n]) => n !== 'amt').map(([n, v]) => [n, v.slice(a0)]));
    stk('gUsAuct', A.d.slice(a0).map(mvn), obj, { pct: true, colors: [C.purple, C.tealInk, C.navy, C.gold, C.grey] }); });
  wireTf('usBtc', k => { const B = GD.btc; if (!B) return; const r = B.s[k || '10Y'] || [], st = B.stats[k || '10Y'] || {};
    mk('gUsBtc', { type: 'bar', data: { labels: r.map(x => dvn(x[0])), datasets: [
      { type: 'line', label: 'Bid-to-cover', data: r.map(x => x[1]), borderColor: C.navy, backgroundColor: C.navy, pointRadius: 3, borderWidth: 1.8, dp: 2, unit: ' lần', yAxisID: 'y', order: 1 },
      { type: 'bar', label: '% indirect', data: r.map(x => x[3]), backgroundColor: 'rgba(31,138,141,.18)', dp: 1, unit: '%', yAxisID: 'y1', order: 2 }] },
      options: { plugins: { refLines: { lines: st.avg5y ? [{ value: st.avg5y, label: 'bình quân 5 năm qua ' + nf(st.avg5y, 2), color: C.red }] : [] } },
        scales: { y: numAxis('lần', { beginAtZero: false, ticks: { callback: v => nf(v, 1) } }), y1: pctAxis('', { position: 'right', grid: { display: false }, min: 0, max: 100 }) } } }); });
  const tic = GD.tic || {}, tk = ['Japan', 'China', 'United Kingdom', 'Belgium', 'Luxembourg', 'Cayman Islands'].filter(k => tic[k]);
  const td = [...new Set(tk.flatMap(k => tic[k].d))].sort().filter(d => d >= '2018-01');
  const tm = k => { const m = {}; tic[k].d.forEach((d, i) => m[d] = tic[k].v[i]); return td.map(d => m[d] ?? null); };
  mk('gUsTic', { type: 'line', data: { labels: td.map(mvn), datasets: tk.map((k, i) => L({ Japan: 'Nhật Bản', China: 'Trung Quốc', 'United Kingdom': 'Anh', Belgium: 'Bỉ', Luxembourg: 'Luxembourg', 'Cayman Islands': 'Cayman' }[k], tm(k), PAL2[i], { unit: ' tỷ USD', dp: 1, borderWidth: i < 2 ? 2.6 : 1.6 })) }, options: { scales: { y: numAxis('tỷ USD') } } });
  const dm = gs('tsy_def_m'), d12 = gs('tsy_def12'), m12 = {}; d12.d.forEach((d, i) => m12[d] = d12.v[i]);
  const dd = dm.d.filter(d => d >= '2021-01');
  mk('gUsDef', { type: 'bar', data: { labels: dd.map(mvn), datasets: [{ label: 'Tháng', data: dd.map(d => dm.v[dm.d.indexOf(d)]), backgroundColor: dd.map(d => dm.v[dm.d.indexOf(d)] < 0 ? 'rgba(192,57,43,.6)' : 'rgba(31,138,141,.7)'), unit: ' tỷ USD', dp: 0 },
    L('Cộng dồn 12 tháng', dd.map(d => m12[d] ?? null), C.navy, { yAxisID: 'y1', unit: ' tỷ USD', dp: 0, borderWidth: 2.4 })] },
    options: { scales: { y: numAxis('tháng'), y1: numAxis('12 tháng', { position: 'right', grid: { display: false } }) } } });
}
function tfDraw(id, keys, names, k, o = {}) {
  const suf = k || 'yoy', ks = keys.map(x => x.endsWith('!') ? x.slice(0, -1) : x + '_' + suf);
  mk(id, { type: 'line', data: gLines(ks, names, PAL, Object.assign({ from: suf === 'yoy' ? '2018-01' : '2021-01' }, o)), options: { plugins: { refLines: { lines: suf === 'yoy' ? [{ value: 2, label: 'Mục tiêu 2%' }] : [] } }, scales: { y: pctAxis('') } } });
}
function drUS() {
  wireTf('usCpi', k => tfDraw('gUsCpi', ['us_cpi', 'us_cpi_core', 'us_cpi_supercore'], ['CPI', 'CPI lõi', 'Supercore'], k));
  wireTf('usCpiC', k => tfDraw('gUsCpiC', ['us_cpi_shelter', 'us_cpi_coregoods', 'us_cpi_svc_ex_energy', 'us_cpi_energy', 'us_cpi_food'], ['Nhà ở', 'Hàng hóa lõi', 'Dịch vụ trừ năng lượng', 'Năng lượng', 'Lương thực'], k));
  wireTf('usPceC', k => drPceC(k || 'yoy'));
  wireTf('usPce', k => tfDraw('gUsPce', ['us_pce', 'us_pce_core', 'us_pce_supercore', ...(k === 'yoy' || !k ? ['us_pce_trim!'] : [])], ['PCE', 'PCE lõi', 'Supercore', 'Trimmed mean'], k));
  wireTf('usPpi', k => tfDraw('gUsPpi', ['us_ppi_fd', 'us_ppi_core', 'us_ppi_inter', 'us_ppi_crude'], ['Cầu cuối cùng', 'Lõi', 'Trung gian', 'Thô'], k));
  const T = GD.taylor || {};
  wireTf('usTay', k => {
    const tg = k === 'trim' ? '_trim' : '', ser = n => { const x = T[n] || { d: [], v: [] }; return x; };
    const all = [...new Set(['v1' + tg, 'v2' + tg, 'ffr', 'rstar'].flatMap(n => ser(n).d))].sort().filter(d => d >= '2015-01');
    const al2 = n => { const x = ser(n), m = {}; x.d.forEach((d, i) => m[d] = x.v[i]); return all.map(d => m[d] ?? null); };
    mk('gUsTaylor', { type: 'line', data: { labels: all.map(mvn), datasets: [L('Taylor V1 (lệch GDP)', al2('v1' + tg), C.red, { borderWidth: 2.2 }), L('Taylor V2 (lệch thất nghiệp)', al2('v2' + tg), C.gold, { borderDash: [5, 4] }), L('Fed funds thực tế', al2('ffr'), C.navy, { borderWidth: 2.6 }), L('r* (HLW)', al2('rstar'), C.grey, { borderDash: [2, 3] })] }, options: { scales: { y: pctAxis('') } } });
    const v1 = al2('v1' + tg).filter(x => x != null).pop(), v2 = al2('v2' + tg).filter(x => x != null).pop(), f = al2('ffr').filter(x => x != null).pop();
    const gap = (v1 - f) * 100;
    $('#gTayIns').innerHTML = `Với π = ${k === 'trim' ? 'PCE trimmed mean' : 'PCE lõi'}: Taylor V1 <b>${pc(v1, 2)}</b>, V2 <b>${pc(v2, 2)}</b> so với fed funds <b>${pc(f, 2)}</b> → chênh V1 <b>${sg(gap, 0, ' bps')}</b>: ${Math.abs(gap) < 50 ? 'chính sách gần trung lập' : gap > 0 ? 'Fed đang <b>lỏng</b> hơn quy tắc — nghiêng về giữ hoặc tăng' : 'Fed đang <b>chặt</b> hơn quy tắc — có dư địa giảm'}. Chọn thước đo lạm phát ảnh hưởng mạnh: hai cách cho kết quả lệch ${nf(Math.abs(((T.v1 || { v: [0] }).v.slice(-1)[0] - (T.v1_trim || { v: [0] }).v.slice(-1)[0]) * 100), 0)} bps.`;
  });
  const p = gs('us_payems_chg'), u = gs('us_unrate'), um = {}; u.d.forEach((d, i) => um[d] = u.v[i]);
  const pd = p.d.filter(d => d >= '2021-01'), pv = pd.map(d => p.v[p.d.indexOf(d)]);
  mk('gUsSurvey', { type: 'line', data: (() => { const g = gLines(['us_ism_mfg', 'us_ism_svc', 'us_umcsent'], ['PMI sản xuất ISM', 'PMI dịch vụ ISM', 'Niềm tin tiêu dùng Michigan'], [C.navy, C.tealInk, C.gold], { unit: '', dp: 1, from: '2021-01' }); g.datasets[2].yAxisID = 'y1'; g.datasets[2].borderDash = [5, 4]; return g; })(),
    options: { scales: { y: numAxis('PMI', { beginAtZero: false }), y1: numAxis('niềm tin', { position: 'right', beginAtZero: false, grid: { display: false } }) }, plugins: { refLines: { lines: [{ value: 50, label: '50', color: C.grey }] } } } });
  mk('gUsInfExp', { type: 'line', data: gLines(['us_mich', 'us_mich5', 'us_cpi_yoy'], ['Kỳ vọng 1 năm', 'Kỳ vọng 5–10 năm', 'CPI thực tế'], [C.red, C.purple, C.navy], { dp: 1, from: '2021-01' }), options: { scales: { y: pctAxis('') } } });
  mk('gUsJobs', { type: 'bar', data: { labels: pd.map(mvn), datasets: [{ label: 'Việc làm tăng thêm (nghìn)', data: pv, backgroundColor: pv.map(v => v < 0 ? 'rgba(192,57,43,.7)' : 'rgba(41,56,168,.55)'), dp: 0, unit: '' }, L('Thất nghiệp', pd.map(d => um[d] ?? null), C.red, { yAxisID: 'y1', dp: 1 })] },
    options: { scales: { y: numAxis('nghìn'), y1: pctAxis('', { position: 'right', grid: { display: false } }) } } });
  mk('gUsSpr', { type: 'line', data: gLines(['sofr_iorb', 'tgcr_iorb', 'sofr99_iorb'], ['SOFR − IORB', 'TGCR − IORB', 'SOFR p99 − IORB'], [C.navy, C.tealInk, C.red], { unit: ' bps', dp: 0 }), options: { plugins: { refLines: { lines: [{ value: 0, label: '' }] } }, scales: { y: numAxis('bps') } } });
  drawFedPath();
  mk('gUsRates', { type: 'line', data: gLines(['us_effr_d', 'us_2y_d', 'us_10y_d'], ['EFFR', '2 năm', '10 năm'], [C.navy, C.gold, C.red], { from: '2021-01-01' }), options: { scales: { y: pctAxis('') } } });
  drUSFlow();
}
/* -------- Euro -------- */
function gEA() {
  return `<div class="kpis k4">
    ${kpi('HICP', pc(glast('ea_hicp').v, 1), `lõi ${pc(glast('ea_hicp_core').v, 1)} · ${mvn(glast('ea_hicp').d)}`, glast('ea_hicp').v > 2.5 ? 'neg' : '')}
    ${kpi('HICP dịch vụ', pc(glast('ea_hicp_serv').v, 1), mvn(glast('ea_hicp_serv').d))}
    ${kpi('Lãi suất tiền gửi ECB', pc(glast('ea_dfr_d').v, 2), 'DFR · ' + dvn(glast('ea_dfr_d').d))}
    ${kpi('Bund 10 năm', pc(glast('de_10y_m').v, 2), `EUR/USD ${nf(glast('eurusd_d').v, 4)}`)}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'gEaHicp', title: 'Lạm phát HICP khu vực đồng Euro', sub: '% YoY · tổng, lõi (trừ năng lượng, thực phẩm), dịch vụ · từ 2026 theo COICOP 2018', src: gsrc(['ea_hicp']) })}
    ${card({ id: 'gEaRate', title: 'ECB: lãi suất tiền gửi so với lạm phát lõi', sub: '%/năm · DFR theo tháng, HICP lõi, Bund 10 năm', src: gsrc(['ea_dfr', 'de_10y']) })}
    ${card({ id: 'gEaFx', title: 'EUR/USD và thất nghiệp khu vực Euro', sub: 'EUR/USD theo ngày (trục trái) · thất nghiệp % (trục phải)', src: gsrc(['eurusd', 'ea_unrate']) })}
    ${card({ id: 'gEaBs', title: 'Tổng tài sản Eurosystem', sub: 'tỷ EUR, theo tuần · thu hẹp do TLTRO đáo hạn và APP/PEPP không tái đầu tư', insight: (() => { const x = gs('ea_assets_w'); if (!x.v.length) return ''; const mx = Math.max(...x.v), n = x.v.length - 1; return `Tổng tài sản <b>${nf(x.v[n], 0)} tỷ EUR</b> (${dvn(x.d[n])}), thấp hơn đỉnh ${nf(mx, 0)} tỷ <b>${sg((x.v[n] / mx - 1) * 100, 0)}</b>; 52 tuần ${sg(x.v[n] - x.v[Math.max(0, n - 52)], 0, ' tỷ')}.`; })(), src: gsrc(['ea_assets']) })}
  </div>`;
}
function drEA() {
  mk('gEaHicp', { type: 'line', data: gLines(['ea_hicp', 'ea_hicp_core', 'ea_hicp_serv'], ['HICP', 'HICP lõi', 'Dịch vụ'], PAL, { from: '2018-01' }), options: { plugins: { refLines: { lines: [{ value: 2, label: 'Mục tiêu 2%' }] } }, scales: { y: pctAxis('') } } });
  mk('gEaRate', { type: 'line', data: gLines(['ea_dfr_m', 'ea_hicp_core', 'de_10y_m'], ['Lãi suất tiền gửi ECB', 'HICP lõi', 'Bund 10 năm'], [C.navy, C.red, C.gold], { from: '2018-01' }), options: { scales: { y: pctAxis('') } } });
  const fx = gs('eurusd_d'), un = gs('ea_unrate'); const um = {}; un.d.forEach((d, i) => um[d.slice(0, 7)] = un.v[i]);
  mk('gEaFx', { type: 'line', data: { labels: fx.d.map(dvn), datasets: [L('EUR/USD', fx.v, C.navy, { unit: '', dp: 4 }), L('Thất nghiệp', fx.d.map((d, i) => (i === fx.d.length - 1 || fx.d[i + 1].slice(0, 7) !== d.slice(0, 7)) ? um[d.slice(0, 7)] ?? null : null), C.red, { yAxisID: 'y1', dp: 1, spanGaps: true })] },
    options: { scales: { y: numAxis('', { ticks: { callback: v => nf(v, 2) } }), y1: pctAxis('', { position: 'right', grid: { display: false } }) } } });
  mk('gEaBs', { type: 'line', data: gLines(['ea_assets_w'], ['Eurosystem'], [C.navy], { unit: ' tỷ EUR', dp: 0 }), options: { scales: { y: numAxis('tỷ EUR') } } });
}
/* -------- Nhật -------- */
function jpEpisodes() {   // gộp các lần can thiệp cách nhau ≤ 45 ngày thành một đợt
  const ev = (GD.feio || []).filter(x => x.pair.toLowerCase().includes('yen')), out = [];
  ev.forEach(x => { const l = out[out.length - 1]; if (l && (new Date(x.d) - new Date(l.to)) / 864e5 <= 45 && Math.sign(x.amt) === Math.sign(l.amt)) { l.to = x.d; l.amt += x.amt; l.n++; } else out.push({ from: x.d, to: x.d, amt: x.amt, n: 1 }); });
  return out;
}
function gJP() {
  const B = GD.bojbs, H = GD.jgbHold, ep = jpEpisodes(), le = ep[ep.length - 1];
  const nB = B ? B.d.length - 1 : -1, tB = i => B ? Object.values(B.a).reduce((a, v) => a + (v[i] || 0), 0) : null;
  const nH = H ? H.d.length - 1 : -1, bojSh = H ? H.h.BoJ[nH] / H.total[nH] * 100 : null, bojSh4 = H ? H.h.BoJ[nH - 4] / H.total[nH - 4] * 100 : null;
  const rk = gs('jp_res_mof').v.length ? 'jp_res_mof' : 'jp_res_imf', res = glast(rk), resPk = Math.max(...gs(rk).v.filter(x => x != null));
  return `<div class="kpis">
    ${kpi('CPI Nhật', pc(glast('jp_cpi_main').v, 1), `trừ thực phẩm tươi sống ${pc(glast('jp_cpi_xff_idx_yoy').v, 1)} · ${mvn(glast('jp_cpi_main').d)}`)}
    ${kpi('JGB 10 năm', pc((glast('jp_10y_d').v ?? glast('jp_10y_m').v), 3), `${glast('jp_10y_d').d ? dvn(glast('jp_10y_d').d) + ' · ' : ''}${sg(((glast('jp_10y_d').v ?? 0) - (gprev('jp_10y_d', 5) ?? glast('jp_10y_d').v ?? 0)) * 100, 1, ' bps')} 1 tuần · qua đêm ${pc(glast('jp_rate_m').v, 2)}`)}
    ${kpi('Tài sản BoJ', B ? nf(tB(nB), 0) + ' nghìn tỷ JPY' : '—', B ? `${sg((tB(nB) / tB(nB - 12) - 1) * 100, 1)} 12 tháng · ${mvn(B.d[nB])}` : '')}
    ${kpi('BoJ nắm JGB', bojSh == null ? '—' : pc(bojSh, 1), H ? `${sg(bojSh - bojSh4, 1, ' đ%')} 4 quý · ${qLab(H.d[nH])}` : '')}
    ${kpi('Dự trữ ngoại hối', nf(res.v, 0) + ' tỷ USD', `${mvn(res.d)} · ${sg((res.v / resPk - 1) * 100, 1)} so với đỉnh`)}
    ${kpi('Can thiệp gần nhất', le ? dvn(le.to) : '—', le ? `${le.amt > 0 ? 'bán USD mua JPY' : 'mua USD bán JPY'} ${nf(Math.abs(le.amt) / 10000, 2)} nghìn tỷ JPY (${le.n} phiên) · USD/JPY nay ${nf(glast('usdjpy_d').v, 2)}` : '', 'neg')}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'gJpCpi', title: 'Lạm phát Nhật Bản', sub: '% YoY · tổng, trừ thực phẩm tươi sống (core, BOJ theo dõi), trừ thực phẩm tươi sống và năng lượng (core-core)', src: gsrc(['jp_cpi_idx']) })}
    ${card({ id: 'gJpRate', title: 'BOJ: lãi suất qua đêm và JGB 10 năm', sub: '%/năm, trung bình tháng', src: gsrc(['jp_rate', 'jp_10y']) })}
    ${card({ id: 'gJpJgb', title: 'Lợi suất JGB theo ngày: 2, 10, 30 năm', h: 'tall', sub: '%/năm, theo ngày · MOF công bố cuối mỗi ngày giao dịch', src: 'Bộ Tài chính Nhật Bản (MOF) — JGB Interest Rate' })}
    ${card({ id: 'gJpSpr', title: 'Chênh UST − JGB 10 năm và USD/JPY', h: 'tall', sub: 'bps (trục trái) · USD/JPY (trục phải) · chênh thu hẹp thường kéo JPY mạnh lên', src: 'U.S. Treasury; MOF Nhật Bản; ECB (tỷ giá tham chiếu, quy đổi chéo)' })}
    ${card({ id: 'gJpCurve', title: 'Đường cong lợi suất JGB', h: 'tall', sub: '%/năm theo kỳ hạn 1Y–40Y · hiện tại so với 1 tuần, 1 tháng, đầu năm, 1 năm và 5 năm trước', insight: jgbCurveIns(), src: 'Bộ Tài chính Nhật Bản (MOF) — JGB Interest Rate (đường cong lợi suất par)' })}
    ${card({ id: 'gJpSlope', title: 'Độ dốc đường cong JGB: 30Y − 10Y và 10Y − 2Y', h: 'tall', sub: 'bps, theo ngày từ 2021 · dốc lên = kỳ hạn dài đòi bù cao hơn (lo ngại tài khoá, cầu từ bảo hiểm và BoJ giảm)', insight: jgbSlopeIns(), src: 'Bộ Tài chính Nhật Bản (MOF) — JGB Interest Rate' })}
    ${card({ id: 'gJpBtc', title: 'Sức cầu tại phiên đấu thầu JGB: bid-to-cover và tail', h: 'tall', sub: 'mỗi điểm = một phiên · bid-to-cover = khối lượng đặt thầu cạnh tranh / trúng thầu · cột = tail (lợi suất trúng thầu cao nhất − lợi suất bình quân, bps; càng nhỏ càng tốt) · đường đứt = bình quân 5 năm qua', body: tfPick('jpBtc', [['10Y', '10Y'], ['30Y', '30Y'], ['20Y', '20Y'], ['40Y', '40Y'], ['5Y', '5Y'], ['2Y', '2Y']]), insight: jgbBtcIns(), src: 'Bộ Tài chính Nhật Bản (MOF) — Auction Results; bid-to-cover và tail FinSuccess tính từ số MOF công bố' })}
    ${card({ id: 'gJpLong', title: 'JGB 10Y theo ngày từ 2016', h: 'tall', sub: '%/năm · từ giai đoạn kiểm soát đường cong lợi suất (YCC) tới khi BoJ thoát lãi suất âm (3/2024)', src: 'Bộ Tài chính Nhật Bản (MOF) — JGB Interest Rate' })}
    ${card({ id: 'gJpBsA', title: 'Bảng cân đối BoJ: tài sản theo cấu phần', h: 'tall', sub: 'nghìn tỷ JPY, cuối tháng · JGB giảm = BoJ thu hẹp mua (QT theo lộ trình giảm mua từ 08/2024)',
      insight: B ? `JGB BoJ nắm <b>${nf(B.a.JGB[nB], 0)} nghìn tỷ JPY</b>, ${sg(B.a.JGB[nB] - B.a.JGB[nB - 12], 0, ' nghìn tỷ')} trong 12 tháng; ETF ${nf(B.a['ETF + J-REIT'][nB], 0)} nghìn tỷ, cho vay ${nf(B.a['Cho vay'][nB], 0)} nghìn tỷ.` : '', src: 'Nguồn: Bank of Japan — BOJ Time-Series Data Search (Bank of Japan Accounts)' })}
    ${card({ id: 'gJpBsL', title: 'Bảng cân đối BoJ: nguồn vốn theo cấu phần', h: 'tall', sub: 'nghìn tỷ JPY, cuối tháng · tiền gửi NH tại BoJ (current account) là thanh khoản dư thừa của hệ thống', src: 'Nguồn: Bank of Japan — BOJ Time-Series Data Search' })}
    ${card({ id: 'gJpHold', title: 'Ai nắm JGB (gồm tín phiếu)', h: 'tall', sub: '% tổng, theo quý (Flow of Funds) · BoJ rút bớt → ngân hàng, bảo hiểm, nước ngoài phải hấp thụ', src: 'Nguồn: Bank of Japan — Flow of Funds' })}
    ${card({ id: 'gJpAbs', title: 'Ai hấp thụ JGB 4 quý gần nhất', h: 'tall', sub: 'nghìn tỷ JPY · thay đổi lượng nắm giữ theo nhóm', insight: '<span id="gJpAbsIns"></span>', src: 'Nguồn: Bank of Japan — Flow of Funds' })}
    ${card({ id: 'gJpFx', title: 'USD/JPY và các lần MOF can thiệp', h: 'tall', sub: 'đường = USD/JPY theo ngày · cột = lượng can thiệp theo ngày, nghìn tỷ JPY (trục phải; dương = bán USD mua JPY)', src: gsrc(['usdjpy']) + ' · MOF Foreign Exchange Intervention Operations' })}
    ${card({ id: 'gJpRes', title: 'Dự trữ ngoại hối và nắm giữ UST của Nhật', h: 'tall', sub: 'tỷ USD, cuối tháng · tổng dự trữ chính thức (MOF) và UST do Nhật nắm (TIC) · cột = can thiệp trong tháng, nghìn tỷ JPY (trục phải)', src: 'Bộ Tài chính Nhật Bản (International Reserves/Foreign Currency Liquidity); U.S. Treasury TIC' })}
    ${card({ id: 'gJpResC', title: 'Dự trữ ngoại hối Nhật theo cấu phần', h: 'tall', sub: 'tỷ USD, cuối tháng · chứng khoán ngoại tệ (chủ yếu UST), tiền gửi ngoại tệ, vàng, vị thế IMF và SDR', src: 'Bộ Tài chính Nhật Bản (International Reserves/Foreign Currency Liquidity)' })}
  </div>
  <article class="card"><h3 class="sub">Các đợt can thiệp tỷ giá của MOF</h3><p class="chart-sub">gộp các lần can thiệp cùng chiều cách nhau không quá 45 ngày · số tiền nghìn tỷ JPY · MOF công bố cuối mỗi tháng (tổng) và theo quý (từng ngày)</p>
    <div class="tscroll"><table><thead><tr><th>Từ</th><th>Đến</th><th class="n">Số phiên</th><th>Chiều</th><th class="n">Tổng (nghìn tỷ JPY)</th><th class="n">USD/JPY trước</th><th class="n">USD/JPY 1 tháng sau</th></tr></thead><tbody>
    ${ep.slice(-10).reverse().map(e => { const fx = gs('usdjpy_d'), at = (d, off) => { const t = new Date(d); t.setDate(t.getDate() + off); const ts = t.toISOString().slice(0, 10); let v = null; for (let i = 0; i < fx.d.length; i++) { if (fx.d[i] > ts) break; v = fx.v[i]; } if (v == null) { const mm = gs('usdjpy_m'), j = mm.d.indexOf(ts.slice(0, 7)); v = j >= 0 ? mm.v[j] : null; } return v; };
      return `<tr><td>${dvn(e.from)}</td><td>${dvn(e.to)}</td><td class="n">${e.n}</td><td>${e.amt > 0 ? 'Bán USD, mua JPY' : 'Mua USD, bán JPY'}</td><td class="n"><b>${nf(Math.abs(e.amt) / 10000, 2)}</b></td><td class="n">${nf(at(e.from, -1), 2)}</td><td class="n">${nf(at(e.to, 30), 2)}</td></tr>`; }).join('')}</tbody></table></div>
    <div class="src">Nguồn: Ministry of Finance Japan — Foreign Exchange Intervention Operations; USD/JPY: FRED (Fed H.10)</div></article>`;
}
function drJP() {
  mk('gJpCpi', { type: 'line', data: gLines(['jp_cpi_idx_yoy', 'jp_cpi_xff_idx_yoy', 'jp_cpi_xffe_idx_yoy'], ['CPI', 'Trừ thực phẩm tươi sống', 'Trừ thực phẩm tươi sống và năng lượng'], PAL, { from: '2018-01' }), options: { plugins: { refLines: { lines: [{ value: 2, label: 'Mục tiêu 2%' }] } }, scales: { y: pctAxis('') } } });
  mk('gJpRate', { type: 'line', data: gLines(['jp_rate_m', 'jp_10y_m'], ['Qua đêm', 'JGB 10 năm'], [C.navy, C.red], { from: '2018-01' }), options: { scales: { y: pctAxis('') } } });
  if (gs('jp_10y_d').v.length) {
    mk('gJpJgb', { type: 'line', data: gLines(['jp_2y_d', 'jp_10y_d', 'jp_30y_d'], ['2 năm', '10 năm', '30 năm'], [C.tealInk, C.navy, C.red], { from: '2021-01-01' }), options: { scales: { y: pctAxis('') } } });
    const sp = gs('us_jp_10y_d'), fx = gs('usdjpy_d'), fm = {}; fx.d.forEach((d, i) => fm[d] = fx.v[i]);
    const ds = sp.d.filter(d => d >= '2021-01-01');
    mk('gJpSpr', { type: 'line', data: { labels: ds.map(dvn), datasets: [L('UST − JGB 10 năm', ds.map(d => sp.v[sp.d.indexOf(d)]), C.navy, { unit: ' bps', dp: 0, borderWidth: 2.2 }), L('USD/JPY', ds.map(d => fm[d] ?? null), C.red, { yAxisID: 'y1', unit: '', dp: 2, spanGaps: true })] },
      options: { scales: { y: numAxis('bps'), y1: numAxis('USD/JPY', { position: 'right', grid: { display: false }, beginAtZero: false }) } } });
  }
  const JC = GD.jgbCurve;
  if (JC) mk('gJpCurve', { type: 'line', data: { labels: JC.t, datasets: JC.c.map((c, i) => L(`${c.n} (${dvn(c.d)})`, c.v, [C.navy, C.teal, C.tealInk, C.red, C.grey, C.gold][i] || C.grey, { pointRadius: 3, borderWidth: i ? 1.6 : 2.6, borderDash: i === 1 ? [2, 2] : i >= 4 ? [4, 3] : [], dp: 3 })) }, options: { scales: { y: pctAxis('', { beginAtZero: false }) } } });
  if (gs('jp_s30_10_d').v.length) mk('gJpSlope', { type: 'line', data: gLines(['jp_s30_10_d', 'jp_s10_2_d'], ['30Y − 10Y', '10Y − 2Y'], [C.red, C.navy], { unit: ' bps', dp: 0, from: '2021-01-01' }), options: { scales: { y: numAxis('bps') } } });
  if (gs('jp_10y_dl').v.length) mk('gJpLong', { type: 'line', data: gLines(['jp_10y_dl'], ['JGB 10Y'], [C.navy], { dp: 3, from: '2016-01-01' }), options: { plugins: { refLines: { lines: [{ value: 0, label: '0%', color: C.grey }] } }, scales: { y: pctAxis('') } } });
  wireTf('jpBtc', k => { const A = GD.jgbAuct; if (!A) return; const r = (A.s[k || '10Y'] || []).filter(x => x[0] >= '2021-01-01'), st = A.stats[k || '10Y'] || {};
    mk('gJpBtc', { type: 'bar', data: { labels: r.map(x => dvn(x[0])), datasets: [
      { type: 'line', label: 'Bid-to-cover', data: r.map(x => x[1]), borderColor: C.navy, backgroundColor: C.navy, pointRadius: 3, borderWidth: 1.8, dp: 2, unit: ' lần', yAxisID: 'y', order: 1 },
      { type: 'bar', label: 'Tail (bps)', data: r.map(x => x[4]), backgroundColor: 'rgba(192,57,43,.30)', dp: 1, unit: ' bps', yAxisID: 'y1', order: 2 }] },
      options: { plugins: { refLines: { lines: st.avg5y ? [{ value: st.avg5y, label: 'bình quân 5 năm qua ' + nf(st.avg5y, 2), color: C.tealInk }] : [] } },
        scales: { y: numAxis('lần', { beginAtZero: false, ticks: { callback: v => nf(v, 1) } }), y1: numAxis('tail, bps', { position: 'right', grid: { display: false }, ticks: { callback: v => nf(v, 1) } }) } } }); });
  const B = GD.bojbs, H = GD.jgbHold;
  if (B) { const f = B.d.findIndex(d => d >= '2016-01'), cut = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.slice(f)]));
    stk('gJpBsA', B.d.slice(f).map(mvn), cut(B.a), { type: 'line', total: true, unit: ' nghìn tỷ JPY' });
    stk('gJpBsL', B.d.slice(f).map(mvn), cut(B.l), { type: 'line', total: true, unit: ' nghìn tỷ JPY' }); }
  if (H) { stk('gJpHold', H.d.map(qLab), H.h, { type: 'line', pct: true });
    const rows = deltaBars('gJpAbs', H.d.map(qLab), H.h, 4, { unit: ' nghìn tỷ JPY', dp: 1, skip: ['Khác'] }), n = H.total.length - 1, tc = H.total[n] - H.total[n - 4];
    $('#gJpAbsIns').innerHTML = `${qLab(H.d[n - 4])} → ${qLab(H.d[n])}: tổng JGB + tín phiếu ${sg(tc, 1, ' nghìn tỷ JPY')}. ${rows.filter(r => r[1] > 0).slice(0, 3).map(r => `<b>${esc(r[0])}</b> ${sg(r[1], 1, '')}`).join(', ')} tăng nắm giữ; ${rows.filter(r => r[1] < 0).map(r => `<b>${esc(r[0])}</b> ${sg(r[1], 1, '')}`).join(', ') || 'không nhóm nào giảm'}. BoJ rút khỏi thị trường JGB → lợi suất dài hạn Nhật phải đủ cao để nhà đầu tư trong nước (và tổ chức Nhật đang nắm UST) chuyển vốn về.`; }
  const fx = gs('usdjpy_d'), fe = {}; (GD.feio || []).forEach(x => { fe[x.d] = (fe[x.d] || 0) + x.amt / 10000; });
  const fd = fx.d.filter(d => d >= '2021-01-01');
  const extraDays = Object.keys(fe).filter(d => d >= '2021-01-01' && !fx.d.includes(d));
  const all = [...new Set([...fd, ...extraDays])].sort(), fm = {}; fx.d.forEach((d, i) => fm[d] = fx.v[i]);
  mk('gJpFx', { type: 'bar', data: { labels: all.map(dvn), datasets: [L('USD/JPY', all.map(d => fm[d] ?? null), C.navy, { unit: '', dp: 2, spanGaps: true }),
    { type: 'bar', label: 'Can thiệp (nghìn tỷ JPY)', data: all.map(d => fe[d] ? +fe[d].toFixed(2) : null), backgroundColor: C.red, yAxisID: 'y1', barThickness: 4, unit: ' nghìn tỷ', dp: 2 }] },
    options: { scales: { y: numAxis('USD/JPY', { beginAtZero: false, ticks: { callback: v => nf(v, 0) } }), y1: numAxis('nghìn tỷ JPY', { position: 'right', grid: { display: false }, ticks: { callback: v => nf(v, 1) } }) } } });
  if (GD.jpRes) { const R = GD.jpRes; stk('gJpResC', R.d.map(mvn), R.c, { unit: ' tỷ USD', dp: 1, colors: [C.navy, C.tealInk, C.gold, C.purple, C.grey] }); }
  const r = gs('jp_res_mof').v.length ? gs('jp_res_mof') : gs('jp_res_imf'), tj = (GD.tic || {}).Japan || { d: [], v: [] }, rm = {}; r.d.forEach((d, i) => rm[d] = r.v[i]);
  const tmj = {}; tj.d.forEach((d, i) => tmj[d] = tj.v[i]);
  const fem = {}; (GD.feio || []).forEach(x => { const m = x.d.slice(0, 7); fem[m] = (fem[m] || 0) + x.amt / 10000; });
  const md = [...new Set([...r.d, ...tj.d])].sort().filter(d => d >= '2018-01');
  mk('gJpRes', { type: 'bar', data: { labels: md.map(mvn), datasets: [L(gs('jp_res_mof').v.length ? 'Tổng dự trữ (MOF)' : 'Dự trữ trừ vàng', md.map(d => rm[d] ?? null), C.navy, { unit: ' tỷ USD', dp: 0, borderWidth: 2.4 }), L('UST Nhật nắm (TIC)', md.map(d => tmj[d] ?? null), C.tealInk, { unit: ' tỷ USD', dp: 0 }),
    { type: 'bar', label: 'Can thiệp trong tháng', data: md.map(d => fem[d] ? +fem[d].toFixed(2) : null), backgroundColor: 'rgba(192,57,43,.75)', yAxisID: 'y1', unit: ' nghìn tỷ JPY', dp: 2 }] },
    options: { scales: { y: numAxis('tỷ USD'), y1: numAxis('nghìn tỷ JPY', { position: 'right', grid: { display: false }, ticks: { callback: v => nf(v, 1) } }) } } });
}
/* -------- Trung Quốc -------- */
function gCN() {
  return `<div class="kpis k4">
    ${kpi('CPI Trung Quốc', pc(glast('cn_cpi').v, 1), mvn(glast('cn_cpi').d), glast('cn_cpi').v < 1 ? 'neg' : '')}
    ${kpi('PPI Trung Quốc', pc(glast('cn_ppi').v, 1), mvn(glast('cn_ppi').d) + ' · nguồn chậm', glast('cn_ppi').v < 0 ? 'neg' : '')}
    ${kpi('Lãi suất liên NH 3 tháng', pc(glast('cn_rate_m').v, 2), mvn(glast('cn_rate_m').d))}
    ${kpi('USD/CNY', nf(glast('usdcny_d').v, 4), dvn(glast('usdcny_d').d))}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'gCnPx', title: 'CPI và PPI Trung Quốc', sub: '% YoY · PPI âm kéo dài = giảm phát hàng công nghiệp, lan sang giá xuất khẩu', src: gsrc(['cn_cpi', 'cn_ppi']) })}
    ${card({ id: 'gCnFx', title: 'USD/CNY và lãi suất liên ngân hàng', sub: 'USD/CNY theo ngày (trục trái) · lãi suất 3 tháng (trục phải)', src: gsrc(['usdcny', 'cn_rate']) })}
  </div>`;
}
function drCN() {
  mk('gCnPx', { type: 'line', data: gLines(['cn_cpi', 'cn_ppi'], ['CPI', 'PPI'], [C.navy, C.red], { from: '2018-01' }), options: { plugins: { refLines: { lines: [{ value: 0, label: '' }] } }, scales: { y: pctAxis('') } } });
  const fx = gs('usdcny_d'), r = gs('cn_rate_m'); const rm = {}; r.d.forEach((d, i) => rm[d] = r.v[i]);
  mk('gCnFx', { type: 'line', data: { labels: fx.d.map(dvn), datasets: [L('USD/CNY', fx.v, C.navy, { unit: '', dp: 4 }), L('Liên NH 3 tháng', fx.d.map((d, i) => (i === fx.d.length - 1 || fx.d[i + 1].slice(0, 7) !== d.slice(0, 7)) ? rm[d.slice(0, 7)] ?? null : null), C.red, { yAxisID: 'y1', spanGaps: true })] },
    options: { scales: { y: numAxis('', { ticks: { callback: v => nf(v, 2) } }), y1: pctAxis('', { position: 'right', grid: { display: false } }) } } });
}
function chIntl() {
  $$('.cty button').forEach(b => b.onclick = () => openC(b.dataset.c));
  Object.keys(gDone).filter(k => k !== 'gl').forEach(k => delete gDone[k]);
  FSK.sortable($('.cty'), 'intl-country', 'c');
  if (!gDone.gl && $('.csub[data-cc="gl"]')) { gDone.gl = true; drGL(); }   // trang Ngành: lợi suất & lạm phát toàn cầu dựng ẩn cho Chart book và Nhật ký chuyên viên (trang Vĩ mô: tab Việt Nam & Thế giới)
  openC($('.cty button').dataset.c);
}
function chIntlOverview() {
  const labs = monthsFrom('2021-01', TODAY.slice(0, 7));
  mk('chRates', { type: 'line', data: { labels: labs.map(mvn), datasets: [L('EFFR', al(intl.effr, labs), C.navy, { borderWidth: 2.4 }), L('UST 10Y', al(intl.ust10, labs), C.red), L('TPCP VN 10Y', al(intl.vn10, labs), C.tealInk, { borderDash: [5, 4] })] },
    options: { scales: { y: pctAxis() } } }, { switch: 'line' });
  mk('chUsd', { type: 'line', data: { labels: labs.map(mvn), datasets: [L('DXY', al(intl.dxy, labs), C.navy, { unit: '', dp: 1 }), L('USD/CNY', al(intl.cny, labs), C.purple, { unit: '', dp: 3, yAxisID: 'y1' })] },
    options: { scales: { y: numAxis('DXY'), y1: { position: 'right', grid: { display: false }, ticks: { callback: v => nf(v, 2) }, title: { display: true, text: 'USD/CNY' } } } } });
  const bl = intl.brent.map(p => p.d.slice(0, 7));
  mk('chBrent', { type: 'bar', data: { labels: bl.map(mvn), datasets: [{ label: 'Brent', data: intl.brent.map(p => p.v), backgroundColor: intl.brent.map(p => (yoyAt(intl.brent, p.d) ?? 0) > 20 ? C.red : C.blue), dp: 1, unit: ' USD' }] },
    options: { plugins: { legend: { display: false } }, scales: { y: numAxis('USD/thùng') } } });
}

/* ---- Nội địa ---- */
/* ---- Thị trường tiền tệ: VNIBOR VND vs VNIBOR USD vs SOFR theo kỳ hạn (VIRA Market Watch, tự cập nhật) ---- */
const VR = window.VIRA_DATA || { d: [], vnd: {}, usd: {}, sofr: {}, src: {} };
const MT = ['ON', '1W', '2W', '1M', '2M', '3M', '6M', '9M', '1Y'];
const SOFR_AT = { ON: null, '1W': 'SW', '2W': '2W', '1M': '1M', '2M': null, '3M': '3M', '6M': '6M', '9M': '9M', '1Y': '1Y' };
const mmIdx = (back = 0) => {   // phiên gần nhất cách `back` ngày (không lùi quá 7 ngày so với mốc, tránh lấy nhầm phiên quá cũ khi chuỗi thưa)
  const n = VR.d.length - 1; if (n < 0) return -1; if (!back) return n;
  const t = new Date(VR.d[n]); t.setDate(t.getDate() - back); const ts = t.toISOString().slice(0, 10); t.setDate(t.getDate() - 7); const lo = t.toISOString().slice(0, 10);
  let i = n; while (i > 0 && VR.d[i] > ts) i--; return VR.d[i] <= ts && VR.d[i] >= lo ? i : -1; };
const mmV = (c, t, i) => i < 0 || !VR[c][t] ? null : VR[c][t][i];
const mmCurve = (c, i) => MT.map(t => c === 'sofr' ? (SOFR_AT[t] ? mmV('sofr', SOFR_AT[t], i) : null) : mmV(c, t, i));
const mmSp = (t, i) => { const a = mmV('vnd', t, i), b = mmV('usd', t, i); return a == null || b == null ? null : +(a - b).toFixed(2); };
function mmDep() {   // mức VND mất giá so với USD (NHTM bán ra): 12 tháng và 3 tháng quy năm → "điểm hòa vốn" của chênh lãi suất
  const a = dom.nhtmSell; if (!a || a.length < 13) return {};
  const l = lastv(a), y = a[a.length - 13], q = a[a.length - 4];
  return { d: l.d, y12: (l.v / y.v - 1) * 100, m3: ((l.v / q.v) ** 4 - 1) * 100 };
}
function subMM() {
  if (!VR.d.length) return `<div class="banner">Chưa có số liệu VIRA — đang chờ lần tải đầu tiên.</div>`;
  const i = mmIdx(), w = mmIdx(7), m = mmIdx(30), dep = mmDep(), d = VR.d[i];
  const sp3 = mmSp('3M', i), sp3w = mmSp('3M', w), sp1y = mmSp('1Y', i), spOn = mmSp('ON', i);
  const prem = mmV('usd', '3M', i) != null && mmV('sofr', '3M', i) != null ? mmV('usd', '3M', i) - mmV('sofr', '3M', i) : null;
  const be = dep.y12, hold = sp1y != null && be != null ? sp1y - be : null;
  const rows = MT.map(t => { const v = mmV('vnd', t, i), u = mmV('usd', t, i), s = mmSp(t, i), sw = mmSp(t, w), sm = mmSp(t, m), so = SOFR_AT[t] ? mmV('sofr', SOFR_AT[t], i) : null;
    const dv = (a, b) => a == null || b == null ? '—' : sg((a - b) * 100, 0, '');
    return `<tr><td><b>${t}</b></td><td class="n">${nf(v, 2)}</td><td class="n">${dv(v, mmV('vnd', t, i - 1))}</td><td class="n">${dv(v, mmV('vnd', t, w))}</td><td class="n">${nf(u, 2)}</td><td class="n">${dv(u, mmV('usd', t, w))}</td><td class="n">${nf(so, 2)}</td><td class="n"><b>${s == null ? '—' : sg(s, 2, '')}</b></td><td class="n">${dv(s, sw)}</td><td class="n">${dv(s, sm)}</td></tr>`; }).join('');
  const many = VR.d.length >= 20;
  return `<h3 class="ovh dsec" id="m-vnd">Tỷ giá VND</h3>
  <div class="banner chain">Giữ VND hay USD? So lãi suất liên ngân hàng VND (VNIBOR VND) với USD trong nước (VNIBOR USD) và quốc tế (SOFR) ở từng kỳ hạn · chênh VND − USD phải lớn hơn mức VND mất giá kỳ vọng thì giữ VND mới có lời</div>
  <p class="muted" style="margin:-4px 0 12px">Số liệu phiên ${dvn(d)} · ${VR.d.length} phiên trong kho (từ ${dvn(VR.d[0])}) · tự đọc từ bảng VIRA Market Watch mỗi chiều ngày làm việc, mỗi dòng được kiểm tra chéo bằng đỉnh/đáy 52 tuần trong chính bảng.</p>
  <div class="kpis">
    ${kpi('VNIBOR VND qua đêm', pc(mmV('vnd', 'ON', i), 2), `1W ${pc(mmV('vnd', '1W', i), 2)} · ${sg((mmV('vnd', 'ON', i) - mmV('vnd', 'ON', w)) * 100, 0, ' bps')} 1 tuần`)}
    ${kpi('VNIBOR VND 3 tháng', pc(mmV('vnd', '3M', i), 2), `1Y ${pc(mmV('vnd', '1Y', i), 2)}`)}
    ${kpi('VNIBOR USD 3 tháng', pc(mmV('usd', '3M', i), 2), `SOFR 3M ${pc(mmV('sofr', '3M', i), 2)}`)}
    ${kpi('Chênh VND − USD 3M', sg(sp3, 2, ' đ%'), `${sp3w == null ? '' : sg((sp3 - sp3w) * 100, 0, ' bps') + ' 1 tuần · '}qua đêm ${sg(spOn, 2, '')}`, sp3 != null && sp3 < 1 ? 'neg' : '')}
    ${kpi('USD/VND 12 tháng', sg(be, 2), `${be < 0 ? 'VND tăng giá' : 'VND mất giá'} · 3 tháng quy năm ${sg(dep.m3, 1)} · NHTM bán ra`, be > 3 ? 'neg' : be < 0 ? 'pos' : '')}
    ${kpi('Lợi thế giữ VND 1 năm', sg(hold, 2, ' đ%'), 'chênh 1Y − thay đổi USD/VND 12T (nhìn lại)', hold != null && hold < 0 ? 'neg' : 'pos')}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'mmCurve', title: 'Đường cong lãi suất liên ngân hàng theo kỳ hạn', sub: `%/năm · phiên ${dvn(d)} so với 1 tuần và 1 tháng trước · SOFR kỳ hạn SW đặt ở cột 1W`,
      insight: mmCurveIns(i, w, m), src: 'Nguồn: VIRA Market Watch (VNIBOR do NHNN công bố; SOFR kỳ hạn) · ' + mmLink() })}
    ${card({ id: 'mmSpread', title: 'Chênh VND − USD theo kỳ hạn: lợi suất thêm khi giữ VND', sub: 'điểm % · cột = VNIBOR VND − VNIBOR USD hôm nay và 1 tháng trước · đường đỏ = thay đổi USD/VND 12 tháng (điểm hòa vốn nếu tỷ giá đi tiếp như vậy)',
      insight: mmSpreadIns(i, dep), src: 'Nguồn: VIRA Market Watch; tỷ giá NHTM bán ra (NHNN) · ' + mmLink() })}
    ${card({ id: 'mmSpTs', title: 'Chênh VND − USD theo thời gian', sub: `điểm %, theo phiên · qua đêm, 1 tháng, 3 tháng, 1 năm${many ? '' : ' · đang nạp lịch sử'}`, h: 'tall',
      src: 'Nguồn: VIRA Market Watch' })}
    ${card({ id: 'mmFx', title: 'Tỷ giá USD/VND Vietcombank theo ngày', sub: 'VND · giá mua tiền mặt và bán ra · tích luỹ mỗi ngày làm việc từ 16/10/2026', src: 'Vietcombank (tỷ giá công bố)' })}
    ${card({ id: 'mmLvTs', title: 'VNIBOR VND, VNIBOR USD và SOFR theo thời gian', sub: '%/năm, theo phiên · VND qua đêm, 1M, 3M, 1Y; USD 3M; SOFR 3M', h: 'tall',
      src: 'Nguồn: VIRA Market Watch' })}
    ${card({ id: 'mmUsCurve', title: 'Đường cong lợi suất trái phiếu Kho bạc Mỹ', h: 'tall', sub: '%/năm theo kỳ hạn 1 tháng – 30 năm · hôm nay so với 1 tuần, 1 tháng trước, đầu năm và 1 năm trước',
      insight: usCurveIns(), src: 'U.S. Treasury (Daily Treasury Par Yield Curve)' })}
  </div>
  <article class="card"><h3 class="sub">Bảng kỳ hạn · phiên ${dvn(d)}</h3><p class="chart-sub">%/năm · thay đổi tính bằng bps · "1T" = so với phiên gần nhất cách 1 tuần, "1Th" = 1 tháng</p>
    <div class="tscroll"><table><thead><tr><th>Kỳ hạn</th><th class="n">VND</th><th class="n">Δ phiên</th><th class="n">Δ 1T</th><th class="n">USD</th><th class="n">Δ 1T</th><th class="n">SOFR</th><th class="n">VND − USD</th><th class="n">Δ 1T</th><th class="n">Δ 1Th</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="src">Nguồn: VIRA Market Watch · ${mmLink()}</div></article>
  <p class="muted">Cách đọc: chênh VND − USD dương và lớn hơn mức VND mất giá kỳ vọng → nắm giữ VND có lợi hơn (đường đỏ dùng mức thay đổi tỷ giá 12 tháng qua làm mốc tham chiếu, không phải dự báo) (tiền chảy vào VND, đỡ tỷ giá). Chênh co lại hoặc thấp hơn mức mất giá → động cơ giữ USD tăng, áp lực lên tỷ giá. VNIBOR USD cao hơn SOFR = USD trong nước khan hơn quốc tế.${prem != null ? ` Hiện VNIBOR USD 3M ${prem >= 0 ? 'cao' : 'thấp'} hơn SOFR 3M <b>${nf(Math.abs(prem) * 100, 0)} bps</b>.` : ''}</p>
  ${subFxIntl()}`;
}
/* ---------- Tỷ giá quốc tế (ECB theo ngày; vàng Stooq, dự phòng WiData) ---------- */
// [mã, tên, chuỗi, đảo (USD/xxx → giá trị đồng tiền tính bằng USD), cách niêm yết]
const FXG = {
  g7: { t: 'Nhóm G7', s: [['EUR', 'EUR', 'eurusd_d', false, 'EUR/USD'], ['JPY', 'JPY', 'usdjpy_d', true, 'USD/JPY'], ['GBP', 'GBP', 'gbpusd_d', false, 'GBP/USD'], ['CAD', 'CAD', 'usdcad_d', true, 'USD/CAD'], ['USD', 'USD (DXY)', 'dxy_d', false, 'DXY']] },
  safe: { t: 'Nhóm trú ẩn an toàn', s: [['USD', 'USD (DXY)', 'dxy_d', false, 'DXY'], ['JPY', 'JPY', 'usdjpy_d', true, 'USD/JPY'], ['CHF', 'CHF', 'usdchf_d', true, 'USD/CHF'], ['XAU', 'Vàng', 'gold', false, 'XAU/USD'], ['OIL', 'Dầu Brent', 'us_brent_d', false, 'Brent (USD/thùng)']] },
  apac: { t: 'Nhóm châu Á – Thái Bình Dương', s: [['CNY', 'CNY', 'usdcny_d', true, 'USD/CNY'], ['INR', 'INR', 'usdinr_d', true, 'USD/INR'], ['SGD', 'SGD', 'usdsgd_d', true, 'USD/SGD'], ['IDR', 'IDR', 'usdidr_d', true, 'USD/IDR'], ['VND', 'VND', 'vnd', true, 'USD/VND']] } };
const FXC = { EUR: C.navy, JPY: C.red, GBP: C.purple, CAD: C.tealInk, USD: C.grey, CHF: '#7a5bb5', XAU: C.gold, CNY: C.red, INR: '#e07b39', SGD: C.tealInk, IDR: C.purple, VND: C.navy, OIL: '#3f4656' };
function fxRaw(key) {   // {d:[], v:[]} theo ngày, giá niêm yết gốc
  if (key === 'gold') { const g = gs('gold_d'); if (g.d.length > 200) return g; const w = D.goldWi || []; return { d: w.map(p => p.d), v: w.map(p => p.v) }; }
  if (key === 'vnd') { const a = (dom.nhtmD && dom.nhtmD.length ? dom.nhtmD : dom.nhtmSell || []); return { d: a.map(p => p.d), v: a.map(p => p.v) }; }
  return gs(key);
}
function fxAxis(keys) {   // trục ngày chung (ngày có số ECB/DXY), từ 2021
  const base = gs('eurusd_d').d.length ? gs('eurusd_d') : gs('dxy_d');
  return base.d.filter(d => d >= '2021-01-01');
}
function fxAlign(key, inv, days) {
  if (key === 'gold' && gs('gold_d').d.length <= 200) {   // vàng từ WiData (tháng/tuần/ngày): nội suy tuyến tính giữa các điểm có số
    const r = fxRaw('gold'), t = r.d.map(d => +new Date(d)); let j = 0;
    return days.map(d => { const x = +new Date(d); while (j + 1 < t.length && t[j + 1] <= x) j++;
      if (!t.length || x < t[0]) return null; if (j + 1 >= t.length) return x - t[j] <= 5 * 864e5 ? r.v[j] : null;
      return r.v[j] + (r.v[j + 1] - r.v[j]) * (x - t[j]) / (t[j + 1] - t[j]); });
  }   // giá trị đồng tiền tính theo USD (đảo nếu cần), lấp ngày thiếu bằng số gần nhất (tối đa 8 ngày; vàng tháng tối đa 40)
  const r = fxRaw(key), out = [], maxGap = key === 'gold' && gs('gold_d').d.length <= 200 ? 40 : key === 'vnd' ? 10 : 8; let j = -1;
  for (const d of days) { while (j + 1 < r.d.length && r.d[j + 1] <= d) j++;
    const ok = j >= 0 && r.v[j] != null && (new Date(d) - new Date(r.d[j])) / 864e5 <= maxGap; out.push(ok ? (inv ? 1 / r.v[j] : r.v[j]) : null); }
  return out;
}
function fxChg(key, inv, back) {   // % thay đổi giá trị đồng tiền so với USD (dương = mạnh lên) trong khoảng 'back' ngày hoặc từ đầu năm
  const r = fxRaw(key); if (!r.d.length) return null; let n = r.v.length - 1; while (n >= 0 && r.v[n] == null) n--; if (n < 0) return null;
  const tgt = back === 'ytd' ? r.d[n].slice(0, 4) + '-01-01' : new Date(new Date(r.d[n]) - back * 864e5).toISOString().slice(0, 10);
  let i = back === 'ytd' ? r.d.findIndex(d => d >= tgt) - 1 : r.d.findIndex(d => d > tgt) - 1; if (i < 0) i = back === 'ytd' ? r.d.findIndex(d => d >= tgt) : 0; if (i < 0 || r.v[i] == null) return null;
  const a = inv ? 1 / r.v[i] : r.v[i], b = inv ? 1 / r.v[n] : r.v[n]; return (b / a - 1) * 100;
}
const fxLast = key => { const r = fxRaw(key); let n = r.v.length - 1; while (n >= 0 && r.v[n] == null) n--; return n < 0 ? { d: null, v: null } : { d: r.d[n], v: r.v[n] }; };
function fxIntlIns(g) {
  const S = FXG[g].s.map(([c, n, k, inv]) => ({ c, n, y: fxChg(k, inv, 'ytd'), m: fxChg(k, inv, 30) })).filter(x => x.y != null);
  if (!S.length) return 'Đang nạp số liệu.';
  const o = S.slice().sort((a, b) => b.y - a.y), hi = o[0], lo = o[o.length - 1];
  const tail = { g7: 'USD (DXY) tăng là đồng USD mạnh lên so với rổ 6 đồng tiền; các đồng còn lại dương = mạnh lên so với USD.',
    safe: 'Khi rủi ro toàn cầu tăng, dòng tiền thường tìm đến USD, JPY, CHF và vàng; cả nhóm cùng tăng là tín hiệu tâm lý phòng thủ. Vàng tăng mạnh hơn USD cho thấy nhu cầu trú ẩn ngoài hệ thống USD.',
    apac: 'CNY là neo của các đồng tiền châu Á và có ảnh hưởng trực tiếp tới VND qua thương mại; CNY và SGD yếu đi cùng lúc thường làm tăng áp lực lên USD/VND.' }[g];
  return `Từ đầu năm: ${o.map(x => `${x.n} <b>${sg(x.y, 1)}</b>`).join(', ')}. Mạnh nhất <b>${hi.n}</b>, yếu nhất <b>${lo.n}</b>; 1 tháng qua ${S.map(x => `${x.n} ${sg(x.m, 1)}`).join(', ')}.` + how(tail);
}
function subFxIntl() {
  const rows = [];
  const seen = new Set();
  Object.values(FXG).forEach(G => G.s.forEach(([c, n, k, inv, q]) => { if (seen.has(q)) return; seen.add(q); const l = fxLast(k);
    rows.push(`<tr><td><b>${q}</b></td><td class="n">${l.v == null ? '—' : nf(l.v, k === 'gold' || k === 'vnd' || k === 'usdidr_d' ? 0 : k === 'dxy_d' || k === 'usdjpy_d' || k === 'usdinr_d' || k === 'us_brent_d' ? 2 : 4)}</td>${[7, 30, 'ytd', 365].map(b => { const v = fxChg(k, inv, b); return `<td class="n" style="color:${v == null ? '' : (k === 'dxy_d' ? v < 0 : v > 0) ? '#1e8f5a' : '#c0392b'}">${v == null ? '—' : sg(v, 1)}</td>`; }).join('')}<td class="muted">${l.d ? dvn(l.d) : ''}</td></tr>`); }));
  return `<h3 class="ovh dsec" id="m-intl">Tỷ giá quốc tế</h3>
  <article class="card"><h3 class="sub">Bảng tỷ giá quốc tế</h3><p class="chart-sub">giá niêm yết gần nhất · % thay đổi giá trị đồng tiền so với USD (xanh = mạnh lên so với USD; riêng DXY xanh = USD yếu đi; vàng, Brent xanh = giá tăng)</p>
    <div class="tscroll"><table><thead><tr><th>Cặp</th><th class="n">Hiện tại</th><th class="n">1 tuần</th><th class="n">1 tháng</th><th class="n">Từ đầu năm</th><th class="n">1 năm</th><th>Ngày</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
    <div class="src">Nguồn: ECB (tỷ giá tham chiếu, tính chéo theo USD); DXY theo công thức ICE; vàng: Stooq (XAU/USD) hoặc WiData 74407 (CME); USD/VND: NHTM bán ra.</div></article>
  <div class="grid g2 gap">
    ${['g7', 'apac'].map(g => card({ id: 'fxI_' + g, title: FXG[g].t + ': ' + FXG[g].s.map(x => x[1]).join(', '), h: 'tall',
      sub: '% thay đổi từ đầu khung đang xem, theo ngày · dương = đồng tiền mạnh lên so với USD (USD theo DXY; vàng theo giá USD/ounce) · đổi khung bằng nút 1M–5Y',
      insight: fxIntlIns(g), src: 'ECB · DXY tính theo công thức ICE' + (g === 'safe' ? ' · vàng: Stooq / WiData' : g === 'apac' ? ' · USD/VND: NHTM bán ra (WiData)' : '') })).join('')}
    </div>
  <h3 class="sec2">Nhóm trú ẩn an toàn — so với DXY (nét đứt, trục phải)</h3>
  <div class="grid g2 gap">
    ${SAFE.map(([id, t, k, u]) => card({ id: 'fxS_' + id, title: t, h: 'tall', sub: `${u} theo ngày (trục trái) · nét đứt xám = DXY (trục phải) để tham chiếu sức mạnh đồng USD`,
      insight: safeIns(id), src: { jpy: 'ECB · can thiệp: Bộ Tài chính Nhật (FEIO), tháng 7–8/2026 ước tính', chf: 'ECB', xau: 'Stooq (XAU/USD) hoặc WiData 74407 (CME)', oil: 'EIA qua FRED (Brent và WTI giao ngay)' }[id] + ' · DXY tính theo công thức ICE từ tỷ giá ECB' })).join('')}
</div>`;
}
const SAFE = [['jpy', 'USD/JPY', 'usdjpy_d', 'JPY cho 1 USD'], ['xau', 'Vàng XAU/USD', 'gold', 'USD/ounce'], ['chf', 'USD/CHF', 'usdchf_d', 'CHF cho 1 USD'], ['oil', 'Dầu Brent và WTI', 'us_brent_d', 'USD/thùng']];
function corr(a, b) { const n = a.length; if (n < 10) return null; const ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let c = 0, va = 0, vb = 0; for (let i = 0; i < n; i++) { c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; } return va && vb ? c / Math.sqrt(va * vb) : null; }
function bwIns() {   // chênh lệch Brent − WTI
  const B = gs('us_brent_d'), W = gs('us_wti_d'), wm = new Map(W.d.map((d, i) => [d, W.v[i]]));
  const sp = B.d.map((d, i) => [d, B.v[i] != null && wm.get(d) != null ? B.v[i] - wm.get(d) : null]).filter(x => x[1] != null); if (!sp.length) return '';
  const [d0, now] = sp[sp.length - 1], wl = wm.get(d0), avg = from => { const r = sp.filter(x => x[0] >= from); return r.length ? r.reduce((a, x) => a + x[1], 0) / r.length : null; };
  const back = n => new Date(new Date(d0) - n * 864e5).toISOString().slice(0, 10), m1 = avg(back(30)), y1 = avg(back(365)), y5 = avg(back(1826));
  return ` WTI <b>${nf(wl, 2)} USD/thùng</b>; chênh lệch Brent − WTI <b>${sg(now, 2, ' USD')}</b> (bình quân 1 tháng ${nf(m1, 2)}, 1 năm ${nf(y1, 2)}, 5 năm ${nf(y5, 2)} USD)${m1 != null && Math.abs(now - m1) > 2 ? ` — ${now < m1 ? '<b>thu hẹp mạnh</b>' : '<b>nới rộng mạnh</b>'} so với bình quân 1 tháng` : ''}. ${now > y5 + 1.5 ? 'Chênh lệch đang rộng hơn bình thường: rủi ro nằm ở nguồn cung đường biển (Trung Đông, eo Hormuz, Biển Đỏ) hơn là thị trường nội địa Mỹ.' : now < y5 - 1.5 ? 'Chênh lệch hẹp hơn bình thường: thị trường Mỹ đang căng hơn (tồn kho tại Cushing thấp hoặc xuất khẩu dầu Mỹ tăng mạnh).' : 'Chênh lệch quanh mức bình thường: hai loại dầu đang cùng chịu một lực chung về cung cầu toàn cầu.'}`;
}
function safeIns(id) {
  const [, t, k, u] = SAFE.find(x => x[0] === id), l = fxLast(k); if (l.v == null) return 'Đang nạp số liệu.';
  const lv = b => { const r = fxRaw(k); let n = r.v.length - 1; while (n >= 0 && r.v[n] == null) n--; const tgt = b === 'ytd' ? r.d[n].slice(0, 4) + '-01-01' : new Date(new Date(r.d[n]) - b * 864e5).toISOString().slice(0, 10);
    let i = r.d.findIndex(d => d >= tgt); i = i > 0 ? i - 1 : Math.max(0, i); return i < 0 || r.v[i] == null ? null : (r.v[n] / r.v[i] - 1) * 100; };
  const y = lv('ytd'), m = lv(30), dy = fxChg('dxy_d', false, 'ytd'), dm = fxChg('dxy_d', false, 30);
  const days = fxAxis().slice(-61), a = fxAlign(k, false, days), b = fxAlign('dxy_d', false, days), ra = [], rb = [];
  for (let i = 1; i < days.length; i++) if (a[i] != null && a[i - 1] != null && b[i] != null && b[i - 1] != null && a[i] !== a[i - 1]) { ra.push(a[i] / a[i - 1] - 1); rb.push(b[i] / b[i - 1] - 1); }
  const r = id === 'xau' && gs('gold_d').d.length <= 200 ? null : corr(ra, rb);
  const read = { jpy: `USD/JPY ${y > 0 ? 'tăng' : 'giảm'} = JPY ${y > 0 ? 'yếu đi' : 'mạnh lên'} so với USD. JPY chỉ đóng vai trò trú ẩn khi chênh lợi suất Mỹ – Nhật thu hẹp; khi lợi suất Mỹ ở mức cao, JPY thường yếu dù thị trường căng thẳng.`,
    chf: `USD/CHF ${y > 0 ? 'tăng' : 'giảm'} = CHF ${y > 0 ? 'yếu đi' : 'mạnh lên'} so với USD. CHF mạnh lên cùng lúc DXY tăng là dấu hiệu dòng tiền phòng thủ thật sự, không chỉ do USD.`,
    xau: 'Vàng thường đi ngược DXY và lợi suất thực của Mỹ; vàng tăng trong khi DXY cũng tăng cho thấy nhu cầu trú ẩn vượt trội hơn tác động của USD mạnh.',
    oil: 'Brent (dầu Biển Bắc, giao bằng tàu biển) là giá chuẩn cho khoảng 2/3 giao dịch dầu thế giới và phản ánh rủi ro địa chính trị trên tuyến vận tải biển; WTI (giao tại Cushing, Oklahoma) phản ánh cung cầu nội địa Mỹ: sản lượng dầu đá phiến, tồn kho và năng lực đường ống. Brent thường cao hơn WTI vài USD do chi phí vận chuyển dầu Mỹ ra cảng xuất khẩu. Việt Nam và châu Á nhập khẩu theo giá Brent/Dubai nên Brent sát hơn với chi phí xăng dầu và CPI trong nước. Dầu không phải tài sản trú ẩn nhưng là nguồn rủi ro lạm phát: dầu tăng cùng USD mạnh làm chi phí nhập khẩu tăng gấp đôi, tạo áp lực lên tỷ giá và CPI.' }[id];
  let zt = '';
  if (id === 'oil') zt = bwIns();
  if (id === 'jpy') { const dd = fxAxis(), z = jpiZone(jpiPts(dd, fxAlign(k, false, dd)));
    if (z) zt = ` Trong 12 tháng qua Nhật can thiệp <b>${z.n} lần</b> (${dvn(z.d0)}–${dvn(z.d1)}), tổng ~¥${nf(z.t, 1)} nghìn tỷ ≈ <b>US$${nf(z.usd, 0)} tỷ</b>, khi USD/JPY ở vùng <b>${nf(z.lo, 1)}–${nf(z.hi, 1)}</b> (vùng tô xanh). Mức hiện tại ${l.v > z.hi ? `<b>đã vượt đỉnh vùng</b> ${nf(l.v - z.hi, 1)} yên → rủi ro can thiệp rất cao` : l.v >= z.lo ? `<b>nằm trong vùng</b>, cách đỉnh ${nf(z.hi - l.v, 1)} yên → càng tiến gần đỉnh, khả năng Nhật ra tay càng lớn` : `thấp hơn đáy vùng ${nf(z.lo - l.v, 1)} yên → áp lực can thiệp chưa lớn`}.`; }
  return `${dvn(l.d)}: <b>${nf(l.v, id === 'xau' ? 0 : 2)} ${u}</b> — ${sg(m, 1)} 1 tháng, <b>${sg(y, 1)}</b> từ đầu năm (DXY ${sg(dm, 1)} và ${sg(dy, 1)}).${r != null ? ` Tương quan biến động ngày với DXY trong 60 phiên: <b>${nf(r, 2)}</b> (${Math.abs(r) < 0.2 ? 'gần như không liên quan' : r > 0 ? 'cùng chiều' : 'ngược chiều'}).` : ''}${zt}` + how(read + (id === 'jpy' ? ' Chấm xanh đậm là ngày Bộ Tài chính Nhật bán USD mua JPY (số liệu công bố chính thức; tháng 7–8/2026 là ước tính vì chưa có số theo ngày); số USD quy đổi theo tỷ giá đóng cửa ngày đó.' : ''));
}
/* Can thiệp tỷ giá của Bộ Tài chính Nhật (bán USD, mua JPY). t = nghìn tỷ yên; e = ước tính thị trường (chưa có số theo ngày). Nguồn: MoF Nhật (FEIO) */
const JPI = [['2022-09-22', 2.8382], ['2022-10-21', 5.6202], ['2022-10-24', 0.7296],
  ['2024-04-29', 5.9185], ['2024-05-01', 3.87], ['2024-07-11', 3.1678], ['2024-07-12', 2.367],
  ['2026-04-30', 6.2787], ['2026-05-04', 0.7802], ['2026-05-06', 4.6759],
  ['2026-07-30', 6, 'Ước tính thị trường từ số dư tài khoản BOJ'],
  ['2026-07-31', 9.4, 'Phối hợp Mỹ – Nhật; phần còn lại của tổng 15,4 nghìn tỷ yên (30/07–26/08)']];
function jpiPts(days, lv) {   // điểm can thiệp trên trục ngày, kèm quy đổi USD theo tỷ giá đóng cửa của ngày đó
  return JPI.map(([d, t, e]) => { const i = days.findIndex(x => x >= d); if (i < 0 || lv[i] == null) return null;
    return { i, d, t, e, v: lv[i], usd: t * 1e3 / lv[i] }; }).filter(Boolean);
}
function jpiZone(pts) {   // vùng can thiệp 12 tháng gần nhất: từ chấm thấp nhất tới chấm cao nhất
  const cut = new Date(new Date(TODAY) - 365 * 864e5).toISOString().slice(0, 10), r = pts.filter(p => p.d >= cut);
  return r.length ? { lo: Math.min(...r.map(p => p.v)), hi: Math.max(...r.map(p => p.v)), n: r.length, t: r.reduce((a, p) => a + p.t, 0), usd: r.reduce((a, p) => a + p.usd, 0), d0: r[0].d, d1: r[r.length - 1].d } : null;
}
const jpiBand = { id: 'jpiBand', beforeDatasetsDraw(ch, _a, o) {
  if (!o || o.lo == null) return; const { ctx, chartArea: a } = ch, y = ch.scales.y;
  const t = Math.max(a.top, y.getPixelForValue(o.hi)), b = Math.min(a.bottom, y.getPixelForValue(o.lo)); if (b <= a.top || t >= a.bottom) return;
  ctx.save(); ctx.fillStyle = 'rgba(40,60,130,0.08)'; ctx.fillRect(a.left, t, a.right - a.left, Math.max(b - t, 2));
  ctx.strokeStyle = 'rgba(40,60,130,0.35)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
  [t, b].forEach(p => { ctx.beginPath(); ctx.moveTo(a.left, p); ctx.lineTo(a.right, p); ctx.stroke(); });
  ctx.fillStyle = 'rgba(30,45,110,0.9)'; ctx.font = '600 10px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.fillText(`Vùng can thiệp 12 tháng: ${nf(o.lo, 1)}–${nf(o.hi, 1)}`, a.left + 6, t - 2); ctx.restore();
} };
function chSafe() {
  const days = fxAxis(); if (!days.length) return;
  const dxy = fxAlign('dxy_d', false, days);
  SAFE.forEach(([id, t, k, u]) => { if (!document.getElementById('fxS_' + id)) return;
    const lv = fxAlign(k, false, days), ex = [], pl = {};
    if (id === 'oil') ex.push(L('Dầu WTI', fxAlign('us_wti_d', false, days), '#D9822B', { borderWidth: 1.8, dp: 2, unit: '', yAxisID: 'y' }));
    if (id === 'jpy') { const P = jpiPts(days, lv), z = jpiZone(P), m = new Map(P.map(p => [p.i, p]));
      ex.push(L('Can thiệp của Nhật', days.map((_, i) => m.has(i) ? m.get(i).v : null), C.navy, { showLine: false, pointRadius: 5, pointHoverRadius: 7, pointStyle: 'circle', backgroundColor: C.navy, pointBorderColor: '#fff', pointBorderWidth: 1.5, pointHoverBorderWidth: 1.5, yAxisID: 'y', dp: 2, unit: '',
        $tip: i => { const p = m.get(i); return p ? [`Can thiệp ${dvn(p.d)}${p.e ? ' (ước tính)' : ''}: ~¥${nf(p.t, 2)} nghìn tỷ ≈ US$${nf(p.usd, 1)} tỷ`, `USD/JPY đóng cửa ${nf(p.v, 2)}`, ...(p.e ? [p.e] : [])] : ''; } }));
      if (z) pl.jpiBand = z;
      const lp = P[P.length - 1]; if (lp) pl.refLines = { lines: [{ value: lp.v, axis: 'y', color: C.red, width: 1.6, dash: [6, 4], label: `Can thiệp gần nhất ${dvn(lp.d)}: ${nf(lp.v, 2)}` }] }; }
    mk('fxS_' + id, { type: 'line', plugins: id === 'jpy' ? [jpiBand] : [], data: { labels: days.map(dvn), datasets: [
        L(id === 'oil' ? 'Dầu Brent' : t, lv, FXC[{ jpy: 'JPY', xau: 'XAU', chf: 'CHF', oil: 'OIL' }[id]], { borderWidth: 2, dp: id === 'xau' ? 0 : 2, unit: '', yAxisID: 'y' }), ...ex,
        L('DXY (tham chiếu)', dxy, C.grey, { borderWidth: 1.4, borderDash: [5, 4], dp: 2, unit: '', yAxisID: 'y1' })] },
      options: { plugins: pl, scales: { x: { ticks: { maxTicksLimit: 10 } }, y: numAxis(u, { beginAtZero: false, ticks: { callback: v => nf(v, id === 'chf' ? 3 : id === 'xau' ? 0 : 1) } }), y1: numAxis('DXY', { position: 'right', beginAtZero: false, grid: { display: false } }) } } }, { win: 12 });
  });
}
const fxRebase = { id: 'fxRebase', beforeUpdate(ch) {   // quy về % thay đổi so với điểm đầu khung đang xem
  const lo = Math.max(0, Math.round((ch.options.scales.x || {}).min ?? 0));
  ch.data.datasets.forEach(d => { const r = d.$raw; if (!r) return; let i = lo; while (i < r.length && r[i] == null) i++;
    d.data = r.map((v, j) => v == null || j < i || i >= r.length ? null : +((v / r[i] - 1) * 100).toFixed(3)); });
} };
function chFxIntl() {
  const days = fxAxis(); if (!days.length) return;
  chSafe();
  ['g7', 'apac'].forEach(g => {
    if (!document.getElementById('fxI_' + g)) return;
    mk('fxI_' + g, { type: 'line', plugins: [fxRebase], data: { labels: days.map(dvn), datasets: FXG[g].s.map(([c, n, k, inv]) => ({ label: n, $raw: fxAlign(k, inv, days), data: [],
        borderColor: FXC[c], backgroundColor: FXC[c], borderWidth: c === 'USD' ? 2.4 : c === 'VND' ? 2.4 : 1.6, borderDash: c === 'USD' && g !== 'safe' ? [5, 4] : [], pointRadius: 0, spanGaps: true, dp: 2, unit: '%' })) },
      options: { scales: { x: { ticks: { maxTicksLimit: 10 } }, y: { ticks: { callback: v => nf(v, 0) + '%' }, grid: { color: '#eef0f4' } } }, plugins: { refLines: { lines: [{ value: 0, label: '', color: C.grey }] } } } }, { win: 12 });
  });
}
function drUsCurve(id) {
  const U = GD.ustCurve; if (!U || !document.getElementById(id)) return;
  mk(id, { type: 'line', data: { labels: U.t, datasets: U.c.map((c, i) => L(`${c.n} (${dvn(c.d)})`, c.v, [C.navy, C.teal, C.tealInk, C.red, C.grey][i] || C.grey,
    { pointRadius: i ? 2 : 3, borderWidth: i ? 1.6 : 2.8, borderDash: i === 1 ? [2, 2] : i === 4 ? [5, 4] : [], dp: 2 })) }, options: { scales: { y: pctAxis('', { beginAtZero: false }) } } });
}
function usCurveIns() {
  const U = GD.ustCurve; if (!U) return '';
  const iy = t => U.t.indexOf(t), c = n => U.c.find(x => x.n === n), cur = U.c[0];
  const d = (a, t) => a && a.v[iy(t)] != null && cur.v[iy(t)] != null ? (cur.v[iy(t)] - a.v[iy(t)]) * 100 : null;
  const w = c('1 tuần trước'), m = c('1 tháng trước'), y = c('Đầu năm'), y1 = c('1 năm trước');
  const s210 = cur.v[iy('10Y')] - cur.v[iy('2Y')], s3m = cur.v[iy('10Y')] - cur.v[iy('3M')];
  return `${dvn(cur.d)}: 2 năm <b>${pc(cur.v[iy('2Y')], 2)}</b>, 10 năm <b>${pc(cur.v[iy('10Y')], 2)}</b>, 30 năm ${pc(cur.v[iy('30Y')], 2)}. Thay đổi 10 năm: ${sg(d(w, '10Y'), 0, ' bps')} 1 tuần, ${sg(d(m, '10Y'), 0, ' bps')} 1 tháng, ${sg(d(y, '10Y'), 0, ' bps')} từ đầu năm, ${sg(d(y1, '10Y'), 0, ' bps')} 1 năm; 2 năm ${sg(d(y, '2Y'), 0, ' bps')} từ đầu năm. Độ dốc 10 năm − 2 năm <b>${sg(s210 * 100, 0, ' bps')}</b>, 10 năm − 3 tháng ${sg(s3m * 100, 0, ' bps')}.`
    + how('Đầu dài (10–30 năm) tăng nhanh hơn đầu ngắn là dấu hiệu nhà đầu tư đòi bù rủi ro kỳ hạn cao hơn (lạm phát, thâm hụt ngân sách), không chỉ do kỳ vọng Fed. Lợi suất USD cao giữ chênh lệch lãi suất VND − USD hẹp, hạn chế dư địa NHNN hạ lãi suất.');
}

function mmLink() { const k = VR.d[VR.d.length - 1], u = VR.src && VR.src[k]; return u ? `<a href="${esc(u)}" target="_blank" rel="noopener">số ${dvn(k)}</a>` : ''; }
function drMmCurve(id) {
  if (!VR.d.length || !document.getElementById(id)) return;
  const i = mmIdx(), w = mmIdx(7), m = mmIdx(30);
  mk(id, { type: 'line', data: { labels: MT, datasets: [
    L('VND ' + dvn(VR.d[i]).slice(0, 5), mmCurve('vnd', i), C.navy, { borderWidth: 2.6, pointRadius: 3 }),
    ...(w >= 0 && w !== i ? [L('VND ' + dvn(VR.d[w]).slice(0, 5), mmCurve('vnd', w), C.navy, { borderDash: [5, 4], borderWidth: 1.4, pointRadius: 2 })] : []),
    ...(m >= 0 && m !== w ? [L('VND ' + dvn(VR.d[m]).slice(0, 5), mmCurve('vnd', m), C.grey, { borderDash: [2, 3], borderWidth: 1.4, pointRadius: 2 })] : []),
    L('USD ' + dvn(VR.d[i]).slice(0, 5), mmCurve('usd', i), C.red, { borderWidth: 2.2, pointRadius: 3 }),
    L('SOFR kỳ hạn', mmCurve('sofr', i), C.gold, { borderWidth: 1.8, pointRadius: 3, borderDash: [6, 3] })] }, options: { scales: { y: pctAxis('') } } });
}
function mmCurveIns(i, w, m) {
  const on = mmV('vnd', 'ON', i), y1 = mmV('vnd', '1Y', i), onW = mmV('vnd', 'ON', w), y1M = mmV('vnd', '1Y', m);
  const slope = y1 != null && on != null ? y1 - on : null;
  return `VND: qua đêm <b>${pc(on, 2)}</b>, 1 năm <b>${pc(y1, 2)}</b> → độ dốc ${sg(slope, 2, ' điểm %')}${onW != null ? `; qua đêm ${on > onW ? 'tăng' : on < onW ? 'giảm' : 'đi ngang'} ${nf(Math.abs(on - onW) * 100, 0)} bps trong 1 tuần` : ''}${y1M != null ? `, 1 năm ${sg((y1 - y1M) * 100, 0, ' bps')} trong 1 tháng` : ''}. USD gần như phẳng (${pc(mmV('usd', 'ON', i), 2)} → ${pc(mmV('usd', '1Y', i), 2)}). ${slope > 3 ? 'Đường VND rất dốc: tiền ngắn hạn dồi dào nhưng các ngân hàng chấp nhận trả cao để giữ vốn dài — kỳ vọng lãi suất còn tăng hoặc lo thanh khoản cuối năm.' : slope < 1 ? 'Đường VND phẳng: thị trường không kỳ vọng tiền đắt lên.' : ''}`;
}
function mmSpreadIns(i, dep) {
  const sp = MT.map(t => [t, mmSp(t, i)]).filter(x => x[1] != null), be = dep.y12;
  if (!sp.length) return '';
  const above = sp.filter(x => be != null && x[1] > be).map(x => x[0]), mx = sp.reduce((a, b) => b[1] > a[1] ? b : a), mn = sp.reduce((a, b) => b[1] < a[1] ? b : a);
  return `Chênh lớn nhất ở kỳ hạn <b>${mx[0]}</b> (${sg(mx[1], 2, ' điểm %')}), nhỏ nhất ở <b>${mn[0]}</b> (${sg(mn[1], 2, '')}). USD/VND (NHTM bán ra) ${sg(be, 2)} trong 12 tháng, ${sg(dep.m3, 1)} quy năm 3 tháng gần nhất. ${be < 0 ? `VND còn <b>tăng giá</b>, nên cả lãi suất lẫn tỷ giá đều nghiêng về giữ VND ở ${above.length ? 'các kỳ hạn ' + above.join(', ') : 'mọi kỳ hạn chênh dương'}; rủi ro là tỷ giá đảo chiều (Fed tăng lãi suất, cuối năm cầu USD nhập khẩu).` : above.length ? `Ở các kỳ hạn ${above.join(', ')} chênh lãi suất đã bù được mức mất giá này → giữ VND có lời nếu tỷ giá không tăng nhanh hơn.` : 'Chưa kỳ hạn nào bù được mức mất giá 12 tháng → động cơ giữ USD vẫn còn.'} ${mn[1] < 0 ? `Kỳ hạn ${mn[0]} chênh âm: vay VND rẻ hơn vay USD — dễ phát sinh vay VND mua USD.` : ''}`;
}
function chMM() {
  collapsify($('[data-pp="mm"]'), 'mm2', ['m-vnd', 'm-intl'], 'h3.dsec');
  drUsCurve('mmUsCurve'); chFxIntl();
  if (!VR.d.length) return;
  const i = mmIdx(), w = mmIdx(7), m = mmIdx(30), dep = mmDep();
  drMmCurve('mmCurve');
  const today = MT.map(t => mmSp(t, i)), mo = MT.map(t => mmSp(t, m));
  mk('mmSpread', { type: 'bar', data: { labels: MT, datasets: [
    { label: 'Hôm nay', data: today, backgroundColor: today.map(v => v != null && dep.y12 != null && v > dep.y12 ? 'rgba(31,138,141,.85)' : 'rgba(29,38,120,.75)'), unit: ' đ%', dp: 2 },
    ...(m >= 0 && m !== i ? [{ label: '1 tháng trước', data: mo, backgroundColor: 'rgba(154,163,178,.55)', unit: ' đ%', dp: 2 }] : [])] },
    options: { plugins: { refLines: { lines: dep.y12 != null ? [{ value: dep.y12, label: 'USD/VND 12T ' + sg(dep.y12, 2), color: C.red }] : [] } }, scales: { y: { ticks: { callback: v => nf(v, 1) }, grid: { color: '#eef0f4' } } } } });
  const labs = VR.d.map(dvn);
  mk('mmSpTs', { type: 'line', data: { labels: labs, datasets: [['ON', 'Qua đêm', C.grey], ['1M', '1 tháng', C.teal], ['3M', '3 tháng', C.navy], ['1Y', '1 năm', C.purple]].map(([t, n, c]) =>
    L(n, VR.d.map((_, k) => mmSp(t, k)), c, { unit: ' đ%', borderWidth: t === '3M' ? 2.6 : 1.8 })) },
    options: { plugins: { refLines: { lines: dep.y12 != null ? [{ value: dep.y12, label: 'USD/VND 12T', color: C.red }, { value: 0, label: '', color: C.grey }] : [] } }, scales: { y: { ticks: { callback: v => nf(v, 1) }, grid: { color: '#eef0f4' } } } } });
  const vs = gs('usdvnd_vcb_sell'), vb = gs('usdvnd_vcb_buy'), bm = {}; vb.d.forEach((d, i) => bm[d] = vb.v[i]);
  if (vs.d.length) mk('mmFx', { type: 'line', data: { labels: vs.d.map(dvn), datasets: [L('Bán ra', vs.v, C.red, { unit: '', dp: 0, pointRadius: 3 }), L('Mua', vs.d.map(d => bm[d] ?? null), C.navy, { unit: '', dp: 0, pointRadius: 3 })] }, options: { scales: { y: numAxis('', { beginAtZero: false }) } } });
  mk('mmLvTs', { type: 'line', data: { labels: labs, datasets: [
    L('VND qua đêm', VR.vnd.ON || [], C.grey), L('VND 1M', VR.vnd['1M'] || [], C.teal), L('VND 3M', VR.vnd['3M'] || [], C.navy, { borderWidth: 2.6 }), L('VND 1Y', VR.vnd['1Y'] || [], C.purple),
    L('USD 3M', VR.usd['3M'] || [], C.red, { borderWidth: 2.2 }), L('SOFR 3M', VR.sofr['3M'] || [], C.gold, { borderDash: [6, 3] })] }, options: { scales: { y: pctAxis('') } } });
}
function subDom(mode = 'n') {   // 'n' = trang Ngành (Vĩ mô tiền tệ, kèm phần Mỹ thu gọn) · 'v' = trang Vĩ mô (Tiền tệ, kèm thị trường trái phiếu)
  const fxGap = lastv(dom.free).v - lastv(dom.nhtmSell).v;
  const gaps = dom.nhtmSell.filter(p => p.d >= '2021').map(p => { const f = byM(dom.free)[p.d.slice(0, 7)]; return f ? { d: p.d, g: f - p.v } : null; }).filter(Boolean);
  const pk = gaps.reduce((a, b) => b.g > a.g ? b : a);
  const cr = lastv(dom.creditYoY), dp = lastv(dom.depYoY), m2 = lastv(dom.m2);
  const res = lastv(dom.reserves);
  const imp12 = null;
  const fq = dom.revQ.map((p, i) => ({ d: p.d, bal: dom.expQ[i] ? dom.expQ[i].v - p.v : null }));
  const lastF = lastv(fq), lyF = fq.find(f => f.d.slice(5, 7) === lastF.d.slice(5, 7) && +f.d.slice(0, 4) === +lastF.d.slice(0, 4) - 1);
  return `<div class="kpis">
    ${kpi('USD/VND NHTM bán', nf(lastv(dom.nhtmSell).v), `trần ${nf(lastv(dom.ceiling).v)} · cách ${pc((1 - lastv(dom.nhtmSell).v / lastv(dom.ceiling).v) * 100, 1)}`)}
    ${kpi('Tỷ giá tự do', nf(lastv(dom.free).v), `${fxGap >= 0 ? 'cao' : 'thấp'} hơn NHTM ${nf(Math.abs(fxGap))}đ`)}
    ${kpi('LNH qua đêm', pc(lastv(dom.on).v, 2), `${dvn(lastv(dom.on).d)} · OMO ${pc(lastv(dom.omo).v, 1)}`)}
    ${kpi('Tín dụng vs tiền gửi', sg(cr.v - dp.v, 1, ' đ%'), `TD ${pc(cr.v, 1)} (${mvn(cr.d)}) · TG ${pc(dp.v, 1)} (${mvn(dp.d)})`, 'neg')}
    ${kpi('CPI', pc(lastv(dom.cpi).v, 2), `lõi ${pc(lastv(dom.cpiCore).v, 2)} · BQ 9T ${pc(lastv(dom.cpiAvg).v, 2)}`, lastv(dom.cpiAvg).v > 4.5 ? 'neg' : '')}
    ${kpi('Dự trữ ngoại hối', nf(res.v / 1000, 1) + ' tỷ USD', mvn(res.d))}
  </div>
  <h3 class="ovh dsec" id="d-fx">${mode === 'n' ? 'Tỷ giá và tác động từ Mỹ' : 'Tỷ giá'}</h3>
  <div class="grid g2 gap">
    ${card({ id: 'chFx', title: FSFX.TITLE, h: 'tall', sub: FSFX.SUB, insight: FSFX.insight({ nhtmSell: dom.nhtmSell, free: dom.free, freeD: dom.freeD, nhtmD: dom.nhtmD }), src: FSFX.SRC })}
    ${card({ id: 'chFxGap', title: 'Chênh lệch tỷ giá tự do − NHTM bán ra', sub: 'VND · theo ngày từ 07/2025, theo tuần trước đó · dương = USD ngoài hệ thống đắt hơn ngân hàng (kỳ vọng mất giá)',
      insight: fxGapIns(), src: 'WiData 82226, 82223' })}
    ${mode === 'n' ? usMiniCards() : ''}
  </div>
  <h3 class="ovh dsec" id="d-flow">Cung tiền, tín dụng và dòng tiền</h3>
  <div class="grid g2 gap">
    ${card({ id: 'chMoney', title: 'Tín dụng, tiền gửi và M2', sub: '% YoY · tháng · chênh tín dụng − tiền gửi dương = ngân hàng phải tìm thêm nguồn vốn (R-09)', ctl: true,
      insight: `Tín dụng <b>${pc(cr.v, 1)}</b> YoY (${mvn(cr.d)}) so với tiền gửi <b>${pc(dp.v, 1)}</b> (${mvn(dp.d)}) — chênh ${nf(cr.v - dp.v, 1)} điểm %, duy trì 5–6 điểm % từ cuối 2024 (đỉnh 8,7 điểm % tháng 9/2022). M2 chậm lại còn ${pc(m2.v, 1)} (đỉnh 18,8% giữa 2025): tiền mới tạo ra ít hơn trong khi nhu cầu vốn vẫn cao. Lưu ý: số tiền gửi NHNN chưa gồm GTCG, liên ngân hàng (deck slide 58).`,
      src: 'WiData 75847, 265963, 265954' })}
    ${card({ id: 'chCredit', title: 'Tín dụng toàn hệ thống so với đầu năm', sub: '% · tháng · mỗi đường một năm · đường đỏ = chỉ tiêu 2026 ~15%',
      insight: `Đến ${mvn(ytdNow.d)}, tín dụng tăng <b>${pc(ytdNow.v, 2)}</b> so với đầu năm, thấp hơn cùng kỳ ${pc(ytdLY && ytdLY.v, 2)} dù YoY vẫn cao — nhiều khả năng bị giới hạn bởi nguồn vốn (tiền gửi tăng chậm) hơn là room. Cho vay kinh doanh BĐS tăng 19,6% đến cuối tháng 8 (Phó Thống đốc, 14/10).`,
      src: 'WiData 241732; vietnambiz 14/10/2026' })}
    ${card({ id: 'chExt', title: 'Đối ngoại: cán cân thương mại, FDI và dự trữ', sub: 'Tỷ USD · cột = cán cân XNK tháng, đường = FDI giải ngân lũy kế 12 tháng; trục phải = dự trữ ngoại hối',
      insight: `Cán cân thương mại thâm hụt liên tục từ 12/2025 (đáy −5,3 tỷ USD tháng 5) rồi dương lại 09/2026; FDI giải ngân 12 tháng vẫn tăng. Dự trữ ${nf(res.v / 1000, 1)} tỷ USD (${mvn(res.d)}) — thấp hơn mức 109 tỷ đầu 2022, dư địa bán USD can thiệp có hạn.`,
      src: 'WiData 255693, 76951, 76885' })}
    ${card({ id: 'chFiscal', title: 'Tài khóa: chi − thu ngân sách theo quý', sub: 'Nghìn tỷ đồng · dương = Kho bạc bơm tiền ra hệ thống (R-12) · quý 4 luôn chi lớn theo mùa vụ',
    insight: `${mvn(lastF.d).replace(/^0?(\d+)\//, (m, a) => 'Q' + Math.ceil(a / 3) + '/')}: chi − thu <b>${nf(lastF.bal / 1000, 1)} nghìn tỷ</b> (cùng kỳ ${nf(lyF ? lyF.bal / 1000 : null, 1)}) — ${lastF.bal > 0 ? 'chi vượt thu, Kho bạc đang đưa tiền ra hệ thống' : 'thu vượt chi, Kho bạc đang hút tiền về'}. Chưa có số tiền gửi KBNN theo tháng (deck slide 58); thường quý IV đảo chiều mạnh khi giải ngân đầu tư công dồn cuối năm.`,
    src: 'WiData 82420, 75598' })}
  </div>
  <h3 class="ovh dsec" id="d-cost">Chi phí vốn và thanh khoản</h3>
  <div class="grid g2 gap">
    ${card({ id: 'chOn', title: 'Thanh khoản liên ngân hàng (TT2)', sub: '% / tỷ đồng · theo phiên từ 2021 (mặc định hiện 3 tháng) · LNH qua đêm, lãi suất OMO; cột = NHNN bơm (+)/hút (−) ròng', h: 'tall',
      insight: `LNH qua đêm dao động <b>${nf(Math.min(...on3(dom.onDaily)), 2)}–${nf(Math.max(...on3(dom.onDaily)), 2)}%</b> trong 3 tháng gần nhất (đỉnh 5 năm ${nf(Math.max(...dom.onDaily.map(p => p.v)), 2)}% ngày ${dvn(dom.onDaily.reduce((m, p) => p.v > m.v ? p : m).d)}), đỉnh rơi vào cuối tháng. OMO lưu hành giảm từ đỉnh 255,2 nghìn tỷ giữa tháng 9 xuống 110,9 nghìn tỷ (14/10) — NHNN rút bớt tiền khi áp lực tỷ giá tăng. R-10: OMO chỉ xử lý thanh khoản ngắn, không giúp tuân thủ LDR.`,
      src: 'WiData 82237, 81522, 82268; ai_news 14/10/2026' })}
    ${dom.lnh ? card({ id: 'chLnhTen', title: 'Lãi suất liên ngân hàng theo kỳ hạn (TT2)', h: 'tall', sub: '%/năm, theo phiên · bình quân liên ngân hàng NHNN công bố: qua đêm, 1 tuần, 1, 3, 6, 9 tháng · nét đứt = lãi suất OMO', insight: lnhIns(), src: 'NHNN (lãi suất bình quân liên ngân hàng) qua dulieukinhte.com' }) : ''}
    ${dom.omoOut ? card({ id: 'chOmoOut', title: 'OMO và tín phiếu NHNN đang lưu hành', h: 'tall', sub: 'nghìn tỷ đồng, theo phiên (cột) · đường = lãi suất LNH qua đêm (trục phải) · OMO lưu hành giảm = NHNN rút tiền khỏi TT2', insight: omoOutIns(), src: 'NHNN (kết quả đấu thầu thị trường mở) qua dulieukinhte.com; LNH qua đêm: NHNN' }) : ''}
    ${card({ id: 'chDep', title: 'Lãi suất huy động 12 tháng theo nhóm (TT1)', sub: '%/năm · theo ngày từ 10/2024 · bình quân niêm yết NHTM Nhà nước, NHTM lớn (MBB, ACB, TCB, VPB), NHTM khác',
      insight: depIns(),
      src: 'WiData 202886, 202874, 202880' })}
    ${card({ id: 'bBig4', title: 'Lợi suất trái phiếu Big 4 khi phát hành', sub: '%/năm · lãi suất coupon tại thời điểm phát hành, bình quân gia quyền theo giá trị trong tháng · điểm = từng ngân hàng · đường đỏ = huy động 12T Big 4 · đường xám = TPCP 10 năm (cuối tháng)', insight: bBig4Ins(), src: BD.src.big4 + '; ' + BD.src.curve })}
    ${card({ id: 'dMmCurve', title: 'Đường cong lãi suất liên ngân hàng VND và USD', sub: VR.d.length ? `%/năm theo kỳ hạn · phiên ${dvn(VR.d[mmIdx()])} so với 1 tuần và 1 tháng trước · VNIBOR VND, VNIBOR USD, SOFR kỳ hạn` : '', insight: VR.d.length ? mmCurveIns(mmIdx(), mmIdx(7), mmIdx(30)) : '', src: 'VIRA Market Watch (VNIBOR do NHNN công bố; SOFR kỳ hạn)' })}
      ${card({ id: 'bCurve', title: 'Đường cong lợi suất TPCP Việt Nam', sub: `%/năm theo kỳ hạn · ${dvn(lastv(BD.gb.curve.d))} so với 3 tháng trước, đầu năm và 1 năm trước`, insight: bCurveIns(bondNums()), src: BD.src.curve })}
      ${card({ id: 'bCurveTs', title: 'Lợi suất TPCP 1, 5, 10 năm và độ dốc 10Y − 1Y', sub: '%/năm theo ngày · cột xám = độ dốc (trục phải, điểm %)', h: 'tall', src: BD.src.curve })}
  </div>
  ${mode === 'v' ? subBond() : ''}`;
}
function fxIns() {
  const c = glast('vn_sbv_central_d'), ce = glast('vn_sbv_ceil_d'), se = glast('vn_sbv_sell_d'), x = glast('dxy_d'), ns = lastv(dom.nhtmSell), vs = glast('usdvnd_vcb_sell');
  if (c.v == null) return '';
  const c0 = yStart('vn_sbv_central_d'), x0 = yStart('dxy_d'), x1m = gprev('dxy_d', 21), mkt = vs.v != null && vs.d >= ns.d ? vs : ns;
  return `${dvn(c.d)}: trung tâm <b>${nf(c.v)}</b> (${sg((c.v / c0 - 1) * 100, 1)}% từ đầu năm), trần ${nf(ce.v)}, NHNN bán can thiệp ${nf(se.v)}. ${vs.v != null && vs.d >= ns.d ? 'Vietcombank' : 'NHTM'} bán ra <b>${nf(mkt.v)}</b> — cách trần <b>${nf(ce.v - mkt.v)}đ</b> (${pc((ce.v - mkt.v) / ce.v * 100, 2)}). DXY <b>${nf(x.v, 1)}</b> (${dvn(x.d)}): ${sg((x.v / x0 - 1) * 100, 1)}% từ đầu năm, ${sg((x.v / x1m - 1) * 100, 1)}% 1 tháng.`
    + how('Tỷ giá NHTM sát trần nghĩa là NHNN phải bán USD (giá bán can thiệp = trần − 50đ) để giữ biên độ, làm hút VND và đẩy lãi suất liên ngân hàng lên. DXY tăng là áp lực từ bên ngoài; khi DXY giảm mà USD/VND vẫn đi lên thì áp lực chủ yếu nằm trong nước (cầu ngoại tệ, chênh lãi suất VND − USD). NHNN nâng tỷ giá trung tâm là chủ động dời cả hành lang lên.');
}
function drFx() { const cfg = FSFX.config({ nhtmSell: dom.nhtmSell, free: dom.free, freeD: dom.freeD, nhtmD: dom.nhtmD }, { numAxis }); if (cfg) mk('chFx', cfg); }
function chDom() {
  const labs = monthsFrom('2021-01', TODAY.slice(0, 7));
  drFx();
  const G = fxGapSer();
  mk('chFxGap', { type: 'bar', data: { labels: G.map(p => dvn(p.d)), datasets: [{ label: 'Tự do − NHTM', data: G.map(p => p.v), backgroundColor: G.map(p => p.v > 0 ? 'rgba(192,57,43,.7)' : 'rgba(31,138,141,.7)'), dp: 0, unit: 'đ', barPercentage: 1, categoryPercentage: 1 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: numAxis('VND') } } });
  const dl = dom.onDaily.map(p => p.d), netM = Object.fromEntries(dom.netDaily.map(p => [p.d, p.v])), omoM = Object.fromEntries((dom.omoDaily || []).map(p => [p.d, p.v]));
  let omoLast = null; const omoD = dl.map(d => (omoLast = omoM[d] ?? omoLast));   // lãi suất OMO giữ mức phiên gần nhất có giao dịch
  const netD = dl.map(d => netM[d] ?? null);
  mk('chOn', { type: 'bar', data: { labels: dl.map(d => dvn(d)), datasets: [
    L('LNH qua đêm', dom.onDaily.map(p => p.v), C.navy, { yAxisID: 'y' }), L('Lãi suất OMO', omoD, C.teal, { borderDash: [5, 4], yAxisID: 'y' }),
    { label: 'Bơm/hút ròng (tỷ)', data: netD, backgroundColor: netD.map(v => (v ?? 0) >= 0 ? 'rgba(41,56,168,.35)' : 'rgba(192,57,43,.35)'), yAxisID: 'y1', dp: 0, unit: '' }] },
    options: { scales: { x: { ticks: { maxTicksLimit: 10 } }, y: pctAxis('%'), y1: numAxis('tỷ đồng', { position: 'right', grid: { display: false } }) } } }, { win: 3 });
  if (dom.lnh) { const X = dom.lnh, days = [...new Set(Object.values(X).flatMap(a => a.map(p => p.d)))].sort(), om = Object.fromEntries((dom.omoDaily || []).map(p => [p.d, p.v]));
    let lo = null; const omo = days.map(d => (om[d] != null ? (lo = om[d]) : lo));
    mk('chLnhTen', { type: 'line', data: { labels: days.map(dvn), datasets: [...LNH_T.filter(([t]) => X[t]).map(([t, n, c]) => { const m = Object.fromEntries(X[t].map(p => [p.d, p.v])); return L(n, days.map(d => m[d] ?? null), c, { borderWidth: t === 'ON' || t === '3M' ? 2.2 : 1.5 }); }),
      L('Lãi suất OMO', omo, C.grey, { borderDash: [5, 4], borderWidth: 1.4 })] }, options: { scales: { x: { ticks: { maxTicksLimit: 10 } }, y: pctAxis('') } } }, { win: 12 }); }
  if (dom.omoOut) { const O = dom.omoOut, T = Object.fromEntries((dom.tpOut || []).map(p => [p.d, p.v])), onM = Object.fromEntries(dom.onDaily.map(p => [p.d, p.v]));
    mk('chOmoOut', { type: 'bar', data: { labels: O.map(p => dvn(p.d)), datasets: [
      { label: 'OMO lưu hành', data: O.map(p => +(p.v / 1000).toFixed(1)), backgroundColor: 'rgba(29,38,120,.55)', stack: 's', dp: 1, unit: ' nghìn tỷ', yAxisID: 'y' },
      { label: 'Tín phiếu lưu hành (hút)', data: O.map(p => T[p.d] ? -(T[p.d] / 1000).toFixed(1) : 0), backgroundColor: 'rgba(192,57,43,.55)', stack: 's', dp: 1, unit: ' nghìn tỷ', yAxisID: 'y' },
      L('LNH qua đêm', O.map(p => onM[p.d] ?? null), C.gold, { yAxisID: 'y1', borderWidth: 2, type: 'line' })] },
      options: { scales: { x: { stacked: true, ticks: { maxTicksLimit: 10 } }, y: numAxis('nghìn tỷ', { stacked: true }), y1: pctAxis('', { position: 'right', grid: { display: false } }) } } }, { win: 12 }); }
  { const G = [['dep12StateD', 'NHTM Nhà nước', C.navy, 2.4], ['dep12LargeD', 'NHTM lớn', C.tealInk, 2], ['dep12OtherD', 'NHTM khác', C.purple, 2]].filter(([k]) => (dom[k] || []).length);
    const days = [...new Set(G.flatMap(([k]) => dom[k].map(p => p.d)))].sort();
    const ff = k => { const m = Object.fromEntries(dom[k].map(p => [p.d, p.v])); let last = null; return days.map(d => (m[d] != null ? (last = m[d]) : last)); };
    mk('chDep', { type: 'line', data: { labels: days.map(dvn), datasets: G.map(([k, n, c, w]) => L(n, ff(k), c, { borderWidth: w, stepped: true })) },
      options: { scales: { x: { ticks: { maxTicksLimit: 10 } }, y: pctAxis() } } }, { win: 12 }); }
  const l19 = monthsFrom('2019-01', TODAY.slice(0, 7));
  mk('chMoney', { type: 'line', data: { labels: l19.map(mvn), datasets: [L('Tín dụng YoY', al(dom.creditYoY, l19), C.navy, { dp: 1, borderWidth: 2.4 }), L('Tiền gửi YoY', al(dom.depYoY, l19), C.teal, { dp: 1 }), L('M2 YoY', al(dom.m2, l19), C.gold, { dp: 1, borderDash: [4, 3] })] },
    options: { scales: { y: pctAxis() } } }, { switch: 'line' });
  const yrs = [...new Set(dom.creditYtd.map(p => p.d.slice(0, 4)))].slice(-4);
  mk('chCredit', { type: 'line', data: { labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'], datasets: yrs.map((y, i) => L(y,
    Array.from({ length: 12 }, (_, m) => { const f = dom.creditYtd.find(p => p.d.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)); return f ? f.v : null; }),
    [C.steps[5], C.steps[4], C.steps[2], C.navy][i + 4 - yrs.length], { borderWidth: y === lastv(yrs) ? 3 : 1.6, pointRadius: 2, spanGaps: false })) },
    options: { scales: { y: pctAxis() }, plugins: { refLines: { lines: [{ value: 15, label: 'Chỉ tiêu 2026 ~15%' }] } } } });
  const fdi12 = labs.map((k, i) => { const all = monthsFrom('2018-01', k).slice(-12).map(m => byM(dom.fdi)[m]); return all.every(v => v != null) ? all.reduce((a, b) => a + b, 0) / 1000 : null; });
  mk('chExt', { type: 'bar', data: { labels: labs.map(mvn), datasets: [
    { label: 'Cán cân XNK (tháng)', data: al(dom.trade, labs).map(v => v == null ? null : v / 1000), backgroundColor: al(dom.trade, labs).map(v => (v ?? 0) >= 0 ? 'rgba(31,138,141,.7)' : 'rgba(192,57,43,.7)'), dp: 2, unit: ' tỷ USD' },
    L('FDI giải ngân 12 tháng', fdi12, C.navy, { unit: ' tỷ USD', dp: 1 }), L('Dự trữ ngoại hối', al(dom.reserves, labs).map(v => v == null ? null : v / 1000), C.purple, { unit: ' tỷ USD', dp: 1, yAxisID: 'y1', borderDash: [4, 3] })] },
    options: { scales: { y: numAxis('tỷ USD'), y1: numAxis('Dự trữ', { position: 'right', grid: { display: false } }) } } });
  const fq = dom.revQ.map((p, i) => ({ d: p.d, bal: dom.expQ[i] ? (dom.expQ[i].v - p.v) / 1000 : null })).filter(f => f.d >= '2021');
  mk('chFiscal', { type: 'bar', data: { labels: fq.map(f => 'Q' + Math.ceil(+f.d.slice(5, 7) / 3) + '/' + f.d.slice(2, 4)), datasets: [{ label: 'Chi − thu', data: fq.map(f => f.bal), backgroundColor: fq.map(f => f.bal >= 0 ? 'rgba(41,56,168,.7)' : 'rgba(192,57,43,.7)'), dp: 1, unit: ' nghìn tỷ' }] },
    options: { plugins: { legend: { display: false } }, scales: { y: numAxis('nghìn tỷ') } } });
}

/* =====================================================================
   VĨ MÔ › VIỆT NAM › KINH TẾ (window.ECO_DATA, scripts/build_eco.py)
===================================================================== */
const EM = ECO ? ECO.m : [];
const es = k => (ECO && ECO.s[k]) || [];
const eAt = (k, m) => { const i = EM.indexOf(m); return i < 0 ? null : es(k)[i]; };
const eLast = k => { const a = es(k); for (let i = a.length - 1; i >= 0; i--) if (a[i] != null) return { d: EM[i], v: a[i], i }; return { d: null, v: null, i: -1 }; };
const eLy = m => m ? (+m.slice(0, 4) - 1) + m.slice(4) : null;
const ePrevM = m => { const [y, mm] = m.split('-').map(Number); return mm === 1 ? `${y - 1}-12` : `${y}-${String(mm - 1).padStart(2, '0')}`; };
const eFrom = (from = '2021-01') => { const i = EM.indexOf(from); return i < 0 ? 0 : i; };
const eSl = (k, from) => es(k).slice(eFrom(from));
const eLab = from => EM.slice(eFrom(from)).map(mvn);
const tm = m => m ? `T${+m.slice(5)}/${m.slice(0, 4)}` : '—';
const mAvg = (arr, m) => { const v = (arr || []).filter(p => p.d.slice(0, 7) === m).map(p => p.v); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const mEnd = (arr, m) => { const v = (arr || []).filter(p => p.d.slice(0, 7) === m); return v.length ? v[v.length - 1].v : null; };
const gMEnd = (k, m) => { const x = gs(k); let r = null; x.d.forEach((d, i) => { if (d.slice(0, 7) === m && x.v[i] != null) r = x.v[i]; }); return r; };
const ECO_SRC = 'Cục Thống kê (Bộ Tài chính); S&P Global (PMI); số tháng qua dulieukinhte.com, tự cập nhật';
const CPI_GRP = [['cpi_food', 'Hàng ăn và dịch vụ ăn uống'], ['cpi_bev', 'Đồ uống và thuốc lá'], ['cpi_cloth', 'May mặc, mũ nón, giày dép'], ['cpi_house', 'Nhà ở, điện nước, VLXD'], ['cpi_equip', 'Thiết bị, đồ dùng gia đình'],
  ['cpi_health', 'Thuốc và dịch vụ y tế'], ['cpi_trans', 'Giao thông'], ['cpi_post', 'Bưu chính viễn thông'], ['cpi_edu', 'Giáo dục'], ['cpi_cult', 'Văn hoá, giải trí, du lịch'], ['cpi_other', 'Hàng hoá, dịch vụ khác']];
const IIP_K = [['iip', 'Toàn ngành', C.navy, 2.8], ['iip_mfg', 'Chế biến, chế tạo', C.tealInk, 2], ['iip_min', 'Khai khoáng', C.gold, 1.6], ['iip_elec', 'Điện', C.purple, 1.6], ['iip_water', 'Nước, xử lý rác thải', C.grey, 1.4]];
const RET_K = [['ret', 'Tổng mức bán lẻ', C.navy, 2.8], ['ret_goods', 'Bán lẻ hàng hoá', C.tealInk, 2], ['ret_accom', 'Lưu trú, ăn uống', C.gold, 1.6], ['ret_travel', 'Du lịch lữ hành', C.purple, 1.4], ['ret_oth', 'Dịch vụ khác', C.grey, 1.4]];
const qLabQ = d => `Q${Math.ceil(+d.slice(5, 7) / 3)}/${d.slice(2, 4)}`;
const gqLast = k => { const a = (ECO.gq || {})[k] || []; for (let i = a.length - 1; i >= 0; i--) if (a[i] != null) return { d: ECO.q[i], v: a[i], i }; return { d: null, v: null, i: -1 }; };

/* ---- bảng chỉ tiêu (theo slide họp tháng) ---- */
function ecoRows() {
  const lm = eLast('cpi').d || EM[EM.length - 1];
  const realRet = m => { const a = eAt('ret', m), b = eAt('cpi', m); return a == null || b == null ? null : a - b; };
  const R = [
    ['Kinh tế'],
    ['GDP thực (quý, YoY)', 'q', m => { const i = (ECO.q || []).indexOf(m); return i < 0 ? null : ECO.gq.gdp[i]; }, '%'],
    ['PMI sản xuất', 'm', m => eAt('pmi', m), 'đ', 1],
    ['Sản xuất công nghiệp IIP (YoY)', 'm', m => eAt('iip', m), '%'],
    ['Tổng mức bán lẻ (YoY)', 'm', m => eAt('ret', m), '%'],
    ['Bán lẻ thực (trừ CPI)', 'm', realRet, '%'],
    ['Xuất khẩu (YoY)', 'm', m => eAt('xk', m), '%'],
    ['Nhập khẩu (YoY)', 'm', m => eAt('nk', m), '%'],
    ['Cán cân thương mại (tỷ USD)', 'm', m => eAt('tb', m), '', 2],
    ['FDI đăng ký (tỷ USD)', 'm', m => eAt('fdi_reg', m), '', 2],
    ['FDI thực hiện (tỷ USD)', 'm', m => eAt('fdi_real', m), '', 2],
    ['Giải ngân vốn NSNN (nghìn tỷ)', 'm', m => eAt('pub', m), '', 1],
    ['CPI (YoY)', 'm', m => eAt('cpi', m), '%'],
    ['Lạm phát cơ bản (YoY)', 'm', m => eAt('cpi_core', m), '%'],
    ['Tiền tệ'],
    ['Tín dụng (YoY)', 'm', m => byM(dom.creditYoY)[m], '%'],
    ['Cung tiền M2 (YoY)', 'm', m => byM(dom.m2)[m], '%'],
    ['LNH qua đêm (bình quân tháng)', 'm', m => mAvg(dom.onDaily, m), '%'],
    ['Huy động 12T NHTM Nhà nước', 'm', m => mEnd(dom.dep12StateD, m) ?? byM(dom.dep12State)[m], '%'],
    ['USD/VND NHTM bán ra (cuối tháng)', 'm', m => mEnd(dom.nhtmD, m) ?? byM(dom.nhtmSell)[m], '', 0],
    ['USD/VND tự do (cuối tháng)', 'm', m => mEnd(dom.freeD, m) ?? byM(dom.free)[m], '', 0],
    ['TPCP 10 năm', 'm', m => byM(intl.vn10)[m], '%'],
    ['Tài sản quốc tế'],
    ['Fed funds (EFFR)', 'm', m => gMEnd('us_effr_d', m) ?? byM(intl.effr)[m], '%'],
    ['UST 10 năm', 'm', m => gMEnd('us_10y_d', m), '%'],
    ['DXY', 'm', m => gMEnd('dxy_d', m), '', 1],
    ['Dầu Brent (USD/thùng)', 'm', m => gMEnd('us_brent_d', m), '', 1],
    ['Vàng (USD/ounce)', 'm', m => gMEnd('gold_d', m), '', 0],
  ];
  return { R, lm };
}
function ecoTable() {
  const { R, lm } = ecoRows();
  const cols = []; let m = lm; for (let i = 0; i < 6; i++) { cols.unshift(m); m = ePrevM(m); }
  const now = TODAY.slice(0, 7); if (now > lm) cols.push(now);   // tháng hiện tại: số thị trường đã có
  const f = (v, u, d = 2) => v == null ? '<span class="muted">–</span>' : u === '%' ? nf(v, d) : nf(v, d);
  return `<div class="tscroll"><table class="etab"><thead><tr><th>Chỉ tiêu</th>${cols.map(c => `<th class="n">${mvn(c)}</th>`).join('')}<th class="n">Cùng kỳ ${mvn(eLy(lm)).slice(3)}</th></tr></thead><tbody>
    ${R.map(r => r.length === 1 ? `<tr class="grp"><td colspan="${cols.length + 2}">${r[0]}</td></tr>` : `<tr><td>${r[0]}</td>${cols.map(c => {
      if (r[1] === 'q' && !['03', '06', '09', '12'].includes(c.slice(5))) return '<td class="n muted">·</td>';
      return `<td class="n">${f(r[2](c), r[3], r[4] ?? 2)}</td>`; }).join('')}<td class="n muted">${f(r[2](eLy(lm)), r[3], r[4] ?? 2)}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function ecoDashIns() {
  const g = gqLast('gdp'), p = eLast('pmi'), ii = eLast('iip'), r = eLast('ret'), c = eLast('cpi'), x = eLast('xk'), pb = eLast('pub_ytd_yoy');
  const rr = r.v != null && eAt('cpi', r.d) != null ? r.v - eAt('cpi', r.d) : null;
  return `GDP ${g.d ? qLabQ(g.d) : ''} tăng <b>${pc(g.v, 2)}</b>; ${tm(p.d)} PMI <b>${nf(p.v, 1)}</b> (${p.v >= 50 ? 'mở rộng' : 'thu hẹp'}), IIP ${sg(ii.v, 1)}, bán lẻ ${sg(r.v, 1)} (thực ${sg(rr, 1)}), xuất khẩu ${sg(x.v, 1)}, giải ngân vốn ngân sách lũy kế ${sg(pb.v, 1)} so cùng kỳ. CPI <b>${pc(c.v, 2)}</b>, lạm phát cơ bản ${pc(eLast('cpi_core').v, 2)}.`
    + how('Tăng trưởng đang được kéo bởi cả sản xuất, xuất khẩu và đầu tư công, trong khi lạm phát ở vùng 5% thu hẹp dư địa hạ lãi suất. Với ngân hàng: nhu cầu tín dụng còn mạnh, nhưng chi phí vốn khó giảm.');
}
/* ---- insight từng chart ---- */
function eGdpIns() {
  const k = ['gdp', 'gdp_agri', 'gdp_ind', 'gdp_svc'].map(gqLast), y = (ECO.gq.gdp || [])[k[0].i - 4];
  return `${qLabQ(k[0].d)}: GDP <b>${pc(k[0].v, 2)}</b> (cùng kỳ ${pc(y, 2)}); nông, lâm, thủy sản ${pc(k[1].v, 1)}, công nghiệp và xây dựng <b>${pc(k[2].v, 1)}</b>, dịch vụ ${pc(k[3].v, 1)}.`
    + how('Công nghiệp và xây dựng tăng nhanh nhất thường là nhờ chế biến xuất khẩu (khối FDI) và đầu tư công; dịch vụ phản ánh sức tiêu dùng trong nước. Tăng trưởng theo khu vực tính từ GDP giá so sánh nên có thể lệch nhẹ số công bố.');
}
function eIipIns() {
  const t = eLast('iip'), mf = eAt('iip_mfg', t.d), p = eLast('pmi'), p3 = es('pmi').slice(-3), sub = (ECO.iipSub || []).filter(r => r[2] != null);
  const hi = sub.slice(0, 3).map(r => `${esc(r[0].replace(/^Sản xuất /, ''))} ${sg(r[2], 1)}`).join(', '), lo = sub.slice(-2).map(r => `${esc(r[0].replace(/^Sản xuất /, ''))} ${sg(r[2], 1)}`).join(', ');
  return `${tm(t.d)}: IIP <b>${sg(t.v, 1)}</b>, chế biến chế tạo ${sg(mf, 1)}. PMI ${nf(p.v, 1)}, ${p3.every(v => v >= 50) ? '3 tháng liên tiếp trên 50' : 'dao động quanh 50'}. Mạnh nhất: ${hi}; yếu nhất: ${lo}.`
    + how('PMI đo đơn hàng mới nên thường đi trước IIP 1–2 tháng. IIP tăng hai chữ số kéo theo nhu cầu vốn lưu động: tín dụng doanh nghiệp sản xuất là phần tăng ổn định nhất của các ngân hàng bán buôn.');
}
function eRetIns() {
  const r = eLast('ret'), c = eAt('cpi', r.d), lv = eAt('ret_lv', r.d);
  return `${tm(r.d)}: tổng mức bán lẻ <b>${nf(lv, 1)} nghìn tỷ</b>, tăng <b>${sg(r.v, 1)}</b> so cùng kỳ; trừ CPI còn ${sg(r.v - c, 1)}. Hàng hoá ${sg(eAt('ret_goods', r.d), 1)}, lưu trú ăn uống ${sg(eAt('ret_accom', r.d), 1)}, du lịch lữ hành ${sg(eAt('ret_travel', r.d), 1)}.`
    + how('Bán lẻ là số danh nghĩa nên phải trừ lạm phát để thấy sức mua thực. Tiêu dùng mạnh hỗ trợ tín dụng bán lẻ và thu phí thẻ, thanh toán của ngân hàng.');
}
function eCpiCIns() {
  const c = eLast('cpi'), R = CPI_GRP.map(([k, n]) => [n, eAt(k, c.d), eAt(k, eLy(c.d))]).filter(r => r[1] != null).sort((a, b) => b[1] - a[1]);
  return `${tm(c.d)}: CPI <b>${pc(c.v, 2)}</b>, lạm phát cơ bản ${pc(eAt('cpi_core', c.d), 2)}. Tăng nhanh nhất: ${R.slice(0, 3).map(r => `${esc(r[0])} <b>${pc(r[1], 1)}</b>`).join(', ')}; thấp nhất ${esc(R[R.length - 1][0])} ${pc(R[R.length - 1][1], 1)}.`
    + how('Hàng ăn (quyền số lớn nhất, khoảng 1/3 rổ), nhà ở – điện nước và giao thông (xăng dầu) quyết định phần lớn CPI. Lạm phát cơ bản loại lương thực, năng lượng và giá do Nhà nước quản lý: khi lõi tăng theo CPI là giá đã lan rộng, NHNN khó nới lỏng.');
}
function eCpiFcIns() {
  const F = ECO.fc; if (!F) return '';
  const v = F.avg.map(r => r[2]), cur = eLast('cpi'), av = byM(dom.cpiAvg)[cur.d];
  const s = F.survey || {};
  return `Dự báo CPI bình quân 2026 của ${v.length} tổ chức: <b>${nf(Math.min(...v), 2)}–${nf(Math.max(...v), 2)}%</b> (trung vị ${nf(med(v), 2)}%), so với mục tiêu ~4,5% và CPI bình quân ${mvn(cur.d).slice(0, 2).replace(/^0/, '')} tháng ${pc(av, 2)}.${s.med != null ? ` Khảo sát VIRA ${dvn(s.date)} (${s.n} tổ chức): CPI ${tm(s.per)} trung vị <b>${pc(s.med, 2)}</b> YoY (${nf(s.lo, 2)}–${nf(s.hi, 2)}%).` : ''}`
    + how('Đa số dự báo cao hơn hoặc bằng mục tiêu: thị trường không kỳ vọng NHNN hạ lãi suất điều hành trong ngắn hạn.');
}
function eTradeIns() {
  const x = eLast('xk'), d = x.d;
  return `${tm(d)}: xuất khẩu <b>${nf(eAt('xk_lv', d), 1)} tỷ USD</b> (${sg(x.v, 1)}), trong đó khu vực trong nước ${sg(eAt('xk_dom', d), 1)}, FDI ${sg(eAt('xk_fdi', d), 1)}; nhập khẩu ${sg(eAt('nk', d), 1)} (trong nước ${sg(eAt('nk_dom', d), 1)}, FDI ${sg(eAt('nk_fdi', d), 1)}).`
    + how('Khu vực FDI chiếm khoảng 4/5 kim ngạch xuất khẩu nên quyết định tăng trưởng xuất khẩu; nhập khẩu tăng nhanh cùng lúc là doanh nghiệp đang nhập nguyên liệu cho đơn hàng các tháng sau.');
}
function eTbIns() {
  const t = eLast('tb'), d = t.d;
  return `${tm(d)}: cán cân thương mại ${sg(t.v, 2, ' tỷ USD')}; khu vực trong nước ${sg(eAt('tb_dom', d), 2, '')}, FDI ${sg(eAt('tb_fdi', d), 2, '')}. Cộng 12 tháng: trong nước <b>${sg(eAt('tb_dom_ttm', d), 1, ' tỷ USD')}</b>, FDI <b>${sg(eAt('tb_fdi_ttm', d), 1, ' tỷ USD')}</b> (12 tháng trước: ${sg(eAt('tb_dom_ttm', eLy(d)), 1, '')} và ${sg(eAt('tb_fdi_ttm', eLy(d)), 1, '')}).`
    + how('Khu vực trong nước nhập siêu phải mua USD trong nước để thanh toán, nên nhập siêu nới rộng là nguồn áp lực tỷ giá trực tiếp; thặng dư của khu vực FDI phần lớn được giữ ở nước ngoài nên không chuyển hết thành cung USD trong nước.');
}
function eFdiIns() {
  const r = eLast('fdi_real'), d = r.d;
  return `${tm(d)}: FDI thực hiện <b>${nf(r.v, 2)} tỷ USD</b>, lũy kế ${mvn(d).slice(0, 2).replace(/^0/, '')} tháng <b>${nf(eAt('fdi_real_ytd', d), 2)} tỷ</b> (${sg(eAt('fdi_real_ytd_yoy', d), 1)}); vốn đăng ký lũy kế ${nf(eAt('fdi_reg_ytd', d), 2)} tỷ (${sg(eAt('fdi_reg_ytd_yoy', d), 1)}).`
    + how('Vốn đăng ký là cam kết, thường giải ngân dần trong nhiều năm; vốn thực hiện là tiền vào thật, một nguồn cung USD ổn định cho tỷ giá.');
}
function ePubIns() {
  const p = eLast('pub_ytd'), d = p.d;
  return `Lũy kế ${mvn(d).slice(0, 2).replace(/^0/, '')} tháng ${d.slice(0, 4)}: giải ngân vốn đầu tư từ ngân sách <b>${nf(p.v, 0)} nghìn tỷ</b>, ${sg(eAt('pub_ytd_yoy', d), 1)} so cùng kỳ; riêng ${tm(d)} ${nf(eAt('pub', d), 1)} nghìn tỷ (${sg(eAt('pub_yoy', d), 1)}).`
    + how('Đầu tư công dồn mạnh vào quý IV hằng năm. Tiền giải ngân đi từ tài khoản Kho bạc ra doanh nghiệp làm tăng tiền gửi và thanh khoản hệ thống ngân hàng, đồng thời kéo nhu cầu vốn của nhà thầu, vật liệu xây dựng.');
}
function subEco() {
  if (!ECO) return '<div class="banner">Chưa có số liệu kinh tế.</div>';
  const g = gqLast('gdp'), p = eLast('pmi'), r = eLast('ret'), c = eLast('cpi'), x = eLast('xk'), f = eLast('fdi_real_ytd'), pb = eLast('pub_ytd');
  const cpiTabs = [['core', 'CPI và lõi'], ['food', 'Hàng ăn, nhà ở, giao thông'], ['svc', 'Y tế, giáo dục, khác']];
  return `<div class="kpis">
    ${kpi('GDP ' + (g.d ? qLabQ(g.d) : ''), pc(g.v, 2), `cùng kỳ ${pc((ECO.gq.gdp || [])[g.i - 4], 2)}`)}
    ${kpi('PMI ' + mvn(p.d), nf(p.v, 1), p.v >= 50 ? 'mở rộng' : 'thu hẹp', p.v < 50 ? 'neg' : 'pos')}
    ${kpi('Bán lẻ ' + mvn(r.d), sg(r.v, 1), `thực ${sg(r.v - eAt('cpi', r.d), 1)} (trừ CPI)`)}
    ${kpi('Xuất khẩu ' + mvn(x.d), sg(x.v, 1), `cán cân ${sg(eAt('tb', x.d), 2, ' tỷ USD')}`)}
    ${kpi('FDI thực hiện ' + mvn(f.d).slice(0, 2).replace(/^0/, '') + 'T', nf(f.v, 1) + ' tỷ USD', sg(eAt('fdi_real_ytd_yoy', f.d), 1) + ' cùng kỳ')}
    ${kpi('Vốn NSNN ' + mvn(pb.d).slice(0, 2).replace(/^0/, '') + 'T', nf(pb.v, 0) + ' nghìn tỷ', sg(eAt('pub_ytd_yoy', pb.d), 1) + ' cùng kỳ')}
    ${kpi('CPI ' + mvn(c.d), pc(c.v, 2), `lõi ${pc(eAt('cpi_core', c.d), 2)} · BQ ${pc(byM(dom.cpiAvg)[c.d], 2)}`, c.v > 4.5 ? 'neg' : '')}
  </div>
  <h3 class="ovh dsec" id="e-dash">Bảng chỉ tiêu vĩ mô và thị trường</h3>
  ${card({ title: 'Chỉ tiêu vĩ mô, tiền tệ và thị trường theo tháng', sub: '6 tháng gần nhất và cùng kỳ năm trước · % là tăng trưởng so cùng kỳ (YoY) trừ khi ghi khác · GDP theo quý · lãi suất %/năm; tỷ giá, giá tài sản là mức cuối tháng', body: ecoTable(), insight: ecoDashIns(), src: ECO_SRC + '; NHNN; Bộ Tài chính; FRED; ECB' })}
  <h3 class="ovh dsec" id="e-grow">Tăng trưởng và sản xuất</h3>
  <div class="grid g2 gap">
    ${card({ id: 'eGdp', title: 'GDP thực theo quý và theo khu vực', sub: '% so cùng kỳ · cột = GDP · đường = nông lâm thủy sản, công nghiệp và xây dựng, dịch vụ', insight: eGdpIns(), src: 'Cục Thống kê' })}
    ${card({ id: 'eIip', title: 'Chỉ số sản xuất công nghiệp (IIP) theo ngành và PMI', sub: '% so cùng kỳ, theo tháng (trục trái) · cột xám = PMI sản xuất (trục phải, 50 = ngưỡng mở rộng)', insight: eIipIns(), src: ECO_SRC })}
  </div>
  ${card({ id: 'eIipSub', title: 'IIP các ngành cấp 2 tháng gần nhất', h: 'xl', sub: '% so cùng kỳ · cột = tháng mới nhất · chấm = bình quân 12 tháng · sắp theo mức tăng', src: ECO_SRC })}
  <h3 class="ovh dsec" id="e-cons">Tiêu dùng</h3>
  <div class="grid g2 gap">
    ${card({ id: 'eRet', title: 'Tổng mức bán lẻ hàng hoá và dịch vụ theo thành phần', sub: '% so cùng kỳ, theo tháng · nét đứt = bán lẻ thực (tổng trừ CPI) · du lịch lữ hành biến động rất mạnh nên ẩn sẵn, bấm chú thích để hiện', insight: eRetIns(), src: ECO_SRC })}
    ${card({ id: 'eRetLv', title: 'Quy mô bán lẻ theo thành phần', sub: 'nghìn tỷ đồng/tháng · cột chồng', src: ECO_SRC })}
  </div>
  <h3 class="ovh dsec" id="e-cpi">Lạm phát</h3>
  <div class="grid g2 gap">
    ${card({ id: 'chCpi', title: 'Lạm phát', sub: '% YoY · tháng · CPI, lạm phát cơ bản, CPI bình quân từ đầu năm · đường đỏ = mục tiêu ~4,5% (NQ 244/2025/QH15)',
      insight: `CPI ${pc(lastv(dom.cpi).v, 2)} và lạm phát cơ bản ${pc(lastv(dom.cpiCore).v, 2)} cùng ở vùng cao nhất kể từ đầu 2023 — giá tăng đã lan vào lõi, không chỉ do xăng dầu. CPI bình quân từ đầu năm <b>${pc(lastv(dom.cpiAvg).v, 2)}</b> so với mục tiêu ~4,5%: NHNN gần như không có dư địa hạ lãi suất điều hành.`,
      src: 'Cục Thống kê' })}
    ${card({ id: 'eCpiC', title: 'CPI theo nhóm hàng', h: 'tall', sub: `% so cùng kỳ · cột = ${tm(c.d)} · chấm = cùng kỳ năm trước`, insight: eCpiCIns(), src: 'Cục Thống kê' })}
    ${card({ id: 'eCpiTs', title: 'CPI theo nhóm hàng qua thời gian', h: 'tall', sub: '% so cùng kỳ, theo tháng · chọn nhóm', body: tfPick('eCpiG', cpiTabs), src: 'Cục Thống kê' })}
    ${ECO.fc ? card({ id: 'eCpiFc', title: 'Dự báo lạm phát 2026 của các tổ chức', h: 'tall', sub: 'CPI bình quân năm 2026, % · mỗi cột một tổ chức (bản công bố gần nhất) · đường đỏ = mục tiêu ~4,5%', insight: eCpiFcIns(), src: 'Báo cáo của các tổ chức (IMF, World Bank, CTCK, ngân hàng); khảo sát chuyên gia VIRA' }) : ''}
    ${card({ id: 'chOilChg', title: 'Truyền dẫn giá dầu vào giá xăng dầu trong nước', sub: '% thay đổi so với kỳ cuối năm 2025 · dầu thô tính bằng USD, giá bán lẻ tính bằng VND · chấm = CPI giao thông % so cùng kỳ (trục phải)', insight: oilChgIns(), src: BD ? BD.src.oil + ' · CPI giao thông: Cục Thống kê' : '' })}
    ${card({ id: 'chOil', title: 'Giá dầu thế giới và giá xăng dầu bán lẻ trong nước', h: 'tall', sub: 'nghìn đồng/lít (trục trái): RON 95-III, E5 RON 92, dầu DO 0,05S — Petrolimex vùng 1 · USD/thùng (trục phải): Brent, WTI', insight: oilIns(), src: BD ? BD.src.oil : '' })}
  </div>
  <h3 class="ovh dsec" id="e-trade">Thương mại</h3>
  <div class="grid g2 gap">
    ${card({ id: 'eXnk', title: 'Xuất, nhập khẩu theo khu vực', sub: '% so cùng kỳ, theo tháng · khu vực trong nước và khu vực có vốn FDI', body: tfPick('eXnkK', [['xk', 'Xuất khẩu'], ['nk', 'Nhập khẩu']]), insight: eTradeIns(), src: ECO_SRC })}
    ${card({ id: 'eTb', title: 'Cán cân thương mại: khu vực trong nước và FDI', sub: 'tỷ USD · cột = tháng · đường = cộng 12 tháng (trục phải)', insight: eTbIns(), src: ECO_SRC })}
  </div>
  <h3 class="ovh dsec" id="e-inv">Đầu tư: FDI và đầu tư công</h3>
  <div class="grid g2 gap">
    ${card({ id: 'eFdi', title: 'Vốn FDI thực hiện và đăng ký', sub: 'tỷ USD/tháng (cột) · đường = lũy kế từ đầu năm so cùng kỳ, % (trục phải)', insight: eFdiIns(), src: 'Cục Đầu tư nước ngoài, Cục Thống kê (Bộ Tài chính)' })}
    ${card({ id: 'ePubY', title: 'Giải ngân vốn đầu tư từ ngân sách theo năm', sub: `nghìn tỷ đồng · cột đậm = lũy kế ${mvn(pb.d).slice(0, 2).replace(/^0/, '')} tháng mỗi năm, cột nhạt = cả năm · đường = lũy kế cùng kỳ so năm trước, % (trục phải)`, insight: ePubIns(), src: 'Bộ Tài chính, Cục Thống kê' })}
    ${card({ id: 'ePubM', title: 'Giải ngân vốn ngân sách theo tháng', sub: 'nghìn tỷ đồng/tháng · đường = so cùng kỳ, % (trục phải)', src: 'Bộ Tài chính, Cục Thống kê' })}
  </div>`;
}
function chEco() {
  if (!ECO) return;
  collapsify($('[data-pp="eco"]'), 'eco', ['e-dash', 'e-grow'], 'h3.dsec');
  const F = '2021-01', labs = eLab(F);
  { const qi = ECO.q.findIndex(q => q >= '2021-01'), Q = ECO.q.slice(qi), sl = k => (ECO.gq[k] || []).slice(qi);
    mk('eGdp', { type: 'bar', data: { labels: Q.map(qLabQ), datasets: [{ label: 'GDP', data: sl('gdp'), backgroundColor: 'rgba(29,38,120,.75)', dp: 2, unit: '%', order: 3 },
      L('Nông, lâm, thủy sản', sl('gdp_agri'), C.gold, { pointRadius: 2, order: 1 }), L('Công nghiệp và xây dựng', sl('gdp_ind'), C.red, { pointRadius: 2, order: 1 }), L('Dịch vụ', sl('gdp_svc'), C.tealInk, { pointRadius: 2, order: 1 })] },
      options: { scales: { y: pctAxis('') } } }); }
  mk('eIip', { type: 'bar', data: { labels: labs, datasets: [...IIP_K.map(([k, n, c, w]) => L(n, eSl(k, F), c, { borderWidth: w, yAxisID: 'y', order: 1 })),
    { label: 'PMI', data: eSl('pmi', F), backgroundColor: 'rgba(154,163,178,.35)', yAxisID: 'y1', dp: 1, unit: '', order: 3 }] },
    options: { scales: { y: pctAxis(''), y1: numAxis('PMI', { position: 'right', min: 40, max: 60, grid: { display: false } }) }, plugins: { refLines: { lines: [{ value: 0, label: '', color: C.grey }] } } } }, { win: 36 });
  { const S = (ECO.iipSub || []).filter(r => r[2] != null);
    mk('eIipSub', { type: 'bar', data: { labels: S.map(r => { const t = r[0].replace(/^Sản xuất /, '').replace(/^Công nghiệp /, ''); return t.length > 34 ? t.slice(0, 32).replace(/[ ,]+\S*$/, '') + '…' : t[0].toUpperCase() + t.slice(1); }), datasets: [
      { label: tm(S[0] && S[0][1]), data: S.map(r => r[2]), backgroundColor: S.map(r => r[2] >= 0 ? 'rgba(31,138,141,.75)' : 'rgba(192,57,43,.75)'), dp: 1, unit: '%', order: 2 },
      { type: 'line', label: 'Bình quân 12 tháng', data: S.map(r => r[4]), showLine: false, pointRadius: 4, backgroundColor: '#fff', borderColor: '#1f2433', pointBorderWidth: 1.5, dp: 1, unit: '%', order: 1 }] },
      options: { indexAxis: 'y', interaction: { mode: 'index', intersect: false, axis: 'y' }, scales: { x: pctAxis(''), y: { ticks: { autoSkip: false, font: { size: 11 } }, grid: { display: false } } } } }); }
  { const real = es('ret').map((v, i) => v == null || es('cpi')[i] == null ? null : +(v - es('cpi')[i]).toFixed(2)).slice(eFrom(F));
    mk('eRet', { type: 'line', data: { labels: labs, datasets: [...RET_K.map(([k, n, c, w]) => L(n, eSl(k, F), c, { borderWidth: w, hidden: k === 'ret_travel' })), L('Bán lẻ thực (trừ CPI)', real, C.red, { borderDash: [5, 4], borderWidth: 1.8 })] },
      options: { scales: { y: pctAxis('') } } }, { win: 36 }); }
  mk('eRetLv', { type: 'bar', data: { labels: labs, datasets: RET_K.slice(1).map(([k, n, c]) => ({ label: n, data: eSl(k + '_lv', F), backgroundColor: c, stack: 's', dp: 1, unit: ' nghìn tỷ' })) },
    options: { scales: { x: { stacked: true }, y: numAxis('nghìn tỷ', { stacked: true }) } } }, { win: 36 });
  const labs21 = monthsFrom('2021-01', TODAY.slice(0, 7));
  mk('chCpi', { type: 'line', data: { labels: labs21.map(mvn), datasets: [L('CPI', al(dom.cpi, labs21), C.navy, { borderWidth: 2.4 }), L('Lạm phát cơ bản', al(dom.cpiCore, labs21), C.teal), L('CPI bình quân từ đầu năm', al(dom.cpiAvg, labs21), C.purple, { borderDash: [4, 3] })] },
    options: { scales: { y: pctAxis() }, plugins: { refLines: { lines: [{ value: 4.5, label: 'Mục tiêu ~4,5%' }] } } } });
  { const c = eLast('cpi'), R = CPI_GRP.map(([k, n]) => [n, eAt(k, c.d), eAt(k, eLy(c.d))]).filter(r => r[1] != null).sort((a, b) => b[1] - a[1]);
    R.push(['CPI chung', c.v, eAt('cpi', eLy(c.d))], ['Lạm phát cơ bản', eAt('cpi_core', c.d), eAt('cpi_core', eLy(c.d))]);
    mk('eCpiC', { type: 'bar', data: { labels: R.map(r => r[0]), datasets: [
      { label: tm(c.d), data: R.map(r => r[1]), backgroundColor: R.map(r => /CPI chung|cơ bản/.test(r[0]) ? C.red : 'rgba(29,38,120,.7)'), dp: 2, unit: '%', order: 2 },
      { type: 'line', label: 'Cùng kỳ năm trước', data: R.map(r => r[2]), showLine: false, pointRadius: 4, backgroundColor: '#fff', borderColor: '#1f2433', pointBorderWidth: 1.5, dp: 2, unit: '%', order: 1 }] },
      options: { indexAxis: 'y', interaction: { mode: 'index', intersect: false, axis: 'y' }, scales: { x: pctAxis(''), y: { ticks: { autoSkip: false, font: { size: 11 } }, grid: { display: false } } } } }); }
  const CG = { core: [['cpi', 'CPI', C.navy, 2.6], ['cpi_core', 'Lạm phát cơ bản', C.red, 2.2], ['cpi_food', 'Hàng ăn', C.tealInk, 1.6]],
    food: [['cpi_food', 'Hàng ăn và dịch vụ ăn uống', C.tealInk, 2], ['cpi_house', 'Nhà ở, điện nước, VLXD', C.purple, 2], ['cpi_trans', 'Giao thông', C.gold, 2], ['cpi', 'CPI', C.navy, 1.4]],
    svc: [['cpi_health', 'Thuốc, dịch vụ y tế', C.red, 1.8], ['cpi_edu', 'Giáo dục', C.navy, 1.8], ['cpi_cult', 'Văn hoá, giải trí, du lịch', C.tealInk, 1.6], ['cpi_other', 'Hàng hoá, dịch vụ khác', C.gold, 1.6], ['cpi_bev', 'Đồ uống, thuốc lá', C.grey, 1.4]] };
  wireTf('eCpiG', k => mk('eCpiTs', { type: 'line', data: { labels: eLab('2019-01'), datasets: CG[k || 'core'].map(([kk, n, c, w]) => L(n, eSl(kk, '2019-01'), c, { borderWidth: w })) },
    options: { scales: { y: pctAxis('') }, plugins: { refLines: { lines: [{ value: 4.5, label: '4,5%', color: C.grey }] } } } }, { win: 36 }));
  if (ECO.fc) { const A = ECO.fc.avg.slice().sort((a, b) => b[2] - a[2]);
    mk('eCpiFc', { type: 'bar', data: { labels: A.map(r => r[0].replace(/ \(.+\)$/, '') + (r[1] && !/^(Cơ sở|Mục tiêu)/.test(r[1]) ? ` · ${r[1]}` : '')), datasets: [
      { label: 'CPI bình quân 2026', data: A.map(r => r[2]), backgroundColor: A.map(r => /IMF|World Bank/.test(r[0]) ? C.purple : 'rgba(29,38,120,.7)'), dp: 2, unit: '%' }] },
      options: { indexAxis: 'y', interaction: { mode: 'index', intersect: false, axis: 'y' }, plugins: { legend: { display: false }, refLines: { lines: [{ value: 4.5, axis: 'x', label: 'Mục tiêu 4,5%', color: C.red }] } }, scales: { x: pctAxis('', { min: 3.5 }), y: { ticks: { autoSkip: false, font: { size: 11 } }, grid: { display: false } } } } }); }
  wireTf('eXnkK', k => { k = k || 'xk';
    mk('eXnk', { type: 'line', data: { labels: labs, datasets: [L('Tổng', eSl(k, F), C.navy, { borderWidth: 2.6 }), L('Khu vực trong nước', eSl(k + '_dom', F), C.red, { borderWidth: 1.8 }), L('Khu vực FDI', eSl(k + '_fdi', F), C.tealInk, { borderWidth: 1.8 })] },
      options: { scales: { y: pctAxis('') }, plugins: { refLines: { lines: [{ value: 0, label: '', color: C.grey }] } } } }, { win: 36 }); });
  mk('eTb', { type: 'bar', data: { labels: labs, datasets: [
    { label: 'Trong nước (tháng)', data: eSl('tb_dom', F), backgroundColor: 'rgba(192,57,43,.65)', dp: 2, unit: ' tỷ USD', yAxisID: 'y', order: 3 },
    { label: 'FDI (tháng)', data: eSl('tb_fdi', F), backgroundColor: 'rgba(31,138,141,.65)', dp: 2, unit: ' tỷ USD', yAxisID: 'y', order: 3 },
    L('Trong nước 12 tháng', eSl('tb_dom_ttm', F), C.red, { yAxisID: 'y1', unit: ' tỷ USD', dp: 1, order: 1 }), L('FDI 12 tháng', eSl('tb_fdi_ttm', F), C.tealInk, { yAxisID: 'y1', unit: ' tỷ USD', dp: 1, order: 1 }),
    L('Tổng 12 tháng', eSl('tb_ttm', F), C.navy, { yAxisID: 'y1', unit: ' tỷ USD', dp: 1, borderDash: [5, 4], order: 1 })] },
    options: { scales: { y: numAxis('tỷ USD/tháng'), y1: numAxis('12 tháng', { position: 'right', grid: { display: false } }) } } }, { win: 36 });
  mk('eFdi', { type: 'bar', data: { labels: labs, datasets: [
    { label: 'Thực hiện', data: eSl('fdi_real', F), backgroundColor: 'rgba(29,38,120,.75)', dp: 2, unit: ' tỷ USD', order: 3 },
    { label: 'Đăng ký', data: eSl('fdi_reg', F), backgroundColor: 'rgba(89,197,200,.55)', dp: 2, unit: ' tỷ USD', order: 3 },
    L('Thực hiện lũy kế YoY', eSl('fdi_real_ytd_yoy', F), C.navy, { yAxisID: 'y1', order: 1 }), L('Đăng ký lũy kế YoY', eSl('fdi_reg_ytd_yoy', F), C.tealInk, { yAxisID: 'y1', borderDash: [5, 4], order: 1 })] },
    options: { scales: { y: numAxis('tỷ USD'), y1: pctAxis('', { position: 'right', grid: { display: false } }) } } }, { win: 36 });
  { const lm = eLast('pub_ytd').d, mo = lm.slice(5), yrs = [...new Set(EM.map(m => m.slice(0, 4)))].filter(y => y >= '2019');
    const ytd = yrs.map(y => eAt('pub_ytd', `${y}-${mo}`)), full = yrs.map(y => y < lm.slice(0, 4) ? eAt('pub_ytd', `${y}-12`) : null);
    mk('ePubY', { type: 'bar', data: { labels: yrs, datasets: [
      { label: `Lũy kế ${+mo} tháng`, data: ytd, backgroundColor: 'rgba(29,38,120,.8)', dp: 0, unit: ' nghìn tỷ', order: 2, grouped: false },
      { label: 'Cả năm', data: full, backgroundColor: 'rgba(29,38,120,.18)', dp: 0, unit: ' nghìn tỷ', order: 3, grouped: false },
      L(`Lũy kế ${+mo} tháng so cùng kỳ`, yrs.map(y => eAt('pub_ytd_yoy', `${y}-${mo}`)), C.red, { yAxisID: 'y1', pointRadius: 3, order: 1 })] },
      options: { scales: { y: numAxis('nghìn tỷ'), y1: pctAxis('', { position: 'right', grid: { display: false } }) } } }); }
  mk('ePubM', { type: 'bar', data: { labels: labs, datasets: [{ label: 'Giải ngân trong tháng', data: eSl('pub', F), backgroundColor: 'rgba(29,38,120,.7)', dp: 1, unit: ' nghìn tỷ', order: 2 },
    L('So cùng kỳ', eSl('pub_yoy', F), C.red, { yAxisID: 'y1', order: 1 })] },
    options: { scales: { y: numAxis('nghìn tỷ'), y1: pctAxis('', { position: 'right', grid: { display: false } }) } } }, { win: 36 });
  if (BD) chBond();   // giá dầu, xăng dầu (chOil, chOilChg) vẽ cùng nhóm dữ liệu trái phiếu
}

/* =====================================================================
   VĨ MÔ › VIỆT NAM & THẾ GIỚI (heatmap theo tháng)
===================================================================== */
const HM_R = [['13', '1 năm'], ['37', '3 năm'], ['61', '5 năm'], ['121', '10 năm'], ['241', '20 năm'], ['all', 'Tất cả']];   // khung thời gian của bản đồ nhiệt
const hmMonths = last => { const out = []; let m = last; const n = hmS.n === 'all' ? 9999 : +hmS.n; for (let i = 0; i < n && m >= '1990-01'; i++) { out.unshift(m); m = ePrevM(m); } return out; };
/* lịch sử dài (data/hm-hist.js): chỉ dùng cho tháng mà số hiện hành chưa có */
const HH = window.HM_HIST || {};
const hAt = (o, m) => { if (!o) return null; const i = (+m.slice(0, 4) - +o.s.slice(0, 4)) * 12 + (+m.slice(5) - +o.s.slice(5)); return i < 0 || i >= o.v.length ? null : o.v[i]; };
const hW = (k, cc, m) => hAt(HH.w && HH.w[k] && HH.w[k][cc], m);
const hV = (k, m) => hAt(HH.vn && HH.vn[k], m);
const gM = (k, m) => { const x = gs(k); const i = x.d.findIndex(d => d.slice(0, 7) === m); if (i >= 0 && x.d[i].length === 7) return x.v[i]; return gMEnd(k, m); };
const gMAvg = (k, m) => { const x = gs(k), v = []; x.d.forEach((d, i) => { if (d.slice(0, 7) === m && x.v[i] != null) v.push(x.v[i]); }); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const cpiM = (k, m) => { const x = cpiSer(k); const i = x.d.indexOf(m); return i < 0 ? null : x.v[i]; };
const omoAt = m => { let r = null; (dom.omoDaily || []).forEach(p => { if (p.d.slice(0, 7) <= m) r = p.v; }); return r ?? byM(dom.omo)[m]; };   // lãi suất OMO: giữ mức phiên gần nhất (tháng không có phiên nào)
const polM = (k, m) => { if (k === 'vn') return m > TODAY.slice(0, 7) ? null : omoAt(m); return gM(k + '_m', m); };
/* chuỗi tỷ giá theo ngày bắt đầu 01/2021: năm 2021 lấy phiên đầu năm làm gốc */
const gYearStart = (k, y) => { const x = gs(k); const i = x.d.findIndex((d, j) => d.slice(0, 4) === y && x.v[j] != null); return i < 0 ? null : x.v[i]; };
const fxYtd = (k, inv, m) => { const y0 = gMEnd(k, `${+m.slice(0, 4) - 1}-12`) ?? gYearStart(k, m.slice(0, 4)), v = gMEnd(k, m); return y0 == null || v == null ? null : (inv ? y0 / v - 1 : v / y0 - 1) * 100; };   // % thay đổi giá trị đồng tiền so với USD từ đầu năm
const vnFxAt = m => mEnd(dom.nhtmD, m) ?? byM(dom.nhtmSell)[m];
const vnFxYtd = m => { const y0 = vnFxAt(`${+m.slice(0, 4) - 1}-12`), v = vnFxAt(m); return y0 == null || v == null ? null : (y0 / v - 1) * 100; };
// [mã, tên, CPI key, policy key, 10Y key, FX (key, đảo), PMI key]
const HM_C = [['vn', 'Việt Nam', 'vn', 'vn', 'vn', 'vn', 'vn_pmi'], ['us', 'Mỹ', 'us_cpi_yoy', 'pol_us', 'us_10y_d', null, 'us_ism_mfg'], ['ea', 'Khu vực euro', 'ea_hicp', 'pol_xm', 'de_10y_d', ['eurusd_d', 0], 'ea_pmi_mfg'],
  ['jp', 'Nhật Bản', 'jp_cpi_main', 'pol_jp', 'jp_10y_d', ['usdjpy_d', 1], null], ['cn', 'Trung Quốc', 'cn_cpi', 'pol_cn', 'cn_10y_d', ['usdcny_d', 1], 'cn_pmi_mfg'], ['gb', 'Anh', 'cpi_gb', 'pol_gb', 'gb_10y_d', ['gbpusd_d', 0], null],
  ['kr', 'Hàn Quốc', 'cpi_kr', 'pol_kr', 'kr_10y_d', null, null], ['ca', 'Canada', 'cpi_ca', 'pol_ca', 'y10_ca_m', ['usdcad_d', 1], null], ['au', 'Úc', 'cpi_au', 'pol_au', 'y10_au_m', null, null],
  ['nz', 'New Zealand', 'cpi_nz', 'pol_nz', null, null, null], ['ch', 'Thụy Sĩ', null, 'pol_ch', null, ['usdchf_d', 1], null], ['in', 'Ấn Độ', 'cpi_in', 'pol_in', null, ['usdinr_d', 1], null],
  ['id', 'Indonesia', 'cpi_id', 'pol_id', null, ['usdidr_d', 1], null], ['th', 'Thái Lan', 'cpi_th', 'pol_th', null, null, null], ['my', 'Malaysia', 'cpi_my', 'pol_my', null, null, null],
  ['ph', 'Philippines', 'cpi_ph', 'pol_ph', null, null, null], ['sg', 'Singapore', 'cpi_sg', null, 'sg_10y_d', ['usdsgd_d', 1], null]];
const y10M = (k, m) => k === 'vn' ? byM(intl.vn10)[m] : /_m$/.test(k) ? gM(k, m) : gMAvg(k, m);
const nowM = () => TODAY.slice(0, 7);
const polX = (c, m) => m > nowM() ? null : (c[3] ? polM(c[3], m) : null) ?? (c[0] === 'vn' ? hV('omo', m) ?? hV('refi', m) : hW('pol', c[0], m));
const cpiX = (c, m) => (c[2] ? cpiM(c[2], m) : null) ?? (c[0] === 'vn' ? hV('cpi', m) : hW('cpi', c[0], m));
const y10X = (c, m) => (c[4] ? y10M(c[4], m) : null) ?? (c[0] === 'vn' ? hV('vn10', m) : hW('y10', c[0], m));
const vnFxYtdX = m => { const v = vnFxYtd(m); if (v != null) return v; const u = hV('fx_ytd', m); return u == null ? null : (100 / (100 + u) - 1) * 100; };   // giá trị VND so với USD
const fxX = (c, m) => { const v = c[5] === 'vn' ? vnFxYtdX(m) : c[5] ? fxYtd(c[5][0], c[5][1], m) : c[0] === 'us' ? (() => { const y0 = gMEnd('dxy_d', `${+m.slice(0, 4) - 1}-12`) ?? gYearStart('dxy_d', m.slice(0, 4)), v = gMEnd('dxy_d', m); return y0 && v ? (v / y0 - 1) * 100 : null; })() : null;
  return v ?? (c[0] === 'vn' || m > nowM() ? null : hW('fx', c[0], m)); };
const HM_W = [
  ['pol', 'Lãi suất điều hành', 'ấm = cao/tăng (thắt chặt)', polX, 'hi-red', 2, '%/năm cuối tháng · Việt Nam: lãi suất OMO 7 ngày (trước 2016: lãi suất tái cấp vốn) · Fed: cận trên · ECB: tiền gửi · Trung Quốc: LPR 1 năm'],
  ['cpi', 'Lạm phát CPI', 'ấm = lạm phát cao', cpiX, 'hi-red', 1, '% so cùng kỳ · Úc, New Zealand: số quý'],
  ['real', 'Lãi suất thực', 'xanh = dương cao (chặt)', (c, m) => { const p = polX(c, m), i = cpiX(c, m); return p == null || i == null ? null : p - i; }, 'hi-green', 2, 'lãi suất điều hành − CPI cùng tháng, điểm %'],
  ['y10', 'Lợi suất 10 năm', 'ấm = cao', y10X, 'hi-red', 2, '%/năm, bình quân tháng · khu vực euro: Bund Đức'],
  ['fx', 'Tỷ giá so với USD', 'xanh = đồng tiền mạnh lên', fxX, 'hi-green', 1, '% thay đổi giá trị đồng tiền so với USD từ đầu năm (cuối tháng; trước 1999: bình quân tháng) · Mỹ: DXY (trước 2021: chỉ số USD của Fed) · Việt Nam: NHTM bán ra (trước 2017: tỷ giá trung tâm của NHNN)'],
  ['pmi', 'PMI sản xuất', 'xanh = trên 50', (c, m) => c[6] ? gM(c[6], m) : null, 'pmi', 1, 'điểm · Mỹ: ISM · Trung Quốc: NBS · khu vực euro: HCOB'],
];
const vnFree = m => { const a = mEnd(dom.freeD, m) ?? byM(dom.free)[m], b = mEnd(dom.nhtmD, m) ?? byM(dom.nhtmSell)[m]; return a == null || b == null ? null : a - b; };
const HM_V = [
  ['Hoạt động kinh tế'],
  ['GDP thực (quý, YoY)', m => { const i = (ECO.q || []).indexOf(m); return (i < 0 ? null : ECO.gq.gdp[i]) ?? hV('gdp', m); }, 'hi-green', 2],
  ['Tổng mức bán lẻ (YoY)', m => eAt('ret', m) ?? hV('ret', m), 'hi-green', 2], ['Bán lẻ thực, trừ CPI (YoY)', m => { const a = eAt('ret', m) ?? hV('ret', m), b = eAt('cpi', m) ?? hV('cpi', m); return a == null || b == null ? null : a - b; }, 'hi-green', 2],
  ['Xuất khẩu (YoY)', m => eAt('xk', m) ?? hV('xk', m), 'hi-green', 2], ['Nhập khẩu (YoY)', m => eAt('nk', m) ?? hV('nk', m), 'hi-green', 2], ['Cán cân thương mại (tỷ USD)', m => eAt('tb', m) ?? hV('tb', m), 'sign', 2],
  ['Sản xuất công nghiệp IIP (YoY)', m => eAt('iip', m) ?? hV('iip', m), 'hi-green', 2], ['PMI sản xuất', m => eAt('pmi', m) ?? hV('pmi', m), 'pmi', 1],
  ['FDI đăng ký (YoY)', m => eAt('fdi_reg_yoy', m) ?? hV('fdi_reg_yoy', m), 'hi-green', 1], ['FDI thực hiện (YoY)', m => eAt('fdi_real_yoy', m) ?? hV('fdi_real_yoy', m), 'hi-green', 1], ['Vốn đầu tư ngân sách (YoY)', m => eAt('pub_yoy', m) ?? hV('pub_yoy', m), 'hi-green', 1], ['Khách quốc tế (YoY)', m => eAt('tour_yoy', m) ?? hV('tour', m), 'hi-green', 1],
  ['Giá cả'],
  ['CPI (YoY)', m => eAt('cpi', m) ?? hV('cpi', m), 'hi-red', 2], ['Lạm phát cơ bản (YoY)', m => eAt('cpi_core', m) ?? hV('cpi_core', m), 'hi-red', 2], ['CPI bình quân từ đầu năm', m => byM(dom.cpiAvg)[m] ?? hV('cpi_avg', m), 'hi-red', 2],
  ['Tài chính – tiền tệ'],
  ['Tín dụng (YoY)', m => byM(dom.creditYoY)[m] ?? hV('credit', m), 'hi-green', 1], ['Tiền gửi (YoY)', m => byM(dom.depYoY)[m] ?? hV('dep', m), 'hi-green', 1], ['Cung tiền M2 (YoY)', m => byM(dom.m2)[m] ?? hV('m2', m), 'hi-green', 1],
  ['Lãi suất OMO (cuối tháng)', m => m > nowM() ? null : polM('vn', m) ?? hV('omo', m), 'hi-red', 2], ['Lãi suất tái cấp vốn', m => m > nowM() ? null : hV('refi', m), 'hi-red', 2],
  ['LNH qua đêm (bình quân tháng)', m => mAvg(dom.onDaily, m) ?? hV('on', m), 'hi-red', 2],
  ['Chênh LNH qua đêm − lãi suất Fed', m => { const a = mAvg(dom.onDaily, m) ?? hV('on', m), b = gMAvg('us_effr_d', m) ?? byM(intl.effr)[m] ?? hW('pol', 'us', m); return a == null || b == null ? null : a - b; }, 'hi-green', 2],
  ['Huy động 12T NHTM Nhà nước', m => mEnd(dom.dep12StateD, m) ?? byM(dom.dep12State)[m] ?? hV('dep12s', m) ?? hV('dep12vcb', m), 'hi-red', 2], ['Huy động 12T NHTM lớn', m => mEnd(dom.dep12LargeD, m) ?? byM(dom.dep12Large)[m], 'hi-red', 2],
  ['TPCP 10 năm', m => byM(intl.vn10)[m] ?? hV('vn10', m), 'hi-red', 2],
  ['USD/VND từ đầu năm (%; dương = VND mất giá)', m => { const v = vnFxYtd(m); return v != null ? -v : hV('fx_ytd', m); }, 'hi-red', 2], ['Chênh tự do − NHTM (đồng)', m => vnFree(m) ?? hV('free_gap', m), 'hi-red', 0],
  ['Dự trữ ngoại hối (tỷ USD)', m => { const v = byM(dom.reserves)[m] ?? hV('res', m); return v == null ? null : v / 1000; }, 'hi-green', 1],
];
const HM_TIP = { 'hi-red': 'càng cao càng đậm đỏ', 'hi-green': 'càng cao càng đậm xanh', pmi: 'xanh trên 50, đỏ dưới 50', sign: 'xanh dương, đỏ âm' };
const hmQ = new WeakMap();   // phân vị theo từng dòng/bảng, tính một lần
function hmColor(v, all, mode) {
  if (v == null) return '';
  let Q = hmQ.get(all);
  if (!Q) { const q = all.filter(x => x != null).sort((a, b) => a - b), pq = f => q[Math.min(q.length - 1, Math.max(0, Math.round(f * (q.length - 1))))];
    Q = q.length ? { lo: pq(0.05), hi: pq(0.95), mx: q.reduce((a, b) => Math.max(a, Math.abs(b)), 0) || 1 } : {}; hmQ.set(all, Q); }   // thang màu theo phân vị 5–95% để vài giá trị cực đoan (vd. khách quốc tế sau COVID) không làm nhạt cả dòng
  if (Q.lo == null) return '';
  let t;   // −1 … 1 (âm = đỏ, dương = xanh)
  if (mode === 'pmi') t = Math.max(-1, Math.min(1, (v - 50) / 4));
  else if (mode === 'sign') t = v / Q.mx;
  else { const { lo, hi } = Q; t = hi === lo ? 0 : Math.max(-1, Math.min(1, ((v - lo) / (hi - lo)) * 2 - 1)); if (mode === 'hi-red') t = -t; }
  const a = (0.12 + Math.abs(t) * 0.6).toFixed(2);
  return `background:rgba(${t >= 0 ? '30,143,90' : '192,57,43'},${a})${Math.abs(t) > 0.7 ? ';color:#fff' : ''}`;
}
function hmTable(cols, rows) {   // rows: [name, values[], mode, dp, cls, scale?] | [group]; scale = mảng giá trị dùng làm thang màu (mặc định chính dòng đó)
  const yrs = []; cols.forEach(c => { const y = c.slice(0, 4), l = yrs[yrs.length - 1]; if (l && l[0] === y) l[1]++; else yrs.push([y, 1]); });
  return `<div class="tscroll hm"><table class="hmt"><thead><tr><th class="hm-n" rowspan="2">${rows.hdr || 'Chỉ tiêu'}</th>${yrs.map(([y, n], i) => `<th colspan="${n}" class="hm-y${i ? ' ys' : ''}">${y}</th>`).join('')}</tr>
    <tr>${cols.map(c => `<th class="n${c.slice(5) === '01' ? ' ys' : ''}">${c.slice(5)}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(r => r.length === 1 ? `<tr class="grp"><td colspan="${cols.length + 1}"><span class="hm-gl">${r[0]}</span></td></tr>` : `<tr class="${r[4] || ''}${r.key != null ? ' hm-lk' + (r.key === rows.sel ? ' hm-sel' : '') : ''}"${r.key != null ? ` data-hk="${esc(r.key)}" title="Bấm để xem biểu đồ toàn bộ lịch sử"` : ''}><td class="hm-n">${r[0]}</td>${r[1].map((v, i) => `<td class="n${cols[i].slice(5) === '01' ? ' ys' : ''}" style="${hmColor(v, r[5] || r[1], r[2])}">${v == null ? '<span class="muted">–</span>' : nf(v, r[3])}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div>`;
}
const hmS = { v: 'world', w: 'pol', n: '61' };
try { Object.assign(hmS, JSON.parse(localStorage.getItem('fs-hm') || '{}')); } catch (e) {}
function hmTrim(cols, rows) {   // bỏ các tháng đầu bảng chưa có số nào (khung "Tất cả")
  const R = rows.filter(r => r.length > 1); let i = 0;
  while (i < cols.length - 1 && R.every(r => r[1][i] == null)) i++;
  if (i) R.forEach(r => { r[1] = r[1].slice(i); });
  return cols.slice(i);
}
function hmRender() {
  try { localStorage.setItem('fs-hm', JSON.stringify(hmS)); } catch (e) {}
  $$('#hmView button').forEach(b => b.classList.toggle('on', b.dataset.v === hmS.v));
  $('#hmW').hidden = hmS.v !== 'world';
  $$('#hmW button').forEach(b => b.classList.toggle('on', b.dataset.w === hmS.w));
  $$('#hmR button').forEach(b => b.classList.toggle('on', b.dataset.n === hmS.n));
  const box = $('#hmBox'); let html = '', note = '';
  if (hmS.v === 'world') {
    const W = HM_W.find(w => w[0] === hmS.w); let cols = hmMonths(TODAY.slice(0, 7));
    const rows = HM_C.map(c => Object.assign([c[1], cols.map(m => { const v = W[3](c, m); return v == null ? null : +v; }), W[4], W[5], c[0] === 'vn' ? 'hm-vn' : ''], { key: c[0] })).filter(r => r[1].some(v => v != null));
    rows.sel = hmSel.world;
    cols = hmTrim(cols, rows);
    const flat = rows.flatMap(r => r[1]); if (W[4] !== 'pmi') rows.forEach(r => r.push(flat));   // cùng thang màu cho cả bảng: so giữa các nước
    rows.hdr = 'Nước';
    html = hmTable(cols, rows);
    note = `${W[6]} · màu: ${W[2]} (so giữa các nước trong cả bảng) · ô trống = chưa công bố hoặc nguồn tự động chưa có`;
  } else {
    const lm = eLast('cpi').d, now = TODAY.slice(0, 7); let cols = hmMonths(now > lm ? now : lm);
    const rows = HM_V.map(r => r.length === 1 ? r : Object.assign([r[0], cols.map(m => { const v = r[1](m); return v == null ? null : +v; }), r[2], r[3]], { key: r[0] }));
    rows.sel = hmSel.vn;
    cols = hmTrim(cols, rows);
    html = hmTable(cols, rows);
    note = 'Màu theo từng dòng (so với chính chỉ tiêu đó trong khung thời gian đang xem): xanh = tốt cho tăng trưởng hoặc thanh khoản, đỏ = áp lực (lạm phát, lãi suất, tỷ giá tăng). PMI: xanh trên 50. GDP chỉ có ở tháng cuối quý.';
  }
  box.innerHTML = html + `<p class="hm-note">${note} · cuộn ngang để xem các tháng trước.</p>`;
  const sc = $('.tscroll', box); if (sc) sc.scrollLeft = sc.scrollWidth;   // mở ở tháng mới nhất
  $$('tr[data-hk]', box).forEach(tr => tr.onclick = () => { hmSel[hmS.v] = tr.dataset.hk; $$('tr.hm-sel', box).forEach(x => x.classList.remove('hm-sel')); tr.classList.add('hm-sel'); hmLine(); $('#hmLineCard').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  hmLine();
}
const hmSel = { world: 'vn', vn: 'CPI (YoY)' };
function hmLine() {   // biểu đồ toàn bộ lịch sử của dòng đang chọn trên bản đồ nhiệt; khung mở sẵn theo nút 1/3/5/10/20 năm
  if (!$('#hmLine')) return;
  const all = (() => { const o = []; let m = TODAY.slice(0, 7); while (m >= '1990-01') { o.unshift(m); m = ePrevM(m); } return o; })();
  let ds = [], title = '', sub = '', unit = '', dp = 2, ref = null;
  if (hmS.v === 'world') {
    const W = HM_W.find(w => w[0] === hmS.w), c = HM_C.find(x => x[0] === hmSel.world) || HM_C[0], vn = HM_C[0];
    const ser = cc => all.map(m => { const v = W[3](cc, m); return v == null ? null : +v; });
    ds = [L(c[1], ser(c), c[0] === 'vn' ? C.purple : C.navy, { borderWidth: 2.4, dp: W[5], unit: W[0] === 'pmi' ? '' : W[0] === 'fx' ? '%' : W[0] === 'real' ? ' điểm %' : '%' })];
    if (c[0] !== 'vn') ds.push(L('Việt Nam', ser(vn), C.purple, { borderWidth: 1.6, borderDash: [5, 4], dp: W[5], unit: ds[0].unit }));
    const add = (k, lb, col) => { const w2 = HM_W.find(w => w[0] === k); ds.push(L(`${lb} ${c[1]}`, all.map(m => { const v = w2[3](c, m); return v == null ? null : +v; }), col, { borderWidth: 1.4, dp: w2[5], unit: '%' })); };
    if (W[0] === 'pol') add('cpi', 'CPI', C.gold);   // lãi suất điều hành đặt cạnh lạm phát
    if (W[0] === 'real') { add('pol', 'Lãi suất điều hành', C.tealInk); add('cpi', 'CPI', C.gold); }
    title = `${W[1]}: ${c[1]}${c[0] !== 'vn' ? ' so với Việt Nam' : ''}`; sub = W[6]; unit = W[0] === 'pmi' ? 'điểm' : '%'; dp = W[5]; ref = W[0] === 'pmi' ? 50 : ['real', 'fx'].includes(W[0]) ? 0 : null;
  } else {
    const r = HM_V.find(x => x[0] === hmSel.vn && x.length > 1) || HM_V.find(x => x.length > 1);
    ds = [L(r[0], all.map(m => { const v = r[1](m); return v == null ? null : +v; }), C.navy, { borderWidth: 2.4, dp: r[3], unit: /tỷ USD|đồng\)/.test(r[0]) ? '' : r[2] === 'pmi' ? '' : '%' })];
    title = `Việt Nam: ${r[0]}`; sub = 'số theo tháng · toàn bộ lịch sử hiện có'; unit = /tỷ USD/.test(r[0]) ? 'tỷ USD' : /đồng\)/.test(r[0]) ? 'đồng' : r[2] === 'pmi' ? 'điểm' : '%'; dp = r[3]; ref = r[2] === 'pmi' ? 50 : r[2] === 'sign' ? 0 : null;
  }
  let i0 = all.findIndex((_, i) => ds.some(d => d.data[i] != null)); if (i0 < 0) i0 = all.length - 1;
  ds.forEach(d => { d.data = d.data.slice(i0); });
  $('#hmLineH').textContent = title; $('#hmLineSub').textContent = `${sub} · bấm tên dòng khác trên bản đồ nhiệt để đổi biểu đồ`;
  const n = hmS.n === 'all' ? 0 : +hmS.n - 1;
  mk('hmLine', { type: 'line', data: { labels: all.slice(i0).map(mvn), datasets: ds },
    options: { scales: { x: { ticks: { maxTicksLimit: 12 } }, y: numAxis(unit, { beginAtZero: false, ticks: { callback: v => nf(v, dp > 1 ? 1 : dp) + (unit === '%' ? '%' : '') } }) },
      plugins: ref != null ? { refLines: { lines: [{ value: ref, label: '', color: C.grey }] } } : {} } }, { win: n });
}
function heatIns() {
  const m = TODAY.slice(0, 7), p = ePrevM(m);
  const rows = HM_C.map(c => { const pol = c[3] ? (polM(c[3], m) ?? polM(c[3], p)) : null; let cpi = null, cm = m; for (let i = 0; i < 4 && cpi == null; i++) { cpi = c[2] ? cpiM(c[2], cm) : null; if (cpi == null) cm = ePrevM(cm); } return { n: c[1], k: c[0], pol, cpi, real: pol != null && cpi != null ? pol - cpi : null }; }).filter(r => r.real != null).sort((a, b) => a.real - b.real);
  const vn = rows.find(r => r.k === 'vn'), up = (GD.polTab || []).filter(t => t.y0 != null && t.v > t.y0).map(t => t.n.replace(/ \(.+\)$/, '')), dn = (GD.polTab || []).filter(t => t.y0 != null && t.v < t.y0).map(t => t.n.replace(/ \(.+\)$/, ''));
  return `Từ đầu năm, <b>${up.length}</b> ngân hàng trung ương đã tăng lãi suất (${up.join(', ') || '—'}), ${dn.length} đã giảm (${dn.join(', ') || '—'}).`
    + (vn ? ` Lãi suất thực của Việt Nam (OMO trừ CPI) <b>${sg(vn.real, 2, ' điểm %')}</b>, thấp thứ ${rows.indexOf(vn) + 1}/${rows.length} nước trong bảng — thấp hơn ${rows.filter(r => r.real > vn.real).map(r => r.n).slice(0, 4).join(', ')}.` : '')
    + how('Lãi suất thực âm hoặc thấp hơn các nước khác khiến giữ VND kém hấp dẫn so với USD và đồng tiền khu vực; trong bối cảnh các ngân hàng trung ương lớn đang tăng lãi suất, NHNN khó hạ lãi suất mà không làm tăng áp lực tỷ giá.');
}
function paneHeat() {
  $('#heat').innerHTML = `
  <h2 class="sec">Việt Nam &amp; Thế giới</h2>
  <p class="sec-sub">Chính sách tiền tệ và kinh tế Việt Nam đặt cạnh các nền kinh tế lớn, theo từng tháng. Số liệu lấy trực tiếp từ nguồn công bố (BIS, ngân hàng trung ương, cơ quan thống kê, NHNN, Cục Thống kê) và tự cập nhật; chọn "Tất cả" để xem toàn bộ lịch sử hiện có (từ 1990 với các nền kinh tế lớn, từ 2005 với Việt Nam).</p>
  <article class="card" id="hmCard"><h3 class="sub">Bản đồ nhiệt theo tháng</h3>
    <div class="picker" id="hmView"><button type="button" data-v="world">Thế giới</button><button type="button" data-v="vn">Việt Nam</button></div>
    <div class="picker" id="hmR">${HM_R.map(([k, l]) => `<button type="button" data-n="${k}">${l}</button>`).join('')}</div>
    <div class="picker" id="hmW">${HM_W.map(w => `<button type="button" data-w="${w[0]}">${w[1]}</button>`).join('')}</div>
    <div id="hmBox"></div>
    <div class="insight">${heatIns()}</div>
    <div class="src">BIS (lãi suất điều hành, CPI dài hạn); Fed, ECB, BOJ, NHNN; cơ quan thống kê các nước qua FRED, OECD, DBnomics; ISM, S&amp;P Global, HCOB, NBS (PMI); ECB, U.S. Treasury, Bộ Tài chính Nhật, ChinaBond, OECD qua FRED (lợi suất); ECB, Fed H.10 (tỷ giá); Cục Thống kê, NHNN, Bộ Tài chính, Vietcombank (Việt Nam)</div></article>
  <article class="card" id="hmLineCard"><h3 class="sub" id="hmLineH"></h3><p class="chart-sub" id="hmLineSub"></p>
    <div class="cbox tall"><canvas id="hmLine" role="img" aria-label="Biểu đồ dòng đang chọn trên bản đồ nhiệt"></canvas></div></article>
  <h3 class="ovh" id="hm-gl">Lợi suất, lạm phát và lãi suất điều hành toàn cầu</h3>
  <div data-cc="gl" data-book="1">${gGL()}</div>`;
  $$('#hmView button').forEach(b => b.onclick = () => { hmS.v = b.dataset.v; hmRender(); });
  $$('#hmW button').forEach(b => b.onclick = () => { hmS.w = b.dataset.w; hmRender(); });
  $$('#hmR button').forEach(b => b.onclick = () => { hmS.n = b.dataset.n; hmRender(); });
  hmRender();
  gDone.gl = true; drGL();
}

/* =====================================================================
   VĨ MÔ › HÀNG HÓA (bảng giá + biểu đồ; data/cmd-data.js)
===================================================================== */
const CMD = window.CMD_DATA || { groups: [], items: [] };
const cmdI = k => CMD.items.find(x => x.k === k);
const cmdN = it => { let n = it.v.length - 1; while (n >= 0 && it.v[n] == null) n--; return n; };
function cmdChg(it, back) {   // % thay đổi so với phiên trước ('p'), N ngày lịch trước, hoặc cuối năm trước ('ytd')
  const n = cmdN(it); if (n < 1) return null;
  let i = n - 1;
  if (back !== 'p') {
    const d = it.d[n], tgt = back === 'ytd' ? `${+d.slice(0, 4) - 1}-12-31` : new Date(new Date(d) - back * 864e5).toISOString().slice(0, 10);
    i = -1; for (let j = n - 1; j >= 0; j--) if (it.d[j] <= tgt) { i = j; break; }
    if (i < 0 || (new Date(tgt) - new Date(it.d[i])) / 864e5 > Math.max(10, back === 'ytd' ? 40 : back * 0.12)) return null;   // chuỗi chưa có số ở mốc đó
  }
  return it.v[i] ? (it.v[n] / it.v[i] - 1) * 100 : null;
}
const CMD_B = [['p', '1 ngày'], [7, '1 tuần'], [30, '1 tháng'], [91, '3 tháng'], ['ytd', 'Từ đầu năm'], [365, '1 năm'], [1095, '3 năm']];
const cmdTxt = it => `${it.n} <b>${sg(cmdChg(it, 'ytd'), 1)}</b>`;
function cmdTabIns() {
  const R = CMD.items.map(it => ({ it, y: cmdChg(it, 'ytd'), m: cmdChg(it, 30) })).filter(r => r.y != null);
  if (!R.length) return 'Đang nạp số liệu.';
  const up = R.slice().sort((a, b) => b.y - a.y), m = R.filter(r => r.m != null).sort((a, b) => b.m - a.m);
  return `Từ đầu năm tăng mạnh nhất: ${up.slice(0, 3).map(r => cmdTxt(r.it)).join(', ')}; giảm mạnh nhất: ${up.slice(-3).reverse().map(r => cmdTxt(r.it)).join(', ')}. `
    + `Một tháng qua: ${m.slice(0, 2).map(r => `${r.it.n} ${sg(r.m, 1)}`).join(', ')} dẫn đầu; ${m.slice(-2).reverse().map(r => `${r.it.n} ${sg(r.m, 1)}`).join(', ')} yếu nhất.`
    + how('Năng lượng và cước vận tải biển là hai nhóm truyền dẫn nhanh nhất vào CPI và chi phí doanh nghiệp Việt Nam (qua giá xăng điều chỉnh định kỳ và giá hàng nhập khẩu); giá nông sản, thủy sản, phân bón tác động trực tiếp tới thu nhập khu vực nông thôn và biên lợi nhuận của các doanh nghiệp đầu ngành.');
}
const CMD_GI = {   // hàm ý theo nhóm
  nl: 'Brent là giá chuẩn cho dầu nhập khẩu của châu Á; giá xăng trong nước điều chỉnh theo giá thành phẩm Singapore với độ trễ vài tuần. Dầu tăng cùng USD mạnh làm chi phí nhập khẩu và CPI chịu áp lực kép, thu hẹp dư địa nới lỏng của NHNN.',
  vt: 'BDTI, BCTI đo giá thuê tàu chở dầu thô và xăng dầu; BDI đo giá thuê tàu hàng rời (quặng, than, ngũ cốc). Cước tàu dầu tăng vọt thường do rủi ro trên tuyến Trung Đông (eo Hormuz, Biển Đỏ) buộc tàu đi đường vòng, có lợi cho doanh nghiệp vận tải dầu khí nhưng đẩy giá nhập khẩu xăng dầu.',
  kl: 'Vàng thế giới phản ánh lợi suất thực của Mỹ và nhu cầu trú ẩn; chênh lệch giữa vàng SJC và vàng thế giới quy đổi cho biết cung cầu vàng trong nước. Giá thép HRC Trung Quốc là mức neo cho giá thép trong nước và biên lợi nhuận ngành thép.',
  cn: 'Cao su và PVC Trung Quốc là giá tham chiếu cho doanh nghiệp cao su tự nhiên và nhựa xây dựng; giá phân bón trong nước đi theo giá khí đốt và giá urê, DAP thế giới, ảnh hưởng tới chi phí sản xuất nông nghiệp.',
  ns: 'Giá đường thế giới là trần giá cho đường trong nước; giá heo hơi phản ánh chu kỳ đàn và dịch bệnh; giá cá tra, tôm nguyên liệu quyết định biên lợi nhuận của doanh nghiệp chế biến thủy sản xuất khẩu.' };
function cmdGrpIns(g) {
  const its = CMD.items.filter(it => it.g === g); if (!its.length) return '';
  let t = its.map(it => { const n = cmdN(it); return `${it.n} <b>${nf(it.v[n], it.dp)}</b> ${it.u} (${sg(cmdChg(it, 30), 1)} 1 tháng, ${sg(cmdChg(it, 'ytd'), 1)} từ đầu năm)`; }).join('; ') + '.';
  if (g === 'kl') {   // chênh lệch vàng SJC − vàng thế giới quy đổi (1 lượng = 37,5 g = 1,20565 ounce)
    const s = cmdI('sjc'), w = cmdI('gold'), fx = vnFxAt(TODAY.slice(0, 7)) ?? vnFxAt(ePrevM(TODAY.slice(0, 7)));
    if (s && w && fx) { const sv = s.v[cmdN(s)] / 1000, wv = w.v[cmdN(w)] * 1.20565 * fx / 1e6;
      t += ` Vàng thế giới quy đổi (theo tỷ giá NHTM bán ra) khoảng <b>${nf(wv, 1)} triệu đồng/lượng</b>, vàng SJC cao hơn <b>${nf(sv - wv, 1)} triệu đồng/lượng</b> (${sg((sv / wv - 1) * 100, 1)}).`; }
  }
  return t + how(CMD_GI[g]);
}
let cmdSel = 'brent';
function cmdDraw() {
  const it = cmdI(cmdSel) || CMD.items[0]; if (!it) return;
  $$('#cmdTab tbody tr[data-k]').forEach(r => r.classList.toggle('sel', r.dataset.k === it.k));
  const s = $('#cmdSel'); if (s) s.value = it.k;
  const h = $('#cmdOneH'); if (h) h.textContent = `${it.n} (${it.u})`;
  const sr = $('#cmdOneSrc'); if (sr) sr.textContent = it.src;
  mk('cmdOne', { type: 'line', data: { labels: it.d.map(dvn), datasets: [L(it.n, it.v, C.navy, { unit: ' ' + it.u, dp: it.dp, borderWidth: 2 })] },
    options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 10 } }, y: numAxis(it.u, { beginAtZero: false, ticks: { callback: v => nf(v, it.dp > 1 ? 1 : 0) } }) } } }, { win: 36 });
}
function cmdAlign(it, days) {   // giá theo trục ngày chung, lấp ngày thiếu bằng số gần nhất (tối đa 10 ngày)
  const out = []; let j = -1;
  for (const d of days) { while (j + 1 < it.d.length && it.d[j + 1] <= d) j++;
    out.push(j >= 0 && it.v[j] != null && (new Date(d) - new Date(it.d[j])) / 864e5 <= 10 ? it.v[j] : null); }
  return out;
}
const CMD_CC = [C.navy, C.red, C.tealInk, C.gold, C.purple, C.grey];
function chCmd() {
  if (!$('#cmdOne')) return;
  cmdDraw();
  CMD.groups.forEach(([g]) => {
    const id = 'cmdG_' + g; if (!$('#' + id)) return;
    const its = CMD.items.filter(it => it.g === g);
    const last = its.reduce((a, it) => it.d[cmdN(it)] > a ? it.d[cmdN(it)] : a, '');
    const cut = new Date(new Date(last) - 3.2 * 365 * 864e5).toISOString().slice(0, 10);
    const days = [...new Set(its.flatMap(it => it.d.filter(d => d >= cut)))].sort();
    mk(id, { type: 'line', plugins: [fxRebase], data: { labels: days.map(dvn), datasets: its.map((it, i) => ({ label: it.n, $raw: cmdAlign(it, days), data: [],
        borderColor: CMD_CC[i % CMD_CC.length], backgroundColor: CMD_CC[i % CMD_CC.length], borderWidth: i ? 1.6 : 2.4, pointRadius: 0, spanGaps: true, dp: 1, unit: '%' })) },
      options: { scales: { x: { ticks: { maxTicksLimit: 10 } }, y: { ticks: { callback: v => nf(v, 0) + '%' }, grid: { color: '#eef0f4' } } }, plugins: { refLines: { lines: [{ value: 0, label: '', color: C.grey }] } } } }, { win: 12 });
  });
}
function paneCmd() {
  const stale = d => (new Date(TODAY) - new Date(d)) / 864e5 > 10;
  const rows = CMD.groups.map(([g, gn]) => { const its = CMD.items.filter(it => it.g === g); if (!its.length) return '';
    return `<tr class="grp"><td colspan="${CMD_B.length + 4}">${gn}</td></tr>` + its.map(it => { const n = cmdN(it);
      return `<tr data-k="${it.k}"><td><b>${it.n}</b></td><td class="muted">${it.u}</td><td class="n"><b>${nf(it.v[n], it.dp)}</b></td>${CMD_B.map(([b]) => { const v = cmdChg(it, b);
        return `<td class="n" style="color:${v == null || Math.abs(v) < 0.005 ? '' : v > 0 ? '#1e8f5a' : '#c0392b'}">${v == null ? '—' : sg(v, 1)}</td>`; }).join('')}<td class="${stale(it.d[n]) ? 'muted' : ''}">${dvn(it.d[n])}</td></tr>`; }).join(''); }).join('');
  const srcs = [...new Set(CMD.items.map(it => it.src.replace(/ \(.+\)$/, '')))].join('; ');
  $('#cmd').innerHTML = `
  <h2 class="sec">Hàng hóa</h2>
  <p class="sec-sub">Giá năng lượng, cước vận tải biển, kim loại, nguyên liệu và nông sản trong nước và thế giới, kèm mức thay đổi theo các khung thời gian. Bấm vào một dòng để xem lịch sử giá.</p>
  <article class="card"><h3 class="sub">Bảng giá hàng hóa</h3>
    <p class="chart-sub">giá gần nhất · % thay đổi so với phiên trước, 1 tuần, 1 tháng, 3 tháng, cuối năm trước, 1 năm và 3 năm trước (xanh = giá tăng, đỏ = giá giảm) · ngày mờ = số chưa cập nhật hơn 10 ngày</p>
    <div class="tscroll"><table class="etab cm" id="cmdTab"><thead><tr><th>Hàng hóa</th><th>Đơn vị</th><th class="n">Giá gần nhất</th>${CMD_B.map(([, l]) => `<th class="n">${l}</th>`).join('')}<th>Ngày</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="insight">${cmdTabIns()}</div>
    <div class="src">${srcs}</div></article>
  <article class="card"><h3 class="sub"><span id="cmdOneH"></span></h3>
    <p class="chart-sub">giá theo ngày (phần trước 3 năm gần nhất: số cuối tháng) · chọn hàng hóa: <span class="psel"><select id="cmdSel">${CMD.groups.map(([g, gn]) => `<optgroup label="${gn}">${CMD.items.filter(it => it.g === g).map(it => `<option value="${it.k}">${it.n}</option>`).join('')}</optgroup>`).join('')}</select></span> · đổi khung bằng nút phía trên biểu đồ</p>
    <div class="cbox tall"><canvas id="cmdOne" role="img" aria-label="Lịch sử giá hàng hóa"></canvas></div>
    <div class="src">Nguồn: <span id="cmdOneSrc"></span></div></article>
  <h3 class="sec2">Diễn biến theo nhóm — % thay đổi từ đầu khung đang xem</h3>
  <div class="grid g2 gap">
    ${CMD.groups.filter(([g]) => CMD.items.some(it => it.g === g)).map(([g, gn]) => card({ id: 'cmdG_' + g, title: gn + ': ' + CMD.items.filter(it => it.g === g).map(it => it.n.replace(/ \(.+\)$/, '')).join(', '), h: 'tall',
      sub: '% thay đổi giá so với điểm đầu khung đang xem, theo ngày (cước Baltic, giá Trung Quốc và giá trong nước trước 3 tháng gần nhất: số cuối tuần) · đổi khung bằng nút phía trên biểu đồ',
      insight: cmdGrpIns(g), src: [...new Set(CMD.items.filter(it => it.g === g).map(it => it.src))].join('; ') })).join('')}
  </div>`;
  $$('#cmdTab tbody tr[data-k]').forEach(r => r.onclick = () => { cmdSel = r.dataset.k; cmdDraw(); $('#cmdOne').closest('article').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  $('#cmdSel').onchange = e => { cmdSel = e.target.value; cmdDraw(); };
  chCmd();
}
/* ---- Ngành › Vĩ mô tiền tệ: phần Mỹ thu gọn (Fed, đường cong UST, USD) ---- */
function drUsd(id) {
  const labs = monthsFrom('2021-01', TODAY.slice(0, 7));
  mk(id, { type: 'line', data: { labels: labs.map(mvn), datasets: [L('DXY', al(intl.dxy, labs), C.navy, { unit: '', dp: 1 }), L('USD/CNY', al(intl.cny, labs), C.purple, { unit: '', dp: 3, yAxisID: 'y1' })] },
    options: { scales: { y: numAxis('DXY'), y1: { position: 'right', grid: { display: false }, ticks: { callback: v => nf(v, 2) }, title: { display: true, text: 'USD/CNY' } } } } });
}
function usMiniCards() {
  return `${fedWatchCard({ id: 'nFedPath', compact: true })}
    ${card({ id: 'nUsCurve', title: 'Đường cong lợi suất trái phiếu Kho bạc Mỹ', h: 'tall', sub: '%/năm theo kỳ hạn 1 tháng – 30 năm · hôm nay so với 1 tuần, 1 tháng trước, đầu năm và 1 năm trước', insight: usCurveIns(), src: 'U.S. Treasury (Daily Treasury Par Yield Curve)' })}
    ${card({ id: 'nUsd', title: 'Đồng USD: DXY và USD/CNY', sub: 'Điểm · cuối tháng · trục phải USD/CNY (tăng = CNY mất giá)', insight: `DXY <b>${nf(lastv(intl.dxy).v, 1)}</b>, ${sg(yoyAt(intl.dxy, lastv(intl.dxy).d), 1)} so cùng kỳ; USD/CNY ${nf(lastv(intl.cny).v, 3)}.` + how('USD mạnh lên toàn diện (DXY tăng) đẩy USD/VND theo; CNY mạnh lên giúp giảm áp lực lên VND vì Trung Quốc là đối tác nhập khẩu lớn nhất.'), src: 'ICE (DXY), ECB; cuối tháng' })}`;
}
function drUsMini() { drawFedPath('nFedPath'); drUsCurve('nUsCurve'); drUsd('nUsd'); }

/* ---- Ngân hàng ---- */
const BMET = [['nim', 'NIM'], ['cof', 'COF'], ['yea', 'YEA'], ['casa', 'CASA'], ['npl', 'NPL'], ['g2', 'Nợ nhóm 2'], ['llr', 'Bao phủ nợ xấu'], ['ldr', 'LDR'], ['creditYoY', 'Tín dụng YoY'], ['roe', 'ROE'], ['cir', 'CIR']];
function subBank() {
  return `<div class="grid g2 gap">
    ${card({ id: 'chGrp', title: 'Chỉ số ngân hàng theo nhóm, theo quý', sub: 'Bình quân gia quyền theo dư nợ tín dụng · NIM, COF, YEA, ROE, CIR: TTM', h: 'tall',
      body: `<div class="picker" id="grpMetric">${BMET.map(([k, l]) => `<button type="button" data-k="${k}">${l}</button>`).join('')}</div>`, insight: '<span id="grpIns"></span>', src: 'WiData ratio_bank, ratio_bank_ttm · tự tính bình quân gia quyền' })}
    ${card({ id: 'chNimDep', title: 'NIM, COF ngành và lãi suất huy động 12T', sub: '% · quý · NIM, COF ngành (TTM) so với LS huy động 12T NHTM Nhà nước cuối quý — R-13: COF đi sau 1–3 quý', h: 'tall',
      insight: nimDepInsight(), src: 'WiData ratio_bank_ttm; macro 202886' })}
    ${D.ppopSector ? card({ id: 'chPpopBurden', title: 'Lợi nhuận trước dự phòng, chi phí dự phòng và LNST toàn ngành', h: 'tall', ctl: true, sub: 'nghìn tỷ đồng, cộng 4 quý · đường nét liền = PPOP, dự phòng, LNST · nét đứt vàng = chi phí dự phòng / lợi nhuận trước dự phòng (%, trục phải) · đổi sang cột bằng nút bên phải tiêu đề', insight: ppopBurdenIns(), src: 'BCTC hợp nhất 26 ngân hàng niêm yết · tự tính' }) : ''}
    ${card({ id: 'chPbBand', title: 'Định giá ngành: P/B và dải ±1σ', sub: `Lần · cuối tháng từ ${mvn(SV.from)} · ngành Ngân hàng (GICS 107, toàn bộ NH niêm yết)`, ctl: true,
      insight: `P/B ngành <b>${x(SV.now.pb)}</b> thấp hơn trung bình ${x(SV.pb.mean)} (${sg((SV.now.pb - SV.pb.mean) / SV.pb.sd, 1, 'σ')}) dù ROE ngành ~17–18%. Thị trường đang chiết khấu rủi ro lãi suất tăng (R-16 chưa thỏa); P/E ${x(SV.now.pe)} so với TB ${x(SV.pe.mean)}.`,
      src: 'WiData sector_ratio_daily (sector 107)' })}
    ${D.fee ? feeSecCards() : ''}
    ${card({ id: 'chAQ', title: 'Chất lượng tài sản theo nhóm', sub: `% · ${BQ[QI]} · NPL, nợ nhóm 2 (cột) và bao phủ nợ xấu (đường, trục phải)`,
      insight: aqInsight(), src: 'WiData ratio_bank' })}
  </div>`;
}
const FEE_COL = { pay: '#002060', ins: '#59C5C8', trust: '#861C52', sec: '#9a7400', adv: '#97BAFF', cash: '#9aa3b2', oth: '#FFD45D' };
function feeSecCards() {
  const F = D.fee, T = F.table, R = T.rows.filter(r => r.k === '_tot' || r.inc > 0), tot = R.find(r => r.k === '_tot');
  const g = k => R.find(r => r.k === k) || {};
  const sg2 = v => v == null ? '—' : (v > 0 ? '+' : '') + nf(v, 1) + '%';
  const B = [...F.banks].sort((a, b) => (b.incYoY ?? -1e9) - (a.incYoY ?? -1e9));
  return `${card({ id: 'chFeeSec', title: 'Lãi thuần dịch vụ toàn ngành theo mảng', sub: `nghìn tỷ đồng · năm · cộng ${F.n} ngân hàng niêm yết · ròng = thu − chi từng mảng · đổi sang tăng trưởng hoặc biên lợi nhuận bằng nút dưới chart`, body: FSK.feePicker('chFeeSec'),
      insight: `Năm ${T.year}, lãi thuần dịch vụ toàn ngành <b>${nf(tot.net / 1000, 1)} nghìn tỷ</b> (${sg2(tot.netYoY)}), biên <b>${pc(tot.margin, 0)}</b>. <b>Thanh toán</b> vẫn lớn nhất (${pc(g('pay').share, 0)}) nhưng gần như không tăng (thu ${sg2(g('pay').incYoY)}, ròng ${sg2(g('pay').netYoY)}) trong bối cảnh chuyển khoản trực tuyến phần lớn đã miễn phí. <b>Bảo hiểm</b> thu ${sg2(g('ins').incYoY)} nhưng ròng ${sg2(g('ins').netYoY)} — chi cho hoạt động bảo hiểm tăng nhanh hơn thu. Động lực tăng là nhóm <b>khác (thẻ, bảo lãnh…)</b>: ròng ${sg2(g('oth').netYoY)}, cùng chứng khoán ${sg2(g('sec').incYoY)} và tư vấn ${sg2(g('adv').incYoY)} (quy mô nhỏ).`,
      src: 'Thuyết minh BCTC hợp nhất năm của 26 ngân hàng niêm yết (thu, chi hoạt động dịch vụ theo loại) · tự tổng hợp' })}
    <article class="card"><h3 class="sub">Thu phí theo mảng · toàn ngành năm ${T.year}</h3><p class="chart-sub">tỷ đồng · biên = lãi thuần / thu · tỷ trọng trên lãi thuần dịch vụ</p>
      <div class="tscroll"><table><thead><tr><th>Mảng</th><th class="n">Thu</th><th class="n">Thu YoY</th><th class="n">Lãi thuần</th><th class="n">Lãi thuần YoY</th><th class="n">Biên</th><th class="n">Tỷ trọng</th></tr></thead><tbody>
      ${R.map(r => `<tr${r.k === '_tot' ? ' style="font-weight:700"' : ''}><td>${esc(r.name)}</td><td class="n">${nf(r.inc)}</td><td class="n">${sg2(r.incYoY)}</td><td class="n">${nf(r.net)}</td><td class="n">${sg2(r.netYoY)}</td><td class="n">${r.margin == null ? '—' : pc(r.margin, 0)}</td><td class="n">${r.share == null ? '—' : pc(r.share, 0)}</td></tr>`).join('')}
      </tbody></table></div>
      <details class="more"><summary>Từng ngân hàng: thu phí, biên, mảng lớn nhất và tăng nhanh nhất</summary><div class="tscroll"><table><thead><tr><th>NH</th><th class="n">Thu ${T.year}</th><th class="n">YoY</th><th class="n">Biên</th><th>Mảng lớn nhất</th><th>Tăng nhanh nhất (≥5% thu)</th></tr></thead><tbody>
      ${B.map(b => `<tr><td><b>${b.s}</b></td><td class="n">${nf(b.inc)}</td><td class="n">${sg2(b.incYoY)}</td><td class="n">${b.margin == null ? '—' : pc(b.margin, 0)}</td><td>${esc(b.big || '—')} ${b.bigShare != null ? `<span class="muted">${pc(b.bigShare, 0)}</span>` : ''}</td><td>${esc(b.fast || '—')} ${b.fastYoY != null ? `<span class="muted">${sg2(b.fastYoY)}</span>` : ''}</td></tr>`).join('')}
      </tbody></table></div></details>
      <div class="src">Chi viễn thông và chi môi giới không tách được theo mảng, gộp vào "Khác"; chứng khoán chỉ có phía thu.</div></article>`;
}
function drawFeeSec() {
  const F = D.fee;
  FSK.wireFee('chFeeSec', m => mk('chFeeSec', FSK.feeCfg(F.sector, F.years, F.lines, m, { noMargin: ['sec'], colors: FEE_COL, scale: m === 'net' ? 1000 : 1, unit: ' nghìn tỷ', minBase: 300 })));
}
function nimDepInsight() {
  const d0 = AG.cof.all[QI - 2], d1 = AG.cof.all[QI];
  return `COF ngành tăng từ ${pc(d0, 2)} (${BQ[QI - 2]}) lên <b>${pc(d1, 2)}</b> (${BQ[QI]}) — đi sau cú tăng LS huy động 12T từ 12/2025 đúng như R-13. NIM ngành ${pc(AG.nim.all[QI], 2)} giữ được nhờ YEA tăng theo (${pc(AG.yea.all[QI], 2)}), nhưng COF Q4 vẫn phản ánh mức 5,9% của 12T (tiền gửi cũ còn kỳ hạn); đợt hạ về 5,4% ngày 20–21/10/2026 chỉ ngấm dần vào COF từ năm 2027.`;
}
function aqInsight() {
  const g = GROUPS.map(gg => `${gg}: NPL ${pc(AG.npl[gg][QI], 2)}, bao phủ ${pc(AG.llr[gg][QI], 0)}`).join(' · ');
  return `${g}. Big 4 dày đệm dự phòng nhất (VCB bao phủ ~280%); nhóm vừa và nhỏ có NPL cao, bao phủ dưới 70% — nhạy nhất nếu lãi suất cao kéo dài (R-14).`;
}
function chBank() {
  drPpop();
  drawGrp('nim');
  if (D.fee) drawFeeSec();
  $$('#grpMetric button').forEach(b => b.onclick = () => drawGrp(b.dataset.k));
  const qEnd = { 1: '03', 2: '06', 3: '09', 4: '12' };
  const depQ = BQ.map(q => byM(dom.dep12State)[`${q.slice(3)}-${qEnd[q[1]]}`] ?? null);
  mk('chNimDep', { type: 'line', data: { labels: BQ, datasets: [L('NIM ngành', AG.nim.all, C.navy, { borderWidth: 2.6, pointRadius: 2 }), L('COF ngành', AG.cof.all, C.red, { pointRadius: 2 }), L('YEA ngành', AG.yea.all, C.tealInk, { pointRadius: 2, borderDash: [4, 3] }), L('LS huy động 12T NN', depQ, C.gold, { pointRadius: 2, borderDash: [2, 3] })] },
    options: { scales: { y: pctAxis() } } });
  const sm = SV.monthly, mean = SV.pb.mean, sd = SV.pb.sd;
  mk('chPbBand', { type: 'line', data: { labels: sm.map((p, i) => i === sm.length - 1 && SV.now && p.d === SV.now.d ? dvn(p.d) + ' (mới nhất)' : mvn(p.d)), datasets: [L('P/B ngành', sm.map(p => p.pb), C.navy, { unit: 'x', borderWidth: 2.4 }),
    L('TB', sm.map(() => mean), C.grey, { unit: 'x', borderDash: [4, 3], keep: true }), L('+1σ', sm.map(() => mean + sd), C.red, { unit: 'x', borderDash: [2, 3], borderWidth: 1, keep: true }), L('−1σ', sm.map(() => mean - sd), C.tealInk, { unit: 'x', borderDash: [2, 3], borderWidth: 1, keep: true })] },
    options: { scales: { y: numAxis('', { ticks: { callback: v => nf(v, 2) + 'x' } }) } } }, { switch: 'line' });
  mk('chAQ', { type: 'bar', data: { labels: GROUPS, datasets: [
    { label: 'NPL', data: GROUPS.map(g => AG.npl[g][QI]), backgroundColor: C.red, dp: 2, unit: '%' }, { label: 'Nợ nhóm 2', data: GROUPS.map(g => AG.g2[g][QI]), backgroundColor: C.gold, dp: 2, unit: '%' },
    L('Bao phủ nợ xấu', GROUPS.map(g => AG.llr[g][QI]), C.navy, { yAxisID: 'y1', pointRadius: 4, dp: 0 })] },
    options: { scales: { y: pctAxis(), y1: pctAxis('Bao phủ', { position: 'right', grid: { display: false } }) } } });
}
function drawGrp(k) {
  $$('#grpMetric button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
  const lab = Object.fromEntries(BMET)[k];
  mk('chGrp', { type: 'line', data: { labels: BQ, datasets: [L('Ngành', AG[k].all, '#000', { borderWidth: 2.6, borderDash: [5, 3] }), ...GROUPS.map(g => L(g, AG[k][g], GC[g], { pointRadius: 2 }))] },
    options: { scales: { y: pctAxis() } } });
  const a = AG[k].all, ch = a[QI] - a[QY];
  const rk = GROUPS.map(g => [g, AG[k][g][QI]]).sort((p, q) => q[1] - p[1]);
  $('#grpIns').innerHTML = `${lab} ngành ${BQ[QI]} <b>${pc(a[QI], 2)}</b>, ${sg(ch, 2, ' điểm %')} so với cùng kỳ. Cao nhất ${rk[0][0]} ${pc(rk[0][1], 2)}, thấp nhất ${lastv(rk)[0]} ${pc(lastv(rk)[1], 2)}.`;
}

/* ---- Kịch bản IDX ---- */
/* ---- Trái phiếu: FI (ngân hàng phát hành) · TPDN · G-bond — dữ liệu window.BOND_DATA (scripts/build_bond_data.py) ---- */
const BD = window.BOND_DATA;
const BTIER = ['Big 4', 'Tư nhân lớn', 'Tư nhân vừa', 'Tư nhân nhỏ'];
const nk = v => v == null ? '—' : nf(v / 1000, 1) + ' nghìn tỷ';
const bIdx = (arr, d) => { let k = -1; arr.forEach((x, i) => { if (x <= d) k = i; }); return k; };
const dAgo = (d, n) => { const t = new Date(d); t.setDate(t.getDate() - n); return t.toISOString().slice(0, 10); };
function bondNums() {
  const dp = BD.dep, n = dp.months.length - 1, T = dp.tiers;
  const fi = BD.fi, p = fi.cpnPriv13.map((v, i) => [i, v]).filter(x => x[1] != null), pl = p[p.length - 1];
  const bigAt = m => { const j = dp.months.indexOf(m); return j < 0 ? null : T['Big 4'][j]; };
  const cv = BD.gb.curve, ci = cv.d.length - 1, c3 = bIdx(cv.d, dAgo(cv.d[ci], 91)), cy = bIdx(cv.d, dAgo(cv.d[ci], 365)), c0 = bIdx(cv.d, cv.d[ci].slice(0, 4) + '-01-01');
  const a = BD.gb.auc, ai = a.months.length - 1;
  const cut = dp.banks.filter(b => b.m1 != null && b.v < b.m1), up = dp.banks.filter(b => b.m1 != null && b.v > b.m1);
  return { dp, n, T, fi, pl, plM: pl ? fi.months[pl[0]] : null, plBig: pl ? bigAt(fi.months[pl[0]]) : null, cv, ci, c3, cy, c0, a, ai, cut, up,
    slope: k => cv['10Y'][k] != null && cv['1Y'][k] != null ? cv['10Y'][k] - cv['1Y'][k] : null };
}
function fxGapSer() {   // tự do − NHTM bán ra theo ngày tự do có số; NHTM lấy giá gần nhất trong 8 ngày trước đó
  const F = dom.freeD || [], N = (dom.nhtmD || []).slice(); let j = -1;
  return F.map(p => { while (j + 1 < N.length && N[j + 1].d <= p.d) j++; return j >= 0 && (new Date(p.d) - new Date(N[j].d)) / 864e5 <= 8 ? { d: p.d, v: p.v - N[j].v } : null; }).filter(Boolean);
}
function fxGapIns() {
  const G = fxGapSer(); if (!G.length) return '';
  const l = G[G.length - 1], y0 = l.d.slice(0, 4), ytd = G.filter(p => p.d.startsWith(y0)), pk = ytd.reduce((m, p) => p.v > m.v ? p : m, ytd[0]);
  const r90 = G.filter(p => p.d >= new Date(new Date(l.d) - 90 * 864e5).toISOString().slice(0, 10)), neg = r90.filter(p => p.v < 0).length;
  const avg = r90.reduce((a, p) => a + p.v, 0) / r90.length;
  return `${dvn(l.d)}: tự do cao hơn NHTM <b>${sg(l.v, 0, 'đ')}</b>. Đỉnh năm ${y0} ${sg(pk.v, 0, 'đ')} (${dvn(pk.d)}); 90 ngày gần nhất chênh trung bình ${sg(avg, 0, 'đ')}, ${neg}/${r90.length} phiên âm${l.v > 0 && neg > r90.length / 2 ? ' — chênh vừa dương trở lại sau giai đoạn âm, cần theo dõi thêm vài phiên' : ''}.`
    + how('Chênh dương lớn = cầu USD ngoài hệ thống (tiền mặt, vàng, nhập lậu) vượt cung ngân hàng, dấu hiệu kỳ vọng mất giá. Chênh co về 0 hoặc âm = áp lực ngoài hệ thống đã qua; áp lực còn lại (nếu có) nằm ở chênh lãi suất VND − USD.');
}
function depIns() {
  const st = dom.dep12State, l = lastv(st), p0 = st.find(p => p.d >= '2025-11'), pk = st.filter(p => p.d >= p0.d).reduce((m, p) => p.v > m.v ? p : m);
  const N = BD ? bondNums() : null;
  return `NHTM Nhà nước: ${pc(p0.v, 2)} (${mvn(p0.d)}) → đỉnh ${pc(pk.v, 2)} (${mvn(pk.d)}) → <b>${pc(l.v, 2)}</b> (${dvn(l.d)}); NHTM lớn ${pc(lastv(dom.dep12Large).v, 2)}, NHTM khác ${pc(lastv(dom.dep12Other).v, 2)}.${N ? ` Big 4 đồng loạt hạ 50 bps ngày 20–21/10; ${N.cut.length}/${N.dp.banks.length} ngân hàng theo dõi giảm trong 30 ngày, ${N.up.length} tăng${N.up.length ? ' (' + N.up.map(b => b.n).join(', ') + ')' : ''}.` : ''}`
    + how('COF đi sau lãi suất huy động 1–3 quý (R-13): đợt tăng đầu 2026 còn đẩy COF lên đến cuối năm, đợt hạ tháng 10 ngấm dần từ 2027. Nhóm phụ thuộc tiền gửi có kỳ hạn hưởng lợi chậm hơn nếu phải giữ lãi suất cao để giữ vốn.');
}
function oilIns() {
  if (!BD) return ''; const o = BD.oil, n = o.d.length - 1, y0 = o.d.findIndex(d => d >= '2026-01-01') - 1;
  const pk = k => o[k].reduce((m, v, i) => v != null && i > y0 && v > m.v ? { v, i } : m, { v: -1, i: 0 });   // đỉnh trong năm hiện tại
  const dp = pk('do'), bp = pk('brent');
  return `${dvn(o.d[n])}: Brent <b>${nf(o.brent[n], 1)} USD/thùng</b>, RON 95 <b>${nf(o.r95[n], 2)}</b>, E5 RON 92 ${nf(o.e5[n], 2)}, dầu DO <b>${nf(o.do[n], 2)} nghìn đồng/lít</b>. Đỉnh năm: Brent ${nf(bp.v, 1)} USD (${dvn(o.d[bp.i])}), DO ${nf(dp.v, 2)} (${dvn(o.d[dp.i])}).${o.do[n] > o.r95[n] ? ' Dầu DO đắt hơn xăng RON 95 — ngược với thông thường, do giá diesel thế giới tăng mạnh hơn xăng trong đợt sốc năm nay.' : ''}`
    + how('Xăng dầu chiếm khoảng 3–4% rổ CPI và đi vào chi phí vận tải, sản xuất; dầu DO tác động mạnh tới vận tải hàng hóa. Giá trong nước điều chỉnh theo kỳ điều hành của Bộ Công Thương và có quỹ bình ổn nên trễ và mượt hơn giá thế giới. Giá xăng dầu cao kéo dài là lý do CPI và lạm phát cơ bản cùng tăng, làm hẹp dư địa hạ lãi suất của NHNN.');
}
function zeroAlign(a, b) {   // min/max hai trục sao cho vạch 0 trùng nhau
  const f = x => x.filter(v => v != null), A = f(a), B = f(b), lmin = Math.min(0, ...A), lmax = Math.max(0, ...A) * 1.08, rmin = Math.min(0, ...B), rmax = Math.max(0, ...B) * 1.08;
  if (!(lmax > 0 && rmax > 0)) return {}; const q = Math.max(-lmin * 1.08 / (lmax - lmin * 1.08), -rmin * 1.08 / (rmax - rmin * 1.08)), m = q / (1 - q);
  return { l: { min: +(-m * lmax).toFixed(2), max: +lmax.toFixed(2) }, r: { min: +(-m * rmax).toFixed(2), max: +rmax.toFixed(2), beginAtZero: false } };
}
function cpiTransOn(od) {   // CPI giao thông (% YoY) đặt tại phiên cuối mỗi tháng trên trục ngày của chOilChg
  if (!ECO || !ECO.s.cpi_trans) return null; const out = od.map(() => null), last = {};
  od.forEach((d, i) => { last[d.slice(0, 7)] = i; });
  ECO.m.forEach((m, j) => { const v = ECO.s.cpi_trans[j]; if (last[m] != null && v != null) out[last[m]] = +v.toFixed(2); });
  return out.some(v => v != null) ? out : null;
}
function oilChgIns() {
  if (!BD) return ''; const o = BD.oil, n = o.d.length - 1, b = o.d.findIndex(d => d >= '2026-01-01') - 1, ch = k => o[k][b] ? (o[k][n] / o[k][b] - 1) * 100 : null;
  return `So với cuối 2025: Brent ${sg(ch('brent'), 0)}, WTI ${sg(ch('wti'), 0)}; trong nước RON 95 ${sg(ch('r95'), 0)}, E5 ${sg(ch('e5'), 0)}, dầu DO <b>${sg(ch('do'), 0)}</b>. Xăng trong nước tăng ${ch('r95') < ch('brent') ? 'ít' : 'nhiều'} hơn dầu thô — thuế, phí cố định theo lít làm phần trăm thay đổi của giá bán lẻ nhỏ hơn giá dầu thô.`
    + (ECO && ECO.s.cpi_trans ? (() => { const j = ECO.s.cpi_trans.length - 1, v = ECO.s.cpi_trans[j], pk = ECO.s.cpi_trans.reduce((m, x, k) => ECO.m[k] >= '2026-01' && x > m.v ? { v: x, k } : m, { v: -1e9, k: 0 }); return ` CPI giao thông tháng ${mvn(ECO.m[j])} <b>${sg(v, 1)}</b> so cùng kỳ (đỉnh năm ${sg(pk.v, 1)} tháng ${mvn(ECO.m[pk.k])}) — nhóm giao thông là kênh xăng dầu đi thẳng vào CPI.`; })() : '')
    + how('Mức tăng giá bán lẻ trong nước là phần đã truyền vào CPI; phần dầu thô tăng chưa truyền hết (chênh giữa hai nhóm đường) là áp lực còn lại nếu giá thế giới giữ ở mức cao.');
}
function big4Y10() {   // TPCP 10 năm cuối tháng theo trục tháng của big4
  const cv = BD.gb.curve, m = {}; cv.d.forEach((d, i) => { if (cv['10Y'][i] != null) m[d.slice(0, 7)] = cv['10Y'][i]; });
  return BD.big4.months.map(k => m[k] ?? null);
}
function bBig4Ins() {
  const B = BD.big4, it = B.items, y = it[it.length - 1].d.slice(0, 4), cur = it.filter(z => z.d.startsWith(y)), prv = it.filter(z => z.d.startsWith(String(+y - 1)));
  const wa = xs => { const w = xs.reduce((a, z) => a + z.v, 0); return w ? xs.reduce((a, z) => a + z.c * z.v, 0) / w : null; };
  const by = Object.keys(B.names).map(k => [k, cur.filter(z => z.s === k)]).filter(x => x[1].length);
  const l = it[it.length - 1], n = B.months.length - 1, y10 = big4Y10();
  const dNow = B.dep[n], tNow = y10.filter(v => v != null).slice(-1)[0];
  return `Từ đầu ${y} Big 4 phát hành ${nk(cur.reduce((a, z) => a + z.v, 0))}, lãi suất bình quân <b>${pc(wa(cur), 2)}</b> (năm ${+y - 1}: ${pc(wa(prv), 2)}): ${by.map(([k, xs]) => `${B.names[k]} ${pc(wa(xs), 2)}`).join(', ')}. Đợt gần nhất: ${B.names[l.s]} ${dvn(l.d)}, ${nf(l.t, 0)} năm, <b>${pc(l.c, 2)}</b> — cao hơn huy động 12T Big 4 (${pc(dNow, 2)}) ${nf(l.c - dNow, 2)} điểm % và TPCP 10 năm (${pc(tNow, 2)}) ${nf(l.c - tNow, 2)} điểm %.`
    + how('Trái phiếu Big 4 là mặt bằng chi phí vốn dài hạn thấp nhất của khối ngân hàng (sở hữu Nhà nước, rủi ro thấp). Khi chính Big 4 phải trả quanh 8% cho kỳ hạn 5–10 năm thì vốn trung dài hạn toàn hệ thống đang khan; chênh so với TPCP cùng kỳ hạn là phần bù rủi ro tín dụng và thanh khoản mà nhà đầu tư đòi.');
}
function big4Kpi() {
  const it = BD.big4.items, l = it[it.length - 1], y = l.d.slice(0, 4), cur = it.filter(z => z.d.startsWith(y)), w = cur.reduce((a, z) => a + z.v, 0), wa = cur.reduce((a, z) => a + z.c * z.v, 0) / w;
  const prv = it.filter(z => z.d.startsWith(String(+y - 1))), wp = prv.reduce((a, z) => a + z.v, 0), wap = wp ? prv.reduce((a, z) => a + z.c * z.v, 0) / wp : null;
  return kpi('Lợi suất TP Big 4 (phát hành)', pc(l.c, 2), `${BD.big4.names[l.s]} ${dvn(l.d)}, ${nf(l.t, 0)} năm · BQ ${y} ${pc(wa, 2)} (${y - 1}: ${pc(wap, 2)})`, 'neg');
}
function subBond() {
  if (!BD) return '';
  const N = bondNums(), { dp, n, T, fi, pl, cv, ci, c3, a, ai } = N;
  const big = T['Big 4'][n], big1 = T['Big 4'][n - 1], gap = T['Tư nhân nhỏ'][n] - big;
  const spr = pl && N.plBig != null ? pl[1] - N.plBig : null;
  const cfN = fi.cf.out.length - 1, cb = BD.cb, cbN = cb.months.length - 1;
  const sl = N.slope(ci), sl3 = N.slope(c3);
  const aw = a.inv[ai] ? a.win[ai] / a.inv[ai] * 100 : null;
  const fi12 = fi.mat.bank.slice(0, 12).reduce((s, v) => s + (v || 0), 0);
  return `<h3 class="ovh dsec" id="d-bond">Thị trường trái phiếu: FI bond, TPDN và G-bond</h3>
  <p class="sec-sub">Ngân hàng phát hành trái phiếu (FI bond) để có vốn trung dài hạn; chênh coupon FI − huy động 12T đo chi phí vốn dài hạn. TPDN toàn thị trường (chậm trả, đáo hạn) là rủi ro tín dụng gián tiếp; G-bond là lãi suất phi rủi ro, do ngân hàng và nhóm bảo hiểm (chủ yếu BHXH) nắm gần hết.</p>
  <p class="muted" style="margin:-4px 0 12px">Lãi suất huy động đến ${dvn(BD.meta.depAsof)} · lợi suất TPCP đến ${dvn(BD.meta.curveAsof)} · TPDN, đấu thầu theo tháng (tháng ${mvn(cb.months[cbN])} mới tính đến ${dvn(fi.cf.asof)}).</p>
  <div class="kpis">
    ${kpi('Coupon FI 1–3 năm (riêng lẻ)', pc(pl && pl[1], 2), `${mvn(N.plM)} · chênh ${sg(spr, 2, ' đ%')} so với huy động 12T Big 4`, spr != null && spr > 2.5 ? 'neg' : '')}
    ${big4Kpi()}
    ${kpi('Dư nợ trái phiếu ngân hàng', nk(fi.cf.out[cfN]), `đáo hạn 12 tháng tới ${nk(fi12)}`)}
    ${kpi('TPDN chậm trả (gốc + lãi)', nk(cb.late[cbN]), `${pc(cb.late[cbN] / cb.out[cbN] * 100, 1)} dư nợ · BĐS ${nk((cb.lateBySec.find(x => x.s === 'Bất động sản') || {}).v)}`, 'neg')}
    ${kpi('TPCP 10 năm', pc(cv['10Y'][ci], 2), `1 năm ${pc(cv['1Y'][ci], 2)} · dốc 10Y−1Y ${sg(sl * 100, 0, ' bps')} (${sg((sl - sl3) * 100, 0, ' bps')} 3 tháng)`)}
    ${kpi('Đấu thầu TPCP tháng ' + mvn(a.months[ai]).slice(0, 2), pc(aw, 0) + ' trúng', `gọi ${nk(a.inv[ai])} · trúng ${nk(a.win[ai])} · 10Y ${pc(a.y['10 năm'][ai], 2)}`)}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'bFiCpn', title: 'Chi phí vốn dài hạn: coupon trái phiếu ngân hàng vs huy động 12T', sub: '%/năm · coupon bình quân gia quyền theo giá trị phát hành từng tháng · đường đỏ = Big 4 12T · cột = chênh coupon 1–3 năm riêng lẻ − Big 4 (trục phải)', insight: bFiCpnIns(N), src: BD.src.fi + '; ' + BD.src.dep })}
    ${card({ id: 'bFiIss', title: 'Ngân hàng phát hành trái phiếu theo kỳ hạn', sub: 'tỷ đồng/tháng · giá trị phát hành thực tế · ≤1 năm, 1–3 năm, 3–5 năm, >5 năm (>5 năm thường là nợ thứ cấp bổ sung vốn cấp 2)', insight: bFiIssIns(N), src: BD.src.fi })}
    ${card({ id: 'bFiMat', title: 'Trái phiếu ngân hàng: dư nợ và lịch đáo hạn', sub: 'đường = dư nợ (nghìn tỷ, trục phải) · cột = gốc đã trả + mua lại trước hạn theo tháng; phần sau tháng hiện tại = gốc đáo hạn theo lịch (tỷ đồng)', insight: bFiMatIns(N), src: BD.src.fi })}
    ${card({ id: 'bCbIss', title: 'Phát hành TPDN theo ngành', sub: 'tỷ đồng/tháng · VND · Tài chính (ngân hàng, chứng khoán, tài chính tiêu dùng), Bất động sản, còn lại', insight: bCbIssIns(N), src: BD.src.cb })}
    ${card({ id: 'bCbLate', title: 'TPDN chậm trả gốc và lãi', sub: 'cột = dư nợ chậm trả cuối tháng (nghìn tỷ) · đường = số mã mới chậm trả trong tháng (trục phải)', insight: bCbLateIns(N), src: BD.src.cb })}
    ${card({ id: 'bCbMat', title: 'Lịch đáo hạn TPDN 15 tháng tới theo ngành', sub: 'tỷ đồng/tháng · gốc đến hạn theo dư nợ hiện tại (chưa trừ mua lại trước hạn sau này)', insight: bCbMatIns(N), src: BD.src.cb })}
    ${card({ id: 'bCbSec', title: `Chậm trả theo ngành · ${mvn(BD.cb.lateBySecM)}`, sub: 'nghìn tỷ đồng · dư nợ chậm trả gốc + lãi, VND', insight: bCbSecIns(N), src: BD.src.cb })}
    ${card({ id: 'bAuc', title: 'Đấu thầu TPCP: gọi thầu, đặt thầu, trúng thầu', sub: 'nghìn tỷ đồng/tháng · Kho bạc Nhà nước, gồm phát hành thêm · đường = tỷ lệ trúng/gọi thầu (trục phải)', insight: bAucIns(N), src: BD.src.auc })}
    ${card({ id: 'bAucY', title: 'Lãi suất trúng thầu theo kỳ hạn', sub: '%/năm · bình quân gia quyền trong tháng · tháng không trúng thầu để trống', insight: bAucYIns(N), src: BD.src.auc })}
    ${card({ id: 'bHold', title: 'Ai nắm giữ TPCP: ngân hàng vs nhóm bảo hiểm', sub: '% dư nợ TPCP · nhóm bảo hiểm = BHXH Việt Nam, Bảo hiểm tiền gửi và doanh nghiệp bảo hiểm (BHXH chiếm phần lớn) · 2016–2017 là nhóm "nhà đầu tư dài hạn" · cột nhạt = tách hai nhóm ước từ biểu đồ ADB, tổng theo số công bố', insight: bHoldIns(), src: BD.src.holders })}
    ${card({ id: 'bTen', title: 'Cơ cấu kỳ hạn trúng thầu TPCP', sub: '% giá trị trúng thầu sơ cấp trong năm (năm hiện tại tính đến tháng mới nhất) · đây là lượng mua mới, không phải lượng nắm giữ · kỳ hạn 5–10 năm chủ yếu ngân hàng mua, 15–30 năm chủ yếu BHXH và doanh nghiệp bảo hiểm', insight: bTenIns(), src: BD.src.auc })}
    ${card({ id: 'bFx', title: 'Khối ngoại mua/bán ròng TPCP trên thứ cấp', sub: 'tỷ đồng/tháng · tổng các nhóm kỳ hạn còn lại', insight: bFxIns(N), src: BD.src.fx })}
  </div>`;
}
function bFiCpnIns(N) {
  const { fi, pl, plM, plBig } = N; if (!pl) return '';
  const y = plM.slice(0, 4), v = fi.cpnPriv13.filter((x, i) => x != null && fi.months[i].startsWith(y)), avg = v.reduce((a, b) => a + b, 0) / v.length;
  const yp = String(+y - 1), vp = fi.cpnPriv13.filter((x, i) => x != null && fi.months[i].startsWith(yp)), avgp = vp.length ? vp.reduce((a, b) => a + b, 0) / vp.length : null;
  return `Trái phiếu ngân hàng 1–3 năm phát hành riêng lẻ trả <b>${pc(pl[1], 2)}</b> (${mvn(plM)}), cao hơn huy động 12T Big 4 <b>${nf(pl[1] - plBig, 2)} điểm %</b>. Bình quân ${y}: ${pc(avg, 2)}${avgp != null ? ` (so với ${pc(avgp, 2)} năm ${yp})` : ''} — ngân hàng phải trả đắt hơn rõ rệt để có vốn trung hạn, khớp với CD 12 tháng nền 8.x% mà thị trường ghi nhận.`
    + how('Chênh FI − huy động rộng = vốn dài hạn khan, ngân hàng cần nguồn ổn định cho tỷ lệ vốn ngắn hạn cho vay trung dài hạn (và LCR/NSFR khi chuẩn Basel III áp dụng). Huy động giảm mà coupon FI không giảm theo thì chênh còn nới — chi phí vốn biên chưa hạ thật.');
}
function bFiIssIns(N) {
  const { fi } = N, y = fi.months[fi.months.length - 1].slice(0, 4), idx = fi.months.map((m, i) => m.startsWith(y) ? i : -1).filter(i => i >= 0);
  const yp = String(+y - 1), ip = fi.months.map((m, i) => m.startsWith(yp) && +m.slice(5) <= +fi.months[fi.months.length - 1].slice(5) ? i : -1).filter(i => i >= 0);
  const sum = (ix, b) => ix.reduce((a, i) => a + (b ? fi.val[b][i] || 0 : BUCK.reduce((s, k) => s + (fi.val[k][i] || 0), 0)), 0);
  const t = sum(idx), tp = sum(ip), l5 = sum(idx, '>5 năm'), s13 = sum(idx, '1-3 năm');
  return `Từ đầu ${y} ngân hàng phát hành <b>${nk(t)}</b> (cùng kỳ ${yp}: ${nk(tp)}, ${sg((t / tp - 1) * 100, 0)}). Kỳ hạn 1–3 năm chiếm ${pc(s13 / t * 100, 0)}, trên 5 năm ${pc(l5 / t * 100, 0)}.`
    + how('Kỳ hạn 1–3 năm là kênh huy động vốn trung hạn (thay CD, bù LDR); trên 5 năm chủ yếu là nợ thứ cấp tính vào vốn cấp 2 để giữ CAR khi tín dụng tăng nhanh. Phát hành dồn vào tháng 6 và 12 là mùa chốt CAR, LDR.');
}
const BUCK = ['≤1 năm', '1-3 năm', '3-5 năm', '>5 năm'];
function bFiMatIns(N) {
  const m = BD.fi.mat, s12 = m.bank.slice(0, 12).reduce((a, v) => a + (v || 0), 0), pk = m.bank.reduce((a, v, i) => v > m.bank[a] ? i : a, 0), cf = BD.fi.cf, k = cf.out.length - 1, y = cf.months.indexOf(String(+cf.months[k].slice(0, 4) - 1) + cf.months[k].slice(4));
  const L12 = cf.months.slice(-13, -1).map(m => cf.months.indexOf(m)), bb = { p: L12.reduce((x, i) => x + (cf.paid[i] || 0), 0), b: L12.reduce((x, i) => x + (cf.buyback[i] || 0), 0) };
  return `Dư nợ trái phiếu ngân hàng <b>${nk(cf.out[k])}</b>${y >= 0 ? ` (${sg((cf.out[k] / cf.out[y] - 1) * 100, 1)} so với cùng kỳ)` : ''}. 12 tháng tới đáo hạn ${nk(s12)}; tháng nặng nhất ${mvn(m.months[pk])} (${nk(m.bank[pk])}). 12 tháng qua ngân hàng trả gốc ${nk(bb.p)}, trong đó mua lại trước hạn ${pc(bb.b / bb.p * 100, 0)} — phần lớn trái phiếu được tất toán sớm chứ không chờ đáo hạn.`
    + how('Đáo hạn lớn rơi vào lúc lãi suất phát hành mới cao hơn lãi suất cũ thì chi phí vốn tăng khi tái tục. Lịch đáo hạn chưa tính mua lại trước hạn sau này, nên áp lực thực tế thường đến sớm hơn và rải đều hơn.');
}
function bCbIssIns(N) {
  const c = BD.cb, n = c.months.length - 1, y = c.months[n].slice(0, 4), idx = c.months.map((m, i) => m.startsWith(y) ? i : -1).filter(i => i >= 0);
  const s = k => idx.reduce((a, i) => a + (c.iss[k][i] || 0), 0), tot = s('Tài chính') + s('Bất động sản') + s('Khác');
  return `Từ đầu ${y}: TPDN phát hành <b>${nk(tot)}</b>, trong đó Tài chính ${pc(s('Tài chính') / tot * 100, 0)}, Bất động sản ${pc(s('Bất động sản') / tot * 100, 0)}. Ngân hàng vẫn là bên phát hành lớn nhất; bất động sản quay lại mạnh từ quý 2/2026.`
    + how('Phát hành bất động sản tăng giúp giảm áp lực đáo hạn và chậm trả, nhưng nếu ngân hàng là bên mua (qua công ty chứng khoán) thì rủi ro chuyển ngược vào bảng cân đối ngân hàng.');
}
function bCbLateIns(N) {
  const c = BD.cb, n = c.months.length - 1, pk = c.late.reduce((a, v, i) => v > c.late[a] ? i : a, 0), y = c.months.indexOf(String(+c.months[n].slice(0, 4) - 1) + c.months[n].slice(4));
  return `Dư nợ chậm trả <b>${nk(c.late[n])}</b> (${pc(c.late[n] / c.out[n] * 100, 1)} dư nợ TPDN ${nk(c.out[n])}), đỉnh ${nk(c.late[pk])} (${mvn(c.months[pk])})${y >= 0 ? `, cùng kỳ ${nk(c.late[y])}` : ''}. Số mã mới chậm trả chỉ 0–4 mã/tháng từ 2024 (so với 30–90 mã/tháng giữa 2023): chậm trả phần lớn là nợ cũ chưa xử lý, không phải đợt vỡ nợ mới.`
    + how('Chậm trả đi ngang ở mức cao = nợ tồn đọng chưa được giải quyết (gia hạn, trả bằng tài sản), rủi ro chủ yếu nằm ở trái phiếu bất động sản và các tổ chức phát hành cũ. Số mã mới chậm trả tăng trở lại mới là tín hiệu xấu đi.');
}
function bCbMatIns(N) {
  const m = BD.cb.mat, t = i => ['Tài chính', 'Bất động sản', 'Khác'].reduce((a, k) => a + (m.sec[k][i] || 0), 0);
  const s12 = m.months.slice(0, 12).reduce((a, _, i) => a + t(i), 0), r12 = m.months.slice(0, 12).reduce((a, _, i) => a + (m.sec['Bất động sản'][i] || 0), 0);
  return `12 tháng tới TPDN đáo hạn ${nk(s12)}, bất động sản ${nk(r12)} (${pc(r12 / s12 * 100, 0)}). Tháng nặng: 12/2026 (BĐS ${nk(m.sec['Bất động sản'][2])}), 06/2027 và 12/2027.`
    + how('Đáo hạn bất động sản dồn vào cuối năm, lúc doanh nghiệp cần tiền trả gốc — nếu không phát hành mới được thì chuyển sang chậm trả hoặc vay ngân hàng. Theo dõi tỷ lệ chậm trả các tháng đó.');
}
function bCbSecIns() {
  const s = BD.cb.lateBySec, t = s.reduce((a, x) => a + x.v, 0);
  return `Bất động sản chiếm ${pc(s[0].v / t * 100, 0)} dư nợ chậm trả, Hàng tiêu dùng ${pc((s.find(x => x.s === 'Hàng tiêu dùng') || { v: 0 }).v / t * 100, 0)}; Tài chính chỉ ${nk((s.find(x => x.s === 'Tài chính') || {}).v)} — FI bond ngân hàng gần như không có chậm trả.`
    + how('Rủi ro TPDN với ngân hàng nằm ở dư nợ cho vay và tài sản bảo đảm của các doanh nghiệp bất động sản đang chậm trả, không ở trái phiếu do ngân hàng phát hành.');
}
function bCurveIns(N) {
  const { cv, ci, c3, c0 } = N, ch = (t, k) => (cv[t][ci] - cv[t][k]) * 100;
  const bf = ch('1Y', c3) - ch('10Y', c3) >= 10 && ch('1Y', c3) > 0;
  return `10 năm <b>${pc(cv['10Y'][ci], 2)}</b> (${sg(ch('10Y', c0), 0, ' bps')} từ đầu năm), 1 năm ${pc(cv['1Y'][ci], 2)} (${sg(ch('1Y', c0), 0, ' bps')}). Trong 3 tháng: 1 năm ${sg(ch('1Y', c3), 0, ' bps')}, 10 năm ${sg(ch('10Y', c3), 0, ' bps')}${bf ? ' — đầu ngắn tăng nhanh hơn đầu dài (dốc giảm khi lãi suất tăng: bear flattening), dấu hiệu tiền ngắn hạn đắt lên.' : ' — hai đầu đi gần song song, độ dốc gần như không đổi.'}`
    + how('Lợi suất TPCP là sàn lãi suất phi rủi ro; tăng thì ngân hàng giữ nhiều TPCP lỗ đánh giá lại (chứng khoán sẵn sàng để bán) và lãi suất cho vay khó giảm. Đường cong dốc lên giúp ngân hàng có lãi từ chênh kỳ hạn.');
}
function bAucIns(N) {
  const { a, ai } = N, y = a.months[ai].slice(0, 4), ix = a.months.map((m, i) => m.startsWith(y) ? i : -1).filter(i => i >= 0);
  const inv = ix.reduce((s, i) => s + a.inv[i], 0), win = ix.reduce((s, i) => s + a.win[i], 0), bid = ix.reduce((s, i) => s + a.bid[i], 0);
  return `Từ đầu ${y}: gọi thầu ${nk(inv)}, trúng ${nk(win)} (<b>${pc(win / inv * 100, 0)}</b>), đặt thầu bằng ${nf(bid / inv, 2)} lần gọi thầu. Tháng ${mvn(a.months[ai])}: trúng ${pc(a.win[ai] / a.inv[ai] * 100, 0)} — tập trung kỳ hạn 10 năm (${nk(a.win10[ai])}).`
    + how('Tỷ lệ trúng thầu thấp = Kho bạc không chấp nhận lãi suất nhà đầu tư (chủ yếu ngân hàng) đòi — cầu TPCP yếu khi ngân hàng cần vốn cho tín dụng. Trúng thầu nhiều hút tiền từ hệ thống vào Kho bạc; tiền chỉ quay lại khi giải ngân đầu tư công.');
}
function bAucYIns(N) {
  const { a, ai } = N, y10 = a.y['10 năm'], j = a.months.indexOf(String(+a.months[ai].slice(0, 4) - 1) + '-12');
  return `Lãi suất trúng thầu 10 năm <b>${pc(y10[ai], 2)}</b>${j >= 0 && y10[j] != null ? ` (cuối năm trước ${pc(y10[j], 2)}, ${sg((y10[ai] - y10[j]) * 100, 0, ' bps')})` : ''} — Kho bạc chấp nhận trả cao hơn để huy động đủ vốn.`
    + how('Lãi suất trúng thầu là mức Kho bạc chấp nhận; tăng liên tục nghĩa là Bộ Tài chính ưu tiên huy động đủ vốn hơn giữ chi phí thấp — đẩy mặt bằng lãi suất phi rủi ro lên.');
}
const TENS = ['3 năm', '5 năm', '7 năm', '10 năm', '15 năm', '20 năm', '30 năm'];
function tenYears() {
  const a = BD.gb.auc, ys = [...new Set(a.months.map(m => m.slice(0, 4)))].filter(y => y >= '2021');
  return ys.map(y => { const ix = a.months.map((m, i) => m.startsWith(y) ? i : -1).filter(i => i >= 0), t = Object.fromEntries(TENS.map(k => [k, ix.reduce((s, i) => s + (a.byTen[k][i] || 0), 0)])), tot = TENS.reduce((s, k) => s + t[k], 0);
    return { y, last: a.months[ix[ix.length - 1]], tot, sh: Object.fromEntries(TENS.map(k => [k, tot ? t[k] / tot * 100 : null])) }; });
}
function bHoldIns() {
  const H = BD.gb.holders, n = H[H.length - 1], o = H.find(h => h.p === 'Q4/2022');
  return `${n.p}: nhóm bảo hiểm nắm khoảng <b>${pc(n.ins, 1)}</b>, ngân hàng <b>${pc(n.bank, 1)}</b>; công ty chứng khoán ${pc(n.sec, 1)}, quỹ ${pc(n.fund, 1)}, nhà đầu tư nước ngoài chỉ ${pc(n.fx, 1)}. Từ đầu 2016 (ngân hàng ${pc(H[0].bank, 0)}) tỷ trọng đã đảo chiều; từ ${o.p} đến nay cơ cấu gần như đứng yên quanh 60/38 — hai nhóm chiếm 97–99%, mức tập trung thuộc nhóm cao nhất khu vực theo ADB.`
    + how('Người mua TPCP gần như chỉ có BHXH và ngân hàng. Khi ngân hàng cần vốn cho tín dụng (LDR cao) thì cầu TPCP co lại ngay, Kho bạc khó bán thêm mà không tăng lãi suất — khớp với tỷ lệ trúng thầu thấp và lãi suất trúng thầu tăng năm nay. Mở rộng người mua (quỹ hưu trí tự nguyện, quỹ đầu tư, nhà đầu tư nước ngoài) là điều kiện để lợi suất bớt phụ thuộc thanh khoản ngân hàng.');
}
function bTenIns() {
  const T = tenYears(), c = T[T.length - 1], p = T[T.length - 2], lng = x => ['15 năm', '20 năm', '30 năm'].reduce((s, k) => s + (x.sh[k] || 0), 0), mid = x => ['5 năm', '7 năm', '10 năm'].reduce((s, k) => s + (x.sh[k] || 0), 0);
  return `${c.y} (đến ${mvn(c.last)}): kỳ hạn 10 năm chiếm <b>${pc(c.sh['10 năm'], 0)}</b> lượng trúng thầu, 5–10 năm cộng lại ${pc(mid(c), 0)}, 15–30 năm chỉ ${pc(lng(c), 0)} (năm ${p.y}: ${pc(lng(p), 0)}; năm ${T[0].y}: ${pc(lng(T[0]), 0)}). Kho bạc đã chuyển hẳn sang phát hành 5–10 năm.`
    + how('Biểu đồ nắm giữ bên cạnh là lượng tồn (ai đang giữ); biểu đồ này là dòng mua mới mỗi năm. Kỳ hạn bán được cho biết gián tiếp nhóm nào đang mua thêm: kỳ hạn 15–30 năm gần như chỉ BHXH và doanh nghiệp bảo hiểm nhận; ngân hàng mua 5–10 năm để giữ thanh khoản. Phần dài hạn co lại nghĩa là cầu từ nhóm bảo hiểm yếu đi và Kho bạc phải dựa vào ngân hàng.');
}
function bFxIns() {
  const f = BD.gb.fx, n = f.months.length, s12 = f.net.slice(-12).reduce((a, v) => a + (v || 0), 0);
  return `Khối ngoại ${s12 >= 0 ? 'mua' : 'bán'} ròng ${nf(Math.abs(s12), 0)} tỷ đồng trong 12 tháng; tháng ${mvn(f.months[n - 1])} ${sg(f.net[n - 1], 0, ' tỷ')}. Quy mô nhỏ so với thị trường — khối ngoại không phải lực chính của G-bond VN.`
    + how('Lợi suất 10 năm VN thấp hơn UST 10 năm nên dòng vốn ngoại vào TPCP hạn chế; chỉ khi chênh lợi suất dương trở lại và VND ổn định thì khối ngoại mới tăng nắm giữ.');
}
function chBond() {
  if (!BD) return;
  const N = bondNums(), { dp, fi, cv, a } = N;
  const i0 = fi.months.indexOf('2021-01'), fm = fi.months.slice(i0), bigM = fm.map(m => { const j = dp.months.indexOf(m); return j < 0 ? null : dp.tiers['Big 4'][j]; });
  const p13 = fi.cpnPriv13.slice(i0);
  mk('bFiCpn', { type: 'bar', data: { labels: fm.map(mvn), datasets: [
    L('Coupon 1–3 năm riêng lẻ', p13, C.navy, { borderWidth: 2.2, pointRadius: 2, spanGaps: false }),
    L('Coupon bình quân mọi kỳ hạn', fi.cpnAll.slice(i0), C.tealInk, { borderDash: [5, 4], borderWidth: 1.6, pointRadius: 1.5, spanGaps: false }),
    L('Huy động 12T Big 4', bigM, C.red, { borderWidth: 2.2 }),
    { type: 'bar', label: 'Chênh 1–3 năm − Big 4', data: p13.map((v, i) => v == null || bigM[i] == null ? null : +(v - bigM[i]).toFixed(2)), backgroundColor: 'rgba(217,164,0,.35)', yAxisID: 'y1', unit: ' đ%', dp: 2 }] },
    options: { scales: { y: pctAxis('', { beginAtZero: false }), y1: { position: 'right', min: 0, max: 6, grid: { display: false }, ticks: { callback: v => nf(v, 1) } } } } });
  stk('bFiIss', fm.map(mvn), Object.fromEntries(BUCK.map(b => [b, fi.val[b].slice(i0)])), { unit: ' tỷ', colors: [C.grey, C.navy, C.teal, C.purple] });
  const cf = fi.cf, mt = fi.mat, ml = [...cf.months, ...mt.months.filter(m => !cf.months.includes(m))];
  const at = (arr, ms, m) => { const j = ms.indexOf(m); return j < 0 ? null : arr[j]; };
  const now = cf.months[cf.months.length - 1];
  mk('bFiMat', { type: 'bar', data: { labels: ml.map(mvn), datasets: [
    { label: 'Gốc đã trả', data: ml.map(m => m < now ? at(cf.paid, cf.months, m) - (at(cf.buyback, cf.months, m) || 0) : null), backgroundColor: 'rgba(29,38,120,.75)', stack: 's', unit: ' tỷ', dp: 0 },
    { label: 'Mua lại trước hạn', data: ml.map(m => m < now ? at(cf.buyback, cf.months, m) : null), backgroundColor: 'rgba(89,197,200,.85)', stack: 's', unit: ' tỷ', dp: 0 },
    { label: 'Đáo hạn theo lịch', data: ml.map(m => m >= now ? at(mt.bank, mt.months, m) : null), backgroundColor: 'rgba(192,57,43,.7)', stack: 's', unit: ' tỷ', dp: 0 },
    L('Dư nợ', ml.map(m => { const v = at(cf.out, cf.months, m); return v == null ? null : +(v / 1000).toFixed(1); }), C.gold, { yAxisID: 'y1', unit: ' nghìn tỷ', dp: 1, borderWidth: 2.4 })] },
    options: { scales: { x: { stacked: true }, y: numAxis('tỷ đồng', { stacked: true }), y1: { position: 'right', beginAtZero: false, grid: { display: false }, ticks: { callback: v => nf(v, 0) } } } } });
  const cb = BD.cb;
  stk('bCbIss', cb.months.map(mvn), cb.iss, { unit: ' tỷ', colors: [C.navy, C.red, C.grey] });
  mk('bCbLate', { type: 'bar', data: { labels: cb.months.map(mvn), datasets: [
    { label: 'Dư nợ chậm trả', data: cb.late.map(v => v == null ? null : +(v / 1000).toFixed(1)), backgroundColor: 'rgba(192,57,43,.6)', unit: ' nghìn tỷ', dp: 1 },
    L('Số mã mới chậm trả', cb.newLate, C.navy, { yAxisID: 'y1', unit: ' mã', dp: 0, pointRadius: 2 })] },
    options: { scales: { y: numAxis('nghìn tỷ đồng'), y1: { position: 'right', min: 0, grid: { display: false }, ticks: { callback: v => nf(v, 0) } } } } });
  stk('bCbMat', cb.mat.months.map(mvn), cb.mat.sec, { unit: ' tỷ', colors: [C.navy, C.red, C.grey] });
  mk('bCbSec', { type: 'bar', data: { labels: cb.lateBySec.map(x => x.s), datasets: [{ label: 'Chậm trả', data: cb.lateBySec.map(x => +(x.v / 1000).toFixed(1)), backgroundColor: cb.lateBySec.map(x => x.s === 'Bất động sản' ? 'rgba(192,57,43,.75)' : x.s === 'Tài chính' ? 'rgba(29,38,120,.8)' : 'rgba(154,163,178,.8)'), unit: ' nghìn tỷ', dp: 1 }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: numAxis('nghìn tỷ đồng') } } });
  const TN = ['1Y', '3Y', '5Y', '10Y', '20Y'], pt = (k, lab, col, o) => k >= 0 ? [L(lab + ' ' + dvn(cv.d[k]), TN.map(t => cv[t][k]), col, Object.assign({ pointRadius: 3 }, o))] : [];
  mk('bCurve', { type: 'line', data: { labels: TN, datasets: [...pt(N.ci, '', C.navy, { borderWidth: 2.8 }), ...pt(N.c3, '', C.teal, { borderDash: [5, 4] }), ...pt(N.c0, '', C.gold, { borderDash: [2, 3] }), ...pt(N.cy, '', C.grey, { borderDash: [2, 3] })] }, options: { scales: { y: pctAxis('', { beginAtZero: false }) } } });
  const j0 = cv.d.findIndex(d => d >= '2021-01-01'), cd = cv.d.slice(j0);
  mk('bCurveTs', { type: 'bar', data: { labels: cd.map(dvn), datasets: [
    L('1 năm', cv['1Y'].slice(j0), C.teal), L('5 năm', cv['5Y'].slice(j0), C.purple), L('10 năm', cv['10Y'].slice(j0), C.navy, { borderWidth: 2.6 }),
    { type: 'bar', label: 'Dốc 10Y − 1Y', data: cd.map((_, i) => { const k = j0 + i; return cv['10Y'][k] == null || cv['1Y'][k] == null ? null : +(cv['10Y'][k] - cv['1Y'][k]).toFixed(2); }), backgroundColor: 'rgba(154,163,178,.45)', yAxisID: 'y1', unit: ' đ%', dp: 2, barPercentage: 1, categoryPercentage: 1 }] },
    options: { scales: { y: pctAxis('', { beginAtZero: false }), y1: { position: 'right', min: 0, grid: { display: false }, ticks: { callback: v => nf(v, 1) } } } } }, { win: 12 });
  const k0 = a.months.indexOf('2021-01') < 0 ? 0 : a.months.indexOf('2021-01'), am = a.months.slice(k0), t1 = v => v == null ? null : +(v / 1000).toFixed(1);
  mk('bAuc', { type: 'bar', data: { labels: am.map(mvn), datasets: [
    { label: 'Gọi thầu', data: a.inv.slice(k0).map(t1), backgroundColor: 'rgba(154,163,178,.6)', unit: ' nghìn tỷ', dp: 1 },
    { label: 'Đặt thầu', data: a.bid.slice(k0).map(t1), backgroundColor: 'rgba(89,197,200,.75)', unit: ' nghìn tỷ', dp: 1 },
    { label: 'Trúng thầu', data: a.win.slice(k0).map(t1), backgroundColor: 'rgba(29,38,120,.85)', unit: ' nghìn tỷ', dp: 1 },
    L('Trúng / gọi thầu', am.map((_, i) => a.inv[k0 + i] ? +(a.win[k0 + i] / a.inv[k0 + i] * 100).toFixed(0) : null), C.red, { yAxisID: 'y1', dp: 0, borderWidth: 2.2 })] },
    options: { scales: { y: numAxis('nghìn tỷ đồng'), y1: pctAxis('', { position: 'right', min: 0, max: 120, grid: { display: false } }) } } });
  mk('bAucY', { type: 'line', data: { labels: am.map(mvn), datasets: [['5 năm', C.teal], ['10 năm', C.navy], ['15 năm', C.purple]].map(([t, c]) => L(t, a.y[t].slice(k0), c, { pointRadius: 3, spanGaps: false, borderWidth: t === '10 năm' ? 2.6 : 1.8 })) }, options: { scales: { y: pctAxis('', { beginAtZero: false }) } } });
  const o = BD.oil, ol = o.d.map(dvn);
  mk('chOil', { type: 'line', data: { labels: ol, datasets: [
    L('RON 95' , o.r95, C.navy, { unit: ' nghìn đ/lít', dp: 2, borderWidth: 2.4 }), L('E5 RON 92', o.e5, C.teal, { unit: ' nghìn đ/lít', dp: 2 }), L('Dầu DO 0,05S', o.do, C.purple, { unit: ' nghìn đ/lít', dp: 2, borderWidth: 2.4 }),
    L('Brent', o.brent, C.red, { yAxisID: 'y1', unit: ' USD/thùng', dp: 1, borderDash: [5, 4] }), L('WTI', o.wti, C.gold, { yAxisID: 'y1', unit: ' USD/thùng', dp: 1, borderDash: [2, 3] })] },
    options: { scales: { y: numAxis('nghìn đồng/lít', { beginAtZero: false, ticks: { callback: v => nf(v, 0) } }), y1: { position: 'right', beginAtZero: false, grid: { display: false }, title: { display: true, text: 'USD/thùng' }, ticks: { callback: v => nf(v, 0) } } } } });
  const b0 = o.d.findIndex(d => d >= '2026-01-01') - 1, od = o.d.slice(b0), rel = k => o[k].slice(b0).map(v => v == null || !o[k][b0] ? null : +((v / o[k][b0] - 1) * 100).toFixed(1));
  const ctr = cpiTransOn(od), za = ctr ? zeroAlign(['brent', 'wti', 'r95', 'e5', 'do'].flatMap(rel), ctr) : {};
  mk('chOilChg', { type: 'line', data: { labels: od.map(dvn), datasets: [L('Brent', rel('brent'), C.red, { borderDash: [5, 4] }), L('WTI', rel('wti'), C.gold, { borderDash: [2, 3] }), L('RON 95', rel('r95'), C.navy, { borderWidth: 2.4 }), L('E5 RON 92', rel('e5'), C.teal), L('Dầu DO', rel('do'), C.purple, { borderWidth: 2.4 }),
    ...(ctr ? [L('CPI giao thông (% YoY, trục phải)', ctr, C.tealInk, { yAxisID: 'y1', borderWidth: 2.2, pointRadius: ctr.map(v => v == null ? 0 : 3.5), pointHoverRadius: 5, pointBackgroundColor: '#fff', pointBorderWidth: 2 })] : [])] },
    options: { plugins: { refLines: { lines: [{ value: 0, label: '', color: C.grey }] } }, scales: { y: pctAxis('', za.l || {}), ...(ctr ? { y1: pctAxis('', Object.assign({ position: 'right', grid: { display: false }, title: { display: true, text: 'CPI giao thông, % YoY' } }, za.r || {})) } : {}) } } });
  { const B = BD.big4, BC = { VCB: C.tealInk, CTG: C.navy, BID: C.purple, AGRIBANK: C.gold };
    mk('bBig4', { type: 'line', data: { labels: B.months.map(mvn), datasets: [
      ...Object.keys(B.names).map(k => L(B.names[k], B.bank[k], BC[k], { showLine: false, pointRadius: 2.5, pointHoverRadius: 5, pointBorderWidth: 0 })),
      L('Huy động 12T Big 4', B.months.map((m, i) => B.dep[i] ?? byM(dom.dep12State)[m] ?? null), C.red, { borderWidth: 2.2 }), L('TPCP 10 năm', big4Y10(), C.grey, { borderDash: [5, 4] })] },
      options: { scales: { y: pctAxis('', { beginAtZero: false }) } } }); }
  drMmCurve('dMmCurve');
  const H = BD.gb.holders, est = H.map(h => !!h.e);
  mk('bHold', { type: 'bar', data: { labels: H.map(h => h.p), datasets: [
    { label: 'Ngân hàng', data: H.map(h => h.bank), backgroundColor: est.map(e => e ? 'rgba(29,38,120,.45)' : 'rgba(29,38,120,.85)'), stack: 's', unit: '%', dp: 1 },
    { label: 'Nhóm bảo hiểm (BHXH, BHTG, DNBH)', data: H.map(h => h.ins), backgroundColor: est.map(e => e ? 'rgba(31,138,141,.45)' : 'rgba(31,138,141,.85)'), stack: 's', unit: '%', dp: 1 },
    { label: 'Khác (CTCK, quỹ, nước ngoài…)', data: H.map(h => +(100 - h.bank - h.ins).toFixed(1)), backgroundColor: 'rgba(217,164,0,.75)', stack: 's', unit: '%', dp: 1 }] },
    options: { scales: { x: { stacked: true }, y: pctAxis('', { stacked: true, min: 0, max: 100 }) } } });
  const TY_ = tenYears();
  stk('bTen', TY_.map(t => t.y === TY_[TY_.length - 1].y ? t.y + ' (đến ' + mvn(t.last).slice(0, 2) + ')' : t.y), Object.fromEntries(TENS.map(k => [k, TY_.map(t => t.sh[k] == null ? null : +t.sh[k].toFixed(1))])), { unit: '%', dp: 1, colors: ['#B3BDE8', '#8997D6', '#4354B7', C.navy, C.teal, C.tealInk, C.purple], y: { max: 100, ticks: { callback: v => nf(v, 0) + '%' } } });
  const f = BD.gb.fx, f0 = Math.max(0, f.months.indexOf('2021-01'));
  mk('bFx', { type: 'bar', data: { labels: f.months.slice(f0).map(mvn), datasets: [{ label: 'Mua/bán ròng', data: f.net.slice(f0), backgroundColor: f.net.slice(f0).map(v => v < 0 ? 'rgba(192,57,43,.7)' : 'rgba(31,138,141,.75)'), unit: ' tỷ', dp: 0 }] }, options: { plugins: { legend: { display: false } }, scales: { y: numAxis('tỷ đồng') } } });
}

function subIdx() {
  const bt = I.backtest, b6 = bt.h6, b3 = bt.h3;
  const comp = (arr, name) => `<div class="tscroll"><table><thead><tr><th>ID</th><th>${name}: thành phần</th><th class="n">Giá trị</th><th class="n">z (36 tháng)</th><th class="n">Dấu</th><th class="n">Đóng góp</th></tr></thead><tbody>
    ${arr.map(c => `<tr><td style="white-space:nowrap">${c.id}</td><td>${esc(c.label)}</td><td class="n">${nf(c.raw, 2)}</td><td class="n">${c.z == null ? '—' : nf(c.z, 2)}</td><td class="n">${c.sign}</td><td class="n"><b>${c.contrib == null ? '—' : sg(c.contrib, 2, '')}</b></td></tr>`).join('')}</tbody></table></div>`;
  const s = SCN[NOW.q];
  return `${chainCard()}<div class="grid g2 gap">
    ${card({ id: 'chMatrix', title: `Ma trận kịch bản · ${mvn(NOW.m)}`, sub: 'Trục ngang IDX-FX (áp lực tỷ giá), trục dọc IDX-LIQ (thanh khoản) · nét đứt = ±1 · đường mờ = 12 tháng gần nhất', h: 'tall',
      insight: `Vị trí hiện tại: IDX-FX <b>${sg(NOW.fx, 2, '')}</b>, IDX-LIQ <b>${sg(NOW.liq, 2, '')}</b> → <b>${s.t}</b> (${s.rate} → ${s.bank}). Ô này bắt đầu từ 03/2026 sau gần 2 năm ở "Nới lỏng mạnh"; cả hai chỉ số chưa vượt ±1 nên đây là thắt chặt mức vừa.`, src: 'Tự tính từ WiData theo công thức deck slide 52' })}
    ${card({ id: 'chIdxHist', title: 'IDX-FX và IDX-LIQ theo thời gian', sub: 'z-score · tháng · nền màu = kịch bản; ±1 = ngưỡng mạnh', h: 'tall',
      insight: `Chỉ số bắt đúng các giai đoạn deck nêu để kiểm tra: <b>2022</b> (tỷ giá và thanh khoản căng: IDX-FX lên +1,8, IDX-LIQ xuống −2,4) và nới lỏng <b>2024–2025</b>. Quý 2/2024 (NHNN phát hành tín phiếu, bán USD) chỉ hiện là "hút tiền về" mức nhẹ vì tính theo tháng làm mờ biến động phiên.`, src: 'Tự tính' })}
  </div>
  <div class="grid g2 gap">
    <article class="card"><h3 class="sub">IDX-FX · đóng góp từng thành phần</h3><p class="chart-sub">Đóng góp = dấu × z; chỉ số = trung bình các đóng góp</p>${comp(I.fxComp, 'IDX-FX')}
      <div class="insight">Kéo IDX-FX lên: UST 10Y (z ${nf(I.fxComp.find(c => c.key === 'ust10').z, 1)}) và cán cân XNK + FDI 12 tháng thấp nhất trong 36 tháng (z ${nf(I.fxComp.find(c => c.key === 'ext12').z, 1)}). Kéo xuống: USD/VND 3 tháng giảm ${nf(Math.abs(I.fxComp.find(c => c.key === 'usdvnd3m').raw), 1)}% — NHNN đang giữ giá VND chặt.</div></article>
    <article class="card"><h3 class="sub">IDX-LIQ · đóng góp từng thành phần</h3><p class="chart-sub">Thanh khoản dồi dào = dương</p>${comp(I.liqComp, 'IDX-LIQ')}
      <div class="insight">M2 chậm lại và chênh tiền gửi − tín dụng âm là hai lực kéo IDX-LIQ xuống; tài khóa 4 quý còn dương (chi lớn cuối 2025) nhưng Q2/2026 thu đã vượt chi.</div></article>
  </div>
  <div class="grid g2 gap">
    <article class="card"><h3 class="sub">Kiểm tra lại (backtest) <span class="pill risk">chưa đạt</span></h3>
      <p class="chart-sub">${esc(bt.rule)}</p>
      <div class="tscroll"><table><thead><tr><th>Kỳ dự báo</th><th class="n">Đúng hướng</th><th class="n">Sai hướng</th><th class="n">Đi ngang</th><th class="n">Tỷ lệ đúng</th></tr></thead><tbody>
        ${[b3, b6].map(b => `<tr><td>${b.h} tháng</td><td class="n">${b.hit}</td><td class="n">${b.miss}</td><td class="n">${b.flat}</td><td class="n"><b>${pc(b.rate, 0)}</b></td></tr>`).join('')}</tbody></table></div>
      <div class="verdict bad">Bản trọng số bằng nhau đúng hướng <b>${pc(b6.rate, 0)}</b> (6 tháng) và ${pc(b3.rate, 0)} (3 tháng) — dưới ngưỡng ${bt.target}% của deck. Theo deck cần hiệu chỉnh trọng số trước khi dùng ma trận để ra quyết định; tạm thời đọc ma trận như bản đồ áp lực, kết hợp bảng tín hiệu R-xx.</div>
      <div class="note">Lý do chính: LS huy động niêm yết thay đổi theo bậc (đứng yên nhiều tháng) nên nhiều kỳ "đi ngang"; áp lực tỷ giá 2023 và Q2/2024 được NHNN xử lý bằng tín phiếu, bán USD thay vì tăng LS huy động.</div></article>
    <article class="card"><h3 class="sub">Chỗ lệch so với deck (do dữ liệu)</h3><p class="chart-sub">Công thức giữ đúng slide 52; thành phần thay thế khi WiData chưa có chuỗi</p>
      <ul style="margin:0;padding-left:18px;font-size:12.5px;color:var(--ink2)">${I.deviations.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
      <div class="note keep">Ô kịch bản ở tab Vĩ mô của dashboard CTG đọc cùng kết quả này.</div></article>
  </div>
  <article class="card"><h3 class="sub">Kịch bản → tác động lên từng nhóm ngân hàng</h3><p class="chart-sub">Theo deck slide 38–39, 54 · nhóm in đậm = nhạy nhất trong kịch bản hiện tại</p>
    <div class="tscroll"><table><thead><tr><th>Kịch bản</th><th>Lãi suất</th><th>Big 4</th><th>Tư nhân lớn</th><th>Tư nhân vừa, nhỏ</th></tr></thead><tbody>
      <tr class="${NOW.q === 'ease' ? 'hl' : ''}"><td><b>Nới lỏng mạnh</b></td><td>Giảm nhanh</td><td>NIM mở rộng chậm (CASA cao, cho vay hạ tầng lãi thấp)</td><td>NIM mở rộng nhanh nhất; tín dụng bán lẻ tăng</td><td>COF giảm mạnh nhất; P/B được định giá lại</td></tr>
      <tr class="${NOW.q === 'drain' ? 'hl' : ''}"><td><b>NHNN hút tiền về</b></td><td>LNH tăng</td><td>Ít ảnh hưởng (thừa thanh khoản)</td><td>Chi phí vốn ngắn hạn tăng</td><td>Phụ thuộc LNH → COF tăng nhanh</td></tr>
      <tr class="${NOW.q === 'room' ? 'hl' : ''}"><td><b>Dư địa bơm tiền</b></td><td>Huy động gần đỉnh</td><td>Hưởng lợi khi NHNN nới tỷ lệ (KBNN, LDR)</td><td>Chờ tín hiệu nới sớm</td><td>Áp lực huy động còn cao</td></tr>
      <tr class="${NOW.q === 'tight' ? 'hl' : ''}"><td><b>Thắt chặt kéo dài</b></td><td>Cao kéo dài</td><td>Phòng thủ: đệm dự phòng dày, LDR có KBNN đỡ</td><td><b>LDR sát trần → phải tăng LS huy động; NIM co</b></td><td><b>NPL, chi phí dự phòng tăng; bao phủ mỏng</b></td></tr>
    </tbody></table></div></article>`;
}
function chIdx() {
  const H = I.history, tail = H.slice(-12);
  mk('chMatrix', { type: 'scatter', data: { datasets: [
    { label: '12 tháng', data: tail.map(h => ({ x: h.fx, y: h.liq, m: h.m })), showLine: true, borderColor: 'rgba(29,38,120,.35)', backgroundColor: 'rgba(29,38,120,.35)', pointRadius: 3 },
    { label: 'Hiện tại', data: [{ x: NOW.fx, y: NOW.liq, m: NOW.m }], backgroundColor: C.red, pointRadius: 8, pointHoverRadius: 9 }] },
    options: { interaction: { mode: 'nearest', intersect: true }, plugins: { quadBg: { on: true }, legend: { display: false }, tooltip: { callbacks: { label: c => `${mvn(c.raw.m)}: FX ${sg(c.raw.x, 2, '')} · LIQ ${sg(c.raw.y, 2, '')}` } } },
      scales: { x: { min: -2.5, max: 2.5, title: { display: true, text: 'IDX-FX → áp lực tỷ giá cao' }, grid: { display: false } }, y: { min: -2.5, max: 2.5, title: { display: true, text: 'IDX-LIQ → thanh khoản dồi dào' }, grid: { display: false } } } } });
  const qc = { ease: 'rgba(30,143,90,.10)', drain: 'rgba(217,164,0,.12)', room: 'rgba(41,56,168,.08)', tight: 'rgba(192,57,43,.10)' };
  mk('chIdxHist', { type: 'line', data: { labels: H.map(h => mvn(h.m)), datasets: [L('IDX-FX', H.map(h => h.fx), C.red, { unit: '', borderWidth: 2.4 }), L('IDX-LIQ', H.map(h => h.liq), C.navy, { unit: '', borderWidth: 2.4 })] },
    options: { scales: { y: numAxis('z', { ticks: { callback: v => nf(v, 1) } }) }, plugins: { refLines: { lines: [{ value: 1, color: C.grey, label: '+1' }, { value: -1, color: C.grey, label: '−1' }] } } },
    plugins: [{ id: 'qband', beforeDatasetsDraw(ch) { const { ctx, chartArea: a, scales: { x: sx } } = ch; const w = (a.right - a.left) / Math.max(1, sx.max - sx.min + 1); ctx.save(); ctx.beginPath(); ctx.rect(a.left, a.top, a.right - a.left, a.bottom - a.top); ctx.clip();
      H.forEach((h, i) => { if (i < sx.min || i > sx.max) return; ctx.fillStyle = qc[h.q]; ctx.fillRect(sx.getPixelForValue(i) - w / 2, a.top, w, a.bottom - a.top); }); ctx.restore(); } }] });
}

/* =====================================================================
   TAB 3 · CHÍNH SÁCH · QUY ĐỊNH
===================================================================== */
/* ---------- nhật ký điều hành NHNN ---------- */
const SBV_TOOLS = ['Lãi suất điều hành', 'OMO · tín phiếu', 'Tỷ giá', 'Tín dụng', 'Quy định', 'Chỉ đạo · khác', 'Thị trường'];
const dirTag = d => `<span class="dir ${d === 'nới' ? 'n' : d === 'thắt' ? 't' : 'z'}">${d === 'nới' ? 'Nới' : d === 'thắt' ? 'Thắt' : 'Trung tính'}</span>`;
const qOf = d => d.slice(0, 4) + '-Q' + (Math.floor((+d.slice(5, 7) - 1) / 3) + 1);
const qLbl = q => 'Q' + q.slice(-1) + '/' + q.slice(2, 4);
function sbvBlock() {
  const S = D.sbv, E = S.events, cur = S.current;
  const pick = ks => ks.map(k => cur.find(c => c.k.startsWith(k))).filter(Boolean);
  const short = v => v.replace('/năm', '').replace(/ \(.*\)$/, '');
  const tiles = pick(['Tái cấp vốn', 'Tái chiết khấu', 'Lãi suất OMO', 'Cho vay qua đêm', 'Trần LS huy động 1', 'Biên độ', 'Chỉ tiêu tăng trưởng', 'Tăng trưởng tín dụng YTD', 'Trần LDR', 'Tỷ lệ tiền gửi có kỳ hạn KBNN']);
  const lbl = { 'Cho vay qua đêm LNH (và bù đắp thiếu hụt thanh toán bù trừ)': 'Cho vay qua đêm LNH', 'Lãi suất OMO (cầm cố GTCG)': 'Lãi suất OMO', 'Trần LS huy động 1 – <6 tháng': 'Trần LS huy động 1–<6T', 'Biên độ tỷ giá USD/VND': 'Biên độ tỷ giá', 'Chỉ tiêu tăng trưởng tín dụng 2026': 'Chỉ tiêu tín dụng 2026', 'Tăng trưởng tín dụng YTD': 'Tín dụng so đầu năm', 'Tỷ lệ tiền gửi có kỳ hạn KBNN được tính vào LDR': 'KBNN tính vào LDR' };
  const val = c => c.k.startsWith('Tăng trưởng tín dụng') ? c.v.split(' ')[0] : c.k.startsWith('Biên độ') ? '±5%' : c.k.startsWith('Chỉ tiêu') ? '~15%' : c.k.startsWith('Trần LDR') ? '95%*' : short(c.v);
  const sub = c => c.k.startsWith('Tăng trưởng tín dụng') ? 'đến 30/9/2026' : c.k.startsWith('Trần LDR') ? '*công thức mới TT50 từ 1/12/2026 — không so trực tiếp với 85% của TT22' : `từ ${dvn(c.since)}${c.doc ? ' · ' + c.doc.replace('/QĐ-NHNN', '').replace('/TT-NHNN', '').replace('/NHNN-CSTT', '') : ''}`;
  const act = E.filter(e => e.tool !== 'Thị trường');
  const y26 = act.filter(e => e.d >= '2026'), n26 = y26.filter(e => e.dir === 'nới').length, t26 = y26.filter(e => e.dir === 'thắt').length;
  const lastRate = E.filter(e => e.tool === 'Lãi suất điều hành')[0];
  return `
  <div class="kpis pol">${tiles.map(c => kpi(lbl[c.k] || c.k, esc(val(c)), esc(sub(c)))).join('')}</div>
  ${card({ id: 'chSbvStance', title: 'Nhịp điều hành NHNN theo quý', h: 'tall',
    sub: 'số quyết định nới (trên 0) và thắt (dưới 0) mỗi quý, không tính dòng diễn biến thị trường · rê chuột xem tên quyết định · bấm vào cột để lọc bảng bên dưới',
    insight: `Lãi suất điều hành <b>giữ nguyên từ 19/6/2023</b> (tái cấp vốn 4,5%, tái chiết khấu 3,0%). NHNN điều tiết bằng OMO (lần đổi gần nhất: ${esc(lastRate.t.toLowerCase())}, ${dvn(lastRate.d)}), room tín dụng và quy định an toàn. Từ đầu 2026 có <b>${n26} quyết định nới, ${t26} thắt</b>: nới chủ yếu ở room (loại trừ dự án trọng điểm, NOXH, KCN, du lịch) và LDR (KBNN 50%; trần 95% theo cách tính mới của TT50, bắt buộc từ 10/2028); trong khi thanh khoản căng đẩy LNH qua đêm lên 11–12,5% (6/2026) và lãi suất huy động lên 6,38% (9/2026) bất chấp chỉ đạo giảm lãi suất.`,
    src: 'NHNN (sbv.gov.vn), văn bản pháp luật và báo chính thống — link từng dòng ở bảng nhật ký' })}
  <article class="card"><h3 class="sub">Nhật ký điều hành NHNN</h3>
    <p class="chart-sub">${E.length} mốc từ 6/2023 đến ${dvn(E[0].d)} · mới nhất trên cùng · dòng "Thị trường" là diễn biến, không phải quyết định của NHNN</p>
    <div class="picker" id="sbvTool"><button type="button" data-k="">Tất cả</button>${SBV_TOOLS.map(t => `<button type="button" data-k="${t}">${t} <small>${E.filter(e => e.tool === t).length}</small></button>`).join('')}</div>
    <div class="picker" id="sbvDir"><button type="button" data-k="">Mọi hướng</button><button type="button" data-k="nới">Nới</button><button type="button" data-k="thắt">Thắt</button><button type="button" data-k="trung tính">Trung tính</button><span id="sbvQ"></span></div>
    <div class="picker" id="sbvN"><span class="muted">Hiển thị</span>${[10, 20, 50, 100].map(n => `<button type="button" data-n="${n}">${n} tin</button>`).join('')}<span class="muted" id="sbvCnt"></span></div>
    <div class="tscroll"><table class="sbv"><thead><tr><th>Ngày</th><th>Công cụ</th><th>Quyết định</th><th>Hướng</th><th>Tác động lên ngân hàng</th><th>Văn bản · nguồn</th></tr></thead><tbody id="sbvBody"></tbody></table></div>
    <div class="src">Nguồn: ghi theo từng dòng (NHNN, Chính phủ, báo chính thống). Ngày là ngày hiệu lực hoặc ngày công bố như ghi dưới ngày.</div>
  </article>`;
}
function sbvWire() {
  const E = D.sbv.events, f = { tool: '', dir: '', q: '', n: 10 };
  const render = () => {
    const rows = E.filter(e => (!f.tool || e.tool === f.tool) && (!f.dir || e.dir === f.dir) && (!f.q || qOf(e.d) === f.q));
    $('#sbvCnt').textContent = `· ${Math.min(f.n, rows.length)}/${rows.length} mốc khớp bộ lọc, mới nhất trước`;
    $$('#sbvN button').forEach(b => b.classList.toggle('on', +b.dataset.n === f.n));
    $('#sbvBody').innerHTML = rows.slice(0, f.n).map(e => `<tr${e.verify ? ' class="vf"' : ''}><td style="white-space:nowrap">${dvn(e.d)}<div class="muted">${esc(e.dType)}</div></td><td style="white-space:nowrap">${esc(e.tool)}</td>
      <td><b>${esc(e.t)}</b><div class="note">${esc(e.detail)}</div>${e.verify ? `<div class="note keep">⚠ Cần xác minh: ${esc(e.note)}</div>` : ''}</td><td>${dirTag(e.dir)}</td><td>${esc(e.impact)}</td>
      <td>${e.doc ? `<b>${esc(e.doc)}</b><br>` : ''}${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.src)}</a>` : esc(e.src)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Không có mốc nào khớp bộ lọc.</td></tr>';
    $$('#sbvTool button').forEach(b => b.classList.toggle('on', b.dataset.k === f.tool));
    $$('#sbvDir button').forEach(b => b.classList.toggle('on', b.dataset.k === f.dir));
    $('#sbvQ').innerHTML = f.q ? `<button type="button" class="on" id="sbvQx">${qLbl(f.q)} ✕</button>` : '';
    if (f.q) $('#sbvQx').onclick = () => { f.q = ''; render(); };
  };
  $$('#sbvTool button').forEach(b => b.onclick = () => { f.tool = b.dataset.k; render(); });
  $$('#sbvDir button').forEach(b => b.onclick = () => { f.dir = b.dataset.k; render(); });
  $$('#sbvN button').forEach(b => b.onclick = () => { f.n = +b.dataset.n; render(); });
  // chart: nới/thắt theo quý + LNH qua đêm cuối quý
  const act = E.filter(e => e.tool !== 'Thị trường');
  const qs = []; for (let y = 2024; y <= 2026; y++) for (let k = 1; k <= 4; k++) { const q = `${y}-Q${k}`; if (q <= qOf(D.meta.asOf || E[0].d)) qs.push(q); }
  const cnt = (q, d) => act.filter(e => qOf(e.d) === q && e.dir === d);
  mk('chSbvStance', { type: 'bar', data: { labels: qs.map(qLbl), datasets: [
      { label: 'Nới', data: qs.map(q => cnt(q, 'nới').length), backgroundColor: '#1e8f5a', stack: 's', dp: 0, unit: '', yAxisID: 'y' },
      { label: 'Thắt', data: qs.map(q => -cnt(q, 'thắt').length), backgroundColor: '#c0392b', stack: 's', dp: 0, unit: '', yAxisID: 'y' }] },
    options: { plugins: { tooltip: { callbacks: {
        label: c => `${c.dataset.label}: ${Math.abs(c.raw)} quyết định`,
        footer: items => { const q = qs[items[0].dataIndex]; return act.filter(e => qOf(e.d) === q && e.dir !== 'trung tính').slice(0, 6).map(e => (e.dir === 'nới' ? '+ ' : '− ') + (e.t.length > 64 ? e.t.slice(0, 62) + '…' : e.t)); } } } },
      scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: v => Math.abs(v), stepSize: 1 }, title: { display: true, text: 'số quyết định' }, grid: { color: '#eef0f4' } } },
      onClick: (ev, els) => { if (!els.length) return; f.q = qs[els[0].index]; render(); document.getElementById('sbvBody').closest('article').scrollIntoView({ behavior: 'smooth', block: 'start' }); } } });
  render();
}

function panePolicy() {
  const S = D.ldrSens, cur = store.get().kbnn || '50';
  $('#policy').innerHTML = `
  <h2 class="sec">Chính sách · Quy định</h2>
  <p class="sec-sub">Điều hành của NHNN và các quy định quyết định trần tăng trưởng, chi phí vốn của từng nhóm ngân hàng. Bảng REG dùng chung với dashboard CTG.</p>
  ${sbvBlock()}
  ${card({ id: 'chLdrSens', title: 'Tiền gửi Kho bạc trong LDR: ai hưởng lợi khi hệ số thay đổi', h: 'tall', ctl: false,
    sub: `% · ${S.quarter} · chọn hệ số tiền gửi KBNN tính vào mẫu số LDR · đường đỏ = trần 85% (TT22)`,
    body: `<div class="picker" id="kbPick">${[['0', '0% (Q1/2026)'], ['20', '20% (Q2/2026 · mặc định TT50)'], ['50', '50% (từ Q3/2026)']].map(([k, l]) => `<button type="button" data-k="${k}">${l}</button>`).join('')}</div>`,
    insight: '<span id="kbIns"></span>', src: 'WiData ratio_bank (ldr), fs_bank (bs160_1, bs330), fs_bank_notes (fnx107) · tự tính' })}
  <article class="card"><h3 class="sub">Độ nhạy LDR theo hệ số KBNN</h3><p class="chart-sub">${esc(S.formula)}</p>
    <div class="tscroll"><table><thead><tr><th>Ngân hàng</th><th>Nhóm</th><th class="n">Tiền gửi KBNN (tỷ)</th><th class="n">% tiền gửi KH</th><th class="n">LDR 0%</th><th class="n">LDR 20%</th><th class="n">LDR 50%</th><th class="n">Giảm khi 20%→50%</th></tr></thead><tbody>
    ${S.rows.map(r => `<tr><td><b>${r.s}</b></td><td style="white-space:nowrap">${gdot(r.group)}${r.group}</td><td class="n">${nf(r.kbnn)}</td><td class="n">${pc(r.kbnnPctDep, 1)}</td><td class="n">${pc(r.ldr0, 2)}</td><td class="n">${pc(r.ldr20, 2)}</td><td class="n">${pc(r.ldr50, 2)}</td><td class="n">${sg(r.ldr50 - r.ldr20, 2, ' đ%')}</td></tr>`).join('')}</tbody></table></div></article>
  <article class="card"><h3 class="sub">Lịch quy định (REG)</h3><p class="chart-sub">Văn bản mới nhất lên trước · nhãn Chưa hiệu lực = đã ban hành, chưa bắt buộc áp dụng</p><div class="tscroll"><table>
    <thead><tr><th>Trạng thái</th><th>ID</th><th>Quy định</th><th>Mức</th><th>Văn bản</th><th>Lộ trình</th></tr></thead><tbody>
    ${D.reg.map(g => `<tr class="${g.flag ? 'hl' : g.eff > TODAY ? 'soon' : ''}"><td style="white-space:nowrap">${regSt(g)}</td><td style="white-space:nowrap">${g.id}</td><td>${esc(g.rule)}</td><td>${esc(g.level)}${g.flag ? `<div class="note keep">⚠ ${esc(g.flag)}</div>` : ''}</td><td>${regDoc(g, D.regRef)}</td><td>${esc(g.path)}</td></tr>`).join('')}
    </tbody></table></div></article>`;
  const draw = k => {
    $$('#kbPick button').forEach(b => b.classList.toggle('on', b.dataset.k === k)); store.set({ kbnn: k });
    const key = 'ldr' + k; const rows = [...S.rows].sort((a, b) => b[key] - a[key]);
    mk('chLdrSens', { type: 'bar', data: { labels: rows.map(r => r.s), datasets: [{ label: 'LDR hệ số ' + k + '%', data: rows.map(r => r[key]), backgroundColor: rows.map(r => GC[r.group]), dp: 2, unit: '%' }] },
      options: { plugins: { legend: { display: false }, refLines: { lines: [{ value: 85, label: 'Trần 85%' }] } }, scales: { y: pctAxis('', { min: 50 }) } } });
    const big = S.rows.filter(r => r.group === 'Big 4');
    $('#kbIns').innerHTML = `Ở hệ số ${k}%: ${rows.filter(r => r[key] > 85).map(r => `<b>${r.s} ${pc(r[key], 1)}</b>`).join(', ') || 'không NH nào'} vượt 85%. Chỉ Big 4 có tiền gửi KBNN đáng kể (${big.map(r => `${r.s} ${nf(r.kbnn / 1000, 0)} nghìn tỷ`).join(', ')}) — mỗi 30 điểm % hệ số kéo LDR của họ xuống ~1,7–2,1 điểm %; nhóm tư nhân gần như không đổi. TT50 (1/12/2026) đặt mặc định 20%, Thống đốc có thể điều chỉnh — nếu về 20% thì lợi thế Q3 của Big 4 mất đi.`;
  };
  $$('#kbPick button').forEach(b => b.onclick = () => draw(b.dataset.k));
  draw(cur);  sbvWire();
}

/* =====================================================================
   TAB 4 · CATALYST · RISK
===================================================================== */
function paneCatalyst() {
  const up = D.events.filter(e => e.status === 'pending').sort((a, b) => a.d.localeCompare(b.d));
  const types = ['Tất cả', ...new Set(D.events.map(e => e.type))];
  const risk = D.signals.filter(s => s.state === 'risk').length, ok = D.signals.filter(s => s.state === 'ok').length;
  $('#catalyst').innerHTML = `
  <h2 class="sec">Catalyst · Risk</h2>
  <p class="sec-sub">Quy tắc nếu–thì R-01…R-16 của deck chạy trên số mới nhất; ngưỡng là giả định ban đầu, chưa backtest. Sự kiện có nguồn, dấu ± là tác động lên ngành.</p>
  <div class="banner warn"><b>${risk}/${D.signals.length} tín hiệu ở mức Rủi ro, ${ok} Hỗ trợ.</b> Áp lực đến từ bên ngoài (Fed, dầu, UST) và cuộc đua tiền gửi; điểm đỡ là CNY mạnh lên và NHNN nới hệ số KBNN.</div>
  <article class="card"><h3 class="sub">Tín hiệu theo quy tắc R-xx <span class="pill ai">quy tắc</span></h3><p class="chart-sub">Deck slide 50–51 · R-04, R-05, R-07 (Nhật, đấu giá UST, carry) chưa có dữ liệu trong WiData nên chưa hiện</p>
    <div class="tscroll"><table><thead><tr><th>Mã</th><th>Lớp</th><th>Nếu…</th><th>Số hiện tại</th><th>Trạng thái</th><th>Thì (tác động)</th></tr></thead><tbody>
    ${D.signals.map(s => `<tr><td style="white-space:nowrap"><b>${s.id}</b></td><td style="white-space:nowrap">${esc(s.layer)}</td><td>${esc(s.rule)}</td><td>${esc(s.now)}</td><td>${pill(s.state)}</td><td>${esc(s.impact)}</td></tr>`).join('')}
    </tbody></table></div></article>
  <div class="grid g2 gap">
    <article class="card"><h3 class="sub">Sắp tới</h3><div class="tscroll"><table><thead><tr><th>Ngày</th><th>Loại</th><th>±</th><th>Sự kiện</th></tr></thead><tbody>
      ${up.map(e => `<tr><td style="white-space:nowrap">${dvn(e.d)}</td><td>${esc(e.type)}</td><td>${impact(e.impact)}</td><td><b>${esc(e.t)}</b>${e.detail ? `<div class="note">${esc(e.detail)}</div>` : ''}<div class="src">${esc(e.src)}</div></td></tr>`).join('')}
    </tbody></table></div></article>
    <article class="card"><h3 class="sub">Watch KPIs — theo dõi ở đâu để cập nhật nhanh</h3><p class="chart-sub">Mỗi dòng: chỉ số → ngưỡng → tab có chart</p>
      <div class="tscroll"><table><thead><tr><th>Chỉ số</th><th>Hiện tại</th><th>Đổi quan điểm khi</th></tr></thead><tbody>
        <tr><td>UST 10Y</td><td>${pc(lastv(intl.ust10).v, 2)}</td><td>&lt; 4,5% → áp lực tỷ giá giảm rõ</td></tr>
        <tr><td>LS huy động 12T NHTM NN</td><td>${pc(lastv(dom.dep12State).v, 2)}</td><td>Giảm ≥ 0,3 điểm % → tín hiệu nới sớm</td></tr>
        <tr><td>Tín dụng YoY − tiền gửi YoY</td><td>${sg(lastv(dom.creditYoY).v - lastv(dom.depYoY).v, 1, ' đ%')}</td><td>&lt; 2 điểm % → hết cuộc đua tiền gửi</td></tr>
        <tr><td>CPI bình quân</td><td>${pc(lastv(dom.cpiAvg).v, 2)}</td><td>&gt; 4,5% cả năm → NHNN không hạ LS</td></tr>
        <tr><td>Tỷ giá tự do − NHTM</td><td>${sg(lastv(dom.free).v - lastv(dom.nhtmSell).v, 0, 'đ')}</td><td>&gt; +500đ → áp lực ngoài hệ thống quay lại</td></tr>
        <tr><td>COF ngành</td><td>${pc(AG.cof.all[QI], 2)}</td><td>Tăng tiếp Q3 mà YEA đứng → NIM co</td></tr>
      </tbody></table></div></article>
  </div>
  <article class="card"><h3 class="sub">Dòng sự kiện</h3>
    <div class="filter" id="evF">${types.map((t, i) => `<button type="button" data-t="${t}" class="${i ? '' : 'on'}">${t}</button>`).join('')}</div>
    <div class="tscroll"><table><thead><tr><th>Ngày</th><th>Loại</th><th>±</th><th>Sự kiện</th><th>Trạng thái</th></tr></thead><tbody id="evB"></tbody></table></div></article>
  <article class="card"><h3 class="sub">Rủi ro chính <span class="pill ai">AI tổng hợp</span></h3><p class="chart-sub">Từ số liệu dashboard và tin ngành 09–10/2026</p>
    <div class="tscroll"><table><thead><tr><th>Rủi ro</th><th>Dấu hiệu hiện tại</th><th>Nhóm chịu nhiều nhất</th></tr></thead><tbody>
      <tr><td>Fed tăng tiếp, UST trên 5%</td><td>EFFR ${pc(lastv(intl.effr).v, 2)}, UST 10Y ${pc(lastv(intl.ust10).v, 2)}; chênh VND–USD hẹp</td><td>Cả ngành (định giá), tư nhân phụ thuộc vốn ngắn</td></tr>
      <tr><td>Cuộc đua tiền gửi kéo COF</td><td>Tín dụng hơn tiền gửi ${nf(lastv(dom.creditYoY).v - lastv(dom.depYoY).v, 1)} điểm %; COF ${pc(AG.cof.all[QI], 2)}</td><td>Tư nhân lớn (LDR ~85–90%), VPB LDR &gt; 100%</td></tr>
      <tr><td>Lạm phát vượt mục tiêu</td><td>CPI ${pc(lastv(dom.cpi).v, 2)}, lõi ${pc(lastv(dom.cpiCore).v, 2)}; Brent ${nf(lastv(intl.brent).v, 0)} USD</td><td>Cả ngành — đóng cửa khả năng hạ LS điều hành</td></tr>
      <tr><td>Nợ xấu khi LS cao kéo dài</td><td>NPL nhóm vừa ${pc(AG.npl['Tư nhân vừa'][QI], 2)}, bao phủ ${pc(AG.llr['Tư nhân vừa'][QI], 0)}; dư nợ BĐS +19,6%</td><td>Tư nhân vừa, nhỏ</td></tr>
      <tr><td>Lỗ danh mục TPCP</td><td>TPCP 10Y ${pc(lastv(intl.vn10).v, 2)}, +64 bps 12 tháng</td><td>Big 4 và NH giữ nhiều TPCP</td></tr>
    </tbody></table></div></article>`;
  const draw = t => { $('#evB').innerHTML = D.events.filter(e => t === 'Tất cả' || e.type === t).map(e => `<tr><td style="white-space:nowrap">${dvn(e.d)}</td><td>${esc(e.type)}</td><td>${impact(e.impact)}</td><td>${esc(e.t)}${e.detail ? `<details class="more"><summary>Chi tiết</summary><div class="note">${esc(e.detail)}</div></details>` : ''}<div class="src">${esc(e.src)}</div></td><td>${e.status === 'pending' ? '<span class="pill pending">Chờ</span>' : '<span class="pill ok">Đã diễn ra</span>'}</td></tr>`).join(''); $$('#evF button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); };
  $$('#evF button').forEach(b => b.onclick = () => draw(b.dataset.t)); draw('Tất cả');
}

/* =====================================================================
   TAB 5 · CONSENSUS CTCK
===================================================================== */
function paneCons() {
  const CS = D.consensus, rows = CS.rows.filter(r => r.tpMed != null);
  const full = rows.filter(r => r.nTP >= 3);
  const upMed = med(full.map(r => r.upside)), peMed = med(full.map(r => r.peFwd));
  const pbNow = s => (Lr.find(z => z.s === s) || {}).pb, pbTpMed = med(full.map(r => r.pbTP)), pbNowMed = med(full.map(r => pbNow(r.s)));
  $('#cons').innerHTML = `
  <h2 class="sec">Consensus CTCK</h2>
  <p class="sec-sub">${esc(CS.note)} Khoảng ${dvn(CS.from)} – ${dvn(CS.to)}.</p>
  <div class="kpis">
    ${kpi('NH có ≥ 3 CTCK định giá', nf(full.length), `trên ${CS.rows.length} NH có báo cáo`)}
    ${kpi('Upside trung vị', sg(upMed, 1), 'NH có ≥ 3 giá mục tiêu', 'pos')}
    ${kpi('P/E fwd 2026 trung vị', x(peMed), `P/E TTM ngành ${x(SV.now.pe)}`)}
    ${kpi('P/B tại giá mục tiêu trung vị', x(pbTpMed), `P/B hiện tại trung vị ${x(pbNowMed)} · ngành ${x(SV.now.pb)}`)}
    ${kpi('Khuyến nghị', `${nf(CS.rows.reduce((a, r) => a + r.buy, 0))} MUA`, `${nf(CS.rows.reduce((a, r) => a + r.hold, 0))} trung lập · ${nf(CS.rows.reduce((a, r) => a + r.sell, 0))} bán (theo CTCK)`)}
  </div>
  <article class="card" id="pbHistCard"><h3 class="sub" id="pbHistH"></h3>
    <p class="chart-sub" id="pbHistSub"></p>
    <div class="cbox"><canvas id="chPbHist" role="img" aria-label="P/B lịch sử"></canvas></div>
    <div class="insight" id="pbHistIns"></div>
    <div class="src">BCTC (giá trị sổ sách); giá đóng cửa; báo cáo CTCK (giá mục tiêu)</div></article>
  <div class="grid g2 gap">
    ${card({ id: 'chUp', title: 'Upside theo giá mục tiêu trung vị', h: 'tall', sub: 'Mỗi CTCK lấy bản mới nhất · số trong ngoặc = số giá mục tiêu · màu nhạt = dưới 3 CTCK (kém tin cậy)',
      insight: consIns(full), src: 'WiData co_reports, ratio_daily' })}
    ${card({ id: 'chPeFwd', title: 'P/E forward 2026 theo LNST dự phóng trung vị', h: 'tall', sub: 'Lần · vốn hóa hiện tại / LNST 2026F trung vị các CTCK',
      insight: `P/E fwd thấp nhất: ${[...full].sort((a, b) => a.peFwd - b.peFwd).slice(0, 3).map(r => `<b>${r.s} ${x(r.peFwd)}</b>`).join(', ')}; cao nhất ${[...full].sort((a, b) => b.peFwd - a.peFwd).slice(0, 2).map(r => `${r.s} ${x(r.peFwd)}`).join(', ')}. Big 4 (trừ VCB) được định giá dưới 8,5x dù LNST 2026F tăng hai chữ số.`, src: 'WiData co_reports, ratio_daily' })}
    ${card({ id: 'chPbTp', title: 'Định giá P/B: hiện tại so với tại giá mục tiêu', h: 'tall', sub: `Lần · cột = P/B theo giá ${dvn(D.latest.priceDate)} · chấm = P/B tại giá mục tiêu trung vị (giá mục tiêu / giá trị sổ sách mỗi cổ phiếu hiện tại) · màu nhạt = dưới 3 CTCK · đường = P/B ngành và trung bình`, insight: consPbIns(full), src: 'Báo cáo CTCK (giá mục tiêu); BCTC (giá trị sổ sách); giá đóng cửa' })}
    ${card({ id: 'chPbRoeF', title: 'P/B theo nhóm: hiện tại và tại giá mục tiêu', h: 'tall', sub: 'Lần · P/B trung vị theo nhóm hiện tại, tại giá mục tiêu và trung bình 5 năm của ngành', src: 'Báo cáo CTCK; BCTC; giá đóng cửa' })}
  </div>
  <article class="card"><h3 class="sub">Chi tiết theo ngân hàng</h3><div class="tscroll"><table id="consTab"><thead><tr><th>NH</th><th class="n">CTCK</th><th class="n">MUA / TL / BÁN</th><th class="n">TP trung vị</th><th class="n">TP thấp – cao</th><th class="n">Giá</th><th class="n">Upside</th><th class="n">P/B hiện tại</th><th class="n">P/B tại TP</th><th class="n">LNST 2026F (tỷ)</th><th class="n">P/E fwd</th><th>Mới nhất</th></tr></thead><tbody>
    ${CS.rows.map(r => { const L0 = Lr.find(z => z.s === r.s); return `<tr class="${r.nTP < 3 ? 'stale' : ''}" data-s="${r.s}" style="cursor:pointer"><td><b>${r.s}</b>${r.reports.length ? `<details class="more"><summary>${r.reports.length} báo cáo</summary><div class="note">${r.reports.map(p => `${esc(p.src)} ${dvn(p.d)} · ${esc(p.rec)}${p.tp ? ' · TP ' + nf(p.tp) : ''}${p.np26 ? ' · LNST 26F ' + nf(p.np26) : ''} — ${esc(p.title)}`).join('<br>')}</div></details>` : ''}</td>
      <td class="n">${r.n}</td><td class="n">${r.buy} / ${r.hold} / ${r.sell}</td><td class="n">${nf(r.tpMed)}</td><td class="n">${r.tpMin ? nf(r.tpMin) + ' – ' + nf(r.tpMax) : '—'}</td><td class="n">${nf(L0.price)}</td>
      <td class="n"><b>${sg(r.upside, 1)}</b></td><td class="n">${x(L0.pb)}</td><td class="n">${x(r.pbTP)}</td><td class="n">${nf(r.np26)}</td><td class="n">${x(r.peFwd)}</td><td>${dvn(r.latest)}</td></tr>`; }).join('')}
  </tbody></table></div><div class="note">Dòng mờ: dưới 3 giá mục tiêu trong kỳ. Một số CTCK không ghi khuyến nghị (nhãn KHÁC) nên tổng MUA/TL/BÁN có thể nhỏ hơn số CTCK.</div></article>`;
  const s1 = [...rows].sort((a, b) => b.upside - a.upside);
  mk('chUp', { type: 'bar', data: { labels: s1.map(r => `${r.s} (${r.nTP})`), datasets: [{ label: 'Upside', data: s1.map(r => r.upside), backgroundColor: s1.map(r => r.nTP < 3 ? '#d5d9e2' : GC[r.group]), dp: 1, unit: '%' }] },
    options: { indexAxis: 'y', onClick: consClick, plugins: { legend: { display: false }, refLines: { lines: [{ axis: 'x', value: 0, color: C.grey }] } }, scales: { x: pctAxis() } } });
  { const s3 = rows.filter(r => r.pbTP != null && pbNow(r.s) != null).sort((a, b) => (b.pbTP / pbNow(b.s)) - (a.pbTP / pbNow(a.s)));
    mk('chPbTp', { type: 'bar', data: { labels: s3.map(r => `${r.s} (${r.nTP})`), datasets: [
      { label: 'P/B hiện tại', data: s3.map(r => pbNow(r.s)), backgroundColor: s3.map(r => r.nTP < 3 ? '#d5d9e2' : GC[r.group]), dp: 2, unit: 'x', order: 2 },
      { type: 'line', label: 'P/B tại giá mục tiêu', data: s3.map(r => r.pbTP), showLine: false, pointRadius: 5, backgroundColor: '#fff', borderColor: '#1f2433', pointBorderWidth: 2, dp: 2, unit: 'x', order: 1 }] },
      options: { indexAxis: 'y', onClick: consClick, interaction: { mode: 'index', intersect: false, axis: 'y' }, plugins: { refLines: { lines: [{ axis: 'x', value: SV.now.pb, label: 'Ngành ' + x(SV.now.pb), color: C.red }, { axis: 'x', value: SV.pb.mean, label: 'TB ' + x(SV.pb.mean), color: C.grey }] } }, scales: { x: numAxis('', { ticks: { callback: v => nf(v, 1) + 'x' } }), y: { ticks: { autoSkip: false, font: { size: 11 } }, grid: { display: false } } } } }); }
  mk('chPbRoeF', { type: 'bar', data: { labels: GROUPS, datasets: [
    { label: 'P/B hiện tại (trung vị)', data: GROUPS.map(g => med(full.filter(r => r.group === g).map(r => pbNow(r.s)))), backgroundColor: GROUPS.map(g => GC[g]), dp: 2, unit: 'x' },
    { label: 'P/B tại giá mục tiêu (trung vị)', data: GROUPS.map(g => med(full.filter(r => r.group === g).map(r => r.pbTP))), backgroundColor: 'rgba(217,164,0,.75)', dp: 2, unit: 'x' }] },
    options: { plugins: { refLines: { lines: [{ value: SV.pb.mean, label: 'TB ngành ' + x(SV.pb.mean), color: C.grey }] } }, scales: { y: numAxis('', { ticks: { callback: v => nf(v, 1) + 'x' } }) } } });
  const s2 = CS.rows.filter(r => r.peFwd != null && r.peFwd < 30).sort((a, b) => a.peFwd - b.peFwd);
  mk('chPeFwd', { type: 'bar', data: { labels: s2.map(r => r.s), datasets: [{ label: 'P/E fwd 2026', data: s2.map(r => r.peFwd), backgroundColor: s2.map(r => r.n < 3 ? '#d5d9e2' : GC[r.group]), dp: 2, unit: 'x' }] },
    options: { indexAxis: 'y', onClick: consClick, plugins: { legend: { display: false }, refLines: { lines: [{ axis: 'x', value: SV.now.pe, label: 'P/E TTM ngành', color: C.red }] } }, scales: { x: numAxis('', { ticks: { callback: v => nf(v, 0) + 'x' } }) } } });
  $$('#consTab tbody tr[data-s]').forEach(tr => tr.onclick = e => { if (e.target.closest('details')) return; consPick(tr.dataset.s); });
  drPbHist();
}
/* P/B lịch sử: mặc định trung vị ngành; bấm một ngân hàng ở các biểu đồ/bảng consensus để xem P/B của ngân hàng đó, bấm lại lần nữa để về mặc định */
let consSel = null;
function consClick(e, els, ch) { if (!els || !els.length) return; const lb = String(ch.data.labels[els[0].index]).split(' ')[0]; consPick(lb); }
function consPick(s) {
  consSel = consSel === s ? null : s; drPbHist();
  const c = $('#pbHistCard'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function drPbHist() {
  const H = D.pbHist; if (!H || !$('#chPbHist')) return;
  const qOnly = a => a.filter(([d]) => /-(03-31|06-30|09-30|12-31)$/.test(d));
  const withLast = (a, v) => { const q = qOnly(a); const pd = D.latest.priceDate; return v != null && (!q.length || pd > q[q.length - 1][0]) ? [...q, [pd, v]] : q; };
  const medNow = med(Lr.map(r => r.pb).filter(v => v != null));
  const M = withLast(H.median, medNow);
  const st = a => { const v = a.map(p => p[1]); const m = v.reduce((x, y) => x + y, 0) / v.length; return { m, sd: Math.sqrt(v.reduce((x, y) => x + (y - m) ** 2, 0) / v.length), now: v[v.length - 1], lo: Math.min(...v), hi: Math.max(...v), pct: v.filter(y => y <= v[v.length - 1]).length / v.length * 100 }; };
  const lab = d => /-(03-31|06-30|09-30|12-31)$/.test(d) ? `Q${+d.slice(5, 7) / 3}/${d.slice(0, 4)}` : dvn(d);
  let ds, S, title, cr = null;
  if (consSel && H.banks[consSel]) {
    const L0 = Lr.find(r => r.s === consSel) || {}, B = withLast(H.banks[consSel], L0.pb), mm = new Map(M.map(([d, v]) => [d, v]));
    cr = (D.consensus.rows || []).find(r => r.s === consSel);
    S = st(B); title = `P/B lịch sử ${consSel} so với trung vị ngành`;
    ds = [L(consSel, B.map(p => p[1]), GC[L0.group] || C.navy, { unit: 'x', dp: 2, borderWidth: 2.6, pointRadius: 2 }),
      L('Trung vị ngành', B.map(p => mm.get(p[0]) ?? null), C.grey, { unit: 'x', dp: 2, borderWidth: 1.6, borderDash: [5, 4] })];
    ds.labels = B.map(p => lab(p[0]));
  } else {
    S = st(M); title = 'P/B trung vị ngành ngân hàng (26 ngân hàng niêm yết)';
    ds = [L('P/B trung vị ngành', M.map(p => p[1]), C.navy, { unit: 'x', dp: 2, borderWidth: 2.6, pointRadius: 2 })];
    ds.labels = M.map(p => lab(p[0]));
  }
  const lines = [{ value: S.m, label: `TB ${x(S.m)}`, color: C.grey, dash: [2, 3] }, { value: S.m + S.sd, label: `+1σ ${x(S.m + S.sd)}`, color: '#c9a227', dash: [6, 4] }, { value: S.m - S.sd, label: `−1σ ${x(S.m - S.sd)}`, color: '#c9a227', dash: [6, 4] }];
  if (cr && cr.pbTP != null) lines.push({ value: cr.pbTP, label: `P/B tại giá mục tiêu trung vị ${x(cr.pbTP)}`, color: C.red, dash: [5, 4] });
  mk('chPbHist', { type: 'line', data: { labels: ds.labels, datasets: ds }, options: { plugins: { refLines: { lines } }, scales: { y: numAxis('', { beginAtZero: false, ticks: { callback: v => nf(v, 1) + 'x' } }) } } });
  $('#pbHistH').textContent = title;
  $('#pbHistSub').textContent = `Lần · cuối mỗi quý từ ${lab(H.median[0][0])} và phiên ${dvn(D.latest.priceDate)} · đường xám = trung bình, đường vàng = ± 1 độ lệch chuẩn của chính chuỗi · ${consSel ? `bấm lại ${consSel} để về trung vị ngành` : 'bấm một ngân hàng ở các biểu đồ hoặc bảng bên dưới để xem P/B của ngân hàng đó'}`;
  const z = S.sd ? (S.now - S.m) / S.sd : 0;
  $('#pbHistIns').innerHTML = `${consSel || 'Trung vị ngành'}: P/B hiện tại <b>${x(S.now)}</b>, ${z >= 0 ? 'cao' : 'thấp'} hơn trung bình ${x(S.m)} <b>${nf(Math.abs(z), 1)} độ lệch chuẩn</b>; cao hơn ${nf(S.pct, 0)}% số quý trong chuỗi (thấp nhất ${x(S.lo)}, cao nhất ${x(S.hi)}).`
    + (cr && cr.pbTP != null ? ` Giá mục tiêu trung vị của CTCK tương ứng P/B <b>${x(cr.pbTP)}</b> (${cr.nTP} giá mục tiêu).` : '')
    + (consSel ? ` Trung vị ngành hiện ${x(medNow)}.` : '')
    + how('P/B dưới trung bình lịch sử của chính ngân hàng đó thường phản ánh lo ngại về chất lượng tài sản hoặc ROE giảm; cần đối chiếu với xu hướng ROE và nợ xấu trước khi coi là rẻ.');
}
function consPbIns(full) {
  const pb = s => (Lr.find(z => z.s === s) || {}).pb;
  const R = full.filter(r => r.pbTP != null && pb(r.s) != null).map(r => ({ s: r.s, now: pb(r.s), tp: r.pbTP, roe: (Lr.find(z => z.s === r.s) || {}).roe })).sort((a, b) => (b.tp / b.now) - (a.tp / a.now));
  if (!R.length) return '';
  const lo = R.filter(r => r.now < 1.1).map(r => `${r.s} ${x(r.now)}`);
  return `CTCK định giá các ngân hàng ở P/B trung vị <b>${x(med(R.map(r => r.tp)))}</b>, so với <b>${x(med(R.map(r => r.now)))}</b> hiện tại và trung bình ngành ${x(SV.pb.mean)}. Chênh lớn nhất giữa P/B mục tiêu và hiện tại: ${R.slice(0, 3).map(r => `<b>${r.s}</b> ${x(r.now)} → ${x(r.tp)}`).join(', ')}.${lo.length ? ` Đang giao dịch dưới 1,1x giá trị sổ sách: ${lo.join(', ')}.` : ''}`
    + how('P/B là thước đo chính khi định giá ngân hàng vì tài sản và vốn chủ đều được ghi theo giá trị sổ sách; P/B hợp lý tăng theo ROE bền vững và giảm theo rủi ro nợ xấu. P/B mục tiêu cao hơn trung bình ngành nghĩa là CTCK kỳ vọng ROE cải thiện hoặc định giá lại toàn ngành.');
}
function consIns(full) {
  const s = [...full].sort((a, b) => b.upside - a.upside);
  const neg = s.filter(r => r.upside < 0).map(r => `${r.s} ${sg(r.upside, 0)}`);
  return `Upside cao nhất: ${s.slice(0, 3).map(r => `<b>${r.s} ${sg(r.upside, 0)}</b> (${r.nTP} CTCK)`).join(', ')}. ${neg.length ? 'Giá đã vượt TP trung vị: ' + neg.join(', ') + '. ' : ''}P/B ngành giảm từ 1,53x (08/2026) xuống ${x(SV.now.pb)} trong khi phần lớn báo cáo ra trong tháng 8–9 — một phần upside đến từ giá giảm sau ngày báo cáo, không phải CTCK nâng TP; đối chiếu ngày báo cáo trước khi dùng.`;
}

/* =====================================================================
   TAB 6 · CHỦ ĐỀ NÓNG
===================================================================== */
function paneHot() {
  const big = D.ldrSens.rows.filter(r => r.group === 'Big 4');
  const gapNow = lastv(dom.creditYoY).v - lastv(dom.depYoY).v;
  const fw = ((GD.fedwatch || {}).meetings || []), fwD = fw.find(m => m.date >= '2026-12-01'), top = m => m && Object.entries(m.probs || {}).sort((x, y) => y[1] - x[1])[0];
  const i23 = BQ.indexOf('Q1/2023'), nim0 = i23 >= 0 ? AG.nim.all[i23] : null;
  const st = lastv(dom.dep12State), lg = lastv(dom.dep12Large), ot = lastv(dom.dep12Other);
  const BB = (window.BOND_DATA || {}).big4, b4 = BB ? BB.items.filter(z => z.c && z.d >= '2026-06-01') : [], b4lo = b4.length ? Math.min(...b4.map(z => z.c)) : null, b4hi = b4.length ? Math.max(...b4.map(z => z.c)) : null;
  const news = [...new Map(D.news.map(n => [n.url, n])).values()].sort((x, y) => (y.d || '').localeCompare(x.d || ''));
  $('#hot').innerHTML = `
  <h2 class="sec">Chủ đề nóng</h2>
  <p class="sec-sub">Những câu hỏi đang quyết định ngành trong 1–2 quý tới, mỗi câu kèm số và nơi kiểm chứng · cập nhật ${dvn(st.d)}.</p>
  <div class="grid g2 gap">
    <article class="card hot"><h3 class="sub">1 · Chỉ đạo giảm lãi suất: niêm yết đã giảm, vốn biên thì chưa</h3>
      <p>Hai công văn trong 4 ngày (9608 ngày 18/10, <b>9736</b> ngày 21/10): tiền gửi bình quân giao dịch mới kỳ hạn từ 6 tháng phải giảm tối thiểu <b>0,5 điểm %</b>, NHNN giám sát qua báo cáo thống kê, vi phạm có thể bị giảm chỉ tiêu tín dụng. Tiết kiệm 12 tháng NHTM Nhà nước về <b>${pc(st.v, 2)}</b>, NHTM lớn ${pc(lg.v, 2)}, NHTM khác ${pc(ot.v, 2)} (${dvn(st.d)}).</p>
      <p>Ngược chiều: chứng chỉ tiền gửi tăng 0,1–0,3 điểm % (MB tới 8%, VPBank tới 9%)${b4.length ? `, Big 4 phát hành trái phiếu từ 06/2026 ở <b>${nf(b4lo, 2)}–${nf(b4hi, 2)}%</b>` : ''}; BIDV dự kiến phát hành thêm 8.000 tỷ trái phiếu riêng lẻ trong quý IV.</p>
      <p><b>Nhận định:</b> kênh bị chỉ đạo (tiết kiệm) rẻ đi, kênh chưa bị chỉ đạo (chứng chỉ tiền gửi, trái phiếu) vẫn đắt — chi phí vốn biên chưa hạ thật. Ngân hàng LDR cao, phụ thuộc chứng chỉ tiền gửi chịu nhiều nhất.</p>
      <div class="src">Xem: Bức tranh ngành › Nội địa (Chi phí vốn &amp; thanh khoản); Chính sách · Nhật ký NHNN</div></article>
    <article class="card hot"><h3 class="sub">2 · NIM bị ép từ phía cho vay trước khi chi phí vốn kịp hạ</h3>
      <p>Cho vay phải giảm <b>1,5–2%/năm</b>, áp dụng cả khách hàng hiện hữu; tiền gửi chỉ giảm 0,5 điểm % và chỉ với giao dịch mới. NIM ngành <b>${pc(AG.nim.all[QI], 2)}</b> (${BQ[QI]})${nim0 != null ? `, từ ${pc(nim0, 2)} ở Q1/2023` : ''}; COF ${pc(AG.cof.all[QY], 2)} → <b>${pc(AG.cof.all[QI], 2)}</b> trong 1 năm. Tín dụng vẫn nhanh hơn tiền gửi <b>${nf(gapNow, 1)} điểm %</b> (${mvn(lastv(dom.creditYoY).d)}).</p>
      <p><b>Nhận định:</b> phần tiền gửi cũ lãi suất cao còn trả tới khi đáo hạn, nên NIM Q4/2026 – Q1/2027 bị ép rõ nhất ở ngân hàng CASA thấp và cho vay doanh nghiệp nhiều. Cần theo dõi số giải ngân thực của các gói lãi suất thấp (MSB 10.000 tỷ, VIB 15.000 tỷ, VPBank giảm 1,5%) — có thể chỉ mang tính truyền thông.</p>
      <div class="src">Xem: Bức tranh ngành › Ngân hàng (NIM, COF theo nhóm); BCTC Q4/2026</div></article>
    <article class="card hot"><h3 class="sub">3 · Fed nghiêng về tăng + dầu ~110 USD: NHNN còn dư địa nới?</h3>
      <p>UST 10 năm <b>${pc(glast('us_10y_d').v ?? lastv(intl.ust10).v, 2)}</b> (${dvn(glast('us_10y_d').d)}), Brent <b>${nf(lastv(intl.brent).v, 0)} USD</b> (${sg(yoyAt(intl.brent, lastv(intl.brent).d), 0)} YoY)${fwD && top(fwD) ? `; hợp đồng tương lai lãi suất quỹ liên bang ngụ ý <b>${nf(top(fwD)[1], 1)}%</b> khả năng mức ${top(fwD)[0].replace(/\./g, ',').replace('-', '–')}% sau phiên ${dvn(fwD.date)}` : ''}. Trong nước CPI <b>${pc(lastv(dom.cpi).v, 2)}</b>, lõi ${pc(lastv(dom.cpiCore).v, 2)} — vượt mục tiêu 4,5–5%.</p>
      <p><b>Nhận định:</b> R-02 và R-06 cùng bật, NHNN khó hạ lãi suất điều hành mạnh tay; điểm đỡ là tỷ giá NHTM và tự do đều thấp hơn đầu năm. Đổi chiều nếu Fed giữ nguyên ngày 9/12 và Brent về dưới 90 USD.</p>
      <div class="src">Xem: Bức tranh ngành › Quốc tế (Mỹ), Tỷ giá; Catalyst · Risk (R-02, R-06)</div></article>
    <article class="card hot"><h3 class="sub">4 · Mùa KQKD Q3: lợi nhuận tốt nhưng phản ánh giai đoạn trước chỉ đạo</h3>
      <p>Techcombank LNST công ty mẹ Q3 <b>7.943 tỷ</b> (+23,7% YoY, kỷ lục, thu dịch vụ +40%), VPBank 8.644 tỷ (+18,8%, tín dụng bất động sản +40%), LPBank 3.562 tỷ (+28,9%; 9 tháng hơn 10.400 tỷ). P/B ngành <b>${x(SV.now.pb)}</b>.</p>
      <p><b>Nhận định:</b> Q3 chưa chịu tác động của đợt giảm lãi suất cho vay từ 20/10; rủi ro điều chỉnh dự phóng nằm ở Q4/2026 – 2027. Ưu tiên ngân hàng CASA cao, ít phụ thuộc chứng chỉ tiền gửi.</p>
      <div class="src">Xem: Catalyst · KQKD; trang từng ngân hàng › Tài chính</div></article>
    <article class="card hot"><h3 class="sub">5 · TT50 và tiền gửi Kho bạc: lợi thế Big 4 kéo dài bao lâu?</h3>
      <p>Hệ số tiền gửi Kho bạc vào LDR lên 50% từ Q3/2026 kéo LDR Big 4 xuống ${big.map(r => `${r.s} ${nf(r.ldr20 - r.ldr50, 1)}`).join(', ')} điểm % (cận trên). TT50 hiệu lực 01/12/2026 đặt mặc định 20%.</p>
      <p><b>Nhận định:</b> nếu không giữ 50% sau 01/12, dư địa cho vay thêm của Big 4 thu hẹp đúng lúc cuộc đua vốn căng nhất. Theo dõi văn bản hướng dẫn TT50 trong tháng 11.</p>
      <div class="src">Xem: Chính sách · Quy định (bảng độ nhạy LDR); báo cáo TT50 FinSuccess</div></article>
    <article class="card"><h3 class="sub">Tin ngành mới nhất</h3><p class="chart-sub">Báo chí gắn chủ đề Ngân hàng · ${dvn(news.length ? news[Math.min(13, news.length - 1)].d : '')} – ${dvn(news.length ? news[0].d : '')} · chỉ tiêu đề và link</p>
      <ul class="news" style="padding-left:18px;margin:0">${news.filter(n => n.sym.length || /NHNN|tín dụng|lãi suất|nợ xấu|Thông tư|Thống đốc/i.test(n.t)).slice(0, 14).map(n => `<li><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.t)}</a> <small>· ${esc(n.src)} · ${dvn(n.d)}${n.sym.length ? ' · ' + n.sym.slice(0, 4).join(', ') : ''}</small></li>`).join('')}</ul>
      <div class="src">Nguồn: WiData news_feed</div></article>
  </div>`;
}

/* =====================================================================
   TAB 7 · SOURCES
===================================================================== */
function paneSrc() {
  $('#src').innerHTML = `
  <h2 class="sec">Sources</h2>
  <p class="sec-sub">Mọi số là WiData (lưu nguyên văn trong data/raw/wi, không công khai); số tự tính ghi công thức. Lời đọc dưới chart do AI viết từ số đang hiển thị.</p>
  <article class="card"><h3 class="sub">Nguồn dữ liệu theo nhóm</h3><div class="tscroll"><table><thead><tr><th>Nhóm</th><th>Mã chỉ tiêu / endpoint WiData</th></tr></thead><tbody>
    ${D.sources.map(([a, b]) => `<tr><td style="white-space:nowrap"><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join('')}</tbody></table></div></article>
  <div class="grid g2 gap">
    <article class="card"><h3 class="sub">Công thức tự tính</h3><ul style="margin:0;padding-left:18px;font-size:12.5px;color:var(--ink2)">
      <li>IDX-FX, IDX-LIQ: z = (x − TB 36 tháng) / ĐLC 36 tháng (tối thiểu 24 tháng); chỉ số = trung bình (dấu × z) các thành phần có số.</li>
      <li>Kịch bản: theo dấu của hai chỉ số; ±1 là ngưỡng "mạnh" của deck.</li>
      <li>Chỉ số ngành theo quý: ${esc(D.agg.method)}</li>
      <li>LDR theo hệ số KBNN: ${esc(D.ldrSens.formula)}</li>
      <li>Consensus: ${esc(D.consensus.note)}</li>
      <li>Giá cổ phiếu = P/B × BVPS (ratio_daily).</li></ul></article>
    <article class="card"><h3 class="sub">Độ tin cậy và giới hạn</h3><ul style="margin:0;padding-left:18px;font-size:12.5px;color:var(--ink2)">
      ${I.deviations.map(d => `<li>${esc(d)}</li>`).join('')}
      <li>Tiền gửi hệ thống (NHNN) chưa gồm GTCG, liên ngân hàng — tín dụng lớn hơn huy động không có nghĩa thiếu vốn hoàn toàn (deck slide 58).</li>
      <li>Room tín dụng từng ngân hàng không công bố chính thức — chưa đưa vào.</li>
      <li>LDR là công thức WiData (TT22 + hệ số KBNN), chưa phải LDR theo TT50.</li></ul></article>
  </div>`;
}

/* =====================================================================
   TAB · CẬP NHẬT NHANH (Chuyên viên / AI) — data/quick-updates.json
===================================================================== */
const ST = { 'mới': ['watch', 'Mới'], 'nóng lên': ['risk', 'Nóng lên'], 'tiếp diễn': ['', 'Tiếp diễn'], 'hạ nhiệt': ['ok', 'Hạ nhiệt'] };
const stPill = k => { const [c, l] = ST[k] || ['', k]; return `<span class="pill ${c}">${l}</span>`; };
const byLine = a => a.type === 'AI' ? `<span class="who ai">AI</span> ${esc(a.name)}${a.requestedBy ? ` · theo yêu cầu của chuyên viên <b>${esc(a.requestedBy)}</b>` : ''}` : `<span class="who cv">Chuyên viên</span> <b>${esc(a.name)}</b>`;
let quSel = 0, quEdit = false;
const QD_KEY = 'quDraft';   // bản nháp chuyên viên sửa, lưu trên máy (chưa đăng)
const gp = (o, path) => path.split('.').reduce((a, k) => a == null ? a : a[k], o);
const spath = (o, path, v) => { const ks = path.split('.'), last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
function cleanHTML(el) {   // chỉ giữ chữ và <b>
  const walk = n => [...n.childNodes].map(c => c.nodeType === 3 ? esc(c.textContent) : /^(B|STRONG)$/.test(c.nodeName) ? `<b>${walk(c)}</b>` : c.nodeName === 'BR' ? ' ' : walk(c)).join('');
  return walk(el).replace(/\s+/g, ' ').trim();
}
function quList() {
  const U = ((D.quick && D.quick.updates) || []).slice();
  let dr = null; try { dr = JSON.parse(localStorage.getItem(QD_KEY) || 'null'); } catch (e) {}
  if (dr && !U.some(x => x.id === dr.id)) U.unshift(Object.assign(dr, { _draft: true }));
  return U;
}
/* Xuất PDF bản cập nhật nhanh: tải thẳng file "FinSuccess_Cập Nhật Vĩ Mô Ngày dd-mm-yyyy.pdf" (html2pdf, nạp khi bấm lần đầu).
   Không tải được thư viện thì mới mở hộp in của trình duyệt. */
const H2P = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
function loadH2P() { return window.html2pdf ? Promise.resolve() : new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = H2P; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); }); }
async function quPdf() {
  const btn = $('#quPdf'), lbl = btn ? btn.textContent : '';
  const t = new Date(), dd = String(t.getDate()).padStart(2, '0'), mm = String(t.getMonth() + 1).padStart(2, '0'), yy = t.getFullYear();
  const fname = `FinSuccess_Cập Nhật Vĩ Mô Ngày ${dd}-${mm}-${yy}.pdf`;
  if (btn) { btn.disabled = true; btn.textContent = 'Đang tạo PDF…'; }
  // bản sao gọn để dựng PDF: chart → ảnh, bỏ nút, lịch sử
  const src = $('#quick'), pics = $$('canvas', src).map(c => { try { return c.toDataURL('image/png'); } catch (e) { return null; } });
  const wrap = document.createElement('div'); wrap.className = 'pdf-wrap';
  wrap.innerHTML = `<div class="pdf-top"><img src="assets/fin-success-logo.png" alt="FinSuccess"><span>Tổng hợp có sự hỗ trợ của AI</span></div>`;
  const cl = src.cloneNode(true); cl.removeAttribute('id'); cl.classList.add('pdf-body');
  $$('canvas', cl).forEach((c, i) => { if (pics[i]) { const im = new Image(); im.src = pics[i]; im.className = 'qprint-img'; c.replaceWith(im); } else c.remove(); });
  const h = $('.qprint-date', cl); if (h) h.textContent = ` Ngày ${dd}/${mm}/${yy}`;
  $$('#viewNote, .qbtns, .qfoot, .qdraft, .qhint, .rng, .zsel, .rng-hint, .ibar, button.info, .insight, .src, [contenteditable]', cl).forEach(e => { if (e.matches('[contenteditable]')) e.removeAttribute('contenteditable'); else e.remove(); });
  const hist = $$('article.card', cl).find(a => /Lịch sử cập nhật/.test(a.textContent)); if (hist) hist.remove();
  wrap.appendChild(cl);
  const host = document.createElement('div'); host.className = 'pdf-host'; host.appendChild(wrap); document.body.appendChild(host);
  try {
    await loadH2P();
    await html2pdf().set({ margin: [10, 10, 12, 10], filename: fname, image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css'], avoid: ['.card', '.qc-h', '.qnote', '.qchg', 'tr', '.kpi'] } }).from(wrap).save();
  } catch (e) {
    console.warn('html2pdf lỗi, chuyển sang hộp in', e);
    const old = document.title; document.title = fname.replace(/\.pdf$/, ''); document.body.classList.add('print-quick');
    const dEl = $('#quick .qprint-date'); if (dEl) dEl.textContent = ` Ngày ${dd}/${mm}/${yy}`;
    window.print(); document.body.classList.remove('print-quick'); document.title = old; if (dEl) dEl.textContent = '';
  } finally {
    host.remove(); if (btn) { btn.disabled = false; btn.textContent = lbl; }
  }
}
const QSCOPE = { nganh: 'Ngành ngân hàng', noi: 'Kinh tế trong nước', qt: 'Quốc tế' };
function paneQuick() {
  buildAll();
  const U = quList();
  if (!U.length) { $('#quick').innerHTML = '<h2 class="sec">Nhật ký chuyên viên</h2><p class="sec-sub">Chưa có bản báo cáo nào.</p>'; return; }
  if (quSel >= U.length) quSel = 0;
  const u = U[quSel], prev = u.follows ? U.find(x => x.id === u.follows) : null;
  const ed = new Set(u.edited || []), E = quEdit;
  const f = (key, html, tag = 'span', cls = '') => `<${tag} class="${cls}${ed.has(key) ? ' ed' : ''}" data-f="${key}"${E ? ' contenteditable="true"' : ''}${ed.has(key) ? ' title="Chuyên viên đã sửa"' : ''}>${html}</${tag}>`;
  let who = 'Minh Đức'; try { who = localStorage.getItem('quWho') || who; } catch (e) {}
  $('#quick').innerHTML = `
  <h2 class="sec">Nhật ký chuyên viên<span class="qprint-date"></span></h2>
  ${u._draft ? `<div class="qdraft"><b>Bản nháp trên máy bạn — chưa đăng lên web.</b> Bấm "Sao chép để đăng" rồi dán vào chat với AI kèm câu "đăng bản cập nhật này".
    <span class="qbtns"><button type="button" class="btn" id="quCopy">Sao chép để đăng</button><button type="button" class="btn ghost" id="quDrop">Xoá nháp</button></span><textarea id="quJson" readonly hidden></textarea><span id="quMsg" class="muted"></span></div>` : ''}
  <div class="qhead card${E ? ' editing' : ''}">
    <div class="qmeta"><span class="qdate">${dvn(u.date)}</span><span>Cập nhật bởi: ${byLine(u.author)}</span>${u._draft ? '<span class="pill watch">Nháp</span>' : quSel ? '<span class="pill">Bản cũ</span>' : '<span class="pill ok">Mới nhất</span>'}
      <span class="qbtns">${E ? `<label class="muted">Người sửa <input id="quWho" value="${esc(who)}" size="12"></label><button type="button" class="btn ghost" id="quCheck" title="Sửa lỗi thiếu dấu, Việt hoá thuật ngữ tiếng Anh trong các đoạn đang sửa">Rà soát chính tả</button><button type="button" class="btn" id="quSave">Lưu thành bản mới</button><button type="button" class="btn ghost" id="quCancel">Huỷ</button>`
        : `<button type="button" class="btn ghost" id="quEditBtn">✎ Chỉnh sửa</button><button type="button" class="btn" id="quPdf" title="Tải file PDF của bản đang xem">⤓ Xuất PDF</button>`}</span></div>
    ${E ? '<p class="qhint">Bấm vào đoạn chữ bất kỳ để sửa (Ctrl+B để in đậm). Trạng thái từng mục chọn ở ô bên cạnh tiêu đề. Bản của AI giữ nguyên, bản sửa lưu thành bản mới của bạn.</p>' : ''}
    ${f('headline', esc(u.headline), 'h3', 'qtitle')}
    ${prev ? `<p class="qprev">Tiếp nối bản ${dvn(prev.date)} (${prev.author.type === 'AI' ? 'AI' : 'chuyên viên ' + esc(prev.author.name)}): ${u.vsPrev || ''}</p>` : ''}
    <ul class="qsum">${u.summary.map((t, k) => f('summary.' + k, t, 'li')).join('')}</ul>
    ${u.kpis ? `<div class="kpis k4 qk">${u.kpis.map(k => kpi(esc(k.l), esc(k.v), esc(k.s || ''), k.cls || '')).join('')}</div>` : ''}
  </div>
  ${u.concerns.map((c, i) => `${c.scope && (i === 0 || u.concerns[i - 1].scope !== c.scope) ? `<h3 class="qscope">${QSCOPE[c.scope] || ''}</h3>` : ''}
  <section class="qc">
    <div class="qc-h"><span class="qn">${i + 1}</span>${f(`concerns.${i}.title`, esc(c.title), 'h3')}${E ? `<select data-st="${i}">${Object.entries(ST).map(([k, [, l]]) => `<option value="${k}"${k === c.status ? ' selected' : ''}>${l}</option>`).join('')}</select>` : stPill(c.status)}${ed.has(`concerns.${i}.status`) ? '<span class="pill watch" title="Chuyên viên đổi trạng thái">đã đổi</span>' : ''}</div>
    ${f(`concerns.${i}.note`, c.note, 'div', 'qnote')}
    ${c.change || E ? `<p class="qchg"><b>So với bản trước:</b> ${f(`concerns.${i}.change`, c.change || '')}</p>` : ''}
    <div class="grid ${qCharts(c).length > 1 ? 'g2' : ''} gap">${qCharts(c).map((g, j) => SPEC[g.id] ? `
      <article class="card qchart"><h3 class="sub">${esc(g.title || cardMeta(SPEC[g.id].el).title)}</h3>
        ${chartBox(g.id, `qu-${i}-${j}-${g.id}`, g.h || '')}
        ${g.caption || E ? f(`concerns.${i}.charts.${j}.caption`, g.caption || '', 'p', 'qcap') : ''}
        ${(m => (m.sub ? `<p class="chart-sub" hidden>${m.sub}</p>` : '') + (m.insight ? `<div class="insight">${m.insight}</div>` : '') + (m.src ? `<div class="src">${/^Nguồn/.test(m.src) ? '' : 'Nguồn: '}${m.src}</div>` : ''))(cardMeta(SPEC[g.id].el))}
        <div class="qfoot"><span>Chart book: <code>${g.id}</code>${g.last ? ` · ${g.last} điểm gần nhất` : ''}</span><button type="button" class="lnk" data-book="${g.id}">Mở trong Chart book →</button></div>
      </article>` : `<article class="card"><p class="muted">Chart <code>${esc(g.id)}</code> không còn trong dashboard.</p></article>`).join('')}</div>
  </section>`).join('')}
  ${u.watch && u.watch.length ? `<article class="card"><h3 class="sub">Theo dõi tiếp</h3><div class="tscroll"><table><thead><tr><th>Ngày</th><th>Sự kiện</th><th>Vì sao quan trọng</th></tr></thead><tbody>
    ${u.watch.map((w, k) => `<tr><td style="white-space:nowrap">${dvn(w.d)}</td><td><b>${esc(w.t)}</b></td><td>${f(`watch.${k}.why`, esc(w.why))}</td></tr>`).join('')}</tbody></table></div></article>` : ''}
  ${u.sources && u.sources.length ? `<p class="qsrc">Nguồn: ${u.sources.map(esc).join(' · ')}</p>` : ''}
  <article class="card pdf-hide qhist-card"><h3 class="sub">Lịch sử cập nhật</h3>
    <div class="tscroll"><table class="qhist"><thead><tr><th>Ngày</th><th>Người cập nhật</th><th>Nội dung chính</th><th></th></tr></thead><tbody>
    ${U.map((x, k) => `<tr class="${k === quSel ? 'hl' : ''}"><td style="white-space:nowrap">${dvn(x.date)}${x._draft ? ' <span class="pill watch">nháp</span>' : ''}</td><td>${byLine(x.author)}</td><td>${esc(x.headline)}${x.edited && x.edited.length ? ` <span class="muted">· sửa ${x.edited.length} chỗ</span>` : ''}</td><td>${k === quSel ? 'đang xem' : `<button type="button" class="lnk" data-qv="${k}">Xem</button>`}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="note keep">Cách cập nhật: (1) chuyên viên bấm <b>✎ Chỉnh sửa</b> để sửa vài đoạn của bản đang xem → lưu thành bản mới mang tên mình (đoạn đã sửa có vạch vàng); hoặc (2) nhắn AI <i>"Cập nhật nhanh ngành ngân hàng"</i> — AI đọc các bản trước, ưu tiên bản gần nhất của chuyên viên, rồi viết tiếp.</p>
  </article>`;
  u.concerns.forEach((c, i) => qCharts(c).forEach((g, j) => drawSpec(g.id, `qu-${i}-${j}-${g.id}`, g.last, { win: g.win, marks: g.marks })));
  if (!E) $$('#quick section.qc > .qc-h').forEach(h => { h.classList.add('coll'); h.title = 'Bấm để thu gọn / mở'; h.onclick = e => { if (e.target.closest('select,[contenteditable]')) return; h.parentElement.classList.toggle('qshut'); }; });
  $$('#quick [data-qv]').forEach(b => b.onclick = () => { quSel = +b.dataset.qv; quEdit = false; paneQuick(); window.scrollTo({ top: 0 }); });
  $$('#quick [data-book]').forEach(b => b.onclick = () => openBook(b.dataset.book));
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  on('quEditBtn', () => { quEdit = true; paneQuick(); });
  on('quPdf', quPdf);
  on('quCheck', () => {
    const ch = [];
    $$('#quick [data-f][contenteditable]').forEach(el => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const r = vcCheck(n.nodeValue); if (r.changes.length) { n.nodeValue = r.text; ch.push(...r.changes); } } });
    const hint = $('#quick .qhint');
    if (hint) hint.innerHTML = ch.length ? `<b>Đã sửa ${ch.length} chỗ:</b> ${ch.map(c => `“${esc(c.from)}” → “${esc(c.to)}”`).join(' · ')}. Kiểm tra lại rồi bấm "Lưu thành bản mới".` : 'Không thấy lỗi thiếu dấu hay thuật ngữ tiếng Anh nào trong từ điển.';
  });
  on('quCancel', () => { quEdit = false; paneQuick(); });
  on('quSave', () => {
    const nu = JSON.parse(JSON.stringify(u)); delete nu._draft;
    const changed = [];
    const plain = k => /^headline$|title$|why$/.test(k);
    const canon = (k, x) => { const t = document.createElement('div'); t.innerHTML = plain(k) ? esc(x) : x; return cleanHTML(t); };
    $$('#quick [data-f]').forEach(el => { const k = el.dataset.f, v = cleanHTML(el), old = gp(u, k) || '';
      if (v !== canon(k, old)) { spath(nu, k, plain(k) ? el.textContent.replace(/\s+/g, ' ').trim() : v); changed.push(k); } });
    $$('#quick [data-st]').forEach(sel => { const i = +sel.dataset.st; if (sel.value !== u.concerns[i].status) { nu.concerns[i].status = sel.value; changed.push(`concerns.${i}.status`); } });
    if (!changed.length) { quEdit = false; paneQuick(); return; }
    const name = ($('#quWho').value || 'Chuyên viên').trim(); try { localStorage.setItem('quWho', name); } catch (e) {}
    const today = new Date(), iso = new Date(today.getTime() - today.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    const base = u._draft ? (u.follows ? U.find(x => x.id === u.follows) || u : u) : u;
    const titles = [...new Set(changed.map(k => k.startsWith('concerns.') ? `mục ${+k.split('.')[1] + 1}` : k.startsWith('summary') ? 'tóm tắt' : k.startsWith('watch') ? 'theo dõi tiếp' : 'tiêu đề'))];
    Object.assign(nu, { id: `QU-${iso}-CV-${Date.now() % 100000}`, date: iso, author: { type: 'Chuyên viên', name },
      follows: base.id, vsPrev: `chuyên viên ${name} chỉnh ${changed.length} chỗ (${titles.join(', ')}); phần còn lại giữ nguyên bản ${dvn(base.date)}.`,
      edited: [...new Set([...(u._draft ? u.edited || [] : []), ...changed])] });
    try { localStorage.setItem(QD_KEY, JSON.stringify(nu)); } catch (e) {}
    quEdit = false; quSel = 0; paneQuick(); window.scrollTo({ top: 0 });
  });
  on('quDrop', () => { try { localStorage.removeItem(QD_KEY); } catch (e) {} quSel = 0; paneQuick(); });
  on('quCopy', () => {
    const d = Object.assign({}, u); delete d._draft; const txt = 'Đăng bản cập nhật nhanh này lên dashboard ngành:\n' + JSON.stringify(d, null, 1);
    const ta = $('#quJson'); ta.value = txt;
    const done = ok => { $('#quMsg').textContent = ok ? ' Đã sao chép — dán vào chat với AI.' : ' Trình duyệt chặn sao chép: chọn toàn bộ ô bên dưới rồi Ctrl+C.'; if (!ok) { ta.hidden = false; ta.select(); } };
    (navigator.clipboard ? navigator.clipboard.writeText(txt).then(() => done(true), () => done(false)) : done(false));
  });
}

/* =====================================================================
   TAB · CHART BOOK — mọi chart của dashboard, vẽ lại từ cấu hình đã lưu
===================================================================== */
const bookF = { g: '', q: '' };
let bookObs = null;
function paneBook() {
  buildAll();
  const ids = Object.keys(SPEC), M = Object.fromEntries(ids.map(id => [id, cardMeta(SPEC[id].el)]));
  const groups = [...new Set(ids.map(id => M[id].group))];
  $('#book').innerHTML = `
  <h2 class="sec">Chart book</h2>
  <p class="sec-sub">${ids.length} chart của dashboard ở một chỗ, luôn theo dữ liệu mới nhất. Mã chart (vd. <code>chOn</code>) dùng để gọi trong Nhật ký chuyên viên hoặc nhắn AI.</p>
  <div class="picker" id="bkG"><button type="button" data-k="">Tất cả <small>${ids.length}</small></button>${groups.map(g => `<button type="button" data-k="${g}">${g} <small>${ids.filter(id => M[id].group === g).length}</small></button>`).join('')}</div>
  <div class="bk-bar"><input id="bkQ" type="search" placeholder="Tìm chart: tỷ giá, LNH, NIM, P/B…" aria-label="Tìm chart"><span class="muted">Mỗi chart có nút 1M…5Y và kéo chuột để zoom; nhấp đúp để về toàn bộ.</span></div>
  <div class="grid g2 gap" id="bkGrid">${ids.map(id => { const m = M[id]; return `
    <article class="card bk" data-id="${id}" data-g="${esc(m.group)}" data-s="${esc((m.title + ' ' + id + ' ' + m.group + ' ' + m.sub.replace(/<[^>]+>/g, '')).toLowerCase())}">
      <h3 class="sub">${esc(m.title)}</h3>${m.sub ? `<p class="chart-sub">${m.sub}</p>` : ''}
      ${chartBox(id, 'cb-' + id)}
      ${m.insight ? `<div class="insight">${m.insight}</div>` : ''}${m.src ? `<div class="src">${m.src.startsWith('Nguồn') ? '' : 'Nguồn: '}${m.src}</div>` : ''}
      <div class="qfoot"><span><code>${id}</code> · ${esc(m.group)}</span>${m.cc === 'gl' ? '' : `<button type="button" class="lnk" data-go="${m.pane}" data-sp="${m.sp}" data-cc="${m.cc || ''}">Xem ở tab gốc →</button>`}</div>
    </article>`; }).join('')}</div>`;
  const drawn = new Set();
  const draw = c => { const id = c.dataset.id; drawSpec(id, 'cb-' + id); drawn.add(id); };
  if (bookObs) bookObs.disconnect();
  bookObs = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !drawn.has(e.target.dataset.id)) draw(e.target); }), { rootMargin: '300px' }) : null;
  const apply = () => {
    $$('#bkG button').forEach(b => b.classList.toggle('on', b.dataset.k === bookF.g));
    $$('#bkGrid .bk').forEach(c => { c.hidden = !((!bookF.g || c.dataset.g === bookF.g) && (!bookF.q || c.dataset.s.includes(bookF.q))); });
  };
  $$('#bkGrid .bk:not([data-tb])').forEach(c => bookObs ? bookObs.observe(c) : draw(c));
  $$('#bkG button').forEach(b => b.onclick = () => { bookF.g = b.dataset.k; apply(); });
  $('#bkQ').oninput = e => { bookF.q = e.target.value.trim().toLowerCase(); apply(); };
  $$('#bkGrid [data-go]').forEach(b => b.onclick = () => { if (b.dataset.go === 'vmx') { location.href = 'vimo.html#' + (b.dataset.sp || ''); return; } if (b.dataset.cc === 'gl' && PAGE === 'vimo') { show('heat'); return; } show(b.dataset.go); if (b.dataset.sp) openP(b.dataset.sp); if (b.dataset.cc) openC(b.dataset.cc); const t = SPEC[b.closest('.bk').dataset.id].el; setTimeout(() => t.scrollIntoView({ block: 'center' }), 60); });
  apply();
}
function openBook(id) {
  show('book'); bookF.g = ''; bookF.q = id.toLowerCase(); const q = $('#bkQ'); if (q) { q.value = id; q.dispatchEvent(new Event('input')); }
  window.scrollTo({ top: 0 });
}

/* =====================================================================
   FOOTER, ĐIỀU HƯỚNG, CHẾ ĐỘ GỌN
===================================================================== */
function footer() {
  $('#foot').innerHTML = `<div>FinSuccess · ${PAGE === 'vimo' ? 'Dashboard Vĩ mô' : 'Dashboard CSTT &amp; ngành Ngân hàng'} · dữ liệu cập nhật ${dvn(TODAY)}. Không phải khuyến nghị đầu tư.</div>`;
}
const builders = PAGE === 'vimo' ? { heat: paneHeat, vn: paneVN, world: paneWorld, cmd: paneCmd, quick: paneQuick, book: paneBook, src: paneSrc }
  : { overview: paneOverview, quick: paneQuick, picture: panePicture, policy: panePolicy, catalyst: paneCatalyst, cons: paneCons, hot: paneHot, book: paneBook, src: paneSrc };
const built = {};
function show(k) {
  if (!builders[k]) k = Object.keys(builders)[0];
  $$('#tabbar button').forEach(b => { const on = b.dataset.tab === k; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
  $$('.pane').forEach(p => p.classList.toggle('active', p.id === k));
  if (!built[k]) { built[k] = true; builders[k](); }
  try { history.replaceState(null, '', '#' + k); } catch (e) {}
}
$$('#tabbar button').forEach(b => b.onclick = () => { show(b.dataset.tab); window.scrollTo({ top: 0 }); });
/* ---------- chế độ Gọn / Chi tiết + nút (i) ---------- */
const UI_KEY = 'fs-bank-ui';
function setMode(m) {
  document.body.classList.toggle('compact', m === 'compact');
  $$('#modeSw button').forEach(b => { const on = b.dataset.mode === m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  try { localStorage.setItem(UI_KEY, m); } catch (e) {}
  hideTip();
}
function decorate() {
  $$('article.card').forEach(c => {
    if (c.dataset.i) return;
    const h = c.querySelector(':scope > h3.sub'); if (!h) return;
    c.dataset.i = '1';
    if (c.querySelector(':scope > .chart-sub')) {   // (i) cạnh tiêu đề = mô tả chart
      const b = document.createElement('button'); b.type = 'button'; b.className = 'info'; b.dataset.k = 'sub'; b.textContent = 'i'; b.setAttribute('aria-label', 'Mô tả');
      const ctl = h.querySelector('.ctl'); ctl ? h.insertBefore(b, ctl) : h.appendChild(b);
    }
    const hasIns = c.querySelector(':scope > .insight, :scope > .note:not(.keep)'), hasSrc = c.querySelector(':scope > .src');
    if (hasIns || hasSrc) {   // nút Insight / Nguồn cuối thẻ (chế độ Gọn)
      const row = document.createElement('div'); row.className = 'ibar';
      row.innerHTML = (hasIns ? '<button type="button" class="ipill" data-k="ins">ⓘ Insight</button>' : '') + (hasSrc ? '<button type="button" class="ipill" data-k="src">ⓘ Nguồn</button>' : '');
      c.appendChild(row);
    }
  });
}
const tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.appendChild(tip);
let tipFor = null;
function tipHtml(b) {
  if (b.dataset.k === 'txt') return b.dataset.t || '';
  const c = b.closest('.card'), k = b.dataset.k;
  const part = sel => [...c.querySelectorAll(':scope > ' + sel)].map(e => e.innerHTML);
  const title = esc((c.querySelector(':scope > h3.sub').childNodes[0] || {}).textContent || '');
  if (k === 'sub') return part('.chart-sub').map(t => `<p>${t}</p>`).join('');
  if (k === 'src') return `<h5>${title} · Nguồn</h5>` + part('.src').map(t => `<p class="ts">${t}</p>`).join('');
  return `<h5>${title}</h5>` + part('.insight').map(t => `<p class="ti">${t}</p>`).join('') + part('.note:not(.keep)').map(t => `<p class="tn">${t}</p>`).join('');
}
function showTip(b) {
  tipFor = b; tip.className = 'tip ' + (b.dataset.k === 'sub' ? 'dark' : 'light'); tip.innerHTML = tipHtml(b); tip.hidden = false;
  const r = b.getBoundingClientRect(), w = tip.offsetWidth, hh = tip.offsetHeight;
  let left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
  let top = r.bottom + 8; if (top + hh > innerHeight - 8 && r.top - hh - 8 > 8) top = r.top - hh - 8;
  tip.style.left = left + 'px'; tip.style.top = top + 'px';
}
function hideTip() { tip.hidden = true; tipFor = null; }
document.addEventListener('mouseover', e => { const b = e.target.closest('.info,.ipill'); if (b && b !== tipFor && matchMedia('(hover:hover)').matches) showTip(b); });
document.addEventListener('mouseout', e => { const b = e.target.closest('.info,.ipill'); if (b && matchMedia('(hover:hover)').matches && !b.contains(e.relatedTarget)) hideTip(); });
document.addEventListener('click', e => { const b = e.target.closest('.info,.ipill'); if (b) { e.stopPropagation(); b === tipFor && !matchMedia('(hover:hover)').matches ? hideTip() : showTip(b); } else if (!e.target.closest('.tip')) hideTip(); });
document.addEventListener('focusin', e => { if (e.target.closest && e.target.closest('.info,.ipill')) showTip(e.target.closest('.info,.ipill')); });
document.addEventListener('focusout', e => { if (e.target.closest && e.target.closest('.info,.ipill')) hideTip(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
addEventListener('scroll', hideTip, { passive: true }); addEventListener('resize', hideTip);
new MutationObserver(() => requestAnimationFrame(decorate)).observe(document.querySelector('main'), { childList: true, subtree: true });
$$('#modeSw button').forEach(b => b.onclick = () => setMode(b.dataset.mode));
const mode0 = 'compact';   // chỉ dùng bản gọn
setMode(mode0);

header(); footer();
{ const h = (location.hash || '#').slice(1); if (P2PANE[h]) openP(h); else if (h === 'gl' && PAGE === 'vimo') show('heat'); else show(h); }
decorate();
try { history.scrollRestoration = 'manual'; } catch (e) {}
scrollTo(0, 0); addEventListener('load', () => setTimeout(() => scrollTo(0, 0), 0));
window.FSNAV = { show, openP, openC,
  reveal(lk) {   // lịch kinh tế: mở đúng tab/mục chứa chart
    if (lk.c === 'gl' && PAGE === 'vimo') { show('heat'); return; }
    const el = document.getElementById(lk.id), pp = el && el.closest('[data-pp]'), k = pp && P2PANE[pp.dataset.pp] ? pp.dataset.pp : lk.p;
    openP(k); if (lk.c) openC(lk.c);
  } };
window.FSSHARE = {   // cho hộp chia sẻ ảnh: dựng tab ẩn để chọn được mọi chart, và đường dẫn tab › tab con của từng chart
  prep: buildAll,
  path(card) {
    const pane = card.closest('.pane'), pp = card.closest('[data-pp]'), cc = card.closest('[data-cc]');
    const tb = pane && document.querySelector(`#tabbar [data-tab="${pane.id}"]`), top = tb ? tb.textContent.trim().replace(/^\d+\.\s*/, '') : '';
    const mid = pp ? PANE_LBL[pp.dataset.pp] : '';
    const leaf = cc ? (cc.dataset.cc === 'gl' ? 'Toàn cầu' : (GCOUNTRY.find(x => x[0] === cc.dataset.cc) || ['', ''])[1]) : '';
    return [top, mid, leaf].filter(Boolean);
  }
};   // cho lịch kinh tế đi tới chart liên quan
})();
