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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Save,
  ArrowLeft,
  Truck,
  User,
  Phone,
  Mail,
  MapPin,
  Star
} from 'lucide-react';
import Link from 'next/link';

export default function AddSupplierPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    foodTypes: [],
    rating: 5,
    isActive: true,
    notes: ''
  });

  const foodTypeOptions = [
    'hay', 'grass', 'fodder', 'silage', 'concentrate', 
    'supplement', 'minerals', 'vitamins'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFoodTypeChange = (foodType, checked) => {
    setFormData(prev => ({
      ...prev,
      foodTypes: checked 
        ? [...prev.foodTypes, foodType]
        : prev.foodTypes.filter(type => type !== foodType)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.contactPerson || !formData.phone) {
      // Validation error - will be handled by form validation
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/food/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Success - redirect to suppliers page
        router.push('/dashboard/food-manager/suppliers');
      } else {
        console.error('Error adding supplier:', data.error);
        // Error will be handled by toast system
      }
    } catch (error) {
      console.error('Error adding supplier:', error);
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
            <Link href="/dashboard/food-manager/suppliers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Suppliers
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Add Supplier</h1>
            <p className="text-muted-foreground">
              Add a new food supplier to your system
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Supplier Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter company name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person *</Label>
                <Input
                  id="contactPerson"
                  placeholder="Enter contact person name"
                  value={formData.contactPerson}
                  onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="Enter supplier address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Food Types</Label>
                <div className="grid grid-cols-2 gap-2">
                  {foodTypeOptions.map((foodType) => (
                    <div key={foodType} className="flex items-center space-x-2">
                      <Checkbox
                        id={foodType}
                        checked={formData.foodTypes.includes(foodType)}
                        onCheckedChange={(checked) => handleFoodTypeChange(foodType, checked)}
                      />
                      <Label htmlFor={foodType} className="text-sm font-normal capitalize">
                        {foodType}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rating">Rating</Label>
                  <Select value={formData.rating.toString()} onValueChange={(value) => handleInputChange('rating', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Star</SelectItem>
                      <SelectItem value="2">2 Stars</SelectItem>
                      <SelectItem value="3">3 Stars</SelectItem>
                      <SelectItem value="4">4 Stars</SelectItem>
                      <SelectItem value="5">5 Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                    />
                    <Label htmlFor="isActive" className="text-sm font-normal">
                      Active Supplier
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes about this supplier..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Truck className="h-4 w-4 mr-2 animate-pulse" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Add Supplier
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/food-manager/suppliers">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
