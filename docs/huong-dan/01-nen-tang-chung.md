# 1 · Nền tảng chung (dùng cho mọi trang)

Phần này mô tả mọi thứ **không thuộc riêng một trang**: bố cục repo, hệ thiết kế `assets/fs.css`, các thư viện JS dùng chung (`chartkit.js`, `share.js`, `tblshot.js`, `notes.js`, `chat.js`, `calendar.js`, `devview.js`, `fxchart.js`), khung HTML chung của mỗi trang, quy trình build/deploy (GitHub Actions, `gom_site.sh`, PDF dựng sẵn), trang Database và các quy ước nội dung. Đọc xong phần này, người dựng lại có thể tạo một trang trống đúng chuẩn FinSuccess rồi mới đổ nội dung của từng trang (các phần sau).

Mọi trích dẫn dạng `file:dòng` tính theo repo `/home/claude/bank-dashboard` tại commit `045db37` (27/10/2026, 421 commit).

---

## 1. Bố cục repo

### 1.1. Cây thư mục

| Đường dẫn | Có publish lên web? | Nội dung |
|---|---|---|
| `*.html` (gốc) | Có | Mỗi trang 1 file: `index.html` (= CTG), `vcb.html`, `bid.html`, `tcb.html`, `mbb.html`, `acb.html` (trang ngân hàng, cùng renderer `app.js`); `nganh.html` (Ngành Ngân hàng · CSTT), `vimo.html` (Vĩ mô Việt Nam & Thế giới) — cùng renderer `sector.js` phân biệt bằng `<body data-page>`; `bh.html`, `ck.html`, `dn.html` (ngành Bảo hiểm, Chứng khoán, trang doanh nghiệp `dn.html?s=<mã>`, renderer `finsec.js`); `backend.html` (trang Database); `fin.html` (trang chuyển hướng cũ → `bh.html`). |
| `.nojekyll` | Có | File rỗng để GitHub Pages không chạy Jekyll. |
| `assets/` | Có (chỉ `*.js`, `*.css`, logo, favicon) | CSS chung `fs.css`; JS dùng chung và renderer từng loại trang; `fin-success-logo.png` (965×282 RGBA), `favicon-32.png`, `favicon-192.png`, `favicon.ico` (16+32). |
| `data/*.js` | Có | Dữ liệu đã dựng sẵn, mỗi file gán một biến toàn cục `window.X = {...};` (xem 1.3). |
| `data/*.json` (gốc `data/`) | **Không** (gom_site chỉ chép `data/*.js`) | Bản JSON nguồn/đối chiếu: `sector-data.json`, `<mã>-data.json`, `banks.json` (hồ sơ + lời bình từng NH), `notes.json` (ghi chép đã đăng), `quick-updates.json` (Nhật ký chuyên viên), `sbv-log.json` (nhật ký điều hành NHNN biên tập tay), `regs.json`, `bot-context.json` (dữ liệu cho Trợ lý AI). |
| `data/global/` | Không | Kết quả tải tự động nguồn quốc tế: `series.json`, `report.json`, `daily.json`, `ust.json`, `jp.json`, `jgb_auct.json`, `fedwatch.json`, `fedwatch_hist.json`, `ois.json`, `cmd.json`, `hm_hist.json`, `probe.json`. |
| `data/vn/` | Không | Nguồn tự động trong nước: `dlkt.json`, `dlkt_hist.json`, `dlkt_index.json` (dulieukinhte.com), `market.json` (VNDirect, RSS, COMEX), `sbv.json` (NHNN), `auto-report.json` (báo cáo build_auto). |
| `data/vira/` | Không | `mm.json` (bảng VNIBOR/SOFR OCR từ VIRA), `log.json`, `backfill-log.json`. |
| `data/calendar/` | Không | `ff.json` (Forex Factory lưu dồn), `manual.json` (họp NHTW, lịch Cục Thống kê), `bls.json`, `ust_auctions.json`, `ust_status.json`. |
| `data/backfill/` | Không | Dữ liệu **dẫn xuất** đã commit, bù lịch sử hoặc số tự tính: `bank_index.json`, `bvps_daily.json`, `shares_daily.json`, `equity_parent.json`, `pb_adj.json`, `pb_daily.json`, `corp_events.json` (điều chỉnh P/B theo sự kiện quyền), `ctg_ir_segments.json`, `ctg_writeoff.json` (riêng CTG), `cmd_wi.json`, `eco_wi.json`, `fin_wi.json`, `cn_ppi.json`, `fund_mix.json`, `notes_mix.json`, `idx_bank_bt.json`, `ins_market.json`, `reg_ratios.json`, `self_ratios.json`, `surveys.json`, `vn_hist.json`, `vnindex_m.json`. |
| `data/raw/` | **Không bao giờ** — `.gitignore:5` | Response Wi MCP **nguyên văn** (`data/raw/wi/*.json`, ~530 file; `data/raw/wi/fin/` cho BH·CK). Là một repo riêng private `mdnguyen-cyber/bank-dashboard-raw` clone vào đúng chỗ này (`docs/cap-nhat-du-lieu.md` mục 0). |
| `data/probe/` | Không | Kết quả dò nguồn thủ công (`probe.yml`). |
| `scripts/` | Không | Python 3.12 (fetch_*, build_*, tiện ích) + `gom_site.sh` + `build_pdfs.js` (Node). `__pycache__/` bị ignore (`.gitignore:1-2`). |
| `tests/` | Không | `test_ctg_data.py`, `test_sector_data.py` (chạy được bằng `python3 tests/x.py` hoặc pytest). |
| `docs/` | Không | Quy trình cho AI/chuyên viên: `cap-nhat-du-lieu.md`, `cap-nhat-nhanh.md`, `tro-ly-ai.md`. |
| `bot/assistant.html` | Không | Bản dashboard ngành để publish thành artifact claude.ai (có khung chat). Sinh bởi `scripts/build_artifact.py`. |
| `worker/` | Không | `chat-worker.js` (Cloudflare Worker trung gian cho chat trên web) + `README.md`. |
| `.github/workflows/` | — | 7 workflow (mục 6). |
| `README.md` | Không | Mô tả dự án, lộ trình, cấu trúc tab trang ngân hàng. |

`.gitignore` đầy đủ (5 dòng hiệu lực): `__pycache__/`, `*.pyc`, `.DS_Store`, comment, `data/raw/`.

### 1.2. Quy ước đặt tên

- **Trang**: tên file viết thường, ngắn (`vimo`, `nganh`, `bh`, `ck`, `dn`) hoặc mã cổ phiếu (`vcb.html`…). Ngoại lệ lịch sử: CTG = `index.html`.
- **Dữ liệu cho trang**: `data/<tên>-data.js` gán `window.<TÊN>_DATA` (chữ hoa); file JSON song song cùng tên nếu cần đối chiếu.
- **Script**: `fetch_<nguồn>.py` (tải, ghi vào `data/global|vn|vira|calendar`), `build_<thứ>.py` (dựng `data/*.js`), `<thứ>_backfill.py` / `<thứ>_wi_backfill.py` (bù lịch sử từ raw Wi → `data/backfill/`), `add_<thứ>.py` (đăng nội dung biên tập).
- **Raw Wi**: `data/raw/wi/<tool>_<endpoint|indicator>_<hash8>.json`; bản ghi tay dùng hậu tố `_zz_<YYYYMMDD>.json` để đứng sau và được ưu tiên khi build (`docs/cap-nhat-du-lieu.md` mục 2).
- **Mã chart (canvas id)**: tiền tố theo trang — trang ngân hàng `ch*` (`chNim`, `chFx`, `chCpb`…), trang ngành/vĩ mô `ch*`/`g*` (quốc tế: `gUsSpr`, `gJpCpi`…), `n*` (ngành), bản vẽ lại trong Chart book `cb-*`, trong Nhật ký chuyên viên `qu-*` (`sector.js:147`). `python3 scripts/chart_ids.py` liệt kê.
- **Khoá ghi chép**: `sector-view` (Nhận định FinSuccess ngành), `bank-<MÃ>-decision` (quyết định từng mã).
- **Bản cập nhật nhanh**: `QU-YYYY-MM-DD-AI` / `-CV`.
- **Tên file xuất ra cho người dùng**: luôn `FinSuccess_<tên>_<dd-mm-yyyy>.<ext>`, bỏ dấu tiếng Việt (`chartkit.js:492`, `share.js:304`).

### 1.3. Biến toàn cục dữ liệu (`data/*.js`)

| File | Biến | Sinh bởi |
|---|---|---|
| `ctg-data.js`, `vcb-…`, `bid-…`, `tcb-…`, `mbb-…`, `acb-data.js` | `window.PVS_DATA` (cùng tên khoá với Stock dashboard: `meta`, `quarterly`, `annual`, `governance`, `events`, `consensus`, `valuation`, `thesisPillars`…) | `build_ctg_data.py --ticker <MÃ>` |
| `big3-data.js` | `window.BIG3` (chuỗi quý dài hạn VCB/BID/CTG và nhóm tư nhân) | `build_big3.py` |
| `sector-data.js` | `window.SECTOR_DATA` | `build_sector_data.py` (nền Wi) + `build_auto.py` (nối số tự động) |
| `global-data.js` | `window.GLOBAL_DATA` | `build_global.py` |
| `fx-daily.js` | `window.FX_DAILY` | `fetch_daily.py` |
| `vira-data.js` | `window.VIRA_DATA` (không có file → gom_site tạo `window.VIRA_DATA = null;`) | `build_vira.py` |
| `eco-data.js` | `window.ECO_DATA` | `build_eco.py` |
| `bond-data.js` | `window.BOND_DATA` | `build_bond_data.py` |
| `hm-hist.js` | `window.HM_HIST` | `build_hm_hist.py` |
| `cmd-data.js` | `window.CMD_DATA` | `build_cmd.py` |
| `vimo-risk.js` | `window.VRISK` | `vimo_risk_models.py` |
| `calendar-data.js` | `window.CAL_DATA` | `build_calendar.py` |
| `fin-data.js` | `window.FIN_DATA` | `build_fin_data.py` |
| `notes-data.js` | `window.FS_NOTES` | `add_note.py` |
| `catalog.js` | `window.CATALOG` | `build_catalog.py` |

File sinh tự động mở đầu bằng comment `// Sinh tự động bởi scripts/... — KHÔNG sửa tay.` Các script Python đọc lại `.js` bằng cách cắt từ `{` đầu tiên tới `}` cuối cùng rồi `json.loads` (`build_bot_context.py:14-16`, `build_catalog.py:13-18`).

---

## 2. Khung HTML chung của một trang

Mọi trang dashboard (trừ `fin.html` chuyển hướng) có cùng khung. Ví dụ đầy đủ: `index.html`.

### 2.1. `<head>` theo đúng thứ tự

1. **Script kiểm tra bản mới** — phải đứng ĐẦU TIÊN trong `<head>` (trước cả `<meta charset>`), `index.html:4-5`:
   ```html
   <script>/* bản mới: trình duyệt có thể giữ trang cũ ~10 phút; nếu máy chủ đã có bản mới hơn thì tải lại ngay */
   (function(){var V='__BUILD__';if(V.indexOf('BUILD')>0)return;try{fetch('version.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){if(j&&j.v&&j.v!==V&&location.search.indexOf('_v='+j.v)<0){var u=new URL(location.href);u.searchParams.set('_v',j.v);location.replace(u.toString())}}).catch(function(){})}catch(e){}})();</script>
   ```
   Cách hoạt động: trong repo chuỗi là `'__BUILD__'` → `indexOf('BUILD') = 2 > 0` → thoát (chạy local không làm gì). Khi deploy, `gom_site.sh` thay `__BUILD__` bằng 7 ký tự đầu SHA commit và ghi `_site/version.json = {"v":"<sha7>"}`. Trang tải `version.json` không cache; nếu khác bản đang chạy và URL chưa có `_v=<mới>` thì `location.replace` với tham số `?_v=<sha7>` (tham số chặn lặp vô hạn và phá cache HTML của GitHub Pages ~10 phút).
2. `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`.
3. `<title>` dạng `<Tên> · FinSuccess` (ví dụ `CTG Tracker · FinSuccess`, `Ngành Ngân hàng · CSTT · FinSuccess`, `Vĩ mô Việt Nam & Thế giới · FinSuccess`, `Database · Dữ liệu và phương pháp · FinSuccess`). Phần trước dấu `·` đầu tiên được dùng làm tên file PDF/ảnh.
4. Favicon (3 dòng):
   ```html
   <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
   <link rel="icon" type="image/png" sizes="192x192" href="assets/favicon-192.png">
   <link rel="apple-touch-icon" href="assets/favicon-192.png">
   ```
   (`favicon.ico` được gom_site chép ra cả `_site/favicon.ico` gốc cho trình duyệt tự tìm.)
5. `<link rel="stylesheet" href="assets/fs.css">` — không có font web nào khác (font hệ thống Arial).
6. `<script src="assets/devview.js"></script>` — chạy đồng bộ trong `<head>` để ẩn mục dev trước khi vẽ (mục 5.6).
7. **Speculation rules** (Chrome/Edge tải trước trang kế tiếp):
   ```html
   <script type="speculationrules">{"prerender":[{"where":{"and":[{"href_matches":"*.html"},{"not":{"selector_matches":"[download],[target=_blank]"}}]},"eagerness":"moderate"}],"prefetch":[{"urls":["vimo.html","nganh.html"],"eagerness":"eager"}]}</script>
   ```
   Prerender mọi link `*.html` khi rê chuột (moderate), prefetch ngay `vimo.html` và `nganh.html`. Kết hợp với view transition trong CSS (`fs.css:726-730`) để chuyển trang không nháy: `@view-transition{navigation:auto}`, `.logo-bar{view-transition-name:site-head}`, hiệu ứng root 0,18 s, thanh đầu trang 0 s (đứng yên).

### 2.2. `<body>`

