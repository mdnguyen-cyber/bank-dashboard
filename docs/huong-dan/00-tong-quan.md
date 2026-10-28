# 0 · Tổng quan và lộ trình dựng lại

Bộ tài liệu này đủ để dựng lại dashboard FinSuccess gần như nguyên bản. Bạn đọc chương này trước để biết bức tranh chung, sau đó tra các chương còn lại khi dựng từng phần:

- **Chương 1 · Nền tảng chung:** bố cục repo, hệ thiết kế và kích thước, các thư viện JS dùng chung, build và deploy, quy ước nội dung.
- **Chương 2 · Trang cổ phiếu ngân hàng:** CTG, VCB, BID, TCB, MBB, ACB.
- **Chương 3 · Trang Ngành Ngân hàng · CSTT.**
- **Chương 4 · Trang Vĩ mô.**
- **Chương 5 · Ngành Bảo hiểm, Ngành Chứng khoán và trang doanh nghiệp BH·CK.**

Mỗi chương ghi đến từng chart: mã phần tử, loại chart, kích thước khung, dataset và màu, trục, plugin, cách sinh lời đọc dưới chart và dòng nguồn. Các tham chiếu `file:dòng` được lấy theo bản repo ngày 28/10/2026. Số dòng có thể lệch vài dòng khi code đổi, nên dùng tên hàm để tìm là chắc nhất.

## Dashboard gồm những gì

| Trang | File | Renderer | Dữ liệu chính | Ai xem được |
|---|---|---|---|---|
| Vĩ mô Việt Nam & Thế giới | `vimo.html` | `assets/sector.js` (nhánh `data-page="vimo"`) | `global-data.js`, `vira-data.js`, `eco-data.js`, `cmd-data.js`, `bond-data.js`, `calendar-data.js`, `vimo-risk.js`, `sector-data.js` | Mọi người |
| Ngành Ngân hàng · CSTT | `nganh.html` | `assets/sector.js` | `sector-data.js` (`window.SECTOR_DATA`) và các file vĩ mô | Mọi người |
| Cổ phiếu ngân hàng | `index.html` (CTG), `vcb.html`, `bid.html`, `tcb.html`, `mbb.html`, `acb.html` | `assets/app.js` | `<mã>-data.js` (`window.PVS_DATA`), `big3-data.js` | Mọi người |
| Ngành Bảo hiểm | `bh.html` | `assets/finsec.js` (`data-page="bh"`) | `fin-data.js` (`window.FIN_DATA`) | Developer view |
| Ngành Chứng khoán | `ck.html` | `assets/finsec.js` (`data-page="ck"`) | `fin-data.js` | Developer view |
| Doanh nghiệp BH·CK | `dn.html?s=MÃ` | `assets/finsec.js` (`data-page="dn"`) | `fin-data.js` | Developer view |
| Database | `backend.html` | `assets/backend.js`, `assets/guide.js` | `catalog.js`, `guide.js` | Developer view |

**Công nghệ:**
- Site tĩnh trên GitHub Pages: HTML thuần, JavaScript thuần (mỗi renderer là một IIFE), Chart.js 4.4.1 tải từ cdnjs. Không có framework, không có bước bundle.
- Toàn bộ số liệu được dựng sẵn thành file `data/*.js` gán vào biến `window.*`, nên trang mở được cả từ `file://`.
- Trình duyệt không gọi API nào lúc chạy. Riêng Trợ lý AI gọi một Cloudflare Worker, và chỉ khi Worker đã được cấu hình.

## Dòng chảy dữ liệu

```
Nguồn gốc                         Lấy số                                Dựng                                  Hiển thị
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
FRED, NY Fed, ECB, BOJ, BLS,  →   scripts/fetch_*.py (GitHub Actions,  → scripts/build_global.py,           → data/global-data.js …
OECD, DBnomics, VIRA, NHNN …      cron, không cần AI)                   build_vira.py, build_auto.py           (vimo, nganh)
Wi MCP (BCTC, giá, định giá,  →   AI gọi trong phiên Claude, lưu       → build_sector_data.py,               → sector-data.js, <mã>-data.js,
 consensus, sự kiện…)             nguyên văn vào data/raw/wi (không      build_ctg_data.py, build_big3.py,      big3-data.js, fin-data.js,
                                  đưa lên repo công khai)                fin_wi_backfill.py → build_fin_data    bond-data.js, cmd-data.js
File Excel thị trường bảo     →   scripts/ins_import_xlsx.py           → data/backfill/ins_market.json        → fin-data.js (nguồn ghi theo
 hiểm (nguồn ghi từng dòng)                                              → build_fin_data.py                    từng dòng: Bộ Tài chính, IAV…)
Biên tập tay                  →   data/banks.json, sbv-log.json, quick-updates.json, notes.json, regs.json …
```

