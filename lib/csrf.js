// Lightweight double-submit cookie CSRF protection
// Issue a CSRF cookie and require matching header on mutations

import crypto from 'crypto';

export function ensureCSRFCookie(res) {
  try {
    const token = crypto.randomBytes(16).toString('hex');
    // SameSite strict; not httpOnly so client can reflect to header
    // Only add Secure in production; in dev on http it would block the cookie
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.headers.set('Set-Cookie', `csrftoken=${token}; Path=/; SameSite=Strict${secure}`);
    return token;
  } catch {
    return null;
  }
}

export function validateCSRFFromRequest(req) {
  try {
    const method = (req.method || '').toUpperCase();
    if (!['POST','PUT','PATCH','DELETE'].includes(method)) return true; // only enforce on mutations

    // Double-submit cookie check
    // If the custom header is present, it means the request originated from our app
    // because custom headers cannot be set in cross-origin form submissions.

    const headerToken = req.headers.get?.('x-csrf-token') || req.headers['x-csrf-token'] || '';
    const cookieHeader = req.headers.get?.('cookie') || req.headers['cookie'] || '';
    const m = /csrftoken=([^;]+)/.exec(cookieHeader);
    const cookieToken = m ? m[1] : '';
    return Boolean(headerToken && cookieToken && headerToken === cookieToken);
  } catch {
    return false;
  }
}


