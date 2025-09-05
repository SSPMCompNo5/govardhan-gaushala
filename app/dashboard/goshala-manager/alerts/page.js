'use client';

import { RefreshCw, Activity, AlertTriangle, Bell, CheckCircle, XCircle, Clock, Package, Heart, Wrench } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useCallback } from 'react';

export default function AlertsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState({ 
    low: [], critical: [], upcoming: [], maintenance: [], health: [], financial: []
  });
  const [toast, setToast] = useState('');

  const getCSRF = () => {
    try { const m=document.cookie.match(/(?:^|; )csrftoken=([^;]+)/); return m?decodeURIComponent(m[1]):''; } catch { return ''; }
  };

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/goshala-manager/alerts/summary', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setAlerts(data);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAsRead = async (alertId, type) => {
    try {
      const res = await fetch('/api/goshala-manager/alerts/mark-read', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() }, 
        credentials: 'same-origin', body: JSON.stringify({ alertId, type })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error||'Failed');
      setToast('Alert marked as read');
      load();
    } catch(e) { setToast(String(e.message||e)); }
  };

  const getAlertIcon = (type) => {
    switch(type) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'low': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'upcoming': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'maintenance': return <Wrench className="h-4 w-4 text-orange-500" />;
      case 'health': return <Heart className="h-4 w-4 text-pink-500" />;
      case 'financial': return <Package className="h-4 w-4 text-green-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertColor = (type) => {
    switch(type) {
      case 'critical': return 'border-red-200 bg-red-50';
      case 'low': return 'border-yellow-200 bg-yellow-50';
      case 'upcoming': return 'border-blue-200 bg-blue-50';
      case 'maintenance': return 'border-orange-200 bg-orange-50';
      case 'health': return 'border-pink-200 bg-pink-50';
      case 'financial': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getPriorityBadge = (priority) => {
    switch(priority) {
      case 'high': return <Badge className="bg-red-100 text-red-800">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low': return <Badge className="bg-green-100 text-green-800">Low</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-800">Normal</Badge>;
    }
  };

  const totalAlerts = Object.values(alerts).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5"/> Alerts & Notifications
            {totalAlerts > 0 && (
              <Badge className="bg-red-100 text-red-800">{totalAlerts}</Badge>
            )}
          </h1>
          <Button variant="outline" disabled={refreshing} onClick={load}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin':''}`} /> Refresh
          </Button>
        </div>

        {/* Critical Alerts */}
        {alerts.critical.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <XCircle className="h-5 w-5" /> Critical Alerts ({alerts.critical.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.critical.map((alert, idx) => (
                  <div key={`critical-${idx}`} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-white">
                    <div className="flex items-center gap-3">
                      {getAlertIcon('critical')}
                      <div>
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-sm text-muted-foreground">{alert.message}</div>
                        {alert.details && <div className="text-xs text-muted-foreground mt-1">{alert.details}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(alert.priority)}
                      <Button size="sm" variant="outline" onClick={() => markAsRead(alert.id, 'critical')}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Mark Read
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Low Stock Alerts */}
        {alerts.low.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" /> Low Stock Alerts ({alerts.low.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.low.map((item, idx) => (
                  <div key={`low-${idx}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getAlertIcon('low')}
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Current: {item.quantity} {item.unit} • Min Required: {item.minRequired} {item.unit}
                        </div>
                        {item.supplier && <div className="text-xs text-muted-foreground mt-1">Supplier: {item.supplier}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(item.priority)}
                      <Button size="sm" variant="outline" onClick={() => markAsRead(item.id, 'low')}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Mark Read
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Vaccinations */}
        {alerts.upcoming.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" /> Upcoming Vaccinations ({alerts.upcoming.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.upcoming.map((vaccination, idx) => (
                  <div key={`upcoming-${idx}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getAlertIcon('upcoming')}
                      <div>
                        <div className="font-medium">{vaccination.vaccine}</div>
                        <div className="text-sm text-muted-foreground">
                          Cow: {vaccination.tagId} • Due: {new Date(vaccination.scheduledAt).toLocaleDateString()}
                        </div>
                        {vaccination.notes && <div className="text-xs text-muted-foreground mt-1">{vaccination.notes}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(vaccination.priority)}
                      <Button size="sm" variant="outline" onClick={() => markAsRead(vaccination.id, 'upcoming')}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Mark Read
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Maintenance Alerts */}
        {alerts.maintenance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-500" /> Maintenance Alerts ({alerts.maintenance.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.maintenance.map((maintenance, idx) => (
                  <div key={`maintenance-${idx}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getAlertIcon('maintenance')}
                      <div>
                        <div className="font-medium">{maintenance.assetName}</div>
                        <div className="text-sm text-muted-foreground">
                          {maintenance.type} • Due: {new Date(maintenance.dueDate).toLocaleDateString()}
                        </div>
                        {maintenance.description && <div className="text-xs text-muted-foreground mt-1">{maintenance.description}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(maintenance.priority)}
                      <Button size="sm" variant="outline" onClick={() => markAsRead(maintenance.id, 'maintenance')}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Mark Read
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Health Alerts */}
        {alerts.health.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" /> Health Alerts ({alerts.health.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.health.map((health, idx) => (
                  <div key={`health-${idx}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getAlertIcon('health')}
                      <div>
                        <div className="font-medium">{health.cowName || health.tagId}</div>
                        <div className="text-sm text-muted-foreground">
                          {health.condition} • {health.severity}
                        </div>
                        {health.treatment && <div className="text-xs text-muted-foreground mt-1">Treatment: {health.treatment}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(health.priority)}
                      <Button size="sm" variant="outline" onClick={() => markAsRead(health.id, 'health')}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Mark Read
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Alerts */}
        {alerts.financial.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-500" /> Financial Alerts ({alerts.financial.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.financial.map((financial, idx) => (
                  <div key={`financial-${idx}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getAlertIcon('financial')}
                      <div>
                        <div className="font-medium">{financial.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {financial.type} • Amount: ₹{Number(financial.amount).toLocaleString()}
                        </div>
                        {financial.description && <div className="text-xs text-muted-foreground mt-1">{financial.description}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(financial.priority)}
                      <Button size="sm" variant="outline" onClick={() => markAsRead(financial.id, 'financial')}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Mark Read
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Alerts */}
        {totalAlerts === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium mb-2">All Clear!</h3>
              <p className="text-muted-foreground">No alerts or notifications at this time.</p>
            </CardContent>
          </Card>
        )}

        {toast && <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg">{toast}</div>}
      </div>
    </div>
  );
}


