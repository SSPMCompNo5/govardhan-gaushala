import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongo';
import { ensureIndexes } from '@/lib/indexes';

function isLocalhost(req) {
  try {
    const host = req.headers.get('host') || '';
    return host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]');
  } catch {
    return false;
  }
}

function seedEnabled() {
  return process.env.NODE_ENV === 'development' || String(process.env.ENABLE_SEED).toLowerCase() === 'true';
}

export async function POST(req) {
  if (!seedEnabled() || !isLocalhost(req)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    await ensureIndexes();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || process.env.WATCHMAN_USERID || '').trim();
    const password = String(body?.password || process.env.WATCHMAN_PASSWORD || '');
    const role = 'Watchman';

    if (!userId || !password) {
      return NextResponse.json({ ok: false, error: 'userId and password required' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const now = new Date();
    const res = await db.collection('users').updateOne(
      { userId },
      {
        $set: { userId, role, passwordHash, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, userId, role, upserted: !!res.upsertedId });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
