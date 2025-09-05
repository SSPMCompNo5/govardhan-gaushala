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
  Truck,
  Phone,
  Mail,
  MapPin,
  Star,
  Filter,
  Edit,
  Trash2,
  Users
} from 'lucide-react';
import Link from 'next/link';

export default function SuppliersPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [foodTypeFilter, setFoodTypeFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Fetch suppliers
  const fetchSuppliers = useCallback(async (page = 1) => {
    try {
      setRefreshing(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(statusFilter !== 'all' && { isActive: statusFilter }),
        ...(foodTypeFilter !== 'all' && { foodType: foodTypeFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/food/suppliers?${params}`);
      const data = await response.json();

      if (response.ok) {
        setSuppliers(data.suppliers || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
      } else {
        console.error('Error fetching suppliers:', data.error);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [pagination.limit, statusFilter, foodTypeFilter, searchTerm]);

  // Load data on mount
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Filter suppliers based on search
  useEffect(() => {
    let filtered = [...suppliers];

    if (searchTerm) {
      filtered = filtered.filter(supplier =>
        supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSuppliers(filtered);
  }, [suppliers, searchTerm]);

  const handleRefresh = () => {
    fetchSuppliers(pagination.page);
  };

  const handlePageChange = (newPage) => {
    fetchSuppliers(newPage);
  };

  const getStatusBadge = (isActive) => {
    return (
      <Badge variant={isActive ? 'default' : 'secondary'}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  const getRatingStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating || 0) % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />);
    }

    const emptyStars = 5 - Math.ceil(rating || 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />);
    }

    return stars;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
            <h1 className="text-3xl font-bold">Suppliers</h1>
            <p className="text-muted-foreground">
              Manage your food suppliers and vendors
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
              <Link href="/dashboard/food-manager/suppliers/add">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Supplier
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
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search suppliers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
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
            </div>
          </CardContent>
        </Card>

        {/* Suppliers List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Suppliers ({filteredSuppliers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSuppliers.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No suppliers found</h3>
                <p className="text-muted-foreground mb-4">
                  Start by adding your first supplier.
                </p>
                <Button asChild>
                  <Link href="/dashboard/food-manager/suppliers/add">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Supplier
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSuppliers.map((supplier) => (
                  <div
                    key={supplier._id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">{supplier.name}</h3>
                      </div>
                      {getStatusBadge(supplier.isActive)}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{supplier.contactPerson}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{supplier.phone}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{supplier.email}</span>
                      </div>
                      
                      {supplier.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate">
                            {supplier.address}
                          </span>
                        </div>
                      )}
                    </div>

                    {supplier.foodTypes && supplier.foodTypes.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs text-muted-foreground mb-1">Food Types:</div>
                        <div className="flex flex-wrap gap-1">
                          {supplier.foodTypes.slice(0, 3).map((type, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                          {supplier.foodTypes.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{supplier.foodTypes.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {supplier.rating && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex items-center">
                          {getRatingStars(supplier.rating)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          ({supplier.rating}/5)
                        </span>
                      </div>
                    )}

                    {supplier.lastOrderDate && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Last order: {formatDate(supplier.lastOrderDate)}
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-3 w-3" />
                      </Button>
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
