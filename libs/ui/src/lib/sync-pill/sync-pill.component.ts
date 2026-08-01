import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { PowerSyncService } from '@envello/core';

@Component({
  selector: 'lib-sync-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="sync-pill"
      type="button"
      [class]="pillClass()"
      [title]="pillTooltip()"
      (click)="openSyncSettings()"
      aria-label="Sync status"
    >
      <span class="sync-pill-dot" [class.sync-pill-dot--spin]="isSyncing()" aria-hidden="true"></span>
      <span class="sync-pill-label" aria-live="polite" aria-atomic="true">{{ pillLabel() }}</span>
    </button>
  `,
  styles: [`
    .sync-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 20px;
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      font-size: 11.5px;
      font-weight: 500;
      transition: background 0.12s;
      color: var(--text-tertiary);
    }
    .sync-pill:hover { background: var(--bg-hover); }

    .sync-pill--synced {
      color: var(--accent-green);
      border-color: color-mix(in srgb, var(--accent-green) 30%, transparent);
      background: color-mix(in srgb, var(--accent-green) 8%, transparent);
    }
    .sync-pill--syncing {
      color: var(--accent-primary);
      border-color: color-mix(in srgb, var(--accent-primary) 30%, transparent);
      background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
    }
    .sync-pill--error {
      color: var(--accent-red);
      border-color: color-mix(in srgb, var(--accent-red) 30%, transparent);
      background: color-mix(in srgb, var(--accent-red) 8%, transparent);
    }
    .sync-pill--offline {
      color: var(--text-tertiary);
      border-color: var(--border-subtle);
    }

    .sync-pill-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;
    }
    @keyframes sync-spin {
      0%   { opacity: 1; transform: scale(1); }
      50%  { opacity: 0.4; transform: scale(0.7); }
      100% { opacity: 1; transform: scale(1); }
    }
    .sync-pill-dot--spin {
      animation: sync-spin 1s ease-in-out infinite;
    }

    .sync-pill-label { white-space: nowrap; }
  `]
})
export class SyncPillComponent {
  private readonly ps     = inject(PowerSyncService);
  private readonly router = inject(Router);

  readonly isConnected = this.ps.isConnected;
  readonly isSyncing   = this.ps.isSyncing;
  readonly syncError   = this.ps.syncError;

  readonly pillClass = computed(() => {
    if (this.syncError()) return 'sync-pill sync-pill--error';
    if (this.isSyncing())  return 'sync-pill sync-pill--syncing';
    if (this.isConnected()) return 'sync-pill sync-pill--synced';
    return 'sync-pill sync-pill--offline';
  });

  readonly pillLabel = computed(() => {
    if (this.syncError()) return 'Sync error';
    if (this.isSyncing())  return 'Syncing…';
    if (this.isConnected()) return 'Synced';
    return 'Offline';
  });

  readonly pillTooltip = computed(() => {
    if (this.syncError()) return `Sync error: ${this.syncError()}`;
    if (this.isSyncing())  return 'Sync in progress…';
    if (this.isConnected()) return 'All data synced';
    return 'Not connected to sync';
  });

  openSyncSettings() {
    this.router.navigate(['/settings'], { queryParams: { section: 'data' } });
  }
}
