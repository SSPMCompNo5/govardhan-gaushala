import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Goshala Manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const inv = db.collection('foodInventory');
    const logs = db.collection('feedingLogs');
    const sups = db.collection('foodSuppliers');

    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const [stockAgg, todayConsumption, suppliersCount, expiringSoon] = await Promise.all([
      inv.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray(),
      logs.aggregate([
        { $match: { feedingTime: { $gte: dayStart } } },
        { $group: { _id: null, totalQty: { $sum: '$quantity' } } }
      ]).toArray(),
      sups.countDocuments({ isActive: true }),
      inv.find({ expiryDate: { $ne: null, $lte: new Date(Date.now() + 7*24*60*60*1000) } }).project({ name: 1, expiryDate: 1 }).limit(10).toArray()
    ]);

    const stock = {
      healthy: stockAgg.find(x => x._id === 'healthy')?.count || 0,
      low: stockAgg.find(x => x._id === 'low')?.count || 0,
      critical: stockAgg.find(x => x._id === 'critical')?.count || 0,
    };
    const consumptionToday = todayConsumption[0]?.totalQty || 0;

    return NextResponse.json({ stock, consumptionToday, activeSuppliers: suppliersCount, expiringSoon });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


