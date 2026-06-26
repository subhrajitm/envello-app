import { Component, signal, OnInit, OnDestroy, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, TauriService, APP_VERSION, SyncService } from '@envello/core';

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

  currentStreak = computed(() => this.userStats()?.daysActive || 0);
  appVersion = signal(this.injectedVersion);
  isCollapsed = signal(false);
  isOnline = signal(navigator.onLine);

  readonly syncError = this.syncService.syncError;
  readonly syncAnimating = signal(false);
  readonly isActivelySyncing = computed(() => this.syncService.isSyncing() || this.syncAnimating());
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
    window.dispatchEvent(new CustomEvent('envello:manual-sync'));
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
