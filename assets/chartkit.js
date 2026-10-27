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
  // di chuột lên một cấu phần/đường: làm nổi chuỗi đó trên MỌI kỳ, làm mờ các chuỗi khác (rời chart thì trả lại)
  function alpha(c, a) {
    if (typeof c !== 'string') return c;
    let m = c.match(/^#([0-9a-f]{3})$/i); if (m) c = '#' + m[1].split('').map(h => h + h).join('');
    m = c.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
    if (m) { const base = m[2] ? parseInt(m[2], 16) / 255 : 1; return '#' + m[1] + Math.round(base * a * 255).toString(16).padStart(2, '0'); }
    m = c.match(/^rgba?\(([^)]+)\)$/i);
    if (m) { const p = m[1].split(',').map(x => x.trim()); const base = p[3] != null ? +p[3] : 1; return `rgba(${p[0]},${p[1]},${p[2]},${base * a})`; }
    return c;
  }
  function hiWire(ch, on) {   // rê chuột: làm nổi đúng ô/đường đang chọn, các phần khác chỉ nhạt đi nhẹ
    const cv = ch.canvas; let cur = '';
    const fadeA = (c, a) => Array.isArray(c) ? c.map(x => alpha(x, a)) : alpha(c, a);
    const apply = (k0, j0) => {
      const key = k0 + ':' + j0; if (key === cur) return; cur = key;
      const isBar = ch.config.type === 'bar';
      ch.data.datasets.forEach((d, k) => {
        if (!d._hc0) d._hc0 = { b: d.backgroundColor, l: d.borderColor };
        const keep = k0 < 0 || d.keep && d.type === 'line' && !d.label;
        if (keep) { d.backgroundColor = d._hc0.b; d.borderColor = d._hc0.l; return; }
        const t = d.type || ch.config.type;
        if (isBar && t === 'bar' && j0 >= 0) {   // cột: giữ nguyên ô đang chọn, các ô khác còn 55%
          const n = (d.data || []).length, per = (c, i) => Array.isArray(c) ? c[i] : c;
          d.backgroundColor = Array.from({ length: n }, (_, i) => k === k0 && i === j0 ? per(d._hc0.b, i) : alpha(per(d._hc0.b, i), 0.55));
          d.borderColor = Array.from({ length: n }, (_, i) => k === k0 && i === j0 ? per(d._hc0.l, i) : alpha(per(d._hc0.l, i), 0.55));
        } else if (k === k0) { d.backgroundColor = d._hc0.b; d.borderColor = d._hc0.l; }
        else { d.backgroundColor = fadeA(d._hc0.b, 0.4); d.borderColor = fadeA(d._hc0.l, 0.4); }
      });
      ch.update('none');
    };
    cv.addEventListener('mousemove', e => {
      if ((ch.data.datasets || []).length < 2 && ch.config.type !== 'bar') return;
      const pos = Chart.helpers.getRelativePosition(e, ch), els = ch.getElementsAtEventForMode(e, 'nearest', { intersect: false, axis: 'xy' }, false);
      let hit = -1, idx = -1;
      for (const el of els) {
        const t = ch.getDatasetMeta(el.datasetIndex).type || ch.config.type, P = el.element;
        if (t === 'bar' ? P.inRange(pos.x, pos.y, 'none') : Math.hypot(P.x - pos.x, P.y - pos.y) < 18) { hit = el.datasetIndex; idx = el.index; break; }
      }
      if (hit < 0 && ch.config.type === 'bar') {   // cột chồng: tìm ô chứa con trỏ
        ch.data.datasets.forEach((d, k) => { if (hit >= 0 || !ch.isDatasetVisible(k)) return; ch.getDatasetMeta(k).data.forEach((P, j) => { if (hit < 0 && P && P.inRange && P.inRange(pos.x, pos.y, 'none')) { hit = k; idx = j; } }); });
      }
      if (hit < 0 || (ch.data.datasets.length < 2 && ch.config.type !== 'bar')) return apply(-1, -1);
      apply(hit, idx);
    }, on);
    cv.addEventListener('mouseleave', () => apply(-1, -1), on);
  }
  function enhance(ch, opt = {}) {
    if (!ch) return;
    const canvas = ch.canvas, box = canvas.parentElement;
    if (canvas._fskAC) canvas._fskAC.abort();   // mk() vẽ lại trên cùng canvas: gỡ listener cũ
    const ac = new AbortController(), on = { signal: ac.signal }; canvas._fskAC = ac;
    const old = box.previousElementSibling; if (old && old.classList && old.classList.contains('rng')) old.remove();
    hiWire(ch, on);
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
    }).join('') + '<span class="ysel"><button type="button" data-y="fit" title="Trục Y co theo dữ liệu đang hiện">Y vừa dữ liệu</button><button type="button" data-y="man" title="Tự đặt giá trị nhỏ nhất, lớn nhất của trục Y">Y tuỳ chỉnh</button><button type="button" data-y="def" title="Trục Y mặc định">Y mặc định</button><span class="yman" hidden><input type="number" step="any" placeholder="min" data-yi="min"><input type="number" step="any" placeholder="max" data-yi="max"></span></span><span class="rng-hint">kéo trên chart để zoom · kéo trên trục Y để chỉnh trục</span>';
    box.parentElement.insertBefore(bar, box);
    {   // chuyển Cột ↔ Đường cho chart một loại (toàn cột hoặc toàn đường, không chồng) chưa có nút riêng
      const base = d => d.type || ch.config.type, D0 = ch.data.datasets.filter(d => !d.keep);
      const t0 = D0.length ? base(D0[0]) : null, sx = (ch.options.scales || {}).x || {}, sy = (ch.options.scales || {}).y || {};
      const ok = (t0 === 'line' || t0 === 'bar') && D0.every(d => base(d) === t0 && !(d.data || []).some(v => Array.isArray(v)) && d.stack == null && !d.fill)
        && !sx.stacked && !sy.stacked && !document.querySelector(`[data-ctl="${canvas.id}"] button`) && !canvas.closest('[data-nosw]');
      if (ok) {
        const sw = document.createElement('span'); sw.className = 'tsw';
        sw.innerHTML = '<button type="button" data-tt="bar">Cột</button><button type="button" data-tt="line">Đường</button>';
        bar.querySelector('.ysel').before(sw);
        const mark = t => sw.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tt === t));
        sw.querySelectorAll('button').forEach(b => b.onclick = () => {
          const t = b.dataset.tt;
          ch.data.datasets.forEach(d => { if (d.keep) return; if (d._pr0 === undefined) d._pr0 = d.pointRadius; d.type = t; d.fill = false; d.pointRadius = t === 'line' ? (d._pr0 ?? 2) : 0; });
          (ch.options.scales.x = ch.options.scales.x || {}).offset = t === 'bar';
          ch.update(); mark(t);
        });
        mark(t0);
      }
    }
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
    // ---- chart chồng (stacked): chuyển qua lại giá trị ↔ tỷ trọng 100%
    const stk = () => ch.data.datasets.filter(d => (!d.yAxisID || d.yAxisID === 'y') && (d.stack != null || (d.fill && d.fill !== false)));
    const allPos = () => stk().every(d => d.data.every(v => v == null || isNaN(v) || +v >= 0));   // chỉ chart cấu phần luôn dương mới có tỷ trọng 100%
    if (Y().stacked && Y().max !== 100 && stk().length > 1 && allPos()) {
      const pb = document.createElement('button'); pb.type = 'button'; pb.dataset.pct = '1'; pb.textContent = '100% tỷ trọng'; pb.title = 'Chuyển sang tỷ trọng từng cấu phần trên tổng (%)';
      bar.querySelector('.ysel').prepend(pb);
      let saved = null;
      pb.onclick = () => {
        const S = stk(), y = Y();
        if (!saved) {
          saved = { data: S.map(d => d.data.slice()), unit: S.map(d => d.unit), dp: S.map(d => d.dp), hid: [], y: { min: y.min, max: y.max, beginAtZero: y.beginAtZero, cb: y.ticks && y.ticks.callback } };
          const len = Math.max(...S.map(d => d.data.length)), tot = Array.from({ length: len }, (_, i) => S.reduce((a, d) => a + Math.max(0, +d.data[i] || 0), 0));
          S.forEach(d => { d.data = d.data.map((v, i) => v == null || !tot[i] ? null : +(Math.max(0, v) / tot[i] * 100).toFixed(2)); d.unit = '%'; d.dp = 1; });
          ch.data.datasets.forEach((d, i) => { if (!S.includes(d) && ch.isDatasetVisible(i)) { saved.hid.push(i); ch.setDatasetVisibility(i, false); } });
          y.min = 0; y.max = 100; y.beginAtZero = true; y.ticks = Object.assign({}, y.ticks, { callback: v => v + '%' });
          pb.classList.add('on'); pb.textContent = 'Giá trị gốc';
        } else {
          S.forEach((d, j) => { d.data = saved.data[j]; d.unit = saved.unit[j]; d.dp = saved.dp[j]; });
          saved.hid.forEach(i => ch.setDatasetVisibility(i, true));
          ['min', 'max', 'beginAtZero'].forEach(k => { if (saved.y[k] === undefined) delete y[k]; else y[k] = saved.y[k]; });
          y.ticks = Object.assign({}, y.ticks); if (saved.y.cb) y.ticks.callback = saved.y.cb; else delete y.ticks.callback;
          saved = null; pb.classList.remove('on'); pb.textContent = '100% tỷ trọng';
        }
        ch.update();
      };
    }
    bar.querySelectorAll('[data-y]').forEach(b => b.onclick = () => {
      ymode = b.dataset.y;
      if (ymode === 'man') { const sc = ch.scales.y; const [mi, ma] = bar.querySelectorAll('[data-yi]'); if (mi.value === '' && sc) mi.value = +sc.min.toPrecision(4); if (ma.value === '' && sc) ma.value = +sc.max.toPrecision(4); }
      applyY();
    });
    bar.querySelectorAll('[data-yi]').forEach(i => i.oninput = () => { if (ymode === 'man') applyY(); });
    // kéo trực tiếp trên trục Y: nửa dưới trục kéo giá trị nhỏ nhất (kéo lên = nâng đáy), nửa trên kéo giá trị lớn nhất (kéo xuống = hạ trần); nhấp đúp trên trục = mặc định
    let yd = null;
    const onAxis = e => { const r = canvas.getBoundingClientRect(), a = ch.chartArea, x = e.clientX - r.left, yy = e.clientY - r.top; return x < a.left && x > 0 && yy >= a.top && yy <= a.bottom ? yy : null; };
    canvas.addEventListener('pointermove', e => { if (!yd && !sel) canvas.style.cursor = onAxis(e) != null ? 'ns-resize' : ''; }, on);
    canvas.addEventListener('pointerdown', e => {
      const yy = onAxis(e); if (yy == null || e.button > 0) return;
      e.stopImmediatePropagation(); e.preventDefault();
      const sc = ch.scales.y, a = ch.chartArea;
      yd = { h: yy > (a.top + a.bottom) / 2 ? 'min' : 'max', y0: yy, min: sc.min, max: sc.max, top: a.top, bot: a.bottom };
      canvas.setPointerCapture(e.pointerId);
    }, { capture: true, signal: ac.signal });
    canvas.addEventListener('pointermove', e => {
      if (!yd) return;
      const r = canvas.getBoundingClientRect(), span = yd.max - yd.min;
      const dv = (yd.y0 - (e.clientY - r.top)) / (yd.bot - yd.top) * span;   // kéo lên = tăng, kéo xuống = giảm
      const y = Y(); y.beginAtZero = false;
      if (yd.h === 'min') { y.min = Math.min(yd.min + dv, yd.max - span * 0.05); y.max = yd.max; } else { y.min = yd.min; y.max = Math.max(yd.max + dv, yd.min + span * 0.05); }
      ymode = 'man';
      const [mi, ma] = bar.querySelectorAll('[data-yi]'); mi.value = +(+y.min).toPrecision(4); ma.value = +(+y.max).toPrecision(4);
      bar.querySelectorAll('[data-y]').forEach(b => b.classList.toggle('on', b.dataset.y === 'man')); bar.querySelector('.yman').hidden = false;
      ch.update('none');
    }, on);
    const yEnd = () => {   // thả tay: làm tròn min/max về bước đẹp
      if (!yd) return; yd = null;
      const y = Y(); if (y.min == null || y.max == null) return;
      const st = Math.pow(10, Math.floor(Math.log10((y.max - y.min) / 20 || 1)));
      y.min = Math.floor(y.min / st) * st; y.max = Math.ceil(y.max / st) * st;
      const [mi, ma] = bar.querySelectorAll('[data-yi]'); mi.value = +y.min.toPrecision(6); ma.value = +y.max.toPrecision(6);
      ch.update('none');
    };
    canvas.addEventListener('pointerup', yEnd, on); canvas.addEventListener('pointercancel', yEnd, on);
    canvas.addEventListener('dblclick', e => { if (onAxis(e) != null) { e.stopImmediatePropagation(); ymode = 'def'; applyY(); } }, { capture: true, signal: ac.signal });
    const sx = () => (ch.options.scales.x = ch.options.scales.x || {});
    const mark = k => bar.querySelectorAll('button[data-k]').forEach(b => b.classList.toggle('on', b.dataset.k === String(k)));
    const setWin = (i0, i1, k) => {
      const x = sx();
      if (i0 <= 0 && i1 >= n - 1) { delete x.min; delete x.max; } else { x.min = i0; x.max = i1; }
      if (ymode === 'fit') { const r = visRange(), y = Y(); if (r) { y.min = r[0]; y.max = r[1]; } }
      ch.update('none'); mark(k);
    };
    bar.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k === '0' ? 0 : b.dataset.k === 'ytd' ? 'ytd' : +b.dataset.k; const w = windowFor(ds, k); setWin(w[0], w[1], k); });
    if (opt.last && opt.last < n) setWin(n - opt.last, n - 1, 'custom');
    else if (opt.win) { const w = windowFor(ds, opt.win); if (w[0] > 0) setWin(w[0], w[1], opt.win); else mark(0); }
    else mark(0);

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


  /* ---- 3) kéo đổi thứ tự nút tab: nhấn giữ ~0,35 giây rồi kéo; thứ tự lưu trên trình duyệt ---- */
  function sortable(box, key, attr) {
    if (!box || box._fskSort) return; box._fskSort = true;
    const K = 'fsk-order:' + key, idOf = b => b.dataset[attr];
    try { const ord = JSON.parse(localStorage.getItem(K) || 'null'); if (ord) ord.forEach(id => { const b = [...box.children].find(x => idOf(x) === id); if (b) box.appendChild(b); }); [...box.children].filter(x => x.tagName !== 'BUTTON').forEach(x => box.appendChild(x)); } catch (e) {}
    let timer = null, drag = null, sx = 0, sy = 0, moved = false;
    const save = () => { try { localStorage.setItem(K, JSON.stringify([...box.querySelectorAll(':scope > button')].map(idOf))); } catch (e) {} };
    const start = (b, e) => { clearTimeout(timer); timer = null; drag = b; b.classList.add('fsk-drag'); box.classList.add('fsk-sorting'); try { b.setPointerCapture(e.pointerId); } catch (er) {} if (navigator.vibrate) navigator.vibrate(15); };
    let cand = null, mouse = false;
    box.addEventListener('pointerdown', e => {
      const b = e.target.closest('button'); if (!b || b.parentElement !== box || e.button > 0) return;
      sx = e.clientX; sy = e.clientY; moved = false; cand = b; mouse = e.pointerType === 'mouse';
      if (mouse) e.preventDefault();   // chặn bôi đen chữ khi kéo bằng chuột
      else timer = setTimeout(() => start(b, e), 350);   // cảm ứng: nhấn giữ rồi kéo, để vuốt ngang vẫn cuộn được
    });
    box.addEventListener('pointermove', e => {
      if (!drag) {
        const d = Math.hypot(e.clientX - sx, e.clientY - sy);
        if (mouse && cand && (e.buttons & 1) && d > 5) start(cand, e);          // chuột: bấm và kéo luôn
        else { if (timer && d > 8) { clearTimeout(timer); timer = null; } return; }
      }
      e.preventDefault(); moved = true;
      const t = document.elementFromPoint(e.clientX, e.clientY), over = t && t.closest && t.closest('button');
      if (!over || over === drag || over.parentElement !== box) return;
      const r = over.getBoundingClientRect(), after = (e.clientX - r.left) > r.width / 2 || (e.clientY - r.top) > r.height * 0.9;
      box.insertBefore(drag, after ? over.nextSibling : over);
    });
    const end = () => { clearTimeout(timer); timer = null; cand = null; if (!drag) return; drag.classList.remove('fsk-drag'); box.classList.remove('fsk-sorting'); const d = drag; drag = null; if (moved) { save(); d._fskNoClick = true; setTimeout(() => { d._fskNoClick = false; }, 50); } };
    box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
    box.addEventListener('click', e => { const b = e.target.closest('button'); if (b && b._fskNoClick) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    box.addEventListener('contextmenu', e => { if (drag || timer) e.preventDefault(); });
    box.title = box.title || 'Kéo một nút để đổi thứ tự (điện thoại: nhấn giữ rồi kéo)';
  }


  /* ---- 4) kéo thả đổi vị trí chart: nắm vào TIÊU ĐỀ card (biểu tượng ⠿) rồi kéo; vùng vẽ chart vẫn dành cho kéo chọn khung thời gian ---- */
  const cardId = c => { const cv = c.querySelector('canvas[id]'); return c.dataset.card || (cv ? cv.id : ((c.querySelector('h3') || {}).textContent || '').replace('⠿', '').trim().slice(0, 40)); };
  function gridKey(g) {
    const host = g.closest('[data-subp],[data-pp],[data-cc],[data-p],.pane'); const tag = host ? (host.dataset.subp || host.dataset.pp || host.dataset.cc || host.dataset.p || host.id) : 'root';
    const sibs = host ? [...host.querySelectorAll('.grid')].filter(x => x.closest('[data-subp],[data-pp],[data-cc],[data-p],.pane') === host) : [g];
    return 'fsk-cards:' + location.pathname.split('/').pop() + ':' + tag + ':' + sibs.indexOf(g);
  }
  function cardSort(g) {
    if (g._fskCards) return;
    const cards = () => [...g.children].filter(x => x.matches('article.card'));
    if (cards().length < 2) return;
    g._fskCards = true;
    const K = gridKey(g);
    try { const ord = JSON.parse(localStorage.getItem(K) || 'null'); if (ord) { const cs = cards(); ord.forEach(id => { const c = cs.find(x => cardId(x) === id); if (c) g.appendChild(c); }); [...g.children].filter(x => !x.matches('article.card')).forEach(x => g.appendChild(x)); } } catch (e) {}
    cards().forEach(c => { const h = c.querySelector(':scope > h3.sub'); if (h && !h.querySelector('.grip')) { h.insertAdjacentHTML('afterbegin', '<span class="grip" title="Kéo để đổi vị trí chart (điện thoại: nhấn giữ rồi kéo)">⠿</span>'); h.classList.add('drag-h'); } });
    let drag = null, cand = null, sx = 0, sy = 0, timer = null, mouse = false, moved = false;
    const save = () => { try { localStorage.setItem(K, JSON.stringify(cards().map(cardId))); } catch (e) {} };
    const start = () => { if (!cand) return; drag = cand; drag.classList.add('card-drag'); g.classList.add('cards-sorting'); document.body.classList.add('fsk-nosel'); if (navigator.vibrate) navigator.vibrate(15); };
    g.addEventListener('pointerdown', e => {
      const h = e.target.closest('h3.drag-h'); if (!h || e.button > 0 || h.parentElement.parentElement !== g) return;
      if (e.target.closest('button,a,input,select,.ctl,.info,.i')) return;   // nút trong tiêu đề (Cột/Đường, i) vẫn bấm bình thường
      cand = h.parentElement; sx = e.clientX; sy = e.clientY; moved = false; mouse = e.pointerType === 'mouse';
      try { h.setPointerCapture(e.pointerId); } catch (er) {}
      if (mouse) e.preventDefault(); else timer = setTimeout(start, 350);
    });
    document.addEventListener('pointermove', e => {
      if (!cand) return;
      if (!drag) { const d = Math.hypot(e.clientX - sx, e.clientY - sy); if (mouse && (e.buttons & 1) && d > 6) start(); else { if (timer && d > 8) { clearTimeout(timer); timer = null; cand = null; } return; } }
      e.preventDefault(); moved = true;
      drag.style.pointerEvents = 'none'; const t = document.elementFromPoint(e.clientX, e.clientY); drag.style.pointerEvents = '';
      const over = t && t.closest && t.closest('article.card');
      if (!over || over === drag || over.parentElement !== g) return;
      const cs = cards(), after = cs.indexOf(drag) < cs.indexOf(over);   // kéo xuống: đặt sau thẻ đích; kéo lên: đặt trước
      g.insertBefore(drag, after ? over.nextSibling : over);
    });
    const end = () => { clearTimeout(timer); timer = null; const d = drag; cand = null; drag = null; document.body.classList.remove('fsk-nosel'); g.classList.remove('cards-sorting'); if (!d) return; d.classList.remove('card-drag'); if (moved) save(); };
    document.addEventListener('pointerup', end, true); document.addEventListener('pointercancel', end, true);
    g.addEventListener('contextmenu', e => { if (drag || timer) e.preventDefault(); });
  }
  function cardSortAll(root) { (root || document).querySelectorAll('.grid').forEach(cardSort); }
  let _cst = null;
  new MutationObserver(() => { clearTimeout(_cst); _cst = setTimeout(() => cardSortAll(), 120); }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => cardSortAll());

  /* ---- 5) thu phí theo mảng: đổi giữa lãi thuần (cột chồng), tăng trưởng thu/lãi thuần YoY và biên lợi nhuận (đường) ---- */
  const FEE_MODES = [['net', 'Lãi thuần'], ['iyoy', 'Tăng trưởng thu YoY'], ['nyoy', 'Tăng trưởng lãi thuần YoY'], ['margin', 'Biên lợi nhuận']];
  function feePicker(id) { return `<div class="picker tf" data-feem="${id}">${FEE_MODES.map(([k, l], i) => `<button type="button" data-k="${k}" class="${i ? '' : 'on'}">${l}</button>`).join('')}</div>`; }
  function feeCfg(S, years, lines, mode, opt = {}) {   // S[year][line] = {inc, exp, net}; opt.scale chia đơn vị (vd 1000 → nghìn tỷ)
    const sc = opt.scale || 1, col = opt.colors || {}, ys = years.map(String);
    if (mode === 'net') return { type: 'bar', data: { labels: ys, datasets: lines.filter(l => ys.some(y => S[y][l.k] && S[y][l.k].net)).map(l => ({ label: l.name, data: ys.map(y => S[y][l.k].net / sc), backgroundColor: col[l.k], stack: 's', dp: sc > 1 ? 1 : 0, unit: opt.unit || '' })) },
      options: { scales: { x: { stacked: true }, y: { stacked: true } } } };
    const val = (y, k, i) => { const a = S[y] && S[y][k]; if (!a) return null;
      if (mode === 'margin') return a.inc > 0 && !(opt.noMargin || []).includes(k) ? a.net / a.inc * 100 : null;
      const py = ys[i - 1], b = py && S[py] && S[py][k]; if (!b) return null;
      const f = mode === 'iyoy' ? 'inc' : 'net'; return a[f] !== 0 && b[f] > 0 && Math.abs(b[f]) >= (opt.minBase || 30) ? (a[f] / b[f] - 1) * 100 : null; };
    const L = lines.concat([{ k: '_tot', name: 'Tổng' }]).filter(l => ys.some((y, i) => val(y, l.k, i) != null));
    return { type: 'line', data: { labels: ys, datasets: L.map(l => ({ label: l.name, data: ys.map((y, i) => { const v = val(y, l.k, i); return v == null ? null : Math.round(v * 10) / 10; }),
        borderColor: l.k === '_tot' ? '#1b1f2a' : col[l.k], backgroundColor: l.k === '_tot' ? '#1b1f2a' : col[l.k], borderWidth: l.k === '_tot' ? 3 : 1.8, dp: 1, unit: '%', spanGaps: true })) },
      options: { scales: { y: { ticks: { callback: v => v + '%' } } }, plugins: { refLines: mode === 'margin' ? undefined : { lines: [{ value: 0, label: '' }] } } } };
  }
  function wireFee(id, draw) { const box = document.querySelector(`[data-feem="${id}"]`); const bs = box ? [...box.querySelectorAll('button')] : []; bs.forEach(b => b.onclick = () => { bs.forEach(x => x.classList.toggle('on', x === b)); draw(b.dataset.k); }); draw('net'); }

  window.FSK = { prep, reorder, enhance, dates, windowFor, sortable, cardSortAll, feePicker, feeCfg, wireFee };
})();

