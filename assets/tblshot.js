/* Bảng số: xuất ảnh phần đang xem, tô sáng dòng × cột khi rê chuột, menu chuột phải (chép ảnh ô / dòng / bảng, vẽ chart, so sánh).
   FSTbl.button(scrollEl, opts) → nút "Xuất ảnh bảng"
   FSTbl.enhance(scrollEl, { meta: () => opts, onChart(tr), onCompare(tr), isCompared(tr), clearCompare(), nCompare() })
   opts = { title, sub, src, file } */
(function () {
  const S = 2;   // độ phân giải x2
  const rgb = c => !c || c === 'transparent' || /rgba\(\d+,\s*\d+,\s*\d+,\s*0\)/.test(c) ? null : c;
  function bgOf(el, stop) { for (let e = el; e && e !== stop; e = e.parentElement) { const b = rgb(getComputedStyle(e).backgroundColor); if (b) return b; } return '#fff'; }
  function wrapLines(ctx, t, w) {
    const out = []; String(t).split('\n').forEach(par => { let line = ''; par.split(' ').forEach(wd => { const s = line ? line + ' ' + wd : wd; if (ctx.measureText(s).width > w && line) { out.push(line); line = wd; } else line = s; }); out.push(line); });
    return out;
  }
  const isGroup = tr => tr.cells.length === 1 && tr.cells[0].colSpan > 1;
  /* Vẽ bảng ra canvas. o.rows: chỉ giữ các dòng thân bảng này; o.cols: [trái, phải] theo toạ độ màn hình (mặc định = phần đang hiện, cắt về cột trọn) */
  function render(sc, o = {}) {
    const tbl = sc.querySelector('table'); if (!tbl) return null;
    sc.querySelectorAll('.xh,.xh-on').forEach(c => c.classList.remove('xh', 'xh-on'));
    const R = sc.getBoundingClientRect();
    const sticky = [...tbl.querySelectorAll('th,td')].filter(c => c.cellIndex === 0 && getComputedStyle(c).position === 'sticky');
    const w0 = sticky.length ? Math.max(...sticky.map(c => c.getBoundingClientRect().width)) : 0;
    let visL = R.left + w0, visR = Math.min(R.right, tbl.getBoundingClientRect().right);
    if (o.cols) { visL = o.cols[0]; visR = o.cols[1]; }
    else {   // chỉ lấy cột hiện trọn
      const rowMax = [...tbl.rows].reduce((a, r) => r.cells.length > (a ? a.cells.length : 0) ? r : a, null);
      if (rowMax) { const rs = [...rowMax.cells].filter(c => c.cellIndex > 0 || !w0).map(c => c.getBoundingClientRect());
        const L = rs.find(r => r.left >= visL - 1); if (L) visL = L.left; const Rr = [...rs].reverse().find(r => r.right <= visR + 1); if (Rr) visR = Rr.right; }
    }
    const keep = [...tbl.rows].filter(tr => tr.parentElement.tagName === 'THEAD' || !o.rows || o.rows.includes(tr));
    const rowY = new Map(); let Hb = 0;
    keep.forEach(tr => { rowY.set(tr, Hb); Hb += tr.getBoundingClientRect().height; });
    const W = Math.round(w0 + (visR - visL));
    const pad = o.compact ? 12 : 24, titleH = o.title ? 30 : 0;
    const cv = document.createElement('canvas'), x = cv.getContext('2d');
    x.font = '12px Arial'; const subL = o.sub ? wrapLines(x, o.sub, Math.max(W, 360)) : [], srcL = o.src ? wrapLines(x, 'Nguồn: ' + o.src, Math.max(W - 140, 220)) : [];
    const Wc = Math.max(W, o.title ? Math.min(900, x.measureText(o.title).width * 1.4 + 20) : 0, subL.length ? 360 : 0);
    const top = pad + titleH + subL.length * 16 + (subL.length ? 8 : 0), H = top + Hb + 12 + (srcL.length ? srcL.length * 15 : 15) + pad;
    cv.width = (Wc + pad * 2) * S; cv.height = H * S; x.scale(S, S);
    x.fillStyle = '#fff'; x.fillRect(0, 0, Wc + pad * 2, H);
    if (o.title) { x.fillStyle = '#1D2678'; x.font = 'bold 16px Arial'; x.textBaseline = 'top'; x.fillText(o.title, pad, pad); }
    x.fillStyle = '#596272'; x.font = '12px Arial'; x.textBaseline = 'top'; subL.forEach((l, i) => x.fillText(l, pad, pad + titleH + i * 16));
    const draw = stickyPass => keep.forEach(tr => [...tr.cells].forEach(c => {
      const r = c.getBoundingClientRect(); if (!r.width || !r.height) return;
      const grp = isGroup(tr), isSt = sticky.includes(c);
      if (grp ? stickyPass : stickyPass !== isSt) return;
      let X0, X1;
      if (grp) { X0 = 0; X1 = W; }
      else if (isSt) { X0 = 0; X1 = w0; }
      else { if (r.right <= visL + 1 || r.left >= visR - 1) return; X0 = w0 + Math.max(r.left, visL) - visL; X1 = w0 + Math.min(r.right, visR) - visL; }
      const Y0 = rowY.get(tr) + (r.top - tr.getBoundingClientRect().top), h = r.height, cs = getComputedStyle(c);
      x.save(); x.translate(pad, top);
      x.fillStyle = tr.classList.contains('hm-sel') && isSt ? '#fff' : bgOf(c, tbl.parentElement); x.fillRect(X0, Y0, X1 - X0, h);
      const hl = o.hl && o.hl.cells.has(c), on = o.hl && o.hl.on === c;
      if (hl) { x.fillStyle = 'rgba(29,38,120,.10)'; x.fillRect(X0, Y0, X1 - X0, h); }
      x.strokeStyle = '#e6e9f0'; x.lineWidth = 0.6; x.beginPath(); x.moveTo(X0, Y0 + h); x.lineTo(X1, Y0 + h); x.stroke();
      if (parseFloat(cs.borderLeftWidth) > 0 && cs.borderLeftStyle !== 'none') { x.strokeStyle = cs.borderLeftColor; x.lineWidth = parseFloat(cs.borderLeftWidth); x.beginPath(); x.moveTo(X0, Y0); x.lineTo(X0, Y0 + h); x.stroke(); }
      const txt = c.innerText.replace(/\s+/g, ' ').trim();
      if (txt) {
        x.beginPath(); x.rect(X0, Y0, X1 - X0, h); x.clip();
        x.fillStyle = cs.color; x.font = `${on || +cs.fontWeight >= 600 || cs.fontWeight === 'bold' ? 'bold ' : ''}${parseFloat(cs.fontSize)}px Arial`; x.textBaseline = 'middle';
        const pl = parseFloat(cs.paddingLeft) || 6, pr = parseFloat(cs.paddingRight) || 6, al = cs.textAlign, full = X1 - X0 >= r.width - 1;
        if (al === 'right' || al === 'end') { x.textAlign = 'right'; x.fillText(txt, X1 - pr, Y0 + h / 2); }
        else if (al === 'center' && full) { x.textAlign = 'center'; x.fillText(txt, (X0 + X1) / 2, Y0 + h / 2); }
        else { x.textAlign = 'left'; x.fillText(txt, X0 + pl, Y0 + h / 2); }
      }
      x.restore();
      if (on) { x.save(); x.translate(pad, top); x.strokeStyle = '#1D2678'; x.lineWidth = 2.2; x.strokeRect(X0 + 1.1, Y0 + 1.1, X1 - X0 - 2.2, h - 2.2); x.restore(); }
    }));
    draw(false); draw(true);
    if (w0) { x.strokeStyle = '#c9cfdc'; x.lineWidth = 1; x.beginPath(); x.moveTo(pad + w0, top); x.lineTo(pad + w0, top + Hb); x.stroke(); }
    const fy = top + Hb + 12; x.textAlign = 'left'; x.textBaseline = 'top'; x.font = '11px Arial'; x.fillStyle = '#8a93a3';
    srcL.forEach((l, i) => x.fillText(l, pad, fy + i * 15));
    x.textAlign = 'right'; x.font = 'bold 12px Arial'; x.fillStyle = '#1D2678'; x.fillText('FinSuccess', pad + Wc, fy);
    return cv;
  }
  function toast(t) {
    let d = document.querySelector('.tbl-toast'); if (!d) { d = document.createElement('div'); d.className = 'tbl-toast'; document.body.appendChild(d); }
    d.textContent = t; d.classList.add('on'); clearTimeout(d._t); d._t = setTimeout(() => d.classList.remove('on'), 2200);
  }
  function download(cv, file) {
    cv.toBlob(b => { const u = URL.createObjectURL(b), a = document.createElement('a'); a.download = (file || 'bang') + '.png'; a.href = u; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); toast('Đã tải ảnh PNG'); }, 'image/png');
  }
  function copy(cv, file) {
    if (!navigator.clipboard || !window.ClipboardItem) { download(cv, file); return; }
    const p = new Promise(res => cv.toBlob(res, 'image/png'));
    navigator.clipboard.write([new ClipboardItem({ 'image/png': p })]).then(() => toast('Đã chép ảnh — dán (Ctrl+V) vào Zalo, Word, email…')).catch(() => download(cv, file));
  }
  function shot(sc, o = {}) { const cv = render(sc, o); if (cv) download(cv, o.file); }
  function button(sc, o) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tbl-shot'; b.textContent = 'Xuất ảnh bảng';
    b.title = 'Tải ảnh PNG phần bảng đang hiện (cột đầu + các cột trong khung); cuộn ngang để chọn khoảng thời gian. Chuột phải vào một ô để chép ảnh ô, dòng hoặc cả bảng.';
    b.onclick = () => shot(sc, typeof o === 'function' ? o() : o);
    return b;
  }
  /* tô sáng dòng × cột + menu chuột phải */
  let menu = null;
  function closeMenu() { if (menu) { menu.remove(); menu = null; } }
  document.addEventListener('click', e => { if (menu && !menu.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('scroll', closeMenu, true);
  function enhance(sc, h = {}) {
    const tbl = sc.querySelector('table'); if (!tbl || tbl._fsx) return; tbl._fsx = 1;
    const meta = () => (typeof h.meta === 'function' ? h.meta() : h.meta) || {};
    const colCells = td => { const r = td.getBoundingClientRect(), cx = (r.left + r.right) / 2, out = [];
      [...tbl.rows].forEach(tr => { if (isGroup(tr)) return; [...tr.cells].forEach(c => { if (c === tr.cells[0] && tr.parentElement.tagName !== 'THEAD') return; const q = c.getBoundingClientRect(); if (q.left <= cx && q.right >= cx && c.colSpan === 1) out.push(c); }); });
      return out; };
    const clear = () => sc.querySelectorAll('.xh,.xh-on').forEach(c => c.classList.remove('xh', 'xh-on'));
    tbl.addEventListener('mouseover', e => {
      const td = e.target.closest('td'); if (!td || !tbl.contains(td)) return;
      const tr = td.parentElement; if (isGroup(tr) || tr.parentElement.tagName === 'THEAD') return;
      clear(); [...tr.cells].forEach(c => c.classList.add('xh'));
      if (td.cellIndex > 0) { colCells(td).forEach(c => c.classList.add('xh')); td.classList.add('xh-on'); }
    });
    tbl.addEventListener('mouseleave', clear);
    tbl.addEventListener('contextmenu', e => {
      const td = e.target.closest('td'); if (!td) return; const tr = td.parentElement; if (isGroup(tr) || tr.parentElement.tagName === 'THEAD') return;
      e.preventDefault(); closeMenu();
      const hlCells = new Set([...tr.cells, ...(td.cellIndex > 0 ? colCells(td) : [])]), hl = { cells: hlCells, on: td.cellIndex > 0 ? td : null };
      const m = meta(), lab = (tr.cells[0].innerText || '').trim(), cr = td.getBoundingClientRect();
      const it = [];
      if (td.cellIndex > 0) it.push(['Chép ảnh ô này', () => copy(render(sc, { ...m, title: lab, sub: '', rows: [tr], cols: [cr.left, cr.right], compact: 1 }), m.file + '_o')]);
      it.push(['Chép ảnh dòng này', () => copy(render(sc, { ...m, sub: '', rows: [tr] }), m.file + '_dong')]);
      it.push(['Chép ảnh bảng, tô sáng ô này', () => copy(render(sc, { ...m, hl }), m.file + '_to-sang')]);
      it.push(['Chép ảnh bảng đang xem', () => copy(render(sc, m), m.file)]);
      it.push(['Tải ảnh bảng, tô sáng ô này (PNG)', () => download(render(sc, { ...m, hl }), m.file + '_to-sang')]);
      it.push(['Tải ảnh bảng đang xem (PNG)', () => download(render(sc, m), m.file)]);
      if (h.onChart) it.push(['—'], ['Vẽ chart dòng này', () => h.onChart(tr)]);
      if (h.onCompare) { const inC = h.isCompared && h.isCompared(tr); it.push([inC ? 'Bỏ dòng này khỏi so sánh' : 'Thêm dòng này vào chart so sánh', () => h.onCompare(tr)]);
        if (h.nCompare && h.nCompare() > 0) it.push([`Xoá so sánh (${h.nCompare()} dòng)`, () => h.clearCompare()]); }
      menu = document.createElement('div'); menu.className = 'tbl-menu';
      menu.innerHTML = `<div class="tm-h">${lab.replace(/</g, '&lt;')}</div>` + it.map((x, i) => x[0] === '—' ? '<hr>' : `<button type="button" data-i="${i}">${x[0]}</button>`).join('');
      document.body.appendChild(menu);
      const mw = menu.offsetWidth, mh = menu.offsetHeight;
      menu.style.left = Math.min(e.clientX, innerWidth - mw - 8) + 'px'; menu.style.top = Math.min(e.clientY, innerHeight - mh - 8) + 'px';
      menu.querySelectorAll('button').forEach(b => b.onclick = () => { const f = it[+b.dataset.i][1]; closeMenu(); f(); });
    });
  }
  window.FSTbl = { shot, button, render, copy, download, enhance };
})();
