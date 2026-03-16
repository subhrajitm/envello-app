import { __decorate } from 'tslib';
import { Injectable, inject, signal } from '@angular/core';
import { TauriService } from './tauri.service';
let NotificationService = class NotificationService {
  tauriService = inject(TauriService);
  notifications = signal([]);
  // Public read-only signal
  allNotifications = this.notifications.asReadonly();
  // Computed values
  unreadCount = signal(0);
  constructor() {
    this.loadNotifications();
  }
  // Add a new notification
  add(notification) {
    const id = this.generateId();
    const newNotification = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false,
    };
    this.notifications.update((notifications) => [
      newNotification,
      ...notifications,
    ]);
    this.updateUnreadCount();
    this.saveNotifications();
    // Show browser notification if enabled
    this.showBrowserNotification(newNotification);
    return id;
  }
  // Convenience methods for different notification types
  info(title, message, options) {
    return this.add({ type: 'info', title, message, ...options });
  }
  success(title, message, options) {
    return this.add({ type: 'success', title, message, ...options });
  }
  warning(title, message, options) {
    return this.add({ type: 'warning', title, message, ...options });
  }
  error(title, message, options) {
    return this.add({ type: 'error', title, message, ...options });
  }
  // Mark notification as read
  markAsRead(id) {
    this.notifications.update((notifications) =>
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    this.updateUnreadCount();
    this.saveNotifications();
  }
  // Mark all as read
  markAllAsRead() {
    this.notifications.update((notifications) =>
      notifications.map((n) => ({ ...n, read: true })),
    );
    this.updateUnreadCount();
    this.saveNotifications();
  }
  // Delete notification
  delete(id) {
    this.notifications.update((notifications) =>
      notifications.filter((n) => n.id !== id),
    );
    this.updateUnreadCount();
    this.saveNotifications();
  }
  // Clear all notifications
  clearAll() {
    this.notifications.set([]);
    this.updateUnreadCount();
    this.saveNotifications();
  }
  // Clear read notifications
  clearRead() {
    this.notifications.update((notifications) =>
      notifications.filter((n) => !n.read),
    );
    this.updateUnreadCount();
    this.saveNotifications();
  }
  // Get notification by ID
  getById(id) {
    return this.notifications().find((n) => n.id === id);
  }
  // Get unread notifications
  getUnread() {
    return this.notifications().filter((n) => !n.read);
  }
  // Private methods
  generateId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  updateUnreadCount() {
    const count = this.notifications().filter((n) => !n.read).length;
    this.unreadCount.set(count);
  }
  saveNotifications() {
    const data = this.notifications().map((n) => ({
      ...n,
      timestamp: n.timestamp.toISOString(),
    }));
    localStorage.setItem('envello-notifications', JSON.stringify(data));
  }
  loadNotifications() {
    const saved = localStorage.getItem('envello-notifications');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const notifications = data.map((n) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
        this.notifications.set(notifications);
        this.updateUnreadCount();
      } catch (e) {
        console.error('Failed to load notifications:', e);
      }
    }
  }
  showBrowserNotification(notification) {
    // When running in Tauri, use native desktop notification
    if (this.tauriService.isTauri()) {
      this.tauriService
        .notify({ title: notification.title, body: notification.message })
        .catch(() => {});
      return;
    }
    // Check if browser notifications are enabled in settings
    const settings = localStorage.getItem('envello-settings');
    let desktopNotificationsEnabled = false;
    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        desktopNotificationsEnabled = parsed.desktopNotifications || false;
      } catch (e) {
        // Ignore
      }
    }
    if (!desktopNotificationsEnabled || !('Notification' in window)) {
      return;
    }
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    }
  }
};
NotificationService = __decorate(
  [
    Injectable({
      providedIn: 'root',
    }),
  ],
  NotificationService,
);
export { NotificationService };
