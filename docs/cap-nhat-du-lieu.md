# Cập nhật dữ liệu dashboard (chạy trong phiên Claude mới)

Quy trình cho tác vụ đã lên lịch "Cập nhật dashboard ngân hàng" (17:20 các ngày làm việc).
Mục tiêu: kéo số mới nhất, build lại `data/*.js|json`, kiểm tra và đẩy lên GitHub Pages.

## 0. Chuẩn bị
1. Repo chính `mdnguyen-cyber/bank-dashboard` (public): nếu chưa có trong máy, gọi `add_repo` (access `push`) rồi clone vào `~/bank-dashboard`.
2. Dữ liệu gốc `mdnguyen-cyber/bank-dashboard-raw` (private): `add_repo` (push), clone vào `~/bank-dashboard/data/raw`
   (thư mục này bị `.gitignore` ở repo chính — dữ liệu gốc KHÔNG bao giờ đưa lên repo public).
   Repo raw chưa tồn tại hoặc không truy cập được → dừng, báo lại cho Minh Đức (cần tạo repo private `bank-dashboard-raw`).
3. `pip install --break-system-packages openpyxl xlrd` nếu thiếu.

## 1. Nguồn tự động (GitHub Actions — nguồn gốc: Fed/FRED, U.S. Treasury, BLS, BEA, ECB, BOJ, MOF Nhật, MAS, TPEx, ChinaBond, NHNN, VIRA)
```
gh api -X POST repos/mdnguyen-cyber/bank-dashboard/actions/workflows/fetch-global.yml/dispatches -f ref=main
gh api -X POST repos/mdnguyen-cyber/bank-dashboard/actions/workflows/fetch-vira.yml/dispatches -f ref=main
```
`fetch-global.yml` cũng chạy `scripts/fetch_fedwatch.py`: xác suất lãi suất Fed theo phiên FOMC tính theo phương pháp CME FedWatch từ giá ZQ (Yahoo), đối chiếu Kalshi → `data/global/fedwatch.json` (+ lịch sử `fedwatch_hist.json`). CME chặn truy cập tự động nên không lấy trực tiếp số CME; trang ghi "ước tính theo phương pháp CME FedWatch".
Chạy song song với bước 2; chờ xong (`gh api repos/mdnguyen-cyber/bank-dashboard/actions/runs?per_page=5`), rồi `git pull --rebase`.

## 2. Dữ liệu trong nước qua WiData (connector WiMCP)
Gọi đúng các truy vấn tăng dần dưới đây (cửa sổ ngắn để kết quả trả thẳng trong phiên). Dữ liệu giữ tối thiểu 5 năm (từ 2021). Thay `<from>` = 10 ngày trước, `<to>` = hôm nay.

| Mục | Lệnh |
|---|---|
| Vĩ mô ngày (tỷ giá, LNH, OMO, lãi suất huy động, DXY, EFFR) | `wi_data_macro get_values indicator_id=82223,82224,82226,82227,82228,82231,235028,235032,7079,82237,81522,82268,202886,202874,202880,202862 from_time=<from> to_time=<to>` |
| Vĩ mô tháng (M2, tiền gửi, tín dụng, CPI, dự trữ, XNK, FDI, NSNN) | `wi_data_macro get_values indicator_id=265954,265963,265981,265972,75847,241732,75701,202889,75804,76885,255693,76951,82420,75598 from_time=<4 tháng trước> to_time=<to>` |
| Giá hàng hóa (tab Vĩ mô › Hàng hóa: cước Baltic, giá Trung Quốc, giá trong nước) | `wi_data_commodity get_values indicator_id=73983,73984,73982,203181,203192,74128,74335,74384,264825,264644,74360,74124,203148,1224199,1224193,1276638,74407,74406,74400 from_time=<from> to_time=<to> limit=30` → sau khi lưu raw chạy `python3 scripts/cmd_wi_backfill.py && python3 scripts/build_cmd.py` (commit `data/backfill/cmd_wi.json`, `data/cmd-data.js`) |
| Định giá ngành theo phiên | `wi_data_sector get_data endpoint_name=sector_ratio_daily filters={"sector_id":"405"} from_time=2022-09-01 to_time=<to>` |
| Định giá từng mã | `wi_data_companies get_data endpoint_name=ratio_daily filters={"symbol":"<26 mã>"} columns=symbol,trading_date,pe,pb,bvps,market_cap` (giống file `ratio_daily_zz_*` cũ) |

