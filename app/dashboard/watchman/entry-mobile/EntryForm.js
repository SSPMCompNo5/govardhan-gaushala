'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileDashboardLayout, MobileOptimizedCard, MobileOptimizedButton } from '@/components/mobile/MobileDashboardLayout';
import { MobileOptimizedInput } from '@/components/mobile/MobileOptimizedButton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  UserCheck, 
  Clock, 
  MapPin, 
  FileText, 
  Camera, 
  WifiOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import offlineSyncService from '@/lib/offlineSync';
import notificationService from '@/lib/notifications';
import { addCSRFHeader } from '@/lib/http';

export function EntryForm() {
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
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      
      // Listen for online/offline events
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      // Load pending actions count
      setPendingActions(offlineSyncService.getPendingCount());
      
      // Update pending count periodically
      const interval = setInterval(() => {
        setPendingActions(offlineSyncService.getPendingCount());
      }, 5000);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(interval);
      };
    }
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const entryData = {
        ...formData,
        type: 'entry',
        at: new Date().toISOString(),
        recordedBy: 'watchman' // This would come from session in real app
      };

      if (isOnline) {
        // Try to submit directly
        const response = await fetch('/api/gate-logs', {
          method: 'POST',
          headers: addCSRFHeader({
            'Content-Type': 'application/json',
            method: 'POST'
          }),
          credentials: 'same-origin',
          body: JSON.stringify(entryData)
        });

        if (response.ok) {
          // Success - show notification and redirect
          await notificationService.showVisitorNotification({
            id: Date.now(),
            name: formData.visitorName,
            purpose: formData.purpose,
            entryTime: formData.entryTime
          });
          
          router.push('/dashboard/watchman');
        } else {
          throw new Error('Failed to submit entry');
        }
      } else {
        // Queue for offline sync
        const actionId = offlineSyncService.queueAction(
          offlineSyncService.createGateLogAction('entry', entryData)
        );
        
        console.log('Entry queued for offline sync:', actionId);
        
        // Show offline notification
        await notificationService.showNotification(
          'Entry Recorded Offline',
          {
            body: `${formData.visitorName}'s entry will be synced when connection is restored`,
            tag: `offline-entry-${actionId}`
          }
        );
        
        router.push('/dashboard/watchman');
      }
    } catch (error) {
      console.error('Error submitting entry:', error);
      // Error will be handled by toast system
    } finally {
      setLoading(false);
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

          <MobileOptimizedButton
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Recording Entry...' : 'Record Entry'}
          </MobileOptimizedButton>
        </form>
      </div>
    </MobileDashboardLayout>
  );
}