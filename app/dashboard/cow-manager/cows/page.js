'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { RefreshCw, PlusCircle } from 'lucide-react';

export default function CowProfilesListPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cows, setCows] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const page = Number(params.get('page') || 1);
  const limit = Number(params.get('limit') || 10);
  const q = params.get('q') || '';
  const health = params.get('health') || 'all';

  const setParam = (key, value) => {
    const newParams = new URLSearchParams(params.toString());
    if (value === undefined || value === null || value === '' || value === 'all') newParams.delete(key);
    else newParams.set(key, String(value));
    router.push(`/dashboard/cow-manager/cows?${newParams.toString()}`);
  };

  const fetchCows = useCallback(async () => {
    try {
      setRefreshing(true);
      setError('');
      const url = new URL('/api/cow-manager/cows', window.location.origin);
      url.searchParams.set('page', String(page));
      url.searchParams.set('limit', String(limit));
      if (q) url.searchParams.set('search', q);
      if (health !== 'all') url.searchParams.set('status', health === 'healthy' ? 'normal' : 'sick');
      const res = await fetch(url.toString(), { cache: 'no-store', credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load cows');
      setCows(data.cows || data.items || []);
      setTotal(data.pagination?.total || (data.cows?.length || 0));
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [page, limit, q, health]);

  useEffect(() => { fetchCows(); }, [fetchCows]);

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cows</h1>
            <p className="text-muted-foreground">Manage cow profiles</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchCows} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/dashboard/cow-manager/cows/add">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Cow
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Search by name, tag, breed" value={q} onChange={(e)=> setParam('q', e.target.value)} />
              <Select value={health} onValueChange={(v)=> setParam('health', v)}>
                <SelectTrigger><SelectValue placeholder="Health" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Health</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(limit)} onValueChange={(v)=> setParam('limit', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cows.length === 0 && (
                <div className="text-muted-foreground text-center py-8">No cows found</div>
              )}
              {cows.map(cow => (
                <div key={cow._id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <div className="font-medium">{cow.name || cow.tagId || 'Unnamed Cow'}</div>
                    <div className="text-xs text-muted-foreground">{cow.breed || 'Unknown'}{cow.health ? ` • ${cow.health}` : ''}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm"><Link href={`/dashboard/cow-manager/cows/${cow._id}`}>Edit</Link></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Pagination
                page={page}
                pageSize={limit}
                totalItems={total}
                onPageChange={(p)=> setParam('page', p)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


