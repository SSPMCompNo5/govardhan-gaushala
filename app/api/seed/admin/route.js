import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongo';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const allowed = process.env.NODE_ENV === 'development' || process.env.ENABLE_SEED === 'true';
    const host = request?.headers?.get('host') || '';
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]');
    if (!allowed || !isLocalhost) {
      return NextResponse.json({ ok: false, error: 'Not Found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = String(body?.userId || process.env.ADMIN_USERID || '').trim();
    const password = String(body?.password || process.env.ADMIN_PASSWORD || '');
    const role = String(body?.role || process.env.ADMIN_ROLE || 'Owner/Admin');
    const force = body?.force === true || String(body?.force).toLowerCase() === 'true';

    if (!userId || !password) {
      return NextResponse.json({ error: 'userId and password required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const users = db.collection('users');
    await users.createIndex({ userId: 1 }, { unique: true });

    const passwordHash = await bcrypt.hash(password, 12);

    // If force is true and user exists, update password and role
    const existing = await users.findOne({ userId });
    if (existing && force) {
      await users.updateOne(
        { userId },
        { $set: { passwordHash, role, updatedAt: new Date() } }
      );
      return NextResponse.json({ ok: true, created: false, updated: true });
    }

    const res = await users.updateOne(
      { userId },
      {
        $setOnInsert: {
          userId,
          passwordHash,
          role,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    const upserted = !!res.upsertedId;
    return NextResponse.json({ ok: true, created: upserted, updated: false });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to seed admin' }, { status: 500 });
  }
}
