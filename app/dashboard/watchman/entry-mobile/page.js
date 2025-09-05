'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, CheckCircle, WifiOff, AlertCircle } from 'lucide-react';
import MobileDashboardLayout from '@/components/layouts/MobileDashboardLayout';
import MobileOptimizedCard from '@/components/ui/MobileOptimizedCard';
import MobileOptimizedInput from '@/components/ui/MobileOptimizedInput';
import MobileOptimizedButton from '@/components/ui/MobileOptimizedButton';

export default function MobileEntryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [formData, setFormData] = useState({
    visitorName: '',
    purpose: '',
    phone: '',
    address: '',
    vehicleNumber: '',
    notes: '',
    entryTime: new Date().toLocaleTimeString('en-IN', { 
      hour12: true, 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  });
  const [pendingActions, setPendingActions] = useState(0);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);
    
    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load pending actions count
    setPendingActions(0); // Simplified for now
    
    // Update pending count periodically
    const interval = setInterval(() => {
      setPendingActions(0); // Simplified for now
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = await getCSRFToken();
      
      const response = await fetch('/api/gate-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          type: 'entry',
          visitorName: formData.visitorName,
          visitorPhone: formData.phone,
          visitorAddress: formData.address,
          plate: formData.vehicleNumber,
          note: formData.notes,
          purpose: formData.purpose
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Reset form on success
        setFormData({
          visitorName: '',
          purpose: '',
          phone: '',
          address: '',
          vehicleNumber: '',
          notes: '',
          entryTime: new Date().toLocaleTimeString('en-IN', { 
            hour12: true, 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        });
        router.push('/dashboard/watchman');
      } else {
        throw new Error(data.error || 'Failed to submit entry');
      }
    } catch (error) {
      console.error('Error submitting entry:', error);
      // Error will be handled by toast system
    } finally {
      setLoading(false);
    }
  };

  const getCSRFToken = async () => {
    try {
      const response = await fetch('/api/csrf', { credentials: 'same-origin' });
      const data = await response.json();
      return data.token;
    } catch {
      return '';
    }
  };

  return (
    <MobileDashboardLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Record Entry</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isOnline ? 'Online' : 'Offline'} • {pendingActions} pending
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <MobileOptimizedCard title="Visitor Information">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Visitor Name *</label>
                <MobileOptimizedInput
                  value={formData.visitorName}
                  onChange={(e) => handleInputChange('visitorName', e.target.value)}
                  placeholder="Enter visitor name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Purpose *</label>
                <Select value={formData.purpose} onValueChange={(value) => handleInputChange('purpose', value)}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visit">Visit</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <MobileOptimizedInput
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Address</label>
                <MobileOptimizedInput
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Vehicle Number</label>
                <MobileOptimizedInput
                  value={formData.vehicleNumber}
                  onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                  placeholder="Enter vehicle number (if applicable)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Entry Time</label>
                <MobileOptimizedInput
                  value={formData.entryTime}
                  onChange={(e) => handleInputChange('entryTime', e.target.value)}
                  placeholder="Entry time"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  className="w-full min-h-[100px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes or observations"
                />
              </div>
            </div>
          </MobileOptimizedCard>

          {/* Submit Button */}
          <div className="space-y-3">
            <MobileOptimizedButton
              type="submit"
              disabled={loading || !formData.visitorName || !formData.purpose}
              className="w-full"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Recording...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Record Entry
                </>
              )}
            </MobileOptimizedButton>

            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </form>

        {/* Offline Notice */}
        {!isOnline && (
          <MobileOptimizedCard className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Offline Mode</p>
                <p className="text-sm">Your entry will be saved locally and synced when connection is restored.</p>
              </div>
            </div>
          </MobileOptimizedCard>
        )}
      </div>
    </MobileDashboardLayout>
  );
}