/* Nút lên đầu trang: hiện khi cuộn quá 1 màn hình */
(function () {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'totop'; b.title = 'Lên đầu trang'; b.setAttribute('aria-label', 'Lên đầu trang'); b.textContent = '↑';
  b.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const upd = () => b.classList.toggle('on', window.scrollY > window.innerHeight * 0.8);
  const add = () => { document.body.appendChild(b); upd(); };
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
  window.addEventListener('scroll', upd, { passive: true });
})();

/* Nút mở Trợ lý AI (artifact riêng tư trên claude.ai — chỉ tài khoản FinSuccess được chia sẻ mới mở được) */
(function () {
  const a = document.createElement('a');
  a.className = 'aibot'; a.href = 'https://claude.ai/artifact/NPnjNWbkz5DUjxRdnQ9Qmi'; a.target = '_blank'; a.rel = 'noopener';
  a.title = 'Hỏi số liệu, thử giả định, yêu cầu cập nhật (cần đăng nhập Claude)';
  if (!window.FS_ARTIFACT && !(window.FS_CHAT && window.FS_CHAT.url)) {   // bản web chưa bật khung chat: báo ngay trong trang
    a.href = '#'; a.removeAttribute('target'); a.title = 'Trợ lý AI';
    a.addEventListener('click', e => {
      e.preventDefault();
      let t = document.querySelector('.aibot-soon');
      if (!t) { t = document.createElement('div'); t.className = 'aibot-soon'; t.setAttribute('role', 'status');
        t.innerHTML = '<b>✦ Trợ lý AI</b><span>Tính năng đang phát triển — sẽ sớm có mặt ngay trên trang này.</span>'; document.body.appendChild(t); }
      t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3500);
    });
  }
  if (window.FS_ARTIFACT || (window.FS_CHAT && window.FS_CHAT.url)) { a.href = '#'; a.removeAttribute('target'); a.title = 'Mở khung chat Trợ lý AI'; }
  a.innerHTML = '<span aria-hidden="true">✦</span> Trợ lý AI';
  const add = () => document.body.appendChild(a);
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();

/* Khoá PDF dựng sẵn: trang + tab chính + các tab con đang chọn (theo thứ tự trên trang).
   scripts/build_pdfs.js dùng cùng hàm này để đặt tên file pdf/<khoá>.pdf khi deploy. */
window.FSPDF = (function () {
  const vis = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const pane = () => document.querySelector('.pane.active');
  const groups = () => { const P = pane(); return P ? [...P.querySelectorAll('.subtabs')].filter(g => vis(g) && g.querySelector('button')) : []; };
  const bval = btn => { const k = Object.keys(btn.dataset)[0]; return k ? btn.dataset[k] : (btn.textContent || '').trim(); };
  const page = () => (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  const tabBtn = () => document.querySelector('.tabs [data-tab].active, .tabs [data-tab].on');
  function key() {
    const t = tabBtn(); if (!t) return null;
    return [page(), t.dataset.tab, ...groups().map(g => { const on = g.querySelector('button.on') || g.querySelector('button'); return bval(on); })]
      .join('__').replace(/[^A-Za-z0-9_-]+/g, '-');
  }
  function label() {
    const t = tabBtn(), parts = [t ? t.textContent.replace(/^\d+\.\s*/, '').trim() : ''];
    groups().forEach(g => { const on = g.querySelector('button.on'); if (on) parts.push(on.textContent.trim()); });
    return parts.filter(Boolean).join(' - ');
  }
  const VIEW = {
    chFx: { show: [/^Tự do bán ra/, /^DXY/], range: 'ytd', y: 'fit' },   // tỷ giá: chỉ tự do bán ra và DXY, từ đầu năm
  };
  // Chuẩn bị bản in (dùng khi dựng PDF): mở mục thu gọn, đổi biểu đồ canvas thành ảnh để bản in nét, bật lớp in
  async function prep() {
    document.body.classList.add('print-all');
    const R = pane() || document.body;
    R.querySelectorAll('.coll.shut').forEach(h => h.click());
    await new Promise(r => setTimeout(r, 600));
    // Cách hiển thị riêng của từng biểu đồ trong bản PDF: chỉ giữ một số đường, khung thời gian, trục Y co theo dữ liệu
    Object.entries(VIEW).forEach(([id, v]) => {
      const c = R.querySelector('#' + id), ch = c && window.Chart && Chart.getChart(c); if (!ch) return;
      if (v.show) ch.data.datasets.forEach((d, i) => ch.setDatasetVisibility(i, v.show.some(re => re.test(d.label || ''))));
      ch.update('none');
      const bar = c.parentElement.previousElementSibling;
      if (bar && bar.classList.contains('rng')) {
        const rb = v.range && bar.querySelector(`[data-k="${v.range}"]`); if (rb) rb.click();
        const yb = v.y && bar.querySelector(`[data-y="${v.y}"]`); if (yb) yb.click();
      }
    });
    await new Promise(r => setTimeout(r, 300));
    R.querySelectorAll('canvas').forEach(c => {
      if (!c.offsetParent || !c.width) return;
      const ch = window.Chart && Chart.getChart(c); if (ch) { ch.resize(); ch.update('none'); }
      try { const img = new Image(); img.src = c.toDataURL('image/png'); img.className = 'pdf-img'; c.after(img); c.classList.add('pdf-hide'); } catch (e) {}
    });
  }
  return { key, label, prep, groups, bval, vis, page };
})();

/* Nút "Xuất PDF": tải thẳng file PDF của tab đang xem (không qua hộp thoại in).
   Mở mọi mục đang thu gọn, chụp nội dung bằng html2canvas theo từng trang (ngắt trang giữa các khối, không cắt ngang biểu đồ), ghép bằng jsPDF rồi trả trang về như cũ. */
(function () {
  const LIBS = ['https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'];
  const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  const ready = () => (window.html2canvas && window.jspdf) ? Promise.resolve() : Promise.all(LIBS.map(load));
  const b = document.createElement('button'), b2 = document.createElement('button');
  b.type = 'button'; b.className = 'pdfbtn'; b.textContent = 'Xuất PDF'; b.title = 'Tải PDF (chữ thật, dựng sẵn sau mỗi lần cập nhật) của tab đang xem';
  b2.type = 'button'; b2.className = 'pdfbtn pdfbtn2'; b2.textContent = 'PDF bản đang xem'; b2.title = 'Chụp đúng trạng thái đang xem trên máy này (gồm bản nháp, bộ lọc) thành PDF dạng ảnh';
  const vis = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  // Các khoảng [top,bottom] không được cắt ngang (thẻ biểu đồ, ô KPI, đoạn chữ…), gộp các khối nằm cạnh nhau
  function units(el, maxH, out) {
    for (const c of el.children) {
      if (!vis(c)) continue;
      const r = c.getBoundingClientRect(); if (r.height < 1) continue;
      if (r.height <= maxH || !c.children.length || c.tagName === 'CANVAS' || c.tagName === 'TABLE') out.push([r.top + scrollY, r.bottom + scrollY]);
      else units(c, maxH, out);
    }
    return out;
  }
  function cuts(top, bottom, maxH, firstH) {
    const iv = units(root(), maxH, []).sort((a, b) => a[0] - b[0]), m = [];
    iv.forEach(x => { const l = m[m.length - 1]; if (l && x[0] < l[1] - 1) l[1] = Math.max(l[1], x[1]); else m.push(x.slice()); });
    const pages = []; let st = top, cap = firstH;
    const push = e => { pages.push([st, e]); st = e; cap = maxH; };
    for (const [a, z] of m) {
      while (z - st > cap) {
        if (a > st + 20 && a - st <= cap) push(a);
        else push(st + cap);
      }
    }
    if (bottom - st > 1) { while (bottom - st > cap) push(st + cap); push(bottom); }
    return pages;
  }
  const root = () => document.querySelector('.pane.active') || document.querySelector('main') || document.body;
  let busy = false, MAN = null;
  const dmy = d => `${d.slice(8, 10)}-${d.slice(5, 7)}-${d.slice(0, 4)}`;
  const fname = date => { const t = document.title; return `FinSuccess_${(t.split('·')[0] || t).trim()} - ${FSPDF.label()}_${date}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[\\/:*?"<>|]+/g, '-') + '.pdf'; };   // bỏ dấu cho tên file (theo quy ước FinSuccess_...)
  b.onclick = async () => {
    if (busy) return;
    try {
      if (!MAN) MAN = await fetch('pdf/index.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : { files: {} });
      const k = FSPDF.key();
      if (k && MAN.files && MAN.files[k]) {
        const a = document.createElement('a'); a.href = 'pdf/' + k + '.pdf?v=' + (MAN.built || ''); a.download = fname(dmy(MAN.built || ''));
        document.body.appendChild(a); a.click(); a.remove(); return;
      }
    } catch (e) {}
    shot(b);   // chưa có bản dựng sẵn cho tab này → chụp bản đang xem
  };
  b2.onclick = () => shot(b2);
  async function shot(btn) {
    if (busy) return; busy = true;
    const label = btn.textContent, undo = [];
    btn.textContent = 'Đang tạo PDF…'; btn.disabled = true;
    try {
      await ready();
      document.body.classList.add('pdf-cap'); undo.push(() => document.body.classList.remove('pdf-cap'));
      const R = root();
      R.querySelectorAll('.coll.shut').forEach(h => { h.click(); undo.push(() => { if (!h.classList.contains('shut')) h.click(); }); });
      const sx = scrollX, sy = scrollY; undo.push(() => scrollTo(sx, sy));
      scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 300));
      R.querySelectorAll('canvas').forEach(c => { const ch = window.Chart && Chart.getChart(c); if (ch) { ch.resize(); ch.update('none'); } });
      await new Promise(r => setTimeout(r, 500));
      const { jsPDF } = window.jspdf, pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const M = 5, PW = 210 - 2 * M, PH = 297 - 2 * M - 4;
      const rr = R.getBoundingClientRect(), W = rr.width, k = PW / W, maxH = PH / k;
      const head = [...document.querySelectorAll('.logo-bar,.stock-head')].filter(vis);
      const opt = { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, windowWidth: document.documentElement.clientWidth,
        ignoreElements: el => el === b || el === b2 || el.classList && (el.classList.contains('aibot') || el.classList.contains('totop')) };
      let headH = 0, hImg = null;
      if (head.length) {
        const h0 = head[0].getBoundingClientRect(), h1 = head[head.length - 1].getBoundingClientRect();
        const hc = await html2canvas(document.body, Object.assign({}, opt, { x: h0.left, y: h0.top + scrollY, width: h0.width, height: h1.bottom - h0.top }));
        headH = Math.min(PH * 0.3, (h1.bottom - h0.top) * PW / h0.width); hImg = hc;
      }
      const top = rr.top + scrollY, bottom = rr.bottom + scrollY;
      const pages = cuts(top, bottom, maxH, maxH - headH / k - 3 / k);
      for (let i = 0; i < pages.length; i++) {
        btn.textContent = `Đang tạo PDF… ${i + 1}/${pages.length}`;
        const [y0, y1] = pages[i];
        const c = await html2canvas(document.body, Object.assign({}, opt, { x: rr.left, y: y0, width: W, height: y1 - y0 }));
        if (i) pdf.addPage();
        let y = M;
        if (i === 0 && hImg) { pdf.addImage(hImg.toDataURL('image/jpeg', 0.85), 'JPEG', M, y, PW, headH, undefined, 'FAST'); y += headH + 3; }
        pdf.addImage(c.toDataURL('image/jpeg', 0.82), 'JPEG', M, y, PW, (y1 - y0) * k, undefined, 'FAST');
        pdf.setFontSize(8); pdf.setTextColor(140);
        pdf.text(`FinSuccess  |  ${i + 1}/${pages.length}`, 210 - M, 297 - 2.5, { align: 'right' });
      }
      const d = new Date();
      pdf.save(fname(`${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`));
    } catch (e) {
      console.error(e); alert('Không tạo được PDF: ' + (e && e.message || e));
    } finally {
      undo.reverse().forEach(f => { try { f(); } catch (e) {} });
      btn.textContent = label; btn.disabled = false; busy = false;
    }
  }
  const add = () => { const host = document.querySelector('.logo-right') || document.body; host.prepend(b2); host.prepend(b); };
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();

/* Nút "Hiện tất cả / Ẩn tất cả" dưới chú thích của mọi chart có từ 3 đường/cột trở lên:
   đang ẩn bớt → bấm để hiện lại toàn bộ; đang hiện đủ → bấm để ẩn hết rồi chọn lại mục muốn xem. */
(function () {
  if (!window.Chart) return;
  const label = ch => ch.data.datasets.some((d, i) => !ch.isDatasetVisible(i)) ? '↺ Hiện tất cả' : '⊘ Ẩn tất cả';
  Chart.register({ id: 'legendAll', afterUpdate(ch) {
    const t = ch.config.type; if (['pie', 'doughnut', 'polarArea'].includes(t)) return;
    const n = ch.data.datasets.length, lg = ch.options.plugins && ch.options.plugins.legend;
    const box = ch.canvas.parentElement; if (!box || !box.parentElement) return;
    let b = box.nextElementSibling && box.nextElementSibling.classList && box.nextElementSibling.classList.contains('lgall') ? box.nextElementSibling : null;
    if (n < 3 || (lg && lg.display === false)) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('div'); b.className = 'lgall';
      b.innerHTML = '<button type="button"></button>'; box.after(b);
    }
    const btn = b.firstChild; btn.textContent = label(ch);
    btn.onclick = () => { const any = ch.data.datasets.some((d, i) => !ch.isDatasetVisible(i));
      ch.data.datasets.forEach((d, i) => ch.setDatasetVisibility(i, any)); ch.update(); };
  } });
})();

/* gom các lần co giãn liên tiếp (mở lịch, đổi cỡ cửa sổ) thành một lần vẽ lại cho mỗi chart */
if (window.Chart) { Chart.defaults.resizeDelay = 120; Chart.defaults.devicePixelRatio = Math.max(2, window.devicePixelRatio || 1); }   // vẽ tối thiểu 2x: màn hình 100% hoặc trình duyệt thu nhỏ (DPR ≤ 1) không bị mờ
