'use client';

import React, { useEffect, useState, useCallback, memo, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, Package, Calendar, Shield, AlertTriangle, Heart, DollarSign, Wrench, FileText } from 'lucide-react';

// Memoized stat card
const StatCard = memo(function StatCard({ title, value, icon: Icon }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="text-2xl font-bold">{value}</span>
      </CardContent>
    </Card>
  );
});

// Memoized quick link
const QuickLink = memo(function QuickLink({ href, icon: Icon, label }) {
  return (
    <Button asChild variant="secondary" size="sm">
      <Link href={href} className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
});

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 p-6">
      <div className="h-8 bg-muted rounded w-64 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="h-24 bg-muted rounded-lg animate-pulse" />
    </div>
  );
}

export default function GoshalaManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalCattle: 0,
    activeSchedules: 0,
    lowStockItems: 0,
    staffOnDuty: 0
  });

  const mountedRef = useRef(true);
  const cacheRef = useRef({ data: null, timestamp: 0 });
  const CACHE_TTL = 30000;

  const fetchData = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cacheRef.current.data && (now - cacheRef.current.timestamp) < CACHE_TTL) {
      return;
    }

    try {
      setRefreshing(true);

      const results = await Promise.allSettled([
        fetch('/api/food/inventory?limit=30').then(r => r.json()),
        fetch('/api/food/schedule?isActive=true&limit=10').then(r => r.json()),
        fetch('/api/goshala-manager/cows?limit=50').then(r => r.json())
      ]);

      if (!mountedRef.current) return;

      const [inventoryResult, schedulesResult, cowsResult] = results;

      const inventoryData = inventoryResult.status === 'fulfilled' ? inventoryResult.value : { inventory: [] };
      const schedulesData = schedulesResult.status === 'fulfilled' ? schedulesResult.value : { schedules: [] };
      const cowsData = cowsResult.status === 'fulfilled' ? cowsResult.value : { cows: [] };

      setStats({
        totalCattle: cowsData.cows?.length || 0,
        activeSchedules: schedulesData.schedules?.length || 0,
        lowStockItems: (inventoryData.inventory || []).filter(i => i.status === 'low' || i.status === 'critical').length,
        staffOnDuty: 0
      });

      cacheRef.current = { data: true, timestamp: Date.now() };
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Goshala Manager</h1>
          <p className="text-muted-foreground text-sm">Operations overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Cattle" value={stats.totalCattle} icon={Users} />
        <StatCard title="Active Schedules" value={stats.activeSchedules} icon={Calendar} />
        <StatCard title="Low Stock Items" value={stats.lowStockItems} icon={Package} />
        <StatCard title="Staff On Duty" value={stats.staffOnDuty} icon={Shield} />
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <QuickLink href="/dashboard/goshala-manager/cows" icon={Users} label="Cows & Herd" />
          <QuickLink href="/dashboard/goshala-manager/health" icon={Heart} label="Health Records" />
          <QuickLink href="/dashboard/goshala-manager/food" icon={Package} label="Food Summary" />
          <QuickLink href="/dashboard/goshala-manager/finance" icon={DollarSign} label="Finance" />
          <QuickLink href="/dashboard/goshala-manager/staff" icon={Shield} label="Staff" />
          <QuickLink href="/dashboard/goshala-manager/infrastructure" icon={Wrench} label="Infrastructure" />
          <QuickLink href="/dashboard/goshala-manager/reports" icon={FileText} label="Reports" />
          <QuickLink href="/dashboard/goshala-manager/alerts" icon={AlertTriangle} label="Alerts" />
        </CardContent>
      </Card>
    </div>
  );
}
