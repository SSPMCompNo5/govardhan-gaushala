"use client";

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { addCSRFHeader } from '@/lib/http';

async function getCSRF() {
  try {
    const r = await fetch('/api/csrf', { credentials: 'same-origin' });
    const j = await r.json();
    return j?.token;
  } catch {
    return undefined;
  }
}

export default function NotificationsTesterPage() {
  const [channel, setChannel] = useState('sms'); // sms | whatsapp | whatsapp-template
  const [to, setTo] = useState(''); // comma-separated numbers
  const [message, setMessage] = useState('Test alert from Admin UI');
  const [templateSid, setTemplateSid] = useState('');
  const [templateVars, setTemplateVars] = useState('{"1":"12/1","2":"3pm"}');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const onSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);
    setError(null);
    try {
      const token = await getCSRF();
      const recipients = to.split(',').map(s => s.trim()).filter(Boolean);
      const body = channel === 'sms' ? {
        message,
        to: recipients
      } : channel === 'whatsapp' ? {
        whatsapp: true,
        message,
        to: recipients
      } : {
        whatsapp: true,
        templateSid: templateSid || undefined,
        templateVariables: (() => { try { return JSON.parse(templateVars || '{}'); } catch { return {}; } })(),
        to: recipients
      };
      const res = await fetch('/api/admin/alerts/notify', {
        method: 'POST',
        headers: addCSRFHeader({
          'Content-Type': 'application/json',
          method: 'POST'
        }),
        credentials: 'same-origin',
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || `Failed with ${res.status}`);
      } else {
        setResult(json);
      }
    } catch (err) {
      setError(err?.message || 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  }, [channel, message, templateSid, templateVars, to]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Notifications Tester</h1>
      <p className="text-sm text-muted-foreground">Send test notifications via SMS or WhatsApp to verify delivery and templates.</p>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp (plain)</SelectItem>
                <SelectItem value="whatsapp-template">WhatsApp (template)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Recipients (comma-separated)</Label>
            <Input value={to} onChange={e => setTo(e.target.value)} placeholder="+9190..., +1..." />
          </div>
        </div>

        {channel !== 'whatsapp-template' ? (
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Template SID</Label>
              <Input value={templateSid} onChange={e => setTemplateSid(e.target.value)} placeholder="HX..." />
            </div>
            <div className="space-y-2">
              <Label>Template Variables (JSON)</Label>
              <Textarea value={templateVars} onChange={e => setTemplateVars(e.target.value)} rows={3} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send Notification'}</Button>
        </div>
      </form>

      <div className="space-y-2">
        {error ? (
          <div className="text-sm text-red-600">{String(error)}</div>
        ) : null}
        {result ? (
          <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        ) : null}
      </div>
    </div>
  );
}


