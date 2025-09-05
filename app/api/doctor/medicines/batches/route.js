import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { DoctorMedicineBatchSchema } from '@/lib/schemas';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limitWrite = rateLimit({ windowMs: 60 * 1000, max: 20 });

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Doctor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const medId = searchParams.get('medId');
    const expSoon = (searchParams.get('expiringSoon') || '') === 'true';
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection('doctor_medicine_batches');
    const filter = {};
    if (medId) filter.medId = medId;
    if (expSoon) filter.expiryDate = { $ne: null, $lte: new Date(Date.now() + 7*24*60*60*1000) };
    const rows = await col.find(filter).sort({ expiryDate: 1 }).limit(500).toArray();
    return NextResponse.json({ batches: rows });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Doctor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    const raw = await request.json();
    const parsed = DoctorMedicineBatchSchema.safeParse({
      ...raw,
      receivedAt: raw.receivedAt ? new Date(raw.receivedAt) : undefined,
      expiryDate: raw.expiryDate ? new Date(raw.expiryDate) : undefined,
    });
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const res = await db.collection('doctor_medicine_batches').updateOne(
      { medId: parsed.data.medId, batchCode: parsed.data.batchCode },
      { $set: { ...parsed.data, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    return NextResponse.json({ ok: true, upserted: !!res.upsertedId }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


