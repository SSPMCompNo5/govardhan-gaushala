'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  RefreshCw, 
  PlusCircle, 
  Search, 
  Edit, 
  Trash2, 
  AlertTriangle,
  Package,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { FoodTypes, UnitTypes, StockStatus } from '@/lib/foodConstants';
// client-side will read csrftoken cookie for bulk upload

export default function InventoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Fetch inventory data
  const fetchInventory = useCallback(async () => {
    try {
      setRefreshing(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...filters
      });

      const response = await fetch(`/api/food/inventory?${params}` , { cache: 'no-store', credentials: 'same-origin' });
      const data = await response.json();

      if (response.ok) {
        setInventory(data.inventory || []);
        setPagination(data.pagination || {});
      } else {
        throw new Error(data.error || 'Failed to fetch inventory');
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      showToast('Failed to fetch inventory', 'error');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [currentPage, filters]);

  // Load data on mount and when filters change
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const handleEditSubmit = async (formData) => {
    try {
      const payload = { ...formData };
      if (payload.quantity !== undefined && payload.quantity !== null && payload.quantity !== '') {
        const q = typeof payload.quantity === 'string' ? parseFloat(payload.quantity) : payload.quantity;
        if (!Number.isNaN(q)) payload.quantity = q;
      } else {
        delete payload.quantity;
      }
      if (payload.expiryDate) {
        // Convert YYYY-MM-DD to Date
        const d = new Date(payload.expiryDate);
        if (!Number.isNaN(d.getTime())) payload.expiryDate = d;
        else delete payload.expiryDate;
      }
      if (payload.purchaseDate) {
        const d = new Date(payload.purchaseDate);
        if (!Number.isNaN(d.getTime())) payload.purchaseDate = d;
        else delete payload.purchaseDate;
      }
      // Drop empty strings so partial schema doesn't reject
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') delete payload[k];
      });
      const response = await fetch('/api/food/inventory', {
        method: 'PATCH',
        headers: addCSRFHeader({
          'Content-Type': 'application/json',
          method: 'PATCH'
        }),
        credentials: 'same-origin',
        body: JSON.stringify({ id: selectedItem._id, ...payload })
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Inventory item updated successfully');
        setEditDialogOpen(false);
        setSelectedItem(null);
        fetchInventory();
      } else {
        throw new Error(data.error || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      showToast(error.message, 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await fetch(`/api/food/inventory?id=${selectedItem._id}`, {
        method: 'DELETE',
        headers: addCSRFHeader({
          'Content-Type': 'application/json',
          method: 'DELETE'
        }),
        credentials: 'same-origin',
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Inventory item deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedItem(null);
        fetchInventory();
      } else {
        throw new Error(data.error || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      showToast(error.message, 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'destructive';
      case 'low': return 'warning';
      case 'healthy': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'low': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Package className="h-4 w-4 text-green-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full p-6">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/food-manager">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Inventory Management</h1>
              <p className="text-muted-foreground">
                Manage food inventory and track stock levels
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchInventory}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/dashboard/food-manager/inventory/add">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Item
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or supplier..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="healthy">Healthy</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Food Type</label>
                <Select value={filters.type || 'all'} onValueChange={(value) => handleFilterChange('type', value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {Object.values(FoodTypes).map(type => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Inventory Items</CardTitle>
                <p className="text-muted-foreground">
                  {pagination.total || 0} items found
                </p>
              </div>
              <BulkUpload onUploaded={fetchInventory} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.length > 0 ? (
                    inventory.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="capitalize">{item.type}</TableCell>
                        <TableCell>
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            <Badge variant={getStatusColor(item.status)}>
                              {item.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{item.supplier || '-'}</TableCell>
                        <TableCell>
                          {item.expiryDate ? 
                            new Date(item.expiryDate).toLocaleDateString() : 
                            '-'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <p className="text-muted-foreground">No inventory items found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.pages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setCurrentPage(pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => setCurrentPage(pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Inventory Item</DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <EditInventoryForm
                item={selectedItem}
                onSubmit={handleEditSubmit}
                onCancel={() => setEditDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Inventory Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
                             <p>Are you sure you want to delete &quot;{selectedItem?.name}&quot;?</p>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                >
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Toast Notification */}
        {toast.show && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}

// Edit Inventory Form Component
function EditInventoryForm({ item, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: item.name || '',
    type: item.type || '',
    quantity: item.quantity || '',
    unit: item.unit || 'kg',
    status: item.status || 'healthy',
    supplier: item.supplier || '',
    expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
    notes: item.notes || ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.type) newErrors.type = 'Food type is required';
    if (!formData.quantity || formData.quantity <= 0) newErrors.quantity = 'Valid quantity is required';
    if (!formData.unit) newErrors.unit = 'Unit is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <Input
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Item name"
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Food Type</label>
        <Select value={formData.type} onValueChange={(value) => handleChange('type', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select food type" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(FoodTypes).map(type => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Quantity</label>
          <Input
            type="number"
            value={(Number.isFinite(formData.quantity) ? String(formData.quantity) : (formData.quantity === '' || formData.quantity === undefined ? '' : String(formData.quantity)))}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') handleChange('quantity', '');
              else {
                const n = parseFloat(v);
                handleChange('quantity', Number.isNaN(n) ? '' : n);
              }
            }}
            placeholder="0"
            min="0"
            step="0.01"
          />
          {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Unit</label>
          <Select value={formData.unit} onValueChange={(value) => handleChange('unit', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(UnitTypes).map(unit => (
                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.unit && <p className="text-sm text-red-500">{errors.unit}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="healthy">healthy</SelectItem>
            <SelectItem value="low">low</SelectItem>
            <SelectItem value="critical">critical</SelectItem>
            <SelectItem value="out_of_stock">out of stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Supplier</label>
        <Input
          value={formData.supplier}
          onChange={(e) => handleChange('supplier', e.target.value)}
          placeholder="Supplier name"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Expiry Date</label>
        <Input
          type="date"
          value={formData.expiryDate}
          onChange={(e) => handleChange('expiryDate', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Additional notes..."
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          rows="3"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update Item'}
        </Button>
      </div>
    </form>
  );
}

// Bulk CSV Upload Component
function BulkUpload({ onUploaded }) {
	const [open, setOpen] = React.useState(false);
	const [uploading, setUploading] = React.useState(false);
	const [error, setError] = React.useState('');
	const [success, setSuccess] = React.useState('');
	const fileInputRef = React.useRef(null);

	const parseCsv = async (file) => {
		const text = await file.text();
		const lines = text.split(/\r?\n/).filter(l => l.trim().length);
		if (!lines.length) return [];
		let headers = lines[0].split(',').map(h => h.trim().toLowerCase());
		const expected = ['name','type','quantity','unit','supplier','expirydate','notes'];
		// Allow both expiryDate and expiry_date header variants
		headers = headers.map(h => h === 'expiry_date' ? 'expirydate' : h);
		const hasHeader = expected.every(h => headers.includes(h));
		const startIdx = hasHeader ? 1 : 0;
		if (!hasHeader && startIdx === 0) {
			// Assume default order without header
			headers = expected;
		}
		const rows = [];
		for (let i = startIdx; i < lines.length; i++) {
			const parts = lines[i].split(',');
			if (!parts.length) continue;
			const row = {};
			for (let j = 0; j < headers.length; j++) {
				row[headers[j]] = (parts[j] ?? '').trim();
			}
			if (!row.name) continue;
			const quantityNum = row.quantity ? parseFloat(row.quantity) : 0;
			rows.push({
				name: row.name,
				type: row.type,
				quantity: Number.isFinite(quantityNum) ? quantityNum : 0,
				unit: row.unit || 'kg',
				supplier: row.supplier || '',
				expiryDate: row.expirydate ? new Date(row.expirydate).toISOString() : null,
				notes: row.notes || ''
			});
		}
		return rows;
	};

	const getCsrfToken = () => {
		if (typeof document === 'undefined') return '';
		const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
		return m ? decodeURIComponent(m[1]) : '';
	};

	const onFileChange = async (e) => {
		setError('');
		setSuccess('');
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			setUploading(true);
			const rows = await parseCsv(file);
			if (!rows.length) {
				setError('No valid rows found in CSV');
				return;
			}
			const res = await fetch('/api/food/inventory/bulk', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRF-Token': getCsrfToken()
				},
				body: JSON.stringify(rows)
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Upload failed');
			setSuccess(`Uploaded: matched ${data.matched || 0}, upserted ${data.upserted || 0}, modified ${data.modified || 0}`);
			if (typeof onUploaded === 'function') onUploaded();
		} catch (err) {
			setError(err.message || 'Upload failed');
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = '';
		}
	};

	return (
		<div className="flex items-center gap-2">
			<input
				rev={fileInputRef}
				ref={fileInputRef}
				type="file"
				accept=".csv,text/csv"
				onChange={onFileChange}
				className="hidden"
			/>
			<Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
				{uploading ? 'Uploading…' : 'Bulk Upload CSV'}
			</Button>
			{error && <span className="text-sm text-red-500">{error}</span>}
			{success && <span className="text-sm text-green-600">{success}</span>}
		</div>
	);
}
