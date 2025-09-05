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
  Clock,
  Calendar,
  Package,
  Users,
  Filter,
  Edit,
  Trash2,
  Play,
  Pause
} from 'lucide-react';
import Link from 'next/link';

export default function SchedulePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cowGroupFilter, setCowGroupFilter] = useState('all');
  const [foodTypeFilter, setFoodTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Fetch schedules
  const fetchSchedules = useCallback(async (page = 1) => {
    try {
      setRefreshing(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(cowGroupFilter !== 'all' && { cowGroup: cowGroupFilter }),
        ...(foodTypeFilter !== 'all' && { foodType: foodTypeFilter }),
        ...(statusFilter !== 'all' && { isActive: statusFilter })
      });

      const response = await fetch(`/api/food/schedule?${params}`);
      const data = await response.json();

      if (response.ok) {
        setSchedules(data.schedules || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
      } else {
        console.error('Error fetching schedules:', data.error);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [pagination.limit, cowGroupFilter, foodTypeFilter, statusFilter]);

  // Load data on mount
  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Filter schedules based on search
  useEffect(() => {
    let filtered = [...schedules];

    if (searchTerm) {
      filtered = filtered.filter(schedule =>
        schedule.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.cowGroup?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.foodType?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSchedules(filtered);
  }, [schedules, searchTerm]);

  const handleRefresh = () => {
    fetchSchedules(pagination.page);
  };

  const handlePageChange = (newPage) => {
    fetchSchedules(newPage);
  };

  const getStatusBadge = (isActive) => {
    return (
      <Badge variant={isActive ? 'default' : 'secondary'}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  const getDaysOfWeek = (days) => {
    if (!days || days.length === 0) return 'No days set';
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const selectedDays = days.map(day => dayNames[day]).join(', ');
    return selectedDays;
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return timeString;
  };

  const getNextOccurrence = (daysOfWeek, time) => {
    if (!daysOfWeek || daysOfWeek.length === 0 || !time) return 'N/A';
    
    const today = new Date();
    const currentDay = today.getDay();
    const [hours, minutes] = time.split(':').map(Number);
    
    // Find next occurrence
    for (let i = 0; i < 7; i++) {
      const checkDay = (currentDay + i) % 7;
      if (daysOfWeek.includes(checkDay)) {
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + i);
        nextDate.setHours(hours, minutes, 0, 0);
        
        if (i === 0 && nextDate <= today) {
          continue; // Skip if time has passed today
        }
        
        return nextDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
    
    return 'N/A';
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
            <h1 className="text-3xl font-bold">Feeding Schedule</h1>
            <p className="text-muted-foreground">
              Manage automated feeding schedules for different cow groups
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
              <Link href="/dashboard/food-manager/schedule/add">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Schedule
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
                    placeholder="Search schedules..."
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
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedules List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Feeding Schedules ({filteredSchedules.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSchedules.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No schedules found</h3>
                <p className="text-muted-foreground mb-4">
                  Start by creating your first feeding schedule.
                </p>
                <Button asChild>
                  <Link href="/dashboard/food-manager/schedule/add">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Schedule
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSchedules.map((schedule) => (
                  <div
                    key={schedule._id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <span className="font-semibold text-lg">{formatTime(schedule.time)}</span>
                          </div>
                          {getStatusBadge(schedule.isActive)}
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              <span className="font-medium">Group:</span> {schedule.cowGroup}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              <span className="font-medium">Food:</span> {schedule.foodType}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              <span className="font-medium">Quantity:</span> {schedule.quantity} {schedule.unit}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              <span className="font-medium">Days:</span> {getDaysOfWeek(schedule.daysOfWeek)}
                            </span>
                          </div>
                        </div>

                        {schedule.notes && (
                          <div className="mt-3 text-sm text-muted-foreground">
                            <span className="font-medium">Notes:</span> {schedule.notes}
                          </div>
                        )}

                        <div className="mt-3 text-sm">
                          <span className="font-medium text-green-600">
                            Next: {getNextOccurrence(schedule.daysOfWeek, schedule.time)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          {schedule.isActive ? (
                            <Pause className="h-3 w-3 mr-1" />
                          ) : (
                            <Play className="h-3 w-3 mr-1" />
                          )}
                          {schedule.isActive ? 'Pause' : 'Resume'}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
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
