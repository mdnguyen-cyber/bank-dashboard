/* Giá dầu Brent, WTI theo phút ở tab Hàng hóa (vimo.html): đọc từ Worker `FS_QUOTE.url` (worker/quote-worker.js), 20 giây một lần,
   chỉ khi tab trình duyệt đang mở. Không cấu hình URL thì không hiện. Không dùng AI, không tốn token. */
(function () {
  const U = (window.FS_QUOTE || {}).url; if (!U || !window.Chart) return;
  const S = [['BZ=F', 'Brent (ICE)', '#1D2678'], ['CL=F', 'WTI (NYMEX)', '#d9a400']], EVERY = 20000;
  let ch = null, tmr = null, rng = '1d';
  const nf = (v, d = 2) => v == null || isNaN(v) ? '—' : Number(v).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });
  const hm = ts => new Date(ts * 1000).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
  const dm = ts => new Date(ts * 1000).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' });
  function mount() {
    const pane = document.getElementById('cmd'); if (!pane || !pane.children.length || document.getElementById('liveOil')) return false;
    const a = document.createElement('article'); a.className = 'card';
    a.innerHTML = `<h3 class="sub">Giá dầu Brent và WTI theo phút</h3>
      <p class="chart-sub">USD/thùng · hợp đồng tương lai tháng gần nhất · tự cập nhật 20 giây một lần</p>
      <div class="picker" id="liveRng"><button type="button" data-r="1d" class="on">Hôm nay</button><button type="button" data-r="5d">5 ngày</button></div>
      <div class="kpis" id="liveKpi" style="display:flex;gap:18px;flex-wrap:wrap;margin:6px 0 4px;font-size:13px"></div>
      <div class="cbox"><canvas id="liveOil" role="img" aria-label="Giá dầu theo phút"></canvas></div>
      <div class="src">Nguồn: ICE (Brent), CME/NYMEX (WTI) qua Yahoo Finance; giá có thể trễ khoảng 10 phút so với sàn</div>`;
    const h = pane.querySelector('h2.sec'); if (h) h.after(a); else pane.prepend(a);
    a.querySelector('#liveRng').onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; rng = b.dataset.r; a.querySelectorAll('#liveRng button').forEach(x => x.classList.toggle('on', x === b)); pull(); };
    pull(); return true;
  }
  async function pull() {
    clearTimeout(tmr);
    if (!document.hidden && document.getElementById('liveOil')) {
      try {
        const j = await (await fetch(`${U.replace(/\/$/, '')}/q?s=${S.map(s => s[0]).join(',')}&r=${rng}`, { cache: 'no-store' })).json();
        draw(j);
      } catch (e) { const k = document.getElementById('liveKpi'); if (k) k.textContent = 'Chưa lấy được giá — thử lại sau 20 giây.'; }
    }
    tmr = setTimeout(pull, EVERY);
  }
  function draw(j) {
    const Q = S.map(([s, n, c]) => ({ ...(j.q.find(x => x.s === s) || {}), n, col: c })).filter(q => q.t && q.t.length);
    if (!Q.length) return;
    const T = [...new Set(Q.flatMap(q => q.t))].sort((a, b) => a - b), lab = T.map(t => rng === '1d' ? hm(t) : dm(t) + ' ' + hm(t));
    const ds = Q.map(q => { const m = new Map(q.t.map((t, i) => [t, q.c[i]])); return { type: 'line', label: q.n, data: T.map(t => m.get(t) ?? null), borderColor: q.col, backgroundColor: q.col, borderWidth: 2, pointRadius: 0, spanGaps: true, tension: 0 }; });
    document.getElementById('liveKpi').innerHTML = Q.map(q => { const d = q.pc ? (q.p / q.pc - 1) * 100 : null; return `<span><b style="color:${q.col}">${q.n}</b> ${nf(q.p)} <span style="color:${d >= 0 ? '#1e8f5a' : '#c0392b'}">${d == null ? '' : (d >= 0 ? '+' : '') + nf(d, 2) + '%'}</span></span>`; }).join('')
      + `<span style="color:#8a93a3">lúc ${hm(Math.max(...Q.map(q => q.ts || 0)))} (giờ VN)</span>`;
    if (ch && ch.data.labels.length && ch.data.datasets.length === ds.length && ch._rng === rng) { ch.data.labels = lab; ch.data.datasets.forEach((d, i) => { d.data = ds[i].data; }); ch.update('none'); return; }
    if (ch) ch.destroy();
    ch = new Chart(document.getElementById('liveOil'), { data: { labels: lab, datasets: ds }, options: { animation: false, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${nf(c.raw)} USD` } } },
      scales: { x: { ticks: { maxTicksLimit: 8, maxRotation: 0 }, grid: { display: false } }, y: { ticks: { callback: v => nf(v, 1) } } } } });
    ch._rng = rng;
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(); });
  const ob = new MutationObserver(() => { if (mount()) ob.disconnect(); });
  ob.observe(document.body, { childList: true, subtree: true }); mount();
})();
