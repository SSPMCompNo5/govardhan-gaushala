'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  FileText,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { ConsumptionLine, SupplierBar } from '@/components/dashboard/Charts';

export default function FoodManagerDashboard() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    criticalItems: 0,
    todayFeedings: 0,
    activeSuppliers: 0,
    totalSchedules: 0,
    monthlyConsumption: 0,
    pendingOrders: 0
  });
  const [recentInventory, setRecentInventory] = useState([]);
  const [recentFeedings, setRecentFeedings] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);

      const [inventoryRes, feedingsRes, suppliersRes, schedulesRes] = await Promise.all([
        fetch('/api/food/inventory?limit=10', { cache: 'no-store' }),
        fetch('/api/food/feeding-logs?limit=10', { cache: 'no-store' }),
        fetch('/api/food/suppliers?isActive=true', { cache: 'no-store' }),
        fetch('/api/food/schedule?isActive=true', { cache: 'no-store' })
      ]);

      const [inventoryData, feedingsData, suppliersData, schedulesData] = await Promise.all([
        inventoryRes.json(),
        feedingsRes.json(),
        suppliersRes.json(),
        schedulesRes.json()
      ]);

      // Calculate statistics
      const today = new Date().toISOString().split('T')[0];
      const todayFeedings = feedingsData.logs?.filter(log => 
        log.feedingTime?.startsWith(today)
      ).length || 0;

      const lowStockItems = inventoryData.inventory?.filter(item => 
        item.status === 'low'
      ).length || 0;

      const criticalItems = inventoryData.inventory?.filter(item => 
        item.status === 'critical'
      ).length || 0;

      // Calculate monthly consumption (simplified)
      const thisMonth = new Date().getMonth();
      const monthlyFeedings = feedingsData.logs?.filter(log => {
        const logMonth = new Date(log.feedingTime).getMonth();
        return logMonth === thisMonth;
      }) || [];
      
      const monthlyConsumption = monthlyFeedings.reduce((total, log) => {
        return total + (log.quantity || 0);
      }, 0);

      setStats({
        totalItems: inventoryData.inventory?.length || 0,
        lowStockItems,
        criticalItems,
        todayFeedings,
        activeSuppliers: suppliersData.suppliers?.length || 0,
        totalSchedules: schedulesData.schedules?.length || 0,
        monthlyConsumption: Math.round(monthlyConsumption),
        pendingOrders: Math.floor(Math.random() * 5) + 1 // Mock data for now
      });

      setRecentInventory(inventoryData.inventory || []);
      setRecentFeedings(feedingsData.logs || []);
      setLowStockAlerts(inventoryData.inventory?.filter(item => 
        item.status === 'critical' || item.status === 'low'
      ) || []);
      
      // Get today's schedule
      const todayDay = new Date().getDay();
      const todaySchedules = schedulesData.schedules?.filter(schedule => 
        schedule.daysOfWeek?.includes(todayDay) && schedule.isActive
      ) || [];
      setTodaySchedule(todaySchedules);

    } catch (error) {
      console.error('Error fetching food manager data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'destructive';
      case 'low': return 'warning';
      case 'healthy': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'low': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Package className="h-4 w-4 text-green-500" />;
    }
  };

  const markTaskComplete = (taskId) => {
    // Mock function for now
    console.log('Task completed:', taskId);
  };

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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Food Manager Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {session?.user?.userId || 'Food Manager'}! Here&apos;s your food management overview.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/dashboard/food-manager/inventory/add">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Inventory
              </Link>
            </Button>
          </div>
        </div>

        {/* Stock Alerts */}
        {lowStockAlerts.length > 0 && (
          <Card className="border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {lowStockAlerts.slice(0, 6).map((item) => (
                  <div key={item._id} className="flex items-center gap-3 p-3 border rounded-lg">
                    {getStatusIcon(item.status)}
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} {item.unit} remaining
                      </p>
                    </div>
                    <Badge variant={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItems}</div>
              <p className="text-xs text-muted-foreground">
                Items in inventory
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lowStockItems}</div>
              <p className="text-xs text-muted-foreground">
                Needs attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Feedings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayFeedings}</div>
              <p className="text-xs text-muted-foreground">
                Feeding sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSuppliers}</div>
              <p className="text-xs text-muted-foreground">
                Available vendors
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Button asChild className="h-20">
            <Link href="/dashboard/food-manager/inventory/add">
              <div className="text-center">
                <PlusCircle className="h-6 w-6 mx-auto mb-1" />
                <p className="text-sm font-medium">Add Inventory</p>
              </div>
            </Link>
          </Button>
          
          <Button asChild className="h-20">
            <Link href="/dashboard/food-manager/feedings/record">
              <div className="text-center">
                <Calendar className="h-6 w-6 mx-auto mb-1" />
                <p className="text-sm font-medium">Record Feeding</p>
              </div>
            </Link>
          </Button>
          
          <Button asChild className="h-20">
            <Link href="/dashboard/food-manager/suppliers/add">
              <div className="text-center">
                <Truck className="h-6 w-6 mx-auto mb-1" />
                <p className="text-sm font-medium">Add Supplier</p>
              </div>
            </Link>
          </Button>
          
          <Button asChild className="h-20">
            <Link href="/dashboard/food-manager/schedule/add">
              <div className="text-center">
                <Clock className="h-6 w-6 mx-auto mb-1" />
                <p className="text-sm font-medium">Add Schedule</p>
              </div>
            </Link>
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Charts */}
          <Card>
            <CardHeader>
              <CardTitle>Consumption This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <ConsumptionLine labels={["Week 1","Week 2","Week 3","Week 4"]} values={[12, 18, 15, stats.monthlyConsumption || 20]} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suppliers Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <SupplierBar labels={["Active","Inactive"]} values={[stats.activeSuppliers || 0, Math.max(0, (5 - (stats.activeSuppliers || 0)))]} />
            </CardContent>
          </Card>
          {/* Recent Inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Recent Inventory
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/food-manager/inventory">
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentInventory.length > 0 ? (
                  recentInventory.slice(0, 5).map((item) => (
                    <div key={item._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(item.status)}
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} {item.unit}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No inventory items found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Feedings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Feedings
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/food-manager/feedings">
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentFeedings.length > 0 ? (
                  recentFeedings.slice(0, 5).map((log) => (
                    <div key={log._id} className="flex items-center justify-between p-3 border rounded-lg">
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
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No feeding logs found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today&apos;s Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaySchedule.length > 0 ? (
                todaySchedule.map((schedule) => (
                  <div key={schedule._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">{schedule.time} - {schedule.foodType}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.cowGroup} • {schedule.quantity} {schedule.unit}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markTaskComplete(schedule._id)}
                    >
                      Mark Complete
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No scheduled feedings for today
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
