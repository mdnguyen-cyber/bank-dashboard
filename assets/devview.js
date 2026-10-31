/* Chế độ xem: Người xem (mặc định) / Developer (cần mật khẩu).
   Người xem: ẩn mục đang xây (ngành Bảo hiểm, Chứng khoán, doanh nghiệp BH·CK, Backend).
   Lưu ý: site tĩnh nên đây là ẩn giao diện, không phải bảo mật thật. Đổi mật khẩu: thay PASS_SHA256 bằng sha256 của mật khẩu mới. */
(function () {
  var PASS_SHA256 = '600352d451cf9c896d2e6e52dc089a0f096ae9f00485f6ea163da6ca845db0e2';
  var KEY = 'fsDevView', DEV_PAGES = /\/(bh|ck|dn|fin|backend)\.html$/;
  var root = document.documentElement, dev = false;
  try { dev = localStorage.getItem(KEY) === '1'; } catch (e) {}
  if (dev) root.classList.add('dev');
  var gated = !dev && DEV_PAGES.test(location.pathname);
  if (gated) root.classList.add('dev-gate');
  var st = document.createElement('style');
  st.textContent = 'html:not(.dev) .site-nav a[href="bh.html"],html:not(.dev) .site-nav a[href="ck.html"],html:not(.dev) .site-nav a[href="backend.html"],html:not(.dev) .site-nav .devonly{display:none!important}'
    + 'html.dev-gate body>*:not(#devGate){display:none!important}'
    + '#devGate{max-width:420px;margin:12vh auto;padding:28px 24px;background:#fff;border:1px solid #e3e7ef;border-radius:14px;font-family:Arial,sans-serif;text-align:center}'
    + '#devGate h2{color:#1D2678;font-size:18px;margin:0 0 8px}#devGate p{color:#5b6475;font-size:13px;margin:0 0 16px}'
    + '.dv-form{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}.dv-form input{border:1px solid #cfd5e2;border-radius:8px;padding:7px 10px;font:13px Arial;min-width:0;width:170px}'
    + '.dv-btn{border:1px solid #1D2678;background:#fff;color:#1D2678;border-radius:99px;padding:5px 12px;font:700 12px Arial;cursor:pointer;white-space:nowrap}.dv-btn.on{background:#1D2678;color:#fff}'
    + '.dv-msg{display:block;color:#c0392b;font-size:12px;margin-top:6px;min-height:14px}.dv-pop{position:absolute;right:0;top:calc(100% + 6px);background:#fff;border:1px solid #e3e7ef;border-radius:10px;padding:10px;box-shadow:0 6px 20px rgba(29,38,120,.12);z-index:50}'
    + '.dv-wrap{position:relative}';
  document.head.appendChild(st);
  async function check(p) {
    try { var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p)); return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('') === PASS_SHA256; } catch (e) { return false; }
  }
  function setDev(v) { try { if (v) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch (e) {} }
  function form(onOk) {
    var f = document.createElement('form'); f.className = 'dv-form';
    f.innerHTML = '<input type="password" placeholder="Mật khẩu developer" aria-label="Mật khẩu developer" autocomplete="current-password"><button class="dv-btn on" type="submit">Mở</button><span class="dv-msg"></span>';
    f.onsubmit = async function (e) { e.preventDefault(); var i = f.querySelector('input'); if (await check(i.value)) { setDev(true); onOk(); } else { f.querySelector('.dv-msg').textContent = 'Sai mật khẩu.'; i.select(); } };
    return f;
  }
  document.addEventListener('DOMContentLoaded', function () {
    if (gated) {
      var g = document.createElement('div'); g.id = 'devGate';
      g.innerHTML = '<h2>Trang dành cho developer</h2><p>Mục này đang xây dựng. Nhập mật khẩu để xem, hoặc <a href="index.html">về trang chính</a>.</p>';
      var f = form(function () { location.reload(); }); g.appendChild(f); document.body.prepend(g); setTimeout(function () { f.querySelector('input').focus(); }, 50);
      return;
    }
    var host = document.querySelector('.logo-right'); if (!host) return;
    var w = document.createElement('span'); w.className = 'dv-wrap';
    var b = document.createElement('button'); b.type = 'button'; b.className = 'dv-btn' + (dev ? ' on' : '');
    b.textContent = dev ? '🛠 Developer view' : '👁 User view';
    b.title = dev ? 'Bấm để về chế độ người xem' : 'Chuyển sang developer view (cần mật khẩu)';
    w.appendChild(b); host.prepend(w);
    b.onclick = function () {
      if (dev) { setDev(false); if (DEV_PAGES.test(location.pathname)) location.href = 'index.html'; else location.reload(); return; }
      var pop = w.querySelector('.dv-pop'); if (pop) { pop.remove(); return; }
      pop = document.createElement('div'); pop.className = 'dv-pop'; var f = form(function () { location.reload(); }); pop.appendChild(f); w.appendChild(pop); f.querySelector('input').focus();
    };
  });
})();

