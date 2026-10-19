# Trợ lý AI

- Trang: https://claude.ai/artifact/NPnjNWbkz5DUjxRdnQ9Qmi — bản dashboard ngành chạy trên claude.ai (riêng tư), có khung chat Trợ lý AI nổi góc phải.
  Bản GitHub Pages công khai giữ nguyên, nút "✦ Trợ lý AI" ở đó mở trang này.
- Dựng trang: `python3 scripts/build_bot_context.py && python3 scripts/build_artifact.py` → `bot/assistant.html` (nội dung trang) + danh sách file kèm theo in ra màn hình.
- Khung chat: `assets/chat.js` (chỉ chạy khi `window.FS_ARTIFACT`); dữ liệu cho trợ lý: `data/bot-context.json`.
- Quyền trang: hỏi Claude (sample); connector WiMCP (wi_data_search, wi_data_macro, wi_data_companies, wi_data_news); Claude Code Remote (fire_trigger).
- Tác vụ đã lên lịch "Cập nhật dashboard ngân hàng": `trig_01Wg3DbSbchPzmc1AatBXPd4`, 17:20 thứ 2–6 (giờ Việt Nam), quy trình ở `docs/cap-nhat-du-lieu.md`.
- Publish lại: Artifact `url` ở trên, `file_path=bot/assistant.html`, `files` = mỗi đường dẫn trong FILES của `scripts/build_artifact.py` ánh xạ về chính nó
  (không truyền `capabilities` để giữ quyền đã khai).
