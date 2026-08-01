import { Component, signal, OnInit, inject } from '@angular/core';
import { APP_VERSION } from '@envello/core';

const SEEN_VERSION_KEY = 'envello-last-seen-version';

interface ChangeEntry {
  icon: string;
  title: string;
  description: string;
  tag: 'new' | 'improved' | 'fix';
}

const CHANGELOG: Record<string, ChangeEntry[]> = {
  '0.1.2': [
    { icon: 'rocket_launch',  tag: 'new',      title: 'Sentry error tracking',       description: 'Crashes now surface in your Sentry dashboard with structured error codes for fast diagnosis.' },
    { icon: 'sync_problem',   tag: 'new',      title: 'Sync error visibility',        description: 'Sync failures now show an in-app toast with a Retry button. Pending upload count appears in the footer.' },
    { icon: 'swap_vert',      tag: 'improved', title: 'Task list performance',        description: 'Lists with 100+ tasks now window the DOM — smooth scrolling regardless of task count.' },
    { icon: 'shield',         tag: 'improved', title: 'XSS protection',               description: 'All user-facing HTML is now routed through Angular\'s DomSanitizer before rendering.' },
    { icon: 'notifications',  tag: 'improved', title: 'Notification action buttons',  description: 'Toast notifications can now include an action button (e.g. "Retry") that fires a callback and auto-dismisses.' },
    { icon: 'quiz',           tag: 'new',      title: 'Keyboard shortcut cheat-sheet',description: 'Press ? anywhere to see all keyboard shortcuts including the voice input hint (Ctrl+hold).' },
  ],
};

@Component({
  selector: 'app-whats-new',
  standalone: true,
  template: `
    @if (isOpen()) {
      <div class="wn-backdrop" (click)="dismiss()" role="presentation"></div>
      <div class="wn-modal" role="dialog" aria-modal="true" aria-labelledby="wn-title">
        <header class="wn-header">
          <span class="material-symbols-outlined wn-sparkle" aria-hidden="true">auto_awesome</span>
          <h2 class="wn-title" id="wn-title">What's new in v{{ version }}</h2>
          <button class="wn-close" (click)="dismiss()" aria-label="Close what's new">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <ul class="wn-list" role="list">
          @for (entry of entries(); track entry.title) {
            <li class="wn-item" role="listitem">
              <span class="wn-icon material-symbols-outlined" aria-hidden="true">{{ entry.icon }}</span>
              <div class="wn-text">
                <div class="wn-item-header">
                  <strong class="wn-item-title">{{ entry.title }}</strong>
                  <span class="wn-tag wn-tag--{{ entry.tag }}">{{ entry.tag }}</span>
                </div>
                <p class="wn-desc">{{ entry.description }}</p>
              </div>
            </li>
          }
        </ul>

        <footer class="wn-footer">
          <button class="wn-btn" (click)="dismiss()">Got it</button>
        </footer>
      </div>
    }
  `,
  styles: [`
    .wn-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: calc(var(--z-modal-backdrop) + 10);
      animation: wn-fade-in 0.2s ease;
    }

    .wn-modal {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      z-index: calc(var(--z-modal) + 10);
      width: min(540px, 95vw);
      max-height: 85vh;
      display: flex; flex-direction: column;
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.3);
      overflow: hidden;
      animation: wn-slide-in 0.25s cubic-bezier(0.16,1,0.3,1);
    }

    @keyframes wn-fade-in  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes wn-slide-in { from { opacity: 0; transform: translate(-50%,-48%) scale(0.96); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }

    .wn-header {
      display: flex; align-items: center; gap: 10px;
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .wn-sparkle {
      font-size: 22px;
      color: var(--accent-yellow, #f59e0b);
    }

    .wn-title {
      flex: 1; margin: 0;
      font-size: 16px; font-weight: 700;
      color: var(--text-primary);
    }

    .wn-close {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 6px;
      border: none; background: none; cursor: pointer;
      color: var(--text-tertiary);
      transition: background 0.12s, color 0.12s;
    }
    .wn-close:hover { background: var(--bg-hover); color: var(--text-primary); }
    .wn-close .material-symbols-outlined { font-size: 18px; }

    .wn-list {
      flex: 1; overflow-y: auto; margin: 0; padding: 12px 20px;
      list-style: none;
      display: flex; flex-direction: column; gap: 2px;
    }

    .wn-item {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 12px 10px; border-radius: 8px;
      transition: background 0.1s;
    }
    .wn-item:hover { background: var(--bg-hover); }

    .wn-icon {
      font-size: 20px; flex-shrink: 0; margin-top: 1px;
      color: var(--accent-blue, #6366f1);
    }

    .wn-text { flex: 1; min-width: 0; }

    .wn-item-header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 3px;
    }

    .wn-item-title {
      font-size: 13px; font-weight: 600;
      color: var(--text-primary);
    }

    .wn-tag {
      font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
      padding: 1px 6px; border-radius: 4px; text-transform: uppercase;
      flex-shrink: 0;
    }
    .wn-tag--new      { background: #6366f120; color: var(--accent-blue, #6366f1); }
    .wn-tag--improved { background: #10b98120; color: var(--accent-green, #10b981); }
    .wn-tag--fix      { background: #f59e0b20; color: var(--accent-yellow, #f59e0b); }

    .wn-desc {
      margin: 0; font-size: 12px; line-height: 1.5;
      color: var(--text-secondary);
    }

    .wn-footer {
      padding: 14px 20px;
      border-top: 1px solid var(--border-subtle);
      display: flex; justify-content: flex-end;
    }

    .wn-btn {
      padding: 8px 24px; border-radius: 8px;
      border: none; cursor: pointer;
      background: var(--accent-blue, #6366f1); color: #fff;
      font-size: 13px; font-weight: 600;
      transition: opacity 0.12s;
    }
    .wn-btn:hover { opacity: 0.88; }
  `],
})
export class WhatsNewComponent implements OnInit {
  readonly version = inject(APP_VERSION);

  isOpen = signal(false);
  entries = signal<ChangeEntry[]>([]);

  ngOnInit() {
    const seen = localStorage.getItem(SEEN_VERSION_KEY);
    if (seen === this.version) return;

    const log = CHANGELOG[this.version];
    if (!log?.length) {
      // No entry for this version — still mark as seen so we don't check again
      this.markSeen();
      return;
    }

    this.entries.set(log);
    setTimeout(() => this.isOpen.set(true), 1200);
  }

  dismiss() {
    this.isOpen.set(false);
    this.markSeen();
  }

  private markSeen() {
    localStorage.setItem(SEEN_VERSION_KEY, this.version);
  }
}