**Nguyên tắc dữ liệu:**
- Không chép tay số. Mọi số đi từ response gốc qua script build.
- `data/raw/` nằm trong `.gitignore`. Repo công khai chỉ chứa bản đã dẫn xuất (`data/backfill/*.json` và `data/*.js`).
- Build script **gộp** mọi file raw cùng loại. Khi trùng kỳ, file có kỳ mới hơn được ưu tiên. Vì vậy mỗi lần cập nhật chỉ cần kéo phần mới.
- Chỉ số sinh lời và chi phí tính theo **TTM** (4 quý gần nhất), không quy năm từ số quý.

## Lộ trình dựng lại từ đầu

1. **Khung repo.** Tạo các thư mục `assets/`, `data/`, `data/backfill/`, `data/raw/` (thêm vào `.gitignore`), `scripts/`, `tests/`, `docs/` và `.github/workflows/`. Bật GitHub Pages ở chế độ deploy bằng Actions, xem `pages.yml` ở Chương 1.
2. **Hệ thiết kế.** Chép `assets/fs.css`: màu navy `#1D2678`, teal `#59C5C8`, font Arial 14px, khung chart 280 / 340 (`tall`) / 230 (`short`) / 600px (`xl`), card, KPI, bảng `table.fz` có cột đầu cố định. Thêm logo và 3 favicon. Chi tiết ở Chương 1, mục fs.css.
3. **Khung trang chuẩn.** Làm theo thứ tự trong `<head>`:
   - script kiểm tra bản mới (`__BUILD__`, `version.json`);
   - favicon, `fs.css`;
   - `devview.js`, nạp đồng bộ để ẩn ngay các mục dành cho developer;
   - `speculationrules`.
   
   Phần `<body>` gồm: thanh logo kèm menu (`.site-nav`, ô chọn ngân hàng, ô chọn BH·CK `.devonly`), header mã, thanh tab `#tabbar`, các `section.pane`, footer. Cuối trang nạp script theo thứ tự: Chart.js, `chartkit.js`, `share.js`, các file `data/*.js`, `notes-data.js` và `notes.js`, renderer, `chat.js`.
4. **Thư viện dùng chung.** Thêm theo thứ tự sau:
   - `chartkit.js`: thanh khung thời gian 1M…Tất cả, kéo để zoom, chỉnh trục Y, đổi Cột/Đường, xem 100% tỷ trọng, nút Ẩn tất cả, Xuất PDF;
   - `share.js`: ghép ảnh chia sẻ, PDF;
   - `tblshot.js`: menu chuột phải trên bảng;
   - `notes.js`: ghi chép analyst có lịch sử;
   - `devview.js`: chuyển User view / Developer view;
   - `chat.js` cùng `worker/chat-worker.js`: Trợ lý AI;
   - `calendar.js`: lịch kinh tế.
5. **Một trang cổ phiếu ngân hàng trước (CTG).** Kéo Wi MCP theo danh sách endpoint ở Chương 2. Viết `build_ctg_data.py` để sinh `PVS_DATA`, rồi dựng `app.js` theo từng tab: Tổng quan → Tài chính (6 tab con) → Catalyst & Sự kiện → Consensus CTCK → 💎 FinSuccess. Khi CTG chạy được, nhân ra các mã khác bằng `--ticker`.
6. **Trang ngành Ngân hàng.** Thêm `build_sector_data.py` cho 26 ngân hàng, gồm định giá ngành, CAMELS TT21, IDX-FX/IDX-LIQ, consensus và nhật ký NHNN. Viết các tab trong `sector.js` theo Chương 3.
7. **Trang Vĩ mô.** Viết các fetcher nguồn công khai (`fetch_global.py`, `fetch_vira.py`, `fetch_sbv.py`…) và các workflow cron, sau đó dựng các tab Bản đồ nhiệt, Việt Nam, Thế giới, Hàng hóa, Rủi ro truyền dẫn theo Chương 4.
8. **Bảo hiểm và Chứng khoán.** Dựng theo Chương 5: `ins_import_xlsx.py` → `fin_wi_backfill.py` → `build_fin_data.py` → `finsec.js`. Bọc các trang này trong Developer view cho tới khi hoàn thiện.
9. **Database.** Viết `build_catalog.py` để sinh `catalog.js` (danh mục chuỗi, quy trình cập nhật, phương pháp) và `build_guide.py` để chuyển tài liệu này thành `guide.js`.
10. **Kiểm tra và deploy.** Chạy `tests/*.py`, rồi xem nhanh từng trang bằng Playwright: không lỗi JS, không có chữ NaN/undefined. Sau đó commit, push và dispatch `pages.yml`. Bước thứ hai của `pages.yml` dựng sẵn PDF cho từng tab, bỏ qua các trang Developer view.

## Quy tắc khi thêm một chart mới

- Đặt chart trong `card({id, title, sub, ins, src, h})`. Tiêu đề chỉ ghi tên nội dung. Dòng phụ ghi đơn vị, kỳ và cách đọc. `h` là `''` (280px), `'tall'` (340px) hoặc `'short'` (230px).
- **Bắt buộc có lời đọc** (`ins`). Lời đọc được tính từ chính số đang vẽ, in đậm số quan trọng và nêu hàm ý. Không để chart trống không có nhận xét.
- **Dòng nguồn:**
  - số lấy từ Wi MCP ghi "Wi MCP" kèm mô tả bảng;
  - số từ nguồn ngoài ghi đúng tên nguồn gốc (Bộ Tài chính, NHNN, FRED, VIRA…);
  - không ghi tên file và không ghi "WiData" ở nội dung hiển thị.
