# 4 · Trang Vĩ mô

Trang "Vĩ mô Việt Nam & Thế giới" là trang thứ hai trong bộ dashboard. Nó **không có file JS riêng**: toàn bộ nội dung do `assets/sector.js` dựng (file này dùng chung với `nganh.html`, phân nhánh theo `document.body.dataset.page`). Phần này mô tả những gì `vimo.html` hiển thị, các tính năng đi kèm (lịch kinh tế, bản đồ nhiệt, mô hình rủi ro, ảnh bảng…) và đường đi dữ liệu từ nguồn công bố tới từng biến `window.*`.

Quy ước trích dẫn: `sector.js:1234` = `assets/sector.js` dòng 1234; `fs.css:69` = `assets/fs.css`; script Python nằm ở `scripts/`.

---

## 1. Giải phẫu trang

### 1.1. Khung HTML (`vimo.html`, 64 dòng)

| Khối | Nội dung | Ghi chú |
|---|---|---|
| `<head>` | script kiểm tra phiên bản (`version.json`, giá trị `__BUILD__` được `scripts/gom_site.sh` thay bằng 7 ký tự SHA commit); `<title>Vĩ mô Việt Nam &amp; Thế giới · FinSuccess</title>`; favicon 32/192; `assets/fs.css`; `assets/devview.js`; `speculationrules` prerender `*.html` (moderate) + prefetch `vimo.html`, `nganh.html` (eager) | Nếu máy chủ có `version.json` khác với `__BUILD__` thì `location.replace(…?_v=<v>)` để bỏ cache cũ |
| `<body data-page="vimo">` | **bắt buộc** — `sector.js:7` đọc `PAGE` từ đây | thiếu thuộc tính này trang sẽ dựng như `nganh` |
| `.logo-bar` | logo `assets/fin-success-logo.png` + `nav.site-nav` (link `vimo.html` có class `on`, `nganh.html`, ô chọn ngân hàng `select` → `vcb/bid/index(CTG)/tcb/mbb/acb.html`, 20 mã "sắp có" `disabled`, `bh.html`, `ck.html`, ô `BH · CK` class `devonly` → `dn.html?s=…`, `backend.html`) + `div#stamp` | `#stamp` = "Cập nhật dữ liệu dd/mm/yyyy" (`sector.js:202`) |
| `.stock-head > .wrap#stockHead` | do `headerVimo()` (`sector.js:191-203`) điền | xem 1.3 |
| `nav.tabs[role=tablist] > .wrap#tabbar` | 8 nút `button[role=tab][data-tab]` | xem 1.2 |
| `main > .wrap` | 8 `section.pane[role=tabpanel]` id: `heat` (class `active`), `vn`, `world`, `cmd`, `vrisk`, `quick`, `book`, `src` | |
| `footer > .wrap#foot` | "FinSuccess · Dashboard Vĩ mô · dữ liệu cập nhật dd/mm/yyyy. Không phải khuyến nghị đầu tư." (`sector.js:3758-3760`) | |

### 1.2. Thanh tab

| `data-tab` | Nhãn | Hàm dựng (`builders`, `sector.js:3761`) |
|---|---|---|
| `heat` | 1. Việt Nam &amp; Thế giới | `paneHeat` (`sector.js:2510`) |
| `vn` | 2. Việt Nam | `paneVN` (`sector.js:689`) → tab con `eco`, `dom` |
| `world` | 3. Quốc tế | `paneWorld` (`sector.js:699`) → tab con `intl`, `mm`, `idx` |
| `cmd` | 4. Hàng hóa | `paneCmd` (`sector.js:2615`) |
| `vrisk` | 5. Catalyst · Risk | `paneVRisk` (`sector.js:3355`) |
| `quick` | 6. Nhật ký chuyên viên | `paneQuick` (`sector.js:3628`) |
| `book` | 7. Chart book | `paneBook` (`sector.js:3720`) |
| `src` | 8. Sources | `paneSrc` (`sector.js:3550`) |

Tab con (`SUBS`, `sector.js:656-658`) trên trang Vĩ mô:

```js
{ vn: [['eco','Kinh tế'], ['dom','Tiền tệ']],
  world: [['intl','Các nền kinh tế'], ['mm','Tỷ giá'], ['idx','Kịch bản IDX-FX × IDX-LIQ']] }
```

Mỗi tab con là `div.sub[data-pp=<khoá>]`, thanh nút là `div.subtabs[data-sn=<tab>]` (`subBar`, `sector.js:663`). Hàm vẽ chart của từng tab con (`PDRAW`, `sector.js:661`): `eco → chEco()`, `dom → chDom(); chBond()` (trên Vĩ mô không gọi `drUsMini`), `intl → chIntl()`, `mm → chMM()`, `idx → chIdx()`. Tab con chỉ vẽ lần đầu được mở (`pDone`).

Trong `intl` còn một tầng nữa: nút nước `div.subtabs.cty > button[data-c]` và khối `div.csub[data-cc]` (`GCOUNTRY`, `sector.js:1039`): `us` Mỹ (mở sẵn), `ea` Khu vực đồng Euro, `jp` Nhật Bản, `cn` Trung Quốc, `ov` Tổng quan (chuỗi IDX). Trên Vĩ mô `subIntl(false)` **bỏ khối `gl`** — phần "Toàn cầu" chuyển sang tab 1 (`paneHeat` gắn `<div data-cc="gl" data-book="1">${gGL()}</div>`).

### 1.3. Đầu trang (`headerVimo`)

`div.tick` "VĨ MÔ"; `div.cname` "Việt Nam và thế giới · Kinh tế, tiền tệ, thị trường" + `<small>` "số liệu tự cập nhật từ nguồn công bố · lần dựng dd/mm/yyyy" (`TODAY = SECTOR_DATA.meta.updated`). Năm ô `div.hstat`:

| Nhãn | Giá trị | Nguồn |
|---|---|---|
| GDP Qn/yy | `pc(v,2)` | `ECO_DATA.gq.gdp` quý cuối (`gqLast`) |
| CPI mm/yyyy | `pc(v,2)` | `SECTOR_DATA.dom.cpi` |
| LNH qua đêm | `pc(v,2)` | `dom.onDaily` |
| USD/VND NHTM | `nf(v)` | `dom.nhtmD` (nếu có) hoặc `dom.nhtmSell` |
| UST 10Y | `pc(v,2)` | `GLOBAL_DATA.s.us_10y_d` |

### 1.4. Thứ tự script (bắt buộc giữ)

```
Chart.js 4.4.1 (cdnjs chart.umd.min.js)
assets/chat-config.js → assets/chartkit.js (FSK) → assets/share.js
data/calendar-data.js → assets/calendar.js         (lịch kinh tế; tự chạy, cần Chart để đăng ký plugin calMark)
data/global-data.js → data/fx-daily.js → assets/fxchart.js (FSFX)
data/vira-data.js → data/sector-data.js → data/eco-data.js → data/hm-hist.js → data/cmd-data.js
data/vimo-risk.js → data/bond-data.js → data/notes-data.js → assets/notes.js (FSN, vcCheck)
assets/tblshot.js (FSTbl) → assets/sector.js → assets/chat.js
```

`sector.js` đọc các biến sau tại lúc nạp (thiếu biến nào thì phần đó trả về banner "Chưa có số liệu…" hoặc rỗng): `SECTOR_DATA` (bắt buộc — `D.meta`, `D.dom`, `D.intl`, `D.idx`, `D.quick`, `D.sources`…), `ECO_DATA`, `GLOBAL_DATA`, `FX_DAILY` (qua `FSFX`), `VIRA_DATA`, `HM_HIST`, `CMD_DATA`, `VRISK`, `BOND_DATA`, `CAL_DATA` (qua `calendar.js`). `calendar.js` phải nạp **trước** `sector.js` vì nó đăng ký plugin Chart.js `calMark` dùng cho mọi chart vẽ sau đó.

### 1.5. Khởi động (`sector.js:3828-3838`)

1. `header(); footer();`
2. Đọc `location.hash` dạng `#<khoá>` hoặc `#<khoá>~<idChart>`:
   - có `~` → `goChart(p, cid)`: mở tab/tab con rồi cuộn tới card chứa canvas `cid`, thêm class `flash` 1,8 s (`fs.css` `article.card.flash{box-shadow:0 0 0 3px var(--teal)}`); khoá không thuộc trang này → chuyển sang `nganh.html#p~cid`.
   - khoá là tab con (`eco`, `dom`, `intl`, `mm`, `idx`) → `openP`;
   - `#gl` → tab `heat`;
   - còn lại → `show(h)` (khoá lạ → tab đầu `heat`).
3. `decorate()` + `MutationObserver` trên `main`: mỗi `article.card` có `h3.sub` được thêm nút `(i)` (nếu có `.chart-sub`) và thanh `.ibar` với nút "ⓘ Insight"/"ⓘ Nguồn" (`sector.js:3780-3796`).
4. `setMode('compact')` — trang **chỉ dùng chế độ Gọn**: `body.compact` ẩn `.insight, .chart-sub, .sec-sub, .banner.chain, .note:not(.keep), .card>.src` (`fs.css:90`), hiện `.ibar` (`fs.css:87`). Người đọc bấm (i)/ⓘ để xem tooltip `.tip` (dark cho mô tả, light cho insight/nguồn).
5. `show(k)` cập nhật `history.replaceState('#'+k)`; `openP(k)` cập nhật `#<tab con>`.
6. `window.FSNAV = { show, openP, openC, reveal(lk) }` cho lịch kinh tế; `window.FSSHARE = { prep: buildAll, path(card) }` cho hộp chia sẻ ảnh (đường dẫn "Tab › Tab con › Nước").

---

## 2. Hệ thống dựng card và chart dùng chung

### 2.1. `card({ id, title, sub, insight, src, h, ctl, body, cls })` — `sector.js:166-177`

```html
<article class="card {cls}">
  <h3 class="sub">{title}[<span class="ctl" data-ctl="{id}"></span>]</h3>
  <p class="chart-sub">{sub}</p>
  <div class="cbox {h}"><canvas id="{id}" role="img" aria-label="{title}"></canvas></div>
  {body}
  <div class="insight">{insight}</div>
  <div class="src">Nguồn: {src}</div>
</article>
```

- Không truyền `insight` mà `INS[id]` tồn tại → insight = `INS[id]()` (khối `INS`, `sector.js:885-1006`).
- `src` bắt đầu bằng "Nguồn:" thì bị cắt để không lặp.
- **Chiều cao `.cbox`** (`fs.css:69-70, 631, 647`): mặc định **280px**; `tall` **340px**; `short` **230px**; `xl` **600px** (≤700px: 520px). Trong bảng rủi ro chart đặt cứng `height:260px` (biểu đồ lag 180px).

### 2.2. `mk(id, cfg, opt)` — `sector.js:139-160`

- Huỷ chart cũ cùng id; đặt `interaction = {mode:'index', intersect:false}` (trục `y` nếu `indexAxis:'y'`).
- Có `refLines` với nhãn trên trục x → chừa `layout.padding.top ≥ 18`.
- `FSK.prep(cfg)`: chart trộn line + bar → line `order:0`, bar `order:10` (đường luôn nằm trên cột).
- Lưu `SPEC[id] = {cfg (deep clone), el}` (trừ id bắt đầu `cb-`, `qu-`) → Chart book và Nhật ký chuyên viên vẽ lại được.
- `FSK.enhance(chart, {today, last, win})` (`chartkit.js:101`): thêm thanh `.rng` phía trên canvas với nút **1M · 3M · 6M · YTD · 1Y · 3Y · 5Y · Tất cả** (`RANGES`, `chartkit.js:6`), nhóm nút trục Y ("Y vừa dữ liệu / Y tuỳ chỉnh / Y mặc định"), kéo chuột để zoom, nhấp đúp về toàn bộ. `opt.win = N` mở sẵn khung N tháng; `opt.last = N` mở sẵn N điểm cuối. Chart `scatter` và cột ngang (`indexAxis:'y'`) không có thanh này; nhãn trục phải là ngày (`dd/mm/yyyy`) hoặc tháng (`mm/yyyy`) và ≥ 6 điểm.
- `opt.switch` + `ctl:true` → nút "Cột / Đường" trong tiêu đề.

### 2.3. Mặc định Chart.js (`sector.js:45-56`)

Font `Arial, "Helvetica Neue", sans-serif` 11.5px, màu chữ `#3f4656`, legend dưới, `boxWidth:12`, `maintainAspectRatio:false`, `animation:false`. Tooltip: `"{label}: {nf(v, ds.dp ?? 1)}{ds.unit}"`, hoặc `ds.$tip(i)` nếu dataset có. Số định dạng `vi-VN` (dấu phẩy thập phân).

Hàm tiện ích: `L(label, data, color, o)` = dataset line `borderWidth:2, pointRadius:0, dp:2, unit:'%', spanGaps:true` (`sector.js:163`); `pctAxis(title)` ticks `nf(v,1)+'%'`, grid `#eef0f4`; `numAxis(title)` ticks `nf(v,0)`.

### 2.4. Plugin

| Plugin | Ở đâu | Làm gì |
|---|---|---|
| `refLines` | `sector.js:57-76` | vạch ngang/dọc nét đứt `[5,4]`, mặc định đỏ `#c0392b`, rộng 1.5; nhãn dạng "viên thuốc" nền trắng 90%, chữ `600 11px Arial`; nhiều nhãn ngang tự giãn ≥15px |
| `quadBg` | `sector.js:78-89` | nền 4 ô kịch bản cho `chMatrix` (`#e3f5ec` Nới lỏng mạnh, `#fff4d6` NHNN hút tiền về, `#eef1fb` Dư địa bơm tiền, `#fde8e6` Thắt chặt kéo dài) + vạch ±1 `#c3c9d6` |
| `qMarks` (`markPlug`) | `sector.js:124-136` | vạch dọc tím `#861C52` tại mốc sự kiện — chỉ khi Nhật ký chuyên viên vẽ lại chart với `marks` |
| `jpiBand` | `sector.js:1824-1832` | dải xanh nhạt `rgba(40,60,130,.08)` "Vùng can thiệp 12 tháng: lo–hi" trên chart USD/JPY |
| `fxRebase` | `sector.js:1850-1854` | trước mỗi lần cập nhật, quy dữ liệu `$raw` của dataset về **% thay đổi so với điểm đầu khung đang xem** (dùng cho chart tỷ giá nhóm và hàng hóa nhóm) |
| `qband` (nội tuyến) | `sector.js:3067` | tô nền từng tháng theo kịch bản trên `chIdxHist` |
| `calMark` | `calendar.js:196-215` | vạch dọc tím + nhãn "Kỳ tới: …" ở mép phải chart có liên kết lịch, chỉ trong 7 ngày trước kỳ công bố; bấm nhãn mở lịch tại tin đó |

### 2.5. Bảng màu

`C` (`sector.js:9`): `navy #002060`, `blue #97BAFF`, `teal #59C5C8`, `tealInk #1f8a8d`, `purple #861C52`, `gold #d9a400`, `red #c0392b`, `grey #9aa3b2`, `steps ['#002060','#3D5C99','#5576B8','#6171C5','#8997D6','#B3BDE8','#D9DEF4']`.
`PAL` (`sector.js:1041`): `#1D2678 #c0392b #1f8a8d #d9a400 #861C52 #4f9bd1 #7a8291`.
`PAL2` (`sector.js:1351`, 16 màu): `#1D2678 #c0392b #1f8a8d #d9a400 #861C52 #4f9bd1 #7cc49b #ef9f76 #8997D6 #5b3a8c #b5651d #2e8b57 #e377c2 #6b6b00 #17becf #9aa3b2`.
Màu cột dương/âm hay dùng: xanh `rgba(31,138,141,.7)` / đỏ `rgba(192,57,43,.7)`; cột navy `rgba(29,38,120,.75)`.
CSS token (`fs.css:3-5`): `--navy:#1D2678 --blue:#2938A8 --teal:#59C5C8 --teal-ink:#1f8a8d --purple:#861C52 --gold:#FFD45D --pos:#1e8f5a --neg:#c0392b --bg:#F7F9FD --radius:16px`.

