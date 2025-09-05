import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getInventoryCollection } from '@/lib/models/foodInventory';
import { sendMail } from '@/lib/email';

// POST /api/admin/notify/low-stock
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Owner/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_FROM;
    if (!to) return NextResponse.json({ error: 'No recipient configured' }, { status: 400 });

    const coll = await getInventoryCollection();
    const items = await coll.find({ status: { $in: ['critical','low'] } }).sort({ status: 1, name: 1 }).limit(100).toArray();
    if (!items.length) return NextResponse.json({ ok: true, message: 'No low/critical items' });

    const rows = items.map(i => `• ${i.name} — ${i.quantity} ${i.unit} (${i.status})`).join('<br/>');
    const html = `<h3>Low/Critical Inventory</h3><p>The following items need attention:</p><p>${rows}</p>`;
    const sent = await sendMail({ to, subject: 'Goshala: Low/Critical Inventory', html, text: html.replaceAll('<br/>','\n').replace(/<[^>]+>/g,'') });
    return NextResponse.json({ ok: !!sent, count: items.length });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Notify failed' }, { status: 500 });
  }
}


