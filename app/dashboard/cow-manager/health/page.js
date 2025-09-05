'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Stethoscope, Calendar, Bell, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import EventsProvider, { useEvents } from '@/components/providers/EventsProvider';

function HealthInner() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [treatments, setTreatments] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [reminders, setReminders] = useState([]);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const [tRes, vRes] = await Promise.all([
        fetch('/api/goshala-manager/health/treatments?limit=20', { cache: 'no-store' }),
        fetch('/api/goshala-manager/health/vaccinations?limit=20', { cache: 'no-store' }),
      ]);
      const [tj, vj] = await Promise.all([tRes.json(), vRes.json()]);
      setTreatments(tj.treatments || []);
      setVaccinations(vj.vaccinations || []);
      // Simple reminders: pending vaccinations and active treatments
      const rem = [];
      (vj.vaccinations || []).filter(v => v.status === 'pending').slice(0, 10).forEach(v => rem.push({
        type: 'vaccination',
        message: `${v.cowId || 'Cow'} • ${v.vaccineName || 'Vaccine'}`,
        due: v.date || null,
      }));
      (tj.treatments || []).filter(t => t.status === 'active').slice(0, 10).forEach(t => rem.push({
        type: 'treatment',
        message: `${t.cowId || 'Cow'} • ${t.treatment || 'Treatment'}`,
        due: t.nextVisit || null,
      }));
      setReminders(rem);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { subscribe } = useEvents();
  useEffect(() => {
    const unsub = subscribe((event) => {
      if (event?.type === 'change' && ['treatments','vaccinations'].includes(event.collection)) {
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
            <h1 className="text-2xl font-bold">Cow Health</h1>
            <p className="text-muted-foreground">Treatment plans, vaccination schedule, reminders</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/dashboard/goshala-manager/health">Open Health Console</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5" /> Active Treatments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {treatments.filter(t => t.status === 'active').slice(0, 10).map((t) => (
                  <div key={t._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{t.cowId || 'Cow'}</p>
                      <p className="text-sm text-muted-foreground">{t.treatment || 'Treatment'}</p>
                    </div>
                    <Badge>{t.status}</Badge>
                  </div>
                ))}
                {treatments.filter(t => t.status === 'active').length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No active treatments</p>
                )}
              </div>
              <div className="mt-3">
                <Button asChild variant="ghost" size="sm"><Link href="/dashboard/goshala-manager/health">Manage Treatments <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Vaccination Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vaccinations.slice(0, 10).map((v) => (
                  <div key={v._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{v.cowId || 'Cow'}</p>
                      <p className="text-sm text-muted-foreground">{v.vaccineName || 'Vaccine'}</p>
                    </div>
                    <Badge variant={v.status === 'pending' ? 'outline' : 'secondary'}>{v.status || 'unknown'}</Badge>
                  </div>
                ))}
                {vaccinations.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No vaccinations scheduled</p>
                )}
              </div>
              <div className="mt-3">
                <Button asChild variant="ghost" size="sm"><Link href="/dashboard/goshala-manager/health">Schedule Vaccination <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reminders.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{r.type}</p>
                    <p className="text-sm text-muted-foreground">{r.message}</p>
                  </div>
                  <Badge variant="secondary">{r.due ? new Date(r.due).toLocaleDateString() : 'soon'}</Badge>
                </div>
              ))}
              {reminders.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No reminders</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function HealthPage() {
  return (
    <EventsProvider channels={[ 'treatments','vaccinations' ]}>
      <HealthInner />
    </EventsProvider>
  );
}