### 2.6. Mẫu insight

Mọi insight có hai phần: câu số liệu (số quan trọng bọc `<b>`) + `how(t)` = `<br><span class="howto"><b>Hàm ý:</b> …</span>` (`sector.js:884`). Hàm hỗ trợ: `gv(k)`/`gd(k)` giá trị/ngày cuối chuỗi `GLOBAL_DATA.s[k]`; `gprev(k,n)` giá trị cách n điểm có số; `yStart(k)` phiên đầu năm; `dir(a,b)` → "tăng/giảm/đi ngang" (ngưỡng 0,05); `sg(v,d,u)` có dấu `+`/`−` (dấu trừ Unicode); `pc`, `nf`, `dvn` (dd/mm/yyyy), `mvn` (mm/yyyy).

### 2.7. Thu gọn mục (`collapsify`, `sector.js:226-241`)

Mỗi `h3.ovh.dsec` (hoặc `h3.ovh`) trở thành nút thu/mở phần nội dung tới tiêu đề kế tiếp; trước tiêu đề đầu có thanh "Mở tất cả · Thu gọn tất cả". Trạng thái lưu `localStorage['fs-col:<key>']`. Mở lại một mục thì resize mọi chart bên trong.

---

## 3. Tab 1 · Việt Nam &amp; Thế giới (`#heat`)

Tiêu đề `h2.sec` "Việt Nam &amp; Thế giới" + `p.sec-sub` mô tả. Nội dung (`sector.js:2510-2530`):

### 3.1. Card `#hmCard` "Bản đồ nhiệt theo tháng"

Ba bộ chọn `.picker`:
- `#hmView`: `data-v="world"` Thế giới · `data-v="vn"` Việt Nam.
- `#hmR` (khung, `HM_R`): `13` 1 năm · `37` 3 năm · `61` 5 năm (mặc định) · `121` 10 năm · `241` 20 năm · `all` Tất cả (từ 1990).
- `#hmW` (chỉ khi `world`; `HM_W`, `sector.js:2350-2357`):

| `w` | Nhãn | Hàm | Thang màu | Số lẻ | Ghi chú cột |
|---|---|---|---|---|---|
| `pol` | Lãi suất điều hành | `polX` | `hi-red` | 2 | VN: OMO 7 ngày (trước 2016: tái cấp vốn); Fed cận trên; ECB tiền gửi; TQ LPR 1 năm |
| `cpi` | Lạm phát CPI | `cpiX` | `hi-red` | 1 | Úc, NZ số quý |
| `real` | Lãi suất thực | `pol − cpi` | `hi-green` | 2 | điểm % |
| `y10` | Lợi suất 10 năm | `y10X` | `hi-red` | 2 | bình quân tháng; euro = Bund |
| `fx` | Tỷ giá so với USD | `fxX` | `hi-green` | 1 | % thay đổi giá trị đồng tiền so với USD từ đầu năm; Mỹ = DXY; VN = NHTM bán ra |
| `pmi` | PMI sản xuất | `gM(c[6])` | `pmi` | 1 | Mỹ ISM, TQ NBS, euro HCOB |

17 nước (`HM_C`, `sector.js:2336-2341`): `vn, us, ea, jp, cn, gb, kr, ca, au, nz, ch, in, id, th, my, ph, sg` — mỗi dòng là `[mã, tên, khoá CPI, khoá lãi suất, khoá 10Y, (khoá FX, đảo?), khoá PMI]`. Thứ tự lấy số: chuỗi hiện hành (`GLOBAL_DATA`/`SECTOR_DATA`) trước, thiếu thì `HM_HIST` (`hW`, `hV`). Dòng Việt Nam có class `hm-vn` (chữ đậm, tên màu tím).

Chế độ **Việt Nam** (`HM_V`, `sector.js:2360-2380`): các nhóm "Hoạt động kinh tế" (GDP quý, bán lẻ, bán lẻ thực, XK, NK, cán cân, IIP, PMI, FDI đăng ký/thực hiện YoY, vốn NSNN YoY, khách quốc tế YoY), "Giá cả" (CPI, lạm phát cơ bản, CPI bình quân), "Tài chính – tiền tệ" (tín dụng, tiền gửi, M2, OMO cuối tháng, tái cấp vốn, LNH qua đêm bình quân, huy động 12T NHTM Nhà nước/lớn, TPCP 10 năm, chênh LNH − SOFR qua đêm, chênh LNH − USD 6 tháng, chênh LNH − USD 1 năm, USD/VND từ đầu năm (dương = VND mất giá), DXY, dự trữ ngoại hối). Một số dòng có nút `(i)` giải thích (`HM_VTIP`).

**Tô màu** (`hmColor`, `sector.js:2394-2406`): thang theo **phân vị 5–95%** (không bị giá trị cực đoan làm nhạt). `t ∈ [−1,1]`: `pmi` → `(v−50)/4`; `sign` → `v/max|v|`; còn lại `2·(v−lo)/(hi−lo) − 1`, `hi-red` đảo dấu. Nền `rgba(30,143,90,a)` (xanh) hoặc `rgba(192,57,43,a)` (đỏ), `a = 0.12 + |t|·0.6`; `|t|>0.7` chữ trắng. Chế độ Thế giới dùng **một thang chung cho cả bảng** (so giữa các nước, trừ PMI); chế độ VN tô **theo từng dòng**.

**Bảng** (`hmTable`, `sector.js:2407-2413`): `div.tscroll.hm > table.hmt`, hàng tiêu đề 2 tầng (năm `colspan`, tháng `mm`), cột tháng 01 có viền trái `.ys` (2px `#c9cfdb`), cột tên dính trái (`position:sticky`). `hmTrim` bỏ các tháng đầu chưa có số. Mở bảng tự cuộn tới tháng mới nhất. Dòng nhóm `tr.grp` bấm để thu/mở (▾/▸, không vào ảnh xuất). Bấm một dòng có `data-hk` → chọn dòng (class `hm-sel`, nền `#fff4cc`) và vẽ lại chart bên dưới.

Chú thích `p.hm-note` + `.insight` = `heatIns()` (`sector.js:2502-2509`): số NHTW tăng/giảm lãi suất từ đầu năm (`GLOBAL_DATA.polTab`, so `v` với `y0`), lãi suất thực VN (OMO − CPI) và thứ hạng trong bảng. Nguồn: BIS; Fed, ECB, BOJ, NHNN; FRED, OECD, DBnomics; ISM, S&P Global, HCOB, NBS; ECB, U.S. Treasury, MOF Nhật, ChinaBond; Fed H.10; Cục Thống kê, NHNN, Bộ Tài chính, Vietcombank.

**Ảnh bảng**: thanh `.tbl-bar` với gợi ý "Chuột phải vào một ô…" + 3 nút của `FSTbl.button` (xem §9.3); tên file `FinSuccess_ban-do-nhiet_<viet-nam|pol|cpi|…>`. Menu chuột phải có "Vẽ chart dòng này" và "Thêm/Bỏ dòng vào chart so sánh".

Trạng thái `hmS = {v:'world', w:'pol', n:'61'}` lưu `localStorage['fs-hm']`.

### 3.2. Card `#hmLineCard` — chart `hmLine` (cbox `tall` 340px)

Line chart toàn bộ lịch sử (01/1990 → tháng hiện tại) của dòng đang chọn (`hmLine`, `sector.js:2467-2501`), khung mở sẵn = khung đang chọn trên bản đồ (`win`):
- Thế giới: nước đang chọn (navy; tím `#861C52` nếu là VN, rộng 2.4) + "Việt Nam" nét đứt tím 1.6; chỉ tiêu `pol` thêm đường CPI của nước đó (gold); `real` thêm lãi suất điều hành (tealInk) + CPI (gold). Vạch tham chiếu 50 (PMI) hoặc 0 (real, fx).
- Việt Nam: dòng đang chọn (navy); dòng so sánh khác đơn vị chuyển sang trục `y1` bên phải.
- Dòng so sánh: màu `CMP_CC = ['#C0392B','#1f8a8d','#9a7400','#861C52','#2938A8','#596272']`; tiêu đề `#hmLineH` hiện "so với …" + nút `.cmp-x` "Xoá so sánh ✕".

### 3.3. Mục "Lợi suất, lạm phát và lãi suất điều hành toàn cầu" (`h3.ovh#hm-gl`, khối `gGL()` `sector.js:1164-1186`, vẽ bằng `drGL()` `1187-1215`)

KPI (6 ô, `div.kpis`): UST 10 năm · Bund Đức 10 năm · TPCP khu vực euro 10 năm · JGB 10 năm (3 số lẻ) · Gilt Anh 10 năm (thiếu chuỗi ngày thì dùng bình quân tháng `y10_gb_m`) · Dầu WTI (kèm Brent). Mỗi ô ghi thay đổi từ đầu năm (bps); tăng → class `neg` (đỏ).

Lưới `grid g2 gap` (2 cột, 1 cột khi ≤760px):

| id | Tiêu đề | Kiểu, cbox | Dữ liệu / màu | Bộ chọn | Insight |
|---|---|---|---|---|---|
| `gGlY10` | Lợi suất TPCP 10 năm theo ngày: Mỹ, Đức, khu vực euro, Nhật, Anh | line, tall | `Y10D`: `us_10y_d` navy, `de_10y_d` gold, `ea_all_10y_d` tealInk, `jp_10y_d` red, `gb_10y_d` purple; từ 2021 | `glY`: `chg` Thay đổi từ đầu năm (bps) · `idx` Chỉ số đầu năm = 1 · `lvl` Mức % | `INS.gGlY10`: mức, bps YTD, bps 1 tuần |
| `gGlAsia` | …châu Á: TQ, Đài Loan, Hàn, Singapore, Nhật (so với Mỹ) | line, tall | `Y10A`: Mỹ navy, Nhật red, TQ gold, Hàn tealInk, Đài Loan grey, Singapore `#7a5bb5` | `glA` (như trên) | `INS.gGlAsia` + chênh Mỹ − TQ |
| `gGlY10m` | Lợi suất 10 năm theo tháng: châu Âu và các nước phát triển khác | line, tall | `Y10M.eu` (Đức, Pháp, Ý, TBN, Hà Lan, Anh) hoặc `ap` (Nhật, Hàn, Úc, Canada, Mỹ); `PAL2`; từ 2021-01 | `glM`: `eu` Châu Âu · `ap` Mỹ, Nhật, Hàn, Úc, Canada | `INS.gGlY10m` + chênh Ý − Đức |
| `gGlCurve` | Đường cong lợi suất TPCP Mỹ | line, tall | `GLOBAL_DATA.ustCurve`: kỳ hạn 1M…30Y; snapshot Hiện tại (navy 2.6), 1 tuần (teal nét `[2,2]`), 1 tháng (tealInk), Đầu năm (red), 1 năm trước (grey `[4,3]`); pointRadius 3 | — | `INS.gGlCurve` |
| `gGlOil` | Giá dầu WTI và Brent theo ngày | line+bar, tall | WTI navy, Brent gold; cột xám `rgba(138,147,163,.35)` = Brent − WTI trên `y1` (min −5, max 80) | — | `INS.gGlOil` (chênh vs bình quân 1 năm/từ 2021, giải thích hai loại dầu chuẩn) |
| `gGlCpi` | Lạm phát CPI các nước theo nhóm | line, tall | `GLOBAL_DATA.cpiTab` theo nhóm; VN red, Mỹ navy; VN/Mỹ/Euro rộng 2.6; vạch 2% xám | `glC`: `eu` Châu Âu và Mỹ · `dm` Anh, Canada, Úc, NZ · `ad` Châu Á phát triển · `em` Châu Á mới nổi | `cpiGrpIns()` bình quân giản đơn từng nhóm |
| `gGlCpiBar` | Lạm phát CPI mới nhất theo nước | bar ngang, tall | cột = tháng mới nhất, màu theo nhóm (`CPI_GC`: Châu Âu navy, Mỹ purple, Phát triển khác `#4f9bd1`, Châu Á phát triển tealInk, Châu Á mới nổi gold, VN red); chấm trắng viền `#1f2433` = cùng kỳ năm trước; vạch dọc 2%; nhãn "Tên (Tn)" hoặc "(Qn)" | — | `cpiBarIns()`: cao/thấp nhất, số nước cao hơn cùng kỳ, thứ hạng VN |
| `gGlPol` | Lãi suất điều hành các NHTW phát triển | line stepped, tall | `polTab` (bỏ `em`); `POL_C`: us navy, xm tealInk, jp red, gb purple, ca `#b5651d`, au gold, nz `#7cc49b`, ch grey, kr `#4f9bd1`; Fed/ECB/BOJ rộng 2.4 | — | `polIns()` |
| `gGlPmi` | PMI sản xuất các nền kinh tế lớn và Việt Nam | line, tall, `win:36` | `PMI_K`: ISM navy, euro tealInk, Đức grey, TQ gold, VN red; vạch 50 | — | `pmiIns()` |

Nguồn từng card ghi đúng cơ quan gốc (U.S. Treasury; Bundesbank; ECB; MOF Nhật; BoE; ChinaBond; TPEx; BOK ECOS; MAS; EIA qua FRED; BIS; ISM, S&P Global, HCOB, NBS). Hằng `CPI_SRC` (`sector.js:1067`) dùng chung cho hai chart CPI.

---

## 4. Tab 2 · Việt Nam (`#vn`)

`h2.sec` "Việt Nam" + mô tả; thanh tab con `[data-sn="vn"]` (kéo thả đổi thứ tự, lưu `fsk-order:vm-vn`); mở tab con đứng đầu.

### 4.1. Tab con Kinh tế (`data-pp="eco"`, `subEco()` `sector.js:2182-2231`, vẽ `chEco()` `2244-2313`)

Không có `ECO_DATA` → banner "Chưa có số liệu kinh tế.". 7 KPI (bấm ô → cuộn tới chart, `kpiLinks` theo thứ tự `eGdp, eIip, eRet, eXnk, eFdi, ePubY, chCpi`): GDP Qn/yy (+ cùng kỳ) · PMI (mở rộng/thu hẹp, `pos`/`neg`) · Bán lẻ YoY (thực = trừ CPI) · Xuất khẩu YoY (cán cân) · FDI thực hiện lũy kế (YoY) · Vốn NSNN lũy kế (YoY) · CPI (lõi, bình quân; >4,5% → `neg`).

Các mục thu gọn (`collapsify(..., 'eco', ['e-dash','e-grow'])` → hai mục đầu mở sẵn):

**`#e-dash` Bảng chỉ tiêu vĩ mô và thị trường** — card không canvas, `body = ecoTable()` (`sector.js:2116-2126`): `table.etab`, cột = 6 tháng gần nhất tính tới tháng có CPI mới nhất (+ tháng hiện tại nếu thị trường đã có số) + cột "Cùng kỳ yyyy". 3 nhóm dòng `tr.grp`: Kinh tế (GDP quý chỉ hiện ở tháng 03/06/09/12, PMI, IIP, bán lẻ, bán lẻ thực, XK, NK, cán cân, FDI đăng ký/thực hiện, giải ngân NSNN, CPI, lạm phát cơ bản) · Tiền tệ (tín dụng, M2, LNH qua đêm bình quân tháng, huy động 12T NHTM Nhà nước, USD/VND NHTM & tự do cuối tháng, TPCP 10 năm) · Tài sản quốc tế (EFFR, UST 10Y, DXY, Brent, vàng — số cuối tháng). Insight `ecoDashIns()`.

