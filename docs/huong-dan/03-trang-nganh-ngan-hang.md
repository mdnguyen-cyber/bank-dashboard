# 3 · Trang Ngành Ngân hàng · CSTT

Phần này mô tả trang `nganh.html` đủ chi tiết để dựng lại gần như y hệt. Các mã dòng (`file:dòng`) lấy theo bản repo ngày 28/10/2026. Trang dùng chung renderer `assets/sector.js` với `vimo.html`. Phần chỉ hiện ở `vimo.html` (Bản đồ nhiệt, Hàng hoá, Kinh tế Việt Nam, Quốc tế, Trái phiếu, Kịch bản IDX…) do phần tài liệu khác mô tả; ở đây chỉ ghi chúng ở mức "được dựng ẩn để dùng lại".

---

## 1. Khung trang

### 1.1 HTML (`nganh.html`, 60 dòng)

Thứ tự trong `<head>`:
1. Script kiểm tra phiên bản: `var V='__BUILD__'`. Khi deploy, `scripts/gom_site.sh` thay chuỗi này bằng mã build. Script tải `version.json?t=…` với `cache:'no-store'`; nếu `j.v !== V` thì `location.replace` sang URL có thêm `?_v=<mã>`. Ở bản chưa thay chuỗi (chạy local) thì bỏ qua.
2. `meta charset`, `viewport`, `<title>Ngành Ngân hàng · CSTT · FinSuccess</title>`, favicon 32/192 và apple-touch-icon (`assets/favicon-*.png`).
3. `assets/fs.css`.
4. `assets/devview.js`: chế độ Người xem / Developer. Developer cần mật khẩu, so bằng SHA-256, lưu ở `localStorage.fsDevView='1'`. Ở chế độ Người xem, mọi phần tử `.devonly` bị ẩn, ví dụ ô chọn BH·CK.
5. `<script type="speculationrules">`: prerender mọi link `*.html` (eagerness `moderate`), trừ link `[download]` và `[target=_blank]`; prefetch `vimo.html`, `nganh.html` (eagerness `eager`).

`<body data-page="nganh">`. Thuộc tính này quyết định nhánh của `sector.js` (`PAGE`, `sector.js:7`).

Khung thân trang:

| Khối | Nội dung |
|---|---|
| `.logo-bar > .wrap` | trái: logo `assets/fin-success-logo.png` + `nav.site-nav` gồm các link `Vĩ mô` (vimo.html), `Ngành Ngân hàng` (class `on`), ô chọn `label.bank-pick` "Ngân hàng" (select `onchange=location.href=value`: VCB→vcb.html, BID→bid.html, CTG→index.html, TCB, MBB, ACB; 20 mã còn lại `disabled` "· sắp có", theo thứ tự VPB HDB LPB SHB STB VIB TPB MSB SSB OCB EIB NAB ABB KLB VAB BVB BAB PGB SGB NVB), link `Ngành Bảo hiểm` (bh.html), `Ngành Chứng khoán` (ck.html), ô chọn `label.bank-pick.devonly` "BH · CK" (optgroup Bảo hiểm: dn.html?s=BVH/PVI/MIG/BMI/BIC/PTI; Chứng khoán: SSI TCX VCK VPX HCM VCI MBS VND SHS), link `Database` (backend.html); phải: `div.stamp#stamp` |
| `.stock-head > .wrap#stockHead` | header ngành, do JS vẽ (mục 1.3) |
| `nav.tabs[role=tablist] > .wrap#tabbar` | 9 nút `button[role=tab][data-tab]` |
| `main > .wrap` | 9 `section.pane[role=tabpanel]` (id = data-tab); `#overview` có class `active` |
| `footer > .wrap#foot` | do JS vẽ |

**Thứ tự nút tab** (nhãn hiển thị), khác thứ tự các section trong DOM (section `#quick` đứng thứ hai trong DOM):

| # | data-tab | Nhãn |
|---|---|---|
| 1 | `overview` | 1. Tổng quan ngành |
| 2 | `picture` | 2. Bức tranh ngành |
| 3 | `policy` | 3. Chính sách · Quy định |
| 4 | `catalyst` | 4. Catalyst · Risk |
| 5 | `quick` | 5. Nhật ký chuyên viên (README và docs gọi là "Cập nhật nhanh") |
| 6 | `cons` | 6. Consensus CTCK |
| 7 | `hot` | 7. Chủ đề nóng |
| 8 | `book` | 8. Chart book |
| 9 | `src` | 9. Sources |

**Thứ tự script cuối `<body>`** (thứ tự này là bắt buộc, vì `sector.js` đọc các biến global lúc nạp):
```
https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js
assets/chat-config.js      (cấu hình khung chat Trợ lý AI)
assets/chartkit.js         (window.FSK, nút lên đầu trang, nút Trợ lý AI, FSPDF)
assets/share.js            (hộp chia sẻ ảnh chart; đọc window.FSSHARE)
data/global-data.js        window.GLOBAL_DATA
data/fx-daily.js           window.FX_DAILY
assets/fxchart.js          window.FSFX (chart hành lang tỷ giá dùng chung)
data/vira-data.js          window.VIRA_DATA
data/sector-data.js        window.SECTOR_DATA   ← dữ liệu chính
data/eco-data.js           window.ECO_DATA
data/bond-data.js          window.BOND_DATA
data/notes-data.js         window.FS_NOTES (nhận định đã đăng)
assets/notes.js            window.FSN, window.vcCheck
assets/sector.js           renderer
assets/chat.js             khung chat
```
Trang ngành không nạp `cmd-data.js`, `hm-hist.js`, `vimo-risk.js`. Các đoạn code cần đến chúng đều có kiểm tra `window.CMD_DATA &&…`.

### 1.2 Khởi động `sector.js` (cuối file, `sector.js:3758–3849`)

- `builders` cho trang ngành (`sector.js:3762`): `{ overview: paneOverview, quick: paneQuick, picture: panePicture, policy: panePolicy, catalyst: paneCatalyst, cons: paneCons, hot: paneHot, book: paneBook, src: paneSrc }`.
- `show(k)` (`:3764`) bật class `active` cho nút tab và pane tương ứng. Pane chỉ được dựng khi mở lần đầu (`built[k]`, dựng lười), sau đó `history.replaceState(null,'','#'+k)`. Nếu `k` không có trong `builders` thì mở tab đầu tiên.
- Bấm nút tab thì gọi `show` rồi `scrollTo(0)`.
- Chế độ hiển thị: `setMode('compact')` luôn chạy (`mode0 = 'compact'`, `:3825`). Trang ngành không có nút `#modeSw`, nên trên thực tế **luôn ở chế độ Gọn** (README vẫn nhắc công tắc Gọn/Chi tiết). Key `fs-bank-ui` được ghi nhưng không được đọc lại.
- `header(); footer();`, rồi định tuyến theo hash (`:3829`):
  - `#tab~chartId` → `goChart(tab, chartId)`;
  - `#dom` / `#bank` / `#peer` / `#camel` (tab con của Bức tranh) → `openP`;
  - `#<tab>` → `show`.
- `decorate()`: thêm nút **(i)** và thanh **ⓘ Insight / ⓘ Nguồn** cho mọi thẻ (mục 3.10). Một `MutationObserver` trên `main` gọi lại hàm này mỗi khi DOM đổi.
- `history.scrollRestoration='manual'`, `scrollTo(0,0)` cả lúc nạp và sau `load`.
- Biến global xuất ra: `window.FSNAV = { show, openP, openC, reveal(lk) }` (cho lịch kinh tế) và `window.FSSHARE = { prep: buildAll, path(card) }` (cho `share.js`: dựng mọi tab ẩn và trả về đường dẫn "Tab › Tab con › Nước" của một thẻ).
- Footer: `FinSuccess · Dashboard CSTT & ngành Ngân hàng · dữ liệu cập nhật dd/mm/yyyy. Không phải khuyến nghị đầu tư.`

### 1.3 Header ngành (`header()`, `sector.js:204`)

`#stockHead` gồm:
- `.tick` = `NGÀNH`;
- `.cname` = "Ngân hàng Việt Nam · Chính sách tiền tệ" + `<small>` "{26} NH niêm yết · BCTC mới nhất {D.latest.quarter} · giá {dd/mm/yyyy priceDate}";
- `.hstats`, 4 ô `.hstat`: **P/B ngành** `SV.now.pb` (định dạng `1,43x`), **P/E ngành** `SV.now.pe`, **Vốn hóa** `SV.now.mcap` + " nghìn tỷ", **Kịch bản (IDX)** = `SCN[I.now.q].t`;
- `.view-chip`: lấy quan điểm ngành từ `localStorage['fs-bank-sector'].view.stance`, in HOA, kèm `<small>QUAN ĐIỂM NGÀNH</small>`; khi chưa có thì class `none` và chữ `CHƯA NHẬP`. Lưu ý: chip chỉ đọc bản lưu trên máy (ghi khi bấm Lưu ở ô Nhận định FinSuccess), không đọc `FS_NOTES` đã đăng.

`#stamp` = "Cập nhật dữ liệu dd/mm/yyyy" (`D.meta.updated`).

Kịch bản `SCN` (`sector.js:13`):

| key | t | fx | liq | rate | bank |
|---|---|---|---|---|---|
| `ease` | Nới lỏng mạnh | thấp | dồi dào | Lãi suất giảm nhanh | NIM mở rộng, định giá lại tăng |
| `drain` | NHNN hút tiền về | cao | dồi dào | Liên ngân hàng tăng | Tăng trưởng chậm lại |
| `room` | Dư địa bơm tiền | thấp | thiếu | Huy động gần đỉnh | Theo dõi tín hiệu nới sớm |
| `tight` | Thắt chặt kéo dài | cao | thiếu | Lãi suất cao kéo dài | COF tăng, nợ xấu tăng |

---

## 2. Hằng số, định dạng và hạ tầng chart dùng chung

### 2.1 Màu (`sector.js:9–12`)

```
C = { navy:'#002060', blue:'#97BAFF', teal:'#59C5C8', tealInk:'#1f8a8d', purple:'#861C52', gold:'#d9a400',
      red:'#c0392b', grey:'#9aa3b2', steps:['#002060','#3D5C99','#5576B8','#6171C5','#8997D6','#B3BDE8','#D9DEF4'] }
GC (màu nhóm) = { 'Big 4': '#002060', 'Tư nhân lớn': '#1f8a8d', 'Tư nhân vừa': '#861C52', 'Tư nhân nhỏ': '#9aa3b2' }
GROUPS = ['Big 4','Tư nhân lớn','Tư nhân vừa','Tư nhân nhỏ']
```
CSS `:root` (`fs.css:2–5`): `--navy:#1D2678 --blue:#2938A8 --teal:#59C5C8 --teal-ink:#1f8a8d --purple:#861C52 --gold:#FFD45D --gold-ink:#9a7400 --ink:#303540 --ink2:#596272 --muted:#8a93a3 --line:#d9dde4 --line2:#e9ecf2 --bg:#F7F9FD --card:#fff --soft:#F0F4FF --pos:#1e8f5a --neg:#c0392b --warn:#b7791f --radius:16px`. Chữ: `14px/1.5 Arial`; `.wrap` rộng tối đa 1440px, lề 24px (16px khi màn hình nhỏ).
Lưu ý: navy trong JS (`#002060`) khác navy trong CSS (`#1D2678`). Chart dùng `#002060`; chữ, nút và một số chart (CAMELS, `fxchart.js`) dùng `#1D2678`.

Phân nhóm 26 ngân hàng (`build_sector_data.py:21–26`):
- Big 4: VCB, BID, CTG (Agribank không niêm yết);
- Tư nhân lớn: MBB, TCB, ACB, VPB, HDB, LPB;
- Tư nhân vừa: SHB, STB, VIB, TPB, MSB, SSB, OCB, EIB;
- Tư nhân nhỏ: NAB, ABB, KLB, VAB, BVB, BAB, PGB, SGB, NVB.

### 2.2 Hàm định dạng (`sector.js:21–35`)

Mọi số dùng locale `vi-VN` (nghìn bằng `.`, thập phân bằng `,`).
- `nf(v,d)`: số, trả `—` khi null hoặc NaN.
- `pc(v,d=1)`: thêm `%`.
- `sg(v,d,u='%')`: có dấu, dùng **dấu trừ Unicode `−`**.
- `x(v,d=2)`: thêm `x`.
- `dvn('2026-10-27')` → `27/10/2026`; `mvn` → `10/2026`.
- `esc` để chống chèn HTML.
- `med` = trung vị.
- `byM`, `monthsFrom`, `al` (căn chuỗi `{d,v}` theo nhãn tháng), `yoyAt`.
- `how(t)` → `<br><span class="howto"><b>Hàm ý:</b> …</span>`. Mọi insight tự tính kết thúc bằng đoạn "Hàm ý" này.

### 2.3 Mặc định Chart.js (`sector.js:45–56`)

- Font `Arial, "Helvetica Neue", sans-serif`, cỡ 11.5, màu `#3f4656`.
- Legend ở dưới, `boxWidth 12`; `maintainAspectRatio:false`; `animation:false`.
- Tooltip mặc định: `"{label}: {nf(v, ds.dp ?? 1)}{ds.unit}"`; dataset có `$tip(i)` thì dùng hàm đó thay.

Plugin đăng ký toàn cục:
- `refLines` (`:57`): vẽ đường tham chiếu ngang hoặc dọc nét đứt. Mặc định màu `C.red`, rộng 1.5, `dash [5,4]`. Nhãn dạng pill nền trắng 90%, chữ `600 11px Arial`; các nhãn ngang được dời để không đè nhau (cách nhau 15px). Khai báo qua `options.plugins.refLines.lines = [{value, label, color, axis, dash, width}]`. Với đường dọc có nhãn, `mk()` tự chừa `padding.top ≥ 18`.
- `quadBg` (`:78`): nền 4 ô kịch bản cho ma trận IDX: `#e3f5ec` (Nới lỏng mạnh), `#fff4d6` (NHNN hút tiền về), `#eef1fb` (Dư địa bơm tiền), `#fde8e6` (Thắt chặt kéo dài), cùng vạch ±1 màu `#c3c9d6`.

Plugin cục bộ: `cycBand` (nền giai đoạn chu kỳ), `markPlug` (vạch mốc sự kiện tím `#861C52` dash [4,3], chỉ dùng ở Nhật ký chuyên viên), `dashBar` (viền nét đứt cho cột LDR thô), nhãn tên mã trên scatter (`lbl`, `cmLbl`), nhãn cuối đường (`pbhEnd`).

### 2.4 `mk(id, cfg, opt)`: hàm vẽ trung tâm (`sector.js:139`)

1. Huỷ chart cũ trên canvas.
2. Đặt `interaction = {mode:'index', intersect:false, axis: x|y}` nếu cfg chưa có.
3. Chừa padding cho nhãn refLine dọc.
4. Gọi `FSK.prep(cfg)`: chart kết hợp cột và đường thì dataset đường có `order 0`, cột có `order 10`, để đường luôn nằm trên cột.
5. Nếu id không bắt đầu bằng `cb-` (Chart book) hay `qu-` (Nhật ký) thì lưu **bản sao sâu** cấu hình vào `SPEC[id] = {cfg, el}`. Chart book và Nhật ký chuyên viên vẽ lại từ `SPEC` này.
6. `new Chart`, rồi `FSK.enhance(chart, {today, last, win})`.
7. `opt.switch` (`'line'`|`'bar'`): vẽ nút **Cột / Đường** vào `<span class="ctl" data-ctl="{id}">` trên tiêu đề (thẻ cần `ctl:true`). Dataset có `keep:true` thì giữ nguyên kiểu khi chuyển.

