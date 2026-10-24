/* Chia sẻ ảnh chart: ghép ảnh có thương hiệu (16:9 hoặc 4:5), vẽ chú thích (mũi tên, mũi tên đứt, tô sáng, khung, vòng, chữ),
   rồi Chia sẻ / Tải ảnh / Chép ảnh / Chép caption. Dùng chung cho trang ngành và trang ngân hàng. */
(function () {
  const FIN = { navy: '#1D2678', purple: '#861C52', gold: '#FFD45D', red: '#c0392b', teal: '#59C5C8', ink: '#1f2433', grey: '#6b7385', line: '#e3e6ee' };
  const SW = [['navy', 'Xanh FinSuccess'], ['purple', 'Đỏ mận'], ['gold', 'Vàng'], ['red', 'Đỏ'], ['teal', 'Xanh ngọc']];
  const TOOLS = [['none', '↖', 'Không vẽ'], ['arrow', '➝', 'Mũi tên'], ['darrow', '⇢', 'Mũi tên đứt'], ['hl', '▬', 'Tô sáng'], ['box', '▢', 'Khung'], ['ring', '◯', 'Khoanh tròn'], ['text', 'T', 'Chữ']];
  const FMT = { wide: { w: 1600, h: 900, t: 'Ngang 16:9', s: 'X · Telegram · Zalo' }, tall: { w: 1080, h: 1350, t: 'Dọc 4:5', s: 'Facebook · Instagram' } };
  const st = { card: null, fmt: 'wide', base: null, shapes: [], tool: 'arrow', color: 'navy', picked: false, drag: null, meta: null };
  let logo = null; { const im = new Image(); im.onload = () => { logo = im; }; im.src = 'assets/fin-success-logo.png'; }

  /* ---------- nút trên từng thẻ chart ---------- */
  function addButtons() {
    document.querySelectorAll('article.card').forEach(c => {
      if (c.querySelector(':scope > .ibar .sharepill, :scope > .sharerow')) return;
      const cv = [...c.querySelectorAll('canvas')].find(x => window.Chart && Chart.getChart(x)); if (!cv) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sharepill'; b.innerHTML = '⇪ Chia sẻ ảnh'; b.title = 'Chia sẻ ảnh chart này';
      b.onclick = e => { e.stopPropagation(); open(c); };
      let row = c.querySelector(':scope > .ibar');
      if (!row) { row = document.createElement('div'); row.className = 'ibar sharerow'; c.appendChild(row); }
      row.appendChild(b);
    });
  }
  let tmr = null; new MutationObserver(() => { clearTimeout(tmr); tmr = setTimeout(addButtons, 250); }).observe(document.body, { childList: true, subtree: true });
  setTimeout(addButtons, 800);

  /* ---------- thông tin thẻ ---------- */
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  const plain = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  function cleanSrc(s) {   // ảnh đem đi chia sẻ: ghi nguồn gốc công bố, không ghi kho dữ liệu nội bộ
    s = s.replace(/^Nguồn:\s*/i, '').replace(/WiData\s+fs_bank/gi, 'BCTC ngân hàng').replace(/\(?\s*WiData[^·;,)]*\)?/gi, '').replace(/\s*·\s*(?=·|$)/g, '').replace(/^[\s·;,]+|[\s·;,]+$/g, '').replace(/\s{2,}/g, ' ');
    return s || 'FinSuccess tổng hợp';
  }
  function meta(c) {
    const h = c.querySelector(':scope > h3.sub'), cv = [...c.querySelectorAll('canvas')].find(x => Chart.getChart(x)), ch = Chart.getChart(cv);
    let title = 'Biểu đồ'; if (h) { const k = h.cloneNode(true); k.querySelectorAll('.grip,button,.ctl,select,input').forEach(e => e.remove()); title = txt(k) || title; }
    const sub = txt(c.querySelector(':scope > .chart-sub'));
    const src = cleanSrc(txt(c.querySelector(':scope > .src')));
    const labs = (ch.data.labels || []).filter(x => x != null && x !== ''), max = ch.options.scales && ch.options.scales.x && ch.options.scales.x.max;
    let last = labs.length ? String(labs[Math.min(labs.length - 1, typeof max === 'number' ? Math.round(max) : labs.length - 1)]) : '';
    if (!/\d{4}|\d{1,2}\/\d{1,2}|Q\d/.test(last)) last = '';   // trục không phải thời gian (kỳ hạn, tên nước…) thì không ghi kỳ dữ liệu
    const page = txt(document.querySelector('.site-nav a.on')) || (document.title || '').split('·')[0].trim() || 'FinSuccess';
    const ins = txt(c.querySelector(':scope > .insight')).replace(/Hàm ý:.*/s, '').slice(0, 420);
    return { ch, cv, title, sub, src, last, page, ins };
  }

  /* ---------- ghép ảnh ---------- */
  function wrap(ctx, s, maxW, maxLines) {
    const out = []; let cur = '';
    s.split(' ').forEach(w => { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; });
    if (cur) out.push(cur);
    if (out.length > maxLines) { out.length = maxLines; out[maxLines - 1] = out[maxLines - 1].replace(/\s*\S*$/, '') + '…'; }
    return out;
  }
  function compose() {
    const m = st.meta, F = FMT[st.fmt], W = F.w, H = F.h, k = W / 1600 * (st.fmt === 'tall' ? 1.25 : 1);
    const cvs = document.createElement('canvas'); cvs.width = W; cvs.height = H; const x = cvs.getContext('2d');
    const P = Math.round(48 * k), font = (wt, px) => `${wt} ${Math.round(px * k)}px Arial, sans-serif`;
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.fillStyle = FIN.navy; x.fillRect(0, 0, W, Math.round(8 * k));
    let y = Math.round(30 * k); const lh = Math.round(46 * k);
    if (logo) { const lw = logo.width / logo.height * lh; x.drawImage(logo, P, y, lw, lh); }
    x.font = font('700', 17); x.fillStyle = FIN.grey; x.textAlign = 'right'; x.textBaseline = 'middle'; x.fillText(m.page, W - P, y + lh / 2); x.textAlign = 'left';
    y += lh + Math.round(16 * k); x.fillStyle = FIN.line; x.fillRect(P, y, W - 2 * P, 2); y += Math.round(26 * k);
    x.textBaseline = 'top';
    if (st.key) {   // kiểu slide: thông điệp chính to nhất, tên chart và mô tả nhỏ, xám bên dưới
      x.fillStyle = FIN.navy; x.font = font('700', 36);
      wrap(x, st.key, W - 2 * P, 3).forEach(l => { x.fillText(l, P, y); y += Math.round(44 * k); });
      y += Math.round(4 * k); x.fillStyle = FIN.grey; x.font = font('700', 18);
      wrap(x, m.title, W - 2 * P, 1).forEach(l => { x.fillText(l, P, y); y += Math.round(24 * k); });
      if (m.sub) { x.font = font('400', 16); wrap(x, m.sub, W - 2 * P, 2).forEach(l => { x.fillText(l, P, y); y += Math.round(21 * k); }); }
    } else {
      x.fillStyle = FIN.navy; x.font = font('700', 34);
      wrap(x, m.title, W - 2 * P, 2).forEach(l => { x.fillText(l, P, y); y += Math.round(42 * k); });
      if (m.sub) { x.fillStyle = FIN.grey; x.font = font('400', 18); wrap(x, m.sub, W - 2 * P, 2).forEach(l => { x.fillText(l, P, y); y += Math.round(24 * k); }); }
    }
    y += Math.round(10 * k);
    x.font = font('400', 16); const foot = wrap(x, (m.last ? 'Kỳ dữ liệu: ' + m.last + ' · ' : '') + 'Nguồn: ' + m.src, W - 2 * P - Math.round(260 * k), 2);
    const fh = foot.length * Math.round(22 * k) + Math.round(34 * k), cy1 = H - fh;
    // vẽ lại chart đúng khung ảnh ở độ phân giải cao rồi trả về như cũ
    const ch = m.ch, cw = W - 2 * P, chh = cy1 - y, old = ch.options.devicePixelRatio, oldA = ch.options.animation;
    const zs = st.fmt === 'tall' ? 1.3 : 1.6;   // phóng chữ/nét của chart cho vừa khổ ảnh
    ch.options.devicePixelRatio = 2 * zs; ch.options.animation = false; ch.resize(Math.round(cw / zs), Math.round(chh / zs)); ch.update('none');
    x.drawImage(ch.canvas, P, y, cw, chh);
    ch.options.devicePixelRatio = old; ch.options.animation = oldA; ch.resize(); ch.update('none');
    x.fillStyle = FIN.line; x.fillRect(P, cy1, W - 2 * P, 1);
    let fy = cy1 + Math.round(14 * k); x.fillStyle = FIN.grey; x.font = font('400', 16);
    foot.forEach(l => { x.fillText(l, P, fy); fy += Math.round(22 * k); });
    x.textAlign = 'right'; x.fillStyle = FIN.navy; x.font = font('700', 16); x.fillText('FinSuccess Research', W - P, cy1 + Math.round(14 * k));
    x.fillStyle = FIN.grey; x.font = font('400', 13); x.fillText('Tổng hợp có sự hỗ trợ của AI', W - P, cy1 + Math.round(36 * k)); x.textAlign = 'left';
    return cvs;
  }

  /* ---------- vẽ chú thích ---------- */
  const col = (c, a) => { const h = FIN[c]; if (a == null) return h; const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
  function arrow(x, a, b, s, dash) {
    const ang = Math.atan2(b.y - a.y, b.x - a.x), hd = 9 * s + 10, ex = b.x - Math.cos(ang) * hd * 0.8, ey = b.y - Math.sin(ang) * hd * 0.8;
    x.setLineDash(dash ? [14 * s, 10 * s] : []); x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(ex, ey); x.stroke(); x.setLineDash([]);
    x.beginPath(); x.moveTo(b.x, b.y); x.lineTo(b.x - hd * Math.cos(ang - 0.42), b.y - hd * Math.sin(ang - 0.42)); x.lineTo(b.x - hd * Math.cos(ang + 0.42), b.y - hd * Math.sin(ang + 0.42)); x.closePath(); x.fill();
  }
  function drawShape(x, sh, W) {
    const s = W / 1000 * 1.6; x.save(); x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = col(sh.c); x.fillStyle = col(sh.c); x.lineWidth = 2.5 * s;
    const a = sh.a, b = sh.b || sh.a, rx = Math.min(a.x, b.x), ry = Math.min(a.y, b.y), rw = Math.abs(b.x - a.x), rh = Math.abs(b.y - a.y);
    if (sh.t === 'arrow' || sh.t === 'darrow') arrow(x, a, b, s, sh.t === 'darrow');
    else if (sh.t === 'hl') { x.fillStyle = col(sh.c, 0.28); x.fillRect(rx, ry, rw, rh); }
    else if (sh.t === 'box') x.strokeRect(rx, ry, rw, rh);
    else if (sh.t === 'ring') { x.beginPath(); x.ellipse(rx + rw / 2, ry + rh / 2, Math.max(rw / 2, 1), Math.max(rh / 2, 1), 0, 0, Math.PI * 2); x.stroke(); }
    else if (sh.t === 'text') {
      const fs = Math.round(11 * s); x.font = `700 ${fs}px Arial, sans-serif`; x.textBaseline = 'top';
      const lines = sh.s.split('\n'), tw = Math.max(...lines.map(l => x.measureText(l).width)), pd = fs * 0.4;
      x.fillStyle = 'rgba(255,255,255,0.92)'; x.fillRect(a.x - pd, a.y - pd, tw + 2 * pd, lines.length * fs * 1.25 + pd * 1.6);
      x.strokeStyle = col(sh.c); x.lineWidth = 1.5 * s; x.strokeRect(a.x - pd, a.y - pd, tw + 2 * pd, lines.length * fs * 1.25 + pd * 1.6);
      x.fillStyle = sh.c === 'gold' ? FIN.ink : col(sh.c); lines.forEach((l, i) => x.fillText(l, a.x, a.y + i * fs * 1.25));
    }
    x.restore();
  }
  function render() {
    const cv = M.querySelector('.fss-cv'); if (!st.base) return;
    cv.width = st.base.width; cv.height = st.base.height; const x = cv.getContext('2d'); x.drawImage(st.base, 0, 0);
    st.shapes.forEach(s => drawShape(x, s, cv.width)); if (st.drag) drawShape(x, st.drag, cv.width);
  }
  function finalCanvas() { const c = document.createElement('canvas'); c.width = st.base.width; c.height = st.base.height; const x = c.getContext('2d'); x.drawImage(st.base, 0, 0); st.shapes.forEach(s => drawShape(x, s, c.width)); return c; }
  function pt(e) { const cv = M.querySelector('.fss-cv'), r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * cv.width, y: (e.clientY - r.top) / r.height * cv.height }; }

  /* ---------- hộp thoại ---------- */
  const M = document.createElement('div'); M.className = 'fss-modal'; M.hidden = true; M.setAttribute('role', 'dialog'); M.setAttribute('aria-modal', 'true'); M.setAttribute('aria-label', 'Chia sẻ ảnh');
  M.innerHTML = `<div class="fss-box"><div class="fss-hd"><b>⇪ Chia sẻ ảnh</b><button type="button" class="fss-x" aria-label="Đóng">×</button></div>
    <div class="fss-body"><div class="fss-left">
      <div class="fss-tools">${TOOLS.map(([k, i, l]) => `<button type="button" data-tool="${k}" title="${l}"><span>${i}</span>${l}</button>`).join('')}
        <span class="fss-sep"></span>${SW.map(([k, l]) => `<button type="button" class="fss-sw" data-c="${k}" title="${l}" style="background:${FIN[k]}"></button>`).join('')}
        <span class="fss-sep"></span><button type="button" data-act="undo" title="Hoàn tác">↶ Hoàn tác</button><button type="button" data-act="clear" title="Xóa hết hình vẽ">Xóa vẽ</button></div>
      <div class="fss-stage"><canvas class="fss-cv" aria-label="Ảnh xem trước"></canvas><div class="fss-wait">Đang tạo ảnh…</div></div>
      <p class="fss-hint">Kéo trên ảnh để vẽ. Chữ: chọn T rồi bấm vào vị trí cần ghi.</p></div>
    <div class="fss-right">
      <div class="fss-fmt">${Object.entries(FMT).map(([k, f]) => `<button type="button" data-fmt="${k}"><b>${f.t}</b><small>${f.s}</small></button>`).join('')}</div>
      <label class="fss-lab">THÔNG ĐIỆP CHÍNH <small>tuỳ chọn · thành tiêu đề lớn trên ảnh, tên chart thu nhỏ màu xám</small><textarea class="fss-key" rows="2" placeholder="VD: Lợi suất TPCP tăng ở mọi kỳ hạn, kỳ hạn ngắn tăng mạnh nhất so với đầu năm"></textarea></label>
      <label class="fss-lab">CAPTION<textarea class="fss-cap" rows="7"></textarea></label>
      <button type="button" class="fss-main" data-act="share">⇪ Chia sẻ…</button>
      <div class="fss-row"><button type="button" data-act="dl">Tải ảnh</button><button type="button" data-act="copy">Chép ảnh</button></div>
      <button type="button" data-act="cap" class="fss-capbtn">Chép caption</button>
      <p class="fss-msg" aria-live="polite"></p>
      <p class="fss-note">Trên điện thoại, nút Chia sẻ mở thẳng Zalo, Telegram, Facebook, X… Caption được chép sẵn — dán vào bài đăng.</p></div></div></div>
    <div class="fss-txt" hidden><textarea rows="2" placeholder="Nhập chữ, Enter để xong"></textarea></div>`;
  document.body.appendChild(M);
  const msg = t => { M.querySelector('.fss-msg').textContent = t; };
  function syncUi() {
    M.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === st.tool));
    M.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', b.dataset.c === st.color));
    M.querySelectorAll('[data-fmt]').forEach(b => b.classList.toggle('on', b.dataset.fmt === st.fmt));
    M.querySelector('.fss-stage').classList.toggle('draw', st.tool !== 'none');
    M.querySelector('.fss-stage').classList.toggle('tall', st.fmt === 'tall');
  }
  function build() {
    M.querySelector('.fss-wait').hidden = false;
    setTimeout(() => {
      try { const old = st.base; st.base = compose();
        if (old && (old.width !== st.base.width || old.height !== st.base.height)) st.shapes = st.shapes.map(s => ({ ...s, a: { x: s.a.x / old.width * st.base.width, y: s.a.y / old.height * st.base.height }, b: s.b && { x: s.b.x / old.width * st.base.width, y: s.b.y / old.height * st.base.height } }));
        render(); } catch (e) { msg('Không tạo được ảnh: ' + e.message); }
      M.querySelector('.fss-wait').hidden = true;
    }, 30);
  }
  function caption(m) {
    return [...(st.key ? [st.key, ''] : []), m.page, '', m.title + (m.sub ? ' (' + m.sub + ')' : ''), m.ins ? '\n' + m.ins : '', '', (m.last ? 'Kỳ dữ liệu: ' + m.last + '\n' : '') + 'Nguồn: ' + m.src, 'Xem đầy đủ: ' + location.href.split('?')[0].split('#')[0]].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
  }
  function open(c) {
    st.card = c; st.meta = meta(c); st.shapes = []; st.base = null; st.key = ''; M.querySelector('.fss-key').value = ''; st.tool = 'arrow'; st.color = 'navy'; st.picked = false; msg('');
    M.querySelector('.fss-cap').value = caption(st.meta); M.hidden = false; document.body.classList.add('fss-open'); syncUi(); build();
  }
  function close() { M.hidden = true; document.body.classList.remove('fss-open'); M.querySelector('.fss-txt').hidden = true; }
  const blob = () => new Promise(r => finalCanvas().toBlob(r, 'image/png'));
  const fname = () => 'FinSuccess_' + plain(st.meta.title).replace(/[^\w\- ]+/g, '').trim().slice(0, 60) + '_' + new Date().toLocaleDateString('vi-VN').replace(/\//g, '-') + '.png';
  async function copyText(t) { try { await navigator.clipboard.writeText(t); return true; } catch (e) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (er) {} a.remove(); return ok; } }
  async function act(k) {
    const cap = M.querySelector('.fss-cap').value;
    if (k === 'cap') { msg(await copyText(cap) ? 'Đã chép caption.' : 'Không chép được caption.'); return; }
    if (k === 'undo') { st.shapes.pop(); render(); return; }
    if (k === 'clear') { st.shapes = []; render(); return; }
    const b = await blob();
    if (k === 'dl') { const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = fname(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); msg('Đã tải ảnh.'); return; }
    if (k === 'copy') { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); msg('Đã chép ảnh — dán vào bài đăng.'); } catch (e) { msg('Trình duyệt chưa cho chép ảnh. Hãy dùng Tải ảnh.'); } return; }
    if (k === 'share') {
      const f = new File([b], fname(), { type: 'image/png' }); await copyText(cap);
      if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], text: cap, title: st.meta.title }); msg('Đã mở chia sẻ · caption đã chép sẵn.'); } catch (e) { if (e.name !== 'AbortError') msg('Không mở được chia sẻ. Hãy dùng Tải ảnh.'); } }
      else msg('Trình duyệt này chưa hỗ trợ chia sẻ trực tiếp — hãy dùng Tải ảnh hoặc Chép ảnh. Caption đã chép sẵn.');
    }
  }
  M.addEventListener('click', e => {
    if (e.target === M || e.target.closest('.fss-x')) return close();
    const t = e.target.closest('[data-tool]'); if (t) { st.tool = t.dataset.tool; if (!st.picked) st.color = st.tool === 'hl' ? 'gold' : 'navy'; return syncUi(); }
    const c = e.target.closest('[data-c]'); if (c) { st.color = c.dataset.c; st.picked = true; return syncUi(); }
    const f = e.target.closest('[data-fmt]'); if (f && f.dataset.fmt !== st.fmt) { st.fmt = f.dataset.fmt; syncUi(); return build(); }
    const a = e.target.closest('[data-act]'); if (a) act(a.dataset.act);
  });
  let keyT = null;
  M.querySelector('.fss-key').addEventListener('input', e => { clearTimeout(keyT); keyT = setTimeout(() => { st.key = e.target.value.trim(); M.querySelector('.fss-cap').value = caption(st.meta); build(); }, 450); });
  document.addEventListener('keydown', e => { if (M.hidden) return; if (e.key === 'Escape' && M.querySelector('.fss-txt').hidden) close(); if ((e.ctrlKey || e.metaKey) && e.key === 'z' && document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); act('undo'); } });
  const cv = M.querySelector('.fss-cv');
  cv.addEventListener('pointerdown', e => {
    if (st.tool === 'none' || !st.base) return; const p = pt(e);
    if (st.tool === 'text') { textAt(p, e); return; }
    cv.setPointerCapture(e.pointerId); st.drag = { t: st.tool, c: st.color, a: p, b: p }; e.preventDefault();
  });
  cv.addEventListener('pointermove', e => { if (!st.drag) return; st.drag.b = pt(e); render(); });
  const end = () => { if (!st.drag) return; const d = st.drag; st.drag = null; if (Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y) > 8) st.shapes.push(d); render(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  function textAt(p, e) {
    const box = M.querySelector('.fss-txt'), ta = box.querySelector('textarea');
    e.preventDefault(); const t0 = Date.now();
    box.hidden = false; box.style.left = Math.min(e.clientX, innerWidth - 260) + 'px'; box.style.top = Math.min(e.clientY, innerHeight - 70) + 'px'; ta.value = ''; setTimeout(() => ta.focus(), 30);
    const done = ok => { box.hidden = true; ta.onkeydown = ta.onblur = null; const s = ta.value.trim(); if (ok && s) { st.shapes.push({ t: 'text', c: st.color, a: p, s }); render(); } };
    ta.onkeydown = ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); done(true); } else if (ev.key === 'Escape') { ev.stopPropagation(); done(false); } };
    ta.onblur = () => { if (Date.now() - t0 < 400) { setTimeout(() => ta.focus(), 0); return; } done(true); };
  }
})();
