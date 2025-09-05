'use client';

import { RefreshCw, Settings, Plus, Wrench, CheckSquare, Building } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { addCSRFHeader } from '@/lib/http';
import { useEffect, useState, useCallback } from 'react';

export default function InfrastructurePage() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checklists, setChecklists] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [assets, setAssets] = useState([]);
  const [toast, setToast] = useState('');
  const [showAddChecklist, setShowAddChecklist] = useState(false);
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [checklistForm, setChecklistForm] = useState({ area: '', item: '', status: 'pending', notes: '' });
  const [maintenanceForm, setMaintenanceForm] = useState({ assetId: '', type: '', description: '', priority: 'medium', scheduledDate: '', assignedTo: '' });
  const [assetForm, setAssetForm] = useState({ name: '', type: '', location: '', status: 'operational', purchaseDate: '', warrantyExpiry: '', notes: '' });

  const todayStr = new Date().toISOString().slice(0,10);
  
  const getCSRF = () => {
    try { const m=document.cookie.match(/(?:^|; )csrftoken=([^;]+)/); return m?decodeURIComponent(m[1]):''; } catch { return ''; }
  };

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const [c,m,a] = await Promise.all([
        fetch(`/api/goshala-manager/infrastructure/checklists?date=${todayStr}`, { cache: 'no-store' }),
        fetch('/api/goshala-manager/infrastructure/maintenance', { cache: 'no-store' }),
        fetch('/api/goshala-manager/infrastructure/assets', { cache: 'no-store' })
      ]);
      const [cj,mj,aj] = await Promise.all([c.json(), m.json(), a.json()]);
      if (c.ok) setChecklists(cj.checklists || []);
      if (m.ok) setMaintenance(mj.maintenance || []);
      if (a.ok) setAssets(aj.assets || []);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => { load(); }, [load]);

  const onAddChecklist = async () => {
    try {
      const res = await fetch('/api/goshala-manager/infrastructure/checklists', {
        method: 'POST', headers: addCSRFHeader({ 'Content-Type': 'application/json' }), 
        credentials: 'same-origin', body: JSON.stringify({ ...checklistForm, date: todayStr })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error||'Failed');
      setToast('Checklist item added');
      setChecklistForm({ area: '', item: '', status: 'pending', notes: '' });
      setShowAddChecklist(false);
      load();
    } catch(e) { setToast(String(e.message||e)); }
  };

  const onAddMaintenance = async () => {
    try {
      const res = await fetch('/api/goshala-manager/infrastructure/maintenance', {
        method: 'POST', headers: addCSRFHeader({ 'Content-Type': 'application/json' }), 
        credentials: 'same-origin', body: JSON.stringify(maintenanceForm)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error||'Failed');
      setToast('Maintenance scheduled');
      setMaintenanceForm({ assetId: '', type: '', description: '', priority: 'medium', scheduledDate: '', assignedTo: '' });
      setShowAddMaintenance(false);
      load();
    } catch(e) { setToast(String(e.message||e)); }
  };

  const onAddAsset = async () => {
    try {
      const res = await fetch('/api/goshala-manager/infrastructure/assets', {
        method: 'POST', headers: addCSRFHeader({ 'Content-Type': 'application/json' }), 
        credentials: 'same-origin', body: JSON.stringify(assetForm)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error||'Failed');
      setToast('Asset added');
      setAssetForm({ name: '', type: '', location: '', status: 'operational', purchaseDate: '', warrantyExpiry: '', notes: '' });
      setShowAddAsset(false);
      load();
    } catch(e) { setToast(String(e.message||e)); }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'operational': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'broken': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-5 w-5"/> Infrastructure & Maintenance</h1>
          <div className="flex gap-2">
            <Button variant="outline" disabled={refreshing} onClick={load}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin':''}`} /> Refresh
            </Button>
            <Button onClick={() => setShowAddChecklist(!showAddChecklist)}>
              <CheckSquare className="h-4 w-4 mr-2" /> Add Checklist
            </Button>
            <Button onClick={() => setShowAddMaintenance(!showAddMaintenance)}>
              <Wrench className="h-4 w-4 mr-2" /> Schedule Maintenance
            </Button>
            <Button onClick={() => setShowAddAsset(!showAddAsset)}>
              <Building className="h-4 w-4 mr-2" /> Add Asset
            </Button>
          </div>
        </div>

        {/* Add Checklist Form */}
        {showAddChecklist && (
          <Card>
            <CardHeader><CardTitle>Add Checklist Item</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input placeholder="Area (e.g., Cow Shed A)" value={checklistForm.area} onChange={e=>setChecklistForm(v=>({...v,area:e.target.value}))}/>
                <Input placeholder="Item to check" value={checklistForm.item} onChange={e=>setChecklistForm(v=>({...v,item:e.target.value}))}/>
                <Select value={checklistForm.status} onValueChange={v=>setChecklistForm(prev=>({...prev,status:v}))}>
                  <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Notes (optional)" value={checklistForm.notes} onChange={e=>setChecklistForm(v=>({...v,notes:e.target.value}))}/>
              </div>
              <div className="flex gap-2">
                <Button onClick={onAddChecklist} disabled={!checklistForm.area || !checklistForm.item}>Add Item</Button>
                <Button variant="outline" onClick={() => setShowAddChecklist(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Maintenance Form */}
        {showAddMaintenance && (
          <Card>
            <CardHeader><CardTitle>Schedule Maintenance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={maintenanceForm.assetId} onValueChange={v=>setMaintenanceForm(prev=>({...prev,assetId:v}))}>
                  <SelectTrigger><SelectValue placeholder="Select Asset"/></SelectTrigger>
                  <SelectContent>
                    {assets.map(asset => (
                      <SelectItem key={asset._id} value={asset._id}>{asset.name} ({asset.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={maintenanceForm.type} onValueChange={v=>setMaintenanceForm(prev=>({...prev,type:v}))}>
                  <SelectTrigger><SelectValue placeholder="Maintenance Type"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={maintenanceForm.priority} onValueChange={v=>setMaintenanceForm(prev=>({...prev,priority:v}))}>
                  <SelectTrigger><SelectValue placeholder="Priority"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" placeholder="Scheduled Date" value={maintenanceForm.scheduledDate} onChange={e=>setMaintenanceForm(v=>({...v,scheduledDate:e.target.value}))}/>
                <Input placeholder="Assigned To" value={maintenanceForm.assignedTo} onChange={e=>setMaintenanceForm(v=>({...v,assignedTo:e.target.value}))}/>
              </div>
              <textarea className="border p-2 rounded w-full" placeholder="Description" value={maintenanceForm.description} onChange={e=>setMaintenanceForm(v=>({...v,description:e.target.value}))}></textarea>
              <div className="flex gap-2">
                <Button onClick={onAddMaintenance} disabled={!maintenanceForm.assetId || !maintenanceForm.type}>Schedule</Button>
                <Button variant="outline" onClick={() => setShowAddMaintenance(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Asset Form */}
        {showAddAsset && (
          <Card>
            <CardHeader><CardTitle>Add Asset</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input placeholder="Asset Name" value={assetForm.name} onChange={e=>setAssetForm(v=>({...v,name:e.target.value}))}/>
                <Select value={assetForm.type} onValueChange={v=>setAssetForm(prev=>({...prev,type:v}))}>
                  <SelectTrigger><SelectValue placeholder="Asset Type"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="building">Building</SelectItem>
                    <SelectItem value="vehicle">Vehicle</SelectItem>
                    <SelectItem value="furniture">Furniture</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Location" value={assetForm.location} onChange={e=>setAssetForm(v=>({...v,location:e.target.value}))}/>
                <Select value={assetForm.status} onValueChange={v=>setAssetForm(prev=>({...prev,status:v}))}>
                  <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="broken">Broken</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" placeholder="Purchase Date" value={assetForm.purchaseDate} onChange={e=>setAssetForm(v=>({...v,purchaseDate:e.target.value}))}/>
                <Input type="date" placeholder="Warranty Expiry" value={assetForm.warrantyExpiry} onChange={e=>setAssetForm(v=>({...v,warrantyExpiry:e.target.value}))}/>
              </div>
              <textarea className="border p-2 rounded w-full" placeholder="Notes" value={assetForm.notes} onChange={e=>setAssetForm(v=>({...v,notes:e.target.value}))}></textarea>
              <div className="flex gap-2">
                <Button onClick={onAddAsset} disabled={!assetForm.name || !assetForm.type}>Add Asset</Button>
                <Button variant="outline" onClick={() => setShowAddAsset(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Today's Checklist */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CheckSquare className="h-4 w-4"/> Today&apos;s Checklist ({todayStr})</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {checklists.length ? checklists.map(c => (
                    <div key={c._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{c.area}</div>
                        <div className="text-sm text-muted-foreground">{c.item}</div>
                        {c.notes && <div className="text-xs text-muted-foreground mt-1">{c.notes}</div>}
                      </div>
                      <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-muted-foreground">No checklist items for today</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scheduled Maintenance */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-4 w-4"/> Scheduled Maintenance</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {maintenance.filter(m => m.status !== 'completed').length ? maintenance.filter(m => m.status !== 'completed').map(m => (
                    <div key={m._id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium">{m.type}</div>
                        <Badge className={getPriorityColor(m.priority)}>{m.priority}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">{m.description}</div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Asset: {assets.find(a => a._id === m.assetId)?.name || 'Unknown'}</span>
                        {m.scheduledDate && <span>Due: {new Date(m.scheduledDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-muted-foreground">No scheduled maintenance</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assets */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Building className="h-4 w-4"/> Assets</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {assets.length ? assets.map(a => (
                    <div key={a._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{a.name}</div>
                        <div className="text-sm text-muted-foreground">{a.type} • {a.location}</div>
                        {a.warrantyExpiry && (
                          <div className="text-xs text-muted-foreground">
                            Warranty: {new Date(a.warrantyExpiry).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <Badge className={getStatusColor(a.status)}>{a.status}</Badge>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-muted-foreground">No assets registered</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {toast && <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg">{toast}</div>}
      </div>
    </div>
  );
}