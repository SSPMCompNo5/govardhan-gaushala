"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Activity, Droplets, AlertTriangle, Clock, CheckCircle2,
  Users, Loader2, Milk, Package, LogIn, LogOut,
  RefreshCw, ShieldAlert, TrendingUp, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/* ────────────────────────────────────────────
   Helpers
──────────────────────────────────────────── */
function timeAgo(date) {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ADMIN_ROLES = ["Admin", "Owner/Admin"];
const MANAGER_ROLES = ["Admin", "Owner/Admin", "Goshala Manager", "Food Manager"];

/* ────────────────────────────────────────────
   Stat Card
──────────────────────────────────────────── */
function StatCard({ title, value, icon, change, changePositive, loading, href }) {
  const inner = (
    <div className="rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md group h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="rounded-lg bg-primary/10 p-2">{icon}</div>
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="h-8 w-24 bg-muted animate-pulse rounded-md" />
        ) : (
          <p className="text-2xl font-bold">{value ?? "—"}</p>
        )}
        {loading ? (
          <div className="mt-2 h-3 w-32 bg-muted animate-pulse rounded-md" />
        ) : (
          <p className={`mt-1 text-xs flex items-center gap-1 ${changePositive ? "text-emerald-600" : "text-muted-foreground"}`}>
            {changePositive && <TrendingUp className="h-3 w-3" />}
            {change}
          </p>
        )}
      </div>
      {href && (
        <div className="mt-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

/* ────────────────────────────────────────────
   Activity Item
──────────────────────────────────────────── */
function ActivityItem({ message, user, time, severity }) {
  const color =
    severity === "error" ? "text-red-500 bg-red-50 dark:bg-red-950/30" :
      severity === "warning" ? "text-amber-500 bg-amber-50 dark:bg-amber-950/30" :
        "text-primary bg-primary/10";

  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 rounded-full p-1.5 ${color}`}>
        <CheckCircle2 className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{message}</p>
        <p className="text-xs text-muted-foreground">{user && `${user} · `}{time}</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Alert Item
──────────────────────────────────────────── */
function AlertItem({ title, message, type }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${type === "critical"
        ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
        : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
      }`}>
      <ShieldAlert className={`h-4 w-4 mt-0.5 flex-shrink-0 ${type === "critical" ? "text-red-500" : "text-amber-500"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{title}</p>
        {message && <p className="text-xs text-muted-foreground mt-0.5 truncate">{message}</p>}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Main Page
──────────────────────────────────────────── */
export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const role = session?.user?.role;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(null);

  const fetchData = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    setError(null);

    try {
      const isAdmin = ADMIN_ROLES.includes(role);
      const isManager = MANAGER_ROLES.includes(role);

      if (isAdmin) {
        // Admin gets everything from the single stats endpoint
        const res = await fetch("/api/admin/dashboard/stats", { cache: "no-store" });
        if (!res.ok) throw new Error(`Stats API: ${res.status}`);
        const json = await res.json();
        setData({ type: "admin", ...json });
      } else {
        // Non-admin: fetch what's accessible in parallel
        const requests = [
          fetch("/api/goshala-manager/cows?limit=1", { cache: "no-store" }),
          fetch("/api/food/inventory?limit=1", { cache: "no-store" }),
          fetch("/api/gate-logs?limit=5", { cache: "no-store" }),
        ];

        if (isManager) {
          requests.push(fetch("/api/goshala-manager/alerts/summary", { cache: "no-store" }));
        }

        const results = await Promise.allSettled(requests);

        const parseOrNull = async (r) => {
          if (r.status === "fulfilled" && r.value?.ok) {
            try { return await r.value.json(); } catch { return null; }
          }
          return null;
        };

        const [cowsData, inventoryData, gateData, alertsData] = await Promise.all(results.map(parseOrNull));

        // Format gate logs for activity
        const gateLogs = gateData?.logs ?? gateData?.gateLogs ?? [];
        const todayStr = new Date().toISOString().split("T")[0];
        const todayLogs = gateLogs.filter(l => (l.at || l.timestamp || "").startsWith(todayStr));
        const todayEntries = todayLogs.filter(l => l.type === "entry").length;
        const todayExits = todayLogs.filter(l => l.type === "exit").length;

        // Low stock from inventory
        const inventoryItems = inventoryData?.inventory ?? inventoryData?.items ?? [];
        const lowStock = inventoryItems.filter(i => i.status === "low" || i.status === "critical").length;

        // Alerts
        const lowAlerts = alertsData?.low ?? [];
        const criticalAlerts = alertsData?.critical ?? [];

        setData({
          type: "general",
          stats: {
            totalCattle: cowsData?.pagination?.total ?? cowsData?.total ?? "—",
            lowStockItems: lowStock,
            todayEntries,
            todayExits,
            criticalAlerts: criticalAlerts.length,
          },
          recentActivity: gateLogs.slice(0, 5).map((l, i) => ({
            id: i,
            message: `Gate ${l.type === "entry" ? "entry" : "exit"}: ${l.name || l.visitorName || "Visitor"}`,
            user: l.recordedBy || l.watchmanId || "",
            time: l.at || l.timestamp,
            severity: "info",
          })),
          systemAlerts: [
            ...criticalAlerts.slice(0, 3).map(a => ({ id: `c-${a.name}`, title: `Critical Stock: ${a.name}`, message: `${a.quantity} ${a.unit} remaining`, type: "critical" })),
            ...lowAlerts.slice(0, 3).map(a => ({ id: `l-${a.name}`, title: `Low Stock: ${a.name}`, message: `${a.quantity} ${a.unit} remaining`, type: "warning" })),
          ],
        });
      }

      setRefreshedAt(new Date());
    } catch (err) {
      console.error("[Dashboard] fetch error:", err);
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [session, role]);

  // Initial fetch + auto-refresh every 60s
  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchData();
      const interval = setInterval(fetchData, 60_000);
      return () => clearInterval(interval);
    }
  }, [sessionStatus, fetchData]);

  /* ── Loading skeleton ── */
  if (sessionStatus === "loading" || (loading && !data)) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 w-full bg-muted rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="h-64 bg-muted rounded-xl md:col-span-2" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  const stats = data?.stats ?? {};
  const isAdmin = ADMIN_ROLES.includes(role);

  /* ── Stat cards config — adapts to role ── */
  const statCards = isAdmin ? [
    {
      title: "Total Cattle",
      value: stats.totalCattle,
      icon: <Milk className="h-5 w-5 text-primary" />,
      change: `${stats.totalCattle ?? 0} registered`,
      href: "/dashboard/goshala-manager/cows",
    },
    {
      title: "Staff Users",
      value: stats.totalUsers,
      icon: <Users className="h-5 w-5 text-blue-500" />,
      change: `${stats.activeUsers ?? 0} active this week`,
      changePositive: (stats.activeUsers ?? 0) > 0,
      href: "/dashboard/admin/users",
    },
    {
      title: "Active Alerts",
      value: stats.criticalAlerts,
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      change: stats.criticalAlerts > 0 ? `${stats.criticalAlerts} need attention` : "All clear",
      href: "/dashboard/goshala-manager/alerts",
    },
    {
      title: "Today's Gate Logs",
      value: (stats.todayEntries ?? 0) + (stats.todayExits ?? 0),
      icon: <LogIn className="h-5 w-5 text-emerald-500" />,
      change: `${stats.todayEntries ?? 0} in · ${stats.todayExits ?? 0} out`,
      changePositive: true,
      href: "/dashboard/watchman/activity",
    },
  ] : [
    {
      title: "Total Cattle",
      value: stats.totalCattle,
      icon: <Milk className="h-5 w-5 text-primary" />,
      change: "Registered cows",
      href: "/dashboard/goshala-manager/cows",
    },
    {
      title: "Low Stock Items",
      value: stats.lowStockItems,
      icon: <Package className="h-5 w-5 text-amber-500" />,
      change: stats.lowStockItems > 0 ? "Needs restocking" : "Stock levels ok",
      href: "/dashboard/food-manager/inventory",
    },
    {
      title: "Today Entries",
      value: stats.todayEntries,
      icon: <LogIn className="h-5 w-5 text-emerald-500" />,
      change: "Gate entries today",
      changePositive: true,
    },
    {
      title: "Today Exits",
      value: stats.todayExits,
      icon: <LogOut className="h-5 w-5 text-red-400" />,
      change: "Gate exits today",
    },
  ];

  const activities = data?.recentActivity ?? [];
  const alerts = data?.systemAlerts ?? [];

  /* ── Quick actions per role ── */
  const quickActions = [
    role === "Watchman" && { href: "/dashboard/watchman/entry", icon: LogIn, label: "Record Entry", color: "text-emerald-500" },
    role === "Watchman" && { href: "/dashboard/watchman/exit", icon: LogOut, label: "Record Exit", color: "text-red-400" },
    ["Goshala Manager", "Admin", "Owner/Admin", "Cow Manager"].includes(role) && { href: "/dashboard/goshala-manager/cows", icon: Milk, label: "View Cows", color: "text-primary" },
    ["Food Manager", "Goshala Manager", "Admin", "Owner/Admin"].includes(role) && { href: "/dashboard/food-manager/inventory", icon: Package, label: "Inventory", color: "text-amber-500" },
    ["Doctor", "Admin", "Owner/Admin", "Goshala Manager", "Food Manager"].includes(role) && { href: "/dashboard/doctor/treatments", icon: Activity, label: "Treatments", color: "text-emerald-500" },
    ["Admin", "Owner/Admin"].includes(role) && { href: "/dashboard/admin/users", icon: Users, label: "Manage Users", color: "text-blue-500" },
    { href: "/dashboard/watchman/activity", icon: Clock, label: "Gate Activity", color: "text-purple-500" },
  ].filter(Boolean).slice(0, 4);

  return (
    <div className="space-y-6">

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-4 text-sm text-red-700 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchData} className="text-red-600 hover:text-red-700">
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <StatCard key={i} {...card} loading={loading} />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">

        {/* Quick Actions + Alerts */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Quick Actions</h2>
              {refreshedAt && (
                <button onClick={fetchData} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors" title="Refresh data">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Updated {timeAgo(refreshedAt)}</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((a, i) => (
                <Link key={i} href={a.href}>
                  <Button variant="outline" className="w-full h-24 flex-col items-center justify-center gap-2 hover:bg-accent transition-colors">
                    <a.icon className={`h-6 w-6 ${a.color}`} />
                    <span className="text-sm">{a.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* System Alerts */}
          {alerts.length > 0 && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  System Alerts
                </h2>
                <Link href="/dashboard/goshala-manager/alerts">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
              <div className="space-y-2">
                {alerts.map(a => <AlertItem key={a.id} {...a} />)}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <Link href="/dashboard/watchman/activity">
              <Button variant="outline" size="sm">All Logs</Button>
            </Link>
          </div>
          <div className="space-y-4">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-7 w-7 rounded-full bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 bg-muted rounded" />
                    <div className="h-2.5 w-1/2 bg-muted rounded" />
                  </div>
                </div>
              ))
            ) : activities.length > 0 ? (
              activities.map((a, i) => (
                <ActivityItem
                  key={a.id ?? i}
                  message={a.message}
                  user={a.user}
                  time={timeAgo(a.time)}
                  severity={a.severity}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
