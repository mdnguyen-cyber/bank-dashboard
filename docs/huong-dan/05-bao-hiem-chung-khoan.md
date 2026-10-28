# 5 · Ngành Bảo hiểm, Ngành Chứng khoán và trang doanh nghiệp BH·CK

Phạm vi: `bh.html` (ngành Bảo hiểm), `ck.html` (ngành Chứng khoán), `dn.html?s=MÃ` (trang một doanh nghiệp: 6 mã bảo hiểm BVH PVI MIG BMI BIC PTI, 9 mã chứng khoán SSI TCX VCK VPX HCM VCI MBS VND SHS). Cả ba trang dùng chung một file JS là `assets/finsec.js` (1.695 dòng). File này đọc `body[data-page]` để biết đang ở trang nào, và đọc dữ liệu từ `window.FIN_DATA` (`data/fin-data.js`).

Trích dẫn dạng `file:dòng` lấy theo repo tại thời điểm viết (dữ liệu dựng ngày 27/10/2026).

---

## 1. Giải phẫu trang

### 1.1 Ba file HTML gần như giống nhau

Ba file có 44–46 dòng, khác nhau ở `<title>`, `data-page`, tab bar, các `<section>` và thêm 2 script trên `dn.html`.

| | `bh.html` | `ck.html` | `dn.html` |
|---|---|---|---|
| `<title>` | `Ngành Bảo hiểm · FinSuccess` | `Ngành Chứng khoán · FinSuccess` | `Doanh nghiệp · FinSuccess` (JS đổi thành `MÃ · Tên · FinSuccess`, `finsec.js:1184`) |
| `<body data-page>` | `bh` | `ck` | `dn` |
| Link nav có `class="on"` | `<a href="bh.html">` | `<a href="ck.html">` | `<label class="bank-pick on devonly">` (ô chọn BH·CK) |
| Tab | 7 tab (bảng dưới) | 7 tab, giống bh | 5 tab |
| Script thêm | — | — | `data/notes-data.js`, `assets/notes.js` |

Thứ tự trong `<head>` (`bh.html:4-15`):
1. Script kiểm tra phiên bản: biến `V='__BUILD__'` (được `scripts/gom_site.sh` thay bằng 7 ký tự commit SHA). Nếu `version.json` trên server khác `V` thì `location.replace` với `?_v=<mới>`. Khi chạy local, `V` còn chứa chữ `BUILD` nên script thoát ngay.
2. `meta charset`, `viewport`, favicon 32/192, `assets/fs.css`.
3. `assets/devview.js` (phải nằm trong `<head>` để ẩn trang trước khi vẽ, xem 1.4).
4. `<script type="speculationrules">`: prerender `*.html` với độ ưu tiên moderate, prefetch eager `vimo.html`, `nganh.html`.

Thân trang (`bh.html:18-44`):
```
<body data-page="bh">
  .logo-bar > .wrap > .logo-left (logo + nav.site-nav) + .logo-right > #stamp
  .stock-head > .wrap#stockHead          ← JS điền (header ngành / mã)
  nav.tabs[role=tablist] > .wrap#tabbar > button[data-tab]…
  main > .wrap > section.pane#<tab>…     ← mỗi tab 1 section rỗng, JS dựng khi mở lần đầu
  footer > .wrap#foot                    ← JS điền
  <script> Chart.js 4.4.1 (cdnjs) → assets/chartkit.js → assets/share.js → data/fin-data.js → [dn: data/notes-data.js → assets/notes.js] → assets/finsec.js
```
URL Chart.js: `https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js`.

Nav `.site-nav` (giống mọi trang khác của site): Vĩ mô · Ngành Ngân hàng · ô chọn ngân hàng (`label.bank-pick > select`, `onchange="if(this.value)location.href=this.value"`, VCB BID CTG(index.html) TCB MBB ACB, các mã còn lại `disabled` "· sắp có") · **Ngành Bảo hiểm** · **Ngành Chứng khoán** · ô chọn `label.bank-pick.devonly` "BH · CK" có 2 `<optgroup>` (Bảo hiểm: 6 mã → `dn.html?s=MÃ`; Chứng khoán: 9 mã) · Database (`backend.html`).

### 1.2 Tab

`bh.html` và `ck.html` (`bh.html:21-37`):

| `data-tab` / `section#` | Nhãn | Builder (`finsec.js:1680`) |
|---|---|---|
| `ov` (active) | 1. Tổng quan ngành | `paneOvBH` / `paneOvCK` |
| `picture` | 2. Bức tranh ngành | `panePicture` (có tab con) |
| `policy` | 3. Chính sách · Quy định | `panePolicy` |
| `catalyst` | 4. Catalyst · Risk | `paneCatalyst` |
| `cons` | 5. Consensus CTCK | `paneCons` |
| `book` | 6. Chart book | `paneBook` |
| `src` | 7. Sources | `paneSrc` |

`dn.html` (`dn.html:22-33`):

| `data-tab` | Nhãn | Builder (`finsec.js:1679`) |
|---|---|---|
| `ov` | 1. Tổng quan | `dnOv` |
| `fin` | 2. Tài chính | `dnFin` |
| `events` | 3. Catalyst &amp; Sự kiện | `dnEvents` |
| `cons` | 4. Consensus CTCK | `dnCons` |
| `val` | 5. 💎 FinSuccess | `dnVal` |

### 1.3 Tab con của "Bức tranh ngành"

`finsec.js:893-912`. Mảng `SUBS` gồm `[key, nhãn, hàm dựng]`:

| Trang | key → nhãn → hàm |
|---|---|
| bh | `whole` Toàn cảnh → `paneMktBH` · `life` Nhân thọ → `paneLife` · `nonlife` Phi nhân thọ và môi giới → `paneNonlife` · `peerbh` So sánh doanh nghiệp → `panePeerBH` |
| ck | `whole` Toàn cảnh → `paneMktCK` · `sec` Ngành công ty chứng khoán → `paneSec` · `mkt` Thị trường → `paneMkt` |

`panePicture()` dựng: `h2.sec` "Bức tranh ngành", `p.sec-sub`, một `div.banner.chain` (chuỗi truyền dẫn), `div.subtabs[role=tablist]` với `button[data-p=key]` (nút đầu có `class="on"`), và các `div.sub[data-pp=key][id=key]` (div đầu có `on`).
- Chuỗi bh: "Lãi suất, thu nhập dân cư → Phí khai thác mới, hủy hợp đồng → Dự phòng và quỹ đầu tư → Lợi suất danh mục → Lợi nhuận, P/B doanh nghiệp bảo hiểm".
- Chuỗi ck: "Thanh khoản, VN-Index, dòng vốn ngoại → Doanh thu môi giới, dư nợ ký quỹ → Chi phí vốn và đòn bẩy → Lãi danh mục → Lợi nhuận, P/B công ty chứng khoán".

`openSub(k, hash=true)`: nếu tab `picture` chưa dựng hoặc chưa active thì gọi `show('picture')`; bật class `on` cho nút và div; dựng tab con lần đầu (cờ `subDone[k]`), bọc trong `try/catch`; ghi `#k` lên URL bằng `history.replaceState`. CSS: `.sub{display:none}.sub.on{display:block}` (`fs.css:102`), nút tròn `.subtabs button.on{background:#e6f6f6;border-color:teal;font-weight:700}` (`fs.css:99-101`).

Lưu ý: `paneMktBH`, `panePeerBH`, `paneMktCK`, `paneMkt` ghi vào tham số `T` (chính div tab con). `paneLife`, `paneNonlife`, `paneSec` bỏ qua `T` và ghi thẳng vào `#life`, `#nonlife`, `#sec`. Kết quả như nhau vì id của div tab con chính là key.

### 1.4 Điều hướng, dựng lười, hash

`finsec.js:1679-1695`:
- `builders` = map tab → hàm. `built = {}` đánh dấu tab đã dựng.
- `show(k)`: nếu `k` không có trong builders thì dùng `ov`; bật `active` cho nút tab (`aria-selected`) và cho `.pane`; dựng lần đầu trong `try/catch`, lỗi thì chèn `<p class="muted">Không dựng được phần này.</p>`; `history.replaceState('#k')`.
- Click tab: `show()` rồi `window.scrollTo({top:0})`.
- Khởi động: `dn` → nếu `W.names[SYM]` không có thì thay `main .wrap` bằng "Không có dữ liệu cho mã này." và dừng; ngược lại `dnHeader()`. bh/ck → `header()`. Footer: `FinSuccess · <MÃ · tên | Dashboard ngành Bảo hiểm/Chứng khoán> (đang xây dựng) · dữ liệu dựng dd/mm/yyyy. Không phải khuyến nghị đầu tư.`
- Hash: bh/ck nếu hash trùng key tab con thì `openSub(h)`, ngược lại `show(h)`. Vì vậy `bh.html#life` mở thẳng tab con Nhân thọ, `dn.html?s=SSI#cons` mở tab Consensus.
- `window.FSSHARE` (giao tiếp với `assets/share.js`, nút chia sẻ ảnh chart): `prep()` dựng mọi tab ẩn (dn: lặp builders; bh/ck: `buildAll` gồm cả tab con), `path(card)` trả về `[tên tab bỏ số thứ tự, tên tab con]`.

### 1.5 Developer view (`assets/devview.js`)

Ba trang này chỉ hiện ở "Developer view":
- `PASS_SHA256 = '600352d4…0e2'`. Khóa localStorage `fsDevView = '1'`. Regex `DEV_PAGES = /\/(bh|ck|dn|fin|backend)\.html$/`.
- Có dev: `html.dev`. Không dev mà đang ở trang dev: `html.dev-gate`, CSS `html.dev-gate body>*:not(#devGate){display:none!important}`, khi DOM sẵn sàng chèn `#devGate` (tiêu đề "Trang dành cho developer", form mật khẩu, link về `index.html`). Nhập đúng thì lưu cờ và `location.reload()`.
- CSS chèn: khi không dev thì ẩn `a[href="bh.html"]`, `a[href="ck.html"]`, `a[href="backend.html"]` và `.devonly` trong `.site-nav`.
- Trên mọi trang, nút `.dv-btn` được chèn đầu `.logo-right`: "🛠 Developer view" (bấm để thoát; nếu đang ở trang dev thì về `index.html`) hoặc "👁 User view" (bấm để mở pop-up nhập mật khẩu). So mật khẩu bằng `crypto.subtle.digest('SHA-256')`.
- Đây chỉ là ẩn giao diện, không phải bảo mật. `fin.html` là trang chuyển hướng sang `bh.html`.
- `scripts/build_pdfs.js:14` bỏ qua `bh|ck|dn|fin|backend` khi dựng PDF.

---

## 2. Hạ tầng dùng chung trong `finsec.js`

### 2.1 Hằng, định dạng số

`finsec.js:7-19`:

| Tên | Định nghĩa |
|---|---|
| `F, I, S, W` | `F = window.FIN_DATA` (không có thì `return`); `I = F.ins`; `S = I.S`; `W = F.wi` |
| `PAGE` | `document.body.dataset.page \|\| 'bh'` |
| `nf(v,d=0)` | `toLocaleString('vi-VN')` với đúng d chữ số thập phân; null/NaN → `—` |
| `pc(v,d=1)` | `nf(v*100,d)+'%'` (v là tỷ lệ 0,123) |
| `sg(v,d=1)` | như `pc` nhưng có dấu `+`/`−` (U+2212) |
| `xx(v,d=2)` | `nf(v,d)+'x'` (`:996`) |
| `dvn(s)` | `yyyy-mm-dd` → `dd/mm/yyyy` |
| `qLbl(q)` | `2026Q2` → `Q2/2026`; `prevQ`, `yoyQ` lùi 1 quý / 4 quý |
| `kyLbl(k)` | `2026-12` → `Năm 2026`; `2026-08` → `8T/2026` |
| `kyShort(k)` | `2026-12` → `2026`; `2026-08` → `8T/26` |
| `WI` | chuỗi `'Wi MCP'` dùng làm nhãn nguồn |

Bảng màu `C` (`:17-18`): `navy #1D2678`, `blue #2938A8`, `teal #59C5C8`, `tealInk #1f8a8d`, `purple #861C52`, `gold #d9a400`, `red #c0392b`, `grey #9aa3b2`, `green #1e8f5a`; `C.pal = [#1D2678, #59C5C8, #861C52, #d9a400, #5576B8, #1f8a8d, #c0392b, #9aa3b2, #8997D6, #6b4f2a]`. Màu phụ hay gặp: `'#d5d9e2'` (phần "Khác"/mờ), `C.blue + '55'` (kỳ so sánh, nhạt), `'#c9ced8'` (run-rate, "chưa tách"), `'#b9c0cc'` (báo cáo cũ).

### 2.2 Mặc định Chart.js và tooltip có nguồn

`finsec.js:57-69`:
- Font `Arial, "Helvetica Neue", sans-serif` 11,5px, màu `#3f4656`; legend dưới, `boxWidth 12`; `maintainAspectRatio:false`; `animation:false`.
- Nhãn tooltip mặc định: `${ds.label}: ${nf(v, ds.dp ?? 1)}${ds.unit || ''}`. Mỗi dataset tự mang `unit` và `dp` (thuộc tính tự đặt, Chart.js bỏ qua). Với `indexAxis:'y'` lấy `parsed.x`.
- **Footer nguồn theo từng điểm**: nếu dataset có mảng `$src`, phần tử `$src[dataIndex]` là số → in `S[s][1]` (tên bài/bản tin gốc); là chuỗi → in nguyên chuỗi. Gộp không trùng, `'Nguồn: a · b'`. Footer font thường 10,5px.

### 2.3 `mk(id, cfg, o)` và SPEC cho Chart book