```html
<body data-page="nganh">            <!-- trang ngân hàng: <body> trơn; nganh|vimo|bh|ck|dn|backend có data-page -->
<div class="logo-bar"><div class="wrap">
  <div class="logo-left">
    <img src="assets/fin-success-logo.png" alt="FinSuccess">
    <nav class="site-nav" aria-label="Dashboard">
      <a href="vimo.html">Vĩ mô</a>
      <a href="nganh.html" class="on">Ngành Ngân hàng</a>          <!-- trang hiện tại: class="on" -->
      <label class="bank-pick"><span>Ngân hàng</span>                <!-- trang NH đang mở: class="bank-pick on" -->
        <select aria-label="Chọn ngân hàng" onchange="if(this.value)location.href=this.value">
          <option value="" selected disabled>chọn…</option>           <!-- trang không phải NH -->
          <option value="vcb.html">VCB</option><option value="bid.html">BID</option>
          <option value="index.html">CTG</option><option value="tcb.html">TCB</option>
          <option value="mbb.html">MBB</option><option value="acb.html">ACB</option>
          <option disabled>VPB · sắp có</option> … (20 mã "sắp có": VPB HDB LPB SHB STB VIB TPB MSB SSB OCB EIB NAB ABB KLB VAB BVB BAB PGB SGB NVB)
        </select></label>
      <a href="bh.html">Ngành Bảo hiểm</a>
      <a href="ck.html">Ngành Chứng khoán</a>
      <label class="bank-pick devonly"><span>BH · CK</span>
        <select aria-label="Chọn doanh nghiệp bảo hiểm, chứng khoán" onchange="if(this.value)location.href=this.value">
          <option value="" selected disabled>chọn…</option>
          <optgroup label="Bảo hiểm">dn.html?s=BVH|PVI|MIG|BMI|BIC|PTI</optgroup>
          <optgroup label="Chứng khoán">dn.html?s=SSI|TCX|VCK|VPX|HCM|VCI|MBS|VND|SHS</optgroup>
        </select></label>
      <a href="backend.html">Database</a>
    </nav></div>
  <div class="logo-right"><div class="stamp" id="stamp"></div></div>
</div></div>
<div class="stock-head"><div class="wrap" id="stockHead"></div></div>       <!-- renderer điền -->
<nav class="tabs" role="tablist" aria-label="Các mục dashboard"><div class="wrap" id="tabbar">
  <button role="tab" data-tab="overview" class="active">Tổng quan</button> …
</div></nav>
<main><div class="wrap">
  <section class="pane active" id="overview" role="tabpanel"></section> …   <!-- id = data-tab -->
</div></main>
<footer><div class="wrap" id="foot"></div></footer>
<!-- scripts cuối body -->
```

Trên trang ngân hàng, mã đang mở có `selected` (vd `<option value="index.html" selected>CTG</option>`) và label có `class="bank-pick on"`. Trang ngân hàng dùng nhãn tab không đánh số (`Tổng quan`, `Tài chính`, `Catalyst & Sự kiện`, `Consensus CTCK`, `💎 FinSuccess`); trang ngành/vĩ mô đánh số `1. …`, `2. …` (số bị bỏ khi ghép tên PDF/ảnh: `replace(/^\d+\.\s*/, '')`).

`.logo-right` lúc tải chỉ có `#stamp`; JS chèn thêm vào đầu khối (prepend) theo thứ tự hiển thị cuối cùng: `[👁 User view]` (devview) `[Xuất PDF]` `[PDF bản đang xem]` `stamp`. Bản `bot/assistant.html` còn có công tắc `#modeSw` (Gọn/Chi tiết); các trang web hiện tại không có công tắc này và luôn ở chế độ Gọn (mục 3.10).

### 2.3. Thứ tự script cuối `<body>`

Trang ngân hàng (`index.html:30-43`):
```
Chart.js 4.4.1 (cdnjs) → chat-config.js → chartkit.js → share.js → data/<mã>-data.js → data/big3-data.js
→ data/fx-daily.js → fxchart.js → data/sector-data.js → data/notes-data.js → notes.js → app.js → chat.js
```
Trang ngành `nganh.html`:
```
Chart.js → chat-config.js → chartkit.js → share.js → global-data → fx-daily → fxchart.js → vira-data → sector-data
→ eco-data → bond-data → notes-data → notes.js → sector.js → chat.js
```
Trang vĩ mô `vimo.html` thêm `calendar-data.js` + `calendar.js` (ngay sau share.js), `hm-hist`, `cmd-data`, `vimo-risk` và `tblshot.js` (trước sector.js).
Trang `bh/ck/dn`: `Chart.js → chartkit.js → share.js → [notes-data, notes.js (chỉ dn)] → fin-data.js → finsec.js` (không có chat).
`backend.html`: chỉ `devview.js` (head) + `data/catalog.js` + `assets/backend.js` (không có Chart.js).

URL Chart.js chính xác: `https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js`. Thư viện lười tải (chỉ khi bấm nút): `html2canvas 1.4.1` và `jspdf 2.5.1` cùng từ cdnjs (`chartkit.js:457-458`).

Quy tắc thứ tự: `chartkit.js` phải chạy **sau Chart.js và trước renderer** (đăng ký plugin `legendAll`, set `Chart.defaults`), `share.js`/`tblshot.js` trước renderer (renderer gán `window.FSSHARE`), `chat-config.js` trước `chartkit.js` (chartkit đọc `window.FS_CHAT` để quyết định nút Trợ lý AI).

---

## 3. Hệ thiết kế `assets/fs.css` (756 dòng)

### 3.1. Biến màu và nền tảng (`fs.css:2-10`)

| Biến | Hex | Dùng cho |
|---|---|---|
| `--navy` | `#1D2678` | Màu thương hiệu chính: tiêu đề, chữ số KPI, nút chọn, viền |
| `--blue` | `#2938A8` | Link, hover tiêu đề |
| `--teal` | `#59C5C8` | Gạch dưới tab active, viền trái `h2.sec`, nav đang chọn, nút Trợ lý AI |
| `--teal-ink` | `#1f8a8d` | Chữ teal đọc được trên nền trắng |
| `--purple` | `#861C52` | Đỏ mận: mốc sự kiện, nhận định ngắn trên ảnh chia sẻ |
| `--gold` | `#FFD45D` | Vàng thương hiệu: banner cảnh báo, nút "Ghép ảnh" |
| `--gold-ink` | `#9a7400` | Chữ vàng đọc được |
| `--ink` | `#303540` | Chữ thân |
| `--ink2` | `#596272` | Chữ phụ |
| `--muted` | `#8a93a3` | Chữ mờ, footer |
| `--line` | `#d9dde4` | Viền card, bảng |
| `--line2` | `#e9ecf2` | Viền nhạt, kẻ dòng bảng |
| `--bg` | `#F7F9FD` | Nền trang (cả `html` — `fs.css:727`) |
| `--card` | `#fff` | Nền card |
| `--soft` | `#F0F4FF` | Nền đầu bảng, hover |
| `--pos` | `#1e8f5a` | Tăng/tốt |
| `--neg` | `#c0392b` | Giảm/xấu |
| `--warn` | `#b7791f` | Cảnh báo |
| `--radius` | `16px` | Bo góc card |

Body: `margin:0; background:var(--bg); color:var(--ink); font:14px/1.5 Arial,"Helvetica Neue",system-ui,sans-serif; -webkit-font-smoothing:antialiased` (`fs.css:8`). `*{box-sizing:border-box}`. Không có font web; mọi nút đặt font tường minh `Arial`.

**Không có dark mode**: không có `prefers-color-scheme` trong CSS; khung chat đặt `color-scheme:light`. Trang luôn sáng.

### 3.2. Bố cục khung

| Class | Quy tắc chính |
|---|---|
| `.wrap` | `max-width:1440px; margin:0 auto; padding:0 24px` (≤760px: `0 16px`) — `fs.css:10,131` |
| `.logo-bar` | nền trắng, `border-bottom:1px solid var(--line2)`; `.wrap` flex `space-between`, `gap:12px`, `min-height:64px`, padding dọc 8px, `flex-wrap:wrap` (`fs.css:12-13,754`) |
| `.logo-bar img` | `height:38px` (≤760px: 30px) |
| `.logo-left` | flex, `gap:18px`, `flex-wrap:wrap`, `max-width:100%` (`fs.css:256,755`) |
| `.logo-right` | flex, `gap:14px`, wrap, `justify-content:flex-end`, `margin-left:auto` (khối phải xuống dòng thay vì đè menu — `fs.css:754`) |
| `.stamp` | `font-size:12px; color:var(--ink2)` — dòng "Giá dd/mm/yyyy · cập nhật dữ liệu dd/mm/yyyy" (trang NH) hoặc "Cập nhật dữ liệu dd/mm/yyyy" (ngành/vĩ mô) |
| `.site-nav` | viên thuốc xám `#f1f3f8`, `border-radius:99px` (sau đó 18px khi xuống dòng), padding 3px, gap 2px |
| `.site-nav a` | `padding:5px 12px; border-radius:99px; font:700 12px Arial; color:var(--ink2); no-underline; nowrap`; `.on` → nền `--teal`, chữ `--navy` |
| `.site-nav small.wip` | nhãn "đang làm" 9,5px nền `#fff1d6` chữ `#8a5a00` |
| `.bank-pick` | inline-flex, `gap:6px`, `padding:2px 4px 2px 12px`, `border-radius:99px`, `font:700 12px`; `.on` = nền teal; `select` rộng `74px`, nền trong suốt, không viền |
| `.stock-head` | nền trắng, viền dưới `--line2`; `.wrap` flex, `gap:16px`, padding dọc 14px, wrap |
| `.tick` | ô mã: nền `--soft`, chữ navy `800 22px`, `padding:8px 14px`, bo 12px |
| `.cname` | tên DN `700 17px` navy, `flex:1`, `min-width:220px`; `small` dòng phụ 12px `--ink2` |
| `.hstats` / `.hstat` | flex gap 22px, căn phải; `span` nhãn 10,5px HOA, letter-spacing .06em; `b` 17px navy |
| `.view-chip` | ô quan điểm: nền teal, chữ navy 800 14px, `min-width:120px`, bo 12px; `small` 9,5px; `.none` nền `#eef1f6` |
| `.tabs` | nền trắng, viền dưới `--line`, **`position:sticky; top:0; z-index:20`**; `.wrap` flex gap 4px, `overflow-x:auto`, ẩn thanh cuộn |
| `.tabs button` | `padding:14px 14px 12px; font:600 13.5px Arial; color:#5a6682; border-bottom:3px solid transparent; nowrap`; `.active` → chữ navy, viền dưới teal |
| `main` | `padding:24px 0 60px` |
| `.pane` | `display:none`; `.pane.active{display:block}` |
| `footer` | `color:var(--muted); font-size:11.5px; padding:24px 0; border-top:1px solid var(--line2)` |

### 3.3. Tiêu đề và đoạn chữ

| Class | Quy tắc |
|---|---|
| `h2.sec` | `22px` navy, `margin:8px 0 6px`, `padding-left:12px; border-left:4px solid var(--teal)` |
| `h3.sec2` | `17px` navy, `margin:26px 0 10px`, viền trái 3px teal |
| `.sec-sub` | mô tả dưới tiêu đề mục: 13px `--ink2` (ẩn ở chế độ Gọn) |
| `h3.grp-h` | tiêu đề nhóm chart trong tab con: 15px 700 navy, viền trái 4px teal, `small` 12px `#8a93a3` (`fs.css:676-678`) |
| `h3.ovh` | tiêu đề mục ở Tổng quan ngành: 17px, viền trái 4px teal, `scroll-margin-top:70px`; `.coll` → bấm thu gọn, mũi tên `▾` xoay −90° khi `.shut` (`fs.css:338,381-384`) |
| `.qscope` | nhãn phạm vi trong cập nhật nhanh: 15px HOA, viền trái 4px teal |
| `.muted` | `color:var(--muted)` |
| `code` | `12px ui-monospace`, nền `#eef0f4`, bo 4px |

### 3.4. Card (đơn vị nội dung cơ bản)

Mọi chart/bảng nằm trong `<article class="card">` sinh bởi hàm `card()` (giống hệt nhau ở `app.js:207-216` và `sector.js:166-176`):

```html
<article class="card {cls}">
  <h3 class="sub">{title}<span class="ctl" data-ctl="{id}"></span>?</h3>   <!-- ctl chỉ khi ctl:true -->
  <p class="chart-sub">{sub}</p>                                         <!-- đơn vị · kỳ · cách đọc -->
  <div class="cbox {h}"><canvas id="{id}" role="img" aria-label="{title}"></canvas></div>
  {body}                                                                   <!-- bảng, ghi chú… -->
  <div class="insight">{insight}</div>                                    <!-- lời đọc, số in đậm <b> -->
  <div class="src">Nguồn: {src}</div>
</article>
```

| Class | Quy tắc |
|---|---|
| `.card` | nền trắng, `border:1px solid var(--line)`, `border-radius:16px`, `padding:22px` (≤760px: 16px), `margin-bottom:18px`, `min-width:0` |
| `h3.sub` | 16px navy, `margin:0 0 4px`, flex `gap:8px` wrap (để chứa nút `.info`, `.ctl`, grip ⠿) |
| `.chart-sub` | 12px `--ink2`, `margin:0 0 10px` |
| `.insight` | 13px, `margin-top:10px; padding-top:10px; border-top:1px dashed var(--line)`; `b` màu navy |
| `.src` | 11px `#9aa3b2`, `margin-top:8px` — nguồn luôn xám nhỏ, dòng riêng |
| `.note` | 12,5px `--ink2`, `margin-top:8px`; `.note.keep` = không bị ẩn ở chế độ Gọn |
| `.cnote` | ghi chú vàng: 12px, nền `#FFF8E1`, viền trái 3px `#FFC000`, bo 4px |
| `details.more` / `details.morex` | phần mở rộng, summary 12,5–13px màu `--blue` |
| `article.card.flash` / `.card.flash` | `box-shadow:0 0 0 3px var(--teal)` khi nhảy tới card (1,6 s) |
| `.calc` | dòng tính toán 12,5px `--ink2`, `b` navy |

### 3.5. Khung chart `.cbox` (chiều cao chính xác)

| Class | Chiều cao | Ghi chú |
|---|---|---|
| `.cbox` | **280px** | mặc định, `position:relative` (`fs.css:69`) |
| `.cbox.tall` | **340px** | dùng nhiều nhất (~92 chỗ) |
| `.cbox.short` | **230px** | |
| `.cbox.xl` | **600px** (≤700px: 520px) | bản đồ nhiệt/chart rất dày (`fs.css:631,647`) |
| `.gov2 .cbox` | 280px | khối Quản trị & sở hữu |
| inline | `style="height:260px"`, `style="height:180px"` | 2 chỗ đặc biệt trong renderer |

Chart.js đặt `maintainAspectRatio:false` nên canvas lấp đầy `.cbox`. Khi in/PDF, `.cbox{height:auto!important}` và canvas được thay bằng ảnh `.pdf-img`.

### 3.6. KPI, fact, banner, pill