Các helper khác:
- `L(label, data, color, o)`: tạo dataset đường mặc định (`borderWidth 2`, `pointRadius 0`, `dp 2`, `unit '%'`, `spanGaps true`).
- `pctAxis(title, extra)`: trục có tick `x,x%`, lưới `#eef0f4`.
- `numAxis(title, extra)`: tick số nguyên.

### 2.5 `FSK.enhance` (`assets/chartkit.js:101`): công cụ trên mọi chart chuỗi thời gian

Chỉ áp dụng khi chart không phải scatter, không phải `indexAxis:'y'`, và có ≥ 6 nhãn đọc được thành ngày. Các dạng nhãn hiểu được: `mm/yyyy`, `Qn/yy`, `Qn/yyyy`, `dd/mm/yyyy`, `yyyy-mm(-dd)`, `dd/mm`.

Khi áp dụng, nó chèn một thanh `.rng` phía trên `.cbox`, gồm:
- Nút khung thời gian **1M · 3M · 6M · YTD · 1Y · 3Y · 5Y · Tất cả** (khung nào ít hơn 2 điểm hoặc phủ toàn bộ chuỗi thì nút bị khoá).
- Công tắc **Cột/Đường** tự động. Chỉ có khi chart toàn một loại, không chồng (stacked), không fill và chưa có nút `ctl` riêng.
- Ba chế độ trục Y: **Y vừa dữ liệu** (co theo dải đang hiện, đệm 6%), **Y tuỳ chỉnh** (ô min/max), **Y mặc định**.
- Chart chồng mà mọi cấu phần đều dương thì có thêm nút **100% tỷ trọng**.

Thao tác chuột:
- Kéo chuột trên vùng vẽ để zoom (vùng chọn `.zsel`), nhấp đúp để về toàn bộ.
- Kéo trên trục Y: nửa dưới trục chỉnh min, nửa trên chỉnh max; thả tay thì làm tròn theo bước 10^⌊log10(span/20)⌋; nhấp đúp trên trục thì về mặc định.
- `opt.last = N`: mở sẵn N điểm cuối. `opt.win = k`: mở sẵn khung k tháng.

Rê chuột lên một dataset thì dataset đó nổi lên, các dataset khác mờ đi (`hiWire`).

Ngoài ra `chartkit.js` còn có:
- Kéo thả đổi vị trí thẻ trong mọi `.grid` có ≥ 2 thẻ: nắm biểu tượng `⠿` gắn trước tiêu đề; thứ tự lưu ở `fsk-cards:nganh.html:{tag}:{chỉ số grid}`.
- Kéo đổi thứ tự nút tab con (`FSK.sortable`, lưu ở `fsk-order:picture`).
- Nút lên đầu trang `.totop`, nút "✦ Trợ lý AI".
- Nút Xuất PDF chung (`.pdfbtn`; do phần tài liệu khác mô tả).

### 2.6 Khuôn thẻ `card({...})` (`sector.js:166`)

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
Không truyền `insight` mà `INS[id]` tồn tại thì insight được tính từ `INS` (chủ yếu dùng cho chart Quốc tế của trang Vĩ mô). Chuỗi `src` được bỏ tiền tố "Nguồn:" trùng.

**Chiều cao vùng vẽ (`fs.css:69–70, 631`):**
- `.cbox` = **280px** (mặc định);
- `.cbox.tall` = **340px**;
- `.cbox.short` = **230px**;
- `.cbox.xl` = **600px** (520px khi màn hình ≤ 700px).

Hàng chi tiết rủi ro dùng canvas trong `div.cbox` có inline `height:260px`. Lưới: `.grid.g2` (2 cột, gap 18px; 1 cột khi `max-width:760px`, cùng lúc `.wrap` lề 16px và `.kpis` 2 cột). Ô KPI: `.kpis` 6 cột (3 cột khi ≤ 1100px, 2 cột khi hẹp); `.kpis.k4` 4 cột; `.kpis.pol` 5 cột.

`kpi(l, v, s, cls)` → `<div class="kpi"><span>{nhãn}</span><b>{giá trị}</b><em class="{pos|neg}">{phụ}</em></div>`.
Pill trạng thái: `ok` = "Hỗ trợ", `watch` = "Theo dõi", `risk` = "Rủi ro", `na` = "Chưa có số".

### 2.7 Thu gọn mục (`collapsify(root, key, openIds, sel)`, `sector.js:226`)

Mỗi tiêu đề `h3.ovh` (hoặc `sel`) trở thành nút bấm, gom các phần tử phía sau nó (tới tiêu đề kế tiếp) vào `div.ovbody`; mũi tên `▾` xoay khi `.shut`. Trạng thái lưu ở `localStorage['fs-col:'+key]`. Thanh `.colbar` có "Mở tất cả · Thu gọn tất cả". Mở lại một mục thì `resize` các chart bên trong.

---

## 3. Từng tab

### 3.1 Tab 1 · Tổng quan ngành (`paneOverview`, `sector.js:242–444`)

Đây là phần kiến thức nền, gần như toàn bộ là chữ viết cứng trong code. Mỗi đoạn có **hai bản**: `S(dài, ngắn)` sinh `<span class="tl">dài</span><span class="ts">ngắn</span>`.

Từ trên xuống:

1. **Thanh Nhật ký** `button.qbar#goQuick` (chỉ hiện khi có bản cập nhật). Gồm ngày "Nhật ký chuyên viên dd/mm/yyyy", nhãn `.who.ai` (`#ede9fe`/`#5b3fb8`) hoặc `.who.cv` (`#e3f5ec`/`--pos`), `headline` của bản mới nhất, chữ "Xem →". Bấm vào thì `show('quick')`. CSS: viền trái 4px navy, bo góc 12px.
2. `h2.sec` "Tổng quan ngành ngân hàng Việt Nam" + `p.sec-sub`.
3. Công tắc độ dài `.ovmode`: hai nút `[data-ovm=short]` "Ngắn gọn" và `[data-ovm=long]` "Đầy đủ". Bản Ngắn gắn class `ovs-on` vào `#overview`: hiện `.ts`, ẩn `.tl` và các cột `.lo` (`fs.css:618–619`). Lưu ở `localStorage['fs-ov-mode']`, mặc định `short`.
4. Thanh mục lục `nav.ovnav`: 7 link dạng pill tới `ov1 ov2 ov4 ov5 ov6 ov7 ov8`, nhãn "1 · Vai trò", "2 · Chuỗi giá trị", "3 · Cấu trúc ngành", "4 · Yếu tố tác động", "5 · Chu kỳ ngành", "6 · Khung pháp lý", "7 · Thuật ngữ". Bấm thì mở mục nếu đang thu gọn rồi cuộn mượt tới mục.
5. Các mục `h3.ovh` (được `collapsify`, key `ov2`, mặc định mở `ov1`, `ov2`):

| id | Tiêu đề | Thành phần |
|---|---|---|
| `ov1` | 1 · Ngân hàng trong nền kinh tế | `article.card.ovlead`, 2 đoạn (vai trò trung gian; rủi ro hệ thống và các tỷ lệ an toàn) |
| `ov2` | 2 · Chuỗi giá trị | `article.card.vcard.vshort#vcCard`: công tắc `#vmSw` "Hiện giới hạn tỷ lệ theo quy định" (lưu ở `fs-vc-mode` = short/long; `.vshort .vlim{display:none}`); ô NHNN `.vreg`; lưới `.vflow` 5 cột (`1fr 34px 1.1fr 34px 1fr`, 1 cột trên di động): **Nguồn vốn** (`.vcol.c1` nền `#eef4fd`: 5 ô, nhãn quy mô `em.vsz` lớn nhất / lớn, bất thường / vừa / đặc thù Big 4 / nhỏ) → **Ngân hàng** (`.c2` `#eef6ef`: 4 ô, ô có `Giới hạn:` `em.vlim`) → **Sử dụng vốn** (`.c3` `#fdf3e7`: 4 ô); `.vinfra` (NAPAS, CIC, BHTG, VAMC…); `p.vnote` (cách tính tỷ trọng). Dưới đó là lưới g2 hai thẻ: "Vì sao bất động sản chiếm tỷ trọng lớn…" (4 gạch đầu dòng) và "Hai rủi ro cốt lõi của mô hình" |
| `ov4` | 3 · Cấu trúc ngành | Bảng "Các loại tổ chức tín dụng" (Loại hình · Đại diện · Đặc điểm, 5 dòng); `h3.sub` "26 ngân hàng niêm yết…, chia theo nhóm"; `.gcards` 4 thẻ nhóm (`.gcard`, viền trên 4px màu nhóm `--gc`, danh sách mã, mô tả `GDESC`); link `data-gop="peer"` sang So sánh ngân hàng |
| `ov5` | 4 · Các yếu tố tác động | `.banner.chain` (chuỗi Fed → … → P/B); `.dbx`, 4 thẻ `.dbox` A–D (`DRV`): Vĩ mô tiền tệ (3 yếu tố), Sức khoẻ nền kinh tế (4), Định hướng chính sách (3), Tỷ lệ an toàn (2). Mỗi yếu tố gồm tiêu đề, pill chỉ số chịu tác động (vd "COF · NIM"), đoạn cơ chế + tác động, và nút "Chart: … →" (`data-goc="tab~chartId"` theo bảng `FCH`, gọi `goChart`) |
| `ov6` | 5 · Chu kỳ ngành | chart **`ovCycle`** (bên dưới); bảng "Ngân hàng đi theo chu kỳ lãi suất và tín dụng" (Giai đoạn · Lãi suất · Tín dụng · NIM · Nợ xấu · P/B; 4 dòng `CYC`: Nới lỏng, Phục hồi, Thắt chặt, Xử lý nợ) |
| `ov7` | 6 · Khung pháp lý chủ chốt: các tỷ lệ an toàn | `p.ovintro` (TT 50/2026 thay TT 22/2019 từ 01/12/2026; link `D.regRef`); `.ratg`, 4 thẻ `.rcard` (`RAT`: LDR, Vốn ngắn hạn cho vay trung dài hạn, NSFR, LCR), mỗi thẻ có `dl` gồm Công thức / Đang áp dụng / Theo TT 50/2026 / Hàm ý; thẻ "Lộ trình áp dụng: ba lựa chọn của mỗi ngân hàng" (bảng Lộ trình · Bắt đầu · LCR · NSFR · LDR, 3 dòng; insight; nguồn); `details.morex` "Toàn bộ các quy định khác…" chứa bảng `table.regt` (Trạng thái · Quy định · Mức · Văn bản · Lộ trình) dựng từ `D.reg` |
| `ov8` | 7 · Thuật ngữ và chỉ số cần biết | Bảng 12 thuật ngữ `GL`: NIM COF CASA LDR LCR NSFR CAR NPL LLR CIR ROE P/B (Viết tắt · Tên · Cách tính · Đọc thế nào) |

Bảng `FCH` (yếu tố → chart minh hoạ):

| Yếu tố | Tab | Chart |
|---|---|---|
| Lãi suất điều hành và thanh khoản | dom | `chOn` |
| Tỷ giá USD/VND | dom | `chFx` |
| Fed và đồng USD | dom | `gUsOis` (lỗi nhỏ: id này chỉ có trong khối dựng ẩn; trên trang ngành phiên bản đang hiện là `nUsOis`, nên nút cuộn tới phần tử ẩn) |
| Tăng trưởng kinh tế và doanh nghiệp | dom | `chMoney` |
| Lạm phát | eco | `chCpi` (chuyển sang `vimo.html#eco~chCpi`) |
| Bất động sản | bank | `chAQ` |
| Tài khoá và Kho bạc | dom | `chFiscal` |
| Room tín dụng | camel | `chCmRoom` |
| Chủ trương lãi suất và tín dụng ưu tiên | policy | `chSbvStance` |
| Tái cơ cấu và xử lý nợ xấu | policy | `regTbl` |
| Tỷ lệ thanh khoản (LDR, …) | policy | `chLdr22` |
| Vốn (CAR)… | peer | `chCompare` |

Trạng thái quy định `regSt(r)`:
- `eff > hôm nay` → pill `rs-soon` "Chưa hiệu lực" + "từ dd/mm/yyyy" (nền `#fff1d6`, chữ `#8a5a00`);
- ngược lại → `rs-on` "Đang hiệu lực" (nền `#e3f4ea`, chữ `#1e7a4c`) + "đến …" (nếu có `until`) hoặc "từ …".

`regDoc` thêm link "Phân tích FinSuccess →" khi `r.ref` có giá trị.

**Chart `ovCycle`**: "Chỉ số giá cổ phiếu ngân hàng qua các chu kỳ", `.cbox.xl` (600px).
- Kiểu line, nhãn `mm/yyyy` từ 03/2012.
- Dataset 1: "Chỉ số giá ngành Ngân hàng", navy, rộng 2.4, unit `''`, dp 1, trục `y` **logarithmic**, tiêu đề "chỉ số (log)", chỉ in tick 80, 100, 150, 200, 300, 400, 500, 600.
- Dataset 2: "Tín dụng so cùng kỳ", đỏ, dash [5,4], rộng 1.6, trục `y1` (% bên phải, không lưới).
- x: `maxTicksLimit 14`.
- Plugin `cycBand` tô nền theo `CYCLES` (`sector.js:446`) và ghi tên giai đoạn (chữ `600 10px`, cắt bằng "…" khi bề rộng không đủ, chỉ ghi khi dải rộng > 34px):

| Từ | Đến | Giai đoạn | Màu |
|---|---|---|---|
| 2012-03 | 2013-12 | Xử lý nợ xấu | x `rgba(217,164,0,.11)` |
| 2014-01 | 2017-06 | Phục hồi | r `rgba(41,56,168,.07)` |
| 2017-07 | 2018-04 | Tăng tốc | e `rgba(31,138,141,.10)` |
| 2018-05 | 2019-12 | Siết room, chuẩn hoá vốn | t `rgba(192,57,43,.09)` |
| 2020-01 | 2021-12 | Nới lỏng (COVID) | e |
| 2022-01 | 2022-12 | Thắt chặt (lạm phát, trái phiếu) | t |
| 2023-01 | 2024-12 | Nới lỏng, xử lý nợ | x |
| 2025-01 | 2025-08 | Phục hồi | r |
| 2025-09 | (nay) | Thắt chặt (lãi suất huy động, Fed) | t |

- Dữ liệu (`cycleSer`): `ECO_DATA.bankIdx` (chỉ số cuối tháng, gốc 20/03/2012 = 100, từ `data/backfill/bank_index.json`). Sau tháng cuối của chuỗi, chỉ số được nối tiếp theo tỷ lệ thay đổi vốn hoá ngành `SV.monthly[].mcap`. Tín dụng YoY lấy từ `ECO_DATA.credY`.
- Insight `cycleIns`: số lần tăng từ 03/2012, đỉnh cao nhất, % thấp hơn đỉnh, hệ số tương quan Pearson (`corr`) giữa mức thay đổi 12 tháng của chỉ số và tín dụng YoY (tính khi > 24 cặp), rồi đoạn "Hàm ý".
- Nguồn: "Chỉ số giá ngành Ngân hàng; NHNN (tăng trưởng tín dụng); phân giai đoạn: FinSuccess".

### 3.2 Tab 2 · Bức tranh ngành (`panePicture`, `sector.js:670`)

