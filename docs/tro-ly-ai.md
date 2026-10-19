# Trợ lý AI

- Trang: https://claude.ai/artifact/NPnjNWbkz5DUjxRdnQ9Qmi (artifact riêng tư trên claude.ai, chỉ chủ tài khoản mở được).
- Mã nguồn trang: `bot/assistant.html`; dữ liệu: `data/bot-context.json` (sinh bởi `scripts/build_bot_context.py`), publish kèm tên `context.json`.
- Quyền trang: hỏi Claude (sample); connector WiMCP (wi_data_search, wi_data_macro, wi_data_companies, wi_data_news) để lấy số mới; Claude Code Remote (fire_trigger) để chạy cập nhật.
- Tác vụ đã lên lịch "Cập nhật dashboard ngân hàng": `trig_01Wg3DbSbchPzmc1AatBXPd4`, 17:20 thứ 2–6 (giờ Việt Nam), quy trình ở `docs/cap-nhat-du-lieu.md`.
- Publish lại: Artifact `url` ở trên, `file_path=bot/assistant.html`, `files={"context.json": "data/bot-context.json"}` (giữ nguyên capabilities: không truyền `capabilities`).
