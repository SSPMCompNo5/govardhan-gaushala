'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  RefreshCw, 
  PlusCircle, 
  Search,
  Calendar,
  Package,
  Users,
  Clock,
  FileText,
  Filter
} from 'lucide-react';
import Link from 'next/link';

export default function FeedingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedings, setFeedings] = useState([]);
  const [filteredFeedings, setFilteredFeedings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cowGroupFilter, setCowGroupFilter] = useState('all');
  const [foodTypeFilter, setFoodTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Fetch feeding logs
  const fetchFeedings = useCallback(async (page = 1) => {
    try {
      setRefreshing(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(cowGroupFilter !== 'all' && { cowGroup: cowGroupFilter }),
        ...(foodTypeFilter !== 'all' && { foodType: foodTypeFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/food/feeding-logs?${params}`);
      const data = await response.json();

      if (response.ok) {
        setFeedings(data.logs || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
      } else {
        console.error('Error fetching feedings:', data.error);
      }
    } catch (error) {
      console.error('Error fetching feedings:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [pagination.limit, cowGroupFilter, foodTypeFilter, searchTerm]);

  // Load data on mount
  useEffect(() => {
    fetchFeedings();
  }, [fetchFeedings]);

  // Filter feedings based on search and filters
  useEffect(() => {
    let filtered = [...feedings];

    if (searchTerm) {
      filtered = filtered.filter(feeding =>
        feeding.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feeding.recordedBy?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredFeedings(filtered);
  }, [feedings, searchTerm]);

  const handleRefresh = () => {
    fetchFeedings(pagination.page);
  };

  const handlePageChange = (newPage) => {
    fetchFeedings(newPage);
  };

  const getStatusBadge = (status) => {
    const variants = {
      'completed': 'default',
      'pending': 'secondary',
      'cancelled': 'destructive'
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status || 'completed'}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full p-6">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Feeding Logs</h1>
            <p className="text-muted-foreground">
              Track and manage all feeding activities
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/dashboard/food-manager/feedings/record">
                <PlusCircle className="h-4 w-4 mr-2" />
                Record Feeding
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search notes or recorded by..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cowGroup">Cow Group</Label>
                <Select value={cowGroupFilter} onValueChange={setCowGroupFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    <SelectItem value="calves">Calves</SelectItem>
                    <SelectItem value="lactating">Lactating</SelectItem>
                    <SelectItem value="dry">Dry</SelectItem>
                    <SelectItem value="bulls">Bulls</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="foodType">Food Type</Label>
                <Select value={foodTypeFilter} onValueChange={setFoodTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="hay">Hay</SelectItem>
                    <SelectItem value="grass">Grass</SelectItem>
                    <SelectItem value="fodder">Fodder</SelectItem>
                    <SelectItem value="silage">Silage</SelectItem>
                    <SelectItem value="concentrate">Concentrate</SelectItem>
                    <SelectItem value="supplement">Supplement</SelectItem>
                    <SelectItem value="minerals">Minerals</SelectItem>
                    <SelectItem value="vitamins">Vitamins</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFilter">Date Range</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedings List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Feeding Logs ({filteredFeedings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredFeedings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No feeding logs found</h3>
                <p className="text-muted-foreground mb-4">
                  Start by recording your first feeding activity.
                </p>
                <Button asChild>
                  <Link href="/dashboard/food-manager/feedings/record">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Record Feeding
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFeedings.map((feeding) => (
                  <div
                    key={feeding._id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{feeding.foodType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{feeding.cowGroup}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{feeding.quantity} {feeding.unit}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            {formatDate(feeding.feedingTime)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            by {feeding.recordedBy}
                          </div>
                        </div>
                        {getStatusBadge(feeding.status)}
                      </div>
                    </div>
                    {feeding.notes && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <FileText className="h-3 w-3 inline mr-1" />
                        {feeding.notes}
                      </div>
                    )}
                    {feeding.wastage && feeding.wastage > 0 && (
                      <div className="mt-2 text-sm text-orange-600">
                        Wastage: {feeding.wastage} {feeding.unit}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
