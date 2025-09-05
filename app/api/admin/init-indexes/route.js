import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongo';
import { authOptions } from '@/lib/authOptions';
import { getServerSession } from 'next-auth/next';
import { canAccess } from '@/lib/roles';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canAccess(session.user.role, 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Create indexes for better performance
    const indexes = [
      // Users collection
      { collection: 'users', index: { email: 1 }, options: { unique: true } },
      { collection: 'users', index: { role: 1 } },
      { collection: 'users', index: { lastLogin: -1 } },
      
      // Cows collection
      { collection: 'cows', index: { tagId: 1 }, options: { unique: true } },
      { collection: 'cows', index: { status: 1 } },
      { collection: 'cows', index: { createdAt: -1 } },
      
      // Gate logs collection
      { collection: 'gateLogs', index: { timestamp: -1 } },
      { collection: 'gateLogs', index: { type: 1 } },
      { collection: 'gateLogs', index: { cowId: 1 } },
      
      // Inventory collection
      { collection: 'inventory', index: { name: 1 } },
      { collection: 'inventory', index: { category: 1 } },
      { collection: 'inventory', index: { expiryDate: 1 } },
      
      // Feeding logs collection
      { collection: 'feedingLogs', index: { timestamp: -1 } },
      { collection: 'feedingLogs', index: { cowId: 1 } },
      
      // Treatments collection
      { collection: 'treatments', index: { cowId: 1 } },
      { collection: 'treatments', index: { date: -1 } },
      { collection: 'treatments', index: { status: 1 } },
      
      // Medicines collection
      { collection: 'medicines', index: { name: 1 } },
      { collection: 'medicines', index: { expiryDate: 1 } },
      { collection: 'medicines', index: { category: 1 } },
    ];

    const results = [];
    
    for (const { collection, index, options } of indexes) {
      try {
        await db.collection(collection).createIndex(index, options || {});
        results.push({ collection, index, status: 'created' });
      } catch (error) {
        if (error.code === 85) {
          // Index already exists
          results.push({ collection, index, status: 'exists' });
        } else {
          results.push({ collection, index, status: 'error', error: error.message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database indexes initialized',
      results
    });

  } catch (error) {
    console.error('Error initializing indexes:', error);
    return NextResponse.json(
      { error: 'Failed to initialize indexes' },
      { status: 500 }
    );
  }
}