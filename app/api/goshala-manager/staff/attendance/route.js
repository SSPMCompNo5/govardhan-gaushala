import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limitWrite = rateLimit({ windowMs: 60 * 1000, max: 60 });

function allow(role) {
  return ['Goshala Manager', 'Admin', 'Owner/Admin'].includes(role);
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || !allow(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const staffId = searchParams.get('staffId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection('staff_attendance');
    const query = {};
    if (date) query.date = date; // yyyy-mm-dd
    if (staffId) query.staffId = staffId;
    const [total, rows] = await Promise.all([
      col.countDocuments(query),
      col.find(query).sort({ date: -1 }).skip(skip).limit(limit).toArray()
    ]);
    return NextResponse.json({ attendance: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || !allow(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const body = await request.json();
    const record = {
      staffId: String(body.staffId || ''),
      date: String(body.date || ''), // yyyy-mm-dd
      status: String(body.status || 'present'), // present/absent/late/leave
      checkInAt: body.checkInAt ? new Date(body.checkInAt) : null,
      checkOutAt: body.checkOutAt ? new Date(body.checkOutAt) : null,
      notes: body.notes ? String(body.notes) : '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (!record.staffId || !record.date) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.collection('staff_attendance').updateOne(
      { staffId: record.staffId, date: record.date },
      { $set: record },
      { upsert: true }
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || !allow(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const body = await request.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    if (rest.checkInAt) rest.checkInAt = new Date(rest.checkInAt);
    if (rest.checkOutAt) rest.checkOutAt = new Date(rest.checkOutAt);
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const { ObjectId } = await import('mongodb');
    const res = await db.collection('staff_attendance').updateOne({ _id: new ObjectId(id) }, { $set: { ...rest, updatedAt: new Date() } });
    if (!res.matchedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || !allow(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const { ObjectId } = await import('mongodb');
    const res = await db.collection('staff_attendance').deleteOne({ _id: new ObjectId(id) });
    if (!res.deletedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
