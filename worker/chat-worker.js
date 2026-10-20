/**
 * Server trung gian cho Trợ lý AI trên dashboard GitHub Pages (Cloudflare Worker).
 * - Giữ API key Anthropic (không lộ ra trình duyệt), kiểm tra mật khẩu và nguồn gọi (chỉ trang dashboard).
 * - POST /chat   : chuyển {system, messages, tools, deep} sang Claude Messages API, trả nguyên kết quả.
 * - POST /update : chạy GitHub Actions cập nhật số liệu quốc tế + VIRA (cần GITHUB_TOKEN).
 * Biến môi trường (Settings → Variables and Secrets):
 *   ANTHROPIC_API_KEY (secret) · CHAT_PASSWORD (secret) · GITHUB_TOKEN (secret, tuỳ chọn)
 *   ALLOWED_ORIGINS = https://mdnguyen-cyber.github.io · MODEL = claude-sonnet-5-5 · MODEL_DEEP = claude-opus-5-5
 */
const REPO = 'mdnguyen-cyber/bank-dashboard';

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || 'https://mdnguyen-cyber.github.io').split(',').map(s => s.trim());
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
      'Access-Control-Allow-Headers': 'content-type, x-fs-key',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
    };
    const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'content-type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    if (!allowed.includes(origin)) return json({ error: 'origin' }, 403);
    if (!env.CHAT_PASSWORD || req.headers.get('x-fs-key') !== env.CHAT_PASSWORD) return json({ error: 'unauthorized' }, 401);

    const path = new URL(req.url).pathname;
    if (path === '/chat') {
      const raw = await req.text();
      if (raw.length > 900000) return json({ error: { message: 'Hội thoại quá dài — xoá hội thoại rồi hỏi lại.' } }, 413);
      const b = JSON.parse(raw);
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: b.deep ? (env.MODEL_DEEP || 'claude-opus-5-5') : (env.MODEL || 'claude-sonnet-5-5'),
          max_tokens: 4096,
          system: String(b.system || '').slice(0, 200000),
          messages: b.messages,
          tools: Array.isArray(b.tools) ? b.tools.slice(0, 20) : undefined,
        }),
      });
      return new Response(await r.text(), { status: r.status, headers: { ...cors, 'content-type': 'application/json' } });
    }
    if (path === '/update') {
      if (!env.GITHUB_TOKEN) return json({ error: 'Chưa cấu hình GITHUB_TOKEN cho Worker' }, 501);
      const out = {};
      for (const wf of ['fetch-global.yml', 'fetch-vira.yml']) {
        const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${wf}/dispatches`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'fs-chat-worker', 'content-type': 'application/json' },
          body: JSON.stringify({ ref: 'main' }),
        });
        out[wf] = r.status;
      }
      return json({ ok: Object.values(out).every(s => s === 204), out });
    }
    return json({ error: 'not found' }, 404);
  },
};
