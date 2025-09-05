import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongo';

const roles = [
  { name: 'Owner/Admin', permissions: ['*'] },
  { name: 'Operations Manager', permissions: [
      'cows:read','cows:write','milk:read','milk:write','tasks:read','tasks:write','health:read','health:write','inventory:read','inventory:write'
    ] },
  { name: 'Accountant', permissions: [
      'expenses:read','expenses:write','donations:read','donations:write','reports:read'
    ] },
  { name: 'Inventory Manager', permissions: [
      'inventory:read','inventory:write','purchases:read','purchases:write','vendors:read','vendors:write'
    ] },
  { name: 'Worker Manager', permissions: [
      'workers:read','workers:write','tasks:read','tasks:write','attendance:read','attendance:write'
    ] },
  { name: 'Veterinarian/Doctor', permissions: [
      'health:read','health:write','cows:read','reports:read'
    ] },
  { name: 'Donor Manager', permissions: [
      'donations:read','donations:write','donors:read','donors:write','campaigns:read','campaigns:write','reports:read'
    ] },
  { name: 'Operations Staff', permissions: [
      'milk:read','milk:write','tasks:read','inventory:read'
    ] },
  { name: 'Auditor (Read-Only)', permissions: [
      'cows:read','milk:read','expenses:read','donations:read','inventory:read','health:read','tasks:read','workers:read','reports:read'
    ] },
];

export async function POST(request) {
  try {
    const allowed = process.env.NODE_ENV === 'development' || process.env.ENABLE_SEED === 'true';
    const host = request?.headers?.get('host') || '';
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]');
    if (!allowed || !isLocalhost) {
      return NextResponse.json({ ok: false, error: 'Not Found' }, { status: 404 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const coll = db.collection('roles');
    await coll.createIndex({ name: 1 }, { unique: true });

    const results = [];
    for (const role of roles) {
      const res = await coll.updateOne(
        { name: role.name },
        {
          $setOnInsert: { name: role.name, createdAt: new Date() },
          $set: { permissions: role.permissions },
        },
        { upsert: true }
      );
      results.push({ name: role.name, upserted: !!res.upsertedId, matched: res.matchedCount });
    }

    return NextResponse.json({ ok: true, count: results.length, results });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to seed roles' }, { status: 500 });
  }
}
