import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getSupplierCollection, validateSupplierData } from '@/lib/models/foodInventory';
import { logAudit } from '@/lib/audit';
import { ObjectId } from 'mongodb';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';
import { withCache } from '@/lib/apiCache';

const limitPOST = rateLimit({ windowMs: 60 * 1000, max: 10 }); // 10/min per IP per path
const limitMutation = rateLimit({ windowMs: 60 * 1000, max: 20 }); // shared for PATCH/DELETE

// GET /api/food/suppliers - Get all suppliers
export async function GET(request) {
  return withCache(request, async (req) => {
    try {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 20;
      const search = searchParams.get('search');

      const collection = await getSupplierCollection();
      
      // Build filter
      const filter = {};
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { contact: { $regex: search, $options: 'i' } },
          { address: { $regex: search, $options: 'i' } }
        ];
      }

      // Run count and find operations in parallel for better performance
      const skip = (page - 1) * limit;
      const [total, suppliers] = await Promise.all([
        collection.countDocuments(filter),
        collection.find(filter)
          .sort({ name: 1 })
          .skip(skip)
          .limit(limit)
          .project({
            name: 1,
            contact: 1,
            address: 1,
            notes: 1,
            createdAt: 1,
            updatedAt: 1
          })
          .toArray()
      ]);

      return NextResponse.json({
        suppliers,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('GET /api/food/suppliers error:', error);
      return NextResponse.json(
        { error: 'Internal server error' }, 
        { status: 500 }
      );
    }
  }, 300); // Cache for 5 minutes
}

// POST /api/food/suppliers - Add new supplier
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
      contact: raw.contact?.trim(),
      address: raw.address?.trim(),
      notes: raw.notes?.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate data
    const errors = validateSupplierData(data);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors }, 
        { status: 400 }
      );
    }

    const collection = await getSupplierCollection();
    const result = await collection.insertOne(data);

    // Log audit event
    await logAudit({
      actor: session.user.userId,
      action: 'food:supplier:create',
      target: result.insertedId.toString(),
      details: { name: data.name }
    });

    // Clear cache for supplier list
    await clearCachedResponse('GET:/api/food/suppliers');

    return NextResponse.json({
      message: 'Supplier added successfully',
      id: result.insertedId
    });

  } catch (error) {
    console.error('POST /api/food/suppliers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// PATCH /api/food/suppliers - Update supplier
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
        { error: 'Supplier ID is required' }, 
        { status: 400 }
      );
    }

    const raw = await request.json();
    const data = {
      name: raw.name?.trim(),
      contact: raw.contact?.trim(),
      address: raw.address?.trim(),
      notes: raw.notes?.trim(),
      updatedAt: new Date()
    };

    // Remove undefined fields
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

    // Validate data if present
    if (Object.keys(data).length > 1) { // More than just updatedAt
      const errors = validateSupplierData({ ...data });
      if (errors.length > 0) {
        return NextResponse.json(
          { error: 'Validation failed', details: errors }, 
          { status: 400 }
        );
      }
    }

    const collection = await getSupplierCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Supplier not found' }, 
        { status: 404 }
      );
    }

    // Log audit event
    await logAudit({
      actor: session.user.userId,
      action: 'food:supplier:update',
      target: id,
      details: data
    });

    // Clear cache for supplier list
    await clearCachedResponse('GET:/api/food/suppliers');

    return NextResponse.json({
      message: 'Supplier updated successfully'
    });

  } catch (error) {
    console.error('PATCH /api/food/suppliers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// DELETE /api/food/suppliers - Delete supplier
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
        { error: 'Supplier ID is required' }, 
        { status: 400 }
      );
    }

    const collection = await getSupplierCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Supplier not found' }, 
        { status: 404 }
      );
    }

    // Log audit event
    await logAudit({
      actor: session.user.userId,
      action: 'food:supplier:delete',
      target: id
    });

    // Clear cache for supplier list
    await clearCachedResponse('GET:/api/food/suppliers');

    return NextResponse.json({
      message: 'Supplier deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/food/suppliers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
