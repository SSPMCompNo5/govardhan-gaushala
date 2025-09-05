import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getInventoryCollection, getStockStatus } from '@/lib/models/foodInventory';
import { InventoryItemSchema } from '@/lib/schemas';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limitBulk = rateLimit({ windowMs: 60 * 1000, max: 10 });

// POST /api/food/inventory/bulk - bulk upsert (create/update by name)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitBulk(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });

    const body = await request.json();
    if (!Array.isArray(body)) return NextResponse.json({ error: 'Expected an array of items' }, { status: 400 });

    const collection = await getInventoryCollection();
    const ops = [];
    for (const raw of body) {
      const parsed = InventoryItemSchema.safeParse(raw);
      if (!parsed.success) continue; // skip invalid rows
      const item = parsed.data;
      const status = getStockStatus(item.type, item.quantity, item.unit);
      ops.push({ updateOne: { filter: { name: item.name }, update: { $set: { ...item, status, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, upsert: true } });
    }
    if (!ops.length) return NextResponse.json({ error: 'No valid rows' }, { status: 400 });
    const result = await collection.bulkWrite(ops, { ordered: false });
    return NextResponse.json({ ok: true, matched: result.matchedCount, upserted: result.upsertedCount, modified: result.modifiedCount });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Bulk operation failed' }, { status: 500 });
  }
}


