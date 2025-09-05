'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Shield, 
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  UserX
} from 'lucide-react';

export default function UserManagementPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [toast, setToast] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [userForm, setUserForm] = useState({
    userId: '',
    password: '',
    role: 'Watchman',
    name: '',
    email: '',
    phone: '',
    isActive: true
  });

  const getCSRF = () => {
    try { const m=document.cookie.match(/(?:^|; )csrftoken=([^;]+)/); return m?decodeURIComponent(m[1]):''; } catch { return ''; }
  };

  // Ensure CSRF cookie is issued on page load
  useEffect(() => {
    (async () => {
      try {
        await fetch('/api/csrf', { credentials: 'same-origin', cache: 'no-store' });
      } catch {}
    })();
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/admin/users?limit=100', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setFilteredUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setToast('Failed to load users');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filter users based on search and filters
  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter && roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(user => 
        statusFilter === 'active' ? user.isActive : !user.isActive
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter]);

  const handleAddUser = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin',
        body: JSON.stringify(userForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      
      setToast('User created successfully');
      setShowAddDialog(false);
      setUserForm({ userId: '', password: '', role: 'Watchman', name: '', email: '', phone: '', isActive: true });
      loadUsers();
    } catch (error) {
      setToast(`Failed to create user: ${error.message}`);
    }
  };

  const handleUpdateUser = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin',
        body: JSON.stringify({ id: selectedUser._id, ...userForm })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      
      setToast('User updated successfully');
      setShowEditDialog(false);
      setSelectedUser(null);
      setUserForm({ userId: '', password: '', role: 'Watchman', name: '', email: '', phone: '', isActive: true });
      loadUsers();
    } catch (error) {
      setToast(`Failed to update user: ${error.message}`);
    }
  };

  const handleDeleteUser = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin',
        body: JSON.stringify({ id: selectedUser._id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      
      setToast('User deleted successfully');
      setShowDeleteDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      setToast(`Failed to delete user: ${error.message}`);
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserForm({
      userId: user.userId,
      password: '', // Don't pre-fill password
      role: user.role,
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      isActive: user.isActive
    });
    setShowEditDialog(true);
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'Owner/Admin': return 'bg-purple-100 text-purple-800';
      case 'Goshala Manager': return 'bg-blue-100 text-blue-800';
      case 'Doctor': return 'bg-green-100 text-green-800';
      case 'Food Manager': return 'bg-orange-100 text-orange-800';
      case 'Watchman': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full p-6">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-96 bg-gray-200 rounded animate-pulse" />
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
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" /> User Management
            </h1>
            <p className="text-muted-foreground">Manage system users and permissions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={refreshing} onClick={loadUsers}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin':''}`} /> Refresh
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add User
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="Owner/Admin">Owner/Admin</SelectItem>
                  <SelectItem value="Goshala Manager">Goshala Manager</SelectItem>
                  <SelectItem value="Doctor">Doctor</SelectItem>
                  <SelectItem value="Food Manager">Food Manager</SelectItem>
                  <SelectItem value="Watchman">Watchman</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUsers.length > 0 ? (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium">{user.userId}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.name || 'No name'} • {user.email || 'No email'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                          <Badge className={getStatusColor(user.isActive)}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm text-muted-foreground">
                        <div>Last login: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</div>
                        <div>Created: {new Date(user.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleEditUser(user)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteClick(user)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <div>No users found</div>
                <div className="text-xs">Try adjusting your filters or add a new user</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add User Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">User ID</label>
                  <Input
                    value={userForm.userId}
                    onChange={(e) => setUserForm({...userForm, userId: e.target.value})}
                    placeholder="Enter user ID"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={userForm.password}
                      onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                      placeholder="Enter password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <Select value={userForm.role} onValueChange={(value) => setUserForm({...userForm, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Watchman">Watchman</SelectItem>
                    <SelectItem value="Food Manager">Food Manager</SelectItem>
                    <SelectItem value="Cow Manager">Cow Manager</SelectItem>
                    <SelectItem value="Goshala Manager">Goshala Manager</SelectItem>
                    <SelectItem value="Doctor">Doctor</SelectItem>
                    <SelectItem value="Owner/Admin">Owner/Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={userForm.name}
                  onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                  placeholder="Enter full name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    value={userForm.phone}
                    onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddUser} disabled={!userForm.userId || !userForm.password}>
                Add User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">User ID</label>
                  <Input
                    value={userForm.userId}
                    onChange={(e) => setUserForm({...userForm, userId: e.target.value})}
                    placeholder="Enter user ID"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Password (leave blank to keep current)</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={userForm.password}
                      onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                      placeholder="Enter new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <Select value={userForm.role} onValueChange={(value) => setUserForm({...userForm, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Watchman">Watchman</SelectItem>
                    <SelectItem value="Food Manager">Food Manager</SelectItem>
                    <SelectItem value="Goshala Manager">Goshala Manager</SelectItem>
                    <SelectItem value="Doctor">Doctor</SelectItem>
                    <SelectItem value="Owner/Admin">Owner/Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={userForm.name}
                  onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                  placeholder="Enter full name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    value={userForm.phone}
                    onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={Boolean(userForm.isActive)}
                  onChange={(e) => setUserForm({...userForm, isActive: e.target.checked})}
                />
                <label htmlFor="isActive" className="text-sm font-medium">Active</label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button onClick={handleUpdateUser} disabled={!userForm.userId}>
                Update User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Are you sure you want to delete user <strong>{selectedUser?.userId}</strong>?</p>
              <p className="text-sm text-muted-foreground mt-2">This action cannot be undone.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteUser}>Delete User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {toast && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
