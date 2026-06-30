import { Component, inject, signal, effect } from '@angular/core';
import { NotificationService, Notification } from '@envello/core';

const DURATION_MS  = 4500;
const MAX_VISIBLE  = 5;

// Icon + gap kept as constants so the message indent always aligns with the title.
const ICON_PX  = 16;
const GAP_PX   = 8;
const INDENT   = ICON_PX + GAP_PX;   // 24 px

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
  imports: [],
  template: `
    <div class="toast-stack" role="region" aria-label="Notifications" aria-live="polite">
      @for (toast of toasts(); track toast.id) {
        <div
          class="toast"
          [class]="'toast--' + toast.type"
          [class.toast--leaving]="toast.leaving"
          role="alert"
        >
          <!-- Close -->
          <button class="toast-close" (click)="dismiss(toast.id)" aria-label="Dismiss">
            <span class="material-symbols-outlined">close</span>
          </button>

          <!-- Header: type icon + title + optional AI chip -->
          <div class="toast-header">
            <span class="material-symbols-outlined toast-icon">{{ toast.icon }}</span>
            <span class="toast-title">{{ toast.title }}</span>
            @if (toast.isAi) {
              <span class="toast-ai-chip" title="AI-generated">
                <span class="material-symbols-outlined">auto_awesome</span>
              </span>
            }
          </div>

          <!-- Body -->
          @if (toast.message) {
            <p class="toast-body">{{ toast.message }}</p>
          }

          <!-- Progress bar -->
          <div class="toast-progress"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* ── Stack ─────────────────────────────────────────────────── */
    .toast-stack {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: var(--z-notification);
      display: flex;
      flex-direction: column-reverse;
      gap: 8px;
      pointer-events: none;
      width: 340px;
    }

    /* ── Card ──────────────────────────────────────────────────── */
    .toast {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 12px 36px 12px 14px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
      border-left-width: 3px;
      background: var(--bg-panel);
      box-shadow:
        0 1px 3px rgba(0,0,0,0.08),
        0 6px 20px rgba(0,0,0,0.12);
      pointer-events: all;
      overflow: hidden;
      font-family: var(--font-sans);
      animation: toast-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    .toast--leaving {
      animation: toast-out 0.2s cubic-bezier(0.4, 0, 1, 1) forwards;
    }

    /* Left accent stripe by type */
    .toast--success { border-left-color: var(--accent-green); }
    .toast--error   { border-left-color: var(--accent-red); }
    .toast--warning { border-left-color: var(--accent-yellow); }
    .toast--info    { border-left-color: var(--accent-blue); }

    @keyframes toast-in {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes toast-out {
      from { opacity: 1; transform: translateY(0);    max-height: 120px; margin-bottom: 0; }
      to   { opacity: 0; transform: translateY(-6px); max-height: 0;     margin-bottom: -8px; padding-top: 0; padding-bottom: 0; }
    }

    /* ── Close ─────────────────────────────────────────────────── */
    .toast-close {
      position: absolute;
      top: 10px;
      right: 10px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-tertiary);
      padding: 2px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      transition: color 0.12s, background 0.12s;
      line-height: 1;
    }
    .toast-close:hover {
      color: var(--text-primary);
      background: var(--bg-hover);
    }
    .toast-close .material-symbols-outlined { font-size: 14px; }

    /* ── Header row ─────────────────────────────────────────────── */
    .toast-header {
      display: flex;
      align-items: center;
      gap: ${GAP_PX}px;
      margin-bottom: 4px;
    }

    .toast-icon {
      font-size: ${ICON_PX}px;
      flex-shrink: 0;
      line-height: 1;
    }
    .toast--success .toast-icon { color: var(--accent-green); }
    .toast--error   .toast-icon { color: var(--accent-red); }
    .toast--warning .toast-icon { color: var(--accent-yellow); }
    .toast--info    .toast-icon { color: var(--accent-blue); }

    .toast-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.3;
      flex: 1;
      min-width: 0;
    }

    .toast-ai-chip {
      display: inline-flex;
      align-items: center;
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--bg-hover);
      border: 1px solid var(--border-subtle);
      flex-shrink: 0;
    }
    .toast-ai-chip .material-symbols-outlined {
      font-size: 11px;
      color: var(--text-tertiary);
    }

    /* ── Body — indented to align under title ───────────────────── */
    .toast-body {
      margin: 0 0 0 ${INDENT}px;
      font-size: 12px;
      font-weight: 400;
      color: var(--text-secondary);
      line-height: 1.5;
      word-break: break-word;
    }

    /* ── Progress bar ───────────────────────────────────────────── */
    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      border-radius: 0 1px 1px 0;
      animation: toast-progress ${DURATION_MS}ms linear forwards;
    }
    .toast--success .toast-progress { background: var(--accent-green); }
    .toast--error   .toast-progress { background: var(--accent-red); }
    .toast--warning .toast-progress { background: var(--accent-yellow); }
    .toast--info    .toast-progress { background: var(--accent-blue); }

    @keyframes toast-progress {
      from { width: 100%; opacity: 0.5; }
      to   { width: 0;    opacity: 0.5; }
    }

    /* ── Responsive ─────────────────────────────────────────────── */
    @media (max-width: 480px) {
      .toast-stack {
        left: 12px;
        right: 12px;
        width: auto;
        bottom: 12px;
      }
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

  private iconFor(type: Notification['type']): string {
    const icons: Record<string, string> = {
      success: 'check_circle',
      error:   'cancel',
      warning: 'warning',
      info:    'info',
    };
    return icons[type] ?? 'info';
  }

  show(n: Notification) {
    const toast: Toast = {
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      icon: n.icon ?? this.iconFor(n.type),
      isAi: !!n.isAi,
      leaving: false,
    };

    this.toasts.update(t => {
      const updated = [...t, toast];
      // Cap visible toasts — remove oldest if over limit
      return updated.length > MAX_VISIBLE ? updated.slice(updated.length - MAX_VISIBLE) : updated;
    });

    setTimeout(() => this.dismiss(n.id), DURATION_MS);
  }

  dismiss(id: string) {
    this.toasts.update(t => t.map(x => x.id === id ? { ...x, leaving: true } : x));
    setTimeout(() => this.toasts.update(t => t.filter(x => x.id !== id)), 210);
  }
}