| Class | Quy tắc |
|---|---|
| `.kpis` | grid **6 cột** `repeat(6,minmax(0,1fr))`, `gap:14px`, `margin-bottom:18px`; ≤1100px: 3 cột; ≤760px: 2 cột |
| `.kpis.k4` | 4 cột (≤760px: 2) |
| `.kpis.pol` | 5 cột (≤1100: 3; ≤640: 2), `b` 18px — dùng cho mức điều hành NHNN |
| `.kpi` | nền trắng, viền `--line`, bo **14px**, `padding:14px 16px`; `span` nhãn 11px HOA 700 letter-spacing .06em `--ink2`; `b` **22px 800 navy** `margin:4px 0 2px`; `em` 12px `--ink2`, `em.pos`/`em.neg` màu xanh/đỏ; `.kpi-lk` = bấm được (hover viền teal) |
| `.facts` / `.fact` | grid 4 cột (≤1100: 2) gap 10px; ô nền `#f5f7fb`, viền `--line2`, bo 10px, `padding:10px 12px`; `span` 10,5px HOA; `b` 16px navy; `small` 11px muted |
| `.banner` | nền `#eef9f9`, viền trái 4px teal, bo 8px, `padding:10px 14px`, 13px; `.warn` nền `#fff8e5` viền vàng; `.chain` nền `--soft` viền navy chữ đậm navy (ẩn ở Gọn) |
| `.pill` | viên thuốc 11px 700, `padding:2px 8px`, nền `#eef1f6`; `.ok` (`#e3f5ec`/pos — "Hỗ trợ", "Giữ vững"), `.watch` (`#fff4d6`/gold-ink — "Theo dõi"), `.risk` (`#fde8e6`/neg — "Rủi ro", "Gãy"), `.ai` (`#e6f6f6`/teal-ink), `.pending`, `.rs-soon`, `.rs-on` ("Mới"), `.rs-bad` ("Trễ N ngày") |
| `.imp.p/.m/.z` | dấu tác động sự kiện `+` (pos), `−` (neg), `0`/`?` (ink2), 800 |
| `.dir.n/.t/.z` | hướng điều hành: nới (xanh) / thắt (đỏ) / trung tính (xám) |
| `.who.ai` / `.who.cv` | nhãn tác giả cập nhật: AI tím `#ede9fe/#5b3fb8`, Chuyên viên xanh |
| `.verdict.bad/.good` | kết luận nền đỏ/xanh nhạt |
| `.gr.gA…gE` | ô hạng TT21: A `#1e8f5a`, B `#4f9bd1`, C `#d9a400`, D `#e07b39`, E `#c0392b` |
| `.grpdot` | chấm 8×8 màu nhóm ngân hàng |
| `.pos` / `.neg` (trong `td` hoặc `span`) | màu tăng/giảm |

### 3.7. Lưới

| Class | Quy tắc |
|---|---|
| `.grid` | `display:grid; gap:18px` |
| `.g2` / `.g3` | 2 / 3 cột `minmax(0,1fr)`; ≤760px: 1 cột. Card bên trong `margin-bottom:0` |
| `.span2` | `grid-column:1/-1` (card rộng hết lưới) |
| `.gap` | `margin-bottom:18px` |
| `.gcards` | 4 cột (≤1100: 2; ≤760: 1), card có viền trên 4px màu `--gc` |
| `.pillars` | 5 trụ luận điểm, 5 cột (≤1100: 2; ≤760: 1); `.pillar` flex dọc, `.pgo` nút "xem" dính đáy |
| `.chain3`, `.vchain` | 3 cột có mũi tên `→` giữa các ô (≤760: `↓`) |
| `.matrix` | `grid-template-columns:120px 1fr 1fr` (≤760: 70px) — ma trận kịch bản; `.cell.on` viền 2px navy + bóng teal; `.now` nhãn "hiện tại" |
| `.dbx`, `.drv`, `.ratg` | 2 cột (≤860–900: 1) |
| `.vflow` | sơ đồ chuỗi giá trị 5 cột `1fr 34px 1.1fr 34px 1fr` với mũi tên CSS `.varr` (≤860: dọc) |

### 3.8. Bảng

| Class | Quy tắc |
|---|---|
| `table` | `width:100%; border-collapse:collapse; font-size:13px; font-variant-numeric:tabular-nums` |
| `th` | nền `--soft`, chữ navy 700, `padding:8px 10px`, viền dưới `--line`, nowrap |
| `td` | `padding:7px 10px`, viền dưới `--line2`, `vertical-align:top` |
| `td.n`, `th.n` | **cột số**: căn phải, nowrap |
| `tr.hl td` | dòng nhấn: nền `#fffbea`, 700 |
| `tr.stale td` | dòng cũ (dự phóng > 3 tháng): chữ `#9aa3b2` |
| `tr.soon td` | sự kiện sắp tới: nền `#fffbf0` |
| `tr.grp td` | dòng nhóm (một ô colspan): nền `--soft` |
| `.tscroll` | `overflow-x:auto` — **mọi bảng bọc trong div này** |
| `table.fz` | **cột đầu cố định khi cuộn ngang**: `th:first-child, td:first-child{position:sticky; left:0; z-index:2; background:#fff; box-shadow:inset -1px 0 0 var(--line2)}`; ô đầu `thead` nền `--soft`, z-index 3 (`fs.css:751-752`) |
| `th.sortable` | con trỏ tay, hover xanh |
| `table.sbv`, `.l22`, `.cm`, `.cmd`, `.hmt`, `.etab`, `.cpi-c`, `.cpi-heat`, `.cmpt`, `.fdrv`, `.betab`, `.bsx` | bảng chuyên dụng của từng trang (độ rộng cột, nowrap, sticky) |
| `td.xh`, `th.xh` | tô sáng dòng × cột khi rê chuột (`inset 0 0 0 999px rgba(29,38,120,.08)`); `td.xh-on` viền 2px navy (tblshot) |

Cách dùng chuẩn: `<div class="tscroll"><table class="fz">…</table></div>` (9 chỗ dùng đúng mẫu này).

### 3.9. Nút, bộ chọn, bộ lọc, form

| Class | Quy tắc |
|---|---|
| `.subtabs` | hàng tab con: flex gap 8px wrap, `margin:0 0 16px`; nút viên thuốc viền `--line`, `padding:7px 14px`, `13px`; `.on` nền `#e6f6f6` viền teal 700. Nút có `cursor:grab` (kéo đổi thứ tự — chartkit) |
| `.sub` / `.sub.on` | nội dung tab con ẩn/hiện; `.csub` tương tự cho tab nước |
| `.picker` | nhóm nút chọn chuỗi: flex gap 6px; nút `padding:4px 11px; 12.5px`; `.on` nền navy chữ trắng; `.picker.tf` (khung thời gian) `margin:0 0 6px` |
| `.filter` | bộ lọc sự kiện: nút `padding:5px 12px`; `.on` navy |
| `.ctl` | công tắc trong tiêu đề (Cột/Đường): nền `#f1f3f8`, bo 8px; nút `600 11.5px` `padding:4px 8px`; `.on` navy chữ trắng; `margin-left:auto` (đẩy sang phải tiêu đề) |
| `.btn` | **định nghĩa 2 lần, bản sau thắng** (`fs.css:242-243`): `border:1px solid var(--navy); background:var(--navy); color:#fff; border-radius:8px; padding:5px 12px; font:600 12.5px Arial`; `.btn.ghost` nền trắng chữ navy |
| `.ipill` | nút "ⓘ Insight", "ⓘ Nguồn": viền `--line`, nền `#f3f5fb`, chữ navy `700 11.5px`, bo 8px |
| `.peerpill` | "⇄ So sánh peer": nền `#fff7e6` viền `#efd9a8` |
| `.sharepill` | "⇪ Chia sẻ ảnh", "＋ Ghép": viền `#c9cfe6`, `700 11.5px`, `margin-left:auto` |
| `.info` | nút tròn `i` 18×18 cạnh tiêu đề card: nền `#e6eaf4`, chữ navy `italic 700 11.5px Georgia,serif`; hover nền navy chữ trắng |
| `.tip.dark` / `.tip.light` | popup: `position:fixed; z-index:50; max-width:min(380px,100vw-16px)` (light: 460px), bo 12px, bóng `0 10px 30px rgba(20,26,60,.18)`; dark nền `#1f2433` chữ trắng (mô tả chart), light nền trắng (insight/nguồn/peer) |
| `.ibar` | hàng nút cuối card: ẩn mặc định, `display:flex` khi `body.compact`; `gap:8px; margin-top:12px; padding-top:10px; border-top:1px solid var(--line2)` |
| `.mode-sw` | công tắc Gọn/Chi tiết (viên thuốc, `.on` navy) |
| `.vswitch` | công tắc trượt 38×22 (knob 16px, bật = nền navy) |
| `.ovmode` | 2 nút "ngắn gọn/đầy đủ" ở Tổng quan ngành |
| `.form` | grid 4 cột (≤760: 2) gap 12px; `label` 11px HOA; `input/select/textarea` viền `--line` bo 8px `padding:8px 10px`; `.wide` span 2, `.full` cả hàng |
| `.psel`, `.gov-q`, `.qin` | ô chọn kỳ, ô tìm cổ đông, ô nhập điểm |
| `.lnk` | nút dạng link gạch chân navy |
| `.colbar` | "Mở hết/Thu gọn hết" căn phải |
| `.qbar` | thanh "bản cập nhật mới nhất" bấm được: viền trái 4px navy |
| `.totop` | nút ↑ tròn 44px navy cố định `right:18px; bottom:74px` (+safe-area), hiện khi cuộn > 0,8 màn hình |
| `.aibot` | nút "✦ Trợ lý AI": cố định `right:18px; bottom:18px`, cao 44px, bo 22px, nền teal chữ navy `700 14px`, `z-index:61` |
| `.aibot-soon` | toast "Tính năng đang phát triển" phía trên nút, viền trái teal, tự ẩn 3,5 s |

### 3.10. Chế độ Gọn / Chi tiết (`body.compact`)

`fs.css:87,90`:
```css
body.compact .ibar{display:flex}
body.compact .insight, body.compact .chart-sub, body.compact .sec-sub, body.compact .banner.chain,
body.compact .note:not(.keep), body.compact details.more, body.compact .card>.src{display:none}
```
Ở chế độ Gọn, lời đọc (insight), mô tả chart, nguồn bị ẩn; cuối mỗi card hiện hàng `.ibar` với nút **ⓘ Insight** / **ⓘ Nguồn** mở popup `.tip.light`, và nút **(i)** cạnh tiêu đề mở mô tả `.tip.dark`. Ở Chi tiết, `.ibar` chỉ hiện nếu có nút So sánh peer (`fs.css:453-454`). Ngoại lệ: `body.compact article:has(#chCmHist) .insight{display:block}` (`fs.css:450`).

Renderer (`app.js:1225-1249`, `sector.js:3775`): `setMode(m)` bật/tắt `body.compact`, lưu `localStorage['fs-bank-ui']`; hàm `decorate()` chạy qua MutationObserver trên `<main>` để gắn `.info` (nếu card có `.chart-sub`) và `.ibar` (nếu có `.insight`/`.note:not(.keep)`/`.src`/peer) cho mọi card mới. **Hiện mặc định cứng `const mode0 = 'compact'` — "chỉ dùng bản gọn"** (`app.js:1319`, `sector.js:3825`), và các trang web không có `#modeSw`, nên người xem luôn thấy bản Gọn. Popup: rê chuột (thiết bị có hover) hoặc bấm/nhấn (cảm ứng), Esc/cuộn/đổi cỡ để đóng (`app.js:1302-1316`).

### 3.11. Breakpoint đáp ứng

| Ngưỡng | Thay đổi |
|---|---|
| `≤1100px` | `.kpis` 3 cột, `.pillars` 2, `.facts` 2, `.gcards` 2, `.kpis.pol` 3 |
| `≤900px` | Lịch kinh tế thành tấm trượt từ dưới (82vh); `.ratg` 1 cột |
| `≤860px` | `.vflow`, `.drv`, `.dbx` 1 cột, mũi tên dọc |
| `≤820px` | Hộp chia sẻ ảnh 1 cột |
| `≤760px` | `.wrap` padding 16px; `.g2/.g3` 1 cột; `.kpis` 2 cột; `.form` 2 cột; `.pillars` 1; `.card` padding 16px; logo 30px; `.logo-left` gap 10px wrap; `.chain3`, `.vchain` dọc; `dl.gloss` 1 cột |
| `≤700px` | bảng nhiệt: cột tên 120px; `.cbox.xl` 520px |
| `≤640px` | `.kpis.pol` 2 cột |
| `≤600px` | `.ovmode` nút chia đều |
| `(hover:none)` | ẩn gợi ý "kéo để zoom", bỏ con trỏ crosshair |
| `(min-width:901px)` + `body.cal-open` | đẩy nội dung `padding-right:420px`, dời `.aibot`/`.totop` sang `right:438px` |

### 3.12. In và PDF

Ba lớp CSS cho ba con đường xuất:

1. **`@media print` cơ bản** (`fs.css:135`): tab hết sticky, mọi `.pane` hiện, ẩn `.ctl`, `.btn`.
2. **`body.print-all`** — dùng bởi `FSPDF.prep()` khi dựng PDF chữ thật bằng Chrome (`fs.css:424,432-448`): `@page pdfall{size:A4 portrait;margin:5mm}`; ẩn `.pdfbtn .tabs .site-nav .mode-sw .totop .aibot .ibar .ctl .rng .zsel .picker .colbar .tfbar .tf .subtabs .info .grip .fsn-btns .sec-sub .banner.chain`, mọi pane không active, canvas gốc (`.pdf-hide`); **hiện lại** `.insight .chart-sub .card>.src` (bản in luôn có lời đọc và nguồn); `.pdf-img` hiện thay canvas; `.wrap` bỏ padding ngang; `break-inside:avoid` cho card có ảnh và KPI; `h2,h3{break-after:avoid}`; giữ `.grid.g2` 2 cột; `print-color-adjust:exact`.
3. **`body.pdf-cap`** — dùng khi chụp màn hình bằng html2canvas ("PDF bản đang xem") (`fs.css:428-431,627`): ẩn cùng danh sách nút như trên, hiện insight/sub/src.
4. **`body.print-quick`** — in riêng tab Cập nhật nhanh (`fs.css:272-287`): A4 lề 12mm, chỉ `#quick`, bỏ nút/lịch sử/bản nháp, ảnh chart `max-height:340px`.
5. **`.pdf-host/.pdf-wrap/.pdf-top/.pdf-body`** — khung 718px ngoài màn hình để html2pdf dựng PDF cập nhật nhanh (`fs.css:317-327`).

Các phần tử nổi luôn ẩn khi in: `.totop`, `.aibot`, `.cal-rail/.cal-drawer`, `#ai_panel`, `.fss-tray`, `.lgall`, `.sharepill`, `.peerpill`.

### 3.13. Bảng tra nhanh class chính

