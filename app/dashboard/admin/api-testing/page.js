'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Database,
  Shield,
  Zap
} from 'lucide-react';
import apiTestingSuite from '@/lib/apiTesting';
import uiTestingSuite from '@/lib/uiTesting';

export default function APITestingPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [selectedSuite, setSelectedSuite] = useState(null);
  const [progress, setProgress] = useState(0);

  const runAllTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setTestResults(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const api = await apiTestingSuite.runAllTests();
      const ui = await uiTestingSuite.runAllTests();
      
      clearInterval(progressInterval);
      setProgress(100);
      // Merge summaries
      const totalSuites = api.totalSuites + ui.totalSuites;
      const totalTests = api.totalTests + ui.totalTests;
      const totalPassed = api.totalPassed + ui.totalPassed;
      const totalFailed = api.totalFailed + ui.totalFailed;
      const merged = {
        totalSuites,
        totalTests,
        totalPassed,
        totalFailed,
        successRate: totalTests ? ((totalPassed / totalTests) * 100).toFixed(2) : '0.00',
        results: [...api.results, ...ui.results]
      };
      setTestResults(merged);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (passed) => {
    return passed ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (passed) => {
    return (
      <Badge className={passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
        {passed ? 'PASSED' : 'FAILED'}
      </Badge>
    );
  };

  const exportResults = () => {
    if (!testResults) return;
    
    const dataStr = JSON.stringify(testResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `api-test-results-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">API Testing Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive testing suite for all API endpoints and system functionality
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={exportResults}
              disabled={!testResults}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
            <Button
              onClick={runAllTests}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run All Tests
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Running API Tests...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Results Summary */}
        {testResults && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Suites</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{testResults.totalSuites}</div>
                <p className="text-xs text-muted-foreground">
                  Test suites executed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{testResults.totalTests}</div>
                <p className="text-xs text-muted-foreground">
                  Individual tests run
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Passed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{testResults.totalPassed}</div>
                <p className="text-xs text-muted-foreground">
                  Tests passed successfully
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{testResults.totalFailed}</div>
                <p className="text-xs text-muted-foreground">
                  Tests that failed
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Success Rate */}
        {testResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Overall Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Test Success Rate</span>
                  <span className="text-sm font-bold">{testResults.successRate}%</span>
                </div>
                <Progress 
                  value={parseFloat(testResults.successRate)} 
                  className="w-full"
                />
                <div className="flex items-center gap-2">
                  {parseFloat(testResults.successRate) >= 90 ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Excellent
                    </Badge>
                  ) : parseFloat(testResults.successRate) >= 80 ? (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Good
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">
                      <XCircle className="h-3 w-3 mr-1" />
                      Needs Attention
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {testResults.totalPassed} of {testResults.totalTests} tests passed
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Test Results */}
        {testResults && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Detailed Results</h2>
            {testResults.results.map((suite, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {suite.suite}
                      <Badge variant="outline">
                        {suite.passed}/{suite.total} passed
                      </Badge>
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSuite(selectedSuite === index ? null : index)}
                    >
                      {selectedSuite === index ? 'Hide Details' : 'Show Details'}
                    </Button>
                  </div>
                </CardHeader>
                {selectedSuite === index && (
                  <CardContent>
                    <div className="space-y-3">
                      {suite.tests.map((test, testIndex) => (
                        <div key={testIndex} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(test.passed)}
                            <div>
                              <p className="font-medium">{test.name}</p>
                              {test.error && (
                                <p className="text-sm text-red-600">{test.error}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {test.duration}ms
                            </div>
                            {getStatusBadge(test.passed)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Test Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Test Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <h3 className="font-medium">Authentication & Security</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Login validation</li>
                  <li>• Session management</li>
                  <li>• CSRF protection</li>
                  <li>• Rate limiting</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Core APIs</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Gate logs management</li>
                  <li>• Food inventory</li>
                  <li>• Feeding schedules</li>
                  <li>• Supplier management</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Advanced Features</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Cow management</li>
                  <li>• Health records</li>
                  <li>• Medicine tracking</li>
                  <li>• Staff management</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
