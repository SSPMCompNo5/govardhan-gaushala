import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { DoctorMedicineSchema } from '@/lib/schemas';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limitWrite = rateLimit({ windowMs: 60 * 1000, max: 20 });

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['Doctor','Admin','Owner/Admin'].includes(session.user?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const lowOnly = (searchParams.get('lowStockOnly') || '') === 'true';
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const meds = db.collection('doctor_medicines');
    const batches = db.collection('doctor_medicine_batches');

    const filter = {};
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };
    let rows = await meds.find(filter).sort({ name: 1 }).limit(500).toArray();
    // Compute current stock from batches
    const ids = rows.map(r => r._id);
    const agg = await batches.aggregate([
      { $match: { medId: { $in: ids.map(id => id.toString()) } } },
      { $group: { _id: '$medId', qty: { $sum: '$qty' } } }
    ]).toArray();
    const byId = Object.fromEntries(agg.map(a => [a._id, a.qty]));
    rows = rows.map(r => ({ ...r, stockQty: byId[r._id.toString()] || 0 }));
    if (lowOnly) rows = rows.filter(r => (r.stockQty || 0) < (r.minStock || 0));
    return NextResponse.json({ medicines: rows });
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
    const parsed = DoctorMedicineSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const meds = db.collection('doctor_medicines');
    const exists = await meds.findOne({ name: parsed.data.name });
    if (exists) return NextResponse.json({ error: 'Medicine already exists' }, { status: 409 });
    const res = await meds.insertOne({ ...parsed.data, createdAt: new Date(), updatedAt: new Date() });
    return NextResponse.json({ ok: true, id: res.insertedId }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


