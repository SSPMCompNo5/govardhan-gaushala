// Simple Twilio SMS helper. Uses env vars:
// TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, TWILIO_TO_NUMBERS (comma-separated, optional)

export async function sendSMS(to, body) {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!sid || !token || !from) return { ok: false, skipped: true, reason: 'Twilio env not configured' };
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const payload = new URLSearchParams({ To: to, From: from, Body: body });
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: payload
    });
    if (!res.ok) {
      let err; try { err = await res.json(); } catch { err = await res.text().catch(()=> ''); }
      return { ok: false, status: res.status, error: err };
    }
    const j = await res.json().catch(() => ({}));
    return { ok: true, sid: j.sid };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function notifySMSAll(body, recipients) {
  let list = [];
  if (Array.isArray(recipients)) {
    list = recipients.map(String).map(s => s.trim()).filter(Boolean);
  } else if (typeof recipients === 'string') {
    list = recipients.split(',').map(s => s.trim()).filter(Boolean);
  } else if (typeof process.env.TWILIO_TO_NUMBERS === 'string') {
    list = process.env.TWILIO_TO_NUMBERS.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (!list.length) return { ok: false, skipped: true, reason: 'No recipients' };
  const results = await Promise.all(list.map(num => sendSMS(num, body)));
  const ok = results.every(r => r.ok || r.skipped);
  return { ok, results };
}


