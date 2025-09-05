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
  Shield, 
  Play, 
  TestTube, 
  Trash2, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Calendar,
  FileText,
  Database,
  Clock,
  Mail,
  Webhook,
  Plus
} from 'lucide-react';

export default function DisasterRecoveryPage() {
  const getCSRF = () => {
    try { const m=document.cookie.match(/(?:^|; )csrftoken=([^;]+)/); return m?decodeURIComponent(m[1]):''; } catch { return ''; }
  };
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [planData, setPlanData] = useState({
    name: '',
    description: '',
    backupId: '',
    collections: [],
    restoreMode: 'replace',
    validation: true,
    notifications: {
      email: [],
      webhook: ''
    },
    schedule: {
      enabled: false,
      frequency: 'weekly',
      time: '02:00'
    }
  });

  const [testConfig, setTestConfig] = useState({
    planId: '',
    testMode: true,
    validateOnly: true,
    notifyResults: true
  });

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [plansResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/disaster-recovery?action=list', { credentials: 'same-origin', headers: { 'X-CSRF-Token': getCSRF() } }),
        fetch('/api/admin/disaster-recovery?action=stats', { credentials: 'same-origin', headers: { 'X-CSRF-Token': getCSRF() } })
      ]);

      if (!plansResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to load disaster recovery data');
      }

      const [plansData, statsData] = await Promise.all([
        plansResponse.json(),
        statsResponse.json()
      ]);

      setPlans(plansData.data);
      setStats(statsData.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const createPlan = async () => {
    setLoading(true);
    setError(null);

    try {
      const tempId = `temp-${Date.now()}`;
      const optimistic = { id: tempId, name: planData.name || 'New Plan', description: planData.description, status: 'active', backupId: planData.backupId, lastTested: null };
      setPlans(prev => [optimistic, ...prev]);
      const response = await fetch('/api/admin/disaster-recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCSRF(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'create',
          ...planData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create recovery plan');
      }

      const result = await response.json();
      setShowCreateModal(false);
      setPlanData({
        name: '',
        description: '',
        backupId: '',
        collections: [],
        restoreMode: 'replace',
        validation: true,
        notifications: {
          email: [],
          webhook: ''
        },
        schedule: {
          enabled: false,
          frequency: 'weekly',
          time: '02:00'
        }
      });
      // Replace optimistic plan with created plan
      setPlans(prev => [{ ...result.data }, ...prev.filter(p => p.id !== tempId)]);
      
      console.log('Recovery plan created successfully:', result.data);
    } catch (err) {
      setError(err.message);
      // Rollback optimistic insert
      setPlans(prev => prev.filter(p => !String(p.id).startsWith('temp-')));
    } finally {
      setLoading(false);
    }
  };

  const executeRecovery = async (planId) => {
    if (!confirm('Are you sure you want to execute this disaster recovery plan? This will restore data from the backup.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const snapshot = plans;
      const endedAt = new Date().toISOString();
      setPlans(prev => prev.map(p => String(p.id) === String(planId) ? { ...p, lastExecuted: endedAt } : p));
      const response = await fetch('/api/admin/disaster-recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCSRF(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'execute',
          planId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to execute recovery plan');
      }

      const result = await response.json();
      // keep optimistic updated; optionally refresh later
      
      console.log('Recovery executed successfully:', result.data);
    } catch (err) {
      setError(err.message);
      // Rollback
      setPlans(snapshot);
    } finally {
      setLoading(false);
    }
  };

  const testPlan = async () => {
    setLoading(true);
    setError(null);

    try {
      const snapshot = plans;
      const testedAt = new Date().toISOString();
      if (testConfig.planId) setPlans(prev => prev.map(p => String(p.id) === String(testConfig.planId) ? { ...p, lastTested: testedAt } : p));
      const response = await fetch('/api/admin/disaster-recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCSRF(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'test',
          ...testConfig
        })
      });

      if (!response.ok) {
        throw new Error('Failed to test recovery plan');
      }

      const result = await response.json();
      setShowTestModal(false);
      // keep optimistic updated
      
      console.log('Recovery plan test completed:', result.data);
    } catch (err) {
      setError(err.message);
      // Rollback
      setPlans(snapshot);
    } finally {
      setLoading(false);
    }
  };

  const deletePlan = async (planId) => {
    if (!confirm('Are you sure you want to delete this recovery plan? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const snapshot = plans;
      setPlans(prev => prev.filter(p => String(p.id) !== String(planId)));
      const response = await fetch('/api/admin/disaster-recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCSRF(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'delete',
          planId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete recovery plan');
      }

      // keep optimistic deletion
    } catch (err) {
      setError(err.message);
      // rollback
      setPlans(snapshot);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Disaster Recovery</h1>
          <p className="text-gray-600 mt-1">
            Create and manage disaster recovery plans to ensure business continuity
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Plan</span>
          </Button>
          <Button
            onClick={loadPlans}
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
            title="Total Plans"
            value={stats.totalPlans}
            icon={Shield}
            color="blue"
          />
          <StatCard
            title="Active Plans"
            value={stats.activePlans}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Tested Plans"
            value={stats.testedPlans}
            icon={TestTube}
            color="purple"
          />
          <StatCard
            title="Recently Executed"
            value={stats.recentlyExecuted}
            icon={Clock}
            color="orange"
          />
        </div>
      )}

      {/* Recovery Plans List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recovery Plans</h2>
        </div>

        {loading && (
          <div className="text-center py-6" role="status" aria-live="polite">{t('loading')}</div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Backup
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Tested
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                      {plan.description && (
                        <div className="text-sm text-gray-500">{plan.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(plan.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Database className="h-4 w-4 text-gray-400 mr-2" />
                      {plan.backupInfo ? plan.backupInfo.id : plan.backupId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {plan.lastTested ? formatDate(plan.lastTested) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTestConfig(prev => ({ ...prev, planId: plan.id }));
                          setShowTestModal(true);
                        }}
                        className="flex items-center space-x-1"
                      >
                        <TestTube className="h-3 w-3" />
                        <span>Test</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeRecovery(plan.id)}
                        className="flex items-center space-x-1 text-orange-600 hover:text-orange-700"
                      >
                        <Play className="h-3 w-3" />
                        <span>Execute</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deletePlan(plan.id)}
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

        {plans.length === 0 && !loading && (
          <EmptyState
            title="No Recovery Plans Found"
            description="Create your first disaster recovery plan to ensure business continuity."
            action={<Button onClick={() => setShowCreateModal(true)}>Create First Plan</Button>}
          />
        )}
      </Card>

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Recovery Plan</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Name
                </label>
                <Input
                  value={planData.name}
                  onChange={(e) => setPlanData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter plan name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Input
                  value={planData.description}
                  onChange={(e) => setPlanData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter plan description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Backup ID
                </label>
                <Input
                  value={planData.backupId}
                  onChange={(e) => setPlanData(prev => ({ ...prev, backupId: e.target.value }))}
                  placeholder="Enter backup ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Restore Mode
                </label>
                <Select
                  value={planData.restoreMode}
                  onValueChange={(value) => setPlanData(prev => ({ 
                    ...prev, 
                    restoreMode: value 
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
                  Validation
                </label>
                <Select
                  value={planData.validation ? 'true' : 'false'}
                  onValueChange={(value) => setPlanData(prev => ({ 
                    ...prev, 
                    validation: value === 'true' 
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
                  Schedule Enabled
                </label>
                <Select
                  value={planData.schedule.enabled ? 'true' : 'false'}
                  onValueChange={(value) => setPlanData(prev => ({ 
                    ...prev, 
                    schedule: { ...prev.schedule, enabled: value === 'true' }
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

              {planData.schedule.enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule Frequency
                  </label>
                  <Select
                    value={planData.schedule.frequency}
                    onValueChange={(value) => setPlanData(prev => ({ 
                      ...prev, 
                      schedule: { ...prev.schedule, frequency: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={createPlan}
                disabled={loading}
              >
                Create Plan
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Test Plan Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Recovery Plan</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Mode
                </label>
                <Select
                  value={testConfig.testMode ? 'true' : 'false'}
                  onValueChange={(value) => setTestConfig(prev => ({ 
                    ...prev, 
                    testMode: value === 'true' 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes (Safe Test)</SelectItem>
                    <SelectItem value="false">No (Full Test)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validate Only
                </label>
                <Select
                  value={testConfig.validateOnly ? 'true' : 'false'}
                  onValueChange={(value) => setTestConfig(prev => ({ 
                    ...prev, 
                    validateOnly: value === 'true' 
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
                  Notify Results
                </label>
                                 <Select
                   value={testConfig.notifyResults ? 'true' : 'false'}
                   onValueChange={(value) => setTestConfig(prev => ({ 
                     ...prev, 
                     notifyResults: value === 'true' 
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
                onClick={() => setShowTestModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={testPlan}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Run Test
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