Cấu trúc:
```
h2.sec "Bức tranh ngành"
h3.ovh#pic1 "1 · Nhận định FinSuccess"   → article.card.fsn#viewNote (FSN, mục 4.2)
h3.ovh#pic2 "2 · Diễn biến chi tiết: từ vĩ mô tiền tệ tới định giá ngân hàng"
  p.sec-sub (link vimo.html) · .banner.chain "Fed, USD → Tỷ giá → NHNN (OMO, tỷ giá trung tâm, tỷ lệ an toàn) → Lãi suất TT2 → TT1 → COF, NIM, nợ xấu → P/B ngân hàng"
  .subtabs[data-sn=picture]  4 nút: dom "Vĩ mô tiền tệ" · bank "Ngân hàng" · peer "So sánh ngân hàng" · camel "Xếp hạng TT21 & room"
  .sub[data-pp=dom|bank|peer|camel]
```
- `collapsify(#picture,'pic',['pic1','pic2'])`; trong tab con `dom` có thêm `collapsify(…,'dom3',['d-fx'],'h3.dsec')`, nên mặc định chỉ mở mục Tỷ giá.
- Tab con: `SUBS.picture`, `P2PANE` (tab con → tab mẹ), `PDRAW` (`sector.js:656–661`). `openP(k)`: mở tab mẹ, mở `#pic2` nếu đang thu gọn, bật nút và `.sub.on`, vẽ lười `PDRAW[k]()` (đánh dấu `pDone`), ghi hash `#k`. Tab con không thuộc trang này thì chuyển sang `vimo.html#k`.
- `wireSubs`: nút tab con kéo đổi thứ tự được (`fsk-order:picture`). Lúc khởi tạo, tab con mở ra là **nút đứng đầu theo thứ tự người dùng đã xếp**.
- `PDRAW.dom = chDom(); chBond(); drUsMini()`. Lưu ý: `chBond()` vẽ cả các chart Trái phiếu nằm trong khối ẩn `#vmx`.

#### 3.2.1 Tab con "Vĩ mô tiền tệ" (`subDom('n')`, `sector.js:1923`; vẽ bằng `chDom` `:1987`, `chBond` `:2934`, `drUsMini` `:2663`)

**Hàng KPI** (`.kpis`, 6 ô; bấm một ô thì cuộn tới chart theo `kpiLinks`: chFx, chFxGap, chOn, chMoney, chCpi, chExt; ô CPI chuyển sang `vimo.html#eco` vì `chCpi` nằm ở trang Vĩ mô):

| Nhãn | Giá trị | Dòng phụ |
|---|---|---|
| USD/VND NHTM bán | `dom.nhtmSell` cuối | "trần {ceiling} · cách {1 − bán/trần}%" |
| Tỷ giá tự do | `dom.free` cuối | "cao/thấp hơn NHTM {chênh}đ" |
| LNH qua đêm | `dom.on` cuối | "dd/mm/yyyy · OMO {omo}%" |
| Tín dụng vs tiền gửi | chênh đ% | "TD x% (mm/yyyy) · TG y% (…)"; class `neg` |
| CPI | `dom.cpi` | "lõi … · BQ 9T …"; `neg` khi CPI bình quân > 4,5 |
| Dự trữ ngoại hối | `reserves/1000` tỷ USD | mm/yyyy |

**Mục `h3.ovh.dsec#d-fx` "Tỷ giá và tác động từ Mỹ"** (lưới g2):

| id | Tiêu đề | Kiểu, dữ liệu, trục | Cao | Insight · Nguồn |
|---|---|---|---|---|
| `chFx` | `FSFX.TITLE` "Hành lang tỷ giá USD/VND và chỉ số USD (DXY)" | line theo ngày từ 2021-01-01 (trục = ngày có tỷ giá trung tâm). 8 dataset (`fxchart.js`): Trung tâm `#59C5C8`; Trần (+5%) `#c0392b` dash [5,4]; Sàn (−5%) `#9aa3b2` dash, **ẩn sẵn**; NHNN bán can thiệp `#861C52` dash [2,3]; NHTM bán ra `#1D2678` (chuỗi ngày `dom.nhtmD`, mỗi ngày lấy giá gần nhất trong vòng 8 ngày; không có thì dùng chuỗi cuối tháng); Tự do bán ra `#d9a400`; Vietcombank bán ra `#1f6f3f` (điểm 3px, không nối khoảng trống); DXY (trục phải `y1`) `#8a8f98` | tall | `FSFX.insight` (trung tâm, % từ đầu năm, trần, giá bán can thiệp, VCB/NHTM cách trần bao nhiêu đồng và %, DXY từ đầu năm và 1 tháng + Hàm ý) · nguồn `FSFX.SRC` |
| `chFxGap` | Chênh lệch tỷ giá tự do − NHTM bán ra | bar theo ngày, giá trị = tự do − NHTM (NHTM lấy giá gần nhất trong 8 ngày). Cột đỏ `rgba(192,57,43,.7)` khi dương, teal `rgba(31,138,141,.7)` khi âm; bar/category 1; ẩn legend; y "VND" | 280 | `fxGapIns` (chênh hiện tại, đỉnh năm, trung bình 90 ngày, số phiên âm) · Wi MCP 82226, 82223 |
| `nFedPath` | Kỳ vọng lãi suất Fed theo từng phiên họp FOMC | `fedWatchCard({id:'nFedPath',compact:true})`, bản rút gọn không có bảng. Line: Hiện tại navy 2.4; 1 tuần trước tealInk dash; 1 tháng trước grey dash (lấy từ `GLOBAL_DATA.fedwatchHist`); Điểm giữa khoảng hiện hành đỏ dash [2,3] | tall | Insight: xác suất khoảng cao nhất phiên tới, xác suất tăng/giảm, kỳ vọng tới cuối năm, so với Kalshi/Polymarket và dot plot, kết luận R-02 · nguồn: ước tính FinSuccess theo phương pháp CME FedWatch từ giá ZQ… |
| `nUsOis` | Đường cong OIS (SOFR) Mỹ | `oisCards({cv:'nUsOis',mini:true})`. Line theo kỳ hạn: Hiện tại / 1 tuần / 1 tháng trước; Lợi suất TPCP (grey dash); SOFR (đỏ dash) | tall | Insight OIS − SOFR, OIS − TPCP · nguồn ước tính từ hợp đồng tương lai SOFR (CME qua Yahoo) |
| `nUsCurve` | Đường cong lợi suất trái phiếu Kho bạc Mỹ | line 1M–30Y, 5 đường `GLOBAL_DATA.ustCurve.c` (hôm nay navy 2.8; 1 tuần teal dash [2,2]; 1 tháng tealInk; đầu năm red; 1 năm trước grey dash [5,4]) | tall | `usCurveIns` · U.S. Treasury |
| `nUsd` | Đồng USD: DXY và USD/CNY | line tháng từ 2021: DXY navy (y), USD/CNY purple (y1 bên phải, tick 2 chữ số thập phân) | 280 | DXY, YoY, CNY + Hàm ý · ICE (DXY), ECB |

**Mục `#d-flow` "Cung tiền, tín dụng và dòng tiền"**:

| id | Tiêu đề | Kiểu, dữ liệu | Cao | Ghi chú |
|---|---|---|---|---|
| `chMoney` | Tín dụng, tiền gửi và M2 | line tháng từ 01/2019: Tín dụng YoY navy 2.4; Tiền gửi YoY teal; M2 YoY gold dash [4,3]; dp 1 | 280, `ctl` + switch line | insight viết cứng kèm số chèn từ dữ liệu · Wi MCP 75847, 265963, 265954 |
| `chCredit` | Tín dụng toàn hệ thống so với đầu năm | line nhãn T1…T12, mỗi đường là một năm (4 năm gần nhất); màu `[steps5, steps4, steps2, navy]`, năm hiện tại rộng 3, các năm khác 1.6, điểm 2; refLine 15 "Chỉ tiêu 2026 ~15%" | 280 | Wi MCP 241732; vietnambiz 14/10/2026 |
| `chExt` | Đối ngoại: cán cân thương mại, FDI và dự trữ | bar tháng từ 2021: Cán cân XNK (tỷ USD; xanh khi ≥ 0 `rgba(31,138,141,.7)`, đỏ khi âm); line FDI giải ngân 12 tháng (navy, tổng trượt 12 tháng /1000); line Dự trữ ngoại hối (purple dash, y1) | 280 | Wi MCP 255693, 76951, 76885 |
| `chFiscal` | Tài khóa: chi − thu ngân sách theo quý | bar quý từ 2021 (nhãn `Qn/yy`), chi − thu /1000 nghìn tỷ; xanh `rgba(41,56,168,.7)` khi ≥ 0, đỏ khi âm; ẩn legend | 280 | Wi MCP 82420, 75598 |

**Mục `#d-cost` "Chi phí vốn và thanh khoản"**:

| id | Tiêu đề | Kiểu, dữ liệu | Cao, khung mở sẵn | Nguồn |
|---|---|---|---|---|
| `chOn` | Thanh khoản liên ngân hàng (TT2) | bar + line theo phiên (`dom.onDaily`): LNH qua đêm navy; Lãi suất OMO teal dash [5,4] (giữ mức phiên gần nhất có đấu thầu); cột Bơm/hút ròng (tỷ) trục y1 (`rgba(41,56,168,.35)` khi ≥ 0, `rgba(192,57,43,.35)` khi âm); x `maxTicksLimit 10` | tall, `win:3` | Wi MCP 82237, 81522, 82268 |
| `chLnhTen` (khi có `dom.lnh`) | Lãi suất liên ngân hàng theo kỳ hạn (TT2) | line theo phiên: ON navy, 1W `#97BAFF`, 1M tealInk, 3M gold, 6M purple, 9M red (ON và 3M rộng 2.2, còn lại 1.5); OMO grey dash | tall, `win:12` | NHNN qua dulieukinhte.com; insight `lnhIns` (mức từng kỳ hạn, thay đổi so với 5 phiên trước) |
| `chOmoOut` (khi có `dom.omoOut`) | OMO và tín phiếu NHNN đang lưu hành | bar chồng: OMO lưu hành `rgba(29,38,120,.55)` dương; Tín phiếu (hút) `rgba(192,57,43,.55)` âm; line LNH qua đêm gold trên y1 | tall, `win:12` | NHNN qua dulieukinhte.com; `omoOutIns` |
| `chDep` | Lãi suất huy động 12 tháng theo nhóm (TT1) | line **stepped** theo ngày từ 10/2024 (điền tiếp giá trị trước): NHTM Nhà nước navy 2.4; NHTM lớn tealInk; NHTM khác purple | 280, `win:12` | Wi MCP 202886, 202874, 202880; `depIns` |
| `bBig4` | Lợi suất trái phiếu Big 4 khi phát hành | line (`BOND_DATA.big4`): điểm rời từng ngân hàng (`showLine:false`; VCB tealInk, CTG navy, BID purple, AGRIBANK gold); Huy động 12T Big 4 đỏ 2.2; TPCP 10 năm grey dash | 280 | `BD.src.big4; BD.src.curve`; `bBig4Ins` |
| `dMmCurve` | Đường cong lãi suất liên ngân hàng VND và USD | line theo kỳ hạn ON 1W 2W 1M 2M 3M 6M 9M 1Y (`VIRA_DATA`): VND hôm nay navy 2.6; VND 1 tuần trước navy dash; VND 1 tháng trước grey dash; USD đỏ; SOFR kỳ hạn gold dash [6,3] | 280 | VIRA Market Watch; `mmCurveIns` |
| `bCurve` | Đường cong lợi suất TPCP Việt Nam | line 1Y 3Y 5Y 10Y 20Y: hiện tại navy 2.8; 3 tháng trước teal dash; đầu năm gold; 1 năm trước grey | 280 | `BD.src.curve`; `bCurveIns` |
| `bCurveTs` | Lợi suất TPCP 1, 5, 10 năm và độ dốc 10Y − 1Y | line theo ngày từ 2021 (1Y teal, 5Y purple, 10Y navy 2.6) + cột độ dốc `rgba(154,163,178,.45)` trên y1 (min 0) | tall, `win:12` | `BD.src.curve` |

#### 3.2.2 Tab con "Ngân hàng" (`subBank` `:2667`, `chBank` `:2712`)

Lưới g2:

| id | Tiêu đề | Kiểu, dữ liệu | Cao | Insight · Nguồn |
|---|---|---|---|---|
| `chGrp` | Chỉ số ngân hàng theo nhóm, theo quý | line `BQ` (Q1/2021…Q2/2026): "Ngành" màu `#000` dash [5,3] rộng 2.6 + 4 nhóm màu `GC`, điểm 2. Picker `#grpMetric` (`BMET`): NIM, COF, YEA, CASA, NPL, Nợ nhóm 2, Bao phủ nợ xấu, LDR, Tín dụng YoY, ROE, CIR; mặc định `nim` | tall | `#grpIns`: "{chỉ tiêu} ngành {quý} x%, ±đ% so với cùng kỳ. Cao nhất…, thấp nhất…" · Wi MCP ratio_bank, ratio_bank_ttm |
| `chNimDep` | NIM, COF ngành và lãi suất huy động 12T | line quý: NIM navy 2.6; COF đỏ; YEA tealInk dash [4,3]; LS huy động 12T NN gold dash [2,3] (giá trị cuối quý của `dep12State`) | tall | `nimDepInsight` (một phần viết cứng) · Wi MCP ratio_bank_ttm; macro 202886 |
| `chPpopBurden` (khi có `D.ppopSector`) | Lợi nhuận trước dự phòng, chi phí dự phòng và LNST toàn ngành | line quý từ Q4/2018 (TTM, nghìn tỷ): PPOP tealInk 2.4; Chi phí dự phòng đỏ; LNST navy 2.4; "Dự phòng / LN trước dự phòng" gold dash trên y1 (0–50%, `keep:true`) | tall, `ctl`, switch line | `ppopBurdenIns` (PPOP, dự phòng, LNST, YoY, tỷ lệ so với 2018–2021 và cuối 2022) · BCTC 26 NH, tự tính |
| `chPbBand` | Định giá ngành: P/B và dải ±1σ | line cuối tháng từ `SV.from`; điểm cuối có nhãn "dd/mm/yyyy (mới nhất)". P/B navy 2.4; TB grey dash; +1σ đỏ dash [2,3] rộng 1; −1σ tealInk (ba đường dải đều `keep`) | 280, `ctl`, switch line | P/B, z-score, P/E · Wi MCP sector_ratio_daily (sector 107) |
| `chFeeSec` (khi có `D.fee`) | Lãi thuần dịch vụ toàn ngành theo mảng | `FSK.feeCfg`, 4 chế độ (picker `data-feem`): **Lãi thuần** (cột chồng, nghìn tỷ, chia 1000) · Tăng trưởng thu YoY · Tăng trưởng lãi thuần YoY · Biên lợi nhuận (line; đường "Tổng" `#1b1f2a` rộng 3; YoY chỉ tính khi kỳ trước ≥ 300 tỷ; mảng chứng khoán không có biên). Màu `FEE_COL`: pay `#002060`, ins `#59C5C8`, trust `#861C52`, sec `#9a7400`, adv `#97BAFF`, cash `#9aa3b2`, oth `#FFD45D` | 280 | Insight viết theo `F.table` · Thuyết minh BCTC năm 26 NH |
| (thẻ bảng) | Thu phí theo mảng · toàn ngành năm {T.year} | Bảng: Mảng · Thu · Thu YoY · Lãi thuần · Lãi thuần YoY · Biên · Tỷ trọng (dòng tổng in đậm); `details.more` "Từng ngân hàng…": NH · Thu · YoY · Biên · Mảng lớn nhất · Tăng nhanh nhất (≥ 5% thu) | — | ghi chú chi viễn thông, môi giới gộp vào "Khác" |
| `chAQ` | Chất lượng tài sản theo nhóm | bar 4 nhóm: NPL đỏ, Nợ nhóm 2 gold; line Bao phủ nợ xấu navy điểm 4 trên y1 | 280 | `aqInsight` · Wi MCP ratio_bank |