`finsec.js:70-87`:
1. Hủy chart cũ cùng id (`charts[id].destroy()`).
2. Nếu id không bắt đầu bằng `cb-` (không phải bản sao trong Chart book): tìm `article.card` chứa canvas, lấy `:scope > h3.sub` làm tiêu đề, `.chart-sub`, `.src`; lưu `SPEC[id] = {cfg: bản sao sâu, ts, title, sub, src}`. Hàm `cl()` sao chép object/array thuần (giữ nguyên function).
3. Đặt `interaction` mặc định `{mode:'index', intersect:false, axis: indexAxis==='y' ? 'y' : 'x'}`.
4. `FSK.prep(cfg)` (`assets/chartkit.js`): với chart combo cột + đường, đưa đường lên trên cột (`dataset.order`).
5. `new Chart`; nếu `o.ts` thì `FSK.enhance(chart, {today: new Date(F.built)})`: thêm nút 1M · 3M · 6M · YTD · 1Y · 3Y · 5Y · Tất cả và kéo chuột để zoom (nhấp đúp để về toàn bộ). Các chart có `ts:true`: `ovPbBH`, `ovPbCK`, `scPb`, `chPrice`, `chGovPx`.

Hàm dựng dataset (`:88-92`):
- `bar(label, data, color, o)` → `{type:'bar', backgroundColor=borderColor=color, borderRadius:3, unit:'', dp:0, ...o}`.
- `line(label, data, color, o)` → `{type:'line', borderWidth:2, pointRadius:2, tension:0, spanGaps:true, unit:'%', dp:1, ...o}` (chú ý: mặc định đơn vị `%`).
- `yNum(title, extra)` trục có lưới `#eef0f4`, tick `nf(v,0)`; `yPct` tick `nf(v,0)+'%'`. Trục x hầu hết là `{grid:{display:false}}`.

### 2.4 Plugin

| Plugin | Ở đâu | Làm gì |
|---|---|---|
| `ptLbl` (đăng ký toàn cục, `:72-75`) | mọi chart `type:'bubble'` | vẽ `ds.label` (mã) đậm 11px `#303540` bên phải bong bóng, cách `radius+3` px |
| `vref` (đăng ký toàn cục, `:998-1005`) | khai báo ở `options.plugins.vref.lines` | mỗi vạch `{axis:'y'|'x'|'y1', value, label, color (mặc định đỏ), dash (mặc định [5,4])}`; trục ngang thì vẽ vạch dọc và nhãn ở trên, trục dọc thì vạch ngang và nhãn bên trái trên vạch; font 600 10,5px |
| `rebase` (cục bộ trong `drawPrice`, `:1268`) | `chPrice` | `beforeUpdate`: lấy chỉ số đầu khung đang xem (`scales.x.min`), tìm điểm đầu có dữ liệu, quy chuỗi ngành và VN-Index về cùng điểm xuất phát với giá cổ phiếu: `v / raw[i0] * giá[i0]`. Dữ liệu gốc giữ ở `ds.$raw` |
| `upLab` (cục bộ trong `dnCons`, `:1551`) | `chTp` | vẽ chấm tròn bán kính 5 tại giá mục tiêu và nhãn upside (đỏ nếu TP < thị giá, xanh nếu ngược lại) |
| `sLbl` (cục bộ trong `dnVal`, `:1644`) | `chPbRoe` | ghi mã cạnh từng điểm scatter |

### 2.5 Khung thẻ và kích thước chart

`card({id, title, sub, ins, src, h, body, cls})` (`:95-100`) sinh:
```html
<article class="card {cls}">
  <h3 class="sub">{title}</h3><p class="chart-sub">{sub}</p>
  <div class="cbox {h}"><canvas id="{id}" role="img" aria-label="{title}"></canvas></div>{body}
  <div class="insight">{ins}</div><div class="src">Nguồn: {src}</div>
</article>
```
Kích thước (`fs.css:69-70`): `.cbox` cao **280px**; `.cbox.tall` **340px**; `.cbox.short` **230px**; `.gov2 .cbox` 280px (`fs.css:422`). `chTp`, `chNp` trên dn đặt chiều cao động `max(340, n×24+70)` px (`:1560`). Lưới: `.grid.g2` 2 cột (`fs.css:41`), dưới 760px còn 1 cột; `.gap{margin-bottom:18px}`.

Phụ trợ khác:
- `kpi(l, v, s, cls)` → `div.kpi > span + b + em.{pos|neg}`. Lưới `.kpis` 6 cột (3 cột dưới 1100px, 2 cột trên điện thoại), `.kpis.k4` 4 cột (`fs.css:46-52`).
- `cls(v)` → `pos` nếu ≥ 0, `neg` nếu âm.
- `tbl(head, rows, {num, cls})` → `div.tscroll > table.fz`; mọi cột trừ cột đầu có `class="n"` (canh phải) trừ khi `num:false`.
- `chain(cols)` → `div.vchain` 3 cột `div.vc-col` (`h4`, `p`, các ô `div.vc-k > span + b + em`), có mũi tên "→" giữa cột (dưới 760px thành "↓"), `fs.css:733-744`.
- `gloss(items)` → `dl.gloss` (`fs.css:746`); `drvTbl(rows)` → `table.fz.fdrv` 4 cột Yếu tố · Cơ chế · Tác động lên · Theo dõi (`fs.css:748`); `goSub(k, l)` → `button.lnk[data-gosub]` mở tab con, `wireGo()` gắn click.
- `imp(i)` → `span.imp.p|m|z` cho `+`, `−`, `?` (`fs.css:97`).
- `ovh(n, t)` → `h3.sec2` "n · t".

---

## 3. Nguồn số liệu bảo hiểm và cách gắn nhãn nguồn

### 3.1 Bảng nguồn `I.S`

Mỗi phần tử: `[nhãn hiển thị, tên bài/bản tin, URL, ngày đăng, hạng]` (`build_fin_data.py:51-52`). Hiện có 206 nguồn.

Nhãn hiển thị theo loại nguồn (`build_fin_data.py:13-18, 41-50`):

| Loại nguồn trong workbook (`t`) | Nhãn | Hạng |
|---|---|---|
| `MOF - Niên giám/Báo cáo năm (chính thức)` | Bộ Tài chính – Niên giám Thị trường bảo hiểm Việt Nam | 1 |
| `MOF - Bản tin/Tổng quan (Cục QLGSBH)` | Bộ Tài chính – Bản tin thị trường bảo hiểm (Cục QLGSBH) | 2 |
| `IAV - Hiệp hội Bảo hiểm VN` | Hiệp hội Bảo hiểm Việt Nam (IAV) | 3 |
| `Báo chí dẫn Bộ Tài chính/Cục QLGSBH` | `<tên báo> (dẫn Bộ Tài chính)` | 3,5 |
| `Tổng cục Thống kê (GSO)` | Tổng cục Thống kê (GSO) | 4 |
| `Báo chí/khác` | `<tên báo>` | 5 |
| `DN tự công bố` | `<tên> (doanh nghiệp công bố)` | 6 |
| khác | `<tên báo>` | 9 |

`press_name(n)` cắt tên bài tại ` (`, ` - `, ` – `, ` dẫn `, ` theo ` rồi chuẩn hóa qua `ALIAS` (vd `thời báo tài chính vn` → `Thời báo Tài chính Việt Nam`, `vietnambiz` → `VietnamBiz`).

### 3.2 Hàm nguồn phía trình duyệt

- `srcOf(...arrs)` (`finsec.js:28-31`): gom mọi điểm đang hiển thị (mỗi điểm `[kỳ, giá trị, yoy, chỉ số nguồn]`), lấy nhãn `S[i][0]`, giữ hạng nhỏ nhất của nhãn đó, **xếp theo hạng tăng dần** rồi nối bằng `; `. Dòng "Nguồn:" dưới mỗi chart bảo hiểm do hàm này sinh, nên chỉ liệt kê nguồn thật sự có trong các điểm đang vẽ.
- `FY_SRC` (`:36`): chuỗi cố định "Bộ Tài chính – Niên giám Thị trường bảo hiểm Việt Nam (2016–2024); Bộ Tài chính – Bản tin thị trường bảo hiểm (Cục QLGSBH), số ước năm 2025" cho các chart theo năm.
- Footer tooltip (2.2) in tên bài `S[i][1]` của đúng điểm đang trỏ. Chart nào truyền `$src` thì có footer: `lfFY` (chỉ cột Chi trả), `lfYtd`, `lfMix`, `lfLob`, `lfInf`, `lfShare`, `lfNbShare` (cột kỳ mới), `nlYtd`, `nlLob`, `nlLr`, `catClaims`. Ở `lfLob`, cột năm có `$src = 'Bộ Tài chính – Niên giám'` (chuỗi).
- `latestRel`, `relLink` (`:32-33`) định nghĩa sẵn nhưng không dùng.

---

## 4. Trang `bh.html` · Ngành Bảo hiểm

### 4.0 Header (`header()`, `finsec.js:112-135`)

`div.tick` "BẢO HIỂM"; `div.cname` "Ngành Bảo hiểm · Nhân thọ, Phi nhân thọ, Môi giới" + `span.pill.watch` "Đang xây dựng" + `small` "Thị trường theo số công bố của Bộ Tài chính, IAV; doanh nghiệp niêm yết theo Wi MCP · dựng dd/mm/yyyy". 5 `div.hstat`:

| Nhãn | Giá trị |
|---|---|
| Phí BH `kyShort(kỳ)` | điểm cuối `ser('TOTAL','PREM')`, `nf + ' tỷ'` |
| Tổng phí YoY | `sg(tP[2])` |
| Nhân thọ YoY | `sg(lP[2])` |
| Phi nhân thọ YoY | `sg(nP[2])` |
| P/B ngành | `last(W.secVal['406'].pb)`, 2 số lẻ + `x` |

`#stamp` = "Dữ liệu dựng ngày dd/mm/yyyy".

### 4.1 Tab 1 · Tổng quan ngành (`paneOvBH`, `:724-814`)

`h2.sec` "Tổng quan ngành Bảo hiểm Việt Nam" + sec-sub. Năm tham chiếu `y = 2024`, `gi = FYY.indexOf(2024)`, `last9` = chỉ số năm cuối (2025, số ước). 7 mục, đánh số bằng `ovh`:

**1 · Bảo hiểm trong nền kinh tế**
- 6 KPI: Phí bảo hiểm / GDP (năm 2024 · "đỉnh x% năm 2021" lấy max của chuỗi), Phí bình quân đầu người (`PREM_PER_CAPITA/1000` triệu đồng), Tổng tài sản (năm cuối, ước), Đầu tư trở lại nền KT, Số doanh nghiệp (`nCo('LIFE',2024)` NT · `nCo('NONLIFE',2024)` PNT, đếm DN có doanh thu trong `fydn.prem`), Đại lý và lao động (`AGENTS/1000` nghìn người).
- Card văn bản "Vai trò của ngành" (3 gạch đầu dòng; dòng 3 chèn phí/GDP năm 2024).
- Chart **`ovPen`** "Mức độ thâm nhập bảo hiểm": cột `Phí bình quân đầu người` (navy, triệu đồng, dp 2) + đường `Phí / GDP` (purple, trục `y1` phải, %). Chỉ lấy năm có phí/GDP. Cao 280. Nguồn: Bộ Tài chính – Niên giám. Insight cố định (phí/GDP tăng tới 2021 rồi giảm từ 2022).

**2 · Chuỗi giá trị**
- `lifeChainCard()` (`:699-713`) "Bảo hiểm nhân thọ": 3 cột. (1) Đầu vào: Tổng phí, Phí khai thác mới, HĐ khai thác mới, HĐ có hiệu lực. (2) Trích lập và đầu tư: Dự phòng nghiệp vụ, Tổng tài sản, Dự phòng / tổng tài sản (chỉ khi cùng kỳ), Đầu tư trở lại nền KT, Vốn chủ sở hữu. (3) Đầu ra: Chi trả quyền lợi, Chi trả / phí (cùng kỳ tính ngược từ YoY: `(cl/(1+cl_yoy)) / (p/(1+p_yoy))`). Nguồn: `srcOf` các điểm đó.
- Card "Bảo hiểm phi nhân thọ": 3 cột mô tả chỉ tiêu (Doanh thu · Chi phí nghiệp vụ · Đầu tư), không có số.

**3 · Cấu trúc ngành**
- Card "Mức tập trung, sở hữu và kênh phân phối": số DN và tỷ phần top 5 (`topShare(seg, 2024, 5)` cộng 5 thị phần lớn nhất trong `fydn.share`).
- Chart **`ovShareBH`** "Thị phần doanh thu phí năm 2024": cột ngang (`indexAxis:'y'`), 6 DN nhân thọ (nhãn `NT · tên`, navy) rồi 6 DN phi nhân thọ (`PNT · tên`, teal), không legend, `h:'tall'` (340).

**4 · Các yếu tố tác động**: `drvTbl` 8 dòng (lãi suất, thu nhập và niềm tin, quy định bancassurance, tín dụng ô tô, đầu tư xây dựng xuất nhập khẩu, chi phí y tế, thiên tai, thị trường chứng khoán), cột cuối là nút `goSub` tới `peerbh`, `life`, `nonlife`, `whole`.

**5 · Chu kỳ ngành**
- Chart **`ovCyc`** "Tăng trưởng phí theo năm": cột `Nhân thọ` (navy), `Phi nhân thọ` (teal) và đường `Khai thác mới nhân thọ` (purple), % so năm trước, từ năm thứ hai (2017). Nguồn `FY_SRC`.
- Card "Các giai đoạn của ngành" (4 giai đoạn; chèn phí NT và phí KTM năm 2022).

**6 · Khung pháp lý chủ chốt**: bảng 4 dòng (biên khả năng thanh toán, giới hạn đầu tư, dự phòng toán học, bảng tử vong) × Nhân thọ · Phi nhân thọ · Căn cứ.

