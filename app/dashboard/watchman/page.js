"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  PlusCircle, 
  FileText, 
  Calendar, 
  Users, 
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
  UserX
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import EventsProvider, { useEvents } from "@/components/providers/EventsProvider";
import EmptyState from "@/components/EmptyState";
import { t } from "@/lib/i18n";

function WatchmanInner() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    todayEntries: 0,
    todayExits: 0,
    activeVisitors: 0,
    pendingTasks: 0,
    yesterdayEntries: 0,
    yesterdayExits: 0,
    weeklyEntries: 0,
    weeklyExits: 0,
    averageVisitDuration: 0,
    peakHour: '10:00 AM'
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [weather, setWeather] = useState({
    temperature: 28,
    condition: 'Sunny',
    humidity: 65,
    windSpeed: 12
  });
  const [currentVisitors, setCurrentVisitors] = useState([]);
  const [securityChecks, setSecurityChecks] = useState([]);
  const [shiftInfo, setShiftInfo] = useState({
    startTime: '08:00',
    endTime: '20:00',
    currentShift: 'Day',
    nextShift: 'Night',
    hoursRemaining: 4
  });

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // Fetch today's stats
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const [todayRes, yesterdayRes, weekRes, activityRes] = await Promise.all([
        fetch(`/api/gate-logs?since=${today}&until=${today}`, { cache: 'no-store' }),
        fetch(`/api/gate-logs?since=${yesterday}&until=${yesterday}`, { cache: 'no-store' }),
        fetch(`/api/gate-logs?since=${weekAgo}&until=${today}`, { cache: 'no-store' }),
        fetch(`/api/gate-logs?pageSize=10`, { cache: 'no-store' })
      ]);

      const todayData = await todayRes.json();
      const yesterdayData = await yesterdayRes.json();
      const weekData = await weekRes.json();
      const activityData = await activityRes.json();

      // Calculate stats
      const todayEntries = todayData.logs?.filter(log => log.type === 'entry').length || 0;
      const todayExits = todayData.logs?.filter(log => log.type === 'exit').length || 0;
      const yesterdayEntries = yesterdayData.logs?.filter(log => log.type === 'entry').length || 0;
      const yesterdayExits = yesterdayData.logs?.filter(log => log.type === 'exit').length || 0;
      const weeklyEntries = weekData.logs?.filter(log => log.type === 'entry').length || 0;
      const weeklyExits = weekData.logs?.filter(log => log.type === 'exit').length || 0;
      
      // Calculate active visitors (entries - exits for today)
      const activeVisitors = Math.max(0, todayEntries - todayExits);

      // Calculate average visit duration (mock calculation)
      const averageVisitDuration = 2.5; // hours

      setStats({
        todayEntries,
        todayExits,
        activeVisitors,
        pendingTasks: 3,
        yesterdayEntries,
        yesterdayExits,
        weeklyEntries,
        weeklyExits,
        averageVisitDuration,
        peakHour: '10:00 AM'
      });

      // Process recent activity (from latest gate logs)
      const activities = activityData.logs?.map(log => ({
        id: log.id,
        type: log.type,
        message: `${log.type === 'entry' ? 'New entry' : log.type === 'exit' ? 'Exit' : 'Incident'} recorded`,
        time: new Date(log.at).toLocaleTimeString(),
        timestamp: new Date(log.at),
        visitorName: log.visitorName,
        color: log.type === 'entry' ? 'green' : log.type === 'exit' ? 'blue' : 'amber'
      })) || [];

      setRecentActivity(activities);

      // Derive current visitors from today logs (last event per visitor is entry)
      const byVisitor = new Map();
      (todayData.logs || []).forEach(log => {
        const key = (log.visitorName || '').trim();
        if (!key) return;
        const prev = byVisitor.get(key);
        if (!prev || new Date(log.at) > new Date(prev.at)) {
          byVisitor.set(key, log);
        }
      });
      const nowTs = Date.now();
      const active = [];
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
            duration: hours > 0 ? `${hours}h ${rem}m` : `${rem}m`
          });
        }
      });
      setCurrentVisitors(active);

      // Alerts: visitors on premises longer than 120 minutes
      const derivedAlerts = active
        .filter(v => {
          const parts = String(v.duration).split(' ');
          let minutes = 0;
          for (let i = 0; i < parts.length; i += 2) {
            const n = parseInt(parts[i], 10);
            const unit = parts[i + 1] || '';
            if (unit.startsWith('h')) minutes += n * 60;
            else minutes += n;
          }
          return minutes >= 120;
        })
        .map(v => ({
          id: v.id,
          type: 'warning',
          message: `Visitor ${v.name} has been on premises for over 2 hours`,
          time: v.entryTime
        }));
      setAlerts(derivedAlerts);

      // Clear non-database sections (no mock fillers)
      setSecurityChecks([]);
      setSchedule([]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Live updates via SSE on gate_logs
  const { subscribe } = useEvents();
  useEffect(() => {
    const unsub = subscribe((event) => {
      if (event?.type === 'change' && event.collection === 'gate_logs') {
        fetchDashboardData();
      }
    });
    return unsub;
  }, [subscribe, fetchDashboardData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const markTaskComplete = (taskId) => {
    setSchedule(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const markSecurityCheckComplete = (checkId) => {
    setSecurityChecks(prev => prev.map(check => 
      check.id === checkId ? { ...check, status: check.status === 'completed' ? 'pending' : 'completed' } : check
    ));
  };

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertIcon = (type) => {
    switch(type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'info': return <Bell className="h-4 w-4 text-blue-600" />;
      default: return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full grid place-items-center p-6">
        <div className="w-full max-w-6xl space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-10 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 w-full bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div>
            ))}
          </div>
          <div className="text-center text-sm text-muted-foreground" role="status" aria-live="polite">{t('loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Watchman Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {session?.user?.userId || 'Watchman'}! Here&apos;s what you need to know today.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {shiftInfo.currentShift} Shift • {shiftInfo.hoursRemaining}h remaining
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Thermometer className="h-4 w-4" />
                {weather.temperature}°C • {weather.condition}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/watchman/exit">
                <UserX className="h-4 w-4 mr-2" />
                Exit
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/watchman/entry">
                <UserCheck className="h-4 w-4 mr-2" />
                New Entry
              </Link>
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-5 w-5" /> Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-3">
                      {getAlertIcon(alert.type)}
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-muted-foreground">{alert.time}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissAlert(alert.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
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
              <CardTitle className="text-sm font-medium">Today&apos;s Entries</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayEntries}</div>
              <p className="text-xs text-muted-foreground">
                {stats.todayEntries > stats.yesterdayEntries ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +{stats.todayEntries - stats.yesterdayEntries} from yesterday
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    {stats.todayEntries - stats.yesterdayEntries} from yesterday
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Exits</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayExits}</div>
              <p className="text-xs text-muted-foreground">
                {stats.todayExits > stats.yesterdayExits ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +{stats.todayExits - stats.yesterdayExits} from yesterday
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    {stats.todayExits - stats.yesterdayExits} from yesterday
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Visitors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeVisitors}</div>
              <p className="text-xs text-muted-foreground">
                Currently on premises
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weekly Total</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.weeklyEntries + stats.weeklyExits}</div>
              <p className="text-xs text-muted-foreground">
                {stats.weeklyEntries} entries, {stats.weeklyExits} exits
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Current Visitors & Security Checks */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" /> Current Visitors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentVisitors.length > 0 ? (
                <div className="space-y-3">
                  {currentVisitors.map((visitor) => (
                    <div key={visitor.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{visitor.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {visitor.purpose} • {visitor.entryTime}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Duration: {visitor.duration}
                        </div>
                      </div>
                      <Badge variant="outline">{visitor.purpose}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No visitors" description="No visitors currently on premises." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> Security Checks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityChecks.map((check) => (
                  <div key={check.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{check.area}</div>
                      <div className="text-sm text-muted-foreground">
                        {check.time} • {check.notes}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        check.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }>
                        {check.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markSecurityCheckComplete(check.id)}
                        className="h-6 w-6 p-0"
                      >
                        {check.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <div className="w-3 h-3 rounded border border-gray-300" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Weather & Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Temperature</span>
                  </div>
                  <span className="font-medium">{weather.temperature}°C</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Condition</span>
                  </div>
                  <span className="font-medium">{weather.condition}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Humidity</span>
                  </div>
                  <span className="font-medium">{weather.humidity}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Wind Speed</span>
                  </div>
                  <span className="font-medium">{weather.windSpeed} km/h</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/dashboard/watchman/entry">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Record New Entry
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/dashboard/watchman/exit">
                  <UserX className="h-4 w-4 mr-2" />
                  Record Exit
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/dashboard/watchman/activity">
                  <FileText className="h-4 w-4 mr-2" />
                  View Gate Activity
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/dashboard/watchman/report">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <div className={`w-2 h-2 bg-${activity.color}-500 rounded-full`}></div>
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
                ))
              ) : (
                <EmptyState title="No recent activity" description="Latest gate log events will appear here." />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Today&apos;s Schedule</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {schedule.map((task) => (
                <div 
                  key={task.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    task.completed ? 'bg-green-50 dark:bg-green-900/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">{task.time}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markTaskComplete(task.id)}
                      className="h-6 w-6 p-0"
                    >
                      {task.completed ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <div className="w-3 h-3 rounded border border-gray-300" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function WatchmanDashboard() {
  return (
    <EventsProvider channels={[ 'gate_logs' ]}>
      <WatchmanInner />
    </EventsProvider>
  );
}
