// Vercel Serverless Function — verify code against HMAC hash.
// Env vars required:
//   AUTH_SECRET   (same secret used in send-code.js)

import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, code, hash, expiry } = req.body || {};

  if (!email || !code || !hash || !expiry) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const SECRET = process.env.AUTH_SECRET;
  if (!SECRET) {
    console.error('[auth/verify-code] Missing AUTH_SECRET env var');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Check expiry
  if (Date.now() > expiry) {
    return res.status(400).json({ error: 'Code expired' });
  }

  // Recompute HMAC and compare
  const expected = crypto.createHmac('sha256', SECRET)
    .update(`${email}:${code}:${expiry}`)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected))) {
    return res.status(400).json({ error: 'Invalid code' });
  }

  console.log('[auth/verify-code] Verified:', email);

  res.status(200).json({ success: true, email });
}
