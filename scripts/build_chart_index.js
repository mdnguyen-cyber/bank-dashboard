/* Mục lục chart toàn dashboard cho ô "Tìm chart" (assets/chartsearch.js).
   Mở từng trang bằng Chromium, dựng mọi tab (FSSHARE.prep), đọc mọi chart trong thẻ: mã, tiêu đề, dòng phụ, đường dẫn tab › tab con.
   Dùng: node scripts/build_chart_index.js [thư mục site, mặc định repo] → <site>/data/chart-index.js (window.CHART_INDEX)
   Biến môi trường: CHARTJS_LOCAL (chart.umd.js thay cho cdnjs khi chạy offline), PLAYWRIGHT_PATH. */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const SITE = path.resolve(process.argv[2] || path.join(__dirname, '..')), PORT = 8791;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  const f = path.join(SITE, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b); } });
});
// trang (file, nhãn, nhóm, chỉ developer?)
const BANKS = [['index', 'CTG'], ['vcb', 'VCB'], ['bid', 'BID'], ['tcb', 'TCB'], ['mbb', 'MBB'], ['acb', 'ACB'], ['stb', 'STB'], ['vpb', 'VPB'], ['hdb', 'HDB']];
const FIN = ['BVH', 'PVI', 'MIG', 'BMI', 'BIC', 'PTI', 'SSI', 'TCX', 'VCK', 'VPX', 'HCM', 'VCI', 'MBS', 'VND', 'SHS'];
const PAGES = [['vimo.html', 'Vĩ mô', 'Vĩ mô', 0], ['nganh.html', 'Ngành Ngân hàng', 'Ngành Ngân hàng', 0],
  ...BANKS.filter(([f]) => fs.existsSync(path.join(SITE, f + '.html'))).map(([f, t]) => [f + '.html', t, 'Cổ phiếu ngân hàng', 0]),
  ['bh.html', 'Ngành Bảo hiểm', 'Bảo hiểm · Chứng khoán', 1], ['ck.html', 'Ngành Chứng khoán', 'Bảo hiểm · Chứng khoán', 1],
  ...FIN.map(s => [`dn.html?s=${s}`, s, 'Bảo hiểm · Chứng khoán', 1])];

(async () => {
  await new Promise(r => srv.listen(PORT, r));
  const b = await chromium.launch(), out = [];
  for (const [url, label, group, dev] of PAGES) {
    const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
    p.on('dialog', d => d.dismiss());
    if (process.env.CHARTJS_LOCAL) await p.route(/cdnjs.*chart/i, r => r.fulfill({ path: process.env.CHARTJS_LOCAL, contentType: 'application/javascript' }));
    await p.addInitScript(() => { try { localStorage.setItem('fsDevView', '1'); } catch (e) {} });
    try {
      await p.goto(`http://localhost:${PORT}/${url}`, { waitUntil: 'load' }); await p.waitForTimeout(1500);
      const rows = await p.evaluate(() => {
        try { window.FSSHARE && FSSHARE.prep(); } catch (e) {}
        const txt = e => e ? e.textContent.replace(/\s+/g, ' ').trim() : '';
        const seen = new Set(), R = [];
        document.querySelectorAll('article.card canvas[id]').forEach(cv => {
          const id = cv.id; if (seen.has(id) || /^cb-/.test(id) || cv.closest('#book,#vmx,[hidden].keep-hidden')) return;
          const c = cv.closest('article.card'), h = c.querySelector(':scope > h3.sub, :scope h3.sub, :scope .fsn-head h3');
          const clean = e => { if (!e) return ''; const k = e.cloneNode(true); k.querySelectorAll('*').forEach(x => { if (x.parentNode && (x.matches('button') || x.textContent.trim().length <= 2)) x.remove(); }); return txt(k).replace(/^[⠿\s]+/, ''); };
          const t = clean(h) || cv.getAttribute('aria-label') || ''; if (!t) return;
          // card nhiều chart: lấy nhãn riêng của chart (dòng chữ ngay trên khung chart, hoặc aria-label)
          const box = cv.closest('.cbox'), prev = box && box.previousElementSibling, own = prev && prev.matches('p.chart-sub') && c.querySelectorAll('canvas').length > 1 ? txt(prev) : '';
          const al = cv.getAttribute('aria-label') || '', t2 = own || (c.querySelectorAll('canvas').length > 1 && al && al !== t ? al : '');
          seen.add(id);
          let path = []; try { path = window.FSSHARE && FSSHARE.path ? FSSHARE.path(c) : []; } catch (e) {}
          if (!path.length) { const pane = c.closest('.pane'), tb = pane && document.querySelector(`#tabbar [data-tab="${pane.id}"]`); if (tb) path = [txt(tb)]; }
          R.push({ id, t: (t2 ? `${t} · ${t2}` : t).slice(0, 160), s: (own ? '' : txt(c.querySelector('.chart-sub'))).slice(0, 160), p: path.map(x => x.replace(/^\d+\.\s*/, '')) });
        });
        return R;
      });
      const dd = new Set();   // card nhiều chart cùng tiêu đề: giữ một dòng (mở tới chart đầu của card)
      rows.filter(r => { const k = r.t + '|' + r.p.join('›'); if (dd.has(k)) return false; dd.add(k); return true; }).forEach(r => out.push({ u: url, l: label, g: group, d: dev, ...r }));
      console.log(`  ${url}: ${rows.length} chart`);
    } catch (e) { console.warn('  lỗi', url, e.message); }
    await p.close();
  }
  await b.close(); srv.close();
  const js = 'window.CHART_INDEX=' + JSON.stringify({ built: new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10), n: out.length, c: out }) + ';\n';
  fs.mkdirSync(path.join(SITE, 'data'), { recursive: true });
  fs.writeFileSync(path.join(SITE, 'data', 'chart-index.js'), js);
  console.log('data/chart-index.js', out.length, 'chart,', Math.round(js.length / 1024), 'KB');
})();
