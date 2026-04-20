// Vercel Serverless Function — proxy EverOS cloud API, bypassing CORS.
// Configured via env vars:
//   EVEROS_UPSTREAM   (default: https://api.evermind.ai/api/v0)
//   EVEROS_API_KEY    (Bearer token, required for cloud)

export default async function handler(req, res) {
  const UPSTREAM = process.env.EVEROS_UPSTREAM || 'https://api.evermind.ai/api/v1';
  const KEY = process.env.EVEROS_API_KEY || '';

  // Extract sub-path. Prefer req.query.path (populated by [...path].js),
  // fall back to parsing req.url which inside the function is like "/memories".
  let subPath = '';
  if (Array.isArray(req.query.path)) {
    subPath = req.query.path.join('/');
  } else if (typeof req.query.path === 'string' && req.query.path) {
    subPath = req.query.path;
  } else {
    const urlObj = new URL(req.url, 'http://x');
    subPath = urlObj.pathname.replace(/^\/+/, '').replace(/^api\/everos\/?/, '');
  }

  const search = new URL(req.url, 'http://x').searchParams;
  // Strip internal routing params
  for (const key of Array.from(search.keys())) {
    if (key === 'path' || key.startsWith('...')) search.delete(key);
  }
  const qs = search.toString();
  const upstreamUrl = `${UPSTREAM.replace(/\/$/, '')}/${subPath}${qs ? '?' + qs : ''}`;

  const headers = { 'Content-Type': 'application/json' };
  if (KEY) headers['Authorization'] = `Bearer ${KEY}`;

  const init = { method: req.method, headers };
  // EverOS v0 API uses GET with JSON body for /memories and /memories/search.
  // Standard fetch allows body on any method; we forward what the client sent.
  if (req.body !== undefined && req.body !== null) {
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  // Debug logging — visible in Vercel → Deployments → Logs
  console.log('[everos-proxy]', req.method, '->', upstreamUrl,
    'hasKey=', !!KEY, 'keyLen=', KEY.length,
    'bodyLen=', init.body ? init.body.length : 0);

  try {
    const r = await fetch(upstreamUrl, init);
    const text = await r.text();
    console.log('[everos-proxy] status=', r.status, 'respLen=', text.length,
      'reqId=', r.headers.get('x-request-id') || '');

    // Pass through useful upstream headers (content-type, allow, www-authenticate, etc.)
    const forwardHeaders = ['content-type', 'allow', 'www-authenticate', 'x-request-id'];
    forwardHeaders.forEach(h => {
      const v = r.headers.get(h);
      if (v) res.setHeader(h, v);
    });
    if (!r.headers.get('content-type')) res.setHeader('Content-Type', 'application/json');

    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: 'Upstream fetch failed', detail: String(e) });
  }
}
