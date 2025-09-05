'use client';

import { RefreshCw, AlertTriangle, Bell, Check, X, Clock, Package, Shield, Calendar, Heart, Settings, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState, useCallback } from 'react';
import { addCSRFHeader } from '@/lib/http';

export default function DoctorAlertsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [toast, setToast] = useState('');
  const [filters, setFilters] = useState({
    status: 'open',
    type: '',
    priority: ''
  });
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolveDialog, setShowResolveDialog] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.type) params.set('type', filters.type);
      if (filters.priority) params.set('priority', filters.priority);

      const res = await fetch(`/api/doctor/alerts?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const getCSRF = () => {
    try {
      const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
      return m ? decodeURIComponent(m[1]) : '';
    } catch { return ''; }
  };

  const onResolveAlert = async (alertId, status) => {
    try {
      const res = await fetch('/api/doctor/alerts', {
        method: 'PATCH',
        headers: addCSRFHeader({
          'Content-Type': 'application/json',
          method: 'PATCH'
        }),
        credentials: 'same-origin',
        body: JSON.stringify({ 
          id: alertId, 
          status,
          notes: resolutionNotes 
        })
      });
      
      if (!res.ok) throw new Error('Failed to update alert');
      
      setToast(`Alert ${status === 'resolved' ? 'resolved' : 'dismissed'} successfully`);
      setShowResolveDialog(false);
      setSelectedAlert(null);
      setResolutionNotes('');
      load();
    } catch (e) {
      setToast(`Error: ${e.message}`);
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'lowStock': return Package;
      case 'expiring': return Clock;
      case 'treatment': return Shield;
      case 'vaccination': return Calendar;
      case 'critical': return Heart;
      default: return AlertTriangle;
    }
  };

  const getAlertColor = (type, priority) => {
    if (priority === 'critical') return 'destructive';
    if (priority === 'high') return 'secondary';
    
    switch (type) {
      case 'lowStock': return 'secondary';
      case 'expiring': return 'secondary';
      case 'treatment': return 'default';
      case 'vaccination': return 'outline';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const alertDate = new Date(date);
    const diffMs = now - alertDate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const openAlerts = alerts.filter(a => a.status === 'open').length;
  const criticalAlerts = alerts.filter(a => a.priority === 'critical' && a.status === 'open').length;
  const highPriorityAlerts = alerts.filter(a => a.priority === 'high' && a.status === 'open').length;

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8 text-blue-500" />
              Medical Alerts & Notifications
            </h1>
            <p className="text-muted-foreground">Monitor critical medical events and system notifications</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alert Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Email Notifications</Label>
                    <div className="mt-2 space-y-2">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked />
                        <span className="text-sm">Critical alerts</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked />
                        <span className="text-sm">Low stock medicines</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked />
                        <span className="text-sm">Upcoming vaccinations</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" />
                        <span className="text-sm">Treatment follow-ups</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <Label>Alert Frequency</Label>
                    <Select defaultValue="immediate">
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="hourly">Hourly Digest</SelectItem>
                        <SelectItem value="daily">Daily Digest</SelectItem>
                        <SelectItem value="weekly">Weekly Summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Alert Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Open Alerts</p>
                  <p className="text-2xl font-bold text-blue-600">{openAlerts}</p>
                </div>
                <Bell className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold text-red-600">{criticalAlerts}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                  <p className="text-2xl font-bold text-orange-600">{highPriorityAlerts}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Alerts</p>
                  <p className="text-2xl font-bold text-purple-600">{alerts.length}</p>
                </div>
                <Settings className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={value => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Alert Type</Label>
                <Select value={filters.type} onValueChange={value => setFilters(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="lowStock">Low Stock</SelectItem>
                    <SelectItem value="expiring">Expiring Medicine</SelectItem>
                    <SelectItem value="treatment">Treatment Alert</SelectItem>
                    <SelectItem value="vaccination">Vaccination Due</SelectItem>
                    <SelectItem value="critical">Critical Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={filters.priority} onValueChange={value => setFilters(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={load} className="w-full mt-2">
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map(alert => {
                  const Icon = getAlertIcon(alert.type);
                  const alertColor = getAlertColor(alert.type, alert.priority);
                  const priorityColor = getPriorityColor(alert.priority);
                  
                  return (
                    <div key={alert._id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Icon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{alert.type?.replace(/([A-Z])/g, ' $1').trim()}</h3>
                            <Badge variant={alertColor} className="text-xs">
                              {alert.status}
                            </Badge>
                            {alert.priority && (
                              <span className={`text-xs font-medium ${priorityColor}`}>
                                {alert.priority.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {alert.notes || alert.message || 'No additional details available'}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{formatTimeAgo(alert.at)}</span>
                            {alert.referenceIds && (
                              <span>
                                {alert.referenceIds.cowId && `Cow: ${alert.referenceIds.cowId}`}
                                {alert.referenceIds.medId && `Medicine ID: ${alert.referenceIds.medId}`}
                                {alert.referenceIds.treatmentId && `Treatment: ${alert.referenceIds.treatmentId}`}
                              </span>
                            )}
                          </div>
                          {alert.resolutionNotes && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                              <strong>Resolution:</strong> {alert.resolutionNotes}
                            </div>
                          )}
                        </div>
                      </div>
                      {alert.status === 'open' && (
                        <div className="flex items-center gap-2 ml-4">
                          <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedAlert(alert)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Resolve
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Resolve Alert</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Alert Details</Label>
                                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                                    <div><strong>Type:</strong> {selectedAlert?.type}</div>
                                    <div><strong>Created:</strong> {selectedAlert?.at && new Date(selectedAlert.at).toLocaleString()}</div>
                                    <div><strong>Message:</strong> {selectedAlert?.notes || 'No details'}</div>
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor="resolutionNotes">Resolution Notes</Label>
                                  <Textarea
                                    id="resolutionNotes"
                                    placeholder="Describe how this alert was resolved..."
                                    value={resolutionNotes}
                                    onChange={e => setResolutionNotes(e.target.value)}
                                    className="mt-2"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    onClick={() => onResolveAlert(selectedAlert?._id, 'resolved')}
                                    className="flex-1"
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Mark Resolved
                                  </Button>
                                  <Button 
                                    variant="outline"
                                    onClick={() => onResolveAlert(selectedAlert?._id, 'dismissed')}
                                    className="flex-1"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Dismiss
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No alerts found</h3>
                <p className="text-sm text-muted-foreground">
                  {filters.status === 'open' 
                    ? "All caught up! No pending alerts at the moment."
                    : "No alerts match your current filters."
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col" onClick={() => setFilters({ status: 'open', type: 'critical', priority: '' })}>
                <AlertTriangle className="h-6 w-6 mb-2 text-red-500" />
                Critical Alerts
              </Button>
              <Button variant="outline" className="h-20 flex-col" onClick={() => setFilters({ status: 'open', type: 'lowStock', priority: '' })}>
                <Package className="h-6 w-6 mb-2 text-orange-500" />
                Low Stock
              </Button>
              <Button variant="outline" className="h-20 flex-col" onClick={() => setFilters({ status: 'open', type: 'vaccination', priority: '' })}>
                <Calendar className="h-6 w-6 mb-2 text-blue-500" />
                Vaccination Due
              </Button>
              <Button variant="outline" className="h-20 flex-col" onClick={() => setFilters({ status: 'resolved', type: '', priority: '' })}>
                <Check className="h-6 w-6 mb-2 text-green-500" />
                Resolved
              </Button>
            </div>
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
