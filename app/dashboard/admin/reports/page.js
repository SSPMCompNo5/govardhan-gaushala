'use client';

import { useState, useEffect, useCallback } from 'react';
import EmptyState from '@/components/EmptyState';
import { t } from '@/lib/i18n';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Download, 
  Filter, 
  Calendar, 
  TrendingUp, 
  Users, 
  Package, 
  Heart, 
  Stethoscope,
  Activity,
  RefreshCw,
  FileText,
  PieChart,
  LineChart
} from 'lucide-react';

export default function AdvancedReportsPage() {
  const getCSRF = () => {
    try { const m=document.cookie.match(/(?:^|; )csrftoken=([^;]+)/); return m?decodeURIComponent(m[1]):''; } catch { return ''; }
  };
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    module: 'all',
    status: '',
    category: '',
    limit: 100
  });

  const [config, setConfig] = useState({
    type: 'summary',
    format: 'json',
    includeCharts: true,
    groupBy: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCSRF(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ filters, config })
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const result = await response.json();
      setReportData(result.data);
      setLastGenerated(new Date().toISOString());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, config]);

  const exportReport = async (format) => {
    try {
      const response = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCSRF(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ 
          filters, 
          config: { ...config, format } 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `goshala-report-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue', trend = null }) => (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className="flex items-center mt-1">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </Card>
  );

  const ModuleCard = ({ title, data, icon: Icon, color = 'blue' }) => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className={`p-2 rounded-full bg-${color}-100`}>
          <Icon className={`h-5 w-5 text-${color}-600`} />
        </div>
      </div>
      
      {data && (
        <div className="space-y-3">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="text-sm text-gray-600 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span className="font-medium text-gray-900">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Advanced Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights across all Goshala management modules
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Generating...' : 'Generate Report'}</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Report Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Module
            </label>
            <Select value={filters.module} onValueChange={(value) => setFilters(prev => ({ ...prev, module: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="gate">Gate Management</SelectItem>
                <SelectItem value="food">Food Management</SelectItem>
                <SelectItem value="goshala">Goshala Management</SelectItem>
                <SelectItem value="doctor">Doctor Dashboard</SelectItem>
                <SelectItem value="admin">System Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <Select value={config.type} onValueChange={(value) => setConfig(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">Summary</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
                <SelectItem value="export">Export</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 rounded-full bg-red-500"></div>
            <span className="text-red-700">{error}</span>
          </div>
        </Card>
      )}

      {/* Report Data */}
      {loading && (
        <Card className="p-12 text-center" role="status" aria-live="polite">{t('loading')}</Card>
      )}
      {reportData && (
        <div className="space-y-6">
          {/* Metadata */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="text-blue-800 font-medium">Report Generated</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-blue-600">
                  {new Date(reportData.metadata?.generatedAt).toLocaleString()}
                </span>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportReport('csv')}
                    className="flex items-center space-x-1"
                  >
                    <Download className="h-4 w-4" />
                    <span>CSV</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportReport('pdf')}
                    className="flex items-center space-x-1"
                  >
                    <Download className="h-4 w-4" />
                    <span>PDF</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Summary Stats */}
          {reportData.gate && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Entries"
                value={reportData.gate.totals?.totalEntries || 0}
                icon={Users}
                color="green"
              />
              <StatCard
                title="Total Exits"
                value={reportData.gate.totals?.totalExits || 0}
                icon={Users}
                color="red"
              />
              <StatCard
                title="Total Visitors"
                value={reportData.gate.totals?.totalVisitors || 0}
                icon={Users}
                color="blue"
              />
              <StatCard
                title="Avg Visitors/Entry"
                value={reportData.gate.totals?.avgVisitorCount?.toFixed(1) || 0}
                icon={TrendingUp}
                color="purple"
              />
            </div>
          )}

          {/* Module Reports */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reportData.gate && (
              <ModuleCard
                title="Gate Management"
                data={reportData.gate.totals}
                icon={Users}
                color="green"
              />
            )}
            
            {reportData.food && (
              <ModuleCard
                title="Food Management"
                data={reportData.food.inventory?.[0]}
                icon={Package}
                color="orange"
              />
            )}
            
            {reportData.goshala && (
              <ModuleCard
                title="Goshala Management"
                data={reportData.goshala.cows?.[0]}
                icon={Heart}
                color="red"
              />
            )}
            
            {reportData.doctor && (
              <ModuleCard
                title="Doctor Dashboard"
                data={reportData.doctor.treatments?.[0]}
                icon={Stethoscope}
                color="blue"
              />
            )}
            
            {reportData.system && (
              <ModuleCard
                title="System Analytics"
                data={reportData.system.performance}
                icon={Activity}
                color="purple"
              />
            )}
          </div>

          {/* Detailed Data Tables */}
          {config.type === 'detailed' && (
            <div className="space-y-6">
              {reportData.gate?.dailyStats && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Daily Gate Statistics
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Entries
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Exits
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Visitors
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.gate.dailyStats.map((stat, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {stat._id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {stat.entries}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {stat.exits}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {stat.totalVisitors}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!reportData && !loading && (
        <EmptyState
          title="No Report Generated"
          description="Configure filters and generate a report to get started."
          action={<Button onClick={generateReport} disabled={loading}>Generate Your First Report</Button>}
        />
      )}
    </div>
  );
}
