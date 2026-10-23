/* Lịch kinh tế: dải dọc bên phải → ngăn kéo (đẩy nội dung trên màn rộng, tấm trượt dưới lên trên điện thoại).
   Dữ liệu: window.CAL_DATA (scripts/build_calendar.py). Giờ hiển thị theo giờ Việt Nam. */
(function () {
  const CAL = window.CAL_DATA; if (!CAL || !CAL.ev) return;
  const TZ = 'Asia/Ho_Chi_Minh', NOW = () => Date.now(), DAY = 864e5;
  const LS = 'fs-cal';
  const CTY = { USD: ['US', 'Mỹ'], VND: ['VN', 'Việt Nam'], EUR: ['EU', 'Khu vực euro'], GBP: ['UK', 'Anh'], JPY: ['JP', 'Nhật Bản'], CNY: ['CN', 'Trung Quốc'], CAD: ['CA', 'Canada'], AUD: ['AU', 'Úc'], NZD: ['NZ', 'New Zealand'], CHF: ['CH', 'Thụy Sĩ'], All: ['Toàn cầu', 'Toàn cầu'] };
  const GRP = [['us', 'Mỹ', ['USD']], ['vn', 'Việt Nam', ['VND']], ['eu', 'EU / Anh', ['EUR', 'GBP']], ['as', 'Nhật, Trung Quốc', ['JPY', 'CNY']], ['ot', 'Khác', null]];
  const grpOf = c => (GRP.find(g => g[2] && g[2].includes(c)) || GRP[4])[0];
  /* tên tiếng Việt (giữ thuật ngữ gốc trong ngoặc khi cần) */
  const NAME = [
    [/^Federal Funds Rate$/, 'Fed quyết định lãi suất (FOMC)'], [/^Main Refinancing Rate$/, 'ECB quyết định lãi suất'], [/^Official Bank Rate$/, 'BoE quyết định lãi suất'], [/^BOJ Policy Rate$/, 'BOJ quyết định lãi suất'],
    [/^FOMC Statement$/, 'Tuyên bố của FOMC'], [/^FOMC Press Conference$/, 'Họp báo sau cuộc họp FOMC'], [/^FOMC Meeting Minutes$/, 'Biên bản họp FOMC'], [/^ECB Press Conference$/, 'Họp báo ECB'],
    [/^Core CPI m\/m$/, 'CPI lõi m/m'], [/^Core CPI y\/y$/, 'CPI lõi y/y'], [/^Median CPI y\/y$/, 'CPI trung vị y/y'], [/^Trimmed CPI y\/y$/, 'CPI cắt đuôi (trimmed) y/y'], [/^Common CPI y\/y$/, 'CPI thành phần chung (common) y/y'],
    [/^CPI Flash Estimate y\/y$/, 'CPI sơ bộ y/y'], [/^Core CPI Flash Estimate y\/y$/, 'CPI lõi sơ bộ y/y'], [/^CPI y\/y · GDP quý$/, 'CPI y/y, kèm GDP quý'],
    [/^Non-Farm Employment Change$/, 'Việc làm phi nông nghiệp (NFP)'], [/^Unemployment Rate$/, 'Tỷ lệ thất nghiệp'], [/^Unemployment Claims$/, 'Đơn xin trợ cấp thất nghiệp lần đầu'],
    [/^Average Hourly Earnings m\/m$/, 'Thu nhập bình quân theo giờ m/m'], [/^Average Earnings Index 3m\/y$/, 'Thu nhập bình quân (3 tháng, y/y)'], [/^JOLTS Job Openings$/, 'Số việc làm trống (JOLTS)'], [/^Employment Change$/, 'Thay đổi số việc làm'],
    [/^Core PCE Price Index m\/m$/, 'PCE lõi m/m'], [/^Advance GDP q\/q$/, 'GDP sơ bộ q/q'], [/^Prelim GDP q\/q$/, 'GDP ước tính lần 2 q/q'], [/^Final GDP q\/q$/, 'GDP chính thức q/q'], [/^GDP q\/q$/, 'GDP q/q'],
    [/^Core PPI m\/m$/, 'PPI lõi m/m'], [/^Retail Sales m\/m$/, 'Doanh số bán lẻ m/m'], [/^Core Retail Sales m\/m$/, 'Doanh số bán lẻ lõi m/m'],
    [/^ISM Manufacturing PMI$/, 'PMI sản xuất ISM'], [/^ISM Services PMI$/, 'PMI dịch vụ ISM'],
    [/^Flash Manufacturing PMI$/, 'PMI sản xuất sơ bộ'], [/^Flash Services PMI$/, 'PMI dịch vụ sơ bộ'],
    [/^French Flash (\w+) PMI$/, (m, k) => `Pháp: PMI ${k === 'Services' ? 'dịch vụ' : 'sản xuất'} sơ bộ`], [/^German Flash (\w+) PMI$/, (m, k) => `Đức: PMI ${k === 'Services' ? 'dịch vụ' : 'sản xuất'} sơ bộ`],
    [/^Revised UoM Consumer Sentiment$/, 'Niềm tin tiêu dùng ĐH Michigan (điều chỉnh)'], [/^Prelim UoM Consumer Sentiment$/, 'Niềm tin tiêu dùng ĐH Michigan (sơ bộ)'],
    [/^Revised UoM Inflation Expectations$/, 'Kỳ vọng lạm phát ĐH Michigan (điều chỉnh)'], [/^Prelim UoM Inflation Expectations$/, 'Kỳ vọng lạm phát ĐH Michigan (sơ bộ)'],
    [/^(.+) Speaks$/, (m, w) => `${w.replace(/^Fed Chair/, 'Chủ tịch Fed').replace(/^BOE Gov/, 'Thống đốc BoE').replace(/^ECB President/, 'Chủ tịch ECB').replace(/^BOJ Gov/, 'Thống đốc BOJ')} phát biểu`],
  ];
  const vname = t => { for (const [rx, v] of NAME) { const m = t.match(rx); if (m) return typeof v === 'function' ? v(...m) : v; } return t; };
  /* giải thích ngắn theo nhóm tin */
  const WHY = [
    [/Federal Funds Rate|FOMC/, 'Lãi suất Fed quyết định mặt bằng lãi suất USD. Fed giữ lãi suất cao hoặc tăng thì chênh lệch lãi suất VND − USD hẹp lại, tạo áp lực lên tỷ giá USD/VND và thu hẹp dư địa nới lỏng của NHNN. Dự báo lấy theo xác suất cao nhất của CME FedWatch.'],
    [/CPI|PCE|PPI/, 'Lạm phát cao hơn dự báo khiến thị trường kỳ vọng ngân hàng trung ương giữ lãi suất cao lâu hơn: lợi suất trái phiếu và đồng nội tệ thường tăng ngay sau khi công bố. Với Việt Nam, CPI là căn cứ chính để NHNN điều hành lãi suất và tín dụng.'],
    [/Employment|Unemployment|Earnings|JOLTS|Claims/, 'Thị trường lao động là trụ cột thứ hai trong nhiệm vụ của Fed. Việc làm tăng mạnh và tiền lương tăng nhanh làm giảm khả năng Fed hạ lãi suất, hỗ trợ USD; ngược lại, thất nghiệp tăng làm tăng kỳ vọng nới lỏng.'],
    [/Main Refinancing|ECB/, 'Quyết định của ECB tác động trực tiếp tới EUR/USD và qua đó tới chỉ số DXY; EUR chiếm khoảng 58% rổ DXY.'],
    [/BOJ/, 'BOJ tăng lãi suất thu hẹp chênh lệch lợi suất Mỹ – Nhật, có thể kích hoạt dòng vốn đảo chiều giao dịch chênh lệch lãi suất (carry trade) và làm JPY mạnh lên nhanh.'],
    [/Official Bank Rate|BOE/, 'Quyết định của BoE tác động tới GBP và kỳ vọng lãi suất chung của các nước phát triển.'],
    [/PMI/, 'PMI trên 50 là mở rộng, dưới 50 là thu hẹp. Đây là số liệu sớm nhất của mỗi tháng nên thường làm thị trường biến động mạnh khi lệch xa dự báo.'],
    [/Retail Sales/, 'Doanh số bán lẻ phản ánh sức tiêu dùng, thành phần lớn nhất của GDP các nước phát triển.'],
    [/GDP/, 'GDP cho biết tốc độ tăng trưởng của nền kinh tế; chênh lệch so với dự báo ảnh hưởng tới kỳ vọng lãi suất.'],
    [/UoM/, 'Khảo sát của Đại học Michigan về tâm lý và kỳ vọng lạm phát của hộ gia đình Mỹ; kỳ vọng lạm phát được Fed theo dõi sát.'],
  ];
  const why = e => e.note || ((WHY.find(([rx]) => rx.test(e.t)) || [])[1]) || '';
  /* chart liên quan trên dashboard ngành */
  const LINK = [
    ['USD', /^(Core )?CPI/, { id: 'gUsCpi', p: 'intl', c: 'us', n: 'CPI Mỹ' }], ['USD', /PPI/, { id: 'gUsPpi', p: 'intl', c: 'us', n: 'PPI Mỹ' }], ['USD', /PCE/, { id: 'gUsPce', p: 'intl', c: 'us', n: 'PCE Mỹ' }],
    ['USD', /Employment|Unemployment|Earnings|JOLTS|Claims/, { id: 'gUsJobs', p: 'intl', c: 'us', n: 'Thị trường lao động Mỹ' }], ['USD', /Federal Funds Rate|FOMC/, { id: 'gFedPath', p: 'intl', c: 'us', n: 'Kỳ vọng lãi suất Fed' }],
    ['EUR', /CPI/, { id: 'gEaHicp', p: 'intl', c: 'ea', n: 'Lạm phát khu vực euro' }], ['EUR', /Main Refinancing|ECB/, { id: 'gEaRate', p: 'intl', c: 'ea', n: 'Lãi suất ECB' }],
    ['JPY', /BOJ/, { id: 'gJpRate', p: 'intl', c: 'jp', n: 'Lãi suất BOJ' }], ['JPY', /CPI/, { id: 'gJpCpi', p: 'intl', c: 'jp', n: 'Lạm phát Nhật' }], ['CNY', /CPI|PPI/, { id: 'gCnPx', p: 'intl', c: 'cn', n: 'CPI và PPI Trung Quốc' }],
    ['VND', /CPI/, { id: 'chCpi', p: 'dom', n: 'Lạm phát Việt Nam' }],
  ];
  const linkOf = e => (LINK.find(([c, rx]) => c === e.c && rx.test(e.t)) || [])[2];

  const EV = CAL.ev.map(e => ({ ...e, ts: Date.parse(e.d.replace('Z', ':00Z')) })).sort((a, b) => a.ts - b.ts);
  const fmt = (ts, o) => new Intl.DateTimeFormat('vi-VN', Object.assign({ timeZone: TZ }, o)).format(new Date(ts));
  const hm = ts => fmt(ts, { hour: '2-digit', minute: '2-digit', hour12: false });
  const dkey = ts => fmt(ts, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const num = s => { if (!s) return null; const v = parseFloat(String(s).replace(/[%KMBT,]/g, '')); return isNaN(v) ? null : v; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const vn = s => s ? String(s).replace(/(\d)\.(\d)/g, '$1,$2') : '';

  let st = { open: false, range: 'w', from: '', to: '', imp: { H: true, M: false }, g: { us: true, vn: true, eu: true, as: true, ot: false }, exp: null };
  try { Object.assign(st, JSON.parse(localStorage.getItem(LS) || '{}')); st.exp = null; } catch (e) {}
  const save = () => { try { localStorage.setItem(LS, JSON.stringify({ open: st.open, range: st.range, from: st.from, to: st.to, imp: st.imp, g: st.g })); } catch (e) {} };

  /* ---------- khung ---------- */
  const rail = document.createElement('button'); rail.type = 'button'; rail.className = 'cal-rail'; rail.title = 'Lịch kinh tế (phím C)';
  rail.innerHTML = '<span class="cal-ico">▦</span><span class="cal-rl">Lịch kinh tế</span><span class="cal-badge" hidden></span>';
  const dr = document.createElement('aside'); dr.className = 'cal-drawer'; dr.setAttribute('aria-label', 'Lịch kinh tế');
  dr.innerHTML = `<div class="cal-hd"><div><b>Lịch kinh tế</b><small>Giờ Việt Nam · cập nhật ${(t => hm(t) + ' ' + dkey(t).slice(0, 5))(Date.parse(CAL.built.replace('Z', ':00Z')))}</small></div><button type="button" class="cal-x" aria-label="Đóng">×</button></div>
    <div class="cal-ctl">
      <div class="cal-chips" data-k="range"><button type="button" data-v="w">±1 tuần</button><button type="button" data-v="m">±1 tháng</button><button type="button" data-v="c">Tùy chọn</button></div>
      <div class="cal-custom" hidden><label>Từ <input type="date" data-k="from"></label><label>Đến <input type="date" data-k="to"></label></div>
      <div class="cal-chips sm" data-k="imp"><button type="button" data-v="H"><i class="cal-dot H"></i>Cao</button><button type="button" data-v="M"><i class="cal-dot M"></i>Trung bình</button></div>
      <div class="cal-chips sm" data-k="g">${GRP.map(([k, l]) => `<button type="button" data-v="${k}">${l}</button>`).join('')}</div>
    </div>
    <div class="cal-list" tabindex="0"></div>
    <div class="cal-ft">Lịch, dự báo và kỳ trước: Forex Factory; FOMC: CME FedWatch; số thực tế: BLS, BEA, ECB, NBS, Cục Thống kê. Tin ghi "dự kiến" là lịch chưa xác nhận.</div>`;
  document.body.append(rail, dr);
  const list = dr.querySelector('.cal-list');

  function range() {
    const n = NOW();
    if (st.range === 'm') return [n - 30 * DAY, n + 30 * DAY];
    if (st.range === 'c' && st.from && st.to) return [Date.parse(st.from + 'T00:00:00+07:00'), Date.parse(st.to + 'T23:59:59+07:00')];
    return [n - 7 * DAY, n + 7 * DAY];
  }
  const pass = e => st.imp[e.i] && st.g[grpOf(e.c)];
  function cmp(e) {
    const a = num(e.a), f = num(e.f); if (a == null || f == null || a === f) return '';
    return a > f ? '<span class="cal-up" title="Cao hơn dự báo">▲</span>' : '<span class="cal-dn" title="Thấp hơn dự báo">▼</span>';
  }
  function left(ts) { const m = Math.round((ts - NOW()) / 6e4); if (m < 0 || m > 1440) return ''; return m < 60 ? `còn ${m} phút` : `còn ${Math.floor(m / 60)} giờ ${m % 60 ? (m % 60) + "'" : ''}`; }
  function spark(e) {
    const h = EV.filter(x => x.c === e.c && x.t === e.t && x.ts <= e.ts && num(x.a) != null).slice(-12); if (h.length < 3) return '';
    const vs = h.flatMap(x => [num(x.a), num(x.f)]).filter(v => v != null), lo = Math.min(...vs), hi = Math.max(...vs), W = 300, H = 70, P = 6;
    const X = i => P + i * (W - 2 * P) / (h.length - 1), Y = v => H - P - (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (H - 2 * P);
    const line = h.map((x, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(num(x.a)).toFixed(1)}`).join('');
    const fc = h.map((x, i) => num(x.f) == null ? '' : `<circle cx="${X(i).toFixed(1)}" cy="${Y(num(x.f)).toFixed(1)}" r="2.6" class="f"/>`).join('');
    return `<svg class="cal-spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Lịch sử thực tế so với dự báo"><path d="${line}" class="a"/>${h.map((x, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(num(x.a)).toFixed(1)}" r="2.4" class="ad"/>`).join('')}${fc}</svg>
      <div class="cal-leg"><span><i class="la"></i>Thực tế</span><span><i class="lf"></i>Dự báo</span><span>${h.length} kỳ gần nhất: ${vn(h[0].a)} → ${vn(h[h.length - 1].a)}</span></div>`;
  }
  function row(e, k) {
    const lk = linkOf(e), cc = CTY[e.c] || [e.c, e.c], past = e.ts <= NOW(), name = vname(e.t), orig = name !== e.t ? e.t : '';
    const open = st.exp === k;
    return `<div class="cal-ev${past ? ' past' : ''}${open ? ' open' : ''}" data-k="${k}">
      <button type="button" class="cal-row" aria-expanded="${open}">
        <span class="cal-t">${hm(e.ts)}${e.est && !past ? '<em>dự kiến</em>' : ''}</span>
        <span class="cal-c" title="${esc(cc[1])}">${esc(cc[0])}</span>
        <span class="cal-n"><i class="cal-dot ${e.i}"></i>${esc(name)}${left(e.ts) ? `<small class="cal-left">${left(e.ts)}</small>` : ''}</span>
        <span class="cal-v"><span><small>Thực tế</small><b>${e.a ? vn(e.a) + (e.ap ? '<sup title="Theo số kỳ trước của lần công bố sau, có thể đã điều chỉnh">*</sup>' : '') + cmp(e) : '–'}</b></span><span><small>Dự báo</small>${vn(e.f) || '–'}</span><span><small>Kỳ trước</small>${vn(e.p) || '–'}</span></span>
      </button>
      ${open ? `<div class="cal-more">${orig ? `<p class="cal-orig">${esc(orig)} · ${esc(cc[1])}${e.per ? ' · kỳ ' + e.per.split('-').reverse().join('/') : ''}</p>` : ''}${e.fw ? `<p><b>CME FedWatch:</b> khả năng cao nhất ${esc(e.fw)}</p>` : ''}<p>${esc(why(e))}</p>${spark(e)}${lk ? `<button type="button" class="cal-go" data-go="${k}">→ Xem chart: ${esc(lk.n)}</button>` : ''}</div>` : ''}
    </div>`;
  }
  let VIEW = [];
  function render(scroll) {
    const [a, b] = range(); VIEW = EV.filter(e => e.ts >= a && e.ts <= b && pass(e));
    const n = NOW(); let html = '', day = '', nowDone = false;
    VIEW.forEach((e, i) => {
      const dk = dkey(e.ts);
      if (!nowDone && e.ts > n) { html += '<div class="cal-now"><span>Bây giờ ' + hm(n) + '</span></div>'; nowDone = true; }
      if (dk !== day) { day = dk; const today = dk === dkey(n); html += `<div class="cal-day${today ? ' today' : ''}">${fmt(e.ts, { weekday: 'long', day: '2-digit', month: '2-digit' })}${today ? ' · hôm nay' : ''}</div>`; }
      html += row(e, i);
    });
    if (!nowDone) html += '<div class="cal-now"><span>Bây giờ ' + hm(n) + '</span></div>';
    if (!VIEW.length) html = '<p class="cal-empty">Không có tin nào trong khoảng và bộ lọc đã chọn.</p>';
    const ff0 = CAL.ff0 ? Date.parse(CAL.ff0.replace('Z', ':00Z')) : null;
    if (ff0 && a < ff0) html = `<p class="cal-note">Lịch đầy đủ kèm dự báo (consensus) được lưu từ tuần ${dkey(ff0).slice(0, 5)}. Trước đó và từ tuần sau trở đi chỉ có các tin lớn theo lịch chính thức (BLS, Fed, ECB, BoE, BOJ, Cục Thống kê): có số thực tế và kỳ trước, chưa có dự báo.</p>` + html;
    list.innerHTML = html;
    dr.querySelectorAll('[data-k="range"] button').forEach(x => x.classList.toggle('on', x.dataset.v === st.range));
    dr.querySelector('.cal-custom').hidden = st.range !== 'c';
    dr.querySelector('[data-k="from"]').value = st.from; dr.querySelector('[data-k="to"]').value = st.to;
    dr.querySelectorAll('[data-k="imp"] button').forEach(x => x.classList.toggle('on', !!st.imp[x.dataset.v]));
    dr.querySelectorAll('[data-k="g"] button').forEach(x => x.classList.toggle('on', !!st.g[x.dataset.v]));
    if (scroll) { const nw = list.querySelector('.cal-now'); if (nw) list.scrollTop = Math.max(0, nw.offsetTop - list.offsetTop - 90); }
    badge();
  }
  function badge() {
    const n = NOW(), c = EV.filter(e => e.i === 'H' && st.g[grpOf(e.c)] && e.ts > n && e.ts - n < DAY).length, b = rail.querySelector('.cal-badge');
    b.hidden = !c; b.textContent = c; rail.setAttribute('aria-label', `Lịch kinh tế${c ? ', ' + c + ' tin quan trọng trong 24 giờ tới' : ''}`);
  }
  function setOpen(o) {
    st.open = o; save(); document.body.classList.toggle('cal-open', o); rail.setAttribute('aria-expanded', o);
    if (o) render(true);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 280);   // chart co giãn theo khung mới
  }
  rail.onclick = () => setOpen(true);
  dr.querySelector('.cal-x').onclick = () => setOpen(false);
  dr.addEventListener('click', e => {
    const c = e.target.closest('.cal-chips button');
    if (c) { const k = c.parentElement.dataset.k, v = c.dataset.v;
      if (k === 'range') { st.range = v; if (v === 'c' && !st.from) { const n = NOW(); st.from = dkey(n - 14 * DAY).split('/').reverse().join('-'); st.to = dkey(n + 14 * DAY).split('/').reverse().join('-'); } }
      else st[k][v] = !st[k][v];
      st.exp = null; save(); return render(true); }
    const g = e.target.closest('.cal-go'); if (g) return go(linkOf(VIEW[+g.dataset.go]));
    const r = e.target.closest('.cal-row'); if (r) { const k = +r.parentElement.dataset.k; st.exp = st.exp === k ? null : k; const top = list.scrollTop; render(false); list.scrollTop = top; }
  });
  dr.addEventListener('change', e => { const k = e.target.dataset.k; if (k === 'from' || k === 'to') { st[k] = e.target.value; save(); render(true); } });
  document.addEventListener('keydown', e => { if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) setOpen(!st.open); else if (e.key === 'Escape' && st.open && dr.contains(document.activeElement)) setOpen(false); });

  /* ---------- đi tới chart liên quan ---------- */
  function go(lk) {
    if (!lk) return;
    const N = window.FSNAV; if (!N) { location.href = 'nganh.html#cal-' + lk.id; return; }
    N.show('picture'); N.openP(lk.p); if (lk.c) N.openC(lk.c);
    setTimeout(() => {
      const el = document.getElementById(lk.id); if (!el) return;
      for (let a = el; a; a = a.parentElement) if (a.classList && a.classList.contains('ovbody') && a.hidden && a.previousElementSibling) a.previousElementSibling.click();
      const card = el.closest('article') || el; card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('flash'); setTimeout(() => card.classList.remove('flash'), 1800);
      if (matchMedia('(max-width: 900px)').matches) setOpen(false);
    }, 250);
  }
  function focus(e) {   // mở lịch, cuộn tới tin, mở chi tiết và nháy nhẹ
    const n = NOW(), [a, b] = range();
    if (e.ts < a || e.ts > b) st.range = Math.abs(e.ts - n) <= 7 * DAY ? 'w' : 'm';
    st.imp[e.i] = true; st.g[grpOf(e.c)] = true; save();
    if (!st.open) setOpen(true);
    st.exp = null; render(false); st.exp = VIEW.indexOf(e); render(false);
    const el = list.querySelector(`.cal-ev[data-k="${st.exp}"]`); if (!el) return;
    list.scrollTop = Math.max(0, el.offsetTop - list.offsetTop - 60);
    el.classList.add('cal-flash'); setTimeout(() => el.classList.remove('cal-flash'), 1800);
  }
  window.FSCAL = { go, focus, open: () => setOpen(true) };
  if (/^#cal-/.test(location.hash)) { const id = location.hash.slice(5), lk = LINK.map(x => x[2]).find(x => x.id === id); setTimeout(() => go(lk), 1200); }

  /* ---------- đánh dấu kỳ công bố sắp tới trên chart (mọi chart có liên kết trong LINK, chỉ trong 7 ngày trước khi công bố) ---------- */
  // mỗi chart có trong LINK: tin sắp công bố đầu tiên khớp chart đó (ưu tiên mức Cao; CPI ưu tiên y/y)
  const PRI = e => (e.i === 'H' ? 0 : 2) + (/m\/m/.test(e.t) && /CPI/.test(e.t) && !/Core|PCE/.test(e.t) ? 1 : 0) + (/^Core CPI/.test(e.t) ? 1 : 0);
  const MARK = {}; LINK.forEach(([, , lk]) => { MARK[lk.id] = e => { const l = linkOf(e); return l && l.id === lk.id; }; });
  const nextFor = (id, n) => { const f = MARK[id]; if (!f) return null; const c = EV.filter(x => x.ts > n && f(x)); if (!c.length) return null; const t0 = c[0].ts; return c.filter(x => x.ts === t0).sort((a, b) => PRI(a) - PRI(b))[0]; };
  if (window.Chart) Chart.register({ id: 'calMark', afterDatasetsDraw(ch) {
    if (!MARK[ch.canvas.id]) return; const n = NOW(), e = nextFor(ch.canvas.id, n); ch.$calHit = null; if (!e || e.ts - n > 7 * DAY) return;   // chỉ hiện trong 7 ngày trước khi công bố
    const { ctx, chartArea: A, scales: { x } } = ch; if (!x || !A) return;
    const L = (ch.data.labels || []).length; let px = L ? x.getPixelForValue(L - 1) + (L > 1 ? (x.getPixelForValue(L - 1) - x.getPixelForValue(L - 2)) : 0) : A.right;
    const dl = e.d.slice(8, 10) + '/' + e.d.slice(5, 7) + '/' + e.d.slice(0, 4), li = (ch.data.labels || []).indexOf(dl);   // chart có trục theo ngày họp: đặt vạch đúng ngày đó
    if (li >= 0) px = x.getPixelForValue(li);
    if (!(px >= A.left && px <= A.right)) px = A.right - 1;
    const lbl = `Kỳ tới: ${vname(e.t)}${e.per ? ' T' + (+e.per.slice(5)) + '/' + e.per.slice(0, 4) : ''} · ${dkey(e.ts).slice(0, 5)} ${hm(e.ts)}${e.f ? ' · dự báo ' + vn(e.f) : ''}`;
    ctx.save(); ctx.strokeStyle = '#861C52'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(px, A.top); ctx.lineTo(px, A.bottom); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '700 10.5px Arial, sans-serif'; const w = ctx.measureText(lbl).width + 10; const bx = px - w - 4 >= A.left + 2 ? px - w - 4 : Math.min(px + 4, A.right - w);
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillRect(bx, A.top + 2, w, 17); ctx.strokeStyle = '#861C52'; ctx.lineWidth = 1; ctx.strokeRect(bx, A.top + 2, w, 17);
    ctx.fillStyle = '#861C52'; ctx.textBaseline = 'middle'; ctx.fillText(lbl + '  ›', bx + 5, A.top + 10.5); ctx.restore();
    ch.$calHit = { x0: bx, x1: bx + w + 12, y0: A.top + 2, y1: A.top + 19, line: px, e };
  },
  afterEvent(ch, args) {   // bấm vào nhãn → mở lịch tại đúng tin đó
    const h = ch.$calHit, ev = args.event; if (!h) return;
    const on = ev.x >= h.x0 && ev.x <= h.x1 && ev.y >= h.y0 && ev.y <= h.y1;
    ch.canvas.style.cursor = on ? 'pointer' : '';
    if (on && ev.type === 'click') focus(h.e);
  } });

  if (st.open) setOpen(true); else badge();
  setInterval(() => { badge(); if (st.open && !dr.matches(':hover')) { const top = list.scrollTop; render(false); list.scrollTop = top; } }, 60000);
})();