Lịch sử: chuỗi ngành (26 NH theo quý) giữ từ Q1/2021, định giá ngành theo phiên từ 01/2021; riêng mã có trang riêng (CTG) giữ toàn bộ lịch sử
(BCTC quý từ Q1/2010, BCTC năm từ 2007, giá điều chỉnh từ 03/2012). Các build script GỘP mọi file cùng loại (kỳ trùng lấy file sau),
nên chỉ cần kéo phần mới — không xoá file cũ trong `data/raw/wi/`.
Chuỗi theo phiên (LNH qua đêm 82237, bơm/hút OMO 82268, lãi suất OMO 81522) có từ 01/2021. Wi nén khoảng > 3 tháng thành tuần,
nên khi cần bù lịch sử thì kéo theo từng quý (from/to ≤ 3 tháng, limit 120). PPI Trung Quốc bù ở `data/backfill/cn_ppi.json`.

Khi có BCTC quý mới (mùa báo cáo: tháng 1, 4, 7, 10), kéo lại các truy vấn `fs_bank`, `fs_bank_notes`, `ratio_bank`, `ratio_bank_ttm`,
`ratio_common_ttm`, `bank_car_tt41` với cùng tham số như file cũ trong `data/raw/wi/` (đọc `request` của file cũ, thêm năm/quý mới).
Cơ cấu cho vay/huy động ở tab Tài chính › Tổng quan: `wi_data_companies get_data endpoint_name=fs_bank_notes filters={"symbol":"CTG,VCB,BID,TCB,MBB,ACB","year":"<năm>","quarter":"1,2,3,4","consolidation_id":"2"}` với cột `symbol,year,quarter,fnx13,fnx14,fnx18,fnx33–35,fnx38,39,44–48,50,fnx52–55,58–71,74–76,fnx104,107,110,fnx112–116,118,119,fnx121–123,125–128` (giống file `wi_data_companies_fs_bank_notes_*` có cột fnx112).
Riêng CTG, nợ xử lý bằng dự phòng thực tế: sau mỗi BCTC quý/bán niên/năm, `wi_data_document_miner search` (ticker CTG, loai_tai_lieu 7, query "biến động dự phòng rủi ro cho vay khách hàng, sử dụng dự phòng rủi ro tín dụng trong kỳ") → thêm số lũy kế đầu năm (triệu đồng) vào `data/backfill/ctg_writeoff.json`.
Riêng CTG: khi VietinBank đăng "Điểm tin BCTC" quý mới (investor.vietinbank.vn › Điểm tin BCTC, trang 2), thêm số "Cho vay/Tiền gửi theo phân khúc khách hàng" (nghìn tỷ) vào `data/backfill/ctg_ir_segments.json`; kiểm tổng khớp dư nợ, tiền gửi BCTC.

Lịch sử dài cho bản đồ nhiệt (Việt Nam) nằm ở `data/backfill/vn_hist.json` (`scripts/vn_hist_backfill.py`); chỉ cần chạy lại khi kéo thêm lịch sử.
Giá hàng hóa: WiData chỉ trả tối đa 1.000 điểm mỗi chỉ tiêu và nén khoảng dài (> 3 tháng thành tuần, > 1 năm thành tháng), nên bù lịch sử theo từng năm.

Lưu kết quả: chạy `python3 scripts/wi_capture_transcript.py <transcript .jsonl của phiên này>` (file mới nhất trong `~/.claude/projects/*/`).
Kết quả nào bị lưu ra file riêng (tool-results) thay vì nằm trong transcript → đọc file đó và ghi thành
`data/raw/wi/<tool>_<tên>_zz_<YYYYMMDD>.json` dạng `{"tool", "request", "response"}`. Tên có `zz_<ngày>` để file mới đứng sau và được ưu tiên khi build.
Không chép tay số liệu.