#### 3.2.3 Tab con "So sánh ngân hàng" (`subPeer` `:496`, `chPeer` `:521`)

- **KPI** (6 ô):
  - P/B ngành + "TB từ mm/yyyy: x (±σ)" (`pos` khi z < 0);
  - P/E ngành + "TB · LNST TTM … nghìn tỷ";
  - NIM ngành quý gần nhất + cùng kỳ (`neg` khi giảm);
  - NPL ngành + cùng kỳ + nhóm 2;
  - Tín dụng so đầu năm (mm/yyyy · cùng kỳ);
  - Huy động 12T NHTM NN + "±đ% từ đầu năm" (so với 12/2025), class `neg`.
- `h3.sub` "Chỉ số theo nhóm · trung vị, {quý}" + `.gcards`: 4 `groupCard`, mỗi thẻ có `dl` trung vị NIM, COF, CASA, NPL, Bao phủ, ROE, P/B (`grpMed`) và mô tả `GDESC`.
- **`chCompare`** "So sánh tài chính & định giá" (tall):
  - Bar xếp giảm dần, màu theo nhóm, ẩn legend; x `autoSkip:false`, `maxRotation 60`.
  - Picker `#cmpMetric` (`CMP`): NIM, COF, CASA, NPL, Nợ nhóm 2, Bao phủ nợ xấu, LDR, Tín dụng YoY, ROE, CIR, P/B, P/E, Dự phòng / LN trước DP. Picker `#cmpGroup`: Tất cả + 4 nhóm.
  - refLine màu đỏ "Ngành x": với P/B, P/E lấy `SV.now`; với provRatio lấy `ppopSector` cuối; còn lại lấy `AG[k].all[QI]`.
  - Bỏ mã có **P/E > 60**.
  - `#cmpIns`: cao nhất, thấp nhất, bình quân ngành, trung vị theo nhóm.
  - Nguồn: Wi MCP ratio_bank, ratio_bank_ttm, ratio_common_ttm, ratio_daily.
- Lưới g2:
  - **`chRoePb`** "ROE và P/B: ai đang được định giá cao/thấp so với khả năng sinh lời" (tall):
    - Scatter, mỗi nhóm một dataset, chỉ lấy mã có ROE > 3. x `pctAxis('ROE TTM')`, y P/B `x.x x`.
    - Đường hồi quy OLS (`olsFit`, grey dash [6,4]) tính trên các mã đang hiện; legend ghi "P/B = a + b × ROE (R² …, n mã)".
    - Mã được tick chọn: bán kính 8, viền vàng `#d9a400` rộng 3. Khi đang làm nổi mã chọn thì mã khác bán kính 4, bình thường 5. Có nhãn tên mã cạnh điểm.
    - Picker `#rpMode`: "Tất cả, làm nổi mã đã chọn" (`all`) · "Chỉ mã đã chọn" (`sel`) · "Bỏ chọn". Bấm legend để ẩn/hiện nhóm (`rpS.hid`).
    - Tooltip: "MÃ: ROE x% · P/B y · cao/thấp hơn đường hồi quy z x".
    - Trạng thái lưu ở `localStorage['fs-roepb'] = {mode, sel[], hid[]}`.
    - `#rpIns`: hệ số b, R² (khi R² < 0,3 thì ghi thêm "ROE giải thích được ít khác biệt định giá"), 3 mã nằm dưới và 3 mã nằm trên đường hồi quy xa nhất, rồi Hàm ý.
  - Thẻ **"Bảng so sánh 26 ngân hàng"** (`#cmpTable`): cột Chọn (checkbox `data-rp`, đưa mã lên `chRoePb`) + `TCOLS`: Mã, Nhóm (chấm màu), NIM, COF, CASA, NPL, Nhóm 2, Bao phủ, LDR, TD YoY, ROE, CIR, P/B, P/E, DP/LN trước DP, Vốn hóa (tỷ). Bấm tiêu đề cột để sắp xếp (lần đầu giảm dần, bấm lại thì đảo chiều), mặc định sắp theo ROE giảm dần; dòng đã chọn có class `rp-on`.

#### 3.2.4 Tab con "Xếp hạng TT21 & room": mô phỏng CAMELS (`subCamel` `:736`, `cmRender` `:846`)

- `.banner.chain` "TT 21/2025: 6 tiêu chí C·A·M·E·L·S (định lượng 70%, định tính 30%) → điểm 1–5 → hạng A–E · Room năm N+2 = điểm × 2,6%…".
- Picker kỳ `#cmP`: các kỳ trong `CM.periods` (Năm 2021…Năm 2025, TTM Q2/2026), mặc định `TTM2Q26`, kèm ghi chú (số liệu 2025 chấm cho room 2027 theo TT52; số liệu 2026 chấm theo TT21 cho room 2028).
- **KPI** `#cmK` (k4; **CTG là ngân hàng tham chiếu, viết cứng**):
  - CTG · điểm ước tính "x,xx · B" + "hạng r/26 toàn ngành · r/n nhóm lớn";
  - Room ngụ ý CTG + trung vị ngành;
  - Phân bố hạng "a A · b B · c C–E";
  - Độ phủ dữ liệu (trung vị `cov`%).
- **Bảng điểm CAMELS ước tính · 26 ngân hàng** (`table.cm`, `#cmBody`):
  - Cột: # · NH (★ khi `priority`: HDB, MBB, VCB, VPB) · Nhóm (chấm màu + Lớn/Nhỏ) · C A M E L S (ô `.sc` tô màu theo điểm; dấu `*` khi tiêu chí có chỉ tiêu thiếu số) · Định tính (ô `input.qin` 1–5 bước 0.5) · Tổng điểm (kèm thanh `.rgbar` thể hiện khoảng lo–hi và vạch điểm) · Hạng (ô `.gr.gA…gE`) · Room ngụ ý · Tín dụng YTD.
  - Xếp theo tổng điểm giảm dần. Bấm một dòng thì chọn ngân hàng đó (`cmS.sel`, mặc định CTG).
- Thang màu điểm `cmCol`:

| Điều kiện | Màu nền |
|---|---|
| ≥ 4,5 | `#1e8f5a` (chữ trắng) |
| ≥ 3,75 | `#7cc49b` |
| ≥ 3 | `#f2d27a` |
| ≥ 2,25 | `#ef9f76` |
| còn lại | `#c0392b` (chữ trắng) |
| null | `#eef0f4` |

  Màu ô hạng: gA `#1e8f5a`, gB `#4f9bd1`, gC `#d9a400`, gD `#e07b39`, gE `#c0392b`.
- **Điểm định tính** chỉnh được, lưu ở `localStorage['fs-bank-sector'].qual[MÃ]`, mặc định `CM.qualDefault = 4.0`. Công thức tổng (`cmTot`): `tổng = quant.pt + (Σ wl / 100) × q = quant + 0,30 × q`; tương tự cho lo và hi.
- Hạng (`cmGrade`): A ≥ 4,5 · B ≥ 3,5 · C ≥ 2,5 · D ≥ 1,5 · E. **Room ngụ ý = tổng × 2,6%**.
- Lưới g2:
  - **`chCmRoom`** "Room ngụ ý so với tăng trưởng tín dụng thực tế" (tall):
    - Scatter theo nhóm (bán kính 5). x = room ngụ ý %. y = tín dụng **YTD** khi kỳ đang chọn là TTM Q2/2026, ngược lại là tín dụng YoY.
    - Đường đỏ dash: y = x × f, với f = 0,5 cho kỳ TTM ("Nửa room ngụ ý (nhịp 6 tháng)"), f = 1 cho các kỳ năm.
    - Nhãn tên mã cạnh điểm.
    - `#cmIns`: thứ hạng CTG, các tiêu chí dưới 4 điểm, danh sách mã vượt đường quá 1,5 điểm % (kỳ TTM) hoặc 3 điểm % (kỳ năm), kèm câu về Điều 16.6.
  - **`#cmDet`** "{MÃ} · chi tiết chấm điểm":
    - Dòng phụ: nhóm quy mô, TTS bình quân, tổng (lo–hi), hạng, room.
    - Bảng `table.cmd`: Chỉ tiêu (trọng số, ghi chú proxy) · Giá trị (E4 tính bằng ngày, còn lại %; kỳ CAR; nguồn A6) · Ngưỡng 5·4·3·2 · Điểm; gom theo tiêu chí.
    - Insight **"Đòn bẩy room"** (`cmLever`): 4 chỉ tiêu mà nếu nhích lên 1 điểm thì room tăng nhiều nhất. Công thức: `dT = w / Σw_tiêu chí × wq / 100`; `dRoom = dT × 2,6`; khoảng cách tới ngưỡng kế tiếp `th[4 − s]`.
- **`chCmHist`** "{MÃ} · lịch sử điểm CAMELS 2021 → nay" (tall):
  - Line qua 6 kỳ: Tổng điểm `#1D2678` rộng 3, điểm 4; 6 tiêu chí rộng 1.4 (C `#1f8a8d`, A `#861C52`, M `#d9a400`, E `#2938A8`, L `#7a5bb5`, S `#9aa3b2`).
  - y 1–5, bước 0.5. refLine 4,5 "A" (`#1e8f5a`) và 3,5 "B" (`#c0392b`).
  - Tooltip `afterTitle` "Hạng X · thứ r/n".
  - Insight `cmHistIns` (`:806`) luôn hiện, kể cả chế độ Gọn (`fs.css:450`). Nội dung: điểm và thứ hạng đầu/cuối; kỳ đổi điểm mạnh nhất (|Δ| ≥ 0,3) kèm 3 chỉ tiêu đổi điểm nhiều nhất; tối đa 5 cờ "Điểm cần chú ý":
    - nhảy ≥ 0,5 điểm trong một kỳ;
    - lệch ≥ 0,4 so với bình quân các năm trước;
    - E hoặc M tăng ≥ 1,5 (dấu hiệu thu nhập bất thường);
    - A tăng ≥ 0,9 kèm bao phủ A7 đổi;
    - thứ hạng tăng ≥ 8 bậc;
    - độ phủ dữ liệu < 70%.
  - Kết thúc bằng Hàm ý.
- Thẻ **"Phương pháp luận và nguồn"** (`cmMethod`, class `cm-method`): danh sách 9 bước (khung, chấm chỉ tiêu, tổng điểm kèm trọng số đọc từ `CM.crit`, hạng, room, kỳ số liệu, chỉ tiêu thiếu số, ghi chú proxy từng chỉ tiêu, tín dụng YTD = cho vay + trái phiếu DN), đoạn Giới hạn, đoạn Nguồn.

### 3.3 Tab 3 · Chính sách · Quy định (`panePolicy`, `sector.js:3210`)

Thứ tự: `h2.sec` + `sec-sub`, rồi `regTiles()`, `regBlock()`, `sbvBlock()`, thẻ "Lịch quy định (REG)".

**`regTiles`** (`.kpis.pol`, 7 ô, chữ số 18px):
- LDR (TT 22) "Trần 85%" (trung vị 26 NH ước tính, số NH trên 85%, TT 50: 95%);
- Vốn ngắn hạn cho vay trung, dài hạn "Tối đa 40%" (số NH công bố, trung vị, cao nhất);
- Dự trữ thanh khoản "Tối thiểu 10%";
- Khả năng chi trả 30 ngày "VND ≥ 50%";
- LCR (TT 50) "50% → 100%";
- NSFR (TT 50) "90% → 100%";
- Tiền gửi có kỳ hạn KBNN vào D = giá trị lấy từ `D.sbv.current`.

**`regBlock`** (chỉ có khi có `D.regRatios`):
- **`chLdr22`** "LDR theo Thông tư 22 của từng ngân hàng" (tall):
  - Chú giải `.l22key`: cột tô màu = LDR TT22 ước tính; cột nét đứt = LDR thuần; hình thoi = số tự công bố.
  - Picker `#l22Pick` theo `RG.periods` (30/06/2026; 31/12/2025 để đối chiếu số công bố).
  - 3 dataset, `grouped:false`:
    - (1) bar LDR TT22, màu nhóm, `barPercentage .62`, order 2;
    - (2) bar trong suốt `dashBar` (viền nét đứt [5,3] rộng 1.6, màu nhóm) = LDR thuần, `barPercentage .9`, order 3;
    - (3) line `showLine:false`, `pointStyle 'rectRot'` bán kính 6, nền `#111` viền trắng = số tự công bố đúng kỳ.
  - y min 40, refLine 85 "Trần 85%".
  - `#l22Ins`: trung vị TT22 so với LDR thuần, mã trên 85%, mã sát trần 83–85%, ghi chú VPB (số hợp nhất gồm FE Credit).
  - Nguồn: Wi MCP fs_bank (bs160_1, bs320_1, bs330, bs360), fs_bank_notes (fnx19, fnx109, fnx114, fnx115), bank_liquidity_risk + báo cáo tự công bố.
- **`chSelf22`** "Các tỷ lệ thanh khoản ngân hàng tự công bố" (tall):
  - Picker `#s22Pick` (`S22`): sflr (tối đa 40%), reserve (tối thiểu 10%), pay30 (tối thiểu 50%), ldr (tối đa 85%). Mặc định `sflr`.
  - Bar màu nhóm; kỳ cũ hơn 2026 làm nhạt bằng `hexA(c, 0.4)`.
  - refLine "Trần/Sàn x%"; y `suggestedMax = ngưỡng × 1,12`; tooltip `afterLabel` "dd/mm/yyyy · nguồn".
  - `#s22Ins`: trung vị, các mã gần ngưỡng (trong 2 điểm % với LDR, 5 điểm % với các tỷ lệ khác; với tỷ lệ tối thiểu là dưới 1,3 × ngưỡng), các mã chưa có số.
- `details.morex#regTbl2` "Bảng chi tiết: tuân thủ tỷ lệ an toàn thanh khoản (TT 22) của 26 ngân hàng" (`table.l22`):
  - Cột: Ngân hàng · Nhóm · LDR ước tính · LDR công bố · LDR so với 85% · Vốn NH cho vay TDH (công bố) · So với 40% · Dự trữ thanh khoản · Chi trả 30 ngày (VND) · LCR · NSFR · Kỳ · nguồn.
  - Trạng thái `rgSt`: "Vượt" `rs-bad` (`#fde4e1`), "Sát trần" `rs-soon` (trong 2 điểm % với LDR, 5 điểm % với SFLR), "Đạt" `rs-on`.
  - Insight sai số ước tính lấy từ `RG.err.ldr` (MAE, bias, p80, số mã lệch trong 3 điểm %).

**`sbvBlock` / `sbvWire`** (`:3079`, `:3104`):
- **`chSbvStance`** "Nhịp điều hành NHNN theo quý" (tall):
  - Bar chồng theo quý từ Q1/2024 tới quý hiện tại: "Nới" `#1e8f5a` (số dương), "Thắt" `#c0392b` (số âm). Không đếm dòng có `tool = 'Thị trường'`.
  - Tick y lấy trị tuyệt đối, bước 1, tiêu đề "số quyết định".
  - Tooltip footer liệt kê tối đa 6 quyết định của quý (cắt ở 62 ký tự).
  - `onClick` vào cột thì lọc bảng theo quý và cuộn tới bảng.
  - Insight: phần mở đầu viết cứng (lãi suất điều hành giữ từ 19/6/2023…), số quyết định nới/thắt từ đầu 2026 tính từ dữ liệu.
