import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { getInventoryCollection, getFeedingLogsCollection, getSuppliersCollection } from '@/lib/models/foodInventory';
import { sendMail } from '@/lib/email';

// POST /api/admin/notify/daily-summary
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Owner/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_FROM;
    if (!to) return NextResponse.json({ error: 'No recipient configured' }, { status: 400 });

    const inv = await getInventoryCollection();
    const feed = await getFeedingLogsCollection();
    const sup = await getSuppliersCollection();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const gate = db.collection('gateLogs');

    const [totalItems, lowCount, todayFeedings, activeSuppliers, todayVisitors] = await Promise.all([
      inv.countDocuments({}),
      inv.countDocuments({ status: { $in: ['critical','low'] } }),
      feed.countDocuments({ feedingTime: { $gte: new Date(new Date().toDateString()) } }),
      sup.countDocuments({ isActive: true }),
      gate.countDocuments({ timestamp: { $gte: new Date(new Date().toDateString()) } })
    ]);

    const html = `
      <h3>Daily Summary</h3>
      <ul>
        <li>Total Inventory Items: ${totalItems}</li>
        <li>Low/Critical Items: ${lowCount}</li>
        <li>Today Feedings: ${todayFeedings}</li>
        <li>Active Suppliers: ${activeSuppliers}</li>
        <li>Today Visitors: ${todayVisitors}</li>
      </ul>
    `;
    const sent = await sendMail({ to, subject: 'Goshala: Daily Summary', html, text: html.replace(/<[^>]+>/g,'') });
    return NextResponse.json({ ok: !!sent, stats: { totalItems, lowCount, todayFeedings, activeSuppliers, todayVisitors } });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Notify failed' }, { status: 500 });
  }
}


