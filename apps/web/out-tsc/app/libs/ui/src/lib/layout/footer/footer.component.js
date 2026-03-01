import { __decorate } from "tslib";
import { Component, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, TauriService } from '@envello/core';
// import { environment } from '../../../../environments/environment'; // Environment might not be accessible easily from libs, assume injected or ignore for now
let FooterComponent = class FooterComponent {
    userService = inject(UserService);
    tauriService = inject(TauriService);
    // Stats from User Service
    userStats = computed(() => this.userService.user()?.stats);
    // Signals for UI
    currentStreak = computed(() => this.userStats()?.daysActive || 0);
    sessionDuration = signal('00:00:00');
    appVersion = signal('0.1.0');
    sessionStartTime = Date.now();
    timerInterval;
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
    streakIndicator(index) {
        // Logic to show visual streak progress (last 4 days active indicators)
        // For now, we simulate full activity if streak > 3
        const streak = this.currentStreak();
        if (streak > 3)
            return true;
        return index < streak;
    }
    startSessionTimer() {
        this.sessionStartTime = Date.now(); // Reset start time on init
        this.timerInterval = setInterval(() => {
            const now = Date.now();
            const diff = now - this.sessionStartTime;
            this.sessionDuration.set(this.formatDuration(diff));
        }, 1000);
    }
    stopSessionTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }
    formatDuration(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const pad = (num) => num.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
};
FooterComponent = __decorate([
    Component({
        selector: 'app-footer',
        standalone: true,
        imports: [CommonModule],
        templateUrl: './footer.component.html',
        styleUrl: './footer.component.css'
    })
], FooterComponent);
export { FooterComponent };
