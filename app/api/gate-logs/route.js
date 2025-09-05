import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { ensureIndexes } from '@/lib/indexes';
import { logAudit } from '@/lib/audit';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

function allowRole() {
  return true; // allow any authenticated user
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function makeRegexOrError(pattern, flags = 'i') {
  const str = String(pattern || '');
  if (!str) return null;
  if (str.length > 200) {
    throw new Error('regex too long');
  }
  try {
    return new RegExp(str, flags);
  } catch (e) {
    throw new Error('invalid regex');
  }
}

// GET /api/gate-logs?type=entry|exit|incident&actor=&since=&until=&name=&phone=&plate=&note=&q=&page=1&pageSize=20
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = session.user?.role;
    if (!allowRole(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await ensureIndexes();
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get('type') || '').trim();
    const actor = (searchParams.get('actor') || '').trim();
    const since = searchParams.get('since');
    const until = searchParams.get('until');
    const name = (searchParams.get('name') || '').trim();
    const phone = (searchParams.get('phone') || '').trim();
    const plateQ = (searchParams.get('plate') || '').trim();
    const noteQ = (searchParams.get('note') || '').trim();
    const q = (searchParams.get('q') || '').trim();
    const addressQ = (searchParams.get('address') || '').trim();
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '20', 10), 1), 200);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const filter = {};
    const and = [];
    if (type) and.push({ type });
    if (actor) and.push({ actor });
    // Parse yyyy-mm-dd safely; ignore invalid
    function parseYmd(s) {
      if (!s) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return null;
      const d = new Date(`${s}T00:00:00Z`);
      return Number.isFinite(d.getTime()) ? d : null;
    }
    const from = parseYmd(since);
    const to = parseYmd(until);
    if (from && to && from > to) {
      return NextResponse.json({ error: 'Invalid date range: since cannot be after until' }, { status: 400 });
    }
    if (from || to) {
      const range = {};
      if (from) range.$gte = from;
      if (to) {
        // make 'until' inclusive by moving to end of day UTC
        const end = new Date(to);
        end.setUTCHours(23, 59, 59, 999);
        range.$lte = end;
      }
      and.push({ at: range });
    }
    if (name) and.push({ visitorName: { $regex: escapeRegex(name), $options: 'i' } });
    try {
      if (phone) and.push({ visitorPhone: { $regex: makeRegexOrError(phone) } });
      if (plateQ) and.push({ plate: { $regex: makeRegexOrError(plateQ) } });
    } catch (e) {
      return NextResponse.json({ error: e?.message || 'invalid regex' }, { status: 400 });
    }
    if (addressQ) and.push({ visitorAddress: { $regex: escapeRegex(addressQ), $options: 'i' } });
    if (noteQ) and.push({ note: { $regex: escapeRegex(noteQ), $options: 'i' } });
    if (q) {
      const rx = { $regex: escapeRegex(q), $options: 'i' };
      and.push({ $or: [
        { visitorName: rx },
        { visitorPhone: rx },
        { visitorAddress: rx },
        { plate: rx },
        { note: rx },
      ]});
    }
    if (and.length) filter.$and = and;

    const coll = db.collection('gate_logs');
    const cursor = coll.find(filter).sort({ at: -1 }).skip((page - 1) * pageSize).limit(pageSize + 1);
    const docs = await cursor.toArray();
    const hasMore = docs.length > pageSize;
    const rawLogs = hasMore ? docs.slice(0, pageSize) : docs;
    const logs = rawLogs.map(d => ({
      ...d,
      id: d._id?.toString?.() || String(d._id),
      _id: undefined,
    }));

    return NextResponse.json({ logs, page, pageSize, hasMore });
  } catch (e) {
    console.error('GET /api/gate-logs error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

// POST /api/gate-logs { type: 'entry'|'exit'|'incident', note?, visitorName?, visitorPhone?, groupSize?, plate? }
export async function POST(req) {
  try {
    // Enforce CSRF BEFORE auth/rate-limit to ensure 403 semantics for CSRF tests
    if (!validateCSRFFromRequest(req)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = session.user?.role;
    if (!allowRole(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await ensureIndexes();
    const body = await req.json().catch(() => ({}));
    const type = String(body.type || '').toLowerCase();
    if (!['entry', 'exit', 'incident'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    // Basic required fields
    if (!body.visitorName || String(body.visitorName).trim().length === 0) {
      return NextResponse.json({ error: 'visitorName is required' }, { status: 400 });
    }

    // Rate limit POSTs (after CSRF/auth and validation, so invalid payloads return 400 not 429)
    const k = rateLimitKeyFromRequest(req, session.user?.userId);
    const limiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
    const resLimit = await limiter(k);
    if (resLimit.limited) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    const now = new Date();
    // Basic normalization and validation
    const groupSizeRaw = body.groupSize;
    const groupSize = Number.isFinite(groupSizeRaw) ? Math.max(1, Math.floor(groupSizeRaw)) : (typeof groupSizeRaw === 'string' && groupSizeRaw.trim() ? Math.max(1, Math.floor(Number(groupSizeRaw))) : undefined);

    // Validate regex fields if provided
    try {
      if (body.visitorPhone) makeRegexOrError(String(body.visitorPhone));
      if (body.plate) makeRegexOrError(String(body.plate));
    } catch (e) {
      return NextResponse.json({ error: e?.message || 'invalid regex' }, { status: 400 });
    }

    const doc = {
      type,
      note: body.note ? String(body.note) : undefined,
      visitorName: body.visitorName ? String(body.visitorName) : undefined,
      visitorPhone: body.visitorPhone ? String(body.visitorPhone) : undefined,
      visitorAddress: body.visitorAddress ? String(body.visitorAddress) : undefined,
      groupSize,
      plate: body.plate ? String(body.plate) : undefined,
      actor: session.user?.userId || 'unknown',
      at: now,
      createdAt: now,
      updatedAt: now,
    };

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const insertRes = await db.collection('gate_logs').insertOne(doc);
    const id = insertRes.insertedId?.toString?.() || String(insertRes.insertedId);
    // audit log
    await logAudit({
      actor: session.user?.userId || 'unknown',
      action: 'gate_log:create',
      target: null,
      details: { type: doc.type, visitorName: doc.visitorName || null, plate: doc.plate || null, visitorPhone: doc.visitorPhone || null, visitorAddress: doc.visitorAddress || null, groupSize: doc.groupSize || null },
    });

    return NextResponse.json({ ok: true, id, created: { ...doc, id } });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

export async function PUT() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
