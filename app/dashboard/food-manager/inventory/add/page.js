'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Save,
  ArrowLeft,
  Package,
  Calendar,
  DollarSign,
  Truck
} from 'lucide-react';
import Link from 'next/link';

export default function AddInventoryPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    quantity: '',
    unit: 'kg',
    status: 'healthy',
    supplier: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    cost: '',
    location: '',
    notes: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type || !formData.quantity) {
      // Validation error - will be handled by form validation
      return;
    }

    try {
      setLoading(true);
      const csrfRes = await fetch('/api/csrf', { credentials: 'same-origin' });
      const { token } = await csrfRes.json();
      const response = await fetch('/api/food/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-CSRF-Token': token } : {})
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          ...formData,
          quantity: formData.quantity === '' ? undefined : parseFloat(formData.quantity),
          cost: formData.cost === '' ? 0 : parseFloat(formData.cost),
          purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : undefined,
          expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success - redirect to inventory page
        router.push('/dashboard/food-manager/inventory');
      } else {
        console.error('Error adding inventory item:', data.error);
        // Error will be handled by toast system
      }
    } catch (error) {
      console.error('Error adding inventory item:', error);
      // Error will be handled by toast system
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/food-manager/inventory">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inventory
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Add Inventory Item</h1>
            <p className="text-muted-foreground">
              Add a new item to your food inventory
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter item name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Food Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select food type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hay">Hay</SelectItem>
                      <SelectItem value="grass">Grass</SelectItem>
                      <SelectItem value="fodder">Fodder</SelectItem>
                      <SelectItem value="silage">Silage</SelectItem>
                      <SelectItem value="concentrate">Concentrate</SelectItem>
                      <SelectItem value="supplement">Supplement</SelectItem>
                      <SelectItem value="minerals">Minerals</SelectItem>
                      <SelectItem value="vitamins">Vitamins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Enter quantity"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={formData.unit} onValueChange={(value) => handleInputChange('unit', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="liters">Liters</SelectItem>
                      <SelectItem value="bundles">Bundles</SelectItem>
                      <SelectItem value="bags">Bags</SelectItem>
                      <SelectItem value="packets">Packets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
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
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  placeholder="Enter supplier name"
                  value={formData.supplier}
                  onChange={(e) => handleInputChange('supplier', e.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost (Optional)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter cost"
                    value={formData.cost}
                    onChange={(e) => handleInputChange('cost', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Storage Location</Label>
                  <Input
                    id="location"
                    placeholder="Enter storage location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes about this item..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Package className="h-4 w-4 mr-2 animate-pulse" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Add Inventory Item
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/food-manager/inventory">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
