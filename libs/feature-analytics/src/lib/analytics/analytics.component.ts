import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService, AnalyticsStats } from '@envello/core';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsComponent {
  private analyticsService = inject(AnalyticsService);

  period = signal<7 | 30 | 90>(7);
  stats  = computed<AnalyticsStats>(() => this.analyticsService.compute(this.period()));

  setPeriod(p: 7 | 30 | 90) { this.period.set(p); }

  scoreLabel(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Getting started';
  }

  scoreColor(score: number): string {
    if (score >= 80) return 'var(--accent-green, #34d399)';
    if (score >= 60) return 'var(--accent-primary)';
    if (score >= 40) return 'var(--accent-yellow, #fbbf24)';
    return 'var(--accent-red, #f87171)';
  }

  meetingTypeIcon(type: string): string {
    const map: Record<string, string> = {
      video: 'videocam', phone: 'call', 'in-person': 'people', hybrid: 'devices',
    };
    return map[type] ?? 'event';
  }

  meetingTypeColor(type: string): string {
    const map: Record<string, string> = {
      video: 'var(--accent-primary)',
      phone: 'var(--accent-green, #34d399)',
      'in-person': 'var(--accent-yellow, #fbbf24)',
      hybrid: '#c084fc',
    };
    return map[type] ?? 'var(--text-tertiary)';
  }

  formatMinutes(mins: number): string {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  priorityColor(p: string): string {
    if (p === 'HIGH')   return 'var(--accent-red, #f87171)';
    if (p === 'MEDIUM') return 'var(--accent-yellow, #fbbf24)';
    return 'var(--accent-green, #34d399)';
  }

  pct(value: number, total: number): number {
    return total ? Math.round((value / total) * 100) : 0;
  }

  meetingTypePct(type: string): number {
    const s = this.stats();
    const total = s.meetings.inPeriod;
    return this.pct(s.meetings.byType[type] ?? 0, total);
  }

  periodLabel(): string {
    return { 7: 'Last 7 days', 30: 'Last 30 days', 90: 'Last 90 days' }[this.period()];
  }

  trackBar(_i: number, bar: { date: string }) { return bar.date; }
}
