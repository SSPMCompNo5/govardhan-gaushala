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
    const status = searchParams.get('status'); // open/in-progress/done
    const assignee = searchParams.get('assignee');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection('staff_tasks');
    const query = {};
    if (status) query.status = status;
    if (assignee) query.assignee = assignee;
    const [total, rows] = await Promise.all([
      col.countDocuments(query),
      col.find(query).sort({ priority: -1, dueAt: 1 }).skip(skip).limit(limit).toArray()
    ]);
    return NextResponse.json({ tasks: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
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
    const doc = {
      title: String(body.title || ''),
      description: String(body.description || ''),
      assignee: String(body.assignee || ''),
      status: String(body.status || 'open'),
      priority: Number.isFinite(body.priority) ? body.priority : 0,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (!doc.title) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const res = await db.collection('staff_tasks').insertOne(doc);
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
    if (rest.dueAt) rest.dueAt = new Date(rest.dueAt);
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const { ObjectId } = await import('mongodb');
    const res = await db.collection('staff_tasks').updateOne({ _id: new ObjectId(id) }, { $set: { ...rest, updatedAt: new Date() } });
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
    const res = await db.collection('staff_tasks').deleteOne({ _id: new ObjectId(id) });
    if (!res.deletedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
