"use client";

import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  PlusCircle,
  AlertTriangle,
  Package,
  Calendar,
  Truck,
  Clock,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import Link from 'next/link';

// Memoized Sub-components
const StatCard = memo(function StatCard({ title, value, subtext, icon: Icon, alert }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${alert ? 'text-yellow-500' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtext}</p>
      </CardContent>
    </Card>
  );
});

const InventoryItem = memo(function InventoryItem({ item }) {
  const isCritical = item.status === 'critical';
  const isLow = item.status === 'low';

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <AlertTriangle className={`h-4 w-4 ${isCritical ? 'text-red-500' : isLow ? 'text-yellow-500' : 'text-green-500'}`} />
      <div className="flex-1">
        <p className="font-medium">{item.name}</p>
        <p className="text-sm text-muted-foreground">
          {item.quantity} {item.unit} remaining
        </p>
      </div>
      <Badge variant={isCritical ? 'destructive' : isLow ? 'warning' : 'default'}>
        {item.status}
      </Badge>
    </div>
  );
});

const FeedingLogItem = memo(function FeedingLogItem({ log }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <p className="font-medium">{log.foodType}</p>
        <p className="text-sm text-muted-foreground">
          {log.cowGroup} • {log.quantity} {log.unit}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        {new Date(log.feedingTime).toLocaleTimeString()}
      </p>
    </div>
  );
});

// Skeleton Loader
const LoadingSkeleton = () => (
  <div className="min-h-screen w-full p-6 space-y-6">
    <div className="flex justify-between items-center">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="h-8 w-24 bg-muted rounded animate-pulse" />
    </div>
    <div className="grid gap-4 md:grid-cols-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
    </div>
  </div>
);

export default function FoodManagerDashboard() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    todayFeedings: 0,
    activeSuppliers: 0
  });

  const [recentInventory, setRecentInventory] = useState([]);
  const [recentFeedings, setRecentFeedings] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);

  const mountedRef = useRef(true);
  const cacheRef = useRef({ data: null, timestamp: 0 });
  const CACHE_TTL = 30000;

  const fetchDashboardData = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cacheRef.current.data && (now - cacheRef.current.timestamp) < CACHE_TTL) {
      return;
    }

    try {
      setRefreshing(true);

      const results = await Promise.allSettled([
        fetch('/api/food/inventory?limit=10').then(r => r.json()),
        fetch('/api/food/feeding-logs?limit=10').then(r => r.json()),
        fetch('/api/food/suppliers?isActive=true').then(r => r.json())
      ]);

      if (!mountedRef.current) return;

      const [inventoryRes, feedingsRes, suppliersRes] = results;
      const inventoryData = inventoryRes.status === 'fulfilled' ? inventoryRes.value : { inventory: [] };
      const feedingsData = feedingsRes.status === 'fulfilled' ? feedingsRes.value : { logs: [] };
      const suppliersData = suppliersRes.status === 'fulfilled' ? suppliersRes.value : { suppliers: [] };

      const inventory = inventoryData.inventory || [];
      const logs = feedingsData.logs || [];

      const todayString = new Date().toISOString().split('T')[0];
      const todayFeedingsCount = logs.filter(l => l.feedingTime?.startsWith(todayString)).length;
      const lowStock = inventory.filter(i => i.status === 'low' || i.status === 'critical');

      setStats({
        totalItems: inventory.length,
        lowStockItems: lowStock.length,
        todayFeedings: todayFeedingsCount,
        activeSuppliers: suppliersData.suppliers?.length || 0
      });

      setRecentInventory(inventory.slice(0, 5));
      setRecentFeedings(logs.slice(0, 5));
      setLowStockAlerts(lowStock.slice(0, 6));

      cacheRef.current = { data: true, timestamp: Date.now() };

    } catch (error) {
      console.error('Error fetching food manager data:', error);
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

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Food Manager</h1>
            <p className="text-muted-foreground">Overview & Inventory Status</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fetchDashboardData(true)} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button asChild>
              <Link href="/dashboard/food-manager/inventory/add">
                <PlusCircle className="h-4 w-4 mr-2" /> Add Item
              </Link>
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {lowStockAlerts.length > 0 && (
          <Card className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/10">
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-red-600 text-base">
                <AlertTriangle className="h-5 w-5" /> Stock Alerts ({lowStockAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 pt-0">
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {lowStockAlerts.map(item => <InventoryItem key={item._id} item={item} />)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Items"
            value={stats.totalItems}
            subtext="Inventory Count"
            icon={Package}
          />
          <StatCard
            title="Low Stock"
            value={stats.lowStockItems}
            subtext="Needs Attention"
            icon={TrendingDown}
            alert={true}
          />
          <StatCard
            title="Today's Feedings"
            value={stats.todayFeedings}
            subtext="Sessions Recorded"
            icon={Calendar}
          />
          <StatCard
            title="Active Suppliers"
            value={stats.activeSuppliers}
            subtext="Vendors Available"
            icon={Truck}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Button asChild variant="outline" className="h-16 flex-col gap-1">
            <Link href="/dashboard/food-manager/inventory">
              <Package className="h-5 w-5" />
              <span>Inventory</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-16 flex-col gap-1">
            <Link href="/dashboard/food-manager/feedings/record">
              <Calendar className="h-5 w-5" />
              <span>Record Feeding</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-16 flex-col gap-1">
            <Link href="/dashboard/food-manager/suppliers">
              <Truck className="h-5 w-5" />
              <span>Suppliers</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-16 flex-col gap-1">
            <Link href="/dashboard/food-manager/schedule">
              <Clock className="h-5 w-5" />
              <span>Schedules</span>
            </Link>
          </Button>
        </div>

        {/* Lists */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" /> Recent Inventory
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/food-manager/inventory">View All <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentInventory.length > 0 ? (
                recentInventory.map(item => <InventoryItem key={item._id} item={item} />)
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">No items found</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Recent Feedings
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/food-manager/feedings">View All <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentFeedings.length > 0 ? (
                recentFeedings.map(log => <FeedingLogItem key={log._id} log={log} />)
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">No logs found</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
