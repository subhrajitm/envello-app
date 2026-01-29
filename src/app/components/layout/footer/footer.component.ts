import { Component, signal, OnInit, OnDestroy, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../services/user.service';
import { TauriService } from '../../../core/services/tauri.service';
import { environment } from '../../../../environments/environment';

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

  // Stats from User Service
  private userStats = computed(() => this.userService.user()?.stats);

  // Signals for UI
  currentStreak = computed(() => this.userStats()?.daysActive || 0);
  sessionDuration = signal('00:00:00');
  appVersion = signal(environment.version);

  private sessionStartTime: number = Date.now();
  private timerInterval: any;

  constructor() {
    effect(() => {
      if (this.tauriService.isTauri()) {
        this.tauriService.getVersion().then((v) => v && this.appVersion.set(v));
      }
    });
  }

  ngOnInit() {
    this.startSessionTimer();
  }

  ngOnDestroy() {
    this.stopSessionTimer();
  }

  streakIndicator(index: number): boolean {
    // Logic to show visual streak progress (last 4 days active indicators)
    // For now, we simulate full activity if streak > 3
    const streak = this.currentStreak();
    if (streak > 3) return true;
    return index < streak;
  }

  private startSessionTimer() {
    this.sessionStartTime = Date.now(); // Reset start time on init

    this.timerInterval = setInterval(() => {
      const now = Date.now();
      const diff = now - this.sessionStartTime;
      this.sessionDuration.set(this.formatDuration(diff));
    }, 1000);
  }

  private stopSessionTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
}
