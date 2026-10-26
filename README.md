# Bank Dashboard · FinSuccess

Dashboard ngân hàng theo chuẩn layout FinSuccess. Xem online (tự deploy qua GitHub Actions mỗi lần push `main`):
- CTG: https://mdnguyen-cyber.github.io/bank-dashboard/
- Ngành Ngân hàng · CSTT: https://mdnguyen-cyber.github.io/bank-dashboard/nganh.html

 Hoặc mở `index.html` trong trình duyệt (cần mạng để tải Chart.js từ cdnjs).

## Lộ trình
1. **CTG v1** (bản này) — dashboard cổ phiếu theo khung 6 tab của Stock dashboard (MWG Tracker).
2. **CSTT + Ngành Ngân hàng** (`nganh.html`) — layout dashboard ngành của công ty (bản Dầu khí), 9 tab: Tổng quan ngành (kèm 💎 Nhận định FinSuccess) · **Cập nhật nhanh** (mối quan tâm hiện tại + chart chứng minh, ghi rõ chuyên viên hay AI cập nhật, có lịch sử; dữ liệu `data/quick-updates.json`, quy trình `docs/cap-nhat-nhanh.md`) · Bức tranh ngành (Quốc tế → Nội địa → Ngân hàng → **Xếp hạng TT21 & room**: mô phỏng điểm CAMELS theo TT 21/2025 cho 26 NH, room ngụ ý = điểm × 2,6%, `scripts/camel_tt21.py` → Kịch bản IDX-FX × IDX-LIQ) · Chính sách · Quy định (mức điều hành hiện hành, nhật ký điều hành NHNN biên tập tay ở `data/sbv-log.json` kèm link nguồn gốc từng dòng, độ nhạy LDR theo hệ số KBNN) · Catalyst · Risk (R-01…R-16) · Consensus CTCK · Chủ đề nóng · **Chart book** (mọi chart của dashboard, lọc theo nhóm/tìm kiếm, mã chart xem bằng `python3 scripts/chart_ids.py`) · Sources. 
   - Dữ liệu: `scripts/build_sector_data.py` → `data/sector-data.js` (`window.SECTOR_DATA`); test `tests/test_sector_data.py`.
   - IDX-FX, IDX-LIQ theo công thức slide 52 (z-score 36 tháng), tính theo tháng; chỗ thay thế thành phần ghi ở tab Sources. Backtest bản trọng số bằng nhau đúng hướng ~43–45% → **chưa đạt ngưỡng 60%**, cần hiệu chỉnh trọng số.

## Hiển thị
- Công tắc **Gọn / Chi tiết** ở góc phải trên (mặc định Gọn, nhớ theo trình duyệt). Gọn ẩn lời đọc dưới chart, chú thích và nguồn.
- Nút **(i)** cạnh tiêu đề: mô tả chart (đơn vị, kỳ, cách đọc). Ở chế độ Gọn, cuối mỗi thẻ có **ⓘ Insight** và **ⓘ Nguồn** để mở phần đã ẩn.

## 5 tab trang cổ phiếu ngân hàng
| Tab | Nội dung | Ánh xạ deck |
|---|---|---|
| Tổng quan | KPI, thông tin DN, giá 1 năm (52W), 5 trụ luận điểm, checklist mua, tin ±45 ngày, quản trị & sở hữu | Bước 1, 8 |
| Tài chính | 6 tab con: **Tổng quan** (cơ cấu tài sản/nguồn vốn dạng % kèm số tỷ khi di chuột, tài sản/nguồn vốn theo quý, cho vay theo ngành/loại khách hàng/kỳ hạn và tiền gửi theo loại/đối tượng từ thuyết minh `fs_bank_notes` → `D.mixQ`; riêng CTG thêm phân khúc bán lẻ/SME/KHDN lớn/FDI từ Điểm tin BCTC của VietinBank, `data/backfill/ctg_ir_segments.json` → `D.irSeg`; KQKD) · **Biên lãi** (tăng trưởng, NIM/COF, khe hở lãi suất, CIR, ROE/ROA) · **Chất lượng tài sản** (nợ xấu, dự phòng, CAR, VCSH và đòn bẩy) · **Thu nhập ngoài lãi** · **Các tỉ lệ an toàn** (LDR TT22, LDR thô và kịch bản hệ số KBNN, room/TT50, CAR so với tăng trưởng, lịch REG, CAMEL + TT21) · **Định giá & so sánh nhóm** (P/B–P/E lịch sử, P/B theo ROE 26 NH, cổ tức, hoàn thành KH, so sánh nhóm) | Bước 2–8, BNK-01…17 |
| Catalyst & Sự kiện | Sắp tới + dòng sự kiện có bộ lọc, dấu ± | — |
| Consensus CTCK | Lollipop TP, LNST 2026F vs KH ĐHĐCĐ & run-rate, implied H2, P/E–P/B forward | BNK-18 |
| 💎 FinSuccess | Quyết định (mỗi mức giá kèm P/B, P/B fwd), dải P/B–P/E ±1σ, định giá thu nhập thặng dư theo 4 kịch bản lãi suất, rủi ro, thesis tracker, nhật ký | Bước 8 |

