'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  Shield, 
  Zap, 
  Server, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  HardDrive
} from 'lucide-react';

export default function SystemMonitoringPage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/admin/health', {
        credentials: 'same-origin',
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        setHealthData(data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      healthy: 'bg-green-100 text-green-800',
      degraded: 'bg-yellow-100 text-yellow-800',
      unhealthy: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {status?.toUpperCase() || 'UNKNOWN'}
      </Badge>
    );
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
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
            <h1 className="text-3xl font-bold">System Monitoring</h1>
            <p className="text-muted-foreground mt-1">
              Real-time system health and performance monitoring
            </p>
            {lastUpdate && (
              <p className="text-sm text-muted-foreground mt-1">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Disable' : 'Enable'} Auto-refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHealthData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overall Status */}
        {healthData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(healthData.status)}
                  <div>
                    <h3 className="text-lg font-semibold">Overall System Health</h3>
                    <p className="text-sm text-muted-foreground">
                      {healthData.status === 'healthy' && 'All systems operational'}
                      {healthData.status === 'degraded' && 'Some services experiencing issues'}
                      {healthData.status === 'unhealthy' && 'Critical services are down'}
                    </p>
                  </div>
                </div>
                {getStatusBadge(healthData.status)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Service Status */}
        {healthData?.services && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Database */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(healthData.services.database?.status)}
                  {getStatusBadge(healthData.services.database?.status)}
                </div>
                {healthData.services.database?.responseTime && (
                  <p className="text-xs text-muted-foreground">
                    Response: {healthData.services.database.responseTime}ms
                  </p>
                )}
                {healthData.services.database?.stats && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Collections: {healthData.services.database.stats.collections}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Data: {formatBytes(healthData.services.database.stats.dataSize)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Authentication */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Authentication</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(healthData.services.authentication?.status)}
                  {getStatusBadge(healthData.services.authentication?.status)}
                </div>
                {healthData.services.authentication?.responseTime && (
                  <p className="text-xs text-muted-foreground">
                    Response: {healthData.services.authentication.responseTime}ms
                  </p>
                )}
                {healthData.services.authentication?.sessionValid && (
                  <p className="text-xs text-muted-foreground">
                    Session: Valid
                  </p>
                )}
              </CardContent>
            </Card>

            {/* APIs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Endpoints</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {healthData.services.apis && Object.entries(healthData.services.apis).map(([name, api]) => (
                    <div key={name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(api.status)}
                        <span className="text-sm capitalize">{name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {api.responseTime}ms
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Metrics */}
        {healthData?.performance && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium">Total Response Time</p>
                  <p className="text-2xl font-bold">{healthData.performance.totalResponseTime}ms</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Health Check Time</p>
                  <p className="text-2xl font-bold">
                    {new Date(healthData.performance.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(healthData.status)}
                    {getStatusBadge(healthData.status)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Information */}
        {healthData?.system && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm font-medium">Node Version</p>
                  <p className="text-lg font-bold">{healthData.system.nodeVersion}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Platform</p>
                  <p className="text-lg font-bold capitalize">{healthData.system.platform}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Uptime</p>
                  <p className="text-lg font-bold">{formatUptime(healthData.system.uptime)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Environment</p>
                  <p className="text-lg font-bold capitalize">{healthData.system.environment}</p>
                </div>
              </div>

              {/* Memory Usage */}
              {healthData.system.memoryUsage && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    Memory Usage
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-sm font-medium">RSS</p>
                      <p className="text-lg font-bold">{formatBytes(healthData.system.memoryUsage.rss)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Heap Used</p>
                      <p className="text-lg font-bold">{formatBytes(healthData.system.memoryUsage.heapUsed)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Heap Total</p>
                      <p className="text-lg font-bold">{formatBytes(healthData.system.memoryUsage.heapTotal)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">External</p>
                      <p className="text-lg font-bold">{formatBytes(healthData.system.memoryUsage.external)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
