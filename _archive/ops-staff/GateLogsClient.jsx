"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import http from '@/lib/http';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function GateLogsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [type, setType] = useState('entry');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [groupSize, setGroupSize] = useState('');
  const [visitorAddress, setVisitorAddress] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  const initializedFromUrl = useRef(false);
  const abortRef = useRef(null);
  const [, startTransition] = useTransition();

  // Filters
  const [filterType, setFilterType] = useState(''); // '' means all
  const [filterActor, setFilterActor] = useState('');
  const [filterQ, setFilterQ] = useState(''); // unified search across name/phone/plate/note
  const [filterName, setFilterName] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterPlate, setFilterPlate] = useState('');
  const [filterNote, setFilterNote] = useState('');
  const [filterSince, setFilterSince] = useState(''); // yyyy-mm-dd
  const [filterUntil, setFilterUntil] = useState(''); // yyyy-mm-dd
  const initialFilterRange = (() => {
    let from, to;
    try { if (filterSince) from = new Date(filterSince); } catch {}
    try { if (filterUntil) to = new Date(filterUntil); } catch {}
    return { from, to };
  })();
  const [filterRange, setFilterRange] = useState(initialFilterRange);

  // Regex rules
  const phoneRegex = /^[6-9]\d{9}$/; // India mobile: 10 digits starting 6-9
  const plateRegex = /^[A-Z]{2}[ -]?\d{1,2}[ -]?[A-Z]{0,3}[ -]?\d{1,4}$/; // Common Indian formats like MH12 AB 1234

  // Quick preset helpers
  function setRangeDays(days) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const to = new Date(today);
    const from = new Date(today);
    from.setDate(today.getDate() - (days - 1));
    setFilterRange({ from, to });
    setPage(1);
  }

  // Inline editor state
  const [editingId, setEditingId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [eType, setEType] = useState('entry');
  const [eVisitorName, setEVisitorName] = useState('');
  const [eVisitorPhone, setEVisitorPhone] = useState('');
  const [eGroupSize, setEGroupSize] = useState('');
  const [ePlate, setEPlate] = useState('');
  const [eNote, setENote] = useState('');
  const [eVisitorAddress, setEVisitorAddress] = useState('');
  const [editError, setEditError] = useState('');
  const [originalEdit, setOriginalEdit] = useState(null);
  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const editInvalid = useMemo(() => {
    // group size must be integer >=1 or empty
    if (eGroupSize === '' || eGroupSize === null || eGroupSize === undefined) return false;
    const n = Number(eGroupSize);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return true;
    return false;
  }, [eGroupSize]);

  // Live validity for create form fields (only when non-empty)
  const createPhoneInvalid = useMemo(() => {
    if (!visitorPhone) return false; // empty allowed
    if (visitorPhone.length < 10) return false; // don't show error while typing
    return !phoneRegex.test(visitorPhone);
  }, [visitorPhone]);
  const createPlateInvalid = useMemo(() => {
    if (!plate) return false;
    return !plateRegex.test(plate.toUpperCase());
  }, [plate]);

  // Live validity for edit dialog fields (only when non-empty)
  const editPhoneInvalid = useMemo(() => {
    if (!eVisitorPhone) return false; // empty allowed
    if (eVisitorPhone.length < 10) return false; // don't show error while typing
    return !phoneRegex.test(eVisitorPhone);
  }, [eVisitorPhone]);
  const editPlateInvalid = useMemo(() => {
    if (!ePlate) return false;
    return !plateRegex.test(ePlate.toUpperCase());
  }, [ePlate]);

  const isChanged = useMemo(() => {
    if (!originalEdit) return true;
    const gs = eGroupSize === '' ? undefined : Number(eGroupSize);
    return (
      originalEdit.type !== eType ||
      (originalEdit.visitorName || '') !== (eVisitorName || '') ||
      (originalEdit.visitorPhone || '') !== (eVisitorPhone || '') ||
      (originalEdit.visitorAddress || '') !== (eVisitorAddress || '') ||
      (originalEdit.plate || '') !== (ePlate || '') ||
      (originalEdit.note || '') !== (eNote || '') ||
      (originalEdit.groupSize ?? undefined) !== (gs ?? undefined)
    );
  }, [originalEdit, eType, eVisitorName, eVisitorPhone, ePlate, eNote, eGroupSize]);

  // Debounce helper
  function useDebouncedValue(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      const id = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
  }

  const dFilterType = useDebouncedValue(filterType);
  const dFilterActor = useDebouncedValue(filterActor);
  const dFilterQ = useDebouncedValue(filterQ);
  const dFilterName = useDebouncedValue(filterName);
  const dFilterPhone = useDebouncedValue(filterPhone);
  const dFilterPlate = useDebouncedValue(filterPlate);
  const dFilterNote = useDebouncedValue(filterNote);
  const dFilterSince = useDebouncedValue(filterSince);
  const dFilterUntil = useDebouncedValue(filterUntil);

  const qs = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (dFilterType) params.set('type', dFilterType);
    if (dFilterActor) params.set('actor', dFilterActor.trim());
    if (dFilterQ) params.set('q', dFilterQ.trim());
    if (dFilterName) params.set('name', dFilterName.trim());
    if (dFilterPhone) params.set('phone', dFilterPhone.trim());
    if (dFilterPlate) params.set('plate', dFilterPlate.trim());
    if (dFilterNote) params.set('note', dFilterNote.trim());
    if (dFilterSince) params.set('since', dFilterSince);
    if (dFilterUntil) params.set('until', dFilterUntil);
    return params.toString();
  }, [page, pageSize, dFilterType, dFilterActor, dFilterQ, dFilterName, dFilterPhone, dFilterPlate, dFilterNote, dFilterSince, dFilterUntil]);

  useEffect(() => {
    if (initializedFromUrl.current) return;
    const sp = searchParams;
    if (sp) {
      const p = Number(sp.get('page') || '1');
      if (Number.isFinite(p) && p > 0) setPage(p);
      const t = sp.get('type') || '';
      if (t) setFilterType(t);
      const a = sp.get('actor') || '';
      if (a) setFilterActor(a);
      const q = sp.get('q') || '';
      if (q) setFilterQ(q);
      const n = sp.get('name') || '';
      if (n) setFilterName(n);
      const ph = sp.get('phone') || '';
      if (ph) setFilterPhone(ph);
      const pl = sp.get('plate') || '';
      if (pl) setFilterPlate(pl);
      const nt = sp.get('note') || '';
      if (nt) setFilterNote(nt);
      const s = sp.get('since') || '';
      if (s) setFilterSince(s);
      const u = sp.get('until') || '';
      if (u) setFilterUntil(u);
    }
    initializedFromUrl.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep yyyy-mm-dd strings in sync when user picks a range
  useEffect(() => {
    const toYmd = (d) => d ? new Date(d).toISOString().slice(0,10) : '';
    const s = toYmd(filterRange?.from);
    const u = toYmd(filterRange?.to);
    if (s !== filterSince) setFilterSince(s);
    if (u !== filterUntil) setFilterUntil(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRange]);

  async function load(signal) {
    setLoadingLogs(true);
    try {
      const { data } = await http.get(`/api/gate-logs?${qs}`, { headers: { 'Cache-Control': 'no-store' }, signal });
      setLogs(data.logs || []);
      setHasMore(Boolean(data.hasMore));
    } catch (e) {
      if (e?.name === 'CanceledError' || e?.message === 'canceled' || e?.code === 'ERR_CANCELED') return; // ignore aborted
      setErr(e.message || 'Failed to load logs');
    } finally {
      setLoadingLogs(false);
    }
  }

  function startEdit(log) {
    setEditingId(log.id);
    setEType(log.type || 'entry');
    setEVisitorName(log.visitorName || '');
    setEVisitorPhone(log.visitorPhone || '');
    setEVisitorAddress(log.visitorAddress || '');
    setEPlate(log.plate || '');
    setEGroupSize(log.groupSize ? String(log.groupSize) : '');
    setENote(log.note || '');
    setEditError('');
    setOriginalEdit({
      type: log.type || 'entry',
      visitorName: log.visitorName || '',
      visitorPhone: log.visitorPhone || '',
      visitorAddress: log.visitorAddress || '',
      plate: log.plate || '',
      note: log.note || '',
      groupSize: log.groupSize ?? undefined,
    });
  }

  async function saveEdit(id) {
    try {
      setErr('');
      setEditError('');
      if (savingId) return; // prevent double-submit
      if (editInvalid) { setEditError('Group size must be an integer >= 1 or left empty.'); return; }
      if (!isChanged) { setEditError('No changes to save.'); return; }
      const payload = {
        type: String(eType || 'entry').toLowerCase(),
        visitorName: eVisitorName || undefined,
        visitorPhone: eVisitorPhone || undefined,
        visitorAddress: eVisitorAddress || undefined,
        plate: ePlate || undefined,
        note: eNote || undefined,
        groupSize: eGroupSize ? Number(eGroupSize) : undefined,
      };
      if (!['entry', 'exit', 'incident'].includes(payload.type)) {
        setErr('Invalid type');
        return;
      }
      // optimistic update
      const prev = logs;
      const optimistic = logs.map(l => l.id === id ? {
        ...l,
        type: payload.type,
        visitorName: payload.visitorName ?? null,
        visitorPhone: payload.visitorPhone ?? null,
        plate: payload.plate ?? null,
        note: payload.note ?? null,
        groupSize: payload.groupSize ?? null,
      } : l);
      setSavingId(id);
      setLogs(optimistic);

      try {
        await http.patch(`/api/gate-logs/${id}`, payload);
        setEditingId(null);
        setSavingId(null);
        // refresh to get canonical server values
        await load();
      } catch (inner) {
        setLogs(prev);
        setSavingId(null);
        setEditError(inner?.message || 'Failed to save changes');
        throw inner;
      }
    } catch (e) {
      setErr(e.message || 'Edit failed');
      if (!editError) setEditError(e.message || 'Edit failed');
    }
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function requestDelete(log) {
    setDeleteError('');
    setDeleteTarget(log);
  }

  function closeDelete() {
    if (deleting) return;
    setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      setErr('');
      setDeleteError('');
      setDeleting(true);
      await http.delete(`/api/gate-logs/${deleteTarget.id}`);
      setDeleting(false);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setDeleting(false);
      setDeleteError(e.message || 'Delete failed');
    }
  }


  useEffect(() => {
    // cancel previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    load(controller.signal);
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  // Keep URL in sync with current filters/pagination
  useEffect(() => {
    if (!pathname) return;
    const url = `${pathname}?${qs}`;
    startTransition(() => {
      router.replace(url, { scroll: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs, pathname]);

  function resetFilters() {
    setFilterType('');
    setFilterActor('');
    setFilterQ('');
    setFilterName('');
    setFilterPhone('');
    setFilterPlate('');
    setFilterNote('');
    setFilterSince('');
    setFilterUntil('');
    setPage(1);
  }

  // Highlight helper for unified search
  function highlight(text) {
    const q = (filterQ || '').trim();
    const s = String(text ?? '-');
    if (!q) return s;
    try {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'ig');
      const parts = s.split(rx);
      const matches = s.match(rx);
      if (!matches) return s;
      const out = [];
      for (let i = 0; i < parts.length; i++) {
        out.push(parts[i]);
        if (i < parts.length - 1) out.push(<mark key={i} className="bg-yellow-600/40 px-0.5 rounded-sm">{matches[i]}</mark>);
      }
      return <>{out}</>;
    } catch {
      return s;
    }
  }

  function exportCSV() {
    const rows = [
      ['Time', 'Type', 'Visitor', 'Phone', 'Address', 'Group', 'Plate', 'Note', 'By', 'Updated'],
      ...logs.map(l => [
        new Date(l.at).toISOString(),
        l.type || '',
        l.visitorName || '',
        l.visitorPhone || '',
        l.visitorAddress || '',
        l.groupSize ?? '',
        l.plate || '',
        (l.note || '').replace(/\n/g, ' '),
        l.actor || '',
        l.updatedAt ? new Date(l.updatedAt).toISOString() : '',
      ])
    ];
    const csv = rows.map(r => r.map(v => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gate-logs-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setOk('');
    setBusy(true);
    try {
      if (createPhoneInvalid) throw new Error('Invalid phone number');
      if (createPlateInvalid) throw new Error('Invalid vehicle plate');
      await http.post('/api/gate-logs', {
        type,
        visitorName,
        visitorPhone: visitorPhone || undefined,
        groupSize: groupSize ? Number(groupSize) : undefined,
        plate,
        visitorAddress: visitorAddress || undefined,
        note,
      });
      setOk('Saved');
      setVisitorName('');
      setVisitorPhone('');
      setPlate('');
      setGroupSize('');
      setVisitorAddress('');
      setNote('');
      setType('entry');
      setPage(1);
      load();
    } catch (e) {
      setErr(e.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card className="mb-2">
        <CardHeader>
          <CardTitle>Record Gate Event</CardTitle>
        </CardHeader>
        <CardContent>
          {ok && (
            <Alert className="mb-2">{ok}</Alert>
          )}
          {err && (
            <Alert variant="destructive" className="mb-2">{err}</Alert>
          )}
          <form onSubmit={submit} className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] items-end">
            <div>
              <Label className="mb-1 inline-block">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry</SelectItem>
                  <SelectItem value="exit">Exit</SelectItem>
                  <SelectItem value="incident">Incident</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 inline-block">Visitor Full Name</Label>
              <Input value={visitorName} onChange={e => setVisitorName(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label className="mb-1 inline-block">Visitor Phone</Label>
              <Input
                value={visitorPhone}
                onChange={e => {
                  // keep only digits
                  const v = e.target.value.replace(/\D/g, '');
                  setVisitorPhone(v);
                }}
                placeholder="10-digit mobile"
                inputMode="numeric"
                maxLength={10}
              />
              {createPhoneInvalid && (
                <p className="text-red-600 text-xs mt-1">Enter a valid 10-digit mobile starting with 6-9.</p>
              )}
            </div>
            <div>
              <Label className="mb-1 inline-block">Vehicle Plate</Label>
              <Input
                value={plate}
                onChange={e => {
                  // uppercase and allow letters/digits/space/hyphen only
                  const v = e.target.value.toUpperCase().replace(/[^A-Z0-9 -]/g, '');
                  setPlate(v);
                }}
                placeholder="e.g. MH12 AB 1234"
                maxLength={12}
              />
              {createPlateInvalid && (
                <p className="text-red-600 text-xs mt-1">Enter a valid plate like MH12 AB 1234.</p>
              )}
            </div>
            <div>
              <Label className="mb-1 inline-block">Group Size</Label>
              <Input type="number" min="1" value={groupSize} onChange={e => setGroupSize(e.target.value)} placeholder="Optional" />
            </div>
            <div className="col-[1/-1] grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 inline-block">Visitor Address</Label>
                <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background" rows={3} value={visitorAddress} onChange={e => setVisitorAddress(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label className="mb-1 inline-block">Note</Label>
                <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Optional details" />
              </div>
            </div>
            {/* Note moved next to Address above */}
            <div className="col-[1/-1] flex gap-2">
              <Button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent Gate Activity</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}>Export CSV</Button>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious className={page <= 1 ? 'pointer-events-none opacity-50' : ''} onClick={() => page > 1 && setPage(p => Math.max(1, p - 1))} />
                </PaginationItem>
                <PaginationItem>
                  <span className="inline-flex h-9 items-center px-2 text-sm text-muted-foreground">Page {page}</span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext className={!hasMore ? 'pointer-events-none opacity-50' : ''} onClick={() => hasMore && setPage(p => p + 1)} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))] items-end">
            <div className="col-span-full">
              <Label className="mb-1 inline-block">Search</Label>
              <Input value={filterQ} onChange={e => { setFilterQ(e.target.value); setPage(1); }} placeholder="Name, phone, plate or note" />
            </div>
            <div>
              <Label className="mb-1 inline-block">Type</Label>
              <Select value={filterType || 'all'} onValueChange={(v) => { setFilterType(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="entry">Entry</SelectItem>
                  <SelectItem value="exit">Exit</SelectItem>
                  <SelectItem value="incident">Incident</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 inline-block">Actor</Label>
              <Input value={filterActor} onChange={e => { setFilterActor(e.target.value); setPage(1); }} placeholder="User ID" />
            </div>
            <div>
              <Label className="mb-1 inline-block">Visitor Name</Label>
              <Input value={filterName} onChange={e => { setFilterName(e.target.value); setPage(1); }} placeholder="e.g. Rama" />
            </div>
            <div>
              <Label className="mb-1 inline-block">Phone</Label>
              <Input value={filterPhone} onChange={e => { setFilterPhone(e.target.value); setPage(1); }} placeholder="e.g. 98765" />
            </div>
            <div>
              <Label className="mb-1 inline-block">Plate</Label>
              <Input value={filterPlate} onChange={e => { setFilterPlate(e.target.value); setPage(1); }} placeholder="e.g. MH12" />
            </div>
            <div>
              <Label className="mb-1 inline-block">Note</Label>
              <Input value={filterNote} onChange={e => { setFilterNote(e.target.value); setPage(1); }} placeholder="keyword" />
            </div>
            <div className="col-span-full">
              <Label className="mb-1 inline-block">Date Range</Label>
              <div className="flex flex-wrap gap-2 items-center">
                <div className=" min-w-[240px]">
                  <DateRangePicker className="w-full" value={filterRange} onChange={(r) => { setFilterRange(r); setPage(1); }} />
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => setRangeDays(1)}>Today</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setRangeDays(7)}>Last 7 days</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setRangeDays(30)}>Last 30 days</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setFilterRange({ from: undefined, to: undefined }); setPage(1); }}>Clear</Button>
                <Button type="button" size="sm" variant="destructive" className="ms-auto" onClick={resetFilters}>Reset</Button>
              </div>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Visitor</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Plate</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingLogs && (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      <TableCell colSpan={11}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {!loadingLogs && logs.map((l, i) => (
                <TableRow key={l.id || i}>
                  <TableCell>{new Date(l.at).toLocaleString()}</TableCell>
                  <TableCell style={{ textTransform: 'capitalize' }}>{l.type}</TableCell>
                  <TableCell>{l.visitorName || '-'}</TableCell>
                  <TableCell>{l.visitorPhone || '-'}</TableCell>
                  <TableCell>{l.visitorAddress || '-'}</TableCell>
                  <TableCell>{l.groupSize || '-'}</TableCell>
                  <TableCell>{l.plate || '-'}</TableCell>
                  <TableCell><pre style={{ margin: 0 }}>{l.note || '-'}</pre></TableCell>
                  <TableCell>{l.actor || '-'}</TableCell>
                  <TableCell>{l.updatedAt ? new Date(l.updatedAt).toLocaleString() : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(l)}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => requestDelete(l)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loadingLogs && logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-muted-foreground">No activity yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingId} onOpenChange={(open) => { if (!open) cancelEdit(); }}>
        <DialogContent onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!savingId && !editInvalid && isChanged && editingId) saveEdit(editingId); } }}>
          <DialogHeader>
            <DialogTitle>Edit Gate Entry</DialogTitle>
          </DialogHeader>
          {editError && (
            <Alert variant="destructive">{editError}</Alert>
          )}
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] items-end">
            <div>
              <Label className="mb-1 inline-block">Type</Label>
              <Select value={eType} onValueChange={(v) => setEType(v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry</SelectItem>
                  <SelectItem value="exit">Exit</SelectItem>
                  <SelectItem value="incident">Incident</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 inline-block">Visitor Name</Label>
              <Input value={eVisitorName} onChange={e => setEVisitorName(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label className="mb-1 inline-block">Visitor Phone</Label>
              <Input
                value={eVisitorPhone}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '');
                  setEVisitorPhone(v);
                }}
                placeholder="10-digit mobile"
                inputMode="numeric"
                maxLength={10}
              />
              {editPhoneInvalid && (
                <p className="text-red-600 text-xs mt-1">Enter a valid 10-digit mobile starting with 6-9.</p>
              )}
            </div>
            <div>
              <Label className="mb-1 inline-block">Vehicle Plate</Label>
              <Input
                value={ePlate}
                onChange={e => {
                  const v = e.target.value.toUpperCase().replace(/[^A-Z0-9 -]/g, '');
                  setEPlate(v);
                }}
                placeholder="e.g. MH12 AB 1234"
                maxLength={12}
              />
              {editPlateInvalid && (
                <p className="text-red-600 text-xs mt-1">Enter a valid plate like MH12 AB 1234.</p>
              )}
            </div>
            <div>
              <Label className="mb-1 inline-block">Group Size</Label>
              <Input type="number" min="1" value={eGroupSize} onChange={e => setEGroupSize(e.target.value)} placeholder="Optional" />
              {editInvalid && (
                <p className="text-red-600 text-xs mt-1">Group size must be an integer greater than or equal to 1.</p>
              )}
            </div>
            <div className="col-[1/-1] grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 inline-block">Visitor Address</Label>
                <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background" rows={3} value={eVisitorAddress} onChange={e => setEVisitorAddress(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label className="mb-1 inline-block">Note</Label>
                <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background" rows={3} value={eNote} onChange={e => setENote(e.target.value)} placeholder="Optional details" />
              </div>
            </div>
            {/* Plate and Group moved above Address/Note */}
            {/* Note moved next to Address above */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelEdit} disabled={!!savingId}>Cancel</Button>
            <Button onClick={() => saveEdit(editingId)} disabled={!!savingId || editInvalid || editPhoneInvalid || editPlateInvalid || !isChanged}>{savingId ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) closeDelete(); }}>
        <DialogContent onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!deleting) confirmDelete(); } }}>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
          </DialogHeader>
          {deleteError && (
            <Alert variant="destructive">{deleteError}</Alert>
          )}
          <p className="text-sm text-muted-foreground">
            Are you sure you want to permanently delete this entry{deleteTarget?.visitorName ? ` for "${deleteTarget.visitorName}"` : ''}? This action cannot be undone.
          </p>
          <div className="text-sm mt-2 rounded-md border p-3 bg-muted/30">
            <div><span className="text-muted-foreground">Time:</span> {deleteTarget ? new Date(deleteTarget.at).toLocaleString() : '-'}</div>
            <div><span className="text-muted-foreground">Type:</span> {deleteTarget?.type}</div>
            <div><span className="text-muted-foreground">Plate:</span> {deleteTarget?.plate || '-'}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDelete} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
