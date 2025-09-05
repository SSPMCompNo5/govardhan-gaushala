import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import bcrypt from 'bcryptjs';
import { logAudit } from '@/lib/audit';

// PATCH /api/users/password
// Body: { userId: string, newPassword: string }
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Owner/Admin') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = String(body?.userId || '').trim();
    const newPassword = String(body?.newPassword || '');
    if (!userId || !newPassword) {
      return NextResponse.json({ ok: false, error: 'userId and newPassword are required' }, { status: 400 });
    }

    // Basic strength check (length)
    if (newPassword.length < 8) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.collection('users').createIndex({ userId: 1 }, { unique: true });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const res = await db.collection('users').updateOne(
      { userId },
      { $set: { passwordHash, updatedAt: new Date() } }
    );

    if (res.matchedCount === 0) {
      return NextResponse.json({ ok: false, error: 'user not found' }, { status: 404 });
    }

    try {
      const ip = request.headers.get('x-forwarded-for') || request.ip || null;
      await logAudit({ actor: session.user?.userId || null, action: 'user:password:update', target: userId, details: {}, ip });
    } catch {}

    return NextResponse.json({ ok: true, userId });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to update password' }, { status: 500 });
  }
}
