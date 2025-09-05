import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongo';
import { ensureIndexes } from '@/lib/indexes';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// GET /api/users?q=<search>&limit=50
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Owner/Admin') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const sortByRaw = (searchParams.get('sortBy') || 'createdAt');
    const sortDirRaw = (searchParams.get('sortDir') || 'desc');
    const allowedSort = new Set(['createdAt', 'userId', 'role']);
    const sortBy = allowedSort.has(sortByRaw) ? sortByRaw : 'createdAt';
    const sortDir = sortDirRaw === 'asc' ? 1 : -1;

    await ensureIndexes();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const users = db.collection('users');

    const filter = q
      ? { $or: [
          { userId: { $regex: q, $options: 'i' } },
          { role: { $regex: q, $options: 'i' } },
        ] }
      : {};

    const data = await users
      .find(filter, { projection: { passwordHash: 0 } })
      .sort({ [sortBy]: sortDir })
      .limit(limit)
      .toArray();

    return NextResponse.json({ ok: true, users: data });
  } catch (e) {
    console.error('GET /api/users error', e);
    return NextResponse.json({ ok: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}
