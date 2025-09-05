import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Goshala Manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM
    const now = new Date();
    const y = month ? parseInt(month.split('-')[0]) : now.getFullYear();
    const m = month ? parseInt(month.split('-')[1]) : (now.getMonth()+1);
    const start = new Date(y, m-1, 1);
    const end = new Date(y, m, 1);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const [expAgg, donAgg, donors] = await Promise.all([
      db.collection('expenses').aggregate([
        { $match: { date: { $gte: start, $lt: end } } },
        { $group: { _id: '$category', amount: { $sum: '$amount' } } }
      ]).toArray(),
      db.collection('donations').aggregate([
        { $match: { date: { $gte: start, $lt: end } } },
        { $group: { _id: null, amount: { $sum: '$amount' } } }
      ]).toArray(),
      db.collection('donations').aggregate([
        { $match: { date: { $gte: start, $lt: end } } },
        { $group: { _id: '$donorName', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: 5 }
      ]).toArray()
    ]);

    const expensesByCategory = Object.fromEntries(expAgg.map(e => [e._id, e.amount]));
    const totalExpenses = Object.values(expensesByCategory).reduce((a,b)=>a+b,0);
    const totalDonations = donAgg[0]?.amount || 0;
    const balance = totalDonations - totalExpenses;

    return NextResponse.json({ month: `${y}-${String(m).padStart(2,'0')}`, expensesByCategory, totalExpenses, totalDonations, balance, topDonors: donors });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


