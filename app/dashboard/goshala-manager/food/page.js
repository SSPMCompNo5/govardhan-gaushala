'use client';

import { RefreshCw, Package } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useCallback } from 'react';

export default function FoodPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ stock: { healthy: 0, low: 0, critical: 0 }, consumptionToday: 0, activeSuppliers: 0, expiringSoon: [] });

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/goshala-manager/food/summary', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setSummary(data);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-5 w-5"/> Food & Fodder</h1>
          <Button variant="outline" disabled={refreshing} onClick={()=>{setRefreshing(true); setTimeout(()=>setRefreshing(false), 600);}}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin':''}`} /> Refresh
          </Button>
        </div>
        <Card>
          <CardHeader><CardTitle>Today&apos;s Consumption</CardTitle></CardHeader>
          <CardContent>
            {loading ? 'Loading...' : (
              <div className="text-2xl font-bold">{summary.consumptionToday} units</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Stock Status</CardTitle></CardHeader>
          <CardContent>
            {loading ? 'Loading...' : (
              <div className="flex gap-6 text-sm">
                <div>Healthy: <span className="font-semibold">{summary.stock.healthy}</span></div>
                <div>Low: <span className="font-semibold">{summary.stock.low}</span></div>
                <div>Critical: <span className="font-semibold">{summary.stock.critical}</span></div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Active Suppliers</CardTitle></CardHeader>
          <CardContent>
            {loading ? 'Loading...' : (
              <div className="text-2xl font-bold">{summary.activeSuppliers}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Expiring Soon (≤ 7 days)</CardTitle></CardHeader>
          <CardContent>
            {loading ? 'Loading...' : (
              <div className="space-y-2">
                {summary.expiringSoon?.length ? summary.expiringSoon.map(e => (
                  <div key={`${e.name}-${e.expiryDate}`} className="flex justify-between p-2 border rounded-md">
                    <div>{e.name}</div>
                    <div className="text-sm text-muted-foreground">{new Date(e.expiryDate).toLocaleDateString()}</div>
                  </div>
                )) : <div className="text-muted-foreground">None</div>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


