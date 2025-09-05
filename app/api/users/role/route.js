import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongo';
import { logAudit } from '@/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// PATCH /api/users/role
// Body: { userId: string, role: string }
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Owner/Admin') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
    }
    const body = await request.json();
    const userId = String(body?.userId || '').trim();
    const role = String(body?.role || '').trim();
    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }
    const allowedRoles = new Set(['Owner/Admin', 'Watchman']);
    if (!allowedRoles.has(role)) {
      return NextResponse.json({ error: 'role not allowed' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.collection('users').createIndex({ userId: 1 }, { unique: true });

    const res = await db.collection('users').updateOne(
      { userId },
      { $set: { role } },
      { upsert: false }
    );

    if (res.matchedCount === 0) {
      return NextResponse.json({ error: 'user not found' }, { status: 404 });
    }

    // Best-effort audit log
    try {
      const ip = request.headers.get('x-forwarded-for') || request.ip || null;
      await logAudit({ actor: null, action: 'user:role:update', target: userId, details: { to: role }, ip });
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ ok: true, userId, role });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to update role' }, { status: 500 });
  }
}
