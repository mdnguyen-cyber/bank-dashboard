# Trợ lý AI ngay trên dashboard GitHub Pages

Trang GitHub Pages là web tĩnh, không giữ được bí mật, nên khung chat gọi Claude qua một server trung gian nhỏ (Cloudflare Worker, miễn phí)
giữ API key Anthropic và mật khẩu. Code: `worker/chat-worker.js`. Khung chat: `assets/chat.js`; bật bằng URL trong `assets/chat-config.js`.

## Cài đặt (một lần)
1. API key: https://console.anthropic.com → Settings → API keys → Create key (nạp credit trong Billing).
2. Cloudflare: https://dash.cloudflare.com (tạo tài khoản miễn phí) → Workers & Pages → Create → Create Worker → đặt tên `fs-chat` → Deploy.
3. Edit code → xoá code mẫu, dán toàn bộ `worker/chat-worker.js` → Deploy.
4. Worker → Settings → Variables and Secrets → thêm:
   - `ANTHROPIC_API_KEY` (Secret) = key ở bước 1
   - `CHAT_PASSWORD` (Secret) = mật khẩu dài, khó đoán (dùng để mở khung chat)
   - `GITHUB_TOKEN` (Secret, tuỳ chọn — cho nút "Cập nhật dữ liệu"): GitHub → Settings → Developer settings → Fine-grained tokens,
     chỉ repo `bank-dashboard`, quyền Actions: Read and write
   - `ALLOWED_ORIGINS` (Text) = `https://mdnguyen-cyber.github.io`
5. Copy URL Worker (dạng `https://fs-chat.<tên>.workers.dev`) điền vào `assets/chat-config.js`, push.

## Chi phí và giới hạn
- Trả theo lượt dùng API Anthropic (model mặc định `claude-sonnet-5-5`, ô "Phân tích sâu" dùng `claude-opus-5-5`). Đặt hạn mức chi trong Console → Billing → Limits.
- Bản web dùng dữ liệu của dashboard (≥5 năm). Truy vấn trực tiếp nguồn dữ liệu nội bộ và chạy cập nhật số trong nước chỉ có ở bản trên claude.ai;
  nút "Cập nhật dữ liệu" trên web chạy cập nhật số quốc tế, tỷ giá NHNN và VIRA.

## Giá theo phút (Brent, WTI) — Worker riêng, không cần API key, không tốn token
Code: `worker/quote-worker.js`. Trang Vĩ mô › Hàng hóa đọc qua `assets/live.js`, 20 giây một lần khi tab trình duyệt đang mở.
1. https://dash.cloudflare.com → Workers & Pages → Create → Create Worker → đặt tên `fs-quote` → Deploy.
2. Edit code → xoá code mẫu, dán toàn bộ `worker/quote-worker.js` → Deploy.
3. (Tuỳ chọn) Settings → Variables and Secrets → `ALLOWED_ORIGINS` (Text) = `https://mdnguyen-cyber.github.io`.
4. Kiểm tra: mở `https://fs-quote.<tên>.workers.dev/q?s=BZ=F,CL=F` trên trình duyệt — thấy JSON có `p` (giá) là được.
5. Điền URL `https://fs-quote.<tên>.workers.dev` vào `window.FS_QUOTE = { url: '' }` trong `assets/chat-config.js`, push (hoặc gửi URL cho Claude).
Gói miễn phí: 100.000 lượt/ngày; bộ nhớ đệm 20 giây nên dù nhiều người xem, Worker chỉ gọi Yahoo khoảng 3 lần/phút. Giá Yahoo của hợp đồng tương lai có thể trễ ~10 phút so với sàn.
Thêm mã khác (vàng `GC=F`, DXY `DX-Y.NYB`, UST 10Y `^TNX`, USD/VND `VND=X`…): chỉ cần thêm vào danh sách `S` trong `assets/live.js`.
