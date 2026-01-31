'use client';

import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

// Role color mapping
const ROLE_COLORS = {
  'Owner/Admin': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Goshala Manager': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Doctor': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Food Manager': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Watchman': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
};

// Memoized user row
const UserRow = memo(function UserRow({ user, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">{user.userId}</div>
          <div className="text-xs text-muted-foreground truncate">
            {user.name || 'No name'} • {user.email || 'No email'}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Badge className={ROLE_COLORS[user.role] || ROLE_COLORS['Watchman']} variant="secondary">
              {user.role}
            </Badge>
            <Badge variant={user.isActive ? "default" : "destructive"} className="text-xs">
              {user.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right text-xs text-muted-foreground hidden sm:block">
          <div>Last: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => onEdit(user)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => onDelete(user)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 p-6">
      <div className="h-8 bg-muted rounded w-48 animate-pulse" />
      <div className="h-16 bg-muted rounded animate-pulse" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// User form dialog
const UserFormDialog = memo(function UserFormDialog({
  open,
  onClose,
  onSubmit,
  title,
  submitLabel,
  initialData = null
}) {
  const [form, setForm] = useState({
    userId: '',
    password: '',
    role: 'Watchman',
    name: '',
    email: '',
    phone: '',
    isActive: true
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        userId: initialData.userId || '',
        password: '',
        role: initialData.role || 'Watchman',
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        isActive: initialData.isActive !== false
      });
    } else {
      setForm({
        userId: '',
        password: '',
        role: 'Watchman',
        name: '',
        email: '',
        phone: '',
        isActive: true
      });
    }
  }, [initialData, open]);

  const handleSubmit = () => {
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">User ID</label>
              <Input
                value={form.userId}
                onChange={(e) => setForm(f => ({ ...f, userId: e.target.value }))}
                placeholder="User ID"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={initialData ? 'Leave blank to keep' : 'Password'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Role</label>
            <Select value={form.role} onValueChange={(value) => setForm(f => ({ ...f, role: value }))}>
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
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Full name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Email"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="Phone"
              />
            </div>
          </div>
          {initialData && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))}
              />
              <label htmlFor="isActive" className="text-sm">Active</label>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onClose(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.userId || (!initialData && !form.password)}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default function UserManagementPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [toast, setToast] = useState('');

  const mountedRef = useRef(true);
  const searchTimeoutRef = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchTerm]);

  const getCSRF = () => {
    try {
      const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
      return m ? decodeURIComponent(m[1]) : '';
    } catch { return ''; }
  };

  useEffect(() => {
    fetch('/api/csrf', { credentials: 'same-origin' }).catch(() => { });
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/admin/users?limit=100');
      const data = await res.json();
      if (mountedRef.current && res.ok) {
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadUsers();
    return () => { mountedRef.current = false; };
  }, [loadUsers]);

  // Memoized filtered users
  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      filtered = filtered.filter(user =>
        user.userId?.toLowerCase().includes(search) ||
        user.name?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search)
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

    return filtered;
  }, [users, debouncedSearch, roleFilter, statusFilter]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddUser = async (form) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin',
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      showToast('User created successfully');
      setShowAddDialog(false);
      loadUsers();
    } catch (error) {
      showToast(`Error: ${error.message}`);
    }
  };

  const handleUpdateUser = async (form) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin',
        body: JSON.stringify({ id: selectedUser._id, ...form })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      showToast('User updated successfully');
      setShowEditDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      showToast(`Error: ${error.message}`);
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
      if (!res.ok) throw new Error(data.error || 'Failed');

      showToast('User deleted successfully');
      setShowDeleteDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      showToast(`Error: ${error.message}`);
    }
  };

  const handleEditUser = useCallback((user) => {
    setSelectedUser(user);
    setShowEditDialog(true);
  }, []);

  const handleDeleteClick = useCallback((user) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
  }, []);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> User Management
          </h1>
          <p className="text-muted-foreground text-sm">Manage system users</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={refreshing} onClick={loadUsers}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Roles" />
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
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters}>Clear</Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length > 0 ? (
            <div className="space-y-2">
              {filteredUsers.map(user => (
                <UserRow
                  key={user._id}
                  user={user}
                  onEdit={handleEditUser}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <div>No users found</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <UserFormDialog
        open={showAddDialog}
        onClose={setShowAddDialog}
        onSubmit={handleAddUser}
        title="Add New User"
        submitLabel="Add User"
      />

      {/* Edit Dialog */}
      <UserFormDialog
        open={showEditDialog}
        onClose={setShowEditDialog}
        onSubmit={handleUpdateUser}
        title="Edit User"
        submitLabel="Update User"
        initialData={selectedUser}
      />

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p>Delete user <strong>{selectedUser?.userId}</strong>?</p>
          <p className="text-sm text-muted-foreground">This cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-bottom-4">
          {toast}
        </div>
      )}
    </div>
  );
}
