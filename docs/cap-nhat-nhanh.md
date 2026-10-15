# Quy trình "Cập nhật nhanh" (tab 2 của nganh.html)

Tab Cập nhật nhanh trả lời một câu hỏi: **lúc này điều gì đang là mối quan tâm của ngành ngân hàng, và chart nào chứng minh rõ nhất**. Mỗi lần cập nhật là một bản mới trong `data/quick-updates.json`; bản cũ giữ nguyên để xem lại ở mục "Lịch sử cập nhật".

## Ai cập nhật

- **Chuyên viên** tự viết: `author = {"type": "Chuyên viên", "name": "<tên>"}`.
- **AI** viết khi chuyên viên yêu cầu: `author = {"type": "AI", "name": "Claude", "requestedBy": "<tên chuyên viên>"}`.

## Các bước khi AI được yêu cầu cập nhật

1. **Đọc lịch sử trước.** Mở `data/quick-updates.json`, đọc bản mới nhất và bản gần nhất **của chuyên viên** (nếu có). Lấy danh sách mối quan tâm, trạng thái, các mốc "Theo dõi tiếp" đã đến hạn. Quan điểm của chuyên viên là khung: AI viết tiếp, không viết đè.
2. **Làm mới dữ liệu** (chạy lại các script build nếu có dữ liệu mới), rồi đọc số mới nhất trong `data/sector-data.json`, nhật ký `data/sbv-log.json`, tin tức gần nhất.
3. **Xếp lại mối quan tâm.** Mỗi mối quan tâm cũ: còn nóng (`nóng lên` / `tiếp diễn`), hay `hạ nhiệt` — ghi lý do bằng số vào `change`. Thêm diễn biến mới (`mới`). Bỏ hẳn những mục đã hết liên quan (vẫn còn trong bản cũ). Thứ tự = mức độ quan trọng lúc này.
4. **Chọn chart làm bằng chứng** từ Chart book: `python3 scripts/chart_ids.py` liệt kê mã chart. Mỗi mục 1–2 chart; dùng `last` để chỉ hiện giai đoạn gần đây. Chart chưa có mà cần thiết thì thêm chart vào dashboard trước (nó sẽ tự xuất hiện trong Chart book).
5. **Viết bản mới**: `id` = `QU-YYYY-MM-DD-AI` (hoặc `-CV`), `follows` = id bản trước, `vsPrev` = 1 câu tóm tắt đã đổi gì. Mỗi nhận định phải có số; in đậm số quan trọng bằng `<b>`. Không ghi WiData làm nguồn — ghi cơ quan công bố gốc.
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
