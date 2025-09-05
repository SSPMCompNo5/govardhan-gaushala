import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limitWrite = rateLimit({ windowMs: 60 * 1000, max: 30 });

function allow(role) {
  return ['Goshala Manager', 'Admin', 'Owner/Admin'].includes(role);
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || !allow(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection('staff_shifts');
    const [total, rows] = await Promise.all([
      col.countDocuments({}),
      col.find({}).sort({ start: 1 }).skip(skip).limit(limit).toArray()
    ]);
    return NextResponse.json({ shifts: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
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
    const payload = {
      title: String(body.title || ''),
      staffIds: Array.isArray(body.staffIds) ? body.staffIds : [],
      start: body.start ? new Date(body.start) : null,
      end: body.end ? new Date(body.end) : null,
      location: body.location ? String(body.location) : '',
      notes: body.notes ? String(body.notes) : '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (!payload.title || !payload.start || !payload.end) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const res = await db.collection('staff_shifts').insertOne(payload);
    return NextResponse.json({ ok: true, id: res.insertedId }, { status: 201 });
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
    if (rest.start) rest.start = new Date(rest.start);
    if (rest.end) rest.end = new Date(rest.end);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const { ObjectId } = await import('mongodb');
    const res = await db.collection('staff_shifts').updateOne({ _id: new ObjectId(id) }, { $set: { ...rest, updatedAt: new Date() } });
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
    const res = await db.collection('staff_shifts').deleteOne({ _id: new ObjectId(id) });
    if (!res.deletedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

