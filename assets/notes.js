/* FinSuccess · ghi chép của chuyên viên (nhận định ngành, quyết định đầu tư từng mã)
   - Soạn có định dạng cơ bản: in đậm, in nghiêng, gạch chân, gạch đầu dòng, đánh số.
   - Lưu xong hiện thành một khối liền mạch; nút ✎ ở góc để cập nhật; mỗi lần lưu là một bản mới theo ngày.
   - Bản trên máy: localStorage. Bản đã đăng (AI đọc được): data/notes.json → data/notes-data.js (window.FS_NOTES).
     "Sao chép để đăng" → dán vào chat với AI → AI rà chính tả, thuật ngữ rồi chạy scripts/add_note.py.
   - Rà soát chính tả & thuật ngữ dùng chung cho cả 2 trang (vcCheck). */
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dvn = s => s ? s.slice(0, 10).split('-').reverse().join('/') : '—';
  const now = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };

  /* ---------- rà soát chính tả & thuật ngữ ---------- */
  const VC_ACCENT = { cac: 'các', duoc: 'được', khong: 'không', nguoi: 'người', cua: 'của', nhieu: 'nhiều', voi: 'với', hon: 'hơn', viec: 'việc', dieu: 'điều', nhung: 'nhưng',
    'ngan hang': 'ngân hàng', 'lai suat': 'lãi suất', 'ty gia': 'tỷ giá', 'ti gia': 'tỷ giá', 'tin dung': 'tín dụng', 'chinh sach': 'chính sách', 'thi truong': 'thị trường', 'tang truong': 'tăng trưởng',
    'lam phat': 'lạm phát', 'huy dong': 'huy động', 'no xau': 'nợ xấu', 'du phong': 'dự phòng', 'thanh khoan': 'thanh khoản', 'dinh gia': 'định giá', 'kho bac': 'kho bạc', 'bo tai chinh': 'bộ tài chính',
    'trai phieu': 'trái phiếu', 'co phieu': 'cổ phiếu', 'loi nhuan': 'lợi nhuận', 'rui ro': 'rủi ro', 'tuy nhien': 'tuy nhiên', 'do do': 'do đó', 'vi vay': 'vì vậy', 'hien tai': 'hiện tại', 'tiep tuc': 'tiếp tục' };
  const VC_TERM = [['carry trade', 'giao dịch chênh lệch lãi suất'], ['term premium', 'phần bù kỳ hạn'], ['risk-off', 'tâm lý né rủi ro'], ['risk-on', 'tâm lý ưa rủi ro'], ['sell-off', 'bán tháo'],
    ['credit growth', 'tăng trưởng tín dụng'], ['cost of fund', 'chi phí vốn'], ['re-rating', 'định giá lại'], ['rerating', 'định giá lại'], ['actions', 'các hành động'], ['action', 'hành động'], ['spread', 'chênh lệch'],
    ['yield', 'lợi suất'], ['liquidity', 'thanh khoản'], ['justify', 'biện minh'], ['upside', 'dư địa tăng'], ['downside', 'rủi ro giảm'], ['outlook', 'triển vọng'], ['guidance', 'định hướng'],
    ['hawkish', 'diều hâu'], ['dovish', 'bồ câu'], ['tightening', 'thắt chặt'], ['easing', 'nới lỏng'], ['valuation', 'định giá'], ['pricing', 'định giá'], ['catalyst', 'chất xúc tác'],
    ['consensus', 'đồng thuận'], ['rally', 'nhịp tăng'], ['buffer', 'vùng đệm'], ['provision', 'dự phòng'], ['funding', 'nguồn vốn'], ['deposit', 'tiền gửi'], ['momentum', 'đà'], ['trend', 'xu hướng'],
    ['peak', 'đỉnh'], ['bottom', 'đáy'], ['target', 'mục tiêu'], ['scenario', 'kịch bản'], ['stance', 'quan điểm'], ['pivot', 'xoay trục chính sách'], ['frontload', 'dồn sớm'], ['front-load', 'dồn sớm'],
    ['test', 'thử'], ['timing', 'thời điểm'], ['priced in', 'đã phản ánh vào giá'], ['overweight', 'tỷ trọng cao hơn thị trường'], ['underweight', 'tỷ trọng thấp hơn thị trường'], ['outperform', 'vượt trội thị trường'],
    ['underperform', 'kém thị trường'], ['headwind', 'lực cản'], ['tailwind', 'lực đẩy'], ['soft landing', 'hạ cánh mềm'], ['hard landing', 'hạ cánh cứng'], ['inflation', 'lạm phát'], ['recession', 'suy thoái'],
    ['sticky', 'dai dẳng'], ['data-dependent', 'phụ thuộc dữ liệu'], ['dot plot', 'biểu đồ chấm'], ['forward guidance', 'định hướng chính sách'], ['upside risk', 'rủi ro tăng'], ['downside risk', 'rủi ro giảm'],
    ['tail risk', 'rủi ro đuôi'], ['bear case', 'kịch bản xấu'], ['bull case', 'kịch bản tốt'], ['base case', 'kịch bản cơ sở'], ['trade-off', 'đánh đổi'], ['tradeoff', 'đánh đổi'], ['narrative', 'câu chuyện'],
    ['story', 'câu chuyện'], ['sentiment', 'tâm lý thị trường'], ['flow', 'dòng tiền'], ['inflow', 'dòng tiền vào'], ['outflow', 'dòng tiền ra'], ['outlier', 'điểm bất thường'], ['benchmark', 'tham chiếu'],
    ['cut', 'cắt giảm'], ['hike', 'tăng lãi suất'], ['premium', 'phần bù'], ['discount', 'chiết khấu'], ['guideline', 'hướng dẫn'], ['roadmap', 'lộ trình'], ['buyback', 'mua lại cổ phiếu']];
  const vcEsc = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function vcCheck(text) {
    const changes = [];
    let out = text;
    for (const [a, b] of Object.entries(VC_ACCENT)) {
      const re = new RegExp(`(^|[^\\p{L}])(${vcEsc(a)})(?=$|[^\\p{L}])`, 'giu');
      out = out.replace(re, (m, pre, w) => { const r = w[0] === w[0].toUpperCase() ? b[0].toUpperCase() + b.slice(1) : b; changes.push({ from: w, to: r, kind: 'Thiếu dấu' }); return pre + r; });
    }
    for (const [en, vi] of [...VC_TERM].sort((x, y) => y[0].length - x[0].length)) {
      const re = new RegExp(`(^|[^\\p{L}(])(${vcEsc(en)})(?=$|[^\\p{L}])(?!\\s*\\))`, 'giu');
      out = out.replace(re, (m, pre, w, off, all) => {
        const before = all.slice(Math.max(0, off - vi.length - 3), off + pre.length);
        if (before.toLowerCase().includes(vi.toLowerCase())) return m;          // đã có tiếng Việt đứng trước
        changes.push({ from: w, to: `${vi} (${w})`, kind: 'Thuật ngữ' }); return `${pre}${vi} (${w})`; });
    }
    return { text: out, changes };
  }
  function vcNodes(root) {   // sửa trực tiếp trên các nút chữ của vùng soạn thảo → danh sách thay đổi
    const ch = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const r = vcCheck(n.nodeValue); if (r.changes.length) { n.nodeValue = r.text; ch.push(...r.changes); } }
    return ch;
  }

  /* ---------- HTML an toàn: chỉ giữ định dạng cơ bản ---------- */
  const OK = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u', UL: 'ul', OL: 'ol', LI: 'li', BR: 'br' };
  function clean(node) {
    let out = '';
    node.childNodes.forEach(c => {
      if (c.nodeType === 3) { out += esc(c.textContent); return; }
      if (c.nodeType !== 1) return;
      const t = OK[c.nodeName], st = c.getAttribute && (c.getAttribute('style') || '');
      let inner = clean(c);
      if (c.nodeName === 'SPAN' && st) {          // trình duyệt đôi khi dùng span style thay thẻ
        if (/font-weight:\s*(bold|[6-9]00)/.test(st)) inner = `<b>${inner}</b>`;
        if (/font-style:\s*italic/.test(st)) inner = `<i>${inner}</i>`;
        if (/text-decoration[^;]*underline/.test(st)) inner = `<u>${inner}</u>`;
      }
      if (t === 'br') out += '<br>';
      else if (t) out += `<${t}>${inner}</${t}>`;
      else if (/^(DIV|P)$/.test(c.nodeName)) out += (out && !out.endsWith('<br>') ? '<br>' : '') + inner;
      else out += inner;
    });
    return out;
  }
  const cleanStr = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return clean(d).replace(/(<br>){3,}/g, '<br><br>').replace(/^(<br>)+|(<br>)+$/g, ''); };
  const textToHtml = t => esc(t || '').replace(/\n/g, '<br>');
  const plain = html => { const d = document.createElement('div'); d.innerHTML = (html || '').replace(/<br>/g, '\n').replace(/<\/li>/g, '\n'); return d.textContent.trim(); };

  /* ---------- lưu trữ ---------- */
  const LK = k => 'fsn:' + k;
  const local = k => { try { return JSON.parse(localStorage.getItem(LK(k)) || '[]'); } catch (e) { return []; } };
  const saveLocal = (k, arr) => { try { localStorage.setItem(LK(k), JSON.stringify(arr)); return true; } catch (e) { return false; } };
  const published = k => ((window.FS_NOTES || {}).notes || {})[k] || [];
  /* Bản trên máy chưa đăng = BẢN NHÁP: mỗi khối chỉ giữ 1 bản nháp (bản mới nhất), tự xoá sau DRAFT_DAYS ngày,
     và tự bỏ khi đã được đăng (trùng id/nội dung, hoặc đã có bản đăng mới hơn bản nháp). */
  const DRAFT_DAYS = 7;
  const atMs = at => { const t = Date.parse((at || '').replace(' ', 'T')); return isNaN(t) ? 0 : t; };
  const draftLeft = v => Math.max(0, Math.ceil((atMs(v.at) + DRAFT_DAYS * 864e5 - Date.now()) / 864e5));
  function draft(k) {
    const pub = published(k), ids = new Set(pub.map(v => v.id)), sig = v => cleanStr(v.html) + '|' + JSON.stringify(v.f || {}), htmls = new Set(pub.map(sig)), pubAt = pub.reduce((m, v) => (v.at || '') > m ? v.at : m, '');
    const all = local(k), keep = all.filter(v => !ids.has(v.id) && !htmls.has(sig(v)) && (/-seed$/.test(v.id) || draftLeft(v) > 0) && !(pubAt && (v.at || '') <= pubAt))
      .sort((a, b) => (a.at || '').localeCompare(b.at || '')).slice(-1);
    if (keep.length !== all.length) saveLocal(k, keep);
    return keep[0] ? Object.assign({}, keep[0], { _local: true }) : null;
  }
  function versions(k) {   // bản nháp (nếu có) + bản đã đăng, mới nhất trước
    const pub = [...published(k)].sort((a, b) => (b.at || '').localeCompare(a.at || ''));
    const d = draft(k);
    return d ? [d, ...pub] : pub;   // bản nháp luôn đứng đầu: đó là bản người dùng vừa sửa
  }

  /* ---------- trình soạn có thanh công cụ ---------- */
  const TB = [['bold', '<b>B</b>', 'In đậm (Ctrl+B)'], ['italic', '<i>I</i>', 'In nghiêng (Ctrl+I)'], ['underline', '<u>U</u>', 'Gạch chân (Ctrl+U)'],
    ['insertUnorderedList', '• Danh sách', 'Gạch đầu dòng'], ['insertOrderedList', '1. Danh sách', 'Đánh số'], ['removeFormat', 'Xoá định dạng', 'Bỏ định dạng đoạn đang chọn']];
  function editorHtml(id, html, ph) {
    return `<div class="fsn-ed"><div class="fsn-tb" role="toolbar">${TB.map(([c, l, t]) => `<button type="button" data-cmd="${c}" title="${t}">${l}</button>`).join('')}
      <button type="button" data-cmd="vc" class="fsn-vc" title="Sửa lỗi gõ thiếu dấu thường gặp, Việt hoá thuật ngữ tiếng Anh (giữ thuật ngữ gốc trong ngoặc)">Rà soát chính tả &amp; thuật ngữ</button></div>
      <div class="fsn-area" id="${id}" contenteditable="true" data-ph="${esc(ph || '')}">${html || ''}</div><div class="fsn-vcout muted"></div></div>`;
  }
  function wireEditor(box) {
    const area = box.querySelector('.fsn-area'), out = box.querySelector('.fsn-vcout');
    box.querySelectorAll('.fsn-tb button').forEach(b => {
      b.onmousedown = e => e.preventDefault();      // giữ vùng chọn
      b.onclick = () => {
        if (b.dataset.cmd === 'vc') {
          const ch = vcNodes(area);
          out.innerHTML = ch.length ? `<b>Đã sửa ${ch.length} chỗ:</b> ${ch.map(c => `“${esc(c.from)}” → “${esc(c.to)}”`).join(' · ')}. Kiểm tra lại rồi bấm Lưu.` : 'Không thấy lỗi thiếu dấu hay thuật ngữ tiếng Anh trong từ điển. Bản đăng chính thức AI sẽ rà kỹ toàn bộ.';
          return;
        }
        area.focus(); document.execCommand(b.dataset.cmd, false, null);
      };
    });
  }

  /* ---------- khối ghi chép: xem ↔ sửa, lịch sử theo ngày ----------
     opt = { key, title, sub, fields(v) → html ô nhập, read(root) → {…}, meta(v) → html tóm tắt, onSave(v), seed() → bản cũ, author } */
  function mount(el, opt) {
    let mode = 'view', showHist = false;
    if (!versions(opt.key).length && opt.seed) { const s = opt.seed(); if (s) saveLocal(opt.key, [s]); }
    const render = () => {
      const V = versions(opt.key), cur = V[0], nLocal = V.filter(v => v._local).length;
      let who = 'Minh Đức'; try { who = localStorage.getItem('quWho') || who; } catch (e) {}
      if (mode === 'edit' || !cur) {
        el.innerHTML = `<div class="fsn-head"><h3 class="sub">${opt.title}</h3>${cur ? '<button type="button" class="btn ghost" data-a="cancel">Huỷ</button>' : ''}</div>
          ${opt.sub ? `<p class="chart-sub">${opt.sub}</p>` : ''}
          <div class="form fsn-form">${opt.fields(cur ? cur.f : {})}
            <div class="full"><label>${opt.textLabel || 'Luận điểm'}</label>${editorHtml(opt.key + '-ed', cur ? cur.html : '', opt.placeholder)}</div>
            <div class="full fsn-actions"><label class="muted">Người viết <input data-a="who" value="${esc(who)}" size="14"></label>
              <button type="button" class="btn" data-a="save">Lưu bản mới</button>${cur ? '<button type="button" class="btn ghost" data-a="cancel">Huỷ</button>' : ''}<span class="muted" data-a="msg"></span></div></div>`;
        wireEditor(el.querySelector('.fsn-ed'));
        if (opt.afterFields) opt.afterFields(el);
        el.querySelectorAll('[data-a="cancel"]').forEach(b => b.onclick = () => { mode = 'view'; render(); });
        el.querySelector('[data-a="save"]').onclick = () => {
          const html = cleanStr(el.querySelector('.fsn-area').innerHTML), f = opt.read(el), au = el.querySelector('[data-a="who"]').value.trim() || 'Chuyên viên';
          try { localStorage.setItem('quWho', au); } catch (e) {}
          const v = { id: `${opt.key}-${Date.now()}`, at: now(), author: au, f, html, text: plain(html) };
          if (!saveLocal(opt.key, [v])) { el.querySelector('[data-a="msg"]').textContent = 'Trình duyệt không cho lưu.'; return; }
          if (opt.onSave) opt.onSave(v);
          mode = 'view'; render();
        };
        return;
      }
      el.innerHTML = `<div class="fsn-head"><h3 class="sub">${opt.title}</h3>
          <span class="fsn-btns">${nLocal ? `<button type="button" class="btn ghost" data-a="copy" title="Bản nháp chỉ nằm trên máy này — sao chép rồi dán vào chat với AI kèm câu &quot;đăng nhận định này&quot;">Sao chép để đăng</button><button type="button" class="btn ghost" data-a="deldraft" title="Xoá bản nháp trên máy này">Xoá nháp</button>` : ''}<button type="button" class="btn ghost" data-a="hist">Lịch sử (${V.length - nLocal})</button><button type="button" class="btn ghost" data-a="edit">✎ Chỉnh sửa</button></span></div>
        <div class="fsn-meta"><span>${dvn(cur.at)}${cur.at.length > 10 && cur.at.slice(11) !== '00:00' ? ' ' + cur.at.slice(11) : ''}</span><span>${esc(cur.author || '')}</span>${cur._local ? `<span class="pill watch" title="Chỉ lưu trên máy này, AI chưa đọc được. Mỗi lần lưu thay bản nháp cũ; tự xoá sau ${DRAFT_DAYS} ngày hoặc khi đã đăng.">${/-seed$/.test(cur.id) ? 'bản nháp' : `bản nháp · tự xoá sau ${draftLeft(cur)} ngày`}</span>` : '<span class="pill ok">đã đăng</span>'}</div>
        ${opt.meta ? `<div class="fsn-sum">${opt.meta(cur.f)}</div>` : ''}
        <div class="fsn-body">${cleanStr(cur.html) || '<span class="muted">(chưa có nội dung)</span>'}</div>
        <span class="muted fsn-cmsg" data-a="cmsg"></span>
        ${showHist ? `<div class="fsn-hist">${V.filter(v => !v._local).map((v, i) => `<details${i ? '' : ' open'}><summary><b>${dvn(v.at)}</b> ${v.at.length > 10 && v.at.slice(11) !== '00:00' ? v.at.slice(11) : ''} · ${esc(v.author || '')}${v._local ? ' <span class="pill watch">chưa đăng</span>' : ''}${opt.meta ? ` · <span class="muted">${esc(plain(opt.meta(v.f).replace(/<\/span>\s*<span/g, '</span> · <span')))}</span>` : ''}</summary><div class="fsn-body">${cleanStr(v.html)}</div></details>`).join('')}</div>` : ''}`;
      el.querySelector('[data-a="edit"]').onclick = () => { mode = 'edit'; render(); };
      el.querySelector('[data-a="hist"]').onclick = () => { showHist = !showHist; render(); };
      const dd = el.querySelector('[data-a="deldraft"]');
      if (dd) dd.onclick = () => { saveLocal(opt.key, []); render(); };
      const cp = el.querySelector('[data-a="copy"]');
      if (cp) cp.onclick = async () => {
        const payload = JSON.stringify({ key: opt.key, versions: V.filter(v => v._local).map(v => { const o = Object.assign({}, v); delete o._local; return o; }) }, null, 1);
        const msg = el.querySelector('[data-a="cmsg"]');
        try { await navigator.clipboard.writeText(payload); msg.textContent = 'Đã sao chép.'; }
        catch (e) { const t = document.createElement('textarea'); t.value = payload; t.style.cssText = 'width:100%;height:120px'; cp.after(t); t.select(); msg.textContent = 'Không truy cập được clipboard — bôi đen ô bên dưới và sao chép.'; }
      };
    };
    render();
    return { render, latest: () => versions(opt.key)[0] };
  }

  window.FSN = { mount, versions, vcCheck, vcNodes, cleanStr, textToHtml, plain, now };
  window.vcCheck = vcCheck;
})();