**7 · Thuật ngữ**: `gloss` 12 thuật ngữ.

### 4.2 Tab 2 · Bức tranh ngành

#### Toàn cảnh (`paneMktBH`, `:155-187`)
- sec-sub; 6 KPI: Tổng phí, Phí nhân thọ, Phí khai thác mới NT, Phí phi nhân thọ (mỗi KPI có YoY tô màu), Đầu tư trở lại nền KT (nghìn tỷ, kèm tổng tài sản), P/B ngành (kèm "TB 3 năm").
- Card "Điều đang diễn ra" (`ul.ilist`): 5 ý có số (khai thác mới 2025 / đỉnh 2022 = `fy(NB_PREM)[9]/[6]`; HĐ hiệu lực hiện tại so đỉnh; chi trả so phí; tỷ trọng tử kỳ trong HĐ mới; phi nhân thọ YoY; P/B với `zTxt`). Nguồn `srcOf(...)` + Wi MCP.
- Chart **`ovPrem`** "Doanh thu phí bảo hiểm theo năm": cột chồng `Phi nhân thọ` (teal) + `Nhân thọ` (navy) đơn vị tỷ; đường `Phí / GDP` (purple, `y1` phải, 1 số lẻ). Insight: đỉnh phí NT 2022, phí NT 2025, tỷ trọng phi nhân thọ 2025 so 2022.
- Chart **`ovPbBH`** "P/B ngành bảo hiểm": `pbBand(id, sv406, teal)` (`:139-148`) gồm 4 đường không điểm: P/B (teal), Trung bình (xám, nét [5,4]), +1 độ lệch chuẩn (đỏ, nét [2,3]), −1 độ lệch chuẩn (xanh lá). Trục y tick `x.x x`, trục x tối đa 8 nhãn, `ts:true`. Trả về `{m, sd, z}`.
- Card "Doanh nghiệp bảo hiểm niêm yết": `insTable(ms)` 12 cột: Mã (link `dn.html?s=`), Quý, Phí gốc 4Q, YoY, Tỷ lệ bồi thường, Tỷ lệ kết hợp (BVH hiện `—`; >100% màu `neg`), Danh mục / VCSH, LN tài chính / LNTT, ROE, P/B, P/E, Vốn hóa (tỷ).

`zTxt(z)` (`:149`): z > 1 "cao hơn trung bình trên 1 độ lệch chuẩn"; > 0,3 "cao hơn trung bình"; < −1 "thấp hơn … trên 1 độ lệch chuẩn"; < −0,3 "thấp hơn trung bình"; còn lại "quanh trung bình".

#### Nhân thọ (`paneLife`, `:301-394`)
`h2.sec` "Bảo hiểm nhân thọ". Kỳ mới nhất `k = last(ser('LIFE','PREM'))[0]`.

| id | Tiêu đề | Loại, dữ liệu | Insight |
|---|---|---|---|
| `lfFY` | Phí, khai thác mới và chi trả theo năm | cột nhóm: Tổng phí (navy) = `fy(LIFE\|PREM)`, Phí khai thác mới (teal) = `fy(LIFE\|NB_PREM)`, Chi trả quyền lợi (purple) = điểm `-12` của `ser('LIFE','CLAIMS')` (có `$src`) | KTM 2025 / đỉnh 2022; chi trả trên 57 nghìn tỷ từ 2023 |
| `lfYtd` | Tăng trưởng lũy kế từ đầu năm | đường YoY (%) của Tổng phí (navy), Phí KTM (teal), Chi trả (purple); nhãn = mọi kỳ ≥ 2023-01 có trong PREM hoặc NB_PREM | phí, phí mới, chi trả kỳ k |
| `lfMix` | Cơ cấu số hợp đồng khai thác mới theo sản phẩm | `stack100`: cột chồng 100% các nhóm Liên kết đầu tư (navy), Tử kỳ (teal), Hỗn hợp (gold), Còn lại (grey) của `NB_CONTRACTS_MIX`; nhãn = kỳ tháng 12 từ 2016 + kỳ k; trục y max 100 | tỷ trọng tử kỳ |
| `lfInf` | Số hợp đồng có hiệu lực và khai thác mới | cột HĐ có hiệu lực (navy), HĐ khai thác mới (teal), đơn vị triệu (chia 1e6, dp 2); nhãn = kỳ cuối năm + kỳ cuối của IF | cảnh báo định nghĩa đổi 2022/2023 |
| `lfShare` | Thị phần tổng doanh thu phí: 5 doanh nghiệp lớn | đường của 5 DN đầu `LIFE_CO` (Bảo Việt NT, Manulife, Prudential, Dai-ichi, AIA), màu `C.pal[i]`; nhãn = kỳ cuối năm + kỳ cuối của BVNT | BVNT số 1, đáy 18,6% năm 2022 |
| `lfNbShare` | Thị phần khai thác mới | cột ngang, `h:'tall'`: kỳ mới nhất (navy) và cùng kỳ năm trước (`blue+'55'`), 13 DN `LIFE_CO`, sắp giảm dần | tỷ phần BVNT |
| `lfLob` | Cơ cấu tổng doanh thu phí theo nghiệp vụ | cột chồng 100%: năm = `fy(LIFE\|PREM_LOB\|x)/fy(LIFE\|PREM)` (năm nào đủ cả 3 nhóm), cột cuối = `MIX_LOB` kỳ mới nhất; nhóm Liên kết đầu tư (navy), Hỗn hợp (gold), Bán kèm (teal), Còn lại (grey, = 100 − tổng) | liên kết đầu tư > 70% |
| (bảng) | Tỷ lệ hoa hồng: doanh nghiệp nhân thọ lớn | `commTable()`: `table.fz.cmpt` 2 hàng tiêu đề; Hoa hồng / tổng phí 2021–2024 (`r_prem`) và Hoa hồng / phí KTM 2021, 2024 (`r_nb`); số từ báo chí (`st` chứa "Báo chí") có dấu `*` | — |

`kpi`/biến `cp`, `cp0`, `RS`, `AS`… trong `paneLife` được tính nhưng không hiển thị.

#### Phi nhân thọ và môi giới (`paneNonlife`, `:468-546`)
6 KPI: Phí gốc, Bồi thường gốc (màu ngược: tăng là `neg`), Tỷ lệ bồi thường gốc, Tổng tài sản PNT, Đầu tư trở lại nền KT, Vốn chủ sở hữu PNT.

| id | Tiêu đề | Loại, dữ liệu |
|---|---|---|
| `nlFY` | Phí gốc và bồi thường gốc theo năm | cột Phí gốc (navy), Bồi thường gốc (purple); đường Tỷ lệ bồi thường = bồi thường/phí (gold, `y1`) |
| `nlYtd` | Tăng trưởng phí và tỷ lệ bồi thường lũy kế | đường YoY phí gốc (navy) và `LOSS_RATIO` (purple), kỳ ≥ 2023 |
| `nlLob` | Cơ cấu phí theo nghiệp vụ | cột chồng %: 6 nghiệp vụ `NL_LOB` (Sức khỏe navy, Xe cơ giới teal, Tài sản và thiệt hại gold, Cháy nổ purple, Hàng hóa vận chuyển blue, Thân tàu và TNDS chủ tàu tealInk) + Khác (`#d5d9e2`, = 1 − tổng nếu tổng < 1); kỳ cuối năm từ 2018 + kỳ mới nhất |
| `nlLr` | Tỷ lệ bồi thường theo nghiệp vụ | cột ngang 2024 (navy) vs 2021 (`blue+'55'`), nghiệp vụ `NL_LOB` + "BB TNDS chủ xe cơ giới", "Xe cơ giới tự nguyện" (chỉ giữ dòng có số 2024) |
| `nlShare` | Thị phần phí phi nhân thọ: 10 doanh nghiệp lớn | cột ngang `tall`, 2024 (navy) vs 2020 (nhạt), từ `I.fydn.NONLIFE.share` qua `shareFY(seg, co, y)`; danh sách `NL_CO` |
| (bảng) | Doanh nghiệp phi nhân thọ niêm yết | 13 cột: Mã, Quý, Phí gốc 4Q, YoY, Nhận tái / tổng phí, Tỷ lệ bồi thường, Tỷ lệ kết hợp, DT thuần / VCSH, Danh mục / VCSH, LN tài chính / LNTT, ROE, P/B, P/E; insight `insListIns(ms)`: mã có tỷ lệ kết hợp thấp nhất, các mã có LN tài chính > LNTT, cảnh báo PVI nhận tái nhiều |
| `nlCr` | Tỷ lệ kết hợp theo quý của các mã niêm yết | đường theo quý (từ 2022Q1) của 5 mã `INS_L` (PVI MIG BMI BIC PTI), màu `C.pal[i]`, `pointRadius 1.5`; tỷ lệ tính từng quý (không TTM) |
| `nlBroker` | Môi giới bảo hiểm | cột chồng (stack `p`) Phí thu xếp gốc (navy), tái BH (teal) trên trục trái; đường Hoa hồng môi giới gốc + tái (purple, `y1`, tỷ) |

Insight `nlFY`: phí 2016 → 2025 và YoY kỳ mới; `nlShare`: thị phần PVI 2024, PTI 2020 → 2024; `nlBroker`: phí thu xếp 2025, tỷ trọng tái, hoa hồng gốc.

#### So sánh doanh nghiệp (`panePeerBH`, `:201-216`)
- **`pbScBH`** "P/B và ROE: doanh nghiệp bảo hiểm niêm yết": bubble, mỗi mã một dataset, x = ROE 4 quý (%), y = P/B, bán kính `max(5, √vốn hóa / 12)`, màu `C.pal[i]+'cc'`; `interaction nearest/intersect`; tooltip "MÃ: ROE x%, P/B y x"; nhãn mã qua `ptLbl`.
- **`pbFinBH`** "Lợi nhuận tài chính so với lợi nhuận trước thuế": cột % theo mã, cột > 100% màu purple, còn lại navy; không legend. Insight cố định.
- Card "Bảng so sánh" = `insTable`.

### 4.3 Tab 3 · Chính sách · Quy định (bh)

`lawBlock()` (`:428-451`): `h3.sec2` "Khung pháp lý và dự phòng", 2 card:
1. "Ba đời văn bản và các mốc chuyển tiếp": bảng Đời · Luật · Nghị định · Thông tư (3 dòng) + bảng Mốc (01/01/2027, 31/12/2027, 01/01/2028, 31/12/2030) · Nội dung · Căn cứ. Insight: giới hạn đầu tư NĐ 73/2016.
2. "Dự phòng toán học và lãi suất kỹ thuật": 5 gạch đầu dòng (sàn dự phòng, lãi suất kỹ thuật, bảng tử vong, lãi suất tính phí ví dụ BVNT, biên khả năng thanh toán tối thiểu).

### 4.4 Tab 4 · Catalyst · Risk (bh)

`paneCatalyst()` (`:946-973`): bảng Thời điểm · Sự kiện / rủi ro · Kênh tác động · Tác động (`imp`) · Trạng thái, 10 dòng cho bh (một số ô trạng thái chèn số mới nhất: chi trả YoY, phí mới YoY, phi nhân thọ YoY). Nguồn: `srcOf` + "văn bản pháp luật; Wi MCP".

Bên dưới `h3.sec2` "Chủ đề nóng: hủy hợp đồng nhân thọ" + `surrenderBlock()` (`:974-983`):
- Card bảng "BVH: hủy hợp đồng tăng nhanh hơn doanh thu phí": số **nhập tay** (Đáo hạn, Giá trị hoàn lại, Rủi ro và khác, Tổng × 2024, 2025, 6T/2025, 6T/2026). Insight cũng là văn bản cố định.
- Chart **`catClaims`** "Chi trả quyền lợi so với phí nhân thọ toàn thị trường": đường purple, không legend, `CLAIMS/PREM × 100` tại các kỳ từ 2021 có cả hai số, có `$src`.

### 4.5 Tab 7 · Sources (bh)

`paneSrc()` (`:649-685`): sec-sub nêu `I.nRows` con số từ `I.nRel` bài. 4 card: "Thứ tự ưu tiên nguồn (bảo hiểm)" (bảng hạng 1–6 như 3.1, insight quy tắc chọn: hạng cao hơn, cùng hạng lấy bài mới nhất), "Các bẫy dữ liệu cần nhớ" (6 dòng), "Lịch công bố cần theo dõi", "Câu hỏi còn mở" (`ol.ilist` 6 ý). Card cuối "Bản tin, bài nguồn mới nhất": bảng `I.rel` (≤ 40 bài) Ngày đăng · Bài (link) · Loại nguồn (`srcType()` rút gọn) · Kỳ số liệu (`from → to`) · Số dòng được dùng.

---

## 5. Trang `ck.html` · Ngành Chứng khoán

### 5.0 Header

`div.tick` "CHỨNG KHOÁN", cname "Ngành Chứng khoán · Công ty chứng khoán niêm yết" + pill "Đang xây dựng". hstat: VN-Index (tháng cuối của `F.vni`), Dư nợ cho vay `Q/yyyy` (`bs114/1000` nghìn tỷ, quý `SEC_LASTQ`), Cho vay / VCSH, P/B ngành (`sv408.pb` cuối), P/E ngành.

### 5.1 Quy tắc cắt quý ngành

