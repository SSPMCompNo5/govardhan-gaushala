'use client';

import { RefreshCw, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useCallback } from 'react';

export default function DoctorAppointmentsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/doctor/appointments', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setAppointments(data.appointments || []);
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
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="h-5 w-5"/> Appointments</h1>
          <Button variant="outline" onClick={load} disabled={refreshing}><RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin':''}`} /> Refresh</Button>
        </div>
        <Card>
          <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
          <CardContent>
            {loading ? 'Loading...' : (
              <div className="space-y-2">
                {appointments.length ? appointments.map(a => (
                  <div key={`${a.tagId}-${a.when}`} className="flex justify-between p-2 border rounded-md">
                    <div>{a.tagId} • {a.reason} <span className="text-xs text-muted-foreground">({a.vet})</span></div>
                    <div className="text-sm text-muted-foreground">{new Date(a.when).toLocaleString()} • {a.status}</div>
                  </div>
                )) : <div className="text-muted-foreground">No appointments</div>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


