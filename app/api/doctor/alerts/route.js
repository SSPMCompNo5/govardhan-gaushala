import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Doctor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'open';
    const limit = parseInt(searchParams.get('limit') || '50');

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const alertsCol = db.collection('alerts');

    const filter = { forRole: 'Doctor' };
    if (status !== 'all') filter.status = status;

    const alerts = await alertsCol
      .find(filter)
      .sort({ at: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ alerts });
  } catch (e) {
    console.error('Doctor alerts error:', e);
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Doctor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, status, notes } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Alert ID and status required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const alertsCol = db.collection('alerts');

    const { ObjectId } = await import('mongodb');
    const result = await alertsCol.updateOne(
      { _id: ObjectId.createFromHexString(id), forRole: 'Doctor' },
      { 
        $set: { 
          status, 
          updatedAt: new Date(),
          ...(notes && { resolutionNotes: notes })
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Doctor alert update error:', e);
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
