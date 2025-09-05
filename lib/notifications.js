'use client';

import { toast } from 'sonner';

class NotificationService {
  constructor() {
    if (typeof window === 'undefined') {
      // Server-side mock implementation
      return {
        permission: null,
        isSupported: false,
        showNotification: () => {},
        showAlertNotification: () => {},
        showVisitorNotification: () => {},
        showHealthAlertNotification: () => {},
        showLowStockNotification: () => {},
        scheduleRecurringNotification: () => {},
        clearAllNotifications: () => {},
        requestPermission: () => Promise.resolve(false)
      };
    }

    this.permission = null;
    this.isSupported = 'Notification' in window;
    this.init();
  }

  async init() {
    if (!this.isSupported) {
      console.warn('Notifications are not supported in this browser');
      return;
    }

    this.permission = Notification.permission;
    
    if (this.permission === 'default') {
      await this.requestPermission();
    }
  }

  async requestPermission() {
    if (!this.isSupported) return false;

    try {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async showNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      // Fallback to toast notification
      toast.info(title, {
        description: options.body,
        duration: 5000,
      });
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: options.tag || 'goshala-notification',
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        ...options
      });

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options.onClick) {
          options.onClick();
        }
      };

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      // Fallback to toast
      toast.error(title, {
        description: options.body,
        duration: 5000,
      });
    }
  }

  // Specific notification types for the Goshala system
  async showAlertNotification(alert) {
    return this.showNotification(
      `🚨 ${alert.title || 'Alert'}`,
      {
        body: alert.message || alert.description,
        tag: `alert-${alert.id}`,
        requireInteraction: alert.type === 'critical',
        icon: this.getAlertIcon(alert.type),
        onClick: () => {
          window.location.href = '/dashboard/goshala-manager/alerts';
        }
      }
    );
  }

  async showVisitorNotification(visitor) {
    return this.showNotification(
      `👤 New Visitor: ${visitor.name}`,
      {
        body: `Purpose: ${visitor.purpose} • Time: ${visitor.entryTime}`,
        tag: `visitor-${visitor.id}`,
        icon: '/icons/shortcut-entry.png',
        onClick: () => {
          window.location.href = '/dashboard/watchman/activity';
        }
      }
    );
  }

  async showHealthAlertNotification(alert) {
    return this.showNotification(
      `🏥 Health Alert: ${alert.cowName}`,
      {
        body: alert.message,
        tag: `health-${alert.id}`,
        requireInteraction: alert.severity === 'critical',
        icon: '/icons/shortcut-treatment.png',
        onClick: () => {
          window.location.href = '/dashboard/doctor/patients';
        }
      }
    );
  }

  async showLowStockNotification(item) {
    return this.showNotification(
      `📦 Low Stock Alert`,
      {
        body: `${item.name} is running low (${item.quantity} remaining)`,
        tag: `stock-${item.id}`,
        icon: '/icons/shortcut-alerts.png',
        onClick: () => {
          window.location.href = '/dashboard/food-manager/inventory';
        }
      }
    );
  }

  getAlertIcon(type) {
    switch (type) {
      case 'critical': return '/icons/icon-192x192.png'; // Red icon
      case 'warning': return '/icons/icon-192x192.png'; // Yellow icon
      case 'info': return '/icons/icon-192x192.png'; // Blue icon
      default: return '/icons/icon-192x192.png';
    }
  }

  // Schedule recurring notifications
  scheduleRecurringNotification(title, body, intervalMinutes = 60) {
    if (!this.isSupported || this.permission !== 'granted') return;

    setInterval(() => {
      this.showNotification(title, { body });
    }, intervalMinutes * 60 * 1000);
  }

  // Clear all notifications
  clearAllNotifications() {
    if ('serviceWorker' in navigator && 'getRegistrations' in navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.showNotification = () => Promise.resolve();
        });
      });
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;

// Export individual methods for convenience
export const {
  requestPermission,
  showNotification,
  showAlertNotification,
  showVisitorNotification,
  showHealthAlertNotification,
  showLowStockNotification,
  scheduleRecurringNotification,
  clearAllNotifications
} = notificationService;
