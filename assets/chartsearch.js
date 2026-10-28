/* Tìm chart trên toàn dashboard: nút 🔍 ở thanh trên cùng, phím tắt Ctrl/⌘ + K hoặc "/".
   Mục lục: data/chart-index.js (scripts/build_chart_index.js), tải khi mở hộp tìm lần đầu.
   Mở kết quả: cùng trang → mở đúng tab, tab con rồi cuộn tới chart; trang khác → chuyển trang kèm ?chart=<mã> (hoặc &chart=). */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const isDev = () => document.documentElement.classList.contains('dev');
  const here = () => { const f = location.pathname.split('/').pop() || 'index.html', s = new URLSearchParams(location.search).get('s'); return s ? `${f}?s=${s}` : f; };
  const RK = 'fs-chart-recent';
  const recent = () => { try { return JSON.parse(localStorage.getItem(RK) || '[]'); } catch (e) { return []; } };
  const pushRecent = k => { try { localStorage.setItem(RK, JSON.stringify([k, ...recent().filter(x => x !== k)].slice(0, 8))); } catch (e) {} };

  /* ---------- mở tới chart trên trang hiện tại ---------- */
  function reveal(id, tries = 0) {
    let el = document.getElementById(id);
    if (!el && window.FSSHARE && tries === 0) { try { FSSHARE.prep(); } catch (e) {} el = document.getElementById(id); }
    if (!el) { if (tries < 8) setTimeout(() => reveal(id, tries + 1), 300); return false; }
    const card = el.closest('article.card') || el, pane = el.closest('.pane');
    if (pane && !pane.classList.contains('active')) { const tb = $(`#tabbar [data-tab="${pane.id}"]`); if (tb) tb.click(); }
    // mở các tab con / khối thu gọn bao quanh chart, từ ngoài vào trong
    const chain = []; for (let x = el.parentElement; x && x !== pane; x = x.parentElement) chain.unshift(x);
    chain.forEach(x => {
      const pp = x.dataset && (x.dataset.pp || x.dataset.subp || x.dataset.cc);
      if (pp && !x.classList.contains('on') && getComputedStyle(x).display === 'none') {
        const par = x.parentElement, b = par && ($(`:scope > .subtabs [data-p="${pp}"], :scope > .subtabs [data-sub="${pp}"], :scope > .subtabs [data-c="${pp}"]`, par)
          || $(`.subtabs [data-p="${pp}"], .subtabs [data-sub="${pp}"]`, pane || document));
        if (b) b.click();
      }
      if (x.tagName === 'DETAILS' && !x.open) x.open = true;
      if (x.hidden && x.classList.contains('ovbody') && x.previousElementSibling) x.previousElementSibling.click();
    });
    setTimeout(() => { const c = document.getElementById(id); const k = c && (c.closest('article.card') || c); if (!k) return;
      const to = (b = 'smooth') => { const tb = document.querySelector('.tabs'), off = (tb ? tb.offsetHeight : 0) + 12; window.scrollTo({ top: window.scrollY + k.getBoundingClientRect().top - off, behavior: b }); };
      to(); k.classList.add('flash'); setTimeout(() => k.classList.remove('flash'), 2400);
      // chart khác còn đang dựng làm trang dài ra trong lúc cuộn: chỉnh lại cho đúng vị trí
      [900, 1800].forEach(t => setTimeout(() => { const y = k.getBoundingClientRect().top; if (Math.abs(y - 70) > 40) to('auto'); }, t)); }, 350);
    return true;
  }

  /* ---------- hộp tìm ---------- */
  let IDX = null, box = null, sel = 0, grp = 'all', hits = [];
  const loadIdx = () => new Promise(res => {
    if (window.CHART_INDEX) return res(window.CHART_INDEX);
    const s = document.createElement('script'); s.src = 'data/chart-index.js?v=' + Date.now().toString(36).slice(0, 5);
    s.onload = () => res(window.CHART_INDEX || null); s.onerror = () => res(null); document.head.appendChild(s);
  });
  const rows = () => IDX ? IDX.c.filter(r => isDev() || !r.d) : [];
  function score(r, qs) {
    const T = fold(r.t), A = fold([r.l, r.g, ...(r.p || [])].join(' ')), S = fold(r.s), I = fold(r.id);
    let s = 0;
    for (const q of qs) {
      if (T.includes(q)) s += T.startsWith(q) || T.includes(' ' + q) ? 10 : 6;
      else if (A.includes(q)) s += 4;
      else if (S.includes(q)) s += 2;
      else if (I.includes(q)) s += 1;
      else return 0;
    }
    if (r.u === here()) s += 3;
    return s;
  }
  function render() {
    const q = $('.cs-q', box).value.trim(), qs = fold(q).split(/\s+/).filter(Boolean), all = rows();
    const groups = ['all', ...new Set(all.map(r => r.g))];
    $('.cs-grp', box).innerHTML = groups.map(g => `<button type="button" data-g="${esc(g)}" class="${g === grp ? 'on' : ''}">${g === 'all' ? 'Tất cả' : esc(g)}</button>`).join('');
    $$('.cs-grp button', box).forEach(b => b.onclick = () => { grp = b.dataset.g; sel = 0; render(); $('.cs-q', box).focus(); });
    const pool = all.filter(r => grp === 'all' || r.g === grp);
    if (!qs.length) {
      const rc = recent().map(k => pool.find(r => r.u + '#' + r.id === k)).filter(Boolean);
      hits = rc.length ? rc : pool.filter(r => r.u === here()).slice(0, 30);
      $('.cs-head', box).textContent = rc.length ? 'Mở gần đây' : 'Chart trên trang này';
    } else {
      hits = pool.map(r => [score(r, qs), r]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0] || a[1].t.localeCompare(b[1].t)).slice(0, 80).map(x => x[1]);
      $('.cs-head', box).textContent = `${hits.length >= 80 ? '80+' : hits.length} chart khớp "${q}"`;
    }
    sel = Math.min(sel, Math.max(0, hits.length - 1));
    const hl = s => { let h = esc(s); qs.forEach(q => { const f = fold(s); let i = f.indexOf(q); if (i >= 0) { const raw = s.slice(i, i + q.length); h = h.replace(esc(raw), `<mark>${esc(raw)}</mark>`); } }); return h; };
    $('.cs-list', box).innerHTML = hits.length ? hits.map((r, i) => `<li class="${i === sel ? 'on' : ''}" data-i="${i}"><div class="cs-t">${hl(r.t)}</div>
      <div class="cs-p"><b>${esc(r.l)}</b>${(r.p || []).map(x => ' › ' + esc(x)).join('')}${r.u === here() ? ' <span class="cs-here">trang này</span>' : ''}${r.d ? ' <span class="cs-dev">developer</span>' : ''}</div>
      ${r.s ? `<div class="cs-s">${hl(r.s)}</div>` : ''}</li>`).join('') : `<li class="cs-none">${IDX ? 'Không tìm thấy chart nào. Thử từ khóa khác, ví dụ "NIM", "tỷ giá", "P/B".' : 'Chưa tải được mục lục chart.'}</li>`;
    $$('.cs-list li[data-i]', box).forEach(li => { li.onclick = () => go(hits[+li.dataset.i]); li.onmouseenter = () => { sel = +li.dataset.i; mark(); }; });
  }
  const mark = () => $$('.cs-list li[data-i]', box).forEach(li => li.classList.toggle('on', +li.dataset.i === sel));
  function go(r) {
    if (!r) return; pushRecent(r.u + '#' + r.id); close();
    if (r.u === here()) { reveal(r.id); return; }
    location.href = r.u + (r.u.includes('?') ? '&' : '?') + 'chart=' + encodeURIComponent(r.id);
  }
  async function open() {
    if (!box) build();
    box.hidden = false; document.body.classList.add('cs-open');
    const q = $('.cs-q', box); q.value = ''; sel = 0; q.focus();
    if (!IDX) { $('.cs-head', box).textContent = 'Đang tải mục lục chart…'; IDX = await loadIdx(); $('.cs-foot b', box).textContent = IDX ? IDX.c.filter(r => isDev() || !r.d).length : 0; }
    render();
  }
  function close() { if (box) { box.hidden = true; document.body.classList.remove('cs-open'); } }
  function build() {
    box = document.createElement('div'); box.className = 'cs-ov'; box.hidden = true;
    box.innerHTML = `<div class="cs-box" role="dialog" aria-label="Tìm chart">
      <div class="cs-top"><span class="cs-ic">🔍</span><input class="cs-q" type="search" placeholder="Tìm chart: NIM, tỷ giá, P/B, nợ xấu, SSI…" aria-label="Tìm chart" autocomplete="off"><button type="button" class="cs-x" aria-label="Đóng">Esc</button></div>
      <div class="cs-grp"></div><div class="cs-head"></div><ul class="cs-list"></ul>
      <div class="cs-foot"><span><b>0</b> chart · không phân biệt dấu · gõ nhiều từ để thu hẹp</span><span>↑↓ chọn · Enter mở · Esc đóng</span></div></div>`;
    document.body.appendChild(box);
    box.onclick = e => { if (e.target === box) close(); };
    $('.cs-x', box).onclick = close;
    const q = $('.cs-q', box);
    q.oninput = () => { sel = 0; render(); };
    q.onkeydown = e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, hits.length - 1); mark(); $('.cs-list li.on', box)?.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); mark(); $('.cs-list li.on', box)?.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter') { e.preventDefault(); go(hits[sel]); }
      else if (e.key === 'Escape') close();
    };
    const st = document.createElement('style');
    st.textContent = `.cs-btn{border:1px solid var(--line,#dfe3ec);background:#fff;color:var(--navy,#1D2678);border-radius:99px;padding:5px 12px;font:700 12px Arial,sans-serif;cursor:pointer;white-space:nowrap}
      .cs-btn kbd{font:600 10px Arial;color:#8a90a0;border:1px solid #dfe3ec;border-radius:4px;padding:0 4px;margin-left:6px}
      .cs-ov{position:fixed;inset:0;background:rgba(20,26,60,.35);z-index:1000;display:flex;justify-content:center;align-items:flex-start;padding:8vh 16px 16px}
      .cs-ov[hidden]{display:none}body.cs-open{overflow:hidden}
      .cs-box{background:#fff;width:min(760px,100%);max-height:80vh;border-radius:14px;box-shadow:0 20px 60px rgba(20,26,60,.3);display:flex;flex-direction:column;overflow:hidden;font-family:Arial,sans-serif}
      .cs-top{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #eef0f4}.cs-ic{font-size:16px}
      .cs-q{flex:1;border:0;outline:0;font:15px Arial;min-width:0}.cs-x{border:1px solid #dfe3ec;background:#f5f7fb;border-radius:6px;font:11px Arial;color:#5b6475;padding:3px 8px;cursor:pointer}
      .cs-grp{display:flex;gap:6px;flex-wrap:wrap;padding:10px 14px 0}.cs-grp button{border:1px solid #dfe3ec;background:#fff;border-radius:99px;padding:3px 10px;font:12px Arial;cursor:pointer}.cs-grp button.on{background:var(--navy,#1D2678);border-color:var(--navy,#1D2678);color:#fff}
      .cs-head{padding:10px 14px 4px;font:700 11px Arial;color:#8a90a0;text-transform:uppercase;letter-spacing:.05em}
      .cs-list{list-style:none;margin:0;padding:0 6px 6px;overflow:auto;flex:1}
      .cs-list li{padding:8px 10px;border-radius:8px;cursor:pointer}.cs-list li.on{background:#eef1fb}
      .cs-t{font:700 13.5px Arial;color:var(--navy,#1D2678)}.cs-p{font-size:12px;color:#3f4656;margin-top:2px}.cs-s{font-size:11.5px;color:#8a90a0;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .cs-list mark{background:#fff3c4;color:inherit;border-radius:2px}.cs-here{background:#e6f6f6;color:#1f8a8d;border-radius:99px;padding:0 6px;font-size:10.5px}.cs-dev{background:#fff1d6;color:#8a5a00;border-radius:99px;padding:0 6px;font-size:10.5px}
      .cs-none{color:#8a90a0;cursor:default!important}
      .cs-foot{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:8px 14px;border-top:1px solid #eef0f4;font-size:11px;color:#8a90a0}
      @media (max-width:600px){.cs-ov{padding:12px}.cs-btn kbd{display:none}.cs-foot span:last-child{display:none}}`;
    document.head.appendChild(st);
  }

  /* ---------- gắn nút + phím tắt; mở chart theo ?chart= ---------- */
  function mount() {
    const host = document.querySelector('.logo-right'); if (!host || $('.cs-btn')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'cs-btn'; b.title = 'Tìm chart trên toàn dashboard (Ctrl + K)';
    b.innerHTML = '🔍 Tìm chart<kbd>Ctrl K</kbd>'; b.onclick = open; host.prepend(b);
  }
  document.addEventListener('keydown', e => {
    const t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); box && !box.hidden ? close() : open(); }
    else if (e.key === '/' && !typing) { e.preventDefault(); open(); }
  });
  const init = () => {
    mount(); setTimeout(mount, 800);   // thanh trên cùng có nút do script khác chèn sau
    const id = new URLSearchParams(location.search).get('chart');
    if (id) setTimeout(() => { reveal(id); try { const u = new URL(location.href); u.searchParams.delete('chart'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) {} }, 700);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.FSCHART = { open, reveal };
})();
