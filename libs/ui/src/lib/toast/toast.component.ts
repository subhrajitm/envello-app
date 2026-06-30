import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '@envello/core';

const DURATION_MS = 5000;
const ICON_SIZE = 22;   // px — keep in sync with .toast-type-icon font-size
const ICON_GAP  = 10;   // px — keep in sync with .toast-header gap

interface Toast {
  id: string;
  title: string;
  message: string;
  type: Notification['type'];
  icon: string;
  isAi: boolean;
  leaving: boolean;
}

@Component({
  selector: 'env-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack">
      @for (toast of toasts(); track toast.id) {
        <div class="toast" [class]="'toast--' + toast.type" [class.toast--leaving]="toast.leaving">

          <!-- Close -->
          <button class="toast-close" (click)="dismiss(toast.id)" title="Dismiss">
            <span class="material-symbols-outlined">close</span>
          </button>

          <!-- Header: type icon + optional AI badge + title -->
          <div class="toast-header">
            <span class="material-symbols-outlined toast-type-icon">{{ toast.icon }}</span>
            @if (toast.isAi) {
              <span class="material-symbols-outlined toast-ai-badge" title="AI-generated">auto_awesome</span>
            }
            <span class="toast-title">{{ toast.title }}</span>
          </div>

          <!-- Message — indented to align under title -->
          @if (toast.message) {
            <p class="toast-msg">{{ toast.message }}</p>
          }

          <!-- Progress bar -->
          <div class="toast-progress"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      bottom: 24px;
      right: 20px;
      z-index: var(--z-notification);
      display: flex;
      flex-direction: column-reverse;
      gap: 10px;
      pointer-events: none;
      width: 360px;
    }

    /* ── Card ───────────────────────────────────────────────── */
    .toast {
      position: relative;
      padding: 16px 40px 16px 18px;
      border-radius: 14px;
      border: 1px solid var(--border-main);
      background: var(--bg-element, #252525);
      box-shadow: 0 10px 36px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.18);
      pointer-events: all;
      overflow: hidden;
      font-family: var(--font-sans);
      animation: toast-in 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .toast--leaving {
      animation: toast-out 0.22s cubic-bezier(0.4, 0, 1, 1) forwards;
    }

    @keyframes toast-in {
      from { opacity: 0; transform: translateX(20px) scale(0.97); }
      to   { opacity: 1; transform: translateX(0)    scale(1); }
    }

    @keyframes toast-out {
      from { opacity: 1; transform: translateX(0)    scale(1);    max-height: 200px; padding-top: 16px; padding-bottom: 16px; }
      to   { opacity: 0; transform: translateX(28px) scale(0.95); max-height: 0;     padding-top: 0;    padding-bottom: 0; }
    }

    /* ── Close ──────────────────────────────────────────────── */
    .toast-close {
      position: absolute;
      top: 14px;
      right: 12px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-tertiary);
      padding: 2px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      transition: color 0.12s, background 0.12s;
    }
    .toast-close:hover {
      color: var(--text-primary);
      background: var(--bg-hover);
    }
    .toast-close .material-symbols-outlined { font-size: 14px; }

    /* ── Header row ─────────────────────────────────────────── */
    .toast-header {
      display: flex;
      align-items: center;
      gap: ${ICON_GAP}px;
      margin-bottom: 8px;
    }

    .toast-type-icon {
      font-size: ${ICON_SIZE}px;
      flex-shrink: 0;
      line-height: 1;
    }
    .toast--success .toast-type-icon { color: var(--accent-green); }
    .toast--error   .toast-type-icon { color: var(--accent-red); }
    .toast--warning .toast-type-icon { color: var(--accent-yellow); }
    .toast--info    .toast-type-icon { color: var(--accent-blue); }

    .toast-ai-badge {
      font-size: 13px;
      color: var(--text-tertiary);
      flex-shrink: 0;
      opacity: 0.6;
    }

    .toast-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.25;
      flex: 1;
      min-width: 0;
    }

    /* ── Message — indent = icon width + gap ────────────────── */
    .toast-msg {
      margin: 0 0 0 ${ICON_SIZE + ICON_GAP}px;
      font-size: 13.5px;
      font-weight: 400;
      color: var(--text-secondary);
      line-height: 1.5;
      word-break: break-word;
    }

    /* ── Progress bar ───────────────────────────────────────── */
    .toast-progress {
      position: absolute;
      bottom: 0; left: 0;
      height: 2px;
      opacity: 0.5;
      border-radius: 0 1px 1px 0;
      animation: toast-progress ${DURATION_MS}ms linear forwards;
    }
    .toast--success .toast-progress { background: var(--accent-green); }
    .toast--error   .toast-progress { background: var(--accent-red); }
    .toast--warning .toast-progress { background: var(--accent-yellow); }
    .toast--info    .toast-progress { background: var(--accent-blue); }

    @keyframes toast-progress {
      from { width: 100%; }
      to   { width: 0; }
    }
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
      error:   'cancel',
      warning: 'warning',
      info:    'info',
    };
    return icons[type] ?? 'info';
  }

  show(n: Notification) {
    const toast: Toast = { id: n.id, title: n.title, message: n.message, type: n.type, icon: n.icon ?? this.iconFor(n.type), isAi: !!n.isAi, leaving: false };
    this.toasts.update(t => [...t, toast]);
    setTimeout(() => this.dismiss(n.id), DURATION_MS);
  }

  dismiss(id: string) {
    this.toasts.update(t => t.map(x => x.id === id ? { ...x, leaving: true } : x));
    setTimeout(() => this.toasts.update(t => t.filter(x => x.id !== id)), 220);
  }
}
