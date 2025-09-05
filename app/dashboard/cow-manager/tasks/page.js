'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import EventsProvider, { useEvents } from '@/components/providers/EventsProvider';

function TasksInner() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState([]);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/goshala-manager/staff/tasks?limit=50', { cache: 'no-store' });
      const data = await res.json();
      setTasks(data.tasks || []);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { subscribe } = useEvents();
  useEffect(() => {
    const unsub = subscribe((event) => {
      if (event?.type === 'change' && event.collection === 'staff_tasks') {
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

  const toggleComplete = async (task) => {
    try {
      await fetch('/api/goshala-manager/staff/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: task._id, status: task.status === 'completed' ? 'pending' : 'completed' })
      });
      load();
    } catch {}
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tasks & Duties</h1>
          <Button variant="outline" onClick={load} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks.map((t) => (
                <div key={t._id} className="p-3 border rounded-md flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.title || 'Task'}</div>
                    <div className="text-xs text-muted-foreground">{t.assignedTo || '—'} • {t.dueDate ? new Date(t.dueDate).toLocaleString() : 'No due'}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant={t.status === 'completed' ? 'secondary' : 'outline'} onClick={() => toggleComplete(t)}>
                      {t.status === 'completed' ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <Clock className="h-4 w-4 mr-1" />}
                      {t.status === 'completed' ? 'Completed' : 'Mark Done'}
                    </Button>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-muted-foreground">No tasks</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <EventsProvider channels={[ 'staff_tasks' ]}>
      <TasksInner />
    </EventsProvider>
  );
}


