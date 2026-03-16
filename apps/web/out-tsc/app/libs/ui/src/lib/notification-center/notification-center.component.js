import { __decorate } from 'tslib';
import {
  Component,
  signal,
  computed,
  inject,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { NotificationService } from '@envello/core';
let NotificationCenterComponent = class NotificationCenterComponent {
  notificationService = inject(NotificationService);
  isOpen = signal(false);
  activeTab = signal('all');
  // Get notifications from service
  notifications = this.notificationService.allNotifications;
  unreadCount = this.notificationService.unreadCount;
  // Filtered notifications based on active tab
  filteredNotifications = computed(() => {
    const all = this.notifications();
    if (this.activeTab() === 'unread') {
      return all.filter((n) => !n.read);
    }
    return all;
  });
  open() {
    this.isOpen.set(true);
  }
  close() {
    this.isOpen.set(false);
  }
  toggle() {
    this.isOpen.set(!this.isOpen());
  }
  setActiveTab(tab) {
    this.activeTab.set(tab);
  }
  markAsRead(id) {
    this.notificationService.markAsRead(id);
  }
  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }
  deleteNotification(id) {
    this.notificationService.delete(id);
  }
  clearAll() {
    if (confirm('Are you sure you want to clear all notifications?')) {
      this.notificationService.clearAll();
    }
  }
  clearRead() {
    this.notificationService.clearRead();
  }
  handleNotificationClick(notification) {
    if (!notification.read) {
      this.markAsRead(notification.id);
    }
  }
  handleAction(notification, event) {
    event.stopPropagation();
    if (notification.actionCallback) {
      notification.actionCallback();
    }
    this.markAsRead(notification.id);
  }
  getDefaultIcon(type) {
    const icons = {
      info: 'info',
      success: 'check_circle',
      warning: 'warning',
      error: 'error',
    };
    return icons[type];
  }
  getRelativeTime(date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }
  handleEscape(event) {
    if (this.isOpen()) {
      event.preventDefault();
      this.close();
    }
  }
};
__decorate(
  [HostListener('document:keydown.escape', ['$event'])],
  NotificationCenterComponent.prototype,
  'handleEscape',
  null,
);
NotificationCenterComponent = __decorate(
  [
    Component({
      selector: 'app-notification-center',
      standalone: true,
      imports: [CommonModule],
      templateUrl: './notification-center.component.html',
      styleUrl: './notification-center.component.css',
      animations: [
        trigger('slideIn', [
          transition(':enter', [
            style({ transform: 'translateX(100%)', opacity: 0 }),
            animate(
              '200ms ease-out',
              style({ transform: 'translateX(0)', opacity: 1 }),
            ),
          ]),
          transition(':leave', [
            animate(
              '200ms ease-in',
              style({ transform: 'translateX(100%)', opacity: 0 }),
            ),
          ]),
        ]),
      ],
    }),
  ],
  NotificationCenterComponent,
);
export { NotificationCenterComponent };
