'use client';

import { RefreshCw, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useCallback } from 'react';

export default function DoctorPatientsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cows, setCows] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [searchFilters, setSearchFilters] = useState({
    cowId: '', illnessType: '', dateFrom: '', dateTo: '', medicine: ''
  });

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const [cowsRes, healthRes] = await Promise.all([
        fetch('/api/goshala-manager/cows?limit=100', { cache: 'no-store' }),
        fetch('/api/goshala-manager/health/treatments', { cache: 'no-store' })
      ]);
      const cowsData = await cowsRes.json();
      const healthData = await healthRes.json();
      if (cowsRes.ok) setCows(cowsData.cows || []);
      if (healthRes.ok) setHealthRecords(healthData.treatments || []);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const searchHealthRecords = useCallback(async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      if (searchFilters.cowId) params.set('tagId', searchFilters.cowId);
      if (searchFilters.illnessType) params.set('category', searchFilters.illnessType);
      if (searchFilters.medicine) params.set('medicine', searchFilters.medicine);
      if (searchFilters.dateFrom) params.set('dateFrom', searchFilters.dateFrom);
      if (searchFilters.dateTo) params.set('dateTo', searchFilters.dateTo);
      
      const res = await fetch(`/api/goshala-manager/health/treatments?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setHealthRecords(data.treatments || []);
    } finally {
      setRefreshing(false);
    }
  }, [searchFilters]);

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-5 w-5"/> Patients (Cows)</h1>
          <Button variant="outline" onClick={load} disabled={refreshing}><RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin':''}`} /> Refresh</Button>
        </div>
        <Card>
          <CardHeader><CardTitle>Herd</CardTitle></CardHeader>
          <CardContent>
            {loading ? 'Loading...' : (
              <div className="space-y-2">
                {cows.length ? cows.map(c => (
                  <div key={c.tagId} className="flex justify-between p-2 border rounded-md">
                    <div className="font-medium">{c.name || c.tagId} <span className="text-xs text-muted-foreground">({c.tagId})</span></div>
                    <div className="text-sm text-muted-foreground">{c.category} • {c.status} {c.breed ? `• ${c.breed}` : ''}</div>
                  </div>
                )) : <div className="text-muted-foreground">No cows found</div>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>🔍 Search Health Records</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-5 gap-2">
              <input className="border p-2 rounded" placeholder="Cow ID" value={searchFilters.cowId} onChange={e=>setSearchFilters(v=>({...v,cowId:e.target.value}))}/>
              <input className="border p-2 rounded" placeholder="Illness Type" value={searchFilters.illnessType} onChange={e=>setSearchFilters(v=>({...v,illnessType:e.target.value}))}/>
              <input className="border p-2 rounded" placeholder="Medicine" value={searchFilters.medicine} onChange={e=>setSearchFilters(v=>({...v,medicine:e.target.value}))}/>
              <input className="border p-2 rounded" type="date" placeholder="From Date" value={searchFilters.dateFrom} onChange={e=>setSearchFilters(v=>({...v,dateFrom:e.target.value}))}/>
              <input className="border p-2 rounded" type="date" placeholder="To Date" value={searchFilters.dateTo} onChange={e=>setSearchFilters(v=>({...v,dateTo:e.target.value}))}/>
            </div>
            <div className="flex gap-2">
              <Button onClick={searchHealthRecords} disabled={refreshing}>Search Records</Button>
              <Button variant="outline" onClick={()=>{setSearchFilters({cowId:'',illnessType:'',dateFrom:'',dateTo:'',medicine:''}); load();}}>Clear & Show All</Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>📋 Health Records ({healthRecords.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? 'Loading...' : (
              <div className="space-y-2">
                {healthRecords.length ? healthRecords.map(r => (
                  <div key={r._id} className="p-3 border rounded-md">
                    <div className="flex justify-between">
                      <div className="font-medium">{r.diagnosis} <span className="text-xs text-muted-foreground">({r.illnessCategory||'other'})</span></div>
                      <div className="text-sm text-muted-foreground">{r.tagId} • {new Date(r.startedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.medicine ? `Rx ${r.medicine}` : ''} {r.dosage ? `• ${r.dosage}`:''} 
                      {r.durationDays ? `• ${r.durationDays}d` : ''} • {r.outcome || 'ongoing'}
                    </div>
                    {r.notes && <div className="text-xs text-muted-foreground mt-1">{r.notes}</div>}
                  </div>
                )) : <div className="text-muted-foreground">No health records found</div>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>🩺 Cow Treatment Management</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="font-medium">The doctor can:</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Attach lab reports or images (PDFs, X-rays, test results, wound photos)</li>
                <li>Tag illness category (fever, infection, digestive, injury, etc.) for analytics</li>
                <li>Track outcomes (Recovered, Ongoing, Referred, Deceased)</li>
                <li>Record vaccinations with next due date</li>
                <li>Schedule recurring check-ups</li>
                <li>Cross-link with feeding (medication → notify Food Manager to adjust diet)</li>
                <li>Share doctor notes and flag critical cases as &quot;Needs Admin Attention&quot;</li>
                <li>Search health records (by cow ID, illness type, date, medicine)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


