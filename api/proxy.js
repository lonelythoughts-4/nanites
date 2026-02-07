// Simple Vercel serverless proxy to forward requests to the ngrok backend
// Place this file in `WEBAPP/api/proxy.js` so Vercel serves it at /api/proxy/*

const TARGET_BASE = 'https://thankworthy-endmost-mitch.ngrok-free.dev';

module.exports = async (req, res) => {
  try {
    const targetPath = req.url.replace(/^\/api\/proxy/, '') || '/';
    const target = TARGET_BASE + targetPath;

    // Read raw body if present
    let body = undefined;
    if (req.method && !['GET', 'HEAD'].includes(req.method.toUpperCase())) {
      body = await new Promise((resolve) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', () => resolve(undefined));
      });
    }

    // Build headers to forward (only keep safe headers)
    const forwardHeaders = {};
    if (req.headers['x-telegram-id']) forwardHeaders['X-Telegram-ID'] = req.headers['x-telegram-id'];
    if (req.headers['content-type']) forwardHeaders['Content-Type'] = req.headers['content-type'];

    const fetchOptions = {
      method: req.method,
      headers: forwardHeaders,
      body: body && body.length ? body : undefined
    };

    const upstream = await fetch(target, fetchOptions);
    const text = await upstream.text();

    // Copy selected headers back
    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      const key = k.toLowerCase();
      if (['transfer-encoding', 'content-encoding'].includes(key)) return;
      res.setHeader(k, v);
    });

    // Ensure CORS is allowed from Vercel (same-origin) and any origin for dev
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Secret, Authorization, X-Telegram-ID');

    res.send(text);
  } catch (err) {
    console.error('Proxy error', err && err.stack ? err.stack : err);
    res.status(502).json({ error: String(err && err.message ? err.message : err) });
  }
};
