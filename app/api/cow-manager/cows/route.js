import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { CowSchema } from '@/lib/schemas';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limitWrite = rateLimit({ windowMs: 60 * 1000, max: 20 });

function canRead(role) {
  return ['Cow Manager','Goshala Manager','Doctor','Admin','Owner/Admin'].includes(role);
}

function canWrite(role) {
  return ['Cow Manager','Goshala Manager','Owner/Admin','Admin'].includes(role);
}

// GET /api/cow-manager/cows - list cows with filters
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || !canRead(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const Search = searchParams.get('search') || '';

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection('cows');

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (Search) filter.$or = [
      { tagId: { $regex: Search, $options: 'i' } },
      { name: { $regex: Search, $options: 'i' } },
      { breed: { $regex: Search, $options: 'i' } }
    ];

    const skip = (page - 1) * limit;
    const [total, cows] = await Promise.all([
      col.countDocuments(filter),
      col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray()
    ]);
    return NextResponse.json({ cows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

// POST /api/cow-manager/cows - create cow
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || !canWrite(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
    const raw = await request.json();
    const parsed = CowSchema.safeParse({
      ...raw,
      birthDate: raw.birthDate ? new Date(raw.birthDate) : undefined,
    });
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection('cows');
    const exists = await col.findOne({ tagId: parsed.data.tagId });
    if (exists) return NextResponse.json({ error: 'Cow already exists' }, { status: 409 });
    await col.insertOne({ ...parsed.data, createdAt: new Date(), updatedAt: new Date() });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

// PATCH /api/cow-manager/cows - update cow
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || !canWrite(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
    const raw = await request.json();
    const { tagId, ...rest } = raw || {};
    if (!tagId) return NextResponse.json({ error: 'tagId is required' }, { status: 400 });
    const parsed = CowSchema.partial().safeParse({ ...rest, birthDate: rest.birthDate ? new Date(rest.birthDate) : undefined });
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection('cows');
    const result = await col.updateOne({ tagId }, { $set: { ...parsed.data, updatedAt: new Date() } });
    if (!result.matchedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

// DELETE /api/cow-manager/cows?id=TAGID
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || !canWrite(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection('cows');
    const del = await col.deleteOne({ tagId: id });
    if (!del.deletedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