**`#e-grow` Tăng trưởng và sản xuất**

| id | Tiêu đề | Kiểu, cbox | Dữ liệu | Ghi chú |
|---|---|---|---|---|
| `eGdp` | GDP thực theo quý và theo khu vực | bar+line, 280 | cột GDP `rgba(29,38,120,.75)`; đường Nông lâm thủy sản gold, CN&XD red, Dịch vụ tealInk (pointRadius 2); từ 2021 | `eGdpIns` |
| `eIip` | IIP theo ngành và PMI | line+bar, 280, `win:36` | `IIP_K`: Toàn ngành navy 2.8, Chế biến tealInk 2, Khai khoáng gold, Điện purple, Nước grey; cột PMI xám `rgba(154,163,178,.35)` trục `y1` 40–60; vạch 0 | `eIipIns` (top 3/bottom 2 ngành cấp 2) |
| `eIipSub` | IIP các ngành cấp 2 tháng gần nhất | bar ngang, **xl 600px** | cột xanh/đỏ theo dấu; chấm trắng = bình quân 12 tháng; nhãn cắt ≤34 ký tự | sắp theo mức tăng (`ECO_DATA.iipSub`) |

**`#e-cons` Tiêu dùng**: `eRet` (line, `win:36`; `RET_K` Tổng navy 2.8, Hàng hoá tealInk, Lưu trú gold, Du lịch purple — **ẩn sẵn**, Dịch vụ khác grey; "Bán lẻ thực (trừ CPI)" red nét `[5,4]`) · `eRetLv` (bar chồng nghìn tỷ đồng/tháng, 4 thành phần trừ tổng, `win:36`).

**`#e-cpi` Lạm phát**

| id | Tiêu đề | Kiểu, cbox | Dữ liệu, màu |
|---|---|---|---|
| `chCpi` | Lạm phát | line, 280 | `dom.cpi` navy 2.4, `dom.cpiCore` teal, `dom.cpiAvg` purple `[4,3]`; vạch "Mục tiêu ~4,5%" (NQ 244/2025/QH15) |
| `eCpiC` | CPI theo nhóm hàng | bar ngang, tall | 11 nhóm (`CPI_GRP`) sắp giảm dần + "CPI chung", "Lạm phát cơ bản" (đỏ); chấm = cùng kỳ |
| `eCpiCt` | Đóng góp vào lạm phát CPI theo nhóm hàng | bar chồng + line, tall | xem công thức §10.5; bộ chọn `eCpiCtK`: `g6` 6 nhóm chính · `g11` Đủ 11 nhóm; đường "CPI chung" `#111`; vạch 4,5% |
| `eCpiTs` | CPI theo nhóm hàng qua thời gian | line, tall, `win:36` | bộ chọn `eCpiG`: `core` CPI và lõi · `food` Hàng ăn, nhà ở, giao thông · `svc` Y tế, giáo dục, khác; từ 2019; vạch 4,5% xám |
| `eCpiFc` | Dự báo lạm phát 2026 của các tổ chức | bar ngang, tall | `ECO_DATA.fc.avg` sắp giảm; IMF/World Bank purple, còn lại navy; trục x min 3,5; vạch 4,5% | chỉ hiện nếu có `ECO.fc`; insight gồm khảo sát VIRA (`fc.survey`) |
| `chOilChg` | Truyền dẫn giá dầu vào giá xăng dầu trong nước | line, 280 | % so với phiên cuối 2025: Brent red `[5,4]`, WTI gold `[2,3]`, RON 95 navy 2.4, E5 teal, DO purple 2.4; CPI giao thông (% YoY) tealInk chấm trắng tại phiên cuối tháng, trục `y1`; hai trục **căn vạch 0 trùng nhau** (`zeroAlign`, `sector.js:2782`) |
| `chOil` | Giá dầu thế giới và giá xăng dầu bán lẻ trong nước | line, tall | trục trái nghìn đồng/lít: RON 95 navy, E5 teal, DO purple; trục phải USD/thùng: Brent red `[5,4]`, WTI gold `[2,3]` (`BOND_DATA.oil`) |

`chOil`, `chOilChg` (và mọi chart trái phiếu) được vẽ bởi `chBond()` — `chEco` gọi `chBond()` ở cuối nếu có `BOND_DATA`.

**`#e-trade` Thương mại**: `eXnk` (line, `win:36`, bộ chọn `eXnkK`: `xk` Xuất khẩu · `nk` Nhập khẩu; Tổng navy 2.6, Trong nước red, FDI tealInk; vạch 0) · `eTb` (bar: trong nước `rgba(192,57,43,.65)`, FDI `rgba(31,138,141,.65)`; đường 12 tháng trên `y1`: trong nước red, FDI tealInk, Tổng navy `[5,4]`).

**`#e-inv` Đầu tư**: `eFdi` (cột Thực hiện navy, Đăng ký `rgba(89,197,200,.55)`; đường lũy kế YoY trục phải) · `ePubY` (theo năm từ 2019: cột đậm `rgba(29,38,120,.8)` = lũy kế cùng số tháng, cột nhạt `.18` = cả năm, `grouped:false` để chồng khít; đường đỏ YoY) · `ePubM` (cột tháng + đường YoY, `win:36`).

Nguồn ghi trên card: `ECO_SRC` = "Cục Thống kê (Bộ Tài chính); S&P Global (PMI); số tháng qua dulieukinhte.com, tự cập nhật".

### 4.2. Tab con Tiền tệ (`data-pp="dom"`, `subDom('v')` `sector.js:1923-1978`, vẽ `chDom()` `1987-2032` + `chBond()`)

6 KPI (bấm → `chFx, chFxGap, chOn, chMoney, chCpi, chExt`): USD/VND NHTM bán (trần, cách trần %) · Tỷ giá tự do (cao/thấp hơn NHTM) · LNH qua đêm (OMO) · Tín dụng vs tiền gửi (điểm %, `neg`) · CPI (lõi, BQ; >4,5 `neg`) · Dự trữ ngoại hối (tỷ USD).

Mục thu gọn `collapsify(…, 'vdom', ['d-fx'], 'h3.dsec')` — chỉ "Tỷ giá" mở sẵn:

**`#d-fx` Tỷ giá**

| id | Tiêu đề | Kiểu | Dữ liệu |
|---|---|---|---|
| `chFx` | Hành lang tỷ giá USD/VND và chỉ số USD (DXY) (`FSFX.TITLE`) | line, tall | `fxchart.js`: trục ngày theo `vn_sbv_central_d` từ 2021; Trung tâm teal `#59C5C8`; Trần +5% red `[5,4]`; Sàn −5% grey **ẩn sẵn**; NHNN bán can thiệp purple `[2,3]`; NHTM bán ra navy `#1D2678` (theo ngày từ `dom.nhtmD`, lấy giá gần nhất ≤8 ngày; không có thì cuối tháng); Tự do gold; Vietcombank `#1f6f3f` pointRadius 3; DXY `#8a8f98` trục `y1` (ffill) |
| `chFxGap` | Chênh lệch tỷ giá tự do − NHTM bán ra | bar | `fxGapSer()`: mỗi ngày tự do có số trừ giá NHTM gần nhất trong 8 ngày; đỏ khi dương, xanh khi âm; `barPercentage:1` |

Insight `chFx` = `FSFX.insight` (trung tâm, % YTD, trần, giá NHNN bán, khoảng cách tới trần; DXY YTD, 1 tháng; Hàm ý: giá bán can thiệp = trần − 50đ). Nguồn `FSFX.SRC`.

**`#d-flow` Cung tiền, tín dụng và dòng tiền**

| id | Tiêu đề | Kiểu | Dữ liệu |
|---|---|---|---|
| `chMoney` | Tín dụng, tiền gửi và M2 | line, nút Cột/Đường | từ 2019: tín dụng YoY navy 2.4, tiền gửi teal, M2 gold `[4,3]` |
| `chCredit` | Tín dụng toàn hệ thống so với đầu năm | line | trục T1…T12, mỗi đường một năm (4 năm gần nhất, màu `steps[5], steps[4], steps[2], navy`, năm hiện tại rộng 3); vạch "Chỉ tiêu 2026 ~15%" |
| `chExt` | Đối ngoại: cán cân thương mại, FDI và dự trữ | bar+line | cột cán cân tháng (xanh/đỏ), FDI giải ngân 12 tháng navy, dự trữ purple `[4,3]` trục phải |
| `chFiscal` | Tài khóa: chi − thu ngân sách theo quý | bar | `(expQ − revQ)/1000` nghìn tỷ; dương navy `rgba(41,56,168,.7)`, âm đỏ |

Các insight của `chMoney`, `chCredit`, `chExt`, `chFiscal` là **câu viết sẵn có chèn số** (vd. "đỉnh 8,7 điểm % tháng 9/2022", "Phó Thống đốc, 14/10") — khi số liệu đi quá xa mốc đó cần viết lại.

**`#d-cost` Chi phí vốn và thanh khoản**

| id | Tiêu đề | Kiểu, cbox | Dữ liệu |
|---|---|---|---|
| `chOn` | Thanh khoản liên ngân hàng (TT2) | bar+line, tall, `win:3` | `dom.onDaily` navy; OMO teal `[5,4]` (giữ mức phiên gần nhất); cột bơm/hút ròng `dom.netDaily` (xanh `rgba(41,56,168,.35)` / đỏ) trục `y1` tỷ đồng |
| `chLnhTen` | Lãi suất liên ngân hàng theo kỳ hạn (TT2) | line, tall, `win:12` | `dom.lnh` (`LNH_T`: ON navy, 1W blue, 1M tealInk, 3M gold, 6M purple, 9M red; ON và 3M rộng 2.2); OMO grey `[5,4]` — chỉ hiện nếu có `dom.lnh` |
| `chOmoOut` | OMO và tín phiếu NHNN đang lưu hành | bar chồng + line, tall, `win:12` | OMO lưu hành `rgba(29,38,120,.55)` (nghìn tỷ, dương), tín phiếu lưu hành đỏ (âm), LNH qua đêm gold trục phải |
| `chDep` | Lãi suất huy động 12 tháng theo nhóm (TT1) | line stepped, `win:12` | `dep12StateD` navy 2.4, `dep12LargeD` tealInk, `dep12OtherD` purple; từ 10/2024; ffill |
| `bBig4` | Lợi suất trái phiếu Big 4 khi phát hành | scatter-dạng-line | điểm từng NH (VCB tealInk, CTG navy, BID purple, AGRIBANK gold, `showLine:false`); huy động 12T Big 4 red; TPCP 10 năm grey `[5,4]` |
| `dMmCurve` | Đường cong lãi suất liên ngân hàng VND và USD | line | `drMmCurve` (xem §5.2) |
| `bCurve` | Đường cong lợi suất TPCP Việt Nam | line | kỳ hạn 1Y,3Y,5Y,10Y,20Y; hiện tại navy 2.8, 3 tháng trước teal `[5,4]`, đầu năm gold `[2,3]`, 1 năm trước grey |
| `bCurveTs` | Lợi suất TPCP 1, 5, 10 năm và độ dốc 10Y − 1Y | line+bar, tall, `win:12` | 1Y teal, 5Y purple, 10Y navy 2.6; cột xám độ dốc trục phải (min 0) |

Insight: `lnhIns` (mức các kỳ hạn, thay đổi 5 phiên), `omoOutIns`, `depIns` (đỉnh từ 11/2025, câu cố định "Big 4 đồng loạt hạ 50 bps ngày 20–21/10"), `bBig4Ins`, `mmCurveIns`, `bCurveIns` (phát hiện *bear flattening* khi 1Y tăng hơn 10Y ≥10 bps trong 3 tháng).

**`#d-bond` Thị trường trái phiếu: FI bond, TPDN và G-bond** — chỉ trên Vĩ mô (`mode==='v'` gọi `subBond()`, `sector.js:2817-2851`). 6 KPI: Coupon FI 1–3 năm riêng lẻ (chênh vs huy động 12T Big 4; >2,5 `neg`) · Lợi suất TP Big 4 (phát hành) · Dư nợ trái phiếu ngân hàng (đáo hạn 12 tháng tới) · TPDN chậm trả (% dư nợ, BĐS) · TPCP 10 năm (dốc 10Y−1Y) · Đấu thầu TPCP tháng (% trúng).

| id | Tiêu đề | Kiểu | Dữ liệu chính |
|---|---|---|---|
| `bFiCpn` | Chi phí vốn dài hạn: coupon trái phiếu NH vs huy động 12T | line+bar | coupon 1–3 năm riêng lẻ navy, mọi kỳ hạn tealInk `[5,4]`, huy động Big 4 red, cột chênh gold `.35` trục phải 0–6 |
| `bFiIss` | NH phát hành trái phiếu theo kỳ hạn | bar chồng | ≤1 năm grey, 1–3 navy, 3–5 teal, >5 purple |
| `bFiMat` | Trái phiếu NH: dư nợ và lịch đáo hạn | bar chồng+line | Gốc đã trả navy, Mua lại trước hạn teal, Đáo hạn theo lịch đỏ (tháng ≥ hiện tại), Dư nợ gold trục phải |
| `bCbIss` | Phát hành TPDN theo ngành | bar chồng | Tài chính navy, BĐS red, Khác grey |
| `bCbLate` | TPDN chậm trả gốc và lãi | bar+line | dư nợ chậm trả đỏ; số mã mới chậm trả navy trục phải |
| `bCbMat` | Lịch đáo hạn TPDN 15 tháng tới theo ngành | bar chồng | như `bCbIss` |
| `bCbSec` | Chậm trả theo ngành · mm/yyyy | bar ngang | BĐS đỏ, Tài chính navy, còn lại xám |
| `bAuc` | Đấu thầu TPCP: gọi, đặt, trúng | bar+line | gọi xám, đặt teal, trúng navy; tỷ lệ trúng/gọi red trục phải 0–120% |
| `bAucY` | Lãi suất trúng thầu theo kỳ hạn | line | 5 năm teal, 10 năm navy 2.6, 15 năm purple; `spanGaps:false` |
| `bHold` | Ai nắm giữ TPCP: NH vs nhóm bảo hiểm | bar chồng 0–100% | NH navy, bảo hiểm tealInk, khác gold; kỳ ước tính (`e`) màu nhạt `.45` |
| `bTen` | Cơ cấu kỳ hạn trúng thầu TPCP | bar chồng % | 7 kỳ hạn `#B3BDE8 #8997D6 #4354B7 navy teal tealInk purple`; năm hiện tại ghi "(đến mm)" |
| `bFx` | Khối ngoại mua/bán ròng TPCP thứ cấp | bar | xanh/đỏ theo dấu |

Mỗi card có hàm insight riêng (`bFiCpnIns` … `bFxIns`, `sector.js:2852-2933`). Nguồn lấy từ `BOND_DATA.src.{fi,dep,cb,auc,curve,big4,oil,holders,fx}`.

---

## 5. Tab 3 · Quốc tế (`#world`)

`h2.sec` "Quốc tế"; tab con `[data-sn="world"]` (thứ tự lưu `fsk-order:vm-world`).

### 5.1. Tab con Các nền kinh tế (`data-pp="intl"`, `subIntl(false)`)

Thanh nước `.subtabs.cty` (thứ tự lưu `fsk-order:intl-country`) + dòng mờ "Số liệu quốc tế lấy trực tiếp từ nguồn công bố … lần tải gần nhất dd/mm/yyyy" (+ "**N chuỗi dùng bản cũ do lỗi tải**" nếu `GLOBAL_DATA.stale` khác rỗng). `chIntl()` gắn nút → `openC(k)`; mỗi nước vẽ một lần (`gDone`).

