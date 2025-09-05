'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CowQRPage() {
  const [cowId, setCowId] = useState('');
  const qrUrl = useMemo(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return `${base}/dashboard/cow-manager/cows/${encodeURIComponent(cowId || '')}`;
  }, [cowId]);

  const printQR = () => {
    window.print();
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Cow QR Codes</h1>

        <Card>
          <CardHeader>
            <CardTitle>Generate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Enter Cow ID / Tag" value={cowId} onChange={(e)=> setCowId(e.target.value)} />
              <Button onClick={printQR} disabled={!cowId}>Print</Button>
              <a className="text-sm text-muted-foreground break-all" href={qrUrl} target="_blank" rel="noreferrer">{qrUrl}</a>
            </div>
            <div className="mt-6 p-6 border rounded-md inline-block">
              {/* Simple text QR placeholder; integrate a QR component if available */}
              <div className="text-xs">QR for:</div>
              <div className="font-mono text-sm max-w-xs break-all">{qrUrl}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


