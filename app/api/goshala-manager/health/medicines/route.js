import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { MedicineSchema } from '@/lib/schemas';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limitWrite = rateLimit({ windowMs: 60 * 1000, max: 20 });

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Goshala Manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection('medicines');
    const rows = await col.find({}).sort({ expiryDate: 1 }).limit(200).toArray();
    return NextResponse.json({ medicines: rows });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Goshala Manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    const raw = await request.json();
    const parsed = MedicineSchema.safeParse({ ...raw, expiryDate: raw.expiryDate ? new Date(raw.expiryDate) : undefined });
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.collection('medicines').insertOne({ ...parsed.data, createdAt: new Date(), updatedAt: new Date() });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


