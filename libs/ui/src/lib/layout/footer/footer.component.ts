import { Component, signal, OnInit, OnDestroy, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService, TauriService, APP_VERSION, SyncService, PowerSyncService } from '@envello/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent implements OnInit, OnDestroy {
  private userService = inject(UserService);
  private tauriService = inject(TauriService);
  private readonly injectedVersion = inject(APP_VERSION);
  private userStats = computed(() => this.userService.user()?.stats);

  private readonly syncService = inject(SyncService);
  private readonly ps = inject(PowerSyncService);
  private readonly router = inject(Router);

  currentStreak = computed(() => this.userStats()?.daysActive || 0);
  appVersion = signal(this.injectedVersion);
  isCollapsed = signal(false);
  isOnline = signal(navigator.onLine);

  readonly syncError      = this.syncService.syncError;
  readonly pendingUploads = this.syncService.pendingUploads;
  readonly isConnected    = this.ps.isConnected;
  readonly syncAnimating = signal(false);
  readonly isActivelySyncing = computed(() => this.syncService.isSyncing() || this.ps.isSyncing() || this.syncAnimating());

  /** Derived state for the 4-color status: synced | syncing | error | offline */
  readonly syncState = computed<'synced' | 'syncing' | 'error' | 'offline'>(() => {
    if (this.syncError())        return 'error';
    if (this.isActivelySyncing()) return 'syncing';
    if (this.isConnected())      return 'synced';
    return 'offline';
  });

  readonly syncLabel = computed(() => {
    switch (this.syncState()) {
      case 'syncing': return 'Syncing…';
      case 'error':   return 'Sync error';
      case 'offline': return 'Offline';
      default:        return 'Synced';
    }
  });

  readonly syncTooltip = computed(() => {
    if (this.syncError())         return `Sync error: ${this.syncError()}`;
    if (this.isActivelySyncing()) return 'Sync in progress…';
    if (this.isConnected())       return 'All data synced · Click to open sync settings';
    return 'Not connected to sync · Click to open sync settings';
  });
  private syncAnimTimer: ReturnType<typeof setTimeout> | null = null;

  private syncCompleteListener = () => {
    this.syncAnimating.set(true);
    if (this.syncAnimTimer) clearTimeout(this.syncAnimTimer);
    this.syncAnimTimer = setTimeout(() => this.syncAnimating.set(false), 800);
  };
  private syncErrorListener = (e: Event) => {
    const msg = (e as CustomEvent).detail ?? 'Sync failed';
    this.syncService.reportError(msg);
  };

  constructor() {
    effect(() => {
      if (this.tauriService.isTauri()) {
        this.tauriService.getVersion().then((v) => v && this.appVersion.set(v));
      }
    });
  }

  ngOnInit() {
    const saved = localStorage.getItem('envello-footer-collapsed');
    if (saved === 'true') this.isCollapsed.set(true);
    this._onOnline = () => this.isOnline.set(true);
    this._onOffline = () => this.isOnline.set(false);
    window.addEventListener('online', this._onOnline);
    window.addEventListener('offline', this._onOffline);
    window.addEventListener('envello:sync-complete', this.syncCompleteListener);
    window.addEventListener('envello:sync-error', this.syncErrorListener);
  }

  ngOnDestroy() {
    window.removeEventListener('online', this._onOnline!);
    window.removeEventListener('offline', this._onOffline!);
    window.removeEventListener('envello:sync-complete', this.syncCompleteListener);
    window.removeEventListener('envello:sync-error', this.syncErrorListener);
    if (this.syncAnimTimer) clearTimeout(this.syncAnimTimer);
  }

  triggerManualSync(): void {
    this.router.navigate(['/settings'], { queryParams: { section: 'data' } });
  }

  retrySync(): void {
    this.syncService.retryPendingSync();
  }

  private _onOnline?: () => void;
  private _onOffline?: () => void;

  toggleCollapse() {
    this.isCollapsed.update(v => !v);
    localStorage.setItem('envello-footer-collapsed', String(this.isCollapsed()));
  }

  get syncStatusLabel(): string {
    return this.isOnline() ? 'Online' : 'Offline';
  }

  get syncStatusClass(): string {
    return this.isOnline() ? 'sync-online' : 'sync-offline';
  }

  streakIndicator(index: number): boolean {
    // Logic to show visual streak progress (last 4 days active indicators)
    // For now, we simulate full activity if streak > 3
    const streak = this.currentStreak();
    if (streak > 3) return true;
    return index < streak;
  }

}
