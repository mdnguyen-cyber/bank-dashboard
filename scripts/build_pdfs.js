/* Dựng sẵn PDF (chữ thật, in bằng Chrome) cho mọi tab và tab con của dashboard, dùng khi deploy.
   Dùng: node scripts/build_pdfs.js <thư mục _site> [cổng]
   Ghi <site>/pdf/<khoá>.pdf và <site>/pdf/index.json; khoá lấy từ window.FSPDF.key() (assets/chartkit.js) để nút "Xuất PDF" tìm đúng file.
   Biến môi trường (chạy thử offline): CHROMIUM_PATH, CHARTJS_LOCAL (đường dẫn chart.umd.js thay cho cdnjs), PDF_PAGES (vd "nganh,index"), PDF_CONC. */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const SITE = path.resolve(process.argv[2] || '_site'), PORT = +(process.argv[3] || 8790);
const OUT = path.join(SITE, 'pdf'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  const f = path.join(SITE, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b); } });
});
const PAGES = (process.env.PDF_PAGES || fs.readdirSync(SITE).filter(f => f.endsWith('.html')).map(f => f.replace('.html', '')).join(',')).split(',');
const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);   // giờ Việt Nam
const files = {};

async function newPage(browser) {
  const p = await browser.newPage({ viewport: { width: 1008, height: 1300 }, deviceScaleFactor: 3 });
  p.on('pageerror', e => console.warn('  lỗi trang:', e.message));
  p.on('dialog', d => d.dismiss());
  if (process.env.CHARTJS_LOCAL) await p.route('**/chart.umd.min.js', r => r.fulfill({ path: process.env.CHARTJS_LOCAL, contentType: 'application/javascript' }));
  return p;
}
async function printState(browser, pg, tab, clicks) {
  const p = await newPage(browser);
  await p.goto(`http://localhost:${PORT}/${pg}.html`, { waitUntil: 'load' }); await p.waitForTimeout(1200);
  await p.click(`.tabs [data-tab="${tab}"]`); await p.waitForTimeout(800);
  for (const [gi, bi] of clicks) {
    await p.evaluate(([gi, bi]) => FSPDF.groups()[gi].querySelectorAll('button')[bi].click(), [gi, bi]); await p.waitForTimeout(700);
  }
  const key = await p.evaluate(() => FSPDF.key());
  if (!key || files[key]) { await p.close(); return; }
  await p.evaluate(() => FSPDF.prep()); await p.waitForTimeout(500);
  const title = await p.evaluate(() => FSPDF.label());
  await p.pdf({ path: path.join(OUT, key + '.pdf'), format: 'A4', landscape: false, scale: 0.75, printBackground: true, preferCSSPageSize: false,
    margin: { top: '5mm', bottom: '8mm', left: '5mm', right: '5mm' }, displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font:8px Arial;color:#8a90a0;width:100%;text-align:right;padding-right:5mm">FinSuccess | <span class="pageNumber"></span>/<span class="totalPages"></span></div>' });
  files[key] = { page: pg, label: title };
  console.log('  ✓', key);
  await p.close();
}
// Liệt kê mọi trạng thái: tab chính × các nhóm tab con hiện ra lần lượt (nhóm con lồng nhau được mở theo nhóm cha)
async function states(browser, pg) {
  const p = await newPage(browser);
  await p.goto(`http://localhost:${PORT}/${pg}.html`, { waitUntil: 'load' }); await p.waitForTimeout(1200);
  const tabs = await p.$$eval('.tabs [data-tab]', bs => bs.map(b => b.dataset.tab));
  const out = [];
  for (const tab of tabs) {
    await p.click(`.tabs [data-tab="${tab}"]`); await p.waitForTimeout(600);
    const rec = async (clicks) => {
      const gi = clicks.length, n = await p.evaluate(gi => { const g = FSPDF.groups()[gi]; return g ? g.querySelectorAll('button').length : 0; }, gi);
      if (!n) { out.push([tab, clicks]); return; }
      for (let bi = 0; bi < n; bi++) {
        await p.evaluate(([gi, bi]) => FSPDF.groups()[gi].querySelectorAll('button')[bi].click(), [gi, bi]); await p.waitForTimeout(250);
        await rec([...clicks, [gi, bi]]);
      }
    };
    await rec([]);
  }
  await p.close();
  return out;
}
(async () => {
  await new Promise(r => srv.listen(PORT, r));
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const pg of PAGES) {
    const st = await states(browser, pg);
    console.log(`${pg}: ${st.length} trạng thái`);
    const q = st.slice(), conc = +(process.env.PDF_CONC || 4);
    await Promise.all(Array.from({ length: conc }, async () => { while (q.length) { const [tab, clicks] = q.shift(); try { await printState(browser, pg, tab, clicks); } catch (e) { console.log(`::warning title=PDF lỗi::${pg} ${tab} ${JSON.stringify(clicks)} ${e.message.split('\n')[0]}`); } } }));
  }
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ built: today, files }));
  console.log(`Xong: ${Object.keys(files).length} file PDF`);
  await browser.close(); srv.close();
})();
