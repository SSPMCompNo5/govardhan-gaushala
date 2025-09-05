'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Download, Upload } from 'lucide-react';

export default function CowImportsPage() {
  const [rows, setRows] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [log, setLog] = useState([]);

  const templateCSV = useMemo(() => {
    const header = [
      'name','tagId','breed','dob','health','pregnant','group','notes'
    ];
    const sample = [
      'Ganga','TAG-001','Gir','2020-05-01','healthy','false','Herd A','—'
    ];
    return `${header.join(',')}\n${sample.join(',')}`;
  }, []);

  const downloadTemplate = () => {
    const blob = new Blob([templateCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cow-import-template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseCSV = async (file) => {
    setParsing(true);
    setRows([]);
    setLog([]);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return setRows([]);
      const headers = lines[0].split(',').map(h => h.trim());
      const out = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const rec = {};
        headers.forEach((h, idx) => { rec[h] = (cols[idx] || '').trim(); });
        if (!rec.name && !rec.tagId) continue;
        rec.pregnant = String(rec.pregnant || '').toLowerCase() === 'true';
        out.push(rec);
      }
      setRows(out);
    } finally {
      setParsing(false);
    }
  };

  const importRows = useCallback(async () => {
    if (!rows.length) return;
    setImporting(true);
    const results = [];
    for (const rec of rows) {
      try {
        const res = await fetch('/api/goshala-manager/cows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(rec)
        });
        const data = await res.json();
        results.push({ ok: res.ok, id: data?.id || data?._id || null, name: rec.name || rec.tagId, error: data?.error });
      } catch (e) {
        results.push({ ok: false, id: null, name: rec.name || rec.tagId, error: e?.message || 'Failed' });
      }
    }
    setLog(results);
    setImporting(false);
  }, [rows]);

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Cow Imports</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Input type="file" accept=".csv,text/csv" onChange={(e)=> e.target.files && e.target.files[0] && parseCSV(e.target.files[0])} />
              <Button onClick={importRows} disabled={!rows.length || parsing || importing}>
                <Upload className="h-4 w-4 mr-2" />
                Import {rows.length ? `(${rows.length})` : ''}
              </Button>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              Columns: name, tagId, breed, dob (YYYY-MM-DD), health, pregnant (true/false), group, notes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Log</CardTitle>
          </CardHeader>
          <CardContent>
            {parsing && <div className="text-muted-foreground">Parsing...</div>}
            {importing && <div className="text-muted-foreground">Importing...</div>}
            <div className="space-y-2">
              {log.map((r, idx) => (
                <div key={idx} className={`p-2 border rounded ${r.ok ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                  {r.ok ? 'OK' : 'ERR'}: {r.name} {r.id ? `→ ${r.id}` : ''} {r.error ? `(${r.error})` : ''}
                </div>
              ))}
              {!log.length && <div className="text-muted-foreground">No imports yet</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


