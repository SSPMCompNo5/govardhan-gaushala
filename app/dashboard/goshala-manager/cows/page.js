'use client';

import { RefreshCw, Users, Plus, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useCallback, useMemo, memo, useRef } from 'react';

// Status color mapping
const STATUS_COLORS = {
  healthy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  sick: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  pregnant: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  lactating: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
};

// Memoized cow row
const CowRow = memo(function CowRow({ cow }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate">{cow.name || cow.tagId}</span>
          <Badge className={STATUS_COLORS[cow.status] || 'bg-gray-100 text-gray-800'}>
            {cow.status}
          </Badge>
          <span className="text-xs text-muted-foreground">#{cow.tagId}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {cow.category} • {cow.breed || 'Unknown'}
          {cow.age && ` • ${cow.age}y`}
          {cow.weight && ` • ${cow.weight}kg`}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        {cow.dailyMilkYield > 0 && (
          <div className="text-sm font-medium text-blue-600">{cow.dailyMilkYield} L/day</div>
        )}
        <div className="text-xs text-muted-foreground">
          {new Date(cow.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
});

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 p-6">
      <div className="h-8 bg-muted rounded w-48 animate-pulse" />
      <div className="h-16 bg-muted rounded animate-pulse" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function CowsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cows, setCows] = useState([]);
  const [toast, setToast] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [filters, setFilters] = useState({ search: '', category: '', status: '', breed: '' });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [form, setForm] = useState({
    tagId: '', name: '', category: 'adult', status: 'healthy', breed: '',
    age: '', weight: '', dailyMilkYield: '', notes: ''
  });

  const mountedRef = useRef(true);
  const filterTimeoutRef = useRef(null);

  // Debounce filters
  useEffect(() => {
    clearTimeout(filterTimeoutRef.current);
    filterTimeoutRef.current = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 400);
    return () => clearTimeout(filterTimeoutRef.current);
  }, [filters]);

  const getCSRF = () => {
    try {
      const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
      return m ? decodeURIComponent(m[1]) : '';
    } catch { return ''; }
  };

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      if (debouncedFilters.search) params.append('search', debouncedFilters.search);
      if (debouncedFilters.category && debouncedFilters.category !== 'all') params.append('category', debouncedFilters.category);
      if (debouncedFilters.status && debouncedFilters.status !== 'all') params.append('status', debouncedFilters.status);
      if (debouncedFilters.breed) params.append('breed', debouncedFilters.breed);
      params.append('limit', '50');

      const res = await fetch(`/api/goshala-manager/cows?${params}`);
      const data = await res.json();
      if (mountedRef.current && res.ok) {
        setCows(data.cows || []);
      }
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, [debouncedFilters]);

  useEffect(() => {
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const onCreate = async () => {
    try {
      const res = await fetch('/api/goshala-manager/cows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin',
        body: JSON.stringify(form)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed');
      showToast('Cow added successfully');
      setForm({ tagId: '', name: '', category: 'adult', status: 'healthy', breed: '', age: '', weight: '', dailyMilkYield: '', notes: '' });
      setShowAddForm(false);
      load();
    } catch (e) {
      showToast(String(e.message || e));
    }
  };

  // Memoized cow list
  const cowList = useMemo(() => {
    if (!cows.length) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <div>No cows found</div>
          <div className="text-xs">Adjust filters or add a new cow</div>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {cows.map(cow => <CowRow key={cow.tagId} cow={cow} />)}
      </div>
    );
  }, [cows]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" /> Cows & Herd
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={refreshing} onClick={load}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-4 w-4 mr-1" /> Add Cow
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input
              placeholder="Search..."
              value={filters.search}
              onChange={e => setFilters(v => ({ ...v, search: e.target.value }))}
            />
            <Select value={filters.category} onValueChange={v => setFilters(prev => ({ ...prev, category: v }))}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="calf">Calf</SelectItem>
                <SelectItem value="adult">Adult</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={v => setFilters(prev => ({ ...prev, status: v }))}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="healthy">Healthy</SelectItem>
                <SelectItem value="sick">Sick</SelectItem>
                <SelectItem value="pregnant">Pregnant</SelectItem>
                <SelectItem value="lactating">Lactating</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Breed"
              value={filters.breed}
              onChange={e => setFilters(v => ({ ...v, breed: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Add Cow Form */}
      {showAddForm && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add New Cow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input placeholder="Tag ID *" value={form.tagId} onChange={e => setForm(v => ({ ...v, tagId: e.target.value }))} />
              <Input placeholder="Name" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} />
              <Select value={form.category} onValueChange={v => setForm(prev => ({ ...prev, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="calf">Calf</SelectItem>
                  <SelectItem value="adult">Adult</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.status} onValueChange={v => setForm(prev => ({ ...prev, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="pregnant">Pregnant</SelectItem>
                  <SelectItem value="lactating">Lactating</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input placeholder="Breed" value={form.breed} onChange={e => setForm(v => ({ ...v, breed: e.target.value }))} />
              <Input placeholder="Age (years)" type="number" value={form.age} onChange={e => setForm(v => ({ ...v, age: e.target.value }))} />
              <Input placeholder="Weight (kg)" type="number" value={form.weight} onChange={e => setForm(v => ({ ...v, weight: e.target.value }))} />
              <Input placeholder="Milk (L/day)" type="number" step="0.1" value={form.dailyMilkYield} onChange={e => setForm(v => ({ ...v, dailyMilkYield: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={onCreate} disabled={!form.tagId}>Add Cow</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Herd List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Herd ({cows.length} cows)</CardTitle>
        </CardHeader>
        <CardContent>
          {cowList}
        </CardContent>
      </Card>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-bottom-4">
          {toast}
        </div>
      )}
    </div>
  );
}