## 3. Build và kiểm tra
```
python3 scripts/build_sector_data.py && for t in CTG VCB BID TCB MBB ACB STB VPB HDB; do python3 scripts/build_ctg_data.py --ticker $t; done && python3 scripts/build_big3.py && python3 scripts/build_bond_data.py && python3 scripts/build_bot_context.py
python3 scripts/cmd_wi_backfill.py && python3 scripts/build_cmd.py && python3 scripts/fin_wi_backfill.py && python3 scripts/build_fin_data.py && python3 scripts/build_catalog.py && python3 scripts/build_guide.py
python3 tests/test_sector_data.py
```
Test định giá chốt cứng (pb, pe) sai vì số mới → cập nhật số trong test cho khớp số mới (không sửa logic).
Xem nhanh bằng Playwright (`/opt/pw-browsers/chromium`, route Chart.js từ node_modules nếu CDN bị chặn): `nganh.html`, `index.html` không lỗi JS.

## 4. Đẩy lên
- Repo chính: commit "Cập nhật dữ liệu <dd/mm/yyyy>" kèm dòng attribution, push, dispatch `pages.yml`.
- Repo raw: commit + push các file mới trong `data/raw`.
- Không publish lại bản dashboard trên claude.ai (artifact) — tạm dừng theo yêu cầu của Minh Đức.

## 5. Báo lại
Tin nhắn cuối: số mới đáng chú ý (tín dụng, tỷ giá, LNH, P/B ngành…) kèm ngày dữ liệu, mục nào không cập nhật được và vì sao.
Nếu lời nhắn kèm theo có yêu cầu thêm — ví dụ "viết bản cập nhật nhanh" — làm theo `docs/cap-nhat-nhanh.md`.
Không ghi "WiData" ở bất cứ nội dung hiển thị nào; ghi cơ quan công bố gốc.

## Trái phiếu: FI · G-bond (tab "Bức tranh ngành")

`scripts/build_bond_data.py` → `data/bond-data.js`. Lần kéo WiData cần có trong `data/raw/wi`:

- Lãi suất huy động 12T (bảng 46), `wi_data_macro get_values` cho 28 mã trong `TIERS` (cửa sổ ≤ 16 tháng mỗi lần để Wi trả theo tháng).
- `wi_data_cbond`: `bonds_corp_issuance_monthly` get_data lọc `sector_l1=Tài chính` theo từng năm (cột có `maturity_bucket`); `bonds_corp_cashflow_monthly` get_data `sector_l1=Tài chính` theo năm; aggregate `year,month` (outstanding_value, late_payment_debt, principal_paid, new_late_bond_count, lọc `year__gte`); aggregate issuance `year,month,sector_l1` lọc theo năm; aggregate maturity `year,month,sector_l1` và `year,month,sector_l2` lọc `year__gte/__lte`; aggregate chậm trả `sector_l1` lọc `year,month` tháng mới nhất.
- `wi_data_gbond`: `bonds_gov_yield_curve` 234528/234530/234531/234526/234529; `bonds_gov_auction_monthly` và `bonds_gov_secondary_yield_monthly` (bond_type TPCP) theo từng năm.

Aggregate của Wi cắt ở 200 nhóm: luôn lọc theo năm để mỗi lần dưới 200 nhóm.

## P/B và giá mục tiêu điều chỉnh theo sự kiện quyền (trang ngân hàng)

Các nguồn dữ liệu thường chỉ cập nhật VCSH sau khi có BCTC quý mới, nên sau một đợt phát hành quyền mua, P/B bị lệch (thiếu tiền thu về). Bản dựng tự tính lại:

