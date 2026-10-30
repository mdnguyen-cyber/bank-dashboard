/* Chia sẻ ảnh chart: ghép ảnh có thương hiệu (16:9 hoặc 4:5) từ 1 hoặc nhiều chart (tối đa 6), vẽ chú thích (mũi tên, khung, vòng — nét liền
   hoặc nét đứt; tô sáng chữ nhật/elip nằm sau chart; chữ), chọn lại hình đã vẽ để kéo, đổi cỡ, đổi màu, xóa; "Chỉnh chart" mở to từng chart đúng
   tỷ lệ trong ảnh để đổi khung thời gian, Cột/Đường; rồi Chia sẻ / Tải ảnh / Chép ảnh / Chép caption. Nút "⤢ Phóng to" trên từng thẻ chart.
   Chọn nhiều chart: nút "＋ Ghép" trên từng thẻ (giỏ chart ở góc dưới) hoặc "＋ Thêm chart" trong hộp thoại (lọc theo tab, tìm theo tên).
   Trang có thể khai báo window.FSSHARE = { prep() — dựng các tab ẩn để có đủ chart, path(card) — [tab, tab con] }. */
(function () {
  const FIN = { navy: '#1D2678', purple: '#861C52', gold: '#FFD45D', red: '#c0392b', teal: '#59C5C8', ink: '#1f2433', grey: '#6b7385', line: '#e3e6ee' };
  const SW = [['navy', 'Xanh FinSuccess'], ['purple', 'Đỏ mận'], ['gold', 'Vàng'], ['red', 'Đỏ'], ['teal', 'Xanh ngọc']];
  const TOOLS = [['none', '↖', 'Chọn'], ['arrow', '➝', 'Mũi tên'], ['hl', '▬', 'Tô sáng'], ['hle', '⬬', 'Tô sáng elip'], ['box', '▢', 'Khung'], ['ring', '◯', 'Khoanh tròn'], ['text', 'T', 'Chữ']];
  const BACK = t => t === 'hl' || t === 'hle';   // tô sáng: khối màu trong suốt nằm SAU đường/cột của chart
  const DASHABLE = t => t === 'arrow' || t === 'box' || t === 'ring';
  const FMT = { wide: { w: 1600, h: 900, t: 'Ngang 16:9', s: 'X · Telegram · Zalo' }, tall: { w: 1080, h: 1350, t: 'Dọc 4:5', s: 'Facebook · Instagram' } };
  const MAXN = 6, LAY = [['auto', 'Tự động'], ['1', '1 cột'], ['2', '2 cột'], ['3', '3 cột']];
  const RNG = [['cur', 'Như trên chart'], ['match', 'Khớp chart ngắn nhất'], ['1', '1M'], ['3', '3M'], ['6', '6M'], ['ytd', 'YTD'], ['12', '1Y'], ['36', '3Y'], ['60', '5Y'], ['0', 'Tất cả']];
  const st = { items: [], fmt: 'wide', lay: 'auto', rng: 'cur', base: null, fg: null, cells: [], shapes: [], tool: 'arrow', color: 'navy', dash: false, picked: false, drag: null, sel: -1, hist: [], hover: -1, key: '' };
  const basket = [];   // thẻ chart đã bấm "＋ Ghép"
  const first = () => st.items[0] && st.items[0].meta;
  let logo = null; { const im = new Image(); im.onload = () => { logo = im; }; im.src = 'assets/fin-success-logo.png'; }

  /* ---------- nút trên từng thẻ chart ---------- */
  function addButtons() {
    document.querySelectorAll('article.card').forEach(c => {
      if (c.querySelector(':scope > .ibar .sharepill, :scope > .sharerow')) return;
      const cv = [...c.querySelectorAll('canvas')].find(x => window.Chart && Chart.getChart(x));
      const tbls = window.FSTbl && !c.querySelector('.tbl-btns') ? [...c.querySelectorAll('table')].filter(t => t.rows.length > 1 && !t.closest('.fss-modal')) : [];
      if (!cv && !tbls.length) return;
      let row = c.querySelector(':scope > .ibar');
      if (!row) { row = document.createElement('div'); row.className = 'ibar sharerow'; c.appendChild(row); }
      tbls.forEach((t, i) => {   // ảnh bảng: chỉ lấy bảng (phần đang hiện), mở hộp chia sẻ như chart
        const sc = t.closest('.tscroll') || t.parentElement, p = sc.previousElementSibling, own = p && p.matches('p.chart-sub') && p.querySelector('b') ? txt(p.querySelector('b')) : '';
        const tb = document.createElement('button'); tb.type = 'button'; tb.className = 'sharepill fss-tbl'; tb.textContent = tbls.length > 1 ? `▦ Ảnh bảng ${i + 1}` : '▦ Ảnh bảng'; tb.title = own || 'Xuất ảnh riêng bảng này';
        tb.onclick = e => { e.stopPropagation(); if (mxs) maxClose(false); const h = c.querySelector(':scope > h3.sub'); let title = 'Bảng số liệu'; if (h) { const k = h.cloneNode(true); k.querySelectorAll('.grip,button,.ctl,select,input,.info').forEach(x => x.remove()); title = txt(k) || title; }
          FSTbl.share(sc, { title: own || title, sub: own ? title : '', src: txt(c.querySelector(':scope > .src')).replace(/^Nguồn:\s*/i, ''), file: 'FinSuccess_' + plain(own || title).replace(/[^\w\- ]+/g, '').trim().slice(0, 60) }); };
        row.appendChild(tb);
      });
      if (cv) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'sharepill'; b.innerHTML = '⇪ Chia sẻ ảnh'; b.title = 'Chia sẻ ảnh chart này';
        b.onclick = e => { e.stopPropagation(); if (mxs) maxClose(false); open([c]); };
        const z = document.createElement('button'); z.type = 'button'; z.className = 'sharepill fsx-zoom'; z.textContent = '⤢'; z.title = 'Phóng to'; z.setAttribute('aria-label', 'Phóng to');
        z.onclick = e => { e.stopPropagation(); maxOpen(c); };
        const g = document.createElement('button'); g.type = 'button'; g.className = 'sharepill fss-add'; g.textContent = '＋ Ghép'; g.title = 'Chọn chart này để ghép nhiều chart vào một ảnh';
        g.onclick = e => { e.stopPropagation(); toggleBasket(c); };
        row.appendChild(g); row.appendChild(b); row.appendChild(z);
      }
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
  const tdates = ch => ch && (window.FSK && FSK.dates && (ch.data.labels || []).length >= 6) ? FSK.dates(ch.data.labels) : null;
  const curWin = ch => { if (!ch) return [0, 0]; const x = (ch.options.scales && ch.options.scales.x) || {}, n = (ch.data.labels || []).length; return [typeof x.min === 'number' ? x.min : 0, typeof x.max === 'number' ? x.max : n - 1]; };
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
  function put(x, mm, X, Y, w, h, zs, win) {   // chart: vẽ lại độ phân giải cao; bảng (ảnh dựng sẵn): đặt vừa khung, giữ tỉ lệ
    if (!mm.img) return snap(x, mm.ch, X, Y, w, h, zs, win);
    let im = mm.img; const r0 = Math.min(1.4, w / im.width);
    if (mm.re && im.width * r0 < w * 0.8) {}   // bảng hẹp hơn ô: giữ nguyên
    else if (mm.re) {   // dựng lại bảng theo bề rộng ô (chữ phóng ~1,3 lần, ô tự xuống dòng) để đọc được khi ghép cạnh chart
      // thử vài bề rộng dựng bảng, chọn bản cho chữ to nhất khi vừa ô (bảng hẹp quá thì cao quá, bị giới hạn theo chiều cao)
      let best = im, bs = Math.min(w / im.width, h / im.height);
      [1.5, 1.3, 1.12, 0.95, 0.8].forEach(f => { const fw = Math.round(w / zs / f / 10) * 10; if (fw >= mm.img.width / 2 - 20) return;
        const key = 'f' + fw; let c = null; try { c = mm.rc[key] || (mm.rc[key] = mm.re(1, fw)); } catch (e) {}
        if (c) { const sc = Math.min(w / c.width, h / c.height); if (sc > bs * 1.03) { best = c; bs = sc; } } });
      im = best;
    }
    { const r1 = Math.min(1.4, w / im.width);
      if (mm.re && im.height * r1 < h * 0.97) {   // bảng thấp hơn ô: dòng cao hơn (chữ giữ cỡ) cho kín ô
        const kk = Math.min(2.2, Math.round(h / (im.height * r1) * 20) / 20), fw = im._fw || 0, key = (fw ? 'f' + fw : '') + 'k' + kk;
        try { im = mm.rc[key] || (mm.rc[key] = mm.re(kk, fw || undefined)) || im; } catch (e) {} } }
    const r = Math.min(w / im.width, h / im.height, 1.4), dw = im.width * r, dh = im.height * r;
    x.imageSmoothingQuality = 'high'; x.drawImage(im, X + (w - dw) / 2, Y + Math.max(0, (h - dh) / 2) * 0.35, dw, dh);
  }
  function lastLab(it) {   // kỳ dữ liệu cuối theo khung sẽ vẽ
    if (!it.meta.ch) return it.meta.last; const w = winOf(it); if (!w) return it.meta.last; const l = String((it.meta.ch.data.labels || [])[w[1]] || '');
    return /\d{4}|\d{1,2}\/\d{1,2}|Q\d/.test(l) ? l : it.meta.last;
  }
  function firstLab(it) {
    if (!it.meta.ch) return ''; const w = winOf(it) || curWin(it.meta.ch); const l = String((it.meta.ch.data.labels || [])[w[0]] || '');
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
    const fgc = document.createElement('canvas'); fgc.width = W; fgc.height = H; const xf = fgc.getContext('2d'), cells = [];   // lớp chart riêng (nền trong suốt) để tô sáng nằm sau chart
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
      } else if (st.items[0].note) {   // nhận định ngắn lên trên (navy, lớn), tên chart xuống dưới (đỏ mận, nhỏ)
        x.fillStyle = FIN.navy; x.font = font('700', 34);
        wrap(x, st.items[0].note, W - 2 * P, 2).forEach(l => { x.fillText(l, P, y); y += Math.round(42 * k); });
        x.fillStyle = FIN.purple; x.font = font('700', 19); wrap(x, m.title, W - 2 * P, 2).forEach(l => { x.fillText(l, P, y); y += Math.round(25 * k); });
        if (m.sub) { x.fillStyle = FIN.grey; x.font = font('400', 16); wrap(x, m.sub, W - 2 * P, 2).forEach(l => { x.fillText(l, P, y); y += Math.round(21 * k); }); }
      } else {
        x.fillStyle = FIN.navy; x.font = font('700', 34);
        wrap(x, m.title, W - 2 * P, 2).forEach(l => { x.fillText(l, P, y); y += Math.round(42 * k); });
        if (m.sub) { x.fillStyle = FIN.grey; x.font = font('400', 18); wrap(x, m.sub, W - 2 * P, 2).forEach(l => { x.fillText(l, P, y); y += Math.round(24 * k); }); }
      }
      const note = st.key ? st.items[0].note : '';   // có thông điệp chính thì nhận định ngắn vẫn là dòng đỏ mận bên dưới
      if (note) { y += Math.round(4 * k); x.fillStyle = FIN.purple; x.font = font('700', 19); wrap(x, note, W - 2 * P, 2).forEach(l => { x.fillText(l, P, y); y += Math.round(25 * k); }); }
    } else if (st.key) {
      x.fillStyle = FIN.navy; x.font = font('700', 34);
      wrap(x, st.key, W - 2 * P, 3).forEach(l => { x.fillText(l, P, y); y += Math.round(42 * k); });
    }
    y += Math.round(10 * k);
    x.font = font('400', 16);
    const foot = wrap(x, (n === 1 && lastLab(st.items[0]) ? 'Kỳ dữ liệu: ' + lastLab(st.items[0]) + ' · ' : '') + 'Nguồn: ' + (n === 1 ? m.src : srcAll()), W - 2 * P - Math.round(260 * k), n === 1 ? 2 : 3);
    const fh = foot.length * Math.round(22 * k) + Math.round(34 * k), cy1 = H - fh;
    if (n === 1) { const zs = st.fmt === 'tall' ? 1.3 : 1.6; cells.push({ i: 0, X: P, Y: y, w: W - 2 * P, h: cy1 - y, zs }); put(xf, m, P, y, W - 2 * P, cy1 - y, zs, winOf(st.items[0])); }
    else {   // lưới chart: mỗi ô có tên chart, nhận định ngắn (nếu có), mô tả và kỳ dữ liệu
      const g = Math.round(28 * k), gy = Math.round(22 * k);
      const cell = (it, i, X, Y, cw, chh, draw = true) => {   // vẽ đầu ô; trả chiều cao đầu ô (draw=false: chỉ đo)
        const small = cw < 520 * k, mm = it.meta; let yy = Y;
        const top = it.note ? it.note : mm.title, low = it.note ? mm.title : '';   // có nhận định: nhận định lên trên (navy, lớn), tên chart xuống dưới (đỏ mận, nhỏ)
        x.fillStyle = FIN.navy; x.font = font('700', small ? 17 : 20); wrap(x, `${i + 1}. ${top}`, cw, 2).forEach(l => { if (draw) x.fillText(l, X, yy); yy += Math.round((small ? 21 : 25) * k); });
        if (low) { x.fillStyle = FIN.purple; x.font = font('700', small ? 15 : 16.5); wrap(x, low, cw, 2).forEach(l => { if (draw) x.fillText(l, X, yy); yy += Math.round((small ? 19 : 21) * k); }); }
        const f0 = firstLab(it), l1 = lastLab(it);
        const sub = [mm.sub, l1 ? (f0 && f0 !== l1 ? f0 + ' – ' + l1 : 'đến ' + l1) : ''].filter(Boolean).join(' · ');
        if (sub) { x.fillStyle = FIN.grey; x.font = font('400', small ? 12.5 : 13.5); wrap(x, sub, cw, 1).forEach(l => { if (draw) x.fillText(l, X, yy); yy += Math.round(18 * k); }); }
        yy += Math.round(4 * k);
        if (draw) { const hh = Y + chh - yy, zs = Math.max(1, Math.min(1.5, cw / 640)); if (hh > 40) { cells.push({ i, X, Y: yy, w: cw, h: hh, zs }); put(xf, mm, X, yy, cw, hh, zs, winOf(it)); } }
        return yy - Y;
      };
      const H0 = cy1 - Math.round(12 * k) - y, FW = W - 2 * P;
      const hasT = st.items.some(it => it.meta.img);
      if (st.lay === 'auto' && hasT && st.fmt === 'wide' && n <= 3) {
        // ngang 16:9: một hàng; bảng được ô rộng hơn theo tỷ lệ của bảng để bảng cao gần kín ô, chart chia phần còn lại
        const wt = st.items.map(it => it.meta.img ? Math.max(1, Math.min(2.2, it.meta.img.width * 0.7 / (FW / n))) : 1);   // bảng rộng hơn để chữ đủ đọc
        const sw = wt.reduce((a, b) => a + b, 0), avail = FW - (n - 1) * g; let X = P;
        st.items.forEach((it, i) => { const cw = avail * wt[i] / sw; cell(it, i, X, y, cw, H0); if (i < n - 1) { x.fillStyle = FIN.line; x.fillRect(X + cw + g / 2, y, 1, H0); } X += cw + g; });
      } else if (st.lay === 'auto' && hasT) {
        // có bảng: mỗi bảng một hàng rộng hết khung, cao vừa đủ bảng; các chart chia phần còn lại → ảnh luôn kín khung
        const rows = []; st.items.forEach((it, i) => { if (it.meta.img) rows.push({ t: 1, ids: [i] }); else { const l = rows[rows.length - 1]; if (l && !l.t && l.ids.length < (st.fmt === 'tall' ? 2 : 3)) l.ids.push(i); else rows.push({ t: 0, ids: [i] }); } });
        const nC = rows.filter(r => !r.t).length, gaps = (rows.length - 1) * gy;
        rows.forEach(r => { if (r.t) { const it = st.items[r.ids[0]], im = it.meta.img; r.need = cell(it, r.ids[0], P, 0, FW, 0, false) + im.height * Math.min(1.4, FW / im.width); } });
        const tNeed = rows.filter(r => r.t).reduce((a, r) => a + r.need, 0), cap = nC ? (H0 - gaps) * 0.58 : H0 - gaps, f = tNeed > cap ? cap / tNeed : 1;
        const cH = nC ? (H0 - gaps - tNeed * f) / nC : 0;
        if (!nC && f === 1) { const sp = (H0 - gaps - tNeed) / rows.length; rows.forEach(r => { r.need += sp; }); }   // chỉ có bảng: giãn đều cho kín khung
        let Y = y;
        rows.forEach(r => {
          const h = r.t ? r.need * f : cH, C = r.ids.length, cw = (FW - (C - 1) * g) / C;
          r.ids.forEach((i, c) => { const X = P + c * (cw + g); cell(st.items[i], i, X, Y, cw, h); if (c < C - 1) { x.fillStyle = FIN.line; x.fillRect(X + cw + g / 2, Y, 1, h); } });
          Y += h + gy;
        });
      } else {
        const C = cols(n), R = Math.ceil(n / C), cw = (FW - (C - 1) * g) / C, chh = (H0 - (R - 1) * gy) / R;
        st.items.forEach((it, i) => {
          const r = Math.floor(i / C), c = i % C, inRow = Math.min(C, n - r * C), off = (C - inRow) * (cw + g) / 2;   // hàng cuối thiếu ô thì căn giữa
          const X = P + off + c * (cw + g), Y = y + r * (chh + gy);
          cell(it, i, X, Y, cw, chh);
          if (c < inRow - 1) { x.fillStyle = FIN.line; x.fillRect(X + cw + g / 2, Y, 1, chh); }
        });
      }
    }
    x.fillStyle = FIN.line; x.fillRect(P, cy1, W - 2 * P, 1);
    let fy = cy1 + Math.round(14 * k); x.fillStyle = FIN.grey; x.font = font('400', 16);
    foot.forEach(l => { x.fillText(l, P, fy); fy += Math.round(22 * k); });
    x.textAlign = 'right'; x.fillStyle = FIN.navy; x.font = font('700', 16); x.fillText('FinSuccess Research', W - P, cy1 + Math.round(14 * k));
    x.fillStyle = FIN.grey; x.font = font('400', 13); x.fillText('Tổng hợp có sự hỗ trợ của AI', W - P, cy1 + Math.round(36 * k)); x.textAlign = 'left';
    return { bg: cvs, fg: fgc, cells };
  }

  /* ---------- vẽ chú thích ---------- */
  const col = (c, a) => { const h = FIN[c]; if (a == null) return h; const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
  function arrow(x, a, b, s, dash) {
    const ang = Math.atan2(b.y - a.y, b.x - a.x), hd = 9 * s + 10, ex = b.x - Math.cos(ang) * hd * 0.8, ey = b.y - Math.sin(ang) * hd * 0.8;
    x.setLineDash(dash ? [14 * s, 10 * s] : []); x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(ex, ey); x.stroke(); x.setLineDash([]);
    x.beginPath(); x.moveTo(b.x, b.y); x.lineTo(b.x - hd * Math.cos(ang - 0.42), b.y - hd * Math.sin(ang - 0.42)); x.lineTo(b.x - hd * Math.cos(ang + 0.42), b.y - hd * Math.sin(ang + 0.42)); x.closePath(); x.fill();
  }
  function rectOf(sh) { const a = sh.a, b = sh.b || sh.a; return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }; }
  function textBox(x, sh, W) {   // khung chữ (để vẽ và để chọn)
    const s = W / 1000 * 1.6, fs = Math.round(11 * s); x.font = `700 ${fs}px Arial, sans-serif`;
    const lines = sh.s.split('\n'), tw = Math.max(...lines.map(l => x.measureText(l).width)), pd = fs * 0.4;
    return { fs, lines, pd, x: sh.a.x - pd, y: sh.a.y - pd, w: tw + 2 * pd, h: lines.length * fs * 1.25 + pd * 1.6 };
  }
  function drawShape(x, sh, W) {
    const s = W / 1000 * 1.6; x.save(); x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = col(sh.c); x.fillStyle = col(sh.c); x.lineWidth = 2.5 * s;
    const a = sh.a, b = sh.b || sh.a, R = rectOf(sh), dash = sh.d || sh.t === 'darrow';
    if (sh.t === 'arrow' || sh.t === 'darrow') arrow(x, a, b, s, dash);
    else if (sh.t === 'hl') { x.fillStyle = col(sh.c, 0.16); x.fillRect(R.x, R.y, R.w, R.h); }
    else if (sh.t === 'hle') { x.fillStyle = col(sh.c, 0.16); x.beginPath(); x.ellipse(R.x + R.w / 2, R.y + R.h / 2, Math.max(R.w / 2, 1), Math.max(R.h / 2, 1), 0, 0, Math.PI * 2); x.fill(); }
    else if (sh.t === 'box') { x.setLineDash(dash ? [12 * s, 8 * s] : []); x.strokeRect(R.x, R.y, R.w, R.h); }
    else if (sh.t === 'ring') { x.setLineDash(dash ? [12 * s, 8 * s] : []); x.beginPath(); x.ellipse(R.x + R.w / 2, R.y + R.h / 2, Math.max(R.w / 2, 1), Math.max(R.h / 2, 1), 0, 0, Math.PI * 2); x.stroke(); }
    else if (sh.t === 'text') {
      const T = textBox(x, sh, W); x.textBaseline = 'top';
      x.fillStyle = 'rgba(255,255,255,0.92)'; x.fillRect(T.x, T.y, T.w, T.h);
      x.strokeStyle = col(sh.c); x.lineWidth = 1.5 * s; x.strokeRect(T.x, T.y, T.w, T.h);
      x.fillStyle = sh.c === 'gold' ? FIN.ink : col(sh.c); T.lines.forEach((l, i) => x.fillText(l, a.x, a.y + i * T.fs * 1.25));
    }
    x.restore();
  }
  /* ---------- chọn & sửa hình đã vẽ: kéo thân để di chuyển, kéo nút vuông để đổi cỡ/đầu mũi tên ---------- */
  const scl = () => { const cv = M.querySelector('.fss-cv'), r = cv.getBoundingClientRect(); return r.width ? cv.width / r.width : 1; };
  function handles(sh) {
    if (sh.t === 'text') return [];
    if (sh.t === 'arrow' || sh.t === 'darrow') return [{ k: 'a', x: sh.a.x, y: sh.a.y }, { k: 'b', x: sh.b.x, y: sh.b.y }];
    const a = sh.a, b = sh.b; return [{ k: 'a', x: a.x, y: a.y }, { k: 'ab', x: b.x, y: a.y }, { k: 'b', x: b.x, y: b.y }, { k: 'ba', x: a.x, y: b.y }];
  }
  function hitHandle(sh, p) { const t = 9 * scl(); return handles(sh).find(h => Math.abs(h.x - p.x) <= t && Math.abs(h.y - p.y) <= t) || null; }
  function hitShape(sh, p, inside) {   // inside = tính cả phần trong (khi hình đang được chọn)
    const t = 8 * scl(), x = M.querySelector('.fss-cv').getContext('2d');
    if (sh.t === 'arrow' || sh.t === 'darrow') { const a = sh.a, b = sh.b, dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L)); return Math.hypot(a.x + u * dx - p.x, a.y + u * dy - p.y) <= t * 1.3; }
    if (sh.t === 'text') { const T = textBox(x, sh, st.base.width); return p.x >= T.x && p.x <= T.x + T.w && p.y >= T.y && p.y <= T.y + T.h; }
    const R = rectOf(sh);
    if (sh.t === 'ring' || sh.t === 'hle') {
      const rx = Math.max(R.w / 2, 1), ry = Math.max(R.h / 2, 1), q = Math.hypot((p.x - R.x - rx) / rx, (p.y - R.y - ry) / ry);
      return inside ? q <= 1 + t / Math.min(rx, ry) : Math.abs(q - 1) * Math.min(rx, ry) <= t;
    }
    const inR = p.x >= R.x - t && p.x <= R.x + R.w + t && p.y >= R.y - t && p.y <= R.y + R.h + t;
    if (inside) return inR;
    return inR && !(p.x > R.x + t && p.x < R.x + R.w - t && p.y > R.y + t && p.y < R.y + R.h - t);   // chỉ viền: để vẫn vẽ được mũi tên vào trong vùng
  }
  function drawSel(x, sh) {
    const k = scl(), R = sh.t === 'text' ? textBox(x, sh, st.base.width) : rectOf(sh), pad = 6 * k;
    x.save(); x.strokeStyle = FIN.teal; x.lineWidth = 1.5 * k; x.setLineDash([5 * k, 4 * k]);
    if (sh.t !== 'arrow' && sh.t !== 'darrow') x.strokeRect(R.x - pad, R.y - pad, R.w + 2 * pad, R.h + 2 * pad);
    x.setLineDash([]); const hs = 5 * k;
    handles(sh).forEach(h => { x.fillStyle = '#fff'; x.strokeStyle = FIN.navy; x.lineWidth = 1.5 * k; x.fillRect(h.x - hs, h.y - hs, 2 * hs, 2 * hs); x.strokeRect(h.x - hs, h.y - hs, 2 * hs, 2 * hs); });
    x.restore();
  }
  function paint(x, preview) {   // nền → tô sáng → chart → hình vẽ khác
    const W = st.base.width, all = st.drag && !st.drag.move ? [...st.shapes, st.drag] : st.shapes;
    x.drawImage(st.base, 0, 0);
    all.forEach(s => { if (BACK(s.t)) drawShape(x, s, W); });
    if (st.fg) x.drawImage(st.fg, 0, 0);
    all.forEach(s => { if (!BACK(s.t)) drawShape(x, s, W); });
    if (!preview) return;
    const c = st.cells.find(c => c.i === st.hover);
    if (c && !st.drag) { const k = scl(); x.save(); x.strokeStyle = FIN.teal; x.lineWidth = 2 * k; x.setLineDash([8 * k, 5 * k]); x.strokeRect(c.X - 4 * k, c.Y - 4 * k, c.w + 8 * k, c.h + 8 * k); x.restore(); }
    if (st.shapes[st.sel]) drawSel(x, st.shapes[st.sel]);
  }
  function render() {
    const cv = M.querySelector('.fss-cv'); if (!st.base) return;
    if (cv.width !== st.base.width || cv.height !== st.base.height) { cv.width = st.base.width; cv.height = st.base.height; }
    const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); paint(x, true); syncSel(); save();
  }
  function finalCanvas() { const c = document.createElement('canvas'); c.width = st.base.width; c.height = st.base.height; paint(c.getContext('2d'), false); return c; }
  function pt(e) { const cv = M.querySelector('.fss-cv'), r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * cv.width, y: (e.clientY - r.top) / r.height * cv.height }; }
  const snapH = () => { st.hist.push(JSON.stringify(st.shapes)); if (st.hist.length > 60) st.hist.shift(); };

  /* ---------- hộp thoại ---------- */
  const M = document.createElement('div'); M.className = 'fss-modal'; M.hidden = true; M.setAttribute('role', 'dialog'); M.setAttribute('aria-modal', 'true'); M.setAttribute('aria-label', 'Chia sẻ ảnh');
  M.innerHTML = `<div class="fss-box"><div class="fss-hd"><b>⇪ Chia sẻ ảnh</b><button type="button" class="fss-x" aria-label="Đóng">×</button></div>
    <div class="fss-body"><div class="fss-left">
      <div class="fss-tools">${TOOLS.map(([k, i, l]) => k === 'none' ? `<button type="button" data-tool="none" class="fss-ptr" title="Chọn (Esc)" aria-label="Chọn"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M5 3l13 8.2-6 1.2 3.6 7-2.6 1.3-3.6-7L5 18z" fill="currentColor"/></svg></button>` : `<button type="button" data-tool="${k}" title="${l}"><span>${i}</span>${l}</button>`).join('')}
        <span class="fss-sep"></span>${SW.map(([k, l]) => `<button type="button" class="fss-sw" data-c="${k}" title="${l}" style="background:${FIN[k]}"></button>`).join('')}
        <span class="fss-sep"></span><button type="button" data-act="dash" class="fss-dash" title="Nét đứt cho mũi tên, khung, vòng (áp dụng cả hình đang chọn)"><span>┄</span>Nét đứt</button>
        <span class="fss-sep"></span><button type="button" data-act="del" class="fss-del" title="Xóa hình đang chọn (Delete)" disabled>🗑 Xóa hình</button><button type="button" data-act="undo" title="Hoàn tác (Ctrl+Z)">↶ Hoàn tác</button><button type="button" data-act="clear" title="Xóa hết hình vẽ">Xóa vẽ</button></div>
      <div class="fss-stage"><canvas class="fss-cv" aria-label="Ảnh xem trước"></canvas><button type="button" class="fss-ebtn" hidden>✎ Chỉnh chart</button><div class="fss-wait">Đang tạo ảnh…</div></div>