Hàm `gsrc(keys)` (`sector.js:1042`) sinh dòng nguồn từ tiền tố mã chuỗi trong `GLOBAL_DATA.src` (`fred:` → "FRED (BLS, BEA, Fed, CBO, Kho bạc Mỹ)", `ecb:` → "ECB Data Portal", `dbn:` → "DBnomics (Eurostat, Cục Thống kê Nhật Bản, NBS)", `oecd`, `nbs`, `nyfed`, `hlw`) + "tự động cập nhật dd/mm/yyyy".

#### Mỹ (`gUS()` `sector.js:1217-1262`, `drUS()` `1486-1514`)

KPI 6 ô: Lãi suất Fed `lo–up%` (EFFR, IORB) · Taylor V1 (PCE lõi) (trimmed, FFR; V1 − FFR > 0,5 → `neg`) · CPI (lõi) · PCE lõi (supercore) · Thất nghiệp (NFP) · Giá dầu Brent (% từ đầu năm; >+20% `neg`).

**Lãi suất Fed và kỳ vọng lãi suất** (`h3.sec2`)

1. `gFedPath` — "Kỳ vọng lãi suất Fed theo từng phiên họp FOMC" (`fedWatchCard`, `sector.js:1307-1340`), cbox **short 230px**. Line: "Hiện tại" navy 2.4 (lãi suất kỳ vọng = điểm giữa khoảng, bình quân theo xác suất, sau mỗi phiên); "1 tuần trước", "1 tháng trước" (tealInk/grey `[4,3]`, từ `fedwatchHist`); "Điểm giữa khoảng hiện hành" red `[2,3]`. Body gồm:
   - **Bảng xác suất**: cột "Phiên FOMC" + mỗi khoảng lãi suất `x,xx–y,yy` + "Kỳ vọng" + "Kalshi · quyết định tại phiên (%)" + "Polymarket · …" (dạng "giảm a · giữ b · tăng c"). **Ô xác suất cao nhất mỗi dòng tô vàng `background:#fff3c4;font-weight:700`** (đúng format CME FedWatch).
   - **Bảng đối chiếu cuối năm**: "Sau phiên dd/mm/yyyy" × (Từ giá ZQ · Atlanta Fed MPT bình quân [25–75%] · Dot plot FOMC trung vị) + dòng "Dài hạn".
   - Insight: phiên kế tiếp (khoảng khả năng nhất, % tăng/giảm), tổng xác suất cao hơn mức hiện hành tới phiên cuối năm, kỳ vọng phiên cuối, Kalshi/Polymarket, so dot plot (chênh > 0,2 điểm → "thị trường kỳ vọng Fed tăng nhiều hơn chính Fed dự báo khoảng n lần 25 bps"), Hàm ý R-02.
   - Nguồn: "Ước tính FinSuccess theo phương pháp CME FedWatch từ giá ZQ (CBOT, qua Yahoo Finance)…" (dòng chú thích giờ giá ZQ UTC).
2. `oisCards()` (`sector.js:1270-1290`): `gUsOis` "Đường cong OIS (SOFR) Mỹ" (tall; line: Hiện tại navy 2.6, 1 tuần tealInk `[4,3]`, 1 tháng gold `[2,3]`, lợi suất TPCP cùng kỳ hạn grey `[5,4]` (bỏ 9M, 18M, 4Y), SOFR red `[2,3]` 1.2) và `gUsOisTs` "OIS (SOFR) Mỹ theo thời gian" (OIS 3M tealInk, 1Y navy 2.4, 2Y gold, 5Y purple, SOFR red). Insight: OIS 1 năm so SOFR (bps) → nghiêng tăng/giảm; thay đổi 1 tuần/1 tháng; chênh OIS − TPCP 2Y/5Y.
3. Lưới: `gUsRates` "Lợi suất TPCP Mỹ và lãi suất Fed" (280; EFFR navy, 2Y gold, 10Y red; từ 2021) · `gUsTaylor` "Quy tắc Taylor so với lãi suất Fed thực tế" (tall; bộ chọn `usTay`: `core` π = PCE lõi · `trim` π = PCE trimmed mean; Taylor V1 red 2.2, V2 gold `[5,4]`, Fed funds navy 2.6, r* grey `[2,3]`; từ 2015; insight vào `#gTayIns`: chênh V1 − FFR < 50 bps "gần trung lập", > 0 "Fed lỏng hơn quy tắc", < 0 "chặt hơn"; độ lệch giữa hai thước đo lạm phát).

**Thanh khoản hệ thống ngân hàng Mỹ**
- `gUsSpr` "Áp lực thị trường repo" (tall; SOFR − IORB navy, TGCR − IORB tealInk, SOFR p99 − IORB red; bps; vạch 0).
- Bảng "Bậc thang thanh khoản hệ thống ngân hàng Mỹ" (`GLOBAL_DATA.ladder`): cột Chỉ báo · Mới nhất · Kỳ trước (5 phiên/tuần trước) · Ngưỡng tham chiếu · Trạng thái (pill) · Ngày. Quy tắc trạng thái (`sector.js:1221-1223`):

| `k` | Chỉ báo | Rủi ro (`risk`) | Theo dõi (`watch`) | Tốt (`ok`) |
|---|---|---|---|---|
| `us_rrp` | Khối lượng ON RRP | < 50 "Cạn đệm" | còn lại "Trung tính" | > 1.000 "Thừa" |
| `tgcr_iorb` | TGCR − IORB | ≥ 0 "Khát vốn" | "Trung tính" | < −7 "Thừa" |
| `sofr_iorb` | SOFR − IORB | > 0 "Tắc nghẽn" | — | "Bình thường" |
| `sofr99_iorb` | SOFR p99 − IORB | > 10 "Căng" | > 5 "Theo dõi" | "Bình thường" |
| `us_repo` | SRF sử dụng | > 1 "Đang dùng" | — | "Bình thường" |
| `us_reserves` | Dự trữ NH tại Fed | < 2.800 "Sát ngưỡng" | < 3.000 "Vừa đủ" | "Dồi dào" |
| `bills4w` | Fed mua ròng tín phiếu 4 tuần | — | > 0 "Đang bơm" | "QT" |

**Fed và Kho bạc: UST đang được phát hành thế nào, ai hấp thụ** (`gUSFlow()`, `sector.js:1388-1444`; thiếu `fedbs/ustHold/mspd/auct` → "Đang chờ số liệu Kho bạc/Fed."). 6 KPI (Fed nắm UST, Thâm hụt 12 tháng, Tỷ trọng tín phiếu (>22 `neg`), Phát hành ròng 12 tháng, Indirect ở đấu thầu coupon (PD > 20 `neg`), Nước ngoài nắm UST). Một **bảng giải thích tĩnh** 8 dòng (Tín phiếu, Notes, Bonds, TIPS, FRN, MBS, Cho vay, Khác) × (Kỳ hạn, Trả lãi, Ai mua, Ý nghĩa). Lưới chart (tất cả `tall`):

| id | Tiêu đề | Kiểu |
|---|---|---|
| `gUsFedA` | Bảng cân đối Fed: tài sản theo cấu phần | diện tích chồng (`stk type:'line'`, `fill`) + đường "Tổng" `#1f2433`; tuần |
| `gUsFedL` | …nguồn vốn theo cấu phần | như trên (tiền mặt, dự trữ, TGA, RRP, khác) |
| `gUsFedMat` | UST Fed nắm theo thời gian còn lại đến đáo hạn | diện tích chồng 6 nhóm (red, gold, teal, tealInk, navy, purple) |
| `gUsFedRepo` | Repo của Fed: FIMA và SRF | bar chồng (FIMA gold, SRF navy), `win:24` |
| `gUsDebt` | Kho bạc phát hành gì: cơ cấu nợ thị trường | bar chồng nghìn tỷ USD từ 2018 + đường "Tỷ trọng tín phiếu" red trục phải |
| `gUsNet` | Phát hành ròng hằng tháng: tín phiếu và coupon | bar chồng (gold, navy) từ 2021 |
| `gUsHold` | Ai nắm UST: cơ cấu theo nhóm | diện tích chồng **% tổng** (quý) |
| `gUsAbs` | Ai hấp thụ lượng phát hành 4 quý gần nhất | bar ngang `deltaBars` (xanh/đỏ), bỏ "Khác"; insight vào `#gUsAbsIns` |
| `gUsAuct` | Đấu thầu: ai trúng thầu | bar chồng % (purple, tealInk, navy, gold, grey); bộ chọn `usAuct`: `coupons` · `bills` |
| `gUsBtc` | Sức cầu tại phiên đấu thầu: bid-to-cover | line navy (điểm từng phiên) + cột "% indirect" `rgba(31,138,141,.18)` trục phải 0–100; vạch đỏ "bình quân 5 năm qua"; bộ chọn `usBtc`: 10Y · 30Y · 20Y · 5Y · 2Y |
| `gUsTic` | Nước ngoài nắm UST theo quốc gia | line (Nhật, TQ rộng 2.6; Anh, Bỉ, Luxembourg, Cayman) từ 2018 |
| `gUsDef` | Thâm hụt ngân sách liên bang | cột tháng (đỏ âm/xanh dương) + đường cộng dồn 12 tháng navy trục phải; cbox 280 |

Cuối khối: bảng "12 phiên đấu thầu coupon gần nhất" (`auctRecent`): Ngày · Loại · Lượng · Bid-to-cover · Lợi suất trúng · Indirect · Direct · Primary dealer (>20% tô `neg`) · Fed (SOMA).

**Lạm phát**: `gUsCpi` (bộ chọn `usCpi` = `TF`: `yoy` YoY · `m3` 3 tháng quy năm · `mom` MoM; CPI, lõi, supercore) · `gUsCpiC` (5 cấu phần) · `gUsPce` (PCE, lõi, supercore + trimmed mean chỉ ở YoY — khoá `us_pce_trim!`) · `gUsPpi` (4 chuỗi) — đều `tfDraw` (`sector.js:1482`): màu `PAL`, YoY từ 2018 có vạch "Mục tiêu 2%", m3/mom từ 2021. `gUsPceC` "Đóng góp vào lạm phát PCE" (tall; bar chồng 4 nhóm navy/tealInk/gold/red (+grey) + đường tổng `#111`; bộ chọn `usPceC`: `yoy` · `mom` · `core` · `super` (supercore theo ngành)).

**Việc làm**: `gUsJobs` (tall; cột việc làm tăng thêm `rgba(41,56,168,.55)`, âm đỏ; thất nghiệp red trục phải; từ 2021).

**Khảo sát**: `gUsSurvey` (ISM sản xuất navy, dịch vụ tealInk, Michigan gold `[5,4]` trục phải; vạch 50) · `gUsInfExp` (kỳ vọng 1 năm red, 5–10 năm purple, CPI navy).

#### Khu vực đồng Euro (`gEA`/`drEA`, `sector.js:1516-1537`)

KPI 4 ô (`kpis k4`): HICP (>2,5 `neg`), HICP dịch vụ, Lãi suất tiền gửi ECB, Bund 10 năm (EUR/USD). Chart (280px): `gEaHicp` (HICP, lõi, dịch vụ; vạch 2%; từ 2018) · `gEaRate` (DFR navy, HICP lõi red, Bund gold) · `gEaFx` (EUR/USD navy + thất nghiệp red trục phải, đặt ở phiên cuối mỗi tháng) · `gEaBs` (tổng tài sản Eurosystem, tỷ EUR, tuần).

#### Nhật Bản (`gJP`/`drJP`, `sector.js:1544-1623`)

KPI 6 ô: CPI Nhật · JGB 10 năm (bps 1 tuần, qua đêm) · Tài sản BoJ · BoJ nắm JGB (% tổng, thay đổi 4 quý) · Dự trữ ngoại hối (% so đỉnh) · Can thiệp gần nhất (`neg`).

Chart: `gJpCpi` (CPI, core, core-core; vạch 2%) · `gJpRate` (qua đêm navy, JGB 10Y red; tháng) · `gJpJgb` (tall; 2Y tealInk, 10Y navy, 30Y red) · `gJpSpr` (tall; UST − JGB 10Y bps navy + USD/JPY red trục phải) · `gJpCurve` (tall; kỳ hạn 1Y–40Y, 6 snapshot: Hiện tại navy 2.6, 1 tuần teal `[2,2]`, 1 tháng tealInk, Đầu năm red, 1 năm grey `[4,3]`, 5 năm gold `[4,3]`) · `gJpSlope` (tall; 30Y−10Y red, 10Y−2Y navy) · `gJpBtc` (tall; bid-to-cover navy + cột tail bps `rgba(192,57,43,.30)` trục phải; vạch tealInk bình quân 5 năm; bộ chọn `jpBtc`: 10Y · 30Y · 20Y · 40Y · 5Y · 2Y) · `gJpLong` (tall; JGB 10Y từ 2016, vạch 0%) · `gJpBsA`/`gJpBsL` (diện tích chồng + tổng, từ 2016) · `gJpHold` (% chồng, quý) · `gJpAbs` (`deltaBars` 4 quý; `#gJpAbsIns`) · `gJpFx` (tall; USD/JPY navy + cột can thiệp đỏ `barThickness:4` trục phải, nghìn tỷ JPY) · `gJpRes` (tall; tổng dự trữ navy 2.4, UST Nhật nắm tealInk, cột can thiệp trong tháng đỏ trục phải) · `gJpResC` (bar chồng cấu phần dự trữ).

Bảng "Các đợt can thiệp tỷ giá của MOF" (10 đợt gần nhất): Từ · Đến · Số phiên · Chiều · Tổng (nghìn tỷ JPY) · USD/JPY trước (ngày trước đợt) · USD/JPY 1 tháng sau. Đợt = gộp các lần cùng chiều cách nhau ≤ 45 ngày (`jpEpisodes`, `sector.js:1539`); `GLOBAL_DATA.feio.amt` đơn vị 100 triệu JPY → chia 10.000 ra nghìn tỷ.

#### Trung Quốc (`gCN`/`drCN`)

KPI 4 ô (CPI <1 `neg`, PPI <0 `neg` "nguồn chậm", liên NH 3 tháng, USD/CNY). Chart: `gCnPx` (CPI navy, PPI red, vạch 0) · `gCnFx` (USD/CNY navy + liên NH 3 tháng red trục phải).

#### Tổng quan (chuỗi IDX) (`data-cc="ov"`, `subIntlOverview()` `sector.js:1008-1027`)

Dùng chuỗi Wi MCP cuối tháng `SECTOR_DATA.intl`. KPI 4 ô: Fed (EFFR) "tăng 25 bps 16/09/2026 · FOMC tới 27–28/10" (chữ viết tay), UST 10Y (bps 12 tháng), DXY (YoY, USD/CNY), Brent ("đỉnh 118 (03/2026)"). Chart: `chRates` (EFFR navy 2.4, UST 10Y red, TPCP VN 10Y tealInk `[5,4]`; nút Cột/Đường) · `chUsd` (DXY navy, USD/CNY purple trục phải) · `chBrent` (bar; cột đỏ khi YoY > 20% — ngưỡng R-06 — còn lại `C.blue`).

### 5.2. Tab con Tỷ giá (`data-pp="mm"`, `subMM()` `sector.js:1678-1717`, vẽ `chMM()` `1902-1922`)

Không có `VIRA_DATA.d` → banner "Chưa có số liệu VIRA — đang chờ lần tải đầu tiên.". `collapsify(…,'mm2',['m-vnd','m-intl'])`.

