'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Filter,
  BarChart3,
  LineChart,
  PieChart,
  Server,
  Database,
  Cpu,
  MemoryStick
} from 'lucide-react';

export default function PerformanceAnalyticsPage() {
  const getCSRF = () => {
    try { const m=document.cookie.match(/(?:^|; )csrftoken=([^;]+)/); return m?decodeURIComponent(m[1]):''; } catch { return ''; }
  };
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    endpoint: '',
    method: '',
    statusCode: '',
    limit: 100
  });

  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadPerformanceData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCSRF(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ filters })
      });

      if (!response.ok) {
        throw new Error('Failed to load performance data');
      }

      const result = await response.json();
      setPerformanceData(result.data);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadPerformanceData();
  }, [loadPerformanceData]);

  const StatCard = ({ title, value, icon: Icon, color = 'blue', trend = null, subtitle = null }) => (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-1">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </Card>
  );

  const PerformanceTable = ({ data, title }) => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Endpoint
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Count
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Response Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Error Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item._id.endpoint}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <Badge variant={item._id.method === 'GET' ? 'success' : 'warning'}>
                    {item._id.method}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.avgResponseTime?.toFixed(2)}ms
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className={`${item.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {item.errorRate?.toFixed(2)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.errorRate > 5 ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const ErrorTable = ({ data, title }) => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Endpoint
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Count
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Response Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Occurrence
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <Badge variant={item._id.statusCode >= 500 ? 'destructive' : 'warning'}>
                    {item._id.statusCode}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item._id.endpoint}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.avgResponseTime?.toFixed(2)}ms
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(item.lastOccurrence).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Analytics</h1>
          <p className="text-gray-600 mt-1">
            Monitor system performance, response times, and error rates
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={loadPerformanceData}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Loading...' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Performance Filters</h2>
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
              Endpoint
            </label>
            <Input
              placeholder="Filter by endpoint"
              value={filters.endpoint}
              onChange={(e) => setFilters(prev => ({ ...prev, endpoint: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Method
            </label>
            <Select value={filters.method} onValueChange={(value) => setFilters(prev => ({ ...prev, method: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </Card>
      )}

      {/* Performance Data */}
      {performanceData && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Requests"
              value={performanceData.performance?.reduce((sum, item) => sum + item.count, 0) || 0}
              icon={Activity}
              color="blue"
            />
            <StatCard
              title="Avg Response Time"
              value={`${(performanceData.performance?.reduce((sum, item) => sum + item.avgResponseTime, 0) / (performanceData.performance?.length || 1)).toFixed(2)}ms`}
              icon={Clock}
              color="green"
            />
            <StatCard
              title="Error Rate"
              value={`${(performanceData.performance?.reduce((sum, item) => sum + item.errorRate, 0) / (performanceData.performance?.length || 1)).toFixed(2)}%`}
              icon={AlertTriangle}
              color="red"
            />
            <StatCard
              title="System Uptime"
              value={`${Math.floor(performanceData.systemHealth?.[0]?.avgUptime / 3600) || 0}h`}
              icon={Server}
              color="purple"
            />
          </div>

          {/* System Health Metrics */}
          {performanceData.systemHealth && performanceData.systemHealth.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Memory Usage"
                value={`${performanceData.systemHealth[0]?.avgMemoryUsage?.toFixed(2) || 0}MB`}
                icon={MemoryStick}
                color="orange"
              />
              <StatCard
                title="CPU Usage"
                value={`${performanceData.systemHealth[0]?.avgCpuUsage?.toFixed(2) || 0}%`}
                icon={Cpu}
                color="red"
              />
              <StatCard
                title="DB Connections"
                value={performanceData.systemHealth[0]?.avgDatabaseConnections?.toFixed(0) || 0}
                icon={Database}
                color="blue"
              />
              <StatCard
                title="Cache Hit Rate"
                value={`${performanceData.systemHealth[0]?.avgCacheHitRate?.toFixed(2) || 0}%`}
                icon={BarChart3}
                color="green"
              />
            </div>
          )}

          {/* Performance Table */}
          <PerformanceTable
            data={performanceData.performance}
            title="API Performance Metrics"
          />

          {/* Error Analytics */}
          {performanceData.errors && performanceData.errors.length > 0 && (
            <ErrorTable
              data={performanceData.errors}
              title="Error Analytics"
            />
          )}
        </div>
      )}

      {/* Empty State */}
      {!performanceData && !loading && (
        <Card className="p-12 text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Performance Data
          </h3>
          <p className="text-gray-600 mb-4">
            Performance metrics will appear here once the system starts collecting data.
          </p>
          <Button onClick={loadPerformanceData} disabled={loading}>
            Load Performance Data
          </Button>
        </Card>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <div className="text-center text-sm text-gray-500">
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
}
