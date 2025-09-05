import { NextResponse } from 'next/server';
import crypto from 'crypto';

// GET /api/csrf → Issues a csrftoken cookie and returns the token
export async function GET() {
  const token = crypto.randomBytes(16).toString('hex');
  const res = NextResponse.json({ token });
  // SameSite Strict, not httpOnly so client can reflect it in X-CSRF-Token
  res.headers.set(
    'Set-Cookie',
    `csrftoken=${token}; Path=/; SameSite=Strict; Secure=${process.env.NODE_ENV === 'production' ? 'true' : 'false'}`
  );
  return res;
}


