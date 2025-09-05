'use client';

import { RefreshCw, Shield, Plus, Search, Filter, Eye, Edit, Calendar, FileText, AlertTriangle, Check, Clock, Upload, Download, Users, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState, useCallback } from 'react';

export default function DoctorTreatmentsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [treatments, setTreatments] = useState([]);
  const [selectedTreatments, setSelectedTreatments] = useState(new Set());
  const [currentView, setCurrentView] = useState('active');
  const [toast, setToast] = useState('');
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  
  const [filters, setFilters] = useState({ 
    tagId: '', 
    category: '', 
    medicine: '', 
    outcome: '',
    dateFrom: '', 
    dateTo: '',
    vet: '',
    searchTerm: ''
  });
  
  const [form, setForm] = useState({
    tagId: '', 
    diagnosis: '', 
    illnessCategory: 'other', 
    startedAt: '', 
    vet: '',
    medicine: '', 
    dosage: '', 
    durationDays: 0, 
    notes: '', 
    flags: [], 
    followUps: []
  });
  
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState('');

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const p = new URLSearchParams();
      p.set('active', 'true');
      if (filters.tagId) p.set('tagId', filters.tagId);
      if (filters.category) p.set('category', filters.category);
      if (filters.medicine) p.set('medicine', filters.medicine);
      if (filters.dateFrom) p.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) p.set('dateTo', filters.dateTo);
      const res = await fetch(`/api/goshala-manager/health/treatments?${p.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setTreatments(data.treatments || []);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [filters.category, filters.dateFrom, filters.dateTo, filters.medicine, filters.tagId]);

  useEffect(() => { load(); }, [load]);

  const getCSRF = () => {
    try { const m=document.cookie.match(/(?:^|; )csrftoken=([^;]+)/); return m?decodeURIComponent(m[1]):''; } catch { return ''; }
  };

  const onCreate = async () => {
    try {
      const payload = { ...form, startedAt: form.startedAt || new Date().toISOString(), attachments: attachments };
      const res = await fetch('/api/goshala-manager/health/treatments', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() }, credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error||'Failed');
      setToast('Treatment added');
      
      // If medicine is prescribed, notify Food Manager
      if (form.medicine && form.tagId) {
        try {
          await fetch('/api/admin/notify/medication', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() }, credentials: 'same-origin',
            body: JSON.stringify({ 
              cowId: form.tagId, 
              medicine: form.medicine, 
              dosage: form.dosage,
              duration: form.durationDays,
              notes: `Cow ${form.tagId} is on medication: ${form.medicine} ${form.dosage} for ${form.durationDays} days. Please adjust diet if needed.`
            })
          });
        } catch (e) {
          console.warn('Failed to notify Food Manager:', e);
        }
      }
      
      setForm({ tagId: '', diagnosis: '', illnessCategory: 'other', startedAt: '', vet: '', medicine: '', dosage: '', durationDays: 0, notes: '', flags: [], followUps: [] });
      setAttachments([]);
      load();
    } catch(e) { setToast(String(e.message||e)); }
  };

  const onAddFollowUp = async (id) => {
    const note = prompt('Follow-up note (optional):') || '';
    const when = prompt('Follow-up when (YYYY-MM-DD or ISO):', new Date(Date.now()+7*24*60*60*1000).toISOString().slice(0,16)) || '';
    try {
      const res = await fetch('/api/goshala-manager/health/treatments', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() }, credentials: 'same-origin',
        body: JSON.stringify({ id, followUp: { when, notes: note } })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error||'Failed');
      setToast('Follow-up added');
      load();
    } catch(e) { setToast(String(e.message||e)); }
  };

  const onUpdateOutcome = async (id, currentOutcome) => {
    const outcomes = ['ongoing', 'recovered', 'referred', 'deceased'];
    const currentIndex = outcomes.indexOf(currentOutcome || 'ongoing');
    const nextIndex = (currentIndex + 1) % outcomes.length;
    const newOutcome = outcomes[nextIndex];
    
    try {
      const res = await fetch('/api/goshala-manager/health/treatments', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() }, credentials: 'same-origin',
        body: JSON.stringify({ id, outcome: newOutcome })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error||'Failed');
      setToast(`Outcome updated to ${newOutcome}`);
      load();
    } catch(e) { setToast(String(e.message||e)); }
  };

  const onFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('treatmentId', 'temp_' + Date.now()); // Temporary ID for new treatments
      formData.append('description', prompt('File description (optional):') || '');
      
      const res = await fetch('/api/doctor/attachments/upload', {
        method: 'POST',
        headers: { 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin',
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      setAttachments(prev => [...prev, data.attachment]);
      setToast('File uploaded successfully');
    } catch(e) {
      setToast(`Upload failed: ${e.message}`);
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-5 w-5"/> Treatments</h1>
          <Button variant="outline" onClick={load} disabled={refreshing}><RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin':''}`} /> Refresh</Button>
        </div>
        <Card>
          <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-5 gap-2">
            <input className="border p-2 rounded" placeholder="Cow Tag" value={filters.tagId} onChange={e=>setFilters(v=>({...v,tagId:e.target.value}))}/>
            <input className="border p-2 rounded" placeholder="Category" value={filters.category} onChange={e=>setFilters(v=>({...v,category:e.target.value}))}/>
            <input className="border p-2 rounded" placeholder="Medicine" value={filters.medicine} onChange={e=>setFilters(v=>({...v,medicine:e.target.value}))}/>
            <input className="border p-2 rounded" type="date" value={filters.dateFrom} onChange={e=>setFilters(v=>({...v,dateFrom:e.target.value}))}/>
            <input className="border p-2 rounded" type="date" value={filters.dateTo} onChange={e=>setFilters(v=>({...v,dateTo:e.target.value}))}/>
            <div className="md:col-span-5 flex gap-2">
              <Button variant="secondary" onClick={()=>{ setFilters({ tagId:'', category:'', medicine:'', dateFrom:'', dateTo:'' }); load(); }}>Clear</Button>
              <Button onClick={load}>Apply</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Active</CardTitle></CardHeader>
          <CardContent>
            {loading ? 'Loading...' : (
              <div className="space-y-2">
                {treatments.length ? treatments.map(t => (
                  <div key={`${t._id}`} className="p-3 border rounded-md">
                    <div className="flex justify-between">
                      <div className="font-medium">{t.diagnosis} <span className="text-xs text-muted-foreground">({t.illnessCategory||'other'})</span></div>
                      <div className="text-sm text-muted-foreground">{t.tagId} • since {new Date(t.startedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{t.medicine ? `Rx ${t.medicine}` : ''} {t.dosage ? `• ${t.dosage}`:''} {t.durationDays?`• ${t.durationDays}d`:''}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 rounded bg-gray-100">
                        {t.outcome || 'ongoing'}
                      </span>
                      <Button size="sm" variant="outline" onClick={()=>onUpdateOutcome(t._id, t.outcome)}>
                        Update Outcome
                      </Button>
                      <Button size="sm" variant="outline" onClick={()=>onAddFollowUp(t._id)}>
                        Add Follow-up
                      </Button>
                    </div>
                    {t.attachments && t.attachments.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Attachments:</div>
                        <div className="flex flex-wrap gap-1">
                          {t.attachments.map((att, idx) => (
                            <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" 
                               className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200">
                              {att.originalName}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {t.notes && <div className="text-xs text-muted-foreground mt-1">{t.notes}</div>}
                  </div>
                )) : <div className="text-muted-foreground">None</div>}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Add Treatment</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid md:grid-cols-2 gap-2">
              <input className="border p-2 rounded" placeholder="Cow Tag ID" value={form.tagId} onChange={e=>setForm(v=>({...v,tagId:e.target.value}))}/>
              <input className="border p-2 rounded" placeholder="Diagnosis" value={form.diagnosis} onChange={e=>setForm(v=>({...v,diagnosis:e.target.value}))}/>
              <input className="border p-2 rounded" placeholder="Illness Category" value={form.illnessCategory} onChange={e=>setForm(v=>({...v,illnessCategory:e.target.value}))}/>
              <input className="border p-2 rounded" type="datetime-local" value={form.startedAt} onChange={e=>setForm(v=>({...v,startedAt:e.target.value}))}/>
              <input className="border p-2 rounded" placeholder="Medicine (optional)" value={form.medicine} onChange={e=>setForm(v=>({...v,medicine:e.target.value}))}/>
              <input className="border p-2 rounded" placeholder="Dosage (e.g., 5ml)" value={form.dosage} onChange={e=>setForm(v=>({...v,dosage:e.target.value}))}/>
              <input className="border p-2 rounded" type="number" placeholder="Duration (days)" value={form.durationDays} onChange={e=>setForm(v=>({...v,durationDays:Number(e.target.value||0)}))}/>
              <input className="border p-2 rounded" placeholder="Vet" value={form.vet} onChange={e=>setForm(v=>({...v,vet:e.target.value}))}/>
            </div>
            <textarea className="border p-2 rounded w-full" placeholder="Notes" value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))}></textarea>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Attachments (Lab reports, X-rays, photos):</div>
              <input 
                type="file" 
                accept=".jpg,.jpeg,.png,.gif,.pdf,.tiff,.bmp"
                onChange={onFileUpload}
                disabled={uploading}
                className="border p-2 rounded w-full"
              />
              {uploading && <div className="text-xs text-muted-foreground">Uploading...</div>}
              
              {attachments.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium">Uploaded files:</div>
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                      <span>{att.originalName} ({Math.round(att.size/1024)}KB)</span>
                      <Button size="sm" variant="outline" onClick={()=>removeAttachment(idx)}>Remove</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button onClick={onCreate} disabled={uploading}>Add Treatment</Button>
            </div>
            {toast && <div className="text-sm text-muted-foreground">{toast}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


