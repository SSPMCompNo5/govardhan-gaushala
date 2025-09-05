import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { 
  getInventoryCollection, 
  getStockStatus,
  FoodTypes,
  UnitTypes,
  validateInventoryData
} from '@/lib/models/foodInventory';
import { InventoryItemSchema } from '@/lib/schemas';
import { logAudit } from '@/lib/audit';
import { ObjectId } from 'mongodb';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';
import { notifySMSAll } from '@/lib/sms';

const limitPOST = rateLimit({ windowMs: 60 * 1000, max: 10 }); // 10/min per IP per path
const limitMutation = rateLimit({ windowMs: 60 * 1000, max: 20 }); // shared for PATCH/DELETE

// GET /api/food/inventory - Get all inventory items
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const collection = await getInventoryCollection();
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } }
      ];
    }

    // ETag for caching
    const etagBase = JSON.stringify({ filter, page, limit });
    const etag = `W/"${Buffer.from(etagBase).toString('base64')}"`;
    const inm = request.headers.get('if-none-match');
    if (inm === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    // Run count and find operations in parallel for better performance
    const skip = (page - 1) * limit;
    const [total, inventory] = await Promise.all([
      collection.countDocuments(filter),
      collection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray()
    ]);

    return NextResponse.json({
      inventory,
      items: inventory,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, { headers: { ETag: etag } });

  } catch (error) {
    console.error('GET /api/food/inventory error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// POST /api/food/inventory - Add new inventory item
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
    // Coercions and guards before schema validation
    const coerceNumber = (v) => (v === '' || v === undefined || v === null ? undefined : (typeof v === 'string' ? parseFloat(v) : v));
    const coerceDate = (v) => {
      if (!v) return undefined;
      const d = v instanceof Date ? v : new Date(v);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    const cleaned = {
      name: raw?.name,
      type: raw?.type,
      quantity: coerceNumber(raw?.quantity),
      unit: raw?.unit,
      supplier: raw?.supplier ?? '',
      purchaseDate: coerceDate(raw?.purchaseDate),
      expiryDate: coerceDate(raw?.expiryDate),
      notes: raw?.notes ?? ''
    };
    // Short-circuit clear 400s for invalid enums
    if (!Object.values(FoodTypes).includes(cleaned.type)) {
      return NextResponse.json({ error: 'Validation failed', details: ['Valid food type is required'] }, { status: 400 });
    }
    if (!Object.values(UnitTypes).includes(cleaned.unit)) {
      return NextResponse.json({ error: 'Validation failed', details: ['Valid unit is required'] }, { status: 400 });
    }
    const parsed = InventoryItemSchema.safeParse(cleaned);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;
    
    // Validate input data
    const validationErrors = validateInventoryData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors }, 
        { status: 400 }
      );
    }

    const collection = await getInventoryCollection();
    
    // Calculate stock status
    const status = getStockStatus(body.type, body.quantity, body.unit);
    
    // Prepare inventory item
    const inventoryItem = {
      ...body,
      status: body.status && ['healthy','low','critical','out_of_stock'].includes(body.status) ? body.status : status,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(inventoryItem);
    
    // Log audit event
    await logAudit({
      actor: session.user.userId,
      action: 'food:inventory:add',
      target: result.insertedId.toString(),
      details: {
        name: body.name,
        type: body.type,
        quantity: body.quantity,
        unit: body.unit
      }
    });

    // Auto-SMS for critical stock on create as well, if enabled
    try {
      const auto = String(process.env.ALERTS_AUTO_SMS || '').toLowerCase() === 'true';
      const to = process.env.ALERTS_SMS_TO || process.env.TWILIO_TO_NUMBERS || '';
      if (auto && status === 'critical') {
        const msg = `Critical stock: ${body.name} — ${body.quantity} ${body.unit}`;
        await notifySMSAll(msg, to);
      }
    } catch (e) {
      console.error('inventory add critical alert notify error:', e?.message || e);
    }

    return NextResponse.json({
      message: 'Inventory item added successfully',
      id: result.insertedId
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/food/inventory error:', error?.stack || error);
    const msg = process.env.NODE_ENV === 'development' ? (error?.message || 'Internal server error') : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/food/inventory - Update inventory item
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

    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Inventory item ID is required' }, 
        { status: 400 }
      );
    }

    // Validate input data
    const parsedUpdate = InventoryItemSchema.partial().safeParse(updateData);
    if (!parsedUpdate.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsedUpdate.error.flatten() }, { status: 400 });
    }
    Object.assign(updateData, parsedUpdate.data);

    const collection = await getInventoryCollection();
    
    // If client explicitly sets status, accept it if valid; else compute on quantity change
    const allowedStatus = ['healthy','low','critical','out_of_stock'];
    if (updateData.status && !allowedStatus.includes(updateData.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    // Calculate new stock status if quantity changed. If type/unit missing in payload, read current item.
    if (updateData.status === undefined && updateData.quantity !== undefined) {
      let effectiveType = updateData.type || body.type;
      let effectiveUnit = updateData.unit || body.unit;
      if (!effectiveType || !effectiveUnit) {
        const existing = await (await getInventoryCollection()).findOne({ _id: new ObjectId(id) }, { projection: { type:1, unit:1, name:1 } });
        if (existing) {
          effectiveType = effectiveType || existing.type;
          effectiveUnit = effectiveUnit || existing.unit;
          if (!updateData.name) updateData.name = existing.name;
        }
      }
      if (effectiveType && effectiveUnit) {
        updateData.status = getStockStatus(
          effectiveType,
          updateData.quantity,
          effectiveUnit
        );
      }
    }
    
    updateData.updatedAt = new Date();

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Inventory item not found' }, 
        { status: 404 }
      );
    }

    // Log audit event
    await logAudit({
      actor: session.user.userId,
      action: 'food:inventory:update',
      target: id,
      details: updateData
    });

    // Auto-SMS for critical stock, if enabled, when status is set to critical
    try {
      const auto = String(process.env.ALERTS_AUTO_SMS || '').toLowerCase() === 'true';
      const to = process.env.ALERTS_SMS_TO || process.env.TWILIO_TO_NUMBERS || '';
      if (auto && (updateData.status === 'critical')) {
        const msg = `Critical stock: ${updateData.name || body.name || 'Item'} — ${updateData.quantity ?? ''} ${updateData.unit ?? ''}`.trim();
        await notifySMSAll(msg, to);
      }
    } catch (e) {
      // Do not fail the API for notification issues
      console.error('inventory critical alert notify error:', e?.message || e);
    }

    return NextResponse.json({
      message: 'Inventory item updated successfully'
    });

  } catch (error) {
    console.error('PATCH /api/food/inventory error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// DELETE /api/food/inventory - Delete inventory item
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
        { error: 'Inventory item ID is required' }, 
        { status: 400 }
      );
    }

    const collection = await getInventoryCollection();
    
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Inventory item not found' }, 
        { status: 404 }
      );
    }

    // Log audit event
    await logAudit({
      actor: session.user.userId,
      action: 'food:inventory:delete',
      target: id
    });

    return NextResponse.json({
      message: 'Inventory item deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/food/inventory error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
