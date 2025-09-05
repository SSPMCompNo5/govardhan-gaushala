'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw } from 'lucide-react';

export default function AddCowPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    tagId: '',
    breed: '',
    birthDate: '',
    health: 'healthy',
    pregnant: 'false',
    group: '',
    notes: '',
    photoUrl: ''
  });

  const getCSRF = () => {
    try { const m=document.cookie.match(/(?:^|; )csrftoken=([^;]+)/); return m?decodeURIComponent(m[1]):''; } catch { return ''; }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        pregnant: form.pregnant === 'true',
        birthDate: form.birthDate || undefined,
        photoUrl: form.photoUrl || undefined,
      };
      const res = await fetch('/api/goshala-manager/cows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      router.push('/dashboard/cow-manager/cows');
    } catch (e) {
      alert(e.message || 'Failed to add cow');
    } finally {
      setSubmitting(false);
    }
  };

  const onUpload = async (file) => {
    if (!file) return;
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('tagId', form.tagId || '');
      const res = await fetch('/api/cow-manager/uploads', { method: 'POST', body: form, credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Upload failed');
      setForm(f => ({ ...f, photoUrl: data.url }));
    } catch (e) {
      alert(e.message || 'Upload failed');
    }
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Add Cow</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <Input placeholder="Name" value={form.name} onChange={(e)=> setForm(f=>({...f, name: e.target.value}))} />
                <Input required placeholder="Tag ID" value={form.tagId} onChange={(e)=> setForm(f=>({...f, tagId: e.target.value}))} />
                <Input placeholder="Breed" value={form.breed} onChange={(e)=> setForm(f=>({...f, breed: e.target.value}))} />
                <Input type="date" placeholder="Birth Date" value={form.birthDate} onChange={(e)=> setForm(f=>({...f, birthDate: e.target.value}))} />
                <Select value={form.health} onValueChange={(v)=> setForm(f=>({...f, health: v}))}>
                  <SelectTrigger><SelectValue placeholder="Health" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="healthy">Healthy</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={form.pregnant} onValueChange={(v)=> setForm(f=>({...f, pregnant: v}))}>
                  <SelectTrigger><SelectValue placeholder="Pregnant" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Not Pregnant</SelectItem>
                    <SelectItem value="true">Pregnant</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Group" value={form.group} onChange={(e)=> setForm(f=>({...f, group: e.target.value}))} />
                <div className="flex items-center gap-2">
                  <Input placeholder="Photo URL (optional)" value={form.photoUrl} onChange={(e)=> setForm(f=>({...f, photoUrl: e.target.value}))} />
                  <Input type="file" accept="image/*" onChange={(e)=> e.target.files && onUpload(e.target.files[0])} />
                </div>
              </div>
              <Textarea placeholder="Notes" value={form.notes} onChange={(e)=> setForm(f=>({...f, notes: e.target.value}))} />
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={()=> router.back()}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


