import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getFeedingLogsCollection } from '@/lib/models/foodInventory';
import { FeedingLogSchema } from '@/lib/schemas';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limitBulk = rateLimit({ windowMs: 60 * 1000, max: 10 });

// POST /api/food/feeding-logs/bulk - bulk create
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitBulk(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });

    const body = await request.json();
    if (!Array.isArray(body)) return NextResponse.json({ error: 'Expected an array of logs' }, { status: 400 });

    const collection = await getFeedingLogsCollection();
    const docs = [];
    for (const raw of body) {
      const parsed = FeedingLogSchema.safeParse(raw);
      if (!parsed.success) continue;
      const item = parsed.data;
      docs.push({ ...item, feedingTime: item.feedingTime ? new Date(item.feedingTime) : new Date(), wastage: item.wastage || 0, recordedBy: session.user.userId, createdAt: new Date() });
    }
    if (!docs.length) return NextResponse.json({ error: 'No valid rows' }, { status: 400 });
    const result = await collection.insertMany(docs, { ordered: false });
    return NextResponse.json({ ok: true, inserted: result.insertedCount });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Bulk operation failed' }, { status: 500 });
  }
}


