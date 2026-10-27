/* Chia sẻ ảnh chart: ghép ảnh có thương hiệu (16:9 hoặc 4:5) từ 1 hoặc nhiều chart (tối đa 6), vẽ chú thích (mũi tên, mũi tên đứt,
   tô sáng, khung, vòng, chữ), rồi Chia sẻ / Tải ảnh / Chép ảnh / Chép caption. Dùng chung cho trang ngành và trang ngân hàng.
   Chọn nhiều chart: nút "＋ Ghép" trên từng thẻ (giỏ chart ở góc dưới) hoặc "＋ Thêm chart" trong hộp thoại (lọc theo tab, tìm theo tên).
   Trang có thể khai báo window.FSSHARE = { prep() — dựng các tab ẩn để có đủ chart, path(card) — [tab, tab con] }. */
(function () {
  const FIN = { navy: '#1D2678', purple: '#861C52', gold: '#FFD45D', red: '#c0392b', teal: '#59C5C8', ink: '#1f2433', grey: '#6b7385', line: '#e3e6ee' };
  const SW = [['navy', 'Xanh FinSuccess'], ['purple', 'Đỏ mận'], ['gold', 'Vàng'], ['red', 'Đỏ'], ['teal', 'Xanh ngọc']];
  const TOOLS = [['none', '↖', 'Không vẽ'], ['arrow', '➝', 'Mũi tên'], ['darrow', '⇢', 'Mũi tên đứt'], ['hl', '▬', 'Tô sáng'], ['box', '▢', 'Khung'], ['ring', '◯', 'Khoanh tròn'], ['text', 'T', 'Chữ']];
  const FMT = { wide: { w: 1600, h: 900, t: 'Ngang 16:9', s: 'X · Telegram · Zalo' }, tall: { w: 1080, h: 1350, t: 'Dọc 4:5', s: 'Facebook · Instagram' } };
  const MAXN = 6, LAY = [['auto', 'Tự động'], ['1', '1 cột'], ['2', '2 cột'], ['3', '3 cột']];
  const RNG = [['cur', 'Như trên chart'], ['match', 'Khớp chart ngắn nhất'], ['1', '1M'], ['3', '3M'], ['6', '6M'], ['ytd', 'YTD'], ['12', '1Y'], ['36', '3Y'], ['60', '5Y'], ['0', 'Tất cả']];
  const st = { items: [], fmt: 'wide', lay: 'auto', rng: 'cur', base: null, shapes: [], tool: 'arrow', color: 'navy', picked: false, drag: null, key: '' };
  const basket = [];   // thẻ chart đã bấm "＋ Ghép"
  const first = () => st.items[0] && st.items[0].meta;
  let logo = null; { const im = new Image(); im.onload = () => { logo = im; }; im.src = 'assets/fin-success-logo.png'; }

  /* ---------- nút trên từng thẻ chart ---------- */
  function addButtons() {
    document.querySelectorAll('article.card').forEach(c => {
      if (c.querySelector(':scope > .ibar .sharepill, :scope > .sharerow')) return;
      const cv = [...c.querySelectorAll('canvas')].find(x => window.Chart && Chart.getChart(x)); if (!cv) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sharepill'; b.innerHTML = '⇪ Chia sẻ ảnh'; b.title = 'Chia sẻ ảnh chart này';
      b.onclick = e => { e.stopPropagation(); open([c]); };
      const g = document.createElement('button'); g.type = 'button'; g.className = 'sharepill fss-add'; g.textContent = '＋ Ghép'; g.title = 'Chọn chart này để ghép nhiều chart vào một ảnh';
      g.onclick = e => { e.stopPropagation(); toggleBasket(c); };
      let row = c.querySelector(':scope > .ibar');
      if (!row) { row = document.createElement('div'); row.className = 'ibar sharerow'; c.appendChild(row); }
      row.appendChild(g); row.appendChild(b);
    });
  }
  let tmr = null; new MutationObserver(() => { clearTimeout(tmr); tmr = setTimeout(() => { addButtons(); syncBasket(); }, 250); }).observe(document.body, { childList: true, subtree: true });

  /* ---------- giỏ chart (ghép nhiều chart) ---------- */
  const tray = document.createElement('div'); tray.className = 'fss-tray'; tray.hidden = true;
  tray.innerHTML = '<b class="fss-tn"></b><button type="button" data-t="go" class="fss-tgo">Ghép ảnh →</button><button type="button" data-t="clr">Bỏ chọn</button>';
  document.body.appendChild(tray);
  function toggleBasket(c) {
    const i = basket.indexOf(c);
    if (i >= 0) basket.splice(i, 1); else if (basket.length >= MAXN) { flash(`Tối đa ${MAXN} chart trong một ảnh.`); return; } else basket.push(c);
    syncBasket();
  }
  function syncBasket() {
    for (let i = basket.length - 1; i >= 0; i--) if (!document.body.contains(basket[i])) basket.splice(i, 1);
    document.querySelectorAll('.fss-add').forEach(b => { const on = basket.includes(b.closest('article.card')); b.classList.toggle('on', on); b.textContent = on ? '✓ Đã chọn ' + (basket.indexOf(b.closest('article.card')) + 1) : '＋ Ghép'; });
    tray.hidden = !basket.length; tray.querySelector('.fss-tn').textContent = `${basket.length} chart đã chọn`;
  }
  function flash(t) { tray.hidden = false; const n = tray.querySelector('.fss-tn'), o = n.textContent; n.textContent = t; setTimeout(() => { n.textContent = o; syncBasket(); }, 1800); }
  tray.addEventListener('click', e => { const t = e.target.closest('[data-t]'); if (!t) return; if (t.dataset.t === 'clr') { basket.length = 0; syncBasket(); } else if (basket.length) open(basket.slice()); });
  setTimeout(addButtons, 800);

  /* ---------- thông tin thẻ ---------- */
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  const plain = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  function cleanSrc(s) {   // ảnh đem đi chia sẻ: số lấy từ Wi MCP ghi "Wi MCP" (bỏ mã bảng nội bộ), số lấy ngoài ghi nguồn ngoài
    s = s.replace(/^Nguồn:\s*/i, '').replace(/Wi(?:Data| MCP)\b[^·;)]*/gi, 'Wi MCP').replace(/\s*·\s*(?=·|$)/g, '').replace(/^[\s·;,]+|[\s·;,]+$/g, '').replace(/\s{2,}/g, ' ');
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
    const path = pathOf(c);
    const ins = txt(c.querySelector(':scope > .insight')).replace(/Hàm ý:.*/s, '').slice(0, 420);
    return { ch, cv, title, sub, src, last, page, ins, path };
  }
  function pathOf(c) {
    try { if (window.FSSHARE && FSSHARE.path) { const p = FSSHARE.path(c); if (p && p.length) return p.filter(Boolean); } } catch (e) {}
    const pn = c.closest('.pane'), b = pn && document.querySelector(`[data-tab="${pn.id}"]`);
    return [b ? txt(b).replace(/^\d+\.\s*/, '') : (document.title || '').split('·')[0].trim()];
  }

  /* ---------- ghép ảnh ---------- */
  function wrap(ctx, s, maxW, maxLines) {
    const out = []; let cur = '';
    s.split(' ').forEach(w => { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; });
    if (cur) out.push(cur);
    if (out.length > maxLines) { out.length = maxLines; out[maxLines - 1] = out[maxLines - 1].replace(/\s*\S*$/, '') + '…'; }
    return out;
  }
  /* ---------- khung thời gian khi ghép ảnh ---------- */
  const tdates = ch => (window.FSK && FSK.dates && (ch.data.labels || []).length >= 6) ? FSK.dates(ch.data.labels) : null;
  const curWin = ch => { const x = (ch.options.scales && ch.options.scales.x) || {}, n = (ch.data.labels || []).length; return [typeof x.min === 'number' ? x.min : 0, typeof x.max === 'number' ? x.max : n - 1]; };
  function winOf(it) {   // [i0, i1] cần hiện cho chart này, hoặc null = giữ như trên chart
    const k = it.rng || st.rng, ch = it.meta.ch, ds = tdates(ch);
    if (!ds || k === 'cur') return null;
    if (k === 'match') {   // ngày bắt đầu muộn nhất trong các chart chuỗi thời gian đang ghép (theo khung đang hiện của từng chart)
      let from = null;
      st.items.forEach(o => { const d2 = tdates(o.meta.ch); if (d2) { const s0 = d2[curWin(o.meta.ch)[0]]; if (!from || s0 > from) from = s0; } });
      if (!from) return null;
      let i0 = ds.findIndex(d => d >= from); if (i0 < 0) i0 = ds.length - 1;
      return [i0, curWin(ch)[1]];
    }
    const kk = k === 'ytd' ? 'ytd' : +k;
    return FSK.windowFor(ds, kk);
  }
  function snap(x, ch, X, Y, w, h, zs, win) {   // vẽ lại chart đúng khung ở độ phân giải cao (và khung thời gian đã chọn) rồi trả về như cũ
    const old = ch.options.devicePixelRatio, oldA = ch.options.animation;
    const sx = ch.options.scales && ch.options.scales.x, keep = sx ? { min: sx.min, max: sx.max } : null;
    if (win && sx) { const n = (ch.data.labels || []).length; if (win[0] <= 0 && win[1] >= n - 1) { delete sx.min; delete sx.max; } else { sx.min = win[0]; sx.max = win[1]; } }
    ch.options.devicePixelRatio = 2 * zs; ch.options.animation = false; ch.resize(Math.round(w / zs), Math.round(h / zs)); ch.update('none');
    x.drawImage(ch.canvas, X, Y, w, h);
    if (win && sx) { ['min', 'max'].forEach(k => { if (keep[k] === undefined) delete sx[k]; else sx[k] = keep[k]; }); }
    ch.options.devicePixelRatio = old ?? Chart.defaults.devicePixelRatio; ch.options.animation = oldA; ch.resize(); ch.update('none');
  }
  function lastLab(it) {   // kỳ dữ liệu cuối theo khung sẽ vẽ
    const w = winOf(it); if (!w) return it.meta.last; const l = String((it.meta.ch.data.labels || [])[w[1]] || '');
    return /\d{4}|\d{1,2}\/\d{1,2}|Q\d/.test(l) ? l : it.meta.last;
  }
  function firstLab(it) {
    const w = winOf(it) || curWin(it.meta.ch); const l = String((it.meta.ch.data.labels || [])[w[0]] || '');
    return tdates(it.meta.ch) ? l : '';
  }
  const uniq = a => [...new Set(a.filter(Boolean))];
  function srcAll() {   // gộp nguồn của các chart, bỏ trùng
    const parts = t => { const o = []; let d = 0, cur = ''; for (const ch of t) { if (ch === '(') d++; if (ch === ')') d = Math.max(0, d - 1); if (!d && (ch === ';' || ch === '·')) { o.push(cur.trim()); cur = ''; } else cur += ch; } o.push(cur.trim()); return o; };   // tách theo ; · ngoài ngoặc
    return uniq(st.items.flatMap(it => parts(it.meta.src)).filter(x => !/cập nhật|^\d/i.test(x))).join('; ') || 'FinSuccess tổng hợp';
  }
  function cols(n) {
    if (st.lay !== 'auto') return Math.min(+st.lay, n);
    if (st.fmt === 'tall') return n <= 3 ? 1 : 2;
    return n === 1 ? 1 : n === 2 || n === 4 ? 2 : 3;
  }
  function compose() {
    const m = first(), n = st.items.length, F = FMT[st.fmt], W = F.w, H = F.h, k = W / 1600 * (st.fmt === 'tall' ? 1.25 : 1);
    const cvs = document.createElement('canvas'); cvs.width = W; cvs.height = H; const x = cvs.getContext('2d');
    const P = Math.round(48 * k), font = (wt, px) => `${wt} ${Math.round(px * k)}px Arial, sans-serif`;
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.fillStyle = FIN.navy; x.fillRect(0, 0, W, Math.round(8 * k));
    let y = Math.round(30 * k); const lh = Math.round(46 * k);
    if (logo) { const lw = logo.width / logo.height * lh; x.drawImage(logo, P, y, lw, lh); }
    x.font = font('700', 17); x.fillStyle = FIN.grey; x.textAlign = 'right'; x.textBaseline = 'middle'; x.fillText(m.page, W - P, y + lh / 2); x.textAlign = 'left';
    y += lh + Math.round(16 * k); x.fillStyle = FIN.line; x.fillRect(P, y, W - 2 * P, 2); y += Math.round(26 * k);
    x.textBaseline = 'top';
    if (n === 1) {
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
      const note = st.items[0].note;
      if (note) { y += Math.round(4 * k); x.fillStyle = FIN.purple; x.font = font('700', 19); wrap(x, note, W - 2 * P, 2).forEach(l => { x.fillText(l, P, y); y += Math.round(25 * k); }); }
    } else if (st.key) {
      x.fillStyle = FIN.navy; x.font = font('700', 34);
      wrap(x, st.key, W - 2 * P, 3).forEach(l => { x.fillText(l, P, y); y += Math.round(42 * k); });
    }
    y += Math.round(10 * k);
    x.font = font('400', 16);
    const foot = wrap(x, (n === 1 && lastLab(st.items[0]) ? 'Kỳ dữ liệu: ' + lastLab(st.items[0]) + ' · ' : '') + 'Nguồn: ' + (n === 1 ? m.src : srcAll()), W - 2 * P - Math.round(260 * k), n === 1 ? 2 : 3);
    const fh = foot.length * Math.round(22 * k) + Math.round(34 * k), cy1 = H - fh;
    if (n === 1) snap(x, m.ch, P, y, W - 2 * P, cy1 - y, st.fmt === 'tall' ? 1.3 : 1.6, winOf(st.items[0]));
    else {   // lưới chart: mỗi ô có tên chart, nhận định ngắn (nếu có), mô tả và kỳ dữ liệu
      const C = cols(n), R = Math.ceil(n / C), g = Math.round(28 * k), gy = Math.round(22 * k);
      const cw = (W - 2 * P - (C - 1) * g) / C, chh = (cy1 - Math.round(12 * k) - y - (R - 1) * gy) / R;
      const small = cw < 520 * k;
      st.items.forEach((it, i) => {
        const r = Math.floor(i / C), c = i % C, inRow = Math.min(C, n - r * C), off = (C - inRow) * (cw + g) / 2;   // hàng cuối thiếu ô thì căn giữa
        const X = P + off + c * (cw + g), Y = y + r * (chh + gy); let yy = Y; const mm = it.meta;
        x.fillStyle = FIN.navy; x.font = font('700', small ? 17 : 20);
        x.fillStyle = FIN.navy; wrap(x, `${i + 1}. ${mm.title}`, cw, 2).forEach(l => { x.fillText(l, X, yy); yy += Math.round((small ? 21 : 25) * k); });
        if (it.note) { x.fillStyle = FIN.purple; x.font = font('700', small ? 15 : 16.5); wrap(x, it.note, cw, 2).forEach(l => { x.fillText(l, X, yy); yy += Math.round((small ? 19 : 21) * k); }); }
        const f0 = firstLab(it), l1 = lastLab(it);
        const sub = [mm.sub, l1 ? (f0 && f0 !== l1 ? f0 + ' – ' + l1 : 'đến ' + l1) : ''].filter(Boolean).join(' · ');
        if (sub) { x.fillStyle = FIN.grey; x.font = font('400', small ? 12.5 : 13.5); wrap(x, sub, cw, 1).forEach(l => { x.fillText(l, X, yy); yy += Math.round(18 * k); }); }
        yy += Math.round(4 * k);
        const hh = Y + chh - yy; if (hh > 40) snap(x, mm.ch, X, yy, cw, hh, Math.max(1, Math.min(1.5, cw / 640)), winOf(it));
        if (c < inRow - 1) { x.fillStyle = FIN.line; x.fillRect(X + cw + g / 2, Y, 1, chh); }
      });
    }
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
      <div class="fss-lab">CHART TRONG ẢNH <small>tối đa ${MAXN} · nhận định ngắn hiện ngay dưới tên chart</small></div>
      <ol class="fss-items"></ol>
      <div class="fss-row"><button type="button" data-act="add">＋ Thêm chart</button><select class="fss-lay" aria-label="Bố cục">${LAY.map(([k, l]) => `<option value="${k}">Bố cục: ${l}</option>`).join('')}</select></div>
      <label class="fss-rng">Khung thời gian chung <select class="fss-rg">${RNG.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
      <label class="fss-lab">THÔNG ĐIỆP CHÍNH <small>tuỳ chọn · thành tiêu đề lớn trên ảnh, tên chart thu nhỏ màu xám</small><textarea class="fss-key" rows="2" placeholder="VD: Lợi suất TPCP tăng ở mọi kỳ hạn, kỳ hạn ngắn tăng mạnh nhất so với đầu năm"></textarea></label>
      <label class="fss-lab">CAPTION<textarea class="fss-cap" rows="7"></textarea></label>
      <button type="button" class="fss-main" data-act="share">⇪ Chia sẻ…</button>
      <div class="fss-row"><button type="button" data-act="dl">Tải ảnh</button><button type="button" data-act="copy">Chép ảnh</button></div>
      <button type="button" data-act="cap" class="fss-capbtn">Chép caption</button>
      <p class="fss-msg" aria-live="polite"></p>
      <p class="fss-note">Trên điện thoại, nút Chia sẻ mở thẳng Zalo, Telegram, Facebook, X… Caption được chép sẵn — dán vào bài đăng.</p></div></div></div>
    <div class="fss-pick" hidden><div class="fss-pbox">
      <div class="fss-hd"><b>Chọn chart để ghép</b><button type="button" class="fss-px" aria-label="Đóng">×</button></div>
      <div class="fss-pf"><select class="fss-pg" aria-label="Lọc theo tab"></select><input class="fss-pq" type="search" placeholder="Tìm theo tên chart: lợi suất, CPI, OMO…" aria-label="Tìm chart"></div>
      <div class="fss-pchips"></div>
      <ul class="fss-plist"></ul>
      <div class="fss-pfoot"><span class="fss-pn"></span><button type="button" class="fss-main fss-pok">Xong</button></div></div></div>
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
  function caption() {
    const m = first(), n = st.items.length, url = 'Xem đầy đủ: ' + location.href.split('?')[0].split('#')[0];
    if (n === 1) return [...(st.key ? [st.key, ''] : []), ...(st.items[0].note ? [st.items[0].note, ''] : []), m.page, '', m.title + (m.sub ? ' (' + m.sub + ')' : ''), m.ins ? '\n' + m.ins : '', '', (m.last ? 'Kỳ dữ liệu: ' + m.last + '\n' : '') + 'Nguồn: ' + m.src, url].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
    return [...(st.key ? [st.key, ''] : []), m.page, '', ...st.items.map((it, i) => `${i + 1}. ${it.meta.title}${lastLab(it) ? ' (đến ' + lastLab(it) + ')' : ''}${it.note ? '\n' + it.note : ''}`), '', 'Nguồn: ' + srcAll(), url].join('\n');
  }
  function setItems(cards, keepNotes) {
    const old = new Map(st.items.map(it => [it.card, it.note]));
    const before = st.items.map(it => it.card).join();
    const oldR = new Map(st.items.map(it => [it.card, it.rng]));
    st.items = cards.filter(c => document.body.contains(c)).slice(0, MAXN).map(c => ({ card: c, meta: meta(c), note: keepNotes ? old.get(c) || '' : '', rng: keepNotes ? oldR.get(c) || '' : '' }));
    if (st.shapes.length && before !== st.items.map(it => it.card).join()) { st.shapes = []; msg('Bố cục thay đổi nên hình vẽ đã được xoá.'); }
  }
  function drawItems() {
    const ol = M.querySelector('.fss-items'), n = st.items.length;
    ol.innerHTML = st.items.map((it, i) => `<li><div class="fss-it"><span class="fss-in">${i + 1}</span><span class="fss-tt" title="${esc(it.meta.path.join(' › '))}">${esc(it.meta.title)}</span>
      <button type="button" data-mv="-1" data-i="${i}" title="Lên" ${i ? '' : 'disabled'}>↑</button><button type="button" data-mv="1" data-i="${i}" title="Xuống" ${i < n - 1 ? '' : 'disabled'}>↓</button><button type="button" data-rm="${i}" title="Bỏ chart này" ${n > 1 ? '' : 'disabled'}>×</button></div>
      <div class="fss-ir"><input class="fss-inote" data-i="${i}" value="${esc(it.note)}" placeholder="Nhận định ngắn cho chart này (tuỳ chọn)">${tdates(it.meta.ch) ? `<select class="fss-irg" data-i="${i}" title="Khung thời gian của chart này"><option value="">Theo khung chung</option>${RNG.filter(r => r[0] !== 'match').map(([k, l]) => `<option value="${k}"${it.rng === k ? ' selected' : ''}>${l}</option>`).join('')}</select>` : ''}</div></li>`).join('');
    M.querySelector('.fss-lay').hidden = n < 2; M.querySelector('.fss-lay').value = st.lay;
    M.querySelector('.fss-rg').value = st.rng;
  }
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function refresh() { drawItems(); M.querySelector('.fss-cap').value = caption(); build(); }
  function open(cards) {
    st.shapes = []; st.base = null; st.key = ''; st.rng = 'cur'; M.querySelector('.fss-key').value = ''; st.tool = 'arrow'; st.color = 'navy'; st.picked = false; msg('');
    setItems(cards, false); if (!st.items.length) return;
    M.hidden = false; document.body.classList.add('fss-open'); syncUi(); refresh();
  }
  function close() { M.hidden = true; PK.hidden = true; document.body.classList.remove('fss-open'); M.querySelector('.fss-txt').hidden = true; }
  const blob = () => new Promise(r => finalCanvas().toBlob(r, 'image/png'));
  const fname = () => 'FinSuccess_' + plain(st.key && st.items.length > 1 ? st.key : first().title).replace(/[^\w\- ]+/g, '').trim().slice(0, 60) + '_' + new Date().toLocaleDateString('vi-VN').replace(/\//g, '-') + '.png';
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
      if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], text: cap, title: st.key || first().title }); msg('Đã mở chia sẻ · caption đã chép sẵn.'); } catch (e) { if (e.name !== 'AbortError') msg('Không mở được chia sẻ. Hãy dùng Tải ảnh.'); } }
      else msg('Trình duyệt này chưa hỗ trợ chia sẻ trực tiếp — hãy dùng Tải ảnh hoặc Chép ảnh. Caption đã chép sẵn.');
    }
  }
  M.addEventListener('click', e => {
    if (e.target === M || e.target.closest('.fss-x')) return close();
    const t = e.target.closest('[data-tool]'); if (t) { st.tool = t.dataset.tool; if (!st.picked) st.color = st.tool === 'hl' ? 'gold' : 'navy'; return syncUi(); }
    const c = e.target.closest('[data-c]'); if (c) { st.color = c.dataset.c; st.picked = true; return syncUi(); }
    const f = e.target.closest('[data-fmt]'); if (f && f.dataset.fmt !== st.fmt) { st.fmt = f.dataset.fmt; syncUi(); return build(); }
    const mv = e.target.closest('[data-mv]'); if (mv) { const i = +mv.dataset.i, j = i + +mv.dataset.mv, a = st.items; [a[i], a[j]] = [a[j], a[i]]; if (st.shapes.length) { st.shapes = []; msg('Bố cục thay đổi nên hình vẽ đã được xoá.'); } return refresh(); }
    const rm = e.target.closest('[data-rm]'); if (rm) { setItems(st.items.filter((_, i) => i !== +rm.dataset.rm).map(it => it.card), true); return refresh(); }
    const a = e.target.closest('[data-act]'); if (a) { if (a.dataset.act === 'add') return openPick(); act(a.dataset.act); }
  });
  M.querySelector('.fss-rg').addEventListener('change', e => { st.rng = e.target.value; st.items.forEach(it => { it.rng = ''; }); drawItems(); M.querySelector('.fss-cap').value = caption(); build(); });
  M.querySelector('.fss-items').addEventListener('change', e => { const t = e.target.closest('.fss-irg'); if (!t) return; st.items[+t.dataset.i].rng = t.value; M.querySelector('.fss-cap').value = caption(); build(); });
  M.querySelector('.fss-lay').addEventListener('change', e => { st.lay = e.target.value; if (st.shapes.length) { st.shapes = []; msg('Bố cục thay đổi nên hình vẽ đã được xoá.'); } build(); });
  let noteT = null;
  M.querySelector('.fss-items').addEventListener('input', e => { const t = e.target.closest('.fss-inote'); if (!t) return; st.items[+t.dataset.i].note = t.value.trim(); clearTimeout(noteT); noteT = setTimeout(() => { M.querySelector('.fss-cap').value = caption(); build(); }, 450); });

  /* ---------- chọn chart: lọc theo tab, tìm theo tên, "đang xem" ---------- */
  const PK = M.querySelector('.fss-pick'), pf = { g: '', q: '', sel: [] };
  let pool = [];
  function listCards() {
    try { if (window.FSSHARE && FSSHARE.prep) FSSHARE.prep(); } catch (e) {}
    const seen = new Set();
    return [...document.querySelectorAll('article.card')].filter(c => {
      if (c.closest('#book') || c.closest('.fss-modal')) return false;
      const cv = [...c.querySelectorAll('canvas')].find(x => window.Chart && Chart.getChart(x)); if (!cv || seen.has(cv.id || cv)) return false;
      seen.add(cv.id || cv); return true;
    }).map(c => { const m = meta(c); return { c, m, top: m.path[0] || '', g: m.path.join(' › '), s: (m.title + ' ' + m.sub + ' ' + m.path.join(' ')).toLowerCase(), vis: c.offsetParent !== null }; });
  }
  function openPick() {
    PK.hidden = false; M.querySelector('.fss-plist').innerHTML = '<li class="fss-pe">Đang nạp chart…</li>';
    setTimeout(() => {
      pool = listCards(); pf.sel = st.items.map(it => it.card); pf.q = ''; M.querySelector('.fss-pq').value = '';
      const curG = (pool.find(p => p.c === st.items[0].card) || {}).g || '';
      pf.g = curG;
      const tops = [...new Set(pool.map(p => p.top))];
      M.querySelector('.fss-pg').innerHTML = `<option value="">Mọi tab (${pool.length} chart)</option><option value="@vis">Đang xem trên màn hình</option>` + tops.map(t => {
        const gs = [...new Set(pool.filter(p => p.top === t).map(p => p.g))];
        return `<optgroup label="${esc(t)}">${gs.length > 1 ? `<option value="@${esc(t)}">${esc(t)} — tất cả (${pool.filter(p => p.top === t).length})</option>` : ''}${gs.map(g => `<option value="${esc(g)}">${esc(g === t ? t : g.slice(t.length + 3))} (${pool.filter(p => p.g === g).length})</option>`).join('')}</optgroup>`;
      }).join('');
      M.querySelector('.fss-pg').value = pf.g; drawPick(); M.querySelector('.fss-pq').focus();
    }, 30);
  }
  function drawPick() {
    const vis = pool.filter(p => (!pf.g || (pf.g === '@vis' ? p.vis : pf.g[0] === '@' ? p.top === pf.g.slice(1) : p.g === pf.g)) && (!pf.q || pf.q.split(/\s+/).every(w => p.s.includes(w))));
    M.querySelector('.fss-pchips').innerHTML = pf.sel.map((c, i) => { const p = pool.find(x => x.c === c); return p ? `<button type="button" data-un="${i}">${i + 1}. ${esc(p.m.title.slice(0, 48))} ×</button>` : ''; }).join('');
    M.querySelector('.fss-plist').innerHTML = vis.length ? vis.map(p => { const i = pf.sel.indexOf(p.c); return `<li><label class="${i >= 0 ? 'on' : ''}"><input type="checkbox" data-k="${pool.indexOf(p)}" ${i >= 0 ? 'checked' : ''}><span><b>${esc(p.m.title)}</b><small>${esc(p.g)}${p.m.sub ? ' · ' + esc(p.m.sub.slice(0, 90)) : ''}</small></span>${i >= 0 ? `<em>${i + 1}</em>` : ''}</label></li>`; }).join('') : '<li class="fss-pe">Không có chart khớp bộ lọc.</li>';
    M.querySelector('.fss-pn').textContent = `Đã chọn ${pf.sel.length}/${MAXN}`;
  }
  PK.addEventListener('change', e => {
    if (e.target.matches('.fss-pg')) { pf.g = e.target.value; return drawPick(); }
    const k = e.target.dataset.k; if (k == null) return; const c = pool[+k].c, i = pf.sel.indexOf(c);
    if (i >= 0) pf.sel.splice(i, 1); else if (pf.sel.length >= MAXN) { e.target.checked = false; M.querySelector('.fss-pn').textContent = `Tối đa ${MAXN} chart`; return; } else pf.sel.push(c);
    drawPick();
  });
  M.querySelector('.fss-pq').addEventListener('input', e => { pf.q = e.target.value.trim().toLowerCase(); drawPick(); });
  PK.addEventListener('click', e => {
    if (e.target === PK || e.target.closest('.fss-px')) { PK.hidden = true; return; }
    const u = e.target.closest('[data-un]'); if (u) { pf.sel.splice(+u.dataset.un, 1); return drawPick(); }
    if (e.target.closest('.fss-pok')) { PK.hidden = true; if (pf.sel.length) { setItems(pf.sel, true); refresh(); } }
  });
  let keyT = null;
  M.querySelector('.fss-key').addEventListener('input', e => { clearTimeout(keyT); keyT = setTimeout(() => { st.key = e.target.value.trim(); M.querySelector('.fss-cap').value = caption(); build(); }, 450); });
  document.addEventListener('keydown', e => { if (M.hidden) return; if (e.key === 'Escape' && M.querySelector('.fss-txt').hidden) { if (!PK.hidden) PK.hidden = true; else close(); } if ((e.ctrlKey || e.metaKey) && e.key === 'z' && document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); act('undo'); } });
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
