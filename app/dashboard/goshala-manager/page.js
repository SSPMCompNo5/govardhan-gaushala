'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Users, Package, Calendar, Shield } from 'lucide-react';

export default function GoshalaManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalCattle: 0,
    activeSchedules: 0,
    lowStockItems: 0,
    staffOnDuty: 0
  });

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [inventoryRes, schedulesRes, cowsRes] = await Promise.all([
        fetch('/api/food/inventory?limit=50', { cache: 'no-store' }),
        fetch('/api/food/schedule?isActive=true', { cache: 'no-store' }),
        fetch('/api/goshala-manager/cows?limit=100', { cache: 'no-store' })
      ]);
      const [inventoryData, schedulesData, cowsData] = await Promise.all([
        inventoryRes.json(),
        schedulesRes.json(),
        cowsRes.json()
      ]);

      const lowStockItems = (inventoryData.inventory || []).filter(i => i.status === 'low' || i.status === 'critical').length;
      const activeSchedules = (schedulesData.schedules || []).length;
      const totalCattle = (cowsData.cows || []).length;

      setStats({
        totalCattle,
        activeSchedules,
        lowStockItems,
        staffOnDuty: 0 // placeholder for staff roster
      });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen w-full p-6">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Goshala Manager Dashboard</h1>
            <p className="text-muted-foreground">Overview of operations and key alerts.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader><CardTitle>Total Cattle</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5" /> {stats.totalCattle}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Active Schedules</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5" /> {stats.activeSchedules}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Low/Critical Stock</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5" /> {stats.lowStockItems}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Staff On Duty</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-5 w-5" /> {stats.staffOnDuty}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Quick Links</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="secondary"><Link href="/dashboard/goshala-manager/cows">Cows & Herd</Link></Button>
            <Button asChild variant="secondary"><Link href="/dashboard/goshala-manager/health">Health Records</Link></Button>
            <Button asChild variant="secondary"><Link href="/dashboard/goshala-manager/food">Food Summary</Link></Button>
            <Button asChild variant="secondary"><Link href="/dashboard/goshala-manager/finance">Finance</Link></Button>
            <Button asChild variant="secondary"><Link href="/dashboard/goshala-manager/staff">Staff</Link></Button>
            <Button asChild variant="secondary"><Link href="/dashboard/goshala-manager/infrastructure">Infrastructure</Link></Button>
            <Button asChild variant="secondary"><Link href="/dashboard/goshala-manager/reports">Reports</Link></Button>
            <Button asChild variant="secondary"><Link href="/dashboard/goshala-manager/alerts">Alerts</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