- Chart chuỗi thời gian theo ngày truyền `{ ts: true }` vào `mk()` để có thanh khung thời gian và kéo để zoom.
- Không đưa chuyện hậu trường lên trang (mục mới thêm, dữ liệu vừa nạp, sửa theo góp ý). Những việc đó chỉ báo trong chat.
- Bảng nhiều cột dùng `table.fz` (cột đầu cố định) trong `.tscroll`.
- Mọi mức giá (giá mục tiêu, giá mua, cắt lỗ) ghi kèm P/B và P/B forward tương ứng.
- Catalyst chỉ ghi sự kiện đoán trước được thời điểm.

## Cập nhật số liệu (tóm tắt)

1. **Nguồn tự động:** GitHub Actions chạy `fetch-global.yml` (06:17 hằng ngày và 16:47 ngày làm việc) và `fetch-vira.yml` (17:47 ngày làm việc). Chạy tay bằng lệnh `gh api -X POST …/dispatches -f ref=main`.
2. **Wi MCP:**
   - gọi các truy vấn trong `docs/cap-nhat-du-lieu.md`;
   - chạy `python3 scripts/wi_capture_transcript.py <transcript>` để lưu raw;
   - kết quả quá lớn thì chép tay vào `data/raw/wi/<tool>_<endpoint>_zz_<ngày>.json`.
3. **Build:**
   ```
   python3 scripts/build_sector_data.py
   for t in CTG VCB BID TCB MBB ACB; do python3 scripts/build_ctg_data.py --ticker $t; done
   python3 scripts/build_big3.py && python3 scripts/build_bond_data.py
   python3 scripts/cmd_wi_backfill.py && python3 scripts/build_cmd.py
   python3 scripts/fin_wi_backfill.py && python3 scripts/build_fin_data.py
   python3 scripts/build_bot_context.py && python3 scripts/build_catalog.py && python3 scripts/build_guide.py
   ```
4. **Kiểm tra:** chạy `tests/test_sector_data.py` và `tests/test_ctg_data.py`, rồi xem từng trang bằng Playwright.
5. **Đẩy lên:** commit "Cập nhật dữ liệu dd/mm/yyyy", push, dispatch `pages.yml`.

Mùa BCTC (tháng 1, 4, 7, 10): số toàn ngành ngân hàng chỉ lấy những quý đã có ít nhất 20/26 ngân hàng công bố. Quý đang công bố dở vẫn hiện ở trang từng ngân hàng đã có số, nhưng chưa vào số toàn ngành.

## Những điểm dễ hỏng khi cập nhật hoặc dựng lại

Các điểm dưới đây gom từ việc đọc toàn bộ code, nên kiểm tra mỗi khi sang quý mới:

- **Kỳ viết cứng:**
  - kỳ so sánh nhóm `PEER_Y, PEER_Q` ở `build_ctg_data.py`;
  - kỳ `TTM2Q26` ở `app.js` và `build_ctg_data.py`;
  - kỳ Q2 cố định ở bảng `fs_bank` trong `build_sector_data.py`;
  - `SEC_LASTQ` được suy ra tự động, nhưng ngưỡng cắt quý 92% là quy ước.
- **Chữ thời sự viết cứng:**
  - nhiều câu trong insight (Fed, FOMC, Brent, OMO lưu hành, can thiệp tỷ giá Nhật);
  - tab Chủ đề nóng;
  - bảng hủy hợp đồng BVH và các bảng quy định, catalyst của BH·CK.
  
  Các câu này phải sửa tay khi số thay đổi.
- **Hai màu navy:** giao diện CSS dùng `#1D2678`, còn chart trong `app.js` và `sector.js` dùng `#002060`. Khi dựng lại nên chọn một.
- **Chế độ Gọn luôn bật:** `mode0 = 'compact'`, các trang không có công tắc Gọn/Chi tiết như README mô tả.
- **Trợ lý AI trên web:** `gom_site.sh` chỉ chép `data/*.js`, nên `bot-context.json` không lên site. Muốn bật chat trên web thì thêm lệnh chép file này.
- **Chuỗi không tự cập nhật:** `fetch-sbv.yml` không gọi deploy lại trang. `bond-data.js`, phần Wi MCP của `sector-data.json` và `data/backfill/*.json` chỉ đổi khi kéo lại Wi MCP.
- **Thêm ngân hàng hoặc doanh nghiệp mới:** phải sửa ô chọn ở mọi trang HTML, thêm vào danh sách mã trong script build và renderer, và với BH·CK thêm cả nhóm `GRP`.
- **Developer view chỉ ẩn giao diện:** site tĩnh công khai nên đây không phải bảo mật. Không đưa dữ liệu cần giữ kín lên repo.
