'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { format, isToday } from 'date-fns';
import { Search as SearchIcon, Filter as FilterIcon, Download, ChevronDown, ChevronUp, Copy, Trash2, Edit3, HelpCircle, Columns3, MoreHorizontal } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
// Simple toast notification system
const toastNotification = {
  success: (msg) => {
    console.log('Success:', msg);
    // Success will be handled by toast system
  },
  error: (msg) => {
    console.error('Error:', msg);
    // Error will be handled by toast system
  }
};

// Utility Functions
function formatYmd(d) {
  if (!d) return '';
  const date = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function typeBadgeClass(type) {
  const base = 'px-2 py-0.5 rounded-full text-xs font-medium';
  if (type === 'entry') return base + ' bg-emerald-600/15 text-emerald-500 border border-emerald-600/30';
  if (type === 'exit') return base + ' bg-sky-600/15 text-sky-500 border border-sky-600/30';
  if (type === 'incident') return base + ' bg-rose-600/15 text-rose-500 border border-rose-600/30';
  return base + ' bg-muted text-foreground/80';
}

function downloadCSV(filename, rows) {
  const header = [
    'Time', 'Type', 'Visitor Name', 'Visitor Phone', 'Visitor Address', 
    'Group Size', 'Plate', 'Note', 'By', 'Updated', 'ID'
  ];
  
  const lines = [header.join(',')].concat(
    rows.map(r => [
      r.at ? new Date(r.at).toISOString() : "",
      r.type || "",
      r.visitorName || "",
      r.visitorPhone || "",
      r.visitorAddress || "",
      r.groupSize ?? "",
      r.plate || "",
      (r.note || "").replace(/\n/g, ' ').replace(/"/g, '""'),
      r.actor || "",
      r.updatedAt ? new Date(r.updatedAt).toISOString() : "",
      r.id || ""
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  );
  
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function downloadCSVVisible(filename, rows, columns) {
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
  ].filter(c => columns[c.key]);
  
  const header = colDefs.map(c => c.label);
  const csvLines = [header.join(',')].concat(
    rows.map(r => colDefs.map(c => `"${String(c.get(r)).replace(/"/g, '""')}"`).join(','))
  );
  
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
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

export default function GateActivityPage() {
  // State declarations
  const [error, setError] = useState('');
  const [regexErr, setRegexErr] = useState({ phone: '', plate: '' });
  
  // Filters and pagination
  const [filters, setFilters] = useState({ 
    q: '', type: '', actor: '', name: '', phone: '', plate: '', 
    address: '', note: '', since: '', until: '' 
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // View settings
  const [autoApply, setAutoApply] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('watchmanAutoApply') === '1';
    }
    return true;
  });
  const [rowDensity, setRowDensity] = useState('comfortable');
  const [sortBy, setSortBy] = useState('time');
  const [sortDir, setSortDir] = useState('desc');
  const [savedViews, setSavedViews] = useState([]);
  const [selectedView, setSelectedView] = useState('');
  const [columns, setColumns] = useState({
    time: true,
    type: true,
    visitor: true,
    phone: false,
    address: false,
    group: true,
    plate: true,
    note: false,
    by: true,
    updated: false,
  });
  
  // UI State
  const [toast, setToast] = useState({ text: '', type: 'info', ts: 0 });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scrolledTable, setScrolledTable] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [sinceOpen, setSinceOpen] = useState(false);
  const [untilOpen, setUntilOpen] = useState(false);
  
  // Data
  const [data, setData] = useState({ logs: [], count: 0 });
  
  // Edit/Dialog State
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ 
    type: 'entry', 
    visitorName: '', 
    visitorPhone: '', 
    visitorAddress: '', 
    plate: '', 
    groupSize: '', 
    note: '' 
  });
  const [editErr, setEditErr] = useState({ phone: '', plate: '' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [context, setContext] = useState({ open: false, x: 0, y: 0, row: null });
  
  // Missing state variables
  const [selectedLog, setSelectedLog] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Refs
  const tableScrollRef = useRef(null);
  const qRef = useRef(null);
  const phoneRef = useRef(null);
  const plateRef = useRef(null);
  const sinceBtnRef = useRef(null);
  const untilBtnRef = useRef(null);
  
  // Derived state
  const todayYmd = useMemo(() => formatYmd(new Date()), []);
  const sinceDate = useMemo(() => (filters.since ? new Date(`${filters.since}T00:00:00`) : undefined), [filters.since]);
  const untilDate = useMemo(() => (filters.until ? new Date(`${filters.until}T23:59:59`) : undefined), [filters.until]);
  
  // Sort logs based on current sortBy and sortDir
  const sortedLogs = useMemo(() => {
    if (!data.logs) return [];
    return [...data.logs].sort((a, b) => {
      const aVal = getCellValue(a, sortBy);
      const bVal = getCellValue(b, sortBy);
      return sortDir === 'asc' 
        ? aVal > bVal ? 1 : -1 
        : aVal < bVal ? 1 : -1;
    });
  }, [data.logs, sortBy, sortDir]);
  
  // Toggle sort direction when clicking on column headers
  const cycleSort = (column) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };
  
  // Sort indicator for column headers
  const sortIndicator = (column) => {
    if (sortBy !== column) return '';
    return sortDir === 'asc' ? '↑' : '↓';
  };
  
  // Helper to update filter fields
  
  // Set both date filters at once to avoid validation issues
  const setDateRange = (since, until) => {
    const newFilters = { ...filters, since, until };
    
    // Validate date range if both dates are provided
    if (since && until) {
      const sinceDate = new Date(since);
      const untilDate = new Date(until);
      
      if (sinceDate > untilDate) {
        setToast({ 
          text: 'Invalid date range: "Since" date cannot be after "Until" date', 
          type: 'error', 
          ts: Date.now() 
        });
        return; // Don't update filters if date range is invalid
      }
    }
    
    setFilters(newFilters);
    
    if (autoApply) {
      loadData();
    }
  };
  
  // Date presets
  const presetThisWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    setDateRange(formatYmd(monday), formatYmd(sunday));
  };
  
  const presetLastWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day - 6; // Previous Monday
    const lastMonday = new Date(now.setDate(diff));
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastSunday.getDate() + 6);
    setDateRange(formatYmd(lastMonday), formatYmd(lastSunday));
  };
  
  const presetThisQuarter = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const startMonth = Math.floor(currentMonth / 3) * 3;
    const startDate = new Date(now.getFullYear(), startMonth, 1);
    const endDate = new Date(now.getFullYear(), startMonth + 3, 0);
    setDateRange(formatYmd(startDate), formatYmd(endDate));
  };
  
  const presetLastQuarter = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const startMonth = Math.floor(currentMonth / 3) * 3 - 3;
    const startDate = new Date(now.getFullYear(), startMonth, 1);
    const endDate = new Date(now.getFullYear(), startMonth + 3, 0);
    setDateRange(formatYmd(startDate), formatYmd(endDate));
  };
  
  const presetRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setDateRange(formatYmd(start), formatYmd(end));
  };
  
  // Copy text to clipboard with feedback
  const copyText = (text, message) => {
    navigator.clipboard.writeText(text);
    setToast({ text: message || 'Copied!', type: 'success', ts: Date.now() });
  };
  
  // Get initials from name
  const initials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Context menu
  const openContextMenu = (e, row) => {
    e.preventDefault();
    setContext({
      open: true,
      x: e.clientX,
      y: e.clientY,
      row
    });
  };
  
  // Start editing a log
  const startEdit = (row) => {
    setEditingId(row.id);
    setEditValues({
      type: row.type || 'entry',
      visitorName: row.visitorName || '',
      visitorPhone: row.visitorPhone || '',
      visitorAddress: row.visitorAddress || '',
      plate: row.plate || '',
      groupSize: row.groupSize || '',
      note: row.note || ''
    });
    setEditOpen(true);
  };
  
  // Load data from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Add filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      
      // Add pagination and sorting
      params.set('page', page);
      params.set('pageSize', pageSize);
      params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);
      
      const res = await fetch(`/api/gate-logs?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data?.error || 'Failed to load data');
      
      setData({
        logs: data.logs || [],
        count: data.count || 0,
        hasMore: (data.logs || []).length >= pageSize
      });
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, sortBy, sortDir]);
  
  // Load data on mount and when dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Load saved views from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('gateLogsSavedViews');
        if (saved) {
          setSavedViews(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Error loading saved views:', e);
      }
    }
  }, []);
  
  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast.text) {
      const timer = setTimeout(() => {
        setToast({ text: '', type: 'info', ts: 0 });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.text]);
  
  // Save current view
  const saveCurrentView = () => {
    const name = prompt('Enter a name for this view:');
    if (!name) return;
    
    const view = {
      name,
      filters: { ...filters },
      columns: { ...columns },
      sortBy,
      sortDir,
      rowDensity,
      timestamp: new Date().toISOString()
    };
    
    const updatedViews = [...savedViews.filter(v => v.name !== name), view];
    setSavedViews(updatedViews);
    
    try {
      localStorage.setItem('gateLogsSavedViews', JSON.stringify(updatedViews));
      setToast({ text: 'View saved', type: 'success', ts: Date.now() });
    } catch (e) {
      console.error('Error saving view:', e);
      setToast({ text: 'Failed to save view', type: 'error', ts: Date.now() });
    }
  };
  
  // Apply saved view
  const applyViewByName = (name) => {
    const view = savedViews.find(v => v.name === name);
    if (!view) return;
    
    setFilters(view.filters);
    setColumns(view.columns);
    setSortBy(view.sortBy);
    setSortDir(view.sortDir);
    setRowDensity(view.rowDensity);
    setPage(1);
  };
  
  // Delete saved view
  const deleteSelectedView = () => {
    if (!selectedView || !confirm(`Delete view "${selectedView}"?`)) return;
    
    const updatedViews = savedViews.filter(v => v.name !== selectedView);
    setSavedViews(updatedViews);
    setSelectedView('');
    
    try {
      localStorage.setItem('gateLogsSavedViews', JSON.stringify(updatedViews));
      setToast({ text: 'View deleted', type: 'success', ts: Date.now() });
    } catch (e) {
      console.error('Error deleting view:', e);
      setToast({ text: 'Failed to delete view', type: 'error', ts: Date.now() });
    }
  };
  
  // Toggle auto-apply
  const toggleAutoApply = () => {
    const newValue = !autoApply;
    setAutoApply(newValue);
    try {
      localStorage.setItem('watchmanAutoApply', newValue ? '1' : '0');
    } catch (e) {
      console.error('Error saving auto-apply setting:', e);
    }
    
    if (newValue) {
      // If enabling auto-apply, trigger a load
      setPage(1);
      loadData();
    }
  };
  
  // Handle form submission for editing
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setEditErr({ phone: '', plate: '' });
    
    try {
      // Validate phone (if provided)
      const phoneDigits = (editValues.visitorPhone || '').replace(/\D+/g, '');
      if (phoneDigits && phoneDigits.length !== 10) {
        setEditErr(prev => ({ ...prev, phone: 'Must be 10 digits' }));
        return;
      }
      
      // Validate plate (if provided)
      const plateRegex = /^[A-Z]{2}[ -]?[0-9]{2}[ -]?[A-Z]{1,2}[ -]?[0-9]{4}$/;
      const plateVal = (editValues.plate || '').toUpperCase();
      if (plateVal && !plateRegex.test(plateVal)) {
        setEditErr(prev => ({ ...prev, plate: 'Invalid plate format' }));
        return;
      }
      
      // Prepare payload
      const payload = {
        ...editValues,
        visitorPhone: phoneDigits || '',
        plate: plateVal
      };
      
      // Send update
      const res = await fetch(`/api/gate-logs/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update');
      
      // Refresh data and close edit dialog
      await loadData();
      setEditOpen(false);
      setToast({ text: 'Log updated', type: 'success', ts: Date.now() });
      
    } catch (error) {
      console.error('Error updating log:', error);
      setError(error.message || 'Failed to update log');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle delete confirmation
  const handleDelete = async () => {
    const idToDelete = deleteId || selectedLog?.id;
    if (!idToDelete) return;
    
    setSubmitting(true);
    
    try {
      const res = await fetch(`/api/gate-logs/${idToDelete}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to delete');
      }
      
      // Update UI immediately for better UX
      setData(prev => ({
        ...prev,
        logs: prev.logs.filter(log => log.id !== idToDelete),
        count: Math.max(0, prev.count - 1)
      }));
      
      // Close dialogs and reset states
      setConfirmOpen(false);
      setDeleteDialogOpen(false);
      setDeleteId(null);
      setSelectedLog(null);
      
      // Show success message
      setToast({ text: 'Log deleted successfully', type: 'success', ts: Date.now() });
      setToast({ text: 'Log deleted', type: 'success', ts: Date.now() });
      
    } catch (error) {
      console.error('Error deleting log:', error);
      setError(error.message || 'Failed to delete log');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Calculate stats for the current view
  const stats = useMemo(() => {
    const t = { entry: 0, exit: 0, incident: 0 };
    const freq = new Map();
    
    (data.logs || []).forEach((r) => {
      try {
        const d = r.at ? new Date(r.at) : null;
        const isToday = d && formatYmd(d) === todayYmd;
        if (isToday && r.type && t[r.type] !== undefined) t[r.type] += 1;
        
        // Count by date
        if (d) {
          const ymd = formatYmd(d);
          freq.set(ymd, (freq.get(ymd) || 0) + 1);
        }
      } catch (e) {
        console.warn('Error processing log entry:', e);
      }
    });
    
    // Get top 5 most frequent dates
    const topDates = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    return { today: t, topDates };
  }, [data.logs, todayYmd]);

  // Load data when filters change

  const setFilterField = (field, value) => {
    // Convert "all" to empty string for API compatibility
    const apiValue = value === 'all' ? '' : value;
    const newFilters = { ...filters, [field]: apiValue };
    
    // Validate date range if both since and until are set
    if ((field === 'since' || field === 'until') && newFilters.since && newFilters.until) {
      const sinceDate = new Date(newFilters.since);
      const untilDate = new Date(newFilters.until);
      
      if (sinceDate > untilDate) {
        setToast({ 
          text: 'Invalid date range: "Since" date cannot be after "Until" date', 
          type: 'error', 
          ts: Date.now() 
        });
        return; // Don't update filters if date range is invalid
      }
    }
    
    if (field === 'pageSize' || autoApply) {
      newFilters.page = 1;
    }
    setFilters(newFilters);
    
    if (autoApply) {
      loadData();
    }
  };

  const handleSort = (column) => {
    setFilters(prev => ({
      ...prev,
      sortBy: column,
      sortDir: prev.sortBy === column ? (prev.sortDir === 'asc' ? 'desc' : 'asc') : 'desc',
      page: 1
    }));
  };

  const SortIcon = ({ column }) => {
    if (filters.sortBy !== column) return null;
    return filters.sortDir === 'asc' 
      ? <ChevronUp className="ml-1 h-4 w-4 inline" /> 
      : <ChevronDown className="ml-1 h-4 w-4 inline" />;
  };


  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Recent Gate Activity</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `Showing ${data.logs.length} of ${data.count} logs`}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <HelpCircle className="h-4 w-4 mr-2" />
            Help
          </Button>
          <Button variant="outline" size="sm">
            <Columns3 className="h-4 w-4 mr-2" />
            Columns
          </Button>
          <Select value={rowDensity} onValueChange={setRowDensity}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="dense">Dense</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {Object.values(filters).filter(Boolean).length} filters
          </span>
          <Button variant="outline" size="sm" onClick={() => copyText(window.location.href, 'Link copied!')}>
            <Copy className="h-4 w-4 mr-2" />
            Copy link
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadCSV('gate-logs-all.csv', data.logs)}>
            <Download className="h-4 w-4 mr-2" />
            Export (all)
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadCSVVisible('gate-logs-visible.csv', data.logs, columns)}>
            <Download className="h-4 w-4 mr-2" />
            Export (visible)
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={qRef}
              placeholder="Search by name, phone, plate, or note"
              value={filters.q}
              onChange={(e) => setFilterField('q', e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Saved View Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Label className="text-sm font-medium">Saved view</Label>
              <Select value={selectedView} onValueChange={applyViewByName}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Pick saved view" />
                </SelectTrigger>
                <SelectContent>
                  {savedViews.map((view) => (
                    <SelectItem key={view.name} value={view.name}>
                      {view.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={saveCurrentView}>
                Save current
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={deleteSelectedView}
                disabled={!selectedView}
                className="text-red-600 hover:text-red-700"
              >
                Delete view
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="auto-apply-1" 
                  checked={autoApply} 
                  onCheckedChange={toggleAutoApply}
                />
                <Label htmlFor="auto-apply-1" className="text-sm">Auto-apply: {autoApply ? 'On' : 'Off'}</Label>
              </div>
              <Button onClick={loadData} disabled={autoApply}>
                Apply
              </Button>
              <Button variant="outline" onClick={() => setFilters({ q: '', type: '', actor: '', name: '', phone: '', plate: '', address: '', note: '', since: '', until: '' })}>
                Clear all
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Criteria Section */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="space-y-2">
               <Label>Type</Label>
               <Select value={filters.type || 'all'} onValueChange={(value) => setFilterField('type', value)}>
                 <SelectTrigger>
                   <SelectValue placeholder="All types" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All types</SelectItem>
                   <SelectItem value="entry">Entry</SelectItem>
                   <SelectItem value="exit">Exit</SelectItem>
                   <SelectItem value="incident">Incident</SelectItem>
                 </SelectContent>
               </Select>
             </div>
            
            <div className="space-y-2">
              <Label>Visitor Name</Label>
              <Input
                placeholder="e.g. Ramu"
                value={filters.name}
                onChange={(e) => setFilterField('name', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Visitor Phone</Label>
              <Input
                placeholder="e.g. ^98.*$"
                value={filters.phone}
                onChange={(e) => setFilterField('phone', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Regex supported</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Range Filter Section */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Since</Label>
                <Popover open={sinceOpen} onOpenChange={setSinceOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      ref={sinceBtnRef}
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {filters.since ? format(new Date(filters.since), 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                                         <Calendar
                       mode="single"
                       selected={sinceDate}
                       onSelect={(date) => {
                         setDateRange(date ? formatYmd(date) : '', filters.until);
                         setSinceOpen(false);
                       }}
                       initialFocus
                     />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>Until</Label>
                <Popover open={untilOpen} onOpenChange={setUntilOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      ref={untilBtnRef}
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {filters.until ? format(new Date(filters.until), 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                                         <Calendar
                       mode="single"
                       selected={untilDate}
                       onSelect={(date) => {
                         setDateRange(filters.since, date ? formatYmd(date) : '');
                         setUntilOpen(false);
                       }}
                       initialFocus
                     />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
                             <Button variant="outline" size="sm" onClick={() => setDateRange(todayYmd, todayYmd)}>
                 Today
               </Button>
              <Button variant="outline" size="sm" onClick={presetThisWeek}>
                This week
              </Button>
              <Button variant="outline" size="sm" onClick={presetLastWeek}>
                Last week
              </Button>
                             <Button variant="outline" size="sm" onClick={() => {
                 const now = new Date();
                 const start = new Date(now.getFullYear(), now.getMonth(), 1);
                 const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                 setDateRange(formatYmd(start), formatYmd(end));
               }}>
                 This month
               </Button>
                             <Button variant="outline" size="sm" onClick={() => {
                 const now = new Date();
                 const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                 const end = new Date(now.getFullYear(), now.getMonth(), 0);
                 setDateRange(formatYmd(start), formatYmd(end));
               }}>
                 Last month
               </Button>
              <Button variant="outline" size="sm" onClick={presetThisQuarter}>
                This quarter
              </Button>
              <Button variant="outline" size="sm" onClick={presetLastQuarter}>
                Last quarter
              </Button>
              <Button variant="outline" size="sm" onClick={() => presetRange(7)}>
                Last 7 days
              </Button>
              <Button variant="outline" size="sm" onClick={() => presetRange(30)}>
                Last 30 days
              </Button>
                             <Button variant="outline" size="sm" onClick={() => setDateRange('', '')}>
                 Clear
               </Button>
              <Button onClick={() => {
                setFilters({ q: '', type: '', actor: '', name: '', phone: '', plate: '', address: '', note: '', since: '', until: '' });
                setPage(1);
              }}>
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Advanced filters</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setFilters({ q: '', type: '', actor: '', name: '', phone: '', plate: '', address: '', note: '', since: '', until: '' })}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="auto-apply-2" 
                  checked={autoApply} 
                  onCheckedChange={toggleAutoApply}
                />
                <Label htmlFor="auto-apply-2" className="text-sm">Auto-apply: {autoApply ? 'On' : 'Off'}</Label>
              </div>
              <Button onClick={loadData} disabled={autoApply}>
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagination and Row Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm">Page {page}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(page + 1)}
            disabled={!data.hasMore}
          >
            Next
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Label className="text-sm">Page size</Label>
          <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10/page</SelectItem>
              <SelectItem value="20">20/page</SelectItem>
              <SelectItem value="50">50/page</SelectItem>
              <SelectItem value="100">100/page</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{data.logs.length} rows</span>
        </div>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.time && (
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('time')}
                    >
                      Time {<SortIcon column="time" />}
                    </TableHead>
                  )}
                  {columns.type && (
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('type')}
                    >
                      Type {<SortIcon column="type" />}
                    </TableHead>
                  )}
                  {columns.visitor && <TableHead>Visitor</TableHead>}
                  {columns.phone && <TableHead>Phone</TableHead>}
                  {columns.plate && <TableHead>Plate</TableHead>}
                  {columns.group && <TableHead>Group</TableHead>}
                  {columns.by && <TableHead>By</TableHead>}
                  {columns.note && <TableHead>Note</TableHead>}
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={Object.values(columns).filter(Boolean).length + 1} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : data.logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={Object.values(columns).filter(Boolean).length + 1} className="text-center py-8">
                      No logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.logs.map((log) => (
                    <TableRow key={log.id}>
                      {columns.time && (
                        <TableCell>
                          {log.at ? new Date(log.at).toLocaleString() : 'N/A'}
                        </TableCell>
                      )}
                      {columns.type && (
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeBadgeClass(log.type)}`}>
                            {log.type || 'Unknown'}
                          </span>
                        </TableCell>
                      )}
                      {columns.visitor && (
                        <TableCell>{log.visitorName || 'Unknown'}</TableCell>
                      )}
                      {columns.phone && (
                        <TableCell>{log.visitorPhone || 'N/A'}</TableCell>
                      )}
                      {columns.plate && (
                        <TableCell>{log.plate || 'N/A'}</TableCell>
                      )}
                      {columns.group && (
                        <TableCell>{log.groupSize || '1'}</TableCell>
                      )}
                      {columns.by && (
                        <TableCell>{log.actor || 'System'}</TableCell>
                      )}
                      {columns.note && (
                        <TableCell className="max-w-[200px] truncate">
                          {log.note || '-'}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => startEdit(log)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                            onClick={() => {
                              setSelectedLog(log);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Log</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this log? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Log Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Log Entry</DialogTitle>
            <DialogDescription>
              Update the details for this log entry.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type">Type</Label>
                <Select value={editValues.type} onValueChange={(value) => setEditValues(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry</SelectItem>
                    <SelectItem value="exit">Exit</SelectItem>
                    <SelectItem value="incident">Incident</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-groupSize">Group Size</Label>
                <Input
                  id="edit-groupSize"
                  type="number"
                  min="1"
                  value={editValues.groupSize}
                  onChange={(e) => setEditValues(prev => ({ ...prev, groupSize: e.target.value }))}
                  placeholder="1"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-visitorName">Visitor Name</Label>
              <Input
                id="edit-visitorName"
                value={editValues.visitorName}
                onChange={(e) => setEditValues(prev => ({ ...prev, visitorName: e.target.value }))}
                placeholder="Visitor name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-visitorPhone">Phone Number</Label>
              <Input
                id="edit-visitorPhone"
                value={editValues.visitorPhone}
                onChange={(e) => setEditValues(prev => ({ ...prev, visitorPhone: e.target.value }))}
                placeholder="10-digit phone number"
              />
              {editErr.phone && (
                <p className="text-sm text-red-500">{editErr.phone}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-visitorAddress">Address</Label>
              <Input
                id="edit-visitorAddress"
                value={editValues.visitorAddress}
                onChange={(e) => setEditValues(prev => ({ ...prev, visitorAddress: e.target.value }))}
                placeholder="Visitor address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-plate">License Plate</Label>
              <Input
                id="edit-plate"
                value={editValues.plate}
                onChange={(e) => setEditValues(prev => ({ ...prev, plate: e.target.value }))}
                placeholder="e.g., KA-01-AB-1234"
              />
              {editErr.plate && (
                <p className="text-sm text-red-500">{editErr.plate}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-note">Note</Label>
              <Input
                id="edit-note"
                value={editValues.note}
                onChange={(e) => setEditValues(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Additional notes"
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Log'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Toast Notification */}
      {toast.text && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 
          toast.type === 'error' ? 'bg-red-500 text-white' : 
          'bg-blue-500 text-white'
        }`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
