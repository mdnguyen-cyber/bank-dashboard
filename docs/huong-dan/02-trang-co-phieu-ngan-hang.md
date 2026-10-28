# 2 · Trang cổ phiếu ngân hàng (CTG, VCB, BID, TCB, MBB, ACB)

Tài liệu này mô tả đủ chi tiết để dựng lại 6 trang cổ phiếu ngân hàng: `index.html` (CTG), `vcb.html`, `bid.html`, `tcb.html`, `mbb.html`, `acb.html`. Cả 6 trang dùng **chung một renderer** `assets/app.js` (1.327 dòng, IIFE, vanilla JS + Chart.js 4.4.1). Dữ liệu của từng trang nằm trong `data/<mã>-data.js` (`window.PVS_DATA`), sinh bởi `scripts/build_ctg_data.py --ticker <MÃ>` từ response Wi MCP gốc, với hồ sơ và lời bình biên tập tay ở `data/banks.json`.

Quy ước ghi chú: `app.js:240` = file `assets/app.js` dòng 240. Màu ghi theo hex dùng thật trong code.

---

## 1. Cấu trúc trang

### 1.1 Khung HTML (giống hệt nhau ở 6 trang)

Sáu file HTML chỉ khác nhau ở **3 chỗ** (kiểm bằng `diff index.html vcb.html`):

| Chỗ khác | CTG (`index.html`) | VCB (`vcb.html`) |
|---|---|---|
| `<title>` | `CTG Tracker · FinSuccess` | `VCB Tracker · FinSuccess` |
| `<option ... selected>` trong ô chọn ngân hàng | `index.html` | `vcb.html` |
| Script dữ liệu | `data/ctg-data.js` | `data/vcb-data.js` |

Phần còn lại, theo thứ tự trong file:

1. **`<head>`**
   - Script tự tải lại khi có bản mới: hằng `V='__BUILD__'`; nếu chuỗi vẫn còn chữ `BUILD` (chạy local) thì bỏ qua; nếu không, `fetch('version.json?t=…', {cache:'no-store'})`, khác `V` thì `location.replace` thêm `?_v=<v>`. `__BUILD__` và `version.json` do `scripts/gom_site.sh` thay bằng 7 ký tự đầu của `GITHUB_SHA` khi deploy; script này cũng gắn `?v=<sha>` vào mọi `data/*.js`, `assets/*.js`, `assets/fs.css`.
   - `<meta charset="utf-8">`, viewport, favicon `assets/favicon-32.png`, `favicon-192.png` (cả `apple-touch-icon`).
   - `<link rel="stylesheet" href="assets/fs.css">`.
   - `<script src="assets/devview.js">` (chế độ User/Developer, mục 3.12).
   - `<script type="speculationrules">`: prerender mọi `*.html` (eagerness `moderate`, trừ `[download]`, `[target=_blank]`), prefetch `vimo.html`, `nganh.html` (eager).
2. **Thanh logo** `div.logo-bar > div.wrap`:
   - `.logo-left`: `<img src="assets/fin-success-logo.png" alt="FinSuccess">` (cao 38px, 30px khi ≤ 760px) + `nav.site-nav`:
     - `<a href="vimo.html">Vĩ mô</a>`, `<a href="nganh.html">Ngành Ngân hàng</a>`
     - `label.bank-pick.on` gồm `<span>Ngân hàng</span>` + `<select aria-label="Chọn ngân hàng" onchange="if(this.value)location.href=this.value">`: 6 option có trang (VCB, BID, CTG→`index.html`, TCB, MBB, ACB) rồi 20 option `disabled` dạng `VPB · sắp có` (VPB, HDB, LPB, SHB, STB, VIB, TPB, MSB, SSB, OCB, EIB, NAB, ABB, KLB, VAB, BVB, BAB, PGB, SGB, NVB).
     - `<a href="bh.html">Ngành Bảo hiểm</a>`, `<a href="ck.html">Ngành Chứng khoán</a>`
     - `label.bank-pick.devonly` (`BH · CK`) với `optgroup` Bảo hiểm (BVH, PVI, MIG, BMI, BIC, PTI → `dn.html?s=…`) và Chứng khoán (SSI, TCX, VCK, VPX, HCM, VCI, MBS, VND, SHS).
     - `<a href="backend.html">Database</a>`
   - `.logo-right > div.stamp#stamp` (chữ 12px, `#596272`). Các script chèn thêm vào `.logo-right` (prepend): nút “👁 User view”, “Xuất PDF”, “PDF bản đang xem”.
3. **Đầu cổ phiếu**: `<div class="stock-head"><div class="wrap" id="stockHead"></div></div>` (render bởi `header()`).
4. **Thanh tab**: `<nav class="tabs" role="tablist" aria-label="Các mục dashboard"><div class="wrap" id="tabbar">` gồm 5 `<button role="tab" data-tab="…">`:
   `overview` “Tổng quan” (class `active`) · `fin` “Tài chính” · `events` “Catalyst &amp; Sự kiện” · `cons` “Consensus CTCK” · `val` “💎 FinSuccess”. Thanh tab `position:sticky;top:0;z-index:20`.
5. **Nội dung**: `<main><div class="wrap">` chứa 5 `<section class="pane" id="overview|fin|events|cons|val" role="tabpanel">` (rỗng; `overview` có class `active`).
6. **Footer**: `<footer><div class="wrap" id="foot"></div></footer>`.
7. **Thứ tự script cuối `<body>`** (bắt buộc giữ thứ tự):
   ```
   https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js
   assets/chat-config.js      → window.FS_CHAT = { url: '' }
   assets/chartkit.js         → window.FSK, FSPDF, nút PDF, nút ↑, nút ✦ Trợ lý AI, plugin legendAll
   assets/share.js            → chia sẻ ảnh chart ("＋ Ghép")
   data/<mã>-data.js          → window.PVS_DATA
   data/big3-data.js          → window.BIG3
   data/fx-daily.js           → window.FX_DAILY (trang ngân hàng nạp nhưng app.js không dùng)
   assets/fxchart.js          → window.FSFX (không dùng ở trang ngân hàng)
   data/sector-data.js        → window.SECTOR_DATA (dùng cho so sánh 26 NH, P/B lịch sử, CAMEL TT21)
   data/notes-data.js         → window.FS_NOTES (ghi chép đã đăng)
   assets/notes.js            → window.FSN (khối ghi chép quyết định)
   assets/app.js              → renderer
   assets/chat.js             → khung chat (thoát ngay vì FS_CHAT.url rỗng và không có FS_ARTIFACT)
   ```

### 1.2 Layout và token CSS (`assets/fs.css`)

- `:root`: `--navy:#1D2678; --blue:#2938A8; --teal:#59C5C8; --teal-ink:#1f8a8d; --purple:#861C52; --gold:#FFD45D; --gold-ink:#9a7400; --ink:#303540; --ink2:#596272; --muted:#8a93a3; --line:#d9dde4; --line2:#e9ecf2; --bg:#F7F9FD; --card:#fff; --soft:#F0F4FF; --pos:#1e8f5a; --neg:#c0392b; --warn:#b7791f; --radius:16px`.
- `body`: nền `--bg`, chữ `14px/1.5 Arial`. `.wrap{max-width:1440px;margin:0 auto;padding:0 24px}` (16px khi ≤ 760px).
- `main{padding:24px 0 60px}`; `.pane{display:none}.pane.active{display:block}`.
- Tiêu đề: `h2.sec` 22px navy, viền trái 4px teal; `.sec-sub` 13px `--ink2`; `h3.grp-h` (nhóm chart trong tab con) 15px, viền trái 4px teal, `small` 12px `#8a93a3`; `h3.sub` (tiêu đề thẻ) 16px navy, flex.
- Thẻ: `.card{background:#fff;border:1px solid --line;border-radius:16px;padding:22px;margin-bottom:18px}` (padding 16px khi ≤ 760px).
- Lưới: `.grid{display:grid;gap:18px}`, `.g2` 2 cột (1 cột khi ≤ 760px), `.gap{margin-bottom:18px}`.
- KPI: `.kpis` 6 cột (3 cột ≤ 1100px, 2 cột ≤ 760px), `.kpis.k4` 4 cột; `.kpi` viền 1px, bo 14px, `span` 11px chữ hoa, `b` 22px 800 navy, `em.pos` `#1e8f5a`, `em.neg` `#c0392b`.
- `.facts` 4 cột (2 cột ≤ 1100px), `.fact` nền `#f5f7fb`.
- **Chiều cao vùng chart** (`.cbox`, `position:relative`): mặc định **280px**, `.cbox.tall` **340px**, `.cbox.short` **230px**; trong `.gov2` cũng 280px. Chart Consensus `chTp`, `chNp` đặt chiều cao động (mục 2.4).
- Bảng: `th` nền `--soft` navy; `td.n,th.n` canh phải; `tr.hl td` nền `#fffbea` đậm; `tr.stale td` `#9aa3b2`; `.tscroll{overflow-x:auto}`.
- Lời đọc `.insight` 13px, gạch đứt phía trên; nguồn `.src` 11px `#9aa3b2`; `.note` 12,5px; `.chart-sub` 12px `--ink2`.
- Pill: `.pill.ok` (`#e3f5ec`/`--pos`), `.pill.watch` (`#fff4d6`/`--gold-ink`), `.pill.risk` (`#fde8e6`/`--neg`), `.pill.ai` (`#e6f6f6`/teal-ink), `.pill.pending`.
- Dấu tác động `.imp.p` xanh `+`, `.imp.m` đỏ `−`, `.imp.z` xám `0`/`?`.
- `.subtabs button` bo 99px; `.on` nền `#e6f6f6`, viền teal, đậm. `.sub{display:none}.sub.on{display:block}`.
- `.picker button` bo 99px, `.on` nền navy chữ trắng; `.filter button` tương tự.

### 1.3 Header cổ phiếu — `header()` (`app.js:223`)

Ghi vào `#stockHead`:

| Phần tử | Nội dung |
|---|---|
| `.tick` | `M.ticker` (22px, nền `--soft`) |
| `.cname` | `M.name` + `<small>`: `{exchange} · Nhóm {peerGroup} · BCTC mới nhất {latestQuarter}` |
| `.hstats > .hstat` × 4 | `Giá` = `nf(M.price)+'đ'`; `Vốn hóa` = `nf(M.mcap)+' tỷ'`; `P/B` = `x(M.pb)` (2 số lẻ + `x`); `P/E TTM` = `x(M.pe)` |
| `.view-chip` | Trạng thái quyết định analyst (`localStorage` `fs-bank-<MÃ>` → `decision.status`) viết HOA, kèm `<small>QUAN ĐIỂM</small>`; chưa có → class `none` (nền `#eef1f6`) chữ `CHƯA NHẬP` |

`#stamp` = `Giá {dd/mm/yyyy priceDate} · cập nhật dữ liệu {dd/mm/yyyy updated}`.

### 1.4 Footer — `footer()` (`app.js:1197`)

`<b>Nguồn:</b>` danh sách `D.sources` (có link nếu `u`), nối bằng ` · `; `<br><b>Công thức tự tính:</b>` mọi cặp `D.formula` dạng `key: công thức`; `<br>` `D.quarterlyNote` + câu cố định: “Lời đọc dưới chart do AI viết từ số đang hiển thị; quan điểm FinSuccess chỉ là phần analyst nhập ở tab 💎 FinSuccess. Dữ liệu Wi MCP lấy qua connector ngày {updated}.”

### 1.5 Khởi động (`app.js:1318–1326`)

`setMode('compact')` → `header()` → `footer()` → `show(hash || 'overview')` → `decorate()` → `history.scrollRestoration='manual'`, `scrollTo(0,0)` (cả sau `load`) để link có hash không tự cuộn xuống giữa trang.

---

## 2. Các tab, tab con và từng chart/bảng

### 2.0 Hạ tầng vẽ chart dùng chung

**Bảng màu `C` trong `app.js:7`** (khác token CSS — chart dùng bộ này):

| Khóa | Hex | Khóa | Hex |
|---|---|---|---|
| `navy` | `#002060` | `gold` | `#FFD45D` |
| `blue` | `#97BAFF` | `red` | `#c0392b` |
| `teal` | `#59C5C8` | `grey` | `#9aa3b2` |
| `purple` | `#861C52` | `steps` | `#002060, #3D5C99, #5576B8, #6171C5, #8997D6, #B3BDE8, #D9DEF4` |

Bảng màu phụ: `MIX_COL = [navy, blue, teal, purple, gold, #8997D6, #1f8a8d, red, #B3BDE8, #9a7400, grey, #5b6475]` (chart cơ cấu %); `PEER_COL = { 'Big 4': #002060, 'Tư nhân lớn': #97BAFF, 'Tư nhân vừa': #8997D6, 'Tư nhân nhỏ': #B3BDE8 }`; `FEE_COL = { pay:#002060, ins:#59C5C8, trust:#861C52, sec:#9a7400, adv:#97BAFF, cash:#9aa3b2, oth:#FFD45D }`; màu giao dịch nội bộ: mua `#2bbfa4`, bán `#ef7a4a`.

**Chart.js defaults** (`app.js:37–48`): font `Arial, "Helvetica Neue", sans-serif` 11,5px, màu `#3f4656`; legend dưới, `boxWidth:12`; `maintainAspectRatio:false`; `animation:false`. Tooltip mặc định: nhãn `"{label}: {nf(v, ds.dp ?? 1)}{ds.unit}"`; với floating bar (`raw` là mảng) in hiệu `raw[1]-raw[0]` với `ds.dp ?? 0`. Mỗi dataset tự mang `dp` (số lẻ) và `unit` (`'%'`, `'x'`, `'đ'`, `' tỷ'`). `chartkit.js:580`: `resizeDelay=120`, `devicePixelRatio=max(2, dpr)`.

**Plugin `refLines`** (`app.js:49`, đăng ký toàn cục): `options.plugins.refLines.lines = [{ value, label, color, axis ('y' mặc định, 'x' cho đường dọc), dash (mặc định [5,4]), width (1,5) }]`. Vẽ đường đứt trên vùng chart; nhãn là pill nền trắng 90%, chữ `600 11px Arial` cùng màu đường; nhãn đường ngang đặt sát trái, tự giãn 15px để không chồng; nhãn đường dọc đặt trên đỉnh vùng vẽ (`mk()` tự chừa `layout.padding.top ≥ 18`).

