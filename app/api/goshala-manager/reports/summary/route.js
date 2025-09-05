import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';

function rangeFor(period) {
  const now = new Date();
  if (period === 'daily') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { start, end };
  }
  if (period === 'weekly') {
    const day = now.getDay();
    const diff = (day + 6) % 7; // Monday start
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    return { start, end };
  }
  // monthly default
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Goshala Manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';
    const { start, end } = rangeFor(period);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const cowsCol = db.collection('cows');
    const invCol = db.collection('foodInventory');
    const feedCol = db.collection('feedingLogs');
    const vaccCol = db.collection('vaccinations');
    const treatCol = db.collection('treatments');
    const expCol = db.collection('expenses');
    const donCol = db.collection('donations');

    const [herdCounts, milkYield, consumption, lowStock, upcomingVacc, activeTreat, expenses, donations] = await Promise.all([
      cowsCol.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]).toArray(),
      cowsCol.aggregate([
        { $match: { dailyMilkYield: { $gte: 0 } } },
        { $group: { _id: null, total: { $sum: '$dailyMilkYield' } } }
      ]).toArray(),
      feedCol.aggregate([
        { $match: { feedingTime: { $gte: start, $lt: end } } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]).toArray(),
      invCol.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray(),
      vaccCol.find({ scheduledAt: { $gte: start, $lt: end } }).project({ tagId: 1, vaccine: 1, scheduledAt: 1 }).limit(20).toArray(),
      treatCol.find({ status: 'active' }).project({ tagId: 1, diagnosis: 1, startedAt: 1 }).limit(20).toArray(),
      expCol.aggregate([
        { $match: { date: { $gte: start, $lt: end } } },
        { $group: { _id: '$category', amount: { $sum: '$amount' } } }
      ]).toArray(),
      donCol.aggregate([
        { $match: { date: { $gte: start, $lt: end } } },
        { $group: { _id: null, amount: { $sum: '$amount' } } }
      ]).toArray(),
    ]);

    const herd = Object.fromEntries(herdCounts.map(x => [x._id, x.count]));
    const totalMilk = milkYield[0]?.total || 0;
    const totalConsumption = consumption[0]?.total || 0;
    const stock = {
      healthy: lowStock.find(x => x._id === 'healthy')?.count || 0,
      low: lowStock.find(x => x._id === 'low')?.count || 0,
      critical: lowStock.find(x => x._id === 'critical')?.count || 0,
    };
    const expensesByCategory = Object.fromEntries(expenses.map(e => [e._id, e.amount]));
    const totalExpenses = Object.values(expensesByCategory).reduce((a,b)=>a+b,0);
    const totalDonations = donations[0]?.amount || 0;

    return NextResponse.json({ period, range: { start, end }, herd, totalMilk, totalConsumption, stock, upcomingVacc, activeTreat, expensesByCategory, totalExpenses, totalDonations });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


