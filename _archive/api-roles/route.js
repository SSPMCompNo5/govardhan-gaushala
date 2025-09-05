import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongo';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const roles = await db.collection('roles').find({}).sort({ name: 1 }).toArray();
    return NextResponse.json({ roles });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, permissions = [] } = body || {};
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.collection('roles').createIndex({ name: 1 }, { unique: true });
    const doc = { name: String(name).trim(), permissions, createdAt: new Date() };
    await db.collection('roles').updateOne({ name: doc.name }, { $setOnInsert: doc }, { upsert: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e?.code === 11000) {
      return NextResponse.json({ error: 'Role already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: e.message || 'Failed to create role' }, { status: 500 });
  }
}
