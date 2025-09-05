'use client';

import { RefreshCw, Users, Plus, Search, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useCallback } from 'react';

export default function CowsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cows, setCows] = useState([]);
  const [toast, setToast] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [filters, setFilters] = useState({ search: '', category: '', status: '', breed: '' });
  const [form, setForm] = useState({
    tagId: '', name: '', category: 'adult', status: 'healthy', breed: '', 
    age: '', weight: '', dailyMilkYield: '', notes: ''
  });

  const getCSRF = () => {
    try { const m=document.cookie.match(/(?:^|; )csrftoken=([^;]+)/); return m?decodeURIComponent(m[1]):''; } catch { return ''; }
  };

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (filters.breed) params.append('breed', filters.breed);
      params.append('limit', '100');
      
      const res = await fetch(`/api/goshala-manager/cows?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setCows(data.cows || []);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const onCreate = async () => {
    try {
      const res = await fetch('/api/goshala-manager/cows', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() }, 
        credentials: 'same-origin', body: JSON.stringify(form)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error||'Failed');
      setToast('Cow added successfully');
      setForm({ tagId: '', name: '', category: 'adult', status: 'healthy', breed: '', age: '', weight: '', dailyMilkYield: '', notes: '' });
      setShowAddForm(false);
      load();
    } catch(e) { setToast(String(e.message||e)); }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'sick': return 'bg-red-100 text-red-800';
      case 'pregnant': return 'bg-blue-100 text-blue-800';
      case 'lactating': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-5 w-5"/> Cows & Herd Management</h1>
          <div className="flex gap-2">
            <Button variant="outline" disabled={refreshing} onClick={load}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin':''}`} /> Refresh
            </Button>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-4 w-4 mr-2" /> Add Cow
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-4 w-4"/> Filters</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input placeholder="Search by name or tag ID" value={filters.search} onChange={e=>setFilters(v=>({...v,search:e.target.value}))}/>
              <Select value={filters.category} onValueChange={v=>setFilters(prev=>({...prev,category:v}))}>
                <SelectTrigger><SelectValue placeholder="Category"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="calf">Calf</SelectItem>
                  <SelectItem value="adult">Adult</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={v=>setFilters(prev=>({...prev,status:v}))}>
                <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="pregnant">Pregnant</SelectItem>
                  <SelectItem value="lactating">Lactating</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Breed" value={filters.breed} onChange={e=>setFilters(v=>({...v,breed:e.target.value}))}/>
            </div>
          </CardContent>
        </Card>

        {/* Add Cow Form */}
        {showAddForm && (
          <Card>
            <CardHeader><CardTitle>Add New Cow</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input placeholder="Tag ID (required)" value={form.tagId} onChange={e=>setForm(v=>({...v,tagId:e.target.value}))}/>
                <Input placeholder="Name (optional)" value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/>
                <Select value={form.category} onValueChange={v=>setForm(prev=>({...prev,category:v}))}>
                  <SelectTrigger><SelectValue placeholder="Category"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calf">Calf</SelectItem>
                    <SelectItem value="adult">Adult</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={form.status} onValueChange={v=>setForm(prev=>({...prev,status:v}))}>
                  <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="healthy">Healthy</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="pregnant">Pregnant</SelectItem>
                    <SelectItem value="lactating">Lactating</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Breed" value={form.breed} onChange={e=>setForm(v=>({...v,breed:e.target.value}))}/>
                <Input placeholder="Age (years)" type="number" value={form.age} onChange={e=>setForm(v=>({...v,age:e.target.value}))}/>
                <Input placeholder="Weight (kg)" type="number" value={form.weight} onChange={e=>setForm(v=>({...v,weight:e.target.value}))}/>
                <Input placeholder="Daily Milk Yield (L)" type="number" step="0.1" value={form.dailyMilkYield} onChange={e=>setForm(v=>({...v,dailyMilkYield:e.target.value}))}/>
              </div>
              <textarea className="border p-2 rounded w-full" placeholder="Notes" value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))}></textarea>
              <div className="flex gap-2">
                <Button onClick={onCreate} disabled={!form.tagId}>Add Cow</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Herd List */}
        <Card>
          <CardHeader><CardTitle>Herd ({cows.length} cows)</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                Loading...
              </div>
            ) : (
              <div className="space-y-3">
                {cows.length ? cows.map(c => (
                  <div key={c.tagId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium">{c.name || c.tagId}</div>
                        <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                        <span className="text-xs text-muted-foreground">#{c.tagId}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {c.category} • {c.breed || 'Unknown breed'}
                        {c.age && ` • ${c.age} years`}
                        {c.weight && ` • ${c.weight} kg`}
                      </div>
                      {c.notes && <div className="text-xs text-muted-foreground mt-1">{c.notes}</div>}
                    </div>
                    <div className="text-right">
                      {typeof c.dailyMilkYield === 'number' && c.dailyMilkYield > 0 && (
                        <div className="text-sm font-medium text-blue-600">{c.dailyMilkYield} L/day</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Added {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50"/>
                    <div>No cows found</div>
                    <div className="text-xs">Try adjusting your filters or add a new cow</div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {toast && <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg">{toast}</div>}
      </div>
    </div>
  );
}


