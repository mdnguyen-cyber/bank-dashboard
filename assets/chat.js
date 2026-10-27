/* Khung chat Trợ lý AI.
   - Bản trên claude.ai (window.FS_ARTIFACT): hỏi Claude bằng tài khoản người xem, lấy số trực tiếp qua connector, chạy tác vụ cập nhật.
   - Bản web (window.FS_CHAT.url): gọi Claude qua server trung gian (Cloudflare Worker giữ API key, có mật khẩu); công cụ dữ liệu chạy ngay trong trang. */
(function () {
const MODE = window.FS_ARTIFACT ? 'claude' : (window.FS_CHAT && window.FS_CHAT.url ? 'api' : null);
if (!MODE) return;
const CSS_TXT = `
#ai_panel{color-scheme:light;color:var(--ink,#303540);position:fixed;top:0;right:0;bottom:0;width:min(460px,100vw);z-index:80;background:var(--card,#fff);border-left:1px solid var(--line,#d9dde4);box-shadow:-8px 0 30px rgba(20,30,60,.18);display:flex;flex-direction:column;transform:translateX(105%);transition:transform .2s ease;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
#ai_panel.open{transform:none}
#ai_panel .ai-h{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line2,#e9ecf2)}
#ai_panel .ai-h .t{flex:1;min-width:0;display:flex;flex-direction:column}
#ai_panel .ai-h b{color:var(--navy);font-size:15px}
#ai_panel .ai-h span{font-size:11.5px;color:var(--ink2)}
#ai_panel .btn{font:600 12.5px Arial,sans-serif;border:1px solid var(--line);background:#fff;color:var(--navy);border-radius:9px;padding:6px 10px;cursor:pointer}
#ai_panel .btn.pri{background:var(--navy);color:#fff;border-color:var(--navy)}
#ai_panel .btn:disabled{opacity:.5;cursor:default}
#ai_panel .x{border:0;background:none;font-size:22px;line-height:1;color:var(--ink2);cursor:pointer;padding:2px 6px}
#ai_main{flex:1;overflow-y:auto;padding:12px 14px;background:var(--bg,#F7F9FD)}
#ai_log{display:flex;flex-direction:column;gap:12px}
#ai_panel .intro{background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 14px}
#ai_panel .intro h1{font-size:15px;margin:0 0 4px;color:var(--navy)}
#ai_panel .intro p{margin:0 0 8px;color:var(--ink2);font-size:13px}
#ai_panel .chips{display:flex;flex-direction:column;gap:6px}
#ai_panel .chip{font:500 12.5px Arial,sans-serif;background:var(--soft,#F0F4FF);color:var(--navy);border:1px solid transparent;border-radius:10px;padding:6px 10px;cursor:pointer;text-align:left}
#ai_panel .chip:hover{border-color:var(--blue)}
#ai_panel .msg{display:flex;flex-direction:column;gap:5px;min-width:0}
#ai_panel .msg.u{align-items:flex-end}
#ai_panel .msg.u .bub{background:var(--navy);color:#fff;border-radius:12px 12px 4px 12px;padding:8px 12px;max-width:88%;white-space:pre-wrap;font-size:13.5px}
#ai_panel .msg.a .bub{background:#fff;border:1px solid var(--line);border-radius:12px 12px 12px 4px;padding:10px 12px;min-width:0;overflow-wrap:anywhere;font-size:13.5px;line-height:1.55}
#ai_panel .bub h2,#ai_panel .bub h3,#ai_panel .bub h4{color:var(--navy);margin:10px 0 4px;font-size:14px}
#ai_panel .bub p{margin:5px 0}#ai_panel .bub ul,#ai_panel .bub ol{margin:5px 0;padding-left:20px}
#ai_panel .bub code{background:var(--soft);padding:1px 4px;border-radius:4px;font-size:12px}
#ai_panel .bub pre{background:var(--soft);padding:8px;border-radius:8px;overflow-x:auto;font-size:11.5px}
#ai_panel .tw{overflow-x:auto;margin:6px 0}
#ai_panel .bub table{border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums;min-width:100%}
#ai_panel .bub th,#ai_panel .bub td{border-bottom:1px solid var(--line2);padding:4px 8px;text-align:left;white-space:nowrap}
#ai_panel .bub th{color:var(--ink2);background:var(--soft)}
#ai_panel .bub td.n,#ai_panel .bub th.n{text-align:right}
#ai_panel .chartbox{position:relative;height:230px;margin:8px 0}
#ai_panel .steps{font-size:11.5px;color:var(--muted);display:flex;flex-direction:column}
#ai_panel .steps .st::before{content:"↳ ";color:var(--teal-ink)}
#ai_panel .think{color:var(--muted);font-style:italic}
#ai_panel .err{color:var(--neg);font-size:12.5px}
#ai_panel .note{font-size:11.5px;color:var(--muted)}
#ai_panel .confirm{border:1px dashed var(--warn);border-radius:10px;padding:10px 12px;background:var(--soft);display:flex;flex-direction:column;gap:6px;font-size:13px}
#ai_panel .confirm b{color:var(--navy)}#ai_panel .confirm .row{display:flex;gap:8px}
#ai_panel .ai-f{border-top:1px solid var(--line2);padding:10px 14px;display:flex;flex-direction:column;gap:6px}
#ai_form{display:flex;gap:8px;align-items:flex-end}
#ai_q{flex:1;min-width:0;resize:none;font:13.5px/1.5 Arial,sans-serif;color:var(--ink,#303540);background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 10px;max-height:160px}
#ai_panel .opts{display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:11.5px;color:var(--ink2)}
#ai_panel .opts label{display:inline-flex;gap:4px;align-items:center;cursor:pointer}
#ai_panel .lnk{background:none;border:0;color:var(--blue);font:inherit;cursor:pointer;padding:0;text-decoration:underline}
#ai_panel [hidden]{display:none!important}
@media (prefers-reduced-motion: reduce){#ai_panel{transition:none}}
@media print{#ai_panel{display:none}}`;
const st = document.createElement('style'); st.textContent = CSS_TXT; document.head.appendChild(st);
const panel = document.createElement('aside'); panel.id = 'ai_panel'; panel.setAttribute('aria-label', 'Trợ lý AI');
panel.innerHTML = `<div class="ai-h"><div class="t"><b>✦ Trợ lý AI · ngành Ngân hàng</b><span id="ai_asof">Đang tải dữ liệu…</span></div>
  <button class="btn" id="ai_updBtn" type="button">Cập nhật dữ liệu</button><button class="x" id="ai_close" type="button" aria-label="Đóng">×</button></div>
  <div id="ai_main"><div id="ai_log"><section class="intro" id="ai_intro"><h1>Hỏi số liệu, thử giả định, yêu cầu cập nhật</h1>
    <p>Trợ lý đọc toàn bộ dữ liệu dashboard và lấy số mới nhất từ nguồn khi cần. Với tin đồn hoặc giả định, trợ lý tính lại các chỉ tiêu và nêu hàm ý cho ngành.</p>
    <div class="chips" id="ai_chips">
      <button class="chip" type="button">Nghe nói tín dụng tháng này −2% MoM. Tính lại YTD, YoY và hàm ý cho ngành</button>
      <button class="chip" type="button">Tóm tắt diễn biến tuần này: tỷ giá, lãi suất liên ngân hàng, thanh khoản</button>
      <button class="chip" type="button">So sánh NIM và chi phí vốn Big 4 với tư nhân lớn 4 quý gần nhất, kèm chart</button>
      <button class="chip" type="button">Giải thích tab tôi đang xem: các chỉ số chính đang nói gì?</button>
    </div></section></div></div>
  <div class="ai-f"><form id="ai_form"><textarea id="ai_q" rows="2" aria-label="Câu hỏi" placeholder="Hỏi hoặc nhập giả định… (Enter để gửi)"></textarea>
    <button class="btn pri" id="ai_send" type="submit">Gửi</button><button class="btn" id="ai_stop" type="button" hidden>Dừng</button></form>
    <div class="opts"><label><input type="checkbox" id="ai_deep"> Phân tích sâu</label><button class="lnk" id="ai_clear" type="button">Xoá hội thoại</button><span id="ai_status" class="note"></span></div></div>`;
const mount = () => {
  document.body.appendChild(panel);
  const open = v => { panel.classList.toggle('open', v); if (v) setTimeout(() => panel.querySelector('#ai_q').focus(), 50); };
  document.addEventListener('click', e => { if (e.target.closest('.aibot')) { e.preventDefault(); open(!panel.classList.contains('open')); } });
  panel.querySelector('#ai_close').onclick = () => open(false);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
};
if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
const CFG = { triggerId: "trig_01Wg3DbSbchPzmc1AatBXPd4", wi: "WiMCP", ccr: "Claude Code Remote" };
const $ = s => panel.querySelector(s);
let CTX = null, sample = null, mcp = null, busy = null, turns = [];
const LS = 'fs-bot-turns';
try { turns = JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) { turns = []; }
const save = () => { try { localStorage.setItem(LS, JSON.stringify(turns.slice(-30))); } catch (e) {} };

/* ---------- dữ liệu ---------- */
fetch('data/bot-context.json').then(r => r.json()).then(j => {
  CTX = j;
  $('#ai_asof').textContent = `Dữ liệu dashboard đến ${fd(j.dataAsOf)} · đóng gói ${j.built}`;
}).catch(() => { $('#ai_asof').textContent = 'Không tải được dữ liệu dashboard — trợ lý chỉ dùng được nguồn trực tiếp.'; });
const fd = d => d ? d.split('-').reverse().join('/') : '—';

/* ---------- bản web: gọi Claude qua Worker, công cụ chạy trong trang ---------- */
const PWK = 'fs-ai-key';
const getPw = () => { try { return localStorage.getItem(PWK) || ''; } catch (e) { return ''; } };
function askPw(msg) {
  const box = document.createElement('div'); box.className = 'confirm';
  box.innerHTML = `<b>Nhập mật khẩu Trợ lý AI</b><span class="note">${msg || 'Chỉ cần nhập một lần trên trình duyệt này.'}</span>
    <div class="row"><input type="password" id="ai_pw" aria-label="Mật khẩu" style="flex:1;min-width:0;border:1px solid var(--line);border-radius:8px;padding:6px 8px;background:#fff;color:var(--ink)"><button class="btn pri" type="button">Lưu</button></div>`;
  $('#ai_log').appendChild(box); scrollEnd();
  box.querySelector('button').onclick = () => { const v = box.querySelector('input').value.trim(); if (!v) return; try { localStorage.setItem(PWK, v); } catch (e) {} box.remove(); setStatus('Đã lưu mật khẩu.'); };
}
async function post(path, body, signal) {
  const r = await fetch(window.FS_CHAT.url.replace(/\/$/, '') + path, { method: 'POST', signal, headers: { 'content-type': 'application/json', 'x-fs-key': getPw() }, body: JSON.stringify(body) });
  if (r.status === 401) { const e = { code: 'bad_password' }; throw e; }
  if (r.status === 429) { const e = { code: 'rate_limited' }; throw e; }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = { code: 'upstream_error', message: (j.error && (j.error.message || j.error)) || ('HTTP ' + r.status) }; throw e; }
  return j;
}
async function apiSample(input, o = {}) {
  const system = input[0].content; let msgs = input.slice(1).map(t => ({ role: t.role, content: t.content }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  const tools = (o.tools || []).map(t => ({ name: t.name, description: t.description, input_schema: t.inputSchema || { type: 'object', properties: {} } }));
  const byName = Object.fromEntries((o.tools || []).map(t => [t.name, t]));
  let text = '';
  for (let round = 0; round < 8; round++) {
    let j;
    try { j = await post('/chat', { system, messages: msgs, tools, deep: o.modelTier === 'complex' }, o.signal); }
    catch (e) { if (e.name === 'AbortError') { throw { code: 'cancelled', text }; } e.text = text; throw e; }
    const blocks = j.content || [];
    const t = blocks.filter(b => b.type === 'text').map(b => b.text).join('');
    if (t) { text += (text ? '\n\n' : '') + t; o.onText && o.onText({ text, delta: t }); }
    if (j.stop_reason !== 'tool_use') return { text: text || '(không có nội dung)', truncated: j.stop_reason === 'max_tokens' };
    msgs.push({ role: 'assistant', content: blocks });
    const results = await Promise.all(blocks.filter(b => b.type === 'tool_use').map(async b => {
      try { const out = await byName[b.name].execute(b.input || {}, { signal: o.signal }); return { type: 'tool_result', tool_use_id: b.id, content: typeof out === 'string' ? out : JSON.stringify(out) }; }
      catch (err) { return { type: 'tool_result', tool_use_id: b.id, content: 'Error: ' + (err.message || err), is_error: true }; }
    }));
    msgs.push({ role: 'user', content: results });
  }
  return { text: text + '\n\n(Dừng sau nhiều bước gọi dữ liệu — hỏi hẹp hơn.)', truncated: true };
}

(async () => {
  if (MODE === 'api') { sample = apiSample; mcp = null; if (!getPw()) askPw(); return; }
  if (!window.claude) { setStatus('Trang cần mở trong Claude để dùng trợ lý.'); disableAll(); return; }
  sample = await claude.use('sample');
  mcp = await claude.use('mcp');
  if (!sample) { setStatus('Trợ lý không khả dụng ở chế độ xem này.'); disableAll(); }
  if (!mcp) { $('#ai_updBtn').disabled = true; $('#ai_updBtn').title = 'Chế độ xem này không gọi được tác vụ cập nhật'; }
})();
function disableAll() { $('#ai_send').disabled = true; $('#ai_q').disabled = true; }
function setStatus(t) { $('#ai_status').textContent = t || ''; }

/* ---------- công cụ cho Claude ---------- */
const cut = (o, n = 30000) => { let s = JSON.stringify(o); return s.length > n ? s.slice(0, n) + '…(cắt bớt — hỏi hẹp hơn)' : s; };
function calc(expr) {   // + - * / ^ ( ) số thập phân; không dùng eval
  const s = String(expr).replace(/,/g, '.').replace(/\s+/g, ''); let i = 0;
  const num = () => { const m = /^\d*\.?\d+(e[+-]?\d+)?/i.exec(s.slice(i)); if (!m) throw new Error('Biểu thức không hợp lệ tại vị trí ' + i); i += m[0].length; return parseFloat(m[0]); };
  const atom = () => { if (s[i] === '(') { i++; const v = add(); if (s[i] !== ')') throw new Error('Thiếu dấu )'); i++; return v; } if (s[i] === '-') { i++; return -atom(); } if (s[i] === '+') { i++; return atom(); } return num(); };
  const pow = () => { let b = atom(); if (s[i] === '^') { i++; return Math.pow(b, pow()); } return b; };
  const mul = () => { let v = pow(); while (s[i] === '*' || s[i] === '/') { const o = s[i++]; const r = pow(); v = o === '*' ? v * r : v / r; } return v; };
  const add = () => { let v = mul(); while (s[i] === '+' || s[i] === '-') { const o = s[i++]; const r = mul(); v = o === '+' ? v + r : v - r; } return v; };
  const v = add(); if (i < s.length) throw new Error('Thừa ký tự: ' + s.slice(i)); return v;
}
function needCtx() { if (!CTX) throw new Error('Dữ liệu dashboard chưa tải được'); }
async function wi(tool, input, signal) {
  if (!mcp) throw new Error('Chế độ xem này không gọi được nguồn dữ liệu trực tiếp');
  try { const r = await mcp.callTool(CFG.wi, tool, input, { signal }); return cut(r.payload ?? r.content, 24000); }
  catch (e) { throw new Error(mcpMsg(e)); }
}
function mcpMsg(e) {
  return ({ server_not_connected: 'Chưa kết nối connector WiMCP trong claude.ai (Settings → Connectors)', needs_reauth: 'Connector WiMCP cần đăng nhập lại (Settings → Connectors)',
    not_in_manifest: 'Trang chưa được phép dùng connector này', approval_required: 'Cần bạn cho phép trang dùng connector', tool_error: 'Nguồn trả lỗi: ' + (e.message || '') })[e.code] || ('Lỗi nguồn dữ liệu (' + (e.code || 'không rõ') + ')');
}
const TOOLS = (step, signal) => ALL_TOOLS(step, signal).filter(t => MODE === 'claude' || !t.name.startsWith('source_'));
const ALL_TOOLS = (step, signal) => [
  { name: 'get_series', description: 'Lấy chuỗi thời gian từ dữ liệu dashboard theo mã (xem danh mục trong hướng dẫn). Trả {key:{label,unit,freq,src,pts:[[ngày,giá trị]]}}.',
    inputSchema: { type: 'object', properties: { keys: { type: 'array', items: { type: 'string' } }, from: { type: 'string', description: 'YYYY-MM hoặc YYYY-MM-DD, tuỳ chọn' }, last: { type: 'number', description: 'số điểm cuối, tuỳ chọn' } }, required: ['keys'] },
    execute: ({ keys, from, last }) => { needCtx(); step('Đọc chuỗi ' + [].concat(keys).join(', ')); const o = {};
      [].concat(keys).forEach(k => { const s = CTX.series[k]; if (!s) { o[k] = 'không có mã này'; return; } let p = s.pts; if (from) p = p.filter(x => x[0] >= from); if (last) p = p.slice(-last); o[k] = { label: s.label, unit: s.unit, freq: s.freq, src: s.src, pts: p }; }); return cut(o); } },
  { name: 'get_banks', description: 'Chỉ tiêu theo quý của 26 ngân hàng niêm yết. symbols: danh sách mã hoặc tên nhóm ("Big 4","Tư nhân lớn","Tư nhân vừa","Tư nhân nhỏ"). metrics: nim,cof,yea,cir,casa,credit,creditYoY,g2,npl,llr,ldr,mcap,pb,pe,npYoY,roa,roe.',
    inputSchema: { type: 'object', properties: { symbols: { type: 'array', items: { type: 'string' } }, metrics: { type: 'array', items: { type: 'string' } }, last: { type: 'number' } }, required: ['symbols', 'metrics'] },
    execute: ({ symbols, metrics, last = 6 }) => { needCtx(); const B = CTX.banks, g = CTX.sections.meta.groups; const syms = [].concat(symbols).flatMap(x => B.series[x] ? [x] : Object.keys(g).filter(s => g[s] === x));
      step('Đọc số ngân hàng ' + syms.join(', ')); const q = B.quarters.slice(-last), o = { quarters: q, data: {} };
      syms.forEach(s => { o.data[s] = { group: g[s] }; [].concat(metrics).forEach(m => { const a = (B.series[s] || {})[m]; o.data[s][m] = Array.isArray(a) ? a.slice(-last) : null; }); }); return cut(o); } },
  { name: 'get_section', description: 'Bảng tổng hợp của dashboard: latest (chỉ số mới nhất 26 NH), agg (bình quân nhóm theo quý), secVal (định giá ngành), ppopSector, consensus (đồng thuận CTCK), ldrSens, camel (xếp hạng TT21 ước tính), reg (quy định), sbvPolicy (lãi suất điều hành), sbvEvents (nhật ký điều hành NHNN), idx (chỉ số IDX-FX/LIQ), signals, events (lịch sự kiện), quick (2 bản báo cáo vĩ mô gần nhất), news.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    execute: ({ name }) => { needCtx(); step('Đọc mục ' + name); const v = CTX.sections[name]; if (v == null) throw new Error('Không có mục ' + name); return cut(v); } },
  { name: 'calc', description: 'Tính biểu thức số học chính xác (+ - * / ^ ngoặc). Dùng cho mọi phép tính có trong câu trả lời.',
    inputSchema: { type: 'object', properties: { expr: { type: 'string' } }, required: ['expr'] },
    execute: ({ expr }) => { const v = calc(expr); return { expr, value: Math.round(v * 1e8) / 1e8 }; } },
  { name: 'source_search', description: 'Tìm mã chỉ tiêu/endpoint trong nguồn dữ liệu trực tiếp (vĩ mô VN và quốc tế, hàng hoá, doanh nghiệp). Dùng khi dashboard chưa có số hoặc cần số mới hơn.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    execute: ({ query }) => { step('Tìm chỉ tiêu: ' + query); return wi('wi_data_search', { query: String(query), limit: 8 }, signal); } },
  { name: 'source_macro', description: 'Lấy giá trị chỉ tiêu vĩ mô từ nguồn trực tiếp theo indicator_id (CSV). Trả chuỗi theo ngày/tháng.',
    inputSchema: { type: 'object', properties: { indicator_id: { type: 'string' }, from_time: { type: 'string' }, to_time: { type: 'string' }, limit: { type: 'number' } }, required: ['indicator_id'] },
    execute: ({ indicator_id, from_time, to_time, limit }) => { step('Lấy số mới: ' + indicator_id); const a = { action: 'get_values', indicator_id: String(indicator_id) };
      if (from_time) a.from_time = String(from_time); if (to_time) a.to_time = String(to_time); if (limit) a.limit = Number(limit); return wi('wi_data_macro', a, signal); } },
  { name: 'source_companies', description: 'Dữ liệu doanh nghiệp niêm yết từ nguồn trực tiếp. args theo công cụ gốc: {action:"get_data", endpoint_name:"fs_bank"|"ratio_bank"|"ratio_bank_ttm"|"ratio_common_ttm"|"ratio_daily"|"co_reports"..., filters:"{\\"symbol\\":\\"CTG,VCB\\",\\"year\\":\\"2026\\",\\"quarter\\":\\"2\\"}", columns:"..."}.',
    inputSchema: { type: 'object', properties: { args: { type: 'object' } }, required: ['args'] },
    execute: ({ args }) => { step('Lấy số doanh nghiệp: ' + (args && args.endpoint_name || args && args.action)); return wi('wi_data_companies', args || {}, signal); } },
  { name: 'source_news', description: 'Tin tức mới: {action:"news_feed", category:"Ngân hàng"|"Kinh tế vĩ mô", keyword?, symbol?, from_time?, limit?} hoặc {action:"ai_news", category_type:"Vĩ mô Việt Nam", ...}.',
    inputSchema: { type: 'object', properties: { args: { type: 'object' } }, required: ['args'] },
    execute: ({ args }) => { step('Đọc tin: ' + (args && (args.keyword || args.category || args.category_type || args.symbol) || '')); return wi('wi_data_news', Object.assign({ limit: 10 }, args || {}), signal); } },
  { name: 'request_update', description: 'Đề nghị chạy cập nhật dữ liệu dashboard (kéo số mới, build, đẩy lên web; mất khoảng 20–40 phút). Không tự chạy: trang hiện nút để người dùng xác nhận. note = yêu cầu thêm cho lần chạy (vd "viết bản cập nhật nhanh").',
    inputSchema: { type: 'object', properties: { note: { type: 'string' } } },
    execute: ({ note }) => { pendingUpdate = String(note || ''); return 'Đã hiện nút xác nhận cho người dùng. Nói ngắn gọn rằng họ cần bấm xác nhận.'; } },
];
let pendingUpdate = null;

function rules() {
  const c = CTX; const today = new Date().toISOString().slice(0, 10);
  const cat = c ? Object.entries(c.series).map(([k, s]) => `${k} | ${s.label} | ${s.freq}${s.unit ? ' | ' + s.unit : ''} | mới nhất ${s.last[0]} = ${s.last[1]}`).join('\n') : '(chưa tải được dữ liệu)';
  const q = c && c.sections.quick && c.sections.quick[0];
  return `Bạn là trợ lý phân tích ngành Ngân hàng Việt Nam của FinSuccess, làm việc với chuyên viên Minh Đức trên dashboard CSTT & ngành Ngân hàng. Hôm nay ${today}. Dữ liệu dashboard đến ${c ? c.dataAsOf : '?'}.

CÁCH LÀM
- Trả lời bằng tiếng Việt, văn phong trình bày (không phải đối thoại xã giao), ngắn gọn, số quan trọng in đậm. Dùng "Nhận định:" và "Hàm ý:" cho phần diễn giải; không dùng "Cách đọc:".
- Mọi con số phải lấy từ công cụ (get_series, get_banks, get_section, source_*) và mọi phép tính qua calc. Không bịa số. Thiếu số thì nói thiếu và nêu cách lấy.
- Ghi nguồn theo cơ quan công bố gốc (NHNN, Cục Thống kê, Bộ Tài chính, VIRA, Fed, BLS, U.S. Treasury, BCTC ngân hàng…). Số lấy từ Wi MCP thì ghi nguồn "Wi MCP"; số lấy từ nguồn ngoài thì ghi đúng nguồn ngoài đó.
- Nêu rõ ngày/kỳ của số liệu. Phân biệt số đã công bố với giả định.
- TIN ĐỒN / GIẢ ĐỊNH: ghi rõ đây là giả định chưa xác nhận. Tính lại các chỉ tiêu liên quan trên chuỗi gốc rồi nêu hàm ý cho ngành, nhóm ngân hàng, và các ngân hàng nhạy nhất. Ví dụ tín dụng: tín dụng tháng t theo % MoM m → YTD mới = (1+YTD tháng trước)×(1+m)−1; MoM cùng tháng năm trước = (1+YTD_t năm trước)/(1+YTD_{t−1} năm trước)−1 (tháng 1: chính YTD_t1); YoY mới = (1+YoY tháng trước)×(1+m)/(1+MoM cùng tháng năm trước)−1. So với nhịp các năm trước cùng kỳ và với định hướng cả năm (kiểm sbvEvents/quick nếu có số mục tiêu; không có thì nói chưa có).
- Biểu đồ: khi chart giúp hiểu nhanh, chèn khối mã \`\`\`chart chứa JSON: {"type":"line"|"bar","title":"…","unit":"%","labels":[…],"series":[{"name":"…","data":[…],"type":"line"|"bar"(tuỳ chọn),"dashed":true(tuỳ chọn, cho giả định)}]}. Tối đa 2 chart mỗi câu trả lời, mỗi chart ≤ 60 điểm. Bảng dùng Markdown.
- Yêu cầu cập nhật dữ liệu ("update", "cập nhật số", "kéo số mới"): gọi request_update (kèm note nếu người dùng muốn thêm việc, ví dụ viết bản cập nhật nhanh). Không hứa đã cập nhật.
- Gọi ít công cụ nhất có thể; gom nhiều mã vào một lần gọi.

QUAN ĐIỂM GẦN NHẤT CỦA FINSUCCESS (báo cáo vĩ mô ${q ? q.date : '?'}): ${q ? q.headline : '—'}

DANH MỤC CHUỖI (mã | tên | tần suất | đơn vị | điểm mới nhất). Chuỗi tháng có từ 2021; chuỗi ngày: 120 phiên gần nhất theo ngày, trước đó là phiên cuối mỗi tuần về tới 2021; lãi suất liên ngân hàng theo kỳ hạn (vira.*) có từ 03/2024.
${cat}

NGÂN HÀNG: ${c ? Object.entries(c.sections.meta.groups).map(([s, g]) => s + ' (' + g + ')').join(', ') : ''}. Quý có số: ${c ? c.banks.quarters.slice(-6).join(', ') : ''}.
${MODE === 'api' ? 'Phiên này KHÔNG có công cụ source_*: chỉ dùng dữ liệu dashboard; số chưa có thì nói rõ chưa có trong dashboard.' : ''}
MÃ CHỈ TIÊU NGUỒN TRỰC TIẾP (source_macro): tín dụng YTD 241732, YoY 75847; tiền gửi YoY 265963; M2 265954; CPI 75701; lạm phát cơ bản 202889; USD/VND NHTM bán 82223, tự do 82226, trung tâm 82227; LNH qua đêm 82237; OMO 81522; bơm/hút ròng 82268; LS huy động 12T Big 4 202886; DXY 235028; EFFR 7079.`;
}

/* ---------- hiển thị ---------- */
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
function inline(s) { return s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>'); }
function md(src, charts) {
  const out = []; const lines = src.replace(/\r/g, '').split('\n'); let i = 0;
  while (i < lines.length) {
    let L = lines[i];
    const f = /^```(\w*)/.exec(L);
    if (f) { const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++;
      if (f[1] === 'chart') { const id = 'c' + Math.random().toString(36).slice(2, 9); charts.push([id, buf.join('\n')]); out.push(`<div class="chartbox"><canvas id="${id}" aria-label="biểu đồ"></canvas></div>`); }
      else out.push('<pre>' + esc(buf.join('\n')) + '</pre>'); continue; }
    if (/^\s*\|/.test(L) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const row = l => l.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim());
      const h = row(L), al = row(lines[i + 1]).map(x => /-:$/.test(x)); i += 2; const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(row(lines[i++]));
      const isN = (v, k) => al[k] || /^[−+\-]?[\d.,]+\s*(%|bps|x|lần)?$/.test(v);
      out.push('<div class="tw"><table><thead><tr>' + h.map((x, k) => `<th class="${al[k] ? 'n' : ''}">${inline(esc(x))}</th>`).join('') + '</tr></thead><tbody>' +
        rows.map(r => '<tr>' + r.map((x, k) => `<td class="${isN(x, k) ? 'n' : ''}">${inline(esc(x))}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>'); continue; }
    const hm = /^(#{1,4})\s+(.*)/.exec(L);
    if (hm) { const n = Math.min(4, hm[1].length + 1); out.push(`<h${n}>${inline(esc(hm[2]))}</h${n}>`); i++; continue; }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(L)) { const ol = /^\s*\d/.test(L); const it = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) it.push(lines[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, ''));
      out.push(`<${ol ? 'ol' : 'ul'}>` + it.map(x => '<li>' + inline(esc(x)) + '</li>').join('') + `</${ol ? 'ol' : 'ul'}>`); continue; }
    if (!L.trim()) { i++; continue; }
    const p = []; while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|\s*\||\s*([-*•]|\d+[.)])\s)/.test(lines[i])) p.push(lines[i++]);
    if (!p.length) { p.push(lines[i++]); }
    out.push('<p>' + inline(esc(p.join('\n'))).replace(/\n/g, '<br>') + '</p>');
  }
  return out.join('');
}
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const PAL = () => [css('--blue'), css('--teal'), css('--gold-ink'), css('--neg'), css('--pos'), css('--purple')];
function drawCharts(charts) {
  if (!window.Chart) return;
  charts.forEach(([id, txt]) => { const el = document.getElementById(id); if (!el || Chart.getChart(el)) return; let s;
    try { s = JSON.parse(txt); } catch (e) { el.parentElement.outerHTML = '<p class="err">Không vẽ được chart (dữ liệu chart lỗi định dạng).</p>'; return; }
    const pal = PAL(), ink = css('--ink2'), grid = css('--line'), u = s.unit || '';
    new Chart(el, { type: s.type === 'bar' ? 'bar' : 'line',
      data: { labels: s.labels, datasets: (s.series || []).map((d, k) => ({ label: d.name, data: d.data, type: d.type || undefined, borderColor: pal[k % pal.length], backgroundColor: (d.type || s.type) === 'bar' ? pal[k % pal.length] + 'cc' : pal[k % pal.length],
        borderDash: d.dashed ? [5, 4] : [], pointRadius: (s.labels || []).length > 24 ? 0 : 2.5, borderWidth: 2, tension: .2, spanGaps: true })) },
      options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { title: { display: !!s.title, text: s.title, color: css('--navy'), font: { size: 13, weight: '600' } }, legend: { labels: { color: ink, boxWidth: 12 } },
          tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y == null ? '—' : c.parsed.y.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}${u}` } } },
        scales: { x: { ticks: { color: ink, maxRotation: 0, autoSkip: true }, grid: { display: false } }, y: { ticks: { color: ink, callback: v => v.toLocaleString('vi-VN') + u }, grid: { color: grid } } } } }); });
}

function addMsg(role, html) {
  const m = document.createElement('div'); m.className = 'msg ' + role; m.innerHTML = `<div class="bub"></div>`;
  if (html != null) m.firstChild.innerHTML = html; $('#ai_log').appendChild(m); scrollEnd(); return m;
}
function scrollEnd() { const el = $('#ai_main'); el.scrollTop = el.scrollHeight; }
function renderHistory() {
  turns.forEach(t => { if (t.role === 'user') addMsg('u').firstChild.textContent = t.content; else { const ch = []; addMsg('a', md(t.content, ch)); setTimeout(() => drawCharts(ch), 0); } });
  $('#ai_intro').hidden = turns.length > 0;
}
const $$ = s => Array.from(panel.querySelectorAll(s));
renderHistory();

/* ---------- hỏi ---------- */
const ERR = { bad_password: 'Sai mật khẩu Trợ lý AI — nhập lại bên dưới.', not_granted: 'Bạn chưa cho phép trang dùng Claude. Mở lại trang để được hỏi lại.', rate_limited: 'Đã chạm giới hạn sử dụng, thử lại sau ít phút.',
  session_expired: 'Phiên đăng nhập hết hạn, đăng nhập lại claude.ai.', prompt_too_large: 'Hội thoại quá dài — bấm "Xoá hội thoại" rồi hỏi lại.',
  sampling_disabled: 'Tài khoản này chưa bật Claude cho trang.', tools_unavailable: 'Chế độ xem này không chạy được công cụ của trang.', refused: 'Claude không trả lời yêu cầu này; thử diễn đạt khác.' };
async function ask(text) {
  if (!sample || busy) return;
  $('#ai_intro').hidden = true;
  addMsg('u').firstChild.textContent = text;
  turns.push({ role: 'user', content: text }); save();
  const m = addMsg('a', '<span class="think">Đang suy nghĩ…</span>'), bub = m.firstChild;
  const steps = document.createElement('div'); steps.className = 'steps'; m.insertBefore(steps, bub);
  const step = t => { const d = document.createElement('div'); d.className = 'st'; d.textContent = t; steps.appendChild(d); scrollEnd(); };
  busy = new AbortController(); pendingUpdate = null; toggle(true);
  const tab = (document.querySelector('#tabbar .active') || {}).textContent || '';
  const hist = turns.slice(-12); const input = [{ role: 'user', content: rules() + (tab ? '\n\nNgười dùng đang xem tab: ' + tab.trim() + '.' : '') }, ...hist];
  let charts = [];
  try {
    const r = await sample(input, { cache: false, signal: busy.signal, modelTier: $('#ai_deep').checked ? 'complex' : 'default', tools: TOOLS(step, busy.signal),
      onText: ({ text }) => { charts = []; bub.innerHTML = md(text, charts); scrollEnd(); } });
    charts = []; bub.innerHTML = md(r.text, charts); drawCharts(charts);
    turns.push({ role: 'assistant', content: r.text }); save();
    if (r.truncated) bub.insertAdjacentHTML('beforeend', '<p class="note">Câu trả lời bị cắt — hỏi hẹp hơn.</p>');
  } catch (e) {
    if (e.code === 'cancelled') { bub.innerHTML = e.text ? md(e.text, charts) + '<p class="note">Đã dừng.</p>' : '<p class="note">Đã dừng.</p>'; }
    else { if (e.code === 'bad_password') { try { localStorage.removeItem(PWK); } catch (x) {} setTimeout(() => askPw('Mật khẩu chưa đúng.'), 0); }
      bub.innerHTML = (e.text ? md(e.text, charts) : '') + `<p class="err">${esc(ERR[e.code] || 'Có lỗi kết nối, bấm Gửi lại để thử.')}</p>`; }
    turns.pop(); save();
  } finally { busy = null; toggle(false); if (pendingUpdate != null) showConfirm(pendingUpdate); }
}
function toggle(on) { $('#ai_send').hidden = on; $('#ai_stop').hidden = !on; setStatus(on ? 'Đang xử lý…' : ''); }
$('#ai_stop').onclick = () => busy && busy.abort();
$('#ai_form').onsubmit = e => { e.preventDefault(); const t = $('#ai_q').value.trim(); if (!t) return; $('#ai_q').value = ''; ask(t); };
$('#ai_q').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#ai_form').requestSubmit(); } };
$('#ai_chips').onclick = e => { const b = e.target.closest('.chip'); if (b) ask(b.textContent.trim()); };
$('#ai_clear').onclick = () => { turns = []; save(); $$('#ai_log .msg').forEach(x => x.remove()); $('#ai_intro').hidden = false; };

/* ---------- cập nhật dữ liệu (tác vụ đã lên lịch) ---------- */
function showConfirm(note) {
  const m = addMsg('a'); m.firstChild.outerHTML = `<div class="confirm"><b>Chạy cập nhật dữ liệu dashboard?</b>
    <span class="note">${MODE === 'api' ? 'Kéo số mới từ Fed, U.S. Treasury, ECB, BOJ, NHNN (tỷ giá), VIRA rồi build lại trang. Khoảng 15 phút.' : 'Một phiên Claude sẽ kéo số mới (NHNN, VIRA, Fed, Treasury…), build lại dashboard và trợ lý, rồi đẩy lên web. Thường mất 20–40 phút.'}${note ? ' Yêu cầu thêm: ' + esc(note) : ''}</span>
    <div class="row"><button class="btn pri" type="button" data-go>Chạy cập nhật</button><button class="btn" type="button" data-no>Không</button></div><span class="note" data-st></span></div>`;
  const box = m.querySelector('.confirm');
  box.querySelector('[data-no]').onclick = () => { box.querySelector('.row').remove(); box.querySelector('[data-st]').textContent = 'Đã bỏ qua.'; };
  box.querySelector('[data-go]').onclick = () => fire(note, box);
}
async function fire(note, box) {
  const st = box.querySelector('[data-st]'), row = box.querySelector('.row');
  if (MODE === 'api') {
    row.querySelectorAll('button').forEach(b => b.disabled = true); st.textContent = 'Đang gửi yêu cầu…';
    try { await post('/update', { note }); row.remove(); st.textContent = 'Đã chạy cập nhật số liệu quốc tế, tỷ giá NHNN và lãi suất liên ngân hàng (khoảng 15 phút). Số trong nước và BCTC ngân hàng cập nhật tự động lúc 17:20 các ngày làm việc. Tải lại trang sau khi xong.'; }
    catch (e) { row.querySelectorAll('button').forEach(b => b.disabled = false); st.textContent = e.code === 'bad_password' ? 'Sai mật khẩu.' : 'Chưa gửi được (' + (e.message || e.code) + ').'; }
    return;
  }
  if (!mcp) { st.textContent = 'Chế độ xem này không gọi được tác vụ cập nhật.'; return; }
  row.querySelectorAll('button').forEach(b => b.disabled = true); st.textContent = 'Đang gửi yêu cầu…';
  try {
    const input = { trigger_id: CFG.triggerId }; if (note) input.text = 'Yêu cầu thêm từ Trợ lý AI: ' + note;
    await mcp.callTool(CFG.ccr, 'fire_trigger', input);
    row.remove(); st.textContent = 'Đã bắt đầu cập nhật lúc ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + '. Kết quả sẽ có trong danh sách tác vụ đã lên lịch của bạn; tải lại trang này sau khi xong để trợ lý dùng số mới.';
  } catch (e) {
    row.querySelectorAll('button').forEach(b => b.disabled = false);
    st.textContent = e.code === 'server_not_connected' ? 'Chưa có connector Claude Code Remote trong claude.ai.' : e.code === 'tool_error' ? 'Tác vụ trả lỗi: ' + (e.message || '') : 'Chưa gửi được (' + (e.code || 'lỗi') + '). Bấm lại để thử.';
  }
}
$('#ai_updBtn').onclick = () => { $('#ai_intro').hidden = true; showConfirm(''); };

})();
