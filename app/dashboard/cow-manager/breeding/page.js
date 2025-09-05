'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Heart, Calendar, Baby, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import EventsProvider, { useEvents } from '@/components/providers/EventsProvider';

function BreedingInner() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Collections may not exist yet; we display placeholders and wire SSE for future
  const [heats, setHeats] = useState([]);
  const [aiRecords, setAiRecords] = useState([]);
  const [calvings, setCalvings] = useState([]);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      // If you add endpoints later, replace with real fetches
      setHeats(heats => heats.slice(0));
      setAiRecords(r => r.slice(0));
      setCalvings(c => c.slice(0));
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { subscribe } = useEvents();
  useEffect(() => {
    const unsub = subscribe((event) => {
      if (event?.type === 'change' && ['breeding_heats','breeding_ai','breeding_calvings'].includes(event.collection)) {
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
          <div>
            <h1 className="text-2xl font-bold">Breeding</h1>
            <p className="text-muted-foreground">Heat detection, AI records, calving tracker</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/dashboard/cow-manager">Back to Cow Manager</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5" /> Heat Detection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {heats.length > 0 ? heats.map((h, idx) => (
                  <div key={idx} className="p-3 border rounded-lg text-sm">
                    {h.cowId || 'Cow'} • {h.date ? new Date(h.date).toLocaleString() : '—'}
                  </div>
                )) : (
                  <p className="text-muted-foreground text-center py-4">No heat events recorded</p>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline">Record Heat</Button>
                <Button asChild size="sm" variant="ghost"><Link href="/dashboard/goshala-manager/reports">Reports <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> AI Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {aiRecords.length > 0 ? aiRecords.map((r, idx) => (
                  <div key={idx} className="p-3 border rounded-lg text-sm">
                    {r.cowId || 'Cow'} • {r.bull || 'Bull'} • {r.date ? new Date(r.date).toLocaleDateString() : '—'}
                  </div>
                )) : (
                  <p className="text-muted-foreground text-center py-4">No AI records</p>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline">Add AI Record</Button>
                <Button asChild size="sm" variant="ghost"><Link href="/dashboard/goshala-manager/reports">Reports <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Baby className="h-5 w-5" /> Calving Tracker</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {calvings.length > 0 ? calvings.map((c, idx) => (
                  <div key={idx} className="p-3 border rounded-lg text-sm">
                    {c.cowId || 'Cow'} • {c.calfGender || 'Calf'} • {c.date ? new Date(c.date).toLocaleDateString() : '—'}
                  </div>
                )) : (
                  <p className="text-muted-foreground text-center py-4">No calvings recorded</p>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline">Record Calving</Button>
                <Button asChild size="sm" variant="ghost"><Link href="/dashboard/goshala-manager/reports">Reports <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function BreedingPage() {
  return (
    <EventsProvider channels={[ 'breeding_heats','breeding_ai','breeding_calvings' ]}>
      <BreedingInner />
    </EventsProvider>
  );
}


