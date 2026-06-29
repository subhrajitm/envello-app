import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '@envello/core';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: Notification['type'];
}

@Component({
  selector: 'env-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack">
      @for (toast of toasts(); track toast.id) {
        <div class="toast" [class]="'toast--' + toast.type" (click)="dismiss(toast.id)">
          <span class="material-symbols-outlined toast-icon">{{ iconFor(toast.type) }}</span>
          <div class="toast-body">
            <span class="toast-title">{{ toast.title }}</span>
            @if (toast.message) {
              <span class="toast-msg">{{ toast.message }}</span>
            }
          </div>
          <button class="toast-close" (click)="dismiss(toast.id)">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: var(--z-notification);
      display: flex;
      flex-direction: column-reverse;
      gap: 10px;
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 10px;
      min-width: 260px;
      max-width: 380px;
      border: 1px solid var(--border-main);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      pointer-events: all;
      animation: toast-in 0.22s ease;
      background: var(--bg-panel);
      color: var(--text-primary);
    }
    @keyframes toast-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .toast--success { border-left: 3px solid var(--accent-green, #22c55e); }
    .toast--error   { border-left: 3px solid var(--accent-red,   #ef4444); }
    .toast--warning { border-left: 3px solid var(--accent-yellow, #f59e0b); }
    .toast--info    { border-left: 3px solid var(--accent-blue,   #3b82f6); }
    .toast-icon {
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .toast--success .toast-icon { color: var(--accent-green,  #22c55e); }
    .toast--error   .toast-icon { color: var(--accent-red,    #ef4444); }
    .toast--warning .toast-icon { color: var(--accent-yellow, #f59e0b); }
    .toast--info    .toast-icon { color: var(--accent-blue,   #3b82f6); }
    .toast-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .toast-title {
      font-size: var(--text-md, 13px);
      font-weight: 600;
      line-height: 1.3;
      color: var(--text-primary);
    }
    .toast-msg {
      font-size: var(--text-sm, 12px);
      color: var(--text-secondary);
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .toast-close {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-tertiary);
      padding: 0;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      transition: color 0.15s;
    }
    .toast-close:hover { color: var(--text-primary); }
    .toast-close .material-symbols-outlined { font-size: 16px; }
  `],
})
export class ToastComponent {
  private notify = inject(NotificationService);

  toasts = signal<Toast[]>([]);

  private prevCount = 0;
  private initialized = false;

  constructor() {
    effect(() => {
      const all = this.notify.allNotifications();
      if (!this.initialized) {
        // Seed with current count so pre-existing notifications don't toast on load
        this.prevCount = all.length;
        this.initialized = true;
        return;
      }
      if (all.length > this.prevCount) {
        this.show(all[0]);
      }
      this.prevCount = all.length;
    });
  }

  iconFor(type: Notification['type']): string {
    const icons: Record<string, string> = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info',
    };
    return icons[type] ?? 'info';
  }

  show(n: Notification) {
    const toast: Toast = { id: n.id, title: n.title, message: n.message, type: n.type };
    this.toasts.update(t => [...t, toast]);
    setTimeout(() => this.dismiss(n.id), 5000);
  }

  dismiss(id: string) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}
