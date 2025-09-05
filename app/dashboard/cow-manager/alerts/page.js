'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import EventsProvider, { useEvents } from '@/components/providers/EventsProvider';

function AlertsInner() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/goshala-manager/alerts/summary', { cache: 'no-store' });
      const data = await res.json();
      setAlerts(data.summary || []);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { subscribe } = useEvents();
  useEffect(() => {
    const unsub = subscribe((event) => {
      if (event?.type === 'change' && event.collection === 'alerts') {
        load();
      }
    });
    return unsub;
  }, [subscribe, load]);

  if (loading) {
    return (
      <div className="min-h-screen w-full p-6">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Cow Alerts</h1>
          <Button variant="outline" onClick={load} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-600" /> Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((a, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{a.type || 'Alert'}</p>
                    <p className="text-sm text-muted-foreground">{a.message || a.category || '—'}</p>
                  </div>
                  <span className="text-xs uppercase tracking-wide">{a.severity || 'info'}</span>
                </div>
              ))}
              {alerts.length === 0 && (
                <p className="text-muted-foreground">No alerts</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  return (
    <EventsProvider channels={[ 'alerts' ]}>
      <AlertsInner />
    </EventsProvider>
  );
}


