'use client';

import { RefreshCw, Users, Plus, Clock, CheckSquare, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useCallback } from 'react';
import EventsProvider, { useEvents } from '@/components/providers/EventsProvider';
import EmptyState from '@/components/EmptyState';
import { t } from '@/lib/i18n';
import { addCSRFHeader } from '@/lib/http';

function StaffInner() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [toast, setToast] = useState('');
  const [taskFilter, setTaskFilter] = useState({ status: 'all', assignee: '' });
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceLimit, setAttendanceLimit] = useState(10);
  const [attendanceTotal, setAttendanceTotal] = useState(0);
  const [showAddAttendance, setShowAddAttendance] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({ staffName: '', checkIn: '', checkOut: '', notes: '', status: 'present' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
  const [showAddShift, setShowAddShift] = useState(false);
  const [shiftForm, setShiftForm] = useState({ title: '', staffIds: '', start: '', end: '', location: '', notes: '' });
  const [attendanceFilter, setAttendanceFilter] = useState({ status: 'all', name: '' });
  const [shiftFilter, setShiftFilter] = useState({ location: '', staff: '' });

  const todayStr = new Date().toISOString().slice(0,10);
  
  const getCSRF = () => {
    try { const m=document.cookie.match(/(?:^|; )csrftoken=([^;]+)/); return m?decodeURIComponent(m[1]):''; } catch { return ''; }
  };

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const attendanceParams = new URLSearchParams();
      attendanceParams.set('date', todayStr);
      attendanceParams.set('page', String(attendancePage));
      attendanceParams.set('limit', String(attendanceLimit));
      if (attendanceFilter.name) attendanceParams.set('staffId', attendanceFilter.name);
      const [a,s,t] = await Promise.all([
        fetch(`/api/goshala-manager/staff/attendance?${attendanceParams.toString()}`, { cache: 'no-store' }),
        fetch(`/api/goshala-manager/staff/shifts?date=${todayStr}`, { cache: 'no-store' }),
        fetch('/api/goshala-manager/staff/tasks', { cache: 'no-store' })
      ]);
      const [aj,sj,tj] = await Promise.all([a.json(), s.json(), t.json()]);
      if (a.ok) {
        setAttendance(aj.attendance || []);
        if (aj.pagination) setAttendanceTotal(aj.pagination.total || 0);
      }
      if (s.ok) setShifts(sj.shifts || []);
      if (t.ok) setTasks(tj.tasks || []);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [todayStr, attendancePage, attendanceLimit, attendanceFilter.name]);

  useEffect(() => { load(); }, [load]);

  const { subscribe } = useEvents();
  useEffect(() => {
    const unsub = subscribe((event) => {
      if (event?.type === 'change' && ['staff_attendance','staff_shifts','staff_tasks'].includes(event.collection)) {
        load();
      }
    });
    return unsub;
  }, [subscribe, load]);

  const onAddAttendance = async () => {
    try {
      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        _id: tempId,
        staffName: attendanceForm.staffName,
        staffId: attendanceForm.staffName,
        status: attendanceForm.status || 'present',
        checkIn: attendanceForm.checkIn,
        checkOut: attendanceForm.checkOut,
        notes: attendanceForm.notes || '',
      };
      setAttendance(prev => [optimistic, ...prev]);
      const checkInAt = attendanceForm.checkIn ? new Date(`${todayStr}T${attendanceForm.checkIn}:00`).toISOString() : null;
      const checkOutAt = attendanceForm.checkOut ? new Date(`${todayStr}T${attendanceForm.checkOut}:00`).toISOString() : null;
      const res = await fetch('/api/goshala-manager/staff/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() }, 
        credentials: 'same-origin', body: JSON.stringify({
          staffId: attendanceForm.staffName,
          date: todayStr,
          status: attendanceForm.status || 'present',
          checkInAt,
          checkOutAt,
          notes: attendanceForm.notes || ''
        })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error||'Failed');
      setToast('Attendance recorded');
      setAttendanceForm({ staffName: '', checkIn: '', checkOut: '', notes: '', status: 'present' });
      setShowAddAttendance(false);
      load();
    } catch(e) {
      setAttendance(prev => prev.filter(r => r._id && String(r._id) !== String(`temp-${Date.now()}`))); // best-effort cleanup
      setToast(String(e.message||e));
    }
  };

  const onUpdateAttendance = async (id, update) => {
    try {
      const prevState = attendance;
      setAttendance(prev => prev.map(r => String(r._id) === String(id) ? { ...r, ...update } : r));
      const res = await fetch('/api/goshala-manager/staff/attendance', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin', body: JSON.stringify({ id, ...update })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error||'Failed');
      setToast('Attendance updated');
      load();
    } catch(e) {
      setAttendance(prev => prev); // no-op
      setToast(String(e.message||e));
    }
  };

  const onDeleteAttendance = async (id) => {
    try {
      const snapshot = attendance;
      setAttendance(prev => prev.filter(r => String(r._id) !== String(id)));
      const res = await fetch(`/api/goshala-manager/staff/attendance?id=${encodeURIComponent(id)}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() }, credentials: 'same-origin', body: '{}'
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error||'Failed');
      setToast('Attendance deleted');
      load();
    } catch(e) {
      setAttendance(snapshot);
      setToast(String(e.message||e));
    }
  };

  const exportAttendanceCSV = () => {
    const rows = (() => {
      let r = attendance;
      if (attendanceFilter.status !== 'all') r = r.filter(x => (x.status||'present') === attendanceFilter.status);
      if (attendanceFilter.name) r = r.filter(x => ((x.staffName||x.staffId||'').toLowerCase()).includes(attendanceFilter.name.toLowerCase()));
      return r;
    })();
    const headers = ['Staff','Status','CheckIn','CheckOut','Notes'];
    const data = rows.map(x => [
      (x.staffName||x.staffId||'').replace(/\n|\r/g,' ').trim(),
      (x.status||'present'),
      x.checkInAt ? new Date(x.checkInAt).toISOString() : (x.checkIn||''),
      x.checkOutAt ? new Date(x.checkOutAt).toISOString() : (x.checkOut||''),
      (x.notes||'').replace(/\n|\r/g,' ').trim(),
    ]);
    const csv = [headers.join(','), ...data.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${todayStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onAddTask = async () => {
    try {
      const tempId = `temp-${Date.now()}`;
      const optimistic = { _id: tempId, title: taskForm.title, description: taskForm.description, assignee: taskForm.assignedTo, status: 'open', priority: taskForm.priority };
      setTasks(prev => [optimistic, ...prev]);
      const res = await fetch('/api/goshala-manager/staff/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() }, 
        credentials: 'same-origin', body: JSON.stringify(taskForm)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error||'Failed');
      setToast('Task created');
      setTaskForm({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
      setShowAddTask(false);
      load();
    } catch(e) {
      setTasks(prev => prev.filter(t => !String(t._id).startsWith('temp-')));
      setToast(String(e.message||e));
    }
  };

  const onUpdateTask = async (id, update) => {
    try {
      const snapshot = tasks;
      setTasks(prev => prev.map(t => String(t._id) === String(id) ? { ...t, ...update } : t));
      const res = await fetch('/api/goshala-manager/staff/tasks', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin', body: JSON.stringify({ id, ...update })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error||'Failed');
      setToast('Task updated');
      load();
    } catch(e) {
      setTasks(snapshot);
      setToast(String(e.message||e));
    }
  };

  const onDeleteTask = async (id) => {
    try {
      const snapshot = tasks;
      setTasks(prev => prev.filter(t => String(t._id) !== String(id)));
      const url = `/api/goshala-manager/staff/tasks?id=${encodeURIComponent(id)}`;
      const res = await fetch(url, { method: 'DELETE', headers: { 'X-CSRF-Token': getCSRF() }, credentials: 'same-origin' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error||'Failed');
      setToast('Task deleted');
      load();
    } catch(e) {
      setTasks(snapshot);
      setToast(String(e.message||e));
    }
  };

  const onAddShift = async () => {
    try {
      const tempId = `temp-${Date.now()}`;
      const optimistic = { _id: tempId, title: shiftForm.title, staffIds: shiftForm.staffIds.split(',').map(s=>s.trim()).filter(Boolean), start: shiftForm.start, end: shiftForm.end, location: shiftForm.location, notes: shiftForm.notes };
      setShifts(prev => [optimistic, ...prev]);
      const res = await fetch('/api/goshala-manager/staff/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin',
        body: JSON.stringify({
          title: shiftForm.title,
          staffIds: shiftForm.staffIds.split(',').map(s => s.trim()).filter(Boolean),
          start: shiftForm.start ? new Date(shiftForm.start).toISOString() : null,
          end: shiftForm.end ? new Date(shiftForm.end).toISOString() : null,
          location: shiftForm.location,
          notes: shiftForm.notes,
        })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed');
      setToast('Shift created');
      setShiftForm({ title: '', staffIds: '', start: '', end: '', location: '', notes: '' });
      setShowAddShift(false);
      load();
    } catch (e) {
      setShifts(prev => prev.filter(s => !String(s._id).startsWith('temp-')));
      setToast(String(e.message || e));
    }
  };

  const onEndShiftNow = async (id) => {
    try {
      const snapshot = shifts;
      setShifts(prev => prev.map(s => String(s._id) === String(id) ? { ...s, end: new Date().toISOString() } : s));
      const res = await fetch('/api/goshala-manager/staff/shifts', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin', body: JSON.stringify({ id, end: new Date().toISOString() })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error||'Failed');
      setToast('Shift ended');
      load();
    } catch(e) {
      setShifts(snapshot);
      setToast(String(e.message||e));
    }
  };

  const onDeleteShift = async (id) => {
    try {
      const snapshot = shifts;
      setShifts(prev => prev.filter(s => String(s._id) !== String(id)));
      const res = await fetch(`/api/goshala-manager/staff/shifts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: addCSRFHeader({
          'Content-Type': 'application/json',
          method: 'DELETE'
        }),
        credentials: 'same-origin',
        body: '{}'
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error||'Failed');
      setToast('Shift deleted');
      load();
    } catch(e) {
      setShifts(snapshot);
      setToast(String(e.message||e));
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-5 w-5"/> Staff & Operations</h1>
          <div className="flex gap-2">
            <Button variant="outline" disabled={refreshing} onClick={load}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin':''}`} /> Refresh
            </Button>
            <Button onClick={() => setShowAddAttendance(!showAddAttendance)}>
              <Clock className="h-4 w-4 mr-2" /> Add Attendance
            </Button>
            <Button onClick={() => setShowAddTask(!showAddTask)}>
              <Plus className="h-4 w-4 mr-2" /> Add Task
            </Button>
            <Button onClick={() => setShowAddShift(!showAddShift)}>
              <Calendar className="h-4 w-4 mr-2" /> Add Shift
            </Button>
          </div>
        </div>

        {/* Add Attendance Form */}
        {showAddAttendance && (
          <Card>
            <CardHeader><CardTitle>Record Attendance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input placeholder="Staff Name" value={attendanceForm.staffName} onChange={e=>setAttendanceForm(v=>({...v,staffName:e.target.value}))}/>
                <Input type="time" placeholder="Check In Time" value={attendanceForm.checkIn} onChange={e=>setAttendanceForm(v=>({...v,checkIn:e.target.value}))}/>
                <Input type="time" placeholder="Check Out Time" value={attendanceForm.checkOut} onChange={e=>setAttendanceForm(v=>({...v,checkOut:e.target.value}))}/>
                <Input placeholder="Notes (optional)" value={attendanceForm.notes} onChange={e=>setAttendanceForm(v=>({...v,notes:e.target.value}))}/>
              </div>
              <div className="flex gap-2">
                <Button onClick={onAddAttendance} disabled={!attendanceForm.staffName || !attendanceForm.checkIn}>Record</Button>
                <Button variant="outline" onClick={() => setShowAddAttendance(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Task Form */}
        {showAddTask && (
          <Card>
            <CardHeader><CardTitle>Create Task</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input placeholder="Task Title" value={taskForm.title} onChange={e=>setTaskForm(v=>({...v,title:e.target.value}))}/>
                <Input placeholder="Assigned To" value={taskForm.assignedTo} onChange={e=>setTaskForm(v=>({...v,assignedTo:e.target.value}))}/>
                <Select value={taskForm.priority} onValueChange={v=>setTaskForm(prev=>({...prev,priority:v}))}>
                  <SelectTrigger><SelectValue placeholder="Priority"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" placeholder="Due Date" value={taskForm.dueDate} onChange={e=>setTaskForm(v=>({...v,dueDate:e.target.value}))}/>
              </div>
              <textarea className="border p-2 rounded w-full" placeholder="Task Description" value={taskForm.description} onChange={e=>setTaskForm(v=>({...v,description:e.target.value}))}></textarea>
              <div className="flex gap-2">
                <Button onClick={onAddTask} disabled={!taskForm.title}>Create Task</Button>
                <Button variant="outline" onClick={() => setShowAddTask(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Shift Form */}
        {showAddShift && (
          <Card>
            <CardHeader><CardTitle>Create Shift</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input placeholder="Shift Title" value={shiftForm.title} onChange={e=>setShiftForm(v=>({...v,title:e.target.value}))}/>
                <Input placeholder="Staff IDs (comma-separated)" value={shiftForm.staffIds} onChange={e=>setShiftForm(v=>({...v,staffIds:e.target.value}))}/>
                <Input type="datetime-local" placeholder="Start" value={shiftForm.start} onChange={e=>setShiftForm(v=>({...v,start:e.target.value}))}/>
                <Input type="datetime-local" placeholder="End" value={shiftForm.end} onChange={e=>setShiftForm(v=>({...v,end:e.target.value}))}/>
                <Input placeholder="Location" value={shiftForm.location} onChange={e=>setShiftForm(v=>({...v,location:e.target.value}))}/>
              </div>
              <textarea className="border p-2 rounded w-full" placeholder="Notes (optional)" value={shiftForm.notes} onChange={e=>setShiftForm(v=>({...v,notes:e.target.value}))}></textarea>
              <div className="flex gap-2">
                <Button onClick={onAddShift} disabled={!shiftForm.title || !shiftForm.start || !shiftForm.end}>Create Shift</Button>
                <Button variant="outline" onClick={() => setShowAddShift(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Today's Attendance */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4"/> Today&apos;s Attendance ({todayStr})</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Select value={attendanceFilter.status} onValueChange={v=>setAttendanceFilter(p=>({...p,status:v}))}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="All"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="leave">Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input placeholder="Filter by name" className="md:w-64" value={attendanceFilter.name} onChange={e=>setAttendanceFilter(p=>({...p,name:e.target.value}))}/>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Button variant="outline" size="sm" onClick={exportAttendanceCSV}>Export CSV</Button>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-muted-foreground">Rows</span>
                  <Select value={String(attendanceLimit)} onValueChange={v=>{ setAttendancePage(1); setAttendanceLimit(parseInt(v||'10')); }}>
                    <SelectTrigger className="w-20"><SelectValue placeholder="10"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground" role="status" aria-live="polite">{t('loading')}</div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    let rows = attendance;
                    if (attendanceFilter.status !== 'all') rows = rows.filter(r => (r.status||'present') === attendanceFilter.status);
                    if (attendanceFilter.name) rows = rows.filter(r => ((r.staffName||r.staffId||'').toLowerCase()).includes(attendanceFilter.name.toLowerCase()));
                    return rows;
                  })().length ? (() => {
                    let rows = attendance;
                    if (attendanceFilter.status !== 'all') rows = rows.filter(r => (r.status||'present') === attendanceFilter.status);
                    if (attendanceFilter.name) rows = rows.filter(r => ((r.staffName||r.staffId||'').toLowerCase()).includes(attendanceFilter.name.toLowerCase()));
                    return rows;
                  })().map(a => (
                    <div key={a._id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{a.staffName || a.staffId}</div>
                          <div className="text-sm text-muted-foreground">
                            {(a.checkInAt ? new Date(a.checkInAt).toLocaleTimeString() : a.checkIn) || '—'}
                            {' '}-
                            {' '}{(a.checkOutAt ? new Date(a.checkOutAt).toLocaleTimeString() : a.checkOut) || 'Still working'}
                          </div>
                          {a.notes && <div className="text-xs text-muted-foreground mt-1">{a.notes}</div>}
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <Badge className={a.checkOutAt || a.checkOut ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                            {(a.status||'present').toUpperCase()}
                          </Badge>
                          <div className="flex gap-2">
                            {!(a.checkOutAt || a.checkOut) && (
                              <Button size="sm" onClick={()=>onUpdateAttendance(a._id, { checkOutAt: new Date().toISOString() })}>Check-out now</Button>
                            )}
                            <Button size="sm" variant="destructive" onClick={()=>onDeleteAttendance(a._id)}>Delete</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <EmptyState title="No attendance records" description="There are no records for today." />
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm text-muted-foreground">
                      Page {attendancePage} of {Math.max(1, Math.ceil(attendanceTotal / attendanceLimit) || 1)}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={()=>setAttendancePage(p=>Math.max(1, p-1))} disabled={attendancePage <= 1}>Previous</Button>
                      <Button variant="outline" size="sm" onClick={()=>setAttendancePage(p=>{
                        const last = Math.max(1, Math.ceil(attendanceTotal / attendanceLimit) || 1);
                        return Math.min(last, p+1);
                      })} disabled={attendancePage >= Math.max(1, Math.ceil(attendanceTotal / attendanceLimit) || 1)}>Next</Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckSquare className="h-4 w-4"/> Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Select value={taskFilter.status} onValueChange={v=>setTaskFilter(p=>({...p,status:v}))}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="All"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input placeholder="Filter by assignee" className="md:w-64" value={taskFilter.assignee} onChange={e=>setTaskFilter(p=>({...p,assignee:e.target.value}))}/>
              </div>
              {loading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground" role="status" aria-live="polite">{t('loading')}</div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    let filtered = tasks;
                    if (taskFilter.status !== 'all') filtered = filtered.filter(t => (t.status||'open') === taskFilter.status);
                    if (taskFilter.assignee) filtered = filtered.filter(t => (t.assignee||'').toLowerCase().includes(taskFilter.assignee.toLowerCase()));
                    return filtered;
                  })().length ? (() => {
                    let filtered = tasks;
                    if (taskFilter.status !== 'all') filtered = filtered.filter(t => (t.status||'open') === taskFilter.status);
                    if (taskFilter.assignee) filtered = filtered.filter(t => (t.assignee||'').toLowerCase().includes(taskFilter.assignee.toLowerCase()));
                    return filtered;
                  })().map(t => (
                    <div key={t._id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium">{t.title}</div>
                        <Badge className={getPriorityColor(t.priority)}>{t.priority}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">{t.description}</div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Assigned to: {t.assignee || t.assignedTo}</span>
                        {t.dueAt && <span>Due: {new Date(t.dueAt).toLocaleDateString()}</span>}
                      </div>
                      <div className="flex gap-2">
                        {(t.status !== 'done') && (
                          <Button size="sm" onClick={()=>onUpdateTask(t._id, { status: 'done' })}>Mark Done</Button>
                        )}
                        <Button size="sm" variant="outline" onClick={()=>onUpdateTask(t._id, { status: 'in-progress' })}>In Progress</Button>
                        <Button size="sm" variant="destructive" onClick={()=>onDeleteTask(t._id)}>Delete</Button>
                      </div>
                    </div>
                  )) : (
                    <EmptyState title="No tasks" description="No tasks match the filters." />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Shifts Schedule */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4"/> Today&apos;s Shifts</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-2 mb-4">
              <Input placeholder="Filter by location" className="md:w-64" value={shiftFilter.location} onChange={e=>setShiftFilter(p=>({...p,location:e.target.value}))}/>
              <Input placeholder="Filter by staff id" className="md:w-64" value={shiftFilter.staff} onChange={e=>setShiftFilter(p=>({...p,staff:e.target.value}))}/>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground" role="status" aria-live="polite">{t('loading')}</div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  let rows = shifts;
                  if (shiftFilter.location) rows = rows.filter(x => (x.location||'').toLowerCase().includes(shiftFilter.location.toLowerCase()));
                  if (shiftFilter.staff) rows = rows.filter(x => Array.isArray(x.staffIds) && x.staffIds.join(',').toLowerCase().includes(shiftFilter.staff.toLowerCase()));
                  return rows;
                })().length ? (() => {
                  let rows = shifts;
                  if (shiftFilter.location) rows = rows.filter(x => (x.location||'').toLowerCase().includes(shiftFilter.location.toLowerCase()));
                  if (shiftFilter.staff) rows = rows.filter(x => Array.isArray(x.staffIds) && x.staffIds.join(',').toLowerCase().includes(shiftFilter.staff.toLowerCase()));
                  return rows;
                })().map(s => (
                  <div key={s._id} className="p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{s.title}</div>
                      <div className="text-sm text-muted-foreground">{s.location || '—'} • {Array.isArray(s.staffIds) ? s.staffIds.length : 0} staff</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">{s.start ? new Date(s.start).toLocaleString() : '—'} - {s.end ? new Date(s.end).toLocaleString() : '—'}</div>
                      <div className="flex items-center gap-2">
                        {!s.end && <Button size="sm" onClick={()=>onEndShiftNow(s._id)}>End now</Button>}
                        <Button size="sm" variant="destructive" onClick={()=>onDeleteShift(s._id)}>Delete</Button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <EmptyState title="No shifts" description="No shifts scheduled for today." />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {toast && <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg">{toast}</div>}
      </div>
    </div>
  );
}

export default function StaffPage() {
  return (
    <EventsProvider channels={[ 'staff_attendance','staff_shifts','staff_tasks' ]}>
      <StaffInner />
    </EventsProvider>
  );
}