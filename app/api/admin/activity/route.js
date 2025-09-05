import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { canAccess } from '@/lib/roles';
import clientPromise from '@/lib/mongo';
import { z } from 'zod';

const ActivitySchema = z.object({
  type: z.string(),
  message: z.string(),
  user: z.string(),
  severity: z.enum(['info', 'warning', 'error']).optional(),
  metadata: z.record(z.any()).optional()
});

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canAccess(session.user.role, 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection('audit_logs');

    // Build query
    const query = {};
    if (type) query.type = type;
    if (severity) query.severity = severity;

    // Fetch recent activities
    const activities = await collection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ activities });

  } catch (error) {
    console.error('Failed to fetch admin activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canAccess(session.user.role, 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = ActivitySchema.parse(body);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection('audit_logs');

    const activity = {
      ...validatedData,
      timestamp: new Date(),
      userId: session.user.userId
    };

    await collection.insertOne(activity);

    return NextResponse.json({ success: true, activity });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    
    console.error('Failed to create admin activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