**`mk(id, cfg, opt)`** (`app.js:72`): hủy chart cũ cùng id → `interaction` mặc định `{mode:'index', intersect:false, axis: indexAxis==='y' ? 'y' : 'x'}` → `FSK.prep(cfg)` (chart lẫn cột+đường: đường `order:0`, cột `order:10`, để đường luôn vẽ trên cột) → `new Chart` → `FSK.enhance(chart, {today, last, win})`. `win` mặc định = **60 tháng (5Y) cho mọi chart trong `#fin`**; ngoài ra theo `opt.win`. `opt.switch:'bar'|'line'` dựng nút **Cột / Đường** trong `<span class="ctl" data-ctl="{id}">` ở tiêu đề thẻ (dataset có `keep:true` không đổi kiểu; khi về cột thì trục y `beginAtZero`).

**`FSK.enhance`** (`chartkit.js:101`) — áp cho mọi chart (trừ scatter và `indexAxis:'y'`) có ≥ 6 nhãn parse được thành ngày (`Q1/2026`, `Q1/26`, `mm/yyyy`, `dd/mm/yyyy`, `yyyy-mm(-dd)`, `dd/mm`):
- Thanh `div.rng` chèn ngay trước `.cbox`: nút `1M · 3M · 6M · YTD · 1Y · 3Y · 5Y · Tất cả` (nút nào cho < 2 điểm hoặc đủ cả chuỗi thì `disabled`); nhóm trục Y `Y vừa dữ liệu` / `Y tuỳ chỉnh` (2 ô min, max) / `Y mặc định`; gợi ý “kéo trên chart để zoom · kéo trên trục Y để chỉnh trục”.
- Kéo chuột trên vùng vẽ để zoom (hộp `.zsel`), nhấp đúp để về toàn bộ; kéo trên trục Y: nửa dưới chỉnh min, nửa trên chỉnh max, thả tay làm tròn bước, nhấp đúp trục = mặc định.
- Chart một loại, không chồng, chưa có nút `.ctl`: thêm cặp `Cột / Đường` (`span.tsw`).
- Chart cột chồng, toàn số dương, trục y không cố định max 100: thêm nút **`100% tỷ trọng`** ↔ `Giá trị gốc`.
- Rê chuột: chuỗi/ô đang chỉ được giữ màu, chuỗi khác nhạt còn 40% (ô cột khác 55%).
- Nhãn năm `2016` không parse được → chart năm không có thanh khung thời gian. `chValF`/`chVal` có nhãn cuối “Hiện tại dd/mm/yyyy” nên cũng không có thanh này.

**Plugin `legendAll`** (`chartkit.js:563`): chart ≥ 3 dataset và legend đang hiện có nút dưới chart `↺ Hiện tất cả` / `⊘ Ẩn tất cả` (`div.lgall`).

**Khuôn thẻ `card({...})`** (`app.js:207`):
```html
<article class="card {cls}">
  <h3 class="sub">{title}<span class="ctl" data-ctl="{id}"></span>?</h3>
  <p class="chart-sub">{sub}</p>?
  <div class="cbox {h}"><canvas id="{id}" role="img" aria-label="{title}"></canvas></div>?
  {body}
  <div class="insight">{insight}</div>?
  <div class="src">Nguồn: {src}</div>?
</article>
```
`h` ∈ `''` (280px) · `'tall'` (340px) · `'short'` (230px). Khi trang dựng xong, `decorate()` thêm nút `(i)` và hàng `.ibar` (mục 3.10).

**Trục**: `pctAxis(title, extra)` → nhãn `nf(v,1)+'%'`, lưới `#eef0f4`; `numAxis(title, extra)` → nhãn `nf(v,0)`. Định dạng số kiểu Việt (`toLocaleString('vi-VN')`): dấu chấm nghìn, phẩy thập phân. Hàm: `nf`, `pc` (thêm `%`), `sg` (thêm dấu `+`), `x` (thêm `x`), `r100` (làm tròn 100đ), `dvn` (ISO → `dd/mm/yyyy`).

**Biến dùng khắp nơi**: `Q = D.quarterly`, `QL` = quý mới nhất, `QP` = quý trước, `Q[Q.length-5]` = cùng kỳ năm trước; `M = D.meta`; `CS = D.consensus`; `FW = CS.fwd`; `VB = D.valuation`; `T = M.ticker`; `NR = D.narr`; `GRP = M.peerGroup` ('Big 4' hoặc 'Tư nhân lớn'); `BIG = GRP==='Big 4'`; `LTK` = `['VCB','BID','CTG']` nếu Big 4, ngược lại `['TCB','MBB','ACB']`; `depB = D.macro.rates.dep12Bank`; `AQ(q)(m, g)` = bình quân nhóm `g` ('Big 4' | GRP | 'all') của chỉ tiêu `m` ở quý `q` từ `D.ctx.agg`; `yoyQ(k, i)` = % thay đổi so với 4 quý trước.

---

### 2.1 Tab 1 · Tổng quan (`paneOverview`, `app.js:240`)

Thứ tự từ trên xuống:

1. `h2.sec` “Tổng quan”.
2. **Banner** `.banner`: “**Quyết định hiện tại của analyst:** {status · action}” hoặc “chưa nhập — vào tab 💎 FinSuccess để ghi quyết định, giá mục tiêu và vùng mua.”
3. **6 KPI** (`.kpis`):

   | Nhãn | Giá trị | Dòng phụ (em) |
   |---|---|---|
   | Giá hiện tại | `M.price` đ | `đóng cửa {priceDate}` |
   | Upside vs TP của tôi | `tp/price − 1` (TP từ localStorage) | `TP …đ` / `chưa nhập TP`; class `pos`/`neg` theo dấu |
   | Upside vs consensus | `CS.summary.upsideMedian` | `median TP … · {n} CTCK ≤ 3 tháng` (pos) |
   | P/B | `M.pb` | `TB 5 năm {pbBand.mean} · fwd {FW.pbFwd}` |
   | P/E TTM | `M.pe` | `fwd 2026F {FW.peFwd} · TB 5 năm {peBand.mean}` |
   | LNTT {ytdLabel} | `plan.pbtYTD` tỷ | `{pbtYTDyoy} YoY · {pbtDone}% KH {plan.pbt}` (pos); ẩn nếu không có `D.plan` |
4. **Thẻ “Thông tin doanh nghiệp”**: `.facts` 8 ô: Vốn hóa (tỷ, ngày giá) · CP lưu hành (triệu; nếu `D.lastStockDiv` thì “sau đợt cổ phiếu {ratio}% (mm/yyyy)”) · BVPS · EPS TTM (`M.ratioPeriod`) · ROE · ROA · NIM · CIR · CASA (`QL.q`, “quý trước …”) · NPL · LLR · CAR · LDR (“CAR {period} (TT41) · LDR {QL.q}”). Nguồn: `M.src` + “CAR từ báo cáo TT41 (bán niên/năm). LDR theo công thức Wi MCP (tiền gửi KBNN tính theo hệ số TT26/TT08).”
5. **`chPrice`** — “Giá cổ phiếu so với ngành ngân hàng và VN-Index”, `h:'short'` (230px).
   - Line, nhãn x = ngày `dd/mm/yyyy` của `D.price.series` (toàn lịch sử, mặc định khung **1Y** vì `win:12`), x `maxTicksLimit:8`, không lưới dọc.
   - Dataset: `Giá {T}` (`c`, `#002060`, 1,8px, `dp 0`, `unit 'đ'`); `Ngành ngân hàng` (`s`, `#861C52`, 1,3px); `VN-Index` (`v`, `#9aa3b2`, 1,3px). `pointRadius 0`, `spanGaps`.
   - **Plugin `rebase`** (`beforeUpdate`): lấy chỉ số đầu khung đang xem `lo = scales.x.min`, quy chuỗi ngành và VN-Index về cùng điểm xuất phát với giá cổ phiếu: `data[j] = raw[j]/raw[i0]*st[i0]`. Khoảng cách giữa các đường = chênh lệch hiệu suất.
   - Tooltip: giá `{nf}đ ({±% từ đầu khung})`; chỉ số in **điểm gốc** `nf(r,2) điểm (±% từ đầu khung)`.
   - `refLines`: `52W High {giá}` màu teal, `52W Low {giá}` màu đỏ.
   - Legend `boxWidth 14, boxHeight 2`.
   - Insight: `perfTxt()` (1 năm và 3 năm: lợi suất cổ phiếu, ngành, VN-Index, vượt/kém ngành bao nhiêu điểm %) + giá hiện tại so đỉnh/đáy 52 tuần (giá, ngày, %) + LNTT YTD YoY + P/B so trung bình 5 năm. Nguồn `D.price.src`.
   - Sub: “đ/CP · giá đóng cửa đã điều chỉnh · lịch sử từ … · đường ngang là đỉnh và đáy 52 tuần · chỉ số ngành và VN-Index quy về cùng điểm xuất phát …”.
6. **Thẻ “Trạng thái 5 trụ luận điểm”** + `pill ai` “AI · theo quy tắc”. Sub = `D.thesisNote` + “Analyst ghi đè trạng thái ở tab FinSuccess › Thesis.” Lưới `.pillars` 5 cột (2 cột ≤ 1100px, 1 cột ≤ 760px). Mỗi `.pillar`: pill trạng thái (`ok`/`holding` → “Hỗ trợ”/“Giữ vững” xanh, `watch` → “Theo dõi” vàng, `risk`/`broken` → “Rủi ro”/“Gãy” đỏ; ưu tiên trạng thái analyst trong localStorage, thêm pill “analyst”), `small` = `step`, `h4` = tiêu đề, `p` = `evidence`, ghi chú analyst, nút `.pgo` “Xem số liệu →” với `data-gofin="{sub}" data-card="{canvasId}"`.
7. **Lưới 2 cột**:
   - “Checklist điều kiện mua” — bảng `Điều kiện | Hiện tại | Ngưỡng | ✓/✗`, 6 dòng (`checklist()`, `app.js:390`; ngưỡng mặc định ghi đè bằng `localStorage.check`):
     1. P/B ≤ TB 5 năm − 1σ (ngưỡng `pbBand.lo`)
     2. NIM TTM tăng so với quý trước (`QL.nim > QP.nim`)
     3. NPL ≤ 1,5%
     4. Hình thành nợ xấu quy năm ≤ 1,5%
     5. LLR ≥ 130%
     6. CAR (TT41, kỳ gần nhất) ≥ 10%
     Dòng cuối `.note.keep` “Đạt x/6 điều kiện.”
   - “Có gì mới ±45 ngày” — tối đa 10 sự kiện có `|ngày − updated| ≤ 45`: ngày · dấu ± · tiêu đề (+ pill “Chờ” nếu pending). Link `data-go="events"` “Xem toàn bộ Catalyst & Sự kiện →”.
8. **Mục “Quản trị & sở hữu”** (`govSection()`, `app.js:316`): `h2.sec` + `.sec-sub` (`NR.ownerSub` hoặc “Ngân hàng do Nhà nước sở hữu chi phối; {strategic} là cổ đông chiến lược nước ngoài.”).
   - Lưới 2 cột:
     - **`chOwn`** “Cơ cấu cổ đông”, `h:'short'`. Bar ngang (`indexAxis:'y'`), 1 nhãn rỗng, **mỗi cổ đông ≥ 0,5% là một dataset chồng** (`stack:'s'`) màu xoay vòng `[navy, teal, purple, gold, blue]`, cuối cùng “Cổ đông khác” `#d9dee8`; trục x stacked `max:100`, nhãn `v%`. Body: bảng `Cổ đông | Số CP | Tỷ lệ | Ngày chốt` + dòng “Cổ đông khác (tự do chuyển nhượng, tổ chức và cá nhân < 0,5%)”; `holderNote` (nếu có, ví dụ BID hoán đổi tỷ lệ) hiện dạng `⚠`. Insight: cổ đông lớn nhất %, tổng nhóm ≥ 5%, tự do chuyển nhượng; `NR.ownerInsight` hoặc câu mặc định về sở hữu Nhà nước ≥ 65% và room ngoại 30%. Nguồn “Wi MCP co_holders”.
     - Thẻ “Cơ cấu quản trị”: bảng `Họ tên | Vai trò | Bổ nhiệm` (HĐQT, BĐH, BKS). Nguồn “Wi MCP co_leaders (chỉ tên, chức vụ, ngày bổ nhiệm)”.
   - Thẻ “Công ty con · liên doanh, liên kết”: bảng `Đơn vị | Loại | Sở hữu | Vốn điều lệ | Mã CK | Ngày chốt` hoặc note “Chưa có danh sách công ty con…”. Nguồn “Wi MCP co_subsidiaries”.
   - Thẻ “Giao dịch cổ đông lớn & người nội bộ” (`drawGov`, `app.js:348`):
     - Lưới `.g2.gov2`: **`chGovPx`** (280px) line “Giá {T} và giao dịch đã thực hiện”: `Giá điều chỉnh` `#97BAFF` 1,3px, nền `rgba(41,56,168,.08)`; `Mua` / `Bán` là dataset không nối đường (`showLine:false`, `pointRadius 6`) đặt ở ngày kết thúc giao dịch (`to`) và giá đóng cửa phiên đó; khung mặc định 5Y; y `beginAtZero`. **`chGovCum`** (280px) bar ngang “Mua / bán lũy kế theo khoảng thời gian · nghìn CP”: nhãn `1 tháng, 3 tháng, 6 tháng, 12 tháng, 24 tháng`, 2 dataset Mua/Bán (khối lượng đã thực hiện, tháng = 30,44 ngày); nếu toàn 0 hiện title xám “Không có giao dịch thực hiện trong 24 tháng gần nhất”.
     - Note giữ (`.note.keep`): “Chấm xanh: mua; cam: bán…”.
     - `h4.gov-h` “Danh sách giao dịch” + `.picker#govSide` (`Tất cả | Mua | Bán`) + ô `input#govQ.gov-q` “Tìm cổ đông / người nội bộ”.
     - `#govTbl`: “Hiển thị n / N bản ghi” + bảng 9 cột `Loại tin | Người giao dịch / quan hệ | Mua / bán | Đăng ký (CP) | Thực hiện (CP) | Thời gian đăng ký | Ngày thực hiện | Sở hữu sau GD | Sau hoàn tất 1M · 3M · 1Y` (lợi suất xanh `pdl-u`/đỏ `pdl-d`). Mặc định 20 dòng; nút `#govMore` “Hiện thêm” (+20). Đổi bộ lọc/tìm kiếm thì về 20 dòng. Trạng thái `GT = {side, q, n}` chỉ trong bộ nhớ.
     - `#govIns`: tổng mua/bán 12 tháng (nghìn CP, % CP lưu hành), giao dịch gần nhất, câu cố định về ngân hàng Nhà nước chi phối.
     - Nguồn: “Wi MCP co_insider; giá đóng cửa điều chỉnh (eod_adjust). Lợi suất tính từ phiên đầu sau ngày kết thúc giao dịch…”.

