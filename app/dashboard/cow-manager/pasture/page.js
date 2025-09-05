'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Settings } from 'lucide-react';
import EventsProvider, { useEvents } from '@/components/providers/EventsProvider';

function PastureInner() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState([]);
  const [rotation, setRotation] = useState({ currentPaddock: '', nextPaddock: '', notes: '' });

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      // Placeholder: derive herd groups from cows API if grouping exists later
      const res = await fetch('/api/goshala-manager/cows?limit=100', { cache: 'no-store' });
      const data = await res.json();
      const cows = data.cows || [];
      const byGroup = cows.reduce((map, c) => {
        const key = c.group || 'Ungrouped';
        map[key] = map[key] || [];
        map[key].push(c);
        return map;
      }, {});
      setGroups(Object.entries(byGroup).map(([name, list]) => ({ name, count: list.length })));
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { subscribe } = useEvents();
  useEffect(() => {
    const unsub = subscribe((event) => {
      if (event?.type === 'change' && event.collection === 'cows') {
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
          <h1 className="text-2xl font-bold">Pasture & Herd Grouping</h1>
          <Button variant="outline" onClick={load} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Herd Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {groups.map(g => (
                <div key={g.name} className="p-3 border rounded-md">
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-muted-foreground">{g.count} cows</div>
                </div>
              ))}
              {groups.length === 0 && (
                <p className="text-muted-foreground">No groups yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Grazing Rotation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Current paddock" value={rotation.currentPaddock} onChange={(e)=> setRotation(r=>({...r, currentPaddock: e.target.value}))} />
              <Input placeholder="Next paddock" value={rotation.nextPaddock} onChange={(e)=> setRotation(r=>({...r, nextPaddock: e.target.value}))} />
              <Input placeholder="Notes" value={rotation.notes} onChange={(e)=> setRotation(r=>({...r, notes: e.target.value}))} />
            </div>
            <div className="mt-3">
              <Button size="sm" variant="outline">Save Plan</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PasturePage() {
  return (
    <EventsProvider channels={[ 'cows' ]}>
      <PastureInner />
    </EventsProvider>
  );
}


