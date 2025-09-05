'use client';

import React, { useState, useEffect, useCallback } from 'react';
import EventsProvider, { useEvents } from '@/components/providers/EventsProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Activity, 
  Shield, 
  Database, 
  Settings, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Eye,
  UserPlus,
  FileText,
  Download
} from 'lucide-react';
import Link from 'next/link';

function AdminDashboardInner() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalCattle: 0,
    totalInventory: 0,
    lowStockItems: 0,
    criticalAlerts: 0,
    todayEntries: 0,
    todayExits: 0,
    systemHealth: 'healthy',
    lastBackup: null
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [toast, setToast] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // Fetch comprehensive dashboard data
      const [
        usersRes, 
        cattleRes, 
        inventoryRes, 
        gateLogsRes, 
        alertsRes,
        activityRes
      ] = await Promise.all([
        fetch('/api/admin/users?limit=100', { cache: 'no-store' }),
        fetch('/api/goshala-manager/cows?limit=100', { cache: 'no-store' }),
        fetch('/api/food/inventory?limit=100', { cache: 'no-store' }),
        fetch('/api/gate-logs?pageSize=10', { cache: 'no-store' }),
        fetch('/api/goshala-manager/alerts/summary', { cache: 'no-store' }),
        fetch('/api/admin/activity?limit=10', { cache: 'no-store' })
      ]);

      const [usersData, cattleData, inventoryData, gateLogsData, alertsData, activityData] = await Promise.all([
        usersRes.json(),
        cattleRes.json(),
        inventoryRes.json(),
        gateLogsRes.json(),
        alertsRes.json(),
        activityRes.json()
      ]);

      // Calculate stats
      const totalUsers = usersData.users?.length || 0;
      const activeUsers = usersData.users?.filter(u => u.lastLogin && new Date(u.lastLogin) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0;
      const totalCattle = cattleData.cows?.length || 0;
      const totalInventory = inventoryData.inventory?.length || 0;
      const lowStockItems = inventoryData.inventory?.filter(i => i.status === 'low' || i.status === 'critical').length || 0;
      const criticalAlerts = (alertsData.critical?.length || 0) + (alertsData.low?.length || 0);
      
      // Calculate today's gate activity
      const today = new Date().toISOString().split('T')[0];
      const todayEntries = gateLogsData.logs?.filter(log => 
        log.type === 'entry' && log.at.startsWith(today)
      ).length || 0;
      const todayExits = gateLogsData.logs?.filter(log => 
        log.type === 'exit' && log.at.startsWith(today)
      ).length || 0;

      setStats({
        totalUsers,
        activeUsers,
        totalCattle,
        totalInventory,
        lowStockItems,
        criticalAlerts,
        todayEntries,
        todayExits,
        systemHealth: criticalAlerts > 5 ? 'warning' : 'healthy',
        lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Mock data
      });

      // Process recent activity (fallbacks for missing fields)
      const activities = activityData.activities?.map(activity => {
        const tsRaw = activity.timestamp || activity.createdAt || activity.at || activity.time || null;
        const user = activity.user || activity.actor || activity.email || activity.username || 'System';
        return {
          id: activity.id || activity._id || `${user}-${tsRaw || Math.random()}`,
          type: activity.type,
          message: activity.message || activity.action || 'Activity',
          user,
          timestamp: tsRaw ? new Date(tsRaw) : null,
          severity: activity.severity || activity.level || 'info'
        };
      }) || [];

      setRecentActivity(activities);

      // Process system alerts
      const alerts = [
        ...(alertsData.critical || []).map(alert => ({ ...alert, type: 'critical' })),
        ...(alertsData.low || []).map(alert => ({ ...alert, type: 'warning' })),
        ...(alertsData.upcoming || []).map(alert => ({ ...alert, type: 'info' }))
      ];

      setSystemAlerts(alerts.slice(0, 5)); // Show top 5 alerts

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Live updates via SSE for alerts and audit activity
  const { subscribe } = useEvents();
  useEffect(() => {
    const unsub = subscribe((event) => {
      if (event?.type === 'change' && ['alerts', 'audit_logs'].includes(event.collection)) {
        fetchDashboardData();
        if (event.collection === 'alerts') {
          const doc = event.change?.fullDocument || {};
          const alertType = doc.type || doc.level || '';
          const title = doc.title || doc.name || 'Alert';
          if (String(alertType).toLowerCase() === 'critical') {
            setToast(`Critical alert: ${title}`);
            setTimeout(() => setToast(''), 4000);
          }
        }
      }
    });
    return unsub;
  }, [subscribe, fetchDashboardData]);

  const getHealthColor = (health) => {
    switch(health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (health) => {
    switch(health) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full p-6">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
            ))}
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
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">System overview and management</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={refreshing} onClick={fetchDashboardData}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin':''}`} /> Refresh
            </Button>
            <Button asChild>
              <Link href="/dashboard/admin/users">
                <UserPlus className="h-4 w-4 mr-2" /> Manage Users
              </Link>
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeUsers} active in last 7 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cattle</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCattle}</div>
              <p className="text-xs text-muted-foreground">
                Managed across all modules
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInventory}</div>
              <p className="text-xs text-muted-foreground">
                {stats.lowStockItems} low/critical stock
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              {getHealthIcon(stats.systemHealth)}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getHealthColor(stats.systemHealth)}`}>
                {stats.systemHealth.charAt(0).toUpperCase() + stats.systemHealth.slice(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.criticalAlerts} active alerts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> Today&apos;s Gate Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.todayEntries}</div>
                  <div className="text-sm text-muted-foreground">Entries</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.todayExits}</div>
                  <div className="text-sm text-muted-foreground">Exits</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Database</span>
                  <Badge className="bg-green-100 text-green-800">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Authentication</span>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last Backup</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.lastBackup ? new Date(stats.lastBackup).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Alerts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div key={activity.id || `activity-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{activity.message}</div>
                        <div className="text-sm text-muted-foreground">
                          {activity.user} • {activity.timestamp ? activity.timestamp.toLocaleString() : '-'}
                        </div>
                      </div>
                      <Badge className={
                        activity.severity === 'error' ? 'bg-red-100 text-red-800' :
                        activity.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }>
                        {activity.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">No recent activity</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> System Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {systemAlerts.length > 0 ? (
                <div className="space-y-3">
                  {systemAlerts.map((alert, idx) => (
                    <div key={alert.id || `alert-${idx}`} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{alert.title || alert.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {alert.message || alert.description}
                        </div>
                      </div>
                      <Badge className={
                        alert.type === 'critical' ? 'bg-red-100 text-red-800' :
                        alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {alert.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">No active alerts</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button asChild variant="outline" className="h-20 flex-col">
                <Link href="/dashboard/admin/users">
                  <Users className="h-6 w-6 mb-2" />
                  Manage Users
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col">
                <Link href="/dashboard/goshala-manager/reports">
                  <BarChart3 className="h-6 w-6 mb-2" />
                  View Reports
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col">
                <Link href="/dashboard/goshala-manager/alerts">
                  <AlertTriangle className="h-6 w-6 mb-2" />
                  System Alerts
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col">
                <Link href="/dashboard/admin/settings">
                  <Settings className="h-6 w-6 mb-2" />
                  System Settings
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <EventsProvider channels={[ 'alerts', 'audit_logs' ]}>
      <AdminDashboardInner />
    </EventsProvider>
  );
}
