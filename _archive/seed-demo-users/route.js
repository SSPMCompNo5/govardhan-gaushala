import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongo';
import bcrypt from 'bcryptjs';

// POST /api/seed/demo-users
// Creates one demo user per role with simple credentials.
export async function POST(request) {
  try {
    const allowed = process.env.NODE_ENV === 'development' || process.env.ENABLE_SEED === 'true';
    const host = request?.headers?.get('host') || '';
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]');
    if (!allowed || !isLocalhost) {
      return NextResponse.json({ ok: false, error: 'Not Found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const list = Array.isArray(body?.users) ? body.users : null;
    if (!list || list.length === 0) {
      return NextResponse.json({ ok: false, error: 'users array required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const users = db.collection('users');
    const roles = db.collection('roles');

    await users.createIndex({ userId: 1 }, { unique: true });

    const out = [];
    for (const u of list) {
      const userId = String(u?.userId || '').trim();
      const password = String(u?.password || '');
      const role = String(u?.role || '').trim();
      if (!userId || !password || !role) {
        out.push({ userId, role, created: false, reason: 'invalid input' });
        continue;
      }
      const roleExists = await roles.findOne({ name: role });
      if (!roleExists) {
        out.push({ userId, role, created: false, reason: 'role missing' });
        continue;
      }
      const existing = await users.findOne({ userId });
      if (existing) {
        out.push({ userId, role: existing.role, created: false, reason: 'already exists' });
        continue;
      }
      const passwordHash = await bcrypt.hash(password, 10);
      await users.insertOne({ userId, passwordHash, role, createdAt: new Date() });
      out.push({ userId, role, created: true });
    }

    return NextResponse.json({ ok: true, users: out });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to seed users' }, { status: 500 });
  }
}
