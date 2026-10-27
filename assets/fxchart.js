/* Hành lang tỷ giá USD/VND theo ngày — một chart dùng chung cho trang ngành và trang từng ngân hàng.
   Dữ liệu: window.FX_DAILY (tỷ giá NHNN, DXY, Vietcombank theo ngày) + chuỗi NHTM/tự do cuối tháng (truyền vào). */
(function () {
  const C = { navy: '#1D2678', teal: '#59C5C8', purple: '#861C52', gold: '#d9a400', red: '#c0392b', grey: '#9aa3b2', vcb: '#1f6f3f', dxy: '#8a8f98' };
  const nf = (v, d = 0) => v == null || isNaN(v) ? '—' : Number(v).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });
  const sg = (v, d = 1) => v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + nf(Math.abs(v), d);
  const dvn = s => s ? s.slice(0, 10).split('-').reverse().join('/') : '—';
  const FROM = '2021-01-01';
  const S = k => ((window.FX_DAILY || {}).s || {})[k] || { d: [], v: [] };
  const last = k => { const x = S(k); for (let i = x.v.length - 1; i >= 0; i--) if (x.v[i] != null) return { d: x.d[i], v: x.v[i] }; return { d: null, v: null }; };
  const nth = (k, n) => { const x = S(k); let c = 0; for (let i = x.v.length - 1; i >= 0; i--) if (x.v[i] != null && c++ === n) return x.v[i]; return null; };
  const yStart = k => { const x = S(k), l = last(k); if (!l.d) return null; const i = x.d.findIndex(d => d >= l.d.slice(0, 4) + '-01-01'); return i >= 0 ? x.v[i] : null; };
  const lastArr = a => (a && a.length ? a[a.length - 1] : { d: null, v: null });

  const TITLE = 'Hành lang tỷ giá USD/VND và chỉ số USD (DXY)';
  const SUB = 'VND · theo ngày từ 2021 · trung tâm, trần/sàn ±5%, giá NHNN bán can thiệp, NHTM và tự do bán ra (theo ngày từ 07/2025, theo tuần trước đó), Vietcombank bán ra · trục phải = DXY';
  const SRC = 'Ngân hàng Nhà nước (tỷ giá trung tâm, trần, sàn, giá bán của Sở Giao dịch NHNN); Vietcombank; DXY tính theo công thức ICE từ tỷ giá tham chiếu ECB; NHTM và tự do: Wi MCP 82223, 82226';

  function insight(m) {   // m = { nhtmSell: [{d,v}], free: [{d,v}] }
    const c = last('vn_sbv_central_d'), ce = last('vn_sbv_ceil_d'), se = last('vn_sbv_sell_d'), x = last('dxy_d'), ns = lastArr(m.nhtmSell), vs = last('usdvnd_vcb_sell');
    if (c.v == null) return '';
    const c0 = yStart('vn_sbv_central_d'), x0 = yStart('dxy_d'), x1m = nth('dxy_d', 21), useV = vs.v != null && (!ns.d || vs.d >= ns.d), mkt = useV ? vs : ns;
    return `${dvn(c.d)}: trung tâm <b>${nf(c.v)}</b> (${sg((c.v / c0 - 1) * 100)}% từ đầu năm), trần ${nf(ce.v)}, NHNN bán can thiệp ${nf(se.v)}. ${useV ? 'Vietcombank' : 'NHTM'} bán ra <b>${nf(mkt.v)}</b> — cách trần <b>${nf(ce.v - mkt.v)}đ</b> (${nf((ce.v - mkt.v) / ce.v * 100, 2)}%). DXY <b>${nf(x.v, 1)}</b> (${dvn(x.d)}): ${sg((x.v / x0 - 1) * 100)}% từ đầu năm, ${sg((x.v / x1m - 1) * 100)}% 1 tháng.`
      + '<br><span class="howto"><b>Hàm ý:</b> Tỷ giá NHTM sát trần nghĩa là NHNN phải bán USD (giá bán can thiệp = trần − 50đ) để giữ biên độ, làm hút VND và đẩy lãi suất liên ngân hàng lên. DXY tăng là áp lực từ bên ngoài; khi DXY giảm mà USD/VND vẫn đi lên thì áp lực chủ yếu nằm trong nước (cầu ngoại tệ, chênh lãi suất VND − USD). NHNN nâng tỷ giá trung tâm là chủ động dời cả hành lang lên.</span>';
  }

  function config(m, axis) {   // axis = { numAxis } của trang
    const cen = S('vn_sbv_central_d'), labs = cen.d.filter(d => d >= FROM);
    if (!labs.length) return null;
    const at = k => { const x = S(k), mp = {}; x.d.forEach((d, i) => mp[d] = x.v[i]); return labs.map(d => mp[d] ?? null); };
    const eom = arr => { const mp = {}; (arr || []).forEach(p => { mp[p.d.slice(0, 7)] = p.v; }); return labs.map((d, i) => (i === labs.length - 1 || labs[i + 1].slice(0, 7) !== d.slice(0, 7)) ? (mp[d.slice(0, 7)] ?? null) : null); };
    const daily = arr => {   // chuỗi ngày/tuần (Wi): mỗi ngày trên trục lấy giá gần nhất trong 8 ngày trước đó
      const a = (arr || []).slice().sort((p, q) => p.d < q.d ? -1 : 1); let j = -1;
      return labs.map(d => { while (j + 1 < a.length && a[j + 1].d <= d) j++; if (j < 0) return null; const gap = (new Date(d) - new Date(a[j].d)) / 864e5; return gap <= 8 ? a[j].v : null; });
    };
    const dx = S('dxy_d'), dm = {}; dx.d.forEach((d, i) => dm[d] = dx.v[i]);
    let lastDx = null; const dxa = labs.map(d => { if (dm[d] != null) lastDx = dm[d]; return dm[d] ?? lastDx; });
    const L = (label, data, color, o = {}) => Object.assign({ type: 'line', label, data, borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 0, dp: 0, unit: '', spanGaps: true }, o);
    return { type: 'line', data: { labels: labs.map(dvn), datasets: [
      L('Trung tâm', at('vn_sbv_central_d'), C.teal),
      L('Trần biên độ (+5%)', at('vn_sbv_ceil_d'), C.red, { borderDash: [5, 4], borderWidth: 1.5 }),
      L('Sàn biên độ (−5%)', at('vn_sbv_floor_d'), C.grey, { borderDash: [5, 4], borderWidth: 1.2, hidden: true }),
      L('NHNN bán can thiệp', at('vn_sbv_sell_d'), C.purple, { borderDash: [2, 3], borderWidth: 1.5 }),
      m.nhtmD && m.nhtmD.length ? L('NHTM bán ra', daily(m.nhtmD), C.navy, { borderWidth: 2 }) : L('NHTM bán ra (cuối tháng)', eom(m.nhtmSell), C.navy, { borderWidth: 2.4, pointRadius: 2 }),
      m.freeD && m.freeD.length ? L('Tự do bán ra', daily(m.freeD), C.gold, { borderWidth: 1.6 }) : L('Tự do bán ra (cuối tháng)', eom(m.free), C.gold, { pointRadius: 2 }),
      L('Vietcombank bán ra', at('usdvnd_vcb_sell'), C.vcb, { pointRadius: 3, spanGaps: false }),
      L('DXY (trục phải)', dxa, C.dxy, { dp: 1, yAxisID: 'y1', borderWidth: 1.4 })] },
      options: { scales: { y: axis.numAxis('VND', { beginAtZero: false }), y1: axis.numAxis('DXY', { position: 'right', beginAtZero: false, grid: { display: false }, ticks: { callback: v => nf(v, 0) } }) } } };
  }

  window.FSFX = { TITLE, SUB, SRC, insight, config };
})();
