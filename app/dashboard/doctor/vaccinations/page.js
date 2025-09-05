'use client';

import { RefreshCw, Calendar, Plus, Search, Filter, Eye, TrendingUp, Users, Clock, AlertTriangle, Check, BarChart3, FileText, Bell } from 'lucide-react';
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
import EmptyState from '@/components/EmptyState';
import { t } from '@/lib/i18n';

export default function DoctorVaccinationsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vaccinations, setVaccinations] = useState([]);
  const [cows, setCows] = useState([]);
  const [currentView, setCurrentView] = useState('upcoming');
  const [toast, setToast] = useState('');
  const [selectedVaccination, setSelectedVaccination] = useState(null);
  
  const [filters, setFilters] = useState({
    searchTerm: '',
    vaccine: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    overdue: false
  });
  
  const [form, setForm] = useState({
    tagId: '', 
    vaccine: '', 
    scheduledAt: '', 
    vet: '', 
    notes: '', 
    nextDueDate: '',
    batchNumber: '',
    manufacturer: ''
  });
  
  const [scheduleForm, setScheduleForm] = useState({
    cowIds: [],
    vaccine: '',
    scheduledDate: '',
    recurringType: 'none', // none, monthly, quarterly, yearly
    recurringInterval: 1,
    notes: ''
  });
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showCoverageDialog, setShowCoverageDialog] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/goshala-manager/health/vaccinations?upcoming=true', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setVaccinations(data.vaccinations || []);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getCSRF = () => {
    try { const m=document.cookie.match(/(?:^|; )csrftoken=([^;]+)/); return m?decodeURIComponent(m[1]):''; } catch { return ''; }
  };

  const onRecordVaccination = async () => {
    try {
      const tempId = `temp-${Date.now()}`;
      const optimistic = { _id: tempId, tagId: form.tagId, vaccine: form.vaccine, scheduledAt: form.scheduledAt || new Date().toISOString(), notes: form.notes, nextDueDate: form.nextDueDate };
      setVaccinations(prev => [optimistic, ...prev]);
      const payload = { ...form, scheduledAt: form.scheduledAt || new Date().toISOString() };
      const res = await fetch('/api/goshala-manager/health/vaccinations', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() }, credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error||'Failed');
      setToast('Vaccination recorded');
      setForm({ tagId: '', vaccine: '', scheduledAt: '', vet: '', notes: '', nextDueDate: '' });
      load();
    } catch(e) {
      setVaccinations(prev => prev.filter(v => !String(v._id).startsWith('temp-')));
      setToast(String(e.message||e));
    }
  };

  const vaccinationStats = {
    total: vaccinations.length,
    upcoming: vaccinations.filter(v => new Date(v.scheduledAt) > new Date()).length,
    overdue: vaccinations.filter(v => new Date(v.scheduledAt) < new Date() && !v.doneAt).length,
    completed: vaccinations.filter(v => v.doneAt).length
  };

  const filteredVaccinations = vaccinations.filter(vaccination => {
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      return vaccination.vaccine.toLowerCase().includes(searchLower) ||
             vaccination.tagId.toLowerCase().includes(searchLower);
    }
    return true;
  });

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Calendar className="h-8 w-8 text-blue-500" />
              Vaccination Management
            </h1>
            <p className="text-muted-foreground">Track vaccination schedules, coverage, and compliance</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Bell className="h-4 w-4 mr-2" />
                  Schedule Bulk
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule Bulk Vaccination</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Cows (separate Tag IDs with commas)</Label>
                    <Textarea
                      placeholder="COW001, COW002, COW003..."
                      value={scheduleForm.cowIds.join(', ')}
                      onChange={e => setScheduleForm(prev => ({ 
                        ...prev, 
                        cowIds: e.target.value.split(',').map(id => id.trim()).filter(id => id)
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Vaccine Type</Label>
                    <Select value={scheduleForm.vaccine} onValueChange={value => setScheduleForm(prev => ({ ...prev, vaccine: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vaccine" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FMD">Foot and Mouth Disease</SelectItem>
                        <SelectItem value="Brucellosis">Brucellosis</SelectItem>
                        <SelectItem value="BVD">Bovine Viral Diarrhea</SelectItem>
                        <SelectItem value="IBR">Infectious Bovine Rhinotracheitis</SelectItem>
                        <SelectItem value="Anthrax">Anthrax</SelectItem>
                        <SelectItem value="HS">Hemorrhagic Septicemia</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Scheduled Date</Label>
                    <Input
                      type="datetime-local"
                      value={scheduleForm.scheduledDate}
                      onChange={e => setScheduleForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1">
                      Schedule for {scheduleForm.cowIds.length} cows
                    </Button>
                    <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Vaccination
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Vaccination</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tagId">Cow Tag ID</Label>
                      <Input
                        id="tagId"
                        placeholder="Enter cow tag ID"
                        value={form.tagId}
                        onChange={e => setForm(v => ({ ...v, tagId: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="vaccine">Vaccine Name</Label>
                      <Select value={form.vaccine} onValueChange={value => setForm(v => ({ ...v, vaccine: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vaccine" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FMD">Foot and Mouth Disease</SelectItem>
                          <SelectItem value="Brucellosis">Brucellosis</SelectItem>
                          <SelectItem value="BVD">Bovine Viral Diarrhea</SelectItem>
                          <SelectItem value="IBR">Infectious Bovine Rhinotracheitis</SelectItem>
                          <SelectItem value="Anthrax">Anthrax</SelectItem>
                          <SelectItem value="HS">Hemorrhagic Septicemia</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="scheduledAt">Vaccination Date</Label>
                      <Input
                        id="scheduledAt"
                        type="datetime-local"
                        value={form.scheduledAt}
                        onChange={e => setForm(v => ({ ...v, scheduledAt: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="nextDueDate">Next Due Date</Label>
                      <Input
                        id="nextDueDate"
                        type="date"
                        value={form.nextDueDate}
                        onChange={e => setForm(v => ({ ...v, nextDueDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vet">Veterinarian</Label>
                      <Input
                        id="vet"
                        placeholder="Doctor name"
                        value={form.vet}
                        onChange={e => setForm(v => ({ ...v, vet: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="batchNumber">Batch Number</Label>
                      <Input
                        id="batchNumber"
                        placeholder="Vaccine batch"
                        value={form.batchNumber}
                        onChange={e => setForm(v => ({ ...v, batchNumber: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes about the vaccination..."
                      value={form.notes}
                      onChange={e => setForm(v => ({ ...v, notes: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={onRecordVaccination} className="flex-1">
                      Record Vaccination
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Vaccination Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Vaccinations</p>
                  <p className="text-2xl font-bold text-blue-600">{vaccinationStats.total}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                  <p className="text-2xl font-bold text-green-600">{vaccinationStats.upcoming}</p>
                </div>
                <Clock className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{vaccinationStats.overdue}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-purple-600">{vaccinationStats.completed}</p>
                </div>
                <Check className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Tabs and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={currentView} onValueChange={setCurrentView} className="mb-4">
              <TabsList>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="all">All Vaccinations</TabsTrigger>
                <TabsTrigger value="overdue">Overdue</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vaccinations..."
                    className="pl-10"
                    value={filters.searchTerm}
                    onChange={e => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Vaccine Type</Label>
                <Select value={filters.vaccine} onValueChange={value => setFilters(prev => ({ ...prev, vaccine: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All vaccines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vaccines</SelectItem>
                    <SelectItem value="FMD">Foot and Mouth Disease</SelectItem>
                    <SelectItem value="Brucellosis">Brucellosis</SelectItem>
                    <SelectItem value="BVD">Bovine Viral Diarrhea</SelectItem>
                    <SelectItem value="IBR">Infectious Bovine Rhinotracheitis</SelectItem>
                    <SelectItem value="Anthrax">Anthrax</SelectItem>
                    <SelectItem value="HS">Hemorrhagic Septicemia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant={filters.overdue ? "default" : "outline"}
                  onClick={() => setFilters(prev => ({ ...prev, overdue: !prev.overdue }))}
                  className="w-full"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Overdue Only
                </Button>
              </div>
              <div className="flex items-end">
                <Button onClick={load} className="w-full">
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Upcoming Vaccinations</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground" role="status" aria-live="polite">{t('loading')}</div>
            ) : (
              <div className="space-y-2">
                {vaccinations.length ? vaccinations.map(v => (
                  <div key={`${v._id || v.tagId}-${v.vaccine}-${v.scheduledAt}`} className="p-3 border rounded-md">
                    <div className="flex justify-between">
                      <div className="font-medium">{v.vaccine}</div>
                      <div className="text-sm text-muted-foreground">{v.tagId} • {new Date(v.scheduledAt).toLocaleString()}</div>
                    </div>
                    {v.nextDueDate && <div className="text-xs text-muted-foreground">Next due: {new Date(v.nextDueDate).toLocaleDateString()}</div>}
                    {v.notes && <div className="text-xs text-muted-foreground mt-1">{v.notes}</div>}
                  </div>
                )) : <EmptyState title="No upcoming vaccinations" description="All set for now." />}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Record Vaccination</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid md:grid-cols-2 gap-2">
              <input className="border p-2 rounded" placeholder="Cow Tag ID" value={form.tagId} onChange={e=>setForm(v=>({...v,tagId:e.target.value}))}/>
              <input className="border p-2 rounded" placeholder="Vaccine Name" value={form.vaccine} onChange={e=>setForm(v=>({...v,vaccine:e.target.value}))}/>
              <input className="border p-2 rounded" type="datetime-local" value={form.scheduledAt} onChange={e=>setForm(v=>({...v,scheduledAt:e.target.value}))}/>
              <input className="border p-2 rounded" placeholder="Vet" value={form.vet} onChange={e=>setForm(v=>({...v,vet:e.target.value}))}/>
              <input className="border p-2 rounded" type="date" placeholder="Next Due Date" value={form.nextDueDate} onChange={e=>setForm(v=>({...v,nextDueDate:e.target.value}))}/>
            </div>
            <textarea className="border p-2 rounded w-full" placeholder="Notes" value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))}></textarea>
            <div className="flex gap-2">
              <Button onClick={onRecordVaccination}>Record Vaccination</Button>
            </div>
            {toast && <div className="text-sm text-muted-foreground">{toast}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


