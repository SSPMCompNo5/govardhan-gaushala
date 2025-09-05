import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { DoctorMedicineUseSchema } from '@/lib/schemas';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limitWrite = rateLimit({ windowMs: 60 * 1000, max: 40 });

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Doctor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    const raw = await request.json();
    const parsed = DoctorMedicineUseSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const meds = db.collection('doctor_medicines');
    const batches = db.collection('doctor_medicine_batches');
    const usage = db.collection('doctor_medicine_usage');

    // FIFO by earliest expiry
    let remaining = parsed.data.qty;
    const medId = parsed.data.medId;
    const candidateBatches = await batches.find({ medId, qty: { $gt: 0 } }).sort({ expiryDate: 1 }).toArray();
    const updates = [];
    for (const b of candidateBatches) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, b.qty);
      updates.push({ batchCode: b.batchCode, delta: -take });
      remaining -= take;
    }
    if (remaining > 0) return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });

    // Apply deductions
    for (const u of updates) {
      await batches.updateOne({ medId, batchCode: u.batchCode }, { $inc: { qty: u.delta }, $set: { updatedAt: new Date() } });
      await usage.insertOne({ at: new Date(), tagId: parsed.data.tagId, treatmentId: parsed.data.treatmentId || null, medId, batchCode: u.batchCode, qty: -u.delta, unit: parsed.data.unit, byUser: session.user.userId });
    }

    // Low-stock alert
    const med = await meds.findOne({ _id: (await import('mongodb')).ObjectId.createFromHexString(medId) }).catch(()=>null);
    const agg = await batches.aggregate([{ $match: { medId } }, { $group: { _id: null, qty: { $sum: '$qty' } } }]).toArray();
    const totalQty = agg[0]?.qty || 0;
    if (med && typeof med.minStock === 'number' && totalQty < med.minStock) {
      await db.collection('alerts').insertOne({ type: 'lowStock', referenceIds: { medId }, forRole: 'Doctor', at: new Date(), status: 'open', notes: `Medicine ${med.name} low: ${totalQty} ${med.unit}` });
    }

    return NextResponse.json({ ok: true, remainingQty: totalQty });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