- P/B = vốn hóa thực tại phiên / VCSH thuộc cổ đông NH mẹ (`bsx12 − bs390`).
- Số CP đổi ngay ngày GDKHQ (cổ tức cổ phiếu, thưởng, quyền mua — các sự kiện cùng ngày được gộp, tỷ lệ cộng chứ không nhân). Phát hành riêng lẻ/ESOP nhận ra từ bước tăng bền của số CP mà nguồn dùng.
- VCSH = BCTC quý chứa phiên đó nếu đã công bố, nếu chưa thì quý mới nhất; cộng tiền thu từ quyền mua, trừ cổ tức tiền mặt có GDKHQ sau ngày khóa sổ quý đó.
- Giá mục tiêu công bố trước GDKHQ: (TP − cổ tức tiền + tỷ lệ quyền × giá phát hành) / (1 + tỷ lệ CP mới); bảng ghi kèm giá gốc.

Cần trong raw (lấy lại khi có sự kiện mới): `co_events` của 6 mã; `ratio_daily` cột `trading_date,bvps,market_cap,pb` của từng mã; `fs_bank` cột `bsx12,bs390`. Bản dẫn xuất đã commit: `data/backfill/corp_events.json`, `bvps_daily.json`, `shares_daily.json`, `equity_parent.json`, `pb_adj.json`. Dựng lại cả 6 mã 2 lần (lần 2 để đường P/B của các NH cùng nhóm cũng dùng số đã điều chỉnh).

## ACB: số liệu tài liệu nhà đầu tư (nhập tay mỗi quý)

Khi ACB đăng "Tài liệu NĐT" quý mới (acb.com.vn › Nhà đầu tư › Tài liệu nhà đầu tư; danh sách lấy qua API `GET /api/front/v1/posts?search[categories.category_id:in]=<id>` — 1657 = năm 2026, 1658 = 2025, 1659 = 2024, 1660 = 2023, 1661 = 2022, 1662 = 2021): mở PDF trong trình duyệt (shell bị chặn tải acb.com.vn), đọc chữ bằng pdf.js `getTextContent` (vị trí x, y cho biết số thuộc cột/phân khúc nào), rồi cập nhật:
- `data/backfill/acb_ir_segments.json`: cho vay hợp nhất theo phân khúc (Cá nhân, SME, MMLC, Công ty con = tổng dư nợ × tỷ trọng); tiền gửi riêng lẻ theo phân khúc (tới Q3/2025).
- `data/backfill/acb_ir_extra.json`: cho vay cá nhân theo mục đích, doanh nghiệp theo ngành, NIM quý / 12 tháng, lợi tức tài sản, chi phí vốn, nợ xấu ACB và chênh lệch CIC, huy động gồm giấy tờ có giá, các chỉ tiêu khác; sửa lời đọc (`ins`) theo số mới.
Tài liệu 2024 và 1Q25 là ảnh (không có lớp chữ) — phải xem ảnh slide. Sau đó `python3 scripts/build_ctg_data.py --ticker ACB`.

## Bảng cân đối chi tiết doanh nghiệp bảo hiểm (waterfall trang BH)
Mỗi quý, sau khi các DN bảo hiểm công bố BCTC: `wi_data_companies get_data fs_ins` với `filters={"symbol":"BVH,PVI,MIG,BMI,BIC,PTI","year":"<năm trước>,<năm nay>","quarter":"1,2,3,4","consolidation_id":"2"}`,
`columns=symbol,year,quarter,bs110,bs120,bs130,bs190,bs210,bs220,bsx10,bs250,bs270,bs311,bs312_1,bs329,bs334,bs300,bs400` → lưu raw (wi_capture_transcript.py) → `python3 scripts/fin_wi_backfill.py && python3 scripts/build_fin_data.py`.
CTCK dùng các cột bảng cân đối đã có trong `fs_sec` (bs111–bs115, bs270, bs311, bs316, bs346, bs400).

## Đấu thầu trái phiếu Kho bạc Mỹ
`scripts/fetch_ust.py` lấy kết quả từ Fiscal Data (auctions_query); Fiscal Data cập nhật chậm vài tuần nên các phiên coupon gần đây (60 ngày) được bổ sung từ TreasuryDirect (TA_WS `securities/auctioned`). Cần số ngay sau phiên: chạy workflow **Cập nhật nhanh UST** (`fetch-ust.yml`) rồi `python3 scripts/build_global.py`.

