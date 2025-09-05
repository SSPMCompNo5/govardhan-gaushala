import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { ChecklistItemSchema } from '@/lib/schemas';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limitWrite = rateLimit({ windowMs: 60 * 1000, max: 20 });

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Goshala Manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection('checklists');
    let filter = {};
    if (dateStr) {
      const [y,m,d] = dateStr.split('-').map(n=>parseInt(n));
      const start = new Date(y, m-1, d);
      const end = new Date(y, m-1, d+1);
      filter.date = { $gte: start, $lt: end };
    }
    const rows = await col.find(filter).sort({ area: 1, item: 1 }).limit(200).toArray();
    return NextResponse.json({ checklists: rows });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Goshala Manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    const raw = await request.json();
    const parsed = ChecklistItemSchema.safeParse({ ...raw, date: raw.date ? new Date(raw.date) : undefined });
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.collection('checklists').insertOne({ ...parsed.data, createdAt: new Date(), updatedAt: new Date() });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


