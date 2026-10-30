/* Lịch công bố BCTC quý (ngày đăng trên HOSE): thanh nhỏ dưới tiêu đề trang — đã công bố chưa, so với ngày thường lệ, cảnh báo khi trễ hơn mọi năm. */
(function () {
  const R = window.RPT_DATES; if (!R) return;
  const G = { bank: ['VCB', 'BID', 'CTG', 'TCB', 'MBB', 'ACB', 'STB', 'VPB', 'HDB'], ck: ['SSI', 'VCI', 'HCM', 'VND', 'MBS', 'SHS', 'VCK', 'VPX', 'TCX'], bh: ['BVH', 'PVI', 'MIG', 'BMI', 'BIC', 'PTI'] };
  const file = (location.pathname.split('/').pop() || 'index.html').replace('.html', '');
  const qs = new URLSearchParams(location.search);
  const one = file === 'dn' ? (qs.get('s') || 'SSI').toUpperCase() : file === 'index' ? 'CTG' : G.bank.includes(file.toUpperCase()) ? file.toUpperCase() : null;
  const grp = file === 'nganh' ? G.bank : file === 'ck' ? G.ck : file === 'bh' ? G.bh : null;
  if (!one && !grp) return;
  const D = s => new Date(s + 'T00:00:00'), day = 864e5, today = new Date(); today.setHours(0, 0, 0, 0);
  const qEnd = p => { const y = +p.slice(0, 4), q = +p.slice(5); return new Date(y, q * 3, 0); };
  const pOf = d => { const q = Math.floor(d.getMonth() / 3); return q ? `${d.getFullYear()}Q${q}` : `${d.getFullYear() - 1}Q4`; };
  const cur = pOf(today), qe = qEnd(cur), t = Math.round((today - qe) / day);
  const dm = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  const lbl = p => `Q${p.slice(5)}/${p.slice(0, 4)}`;
  if (t > 60) return;   // ngoài mùa BCTC quý
  function st(s) {
    const c = R.cos[s]; if (!c) return { s, na: 1 };
    const offs = Object.entries(c.q).filter(([p]) => p < cur).slice(-6).map(([p, d]) => Math.round((D(d) - qEnd(p)) / day)).filter(x => x >= 0 && x < 120).sort((a, b) => a - b);
    if (!offs.length) return { s, na: 1 };
    const med = offs[Math.floor(offs.length / 2)], max = offs[offs.length - 1], exp = new Date(qe.getTime() + med * day);
    const got = c.q[cur];
    if (got) { const off = Math.round((D(got) - qe) / day), df = off - med; return { s, got: D(got), off, med, df, k: df >= 3 ? 'warn' : 'ok' }; }
    return { s, exp, med, max, k: t > max ? 'late' : t >= med ? 'due' : 'wait', over: t - med };
  }
  const txt = x => x.na ? `${x.s}: chưa có lịch sử trên HOSE`
    : x.got ? `${x.s}: đã công bố ${dm(x.got)}${x.df >= 3 ? ` · muộn ${x.df} ngày so với thường lệ` : x.df <= -3 ? ` · sớm ${-x.df} ngày` : ''}`
    : x.k === 'late' ? `${x.s}: chưa công bố · trễ hơn mọi năm (thường ${dm(x.exp)}, muộn nhất ngày thứ ${x.max} sau quý)`
    : x.k === 'due' ? `${x.s}: chưa công bố · thường ra ${dm(x.exp)}${x.over > 0 ? `, đã quá ${x.over} ngày` : ''}`
    : `${x.s}: dự kiến ${dm(x.exp)}`;
  const css = document.createElement('style');
  css.textContent = `.rptbar{background:var(--card,#fff);border-bottom:1px solid var(--line,#e6e9f0);font-size:12.5px}
.rptbar .wrap{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;padding-top:6px;padding-bottom:6px}
.rptbar b{color:var(--navy,#1D2678)}.rpt{padding:2px 8px;border-radius:10px;background:#eef1f7;color:#3a4256;white-space:nowrap}
.rpt.ok{background:#e7f5ee;color:#1e8f5a}.rpt.warn,.rpt.due{background:#fff4d6;color:#8a6500}.rpt.late{background:#fde8e6;color:#c0392b;font-weight:700}
@media print{.rptbar{display:none}}`;
  document.head.appendChild(css);
  const list = (one ? [one] : grp).map(st);
  const bar = document.createElement('div'); bar.className = 'rptbar';
  const head = one ? `<b>BCTC ${lbl(cur)}</b>` : `<b>BCTC ${lbl(cur)}</b> <span class="muted">${list.filter(x => x.got).length}/${list.filter(x => !x.na).length} đã công bố</span>`;
  const order = { late: 0, due: 1, warn: 2, wait: 3, ok: 4 };
  bar.innerHTML = `<div class="wrap">${head}${list.filter(x => !x.na || one).sort((a, b) => (order[a.k] ?? 5) - (order[b.k] ?? 5)).map(x => `<span class="rpt ${x.k || ''}" title="Ngày đăng trên HOSE; thường lệ = trung vị 6 quý gần nhất">${txt(x)}</span>`).join('')}</div>`;
  const anchor = document.querySelector('.stock-head') || document.querySelector('.logo-bar');
  if (anchor) anchor.after(bar);
})();
