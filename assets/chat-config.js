/* Địa chỉ server trung gian của Trợ lý AI (Cloudflare Worker, xem worker/README.md).
   Để trống: nút ✦ Trợ lý AI mở bản dashboard trên claude.ai. Điền URL: khung chat hiện ngay trên trang này. */
window.FS_CHAT = { url: '' };

/* Giá theo phút (Brent, WTI…) — Cloudflare Worker riêng `worker/quote-worker.js` (xem worker/README.md, mục "Giá theo phút").
   Để trống: không hiện chart giá theo phút. Điền URL Worker, vd 'https://fs-quote.<tên>.workers.dev'. */
window.FS_QUOTE = { url: '' };
