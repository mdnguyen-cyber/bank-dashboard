/* Chi tiết bảng cân đối CTCK từ thuyết minh BCTC (data/sec-detail.js → window.SEC_DET):
   nguồn vốn vay theo bên cho vay, đồng tiền, kỳ hạn; cho vay ký quỹ; danh mục tự doanh (sankey FVTPL/AFS/HTM → nhóm → loại);
   top khoản đầu tư và diễn biến giá từ cuối quý BCTC tới phiên gần nhất.
   Dùng hàm/biến chung của finsec.js (card, tbl, kpi, mk, nf, C, SYM, WI…) — chỉ gọi sau khi finsec.js đã nạp. */
(function () {
  const SD = window.SEC_DET || { co: {}, px: {} };
  let W, SYM, IS_INS, QS, sv, last, card, tbl, mk, nf, pc, sg, cls, esc, qLbl, C, WI, bar, yNum;
  const imp = () => ({ W, SYM, IS_INS, QS, sv, last, card, tbl, mk, nf, pc, sg, cls, esc, qLbl, C, WI, bar, yNum } = window.FSH || {});
  const det = () => { imp(); return SYM && !IS_INS ? SD.co[SYM] : null; };
  const CLS = { holding: 'Nắm giữ dài hạn', fi: 'Thu nhập cố định', cw: 'Phòng ngừa chứng quyền', trading: 'Tự doanh ngắn hạn' };
  const CLSC = { holding: '#861C52', fi: '#1D2678', cw: '#d9a400', trading: '#59C5C8' };
  const ACC = { FVTPL: 'FVTPL', AFS: 'AFS', HTM: 'HTM', LTOther: 'Đầu tư dài hạn khác' };
  const ACCC = { FVTPL: '#59C5C8', AFS: '#2938A8', HTM: '#1f8a8d', LTOther: '#861C52' };
  const dd = s => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '';
  const t1 = v => nf(v, v != null && Math.abs(v) < 10 ? 2 : 0);
  const chg = (a, b) => b ? a / b - 1 : null;
  const pxChg = t => { const p = SD.px[t]; return p ? { r: p.c1 / p.c0 - 1, p } : null; };
  const srcD = d => 'Thuyết minh BCTC ' + qLbl(d.q) + ' của ' + SYM;

  // các dòng danh mục: mỗi nhóm trong FVTPL/AFS/HTM/LTOther; khoản đầu tư dài hạn khác tách theo từng công ty
  function rows(d) {
    const out = [];
    Object.keys(ACC).forEach(a => {
      const A = d.portfolio[a]; if (!A) return;
      A.groups.forEach(g => {
        if (a === 'LTOther' && g.holdings) g.holdings.forEach(h => out.push({ a, n: h.t.replace(/\s*\(.*\)$/, ''), full: h.t, cls: g.cls, cost: h.cost, fv: h.fv ?? h.cost, fv0: h.fv0 ?? h.cost0 ?? 0, tk: h.tk }));
        else out.push({ a, n: g.n, cls: g.cls, cost: g.cost, fv: g.fv, fv0: g.fv0, tk: g.tk, hold: g.holdings }); });
    });
    return out;
  }
  const tot = (r, k) => r.reduce((s, x) => s + (x[k] || 0), 0);

  /* ---------- Tổng quan: top khoản đầu tư ---------- */
  window.sdOvHtml = function () {
    const d = det(); if (!d) return '';
    const R = rows(d).filter(r => r.fv > 0.5).sort((a, b) => b.fv - a.fv), T = tot(R, 'fv');
    const cwT = d.cwList || [], bsk = cwT.map(c => pxChg(c.t)).filter(Boolean), bR = bsk.length ? bsk.reduce((s, x) => s + x.r, 0) / bsk.length : null, p0 = Object.values(SD.px).sort((a, b) => b.d1.localeCompare(a.d1))[0];
    const perf = r => {
      if (r.tk && pxChg(r.tk)) { const x = pxChg(r.tk); return `<span class="${cls(x.r)}">${sg(x.r)}</span>${p0 && x.p.d1 !== p0.d1 ? `<small class="muted"> đến ${dd(x.p.d1)}</small>` : ''}`; }
      if (r.cls === 'cw' && bR != null) return `<span class="${cls(bR)}">${sg(bR)}</span><small class="muted"> rổ ${bsk.length} mã cơ sở</small>`;
      if (r.cls === 'fi') return '<span class="muted">lãi cố định</span>';
      return `<span class="muted">${/chưa niêm yết|Công ty/.test(r.n) ? 'không niêm yết' : 'không công bố mã'}</span>`;
    };
    const top = R.slice(0, 10);
    const fiSh = tot(R.filter(r => r.cls === 'fi'), 'fv') / T;
    const ins = `Cuối ${qLbl(d.q)}, danh mục tự doanh ${nf(T)} tỷ, <b>${pc(fiSh, 0)}</b> là thu nhập cố định (trái phiếu, chứng chỉ tiền gửi, tiền gửi). `
      + (d.insTop || '') + (bR != null ? ` Rổ cổ phiếu cơ sở chứng quyền ${sg(bR)} từ ${dd(p0.d0)} đến ${dd(p0.d1)} (bình quân giản đơn ${bsk.length} mã).` : '');
    return `<article class="card"><h3 class="sub">Top khoản đầu tư ${qLbl(d.q)} và diễn biến tới phiên gần nhất</h3>
      <p class="chart-sub">tỷ đồng · giá trị hợp lý cuối quý · diễn biến giá: đóng cửa ${p0 ? dd(p0.d0) + ' → ' + dd(p0.d1) : 'cuối quý → phiên gần nhất'}</p>
      ${tbl(['Khoản đầu tư', 'Tài khoản', 'Loại', 'Giá trị', '% danh mục', 'Diễn biến'], top.map(r => [esc(r.n), ACC[r.a], CLS[r.cls], t1(r.fv), pc(r.fv / T, 1), perf(r)]))}
      <div class="insight">${ins}</div><div class="src">Nguồn: ${srcD(d)}; giá cổ phiếu: ${WI}</div></article>`;
  };

  /* ---------- Tài chính: nguồn vốn vay, margin, danh mục ---------- */
  // chuỗi theo quý từ thuyết minh (Wi MCP fs_sec_notes) và BCĐKT (fs_sec): danh mục theo tài khoản/loại tài sản, nợ vay theo kỳ hạn
  const SERQ = () => {
    const nx = (W.notes || {}).secx, nd = (W.notes || {}).secd; if (!nx || !nx.v[SYM]) return null;
    const qs = [...new Set([...(nx.v[SYM] || []), ...((nd && nd.v[SYM]) || [])].map(r => r[0]))].filter(q => q >= '2023Q1').sort();
    const g = (blk, k) => q => { if (!blk || !blk.v[SYM]) return null; const r = blk.v[SYM].find(x => x[0] === q), i = blk.k.indexOf(k); return r && i >= 0 ? r[i + 1] : null; };
    const f = k => qs.map(g(nx, k)), fd = k => qs.map(g(nd, k));
    const add = (...a) => a[0].map((_, i) => a.every(x => x[i] == null) ? null : a.reduce((s, x) => s + (x[i] || 0), 0));
    const eq = qs.map(q => { const r = (W.sec[SYM] || []).find(x => x[0] === q); return r ? sv(r, 'bs400') : null; });
    return { qs, L: qs.map(qLbl), f, fd, add, eq };
  };
  const ser = (n, v, c, o = {}) => Object.assign({ type: 'bar', label: n, data: v, backgroundColor: c, borderColor: c, stack: 's', unit: ' tỷ', dp: 0 }, o);
  const lnR = (n, v, c) => ({ type: 'line', label: n, data: v, borderColor: c, backgroundColor: c, borderWidth: 2, pointRadius: 2, yAxisID: 'y1', unit: '%', dp: 0, spanGaps: true, order: 0 });
  const nz = ds => ds.filter(x => x.type === 'line' || x.data.some(v => v && Math.abs(v) > 0.5));
  const stk = (id, Q, ds, y1t) => mk(id, { type: 'bar', data: { labels: Q.L, datasets: nz(ds) },
    options: { scales: Object.assign({ x: { stacked: true }, y: yNum('tỷ đồng', { stacked: true }) }, y1t ? { y1: Object.assign(yNum(y1t), { position: 'right', grid: { display: false }, ticks: { callback: v => nf(v, 0) + '%' } }) } : {}) } }, { ts: true });
  const fold = (sum, body) => `<details class="fold"><summary>${sum}</summary>${body}</details>`;
  const lastV = a => { for (let i = a.length - 1; i >= 0; i--) if (a[i] != null) return [a[i], i]; return [null, -1]; };
  const TYPES = Q => [
    ['Trái phiếu', Q.add(Q.f('fn112_11'), Q.f('fn115_11'), Q.f('fn113_2')), C.navy, 1],
    ['Tiền gửi và chứng chỉ tiền gửi', Q.f('fn113_3'), C.blue, 1],
    ['Cổ phiếu niêm yết', Q.add(Q.f('fn112_8'), Q.f('fn115_8')), C.teal, 0],
    ['Cổ phiếu chưa niêm yết', Q.add(Q.f('fn112_9'), Q.f('fn115_9')), C.purple, 0],
    ['Chứng chỉ quỹ', Q.add(Q.f('fn112_10'), Q.f('fn115_10')), C.gold, 0],
    ['Chứng chỉ tiền gửi và tài sản khác', Q.add(Q.f('fn112_12'), Q.f('fn115_12'), Q.f('fn113_4')), C.grey, 1]];

  window.sdFinHtml = function () {
    const d = det(); if (!d) return '';
    const D = d.debt, M = d.margin, R = rows(d), T = tot(R, 'fv'), T0 = tot(R, 'fv0'), Q = SERQ();
    const usd = (D.byCcy || {}).USD || 0, it = D.items.filter(i => i.v || i.v0);
    const hasC = Object.keys(D.byCcy || {}).length > 0, usd0 = (D.byCcy0 || {}).USD || 0;
    const mat1 = D.byMaturity ? Object.entries(D.byMaturity).find(([k]) => /01 năm|1 năm|12 tháng|ngắn/i.test(k)) : null;
    const cwL = d.cwList || [], qa = M.quality ? Object.entries(M.quality).filter(([, v]) => v > 0) : [];
    let insDQ = '', insAcc = '', insTy = '';
    if (Q) {
      const dt = Q.add(Q.fd('bs311'), Q.fd('bs315'), Q.fd('bs316'), Q.fd('bs341'), Q.fd('bs345'), Q.fd('bs346')), [v, i] = lastV(dt), v4 = i >= 4 ? dt[i - 4] : null;
      insDQ = v != null ? `Nợ vay ${qLbl(Q.qs[i])} ${nf(v)} tỷ${v4 ? `, ${sg(v / v4 - 1)} so cùng kỳ` : ''}, bằng <b>${pc(v / Q.eq[i], 0)}</b> vốn chủ. ${mat1 ? `Vay đến hạn trong 12 tháng ${pc(mat1[1] / D.total, 0)} tổng nợ vay. ` : ''}${D.insT || ''}` : '';
      const pf = Q.add(Q.f('fn112_7'), Q.f('fn115_7'), Q.f('fn113_1')), [p, k] = lastV(pf), p4 = k >= 4 ? pf[k - 4] : null;
      const acc = [['FVTPL', Q.f('fn112_7')], ['AFS', Q.f('fn115_7')], ['HTM', Q.f('fn113_1')]].map(([n, a]) => [n, a[k] || 0]).sort((a, b) => b[1] - a[1]);
      insAcc = p ? `Danh mục FVTPL, AFS, HTM ${qLbl(Q.qs[k])} ${nf(p)} tỷ${p4 ? ` (${sg(p / p4 - 1)} so cùng kỳ)` : ''}, bằng ${pc(p / Q.eq[k], 0)} vốn chủ; lớn nhất là ${acc[0][0]} <b>${pc(acc[0][1] / p, 0)}</b>.` : '';
      const ty = TYPES(Q), fi = q => ty.filter(t => t[3]).reduce((s, t) => s + (t[1][q] || 0), 0), all = q => ty.reduce((s, t) => s + (t[1][q] || 0), 0);
      insTy = p ? `Thu nhập cố định (trái phiếu, tiền gửi, chứng chỉ tiền gửi) chiếm <b>${pc(fi(k) / all(k), 0)}</b> danh mục${k >= 4 && all(k - 4) ? ` (cùng kỳ ${pc(fi(k - 4) / all(k - 4), 0)})` : ''}; cổ phiếu niêm yết ${nf(ty[2][1][k] || 0)} tỷ.` : '';
    }
    const insL = `Nợ vay cuối quý ${nf(D.total)} tỷ, ${sg(chg(D.total, D.open))} từ đầu năm${hasC && usd ? `; vay USD <b>${pc(usd / D.total, 0)}</b> (đầu năm ${pc(usd0 / D.open, 0)})` : ''}. ${D.ins || ''}`;
    const TN = { _8: 'cổ phiếu niêm yết', _9: 'cổ phiếu chưa niêm yết', _10: 'chứng chỉ quỹ', _11: 'trái phiếu', _12: 'chứng chỉ tiền gửi và tài sản khác', _2: 'trái phiếu', _3: 'tiền gửi và chứng chỉ tiền gửi', _4: 'tài sản tài chính khác' };
    const accIns = (p, sfx, nm) => { const tot0 = Q.f(p + '_' + (p === 'fn113' ? 1 : 7)), [v, i] = lastV(tot0); if (!v) return '';
      const parts = sfx.map(x => [TN[x], Q.f(p + x)[i] || 0]).sort((a, b) => b[1] - a[1]), v4 = i >= 4 ? tot0[i - 4] : null;
      return `${nm} ${qLbl(Q.qs[i])} ${nf(v)} tỷ${v4 ? ` (${sg(v / v4 - 1)} so cùng kỳ)` : ''}; ${parts[0][0]} chiếm <b>${pc(parts[0][1] / v, 0)}</b>${parts[1][1] > 0.5 ? `, ${parts[1][0]} ${pc(parts[1][1] / v, 0)}` : ''}.`; };
    const SF = { fn112: ['_8', '_9', '_10', '_11', '_12'], fn115: ['_8', '_9', '_10', '_11', '_12'], fn113: ['_2', '_3', '_4'] };
    const accCard = (id, t, k0) => Q && Q.f(k0).some(v => v > 0.5) ? card({ id, title: t, sub: 'tỷ đồng · cuối quý · cột chồng theo loại tài sản', ins: accIns(k0.split('_')[0], SF[k0.split('_')[0]], t.replace(' theo loại tài sản', '')), src: WI + ' (thuyết minh BCTC)' }) : '';
    return `<h3 class="sec2">Chi tiết · Nợ vay, cho vay ký quỹ, danh mục tự doanh</h3>
    <div class="grid g2 gap">
      ${Q ? card({ id: 'sdDebtQ', title: 'Nợ vay theo kỳ hạn và loại', sub: 'tỷ đồng · cuối quý · đường: nợ vay / vốn chủ (trục phải)', ins: insDQ, src: WI + ' (BCTC)' }) : ''}
      ${card({ id: 'sdDebtL', title: 'Nợ vay theo bên cho vay', sub: `tỷ đồng · ${dd(d.asOf)} so với đầu năm · màu theo đồng tiền`, ins: insL, src: srcD(d) })}
    </div>
    ${fold(`Chi tiết từng khoản vay và trái phiếu phát hành ${qLbl(d.q)}`, tbl(['Khoản vay', 'Đồng tiền', 'Lãi suất', 'Kỳ hạn', dd(d.asOf), 'Đầu năm'], it.map(i => [esc(i.n), i.ccy, esc(i.rate || '—'), esc(i.term || '—'), t1(i.v), t1(i.v0)])) + `<div class="note">${esc(D.cost || '')}</div>${D.note ? `<div class="note">${esc(D.note)}</div>` : ''}<div class="src">Nguồn: ${srcD(d)}</div>`)}
    ${fold(`Cho vay ký quỹ ${qLbl(d.q)}: chất lượng dư nợ và ghi chú`, `<div class="insight">Dư nợ ký quỹ và ứng trước ${nf(M.total)} tỷ, ${sg(chg(M.total, M.open))} từ đầu năm. ${M.ins || ''}</div>` + (qa.length ? tbl(['Chất lượng dư nợ', 'tỷ đồng', '%'], qa.map(([k, v]) => [esc(k), t1(v), pc(v / M.total, 2)])) : '') + (M.note ? `<div class="note">${esc(M.note)}</div>` : '') + `<div class="src">Nguồn: ${srcD(d)}</div>`)}
    <div class="grid g2 gap">
      ${Q ? card({ id: 'sdPfAcc', title: 'Danh mục tự doanh theo tài khoản', sub: 'tỷ đồng · giá trị hợp lý cuối quý (HTM theo giá gốc) · đường: danh mục / vốn chủ (trục phải)', ins: insAcc, src: WI + ' (thuyết minh BCTC)' }) : ''}
      ${Q ? card({ id: 'sdPfTy', title: 'Danh mục tự doanh: thu nhập cố định và cổ phiếu', sub: 'tỷ đồng · cuối quý · gộp FVTPL, AFS, HTM theo loại tài sản', ins: insTy, src: WI + ' (thuyết minh BCTC)' }) : ''}
      ${accCard('sdPfF', 'Danh mục FVTPL theo loại tài sản', 'fn112_7')}
      ${accCard('sdPfA', 'Danh mục AFS theo loại tài sản', 'fn115_7')}
      ${accCard('sdPfH', 'Danh mục HTM theo loại tài sản', 'fn113_1')}
      ${card({ id: 'sdSk', title: `Danh mục tự doanh ${qLbl(d.q)}: tài khoản và nhóm tài sản`, sub: `tỷ đồng · giá trị hợp lý ${dd(d.asOf)}`, ins: `Danh mục ${nf(T)} tỷ (đầu năm ${nf(T0)} tỷ), gồm cả đầu tư dài hạn khác. ${d.portfolio.ins || ''}`, src: srcD(d) })}
    </div>
    ${fold(`Danh mục tự doanh chi tiết ${qLbl(d.q)}`, tbl(['Khoản đầu tư', 'Tài khoản', 'Mục đích', 'Giá gốc', 'Giá trị', 'Đầu năm', 'Thay đổi'], R.filter(r => r.fv || r.fv0).map(r => [esc(r.full || r.n), ACC[r.a], CLS[r.cls], t1(r.cost), t1(r.fv), t1(r.fv0), r.fv0 > 0.5 ? `<span class="${cls(r.fv / r.fv0 - 1)}">${sg(r.fv / r.fv0 - 1)}</span>` : (r.fv ? 'mới' : 'thoái hết')]))
      + Object.keys(ACC).map(a => d.portfolio[a] && d.portfolio[a].note ? `<div class="note">${ACC[a]}: ${esc(d.portfolio[a].note)}</div>` : '').join('') + `<div class="src">Nguồn: ${srcD(d)}</div>`)}
    ${cwL.length ? fold(`Chứng quyền đang lưu hành và cổ phiếu cơ sở ${qLbl(d.q)}`, tbl(['Mã cơ sở', 'CW lưu hành', 'Giá cuối quý', 'Giá gần nhất', 'Thay đổi'], cwL.map(c => { const x = pxChg(c.t); return [`<b>${c.t}</b>`, nf(c.n), x ? nf(x.p.c0) : '—', x ? nf(x.p.c1) : '—', x ? `<span class="${cls(x.r)}">${sg(x.r)}</span>` : '—']; }))
      + `<div class="note">${esc(d.portfolio.cw && d.portfolio.cw.hedge || '')}</div><div class="src">Nguồn: ${srcD(d)}; giá: ${WI}</div>`) : ''}
    ${d.ir ? `<h3 class="sec2">Chỉ tiêu kinh doanh do ${SYM} công bố</h3><div class="grid g2 gap">${d.ir.charts.map(c => card({ id: c.id, title: c.title, sub: c.sub, ins: c.ins, src: esc(d.ir._src) })).join('')}</div>` : ''}`;
  };

  window.sdFinDraw = function () {
    const d = det(); if (!d || !document.getElementById('sdDebtL')) return;
    const D = d.debt, Q = SERQ();
    if (Q) {
      const fd = Q.fd, dt = Q.add(fd('bs311'), fd('bs315'), fd('bs316'), fd('bs341'), fd('bs345'), fd('bs346'));
      stk('sdDebtQ', Q, [ser('Vay ngắn hạn', fd('bs311'), C.navy), ser('Trái phiếu ngắn hạn', Q.add(fd('bs315'), fd('bs316')), C.teal), ser('Vay dài hạn', fd('bs341'), C.purple), ser('Trái phiếu dài hạn', Q.add(fd('bs345'), fd('bs346')), C.gold),
        lnR('Nợ vay / vốn chủ', dt.map((v, i) => v != null && Q.eq[i] ? v / Q.eq[i] * 100 : null), C.red)], '% vốn chủ');
      const pf = Q.add(Q.f('fn112_7'), Q.f('fn115_7'), Q.f('fn113_1'));
      stk('sdPfAcc', Q, [ser('FVTPL', Q.f('fn112_7'), ACCC.FVTPL), ser('AFS', Q.f('fn115_7'), ACCC.AFS), ser('HTM', Q.f('fn113_1'), ACCC.HTM), lnR('Danh mục / vốn chủ', pf.map((v, i) => v != null && Q.eq[i] ? v / Q.eq[i] * 100 : null), C.red)], '% vốn chủ');
      stk('sdPfTy', Q, TYPES(Q).map(t => ser(t[0], t[1], t[2])));
      const ty = (p, cols) => [['Cổ phiếu niêm yết', p + '_8', C.teal], ['Cổ phiếu chưa niêm yết', p + '_9', C.purple], ['Chứng chỉ quỹ', p + '_10', C.gold], ['Trái phiếu', p + '_11', C.navy], ['Chứng chỉ tiền gửi và tài sản khác', p + '_12', C.grey]].map(([n, k, c]) => ser(n, Q.f(k), c));
      stk('sdPfF', Q, ty('fn112')); stk('sdPfA', Q, ty('fn115'));
      stk('sdPfH', Q, [ser('Trái phiếu', Q.f('fn113_2'), C.navy), ser('Tiền gửi và chứng chỉ tiền gửi', Q.f('fn113_3'), C.blue), ser('Tài sản tài chính khác', Q.f('fn113_4'), C.grey)]);
    }
    const g = {}; D.items.forEach(i => { const k = i.lbl || i.n; g[k] = g[k] || { v: 0, v0: 0, ccy: i.ccy }; g[k].v += i.v || 0; g[k].v0 += i.v0 || 0; });
    const L = Object.entries(g).filter(([, x]) => x.v > 1 || x.v0 > 1).sort((a, b) => b[1].v - a[1].v);
    const el = document.getElementById('sdDebtL'); if (el) el.parentElement.style.height = Math.max(260, 60 + L.length * 30) + 'px';
    mk('sdDebtL', { type: 'bar', data: { labels: L.map(x => x[0]), datasets: [
      bar(dd(d.asOf), L.map(x => x[1].v), L.map(x => x[1].ccy === 'USD' ? C.purple : C.navy), { unit: ' tỷ' }),
      bar('Đầu năm', L.map(x => x[1].v0), '#c9cfdc', { unit: ' tỷ' })] },
      options: { indexAxis: 'y', scales: { x: yNum('tỷ đồng'), y: { grid: { display: false } } }, plugins: { legend: { labels: { generateLabels: () => [
        { text: 'USD (' + dd(d.asOf) + ')', fillStyle: C.purple, strokeStyle: C.purple }, { text: 'VND (' + dd(d.asOf) + ')', fillStyle: C.navy, strokeStyle: C.navy }, { text: 'Đầu năm', fillStyle: '#c9cfdc', strokeStyle: '#c9cfdc' }] } } } } });
    if (d.ir) d.ir.charts.forEach(c => {
      const PAL = [C.navy, C.teal, C.gold, C.blue, C.grey], y1 = c.series.some(x => x.axis === 'y1');
      mk(c.id, { type: 'bar', data: { labels: c.labels, datasets: c.series.map((x, i) => {
        const ln = c.type === 'line' || x.line, col = x.axis === 'y1' ? C.purple : PAL[i % PAL.length];
        return { type: ln ? 'line' : 'bar', label: x.n, data: x.v, backgroundColor: col, borderColor: col, borderWidth: ln ? 2 : 0, pointRadius: ln ? 2.5 : 0, spanGaps: true, yAxisID: x.axis || 'y', unit: x.u || c.unit, dp: x.dp ?? 0, order: ln ? 0 : 1 }; }) },
        options: { scales: Object.assign({ y: Object.assign(yNum(c.unit.trim()), c.unit === '%' ? { ticks: { callback: v => nf(v, 0) + '%' } } : {}) },
          y1 ? { y1: Object.assign(yNum(c.y1t), { position: 'right', grid: { display: false } }) } : {}) } });
    });
    // sankey 2 tầng: danh mục → tài khoản → nhóm tài sản
    if (!window.Chart || !Chart.registry.controllers.get('sankey')) return;
    const R = rows(d), T = tot(R, 'fv'), fl = [], col = {}, root = 'Danh mục tự doanh', pri = {};
    col[root] = '#5b6170';
    const AO = Object.keys(ACC).sort((x, y) => tot(R.filter(r => r.a === y), 'fv') - tot(R.filter(r => r.a === x), 'fv'));
    AO.forEach((a, i) => { const v = tot(R.filter(r => r.a === a), 'fv'); if (v > 0.5) { fl.push({ from: root, to: ACC[a], flow: v }); col[ACC[a]] = ACCC[a]; pri[ACC[a]] = i; } });
    const nodes = {};
    R.filter(r => r.fv > 0.5).forEach(r => { const small = r.fv < T * 0.01, node = small ? 'Khác · ' + ACC[r.a] : r.n + (R.filter(x => x.n === r.n).length > 1 ? ' · ' + ACC[r.a] : '');
      nodes[node] = nodes[node] || { node, a: r.a, cls: r.cls, v: 0, small }; nodes[node].v += r.fv; });
    Object.values(nodes).sort((x, y) => AO.indexOf(x.a) - AO.indexOf(y.a) || x.small - y.small || y.v - x.v).forEach((n, i) => {
      fl.push({ from: ACC[n.a], to: n.node, flow: n.v }); pri[n.node] = i; col[n.node] = n.small ? '#9aa3b2' : CLSC[n.cls]; });
    const sk = document.getElementById('sdSk'); if (sk) sk.parentElement.style.height = Math.max(320, Object.keys(nodes).length * 42) + 'px';
    const vin = {}; fl.forEach(f => vin[f.to] = (vin[f.to] || 0) + f.flow); vin[root] = T;
    const short = s => s.length > 40 ? s.slice(0, 38) + '…' : s;
    mk('sdSk', { type: 'sankey', data: { datasets: [{ label: 'Danh mục', data: fl, colorFrom: c => col[c.dataset.data[c.dataIndex].from], colorTo: c => col[c.dataset.data[c.dataIndex].to], colorMode: 'gradient', size: 'max', unit: ' tỷ', dp: 0,
      labels: Object.fromEntries(Object.keys(col).map(k => [k, short(k) + ' · ' + nf(vin[k], vin[k] < 10 ? 1 : 0)])), priority: pri, font: { size: 11 }, nodeWidth: 10, padding: 16 }] },
      options: { interaction: { mode: 'nearest', intersect: true }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => { const x = c.raw; return `${x.from} → ${x.to}: ${nf(x.flow, x.flow < 10 ? 2 : 0)} tỷ`; }, footer: () => '' } } } } });
  };
})();
