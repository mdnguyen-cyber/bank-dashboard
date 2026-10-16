/* FinSuccess chartkit — dùng chung cho index.html (CTG) và nganh.html (Ngành)
   1) prep(cfg): chart combo cột + đường → đường luôn vẽ trên cột (dataset.order)
   2) enhance(chart): chart chuỗi thời gian có nút 1M · 3M · 6M · YTD · 1Y · 3Y · 5Y · Tất cả
      và kéo chuột trên vùng vẽ để zoom (như FRED); nhấp đúp hoặc "Tất cả" để về toàn bộ. */
(function () {
  const RANGES = [['1M', 1], ['3M', 3], ['6M', 6], ['YTD', 'ytd'], ['1Y', 12], ['3Y', 36], ['5Y', 60], ['Tất cả', 0]];
  const eom = (y, m) => new Date(y, m, 0);   // m: 1–12 → ngày cuối tháng

  function parse(l) {
    const s = String(l).trim(); let m;
    if ((m = /^(\d{1,2})\/(\d{4})$/.exec(s))) return eom(+m[2], +m[1]);
    if ((m = /^Q([1-4])\/(\d{2}|\d{4})$/.exec(s))) { const y = +m[2] < 100 ? 2000 + +m[2] : +m[2]; return eom(y, +m[1] * 3); }
    if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) return new Date(+m[3], +m[2] - 1, +m[1]);
    if ((m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(s))) return m[3] ? new Date(+m[1], +m[2] - 1, +m[3]) : eom(+m[1], +m[2]);
    if ((m = /^(\d{1,2})\/(\d{1,2})$/.exec(s))) return { d: +m[1], m: +m[2] };   // dd/mm, năm suy ra sau
    return null;
  }
  function dates(labels, today) {
    const p = labels.map(parse);
    if (!p.length || p.some(x => x == null)) return null;
    if (p.every(x => x.d != null && !(x instanceof Date))) {   // chuỗi ngày dd/mm: suy năm đi ngược từ hôm nay
      let y = (today || new Date()).getFullYear(); const out = [];
      for (let i = p.length - 1; i >= 0; i--) {
        if (i < p.length - 1 && p[i].m > p[i + 1].m) y--;
        out[i] = new Date(y, p[i].m - 1, p[i].d);
      }
      return out;
    }
    return p.every(x => x instanceof Date) ? p : null;
  }

  /* ---- 1) đường trên cột ---- */
  function prep(cfg) {
    if (!cfg || cfg.type === 'scatter' || !cfg.data || !cfg.data.datasets) return cfg;
    const types = cfg.data.datasets.map(d => d.type || cfg.type);
    if (types.includes('line') && types.includes('bar')) cfg.data.datasets.forEach((d, i) => { if (d.order == null || d._ao) { d.order = types[i] === 'line' ? 0 : 10; d._ao = true; } });
    return cfg;
  }
  function reorder(ch) {   // gọi sau khi đổi Cột/Đường
    const t = ch.config.type, ds = ch.data.datasets, types = ds.map(d => d.type || t);
    const mixed = types.includes('line') && types.includes('bar');
    ds.forEach((d, i) => { if (d._ao || d.order == null) { d.order = mixed ? (types[i] === 'line' ? 0 : 10) : 0; d._ao = true; } });
  }

  /* ---- 2) khung thời gian + kéo để zoom ---- */
  function windowFor(ds, k) {
    const n = ds.length, end = ds[n - 1];
    if (!k) return [0, n - 1];
    const isEom = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1).getDate() === 1;   // dữ liệu tháng/quý: so theo cuối tháng
    const from = k === 'ytd' ? new Date(end.getFullYear(), 0, 1) : isEom ? new Date(end.getFullYear(), end.getMonth() - k + 1, 0) : new Date(end.getFullYear(), end.getMonth() - k, end.getDate());
    let i0 = ds.findIndex(d => d > from); if (i0 < 0) i0 = n - 1;
    if (k === 'ytd' && i0 > 0 && ds[i0 - 1].getMonth() === 11 && ds[i0 - 1].getFullYear() === end.getFullYear() - 1) i0--;   // giữ điểm cuối năm trước làm mốc
    return [i0, n - 1];
  }
  function enhance(ch, opt = {}) {
    if (!ch) return;
    const canvas = ch.canvas, box = canvas.parentElement;
    if (canvas._fskAC) canvas._fskAC.abort();   // mk() vẽ lại trên cùng canvas: gỡ listener cũ
    const ac = new AbortController(), on = { signal: ac.signal }; canvas._fskAC = ac;
    const old = box.previousElementSibling; if (old && old.classList && old.classList.contains('rng')) old.remove();
    if (ch.config.type === 'scatter' || ch.options.indexAxis === 'y') return;
    const labels = ch.data.labels || [];
    const ds = labels.length >= 6 ? dates(labels, opt.today) : null;
    if (!ds) return;
    const n = ds.length;
    const bar = document.createElement('div'); bar.className = 'rng';
    const wins = RANGES.map(([l, k]) => [l, k, windowFor(ds, k)]);
    bar.innerHTML = wins.map(([l, k, w]) => {
      const pts = w[1] - w[0] + 1, dis = k && (pts < 2 || pts >= n);
      return `<button type="button" data-k="${k}"${dis ? ' disabled' : ''}>${l}</button>`;
    }).join('') + '<span class="ysel"><button type="button" data-y="fit" title="Trục Y co theo dữ liệu đang hiện">Y vừa dữ liệu</button><button type="button" data-y="man" title="Tự đặt giá trị nhỏ nhất, lớn nhất của trục Y">Y tuỳ chỉnh</button><button type="button" data-y="def" title="Trục Y mặc định">Y mặc định</button><span class="yman" hidden><input type="number" step="any" placeholder="min" data-yi="min"><input type="number" step="any" placeholder="max" data-yi="max"></span></span><span class="rng-hint">kéo trên chart để zoom</span>';
    box.parentElement.insertBefore(bar, box);
    // ---- trục Y: mặc định / co theo dữ liệu đang hiện / tự nhập min-max
    const Y = () => { const co = ch.config.options; co.scales = co.scales || {}; return (co.scales.y = co.scales.y || {}); };   // Chart.js tạo lại object scales mỗi lần update → luôn lấy mới
    const y00 = Y(), y0 = { min: y00.min, max: y00.max, beginAtZero: y00.beginAtZero };
    let ymode = 'def';
    const visRange = () => {
      const x = ch.options.scales.x || {}, a = x.min ?? 0, b = x.max ?? n - 1, st = !!Y().stacked, vals = [];
      const dsY = ch.data.datasets.filter((d, i) => (!d.yAxisID || d.yAxisID === 'y') && ch.isDatasetVisible(i));
      for (let i = a; i <= b; i++) {
        if (st) { let p = 0, q = 0; dsY.forEach(d => { const v = d.data[i]; if (v > 0) p += v; else if (v < 0) q += v; }); vals.push(p, q); }
        else dsY.forEach(d => { const v = d.data[i]; if (v != null && !isNaN(v)) vals.push(+v); });
      }
      if (!vals.length) return null;
      let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo || Math.abs(hi) || 1) * 0.06;
      return [lo - pad, hi + pad];
    };
    const applyY = () => {
      const y = Y();
      if (ymode === 'def') { ['min', 'max', 'beginAtZero'].forEach(k => { if (y0[k] === undefined) delete y[k]; else y[k] = y0[k]; }); }
      else if (ymode === 'fit') { const r = visRange(); if (r) { y.beginAtZero = false; y.min = r[0]; y.max = r[1]; } }
      else { const mi = bar.querySelector('[data-yi="min"]').value, ma = bar.querySelector('[data-yi="max"]').value; y.beginAtZero = false; if (mi === '') delete y.min; else y.min = +mi; if (ma === '') delete y.max; else y.max = +ma; }
      bar.querySelectorAll('[data-y]').forEach(b => b.classList.toggle('on', b.dataset.y === ymode));
      bar.querySelector('.yman').hidden = ymode !== 'man';
      ch.update();
    };
    bar.querySelectorAll('[data-y]').forEach(b => b.onclick = () => {
      ymode = b.dataset.y;
      if (ymode === 'man') { const sc = ch.scales.y; const [mi, ma] = bar.querySelectorAll('[data-yi]'); if (mi.value === '' && sc) mi.value = +sc.min.toPrecision(4); if (ma.value === '' && sc) ma.value = +sc.max.toPrecision(4); }
      applyY();
    });
    bar.querySelectorAll('[data-yi]').forEach(i => i.oninput = () => { if (ymode === 'man') applyY(); });
    const sx = () => (ch.options.scales.x = ch.options.scales.x || {});
    const mark = k => bar.querySelectorAll('button[data-k]').forEach(b => b.classList.toggle('on', b.dataset.k === String(k)));
    const setWin = (i0, i1, k) => {
      const x = sx();
      if (i0 <= 0 && i1 >= n - 1) { delete x.min; delete x.max; } else { x.min = i0; x.max = i1; }
      if (ymode === 'fit') { const r = visRange(), y = Y(); if (r) { y.min = r[0]; y.max = r[1]; } }
      ch.update('none'); mark(k);
    };
    bar.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k === '0' ? 0 : b.dataset.k === 'ytd' ? 'ytd' : +b.dataset.k; const w = windowFor(ds, k); setWin(w[0], w[1], k); });
    if (opt.last && opt.last < n) setWin(n - opt.last, n - 1, 'custom'); else mark(0);

    // kéo để zoom (chuột; trên điện thoại dùng nút khung thời gian)
    if (box.style.position !== 'relative') box.style.position = 'relative';
    let sel = null, x0 = null, dragged = false;
    canvas.addEventListener('click', e => { if (dragged) { e.stopImmediatePropagation(); dragged = false; } }, { capture: true, signal: ac.signal });   // kéo xong không tính là nhấp
    const idxAt = px => { const v = ch.scales.x.getValueForPixel(px); return Math.max(0, Math.min(n - 1, Math.round(v))); };
    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, a = ch.chartArea;
      if (x < a.left || x > a.right || e.clientY - r.top < a.top || e.clientY - r.top > a.bottom) return;
      x0 = x; sel = document.createElement('div'); sel.className = 'zsel';
      sel.style.top = a.top + 'px'; sel.style.height = (a.bottom - a.top) + 'px'; sel.style.left = x + 'px'; sel.style.width = '0px';
      box.appendChild(sel); canvas.setPointerCapture(e.pointerId);
    }, on);
    canvas.addEventListener('pointermove', e => {
      if (!sel) return;
      const r = canvas.getBoundingClientRect(), a = ch.chartArea, x = Math.max(a.left, Math.min(a.right, e.clientX - r.left));
      sel.style.left = Math.min(x0, x) + 'px'; sel.style.width = Math.abs(x - x0) + 'px';
    }, on);
    const end = e => {
      if (!sel) return;
      const r = canvas.getBoundingClientRect(), a = ch.chartArea, x = Math.max(a.left, Math.min(a.right, e.clientX - r.left));
      sel.remove(); sel = null;
      if (Math.abs(x - x0) < 8) return;   // nhấp thường, không phải kéo
      dragged = true;
      const i0 = idxAt(Math.min(x0, x)), i1 = idxAt(Math.max(x0, x));
      if (i1 - i0 >= 1) setWin(i0, i1, 'custom');
    };
    canvas.addEventListener('pointerup', end, on);
    canvas.addEventListener('pointercancel', () => { if (sel) { sel.remove(); sel = null; } }, on);
    canvas.addEventListener('dblclick', () => setWin(0, n - 1, 0), on);
  }

  window.FSK = { prep, reorder, enhance, dates };
})();
