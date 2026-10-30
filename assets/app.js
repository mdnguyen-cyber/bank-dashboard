/* Bank Tracker — renderer dùng chung cho các trang ngân hàng. Dữ liệu: window.PVS_DATA (data/<mã>-data.js, sinh từ Wi MCP).
   Quy ước: lời đọc (insight) do AI viết theo số đang hiển thị; quan điểm analyst chỉ nằm ở tab FinSuccess
   và lưu trên trình duyệt (localStorage) — chưa đồng bộ server. */
(function () {
'use strict';
const D = window.PVS_DATA;
const C = { navy: '#002060', blue: '#97BAFF', teal: '#59C5C8', purple: '#861C52', gold: '#FFD45D', red: '#c0392b', grey: '#9aa3b2',
  steps: ['#002060', '#3D5C99', '#5576B8', '#6171C5', '#8997D6', '#B3BDE8', '#D9DEF4'] };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nf = (v, d = 0) => v == null || isNaN(v) ? '—' : Number(v).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });
const pc = (v, d = 1) => v == null ? '—' : nf(v, d) + '%';
const sg = (v, d = 1, u = '%') => v == null ? '—' : (v > 0 ? '+' : '') + nf(v, d) + u;
const x = (v, d = 2) => v == null ? '—' : nf(v, d) + 'x';
const r100 = v => v == null ? '—' : nf(Math.round(v / 100) * 100);
const dvn = s => s ? s.slice(0, 10).split('-').reverse().join('/') : '—';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const Q = D.quarterly, QL = Q[Q.length - 1], QP = Q[Q.length - 2];
const M = D.meta, CS = D.consensus, FW = CS.fwd, VB = D.valuation;
const TODAY = M.updated;
const T = M.ticker, NR = D.narr || {}, GRP = M.peerGroup || 'Big 4', BIG = GRP === 'Big 4';
const LTK = BIG ? ['VCB', 'BID', 'CTG'] : GRP === 'Tư nhân lớn' ? (['TCB', 'MBB', 'ACB'].includes(T) ? ['TCB', 'MBB', 'ACB'] : [T, 'TCB', 'MBB', 'ACB']) : [T, 'TCB', 'MBB', 'ACB'];   // nhóm có chuỗi dài hạn (data/big3-data.js); NH ngoài 2 nhóm so với nhóm tư nhân lớn
const big4 = () => (D.peers.rows || []).filter(r => r.group === 'Big 4');
const rankIn = (rows, k, me, desc = true) => { const s = rows.filter(r => r[k] != null).sort((a, b) => desc ? b[k] - a[k] : a[k] - b[k]); const i = s.findIndex(r => (r.symbol || r.s) === me); return i < 0 ? null : { i: i + 1, n: s.length }; };
const maxIn = (k, n) => Math.max(...lastN(Q, n).map(q => q[k]).filter(v => v != null));
const minIn = (k, n) => Math.min(...lastN(Q, n).map(q => q[k]).filter(v => v != null));
const depB = D.macro.rates.dep12Bank;

/* ---------- storage (per-viewer) ---------- */
const KEY = 'fs-bank-' + M.ticker;
const store = {
  get() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } },
  set(o) { try { localStorage.setItem(KEY, JSON.stringify(Object.assign(store.get(), o))); return true; } catch (e) { return false; } },
};

