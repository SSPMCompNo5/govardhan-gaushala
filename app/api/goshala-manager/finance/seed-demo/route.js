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
    if (!session || session.user?.role !== 'Goshala Manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limit(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const sampleDates = [1,5,10,15,20,25].map(d => new Date(y, m, d));

    const expenses = [
      { date: sampleDates[1], category: 'fodder', amount: 12000, notes: 'Grass & bran' },
      { date: sampleDates[2], category: 'medicine', amount: 3500, notes: 'Vet supplies' },
      { date: sampleDates[3], category: 'staff', amount: 50000, notes: 'Monthly salaries' },
      { date: sampleDates[4], category: 'utilities', amount: 8000, notes: 'Electricity & water' },
      { date: sampleDates[5], category: 'maintenance', amount: 6000, notes: 'Shed repairs' }
    ];
    const donations = [
      { date: sampleDates[0], donorName: 'Ramesh Kumar', donorEmail: 'ramesh@example.com', amount: 20000, cowTagId: 'RFID-001' },
      { date: sampleDates[3], donorName: 'Seva Trust', donorEmail: 'contact@seva.org', amount: 40000 },
      { date: sampleDates[4], donorName: 'Anita Shah', donorEmail: 'anita@example.com', amount: 10000, cowTagId: 'RFID-002' }
    ];

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.collection('expenses').insertMany(expenses.map(e => ({ ...e, createdAt: new Date(), updatedAt: new Date() })));
    await db.collection('donations').insertMany(donations.map(d => ({ ...d, createdAt: new Date(), updatedAt: new Date() })));

    return NextResponse.json({ ok: true, inserted: { expenses: expenses.length, donations: donations.length } });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Seed failed' }, { status: 500 });
  }
}


