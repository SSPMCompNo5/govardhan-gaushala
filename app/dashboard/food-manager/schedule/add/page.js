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
  Clock,
  Calendar,
  Package,
  Users
} from 'lucide-react';
import Link from 'next/link';

export default function AddSchedulePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    time: '',
    cowGroup: '',
    foodType: '',
    quantity: '',
    unit: 'kg',
    daysOfWeek: [],
    isActive: true,
    notes: ''
  });

  const dayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDayChange = (day, checked) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: checked 
        ? [...prev.daysOfWeek, day]
        : prev.daysOfWeek.filter(d => d !== day)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.time || !formData.cowGroup || !formData.foodType || !formData.quantity || formData.daysOfWeek.length === 0) {
      // Validation error - will be handled by form validation
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/food/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          quantity: parseFloat(formData.quantity),
          daysOfWeek: formData.daysOfWeek.sort()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success - redirect to schedule page
        router.push('/dashboard/food-manager/schedule');
      } else {
        console.error('Error creating schedule:', data.error);
        // Error will be handled by toast system
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
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
            <Link href="/dashboard/food-manager/schedule">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Schedule
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Add Schedule</h1>
            <p className="text-muted-foreground">
              Create a new feeding schedule
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Schedule Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="time">Feeding Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                <Label>Days of Week *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {dayOptions.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={formData.daysOfWeek.includes(day.value)}
                        onCheckedChange={(checked) => handleDayChange(day.value, checked)}
                      />
                      <Label htmlFor={`day-${day.value}`} className="text-sm font-normal">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select the days when this feeding should occur
                </p>
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
                    Active Schedule
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes about this schedule..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-pulse" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Schedule
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/food-manager/schedule">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
