import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { notifySMSAll } from '@/lib/sms';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || !['Goshala Manager','Admin','Owner/Admin','Doctor'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const inv = db.collection('foodInventory');
    const vacc = db.collection('vaccinations');
    const now = new Date();
    const soon = new Date(Date.now() + 7*24*60*60*1000);
    const [low, critical, upcoming] = await Promise.all([
      inv.find({ status: 'low' }).project({ name:1, quantity:1, unit:1 }).limit(10).toArray(),
      inv.find({ status: 'critical' }).project({ name:1, quantity:1, unit:1 }).limit(10).toArray(),
      vacc.find({ scheduledAt: { $gte: now, $lte: soon } }).project({ tagId:1, vaccine:1, scheduledAt:1 }).limit(20).toArray()
    ]);
    return NextResponse.json({ low, critical, upcoming });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || !['Admin','Owner/Admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json().catch(()=>({}));
    const alert = body?.alert || {};
    const auto = body?.auto || {};
    if (String(alert?.type || alert?.level).toLowerCase() === 'critical' && auto?.sms) {
      const text = alert.title ? `Critical: ${alert.title}` : 'Critical alert';
      await notifySMSAll(text, auto?.to);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


