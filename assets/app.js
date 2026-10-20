/* CTG Tracker — renderer. Dữ liệu: window.PVS_DATA (data/ctg-data.js, sinh từ WiData).
   Quy ước: lời đọc (insight) do AI viết theo số đang hiển thị; quan điểm analyst chỉ nằm ở tab FinSuccess
   và lưu trên trình duyệt (localStorage) — chưa đồng bộ server. */
(function () {
'use strict';
const D = window.PVS_DATA;
const C = { navy: '#1D2678', blue: '#2938A8', teal: '#59C5C8', purple: '#861C52', gold: '#FFD45D', red: '#c0392b', grey: '#9aa3b2',
  steps: ['#1D2678', '#2938A8', '#4354B7', '#6171C5', '#8997D6', '#B3BDE8', '#D9DEF4'] };
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
  const v = ctx.parsed.y ?? ctx.parsed.x; const ds = ctx.dataset;
  if (Array.isArray(ctx.raw)) return `${ds.label}: ${nf(ctx.raw[1] - ctx.raw[0], ds.dp ?? 0)}${ds.unit || ''}`;
  return `${ds.label}: ${nf(v, ds.dp ?? 1)}${ds.unit || ''}`;
};
const refLines = { id: 'refLines', afterDatasetsDraw(chart, _a, opt) {
  const lines = opt && opt.lines; if (!lines) return; const { ctx, chartArea: a } = chart;
  lines.forEach(l => {
    const sc = chart.scales[l.axis || 'y']; if (!sc) return; const p = sc.getPixelForValue(l.value);
    ctx.save(); ctx.strokeStyle = l.color || C.red; ctx.lineWidth = l.width || 1.5; ctx.setLineDash(l.dash || [5, 4]);
    ctx.beginPath();
    if (sc.isHorizontal()) { ctx.moveTo(p, a.top); ctx.lineTo(p, a.bottom); } else { ctx.moveTo(a.left, p); ctx.lineTo(a.right, p); }
    ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = l.color || C.red; ctx.font = '600 11px Arial';
    if (l.label) { if (sc.isHorizontal()) ctx.fillText(l.label, p + 4, a.bottom - 6); else ctx.fillText(l.label, a.left + 6, p - 5); }
    ctx.restore();
  });
} };
Chart.register(refLines);

const charts = {};
function mk(id, cfg, opt = {}) {
  const el = document.getElementById(id); if (!el) return;
  if (charts[id]) charts[id].destroy();
  cfg.options = cfg.options || {};
  cfg.options.interaction = cfg.options.interaction || { mode: 'index', intersect: false, axis: cfg.options.indexAxis === 'y' ? 'y' : 'x' };
  FSK.prep(cfg);
  charts[id] = new Chart(el, cfg);
  FSK.enhance(charts[id], { today: new Date(TODAY), last: opt.last });
  charts[id]._base = JSON.parse(JSON.stringify(cfg.data.datasets.map(d => d.type || cfg.type)));
  if (opt.switch) {
    const box = document.querySelector(`[data-ctl="${id}"]`);
    if (box) {
      box.innerHTML = [['bar', 'Cột'], ['line', 'Đường']].map(([t, l]) => `<button type="button" data-t="${t}">${l}</button>`).join('');
      const set = t => {
        const ch = charts[id];
        ch.data.datasets.forEach((d, i) => { if (!d.keep) { d.type = t; d.fill = false; d.pointRadius = t === 'line' ? 2 : 0; } });
        FSK.reorder(ch); ch.update(); $$('button', box).forEach(b => b.classList.toggle('on', b.dataset.t === t));
      };
      $$('button', box).forEach(b => b.onclick = () => set(b.dataset.t));
      $$('button', box).forEach(b => b.classList.toggle('on', b.dataset.t === opt.switch));
    }
  }
  return charts[id];
}
const pctAxis = (title, extra = {}) => Object.assign({ ticks: { callback: v => nf(v, 1) + '%' }, title: title ? { display: true, text: title } : undefined, grid: { color: '#eef0f4' } }, extra);
const numAxis = (title, extra = {}) => Object.assign({ ticks: { callback: v => nf(v, 0) }, title: title ? { display: true, text: title } : undefined, grid: { color: '#eef0f4' } }, extra);
const lastN = (arr, n) => arr.slice(Math.max(0, arr.length - n));
let FIN_RANGE = 'def';   // khung thời gian tab Tài chính: def = gần đây · 5y = 5 năm · all = toàn bộ lịch sử
const Y5 = () => QL.year - 5;
const win = (arr, n) => FIN_RANGE === 'all' ? arr : FIN_RANGE === '5y' ? arr.filter(q => q.year >= Y5()) : lastN(arr, n);
const yok = (q, y) => FIN_RANGE === 'all' ? true : q.year >= (FIN_RANGE === '5y' ? Math.min(y, Y5()) : y);

/* ---------- card templates ---------- */

/* ---------- Tài chính: các trụ phân tích sâu ---------- */
const AQ = lbl => { const X = D.ctx; if (!X) return () => null; return (m, g) => { const i = X.quarters.indexOf(lbl); return i < 0 || !X.agg[m] ? null : X.agg[m][g][i]; }; };
const yoyQ = (k, i = Q.length - 1) => i >= 4 && Q[i][k] && Q[i - 4][k] ? (Q[i][k] / Q[i - 4][k] - 1) * 100 : null;
function roomSub() {
  const X = D.ctx || {}, L = X.ldrSens, cm = X.camel, car = D.car[D.car.length - 1];
  const used = cm && cm.room ? cm.creditYtd / cm.room * 100 : null;
  return `<div class="grid g2 gap">
    ${card({ id: 'chLdrQ', title: 'LDR theo quý so với trần và ngành', sub: '% · LDR theo công thức TT22 (tiền gửi Kho bạc tính theo hệ số) · đường đỏ = trần 85%', ctl: true,
      insight: `LDR <b>${pc(QL.ldr)}</b> (${QL.q}), còn <b>${nf(85 - QL.ldr, 1)} điểm %</b> tới trần 85%${X.agg && X.agg.ldr ? `; bình quân Big 4 ${pc(AQ(QL.q)('ldr', 'Big 4'))}, ngành ${pc(AQ(QL.q)('ldr', 'all'))}` : ''}. Tín dụng tăng <b>${pc(QL.creditYoY)}</b> YoY trong khi huy động chỉ <b>${pc(QL.fundingYoY)}</b> — khoảng cách này là thứ thu hẹp dư địa LDR nhanh nhất.`,
      src: 'BCTC hợp nhất, tỷ lệ LDR công bố' })}
    ${card({ id: 'chGrow', title: 'Tăng trưởng tín dụng và huy động', sub: '% YoY · quý', ctl: true,
      insight: `Khoảng cách tín dụng − huy động <b>${nf(QL.creditYoY - QL.fundingYoY, 1)} điểm %</b> ở ${QL.q} (một năm trước ${nf(Q[Q.length - 5].creditYoY - Q[Q.length - 5].fundingYoY, 1)} điểm %). Phần thiếu được bù bằng liên ngân hàng và giấy tờ có giá — chi phí cao hơn tiền gửi khách hàng.`,
      src: 'BCTC hợp nhất' })}
    ${card({ id: 'chCarH', title: 'Tỷ lệ an toàn vốn (CAR) và vốn cấp 1', sub: '% · bán niên và năm (TT41) · đường = mức tối thiểu 8% (CAR) và 6% (vốn cấp 1)', ctl: true,
      insight: `CAR <b>${pc(car.car, 2)}</b>, vốn cấp 1 <b>${pc(car.tier1, 2)}</b> (${car.period}) — vượt tối thiểu ${nf(car.car - 8, 2)} điểm %. Tài sản rủi ro tín dụng tăng ${sg((car.rwaCredit / D.car[D.car.length - 3].rwaCredit - 1) * 100)} trong một năm, vốn tự có tăng ${sg((car.ownFunds / D.car[D.car.length - 3].ownFunds - 1) * 100)}: vốn phải tăng cùng nhịp tài sản thì CAR mới giữ được.`,
      src: 'Báo cáo tỷ lệ an toàn vốn theo TT41' })}
    <article class="card"><h3 class="sub">Room tín dụng và LDR theo TT50</h3>
      ${cm ? `<p>Room ngụ ý theo xếp hạng TT21 (ước tính): <b>${pc(cm.room)}</b> (điểm ${nf(cm.total, 2)}, hạng ${cm.grade}). Tín dụng đã tăng <b>${pc(cm.creditYtd)}</b> từ đầu năm tới ${QL.q} — dùng khoảng <b>${pc(used, 0)}</b> room cả năm.</p>` : ''}
      ${X.peerLdr ? `<p class="chart-sub">LDR Big 4 niêm yết theo hệ số tính tiền gửi Kho bạc (TGKB) — TT50 tính 20%; nâng lên 50% là một đề xuất chính sách</p><div class="tscroll"><table><thead><tr><th>NH</th><th class="n">TGKB/tiền gửi</th><th class="n">TGKB 0%</th><th class="n">TGKB 20%</th><th class="n">TGKB 50%</th></tr></thead><tbody>
        ${X.peerLdr.map(r => `<tr class="${r.s === M.ticker ? 'hl' : ''}"><td><b>${r.s}</b></td><td class="n">${pc(r.kbnnPctDep)}</td><td class="n">${pc(r.ldr0)}</td><td class="n">${pc(r.ldr20)}</td><td class="n">${pc(r.ldr50)}</td></tr>`).join('')}
      </tbody></table></div>` : ''}
      <div class="src">Room: điểm xếp hạng ước tính × ${nf(X.roomCoef || 2.6, 1)}% (cách giao chỉ tiêu tín dụng 2026), xem dashboard ngành › Xếp hạng TT21 & room. LDR theo hệ số TGKB: tự tính từ BCTC Q2/2026.</div></article>
  </div>`;
}
function nimPeerIns() {
  const a = AQ(QL.q), b = AQ(Q[Q.length - 5].q);
  return `NIM CTG <b>${pc(QL.nim, 2)}</b> so với Big 4 <b>${pc(a('nim', 'Big 4'), 2)}</b> và ngành ${pc(a('nim', 'all'), 2)}; một năm trước ${pc(Q[Q.length - 5].nim, 2)} / ${pc(b('nim', 'Big 4'), 2)} / ${pc(b('nim', 'all'), 2)}. COF CTG ${pc(QL.cof, 2)} thấp hơn ngành (${pc(a('cof', 'all'), 2)}) nhờ CASA và tiền gửi Kho bạc — lợi thế này thu hẹp khi CASA giảm (${pc(QP.casa)} → ${pc(QL.casa)}).`;
}
function gapIns() {
  const g = QL.irGap; if (g == null) return 'Chưa có số khe hở lãi suất.';
  return `Khe hở ≤ 12 tháng <b>${nf(g / 1000, 1)} nghìn tỷ</b> (${pc(g / QL.ta * 100)} tổng tài sản, ${QL.q}). ${g < 0 ? 'Âm: nợ định giá lại nhanh hơn tài sản — lãi suất huy động giảm thì chi phí vốn giảm trước, nhưng chỉ đạo giảm lãi suất cho vay tác động thẳng vào phía tài sản.' : 'Dương: tài sản định giá lại nhanh hơn nợ — giảm lãi suất cho vay ăn vào NIM ngay.'}`;
}
function accrIns() {
  const a = yoyQ('accrued'), l = yoyQ('loansGross');
  return `Lãi, phí phải thu <b>${nf(QL.accrued / 1000, 1)} nghìn tỷ</b> = ${pc(QL.accrued / QL.loansGross * 100, 2)} dư nợ, tăng <b>${sg(a)}</b> YoY so với dư nợ ${sg(l)}. Lãi dự thu tăng nhanh hơn dư nợ nghĩa là một phần thu nhập lãi đã ghi nhận nhưng chưa thu được tiền — có thể là nợ khó đòi chưa phân loại. LLR nếu coi khoản này là nợ xấu: <b>${pc(QL.llrInclAccrued, 0)}</b> (LLR công bố ${pc(QL.llr, 0)}).`;
}
function aqPeerIns() {
  const a = AQ(QL.q);
  return `CTG: NPL <b>${pc(QL.npl, 2)}</b>, nhóm 2 ${pc(QL.g2, 2)}; Big 4: ${pc(a('npl', 'Big 4'), 2)} / ${pc(a('g2', 'Big 4'), 2)}; ngành: ${pc(a('npl', 'all'), 2)} / ${pc(a('g2', 'all'), 2)}. Bao phủ CTG ${pc(QL.llr, 0)} so với Big 4 ${pc(a('llr', 'Big 4'), 0)}.`;
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
  if (sub === 'val') { show('val'); } else { show('fin'); const b = $(`#fin .subtabs button[data-sub="${sub}"]`); if (b) b.click(); }
  setTimeout(() => { const el = document.getElementById(cardId); const a = el && el.closest('article'); if (a) { a.scrollIntoView({ behavior: 'smooth', block: 'start' }); a.classList.add('flash'); setTimeout(() => a.classList.remove('flash'), 1600); } }, 120);
}

/* Thu nhập dịch vụ theo mảng (thuyết minh năm) */
const FEE_COL = { pay: '#1D2678', ins: '#59C5C8', trust: '#861C52', sec: '#9a7400', adv: '#2938A8', cash: '#9aa3b2', oth: '#FFD45D' };
function feeCard() {
  const F = D.fee, T = F.table, rows = T.rows.filter(r => r.k === '_tot' || r.inc > 0);
  const top = rows.filter(r => r.k !== '_tot' && r.incYoY != null).sort((a, b) => b.incYoY - a.incYoY)[0];
  const big = rows.filter(r => r.k !== '_tot').sort((a, b) => (b.share || 0) - (a.share || 0))[0];
  const tot = rows.find(r => r.k === '_tot');
  const sg2 = v => v == null ? '—' : (v > 0 ? '+' : '') + nf(v, 1) + '%';
  return `<div class="grid g2 gap">${card({ id: 'chFee', title: 'Lãi thuần dịch vụ theo mảng', sub: 'tỷ đồng · năm · ròng = thu − chi của từng mảng (thuyết minh BCTC hợp nhất)', ctl: true,
      insight: `Năm ${T.year}: lãi thuần dịch vụ <b>${nf(tot.net)}</b> tỷ (${sg2(tot.netYoY)}), biên chung <b>${pc(tot.margin)}</b>. Mảng đóng góp lớn nhất là <b>${big.name}</b> (${pc(big.share, 0)} lãi thuần, biên ${pc(big.margin, 0)}); thu tăng nhanh nhất ở <b>${top.name}</b> (${sg2(top.incYoY)}).`,
      src: 'BCTC hợp nhất năm của ngân hàng (thuyết minh thu nhập, chi phí hoạt động dịch vụ)' })}
    <article class="card"><h3 class="sub">Thu phí theo mảng · năm ${T.year}</h3><p class="chart-sub">tỷ đồng · biên = lãi thuần / thu · tỷ trọng tính trên lãi thuần dịch vụ</p>
      <div class="tscroll"><table><thead><tr><th>Mảng</th><th class="n">Thu</th><th class="n">Thu YoY</th><th class="n">Lãi thuần</th><th class="n">Lãi thuần YoY</th><th class="n">Biên</th><th class="n">Tỷ trọng</th></tr></thead><tbody>
      ${rows.map(r => `<tr${r.k === '_tot' ? ' style="font-weight:700"' : ''}><td>${esc(r.name)}</td><td class="n">${nf(r.inc)}</td><td class="n">${sg2(r.incYoY)}</td><td class="n">${nf(r.net)}</td><td class="n">${sg2(r.netYoY)}</td><td class="n">${r.margin == null ? '—' : pc(r.margin, 0)}</td><td class="n">${r.share == null ? '—' : pc(r.share, 0)}</td></tr>`).join('')}
      </tbody></table></div><div class="src">Chi viễn thông và chi môi giới không tách được theo mảng, gộp vào "Khác".</div></article></div>`;
}
function drawFee() {
  const F = D.fee, ys = Object.keys(F.series);
  mk('chFee', { type: 'bar', data: { labels: ys, datasets: F.lines.filter(l => ys.some(y => F.series[y][l.k].net)).map(l => ({ label: l.name, data: ys.map(y => F.series[y][l.k].net), backgroundColor: FEE_COL[l.k], stack: 's', unit: ' tỷ' })) },
    options: { scales: { x: { stacked: true }, y: { stacked: true } } } });
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
      <div class="fact"><span>CP lưu hành</span><b>${nf(M.sharesOut, 1)} triệu</b><small>sau cổ tức CP 44,6% (12/2025)</small></div>
      <div class="fact"><span>BVPS · EPS TTM</span><b>${nf(M.bvps)} · ${nf(M.eps)}đ</b><small>${M.ratioPeriod}</small></div>
      <div class="fact"><span>ROE · ROA</span><b>${pc(M.roe)} · ${pc(M.roa, 2)}</b><small>${M.ratioPeriod}</small></div>
      <div class="fact"><span>NIM · CIR</span><b>${pc(M.nim, 2)} · ${pc(M.cir)}</b><small>${M.ratioPeriod}</small></div>
      <div class="fact"><span>CASA</span><b>${pc(M.casa)}</b><small>${QL.q} (quý trước ${pc(QP.casa)})</small></div>
      <div class="fact"><span>NPL · LLR</span><b>${pc(M.npl, 2)} · ${pc(M.llr, 0)}</b><small>${QL.q}</small></div>
      <div class="fact"><span>CAR · LDR</span><b>${pc(car.car, 2)} · ${pc(QL.ldr)}</b><small>CAR ${car.period} (TT41) · LDR ${QL.q}</small></div>
    </div>
    <div class="src">Nguồn: ${esc(M.src)}; CAR từ báo cáo TT41 (bán niên/năm). LDR theo công thức WiData (tiền gửi KBNN tính theo hệ số TT26/TT08).</div>
  </article>
  ${card({ id: 'chPrice', title: 'Giá cổ phiếu', sub: `đ/CP · giá đóng cửa đã điều chỉnh · lịch sử từ ${dvn(D.price.series[0].d)} · đường ngang là đỉnh và đáy 52 tuần`, h: 'short',
    body: `<div class="picker tf" data-pxr>${[['1', '1 năm'], ['5', '5 năm'], ['all', 'Toàn bộ']].map(([k, l], i) => `<button type="button" data-k="${k}" class="${i ? '' : 'on'}">${l}</button>`).join('')}</div>`,
    insight: `Giá hiện tại <b>${nf(M.price)}đ</b> thấp hơn đỉnh 52 tuần <b>${nf(D.price.high52.c)}đ</b> (${dvn(D.price.high52.d)}) <b>${sg((M.price / D.price.high52.c - 1) * 100)}</b> và cao hơn đáy <b>${nf(D.price.low52.c)}đ</b> (${dvn(D.price.low52.d)}) <b>${sg((M.price / D.price.low52.c - 1) * 100)}</b>. Đỉnh đầu năm đi cùng kỳ vọng tăng trưởng; giá điều chỉnh trong khi LNTT 6T vẫn tăng ${sg(P.pbtYTDyoy)} — chênh lệch giữa lợi nhuận và giá là lý do P/B đang dưới trung bình 5 năm.`,
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
  <h2 class="sec">Quản trị &amp; sở hữu</h2><p class="sec-sub">Ngân hàng do Nhà nước sở hữu chi phối; MUFG là cổ đông chiến lược nước ngoài.</p>
  <div class="grid g2 gap">
    <article class="card"><h3 class="sub">Cơ cấu cổ đông</h3><div class="tscroll"><table><thead><tr><th>Cổ đông</th><th class="n">Số CP</th><th class="n">Tỷ lệ</th><th>Ngày chốt</th></tr></thead><tbody>
      ${D.governance.shareholders.map(h => `<tr><td>${esc(h.name)}</td><td class="n">${nf(h.shares)}</td><td class="n">${nf(h.percent, 2)}%</td><td>${dvn(h.asOf)}</td></tr>`).join('')}
      </tbody></table></div><div class="note">Các NHTM có vốn Nhà nước chi phối phải giữ sở hữu Nhà nước ≥ 65% khi tăng vốn — đây là ràng buộc của phương án tăng vốn (xem Catalyst).</div>
      <div class="src">Nguồn: WiData co_holders</div></article>
    <article class="card"><h3 class="sub">Cơ cấu quản trị</h3><div class="tscroll"><table><thead><tr><th>Họ tên</th><th>Vai trò</th><th>Bổ nhiệm</th></tr></thead><tbody>
      ${D.governance.leadership.slice(0, 14).map(l => `<tr><td>${esc(l.name)}</td><td>${esc(l.role)}</td><td>${dvn(l.since)}</td></tr>`).join('')}
      </tbody></table></div><div class="src">Nguồn: WiData co_leaders (chỉ người đương nhiệm)</div></article>
  </div>
  <article class="card"><h3 class="sub">Giao dịch cổ đông lớn &amp; người nội bộ</h3><div class="tscroll"><table><thead><tr><th>Người giao dịch</th><th>Chức vụ</th><th>Mua/bán</th><th class="n">KL thực hiện</th><th>Đến ngày</th></tr></thead><tbody>
    ${D.governance.trades.slice(0, 8).map(t => `<tr><td>${esc(t.name)}</td><td>${esc(t.role || '—')}</td><td>${esc(t.side)}</td><td class="n">${nf(t.executed)}</td><td>${dvn(t.to)}</td></tr>`).join('')}
    </tbody></table></div><div class="note">Giao dịch nội bộ ở CTG thưa và nhỏ so với 7,77 tỷ CP lưu hành — không phải tín hiệu định giá đáng kể.</div><div class="src">Nguồn: WiData co_insider</div></article>`;
  const PS = D.price.series, lastD = PS[PS.length - 1].d;
  const drawPx = k => {
    const y1 = k === 'all' ? PS : PS.filter(p => p.d >= lastD.replace(/^(\d{4})/, (m) => +m - (+k || 1)));
    mk('chPrice', { type: 'line', data: { labels: y1.map(p => dvn(p.d)), datasets: [{ label: 'Giá đóng cửa', data: y1.map(p => p.c), borderColor: C.navy, pointRadius: 0, borderWidth: k === '1' ? 1.8 : 1.2, dp: 0, unit: 'đ' }] },
      options: { scales: { x: { ticks: { maxTicksLimit: 8 }, grid: { display: false } }, y: numAxis() }, plugins: { legend: { display: false },
        refLines: { lines: [{ value: D.price.high52.c, label: '52W High ' + nf(D.price.high52.c), color: C.teal }, { value: D.price.low52.c, label: '52W Low ' + nf(D.price.low52.c), color: C.red }] } } } });
  };
  const pxBox = document.querySelector('[data-pxr]');
  if (pxBox) { const bs = [...pxBox.querySelectorAll('button')]; bs.forEach(b => b.onclick = () => { bs.forEach(x => x.classList.toggle('on', x === b)); drawPx(b.dataset.k); }); }
  drawPx('1');
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

/* =====================================================================
   TAB 2 · VĨ MÔ & TỈ LỆ AN TOÀN
===================================================================== */
function paneMacro() {
  const SX = window.SECTOR_DATA ? window.SECTOR_DATA.idx : null;
  const qc = (k, b, txt) => `<div class="cell ${SX && SX.now.q === k ? 'on' : ''}"><b>${b}</b>${txt}${SX && SX.now.q === k ? '<br><span class="now">Hiện tại</span>' : ''}</div>`;
  const MA = D.macro; const fx = MA.fx, r = MA.rates;
  const lastv = a => a[a.length - 1];
  const sigRows = D.signals.map(s => `<tr><td style="white-space:nowrap"><b>${s.id}</b></td><td>${esc(s.label)}</td><td class="n">${nf(s.value, 2)} ${s.unit}</td><td>${esc(s.threshold)}</td><td>${pill(s.state)}</td><td>${esc(s.rule)}</td><td>${esc(s.impact)}</td><td style="white-space:nowrap">${esc(s.asOf)}</td></tr>`).join('');
  const ytdNow = lastv(MA.credit.ytd);
  const ytdPrevSame = MA.credit.ytd.find(v => v.d.slice(5, 7) === ytdNow.d.slice(5, 7) && +v.d.slice(0, 4) === +ytdNow.d.slice(0, 4) - 1);
  const mix = D.loanMix[D.loanMix.length - 1], mix0 = D.loanMix.find(m => m.q.startsWith('Q4/2019'));
  const mixQ4 = [...D.loanMix].reverse().find(m => m.q.startsWith('Q4'));
  const fxGap = lastv(fx.free).v - lastv(fx.nhtmSell).v;
  const fxPk = fx.nhtmSell.map(b => { const f = fx.free.find(s => s.d.slice(0, 7) === b.d.slice(0, 7)); return f ? { g: f.v - b.v, d: b.d.slice(5, 7) + '/' + b.d.slice(0, 4) } : null; }).filter(Boolean).reduce((a, b) => b.g > a.g ? b : a);
  $('#macro').innerHTML = `
  <h2 class="sec">Vĩ mô &amp; Tỉ lệ an toàn</h2>
  <p class="sec-sub">Tab tùy biến cho ngân hàng: lãi suất quyết định lợi nhuận và định giá; tỉ giá quyết định dư địa nới lỏng của NHNN.</p>
  <div class="banner chain">Thế giới → Tỉ giá → Phản ứng NHNN → Lãi suất (TT2 → TT1) → COF, NIM, nợ xấu, định giá CTG</div>
  <div class="kpis k4">
    ${kpi('USD/VND NHTM bán ra', nf(lastv(fx.nhtmSell).v), 'tự do ' + nf(lastv(fx.free).v) + ' (' + (lastv(fx.free).v - lastv(fx.nhtmSell).v >= 0 ? '+' : '−') + nf(Math.abs(lastv(fx.free).v - lastv(fx.nhtmSell).v)) + 'đ) · cách trần ' + pc(Math.abs((lastv(fx.nhtmSell).v / lastv(fx.ceiling).v - 1) * 100), 1))}
    ${kpi('LNH qua đêm', pc(lastv(MA.onDaily).v, 2), dvn(lastv(MA.onDaily).d) + ' · OMO ' + pc(lastv(MA.omoRateDaily).v, 1))}
    ${kpi('Huy động 12T NHTM Nhà nước', pc(lastv(r.dep12State).v, 2), 'CTG ' + pc(lastv(r.dep12CTG).v, 2) + ' · NHTM khác ' + pc(lastv(r.dep12Other).v, 2))}
    ${kpi('Tín dụng so đầu năm', pc(ytdNow.v, 2), dvn(ytdNow.d).slice(3) + ' · cùng kỳ ' + pc(ytdPrevSame && ytdPrevSame.v, 2) + ' · chỉ tiêu ~15%')}
  </div>
  <div class="grid g2 gap">
    <article class="card span2"><h3 class="sub">Kịch bản lãi suất (IDX-FX × IDX-LIQ)</h3>
      <p class="chart-sub">${SX ? `Lấy từ dashboard Ngành Ngân hàng · ${SX.now.m.slice(5)}/${SX.now.m.slice(0, 4)} · ±1 là ngưỡng mạnh` : 'Hai chỉ số tổng hợp (z-score 3 năm) lấy từ dashboard CSTT'}</p>
      <div class="matrix">
        <div></div><div class="ax">Áp lực tỉ giá THẤP</div><div class="ax">Áp lực tỉ giá CAO</div>
        <div class="ax">Thanh khoản DỒI DÀO</div>
        ${qc('ease', 'Nới lỏng mạnh', 'Lãi suất giảm nhanh → NIM mở rộng, CTG được định giá lại')}
        ${qc('drain', 'NHNN hút tiền về', 'LNH tăng → tín dụng chậm lại')}
        <div class="ax">Thanh khoản THIẾU</div>
        ${qc('room', 'Dư địa bơm tiền', 'Huy động gần đỉnh → theo dõi tín hiệu nới sớm')}
        ${qc('tight', 'Thắt chặt kéo dài', 'COF tăng, nợ xấu tăng → áp lực P/B')}
      </div>
      ${SX ? `<div class="insight">IDX-FX <b>${sg(SX.now.fx, 2, '')}</b>, IDX-LIQ <b>${sg(SX.now.liq, 2, '')}</b> → ô <b>${({ ease: 'Nới lỏng mạnh', drain: 'NHNN hút tiền về', room: 'Dư địa bơm tiền', tight: 'Thắt chặt kéo dài' })[SX.now.q]}</b> (cả hai trong vùng ±1: mức vừa). Với CTG: COF tăng theo LS huy động 12T nhưng LDR được tiền gửi KBNN đỡ (hệ số 50% từ Q3). Backtest bản đầu đúng hướng ${SX.backtest.h6.rate}% (6 tháng), dưới ngưỡng 60% — đọc như bản đồ áp lực, xem <a href="nganh.html#picture">Ngành › Kịch bản IDX</a>.</div>` : ''}
    </article>
    <article class="card span2"><h3 class="sub">Tín hiệu theo quy tắc R-xx <span class="pill ai">quy tắc</span></h3>
      <p class="chart-sub">Ngưỡng là giả định theo dõi từ deck (slide 50–51), chưa backtest</p>
      <div class="tscroll"><table><thead><tr><th>Mã</th><th>Chỉ số</th><th class="n">Mới nhất</th><th>Ngưỡng</th><th>Trạng thái</th><th>Quy tắc / số liệu</th><th>Tác động tới CTG</th><th>Kỳ</th></tr></thead><tbody>${sigRows}</tbody></table></div>
    </article>
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'chFx', title: 'Hành lang tỷ giá USD/VND', sub: 'VND/USD · cuối tháng · tỷ giá NHTM bán ra và tự do bán ra so với trung tâm, trần biên độ, giá NHNN bán can thiệp. Chênh tự do − NHTM nới rộng = cầu USD ngoài hệ thống ngân hàng tăng (USD khan, hoặc vàng trong nước cao hơn thế giới kéo cầu USD tiền mặt).', ctl: true,
      insight: `Tỷ giá NHTM bán ra <b>${nf(lastv(fx.nhtmSell).v)}</b> còn cách trần <b>${nf(lastv(fx.ceiling).v - lastv(fx.nhtmSell).v)}đ</b>; trung tâm đã tăng <b>${sg((lastv(fx.central).v / fx.central.find(v => v.d.startsWith('2025-12')).v - 1) * 100)}</b> từ cuối 2025 — NHNN chủ động cho VND yếu dần trong khi giá thị trường chưa áp trần. DXY ${nf(lastv(fx.dxy).v, 1)} tăng lại từ ${nf(fx.dxy.find(v => v.d.startsWith('2026-01')).v, 1)} (01/2026): áp lực bên ngoài nhích lên, chưa tới mức buộc NHNN bán USD liên tục. Tỷ giá tự do <b>${nf(lastv(fx.free).v)}</b>, ${fxGap >= 0 ? 'cao hơn' : 'thấp hơn'} NHTM <b>${nf(Math.abs(fxGap))}đ</b>, đã thu hẹp mạnh từ đỉnh chênh <b>+${nf(fxPk.g)}đ</b> (${fxPk.d}) — áp lực USD ngoài hệ thống đã hạ nhiệt.`,
      src: 'WiData macro 82223, 82226, 82227, 82228, 82231, 235028' })}
    ${card({ id: 'chOn', title: 'Thanh khoản liên ngân hàng (TT2)', sub: '% / tỷ đồng · ngày · LNH qua đêm so với lãi suất OMO; cột = NHNN bơm (+)/hút (−) ròng', h: 'tall',
      insight: `LNH qua đêm dao động mạnh <b>${nf(Math.min(...MA.onDaily.map(v => v.v)), 2)}–${nf(Math.max(...MA.onDaily.map(v => v.v)), 2)}%</b> trong 3 tháng, đỉnh thường rơi vào cuối tháng (căng mùa vụ) và NHNN bơm OMO đúng các phiên đó. Theo deck (R-10), OMO chỉ xử lý thanh khoản ngắn, không giúp tuân thủ LDR — nên TT2 hạ không tự kéo lãi suất huy động TT1 xuống.`,
      src: 'WiData macro 82237, 81522, 82268' })}
    ${card({ id: 'chDep', title: 'Lãi suất huy động 12 tháng (TT1)', sub: '%/năm · cuối tháng · CTG niêm yết vs bình quân NHTM Nhà nước vs NHTM khác', ctl: true,
      insight: `Lãi suất 12T của CTG <b>${pc(lastv(r.dep12CTG).v, 1)}</b> bằng nhóm Nhà nước, thấp hơn NHTM khác <b>${nf(lastv(r.dep12Other).v - lastv(r.dep12CTG).v, 2)} điểm %</b>. Mặt bằng đã tăng ${nf(lastv(r.dep12State).v - r.dep12State[0].v, 2)} điểm % từ ${dvn(r.dep12State[0].d).slice(3)}; theo R-13, COF thực tế đi sau 1–3 quý — xem COF ở tab Tài chính › Biên lãi.`,
      src: 'WiData macro 202862, 202886, 202880' })}
    ${card({ id: 'chCredit', title: 'Tín dụng toàn hệ thống so với đầu năm', sub: '% · tháng · mỗi đường là một năm, đường đỏ = chỉ tiêu 2026 ~15%',
      insight: `Đến ${dvn(ytdNow.d).slice(3)}, tín dụng tăng <b>${pc(ytdNow.v, 2)}</b> so với đầu năm (cùng kỳ ${ytdPrevSame ? pc(ytdPrevSame.v, 2) : '—'}). Riêng CTG tăng <b>${pc(QL.creditYoY)}</b> YoY (${QL.q}) — chậm hơn toàn ngành, phù hợp chiến lược ưu tiên NIM; dư địa nửa cuối năm phụ thuộc room và LDR.`,
      src: 'WiData macro 241732 (so cuối năm trước)' })}
    ${card({ id: 'chCreditDep', title: 'Tín dụng vs tiền gửi (YoY)', sub: '% · tháng · chênh lệch dương = ngân hàng phải tìm thêm nguồn vốn', ctl: true,
      insight: `Tín dụng YoY <b>${pc(lastv(MA.credit.yoy).v)}</b> so với tiền gửi <b>${pc(lastv(MA.credit.depositsYoY).v)}</b>: chênh <b>${nf(lastv(MA.credit.yoy).v - lastv(MA.credit.depositsYoY).v, 1)} điểm %</b> (R-09). Deck lưu ý số tiền gửi của NHNN chưa gồm GTCG và liên ngân hàng — chênh lệch không đồng nghĩa thiếu vốn toàn phần, nhưng cho biết áp lực cạnh tranh tiền gửi.`,
      src: 'WiData macro 75847, 265963 (bảng đã điều chỉnh)' })}
    ${card({ id: 'chLdr', title: 'CTG · LDR và CASA', sub: '% · quý · LDR theo công thức WiData (KBNN theo hệ số TT26/TT08) · đường đỏ = trần 85% (TT22)', ctl: true,
      insight: `LDR <b>${pc(QL.ldr)}</b> (${QL.q}) cách trần 85% khoảng <b>${nf(85 - QL.ldr, 1)} điểm %</b>; CASA giảm còn <b>${pc(QL.casa)}</b> từ ${pc(Q[Q.length - 3].casa)} hai quý trước. Từ Q3/2026 tiền gửi KBNN được tính 50% (thay 20%) — Big 4 hưởng lợi nhiều nhất; từ 1/12/2026 TT50 đổi cách tính (liên ngân hàng chỉ tính vị thế ròng), cần dựng lại LDR theo TT50.`,
      src: 'WiData ratio_bank (ldr, casa_ratio)' })}
  </div>
  <div class="grid g2 gap">
    ${card({ id: 'chCar', title: 'CTG · CAR và vốn cấp 1 (TT41)', sub: '% · bán niên/năm · đường đỏ = tối thiểu 8%',
      insight: `CAR <b>${pc(D.car[D.car.length - 1].car, 2)}</b> (${D.car[D.car.length - 1].period}), vốn cấp 1 <b>${pc(D.car[D.car.length - 1].tier1, 2)}</b> — mỏng nhất nhóm Big 4 theo các CTCK. CAR là ràng buộc tăng trưởng và là lý do cổ tức tiền mặt thấp (450đ/CP); phương án tăng vốn là catalyst trực tiếp.`,
      src: 'WiData bank_car_tt41' })}
    ${card({ id: 'chMix', title: 'CTG · cơ cấu dư nợ theo ngành và kỳ hạn', sub: '% dư nợ cho vay KH · ' + mixQ4.q + ' so với ' + (mix0 ? mix0.q : ''),
      insight: `Tỷ trọng xây dựng & BĐS giảm từ <b>${pc(mix0 && mix0.bySector.construction_realestate)}</b> (2019) xuống <b>${pc(mixQ4.bySector.construction_realestate)}</b>; cá nhân, hộ kinh doanh tăng lên <b>${pc(mixQ4.byCustomer.individuals_households)}</b>. Cho vay ngắn hạn chiếm <b>${pc(mix.byTenor.short_term)}</b> (${mix.q}) → tái định giá nhanh, NIM nhạy theo lãi suất cho vay; deck lưu ý repricing gap nên đọc từ lịch sử NIM vì BCTC không đủ chi tiết.`,
      src: 'WiData ratio_bank (pct_loans_*)' })}
  </div>
  <article class="card"><h3 class="sub">Ánh xạ vĩ mô → chỉ số CTG</h3><p class="chart-sub">Theo deck slide 54; cột cuối là mức nhạy riêng của CTG</p><div class="tscroll"><table>
    <thead><tr><th>Biến vĩ mô</th><th>Chỉ số ngân hàng</th><th>Chiều tác động</th><th>Độ trễ</th><th>CTG</th></tr></thead><tbody>
    <tr><td>LS huy động 12T (DOM-13)</td><td>COF, NIM</td><td>Tăng: COF tăng; NIM giảm nếu YOEA chậm</td><td>1–3 quý</td><td>Cho vay ngắn hạn ${pc(mix.byTenor.short_term, 0)} → YOEA điều chỉnh nhanh; CASA ${pc(QL.casa, 0)} thấp hơn VCB, TCB, MBB</td></tr>
    <tr><td>Room tín dụng (REG-06/07)</td><td>Tăng trưởng tín dụng, NII</td><td>Nới room: tín dụng, NII tăng</td><td>1–2 quý</td><td>Hưởng lợi từ dự án trọng điểm loại trừ khỏi room (CV 5386)</td></tr>
    <tr><td>LDR, KBNN (REG-03/04)</td><td>LDR, tăng trưởng tín dụng</td><td>Nới: dư địa cho vay tăng</td><td>1–2 quý</td><td>Big 4 giữ nhiều tiền gửi KBNN → hưởng lợi nhiều nhất khi hệ số lên 50%</td></tr>
    <tr><td>LS cho vay, chu kỳ BĐS (DOM-14)</td><td>NPL, hình thành nợ xấu, CP tín dụng</td><td>Cao kéo dài: nợ xấu, dự phòng tăng</td><td>2–4 quý</td><td>BĐS ${pc(mixQ4.bySector.construction_realestate, 1)} dư nợ, nhưng cá nhân ${pc(mixQ4.byCustomer.individuals_households, 0)} (gồm vay mua nhà)</td></tr>
    <tr><td>Lợi suất TPCP (DOM-17)</td><td>Lãi/lỗ CK đầu tư</td><td>Lợi suất tăng: lỗ danh mục</td><td>Quý</td><td>CK đầu tư ~${nf(QL.secs / QL.ta * 100, 1)}% tổng tài sản</td></tr>
    <tr><td>Mặt bằng lãi suất</td><td>P/E, P/B</td><td>Giảm: tỉ lệ chiết khấu giảm, định giá tăng</td><td>1–2 quý</td><td>P/B ${x(M.pb)} dưới TB 5 năm ${x(VB.pbBand.mean)}</td></tr>
    </tbody></table></div></article>
  <article class="card"><h3 class="sub">Lịch quy định (REG)</h3><p class="chart-sub">Bảng REG của deck, cập nhật theo dữ liệu hiện hành — dòng tô vàng là chỗ lệch cần analyst xác nhận</p><div class="tscroll"><table>
    <thead><tr><th>ID</th><th>Quy định</th><th>Mức hiện hành</th><th>Văn bản</th><th>Lộ trình</th></tr></thead><tbody>
    ${D.reg.map(g => { const t = new Date().toISOString().slice(0, 10), f = d => d.split('-').reverse().join('/'), soon = g.eff && g.eff > t;
      return `<tr class="${g.flag ? 'hl' : soon ? 'soon' : ''}"><td style="white-space:nowrap">${g.id}${soon ? `<div><span class="pill rs-soon">Chưa hiệu lực</span></div><div class="rs-d">từ ${f(g.eff)}</div>` : ''}</td><td>${esc(g.rule)}</td><td>${esc(g.level)}${g.flag ? `<div class="note keep">⚠ ${esc(g.flag)}</div>` : ''}</td><td>${esc(g.doc)}${g.ref && D.regRef ? `<div><a href="${D.regRef.u}" target="_blank" rel="noopener" class="rs-a">Phân tích FinSuccess →</a></div>` : ''}</td><td>${esc(g.path)}</td></tr>`; }).join('')}
    </tbody></table></div></article>`;

  mk('chFx', { type: 'line', data: { labels: fx.nhtmSell.map(v => v.d.slice(0, 7)), datasets: [
    { label: 'NHTM bán ra', data: fx.nhtmSell.map(v => v.v), borderColor: C.navy, backgroundColor: C.navy, borderWidth: 2.2, dp: 0 },
    { label: 'Trung tâm', data: alignM(fx.central, fx.nhtmSell), borderColor: C.teal, backgroundColor: C.teal, dp: 0 },
    { label: 'Trần biên độ', data: alignM(fx.ceiling, fx.nhtmSell), borderColor: C.red, backgroundColor: C.red, borderDash: [5, 4], dp: 0, keep: true },
    { label: 'Tự do bán ra', data: alignM(fx.free, fx.nhtmSell), borderColor: '#d9a400', backgroundColor: '#d9a400', borderWidth: 2.2, dp: 0 },
    { label: 'NHNN bán can thiệp', data: alignM(fx.sbvSell, fx.nhtmSell), borderColor: C.purple, backgroundColor: C.purple, borderDash: [2, 3], dp: 0, keep: true },
  ] }, options: { scales: { y: numAxis() } } }, { switch: 'line' });
  mk('chOn', { type: 'bar', data: { labels: MA.onDaily.map(v => dvn(v.d).slice(0, 5)), datasets: [
    { type: 'line', label: 'LNH qua đêm', data: MA.onDaily.map(v => v.v), borderColor: C.navy, backgroundColor: C.navy, yAxisID: 'y', pointRadius: 0, borderWidth: 2, dp: 2, unit: '%' },
    { type: 'line', label: 'Lãi suất OMO', data: alignD(MA.omoRateDaily, MA.onDaily), borderColor: C.teal, borderDash: [5, 4], yAxisID: 'y', pointRadius: 0, dp: 2, unit: '%' },
    { label: 'Bơm/hút ròng (tỷ)', data: alignD(MA.omoNetDaily, MA.onDaily), backgroundColor: alignD(MA.omoNetDaily, MA.onDaily).map(v => v >= 0 ? 'rgba(41,56,168,.35)' : 'rgba(192,57,43,.35)'), yAxisID: 'y1', dp: 0 },
  ] }, options: { scales: { x: { ticks: { maxTicksLimit: 10 } }, y: pctAxis('%'), y1: numAxis('tỷ đồng', { position: 'right', grid: { display: false } }) } } });
  mk('chDep', { type: 'line', data: { labels: r.dep12State.map(v => v.d.slice(0, 7)), datasets: [
    { label: 'CTG 12T', data: alignM(r.dep12CTG, r.dep12State), borderColor: C.navy, backgroundColor: C.navy, borderWidth: 2.4, dp: 2, unit: '%' },
    { label: 'NHTM Nhà nước 12T', data: r.dep12State.map(v => v.v), borderColor: C.teal, backgroundColor: C.teal, borderDash: [4, 3], dp: 2, unit: '%' },
    { label: 'NHTM khác 12T', data: alignM(r.dep12Other, r.dep12State), borderColor: C.purple, backgroundColor: C.purple, dp: 2, unit: '%' },
  ] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' });
  const yrs = [...new Set(MA.credit.ytd.map(v => v.d.slice(0, 4)))].slice(-4);
  mk('chCredit', { type: 'line', data: { labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'], datasets: yrs.map((y, i) => ({
    label: y, data: Array.from({ length: 12 }, (_, m) => { const f = MA.credit.ytd.find(v => v.d.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)); return f ? f.v : null; }),
    borderColor: [C.steps[5], C.steps[4], C.steps[2], C.navy][i + 4 - yrs.length], borderWidth: y === yrs[yrs.length - 1] ? 3 : 1.6, dp: 2, unit: '%', spanGaps: false })) },
    options: { scales: { y: pctAxis() }, plugins: { refLines: { lines: [{ value: 15, label: 'Chỉ tiêu 2026 ~15%' }] } } } });
  mk('chCreditDep', { type: 'line', data: { labels: MA.credit.yoy.map(v => v.d.slice(0, 7)), datasets: [
    { label: 'Tín dụng YoY', data: MA.credit.yoy.map(v => v.v), borderColor: C.navy, backgroundColor: C.navy, dp: 1, unit: '%' },
    { label: 'Tổng tiền gửi YoY', data: alignM(MA.credit.depositsYoY, MA.credit.yoy), borderColor: C.teal, backgroundColor: C.teal, dp: 1, unit: '%' },
  ] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' });
  const q16 = lastN(Q, 16);
  mk('chLdr', { type: 'line', data: { labels: q16.map(q => q.q), datasets: [
    { label: 'LDR', data: q16.map(q => q.ldr), borderColor: C.navy, backgroundColor: C.navy, dp: 1, unit: '%' },
    { label: 'CASA', data: q16.map(q => q.casa), borderColor: C.teal, backgroundColor: C.teal, yAxisID: 'y1', dp: 1, unit: '%' },
  ] }, options: { scales: { y: pctAxis('LDR'), y1: pctAxis('CASA', { position: 'right', grid: { display: false } }) }, plugins: { refLines: { lines: [{ value: 85, label: 'Trần 85% (TT22)' }] } } } }, { switch: 'line' });
  mk('chCar', { type: 'bar', data: { labels: D.car.map(c => c.period), datasets: [
    { label: 'CAR', data: D.car.map(c => c.car), backgroundColor: C.blue, dp: 2, unit: '%' },
    { label: 'Vốn cấp 1', data: D.car.map(c => c.tier1), backgroundColor: C.teal, dp: 2, unit: '%' },
  ] }, options: { scales: { y: pctAxis('', { min: 0 }) }, plugins: { refLines: { lines: [{ value: 8, label: 'Tối thiểu 8%' }] } } } });
  const secLab = { wholesale_retail: 'Bán buôn, bán lẻ', manufacturing: 'Chế biến, chế tạo', trade_services: 'Thương mại dịch vụ', household_activities: 'Hộ gia đình', utilities: 'Điện, khí, nước', construction_realestate: 'Xây dựng & BĐS', agriculture: 'Nông, lâm, thủy sản', transport_storage: 'Vận tải, kho bãi' };
  mk('chMix', { type: 'bar', data: { labels: Object.values(secLab), datasets: [
    { label: mix0 ? mix0.q : '', data: Object.keys(secLab).map(k => mix0 && mix0.bySector[k]), backgroundColor: C.steps[5], dp: 1, unit: '%' },
    { label: mixQ4.q, data: Object.keys(secLab).map(k => mixQ4.bySector[k]), backgroundColor: C.navy, dp: 1, unit: '%' },
  ] }, options: { indexAxis: 'y', scales: { x: pctAxis() } } });
}
function alignM(src, base) { return base.map(b => { const f = src.find(s => s.d.slice(0, 7) === b.d.slice(0, 7)); return f ? f.v : null; }); }
function alignD(src, base) { return base.map(b => { const f = src.find(s => s.d === b.d); return f ? f.v : null; }); }

/* =====================================================================
   TAB 3 · TÀI CHÍNH
===================================================================== */
function paneFin() {
  const subs = [['bs', 'Bảng cân đối'], ['pl', 'Kết quả kinh doanh'], ['room', 'Room & an toàn vốn'], ['nim', 'Biên lãi'], ['aq', 'Chất lượng tài sản'], ['nfi', 'Thu nhập ngoài lãi'], ['eff', 'Hiệu quả & vốn'], ['peer', 'So sánh nhóm'], ['camel', 'Bảng CAMEL']];
  const A = D.annual; const P = D.plan; const X = D.ctx;
  const prevY = A[A.length - 1];
  $('#fin').innerHTML = `<h2 class="sec">Tài chính</h2><p class="sec-sub">Khung 8 bước: nguồn vốn → tài sản sinh lời → chất lượng tài sản → biên lãi → thu nhập ngoài lãi → hiệu quả & vốn. Tỷ đồng, BCTC hợp nhất; số mới nhất ${QL.q}.</p>
  <div class="subtabs" role="tablist">${subs.map(([k, l], i) => `<button type="button" data-sub="${k}" class="${i ? '' : 'on'}">${l}</button>`).join('')}</div>
  <div class="picker tf fin-range" data-finr><span class="muted">Khung thời gian biểu đồ quý:</span>${[['def', 'Gần đây'], ['5y', '5 năm'], ['all', `Toàn bộ (từ ${Q[0].q})`]].map(([k, l]) => `<button type="button" data-k="${k}" class="${k === FIN_RANGE ? 'on' : ''}">${l}</button>`).join('')}</div>
  <div class="sub on" data-subp="bs">
    <div class="grid g2 gap">
      ${card({ id: 'chWfA', title: `Cơ cấu tài sản ${QL.q}`, sub: 'tỷ đồng · cộng dồn tới tổng tài sản', h: 'tall',
        insight: `Cho vay KH ròng <b>${nf(QL.loansNet)}</b> tỷ, chiếm <b>${pc(QL.loansNet / QL.ta * 100)}</b> tổng tài sản; tiền gửi và cho vay TCTD <b>${nf(QL.interbankA)}</b> tỷ (${pc(QL.interbankA / QL.ta * 100)}) — theo TT50 khoản này bị trừ khỏi mẫu số D khi tính LDR. Lãi, phí phải thu <b>${nf(QL.accrued)}</b> tỷ (${pc(QL.accruedToTA, 2)} tổng TS).`,
        src: 'WiData fs_bank' })}
      ${card({ id: 'chWfL', title: `Cơ cấu nguồn vốn ${QL.q}`, sub: 'tỷ đồng · cộng dồn tới tổng nguồn vốn', h: 'tall',
        insight: `Tiền gửi KH <b>${nf(QL.deposits)}</b> tỷ (${pc(QL.deposits / QL.ta * 100)}); vay CP & NHNN (chủ yếu tiền gửi KBNN) <b>${nf(QL.govSbv)}</b> tỷ — nguồn đặc thù Big 4; GTCG <b>${nf(QL.papers)}</b> tỷ là nguồn ổn định vì không rút trước hạn. VCSH <b>${nf(QL.equity)}</b> tỷ, đòn bẩy TS/VCSH <b>${nf(QL.ta / QL.equity, 1)}x</b>.`,
        src: 'WiData fs_bank' })}
      ${card({ id: 'chEA', title: 'Tài sản theo quý', sub: 'tỷ đồng · cột chồng (BNK-01)', ctl: false,
        insight: `Tổng tài sản tăng <b>${sg((QL.ta / Q[Q.length - 5].ta - 1) * 100)}</b> YoY; cho vay KH gộp tăng <b>${sg((QL.loansGross / Q[Q.length - 5].loansGross - 1) * 100)}</b> trong khi liên ngân hàng tăng ${sg((QL.interbankA / Q[Q.length - 5].interbankA - 1) * 100)} — tăng trưởng tài sản không chỉ đến từ cho vay.`, src: 'WiData fs_bank' })}
      ${card({ id: 'chFund', title: 'Nguồn vốn theo quý', sub: 'tỷ đồng · cột chồng (BNK-02)',
        insight: `Tiền gửi KH tăng <b>${sg((QL.deposits / Q[Q.length - 5].deposits - 1) * 100)}</b> YoY, chậm hơn cho vay (${sg((QL.loansGross / Q[Q.length - 5].loansGross - 1) * 100)}); phần chênh được bù bởi liên ngân hàng (${sg((QL.interbankL / Q[Q.length - 5].interbankL - 1) * 100)}) và nợ CP, NHNN — đúng logic R-09.`, src: 'WiData fs_bank' })}
    </div></div>
  <div class="sub" data-subp="pl">
    <div class="grid g2 gap">
      ${card({ id: 'chPlY', title: 'Lợi nhuận trước thuế theo năm + kế hoạch ' + (P ? P.year : ''), sub: 'tỷ đồng · ' + A[0].y + '–' + prevY.y + '; năm ' + (P ? P.year : '') + ': viền đứt = KH ĐHĐCĐ, phần tô = lũy kế ' + (P ? P.ytdLabel : ''),
        insight: P ? `LNTT ${prevY.y} <b>${nf(prevY.pbt)}</b> tỷ (${sg((prevY.pbt / A[A.length - 2].pbt - 1) * 100)}). Kế hoạch ${P.year} <b>${nf(P.pbt)}</b> tỷ (${sg((P.pbt / prevY.pbt - 1) * 100)}); ${P.ytdLabel} đạt <b>${nf(P.pbtYTD)}</b> tỷ = <b>${pc(P.pbtDone)}</b> KH. Lịch sử hoàn thành KH cao (${A.filter(a => a.planDone).slice(-4).map(a => a.y + ': ' + pc(a.planDone, 0)).join(', ')}) — KH thường đặt thận trọng.` : '', src: 'WiData fs_bank, co_plans, ratio_common_year' })}
      ${card({ id: 'chToiY', title: 'Cơ cấu tổng thu nhập hoạt động theo năm', sub: 'tỷ đồng · cột chồng', ctl: false,
        insight: `TOI ${prevY.y} <b>${nf(prevY.toi)}</b> tỷ; thu nhập lãi thuần chiếm <b>${pc(prevY.nii / prevY.toi * 100)}</b>. Thu nhập khác (chủ yếu thu hồi nợ đã xử lý) <b>${nf(prevY.otherInc)}</b> tỷ — đối chiếu tiền thu nợ đã xử lý trên LCTT <b>${nf(prevY.recoveries)}</b> tỷ (BNK-17).`, src: 'WiData fs_bank' })}
      ${card({ id: 'chToiQ', title: 'Cơ cấu thu nhập theo quý', sub: 'tỷ đồng · 12 quý gần nhất',
        insight: `${QL.q}: TOI <b>${nf(QL.toi)}</b> tỷ (${sg((QL.toi / Q[Q.length - 5].toi - 1) * 100)} YoY), NII <b>${nf(QL.nii)}</b> tỷ (${sg((QL.nii / Q[Q.length - 5].nii - 1) * 100)}), phí dịch vụ ${nf(QL.nfi)} tỷ (${sg((QL.nfi / Q[Q.length - 5].nfi - 1) * 100)}).`, src: 'WiData fs_bank' })}
      ${card({ id: 'chPpop', title: 'PPOP, chi phí dự phòng và LNTT theo quý', sub: 'tỷ đồng · PPOP loại nhiễu dự phòng (BNK-16)', ctl: true,
        insight: `PPOP ${QL.q} <b>${nf(QL.ppop)}</b> tỷ; dự phòng <b>${nf(-QL.prov)}</b> tỷ (${pc(-QL.prov / QL.ppop * 100, 0)} PPOP) so với ${nf(-Q[Q.length - 5].prov)} tỷ cùng kỳ. LNTT tăng mạnh hơn PPOP khi dự phòng giảm — cần theo dõi vì LLR đã xuống ${pc(QL.llr, 0)}.`, src: 'WiData fs_bank' })}
    </div></div>
  <div class="sub" data-subp="room">${roomSub()}</div>
  <div class="sub" data-subp="nim">
    <div class="grid g2 gap">
      ${X ? card({ id: 'chNimPeer', title: 'NIM và chi phí vốn: CTG so với Big 4 và ngành', sub: '% · TTM theo quý · Big 4 và ngành = bình quân gia quyền theo dư nợ của các ngân hàng niêm yết', ctl: true,
        insight: nimPeerIns(), src: 'BCTC các ngân hàng niêm yết · tự tổng hợp' }) : ''}
      ${card({ id: 'chGap', title: 'Khe hở tài sản − nợ nhạy cảm lãi suất ≤ 12 tháng', sub: 'tỷ đồng · quý · âm = nợ định giá lại nhanh hơn tài sản (thuyết minh rủi ro lãi suất)',
        insight: gapIns(), src: 'Thuyết minh rủi ro lãi suất, BCTC hợp nhất' })}
      ${card({ id: 'chNim', title: 'NIM, YEA và COF', sub: '% · TTM theo quý (BNK-05, 06, 07)', ctl: true,
        insight: `NIM TTM <b>${pc(QL.nim, 2)}</b> phục hồi từ đáy <b>${pc(Math.min(...lastN(Q, 8).map(q => q.nim)), 2)}</b>: YEA tăng lên <b>${pc(QL.yea, 2)}</b> nhanh hơn COF (<b>${pc(QL.cof, 2)}</b>). Theo deck, Big 4 có repricing gap ngắn nên NIM có thể nở khi lãi suất tăng — dữ liệu ${Q[Q.length - 3].q}–${QL.q} khớp với nhận định này.`, src: 'WiData ratio_bank_ttm' })}
      ${card({ id: 'chNimAdj', title: 'NIM và NIM sau chi phí tín dụng', sub: '% · TTM · NIM điều chỉnh = (NII − dự phòng) / TS sinh lời (tự tính)', ctl: true,
        insight: `NIM sau dự phòng <b>${pc(QL.nimAdj, 2)}</b> so với NIM <b>${pc(QL.nim, 2)}</b>: chi phí tín dụng ăn <b>${nf(QL.nim - QL.nimAdj, 2)} điểm %</b>. Chỉ số này so sánh ngang giữa ngân hàng cho vay rủi ro cao (YEA cao, dự phòng cao) và ngân hàng thận trọng.`, src: 'Tự tính từ WiData fs_bank, ratio_bank_ttm' })}
      ${card({ id: 'chCof', title: 'COF CTG vs lãi suất huy động 12T niêm yết', sub: '% · COF TTM theo quý; LS niêm yết CTG cuối quý', ctl: true,
        insight: `COF thực tế <b>${pc(QL.cof, 2)}</b> thấp hơn lãi suất 12T niêm yết vì CASA ~${pc(QL.casa, 0)} và tiền gửi KBNN. Lãi suất niêm yết tăng từ đầu 2026 sẽ vào COF với độ trễ (R-13).`, src: 'WiData ratio_bank_ttm; macro 202862' })}
      ${card({ id: 'chCasa', title: 'CASA và tỷ trọng thu phí', sub: '% · quý · CASA = (không kỳ hạn + ký quỹ)/tiền gửi KH', ctl: true,
        insight: `CASA <b>${pc(QL.casa)}</b>; NFI/TOI TTM <b>${pc(QL.nfiShare)}</b>. Cả hai là nguồn đỡ NIM khi lãi suất biến động — CTG thấp hơn TCB, MBB, VCB về CASA (xem So sánh nhóm).`, src: 'WiData ratio_bank, ratio_bank_ttm' })}
    </div></div>
  <div class="sub" data-subp="aq">
    <div class="grid g2 gap">
      ${card({ id: 'chAccr', title: 'Lãi, phí phải thu so với cho vay', sub: 'tăng trưởng YoY (%) và lãi phải thu / dư nợ (%, trục phải) · lãi dự thu tăng nhanh hơn dư nợ là dấu hiệu nợ xấu tiềm ẩn', ctl: true,
        insight: accrIns(), src: 'BCTC hợp nhất (tài sản Có khác: lãi, phí phải thu; cho vay khách hàng)' })}
      ${X ? card({ id: 'chAqPeer', title: 'Nợ xấu và nhóm 2: CTG so với Big 4 và ngành', sub: '% dư nợ · quý', ctl: true,
        insight: aqPeerIns(), src: 'BCTC các ngân hàng niêm yết · tự tổng hợp' }) : ''}
      ${card({ id: 'chNpl', title: 'Nợ xấu và nợ nhóm 2', sub: '% dư nợ · quý (BNK-10)', ctl: true,
        insight: `NPL <b>${pc(QL.npl, 2)}</b> (quý trước ${pc(QP.npl, 2)}), nhóm 2 <b>${pc(QL.g2, 2)}</b>. Deck lưu ý nhóm 2 đồng pha với NPL chứ không phải chỉ báo sớm — nên đọc cùng hình thành nợ xấu.`, src: 'WiData ratio_bank' })}
      ${card({ id: 'chForm', title: 'Hình thành nợ xấu (ước tính)', sub: 'tỷ đồng/quý và % dư nợ quy năm · = ΔNPL + nợ xử lý bằng dự phòng (BNK-11, tự tính)',
        insight: `${QL.q}: hình thành nợ xấu khoảng <b>${nf(QL.nplFormation)}</b> tỷ (<b>${pc(QL.nplFormationRate, 2)}</b> dư nợ quy năm), nợ xử lý bằng dự phòng ~${nf(QL.writeOffEst)} tỷ. Số tự tính khớp ước tính ~10.500 tỷ của CTCK (VNDS 04/08/2026). Tỷ lệ NPL thấp phần lớn nhờ xử lý nợ, không phải danh mục sạch hơn.`, src: 'Tự tính từ WiData fs_bank, ratio_bank' })}
      ${card({ id: 'chLlr', title: 'Bao phủ nợ xấu', sub: '% · LLR và LLR khi coi lãi, phí phải thu là nợ xấu (BNK-12, 14)', ctl: true,
        insight: `LLR giảm từ <b>${pc(Q[Q.length - 3].llr, 0)}</b> (${Q[Q.length - 3].q}) xuống <b>${pc(QL.llr, 0)}</b>, dưới mục tiêu trung hạn 150% của ngân hàng (theo CTCK). Stress test theo deck — cộng lãi dự thu vào nợ xấu — LLR chỉ còn <b>${pc(QL.llrInclAccrued, 0)}</b>.`, src: 'WiData ratio_bank; tự tính' })}
      ${card({ id: 'chCc', title: 'Chi phí tín dụng và thu hồi nợ đã xử lý', sub: 'chi phí tín dụng % (TTM, tự tính) · thu hồi nợ tỷ đồng/quý (LCTT)', ctl: false,
        insight: `Chi phí tín dụng TTM <b>${pc(QL.creditCost, 2)}</b> dư nợ bình quân. Thu hồi nợ đã xử lý TTM <b>${nf(QL.recoveriesTTM)}</b> tỷ; nợ ngoại bảng đã xử lý còn <b>${nf(QL.writtenOff)}</b> tỷ — "kho" thu nhập khác cho các năm tới (mục tiêu ~10.000 tỷ/năm theo CTCK).`, src: 'WiData fs_bank (is140, cfx04, obs11)' })}
    </div></div>
  <div class="sub" data-subp="nfi">
    <div class="grid g2 gap">
      ${card({ id: 'chNfiQ', title: 'Thu nhập ngoài lãi theo quý', sub: 'tỷ đồng · lãi thuần dịch vụ, ngoại hối, chứng khoán, góp vốn và thu nhập khác (chủ yếu thu hồi nợ đã xử lý)',
        insight: nfiIns(), src: 'BCTC hợp nhất' })}
      ${card({ id: 'chNfiShare', title: 'Tỷ trọng thu nhập ngoài lãi trong TOI', sub: '% · TTM theo quý · tách phần ổn định (dịch vụ) và phần biến động (ngoại hối, chứng khoán, khác)', ctl: true,
        insight: nfiShareIns(), src: 'BCTC hợp nhất · tự tính' })}
    </div>
    ${D.fee ? feeCard() : ''}</div>
  <div class="sub" data-subp="eff">
    <div class="grid g2 gap">
      ${card({ id: 'chCir', title: 'CIR', sub: '% · TTM theo quý (BNK-09)', ctl: true,
        insight: `CIR <b>${pc(QL.cir)}</b> giảm từ ${pc(Q[Q.length - 9].cir)} hai năm trước — hiệu quả vận hành cải thiện nhờ thu nhập tăng nhanh hơn chi phí.`, src: 'WiData ratio_bank_ttm' })}
      ${card({ id: 'chRoe', title: 'ROE và ROA', sub: '% · TTM theo quý', ctl: true,
        insight: `ROE <b>${pc(QL.roe)}</b>, ROA <b>${pc(QL.roa, 2)}</b> — cao nhất 8 năm. Deck: ngân hàng có lợi nhuận và dòng tiền ít lệch nên ROE phản ánh khả năng tạo tiền cho cổ đông, trừ khi phải thu lớn (lãi dự thu ${pc(QL.accruedToTA, 2)} tổng TS).`, src: 'WiData ratio_common_ttm' })}
    </div>
    <article class="card"><h3 class="sub">Cổ tức và hoàn thành kế hoạch</h3><div class="tscroll"><table><thead><tr><th>Năm</th><th class="n">LNTT (tỷ)</th><th class="n">ROE</th><th class="n">Cổ tức tiền (đ/CP)</th><th class="n">Cổ tức CP</th><th class="n">Tỷ lệ chi trả tiền</th><th class="n">Hoàn thành KH</th></tr></thead><tbody>
      ${A.slice(-8).map(a => `<tr><td>${a.y}</td><td class="n">${nf(a.pbt)}</td><td class="n">${pc(a.roe)}</td><td class="n">${a.cashDiv ? nf(a.cashDiv) : '—'}</td><td class="n">${a.stockDiv ? pc(a.stockDiv) : '—'}</td><td class="n">${a.payout ? pc(a.payout) : '—'}</td><td class="n">${a.planDone ? pc(a.planDone, 0) : '—'}</td></tr>`).join('')}
    </tbody></table></div><div class="insight">Cổ tức tiền mặt thấp (tỷ lệ chi trả ~10%) đi cùng cổ tức cổ phiếu lớn (44,6% năm 2025) — đúng logic deck: CAR mỏng buộc giữ lại lợi nhuận để tăng vốn.</div><div class="src">Nguồn: WiData ratio_common_year, co_events</div></article>
  </div>
  <div class="sub" data-subp="peer">
    <article class="card"><h3 class="sub">So sánh nhóm ${esc(D.peers.period)}</h3><p class="chart-sub">Nhóm: Big 4 (niêm yết: VCB, BID, CTG) · Tư nhân lớn · Tư nhân vừa. Chọn chỉ tiêu để vẽ.</p>
      <div class="filter" id="peerPick">${[['nim', 'NIM'], ['cof', 'COF'], ['casa', 'CASA'], ['npl', 'NPL'], ['g2', 'Nhóm 2'], ['llr', 'LLR'], ['roe', 'ROE'], ['cir', 'CIR'], ['creditYoY', 'Tín dụng YoY'], ['ldr', 'LDR']].map(([k, l], i) => `<button type="button" data-k="${k}" class="${i ? '' : 'on'}">${l}</button>`).join('')}</div>
      <div class="cbox"><canvas id="chPeer" role="img" aria-label="So sánh nhóm"></canvas></div>
      <div class="insight" id="peerIns"></div>
      <details class="more" open><summary>Bảng so sánh</summary><div class="tscroll"><table><thead><tr><th>Mã</th><th>Nhóm</th><th class="n">NIM</th><th class="n">COF</th><th class="n">CASA</th><th class="n">NPL</th><th class="n">Nhóm 2</th><th class="n">LLR</th><th class="n">CIR</th><th class="n">ROE</th><th class="n">Tín dụng YoY</th><th class="n">LDR</th></tr></thead><tbody>
        ${D.peers.rows.map(r => `<tr class="${r.symbol === M.ticker ? 'hl' : ''}"><td>${r.symbol}</td><td>${r.group}</td><td class="n">${pc(r.nim, 2)}</td><td class="n">${pc(r.cof, 2)}</td><td class="n">${pc(r.casa)}</td><td class="n">${pc(r.npl, 2)}</td><td class="n">${pc(r.g2, 2)}</td><td class="n">${pc(r.llr, 0)}</td><td class="n">${pc(r.cir)}</td><td class="n">${pc(r.roe)}</td><td class="n">${pc(r.creditYoY)}</td><td class="n">${pc(r.ldr)}</td></tr>`).join('')}
      </tbody></table></div></details><div class="src">Nguồn: WiData ratio_bank, ratio_bank_ttm, ratio_common_ttm</div></article>
  </div>
  <div class="sub" data-subp="camel">${camel()}</div>`;

  // --- subtab switch
  $$('#fin .subtabs button').forEach(b => b.onclick = () => {
    $$('#fin .subtabs button').forEach(x => x.classList.toggle('on', x === b));
    $$('#fin .sub').forEach(p => p.classList.toggle('on', p.dataset.subp === b.dataset.sub));
    finCharts(b.dataset.sub);
  });
  $$('#fin [data-finr] button').forEach(b => b.onclick = () => {
    const cur = ($('#fin .subtabs button.on') || {}).dataset; FIN_RANGE = b.dataset.k;
    rerender('fin'); const t = cur && $(`#fin .subtabs [data-sub="${cur.sub}"]`); if (t) t.click();
  });
  finCharts('bs');
}
const finDone = {};
function finCharts(k) {
  if (finDone[k]) return; finDone[k] = true;
  const q12 = win(Q, 12), q16 = win(Q, 16), A = D.annual, P = D.plan;
  if (k === 'bs') {
    wf('chWfA', [['Tiền mặt & NHNN', QL.cash], ['TCTD', QL.interbankA], ['Chứng khoán', QL.secs], ['Cho vay KH ròng', QL.loansNet], ['Góp vốn, TSCĐ, khác', QL.ta - QL.cash - QL.interbankA - QL.secs - QL.loansNet]], 'Tổng tài sản', QL.ta);
    wf('chWfL', [['Tiền gửi KH', QL.deposits], ['Tiền gửi & vay TCTD', QL.interbankL], ['GTCG', QL.papers], ['Nợ CP & NHNN', QL.govSbv], ['Nợ khác', QL.otherL], ['VCSH', QL.equity]], 'Tổng nguồn vốn', QL.ta);
    stack('chEA', q12, [['Tiền mặt & NHNN', 'cash'], ['TCTD', 'interbankA'], ['Chứng khoán', 'secs'], ['Cho vay KH ròng', 'loansNet']]);
    stack('chFund', q12, [['Tiền gửi KH', 'deposits'], ['TCTD', 'interbankL'], ['GTCG', 'papers'], ['CP & NHNN', 'govSbv'], ['VCSH', 'equity']]);
  }
  if (k === 'pl') {
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
    const qq = Q.filter(q => q.nim);
    mk('chNim', { type: 'line', data: { labels: qq.map(q => q.q), datasets: [
      { label: 'NIM', data: qq.map(q => q.nim), borderColor: C.navy, backgroundColor: C.navy, borderWidth: 2.5, dp: 2, unit: '%' },
      { label: 'YEA', data: qq.map(q => q.yea), borderColor: C.teal, backgroundColor: C.teal, dp: 2, unit: '%' },
      { label: 'COF', data: qq.map(q => q.cof), borderColor: C.purple, backgroundColor: C.purple, dp: 2, unit: '%' }] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' });
    const qa = Q.filter(q => q.nimAdj);
    mk('chNimAdj', { type: 'line', data: { labels: qa.map(q => q.q), datasets: [
      { label: 'NIM', data: qa.map(q => q.nim), borderColor: C.navy, backgroundColor: C.navy, dp: 2, unit: '%' },
      { label: 'NIM sau dự phòng', data: qa.map(q => q.nimAdj), borderColor: C.teal, backgroundColor: C.teal, dp: 2, unit: '%' }] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' });
    const dep = D.macro.rates.dep12CTG;
    const qc = Q.filter(q => yok(q, 2025));
    mk('chCof', { type: 'line', data: { labels: qc.map(q => q.q), datasets: [
      { label: 'COF TTM', data: qc.map(q => q.cof), borderColor: C.purple, backgroundColor: C.purple, dp: 2, unit: '%' },
      { label: 'LS 12T CTG cuối quý', data: qc.map(q => { const m = String(q.quarter * 3).padStart(2, '0'); const f = dep.find(v => v.d.startsWith(`${q.year}-${m}`)); return f ? f.v : null; }), borderColor: C.navy, backgroundColor: C.navy, borderDash: [5, 4], dp: 2, unit: '%' }] },
      options: { scales: { y: pctAxis() } } }, { switch: 'line' });
    mk('chCasa', { type: 'line', data: { labels: q16.map(q => q.q), datasets: [
      { label: 'CASA', data: q16.map(q => q.casa), borderColor: C.navy, backgroundColor: C.navy, dp: 1, unit: '%' },
      { label: 'NFI/TOI (TTM)', data: q16.map(q => q.nfiShare), borderColor: C.teal, backgroundColor: C.teal, dp: 1, unit: '%' }] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' });
    if (D.ctx) { const X = D.ctx, qs = X.quarters, cq = qs.map(l => Q.find(q => q.q === l));
      mk('chNimPeer', { type: 'line', data: { labels: qs, datasets: [
        { label: 'NIM CTG', data: cq.map(q => q && q.nim), borderColor: C.navy, backgroundColor: C.navy, dp: 2, unit: '%', borderWidth: 2.5 },
        { label: 'NIM Big 4', data: X.agg.nim['Big 4'], borderColor: C.teal, backgroundColor: C.teal, dp: 2, unit: '%' },
        { label: 'NIM ngành', data: X.agg.nim.all, borderColor: C.grey, backgroundColor: C.grey, dp: 2, unit: '%', borderDash: [5, 4] },
        { label: 'COF CTG', data: cq.map(q => q && q.cof), borderColor: C.purple, backgroundColor: C.purple, dp: 2, unit: '%' },
        { label: 'COF ngành', data: X.agg.cof.all, borderColor: C.red, backgroundColor: C.red, dp: 2, unit: '%', borderDash: [5, 4] }] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' }); }
    const qg = Q.filter(q => q.irGap != null && yok(q, 2022));
    mk('chGap', { type: 'bar', data: { labels: qg.map(q => q.q), datasets: [{ label: 'Khe hở ≤ 12 tháng (nghìn tỷ)', data: qg.map(q => q.irGap / 1000), backgroundColor: qg.map(q => q.irGap < 0 ? C.purple : C.teal), dp: 1 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: numAxis('nghìn tỷ đồng') } } });
  }
  if (k === 'nfi') {
    stack('chNfiQ', q12, [['Dịch vụ', 'nfi'], ['Ngoại hối', 'fx'], ['Chứng khoán', 'secInc'], ['Góp vốn', 'equityInc'], ['Khác (thu hồi nợ…)', 'otherInc']]);
    const qs = Q.filter(q => yok(q, 2021)).map((q, i, arr) => { const j = Q.indexOf(q); if (j < 3) return null; const t = Q.slice(j - 3, j + 1), toi = t.reduce((a, x) => a + x.toi, 0);
      return { q: q.q, fee: t.reduce((a, x) => a + x.nfi, 0) / toi * 100, vol: t.reduce((a, x) => a + x.fx + x.secInc + x.otherInc + (x.equityInc || 0), 0) / toi * 100 }; }).filter(Boolean);
    mk('chNfiShare', { type: 'line', data: { labels: qs.map(x => x.q), datasets: [
      { label: 'Phí dịch vụ / TOI', data: qs.map(x => x.fee), borderColor: C.navy, backgroundColor: C.navy, dp: 1, unit: '%' },
      { label: 'Ngoại hối, chứng khoán, khác / TOI', data: qs.map(x => x.vol), borderColor: C.gold, backgroundColor: C.gold, dp: 1, unit: '%' }] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' });
    if (D.fee) drawFee();
  }
  if (k === 'room') {
    const qr = Q.filter(q => q.ldr && yok(q, 2021)), X = D.ctx;
    mk('chLdrQ', { type: 'line', data: { labels: qr.map(q => q.q), datasets: [
      { label: 'LDR CTG', data: qr.map(q => q.ldr), borderColor: C.navy, backgroundColor: C.navy, dp: 1, unit: '%', borderWidth: 2.5 },
      ...(X ? [{ label: 'LDR Big 4', data: qr.map(q => AQ(q.q)('ldr', 'Big 4')), borderColor: C.teal, backgroundColor: C.teal, dp: 1, unit: '%', spanGaps: true },
        { label: 'LDR ngành', data: qr.map(q => AQ(q.q)('ldr', 'all')), borderColor: C.grey, backgroundColor: C.grey, borderDash: [5, 4], dp: 1, unit: '%', spanGaps: true }] : [])] },
      options: { scales: { y: pctAxis() }, plugins: { refLines: { lines: [{ value: 85, label: 'Trần 85% (TT22)', color: C.red }] } } } }, { switch: 'line' });
    const qq = Q.filter(q => q.creditYoY != null && yok(q, 2021));
    mk('chGrow', { type: 'line', data: { labels: qq.map(q => q.q), datasets: [
      { label: 'Tín dụng YoY', data: qq.map(q => q.creditYoY), borderColor: C.navy, backgroundColor: C.navy, dp: 1, unit: '%' },
      { label: 'Huy động YoY', data: qq.map(q => q.fundingYoY), borderColor: C.teal, backgroundColor: C.teal, dp: 1, unit: '%' }] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' });
    mk('chCarH', { type: 'bar', data: { labels: D.car.map(c => c.period), datasets: [
      { label: 'CAR', data: D.car.map(c => c.car), backgroundColor: C.navy, dp: 2, unit: '%' },
      { label: 'Vốn cấp 1', data: D.car.map(c => c.tier1), backgroundColor: C.teal, dp: 2, unit: '%' }] },
      options: { scales: { y: pctAxis('', { min: 0 }) }, plugins: { refLines: { lines: [{ value: 8, label: 'CAR tối thiểu 8%', color: C.red }, { value: 6, label: 'Vốn cấp 1 tối thiểu 6%', color: C.gold }] } } } });
  }
  if (k === 'aq') {
    const qa = Q.filter((q, i) => i >= 4 && yok(q, 2021)).map(q => { const i = Q.indexOf(q); return { q: q.q, a: yoyQ('accrued', i), l: yoyQ('loansGross', i), r: q.accrued / q.loansGross * 100 }; });
    mk('chAccr', { type: 'bar', data: { labels: qa.map(x => x.q), datasets: [
      { label: 'Lãi phải thu YoY', data: qa.map(x => x.a), backgroundColor: C.purple, dp: 1, unit: '%' },
      { label: 'Cho vay YoY', data: qa.map(x => x.l), backgroundColor: C.navy, dp: 1, unit: '%' },
      { type: 'line', label: 'Lãi phải thu / dư nợ', data: qa.map(x => x.r), borderColor: C.gold, backgroundColor: C.gold, yAxisID: 'y1', dp: 2, unit: '%' }] },
      options: { scales: { y: pctAxis('YoY'), y1: pctAxis('', { position: 'right', grid: { display: false } }) } } });
    if (D.ctx) { const X = D.ctx, qs = X.quarters, cq = qs.map(l => Q.find(q => q.q === l));
      mk('chAqPeer', { type: 'line', data: { labels: qs, datasets: [
        { label: 'NPL CTG', data: cq.map(q => q && q.npl), borderColor: C.red, backgroundColor: C.red, dp: 2, unit: '%', borderWidth: 2.5 },
        { label: 'NPL Big 4', data: X.agg.npl['Big 4'], borderColor: C.purple, backgroundColor: C.purple, dp: 2, unit: '%' },
        { label: 'NPL ngành', data: X.agg.npl.all, borderColor: C.grey, backgroundColor: C.grey, borderDash: [5, 4], dp: 2, unit: '%' },
        { label: 'Nhóm 2 CTG', data: cq.map(q => q && q.g2), borderColor: C.gold, backgroundColor: C.gold, dp: 2, unit: '%' },
        { label: 'Nhóm 2 ngành', data: X.agg.g2.all, borderColor: C.teal, backgroundColor: C.teal, borderDash: [5, 4], dp: 2, unit: '%' }] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' }); }
    mk('chNpl', { type: 'line', data: { labels: q16.map(q => q.q), datasets: [
      { label: 'NPL', data: q16.map(q => q.npl), borderColor: C.red, backgroundColor: C.red, dp: 2, unit: '%' },
      { label: 'Nhóm 2', data: q16.map(q => q.g2), borderColor: C.gold, backgroundColor: C.gold, dp: 2, unit: '%' }] }, options: { scales: { y: pctAxis() } } }, { switch: 'line' });
    const qf = Q.filter(q => q.nplFormation != null && yok(q, 2022));
    mk('chForm', { type: 'bar', data: { labels: qf.map(q => q.q), datasets: [
      { label: 'Hình thành nợ xấu (tỷ)', data: qf.map(q => q.nplFormation), backgroundColor: C.blue, yAxisID: 'y', dp: 0 },
      { type: 'line', label: '% dư nợ quy năm', data: qf.map(q => q.nplFormationRate), borderColor: C.red, backgroundColor: C.red, yAxisID: 'y1', dp: 2, unit: '%' }] },
      options: { scales: { y: numAxis('tỷ đồng'), y1: pctAxis('', { position: 'right', grid: { display: false } }) } } });
    mk('chLlr', { type: 'line', data: { labels: q16.map(q => q.q), datasets: [
      { label: 'LLR', data: q16.map(q => q.llr), borderColor: C.navy, backgroundColor: C.navy, dp: 0, unit: '%' },
      { label: 'LLR gồm lãi dự thu', data: q16.map(q => q.llrInclAccrued), borderColor: C.purple, backgroundColor: C.purple, borderDash: [5, 4], dp: 0, unit: '%' }] },
      options: { scales: { y: pctAxis() }, plugins: { refLines: { lines: [{ value: 150, label: 'Mục tiêu 150%', color: C.teal }] } } } }, { switch: 'line' });
    const qc = Q.filter(q => q.creditCost != null && yok(q, 2022));
    mk('chCc', { type: 'bar', data: { labels: qc.map(q => q.q), datasets: [
      { label: 'Thu hồi nợ đã xử lý (tỷ/quý)', data: qc.map(q => q.recoveries), backgroundColor: C.teal, yAxisID: 'y1', dp: 0 },
      { type: 'line', label: 'Chi phí tín dụng TTM', data: qc.map(q => q.creditCost), borderColor: C.red, backgroundColor: C.red, yAxisID: 'y', dp: 2, unit: '%' }] },
      options: { scales: { y: pctAxis('% dư nợ'), y1: numAxis('tỷ đồng', { position: 'right', grid: { display: false } }) } } });
  }
  if (k === 'eff') {
    const qq = Q.filter(q => q.cir);
    mk('chCir', { type: 'line', data: { labels: qq.map(q => q.q), datasets: [{ label: 'CIR', data: qq.map(q => q.cir), borderColor: C.navy, backgroundColor: C.navy, dp: 1, unit: '%' }] }, options: { plugins: { legend: { display: false } }, scales: { y: pctAxis() } } }, { switch: 'line' });
    mk('chRoe', { type: 'line', data: { labels: qq.map(q => q.q), datasets: [
      { label: 'ROE', data: qq.map(q => q.roe), borderColor: C.navy, backgroundColor: C.navy, dp: 1, unit: '%' },
      { label: 'ROA', data: qq.map(q => q.roa), borderColor: C.teal, backgroundColor: C.teal, yAxisID: 'y1', dp: 2, unit: '%' }] },
      options: { scales: { y: pctAxis('ROE'), y1: pctAxis('ROA', { position: 'right', grid: { display: false } }) } } }, { switch: 'line' });
  }
  if (k === 'peer') peer('nim');
}
function wf(id, parts, totalLabel, total) {
  let acc = 0; const data = parts.map(([, v]) => { const r = [acc, acc + v]; acc += v; return r; });
  mk(id, { type: 'bar', data: { labels: parts.map(p => p[0]).concat([totalLabel]), datasets: [{ label: 'Tỷ đồng', data: data.concat([[0, total]]),
    backgroundColor: parts.map((_, i) => C.steps[Math.min(i + 1, 5)]).concat([C.navy]), dp: 0 }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${nf(c.raw[1] - c.raw[0])} tỷ (${nf((c.raw[1] - c.raw[0]) / total * 100, 1)}%)` } } },
      scales: { y: numAxis('tỷ đồng'), x: { ticks: { autoSkip: false, maxRotation: 0, callback: function (v) { const l = this.getLabelForValue(v); if (l.length <= 12) return l; const w = l.split(' '); const h = Math.ceil(w.length / 2); return [w.slice(0, h).join(' '), w.slice(h).join(' ')]; } } } } },
    plugins: [{ id: 'wfLabels', afterDatasetsDraw(ch) { const ctx = ch.ctx; ch.getDatasetMeta(0).data.forEach((b, i) => { const r = ch.data.datasets[0].data[i]; ctx.save(); ctx.fillStyle = '#303540'; ctx.font = '600 11px Arial'; ctx.textAlign = 'center'; ctx.fillText(nf(r[1] - r[0]), b.x, Math.min(b.y, b.base) - 4); ctx.restore(); }); } }] });
}
function stack(id, qs, keys) {
  mk(id, { type: 'bar', data: { labels: qs.map(q => q.q), datasets: keys.map(([l, kk], i) => ({ label: l, data: qs.map(q => q[kk]), backgroundColor: [C.navy, C.blue, C.teal, C.purple, C.steps[4], C.gold][i], stack: 's', dp: 0 })) },
    options: { scales: { x: { stacked: true }, y: numAxis('tỷ đồng', { stacked: true }) } } });
}
function peer(k) {
  const rows = D.peers.rows.filter(r => r[k] != null);
  const lab = { nim: 'NIM', cof: 'COF', casa: 'CASA', npl: 'NPL', g2: 'Nợ nhóm 2', llr: 'LLR', roe: 'ROE', cir: 'CIR', creditYoY: 'Tín dụng YoY', ldr: 'LDR' }[k];
  mk('chPeer', { type: 'bar', data: { labels: rows.map(r => r.symbol), datasets: [{ label: lab, data: rows.map(r => r[k]), dp: 2, unit: '%',
    backgroundColor: rows.map(r => r.symbol === M.ticker ? C.teal : r.group === 'Big 4' ? C.navy : r.group === 'Tư nhân lớn' ? C.blue : C.steps[5]) }] },
    options: { plugins: { legend: { display: false } }, scales: { y: pctAxis() } } });
  const me = rows.find(r => r.symbol === M.ticker); const sorted = [...rows].sort((a, b) => b[k] - a[k]);
  const big4 = rows.filter(r => r.group === 'Big 4');
  $('#peerIns').innerHTML = `${lab} của ${M.ticker} <b>${pc(me[k], 2)}</b>, xếp <b>${sorted.indexOf(me) + 1}/${rows.length}</b> (cao → thấp); trong Big 4 niêm yết: ${big4.map(r => `${r.symbol} ${pc(r[k], 2)}`).join(' · ')}. Màu: teal = ${M.ticker}, navy = Big 4, xanh = tư nhân lớn, nhạt = tư nhân vừa.`;
  $$('#peerPick button').forEach(b => { b.classList.toggle('on', b.dataset.k === k); b.onclick = () => peer(b.dataset.k); });
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
    </tbody></table></div><div class="src">Nguồn: WiData fs_bank, ratio_bank, ratio_bank_ttm, ratio_common_ttm, bank_car_tt41</div></article>${camelTT21()}`;
}
function camelTT21() {   // điểm TT21 của CTG và vị trí trong nhóm NH quy mô lớn (dữ liệu từ dashboard ngành)
  const CM = (window.SECTOR_DATA || {}).camel; if (!CM) return '';
  const P = CM.periods.TTM2Q26, R = P.rows, me = R.find(r => r.s === 'CTG'); if (!me) return '';
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
  const T = tot(me);
  return `<article class="card"><h3 class="sub">CTG theo Thông tư 21/2025 · so với nhóm NH quy mô lớn</h3>
    <p class="chart-sub">${P.label} · ngưỡng của nhóm quy mô lớn (tổng tài sản bq &gt; 300 nghìn tỷ) · hạng trong nhóm: 1 = tốt nhất · định tính giả định ${nf(qual, 1)} điểm · chỉ tiêu không công bố chấm 1–5</p>
    <div class="kpis k4">${kpi('Điểm ước tính', nf(T, 2) + ' · ' + gr(T), 'khoảng ' + nf(me.quant.lo + wl * qual, 2) + '–' + nf(me.quant.hi + wl * qual, 2))}${kpi('Xếp hạng', rankP + '/' + peers.length + ' nhóm lớn', rankAll + '/' + R.length + ' toàn ngành')}${kpi('Room ngụ ý', nf(T * CM.roomCoef, 1) + '%', 'điểm × ' + nf(CM.roomCoef, 1) + '% (công thức room 2026)')}${kpi('Tiêu chí yếu nhất', Object.entries(me.crit).sort((a, b) => a[1].pt - b[1].pt)[0][0] + ' · ' + nf(Object.entries(me.crit).sort((a, b) => a[1].pt - b[1].pt)[0][1].pt, 1), 'điểm tiêu chí 1–5')}</div>
    <div class="tscroll"><table><thead><tr><th></th><th>Chỉ tiêu TT21</th><th class="n">CTG</th><th class="n">Trung vị nhóm</th><th class="n">Hạng trong nhóm</th><th class="n">Ngưỡng 5 · 4 · 3 · 2</th><th class="n">Điểm</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="insight">Room năm N+2 được giao theo điểm xếp hạng năm N (công văn room 2026: điểm 2024 × 2,6%), nên số liệu năm 2026 của CTG quyết định room 2028. So sánh đủ 26 ngân hàng, chỉnh điểm định tính và xem đòn bẩy room ở <a href="nganh.html#camel">dashboard Ngành › Bức tranh ngành › Xếp hạng TT21 &amp; room</a>.</div>
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
  </tbody></table></div><div class="note">Ngày của mốc chưa có lịch chính thức (VietinBank Tower, tăng vốn) là mốc theo dõi cuối năm, chưa xác nhận.</div></article>
  <article class="card"><h3 class="sub">Dòng sự kiện</h3>
    <div class="filter" id="evFilter">${types.map((t, i) => `<button type="button" data-t="${esc(t)}" class="${i ? '' : 'on'}">${esc(t)}</button>`).join('')}</div>
    <div class="tscroll"><table><thead><tr><th>Ngày</th><th>Loại</th><th>±</th><th>Sự kiện</th><th>Trạng thái</th></tr></thead><tbody id="evBody"></tbody></table></div>
    <div class="src">Nguồn: HOSE CBTT, WiData co_events, ai_news</div></article>`;
  const draw = t => { $('#evBody').innerHTML = D.events.filter(e => t === 'Tất cả' || e.type === t).map(e => `<tr><td style="white-space:nowrap">${dvn(e.d)}</td><td>${esc(e.type)}</td><td>${impact(e.impact)}</td><td>${esc(e.t)}${e.detail ? `<details class="more"><summary>Chi tiết</summary><div class="note">${esc(e.detail)}</div></details>` : ''}<div class="src">${esc(e.src)}</div></td><td>${e.status === 'pending' ? '<span class="pill pending">Chờ</span>' : '<span class="pill ok">Xác nhận</span>'}</td></tr>`).join('');
    $$('#evFilter button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); };
  $$('#evFilter button').forEach(b => b.onclick = () => draw(b.dataset.t)); draw('Tất cả');
}

/* =====================================================================
   TAB 5 · CONSENSUS CTCK
===================================================================== */
function paneCons() {
  const S = CS.summary; const s = store.get(); const myTp = s.decision && +s.decision.tp;
  const rows = CS.rows; const P = D.plan;
  const np = [...rows.filter(r => r.npF), ...CS.forecastOnly];
  const runRate = P ? P.npatYTD * 4 / P.ytdQuarters : null;
  $('#cons').innerHTML = `<h2 class="sec">Consensus CTCK</h2>
  <div class="banner warn">Báo cáo trước ${dvn(CS.fadeBefore)} (> 3 tháng) hiển thị mờ và không vào thống kê. TP chưa điều chỉnh theo cổ tức cổ phiếu 44,6% (12/2025) chỉ có ở báo cáo trước ngày đó — các báo cáo năm 2026 đã dùng số CP mới. Khuyến nghị là nhãn gộp của WiData (MUA gồm Khả quan/Outperform).</div>
  <div class="kpis">
    ${kpi('Median TP', nf(S.median) + 'đ', sg(S.upsideMedian) + ' vs giá', 'pos')}
    ${kpi('TB TP', nf(S.mean) + 'đ', 'min ' + nf(S.min) + ' · max ' + nf(S.max))}
    ${kpi('Khuyến nghị MUA', S.buy + '/' + S.n, 'CTCK có TP ≤ 3 tháng')}
    ${kpi('TP của tôi', myTp ? nf(myTp) + 'đ' : '—', myTp ? sg((myTp / M.price - 1) * 100) + ' vs giá' : 'nhập ở tab FinSuccess')}
    ${kpi('LNST 2026F (median)', nf(S.npMedian) + ' tỷ', sg((S.npMedian / FW.npat2025 - 1) * 100) + ' vs 2025 · ' + S.npN + ' dự phóng')}
    ${kpi('P/E · P/B forward', x(FW.peFwd) + ' · ' + x(FW.pbFwd), 'BVPS 2026F ' + nf(FW.bvps2026F) + 'đ')}
  </div>
  <h3 class="sub" style="margin:6px 0 10px">Dải dự phóng của các công ty chứng khoán</h3>
  <div class="grid g2 gap">
    ${card({ id: 'chTp', title: 'Giá mục tiêu từng CTCK', sub: 'đ/CP · đường đỏ = thị giá ' + nf(M.price) + 'đ · nhãn = upside', h: 'tall',
      insight: `Dải TP <b>${nf(S.min)}–${nf(S.max)}đ</b> (upside ${sg((S.min / M.price - 1) * 100, 0)} đến ${sg((S.max / M.price - 1) * 100, 0)}); không CTCK nào có TP dưới thị giá. Chênh lệch lớn nhất nằm ở giả định tái định giá P/B: Vietcap (48.800đ) kỳ vọng mở rộng NIM dài hạn, SSI (38.800đ, đã hạ từ 44.800đ) cho rằng CAR mỏng hạn chế tái định giá.` })}
    ${card({ id: 'chNp', title: 'LNST 2026F từng CTCK và kế hoạch ĐHĐCĐ', sub: 'tỷ đồng · nhãn = YoY so với LNST 2025 ' + nf(FW.npat2025) + ' tỷ · xám = run-rate ' + (P ? P.ytdLabel : '') + ' × 2', h: 'tall',
      insight: `Dự phóng 2026 nằm trong khoảng <b>${nf(S.npMin)}–${nf(S.npMax)}</b> tỷ (${sg((S.npMin / FW.npat2025 - 1) * 100, 0)} đến ${sg((S.npMax / FW.npat2025 - 1) * 100, 0)} YoY), đều cao hơn KH ĐHĐCĐ <b>${nf(P.npat)}</b> tỷ. ${P.ytdLabel} đã đạt <b>${nf(FW.npatH1)}</b> tỷ (${sg(P.npatYTDyoy)} YoY, ${pc(P.npatDone)} KH). Để khớp median, H2 cần <b>${nf(FW.impliedH2)}</b> tỷ — <b>${sg((FW.impliedH2 / FW.h2_2025 - 1) * 100)}</b> so với H2/2025 (${nf(FW.h2_2025)} tỷ), thấp hơn tốc độ H1 (${sg(P.npatYTDyoy)}): consensus đã giả định lợi nhuận chậm lại nửa cuối năm.` })}
  </div>
  <article class="card"><h3 class="sub">Chi tiết báo cáo</h3><div class="tscroll"><table><thead><tr><th>CTCK</th><th>Ngày</th><th>KN</th><th class="n">TP</th><th class="n">Upside</th><th class="n">TOI 2026F</th><th class="n">TOI 2027F</th><th class="n">LNST 2026F</th><th class="n">LNST 2027F</th><th>Luận điểm</th></tr></thead><tbody>
    ${[...rows, ...CS.forecastOnly].map(r => `<tr class="${r.stale ? 'stale' : ''}"><td><b>${esc(r.broker)}</b></td><td>${dvn(r.date)}</td><td>${esc(r.rating)}</td><td class="n">${r.tp ? nf(r.tp) : '—'}</td><td class="n">${r.tp ? sg(r.upside, 0) : '—'}</td><td class="n">${nf(r.toiF)}</td><td class="n">${nf(r.toiF1)}</td><td class="n">${nf(r.npF)}</td><td class="n">${nf(r.npF1)}</td><td>${esc(r.thesis)}${r.summary ? `<details class="more"><summary>Tóm tắt</summary><div class="note">${esc(r.summary)}</div></details>` : ''}</td></tr>`).join('')}
  </tbody></table></div><div class="src">Nguồn: ${esc(CS.src)}</div></article>`;
  const tr = [...rows].sort((a, b) => a.tp - b.tp);
  const fade = (c, r) => r.stale ? c + '55' : c;
  mk('chTp', { type: 'bar', data: { labels: tr.map(r => `${r.broker} ${dvn(r.date).slice(0, 5)}`), datasets: [
    { label: 'TP', data: tr.map(r => [M.price, r.tp]), backgroundColor: tr.map(r => fade(C.navy, r)), barThickness: 4, dp: 0 },
  ] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, refLines: { lines: [{ axis: 'x', value: M.price, label: 'Thị giá', color: C.red }] },
      tooltip: { callbacks: { label: c => { const r = tr[c.dataIndex]; return `TP ${nf(r.tp)}đ · upside ${sg(r.upside, 0)} · ${r.rating}`; } } } },
    scales: { x: numAxis('đ/CP', { min: Math.floor(M.price * 0.95 / 1000) * 1000 }) } },
    plugins: [{ id: 'upLab', afterDatasetsDraw(ch) { const ctx = ch.ctx; ch.getDatasetMeta(0).data.forEach((b, i) => { ctx.save(); const col = tr[i].stale ? '#b9c0cc' : C.navy; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = tr[i].stale ? '#9aa3b2' : C.navy; ctx.font = '600 11px Arial'; ctx.fillText(sg(tr[i].upside, 0), b.x + 10, b.y + 4); ctx.restore(); }); } }] });
  const nr = [...np].sort((a, b) => a.npF - b.npF);
  const lab = nr.map(r => `${r.broker} (${sg((r.npF / FW.npat2025 - 1) * 100, 0)})`).concat(['KH ĐHĐCĐ (' + sg((P.npat / FW.npat2025 - 1) * 100, 0) + ')', 'Run-rate ' + P.ytdLabel + ' ×2']);
  mk('chNp', { type: 'bar', data: { labels: lab, datasets: [{ label: 'LNST 2026F', dp: 0, unit: ' tỷ',
    data: nr.map(r => r.npF).concat([P.npat, runRate]),
    backgroundColor: nr.map(r => fade(C.teal, r)).concat([C.navy, '#c9ced8']), borderColor: nr.map(() => 'transparent').concat([C.navy, '#9aa3b2']), borderWidth: 1 }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false }, refLines: { lines: [{ axis: 'x', value: FW.npat2025, label: 'LNST 2025', color: C.purple }] } }, scales: { x: numAxis('tỷ đồng', { min: 0 }) } } });
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
      <div class="insight">P/B <b>${x(M.pb)}</b> thấp hơn mốc −1σ (${x(pbB.lo)}) trong khi ROE TTM <b>${pc(QL.roe)}</b> cao nhất 8 năm — theo deck, P/B thấp kèm ROE ổn định là vùng hấp dẫn; điều kiện ngược lại là chất lượng tài sản (LLR ${pc(QL.llr, 0)}, hình thành nợ xấu ${pc(QL.nplFormationRate, 2)}) và CAR ${pc(D.car[D.car.length - 1].car, 2)}.</div>
    </article>
    ${card({ id: 'chVal', title: 'P/B và P/E TTM theo quý', sub: 'lần · cuối quý · đường đứt = trung bình 20 quý', ctl: true, src: 'WiData ratio_common_ttm' })}
  </div>
  <div class="sub" data-vp="2">
    <article class="card"><h3 class="sub">Định giá theo kịch bản lãi suất (thu nhập thặng dư)</h3>
      <p class="chart-sub">P/B hợp lý = (ROE − g)/(COE − g), áp lên BVPS 2026F ${nf(FW.bvps2026F)}đ. Bốn kịch bản theo ma trận IDX-FX × IDX-LIQ (deck slide 39). <b>Giá trị khởi tạo chỉ để thử — chưa phải giả định của FinSuccess</b>; analyst sửa và lưu. Model CTG v2.3 (Excel) chưa nối vào bản này.</p>
      <div class="tscroll"><table id="scTable"><thead><tr><th>Kịch bản</th><th class="n">ROE bền vững %</th><th class="n">COE %</th><th class="n">g %</th><th class="n">P/B hợp lý</th><th class="n">Giá hợp lý</th><th class="n">Upside</th></tr></thead><tbody>
        ${scen.map((r, i) => `<tr data-i="${i}"><td><b>${esc(r.n)}</b></td><td class="n"><input data-f="roe" value="${r.roe}" style="width:70px"></td><td class="n"><input data-f="coe" value="${r.coe}" style="width:70px"></td><td class="n"><input data-f="g" value="${r.g}" style="width:60px"></td><td class="n" data-o="pb"></td><td class="n" data-o="px"></td><td class="n" data-o="up"></td></tr>`).join('')}
      </tbody></table></div>
      <div style="margin-top:10px;display:flex;gap:8px"><button class="btn" id="scSave" type="button">Lưu giả định</button><button class="btn ghost" id="scReset" type="button">Khôi phục mặc định</button><span class="calc" id="scMsg"></span></div>
      <div class="note">Đối chiếu: ROE TTM ${pc(QL.roe)}, ROE 5 năm ${D.annual.slice(-5).map(a => pc(a.roe, 0)).join(' → ')}; consensus median TP ${nf(CS.summary.median)}đ tương đương P/B 2026F ${x(CS.summary.median / FW.bvps2026F)}.</div>
    </article>
    <article class="card"><h3 class="sub">Rủi ro chính <span class="pill ai">AI tổng hợp</span></h3><p class="chart-sub">Từ số liệu dashboard và rủi ro các CTCK nêu (ai_news 05–09/2026)</p><table><thead><tr><th>Rủi ro</th><th>Dấu hiệu hiện tại</th><th>Theo dõi ở</th></tr></thead><tbody>
      <tr><td>Chất lượng tài sản xấu đi</td><td>Hình thành nợ xấu ${pc(QL.nplFormationRate, 2)} quy năm; LLR ${pc(QP.llr, 0)} → ${pc(QL.llr, 0)}; LLR gồm lãi dự thu ${pc(QL.llrInclAccrued, 0)}</td><td>Tài chính › Chất lượng tài sản; R-14</td></tr>
      <tr><td>COF tăng, NIM chững</td><td>LS huy động 12T +${nf(D.macro.rates.dep12CTG[D.macro.rates.dep12CTG.length - 1].v - D.macro.rates.dep12CTG[0].v, 1)} điểm % từ ${dvn(D.macro.rates.dep12CTG[0].d).slice(3)}; CASA ${pc(Q[Q.length - 3].casa)} → ${pc(QL.casa)}</td><td>Vĩ mô; R-09, R-13</td></tr>
      <tr><td>CAR mỏng hạn chế tăng trưởng, cổ tức</td><td>CAR ${pc(D.car[D.car.length - 1].car, 2)}, Tier 1 ${pc(D.car[D.car.length - 1].tier1, 2)}</td><td>Catalyst: phương án tăng vốn</td></tr>
      <tr><td>Áp lực tỷ giá từ bên ngoài</td><td>DXY ${nf(D.macro.fx.dxy[D.macro.fx.dxy.length - 1].v, 1)}; trung tâm +${nf((D.macro.fx.central[D.macro.fx.central.length - 1].v / D.macro.fx.central.find(v => v.d.startsWith('2025-12')).v - 1) * 100, 1)}% từ đầu năm</td><td>Vĩ mô; R-01</td></tr>
      <tr><td>Thu nhập một lần không như kỳ vọng</td><td>VietinBank Tower: ước tính lệch 800–3.000 tỷ giữa CTCK, thời điểm đã lùi</td><td>Catalyst</td></tr>
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
  ${esc(D.quarterlyNote)} Lời đọc dưới chart do AI viết từ số đang hiển thị; quan điểm FinSuccess chỉ là phần analyst nhập ở tab 💎 FinSuccess. Dữ liệu WiData lấy qua connector ngày ${dvn(M.updated)}.`;
}

/* ---------- tabs ---------- */
const builders = { overview: paneOverview, macro: paneMacro, fin: paneFin, events: paneEvents, cons: paneCons, val: paneVal };
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
let mode0 = 'compact'; try { mode0 = localStorage.getItem(UI_KEY) || 'compact'; } catch (e) {}
setMode(mode0);
header(); footer();
show((location.hash || '#overview').slice(1));
decorate();
// hash trùng id của pane làm trình duyệt tự cuộn xuống giữa trang khi mở link — luôn bắt đầu từ đầu trang
try { history.scrollRestoration = 'manual'; } catch (e) {}
scrollTo(0, 0); addEventListener('load', () => setTimeout(() => scrollTo(0, 0), 0));
})();
