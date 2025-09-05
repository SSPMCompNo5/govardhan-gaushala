import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { AppointmentSchema } from '@/lib/schemas';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limitWrite = rateLimit({ windowMs: 60 * 1000, max: 20 });

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['Doctor','Admin','Owner/Admin'].includes(session.user?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const rows = await db.collection('appointments').find({}).sort({ when: 1 }).limit(200).toArray();
    return NextResponse.json({ appointments: rows });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['Doctor','Admin','Owner/Admin'].includes(session.user?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    const raw = await request.json();
    const parsed = AppointmentSchema.safeParse({ ...raw, when: raw.when ? new Date(raw.when) : undefined });
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.collection('appointments').insertOne({ ...parsed.data, createdAt: new Date(), updatedAt: new Date() });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


