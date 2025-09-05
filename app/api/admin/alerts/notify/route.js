import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { notifySMSAll } from '@/lib/sms';
import { notifyWhatsAppAll, notifyWhatsAppTemplateAll } from '@/lib/whatsapp';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'Admin' && session.user.role !== 'Owner/Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const message = body?.message || 'Alert from Goshala';
    const recipients = Array.isArray(body?.to) ? body.to : undefined;
    const useWhatsApp = !!body?.whatsapp;
    const templateSid = body?.templateSid;
    const templateVars = body?.templateVariables;
    const required = {
      TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
      TWILIO_FROM_NUMBER: !!process.env.TWILIO_FROM_NUMBER,
    };
    if (!required.TWILIO_ACCOUNT_SID || !required.TWILIO_AUTH_TOKEN || !required.TWILIO_FROM_NUMBER) {
      return NextResponse.json({ success: false, error: 'Twilio env not configured', required }, { status: 400 });
    }
    let result;
    if (useWhatsApp && templateSid) {
      result = await notifyWhatsAppTemplateAll(templateSid, templateVars, recipients);
    } else if (useWhatsApp) {
      result = await notifyWhatsAppAll(message, recipients);
    } else {
      result = await notifySMSAll(message, recipients);
    }
    if (!result.ok && !result.skipped) {
      return NextResponse.json({ success: false, result }, { status: 400 });
    }
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error('alerts/notify error:', e);
    return NextResponse.json({ error: 'Internal server error', details: String(e?.message || e) }, { status: 500 });
  }
}