/* ---------- Chart.js defaults + reference-line plugin ---------- */
Chart.defaults.font.family = 'Arial, "Helvetica Neue", sans-serif';
Chart.defaults.font.size = 11.5;
Chart.defaults.color = '#3f4656';
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.legend.position = 'bottom';
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.animation = false;
Chart.defaults.plugins.tooltip.callbacks.label = ctx => {
  const v = ctx.chart.options.indexAxis === 'y' ? ctx.parsed.x : (ctx.parsed.y ?? ctx.parsed.x); const ds = ctx.dataset;
  if (Array.isArray(ctx.raw)) return `${ds.label}: ${nf(ctx.raw[1] - ctx.raw[0], ds.dp ?? 0)}${ds.unit || ''}`;
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
Chart.register(refLines);

const charts = {};
function mk(id, cfg, opt = {}) {
  const el = document.getElementById(id); if (!el) return;
  if (charts[id]) charts[id].destroy();
  cfg.options = cfg.options || {};
  cfg.options.interaction = cfg.options.interaction || { mode: 'index', intersect: false, axis: cfg.options.indexAxis === 'y' ? 'y' : 'x' };
  { const rl = ((cfg.options.plugins || {}).refLines || {}).lines;   // đường dọc có nhãn: chừa khoảng trắng phía trên cho nhãn
    if (rl && rl.some(l => l.label && /^x/.test(l.axis || 'y'))) { const L = cfg.options.layout = cfg.options.layout || {}, pd = L.padding; L.padding = typeof pd === 'number' ? { top: Math.max(pd, 18), right: pd, bottom: pd, left: pd } : Object.assign({}, pd || {}, { top: Math.max((pd || {}).top || 0, 18) }); } }
  FSK.prep(cfg);
  charts[id] = new Chart(el, cfg);
  FSK.enhance(charts[id], { today: new Date(TODAY), last: opt.last, anchor: opt.anchor, win: opt.win ?? (el.closest('#fin') ? 60 : undefined) });
  charts[id]._base = JSON.parse(JSON.stringify(cfg.data.datasets.map(d => d.type || cfg.type)));
  if (opt.switch) {
    const box = document.querySelector(`[data-ctl="${id}"]`);
    if (box) {
      box.innerHTML = [['bar', 'Cột'], ['line', 'Đường']].map(([t, l]) => `<button type="button" data-t="${t}">${l}</button>`).join('');
      const set = t => {
        const ch = charts[id];
        ch.data.datasets.forEach((d, i) => { if (!d.keep) { d.type = t; d.fill = false; d.pointRadius = t === 'line' ? 2 : 0; } });
        (ch.options.scales.x = ch.options.scales.x || {}).offset = ch.data.datasets.some(d => (d.type || ch.config.type) === 'bar'); const bz = ch.$bz0 || (ch.$bz0 = Object.fromEntries(Object.entries(ch.config.options.scales || {}).map(([k, sc]) => [k, !!sc.beginAtZero]))); Object.keys(bz).forEach(k => { const sc = ch.config.options.scales[k]; if (k[0] === 'y' && !sc.stacked) sc.beginAtZero = t === 'bar' ? true : bz[k]; }); FSK.reorder(ch); ch.update(); $$('button', box).forEach(b => b.classList.toggle('on', b.dataset.t === t));
      };
      $$('button', box).forEach(b => b.onclick = () => set(b.dataset.t));
      $$('button', box).forEach(b => b.classList.toggle('on', b.dataset.t === opt.switch));
    }
  }
  return charts[id];
}
const pctAxis = (title, extra = {}) => Object.assign({ ticks: { callback: v => nf(v, 1) + '%' }, title: title ? { display: true, text: title } : undefined, grid: { color: '#eef0f4' } }, extra);
const numAxis = (title, extra = {}) => Object.assign({ ticks: { callback: v => nf(v, 0) }, title: title ? { display: true, text: title } : undefined, grid: { color: '#eef0f4' } }, extra);
const on3 = arr => { const end = arr[arr.length - 1].d, from = new Date(new Date(end).getTime() - 92 * 864e5).toISOString().slice(0, 10); return arr.filter(p => p.d >= from).map(p => p.v); };
const lastN = (arr, n) => arr.slice(Math.max(0, arr.length - n));
// tab Tài chính: chart quý nhận toàn bộ lịch sử; khung mặc định 5 năm, đổi bằng nút khung thời gian của từng chart
const win = arr => arr;
const yok = () => true;

/* ---------- card templates ---------- */

/* ---------- Tài chính: các trụ phân tích sâu ---------- */
const AQ = lbl => { const X = D.ctx; if (!X) return () => null; return (m, g) => { const i = X.quarters.indexOf(lbl); return i < 0 || !X.agg[m] ? null : X.agg[m][g][i]; }; };
const yoyQ = (k, i = Q.length - 1) => i >= 4 && Q[i][k] && Q[i - 4][k] ? (Q[i][k] / Q[i - 4][k] - 1) * 100 : null;
function nimPeerIns() {
  const a = AQ(QL.q), b = AQ(Q[Q.length - 5].q);
  const lo = QL.cof < a('cof', 'all');
  return `NIM ${T} <b>${pc(QL.nim, 2)}</b> so với ${GRP} <b>${pc(a('nim', GRP), 2)}</b> và ngành ${pc(a('nim', 'all'), 2)}; một năm trước ${pc(Q[Q.length - 5].nim, 2)} / ${pc(b('nim', GRP), 2)} / ${pc(b('nim', 'all'), 2)}. COF ${T} ${pc(QL.cof, 2)} ${lo ? 'thấp hơn' : 'cao hơn'} ngành (${pc(a('cof', 'all'), 2)})${lo ? ' nhờ CASA và tiền gửi Kho bạc' : ''}; CASA ${QL.casa >= QP.casa ? 'tăng' : 'giảm'} ${pc(QP.casa)} → ${pc(QL.casa)} trong quý${lo && QL.casa < QP.casa ? ' — lợi thế chi phí vốn thu hẹp dần' : ''}.`;
}
function gapIns() {
  const g = QL.irGap; if (g == null) return 'Chưa có số khe hở lãi suất.';
  const qs = Q.filter(q => q.irGap != null), r = q => q.irGap / q.ta * 100, now = r(QL), avg = qs.reduce((a, q) => a + r(q), 0) / qs.length;
  const lo = qs.reduce((m, q) => r(q) < r(m) ? q : m, qs[0]);
  return `Khe hở ≤ 12 tháng <b>${pc(now)} tổng tài sản</b> (${sg(g / 1000, 1, ' nghìn tỷ')}, ${QL.q}), so với bình quân ${pc(avg)} từ ${qs[0].q} và mức âm sâu nhất ${pc(r(lo))} (${lo.q}). ${g < 0 ? 'Âm: nợ định giá lại nhanh hơn tài sản — lãi suất huy động giảm thì chi phí vốn giảm trước, nhưng chỉ đạo giảm lãi suất cho vay tác động thẳng vào phía tài sản.' : 'Dương: tài sản định giá lại nhanh hơn nợ — giảm lãi suất cho vay ăn vào NIM ngay.'}`;
}
function formIns() {
  const qf = Q.filter(q => q.nplFormation != null), L = qf[qf.length - 1], t4 = lastN(qf, 4), p4 = qf.slice(-8, -4);
  const sum = a => a.reduce((x, q) => x + q.nplFormation, 0), avgR = a => a.reduce((x, q) => x + q.nplFormationRate, 0) / a.length;
  const act = L.writeOffAct != null, wo = act ? L.writeOffAct : L.writeOffEst;
  return `${L.q}: hình thành nợ xấu ròng <b>${nf(L.nplFormation)}</b> tỷ (<b>${pc(L.nplFormationRate, 2)}</b> dư nợ quy năm), trong đó nợ xử lý bằng dự phòng ${nf(wo)} tỷ (${act ? 'số thực tế theo thuyết minh' : 'ước tính'}). Cộng 4 quý gần nhất <b>${nf(sum(t4))}</b> tỷ, bình quân <b>${pc(avgR(t4), 2)}</b>/năm${p4.length === 4 ? ` so với ${nf(sum(p4))} tỷ (${pc(avgR(p4), 2)}) của 4 quý trước đó` : ''}. Số từng quý dao động mạnh vì xử lý nợ thường dồn vào cuối năm và phụ thuộc thu hồi, nâng nhóm — nên đọc theo tổng 4 quý.${D.writeOffSrc && Q.some(q => q.writeOffAct != null) ? ` Ở các kỳ có thuyết minh, nợ xử lý ước tính chênh số thực tế trung vị ${nf((a => a[Math.floor(a.length / 2)])(Q.filter(q => q.writeOffAct != null && q.writeOffEst != null).map(q => Math.abs(q.writeOffEst - q.writeOffAct)).sort((a, b) => a - b)))} tỷ/quý, nên các quý chưa có thuyết minh dùng số ước tính vẫn tin được.` : ''} ${NR.nplFormCheck || ''}`;
}
function accrIns() {
  const a = yoyQ('accrued'), l = yoyQ('loansGross');
  const n = Q.length - 1, q4 = Q[n - 4], nplTxt = QL.npl != null && q4 && q4.npl != null ? (() => {
    const r0 = q4.accrued / q4.loansGross * 100, r1 = QL.accrued / QL.loansGross * 100, dn = QL.npl - q4.npl, dr = r1 - r0;
    return ` Tỷ lệ nợ xấu <b>${pc(QL.npl, 2)}</b> (${QL.q}) so với ${pc(q4.npl, 2)} cùng kỳ; lãi phải thu / dư nợ ${pc(r0, 2)} → ${pc(r1, 2)}${dr > 0.03 && dn > 0.05 ? ' — cả hai cùng tăng: rủi ro tín dụng đang lộ ra' : dr > 0.03 && dn <= 0.05 ? ' — lãi dự thu tăng nhưng NPL chưa tăng: cần theo dõi, có thể là nợ xấu tiềm ẩn chưa phân loại' : dr <= 0.03 && dn > 0.05 ? ' — NPL tăng trong khi lãi dự thu không tăng thêm' : ' — chưa thấy dấu hiệu xấu đi'}.`; })() : '';
  return `Lãi, phí phải thu <b>${nf(QL.accrued / 1000, 1)} nghìn tỷ</b> = ${pc(QL.accrued / QL.loansGross * 100, 2)} dư nợ, tăng <b>${sg(a)}</b> YoY so với dư nợ ${sg(l)}. Lãi dự thu tăng nhanh hơn dư nợ nghĩa là một phần thu nhập lãi đã ghi nhận nhưng chưa thu được tiền — có thể là nợ khó đòi chưa phân loại. LLR nếu coi khoản này là nợ xấu: <b>${pc(QL.llrInclAccrued, 0)}</b> (LLR công bố ${pc(QL.llr, 0)}).${nplTxt}`;
}
function aqPeerIns() {
  const a = AQ(QL.q);
  return `${T}: NPL <b>${pc(QL.npl, 2)}</b>, nhóm 2 ${pc(QL.g2, 2)}; ${GRP}: ${pc(a('npl', GRP), 2)} / ${pc(a('g2', GRP), 2)}; ngành: ${pc(a('npl', 'all'), 2)} / ${pc(a('g2', 'all'), 2)}. Bao phủ ${T} ${pc(QL.llr, 0)} so với ${GRP} ${pc(a('llr', GRP), 0)}.`;
}
function nfiIns() {
  const o = Q[Q.length - 5];
  return `${QL.q}: dịch vụ <b>${nf(QL.nfi)}</b> tỷ (${sg((QL.nfi / o.nfi - 1) * 100)} YoY), ngoại hối ${nf(QL.fx)} tỷ, chứng khoán ${nf(QL.secInc)} tỷ, thu nhập khác ${nf(QL.otherInc)} tỷ (thu hồi nợ đã xử lý ${nf(QL.recoveries)} tỷ). Thu nhập khác phụ thuộc thu hồi nợ — không bền như phí dịch vụ.`;
}
function nfiShareIns() {
  const t = lastN(Q, 4), toi = t.reduce((a, q) => a + q.toi, 0), f = t.reduce((a, q) => a + q.nfi, 0), v = t.reduce((a, q) => a + q.fx + q.secInc + q.otherInc + (q.equityInc || 0), 0);
  return `4 quý gần nhất: phí dịch vụ <b>${pc(f / toi * 100)}</b> TOI, phần biến động (ngoại hối, chứng khoán, khác) ${pc(v / toi * 100)}. Thu nhập lãi vẫn chiếm ${pc((toi - f - v) / toi * 100)} — NIM bị ép thì phí dịch vụ chưa đủ lớn để bù.`;
}
function goFin(sub, cardId) {
  sub = FIN_OLD[sub] || sub;
  if (sub === 'fsval') { show('val'); } else { show('fin'); const b = $(`#fin .subtabs button[data-sub="${sub}"]`); if (b) b.click(); }
  setTimeout(() => { const el = document.getElementById(cardId); const a = el && el.closest('article'); if (a) { a.scrollIntoView({ behavior: 'smooth', block: 'start' }); a.classList.add('flash'); setTimeout(() => a.classList.remove('flash'), 1600); } }, 120);
}

/* Thu nhập dịch vụ theo mảng (thuyết minh năm) */
const FEE_COL = { pay: '#002060', ins: '#59C5C8', trust: '#861C52', sec: '#9a7400', adv: '#97BAFF', cash: '#9aa3b2', oth: '#FFD45D' };
function feeCard() {
  const F = D.fee, T = F.table, rows = T.rows.filter(r => r.k === '_tot' || r.inc > 0);
  const top = rows.filter(r => r.k !== '_tot' && r.incYoY != null).sort((a, b) => b.incYoY - a.incYoY)[0];
  const big = rows.filter(r => r.k !== '_tot').sort((a, b) => (b.share || 0) - (a.share || 0))[0];
  const tot = rows.find(r => r.k === '_tot');
  const sg2 = v => v == null ? '—' : (v > 0 ? '+' : '') + nf(v, 1) + '%';
  return `<div class="grid g2 gap">${card({ id: 'chFee', title: 'Lãi thuần dịch vụ theo mảng', sub: 'tỷ đồng · năm · ròng = thu − chi của từng mảng (thuyết minh BCTC hợp nhất) · đổi sang tăng trưởng hoặc biên lợi nhuận bằng nút dưới chart', body: FSK.feePicker('chFee'),
      insight: `Năm ${T.year}: lãi thuần dịch vụ <b>${nf(tot.net)}</b> tỷ (${sg2(tot.netYoY)}), biên chung <b>${pc(tot.margin)}</b>. Mảng đóng góp lớn nhất là <b>${big.name}</b> (${pc(big.share, 0)} lãi thuần, biên ${pc(big.margin, 0)}); thu tăng nhanh nhất ở <b>${top.name}</b> (${sg2(top.incYoY)}).`,
      src: 'BCTC hợp nhất năm của ngân hàng (thuyết minh thu nhập, chi phí hoạt động dịch vụ)' })}
    <article class="card"><h3 class="sub">Thu phí theo mảng · năm ${T.year}</h3><p class="chart-sub">tỷ đồng · biên = lãi thuần / thu · tỷ trọng tính trên lãi thuần dịch vụ</p>
      <div class="tscroll"><table><thead><tr><th>Mảng</th><th class="n">Thu</th><th class="n">Thu YoY</th><th class="n">Lãi thuần</th><th class="n">Lãi thuần YoY</th><th class="n">Biên</th><th class="n">Tỷ trọng</th></tr></thead><tbody>
      ${rows.map(r => `<tr${r.k === '_tot' ? ' style="font-weight:700"' : ''}><td>${esc(r.name)}</td><td class="n">${nf(r.inc)}</td><td class="n">${sg2(r.incYoY)}</td><td class="n">${nf(r.net)}</td><td class="n">${sg2(r.netYoY)}</td><td class="n">${r.margin == null ? '—' : pc(r.margin, 0)}</td><td class="n">${r.share == null ? '—' : pc(r.share, 0)}</td></tr>`).join('')}
      </tbody></table></div><div class="src">Chi viễn thông và chi môi giới không tách được theo mảng, gộp vào "Khác".</div></article></div>`;
}
function drawFee() {
  const F = D.fee;
  FSK.wireFee('chFee', m => mk('chFee', FSK.feeCfg(F.series, Object.keys(F.series), F.lines, m, { noMargin: ['sec'], colors: FEE_COL, unit: ' tỷ' })));
}

/* ---- chart dùng chung giữa các tab: cùng thông tin thì cùng cách trình bày ---- */
function carCard(id) {
  const car = D.car[D.car.length - 1], prev = D.car[D.car.length - 3];
  return card({ id, title: 'CAR và tỷ lệ vốn cấp 1 (TT41)', sub: '% · bán niên và năm · đường ngang = mức tối thiểu 8% (CAR) và 6% (vốn cấp 1)', ctl: true,
    insight: `CAR <b>${pc(car.car, 2)}</b>, vốn cấp 1 <b>${pc(car.tier1, 2)}</b> (${esc(car.period)}) — cao hơn mức tối thiểu 8% <b>${nf(car.car - 8, 2)} điểm %</b>${carRankTxt()}. Tài sản rủi ro tín dụng tăng ${sg((car.rwaCredit / prev.rwaCredit - 1) * 100)} trong một năm, vốn tự có tăng ${sg((car.ownFunds / prev.ownFunds - 1) * 100)}: vốn phải tăng cùng nhịp tài sản thì CAR mới giữ được${NR.carWhy ? ' — ' + NR.carWhy : '.'}`,
    src: 'Báo cáo tỷ lệ an toàn vốn theo TT41 (bán niên, năm)' });
}
function carRankTxt() {
  const CP = D.carPeers, car = D.car[D.car.length - 1]; if (!CP) return '';
  const rows = CP.rows.filter(r => r.group === GRP); const me = rows.find(r => r.s === T);
  if (me && CP.period === car.period && rows.length >= 3) { const s = [...rows].sort((a, b) => b.car - a.car); const i = s.indexOf(me); return `; ${i === 0 ? 'cao nhất' : i === s.length - 1 ? 'thấp nhất' : 'đứng thứ ' + (i + 1)} trong nhóm ${GRP} (${s.map(r => r.s + ' ' + pc(r.car, 2)).join(', ')})`; }
  const oth = rows.filter(r => r.s !== T); const miss = (BIG ? ['VCB', 'BID', 'CTG'] : rows.map(r => r.s)).filter(s => !rows.find(r => r.s === s)); return oth.length ? `; cùng kỳ ${CP.period}: ${oth.map(r => r.s + ' ' + pc(r.car, 2)).join(', ')}${miss.length ? ' (' + miss.join(', ') + ' chưa công bố kỳ này)' : ''}` : '';
}
function drawCar(id) {
  mk(id, { type: 'bar', data: { labels: D.car.map(c => c.period), datasets: [
    { label: 'CAR', data: D.car.map(c => c.car), backgroundColor: C.navy, borderColor: C.navy, dp: 2, unit: '%' },
    { label: 'Vốn cấp 1', data: D.car.map(c => c.tier1), backgroundColor: C.teal, borderColor: C.teal, dp: 2, unit: '%' }] },
    options: { scales: { y: pctAxis('', { beginAtZero: true }) }, plugins: { refLines: { lines: [{ value: 8, label: 'CAR tối thiểu 8%', color: C.red }, { value: 6, label: 'Vốn cấp 1 tối thiểu 6%', color: C.gold }] } } } }, { switch: 'bar' });
}
function ldrCard(id) {
  const X = D.ctx;
  return card({ id, title: 'LDR theo quý so với trần và ngành', sub: '% · LDR theo công thức TT22 (tiền gửi Kho bạc tính theo hệ số) · đường đỏ = trần 85%', ctl: true,
    insight: `LDR <b>${pc(QL.ldr)}</b> (${QL.q}), ${QL.ldr <= 85 ? `còn <b>${nf(85 - QL.ldr, 1)} điểm %</b> tới trần 85%` : `cao hơn mốc 85% <b>${nf(QL.ldr - 85, 1)} điểm %</b> theo công thức của nguồn dữ liệu (tỷ lệ ngân hàng báo cáo NHNN có thể thấp hơn do khác cách tính nguồn vốn, khoản loại trừ)`}${X && X.agg && X.agg.ldr ? `; bình quân ${GRP} ${pc(AQ(QL.q)('ldr', GRP))}, ngành ${pc(AQ(QL.q)('ldr', 'all'))}` : ''}. Tín dụng tăng <b>${pc(QL.creditYoY)}</b> YoY trong khi huy động chỉ <b>${pc(QL.fundingYoY)}</b> — khoảng cách này thu hẹp dư địa LDR nhanh nhất. Từ Q3/2026 tiền gửi KBNN được tính 50% (thay 20%) — ${BIG ? 'Big 4 hưởng lợi nhiều nhất' : 'Big 4 hưởng lợi nhiều nhất, ' + T + ' ít hơn vì giữ ít tiền gửi KBNN'}; từ 1/12/2026 TT50 đổi cách tính (liên ngân hàng chỉ tính vị thế ròng).`,
    src: `BCTC hợp nhất, tỷ lệ LDR công bố; bình quân ${GRP} và ngành gia quyền theo dư nợ` });
}
function drawLdr(id) {
  const X = D.ctx, qr = Q.filter(q => q.ldr != null);
  mk(id, { type: 'line', data: { labels: qr.map(q => q.q), datasets: [
    { label: 'LDR ' + T, data: qr.map(q => q.ldr), borderColor: C.navy, backgroundColor: C.navy, dp: 1, unit: '%', borderWidth: 2.5 },
    ...(X ? [{ label: 'LDR ' + GRP, data: qr.map(q => AQ(q.q)('ldr', GRP)), borderColor: C.teal, backgroundColor: C.teal, dp: 1, unit: '%', spanGaps: true },
      { label: 'LDR ngành', data: qr.map(q => AQ(q.q)('ldr', 'all')), borderColor: C.grey, backgroundColor: C.grey, borderDash: [5, 4], dp: 1, unit: '%', spanGaps: true }] : [])] },
    options: { scales: { y: pctAxis() }, plugins: { refLines: { lines: [{ value: 85, label: 'Trần 85% (TT22)', color: C.red }] } } } }, { switch: 'line', win: 60 });
}
function card({ id, title, sub, insight, src, h = '', ctl = false, body = '', cls = '' }) {
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
const pill = (st) => ({ ok: '<span class="pill ok">Hỗ trợ</span>', holding: '<span class="pill ok">Giữ vững</span>', watch: '<span class="pill watch">Theo dõi</span>',
  risk: '<span class="pill risk">Rủi ro</span>', broken: '<span class="pill risk">Gãy</span>' }[st] || `<span class="pill">${st}</span>`);
const impact = i => i === '+' ? '<span class="imp p">+</span>' : i === '−' || i === '-' ? '<span class="imp m">−</span>' : i === '?' ? '<span class="imp z">?</span>' : '<span class="imp z">0</span>';

/* ---------- header ---------- */
function header() {
  const s = store.get(); const v = s.decision && s.decision.status;
  $('#stockHead').innerHTML = `<div class="tick">${M.ticker}</div>
    <div class="cname">${esc(M.name)}<small>${M.exchange} · Nhóm ${M.peerGroup} · BCTC mới nhất ${M.latestQuarter}</small></div>
    <div class="hstats">
      <div class="hstat"><span>Giá</span><b>${nf(M.price)}đ</b></div>
      <div class="hstat"><span>Vốn hóa</span><b>${nf(M.mcap)} tỷ</b></div>
      <div class="hstat"><span>P/B</span><b>${x(M.pb)}</b></div>
      <div class="hstat"><span>P/E TTM</span><b>${x(M.pe)}</b></div>
      <div class="view-chip ${v ? '' : 'none'}">${v ? esc(v).toUpperCase() : 'CHƯA NHẬP'}<small>QUAN ĐIỂM</small></div>
    </div>`;
  $('#stamp').textContent = `Giá ${dvn(M.priceDate)} · cập nhật dữ liệu ${dvn(M.updated)}`;
}

/* =====================================================================
   TAB 1 · TỔNG QUAN
===================================================================== */
function paneOverview() {
  const s = store.get(); const dec = s.decision || {};
  const tp = +dec.tp || null; const P = D.plan; const pb = VB.pbBand;
  const up = tp ? (tp / M.price - 1) * 100 : null;
  const car = D.car[D.car.length - 1];
  const recent = D.events.filter(e => { const dd = (new Date(TODAY) - new Date(e.d)) / 864e5; return dd <= 45 && dd >= -45; });
  const checks = checklist();
  $('#overview').innerHTML = `
  <h2 class="sec">Tổng quan</h2>
  <div class="banner"><b>Quyết định hiện tại của analyst:</b> ${dec.status ? esc(dec.status) + (dec.action ? ' · ' + esc(dec.action) : '') : 'chưa nhập — vào tab 💎 FinSuccess để ghi quyết định, giá mục tiêu và vùng mua.'}</div>
  <div class="kpis">
    ${kpi('Giá hiện tại', nf(M.price) + 'đ', 'đóng cửa ' + dvn(M.priceDate))}
    ${kpi('Upside vs TP của tôi', tp ? sg(up) : '—', tp ? 'TP ' + nf(tp) + 'đ' : 'chưa nhập TP', up > 0 ? 'pos' : up < 0 ? 'neg' : '')}
    ${kpi('Upside vs consensus', sg(CS.summary.upsideMedian), 'median TP ' + nf(CS.summary.median) + 'đ · ' + CS.summary.n + ' CTCK ≤ 3 tháng', 'pos')}
    ${kpi('P/B', x(M.pb), 'TB 5 năm ' + x(pb.mean) + ' · fwd ' + x(FW.pbFwd))}
    ${kpi('P/E TTM', x(M.pe), 'fwd 2026F ' + x(FW.peFwd) + ' · TB 5 năm ' + x(VB.peBand.mean))}
    ${P ? kpi('LNTT ' + P.ytdLabel, nf(P.pbtYTD) + ' tỷ', sg(P.pbtYTDyoy) + ' YoY · ' + pc(P.pbtDone) + ' KH ' + nf(P.pbt), 'pos') : ''}
  </div>
  <article class="card"><h3 class="sub">Thông tin doanh nghiệp</h3>
    <div class="facts">
      <div class="fact"><span>Vốn hóa</span><b>${nf(M.mcap)} tỷ</b><small>${dvn(M.priceDate)}</small></div>
      <div class="fact"><span>CP lưu hành</span><b>${nf(M.sharesOut, 1)} triệu</b><small>${D.lastStockDiv ? 'sau đợt cổ phiếu ' + nf(D.lastStockDiv.ratio, 1) + '% (' + dvn(D.lastStockDiv.ex).slice(3) + ')' : ''}</small></div>
      <div class="fact"><span>BVPS · EPS TTM</span><b>${nf(M.bvps)} · ${nf(M.eps)}đ</b><small>${M.ratioPeriod}</small></div>
      <div class="fact"><span>ROE · ROA</span><b>${pc(M.roe)} · ${pc(M.roa, 2)}</b><small>${M.ratioPeriod}</small></div>
      <div class="fact"><span>NIM · CIR</span><b>${pc(M.nim, 2)} · ${pc(M.cir)}</b><small>${M.ratioPeriod}</small></div>
      <div class="fact"><span>CASA</span><b>${pc(M.casa)}</b><small>${QL.q} (quý trước ${pc(QP.casa)})</small></div>
      <div class="fact"><span>NPL · LLR</span><b>${pc(M.npl, 2)} · ${pc(M.llr, 0)}</b><small>${QL.q}</small></div>
      <div class="fact"><span>CAR · LDR</span><b>${pc(car.car, 2)} · ${pc(QL.ldr)}</b><small>CAR ${car.period} (TT41) · LDR ${QL.q}</small></div>
    </div>
    <div class="src">Nguồn: ${esc(M.src)}; CAR từ báo cáo TT41 (bán niên/năm). LDR theo công thức Wi MCP (tiền gửi KBNN tính theo hệ số TT26/TT08).</div>
  </article>
  ${card({ id: 'chPrice', title: 'Giá cổ phiếu so với ngành ngân hàng và VN-Index', sub: `đ/CP · giá đóng cửa đã điều chỉnh · lịch sử từ ${dvn(D.price.series[0].d)} · đường ngang là đỉnh và đáy 52 tuần · chỉ số ngành và VN-Index quy về cùng điểm xuất phát với giá ${T} ở đầu khung đang xem (có từ ${dvn(D.price.series.find(p => p.s != null)?.d)}), nên khoảng cách giữa các đường là chênh lệch hiệu suất`, h: 'short',
    insight: `${perfTxt()} Giá hiện tại <b>${nf(M.price)}đ</b> thấp hơn đỉnh 52 tuần <b>${nf(D.price.high52.c)}đ</b> (${dvn(D.price.high52.d)}) <b>${sg((M.price / D.price.high52.c - 1) * 100)}</b> và cao hơn đáy <b>${nf(D.price.low52.c)}đ</b> (${dvn(D.price.low52.d)}) <b>${sg((M.price / D.price.low52.c - 1) * 100)}</b>. ${P ? `LNTT ${esc(P.ytdLabel)} ${P.pbtYTDyoy >= 0 ? 'tăng' : 'giảm'} ${sg(P.pbtYTDyoy)} YoY; ` : ''}P/B hiện tại ${x(M.pb)} ${M.pb < VB.pbBand.mean ? 'dưới' : 'trên'} trung bình 5 năm ${x(VB.pbBand.mean)}.`,
    src: D.price.src })}
  <article class="card"><h3 class="sub">Trạng thái 5 trụ luận điểm <span class="pill ai">AI · theo quy tắc</span></h3>
    <p class="chart-sub">${esc(D.thesisNote)} Analyst ghi đè trạng thái ở tab FinSuccess › Thesis.</p>
    <div class="pillars">${D.thesisPillars.map(p => { const o = (s.pillars || {})[p.id] || {}; return `<div class="pillar"><div class="st">${pill(o.status || p.status)}${o.status ? ' <span class="pill">analyst</span>' : ''}</div><small>${p.step}</small><h4>${esc(p.t)}</h4><p>${esc(p.evidence)}</p>${o.note ? `<p><b>Analyst:</b> ${esc(o.note)}</p>` : ''}${p.go ? `<button type="button" class="pgo" data-gofin="${p.go.sub}" data-card="${p.go.card}">Xem số liệu →</button>` : ''}</div>`; }).join('')}</div>
  </article>
  <div class="grid g2 gap">
    <article class="card"><h3 class="sub">Checklist điều kiện mua</h3><p class="chart-sub">Ngưỡng đề xuất theo khung 8 bước, analyst chỉnh ở tab FinSuccess. ✓ = đạt điều kiện.</p>
      <table><thead><tr><th>Điều kiện</th><th class="n">Hiện tại</th><th class="n">Ngưỡng</th><th></th></tr></thead><tbody>
      ${checks.map(c => `<tr><td>${c.l}</td><td class="n">${c.v}</td><td class="n">${c.t}</td><td>${c.ok ? '<span class="pill ok">✓</span>' : '<span class="pill risk">✗</span>'}</td></tr>`).join('')}
      </tbody></table><div class="note keep">Đạt ${checks.filter(c => c.ok).length}/${checks.length} điều kiện.</div></article>
    <article class="card"><h3 class="sub">Có gì mới ±45 ngày</h3><p class="chart-sub">Sự kiện đã diễn ra và sắp tới trong 45 ngày quanh ${dvn(TODAY)}</p>
      <table><tbody>${recent.slice(0, 10).map(e => `<tr><td style="white-space:nowrap">${dvn(e.d)}</td><td>${impact(e.impact)}</td><td>${esc(e.t)}${e.status === 'pending' ? ' <span class="pill pending">Chờ</span>' : ''}</td></tr>`).join('')}</tbody></table>
      <div class="note keep"><a href="#events" data-go="events">Xem toàn bộ Catalyst &amp; Sự kiện →</a></div></article>
  </div>
  ${govSection()}`;
  drawGov();
  const PS = D.price.series, st = PS.map(p => p.c);
  const firstOk = (r, i) => { while (i < r.length && (r[i] == null || st[i] == null)) i++; return i; };
  const rebase = { id: 'rebase', beforeUpdate(ch) {   // quy chỉ số về giá cổ phiếu tại đầu khung đang xem
    const lo = Math.max(0, Math.round((ch.options.scales.x || {}).min ?? 0));
    ch.$lo = firstOk(st, lo);
    ch.data.datasets.forEach((d, k) => { if (!k) return; const r = d.$raw, i = firstOk(r, lo); d.$i0 = i;
      d.data = r.map((v, j) => v == null || j < i || i >= r.length ? null : v / r[i] * st[i]); });
  } };
  const B = (label, key, color) => ({ label, $raw: PS.map(p => p[key] ?? null), data: [], borderColor: color, pointRadius: 0, borderWidth: 1.3, spanGaps: true });
  mk('chPrice', { type: 'line', plugins: [rebase], data: { labels: PS.map(p => dvn(p.d)), datasets: [{ label: 'Giá ' + T, data: st, borderColor: C.navy, pointRadius: 0, borderWidth: 1.8, dp: 0, unit: 'đ' },
      B('Ngành ngân hàng', 's', C.purple), B('VN-Index', 'v', C.grey)] },
    options: { scales: { x: { ticks: { maxTicksLimit: 8 }, grid: { display: false } }, y: numAxis() }, plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 14, boxHeight: 2 } },
      tooltip: { callbacks: { label: c => { const ch = c.chart, k = c.datasetIndex, d = c.dataset;
        if (!k) { const b = st[ch.$lo]; return `Giá ${T}: ${nf(c.raw)}đ (${sg((c.raw / b - 1) * 100)} từ đầu khung)`; }
        const r = d.$raw[c.dataIndex]; return r == null ? null : `${d.label}: ${nf(r, 2)} điểm (${sg((r / d.$raw[d.$i0] - 1) * 100)} từ đầu khung)`; } } },
      refLines: { lines: [{ value: D.price.high52.c, label: '52W High ' + nf(D.price.high52.c), color: C.teal }, { value: D.price.low52.c, label: '52W Low ' + nf(D.price.low52.c), color: C.red }] } } } }, { win: 12 });
}
function perfTxt() {   // hiệu suất 1 năm và 3 năm: cổ phiếu vs ngành ngân hàng vs VN-Index
  const PS = D.price.series, L = PS[PS.length - 1];
  const at = days => { const t = new Date(new Date(L.d) - days * 864e5).toISOString().slice(0, 10); return PS.find(p => p.d >= t && p.s != null && p.v != null); };
  const ret = (a, k) => a && a[k] != null && L[k] != null ? (L[k] / a[k] - 1) * 100 : null;
  const one = (lab, a) => { if (!a) return ''; const r = ret(a, 'c'), rs = ret(a, 's'), rv = ret(a, 'v'); if (r == null || rs == null || rv == null) return '';
    const vs = r - rs; return `${lab}: <b>${T} ${sg(r)}</b>, ngành ngân hàng ${sg(rs)}, VN-Index ${sg(rv)} → ${T} ${vs >= 0 ? 'vượt' : 'kém'} ngành <b>${nf(Math.abs(vs), 1)} điểm %</b> và ${r - rv >= 0 ? 'vượt' : 'kém'} VN-Index ${nf(Math.abs(r - rv), 1)} điểm %. `; };
  return one('1 năm', at(365)) + one('3 năm', at(365 * 3));
}
/* ---------- Quản trị & sở hữu (theo mẫu MWG Tracker) ---------- */
const GT = { win: 60, side: 'all', q: '', n: 20 };
function govSection() {
  const G = D.governance, sh = G.shareholders, big = sh.filter(h => h.percent >= 5);
  const top = sh[0];
  return `<h2 class="sec">Quản trị &amp; sở hữu</h2><p class="sec-sub">${NR.ownerSub ? esc(NR.ownerSub) : `Ngân hàng do Nhà nước sở hữu chi phối${M.strategic ? `; ${esc(M.strategic)} là cổ đông chiến lược nước ngoài` : ''}.`}</p>
  <div class="grid g2 gap">
    ${card({ id: 'chOwn', title: 'Cơ cấu cổ đông', sub: `% vốn · cổ đông ≥ 0,5% và phần còn lại · ngày chốt gần nhất ${dvn(sh.map(h => h.asOf).sort().pop())}`, h: 'short',
      body: `<div class="tscroll"><table><thead><tr><th>Cổ đông</th><th class="n">Số CP</th><th class="n">Tỷ lệ</th><th>Ngày chốt</th></tr></thead><tbody>
        ${sh.map(h => `<tr><td>${esc(h.name)}</td><td class="n">${nf(h.shares)}</td><td class="n">${nf(h.percent, 2)}%</td><td>${dvn(h.asOf)}</td></tr>`).join('')}
        <tr><td>Cổ đông khác (tự do chuyển nhượng, tổ chức và cá nhân &lt; 0,5%)</td><td class="n">—</td><td class="n">${nf(G.other, 2)}%</td><td></td></tr></tbody></table></div>
        ${G.holderNote ? `<div class="note keep">⚠ ${esc(G.holderNote)}</div>` : ''}`,
      insight: `${esc(top.name)} nắm <b>${nf(top.percent, 1)}%</b>; ${big.length ? `nhóm cổ đông lớn (≥ 5%) <b>${nf(big.reduce((a, h) => a + h.percent, 0), 1)}%</b>` : 'không cổ đông nào nắm từ 5% trở lên'}, phần lưu hành tự do còn khoảng <b>${nf(G.other, 1)}%</b>. ${NR.ownerInsight || 'Các NHTM có vốn Nhà nước chi phối phải giữ sở hữu Nhà nước ≥ 65% khi tăng vốn — ràng buộc của mọi phương án phát hành (xem Catalyst); room ngoại tối đa 30% với ngân hàng.'}`,
      src: 'Wi MCP co_holders' })}
    <article class="card"><h3 class="sub">Cơ cấu quản trị</h3><p class="chart-sub">HĐQT, Ban điều hành, Ban kiểm soát · người đương nhiệm</p><div class="tscroll"><table><thead><tr><th>Họ tên</th><th>Vai trò</th><th>Bổ nhiệm</th></tr></thead><tbody>
      ${G.leadership.map(l => `<tr><td>${esc(l.name)}</td><td>${esc(l.role)}</td><td>${dvn(l.since)}</td></tr>`).join('')}
      </tbody></table></div><div class="src">Nguồn: Wi MCP co_leaders (chỉ tên, chức vụ, ngày bổ nhiệm)</div></article>
  </div>
  <article class="card"><h3 class="sub">Công ty con · liên doanh, liên kết</h3><p class="chart-sub">tỷ lệ lợi ích của ngân hàng · vốn điều lệ tỷ đồng</p>
    ${G.subs.length ? `<div class="tscroll"><table><thead><tr><th>Đơn vị</th><th>Loại</th><th class="n">Sở hữu</th><th class="n">Vốn điều lệ</th><th>Mã CK</th><th>Ngày chốt</th></tr></thead><tbody>
      ${G.subs.map(r => `<tr><td>${esc(r.name)}</td><td>${r.kind}</td><td class="n">${r.pct == null ? '—' : nf(r.pct, 2) + '%'}</td><td class="n">${r.capital == null ? '—' : nf(r.capital)}</td><td>${r.ticker || '—'}</td><td>${dvn(r.asOf)}</td></tr>`).join('')}
      </tbody></table></div><div class="src">Nguồn: Wi MCP co_subsidiaries (theo BCTC năm gần nhất)</div>` : '<div class="note keep">Chưa có danh sách công ty con trong dữ liệu đã lấy — xem thuyết minh BCTC hợp nhất.</div>'}</article>
  <article class="card"><h3 class="sub">Giao dịch cổ đông lớn &amp; người nội bộ</h3>
    <div class="grid g2 gap gov2">
      <div><p class="chart-sub"><b>Giá ${T} và giao dịch đã thực hiện</b></p><div class="cbox"><canvas id="chGovPx" role="img" aria-label="Giá và giao dịch nội bộ"></canvas></div></div>
      <div><p class="chart-sub"><b>Mua / bán lũy kế theo khoảng thời gian</b> · nghìn CP</p><div class="cbox"><canvas id="chGovCum" role="img" aria-label="Mua bán lũy kế"></canvas></div></div>
    </div>
    <div class="note keep">Chấm xanh: mua; cam: bán. Chấm đặt ở ngày kết thúc giao dịch; giao dịch nhiều ngày không có giá từng lệnh. Khối lượng 0 không tính vào mua/bán lũy kế.</div>
    <h4 class="gov-h">Danh sách giao dịch</h4>
    <div class="picker" id="govSide">${[['all', 'Tất cả'], ['Mua', 'Mua'], ['Bán', 'Bán']].map(([k, l]) => `<button type="button" data-k="${k}" class="${k === GT.side ? 'on' : ''}">${l}</button>`).join('')}<input id="govQ" class="gov-q" placeholder="Tìm cổ đông / người nội bộ" aria-label="Tìm giao dịch"></div>
    <div id="govTbl"></div>
    <div class="insight" id="govIns"></div>
    <div class="src">Nguồn: Wi MCP co_insider; giá đóng cửa điều chỉnh (eod_adjust). Lợi suất tính từ phiên đầu sau ngày kết thúc giao dịch tới mốc 1/3/12 tháng, không hàm ý giao dịch gây ra biến động giá.</div></article>`;
}
function drawGov() {
  const G = D.governance, PS = D.price.series, TR = G.trades.filter(t => t.type !== 'Đăng ký' || t.executed);
  const sh = G.shareholders;
  mk('chOwn', { type: 'bar', data: { labels: [''], datasets: sh.map((h, i) => ({ label: h.name, data: [h.percent], backgroundColor: [C.navy, C.teal, C.purple, C.gold, C.blue][i % 5], stack: 's', dp: 2, unit: '%' }))
      .concat([{ label: 'Cổ đông khác', data: [G.other], backgroundColor: '#d9dee8', stack: 's', dp: 2, unit: '%' }]) },
    options: { indexAxis: 'y', scales: { x: { stacked: true, max: 100, ticks: { callback: v => v + '%' } }, y: { stacked: true, grid: { display: false } } } } });
  const draw = () => {
    const from = PS[0].d;
    const ps = PS.filter(p => p.d >= from), idx = Object.fromEntries(ps.map((p, i) => [p.d, i]));
    const at = d => { if (!d) return null; let i = idx[d]; if (i == null) { const k = ps.findIndex(p => p.d >= d); i = k < 0 ? null : k; } return i; };
    const buy = ps.map(() => null), sell = ps.map(() => null);
    TR.filter(t => t.to && t.to >= from && t.executed).forEach(t => { const i = at(t.to); if (i == null) return; (t.side === 'Mua' ? buy : sell)[i] = ps[i].c; });
    mk('chGovPx', { type: 'line', data: { labels: ps.map(p => dvn(p.d)), datasets: [
      { label: 'Giá điều chỉnh', data: ps.map(p => p.c), borderColor: C.blue, backgroundColor: 'rgba(41,56,168,.08)', pointRadius: 0, borderWidth: 1.3, dp: 0, unit: 'đ' },
      { label: 'Mua', data: buy, borderColor: '#2bbfa4', backgroundColor: '#2bbfa4', showLine: false, pointRadius: 6, dp: 0, unit: 'đ' },
      { label: 'Bán', data: sell, borderColor: '#ef7a4a', backgroundColor: '#ef7a4a', showLine: false, pointRadius: 6, dp: 0, unit: 'đ' }] },
      options: { scales: { x: { ticks: { maxTicksLimit: 8 }, grid: { display: false } }, y: numAxis('', { beginAtZero: true }) } } }, { win: 60 });
    const end = PS[PS.length - 1].d, per = [[1, '1 tháng'], [3, '3 tháng'], [6, '6 tháng'], [12, '12 tháng'], [24, '24 tháng']];
    const sum = (m, side) => { const f = new Date(new Date(end).getTime() - m * 30.44 * 864e5).toISOString().slice(0, 10); return TR.filter(t => t.side === side && t.to && t.to > f && t.executed).reduce((a, t) => a + Math.abs(t.executed), 0) / 1e3; };
    mk('chGovCum', { type: 'bar', data: { labels: per.map(p => p[1]), datasets: [
      { label: 'Mua (nghìn CP)', data: per.map(([m]) => sum(m, 'Mua')), backgroundColor: '#2bbfa4', dp: 0 },
      { label: 'Bán (nghìn CP)', data: per.map(([m]) => sum(m, 'Bán')), backgroundColor: '#ef7a4a', dp: 0 }] },
      options: { indexAxis: 'y', scales: { x: numAxis('', { suggestedMax: 10, ticks: { callback: v => nf(v, 0) } }), y: { grid: { display: false } } },
        plugins: { title: { display: !per.some(([m]) => sum(m, 'Mua') + sum(m, 'Bán') > 0), text: 'Không có giao dịch thực hiện trong 24 tháng gần nhất', color: '#8a90a0', font: { size: 12, weight: 'normal' } } } } });
    const last = TR.filter(t => t.to).sort((a, b) => b.to.localeCompare(a.to))[0];
    const b12 = sum(12, 'Mua'), s12 = sum(12, 'Bán');
    $('#govIns').innerHTML = `12 tháng gần nhất: mua <b>${nf(b12)}</b> nghìn CP, bán <b>${nf(s12)}</b> nghìn CP — ${nf((b12 + s12) / 1e3 / M.sharesOut * 100, 4)}% số CP lưu hành (${nf(M.sharesOut / 1000, 2)} tỷ CP). ${last ? `Giao dịch gần nhất: ${esc(last.name)}${last.role ? ' (' + esc(last.role) + ')' : ''} ${last.side.toLowerCase()} ${nf(Math.abs(last.executed))} CP, ${dvn(last.to)}.` : ''} Giao dịch nội bộ ở ngân hàng Nhà nước chi phối thưa và nhỏ — không phải tín hiệu định giá đáng kể; đáng chú ý chủ yếu là giao dịch của cổ đông tổ chức lớn.`;
  };
  const table = () => {
    const q = GT.q.trim().toLowerCase();
    const rows = G.trades.filter(t => (GT.side === 'all' || t.side === GT.side) && (!q || (t.name + ' ' + (t.role || '')).toLowerCase().includes(q))).sort((a, b) => (b.to || b.regTo || '').localeCompare(a.to || a.regTo || ''));
    const rg = (a, b) => a || b ? `${a || '—'}${b && b !== a ? ' → ' + b : ''}` : '—';
    const rt = r => ['m1', 'm3', 'y1'].map(k => r.ret && r.ret[k] != null ? `<span class="${r.ret[k] >= 0 ? 'pdl-u' : 'pdl-d'}">${sg(r.ret[k], 2)}</span>` : '—').join(' · ');
    $('#govTbl').innerHTML = `<p class="chart-sub">Hiển thị ${Math.min(GT.n, rows.length)} / ${rows.length} bản ghi</p><div class="tscroll"><table><thead><tr><th>Loại tin</th><th>Người giao dịch / quan hệ</th><th>Mua / bán</th><th class="n">Đăng ký (CP)</th><th class="n">Thực hiện (CP)</th><th>Thời gian đăng ký</th><th>Ngày thực hiện</th><th class="n">Sở hữu sau GD</th><th class="n">Sau hoàn tất 1M · 3M · 1Y</th></tr></thead><tbody>
      ${rows.slice(0, GT.n).map(t => `<tr><td>${esc(t.type || '—')}</td><td>${esc(t.name)}${t.role ? `<div class="src">${esc(t.role)}</div>` : ''}</td><td><b class="${t.side === 'Mua' ? 'pdl-u' : 'pdl-d'}">${esc(t.side)}</b></td><td class="n">${t.reg ? nf(Math.abs(t.reg)) : '—'}</td><td class="n">${t.executed ? nf(Math.abs(t.executed)) : '—'}</td><td>${rg(t.regFrom, t.regTo)}</td><td>${rg(t.from, t.to)}</td><td class="n">${t.volAfter != null ? nf(t.volAfter) + ' CP' : '—'}${t.after ? `<div class="src">${nf(t.after, t.after < 0.01 ? 4 : 2)}%</div>` : ''}</td><td class="n">${rt(t)}</td></tr>`).join('')}</tbody></table></div>
      ${rows.length > GT.n ? '<button type="button" class="btn ghost" id="govMore">Hiện thêm</button>' : ''}`;
    const mb = $('#govMore'); if (mb) mb.onclick = () => { GT.n += 20; table(); };
  };
  $$('#govSide button').forEach(b => b.onclick = () => { GT.side = b.dataset.k; GT.n = 20; $$('#govSide button').forEach(x => x.classList.toggle('on', x === b)); table(); });
  const qi = $('#govQ'); if (qi) { qi.value = GT.q; qi.oninput = () => { GT.q = qi.value; GT.n = 20; table(); }; }
  draw(); table();
}
function checklist() {
  const t = Object.assign({ pb: VB.pbBand.lo, llr: 130, npl: 1.5, form: 1.5, car: 10 }, (store.get().check || {}));
  return [
    { l: 'P/B ≤ TB 5 năm − 1σ', v: x(M.pb), t: '≤ ' + x(t.pb), ok: M.pb <= t.pb },
    { l: 'NIM TTM tăng so với quý trước', v: pc(QL.nim, 2), t: '> ' + pc(QP.nim, 2), ok: QL.nim > QP.nim },
    { l: 'Tỷ lệ nợ xấu (NPL)', v: pc(QL.npl, 2), t: '≤ ' + pc(t.npl, 1), ok: QL.npl <= t.npl },
    { l: 'Hình thành nợ xấu quy năm (ước tính)', v: pc(QL.nplFormationRate, 2), t: '≤ ' + pc(t.form, 1), ok: QL.nplFormationRate <= t.form },
    { l: 'Bao phủ nợ xấu (LLR)', v: pc(QL.llr, 0), t: '≥ ' + pc(t.llr, 0), ok: QL.llr >= t.llr },
    { l: 'CAR (TT41, kỳ gần nhất)', v: pc(D.car[D.car.length - 1].car, 2), t: '≥ ' + pc(t.car, 1), ok: D.car[D.car.length - 1].car >= t.car },
  ];
}