`finsec.js:51-53`:
```js
const SECQ = (() => { const r = W.secSector.slice(); while (r.length > 2) { const a = sv(r[r.length - 1], 'bs400'), b = sv(r[r.length - 2], 'bs400'); if (a < b * 0.92) r.pop(); else break; } return r; })();
const SEC_LASTQ = last(SECQ)[0];
```
BCTC tổng hợp ngành (`W.secSector`, sector 408) của quý mới nhất thường chưa đủ công ty báo cáo. Nếu VCSH ngành quý cuối nhỏ hơn 92% quý trước thì bỏ quý đó, lặp lại. Với dữ liệu hiện tại: 2026Q3 VCSH 314.473 tỷ < 0,92 × 357.980 → bỏ, `SEC_LASTQ = '2026Q2'`. Mọi số ngành CK, thị phần, bảng 9 CTCK dùng `SECQ`/`SEC_LASTQ`. (Ngành bảo hiểm không áp quy tắc này; `INSQ = W.insSector` khai báo mà không dùng.)

### 5.2 Tab 1 · Tổng quan ngành (`paneOvCK`, `:816-888`)

1. **Công ty chứng khoán trong thị trường vốn**: card "Vai trò của ngành" (4 ý, gồm nâng hạng FTSE 21/9/2026) + chart **`ovVni`** "VN-Index dài hạn": đường navy không điểm, tháng từ 2016-01 (`F.vni`), nhãn `mm/yyyy`, tối đa 10 nhãn, không legend.
2. **Chuỗi giá trị**: `secChainCard()` (`:714-723`) 3 cột: (1) VCSH, Vay và trái phiếu phát hành (+% VCSH), Tổng tài sản; (2) Cho vay, FVTPL, HTM + AFS (+% VCSH); (3) doanh thu 4 quý: Môi giới, Lãi cho vay và phải thu, Lãi FVTPL ròng, Bảo lãnh và tư vấn. Insight: "Mô hình dự phóng" (văn bản cố định).
3. **Cấu trúc ngành**: card "Mô hình và mức tập trung" (tổng thị phần môi giới, cho vay của 9 mã) + chart **`ovStrCK`** "Thị phần trong nhóm niêm yết": cột ngang `tall`, Doanh thu môi giới (navy) và Dư nợ cho vay (teal), sắp theo thị phần môi giới.
4. **Các yếu tố tác động**: `drvTbl` 6 dòng, link tới `mkt`, `sec`.
5. **Chu kỳ ngành**: chart **`ovCycCK`** "Lợi nhuận trước thuế ngành và VN-Index": cột LNTT ngành theo quý (`is90`; quý âm đỏ, dương navy) + đường VN-Index cuối quý (đỏ, `y1`). Card "Các giai đoạn của ngành".
6. **Khung pháp lý chủ chốt**: bảng 5 dòng (vốn điều lệ tối thiểu, tỷ lệ vốn khả dụng 180%, cho vay ký quỹ 200%/3%, non pre-funding, IPO và niêm yết).
7. **Thuật ngữ**: 10 mục.

VN-Index cuối quý: `qEnd(q) = F.vni['yyyy-' + (quý×3, 2 chữ số)]`.

### 5.3 Tab 2 · Bức tranh ngành

#### Toàn cảnh (`paneMktCK`, `:221-259`)
- 6 KPI: Dư nợ cho vay (YoY), Cho vay / VCSH ("trần 200% VCSH từng công ty"), Nợ vay / VCSH (cùng kỳ), Doanh thu môi giới 4Q (YoY), LNTT 4 quý (YoY), P/B ngành (TB 3 năm).
- Card "Điều đang diễn ra": `secOverviewList()` 4 ý (lãi cho vay gấp mấy lần doanh thu môi giới trong quý; đòn bẩy tăng/giảm; LNTT 4 quý; P/B, P/E).
- Chart **`ovRevCK`** "Doanh thu theo mảng của các CTCK niêm yết" = `drawRevCK` (`:260-271`), xem bảng dưới.
- Chart **`ovPbCK`** "P/B ngành chứng khoán" = `pbBand(id, sv408, navy)`.
- Card "9 công ty chứng khoán lớn": bảng 10 cột Mã (link), P/B, P/E, Vốn hóa, VCSH, Thị phần DT môi giới, Thị phần cho vay, Cho vay / VCSH (> 170% màu `neg`), Nợ vay / VCSH, ROE 4Q.

`drawRevCK` / `scRev` (code giống hệt, `:263-270` và `:606-613`): quý từ 2019Q1, cột chồng tỷ đồng:

| Dataset | Công thức | Màu |
|---|---|---|
| Môi giới | `is06` | navy |
| Lãi cho vay và phải thu | `is03` | teal |
| Lãi FVTPL ròng | `is01 + is21` (is21 là lỗ, số âm) | gold |
| HTM + AFS | `is02 + is04` | grey |
| Bảo lãnh, tư vấn | `is07 + is10` | purple |
| VN-Index (đường) | `qEnd(q)`, trục `y1` phải | red, pointRadius 1.5 |

#### Ngành công ty chứng khoán (`paneSec`, `:563-627`)
- 6 KPI: VN-Index, P/B ngành (kèm P/E và ngày), Dư nợ cho vay, Cho vay / VCSH, Nợ vay / VCSH, LNTT 4 quý.
- **`scRev`**: như trên. Insight: lãi cho vay và môi giới quý mới nhất.
- **`scLev`** "Cho vay, nợ vay và danh mục so với vốn chủ": 4 đường % VCSH: Cho vay (teal), Nợ vay (navy, `debtOf`), FVTPL (gold), HTM + AFS (grey); dp 0. Insight: ngưỡng 170%.
- Card "So sánh 9 công ty chứng khoán lớn": bảng 14 cột: Mã, P/B, P/E, VCSH, Thị phần DT môi giới, Biên môi giới, Thị phần cho vay, Cho vay / VCSH, Lợi suất cho vay, Nợ vay / VCSH, FVTPL / VCSH, HTM+AFS / VCSH, ROE 4Q, LNTT quý mới nhất YoY (kèm `Q/yyyy` của chính mã đó, vì một số mã đã có quý mới hơn `SEC_LASTQ`). Insight `secInsight(ms)`: mã dẫn đầu môi giới, dẫn đầu cho vay, các mã ≥ 170% VCSH, top 3 P/B.
- **`scLoan`** "Dư nợ cho vay theo công ty": đường nghìn tỷ, 7 mã dư nợ lớn nhất, mọi quý có trong `W.sec`.
- **`scSc`** "P/B và ROE: 9 công ty chứng khoán": bubble, bán kính `max(5, √VCSH / 10)`.

#### Thị trường (`paneMkt`, `:273-295`)
- 4 KPI (`.kpis.k4`): VN-Index tháng cuối, So đầu năm (so tháng 12 năm trước), So 12 tháng trước, P/B ngành CK (kèm P/E).
- **`scPb`** "P/B ngành chứng khoán và VN-Index" (`drawMkt`, `:629-635`): đường P/B theo phiên (navy, không điểm) + VN-Index **chỉ tại phiên cuối mỗi tháng** (đỏ, `y1`, pointRadius 2, các phiên khác null, `spanGaps`), `ts:true`. Insight cố định (beta cao).
- Card "Dữ liệu thị trường đang bổ sung": bảng 7 dòng chỉ số chưa có, cột Trạng thái là `pill.pending` "Đang lấy".

### 5.4 Tab 3, 4, 7 (ck)

- **Chính sách · Quy định**: 2 card bảng: "Văn bản và quy định chính" (Luật 54/2019, Luật 56/2024, TT 121/2020, TT 68/2024, KRX, NĐ 245/2025) và "Nâng hạng thị trường FTSE Russell" (08/10/2025 → 09/2027, 4 giai đoạn 10/30/65/100%).
- **Catalyst · Risk**: bảng 7 dòng; ô trạng thái tính động: "HCM x% vốn chủ" (`secMetrics('HCM', SEC_LASTQ).loanEq`), "Nợ vay ngành bằng x% vốn chủ". Không có khối "chủ đề nóng".
- **Sources** (ck): 1 card "Nguồn và cách tính" (BCTC, tỷ lệ kết hợp, tỷ lệ bồi thường, nợ vay CTCK, định giá).

---

## 6. Consensus CTCK ở trang ngành (bh và ck dùng chung)

### 6.1 `consOf(s)` (`finsec.js:1007-1017`)

```text
R    = mọi báo cáo W.rep của mã s, sắp ngày giảm dần
per(f) = với mỗi CTCK (org) lấy báo cáo MỚI NHẤT thỏa f
T    = per(có tp)                          → giá mục tiêu
N    = per(có np và (không ghi năm hoặc y = 2026))  → LNST dự phóng 2026
K    = per(có rec và rec không chứa "KHÁC") → khuyến nghị
tp   = trung vị T.tp     np = trung vị N.np     plan = W.plans {s, y: 2026}
px   = giá đóng cửa cuối W.px[s]
up   = tp/px − 1
bvps = W.val[s].bvps, nếu không có thì px / P/B
pbTP = tp / bvps         (P/B tại giá mục tiêu, trên BVPS hiện tại)
peFwd = vốn hóa (tỷ) / np (tỷ)
buy  = số K có "MUA"; sell = có "BÁN"; hold = còn lại
n    = số CTCK khác nhau trong R; nTP = |T|; tpMin, tpMax
```
`med2()` = trung vị (bỏ null; chẵn thì trung bình 2 số giữa). Ba nhóm T, N, K lấy riêng, nên một CTCK có thể góp giá mục tiêu từ báo cáo này và LNST từ báo cáo khác. Lưu ý: sec-sub ghi "từ 01/04/2026" nhưng code không lọc ngày (dữ liệu hiện có báo cáo từ 23/10/2025), và T không lọc năm.

Phân nhóm `GRP` (`:1019-1021`): bh: BVH = Nhân thọ, còn lại Phi nhân thọ; ck: TCX VPX MBS = Thuộc ngân hàng, còn lại Độc lập. Màu nhóm `GCOL`: Nhân thọ navy, Phi nhân thọ teal, Thuộc ngân hàng purple, Độc lập navy. `lo(c)`: mã có dưới 2 giá mục tiêu tô `#d5d9e2` (mờ).

### 6.2 Bố cục `paneCons()` (`:1024-1079`)

- `cs` = mọi mã; `has` = mã có tp; `full` = mã có ≥ 2 tp; `base = full` nếu có, không thì `has`.
- 5 KPI: Mã có ≥ 2 CTCK định giá; Upside trung vị (của `base`); P/E fwd 2026 trung vị (so P/E TTM ngành); P/B tại giá mục tiêu trung vị (so P/B hiện tại trung vị và P/B ngành); Khuyến nghị (tổng MUA, trung lập, bán).
- Card `#pbHistCard`: canvas **`chPbHist`** `cbox tall`, tiêu đề/sub/insight do `drPbHist()` ghi vào `#pbHistH`, `#pbHistSub`, `#pbHistIns`.
- Lưới 6 chart (đều `h:'tall'`, đều `onClick: pick`):

| id | Tiêu đề | Loại | Chi tiết |
|---|---|---|---|
| `chUp` | Upside theo giá mục tiêu trung vị | cột ngang | nhãn `MÃ (nTP)`, sắp upside giảm dần, màu `lo`; `vref` dọc tại 0 (xám, nét liền) |
| `chPeFwd` | P/E forward 2026 theo LNST dự phóng trung vị | cột ngang | bỏ P/E ≥ 60, sắp tăng dần; mờ nếu < 2 dự phóng; `vref` đỏ "P/E TTM ngành x" |
| `chPbTp` | Định giá P/B: hiện tại so với tại giá mục tiêu | cột ngang + chấm | cột P/B hiện tại (màu `lo`, order 2) + "đường" không nối `showLine:false`, chấm trắng viền `#1f2433` bán kính 6 (order 1); sắp theo pbTP/pbNow giảm dần; `vref` đỏ "Ngành x" và xám "TB 3 năm x" |
| `chPbGrp` | P/B theo nhóm: hiện tại và tại giá mục tiêu | cột dọc | 2 dataset trung vị theo nhóm: P/B hiện tại (màu nhóm), P/B tại GMT (`rgba(217,164,0,.75)`); `vref` ngang "TB 3 năm ngành" |
| `chNp` | LNST 2026: dự phóng trung vị và kế hoạch ĐHĐCĐ | cột ngang + chấm | cột LNST 2026F trung vị (mờ nếu < 2), chấm vàng = `plan.pat`; nhãn `MÃ (số dự phóng)` |
| `chRec` | Khuyến nghị theo mã | cột ngang chồng | MUA (green), Trung lập (gold), BÁN (red), trục x `stepSize 1` |

Insight: `consUpIns` (top 3 upside + các mã giá đã vượt mục tiêu), `consPeIns` (3 thấp nhất, 2 cao nhất), `consPbIns` (trung vị pbTP vs pbNow, 3 mã chênh nhiều nhất), `consNpIns` (dự phóng / kế hoạch − 1 từng mã).

- Bảng `#consTab` "Chi tiết theo mã": 13 cột (Mã + link "chi tiết" tới `dn.html?s=MÃ#cons` + `details.more` liệt kê mọi báo cáo; CTCK; MUA/TL/BÁN; GMT trung vị; GMT thấp – cao; Giá; Upside; P/B hiện tại; P/B tại GMT; LNST 26F; KH LNST 26; P/E fwd; Báo cáo mới nhất). Dòng có < 2 giá mục tiêu có class `stale` (chữ xám, `fs.css:66`). Click dòng (trừ khi click vào `details`/`a`) → `consPick(s)`.

### 6.3 Bộ chọn P/B và đường tới giá mục tiêu (`drPbHist`, `:1081-1104`)