---

### 2.2 Tab 2 · Tài chính (`paneFin`, `app.js:516`)

`h2.sec` “Tài chính” + `.sec-sub` “Tổng quan bảng cân đối và kết quả kinh doanh → biên lãi … → định giá. Tỷ đồng, BCTC hợp nhất; số mới nhất {QL.q}.”

Thanh tab con `.subtabs` (thứ tự nút): `tong` **Tổng quan** · `nim` **Biên lãi** · `nfi` **Thu nhập ngoài lãi** · `aq` **Chất lượng tài sản** · `safe` **Các tỉ lệ an toàn** · `pv` **Định giá & so sánh nhóm**. Mỗi tab con là `<div class="sub" data-subp="{k}">`; chart của tab con chỉ vẽ lần đầu mở (`finCharts(k)` + cờ `finDone`). Tên cũ được ánh xạ khi điều hướng (`FIN_OLD`): `bs, pl → tong`, `room, camel → safe`, `eff → nim`, `peer, val → pv`.

Mọi chart quý trong tab này nhận **toàn bộ lịch sử** (từ 2009 với Big 3) và mở mặc định ở khung **5Y**.

#### 2.2.1 Tổng quan (`data-subp="tong"`)

**Nhóm “Bảng cân đối” (small = QL.q)** — lưới 2 cột:

| id | Tiêu đề | Kiểu | Cao | Dữ liệu và màu | Insight |
|---|---|---|---|---|---|
| `chWfA` | Cơ cấu tài sản {QL.q} | Waterfall `wf()` | tall 340 | Floating bar `[acc, acc+p]` theo % tổng tài sản: Tiền mặt & NHNN (`cash`), TCTD (`interbankA`), Chứng khoán (`secs`), Cho vay KH ròng (`loansNet`), Góp vốn, TSCĐ, khác (= `ta − 4 khoản trên`), cột tổng “Tổng tài sản” `[0,100]` | Cho vay ròng/TS, TCTD/TS (nhắc TT50 trừ khỏi mẫu số LDR), chứng khoán/TS, lãi phí phải thu/TS (`accruedToTA`) |
| `chWfL` | Cơ cấu nguồn vốn {QL.q} | Waterfall | tall 340 | Tiền gửi KH, Tiền gửi & vay TCTD, GTCG, Nợ CP & NHNN, Nợ khác, VCSH, “Tổng nguồn vốn” | Tiền gửi KH/NV, nợ CP & NHNN (“nguồn đặc thù Big 4” nếu Big 4), GTCG, VCSH/NV, đòn bẩy TS/VCSH |
| `chEA` | Tài sản theo quý | `stack()` cột chồng | 280 | cash, interbankA, secs, loansNet; màu `[#002060, #97BAFF, #59C5C8, #861C52]`; nút “100% tỷ trọng” | Tổng TS YoY, cho vay gộp YoY, liên ngân hàng YoY |
| `chFund` | Nguồn vốn theo quý | cột chồng | 280 | deposits, interbankL, papers, govSbv, equity; màu `[navy, blue, teal, purple, #8997D6]` | Tiền gửi KH YoY so với cho vay, liên ngân hàng, GTCG |

Chi tiết `wf(id, parts, totalLabel, total)` (`app.js:840`): một dataset `% tổng`; màu cột thành phần `C.steps[1..5]` (`#3D5C99, #5576B8, #6171C5, #8997D6, #B3BDE8`), cột tổng `#002060`; trục y 0–100 `% tổng`; nhãn x dài hơn 12 ký tự tách 2 dòng theo từ; plugin `wfLabels` in `x,x%` (đậm 11px `#303540`) trên đỉnh mỗi cột — **trục x chỉ ghi tên khoản mục, không ghi số**; tooltip `x,x% · n tỷ đồng`; legend ẩn; `padding.top 18`.

Chi tiết `stack(id, qs, keys)` (`app.js:850`): cột chồng `stack:'s'`, màu theo thứ tự `[navy, blue, teal, purple, steps[4], gold]`, trục y `tỷ đồng` stacked.

**Nhóm “Cho vay: khách hàng, ngành, kỳ hạn” (small = thuyết minh BCTC)** — mọi chart là `pctStack(id, field, src)` (`app.js:427`): cột chồng 100% theo kỳ có công bố, mỗi khoản mục một dataset màu `MIX_COL`, trục y `% tổng` 0–100; tooltip `{khoản}: x,x% · n tỷ` (giữ số tỷ trong `ds.tyv`). Thứ tự khoản mục: các trường cố định (`tenor, dep, depCust, loans, deps`) giữ thứ tự gốc; trường khác xếp theo giá trị kỳ mới nhất giảm dần, “Khác” cuối.

| id | Tiêu đề | Cao | Trường `D.mixQ` | Insight |
|---|---|---|---|---|
| `chLoanSec` | Dư nợ theo ngành kinh tế | tall | `sector` | `secIns()`: top 3 ngành, 2 thay đổi lớn nhất so với cùng kỳ (điểm %), tỷ trọng BĐS (lưu ý chưa gồm vay mua nhà cá nhân), tần suất công bố (`mixFreq`: “theo quý” / “bán niên và năm (Q2, Q4)” / “chỉ ở BCTC năm (Q4)”) |
| `chLoanCust` | Dư nợ theo loại khách hàng | tall | `cust` | `custIns()`: cá nhân, hộ KD; DN tư nhân; DNNN — so cùng kỳ |
| `chIrLoan` | {T} · cho vay theo phân khúc khách hàng | 280 | `D.irSeg.rows[].loans` (chỉ CTG: Bán lẻ, SME, KHDN lớn, FDI) | `irIns()`: tỷ trọng và tăng trưởng từng phân khúc, phía huy động |
| `chIrDep` | {T} · tiền gửi KH theo phân khúc | 280 | `irSeg.rows[].deps` | không insight; body = `depNote` |
| `chLoanTenor` | Dư nợ theo kỳ hạn | 280 | `tenor` (Ngắn, Trung, Dài hạn) | `tenorIns()`: trung dài hạn tăng/giảm > 0,5 điểm % → câu về TT22 (vốn ngắn hạn cho vay trung dài hạn ≤ 30%) |

Thẻ chỉ render khi có dữ liệu (`IRS.length`, `mixRows('depCust').length`…).

**Nhóm “Huy động: loại tiền gửi, đối tượng, nguồn khác”**:

| id | Tiêu đề | Kiểu | Dữ liệu | Insight |
|---|---|---|---|---|
| `chDepType` | Tiền gửi KH theo loại | pctStack | `dep` (Không kỳ hạn, Có kỳ hạn, Vốn chuyên dùng, Ký quỹ, Khác) | `depIns()`: không kỳ hạn/tổng, CASA theo công thức nguồn, theo đối tượng |
| `chDepCust` | Tiền gửi KH theo đối tượng | pctStack | `depCust` (Tổ chức kinh tế, Cá nhân) | — |
| `chFundOth` | Tiền gửi Kho bạc, vay NHNN và giấy tờ có giá | cột chồng tỷ đồng | `gov.kbnn` (navy), `gov.sbvBorrow` (đỏ), từng loại `gtcg` (“GTCG: chứng chỉ tiền gửi” teal, “GTCG: trái phiếu” gold, khác `#8997D6`) | `specIns()`: KBNN tỷ và % tiền gửi KH, vay NHNN, GTCG và tỷ trọng kỳ hạn ≥ 12 tháng |

**Nhóm “Kết quả kinh doanh”**:

| id | Tiêu đề | Kiểu, dữ liệu | Insight |
|---|---|---|---|
| `chPlY` | Lợi nhuận trước thuế theo năm + kế hoạch {năm} | Bar, `grouped:false` (2 dataset chồng lên cùng vị trí). Nhãn = các năm `D.annual` + `"{năm} (KH)"`. `LNTT thực hiện` navy, cột cuối = `plan.pbtYTD` màu teal; `Kế hoạch ĐHĐCĐ` chỉ ở cột cuối, nền trong suốt, viền navy 2px nét đứt `[6,4]` = **viền đứt là kế hoạch, phần tô là lũy kế YTD** | LNTT năm trước và YoY; KH năm nay và % so năm trước; YTD = x% KH; lịch sử hoàn thành KH 4 năm |
| `chToiY` | Cơ cấu tổng thu nhập hoạt động theo năm | Cột chồng: Lãi thuần `nii` navy, Dịch vụ `nfi` teal, Ngoại hối `fx` purple, Chứng khoán `secInc` `#8997D6`, Hoạt động khác `otherInc` gold | TOI năm trước, NII/TOI, thu nhập khác vs tiền thu nợ đã xử lý trên LCTT (`recoveries`) |
| `chToiQ` | Cơ cấu thu nhập theo quý | Như trên theo quý | TOI, NII, NFI quý mới nhất và YoY |
| `chPpop` | PPOP, chi phí dự phòng và LNTT theo quý | Bar nhóm 3 dataset: PPOP navy, Chi phí dự phòng (`-prov`) đỏ, LNTT teal; nút Cột/Đường | PPOP YoY, dự phòng % PPOP, LNTT YoY; so LNTT với PPOP → “cần đối chiếu với LLR” hoặc “bộ đệm được bồi thêm” |

#### 2.2.2 Biên lãi (`data-subp="nim"`)

| Nhóm | id | Tiêu đề | Kiểu, dataset, màu | Trục | Insight (tóm tắt logic) |
|---|---|---|---|---|---|
| Tăng trưởng | `chGrow` | Tăng trưởng tín dụng và huy động | Line: Tín dụng YoY navy, Huy động YoY teal | % | Khoảng cách điểm % hiện tại và 1 năm trước; phần thiếu bù bằng liên NH, GTCG |
| | `chCasa` | CASA và tỷ trọng thu phí | Line: CASA navy, NFI/TOI (TTM) teal | % | CASA, NFI/TOI; `casaVs()`: “thấp hơn {3 NH CASA cao hơn}…” hoặc “cao nhất nhóm niêm yết” |
| Biên lãi | `chNimPeer` (nếu có `D.ctx`) | NIM và chi phí vốn: {T} so với {GRP} và ngành | Line nhãn `ctx.quarters` (Q1/2021→): NIM T navy 2,5px; NIM GRP teal; NIM ngành grey đứt; COF T purple; COF ngành đỏ đứt | % | `nimPeerIns()`: NIM T / GRP / ngành nay và 1 năm trước; COF so ngành, CASA tăng/giảm, “lợi thế chi phí vốn thu hẹp dần” |
| | `chNim` | NIM, YEA và COF | Line: NIM navy 2,5px, YEA teal, COF purple | % | NIM so đáy 8 quý (`minIn('nim',8)`, ngưỡng +0,05), thay đổi YEA, COF trong 2 quý → NIM mở rộng/thu hẹp |
| | `chGap` | Khe hở tài sản − nợ nhạy cảm lãi suất ≤ 12 tháng | Bar 1 dataset `irGap/ta×100`; màu từng cột: âm purple, dương teal; legend ẩn; có Cột/Đường tự động | % TS | `gapIns()`: hiện tại % TS và nghìn tỷ, bình quân từ quý đầu, mức âm sâu nhất; giải thích dấu âm/dương |
| | `chNimAdj` | NIM và NIM sau chi phí tín dụng | Line: NIM navy, NIM sau dự phòng teal | % | Chi phí tín dụng “ăn” bao nhiêu điểm % NIM |
| | `chCof` | COF {T} vs lãi suất huy động 12T niêm yết | Line: COF TTM purple; LS 12T {T} cuối quý navy đứt `[5,4]` — lấy điểm `depB` có `d` bắt đầu `yyyy-{quý×3}` | % | COF thấp hơn LS niêm yết nhờ CASA (và KBNN nếu Big 4); độ trễ 1–3 quý |
| Hiệu quả vận hành và sinh lời | `chCir` | CIR | Line navy, legend ẩn | % | So với 8 quý trước (`Q[n-9]`) |
| | `chRoe` | ROE và ROA | Line: ROE navy (trục `y` “ROE”), ROA teal (trục `y1` phải “ROA”, không lưới) | % | ROE, ROA, cao nhất 8 năm (`maxIn('roe',32)`) hay đỉnh 8 năm; ROE = ROA × đòn bẩy |

Mọi chart line ở đây có nút Cột/Đường (`ctl:true`, `switch:'line'`) trừ `chGap`.

#### 2.2.3 Thu nhập ngoài lãi (`data-subp="nfi"`)

- **`chNfiQ`** “Thu nhập ngoài lãi theo quý”, 280px. Body là `.picker.tf[data-nfim]` 2 nút: `Giá trị` (mặc định) / `Tăng trưởng YoY (TTM)`.
  - Giá trị: `stack()` 5 chuỗi Dịch vụ `nfi`, Ngoại hối `fx`, Chứng khoán `secInc`, Góp vốn `equityInc`, Khác (thu hồi nợ…) `otherInc`.
  - YoY: line từ quý thứ 8: tổng 4 quý / tổng 4 quý trước − 1 (bỏ khi mẫu số < 50 tỷ). Dịch vụ navy 2,2px, Ngoại hối `#8997D6`, Chứng khoán teal, Khác purple (1,6px), **Tổng ngoài lãi** `#1b1f2a` 3px; `refLines` đường 0; khung 5Y.
  - Insight `nfiIns()`: dịch vụ quý mới nhất và YoY, ngoại hối, chứng khoán, khác (thu hồi nợ đã xử lý), “thu nhập khác không bền như phí”.
