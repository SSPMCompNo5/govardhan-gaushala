// Twilio WhatsApp helper
// Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, TWILIO_WHATSAPP_TO (optional csv), TWILIO_WHATSAPP_TEMPLATE_SID (optional)

async function sendWhatsAppMessage(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g., whatsapp:+14155238886 or approved WABA number
  if (!sid || !token || !from) return { ok: false, skipped: true, reason: 'Twilio WhatsApp env not configured' };
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const payload = new URLSearchParams({ To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`, From: from, Body: body });
  const res = await fetch(url, { method: 'POST', headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: payload });
  if (!res.ok) { let err; try { err = await res.json(); } catch { err = await res.text(); } return { ok: false, status: res.status, error: err }; }
  const j = await res.json().catch(()=> ({}));
  return { ok: true, sid: j.sid };
}

export async function notifyWhatsAppAll(body, recipients) {
  let list = [];
  if (Array.isArray(recipients)) list = recipients.map(String).map(s=>s.trim()).filter(Boolean);
  else if (typeof recipients === 'string') list = recipients.split(',').map(s=>s.trim()).filter(Boolean);
  else if (typeof process.env.TWILIO_WHATSAPP_TO === 'string') list = process.env.TWILIO_WHATSAPP_TO.split(',').map(s=>s.trim()).filter(Boolean);
  if (!list.length) return { ok: false, skipped: true, reason: 'No recipients' };
  const results = await Promise.all(list.map(num => sendWhatsAppMessage(num, body)));
  const ok = results.every(r => r.ok || r.skipped);
  return { ok, results };
}

async function sendWhatsAppTemplateMessage(to, templateSid, variables) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) return { ok: false, skipped: true, reason: 'Twilio WhatsApp env not configured' };
  if (!templateSid) return { ok: false, skipped: true, reason: 'Missing templateSid' };
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const contentVariables = JSON.stringify(variables || {});
  const payload = new URLSearchParams({
    To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
    From: from,
    ContentSid: templateSid,
    ContentVariables: contentVariables
  });
  const res = await fetch(url, { method: 'POST', headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: payload });
  if (!res.ok) { let err; try { err = await res.json(); } catch { err = await res.text(); } return { ok: false, status: res.status, error: err }; }
  const j = await res.json().catch(()=> ({}));
  return { ok: true, sid: j.sid };
}

export async function notifyWhatsAppTemplateAll(templateSid, variables, recipients) {
  let list = [];
  if (Array.isArray(recipients)) list = recipients.map(String).map(s=>s.trim()).filter(Boolean);
  else if (typeof recipients === 'string') list = recipients.split(',').map(s=>s.trim()).filter(Boolean);
  else if (typeof process.env.TWILIO_WHATSAPP_TO === 'string') list = process.env.TWILIO_WHATSAPP_TO.split(',').map(s=>s.trim()).filter(Boolean);
  if (!list.length) return { ok: false, skipped: true, reason: 'No recipients' };
  const tpl = templateSid || process.env.TWILIO_WHATSAPP_TEMPLATE_SID;
  const vars = variables || {};
  const results = await Promise.all(list.map(num => sendWhatsAppTemplateMessage(num, tpl, vars)));
  const ok = results.every(r => r.ok || r.skipped);
  return { ok, results };
}