- Thẻ **"Nhật ký điều hành NHNN"**:
  - Picker `#sbvTool`: Tất cả + 7 công cụ `SBV_TOOLS` (Lãi suất điều hành · OMO · tín phiếu · Tỷ giá · Tín dụng · Quy định · Chỉ đạo · khác · Thị trường), mỗi nút kèm số đếm.
  - Picker `#sbvDir`: Mọi hướng / Nới / Thắt / Trung tính, cùng chip quý đang lọc "Qn/yy ✕".
  - Picker `#sbvN`: hiển thị 10 / 20 / 50 / 100 tin, mặc định 10, kèm "· x/y mốc khớp bộ lọc".
  - Bảng `table.sbv`: Ngày (+ `dType` "công bố"/"hiệu lực") · Công cụ · Quyết định (đậm + `detail`; khi `verify` có thêm "⚠ Cần xác minh: note") · Hướng (`.dir.n` `#e3f5ec`, `.dir.t` `#fde8e6`, `.dir.z`) · Tác động lên ngân hàng · Văn bản · nguồn (link).
  - Trong `sbvBlock` có tính sẵn `tiles`, `lbl`, `val`, `sub` cho ô mức điều hành hiện hành, nhưng **không được render** (code thừa).
- Thẻ **"Lịch quy định (REG)"** `#regTbl`: Trạng thái · ID · Quy định · Mức (kèm "⚠ flag" khi có) · Văn bản · Lộ trình. Dòng có class `hl` khi có flag, `soon` khi chưa hiệu lực.

README nhắc "độ nhạy LDR theo hệ số KBNN" ở tab này, nhưng code hiện tại không vẽ chart hay bảng `chLdrSens`. Dữ liệu `D.ldrSens` chỉ còn được dùng ở tab Chủ đề nóng và tab Sources. Các bản Nhật ký cũ có trỏ tới `chLdrSens` nên hiện thông báo "Chart không còn trong dashboard".

### 3.4 Tab 4 · Catalyst · Risk (`paneCatalyst`, `sector.js:3366`)

- `.banner.warn` "**n/N rủi ro ở mức cao**: tên… m ở mức trung bình. Bấm từng dòng…".
- Thẻ **"Rủi ro cần theo dõi"** gồm `riskTable(riskRows(), 'rkN')`:
  - Bảng `table.risk-t`: Lớp · Rủi ro · Số hiện tại · Xu hướng · Mức rủi ro (pill Cao `risk` / Trung bình `watch` / Thấp `ok`) · ▾.
  - Bấm dòng `tr.rk` thì mở dòng `tr.rkd`: đoạn `p.cnote` "cách tác động" và canvas `#rkNc{i}` cao 260px, vẽ lười một lần (`data-drawn`).
  - Danh sách rủi ro `riskRows()` (`:3231`) và ngưỡng (ngưỡng là quy ước FinSuccess):

| Lớp | Rủi ro | Số hiện tại · Xu hướng | Mức | Chart khi mở |
|---|---|---|---|---|
| Quốc tế | Đồng USD (DXY) | mức (tháng) · % 1 tháng, % 1 năm | risk khi 1T > 2%; watch khi 1T > 0,5% hoặc 1N > 5% | DXY tháng từ 2021 |
| Quốc tế | Kỳ vọng lãi suất Fed (khi có `GLOBAL_DATA.fedwatch`) | khoảng hiện hành, kỳ vọng sau phiên cuối năm · bps tới phiên thứ 8, OIS 1 năm − SOFR | risk khi kỳ vọng − điểm giữa > 0,1; ok khi < −0,1 | kỳ vọng sau từng phiên + điểm giữa |
| Quốc tế | Bảng cân đối Fed (`us_walcl`) | nghìn tỷ USD · Δ 1 tháng, 1 năm | risk khi Δ1T < −20 tỷ; watch khi < 0 | từ 2021 |
| Quốc tế | Lợi suất TPCP Mỹ 10Y | % · bps 1 tháng, 1 năm | risk khi > 5% hoặc Δ1T > 25 bps; watch khi > 4,5% | từ 2023 |
| Quốc tế | Giá dầu Brent / WTI | Brent, WTI · % 1 tháng, 1 năm | risk khi YoY > 20%; watch khi > 0 | Brent, WTI từ 2023 |
| Nội địa → NH | Tín dụng so với huy động | TD, TG YoY · chênh (so với 3 tháng trước) | risk khi > 3 đ%; watch khi > 1,5 | 2 đường từ 2021 |
| Nội địa → NH | Lãi suất thị trường 1 (liên ngân hàng) | qua đêm, bình quân 30 ngày, OMO · Δ bps | risk khi bình quân 30 ngày > OMO + 0,5; watch khi > OMO − 0,25 | qua đêm, OMO từ 2025 |
| Nội địa → NH | Lãi suất thị trường 2 (huy động 12 tháng) | 3 nhóm · Δ 3 tháng, Δ từ đầu năm | risk khi Δ3T > 0,2; ok khi < −0,2 | 3 nhóm từ 2024 |
| Nội địa → NH | Thu, chi ngân sách | quý: thu, chi · thu vượt chi … | risk khi thu − chi > 50 nghìn tỷ; watch khi > 0 | cột thu/chi theo quý |
| Ngành | Biên lãi thuần (NIM) | toàn ngành · Δ QoQ, YoY | risk khi YoY < −0,2; watch khi < 0 | `grpLine` 5 đường (toàn ngành navy 2.6, Big 4 purple, Tư nhân lớn tealInk, vừa gold, nhỏ grey) |
| Ngành | Chi phí vốn (COF) | · Δ 2 quý, huy động 12T Δ 3 tháng | risk khi Δ2Q > 0,15 | `grpLine`; phần "cách tác động" có cơ cấu vốn `D.fundMix` theo nhóm và coupon TP 1–3 năm |
| Ngành | Nợ xấu (NPL) và nợ nhóm 2 | · YoY | risk khi NPL > 0,2 hoặc nhóm 2 > 0,3 | `grpLine` NPL |

- Thẻ **"Dòng sự kiện"**:
  - `.filter#evF`: các nút theo `type` (Tất cả, Doanh nghiệp, Quốc tế, Vĩ mô VN, Quy định, Thanh khoản, Lãi suất, Tín dụng…); select `#evN` 10 / 20 / 50 / Tất cả.
  - Bảng: Ngày · Loại · ± (`impact`: `+` xanh `.imp.p`, `−` đỏ `.imp.m`, `?` hoặc `0` xám) · Sự kiện (+ `details.more` Chi tiết + `.src`) · Trạng thái (`pending` → pill "Chờ", ngược lại "Đã diễn ra").
  - Dữ liệu `D.events` (viết cứng trong `build_sector_data.py:653–677`), sắp mới nhất trước.

### 3.5 Tab 5 · Nhật ký chuyên viên ("Cập nhật nhanh") (`paneQuick`, `sector.js:3628`)

Mục 4.1 mô tả chi tiết.

### 3.6 Tab 6 · Consensus CTCK (`paneCons`, `sector.js:3387`)

- `sec-sub` = `CS.note` + "Khoảng dd/mm/yyyy – dd/mm/yyyy".
- **KPI** (6 cột, 5 ô; `full` = ngân hàng có ≥ 3 giá mục tiêu):
  - NH có ≥ 3 CTCK định giá (trên tổng số NH có báo cáo);
  - Upside trung vị (`pos`);
  - P/E fwd 2026 trung vị (so với P/E TTM ngành);
  - P/B tại giá mục tiêu trung vị (so với P/B hiện tại trung vị và P/B ngành);
  - Khuyến nghị "n MUA" + "trung lập · bán".
- **`chPbHist`** (thẻ `#pbHistCard` dựng tay, `.cbox` 280px; tiêu đề và dòng phụ động):
  - Mặc định: "P/B trung vị ngành ngân hàng (26 ngân hàng niêm yết) theo phiên" từ `D.pbDailyS._median`; không có thì dùng `D.pbHist.median` (cuối quý + phiên mới nhất).
  - Bấm một ngân hàng ở bất kỳ chart hoặc bảng nào của tab (`consClick` / `consPick`) thì chuyển sang P/B của ngân hàng đó (màu nhóm) cùng đường "Trung vị 26 NH niêm yết" grey dash. Bấm lại cùng mã thì về mặc định; mỗi lần chọn đều cuộn tới thẻ.
  - Có thêm **đường dự phóng** đỏ dash [6,4]: nội suy tuyến tính từ P/B hiện tại tới **P/B tại giá mục tiêu trung vị** vào 31/12. Các ngày tương lai sinh theo bước 1 ngày (chuỗi phiên) hoặc 7 ngày, bỏ thứ Bảy và Chủ nhật. Dataset này có `keep:true`; tooltip chỉ hiện ở phần tương lai.
  - refLine: TB (grey [2,3]), ±1σ (`#c9a227` [6,4]) của chính chuỗi.
  - Nhãn cuối đường (plugin `pbhEnd`, chỉ khi khung ≥ 640px, padding phải 175px): "{tên} hiện tại / x (dd/mm/yyyy)" và "Nếu đạt giá mục tiêu trung vị / vào 31/12 → P/B x / (n giá mục tiêu)".
  - Insight: P/B hiện tại, z-score, percentile trong chuỗi, thấp nhất/cao nhất, P/B tại TP, rồi Hàm ý.
- Lưới g2, 4 chart tall:

| id | Tiêu đề | Kiểu |
|---|---|---|
| `chUp` | Upside theo giá mục tiêu trung vị | bar ngang, nhãn "MÃ (nTP)", màu nhóm; nhóm < 3 TP màu `#d5d9e2`; refLine x = 0 màu grey; bấm cột → `consPick`. Insight `consIns` (top 3 upside, mã giá đã vượt TP, câu viết cứng về P/B 1,53x tháng 08/2026). Nguồn Wi MCP co_reports, ratio_daily |
| `chPeFwd` | P/E forward 2026 theo LNST dự phóng trung vị | bar ngang, chỉ lấy P/E fwd < 30, tăng dần; mờ khi `n < 3`; refLine x = P/E TTM ngành đỏ |
| `chPbTp` | Định giá P/B: hiện tại so với tại giá mục tiêu | bar ngang P/B hiện tại (màu nhóm, mờ khi < 3 TP) + chấm "P/B tại giá mục tiêu" (nền trắng, viền `#1f2433` rộng 2, bán kính 5); xếp theo tỉ số TP/hiện tại giảm dần; refLine dọc "Ngành x" đỏ và "TB x" grey; `consPbIns` |
| `chPbRoeF` | P/B theo nhóm: hiện tại và tại giá mục tiêu | bar 4 nhóm: hiện tại (màu nhóm), tại TP (`rgba(217,164,0,.75)`); refLine "TB ngành" grey |

- Thẻ **"Chi tiết theo ngân hàng"** (`#consTab`):
  - Cột: NH (+ `details.more` "n báo cáo": nguồn, ngày, khuyến nghị, TP, LNST 26F, tiêu đề) · CTCK · MUA / TL / BÁN · TP trung vị · TP thấp – cao · Giá · Upside · P/B hiện tại · P/B tại TP · LNST 2026F (tỷ) · P/E fwd · Mới nhất.
  - Dòng có `nTP < 3` mang class `stale` (mờ). Bấm dòng → `consPick`.
  - Ghi chú: một số CTCK không ghi khuyến nghị (nhãn "KHÁC").

### 3.7 Tab 7 · Chủ đề nóng (`paneHot`, `sector.js:3508`)

- `sec-sub` "… cập nhật dd/mm/yyyy" (ngày cuối của `dep12State`).
- Lưới g2 gồm 5 thẻ `.card.hot`. Mỗi thẻ có tiêu đề đánh số, 1–2 đoạn chứa số chèn từ dữ liệu, đoạn **"Nhận định:"**, và `.src` "Xem: …" (chỉ chỗ kiểm chứng trên dashboard). **Nội dung viết cứng theo thời sự**, cần sửa tay mỗi đợt:
  1. Chỉ đạo giảm lãi suất: niêm yết đã giảm, vốn biên thì chưa. Số chèn: LS 12T của 3 nhóm, dải coupon TP Big 4 phát hành từ 06/2026.
  2. NIM bị ép từ phía cho vay trước khi chi phí vốn kịp hạ. Số chèn: NIM quý gần nhất so với Q1/2023, COF cùng kỳ → nay, chênh TD − TG.
  3. Fed nghiêng về tăng + dầu ~110 USD. Số chèn: UST 10Y, Brent YoY, xác suất FedWatch cao nhất cho phiên đầu tiên từ 12/2026, CPI, CPI lõi.
  4. Mùa KQKD Q3. Số liệu TCB, VPB, LPB viết cứng; P/B ngành chèn từ dữ liệu.
  5. TT50 và tiền gửi Kho bạc. Số chèn: `ldrSens` Big 4 `ldr20 − ldr50`.
- Thẻ **"Tin ngành mới nhất"**: lấy từ `D.news`, khử trùng theo url, sắp mới nhất trước, lọc tin có gắn mã ngân hàng (`sym`) **hoặc** tiêu đề khớp `/NHNN|tín dụng|lãi suất|nợ xấu|Thông tư|Thống đốc/i`; hiện 14 tin dạng `ul.news` (link · nguồn · ngày · tối đa 4 mã). Nguồn: Wi MCP news_feed (sau đó được nối thêm RSS CafeF, VnExpress qua `build_auto.py`).

### 3.8 Tab 8 · Chart book (`paneBook`, `sector.js:3720`)

Mục 4.3 mô tả chi tiết.

### 3.9 Tab 9 · Sources (`paneSrc`, `sector.js:3550`)

- `sec-sub` "Mọi số là Wi MCP (lưu nguyên văn trong data/raw/wi, không công khai); số tự tính ghi công thức. Lời đọc dưới chart do AI viết từ số đang hiển thị."
- Thẻ **"Nguồn dữ liệu theo nhóm"**: bảng Nhóm · Mã chỉ tiêu / endpoint Wi MCP, lấy từ `D.sources` (10 dòng, xem mục 5.3).
- Lưới g2:
  - Thẻ **"Công thức tự tính"**: IDX-FX, IDX-LIQ (z 36 tháng, tối thiểu 24); kịch bản theo dấu; `D.agg.method`; `D.ldrSens.formula`; `D.consensus.note`; "Giá cổ phiếu = P/B × BVPS (ratio_daily)".
  - Thẻ **"Độ tin cậy và giới hạn"**: `I.deviations` (7 dòng) + 3 dòng viết cứng (tiền gửi NHNN chưa gồm GTCG và liên ngân hàng; room từng NH không công bố; LDR là công thức Wi, chưa theo TT50).

### 3.10 Chế độ Gọn và nút thông tin (`decorate`, `sector.js:3780`; `fs.css:87–90`)

- `body.compact` ẩn `.insight`, `.chart-sub`, `.sec-sub`, `.banner.chain`, `.note:not(.keep)`, `details.more`, `.card > .src`.
- Mỗi `article.card` có `h3.sub`:
  - nếu có `.chart-sub`: thêm nút tròn **(i)** (`.info`, 18px, chữ nghiêng Georgia) trên tiêu đề. Tooltip **tối** hiện mô tả chart;
  - nếu có insight, note hoặc nguồn: thêm hàng `.ibar` cuối thẻ gồm `ⓘ Insight` và `ⓘ Nguồn` (`.ipill`). Tooltip **sáng** hiện tiêu đề + insight + note, hoặc nguồn.
