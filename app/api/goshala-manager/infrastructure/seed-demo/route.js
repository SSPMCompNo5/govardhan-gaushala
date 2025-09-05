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

    const today = new Date();
    const checklists = [
      { date: today, area: 'shed', item: 'Cleaned', status: 'ok' },
      { date: today, area: 'water', item: 'Tanks filled', status: 'ok' },
      { date: today, area: 'electricity', item: 'Fans operational', status: 'issue', notes: 'Fan 3 not working' }
    ];
    const maintenance = [
      { date: today, component: 'Fence - north side', action: 'Repaired broken wire', cost: 1200 },
      { date: today, component: 'Water pump', action: 'Oil change', cost: 600 }
    ];
    const assets = [
      { type: 'vehicle', name: 'Tractor', identifier: 'TR-01', condition: 'needs_service' },
      { type: 'equipment', name: 'Chaff Cutter', identifier: 'EQ-07', condition: 'good' }
    ];

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.collection('checklists').insertMany(checklists.map(x => ({ ...x, createdAt: new Date(), updatedAt: new Date() })));
    await db.collection('maintenanceLogs').insertMany(maintenance.map(x => ({ ...x, createdAt: new Date(), updatedAt: new Date() })));
    await db.collection('assets').insertMany(assets.map(x => ({ ...x, createdAt: new Date(), updatedAt: new Date() })));

    return NextResponse.json({ ok: true, inserted: { checklists: checklists.length, maintenance: maintenance.length, assets: assets.length } });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Seed failed' }, { status: 500 });
  }
}


