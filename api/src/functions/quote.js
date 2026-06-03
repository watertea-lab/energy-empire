const { app } = require('@azure/functions');

// GET /api/quote?symbol=XOM
// 前端只打這個 endpoint，FINNHUB_KEY 永遠留在後端環境變數裡。
app.http('quote', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const symbol = request.query.get('symbol');
    if (!symbol) {
      return { status: 400, jsonBody: { error: 'missing symbol' } };
    }

    const key = process.env.FINNHUB_KEY;
    if (!key) {
      // 提醒：還沒在 Azure 後台設定 FINNHUB_KEY 應用程式設定
      return { status: 500, jsonBody: { error: 'server key not configured' } };
    }

    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`;

    try {
      // Node 18+ 內建 fetch，SWA managed functions 可直接用
      const res = await fetch(url);
      if (!res.ok) {
        return { status: res.status, jsonBody: { error: `finnhub ${res.status}` } };
      }
      const data = await res.json();
      // 直接把 Finnhub 的 { c, pc, h, l, ... } 原樣回傳給前端
      return { jsonBody: data };
    } catch (e) {
      context.error('finnhub fetch failed', e);
      return { status: 502, jsonBody: { error: 'upstream failed' } };
    }
  }
});
