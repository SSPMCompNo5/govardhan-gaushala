'use client';

import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { addCSRFHeader } from '@/lib/http';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download, 
  Upload, 
  Database, 
  FileText, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Archive
} from 'lucide-react';

export default function DataManagementPage() {
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [exportFormat, setExportFormat] = useState('json');
  const [importMode, setImportMode] = useState('merge');
  const [importFile, setImportFile] = useState(null);
  const [fileAnalysis, setFileAnalysis] = useState(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = useRef(null);

  const availableCollections = [
    { id: 'users', name: 'Users', description: 'User accounts and roles' },
    { id: 'gate_logs', name: 'Gate Logs', description: 'Visitor entry/exit records' },
    { id: 'inventory_items', name: 'Inventory Items', description: 'Food and supply inventory' },
    { id: 'feeding_logs', name: 'Feeding Logs', description: 'Animal feeding records' },
    { id: 'feeding_schedules', name: 'Feeding Schedules', description: 'Scheduled feeding plans' },
    { id: 'suppliers', name: 'Suppliers', description: 'Vendor and supplier information' },
    { id: 'cows', name: 'Cows', description: 'Cattle records and information' },
    { id: 'treatments', name: 'Treatments', description: 'Medical treatment records' },
    { id: 'vaccinations', name: 'Vaccinations', description: 'Vaccination records' },
    { id: 'medicines', name: 'Medicines', description: 'Medicine inventory' },
    { id: 'medicine_batches', name: 'Medicine Batches', description: 'Medicine batch tracking' },
    { id: 'medicine_usage', name: 'Medicine Usage', description: 'Medicine usage records' },
    { id: 'medicine_wastage', name: 'Medicine Wastage', description: 'Medicine wastage records' },
    { id: 'staff', name: 'Staff', description: 'Staff information' },
    { id: 'staff_tasks', name: 'Staff Tasks', description: 'Staff task assignments' },
    { id: 'infrastructure_checklists', name: 'Infrastructure Checklists', description: 'Maintenance checklists' },
    { id: 'infrastructure_maintenance', name: 'Infrastructure Maintenance', description: 'Maintenance records' },
    { id: 'infrastructure_assets', name: 'Infrastructure Assets', description: 'Asset inventory' },
    { id: 'alerts', name: 'Alerts', description: 'System alerts and notifications' },
    { id: 'settings', name: 'Settings', description: 'System configuration' },
    { id: 'audit_logs', name: 'Audit Logs', description: 'System audit trail' }
  ];

  const getCSRFToken = async () => {
    try {
      const response = await fetch('/api/csrf', { credentials: 'same-origin' });
      const data = await response.json();
      return data.token;
    } catch {
      return '';
    }
  };

  const handleCollectionToggle = (collectionId) => {
    setSelectedCollections(prev => 
      prev.includes(collectionId) 
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCollections.length === availableCollections.length) {
      setSelectedCollections([]);
    } else {
      setSelectedCollections(availableCollections.map(col => col.id));
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    setExportProgress(0);

    try {
      const csrfToken = await getCSRFToken();
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 20, 90));
      }, 200);

      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: addCSRFHeader({
          'Content-Type': 'application/json'
        }),
        credentials: 'same-origin',
        body: JSON.stringify({
          collections: selectedCollections.length > 0 ? selectedCollections : undefined,
          format: exportFormat,
          includeMetadata: true
        })
      });

      clearInterval(progressInterval);
      setExportProgress(100);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `goshala-backup-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      // Error will be handled by toast system
    } finally {
      setExportLoading(false);
      setExportProgress(0);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportFile(file);

    try {
      const content = await file.text();
      const response = await fetch(`/api/admin/import?content=${encodeURIComponent(content)}`);
      const analysis = await response.json();
      setFileAnalysis(analysis);
    } catch (error) {
      console.error('File analysis error:', error);
      setFileAnalysis({ valid: false, error: 'Failed to analyze file' });
    }
  };

  const handleImport = async () => {
    if (!importFile || !fileAnalysis?.valid) return;

    setImportLoading(true);

    try {
      const csrfToken = await getCSRFToken();
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('options', JSON.stringify({ mode: importMode }));

      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken
        },
        credentials: 'same-origin',
        body: formData
      });

      const results = await response.json();
      setImportResults(results);
    } catch (error) {
      console.error('Import error:', error);
      // Error will be handled by toast system
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Data Management</h1>
            <p className="text-muted-foreground mt-1">
              Export, import, and backup your Goshala data
            </p>
          </div>
        </div>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Collection Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Select Collections</h3>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedCollections.length === availableCollections.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {availableCollections.map((collection) => (
                  <div key={collection.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                    <Checkbox
                      id={collection.id}
                      checked={selectedCollections.includes(collection.id)}
                      onCheckedChange={() => handleCollectionToggle(collection.id)}
                    />
                    <div className="flex-1">
                      <label htmlFor={collection.id} className="text-sm font-medium cursor-pointer">
                        {collection.name}
                      </label>
                      <p className="text-xs text-muted-foreground">{collection.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Options */}
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm font-medium">Format</label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleExport}
                disabled={exportLoading}
                className="flex items-center gap-2"
              >
                {exportLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export Data
                  </>
                )}
              </Button>
            </div>

            {/* Export Progress */}
            {exportLoading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Exporting data...</span>
                  <span>{exportProgress}%</span>
                </div>
                <Progress value={exportProgress} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Selection */}
            <div>
              <label className="text-sm font-medium">Select Backup File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {/* File Analysis */}
            {fileAnalysis && (
              <div className={`p-4 rounded-lg border ${
                fileAnalysis.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {fileAnalysis.valid ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-medium">
                    {fileAnalysis.valid ? 'Valid Backup File' : 'Invalid File'}
                  </span>
                </div>
                {fileAnalysis.valid ? (
                  <div className="space-y-2 text-sm">
                    <p><strong>Collections:</strong> {fileAnalysis.collections?.length || 0}</p>
                    <p><strong>Total Documents:</strong> {fileAnalysis.totalDocuments || 0}</p>
                    <p><strong>File Size:</strong> {(fileAnalysis.estimatedSize / 1024).toFixed(2)} KB</p>
                    {fileAnalysis.metadata && (
                      <p><strong>Exported:</strong> {new Date(fileAnalysis.metadata.exportedAt).toLocaleString()}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-red-600">{fileAnalysis.error}</p>
                )}
              </div>
            )}

            {/* Import Options */}
            {fileAnalysis?.valid && (
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium">Import Mode</label>
                  <Select value={importMode} onValueChange={setImportMode}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="merge">Merge (Skip Duplicates)</SelectItem>
                      <SelectItem value="replace">Replace (Clear & Import)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleImport}
                  disabled={importLoading || !importFile}
                  className="flex items-center gap-2"
                >
                  {importLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import Data
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Import Results */}
            {importResults && (
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                <h3 className="font-medium mb-3">Import Results</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium">Total Collections</p>
                    <p className="text-2xl font-bold">{importResults.results?.summary?.totalCollections || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Documents Imported</p>
                    <p className="text-2xl font-bold text-green-600">
                      {importResults.results?.summary?.successfulImports || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Failed Imports</p>
                    <p className="text-2xl font-bold text-red-600">
                      {importResults.results?.summary?.failedImports || 0}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Management Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Important Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Archive className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Regular Backups</p>
                  <p className="text-muted-foreground">Export your data regularly to prevent data loss</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Database className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Import Modes</p>
                  <p className="text-muted-foreground">Use &quot;Merge&quot; to add new data, &quot;Replace&quot; to completely replace existing data</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium">File Formats</p>
                  <p className="text-muted-foreground">JSON format preserves all data types, CSV is more readable but limited</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
