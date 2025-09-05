import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { TreatmentSchema } from '@/lib/schemas';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limitWrite = rateLimit({ windowMs: 60 * 1000, max: 20 });

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || !['Goshala Manager','Doctor','Admin','Owner/Admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const onlyActive = (searchParams.get('active') || '') === 'true';
    const tagId = (searchParams.get('tagId') || '').trim();
    const category = (searchParams.get('category') || '').trim();
    const medicine = (searchParams.get('medicine') || '').trim();
    const dateFrom = (searchParams.get('dateFrom') || '').trim();
    const dateTo = (searchParams.get('dateTo') || '').trim();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection('treatments');
    const filter = {};
    if (onlyActive) filter.status = 'active';
    if (tagId) filter.tagId = { $regex: tagId, $options: 'i' };
    if (category) filter.illnessCategory = category;
    if (medicine) filter.medicine = { $regex: medicine, $options: 'i' };
    if (dateFrom || dateTo) {
      filter.startedAt = {};
      if (dateFrom) filter.startedAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        filter.startedAt.$lte = to;
      }
      if (!Object.keys(filter.startedAt).length) delete filter.startedAt;
    }
    const rows = await col.find(filter).sort({ startedAt: -1 }).limit(200).toArray();
    return NextResponse.json({ treatments: rows });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || !['Goshala Manager','Doctor','Admin','Owner/Admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    const raw = await request.json();
    const parsed = TreatmentSchema.safeParse({
      ...raw,
      startedAt: raw.startedAt ? new Date(raw.startedAt) : undefined,
      endedAt: raw.endedAt ? new Date(raw.endedAt) : undefined,
      followUps: Array.isArray(raw.followUps) ? raw.followUps.map(f=>({ ...f, when: f.when ? new Date(f.when) : undefined })) : undefined,
    });
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.collection('treatments').insertOne({ ...parsed.data, createdAt: new Date(), updatedAt: new Date() });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || !['Goshala Manager','Doctor','Admin','Owner/Admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    const body = await request.json();
    const { id, followUp, ...updateData } = body || {};
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const parsedUpdate = TreatmentSchema.partial().safeParse({
      ...updateData,
      startedAt: updateData?.startedAt ? new Date(updateData.startedAt) : undefined,
      endedAt: updateData?.endedAt ? new Date(updateData.endedAt) : undefined,
    });
    if (!parsedUpdate.success) return NextResponse.json({ error: 'Validation failed', details: parsedUpdate.error.flatten() }, { status: 400 });
    const { ObjectId } = await import('mongodb');
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection('treatments');
    const ops = [];
    if (Object.keys(parsedUpdate.data || {}).length) {
      ops.push(col.updateOne({ _id: new ObjectId(id) }, { $set: { ...parsedUpdate.data, updatedAt: new Date() } }));
    }
    if (followUp && (followUp.when || followUp.notes)) {
      const fu = { when: followUp.when ? new Date(followUp.when) : new Date(), notes: followUp.notes || '', status: 'scheduled' };
      ops.push(col.updateOne({ _id: new ObjectId(id) }, { $push: { followUps: fu } }));
    }
    const results = await Promise.all(ops.length ? ops : [Promise.resolve({ matchedCount: 1 })]);
    const matched = results.find(r => typeof r.matchedCount === 'number')?.matchedCount || 1;
    if (!matched) return NextResponse.json({ error: 'Treatment not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