## Dữ liệu
- `data/raw/wi/*.json` — response WiData **nguyên văn** (lưu bằng `scripts/wi_capture_transcript.py` từ log phiên Claude; đã bỏ thông tin cá nhân và tài liệu nội bộ của Wi). **Không commit** (đã `.gitignore`): giữ ở máy, giải nén `ctg-wi-raw.zip` vào `data/` khi cần build lại.
- `scripts/build_ctg_data.py --ticker CTG|VCB|BID|TCB|MBB|ACB` → `data/<mã>-data.js` (trang `index.html` = CTG, `vcb.html`, `bid.html`, `tcb.html`, `mbb.html`, `acb.html`; hồ sơ và lời bình từng ngân hàng ở `data/banks.json`); `scripts/build_big3.py` → `data/big3-data.js` (chuỗi quý dài hạn VCB/BID/CTG cho tab So sánh nhóm). Bản CTG: `data/ctg-data.js` (`window.PVS_DATA`, cùng tên khóa với Stock dashboard: `meta`, `governance`, `events`, `consensus`, `valuation`, `thesisPillars`…) và `data/ctg-data.json`.
- Cập nhật: gọi lại WiMCP trong phiên Claude → `python3 scripts/wi_capture_transcript.py <transcript.jsonl>` → `for t in CTG VCB BID TCB MBB ACB; do python3 scripts/build_ctg_data.py --ticker $t; done; python3 scripts/build_big3.py` → `python3 tests/test_ctg_data.py`. Thêm ngân hàng mới: kéo cùng bộ endpoint cho mã đó, thêm mục vào `data/banks.json`, tạo trang HTML (copy `vcb.html`, đổi mã) và mở mã trong ô chọn ngân hàng.

- Style dùng chung: `assets/fs.css`.

## Phân vai nội dung
- **Số liệu**: WiData; số tự tính có công thức ở chân trang (chi phí tín dụng, hình thành nợ xấu, NIM sau dự phòng, LLR gồm lãi dự thu, P/B forward).
- **Lời đọc dưới chart, trạng thái trụ luận điểm, dấu ± sự kiện**: AI viết từ số đang hiển thị, theo quy tắc của deck.
- **Quan điểm FinSuccess**: chỉ phần analyst nhập ở tab 💎 FinSuccess; hiện lưu `localStorage` theo trình duyệt (chưa có backend).

## Hạn chế đã biết (v1)
- IDX-FX × IDX-LIQ: bản đầu, trọng số bằng nhau, chưa đạt backtest 60%.
- LDR là công thức WiData (TT22 + hệ số KBNN); chưa dựng LDR/NSFR/LCR theo TT50.
- CAR chỉ có kỳ bán niên/năm (TT41) tới 2025.
- Room tín dụng riêng CTG chưa có nguồn công bố.
- Model CTG v2.3 (Excel) chưa nối; giả định kịch bản ở tab FinSuccess là giá trị khởi tạo để thử.
- Deck REG-03 ghi 20% tiền gửi KBNN vào LDR — WiData dùng 50% từ Q3/2026; cần analyst xác nhận văn bản.

## Số liệu quốc tế tự động

- `scripts/fetch_global.py` tải ~65 chuỗi từ nguồn public (FRED, ECB Data Portal, NY Fed Markets, NY Fed HLW, DBnomics: Cục Thống kê Nhật Bản, NBS Trung Quốc; OECD) → `data/global/series.json` + `report.json` (mã nào tải được, mã nào lỗi).
- `scripts/build_global.py` tính YoY / 3 tháng quy năm / MoM, Taylor rule (V1 lệch GDP, V2 lệch thất nghiệp), bậc thang thanh khoản Mỹ, tài sản NHTW quy USD → `data/global-data.js`.
- Workflow `fetch-global.yml` chạy 06:17 sáng (giờ VN) mỗi ngày, commit số mới và deploy lại trang. Chạy tay: Actions → "Cập nhật số liệu quốc tế" → Run workflow.
