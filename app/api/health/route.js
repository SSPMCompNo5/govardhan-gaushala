import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongo';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.admin().ping();
    return NextResponse.json({ ok: true, db: 'up', ts: Date.now() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || 'db unavailable' }, { status: 503 });
  }
}


