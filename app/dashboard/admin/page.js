'use client';

import React, { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
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
  UserPlus
} from 'lucide-react';
import Link from 'next/link';

// Memoized stat card for preventing unnecessary re-renders
const StatCard = memo(function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
});

// Memoized activity item
const ActivityItem = memo(function ActivityItem({ activity }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <div className="font-medium text-sm">{activity.message}</div>
        <div className="text-xs text-muted-foreground">
          {activity.user} • {activity.time}
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
  );
});

// Memoized alert item
const AlertItem = memo(function AlertItem({ alert }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <div className="font-medium text-sm">{alert.title || alert.name}</div>
        <div className="text-xs text-muted-foreground">
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
  );
});

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-6">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// Quick action button
const QuickAction = memo(function QuickAction({ href, icon: Icon, label }) {
  return (
    <Button asChild variant="outline" className="h-20 flex-col">
      <Link href={href}>
        <Icon className="h-6 w-6 mb-2" />
        {label}
      </Link>
    </Button>
  );
});

export default function AdminDashboard() {
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

  // Use ref to track if component is mounted
  const mountedRef = useRef(true);

  // Update cache logic - removed local ref

  const fetchDashboardData = useCallback(async (force = false) => {
    try {
      setRefreshing(true);

      const fetchJson = async (url) => {
        try {
          const res = await fetch(url, { cache: 'no-store' }); // Ensure fresh data
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (e) {
          console.warn(`Failed to fetch ${url}:`, e);
          return null;
        }
      };

      // Fetch aggregated stats from single optimized endpoint
      const dashboardData = await fetchJson('/api/admin/dashboard/stats');

      if (!mountedRef.current) return;

      if (dashboardData && dashboardData.stats) {
        setStats(dashboardData.stats);
        setRecentActivity(dashboardData.recentActivity || []);
        setSystemAlerts(dashboardData.systemAlerts || []);
      }

      // Stop here - data is already set
      setRefreshing(false);
      setLoading(false);
      return;


      // Legacy calculation logic removed - handled by API



      // Legacy processing removed



      // Cache update removed


    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    return () => { mountedRef.current = false; };
  }, [fetchDashboardData]);

  // Memoize health display
  const healthDisplay = useMemo(() => {
    const healthColor = stats.systemHealth === 'healthy' ? 'text-green-600' : 'text-yellow-600';
    const HealthIcon = stats.systemHealth === 'healthy' ? CheckCircle : AlertTriangle;
    return { healthColor, HealthIcon };
  }, [stats.systemHealth]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">System overview and management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={refreshing} onClick={() => fetchDashboardData(true)}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard/admin/users">
              <UserPlus className="h-4 w-4 mr-1" /> Users
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics - Using memoized cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          subtitle={`${stats.activeUsers} active in 7 days`}
          icon={Users}
        />
        <StatCard
          title="Total Cattle"
          value={stats.totalCattle}
          subtitle="Managed across all modules"
          icon={Activity}
        />
        <StatCard
          title="Inventory Items"
          value={stats.totalInventory}
          subtitle={`${stats.lowStockItems} low/critical stock`}
          icon={Database}
        />
        <StatCard
          title="System Health"
          value={stats.systemHealth.charAt(0).toUpperCase() + stats.systemHealth.slice(1)}
          subtitle={`${stats.criticalAlerts} active alerts`}
          icon={healthDisplay.HealthIcon}
          color={healthDisplay.healthColor}
        />
      </div>

      {/* Today's Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" /> Today&apos;s Gate Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-2">
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
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" /> System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Database</span>
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Authentication</span>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Last Backup</span>
                <span className="text-muted-foreground">
                  {stats.lastBackup ? new Date(stats.lastBackup).toLocaleDateString() : 'Never'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.map(activity => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">No recent activity</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" /> System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {systemAlerts.length > 0 ? (
              <div className="space-y-2">
                {systemAlerts.map((alert, idx) => (
                  <AlertItem key={alert.id || idx} alert={alert} />
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">No active alerts</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" /> Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <QuickAction href="/dashboard/admin/users" icon={Users} label="Manage Users" />
            <QuickAction href="/dashboard/goshala-manager/reports" icon={BarChart3} label="View Reports" />
            <QuickAction href="/dashboard/goshala-manager/alerts" icon={AlertTriangle} label="System Alerts" />
            <QuickAction href="/dashboard/admin/settings" icon={Settings} label="Settings" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