## TCB: số liệu tài liệu công bố KQKD (nhập tay mỗi quý)
- Nguồn: techcombank.com › Nhà đầu tư › Công bố kết quả kinh doanh (bản trình bày PDF quý mới nhất). Trang chặn máy chủ đám mây, mở bằng trình duyệt.
- `data/backfill/tcb_ir_extra.json` (cùng khuôn với ACB): tài sản sinh lãi, lợi suất, chi phí vốn, NIM; huy động, CASA theo phân khúc; tín dụng doanh nghiệp theo ngành, cá nhân và SME theo sản phẩm; phí theo sản phẩm; chi phí và CIR; thu nhập theo phân khúc; dự phòng, nợ xấu, bao phủ; vốn và thanh khoản; trái phiếu; bancassurance; bảng chỉ tiêu khác. Thêm cột quý mới vào `labels` và mọi `series`, bỏ quý cũ nhất nếu muốn giữ 5 quý, sửa `ins`.
- Build: `python3 scripts/build_ctg_data.py --ticker TCB`.

## Công ty chứng khoán: nguồn vốn vay, cho vay ký quỹ, danh mục tự doanh (trang dn.html)
- Mỗi mã một file `data/backfill/sec_detail/<MÃ>.json`, trích từ thuyết minh BCTC quý (Wi MCP, document_miner loại 7): từng khoản vay theo bên cho vay, đồng tiền, lãi suất, kỳ hạn; trái phiếu phát hành; cho vay ký quỹ, chất lượng dư nợ; FVTPL/AFS/HTM/đầu tư dài hạn khác theo nhóm, mã niêm yết có `tk`; mục đích nắm giữ `cls` (holding, fi, cw, trading); chứng quyền đang lưu hành `cwList`; lời đọc `ins`.
- Giá các mã niêm yết trong danh mục (cuối quý BCTC và phiên gần nhất): `data/backfill/sec_detail/_px.json`, lấy từ Wi MCP `eod_adjust`. Cập nhật mỗi lần build để cột "Diễn biến" mới.
- Build: `python3 scripts/build_sec_detail.py` → `data/sec-detail.js`. Hiển thị: `assets/secdet.js` (tab Tài chính: mục Chi tiết; tab Tổng quan: top khoản đầu tư).

## Lịch công bố BCTC quý (HOSE)
- Workflow `fetch-hose.yml` (4 lần/ngày) chạy `scripts/fetch_hose_reports.py` (api.hsx.vn, mục "Các báo cáo định kỳ" của từng mã, ngày công bố = ngày đầu tên file HOSE đăng) rồi `scripts/build_report_dates.py` → `data/report-dates.js`.
- `assets/rptcal.js` hiện thanh "BCTC Qx" dưới tiêu đề trang ngân hàng, trang doanh nghiệp, trang ngành: đã công bố chưa, so với ngày thường lệ (trung vị 6 quý gần nhất); đỏ khi đã quá ngày muộn nhất của 6 quý trước. Mã niêm yết HNX (MBS, SHS, PVI, PTI) chưa có nguồn.
- Thêm mã: sửa danh sách `SYMS` trong `fetch_hose_reports.py` và nhóm `G` trong `rptcal.js`.

## BCTC ngân hàng đăng trước khi Wi MCP cập nhật (nhập tay)
- Ngân hàng đăng BCTC quý mà Wi chưa có: nhập số từ PDF (OCR `tesseract`) vào `data/backfill/manual_wi/<mã>_<kỳ>_<endpoint>.json` cùng khuôn lần kéo Wi (`fs_bank`, `ratio_bank`, `ratio_bank_ttm`, `ratio_common_ttm`), đơn vị VND, tỷ lệ dạng phân số; chỉ số TTM tính theo công thức Wi (bình quân 5 quý); VCSH thuộc cổ đông mẹ thêm vào `equity_parent.json`; cơ cấu kỳ hạn, tiền gửi vào `notes_mix.json`.
- `build_ctg_data.py` đọc thư mục này trước raw Wi, nên khi Wi có kỳ đó thì số Wi tự ghi đè. Ví dụ: CTG Q3/2026 (BCTC hợp nhất đăng 30/10/2026).