- `consPick(s)`: bấm lại mã đang chọn thì bỏ chọn (`consSel = null`); vẽ lại và cuộn tới `#pbHistCard`.
- Chưa chọn mã: chuỗi = P/B ngành (`sv406`/`sv408`, teal). Mục tiêu tổng hợp: `pbTP_ngành = P/B ngành hiện tại × Σ(vốn hóa × pbTP/pbNow) / Σ vốn hóa` trên các mã có đủ số (bình quân theo vốn hóa mức định giá lại ngụ ý).
- Đã chọn mã có `W.pb[mã]`: chuỗi P/B mã (navy) + P/B ngành (xám, nét [4,3]) khớp theo ngày; mục tiêu = `consOf(mã).pbTP`.
- **Đường tới mục tiêu**: sinh các ngày làm việc (thứ 2–6, `getUTCDay() % 6`) từ sau phiên cuối tới 31/12 cùng năm; dataset đỏ nét [6,4] "Tới P/B tại giá mục tiêu x (31/12)" nội suy tuyến tính từ P/B hiện tại tới pbTP.
- `vref`: TB (xám, nét [2,3]), +1σ và −1σ (`#c9a227`) của chính chuỗi đang vẽ (trung bình, độ lệch chuẩn tổng thể trên toàn chuỗi).
- Insight: P/B hiện tại, số độ lệch chuẩn so TB, phân vị (% số phiên ≤ hiện tại), min, max; P/B tại GMT; câu kết theo ngành (bh: P/B nhạy với lãi suất; ck: biến động theo chu kỳ).

---

## 7. Chart book (`paneBook`, `:1125-1139`)

- `buildAll()` dựng mọi tab còn lại (trừ `book`) và mọi tab con, để mọi chart đã đăng ký `SPEC`.
- Sec-sub: "N chart của trang ở một chỗ, luôn theo dữ liệu mới nhất." Ô tìm `#bkQ` (`input[type=search]`, lọc theo `title + id` chữ thường, `card.hidden`).
- `#bkGrid.grid.g2`: mỗi SPEC thành `article.card.bk[data-id][data-s]` với h3, chart-sub, `div.cbox > canvas#cb-<id>`, `.src`. Dùng `IntersectionObserver` (`rootMargin 300px`) để chỉ vẽ khi gần màn hình; vẽ bằng `mk('cb-'+id, cl(SPEC[id].cfg), {ts})`.
- Tất cả bản sao dùng `.cbox` 280px bất kể bản gốc là `tall`.
- Quirk: `chPbHist` được `mk` trước khi `drPbHist` ghi tiêu đề vào `#pbHistH`, nên trong Chart book tiêu đề của nó rỗng.

---

## 8. Trang `dn.html?s=MÃ`

### 8.1 Biến của trang và hàm phụ (`finsec.js:1144-1168`)

| Tên | Ý nghĩa |
|---|---|
| `SYM` | `?s=` viết hoa, mặc định `SSI` |
| `CO` | `W.names[SYM]` = `{n: tên, ex: sàn, lst: ngày niêm yết, t: loại}`; `t === 3` là bảo hiểm (`IS_INS`), `t === 4` là chứng khoán |
| `X` | `W.co[SYM]` (lãnh đạo, công ty con, giao dịch nội bộ, tin, rq, shares, room…) |
| `QS()` | `W.ins[SYM]` hoặc `W.sec[SYM]`; `qv(r,k)` đọc cột theo loại |
| `noteRows()`, `nv(q,k)` | thuyết minh `W.notes.fs_ins_notes` / `fs_sec_notes` của mã, cột theo `.k` |
| `NP_K()`, `PBT_K()` | LNST: `is60` (BH) / `is200` (CK); LNTT: `is50` / `is90` |
| `ttmRoe(R,q)` | LNST 4 quý / VCSH bình quân (quý q và cùng kỳ năm trước) |
| `PEERS()` | 6 mã BH hoặc 9 mã CK |
| `DKEY()` | `fin-SYM-decision` (khóa ghi chép quyết định) |
| `myDec()` | `FSN.versions(DKEY())[0].f` (bản mới nhất: nháp hoặc đã đăng) |
| `numv(v)` | bỏ mọi ký tự không phải chữ số rồi chuyển số (vd "32.500" → 32500) |
| `pxS()` | `X.px` nếu có, không thì `W.px[SYM]` (hiện chỉ có `W.px`) |
| `bvpsNow()` | `W.val.bvps` hoặc giá / P/B |
| `sharesM()` | `X.shares / 1e6` (triệu CP); dự phòng: vốn hóa × 1e9 / giá / 1e6 |
| `yearSum(y,k)` | `{v: tổng cột k các quý năm y, n: số quý}` |
| `fwd()` | dự phóng (8.6) |
| `rqS()`, `band(idx)` | lịch sử định giá theo quý `X.rq`; `band(1)` = P/B, `band(2)` = P/E trên **20 quý cuối** (giá trị > 0): `{m, sd, lo=m−sd, hi=m+sd, n, from, to}` |

### 8.2 Header (`dnHeader`, `:1170-1185`)

`div.tick` = mã; `cname` = tên đầy đủ + `small` "Bảo hiểm/Chứng khoán · sàn · niêm yết dd/mm/yyyy · [link Ngành …]". 6 hstat: Giá (ngày cuối), 52 tuần (min – max của 250 phiên cuối), P/B, P/E, Vốn hóa (nghìn tỷ), ROE 4Q (quý mới nhất của mã). Ô chọn `.bank-pick.on select` được đặt giá trị `dn.html?s=SYM`.

### 8.3 Tab 1 · Tổng quan (`dnOv`, `:1223-1253`)

1. `div.banner` "Quyết định hiện tại của analyst:" = `status · action` từ ghi chép, hoặc nhắc vào tab 💎 FinSuccess.
2. 6 KPI: Giá hiện tại; Upside vs TP của tôi (`numv(dec.tp)`); Upside vs consensus (TP trung vị, số CTCK); P/B (kèm "TB 20 quý" và "fwd"); P/E TTM (kèm fwd 2026F, TB 20 quý); LNTT `nQ/2026` (YoY so cùng số quý 2025, % kế hoạch `P.pbt`).
3. Card "Thông tin doanh nghiệp": `div.facts` (lưới 4 cột `fs.css:53-56`) 8 ô `div.fact > span + b + small` (`dnFacts`, `:1188-1197`):
   - Chung: Vốn hóa, CP lưu hành, BVPS · EPS TTM (EPS = giá / P/E), ROE · ROA (4 quý).
   - BH: Phí BH gốc 4 quý; Tỷ lệ bồi thường (BVH) hoặc Bồi thường · kết hợp; Danh mục / VCSH · LN TC / LNTT; Sở hữu nước ngoài (`foPct` / room `foMax`; `foMax ≥ 1` hiện "không giới hạn room").
   - CK: Cho vay / VCSH · Nợ vay / VCSH (kèm dư nợ ký quỹ `fn114_2`); Thị phần môi giới · cho vay; FVTPL / VCSH; Sở hữu nước ngoài.
4. Chart **`chPrice`** "Giá cổ phiếu so với ngành bảo hiểm/chứng khoán và VN-Index" (`drawPrice`, `:1264-1277`): đường giá điều chỉnh (navy, dp 0, đơn vị đ) + chỉ số giá ngành (`W.spx['406'|'408']`, purple) + VN-Index (`W.vniD`, grey), hai đường sau quy về giá qua plugin `rebase`; `vref` ngang "52W High" (teal) và "52W Low" (red) trên 250 phiên cuối; tooltip riêng: giá có "% từ đầu khung", chỉ số hiện điểm gốc và %; `ts:true` (nút khung thời gian làm `rebase` chạy lại). Insight `dnPerfTxt()`: hiệu suất 1 năm và 3 năm của mã so ngành và VN-Index (chênh lệch điểm %), giá so đỉnh/đáy 52 tuần kèm ngày.
5. Lưới 2 card:
   - **Checklist điều kiện mua** (`dnChecklist`, `:1198-1213`): bảng Điều kiện · Hiện tại · Ngưỡng · `pill.ok ✓` / `pill.risk ✗`, dòng cuối "Đạt a/b điều kiện." (xem 9.4 ngưỡng).
   - **Có gì mới ±45 ngày** (`dnRecent`, `:1214-1222`): các mục có ngày cách `F.built` ≤ 45 ngày (cả trước và sau): sự kiện (`ex` hoặc `rec`; `+` nếu có cổ tức tiền, `?` còn lại), tin tức (`X.news`, link + tên nguồn), giao dịch nội bộ (`to` hoặc `regTo`, cờ `big`; `+` mua, `−` bán), báo cáo CTCK (`+` MUA, `−` BÁN). Sắp mới trước, tối đa 12 dòng. Link "Xem toàn bộ Catalyst & Sự kiện →" (`data-go="events"`).
6. `govSection()` (8.4).

### 8.4 Quản trị và sở hữu, giao dịch nội bộ (`:1279-1337`)

- **`chOwn`** "Cơ cấu cổ đông" (`h:'short'` 230px): một thanh ngang chồng 100%, mỗi cổ đông lớn một dataset (màu xoay vòng navy, teal, purple, gold, blue), cuối là "Cổ đông khác" (`#d9dee8`, = 100 − tổng). Bên dưới bảng Cổ đông · Số CP · Tỷ lệ · Ngày chốt. Nguồn cổ đông: `X.holders` nếu có, không thì `W.holders` lọc theo mã. Insight: cổ đông lớn nhất, tổng nhóm ≥ 5%, phần còn lại, sở hữu nước ngoài.
- Card "Cơ cấu quản trị": bảng Họ tên · Vai trò · Bổ nhiệm (`X.leaders`, đã sắp theo cấp chức vụ ở Python).
- Card "Công ty con · liên doanh, liên kết": bảng Đơn vị · Loại · Sở hữu · Vốn điều lệ · Mã CK · Ngày chốt (`X.subs`); không có thì ghi chú.
- Card "Giao dịch cổ đông lớn & người nội bộ" (lưới `.gov2`):
  - **`chGovPx`**: đường giá điều chỉnh (blue, có tô nền `rgba(41,56,168,.08)`) + chấm Mua (`#2bbfa4`) và Bán (`#ef7a4a`) bán kính 6 đặt tại phiên `to` (ngày kết thúc thực hiện; không trùng phiên thì lấy phiên kế tiếp); chỉ giao dịch có `exe`; `ts:true`.
  - **`chGovCum`**: cột ngang Mua/Bán lũy kế (nghìn CP) trong 1, 3, 6, 12, 24 tháng (tháng = 30,44 ngày tính lùi từ phiên cuối), `suggestedMax 10`; không có giao dịch thì hiện tiêu đề "Không có giao dịch thực hiện trong 24 tháng gần nhất".
  - Bộ lọc `#govSide` (`div.picker`: Tất cả · Mua · Bán) + ô tìm `#govQ` (lọc trong `name + role`, không phân biệt hoa thường). Trạng thái ở `GT = {side, q, n: 20}`; đổi bộ lọc thì `n` về 20; nút "Hiện thêm" cộng 20.
  - Bảng `#govTbl` 9 cột: Người giao dịch / quan hệ (vai trò dòng nhỏ), Loại tin, Mua / bán (`b.pdl-u` xanh / `b.pdl-d` đỏ), Đăng ký (CP), Thực hiện (CP), Thời gian đăng ký, Thời gian thực hiện, Sở hữu sau (`afterPct` % hoặc `after` CP), **Giá sau 1T · 3T · 12T**. Sắp theo `to || regTo` giảm dần.
  - **Lợi suất sau giao dịch** (`ret`, `:1325`): mốc gốc = giá đóng cửa phiên **kế tiếp** phiên kết thúc giao dịch (`P.c[i+1]`), so với phiên `i+1+21`, `+63`, `+250`; chưa đủ phiên thì `—`.
  - Insight `#govIns`: tổng mua, bán 12 tháng (nghìn CP) và % số CP lưu hành; giao dịch gần nhất.

### 8.5 Tab 2 · Tài chính (`dnFin`, `dnFinDraw`, `:1339-1485`)

Quý từ 2019Q1 (`R`), nhãn `Q/yyyy`. 3 mục `h3.sec2`: 1 · Bảng cân đối, 2 · Kết quả kinh doanh, 3 · Hiệu quả (và chi phí vốn / nghiệp vụ và đầu tư).

**Nút 100% tỷ trọng**: `stackCard(id, …)` thêm `div.picker[data-pct=id]` 2 nút "Giá trị" (`data-m="abs"`, mặc định `on`) và "100% tỷ trọng" (`pct`), sub thêm "· bấm nút để xem tỷ trọng". `stackDraw(id, labels, sets, unit)` (`:1342-1348`): ở chế độ `pct`, mỗi giá trị / tổng các thành phần dương của cột × 100, trục y `max 100`; vẽ lại cả chart khi bấm.

Chart chung `dnY` "Lợi nhuận trước thuế theo năm + kế hoạch `cy`" (`:1424-1428`): năm từ 2018; cột LNTT thực hiện (năm hiện tại chưa đủ 4 quý màu teal, nhãn `yyyy (nQ)`; các năm đủ màu navy); cột "Kế hoạch ĐHĐCĐ" chỉ năm `cy`, nền trong suốt, viền navy nét [5,4], `grouped:false` (chồng lên cùng vị trí); chấm vàng "Kế hoạch các năm trước". Insight `dnPlanIns()`: % hoàn thành kế hoạch LNTT 4 năm gần nhất (ghi số quý nếu chưa đủ).

Chart chung `dnEq`: cột VCSH (nghìn tỷ) + đường Tổng tài sản / VCSH (đỏ, `y1`, đơn vị x).

**Công ty chứng khoán**

