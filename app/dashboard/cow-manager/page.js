'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw,
  Heart,
  Stethoscope,
  Shield,
  Users,
  Calendar,
  AlertTriangle,
  Activity,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import EventsProvider, { useEvents } from '@/components/providers/EventsProvider';

function CowManagerInner() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    totalCows: 0,
    healthyCows: 0,
    sickCows: 0,
    pregnantCows: 0,
    activeTreatments: 0,
    pendingVaccinations: 0,
  });

  const [recentCows, setRecentCows] = useState([]);
  const [recentTreatments, setRecentTreatments] = useState([]);
  const [recentVaccinations, setRecentVaccinations] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // CSV helpers
  const toCSV = (rows) => {
    if (!rows || rows.length === 0) return '';
    const headers = Array.from(
      rows.reduce((set, r) => {
        Object.keys(r || {}).forEach(k => set.add(k));
        return set;
      }, new Set())
    );
    const escape = (v) => {
      if (v === null || typeof v === 'undefined') return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map(h => escape(row[h])).join(','));
    }
    return lines.join('\n');
  };

  const downloadCSV = (filename, rows) => {
    try {
      const csv = toCSV(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV export failed', e);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [cowsRes, treatmentsRes, vaccRes, alertsRes] = await Promise.all([
        fetch('/api/goshala-manager/cows?limit=10', { cache: 'no-store' }),
        fetch('/api/goshala-manager/health/treatments?limit=10', { cache: 'no-store' }),
        fetch('/api/goshala-manager/health/vaccinations?limit=10', { cache: 'no-store' }),
        fetch('/api/goshala-manager/alerts/summary', { cache: 'no-store' }),
      ]);

      const [cowsData, treatmentsData, vaccData, alertsData] = await Promise.all([
        cowsRes.json(),
        treatmentsRes.json(),
        vaccRes.json(),
        alertsRes.json(),
      ]);

      const cows = cowsData.cows || [];
      const treatments = treatmentsData.treatments || [];
      const vaccinations = vaccData.vaccinations || [];

      const healthyCows = cows.filter(c => c.health === 'healthy').length;
      const sickCows = cows.filter(c => c.health === 'sick').length;
      const pregnantCows = cows.filter(c => c.pregnant === true).length;
      const activeTreatments = treatments.filter(t => t.status === 'active').length;
      const pendingVaccinations = vaccinations.filter(v => v.status === 'pending').length;

      setStats({
        totalCows: cows.length,
        healthyCows,
        sickCows,
        pregnantCows,
        activeTreatments,
        pendingVaccinations,
      });

      setRecentCows(cows.slice(0, 5));
      setRecentTreatments(treatments.slice(0, 5));
      setRecentVaccinations(vaccinations.slice(0, 5));
      setAlerts(alertsData.summary || []);
    } catch (error) {
      console.error('Error fetching cow manager data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const id = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(id);
  }, [fetchDashboardData]);

  const handleRefresh = () => fetchDashboardData();

  // Live updates via SSE for cows/treatments/vaccinations/alerts
  const { subscribe } = useEvents();
  useEffect(() => {
    const unsub = subscribe((event) => {
      if (event?.type === 'change' && ['cows','treatments','vaccinations','alerts'].includes(event.collection)) {
        fetchDashboardData();
      }
    });
    return unsub;
  }, [subscribe, fetchDashboardData]);

  if (loading) {
    return (
      <div className="min-h-screen w-full p-6">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const statusBadge = (status) => {
    switch (status) {
      case 'healthy': return <Badge>healthy</Badge>;
      case 'sick': return <Badge variant="destructive">sick</Badge>;
      default: return <Badge variant="secondary">{status || 'unknown'}</Badge>;
    }
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Cow Manager Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {session?.user?.userId || 'Cow Manager'}! Here’s your herd overview.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {/* Quick Actions */}
            <Button asChild variant="default">
              <Link href="/dashboard/cow-manager/cows/add">Add Cow</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/goshala-manager/health">Record Treatment</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/goshala-manager/health">Schedule Vaccination</Link>
            </Button>
          </div>
        </div>

        {/* CSV Export */}
        <Card>
          <CardHeader>
            <CardTitle>Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => downloadCSV(`cows-${new Date().toISOString().slice(0,10)}.csv`, recentCows)}>
                Export Cows (CSV)
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadCSV(`treatments-${new Date().toISOString().slice(0,10)}.csv`, recentTreatments)}>
                Export Treatments (CSV)
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadCSV(`vaccinations-${new Date().toISOString().slice(0,10)}.csv`, recentVaccinations)}>
                Export Vaccinations (CSV)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cows</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCows}</div>
              <p className="text-xs text-muted-foreground">In herd</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Healthy</CardTitle>
              <Heart className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.healthyCows}</div>
              <p className="text-xs text-muted-foreground">Good condition</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sick</CardTitle>
              <Stethoscope className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sickCows}</div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pregnant</CardTitle>
              <Shield className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pregnantCows}</div>
              <p className="text-xs text-muted-foreground">Under care</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Cows */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recent Cows
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/cow-manager/cows">
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/goshala-manager/reports">
                    Reports
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCows.length > 0 ? (
                recentCows.map((cow) => (
                  <div key={cow._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{cow.name || cow.tagId || 'Unnamed Cow'}</p>
                      <p className="text-sm text-muted-foreground">{cow.breed || 'Unknown breed'}</p>
                    </div>
                    {statusBadge(cow.health)}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No cows found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Treatments and Vaccinations */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Recent Treatments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTreatments.length > 0 ? (
                  recentTreatments.map((t) => (
                    <div key={t._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{t.treatment || 'Treatment'}</p>
                        <p className="text-sm text-muted-foreground">{t.cowId || 'Unknown cow'}</p>
                      </div>
                      <Badge variant={t.status === 'completed' ? 'secondary' : t.status === 'active' ? 'default' : 'outline'}>{t.status || 'unknown'}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No treatments found</p>
                )}
              </div>
              <div className="mt-3">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/goshala-manager/health">Go to Health</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Vaccinations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentVaccinations.length > 0 ? (
                  recentVaccinations.map((v) => (
                    <div key={v._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{v.vaccineName || 'Vaccination'}</p>
                        <p className="text-sm text-muted-foreground">{v.cowId || 'Unknown cow'}</p>
                      </div>
                      <Badge variant={v.status === 'completed' ? 'secondary' : v.status === 'pending' ? 'outline' : 'default'}>{v.status || 'unknown'}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No vaccinations found</p>
                )}
              </div>
              <div className="mt-3">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/goshala-manager/alerts">Go to Alerts</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Alerts Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.isArray(alerts) && alerts.length > 0 ? (
                alerts.map((a, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{a.type || 'Alert'}</p>
                      <p className="text-sm text-muted-foreground">{a.message || a.category || '—'}</p>
                    </div>
                    <Badge variant={a.severity === 'critical' ? 'destructive' : a.severity === 'warning' ? 'warning' : 'secondary'}>
                      {a.severity || 'info'}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No alerts</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CowManagerDashboard() {
  return (
    <EventsProvider channels={[ 'cows','treatments','vaccinations','alerts' ]}>
      <CowManagerInner />
    </EventsProvider>
  );
}


