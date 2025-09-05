import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { logAudit } from '@/lib/audit';

// PATCH /api/users/rename
// Body: { userId: string, newUserId: string }
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Owner/Admin') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = String(body?.userId || '').trim();
    const newUserId = String(body?.newUserId || '').trim();
    if (!userId || !newUserId) {
      return NextResponse.json({ ok: false, error: 'userId and newUserId are required' }, { status: 400 });
    }
    if (newUserId.length < 3) {
      return NextResponse.json({ ok: false, error: 'newUserId must be at least 3 characters' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const users = db.collection('users');
    await users.createIndex({ userId: 1 }, { unique: true });

    // Ensure existing user
    const existing = await users.findOne({ userId });
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'user not found' }, { status: 404 });
    }

    // Ensure target does not exist
    const conflict = await users.findOne({ userId: newUserId });
    if (conflict) {
      return NextResponse.json({ ok: false, error: 'newUserId already exists' }, { status: 409 });
    }

    // Update document userId
    const res = await users.updateOne(
      { _id: existing._id },
      { $set: { userId: newUserId, updatedAt: new Date() } }
    );

    if (res.matchedCount === 0) {
      return NextResponse.json({ ok: false, error: 'failed to update user' }, { status: 500 });
    }

    try {
      const ip = request.headers.get('x-forwarded-for') || request.ip || null;
      await logAudit({ actor: session.user?.userId || null, action: 'user:id:rename', target: userId, details: { to: newUserId }, ip });
    } catch {}

    return NextResponse.json({ ok: true, userId: newUserId });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to rename user' }, { status: 500 });
  }
}
