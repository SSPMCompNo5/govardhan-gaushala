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
  Calendar,
  Package,
  Users,
  Clock
} from 'lucide-react';
import Link from 'next/link';

export default function RecordFeedingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    foodType: '',
    quantity: '',
    unit: 'kg',
    cowGroup: '',
    feedingTime: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM format
    wastage: 0,
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
    
    if (!formData.foodType || !formData.quantity || !formData.cowGroup) {
      // Validation error - will be handled by form validation
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/food/feeding-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          quantity: parseFloat(formData.quantity),
          wastage: parseFloat(formData.wastage) || 0,
          feedingTime: new Date(formData.feedingTime).toISOString()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success - redirect to feedings page
        router.push('/dashboard/food-manager/feedings');
      } else {
        console.error('Error recording feeding:', data.error);
        // Error will be handled by toast system
      }
    } catch (error) {
      console.error('Error recording feeding:', error);
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
            <Link href="/dashboard/food-manager/feedings">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Feedings
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Record Feeding</h1>
            <p className="text-muted-foreground">
              Record a new feeding activity
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Feeding Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="foodType">Food Type *</Label>
                  <Select value={formData.foodType} onValueChange={(value) => handleInputChange('foodType', value)}>
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

                <div className="space-y-2">
                  <Label htmlFor="cowGroup">Cow Group *</Label>
                  <Select value={formData.cowGroup} onValueChange={(value) => handleInputChange('cowGroup', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cow group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calves">Calves</SelectItem>
                      <SelectItem value="lactating">Lactating</SelectItem>
                      <SelectItem value="dry">Dry</SelectItem>
                      <SelectItem value="bulls">Bulls</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="general">General</SelectItem>
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
                      <SelectItem value="g">Grams (g)</SelectItem>
                      <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                      <SelectItem value="tons">Tons</SelectItem>
                      <SelectItem value="bales">Bales</SelectItem>
                      <SelectItem value="bags">Bags</SelectItem>
                      <SelectItem value="liters">Liters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedingTime">Feeding Time *</Label>
                <Input
                  id="feedingTime"
                  type="datetime-local"
                  value={formData.feedingTime}
                  onChange={(e) => handleInputChange('feedingTime', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wastage">Wastage (Optional)</Label>
                <Input
                  id="wastage"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Enter wastage amount"
                  value={formData.wastage}
                  onChange={(e) => handleInputChange('wastage', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Amount of food that was wasted or not consumed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes about this feeding..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Record Feeding
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/food-manager/feedings">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
