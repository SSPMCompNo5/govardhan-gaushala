import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { DoctorMedicineWastageSchema } from '@/lib/schemas';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limitWrite = rateLimit({ windowMs: 60 * 1000, max: 20 });

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Doctor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    const raw = await request.json();
    const parsed = DoctorMedicineWastageSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const batches = db.collection('doctor_medicine_batches');
    const wastage = db.collection('doctor_medicine_wastage');

    const b = await batches.findOne({ medId: parsed.data.medId, batchCode: parsed.data.batchCode });
    if (!b || b.qty < parsed.data.qty) return NextResponse.json({ error: 'Insufficient batch qty' }, { status: 400 });
    await batches.updateOne({ medId: parsed.data.medId, batchCode: parsed.data.batchCode }, { $inc: { qty: -parsed.data.qty }, $set: { updatedAt: new Date() } });
    await wastage.insertOne({ at: new Date(), ...parsed.data, byUser: session.user.userId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


