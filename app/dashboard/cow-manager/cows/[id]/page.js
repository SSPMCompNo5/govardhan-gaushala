'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw } from 'lucide-react';

export default function EditCowPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cow, setCow] = useState(null);
  const [form, setForm] = useState({ name:'', tagId:'', breed:'', birthDate:'', status:'normal', category:'cow', adoptionStatus:'none', group:'', pregnant:'false', photoUrl:'', notes:'', tags:'' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      // There is no GET by id API alternative in cows route file; use list + find
      const res = await fetch('/api/goshala-manager/cows?limit=200', { cache: 'no-store' });
      const data = await res.json();
      const list = data.cows || [];
      const found = list.find(c => String(c._id) === String(params.id) || c.tagId === params.id);
      if (found) {
        setCow(found);
        setForm({
          name: found.name || '',
          tagId: found.tagId || '',
          breed: found.breed || '',
          birthDate: found.birthDate ? String(found.birthDate).slice(0,10) : '',
          status: found.status || 'normal',
          category: found.category || 'cow',
          adoptionStatus: found.adoptionStatus || 'none',
          group: found.group || '',
          pregnant: String(!!found.pregnant),
          photoUrl: found.photoUrl || '',
          notes: found.notes || '',
          tags: Array.isArray(found.tags) ? found.tags.join(', ') : ''
        });
      }
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const getCSRF = () => {
    try { const m=document.cookie.match(/(?:^|; )csrftoken=([^;]+)/); return m?decodeURIComponent(m[1]):''; } catch { return ''; }
  };

  const onSave = async () => {
    if (!form.tagId) return alert('Tag ID is required');
    setSaving(true);
    try {
      const payload = {
        tagId: form.tagId,
        name: form.name || undefined,
        breed: form.breed || undefined,
        birthDate: form.birthDate || undefined,
        status: form.status,
        category: form.category,
        adoptionStatus: form.adoptionStatus,
        group: form.group || undefined,
        pregnant: form.pregnant === 'true',
        photoUrl: form.photoUrl || undefined,
        notes: form.notes || undefined,
        tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : []
      };
      const res = await fetch('/api/goshala-manager/cows', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      router.push('/dashboard/cow-manager/cows');
    } catch (e) {
      alert(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (file) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('tagId', form.tagId || '');
      const res = await fetch('/api/cow-manager/uploads', { method: 'POST', body: fd, credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Upload failed');
      setForm(f => ({ ...f, photoUrl: data.url }));
    } catch (e) {
      alert(e.message || 'Upload failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full p-6">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!cow) {
    return (
      <div className="min-h-screen w-full p-6">
        <div className="w-full max-w-3xl mx-auto">Cow not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit Cow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Name" value={form.name} onChange={(e)=> setForm(f=>({...f, name: e.target.value}))} />
              <Input placeholder="Tag ID" value={form.tagId} onChange={(e)=> setForm(f=>({...f, tagId: e.target.value}))} />
              <Input placeholder="Breed" value={form.breed} onChange={(e)=> setForm(f=>({...f, breed: e.target.value}))} />
              <Input type="date" placeholder="Birth Date" value={form.birthDate} onChange={(e)=> setForm(f=>({...f, birthDate: e.target.value}))} />
              <Select value={form.status} onValueChange={(v)=> setForm(f=>({...f, status: v}))}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="milking">Milking</SelectItem>
                  <SelectItem value="pregnant">Pregnant</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="rescued">Rescued</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.category} onValueChange={(v)=> setForm(f=>({...f, category: v}))}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cow">Cow</SelectItem>
                  <SelectItem value="calf">Calf</SelectItem>
                  <SelectItem value="bull">Bull</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.adoptionStatus} onValueChange={(v)=> setForm(f=>({...f, adoptionStatus: v}))}>
                <SelectTrigger><SelectValue placeholder="Adoption" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="sponsored">Sponsored</SelectItem>
                  <SelectItem value="adopted">Adopted</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Group" value={form.group} onChange={(e)=> setForm(f=>({...f, group: e.target.value}))} />
              <Select value={form.pregnant} onValueChange={(v)=> setForm(f=>({...f, pregnant: v}))}>
                <SelectTrigger><SelectValue placeholder="Pregnant" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Not Pregnant</SelectItem>
                  <SelectItem value="true">Pregnant</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input placeholder="Photo URL" value={form.photoUrl} onChange={(e)=> setForm(f=>({...f, photoUrl: e.target.value}))} />
                <Input type="file" accept="image/*" onChange={(e)=> e.target.files && onUpload(e.target.files[0])} />
              </div>
              <Input placeholder="Tags (comma-separated)" value={form.tags} onChange={(e)=> setForm(f=>({...f, tags: e.target.value}))} />
            </div>
            <div className="mt-4">
              <Textarea placeholder="Notes" value={form.notes} onChange={(e)=> setForm(f=>({...f, notes: e.target.value}))} />
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={onSave} disabled={saving}>{saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}Save</Button>
              <Button variant="outline" onClick={()=> router.back()}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


