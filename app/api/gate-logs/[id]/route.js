import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { ensureIndexes } from '@/lib/indexes';
import { logAudit } from '@/lib/audit';
import { ObjectId } from 'mongodb';
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = session.user?.role;
    if (!allowRole(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await ensureIndexes();
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    let doc = null;
    if (ObjectId.isValid(id)) {
      doc = await db.collection('gate_logs').findOne({ _id: new ObjectId(id) });
    }
    if (!doc) {
      doc = await db.collection('gate_logs').findOne({ _id: String(id) });
    }
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ id: doc._id?.toString?.() || String(doc._id), log: { ...doc, id: doc._id?.toString?.() || String(doc._id), _id: undefined } });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

function allowRole() {
  return true; // allow any authenticated user
}

function makeRegexOrError(pattern, flags = 'i') {
  const str = String(pattern || '');
  if (!str) return null;
  if (str.length > 200) throw new Error('regex too long');
  try { return new RegExp(str, flags); } catch { throw new Error('invalid regex'); }
}

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = session.user?.role;
    if (!allowRole(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await ensureIndexes();
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    const patch = {};
    if (body.type && ['entry', 'exit', 'incident'].includes(String(body.type).toLowerCase())) patch.type = String(body.type).toLowerCase();
    if (body.note !== undefined) patch.note = body.note ? String(body.note) : undefined;
    if (body.visitorName !== undefined) patch.visitorName = body.visitorName ? String(body.visitorName) : undefined;
    if (body.visitorPhone !== undefined) {
      if (body.visitorPhone) {
        try { makeRegexOrError(String(body.visitorPhone)); } catch (e) { return NextResponse.json({ error: e?.message || 'invalid regex' }, { status: 400 }); }
        patch.visitorPhone = String(body.visitorPhone);
      } else {
        patch.visitorPhone = undefined;
      }
    }
    if (body.visitorAddress !== undefined) patch.visitorAddress = body.visitorAddress ? String(body.visitorAddress) : undefined;
    if (body.plate !== undefined) {
      if (body.plate) {
        try { makeRegexOrError(String(body.plate)); } catch (e) { return NextResponse.json({ error: e?.message || 'invalid regex' }, { status: 400 }); }
        patch.plate = String(body.plate);
      } else {
        patch.plate = undefined;
      }
    }
    if (body.groupSize !== undefined) {
      const raw = body.groupSize;
      const num = Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : (typeof raw === 'string' && raw.trim() ? Math.max(1, Math.floor(Number(raw))) : undefined);
      patch.groupSize = num;
    }
    patch.updatedAt = new Date();

    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No changes' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    let res = await db.collection('gate_logs').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: patch },
      { returnDocument: 'after' }
    );
    // Normalize return (driver may return result or doc)
    let updatedDoc = res && (Object.prototype.hasOwnProperty.call(res, 'value') ? res.value : res);
    // fallback: if document uses string _id
    if (!updatedDoc) {
      res = await db.collection('gate_logs').findOneAndUpdate(
        { _id: String(id) },
        { $set: patch },
        { returnDocument: 'after' }
      );
      updatedDoc = res && (Object.prototype.hasOwnProperty.call(res, 'value') ? res.value : res);
    }

    if (!updatedDoc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // audit log
    await logAudit({
      actor: session.user?.userId || 'unknown',
      action: 'gate_log:update',
      target: String(id),
      details: patch,
    });

    return NextResponse.json({ ok: true, updated: updatedDoc });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = session.user?.role;
    if (!allowRole(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await ensureIndexes();
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    let res = await db.collection('gate_logs').deleteOne({ _id: new ObjectId(id) });
    if (res.deletedCount === 0) {
      // fallback for string _id
      res = await db.collection('gate_logs').deleteOne({ _id: String(id) });
    }
    if (res.deletedCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // audit log
    await logAudit({
      actor: session.user?.userId || 'unknown',
      action: 'gate_log:delete',
      target: String(id),
      details: {},
    });

    return NextResponse.json({ ok: true, deleted: id });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
