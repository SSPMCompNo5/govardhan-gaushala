import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getScheduleCollection, validateScheduleData } from '@/lib/models/foodInventory';
import { logAudit } from '@/lib/audit';
import { ObjectId } from 'mongodb';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';
import { withRedisCache, CacheKeys, invalidateCache } from '@/lib/redisCache';

const limitPOST = rateLimit({ windowMs: 60 * 1000, max: 10 }); // 10/min per IP per path
const limitMutation = rateLimit({ windowMs: 60 * 1000, max: 20 }); // shared for PATCH/DELETE

// GET /api/food/schedule - Get all feeding schedules
export async function GET(request) {
  return withRedisCache(request, async () => {
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
      const search = searchParams.get('search');

      const collection = await getScheduleCollection();
      
      // Build filter
      const filter = {};
      if (cowGroup) filter.cowGroup = cowGroup;
      if (foodType) filter.foodType = foodType;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } }
        ];
      }

      // Run count and find operations in parallel for better performance
      const skip = (page - 1) * limit;
      const [total, schedules] = await Promise.all([
        collection.countDocuments(filter),
        collection.find(filter)
          .sort({ feedingTime: 1 })
          .skip(skip)
          .limit(limit)
          .project({
            name: 1,
            cowGroup: 1,
            foodType: 1,
            quantity: 1,
            unit: 1,
            feedingTime: 1,
            notes: 1,
            createdAt: 1,
            updatedAt: 1
          })
          .toArray()
      ]);

      return NextResponse.json({
        schedules,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('GET /api/food/schedule error:', error);
      return NextResponse.json(
        { error: 'Internal server error' }, 
        { status: 500 }
      );
    }
  }, CacheKeys.FOOD_SCHEDULE, 600); // Cache for 10 minutes
}

// POST /api/food/schedule - Add new feeding schedule
export async function POST(request) {
  try {
    // Rate limit POSTs
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
    const data = {
      name: raw.name?.trim(),
      cowGroup: raw.cowGroup,
      foodType: raw.foodType,
      quantity: parseFloat(raw.quantity),
      unit: raw.unit,
      feedingTime: new Date(raw.feedingTime),
      notes: raw.notes?.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate data
    const errors = validateScheduleData(data);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors }, 
        { status: 400 }
      );
    }

    const collection = await getScheduleCollection();
    const result = await collection.insertOne(data);

    // Log audit event
    await logAudit({
      actor: session.user.userId,
      action: 'food:schedule:create',
      target: result.insertedId.toString(),
      details: { name: data.name, cowGroup: data.cowGroup, foodType: data.foodType }
    });

    // Clear cache for schedule list
    await invalidateCache(['food:schedule:*']);

    return NextResponse.json({
      message: 'Feeding schedule added successfully',
      id: result.insertedId
    });

  } catch (error) {
    console.error('POST /api/food/schedule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// PATCH /api/food/schedule - Update feeding schedule
export async function PATCH(request) {
  try {
    // Rate limit mutations
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
        { error: 'Schedule ID is required' }, 
        { status: 400 }
      );
    }

    const raw = await request.json();
    const data = {
      name: raw.name?.trim(),
      cowGroup: raw.cowGroup,
      foodType: raw.foodType,
      quantity: raw.quantity ? parseFloat(raw.quantity) : undefined,
      unit: raw.unit,
      feedingTime: raw.feedingTime ? new Date(raw.feedingTime) : undefined,
      notes: raw.notes?.trim(),
      updatedAt: new Date()
    };

    // Remove undefined fields
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

    // Validate data if present
    if (Object.keys(data).length > 1) { // More than just updatedAt
      const errors = validateScheduleData({ ...data });
      if (errors.length > 0) {
        return NextResponse.json(
          { error: 'Validation failed', details: errors }, 
          { status: 400 }
        );
      }
    }

    const collection = await getScheduleCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Schedule not found' }, 
        { status: 404 }
      );
    }

    // Log audit event
    await logAudit({
      actor: session.user.userId,
      action: 'food:schedule:update',
      target: id,
      details: data
    });

    // Clear cache for schedule list
    await invalidateCache(['food:schedule:*']);

    return NextResponse.json({
      message: 'Schedule updated successfully'
    });

  } catch (error) {
    console.error('PATCH /api/food/schedule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// DELETE /api/food/schedule - Delete feeding schedule
export async function DELETE(request) {
  try {
    // Rate limit mutations
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
        { error: 'Schedule ID is required' }, 
        { status: 400 }
      );
    }

    const collection = await getScheduleCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Schedule not found' }, 
        { status: 404 }
      );
    }

    // Log audit event
    await logAudit({
      actor: session.user.userId,
      action: 'food:schedule:delete',
      target: id
    });

    // Clear cache for schedule list
    await invalidateCache(['food:schedule:*']);

    return NextResponse.json({
      message: 'Schedule deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/food/schedule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