- **`chNfiShare`** “Tỷ trọng thu nhập ngoài lãi trong TOI”: line TTM — Phí dịch vụ/TOI navy; Ngoại hối, chứng khoán, khác/TOI gold. Insight `nfiShareIns()`: tỷ trọng 4 quý và phần thu nhập lãi còn lại.
- **`feeCard()`** (khi có `D.fee`): lưới 2 cột
  - **`chFee`** “Lãi thuần dịch vụ theo mảng”, 280px, body `FSK.feePicker('chFee')` 4 nút: `Lãi thuần` (cột chồng theo năm, mỗi mảng một màu `FEE_COL`), `Tăng trưởng thu YoY`, `Tăng trưởng lãi thuần YoY`, `Biên lợi nhuận` (line, thêm đường “Tổng” `#1b1f2a` 3px; YoY bỏ khi gốc < 30 tỷ; biên không tính cho `sec`). Insight: lãi thuần dịch vụ năm, biên chung, mảng lớn nhất, mảng thu tăng nhanh nhất.
  - Thẻ bảng “Thu phí theo mảng · năm {year}”: `Mảng | Thu | Thu YoY | Lãi thuần | Lãi thuần YoY | Biên | Tỷ trọng`, dòng tổng đậm. Ghi chú: chi viễn thông và môi giới gộp vào “Khác”.

#### 2.2.4 Chất lượng tài sản (`data-subp="aq"`)

| Nhóm | id | Tiêu đề | Kiểu và dataset | Trục | Insight |
|---|---|---|---|---|---|
| Nợ xấu | `chNpl` | Nợ xấu và nợ nhóm 2 | Line: NPL đỏ, Nhóm 2 gold | % | NPL nay/quý trước, nhóm 2 “đồng pha chứ không phải chỉ báo sớm” |
| | `chAqPeer` | Nợ xấu và nhóm 2: {T} so với {GRP} và ngành | Line: NPL T đỏ 2,5px, NPL GRP purple, NPL ngành grey đứt, Nhóm 2 T gold, Nhóm 2 ngành teal đứt | % | `aqPeerIns()`: NPL/nhóm 2 của T, GRP, ngành; LLR T vs GRP |
| | `chForm` | Hình thành nợ xấu ròng | Bar `nplFormation` (tỷ, trục `y`): `#97BAFF` khi nợ xử lý là số thực tế (hoặc khi ngân hàng không có số thực tế nào), `#97BAFF66` khi ước tính; line `% dư nợ quy năm` đỏ 1,2px (trục `y1`); line `Bình quân 4 quý (% quy năm)` purple 2,6px (`y1`) | y tỷ đồng, y1 % phải | `formIns()`: quý mới nhất (tỷ, %), nợ xử lý (thực tế/ước tính), tổng 4 quý và bình quân so 4 quý trước; độ lệch trung vị ước tính − thực tế; `NR.nplFormCheck` |
| | `chAccr` | Lãi, phí phải thu so với cho vay | Bar `Lãi phải thu YoY` (purple + alpha `59`), `Cho vay YoY` (navy + `59`); line `Lãi phải thu / dư nợ` gold 2,5px (`y1`), line `Tỷ lệ nợ xấu (NPL)` đỏ đứt `[5,3]` (`y1`) | y “YoY”, y1 % | `accrIns()`: lãi phải thu nghìn tỷ và % dư nợ, YoY so cho vay; LLR nếu coi lãi dự thu là nợ xấu; ma trận 4 trường hợp (tỷ lệ lãi dự thu/dư nợ tăng > 0,03 điểm và NPL tăng > 0,05 điểm…) |
| Dự phòng | `chLlr` | Bao phủ nợ xấu | Line: LLR navy, LLR gồm lãi dự thu purple đứt; `refLines` = `NR.llrRef` (vd CTG “Mục tiêu 150%”, teal) hoặc `100%` grey | % | LLR so 2 quý trước, so mục tiêu `NR.llrRef`; LLR gồm lãi dự thu |
| | `chCc` | Chi phí tín dụng và thu hồi nợ đã xử lý | Bar `Thu hồi nợ đã xử lý (tỷ/quý)` teal (trục `y1` phải, tỷ đồng); line `Chi phí tín dụng TTM` đỏ (trục `y` “% dư nợ”) | | Chi phí tín dụng TTM, thu hồi TTM, nợ ngoại bảng đã xử lý (`writtenOff`), `NR.recovTarget` |
| Vốn và an toàn vốn | `chCarAq` | CAR và tỷ lệ vốn cấp 1 (TT41) | `drawCar()`: bar CAR navy, Vốn cấp 1 teal theo kỳ `D.car` (“6T/yyyy”, “yyyy”); y `beginAtZero`; `refLines` 8% đỏ “CAR tối thiểu 8%”, 6% gold “Vốn cấp 1 tối thiểu 6%”; nút Cột/Đường | % | CAR, Tier 1, khoảng cách tới 8%; `carRankTxt()` xếp hạng trong nhóm (`D.carPeers`) hoặc liệt kê NH cùng kỳ (và NH chưa công bố); RWA tín dụng YoY vs vốn tự có YoY; `NR.carWhy` |
| | `chLev` | Vốn chủ sở hữu và đòn bẩy | Bar VCSH navy (tỷ, `y`); line TS/VCSH gold 2,5px (`y1` phải, nhãn `nx`) | | VCSH YoY vs TS YoY, đòn bẩy nay và 1 năm trước, vốn điều lệ |

#### 2.2.5 Các tỉ lệ an toàn (`data-subp="safe"`)

- **Nhóm “Tỷ lệ cho vay / huy động (LDR)” (small “TT22 · TT50”)**, lưới 2 cột:
  - **`chLdrQ`** “LDR theo quý so với trần và ngành” (`ldrCard`/`drawLdr`, `app.js:193`): line LDR T navy 2,5px; LDR GRP teal; LDR ngành grey đứt; `refLines` 85% đỏ “Trần 85% (TT22)”; khung 5Y. Insight: LDR, khoảng cách tới 85% (hoặc vượt — kèm giải thích công thức nguồn), bình quân GRP và ngành, tín dụng YoY vs huy động YoY, câu về KBNN 50% từ Q3/2026 và TT50 từ 1/12/2026.
  - **`chLdrRaw`** “LDR thô và LDR ước tính theo TT22” (`ldrRows()`, `app.js:473`): line `Cho vay / tiền gửi KH (thô)` purple 2,2px; `LDR TT22 (KBNN 20%)` navy 2,5px; `Nếu KBNN tính 50%` teal đứt `[5,4]`; `Nếu không tính KBNN` grey đứt `[2,3]`; `refLines` 85%. Công thức: `raw = loansGross/deposits`; mẫu số TT22 suy ngược `D20 = loansGross/(ldr/100)`; `k50 = loansGross/(D20 + 0,3×KBNN)`; `k0 = loansGross/(D20 − 0,2×KBNN)` (KBNN lấy từ `mixQ.gov.kbnn` cùng quý). Insight `ldrRawIns()`.
- **`tt50Card()`** “Room tín dụng và LDR theo TT50”: đoạn room ngụ ý TT21 (`ctx.camel.room`, điểm, hạng), tín dụng YTD và % room đã dùng; bảng `NH | TGKB/tiền gửi | TGKB 0% | TGKB 20% | TGKB 50%` các NH cùng nhóm (`ctx.peerLdr`), dòng của mã đang xem `tr.hl`. Nguồn: “điểm xếp hạng ước tính × 2,6% …”.
- **Nhóm “An toàn vốn”**: `chCarS` (cùng `carCard`/`drawCar` như `chCarAq`) + **`chGrowS`** “Tăng trưởng tín dụng so với vốn”: line Tín dụng YoY navy, Tổng tài sản YoY teal, VCSH YoY gold 2,5px; insight so VCSH YoY với tín dụng → CAR giảm/giữ.
- **`regCard()`** “Lịch quy định an toàn (REG)”: bảng `ID | Quy định | Mức hiện hành | Văn bản | Lộ trình` từ `D.reg` (= `data/regs.json` items). Dòng `flag` → `tr.hl` + note `⚠ {flag}`; `eff` > hôm nay → class `soon`, pill `rs-soon` “Chưa hiệu lực” + “từ dd/mm/yyyy”; dòng có `ref` thêm link “Phân tích FinSuccess →” tới `D.regRef.u`.
- **Nhóm “Bảng CAMEL”**:
  - `camel()` (`app.js:921`): bảng cột = Q4 của 2021–2025 (ghi năm) + 2 quý gần nhất (ghi `Qn/yyyy`). 21 dòng chia nhóm chữ đậm C/A/M/E/L: CAR (TT41, lấy kỳ năm cho Q4, bán niên cho Q2), Đòn bẩy TS/VCSH, NPL, Nợ nhóm 2, Hình thành NPL quy năm*, LLR, Chi phí tín dụng TTM*, Lãi dự thu/Tổng TS, CIR, NIM, NIM sau dự phòng*, YEA, COF, NFI/TOI, ROA, ROE, Tăng trưởng tín dụng YoY, Tăng trưởng huy động YoY, LDR (công thức Wi), Cho vay/tiền gửi KH (thô), CASA. `*` = tự tính.
  - `camelTT21()` (`app.js:940`, cần `SECTOR_DATA.camel`, kỳ **cố định `TTM2Q26`**): thẻ “{T} theo Thông tư 21/2025 · so với nhóm NH quy mô lớn”; `.kpis.k4`: Điểm ước tính (`quant.pt + Σwl/100 × qualDefault`, hạng A ≥ 4,5, B ≥ 3,5, C ≥ 2,5, D ≥ 1,5, E), Xếp hạng (trong nhóm `big` cùng loại và toàn ngành), Room ngụ ý (`điểm × roomCoef`), Tiêu chí yếu nhất. Bảng `Chỉ tiêu TT21 | {T} | Trung vị nhóm | Hạng trong nhóm | Ngưỡng 5 · 4 · 3 · 2 | Điểm`; ô điểm tô màu: ≥ 4,5 `#1e8f5a`, ≥ 3,75 `#7cc49b`, ≥ 3 `#f2d27a`, ≥ 2,25 `#ef9f76`, còn lại `#c0392b`, thiếu `#eef0f4`. Insight cố định về room năm N+2 + link `nganh.html#camel`.

#### 2.2.6 Định giá & so sánh nhóm (`data-subp="pv"`)

**Nhóm “Định giá”** (lưới 2 cột):

| id | Tiêu đề | Kiểu | Chi tiết |
|---|---|---|---|
| `chValF` | P/B và P/E TTM theo quý | Line 2 trục (`drawVal`, `app.js:505`) | Nhãn `VB.history[].q` + điểm cuối “Hiện tại dd/mm/yyyy” (`M.pb`, `M.pe`). P/B navy (trục `y` “P/B (x)”), P/E teal (`y1` phải “P/E (x)”), `P/B TB 20 quý` navy đứt, `P/E TB 20 quý` teal đứt (`keep:true`, không đổi khi bấm Cột/Đường). Insight: P/B so TB và dải ±1σ, P/E so TB, forward 2026F |
| `chPbRoe` | P/B và ROE: 26 ngân hàng niêm yết | Scatter (`SECTOR_DATA.banks`, quý mới nhất) | Mỗi nhóm quy mô một dataset (màu `PEER_COL`, bán kính 5); mã đang xem: dataset riêng gold, viền `#303540` 1,5px, `pointStyle:'rectRot'` bán kính 8; đường hồi quy (line 2 điểm, grey đứt) chỉ tính trên NH có ROE ≥ 10% (`pbFit`, OLS). Trục x linear “ROE TTM (%)”, y “P/B (lần)”. Plugin `pbRoeLbl` in mã cạnh mỗi điểm (`600 10px`). `interaction: nearest, intersect`. Insight `pbRoeIns()`: P/B, ROE, P/B hồi quy tại ROE đó, thấp/cao hơn đường hồi quy (ngưỡng ±5%) |
| `chDiv` | Cổ tức | Bar + điểm, năm từ 2016 | `Cổ tức tiền (đ/CP)` navy trục `y` (min 0); `Cổ tức cổ phiếu (%)` teal trục `y1` phải; `Tỷ lệ chi trả tiền mặt (%)` gold, line không nối (`showLine:false`, `rectRot`, r = 5), `y1`. Plugin `retain`: năm không chia gì in dọc chữ xám “Giữ lại LN tăng vốn”. Body `NR.divNote` (HTML), insight `NR.divInsight`, nguồn `NR.divSrc` |
| `chPlanDone` | Hoàn thành kế hoạch lợi nhuận | Bar 1 dataset | Các năm có `planDone` + cột YTD (`plan.pbtDone`); màu: YTD teal, ≥ 100% navy, < 100% đỏ; `refLines` 100% gold “100% kế hoạch”; legend ẩn. Insight: bình quân hoàn thành, năm hụt, năm nguồn thiếu số kế hoạch |

**Nhóm “So sánh nhóm”** (`peerSub()`, `app.js:862`) — 2 thẻ:

1. **“So sánh nhóm theo kỳ”**:
   - `.picker#peerPick` 13 chỉ tiêu (`PEER_M`): NIM, YEA, COF, CASA, CIR, ROE, ROA, NPL, Nhóm 2, LLR, LDR, Tín dụng YoY, P/B (mặc định NIM).
   - `.picker#peerGrp` 5 nút: Tất cả, Big 4, Tư nhân lớn, Tư nhân vừa, Tư nhân nhỏ + 2 `<select>`: `#peerQ` “Kỳ” (mặc định quý mới nhất) và `#peerQ0` “so với” (mặc định 4 quý trước), option xếp mới → cũ.
   - **`chPeer`** (tall 340): bar giá trị kỳ chọn, xếp cao → thấp; màu cột theo nhóm, cột mã đang xem teal; dataset `line` không nối (`showLine:false`, gold, `rectRot`, r = 4, `keep:true`) = giá trị kỳ so sánh. Nhãn x không bỏ bớt, xoay tối đa 60°. P/B dùng trục `lần`.
   - `#peerIns`: giá trị và hạng `i/n` (ghi chiều tốt: “cao là tốt”/“thấp là tốt”), thay đổi so kỳ so sánh, danh sách NH cùng nhóm.
   - `details.more[open]` “Bảng so sánh theo kỳ” → `#peerTbl`: cột `Mã | Nhóm | NIM | COF | CASA | NPL | Nhóm 2 | LLR | CIR | ROE | TD YoY | LDR`, mỗi ô có dòng nhỏ `.pdl` thay đổi so kỳ so sánh (xanh tăng, đỏ giảm), dòng mã đang xem `tr.hl`.
   - Nguồn “BCTC các ngân hàng niêm yết qua Wi MCP (ratio_bank, ratio_bank_ttm, ratio_common_ttm); nhóm theo dashboard ngành”.
   - Trạng thái `pst = {k, g, q, q0}` chỉ trong bộ nhớ; đổi chỉ tiêu vẽ lại cả `chPeer` và `chPeerTs`.