- Thiết bị có hover thì tooltip mở khi rê chuột; thiết bị cảm ứng thì bấm. `Esc`, cuộn trang hoặc đổi kích thước thì đóng.
- `button.info[data-k=txt][data-t=…]` hiện nội dung HTML cho sẵn (dùng ở `miniMatrix` của IDX).

---

## 4. Các tính năng

### 4.1 Nhật ký chuyên viên / Cập nhật nhanh (`paneQuick`, `sector.js:3575–3713`; quy trình `docs/cap-nhat-nhanh.md`)

**Dữ liệu.** `data/quick-updates.json` = `{note, updates:[…]}`. Build chép nguyên vào `D.quick` và sắp `(date, id)` giảm dần (`build_sector_data.py:574`). Bản mới chỉ được thêm vào, không sửa bản cũ. Cấu trúc một bản:
```json
{ "id": "QU-2026-10-26-AI", "date": "2026-10-26",
  "author": {"type": "AI", "name": "Claude", "requestedBy": "Minh Đức"},   // hoặc {"type":"Chuyên viên","name":"…"}
  "follows": "QU-2026-10-24-AI", "vsPrev": "1 câu đã đổi gì",
  "headline": "…", "summary": ["<b>…</b>…"],
  "kpis": [{"l":"COF ngành Q2/26","v":"4,21%","s":"+62 bps YoY · NIM 3,08%","cls":"neg"}],
  "concerns": [{"title":"…","scope":"nganh|noi|qt","status":"mới|nóng lên|tiếp diễn|hạ nhiệt","note":"…","change":"…",
                "charts":[{"id":"chDep","win":12,"last":24,"title":"(tuỳ chọn)","h":"tall","caption":"…",
                           "marks":[{"d":"2026-10-18","t":"CV 9608 (18/10)"}]}],
                "tables":["cpi"]}],          // 'cpi' cũ → tự đổi thành chart gGlCpiBar
  "watch": [{"d":"2026-10-28","t":"…","why":"…"}],
  "sources": ["…"],
  "edited": ["summary.0","concerns.1.status"] }   // chỉ có ở bản chuyên viên sửa
```
Trạng thái `ST`:
- `mới` → pill `watch` "Mới";
- `nóng lên` → `risk` "Nóng lên";
- `tiếp diễn` → pill thường;
- `hạ nhiệt` → `ok`.

Phạm vi `QSCOPE`: nganh "Ngành ngân hàng", noi "Kinh tế trong nước", qt "Quốc tế". Khi phạm vi đổi giữa hai mục liên tiếp thì chèn tiêu đề `h3.qscope`.

**Dựng tab.**
1. `buildAll()`: dựng mọi tab còn lại, mọi tab con, khối ẩn `#vmx` và mọi nước, để `SPEC` có đủ cấu hình chart.
2. `quList()`: danh sách các bản. Bản nháp `localStorage['quDraft']` (nếu id chưa được đăng) được đặt lên đầu và gắn `_draft`.
3. Khối đầu `.qhead.card`:
   - `.qmeta`: ngày, "Cập nhật bởi: [AI] Claude · theo yêu cầu của chuyên viên **Minh Đức**" hoặc "[Chuyên viên] **Tên**";
   - pill "Mới nhất" / "Bản cũ" / "Nháp";
   - nút **✎ Chỉnh sửa** và **⤓ Xuất PDF**;
   - `h3.qtitle` = headline (20px);
   - `p.qprev` "Tiếp nối bản dd/mm/yyyy (AI|chuyên viên X): vsPrev";
   - `ul.qsum` = summary;
   - `.kpis.k4.qk` = kpis.
4. Mỗi concern là một `section.qc`:
   - `.qc-h` gồm số thứ tự `.qn`, `h3` tiêu đề, pill trạng thái (pill "đã đổi" nếu chuyên viên đổi). Bấm `.qc-h` thì thu gọn (`qshut`);
   - `div.qnote`;
   - `p.qchg` "**So với bản trước:** change";
   - lưới chart (g2 nếu > 1 chart), mỗi chart là `article.card.qchart`: tiêu đề (`g.title` hoặc tiêu đề gốc trong `SPEC`), canvas `qu-{i}-{j}-{id}` vẽ lại bằng `drawSpec(id, cid, last, {win, marks})`, `p.qcap` = caption, insight và nguồn của chart gốc (sub ẩn), chân thẻ `.qfoot` "Chart book: `id` · N điểm gần nhất" + nút "Mở trong Chart book →" (`openBook`).
   - Chart không còn trong `SPEC` thì hiện thẻ "Chart `id` không còn trong dashboard."
5. Thẻ "Theo dõi tiếp" (Ngày · Sự kiện · Vì sao quan trọng), dòng `p.qsrc` "Nguồn: …".
6. Thẻ **"Lịch sử cập nhật"** (`.pdf-hide.qhist-card`, `table.qhist`): Ngày (+ nháp) · Người cập nhật · Nội dung chính (+ "sửa n chỗ") · "đang xem" hoặc nút **Xem** (`data-qv`). Kèm ghi chú hai cách cập nhật.

**`drawSpec(src, cid, last, o)`** (`:117`): sao chép cấu hình trong `SPEC`, bỏ `onClick` và `x.min/max`, gắn plugin `markPlug` khi có `marks` (vạch dọc tím kèm nhãn trên trục ngày `dd/mm/yyyy` hoặc trục tháng `mm/yyyy`), rồi `mk(cid, cfg, {last, win})`.

**Chuyên viên sửa bài trên trang.**
- Bấm ✎ thì mọi phần tử `data-f` (`headline`, `summary.k`, `concerns.i.title|note|change|charts.j.caption`, `watch.k.why`) trở thành `contenteditable`; trạng thái chuyển thành `select[data-st]`.
- Thanh công cụ có ô "Người sửa" (`quWho`, nhớ ở `localStorage['quWho']`, mặc định "Minh Đức"), nút **Rà soát chính tả** (chạy `vcCheck` trên các nút chữ và liệt kê "“cũ” → “mới”" vào `.qhint`), **Lưu thành bản mới**, **Huỷ**.
- Lưu (`quSave`):
  - So sánh `cleanHTML` (chỉ giữ chữ và `<b>`; riêng headline, title, why là chữ thuần) với bản gốc.
  - Tạo bản mới: `id = QU-{yyyy-mm-dd}-CV-{Date.now()%100000}`, `author = {type:'Chuyên viên', name}`, `follows` = bản gốc (nếu đang sửa nháp thì là bản mà nháp đó viết tiếp), `vsPrev = "chuyên viên X chỉnh n chỗ (mục 2, tóm tắt…); phần còn lại giữ nguyên bản dd/mm/yyyy."`, `edited` = các khoá đã đổi (cộng dồn khi sửa nháp).
  - Ghi vào `localStorage['quDraft']` (mỗi lúc chỉ có một bản nháp).
- Đoạn đã sửa có vạch vàng `.ed` (`box-shadow: inset 3px 0 0 #d9a400`).
- Bản nháp có thanh `.qdraft` với nút **Sao chép để đăng** (chép "Đăng bản cập nhật nhanh này lên dashboard ngành:\n" + JSON; trình duyệt chặn clipboard thì hiện textarea) và **Xoá nháp**.
- Đăng bản: AI lưu JSON ra file rồi chạy `python3 scripts/add_update.py <file>`. Script bỏ chữ dẫn trước `{`, kiểm tra id chưa có, `author.type`, `follows`, mã chart hợp lệ (đối chiếu `chart_ids.py`), thêm vào JSON, rồi build. `tests/test_sector_data.py::test_quick_updates_valid` còn kiểm tra trạng thái hợp lệ, mỗi concern có ít nhất một chart, và nội dung không chứa chữ "widata".

**Xuất PDF** (`quPdf`, `:3596`):
- Tên file `FinSuccess_Cập Nhật Vĩ Mô Ngày dd-mm-yyyy.pdf` (ngày xuất).
- Dựng bản sao `#quick` trong `.pdf-host`: thanh `.pdf-top` (logo + "Tổng hợp có sự hỗ trợ của AI"); canvas đổi thành ảnh PNG; tiêu đề gắn thêm " Ngày dd/mm/yyyy" (`.qprint-date`); bỏ `#viewNote, .qbtns, .qfoot, .qdraft, .qhint, .rng, .zsel, .rng-hint, .ibar, button.info, .insight, .src` cùng thẻ Lịch sử; bỏ thuộc tính `contenteditable`.
- Nạp lười `html2pdf.js 0.10.1` từ cdnjs. Tham số: margin [10,10,12,10] mm, JPEG 0.95, html2canvas scale 2, A4 dọc, `pagebreak.avoid: ['.card','.qc-h','.qnote','.qchg','tr','.kpi']`.
- Không nạp được thư viện thì dùng `window.print()` với `body.print-quick`.

**Quy tắc nội dung** (`docs/cap-nhat-nhanh.md`):
- Đọc `data/notes.json` (quan điểm chuyên viên) và bản gần nhất của chuyên viên trước khi viết. Đoạn trong `edited` là quan điểm chuyên viên: giữ ý, chỉ cập nhật số.
- Thứ tự bắt buộc ngành → trong nước → quốc tế (cả concerns, summary, kpis); headline mở đầu bằng ý về ngành.
- Mỗi mục có 1–2 chart lấy từ Chart book; dùng `last`/`win` để chỉ hiện giai đoạn gần.
- Mỗi nhận định phải có số; số quan trọng in đậm bằng `<b>`.
- Không nhắc việc làm dashboard (thêm mục, dữ liệu vừa đưa vào, sửa theo góp ý).
- Không ghi WiData làm nguồn; ghi cơ quan công bố gốc.
- Rà chính tả và Việt hoá thuật ngữ trước khi đăng.

### 4.2 Nhận định FinSuccess (FSN, `assets/notes.js`; gắn bằng `viewNoteMount`, `sector.js:529`)

Vị trí: `article.card.fsn#viewNote` ở Bức tranh ngành › mục 1. Gọi `FSN.mount(el, opt)` với:
- `key: 'sector-view'`, `title: '💎 Nhận định FinSuccess <span class="pill">analyst</span>'`, `textLabel: 'Luận điểm'`.
- `fields` gồm 4 ô:
  - select Quan điểm ngành (— / Tích cực / Trung lập / Tiêu cực);
  - select Kịch bản analyst chọn (mặc định "— theo IDX: {kịch bản hiện tại}", hoặc một trong 4 `SCN`);
  - select Nhóm ưu tiên;
  - input Mã ưu tiên (placeholder "VD: CTG, MBB").
- `meta`: các chip `.fsn-chip` "Quan điểm: …", "Kịch bản: …", "Nhóm ưu tiên: …", "Mã ưu tiên: …".
- `seed`: chuyển bản cũ trong `fs-bank-sector.view` (nếu có) thành bản nháp đầu tiên.
- `onSave`: ghi `store.view = {stance, scn, group, picks, note, html, at}` vào `localStorage['fs-bank-sector']`, rồi `header()` cập nhật chip quan điểm.

Hành vi của `FSN.mount`:
- **Xem**: dòng meta (ngày giờ, tác giả, pill "đã đăng" hoặc "bản nháp · tự xoá sau n ngày"), các chip, nội dung `.fsn-body`, nút **Sao chép để đăng** / **Xoá nháp** (chỉ khi có nháp), **Lịch sử (n)** (danh sách `details` theo ngày, bản đầu mở sẵn), **✎ Chỉnh sửa**.
- **Sửa**: các ô `fields` + trình soạn `contenteditable`, thanh công cụ B / I / U / • Danh sách / 1. Danh sách / Xoá định dạng (dùng `document.execCommand`) + nút **Rà soát chính tả & thuật ngữ** (`vcNodes`); ô "Người viết" (`quWho`); **Lưu bản mới**.
- HTML được làm sạch, chỉ giữ `b i u ul ol li br`; `span` có style đậm, nghiêng, gạch chân được đổi thành thẻ tương ứng.
- Lưu trữ:
  - bản nháp ở `localStorage['fsn:sector-view']`: chỉ giữ 1 bản mới nhất; **tự xoá sau 7 ngày**; tự bỏ khi trùng id hoặc nội dung với bản đã đăng, hoặc khi đã có bản đăng mới hơn;
  - bản đã đăng ở `window.FS_NOTES.notes['sector-view']` (`data/notes-data.js`).
  - `versions()` = [nháp] + các bản đã đăng, mới nhất trước.
- Sao chép để đăng tạo JSON `{key, versions:[nháp]}`. AI rà chính tả và ghi các chỗ sửa vào `aiEdits`, rồi chạy `python3 scripts/add_note.py <file>`: script lọc HTML theo regex `</?(b|i|u|ul|ol|li)>|<br>`, ghi `data/notes.json` và `data/notes-data.js`.

**`vcCheck(text)`** (`notes.js:30`) có hai từ điển:
- `VC_ACCENT`: sửa chữ gõ thiếu dấu, ví dụ `cac→các`, `lai suat→lãi suất`, `ty gia→tỷ giá`… (giữ chữ hoa đầu từ);
- `VC_TERM` (~90 cặp): thuật ngữ tiếng Anh đổi thành `tiếng Việt (gốc)`, ví dụ `carry trade → giao dịch chênh lệch lãi suất (carry trade)`. Cụm dài được xét trước; bỏ qua nếu tiếng Việt đã đứng ngay trước hoặc thuật ngữ đã nằm trong ngoặc.

Kết quả trả về `{text, changes:[{from,to,kind}]}`.

### 4.3 Chart book (`paneBook`, `sector.js:3720`)

1. `buildAll()`, rồi liệt kê mọi id trong `SPEC` (mọi chart đã vẽ qua `mk`, kể cả các chart của trang Vĩ mô trong `#vmx` ẩn).
2. Nhóm của mỗi chart lấy theo `cardMeta(el)`: `PANE_LBL[data-pp | pane id]`, ví dụ camel "Xếp hạng TT21", overview "Tổng quan", policy "Chính sách", catalyst "Catalyst", cons "Consensus", hot "Chủ đề nóng", dom "Vĩ mô tiền tệ", bank "Ngân hàng", peer "So sánh ngân hàng", eco "Kinh tế Việt Nam", bond "Trái phiếu", mm "Tỷ giá", idx "Kịch bản IDX". Chart nằm trong `[data-cc]` thì nhóm là "Quốc tế · Mỹ" (v.v.) hoặc "Toàn cầu: lợi suất & lạm phát".
3. Giao diện:
   - `sec-sub` "{n} chart … Mã chart (vd. `chOn`) dùng để gọi trong Nhật ký chuyên viên hoặc nhắn AI.";
   - picker `#bkG` "Tất cả {n}" + từng nhóm kèm số đếm;
   - `.bk-bar`: ô tìm `#bkQ` (placeholder "Tìm chart: tỷ giá, LNH, NIM, P/B…"), tìm trên chuỗi viết thường gồm tiêu đề + id + nhóm + sub đã bỏ thẻ HTML; ghi chú công cụ zoom;
   - lưới g2 `#bkGrid`, mỗi chart là `article.card.bk[data-id][data-g][data-s]`: tiêu đề, sub, canvas `cb-{id}` (`.cbox` 280px), insight, nguồn, `.qfoot` "`id` · nhóm" + nút "Xem ở tab gốc →" (`data-go/sp/cc`; chart thuộc `vmx` thì sang `vimo.html#{sp}`).