</div>
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
    M.querySelector('.fss-dash').classList.toggle('on', st.dash);
    M.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', b.dataset.c === st.color));
    M.querySelectorAll('[data-fmt]').forEach(b => b.classList.toggle('on', b.dataset.fmt === st.fmt));
    M.querySelector('.fss-stage').classList.toggle('draw', st.tool !== 'none'); syncSel();
    M.querySelector('.fss-stage').classList.toggle('tall', st.fmt === 'tall');
  }
  function syncSel() {   // thanh công cụ phản ánh hình đang chọn
    const sh = st.shapes[st.sel]; M.querySelector('.fss-del').disabled = !sh;
    if (sh) { M.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', b.dataset.c === sh.c)); M.querySelector('.fss-dash').classList.toggle('on', !!(sh.d || sh.t === 'darrow')); }
  }
  function build() {
    M.querySelector('.fss-wait').hidden = false;
    setTimeout(() => {
      try { const old = st.base, L = compose(); st.base = L.bg; st.fg = L.fg; st.cells = L.cells;
        if (old && (old.width !== st.base.width || old.height !== st.base.height)) { st.sel = -1; st.shapes = st.shapes.map(s => ({ ...s, a: { x: s.a.x / old.width * st.base.width, y: s.a.y / old.height * st.base.height }, b: s.b && { x: s.b.x / old.width * st.base.width, y: s.b.y / old.height * st.base.height } })); }
        render(); } catch (e) { msg('Không tạo được ảnh: ' + e.message); }
      M.querySelector('.fss-wait').hidden = true;
    }, 30);
  }
  function caption() {
    const m = first(), n = st.items.length;
    if (n === 1) return [...(st.key ? [st.key, ''] : []), ...(st.items[0].note ? [st.items[0].note, ''] : []), m.page, '', m.title + (m.sub ? ' (' + m.sub + ')' : ''), m.ins ? '\n' + m.ins : '', '', (m.last ? 'Kỳ dữ liệu: ' + m.last + '\n' : '') + 'Nguồn: ' + m.src].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
    return [...(st.key ? [st.key, ''] : []), m.page, '', ...st.items.map((it, i) => it.note ? `${i + 1}. ${it.note}\n${it.meta.title}${lastLab(it) ? ' (đến ' + lastLab(it) + ')' : ''}` : `${i + 1}. ${it.meta.title}${lastLab(it) ? ' (đến ' + lastLab(it) + ')' : ''}`), '', 'Nguồn: ' + srcAll()].join('\n');
  }
  function setItems(cards, keepNotes) {
    const old = new Map(st.items.map(it => [it.card, it.note]));
    const before = st.items.map(it => it.card).join();
    const oldR = new Map(st.items.map(it => [it.card, it.rng]));
    st.items = cards.filter(c => c._fssMeta || document.body.contains(c)).slice(0, MAXN).map(c => ({ card: c, meta: c._fssMeta || meta(c), note: keepNotes ? old.get(c) || '' : '', rng: keepNotes ? oldR.get(c) || '' : '' }));
    if (st.shapes.length && before !== st.items.map(it => it.card).join()) { st.shapes = []; msg('Bố cục thay đổi nên hình vẽ đã được xoá.'); }
  }
  function drawItems() {
    const ol = M.querySelector('.fss-items'), n = st.items.length;
    ol.innerHTML = st.items.map((it, i) => `<li><div class="fss-it"><span class="fss-in">${i + 1}</span><span class="fss-tt" title="${esc(it.meta.path.join(' › '))}">${esc(it.meta.title)}</span>
      <button type="button" data-mv="-1" data-i="${i}" title="Lên" ${i ? '' : 'disabled'}>↑</button><button type="button" data-mv="1" data-i="${i}" title="Xuống" ${i < n - 1 ? '' : 'disabled'}>↓</button><button type="button" data-rm="${i}" title="Bỏ chart này" ${n > 1 ? '' : 'disabled'}>×</button></div>
      <div class="fss-ir"><input class="fss-inote" data-i="${i}" value="${esc(it.note)}" placeholder="Nhận định ngắn cho chart này (tuỳ chọn)">${it.meta.ch ? `<button type="button" class="fss-iedit" data-ed="${i}" title="Mở to chart này đúng tỷ lệ trong ảnh để chỉnh khung thời gian, Cột/Đường">✎</button>` : ''}</div>${it.rng === 'cur' && st.rng !== 'cur' ? '<small class="fss-iown">Khung thời gian chỉnh riêng</small>' : ''}</li>`).join('');
    M.querySelector('.fss-lay').hidden = n < 2; M.querySelector('.fss-lay').value = st.lay;
    M.querySelector('.fss-rg').value = st.rng;
  }
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function refresh() { drawItems(); M.querySelector('.fss-cap').value = caption(); build(); }
  /* ---------- giữ phiên đang làm khi tải lại trang: chart, khung thời gian, Cột/Đường, hình vẽ, thông điệp, nhận định ---------- */
  const SKEY = 'fss-sess:' + location.pathname.split('/').pop() + (new URLSearchParams(location.search).get('s') || '');
  let svT = null;
  function save() {
    clearTimeout(svT); svT = setTimeout(() => {
      if (M.hidden || !st.base) return;
      const items = st.items.filter(it => it.meta.ch && it.meta.cv && it.meta.cv.id).map(it => {
        const ch = it.meta.ch, x = (ch.options.scales && ch.options.scales.x) || {}, lb = ch.data.labels || [];
        return { id: it.meta.cv.id, note: it.note, rng: it.rng, win: typeof x.min === 'number' || typeof x.max === 'number' ? [lb[x.min ?? 0], lb[x.max ?? lb.length - 1]].map(String) : null, ty: ch.data.datasets.map(d => d.type || null) };
      });
      if (!items.length) return;
      try { localStorage.setItem(SKEY, JSON.stringify({ t: Date.now(), items, fmt: st.fmt, lay: st.lay, rng: st.rng, key: st.key, shapes: st.shapes, w: st.base.width, h: st.base.height })); } catch (e) {}
    }, 400);
  }
  function restore() {
    let S = null; try { S = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) {}
    if (!S || !S.items || Date.now() - S.t > 3 * 864e5) return;
    try { if (window.FSSHARE && FSSHARE.prep) FSSHARE.prep(); } catch (e) {}
    const cards = [], extra = [];
    S.items.forEach(o => {
      const cv = document.getElementById(o.id), ch = cv && window.Chart && Chart.getChart(cv), c = cv && cv.closest('article.card'); if (!ch || !c) return;
      if (o.ty && o.ty.length === ch.data.datasets.length && o.ty.some((t, i) => t !== (ch.data.datasets[i].type || null))) {
        ch.data.datasets.forEach((d, i) => { if (d._pr0 === undefined) d._pr0 = d.pointRadius; d.type = o.ty[i] || d.type; if (d.type === 'line' || d.type === 'bar') d.pointRadius = d.type === 'line' ? (d._pr0 ?? 2) : 0; });
        (ch.options.scales.x = ch.options.scales.x || {}).offset = ch.data.datasets.some(d => (d.type || ch.config.type) === 'bar');
        const sw = c.querySelector('.tsw'); if (sw) sw.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tt === o.ty[0]));
      }
      if (o.win) { const lb = (ch.data.labels || []).map(String), a = lb.indexOf(o.win[0]), b = lb.indexOf(o.win[1]), x = ch.options.scales.x = ch.options.scales.x || {}; if (a >= 0 && b > a) { x.min = a; x.max = b; } }
      ch.update('none'); cards.push(c); extra.push(o);
    });
    if (!cards.length) return;
    open(cards);
    st.items.forEach((it, i) => { it.note = extra[i].note || ''; it.rng = extra[i].rng || ''; });
    st.fmt = S.fmt || st.fmt; st.lay = S.lay || 'auto'; st.rng = S.rng || 'cur'; st.key = S.key || ''; M.querySelector('.fss-key').value = st.key;
    st.shapes = S.shapes || []; st.base = { width: S.w, height: S.h };   // build() co hình vẽ theo khung mới nếu cỡ khác
    syncUi(); refresh();
  }
  setTimeout(restore, 1800);
  function open(cards) {
    st.shapes = []; st.hist = []; st.sel = -1; st.hover = -1; st.base = null; st.fg = null; st.cells = []; st.key = ''; st.rng = 'cur'; M.querySelector('.fss-key').value = ''; st.tool = 'none'; st.color = 'navy'; st.dash = false; st.picked = false; msg('');
    setItems(cards, false); if (!st.items.length) return;
    M.hidden = false; document.body.classList.add('fss-open'); syncUi(); refresh();
  }
  window.FSShareImage = o => {   // o = { img: canvas, title, sub, src, last }
    const page = txt(document.querySelector('.site-nav a.on')) || 'FinSuccess';
    st.fmt = o.img.height > o.img.width * 0.62 ? 'tall' : 'wide';   // bảng cao thì mở sẵn khung dọc 4:5
    open([{ _fssMeta: { ch: null, img: o.img, re: o.re, rc: {}, title: o.title || 'Bảng số liệu', sub: o.sub || '', src: cleanSrc(o.src || ''), last: o.last || '', page, ins: o.ins || '', path: [page] } }]);
  };
  function close() { clearTimeout(svT); try { localStorage.removeItem(SKEY); } catch (e) {} M.hidden = true; PK.hidden = true; document.body.classList.remove('fss-open'); M.querySelector('.fss-txt').hidden = true; }
  const blob = () => new Promise(r => finalCanvas().toBlob(r, 'image/png'));
  const fname = () => 'FinSuccess_' + plain(st.key && st.items.length > 1 ? st.key : first().title).replace(/[^\w\- ]+/g, '').trim().slice(0, 60) + '_' + new Date().toLocaleDateString('vi-VN').replace(/\//g, '-') + '.png';
  async function copyText(t) { try { await navigator.clipboard.writeText(t); return true; } catch (e) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (er) {} a.remove(); return ok; } }
  async function act(k) {
    const cap = M.querySelector('.fss-cap').value;
    if (k === 'cap') { msg(await copyText(cap) ? 'Đã chép caption.' : 'Không chép được caption.'); return; }
    if (k === 'undo') { if (st.hist.length) { st.shapes = JSON.parse(st.hist.pop()); st.sel = -1; } render(); return; }
    if (k === 'clear') { if (st.shapes.length) snapH(); st.shapes = []; st.sel = -1; render(); return; }
    if (k === 'del') { if (st.shapes[st.sel]) { snapH(); st.shapes.splice(st.sel, 1); st.sel = -1; render(); } return; }
    if (k === 'dash') { const sh = st.shapes[st.sel]; st.dash = !st.dash; if (sh && DASHABLE(sh.t === 'darrow' ? 'arrow' : sh.t)) { snapH(); if (sh.t === 'darrow') sh.t = 'arrow'; sh.d = !(sh.d); st.dash = sh.d; } syncUi(); render(); return; }
    st.sel = -1; render();
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
    const t = e.target.closest('[data-tool]'); if (t) { st.tool = t.dataset.tool; st.sel = -1; st.hover = -1; M.querySelector('.fss-ebtn').hidden = true; if (!st.picked) st.color = BACK(st.tool) ? 'gold' : 'navy'; syncUi(); return render(); }
    const c = e.target.closest('[data-c]'); if (c) { st.color = c.dataset.c; st.picked = true; const sh = st.shapes[st.sel]; if (sh && sh.c !== st.color) { snapH(); sh.c = st.color; } syncUi(); return render(); }
    const ed = e.target.closest('[data-ed]'); if (ed) return editChart(+ed.dataset.ed);
    if (e.target.closest('.fss-ebtn')) return editChart(st.hover);
    const f = e.target.closest('[data-fmt]'); if (f && f.dataset.fmt !== st.fmt) { st.fmt = f.dataset.fmt; syncUi(); return build(); }
    const mv = e.target.closest('[data-mv]'); if (mv) { const i = +mv.dataset.i, j = i + +mv.dataset.mv, a = st.items; [a[i], a[j]] = [a[j], a[i]]; if (st.shapes.length) { st.shapes = []; msg('Bố cục thay đổi nên hình vẽ đã được xoá.'); } return refresh(); }
    const rm = e.target.closest('[data-rm]'); if (rm) { setItems(st.items.filter((_, i) => i !== +rm.dataset.rm).map(it => it.card), true); return refresh(); }
    const a = e.target.closest('[data-act]'); if (a) { if (a.dataset.act === 'add') return openPick(); act(a.dataset.act); }
  });
  M.querySelector('.fss-rg').addEventListener('change', e => { st.rng = e.target.value; st.items.forEach(it => { it.rng = ''; }); drawItems(); M.querySelector('.fss-cap').value = caption(); build(); });   // khung chung ghi đè khung đã chỉnh riêng
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
  document.addEventListener('keydown', e => {
    if (M.hidden || !MX.hidden) return; const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === 'Escape' && M.querySelector('.fss-txt').hidden) { if (!PK.hidden) PK.hidden = true; else if (st.sel >= 0) { st.sel = -1; render(); } else if (st.tool !== 'none') { st.tool = 'none'; syncUi(); render(); } else close(); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && st.sel >= 0) { e.preventDefault(); act('del'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !typing) { e.preventDefault(); act('undo'); }
  });
  const cv = M.querySelector('.fss-cv'), ebtn = M.querySelector('.fss-ebtn');
  const topHit = p => { for (let i = st.shapes.length - 1; i >= 0; i--) if (hitShape(st.shapes[i], p, i === st.sel)) return i; return -1; };
  const cellAt = p => st.cells.find(c => p.x >= c.X && p.x <= c.X + c.w && p.y >= c.Y && p.y <= c.Y + c.h && st.items[c.i] && st.items[c.i].meta.ch);
  function placeEbtn(c) {
    if (!c) { ebtn.hidden = true; return; }
    const r = cv.getBoundingClientRect(), sr = M.querySelector('.fss-stage').getBoundingClientRect(), k = r.width / cv.width;
    ebtn.style.left = (r.left - sr.left + (c.X + c.w) * k - 8) + 'px'; ebtn.style.top = (r.top - sr.top + c.Y * k + 8) + 'px'; ebtn.hidden = false;
  }
  cv.addEventListener('pointerdown', e => {
    if (!st.base || e.button > 0) return; const p = pt(e);
    const cur = st.shapes[st.sel];
    if (cur) {
      const h = hitHandle(cur, p);
      if (h) { snapH(); st.drag = { move: 'h', k: h.k, sh: cur }; cv.setPointerCapture(e.pointerId); e.preventDefault(); return; }
    }
    const hit = topHit(p);
    if (hit >= 0) { st.sel = hit; snapH(); const sh = st.shapes[hit]; st.drag = { move: 'm', p0: p, a0: { ...sh.a }, b0: sh.b && { ...sh.b }, sh, moved: false }; cv.setPointerCapture(e.pointerId); e.preventDefault(); render(); return; }
    if (st.sel >= 0) { st.sel = -1; render(); return; }   // bấm ra chỗ khác: chỉ bỏ chọn
    if (st.tool === 'none') { const c = cellAt(p); if (c) editChart(c.i); return; }
    if (st.tool === 'text') { textAt(p, e); return; }
    cv.setPointerCapture(e.pointerId); st.drag = { t: st.tool, c: st.color, a: p, b: p, ...(DASHABLE(st.tool) && st.dash ? { d: true } : {}) }; e.preventDefault();
  });
  cv.addEventListener('pointermove', e => {
    const p = pt(e), d = st.drag;
    if (!d) {   // rê chuột: con trỏ theo vị trí, nút "Chỉnh chart" trên chart đang rê
      const cur = st.shapes[st.sel], h = cur && hitHandle(cur, p);
      cv.style.cursor = h ? 'nwse-resize' : topHit(p) >= 0 ? 'move' : st.tool === 'none' ? (cellAt(p) ? 'pointer' : 'default') : 'crosshair';
      const c = st.tool === 'none' && !h && topHit(p) < 0 ? cellAt(p) : null, hv = c ? c.i : -1; if (hv !== st.hover) { st.hover = hv; render(); } placeEbtn(c);   // đang vẽ thì không hiện nút chỉnh chart
      return;
    }
    if (d.move === 'h') { const sh = d.sh; if (d.k === 'a') sh.a = p; else if (d.k === 'b') sh.b = p; else if (d.k === 'ab') { sh.b = { x: p.x, y: sh.b.y }; sh.a = { x: sh.a.x, y: p.y }; } else { sh.a = { x: p.x, y: sh.a.y }; sh.b = { x: sh.b.x, y: p.y }; } }
    else if (d.move === 'm') { const dx = p.x - d.p0.x, dy = p.y - d.p0.y; if (Math.hypot(dx, dy) > 2) d.moved = true; d.sh.a = { x: d.a0.x + dx, y: d.a0.y + dy }; if (d.b0) d.sh.b = { x: d.b0.x + dx, y: d.b0.y + dy }; }
    else d.b = p;
    render();
  });
  cv.addEventListener('pointerleave', () => { if (!st.drag && st.hover >= 0) { setTimeout(() => { if (!ebtn.matches(':hover')) { st.hover = -1; ebtn.hidden = true; render(); } }, 60); } });
  ebtn.addEventListener('pointerleave', e => { if (e.relatedTarget !== cv) { st.hover = -1; ebtn.hidden = true; render(); } });
  const end = () => {
    const d = st.drag; if (!d) return; st.drag = null;
    if (d.move) { if (d.move === 'm' && !d.moved) st.hist.pop(); render(); return; }   // chỉ bấm chọn, không đổi gì
    if (Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y) > 8) { snapH(); st.shapes.push(d); st.sel = st.shapes.length - 1; }
    render();
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('dblclick', e => { const i = topHit(pt(e)); if (i >= 0 && st.shapes[i].t === 'text') textAt(st.shapes[i].a, e, i); });
  function textAt(p, e, idx) {
    const box = M.querySelector('.fss-txt'), ta = box.querySelector('textarea');
    e.preventDefault(); const t0 = Date.now();
    box.hidden = false; box.style.left = Math.min(e.clientX, innerWidth - 260) + 'px'; box.style.top = Math.min(e.clientY, innerHeight - 70) + 'px'; ta.value = idx != null ? st.shapes[idx].s : ''; setTimeout(() => ta.focus(), 30);
    const done = ok => {
      box.hidden = true; ta.onkeydown = ta.onblur = null; const s = ta.value.trim(); if (!ok) return;
      if (idx != null) { if (s !== st.shapes[idx].s) { snapH(); if (s) st.shapes[idx].s = s; else { st.shapes.splice(idx, 1); st.sel = -1; } } }
      else if (s) { snapH(); st.shapes.push({ t: 'text', c: st.color, a: p, s }); st.sel = st.shapes.length - 1; }
      render();
    };
    ta.onkeydown = ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); done(true); } else if (ev.key === 'Escape') { ev.stopPropagation(); done(false); } };
    ta.onblur = () => { if (Date.now() - t0 < 400) { setTimeout(() => ta.focus(), 0); return; } done(true); };
  }

  /* ---------- phóng to chart (trên trang) và chỉnh chart trong ảnh (đúng tỷ lệ, cỡ chữ như ảnh xuất) ---------- */
  const MX = document.createElement('div'); MX.className = 'fsx'; MX.hidden = true; MX.setAttribute('role', 'dialog'); MX.setAttribute('aria-modal', 'true');
  MX.innerHTML = `<div class="fsx-box"><div class="fsx-hd"><div class="fsx-tt"><b class="fsx-t"></b><small class="fsx-s"></small></div>
    <div class="fsx-act"><button type="button" class="fsx-ok" hidden>✓ Xong · áp dụng vào ảnh</button><button type="button" class="fsx-cp" title="Chép ảnh" aria-label="Chép ảnh"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="2"/></svg></button><button type="button" class="fsx-x" title="Thu nhỏ (Esc)" aria-label="Thu nhỏ">✕</button></div></div>
    <div class="fsx-body"></div></div>`;
  document.body.appendChild(MX);
  let mxs = null;   // { card, ph, cbox, style, done }
  function maxOpen(card, opt = {}) {
    if (mxs) maxClose(false);
    const cvs = [...card.querySelectorAll('canvas')].filter(x => window.Chart && Chart.getChart(x)); if (!cvs.length) return;
    const ph = document.createComment('fsx'); card.before(ph);
    const body = MX.querySelector('.fsx-body'); body.innerHTML = ''; body.appendChild(card);
    card.classList.add('fsx-card'); MX.classList.toggle('fsx-fix', !!opt.size);
    const tgt = opt.cv || cvs[0], tbox = tgt.closest('.cbox') || tgt.parentElement;
    const boxes = [...new Set(cvs.map(c => c.closest('.cbox') || c.parentElement))], saved = boxes.map(b => [b, b.getAttribute('style')]), hid = [];
    MX.querySelector('.fsx-t').textContent = opt.title || [txt(document.querySelector('.site-nav a.on')) || (document.title || '').split('·')[0].trim(), ...pathOf(card)].filter(Boolean).join(' › ');
    MX.querySelector('.fsx-s').textContent = opt.sub || '';
    MX.querySelector('.fsx-ok').hidden = !opt.done; MX.querySelector('.fsx-cp').hidden = !!opt.done; MX.querySelector('.fsx-x').title = opt.done ? 'Đóng (Esc)' : 'Thu nhỏ (Esc)';
    MX.hidden = false; document.body.classList.add('fsx-open');
    if (opt.size) {   // đúng kích thước chart khi ghép ảnh (cùng tỷ lệ, cùng cỡ chữ); màn hình nhỏ hơn thì thu theo tỷ lệ
      tbox.classList.add('fsx-target'); const rg = tbox.previousElementSibling; if (rg && rg.classList.contains('rng')) rg.classList.add('fsx-target');
      // chỉ giữ tên chart, nút điều khiển và đúng chart này (ẩn bảng, nhận định, chart khác trong cùng thẻ)
      const KEEP = 'h3.sub,.chart-sub,.ctl,.picker,.mode-sw,.tf,.tsw,[data-ctl],.lgall,.cpick,.fsx-target';
      for (let el = tbox; el && el !== card; el = el.parentElement) [...el.parentElement.children].forEach(sib => {
        if (sib === el || sib.contains(tbox) || sib.matches(KEEP) || sib.querySelector('.fsx-target') || sib.style.display === 'none') return;
        if (sib.matches('.chart-sub') && sib.nextElementSibling && !sib.nextElementSibling.contains(tbox) && !sib.nextElementSibling.classList.contains('fsx-target')) { hid.push([sib, sib.style.display]); sib.style.display = 'none'; return; }
        if (sib.querySelector('button') && !sib.querySelector('canvas,table') && !sib.matches('.ibar') && (sib.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) return;   // hàng nút chọn chế độ của chart
        hid.push([sib, sib.style.display]); sib.style.display = 'none';
      });
      const fit = Math.min(1, (innerWidth * 0.9 - 64) / opt.size.w, (innerHeight * 0.88 - 220) / opt.size.h), W0 = Math.round(opt.size.w), H0 = Math.round(opt.size.h);
      MX.style.setProperty('--fsxw0', W0 + 'px'); MX.style.setProperty('--fsxh0', H0 + 'px');   // đúng cỡ chart khi xuất ảnh → cùng cỡ chữ; màn hình nhỏ thì thu cả khối lại
      if (fit < 1) { tbox.style.transform = `scale(${fit})`; tbox.style.transformOrigin = '0 0'; tbox.style.marginRight = (W0 * (fit - 1)) + 'px'; tbox.style.marginBottom = (H0 * (fit - 1)) + 'px'; }
      MX.style.setProperty('--fsxw', Math.round(W0 * fit) + 'px'); tbox.style.height = Math.round(opt.size.h * fit) + 'px'; tbox.style.maxWidth = 'none';
    } else {
      const n = boxes.length;
      boxes.forEach(b => { b.style.height = (n === 1 ? Math.max(360, innerHeight * 0.62) : Math.max(320, innerHeight * 0.42)) + 'px'; });
      if (n === 1) requestAnimationFrame(() => { const extra = card.scrollHeight - tbox.offsetHeight, h = body.clientHeight - extra - 4; if (h > 320) tbox.style.height = h + 'px'; });
    }
    mxs = { card, ph, saved, hid, tbox, done: opt.done };
    const sz = opt.size ? [Math.round(opt.size.w), Math.round(opt.size.h)] : null;   // khung bị thu (transform) thì Chart.js đo nhầm cỡ → đặt cỡ thẳng
    [30, 250].forEach(t => setTimeout(() => cvs.forEach(c => { const ch = Chart.getChart(c); if (!ch) return; if (sz && c === tgt) ch.resize(sz[0], sz[1]); else ch.resize(); }), t));
  }
  function maxClose(apply) {
    if (!mxs) return; const { card, ph, saved, hid, done } = mxs; mxs = null;
    hid.forEach(([h, d]) => { h.style.display = d; });
    saved.forEach(([b, s0]) => { if (s0 == null) b.removeAttribute('style'); else b.setAttribute('style', s0); });
    card.querySelectorAll('.fsx-target').forEach(x => x.classList.remove('fsx-target'));
    card.classList.remove('fsx-card'); ph.replaceWith(card); MX.hidden = true; MX.classList.remove('fsx-fix'); document.body.classList.remove('fsx-open');
    [...card.querySelectorAll('canvas')].forEach(c => { const ch = window.Chart && Chart.getChart(c); if (ch) ch.resize(); });
    if (done) done(apply);
  }
  function quickCopy(card, btn) {   // chép ảnh có thương hiệu của chart đang phóng to (khung ngang 16:9)
    const keep = { items: st.items, fmt: st.fmt, lay: st.lay, rng: st.rng, key: st.key, shapes: st.shapes };
    let cvs = null;
    try {
      st.items = [{ card, meta: meta(card), note: '', rng: 'cur' }]; st.fmt = 'wide'; st.lay = 'auto'; st.rng = 'cur'; st.key = ''; st.shapes = [];
      const L = compose(); cvs = document.createElement('canvas'); cvs.width = L.bg.width; cvs.height = L.bg.height;
      const x = cvs.getContext('2d'); x.drawImage(L.bg, 0, 0); x.drawImage(L.fg, 0, 0);
    } catch (e) { cvs = null; } finally { Object.assign(st, keep); }
    const done = ok => { btn.classList.add(ok ? 'ok' : 'err'); btn.title = ok ? 'Đã chép ảnh' : 'Trình duyệt chưa cho chép ảnh'; setTimeout(() => { btn.classList.remove('ok', 'err'); btn.title = 'Chép ảnh'; }, 1600); };
    if (!cvs || !window.ClipboardItem) return done(false);
    navigator.clipboard.write([new ClipboardItem({ 'image/png': new Promise(r => cvs.toBlob(r, 'image/png')) })]).then(() => done(true), () => done(false));
  }
  MX.addEventListener('click', e => { const cp = e.target.closest('.fsx-cp'); if (cp && mxs) return quickCopy(mxs.card, cp); if (e.target === MX || e.target.closest('.fsx-x')) maxClose(!!(mxs && mxs.done)); else if (e.target.closest('.fsx-ok')) maxClose(true); });
  document.addEventListener('keydown', e => { if (!MX.hidden && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); maxClose(!!(mxs && mxs.done)); } }, true);
  function editChart(i) {
    const it = st.items[i], c = st.cells.find(x => x.i === i); if (!it || !it.meta.ch || !c || !it.card || !it.card.isConnected) return;
    const ch = it.meta.ch, sx = ch.options.scales && ch.options.scales.x, win = winOf(it);
    if (win && sx) { const n = (ch.data.labels || []).length; if (win[0] <= 0 && win[1] >= n - 1) { delete sx.min; delete sx.max; } else { sx.min = win[0]; sx.max = win[1]; } ch.update('none'); }   // mở ra đúng khung đang hiện trong ảnh
    ebtn.hidden = true; st.hover = -1;
    const F = FMT[st.fmt];
    maxOpen(it.card, { cv: ch.canvas, size: { w: c.w / c.zs, h: c.h / c.zs }, title: `${st.items.length > 1 ? (i + 1) + '. ' : ''}${it.meta.title}`,
      sub: '',
      done: () => { it.rng = 'cur'; drawItems(); M.querySelector('.fss-cap').value = caption(); build(); } });
  }
})();
