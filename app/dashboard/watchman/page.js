"use client";

import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Clock,
  RefreshCw,
  AlertTriangle,
  Shield,
  MapPin,
  Thermometer,
  Eye,
  CheckCircle,
  XCircle,
  Bell,
  TrendingUp,
  TrendingDown,
  UserCheck,
  UserX,
  Users,
  Calendar,
  FileText
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import EventsProvider, { useEvents } from "@/components/providers/EventsProvider";
import EmptyState from "@/components/EmptyState";
import { t } from "@/lib/i18n";

// Memoized Components
const StatCard = memo(function StatCard({ title, value, subtext, icon: Icon, trend }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          {trend ? (
            <span className={`${trend > 0 ? 'text-green-600' : 'text-red-600'} flex items-center gap-1`}>
              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend)} from yesterday
            </span>
          ) : subtext}
        </p>
      </CardContent>
    </Card>
  );
});

const ActivityItem = memo(function ActivityItem({ activity }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
      <div className={`w-2 h-2 rounded-full ${activity.type === 'entry' ? 'bg-green-500' :
          activity.type === 'exit' ? 'bg-blue-500' : 'bg-amber-500'
        }`}></div>
      <div className="flex-1">
        <p className="text-sm font-medium">
          {activity.message}
          {activity.visitorName && ` - ${activity.visitorName}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {activity.time}
        </p>
      </div>
    </div>
  );
});

const LoadingSkeleton = () => (
  <div className="min-h-screen w-full p-6 space-y-6">
    <div className="flex justify-between items-center">
      <div className="h-10 w-48 bg-muted rounded-lg animate-pulse" />
      <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
    </div>
    <div className="grid gap-6 md:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 w-full bg-muted rounded-xl animate-pulse" />
      ))}
    </div>
  </div>
);

function WatchmanInner() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    todayEntries: 0,
    todayExits: 0,
    activeVisitors: 0,
    yesterdayEntries: 0,
    yesterdayExits: 0,
    weeklyEntries: 0,
    weeklyExits: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [currentVisitors, setCurrentVisitors] = useState([]);

  // Refs for mounting and caching
  const mountedRef = useRef(true);
  const cacheRef = useRef({ data: null, timestamp: 0 });
  const CACHE_TTL = 30000;

  // Static/Mock Data
  const weather = { temperature: 28, condition: 'Sunny', humidity: 65, windSpeed: 12 };
  const shiftInfo = { currentShift: 'Day', hoursRemaining: 4 };

  const fetchDashboardData = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cacheRef.current.data && (now - cacheRef.current.timestamp) < CACHE_TTL) {
      return;
    }

    try {
      setRefreshing(true);

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

      const results = await Promise.allSettled([
        fetch(`/api/gate-logs?since=${today}&until=${today}`).then(r => r.json()),
        fetch(`/api/gate-logs?since=${yesterday}&until=${yesterday}`).then(r => r.json()),
        fetch(`/api/gate-logs?since=${weekAgo}&until=${today}`).then(r => r.json()),
        fetch(`/api/gate-logs?pageSize=10`).then(r => r.json())
      ]);

      if (!mountedRef.current) return;

      const [todayRes, yesterdayRes, weekRes, activityRes] = results;
      const todayData = todayRes.status === 'fulfilled' ? todayRes.value : { logs: [] };
      const yesterdayData = yesterdayRes.status === 'fulfilled' ? yesterdayRes.value : { logs: [] };
      const weekData = weekRes.status === 'fulfilled' ? weekRes.value : { logs: [] };
      const activityData = activityRes.status === 'fulfilled' ? activityRes.value : { logs: [] };

      // Calculate stats
      const todayEntries = todayData.logs?.filter(log => log.type === 'entry').length || 0;
      const todayExits = todayData.logs?.filter(log => log.type === 'exit').length || 0;
      const yesterdayEntries = yesterdayData.logs?.filter(log => log.type === 'entry').length || 0;
      const yesterdayExits = yesterdayData.logs?.filter(log => log.type === 'exit').length || 0;

      // Calculate Active Visitors
      const byVisitor = new Map();
      (todayData.logs || []).forEach(log => {
        const key = (log.visitorName || '').trim();
        if (!key) return;
        const prev = byVisitor.get(key);
        if (!prev || new Date(log.at) > new Date(prev.at)) {
          byVisitor.set(key, log);
        }
      });

      const active = [];
      const nowTs = Date.now();
      byVisitor.forEach((log, name) => {
        if (log.type === 'entry') {
          const start = new Date(log.at).getTime();
          const mins = Math.max(0, Math.floor((nowTs - start) / 60000));
          const hours = Math.floor(mins / 60);
          const rem = mins % 60;
          active.push({
            id: log.id,
            name,
            entryTime: new Date(log.at).toLocaleTimeString(),
            purpose: log.note || 'Visit',
            duration: hours > 0 ? `${hours}h ${rem}m` : `${rem}m`,
            minutesTotal: mins
          });
        }
      });

      // Alerts: visitors > 2 hours
      const derivedAlerts = active
        .filter(v => v.minutesTotal >= 120)
        .map(v => ({
          id: v.id,
          type: 'warning',
          message: `Visitor ${v.name} has been on premises for over 2 hours`,
          time: v.entryTime
        }));

      setStats({
        todayEntries,
        todayExits,
        activeVisitors: Math.max(0, todayEntries - todayExits),
        yesterdayEntries,
        yesterdayExits,
        weeklyEntries: weekData.logs?.filter(log => log.type === 'entry').length || 0,
        weeklyExits: weekData.logs?.filter(log => log.type === 'exit').length || 0
      });

      setRecentActivity(activityData.logs?.map(log => ({
        id: log.id,
        type: log.type,
        message: `${log.type === 'entry' ? 'Enter' : log.type === 'exit' ? 'Exit' : 'Incident'}`,
        time: new Date(log.at).toLocaleTimeString(),
        visitorName: log.visitorName
      })) || []);

      setCurrentVisitors(active);
      setAlerts(derivedAlerts);

      cacheRef.current = { data: true, timestamp: Date.now() };

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  const { subscribe } = useEvents();
  useEffect(() => {
    const unsub = subscribe((event) => {
      if (event?.type === 'change' && event.collection === 'gate_logs') {
        fetchDashboardData(true);
      }
    });
    return unsub;
  }, [subscribe, fetchDashboardData]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Watchman Dashboard</h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {shiftInfo.currentShift} Shift
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Thermometer className="h-4 w-4" />
                {weather.temperature}°C • {weather.condition}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchDashboardData(true)} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/watchman/exit">
                <UserX className="h-4 w-4 mr-2" /> Exit
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard/watchman/entry">
                <UserCheck className="h-4 w-4 mr-2" /> New Entry
              </Link>
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-yellow-800 text-sm">
                <AlertTriangle className="h-4 w-4" /> Active Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                    <span>{alert.message}</span>
                    <Button variant="ghost" size="sm" onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Today's Entries"
            value={stats.todayEntries}
            trend={stats.todayEntries - stats.yesterdayEntries}
            icon={UserCheck}
          />
          <StatCard
            title="Today's Exits"
            value={stats.todayExits}
            trend={stats.todayExits - stats.yesterdayExits}
            icon={UserX}
          />
          <StatCard
            title="Active Visitors"
            value={stats.activeVisitors}
            subtext="Currently on premises"
            icon={Users}
          />
          <StatCard
            title="Weekly Total"
            value={stats.weeklyEntries + stats.weeklyExits}
            subtext={`${stats.weeklyEntries} in, ${stats.weeklyExits} out`}
            icon={Activity}
          />
        </div>

        {/* Current Visitors & Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" /> Current Visitors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentVisitors.length > 0 ? (
                <div className="space-y-3">
                  {currentVisitors.slice(0, 5).map((visitor) => (
                    <div key={visitor.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{visitor.name}</div>
                        <div className="text-xs text-muted-foreground">{visitor.purpose} • {visitor.entryTime}</div>
                      </div>
                      <Badge variant="outline">{visitor.duration}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No visitors" description="Premises is clear." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" /> Recent Activity
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
                <EmptyState title="No activity" description="No gate logs found." />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function WatchmanDashboard() {
  return (
    <EventsProvider channels={['gate_logs']}>
      <WatchmanInner />
    </EventsProvider>
  );
}
