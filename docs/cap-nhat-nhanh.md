# Quy trình "Cập nhật nhanh" (tab 2 của nganh.html)

Tab Cập nhật nhanh trả lời một câu hỏi: **lúc này điều gì đang là mối quan tâm của ngành ngân hàng, và chart nào chứng minh rõ nhất**. Mỗi lần cập nhật là một bản mới trong `data/quick-updates.json`; bản cũ giữ nguyên để xem lại ở mục "Lịch sử cập nhật".

## Ai cập nhật

- **Chuyên viên** tự viết: `author = {"type": "Chuyên viên", "name": "<tên>"}`.
- **AI** viết khi chuyên viên yêu cầu: `author = {"type": "AI", "name": "Claude", "requestedBy": "<tên chuyên viên>"}`.

## Chuyên viên chỉ sửa vài điểm

1. Trên tab Cập nhật nhanh bấm **✎ Chỉnh sửa**, sửa trực tiếp đoạn chữ (Ctrl+B in đậm) hoặc đổi trạng thái từng mục, chọn tên người sửa, bấm **Lưu thành bản mới**.
2. Trang tạo bản nháp trên máy (bản AI giữ nguyên): `author` = chuyên viên, `follows` = bản gốc, `edited` = danh sách đoạn đã sửa (hiện vạch vàng).
3. Bấm **Sao chép để đăng**, dán vào chat với AI kèm câu "đăng bản cập nhật này". AI lưu JSON ra file rồi chạy `python3 scripts/add_update.py <file>`, build, test, push.
4. Lần cập nhật sau, AI coi các đoạn trong `edited` là quan điểm của chuyên viên: giữ nguyên ý, chỉ cập nhật số liệu.
5. **Rà soát chữ trước khi đăng (bắt buộc).** Mỗi khi đăng đoạn chữ của chuyên viên (bản sửa, nhận định FinSuccess), AI soát toàn bộ: sửa lỗi gõ và thiếu dấu; thuật ngữ tiếng Anh đổi sang tiếng Việt, giữ thuật ngữ gốc trong ngoặc ở lần xuất hiện đầu tiên, ví dụ "với cac action chủ yếu" → "với các hành động (action) chủ yếu"; viết tắt chuẩn ngành giữ nguyên (NIM, CASA, LDR, OMO, QT). Không đổi ý, không đổi số. Liệt kê các chỗ đã sửa cho chuyên viên xem lại.
   Trên trang có nút **Rà soát chính tả** (chế độ sửa) và **Rà soát chính tả & thuật ngữ** (ô Nhận định FinSuccess): sửa nhanh theo từ điển ngay trên máy; nút **Nhờ AI rà kỹ** sao chép đoạn văn kèm yêu cầu để dán vào chat.

## Xuất PDF

Nút **⤓ Xuất PDF** trên tab Cập nhật nhanh tải thẳng file `FinSuccess_Cập Nhật Vĩ Mô Ngày dd-mm-yyyy.pdf` (ngày xuất) của bản đang xem — có logo, dòng "Tổng hợp có sự hỗ trợ của AI", tiêu đề "Cập nhật nhanh Ngày dd/mm/yyyy"; bỏ nút và lịch sử. Chỉ khi không tải được thư viện tạo PDF mới mở hộp in.

## Các bước khi AI được yêu cầu cập nhật

1. **Đọc lịch sử trước.** Mở `data/notes.json` (nhận định FinSuccess `sector-view` và quyết định từng mã `bank-<MÃ>-decision`, theo ngày — đây là quan điểm chính thức của chuyên viên), rồi `data/quick-updates.json`, đọc bản mới nhất và bản gần nhất **của chuyên viên** (nếu có). Lấy danh sách mối quan tâm, trạng thái, các mốc "Theo dõi tiếp" đã đến hạn. Quan điểm của chuyên viên là khung: AI viết tiếp, không viết đè.
2. **Làm mới dữ liệu** (chạy lại các script build nếu có dữ liệu mới), rồi đọc số mới nhất trong `data/sector-data.json`, nhật ký `data/sbv-log.json`, tin tức gần nhất.
3. **Xếp lại mối quan tâm.** Mỗi mối quan tâm cũ: còn nóng (`nóng lên` / `tiếp diễn`), hay `hạ nhiệt` — ghi lý do bằng số vào `change`. Thêm diễn biến mới (`mới`). Bỏ hẳn những mục đã hết liên quan (vẫn còn trong bản cũ). Thứ tự = mức độ quan trọng lúc này.
4. **Chọn chart làm bằng chứng** từ Chart book: `python3 scripts/chart_ids.py` liệt kê mã chart. Mỗi mục 1–2 chart; dùng `last` để chỉ hiện giai đoạn gần đây. Chart chưa có mà cần thiết thì thêm chart vào dashboard trước (nó sẽ tự xuất hiện trong Chart book).
5. **Viết bản mới** (`vsPrev`, `change` và mọi câu chữ hiện trên trang chỉ nói về **diễn biến thị trường, số liệu, quan điểm** — không nhắc việc làm dashboard như "thêm mục mới", "dữ liệu vừa đưa vào", "theo góp ý chuyên viên", "sửa bản trước"): `id` = `QU-YYYY-MM-DD-AI` (hoặc `-CV`), `follows` = id bản trước, `vsPrev` = 1 câu tóm tắt đã đổi gì. Mỗi nhận định phải có số; in đậm số quan trọng bằng `<b>`. Không ghi WiData làm nguồn — ghi cơ quan công bố gốc.
6. **Kiểm tra và đăng**: `python3 scripts/build_sector_data.py && python3 tests/test_sector_data.py`, xem trang, rồi commit/push (GitHub Pages tự deploy).

## Cấu trúc một bản

```json
{
  "id": "QU-2026-10-15-AI", "date": "2026-10-15",
  "author": {"type": "AI", "name": "Claude", "requestedBy": "Minh Đức"},
  "follows": null, "vsPrev": "",
  "headline": "…", "summary": ["…"],
  "kpis": [{"l": "…", "v": "…", "s": "…", "cls": "neg|pos"}],
  "concerns": [{"title": "…", "status": "mới|nóng lên|tiếp diễn|hạ nhiệt", "note": "…", "change": "…",
                "charts": [{"id": "chFx", "last": 18, "caption": "…"}]}],
  "watch": [{"d": "2026-10-28", "t": "…", "why": "…"}],
  "sources": ["…"]
}
```


## Nhận định & quyết định của chuyên viên (data/notes.json)

- Trên trang: ô **Nhận định FinSuccess** (nganh.html) và **Quyết định hiện tại** của từng mã (index.html) soạn có định dạng (đậm, nghiêng, gạch chân, danh sách). Lưu xong hiện thành một khối; nút **✎ Chỉnh sửa** ở góc để cập nhật; **Lịch sử** liệt kê mọi bản theo ngày.
- Bản mới nằm trên máy cho tới khi đăng: chuyên viên bấm **Sao chép để đăng**, dán vào chat kèm "đăng nhận định này".
- AI khi đăng: lưu JSON ra file, rà chính tả và Việt hoá thuật ngữ trong `html`/`text` (giữ thuật ngữ gốc trong ngoặc; ghi danh sách chỗ sửa vào `aiEdits`), rồi `python3 scripts/add_note.py <file>` → commit, push.
- Mỗi lần viết cập nhật nhanh hoặc phân tích mã, AI đọc bản mới nhất **và** các bản trước trong `data/notes.json` để biết quan điểm đã đổi thế nào, không viết trái quan điểm hiện hành của chuyên viên mà không nêu lý do bằng số.