/* Chế độ nhúng (iframe vào website công ty): thêm ?embed=1 vào link.
   Ẩn logo FinSuccess và thanh chuyển trang; mỗi link chỉ giữ phần chọn của nhóm mình:
   vĩ mô (vimo.html) · ngành (nganh/bh/ck.html) · cổ phiếu (trang ngân hàng + dn.html).
   Gửi chiều cao trang cho trang cha qua postMessage {type:'fs-embed-height', h}. */
(function () {
  var root = document.documentElement, K = 'fsEmbed', on = false;
  var q = new URLSearchParams(location.search), v = q.get('embed');
  try {
    if (v === '0') sessionStorage.removeItem(K);
    else if (v !== null) sessionStorage.setItem(K, '1');
    on = v !== null ? v !== '0' : sessionStorage.getItem(K) === '1';
  } catch (e) { on = v !== null && v !== '0'; }
  if (!on) return;
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var grp = page === 'vimo.html' ? 'vimo' : /^(nganh|bh|ck)\.html$/.test(page) ? 'nganh' : 'cp';
  root.classList.add('embed', 'embed-' + grp);
  var st = document.createElement('style');
  st.textContent = 'html.embed .logo-bar .logo-left>img{display:none!important}'
    + 'html.embed .site-nav a[href="backend.html"]{display:none!important}'
    + 'html.embed-vimo .site-nav{display:none!important}'
    + 'html.embed-nganh .site-nav a[href="vimo.html"],html.embed-nganh .site-nav .bank-pick{display:none!important}'
    + 'html.embed-nganh:not(.dev) .site-nav{display:none!important}'
    + 'html.embed-cp .site-nav>a{display:none!important}';
  document.head.appendChild(st);
  function tag(u) {
    if (!u || /^(#|mailto:|tel:|javascript:)/i.test(u)) return u;
    try {
      var x = new URL(u, location.href);
      if (x.origin !== location.origin || !/\.html$|\/$/.test(x.pathname) || x.searchParams.has('embed')) return u;
      x.searchParams.set('embed', '1'); return x.pathname.split('/').pop() + x.search + x.hash;
    } catch (e) { return u; }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a || a.target === '_blank') return;
    var h = a.getAttribute('href'), t = tag(h); if (t !== h) a.setAttribute('href', t);
  }, true);
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.site-nav select option[value]').forEach(function (o) { if (o.value) o.value = tag(o.value); });
    if (window.parent === window || !window.ResizeObserver) return;
    var last = 0, send = function () {
      var h = Math.ceil(document.documentElement.scrollHeight);
      if (h !== last) { last = h; try { window.parent.postMessage({ type: 'fs-embed-height', h: h }, '*'); } catch (e) {} }
    };
    new ResizeObserver(send).observe(document.body); send();
  });
})();
