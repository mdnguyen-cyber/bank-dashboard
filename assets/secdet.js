/* Chi tiết bảng cân đối CTCK từ thuyết minh BCTC (data/sec-detail.js → window.SEC_DET):
   nguồn vốn vay theo bên cho vay, đồng tiền, kỳ hạn; cho vay ký quỹ; danh mục tự doanh (sankey FVTPL/AFS/HTM → nhóm → loại);
   top khoản đầu tư và diễn biến giá từ cuối quý BCTC tới phiên gần nhất.
   Dùng hàm/biến chung của finsec.js (card, tbl, kpi, mk, nf, C, SYM, WI…) — chỉ gọi sau khi finsec.js đã nạp. */
(function () {
  const SD = window.SEC_DET || { co: {}, px: {} };
  let SYM, IS_INS, QS, sv, last, card, tbl, mk, nf, pc, sg, cls, esc, qLbl, C, WI, bar, yNum;
  const imp = () => ({ SYM, IS_INS, QS, sv, last, card, tbl, mk, nf, pc, sg, cls, esc, qLbl, C, WI, bar, yNum } = window.FSH || {});
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
    const cwT = d.cwList || [], bsk = cwT.map(c => pxChg(c.t)).filter(Boolean), bR = bsk.length ? bsk.reduce((s, x) => s + x.r, 0) / bsk.length : null, p0 = bsk[0] && bsk[0].p;
    const perf = r => {
      if (r.tk && pxChg(r.tk)) return `<span class="${cls(pxChg(r.tk).r)}">${sg(pxChg(r.tk).r)}</span>`;
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
  window.sdFinHtml = function () {
    const d = det(); if (!d) return '';
    const D = d.debt, M = d.margin, rq = last(QS()), eq = sv(rq, 'bs400'), R = rows(d), T = tot(R, 'fv'), T0 = tot(R, 'fv0');
    const usd = D.byCcy.USD || 0, it = D.items.filter(i => i.v || i.v0);
    const insD = `Nợ vay ${nf(D.total)} tỷ, ${sg(chg(D.total, D.open))} từ đầu năm; vay USD <b>${pc(usd / D.total, 0)}</b> (đầu năm ${pc((D.byCcy0.USD || 0) / D.open, 0)}). ${D.ins || ''}`;
    const insT = `Vay đến hạn trong 12 tháng <b>${pc((D.byMaturity['Đến 01 năm'] || 0) / D.total, 0)}</b> tổng nợ vay, khớp với kỳ hạn cho vay ký quỹ ngắn. ${D.insT || ''}`;
    const insM = `Dư nợ ký quỹ và ứng trước ${nf(M.total)} tỷ, ${sg(chg(M.total, M.open))} từ đầu năm, bằng <b>${pc(M.total / eq, 0)}</b> vốn chủ. ${M.ins || ''}`;
    const cwL = d.cwList || [];
    const insP = `Danh mục ${nf(T)} tỷ (đầu năm ${nf(T0)} tỷ). ${d.portfolio.ins || ''}`;
    const qa = M.quality ? Object.entries(M.quality).filter(([, v]) => v > 0) : [];
    return `<h3 class="sec2">Chi tiết · Nguồn vốn vay, cho vay ký quỹ, danh mục tự doanh (thuyết minh ${qLbl(d.q)})</h3>
    <div class="grid g2 gap">
      ${card({ id: 'sdDebtL', title: 'Nợ vay theo bên cho vay', h: 'tall', sub: `tỷ đồng · ${dd(d.asOf)} so với đầu năm · màu theo đồng tiền`, ins: insD, src: srcD(d) })}
      ${card({ id: 'sdDebtM', title: 'Nợ vay theo đồng tiền và kỳ hạn', sub: 'tỷ đồng · cột trái: đồng tiền, cột phải: loại và kỳ hạn', ins: insT, src: srcD(d) })}
    </div>
    <article class="card"><h3 class="sub">Chi tiết từng khoản vay và trái phiếu phát hành</h3><p class="chart-sub">tỷ đồng · lãi suất và kỳ hạn theo thuyết minh</p>
      ${tbl(['Khoản vay', 'Đồng tiền', 'Lãi suất', 'Kỳ hạn', dd(d.asOf), 'Đầu năm'], it.map(i => [esc(i.n), i.ccy, esc(i.rate || '—'), esc(i.term || '—'), t1(i.v), t1(i.v0)]))}
      <div class="insight">${esc(D.cost)}</div><div class="src">Nguồn: ${srcD(d)}</div></article>
    <div class="grid g2 gap">
      ${card({ id: 'sdMg', title: 'Cho vay ký quỹ và ứng trước tiền bán', sub: 'tỷ đồng · đầu năm và cuối quý', ins: insM, src: srcD(d),
        body: qa.length ? tbl(['Chất lượng dư nợ', 'tỷ đồng', '%'], qa.map(([k, v]) => [esc(k), t1(v), pc(v / M.total, 2)])) : '' })}
      ${card({ id: 'sdCls', title: 'Danh mục tự doanh theo mục đích nắm giữ', sub: 'tỷ đồng · giá trị hợp lý · đầu năm và cuối quý', ins: d.portfolio.insCls || '', src: srcD(d) })}
    </div>
    ${card({ id: 'sdSk', title: 'Danh mục tự doanh: tài khoản → nhóm tài sản → mục đích', h: 'tall', sub: `tỷ đồng · giá trị hợp lý ${dd(d.asOf)} · độ dày dải theo giá trị`, ins: insP, src: srcD(d) })}
    <article class="card"><h3 class="sub">Danh mục tự doanh chi tiết</h3><p class="chart-sub">tỷ đồng · giá trị hợp lý (HTM và đầu tư dài hạn khác theo giá gốc)</p>
      ${tbl(['Khoản đầu tư', 'Tài khoản', 'Mục đích', 'Giá gốc', 'Giá trị', 'Đầu năm', 'Thay đổi'], R.filter(r => r.fv || r.fv0).map(r => [esc(r.full || r.n), ACC[r.a], CLS[r.cls], t1(r.cost), t1(r.fv), t1(r.fv0), r.fv0 > 0.5 ? `<span class="${cls(r.fv / r.fv0 - 1)}">${sg(r.fv / r.fv0 - 1)}</span>` : (r.fv ? 'mới' : 'thoái hết')]))}
      ${Object.keys(ACC).map(a => d.portfolio[a] && d.portfolio[a].note ? `<div class="note">${ACC[a]}: ${esc(d.portfolio[a].note)}</div>` : '').join('')}
      <div class="src">Nguồn: ${srcD(d)}</div></article>
    ${cwL.length ? `<article class="card"><h3 class="sub">Chứng quyền đang lưu hành và cổ phiếu cơ sở</h3><p class="chart-sub">số chứng quyền lưu hành cuối quý · giá cổ phiếu cơ sở đóng cửa ${dd((SD.px[cwL[0].t] || {}).d0)} → ${dd((SD.px[cwL[0].t] || {}).d1)}</p>
      ${tbl(['Mã cơ sở', 'CW lưu hành', 'Giá cuối quý', 'Giá gần nhất', 'Thay đổi'], cwL.map(c => { const x = pxChg(c.t); return [`<b>${c.t}</b>`, nf(c.n), x ? nf(x.p.c0) : '—', x ? nf(x.p.c1) : '—', x ? `<span class="${cls(x.r)}">${sg(x.r)}</span>` : '—']; }))}
      <div class="insight">${esc(d.portfolio.cw && d.portfolio.cw.hedge || '')}</div><div class="src">Nguồn: ${srcD(d)}; giá: ${WI}</div></article>` : ''}
    ${d.ir ? `<h3 class="sec2">Chỉ tiêu kinh doanh do ${SYM} công bố</h3><div class="grid g2 gap">${d.ir.charts.map(c => card({ id: c.id, title: c.title, sub: c.sub, ins: c.ins, src: esc(d.ir._src) })).join('')}</div>` : ''}`;
  };

  window.sdFinDraw = function () {
    const d = det(); if (!d || !document.getElementById('sdDebtL')) return;
    const D = d.debt, M = d.margin;
    // bên cho vay (gộp trái phiếu)
    const g = {}; D.items.forEach(i => { const k = i.lbl || i.n; g[k] = g[k] || { v: 0, v0: 0, ccy: i.ccy }; g[k].v += i.v || 0; g[k].v0 += i.v0 || 0; });
    const L = Object.entries(g).filter(([, x]) => x.v > 1 || x.v0 > 1).sort((a, b) => b[1].v - a[1].v);
    mk('sdDebtL', { type: 'bar', data: { labels: L.map(x => x[0]), datasets: [
      bar(dd(d.asOf), L.map(x => x[1].v), L.map(x => x[1].ccy === 'USD' ? C.purple : C.navy), { unit: ' tỷ' }),
      bar('Đầu năm', L.map(x => x[1].v0), '#c9cfdc', { unit: ' tỷ' })] },
      options: { indexAxis: 'y', scales: { x: yNum('tỷ đồng'), y: { grid: { display: false } } }, plugins: { legend: { labels: { generateLabels: () => [
        { text: 'USD (' + dd(d.asOf) + ')', fillStyle: C.purple, strokeStyle: C.purple }, { text: 'VND (' + dd(d.asOf) + ')', fillStyle: C.navy, strokeStyle: C.navy }, { text: 'Đầu năm', fillStyle: '#c9cfdc', strokeStyle: '#c9cfdc' }] } } } } });
    const lab = ['Đầu năm', dd(d.asOf)], TC = ['#1D2678', '#2938A8', '#59C5C8', '#1f8a8d'];
    mk('sdDebtM', { type: 'bar', data: { labels: lab, datasets: [
      ...['VND', 'USD'].map((k, i) => bar(k, [D.byCcy0[k] || 0, D.byCcy[k] || 0], i ? C.purple : C.navy, { stack: 'c', unit: ' tỷ' })),
      ...Object.keys(D.byTerm).map((k, i) => bar(k, [D.byTerm0[k] || 0, D.byTerm[k] || 0], [C.teal, C.gold, '#9aa3b2', '#5b6170'][i], { stack: 't', unit: ' tỷ' }))] },
      options: { scales: { x: { stacked: true }, y: yNum('tỷ đồng', { stacked: true }) } } });
    mk('sdMg', { type: 'bar', data: { labels: lab, datasets: M.items.map((x, i) => bar(x.n, [x.v0, x.v], i ? C.teal : C.navy, { stack: 'm', unit: ' tỷ' })) },
      options: { scales: { x: { stacked: true }, y: yNum('tỷ đồng', { stacked: true }) } } });
    const R = rows(d), byC = (k, f) => tot(R.filter(r => r.cls === k), f);
    mk('sdCls', { type: 'bar', data: { labels: lab, datasets: Object.keys(CLS).map(k => bar(CLS[k], [byC(k, 'fv0'), byC(k, 'fv')], CLSC[k], { stack: 'p', unit: ' tỷ' })).filter(ds => ds.data.some(v => v > 0.01)) },
      options: { scales: { x: { stacked: true }, y: yNum('tỷ đồng', { stacked: true }) } } });
    if (d.ir) d.ir.charts.forEach(c => {
      const PAL = [C.navy, C.teal, C.gold, C.blue, C.grey], y1 = c.series.some(x => x.axis === 'y1');
      mk(c.id, { type: 'bar', data: { labels: c.labels, datasets: c.series.map((x, i) => {
        const ln = c.type === 'line' || x.line, col = x.axis === 'y1' ? C.purple : PAL[i % PAL.length];
        return { type: ln ? 'line' : 'bar', label: x.n, data: x.v, backgroundColor: col, borderColor: col, borderWidth: ln ? 2 : 0, pointRadius: ln ? 2.5 : 0, spanGaps: true, yAxisID: x.axis || 'y', unit: x.u || c.unit, dp: x.dp ?? 0, order: ln ? 0 : 1 }; }) },
        options: { scales: Object.assign({ y: Object.assign(yNum(c.unit.trim()), c.unit === '%' ? { ticks: { callback: v => nf(v, 0) + '%' } } : {}) },
          y1 ? { y1: Object.assign(yNum(c.y1t), { position: 'right', grid: { display: false } }) } : {}) } });
    });
    // sankey
    if (!window.Chart || !Chart.registry.controllers.get('sankey')) return;
    const fl = [], col = {}, root = 'Danh mục tự doanh';
    col[root] = '#5b6170';
    Object.keys(ACC).forEach(a => { const A = d.portfolio[a]; if (!A) return; const v = A.groups.reduce((s, x) => s + (a === 'HTM' || a === 'LTOther' ? x.cost : x.fv), 0); if (v > 0.5) { fl.push({ from: root, to: ACC[a], flow: v }); col[ACC[a]] = ACCC[a]; } });
    const CO = ['fi', 'holding', 'cw', 'trading'], AO = ['AFS', 'HTM', 'LTOther', 'FVTPL'], pri = {}, T = tot(R, 'fv');
    AO.forEach((a, i) => pri[ACC[a]] = i); CO.forEach((k, i) => pri[CLS[k]] = i);
    const nodes = {};
    R.filter(r => r.fv > 0.5).forEach(r => {
      const small = r.fv < T * 0.01, node = small ? 'Khác · ' + ACC[r.a] : r.n + (R.filter(x => x.n === r.n).length > 1 ? ' · ' + ACC[r.a] : '');
      const k = node + '|' + r.cls; nodes[k] = nodes[k] || { node, a: r.a, cls: r.cls, v: 0, small }; nodes[k].v += r.fv; });
    Object.values(nodes).sort((x, y) => AO.indexOf(x.a) - AO.indexOf(y.a) || x.small - y.small || CO.indexOf(x.cls) - CO.indexOf(y.cls) || y.v - x.v).forEach((n, i) => {
      fl.push({ from: ACC[n.a], to: n.node, flow: n.v }); fl.push({ from: n.node, to: CLS[n.cls], flow: n.v });
      if (pri[n.node] == null) pri[n.node] = i; col[n.node] = n.small ? '#9aa3b2' : CLSC[n.cls]; col[CLS[n.cls]] = CLSC[n.cls]; });
    const sk = document.getElementById('sdSk'); if (sk) sk.parentElement.style.height = '540px';
    const vin = {}; fl.forEach(f => vin[f.to] = (vin[f.to] || 0) + f.flow); vin[root] = fl.filter(f => f.from === root).reduce((a, f) => a + f.flow, 0);
    const short = s => s.length > 34 ? s.slice(0, 32) + '…' : s;
    mk('sdSk', { type: 'sankey', data: { datasets: [{ label: 'Danh mục', data: fl, colorFrom: c => col[c.dataset.data[c.dataIndex].from], colorTo: c => col[c.dataset.data[c.dataIndex].to], colorMode: 'gradient', size: 'max', unit: ' tỷ', dp: 0,
      labels: Object.fromEntries(Object.keys(col).map(k => [k, short(k) + ' · ' + nf(vin[k], vin[k] < 10 ? 1 : 0)])), priority: pri, font: { size: 11 }, nodeWidth: 10, padding: 26 }] },
      options: { interaction: { mode: 'nearest', intersect: true }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => { const x = c.raw; return `${x.from} → ${x.to}: ${nf(x.flow, x.flow < 10 ? 2 : 0)} tỷ`; }, footer: () => '' } } } } });
  };
})();
