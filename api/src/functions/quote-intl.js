const { app } = require('@azure/functions');

// GET /api/quote-intl?symbol=601857.SS  (或 ORSTED.CO、300750.SZ ...)
// 代理 Yahoo Finance v8 chart 端點，涵蓋哥本哈根、上海、深圳等國際市場。
// 不需金鑰，但要帶 User-Agent，否則 Yahoo 會擋。
// 回傳形狀做成跟 Finnhub 一樣的 { c, pc }，前端解析邏輯就不用改。
app.http('quote-intl', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const symbol = request.query.get('symbol');
    if (!symbol) {
      return { status: 400, jsonBody: { error: 'missing symbol' } };
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;

    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) {
        return { status: r.status, jsonBody: { error: `yahoo ${r.status}` } };
      }
      const json = await r.json();
      const meta = json && json.chart && json.chart.result && json.chart.result[0]
        ? json.chart.result[0].meta
        : null;

      if (!meta || typeof meta.regularMarketPrice !== 'number') {
        return { status: 404, jsonBody: { error: 'no price for ' + symbol } };
      }

      return {
        jsonBody: {
          c: meta.regularMarketPrice,
          pc: meta.chartPreviousClose != null ? meta.chartPreviousClose
            : (meta.previousClose != null ? meta.previousClose : meta.regularMarketPrice)
        }
      };
    } catch (e) {
      context.error('yahoo fetch failed', e);
      return { status: 502, jsonBody: { error: 'upstream failed' } };
    }
  }
});