2. **“{Big 4 | GRP} niêm yết theo thời gian”** + `.ctl` → **`chPeerTs`** (tall): line nhãn `BIG3.quarters`; mỗi mã trong `LTK` một đường (VCB teal, BID purple, CTG navy, TCB đỏ, MBB blue, ACB teal; mã đang xem 3px, khác 1,6px); thêm `Bình quân {GRP}` gold đứt và `Bình quân ngành` grey đứt (từ `ctx.agg`, có từ 2021). Khung 5Y. Insight `#peerTsIns`: giá trị mới nhất, 5 năm trước (20 quý), bình quân toàn chuỗi, các mã cùng nhóm cùng kỳ.

---

### 2.3 Tab 3 · Catalyst & Sự kiện (`paneEvents`, `app.js:972`)

- `h2.sec` “Catalyst & sự kiện — KQKD, CBTT, chính sách, vốn” + sub “Dấu ± là đánh giá sơ bộ chiều tác động… (AI), analyst có thể ghi đè trong Nhật ký ở tab FinSuccess.”
- Thẻ **“Sắp tới”**: bảng `Ngày (dự kiến) | Loại | ± | Sự kiện | Nguồn` gồm sự kiện `status:'pending'` xếp ngày tăng dần; tiêu đề in đậm, `detail` dạng `.note`; cuối thẻ `NR.eventsNote`.
- Thẻ **“Dòng sự kiện”**: `.filter#evFilter` (nút “Tất cả” + mỗi `type` duy nhất, theo thứ tự xuất hiện); bảng `Ngày | Loại | ± | Sự kiện | Trạng thái`, `tbody#evBody`. Sự kiện có `detail` → `details.more` “Chi tiết”; dòng nguồn nhỏ dưới tiêu đề; trạng thái pill “Chờ” hoặc “Xác nhận”. Nguồn “HOSE CBTT, Wi MCP co_events, ai_news”.

### 2.4 Tab 4 · Consensus CTCK (`paneCons`, `app.js:1037`)

1. `h2.sec` “Consensus CTCK”.
2. **6 KPI**: Median TP (upside, pos) · TB TP (min · max) · Khuyến nghị MUA `buy/n` (“CTCK có TP ≤ 3 tháng”) · TP của tôi (từ localStorage) · LNST 2026F (median) (tỷ, % so 2025 `FW.npat2025`, số dự phóng) · P/E · P/B forward (`BVPS 2026F`).
3. **Thẻ `#cpbCard`** — P/B lịch sử có đường tới giá mục tiêu (`drCpb()`, `app.js:993`):
   - `h3#cpbH` (đổi theo lựa chọn: “P/B {T} theo phiên và P/B ngụ ý tại giá mục tiêu” / “P/B trung vị ngành ngân hàng (26 ngân hàng niêm yết)” / “P/B {mã} theo phiên so với trung vị ngành”), `p#cpbSub`, `.picker#cpbPick` (nút mã đang xem, các mã cùng nhóm có trong `SECTOR_DATA.pbHist.banks` và trong `D.peers`, nút “Trung vị ngành” = `_med`; **bấm lại nút đang chọn thì về mã chính**).
   - **`chCpb`** (280px, khung mặc định **3Y**, `win:36`). Chuỗi: ưu tiên P/B theo phiên `D.pbDaily[mã]` (đã điều chỉnh sự kiện quyền cho mã chính), không có thì lấy P/B cuối quý `SECTOR_DATA.pbHist`. Dataset:
     - `P/B {tên}`: navy (mã chính) hoặc blue; 1,8px theo phiên (không chấm), 2,6px + chấm 1,5 nếu theo quý.
     - `Trung vị 26 NH niêm yết` (theo phiên từ `pbDaily._median`) hoặc `Trung vị ngành (cuối quý)`: grey đứt `[4,3]` 1,3px.
     - **Đường tới giá mục tiêu** (chỉ khi xem mã chính và có `FW.bvps2026F`): với TP trung vị CTCK (đỏ) và TP của tôi (teal, nếu đã nhập), P/B mục tiêu = `TP / BVPS 2026F`; nối thẳng từ P/B phiên cuối tới P/B mục tiêu vào **31/12 năm hiện tại** qua các ngày làm việc tương lai (thêm nhãn ngày vào trục x); nét đứt `[6,4]` 2px, chấm r = 4 ở điểm cuối, `clip:false`, `keep:true`.
     - `refLines`: TB chuỗi (grey `[2,3]`), `+1σ`, `−1σ` (`#c9a227` `[6,4]`), σ = độ lệch chuẩn tổng thể của chính chuỗi.
     - Plugin `cpbEnd` (chỉ khi vùng chart ≥ 640px; khi đó `layout.padding.right = 165`): nhãn giải thích ở lề phải cho mỗi đường, giãn dọc 13px/dòng để không chồng: “{tên} hiện tại / x,xx x (ngày)”, “Trung vị 26 NH / …”, “Nếu đạt TP… / …đ vào 31/12 / → P/B …x (BVPS 2026F)”.
     - Tooltip: chỉ hiện dataset `keep` ở phần tương lai; tiêu đề phần tương lai “Dự phóng 31/12/yyyy”.
   - `p.cnote` = `pbNote`: định nghĩa P/B tính lại (vốn hóa thực tại phiên / VCSH thuộc cổ đông NH mẹ; CP mới tính từ GDKHQ; tiền quyền mua, cổ tức tiền cộng/trừ thẳng VCSH) + sự kiện đang áp dụng (`D.pbAdjNote`) + “Trung vị 26 NH chưa tính lại theo cách này”.
   - `#cpbIns`: P/B hiện tại, cách TB bao nhiêu σ, phân vị (% số phiên/quý ≤ hiện tại), min/max; với mỗi TP: P/B cuối năm và vị trí so dải (trên +1σ / trong dải / dưới TB / dưới −1σ), giá ±% so hiện tại.
4. `h3.sub` “Dải dự phóng của các công ty chứng khoán” rồi lưới 2 cột:
   - **`chTp`** “Giá mục tiêu từng CTCK” (`h:'tall'`, sau đó đặt `height = max(340, số dòng × 21 + 70)` px). **Lollipop ngang**: bar ngang floating `[giá thị trường, TP]` dày 4px navy (báo cáo > 3 tháng: `#00206055`); plugin `upLab` vẽ chấm tròn r = 6 tại TP (xám `#b9c0cc` nếu cũ) và nhãn upside `±x%` (đỏ, canh phải nếu TP < giá). Nhãn y `"{CTCK} dd/mm"`, cỡ 10,5px, không bỏ bớt; xếp TP tăng dần. `refLines` dọc `axis:'x'` tại giá thị trường, đỏ, “Thị giá”. Trục x `đ/CP`, min = nhỏ hơn giữa `0,95×giá` và `0,93×TP thấp nhất` (làm tròn nghìn). Body: “Màu xám = báo cáo trước {fadeBefore} (> 3 tháng), không vào thống kê.” + ghi chú quy đổi TP nếu có `tpOrig`. Insight: dải TP và upside, số CTCK có TP dưới giá, cao nhất/thấp nhất (CTCK, ngày), `NR.tpSpread`.
   - **`chNp`** “LNST 2026F từng CTCK và kế hoạch ĐHĐCĐ” (tall, chiều cao động như trên). Bar ngang, nhãn `"{CTCK} (±YoY%)"` xếp LNST tăng dần + `KH ĐHĐCĐ (±%)` + `Run-rate {ytdLabel} ×2`. Màu: CTCK teal (cũ `#59C5C855`), KH ĐHĐCĐ navy (luôn đậm), run-rate `#c9ced8` viền `#9aa3b2`. Run-rate = `npatYTD × 4 / ytdQuarters`. `refLines` dọc tím “LNST 2025”. Trục x `tỷ đồng` min 0. Insight: dải dự phóng và YoY, so KH ĐHĐCĐ (đều cao hơn / đều thấp hơn / bao quanh), YTD đạt bao nhiêu % KH và YoY, **implied H2** = median − LNST H1, so với H2 năm trước và tốc độ H1 → “consensus giả định chậm lại/tăng tốc nửa cuối năm”.
5. Thẻ **“Chi tiết báo cáo”**: bảng `CTCK | Ngày | KN | TP | Upside | TOI 2026F | TOI 2027F | LNST 2026F | LNST 2027F | Luận điểm` cho `CS.rows` + `CS.forecastOnly`; dòng cũ `tr.stale`; TP gốc nhỏ “gốc …” nếu đã quy đổi; `details.more` “Tóm tắt” chứa `summary` (AI summary của ai_news). Ghi chú: KN quy về 3 mức, MUA gồm Khả quan/Outperform. Nguồn `CS.src`.

### 2.5 Tab 5 · 💎 FinSuccess (`paneVal`, `app.js:1101`)

`h2.sec` “FinSuccess — định giá & quyết định đầu tư” + `.subtabs` 3 nút `data-v="1|2|3"`: “1 · Quyết định & vị thế định giá”, “2 · Kịch bản lãi suất & rủi ro”, “3 · Thesis & nhật ký”; pane `div.sub[data-vp]`.

**Tab con 1**
- `article.card.fsn#decNote` — khối ghi chép **FSN** (mục 3.7) “1 · Quyết định hiện tại”, trường: Trạng thái (Tích cực / Trung lập / Tiêu cực), Hành động (Theo dõi, Chờ điểm mua, Mua thăm dò, Mua, Nắm giữ, Giảm tỷ trọng, Không đầu tư), Giá mục tiêu, Giá mua, Cắt lỗ (đ, `inputmode=numeric`, chỉ giữ chữ số). Dưới mỗi ô giá `div.calc` tự tính khi gõ: `P/B {giá/BVPS} · P/B fwd {giá/BVPS 2026F} · ±% vs giá`. Ô soạn “Lý do / điều kiện kích hoạt”.
- Thẻ “Vị thế định giá so với lịch sử”: sub “Dải ±1σ trên 20 quý ({from}–{to}); giá quy đổi = bội số × BVPS hiện tại / BVPS 2026F”. Lưới 2 cột:
  - Bảng P/B (`h4` “P/B hiện tại … · forward …”): `Mốc | P/B | Giá (BVPS hiện tại) | Giá (BVPS 2026F)` cho −1σ, Trung bình, +1σ; giá cột 3 làm tròn 100đ, kèm `(±%)`.
  - Bảng P/E: `Mốc | P/E | Giá (EPS TTM)`.
  - Insight: P/B so dải, ROE TTM, điều kiện ngược (LLR, hình thành nợ xấu, CAR).
- **`chVal`** “P/B và P/E TTM theo quý” — giống hệt `chValF` (vẽ lại trong `paneVal`), nguồn “Wi MCP ratio_common_ttm”.

**Tab con 2**
- Thẻ “Định giá theo kịch bản lãi suất (thu nhập thặng dư)”: sub “P/B hợp lý = (ROE − g)/(COE − g), áp lên BVPS 2026F … Bốn kịch bản theo ma trận IDX-FX × IDX-LIQ (deck slide 39). **Giá trị khởi tạo chỉ để thử — chưa phải giả định của FinSuccess** …” + `NR.modelNote`.
  - Bảng `#scTable`: `Kịch bản | ROE bền vững % | COE % | g % | P/B hợp lý | Giá hợp lý | Upside`; 3 ô input (rộng 70/70/60px). Giá trị khởi tạo `SCEN_DEFAULT` (`app.js:1095`):

    | k | Kịch bản | ROE | COE | g |
    |---|---|---|---|---|
    | ease | Nới lỏng mạnh | 20 | 13 | 4 |
    | room | Dư địa bơm tiền | 19 | 14 | 4 |
    | drain | NHNN hút tiền về | 18 | 15 | 4 |
    | tight | Thắt chặt kéo dài | 16 | 16 | 4 |

  - Tính lại khi gõ: `pb = (roe − g)/(coe − g)` nếu `coe > g`; `giá = r100(pb × BVPS 2026F)`; upside so giá hiện tại.
  - Nút `#scSave` “Lưu giả định” (ghi `scen`), `#scReset` “Khôi phục mặc định” (xóa `scen`, dựng lại tab), `#scMsg`.
  - Note đối chiếu: ROE TTM, ROE 5 năm (`a → b → …`), TP median CTCK ứng với P/B 2026F.
- Thẻ “Rủi ro chính” + pill “AI tổng hợp”: bảng `Rủi ro | Dấu hiệu hiện tại | Theo dõi ở`, 4 dòng tính từ số (Chất lượng tài sản; COF tăng, NIM chững — Δ LS huy động 12T của chính NH từ điểm đầu chuỗi, CASA 2 quý; CAR “mỏng” nếu < 11%; Áp lực tỷ giá — DXY mới nhất và tỷ giá trung tâm % từ tháng 12 năm trước) + các dòng `NR.risks` (mảng `[rủi ro, dấu hiệu, theo dõi ở]`).

**Tab con 3**
- “Thesis tracker — 5 trụ luận điểm”: bảng `Trụ | Bằng chứng (số mới nhất) | AI | Analyst | Ghi chú`; cột Analyst là `<select>` (—, Giữ vững, Theo dõi, Gãy), Ghi chú là input; nút `#pSave` “Lưu thesis” (ghi `pillars`, dựng lại tab Tổng quan).
- “Ngưỡng checklist (tab Tổng quan)”: form 4 cột 5 ô `data-ck`: P/B tối đa (mặc định `pbBand.lo`), NPL tối đa % (1,5), Hình thành NPL tối đa % (1,5), LLR tối thiểu % (130), CAR tối thiểu % (10); nút `#ckSave` “Lưu ngưỡng”.
- “Nhật ký insight”: `textarea#logTxt` + `#logAdd` “Thêm” (đẩy `{at, t}` lên đầu `log`) + `#logExp` “Xuất JSON” (tải toàn bộ object localStorage thành `{MÃ}-finsuccess-{updated}.json`); `#logList` bảng `ngày | nội dung` hoặc “Chưa có ghi chép.”

