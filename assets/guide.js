/* Database › Hướng dẫn xây dựng: đọc window.GUIDE (data/guide.js do scripts/build_guide.py dựng từ docs/huong-dan/*.md) */
(function () {
  const G = window.GUIDE, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tabs = $$('#tabbar button');
  const show = k => { tabs.forEach(b => { const on = b.dataset.tab === k; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    $$('main .pane').forEach(p => p.classList.toggle('active', p.id === k)); try { history.replaceState(null, '', '#' + k); } catch (e) {} };
  tabs.forEach(b => b.onclick = () => { show(b.dataset.tab); window.scrollTo({ top: 0 }); });
  const box = $('#guide'); if (!box) return;
  if (!G || !G.ch || !G.ch.length) { box.innerHTML = '<p class="muted">Hướng dẫn đang được biên soạn.</p>'; return; }
  box.innerHTML = `<h2 class="sec">Hướng dẫn xây dựng dashboard</h2>
    <p class="sec-sub">${esc(G.intro)} Cập nhật ${esc(G.built)} · ${G.ch.length} chương · ${G.ch.reduce((a, c) => a + c.h.length, 0)} mục.</p>
    <div class="gd">
      <aside class="gd-toc"><input id="gdQ" type="search" placeholder="Tìm trong hướng dẫn…" aria-label="Tìm trong hướng dẫn">
        <nav>${G.ch.map(c => `<details ${c.id === G.ch[0].id ? 'open' : ''}><summary><a href="#g-${c.id}" data-c="${c.id}">${esc(c.t)}</a></summary>${c.h.map(h => `<a href="#g-${h.id}" data-c="${c.id}" class="l${h.l}">${esc(h.t)}</a>`).join('')}</details>`).join('')}</nav></aside>
      <div class="gd-body" id="gdBody">${G.ch.map(c => `<article class="card gd-ch" id="g-${c.id}" data-c="${c.id}">${c.html}</article>`).join('')}<p class="muted" id="gdNone" hidden>Không tìm thấy.</p></div>
    </div>`;
  $$('.gd-toc a').forEach(a => a.onclick = e => { e.preventDefault(); const t = document.getElementById(a.getAttribute('href').slice(1)); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  const q = $('#gdQ'), arts = $$('.gd-ch');
  q.oninput = () => { const s = q.value.trim().toLowerCase(); let n = 0;
    arts.forEach(a => { if (!s) { a.hidden = false; $$('.gd-sec', a).forEach(x => x.hidden = false); n++; return; }
      const secs = $$('.gd-sec', a); let any = false; secs.forEach(x => { const m = x.textContent.toLowerCase().includes(s); x.hidden = !m; any = any || m; });
      a.hidden = !any; if (any) n++; });
    $('#gdNone').hidden = n > 0; };
  // chép khối code
  $$('.gd-body pre').forEach(pre => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost gd-cp'; b.textContent = 'Chép';
    b.onclick = async () => { try { await navigator.clipboard.writeText(pre.innerText.replace(/Chép$/, '')); b.textContent = 'Đã chép'; } catch (e) { b.textContent = 'Không chép được'; } setTimeout(() => b.textContent = 'Chép', 1500); }; pre.appendChild(b); });
  if ((location.hash || '').slice(1) === 'guide') show('guide');
})();
