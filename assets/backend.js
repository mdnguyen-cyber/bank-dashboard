/* Backend: danh mục chuỗi dữ liệu, nguồn, tần suất, lịch cập nhật và phương pháp (data/catalog.js do scripts/build_catalog.py tạo) */
(function () {
  const C = window.CATALOG, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const today = new Date();
  const toDate = x => { x = String(x || ''); let m;
    if ((m = x.match(/^(\d{4})-(\d{2})-(\d{2})/))) return new Date(+m[1], +m[2] - 1, +m[3]);
    if ((m = x.match(/^(\d{4})-(\d{2})$/))) return new Date(+m[1], +m[2], 0);
    if ((m = x.match(/^Q(\d)\/(\d{4})$/))) return new Date(+m[2], +m[1] * 3, 0);
    if ((m = x.match(/^(\d{2})\/(\d{2})\/(\d{4})$/))) return new Date(+m[3], +m[2] - 1, +m[1]);
    return null; };
  const fmt = x => { const d = toDate(x); if (!d) return x || '—'; const s = String(x); return /^\d{4}-\d{2}$/.test(s) ? `${s.slice(5)}/${s.slice(0, 4)}` : /^Q/.test(s) ? s : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  // trễ: so ngày mới nhất với tần suất (có độ trễ công bố thông thường)
  const LIM = { 'Ngày': 10, 'Tuần': 21, 'Tháng': 95, 'Quý': 200, 'Năm': 450 };
  const stale = r => { if (r.hist) return null; let d = toDate(r.to); const lim = LIM[r.f]; if (!d || !lim) return null; if (r.f === 'Tháng' && /-01$/.test(String(r.to))) d = new Date(d.getFullYear(), d.getMonth() + 1, 0); const age = (today - d) / 864e5; return age > lim ? Math.round(age) : 0; };
  const st = r => { if (r.hist) return '<span class="pill">Lịch sử</span>'; const a = stale(r); return a == null ? '<span class="muted">—</span>' : a ? `<span class="pill rs-bad">Trễ ${a} ngày</span>` : '<span class="pill rs-on">Mới</span>'; };
  if (!C) { $('#be').innerHTML = '<p>Chưa có danh mục dữ liệu.</p>'; return; }
  const all = C.groups.flatMap(g => g.series.map(r => ({ ...r, g })));
  const nStale = all.filter(r => stale(r)).length, nAuto = C.groups.filter(g => /^(auto|vira|sbv)$/.test(g.updKey)).reduce((a, g) => a + g.series.length, 0);
  const freqs = [...new Set(all.map(r => r.f))].filter(Boolean);
  const kpi = (l, v, s) => `<div class="kpi"><span>${l}</span><b>${v}</b><em>${s || ''}</em></div>`;
  $('#be').innerHTML = `
  <h2 class="sec">Backend · Dữ liệu và phương pháp</h2>
  <p class="sec-sub">Toàn bộ chuỗi dữ liệu dashboard đang dùng: nguồn, tần suất, kỳ mới nhất, cách cập nhật và công thức các chỉ số tự tính. Danh mục dựng lại mỗi lần chạy cập nhật số liệu (lần gần nhất ${esc(C.built)}).</p>
  <div class="kpis k4">${kpi('Số chuỗi dữ liệu', C.n.toLocaleString('vi-VN'), `${C.groups.length} nhóm`)}${kpi('Cập nhật tự động', nAuto.toLocaleString('vi-VN'), 'GitHub Actions, không cần AI')}${kpi('Qua Wi MCP', (C.n - nAuto).toLocaleString('vi-VN'), 'AI gọi trong phiên làm việc, rồi build')}${kpi('Chuỗi đang trễ', nStale, 'kỳ mới nhất cũ hơn mức thông thường của tần suất')}</div>

  <article class="card"><h3 class="sub">Quy trình cập nhật</h3>
    <div class="tscroll"><table><thead><tr><th>Quy trình</th><th>Lịch chạy</th><th>Các bước</th><th>Kết quả</th></tr></thead><tbody>
    ${C.pipes.map(p => `<tr><td style="white-space:nowrap"><b>${esc(p.n)}</b></td><td>${esc(p.when)}</td><td style="font-size:12.5px">${esc(p.what)}</td><td>${esc(p.out)}</td></tr>`).join('')}</tbody></table></div>
    <div class="note">Giờ Việt Nam. "Trễ" tính theo ngày mới nhất của chuỗi so với hôm nay: ngày > 10 ngày, tuần > 21 ngày, tháng > 95 ngày, quý > 200 ngày (đã tính độ trễ công bố thông thường). Chuỗi "Lịch sử" chỉ dùng để nối phần trước khi có chuỗi hiện hành.</div></article>

  <article class="card"><h3 class="sub">Danh mục chuỗi dữ liệu</h3>
    <div class="picker" style="flex-wrap:wrap;gap:8px">
      <input id="beQ" type="search" placeholder="Tìm tên, mã, nguồn…" style="padding:6px 10px;border:1px solid var(--line);border-radius:8px;min-width:220px">
      <select id="beG" style="padding:6px;border:1px solid var(--line);border-radius:8px"><option value="">Mọi nhóm</option>${C.groups.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select>
      <select id="beF" style="padding:6px;border:1px solid var(--line);border-radius:8px"><option value="">Mọi tần suất</option>${freqs.map(f => `<option>${esc(f)}</option>`).join('')}</select>
      <label style="font-size:13px"><input type="checkbox" id="beS"> Chỉ chuỗi đang trễ</label>
      <span class="muted" id="beN"></span>
    </div>
    <div id="beList"></div></article>

  <article class="card"><h3 class="sub">Phương pháp các chỉ số tự tính</h3>
    <div class="tscroll"><table><thead><tr><th>Chỉ số</th><th>Dùng ở</th><th>Công thức · phương pháp</th></tr></thead><tbody>
    ${C.methods.map(m => `<tr><td style="min-width:180px"><b>${esc(m.n)}</b></td><td style="min-width:150px">${esc(m.where)}</td><td>${esc(m.f)}</td></tr>`).join('')}
    ${C.groups.filter(g => g.method).map(g => `<tr><td style="min-width:180px"><b>${esc(g.name)}</b></td><td style="min-width:150px">${esc(g.page)}</td><td>${esc(g.method)}</td></tr>`).join('')}</tbody></table></div></article>`;
  const render = () => {
    const q = $('#beQ').value.trim().toLowerCase(), gi = $('#beG').value, fi = $('#beF').value, so = $('#beS').checked;
    let tot = 0;
    $('#beList').innerHTML = C.groups.filter(g => !gi || g.id === gi).map(g => {
      const rows = g.series.filter(r => (!fi || r.f === fi) && (!so || stale(r)) && (!q || `${r.n} ${r.k} ${r.src} ${g.name}`.toLowerCase().includes(q)));
      if (!rows.length) return ''; tot += rows.length;
      const ns = rows.filter(r => stale(r)).length;
      return `<details class="morex" ${gi || q || so ? 'open' : ''}><summary><b>${esc(g.name)}</b> · ${rows.length} chuỗi${ns ? ` · <span style="color:var(--neg)">${ns} trễ</span>` : ''}</summary>
        <dl class="bemeta"><dt>Dùng ở</dt><dd>${esc(g.page)}</dd><dt>Nguồn</dt><dd>${esc(g.src)}</dd><dt>Cập nhật</dt><dd>${esc(g.upd)}</dd><dt>File</dt><dd><code>${esc(g.file)}</code></dd>${g.method ? `<dt>Phương pháp</dt><dd>${esc(g.method)}</dd>` : ''}</dl>
        <div class="tscroll"><table class="betab"><thead><tr><th>Chuỗi</th><th>Mã</th><th>Nguồn</th><th>Tần suất</th><th>Từ</th><th>Mới nhất</th><th class="n">Số điểm</th><th>Trạng thái</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td>${esc(r.n)}</td><td><code>${esc(r.k)}</code></td><td style="font-size:12px">${esc(r.src)}</td><td>${esc(r.f)}</td><td style="white-space:nowrap">${fmt(r.from)}</td><td style="white-space:nowrap">${fmt(r.to)}</td><td class="n">${r.c != null ? Number(r.c).toLocaleString('vi-VN') : '—'}</td><td>${st(r)}</td></tr>`).join('')}</tbody></table></div></details>`;
    }).join('') || '<p class="muted">Không có chuỗi nào khớp bộ lọc.</p>';
    $('#beN').textContent = `${tot} chuỗi`;
  };
  ['#beQ', '#beG', '#beF', '#beS'].forEach(s => $(s).addEventListener('input', render));
  render();
})();
