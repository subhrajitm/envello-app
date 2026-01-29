import { Injectable, inject, signal } from '@angular/core';
import { TauriService } from '../core/services/tauri.service';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  actionCallback?: () => void;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private tauriService = inject(TauriService);
  private notifications = signal<Notification[]>([]);

  // Public read-only signal
  allNotifications = this.notifications.asReadonly();

  // Computed values
  unreadCount = signal(0);

  constructor() {
    // Load notifications from localStorage
    this.loadNotifications();

    // Add some demo notifications for testing
    this.addDemoNotifications();
  }

  // Add a new notification
  add(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): string {
    const id = this.generateId();
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false
    };

    this.notifications.update(notifications => [newNotification, ...notifications]);
    this.updateUnreadCount();
    this.saveNotifications();

    // Show browser notification if enabled
    this.showBrowserNotification(newNotification);

    return id;
  }

  // Convenience methods for different notification types
  info(title: string, message: string, options?: Partial<Notification>) {
    return this.add({ type: 'info', title, message, ...options });
  }

  success(title: string, message: string, options?: Partial<Notification>) {
    return this.add({ type: 'success', title, message, ...options });
  }

  warning(title: string, message: string, options?: Partial<Notification>) {
    return this.add({ type: 'warning', title, message, ...options });
  }

  error(title: string, message: string, options?: Partial<Notification>) {
    return this.add({ type: 'error', title, message, ...options });
  }

  // Mark notification as read
  markAsRead(id: string) {
    this.notifications.update(notifications =>
      notifications.map(n => n.id === id ? { ...n, read: true } : n)
    );
    this.updateUnreadCount();
    this.saveNotifications();
  }

  // Mark all as read
  markAllAsRead() {
    this.notifications.update(notifications =>
      notifications.map(n => ({ ...n, read: true }))
    );
    this.updateUnreadCount();
    this.saveNotifications();
  }

  // Delete notification
  delete(id: string) {
    this.notifications.update(notifications =>
      notifications.filter(n => n.id !== id)
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
    this.notifications.update(notifications =>
      notifications.filter(n => !n.read)
    );
    this.updateUnreadCount();
    this.saveNotifications();
  }

  // Get notification by ID
  getById(id: string): Notification | undefined {
    return this.notifications().find(n => n.id === id);
  }

  // Get unread notifications
  getUnread(): Notification[] {
    return this.notifications().filter(n => !n.read);
  }

  // Private methods
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateUnreadCount() {
    const count = this.notifications().filter(n => !n.read).length;
    this.unreadCount.set(count);
  }

  private saveNotifications() {
    const data = this.notifications().map(n => ({
      ...n,
      timestamp: n.timestamp.toISOString()
    }));
    localStorage.setItem('envello-notifications', JSON.stringify(data));
  }

  private loadNotifications() {
    const saved = localStorage.getItem('envello-notifications');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const notifications = data.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        this.notifications.set(notifications);
        this.updateUnreadCount();
      } catch (e) {
        console.error('Failed to load notifications:', e);
      }
    }
  }

  private showBrowserNotification(notification: Notification) {
    // When running in Tauri, use native desktop notification
    if (this.tauriService.isTauri()) {
      this.tauriService.notify({ title: notification.title, body: notification.message }).catch(() => {});
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
        badge: '/favicon.ico'
      });
    }
  }

  private addDemoNotifications() {
    // Only add demo notifications if there are no existing ones
    if (this.notifications().length === 0) {
      this.info(
        'Welcome to Envello',
        'Your all-in-one creative workspace is ready to use!',
        { icon: 'celebration' }
      );

      this.success(
        'Auto-save Enabled',
        'Your work will be automatically saved every 30 seconds',
        { icon: 'cloud_done' }
      );

      this.warning(
        'Storage Warning',
        'You are using 75% of your local storage quota',
        {
          icon: 'storage',
          actionLabel: 'Manage Storage',
          actionCallback: () => console.log('Navigate to storage settings')
        }
      );
    }
  }
}