| Nhóm | Class |
|---|---|
| Khung | `.wrap` `.logo-bar` `.logo-left` `.logo-right` `.stamp` `.site-nav` `.bank-pick` `.devonly` `.stock-head` `.tick` `.cname` `.hstats` `.hstat` `.view-chip` `.tabs` `.pane` `footer` |
| Tiêu đề | `h2.sec` `h3.sec2` `.sec-sub` `h3.sub` `h3.grp-h` `h3.ovh(.coll.shut)` |
| Card | `article.card` `.chart-sub` `.cbox(.tall/.short/.xl)` `.insight` `.src` `.note(.keep)` `.cnote` `.ibar` `.ipill` `.info` `.tip(.dark/.light)` |
| Lưới | `.grid.g2/.g3` `.span2` `.gap` `.kpis(.k4/.pol)` `.kpi` `.facts/.fact` `.pillars/.pillar` `.gcards/.gcard` `.matrix` |
| Bảng | `.tscroll` `table.fz` `td.n` `tr.hl` `tr.stale` `tr.grp` `th.sortable` |
| Điều khiển | `.subtabs` `.sub(.on)` `.picker(.tf)` `.filter` `.ctl` `.btn(.ghost)` `.rng` `.ysel` `.tsw` `.lgall` `.sharepill` `.fss-add` `.pdfbtn(.pdfbtn2)` `.totop` `.aibot` |
| Trạng thái | `.pill(.ok/.watch/.risk/.ai/.rs-on/.rs-soon/.rs-bad)` `.imp` `.dir` `.who` `.verdict` `.pos/.neg` `.banner(.warn/.chain)` |
| In | `body.compact` `body.print-all` `body.pdf-cap` `body.print-quick` `.pdf-img` `.pdf-hide` |

---

## 4. `assets/chartkit.js` — bộ công cụ chart (`window.FSK`, 580 dòng)

Xuất ra: `window.FSK = { prep, reorder, enhance, dates, windowFor, sortable, cardSortAll, feePicker, feeCfg, wireFee }` (`chartkit.js:370`), cộng các khối tự chạy: nút lên đầu trang, nút Trợ lý AI, `window.FSPDF`, nút Xuất PDF, plugin `legendAll`, Chart.defaults.

### 4.1. Cách renderer gọi

Mỗi renderer có hàm `mk(id, cfg, opt)` (`app.js:72-97`, `sector.js:139-160`):
1. Huỷ chart cũ cùng id; đặt `interaction` mặc định `{mode:'index', intersect:false, axis:'x'}` (hoặc `'y'` nếu `indexAxis:'y'`).
2. Nếu có đường tham chiếu dọc có nhãn → thêm `layout.padding.top ≥ 18`.
3. `FSK.prep(cfg)` → `new Chart(el, cfg)` → `FSK.enhance(chart, { today: new Date(TODAY), last: opt.last, win: opt.win })`. Trang ngân hàng: chart trong tab Tài chính mặc định `win: 60` (5 năm) (`app.js:81`).
4. `opt.switch: 'bar'|'line'` → điền nút Cột/Đường vào `<span class="ctl" data-ctl="id">` của tiêu đề.

### 4.2. `prep(cfg)` — đường luôn trên cột (`chartkit.js:33-38`)

Với chart trộn bar + line (không phải scatter): dataset `line` nhận `order:0`, `bar` nhận `order:10` (Chart.js vẽ order thấp sau cùng → đường đè lên cột) trừ khi dataset đã tự đặt `order` (cờ `_ao` đánh dấu order tự gán). `reorder(ch)` làm lại sau khi đổi Cột/Đường.

### 4.3. `enhance(chart, opt)` (`chartkit.js:101-270`)

- **Gỡ listener cũ** bằng `AbortController` gắn vào `canvas._fskAC`; xoá thanh `.rng` cũ ngay trước `.cbox`.
- **Tô sáng khi rê chuột** (`hiWire`, `chartkit.js:65-100`): rê lên một cột/điểm → chuỗi đó giữ màu, các chuỗi khác còn 40% alpha; với chart cột, ô đang chọn giữ màu, các ô khác 55%. Dataset `keep:true` không có nhãn (đường phụ) không bị làm mờ. Rời chart → trả màu gốc (lưu ở `d._hc0`).
- Dừng ở đây nếu chart `scatter` hoặc ngang (`indexAxis:'y'`) hoặc nhãn trục X không phải thời gian.
- **Nhận dạng trục thời gian** (`parse`, `chartkit.js:9-17`) khi có ≥ 6 nhãn và TẤT CẢ khớp một dạng: `mm/yyyy` → cuối tháng; `Qn/yy` hoặc `Qn/yyyy` → cuối quý; `dd/mm/yyyy`; `yyyy-mm[-dd]`; `dd/mm` (suy năm đi ngược từ hôm nay, lùi một năm mỗi khi tháng tăng ngược). Quy ước nhãn trục: ngày `dd/mm/yyyy`, tháng `mm/yyyy`, quý `Qn/yyyy`.
- **Thanh `.rng`** chèn ngay trước `.cbox`:
  - Nút khung thời gian `RANGES = [['1M',1],['3M',3],['6M',6],['YTD','ytd'],['1Y',12],['3Y',36],['5Y',60],['Tất cả',0]]`. `windowFor` (`chartkit.js:46-54`): dữ liệu cuối tháng/quý so theo cuối tháng (`k` tháng trước, +1); dữ liệu ngày lùi đúng `k` tháng; YTD giữ thêm điểm 31/12 năm trước làm mốc. Nút bị `disabled` nếu khung < 2 điểm hoặc ≥ toàn bộ chuỗi.
  - **Cột ↔ Đường** (`.tsw`): tự thêm cho chart một loại (toàn cột hoặc toàn đường), không chồng, không fill, không dữ liệu dạng khoảng `[a,b]`, chưa có `.ctl` riêng, không nằm trong `[data-nosw]` (`chartkit.js:120-138`).
  - **Trục Y** (`.ysel`): `Y vừa dữ liệu` (co theo min/max chuỗi trục `y` đang hiện trong khung X, đệm 6%; chart chồng cộng dương/âm riêng), `Y tuỳ chỉnh` (hiện 2 ô `min`/`max`, điền sẵn theo trục hiện tại 4 chữ số), `Y mặc định` (khôi phục min/max/beginAtZero gốc).
  - **`100% tỷ trọng`**: chỉ với chart chồng có ≥ 2 cấu phần luôn dương và trục chưa max 100 — đổi sang tỷ trọng (%), ẩn tạm các chuỗi không chồng; bấm lại "Giá trị gốc" (`chartkit.js:164-188`).
  - Gợi ý `.rng-hint` (căn phải): "kéo trên chart để zoom · kéo trên trục Y để chỉnh trục" (ẩn trên thiết bị cảm ứng).
- **Kéo trên trục Y** (vùng bên trái chartArea): nửa dưới kéo `min`, nửa trên kéo `max` (kéo lên = tăng), con trỏ `ns-resize`, thả tay làm tròn về bước 10^⌊log10(span/20)⌋; nhấp đúp trên trục = mặc định (`chartkit.js:196-226`).
- **Kéo để zoom kiểu FRED** (chuột trái trong chartArea): vẽ dải `.zsel` (nền `rgba(41,56,168,.12)`, viền trái phải `rgba(41,56,168,.6)`), thả → `scales.x.min/max` = chỉ số điểm; kéo < 8px coi là nhấp; nhấp đúp = toàn bộ. Click sau khi kéo bị chặn để không kích hoạt `onClick` của chart (`chartkit.js:240-269`).
- **Khung mở sẵn**: `opt.last = N` → N điểm cuối (đánh dấu `custom`); `opt.win = 12|36|60|'ytd'` → nút tương ứng; còn lại nút `Tất cả` sáng.
- Khi đổi khung và đang ở chế độ "Y vừa dữ liệu", trục Y co lại theo khung mới.

### 4.4. Kéo đổi thứ tự

- **Tab con** (`sortable(box, key, attr)`, `chartkit.js:274-305`): chuột bấm-kéo >5px; cảm ứng nhấn giữ 350 ms rồi kéo (rung 15 ms). Thứ tự lưu `localStorage['fsk-order:<key>']`. Nút đang kéo `.fsk-drag` (phóng 1,06, bóng).
- **Card trong lưới** (`cardSort`, `chartkit.js:309-350`): mọi `.grid` có ≥ 2 `article.card` tự được bật (MutationObserver toàn trang, trễ 120 ms). Nắm vào tiêu đề `h3.sub` (thêm biểu tượng `<span class="grip">⠿</span>`, class `.drag-h`) — không phải vùng vẽ (dành cho zoom). Thứ tự lưu `localStorage['fsk-cards:<trang>:<tab|data-subp|data-pp|data-cc|data-p>:<chỉ số lưới>']`, định danh card = `data-card` hoặc id canvas hoặc 40 ký tự tiêu đề.

### 4.5. Plugin "Ẩn tất cả / Hiện tất cả" (`chartkit.js:558-577`)

Plugin toàn cục `legendAll` (`afterUpdate`): chart không phải pie/doughnut/polarArea, có **≥ 3 dataset** và legend không tắt → thêm `<div class="lgall"><button>` ngay sau `.cbox`. Nhãn `⊘ Ẩn tất cả` khi mọi chuỗi đang hiện, `↺ Hiện tất cả` khi có chuỗi bị ẩn. CSS: nút 600 11px navy, viền đứt `--line`, bo 99px, căn giữa.

### 4.6. Chart.defaults

- Trong `chartkit.js:580`: `Chart.defaults.resizeDelay = 120` (gom các lần co giãn), `Chart.defaults.devicePixelRatio = Math.max(2, window.devicePixelRatio || 1)` (vẽ tối thiểu 2x để không mờ).
- Trong mỗi renderer (`app.js:37-48`, `sector.js:45-56`): `font.family = 'Arial, "Helvetica Neue", sans-serif'`, `font.size = 11.5`, `color = '#3f4656'`, legend `position:'bottom'`, `labels.boxWidth = 12`, `maintainAspectRatio = false`, `animation = false`; tooltip label `"<label>: <nf(v, ds.dp ?? 1)><ds.unit>"` (dataset tự mang `dp` = số lẻ, `unit` = đơn vị; dữ liệu dạng khoảng `[a,b]` hiển thị `b−a`).
- Trục chuẩn: `pctAxis(title)` → tick `nf(v,1)+'%'`, lưới `#eef0f4`; `numAxis(title)` → tick `nf(v,0)`.
- Plugin `refLines` (renderer đăng ký, `app.js:49-69`): `options.plugins.refLines.lines = [{value, axis:'y'|'x', label, color (mặc định #c0392b), width 1.5, dash [5,4]}]` vẽ đường đứt + nhãn viên thuốc trắng 90% `600 11px Arial`; nhãn ngang xếp tránh chồng 15px. Dùng cho mốc 52W High/Low, trần LDR 85%, CAR 8%, mục tiêu lạm phát, thị giá…
- `sector.js` có thêm `quadBg` (nền góc phần tư) và `markPlug`/`qMarks` (vạch dọc tím `#861C52` tại mốc sự kiện, nhãn 700 10px).

### 4.7. `feePicker/feeCfg/wireFee` (`chartkit.js:353-368`)

Chart thu phí theo mảng có 4 chế độ: `Lãi thuần` (cột chồng), `Tăng trưởng thu YoY`, `Tăng trưởng lãi thuần YoY`, `Biên lợi nhuận` (đường; dòng Tổng màu `#1b1f2a` dày 3). YoY bỏ qua gốc < `opt.minBase` (30) để tránh % ảo.

### 4.8. Khối phụ trong chartkit.js

- **Nút lên đầu trang** `.totop` (`chartkit.js:374-382`).
- **Nút Trợ lý AI** `.aibot` (`chartkit.js:385-403`): mặc định link tới artifact claude.ai `https://claude.ai/artifact/NPnjNWbkz5DUjxRdnQ9Qmi` (target _blank). Nếu `window.FS_ARTIFACT` hoặc `FS_CHAT.url` có giá trị → nút mở khung chat ngay trong trang (chat.js bắt click). Nếu cả hai đều không có (bản web hiện tại vì `chat-config.js` để `url:''`) → nút hiện toast `.aibot-soon` "✦ Trợ lý AI — Tính năng đang phát triển — sẽ sớm có mặt ngay trên trang này." 3,5 s.
- **`window.FSPDF`** và **nút Xuất PDF** — mục 5.1.

---

## 5. Các mô-đun dùng chung khác

### 5.1. Xuất PDF (`chartkit.js:405-556`)

Hai nút được chèn vào đầu `.logo-right`:

| Nút | Class | Hành vi |
|---|---|---|
| **Xuất PDF** | `.pdfbtn` | Tải PDF **chữ thật dựng sẵn** của đúng trạng thái đang xem (tab + tab con). Đọc `pdf/index.json` (cache no-cache); nếu có khoá `FSPDF.key()` thì tải `pdf/<khoá>.pdf?v=<built>` với tên `FinSuccess_<tiêu đề trang> - <nhãn tab - tab con>_<dd-mm-yyyy ngày dựng>.pdf`. Không có bản dựng sẵn → rơi về chụp bản đang xem. |
| **PDF bản đang xem** | `.pdfbtn.pdfbtn2` (chữ 500 `#5a6275`, viền đứt) | Chụp trạng thái hiện tại trên máy (gồm bản nháp, bộ lọc) thành PDF ảnh. |

**`FSPDF.key()`** (`chartkit.js:414-418`): `[tên trang không .html, data-tab đang active, giá trị nút .on của từng nhóm .subtabs đang hiện trong pane theo thứ tự]` nối bằng `__`, ký tự lạ → `-`. Giá trị nút = giá trị `data-*` đầu tiên của nút (vd `data-sub`) hoặc chữ. Ví dụ `index__fin__nim`. `FSPDF.label()` = "Tên tab - Tên tab con".

**`FSPDF.prep()`** (dùng bởi `build_pdfs.js`): thêm `body.print-all`, mở mọi `.coll.shut`, áp cách hiển thị riêng `VIEW` (hiện chỉ `chFx`: giữ đường "Tự do bán ra" và "DXY", khung YTD, Y vừa dữ liệu), rồi đổi từng canvas thành `<img class="pdf-img">` PNG và giấu canvas `.pdf-hide`.

**Chụp bản đang xem** (`shot`, `chartkit.js:506-553`): lười tải html2canvas 1.4.1 + jsPDF 2.5.1; thêm `body.pdf-cap`; mở mục thu gọn; cuộn về đầu; resize chart; A4 dọc lề 5mm (`PW=200mm`, `PH=283mm`); chụp riêng thanh logo + stock-head làm đầu trang 1 (tối đa 30% trang); cắt trang không cắt ngang khối (`units()` thu các khoảng [top,bottom] của phần tử con ≤ chiều cao trang, canvas/table coi là khối liền; `cuts()` ngắt tại đầu khối kế tiếp); mỗi trang `scale:2`, JPEG 0,82; chân trang phải `FinSuccess  |  i/n` 8pt xám 140. Nút hiện "Đang tạo PDF… i/n". Xong thì hoàn tác mọi thay đổi (`undo`).

