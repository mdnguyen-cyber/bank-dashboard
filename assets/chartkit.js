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
    }).join('') + '<span class="rng-hint">kéo trên chart để zoom</span>';
    box.parentElement.insertBefore(bar, box);
    const sx = () => (ch.options.scales.x = ch.options.scales.x || {});
    const mark = k => bar.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === String(k)));
    const setWin = (i0, i1, k) => {
      const x = sx();
      if (i0 <= 0 && i1 >= n - 1) { delete x.min; delete x.max; } else { x.min = i0; x.max = i1; }
      ch.update('none'); mark(k);
    };
    bar.querySelectorAll('button').forEach(b => b.onclick = () => { const k = b.dataset.k === '0' ? 0 : b.dataset.k === 'ytd' ? 'ytd' : +b.dataset.k; const w = windowFor(ds, k); setWin(w[0], w[1], k); });
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
