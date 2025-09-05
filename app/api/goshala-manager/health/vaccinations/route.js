import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { VaccinationSchema } from '@/lib/schemas';
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
    const upcomingOnly = (searchParams.get('upcoming') || '') === 'true';
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection('vaccinations');
    const now = new Date();
    const filter = upcomingOnly ? { scheduledAt: { $gte: now } } : {};
    const rows = await col.find(filter).sort({ scheduledAt: 1 }).limit(200).toArray();
    return NextResponse.json({ vaccinations: rows });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['Goshala Manager','Admin','Owner/Admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    const raw = await request.json();
    const parsed = VaccinationSchema.safeParse({ ...raw, scheduledAt: raw.scheduledAt ? new Date(raw.scheduledAt) : undefined, doneAt: raw.doneAt ? new Date(raw.doneAt) : undefined });
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.collection('vaccinations').insertOne({ ...parsed.data, createdAt: new Date(), updatedAt: new Date() });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