**`#m-vnd` Tỷ giá VND**: banner chain "Giữ VND hay USD?…"; dòng mờ "Số liệu phiên … · N phiên trong kho (từ …) · tự đọc từ bảng VIRA Market Watch… kiểm tra chéo bằng đỉnh/đáy 52 tuần". KPI 6 ô: VNIBOR VND qua đêm (1W, bps 1 tuần) · VNIBOR VND 3 tháng (1Y) · VNIBOR USD 3 tháng (SOFR 3M) · Chênh VND − USD 3M (<1 `neg`) · USD/VND 12 tháng (`mmDep`, >3 `neg`, <0 `pos`) · Lợi thế giữ VND 1 năm (= chênh 1Y − thay đổi USD/VND 12 tháng).

Kỳ hạn `MT = ON,1W,2W,1M,2M,3M,6M,9M,1Y`; SOFR ánh xạ `SOFR_AT` (1W ← `SW`, ON/2M không có). Phiên "1 tuần/1 tháng trước" = `mmIdx(back)`: phiên gần nhất ≤ mốc, không lùi quá 7 ngày so với mốc (trả −1 nếu chuỗi thưa).

| id | Tiêu đề | Kiểu, cbox | Dữ liệu |
|---|---|---|---|
| `mmCurve` | Đường cong lãi suất liên ngân hàng theo kỳ hạn | line, 280 | VND hôm nay navy 2.6; 1 tuần navy `[5,4]`; 1 tháng grey `[2,3]`; USD red 2.2; SOFR kỳ hạn gold `[6,3]` |
| `mmSpread` | Chênh VND − USD theo kỳ hạn | bar, 280 | "Hôm nay": tealInk `rgba(31,138,141,.85)` nếu chênh > mức USD/VND 12T, còn lại navy; "1 tháng trước" xám; vạch đỏ "USD/VND 12T ±x" |
| `mmSpTs` | Chênh VND − USD theo thời gian | line, tall | ON grey, 1M teal, 3M navy 2.6, 1Y purple; vạch USD/VND 12T đỏ + 0 xám |
| `mmFx` | Tỷ giá USD/VND Vietcombank theo ngày | line, 280 | bán ra red, mua navy (pointRadius 3); chuỗi tích luỹ từ 16/10/2026 |
| `mmLvTs` | VNIBOR VND, VNIBOR USD và SOFR theo thời gian | line, tall | VND ON grey, 1M teal, 3M navy 2.6, 1Y purple; USD 3M red; SOFR 3M gold `[6,3]` |
| `mmUsCurve` | Đường cong lợi suất trái phiếu Kho bạc Mỹ | line, tall | `drUsCurve`: 5 snapshot (navy 2.8, teal `[2,2]`, tealInk, red, grey `[5,4]`) |

Bảng "Bảng kỳ hạn · phiên dd/mm/yyyy": Kỳ hạn · VND · Δ phiên · Δ 1T · USD · Δ 1T · SOFR · VND − USD (đậm) · Δ 1T · Δ 1Th (thay đổi tính bằng bps). Đoạn "Cách đọc" + chênh VNIBOR USD 3M − SOFR 3M. Mọi nguồn có link "số dd/mm/yyyy" tới bài Market Watch gốc (`mmLink`, lấy `VIRA_DATA.src[ngày cuối]`).

**`#m-intl` Tỷ giá quốc tế** (`subFxIntl()` `sector.js:1762-1781`):
- Bảng "Bảng tỷ giá quốc tế": mỗi cặp niêm yết một lần — EUR/USD, USD/JPY, GBP/USD, USD/CAD, DXY, USD/CHF, XAU/USD, Brent, USD/CNY, USD/INR, USD/SGD, USD/IDR, USD/VND; cột Hiện tại · 1 tuần · 1 tháng · Từ đầu năm · 1 năm (% thay đổi **giá trị đồng tiền so với USD**; xanh `#1e8f5a` = mạnh lên, riêng DXY xanh = USD yếu đi; đỏ `#c0392b`) · Ngày.
- `fxI_g7` "Nhóm G7: EUR, JPY, GBP, CAD, USD (DXY)" và `fxI_apac` "Nhóm châu Á – Thái Bình Dương: CNY, INR, SGD, IDR, VND" (tall, `win:12`, plugin `fxRebase` → % từ đầu khung; màu `FXC`: EUR navy, JPY red, GBP purple, CAD tealInk, USD grey nét đứt 2.4, CHF `#7a5bb5`, XAU gold, CNY red, INR `#e07b39`, SGD tealInk, IDR purple, VND navy 2.4; vạch 0). Trục ngày chung = các ngày có tỷ giá ECB từ 2021 (`fxAxis`), lấp ngày thiếu ≤ 8 ngày (VND ≤ 10).
- "Nhóm trú ẩn an toàn — so với DXY (nét đứt, trục phải)": `fxS_jpy`, `fxS_xau`, `fxS_chf`, `fxS_oil` (tall, `win:12`; chuỗi chính trục trái, DXY grey `[5,4]` trục phải; `fxS_oil` thêm WTI `#D9822B`). Riêng `fxS_jpy`: chấm can thiệp navy viền trắng (bảng cứng `JPI`, `sector.js:1811-1815`, 2 điểm 07/2026 là ước tính; tooltip "~¥x nghìn tỷ ≈ US$y tỷ", quy đổi theo USD/JPY đóng cửa), dải `jpiBand` = vùng giá các lần can thiệp 12 tháng, vạch đỏ ngang "Can thiệp gần nhất dd/mm/yyyy: giá". Insight `safeIns`: % 1 tháng/YTD, so DXY, **tương quan biến động ngày với DXY 60 phiên** (`corr`), vị trí so vùng can thiệp (JPY), chênh Brent − WTI vs bình quân 1 tháng/1 năm/5 năm (`bwIns`).

### 5.3. Tab con Kịch bản IDX-FX × IDX-LIQ (`data-pp="idx"`, `subIdx()` `sector.js:3020-3056`, `chIdx()` `3057-3069`)

Dữ liệu `SECTOR_DATA.idx` (dựng bởi `build_sector_data.py` từ Wi MCP; tài liệu ngành mô tả chi tiết). Gồm: card "Chuỗi truyền dẫn: Thế giới → NHNN → Ngân hàng" (`chainCard`, 3 ô `.chain3`, pill từ tín hiệu R-10, R-13) · `chMatrix` (scatter, tall; trục x/y −2,5…2,5; 12 tháng gần nhất navy `.35` nối đường; điểm hiện tại đỏ r=8; plugin `quadBg`) · `chIdxHist` (line, tall; IDX-FX red, IDX-LIQ navy 2.4; vạch ±1; nền tháng theo kịch bản: ease `rgba(30,143,90,.10)`, drain `rgba(217,164,0,.12)`, room `rgba(41,56,168,.08)`, tight `rgba(192,57,43,.10)`) · hai bảng đóng góp thành phần (ID, thành phần, giá trị, z 36 tháng, dấu, đóng góp) · bảng backtest (pill "chưa đạt") · danh sách chỗ lệch deck · `bankBtCard` kiểm định với giá cổ phiếu/LNST ngân hàng (pill "không đạt") · bảng "Kịch bản → tác động lên từng nhóm ngân hàng" (dòng kịch bản hiện tại class `hl`).

---

## 6. Tab 4 · Hàng hóa (`#cmd`, `paneCmd()` `sector.js:2615-2650`)

Nguồn `window.CMD_DATA = {built, groups:[[g, tên]], items:[{k,n,u,g,dp,src,d[],v[]}]}`. 5 nhóm: `nl` Năng lượng · `vt` Vận tải biển · `kl` Kim loại · `cn` Nguyên liệu công nghiệp, phân bón · `ns` Nông sản, thực phẩm (20 mặt hàng — danh sách ở §10.6).

1. **Bảng giá hàng hóa** (`table.etab.cm#cmdTab`): dòng nhóm `tr.grp`; mỗi mặt hàng: tên · đơn vị · giá gần nhất (đậm, `dp` riêng) · 7 cột % thay đổi `CMD_B` = 1 ngày (`p`), 1 tuần (7), 1 tháng (30), 3 tháng (91), Từ đầu năm (`ytd` = so phiên ≤ 31/12 năm trước), 1 năm (365), 3 năm (1095) — xanh `#1e8f5a`/đỏ `#c0392b`, `|v|<0,005` không màu · Ngày (mờ nếu cũ hơn 10 ngày so với `TODAY`). `cmdChg` (`sector.js:2538-2547`) trả `null` nếu phiên gốc xa mốc quá `max(10, 40 nếu ytd, 12% số ngày)`. Insight `cmdTabIns()`: top 3 tăng/giảm YTD, 2 dẫn đầu/yếu nhất 1 tháng. Thanh `#cmdShotBar` = nút ảnh bảng (`FinSuccess_bang-gia-hang-hoa`) + menu chuột phải (Vẽ chart dòng này, So sánh). Bấm dòng → chọn (`tr.sel` nền `--soft`) và cuộn tới chart.
2. **Card lịch sử một mặt hàng**: tiêu đề `#cmdOneH` "Tên (đơn vị)"; `select#cmdSel` có `optgroup` theo nhóm; canvas `cmdOne` (tall, `win:36`): line navy 2; mặc định `cmdSel='brent'`. Khi có hàng so sánh (`cmdCmp`) → quy về **chỉ số, đầu kỳ 3 năm = 100**, vạch 100, màu `CMP_CC`. Nguồn `#cmdOneSrc` = `item.src`.
3. **"Diễn biến theo nhóm — % thay đổi từ đầu khung đang xem"**: `cmdG_<g>` cho mỗi nhóm (tall, `win:12`, `fxRebase`, màu `CMD_CC = [navy, red, tealInk, gold, purple, grey]`, mặt hàng đầu rộng 2.4; khung dữ liệu 3,2 năm). Insight `cmdGrpIns(g)` liệt kê giá, % 1 tháng, % YTD + hàm ý nhóm (`CMD_GI`); nhóm Kim loại tính thêm **chênh vàng SJC − vàng thế giới quy đổi**: `thế giới (triệu đ/lượng) = USD/ounce × 1,20565 × USD/VND NHTM bán / 10⁶`, `SJC = nghìn đ/lượng / 1000`.

---

## 7. Tab 5 · Catalyst · Risk (`#vrisk`, `paneVRisk()` `sector.js:3355-3365`)

`banner.warn`: "**n/N rủi ro ở mức cao**: tên…. CPI chung x% so cùng kỳ (mm/yyyy), mục tiêu khoảng 4,5%. Bấm từng dòng…".

Hai bảng `table.risk-t` (`riskTable`, `sector.js:3292`): cột Lớp · Rủi ro · Số hiện tại · Xu hướng · Mức rủi ro (pill Cao `risk` / Trung bình `watch` / Thấp `ok`) · ▾. Bấm dòng `tr.rk` → mở `tr.rkd` gồm đoạn `p.cnote` giải thích cơ chế + chart (canvas `<tid>c<i>`, `height:260px`, vẽ lần đầu mở) + phần phụ (`extra`).

**Bảng 1 `#rkV` "Lạm phát và tỷ giá: truyền dẫn từ cú sốc giá"** (`vRiskRows`, `sector.js:3305-3354`; cần `VRISK` và `ECO_DATA`):

| Lớp | Rủi ro | Mức rủi ro | Chart |
|---|---|---|---|
| Lạm phát | Giá dầu → CPI giao thông | đóng góp vào CPI chung `cc = path[0].v × 9,67/100`: >1 cao, >0,5 TB | CPI giao thông thực tế navy vs mô hình red `[4,3]` + cột tương quan theo độ trễ 0–12T (cột trễ tốt nhất đỏ, còn lại `#b9c0cf`; cbox 180px) |
| Lạm phát | Giá thịt lợn → CPI hàng ăn | `|cc|` với tỷ trọng 33,56%: >1 cao, >0,5 TB | như trên với `VRISK.hogFood` |
| Tỷ giá | Fed → tỷ giá USD/VND | chênh LNH qua đêm VND − EFFR (tháng) < 0 cao, < 1 TB | cột chênh (đỏ khi âm, xanh nhạt khi dương) + USD/VND YoY navy trục phải |
| Tỷ giá | Chênh tỷ giá tự do − ngân hàng | > 400đ cao, > 150đ TB | line đỏ từ 2025, vạch 0 |
| Tỷ giá | Dự trữ ngoại hối | thay đổi 6 tháng < −5 tỷ USD cao, < 0 TB | line purple từ 2019 |
| Tỷ giá | Chênh giá vàng SJC − thế giới | > 10% cao, > 5% TB | line gold từ 2024; công thức `SJC/(USD/oz × 1,20565 × USD/VND/1000) − 1` |
| Tỷ giá | Cán cân thương mại | tổng 3 tháng < 0 cao; 12 tháng < 10 tỷ TB | bar xanh/đỏ từ 2022 |

Văn bản "how" của hai dòng lạm phát đọc thẳng các tham số mô hình: `lagBest`, `corBest`, `cum×10` ("Brent tăng 10% so cùng kỳ và giữ nguyên → CPI giao thông tăng khoảng x điểm % sau K tháng"), `t`, `r2`, `ronTrans` (RON95 → CPI giao thông), mẫu `from–to`, `n`. Tỷ trọng CPI dùng `CPIW = {trans: 9.67, house: 18.82, food: 33.56}` (`sector.js:3304`).

**Bảng 2 `#rkVi` "Rủi ro quốc tế"** = các dòng `g === 'Quốc tế'` của `riskRows()` (dùng chung với trang Ngành) trừ dòng Brent: Đồng USD (DXY) (1 tháng > 2% cao; > 0,5% hoặc 1 năm > 5% TB) · Kỳ vọng lãi suất Fed (kỳ vọng phiên thứ 8 − điểm giữa > 0,1 cao, < −0,1 thấp) · Bảng cân đối Fed (1 tháng < −20 tỷ cao) · Lợi suất TPCP Mỹ 10Y (>5% hoặc +25 bps/tháng cao; >4,5% TB).

---

## 8. Tab 6, 7, 8

### 8.1. Nhật ký chuyên viên (`#quick`, `paneQuick()` `sector.js:3628-3713`)

Gọi `buildAll()` trước (dựng ẩn mọi tab để có `SPEC` của mọi chart). Danh sách bản = `SECTOR_DATA.quick.updates` (từ `data/quick-updates.json`, mới nhất trước) + bản nháp `localStorage['quDraft']` nếu có. Mỗi bản: ngày, "Cập nhật bởi" (AI/Chuyên viên), pill Mới nhất/Bản cũ/Nháp, tiêu đề, "Tiếp nối bản …", tóm tắt `ul.qsum`, KPI, các mục `section.qc` theo phạm vi `QSCOPE` (`nganh` Ngành ngân hàng, `noi` Kinh tế trong nước, `qt` Quốc tế), mỗi mục có trạng thái (`ST`: mới/nóng lên/tiếp diễn/hạ nhiệt), ghi chú, "So với bản trước", và chart vẽ lại từ `SPEC` theo id (`drawSpec(id, 'qu-i-j-id', last, {win, marks})`). Bảng "Theo dõi tiếp", nguồn, "Lịch sử cập nhật".
- **✎ Chỉnh sửa**: các đoạn `[data-f]` thành `contenteditable`; "Rà soát chính tả" gọi `vcCheck` (`assets/notes.js`); "Lưu thành bản mới" tạo id `QU-<ngày>-CV-<số>`, ghi danh sách `edited`, lưu `quDraft`; tên người sửa lưu `quWho` (mặc định "Minh Đức"). "Sao chép để đăng" chép JSON kèm câu lệnh cho AI.
- **⤓ Xuất PDF** (`quPdf`): nạp `html2pdf.js 0.10.1` từ cdnjs khi bấm; đổi canvas → ảnh; đầu trang logo + "Tổng hợp có sự hỗ trợ của AI"; bỏ nút, insight, nguồn, lịch sử; A4 dọc, lề `[10,10,12,10]` mm, `scale:2`, tránh ngắt trong `.card, .qc-h, .qnote, .qchg, tr, .kpi`. Tên file `FinSuccess_Cập Nhật Vĩ Mô Ngày dd-mm-yyyy.pdf`. Lỗi → `window.print()` với `body.print-quick`.

