'use client';

import { RefreshCw, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useCallback } from 'react';

export default function HealthPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vaccinations, setVaccinations] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [medicines, setMedicines] = useState([]);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const [v, t, m] = await Promise.all([
        fetch('/api/goshala-manager/health/vaccinations?upcoming=true', { cache: 'no-store' }),
        fetch('/api/goshala-manager/health/treatments?active=true', { cache: 'no-store' }),
        fetch('/api/goshala-manager/health/medicines', { cache: 'no-store' })
      ]);
      const [vj, tj, mj] = await Promise.all([v.json(), t.json(), m.json()]);
      if (v.ok) setVaccinations(vj.vaccinations || []);
      if (t.ok) setTreatments(tj.treatments || []);
      if (m.ok) setMedicines(mj.medicines || []);
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
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-5 w-5"/> Health & Veterinary</h1>
          <Button variant="outline" disabled={refreshing} onClick={()=>{setRefreshing(true); setTimeout(()=>setRefreshing(false), 600);}}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin':''}`} /> Refresh
          </Button>
        </div>
        <Card>
          <CardHeader><CardTitle>Upcoming Vaccinations</CardTitle></CardHeader>
          <CardContent>
            {loading ? 'Loading...' : (
              <div className="space-y-2">
                {vaccinations.length ? vaccinations.map(v => (
                  <div key={`${v.tagId}-${v.vaccine}-${v.scheduledAt}`} className="p-3 border rounded-md flex justify-between">
                    <div>
                      <div className="font-medium">{v.vaccine}</div>
                      <div className="text-sm text-muted-foreground">{v.tagId} • {new Date(v.scheduledAt).toLocaleString()} {v.vet ? `• ${v.vet}` : ''}</div>
                    </div>
                  </div>
                )) : <div className="text-muted-foreground">No upcoming vaccinations</div>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Active Treatments</CardTitle></CardHeader>
          <CardContent>
            {loading ? 'Loading...' : (
              <div className="space-y-2">
                {treatments.length ? treatments.map(t => (
                  <div key={`${t.tagId}-${t.diagnosis}-${t.startedAt}`} className="p-3 border rounded-md flex justify-between">
                    <div>
                      <div className="font-medium">{t.diagnosis}</div>
                      <div className="text-sm text-muted-foreground">{t.tagId} • since {new Date(t.startedAt).toLocaleDateString()} {t.vet ? `• ${t.vet}` : ''} {t.medicine ? `• ${t.medicine}` : ''}</div>
                    </div>
                  </div>
                )) : <div className="text-muted-foreground">No active treatments</div>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Medicine Stock</CardTitle></CardHeader>
          <CardContent>
            {loading ? 'Loading...' : (
              <div className="space-y-2">
                {medicines.length ? medicines.map(m => (
                  <div key={m.name} className="p-3 border rounded-md flex justify-between">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-sm text-muted-foreground">{m.quantity} {m.unit} {m.expiryDate ? `• exp ${new Date(m.expiryDate).toLocaleDateString()}` : ''}</div>
                  </div>
                )) : <div className="text-muted-foreground">No medicines found</div>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


