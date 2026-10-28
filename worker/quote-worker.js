/**
 * Giá theo phút cho dashboard (Cloudflare Worker, miễn phí, không cần API key, không tốn token AI).
 * GET /q?s=BZ=F,CL=F[&r=1d|5d]  →  { at, q: [{ s, n, cur, p, pc, ts, t:[unix giây], c:[giá đóng cửa từng phút] }] }
 * Nguồn: Yahoo Finance (ICE Brent BZ=F, CME/NYMEX WTI CL=F …). Bộ nhớ đệm 20 giây ở Cloudflare nên nhiều người xem cùng lúc vẫn chỉ gọi Yahoo ~3 lần/phút.
 * Biến (tuỳ chọn): ALLOWED_ORIGINS = https://mdnguyen-cyber.github.io (cách nhau bằng dấu phẩy).
 */
export default {
  async fetch(req, env, ctx) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || 'https://mdnguyen-cyber.github.io').split(',').map(s => s.trim());
    const ok = allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const cors = { 'Access-Control-Allow-Origin': ok ? origin : allowed[0], 'Access-Control-Allow-Methods': 'GET, OPTIONS', Vary: 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(req.url);
    if (url.pathname !== '/q') return new Response('not found', { status: 404, headers: cors });
    const syms = (url.searchParams.get('s') || 'BZ=F,CL=F').split(',').map(s => s.trim().toUpperCase()).filter(s => /^[A-Z0-9=.^\-]{1,15}$/.test(s)).slice(0, 8);
    const range = url.searchParams.get('r') === '5d' ? '5d' : '1d';
    const key = new Request(`https://fs-quote.cache/${range}/${syms.join(',')}`), cache = caches.default;
    let hit = await cache.match(key);
    if (!hit) {
      const q = await Promise.all(syms.map(async s => {
        try {
          const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=${range}&interval=1m`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          const j = await r.json(), x = j.chart.result[0], m = x.meta, cl = x.indicators.quote[0].close || [];
          const t = [], c = [];
          (x.timestamp || []).forEach((ts, i) => { if (cl[i] != null) { t.push(ts); c.push(Math.round(cl[i] * 1000) / 1000); } });
          return { s, n: m.shortName || s, cur: m.currency, p: m.regularMarketPrice, pc: m.chartPreviousClose ?? m.previousClose, ts: m.regularMarketTime, t, c };
        } catch (e) { return { s, err: String(e).slice(0, 120) }; }
      }));
      hit = new Response(JSON.stringify({ at: Math.floor(Date.now() / 1000), q }), { headers: { 'content-type': 'application/json', 'Cache-Control': 'public, max-age=20' } });
      ctx.waitUntil(cache.put(key, hit.clone()));
    }
    const out = new Response(hit.body, hit); Object.entries(cors).forEach(([k, v]) => out.headers.set(k, v));
    return out;
  },
};
