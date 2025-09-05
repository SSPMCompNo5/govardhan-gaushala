'use client';

import { RefreshCw, BarChart3, TrendingUp, Download, Calendar, Filter, FileText, Users, Shield, Pill, Activity, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useCallback } from 'react';

export default function DoctorReportsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    reportType: 'overview',
    illnessCategory: '',
    outcome: '',
    medicine: ''
  });
  const [reportData, setReportData] = useState({
    overview: {
      totalTreatments: 0,
      activeTreatments: 0,
      recoveredTreatments: 0,
      totalVaccinations: 0,
      uniqueCowsTreated: 0,
      averageTreatmentDuration: 0
    },
    treatments: [],
    vaccinations: [],
    medicines: [],
    illnessStats: [],
    outcomeStats: [],
    medicineUsage: [],
    monthlyTrends: []
  });

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      
      const params = new URLSearchParams({
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        reportType: filters.reportType
      });
      
      if (filters.illnessCategory) params.set('illnessCategory', filters.illnessCategory);
      if (filters.outcome) params.set('outcome', filters.outcome);
      if (filters.medicine) params.set('medicine', filters.medicine);

      const [treatRes, vaccRes, medRes] = await Promise.all([
        fetch(`/api/goshala-manager/health/treatments?${params.toString()}`, { cache: 'no-store' }),
        fetch(`/api/goshala-manager/health/vaccinations?${params.toString()}`, { cache: 'no-store' }),
        fetch('/api/doctor/medicines', { cache: 'no-store' })
      ]);

      const [treatData, vaccData, medData] = await Promise.all([
        treatRes.json(),
        vaccRes.json(),
        medRes.json()
      ]);

      const treatments = treatData.treatments || [];
      const vaccinations = vaccData.vaccinations || [];
      const medicines = medData.medicines || [];

      // Calculate overview metrics
      const activeTreatments = treatments.filter(t => t.status === 'active').length;
      const recoveredTreatments = treatments.filter(t => t.outcome === 'Recovered').length;
      const uniqueCowsTreated = new Set(treatments.map(t => t.tagId)).size;
      
      const treatmentDurations = treatments
        .filter(t => t.endedAt && t.startedAt)
        .map(t => (new Date(t.endedAt) - new Date(t.startedAt)) / (1000 * 60 * 60 * 24));
      const averageTreatmentDuration = treatmentDurations.length > 0 
        ? Math.round(treatmentDurations.reduce((a, b) => a + b, 0) / treatmentDurations.length)
        : 0;

      // Illness category statistics
      const illnessStats = {};
      treatments.forEach(t => {
        const category = t.illnessCategory || 'other';
        illnessStats[category] = (illnessStats[category] || 0) + 1;
      });

      // Outcome statistics
      const outcomeStats = {};
      treatments.forEach(t => {
        const outcome = t.outcome || 'ongoing';
        outcomeStats[outcome] = (outcomeStats[outcome] || 0) + 1;
      });

      // Medicine usage statistics
      const medicineUsage = {};
      treatments.forEach(t => {
        if (t.medicine) {
          medicineUsage[t.medicine] = (medicineUsage[t.medicine] || 0) + 1;
        }
      });

      // Monthly trends (last 6 months)
      const monthlyTrends = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toISOString().slice(0, 7); // YYYY-MM format
        
        const monthTreatments = treatments.filter(t => 
          t.startedAt && t.startedAt.startsWith(monthStr)
        ).length;
        
        const monthVaccinations = vaccinations.filter(v => 
          v.scheduledAt && v.scheduledAt.startsWith(monthStr)
        ).length;

        monthlyTrends.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          treatments: monthTreatments,
          vaccinations: monthVaccinations
        });
      }

      setReportData({
        overview: {
          totalTreatments: treatments.length,
          activeTreatments,
          recoveredTreatments,
          totalVaccinations: vaccinations.length,
          uniqueCowsTreated,
          averageTreatmentDuration
        },
        treatments,
        vaccinations,
        medicines,
        illnessStats: Object.entries(illnessStats).map(([category, count]) => ({ category, count })),
        outcomeStats: Object.entries(outcomeStats).map(([outcome, count]) => ({ outcome, count })),
        medicineUsage: Object.entries(medicineUsage)
          .map(([medicine, count]) => ({ medicine, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        monthlyTrends
      });

    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [dateRange, filters]);

  useEffect(() => { load(); }, [load]);

  const exportReport = async (format) => {
    try {
      const params = new URLSearchParams({
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        format,
        reportType: 'doctor_health_report'
      });

      const response = await fetch(`/api/admin/reports?${params.toString()}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `doctor_health_report_${dateRange.from}_${dateRange.to}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const MetricCard = ({ title, value, subtitle, icon: Icon, color = "blue" }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 bg-${color}-100 rounded-lg`}>
            <Icon className={`h-8 w-8 text-${color}-600`} />
          </div>
        </div>
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
              <BarChart3 className="h-8 w-8 text-blue-500" />
              Health Reports & Analytics
            </h1>
            <p className="text-muted-foreground">Comprehensive health statistics and trends</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => exportReport('json')}>
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button variant="outline" onClick={() => exportReport('csv')}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Date Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div>
                <label className="text-sm font-medium">From Date</label>
                <input
                  type="date"
                  className="w-full border rounded p-2 mt-1"
                  value={dateRange.from}
                  onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">To Date</label>
                <input
                  type="date"
                  className="w-full border rounded p-2 mt-1"
                  value={dateRange.to}
                  onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Illness Category</label>
                <select
                  className="w-full border rounded p-2 mt-1"
                  value={filters.illnessCategory}
                  onChange={e => setFilters(prev => ({ ...prev, illnessCategory: e.target.value }))}
                >
                  <option value="">All Categories</option>
                  <option value="fever">Fever</option>
                  <option value="infection">Infection</option>
                  <option value="digestive">Digestive</option>
                  <option value="injury">Injury</option>
                  <option value="respiratory">Respiratory</option>
                  <option value="skin">Skin</option>
                  <option value="reproductive">Reproductive</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Outcome</label>
                <select
                  className="w-full border rounded p-2 mt-1"
                  value={filters.outcome}
                  onChange={e => setFilters(prev => ({ ...prev, outcome: e.target.value }))}
                >
                  <option value="">All Outcomes</option>
                  <option value="Recovered">Recovered</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Referred">Referred</option>
                  <option value="Deceased">Deceased</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Medicine</label>
                <input
                  type="text"
                  placeholder="Medicine name"
                  className="w-full border rounded p-2 mt-1"
                  value={filters.medicine}
                  onChange={e => setFilters(prev => ({ ...prev, medicine: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={load} className="w-full">
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Total Treatments"
            value={reportData.overview.totalTreatments}
            subtitle={`${reportData.overview.activeTreatments} active`}
            icon={Shield}
            color="blue"
          />
          <MetricCard
            title="Recovery Rate"
            value={reportData.overview.totalTreatments > 0 
              ? `${Math.round((reportData.overview.recoveredTreatments / reportData.overview.totalTreatments) * 100)}%`
              : '0%'
            }
            subtitle={`${reportData.overview.recoveredTreatments} recovered`}
            icon={TrendingUp}
            color="green"
          />
          <MetricCard
            title="Cows Treated"
            value={reportData.overview.uniqueCowsTreated}
            subtitle="Unique patients"
            icon={Users}
            color="purple"
          />
          <MetricCard
            title="Total Vaccinations"
            value={reportData.overview.totalVaccinations}
            subtitle="Immunizations given"
            icon={Activity}
            color="orange"
          />
          <MetricCard
            title="Avg Treatment Duration"
            value={`${reportData.overview.averageTreatmentDuration} days`}
            subtitle="From start to recovery"
            icon={Calendar}
            color="indigo"
          />
          <MetricCard
            title="Medicine Types"
            value={reportData.medicines.length}
            subtitle="In inventory"
            icon={Pill}
            color="pink"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Illness Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Illness Category Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {reportData.illnessStats.map(stat => (
                    <div key={stat.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span className="capitalize">{stat.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{stat.count}</span>
                        <Badge variant="outline">
                          {reportData.overview.totalTreatments > 0 
                            ? Math.round((stat.count / reportData.overview.totalTreatments) * 100)
                            : 0
                          }%
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {reportData.illnessStats.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No illness data for the selected period
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Treatment Outcomes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Treatment Outcomes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {reportData.outcomeStats.map(stat => {
                    const colors = {
                      'Recovered': 'bg-green-500',
                      'Ongoing': 'bg-blue-500',
                      'Referred': 'bg-orange-500',
                      'Deceased': 'bg-red-500',
                      'ongoing': 'bg-gray-500'
                    };
                    return (
                      <div key={stat.outcome} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 ${colors[stat.outcome] || 'bg-gray-500'} rounded`}></div>
                          <span className="capitalize">{stat.outcome}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{stat.count}</span>
                          <Badge variant="outline">
                            {reportData.overview.totalTreatments > 0 
                              ? Math.round((stat.count / reportData.overview.totalTreatments) * 100)
                              : 0
                            }%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  {reportData.outcomeStats.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No outcome data for the selected period
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Medicine Usage Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-purple-500" />
              Top Medicine Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {reportData.medicineUsage.map((med, idx) => (
                  <div key={med.medicine} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-purple-600">{idx + 1}</span>
                      </div>
                      <span className="font-medium">{med.medicine}</span>
                    </div>
                    <Badge variant="secondary">{med.count} uses</Badge>
                  </div>
                ))}
                {reportData.medicineUsage.length === 0 && (
                  <div className="col-span-2 text-center text-muted-foreground py-8">
                    No medicine usage data for the selected period
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              6-Month Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-6 gap-4">
                  {reportData.monthlyTrends.map(trend => (
                    <div key={trend.month} className="text-center p-4 border rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        {trend.month}
                      </div>
                      <div className="space-y-2">
                        <div className="text-lg font-bold text-blue-600">
                          {trend.treatments}
                        </div>
                        <div className="text-xs text-muted-foreground">Treatments</div>
                        <div className="text-lg font-bold text-purple-600">
                          {trend.vaccinations}
                        </div>
                        <div className="text-xs text-muted-foreground">Vaccinations</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" />
              Report Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p>
                <strong>Report Period:</strong> {dateRange.from} to {dateRange.to}
              </p>
              <p>
                <strong>Total Health Interventions:</strong> {reportData.overview.totalTreatments + reportData.overview.totalVaccinations}
              </p>
              <p>
                <strong>Active Cases:</strong> {reportData.overview.activeTreatments}
              </p>
              <p>
                <strong>Success Rate:</strong> {reportData.overview.totalTreatments > 0 
                  ? Math.round((reportData.overview.recoveredTreatments / reportData.overview.totalTreatments) * 100)
                  : 0
                }% recovery rate
              </p>
              <p>
                <strong>Generated:</strong> {new Date().toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