function casaVs() {
  const R = D.peers.rows.filter(r => r.casa != null && r.symbol !== T), hi = R.filter(r => r.casa > QL.casa).sort((a, b) => b.casa - a.casa);
  return hi.length ? ` thấp hơn ${hi.slice(0, 3).map(r => r.symbol).join(', ')}${hi.length > 3 ? ' và ' + (hi.length - 3) + ' NH khác' : ''}` : ' cao nhất nhóm niêm yết';
}
const mvn = s => s ? s.slice(5, 7) + '/' + s.slice(0, 4) : '—';
const monthsFrom = (a, b) => { const out = []; let [y, m] = a.split('-').map(Number); const [Y, MM] = b.split('-').map(Number); while (y < Y || (y === Y && m <= MM)) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } } return out; };
const alM = (arr, labs) => { const m = {}; (arr || []).forEach(p => { m[p.d.slice(0, 7)] = p.v; }); return labs.map(k => m[k] ?? null); };
function alignM(src, base) { return base.map(b => { const f = src.find(s => s.d.slice(0, 7) === b.d.slice(0, 7)); return f ? f.v : null; }); }
function alignD(src, base) { return base.map(b => { const f = src.find(s => s.d === b.d); return f ? f.v : null; }); }

/* =====================================================================
   TAB 2 · TÀI CHÍNH
===================================================================== */
/* Cơ cấu cho vay, huy động, GTCG theo thuyết minh BCTC (D.mixQ, tỷ đồng) */
const MX = D.mixQ || [];
const MIX_COL = [C.navy, C.blue, C.teal, C.purple, C.gold, C.steps[4], '#1f8a8d', C.red, C.steps[5], '#9a7400', C.grey, '#5b6475'];
const mixRows = (f, src = MX) => src.filter(r => r[f] && Object.keys(r[f]).length);
const IRS = D.irSeg ? D.irSeg.rows : [];
const IRX = D.irExtra || null;
function drawIrx() {   // chart số liệu tài liệu nhà đầu tư: 'stack' (cột chồng), 'line', 'barline' (cột chồng + đường trục phải)
  if (!IRX) return;
  const PAL = [C.navy, C.teal, C.gold, C.purple, C.blue, C.grey];
  IRX.charts.forEach(c => {
    const y1 = c.series.some(s => s.axis === 'y1' || s.axis === 'y2');
    const ds = c.series.map((s, i) => {
      const ln = c.type === 'line' || s.line, col = PAL[i % PAL.length];
      return { type: ln ? 'line' : 'bar', label: s.n, data: s.v, backgroundColor: col, borderColor: col, borderWidth: ln ? 2 : 0, pointRadius: ln ? 2.5 : 0, borderDash: s.dash ? [5, 4] : [],
        yAxisID: s.axis || 'y', stack: ln ? undefined : 's', unit: s.axis ? '%' : c.unit, dp: s.axis === 'y2' ? 0 : c.unit === '%' || s.axis === 'y1' ? 2 : 1, order: ln ? 0 : 1 };
    });
    const sc = { x: { stacked: c.type !== 'line' }, y: c.unit === '%' ? pctAxis('%') : numAxis(c.unit.trim(), { stacked: c.type !== 'line' }) };
    if (y1) sc.y1 = pctAxis(c.series.some(s => s.axis === 'y2') ? (c.series.find(s => s.axis === 'y1') || {}).n : '%', { position: 'right', grid: { display: false } });
    if (c.series.some(s => s.axis === 'y2')) sc.y2 = Object.assign(pctAxis((c.series.find(s => s.axis === 'y2') || {}).n, { position: 'right', grid: { display: false } }), { ticks: { callback: v => nf(v, 0) + '%' } });
    mk(c.id, { type: 'bar', data: { labels: c.labels, datasets: ds }, options: { scales: sc } });
  });
}
const mixTot = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
const MIX_FIX = ['tenor', 'dep', 'depCust', 'loans', 'deps'];
const mixKeys = (rows, f) => { const L = rows[rows.length - 1][f], ks = [...new Set(rows.flatMap(r => Object.keys(r[f])))]; return MIX_FIX.includes(f) ? ks : ks.sort((a, b) => (a === 'Khác') - (b === 'Khác') || (L[b] || 0) - (L[a] || 0)); };
const shr = (r, f, k) => r && r[f] && r[f][k] != null ? r[f][k] / mixTot(r[f]) * 100 : null;
const mixAgo = (rows, n = 4) => { const L = rows[rows.length - 1], [q, y] = L.q.slice(1).split('/').map(Number); return rows.find(r => r.q === `Q${q}/${y - n / 4}`) || null; };
const mixFreq = f => { const r = mixRows(f); if (!r.length) return 'chưa công bố'; const qs = new Set(r.map(x => x.q[1])); return qs.size >= 3 ? 'theo quý' : qs.has('2') ? 'bán niên và năm (Q2, Q4)' : 'chỉ ở BCTC năm (Q4)'; };
const pp = v => v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + nf(Math.abs(v), 1) + ' điểm %';
function pctStack(id, f, src = MX) {
  const rows = mixRows(f, src); if (!rows.length) return;
  const ks = mixKeys(rows, f);
  mk(id, { type: 'bar', data: { labels: rows.map(r => r.q), datasets: ks.map((k, i) => ({ label: k, data: rows.map(r => r[f][k] ? +(r[f][k] / mixTot(r[f]) * 100).toFixed(2) : 0), tyv: rows.map(r => r[f][k] || 0),
    backgroundColor: MIX_COL[i % MIX_COL.length], stack: 's', dp: 1, unit: '%' })) },
    options: { scales: { x: { stacked: true }, y: pctAxis('% tổng', { stacked: true, min: 0, max: 100 }) },
      plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${nf(c.parsed.y, 1)}% · ${nf(c.dataset.tyv[c.dataIndex])} tỷ` } } } } }, { win: 60 });
}
function secIns() {
  const R = mixRows('sector'); if (!R.length) return `${T} chưa công bố dư nợ theo ngành trong thuyết minh BCTC.`;
  const L = R[R.length - 1], P = mixAgo(R) || R[0], ks = mixKeys(R, 'sector').filter(k => k !== 'Khác');
  const top = ks.slice(0, 3).map(k => `${k} <b>${pc(shr(L, 'sector', k))}</b>`).join(', ');
  const mv = ks.map(k => ({ k, d: shr(L, 'sector', k) - (shr(P, 'sector', k) ?? 0) })).filter(m => P !== L).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 2);
  const re = shr(L, 'sector', 'Bất động sản');
  return `${L.q}: lớn nhất là ${top}. ${mv.length ? `So với ${P.q}, thay đổi lớn nhất ở ${mv.map(m => `${m.k} (${pp(m.d)})`).join(' và ')}. ` : ''}${re != null ? `Cho vay kinh doanh bất động sản ${pc(re)} dư nợ — chưa gồm vay mua nhà của cá nhân, nằm trong nhóm hộ gia đình, cá nhân.` : 'Thuyết minh không tách riêng cho vay kinh doanh bất động sản.'} ${T} công bố cơ cấu ngành ${mixFreq('sector')}.`;
}
function custIns() {
  const R = mixRows('cust'); if (!R.length) return `${T} chưa công bố dư nợ theo loại khách hàng trong thuyết minh BCTC.`;
  const L = R[R.length - 1], P = mixAgo(R) || R[0], k = 'Cá nhân, hộ kinh doanh', s = 'Doanh nghiệp nhà nước';
  return `${L.q}: cá nhân, hộ kinh doanh <b>${pc(shr(L, 'cust', k))}</b> dư nợ (${P.q}: ${pc(shr(P, 'cust', k))}), doanh nghiệp tư nhân ${pc(shr(L, 'cust', 'Doanh nghiệp tư nhân'))}, doanh nghiệp nhà nước <b>${pc(shr(L, 'cust', s))}</b> (${pc(shr(P, 'cust', s))}). Cho vay cá nhân có lợi suất cao hơn và rủi ro phân tán hơn; dư nợ doanh nghiệp nhà nước lớn thì lợi suất thấp nhưng chất lượng tín dụng ổn định. Công bố ${mixFreq('cust')}.`;
}
function irIns() {
  const L = mixRows('loans', IRS), Dp = mixRows('deps', IRS); if (!L.length) return '';
  const a = L[L.length - 1], b = mixAgo(L) || L[0], d = Dp[Dp.length - 1], g = (r, f, k) => shr(r, f, k);
  const gr = k => (a.loans[k] / b.loans[k] - 1) * 100;
  if (!('Bán lẻ' in a.loans)) {   // phân khúc theo cách trình bày riêng của từng ngân hàng
    const ks = Object.keys(a.loans), dk = d ? Object.keys(d.deps) : [];
    return `${a.q}: ${ks.map(k => `${k.toLowerCase().replace(/\s*\(.*\)/, '')} <b>${pc(g(a, 'loans', k))}</b>`).join(', ')} dư nợ. So với ${b.q}: ${ks.filter(k => b.loans[k]).map(k => `${k.toLowerCase().replace(/\s*\(.*\)/, '')} ${sg(gr(k))}`).join(', ')}.${d ? ` Tiền gửi (${d.q}): ${dk.map(k => `${k.toLowerCase().replace(/\s*\(.*\)/, '')} ${pc(g(d, 'deps', k))}`).join(', ')}.` : ''}`;
  }
  return `${a.q}: bán lẻ <b>${pc(g(a, 'loans', 'Bán lẻ'))}</b> dư nợ, SME ${pc(g(a, 'loans', 'SME'))}, khách hàng doanh nghiệp lớn <b>${pc(g(a, 'loans', 'KHDN lớn'))}</b>, FDI ${pc(g(a, 'loans', 'FDI'))}. So với ${b.q}, dư nợ bán lẻ ${sg(gr('Bán lẻ'))}, SME ${sg(gr('SME'))}, KHDN lớn ${sg(gr('KHDN lớn'))}, FDI ${sg(gr('FDI'))}.${d ? ` Phía huy động (${d.q}): bán lẻ <b>${pc(g(d, 'deps', 'Bán lẻ'))}</b> tiền gửi KH, KHDN lớn ${pc(g(d, 'deps', 'KHDN lớn'))}, FDI ${pc(g(d, 'deps', 'FDI'))}.` : ''} Đây là cách ${T} tự phân khúc theo khối kinh doanh, khác cách phân loại theo loại hình doanh nghiệp trong thuyết minh BCTC.`;
}
function tenorIns() {
  const R = mixRows('tenor'); if (!R.length) return '';
  const L = R[R.length - 1], P = mixAgo(R) || R[0], F = R[0], lt = r => (shr(r, 'tenor', 'Trung hạn') || 0) + (shr(r, 'tenor', 'Dài hạn') || 0);
  return `${L.q}: ngắn hạn <b>${pc(shr(L, 'tenor', 'Ngắn hạn'))}</b>, trung và dài hạn <b>${pc(lt(L))}</b> dư nợ (${P.q}: ${pc(lt(P))}; ${F.q}: ${pc(lt(F))}). ${lt(L) > lt(P) + 0.5 ? 'Tỷ trọng trung dài hạn tăng: lãi suất cho vay định giá lại chậm hơn và cần nhiều vốn ổn định hơn — TT22 giới hạn vốn ngắn hạn dùng cho vay trung dài hạn tối đa 30%.' : lt(L) < lt(P) - 0.5 ? 'Tỷ trọng trung dài hạn giảm: dư nợ định giá lại nhanh hơn, NIM nhạy hơn với lãi suất cho vay.' : 'Cơ cấu kỳ hạn gần như không đổi trong một năm.'}`;
}
function depIns() {
  const R = mixRows('dep'); if (!R.length) return '';
  const L = R[R.length - 1], P = mixAgo(R) || R[0], dc = mixRows('depCust'), DL = dc[dc.length - 1];
  return `${L.q}: tiền gửi không kỳ hạn <b>${pc(shr(L, 'dep', 'Không kỳ hạn'))}</b> tổng tiền gửi KH (${P.q}: ${pc(shr(P, 'dep', 'Không kỳ hạn'))}), có kỳ hạn ${pc(shr(L, 'dep', 'Có kỳ hạn'))}; CASA theo công thức nguồn (gồm ký quỹ) ${pc(QL.casa)}.${DL ? ` Theo đối tượng (${DL.q}): cá nhân <b>${pc(shr(DL, 'depCust', 'Cá nhân'))}</b>, tổ chức kinh tế ${pc(shr(DL, 'depCust', 'Tổ chức kinh tế'))} — tiền gửi cá nhân ổn định hơn, tiền gửi tổ chức rẻ hơn nhưng dễ dịch chuyển.` : ''}`;
}
function specIns() {
  const R = MX.filter(r => r.gov); if (!R.length) return '';
  const L = R[R.length - 1], q = Q.find(x => x.q === L.q) || QL, g = mixTot(L.gtcg), lt = L.gtcgTenor ? (L.gtcgTenor['12 tháng – 5 năm'] || 0) + (L.gtcgTenor['Trên 5 năm'] || 0) : null;
  return `${L.q}: tiền gửi Kho bạc Nhà nước <b>${nf(L.gov.kbnn)}</b> tỷ (${pc(L.gov.kbnn / q.deposits * 100)} tiền gửi KH), vay NHNN ${nf(L.gov.sbvBorrow)} tỷ; giấy tờ có giá phát hành <b>${nf(g)}</b> tỷ${lt != null && g ? `, trong đó kỳ hạn từ 12 tháng ${pc(lt / g * 100, 0)}` : ''}. Tiền gửi KBNN rẻ nhưng biến động theo giải ngân đầu tư công; GTCG dài hạn là nguồn ổn định, được tính vào mẫu số LDR.`;
}
function ldrRawIns() {
  const r = ldrRows(), L = r[r.length - 1]; if (!L) return '';
  return `${L.q}: cho vay / tiền gửi KH (thô) <b>${pc(L.raw)}</b>, LDR theo TT22 (công thức nguồn, tiền gửi KBNN tính 20%) <b>${pc(L.tt22)}</b>${L.k50 != null ? `; nếu KBNN được tính 50% thì còn <b>${pc(L.k50)}</b>, nếu không tính KBNN thì ${pc(L.k0)}` : ''}. Chênh giữa LDR thô và TT22 là phần nguồn vốn ngoài tiền gửi KH được cộng vào mẫu số (GTCG, vay TCTD, một phần tiền gửi KBNN) và khoản cho vay được loại trừ khỏi tử số.`;
}
function ldrRows() {
  return Q.filter(q => q.ldr != null && q.deposits).map(q => {
    const m = MX.find(r => r.q === q.q), K = m && m.gov ? m.gov.kbnn : null, D20 = q.loansGross / (q.ldr / 100);
    return { q: q.q, raw: q.loansGross / q.deposits * 100, tt22: q.ldr, k50: K != null ? q.loansGross / (D20 + 0.3 * K) * 100 : null, k0: K != null ? q.loansGross / (D20 - 0.2 * K) * 100 : null };
  });
}
function tt50Card() {
  const X = D.ctx || {}, cm = X.camel;
  const used = cm && cm.room ? cm.creditYtd / cm.room * 100 : null;
  return `<article class="card"><h3 class="sub">Room tín dụng và LDR theo TT50</h3>
      ${cm ? `<p>Room ngụ ý theo xếp hạng TT21 (ước tính): <b>${pc(cm.room)}</b> (điểm ${nf(cm.total, 2)}, hạng ${cm.grade}). Tín dụng đã tăng <b>${pc(cm.creditYtd)}</b> từ đầu năm tới ${QL.q} — dùng khoảng <b>${pc(used, 0)}</b> room cả năm.</p>` : ''}
      ${X.peerLdr ? `<p class="chart-sub">LDR ${GRP} niêm yết theo hệ số tính tiền gửi Kho bạc (TGKB) — TT50 tính 20%; nâng lên 50% là một đề xuất chính sách</p><div class="tscroll"><table><thead><tr><th>NH</th><th class="n">TGKB/tiền gửi</th><th class="n">TGKB 0%</th><th class="n">TGKB 20%</th><th class="n">TGKB 50%</th></tr></thead><tbody>
        ${X.peerLdr.map(r => `<tr class="${r.s === M.ticker ? 'hl' : ''}"><td><b>${r.s}</b></td><td class="n">${pc(r.kbnnPctDep)}</td><td class="n">${pc(r.ldr0)}</td><td class="n">${pc(r.ldr20)}</td><td class="n">${pc(r.ldr50)}</td></tr>`).join('')}
      </tbody></table></div>` : ''}
      <div class="src">Room: điểm xếp hạng ước tính × ${nf(X.roomCoef || 2.6, 1)}% (cách giao chỉ tiêu tín dụng 2026), xem dashboard ngành › Xếp hạng TT21 & room. LDR theo hệ số TGKB: tự tính từ BCTC Q2/2026.</div></article>`;
}
function regCard() {
  if (!D.reg) return '';
  return `<article class="card"><h3 class="sub">Lịch quy định an toàn (REG)</h3><p class="chart-sub">Mức hiện hành và lộ trình các tỉ lệ an toàn — dòng tô vàng là chỗ lệch cần analyst xác nhận</p><div class="tscroll"><table>
    <thead><tr><th>ID</th><th>Quy định</th><th>Mức hiện hành</th><th>Văn bản</th><th>Lộ trình</th></tr></thead><tbody>
    ${D.reg.map(g => { const t = new Date().toISOString().slice(0, 10), f = d => d.split('-').reverse().join('/'), soon = g.eff && g.eff > t;
      return `<tr class="${g.flag ? 'hl' : soon ? 'soon' : ''}"><td style="white-space:nowrap">${g.id}${soon ? `<div><span class="pill rs-soon">Chưa hiệu lực</span></div><div class="rs-d">từ ${f(g.eff)}</div>` : ''}</td><td>${esc(g.rule)}</td><td>${esc(g.level)}${g.flag ? `<div class="note keep">⚠ ${esc(g.flag)}</div>` : ''}</td><td>${esc(g.doc)}${g.ref && D.regRef ? `<div><a href="${D.regRef.u}" target="_blank" rel="noopener" class="rs-a">Phân tích FinSuccess →</a></div>` : ''}</td><td>${esc(g.path)}</td></tr>`; }).join('')}
    </tbody></table></div></article>`;
}
const pbFit = P => { const R = P.filter(r => r.x >= 10), n = R.length, mx = R.reduce((a, r) => a + r.x, 0) / n, my = R.reduce((a, r) => a + r.y, 0) / n, b = R.reduce((a, r) => a + (r.x - mx) * (r.y - my), 0) / R.reduce((a, r) => a + (r.x - mx) ** 2, 0); return [my - b * mx, b, n]; };
function pbRoeIns() {
  const SB = (window.SECTOR_DATA || {}).banks; if (!SB) return '';
  const qi = SB.quarters.length - 1, R = Object.entries(SB.series).map(([s, v]) => ({ s, g: v.group, pb: v.pb[qi], roe: v.roe[qi] })).filter(r => r.pb != null && r.roe != null);
  const me = R.find(r => r.s === T); if (!me || R.length < 5) return '';
  const [a0, b, n] = pbFit(R.map(r => ({ x: r.roe, y: r.pb }))), fit = a0 + b * me.roe;
  return `${SB.quarters[qi]}: ${T} P/B <b>${x(me.pb)}</b> với ROE TTM <b>${pc(me.roe)}</b>. Theo đường hồi quy P/B theo ROE của ${n} ngân hàng niêm yết có ROE từ 10% (loại ngân hàng đang tái cơ cấu, lợi nhuận thấp bất thường), mức ROE này tương ứng P/B khoảng <b>${x(fit)}</b> — ${T} ${me.pb < fit * 0.95 ? `đang giao dịch thấp hơn đường hồi quy ${pc((1 - me.pb / fit) * 100, 0)}` : me.pb > fit * 1.05 ? `đang giao dịch cao hơn đường hồi quy ${pc((me.pb / fit - 1) * 100, 0)}` : 'gần đường hồi quy'}. Chênh lệch thường phản ánh khác biệt về chất lượng tài sản, tăng trưởng và sở hữu nhà nước.`;
}
function drawVal(id) {
  const vh = VB.history.slice();   // quý chưa có số: thêm điểm P/B, P/E hiện tại (cập nhật đến ngày gần nhất)
  if (M.pb != null && M.pe != null) vh.push({ q: `Hiện tại ${dvn(M.updated)}`, pb: M.pb, pe: M.pe });
  mk(id, { type: 'line', data: { labels: vh.map(v => v.q), datasets: [
    { label: 'P/B', data: vh.map(v => v.pb), borderColor: C.navy, backgroundColor: C.navy, dp: 2, unit: 'x' },
    { label: 'P/E', data: vh.map(v => v.pe), borderColor: C.teal, backgroundColor: C.teal, yAxisID: 'y1', dp: 1, unit: 'x' },
    { label: 'P/B TB 20 quý', data: vh.map(() => VB.pbBand.mean), borderColor: C.navy, borderDash: [5, 4], pointRadius: 0, keep: true, dp: 2, unit: 'x' },
    { label: 'P/E TB 20 quý', data: vh.map(() => VB.peBand.mean), borderColor: C.teal, borderDash: [5, 4], pointRadius: 0, yAxisID: 'y1', keep: true, dp: 1, unit: 'x' },
  ] }, options: { scales: { y: { title: { display: true, text: 'P/B (x)' } }, y1: { position: 'right', grid: { display: false }, title: { display: true, text: 'P/E (x)' } } } } }, { switch: 'line' });
}
const FIN_OLD = { bs: 'tong', pl: 'tong', room: 'safe', eff: 'nim', peer: 'pv', camel: 'safe', val: 'pv' };
function paneFin() {
  const subs = [['tong', 'Tổng quan'], ['nim', 'Biên lãi'], ['nfi', 'Thu nhập ngoài lãi'], ['aq', 'Chất lượng tài sản'], ['safe', 'Các tỉ lệ an toàn'], ['pv', 'Định giá & so sánh nhóm']];
  const A = D.annual; const P = D.plan; const X = D.ctx;
  const prevY = A[A.length - 1], car = D.car[D.car.length - 1];
  const gh = (t, s) => `<h3 class="grp-h">${t}${s ? `<small>${s}</small>` : ''}</h3>`;
  const _nr = X && X.nRep ? X.nRep[X.nRep.length - 1] : null, _ql = X ? X.quarters[X.quarters.length - 1] : '';
  const partialNote = _nr != null && _nr < (X.nAll || 26) ? `<div class="banner warn"><b>${_ql}: mới ${_nr}/${X.nAll || 26} ngân hàng công bố BCTC.</b> Số của ${T} đã cập nhật; bình quân nhóm, toàn ngành và so sánh nhóm của ${_ql} chỉ gồm các ngân hàng đã có số và sẽ thay đổi khi các ngân hàng còn lại công bố (đang cập nhật).</div>` : '';
  $('#fin').innerHTML = `<h2 class="sec">Tài chính</h2>${partialNote}<p class="sec-sub">Tổng quan bảng cân đối và kết quả kinh doanh → biên lãi (tăng trưởng, NIM, hiệu quả) → thu nhập ngoài lãi → chất lượng tài sản và vốn → các tỉ lệ an toàn → định giá. Tỷ đồng, BCTC hợp nhất; số mới nhất ${QL.q}.</p>
  <div class="subtabs" role="tablist">${subs.map(([k, l], i) => `<button type="button" data-sub="${k}" class="${i ? '' : 'on'}">${l}</button>`).join('')}</div>
  <div class="sub on" data-subp="tong">
    ${gh('Bảng cân đối', QL.q)}
    <div class="grid g2 gap">
      ${card({ id: 'chWfA', title: `Cơ cấu tài sản ${QL.q}`, sub: '% tổng tài sản · cộng dồn tới 100% · di chuột để xem số tỷ đồng', h: 'tall',
        insight: `Cho vay KH ròng <b>${pc(QL.loansNet / QL.ta * 100)}</b> tổng tài sản (${nf(QL.loansNet)} tỷ); tiền gửi và cho vay TCTD <b>${pc(QL.interbankA / QL.ta * 100)}</b> (${nf(QL.interbankA)} tỷ) — theo TT50 khoản này bị trừ khỏi mẫu số khi tính LDR; chứng khoán ${pc(QL.secs / QL.ta * 100)}. Lãi, phí phải thu <b>${pc(QL.accruedToTA, 2)}</b> tổng tài sản (${nf(QL.accrued)} tỷ).`,
        src: 'BCTC hợp nhất' })}
      ${card({ id: 'chWfL', title: `Cơ cấu nguồn vốn ${QL.q}`, sub: '% tổng nguồn vốn · cộng dồn tới 100% · di chuột để xem số tỷ đồng', h: 'tall',
        insight: `Tiền gửi KH <b>${pc(QL.deposits / QL.ta * 100)}</b> nguồn vốn (${nf(QL.deposits)} tỷ); nợ Chính phủ và NHNN (chủ yếu tiền gửi KBNN) ${pc(QL.govSbv / QL.ta * 100)}${BIG ? ' — nguồn đặc thù Big 4' : ''}; GTCG ${pc(QL.papers / QL.ta * 100)} là nguồn ổn định vì không rút trước hạn. VCSH <b>${pc(QL.equity / QL.ta * 100)}</b>, đòn bẩy TS/VCSH <b>${nf(QL.ta / QL.equity, 1)}x</b>.`,
        src: 'BCTC hợp nhất' })}
      ${card({ id: 'chEA', title: 'Tài sản theo quý', sub: 'tỷ đồng · cột chồng · nút "100% tỷ trọng" để xem cơ cấu', ctl: false,
        insight: `Tổng tài sản tăng <b>${sg((QL.ta / Q[Q.length - 5].ta - 1) * 100)}</b> YoY; cho vay KH gộp tăng <b>${sg((QL.loansGross / Q[Q.length - 5].loansGross - 1) * 100)}</b> trong khi liên ngân hàng tăng ${sg((QL.interbankA / Q[Q.length - 5].interbankA - 1) * 100)} — tăng trưởng tài sản không chỉ đến từ cho vay.`, src: 'BCTC hợp nhất' })}
      ${card({ id: 'chFund', title: 'Nguồn vốn theo quý', sub: 'tỷ đồng · cột chồng · nút "100% tỷ trọng" để xem cơ cấu',
        insight: `Tiền gửi KH tăng <b>${sg((QL.deposits / Q[Q.length - 5].deposits - 1) * 100)}</b> YoY, ${QL.deposits / Q[Q.length - 5].deposits < QL.loansGross / Q[Q.length - 5].loansGross ? 'chậm hơn' : 'nhanh hơn'} cho vay (${sg((QL.loansGross / Q[Q.length - 5].loansGross - 1) * 100)}); liên ngân hàng ${sg((QL.interbankL / Q[Q.length - 5].interbankL - 1) * 100)}, GTCG ${sg((QL.papers / Q[Q.length - 5].papers - 1) * 100)}.`, src: 'BCTC hợp nhất' })}
    </div>
    ${gh('Cho vay: khách hàng, ngành, kỳ hạn', 'thuyết minh BCTC')}
    <div class="grid g2 gap">
      ${card({ id: 'chLoanSec', title: 'Dư nợ theo ngành kinh tế', sub: '% dư nợ cho vay KH · kỳ có công bố (' + mixFreq('sector') + ') · di chuột để xem số tỷ đồng', h: 'tall', insight: secIns(), src: 'Thuyết minh BCTC hợp nhất (cho vay khách hàng theo ngành)' })}
      ${card({ id: 'chLoanCust', title: 'Dư nợ theo loại khách hàng', sub: '% dư nợ cho vay KH · kỳ có công bố (' + mixFreq('cust') + ') · di chuột để xem số tỷ đồng', h: 'tall', insight: custIns(), src: 'Thuyết minh BCTC hợp nhất (cho vay theo đối tượng khách hàng, loại hình doanh nghiệp)' })}
      ${IRS.length ? card({ id: 'chIrLoan', title: T + ' · cho vay theo phân khúc khách hàng', sub: `% dư nợ · theo cách phân khúc của ngân hàng (${Object.keys((IRS.find(r => r.loans) || {}).loans || {}).join(', ')}) · di chuột để xem số tỷ đồng`, insight: irIns(), src: esc(D.irSeg.src) }) : ''}
      ${IRS.some(r => r.deps) ? card({ id: 'chIrDep', title: T + ' · tiền gửi KH theo phân khúc', sub: '% tiền gửi KH · cùng phân khúc với cho vay · di chuột để xem số tỷ đồng', body: D.irSeg.depNote ? `<div class="note">${esc(D.irSeg.depNote)}</div>` : '', src: esc(D.irSeg.src) }) : ''}
      ${IRX ? IRX.charts.map(c => card({ id: c.id, title: T + ' · ' + c.title, sub: c.sub, insight: c.ins, src: esc(IRX._src) })).join('') : ''}
      ${IRX && IRX.facts ? `<article class="card"><h3 class="sub">${T} · các chỉ tiêu khác trong tài liệu nhà đầu tư</h3><div class="facts">${IRX.facts.map(f => `<div class="fact"><span>${esc(f[0])}</span><b>${esc(f[1])}</b><small>${esc(f[2])}</small></div>`).join('')}</div><div class="src">Nguồn: ${esc(IRX._src)}</div></article>` : ''}
      ${card({ id: 'chLoanTenor', title: 'Dư nợ theo kỳ hạn', sub: '% dư nợ cho vay KH · quý · di chuột để xem số tỷ đồng', insight: tenorIns(), src: 'Thuyết minh BCTC hợp nhất (cho vay theo thời hạn)' })}
    </div>
    ${gh('Huy động: loại tiền gửi, đối tượng, nguồn khác', 'thuyết minh BCTC')}
    <div class="grid g2 gap">
      ${card({ id: 'chDepType', title: 'Tiền gửi KH theo loại', sub: '% tiền gửi KH · quý · di chuột để xem số tỷ đồng', insight: depIns(), src: 'Thuyết minh BCTC hợp nhất (tiền gửi của khách hàng)' })}
      ${mixRows('depCust').length ? card({ id: 'chDepCust', title: 'Tiền gửi KH theo đối tượng', sub: '% tiền gửi KH · kỳ có công bố (' + mixFreq('depCust') + ')', src: 'Thuyết minh BCTC hợp nhất' }) : ''}
      ${card({ id: 'chFundOth', title: 'Tiền gửi Kho bạc, vay NHNN và giấy tờ có giá', sub: 'tỷ đồng · quý · cột chồng', insight: specIns(), src: 'Thuyết minh BCTC hợp nhất (các khoản nợ Chính phủ và NHNN; phát hành giấy tờ có giá)' })}
    </div>
    ${gh('Kết quả kinh doanh')}
    <div class="grid g2 gap">
      ${card({ id: 'chPlY', title: 'Lợi nhuận trước thuế theo năm + kế hoạch ' + (P ? P.year : ''), sub: 'tỷ đồng · ' + A[0].y + '–' + prevY.y + '; năm ' + (P ? P.year : '') + ': viền đứt = KH ĐHĐCĐ, phần tô = lũy kế ' + (P ? P.ytdLabel : ''),
        insight: P ? `LNTT ${prevY.y} <b>${nf(prevY.pbt)}</b> tỷ (${sg((prevY.pbt / A[A.length - 2].pbt - 1) * 100)}). Kế hoạch ${P.year} <b>${nf(P.pbt)}</b> tỷ (${sg((P.pbt / prevY.pbt - 1) * 100)}); ${P.ytdLabel} đạt <b>${nf(P.pbtYTD)}</b> tỷ = <b>${pc(P.pbtDone)}</b> KH. Lịch sử hoàn thành KH: ${A.filter(a => a.planDone).slice(-4).map(a => a.y + ': ' + pc(a.planDone, 0)).join(', ')}.` : '', src: 'BCTC hợp nhất, nghị quyết ĐHĐCĐ' })}
      ${card({ id: 'chToiY', title: 'Cơ cấu tổng thu nhập hoạt động theo năm', sub: 'tỷ đồng · cột chồng', ctl: false,
        insight: `TOI ${prevY.y} <b>${nf(prevY.toi)}</b> tỷ; thu nhập lãi thuần chiếm <b>${pc(prevY.nii / prevY.toi * 100)}</b>. Thu nhập khác (chủ yếu thu hồi nợ đã xử lý) <b>${nf(prevY.otherInc)}</b> tỷ — đối chiếu tiền thu nợ đã xử lý trên LCTT <b>${nf(prevY.recoveries)}</b> tỷ.`, src: 'BCTC hợp nhất' })}
      ${card({ id: 'chToiQ', title: 'Cơ cấu thu nhập theo quý', sub: 'tỷ đồng · cột chồng',
        insight: `${QL.q}: TOI <b>${nf(QL.toi)}</b> tỷ (${sg((QL.toi / Q[Q.length - 5].toi - 1) * 100)} YoY), NII <b>${nf(QL.nii)}</b> tỷ (${sg((QL.nii / Q[Q.length - 5].nii - 1) * 100)}), phí dịch vụ ${nf(QL.nfi)} tỷ (${sg((QL.nfi / Q[Q.length - 5].nfi - 1) * 100)}).`, src: 'BCTC hợp nhất' })}
      ${card({ id: 'chPpop', title: 'PPOP, chi phí dự phòng và LNTT theo quý', sub: 'tỷ đồng · PPOP loại nhiễu dự phòng', ctl: true,
        insight: `PPOP ${QL.q} <b>${nf(QL.ppop)}</b> tỷ (${sg(yoyQ('ppop'))} YoY); dự phòng <b>${nf(-QL.prov)}</b> tỷ (${pc(-QL.prov / QL.ppop * 100, 0)} PPOP) so với ${nf(-Q[Q.length - 5].prov)} tỷ cùng kỳ; LNTT ${sg(yoyQ('pbt'))} YoY. ${yoyQ('pbt') > yoyQ('ppop') ? `LNTT tăng nhanh hơn PPOP nhờ dự phòng ${-QL.prov < -Q[Q.length - 5].prov ? 'giảm' : 'tăng chậm hơn'} — cần đối chiếu với LLR (${pc(QL.llr, 0)}).` : 'Dự phòng tăng nhanh hơn PPOP nên LNTT tăng chậm hơn — bộ đệm được bồi thêm.'}`, src: 'BCTC hợp nhất' })}
    </div></div>
  <div class="sub" data-subp="nim">
    ${gh('Tăng trưởng')}
    <div class="grid g2 gap">
      ${card({ id: 'chGrow', title: 'Tăng trưởng tín dụng và huy động', sub: '% YoY · quý', ctl: true,
        insight: `Tín dụng <b>${pc(QL.creditYoY)}</b> YoY, huy động <b>${pc(QL.fundingYoY)}</b> (${QL.q}) — khoảng cách ${nf(QL.creditYoY - QL.fundingYoY, 1)} điểm % (một năm trước ${nf(Q[Q.length - 5].creditYoY - Q[Q.length - 5].fundingYoY, 1)} điểm %). Tăng trưởng tín dụng là động lực chính của thu nhập lãi; phần huy động thiếu hụt phải bù bằng liên ngân hàng, GTCG — chi phí cao hơn tiền gửi khách hàng.`,
        src: 'BCTC hợp nhất' })}
      ${card({ id: 'chCasa', title: 'CASA và tỷ trọng thu phí', sub: '% · quý · CASA = (không kỳ hạn + ký quỹ)/tiền gửi KH', ctl: true,
        insight: `CASA <b>${pc(QL.casa)}</b>; NFI/TOI TTM <b>${pc(QL.nfiShare)}</b>. Cả hai là nguồn đỡ NIM khi lãi suất biến động — CASA ${T}${casaVs()}.`, src: 'BCTC hợp nhất' })}
    </div>
    ${gh('Biên lãi')}
    <div class="grid g2 gap">
      ${X ? card({ id: 'chNimPeer', title: 'NIM và chi phí vốn: ' + T + ' so với ' + GRP + ' và ngành', sub: '% · TTM theo quý · ' + GRP + ' và ngành = bình quân gia quyền theo dư nợ của các ngân hàng niêm yết', ctl: true,
        insight: nimPeerIns(), src: 'BCTC các ngân hàng niêm yết · tự tổng hợp' }) : ''}
      ${card({ id: 'chNim', title: 'NIM, YEA và COF', sub: '% · TTM theo quý', ctl: true,
        insight: (() => { const lo = minIn('nim', 8), d2 = QL.nim - Q[Q.length - 3].nim, dy = QL.yea - Q[Q.length - 3].yea, dc = QL.cof - Q[Q.length - 3].cof;
          return `NIM TTM <b>${pc(QL.nim, 2)}</b> ${QL.nim > lo + 0.05 ? `phục hồi từ đáy 8 quý <b>${pc(lo, 2)}</b>` : `quanh đáy 8 quý (${pc(lo, 2)})`}; trong 2 quý YEA ${sg(dy, 2, ' điểm %')} lên <b>${pc(QL.yea, 2)}</b>, COF ${sg(dc, 2, ' điểm %')} lên <b>${pc(QL.cof, 2)}</b> — NIM ${d2 >= 0 ? 'mở rộng' : 'thu hẹp'} ${nf(Math.abs(d2), 2)} điểm %.`; })(), src: 'BCTC hợp nhất (chỉ số TTM)' })}
      ${card({ id: 'chGap', title: 'Khe hở tài sản − nợ nhạy cảm lãi suất ≤ 12 tháng', sub: '% tổng tài sản · quý · âm = nợ định giá lại nhanh hơn tài sản (thuyết minh rủi ro lãi suất)',
        insight: gapIns(), src: 'Thuyết minh rủi ro lãi suất, BCTC hợp nhất' })}
      ${card({ id: 'chNimAdj', title: 'NIM và NIM sau chi phí tín dụng', sub: '% · TTM · NIM điều chỉnh = (NII − dự phòng) / TS sinh lời (tự tính)', ctl: true,
        insight: `NIM sau dự phòng <b>${pc(QL.nimAdj, 2)}</b> so với NIM <b>${pc(QL.nim, 2)}</b>: chi phí tín dụng ăn <b>${nf(QL.nim - QL.nimAdj, 2)} điểm %</b>. Chỉ số này so sánh ngang giữa ngân hàng cho vay rủi ro cao (YEA cao, dự phòng cao) và ngân hàng thận trọng.`, src: 'Tự tính từ BCTC hợp nhất' })}
      ${card({ id: 'chCof', title: 'COF ' + T + ' vs lãi suất huy động 12T niêm yết', sub: '% · COF TTM theo quý; LS niêm yết ' + T + ' cuối quý', ctl: true,
        insight: `COF thực tế <b>${pc(QL.cof, 2)}</b> thấp hơn lãi suất 12T niêm yết (${pc(depB[depB.length - 1].v, 1)}) nhờ CASA ~${pc(QL.casa, 0)}${BIG ? ' và tiền gửi KBNN' : ''}. Lãi suất niêm yết đi vào COF với độ trễ 1–3 quý.`, src: 'BCTC hợp nhất; biểu lãi suất niêm yết của ngân hàng' })}
    </div>
    ${gh('Hiệu quả vận hành và sinh lời')}
    <div class="grid g2 gap">
      ${card({ id: 'chCir', title: 'CIR', sub: '% · TTM theo quý', ctl: true,
        insight: `CIR <b>${pc(QL.cir)}</b> ${QL.cir < Q[Q.length - 9].cir ? 'giảm' : 'tăng'} từ ${pc(Q[Q.length - 9].cir)} hai năm trước — ${QL.cir < Q[Q.length - 9].cir ? 'hiệu quả vận hành cải thiện nhờ thu nhập tăng nhanh hơn chi phí' : 'chi phí tăng nhanh hơn thu nhập'}.`, src: 'BCTC hợp nhất (chỉ số TTM)' })}
      ${card({ id: 'chRoe', title: 'ROE và ROA', sub: '% · TTM theo quý', ctl: true,
        insight: `ROE <b>${pc(QL.roe)}</b>, ROA <b>${pc(QL.roa, 2)}</b>${QL.roe >= maxIn('roe', 32) ? ' — cao nhất 8 năm' : ` (đỉnh 8 năm ${pc(maxIn('roe', 32))})`}. ROE = ROA × đòn bẩy (${nf(QL.ta / QL.equity, 1)}x): ROE tăng nhờ ROA là chất lượng hơn ROE tăng nhờ đòn bẩy.`, src: 'BCTC hợp nhất (chỉ số TTM)' })}
    </div></div>
  <div class="sub" data-subp="aq">
    ${gh('Nợ xấu')}
    <div class="grid g2 gap">
      ${card({ id: 'chNpl', title: 'Nợ xấu và nợ nhóm 2', sub: '% dư nợ · quý', ctl: true,
        insight: `NPL <b>${pc(QL.npl, 2)}</b> (quý trước ${pc(QP.npl, 2)}), nhóm 2 <b>${pc(QL.g2, 2)}</b>. Nhóm 2 thường đồng pha với NPL chứ không phải chỉ báo sớm — nên đọc cùng hình thành nợ xấu.`, src: 'BCTC hợp nhất' })}
      ${X ? card({ id: 'chAqPeer', title: 'Nợ xấu và nhóm 2: ' + T + ' so với ' + GRP + ' và ngành', sub: '% dư nợ · quý', ctl: true,
        insight: aqPeerIns(), src: 'BCTC các ngân hàng niêm yết · tự tổng hợp' }) : ''}
      ${card({ id: 'chForm', title: 'Hình thành nợ xấu ròng', sub: 'tỷ đồng/quý và % dư nợ quy năm · = nợ xấu tăng thêm + nợ xử lý bằng dự phòng · ròng: đã trừ nợ xấu thu hồi, bán, nâng nhóm nên có quý âm' + (Q.some(q => q.writeOffAct != null) ? ' · cột đậm = nợ xử lý lấy số thực tế trong thuyết minh, cột nhạt = ước tính' : ' · nợ xử lý ước tính từ biến động dự phòng'),
        insight: formIns(), src: (D.writeOffSrc ? esc(D.writeOffSrc) + '; ' : '') + 'BCTC hợp nhất · tự tính' })}
      ${card({ id: 'chAccr', title: 'Lãi, phí phải thu so với cho vay', sub: 'tăng trưởng YoY (%) · trục phải: lãi phải thu / dư nợ và tỷ lệ nợ xấu (%, nét đứt đỏ) · lãi dự thu tăng nhanh hơn dư nợ là dấu hiệu nợ xấu tiềm ẩn — NPL đi lên sau đó là xác nhận', ctl: true,
        insight: accrIns(), src: 'BCTC hợp nhất (tài sản Có khác: lãi, phí phải thu; cho vay khách hàng)' })}
    </div>
    ${gh('Dự phòng')}
    <div class="grid g2 gap">
      ${card({ id: 'chLlr', title: 'Bao phủ nợ xấu', sub: '% · LLR và LLR khi coi lãi, phí phải thu là nợ xấu', ctl: true,
        insight: `LLR ${QL.llr < Q[Q.length - 3].llr ? 'giảm' : 'tăng'} từ <b>${pc(Q[Q.length - 3].llr, 0)}</b> (${Q[Q.length - 3].q}) ${QL.llr < Q[Q.length - 3].llr ? 'xuống' : 'lên'} <b>${pc(QL.llr, 0)}</b>${NR.llrRef && QL.llr < NR.llrRef.v ? ', ' + NR.llrRef.txt : ''}. Nếu cộng lãi dự thu vào nợ xấu, LLR còn <b>${pc(QL.llrInclAccrued, 0)}</b>.`, src: 'BCTC hợp nhất; tự tính' })}
      ${card({ id: 'chCc', title: 'Chi phí tín dụng và thu hồi nợ đã xử lý', sub: 'chi phí tín dụng % (TTM, tự tính) · thu hồi nợ tỷ đồng/quý (LCTT)', ctl: false,
        insight: `Chi phí tín dụng TTM <b>${pc(QL.creditCost, 2)}</b> dư nợ bình quân. Thu hồi nợ đã xử lý TTM <b>${nf(QL.recoveriesTTM)}</b> tỷ; nợ ngoại bảng đã xử lý còn <b>${nf(QL.writtenOff)}</b> tỷ — "kho" thu nhập khác cho các năm tới${NR.recovTarget || ''}.`, src: 'BCTC hợp nhất (dự phòng, LCTT, ngoại bảng)' })}
    </div>
    ${gh('Vốn và an toàn vốn')}
    <div class="grid g2 gap">
      ${carCard('chCarAq')}
      ${card({ id: 'chLev', title: 'Vốn chủ sở hữu và đòn bẩy', sub: 'cột = VCSH (tỷ đồng, trục trái) · đường = tổng tài sản / VCSH (lần, trục phải)', ctl: false,
        insight: `VCSH <b>${nf(QL.equity)}</b> tỷ (${sg(yoyQ('equity'))} YoY) so với tổng tài sản ${sg(yoyQ('ta'))}; đòn bẩy <b>${nf(QL.ta / QL.equity, 1)}x</b> (một năm trước ${nf(Q[Q.length - 5].ta / Q[Q.length - 5].equity, 1)}x). Vốn điều lệ ${nf(QL.charter)} tỷ. Tài sản tăng nhanh hơn vốn thì CAR chịu áp lực — tăng vốn (giữ lại lợi nhuận, chia cổ tức cổ phiếu) là điều kiện để giữ tốc độ tăng trưởng.`,
        src: 'BCTC hợp nhất' })}
    </div></div>
  <div class="sub" data-subp="nfi">
    <div class="grid g2 gap">
      ${card({ id: 'chNfiQ', title: 'Thu nhập ngoài lãi theo quý', sub: 'tỷ đồng · lãi thuần dịch vụ, ngoại hối, chứng khoán, góp vốn và thu nhập khác (chủ yếu thu hồi nợ đã xử lý) · tăng trưởng tính trên 4 quý gần nhất (TTM)', body: `<div class="picker tf" data-nfim><button type="button" data-k="val" class="on">Giá trị</button><button type="button" data-k="yoy">Tăng trưởng YoY (TTM)</button></div>`,
        insight: nfiIns(), src: 'BCTC hợp nhất' })}
      ${card({ id: 'chNfiShare', title: 'Tỷ trọng thu nhập ngoài lãi trong TOI', sub: '% · TTM theo quý · tách phần ổn định (dịch vụ) và phần biến động (ngoại hối, chứng khoán, khác)', ctl: true,
        insight: nfiShareIns(), src: 'BCTC hợp nhất · tự tính' })}
    </div>
    ${D.fee ? feeCard() : ''}</div>
  <div class="sub" data-subp="safe">
    ${gh('Tỷ lệ cho vay / huy động (LDR)', 'TT22 · TT50')}
    <div class="grid g2 gap">
      ${ldrCard('chLdrQ')}
      ${card({ id: 'chLdrRaw', title: 'LDR thô và LDR ước tính theo TT22', sub: '% · quý · thô = cho vay KH gộp / tiền gửi KH · TT22 = công thức nguồn dữ liệu (tiền gửi KBNN tính 20%) · hai đường đứt = cùng công thức nếu tiền gửi KBNN tính 50% hoặc 0%', ctl: true,
        insight: ldrRawIns(), src: 'BCTC hợp nhất, thuyết minh tiền gửi KBNN · TT22/2019, TT50/2024 · tự tính' })}
    </div>
    ${tt50Card()}
    ${gh('An toàn vốn')}
    <div class="grid g2 gap">${carCard('chCarS')}${card({ id: 'chGrowS', title: 'Tăng trưởng tín dụng so với vốn', sub: '% YoY · quý · tín dụng, tổng tài sản và VCSH', ctl: true,
        insight: `Tín dụng <b>${pc(QL.creditYoY)}</b> YoY, tổng tài sản ${sg(yoyQ('ta'))}, VCSH <b>${sg(yoyQ('equity'))}</b> (${QL.q}). CAR kỳ gần nhất ${pc(car.car, 2)} (${esc(car.period)}): ${yoyQ('equity') < QL.creditYoY ? 'vốn tăng chậm hơn tín dụng — CAR sẽ giảm nếu không tăng vốn' : 'vốn tăng nhanh hơn tín dụng — dư địa an toàn vốn được giữ'}.`, src: 'BCTC hợp nhất' })}</div>
    ${regCard()}
    ${gh('Bảng CAMEL')}
    ${camel()}</div>
  <div class="sub" data-subp="pv">
    ${gh('Định giá')}
    <div class="grid g2 gap">
      ${card({ id: 'chValF', title: 'P/B và P/E TTM theo quý', sub: 'lần · cuối quý · đường đứt = trung bình 20 quý', ctl: true,
        insight: `P/B <b>${x(M.pb)}</b> so với trung bình 20 quý ${x(VB.pbBand.mean)} (dải ±1σ ${x(VB.pbBand.lo)}–${x(VB.pbBand.hi)}); P/E TTM <b>${x(M.pe)}</b> so với ${x(VB.peBand.mean)}. Forward 2026F: P/B ${x(FW.pbFwd)}, P/E ${x(FW.peFwd)}. Giá mục tiêu và kịch bản định giá ở tab 💎 FinSuccess.`, src: 'Giá đóng cửa, BCTC hợp nhất' })}
      ${card({ id: 'chPbRoe', title: 'P/B và ROE: 26 ngân hàng niêm yết', sub: 'P/B (lần) theo ROE TTM (%) · quý gần nhất · đường đứt = hồi quy tuyến tính trên các ngân hàng ROE từ 10% · ' + T + ' tô vàng', insight: pbRoeIns(), src: 'BCTC các ngân hàng niêm yết, giá đóng cửa · tự tính' })}
      ${card({ id: 'chDiv', title: 'Cổ tức', sub: 'cột xanh đậm = cổ tức tiền mặt (đ/CP, trục trái) · cột xanh ngọc = cổ tức cổ phiếu (%), điểm vàng = tỷ lệ chi trả tiền mặt (%) — trục phải',
        body: NR.divNote ? `<div class="note">${NR.divNote}</div>` : '',
        insight: NR.divInsight || '', src: NR.divSrc || 'Nghị quyết ĐHĐCĐ, thông báo chia cổ tức' })}
      ${card({ id: 'chPlanDone', title: 'Hoàn thành kế hoạch lợi nhuận', sub: '% kế hoạch LNTT ĐHĐCĐ · năm gần nhất tính lũy kế đến quý mới nhất',
        insight: (() => { const h = A.filter(a => a.planDone); const miss = []; for (let y = h[0].y; y <= h[h.length - 1].y; y++) if (!h.find(a => a.y === y)) miss.push(y); const fail = h.filter(a => a.planDone < 100).map(a => a.y);
          return `Giai đoạn ${h[0].y}–${h[h.length - 1].y}, ${T} hoàn thành trung bình <b>${pc(h.reduce((x, a) => x + a.planDone, 0) / h.length, 0)}</b> kế hoạch, ${fail.length ? 'hụt năm ' + fail.join(', ') : 'không năm nào hụt'}${fail.length <= 1 ? ' — kế hoạch thường đặt thận trọng' : ''}. ${P ? `${esc(P.ytdLabel)} đã đạt <b>${pc(P.pbtDone)}</b> kế hoạch ${P.year}.` : ''}${miss.length ? ` Nguồn chưa có số kế hoạch ${miss.join(', ')}.` : ''}`; })(),
        src: 'Nghị quyết ĐHĐCĐ (kế hoạch), BCTC (thực hiện)' })}
    </div>
    ${gh('So sánh nhóm')}
    ${peerSub()}</div>`;

  // --- subtab switch
  $$('#fin .subtabs button').forEach(b => b.onclick = () => {
    $$('#fin .subtabs button').forEach(x => x.classList.toggle('on', x === b));
    $$('#fin .sub').forEach(p => p.classList.toggle('on', p.dataset.subp === b.dataset.sub));
    finCharts(b.dataset.sub);
  });
  finCharts('tong');
}
const finDone = {};
function finCharts(k) {
  if (finDone[k]) return; finDone[k] = true;
  const q12 = win(Q, 12), q16 = win(Q, 16), A = D.annual, P = D.plan;
  if (k === 'tong') {
    wf('chWfA', [['Tiền mặt & NHNN', QL.cash], ['TCTD', QL.interbankA], ['Chứng khoán', QL.secs], ['Cho vay KH ròng', QL.loansNet], ['Góp vốn, TSCĐ, khác', QL.ta - QL.cash - QL.interbankA - QL.secs - QL.loansNet]], 'Tổng tài sản', QL.ta);
    wf('chWfL', [['Tiền gửi KH', QL.deposits], ['Tiền gửi & vay TCTD', QL.interbankL], ['GTCG', QL.papers], ['Nợ CP & NHNN', QL.govSbv], ['Nợ khác', QL.otherL], ['VCSH', QL.equity]], 'Tổng nguồn vốn', QL.ta);
    stack('chEA', q12, [['Tiền mặt & NHNN', 'cash'], ['TCTD', 'interbankA'], ['Chứng khoán', 'secs'], ['Cho vay KH ròng', 'loansNet']]);
    stack('chFund', q12, [['Tiền gửi KH', 'deposits'], ['TCTD', 'interbankL'], ['GTCG', 'papers'], ['CP & NHNN', 'govSbv'], ['VCSH', 'equity']]);
    pctStack('chIrLoan', 'loans', IRS); pctStack('chIrDep', 'deps', IRS); drawIrx(); pctStack('chLoanSec', 'sector'); pctStack('chLoanCust', 'cust'); pctStack('chLoanTenor', 'tenor'); pctStack('chDepType', 'dep'); pctStack('chDepCust', 'depCust');
    const fo = MX.filter(r => r.gov);
    const gk = [...new Set(fo.flatMap(r => Object.keys(r.gtcg || {})))];
    mk('chFundOth', { type: 'bar', data: { labels: fo.map(r => r.q), datasets: [
      { label: 'Tiền gửi KBNN', data: fo.map(r => r.gov.kbnn), backgroundColor: C.navy, stack: 's', dp: 0 },
      { label: 'Vay NHNN', data: fo.map(r => r.gov.sbvBorrow), backgroundColor: C.red, stack: 's', dp: 0 },
      ...gk.map((g, i) => ({ label: 'GTCG: ' + g.toLowerCase(), data: fo.map(r => (r.gtcg || {})[g] || 0), backgroundColor: [C.teal, C.gold, C.steps[4]][i % 3], stack: 's', dp: 0 }))] },
      options: { scales: { x: { stacked: true }, y: numAxis('tỷ đồng', { stacked: true }) } } });
    const yl = A.map(a => String(a.y)).concat(P ? [P.year + ' (KH)'] : []);
    mk('chPlY', { type: 'bar', data: { labels: yl, datasets: [
      { label: 'LNTT thực hiện', data: A.map(a => a.pbt).concat(P ? [P.pbtYTD] : []), backgroundColor: yl.map((_, i) => i === yl.length - 1 && P ? C.teal : C.navy), grouped: false, dp: 0 },
      { label: 'Kế hoạch ĐHĐCĐ', data: A.map(() => null).concat(P ? [P.pbt] : []), backgroundColor: 'rgba(0,0,0,0)', borderColor: C.navy, borderWidth: 2, borderDash: [6, 4], grouped: false, dp: 0 },
    ] }, options: { scales: { y: numAxis('tỷ đồng') } } });
    mk('chToiY', { type: 'bar', data: { labels: A.map(a => a.y), datasets: [
      ['Lãi thuần', 'nii', C.navy], ['Dịch vụ', 'nfi', C.teal], ['Ngoại hối', 'fx', C.purple], ['Chứng khoán', 'secInc', C.steps[4]], ['Hoạt động khác', 'otherInc', C.gold]].map(([l, kk, c]) => ({ label: l, data: A.map(a => a[kk]), backgroundColor: c, stack: 's', dp: 0 })) },
      options: { scales: { x: { stacked: true }, y: numAxis('tỷ đồng', { stacked: true }) } } });
    mk('chToiQ', { type: 'bar', data: { labels: q12.map(q => q.q), datasets: [
      ['Lãi thuần', 'nii', C.navy], ['Dịch vụ', 'nfi', C.teal], ['Ngoại hối', 'fx', C.purple], ['Chứng khoán', 'secInc', C.steps[4]], ['Hoạt động khác', 'otherInc', C.gold]].map(([l, kk, c]) => ({ label: l, data: q12.map(q => q[kk]), backgroundColor: c, stack: 's', dp: 0 })) },
      options: { scales: { x: { stacked: true }, y: numAxis('tỷ đồng', { stacked: true }) } } });
    mk('chPpop', { type: 'bar', data: { labels: q12.map(q => q.q), datasets: [
      { label: 'PPOP', data: q12.map(q => q.ppop), backgroundColor: C.navy, dp: 0 },
      { label: 'Chi phí dự phòng', data: q12.map(q => -q.prov), backgroundColor: C.red, dp: 0 },
      { label: 'LNTT', data: q12.map(q => q.pbt), backgroundColor: C.teal, dp: 0 }] }, options: { scales: { y: numAxis('tỷ đồng') } } }, { switch: 'bar' });
  }
  if (k === 'nim') {
    const qg0 = Q.filter(q => q.creditYoY != null);
    mk('chGrow', { type: 'line', data: { labels: qg0.map(q => q.q), datasets: [
      { label: 'Tín dụng YoY', data: qg0.map(q => q.creditYoY), borderColor: C.navy, backgroundColor: C.navy, dp: 1, unit: '%' },
      { label: 'Huy động YoY', data: qg0.map(q => q.fundingYoY), borderColor: C.teal, backgroundColor: C.teal, dp: 1, unit: '%' }] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' });
    const qq = Q.filter(q => q.nim);
    mk('chNim', { type: 'line', data: { labels: qq.map(q => q.q), datasets: [
      { label: 'NIM', data: qq.map(q => q.nim), borderColor: C.navy, backgroundColor: C.navy, borderWidth: 2.5, dp: 2, unit: '%' },
      { label: 'YEA', data: qq.map(q => q.yea), borderColor: C.teal, backgroundColor: C.teal, dp: 2, unit: '%' },
      { label: 'COF', data: qq.map(q => q.cof), borderColor: C.purple, backgroundColor: C.purple, dp: 2, unit: '%' }] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' });
    const qa = Q.filter(q => q.nimAdj);
    mk('chNimAdj', { type: 'line', data: { labels: qa.map(q => q.q), datasets: [
      { label: 'NIM', data: qa.map(q => q.nim), borderColor: C.navy, backgroundColor: C.navy, dp: 2, unit: '%' },
      { label: 'NIM sau dự phòng', data: qa.map(q => q.nimAdj), borderColor: C.teal, backgroundColor: C.teal, dp: 2, unit: '%' }] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' });
    const dep = depB;
    mk('chCof', { type: 'line', data: { labels: Q.map(q => q.q), datasets: [
      { label: 'COF TTM', data: Q.map(q => q.cof), borderColor: C.purple, backgroundColor: C.purple, dp: 2, unit: '%' },
      { label: 'LS 12T ' + T + ' cuối quý', data: Q.map(q => { const m = String(q.quarter * 3).padStart(2, '0'); const f = dep.find(v => v.d.startsWith(`${q.year}-${m}`)); return f ? f.v : null; }), borderColor: C.navy, backgroundColor: C.navy, borderDash: [5, 4], dp: 2, unit: '%' }] },
      options: { scales: { y: pctAxis() } } }, { switch: 'line' });
    mk('chCasa', { type: 'line', data: { labels: q16.map(q => q.q), datasets: [
      { label: 'CASA', data: q16.map(q => q.casa), borderColor: C.navy, backgroundColor: C.navy, dp: 1, unit: '%' },
      { label: 'NFI/TOI (TTM)', data: q16.map(q => q.nfiShare), borderColor: C.teal, backgroundColor: C.teal, dp: 1, unit: '%' }] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' });
    if (D.ctx) { const X = D.ctx, qs = X.quarters, cq = qs.map(l => Q.find(q => q.q === l));
      mk('chNimPeer', { type: 'line', data: { labels: qs, datasets: [
        { label: 'NIM ' + T, data: cq.map(q => q && q.nim), borderColor: C.navy, backgroundColor: C.navy, dp: 2, unit: '%', borderWidth: 2.5 },
        { label: 'NIM ' + GRP, data: X.agg.nim[GRP], borderColor: C.teal, backgroundColor: C.teal, dp: 2, unit: '%' },
        { label: 'NIM ngành', data: X.agg.nim.all, borderColor: C.grey, backgroundColor: C.grey, dp: 2, unit: '%', borderDash: [5, 4] },
        { label: 'COF ' + T, data: cq.map(q => q && q.cof), borderColor: C.purple, backgroundColor: C.purple, dp: 2, unit: '%' },
        { label: 'COF ngành', data: X.agg.cof.all, borderColor: C.red, backgroundColor: C.red, dp: 2, unit: '%', borderDash: [5, 4] }] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' }); }
    const qg = Q.filter(q => q.irGap != null);
    mk('chGap', { type: 'bar', data: { labels: qg.map(q => q.q), datasets: [{ label: 'Khe hở ≤ 12 tháng / tổng tài sản', data: qg.map(q => q.irGap / q.ta * 100), backgroundColor: qg.map(q => q.irGap < 0 ? C.purple : C.teal), dp: 1, unit: '%' }] },
      options: { plugins: { legend: { display: false } }, scales: { y: pctAxis() } } });
    const qc = Q.filter(q => q.cir);
    mk('chCir', { type: 'line', data: { labels: qc.map(q => q.q), datasets: [{ label: 'CIR', data: qc.map(q => q.cir), borderColor: C.navy, backgroundColor: C.navy, dp: 1, unit: '%' }] }, options: { plugins: { legend: { display: false } }, scales: { y: pctAxis() } } }, { switch: 'line' });
    mk('chRoe', { type: 'line', data: { labels: qc.map(q => q.q), datasets: [
      { label: 'ROE', data: qc.map(q => q.roe), borderColor: C.navy, backgroundColor: C.navy, dp: 1, unit: '%' },
      { label: 'ROA', data: qc.map(q => q.roa), borderColor: C.teal, backgroundColor: C.teal, yAxisID: 'y1', dp: 2, unit: '%' }] },
      options: { scales: { y: pctAxis('ROE'), y1: pctAxis('ROA', { position: 'right', grid: { display: false } }) } } }, { switch: 'line' });
  }
  if (k === 'nfi') {
    const NK = [['Dịch vụ', 'nfi'], ['Ngoại hối', 'fx'], ['Chứng khoán', 'secInc'], ['Góp vốn', 'equityInc'], ['Khác (thu hồi nợ…)', 'otherInc']];
    const nfiBox = $('[data-nfim]'); const nfiDraw = m => {
      if (m !== 'yoy') { stack('chNfiQ', q12, NK); return; }
      const ttm = (j, k) => j < 3 ? null : Q.slice(j - 3, j + 1).reduce((a, x) => a + (k === '_all' ? x.nfi + x.fx + x.secInc + (x.equityInc || 0) + x.otherInc : (x[k] || 0)), 0);
      const g = (j, k) => { const a = ttm(j, k), b = ttm(j - 4, k); return a == null || b == null || b < 50 ? null : Math.round((a / b - 1) * 1000) / 10; };
      const qs = Q.filter(q => Q.indexOf(q) >= 7);
      const S = [['Dịch vụ', 'nfi', C.navy, 2.2], ['Ngoại hối', 'fx', C.steps[4], 1.6], ['Chứng khoán', 'secInc', C.teal, 1.6], ['Khác (thu hồi nợ…)', 'otherInc', C.purple, 1.6], ['Tổng ngoài lãi', '_all', '#1b1f2a', 3]];
      mk('chNfiQ', { type: 'line', data: { labels: qs.map(q => q.q), datasets: S.map(([l, k, c, w]) => ({ label: l, data: qs.map(q => g(Q.indexOf(q), k)), borderColor: c, backgroundColor: c, borderWidth: w, dp: 1, unit: '%', spanGaps: true })) },
        options: { scales: { y: pctAxis() }, plugins: { refLines: { lines: [{ value: 0, label: '' }] } } } }, { win: 60 });
    };
    if (nfiBox) { const bs = [...nfiBox.querySelectorAll('button')]; bs.forEach(b => b.onclick = () => { bs.forEach(x => x.classList.toggle('on', x === b)); nfiDraw(b.dataset.k); }); }
    nfiDraw('val');
    const qs = Q.map(q => { const j = Q.indexOf(q); if (j < 3) return null; const t = Q.slice(j - 3, j + 1), toi = t.reduce((a, x) => a + x.toi, 0);
      return { q: q.q, fee: t.reduce((a, x) => a + x.nfi, 0) / toi * 100, vol: t.reduce((a, x) => a + x.fx + x.secInc + x.otherInc + (x.equityInc || 0), 0) / toi * 100 }; }).filter(Boolean);
    mk('chNfiShare', { type: 'line', data: { labels: qs.map(x => x.q), datasets: [
      { label: 'Phí dịch vụ / TOI', data: qs.map(x => x.fee), borderColor: C.navy, backgroundColor: C.navy, dp: 1, unit: '%' },
      { label: 'Ngoại hối, chứng khoán, khác / TOI', data: qs.map(x => x.vol), borderColor: C.gold, backgroundColor: C.gold, dp: 1, unit: '%' }] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' });
    if (D.fee) drawFee();
  }
  if (k === 'aq') {
    const qa = Q.filter((q, i) => i >= 4).map(q => { const i = Q.indexOf(q); return { q: q.q, a: yoyQ('accrued', i), l: yoyQ('loansGross', i), r: q.accrued / q.loansGross * 100, npl: q.npl }; });
    mk('chAccr', { type: 'bar', data: { labels: qa.map(x => x.q), datasets: [
      { label: 'Lãi phải thu YoY', data: qa.map(x => x.a), backgroundColor: C.purple + '59', order: 2, dp: 1, unit: '%' },
      { label: 'Cho vay YoY', data: qa.map(x => x.l), backgroundColor: C.navy + '59', order: 2, dp: 1, unit: '%' },
      { type: 'line', label: 'Lãi phải thu / dư nợ', data: qa.map(x => x.r), borderColor: C.gold, backgroundColor: C.gold, yAxisID: 'y1', borderWidth: 2.5, order: 0, dp: 2, unit: '%' },
      { type: 'line', label: 'Tỷ lệ nợ xấu (NPL)', data: qa.map(x => x.npl ?? null), borderColor: C.red, backgroundColor: C.red, yAxisID: 'y1', borderDash: [5, 3], borderWidth: 2, pointRadius: 2, order: 0, dp: 2, unit: '%', spanGaps: true }] },
      options: { scales: { y: pctAxis('YoY'), y1: pctAxis('', { position: 'right', grid: { display: false } }) } } });
    if (D.ctx) { const X = D.ctx, qs = X.quarters, cq = qs.map(l => Q.find(q => q.q === l));
      mk('chAqPeer', { type: 'line', data: { labels: qs, datasets: [
        { label: 'NPL ' + T, data: cq.map(q => q && q.npl), borderColor: C.red, backgroundColor: C.red, dp: 2, unit: '%', borderWidth: 2.5 },
        { label: 'NPL ' + GRP, data: X.agg.npl[GRP], borderColor: C.purple, backgroundColor: C.purple, dp: 2, unit: '%' },
        { label: 'NPL ngành', data: X.agg.npl.all, borderColor: C.grey, backgroundColor: C.grey, borderDash: [5, 4], dp: 2, unit: '%' },
        { label: 'Nhóm 2 ' + T, data: cq.map(q => q && q.g2), borderColor: C.gold, backgroundColor: C.gold, dp: 2, unit: '%' },
        { label: 'Nhóm 2 ngành', data: X.agg.g2.all, borderColor: C.teal, backgroundColor: C.teal, borderDash: [5, 4], dp: 2, unit: '%' }] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' }); }
    mk('chNpl', { type: 'line', data: { labels: q16.map(q => q.q), datasets: [
      { label: 'NPL', data: q16.map(q => q.npl), borderColor: C.red, backgroundColor: C.red, dp: 2, unit: '%' },
      { label: 'Nhóm 2', data: q16.map(q => q.g2), borderColor: C.gold, backgroundColor: C.gold, dp: 2, unit: '%' }] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' });
    const qf = Q.filter(q => q.nplFormation != null);
    mk('chForm', { type: 'bar', data: { labels: qf.map(q => q.q), datasets: [
      { label: 'Hình thành nợ xấu ròng (tỷ)', data: qf.map(q => q.nplFormation), backgroundColor: qf.map(q => q.writeOffAct != null || !Q.some(z => z.writeOffAct != null) ? C.blue : C.blue + '66'), yAxisID: 'y', dp: 0 },
      { type: 'line', label: '% dư nợ quy năm', data: qf.map(q => q.nplFormationRate), borderColor: C.red, backgroundColor: C.red, yAxisID: 'y1', borderWidth: 1.2, pointRadius: 2, dp: 2, unit: '%' },
      { type: 'line', label: 'Bình quân 4 quý (% quy năm)', data: qf.map((q, i) => i < 3 ? null : +(qf.slice(i - 3, i + 1).reduce((a, z) => a + z.nplFormationRate, 0) / 4).toFixed(2)), borderColor: C.purple, backgroundColor: C.purple, yAxisID: 'y1', borderWidth: 2.6, pointRadius: 0, dp: 2, unit: '%', spanGaps: true }] },
      options: { scales: { y: numAxis('tỷ đồng'), y1: pctAxis('', { position: 'right', grid: { display: false } }) } } });
    mk('chLlr', { type: 'line', data: { labels: q16.map(q => q.q), datasets: [
      { label: 'LLR', data: q16.map(q => q.llr), borderColor: C.navy, backgroundColor: C.navy, dp: 0, unit: '%' },
      { label: 'LLR gồm lãi dự thu', data: q16.map(q => q.llrInclAccrued), borderColor: C.purple, backgroundColor: C.purple, borderDash: [5, 4], dp: 0, unit: '%' }] },
      options: { scales: { y: pctAxis() }, plugins: { refLines: { lines: [NR.llrRef ? { value: NR.llrRef.v, label: NR.llrRef.label, color: C.teal } : { value: 100, label: '100%', color: C.grey }] } } } }, { switch: 'line' });
    const qc = Q.filter(q => q.creditCost != null);
    mk('chCc', { type: 'bar', data: { labels: qc.map(q => q.q), datasets: [
      { label: 'Thu hồi nợ đã xử lý (tỷ/quý)', data: qc.map(q => q.recoveries), backgroundColor: C.teal, yAxisID: 'y1', dp: 0 },
      { type: 'line', label: 'Chi phí tín dụng TTM', data: qc.map(q => q.creditCost), borderColor: C.red, backgroundColor: C.red, yAxisID: 'y', dp: 2, unit: '%' }] },
      options: { scales: { y: pctAxis('% dư nợ'), y1: numAxis('tỷ đồng', { position: 'right', grid: { display: false } }) } } });
    drawCar('chCarAq');
    mk('chLev', { type: 'bar', data: { labels: Q.map(q => q.q), datasets: [
      { label: 'VCSH (tỷ)', data: Q.map(q => q.equity), backgroundColor: C.navy, yAxisID: 'y', dp: 0, order: 2 },
      { type: 'line', label: 'Tổng tài sản / VCSH (lần)', data: Q.map(q => q.equity ? q.ta / q.equity : null), borderColor: C.gold, backgroundColor: C.gold, yAxisID: 'y1', borderWidth: 2.5, dp: 1, unit: 'x', order: 0 }] },
      options: { scales: { y: numAxis('tỷ đồng'), y1: numAxis('lần', { position: 'right', grid: { display: false }, ticks: { callback: v => nf(v, 0) + 'x' } }) } } });
  }
  if (k === 'safe') {
    drawLdr('chLdrQ');
    const r = ldrRows();
    mk('chLdrRaw', { type: 'line', data: { labels: r.map(x => x.q), datasets: [
      { label: 'Cho vay / tiền gửi KH (thô)', data: r.map(x => x.raw), borderColor: C.purple, backgroundColor: C.purple, dp: 1, unit: '%', borderWidth: 2.2 },
      { label: 'LDR TT22 (KBNN 20%)', data: r.map(x => x.tt22), borderColor: C.navy, backgroundColor: C.navy, dp: 1, unit: '%', borderWidth: 2.5 },
      { label: 'Nếu KBNN tính 50%', data: r.map(x => x.k50), borderColor: C.teal, backgroundColor: C.teal, borderDash: [5, 4], dp: 1, unit: '%', spanGaps: true },
      { label: 'Nếu không tính KBNN', data: r.map(x => x.k0), borderColor: C.grey, backgroundColor: C.grey, borderDash: [2, 3], dp: 1, unit: '%', spanGaps: true }] },
      options: { scales: { y: pctAxis() }, plugins: { refLines: { lines: [{ value: 85, label: 'Trần 85% (TT22)', color: C.red }] } } } }, { switch: 'line', win: 60 });
    drawCar('chCarS');
    const qg = Q.filter(q => q.creditYoY != null).map(q => ({ q: q.q, c: q.creditYoY, ta: yoyQ('ta', Q.indexOf(q)), e: yoyQ('equity', Q.indexOf(q)) }));
    mk('chGrowS', { type: 'line', data: { labels: qg.map(x => x.q), datasets: [
      { label: 'Tín dụng YoY', data: qg.map(x => x.c), borderColor: C.navy, backgroundColor: C.navy, dp: 1, unit: '%' },
      { label: 'Tổng tài sản YoY', data: qg.map(x => x.ta), borderColor: C.teal, backgroundColor: C.teal, dp: 1, unit: '%' },
      { label: 'VCSH YoY', data: qg.map(x => x.e), borderColor: C.gold, backgroundColor: C.gold, dp: 1, unit: '%', borderWidth: 2.5 }] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' });
  }
  if (k === 'pv') {
    drawVal('chValF');
    const SB = (window.SECTOR_DATA || {}).banks;
    if (SB) {
      const qi = SB.quarters.length - 1, R = Object.entries(SB.series).map(([s, v]) => ({ s, g: v.group, x: v.roe[qi], y: v.pb[qi] })).filter(r => r.x != null && r.y != null);
      const [a0, b] = pbFit(R), xs = R.filter(r => r.x >= 10).map(r => r.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
      const grp = [...new Set(R.map(r => r.g))];
      mk('chPbRoe', { type: 'scatter', data: { datasets: [
        ...grp.map(g => ({ label: g, data: R.filter(r => r.g === g && r.s !== T).map(r => ({ x: r.x, y: r.y, s: r.s })), backgroundColor: PEER_COL[g] || C.grey, borderColor: PEER_COL[g] || C.grey, pointRadius: 5 })),
        { label: T, data: R.filter(r => r.s === T).map(r => ({ x: r.x, y: r.y, s: r.s })), backgroundColor: C.gold, borderColor: '#303540', borderWidth: 1.5, pointRadius: 8, pointStyle: 'rectRot' },
        { type: 'line', label: 'Hồi quy (ROE ≥ 10%)', data: [{ x: x0, y: a0 + b * x0 }, { x: x1, y: a0 + b * x1 }], borderColor: C.grey, borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5 }] },
        options: { interaction: { mode: 'nearest', intersect: true }, scales: { x: { type: 'linear', title: { display: true, text: 'ROE TTM (%)' }, ticks: { callback: v => nf(v, 0) + '%' } }, y: { title: { display: true, text: 'P/B (lần)' }, ticks: { callback: v => nf(v, 1) + 'x' } } },
          plugins: { tooltip: { callbacks: { label: c => c.raw.s ? `${c.raw.s}: ROE ${nf(c.raw.x, 1)}% · P/B ${nf(c.raw.y, 2)}x` : `Hồi quy: P/B ${nf(c.raw.y, 2)}x` } } } },
        plugins: [{ id: 'pbRoeLbl', afterDatasetsDraw(ch) { const ctx = ch.ctx; ctx.save(); ctx.font = '600 10px Arial'; ctx.fillStyle = '#303540'; ch.data.datasets.forEach((d, i) => { if (d.type === 'line') return; ch.getDatasetMeta(i).data.forEach((p, j) => ctx.fillText(d.data[j].s, p.x + 6, p.y - 5)); }); ctx.restore(); } }] });
    }
    const Ad = A.filter(a => a.y >= 2016), pl = A.filter(a => a.planDone).map(a => ({ l: String(a.y), v: a.planDone })).concat(P ? [{ l: P.ytdLabel, v: P.pbtDone, ytd: true }] : []);
    mk('chPlanDone', { type: 'bar', data: { labels: pl.map(x => x.l), datasets: [{ label: 'Hoàn thành KH LNTT', data: pl.map(x => x.v), backgroundColor: pl.map(x => x.ytd ? C.teal : x.v >= 100 ? C.navy : C.red), dp: 0, unit: '%' }] },
      options: { plugins: { legend: { display: false }, refLines: { lines: [{ value: 100, label: '100% kế hoạch', color: C.gold }] } }, scales: { y: pctAxis('', { min: 0 }) } } });
    mk('chDiv', { type: 'bar', data: { labels: Ad.map(a => String(a.y)), datasets: [
      { label: 'Cổ tức tiền (đ/CP)', data: Ad.map(a => a.cashDiv || 0), backgroundColor: C.navy, dp: 0, unit: 'đ', order: 2 },
      { label: 'Cổ tức cổ phiếu (%)', data: Ad.map(a => a.stockDiv || null), backgroundColor: C.teal, yAxisID: 'y1', dp: 1, unit: '%', order: 2 },
      { type: 'line', label: 'Tỷ lệ chi trả tiền mặt (%)', data: Ad.map(a => a.payout ?? null), borderColor: C.gold, backgroundColor: C.gold, yAxisID: 'y1', dp: 1, unit: '%', order: 1, keep: true, showLine: false, pointRadius: 5, pointStyle: 'rectRot' }] },
      options: { scales: { y: numAxis('đ/CP', { min: 0 }), y1: pctAxis('%', { position: 'right', grid: { display: false }, min: 0 }) } },
      plugins: [{ id: 'retain', afterDatasetsDraw(ch) { const { ctx, scales: { x, y } } = ch; ctx.save(); ctx.font = '600 10.5px Arial'; ctx.fillStyle = '#8a90a0'; ctx.textAlign = 'center';
        Ad.forEach((a, i) => { if (!a.cashDiv && !a.stockDiv) { const px = x.getPixelForValue(i); ctx.save(); ctx.translate(px, y.bottom - 8); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'left'; ctx.fillText('Giữ lại LN tăng vốn', 0, 4); ctx.restore(); } }); ctx.restore(); } }] });
    peer(); peerTs();
  }
}
function wf(id, parts, totalLabel, total) {   // waterfall theo % tổng; tooltip ghi tỷ đồng
  let acc = 0; const P = parts.map(([l, v]) => [l, v / total * 100, v]);
  const data = P.map(([, p]) => { const r = [acc, acc + p]; acc += p; return r; });
  const tyv = P.map(p => p[2]).concat([total]);
  mk(id, { type: 'bar', data: { labels: parts.map(p => p[0]).concat([totalLabel]), datasets: [{ label: '% tổng', data: data.concat([[0, 100]]),
    backgroundColor: parts.map((_, i) => C.steps[Math.min(i + 1, 5)]).concat([C.navy]), dp: 1 }] },
    options: { layout: { padding: { top: 18 } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${nf(c.raw[1] - c.raw[0], 1)}% · ${nf(tyv[c.dataIndex])} tỷ đồng` } } },
      scales: { y: pctAxis('% tổng', { min: 0, max: 100 }), x: { ticks: { autoSkip: false, maxRotation: 0, callback: function (v) { const l = this.getLabelForValue(v); if (l.length <= 12) return l; const w = l.split(' '); const h = Math.ceil(w.length / 2); return [w.slice(0, h).join(' '), w.slice(h).join(' ')]; } } } } },
    plugins: [{ id: 'wfLabels', afterDatasetsDraw(ch) { const ctx = ch.ctx; ch.getDatasetMeta(0).data.forEach((b, i) => { const r = ch.data.datasets[0].data[i]; ctx.save(); ctx.fillStyle = '#303540'; ctx.font = '600 11px Arial'; ctx.textAlign = 'center'; ctx.fillText(nf(r[1] - r[0], 1) + '%', b.x, Math.min(b.y, b.base) - 4); ctx.restore(); }); } }] });
}
function stack(id, qs, keys) {
  mk(id, { type: 'bar', data: { labels: qs.map(q => q.q), datasets: keys.map(([l, kk], i) => ({ label: l, data: qs.map(q => q[kk]), backgroundColor: [C.navy, C.blue, C.teal, C.purple, C.steps[4], C.gold][i], stack: 's', dp: 0 })) },
    options: { scales: { x: { stacked: true }, y: numAxis('tỷ đồng', { stacked: true }) } } });
}
/* ---------- So sánh nhóm nhiều kỳ ----------
   Mặt cắt theo kỳ: 26 NH niêm yết từ dashboard ngành (SECTOR_DATA.banks, Q1/2021 →).
   Diễn biến dài hạn: Big 4 niêm yết VCB, BID, CTG (BIG3, từ 2009) + bình quân Big 4 và ngành (gia quyền dư nợ). */