4. **Vẽ lười**: dùng `IntersectionObserver` với `rootMargin '300px'`; mỗi thẻ chỉ vẽ một lần (`drawn`). Trình duyệt không có `IntersectionObserver` thì vẽ ngay.
5. Lọc theo nhóm hoặc ô tìm thì ẩn thẻ bằng `hidden` (`.bk[hidden]{display:none!important}`). Trạng thái lọc `bookF` chỉ nằm trong bộ nhớ, không lưu.
6. `openBook(id)`: mở tab Book, đặt ô tìm = id, phát sự kiện `input`.
7. `python3 scripts/chart_ids.py` liệt kê mã chart bằng regex trên `sector.js`: `card({ id:'…', title:'…'`, các mã `fxS_*` từ `SAFE`, và mọi `mk('ch…'` (tiêu đề "(tiêu đề động)").

### 4.4 Khối dựng ẩn `#vmx` (`vmxBuild`, `sector.js:110`)

Các chart vĩ mô đã chuyển sang `vimo.html`, nhưng trang ngành vẫn cần chúng cho Nhật ký chuyên viên, Chart book và hộp chia sẻ ảnh. Vì vậy `buildAll()` tạo thêm `section.pane#vmx[hidden]` chứa `subEco()`, `subBond()`, `subIntl(true)` (kèm Toàn cầu), `subMM()`, `subIdx()`, rồi gọi `chEco(); chBond(); chIntl(); chMM(); chIdx()` và vẽ đủ các nước (`drGL`, `drUS`, `drEA`, `drJP`, `drCN`, `chIntlOverview`). Khối này chỉ được tạo khi mở Nhật ký chuyên viên, Chart book hoặc khi `share.js` gọi `FSSHARE.prep`.

### 4.5 IDX-FX, IDX-LIQ và kịch bản (`build_sector_data.py:147–229`)

Trên trang ngành, IDX hiện ở ô "Kịch bản (IDX)" của header, trong select kịch bản của ô Nhận định, và trong `#vmx` (`chMatrix`, `chIdxHist`, bảng thành phần, backtest; xem phần tài liệu trang Vĩ mô).

Cách tính, **theo tháng** trên lưới `M` = 2019-01 … tháng hiện tại:
- `z_t = (x_t − mean(cửa sổ 36 tháng)) / pstdev(cửa sổ)`; cửa sổ cần **≥ 24** điểm có số và độ lệch chuẩn > 0.
- Chỉ số = `mean(dấu × z)` trên các thành phần có số, cần tối thiểu `max(2, số thành phần − 2)` thành phần (trọng số bằng nhau).

| IDX-FX | Chuỗi | Dấu |
|---|---|---|
| INT-01 `dxy3m` | DXY (235028), % thay đổi 3 tháng | + |
| DOM-02 `usdvnd3m` | USD/VND NHTM bán ra (82223), % 3 tháng | + |
| INT-06 `ust10` | UST 10Y (234521), % | + |
| DOM-04 `spread` | LNH qua đêm trung bình 3 tháng (82237) − EFFR (7079) | − |
| DOM-06 `ext12` | (tổng 12 tháng cán cân XNK 255693 + FDI giải ngân 76951) / 1000, tỷ USD; điền tiếp tối đa 3 tháng | − |

| IDX-LIQ | Chuỗi | Dấu |
|---|---|---|
| DOM-12 `m2` | M2 % YoY (265954), thay cho tiền cơ sở; điền tiếp ≤ 6 tháng | + |
| DOM-07 `on3` | LNH qua đêm trung bình 3 tháng | − |
| DOM-11/10 `depcr` | tiền gửi YoY (265963) − tín dụng YoY (75847) | + |
| DOM-15 `fiscal` | Σ4 quý (chi 75598 − thu 82420) / 1000, nghìn tỷ; gán cho các tháng sau quý, điền tiếp ≤ 5 tháng | + |

- Kịch bản `quad(fx, liq)`: FX ≥ 0 và LIQ ≥ 0 → `drain`; FX < 0 và LIQ ≥ 0 → `ease`; FX < 0 và LIQ < 0 → `room`; FX ≥ 0 và LIQ < 0 → `tight`. Ngưỡng ±1 là mức "mạnh".
- `idx.history` lấy các tháng từ 2021-01 có đủ hai chỉ số. `idx.now` là phần tử cuối. `fxComp` / `liqComp` gồm `{id, key, label, sign, raw, z, contrib}` tại tháng hiện tại.
- Backtest: `P = IDX-FX − IDX-LIQ`, chỉ xét tháng có |P| ≥ 0,5. Dự báo chiều LS huy động 12T NHTM Nhà nước (202886) sau H = 3 và 6 tháng; thay đổi < 5 bps tính là "đi ngang" và không vào tỷ lệ đúng hướng; mục tiêu 60%. Kết quả hiện tại khoảng 41–45%, **chưa đạt**.
- `idxBankBt` (`data/backfill/idx_bank_backtest.json`, từ `scripts/idx_bank_backtest.py`) kiểm định khung kịch bản với giá cổ phiếu ngân hàng 3 và 6 tháng và LNST 2 quý sau. Kết luận ghi trên trang: không đạt.
- Test (`tests/test_sector_data.py`): chỉ số bằng trung bình các đóng góp (sai số < 0,02), kịch bản khớp dấu, số đếm backtest nhất quán.

### 4.6 Mô phỏng CAMELS theo TT 21/2025 (`scripts/camel_tt21.py`)

- Tiêu chí (Điều 19), trọng số định lượng / định tính, tổng = 100: C Vốn 15/5 · A Chất lượng tài sản 25/5 · M Quản trị điều hành 8/7 · E Kết quả kinh doanh 10/5 · L Thanh khoản 10/5 · S Nhạy cảm rủi ro thị trường 2/3.
- 20 chỉ tiêu (Điều 14–15). Ngưỡng ghi theo thứ tự (điểm 5, 4, 3, 2), có bộ ngưỡng riêng cho ngân hàng lớn (TTS bình quân > 300 nghìn tỷ) và nhỏ:

| id | Chỉ tiêu | Hướng | Cách tính từ Wi MCP | Ghi chú |
|---|---|---|---|---|
| C1 | CAR (TT41) | up | `bank_car_tt41.tt41_10` | ưu tiên H1/2026 (2026, Q2), không có thì dùng năm 2025 |
| C2 | Vốn cấp 1 | up | `tt41_09` | |
| A1 | Nợ xấu + VAMC + cơ cấu / tổng nợ | down | (fnx28 + fnx29 + fnx30) / fnx25 | proxy: chỉ nợ xấu nội bảng |
| A2 | Nợ nhóm 2 / tổng nợ | down | fnx27 / fnx25 | |
| A3 | 100 KH lớn nhất | down | — | thiếu số (không công bố) |
| A4 | Nội + ngoại bảng nhóm 3–5 | down | như A1 | proxy |
| A6 | Dư nợ BĐS / tổng dư nợ | down | `ratio_bank.pct_loans_construction_realestate` (lấy kỳ gần nhất có số) | proxy, rộng hơn định nghĩa TT21 |
| A7 | Dự phòng cụ thể / nợ nhóm 2–5 | up | fnx79 / (nhóm 2 + nợ xấu) | |
| A8 | Tài sản Có khác bình quân / TTS bình quân | down | bs210 / bs100 (bình quân 4 quý) | |
| M1 | CIR | down | \|Σisx09\| / Σisx08 | |
| E1 | LNTT / VCSH bình quân | up | Σis150 / bình quân bsx12 | |
| E2 | LNTT / TTS bình quân | up | Σis150 / bình quân bs100 | |
| E3 | NIM | up | `banks.nim` quý cuối kỳ | |
| E4 | Số ngày lãi phải thu | down | bs210_2 cuối kỳ / Σis220 × 365 | |
| L1 | Tài sản thanh khoản cao bình quân / TTS | up | (bs110 + bsx01 + bs170) bình quân / TTS | proxy |
| L2 | Vốn ngắn hạn cho vay trung dài hạn | down | — | thiếu số (không công bố đều đặn) |
| L3 | LDR | down | `ratio_bank.ldr` | công thức TT22 có hệ số KBNN |
| L4 | 10 KH tiền gửi lớn nhất | down | — | thiếu số |
| S1 | Trạng thái ngoại tệ / vốn tự có | zero (lấy \|v\|) | — | thiếu số |
| S2 | Khe hở nhạy cảm lãi suất / VCSH | zero | `interest_rate_gap` / bsx12 | proxy (khe hở ≤ 12 tháng) |

Chấm điểm: hướng `up` cho 5 nếu v ≥ t1, 4 nếu ≥ t2, …; hướng `down`/`zero` cho 5 nếu v ≤ t1, ….

Mỗi tiêu chí lấy bình quân gia quyền điểm các chỉ tiêu. Chỉ tiêu thiếu số tính là pt = 3, lo = 1, hi = 5. `cov` = % trọng số chỉ tiêu có số. Tổng phần định lượng `quant = Σ crit.pt × wq / 100`; trong file dữ liệu `total = quant + 0,30 × 4,0`, nhưng trang tính lại với điểm định tính người dùng nhập.

Các kỳ chấm: FY2021…FY2025 (4 quý trong năm) và TTM2Q26 (Q3/2025–Q2/2026). Số dư lấy bình quân 4 quý, dòng tiền cộng 4 quý.

`creditYtd` và `creditYoY` tính từ `banks.credit` (= `credit_balance`, cho vay + trái phiếu DN). Hằng số `ROOM_COEF 2.6`, `QUAL_DEFAULT 4.0`, `PRIORITY {VCB, MBB, VPB, HDB}`.

Test: tổng trọng số = 100, mỗi tiêu chí có tổng trọng số chỉ tiêu = 100, A1 của CTG ≈ 1,20%, `1 ≤ lo ≤ pt ≤ hi ≤ 5`.

### 4.7 Điều hướng, hash, localStorage

- Hash:
  - `#overview`, `#picture`, …: tab;
  - `#dom`, `#bank`, `#peer`, `#camel`: tab con;
  - `#tab~chartId`: mở tab hoặc tab con rồi cuộn tới chart. Thẻ nhấp nháy viền teal (`.flash`, 1,8 giây). Chart nằm trong mục đang thu gọn thì mục được mở trước.
- Tab con thuộc trang Vĩ mô (eco, intl, mm, idx) thì chuyển sang `vimo.html#…`; ngược lại trang Vĩ mô chuyển sang `nganh.html#…`.

| Khoá localStorage | Nội dung |
|---|---|
| `fs-bank-sector` | `{view:{stance,scn,group,picks,note,html,at}, qual:{MÃ: điểm định tính}}` |
| `fs-ov-mode` | `short` \| `long`: độ dài chữ ở Tổng quan |
| `fs-vc-mode` | `short` \| `long`: hiện giới hạn tỷ lệ ở chuỗi giá trị |
| `fs-col:ov2`, `fs-col:pic`, `fs-col:dom3` | trạng thái mở/đóng các mục (`{idTiêuĐề: true/false}`) |
| `fs-roepb` | `{mode, sel[], hid[]}` của chart ROE–P/B |
| `fsk-order:picture` | thứ tự nút tab con |
| `fsk-cards:nganh.html:{tag}:{i}` | thứ tự thẻ trong từng lưới |
| `quDraft`, `quWho` | bản nháp Nhật ký; tên người sửa hoặc viết |
| `fsn:sector-view` | bản nháp Nhận định FinSuccess |
| `fs-bank-ui` | chế độ hiển thị (luôn `compact`) |
| `fsDevView` | `'1'` = chế độ Developer |

Mọi lần đọc và ghi đều bọc trong `try/catch`.

---

## 5. Mô hình dữ liệu

### 5.1 `window.SECTOR_DATA` (`data/sector-data.js`, khoảng 1,25 MB; bản JSON đẹp ở `data/sector-data.json`)

Quy ước chung:
- Mọi chuỗi thời gian có dạng `[{d:'YYYY-MM-DD', v:number}]`, tăng dần.
- Tỷ lệ tính bằng **%** (đã nhân 100).
- Tiền: tỷ đồng, trừ khi ghi khác.

