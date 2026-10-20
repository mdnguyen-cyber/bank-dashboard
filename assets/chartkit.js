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
    }).join('') + '<span class="ysel"><button type="button" data-y="fit" title="Trục Y co theo dữ liệu đang hiện">Y vừa dữ liệu</button><button type="button" data-y="man" title="Tự đặt giá trị nhỏ nhất, lớn nhất của trục Y">Y tuỳ chỉnh</button><button type="button" data-y="def" title="Trục Y mặc định">Y mặc định</button><span class="yman" hidden><input type="number" step="any" placeholder="min" data-yi="min"><input type="number" step="any" placeholder="max" data-yi="max"></span></span><span class="rng-hint">kéo trên chart để zoom · kéo trên trục Y để chỉnh trục</span>';
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
    // ---- chart chồng (stacked): chuyển qua lại giá trị ↔ tỷ trọng 100%
    const stk = () => ch.data.datasets.filter(d => (!d.yAxisID || d.yAxisID === 'y') && (d.stack != null || (d.fill && d.fill !== false)));
    const allPos = () => stk().every(d => d.data.every(v => v == null || isNaN(v) || +v >= 0));   // chỉ chart cấu phần luôn dương mới có tỷ trọng 100%
    if (Y().stacked && stk().length > 1 && allPos()) {
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

  window.FSK = { prep, reorder, enhance, dates, sortable };
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