const PEER_M = [['nim', 'NIM', 2, 1], ['yea', 'YEA', 2, 1], ['cof', 'COF', 2, -1], ['casa', 'CASA', 1, 1], ['cir', 'CIR', 1, -1], ['roe', 'ROE', 1, 1], ['roa', 'ROA', 2, 1],
  ['npl', 'NPL', 2, -1], ['g2', 'Nhóm 2', 2, -1], ['llr', 'LLR', 0, 1], ['ldr', 'LDR', 1, 0], ['creditYoY', 'Tín dụng YoY', 1, 0], ['pb', 'P/B', 2, 0]];
const PEER_COL = { 'Big 4': C.navy, 'Tư nhân lớn': C.blue, 'Tư nhân vừa': C.steps[4], 'Tư nhân nhỏ': C.steps[5] };
const PG = ['Tất cả', 'Big 4', 'Tư nhân lớn', 'Tư nhân vừa', 'Tư nhân nhỏ'];
const pst = { k: 'nim', g: 'Tất cả', q: null, q0: null };
function peerSub() {
  const SB = (window.SECTOR_DATA || {}).banks; if (!SB) return '<div class="note keep">Chưa nạp dữ liệu ngành.</div>';
  const qs = SB.quarters; pst.q = pst.q || qs[qs.length - 1]; pst.q0 = pst.q0 || qs[Math.max(0, qs.indexOf(pst.q) - 4)];
  const opt = sel => qs.slice().reverse().map(q => `<option ${q === sel ? 'selected' : ''}>${q}</option>`).join('');
  return `<article class="card"><h3 class="sub">So sánh nhóm theo kỳ</h3>
      <p class="chart-sub">26 ngân hàng niêm yết · chọn chỉ tiêu, nhóm, kỳ và kỳ so sánh · NIM, YEA, COF, CIR, ROE, ROA là TTM · cột teal = ${T}</p>
      <div class="picker" id="peerPick">${PEER_M.map(([k, l]) => `<button type="button" data-k="${k}" class="${k === pst.k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="picker" id="peerGrp">${PG.map(g => `<button type="button" data-g="${g}" class="${g === pst.g ? 'on' : ''}">${g}</button>`).join('')}
        <label class="psel">Kỳ <select id="peerQ">${opt(pst.q)}</select></label><label class="psel">so với <select id="peerQ0">${opt(pst.q0)}</select></label></div>
      <div class="cbox tall"><canvas id="chPeer" role="img" aria-label="So sánh nhóm theo kỳ"></canvas></div>
      <div class="insight" id="peerIns"></div>
      <details class="more" open><summary>Bảng so sánh theo kỳ</summary><div class="tscroll" id="peerTbl"></div></details>
      <div class="src">Nguồn: BCTC các ngân hàng niêm yết qua Wi MCP (ratio_bank, ratio_bank_ttm, ratio_common_ttm); nhóm theo dashboard ngành</div></article>
    <article class="card"><h3 class="sub">${BIG ? 'Big 4' : GRP} niêm yết theo thời gian<span class="ctl" data-ctl="chPeerTs"></span></h3>
      <p class="chart-sub">${LTK.join(', ')} theo quý ${BIG ? 'từ 2009 (BID từ 2012)' : 'từ khi có số liệu'} · đường đứt = bình quân ${GRP} và toàn ngành từ 2021 (gia quyền dư nợ) · dùng nút khung thời gian để xem dài hạn</p>
      <div class="cbox tall"><canvas id="chPeerTs" role="img" aria-label="${GRP} theo thời gian"></canvas></div>
      <div class="insight" id="peerTsIns"></div>
      <div class="src">Nguồn: BCTC hợp nhất ${LTK.join(', ')} qua Wi MCP; bình quân nhóm từ dashboard ngành</div></article>`;
}
function peer(k) {
  const SB = (window.SECTOR_DATA || {}).banks; if (!SB) return;
  if (k) pst.k = k;
  const [key, lab, dp, dir] = PEER_M.find(m => m[0] === pst.k), unit = key === 'pb' ? 'x' : '%';
  const fmt = v => v == null ? '—' : key === 'pb' ? x(v) : pc(v, dp);
  const qi = SB.quarters.indexOf(pst.q), q0i = SB.quarters.indexOf(pst.q0);
  const all = Object.entries(SB.series).map(([s, v]) => ({ s, group: v.group, v: v[key] ? v[key][qi] : null, v0: v[key] ? v[key][q0i] : null }));
  const rows = all.filter(r => r.v != null && (pst.g === 'Tất cả' || r.group === pst.g || r.s === T)).sort((a, b) => b.v - a.v);
  mk('chPeer', { type: 'bar', data: { labels: rows.map(r => r.s), datasets: [
    { label: `${lab} ${pst.q}`, data: rows.map(r => r.v), backgroundColor: rows.map(r => r.s === T ? C.teal : PEER_COL[r.group] || C.grey), dp, unit },
    { type: 'line', label: `${lab} ${pst.q0}`, data: rows.map(r => r.v0), borderColor: C.gold, backgroundColor: C.gold, showLine: false, pointRadius: 4, pointStyle: 'rectRot', dp, unit, keep: true }] },
    options: { plugins: { legend: { display: true } }, scales: { x: { ticks: { autoSkip: false, maxRotation: 60 } }, y: key === 'pb' ? numAxis('lần', { ticks: { callback: v => nf(v, 1) + 'x' } }) : pctAxis() } } });
  // xếp hạng hiện tại và ở kỳ so sánh (trong toàn bộ 26 NH)
  const rk = (field) => { const s = all.filter(r => r[field] != null).sort((a, b) => b[field] - a[field]); const i = s.findIndex(r => r.s === T); return i < 0 ? null : { i: i + 1, n: s.length }; };
  const me = all.find(r => r.s === T), r1 = rk('v'), r0 = rk('v0');
  const big = all.filter(r => r.group === GRP && r.v != null).sort((a, b) => b.v - a.v);
  const better = dir === 1 ? 'cao → thấp, cao là tốt' : dir === -1 ? 'cao → thấp, thấp là tốt' : 'cao → thấp';
  $('#peerIns').innerHTML = me && me.v != null ? `${lab} của ${T} kỳ ${pst.q} <b>${fmt(me.v)}</b>, xếp <b>${r1.i}/${r1.n}</b> (${better})${me.v0 != null && r0 ? `; kỳ ${pst.q0}: ${fmt(me.v0)}, hạng ${r0.i}/${r0.n} — ${key === 'pb' ? sg(me.v - me.v0, 2, 'x') : sg(me.v - me.v0, dp, ' điểm %')}` : ''}. ${BIG ? 'Big 4 niêm yết' : 'Nhóm ' + GRP}: ${big.map(r => `${r.s} ${fmt(r.v)}${r.v0 != null ? ' (' + (key === 'pb' ? sg(r.v - r.v0, 2, 'x') : sg(r.v - r.v0, dp, '')) + ')' : ''}`).join(' · ')}. Điểm vàng = kỳ ${pst.q0}.` : `Chưa có số ${lab} của ${T} kỳ ${pst.q}.`;
  // bảng: các chỉ tiêu chính kỳ chọn và thay đổi so với kỳ so sánh
  const cols = [['nim', 'NIM', 2], ['cof', 'COF', 2], ['casa', 'CASA', 1], ['npl', 'NPL', 2], ['g2', 'Nhóm 2', 2], ['llr', 'LLR', 0], ['cir', 'CIR', 1], ['roe', 'ROE', 1], ['creditYoY', 'TD YoY', 1], ['ldr', 'LDR', 1]];
  const tr = Object.entries(SB.series).filter(([s, v]) => pst.g === 'Tất cả' || v.group === pst.g || s === T).sort((a, b) => ((b[1][key] || [])[qi] ?? -1e9) - ((a[1][key] || [])[qi] ?? -1e9));
  $('#peerTbl').innerHTML = `<table><thead><tr><th>Mã</th><th>Nhóm</th>${cols.map(([, l]) => `<th class="n">${l}</th>`).join('')}</tr></thead><tbody>${tr.map(([s, v]) => `<tr class="${s === T ? 'hl' : ''}"><td><b>${s}</b></td><td>${v.group}</td>${cols.map(([c, , d]) => { const a = v[c] ? v[c][qi] : null, b = v[c] ? v[c][q0i] : null; return `<td class="n">${a == null ? '—' : nf(a, d) + '%'}${a != null && b != null ? `<div class="pdl ${a - b > 0 ? "pdl-u" : a - b < 0 ? "pdl-d" : ""}">${sg(a - b, d, '')}</div>` : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table><div class="note keep">Dòng nhỏ dưới mỗi số = thay đổi (điểm %) so với ${pst.q0}.${(() => { const i = SB.quarters.indexOf(pst.q), n = SB.nRep ? SB.nRep[i] : null; return n != null && n < (SB.nAll || 26) ? ` ${pst.q}: mới ${n}/${SB.nAll || 26} ngân hàng công bố BCTC — ô trống là NH chưa công bố, bình quân nhóm và ngành của quý này chỉ gồm NH đã có số (đang cập nhật).` : ''; })()}</div>`;
  $$('#peerPick button').forEach(b => { b.classList.toggle('on', b.dataset.k === pst.k); b.onclick = () => { peer(b.dataset.k); peerTs(); }; });
  $$('#peerGrp button').forEach(b => { b.classList.toggle('on', b.dataset.g === pst.g); b.onclick = () => { pst.g = b.dataset.g; peer(); }; });
  const qS = $('#peerQ'), q0S = $('#peerQ0'); if (qS) qS.onchange = () => { pst.q = qS.value; peer(); }; if (q0S) q0S.onchange = () => { pst.q0 = q0S.value; peer(); };
}
function peerTs() {
  const B = window.BIG3, SB = (window.SECTOR_DATA || {}).banks, X = D.ctx; if (!B) return;
  const [key, lab, dp] = PEER_M.find(m => m[0] === pst.k), unit = key === 'pb' ? 'x' : '%';
  const col = { VCB: C.teal, BID: C.purple, CTG: C.navy, TCB: C.red, MBB: C.blue, ACB: C.teal, STB: C.navy, VPB: C.navy, HDB: C.purple };
  const agg = g => { if (!X || !X.agg[key] || !X.agg[key][g]) return B.quarters.map(() => null); return B.quarters.map(q => { const i = X.quarters.indexOf(q); return i < 0 ? null : X.agg[key][g][i]; }); };
  const ds = LTK.filter(s => B.series[s]).map(s => ({ label: s, data: B.series[s][key] || B.quarters.map(() => null), borderColor: col[s], backgroundColor: col[s], borderWidth: s === T ? 3 : 1.6, dp, unit, spanGaps: true }));
  if (X && X.agg[key]) ds.push({ label: 'Bình quân ' + GRP, data: agg(GRP), borderColor: C.gold, backgroundColor: C.gold, borderDash: [5, 4], dp, unit, spanGaps: true }, { label: 'Bình quân ngành', data: agg('all'), borderColor: C.grey, backgroundColor: C.grey, borderDash: [5, 4], dp, unit, spanGaps: true });
  mk('chPeerTs', { type: 'line', data: { labels: B.quarters, datasets: ds }, options: { scales: { y: key === 'pb' ? numAxis('lần', { beginAtZero: false, ticks: { callback: v => nf(v, 1) + 'x' } }) : pctAxis() } } }, { switch: 'line', win: 60 });
  const last = s => { const a = B.series[s][key] || []; for (let i = a.length - 1; i >= 0; i--) if (a[i] != null) return { v: a[i], q: B.quarters[i], i }; return null; };
  const me = last(T); if (!me) { $('#peerTsIns').innerHTML = ''; return; }
  const a5 = B.series[T][key][me.i - 20], hist = (B.series[T][key] || []).filter(v => v != null), avg = hist.reduce((a, b) => a + b, 0) / hist.length;
  const f = v => key === 'pb' ? x(v) : pc(v, dp);
  $('#peerTsIns').innerHTML = `${lab} ${T} ${me.q} <b>${f(me.v)}</b>${a5 != null ? `, 5 năm trước ${f(a5)}` : ''}; bình quân từ ${B.quarters[B.series[T][key].findIndex(v => v != null)]} là ${f(avg)}. ${LTK.filter(s => s !== T && B.series[s]).map(s => { const v = (B.series[s][key] || [])[me.i]; return v != null ? `${s} ${f(v)}` : ''; }).filter(Boolean).join(', ')} cùng kỳ.`;
}
function camel() {
  const Y = [2021, 2022, 2023, 2024, 2025].map(y => Q.find(q => q.year === y && q.quarter === 4)).filter(Boolean);
  const cols = Y.concat(lastN(Q, 2));
  const car = p => { const c = D.car.find(c => c.y === p.year && (p.quarter === 4 ? c.h === 0 : c.h === 2)); return c ? pc(c.car, 2) : '—'; };
  const rows = [
    ['C', 'CAR (TT41)', car], ['C', 'Đòn bẩy TS/VCSH', p => nf(p.ta / p.equity, 1) + 'x'],
    ['A', 'NPL', p => pc(p.npl, 2)], ['A', 'Nợ nhóm 2', p => pc(p.g2, 2)], ['A', 'Hình thành NPL quy năm*', p => pc(p.nplFormationRate, 2)],
    ['A', 'LLR', p => pc(p.llr, 0)], ['A', 'Chi phí tín dụng TTM*', p => pc(p.creditCost, 2)], ['A', 'Lãi dự thu/Tổng TS', p => pc(p.accruedToTA, 2)],
    ['M', 'CIR', p => pc(p.cir)],
    ['E', 'NIM', p => pc(p.nim, 2)], ['E', 'NIM sau dự phòng*', p => pc(p.nimAdj, 2)], ['E', 'YEA', p => pc(p.yea, 2)], ['E', 'COF', p => pc(p.cof, 2)],
    ['E', 'NFI/TOI', p => pc(p.nfiShare)], ['E', 'ROA', p => pc(p.roa, 2)], ['E', 'ROE', p => pc(p.roe)],
    ['L', 'Tăng trưởng tín dụng YoY', p => pc(p.creditYoY)], ['L', 'Tăng trưởng huy động YoY', p => pc(p.fundingYoY)], ['L', 'LDR (công thức Wi)', p => pc(p.ldr)],
    ['L', 'Cho vay/tiền gửi KH (thô)', p => pc(p.loansGross / p.deposits * 100)], ['L', 'CASA', p => pc(p.casa)],
  ];
  return `<article class="card"><h3 class="sub">Bảng CAMEL</h3><p class="chart-sub">Năm = số Q4 (chỉ số TTM); hai cột cuối là quý gần nhất. * = tự tính (xem công thức ở chân trang).</p><div class="tscroll"><table>
    <thead><tr><th></th><th>Chỉ tiêu</th>${cols.map(c => `<th class="n">${c.quarter === 4 && c !== QL && c !== QP ? c.year : c.q}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(([g, l, f]) => `<tr><td><b>${g}</b></td><td>${l}</td>${cols.map(c => `<td class="n">${f(c)}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div><div class="src">Nguồn: Wi MCP fs_bank, ratio_bank, ratio_bank_ttm, ratio_common_ttm, bank_car_tt41</div></article>${camelTT21()}`;
}
function camelTT21() {   // điểm TT21 của ngân hàng và vị trí trong nhóm NH quy mô lớn (dữ liệu từ dashboard ngành)
  const CM = (window.SECTOR_DATA || {}).camel; if (!CM) return '';
  const P = CM.periods[(D.ctx && D.ctx.camelPeriod) || 'TTM2Q26'] || CM.periods.TTM2Q26, R = P.rows, me = R.find(r => r.s === T); if (!me) return '';
  const peers = R.filter(r => r.big === me.big);
  const qual = CM.qualDefault, wl = Object.values(CM.crit).reduce((a, c) => a + c.wl, 0) / 100;
  const tot = r => r.quant.pt + wl * qual, gr = t => t >= 4.5 ? 'A' : t >= 3.5 ? 'B' : t >= 2.5 ? 'C' : t >= 1.5 ? 'D' : 'E';
  const rankAll = [...R].sort((a, b) => tot(b) - tot(a)).indexOf(me) + 1, rankP = [...peers].sort((a, b) => tot(b) - tot(a)).indexOf(me) + 1;
  const col = v => v == null ? '#eef0f4' : v >= 4.5 ? '#1e8f5a' : v >= 3.75 ? '#7cc49b' : v >= 3 ? '#f2d27a' : v >= 2.25 ? '#ef9f76' : '#c0392b';
  const med = a => { const x = a.filter(v => v != null).sort((p, q) => p - q); return x.length ? (x.length % 2 ? x[(x.length - 1) / 2] : (x[x.length / 2 - 1] + x[x.length / 2]) / 2) : null; };
  const unit = I => I.id === 'E4' ? ' ngày' : '%';
  const rows = CM.ind.filter(I => (me.big ? I.wL : I.wS) > 0).map(I => {
    const d = me.v[I.id], vals = peers.map(r => r.v[I.id].v).filter(v => v != null);
    const key = v => I.dir === 'up' ? -v : I.dir === 'zero' ? Math.abs(v) : v;
    const rk = d.v == null ? null : vals.filter(v => key(v) < key(d.v)).length + 1;
    const th = me.big ? I.thL : I.thS;
    return `<tr><td><b>${I.c}</b></td><td>${esc(I.name)}</td><td class="n">${d.v == null ? '<span class="muted">' + esc(I.missing || 'thiếu số') + '</span>' : nf(d.v, I.id === 'E4' ? 0 : 2) + unit(I)}</td>
      <td class="n">${med(vals) == null ? '—' : nf(med(vals), I.id === 'E4' ? 0 : 2) + unit(I)}</td><td class="n">${rk ? rk + '/' + vals.length : '—'}</td>
      <td class="n" style="color:#8a93a3">${th.map(x => nf(x, x % 1 ? 1 : 0)).join(' · ')}</td>
      <td class="n"><span style="display:inline-block;min-width:30px;border-radius:6px;padding:2px 6px;font-weight:700;text-align:center;background:${col(d.s)};color:${d.s != null && (d.s >= 5 || d.s < 3) ? '#fff' : '#303540'}">${d.s == null ? '1–5' : d.s}</span></td></tr>`;
  }).join('');
  const TS = tot(me);
  return `<article class="card"><h3 class="sub">${T} theo Thông tư 21/2025 · so với nhóm NH quy mô lớn</h3>
    <p class="chart-sub">${P.label} · ngưỡng của nhóm quy mô lớn (tổng tài sản bq &gt; 300 nghìn tỷ) · hạng trong nhóm: 1 = tốt nhất · định tính giả định ${nf(qual, 1)} điểm · chỉ tiêu không công bố chấm 1–5</p>
    <div class="kpis k4">${kpi('Điểm ước tính', nf(TS, 2) + ' · ' + gr(TS), 'khoảng ' + nf(me.quant.lo + wl * qual, 2) + '–' + nf(me.quant.hi + wl * qual, 2))}${kpi('Xếp hạng', rankP + '/' + peers.length + ' nhóm lớn', rankAll + '/' + R.length + ' toàn ngành')}${kpi('Room ngụ ý', nf(TS * CM.roomCoef, 1) + '%', 'điểm × ' + nf(CM.roomCoef, 1) + '% (công thức room 2026)')}${kpi('Tiêu chí yếu nhất', Object.entries(me.crit).sort((a, b) => a[1].pt - b[1].pt)[0][0] + ' · ' + nf(Object.entries(me.crit).sort((a, b) => a[1].pt - b[1].pt)[0][1].pt, 1), 'điểm tiêu chí 1–5')}</div>
    <div class="tscroll"><table><thead><tr><th></th><th>Chỉ tiêu TT21</th><th class="n">${T}</th><th class="n">Trung vị nhóm</th><th class="n">Hạng trong nhóm</th><th class="n">Ngưỡng 5 · 4 · 3 · 2</th><th class="n">Điểm</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="insight">Room năm N+2 được giao theo điểm xếp hạng năm N (công văn room 2026: điểm 2024 × 2,6%), nên số liệu năm 2026 của ${T} quyết định room 2028. So sánh đủ 26 ngân hàng, chỉnh điểm định tính và xem đòn bẩy room ở <a href="nganh.html#camel">dashboard Ngành › Bức tranh ngành › Xếp hạng TT21 &amp; room</a>.</div>
    <div class="src">Nguồn: BCTC hợp nhất, thuyết minh, báo cáo CAR TT41 của 26 NH niêm yết; ngưỡng, trọng số theo TT 21/2025/TT-NHNN · tự tính, ước tính (kết quả xếp hạng thật không công bố)</div></article>`;
}

/* =====================================================================
   TAB 4 · CATALYST & SỰ KIỆN
===================================================================== */
function paneEvents() {
  const types = ['Tất cả', ...new Set(D.events.map(e => e.type))];
  const up = D.events.filter(e => e.status === 'pending').sort((a, b) => a.d.localeCompare(b.d));
  $('#events').innerHTML = `<h2 class="sec">Catalyst &amp; sự kiện — KQKD, CBTT, chính sách, vốn</h2>
  <p class="sec-sub">Dấu ± là đánh giá sơ bộ chiều tác động tới lợi nhuận/định giá (AI), analyst có thể ghi đè trong Nhật ký ở tab FinSuccess.</p>
  <article class="card"><h3 class="sub">Sắp tới</h3><div class="tscroll"><table><thead><tr><th>Ngày (dự kiến)</th><th>Loại</th><th>±</th><th>Sự kiện</th><th>Nguồn</th></tr></thead><tbody>
    ${up.map(e => `<tr><td style="white-space:nowrap">${dvn(e.d)}</td><td>${esc(e.type)}</td><td>${impact(e.impact)}</td><td><b>${esc(e.t)}</b>${e.detail ? `<div class="note">${esc(e.detail)}</div>` : ''}</td><td class="src">${esc(e.src)}</td></tr>`).join('')}
  </tbody></table></div>${NR.eventsNote ? `<div class="note">${esc(NR.eventsNote)}</div>` : ''}</article>
  <article class="card"><h3 class="sub">Dòng sự kiện</h3>
    <div class="filter" id="evFilter">${types.map((t, i) => `<button type="button" data-t="${esc(t)}" class="${i ? '' : 'on'}">${esc(t)}</button>`).join('')}</div>
    <div class="tscroll"><table><thead><tr><th>Ngày</th><th>Loại</th><th>±</th><th>Sự kiện</th><th>Trạng thái</th></tr></thead><tbody id="evBody"></tbody></table></div>
    <div class="src">Nguồn: HOSE CBTT, Wi MCP co_events, ai_news</div></article>`;
  const draw = t => { $('#evBody').innerHTML = D.events.filter(e => t === 'Tất cả' || e.type === t).map(e => `<tr><td style="white-space:nowrap">${dvn(e.d)}</td><td>${esc(e.type)}</td><td>${impact(e.impact)}</td><td>${esc(e.t)}${e.detail ? `<details class="more"><summary>Chi tiết</summary><div class="note">${esc(e.detail)}</div></details>` : ''}<div class="src">${esc(e.src)}</div></td><td>${e.status === 'pending' ? '<span class="pill pending">Chờ</span>' : '<span class="pill ok">Xác nhận</span>'}</td></tr>`).join('');
    $$('#evFilter button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); };
  $$('#evFilter button').forEach(b => b.onclick = () => draw(b.dataset.t)); draw('Tất cả');
}

/* =====================================================================
   TAB 5 · CONSENSUS CTCK
===================================================================== */
let cpbSel = null;
function drCpb() {
  const H = (window.SECTOR_DATA || {}).pbHist, PD = D.pbDaily || {}; if (!$('#chCpb')) return;
  const qEnd = d => /-(03-31|06-30|09-30|12-31)$/.test(d);
  let ser, daily = false;   // [[ngày ISO, P/B]]
  if (cpbSel !== '_med' && PD[cpbSel]) { ser = PD[cpbSel]; daily = true; }
  else if (cpbSel === '_med' && PD._median) { ser = PD._median; daily = true; }
  else if (cpbSel === '_med' && H) { const a = H.median; ser = a.filter(p => qEnd(p[0])).concat(qEnd(a[a.length - 1][0]) ? [] : [a[a.length - 1]]); }
  else if (H && H.banks[cpbSel]) { const a = H.banks[cpbSel]; ser = a.filter(p => qEnd(p[0])).concat(qEnd(a[a.length - 1][0]) ? [] : [a[a.length - 1]]); }
  if (!ser || !ser.length) return;
  const v = ser.map(p => p[1]), m = v.reduce((a, b) => a + b, 0) / v.length, sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length), now = v[v.length - 1], last = ser[ser.length - 1][0];
  const own = cpbSel === T, nm = cpbSel === '_med' ? 'Trung vị ngành' : cpbSel;
  // P/B tại giá mục tiêu: TP / BVPS 2026F (giá trị sổ sách cuối năm) — nối từ phiên gần nhất tới 31/12
  const yEnd = `${last.slice(0, 4)}-12-31`, my = store.get().decision;
  const tgt = own && FW.bvps2026F ? [[CS.summary.median, 'TP trung vị CTCK', C.red], ...(my && +my.tp ? [[+my.tp, 'TP của tôi', C.teal]] : [])].filter(t => t[0]).map(([tp, l, c]) => ({ tp, l, c, pb: tp / FW.bvps2026F })) : [];
  const fut = [];
  if (tgt.length && yEnd > last) { const d = new Date(last + 'T00:00:00Z'); while (true) { d.setUTCDate(d.getUTCDate() + 1); const iso = d.toISOString().slice(0, 10); if (iso > yEnd) break; const wd = d.getUTCDay(); if (wd && wd !== 6) fut.push(iso); } if (fut[fut.length - 1] !== yEnd) fut.push(yEnd); }
  const dates = ser.map(p => p[0]).concat(fut), n0 = ser.length;
  const medM = H ? new Map(H.median.map(p => [p[0], p[1]])) : new Map();
  const ds = [{ label: 'P/B ' + nm, data: v.concat(fut.map(() => null)), borderColor: own ? C.navy : C.blue, backgroundColor: own ? C.navy : C.blue, borderWidth: daily ? 1.8 : 2.6, pointRadius: daily ? 0 : 1.5, dp: 2, unit: 'x' }];
  const medAt = new Map(PD._median && daily ? PD._median : []);
  if (!daily && H) { const td = ser.map(p => p[0]); H.median.filter(p => qEnd(p[0])).forEach(([q, val]) => { let k = -1; for (let i = 0; i < td.length && td[i] <= q; i++) k = i; if (k >= 0) medAt.set(td[k], val); }); }
  if (cpbSel !== '_med' && medAt.size) ds.push({ label: daily && PD._median ? 'Trung vị 26 NH niêm yết' : 'Trung vị ngành (cuối quý)', data: dates.map(d => medAt.has(d) ? medAt.get(d) : null), borderColor: C.grey, backgroundColor: C.grey, borderDash: [4, 3], borderWidth: 1.3, pointRadius: 0, dp: 2, unit: 'x', spanGaps: !daily, endLbl: ['Trung vị 26 NH', (() => { const a = [...medAt.entries()].filter(e => e[0] <= last).sort(); return a.length ? `${x(a[a.length - 1][1])} (${dvn(a[a.length - 1][0])})` : ''; })()] });
  tgt.forEach(t => ds.push({ endLbl: [`Nếu đạt ${t.l}`, `${nf(t.tp)}đ vào 31/12`, `→ P/B ${x(t.pb)} (BVPS 2026F)`], label: `Tới ${t.l} ${nf(t.tp)}đ (P/B ${x(t.pb)} cuối năm)`, data: dates.map((d, i) => i < n0 - 1 ? null : +(now + (t.pb - now) * (i - (n0 - 1)) / (dates.length - n0)).toFixed(3)), borderColor: t.c, backgroundColor: t.c, borderDash: [6, 4], borderWidth: 2, pointRadius: dates.map((d, i) => i === dates.length - 1 ? 4 : 0), dp: 2, unit: 'x', keep: true, clip: false, pbEnd: t.pb, tpEnd: t.tp, tl: t.l }));
  const lines = [{ value: m, label: `TB ${x(m)}`, color: C.grey, dash: [2, 3] }, { value: m + sd, label: `+1σ ${x(m + sd)}`, color: '#c9a227', dash: [6, 4] }, { value: m - sd, label: `−1σ ${x(m - sd)}`, color: '#c9a227', dash: [6, 4] }];
  ds[0].endLbl = [`${nm} hiện tại`, `${x(now)} (${dvn(last)})`];
  const wide = ($('#chCpb').parentElement.clientWidth || 800) >= 640;
  const endLbl = { id: 'cpbEnd', afterDatasetsDraw(ch) { if (!wide) return;   // nhãn giải thích ở khoảng trắng bên phải, mỗi đường một nhãn, tránh chồng nhau
    const { ctx, chartArea: a } = ch, L = [];
    ch.data.datasets.forEach((d, i) => { if (!d.endLbl || !ch.isDatasetVisible(i)) return; const meta = ch.getDatasetMeta(i); let k = d.data.length - 1; while (k >= 0 && d.data[k] == null) k--; if (k < 0 || !meta.data[k]) return;
      L.push({ y: meta.data[k].y, x: meta.data[k].x, t: [].concat(d.endLbl), c: d.borderColor }); });
    L.sort((p, q) => p.y - q.y); for (let i = 1; i < L.length; i++) L[i].y = Math.max(L[i].y, L[i - 1].y + 13 * L[i - 1].t.length + 4);
    ctx.save(); ctx.font = '600 10.5px Arial'; ctx.textBaseline = 'middle';
    L.forEach(l => { ctx.fillStyle = l.c; l.t.forEach((t, j) => ctx.fillText(t, a.right + 10, l.y + j * 13)); });
    ctx.restore(); } };
  // TB và ±1σ tính theo khung thời gian đang xem (1Y, 3Y…, kéo zoom): đổi khung thì đường và lời đọc tính lại
  function cpbInsW(i0, i1) {
    const w = v.slice(i0, i1 + 1).filter(y => y != null); if (!w.length) return;
    const mw = w.reduce((a, b) => a + b, 0) / w.length, sw = Math.sqrt(w.reduce((a, b) => a + (b - mw) ** 2, 0) / w.length);
    lines[0].value = mw; lines[0].label = `TB ${x(mw)}`; lines[1].value = mw + sw; lines[1].label = `+1σ ${x(mw + sw)}`; lines[2].value = mw - sw; lines[2].label = `−1σ ${x(mw - sw)}`;
    const z = sw ? (now - mw) / sw : 0, pct = w.filter(y => y <= now).length / w.length * 100, per = `${dvn(ser[i0][0])} – ${dvn(ser[i1][0])}`;
    const el = $('#cpbIns'); if (!el) return;
    el.innerHTML = `${nm}: P/B <b>${x(now)}</b> (${dvn(last)}), ${z >= 0 ? 'cao' : 'thấp'} hơn trung bình ${x(mw)} của khung ${per} <b>${nf(Math.abs(z), 1)} độ lệch chuẩn</b>; cao hơn ${nf(pct, 0)}% số ${daily ? 'phiên' : 'quý'} trong khung (thấp nhất ${x(Math.min(...w))}, cao nhất ${x(Math.max(...w))}).`
      + tgt.map((t, k) => ` ${k ? '' : 'Nếu giá đạt '}${t.l} <b>${nf(t.tp)}đ</b> vào cuối năm, P/B trên BVPS 2026F là <b>${x(t.pb)}</b> — ${t.pb > mw + sw ? 'cao hơn mốc +1σ' : t.pb > mw ? 'trên trung bình nhưng trong dải ±1σ' : t.pb > mw - sw ? 'dưới trung bình của khung' : 'dưới mốc −1σ'} (giá ${sg((t.tp / M.price - 1) * 100, 0)} so với hiện tại).`).join('');
  }
  let cpbW = '';
  const cpbStat = { id: 'cpbStat', beforeDatasetsDraw(ch) {
    const sx = ch.scales.x; if (!sx) return;
    const i0 = Math.max(0, Math.ceil(sx.min ?? 0)), i1 = Math.min(n0 - 1, Math.floor(sx.max ?? n0 - 1)); if (i1 < i0) return;
    const key = i0 + '-' + i1; if (key === cpbW) return; cpbW = key; cpbInsW(i0, i1); } };
  mk('chCpb', { type: 'line', data: { labels: dates.map(dvn), datasets: ds }, plugins: [endLbl, cpbStat], options: { layout: { padding: { right: wide ? 165 : 0 } }, plugins: { refLines: { lines }, tooltip: { filter: it => !it.dataset.keep || it.dataIndex >= n0, callbacks: { title: its => its.length && its[0].dataIndex >= n0 ? 'Dự phóng 31/12/' + dates[dates.length - 1].slice(0, 4) : its.length ? its[0].label : '', label: c => c.dataset.keep ? `${c.dataset.tl}: P/B ${x(c.dataset.pbEnd)} (TP ${nf(c.dataset.tpEnd)}đ, BVPS 2026F)` : c.parsed.y == null ? null : `${c.dataset.label}: ${x(c.parsed.y)}` } } }, scales: { x: { ticks: { maxTicksLimit: 12 } }, y: numAxis('', { beginAtZero: false, ticks: { callback: z => nf(z, 1) + 'x' } }) } } }, { win: 36, anchor: n0 - 1 });
  $('#cpbH').textContent = own ? `P/B ${T} theo phiên và P/B ngụ ý tại giá mục tiêu` : cpbSel === '_med' ? 'P/B trung vị ngành ngân hàng (26 ngân hàng niêm yết)' : `P/B ${cpbSel} theo phiên so với trung vị ngành`;
  $('#cpbSub').textContent = `Lần · ${daily ? `theo phiên từ ${dvn(ser[0][0])}` : `cuối mỗi quý từ ${dvn(ser[0][0])}`} · đường xám = trung bình, vàng = ±1 độ lệch chuẩn trong khung thời gian đang xem${tgt.length ? ` · nét đứt = P/B đi từ hiện tại tới giá mục tiêu vào 31/12, tính trên BVPS 2026F ${nf(FW.bvps2026F)}đ` : ''} · bấm lại mã đang chọn để về ${T}`;
  const peers = H ? Object.keys(H.banks).filter(b => b !== T && (D.peers.rows || []).some(r => (r.symbol || r.s) === b && r.group === GRP)) : [];
  $('#cpbPick').innerHTML = [T, ...peers, '_med'].map(b => `<button type="button" data-b="${b}" class="${b === cpbSel ? 'on' : ''}">${b === '_med' ? 'Trung vị ngành' : b}</button>`).join('');
  $$('#cpbPick button').forEach(b => b.onclick = () => { cpbSel = b.dataset.b === cpbSel ? T : b.dataset.b; drCpb(); });
  const z = sd ? (now - m) / sd : 0, pct = v.filter(y => y <= now).length / v.length * 100;
  cpbInsW(0, n0 - 1);
}
function paneCons() {
  const S = CS.summary; const s = store.get(); const myTp = s.decision && +s.decision.tp;
  const rows = CS.rows; const P = D.plan;
  const np = [...rows.filter(r => r.npF), ...CS.forecastOnly];
  const runRate = P ? P.npatYTD * 4 / P.ytdQuarters : null;
  const tpAdjNote = rows.some(r => r.tpOrig) ? ' TP công bố trước ngày GDKHQ đã quy về cùng cơ sở số CP hiện tại: (TP − cổ tức tiền + tỷ lệ quyền mua × giá phát hành) / (1 + tỷ lệ CP mới); bảng ghi kèm giá gốc.' : '';
  const PA = D.pbAdjNote, pbNote = 'P/B tính lại = vốn hóa thực tại phiên / VCSH thuộc cổ đông ngân hàng mẹ. CP mới từ cổ tức cổ phiếu, thưởng, quyền mua được tính ngay từ ngày GDKHQ; tiền thu từ quyền mua và cổ tức tiền mặt phát sinh sau ngày khóa sổ BCTC gần nhất được cộng/trừ thẳng vào VCSH, không chờ BCTC quý sau.'
    + (PA && PA.events.length ? ` Đang áp dụng (sau BCTC ${dvn(PA.q)}): ${PA.events.map(e => esc(e.t) + ' (GDKHQ ' + dvn(e.ex) + ')').join('; ')}.` : '') + ' Trung vị 26 NH chưa tính lại theo cách này (định nghĩa VCSH khác, thường lệch 1–4%).';
  $('#cons').innerHTML = `<h2 class="sec">Consensus CTCK</h2>
  <div class="kpis">
    ${kpi('Median TP', nf(S.median) + 'đ', sg(S.upsideMedian) + ' vs giá', 'pos')}
    ${kpi('TB TP', nf(S.mean) + 'đ', 'min ' + nf(S.min) + ' · max ' + nf(S.max))}
    ${kpi('Khuyến nghị MUA', S.buy + '/' + S.n, 'CTCK có TP ≤ 3 tháng')}
    ${kpi('TP của tôi', myTp ? nf(myTp) + 'đ' : '—', myTp ? sg((myTp / M.price - 1) * 100) + ' vs giá' : 'nhập ở tab FinSuccess')}
    ${kpi('LNST 2026F (median)', nf(S.npMedian) + ' tỷ', sg((S.npMedian / FW.npat2025 - 1) * 100) + ' vs 2025 · ' + S.npN + ' dự phóng')}
    ${kpi('P/E · P/B forward', x(FW.peFwd) + ' · ' + x(FW.pbFwd), 'BVPS 2026F ' + nf(FW.bvps2026F) + 'đ')}
  </div>
  <article class="card" id="cpbCard"><h3 class="sub" id="cpbH"></h3>
    <p class="chart-sub" id="cpbSub"></p>
    <div class="picker" id="cpbPick"></div>
    <div class="cbox"><canvas id="chCpb" role="img" aria-label="P/B lịch sử"></canvas></div>
    <p class="cnote">${pbNote}</p>
    <div class="insight" id="cpbIns"></div>
    <div class="src">Nguồn: BCTC (giá trị sổ sách), giá đóng cửa, báo cáo CTCK (giá mục tiêu) · tự tính</div></article>
  <h3 class="sub" style="margin:6px 0 10px">Dải dự phóng của các công ty chứng khoán</h3>
  <div class="grid g2 gap">
    ${card({ id: 'chTp', title: 'Giá mục tiêu từng CTCK', sub: 'đ/CP · đường đỏ = thị giá ' + nf(M.price) + 'đ · nhãn = upside', h: 'tall',
      body: `<p class="cnote">Màu xám = báo cáo trước ${dvn(CS.fadeBefore)} (> 3 tháng), không vào thống kê.${tpAdjNote}</p>`,
      insight: (() => { const live = rows.filter(r => r.tp && !r.stale), hi = live.reduce((a, b) => b.tp > a.tp ? b : a, live[0]), lo = live.reduce((a, b) => b.tp < a.tp ? b : a, live[0]), below = live.filter(r => r.tp < M.price).length;
        return `Dải TP <b>${nf(S.min)}–${nf(S.max)}đ</b> (upside ${sg((S.min / M.price - 1) * 100, 0)} đến ${sg((S.max / M.price - 1) * 100, 0)}); ${below ? below + ' CTCK có TP dưới thị giá' : 'không CTCK nào có TP dưới thị giá'}. Cao nhất ${esc(hi.broker)} (${nf(hi.tp)}đ, ${dvn(hi.date)}), thấp nhất ${esc(lo.broker)} (${nf(lo.tp)}đ, ${dvn(lo.date)}). ${esc(NR.tpSpread || '')}`; })() })}
    ${card({ id: 'chNp', title: 'LNST 2026F từng CTCK và kế hoạch ĐHĐCĐ', sub: 'tỷ đồng · nhãn = YoY so với LNST 2025 ' + nf(FW.npat2025) + ' tỷ · xám = run-rate ' + (P ? P.ytdLabel : '') + ' × 2', h: 'tall',
      body: `<p class="cnote">Màu nhạt = báo cáo trước ${dvn(CS.fadeBefore)} (> 3 tháng), không vào thống kê. Xám = run-rate ${P ? P.ytdLabel : ''} × 2.</p>`,
      insight: `Dự phóng 2026 nằm trong khoảng <b>${nf(S.npMin)}–${nf(S.npMax)}</b> tỷ (${sg((S.npMin / FW.npat2025 - 1) * 100, 0)} đến ${sg((S.npMax / FW.npat2025 - 1) * 100, 0)} YoY), ${S.npMin > P.npat ? 'đều cao hơn' : S.npMax < P.npat ? 'đều thấp hơn' : 'bao quanh'} KH ĐHĐCĐ <b>${nf(P.npat)}</b> tỷ. ${P.ytdLabel} đã đạt <b>${nf(FW.npatH1)}</b> tỷ (${sg(P.npatYTDyoy)} YoY, ${pc(P.npatDone)} KH). Để khớp median, H2 cần <b>${nf(FW.impliedH2)}</b> tỷ — <b>${sg((FW.impliedH2 / FW.h2_2025 - 1) * 100)}</b> so với H2/2025 (${nf(FW.h2_2025)} tỷ), ${(FW.impliedH2 / FW.h2_2025 - 1) * 100 < P.npatYTDyoy ? `thấp hơn tốc độ H1 (${sg(P.npatYTDyoy)}): consensus đã giả định lợi nhuận chậm lại nửa cuối năm` : `cao hơn tốc độ H1 (${sg(P.npatYTDyoy)}): consensus kỳ vọng lợi nhuận tăng tốc nửa cuối năm`}.` })}
  </div>
  <article class="card"><h3 class="sub">Chi tiết báo cáo</h3><div class="tscroll"><table><thead><tr><th>CTCK</th><th>Ngày</th><th>KN</th><th class="n">TP</th><th class="n">Upside</th><th class="n">TOI 2026F</th><th class="n">TOI 2027F</th><th class="n">LNST 2026F</th><th class="n">LNST 2027F</th><th>Luận điểm</th></tr></thead><tbody>
    ${[...rows, ...CS.forecastOnly].map(r => `<tr class="${r.stale ? 'stale' : ''}"><td><b>${esc(r.broker)}</b></td><td>${dvn(r.date)}</td><td>${esc(r.rating)}</td><td class="n">${r.tp ? nf(r.tp) : '—'}${r.tpOrig ? `<br><small class="muted">gốc ${nf(r.tpOrig)}</small>` : ''}</td><td class="n">${r.tp ? sg(r.upside, 0) : '—'}</td><td class="n">${nf(r.toiF)}</td><td class="n">${nf(r.toiF1)}</td><td class="n">${nf(r.npF)}</td><td class="n">${nf(r.npF1)}</td><td>${esc(r.thesis)}${r.summary ? `<details class="more"><summary>Tóm tắt</summary><div class="note">${esc(r.summary)}</div></details>` : ''}</td></tr>`).join('')}
  </tbody></table></div><p class="cnote">Dòng mờ = báo cáo trước ${dvn(CS.fadeBefore)} (> 3 tháng). KN là khuyến nghị quy về 3 mức: MUA gồm cả Khả quan/Outperform.${tpAdjNote}</p><div class="src">Nguồn: ${esc(CS.src)}</div></article>`;
  cpbSel = T; drCpb();
  const tr = [...rows].sort((a, b) => a.tp - b.tp);
  const fade = (c, r) => r.stale ? c + '55' : c;
  mk('chTp', { type: 'bar', data: { labels: tr.map(r => `${r.broker} ${dvn(r.date).slice(0, 5)}`), datasets: [
    { label: 'TP', data: tr.map(r => [M.price, r.tp]), backgroundColor: tr.map(r => fade(C.navy, r)), barThickness: 4, dp: 0 },
  ] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, refLines: { lines: [{ axis: 'x', value: M.price, label: 'Thị giá', color: C.red }] },
      tooltip: { callbacks: { label: c => { const r = tr[c.dataIndex]; return `TP ${nf(r.tp)}đ · upside ${sg(r.upside, 0)} · ${r.rating}`; } } } },
    scales: { x: numAxis('đ/CP', { min: Math.min(Math.floor(M.price * 0.95 / 1000) * 1000, Math.floor(Math.min(...tr.map(r => r.tp)) * 0.93 / 1000) * 1000) }), y: { ticks: { autoSkip: false, font: { size: 10.5 } } } } },
    plugins: [{ id: 'upLab', afterDatasetsDraw(ch) { const ctx = ch.ctx; ch.getDatasetMeta(0).data.forEach((b, i) => { ctx.save(); const col = tr[i].stale ? '#b9c0cc' : C.navy, X = ch.scales.x.getPixelForValue(tr[i].tp), neg = tr[i].tp < M.price; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X, b.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = tr[i].stale ? '#9aa3b2' : neg ? C.red : C.navy; ctx.font = '600 11px Arial'; ctx.textAlign = neg ? 'right' : 'left'; ctx.fillText(sg(tr[i].upside, 0), neg ? X - 10 : X + 10, b.y + 4); ctx.restore(); }); } }] });
  const nr = [...np].sort((a, b) => a.npF - b.npF);
  const lab = nr.map(r => `${r.broker} (${sg((r.npF / FW.npat2025 - 1) * 100, 0)})`).concat(['KH ĐHĐCĐ (' + sg((P.npat / FW.npat2025 - 1) * 100, 0) + ')', 'Run-rate ' + P.ytdLabel + ' ×2']);
  mk('chNp', { type: 'bar', data: { labels: lab, datasets: [{ label: 'LNST 2026F', dp: 0, unit: ' tỷ',
    data: nr.map(r => r.npF).concat([P.npat, runRate]),
    backgroundColor: nr.map(r => fade(C.teal, r)).concat([C.navy, '#c9ced8']), borderColor: nr.map(() => 'transparent').concat([C.navy, '#9aa3b2']), borderWidth: 1 }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false }, refLines: { lines: [{ axis: 'x', value: FW.npat2025, label: 'LNST 2025', color: C.purple }] } }, scales: { x: numAxis('tỷ đồng', { min: 0 }), y: { ticks: { autoSkip: false, font: { size: 10.5 } } } } } });
  [['chTp', tr.length], ['chNp', lab.length]].forEach(([id, n]) => { const b = document.getElementById(id)?.parentElement; if (b) b.style.height = Math.max(340, n * 21 + 70) + 'px'; });   // đủ chỗ cho mọi nhãn CTCK
}

/* =====================================================================
   TAB 6 · 💎 FINSUCCESS
===================================================================== */
const SCEN_DEFAULT = [
  { k: 'ease', n: 'Nới lỏng mạnh', roe: 20, coe: 13, g: 4 },
  { k: 'room', n: 'Dư địa bơm tiền', roe: 19, coe: 14, g: 4 },
  { k: 'drain', n: 'NHNN hút tiền về', roe: 18, coe: 15, g: 4 },
  { k: 'tight', n: 'Thắt chặt kéo dài', roe: 16, coe: 16, g: 4 },
];
function paneVal() {
  const s = store.get(); const dec = s.decision || {}; const pbB = VB.pbBand, peB = VB.peBand;
  const scen = s.scen || SCEN_DEFAULT;
  $('#val').innerHTML = `<h2 class="sec">FinSuccess — định giá &amp; quyết định đầu tư</h2>
  <div class="subtabs"><button type="button" data-v="1" class="on">1 · Quyết định &amp; vị thế định giá</button><button type="button" data-v="2">2 · Kịch bản lãi suất &amp; rủi ro</button><button type="button" data-v="3">3 · Thesis &amp; nhật ký</button></div>
  <div class="sub on" data-vp="1">
    <article class="card fsn" id="decNote"></article>
    <article class="card"><h3 class="sub">Vị thế định giá so với lịch sử</h3><p class="chart-sub">Dải ±1σ trên 20 quý (${pbB.from}–${pbB.to}); giá quy đổi = bội số × BVPS hiện tại / BVPS 2026F</p>
      <div class="grid g2">
        <div><h4 style="margin:0 0 8px;color:var(--navy)">P/B hiện tại ${x(M.pb)} · forward ${x(FW.pbFwd)}</h4><table><thead><tr><th>Mốc</th><th class="n">P/B</th><th class="n">Giá (BVPS hiện tại)</th><th class="n">Giá (BVPS 2026F)</th></tr></thead><tbody>
          ${[['−1σ', pbB.lo], ['Trung bình', pbB.mean], ['+1σ', pbB.hi]].map(([l, v]) => `<tr><td>${l}</td><td class="n">${x(v)}</td><td class="n">${r100(v * M.bvps)} <small>(${sg((v * M.bvps / M.price - 1) * 100, 0)})</small></td><td class="n">${nf(v * FW.bvps2026F)} <small>(${sg((v * FW.bvps2026F / M.price - 1) * 100, 0)})</small></td></tr>`).join('')}
        </tbody></table></div>
        <div><h4 style="margin:0 0 8px;color:var(--navy)">P/E TTM ${x(M.pe)} · forward ${x(FW.peFwd)}</h4><table><thead><tr><th>Mốc</th><th class="n">P/E</th><th class="n">Giá (EPS TTM)</th></tr></thead><tbody>
          ${[['−1σ', peB.lo], ['Trung bình', peB.mean], ['+1σ', peB.hi]].map(([l, v]) => `<tr><td>${l}</td><td class="n">${x(v)}</td><td class="n">${nf(v * M.eps)} <small>(${sg((v * M.eps / M.price - 1) * 100, 0)})</small></td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <div class="insight">P/B <b>${x(M.pb)}</b> ${M.pb < pbB.lo ? 'thấp hơn mốc −1σ' : M.pb < pbB.mean ? 'dưới trung bình, trên mốc −1σ' : 'trên trung bình'} (${x(pbB.lo)}–${x(pbB.mean)}) trong khi ROE TTM <b>${pc(QL.roe)}</b>${QL.roe >= maxIn('roe', 32) ? ' cao nhất 8 năm' : ''} — theo deck, P/B thấp kèm ROE ổn định là vùng hấp dẫn; điều kiện ngược lại là chất lượng tài sản (LLR ${pc(QL.llr, 0)}, hình thành nợ xấu ${pc(QL.nplFormationRate, 2)}) và CAR ${pc(D.car[D.car.length - 1].car, 2)}.</div>
    </article>
    ${card({ id: 'chVal', title: 'P/B và P/E TTM theo quý', sub: 'lần · cuối quý · đường đứt = trung bình 20 quý', ctl: true, src: 'Wi MCP ratio_common_ttm' })}
  </div>
  <div class="sub" data-vp="2">
    <article class="card"><h3 class="sub">Định giá theo kịch bản lãi suất (thu nhập thặng dư)</h3>
      <p class="chart-sub">P/B hợp lý = (ROE − g)/(COE − g), áp lên BVPS 2026F ${nf(FW.bvps2026F)}đ. Bốn kịch bản theo ma trận IDX-FX × IDX-LIQ (deck slide 39). <b>Giá trị khởi tạo chỉ để thử — chưa phải giả định của FinSuccess</b>; analyst sửa và lưu.${esc(NR.modelNote || '')}</p>
      <div class="tscroll"><table id="scTable"><thead><tr><th>Kịch bản</th><th class="n">ROE bền vững %</th><th class="n">COE %</th><th class="n">g %</th><th class="n">P/B hợp lý</th><th class="n">Giá hợp lý</th><th class="n">Upside</th></tr></thead><tbody>
        ${scen.map((r, i) => `<tr data-i="${i}"><td><b>${esc(r.n)}</b></td><td class="n"><input data-f="roe" value="${r.roe}" style="width:70px"></td><td class="n"><input data-f="coe" value="${r.coe}" style="width:70px"></td><td class="n"><input data-f="g" value="${r.g}" style="width:60px"></td><td class="n" data-o="pb"></td><td class="n" data-o="px"></td><td class="n" data-o="up"></td></tr>`).join('')}
      </tbody></table></div>
      <div style="margin-top:10px;display:flex;gap:8px"><button class="btn" id="scSave" type="button">Lưu giả định</button><button class="btn ghost" id="scReset" type="button">Khôi phục mặc định</button><span class="calc" id="scMsg"></span></div>
      <div class="note">Đối chiếu: ROE TTM ${pc(QL.roe)}, ROE 5 năm ${D.annual.slice(-5).map(a => pc(a.roe, 0)).join(' → ')}; consensus median TP ${nf(CS.summary.median)}đ tương đương P/B 2026F ${x(CS.summary.median / FW.bvps2026F)}.</div>
    </article>
    <article class="card"><h3 class="sub">Rủi ro chính <span class="pill ai">AI tổng hợp</span></h3><p class="chart-sub">Từ số liệu dashboard và rủi ro các CTCK nêu (ai_news 05–09/2026)</p><table><thead><tr><th>Rủi ro</th><th>Dấu hiệu hiện tại</th><th>Theo dõi ở</th></tr></thead><tbody>
      <tr><td>Chất lượng tài sản xấu đi</td><td>Hình thành nợ xấu ${pc(QL.nplFormationRate, 2)} quy năm; LLR ${pc(QP.llr, 0)} → ${pc(QL.llr, 0)}; LLR gồm lãi dự thu ${pc(QL.llrInclAccrued, 0)}</td><td>Tài chính › Chất lượng tài sản; R-14</td></tr>
      <tr><td>COF tăng, NIM chững</td><td>LS huy động 12T ${sg(depB[depB.length - 1].v - depB[0].v, 1, ' điểm %')} từ ${dvn(depB[0].d).slice(3)}; CASA ${pc(Q[Q.length - 3].casa)} → ${pc(QL.casa)}</td><td>Tài chính › Biên lãi; dashboard Vĩ mô</td></tr>
      <tr><td>CAR ${D.car[D.car.length - 1].car < 11 ? 'mỏng ' : ''}hạn chế tăng trưởng, cổ tức</td><td>CAR ${pc(D.car[D.car.length - 1].car, 2)}, Tier 1 ${pc(D.car[D.car.length - 1].tier1, 2)}</td><td>Catalyst: phương án tăng vốn</td></tr>
      <tr><td>Áp lực tỷ giá từ bên ngoài</td><td>DXY ${nf(D.macro.fx.dxy[D.macro.fx.dxy.length - 1].v, 1)}; trung tâm +${nf((D.macro.fx.central[D.macro.fx.central.length - 1].v / D.macro.fx.central.find(v => v.d.startsWith('2025-12')).v - 1) * 100, 1)}% từ đầu năm</td><td>dashboard Vĩ mô</td></tr>
      ${(NR.risks || []).map(([a, b, c]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join('')}
    </tbody></table></article>
  </div>
  <div class="sub" data-vp="3">
    <article class="card"><h3 class="sub">Thesis tracker — 5 trụ luận điểm</h3><p class="chart-sub">Trạng thái AI theo quy tắc ở cột giữa; analyst ghi đè và ghi chú.</p><div class="tscroll"><table><thead><tr><th>Trụ</th><th>Bằng chứng (số mới nhất)</th><th>AI</th><th>Analyst</th><th>Ghi chú</th></tr></thead><tbody>
      ${D.thesisPillars.map(p => { const o = (s.pillars || {})[p.id] || {}; return `<tr data-p="${p.id}"><td><b>${esc(p.t)}</b><div class="src">${p.step}</div></td><td>${esc(p.evidence)}</td><td>${pill(p.status)}</td><td><select data-f="status"><option value="">—</option>${[['holding', 'Giữ vững'], ['watch', 'Theo dõi'], ['broken', 'Gãy']].map(([v, l]) => `<option value="${v}" ${o.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></td><td><input data-f="note" value="${esc(o.note || '')}" placeholder="ghi chú" style="width:100%"></td></tr>`; }).join('')}
    </tbody></table></div><div style="margin-top:10px"><button class="btn" id="pSave" type="button">Lưu thesis</button> <span class="calc" id="pMsg"></span></div></article>
    <article class="card"><h3 class="sub">Ngưỡng checklist (tab Tổng quan)</h3><div class="form">
      ${[['pb', 'P/B tối đa', VB.pbBand.lo], ['npl', 'NPL tối đa %', 1.5], ['form', 'Hình thành NPL tối đa %', 1.5], ['llr', 'LLR tối thiểu %', 130], ['car', 'CAR tối thiểu %', 10]].map(([k, l, d]) => `<div><label>${l}</label><input data-ck="${k}" value="${esc((s.check || {})[k] ?? d)}"></div>`).join('')}
      <div><label>&nbsp;</label><button class="btn" id="ckSave" type="button">Lưu ngưỡng</button></div></div></article>
    <article class="card"><h3 class="sub">Nhật ký insight</h3><div class="form"><div class="full"><label for="logTxt">Thêm insight / cập nhật</label><textarea id="logTxt" placeholder="Luận điểm, số liệu đối chiếu, nguồn…"></textarea></div>
      <div><button class="btn" id="logAdd" type="button">Thêm</button> <button class="btn ghost" id="logExp" type="button">Xuất JSON</button></div></div>
      <div id="logList" style="margin-top:12px"></div></article>
  </div>`;

  // --- sub-tab
  $$('#val .subtabs button').forEach(b => b.onclick = () => { $$('#val .subtabs button').forEach(x => x.classList.toggle('on', x === b)); $$('#val .sub').forEach(p => p.classList.toggle('on', p.dataset.vp === b.dataset.v)); });
  // --- price → P/B calc (yêu cầu: mọi mức giá ghi kèm P/B và P/B forward)
  const calcTxt = v => v ? `P/B <b>${x(v / M.bvps)}</b> · P/B fwd <b>${x(v / FW.bvps2026F)}</b> · ${sg((v / M.price - 1) * 100)} vs giá` : '';
  const num = v => +String(v || '').replace(/\D/g, '');
  FSN.mount($('#decNote'), {
    key: `bank-${M.ticker}-decision`, title: '1 · Quyết định hiện tại', textLabel: 'Lý do / điều kiện kích hoạt', placeholder: 'Mua khi: nêu điều kiện cụ thể…',
    sub: `Mỗi lần lưu là một bản mới theo ngày; bản đã đăng được AI đọc lại. Mỗi mức giá tự quy ra P/B hiện tại (BVPS ${nf(M.bvps)}đ) và P/B forward (BVPS 2026F ${nf(FW.bvps2026F)}đ).`,
    fields: f => `<div><label>Trạng thái</label><select data-k="status"><option value="">— chọn —</option>${['Tích cực', 'Trung lập', 'Tiêu cực'].map(o => `<option ${f.status === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
      <div><label>Hành động</label><select data-k="action"><option value="">— chọn —</option>${['Theo dõi', 'Chờ điểm mua', 'Mua thăm dò', 'Mua', 'Nắm giữ', 'Giảm tỷ trọng', 'Không đầu tư'].map(o => `<option ${f.action === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
      ${[['tp', 'Giá mục tiêu (đ)', 'vd 38000'], ['buy', 'Giá mua (đ)', 'vd 28500'], ['stop', 'Cắt lỗ (đ)', 'vd 25500']].map(([k, l, ph]) => `<div><label>${l}</label><input data-k="${k}" inputmode="numeric" placeholder="${ph}" value="${esc(f[k] || '')}"><div class="calc" data-c="${k}"></div></div>`).join('')}`,
    afterFields: el => $$('input[data-k]', el).forEach(i => { const c = $(`[data-c="${i.dataset.k}"]`, el); const f = () => c.innerHTML = calcTxt(num(i.value)); i.oninput = f; f(); }),
    read: el => Object.fromEntries($$('[data-k]', el).map(i => [i.dataset.k, i.tagName === 'INPUT' ? String(num(i.value) || '') : i.value])),
    meta: f => [f.status && `<span class="fsn-chip">Trạng thái: <b>${esc(f.status)}</b></span>`, f.action && `<span class="fsn-chip">Hành động: <b>${esc(f.action)}</b></span>`,
      ...[['tp', 'Giá mục tiêu'], ['buy', 'Giá mua'], ['stop', 'Cắt lỗ']].filter(([k]) => num(f[k])).map(([k, l]) => `<span class="fsn-chip">${l}: <b>${nf(num(f[k]))}đ</b> <small>${calcTxt(num(f[k]))}</small></span>`)].filter(Boolean).join(''),
    seed: () => dec.at ? { id: `bank-${M.ticker}-decision-seed`, at: dec.at.slice(0, 16).replace('T', ' '), author: 'Minh Đức', f: { status: dec.status || '', action: dec.action || '', tp: dec.tp || '', buy: dec.buy || '', stop: dec.stop || '' }, html: FSN.textToHtml(dec.why), text: dec.why || '' } : null,
    onSave: v => { store.set({ decision: Object.assign({}, v.f, { why: v.text, whyHtml: v.html, at: new Date().toISOString() }) }); header(); rerender('overview'); rerender('cons'); },
  });
  // --- scenarios
  const recalc = () => $$('#scTable tbody tr').forEach(tr => {
    const g = f => +$(`[data-f="${f}"]`, tr).value; const roe = g('roe'), coe = g('coe'), gg = g('g');
    const pb = coe > gg ? (roe - gg) / (coe - gg) : null; const px = pb ? pb * FW.bvps2026F : null;
    $('[data-o="pb"]', tr).textContent = x(pb); $('[data-o="px"]', tr).textContent = px ? r100(px) + 'đ' : '—'; $('[data-o="up"]', tr).textContent = px ? sg((px / M.price - 1) * 100) : '—';
  });
  $$('#scTable input').forEach(i => i.oninput = recalc); recalc();
  $('#scSave').onclick = () => { const sc = $$('#scTable tbody tr').map((tr, i) => ({ k: scen[i].k, n: scen[i].n, roe: +$('[data-f="roe"]', tr).value, coe: +$('[data-f="coe"]', tr).value, g: +$('[data-f="g"]', tr).value })); $('#scMsg').textContent = store.set({ scen: sc }) ? 'Đã lưu.' : 'Không lưu được.'; };
  $('#scReset').onclick = () => { store.set({ scen: null }); rerender('val'); };
  // --- thesis
  $('#pSave').onclick = () => { const p = {}; $$('[data-p]').forEach(tr => { p[tr.dataset.p] = { status: $('[data-f="status"]', tr).value, note: $('[data-f="note"]', tr).value }; }); $('#pMsg').textContent = store.set({ pillars: p }) ? 'Đã lưu.' : 'Không lưu được.'; rerender('overview'); };
  $('#ckSave').onclick = () => { const c = {}; $$('[data-ck]').forEach(i => c[i.dataset.ck] = +i.value); store.set({ check: c }); rerender('overview'); };
  // --- log
  const drawLog = () => { const L = store.get().log || []; $('#logList').innerHTML = L.length ? `<table><tbody>${L.map(l => `<tr><td style="white-space:nowrap">${dvn(l.at)}</td><td>${esc(l.t)}</td></tr>`).join('')}</tbody></table>` : '<div class="note keep">Chưa có ghi chép.</div>'; };
  $('#logAdd').onclick = () => { const t = $('#logTxt').value.trim(); if (!t) return; const L = store.get().log || []; L.unshift({ at: new Date().toISOString(), t }); store.set({ log: L }); $('#logTxt').value = ''; drawLog(); };
  $('#logExp').onclick = () => { const blob = new Blob([JSON.stringify(store.get(), null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${M.ticker}-finsuccess-${TODAY}.json`; a.click(); };
  drawLog();
  // --- valuation chart
  const vh = VB.history.slice();   // quý chưa có số: thêm điểm P/B, P/E hiện tại (cập nhật đến ngày gần nhất)
  if (M.pb != null && M.pe != null) vh.push({ q: `Hiện tại ${dvn(M.updated)}`, pb: M.pb, pe: M.pe });
  mk('chVal', { type: 'line', data: { labels: vh.map(v => v.q), datasets: [
    { label: 'P/B', data: vh.map(v => v.pb), borderColor: C.navy, backgroundColor: C.navy, dp: 2, unit: 'x' },
    { label: 'P/E', data: vh.map(v => v.pe), borderColor: C.teal, backgroundColor: C.teal, yAxisID: 'y1', dp: 1, unit: 'x' },
    { label: 'P/B TB 20 quý', data: vh.map(() => VB.pbBand.mean), borderColor: C.navy, borderDash: [5, 4], pointRadius: 0, keep: true, dp: 2, unit: 'x' },
    { label: 'P/E TB 20 quý', data: vh.map(() => VB.peBand.mean), borderColor: C.teal, borderDash: [5, 4], pointRadius: 0, yAxisID: 'y1', keep: true, dp: 1, unit: 'x' },
  ] }, options: { scales: { y: { title: { display: true, text: 'P/B (x)' } }, y1: { position: 'right', grid: { display: false }, title: { display: true, text: 'P/E (x)' } } } } }, { switch: 'line' });
}

/* ---------- footer ---------- */
function footer() {
  $('#foot').innerHTML = `<b>Nguồn:</b> ${D.sources.map(s => s.u ? `<a href="${s.u}" target="_blank" rel="noopener">${esc(s.n)}</a>` : esc(s.n)).join(' · ')}<br>
  <b>Công thức tự tính:</b> ${Object.entries(D.formula).map(([k, v]) => `${k}: ${esc(v)}`).join(' · ')}<br>
  ${esc(D.quarterlyNote)} Lời đọc dưới chart do AI viết từ số đang hiển thị; quan điểm FinSuccess chỉ là phần analyst nhập ở tab 💎 FinSuccess. Dữ liệu Wi MCP lấy qua connector ngày ${dvn(M.updated)}.`;
}

/* ---------- tabs ---------- */
const builders = { overview: paneOverview, fin: paneFin, events: paneEvents, cons: paneCons, val: paneVal };
const built = {};
function rerender(k) { if (built[k]) { Object.keys(charts).forEach(id => { if (document.getElementById(id) && document.getElementById(k).contains(document.getElementById(id))) { charts[id].destroy(); delete charts[id]; } }); if (k === 'fin') Object.keys(finDone).forEach(z => delete finDone[z]); builders[k](); } }
function show(k) {
  if (!builders[k]) k = 'overview';
  $$('#tabbar button').forEach(b => { const on = b.dataset.tab === k; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
  $$('.pane').forEach(p => p.classList.toggle('active', p.id === k));
  if (!built[k]) { builders[k](); built[k] = true; }
  try { history.replaceState(null, '', '#' + k); } catch (e) {}
}
$$('#tabbar button').forEach(b => b.onclick = () => { show(b.dataset.tab); window.scrollTo({ top: 0 }); });
window.FSSHARE = {   // cho hộp chia sẻ ảnh: dựng mọi tab ẩn để chọn được mọi chart; đường dẫn tab › tab con
  prep() { Object.keys(builders).forEach(k => { if (!built[k]) { builders[k](); built[k] = true; } }); $$('#fin .subtabs button').forEach(b => finCharts(b.dataset.sub)); },
  path(card) {
    const pane = card.closest('.pane'), sp = card.closest('[data-subp]'), tb = pane && document.querySelector(`#tabbar [data-tab="${pane.id}"]`);
    const sb = sp && document.querySelector(`#${pane.id} .subtabs [data-sub="${sp.dataset.subp}"]`);
    return [tb ? tb.textContent.trim() : '', sb ? sb.textContent.trim() : ''].filter(Boolean);
  }
};
document.addEventListener('click', e => { const g = e.target.closest('[data-gofin]'); if (g) { e.preventDefault(); goFin(g.dataset.gofin, g.dataset.card); return; } const a = e.target.closest('[data-go]'); if (a) { e.preventDefault(); show(a.dataset.go); } });
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
    const cv = c.querySelector('canvas'), hasPeer = cv && !!PEER_C[cv.id];   // biểu đồ riêng của ngân hàng → có nút so sánh peer
    if (hasIns || hasSrc || hasPeer) {   // nút Insight / Nguồn (chế độ Gọn) + So sánh peer (mọi chế độ)
      const row = document.createElement('div'); row.className = 'ibar';
      row.innerHTML = (hasIns ? '<button type="button" class="ipill" data-k="ins">ⓘ Insight</button>' : '') + (hasSrc ? '<button type="button" class="ipill" data-k="src">ⓘ Nguồn</button>' : '')
        + (hasPeer ? `<button type="button" class="ipill peerpill" data-k="peer" data-cid="${cv.id}">⇄ So sánh peer</button>` : '');
      c.appendChild(row);
    }
  });
}
const tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.appendChild(tip);
let tipFor = null;
/* ---------- So sánh peer: thứ hạng trong nhóm (tier) và so với bình quân ngành, theo chỉ tiêu chính của từng biểu đồ ---------- */
const PEER_MX = {   // [khoá trong SECTOR_DATA.banks.series, tên, chiều tốt: up = cao tốt, down = thấp tốt, val = định giá (thấp = rẻ), 0 = trung tính]
  nim: ['nim', 'NIM', 'up'], yea: ['yea', 'Lợi suất tài sản sinh lãi', 'up'], cof: ['cof', 'Chi phí vốn (COF)', 'down'], casa: ['casa', 'CASA', 'up'], cir: ['cir', 'CIR', 'down'],
  npl: ['npl', 'Nợ xấu (NPL)', 'down'], g2: ['g2', 'Nợ nhóm 2', 'down'], llr: ['llr', 'Bao phủ nợ xấu (LLR)', 'up'], ldr: ['ldr', 'LDR', 0],
  credit: ['creditYoY', 'Tăng trưởng tín dụng YoY', 'up'], roe: ['roe', 'ROE', 'up'], roa: ['roa', 'ROA', 'up'], np: ['npYoY', 'Tăng trưởng LNST YoY', 'up'],
  pb: ['pb', 'P/B', 'val'], pe: ['pe', 'P/E', 'val'] };
const PEER_C = { chNim: ['nim', 'yea', 'cof'], chNimAdj: ['nim'], chNimPeer: ['nim', 'cof'], chCof: ['cof'], chCasa: ['casa'], chCir: ['cir'], chNpl: ['npl', 'g2'], chAqPeer: ['npl', 'g2', 'llr'],
  chForm: ['npl', 'g2'], chAccr: ['npl'], chLlr: ['llr', 'npl'], chCc: ['npl', 'llr'], chLdr: ['ldr'], chLdrQ: ['ldr'], chGrow: ['credit'], chEA: ['credit'], chFund: ['casa', 'ldr'], chWfA: ['credit'], chWfL: ['casa'],
  chRoe: ['roe', 'roa'], chPpop: ['np', 'roe'], chToiQ: ['np', 'cir'], chToiY: ['np'], chPlY: ['np'], chPlanDone: ['np'], chNfiQ: ['cir'], chNfiShare: ['cir'], chVal: ['pb', 'pe', 'roe'], chCpb: ['pb', 'roe'], chValF: ['pb', 'pe', 'roe'], chPbRoe: ['pb', 'roe'], chPrice: ['pb', 'pe'],
  chLdrRaw: ['ldr'], chLoanTenor: ['credit'], chLoanSec: ['credit'], chLoanCust: ['credit'], chIrLoan: ['credit'], chIrDep: ['casa'], chDepType: ['casa'], chDepCust: ['casa'], chLev: ['roe'], chGrowS: ['credit'] };
function peerHtml(cid, title) {
  const SB = (window.SECTOR_DATA || {}).banks, ks = PEER_C[cid];
  const head = `<h5>${title} · So sánh peer</h5>`;
  if (!SB || !ks) return head + `<p class="tn">So sánh peer cho biểu đồ này đang cập nhật.</p>`;
  const S = SB.series, me = S[T]; if (!me) return head + `<p class="tn">${T} chưa có trong bộ dữ liệu ngành — thông tin đang cập nhật.</p>`;
  const tier = me.group, qs = SB.quarters;
  const at = (s, k, back = 0) => { const a = (S[s] || {})[k] || []; let i = a.length - 1; while (i >= 0 && a[i] == null) i--; i -= back; return i >= 0 ? { v: a[i], q: qs[i] } : null; };
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const rows = ks.map(id => {
    const [k, name, dir] = PEER_MX[id], u = k === 'pb' || k === 'pe' ? 'x' : '%', dp = k === 'llr' ? 0 : k === 'pb' || k === 'pe' ? 2 : 2;
    const f = v => v == null ? '—' : nf(v, dp) + (u === 'x' ? 'x' : '%');
    const mine = at(T, k); if (!mine) return `<p class="tn">${name}: chưa có số của ${T}.</p>`;
    const peers = Object.keys(S).filter(s => S[s].group === tier).map(s => ({ s, x: at(s, k) })).filter(p => p.x && p.x.q === mine.q);
    const all = Object.keys(S).map(s => ({ s, x: at(s, k) })).filter(p => p.x && p.x.q === mine.q);
    if (peers.length < 2) return `<p class="tn">${name}: nhóm ${tier} chưa đủ ngân hàng có số kỳ ${mine.q} — đang cập nhật.</p>`;
    const asc = dir === 'down' || dir === 'val', ord = a => a.slice().sort((p, q) => asc ? p.x.v - q.x.v : q.x.v - p.x.v);
    const rT = ord(peers).findIndex(p => p.s === T) + 1, rA = ord(all).findIndex(p => p.s === T) + 1;
    const mT = avg(peers.filter(p => p.s !== T).map(p => p.x.v)), mA = avg(all.map(p => p.x.v));
    const best = ord(peers)[0], worst = ord(peers)[peers.length - 1];
    const prev = at(T, k, 4), dT = prev ? mine.v - prev.v : null;
    const pPrev = peers.filter(p => p.s !== T).map(p => at(p.s, k, 4)).filter(Boolean), dP = pPrev.length ? mT - avg(pPrev.map(x => x.v)) : null;
    const good = dir === 0 ? null : (asc ? mine.v < mT : mine.v > mT);
    const verdict = dir === 0 ? (mine.v > mT ? `cao hơn bình quân nhóm — ít dư địa cho vay hơn` : `thấp hơn bình quân nhóm — còn dư địa cho vay`)
      : dir === 'val' ? (good ? 'rẻ hơn bình quân phần còn lại của nhóm' : 'đắt hơn bình quân phần còn lại của nhóm') : (good ? 'tốt hơn bình quân phần còn lại của nhóm' : 'kém hơn bình quân phần còn lại của nhóm');
    return `<p class="ti"><b>${name}</b> ${T} <b>${f(mine.v)}</b> (${mine.q}) — xếp <b>${rT}/${peers.length}</b> trong nhóm ${tier}, ${rA}/${all.length} toàn ngành${dir === 0 ? '' : dir === 'val' ? ' (1 = rẻ nhất)' : ' (1 = tốt nhất)'}; ${verdict}. `
      + `Bình quân các ngân hàng còn lại trong nhóm ${f(mT)}, toàn ngành ${f(mA)}; trong nhóm ${dir === 'val' ? 'rẻ nhất' : 'tốt nhất'} ${best.s} ${f(best.x.v)}, ${dir === 'val' ? 'đắt nhất' : 'kém nhất'} ${worst.s} ${f(worst.x.v)}.`
      + (dT != null && dP != null ? ` 1 năm qua ${T} ${dT >= 0 ? '+' : '−'}${nf(Math.abs(dT), dp)}${u === 'x' ? 'x' : ' điểm %'}, nhóm ${dP >= 0 ? '+' : '−'}${nf(Math.abs(dP), dp)}${u === 'x' ? 'x' : ' điểm %'}.` : '') + `</p>`;
  });
  return head + rows.join('') + `<p class="ts">Nhóm theo quy mô: Big 4 · Tư nhân lớn · Tư nhân vừa · Tư nhân nhỏ (26 ngân hàng niêm yết), cùng kỳ số liệu mới nhất của ngành.</p>`;
}
function tipHtml(b) {
  const c = b.closest('.card'), k = b.dataset.k;
  if (k === 'peer') { const h = c.querySelector(':scope > h3.sub').cloneNode(true); h.querySelectorAll('.grip,.info,.ctl,button').forEach(e => e.remove()); return peerHtml(b.dataset.cid, esc(h.textContent.trim())); }
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
show((location.hash || '#overview').slice(1));
decorate();
// hash trùng id của pane làm trình duyệt tự cuộn xuống giữa trang khi mở link — luôn bắt đầu từ đầu trang
try { history.scrollRestoration = 'manual'; } catch (e) {}
scrollTo(0, 0); addEventListener('load', () => setTimeout(() => scrollTo(0, 0), 0));
})();
