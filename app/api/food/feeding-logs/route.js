import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { 
  getFeedingLogsCollection 
} from '@/lib/models/foodInventory';
import { FeedingLogSchema } from '@/lib/schemas';
import { logAudit } from '@/lib/audit';
import { ObjectId } from 'mongodb';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limitPOST = rateLimit({ windowMs: 60 * 1000, max: 15 });
const limitMutation = rateLimit({ windowMs: 60 * 1000, max: 30 });

// GET /api/food/feeding-logs - Get all feeding logs
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const cowGroup = searchParams.get('cowGroup');
    const foodType = searchParams.get('foodType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');

    const collection = await getFeedingLogsCollection();
    
    // Build filter
    const filter = {};
    if (cowGroup) filter.cowGroup = cowGroup;
    if (foodType) filter.foodType = foodType;
    if (dateFrom || dateTo) {
      filter.feedingTime = {};
      if (dateFrom) filter.feedingTime.$gte = new Date(dateFrom);
      if (dateTo) filter.feedingTime.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }
    if (search) {
      filter.$or = [
        { notes: { $regex: search, $options: 'i' } },
        { recordedBy: { $regex: search, $options: 'i' } }
      ];
    }

    // ETag for caching
    const etagBase = JSON.stringify({ cowGroup, foodType, dateFrom, dateTo, search, page, limit });
    const etag = `W/"${Buffer.from(etagBase).toString('base64')}"`;
    const inm = request.headers.get('if-none-match');
    if (inm === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    // Run count and find operations in parallel for better performance
    const skip = (page - 1) * limit;
    const [total, logs] = await Promise.all([
      collection.countDocuments(filter),
      collection
        .find(filter)
        .sort({ feedingTime: -1 })
        .skip(skip)
        .limit(limit)
        .toArray()
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, { headers: { ETag: etag } });

  } catch (error) {
    console.error('GET /api/food/feeding-logs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// POST /api/food/feeding-logs - Record new feeding log
export async function POST(request) {
  try {
    const k = rateLimitKeyFromRequest(request, (await getServerSession(authOptions))?.user?.userId);
    const res = await limitPOST(k);
    if (res.limited) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    if (!validateCSRFFromRequest(request)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = FeedingLogSchema.safeParse({ ...raw, feedingTime: raw.feedingTime ? new Date(raw.feedingTime) : undefined });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    const collection = await getFeedingLogsCollection();
    
    // Prepare feeding log
    const feedingLog = {
      ...body,
      feedingTime: new Date(body.feedingTime || new Date()),
      wastage: body.wastage || 0,
      recordedBy: session.user.userId,
      createdAt: new Date()
    };

    const result = await collection.insertOne(feedingLog);
    
    // Log audit event
    await logAudit({
      actor: session.user.userId,
      action: 'food:feeding:record',
      target: result.insertedId.toString(),
      details: {
        foodType: body.foodType,
        quantity: body.quantity,
        unit: body.unit,
        cowGroup: body.cowGroup,
        wastage: body.wastage || 0
      }
    });

    return NextResponse.json({
      message: 'Feeding log recorded successfully',
      id: result.insertedId
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/food/feeding-logs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// PATCH /api/food/feeding-logs - Update feeding log
export async function PATCH(request) {
  try {
    const k = rateLimitKeyFromRequest(request, (await getServerSession(authOptions))?.user?.userId);
    const res = await limitMutation(k);
    if (res.limited) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    if (!validateCSRFFromRequest(request)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Feeding log ID is required' }, 
        { status: 400 }
      );
    }

    // Validate input data
    const validationErrors = validateFeedingLogData(updateData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors }, 
        { status: 400 }
      );
    }

    const collection = await getFeedingLogsCollection();
    
    // Convert feedingTime to Date if provided
    if (updateData.feedingTime) {
      updateData.feedingTime = new Date(updateData.feedingTime);
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Feeding log not found' }, 
        { status: 404 }
      );
    }

    // Log audit event
    await logAudit({
      actor: session.user.userId,
      action: 'food:feeding:update',
      target: id,
      details: updateData
    });

    return NextResponse.json({
      message: 'Feeding log updated successfully'
    });

  } catch (error) {
    console.error('PATCH /api/food/feeding-logs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// DELETE /api/food/feeding-logs - Delete feeding log
export async function DELETE(request) {
  try {
    const k = rateLimitKeyFromRequest(request, (await getServerSession(authOptions))?.user?.userId);
    const res = await limitMutation(k);
    if (res.limited) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    if (!validateCSRFFromRequest(request)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Feeding log ID is required' }, 
        { status: 400 }
      );
    }

    const collection = await getFeedingLogsCollection();
    
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Feeding log not found' }, 
        { status: 404 }
      );
    }

    // Log audit event
    await logAudit({
      actor: session.user.userId,
      action: 'food:feeding:delete',
      target: id
    });

    return NextResponse.json({
      message: 'Feeding log deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/food/feeding-logs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
