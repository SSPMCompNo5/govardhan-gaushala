  "use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Copy, Trash2, Edit3, User2, MoreHorizontal, Search as SearchIcon, Download, HelpCircle, Columns3, Eye } from "lucide-react";

function useQueryString(params) {
  return useMemo(() => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      sp.set(k, String(v));
    });
    return sp.toString();
  }, [params]);
}

function downloadCSVVisible(filename, rows, columns) {
  // columns: visibility map { time, type, visitor, phone, address, group, plate, note, by, updated }
  const colDefs = [
    { key: 'time', label: 'Time', get: (r) => (r.at ? new Date(r.at).toISOString() : '') },
    { key: 'type', label: 'Type', get: (r) => r.type || '' },
    { key: 'visitor', label: 'Visitor Name', get: (r) => r.visitorName || '' },
    { key: 'phone', label: 'Visitor Phone', get: (r) => r.visitorPhone || '' },
    { key: 'address', label: 'Visitor Address', get: (r) => r.visitorAddress || '' },
    { key: 'group', label: 'Group Size', get: (r) => (r.groupSize ?? '') },
    { key: 'plate', label: 'Plate', get: (r) => r.plate || '' },
    { key: 'note', label: 'Note', get: (r) => (r.note || '').replace(/\n/g, ' ').replace(/"/g, '""') },
    { key: 'by', label: 'By', get: (r) => r.actor || '' },
    { key: 'updated', label: 'Updated', get: (r) => (r.updatedAt ? new Date(r.updatedAt).toISOString() : '') },
  ].filter((c) => columns[c.key]);
  const header = colDefs.map((c) => c.label);
  const lines = [header.join(",")].concat(
    rows.map((r) => colDefs.map((c) => `"${String(c.get(r)).replace(/"/g, '""')}"`).join(","))
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function formatYmd(d) {
  if (!d) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function downloadCSV(filename, rows) {
  const header = [
    "Time",
    "Type",
    "Visitor Name",
    "Visitor Phone",
    "Visitor Address",
    "Group Size",
    "Plate",
    "Note",
    "By",
    "Updated",
    "ID",
  ];
  const lines = [header.join(",")].concat(
    rows.map((r) => [
      r.at ? new Date(r.at).toISOString() : "",
      r.type || "",
      r.visitorName || "",
      r.visitorPhone || "",
      r.visitorAddress || "",
      r.groupSize ?? "",
      r.plate || "",
      (r.note || "").replace(/\n/g, " ").replace(/"/g, '""'),
      r.actor || "",
      r.updatedAt ? new Date(r.updatedAt).toISOString() : "",
      r.id || "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export default function GateLogsClient() {
  // Fixed regex for Indian vehicle plate format
  const PLATE_REGEX = /^[A-Z]{2}[ -]?[0-9]{2}[ -]?[A-Z]{1,2}[ -]?[0-9]{4}$/;
  // CREATE FORM
  const [form, setForm] = useState({ type: "entry", visitorName: "", visitorPhone: "", visitorAddress: "", plate: "", groupSize: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [regexErr, setRegexErr] = useState({ phone: "", plate: "" });

  function validateRegexString(str) {
    if (!str) return "";
    if (str.length > 200) return "Regex too long";
    try {
      // default case-insensitive like server
      // eslint-disable-next-line no-new
      new RegExp(String(str), 'i');
      return "";
    } catch {
      return "Invalid regex";
    }
  }
  function getCellValue(row, key) {
    switch (key) {
      case 'time': return row.at ? new Date(row.at).getTime() : 0;
      case 'type': return row.type || '';
      case 'visitor': return row.visitorName || '';
      case 'phone': return row.visitorPhone || '';
      case 'address': return row.visitorAddress || '';
      case 'group': return typeof row.groupSize === 'number' ? row.groupSize : -Infinity;
      case 'plate': return row.plate || '';
      case 'note': return row.note || '';
      case 'by': return row.actor || '';
      case 'updated': return row.updatedAt ? new Date(row.updatedAt).getTime() : 0;
      default: return '';
    }
  }

  

  function typeBadgeClass(t) {
    const base = 'px-2 py-0.5 rounded-full text-xs font-medium';
    if (t === 'entry') return base + ' bg-emerald-600/15 text-emerald-500 border border-emerald-600/30';
    if (t === 'exit') return base + ' bg-sky-600/15 text-sky-500 border border-sky-600/30';
    if (t === 'incident') return base + ' bg-rose-600/15 text-rose-500 border border-rose-600/30';
    return base + ' bg-muted text-foreground/80';
  }

  async function createLog(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      // Enforce phone: 10 digits if provided
      const phoneDigits = (form.visitorPhone || '').replace(/\D+/g, '');
      const phoneErr = phoneDigits && phoneDigits.length !== 10 ? 'Must be 10 digits' : '';
      // Validate plate against provided regex (uppercase compare)
      const plateVal = (form.plate || '').toUpperCase();
      const plateErr = plateVal && !PLATE_REGEX.test(plateVal) ? 'Invalid plate format' : '';
      setRegexErr({ phone: phoneErr, plate: plateErr });
      if (phoneErr || plateErr) throw new Error(phoneErr || plateErr);
      // Normalize phone to digits-only before sending
      const payload = { ...form, visitorPhone: phoneDigits || '', plate: plateVal };
      const res = await fetch("/api/gate-logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to create");
      setForm((f) => ({ ...f, visitorName: "", visitorPhone: "", visitorAddress: "", plate: "", groupSize: "", note: "" }));
      await load();
    } catch (e) {
      setError(e?.message || "Error");
    } finally {
      setSubmitting(false);
    }
  }

  // FILTERS
  const [filters, setFilters] = useState({ q: "", type: "", actor: "", name: "", phone: "", plate: "", address: "", note: "", since: "", until: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState({ logs: [], hasMore: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scrolledTable, setScrolledTable] = useState(false);
  const tableScrollRef = useRef(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // Derived quick stats from currently loaded logs (page scope)
  const todayYmd = useMemo(() => formatYmd(new Date()), []);
  const stats = useMemo(() => {
    const t = { entry: 0, exit: 0, incident: 0 };
    const freq = new Map();
    (data.logs || []).forEach((r) => {
      try {
        const d = r.at ? new Date(r.at) : null;
        const isToday = d && formatYmd(d) === todayYmd;
        if (isToday && r.type && t[r.type] !== undefined) t[r.type] += 1;
        const name = (r.visitorName || '').trim();
        if (name) freq.set(name, (freq.get(name) || 0) + 1);
      } catch {}
    });
    const topVisitors = Array.from(freq.entries()).sort((a,b) => b[1]-a[1]).slice(0,4).map(([n]) => n);
    return { ...t, topVisitors };
  }, [data.logs, todayYmd]);

  function initials(name) {
    if (!name) return "?";
    const parts = String(name).trim().split(/\s+/).slice(0,2);
    return parts.map(p=>p[0]?.toUpperCase()).join("") || "?";
  }
  // Debounce text filters to reduce refetches while typing
  const TEXT_KEYS = ["q", "name", "phone", "plate", "address", "note"];
  const [debouncedText, setDebouncedText] = useState(() => TEXT_KEYS.reduce((acc, k) => ({ ...acc, [k]: "" }), {}));
  useEffect(() => {
    const t = setTimeout(() => {
      const next = {};
      TEXT_KEYS.forEach((k) => (next[k] = filters[k]));
      setDebouncedText(next);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.name, filters.phone, filters.plate, filters.address, filters.note]);
  const effectiveFilters = useMemo(() => ({ ...filters, ...debouncedText }), [filters, debouncedText]);
  const qs = useQueryString({ ...effectiveFilters, page, pageSize });

  // Refs for keyboard shortcuts
  const qRef = useRef(null);
  const phoneRef = useRef(null);
  const plateRef = useRef(null);
  const sinceBtnRef = useRef(null);
  const untilBtnRef = useRef(null);
  const [sinceOpen, setSinceOpen] = useState(false);
  const [untilOpen, setUntilOpen] = useState(false);
  // Saved views & Column visibility
  const [savedViews, setSavedViews] = useState([]);
  const [selectedView, setSelectedView] = useState("");
  const [columns, setColumns] = useState({
    time: true,
    type: true,
    visitor: true,
    phone: false,
    address: false,
    group: true,
    plate: true,
    note: true,
    by: true,
    updated: true,
    actions: true,
  });
  const [autoApply, setAutoApply] = useState(true);
  const [rowDensity, setRowDensity] = useState('comfortable');
  const [sortBy, setSortBy] = useState('time'); // time,type,visitor,phone,address,group,plate,note,by,updated
  const [sortDir, setSortDir] = useState('desc'); // asc|desc
  const [toast, setToast] = useState({ text: '', type: 'info', ts: 0 });

  // Memoized Date objects for since/until
  const sinceDate = useMemo(() => (filters.since ? new Date(`${filters.since}T00:00:00`) : undefined), [filters.since]);
  const untilDate = useMemo(() => (filters.until ? new Date(`${filters.until}T00:00:00`) : undefined), [filters.until]);

  // Sorting helpers (must be after state declarations)
  const sortedLogs = useMemo(() => {
    const arr = [...(data.logs || [])];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const va = getCellValue(a, sortBy);
      const vb = getCellValue(b, sortBy);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
    return arr;
  }, [data.logs, sortBy, sortDir]);

  function cycleSort(key) {
    if (sortBy !== key) { setSortBy(key); setSortDir(key === 'time' || key === 'updated' ? 'desc' : 'asc'); return; }
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
  }

  function sortIndicator(key) {
    if (sortBy !== key) return '↕';
    return sortDir === 'asc' ? '↑' : '↓';
  }

  // Toast utilities
  useEffect(() => {
    if (!toast.text) return;
    const t = setTimeout(() => setToast({ text: '', type: 'info', ts: 0 }), 2500);
    return () => clearTimeout(t);
  }, [toast.ts]);

  async function copyText(text, label = 'copied') {
    try {
      await navigator.clipboard.writeText(text || '');
      setToast({ text: label, type: 'success', ts: Date.now() });
    } catch {}
  }

  // Initialize from URL or localStorage
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const urlParams = Object.fromEntries(sp.entries());
      const lsFilters = JSON.parse(localStorage.getItem("watchmanFilters") || "null");
      const lsPageSize = parseInt(localStorage.getItem("watchmanPageSize") || "0", 10) || 0;
      const lsViews = JSON.parse(localStorage.getItem("watchmanSavedViews") || "[]");
      const lsCols = JSON.parse(localStorage.getItem("watchmanColumns") || "null");
      const lsAuto = localStorage.getItem("watchmanAutoApply");
      const lsDensity = localStorage.getItem("watchmanRowDensity");
      const lsSort = JSON.parse(localStorage.getItem("watchmanSort") || "null");

      // Merge precedence: URL > localStorage > defaults
      const nextFilters = { ...filters };
      ["q","type","actor","name","phone","plate","address","note","since","until"].forEach(k => {
        if (urlParams[k] !== undefined) nextFilters[k] = urlParams[k];
        else if (lsFilters && lsFilters[k] !== undefined) nextFilters[k] = lsFilters[k];
      });
      const nextPage = urlParams.page ? Math.max(1, parseInt(urlParams.page, 10) || 1) : 1;
      const nextPageSize = urlParams.pageSize ? Math.max(1, parseInt(urlParams.pageSize, 10) || 20) : (lsPageSize || 20);

      setFilters(nextFilters);
      setPage(nextPage);
      setPageSize(nextPageSize);
      setSavedViews(Array.isArray(lsViews) ? lsViews : []);
      if (lsCols && typeof lsCols === 'object') setColumns({ ...columns, ...lsCols });
      if (lsAuto === '0') setAutoApply(false);
      if (lsDensity === 'compact' || lsDensity === 'comfortable') setRowDensity(lsDensity);
      if (lsSort && lsSort.by && lsSort.dir) { setSortBy(lsSort.by); setSortDir(lsSort.dir); }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to URL and localStorage when query changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = `?${qs}`;
    window.history.replaceState(null, "", url);
    try {
      localStorage.setItem("watchmanFilters", JSON.stringify(filters));
      localStorage.setItem("watchmanPageSize", String(pageSize));
    } catch {}
  }, [qs]);

  // Persist column visibility
  useEffect(() => {
    try { localStorage.setItem("watchmanColumns", JSON.stringify(columns)); } catch {}
  }, [columns]);

  // Persist auto-apply
  useEffect(() => {
    try { localStorage.setItem("watchmanAutoApply", autoApply ? '1' : '0'); } catch {}
  }, [autoApply]);

  // Persist row density
  useEffect(() => {
    try { localStorage.setItem("watchmanRowDensity", rowDensity); } catch {}
  }, [rowDensity]);

  // Persist sort
  useEffect(() => {
    try { localStorage.setItem("watchmanSort", JSON.stringify({ by: sortBy, dir: sortDir })); } catch {}
  }, [sortBy, sortDir]);

  // Helpers: saved views
  function saveCurrentView() {
    const name = prompt("Save current filters as:");
    if (!name) return;
    const view = { name, filters: { ...filters } };
    const next = [...savedViews.filter(v => v.name !== name), view];
    setSavedViews(next);
    try { localStorage.setItem("watchmanSavedViews", JSON.stringify(next)); } catch {}
    setSelectedView(name);
    setToast({ text: `Saved view “${name}”`, type: 'success', ts: Date.now() });
  }
  function applyViewByName(name) {
    const v = savedViews.find((x) => x.name === name);
    if (!v) return;
    setPage(1);
    setFilters({ ...filters, ...v.filters });
  }
  function deleteSelectedView() {
    if (!selectedView) return;
    if (!confirm(`Delete saved view “${selectedView}”?`)) return;
    const next = savedViews.filter(v => v.name !== selectedView);
    setSavedViews(next);
    try { localStorage.setItem("watchmanSavedViews", JSON.stringify(next)); } catch {}
    setSelectedView("");
    setToast({ text: 'Deleted saved view', type: 'success', ts: Date.now() });
  }

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      // Ignore inside inputs/selects/textareas if typing, except Ctrl+K
      const tag = (e.target?.tagName || '').toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;
      // Focus search: Ctrl+K or '/'
      if ((e.ctrlKey && (e.key === 'k' || e.key === 'K')) || (!isTyping && e.key === '/')) {
        e.preventDefault();
        qRef.current?.focus();
        return;
      }
      // Alt+P -> phone
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        phoneRef.current?.focus();
        return;
      }
      // Alt+L -> plate
      if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        plateRef.current?.focus();
        return;
      }
      // Alt+D -> focus Since date picker
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        sinceBtnRef.current?.focus();
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function setFilterField(k, v) {
    setPage(1);
    setFilters((f) => ({ ...f, [k]: v }));
  }

  function presetRange(days) {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - (days - 1));
    setFilterField("since", formatYmd(from));
    setFilterField("until", formatYmd(today));
  }

  function presetThisWeek() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun..6=Sat
    const mondayOffset = (day + 6) % 7; // days since Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    setFilterField('since', formatYmd(monday));
    setFilterField('until', formatYmd(sunday));
  }

  function presetLastWeek() {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = (day + 6) % 7;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - mondayOffset);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    setFilterField('since', formatYmd(lastMonday));
    setFilterField('until', formatYmd(lastSunday));
  }

  function presetThisQuarter() {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3); // 0..3
    const start = new Date(now.getFullYear(), q * 3, 1);
    const end = new Date(now.getFullYear(), q * 3 + 3, 0);
    setFilterField('since', formatYmd(start));
    setFilterField('until', formatYmd(end));
  }

  function presetLastQuarter() {
    const now = new Date();
    let q = Math.floor(now.getMonth() / 3) - 1;
    let year = now.getFullYear();
    if (q < 0) { q = 3; year -= 1; }
    const start = new Date(year, q * 3, 1);
    const end = new Date(year, q * 3 + 3, 0);
    setFilterField('since', formatYmd(start));
    setFilterField('until', formatYmd(end));
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/gate-logs?${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      setData({ logs: json.logs || [], hasMore: !!json.hasMore });
      // Show a subtle toast if manually applied
      if (!autoApply) setToast({ text: 'Filters applied', type: 'success', ts: Date.now() });
    } catch (e) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoApply) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs, autoApply]);

  // Always load on page/pageSize change even when autoApply is off
  useEffect(() => {
    if (!autoApply) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  // EDIT/DELETE via Dialogs
  const [editingId, setEditingId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editValues, setEditValues] = useState({ type: "", visitorName: "", visitorPhone: "", visitorAddress: "", plate: "", groupSize: "", note: "" });
  const [editErr, setEditErr] = useState({ phone: "", plate: "" });
  // Context menu state
  const [context, setContext] = useState({ open: false, x: 0, y: 0, row: null });

  const isEditValid = useMemo(() => {
    const phoneDigits = (editValues.visitorPhone || '').replace(/\D+/g, '');
    const phoneOk = !phoneDigits || phoneDigits.length === 10;
    const plateVal = (editValues.plate || '').toUpperCase();
    const plateOk = !plateVal || PLATE_REGEX.test(plateVal);
    return phoneOk && plateOk;
  }, [editValues]);

  function startEdit(row) {
    setEditingId(row.id);
    setEditValues({
      type: row.type || "entry",
      visitorName: row.visitorName || "",
      visitorPhone: row.visitorPhone || "",
      visitorAddress: row.visitorAddress || "",
      plate: row.plate || "",
      groupSize: row.groupSize ?? "",
      note: row.note || "",
    });
    setEditErr({ phone: "", plate: "" });
    setEditOpen(true);
  }

  // Row context menu handlers
  function openContextMenu(e, row) {
    e.preventDefault();
    setContext({ open: true, x: e.clientX, y: e.clientY, row });
  }

  async function copyText(text) {
    try {
      if (!text) return;
      await navigator.clipboard.writeText(String(text));
    } catch {
      // ignore clipboard errors
    } finally {
      setContext({ open: false, x: 0, y: 0, row: null });
    }
  }

  async function saveEdit(id) {
    setSubmitting(true);
    setError("");
    try {
      // Validate & normalize phone (10 digits)
      const phoneDigits = (editValues.visitorPhone || '').replace(/\D+/g, '');
      if (phoneDigits && phoneDigits.length !== 10) throw new Error('Phone must be 10 digits');
      // Validate & normalize plate (uppercase, regex)
      const plateVal = (editValues.plate || '').toUpperCase();
      if (plateVal && !PLATE_REGEX.test(plateVal)) throw new Error('Invalid plate format');
      const payload = { ...editValues, visitorPhone: phoneDigits || '', plate: plateVal };
      const res = await fetch(`/api/gate-logs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to update");
      setEditingId(null);
      setEditOpen(false);
      await load();
    } catch (e) {
      setError(e?.message || "Error");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteRow(id) {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/gate-logs/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to delete");
      await load();
    } catch (e) {
      setError(e?.message || "Error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Toasts: fixed top-right */}
      {toast.text ? (
        <div className="fixed top-3 right-3 z-50">
          <div className="text-sm px-3 py-2 rounded-md bg-emerald-600/15 text-emerald-600 border border-emerald-700/20 shadow-sm">
            {toast.text}
          </div>
        </div>
      ) : null}
      {/* Overview cards */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Entries Today</div>
          <div className="text-2xl font-semibold mt-1">{stats.entry}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Exits Today</div>
          <div className="text-2xl font-semibold mt-1">{stats.exit}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Incidents Today</div>
          <div className="text-2xl font-semibold mt-1">{stats.incident}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Frequent Visitors</div>
          <div className="text-sm mt-1 truncate" title={(stats.topVisitors||[]).join(', ')}>
            {(stats.topVisitors||[]).length ? stats.topVisitors.join(', ') : '—'}
          </div>
        </div>
      </div>

      {/* Create form */}
      <Card className="rounded-xl border bg-card p-6 shadow-sm mb-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-lg font-medium text-muted-foreground">Record Gate Event</CardTitle>
          <CardDescription className="text-gray-400">Quickly add a new entry, exit, or incident.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <form onSubmit={createLog}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger className="w-full mt-1"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry</SelectItem>
                    <SelectItem value="exit">Exit</SelectItem>
                    <SelectItem value="incident">Incident</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Visitor Name</Label>
                <Input id="form-visitorName" placeholder="Optional" value={form.visitorName} onChange={(e) => setForm((f) => ({ ...f, visitorName: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Visitor Phone</Label>
                <Input
                  id="form-visitorPhone"
                  placeholder="10 digits"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={form.visitorPhone}
                  onChange={(e) => {
                    const digits = (e.target.value || '').replace(/\D+/g, '').slice(0, 10);
                    setForm((f) => ({ ...f, visitorPhone: digits }));
                    setRegexErr((r) => ({ ...r, phone: digits && digits.length !== 10 ? 'Must be 10 digits' : '' }));
                  }}
                  aria-invalid={!!regexErr.phone}
                  className="mt-1"
                />
                {regexErr.phone ? <small style={{ color: '#DC2626' }}>{regexErr.phone}</small> : <small style={{ color: '#6B7280' }}>Enter exactly 10 digits</small>}
              </div>
              <div>
                <Label>Visitor Address</Label>
                <Input id="form-visitorAddress" placeholder="Optional" value={form.visitorAddress} onChange={(e) => setForm((f) => ({ ...f, visitorAddress: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Vehicle Plate</Label>
                <Input
                  id="form-plate"
                  placeholder="e.g. MH 12 AB 1234"
                  value={form.plate}
                  onChange={(e) => {
                    const v = (e.target.value || '').toUpperCase();
                    setForm((f) => ({ ...f, plate: v }));
                    setRegexErr((r) => ({ ...r, plate: v && !PLATE_REGEX.test(v) ? 'Invalid plate format' : '' }));
                  }}
                  aria-invalid={!!regexErr.plate}
                  className="mt-1"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <small style={{ color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                    Format: AA 00 AA 0000 (spaces or hyphens allowed)
                  </small>
                  {regexErr.plate ? (
                    <small style={{ color: '#DC2626', whiteSpace: 'nowrap' }}>{regexErr.plate}</small>
                  ) : null}
                </div>
              </div>
              <div>
                <Label>Group Size</Label>
                <Input id="form-groupSize" placeholder="Optional" value={form.groupSize} onChange={(e) => setForm((f) => ({ ...f, groupSize: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div style={{ height: 8 }} />
            <div>
              <Label>Details</Label>
              <textarea id="form-note" placeholder="Optional details" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} style={{ width: '100%', minHeight: 64 }} className="mt-1" />
            </div>
            <div style={{ height: 8 }} />
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Activity + Filters */}
      <Card className="rounded-xl border bg-card p-6 shadow-sm">
        <CardHeader className="px-0 pt-0 pb-2">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', position: 'relative' }}>
            <CardTitle className="text-lg font-medium text-muted-foreground" style={{ flex: 1 }}>Recent Gate Activity</CardTitle>
            {/* Shortcuts help */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline"><HelpCircle size={16} className="mr-2" /> Help</Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end" sideOffset={6}>
                <div className="text-sm space-y-1">
                  <div className="font-medium mb-1">Keyboard shortcuts</div>
                  <div><span className="font-mono">Ctrl+K</span> or <span className="font-mono">/</span> — Focus search</div>
                  <div><span className="font-mono">Alt+P</span> — Focus phone</div>
                  <div><span className="font-mono">Alt+L</span> — Focus plate</div>
                  <div><span className="font-mono">Alt+D</span> — Open “Since” date</div>
                </div>
              </PopoverContent>
            </Popover>
            {/* Column visibility popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline"><Columns3 size={16} className="mr-2" /> Columns</Button>
              </PopoverTrigger>
              <PopoverContent className="p-3 w-56">
                <div className="grid gap-2">
                  {[
                    ["time","Time"],
                    ["type","Type"],
                    ["visitor","Visitor"],
                    ["phone","Phone"],
                    ["address","Address"],
                    ["group","Group"],
                    ["plate","Plate"],
                    ["note","Note"],
                    ["by","By"],
                    ["updated","Updated"],
                    ["actions","Actions"],
                  ].map(([key,label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!columns[key]} onCheckedChange={(v) => setColumns((c) => ({ ...c, [key]: !!v }))} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {/* Density select */}
            <div>
              <Label htmlFor="density-select" className="text-xs">Density</Label>
              <Select value={rowDensity} onValueChange={(v) => setRowDensity(v)}>
                <SelectTrigger id="density-select" className="w-[130px] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Active filters badge */}
            <span className="px-2 py-1 text-xs rounded-full bg-muted" title="Active filter count">
              {Object.entries(filters).filter(([k,v]) => !!v && ["type","actor","name","phone","plate","address","note","since","until","q"].includes(k)).length} filters
            </span>
            {/* Share link */}
            <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setToast({ text: 'Link copied', type: 'success', ts: Date.now() }); } catch {} }}><Copy size={16} className="mr-2" /> Copy link</Button>
            <Button onClick={() => downloadCSV(`gate-logs-${Date.now()}.csv`, data.logs)} disabled={!data.logs.length}><Download size={16} className="mr-2" /> Export (all)</Button>
            <Button onClick={() => downloadCSVVisible(`gate-logs-visible-${Date.now()}.csv`, data.logs, columns)} disabled={!data.logs.length}><Download size={16} className="mr-2" /> Export (visible)</Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">

        {/* Search */}
        <div className="mb-4">
          <div className="text-2xl font-semibold mb-3">Watchman Dashboard</div>
          <Label htmlFor="flt-q">Search</Label>
          <div className="relative mt-1">
            <SearchIcon size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input id="flt-q" ref={qRef} placeholder="Search by name, phone, plate, or note" value={filters.q || ''} onChange={(e) => setFilterField('q', e.target.value)} className="h-11 pl-9 pr-7" />
            {filters.q ? (
              <button
                onClick={() => setFilterField('q', '')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>

        {/* Saved views */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'end', marginBottom: 8, flexWrap: 'wrap' }}>
          <div>
            <Label htmlFor="saved-view">Saved view</Label>
            <Select value={selectedView || undefined} onValueChange={(v) => { setSelectedView(v === 'none' ? '' : v); if (v && v !== 'none') applyViewByName(v); }}>
              <SelectTrigger id="saved-view" className="w-[220px] mt-1">
                <SelectValue placeholder="Pick saved view" />
              </SelectTrigger>
              <SelectContent>
                {savedViews.length === 0 ? (
                  <SelectItem value="none">No saved views</SelectItem>
                ) : savedViews.map((v) => (
                  <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={saveCurrentView}>Save current</Button>
          <Button variant="destructive" onClick={deleteSelectedView} disabled={!selectedView}>Delete view</Button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button
              variant={autoApply ? 'default' : 'outline'}
              onClick={() => setAutoApply((v) => !v)}
              title="When enabled, filters apply automatically on change"
            >
              Auto-apply: {autoApply ? 'On' : 'Off'}
            </Button>
            <Button onClick={() => load()} disabled={loading}>Apply</Button>
            <Button variant="ghost" onClick={() => { setFilters({ q: "", type: "", actor: "", name: "", phone: "", plate: "", address: "", note: "", since: "", until: "" }); setPage(1); }}>Clear all</Button>
          </div>
        </div>

        {/* Row of basic filters */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 8 }}>
          <div>
            <Label>Type</Label>
            <Select value={filters.type || 'all'} onValueChange={(v) => setFilterField('type', v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full mt-1"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="entry">Entry</SelectItem>
                <SelectItem value="exit">Exit</SelectItem>
                <SelectItem value="incident">Incident</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Visitor Name</Label>
            <div className="relative mt-1">
              <Input id="flt-name" placeholder="e.g. Ramu" value={filters.name} onChange={(e) => setFilterField("name", e.target.value)} className="pr-7" />
              {filters.name ? (
                <button
                  onClick={() => setFilterField('name', '')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  aria-label="Clear name"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Visitor Phone</Label>
              <span className="text-[10px] text-muted-foreground">Regex supported</span>
            </div>
            <div className="relative mt-1">
              <Input id="flt-phone" ref={phoneRef} placeholder="e.g. ^98.*$" value={filters.phone} onChange={(e) => setFilterField("phone", e.target.value)} className="pr-7" />
              {filters.phone ? (
                <button
                  onClick={() => setFilterField('phone', '')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  aria-label="Clear phone"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>
        </div>
        {/* Active filter chips */}
        <div className="flex flex-wrap gap-2 mb-2">
          {Object.entries(filters)
            .filter(([k, v]) => !!v && ["type", "actor", "name", "phone", "plate", "address", "note", "since", "until", "q"].includes(k))
            .map(([k, v]) => (
              <button
                key={k}
                onClick={() => setFilterField(k, "")}
                className="text-xs px-2 py-1 rounded-full bg-muted hover:opacity-80"
                title={`Clear ${k}`}
              >
                <span className="font-medium">{k}</span>: {String(v)} ×
              </button>
            ))}
        </div>

        {/* Date range separated (Calendar popovers) */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'end', marginBottom: 8, flexWrap: 'wrap' }}>
          <div>
            <Label>Since</Label>
            <Popover open={sinceOpen} onOpenChange={setSinceOpen}>
              <PopoverTrigger asChild>
                <Button ref={sinceBtnRef} variant="outline" className="mt-1 min-w-[160px] justify-start">
                  {filters.since ? filters.since : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-2 z-[1000]">
                <Calendar
                  mode="single"
                  selected={sinceDate}
                  disabled={untilDate ? { after: untilDate } : undefined}
                  onSelect={(d) => {
                    const val = d ? formatYmd(d) : '';
                    if (val && filters.until && val > filters.until) {
                      // set both since and until to val
                      setFilters((f) => ({ ...f, since: val, until: val }));
                      setPage(1);
                    } else {
                      setFilterField('since', val);
                    }
                    setSinceOpen(false);
                  }}
                  weekStartsOn={1}
                />
              </PopoverContent>
            </Popover>
            <div className="text-xs text-muted-foreground mt-1">
              {filters.until ? `Max: ${filters.until}` : 'Pick any date'}
            </div>
          </div>
          <div>
            <Label>Until</Label>
            <Popover open={untilOpen} onOpenChange={setUntilOpen}>
              <PopoverTrigger asChild>
                <Button ref={untilBtnRef} variant="outline" className="mt-1 min-w-[160px] justify-start">
                  {filters.until ? filters.until : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-2 z-[1000]">
                <Calendar
                  mode="single"
                  selected={untilDate}
                  disabled={sinceDate ? { before: sinceDate } : undefined}
                  onSelect={(d) => {
                    const val = d ? formatYmd(d) : '';
                    if (val && filters.since && val < filters.since) {
                      setFilters((f) => ({ ...f, since: val, until: val }));
                      setPage(1);
                    } else {
                      setFilterField('until', val);
                    }
                    setUntilOpen(false);
                  }}
                  weekStartsOn={1}
                />
              </PopoverContent>
            </Popover>
            <div className="text-xs text-muted-foreground mt-1">
              {filters.since ? `Min: ${filters.since}` : 'Pick any date'}
            </div>
          </div>
          <Button variant="outline" onClick={() => { const t=new Date(); setFilterField('since', formatYmd(t)); setFilterField('until', formatYmd(t)); }}>Today</Button>
          <Button variant="outline" onClick={presetThisWeek}>This week</Button>
          <Button variant="outline" onClick={presetLastWeek}>Last week</Button>
          <Button variant="outline" onClick={() => { const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth(), 1); const last = new Date(now.getFullYear(), now.getMonth()+1, 0); setFilterField('since', formatYmd(first)); setFilterField('until', formatYmd(last)); }}>This month</Button>
          <Button variant="outline" onClick={() => { const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth()-1, 1); const last = new Date(now.getFullYear(), now.getMonth(), 0); setFilterField('since', formatYmd(first)); setFilterField('until', formatYmd(last)); }}>Last month</Button>
          <Button variant="outline" onClick={presetThisQuarter}>This quarter</Button>
          <Button variant="outline" onClick={presetLastQuarter}>Last quarter</Button>
          <Button variant="outline" onClick={() => presetRange(7)}>Last 7 days</Button>
          <Button variant="outline" onClick={() => presetRange(30)}>Last 30 days</Button>
          <Button variant="ghost" onClick={() => { setFilterField('since', ''); setFilterField('until', ''); }}>Clear</Button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Button onClick={() => { setFilters({ ...filters }); load(); }} disabled={loading}>Reset</Button>
          </div>
        </div>

        {/* Advanced filters popover + utilities */}
        <div className="col-span-full flex items-center gap-2 mt-1">
          <Popover open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost">Advanced filters</Button>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] p-4" sideOffset={6} align="start">
              <div className="grid gap-3">
                <div>
                  <Label>User ID</Label>
                  <Input placeholder="User ID" value={filters.actor || ''} onChange={(e) => setFilterField('actor', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input placeholder="e.g. Vrindavan" value={filters.address || ''} onChange={(e) => setFilterField('address', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Vehicle Plate</Label>
                    <span className="text-[10px] text-muted-foreground">Regex supported</span>
                  </div>
                  <Input placeholder="e.g. ^MH\\d+" value={filters.plate || ''} onChange={(e) => setFilterField('plate', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Note keyword</Label>
                  <Input placeholder="keyword" value={filters.note || ''} onChange={(e) => setFilterField('note', e.target.value)} className="mt-1" />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <Button variant="ghost" onClick={() => setAdvancedOpen(false)}>Close</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button type="button" variant="outline" onClick={() => { Object.keys(filters).forEach(k => setFilterField(k, '')); }} title="Clear all filters">
            <Trash2 size={14} className="mr-2" /> Clear Filters
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant={autoApply ? 'default' : 'outline'}
              onClick={() => { const val = !autoApply; setAutoApply(val); try{ localStorage.setItem('gateLogs:autoApply', String(val)); } catch{} }}
            >
              Auto-apply: {autoApply ? 'On' : 'Off'}
            </Button>
            <Button onClick={() => load()} disabled={loading}>Apply</Button>
          </div>
        </div>

        {/* Advanced filters content moved into Popover above */}

        {/* Duplicate presets removed; consolidated above in date bar */}

        {/* Pager */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={loading || page === 1}>Previous</Button>
          <span style={{ fontSize: 12 }}>Page {page}</span>
          <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={loading || !data.hasMore}>Next</Button>
          <div>
            <Label htmlFor="page-size">Page size</Label>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Math.max(1, parseInt(v || '20', 10)))}>
              <SelectTrigger id="page-size" className="w-[120px] mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10,20,50,100].map(n => (
                  <SelectItem key={n} value={String(n)}>{n}/page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span style={{ marginLeft: 'auto', color: '#9CA3AF', fontSize: 12 }}>{loading ? 'Loading...' : `${data.logs.length} rows`}</span>
        </div>

        {/* Table */}
        <div
          style={{ overflowX: 'auto', maxHeight: 520 }}
          ref={tableScrollRef}
          onScroll={(e) => {
            try {
              setScrolledTable((e.currentTarget?.scrollTop || 0) > 0);
            } catch {}
          }}
        >
          {(() => { return null; })()}
          { /* visible column count for colSpan */ }
          { /* using memo-like computation inline */ }
          { /* no-op block above to keep React happy with expressions */ }
          <Table style={{ fontSize: rowDensity === 'compact' ? 12 : 14 }}>
            <TableHeader className={`sticky top-0 z-10 bg-background/80 backdrop-blur ${scrolledTable ? 'shadow-sm' : ''} border-b border-border`}>
              <TableRow>
                {columns.time && <TableHead onClick={() => cycleSort('time')} className="cursor-pointer select-none sticky top-0 z-10 bg-background/80 backdrop-blur">Time <span className="opacity-60">{sortIndicator('time')}</span></TableHead>}
                {columns.type && <TableHead onClick={() => cycleSort('type')} className="cursor-pointer select-none sticky top-0 z-10 bg-background/80 backdrop-blur">Type <span className="opacity-60">{sortIndicator('type')}</span></TableHead>}
                {columns.visitor && <TableHead onClick={() => cycleSort('visitor')} className="cursor-pointer select-none sticky top-0 z-10 bg-background/80 backdrop-blur">Visitor <span className="opacity-60">{sortIndicator('visitor')}</span></TableHead>}
                {columns.phone && <TableHead onClick={() => cycleSort('phone')} className="cursor-pointer select-none sticky top-0 z-10 bg-background/80 backdrop-blur">Phone <span className="opacity-60">{sortIndicator('phone')}</span></TableHead>}
                {columns.address && <TableHead onClick={() => cycleSort('address')} className="cursor-pointer select-none sticky top-0 z-10 bg-background/80 backdrop-blur">Address <span className="opacity-60">{sortIndicator('address')}</span></TableHead>}
                {columns.group && <TableHead onClick={() => cycleSort('group')} className="cursor-pointer select-none sticky top-0 z-10 bg-background/80 backdrop-blur">Group <span className="opacity-60">{sortIndicator('group')}</span></TableHead>}
                {columns.plate && <TableHead onClick={() => cycleSort('plate')} className="cursor-pointer select-none sticky top-0 z-10 bg-background/80 backdrop-blur">Plate <span className="opacity-60">{sortIndicator('plate')}</span></TableHead>}
                {columns.note && <TableHead onClick={() => cycleSort('note')} className="cursor-pointer select-none sticky top-0 z-10 bg-background/80 backdrop-blur">Note <span className="opacity-60">{sortIndicator('note')}</span></TableHead>}
                {columns.by && <TableHead onClick={() => cycleSort('by')} className="cursor-pointer select-none sticky top-0 z-10 bg-background/80 backdrop-blur">By <span className="opacity-60">{sortIndicator('by')}</span></TableHead>}
                {columns.updated && <TableHead onClick={() => cycleSort('updated')} className="cursor-pointer select-none sticky top-0 z-10 bg-background/80 backdrop-blur">Updated <span className="opacity-60">{sortIndicator('updated')}</span></TableHead>}
                {columns.actions && <TableHead className="sticky top-0 z-10 bg-background/80 backdrop-blur">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            {loading ? (
              <TableBody>
                {Array.from({ length: Math.min(10, Math.max(3, pageSize)) }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell colSpan={Object.values(columns).filter(Boolean).length}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            ) : data.logs.length === 0 ? (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={Object.values(columns).filter(Boolean).length} style={{ textAlign: 'center', color: '#6B7280', padding: 24 }}>
                    No records found. Adjust filters or create a new log.
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : (
              <TableBody>
                {(loading ? Array.from({ length: Math.min(8, Math.max(3, pageSize)) }) : sortedLogs).map((row, i) => (
                  <TableRow
                    key={row.id}
                    className={`group hover:bg-muted ${i % 2 === 1 ? 'bg-muted/30' : ''} ${row.type==='incident' ? 'bg-red-950/20' : ''}`}
                    onContextMenu={(e) => openContextMenu(e, row)}
                  >
                    {columns.time && (
                      <TableCell style={{ padding: rowDensity==='compact'?'6px 8px':'10px 12px' }} title={row?.at ? new Date(row.at).toLocaleString() : ''}>
                        {loading ? <div className="h-3 w-28 bg-muted animate-pulse rounded" /> : (row.at ? new Date(row.at).toLocaleString() : '')}
                      </TableCell>
                    )}
                    {columns.type && (
                      <TableCell style={{ padding: rowDensity==='compact'?'6px 8px':'10px 12px' }} title={row?.type}>
                        {loading ? <div className="h-3 w-12 bg-muted animate-pulse rounded" /> : <span className={typeBadgeClass(row.type)}>{row.type}</span>}
                      </TableCell>
                    )}
                    {columns.visitor && (
                      <TableCell
                        style={{ padding: rowDensity==='compact'?'8px 10px':'12px 14px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={`${row?.visitorName || '-'}\n${row?.visitorPhone || ''}${row?.visitorPhone && row?.visitorAddress ? ' • ' : ''}${row?.visitorAddress || ''}`}
                      >
                        {loading ? (
                          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-muted text-[10px] flex items-center justify-center text-muted-foreground">
                              {initials(row.visitorName)}
                            </div>
                            <span className="truncate" title={row?.visitorName || '-'}>{row.visitorName || '-'}</span>
                          </div>
                        )}
                      </TableCell>
                    )}
                    {columns.phone && (
                      <TableCell style={{ padding: rowDensity==='compact'?'6px 8px':'10px 12px' }} title={row?.visitorPhone || '-'}>
                        {loading ? (
                          <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                        ) : (
                          <div className={`flex items-center ${rowDensity==='compact' ? 'gap-1' : 'gap-2'}`}>
                            <span>{row.visitorPhone || '-'}</span>
                            {row.visitorPhone ? (
                              <button
                                className={`opacity-0 group-hover:opacity-100 inline-flex items-center justify-center ${rowDensity==='compact' ? 'h-5 w-5' : 'h-6 w-6'} rounded border hover:bg-muted`}
                                onClick={() => copyText(row.visitorPhone, 'Phone copied')}
                                title="Copy phone"
                                aria-label="Copy phone"
                              >
                                <Copy size={14} />
                              </button>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                    )}
                    {columns.address && (
                      <TableCell style={{ padding: rowDensity==='compact'?'6px 8px':'10px 12px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row?.visitorAddress || '-'}>
                        {loading ? <div className="h-3 w-40 bg-muted animate-pulse rounded" /> : (row.visitorAddress || '-')}
                      </TableCell>
                    )}
                    {columns.group && (
                      <TableCell style={{ padding: rowDensity==='compact'?'6px 8px':'10px 12px' }} title={row?.groupSize ?? '-'}>
                        {loading ? <div className="h-3 w-10 bg-muted animate-pulse rounded" /> : (row.groupSize ?? '-')}
                      </TableCell>
                    )}
                    {columns.plate && (
                      <TableCell style={{ padding: rowDensity==='compact'?'6px 8px':'10px 12px' }} title={row?.plate || '-'}>
                        {loading ? (
                          <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                        ) : (
                          <div className={`flex items-center ${rowDensity==='compact' ? 'gap-1' : 'gap-2'}`}>
                            <span>{row.plate || '-'}</span>
                            {row.plate ? (
                              <button
                                className={`opacity-0 group-hover:opacity-100 inline-flex items-center justify-center ${rowDensity==='compact' ? 'h-5 w-5' : 'h-6 w-6'} rounded border hover:bg-muted`}
                                onClick={() => copyText(row.plate, 'Plate copied')}
                                title="Copy plate"
                                aria-label="Copy plate"
                              >
                                <Copy size={14} />
                              </button>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                    )}
                    {columns.note && (
                      <TableCell style={{ padding: rowDensity==='compact'?'6px 8px':'10px 12px', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row?.note || ''}>
                        {loading ? <div className="h-3 w-64 bg-muted animate-pulse rounded" /> : (row.note || '')}
                      </TableCell>
                    )}
                    {columns.by && (
                      <TableCell style={{ padding: rowDensity==='compact'?'6px 8px':'10px 12px' }} title={row?.actor || '-'}>
                        {loading ? <div className="h-3 w-16 bg-muted animate-pulse rounded" /> : (row.actor || '-')}
                      </TableCell>
                    )}
                    {columns.updated && (
                      <TableCell style={{ padding: rowDensity==='compact'?'6px 8px':'10px 12px' }} title={row?.updatedAt ? new Date(row.updatedAt).toLocaleString() : '-'}>
                        {loading ? <div className="h-3 w-24 bg-muted animate-pulse rounded" /> : (row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '-')}
                      </TableCell>
                    )}
                    {columns.actions && (
                      <TableCell style={{ padding: rowDensity==='compact'?"6px 8px":"10px 12px" }}>
                        {loading ? (
                          <div className="flex gap-2">
                            <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                          </div>
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100" aria-label="Row actions">
                                <MoreHorizontal size={18} />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-2" align="end">
                              <div className="grid gap-1">
                                <Button variant="ghost" className="justify-start h-8" onClick={() => startEdit(row)}><Edit3 size={14} className="mr-2" /> Edit</Button>
                                <Button variant="destructive" className="justify-start h-8" onClick={() => { setDeleteId(row.id); setConfirmOpen(true); }} disabled={submitting}><Trash2 size={14} className="mr-2" /> Delete</Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!o) setEditOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Gate Log</DialogTitle>
            <DialogDescription>Update fields and save changes.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); if (isEditValid && editingId) saveEdit(editingId); }}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setEditOpen(false); } }}
            className="grid gap-3"
          >
            <div>
              <Label>Type</Label>
              <Select value={editValues.type} onValueChange={(v) => setEditValues((val) => ({ ...val, type: v }))}>
                <SelectTrigger className="w-full mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry</SelectItem>
                  <SelectItem value="exit">Exit</SelectItem>
                  <SelectItem value="incident">Incident</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visitor Name</Label>
              <Input value={editValues.visitorName} onChange={(e) => setEditValues((v) => ({ ...v, visitorName: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Visitor Phone</Label>
              <Input
                value={editValues.visitorPhone}
                placeholder="10 digits"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                onChange={(e) => {
                  const digits = (e.target.value || '').replace(/\D+/g, '').slice(0, 10);
                  setEditValues((v) => ({ ...v, visitorPhone: digits }));
                  setEditErr((er) => ({ ...er, phone: digits && digits.length !== 10 ? 'Must be 10 digits' : '' }));
                }}
                className="mt-1"
              />
              {editErr.phone ? <small style={{ color: '#DC2626' }}>{editErr.phone}</small> : null}
            </div>
            <div>
              <Label>Visitor Address</Label>
              <Input value={editValues.visitorAddress} onChange={(e) => setEditValues((v) => ({ ...v, visitorAddress: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Vehicle Plate</Label>
              <Input
                value={editValues.plate}
                onChange={(e) => {
                  const v = (e.target.value || '').toUpperCase();
                  setEditValues((val) => ({ ...val, plate: v }));
                  setEditErr((er) => ({ ...er, plate: v && !PLATE_REGEX.test(v) ? 'Invalid plate format' : '' }));
                }}
                className="mt-1"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <small style={{ color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                  Format: AA 00 AA 0000 (spaces or hyphens allowed)
                </small>
                {editErr.plate ? <small style={{ color: '#DC2626', whiteSpace: 'nowrap' }}>{editErr.plate}</small> : null}
              </div>
            </div>
            <div>
              <Label>Group Size</Label>
              <Input value={editValues.groupSize} onChange={(e) => setEditValues((v) => ({ ...v, groupSize: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Details</Label>
              <Input value={editValues.note} onChange={(e) => setEditValues((v) => ({ ...v, note: e.target.value }))} className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting || !isEditValid}>{submitting ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Row Context Menu */}
      {context.open ? (
        <div
          onClick={() => setContext({ open: false, x: 0, y: 0, row: null })}
          style={{ position: 'fixed', inset: 0, zIndex: 60 }}
        >
          <div
            style={{ position: 'absolute', top: context.y, left: context.x, background: 'var(--background, #111)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 160 }}>
              <Button variant="ghost" onClick={() => { copyText(context.row?.visitorPhone || ''); }} disabled={!context.row?.visitorPhone}>Copy phone</Button>
              <Button variant="ghost" onClick={() => { copyText(context.row?.plate || ''); }} disabled={!context.row?.plate}>Copy plate</Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmOpen} onOpenChange={(o) => { if (!o) setConfirmOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete record?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="destructive" onClick={async () => { setConfirmOpen(false); if (deleteId) { await deleteRow(deleteId); setDeleteId(null); } }} disabled={submitting}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
