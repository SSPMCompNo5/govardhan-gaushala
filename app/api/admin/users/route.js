import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limitWrite = rateLimit({ windowMs: 60 * 1000, max: 20 });

const CreateUserSchema = z.object({
  userId: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(['Owner/Admin', 'Watchman', 'Food Manager', 'Cow Manager', 'Goshala Manager', 'Doctor']),
});

const UpdateUserSchema = z.object({
  userId: z.string().min(3),
  password: z.string().min(6).optional(),
  role: z.enum(['Owner/Admin', 'Watchman', 'Food Manager', 'Cow Manager', 'Goshala Manager', 'Doctor']).optional(),
});

function requireAdmin(session) {
  return !!(session?.user?.role === 'Owner/Admin');
}

// GET /api/admin/users - list users (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !requireAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const users = await db.collection('users').find({}, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ users });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed to list users' }, { status: 500 });
  }
}

// POST /api/admin/users - create user (admin only)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !requireAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
    const raw = await request.json();
    const parsed = CreateUserSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }
    const { userId, password, role } = parsed.data;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const existing = await db.collection('users').findOne({ userId });
    if (existing) return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    const passwordHash = await bcrypt.hash(password, 10);
    await db.collection('users').insertOne({ userId, passwordHash, role, createdAt: new Date() });
    return NextResponse.json({ ok: true, userId, role }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed to create user' }, { status: 500 });
  }
}

// PATCH /api/admin/users - update user (reset password and/or role)
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !requireAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
    const raw = await request.json();
    const parsed = UpdateUserSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }
    const { userId, password, role } = parsed.data;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const update = { updatedAt: new Date() };
    if (typeof role !== 'undefined') update.role = role;
    if (password) update.passwordHash = await bcrypt.hash(password, 10);
    const result = await db.collection('users').updateOne({ userId }, { $set: update });
    if (!result.matchedCount) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ ok: true, userId, updated: Object.keys(update) });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed to update user' }, { status: 500 });
  }
}