| id | Tiêu đề | Nội dung |
|---|---|---|
| `dnA` (stack) | Tài sản theo quý | Tiền `bs111` (grey), FVTPL `bs112` (gold), HTM `bs113` (tealInk), Cho vay `bs114` (navy), AFS `bs115` (teal), Khác = `bs270` − 5 khoản (`#d5d9e2`); nghìn tỷ |
| `dnL` (stack) | Nguồn vốn theo quý | Vay ngắn hạn `bs311` (purple), Trái phiếu phát hành `bs316+bs346` (gold), Nợ khác = `bs270 − bs400 − debtOf` (`#d5d9e2`), VCSH `bs400` (navy) |
| `dnMg` | Cho vay ký quỹ và ứng trước | cột chồng Ký quỹ `fn114_2`, Ứng trước tiền bán `fn114_3`, "Cho vay (chưa tách)" = `bs114` khi quý không có thuyết minh (`#c9ced8`); đường Cho vay / VCSH (đỏ, `y1`, `suggestedMax 210`); `vref` y1 = 200 "Trần 200%" |
| `dnN` | Danh mục FVTPL: cổ phiếu và thu nhập cố định | từ 2022Q1 theo thuyết minh: Cổ phiếu `fn112_8+fn112_9` (gold), Trái phiếu, chứng chỉ tiền gửi `fn112_11+fn112_12` (navy); đường Cổ phiếu / VCSH (đỏ, `y1`) |
| `dnRY` (stack) | Cơ cấu doanh thu hoạt động theo năm | 5 mảng như `scRev`, cộng theo năm |
| `dnIS` | Doanh thu theo mảng và LNTT theo quý | 5 mảng chồng + đường LNTT `is90` (đỏ) |
| `dnRz` | Lợi nhuận đã thực hiện và chưa thực hiện | `X.rz` [quý, `is91`, `is92`]: cột chồng Đã thực hiện (navy), Chưa thực hiện (gold) + đường LNTT |
| `dnR2` | ROE và ROA | đường TTM: ROE (navy), ROA = LNST 4Q / tổng tài sản bình quân (teal) |
| `dnNim` | Lợi suất cho vay và chi phí vốn vay | Lợi suất = `is03` 4Q / `bs114` bình quân (teal); Chi phí vốn = `|is52|` 4Q / `debtOf` bình quân (purple). Insight chênh lệch điểm % |
| `dnBrk` | Môi giới: thị phần doanh thu và biên | Thị phần = `is06` 4Q mã / `is06` 4Q `W.secSector` (navy, trục trái); Biên = `(is06 + is27)/is06` 4Q (teal, `y1`) |
| `dnCir` | Chi phí quản lý so với doanh thu hoạt động | `|is62|` 4Q / `is20` 4Q |
| `dnR1` | Đòn bẩy: cho vay, nợ vay và FVTPL so với vốn chủ | 3 đường % VCSH |

Insight tính động: `dnA` (cơ cấu % tổng tài sản), `dnL` (nợ vay / VCSH, cùng kỳ), `dnMg` (dư nợ ký quỹ / VCSH; ≥ 170% → "dư nợ năm sau chỉ tăng theo mức tăng vốn chủ"), `dnIS`, `dnR2`, `dnNim`. `dnN`, `dnRY`, `dnRz` insight cố định (mốc 30%, 35%).

**Doanh nghiệp bảo hiểm**

| id | Tiêu đề | Nội dung |
|---|---|---|
| `dnA` (stack) | Tài sản theo quý | ĐTTC ngắn hạn `bs120` (navy), dài hạn `bs250` (teal), Tài sản khác |
| `dnL` (stack) | Nguồn vốn theo quý | Nợ phải trả = `bs270 − bs400` (purple), VCSH (navy) |
| `dnInv` (stack, chỉ khi có `X.inv`) | Cơ cấu danh mục đầu tư | từ 2022Q1: Tiền gửi, Trái phiếu, Cổ phiếu, Chứng chỉ quỹ, Ủy thác đầu tư, Khác, Chưa tách (màu `C.pal`) |
| `dnInvY` | Lợi suất danh mục đầu tư | `is25` 4Q / (`bs120+bs250`) bình quân |
| `dnPY` | Doanh thu phí theo năm | cột chồng Phí gốc `is01_1`, Phí nhận tái `is01_2`; đường tăng trưởng phí gốc (chỉ khi cả 2 năm đủ 4 quý, `y1`) |
| `dnIS` | Phí bảo hiểm, nhượng tái và bồi thường theo quý | cột Phí gốc, Phí nhận tái, Phí nhượng tái `|is02|`, Chi bồi thường `|is15|`; đường Tỷ lệ giữ lại = 1 − `|is02|`/(gốc + nhận tái) (đỏ, `y1`) |
| `dnR2` | Nguồn lợi nhuận: nghiệp vụ và đầu tư | cột LN gộp KDBH `is19` (teal), LN HĐTC `is25` (navy); đường LNTT `is50` (gold) |
| `dnR1` | Tỷ lệ bồi thường (BVH) / Tỷ lệ bồi thường, chi phí và kết hợp | TTM: bồi thường = `|is15|`/`is03`; kết hợp = (`|is18|+|is26|+|isx27|`)/`isx01`; chi phí = kết hợp − `|is15|`/`isx01`. BVH chỉ có đường bồi thường; mã khác có `vref` 100% |
| `dnDep` | Lãi tiền gửi so với lợi nhuận trước thuế | cột lãi tiền gửi `fn23_1`, đường LNTT, từ 2022Q1 |
| `dnRoe` | ROE và ROA | như CK nhưng dùng `is60` |
| `dnBvh` (chỉ BVH) | Chi trả bảo hiểm nhân thọ theo loại | cột chồng Đáo hạn `fn111_2`, Giá trị hoàn lại `fn111_3`, Bồi thường nhân thọ `fn111_4` (giá trị tuyệt đối) |

BVH còn chèn `surrenderBlock()` (bảng nhập tay + `catClaims`) cuối tab.

### 8.6 Tab 3 · Catalyst và sự kiện (`dnEvents`, `:1488-1515`)

- **Sắp tới**: (1) BCTC quý kế tiếp: ngày dự kiến = ngày cuối của quý kế tiếp quý mới nhất + 30 ngày; (2) sự kiện có ngày `ex || rec` > `F.built`; (3) BH: bản tin Bộ Tài chính (ngày = hôm dựng), TT 96/2026 hoa hồng 01/01/2027; CK: FTSE giai đoạn 2 31/03/2027. Sắp ngày tăng.
- **Dòng sự kiện** (`#evFilter` = `div.filter`, nút `data-t`; "Tất cả" + mỗi loại có mặt): Sự kiện doanh nghiệp (chi tiết cổ tức tiền, cổ phiếu %, phát hành), Tin tức (link), Báo cáo CTCK (khuyến nghị, GMT, LNST), Giao dịch nội bộ (có `exe` hoặc `reg`; ghi "(đăng ký)" nếu chưa thực hiện), KQKD 8 quý gần nhất (ngày **ước** = ngày 20 tháng đầu sau quý; dấu `+`/`−` theo LNTT so cùng kỳ). Sắp mới trước. Bấm nút lọc vẽ lại `#evBody`.

### 8.7 Tab 4 · Consensus (`dnCons`, `drCpb`, `:1517-1583`)

- **Làm mờ báo cáo > 3 tháng**: `fade = F.built − 92 ngày`. Báo cáo có `d < fade` là cũ.
- 6 KPI: Median TP (upside); TB TP (min, max); Khuyến nghị MUA `buy/(buy+hold+sell)`; TP của tôi; LNST 2026F median (so LNST 2025, số dự phóng); P/E · P/B forward (BVPS 2026F).
- Card `#cpbCard`: tiêu đề `#cpbH`, sub `#cpbSub`, bộ chọn `#cpbPick` (`div.picker`: các mã cùng nhóm + "P/B ngành" = `_sec`), canvas **`chCpb`** `tall`, `p.cnote` giải thích BVPS 2026F, insight `#cpbIns`.
  - `cpbSel` mặc định = SYM. Bấm nút đang chọn thì về SYM.
  - Chuỗi: P/B của mã chọn (`W.pb`), navy nếu là SYM, blue nếu là mã khác; kèm P/B ngành xám nét [4,3] (trừ khi chọn `_sec`).
  - Chỉ khi đang xem chính SYM và có `bv26`: tối đa 2 đường tới mục tiêu cuối năm: "TP trung vị CTCK" (đỏ) và "TP của tôi" (teal), P/B đích = TP / **BVPS 2026F**; nội suy tuyến tính qua ngày làm việc tới 31/12.
  - `vref` TB, ±1σ như 6.3. Insight: P/B, số σ, phân vị, min/max; với mỗi đích: P/B cuối năm nằm ở đâu so dải (cao hơn +1σ / trên TB trong dải / dưới TB trong dải / thấp hơn −1σ).
- `h3.sub` "Dải dự phóng của các công ty chứng khoán" rồi (nếu có báo cáo):
  - **`chTp`** "Giá mục tiêu từng CTCK" (lollipop): cột ngang floating `[thị giá, TP]` dày 4px (navy, cũ `#b9c0cc`), chấm tại TP + nhãn upside qua `upLab`; `vref` dọc đỏ "Thị giá"; trục x từ `floor(min×0,9/1000)×1000` tới `ceil(max×1,1/1000)×1000`; nhãn `CTCK dd/mm`, `autoSkip:false`. `p.cnote` "Màu xám = báo cáo trước … (> 3 tháng)". Insight: dải TP, upside thấp – cao, số CTCK có TP dưới thị giá.
  - **`chNp`** "LNST 2026F từng CTCK và kế hoạch ĐHĐCĐ": cột ngang; từng CTCK (teal; cũ `teal+'55'`), thêm "KH ĐHĐCĐ" (navy, luôn đậm) và "Run-rate nQ" = LNST YTD × 4 / n (`#c9ced8`); nhãn kèm YoY so LNST 2025; `vref` dọc purple "LNST 2025"; trục x từ 0.
  - Bảng "Chi tiết báo cáo": CTCK · Ngày · KN (`recPill`: MUA `pill.ok`, BÁN `pill.risk`, KHÁC "Chưa phân loại", còn lại `pill.watch`) · TP · Upside · P/B tại TP (TP / BVPS hiện tại) · LNST N · LNST N+1 · Tiêu đề; dòng cũ class `stale`.
  - Chiều cao `chTp`, `chNp`: `max(340, số dòng × 24 + 70)` px.

### 8.8 Tab 5 · 💎 FinSuccess (`dnVal`, `:1586-1654`)

1. **Ghi chép quyết định** `article.card.fsn#decNote`, gắn bằng `FSN.mount` (`assets/notes.js`), khóa `fin-SYM-decision`:
   - Tiêu đề "1 · Quyết định hiện tại"; ô văn bản "Lý do / điều kiện kích hoạt" (trình soạn có in đậm, nghiêng, danh sách, nút "Rà soát chính tả & thuật ngữ").
   - Trường: Trạng thái (Tích cực / Trung lập / Tiêu cực), Hành động (Theo dõi, Chờ điểm mua, Mua thăm dò, Mua, Nắm giữ, Giảm tỷ trọng, Không đầu tư), Giá mục tiêu, Giá mua, Cắt lỗ (đ). Mỗi ô giá có `div.calc` hiện ngay **P/B = giá / BVPS hiện tại**, **P/B fwd = giá / BVPS 2026F**, và % so thị giá. Phần tóm tắt (`meta`) hiện các chip `fsn-chip` tương ứng.
   - Lưu: mỗi lần lưu là một bản theo ngày; bản trên máy ở localStorage `fsn:fin-SYM-decision` (chỉ giữ 1 bản nháp, tự xóa sau 7 ngày hoặc khi đã đăng); bản đã đăng nằm ở `data/notes.json` → `data/notes-data.js` (`window.FS_NOTES.notes[key]`). `onSave` đặt `built.ov = built.cons = false` để tab Tổng quan và Consensus dựng lại theo TP mới.
2. Card "Vị thế định giá so với lịch sử": 2 bảng (P/B và P/E) mốc −1σ / Trung bình / +1σ của `band(1)`, `band(2)`; giá quy đổi = bội số × BVPS hiện tại và × BVPS 2026F (P/E: × EPS TTM), làm tròn 100 đồng, kèm % so giá. Insight: P/B đang ở vùng nào và ROE 4 quý.
3. Lưới 4 chart:
   - **`chVal`** "P/B và P/E theo quý": P/B (navy) + TB 20 quý (nét đứt), P/E (teal, `y1`, chỉ 0 < P/E < 80) + TB 20 quý; dữ liệu `X.rq`.
   - **`chPbRoe`** "P/B và ROE": scatter các mã cùng nhóm (x = ROE TTM %, y = P/B), mã đang xem đỏ bán kính 8, mã khác navy bán kính 5; đường hồi quy OLS (xám nét [5,4]) giữa min và max ROE; nhãn mã qua `sLbl`. Insight `pbRoeIns()`: P/B thực tế so P/B hồi quy tại cùng ROE, % cao/thấp hơn nhóm (cần ≥ 3 mã).
   - **`chDiv`** "Cổ tức": theo năm GDKHQ (`ex || rec`): cột cổ tức tiền đ/CP (navy, trục trái) và cổ tức cổ phiếu, thưởng % (teal, `y1`; `stk < 1` thì nhân 100). Không có thì hiện tiêu đề "Không có cổ tức trong dữ liệu".
   - **`chPlanDone`** "Hoàn thành kế hoạch lợi nhuận": cột % LNTT thực hiện / kế hoạch theo năm; năm chưa đủ 4 quý teal, đạt ≥ 100% green, chưa đạt red; `vref` 100%.
4. Card "Định giá theo kịch bản (thu nhập thặng dư)" — bảng `#scTable` (8.9).
5. Card "Rủi ro chính" (`dnRisks`): BH 4 dòng (lãi suất giảm; BVH: hủy hợp đồng / mã khác: tỷ lệ bồi thường; tăng trưởng phí; định giá), CK 5 dòng (thị trường điều chỉnh, cho vay ký quỹ, chi phí vốn, danh mục tự doanh, định giá), cột 2 chèn số hiện tại, cột 3 chỉ chỗ theo dõi.

### 8.9 Bảng kịch bản

