import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limit = rateLimit({ windowMs: 60 * 1000, max: 2 });

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Goshala Manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limit(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const vaccinations = db.collection('vaccinations');
    const treatments = db.collection('treatments');
    const medicines = db.collection('medicines');

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24*60*60*1000);
    const nextWeek = new Date(now.getTime() + 7*24*60*60*1000);

    const vacc = [
      { tagId: 'RFID-001', vaccine: 'FMD', scheduledAt: nextWeek, vet: 'Dr. Sharma' },
      { tagId: 'RFID-002', vaccine: 'HS', scheduledAt: tomorrow, vet: 'Dr. Sharma' }
    ];
    const treat = [
      { tagId: 'RFID-005', diagnosis: 'Fever', startedAt: now, vet: 'Dr. Patel', status: 'active', medicine: 'Antipyretic' }
    ];
    const meds = [
      { name: 'Antibiotic A', quantity: 20, unit: 'bottles', expiryDate: new Date(now.getTime() + 90*24*60*60*1000) },
      { name: 'Vitamin Mix', quantity: 50, unit: 'packs', expiryDate: new Date(now.getTime() + 180*24*60*60*1000) }
    ];

    await Promise.all(vacc.map(v => vaccinations.insertOne({ ...v, createdAt: new Date(), updatedAt: new Date() })));
    await Promise.all(treat.map(t => treatments.insertOne({ ...t, createdAt: new Date(), updatedAt: new Date() })));
    await Promise.all(meds.map(m => medicines.updateOne({ name: m.name }, { $set: { ...m, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true })));

    return NextResponse.json({ ok: true, inserted: { vaccinations: vacc.length, treatments: treat.length, medicines: meds.length } });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Seed failed' }, { status: 500 });
  }
}


