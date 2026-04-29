// Vercel Serverless Function — generate verification code, send via EmailJS, return HMAC hash.
// Env vars required:
//   EMAILJS_PUBLIC_KEY
//   EMAILJS_SERVICE_ID
//   EMAILJS_TEMPLATE_ID
//   AUTH_SECRET          (random string for HMAC signing)

import crypto from 'crypto';

// In-memory rate limit cache (works across warm invocations).
// Maps email -> last send timestamp (ms).
const COOLDOWN_MS = 60 * 1000;
const rateLimitCache = globalThis.__sendCodeRateLimit || new Map();
globalThis.__sendCodeRateLimit = rateLimitCache;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};
  if (!email || !email.includes('@') || email.indexOf('.') < 3) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const emailKey = email.toLowerCase().trim();
  const lastSent = rateLimitCache.get(emailKey);
  if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
    const retryAfter = Math.ceil((COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Too many requests', retryAfter });
  }

  // Cleanup expired entries to prevent unbounded growth
  if (rateLimitCache.size > 1000) {
    const now = Date.now();
    for (const [k, t] of rateLimitCache) {
      if (now - t > COOLDOWN_MS) rateLimitCache.delete(k);
    }
  }

  const PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
  const PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;
  const SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
  const SECRET = process.env.AUTH_SECRET;

  if (!PUBLIC_KEY || !PRIVATE_KEY || !SERVICE_ID || !TEMPLATE_ID || !SECRET) {
    console.error('[auth/send-code] Missing env vars');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Generate 6-digit code
  const code = String(100000 + Math.floor(Math.random() * 900000));
  // Expiry: 10 minutes from now
  const expiry = Date.now() + 10 * 60 * 1000;

  // HMAC signature: binds email + code + expiry together
  const hmac = crypto.createHmac('sha256', SECRET)
    .update(`${email}:${code}:${expiry}`)
    .digest('hex');

  // Send email via EmailJS REST API
  try {
    const ejsRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: TEMPLATE_ID,
        user_id: PUBLIC_KEY,
        accessToken: PRIVATE_KEY,
        template_params: {
          to_email: email,
          code: code,
        },
      }),
    });

    if (!ejsRes.ok) {
      const text = await ejsRes.text();
      console.error('[auth/send-code] EmailJS error:', ejsRes.status, text);
      return res.status(502).json({ error: 'Failed to send email' });
    }
  } catch (e) {
    console.error('[auth/send-code] EmailJS fetch error:', e);
    return res.status(502).json({ error: 'Failed to send email' });
  }

  // Mark this email as just-sent (only after success, so failed sends don't lock the user out)
  rateLimitCache.set(emailKey, Date.now());

  console.log('[auth/send-code] Code sent to', email);

  // Return hash + expiry (NOT the code)
  res.status(200).json({ hash: hmac, expiry, cooldown: COOLDOWN_MS / 1000 });
}