- Khóa localStorage: **`fin-SYM-scen`** (`SCEN_K`, `:1586`), lưu mảng `[{n, roe, coe, g}]`.
- Mặc định BH: "Lãi suất tăng (lợi suất đầu tư cao)" 15/13/4; "Cơ sở" 13/13/4; "Lãi suất giảm, hủy hợp đồng tăng" 11/13/3. CK: "Thanh khoản cao, nâng hạng giải ngân" 18/15/5; "Cơ sở" 14/15/4; "Thị trường điều chỉnh" 9/16/3 (ROE % / COE % / g %).
- Mỗi dòng có ô nhập tên (240px), ROE, COE, g; ô kết quả P/B hợp lý, Giá hợp lý, Upside tính lại khi gõ (`oninput`).
- Nút "Lưu giả định" (ghi localStorage, hiện "Đã lưu." hoặc "Không lưu được."), "Khôi phục mặc định" (xóa khóa, `built.val=false`, `show('val')`).
- Ghi chú đối chiếu: ROE 4 quý; ROE theo năm 2022 → 2025 = LNST năm / VCSH bình quân Q4 năm đó và Q4 năm trước; TP trung vị tương đương P/B 2026F.

---

## 9. Công thức

### 9.1 Doanh nghiệp bảo hiểm (`insMetrics`, `:459-467`)

Tất cả theo **4 quý gần nhất của chính mã đó** (`q = last(W.ins[sym])[0]`), `A(x,k) = |giá trị|`.

| Chỉ tiêu | Công thức |
|---|---|
| Phí gốc 4Q `gp`, YoY `gy` | Σ`is01_1` 4Q; `gp / gp(cùng kỳ) − 1` |
| Nhận tái / tổng phí `re` | Σ`is01_2` / (Σ`is01_1` + Σ`is01_2`) |
| **Tỷ lệ bồi thường** `lr` | Σ\|`is15`\| / Σ`is03` (chi bồi thường và trả tiền BH, đã gồm thay đổi dự phòng / doanh thu phí thuần) |
| **Tỷ lệ kết hợp** `cr` | (Σ\|`is18`\| + Σ\|`is26`\| + Σ\|`isx27`\|) / Σ`isx01` = (tổng chi trực tiếp KDBH + chi phí bán hàng + chi phí quản lý) / doanh thu thuần KDBH. Không áp cho BVH (nhân thọ) |
| Tỷ lệ chi phí (dn) | `cr` − Σ\|`is15`\|/Σ`isx01` |
| LN tài chính / LNTT `fin` | Σ`is25` / Σ`is50` |
| Danh mục / VCSH `invEq` | (`bs120` + `bs250`) / `bs400` quý cuối |
| DT thuần / VCSH `nrEq` | Σ`isx01` / VCSH bình quân |
| ROE `roe` | Σ`is60` / VCSH bình quân |
| Tỷ lệ giữ lại (dn) | 1 − Σ\|`is02`\| / (Σ`is01_1` + Σ`is01_2`) |
| Lợi suất danh mục (dn) | Σ`is25` / bình quân (`bs120`+`bs250`) |

VCSH bình quân `avgBal(rows, q, f)` = (giá trị quý q + giá trị cùng kỳ năm trước) / 2; thiếu cùng kỳ thì lấy giá trị quý q (`:50`). `ttm(rows, q, f)` cộng 4 quý liên tiếp lùi từ q; thiếu một quý hoặc một giá trị null thì trả `null` (`:49`).

### 9.2 Công ty chứng khoán (`secMetrics`, `:552-562`)

Tính tại quý chung `q = SEC_LASTQ`; mã không có quý đó thì bị loại.

| Chỉ tiêu | Công thức |
|---|---|
| **Nợ vay CTCK** `debtOf` | `bs311` + `bs316` + `bs346` (vay và nợ thuê TC ngắn hạn + trái phiếu phát hành ngắn hạn + dài hạn) |
| Thị phần DT môi giới `brkSh` | Σ`is06` 4Q mã / Σ`is06` 4Q ngành (`SECQ`) |
| **Biên môi giới** `brkM` | (Σ`is06` + Σ`is27`) / Σ`is06` (`is27` chi phí môi giới, số âm) |
| Thị phần cho vay `loanSh` | `bs114` mã / `bs114` ngành, quý q |
| Cho vay / VCSH, Nợ vay / VCSH | `bs114/bs400`, `debtOf/bs400` |
| FVTPL / VCSH, HTM+AFS / VCSH | `bs112/bs400`, (`bs113+bs115`)/`bs400` |
| **Lợi suất cho vay** `yld` (margin yield) | Σ`is03` 4Q / bình quân `bs114` |
| Chi phí vốn vay (dn) | Σ\|`is52`\| 4Q / bình quân `debtOf` |
| Chi phí QL / DT hoạt động (dn) | Σ\|`is62`\| / Σ`is20` |
| ROE `roe` | Σ`is200` 4Q / VCSH bình quân |
| LNTT YoY `pbtY` | quý cuối của mã: `is90 / is90(cùng kỳ) − 1` (chỉ khi cùng kỳ > 0) |
| Cổ phiếu FVTPL / VCSH (dn) | (`fn112_8` + `fn112_9`) / `bs400` |

### 9.3 Định giá, dự phóng

| Chỉ tiêu | Công thức | Ở đâu |
|---|---|---|
| ROE TTM (dn) | `ttmRoe` = Σ LNST 4Q / VCSH bình quân | `:1152` |
| LNST 2025, YTD 2026 | `yearSum(2025, NP_K)`, `yearSum(2026, NP_K)` | `:1161` |
| **BVPS 2026F** | (VCSH quý gần nhất + max(0, LNST 2026F trung vị − LNST đã ghi nhận 2026)) × 1e9 / (số CP triệu × 1e6), đ/CP; chưa trừ cổ tức tiền | `fwd()`, `:1162-1166` |
| P/E forward | vốn hóa (tỷ) / LNST 2026F trung vị (tỷ) | `fwd`, `consOf` |
| **P/B forward** | giá hiện tại / BVPS 2026F | `fwd` |
| P/B tại giá mục tiêu (ngành) | TP / BVPS hiện tại | `consOf` |
| P/B tại TP (đường trên dn) | TP / BVPS 2026F | `drCpb` |
| **P/B hợp lý (thu nhập thặng dư)** | (ROE − g) / (COE − g), chỉ khi COE > g; giá hợp lý = P/B × (BVPS 2026F, không có thì BVPS hiện tại), làm tròn 100 | `dnVal`, `:1619` |
| Dải P/B, P/E lịch sử (dn) | trung bình ± độ lệch chuẩn tổng thể của 20 quý cuối trong `X.rq` | `band()` |
| Dải P/B ngành | trung bình ± độ lệch chuẩn trên toàn chuỗi `secVal` (1.000 phiên từ 21/10/2022, khoảng 4 năm dù nhãn ghi "3 năm") | `pbBand`, `avgN`, `sdN` |
| Run-rate | LNST YTD × 4 / số quý | `dnCons` |

### 9.4 Ngưỡng checklist (`dnChecklist`)

| Điều kiện | Đạt khi | Áp dụng |
|---|---|---|
| P/B ≤ trung bình 20 quý − 1σ | `pb ≤ band(1).lo` | tất cả |
| ROE 4 quý | ≥ 12% | tất cả |
| LNTT quý gần nhất tăng so cùng kỳ | cùng kỳ > 0 và quý này > cùng kỳ | tất cả |
| Phí bảo hiểm gốc 4 quý tăng | `gy > 0` | BH |
| Tỷ lệ kết hợp 4 quý | < 100% | BH trừ BVH |
| Lãi tiền gửi / LNTT 4 quý | ≤ 70% (Σ`fn23_1` 4 dòng thuyết minh cuối / Σ`is50` 4Q) | BH |
| Cho vay / VCSH | ≤ 170% | CK |
| Nợ vay / VCSH | ≤ 200% | CK |
| Cổ phiếu FVTPL / VCSH | ≤ 30% | CK |

---

## 10. Mô hình dữ liệu `window.FIN_DATA`

Đơn vị tiền: **tỷ đồng** (Wi MCP trả đồng, `ty(v) = round(v/1e9, 2)` ở `fin_wi_backfill.py:48`; số bảo hiểm thị trường đã là tỷ đồng trong workbook). Tỷ lệ: số thập phân (0,123). Giá, BVPS, EPS, TP: đồng/CP. `holders.pct`, `trades.afterPct`: đơn vị %. `foPct`, `foMax`: tỷ lệ (Python chuẩn hóa nếu > 1).

```text
FIN_DATA = {
  built: 'yyyy-mm-dd',                 // ngày chạy build_fin_data.py; mọi "hôm nay" trên trang dùng ngày này
  ins: {
    S:   [[nhãn, tên bài, url, ngày đăng, hạng], …],     // 206 nguồn
    ser: { 'SEG|METRIC|LINE|CO': [[kỳ 'yyyy-mm', giá trị, yoy|null, chỉ số nguồn, (ghi chú)?], …] },
    fy:  { years: [2016…2025], rows: [{n: tên chỉ tiêu, k: 'SEG|METRIC|LINE|CO', v: [giá trị theo năm]}] },
    fydn:{ LIFE: {prem: {years, rows:[{co, v:[…]}]}, share: {…}}, NONLIFE: {prem, share} },
    comm:[{co, y, comm, st, prem, nb, r_prem, r_nb, agent_other, r_all}],   // hoa hồng nhân thọ
    rel: [{n, u, d, t, from, to, sel}] (≤ 40 bài có sel > 0), nRel, nRows
  },
  wi: { … xem 10.2 … },
  vni: { 'yyyy-mm': VN-Index cuối tháng }   // từ 2016-01
}
```

### 10.1 `ins.ser`

Khóa `SEG|METRIC|LINE|CO`, ví dụ `LIFE|PREM|Tổng|Toàn TT`, `LIFE|NB_CONTRACTS_MIX|Tử kỳ|Toàn TT`, `LIFE|SHARE_CO|Tổng|Bảo Việt Nhân thọ`, `NONLIFE|LOSS_RATIO|Xe cơ giới|Toàn TT`. Hàm đọc `ser(seg, met, line='Tổng', co='Toàn TT')` (`finsec.js:22`).
- SEG: `TOTAL`, `LIFE`, `NONLIFE`, `BROKER`.
- METRIC thường gặp: `PREM`, `NB_PREM`, `CLAIMS`, `LOSS_RATIO`, `INFORCE_CONTRACTS`, `NB_CONTRACTS`, `NB_CONTRACTS_MIX`, `MIX_LOB`, `PREM_LOB`, `NB_MIX_LOB`, `NB_PREM_LOB`, `SHARE_CO`, `NB_SHARE_CO`, `PREM_CO`, `NB_PREM_CO`, `CLAIMS_CO`, `LOSS_RATIO_CO`, `ASSETS`, `INVEST`, `EQUITY`, `RESERVES`, `SURRENDER`, `PREM_GDP`, `PREM_PER_CAPITA`, `AGENTS`, `COMM`, `REVENUE`, `PREM_PL3`, `CLAIMS_PL3`, `INV_INCOME`. Hiện có 466 chuỗi.
- Kỳ `yyyy-12` là cả năm, `yyyy-mm` khác là lũy kế từ đầu năm.
- Mỗi kỳ chỉ một điểm (workbook đã chọn sẵn qua cột "Chọn"). Ghi chú (phần tử thứ 5) chỉ giữ khi chứa "SUY RA" hoặc "ước"; trang không hiển thị.
- `fy.rows` có 25 khóa (TOTAL ASSETS, RESERVES, INVEST, EQUITY, REVENUE, PREM, INV_INCOME, PREM_GDP, PREM_PER_CAPITA, CLAIMS, AGENTS; LIFE/NONLIFE PREM; LIFE NB_PREM, NB_CONTRACTS, INFORCE_CONTRACTS, PREM_LOB × 3; NONLIFE CLAIMS; BROKER PREM × 3, COMM × 2). Đọc `fy(k)` trả mảng theo `FY.years`; code dùng chỉ số cứng `[6]` = 2022, `[9]` = 2025, `[0]` = 2016.

### 10.2 `wi`

