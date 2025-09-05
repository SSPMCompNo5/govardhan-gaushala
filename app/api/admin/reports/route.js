import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'Admin' && session.user.role !== 'Owner/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { filters, config } = body || {};

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const makeDate = (s) => (s ? new Date(s) : null);
    const from = makeDate(filters?.startDate);
    const to = makeDate(filters?.endDate);

    // Gate daily stats from gate_logs
    let gateDaily = [];
    let gateTotals = {};
    try {
      const match = {};
      if (from || to) {
        match.at = {};
        if (from) match.at.$gte = from;
        if (to) match.at.$lte = to;
      }
      gateDaily = await db.collection('gate_logs').aggregate([
        { $match: match },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$at' } },
          entries: { $sum: { $cond: [{ $eq: ['$type','entry'] }, 1, 0] } },
          exits: { $sum: { $cond: [{ $eq: ['$type','exit'] }, 1, 0] } },
          totalVisitors: { $sum: { $ifNull: ['$groupSize', 1] } }
        } },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      // Calculate totals from daily stats
      gateTotals = {
        totalEntries: gateDaily.reduce((sum, day) => sum + (day.entries || 0), 0),
        totalExits: gateDaily.reduce((sum, day) => sum + (day.exits || 0), 0),
        totalVisitors: gateDaily.reduce((sum, day) => sum + (day.totalVisitors || 0), 0),
        avgVisitorCount: gateDaily.length > 0 ? 
          gateDaily.reduce((sum, day) => sum + (day.totalVisitors || 0), 0) / gateDaily.length : 0
      };
    } catch (error) {
      console.error('Gate logs aggregation error:', error);
    }

    // Food inventory summary
    let foodInventory = [];
    try {
      const items = await db.collection('foodInventory').find({}).project({ status:1, value:1 }).toArray();
      const totalItems = items.length;
      const lowStockItems = items.filter(i => i.status === 'low').length;
      const expiredItems = items.filter(i => i.status === 'expired').length;
      const totalValue = items.reduce((s,i)=> s + (i.value || 0), 0);
      foodInventory = [{ totalItems, lowStockItems, expiredItems, totalValue }];
    } catch {}

    // Goshala cows summary
    let cowsSummary = [];
    try {
      const cows = await db.collection('cows').find({}).project({ health:1, pregnant:1 }).toArray();
      const totalCows = cows.length;
      const healthyCows = cows.filter(c => c.health === 'healthy').length;
      const sickCows = cows.filter(c => c.health === 'sick').length;
      const pregnantCows = cows.filter(c => c.pregnant === true).length;
      cowsSummary = [{ totalCows, healthyCows, sickCows, pregnantCows }];
    } catch {}

    // Doctor treatments summary
    let treatmentsSummary = [];
    try {
      const treatments = await db.collection('treatments').find({}).project({ status:1 }).toArray();
      const totalTreatments = treatments.length;
      const activeTreatments = treatments.filter(t => t.status === 'active').length;
      const completedTreatments = treatments.filter(t => t.status === 'completed').length;
      const pendingTreatments = treatments.filter(t => t.status === 'pending').length;
      treatmentsSummary = [{ totalTreatments, activeTreatments, completedTreatments, pendingTreatments }];
    } catch {}

    const reportData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        filters,
        config,
        version: '1.0.0'
      },
      gate: { 
        dailyStats: gateDaily,
        totals: gateTotals
      },
      food: { inventory: foodInventory },
      goshala: { cows: cowsSummary },
      doctor: { treatments: treatmentsSummary },
    };

    return NextResponse.json({ success: true, data: reportData });
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