### 8.2. Chart book (`#book`, `paneBook()` `sector.js:3720-3749`)

`buildAll()` rồi liệt kê **mọi id trong `SPEC`**: bộ lọc nhóm `#bkG` (nhóm = `PANE_LBL[pp|pane]`, hoặc "Quốc tế · <nước>", "Toàn cầu: lợi suất & lạm phát"; nhãn `dom` trên Vĩ mô là "Tiền tệ Việt Nam"), ô tìm `#bkQ` (khớp tiêu đề, id, nhóm, sub). Mỗi card `article.bk` vẽ lười bằng `IntersectionObserver` (`rootMargin:'300px'`) vào canvas `cb-<id>`; chân card có `<code>id</code>` và "Xem ở tab gốc →". `openBook(id)` mở tab và lọc theo id.

### 8.3. Sources (`#src`, `paneSrc()` `sector.js:3550-3570`)

Bảng "Nguồn dữ liệu theo nhóm" (`SECTOR_DATA.sources`), "Công thức tự tính" (IDX z-score 36 tháng tối thiểu 24, kịch bản theo dấu, `D.agg.method`, `D.ldrSens.formula`, `D.consensus.note`, giá = P/B × BVPS), "Độ tin cậy và giới hạn" (`D.idx.deviations` + 3 dòng cố định). Nội dung giống trang Ngành.

---

## 9. Tính năng

### 9.1. Lịch kinh tế (`assets/calendar.js`, `data/calendar-data.js`)

- Tự chạy khi có `window.CAL_DATA.ev`. Chèn vào `body` một **dải dọc** `button.cal-rail` (cố định mép phải, `top:38%`, nền navy, chữ dọc "Lịch kinh tế", huy hiệu đỏ `#e0533d` = số tin mức Cao trong 24 giờ tới của các nhóm đang bật) và **ngăn kéo** `aside.cal-drawer` (rộng **420px**; màn > 900px đẩy nội dung `body.cal-open{padding-right:420px}`; ≤ 900px thành tấm trượt từ dưới cao `82vh`). Phím tắt **C** bật/tắt (không khi đang gõ), Esc đóng.
- Bộ lọc: khoảng `±1 tuần` (mặc định) · `±1 tháng` · `Tùy chọn` (2 ô `input[type=date]`, mặc định ±14 ngày); mức tác động `Cao` (bật) · `Trung bình` (tắt); nhóm nước `Mỹ` (USD) · `Việt Nam` (VND) · `EU / Anh` (EUR, GBP) · `Nhật, Trung Quốc` (JPY, CNY) · `Khác` (tắt). Trạng thái lưu `localStorage['fs-cal']` (`open, range, from, to, imp, g`).
- Danh sách: tiêu đề ngày dính (`.cal-day`, hôm nay `#e7ecfa`), vạch đỏ "Bây giờ hh:mm" (`.cal-now`), mỗi tin: giờ VN (`Asia/Ho_Chi_Minh`) + "dự kiến" nếu `est`, mã nước, chấm mức (H `#e0533d`, M `#f0a23b`), tên tiếng Việt (bảng `NAME` regex), "còn x phút/giờ" nếu < 24 giờ, Thực tế (▲/▼ so dự báo; `*` = lấy từ "kỳ trước" của lần sau) · Dự báo · Kỳ trước (dấu thập phân đổi thành phẩy). Bấm tin → mở chi tiết: tên gốc · kỳ, "CME FedWatch: khả năng cao nhất …" (FOMC), giải thích (`e.note` hoặc bảng `WHY`), sparkline SVG 300×70 của 12 kỳ gần nhất (thực tế navy, dự báo chấm cam), nút "→ Xem chart: …".
- Liên kết chart (`LINK`): ví dụ USD CPI → `gUsCpi` (intl, us), PCE → `gUsPce`, việc làm → `gUsJobs`, FOMC → `gFedPath`, đấu thầu UST → `gUsBtc`, refunding → `gUsNet`, EUR CPI → `gEaHicp`, BOJ → `gJpRate`, CNY CPI/PPI → `gCnPx`, PMI EUR/GBP/CNY → `gGlPmi` (c `gl` → tab `heat`), VND CPI → `chCpi`, PMI → `eIip`, GDP → `eGdp`, bán lẻ → `eRet`, thương mại → `eTb`, CPI/lãi suất GBP/CAD/AUD/NZD/CHF → `gGlCpi`/`gGlPol`. Đi tới chart qua `FSNAV.reveal` (mở tab con, nước, mục thu gọn), cuộn giữa và nháy `flash`; không có `FSNAV` (trang khác) → `vimo.html#cal-<id>` (trang Vĩ mô tự đi tới sau 1,2 s).
- Plugin `calMark` vẽ nhãn "Kỳ tới: … · dd/mm hh:mm · dự báo x ›" lên chart có liên kết trong 7 ngày trước công bố; ưu tiên tin mức Cao, CPI ưu tiên y/y (`PRI`).
- Tự làm mới mỗi 60 s (huy hiệu; danh sách nếu đang mở và không rê chuột). Chân ngăn kéo: "Lịch, dự báo và kỳ trước: Forex Factory; FOMC: CME FedWatch; số thực tế: BLS, BEA, ECB, NBS, Cục Thống kê…".

### 9.2. Bộ chọn và khung thời gian

- `tfPick(id, opts)` + `wireTf(id, draw)` (`sector.js:1044-1045`): `div.picker.tf[data-tf]`, nút đầu bật sẵn. Danh sách đầy đủ trên Vĩ mô: `glY`, `glA`, `glM`, `glC` (tab 1); `usTay`, `usCpi`, `usCpiC`, `usPce`, `usPpi`, `usPceC`, `usAuct`, `usBtc`, `jpBtc` (Quốc tế); `eCpiCtK`, `eCpiG`, `eXnkK` (Kinh tế). Không có localStorage cho các bộ chọn này.
- Khung thời gian trên từng chart: thanh `.rng` của `chartkit.js` (§2.2). Mặc định mở sẵn: `chOn` 3 tháng; `chLnhTen`, `chOmoOut`, `chDep`, `bCurveTs`, `fxI_*`, `fxS_*`, `cmdG_*` 12 tháng; `gUsFedRepo` 24 tháng; `gGlPmi`, `eIip`, `eRet`, `eRetLv`, `eCpiTs`, `eXnk`, `eTb`, `eFdi`, `ePubM`, `cmdOne` 36 tháng; `hmLine` theo khung bản đồ.
- Kéo thả đổi thứ tự nút tab con (`FSK.sortable`, giữ 0,35 s trên cảm ứng) → `fsk-order:vm-vn`, `fsk-order:vm-world`, `fsk-order:intl-country`. Kéo tiêu đề card (biểu tượng ⠿) đổi vị trí card trong lưới → `fsk-cards:vimo.html:<tab con|nước|pane>:<số thứ tự lưới>` (`chartkit.js:315-349`, tự áp cho mọi `.grid` có ≥ 2 card).

### 9.3. Ảnh bảng (`assets/tblshot.js`, `window.FSTbl`)

Dùng cho bản đồ nhiệt và bảng giá hàng hóa.
- `FSTbl.button(scrollEl, meta)` (`tblshot.js:100`) → 3 nút `.tbl-shot`: "⇪ Chia sẻ ảnh" (mở hộp chia sẻ `FSShareImage` của `share.js` với ảnh bảng trần, caption, khung 16:9 / 4:5), "Chép ảnh bảng" (clipboard PNG; không được thì tải về), "Tải PNG".
- `render(sc, o)` (`tblshot.js:16-78`) vẽ **phần bảng đang hiện** (chỉ cột hiện trọn + cột dính trái) ra canvas độ phân giải ×2: nền trắng, logo FinSuccess góc phải (chữ "FinSuccess" `bold 18px #1D2678` nếu chưa tải được logo / chạy `file:`), tiêu đề `bold 18px #1D2678`, sub `12px #596272` tự xuống dòng, ô giữ màu nền/chữ/đậm/căn lề thật, dòng ẩn và nhóm `grp-off` bị bỏ, chân "Nguồn: …" `11px #8a93a3`.
- `FSTbl.enhance(sc, handlers)` (`tblshot.js:115`): rê chuột tô sáng dòng × cột (`.xh`, ô `.xh-on`); **chuột phải** mở `.tbl-menu`: Chép ảnh dòng này · ⇪ Chia sẻ ảnh bảng, tô sáng ô này · Chép ảnh bảng, tô sáng ô này · Chép ảnh bảng đang xem · Tải PNG (tô sáng / đang xem) · Vẽ chart dòng này · Thêm/Bỏ dòng này khỏi chart so sánh · Xoá so sánh (n dòng). Thông báo `.tbl-toast` 2,2 s.

### 9.4. localStorage dùng trên trang Vĩ mô

| Khoá | Ghi bởi | Nội dung |
|---|---|---|
| `fs-hm` | `hmRender` | `{v, w, n}` bản đồ nhiệt |
| `fs-cal` | `calendar.js` | trạng thái lịch kinh tế |
| `fs-col:vdom`, `fs-col:eco`, `fs-col:mm2` | `collapsify` | mục thu/mở của Tiền tệ, Kinh tế, Tỷ giá |
| `fs-bank-ui` | `setMode` | luôn `compact` |
| `fs-bank-sector` | `store` | dùng chung với Ngành (quan điểm ngành; header Vĩ mô không đọc) |
| `quDraft`, `quWho` | Nhật ký chuyên viên | bản nháp, tên người sửa |
| `fsk-order:*`, `fsk-cards:*` | `chartkit.js` | thứ tự nút tab, thứ tự card |
| `fsDevView` | `devview.js` | chế độ Developer (hiện mục `devonly`) |

### 9.5. Định tuyến bằng hash

`#heat|vn|world|cmd|vrisk|quick|book|src` (tab) · `#eco|dom|intl|mm|idx` (tab con) · `#gl` (→ heat) · `#<tab con>~<idChart>` (cuộn tới chart) · `#cal-<idChart>` (lịch kinh tế đi tới chart). Khoá thuộc trang Ngành (`picture`, `bank`, `policy`…) → chuyển sang `nganh.html#…`. Trang Ngành dựng ẩn các tab con vĩ mô trong `section#vmx` (`vmxBuild`) để dùng chung chart.

---

## 10. Đường đi dữ liệu

### 10.1. Lịch chạy (GitHub Actions)

| Workflow | Cron (UTC) | Giờ VN | Việc làm |
|---|---|---|---|
| `fetch-global.yml` "Cập nhật số liệu quốc tế (FRED, NY Fed, DBnomics)" | `17 23 * * *` và `47 9 * * 1-5` | 06:17 hằng ngày; 16:47 ngày làm việc | Python 3.12, `pip install openpyxl xlrd numpy`; chạy lần lượt `fetch_global, fetch_ust, fetch_jp, fetch_jgb_auct, fetch_daily, fetch_fedwatch, fetch_ois, fetch_calendar, fetch_dlkt, fetch_market, fetch_cmd, fetch_hm_hist (FORCE=1 khi chạy tay)` (mỗi lệnh `|| echo lỗi` để không chặn lệnh sau) → `build_global, build_calendar, build_auto, build_eco, build_hm_hist, build_cmd, vimo_risk_models, build_catalog` → commit `data/global`, `global-data.js`, `fx-daily.js`, `data/vn`, `sector-data.js/.json`, `eco-data.js`, `hm-hist.js`, `cmd-data.js`, `vimo-risk.js`, `catalog.js`, `data/calendar`, `calendar-data.js` (người commit `fs-data-bot`, thử push 3 lần) → `gh workflow run pages.yml` |
| `fetch-vira.yml` "Cập nhật thị trường tiền tệ (VIRA Market Watch)" | `47 10 * * 1-5` | 17:47 ngày làm việc | cài `tesseract-ocr`, `pillow pytesseract numpy`; `fetch_vira.py` (`MAX_PAGES` mặc định 2; nạp lịch sử 40) → `build_vira.py` → commit `data/vira`, `vira-data.js` → deploy |
| `vira-backfill.yml` (chạy tay) | — | — | chia trang thành khúc (`pages` 60, `chunk` 3), OCR song song tối đa 20 máy → `merge_vira.py parts` (trùng ngày giữ bản nhiều dòng hợp lệ hơn) → `build_vira.py` |
| `pages.yml` | push `main` | — | `scripts/gom_site.sh` (copy `*.html`, `assets`, `data/*.js` vào `_site`, gắn `?v=<sha7>` vào mọi script/CSS, thay `__BUILD__`, ghi `version.json`; thiếu `vira-data.js` thì tạo `window.VIRA_DATA = null;`) → deploy; job 2 dựng PDF chữ thật các tab bằng Playwright (`scripts/build_pdfs.js`) rồi deploy lại |

Không tự động: `bond-data.js` (`build_bond_data.py` từ Wi MCP), phần nền `sector-data.json` (`build_sector_data.py` từ Wi MCP: `dom`, `intl`, `idx`, `quick`, `sources`), các file bù `data/backfill/*.json` (`eco_backfill.py`, `cmd_wi_backfill.py`, `vn_hist_backfill.py`, `surveys.json`, `cn_ppi.json`) — chạy lại sau mỗi lần kéo số Wi MCP trong phiên AI.

### 10.2. `window.GLOBAL_DATA` — `fetch_global.py` → `data/global/series.json` → `build_global.py` → `data/global-data.js`

**`fetch_global.py`** (343 dòng): danh mục `CAT` khoảng 146 khái niệm (README cũ ghi ~65), mỗi khái niệm có danh sách mã ứng viên; tải hết, **giữ ứng viên có quan sát mới nhất**; lỗi mạng thì giữ bản cũ và đánh dấu `stale:true`. Chuỗi từ 2010. Tiền tố nguồn:

| Tiền tố | URL |
|---|---|
| `fred:` | `https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}&cosd=2010-01-01` |
| `dbn:` | `https://api.db.nomics.world/v22/series/{path}?observations=1&format=json` |
| `ecb:` | `https://data-api.ecb.europa.eu/service/data/{flow}/{key}?format=csvdata&startPeriod=…` |
| `oecd:` | `https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS…` |
| `bis:` / `bisq:` | `https://stats.bis.org/api/v1/data/WS_LONG_CPI/M.{cc}.771` (tháng) / `Q.{cc}.771` (quý) |
| `cbpol:` | `https://stats.bis.org/api/v1/data/WS_CBPOL/D.{cc}?format=csv&startPeriod=2015-01-01` |
| `nbs:` | NBS Trung Quốc qua DBnomics |
| `hlw:` | `https://www.newyorkfed.org/…/Holston_Laubach_Williams_current_estimates.xlsx` (r*) |
| `nyfed:sofr99` | `https://markets.newyorkfed.org/api/rates/secured/sofr/search.json?startDate=2018-04-02…` |