| Khóa | Cấu trúc | Ghi chú |
|---|---|---|
| `secK` | 24 mã cột CK: `is01 is21 is02 is03 is04 is06 is27 is07 is10 is20 is52 is62 is90 is200 bs111 bs112 bs113 bs114 bs115 bs270 bs311 bs316 bs346 bs400` | |
| `insK` | 17 mã cột BH: `is01_1 is01_2 is02 is03 isx01 is15 is18 is19 is25 is26 isx27 is50 is60 bs120 bs250 bs270 bs400` | |
| `sec[MÃ]`, `ins[MÃ]` | `[[ 'yyyyQn', v1…vN ], …]` sắp tăng dần, từ 2018Q1 | đọc `sv(row,k) = row[secK.indexOf(k)+1]`, `iv` tương tự |
| `secSector`, `insSector` | như trên, BCTC tổng hợp ngành 408 / 406 | `secSector` qua quy tắc cắt 5.1 |
| `secVal['406'|'408']` | `{d:[ngày], pb:[], pe:[], mcap:[tỷ]}` | 1.000 phiên |
| `val[MÃ]` | `{d, pb, pe, mcap (tỷ), bvps (đ)}` | phiên gần nhất |
| `pb[MÃ]` | `{d, pb, pe}` theo phiên (≥ 200 dòng) | từ 27/10/2023 |
| `px[MÃ]` | `{d, c}` giá đóng cửa điều chỉnh | từ 01/10/2021 |
| `vniD` | `{ 'yyyy-mm-dd': VN-Index }` | từ 01/10/2021 |
| `spx['406'|'408']` | `{d, c}` chỉ số giá ngành | từ 10/11/2021 |
| `notes.fs_sec_notes` | `{k: ['fn114_2','fn114_3','fn112_8','fn112_9','fn112_11','fn112_12','fn113_3'], v: {MÃ: [[q, …]]}}` | ký quỹ, ứng trước, cổ phiếu FVTPL, trái phiếu/CD FVTPL |
| `notes.fs_ins_notes` | `{k: ['fn23','fn23_1','fn111_1','fn111_2','fn111_3','fn111_4'], v}` | `fn23_1` lãi tiền gửi; `fn111_2/3/4` đáo hạn, giá trị hoàn lại, bồi thường NT |
| `rep` | `[{s, org, d, rec, tp, np, np1, y, title}]`, mới trước | báo cáo CTCK; `tp` đã điều chỉnh quyền (`target_price_adjusted`) |
| `plans` | `[{s, y, rev, pbt, pat}]` | kế hoạch ĐHĐCĐ, tỷ đồng |
| `holders` | `[{s, n, pct, sh, d}]` | cổ đông lớn |
| `events` | `[{s, t, title, ex, rec, exe, cash, stk, iss, ip}]` | |
| `roe` | `{MÃ: [[q, roe, roa]]}` | không dùng trên trang |
| `insr` | `{MÃ: [{…ratio_ins_ttm}]}` | không dùng trên trang |
| `names` | `{MÃ: {n, ex, lst, t}}` | `t`: 3 bảo hiểm, 4 chứng khoán |
| `co[MÃ]` | `leaders [{n, role, since}]`, `subs [{n, kind, pct, cap, tk, d}]`, `trades [{name, role, type, side 'Mua'|'Bán', reg, exe, regFrom, regTo, from, to, afterPct, after, big:true}]` (từ 2022), `news [{d, t, u, src}]` (≤ 60), `rq [[q, pb, pe, roe, roa, eps, bvps]]`, `shares`, `foPct`, `foMax`, `foD`, `inv {n, k, v:[[q, 7 nhóm]]}` (BH), `rz [[q, is91, is92]]` (CK) | `px`, `holders` riêng theo mã: code có đọc nhưng Python chưa ghi |

`F.vni` (`build_fin_data.py:62`): lấy `data/backfill/vnindex_m.json` (`m`, từ 2016-01) rồi ghi đè bằng `vniD` theo tháng (lặp ngày tăng dần nên giá trị cuối tháng thắng).

---

## 11. Pipeline dữ liệu

```
Workbook Excel thị trường BH ──ins_import_xlsx.py──► data/backfill/ins_market.json ─┐
Response Wi MCP (data/raw/wi/*.json, data/raw/wi/fin/*) ──fin_wi_backfill.py──► data/backfill/fin_wi.json ─┼─ build_fin_data.py ─► data/fin-data.js
data/backfill/vnindex_m.json (đã commit) ─────────────────────────────────────────────┘
```

### 11.1 `scripts/ins_import_xlsx.py <workbook.xlsx>`

Cần `openpyxl`. Đọc 5 sheet:

| Sheet | Cách đọc |
|---|---|
| `Data` | Hàng 1 là tiêu đề. Cột dùng: `Kỳ`, `Mảng`, `Mã chỉ tiêu`, `Nghiệp vụ`, `DN (chuẩn)`, `Giá trị`, `YoY`, `Nguồn`, `Loại nguồn`, `URL`, `Ngày đăng`, `Chọn`, `Kế hoạch`, `Tính Σ`, `Ghi chú`. Chỉ lấy dòng `Chọn = 1` và không phải `Kế hoạch`. Nguồn được đánh chỉ số theo cặp (tên, URL). |
| `FY_ChinhThuc` | Tìm hàng có cột A = `Chỉ tiêu`; năm từ cột C. Các hàng sau có cột B bắt đầu bằng `\|` (vd `\|LIFE\|PREM\|Tổng\|Toàn TT\|`) thành `{n, k, v}`. |
| `FY_DN` | Khối bắt đầu ở hàng có cột B là chuỗi số năm; tên khối ở cột A (bắt đầu `PHI` → NONLIFE, còn lại LIFE; có "Thị phần" → `share`, không → `prem`); bỏ dòng "Tổng…". |
| `HoaHong_NT` | Hàng tiêu đề cột A = `Công ty`; đọc tới khi cột B không phải năm 4 chữ số; cột 0 co, 1 năm, 2 hoa hồng, 3 trạng thái nguồn, 6 phí, 11 phí KTM, 12 r_prem, 13 r_nb, 14, 15. |
| `Release_Log` | Cột `Tên bài / bản tin`, `URL`, `Ngày đăng`, `Loại nguồn`, `Kỳ số liệu từ`, `Kỳ số liệu đến`, `Số dòng được chọn`; sắp ngày giảm dần. |

Số < 10 làm tròn 6 chữ số, còn lại 3 chữ số (`num()`).

### 11.2 `scripts/fin_wi_backfill.py`

Đọc file JSON dạng `{"tool": …, "request": {"endpoint_name", "filters", "columns", …}, "response": {"data": {"cot": […], "dong": [[…]]}}}` trong `data/raw/wi/` (thư mục bị `.gitignore`, chỉ có trên máy). `pick(endpoint, test)` chọn file có `endpoint_name` khớp và chuỗi `filters` thỏa `test`, lấy bảng dài nhất; `pick_all` lấy tất cả.

Điều kiện lọc cần nhớ khi lưu response mới (vì code nhận diện file qua chuỗi filters):

| Dữ liệu | Endpoint Wi | Điều kiện file |
|---|---|---|
| BCTC CK | `fs_sec` | `data/raw/wi/fin/fs_sec.json` + file có filters chứa `2018` và `SSI`; gộp theo (mã, năm, quý) |
| BCTC BH | `fs_ins` | filters chứa `BVH` và `2022`, hoặc `BVH` và `2018` |
| BCTC ngành | `sector_fs_sec` / `sector_fs_ins` | filters chứa `"408"` / `"406"` |
| Định giá ngành theo phiên | (file text) | `data/raw/wi/fin/secval_408.txt`, `secval_406.txt` |
| Định giá phiên gần nhất | `ratio_daily` | filters chứa cả `SSI` và `BVH` |
| P/B theo phiên từng mã | `ratio_daily` | filters không có dấu phẩy (1 mã), ≥ 200 dòng |
| Giá điều chỉnh | `eod_adjust` | filters chứa một trong 15 mã |
| VN-Index | `index_eod` | `indicator_id == 235211`; + `fin/vnindex_2021-10_2025-09.txt` |
| Chỉ số giá ngành | `sector_price_daily` | filters chứa `"406"`/`"408"`; + `fin/sector406_px_…txt`, `sector408_px_…txt` |
| Thuyết minh | `fs_sec_notes`, `fs_ins_notes` | bảng có cột thứ 2 trong danh sách khóa; lấy bảng dài nhất |
| Báo cáo CTCK | `co_reports` | mọi file, gộp theo (mã, CTCK, ngày) |
| Kế hoạch, cổ đông, sự kiện, lãnh đạo, công ty con | `co_plans`, `co_holders`, `co_events`, `co_leaders`, `co_subsidiaries` | filters chứa `SSI` (request nhiều mã) |
| Giao dịch nội bộ | `co_insider` | mọi file + `fin/insider_SEC_2022on.txt`; gộp theo `id`; chỉ giữ từ 2022-01-01; `Nhận chuyển nhượng` = Mua, `Chuyển nhượng` = Bán |
| Tin tức | `news_feed` (file `wi_data_news_*.json`) | + `fin/news_SEC_2026-07on.txt`; bỏ tin gắn > 4 mã |
| Định giá theo quý | `ratio_common` | filters chứa `SSI` và `2018` |
| Số CP, room ngoại | `eod_info` | mọi file, lấy phiên mới nhất |
| Danh mục đầu tư BH | `fs_ins_notes` | filters chứa `2022`, có cột `fn120` |
| LN đã/chưa thực hiện | `fs_sec` | `columns` chứa `is91` |
| Tên, sàn, loại | `companies` | filters chứa `SSI` và `BVH` |
| ROE TTM, chỉ số BH TTM | `ratio_common_ttm`, `ratio_ins_ttm` | (không dùng trên trang) |

Nhóm danh mục đầu tư BH (`:265-275`): Tiền gửi `fn120_1+fn250_1`; Trái phiếu `fn120_2+fn250_2+fn121_3+fn121_4`; Cổ phiếu `fn121_1+fn121_2`; Chứng chỉ quỹ `fn120_6+fn250_6+fn121_5`; Ủy thác đầu tư `fn120_7+fn250_7`; Khác `fn120_5+fn250_5`; "Chưa tách" = tổng (`fn120+fn121+fn250`) − các nhóm, chỉ ghi khi > 1% tổng.

### 11.3 `scripts/build_fin_data.py`

Không có tham số. Đọc 3 file backfill, dựng `S` (nhãn + hạng), `ser`, giữ `fy`, `fydn`, `comm`, `rel` (lọc `sel`, 40 bài), `wi` nguyên văn, `vni`. Ghi `window.FIN_DATA=…;` dạng JSON gọn (khoảng 1,5 MB) và in số KB và số chuỗi.

### 11.4 Quy trình cập nhật

1. Gọi Wi MCP (`wi_data_companies`, `wi_data_stock`, `wi_data_sector`, `wi_data_news`…) cho các endpoint ở 11.2, lưu nguyên response vào `data/raw/wi/` đúng định dạng có `request` + `response`. Gọi theo nhóm nhiều mã có chứa `SSI` (và `BVH` khi cần) để khớp điều kiện lọc.
2. `python3 scripts/fin_wi_backfill.py` → `data/backfill/fin_wi.json`.
3. Khi có bản tin bảo hiểm mới: cập nhật workbook (thêm dòng ở `Data` với `Chọn = 1` cho số được chọn, thêm bài ở `Release_Log`), rồi `python3 scripts/ins_import_xlsx.py <đường dẫn workbook>` → `data/backfill/ins_market.json`.
4. `python3 scripts/build_fin_data.py` → `data/fin-data.js`.
5. Mở `bh.html`, `ck.html`, `dn.html?s=…` local (đã bật Developer view), kiểm tra console. Commit và push `main`: workflow `pages.yml` chạy `scripts/gom_site.sh` (chép `*.html`, `assets/*.js|css`, `data/*.js` vào `_site`, gắn `?v=<sha>` vào script, thay `__BUILD__`, ghi `version.json`).

Lưu ý: các số đặt cứng trong code cần sửa tay khi có số mới: bảng chi trả BVH và insight trong `surrenderBlock` (`:976-979`, trùng ở `bvhBlock` không dùng), insight `lfFY` ("trên 57 nghìn tỷ"), `lfShare` ("đáy 18,6% năm 2022"), rủi ro BVH trong `dnRisks` ("23,5%… 3,3%"), các bảng pháp lý, lịch catalyst, câu "Kênh phân phối… (8T/2026)", mục "Câu hỏi còn mở", "Lịch công bố". Chỉ số cứng `fy(...)[6]`, `[9]` giả định `years = 2016…2025`; khi thêm năm 2026 vào `FY_ChinhThuc`, các chỉ số này vẫn trỏ 2022 và 2025, còn `last9` tự dời sang 2026.

### 11.5 Thêm một mã

1. Python: thêm mã vào `SEC` hoặc `INS` (`fin_wi_backfill.py:13-14`); lấy đủ response Wi cho mã (BCTC quý từ 2018, thuyết minh, ratio_daily 1 mã, eod_adjust, ratio_common, eod_info, co_*), gồm mã trong các request nhiều mã.
2. JS: thêm vào `INS_ALL` (`finsec.js:154`) và nếu là phi nhân thọ thì `INS_L` (`:458`), hoặc `SEC_L` (`:551`); thêm vào `GRP` (`:1019-1020`) để có nhóm/màu ở Consensus. Bảng màu bubble lấy `C.pal[i]` nên tối đa 10 mã mỗi chart.
3. HTML: thêm `<option value="dn.html?s=MÃ">` vào `optgroup` tương ứng trong ô "BH · CK" ở **mọi** trang có nav (cả `index.html`, `nganh.html`, `vimo.html`, các trang ngân hàng, `backend.html`, `bh.html`, `ck.html`, `dn.html`).
4. Chạy lại 11.4 bước 2–5. `dn.html?s=MÃ` cần `W.names[MÃ]`; thiếu thì trang báo "Không có dữ liệu cho mã này."
5. Mã nhân thọ thuần khác BVH: code chỉ loại tỷ lệ kết hợp theo điều kiện `SYM === 'BVH'` / `m.sym === 'BVH'`, cần mở rộng điều kiện đó.

---

## 12. Code thừa và điểm cần biết khi dựng lại

- `bvhBlock()`, `drawBvh()` (`:397-427`, chart `bvhQ`) không được gọi ở đâu. `INSQ`, `latestRel`, `relLink`, `W.roe`, `W.insr`, `fn113_3`, `fn23`, `fn111_1` không dùng.
- `scRev` và `ovRevCK` là cùng một chart vẽ ở hai tab con.
- Consensus ngành ghi "từ 01/04/2026" nhưng không lọc theo ngày; trang dn làm mờ theo mốc 92 ngày.
- `pbBand` ghi "trung bình 3 năm" nhưng thực tế là trung bình của cả chuỗi 1.000 phiên.
- Chart book: tiêu đề `chPbHist` rỗng (6.3/7).
- `bh`/`ck` không nạp `notes.js`; chỉ `dn` dùng `FSN`. Nếu `FSN` không có, ô quyết định không hiện nhưng phần còn lại vẫn chạy (`if (window.FSN)`).
- Mọi hàm dựng tab chạy trong `try/catch`; khi dựng lại, nên mở DevTools để thấy lỗi `console.error` thay vì chỉ thấy dòng "Không dựng được phần này."
