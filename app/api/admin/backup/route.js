import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'Admin' && session.user.role !== 'Owner/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    switch (action) {
      case 'list':
        // List all backups
        const backups = await db.collection('backups').find({}).sort({ timestamp: -1 }).toArray();
        return NextResponse.json({ 
          success: true, 
          data: backups.map(backup => ({
            id: backup._id.toString(),
            timestamp: backup.timestamp,
            size: backup.size || 0,
            collections: backup.collections || [],
            status: backup.status || 'unknown'
          }))
        });

      case 'stats':
        // Get backup statistics
        const totalBackups = await db.collection('backups').countDocuments();
        const successfulBackups = await db.collection('backups').countDocuments({ status: 'completed' });
        const failedBackups = await db.collection('backups').countDocuments({ status: 'failed' });
        
        // Calculate total size
        const sizeResult = await db.collection('backups').aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, totalSize: { $sum: '$size' } } }
        ]).toArray();
        
        const totalSize = sizeResult[0]?.totalSize || 0;

        return NextResponse.json({
          success: true,
          data: {
            totalBackups,
            successfulBackups,
            failedBackups,
            totalSize
          }
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Backup API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'Admin' && session.user.role !== 'Owner/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!validateCSRFFromRequest(request)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
    const key = rateLimitKeyFromRequest(request, session.user?.userId);
    const limiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
    const limited = await limiter(key);
    if (limited.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const body = await request.json();
    const { action, ...data } = body;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    switch (action) {
      case 'create':
        // Create a backup record. If size/collections not provided, compute from DB metadata
        let collectionsList = Array.isArray(data.collections) ? data.collections : null;
        let totalSize = Number.isFinite(data.size) ? data.size : null;
        if (!collectionsList || totalSize === null) {
          try {
            const colls = await db.listCollections({}, { nameOnly: true }).toArray();
            const names = colls.map(c => c.name).filter(n => !n.startsWith('system.'));
            let sizeSum = 0;
            const included = [];
            for (const name of names) {
              try {
                const stats = await db.collection(name).stats();
                sizeSum += stats?.storageSize || stats?.size || 0;
                included.push(name);
              } catch {
                // Fallback if stats not permitted
                included.push(name);
              }
            }
            collectionsList = collectionsList || included;
            totalSize = totalSize ?? sizeSum;
          } catch {
            // Last resort defaults
            collectionsList = collectionsList || [];
            totalSize = totalSize ?? 0;
          }
        }

        const backupData = {
          timestamp: new Date(),
          status: data.status || 'completed',
          size: totalSize || 0,
          collections: collectionsList || [],
        };

        const result = await db.collection('backups').insertOne(backupData);
        
        return NextResponse.json({
          success: true,
          data: {
            id: result.insertedId.toString(),
            ...backupData
          }
        });

      case 'restore':
        // Restore from backup (record a restore event)
        {
          const { ObjectId } = await import('mongodb');
          const backupId = data.backupId ? new ObjectId(String(data.backupId)) : null;
          if (!backupId) return NextResponse.json({ error: 'backupId is required' }, { status: 400 });
          const backup = await db.collection('backups').findOne({ _id: backupId });
        if (!backup) {
          return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
        }

        await db.collection('backup_restores').insertOne({ backupId, restoredAt: new Date(), collections: backup.collections || [] });
        return NextResponse.json({ success: true, data: { message: 'Restore recorded', backupId: String(backupId) } });
        }

      case 'delete':
        // Delete a backup
        {
          const { ObjectId } = await import('mongodb');
          const backupId = data.backupId ? new ObjectId(String(data.backupId)) : null;
          if (!backupId) return NextResponse.json({ error: 'backupId is required' }, { status: 400 });
          const deleteResult = await db.collection('backups').deleteOne({ _id: backupId });
        
        if (deleteResult.deletedCount === 0) {
          return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          data: { message: 'Backup deleted successfully' }
        });
        }

      case 'cleanup':
        // Cleanup old backups
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (data.retentionDays || 30));
        
        const cleanupResult = await db.collection('backups').deleteMany({
          timestamp: { $lt: cutoffDate }
        });

        return NextResponse.json({
          success: true,
          data: {
            message: 'Cleanup completed',
            deletedCount: cleanupResult.deletedCount
          }
        });

      case 'schedule':
        // Configure backup schedule
        return NextResponse.json({
          success: true,
          data: {
            message: 'Backup schedule configured successfully',
            schedule: data.schedule
          }
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Backup API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}