### 5.2. `assets/share.js` — Chia sẻ ảnh chart (399 dòng)

Mục đích: ghép ảnh có thương hiệu từ 1–6 chart để đăng Zalo/Telegram/Facebook/X.

- **Nút trên mỗi card có chart** (`addButtons`, `share.js:18-30`, chạy lại qua MutationObserver 250 ms): `＋ Ghép` (`.sharepill.fss-add`) và `⇪ Chia sẻ ảnh` (`.sharepill`), nối vào `.ibar` sẵn có hoặc tạo `.ibar.sharerow`.
- **Giỏ ghép** `.fss-tray` (viên thuốc navy cố định đáy giữa): "N chart đã chọn", nút vàng `Ghép ảnh →`, `Bỏ chọn`; tối đa `MAXN = 6`. Nút đã chọn đổi thành `✓ Đã chọn k`.
- **Hộp thoại** `.fss-modal` (`share.js:224-251`): trái = công cụ vẽ (`Không vẽ`, `Mũi tên ➝`, `Mũi tên đứt ⇢`, `Tô sáng ▬`, `Khung ▢`, `Khoanh tròn ◯`, `Chữ T`), 5 màu (`navy #1D2678`, `purple #861C52`, `gold #FFD45D`, `red #c0392b`, `teal #59C5C8`), Hoàn tác (Ctrl+Z), Xóa vẽ, khung xem trước; phải = định dạng `Ngang 16:9` (1600×900, "X · Telegram · Zalo") / `Dọc 4:5` (1080×1350, "Facebook · Instagram"), danh sách chart (lên/xuống/bỏ, ô "Nhận định ngắn", khung thời gian riêng), `＋ Thêm chart` (hộp chọn lọc theo tab, ô tìm, mục "Đang xem trên màn hình"), Bố cục (`Tự động`, 1/2/3 cột), **Khung thời gian chung** (`Như trên chart`, `Khớp chart ngắn nhất`, 1M…5Y, Tất cả), **THÔNG ĐIỆP CHÍNH** (thành tiêu đề lớn), **CAPTION** tự soạn, nút `⇪ Chia sẻ…` (Web Share API kèm file, chép caption trước), `Tải ảnh`, `Chép ảnh`, `Chép caption`.
- **Bố cục ảnh** (`compose`, `share.js:133-190`): nền trắng, vạch navy 8px trên cùng, logo cao 46px trái, tên trang (`.site-nav a.on`) xám phải, kẻ ngang; tiêu đề chart 34px navy (hoặc thông điệp chính 36px + tiêu đề 18px xám), mô tả 18px xám, nhận định đỏ mận 19px; chart vẽ lại ở độ phân giải cao (`snap`: đặt `devicePixelRatio = 2×zs`, resize, chụp, trả về); chân: "Kỳ dữ liệu: <nhãn cuối> · Nguồn: …" trái, **"FinSuccess Research"** navy và **"Tổng hợp có sự hỗ trợ của AI"** xám phải. Nhiều chart: lưới, mỗi ô "k. tiêu đề", nhận định, "mô tả · từ – đến", hàng cuối thiếu ô thì căn giữa.
- **Làm sạch nguồn** (`cleanSrc`, `share.js:54-57`): bỏ "Nguồn:", mọi cụm `WiData…`/`Wi MCP…` (kèm mã bảng nội bộ) → đúng chữ `Wi MCP`; rỗng → "FinSuccess tổng hợp". Nhiều chart: gộp nguồn, bỏ trùng.
- Tên file: `FinSuccess_<tiêu đề không dấu, ≤60 ký tự>_<dd-mm-yyyy>.png`.
- **API cho trang**: renderer khai báo `window.FSSHARE = { prep(), path(card) }` — `prep()` dựng mọi tab ẩn để hộp chọn liệt kê đủ chart; `path(card)` trả `[tab, tab con]` (`app.js:1215-1222`, `sector.js:3839`, `finsec.js:1693`). Không khai báo → đường dẫn lấy từ nút tab của `.pane` chứa card.
- `window.FSShareImage({img, title, sub, src, last})` — mở hộp với ảnh dựng sẵn (bảng từ tblshot); bảng cao (h > 0,62w) mặc định khung 4:5.

### 5.3. `assets/tblshot.js` — bảng: ảnh, tô sáng, menu chuột phải (`window.FSTbl`, chỉ nạp ở `vimo.html`)

- `FSTbl.button(scrollEl, opts)` → nhóm `.tbl-btns` gồm `⇪ Chia sẻ ảnh` (mở hộp share.js với ảnh bảng), `Chép ảnh bảng` (Clipboard API, thất bại thì tải PNG), `Tải PNG`; thường đặt trong `.tbl-bar` (flex căn phải, có `.tbl-tip` gợi ý bên trái). `opts = {title, sub, src, file}` hoặc hàm trả object.
- `render(sc, o)` (`tblshot.js:16-78`): vẽ **phần bảng đang hiện** (chỉ cột hiện trọn; cột đầu sticky luôn giữ) ra canvas 2x: logo phải, tiêu đề 18px navy, sub 12px `#596272`, ô bảng chép màu nền/chữ/căn lề/độ đậm từ CSS thật, kẻ dòng `#e6e9f0`, viền cột sticky `#c9cfdc`, nguồn 11px `#8a93a3`. Tuỳ chọn `rows` (chỉ vài dòng), `cols`, `hl` (tô sáng dòng × cột), `bare` (không khung), `compact`.
- `FSTbl.enhance(scrollEl, {meta, onChart, onCompare, isCompared, clearCompare, nCompare})` (`tblshot.js:115-151`): rê chuột tô sáng cả dòng và cột (`.xh`, ô `.xh-on`); **chuột phải** mở `.tbl-menu` với tiêu đề = nhãn dòng và các mục: "Chép ảnh dòng này", "⇪ Chia sẻ ảnh bảng, tô sáng ô này (thêm caption)", "Chép ảnh bảng, tô sáng ô này", "Chép ảnh bảng đang xem", —, "Tải PNG: bảng, tô sáng ô này", "Tải PNG: bảng đang xem", — và nếu trang cung cấp: "Vẽ chart dòng này", "Thêm/Bỏ dòng này vào chart so sánh", "Xoá so sánh (n dòng)". Đóng bằng click ngoài, Esc, cuộn. Thông báo `.tbl-toast` (navy, đáy giữa, 2,2 s).

### 5.4. `assets/notes.js` — ghi chép chuyên viên (`window.FSN`)

Dùng cho ô **Nhận định FinSuccess** (nganh, khoá `sector-view`) và **Quyết định hiện tại** từng mã (trang NH và dn, khoá `bank-<MÃ>-decision`).

- **Trình soạn** (`editorHtml/wireEditor`, `notes.js:101-122`): thanh `.fsn-tb` với `B`, `I`, `U`, `• Danh sách`, `1. Danh sách`, `Xoá định dạng` (`document.execCommand`), nút **"Rà soát chính tả & thuật ngữ"**; vùng `.fsn-area` contenteditable (placeholder qua `data-ph`, min-height 140px).
- **Rà soát (`vcCheck`)** (`notes.js:14-46`): từ điển `VC_ACCENT` sửa từ gõ thiếu dấu (`cac→các`, `ngan hang→ngân hàng`, `lai suat→lãi suất`…), `VC_TERM` ~90 thuật ngữ Anh → Việt và giữ gốc trong ngoặc (`carry trade → giao dịch chênh lệch lãi suất (carry trade)`, `hawkish → diều hâu (hawkish)`, `term premium → phần bù kỳ hạn (term premium)`…), bỏ qua nếu tiếng Việt đã đứng trước. Sửa trực tiếp trên text node rồi liệt kê "Đã sửa N chỗ: “a” → “b”".
- **HTML an toàn** (`clean`, `notes.js:54-75`): chỉ giữ `b i u ul ol li br` (span style đậm/nghiêng/gạch chân đổi thành thẻ; `div/p` → `<br>`).
- **Phiên bản**:
  - Bản đã đăng: `window.FS_NOTES.notes[key]` (từ `data/notes-data.js`).
  - Bản nháp: `localStorage['fsn:<key>']` — chỉ giữ **1 bản nháp mới nhất**, tự xoá sau `DRAFT_DAYS = 7` ngày, hoặc khi trùng id/nội dung với bản đã đăng, hoặc khi đã có bản đăng mới hơn (`notes.js:84-93`). Bản seed (id `*-seed`) không hết hạn.
  - `versions(key)` = [nháp?] + đã đăng mới nhất trước.
- **Khối hiển thị** (`mount(el, opt)`, `notes.js:125-172`): chế độ xem = tiêu đề, nút `Sao chép để đăng` + `Xoá nháp` (khi có nháp), `Lịch sử (n)`, `✎ Chỉnh sửa`; dòng meta (ngày giờ, tác giả, pill `bản nháp · tự xoá sau N ngày` vàng hoặc `đã đăng` xanh); tóm tắt `.fsn-chip`; thân `.fsn-body` (viền trái 3px teal, 14px/1,65). Chế độ sửa = các ô `opt.fields(v)` + trình soạn + "Người viết" (mặc định `Minh Đức`, nhớ ở `localStorage['quWho']`) + `Lưu bản mới`. Mỗi lần lưu tạo `{id: key-<ms>, at: 'YYYY-MM-DD HH:MM', author, f, html, text}`.
- **Đăng**: nút "Sao chép để đăng" chép `{"key":…, "versions":[nháp]}` → chuyên viên dán vào chat với AI kèm "đăng nhận định này" → AI rà chính tả/thuật ngữ (ghi `aiEdits`) → `python3 scripts/add_note.py <file.json>`: lọc HTML chỉ giữ `<b><i><u><ul><ol><li><br>`, thêm bản chưa có id, sắp theo `at`, ghi `data/notes.json` (nguồn, có thụt lề) và `data/notes-data.js` (`window.FS_NOTES = {...,"built":"…Z"}`). Chạy không tham số = chỉ dựng lại `notes-data.js`.

### 5.5. Trợ lý AI (`chat.js`, `chat-config.js`, `worker/`, `bot/`)

**Ba chế độ** (`chat.js:5`): `MODE = window.FS_ARTIFACT ? 'claude' : (FS_CHAT.url ? 'api' : null)`; `null` → không làm gì (bản web hiện tại: `assets/chat-config.js` = `window.FS_CHAT = { url: '' };`).

| | Bản claude.ai (artifact) | Bản web qua Worker |
|---|---|---|
| Bật bằng | `bot/assistant.html` có `<script>window.FS_ARTIFACT = true;</script>` trước chartkit | Điền URL Worker vào `chat-config.js` |
| Gọi model | `claude.use('sample')` — tài khoản người xem | `POST <url>/chat` với header `x-fs-key` = mật khẩu (lưu `localStorage['fs-ai-key']`) |
| Nguồn trực tiếp | `claude.use('mcp')` → connector **WiMCP** (`wi_data_search`, `wi_data_macro`, `wi_data_companies`, `wi_data_news`) | Không (chỉ dữ liệu dashboard) |
| Nút "Cập nhật dữ liệu" | `mcp.callTool('Claude Code Remote','fire_trigger',{trigger_id:'trig_01Wg3DbSbchPzmc1AatBXPd4', text?})` → phiên Claude chạy `docs/cap-nhat-du-lieu.md` (20–40 phút) | `POST /update` → Worker dispatch `fetch-global.yml` + `fetch-vira.yml` (~15 phút) |

**Khung chat** `#ai_panel` (`<aside>` cố định phải, `width:min(460px,100vw)`, trượt vào `translateX`): đầu = "✦ Trợ lý AI · ngành Ngân hàng" + "Dữ liệu dashboard đến dd/mm/yyyy · đóng gói …" + nút `Cập nhật dữ liệu` + `×`; giới thiệu "Hỏi số liệu, thử giả định, yêu cầu cập nhật" với 4 câu mẫu (chip); ô nhập (Enter gửi), `Gửi`/`Dừng`, ô tích **Phân tích sâu** (`modelTier:'complex'` → Worker dùng `MODEL_DEEP`), `Xoá hội thoại`. CSS nhúng trong JS (`chat.js:7-55`). Mở/đóng bằng nút `.aibot`, `×`, Esc. Lịch sử 30 lượt gần nhất ở `localStorage['fs-bot-turns']`; mỗi câu hỏi gửi 12 lượt gần nhất.

**Công cụ cho model** (`chat.js:168-200`): `get_series` (chuỗi theo mã), `get_banks` (chỉ tiêu quý 26 NH theo mã/nhóm "Big 4", "Tư nhân lớn", "Tư nhân vừa", "Tư nhân nhỏ"), `get_section` (bảng tổng hợp: latest, agg, secVal, ppopSector, consensus, ldrSens, camel…), `calc` (tính biểu thức không dùng eval), `source_search`/`source_macro`/`source_companies`/`source_news` (chỉ chế độ claude), `request_update` (chỉ hiện nút xác nhận, không tự chạy). Kết quả công cụ cắt ở 30.000 ký tự (Wi 24.000).