Ví dụ mã: CPI `CPIAUCSL`, lõi `CPILFESL`, supercore `CUSR0000SASL2RS`, PCE lõi `PCEPILFE`, PCE supercore `IA001260M`, trimmed `PCETRIM12M159SFRBDAL`, PPI `PPIFIS/PPICOR/WPSID61/WPSID62`, `UNRATE`, `PAYEMS`, `GDPC1`, `GDPPOT`, `NROU`, `UMCSENT`, `MICH`, `DFF`, `DFEDTARU/L`, `IORB`, `SOFR`, `TGCRRATE`, `DGS2`, `DGS10`, `WALCL`, `WSHOBL`, Z.1 `BOGZ1FL…` (ai nắm UST), `ECBDFR`, `ECBASSETSW`, `DEXUSEU/DEXJPUS/DEXCHUS`, `JPNASSETS`, `TRESEGJPM052N`, CPI Nhật `dbn:STATJP/CPIm/001|733|740`, lợi suất 10Y châu Âu `ecb:IRS/M.<CC>.L.L40.CI.0000.EUR.N.Z`.

**Các fetch bổ sung** (đều ghi vào `data/global/`):

| Script | Ra | Nguồn |
|---|---|---|
| `fetch_daily.py` | `daily.json` | U.S. Treasury par yield curve CSV hằng ngày (1M–30Y); MOF Nhật `jgbcme.csv` + `jgbcme_all.csv` (từ 2016); ECB `EXR/D.{cur}.EUR.SP00.A` (tỷ giá chéo theo USD + **DXY tính theo công thức ICE**); Bundesbank (Bund 10Y); BoE IADB (Gilt); ECB `YC/B.U2.EUR.4F…SR_10Y` (AAA và toàn bộ TPCP euro); ChinaBond qua eastmoney; BOK ECOS (Hàn); MAS (Singapore); TPEx (Đài Loan); Yahoo `GC=F` / Stooq `xauusd` (vàng); dulieukinhte.com id `33444, 37551–37554` (**tỷ giá trung tâm, trần, sàn, giá mua/bán của Sở Giao dịch NHNN**); Fed San Francisco CSV đóng góp PCE (`sfpce`); Vietcombank XML (mỗi lần chạy lưu 1 điểm). Lỗi một nguồn thì giữ bản cũ của nguồn đó |
| `fetch_ust.py` | `ust.json` | Fiscal Data API (MSPD bảng 1 theo loại; `auctions_query` theo nhóm người mua; lịch sử bid-to-cover `btcHist`); TIC (nắm giữ UST theo nước) |
| `fetch_jp.py` | `jp.json` | BoJ stat-search API (BS01 Bank of Japan Accounts, Flow of Funds); MOF `foreign_exchange_intervention_operations.csv`, `official_reserve_assets/historical.csv` |
| `fetch_jgb_auct.py` | `jgb_auct.json` | lịch đấu thầu MOF (`calendar/YYMMe.htm`) → trang kết quả; chỉ coupon 2/5/10/20/30/40Y từ 2021; bid-to-cover = đặt thầu cạnh tranh / trúng thầu; tail; cache trang đã đọc |
| `fetch_fedwatch.py` | `fedwatch.json`, `fedwatch_hist.json` | giá ZQ Yahoo (`ZQ<m><yy>.CBT`), lịch FOMC federalreserve.gov (dự phòng danh sách cứng 2026), Kalshi `KXFEDDECISION`, Polymarket, Atlanta Fed MPT xlsx, dot plot FRED `FEDTARMD`, `FEDTARMDLR` |
| `fetch_ois.py` | `ois.json` | hợp đồng SR1/SR3 Yahoo (3 tháng), SOFR NY Fed `last/120.json` |

**`build_global.py`** (512 dòng) — các phép tính:
- **YoY / 3 tháng quy năm / MoM** từ chỉ số giá (`IDX` gồm CPI, PCE, PPI các loại, AHE, Case-Shiller, CPI Nhật): `yoy = (v_t / v_{t−12} − 1)·100` (từ 2012); `m3 = ((v_t / v_{t−3})^4 − 1)·100` (từ 2019); `mom = (v_t / v_{t−1} − 1)·100` (từ 2019). Khoá ra: `<k>_yoy`, `<k>_m3`, `<k>_mom`.
- `us_payems_chg` = chênh lệch tháng; chuỗi ngày `<k>_d` từ 2021-01-01; chuỗi tháng `<k>_m` = bình quân tháng.
- **Bậc thang thanh khoản** `ladder` (7 dòng, xem bảng §5.1): spread (bps) = `(a − b)·100` theo ngày chung; "Kỳ trước" = điểm thứ 6 từ cuối; `bills4w` = thay đổi 4 tuần của `us_bills`.
- **Quy tắc Taylor**: `π* = 2, α = β = 0,5, Okun = −2`, r* = HLW (quý, giữ trong quý).
  - V1: `i* = r* + π + 0,5(π − 2) + 0,5 × (GDP/GDP tiềm năng − 1)·100`
  - V2: `i* = r* + π + 0,5(π − 2) + 0,5 × (−2 × (thất nghiệp − NAIRU))`
  - π = PCE lõi YoY (`v1`, `v2`) hoặc PCE trimmed mean (`v1_trim`, `v2_trim`); `ffr` = EFFR bình quân tháng. Từ 2012.
- `fedbs` (tài sản/nguồn vốn Fed tuần, tỷ USD; "Khác" = tổng − các cấu phần), `fedMat`, `fedRepo`, `ustHold` (Z.1 quý; "Khác" = tổng − các nhóm), `mspd` + `billShare = bills / (bills+notes+bonds+tips+frn)·100`, `netIss` (thay đổi dư nợ tháng: tín phiếu và coupon = notes+bonds+tips+frn), `auct` (tỷ trọng từng nhóm người mua / `total_accepted`), `btc` (theo kỳ hạn; `avg5y`, `pct5y` = % phiên 5 năm có BTC thấp hơn phiên mới, `ind5y`, `pd5y`), `tic`, `tsy_def12` (cộng 12 tháng / 1000), `bojbs` (100 triệu JPY → nghìn tỷ ÷10.000), `jgbHold`, `feio` (từ 1998), `jpRes`, `jp_res_mof`.
- Ghép chuỗi ngày nguồn gốc (Treasury, MOF, ECB, Vietcombank) **ưu tiên hơn FRED** (`merge_d`); `us_jp_10y_d = (UST10 − JGB10)·100`; `jp_s30_10_d`, `jp_s10_2_d`.
- Khảo sát (PMI ISM/S&P/NBS, Michigan): nền `data/backfill/surveys.json`, nối tháng mới từ FRED (`us_umcsent`, `us_mich`) và PMI Việt Nam từ `data/vn/dlkt.json` (`pmi-271`).
- `cpiTab` (5 nhóm nước, `vn` lấy từ `SECTOR_DATA.dom.cpi` ở trình duyệt), `cpiQ` (Úc, NZ nếu nguồn quý).
- `polTab`: từ chuỗi ngày BIS (Fed = cận trên `DFEDTARU`, ECB = `ECBDFR`) → chuỗi cuối tháng `pol_<cc>_m` từ 2019; mỗi NHTW `{v, d, chg (ngày đổi gần nhất), prev, y0 (mức trước 1/1 năm nay), em}`; nhóm mới nổi (`em`) chỉ dùng cho bản đồ nhiệt.
- `ustCurve` (13 kỳ hạn, snapshot Hiện tại / 1 tuần / 1 tháng / Đầu năm / 1 năm trước), `jgbCurve` (thêm 5 năm trước), `jgbAuct` (tail theo lợi suất = `(y_low − y_avg)·100`), `ois` (giữ 400 phiên), `fedwatch` (bỏ `method`, `zq`), `fedwatchHist`.
- Ghi thêm **`data/fx-daily.js`** (`window.FX_DAILY`) = tập con `vn_sbv_central_d, vn_sbv_ceil_d, vn_sbv_floor_d, vn_sbv_sell_d, dxy_d, usdvnd_vcb_sell` cho chart hành lang tỷ giá (dùng chung với trang Ngành và trang ngân hàng).

Cấu trúc chuỗi: `GLOBAL_DATA.s[k] = {d:[ngày|tháng], v:[số|null]}`; `src[k]` = mã nguồn thắng (`fred:DGS10`…); `label[k]`; `fetched`; `stale` (danh sách khoá dùng bản cũ).

### 10.3. Kỳ vọng Fed và OIS

- **FedWatch** (`fetch_fedwatch.py`): lãi suất bình quân tháng ngụ ý = `100 − giá ZQ`. Tháng có họp: `avg = f·r_trước + (1 − f)·r_sau`, `f = (ngày hiệu lực − 1)/số ngày tháng`, ngày hiệu lực = ngày cuối họp + 1. Neo `r_sau` bằng tháng kế tiếp không họp, hoặc `r_trước` bằng tháng trước không họp, hoặc nối từ phiên trước. Mỗi phiên `Δ = r_sau − r_trước`, bước 25 bps: `k = floor(Δ/0,25)` bước với xác suất `1 − phần lẻ`, `k+1` bước với xác suất phần lẻ; phân phối khoảng mục tiêu = tích chập các phiên trước. `exp_rate` = điểm giữa khoảng bình quân theo xác suất. Khoảng hiện hành từ FRED `DFEDTARL/DFEDTARU`.
- **OIS** (`fetch_ois.py`): SR1 (`100 − giá` = SOFR bình quân tháng) cho các tháng trước kỳ IMM kế tiếp; SR3 (SOFR cộng dồn giữa hai ngày IMM — thứ Tư tuần thứ 3) nối tới ~6 năm. `G(t) = Π(1 + r·n/360)`. Kỳ hạn ≤ 1 năm: `OIS = (G − 1)·360/n`; > 1 năm (trả cố định hằng năm): `OIS = (1 − DF(T)) / Σ α_k·DF(t_k)`, `DF = 1/G`, `α` = số ngày/360. Kỳ hạn `1M, 3M, 6M, 9M, 1Y, 18M, 2Y, 3Y, 4Y, 5Y`. Chưa điều chỉnh độ lồi (2Y lệch ~1–2 bps).

### 10.4. `window.VIRA_DATA` — `fetch_vira.py` → `data/vira/mm.json` → `build_vira.py`

- Duyệt `https://vira.org.vn/tin/Market-Watch.html?page=p`, lấy link `/tin/Market-Watch/Market-Watch-*.html`, tải **ảnh bảng** và đọc bằng **OCR tesseract**. Mỗi dòng được kiểm tra bằng chính số trong bảng: `Last − Highest52W = Change to H52W` và `Last − Lowest52W = Change to L52W` (sai số ≤ 0,011); không qua thì bỏ, không đoán. Kỳ hạn: VND và USD `ON, 1W, 2W, 1M, 2M, 3M, 6M, 9M, 1Y`; SOFR `SW, 2W, 1M, 3M, 6M, 9M, 1Y`. Log ở `data/vira/log.json`.
- `build_vira.py`: `VIRA_DATA = {fetched, d:[ngày tăng dần], vnd:{kỳ hạn:[…]}, usd:{…}, sofr:{…}, src:{ngày: link bài} (30 ngày cuối)}`.

### 10.5. `window.ECO_DATA` — `fetch_dlkt.py` → `data/vn/dlkt.json` → `build_eco.py` → `data/eco-data.js`

- **`fetch_dlkt.py`**: đọc 24 trang `https://dulieukinhte.com/du-lieu/<slug>` (`pmi-271`, `chi-so-gia-tieu-dung-cpi-272`, `sbv-bomhut-tien-334`, `tang-truong-tin-dung-toc-do-353`, `cung-tien-m2-huy-dong-385`, `lai-suat-dieu-hanh-lien-ngan-hang-391`, `lai-suat-huy-dong-vietcombank-376`, `ty-gia-usdvnd-cua-nhnn-427`, `ty-gia-cho-den-719`, `ty-gia-ngoai-te-vietcombank-379`, `gia-vang-407`, `tong-xuat-khau-292`, `tong-nhap-khau-293`, `von-fdi-dang-ky-cap-moi-405`, `gdp-so-sanh-theo-quy-269`, `iip-277`, `ban-le-hang-hoa-va-dich-vu-273`, `gia-xang-dau-406`, `cpi-so-cung-ky-319`, `von-dau-tu-tu-nsnn-317`, `khach-quoc-te-theo-loai-hinh-295`, …), lấy tên dòng `data-row-id` từ HTML rồi tải chuỗi qua `/api/internal/data/series?ids=`. Ghi `dlkt.json` (từ 2019) và `dlkt_hist.json` (trước 2019, gộp tháng: `a` bình quân, `e` cuối tháng).
- **`build_eco.py`**: `m` = tháng từ 2019-01; `s[k]` mảng theo `m`.
  - PMI; IIP (toàn ngành, khai khoáng, chế biến, điện, nước) + `iipSub` = `[tên, tháng cuối, giá trị, tháng trước, bình quân 12 tháng]` các ngành cấp 2 chế biến, sắp giảm dần.
  - Bán lẻ: `<k>_lv` (nghìn tỷ) và YoY tự tính `(v/v_{năm trước} − 1)·100`.
  - CPI 12 nhóm: YoY tự tính từ chỉ số **chỉ khi cả hai tháng cùng kỳ gốc** (`REBASE = '2025-11'`); số bù `data/backfill/eco_wi.json` (Wi MCP) cho phần còn lại; số "CPI so cùng kỳ" công bố trực tiếp (`cpi-so-cung-ky-319`) ghi đè sau cùng. Lạm phát cơ bản: bù + dòng chứa "cơ bản".
  - Thương mại (triệu → tỷ USD): `xk`, `nk` (+`_dom`, `_fdi`, `_lv`), `tb = xk_lv − nk_lv`, `tb_ttm` = tổng 12 tháng liên tục.
  - FDI (bù Wi, triệu → tỷ USD); vốn NSNN `pub` (tháng tự cập nhật từ `von-dau-tu-tu-nsnn-317`), `pub_ytd` (cộng đủ tháng trong năm), YoY; đơn vị nghìn tỷ đồng.
  - Khách quốc tế `tour`, `tour_yoy`.
  - GDP quý theo khu vực (YoY từ chuỗi giá so sánh) `q`, `gq`; số chính thức (`gdp_q` bù) ưu tiên.
  - `fc` = dự báo CPI các tổ chức (`cpiFc` trong file bù), `credY`, `bankIdx`.
- **Đóng góp CPI theo nhóm** (tính ở trình duyệt, `cpiContrib` `sector.js:2052-2059`): quyền số rổ 2019 `CPI_W` (hàng ăn 33,56; đồ uống 2,73; may mặc 5,70; nhà ở 15,73; thiết bị 6,74; y tế 5,39; giao thông 9,67; bưu chính 3,14; giáo dục 6,17; văn hoá 4,55; khác 6,62). `raw_g = Σ CPI_nhóm × w/100`; **quy tỷ lệ** `đóng góp_g = raw_g × CPI_chung / Σ raw` để tổng khớp CPI chung. 6 nhóm (`CPI_G6`): Hàng ăn `#002060`, Nhà ở `#97BAFF`, Giao thông `#C0392B`, Giáo dục `#FFC000`, Y tế `#1F8A8D`, Nhóm khác `#BFBFBF`; 11 nhóm `CPI_G11` thêm `#7B5EA7 #FFE8A3 #5576B8 #8FD3D5 #D98880`.

### 10.6. `window.CMD_DATA` — `fetch_cmd.py` → `data/global/cmd.json` → `build_cmd.py`