| Khoá | Cấu trúc · đơn vị | Nguồn / cách dựng |
|---|---|---|
| `meta` | `{title, updated:'YYYY-MM-DD', banks[26], groups{MÃ:nhóm}, note, auto:'…Z'}` | `auto` do `build_auto.py` ghi |
| `idx` | `{now:{m,fx,liq,q}, history[{m,fx,liq,q}], fxComp[], liqComp[], backtest:{h3,h6,target:60,rule}, deviations[7]}` | mục 4.5 |
| `intl` | `dxy, effr, ust10, vn10, cny, brent`: chuỗi cuối tháng | Wi 235028, 7079, 234521, 234526, 235032, 203084 |
| `dom` | 37 chuỗi (bảng dưới) | Wi macro + dulieukinhte |
| `banks` | `{quarters:['Q1/2021'…'Q2/2026'], series:{MÃ:{group, nim, cof, yea, cir, casa, npl, g2, llr, ldr, creditYoY, roe, roa, npYoY, credit (tỷ), mcap (tỷ), pb, pe}}}` (mảng theo quý) | Wi `ratio_bank`, `ratio_bank_ttm`, `ratio_common_ttm` (yêu cầu ≥ 21 mã, quarter=1,2,3,4); CIR < 0 hoặc > 150 → null |
| `ppopSector` | `{q[], end['YYYY-MM'], ppop[], prov[], npat[]}`, nghìn tỷ, cộng 4 quý (TTM) | `fs_bank` tag ppop: is130 (PPOP), is140 (dự phòng, đổi dấu), is190 (LNST) |
| `latest` | `{quarter, priceDate, rows[26]:{s, group, price, pb, pe, mcap (tỷ), bvps, nim, cof, yea, cir, casa, npl, g2, llr, ldr, creditYoY, roe, roa, npYoY, credit, ppop (tỷ, TTM), pppop, provRatio %, ppopYoY %}}` | quý mới nhất của `banks`; định giá theo `ratio_daily` phiên cuối; giá = P/B × BVPS; `build_auto` co giãn theo giá VNDirect |
| `pbHist` | `{banks:{MÃ:[[d,pb]…]}, median:[[d,pb]], note}` | cuối mỗi quý từ `banks.pb` + các phiên trong 45 ngày gần nhất; trung vị khi ≥ 10 mã có số |
| `pbDailyS` | `{d[], v:{MÃ|_median:[pb|null]}}` | `data/backfill/pb_daily.json` từ 2022-10-21; chỉ giữ mã có ≥ 200 phiên |
| `agg` | `{method, series:{nim\|cof\|yea\|casa\|npl\|g2\|llr\|ldr\|creditYoY\|roe\|cir: {all, 'Big 4', …:[theo quý]}}}` | **bình quân gia quyền theo dư nợ** `credit_balance` (bỏ qua mã thiếu số) |
| `secVal` | `{monthly[{d,pb,pe,mcap (nghìn tỷ),pppop}], from, now{…}, pb{mean,sd}, pe{mean,sd}, pppop{mean,sd}, profitTTM (nghìn tỷ)}` | Wi `sector_ratio_daily` ngành 107, lấy giá trị cuối tháng; σ = pstdev; P/PPOP = vốn hoá / PPOP 4 quý đã công bố (quý kết thúc + 30 ngày) |
| `consensus` | `{from, to, note, rows[{s, group, n, nTP, buy, hold, sell, tpMed, tpMin, tpMax, upside, np26 (tỷ), peFwd, pbTP, latest, reports[{src,d,rec,tp,np26,np27,title}]}]}` | Wi `co_reports` (≥ 11 mã). **Mỗi CTCK lấy 1 báo cáo mới nhất**; TP = `target_price_adjusted`; upside = TP trung vị / giá − 1; P/E fwd = mcap / LNST 2026F trung vị; pbTP = TP trung vị / BVPS. `build_auto` tính lại upside theo giá mới |
| `news` | `[{d, t, src, url, sym[]}]`, tối đa 200 | Wi news_feed + RSS CafeF, VnExpress |
| `goldWi` | chuỗi giá vàng USD/oz | Wi 74407; COMEX qua Yahoo |
| `fee` | `{lines[7]{k,name}, years[], sector{năm:{k:{inc,exp,net}}}, group{…}, table{year,prev,rows[{k,name,inc,net,margin,incYoY,netYoY,share}]}, banks[], n}` | `scripts/fee_lines.py` (thuyết minh thu, chi dịch vụ theo loại); chỉ lấy năm có ≥ 24 NH |
| `ldrSens` | `{quarter, rows[{s,group,kbnn (tỷ),kbnnPctDep %,ldr20,ldr0,ldr50}], formula}` | `LDR(c) = Cho vay KH (bs160_1) / (D20 + (c − 0,2) × KBNN)`, trong đó `D20 = cho vay / LDR Wi`; KBNN = fnx107 (cận trên) |
| `camel` | `{periods{FY2021…TTM2Q26:{label, rows[{s,group,big,taAvg,v{id:{v,s}},crit{C..S:{pt,lo,hi,cov,w}},quant{pt,lo,hi},total,grade,room,cov,a6From,carPeriod,creditYtd,creditYoY,priority}]}}, crit, ind[20], roomCoef, qualDefault, priority[]}` | mục 4.6 |
| `reg`, `regRef` | `data/regs.json` → `items[{id,rule,level,doc,eff,until?,path,ref,flag?}]`, `analysis{t,u}` | biên tập tay; test yêu cầu không còn `flag` |
| `sbv` | `{asOf, current[{k,v,since,doc,src,url,verify,note}], events[{d,dType,tool,t,detail,dir,impact,doc,src,url,verify,note}]}` | `data/sbv-log.json`, biên tập tay; events sắp giảm dần. Test: ≥ 40 mốc, `tool` thuộc 7 loại, `dir` ∈ {nới, thắt, trung tính}, mọi dòng có `url` http, `src`, `impact`, không chứa "widata"; tái cấp vốn bắt đầu bằng "4,5%" |
| `quick` | `data/quick-updates.json`, updates sắp giảm dần | mục 4.1 |
| `signals` | `[{id:'R-01'…'R-16', layer, rule, now, state:ok\|watch\|risk\|na, impact}]` (13 tín hiệu) | `build_sector_data.py:626–641`; dùng ở `chainCard` (IDX) |
| `fundMix` | `{q, note, groups{all, nhóm:{dep, ib, gtcg, gov} %}}` | `data/backfill/fund_mix.json` (fs_bank bs330/bs320/bs360/bs310) |
| `idxBankBt` | `{from, to, price{h3,h6:{byq{q:{n,mean,pos,ex}}, hit, base, hitX…}}, earn{byq}}` | `data/backfill/idx_bank_bt.json` |
| `regRatios` | `{q:'2026Q2', qPrev, qLbl, qEnd{}, var{ldr:'C', sflr:'S2'}, periods[{k,l}], err{ldr,sflr,all}, agg{q:{raw,ldr,sflr}}, rows[{s,group,ldr{q},raw{q},sflr{q},self{asof,ldr,sflr,reserve,pay30,lcr,nsfr,src,note},selfPrev}]}` | `scripts/reg_ratios.py` → `data/backfill/reg_ratios.json` |
| `events` | `[{d,type,t,impact:'+'\|'−'\|'0'\|'?',status:'pending'\|'done',detail,src}]` | viết cứng trong build |
| `sources` | `[[nhóm, mô tả mã]]` (10 dòng) | viết cứng |

Các chuỗi trong `D.dom` (mã chỉ tiêu Wi MCP):

| Khoá | Ý nghĩa · tần suất | Mã |
|---|---|---|
| `nhtmSell`, `nhtmBuy`, `free`, `central`, `ceiling`, `sbvSell` | tỷ giá NHTM bán/mua, tự do, trung tâm, trần, NHNN bán; cuối tháng | 82223, 82224, 82226, 82227, 82228, 82231 |
| `freeD`, `nhtmD` | tự do, NHTM theo ngày (theo tuần trước 07/2025) | 82226, 82223 (`daily_merged`); `freeD` nối thêm "chợ đen" từ dulieukinhte |
| `on`, `omo`, `net` | LNH qua đêm, lãi suất OMO, bơm/hút ròng; tháng | 82237, 81522, 82268 |
| `onDaily`, `omoDaily`, `netDaily` | theo phiên | như trên |
| `dep12State/Large/Other` (+`D`: ngày từ 10/2024) | LS huy động 12T NHTM Nhà nước / lớn (MBB, ACB, TCB, VPB) / khác | 202886, 202874, 202880; `dep12State` nối thêm LS 12 tháng Vietcombank từ dulieukinhte |
| `m2`, `depYoY`, `creditYoY`, `creditYtd`, `depHH`, `depCorp` | % | 265954, 265963, 75847, 241732 (+ dulieukinhte), 265981, 265972 |
| `cpi`, `cpiCore`, `cpiAvg` | % YoY | 75701, 202889, 75804 |
| `reserves` | dự trữ ngoại hối, triệu USD (trang chia 1000) | 76885 |
| `trade`, `fdi` | cán cân XNK, FDI giải ngân; triệu USD/tháng | 255693 (+ tính từ XK − NK dulieukinhte), 76951 |
| `revQ`, `expQ` | thu, chi NSNN theo quý, tỷ đồng | 82420, 75598 |
| `lnh` | `{ON,1W,1M,3M,6M,9M:[{d,v}]}` theo phiên | NHNN qua dulieukinhte (`build_auto.py`) |
| `omoOut`, `tpOut` | OMO và tín phiếu đang lưu hành, tỷ đồng, theo phiên | NHNN qua dulieukinhte |

Chuỗi macro được gộp từ mọi lần kéo Wi (`build_sector_data.py:67–100`). Mỗi tháng giữ một giá trị theo độ ưu tiên daily (4) > monthly (3) > weekly (2) > quarterly (1); cùng mức ưu tiên thì giữ ngày mới hơn. Lợi suất TPCP và Brent luôn lấy ngày cuối tháng.

### 5.2 Dữ liệu khác trang ngành dùng

- `ECO_DATA` (`eco-data.js`, `scripts/build_eco.py`): `bankIdx` (cho `ovCycle`), `credY`, `m`, `s.cpi_trans`… (phần tài liệu trang Vĩ mô).
- `BOND_DATA` (`bond-data.js`, `scripts/build_bond_data.py`): `big4{months, names, bank{}, dep[], items[{s,d,t,c,v}]}`, `gb.curve{d[], '1Y'…'20Y'}`, `fi`, `cb`, `dep`, `src{big4, curve}`…
- `VIRA_DATA` (`vira-data.js`, `fetch_vira.py`, `build_vira.py`): `{d[], vnd{ON…1Y:[]}, usd{}, sofr{SW,2W,1M…}, src{d:url}}`.
- `GLOBAL_DATA` (`global-data.js`): `fedwatch{target[lo,up], meetings[{date,probs{'3.75-4.00':%},exp_rate,kalshi,poly}], mpt, dots, asOf}`, `fedwatchHist`, `ois{hist{d:{3M,1Y,…}}, tenors, sofr, sofrHist}`, `ustCurve{t[], c[{n,d,v[]}]}`, `s{key:{d[],v[]}}` (`us_10y_d`, `us_walcl`, `us_brent_d`…).
- `FX_DAILY` (`fx-daily.js`): `s.vn_sbv_central_d / ceil_d / floor_d / sell_d`, `usdvnd_vcb_sell`, `dxy_d` (DXY tính theo công thức ICE từ tỷ giá ECB).
- `FS_NOTES` (`notes-data.js`): `{notes:{'sector-view':[{id, at:'YYYY-MM-DD HH:MM', author, f{stance,scn,group,picks}, html, text, aiEdits?}]}}`.

### 5.3 Quy trình dựng dữ liệu

1. **Bản đầy đủ từ Wi MCP** (chạy tay trong phiên Claude):
   - gọi WiMCP;
   - `python3 scripts/wi_capture_transcript.py <transcript.jsonl>` → `data/raw/wi/*.json` (không commit);
   - `python3 scripts/reg_ratios.py`, `scripts/idx_bank_backtest.py` (backfill);
   - `python3 scripts/build_sector_data.py` (tự gọi `build_auto.py` ở cuối);
   - `python3 tests/test_sector_data.py`.
   - Endpoint Wi đã dùng:
     - `wi_data_macro` (các mã chỉ tiêu ở 5.1);
     - `wi_data_gbond/bonds_gov_yield_curve`;
     - `wi_data_commodity` (203084, 74407);
     - `wi_data_companies`: `ratio_bank`, `ratio_bank_ttm`, `ratio_common_ttm`, `ratio_daily`, `fs_bank` (tag ppop; bs160_1, bs210_2, bs330…), `fs_bank_notes` (fnx25…fnx30, fnx79, fnx107…), `bank_car_tt41`, `bank_liquidity_risk`, `co_reports`;
     - `wi_data_sector/sector_ratio_daily` (ngành 107);
     - `wi_data_news` (news_feed, ai_news).
2. **Lớp tự động** (`.github/workflows/fetch-global.yml`, cron 06:17 và 16:47 các ngày làm việc, giờ Việt Nam):
   - các script `fetch_*` (global, ust, fedwatch, ois, dlkt, market, cmd…);
   - `build_global.py`, `build_auto.py`, `build_eco.py`…;
   - commit `data/sector-data.js` / `.json` rồi deploy lại.
   - `build_auto.py` không gọi Wi; nó nối thêm số mới vào bản Wi:
     - giá, P/B, P/E, vốn hoá 26 NH từ VNDirect (`data/vn/market.json`), co giãn theo giá;
     - `secVal.now` co giãn theo tổng vốn hoá / vốn chủ / lợi nhuận;
     - upside consensus tính lại;
     - giá vàng;
     - tin RSS;
     - `dom.creditYtd`, `freeD`, `dep12State`, `trade` từ dulieukinhte (`DOM_MAP`, `DOM_CALC`);
     - `dom.lnh`, `omoOut`, `tpOut` (ghi đè toàn bộ).
   - Báo cáo ghi ở `data/vn/auto-report.json`.
3. **Dữ liệu biên tập tay**:
   - `data/sbv-log.json`: mỗi dòng có link nguồn gốc;
   - `data/regs.json`;
   - `data/quick-updates.json` (`add_update.py`);
   - `data/notes.json` (`add_note.py`);
   - các sự kiện và chữ viết cứng trong `build_sector_data.py` (`events`, `sources`, `signals` R-02, R-10, R-11) và trong `sector.js` (Tổng quan, Chủ đề nóng, một số insight).

---

## 6. Quy tắc nội dung thể hiện trong code

1. **Phân vai**:
   - số liệu lấy từ nguồn (Wi MCP hoặc nguồn công bố);
   - lời đọc dưới chart (insight) do AI viết hoặc code tự tính từ số đang hiển thị, luôn kết thúc bằng **"Hàm ý:"** (`how()`);
   - quan điểm FinSuccess **chỉ** nằm ở ô Nhận định FinSuccess (chuyên viên viết) và trong các bản Nhật ký của chuyên viên.
2. **Định dạng số**:
   - locale vi-VN;
   - dấu trừ `−`;
   - lần (`x`), `đ%` hoặc `điểm %` cho chênh lệch tỷ lệ, `bps` cho lợi suất;
   - "nghìn tỷ" cho số lớn;
   - ngày `dd/mm/yyyy`, tháng `mm/yyyy`, quý `Qn/yyyy` hoặc `Qn/yy`.
3. **In đậm** (`<b>`) các số quan trọng trong insight, Nhật ký, Chủ đề nóng; CSS tô `.insight b` màu navy.
4. **Ghi nguồn**: dòng `.src` "Nguồn: …" ở mọi thẻ, chữ xám nhỏ, bị ẩn ở chế độ Gọn. Trong Nhật ký, nhật ký NHNN và các bản public, **không ghi WiData làm nguồn**, mà ghi cơ quan công bố gốc (test kiểm tra chuỗi "widata"). Trên chart, số lấy từ Wi ghi "Wi MCP {mã}".
5. **Độ tin cậy**:
   - consensus chỉ coi là đủ tin cậy khi có ≥ 3 giá mục tiêu; dưới mức đó thì tô màu nhạt `#d5d9e2` hoặc dòng `stale`;
   - ẩn P/E > 60 ở chart so sánh và P/E fwd ≥ 30;
   - CIR âm hoặc > 150% bị bỏ;
   - CAMELS ghi rõ đây là ước tính (kết quả thật là mật theo Điều 24), các chỉ tiêu proxy, khoảng điểm của chỉ tiêu thiếu số, và chênh lệch < 0,1 điểm nằm trong sai số;
   - IDX ghi các chỗ lệch so với deck và nhãn "chưa đạt" / "không đạt".
6. **Thứ tự trong Nhật ký**: ngành → trong nước → quốc tế. Nội dung chỉ nói diễn biến, số liệu, quan điểm; không nhắc việc làm dashboard. Bản AI không bị ghi đè: chuyên viên sửa thì tạo bản mới có `follows`, `edited`, vạch vàng.
7. **Hai độ dài chữ** ở Tổng quan (Ngắn gọn mặc định / Đầy đủ); thuật ngữ và tỷ lệ luôn có công thức + cách đọc.
8. **Rà soát chữ của chuyên viên**: sửa gõ thiếu dấu, Việt hoá thuật ngữ tiếng Anh và giữ gốc trong ngoặc ở lần đầu; viết tắt chuẩn ngành giữ nguyên (NIM, CASA, LDR, OMO, QT); không đổi ý, không đổi số.
9. **Chế độ Gọn** là mặc định duy nhất: người đọc thấy chart trước, bấm ⓘ để xem insight và nguồn.

---

## 7. Các điểm cần lưu ý khi dựng lại

- `sector.js` đọc `D.meta`, `D.idx`, `D.latest`, `D.banks`, `D.agg`, `D.secVal`, `D.dom.creditYtd` ngay khi nạp (`:30, :185–186`). Thiếu một trong các khoá này thì trang không chạy.
- Chart vẽ lười theo tab và tab con (`built`, `pDone`). `SPEC` chỉ đầy đủ sau `buildAll()`, nên Nhật ký và Chart book luôn gọi `buildAll()` trước.
- Header lấy chip quan điểm từ `localStorage`, không lấy từ bản đã đăng, nên khách xem lần đầu luôn thấy "CHƯA NHẬP".
- Nhiều đoạn chữ thời sự viết cứng phải sửa tay mỗi đợt: Chủ đề nóng; insight `chMoney`, `chCredit`, `chExt`, `chFiscal`, `chOn`, `nimDepInsight`, `chSbvStance`, `consIns`, `aqInsight`; `D.events`; R-10.
- Code thừa và lỗi nhỏ:
  - `tiles` trong `sbvBlock` được tính nhưng không render;
  - nút "Chart: đường cong OIS Mỹ" ở Tổng quan trỏ tới `gUsOis` nằm trong khối ẩn;
  - các bản Nhật ký cũ trỏ tới `chLdrSens`, chart đã bị bỏ.
- Mã chart hợp lệ cho Nhật ký: `python3 scripts/chart_ids.py`.
