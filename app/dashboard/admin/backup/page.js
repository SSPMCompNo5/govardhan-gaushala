'use client';

import { useState, useEffect, useCallback } from 'react';
import EmptyState from '@/components/EmptyState';
import { t } from '@/lib/i18n';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw, 
  Clock, 
  HardDrive,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Calendar,
  FileText,
  Shield,
  Archive
} from 'lucide-react';

export default function BackupManagementPage() {
  const getCSRF = () => {
    try { const m=document.cookie.match(/(?:^|; )csrftoken=([^;]+)/); return m?decodeURIComponent(m[1]):''; } catch { return ''; }
  };
  const [backups, setBackups] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const [backupConfig, setBackupConfig] = useState({
    collections: [],
    includeIndexes: true,
    compression: true,
    encryption: false,
    retentionDays: 30,
    schedule: 'daily',
    maxBackups: 10
  });

  const [restoreConfig, setRestoreConfig] = useState({
    backupId: '',
    collections: [],
    mode: 'replace',
    validateData: true,
    createIndexes: true
  });

  const loadBackups = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [backupsResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/backup?action=list', { credentials: 'same-origin', headers: { 'X-CSRF-Token': getCSRF() } }),
        fetch('/api/admin/backup?action=stats', { credentials: 'same-origin', headers: { 'X-CSRF-Token': getCSRF() } })
      ]);

      if (!backupsResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to load backup data');
      }

      const [backupsData, statsData] = await Promise.all([
        backupsResponse.json(),
        statsResponse.json()
      ]);

      setBackups(backupsData.data);
      setStats(statsData.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const createBackup = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCSRF(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'create',
          ...backupConfig
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create backup');
      }

      const result = await response.json();
      setShowCreateModal(false);
      await loadBackups();
      
      // Show success message
      console.log('Backup created successfully:', result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const restoreBackup = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCSRF(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'restore',
          ...restoreConfig
        })
      });

      if (!response.ok) {
        throw new Error('Failed to restore backup');
      }

      const result = await response.json();
      setShowRestoreModal(false);
      
      // Show success message
      console.log('Backup restored successfully:', result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = async (backupId) => {
    if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCSRF(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'delete',
          backupId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete backup');
      }

      await loadBackups();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cleanupOldBackups = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCSRF(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'cleanup',
          ...backupConfig
        })
      });

      if (!response.ok) {
        throw new Error('Failed to cleanup old backups');
      }

      const result = await response.json();
      await loadBackups();
      
      console.log('Cleanup completed:', result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle = null }) => (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Backup & Disaster Recovery</h1>
          <p className="text-gray-600 mt-1">
            Manage database backups, restore data, and configure automated backup schedules
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <Database className="h-4 w-4" />
            <span>Create Backup</span>
          </Button>
          <Button
            onClick={loadBackups}
            disabled={loading}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </Card>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Backups"
            value={stats.totalBackups}
            icon={Archive}
            color="blue"
          />
          <StatCard
            title="Total Size"
            value={formatFileSize(stats.totalSize)}
            icon={HardDrive}
            color="green"
          />
          <StatCard
            title="Successful"
            value={stats.successfulBackups}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Failed"
            value={stats.failedBackups}
            icon={XCircle}
            color="red"
          />
        </div>
      )}

      {/* Backup List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Available Backups</h2>
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowScheduleModal(true)}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <Settings className="h-4 w-4" />
              <span>Schedule</span>
            </Button>
            <Button
              onClick={cleanupOldBackups}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <Trash2 className="h-4 w-4" />
              <span>Cleanup</span>
            </Button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-6" role="status" aria-live="polite">{t('loading')}</div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Backup ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collections
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {backups.map((backup) => (
                <tr key={backup.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Database className="h-4 w-4 text-gray-400 mr-2" />
                      {backup.id}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(backup.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatFileSize(backup.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <Badge variant="secondary">
                      {backup.collections.length} collections
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRestoreConfig(prev => ({ ...prev, backupId: backup.id }));
                          setShowRestoreModal(true);
                        }}
                        className="flex items-center space-x-1"
                      >
                        <Upload className="h-3 w-3" />
                        <span>Restore</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteBackup(backup.id)}
                        className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {backups.length === 0 && !loading && (
          <EmptyState
            title="No Backups Found"
            description="Create your first backup to get started with data protection."
            action={<Button onClick={() => setShowCreateModal(true)}>Create First Backup</Button>}
          />
        )}
      </Card>

      {/* Create Backup Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Backup</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Include Indexes
                </label>
                <Select
                  value={backupConfig.includeIndexes ? 'true' : 'false'}
                  onValueChange={(value) => setBackupConfig(prev => ({ 
                    ...prev, 
                    includeIndexes: value === 'true' 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retention Days
                </label>
                <Input
                  type="number"
                  value={backupConfig.retentionDays}
                  onChange={(e) => setBackupConfig(prev => ({ 
                    ...prev, 
                    retentionDays: parseInt(e.target.value) 
                  }))}
                  min="1"
                  max="365"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Backups
                </label>
                <Input
                  type="number"
                  value={backupConfig.maxBackups}
                  onChange={(e) => setBackupConfig(prev => ({ 
                    ...prev, 
                    maxBackups: parseInt(e.target.value) 
                  }))}
                  min="1"
                  max="100"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={createBackup}
                disabled={loading}
              >
                Create Backup
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Restore Backup Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Restore Backup</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Restore Mode
                </label>
                <Select
                  value={restoreConfig.mode}
                  onValueChange={(value) => setRestoreConfig(prev => ({ 
                    ...prev, 
                    mode: value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="replace">Replace (Drop & Recreate)</SelectItem>
                    <SelectItem value="merge">Merge (Upsert)</SelectItem>
                    <SelectItem value="skip">Skip Existing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validate Data
                </label>
                <Select
                  value={restoreConfig.validateData ? 'true' : 'false'}
                  onValueChange={(value) => setRestoreConfig(prev => ({ 
                    ...prev, 
                    validateData: value === 'true' 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Create Indexes
                </label>
                <Select
                  value={restoreConfig.createIndexes ? 'true' : 'false'}
                  onValueChange={(value) => setRestoreConfig(prev => ({ 
                    ...prev, 
                    createIndexes: value === 'true' 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowRestoreModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={restoreBackup}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Restore Backup
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Schedule Backup Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Backups</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Frequency
                </label>
                <Select
                  value={backupConfig.schedule}
                  onValueChange={(value) => setBackupConfig(prev => ({ 
                    ...prev, 
                    schedule: value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retention Days
                </label>
                <Input
                  type="number"
                  value={backupConfig.retentionDays}
                  onChange={(e) => setBackupConfig(prev => ({ 
                    ...prev, 
                    retentionDays: parseInt(e.target.value) 
                  }))}
                  min="1"
                  max="365"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Backups
                </label>
                <Input
                  type="number"
                  value={backupConfig.maxBackups}
                  onChange={(e) => setBackupConfig(prev => ({ 
                    ...prev, 
                    maxBackups: parseInt(e.target.value) 
                  }))}
                  min="1"
                  max="100"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowScheduleModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/admin/backup', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        action: 'schedule',
                        ...backupConfig
                      })
                    });

                    if (!response.ok) {
                      throw new Error('Failed to schedule backups');
                    }

                    setShowScheduleModal(false);
                    console.log('Backup schedule configured successfully');
                  } catch (err) {
                    setError(err.message);
                  }
                }}
                disabled={loading}
              >
                Configure Schedule
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
