'use client';

import { RefreshCw, Package, AlertTriangle, Plus, Search, Calendar, Clock, TrendingUp, FileText, Filter, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState, useCallback } from 'react';

export default function DoctorMedicinesPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [meds, setMeds] = useState([]);
  const [batches, setBatches] = useState([]);
  const [usageHistory, setUsageHistory] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    lowStockOnly: false,
    expiringSoon: false
  });

  const [medForm, setMedForm] = useState({ 
    name: '', 
    category: 'other', 
    unit: 'bottle', 
    minStock: 0, 
    notes: '' 
  });
  
  const [batchForm, setBatchForm] = useState({ 
    medId: '', 
    batchCode: '', 
    qty: 0, 
    unit: 'bottle', 
    expiryDate: '',
    supplierId: '',
    costPerUnit: 0
  });
  
  const [useForm, setUseForm] = useState({ 
    medId: '', 
    qty: 0, 
    unit: 'bottle', 
    tagId: '', 
    treatmentId: '' 
  });

  const [showMedDialog, setShowMedDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showUseDialog, setShowUseDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

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
      if (filters.search) params.set('search', filters.search);
      if (filters.category) params.set('category', filters.category);
      if (filters.lowStockOnly) params.set('lowStockOnly', 'true');
      
      const [medRes, batchRes, usageRes] = await Promise.all([
        fetch(`/api/doctor/medicines?${params.toString()}`, { cache: 'no-store' }),
        fetch('/api/doctor/medicines/batches', { cache: 'no-store' }),
        fetch('/api/doctor/medicines/usage', { cache: 'no-store' })
      ]);

      const [medData, batchData, usageData] = await Promise.all([
        medRes.json(),
        batchRes.json(),
        usageRes.json()
      ]);

      if (medRes.ok) setMeds(medData.medicines || []);
      if (batchRes.ok) setBatches(batchData.batches || []);
      if (usageRes.ok) setUsageHistory(usageData.usage || []);
    } catch (error) {
      console.error('Failed to load medicine data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const onCreateMedicine = async () => {
    try {
      const res = await fetch('/api/doctor/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin',
        body: JSON.stringify(medForm)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed');
      setToast('Medicine created successfully');
      setMedForm({ name: '', category: 'other', unit: 'bottle', minStock: 0, notes: '' });
      setShowMedDialog(false);
      load();
    } catch (e) { setToast(String(e.message||e)); }
  };

  const onAddBatch = async () => {
    try {
      const payload = { ...batchForm, receivedAt: new Date().toISOString() };
      const res = await fetch('/api/doctor/medicines/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed');
      setToast('Batch added successfully');
      setBatchForm({ medId: '', batchCode: '', qty: 0, unit: 'bottle', expiryDate: '', supplierId: '', costPerUnit: 0 });
      setShowBatchDialog(false);
      load();
    } catch (e) { setToast(String(e.message||e)); }
  };

  const onRecordUse = async () => {
    try {
      const res = await fetch('/api/doctor/medicines/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin',
        body: JSON.stringify(useForm)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed');
      setToast(`Usage recorded. Remaining stock: ${j.remainingQty}`);
      setUseForm({ medId: '', qty: 0, unit: 'bottle', tagId: '', treatmentId: '' });
      setShowUseDialog(false);
      load();
    } catch (e) { setToast(String(e.message||e)); }
  };

  const getStockStatus = (med) => {
    const stock = med.stockQty || 0;
    const minStock = med.minStock || 0;
    
    if (stock === 0) return { status: 'out', color: 'destructive' };
    if (stock <= minStock) return { status: 'low', color: 'secondary' };
    return { status: 'good', color: 'default' };
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'unknown', color: 'outline' };
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysToExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysToExpiry < 0) return { status: 'expired', color: 'destructive' };
    if (daysToExpiry <= 30) return { status: 'expiring', color: 'secondary' };
    return { status: 'good', color: 'default' };
  };

  const filteredMeds = meds.filter(med => {
    if (filters.lowStockOnly && (med.stockQty || 0) > (med.minStock || 0)) return false;
    return true;
  });

  const expiringMeds = meds.filter(med => {
    const batches = med.batches || [];
    return batches.some(batch => {
      const expiry = getExpiryStatus(batch.expiryDate);
      return expiry.status === 'expiring' || expiry.status === 'expired';
    });
  });

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8 text-purple-500" />
              Medicine Management
            </h1>
            <p className="text-muted-foreground">Track inventory, batches, and usage</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={showMedDialog} onOpenChange={setShowMedDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Medicine
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Medicine</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Medicine Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter medicine name"
                      value={medForm.name}
                      onChange={e => setMedForm(v => ({ ...v, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={medForm.category} onValueChange={value => setMedForm(v => ({ ...v, category: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="antibiotics">Antibiotics</SelectItem>
                        <SelectItem value="analgesic">Analgesic</SelectItem>
                        <SelectItem value="anti-inflammatory">Anti-inflammatory</SelectItem>
                        <SelectItem value="vitamins">Vitamins</SelectItem>
                        <SelectItem value="vaccines">Vaccines</SelectItem>
                        <SelectItem value="deworming">Deworming</SelectItem>
                        <SelectItem value="probiotic">Probiotic</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Input
                        id="unit"
                        placeholder="e.g., bottle, vial, tablet"
                        value={medForm.unit}
                        onChange={e => setMedForm(v => ({ ...v, unit: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="minStock">Minimum Stock</Label>
                      <Input
                        id="minStock"
                        type="number"
                        min="0"
                        value={medForm.minStock}
                        onChange={e => setMedForm(v => ({ ...v, minStock: Number(e.target.value || 0) }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes about the medicine"
                      value={medForm.notes}
                      onChange={e => setMedForm(v => ({ ...v, notes: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={onCreateMedicine} className="flex-1">
                      Create Medicine
                    </Button>
                    <Button variant="outline" onClick={() => setShowMedDialog(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Medicines</p>
                  <p className="text-2xl font-bold text-blue-600">{meds.length}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold text-red-600">
                    {meds.filter(m => getStockStatus(m).status === 'low' || getStockStatus(m).status === 'out').length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                  <p className="text-2xl font-bold text-orange-600">{expiringMeds.length}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Categories</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {new Set(meds.map(m => m.category)).size}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search Medicines</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name..."
                    className="pl-10"
                    value={filters.search}
                    onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="category">Category Filter</Label>
                <Select value={filters.category} onValueChange={value => setFilters(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="antibiotics">Antibiotics</SelectItem>
                    <SelectItem value="analgesic">Analgesic</SelectItem>
                    <SelectItem value="anti-inflammatory">Anti-inflammatory</SelectItem>
                    <SelectItem value="vitamins">Vitamins</SelectItem>
                    <SelectItem value="vaccines">Vaccines</SelectItem>
                    <SelectItem value="deworming">Deworming</SelectItem>
                    <SelectItem value="probiotic">Probiotic</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant={filters.lowStockOnly ? "default" : "outline"}
                  onClick={() => setFilters(prev => ({ ...prev, lowStockOnly: !prev.lowStockOnly }))}
                  className="w-full"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Low Stock Only
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

        {/* Medicine Inventory */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-500" />
              Medicine Inventory ({filteredMeds.length})
            </CardTitle>
            <div className="flex gap-2">
              <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Batch
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Medicine Batch</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="medSelect">Select Medicine</Label>
                      <Select value={batchForm.medId} onValueChange={value => setBatchForm(v => ({ ...v, medId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose medicine" />
                        </SelectTrigger>
                        <SelectContent>
                          {meds.map(med => (
                            <SelectItem key={med._id} value={med._id}>
                              {med.name} ({med.category})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="batchCode">Batch Code</Label>
                        <Input
                          id="batchCode"
                          placeholder="Enter batch code"
                          value={batchForm.batchCode}
                          onChange={e => setBatchForm(v => ({ ...v, batchCode: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input
                          id="expiryDate"
                          type="date"
                          value={batchForm.expiryDate}
                          onChange={e => setBatchForm(v => ({ ...v, expiryDate: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="qty">Quantity</Label>
                        <Input
                          id="qty"
                          type="number"
                          min="1"
                          value={batchForm.qty}
                          onChange={e => setBatchForm(v => ({ ...v, qty: Number(e.target.value || 0) }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="unit">Unit</Label>
                        <Input
                          id="unit"
                          placeholder="bottle, vial, etc."
                          value={batchForm.unit}
                          onChange={e => setBatchForm(v => ({ ...v, unit: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="costPerUnit">Cost Per Unit (Optional)</Label>
                      <Input
                        id="costPerUnit"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={batchForm.costPerUnit}
                        onChange={e => setBatchForm(v => ({ ...v, costPerUnit: Number(e.target.value || 0) }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={onAddBatch} className="flex-1">
                        Add Batch
                      </Button>
                      <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={showUseDialog} onOpenChange={setShowUseDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Record Usage
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Medicine Usage</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="medUseSelect">Select Medicine</Label>
                      <Select value={useForm.medId} onValueChange={value => setUseForm(v => ({ ...v, medId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose medicine" />
                        </SelectTrigger>
                        <SelectContent>
                          {meds.map(med => (
                            <SelectItem key={med._id} value={med._id}>
                              {med.name} (Stock: {med.stockQty || 0} {med.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="useQty">Quantity Used</Label>
                        <Input
                          id="useQty"
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={useForm.qty}
                          onChange={e => setUseForm(v => ({ ...v, qty: Number(e.target.value || 0) }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="useUnit">Unit</Label>
                        <Input
                          id="useUnit"
                          placeholder="bottle, ml, etc."
                          value={useForm.unit}
                          onChange={e => setUseForm(v => ({ ...v, unit: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="cowTag">Cow Tag ID</Label>
                      <Input
                        id="cowTag"
                        placeholder="Enter cow tag ID"
                        value={useForm.tagId}
                        onChange={e => setUseForm(v => ({ ...v, tagId: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="treatmentId">Treatment ID (Optional)</Label>
                      <Input
                        id="treatmentId"
                        placeholder="Link to specific treatment"
                        value={useForm.treatmentId}
                        onChange={e => setUseForm(v => ({ ...v, treatmentId: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={onRecordUse} className="flex-1">
                        Record Usage
                      </Button>
                      <Button variant="outline" onClick={() => setShowUseDialog(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMeds.length > 0 ? filteredMeds.map(med => {
                  const stockStatus = getStockStatus(med);
                  return (
                    <div key={med._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-medium">{med.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {med.category} • {med.stockQty || 0} {med.unit}
                              {med.minStock && ` • Min: ${med.minStock}`}
                            </p>
                            {med.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{med.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={stockStatus.color}>
                          {stockStatus.status === 'out' ? 'Out of Stock' :
                           stockStatus.status === 'low' ? 'Low Stock' : 'In Stock'}
                        </Badge>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedMedicine(med)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{selectedMedicine?.name} - Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <strong>Category:</strong> {selectedMedicine?.category}
                                </div>
                                <div>
                                  <strong>Unit:</strong> {selectedMedicine?.unit}
                                </div>
                                <div>
                                  <strong>Current Stock:</strong> {selectedMedicine?.stockQty || 0}
                                </div>
                                <div>
                                  <strong>Minimum Stock:</strong> {selectedMedicine?.minStock || 0}
                                </div>
                              </div>
                              {selectedMedicine?.notes && (
                                <div>
                                  <strong>Notes:</strong>
                                  <p className="text-sm text-muted-foreground mt-1">{selectedMedicine.notes}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No medicines found matching your filters
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Toast notification */}
        {toast && (
          <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg">
            {toast}
            <button
              onClick={() => setToast('')}
              className="ml-2 text-green-700 hover:text-green-900"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


