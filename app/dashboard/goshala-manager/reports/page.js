'use client';

import { RefreshCw, FileText, Download, TrendingUp, Users, DollarSign, Package, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useCallback } from 'react';

export default function ReportsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [period, setPeriod] = useState('monthly');

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/goshala-manager/reports/summary?period=${period}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setSummary(data);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const exportReport = async (format) => {
    try {
      const res = await fetch(`/api/goshala-manager/reports/export?period=${period}&format=${format}`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': document.cookie.match(/(?:^|; )csrftoken=([^;]+)/)?.[1] || '' },
        credentials: 'same-origin'
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `goshala-report-${period}-${new Date().toISOString().slice(0,10)}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-5 w-5"/> Reports & Analytics</h1>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Period"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" disabled={refreshing} onClick={load}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin':''}`} /> Refresh
            </Button>
            <Button variant="outline" onClick={() => exportReport('pdf')}>
              <Download className="h-4 w-4 mr-2" /> PDF
            </Button>
            <Button variant="outline" onClick={() => exportReport('csv')}>
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cattle</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.herd?.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {summary?.herd?.cow || 0} cows, {summary?.herd?.calf || 0} calves
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Milk Production</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalMilk || 0}L</div>
              <p className="text-xs text-muted-foreground">
                {summary?.avgMilkPerCow ? `${summary.avgMilkPerCow}L per cow` : 'No data'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{Number(summary?.totalExpenses || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {summary?.avgDailyExpense ? `₹${summary.avgDailyExpense}/day` : 'No data'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{Number(summary?.totalDonations || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {summary?.donationCount || 0} donations received
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Stock Status */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-4 w-4"/> Stock Status</CardTitle></CardHeader>
            <CardContent>
              {loading || !summary ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Healthy Stock</span>
                    <Badge className="bg-green-100 text-green-800">{summary.stock?.healthy || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Low Stock</span>
                    <Badge className="bg-yellow-100 text-yellow-800">{summary.stock?.low || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Critical Stock</span>
                    <Badge className="bg-red-100 text-red-800">{summary.stock?.critical || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Consumption ({period})</span>
                    <span className="font-medium">{summary.totalConsumption || 0} units</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health Overview */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4"/> Health Overview</CardTitle></CardHeader>
            <CardContent>
              {loading || !summary ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Healthy Cows</span>
                    <Badge className="bg-green-100 text-green-800">{summary.health?.healthy || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Sick Cows</span>
                    <Badge className="bg-red-100 text-red-800">{summary.health?.sick || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pregnant Cows</span>
                    <Badge className="bg-blue-100 text-blue-800">{summary.health?.pregnant || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Lactating Cows</span>
                    <Badge className="bg-purple-100 text-purple-800">{summary.health?.lactating || 0}</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4"/> Financial Summary ({period})</CardTitle></CardHeader>
          <CardContent>
            {loading || !summary ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">₹{Number(summary.totalDonations || 0).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Donations</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">₹{Number(summary.totalExpenses || 0).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Expenses</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className={`text-2xl font-bold ${(summary.totalDonations || 0) - (summary.totalExpenses || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{Number((summary.totalDonations || 0) - (summary.totalExpenses || 0)).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Net Balance</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4"/> Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {loading || !summary ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-3">
                {summary.recentActivity?.length ? summary.recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{activity.type}</div>
                      <div className="text-sm text-muted-foreground">{activity.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{new Date(activity.date).toLocaleDateString()}</div>
                      <Badge className={activity.priority === 'high' ? 'bg-red-100 text-red-800' : activity.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                        {activity.priority}
                      </Badge>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-muted-foreground">No recent activity</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


