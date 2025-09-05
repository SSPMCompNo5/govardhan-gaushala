'use client';

import { RefreshCw, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useCallback } from 'react';

export default function FinancePage() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ month: '', expensesByCategory: {}, totalExpenses: 0, totalDonations: 0, balance: 0, topDonors: [] });

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/goshala-manager/finance/summary', { cache: 'no-store' });
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
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5"/> Finance & Donations</h1>
          <Button variant="outline" disabled={refreshing} onClick={()=>{setRefreshing(true); setTimeout(()=>setRefreshing(false), 600);}}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin':''}`} /> Refresh
          </Button>
        </div>
        <Card>
          <CardHeader><CardTitle>Month</CardTitle></CardHeader>
          <CardContent>{loading ? 'Loading...' : summary.month}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
          <CardContent>
            {loading ? 'Loading...' : (
              <div className="space-y-1">
                <div>Expenses: <span className="font-semibold">₹ {summary.totalExpenses.toLocaleString()}</span></div>
                <div>Donations: <span className="font-semibold">₹ {summary.totalDonations.toLocaleString()}</span></div>
                <div>Balance: <span className={`font-semibold ${summary.balance>=0 ? 'text-green-600':'text-red-600'}`}>₹ {summary.balance.toLocaleString()}</span></div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Expenses by Category</CardTitle></CardHeader>
          <CardContent>
            {loading ? 'Loading...' : (
              <div className="space-y-1 text-sm">
                {Object.keys(summary.expensesByCategory).length ? (
                  Object.entries(summary.expensesByCategory).map(([k,v]) => (
                    <div key={k} className="flex justify-between"><span>{k}</span><span>₹ {Number(v).toLocaleString()}</span></div>
                  ))
                ) : <div className="text-muted-foreground">No expenses</div>}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top Donors</CardTitle></CardHeader>
          <CardContent>
            {loading ? 'Loading...' : (
              <div className="space-y-1 text-sm">
                {summary.topDonors?.length ? summary.topDonors.map(d => (
                  <div key={d._id} className="flex justify-between"><span>{d._id}</span><span>₹ {d.total.toLocaleString()}</span></div>
                )) : <div className="text-muted-foreground">No donors</div>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


