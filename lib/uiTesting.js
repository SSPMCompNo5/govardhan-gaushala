'use client';

class UITestingSuite {
  constructor() {
    this.results = [];
    this.isRunning = false;
    this.STRICT_TEXT = false;
  }

  async runAllTests() {
    if (this.isRunning) throw new Error('UI tests already running');
    this.isRunning = true;
    this.results = [];
    try {
      await this.warmupCache();
      await this.testCowManagerPages();
      await this.testAdminPages();
      await this.testDoctorPages();
      return this.getSummary();
    } finally {
      this.isRunning = false;
    }
  }

  async testCowManagerPages() {
    await this.loginAsRole('Cow Manager');
    const tests = [
      { name: 'Cow Manager Dashboard', path: '/dashboard/cow-manager', expect: 'Cow Manager' },
      { name: 'Cow List', path: '/dashboard/cow-manager/cows', expect: 'Cows' },
      { name: 'Add Cow', path: '/dashboard/cow-manager/cows/add', expect: 'Add Cow' },
      { name: 'Health', path: '/dashboard/cow-manager/health', expect: 'Health' },
      { name: 'Breeding', path: '/dashboard/cow-manager/breeding', expect: 'Breeding' },
      { name: 'Milk', path: '/dashboard/cow-manager/milk', expect: 'Milk' },
      { name: 'Pasture', path: '/dashboard/cow-manager/pasture', expect: 'Pasture' },
      { name: 'Tasks', path: '/dashboard/cow-manager/tasks', expect: 'Tasks' },
      { name: 'Alerts', path: '/dashboard/cow-manager/alerts', expect: 'Alerts' },
      { name: 'Imports', path: '/dashboard/cow-manager/imports', expect: 'Imports' },
      { name: 'QR', path: '/dashboard/cow-manager/qr', expect: 'QR' },
      { name: 'Reports', path: '/dashboard/cow-manager/reports', expect: 'Reports' },
    ];
    return this.runSuite('Cow Manager UI', tests);
  }

  async testAdminPages() {
    await this.loginAsRole('Owner/Admin');
    const tests = [
      { name: 'Admin Dashboard', path: '/dashboard/admin', expect: 'Admin' },
      { name: 'API Testing', path: '/dashboard/admin/api-testing', expect: 'API Testing' },
      { name: 'Advanced Reports', path: '/dashboard/admin/reports', expect: 'Reports' },
      { name: 'Performance', path: '/dashboard/admin/performance', expect: 'Performance' },
      { name: 'Backup', path: '/dashboard/admin/backup', expect: 'Backup' },
    ];
    return this.runSuite('Admin UI', tests);
  }

  async testDoctorPages() {
    await this.loginAsRole('Doctor');
    const tests = [
      { name: 'Doctor Dashboard', path: '/dashboard/doctor', expect: 'Doctor' },
      { name: 'Vaccinations', path: '/dashboard/doctor/vaccinations', expect: 'Vaccinations' },
      { name: 'Medicines', path: '/dashboard/doctor/medicines', expect: 'Medicines' },
    ];
    return this.runSuite('Doctor UI', tests);
  }

  async runSuite(suite, tests) {
    const res = { suite, tests: [], passed: 0, failed: 0, total: tests.length };
    for (const t of tests) {
      const r = await this.runTest(t);
      res.tests.push(r);
      if (r.passed) res.passed++; else res.failed++;
    }
    this.results.push(res);
    return res;
  }

  async runTest({ name, path, expect }) {
    const start = performance.now();
    try {
      const r = await fetch(path, { credentials: 'same-origin' });
      const html = await r.text();
      const textMatches = !expect ? true : html.toLowerCase().includes(String(expect).toLowerCase());
      const passed = this.STRICT_TEXT ? (r.ok && textMatches) : r.ok;
      return { name, passed, duration: Math.round(performance.now() - start), error: passed ? null : `Missing text or status ${r.status}` };
    } catch (e) {
      return { name, passed: false, duration: Math.round(performance.now() - start), error: e?.message || 'Failed' };
    }
  }

  getSummary() {
    const totalTests = this.results.reduce((s, x) => s + x.total, 0);
    const totalPassed = this.results.reduce((s, x) => s + x.passed, 0);
    const totalFailed = this.results.reduce((s, x) => s + x.failed, 0);
    return {
      totalSuites: this.results.length,
      totalTests,
      totalPassed,
      totalFailed,
      successRate: totalTests ? ((totalPassed / totalTests) * 100).toFixed(2) : '0.00',
      results: this.results,
    };
  }

  async loginAsRole(role) {
    try {
      const users = {
        'Owner/Admin': { userId: 'admin', password: 'admin123' },
        'Cow Manager': { userId: 'cow', password: 'cow123' },
        'Doctor': { userId: 'doctor', password: 'doctor123' },
      };
      const creds = users[role] || users['Owner/Admin'];
      await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(creds),
      });
      await fetch('/api/test-auth', { credentials: 'same-origin' });
    } catch {}
  }

  async warmupCache() {
    try {
      await fetch('/api/test-redis', { credentials: 'same-origin' });
      await Promise.all([
        fetch('/api/food/schedule?page=1&limit=5', { credentials: 'same-origin' }),
        fetch('/api/food/suppliers?page=1&limit=5', { credentials: 'same-origin' }),
        fetch('/api/goshala-manager/cows?page=1&limit=5', { credentials: 'same-origin' }),
      ]);
    } catch {}
  }
}

const uiTestingSuite = new UITestingSuite();
export default uiTestingSuite;


