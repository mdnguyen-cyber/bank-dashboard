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

Lịch sử dài cho bản đồ nhiệt (Việt Nam) nằm ở `data/backfill/vn_hist.json` (`scripts/vn_hist_backfill.py`); chỉ cần chạy lại khi kéo thêm lịch sử.
Giá hàng hóa: WiData chỉ trả tối đa 1.000 điểm mỗi chỉ tiêu và nén khoảng dài (> 3 tháng thành tuần, > 1 năm thành tháng), nên bù lịch sử theo từng năm.

Lưu kết quả: chạy `python3 scripts/wi_capture_transcript.py <transcript .jsonl của phiên này>` (file mới nhất trong `~/.claude/projects/*/`).
Kết quả nào bị lưu ra file riêng (tool-results) thay vì nằm trong transcript → đọc file đó và ghi thành
`data/raw/wi/<tool>_<tên>_zz_<YYYYMMDD>.json` dạng `{"tool", "request", "response"}`. Tên có `zz_<ngày>` để file mới đứng sau và được ưu tiên khi build.
Không chép tay số liệu.

## 3. Build và kiểm tra
```
python3 scripts/build_sector_data.py && for t in CTG VCB BID TCB MBB ACB; do python3 scripts/build_ctg_data.py --ticker $t; done && python3 scripts/build_big3.py && python3 scripts/build_bond_data.py && python3 scripts/build_bot_context.py
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
