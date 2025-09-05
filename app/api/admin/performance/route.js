import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import os from 'os';

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
    const { filters } = body || {};

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Real-time aggregates if present; otherwise return empty arrays (no mock constants)
    // 1) Request performance from optional 'request_metrics' collection
    let performance = [];
    try {
      const since = new Date(Date.now() - 60 * 60 * 1000); // last 60 minutes
      performance = await db.collection('request_metrics')
        .aggregate([
          { $match: { ts: { $gte: since } } },
          { $group: {
              _id: { endpoint: '$endpoint', method: '$method' },
              count: { $sum: 1 },
              avgResponseTime: { $avg: '$durationMs' },
              errors: { $sum: { $cond: [ { $gte: ['$status', 400] }, 1, 0 ] } }
          } },
          { $addFields: { errorRate: { $multiply: [ { $cond: [ { $gt: ['$count', 0] }, { $divide: ['$errors', '$count'] }, 0 ] }, 100 ] } } },
          { $sort: { count: -1 } },
          { $limit: 50 }
        ]).toArray();
    } catch {}

    // 2) Recent errors from optional 'audit_logs'
    let errors = [];
    try {
      const sinceErr = new Date(Date.now() - 24 * 60 * 60 * 1000);
      errors = await db.collection('audit_logs')
        .aggregate([
          { $match: { timestamp: { $gte: sinceErr }, severity: 'error' } },
          { $group: {
              _id: { statusCode: '$metadata.statusCode', endpoint: '$metadata.endpoint' },
              count: { $sum: 1 },
              avgResponseTime: { $avg: '$metadata.durationMs' },
              lastOccurrence: { $max: '$timestamp' }
          } },
          { $sort: { count: -1 } },
          { $limit: 50 }
        ]).toArray();
    } catch {}

    // 3) System health from live process/OS
    const mem = process.memoryUsage?.();
    const rssMb = mem ? Math.round((mem.rss / 1024 / 1024) * 10) / 10 : null;
    const heapMb = mem ? Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10 : null;
    const load = os.loadavg?.() || [];
    const cpuLoad = load[0] || 0; // may be 0 on Windows

    const systemHealth = [{
      avgUptime: Math.floor(process.uptime?.() || 0),
      avgMemoryUsage: rssMb ?? 0,
      avgCpuUsage: Math.round(cpuLoad * 100) / 100,
      avgDatabaseConnections: 0,
      avgCacheHitRate: 0,
      heapUsedMb: heapMb ?? 0
    }];

    return NextResponse.json({ success: true, data: { performance, errors, systemHealth } });
  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