**System prompt** (`rules()`, `chat.js:203-228`) gồm: vai trò ("trợ lý phân tích ngành Ngân hàng Việt Nam của FinSuccess, làm việc với chuyên viên Minh Đức"), ngày hôm nay và ngày dữ liệu; quy tắc (tiếng Việt, số in đậm, dùng "Nhận định:"/"Hàm ý:", không "Cách đọc:"; mọi số qua công cụ, mọi phép tính qua `calc`; nguồn theo cơ quan gốc, số Wi MCP ghi "Wi MCP"; giả định/tin đồn ghi rõ và công thức tính lại tín dụng YTD/MoM/YoY; chart chèn khối ```chart JSON {type,title,unit,labels,series[{name,data,type?,dashed?}]} tối đa 2 chart × 60 điểm); quan điểm gần nhất của FinSuccess (headline bản cập nhật nhanh mới nhất); **danh mục chuỗi** `mã | tên | tần suất | đơn vị | mới nhất ngày = giá trị`; nhóm NH và 6 quý gần nhất; mã chỉ tiêu Wi hay dùng (tín dụng YTD 241732, YoY 75847; tiền gửi YoY 265963; M2 265954; CPI 75701; lạm phát cơ bản 202889; USD/VND NHTM bán 82223, tự do 82226, trung tâm 82227; LNH qua đêm 82237; OMO 81522; bơm/hút ròng 82268; LS huy động 12T Big 4 202886; DXY 235028; EFFR 7079); tab người dùng đang xem. Câu trả lời render Markdown tối giản (`md()`), chart vẽ bằng Chart.js với bảng màu lấy từ biến CSS (`--blue --teal --gold-ink --neg --pos --purple`).

**Vòng gọi công cụ bản web** (`apiSample`, `chat.js:111-141`): tối đa 8 vòng; mỗi vòng POST `/chat` `{system, messages, tools, deep}`; nếu `stop_reason === 'tool_use'` thì chạy công cụ trong trang và gửi `tool_result`.

**Dữ liệu cho trợ lý** `data/bot-context.json` (`scripts/build_bot_context.py`): `{built, dataAsOf, series{key:{label,unit,freq,src,last,pts}}, banks{quarters, metrics}, sections{meta, latest, agg, secVal, ppopSector, consensus, ldrSens, camel, reg, sbvPolicy, sbvEvents, idx, signals, events, quick, news}}` (hiện 194 chuỗi). Chuỗi tháng từ 2021-01 (tối thiểu 5 năm); chuỗi ngày: 120 phiên gần nhất + phiên cuối mỗi tuần về tới 2021. Nguồn ghi theo cơ quan công bố gốc (NHNN, Cục Thống kê, IMF IFS…), không ghi nhà cung cấp trung gian.

> Lưu ý khi dựng lại: `gom_site.sh` chỉ chép `data/*.js`, nên `bot-context.json` **không** có trên GitHub Pages; nếu bật chế độ web (điền `FS_CHAT.url`) cần thêm `cp data/bot-context.json _site/data/` vào `gom_site.sh`, nếu không trợ lý báo "Không tải được dữ liệu dashboard".

**Worker** `worker/chat-worker.js` (Cloudflare Worker, `export default { fetch }`): CORS chỉ cho `ALLOWED_ORIGINS` (mặc định `https://mdnguyen-cyber.github.io`); chỉ `POST`; header `x-fs-key` phải bằng secret `CHAT_PASSWORD` (sai → 401); `/chat` chuyển tiếp tới `https://api.anthropic.com/v1/messages` (`anthropic-version: 2023-06-01`, `model = deep ? MODEL_DEEP||'claude-opus-5-5' : MODEL||'claude-sonnet-5-5'`, `max_tokens:4096`, system ≤ 200.000 ký tự, tối đa 20 tools; body > 900.000 ký tự → 413); `/update` dùng `GITHUB_TOKEN` (fine-grained, Actions read/write) dispatch 2 workflow trên `main`. Cài đặt từng bước ở `worker/README.md`.

**Bản artifact** (`scripts/build_artifact.py`, `docs/tro-ly-ai.md`): lấy `nganh.html`, tách `<title>`, `<link>` và nội dung `<body>`; đổi link CTG thành URL công khai `https://mdnguyen-cyber.github.io/bank-dashboard/index.html`, `nganh.html` → `#`; chèn `window.FS_ARTIFACT = true` → ghi `bot/assistant.html` (không có doctype/head/body — nền tảng tự bọc). Publish tới `https://claude.ai/artifact/NPnjNWbkz5DUjxRdnQ9Qmi` với `files` = `assets/fs.css, chartkit.js, notes.js, sector.js, chat.js, chat-config.js, fin-success-logo.png, favicon-32.png, favicon-192.png, data/global-data.js, vira-data.js, sector-data.js, notes-data.js, bot-context.json` (mỗi đường dẫn ánh xạ về chính nó, không truyền `capabilities` để giữ quyền sample + mcp đã khai). Hiện **tạm dừng** publish lại artifact theo yêu cầu (`docs/cap-nhat-du-lieu.md` mục 4).

### 5.6. `assets/devview.js` — User view / Developer view

- Trạng thái ở `localStorage['fsDevView'] === '1'` → `<html class="dev">`. Chạy trong `<head>` nên áp dụng trước khi vẽ.
- CSS chèn động (`devview.js:12-20`): khi **không** dev, ẩn link `bh.html`, `ck.html`, `backend.html` và mọi `.site-nav .devonly` (ô chọn BH · CK).
- Trang khoá `DEV_PAGES = /\/(bh|ck|dn|fin|backend)\.html$/`: không dev → `<html class="dev-gate">`, ẩn mọi con của body trừ `#devGate` — hộp 420px giữa màn "Trang dành cho developer · Mục này đang xây dựng. Nhập mật khẩu để xem, hoặc về trang chính" + ô mật khẩu.
- Nút ở đầu `.logo-right`: `👁 User view` (viền navy) hoặc `🛠 Developer view` (nền navy). Bấm khi đang user → popup `.dv-pop` ô "Mật khẩu developer" + `Mở`; đúng → lưu cờ và tải lại. Bấm khi đang dev → về user (đang ở trang dev thì chuyển `index.html`).
- Kiểm mật khẩu: `crypto.subtle.digest('SHA-256')` so với hằng `PASS_SHA256 = '600352d4…45db0e2'` (`devview.js:5`). Đổi mật khẩu = thay hằng bằng sha256 mới. Đây là **ẩn giao diện, không phải bảo mật** (site tĩnh công khai).
- `build_pdfs.js` bỏ qua các trang dev khi dựng PDF.

### 5.7. `assets/calendar.js` — Lịch kinh tế (chỉ `vimo.html`)

Dữ liệu `window.CAL_DATA = {built, ev:[{d (UTC ISO), c (mã tiền tệ), t (tên gốc), i ('H'|'M'), a, f, p, ap, est, per, fw}]}` từ `scripts/build_calendar.py` (Forex Factory lưu dồn + lịch NHTW/Cục Thống kê biên tập tay + FOMC từ FedWatch; số thực tế ghép từ chuỗi gốc BLS/BEA/ECB/NBS/Cục Thống kê). Giao diện: dải dọc `.cal-rail` bên phải (navy, chữ dọc "Lịch kinh tế", huy hiệu đỏ đếm tin; phím **C**) → ngăn kéo `.cal-drawer` 420px (điện thoại: tấm trượt từ dưới 82vh) với bộ lọc khoảng `±1 tuần` / `±1 tháng` / `Tùy chọn`, mức quan trọng (chấm đỏ `#e0533d` Cao, cam `#f0a23b` Trung bình), nhóm nước (Mỹ, Việt Nam, EU/Anh, Nhật-Trung, Khác); danh sách theo ngày (đầu ngày sticky, vạch đỏ "bây giờ"), mỗi dòng giờ VN · mã nước · tên tiếng Việt (bảng dịch `NAME`) · Thực tế/Dự báo/Kỳ trước (▲/▼ so dự báo); mở dòng → giải thích, sparkline 12 kỳ (thực tế vs dự báo), link tới chart liên quan. Trạng thái lưu `localStorage['fs-cal']`. Giờ hiển thị `Asia/Ho_Chi_Minh`, số thập phân dấu phẩy. Chân: "Lịch, dự báo và kỳ trước: Forex Factory; FOMC: CME FedWatch; số thực tế: BLS, BEA, ECB, NBS, Cục Thống kê." API `window.FSCAL = {go, focus, open}`.

### 5.8. `assets/fxchart.js` — chart hành lang tỷ giá dùng chung

`window.FSFX = { TITLE, SUB, SRC, insight(m), config(...) }` — một chart USD/VND theo ngày từ 2021 (trung tâm, trần/sàn ±5%, giá bán can thiệp NHNN, NHTM và tự do bán ra, Vietcombank, trục phải DXY) dùng ở cả trang ngành và trang ngân hàng. Bảng màu riêng: navy `#1D2678`, VCB `#1f6f3f`, DXY `#8a8f98`. Nguồn ghi: "Ngân hàng Nhà nước (…); Vietcombank; DXY tính theo công thức ICE từ tỷ giá tham chiếu ECB; NHTM và tự do: Wi MCP 82223, 82226".

### 5.9. `localStorage` — danh mục khoá

| Khoá | Ghi bởi | Nội dung |
|---|---|---|
| `fsDevView` | devview | `'1'` = developer view |
| `fs-bank-ui` | app/sector | chế độ `compact`/`full` |
| `fs-bank-<MÃ>` | app.js | quan điểm/quyết định analyst ở tab FinSuccess |
| `fs-bank-sector` | sector.js | lựa chọn trên trang ngành |
| `fsn:<key>` | notes.js | bản nháp ghi chép |
| `quWho` | notes, sector | tên người viết/sửa |
| `fsk-order:<key>` | chartkit | thứ tự tab con |
| `fsk-cards:<trang>:<vùng>:<i>` | chartkit | thứ tự card trong lưới |
| `fs-col:<key>` | sector | mục đang thu gọn |
| `fs-ov-mode`, `fs-vc-mode`, `fs-roepb`, `fs-hm` | sector | chế độ xem Tổng quan, chuỗi giá trị, chart ROE–P/B, bản đồ nhiệt |
| `fs-cal` | calendar | bộ lọc, trạng thái mở |
| `fs-bot-turns`, `fs-ai-key` | chat | lịch sử chat, mật khẩu Worker |

Mọi lần đọc/ghi đều bọc `try/catch` (trình duyệt chặn storage vẫn chạy được).

---

## 6. Build và deploy

### 6.1. Tổng quan luồng

```
Nguồn công khai ──(GitHub Actions cron)──> fetch_*.py ─> data/global|vn|vira|calendar
                                                       └> build_*.py ─> data/*.js ─commit─> main
Wi MCP (trong phiên Claude) ─> wi_capture_transcript.py ─> data/raw/wi/ (repo private)
                                                       └> build_sector_data / build_ctg_data / ... ─> data/*.js ─commit─> main
push main ──> pages.yml: gom_site.sh ─> _site ─> deploy (≈1 phút) ─> build_pdfs.js ─> _site/pdf ─> deploy lần 2
```

Mọi commit tự động dùng `user.name "fs-data-bot"`, `user.email "fs-data-bot@users.noreply.github.com"`, đẩy bằng `for i in 1 2 3; do git pull --rebase -q && git push && break; sleep 5; done`. Vì commit bằng `GITHUB_TOKEN` **không** kích hoạt sự kiện `push` cho workflow khác, các workflow dữ liệu tự gọi `gh workflow run pages.yml --ref main` (cần `permissions: actions: write` và `GH_TOKEN: ${{ github.token }}`).

### 6.2. Bảng workflow (giờ Việt Nam = UTC+7)

| File | Tên hiển thị | Lịch (cron UTC → giờ VN) | Các bước | Commit |
|---|---|---|---|---|
| `fetch-global.yml` | Cập nhật số liệu quốc tế (FRED, NY Fed, DBnomics) | `17 23 * * *` → **06:17 mỗi ngày**; `47 9 * * 1-5` → **16:47 thứ 2–6**; + `workflow_dispatch` | Python 3.12, `pip install openpyxl xlrd numpy`; chạy `fetch_global.py` rồi (mỗi lệnh `|| echo "… lỗi"` để một nguồn lỗi không làm hỏng cả lượt) `fetch_ust`, `fetch_jp`, `fetch_jgb_auct`, `fetch_daily`, `fetch_fedwatch`, `fetch_ois`, `fetch_calendar`, `fetch_dlkt`, `fetch_market`, `fetch_cmd`, `FORCE=<1 nếu chạy tay> fetch_hm_hist`; dựng `build_global`, `build_calendar`, `build_auto`, `build_eco`, `build_hm_hist`, `build_cmd`, `vimo_risk_models`, `build_catalog` | `data/global/`, `global-data.js`, `fx-daily.js`, `data/vn/`, `sector-data.js/.json`, `eco-data.js`, `hm-hist.js`, `cmd-data.js`, `vimo-risk.js`, `catalog.js`, `data/calendar/`, `calendar-data.js`; message `Số liệu quốc tế YYYY-MM-DD (tự động)`; rồi dispatch `pages.yml`. `concurrency: fetch-global` không huỷ lượt đang chạy |
| `fetch-sbv.yml` | Cập nhật chỉ tiêu ngân hàng toàn hệ thống (NHNN) | `23 2 * * *` → **09:23 mỗi ngày** (NHNN chỉ hiện tháng mới nhất nên chạy hằng ngày để không lỡ) | `pip install beautifulsoup4 lxml playwright` + `playwright install --with-deps chromium` (trang NHNN dựng bằng JS); `fetch_sbv.py` | Chỉ `data/vn/sbv.json`; message `Chỉ tiêu ngân hàng NHNN YYYY-MM-DD (tự động)`; **không** dispatch pages (số vào trang ở lượt build kế tiếp) |
| `fetch-vira.yml` | Cập nhật thị trường tiền tệ (VIRA Market Watch) | `47 10 * * 1-5` → **17:47 thứ 2–6**; dispatch có input `max_pages` (mặc định `2`, nạp lịch sử: `40`) | `apt-get install tesseract-ocr`, `pip install pillow pytesseract numpy`; `MAX_PAGES=… fetch_vira.py` (OCR bảng VNIBOR VND/USD, SOFR); `build_vira.py`; timeout 300 phút | `data/vira/`, `vira-data.js`; message `Thị trường tiền tệ VIRA YYYY-MM-DD (tự động)`; dispatch pages |
| `pages.yml` | Deploy dashboard lên GitHub Pages | `push` lên `main` + `workflow_dispatch`; `concurrency: pages, cancel-in-progress: true` | Xem 6.3 | — |
| `vira-backfill.yml` | Nạp lịch sử VIRA (song song theo khúc trang) | chỉ chạy tay: `pages` (60), `chunk` (3) | job `plan` chia `[[1,3],[4,6],…]`; job `ocr` matrix ≤ 20 máy song song (`START_PAGE`, `MAX_PAGES`, `OUT_PART=parts/p<n>.json`, `WORKERS=2`), upload artifact `part-<n>`; job `merge` (`if: always()`) tải về, `merge_vira.py parts`, `build_vira.py` | `data/vira`, `vira-data.js`; message `Lịch sử VIRA (nạp song song)`; dispatch pages |
| `probe.yml` | Dò nguồn số liệu (thủ công) | chạy tay | `pip install xlrd openpyxl`; `probe_sources.py` | `data/probe/` |
| `vira-probe.yml` | Thử tải VIRA Market Watch | chạy tay | `vira_probe.py` | `data/vira` (`Thử VIRA (tạm)`) |

Ngoài GitHub Actions còn **tác vụ đã lên lịch của Claude** "Cập nhật dashboard ngân hàng" (`trig_01Wg3DbSbchPzmc1AatBXPd4`, **17:20 thứ 2–6** giờ VN) chạy quy trình `docs/cap-nhat-du-lieu.md` (phần cần Wi MCP).

### 6.3. `pages.yml` chi tiết

Quyền `contents: read, pages: write, id-token: write`. Hai job, cùng environment `github-pages`:

1. **`deploy`** (trang lên ngay, ~1 phút): checkout → `bash scripts/gom_site.sh` → bước "Giữ PDF bản trước" (`continue-on-error`): tải `https://<owner>.github.io/<repo>/pdf/index.json` và từng `pdf/<khoá>.pdf` đang có trên web về `_site/pdf/` (để nút Xuất PDF không mất file trong lúc chờ bộ mới) → `configure-pages@v5` → `upload-pages-artifact@v3` (path `_site`) → `deploy-pages@v4`.
2. **`pdf`** (`needs: deploy`): checkout → gom_site → Node 20 → `npm i --no-save --no-package-lock playwright@1.47.2` → `npx playwright install --with-deps chromium` → `node scripts/build_pdfs.js _site` (timeout 20 phút; in `::notice title=PDF::N file PDF, <dung lượng>`) → upload artifact tên `github-pages-pdf` → deploy lần 2 với `artifact_name: github-pages-pdf`.

### 6.4. `scripts/gom_site.sh` — gom trang và đóng dấu phiên bản

```bash
set -e
rm -rf _site; mkdir -p _site/data _site/assets
cp *.html .nojekyll _site/
cp assets/*.js assets/*.css assets/fin-success-logo.png assets/favicon-32.png assets/favicon-192.png assets/favicon.ico _site/assets/
cp assets/favicon.ico _site/favicon.ico
cp data/*.js _site/data/
[ -f data/vira-data.js ] && cp data/vira-data.js _site/data/ || echo "window.VIRA_DATA = null;" > _site/data/vira-data.js
V=${GITHUB_SHA::7}
for f in _site/*.html; do
  sed -i -E "s#(data/[a-z0-9-]+\.js|assets/[a-z0-9-]+\.js|assets/fs\.css)\"#\1?v=$V\"#g" "$f"
done
sed -i "s#__BUILD__#$V#g" _site/*.html
echo "{\"v\":\"$V\"}" > _site/version.json
grep -c "?v=" _site/*.html
```

Ba cơ chế chống cache: (a) mọi `src/href` tới `data/*.js`, `assets/*.js`, `assets/fs.css` được gắn `?v=<sha7>`; (b) `__BUILD__` trong script đầu `<head>` thành `<sha7>`; (c) `version.json` để trang đang mở tự phát hiện bản mới (mục 2.1). Không publish: `scripts/`, `tests/`, `docs/`, `bot/`, `worker/`, `data/raw/`, mọi `data/**/*.json`.

### 6.5. `scripts/build_pdfs.js` — PDF chữ thật cho mọi tab

- Dùng: `node scripts/build_pdfs.js <_site> [cổng=8790]`. Tự mở server HTTP tĩnh trên `_site`; Playwright Chromium (`CHROMIUM_PATH` tuỳ chọn), viewport **1008×1300**, `deviceScaleFactor: 3`; bỏ qua dialog; `CHARTJS_LOCAL` thay Chart.js cdnjs bằng file local khi offline.
- Trang: mọi `*.html` trừ `bh|ck|dn|fin|backend` (hoặc `PDF_PAGES="nganh,index"`).
- Liệt kê trạng thái (`states`): với mỗi `.tabs [data-tab]`, đệ quy bấm lần lượt từng nút của từng nhóm `FSPDF.groups()` (nhóm tab con lồng nhau mở theo nhóm cha).
- In từng trạng thái (`printState`, song song `PDF_CONC=4`): mở trang, chờ 1,2 s, bấm tab (0,8 s), bấm các tab con (0,7 s), lấy `FSPDF.key()` (bỏ nếu trùng), `FSPDF.prep()`, rồi `page.pdf({format:'A4', scale:0.75, printBackground:true, margin {top 5mm, bottom 8mm, left/right 5mm}, displayHeaderFooter:true, footerTemplate: "FinSuccess | <pageNumber>/<totalPages>"` font 8px `#8a90a0` căn phải})`.
- Ghi `_site/pdf/<khoá>.pdf` và `_site/pdf/index.json = {built: 'YYYY-MM-DD' (giờ VN), files: {khoá: {page, label}}}`. Lỗi một trạng thái → `::warning title=PDF lỗi::…`, không dừng.

### 6.6. `scripts/build_auto.py` — lớp nối số tự động (không cần AI)

Chạy trong `fetch-global` sau các fetch. Bản dựng đầy đủ từ Wi MCP (`build_sector_data.py`) là nền; lớp này chỉ **nối phần mới hơn** vào `data/sector-data.json`/`.js`, ghi `data/vn/auto-report.json`:
1. Giá, P/B, P/E, vốn hoá 26 NH từ VNDirect (`data/vn/market.json`): giá mới → vốn hoá, P/B, P/E, P/PPOP **co giãn theo tỷ lệ giá** (giữ cách tính vốn chủ, lợi nhuận của bản Wi MCP); cập nhật `upside` đồng thuận theo giá mục tiêu trung vị.
2. Định giá ngành `secVal`: co giãn mức Wi theo thay đổi tổng vốn hoá / vốn chủ / lợi nhuận suy ra; thay điểm tháng hiện tại hoặc thêm tháng mới.
3. Giá vàng thế giới (COMEX qua Yahoo) nối vào `goldWi`.
4. Tin tức RSS CafeF, VnExpress (giữ 200 tin mới nhất, bỏ trùng URL).
5. Vĩ mô VN từ dulieukinhte.com (`DOM_MAP`): tín dụng YTD (`TỔNG CỘNG`, tháng), giá USD tự do bán ra (ngày), lãi suất huy động 12T Vietcombank (ngày); cán cân thương mại = xuất − nhập (`DOM_CALC`); lãi suất liên ngân hàng bình quân NHNN các kỳ hạn ON/1W/1M/3M/6M/9M từ 2021 (`dom.lnh`); OMO và tín phiếu đang lưu hành theo phiên (`omoOut`, `tpOut`, ghi đè toàn bộ). CPI và M2 của nguồn này khác định nghĩa nên **không** nối.
6. `meta.auto` = thời điểm UTC.

### 6.7. `scripts/build_catalog.py` → `data/catalog.js` → trang Database

`build_catalog.py` tự đọc từng file dữ liệu để lấy danh sách chuỗi, kỳ đầu – kỳ cuối, số điểm và **tần suất suy từ trung vị khoảng cách 60 điểm cuối** (≤1,6 ngày = Ngày; ≤8 = Tuần; ≤35 = Tháng; ≤100 = Quý; còn lại Năm). Kết quả `window.CATALOG = {built, n, groups, methods, pipes, upd}` (hiện 498 chuỗi, 13 nhóm):

- `groups[]`: `{id, name, page (dùng ở đâu), file, src, upd (mô tả lịch), updKey, method, series:[{k (mã), n (tên), src, from, to, c (số điểm), f (tần suất), hist?}]}`. Các nhóm: `global` (Mỹ, Eurozone, Nhật, Trung Quốc), `fedwatch`, `ois`, `fx`, `vira`, `eco`, `dom`, `hm`, `cmd`, `bond`, `sector`, `reg`, `banks`.
- `updKey` ∈ `auto` ("Tự động hằng ngày: 06:17 (mọi ngày) và 16:47 (ngày làm việc) — GitHub Actions fetch-global"), `vira` ("17:47 các ngày làm việc"), `sbv` ("09:23 hằng ngày… lưu dồn"), `wi` ("Bán tự động: AI gọi Wi MCP trong phiên làm việc, lưu kết quả gốc rồi chạy script build"), `wi_auto` (nền Wi, nối tự động bởi build_auto), `manual` ("Biên tập tay khi có sự kiện/văn bản mới (có link nguồn từng dòng)").
- `pipes[]` `{n, when, what, out}`: fetch-global, fetch-sbv, fetch-vira, pages, "Wi MCP (trong phiên AI)".
- `methods[]` `{n, where, f}`: công thức các chỉ số tự tính (IDX-FX/IDX-LIQ z-score 36 tháng, kiểm định khung kịch bản, truyền dẫn dầu/heo hơi → CPI, chênh vàng SJC − thế giới (× 1,20565 ounce/lượng), mức rủi ro, COF theo cơ cấu nguồn vốn, mô phỏng TT 21 và room, P/B tại giá mục tiêu, thu nhập dịch vụ theo mảng, chu kỳ ngành, Taylor rule V1/V2).

**`backend.html` + `assets/backend.js`** (trang "Database · Dữ liệu và phương pháp", chỉ developer view): `h2.sec` + `.sec-sub` (ghi lần dựng gần nhất); 4 KPI `.kpis.k4` — Số chuỗi dữ liệu (n nhóm), Cập nhật tự động (chuỗi thuộc nhóm `auto|vira|sbv`, "GitHub Actions, không cần AI"), Qua Wi MCP (phần còn lại), Chuỗi đang trễ; card **Quy trình cập nhật** (bảng pipes); card **Danh mục chuỗi dữ liệu** với ô tìm (tên, mã, nguồn), chọn nhóm, chọn tần suất, tích "Chỉ chuỗi đang trễ"; mỗi nhóm là `<details class="morex">` chứa `dl.bemeta` (Dùng ở, Nguồn, Cập nhật, File, Phương pháp) và bảng `table.betab` (Chuỗi, Mã, Nguồn, Tần suất, Từ, Mới nhất, Số điểm, Trạng thái); card **Phương pháp các chỉ số tự tính**. Trạng thái "Trễ" khi kỳ mới nhất cũ hơn: Ngày > 10, Tuần > 21, Tháng > 95, Quý > 200, Năm > 450 ngày (chuỗi tháng ghi ngày 01 được đẩy về cuối tháng); pill `rs-bad` "Trễ N ngày" / `rs-on` "Mới" / "Lịch sử" (chuỗi chỉ dùng nối phần trước).

### 6.8. Luồng Wi MCP (dữ liệu trong nước, BCTC ngân hàng)

WiData chỉ truy cập được qua connector trong phiên Claude (không có API key), nên **không chép tay số**:
1. Trong phiên Claude, gọi các truy vấn Wi theo bảng ở `docs/cap-nhat-du-lieu.md` mục 2 (cửa sổ ngắn: ngày `from` = 10 ngày trước; tháng = 4 tháng trước; Wi nén khoảng > 3 tháng thành tuần, > 1 năm thành tháng; tối đa 1.000 điểm/chỉ tiêu; aggregate cắt ở 200 nhóm → lọc theo năm).
2. `python3 scripts/wi_capture_transcript.py <transcript.jsonl>` (file mới nhất trong `~/.claude/projects/*/`): ghép từng `tool_use` tên `mcp__WiMCP__*` với `tool_result` của nó, lấy object JSON đầu tiên (`raw_decode` — Wi đôi khi nối ghi chú sau JSON), bỏ lời gọi `get_schema` và `wi_data_search` (hướng dẫn nội bộ, không phải số), **bỏ thông tin cá nhân** (`PII_KEYS = {'contacts'}`: CCCD, địa chỉ, điện thoại trong `co_leaders`; ở bảng `cot/dong` bỏ cả cột), ghi `data/raw/wi/<tool>_<endpoint|indicator_id|symbol|action>_<sha1[:8]>.json` = `{tool, request, response}` (ghi đè idempotent). Kết quả quá lớn bị lưu ra file tool-results thì ghi tay thành `…_zz_<YYYYMMDD>.json` cùng cấu trúc.
3. Build: `python3 scripts/build_sector_data.py && for t in CTG VCB BID TCB MBB ACB; do python3 scripts/build_ctg_data.py --ticker $t; done && python3 scripts/build_big3.py && python3 scripts/build_bond_data.py && python3 scripts/build_bot_context.py`. Build script **gộp mọi file cùng loại** trong raw (kỳ trùng lấy file sau) nên chỉ cần kéo phần mới, không xoá file cũ.
4. Test: `python3 tests/test_sector_data.py` (+ `tests/test_ctg_data.py`).
5. Commit repo chính ("Cập nhật dữ liệu dd/mm/yyyy"), push, dispatch `pages.yml`; commit + push riêng repo raw.

### 6.9. Tests

`tests/test_ctg_data.py` (đọc `data/ctg-data.json`):

| Test | Kiểm |
|---|---|
| `test_balance_sheet_adds_up` | Tổng các khoản tài sản chính ≤ tổng tài sản; nợ + VCSH khớp tổng tài sản sai < 0,1% từng quý |
| `test_quarters_sum_to_annual` | 4 quý cộng lại = năm (LNTT `pbt`, TOI) sai < 1 tỷ |
| `test_plan_ytd` | LNTT luỹ kế = tổng các quý năm kế hoạch; % hoàn thành KH khớp |
| `test_snapshot_ratios_match_quarter` | NIM, LLR, NPL ở `meta` = quý mới nhất |
| `test_consensus_excludes_stale` | Trung vị giá mục tiêu chỉ tính báo cáo không cũ; báo cáo không cũ có ngày ≥ `fadeBefore` |
| `test_npl_formation_formula` | Hình thành nợ xấu = ΔNPL + nợ xử lý (−dự phòng kỳ trước − trích lập + dự phòng kỳ này) |
| `test_no_personal_data_in_build` | Không có "CMND", "CCCD", "Cư trú", "Điện thoại" |

`tests/test_sector_data.py` (đọc `data/sector-data.json`, `quick-updates.json`, `sbv-log.json`): IDX = trung bình các thành phần; góc phần tư khớp dấu FX/LIQ; số đếm backtest hit+miss+flat và tỷ lệ; trung vị đồng thuận, upside theo giá, mỗi CTCK một báo cáo; độ nhạy LDR (ldr0 > ldr20 > ldr50); `secVal.now` = điểm tháng cuối và P/B 0,5–4, P/E 3–30; không `NaN`/`Infinity`; nhật ký NHNN ≥ 40 dòng, sắp giảm dần theo ngày, công cụ/hướng hợp lệ, có URL `http…` + nguồn + tác động, **không chứa "widata"**, lãi suất tái cấp vốn hiện hành bắt đầu "4,5%"; cập nhật nhanh hợp lệ (id duy nhất, tác giả AI/Chuyên viên có tên, `follows` tồn tại, trạng thái ∈ {mới, nóng lên, tiếp diễn, hạ nhiệt}, mỗi mục có chart, mã chart tồn tại, không "widata"); CAMELS TT21 (trọng số tiêu chí cộng 100, trọng số chỉ tiêu theo NH lớn/nhỏ cộng 100, ≥ 25 NH, NPL CTG Q2/2026 ≈ 1,20%, điểm 1–5 và lo ≤ pt ≤ hi). Test có số định giá chốt cứng: khi số mới làm sai, cập nhật số trong test, **không sửa logic**.

### 6.10. Script tiện ích khác

| Script | Việc |
|---|---|
| `scripts/add_update.py <file.json>` (hoặc stdin) | Đăng một bản Cập nhật nhanh: bỏ chữ dẫn trước `{`, bỏ `_draft`; kiểm `id` chưa có, tác giả `AI`/`Chuyên viên` có tên, `follows` trỏ bản có thật, trạng thái hợp lệ, mã chart có trong `chart_ids()`, không chứa "widata"; chèn lên đầu `data/quick-updates.json` (không sửa bản cũ). Sau đó chạy `build_sector_data.py`. |
| `scripts/chart_ids.py` | Liệt kê mã chart → tiêu đề, đọc từ `assets/sector.js`: mẫu `card({ id: '…', title: '…'`, mảng `SAFE` (id `fxS_<mã>` "… theo ngày so với DXY"), và `mk('ch…'` (tiêu đề động). Dùng trong Chart book và để kiểm `quick-updates.json`. |
| `scripts/add_note.py` | Mục 5.4. |
| `scripts/build_bot_context.py`, `build_artifact.py` | Mục 5.5. |
| `scripts/build_calendar.py`, `fetch_calendar.py` | Mục 5.7. |

### 6.11. Tài liệu quy trình trong `docs/`

- **`cap-nhat-du-lieu.md`** — kịch bản cho tác vụ 17:20: (0) clone repo chính + repo raw private vào `data/raw` (thiếu repo raw thì dừng và báo); (1) dispatch `fetch-global` và `fetch-vira` bằng `gh api … /dispatches -f ref=main`, chờ xong rồi `git pull --rebase`; (2) bảng truy vấn Wi (vĩ mô ngày, vĩ mô tháng, hàng hoá, định giá ngành theo phiên `sector_ratio_daily sector_id=405`, định giá từng mã `ratio_daily`), mùa BCTC (tháng 1, 4, 7, 10) kéo lại `fs_bank`, `fs_bank_notes`, `ratio_bank`, `ratio_bank_ttm`, `ratio_common_ttm`, `bank_car_tt41`; riêng CTG thêm nợ xử lý bằng dự phòng (`document_miner`, `ctg_writeoff.json`) và phân khúc từ "Điểm tin BCTC" (`ctg_ir_segments.json`); trái phiếu (`build_bond_data.py`), điều chỉnh P/B theo sự kiện quyền; (3) build + test, xem nhanh bằng Playwright; (4) push 2 repo; (5) báo lại số mới đáng chú ý và mục không cập nhật được. Không ghi "WiData" ở bất cứ nội dung hiển thị nào.
- **`cap-nhat-nhanh.md`** — tab Cập nhật nhanh / Nhật ký chuyên viên: ai viết (AI/Chuyên viên), chuyên viên sửa trên trang → "Sao chép để đăng" → `add_update.py`; rà soát chữ bắt buộc; thứ tự phạm vi ngành → trong nước → quốc tế; chọn chart từ `chart_ids.py`; cấu trúc JSON một bản (`id, date, author, follows, vsPrev, headline, summary[], kpis[{l,v,s,cls}], concerns[{title, scope nganh|noi|qt, status, note, change, charts[{id,last,caption}]}], watch[{d,t,why}], sources[]`); và phần `data/notes.json`.
- **`tro-ly-ai.md`** — mục 5.5.

---

## 7. Quy ước nội dung và trình bày

### 7.1. Ghi nguồn

- Dòng `.src` cuối card luôn bắt đầu `Nguồn: ` và **xuống dòng riêng**, chữ xám nhỏ (11px `#9aa3b2`).
- **Số lấy qua Wi MCP ghi "Wi MCP"** (có thể kèm mã chỉ tiêu, vd "Wi MCP 82223, 82226"); số lấy từ nguồn ngoài ghi **đúng tên nguồn ngoài**: Ngân hàng Nhà nước / NHNN, Cục Thống kê, Bộ Tài chính, VIRA Market Watch (vira.org.vn), Vietcombank, VNDirect, dulieukinhte.com (dẫn NHNN), Fed/FRED (kèm mã FRED, vd "FRED CPIAUCSL"), NY Fed, BLS, BEA, U.S. Treasury, ECB, BOJ, MOF Nhật, NBS, IMF IFS, CME FedWatch ("ước tính theo phương pháp CME FedWatch" vì số tự tính từ giá ZQ), Forex Factory, BCTC ngân hàng.
- **Chữ "WiData" không bao giờ xuất hiện trong nội dung hiển thị** — test `test_sbv_log_has_sources`, `test_quick_updates_valid` và `add_update.py` đều chặn; ảnh chia sẻ đổi mọi cụm `WiData…`/`Wi MCP <mã bảng>` thành `Wi MCP` (`share.js:55`). `build_bot_context.py` ghi nguồn theo cơ quan công bố gốc.
- Số tự tính ghi công thức ở chân trang/tab Sources/trang Database (chi phí tín dụng, hình thành nợ xấu, NIM sau dự phòng, LLR gồm lãi dự thu, P/B forward…).

### 7.2. Định dạng số kiểu Việt Nam

Hàm chuẩn (giống nhau ở `app.js:11-16`, `sector.js:21-27`, `fxchart.js`):
```js
const nf  = (v, d = 0) => v == null || isNaN(v) ? '—' : Number(v).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });
const pc  = (v, d = 1) => v == null ? '—' : nf(v, d) + '%';                       // 12,3%
const sg  = (v, d = 1, u = '%') => v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + nf(Math.abs(v), d) + u;   // +1,2% / −0,8% (dấu trừ U+2212)
const x   = (v, d = 2) => v == null ? '—' : nf(v, d) + 'x';                       // 1,45x
const dvn = s => s ? s.slice(0, 10).split('-').reverse().join('/') : '—';         // 2026-10-23 → 23/10/2026
const mvn = s => s ? s.slice(5, 7) + '/' + s.slice(0, 4) : '—';                   // 10/2026
```
- Dấu thập phân **phẩy**, phân tách nghìn **chấm** (vi-VN): `25.300`, `1,20%`. Thiếu số hiển thị `—`.
- Ngày `dd/mm/yyyy`, tháng `mm/yyyy`, quý `Qn/yyyy` (cũng là định dạng nhãn trục để chartkit nhận diện thời gian). Dữ liệu nội bộ lưu ISO `yyyy-mm-dd`; chuỗi tháng lưu ngày 01.
- Kỳ hạn trái phiếu/lãi suất viết `2Y/5Y/10Y/30Y`, `ON/1W/1M/3M/6M/9M/12T`.
- Đơn vị: tiền tỷ đồng (`tỷ`), số lớn đổi sang `nghìn tỷ` để bớt số 0 (`nf(v/1000,1) + ' nghìn tỷ'`); tỷ giá VND; lãi suất `%/năm`; chênh lệch `bps`/`điểm %`; bội số `x`; ngoại tệ `triệu USD`. Dataset Chart.js mang `unit` (vd `'%'`, `' bps'`) và `dp` để tooltip tự định dạng.

### 7.3. Lời đọc dưới chart (insight) và nội dung hiển thị

- **Mỗi chart có `.insight`** do AI viết từ đúng số đang hiển thị (renderer có hàm sinh insight từ dữ liệu: `nimPeerIns()`… ở `app.js`, khối `INS[id]` ở `sector.js:167`); số quan trọng in đậm `<b>` (màu navy). Dùng "Nhận định:" / "Hàm ý:" khi diễn giải, không dùng "Cách đọc:" hay từ lóng.
- **Không đưa chuyện hậu trường** vào nội dung hiển thị: không "thêm mục mới", "dữ liệu vừa đưa vào", "theo góp ý chuyên viên", "sửa bản trước" — chỉ nói diễn biến thị trường, số liệu, quan điểm (`docs/cap-nhat-nhanh.md` bước 5).
- Phân vai: **số liệu** = nguồn (Wi MCP/ngoài); **lời đọc, trạng thái trụ luận điểm, dấu ± sự kiện** = AI viết theo quy tắc; **quan điểm FinSuccess** = chỉ phần chuyên viên nhập (tab 💎 FinSuccess, Nhận định FinSuccess, Quyết định hiện tại) — AI viết tiếp, không viết đè, và phải nêu lý do bằng số nếu khác quan điểm hiện hành.
- Văn bản chuyên viên trước khi đăng luôn được rà chính tả, Việt hoá thuật ngữ và giữ thuật ngữ gốc trong ngoặc ở lần đầu (viết tắt chuẩn ngành giữ nguyên: NIM, CASA, LDR, OMO, CIR, NPL…).
- Ảnh chia sẻ và PDF luôn có dòng **"Tổng hợp có sự hỗ trợ của AI"**.

### 7.4. Chỉ số TTM và kỳ dữ liệu

- ROE, ROA, chi phí tín dụng, tỷ lệ sinh lời dùng **TTM (4 quý gần nhất)**, không quy năm số một quý (mùa vụ); chuỗi Wi dùng endpoint `ratio_bank_ttm`, `ratio_common_ttm`. Hình thành nợ xấu đọc theo tổng 4 quý (`app.js:126`).
- P/E hiển thị `P/E TTM`; P/B forward dùng BVPS năm dự phóng.
- Mọi chuỗi giữ **tối thiểu 5 năm (từ 2021)**; trang ngân hàng có trang riêng giữ toàn bộ lịch sử (CTG: BCTC quý từ Q1/2010). Tab Tài chính trang ngân hàng mở sẵn khung 5Y.
- Dự phóng CTCK cũ hơn 3 tháng được làm mờ (`tr.stale`, test `consensus_excludes_stale`); KH ĐHĐCĐ luôn đậm.

### 7.5. Bảng màu

Có **hai họ navy** song song — giữ đúng như vậy khi dựng lại:

| Bối cảnh | Navy | Ghi chú |
|---|---|---|
| CSS giao diện (`--navy`), ảnh chia sẻ (`share.js FIN`), tblshot, fxchart, palette chart ngành `PAL`/`PAL2` | `#1D2678` | xanh tím thương hiệu |
| Dataset chart trong `app.js`/`sector.js` (`C.navy`, `C.steps[0]`) | `#002060` | navy đậm kiểu Excel |

Hằng màu chart trong renderer:
```js
// app.js:7-8 (trang ngân hàng)
const C = { navy:'#002060', blue:'#97BAFF', teal:'#59C5C8', purple:'#861C52', gold:'#FFD45D', red:'#c0392b', grey:'#9aa3b2',
  steps:['#002060','#3D5C99','#5576B8','#6171C5','#8997D6','#B3BDE8','#D9DEF4'] };
// sector.js:9-12 (ngành/vĩ mô): như trên nhưng gold:'#d9a400' và thêm tealInk:'#1f8a8d'
const GC = { 'Big 4':'#002060', 'Tư nhân lớn':'#1f8a8d', 'Tư nhân vừa':'#861C52', 'Tư nhân nhỏ':'#9aa3b2' };   // màu nhóm NH (trang ngành)
const PEER_COL = { 'Big 4':'#002060', 'Tư nhân lớn':'#97BAFF', 'Tư nhân vừa':'#8997D6', 'Tư nhân nhỏ':'#B3BDE8' }; // app.js:859
const PAL  = ['#1D2678','#c0392b','#1f8a8d','#d9a400','#861C52','#4f9bd1','#7a8291'];                         // sector.js:1041 — nhiều đường
const PAL2 = ['#1D2678','#c0392b','#1f8a8d','#d9a400','#861C52','#4f9bd1','#7cc49b','#ef9f76','#8997D6','#5b3a8c','#b5651d','#2e8b57','#e377c2','#6b6b00','#17becf','#9aa3b2'];
const FEE_COL = { pay:'#002060', ins:'#59C5C8', trust:'#861C52', sec:'#9a7400', adv:'#97BAFF', cash:'#9aa3b2', oth:'#FFD45D' };   // thu phí theo mảng
const CYC_COL = { e:'rgba(31,138,141,.10)', r:'rgba(41,56,168,.07)', t:'rgba(192,57,43,.09)', x:'rgba(217,164,0,.11)' };          // nền chu kỳ ngành: nới lỏng/phục hồi/thắt chặt/xử lý nợ
```
Quy ước ý nghĩa: đỏ `#c0392b` = xấu/giảm/thị giá/trần; xanh `#1e8f5a` = tốt/tăng; teal = 52W High, mốc tích cực; đỏ mận `#861C52` = mốc sự kiện, nhận định; vàng = 100% kế hoạch, cảnh báo; xám `#9aa3b2` = đường 0/tham chiếu trung tính, chuỗi phụ. Lưới trục `#eef0f4`, chữ trục `#3f4656`.

---

## 8. Checklist dựng lại phần nền tảng

1. Tạo repo với cây thư mục mục 1.1, `.nojekyll`, `.gitignore` (bỏ `data/raw/`, `__pycache__/`, `*.pyc`, `.DS_Store`). Bật GitHub Pages nguồn = GitHub Actions.
2. Chép nguyên `assets/fs.css`, `chartkit.js`, `share.js`, `tblshot.js`, `notes.js`, `devview.js` (đổi `PASS_SHA256`), `chat-config.js` (`url:''`), `chat.js`, `calendar.js`, `fxchart.js`, logo + 3 favicon.
3. Mỗi trang dùng khung HTML mục 2 (script version-check đầu tiên, favicon, fs.css, devview, speculationrules; logo-bar + site-nav đầy đủ; stock-head; tabs sticky; panes; footer; script theo đúng thứ tự mục 2.3).
4. Trong renderer: Chart.defaults + `refLines` + `mk()` gọi `FSK.prep`/`FSK.enhance`; `card()` đúng cấu trúc mục 3.4; `nf/pc/sg/x/dvn` vi-VN; `setMode('compact')` + `decorate()` + popup `.tip`; khai báo `window.FSSHARE = {prep, path}`; mọi `.subtabs` nằm trong `.pane` để `FSPDF.key()` và `build_pdfs.js` duyệt được.
5. Thêm `scripts/gom_site.sh`, `build_pdfs.js`, `pages.yml` (2 job), các workflow dữ liệu với cron mục 6.2 và bước `gh workflow run pages.yml`.
6. `build_catalog.py` chạy cuối mỗi lượt dữ liệu; `backend.html` đọc `data/catalog.js`.
7. Kiểm: mở trang local (version-check tự bỏ qua vì còn `__BUILD__`), thử 1M…Tất cả, kéo zoom, kéo trục Y, Ẩn tất cả, Chia sẻ ảnh, PDF bản đang xem, User/Developer view; push → xem `version.json`, `?v=` trong HTML và `pdf/index.json` trên web.
