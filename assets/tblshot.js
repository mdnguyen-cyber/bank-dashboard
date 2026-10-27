/* Xuất ảnh bảng: chỉ phần đang hiện trong khung cuộn (cột đầu cố định + các cột đang xem), giữ màu ô, kèm tiêu đề, ghi chú và nguồn.
   FSTbl.button(scrollEl, {title, sub, src, file}) → nút "Xuất ảnh"; FSTbl.shot(...) → tải PNG. */
(function () {
  const S = 2;   // độ phân giải x2
  const rgb = c => !c || c === 'transparent' || /rgba\(\d+,\s*\d+,\s*\d+,\s*0\)/.test(c) ? null : c;
  function bgOf(el, stop) { for (let e = el; e && e !== stop; e = e.parentElement) { const b = rgb(getComputedStyle(e).backgroundColor); if (b) return b; } return '#fff'; }
  function wrapLines(ctx, t, w) {
    const out = []; String(t).split('\n').forEach(par => { let line = ''; par.split(' ').forEach(wd => { const s = line ? line + ' ' + wd : wd; if (ctx.measureText(s).width > w && line) { out.push(line); line = wd; } else line = s; }); out.push(line); });
    return out;
  }
  function shot(sc, o = {}) {
    const tbl = sc.querySelector('table'); if (!tbl) return;
    const R = sc.getBoundingClientRect(), first = tbl.querySelector('tbody tr td, thead tr th');
    const sticky = [...tbl.querySelectorAll('th,td')].filter(c => getComputedStyle(c).position === 'sticky' && c.cellIndex === 0);
    const w0 = sticky.length ? Math.max(...sticky.map(c => c.getBoundingClientRect().width)) : 0;
    let visL = R.left + w0, visR = Math.min(R.right, tbl.getBoundingClientRect().right); const T = tbl.getBoundingClientRect();
    // chỉ lấy cột hiện trọn: dịch mép trái/phải về ranh giới cột gần nhất (theo hàng có nhiều ô nhất)
    const rowMax = [...tbl.rows].reduce((a, r) => r.cells.length > (a ? a.cells.length : 0) ? r : a, null);
    if (rowMax) { const rs = [...rowMax.cells].filter(c => c.cellIndex > 0 || !w0).map(c => c.getBoundingClientRect());
      const L = rs.find(r => r.left >= visL - 1); if (L) visL = L.left; const Rr = [...rs].reverse().find(r => r.right <= visR + 1); if (Rr) visR = Rr.right; }
    const W = Math.round(w0 + (visR - visL)), Hb = Math.round(T.height);
    const pad = 24, titleH = o.title ? 34 : 0, subH0 = o.sub ? 1 : 0;
    const cv = document.createElement('canvas'), x = cv.getContext('2d');
    x.font = '12px Arial'; const subL = o.sub ? wrapLines(x, o.sub, W) : [], srcL = o.src ? wrapLines(x, 'Nguồn: ' + o.src, W - 140) : [];
    const top = pad + titleH + subL.length * 16 + (subH0 ? 8 : 0), H = top + Hb + 14 + Math.max(1, srcL.length) * 15 + pad;
    cv.width = (W + pad * 2) * S; cv.height = H * S; x.scale(S, S);
    x.fillStyle = '#fff'; x.fillRect(0, 0, W + pad * 2, H);
    if (o.title) { x.fillStyle = '#1D2678'; x.font = 'bold 17px Arial'; x.textBaseline = 'top'; x.fillText(o.title, pad, pad); }
    x.fillStyle = '#596272'; x.font = '12px Arial'; x.textBaseline = 'top'; subL.forEach((l, i) => x.fillText(l, pad, pad + titleH + i * 16));
    const cells = [...tbl.querySelectorAll('th,td')];
    const draw = (stickyPass) => cells.forEach(c => {
      const r = c.getBoundingClientRect(); if (!r.width || !r.height) return;
      const isSt = sticky.includes(c) || (c.cellIndex === 0 && getComputedStyle(c).position === 'sticky');
      if (stickyPass !== isSt && !(c.colSpan > 1 && c.cellIndex === 0 && c.parentElement.cells.length === 1)) return;
      let X0, X1;
      const span = c.colSpan > 1 && c.cellIndex === 0 && c.parentElement.cells.length === 1;   // dòng nhóm trải hết bảng
      if (span) { if (stickyPass) return; X0 = 0; X1 = W; }
      else if (isSt) { X0 = 0; X1 = w0; }
      else { if (r.right <= visL + 1 || r.left >= visR - 1) return; X0 = w0 + Math.max(r.left, visL) - visL; X1 = w0 + Math.min(r.right, visR) - visL; }
      const Y0 = r.top - T.top, h = r.height, cs = getComputedStyle(c);
      x.save(); x.translate(pad, top);
      x.fillStyle = c.parentElement.classList.contains('hm-sel') && isSt ? '#fff' : bgOf(c, tbl.parentElement); x.fillRect(X0, Y0, X1 - X0, h);
      x.strokeStyle = '#e6e9f0'; x.lineWidth = 0.6; x.beginPath(); x.moveTo(X0, Y0 + h); x.lineTo(X1, Y0 + h); x.stroke();
      if (parseFloat(cs.borderLeftWidth) > 0 && cs.borderLeftStyle !== 'none') { x.strokeStyle = cs.borderLeftColor; x.lineWidth = parseFloat(cs.borderLeftWidth); x.beginPath(); x.moveTo(X0, Y0); x.lineTo(X0, Y0 + h); x.stroke(); }
      const txt = c.innerText.replace(/\s+/g, ' ').trim();
      if (txt) {
        x.beginPath(); x.rect(X0, Y0, X1 - X0, h); x.clip();
        x.fillStyle = cs.color; x.font = `${cs.fontWeight >= 600 || cs.fontWeight === 'bold' ? 'bold ' : ''}${parseFloat(cs.fontSize)}px Arial`; x.textBaseline = 'middle';
        const pl = parseFloat(cs.paddingLeft) || 6, pr = parseFloat(cs.paddingRight) || 6, al = cs.textAlign;
        // ô bị cắt (colspan năm): canh trái phần đang hiện
        const full = X1 - X0 >= r.width - 1;
        if (al === 'right' || al === 'end') { x.textAlign = 'right'; x.fillText(txt, X1 - pr, Y0 + h / 2); }
        else if (al === 'center' && full) { x.textAlign = 'center'; x.fillText(txt, (X0 + X1) / 2, Y0 + h / 2); }
        else { x.textAlign = 'left'; x.fillText(txt, X0 + pl, Y0 + h / 2); }
      }
      x.restore();
    });
    draw(false); draw(true);
    if (w0) { x.strokeStyle = '#c9cfdc'; x.lineWidth = 1; x.beginPath(); x.moveTo(pad + w0, top); x.lineTo(pad + w0, top + Hb); x.stroke(); }
    const fy = top + Hb + 14; x.textAlign = 'left'; x.textBaseline = 'top'; x.font = '11px Arial'; x.fillStyle = '#8a93a3';
    srcL.forEach((l, i) => x.fillText(l, pad, fy + i * 15));
    x.textAlign = 'right'; x.font = 'bold 12px Arial'; x.fillStyle = '#1D2678'; x.fillText('FinSuccess', pad + W, fy);
    const a = document.createElement('a'); a.download = (o.file || 'bang') + '.png'; a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
  }
  function button(sc, o) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tbl-shot'; b.textContent = 'Xuất ảnh bảng';
    b.title = 'Tải ảnh PNG phần bảng đang hiện (cột đầu + các cột trong khung); cuộn ngang để chọn khoảng thời gian trước khi xuất';
    b.onclick = () => shot(sc, typeof o === 'function' ? o() : o);
    return b;
  }
  window.FSTbl = { shot, button };
})();
