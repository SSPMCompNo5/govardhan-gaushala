'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Download, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function ReportPage() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState('daily');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/gate-logs?since=${dateRange.start}&until=${dateRange.end}`);
      const data = await response.json();
      
      if (response.ok) {
        const logs = data.logs || [];
        
        // Calculate report statistics
        const entries = logs.filter(log => log.type === 'entry');
        const exits = logs.filter(log => log.type === 'exit');
        const incidents = logs.filter(log => log.type === 'incident');
        
        const report = {
          period: `${dateRange.start} to ${dateRange.end}`,
          totalEntries: entries.length,
          totalExits: exits.length,
          totalIncidents: incidents.length,
          activeVisitors: Math.max(0, entries.length - exits.length),
          logs: logs,
          summary: {
            entries,
            exits,
            incidents
          }
        };
        
        setReportData(report);
      } else {
        throw new Error('Failed to fetch data');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      // Error will be handled by toast system
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  const downloadCSV = () => {
    if (!reportData) return;
    
    const headers = ['Time', 'Type', 'Visitor Name', 'Phone', 'Address', 'Vehicle', 'Group Size', 'Notes', 'Recorded By'];
    const rows = reportData.logs.map(log => [
      new Date(log.at).toLocaleString(),
      log.type,
      log.visitorName || '',
      log.visitorPhone || '',
      log.visitorAddress || '',
      log.plate || '',
      log.groupSize || '',
      log.note || '',
      log.actor || ''
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gate-report-${dateRange.start}-to-${dateRange.end}.csv`;
    link.click();
  };

  useEffect(() => {
    // Auto-generate daily report on load
    generateReport();
  }, [generateReport]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/watchman">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Gate Activity Report</h1>
            <p className="text-muted-foreground">Generate and view gate activity reports</p>
          </div>
        </div>

        {/* Report Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Report Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Report Type</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily Report</SelectItem>
                    <SelectItem value="weekly">Weekly Report</SelectItem>
                    <SelectItem value="monthly">Monthly Report</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={generateReport} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
              
              {reportData && (
                <Button variant="outline" onClick={downloadCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Report Summary */}
        {reportData && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{reportData.totalEntries}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Exits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{reportData.totalExits}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Visitors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{reportData.activeVisitors}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{reportData.totalIncidents}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Logs */}
        {reportData && (
          <Card>
            <CardHeader>
              <CardTitle>Detailed Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {reportData.logs.length > 0 ? (
                  reportData.logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          log.type === 'entry' ? 'bg-green-500' : 
                          log.type === 'exit' ? 'bg-blue-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <div className="font-medium">{log.visitorName || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">
                            {log.type} • {new Date(log.at).toLocaleString()}
                            {log.plate && ` • Vehicle: ${log.plate}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {log.actor || 'System'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No activity found for the selected period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
