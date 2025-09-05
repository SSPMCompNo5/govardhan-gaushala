'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EntryPage() {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    type: 'entry',
    visitorName: '',
    visitorPhone: '',
    visitorAddress: '',
    plate: '',
    groupSize: '',
    note: ''
  });
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.visitorName.trim()) {
      newErrors.visitorName = 'Visitor name is required';
    }
    
    if (formData.visitorPhone && !/^\d{10}$/.test(formData.visitorPhone.replace(/\D/g, ''))) {
      newErrors.visitorPhone = 'Please enter a valid 10-digit phone number';
    }
    
    if (formData.plate && !/^[A-Z]{2}[ -]?[0-9]{2}[ -]?[A-Z]{1,2}[ -]?[0-9]{4}$/.test(formData.plate.toUpperCase())) {
      newErrors.plate = 'Please enter a valid license plate format (e.g., KA-01-AB-1234)';
    }
    
    if (formData.groupSize && (isNaN(formData.groupSize) || parseInt(formData.groupSize) < 1)) {
      newErrors.groupSize = 'Group size must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Get CSRF token
      const csrfRes = await fetch('/api/csrf', { credentials: 'same-origin' });
      const { token } = await csrfRes.json();

      // Prepare the data for API
      const payload = {
        type: 'entry',
        visitorName: formData.visitorName.trim(),
        visitorPhone: formData.visitorPhone ? formData.visitorPhone.replace(/\D/g, '') : undefined,
        visitorAddress: formData.visitorAddress.trim() || undefined,
        plate: formData.plate ? formData.plate.toUpperCase() : undefined,
        groupSize: formData.groupSize ? parseInt(formData.groupSize) : undefined,
        note: formData.note.trim() || undefined
      };

      const response = await fetch('/api/gate-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-CSRF-Token': token } : {})
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit entry');
      }
      
      // Reset form on success
      setFormData({
        type: 'entry',
        visitorName: '',
        visitorPhone: '',
        visitorAddress: '',
        plate: '',
        groupSize: '',
        note: ''
      });
      
      // Show success message
      // Toast will be handled by parent component
      
      // Redirect back to dashboard
      router.push('/dashboard/watchman');
      
    } catch (error) {
      console.error('Error submitting entry:', error);
      // Toast will be handled by parent component
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/watchman">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Entry</h1>
            <p className="text-muted-foreground">Record a new visitor entry</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Visitor Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="visitorName" className="block text-sm font-medium">
                  Visitor Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="visitorName"
                  name="visitorName"
                  value={formData.visitorName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className={errors.visitorName ? 'border-destructive' : ''}
                />
                {errors.visitorName && (
                  <p className="text-sm text-destructive">{errors.visitorName}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="visitorPhone" className="block text-sm font-medium">
                  Phone Number
                </label>
                <Input
                  id="visitorPhone"
                  name="visitorPhone"
                  type="tel"
                  value={formData.visitorPhone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className={errors.visitorPhone ? 'border-destructive' : ''}
                />
                {errors.visitorPhone && (
                  <p className="text-sm text-destructive">{errors.visitorPhone}</p>
                )}
                <small className="text-muted-foreground text-xs">10-digit number without spaces or special characters</small>
              </div>

              <div className="space-y-2">
                <label htmlFor="visitorAddress" className="block text-sm font-medium">
                  Address
                </label>
                <Input
                  id="visitorAddress"
                  name="visitorAddress"
                  value={formData.visitorAddress}
                  onChange={handleChange}
                  placeholder="123 Main Street, City"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="plate" className="block text-sm font-medium">
                  Vehicle Number
                </label>
                <Input
                  id="plate"
                  name="plate"
                  value={formData.plate}
                  onChange={handleChange}
                  placeholder="KA-01-AB-1234"
                  className={errors.plate ? 'border-destructive' : ''}
                />
                {errors.plate && (
                  <p className="text-sm text-destructive">{errors.plate}</p>
                )}
                <small className="text-muted-foreground text-xs">Format: AA-00-AA-0000 (spaces or hyphens allowed)</small>
              </div>

              <div className="space-y-2">
                <label htmlFor="groupSize" className="block text-sm font-medium">
                  Group Size
                </label>
                <Input
                  id="groupSize"
                  name="groupSize"
                  type="number"
                  min="1"
                  value={formData.groupSize}
                  onChange={handleChange}
                  placeholder="1"
                  className={errors.groupSize ? 'border-destructive' : ''}
                />
                {errors.groupSize && (
                  <p className="text-sm text-destructive">{errors.groupSize}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="note" className="block text-sm font-medium">
                  Additional Notes
                </label>
                <textarea
                  id="note"
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  placeholder="Purpose of visit, special instructions, etc."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows="3"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push('/dashboard/watchman')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Record Entry'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
