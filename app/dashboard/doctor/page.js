'use client';

import { RefreshCw, Shield, Users, Calendar, AlertTriangle, Activity, Package, Clock, TrendingUp, Heart, Pill, Syringe, FileText, Plus, ArrowRight, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

export default function DoctorDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    upcomingVacc: [],
    activeTreat: [],
    alerts: [],
    todayAppointments: [],
    lowStockMeds: [],
    healthMetrics: {
      totalCows: 0,
      sickerCows: 0,
      recoveredThisMonth: 0,
      vaccinesThisWeek: 0,
      criticalCases: 0
    }
  });

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const [vaccRes, treatRes, alertRes, appointRes, medRes, cowRes] = await Promise.all([
        fetch('/api/goshala-manager/health/vaccinations?upcoming=true&limit=5', { cache: 'no-store' }),
        fetch('/api/goshala-manager/health/treatments?active=true&limit=5', { cache: 'no-store' }),
        fetch('/api/doctor/alerts', { cache: 'no-store' }),
        fetch('/api/doctor/appointments', { cache: 'no-store' }),
        fetch('/api/doctor/medicines?lowStockOnly=true', { cache: 'no-store' }),
        fetch('/api/goshala-manager/cows?limit=1000', { cache: 'no-store' })
      ]);

      const [vaccData, treatData, alertData, appointData, medData, cowData] = await Promise.all([
        vaccRes.json(),
        treatRes.json(),
        alertRes.json(),
        appointRes.json(),
        medRes.json(),
        cowRes.json()
      ]);

      // Filter today's appointments
      const today = new Date().toDateString();
      const todayAppointments = (appointData.appointments || []).filter(a => 
        new Date(a.when).toDateString() === today
      );

      // Calculate health metrics
      const cows = cowData.cows || [];
      const treatments = treatData.treatments || [];
      const currentMonth = new Date().getMonth();
      const currentWeek = Math.floor((new Date().getDate() - 1) / 7);
      
      const recoveredThisMonth = treatments.filter(t => 
        t.outcome === 'Recovered' && 
        new Date(t.endedAt || t.updatedAt).getMonth() === currentMonth
      ).length;

      const vaccinesThisWeek = (vaccData.vaccinations || []).filter(v => {
        const vaccDate = new Date(v.scheduledAt);
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return vaccDate >= weekStart;
      }).length;

      const criticalCases = treatments.filter(t => 
        t.flags && t.flags.includes('NeedsAdminAttention')
      ).length;

      const sickerCows = cows.filter(c => c.status === 'sick').length;

      setData({
        upcomingVacc: vaccData.vaccinations || [],
        activeTreat: treatments,
        alerts: alertData.alerts || [],
        todayAppointments,
        lowStockMeds: medData.medicines || [],
        healthMetrics: {
          totalCows: cows.length,
          sickerCows,
          recoveredThisMonth,
          vaccinesThisWeek,
          criticalCases
        }
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const StatCard = ({ title, value, icon: Icon, color = "blue", subtitle, href }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 bg-${color}-100 rounded-lg`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
        </div>
        {href && (
          <Link href={href} className="flex items-center mt-2 text-xs text-blue-600 hover:text-blue-800">
            View Details <ChevronRight className="h-3 w-3 ml-1" />
          </Link>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Heart className="h-8 w-8 text-red-500" />
              Doctor Dashboard
            </h1>
            <p className="text-muted-foreground">Comprehensive veterinary management for the goshala</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> 
              Refresh
            </Button>
            <Button asChild>
              <Link href="/dashboard/doctor/treatments">
                <Plus className="h-4 w-4 mr-2" />
                New Treatment
              </Link>
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Cows"
            value={data.healthMetrics.totalCows}
            icon={Users}
            color="blue"
            href="/dashboard/doctor/patients"
          />
          <StatCard
            title="Sick Cows"
            value={data.healthMetrics.sickerCows}
            icon={AlertTriangle}
            color="red"
            subtitle="Need attention"
          />
          <StatCard
            title="Recovered This Month"
            value={data.healthMetrics.recoveredThisMonth}
            icon={TrendingUp}
            color="green"
            subtitle="Success rate"
          />
          <StatCard
            title="Vaccines This Week"
            value={data.healthMetrics.vaccinesThisWeek}
            icon={Syringe}
            color="purple"
            href="/dashboard/doctor/vaccinations"
          />
          <StatCard
            title="Critical Cases"
            value={data.healthMetrics.criticalCases}
            icon={AlertTriangle}
            color="orange"
            subtitle="Need admin attention"
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button asChild variant="outline" className="h-20 flex-col">
                <Link href="/dashboard/doctor/treatments">
                  <Shield className="h-6 w-6 mb-2" />
                  Add Treatment
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col">
                <Link href="/dashboard/doctor/vaccinations">
                  <Syringe className="h-6 w-6 mb-2" />
                  Record Vaccination
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col">
                <Link href="/dashboard/doctor/medicines">
                  <Pill className="h-6 w-6 mb-2" />
                  Manage Medicines
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col">
                <Link href="/dashboard/doctor/appointments">
                  <Clock className="h-6 w-6 mb-2" />
                  Schedule Appointment
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Critical Information */}
        {(data.alerts.length > 0 || data.lowStockMeds.length > 0) && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Alerts & Critical Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.lowStockMeds.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Package className="h-4 w-4 text-red-500 mt-1" />
                    <div>
                      <p className="font-medium text-red-700">Low Stock Medicines</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {data.lowStockMeds.slice(0, 5).map(med => (
                          <Badge key={med._id} variant="destructive" className="text-xs">
                            {med.name} ({med.stockQty || 0}/{med.minStock})
                          </Badge>
                        ))}
                        {data.lowStockMeds.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{data.lowStockMeds.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {data.alerts.slice(0, 3).map((alert, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-1" />
                    <div>
                      <p className="font-medium text-red-700">{alert.type}</p>
                      <p className="text-sm text-red-600">{alert.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Today's Appointments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Today&apos;s Appointments ({data.todayAppointments.length})
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/doctor/appointments">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : data.todayAppointments.length > 0 ? (
                <div className="space-y-3">
                  {data.todayAppointments.map(a => (
                    <div key={`${a.tagId}-${a.when}`} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{a.tagId} - {a.reason}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(a.when).toLocaleTimeString()} • Dr. {a.vet}
                        </div>
                      </div>
                      <Badge variant={a.status === 'completed' ? 'default' : 'secondary'}>
                        {a.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No appointments scheduled for today
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Vaccinations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Syringe className="h-5 w-5 text-purple-500" />
                Upcoming Vaccinations ({data.upcomingVacc.length})
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/doctor/vaccinations">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : data.upcomingVacc.length > 0 ? (
                <div className="space-y-3">
                  {data.upcomingVacc.map(v => (
                    <div key={`${v.tagId}-${v.vaccine}-${v.scheduledAt}`} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{v.vaccine}</div>
                        <div className="text-sm text-muted-foreground">
                          {v.tagId} • {new Date(v.scheduledAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {Math.ceil((new Date(v.scheduledAt) - new Date()) / (1000 * 60 * 60 * 24))} days
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No upcoming vaccinations
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Treatments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Active Treatments ({data.activeTreat.length})
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/doctor/treatments">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : data.activeTreat.length > 0 ? (
              <div className="space-y-3">
                {data.activeTreat.slice(0, 5).map(t => (
                  <div key={`${t.tagId}-${t.diagnosis}-${t.startedAt}`} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{t.diagnosis}</div>
                      <div className="text-sm text-muted-foreground">
                        {t.tagId} • {t.illnessCategory} • Since {new Date(t.startedAt).toLocaleDateString()}
                      </div>
                      {t.medicine && (
                        <div className="text-xs text-blue-600 mt-1">
                          Rx: {t.medicine} {t.dosage && `(${t.dosage})`}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={t.outcome === 'Recovered' ? 'default' : 'secondary'}>
                        {t.outcome || 'Ongoing'}
                      </Badge>
                      {t.flags && t.flags.includes('NeedsAdminAttention') && (
                        <Badge variant="destructive" className="text-xs">
                          Critical
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {data.activeTreat.length > 5 && (
                  <div className="text-center pt-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/dashboard/doctor/treatments">
                        View {data.activeTreat.length - 5} more treatments
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No active treatments
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" />
              Quick Health Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{data.upcomingVacc.length}</div>
                <div className="text-blue-700">Pending Vaccinations</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{data.activeTreat.length}</div>
                <div className="text-green-700">Active Treatments</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{data.lowStockMeds.length}</div>
                <div className="text-orange-700">Low Stock Medicines</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


