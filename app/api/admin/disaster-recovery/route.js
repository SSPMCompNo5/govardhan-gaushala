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
        // List all disaster recovery plans
        const plans = await db.collection('disaster_recovery_plans').find({}).sort({ createdAt: -1 }).toArray();
        return NextResponse.json({ 
          success: true, 
          data: plans.map(plan => ({
            id: plan._id.toString(),
            name: plan.name,
            description: plan.description,
            status: plan.status || 'inactive',
            backupId: plan.backupId,
            lastTested: plan.lastTested,
            createdAt: plan.createdAt
          }))
        });

      case 'stats':
        // Get disaster recovery statistics
        const totalPlans = await db.collection('disaster_recovery_plans').countDocuments();
        const activePlans = await db.collection('disaster_recovery_plans').countDocuments({ status: 'active' });
        const testedPlans = await db.collection('disaster_recovery_plans').countDocuments({ lastTested: { $exists: true } });
        const recentlyExecuted = await db.collection('disaster_recovery_plans').countDocuments({ 
          lastExecuted: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
        });

        return NextResponse.json({
          success: true,
          data: {
            totalPlans,
            activePlans,
            testedPlans,
            recentlyExecuted
          }
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Disaster recovery API error:', error);
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
        // Create a new disaster recovery plan
        const planData = {
          name: data.name,
          description: data.description,
          backupId: data.backupId,
          status: 'active',
          createdAt: new Date(),
          ...data
        };

        const result = await db.collection('disaster_recovery_plans').insertOne(planData);
        
        return NextResponse.json({
          success: true,
          data: {
            id: result.insertedId.toString(),
            ...planData
          }
        });

      case 'execute':
        // Execute a disaster recovery plan (record execution)
        {
          const { ObjectId } = await import('mongodb');
          const planId = data.planId ? new ObjectId(String(data.planId)) : null;
          if (!planId) return NextResponse.json({ error: 'planId is required' }, { status: 400 });
          const plan = await db.collection('disaster_recovery_plans').findOne({ _id: planId });
        if (!plan) {
          return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        await db.collection('disaster_recovery_plans').updateOne(
          { _id: planId },
          { $set: { lastExecuted: new Date() } }
        );

        await db.collection('disaster_recovery_executions').insertOne({ planId, executedAt: new Date() });
        return NextResponse.json({ success: true, data: { message: 'Execution recorded', planId: String(planId) } });
        }

      case 'test':
        // Test a disaster recovery plan (record test)
        {
          const { ObjectId } = await import('mongodb');
          const planId = data.planId ? new ObjectId(String(data.planId)) : null;
          if (!planId) return NextResponse.json({ error: 'planId is required' }, { status: 400 });
          const testPlan = await db.collection('disaster_recovery_plans').findOne({ _id: planId });
        if (!testPlan) {
          return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        await db.collection('disaster_recovery_plans').updateOne(
          { _id: planId },
          { $set: { lastTested: new Date() } }
        );

        await db.collection('disaster_recovery_tests').insertOne({ planId, testedAt: new Date(), result: 'ok' });
        return NextResponse.json({ success: true, data: { message: 'Test recorded', planId: String(planId) } });
        }

      case 'delete':
        // Delete a disaster recovery plan
        {
          const { ObjectId } = await import('mongodb');
          const planId = data.planId ? new ObjectId(String(data.planId)) : null;
          if (!planId) return NextResponse.json({ error: 'planId is required' }, { status: 400 });
          const deleteResult = await db.collection('disaster_recovery_plans').deleteOne({ _id: planId });
        
        if (deleteResult.deletedCount === 0) {
          return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          data: { message: 'Disaster recovery plan deleted successfully' }
        });
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Disaster recovery API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