- `fetch_cmd.py`: WTI `DCOILWTICO`, Brent `DCOILBRENTEU` (FRED/EIA, từ 1986–87); vàng `GC=F`, bạc `SI=F`, đường `SB=F` (Yahoo, từ 2000). Lỗi giữ bản cũ.
- `build_cmd.py`: 20 mặt hàng `ITEMS` với nguồn theo ưu tiên (nguồn sau chỉ nối **hai đầu** chuỗi của nguồn trước): Năng lượng (Brent, WTI, Xăng RON 95-V vùng 1 — Wi `ron95_e10` → dulieukinhte `gia-xang-dau-406`/`35131` ×0,001 → Wi `ron95v`); Vận tải biển (BDTI, BCTI, BDI — Wi); Kim loại (vàng, bạc, **SJC** — Wi → dulieukinhte `gia-vang-407`/`35193` ×1000, HRC Trung Quốc, thép Hòa Phát CB240); Nguyên liệu (cao su TQ, PVC TQ, urê Cà Mau, DAP Đình Vũ); Nông sản (đường ICE 11, heo hơi, cá tra nguyên liệu, cá tra giống, tôm chân trắng). Giữ số theo ngày trong ~3,3 năm gần nhất, phần cũ hơn chỉ giữ ngày cuối mỗi tháng. File bù Wi: `data/backfill/cmd_wi.json` (`cmd_wi_backfill.py`).

### 10.7. `window.VRISK` — `vimo_risk_models.py` → `data/vimo-risk.js`

Đọc `eco-data.js` và `cmd-data.js` (chạy sau `build_eco`, `build_cmd`). Biến x = % YoY giá cuối tháng; y = CPI nhóm % YoY.
1. Tương quan `corr(y_t, x_{t−k})`, `k = 0..12` (cần > 24 cặp) → `lagBest`, `corBest`, `cors`.
2. `K = max(lagBest, kmin = 3)`; hồi quy trễ phân phối `y_t = a + Σ_{k=0..K} b_k x_{t−k}` (OLS); truyền dẫn tích lũy `cum = Σ b_k`; sai số chuẩn **Newey-West 12 trễ** (trọng số Bartlett `1 − l/(L+1)`); `t = cum/se`; `R²`.
3. `path[h]` (h = 0..K) = `Σ b_k × x` với x các tháng tới giữ ở mức mới nhất; `fit` = giá trị thực tế và mô hình.

Mô hình: `oilTrans` (Brent → CPI giao thông), `ronTrans` (RON95 → CPI giao thông, `kmax 6, kmin 1`), `oilHouse` (Brent → CPI nhà ở, điện, nước, chất đốt — có trong file nhưng trang chưa hiển thị), `hogFood` (heo hơi → CPI hàng ăn).

### 10.8. `window.HM_HIST` — `fetch_hm_hist.py` → `data/global/hm_hist.json` + bù VN → `build_hm_hist.py` → `data/hm-hist.js`

- `fetch_hm_hist.py` (chạy trong `fetch-global` nhưng **bỏ qua nếu file mới hơn 6 ngày**, trừ `FORCE=1`): lãi suất điều hành BIS `WS_CBPOL` (ngày → cuối tháng) từ 1990; CPI BIS `WS_LONG_CPI` (Úc, NZ quý) dự phòng OECD/FRED `CPALTT01…`; 10Y FRED `IRLTLT01<CC>M156N`/`GS10`; tỷ giá ECB `EXR/M.<cur>.EUR.SP00.E` (từ 1999) trước đó FRED H.10 (`EXJPUS`…), USD = chỉ số USD của Fed; lưu sẵn **% thay đổi giá trị đồng tiền so với USD từ đầu năm**. 17 mã nước `CC` (BIS: US, XM, JP, CN, GB, KR, CA, AU, NZ, CH, IN, ID, TH, MY, PH, SG, VN).
- `build_hm_hist.py`: `HM_HIST = {w: {pol|cpi|y10|fx: {cc: {s, v}}}, vn: {gdp, ret, xk, …, omo, refi, on, dep12s, vn10, fx_ytd, res…: {s, v}}}`; mỗi chuỗi `{s: tháng đầu, v:[…]}`. Phần VN từ `data/backfill/vn_hist.json` (`vn_hist_backfill.py`, Wi MCP), bù bằng `dlkt_hist.json` và lãi suất tái cấp vốn.
- Trang chỉ dùng `HM_HIST` cho tháng mà chuỗi hiện hành chưa có (`hAt`).

### 10.9. `window.CAL_DATA` — `fetch_calendar.py` → `data/calendar/*.json` → `build_calendar.py`

- `fetch_calendar.py`: Forex Factory `https://nfs.faireconomy.media/ff_calendar_thisweek.json` (chỉ giữ High → `H`, Medium → `M`; lưu dồn `ff.json`); lịch đấu thầu Kho bạc `Tentative-Auction-Schedule.xml` + dự phòng Fiscal Data `upcoming_auctions` (`ust_auctions.json`, `ust_status.json`); lịch BLS `bls.ics` (`bls.json`).
- `build_calendar.py`: thêm họp NHTW dự kiến (`manual.json.cb`), lịch BLS (CPI, NFP, PPI, JOLTS), đấu thầu UST coupon (13:00 New York; số thực tế = bid-to-cover phiên đó, kỳ trước = phiên trước cùng kỳ hạn) + "Treasury Quarterly Refunding" (08:30 ngày thông báo của phiên 10Y mới), FOMC 14:00 New York với dự báo = cận trên khoảng có xác suất cao nhất từ `fedwatch` (`fw` = "khoảng (xx%)"), Việt Nam ngày 6 hằng tháng ("CPI y/y", tháng 1/4/7/10 thêm "· GDP quý"). **Số thực tế** tính từ chuỗi gốc (`us_cpi_mom/yoy`, `us_cpi_core_*`, `us_payems_chg` dạng "123K", `us_unrate`, PCE, PPI, `us_fedtgt_up_d` ngày sau họp, HICP flash (kỳ = tháng hiện tại nếu ngày ≥ 25), CPI/PPI Trung Quốc, CPI VN từ `SECTOR_DATA.dom.cpi`); thiếu thì lấy "kỳ trước" của lần công bố sau (`ap:1`). Giữ 400 ngày. Định dạng tin: `{c, t, d:'YYYY-MM-DDTHH:MMZ', i, f, p, a?, est?, src, note?, fw?, per?, lk?}`.

### 10.10. Dữ liệu Việt Nam trong `SECTOR_DATA` mà trang Vĩ mô dùng

`build_sector_data.py:251-272` (Wi MCP) dựng nền: `intl = {dxy 235028, effr 7079, ust10 234521, vn10 234526, cny 235032, brent 203084}`; `dom = {nhtmSell 82223, nhtmBuy 82224, free 82226, central 82227, freeD/nhtmD (theo ngày từ 2021), ceiling 82228, sbvSell 82231, on 82237, omo 81522, net 82268, dep12State 202886, dep12Large 202874, dep12Other 202880, m2 265954, depYoY 265963, creditYoY 75847, creditYtd 241732, cpi 75701, cpiCore 202889, cpiAvg 75804, reserves 76885, trade 255693, fdi 76951, revQ 82420, expQ 75598, netDaily, onDaily, omoDaily, dep12StateD/LargeD/OtherD (từ 10/2024)}` (số là mã chỉ tiêu Wi MCP).

`build_auto.py` (tự động, sau các fetch) **nối điểm mới** từ dulieukinhte vào nền đó (`DOM_MAP`: `creditYtd` ← `tang-truong-tin-dung-toc-do-353`/"TỔNG CỘNG"; `freeD` ← `ty-gia-cho-den-719`/"Bán ra"; `dep12State` ← `lai-suat-huy-dong-vietcombank-376`/"12 tháng"; `trade` = tổng XK − tổng NK) và **ghi đè** `dom.lnh` (ON/1W/1M/3M/6M/9M từ `lai-suat-dieu-hanh-lien-ngan-hang-391`, từ 2021), `dom.omoOut` ("Tổng OMO đang lưu hành"), `dom.tpOut` ("Tổng tín phiếu đang lưu hành") từ `sbv-bomhut-tien-334`. CPI và M2 của dulieukinhte khác định nghĩa nên **không nối**. Báo cáo ở `data/vn/auto-report.json`.

### 10.11. `window.BOND_DATA` — `build_bond_data.py`

Từ Wi MCP (`wi_data_cbond`, `wi_data_gbond`, `wi_data_macro`), chạy tay. Khối: `dep` (huy động 12T 28 NH chia 4 nhóm `TIERS`, `banks[].m1` = 30 ngày trước), `fi` (coupon theo kỳ hạn, giá trị phát hành `val` theo `≤1/1-3/3-5/>5 năm`, `cf` dòng tiền gốc đã trả/mua lại/dư nợ, `mat` lịch đáo hạn), `cb` (TPDN: phát hành theo ngành, chậm trả, số mã mới, đáo hạn 15 tháng, chậm trả theo ngành), `gb` (`curve` 1Y/3Y/5Y/10Y/20Y mã 234528/234530/234531/234526/234529, `auc` đấu thầu và lãi suất trúng, `fx` khối ngoại, `holders` nhập tay có nguồn từng dòng: KBNN, VBMA, ADB AsianBondsOnline, Bộ Tài chính), `oil` (Brent 203084, WTI 203111, Petrolimex vùng 1 RON 95-III 80241/E10 1276626, E5 1276554, DO 1276560), `big4`, `src`, `meta`. File có dòng đầu "// Sinh tự động … KHÔNG sửa tay."

---

## 11. Quy tắc nội dung thể hiện trong code

1. **Nguồn ghi đúng cơ quan công bố gốc**: các chart quốc tế ghi "U.S. Treasury", "MOF Nhật Bản", "ECB", "BIS", "EIA qua FRED"…; `gsrc()` dịch mã nguồn thành tên tổ chức. Chỉ phần lấy từ Wi MCP mới ghi "Wi MCP <mã>" (tab Tiền tệ, Tổng quan IDX, trái phiếu). Số tự tính ghi "Ước tính FinSuccess…" kèm phương pháp (FedWatch, OIS, bid-to-cover/tail JGB).
2. **Mỗi chart đi kèm insight hai phần**: câu số liệu tự tính từ số đang hiển thị (số quan trọng `<b>`) + "**Hàm ý:**" (`how()`), không dùng "Cách đọc:" trong insight (còn sót hai chỗ: đoạn `p.muted` "Cách đọc:" cuối bảng kỳ hạn VIRA (`sector.js:1715`) và "Cách đọc chart:" trong phần giải thích dòng "Fed → tỷ giá USD/VND" (`sector.js:3325`) — khi dựng lại nên đổi thành "Nhận định:"/"Hàm ý:").
3. **Thuật ngữ tiếng Việt, giữ gốc trong ngoặc**: "phần bù kỳ hạn (term premium)", "giao dịch chênh lệch lãi suất (carry trade)", "trimmed mean", "supercore"… Lịch kinh tế dịch tên tin bằng bảng `NAME`.
4. **Kỳ hạn viết 2Y/10Y/30Y** trong nhãn đường cong; bps cho thay đổi lợi suất, "đ%"/"điểm %" cho chênh lệch tỷ lệ.
5. **Dấu trừ Unicode `−`** và dấu phẩy thập phân (`vi-VN`); ngày `dd/mm/yyyy`, tháng `mm/yyyy`, quý `Qn/yy`.
6. **Màu ngữ nghĩa**: tăng lợi suất/lạm phát → `neg` đỏ; đồng tiền mạnh lên → xanh (`#1e8f5a`); DXY đảo nghĩa. Dòng Việt Nam nổi bật (tím trên bản đồ nhiệt, đỏ trên chart CPI).
7. **Không đoán số**: OCR VIRA chỉ giữ dòng tự kiểm tra khớp; `fetch_*` lỗi giữ bản cũ và trang báo "N chuỗi dùng bản cũ do lỗi tải"; ô thiếu số hiện "–"/"—"; `cmdChg` trả null khi phiên gốc quá xa mốc.
8. **Không đưa chuyện hậu trường lên trang**: mô tả chỉ nói số và ý nghĩa; trạng thái nạp chỉ ở dạng "Đang nạp số liệu.", "Đang chờ số liệu Kho bạc/Fed.".
9. **Tôn trọng giới hạn mô hình**: IDX và kiểm định cổ phiếu luôn hiện pill "chưa đạt"/"không đạt" kèm lý do; OIS ghi "chưa điều chỉnh độ lồi"; FedWatch ghi "có thể lệch nhẹ so với CME FedWatch".
10. **Câu viết sẵn trong insight cần rà khi số đổi**: `subIntlOverview` (Fed tăng 25 bps 16/09/2026, FOMC 27–28/10, đỉnh Brent 118), `subDom` (`chMoney`, `chCredit`, `chExt`, `chFiscal`, `chOn`), `depIns` (Big 4 hạ 50 bps 20–21/10), `bCbLateIns`, `bCbMatIns` (tháng nặng 12/2026…), `bHoldIns`, `chainCard`, `subIdx`, bảng can thiệp `JPI`, ghi chú `mmFx` "từ 16/10/2026".

---

## 12. Danh mục id chart trên trang Vĩ mô

| Tab | id |
|---|---|
| 1 Việt Nam &amp; Thế giới | `hmLine`, `gGlY10`, `gGlAsia`, `gGlY10m`, `gGlCurve`, `gGlOil`, `gGlCpi`, `gGlCpiBar`, `gGlPol`, `gGlPmi` |
| 2 › Kinh tế | `eGdp`, `eIip`, `eIipSub`, `eRet`, `eRetLv`, `chCpi`, `eCpiC`, `eCpiCt`, `eCpiTs`, `eCpiFc`, `chOilChg`, `chOil`, `eXnk`, `eTb`, `eFdi`, `ePubY`, `ePubM` |
| 2 › Tiền tệ | `chFx`, `chFxGap`, `chMoney`, `chCredit`, `chExt`, `chFiscal`, `chOn`, `chLnhTen`, `chOmoOut`, `chDep`, `bBig4`, `dMmCurve`, `bCurve`, `bCurveTs`, `bFiCpn`, `bFiIss`, `bFiMat`, `bCbIss`, `bCbLate`, `bCbMat`, `bCbSec`, `bAuc`, `bAucY`, `bHold`, `bTen`, `bFx` |
| 3 › Mỹ | `gFedPath`, `gUsOis`, `gUsOisTs`, `gUsRates`, `gUsTaylor`, `gUsSpr`, `gUsFedA`, `gUsFedL`, `gUsFedMat`, `gUsFedRepo`, `gUsDebt`, `gUsNet`, `gUsHold`, `gUsAbs`, `gUsAuct`, `gUsBtc`, `gUsTic`, `gUsDef`, `gUsCpi`, `gUsCpiC`, `gUsPce`, `gUsPpi`, `gUsPceC`, `gUsJobs`, `gUsSurvey`, `gUsInfExp` |
| 3 › Euro / Nhật / TQ / Tổng quan | `gEaHicp`, `gEaRate`, `gEaFx`, `gEaBs` · `gJpCpi`, `gJpRate`, `gJpJgb`, `gJpSpr`, `gJpCurve`, `gJpSlope`, `gJpBtc`, `gJpLong`, `gJpBsA`, `gJpBsL`, `gJpHold`, `gJpAbs`, `gJpFx`, `gJpRes`, `gJpResC` · `gCnPx`, `gCnFx` · `chRates`, `chUsd`, `chBrent` |
| 3 › Tỷ giá | `mmCurve`, `mmSpread`, `mmSpTs`, `mmFx`, `mmLvTs`, `mmUsCurve`, `fxI_g7`, `fxI_apac`, `fxS_jpy`, `fxS_xau`, `fxS_chf`, `fxS_oil` |
| 3 › Kịch bản IDX | `chMatrix`, `chIdxHist` |
| 4 Hàng hóa | `cmdOne`, `cmdG_nl`, `cmdG_vt`, `cmdG_kl`, `cmdG_cn`, `cmdG_ns` |
| 5 Catalyst · Risk | `rkVc0…`, `rkVc0b`, `rkVc1b` (biểu đồ lag), `rkVic0…` — id động, chỉ vẽ (và chỉ vào `SPEC`/Chart book) sau khi người xem mở dòng |

Mã chart đầy đủ của cả bộ: `python3 scripts/chart_ids.py` (README).
