import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';
import { sendEmail } from '@/lib/email';

const limitWrite = rateLimit({ windowMs: 60 * 1000, max: 10 });

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['Doctor', 'Goshala Manager', 'Owner/Admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitWrite(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    
    if (!validateCSRFFromRequest(request)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    
    const body = await request.json();
    const { cowId, medicine, dosage, duration, notes } = body;
    
    if (!cowId || !medicine) {
      return NextResponse.json({ error: 'Cow ID and medicine are required' }, { status: 400 });
    }
    
    // Send notification to Food Manager
    try {
      await sendEmail({
        to: process.env.FOOD_MANAGER_EMAIL || 'food-manager@goshala.com',
        subject: `Medication Alert: Cow ${cowId}`,
        html: `
          <h3>Medication Alert</h3>
          <p><strong>Cow ID:</strong> ${cowId}</p>
          <p><strong>Medicine:</strong> ${medicine}</p>
          <p><strong>Dosage:</strong> ${dosage || 'Not specified'}</p>
          <p><strong>Duration:</strong> ${duration || 'Not specified'} days</p>
          <p><strong>Notes:</strong> ${notes || 'No additional notes'}</p>
          <p><em>Please adjust the cow's diet if necessary based on the medication requirements.</em></p>
        `
      });
    } catch (emailError) {
      console.warn('Failed to send medication notification email:', emailError);
    }
    
    return NextResponse.json({ ok: true, message: 'Food Manager notified' });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
