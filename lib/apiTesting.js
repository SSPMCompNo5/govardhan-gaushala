'use client';

class APITestingSuite {
  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '';
    this.testResults = [];
    this.isRunning = false;
  }

  // Test authentication and session management
  async testAuthentication() {
    const tests = [
      {
        name: 'Login with valid credentials',
        test: async () => {
          const response = await fetch('/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: 'admin',
              password: 'admin123'
            })
          });
          return response.ok;
        }
      },
      {
        name: 'Login with invalid credentials',
        test: async () => {
          const response = await fetch('/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            redirect: 'manual',
            body: JSON.stringify({
              userId: 'invalid',
              password: 'invalid'
            })
          });
          return !response.ok;
        }
      },
      {
        name: 'Access protected route without auth',
        test: async () => {
          const response = await fetch('/api/gate-logs', { credentials: 'omit' });
          return response.status === 401;
        }
      }
    ];

    return this.runTests('Authentication', tests);
  }

  // Test gate logs API
  async testGateLogsAPI() {
    const tests = [
      {
        name: 'Get gate logs list',
        test: async () => {
          const response = await fetch('/api/gate-logs?page=1&limit=10');
          const data = await response.json();
          return response.ok && Array.isArray(data.logs);
        }
      },
      {
        name: 'Create gate log entry',
        test: async () => {
          const csrfToken = await this.getCSRFToken();
          const response = await fetch('/api/gate-logs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken
            },
            credentials: 'same-origin',
            body: JSON.stringify({
              type: 'entry',
              visitorName: 'Test Visitor',
              purpose: 'test',
              at: new Date().toISOString()
            })
          });
          return response.ok;
        }
      },
      {
        name: 'Get gate log by ID',
        test: async () => {
          // First create a log, then fetch it
          const csrfToken = await this.getCSRFToken();
          const createResponse = await fetch('/api/gate-logs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken
            },
            credentials: 'same-origin',
            body: JSON.stringify({
              type: 'entry',
              visitorName: 'Test Visitor 2',
              purpose: 'test',
              at: new Date().toISOString()
            })
          });
          
          if (!createResponse.ok) return false;
          
          const created = await createResponse.json();
          const getResponse = await fetch(`/api/gate-logs/${created.id}`);
          return getResponse.ok;
        }
      }
    ];

    return this.runTests('Gate Logs API', tests);
  }

  // Test food management APIs
  async testFoodManagementAPI() {
    const tests = [
      {
        name: 'Get inventory items',
        test: async () => {
          const response = await fetch('/api/food/inventory?page=1&limit=10');
          const data = await response.json();
          return response.ok && Array.isArray(data.items);
        }
      },
      {
        name: 'Get feeding logs',
        test: async () => {
          const response = await fetch('/api/food/feeding-logs?page=1&limit=10');
          const data = await response.json();
          return response.ok && Array.isArray(data.logs);
        }
      },
      {
        name: 'Get feeding schedules',
        test: async () => {
          const response = await fetch('/api/food/schedule?page=1&limit=10');
          const data = await response.json();
          return response.ok && Array.isArray(data.schedules);
        }
      },
      {
        name: 'Get suppliers',
        test: async () => {
          const response = await fetch('/api/food/suppliers?page=1&limit=10');
          const data = await response.json();
          return response.ok && Array.isArray(data.suppliers);
        }
      }
    ];

    return this.runTests('Food Management API', tests);
  }

  // Test goshala manager APIs
  async testGoshalaManagerAPI() {
    const tests = [
      {
        name: 'Get cows list',
        test: async () => {
          const response = await fetch('/api/goshala-manager/cows?page=1&limit=10');
          const data = await response.json();
          return response.ok && Array.isArray(data.cows);
        }
      },
      {
        name: 'Get health treatments',
        test: async () => {
          const response = await fetch('/api/goshala-manager/health/treatments?page=1&limit=10');
          const data = await response.json();
          return response.ok && Array.isArray(data.treatments);
        }
      },
      {
        name: 'Get vaccinations',
        test: async () => {
          const response = await fetch('/api/goshala-manager/health/vaccinations?page=1&limit=10');
          const data = await response.json();
          return response.ok && Array.isArray(data.vaccinations);
        }
      },
      {
        name: 'Get alerts summary',
        test: async () => {
          const response = await fetch('/api/goshala-manager/alerts/summary');
          const data = await response.json();
          return response.ok && typeof data === 'object';
        }
      }
    ];

    return this.runTests('Goshala Manager API', tests);
  }

  // Test doctor APIs
  async testDoctorAPI() {
    const tests = [
      {
        name: 'Get medicines',
        test: async () => {
          const response = await fetch('/api/doctor/medicines?page=1&limit=10');
          const data = await response.json();
          return response.ok && Array.isArray(data.medicines);
        }
      },
      {
        name: 'Get appointments',
        test: async () => {
          const response = await fetch('/api/doctor/appointments?page=1&limit=10');
          const data = await response.json();
          return response.ok && Array.isArray(data.appointments);
        }
      }
    ];

    return this.runTests('Doctor API', tests);
  }

  // Test admin APIs
  async testAdminAPI() {
    const tests = [
      {
        name: 'Get users list',
        test: async () => {
          const response = await fetch('/api/admin/users?page=1&limit=10');
          const data = await response.json();
          return response.ok && Array.isArray(data.users);
        }
      },
      {
        name: 'Get system settings',
        test: async () => {
          const response = await fetch('/api/admin/settings');
          const data = await response.json();
          return response.ok && typeof data === 'object';
        }
      },
      {
        name: 'Get activity logs',
        test: async () => {
          const response = await fetch('/api/admin/activity?limit=10');
          const data = await response.json();
          return response.ok && Array.isArray(data.activities);
        }
      }
    ];

    return this.runTests('Admin API', tests);
  }

  // Test rate limiting
  async testRateLimiting() {
    const tests = [
      {
        name: 'Rate limiting on POST requests',
        test: async () => {
          const csrfToken = await this.getCSRFToken();
          const requests = [];
          
          // Make multiple rapid requests
          for (let i = 0; i < 15; i++) {
            requests.push(
              fetch('/api/gate-logs', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-CSRF-Token': csrfToken
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                  type: 'entry',
                  visitorName: `Test Visitor ${i}`,
                  purpose: 'test',
                  at: new Date().toISOString()
                })
              })
            );
          }
          
          const responses = await Promise.all(requests);
          const rateLimited = responses.some(r => r.status === 429);
          return rateLimited;
        }
      }
    ];

    return this.runTests('Rate Limiting', tests);
  }

  // Test CSRF protection
  async testCSRFProtection() {
    const tests = [
      {
        name: 'CSRF protection on POST requests',
        test: async () => {
          const response = await fetch('/api/gate-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              type: 'entry',
              visitorName: 'Test Visitor',
              purpose: 'test',
              at: new Date().toISOString()
            })
          });
          return response.status === 403;
        }
      },
      {
        name: 'CSRF token validation',
        test: async () => {
          const response = await fetch('/api/gate-logs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': 'invalid-token'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
              type: 'entry',
              visitorName: 'Test Visitor',
              purpose: 'test',
              at: new Date().toISOString()
            })
          });
          return response.status === 403;
        }
      }
    ];

    return this.runTests('CSRF Protection', tests);
  }

  // Test data validation
  async testDataValidation() {
    const tests = [
      {
        name: 'Invalid data rejection',
        test: async () => {
          const csrfToken = await this.getCSRFToken();
          const response = await fetch('/api/gate-logs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken
            },
            credentials: 'same-origin',
            body: JSON.stringify({
              type: 'invalid-type',
              visitorName: '',
              purpose: 'test'
            })
          });
          return response.status === 400;
        }
      },
      {
        name: 'Required field validation',
        test: async () => {
          const csrfToken = await this.getCSRFToken();
          const response = await fetch('/api/gate-logs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken
            },
            credentials: 'same-origin',
            body: JSON.stringify({
              type: 'entry'
              // Missing required fields
            })
          });
          return response.status === 400;
        }
      }
    ];

    return this.runTests('Data Validation', tests);
  }

  // Test error handling
  async testErrorHandling() {
    const tests = [
      {
        name: '404 for non-existent resources',
        test: async () => {
          const response = await fetch('/api/gate-logs/non-existent-id');
          return response.status === 404;
        }
      },
      {
        name: '405 for unsupported methods',
        test: async () => {
          const response = await fetch('/api/gate-logs', {
            method: 'PUT'
          });
          return response.status === 405;
        }
      }
    ];

    return this.runTests('Error Handling', tests);
  }

  // Helper methods
  async getCSRFToken() {
    try {
      const response = await fetch('/api/csrf', {
        credentials: 'same-origin'
      });
      const data = await response.json();
      return data.token;
    } catch {
      return '';
    }
  }

  async runTests(suiteName, tests) {
    const results = {
      suite: suiteName,
      tests: [],
      passed: 0,
      failed: 0,
      total: tests.length
    };

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const passed = await test.test();
        const duration = Date.now() - startTime;
        
        results.tests.push({
          name: test.name,
          passed,
          duration,
          error: null
        });
        
        if (passed) {
          results.passed++;
        } else {
          results.failed++;
        }
      } catch (error) {
        results.tests.push({
          name: test.name,
          passed: false,
          duration: 0,
          error: error.message
        });
        results.failed++;
      }
    }

    this.testResults.push(results);
    return results;
  }

  async runAllTests() {
    if (this.isRunning) {
      throw new Error('Tests are already running');
    }

    this.isRunning = true;
    this.testResults = [];

    try {
      console.log('Starting API test suite...');
      
      await this.testAuthentication();
      await this.testGateLogsAPI();
      await this.testFoodManagementAPI();
      await this.testGoshalaManagerAPI();
      await this.testDoctorAPI();
      await this.testAdminAPI();
      await this.testRateLimiting();
      await this.testCSRFProtection();
      await this.testDataValidation();
      await this.testErrorHandling();

      const summary = this.getTestSummary();
      console.log('API test suite completed:', summary);
      
      return summary;
    } finally {
      this.isRunning = false;
    }
  }

  getTestSummary() {
    const totalTests = this.testResults.reduce((sum, suite) => sum + suite.total, 0);
    const totalPassed = this.testResults.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = this.testResults.reduce((sum, suite) => sum + suite.failed, 0);
    
    return {
      totalSuites: this.testResults.length,
      totalTests,
      totalPassed,
      totalFailed,
      successRate: totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(2) : 0,
      results: this.testResults
    };
  }

  getDetailedResults() {
    return this.testResults;
  }
}

// Create singleton instance
const apiTestingSuite = new APITestingSuite();

export default apiTestingSuite;
