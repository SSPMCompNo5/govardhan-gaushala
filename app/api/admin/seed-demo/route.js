import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { 
  getInventoryCollection,
  getFeedingLogsCollection,
  getSuppliersCollection,
  getFeedingScheduleCollection
} from '@/lib/models/foodInventory';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limit = rateLimit({ windowMs: 60 * 1000, max: 2 });

// POST /api/admin/seed-demo → Insert demo data for food management
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Owner/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const key = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limit(key);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (!validateCSRFFromRequest(request)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const inv = await getInventoryCollection();
    const logs = await getFeedingLogsCollection();
    const sups = await getSuppliersCollection();
    const sch = await getFeedingScheduleCollection();

    const now = new Date();
    const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // Suppliers (idempotent by name)
    const suppliers = [
      { name: 'Shri Feeds Co.', contact: '9876543210', isActive: true },
      { name: 'Gau Mata Suppliers', contact: '9876501234', isActive: true },
      { name: 'Village Grain Mart', contact: '9876505678', isActive: false }
    ];
    await Promise.all(suppliers.map(s => sups.updateOne(
      { name: s.name },
      { $set: { ...s, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    )));

    // Inventory (idempotent by name)
    const inventory = [
      { name: 'Wheat Bran', type: 'grain', quantity: 120, unit: 'kg', supplier: 'Shri Feeds Co.', notes: 'High fiber', expiryDate: null, status: 'healthy' },
      { name: 'Dry Fodder', type: 'fodder', quantity: 40, unit: 'kg', supplier: 'Gau Mata Suppliers', notes: '', expiryDate: null, status: 'low' },
      { name: 'Green Grass', type: 'green', quantity: 10, unit: 'kg', supplier: 'Village Grain Mart', notes: 'Perishable', expiryDate: now, status: 'critical' },
      { name: 'Mineral Mix', type: 'supplement', quantity: 25, unit: 'kg', supplier: 'Shri Feeds Co.', notes: '', expiryDate: null, status: 'healthy' }
    ];
    await Promise.all(inventory.map(i => inv.updateOne(
      { name: i.name },
      { $set: { ...i, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    )));

    // Feeding schedules (idempotent on time+cowGroup+foodType)
    const schedules = [
      { time: '07:00', cowGroup: 'cows', foodType: 'fodder', quantity: 30, unit: 'kg', daysOfWeek: [0,1,2,3,4,5,6], isActive: true },
      { time: '12:00', cowGroup: 'calves', foodType: 'supplement', quantity: 5, unit: 'kg', daysOfWeek: [1,3,5], isActive: true },
      { time: '17:00', cowGroup: 'bulls', foodType: 'grain', quantity: 20, unit: 'kg', daysOfWeek: [0,2,4,6], isActive: true }
    ];
    await Promise.all(schedules.map(s => sch.updateOne(
      { time: s.time, cowGroup: s.cowGroup, foodType: s.foodType },
      { $set: { ...s, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    )));

    // Recent feeding logs (non-idempotent, but keep small)
    const recentLogs = [
      { cowGroup: 'cows', foodType: 'fodder', quantity: 12, unit: 'kg', notes: 'Morning feed', feedingTime: new Date(todayStr) },
      { cowGroup: 'calves', foodType: 'supplement', quantity: 3, unit: 'kg', notes: 'Vitamin mix', feedingTime: new Date(new Date(todayStr).getTime() + 2*60*60*1000) },
      { cowGroup: 'bulls', foodType: 'grain', quantity: 8, unit: 'kg', notes: '', feedingTime: new Date(new Date(todayStr).getTime() + 6*60*60*1000) }
    ];
    await logs.insertMany(recentLogs.map(l => ({ ...l, createdAt: new Date(), updatedAt: new Date() })), { ordered: false }).catch(() => {});

    return NextResponse.json({ ok: true, inserted: { suppliers: suppliers.length, inventory: inventory.length, schedules: schedules.length, feedingLogs: recentLogs.length } });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Seed failed' }, { status: 500 });
  }
}


