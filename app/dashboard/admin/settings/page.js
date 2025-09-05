'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Database, 
  Shield, 
  Bell, 
  Save, 
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [settings, setSettings] = useState({
    // System Settings
    systemName: 'Govardhan Goshala',
    systemVersion: '1.0.0',
    maintenanceMode: false,
    debugMode: false,
    
    // Security Settings
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireStrongPasswords: true,
    
    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    lowStockAlerts: true,
    criticalAlerts: true,
    dailyReports: true,
    
    // Backup Settings
    autoBackup: true,
    backupFrequency: 'daily',
    backupRetention: 30,
    
    // Performance Settings
    cacheEnabled: true,
    cacheTimeout: 300,
    maxConnections: 100
  });

  const getCSRF = () => {
    try { const m=document.cookie.match(/(?:^|; )csrftoken=([^;]+)/); return m?decodeURIComponent(m[1]):''; } catch { return ''; }
  };

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setSettings(data.data.settings);
      } else {
        // swallow to avoid console spam
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setToast('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin',
        body: JSON.stringify({ settings })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      
      setToast('Settings saved successfully');
    } catch (error) {
      setToast(`Failed to save settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backup failed');
      
      setToast('Backup completed successfully');
    } catch (error) {
      setToast(`Backup failed: ${error.message}`);
    }
  };

  const handleRestore = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('backup', file);
      
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'X-CSRF-Token': getCSRF() },
        credentials: 'same-origin',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');
      
      setToast('Database restored successfully');
    } catch (error) {
      setToast(`Restore failed: ${error.message}`);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full p-6">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded animate-pulse" />
            ))}
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
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" /> System Settings
            </h1>
            <p className="text-muted-foreground">Configure system preferences and security</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadSettings}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button onClick={handleSaveSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" /> System Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">System Name</label>
                <Input
                  value={settings.systemName}
                  onChange={(e) => updateSetting('systemName', e.target.value)}
                  placeholder="Enter system name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">System Version</label>
                <Input
                  value={settings.systemVersion}
                  onChange={(e) => updateSetting('systemVersion', e.target.value)}
                  placeholder="Enter version"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Maintenance Mode</label>
                  <p className="text-xs text-muted-foreground">Disable system access for maintenance</p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => updateSetting('maintenanceMode', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Debug Mode</label>
                  <p className="text-xs text-muted-foreground">Enable detailed error logging</p>
                </div>
                <Switch
                  checked={settings.debugMode}
                  onCheckedChange={(checked) => updateSetting('debugMode', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Session Timeout (minutes)</label>
                <Input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                  min="5"
                  max="480"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Max Login Attempts</label>
                <Input
                  type="number"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => updateSetting('maxLoginAttempts', parseInt(e.target.value))}
                  min="3"
                  max="10"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Password Min Length</label>
                <Input
                  type="number"
                  value={settings.passwordMinLength}
                  onChange={(e) => updateSetting('passwordMinLength', parseInt(e.target.value))}
                  min="6"
                  max="20"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Require Strong Passwords</label>
                  <p className="text-xs text-muted-foreground">Enforce complex password requirements</p>
                </div>
                <Switch
                  checked={settings.requireStrongPasswords}
                  onCheckedChange={(checked) => updateSetting('requireStrongPasswords', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" /> Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Email Notifications</label>
                  <p className="text-xs text-muted-foreground">Send notifications via email</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">SMS Notifications</label>
                  <p className="text-xs text-muted-foreground">Send notifications via SMS</p>
                </div>
                <Switch
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => updateSetting('smsNotifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Low Stock Alerts</label>
                  <p className="text-xs text-muted-foreground">Alert when inventory is low</p>
                </div>
                <Switch
                  checked={settings.lowStockAlerts}
                  onCheckedChange={(checked) => updateSetting('lowStockAlerts', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Critical Alerts</label>
                  <p className="text-xs text-muted-foreground">Alert for critical issues</p>
                </div>
                <Switch
                  checked={settings.criticalAlerts}
                  onCheckedChange={(checked) => updateSetting('criticalAlerts', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Daily Reports</label>
                  <p className="text-xs text-muted-foreground">Send daily summary reports</p>
                </div>
                <Switch
                  checked={settings.dailyReports}
                  onCheckedChange={(checked) => updateSetting('dailyReports', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Backup & Restore */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" /> Backup & Restore
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Auto Backup</label>
                  <p className="text-xs text-muted-foreground">Automatically backup database</p>
                </div>
                <Switch
                  checked={settings.autoBackup}
                  onCheckedChange={(checked) => updateSetting('autoBackup', checked)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Backup Frequency</label>
                <Select value={settings.backupFrequency} onValueChange={(value) => updateSetting('backupFrequency', value)}>
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
                <label className="text-sm font-medium">Backup Retention (days)</label>
                <Input
                  type="number"
                  value={settings.backupRetention}
                  onChange={(e) => updateSetting('backupRetention', parseInt(e.target.value))}
                  min="1"
                  max="365"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleBackup} variant="outline">
                  <Download className="h-4 w-4 mr-2" /> Create Backup
                </Button>
                <div className="relative">
                  <input
                    type="file"
                    accept=".json,.sql"
                    onChange={handleRestore}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" /> Restore Backup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" /> System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Database</div>
                  <div className="text-sm text-muted-foreground">MongoDB Connection</div>
                </div>
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Authentication</div>
                  <div className="text-sm text-muted-foreground">NextAuth.js</div>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Last Backup</div>
                  <div className="text-sm text-muted-foreground">24 hours ago</div>
                </div>
                <Badge className="bg-blue-100 text-blue-800">Recent</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {toast && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
