'use client';

class OfflineSyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.pendingActions = [];
    this.syncInProgress = false;
    this.init();
  }

  init() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Try to sync pending actions when coming online
    if (this.isOnline) {
      this.syncPendingActions();
    }
  }

  handleOnline() {
    this.isOnline = true;
    console.log('Connection restored - syncing pending actions');
    this.syncPendingActions();
  }

  handleOffline() {
    this.isOnline = false;
    console.log('Connection lost - actions will be queued');
  }

  // Queue an action for later sync
  queueAction(action) {
    const actionWithTimestamp = {
      ...action,
      timestamp: new Date().toISOString(),
      id: this.generateId()
    };

    this.pendingActions.push(actionWithTimestamp);
    this.savePendingActions();

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncPendingActions();
    }

    return actionWithTimestamp.id;
  }

  // Sync all pending actions
  async syncPendingActions() {
    if (this.syncInProgress || !this.isOnline || this.pendingActions.length === 0) {
      return;
    }

    this.syncInProgress = true;
    console.log(`Syncing ${this.pendingActions.length} pending actions`);

    const actionsToSync = [...this.pendingActions];
    const successfulActions = [];
    const failedActions = [];

    for (const action of actionsToSync) {
      try {
        await this.executeAction(action);
        successfulActions.push(action);
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        failedActions.push(action);
      }
    }

    // Update pending actions list
    this.pendingActions = failedActions;
    this.savePendingActions();

    this.syncInProgress = false;

    if (successfulActions.length > 0) {
      console.log(`Successfully synced ${successfulActions.length} actions`);
    }

    if (failedActions.length > 0) {
      console.warn(`${failedActions.length} actions failed to sync and will be retried`);
    }
  }

  // Execute a single action
  async executeAction(action) {
    const { method, url, data, headers } = action;

    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data && method !== 'GET') {
      fetchOptions.body = JSON.stringify(data);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Specific action creators for common operations
  createGateLogAction(type, data) {
    return {
      method: 'POST',
      url: '/api/gate-logs',
      data: { type, ...data },
      headers: this.getAuthHeaders()
    };
  }

  createFeedingLogAction(data) {
    return {
      method: 'POST',
      url: '/api/food/feeding-logs',
      data,
      headers: this.getAuthHeaders()
    };
  }

  createTreatmentAction(data) {
    return {
      method: 'POST',
      url: '/api/doctor/treatments',
      data,
      headers: this.getAuthHeaders()
    };
  }

  createInventoryUpdateAction(itemId, data) {
    return {
      method: 'PATCH',
      url: `/api/food/inventory/${itemId}`,
      data,
      headers: this.getAuthHeaders()
    };
  }

  // Get authentication headers
  getAuthHeaders() {
    // In a real app, you'd get the auth token from your auth system
    const token = localStorage.getItem('auth-token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // Save pending actions to localStorage
  savePendingActions() {
    try {
      localStorage.setItem('goshala-pending-actions', JSON.stringify(this.pendingActions));
    } catch (error) {
      console.error('Failed to save pending actions:', error);
    }
  }

  // Load pending actions from localStorage
  loadPendingActions() {
    try {
      const stored = localStorage.getItem('goshala-pending-actions');
      if (stored) {
        this.pendingActions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load pending actions:', error);
      this.pendingActions = [];
    }
  }

  // Generate unique ID for actions
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get pending actions count
  getPendingCount() {
    return this.pendingActions.length;
  }

  // Clear all pending actions (use with caution)
  clearPendingActions() {
    this.pendingActions = [];
    this.savePendingActions();
  }

  // Get sync status
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      pendingCount: this.pendingActions.length,
      syncInProgress: this.syncInProgress
    };
  }
}

// Create singleton instance
const offlineSyncService = new OfflineSyncService();

export default offlineSyncService;

// Export individual methods for convenience
export const {
  queueAction,
  syncPendingActions,
  createGateLogAction,
  createFeedingLogAction,
  createTreatmentAction,
  createInventoryUpdateAction,
  getPendingCount,
  clearPendingActions,
  getSyncStatus
} = offlineSyncService;