---

## 3. Tính năng tương tác

### 3.1 Điều hướng tab và hash
- `show(k)` (`app.js:1207`): bật `.active` cho nút và pane, `aria-selected`, dựng pane lần đầu (`builders[k]()`, cờ `built`), `history.replaceState(null,'','#'+k)`. Hash lạ → `overview`. Bấm nút tab còn `scrollTo({top:0})`.
- Liên kết nội bộ: phần tử `[data-go="events"]` → `show()`; `[data-gofin="{sub}"][data-card="{canvasId}"]` → `goFin()` (`app.js:147`): `sub==='fsval'` → tab `val`, còn lại mở tab `fin`, bấm tab con, sau 120ms cuộn tới `article` chứa canvas và nhấp nháy viền teal 1,6s (`article.card.flash{box-shadow:0 0 0 3px var(--teal)}`).
- `rerender(k)` (`app.js:1206`): hủy chart thuộc pane, xóa cờ `finDone` nếu là `fin`, dựng lại pane — gọi sau khi lưu quyết định/thesis/ngưỡng.
- `window.FSSHARE = { prep(), path(card) }` cho hộp chia sẻ ảnh: dựng mọi tab và mọi tab con ẩn; trả `[tên tab, tên tab con]`.

### 3.2 Nút Cột/Đường, khung thời gian, trục Y, 100% tỷ trọng, zoom
Xem mục 2.0 (`mk` + `FSK.enhance`). Danh sách chart có nút `.ctl` Cột/Đường trên tiêu đề: `chPpop`(cột), `chGrow`, `chCasa`, `chNimPeer`, `chNim`, `chNimAdj`, `chCof`, `chCir`, `chRoe`, `chNpl`, `chAqPeer`, `chAccr`*, `chLlr`, `chCarAq`/`chCarS` (cột), `chLdrQ`, `chLdrRaw`, `chGrowS`, `chNfiShare`, `chValF`, `chVal`, `chPeerTs`. (*`chAccr` có `ctl:true` trong thẻ nhưng `mk` không truyền `switch`, nên ô `.ctl` trống.)

### 3.3 Bộ chọn / bộ lọc trong trang
| Vị trí | Phần tử | Tác dụng |
|---|---|---|
| Tổng quan › Giao dịch nội bộ | `#govSide` (Tất cả/Mua/Bán), `#govQ` tìm theo tên + chức vụ, `#govMore` “Hiện thêm” (+20) | Lọc bảng `#govTbl` |
| Tài chính › Thu nhập ngoài lãi | `[data-nfim]` Giá trị / Tăng trưởng YoY (TTM) | Đổi `chNfiQ` |
| | `[data-feem="chFee"]` 4 chế độ | Đổi `chFee` |
| Tài chính › Định giá & so sánh nhóm | `#peerPick`, `#peerGrp`, `#peerQ`, `#peerQ0` | `chPeer`, `#peerTbl`, `chPeerTs` |
| Catalyst | `#evFilter` | Lọc `#evBody` |
| Consensus | `#cpbPick` | Đổi chuỗi `chCpb` (bấm lại = về mã chính) |

### 3.4 P/B picker có đường tới giá mục tiêu
Mục 2.4 bước 3. Điểm then chốt để dựng lại: P/B mục tiêu tính trên **BVPS 2026F** (`FW.bvps2026F`), đường nối tuyến tính theo **số phiên làm việc** (bỏ thứ Bảy, Chủ nhật) từ phiên cuối tới 31/12; TP của tôi lấy từ quyết định đã lưu nên lưu quyết định xong thì tab Consensus được dựng lại.

### 3.5 Bảng kịch bản thu nhập thặng dư
Mục 2.5 tab con 2. Lưu ở `localStorage.scen` (mảng `{k, n, roe, coe, g}`).

### 3.6 Lưu trữ trên trình duyệt (`localStorage`)
| Khóa | Nội dung | Ghi bởi |
|---|---|---|
| `fs-bank-{MÃ}` | Object `{ decision: {status, action, tp, buy, stop, why, whyHtml, at}, pillars: {p1: {status, note}, …}, check: {pb, npl, form, llr, car}, scen: [...], log: [{at, t}] }` | `store.set()` (`app.js:30`), mọi lần đọc/ghi bọc try/catch |
| `fsn:bank-{MÃ}-decision` | Bản nháp khối quyết định (FSN): mảng 1 phần tử `{id, at, author, f, html, text}` | `notes.js:78` |
| `quWho` | Tên người viết gần nhất (mặc định “Minh Đức”) | `notes.js` |
| `fs-bank-ui` | Chế độ Gọn/Chi tiết | `setMode()` |
| `fsk-cards:{trang}:{tab con}:{chỉ số lưới}` | Thứ tự thẻ sau khi kéo thả | `chartkit.js:310` |
| `fsDevView` | `'1'` = Developer view | `devview.js` |

### 3.7 Khối ghi chép quyết định (FSN, `assets/notes.js`)
`FSN.mount(el, opt)` (`notes.js:125`) với `key: 'bank-{MÃ}-decision'`:
- **Chế độ xem**: tiêu đề + nút “Sao chép để đăng”, “Xoá nháp” (chỉ khi có bản nháp), “Lịch sử (n)”, “✎ Chỉnh sửa”; dòng meta (ngày giờ, người viết, pill “bản nháp · tự xoá sau n ngày” hoặc “đã đăng”); `.fsn-sum` các chip `opt.meta` (Trạng thái, Hành động, mỗi mức giá kèm P/B và P/B fwd); thân HTML.
- **Chế độ sửa**: các trường `opt.fields`, trình soạn `contenteditable` với thanh công cụ B / I / U / • Danh sách / 1. Danh sách / Xoá định dạng / “Rà soát chính tả & thuật ngữ” (`vcCheck`: thêm dấu từ phổ biến gõ thiếu, Việt hóa thuật ngữ tiếng Anh giữ gốc trong ngoặc), ô “Người viết”, “Lưu bản mới”, “Huỷ”.
- Phiên bản: bản đã đăng đọc từ `window.FS_NOTES.notes[key]` (`data/notes-data.js`, sinh từ `data/notes.json` bằng `scripts/add_note.py`); bản trên máy là **bản nháp duy nhất**, tự bỏ sau 7 ngày hoặc khi đã có bản đăng trùng/mới hơn. “Sao chép để đăng” chép JSON `{key, versions}` để dán cho AI đăng.
- `seed()`: nếu chưa có phiên bản nào mà `localStorage.decision.at` tồn tại thì tạo bản nháp từ quyết định cũ.
- `onSave`: ghi `decision` vào `fs-bank-{MÃ}` → `header()`, `rerender('overview')`, `rerender('cons')`.

### 3.8 Chế độ Gọn / Chi tiết
`setMode(m)` bật `body.compact`. Trang cổ phiếu **luôn chạy Gọn** (`mode0='compact'`, `app.js:1319`; HTML không có `#modeSw` nên không có công tắc). Ở Gọn, CSS ẩn `.insight`, `.chart-sub`, `.sec-sub`, `.note:not(.keep)`, `details.more`, `.card>.src`; phần đã ẩn mở bằng nút (i) và hàng `.ibar`. Các ghi chú phải luôn hiện dùng `.note.keep`.

### 3.9 Nút (i), ⓘ Insight, ⓘ Nguồn, ⇄ So sánh peer
`decorate()` (`app.js:1232`, chạy lại qua `MutationObserver` trên `main`) với mỗi `article.card` có `h3.sub` con trực tiếp:
- Có `.chart-sub` → nút tròn `button.info` chữ “i” (18px, Georgia nghiêng) chèn trước `.ctl`; tooltip nền tối `#1f2433` hiện nội dung sub.
- Có `.insight`/`.note:not(.keep)`/`.src`, hoặc canvas có trong `PEER_C` → thêm `div.ibar` cuối thẻ: `ⓘ Insight`, `ⓘ Nguồn`, `⇄ So sánh peer` (nền `#fff7e6`). Tooltip sáng (`.tip.light`, max 380px, cố định vị trí dưới/trên nút), mở bằng hover (thiết bị có hover), click (cảm ứng), focus; đóng khi Esc, cuộn, đổi cỡ.
- **So sánh peer** (`peerHtml`, `app.js:1263`): với mỗi chỉ tiêu ánh xạ trong `PEER_C[canvasId]` (vd `chNim → nim, yea, cof`; `chCpb → pb, roe`; bảng đầy đủ ở `app.js:1259–1262`), lấy kỳ mới nhất có số của mã trong `SECTOR_DATA.banks`, xếp hạng trong nhóm quy mô và toàn ngành theo chiều tốt (`PEER_MX`: up/down/val/0), bình quân phần còn lại của nhóm, toàn ngành, tốt nhất/kém nhất trong nhóm, thay đổi 1 năm (4 quý) của mã và của nhóm. LDR (chiều 0) diễn giải “còn/ít dư địa cho vay”; P/B, P/E (val) “rẻ/đắt hơn”.

### 3.10 Kéo thả đổi vị trí thẻ
`chartkit.js:315`: mọi `.grid` có ≥ 2 `article.card` → chèn `span.grip` “⠿” vào tiêu đề; kéo tiêu đề (chuột: kéo ngay; cảm ứng: giữ 350ms) để đổi chỗ trong cùng lưới; thứ tự lưu `fsk-cards:…`.

### 3.11 Nút toàn cục do chartkit chèn
- `button.totop` “↑” (hiện khi cuộn quá 0,8 màn hình).
- `a.aibot` “✦ Trợ lý AI”: chưa cấu hình chat thì bấm hiện toast `.aibot-soon` “Tính năng đang phát triển…” 3,5s.
- “Xuất PDF” (`.pdfbtn`): tải `pdf/{khóa}.pdf` dựng sẵn khi deploy (khóa = `FSPDF.key()` = `trang__tab__tabcon…`, ví dụ `index__fin__nim`); nếu không có thì chụp. “PDF bản đang xem” (`.pdfbtn2`): chụp trang bằng html2canvas 1.4.1 + jsPDF 2.5.1 (cdnjs) theo khổ A4, không cắt ngang thẻ/bảng, đầu trang lặp logo + header, chân trang “FinSuccess | i/n”; tên file `FinSuccess_{mã Tracker} - {tab - tab con}_dd-mm-yyyy.pdf` (bỏ dấu).
- Chia sẻ ảnh (`share.js`): mỗi thẻ có nút “＋ Ghép”, giỏ ở góc dưới, ghép tối đa 6 chart thành ảnh 16:9 (1600×900) hoặc 4:5 (1080×1350), có công cụ vẽ chú thích.

### 3.12 Chế độ Developer (`assets/devview.js`)
Mặc định “👁 User view”: ẩn link `bh.html`, `ck.html`, `backend.html` và ô `.devonly` (BH · CK). Bấm nút → nhập mật khẩu (so SHA-256 với `PASS_SHA256`) → `localStorage.fsDevView='1'`, tải lại. Đây chỉ là ẩn giao diện.

---

## 4. Mô hình dữ liệu

### 4.1 Luồng dựng
```
Phiên Claude gọi Wi MCP ──► transcript .jsonl
python3 scripts/wi_capture_transcript.py <transcript.jsonl>   → data/raw/wi/<tool>_<endpoint>_<hash8>.json  ({tool, request, response}, đã bỏ PII "contacts")
python3 scripts/build_sector_data.py                          → data/sector-data.json/.js (cần trước: build_ctg_data đọc sector-data.json)
for t in CTG VCB BID TCB MBB ACB; do python3 scripts/build_ctg_data.py --ticker $t; done   → data/<mã>-data.js + .json
python3 scripts/build_big3.py                                 → data/big3-data.js (window.BIG3)
python3 tests/test_ctg_data.py
```
`data/raw/wi` **không commit** (`.gitignore`). Build có tác dụng phụ: ghi/cập nhật các bản dẫn xuất đã commit trong `data/backfill/` (`notes_mix.json`, `pb_daily.json`, `corp_events.json`, `bvps_daily.json`, `shares_daily.json`, `equity_parent.json`, `pb_adj.json`) để build ở máy không có đủ raw vẫn giữ lịch sử. Hai file nhập tay tùy chọn theo mã: `data/backfill/{mã}_writeoff.json` (nợ xử lý bằng dự phòng thực tế, lũy kế đầu năm, triệu đồng) và `{mã}_ir_segments.json` (phân khúc theo tài liệu nhà đầu tư, nghìn tỷ).

### 4.2 Cách đọc raw (`build_ctg_data.py:29–120`)
- `load_raw(folder)`: đọc mọi `*.json`; response dạng bảng `{cot, dong}` chuyển thành list dict (`rows()`).
- `merged(raw, tool, endpoint, pred, sym)`: gộp mọi lần kéo khớp điều kiện theo khóa `(symbol, year, quarter)`, file sau ghi đè trường khác `null`. Thiếu → `SystemExit('thiếu raw: …')`.
- `find(...)`: lấy lần kéo **cuối cùng** khớp.
- `own(req)`: lần kéo riêng của mã (bộ lọc `symbol` có mã và ≤ 3 mã); `mine(rows)`: lọc dòng của mã.
- `ty(v) = round(v/1e9, 1)` → **tỷ đồng**; `pct(v, nd=2) = round(v×100, nd)` → **%**.

