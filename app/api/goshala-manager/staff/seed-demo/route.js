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
    const attendance = [
      { date: today, staffId: 'watchman1', name: 'Suresh', role: 'Watchman', status: 'present', checkIn: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 0) },
      { date: today, staffId: 'food1', name: 'Mahesh', role: 'Food Manager', status: 'present', checkIn: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0) },
      { date: today, staffId: 'care1', name: 'Ravi', role: 'Caretaker', status: 'leave' }
    ];
    const shifts = [
      { date: today, staffId: 'watchman1', name: 'Suresh', startTime: '07:00', endTime: '15:00' },
      { date: today, staffId: 'watchman2', name: 'Naresh', startTime: '15:00', endTime: '23:00' }
    ];
    const tasks = [
      { createdAt: today, title: 'Clean Shed A', description: 'Deep clean', assigneeId: 'care1', assigneeName: 'Ravi', status: 'open' },
      { createdAt: today, title: 'Check water supply', assigneeId: 'watchman1', assigneeName: 'Suresh', status: 'in_progress' }
    ];

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.collection('attendance').insertMany(attendance.map(x => ({ ...x, createdAt: new Date(), updatedAt: new Date() })));
    await db.collection('shifts').insertMany(shifts.map(x => ({ ...x, createdAt: new Date(), updatedAt: new Date() })));
    await db.collection('tasks').insertMany(tasks.map(x => ({ ...x, updatedAt: new Date() })));

    return NextResponse.json({ ok: true, inserted: { attendance: attendance.length, shifts: shifts.length, tasks: tasks.length } });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Seed failed' }, { status: 500 });
  }
}


