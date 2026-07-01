import { Component, inject, signal, computed, ChangeDetectionStrategy, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService, AnalyticsStats, InsightItem, AiService } from '@envello/core';

const INSIGHT_TTL_MS = 30 * 60 * 1000; // 30 minutes

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
  protected aiService      = inject(AiService);

  period          = signal<7 | 30 | 90>(7);
  customFrom      = signal('');
  customTo        = signal('');
  showCustomRange = signal(false);

  insightItems       = signal<InsightItem[]>([]);
  insightLoading     = signal(false);
  insightError       = signal('');
  insightGeneratedAt = signal(0);

  constructor() {
    afterNextRender(() => this.loadInsight());
  }

  stats = computed<AnalyticsStats>(() => {
    const from = this.customFrom();
    const to   = this.customTo();
    if (from && to && from < to) return this.analyticsService.computeRange(from, to);
    return this.analyticsService.compute(this.period());
  });

  // ── Period controls ──────────────────────────────────────────────────────────

  setPeriod(p: 7 | 30 | 90) {
    this.period.set(p);
    this.clearCustomRange();
    this.insightItems.set([]);
    this.insightGeneratedAt.set(0);
    this.loadInsight();
  }

  toggleCustomRange() {
    const next = !this.showCustomRange();
    this.showCustomRange.set(next);
    if (!next) this.clearCustomRange();
  }

  clearCustomRange() {
    this.customFrom.set('');
    this.customTo.set('');
    this.showCustomRange.set(false);
  }

  // ── AI insight ───────────────────────────────────────────────────────────────

  async loadInsight(force = false): Promise<void> {
    if (this.insightLoading()) return;
    if (!this.aiService.aiEnabled()) { this.insightItems.set([]); return; }

    if (!force) {
      const cached = this.readInsightCache();
      if (cached) {
        this.insightItems.set(cached.items);
        this.insightGeneratedAt.set(cached.generatedAt);
        return;
      }
    }

    this.insightItems.set([]);
    this.insightError.set('');
    this.insightLoading.set(true);

    try {
      const items = await this.analyticsService.generateInsight(this.stats());
      this.insightItems.set(items);
      this.insightGeneratedAt.set(Date.now());
      this.writeInsightCache(items);
    } catch {
      this.insightError.set('Could not generate insight. Check your AI settings.');
    } finally {
      this.insightLoading.set(false);
    }
  }

  private insightCacheKey(): string {
    const s = this.stats();
    return `envello:insight:${s.period}:${s.from}`;
  }

  private readInsightCache(): { items: InsightItem[]; generatedAt: number } | null {
    try {
      const raw = sessionStorage.getItem(this.insightCacheKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.generatedAt > INSIGHT_TTL_MS) return null;
      return parsed;
    } catch { return null; }
  }

  private writeInsightCache(items: InsightItem[]): void {
    try {
      sessionStorage.setItem(this.insightCacheKey(), JSON.stringify({ items, generatedAt: Date.now() }));
    } catch { /* storage full or unavailable */ }
  }

  timeSinceInsight(): string {
    const t = this.insightGeneratedAt();
    if (!t) return '';
    const mins = Math.floor((Date.now() - t) / 60_000);
    if (mins < 1) return 'just now';
    if (mins === 1) return '1 min ago';
    if (mins < 60) return `${mins} min ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }

  iconForCategory(cat: string): string {
    return ({
      streak:   'local_fire_department',
      tasks:    'task_alt',
      notes:    'edit_note',
      meetings: 'groups',
      writing:  'auto_stories',
      warning:  'warning',
      focus:    'center_focus_strong',
    } as Record<string, string>)[cat] ?? 'lightbulb';
  }

  colorForCategory(cat: string): string {
    return ({
      streak:   'var(--accent-yellow, #fbbf24)',
      tasks:    'var(--accent-primary)',
      notes:    'var(--accent-green, #34d399)',
      meetings: 'var(--accent-yellow, #fbbf24)',
      writing:  'var(--accent-purple, #c084fc)',
      warning:  'var(--accent-red, #f87171)',
      focus:    'var(--accent-primary)',
    } as Record<string, string>)[cat] ?? 'var(--text-secondary)';
  }

  // ── Labels ───────────────────────────────────────────────────────────────────

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

  periodLabel(): string {
    const s   = this.stats();
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const from = fmt(new Date(s.from + 'T12:00:00'));
    const to   = fmt(new Date());
    const range = `${from} – ${to}`;
    if (this.customFrom()) return range;
    const label = ({ 7: 'Last 7 days', 30: 'Last 30 days', 90: 'Last 90 days' } as Record<number, string>)[this.period()];
    return `${label} · ${range}`;
  }

  statusLabel(s: string): string {
    return ({ ACTIVE: 'Active', COMPLETED: 'Done', PENDING: 'Pending' } as Record<string, string>)[s] ?? s;
  }

  priorityLabel(s: string): string {
    return ({ HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' } as Record<string, string>)[s] ?? s;
  }

  bookStatusLabel(s: string): string {
    return ({ DRAFTING: 'Drafting', PLANNING: 'Planning', REVISING: 'Revising', PUBLISHED: 'Published' } as Record<string, string>)[s] ?? s;
  }

  deltaClass(d: number): string {
    if (d > 0) return 'an-stat-delta an-stat-delta--up';
    if (d < 0) return 'an-stat-delta an-stat-delta--down';
    return 'an-stat-delta an-stat-delta--flat';
  }

  deltaLabel(d: number): string {
    if (d === 0) return '— vs prev';
    const sign = d > 0 ? '↑' : '↓';
    return `${sign} ${Math.abs(d)}% vs prev`;
  }

  streakLabel(s: number): string {
    if (s === 0) return 'no activity today';
    if (s === 1) return '1 day';
    return `${s} days`;
  }

  formatProjectedDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    const yearsOut = (d.getTime() - Date.now()) / (365.25 * 86_400_000);
    if (yearsOut > 5) return '5+ years away';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ── Chart ────────────────────────────────────────────────────────────────────

  trackBar(_i: number, bar: { date: string }) { return bar.date; }

  rollingAvgPoints(): string {
    const bars = this.stats().daily;
    if (bars.length < 2) return '';
    const n = bars.length;
    return bars.map((_, i) => {
      const start = Math.max(0, i - 3);
      const end   = Math.min(n - 1, i + 3);
      const slice = bars.slice(start, end + 1);
      const avg   = slice.reduce((s, b) => s + b.height, 0) / slice.length;
      return `${(((i + 0.5) / n) * 100).toFixed(1)},${(100 - avg).toFixed(1)}`;
    }).join(' ');
  }

  sparklinePoints(): string {
    const h = this.stats().scoreHistory;
    if (h.length < 2) return '';
    const n = h.length;
    return h.map((entry, i) => {
      const x = (i / (n - 1)) * 100;
      const y = 38 - (entry.score / 100) * 34;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  sparklineFill(): string {
    const pts = this.sparklinePoints();
    if (!pts) return '';
    return `${pts} 100,40 0,40`;
  }

  sparklineRange(): { min: number; max: number } | null {
    const h = this.stats().scoreHistory;
    if (h.length < 2) return null;
    const scores = h.map(e => e.score);
    return { min: Math.min(...scores), max: Math.max(...scores) };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  meetingTypeIcon(type: string): string {
    return ({ video: 'videocam', phone: 'call', 'in-person': 'people', hybrid: 'devices' } as Record<string, string>)[type] ?? 'event';
  }

  meetingTypeColor(type: string): string {
    return ({
      video: 'var(--accent-primary)',
      phone: 'var(--accent-green, #34d399)',
      'in-person': 'var(--accent-yellow, #fbbf24)',
      hybrid: 'var(--accent-purple, #c084fc)',
    } as Record<string, string>)[type] ?? 'var(--text-tertiary)';
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
    return this.pct(s.meetings.byType[type] ?? 0, s.meetings.inPeriod);
  }

  sortedMeetingTypes(): { key: string; value: number }[] {
    return Object.entries(this.stats().meetings.byType)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({ key, value }));
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  exportCsv(): void {
    const s = this.stats();
    const rows: (string | number)[][] = [
      ['Envello Analytics Export'],
      [`Period: ${s.period} days (${s.from} to ${new Date().toISOString().split('T')[0]})`],
      [],
      ['PRODUCTIVITY'],
      ['Score', s.productivityScore],
      ['Streak (days)', s.streak],
      ['Tasks component', `${s.scoreBreakdown.tasks}/40`],
      ['Notes component', `${s.scoreBreakdown.notes}/25`],
      ['Meetings component', `${s.scoreBreakdown.meetings}/20`],
      ['Writing component', `${s.scoreBreakdown.writing}/15`],
      [],
      ['TASKS'],
      ['New tasks (period)', s.tasks.createdInPeriod],
      ['Completed (all time)', s.tasks.completed],
      ['Completion rate', `${s.tasks.completionRate}%`],
      ['Overdue', s.tasks.overdue],
      ['Overdue rate', `${s.tasks.overdueRate}%`],
      ['Velocity (tasks/day)', s.tasks.velocity],
      [],
      ['NOTES'],
      ['Created (period)', s.notes.createdInPeriod],
      ['Edited (period)', s.notes.editedInPeriod],
      ['Total notes', s.notes.total],
      [],
      ['MEETINGS'],
      ['Meetings (period)', s.meetings.inPeriod],
      ['Total time (min)', s.meetings.totalMinutes],
      ['Avg duration (min)', s.meetings.avgDuration],
      [],
      ['WRITING'],
      ['Total words', s.writing.totalWords],
      ['Overall progress', `${s.writing.overallProgress}%`],
      ['Velocity (words/day)', s.writing.overallVelocity],
      [],
      ['BOOKMARKS'],
      ['Saved (period)', s.bookmarks.savedInPeriod],
      ['Total', s.bookmarks.total],
      ['Total visits', s.bookmarks.totalVisits],
    ];

    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `envello-analytics-${s.from}-${s.period}d.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
