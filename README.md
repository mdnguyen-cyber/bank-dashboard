# Bank Dashboard · FinSuccess

Dashboard ngân hàng theo chuẩn layout FinSuccess. Xem online: https://mdnguyen-cyber.github.io/bank-dashboard/ (tự deploy qua GitHub Actions mỗi lần push `main`). Hoặc mở `index.html` trong trình duyệt (cần mạng để tải Chart.js từ cdnjs).

## Lộ trình
1. **CTG v1** (bản này) — dashboard cổ phiếu theo khung 6 tab của Stock dashboard (MWG Tracker).
2. **CSTT + Ngành Ngân hàng** — chuỗi 3 tab Quốc tế → Nội địa → Ngân hàng, hai chỉ số IDX-FX, IDX-LIQ; ô kịch bản ở tab 2 của CTG sẽ lấy từ đây.

## 6 tab CTG
| Tab | Nội dung | Ánh xạ deck |
|---|---|---|
| Tổng quan | KPI, thông tin DN, giá 1 năm (52W), 5 trụ luận điểm, checklist mua, tin ±45 ngày, quản trị & sở hữu | Bước 1, 8 |
| Vĩ mô & Tỉ lệ an toàn *(tab tùy biến)* | Ma trận kịch bản, tín hiệu R-01/09/10/13/14, tỷ giá, LNH–OMO, LS huy động, tín dụng, LDR, CAR, cơ cấu dư nợ, ánh xạ vĩ mô → CTG, bảng REG | Slide 35–39, 50–54 |
| Tài chính | Bảng cân đối (waterfall), KQKD (năm + KH/YTD), biên lãi, chất lượng tài sản, hiệu quả & vốn, so sánh nhóm, CAMEL | Bước 2–7, BNK-01…17 |
| Catalyst & Sự kiện | Sắp tới + dòng sự kiện có bộ lọc, dấu ± | — |
| Consensus CTCK | Lollipop TP, LNST 2026F vs KH ĐHĐCĐ & run-rate, implied H2, P/E–P/B forward | BNK-18 |
| 💎 FinSuccess | Quyết định (mỗi mức giá kèm P/B, P/B fwd), dải P/B–P/E ±1σ, định giá thu nhập thặng dư theo 4 kịch bản lãi suất, rủi ro, thesis tracker, nhật ký | Bước 8 |

## Dữ liệu
- `data/raw/wi/*.json` — response WiData **nguyên văn** (lưu bằng `scripts/wi_capture_transcript.py` từ log phiên Claude; đã bỏ thông tin cá nhân và tài liệu nội bộ của Wi). **Không commit** (đã `.gitignore`): giữ ở máy, giải nén `ctg-wi-raw.zip` vào `data/` khi cần build lại.
- `scripts/build_ctg_data.py` → `data/ctg-data.js` (`window.PVS_DATA`, cùng tên khóa với Stock dashboard: `meta`, `governance`, `events`, `consensus`, `valuation`, `thesisPillars`…) và `data/ctg-data.json`.
- Cập nhật: gọi lại WiMCP trong phiên Claude → `python3 scripts/wi_capture_transcript.py <transcript.jsonl>` → `python3 scripts/build_ctg_data.py` → `python3 tests/test_ctg_data.py`.

## Phân vai nội dung
- **Số liệu**: WiData; số tự tính có công thức ở chân trang (chi phí tín dụng, hình thành nợ xấu, NIM sau dự phòng, LLR gồm lãi dự thu, P/B forward).
- **Lời đọc dưới chart, trạng thái trụ luận điểm, dấu ± sự kiện**: AI viết từ số đang hiển thị, theo quy tắc của deck.
- **Quan điểm FinSuccess**: chỉ phần analyst nhập ở tab 💎 FinSuccess; hiện lưu `localStorage` theo trình duyệt (chưa có backend).

## Hạn chế đã biết (v1)
- IDX-FX × IDX-LIQ chưa tính (chờ dashboard CSTT); tạm đọc bằng tín hiệu R-xx.
- LDR là công thức WiData (TT22 + hệ số KBNN); chưa dựng LDR/NSFR/LCR theo TT50.
- CAR chỉ có kỳ bán niên/năm (TT41) tới 2025.
- Room tín dụng riêng CTG chưa có nguồn công bố.
- Model CTG v2.3 (Excel) chưa nối; giả định kịch bản ở tab FinSuccess là giá trị khởi tạo để thử.
- Deck REG-03 ghi 20% tiền gửi KBNN vào LDR — WiData dùng 50% từ Q3/2026; cần analyst xác nhận văn bản.
