// Vercel serverless proxy to forward requests to the ngrok backend
// Avoids all CORS issues by using same-origin proxy pattern
// Place this file in `WEBAPP/api/proxy.js`

// Read target from environment (set on Vercel as TARGET_BASE or NGROK_URL).
// Default to ngrok for production; can override via Vercel env vars.
const TARGET_BASE = process.env.TARGET_BASE || process.env.NGROK_URL || 'https://thankworthy-endmost-mitch.ngrok-free.dev';

module.exports = async (req, res) => {
  try {
    // Extract path after /api/proxy and forward to target
    const targetPath = req.url.replace(/^\/api\/proxy/, '') || '/';
    const target = TARGET_BASE + targetPath;

    console.log(`[Proxy] ${req.method} ${req.url} -> ${target}`);

    // Read request body for POST/PUT/PATCH
    let body = undefined;
    if (req.method && !['GET', 'HEAD'].includes(req.method.toUpperCase())) {
      body = await new Promise((resolve) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', (err) => {
          console.error('[Proxy] Error reading body:', err.message);
          resolve(undefined);
        });
      });
    }

    // Forward safe headers only
    const forwardHeaders = {};
    const safeHeaders = ['x-telegram-id', 'content-type', 'authorization', 'accept'];
    safeHeaders.forEach(h => {
      if (req.headers[h]) {
        forwardHeaders[h] = req.headers[h];
      }
    });

    const fetchOptions = {
      method: req.method || 'GET',
      headers: forwardHeaders,
      ...(body && body.length ? { body } : {})
    };

    console.log(`[Proxy] Fetching with headers:`, forwardHeaders);

    const upstream = await fetch(target, fetchOptions);
    const responseText = await upstream.text().catch(err => {
      console.error('[Proxy] Error reading upstream response:', err.message);
      return null;
    });

    // Set response status
    res.status(upstream.status);

    // Forward important response headers (omit hop-by-hop headers)
    const headersToSkip = ['transfer-encoding', 'content-encoding', 'content-length'];
    upstream.headers.forEach((value, key) => {
      if (!headersToSkip.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Force JSON content type for API responses
    if (responseText && (responseText.includes('{') || responseText.includes('['))) {
      res.setHeader('Content-Type', 'application/json');
    }

    // Allow requests from any origin (safe here because proxy is same-origin for browser)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-ID, Authorization');

    // Send response
    if (responseText) {
      res.send(responseText);
    } else {
      res.status(502).json({ error: 'Empty response from upstream' });
    }
  } catch (err) {
    console.error('[Proxy] Error:', err && err.stack ? err.stack : err);
    const statusCode = err?.code === 'ECONNREFUSED' ? 503 : 502;
    res.status(statusCode).json({ 
      error: 'Proxy error',
      detail: err?.message || String(err),
      code: err?.code 
    });
  }
};
