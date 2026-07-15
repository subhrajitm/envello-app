import { Component, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { NotificationService, Notification, NotificationType } from '@envello/core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { BadgeComponent } from '../badge/badge.component';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent, BadgeComponent],
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.css',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class NotificationCenterComponent {
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  isOpen = signal(false);
  activeTab = signal<'all' | 'unread'>('all');
  clearConfirm = signal(false);

  // Get notifications from service
  notifications = this.notificationService.allNotifications;
  unreadCount = this.notificationService.unreadCount;

  // Filtered notifications based on active tab
  filteredNotifications = computed(() => {
    const all = this.notifications();
    if (this.activeTab() === 'unread') {
      return all.filter(n => !n.read);
    }
    return all;
  });

  // Grouped by date bucket: Today | Yesterday | Earlier
  groupedNotifications = computed(() => {
    const items = this.filteredNotifications();
    const now = new Date();
    const todayStart     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);

    const groups: { label: string; items: Notification[] }[] = [
      { label: 'Today',     items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'Earlier',   items: [] },
    ];

    for (const n of items) {
      const ts = n.timestamp instanceof Date ? n.timestamp : new Date(n.timestamp);
      if (ts >= todayStart)     { groups[0].items.push(n); }
      else if (ts >= yesterdayStart) { groups[1].items.push(n); }
      else                      { groups[2].items.push(n); }
    }

    return groups.filter(g => g.items.length > 0);
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

  setActiveTab(tab: 'all' | 'unread') {
    this.activeTab.set(tab);
  }

  markAsRead(id: string) {
    this.notificationService.markAsRead(id);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  deleteNotification(id: string) {
    this.notificationService.delete(id);
  }

  clearAll() {
    this.clearConfirm.set(true);
  }

  doClearAll() {
    this.clearConfirm.set(false);
    this.notificationService.clearAll();
  }

  clearRead() {
    this.notificationService.clearRead();
  }

  handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      this.markAsRead(notification.id);
    }
    if (notification.link) {
      this.close();
      this.router.navigateByUrl(notification.link);
    }
  }

  handleAction(notification: Notification, event: Event) {
    event.stopPropagation();
    if (notification.actionCallback) {
      notification.actionCallback();
    }
    if (notification.link) {
      this.close();
      this.router.navigateByUrl(notification.link);
    }
    this.markAsRead(notification.id);
  }

  hasLink(notification: Notification): boolean {
    return !!(notification.link || notification.actionCallback);
  }

  getDefaultIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      info: 'info',
      success: 'check_circle',
      warning: 'warning',
      error: 'error'
    };
    return icons[type];
  }

  getRelativeTime(date: Date): string {
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

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: Event) {
    if (this.isOpen()) {
      event.preventDefault();
      this.close();
    }
  }
}
