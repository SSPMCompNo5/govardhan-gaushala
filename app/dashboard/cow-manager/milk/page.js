'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import EventsProvider, { useEvents } from '@/components/providers/EventsProvider';

function MilkInner() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [daily, setDaily] = useState([]);
  const [monthly, setMonthly] = useState([]);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      // Placeholder: no dedicated milk endpoints yet; compute from hypothetical logs if added later
      setDaily([]);
      setMonthly([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { subscribe } = useEvents();
  useEffect(() => {
    const unsub = subscribe((event) => {
      if (event?.type === 'change' && ['milk_logs'].includes(event.collection)) {
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
          <h1 className="text-2xl font-bold">Milk Production</h1>
          <Button variant="outline" onClick={load} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily Yield</CardTitle>
          </CardHeader>
          <CardContent>
            {daily.length === 0 ? (
              <p className="text-muted-foreground">No data yet</p>
            ) : (
              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">{JSON.stringify(daily, null, 2)}</pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {monthly.length === 0 ? (
              <p className="text-muted-foreground">No data yet</p>
            ) : (
              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">{JSON.stringify(monthly, null, 2)}</pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function MilkPage() {
  return (
    <EventsProvider channels={[ 'milk_logs' ]}>
      <MilkInner />
    </EventsProvider>
  );
}


