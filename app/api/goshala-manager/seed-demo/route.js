import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limit = rateLimit({ windowMs: 60 * 1000, max: 2 });

// POST /api/goshala-manager/seed-demo → Insert demo cows
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Goshala Manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limit(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const cows = db.collection('cows');

    const demo = [
      { tagId: 'RFID-001', name: 'Gauri', category: 'cow', status: 'milking', breed: 'Gir', dailyMilkYield: 8 },
      { tagId: 'RFID-002', name: 'Radha', category: 'cow', status: 'pregnant', breed: 'Sahiwal' },
      { tagId: 'RFID-003', name: 'Kanha', category: 'bull', status: 'normal', breed: 'Tharparkar' },
      { tagId: 'RFID-004', name: 'Chutki', category: 'calf', status: 'rescued', breed: 'Mixed' },
      { tagId: 'RFID-005', name: 'Shakti', category: 'cow', status: 'sick', breed: 'Gir', notes: 'Under treatment' }
    ];

    await Promise.all(demo.map(d => cows.updateOne(
      { tagId: d.tagId },
      { $set: { ...d, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    )));

    return NextResponse.json({ ok: true, inserted: demo.length });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Seed failed' }, { status: 500 });
  }
}


