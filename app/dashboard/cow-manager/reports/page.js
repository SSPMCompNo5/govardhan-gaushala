'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileText, Download } from 'lucide-react';

export default function CowReportsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState(null);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      // Reuse admin reports but filter client-side for herd metrics
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ filters: { module: 'goshala' }, config: { type: 'summary' } })
      });
      const data = await res.json();
      setReport(data?.data || null);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(report || {}, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cow-report-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full p-6">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const cows = report?.goshala?.cows?.[0] || {};
  const treatments = report?.doctor?.treatments?.[0] || {};

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h1 className="text-2xl font-bold">Cow Reports</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={downloadJSON}>
              <Download className="h-4 w-4 mr-2" />
              Download JSON
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Herd Health</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between"><span>Total Cows</span><span>{cows.totalCows || 0}</span></div>
                <div className="flex justify-between"><span>Healthy</span><span>{cows.healthyCows || 0}</span></div>
                <div className="flex justify-between"><span>Sick</span><span>{cows.sickCows || 0}</span></div>
                <div className="flex justify-between"><span>Pregnant</span><span>{cows.pregnantCows || 0}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Treatments Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between"><span>Total</span><span>{treatments.totalTreatments || 0}</span></div>
                <div className="flex justify-between"><span>Active</span><span>{treatments.activeTreatments || 0}</span></div>
                <div className="flex justify-between"><span>Completed</span><span>{treatments.completedTreatments || 0}</span></div>
                <div className="flex justify-between"><span>Pending</span><span>{treatments.pendingTreatments || 0}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


