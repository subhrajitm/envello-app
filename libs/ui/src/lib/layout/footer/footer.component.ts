import { Component, signal, OnInit, OnDestroy, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, TauriService, APP_VERSION } from '@envello/core';

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

  currentStreak = computed(() => this.userStats()?.daysActive || 0);
  appVersion = signal(this.injectedVersion);
  isCollapsed = signal(false);
  isOnline = signal(navigator.onLine);

  constructor() {
    effect(() => {
      if (this.tauriService.isTauri()) {
        this.tauriService.getVersion().then((v) => v && this.appVersion.set(v));
      }
    });
  }

  ngOnInit() {
    // Restore collapsed state
    const saved = localStorage.getItem('envello-footer-collapsed');
    if (saved === 'true') this.isCollapsed.set(true);
    // Track online/offline
    this._onOnline = () => this.isOnline.set(true);
    this._onOffline = () => this.isOnline.set(false);
    window.addEventListener('online', this._onOnline);
    window.addEventListener('offline', this._onOffline);
  }

  ngOnDestroy() {
    window.removeEventListener('online', this._onOnline!);
    window.removeEventListener('offline', this._onOffline!);
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