### 4.3 Endpoint Wi MCP cần kéo cho mỗi mã
| Tool / endpoint | Bộ lọc | Cột | Dùng cho |
|---|---|---|---|
| `wi_data_companies` `fs_bank` | `symbol=MÃ`, `quarter=1,2,3,4`, nhiều năm (tách 2009–17 và 2018–26) | `bs100,bs110,bsx01,bs130,bsx21,bs130_2,bs140,bs160_1,bs160_2,bs170,bs180,bs190,bs210,bs210_2,bs300,bsx10,bs310,bs320,bs320_1,bs320_2,bs330,bs340,bs350,bs360,bs370,bsx12,bsx14,is220,is10,is20,isx03,is50,isx04,isx05,isx07,is110,isx08,isx09,is130,is140,is150,is190,isx02,obs11,cfx04,audit_status_id` | `quarterly` |
| `fs_bank` | `quarter=0` | `bs100,bs160_1,bs160_2,bs170,bs330,bs360,bs310,bs320,bsx12,bsx14,is20,isx03,is50,isx04,isx05,isx07,is110,isx08,isx09,is130,is140,is150,is190,isx02,obs11,cfx04` | `annual` |
| `fs_bank` (thêm `bs390`) | 6 mã có trang | `bsx12, bs390` | VCSH thuộc CĐ mẹ (`equity_parent.json`) |
| `ratio_bank_ttm` | `quarter=1,2,3,4` | `nim,cof,yea,earning_spread,cir,total_operating_income_growth_yoy,…,pct_net_service_income,pct_other_income,…` | NIM, YEA, COF, CIR, NFI/TOI |
| `ratio_bank` | `quarter=1,2,3,4` | `casa_ratio,npl_ratio,group2_loan_ratio,npl_coverage_ratio,npl,accrued_interest_to_total_assets,ldr,mid_long_term_loan_ratio,credit_growth_qoq,credit_growth_yoy,customer_funding_growth_yoy,interest_rate_gap,…` | CASA, NPL, LLR, LDR, tăng trưởng, khe hở |
| `ratio_bank` | `quarter=2,4`, cột `pct_loans_*` | | `loanMix` (không hiển thị) |
| `ratio_common_ttm` | `quarter=1,2,3,4` | `roe,roa,eps,bvps,pe,pb,profit_parent_yoy` | ROE, ROA, P/B, P/E quý |
| `ratio_common_year` | năm 2016→ | `cash_dividend,stock_dividend_ratio,div_yield,cash_payout_ratio,profit_plan_completion,eps,roe` | Cổ tức, hoàn thành KH |
| `ratio_daily` | mã (và 26 NH) | `trading_date, market_cap, pb, bvps, eps` | Vốn hóa, BVPS, EPS TTM, P/B theo phiên, trung vị 26 NH (cả `action=aggregate, metric=median:pb`) |
| `bank_car_tt41` | mã; và ≥ 10 mã | `tt41_01,tt41_02,tt41_03,tt41_05,tt41_09,tt41_10` | `car`, `carPeers` |
| `fs_bank_notes` | `consolidation_id=2`, cột `fnx13…fnx127` | | `mixQ` |
| `fs_bank_notes` | `quarter=0`, cột `fnx142…fnx158` | | `fee` (`scripts/fee_lines.py`) |
| `co_plans`, `co_holders`, `co_leaders`, `co_insider`, `co_subsidiaries`, `co_events`, `co_reports` | `symbol=MÃ` | `co_reports`: `source,recommendation_date,recommendation,target_price,target_price_adjusted,upside_current,revenue_forecast(_n1),net_income_forecast(_n1),report_title` | Kế hoạch, quản trị, sự kiện, consensus |
| `ratio_bank_ttm`, `ratio_bank`, `ratio_common_ttm` cho ≥ 10 mã có **năm 2026, quý 2** | | | `peers` (kỳ cố định, mục 4.6) |
| `wi_data_stock` `eod_adjust` | `symbol=MÃ` và `symbol=VNINDEX` | `trading_date, close` | Giá |
| `wi_data_sector` `sector_price_daily` | `sector_id=405` | `trading_date, close` | Chỉ số giá ngành ngân hàng |
| `wi_data_news` `ai_news` | `codetag=MÃ` | | Luận điểm CTCK, sự kiện KQKD |
| `wi_data_news` `exchange_news` | `symbol=MÃ` | | Sự kiện CBTT |
| `wi_data_macro` `get_values` | các id: 82223, 82226, 82227, 82228, 82231, 235028, 82237, 81522, 82268, 202886, 202880, `dep12` của NH, 7079, 241732, 75847, 265963 | | `macro` |

### 4.4 Ánh xạ cột → khóa `quarterly[]` (tỷ đồng trừ khi ghi khác)
| Khóa | Công thức từ `fs_bank` | Khóa | Công thức |
|---|---|---|---|
| `ta` | `bs100` | `govSbv` | `bs310` |
| `cash` | `bs110 + bsx01` | `interbankL` | `bs320` |
| `interbankA` | `bs130` | `deposits` | `bs330` |
| `secs` | `bs140 + bs170` | `papers` | `bs360` |
| `loansGross` | `bs160_1` | `otherL` | `bsx10 − (bs310+bs320+bs330+bs360)` |
| `llp` (âm) | `bs160_2` | `equity` | `bsx12` |
| `loansNet` | `bs160_1 + bs160_2` | `charter` | `bsx14` |
| `ltInv` | `bs180` | `writtenOff` | `obs11` (nợ ngoại bảng đã xử lý) |
| `fixed` | `bs190` | `nii` | `is20` |
| `otherA` | `bs210` | `intInc` / `intExp` | `is220` / `is10` |
| `accrued` | `bs210_2` (lãi, phí phải thu) | `nfi` | `isx03` |
| `fx` | `is50` | `secInc` | `isx04 + isx05` |
| `otherInc` | `isx07` | `equityInc` | `is110` |
| `toi` | `isx08` | `opex` | `isx09` |
| `ppop` | `is130` | `prov` (âm) | `is140` |
| `pbt` | `is150` | `npat` / `npatParent` | `is190` / `isx02` |
| `recoveries` | `cfx04` (tiền thu nợ đã xử lý, LCTT) | `audit` | `audit_status_id` |

Từ `ratio_bank_ttm` (%, ×100): `nim, yea, cof, spread (earning_spread), cir, nfiShare (pct_net_service_income), otherShare (pct_other_income), toiYoY`. Từ `ratio_bank`: `casa, npl, g2 (group2_loan_ratio), llr (npl_coverage_ratio, 1 số lẻ), nplAmt (npl, tỷ), ldr, creditYoY, creditQoQ, fundingYoY, mltLoans, accruedToTA, irGap (interest_rate_gap, tỷ)`. Từ `ratio_common_ttm`: `roe, roa (%), pb, pe, bvps, eps, npatYoY`.

**NIM, YEA, COF, CIR, ROE, ROA lấy nguyên công thức TTM của Wi**, không tự tính.

### 4.5 Chỉ tiêu tự tính (`build_ctg_data.py:259–299`, ghi trong `D.formula`)
| Khóa | Công thức |
|---|---|
| `writeOffEst` | Nợ xử lý bằng dự phòng ước tính = `(−llp đầu kỳ) + (−prov) − (−llp cuối kỳ)` |
| `writeOffAct` | Số thực tế từ `data/backfill/{mã}_writeoff.json` (`ytd[năm][quý]` triệu đồng): `(lũy kế quý − lũy kế quý trước)/1000`; Q1 trừ 0 |
| `nplFormation` | `nplAmt − nplAmt quý trước + nợ xử lý` (ưu tiên `writeOffAct`) |
| `nplFormationRate` | `nplFormation / ((loansGross + loansGross quý trước)/2) × 400` (% quy năm) |
| `creditCost` (từ quý thứ 5) | `−Σ prov 4 quý / bình quân loansGross 5 điểm × 100` |
| `nimAdj` | `nim × (1 − (−Σprov 4 quý) / Σnii 4 quý)` |
| `recoveriesTTM`, `pbtTTM`, `ppopTTM` | Tổng 4 quý |
| `llrInclAccrued` | `−llp / (nplAmt + accrued) × 100` |
| LDR thô và kịch bản KBNN | Tính ở trình duyệt (`ldrRows`, mục 2.2.5) |
| Khe hở / TS | `irGap / ta × 100` ở trình duyệt |

### 4.6 Các khóa của `window.PVS_DATA`
| Khóa | Nội dung, đơn vị | Nguồn / cách tính |
|---|---|---|
| `meta` | `ticker, name, short, exchange, sector:'bank', peerGroup, updated (ngày build), price, priceDate, mcap (tỷ), pb, pe, bvps, eps, sharesOut (triệu CP), latestQuarter, view:null, irUrl, strategic, src, roe, roa, nim, cir, casa, npl, llr, ratioPeriod ('TTM Qn/yyyy'), pbProvider` | `price` = close phiên cuối `eod_adjust`; `sharesOut = market_cap(ratio_daily)/close cùng ngày/1e6` (thay bằng số CP nguồn nếu lệch < 5%); `mcap = price × shares / 1e3`; `pb` = **P/B đã điều chỉnh sự kiện quyền** = `price × S_now/1e3 / VCSH(asof)`; `bvps = VCSH×1e3/S_now`; `pbProvider` = P/B theo BVPS nguồn; `pe = price/eps` |
| `quarterly` | Mảng quý (mục 4.4–4.5), từ 2009 | `fs_bank` + ratio |
| `quarterlyNote`, `formula` | Chuỗi chú thích, công thức | Hằng trong build |
| `writeOffSrc` | Nguồn số nợ xử lý thực tế | file backfill |
| `annual` | `y, toi, nii, nfi, fx, secInc, otherInc, opex, ppop, prov, pbt, npat, npatParent, loans, deposits, equity, ta, recoveries` (tỷ) + `cashDiv` (đ/CP), `stockDiv`, `payout`, `planDone`, `roe` (%), `eps` | `fs_bank` quarter 0 + `ratio_common_year` |
| `plan` | `year, pbt, npat, ytdQuarters, ytdLabel ('6T/2026'), pbtYTD, npatYTD, pbtDone, npatDone, pbtYTDyoy, npatYTDyoy, src` | `co_plans` (năm của quý mới nhất) + cộng quý; YoY so cùng số quý năm trước |
| `lastStockDiv`, `divPaidAfterQ` | Đợt cổ phiếu gần nhất; cổ tức tiền trả sau ngày khóa sổ quý | `co_events` |
| `mixQ` | `[{q, loans, tenor{}, sector{}, cust{}, dep{}, depCust{}, gov{sbvBorrow, kbnn}, gtcg{}, gtcgTenor{}}]` tỷ đồng | `fs_bank_notes`: tenor `fnx33/34/35`; ngành theo bảng `SECT` (`fnx52…76`), loại KH `CUST` (`fnx38,39,44,45,46–50`) — bỏ nếu tổng < 90% `fnx13`; tiền gửi `fnx112–116`; theo đối tượng `fnx118/119`; vay NHNN `fnx104`, KBNN `fnx107`; GTCG `fnx121–123`, kỳ hạn `fnx125–127`. Gộp với `data/backfill/notes_mix.json` |
| `irSeg` | `{src, depNote, rows:[{q, loans{Bán lẻ, SME, KHDN lớn, FDI}, deps{}}]}` tỷ (nghìn tỷ × 1000) | `data/backfill/ctg_ir_segments.json` (chỉ CTG) |
| `loanMix`, `signals`, `mixNote`, `pages` | Có trong dữ liệu nhưng app.js không dùng | |
| `car` | `[{period ('6T/2025' hoặc '2025'), y, h (2 hoặc 0), car, tier1 (%), ownFunds, rwaCredit (tỷ)}]` | `bank_car_tt41`: `tt41_10, tt41_09, tt41_01, tt41_05` |
| `carPeers` | `{period, rows:[{s, group, car, tier1}]}` kỳ mới nhất toàn ngành | `bank_car_tt41` ≥ 10 mã |
| `peers` | `{period:'Q2/2026 …', rows:[{symbol, group, nim, cof, yea, cir, toiYoY, casa, npl, g2, llr, ldr, creditYoY, accruedToTA, roe, roa, npatYoY}]}` | Lần kéo toàn ngành có **`PEER_Y, PEER_Q = 2026, 2` (cố định, `build_ctg_data.py:160`)** |
| `governance` | `shareholders[{name, shares, percent, asOf}]` (≥ 0,5%), `other` (100 − tổng), `holderNote`, `leadership[{name, role, since}]` (chỉ 8 chức danh, xếp theo `order`), `trades[{name, role, side, type, reg, regFrom, regTo, executed, from, to, volAfter, after, ret{m1, m3, y1}}]`, `subs[{name, kind, pct, capital, ticker, asOf}]` | `co_holders` (có `holderSwap` trong banks.json để sửa nguồn ghi đảo), `co_leaders`, `co_insider` (lợi suất sau 21/63/252 phiên kể từ phiên đầu sau ngày kết thúc, chỉ báo cáo “Kết quả”), `co_subsidiaries` |
| `price` | `series[{d, c, s?, v?}]` (c = giá điều chỉnh, s = chỉ số ngành 405, v = VN-Index), `high52`, `low52` (`{d, c}` trong 365 ngày), `src` | `eod_adjust`, `sector_price_daily` |
| `valuation` | `history[{q, pb, pe}]`, `pbBand`, `peBand` = `{mean, median, sd (pstdev), lo = mean−sd, hi = mean+sd, n, from, to}` trên **20 quý gần nhất** | `ratio_common_ttm` |
| `pbDaily` | `{MÃ: [[ngày, P/B]], các mã cùng nhóm có trang, _median: [...]}` từ 2021 | `ratio_daily`; mã chính dùng P/B điều chỉnh (`pb_adj.json`) |
| `pbAdjNote` | `{q, events[{ex, t}], placements[{d, pct}]}` | Sự kiện quyền sau ngày khóa sổ quý; phát hành riêng lẻ nhận ra từ bước tăng bền của số CP |
| `consensus` | `rows`, `forecastOnly`, `fadeBefore`, `summary`, `fwd`, `src` | Mục 4.7 |
| `events` | `[{d, type, t, impact ('+','−','0','?'), status ('done'/'pending'), detail?, src}]` xếp ngày giảm dần | Mục 4.8 |
| `macro` | `fx{nhtmSell, central, ceiling, sbvSell, free, freeD, nhtmD, dxy}`, `rates{onMonthEnd, omo, dep12State, dep12Other, dep12Bank, dep12Id, effr}`, `onDaily, omoNetDaily, omoRateDaily`, `credit{ytd, yoy, depositsYoY}`, `src` — mỗi chuỗi `[{d, v}]` cuối tháng | `wi_data_macro`; app.js dùng `rates.dep12Bank` (chart COF, rủi ro) và `fx.dxy`, `fx.central` (bảng rủi ro) |
| `fee` | `{lines[{k, name}], series{năm:{k:{inc, exp, net}}}, table{year, prev, rows[{k, name, inc, net, margin, incYoY, netYoY, share}]}, src}` | `fee_lines.py`: thu `fnx143–149`, chi `fnx151–158` |
| `ctx` | `{quarters (Q1/2021→), ldrSens, camel{room, creditYtd, grade, total}, roomCoef, agg{nim,cof,yea,npl,g2,llr,ldr,casa,cir,roe: {'Big 4', GRP, 'all': [..]}}, peerLdr[{s, group, ldr20, ldr0, ldr50, kbnnPctDep}]}` | Đọc `data/sector-data.json` (dashboard ngành); bình quân gia quyền theo dư nợ |
| `thesisPillars` | 5 trụ `{id, go{sub, card}, step, t, evidence, status}` | Mục 4.9 |
| `thesisNote` | “Trạng thái tính theo quy tắc … CHƯA phải nhận định analyst/FinSuccess.” | |
| `reg`, `regRef` | Danh mục quy định, link phân tích | `data/regs.json` |
| `sources` | 4 nguồn: Wi MCP (`https://widata.vn/{MÃ}`), IR ngân hàng, deck FinSuccess, báo cáo TT50 | |
| `narr` | Lời bình biên tập tay từ `banks.json` | Mục 4.10 |

### 4.7 Consensus và P/B forward (`build_ctg_data.py:698–748`)
- Mỗi CTCK (`source`) giữ báo cáo **mới nhất có `target_price`**. `stale` = ngày khuyến nghị < `updated − 92 ngày` (`fadeBefore`).
- Quy đổi TP công bố trước GDKHQ: lặp các sự kiện quyền có `ex` sau ngày báo cáo: `TP = (TP − cổ tức tiền + tỷ lệ quyền × giá phát hành) / (1 + tỷ lệ cổ phiếu + tỷ lệ quyền)`; nếu đổi thì lưu `tpOrig`.
- `upside = TP/price − 1`. `forecastOnly`: báo cáo không có TP nhưng có `net_income_forecast` từ CTCK chưa có trong `rows`.
- `summary` (chỉ báo cáo không stale): `n, median, mean, min, max, upsideMedian, buy (rating 'MUA'), npMedian, npMin, npMax, npN`.
- `fwd`:
  - `bv2026F = VCSH quý mới nhất + (npMedian − LNST lũy kế YTD) − cổ tức tiền đã trả sau ngày khóa sổ (đ/CP × CP / 1e3) + tiền thu quyền mua sau ngày khóa sổ` (tỷ).
  - `pbFwd = mcap / bv2026F`; `peFwd = mcap / npMedian`; `bvps2026F = bv2026F × 1e3 / sharesOut`.
  - `npatH1 = plan.npatYTD`, `impliedH2 = npMedian − npatH1`, `npat2025`, `h2_2025` (Q3 + Q4 năm trước), `divPaid`, `rightsCash`.
- `summary` của từng báo cáo: ghép `ai_news` loại “Báo cáo phân tích” theo tiêu đề (bỏ tiền tố `MÃ: `).

### 4.8 Sự kiện
1. `co_events` có `ex_date ≥ 2024-01-01`: loại “Cổ tức” (nếu `event_type`/tiêu đề có “cổ tức|cổ phiếu”) hoặc “Nghị quyết/CBTT”; `impact '0'`; `status` theo ngày.
2. `exchange_news` lọc theo từ khóa → loại: trái phiếu/tăng vốn/vốn điều lệ → “Vốn & huy động”; PHP → “Thoái vốn”; nhân sự/Phó TGĐ/nghỉ hưu → “Nhân sự”; MUFG/Mizuho/Hana → “Cổ đông chiến lược”; kiểm toán → “BCTC”; quản trị → “Quản trị”. Tin không khớp bị bỏ.
3. `ai_news` loại “Kết quả kinh doanh” → “KQKD”, `impact '+'`, `detail` = AI summary.
4. 3 mốc viết cứng trong build: hạn BCTC Q3/2026 (20/10/2026, `?`, pending); TT50 hiệu lực 01/12/2026 (`?`, pending); hệ số KBNN 50% từ Q3/2026 (01/08/2026, `+`, done, kèm `kbnnNote`).
5. `banks.json[MÃ].events` (biên tập tay).

### 4.9 Quy tắc trạng thái 5 trụ (`build_ctg_data.py:893–913`)
| id | Tiêu đề | `go` | `holding` khi | ngược lại |
|---|---|---|---|---|
| p1 | Room tăng trưởng: LDR và an toàn vốn | `safe/chLdrQ` | LDR < 84 và CAR ≥ 9,5 và huy động YoY ≥ tín dụng YoY − 3 | `watch` |
| p2 | NIM giữ được trước áp lực giảm lãi suất | `nim/chNimPeer` | NIM > đáy 8 quý + 0,05 và CASA ≥ quý trước − 0,5 | `watch` |
| p3 | Nợ xấu: nhóm 2, nhóm 3–5 và lãi phải thu | `aq/chAccr` | (ngược điều kiện watch) | `watch` khi NPL tăng, hoặc LLR giảm, hoặc lãi phải thu YoY > cho vay YoY + 5 |
| p4 | Thu nhập phí (NFI) bù đắp NIM | `nfi/chFee` | NFI TTM > NFI TTM năm trước | `watch` |
| p5 | Định giá chưa phản ánh ROE | `pv/chValF` | P/B < trung bình 20 quý | `watch` |

`evidence` là câu số liệu; dấu thập phân đổi sang phẩy bằng regex `(\d)\.(\d) → \1,\2`.

### 4.10 `data/banks.json`
Khóa `_note` + mỗi mã:
```json
"CTG": {
  "name": "Ngân hàng TMCP Công Thương Việt Nam", "short": "VietinBank", "exchange": "HOSE",
  "irUrl": "https://investor.vietinbank.vn/", "dep12": 202862, "page": "index.html", "strategic": "MUFG",
  "kbnnNote": "…", "holderSwap": {"a": "…", "b": "…", "note": "…"} /* chỉ BID */,
  "events": [{ "d", "type", "t", "impact", "status", "detail", "src" }],
  "narr": { "carWhy", "nplFormCheck", "llrRef": {"v":150,"label":"Mục tiêu 150%","txt":"…"}, "recovTarget",
            "tpSpread", "divNote" (HTML), "divInsight", "divSrc", "eventsNote", "modelNote",
            "risks": [["rủi ro","dấu hiệu","theo dõi ở"]], "ownerSub", "ownerInsight" /* TCB, MBB, ACB */ }
}
```
`dep12` = id chỉ tiêu Wi lãi suất huy động 12 tháng niêm yết của chính ngân hàng (CTG 202862, VCB 202856, BID 202700, TCB 202820, MBB 202742, ACB 202676). Số liệu **không** nằm trong file này, chỉ hồ sơ và lời bình có nguồn.

### 4.11 `window.BIG3` (`scripts/build_big3.py`)
Đọc `data/<mã>-data.json` của `TICKERS = [VCB, BID, CTG, TCB, MBB, ACB]` → `{quarters (hợp các quý, xếp theo thời gian), series{MÃ:{key:[...]}}, car{MÃ:[{period, car, tier1}]}, group, note}` với `KEYS = nim, yea, cof, cir, casa, npl, g2, llr, ldr, creditYoY, fundingYoY, roe, roa, nfiShare, pb, pe, creditCost, nplFormationRate, accruedToTA, llrInclAccrued, nimAdj`. Dùng cho `chPeerTs`.

### 4.12 Dữ liệu ngành dùng ở trang cổ phiếu (`window.SECTOR_DATA`)
- `banks = {quarters (Q1/2021→), series{MÃ:{group, nim, yea, cof, cir, casa, credit, creditYoY, g2, ldr, llr, npl, mcap, pb, pe, npYoY, roa, roe}}}` → `chPeer`, `#peerTbl`, `chPbRoe`, So sánh peer.
- `pbHist = {median:[[ngày, P/B]], banks{MÃ:[[ngày, P/B]]}}` → `chCpb` khi không có chuỗi theo phiên.
- `camel = {periods{FY2021…TTM2Q26:{label, rows[{s, group, big, v{id:{v,s}}, crit{C,A,M,E,L:{pt}}, quant{pt, lo, hi}, …}]}}, ind[{id, c, name, dir, thL, thS, wL, wS, missing}], crit{C:{name, wq, wl}}, roomCoef (2,6), qualDefault (4,0)}` → `camelTT21()`.

### 4.13 Kiểm thử (`tests/test_ctg_data.py`)
Bảng cân đối cộng khớp (`cash + interbankA + secs + loansNet ≤ ta + 1`; tổng nguồn vốn lệch `ta` < 0,1%); 4 quý cộng bằng năm (`pbt`, `toi`, sai < 1 tỷ); YTD kế hoạch khớp…

### 4.14 Thêm một ngân hàng mới (ví dụ VPB)
1. Trong phiên Claude, kéo đủ bộ endpoint ở mục 4.3 với `symbol=VPB` (fs_bank quý tách 2 khoảng năm và năm, ratio_bank/ttm, ratio_common_ttm/year, ratio_daily, bank_car_tt41, fs_bank_notes 2 bộ cột, co_*, eod_adjust, ai_news, exchange_news, macro `dep12` của VPB) → `wi_capture_transcript.py`.
2. Thêm mục `"VPB"` vào `data/banks.json` (name, short, exchange, irUrl, `dep12`, `page: "vpb.html"`, strategic, kbnnNote, events, narr). Mã phải có trong `PEER_GROUPS` (`build_ctg_data.py:21`; VPB = “Tư nhân lớn”) và trong `data/sector-data.json` (`ldrSens`, `camel` kỳ `TTM2Q26`, `banks`) để có `ctx`.
3. `python3 scripts/build_ctg_data.py --ticker VPB` → `data/vpb-data.js`.
4. Thêm `'VPB'` vào `TICKERS` và `GROUP` của `scripts/build_big3.py`, chạy lại.
5. Tạo `vpb.html` bằng cách copy `vcb.html`, đổi `<title>VPB Tracker · FinSuccess</title>`, `<option value="vpb.html" selected>VPB</option>`, `<script src="data/vpb-data.js">`. Trong **cả 12 trang** có ô chọn ngân hàng (`index, vcb, bid, tcb, mbb, acb, nganh, vimo, bh, ck, dn, backend .html`), đổi `<option disabled>VPB · sắp có</option>` thành `<option value="vpb.html">VPB</option>`.
6. Lưu ý giới hạn code: `LTK` trong `app.js:22` chỉ biết 2 nhóm (Big 4 → VCB/BID/CTG, còn lại → TCB/MBB/ACB); `chPeerTs` màu theo bảng `col` (`app.js:910`) — mã mới cần thêm màu; NH thuộc “Tư nhân vừa/nhỏ” cần sửa `LTK`.
7. Mỗi quý mới: cập nhật `PEER_Y, PEER_Q` (`build_ctg_data.py:160`), kỳ `TTM2Q26` (`app.js:942`, `build_ctg_data.py:871`), các mốc sự kiện viết cứng (`build_ctg_data.py:778–785`) và chữ “2026F” trong nhãn.

---

## 5. Quy tắc nội dung thấy trong code

1. **Toàn bộ giao diện tiếng Việt**, định dạng số `vi-VN` (chấm nghìn, phẩy thập phân), ngày `dd/mm/yyyy`, tiền **tỷ đồng** (nghìn tỷ khi số quá lớn trong lời đọc), giá **đ/CP**, bội số `x`, thay đổi tỷ lệ ghi **“điểm %”**.
2. **Mỗi chart có lời đọc (`.insight`) ngay dưới**, sinh từ số đang hiển thị: luôn so sánh (YoY, cùng kỳ, so nhóm, so ngưỡng, so lịch sử) và kết luận hàm ý chứ không chỉ đọc lại số; số quan trọng bọc `<b>`. Lời đọc có câu điều kiện theo dữ liệu (tăng/giảm, trên/dưới ngưỡng).
3. **Dòng nguồn riêng cuối mỗi thẻ** (`.src`, 11px xám nhạt, bắt đầu “Nguồn:”). Số lấy từ Wi ghi **“Wi MCP {endpoint}”** (vd “Wi MCP co_holders”, “Wi MCP ratio_common_ttm”) hoặc tên tài liệu gốc (“BCTC hợp nhất”, “Thuyết minh BCTC hợp nhất (…)”, “Nghị quyết ĐHĐCĐ”, “Báo cáo tỷ lệ an toàn vốn theo TT41”); số tự tính ghi thêm “· tự tính”; nguồn ngoài ghi đúng tên (VietinBank Điểm tin BCTC, báo chí trong `divSrc`).
4. **Phân vai**: lời đọc, trạng thái trụ, dấu ± sự kiện, bảng rủi ro là AI theo quy tắc (gắn pill “AI · theo quy tắc”, “AI tổng hợp”); quan điểm FinSuccess chỉ là phần analyst nhập ở tab 💎 và có nhãn “analyst”. Giá trị khởi tạo kịch bản ghi rõ “chỉ để thử — chưa phải giả định của FinSuccess”.
5. **Mọi mức giá (TP, giá mua, cắt lỗ, giá hợp lý) đi kèm P/B hiện tại và P/B forward** (BVPS 2026F).
6. Consensus: dùng báo cáo **≤ 3 tháng**; báo cáo cũ làm mờ và không vào thống kê; KH ĐHĐCĐ luôn đậm; phân tích cả LNST dự phóng, YTD, implied H2, run-rate, không chỉ giá mục tiêu.
7. Tiêu đề thẻ chỉ ghi tên nội dung (vd “Dải dự phóng của các công ty chứng khoán”); hướng dẫn cách đọc đặt ở `.chart-sub` (mở bằng nút i).
8. Waterfall không ghi số trên nhãn trục x — số in trên cột; đường luôn vẽ trên cột (`FSK.prep`); số chú thích tự tránh chồng (refLines, cpbEnd).
9. Thuật ngữ gốc tiếng Anh giữ dạng viết tắt quen dùng (NIM, COF, CASA, CIR, LLR, LDR, PPOP, TOI) kèm giải thích tiếng Việt trong sub; quy định ghi số hiệu văn bản (TT22, TT41, TT50, TT21/2025).
10. Ghi chú cảnh báo về giới hạn dữ liệu đặt ngay trong thẻ (vd LDR theo công thức nguồn khác số NH báo cáo NHNN; ước tính hình thành nợ xấu; “kết quả xếp hạng thật không công bố”).
