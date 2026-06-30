import { Injectable, inject } from '@angular/core';
import { StoreService } from './store.service';
import { MeetingsService } from './meetings.service';
import { AiService } from './ai.service';
import { Task } from '@envello/domain';

export interface InsightItem {
  category: 'streak' | 'tasks' | 'notes' | 'meetings' | 'writing' | 'warning' | 'focus';
  text: string;
}

export interface DayBar {
  date: string;   // YYYY-MM-DD
  label: string;  // "Mon" or "15"
  tasks: number;
  notes: number;
  meetings: number;
  total: number;  // absolute count for tooltip/display
  height: number; // 0–100 for chart scaling (absolute, not relative to peak)
}

export interface AnalyticsStats {
  period: number;
  from: string;

  tasks: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    overdueRate: number; // % of open tasks that are overdue
    completionRate: number;
    createdInPeriod: number;
    velocity: number; // tasks created per day (avg)
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
    topProjects: { name: string; count: number }[];
  };

  notes: {
    total: number;
    createdInPeriod: number;
    editedInPeriod: number;
    uniqueTagCount: number;
    topTags: { tag: string; count: number }[];
  };

  meetings: {
    total: number;
    inPeriod: number;
    totalMinutes: number;
    avgDuration: number;
    byType: Record<string, number>;
  };

  writing: {
    totalWords: number;
    totalTarget: number;
    overallProgress: number;
    overallVelocity: number; // words/day across all active books
    books: {
      title: string;
      wordCount: number;
      targetWordCount: number;
      progress: number;
      status: string;
      velocityWordsPerDay: number;
      projectedDate: string | null; // YYYY-MM-DD estimated completion
    }[];
  };

  bookmarks: {
    total: number;
    savedInPeriod: number;
    totalVisits: number;
  };

  daily: DayBar[];
  productivityScore: number;
  scoreBreakdown: { tasks: number; notes: number; meetings: number; writing: number };
  scoreHistory: { date: string; score: number }[]; // last 30 days recorded
  streak: number;
  peakDay: string | null; // day of week with highest avg activity
  focusRatio: { deepWorkDays: number; meetingDays: number; totalActiveDays: number };
  deltas: { tasks: number; notes: number; meetings: number; bookmarks: number };
}

// Score component caps (must sum to 100)
const SCORE_CAPS = { tasks: 40, notes: 25, meetings: 20, writing: 15 } as const;

// Minimum scale so a quiet period with 1 item/day doesn't look like a full bar
const CHART_MIN_SCALE = 8;

const SCORE_HISTORY_KEY = 'envello:score_history';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private store    = inject(StoreService);
  private meetings = inject(MeetingsService);
  private ai       = inject(AiService);

  compute(period: number): AnalyticsStats {
    const today = new Date();
    const from  = new Date(today);
    from.setDate(from.getDate() - period);
    return this.computeRange(from.toISOString().split('T')[0], today.toISOString().split('T')[0]);
  }

  computeRange(fromStr: string, toStr: string): AnalyticsStats {
    const period = Math.max(1, Math.round((new Date(toStr).getTime() - new Date(fromStr).getTime()) / 86_400_000));

    const tasks     = this.taskStats(fromStr, toStr, period);
    const notes     = this.noteStats(fromStr, toStr);
    const meetings  = this.meetingStats(fromStr, toStr);
    const writing   = this.writingStats();
    const bookmarks = this.bookmarkStats(fromStr, toStr);
    const daily     = this.buildDailyBars(fromStr, toStr, period);
    const { score, breakdown: scoreBreakdown } = this.productivityScore(tasks, notes, meetings, writing);
    const streak    = this.computeStreak();
    const peakDay   = this.peakDayOfWeek(daily);
    const prev      = this.prevWindowStats(fromStr, period);

    const focusRatio = {
      deepWorkDays:  daily.filter(b => b.notes + b.tasks > 0).length,
      meetingDays:   daily.filter(b => b.meetings > 0).length,
      totalActiveDays: daily.filter(b => b.total > 0).length,
    };

    const deltas = {
      tasks:     this.deltaPercent(tasks.createdInPeriod, prev.tasksCreated),
      notes:     this.deltaPercent(notes.createdInPeriod, prev.notesCreated),
      meetings:  this.deltaPercent(meetings.inPeriod,     prev.meetings),
      bookmarks: this.deltaPercent(bookmarks.savedInPeriod, prev.bookmarks),
    };

    // Persist today's score when viewing the current period (not a historical custom range)
    const todayStr = new Date().toISOString().split('T')[0];
    if (toStr === todayStr) this.persistScore(todayStr, score);
    const scoreHistory = this.readScoreHistory(30);

    return { period, from: fromStr, tasks, notes, meetings, writing, bookmarks, daily, productivityScore: score, scoreBreakdown, scoreHistory, streak, peakDay, focusRatio, deltas };
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────────

  private taskStats(from: string, today: string, period: number) {
    const all = this.flattenTasks(this.store.tasks());

    const completed = all.filter(t => t.status === 'COMPLETED').length;
    const pending   = all.filter(t => t.status !== 'COMPLETED').length;
    const overdue   = all.filter(t => t.due && t.due < today && t.status !== 'COMPLETED').length;
    const total     = all.length;

    const createdInPeriod = all.filter(t => t.createdAt && t.createdAt.slice(0, 10) >= from && t.createdAt.slice(0, 10) <= today).length;
    const velocity = parseFloat((createdInPeriod / period).toFixed(1));

    const byPriority: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    const byStatus:   Record<string, number> = { ACTIVE: 0, COMPLETED: 0, PENDING: 0 };
    const projectMap = new Map<string, number>();

    for (const t of all) {
      byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
      byStatus[t.status]     = (byStatus[t.status]     ?? 0) + 1;
      if (t.project) projectMap.set(t.project, (projectMap.get(t.project) ?? 0) + 1);
    }

    const topProjects = [...projectMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const completionRate = total ? Math.round((completed / total) * 100) : 0;
    const openTasks = total - completed;
    const overdueRate = openTasks > 0 ? Math.round((overdue / openTasks) * 100) : 0;

    return { total, completed, pending, overdue, overdueRate, completionRate, createdInPeriod, velocity, byPriority, byStatus, topProjects };
  }

  // ─── Notes ─────────────────────────────────────────────────────────────────

  private noteStats(from: string, to: string) {
    const all = this.store.notes();
    const tagMap = new Map<string, number>();

    let createdInPeriod = 0;
    let editedInPeriod  = 0;

    for (const n of all) {
      if (n.date >= from && n.date <= to)                                                       createdInPeriod++;
      if (n.lastEdited && n.lastEdited.slice(0, 10) >= from && n.lastEdited.slice(0, 10) <= to) editedInPeriod++;
      for (const tag of (n.tags ?? [])) tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }

    const uniqueTagCount = tagMap.size;
    const topTags = [...tagMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count]) => ({ tag, count }));

    return { total: all.length, createdInPeriod, editedInPeriod, uniqueTagCount, topTags };
  }

  // ─── Meetings ──────────────────────────────────────────────────────────────

  private meetingStats(from: string, to: string) {
    const all = this.meetings.meetings();
    const inPeriod = all.filter(m => m.date >= from && m.date <= to && m.status !== 'cancelled');
    const byType: Record<string, number> = {};
    let totalMinutes = 0;

    for (const m of inPeriod) {
      totalMinutes += m.duration ?? 45;
      const t = m.meetingType ?? 'other';
      byType[t] = (byType[t] ?? 0) + 1;
    }

    const avgDuration = inPeriod.length ? Math.round(totalMinutes / inPeriod.length) : 0;

    return { total: all.length, inPeriod: inPeriod.length, totalMinutes, avgDuration, byType };
  }

  // ─── Writing ───────────────────────────────────────────────────────────────

  private writingStats() {
    const books = this.store.books().filter(b => b.status !== 'PUBLISHED');
    const totalWords  = books.reduce((s, b) => s + (b.wordCount ?? 0), 0);
    const totalTarget = books.reduce((s, b) => s + (b.targetWordCount ?? 0), 0);
    const overallProgress = totalTarget ? Math.round((totalWords / totalTarget) * 100) : 0;

    const now = Date.now();
    const mappedBooks = books
      .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
      .slice(0, 4)
      .map(b => {
        const startMs = new Date(b.createdDate ?? b.lastUpdated).getTime();
        const daysSince = Math.max(1, Math.floor((now - startMs) / 86_400_000));
        const velocityWordsPerDay = Math.round(b.wordCount / daysSince);
        const wordsRemaining = Math.max(0, (b.targetWordCount ?? 0) - b.wordCount);
        const projectedDate = velocityWordsPerDay > 0 && wordsRemaining > 0
          ? new Date(now + (wordsRemaining / velocityWordsPerDay) * 86_400_000).toISOString().split('T')[0]
          : null;
        return { title: b.title, wordCount: b.wordCount, targetWordCount: b.targetWordCount, progress: b.progress, status: b.status, velocityWordsPerDay, projectedDate };
      });

    const overallVelocity = mappedBooks.reduce((s, b) => s + b.velocityWordsPerDay, 0);

    return { totalWords, totalTarget, overallProgress, overallVelocity, books: mappedBooks };
  }

  // ─── Bookmarks ─────────────────────────────────────────────────────────────

  private bookmarkStats(from: string, to: string) {
    const all = this.store.bookmarks();
    return {
      total: all.length,
      savedInPeriod: all.filter(b => b.createdAt >= from && b.createdAt <= to).length,
      totalVisits: all.reduce((s, b) => s + (b.visitCount ?? 0), 0),
    };
  }

  // ─── Daily bars ────────────────────────────────────────────────────────────

  private buildDailyBars(from: string, today: string, period: number): DayBar[] {
    const allTasks    = this.flattenTasks(this.store.tasks());
    const allNotes    = this.store.notes();
    const allMeetings = this.meetings.meetings();

    const bars: DayBar[] = [];
    const useShortLabel = period <= 14;

    const cur = new Date(from);
    cur.setDate(cur.getDate() + 1); // start day after "from" for inclusive period
    const end = new Date(today);
    end.setDate(end.getDate() + 1);

    while (cur <= end) {
      const d = cur.toISOString().split('T')[0];
      const tasks    = allTasks.filter(t => t.createdAt?.slice(0, 10) === d).length;
      const notes    = allNotes.filter(n => n.date === d || n.lastEdited?.slice(0, 10) === d).length;
      const meetings = allMeetings.filter(m => m.date === d).length;
      bars.push({
        date: d,
        label: useShortLabel
          ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][cur.getDay()]
          : String(cur.getDate()),
        tasks, notes, meetings,
        total: tasks + notes + meetings,
        height: 0,
      });
      cur.setDate(cur.getDate() + 1);
    }

    // Scale to absolute ceiling — CHART_MIN_SCALE ensures a quiet period
    // doesn't make every bar look like 100% activity (was: relative to peak)
    const actualMax = Math.max(0, ...bars.map(b => b.total));
    const scale = Math.max(CHART_MIN_SCALE, actualMax);
    for (const b of bars) {
      b.height = Math.round((b.total / scale) * 100);
    }

    return bars;
  }

  // ─── Productivity score (0–100) ────────────────────────────────────────────

  private productivityScore(
    tasks: AnalyticsStats['tasks'],
    notes: AnalyticsStats['notes'],
    meetings: AnalyticsStats['meetings'],
    writing: AnalyticsStats['writing'],
  ): { score: number; breakdown: AnalyticsStats['scoreBreakdown'] } {
    const t = Math.min(SCORE_CAPS.tasks,    Math.round(tasks.completionRate * (SCORE_CAPS.tasks / 100)));
    const n = Math.min(SCORE_CAPS.notes,    Math.round((notes.createdInPeriod + notes.editedInPeriod) * 2.5));
    const m = Math.min(SCORE_CAPS.meetings, Math.round(meetings.inPeriod * 6.7));
    const w = writing.books.length > 0
      ? Math.min(SCORE_CAPS.writing, Math.round((writing.overallProgress / 100) * SCORE_CAPS.writing + (writing.totalWords > 0 ? 5 : 0)))
      : 0;

    return {
      score: Math.min(100, t + n + m + w),
      breakdown: { tasks: t, notes: n, meetings: m, writing: w },
    };
  }

  // ─── Streak ────────────────────────────────────────────────────────────────

  private computeStreak(): number {
    const allTasks    = this.flattenTasks(this.store.tasks());
    const allNotes    = this.store.notes();
    const allMeetings = this.meetings.meetings();
    const today = new Date();
    let streak = 0;

    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];

      const active =
        allTasks.some(t => t.createdAt?.slice(0, 10) === ds) ||
        allNotes.some(n => n.date === ds || n.lastEdited?.slice(0, 10) === ds) ||
        allMeetings.some(m => m.date === ds);

      if (!active) break;
      streak++;
    }

    return streak;
  }

  // ─── Previous-window stats for delta computation ───────────────────────────

  private prevWindowStats(fromStr: string, period: number) {
    const prevFrom = new Date(fromStr);
    prevFrom.setDate(prevFrom.getDate() - period);
    const prevFromStr = prevFrom.toISOString().split('T')[0];

    const allTasks    = this.flattenTasks(this.store.tasks());
    const allNotes    = this.store.notes();
    const allMeetings = this.meetings.meetings();
    const allBookmarks = this.store.bookmarks();

    return {
      tasksCreated: allTasks.filter(t => t.createdAt && t.createdAt.slice(0, 10) >= prevFromStr && t.createdAt.slice(0, 10) < fromStr).length,
      notesCreated: allNotes.filter(n => n.date >= prevFromStr && n.date < fromStr).length,
      meetings:     allMeetings.filter(m => m.date >= prevFromStr && m.date < fromStr && m.status !== 'cancelled').length,
      bookmarks:    allBookmarks.filter(b => b.createdAt >= prevFromStr && b.createdAt < fromStr).length,
    };
  }

  private deltaPercent(current: number, prev: number): number {
    if (prev === 0 && current === 0) return 0;
    if (prev === 0) return 100;
    return Math.round(((current - prev) / prev) * 100);
  }

  private peakDayOfWeek(bars: DayBar[]): string | null {
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const totals: Record<string, { sum: number; count: number }> = {};

    for (const bar of bars) {
      // Use noon to avoid DST edge cases
      const day = DAY_NAMES[new Date(bar.date + 'T12:00:00').getDay()];
      if (!totals[day]) totals[day] = { sum: 0, count: 0 };
      totals[day].sum += bar.total;
      totals[day].count++;
    }

    let best = '';
    let bestAvg = 0;
    for (const [day, { sum, count }] of Object.entries(totals)) {
      const avg = sum / count;
      if (avg > bestAvg) { bestAvg = avg; best = day; }
    }

    return bestAvg > 0 ? best : null;
  }

  // ─── AI insight ────────────────────────────────────────────────────────────

  async generateInsight(stats: AnalyticsStats): Promise<InsightItem[]> {
    const system = [
      'You are a productivity coach. Return ONLY a valid JSON array of exactly 3 objects.',
      'Each object: { "category": one of [streak,tasks,notes,meetings,writing,warning,focus], "text": one sentence max 20 words, "you" voice, specific numbers }.',
      'Output ONLY the JSON array. No markdown, no prose, no explanation.',
    ].join(' ');

    try {
      const response = await this.ai.sendMessage(this.buildInsightPrompt(stats), system, 'summarize');
      if (response.startsWith('[MOCK]') || !response.trim().startsWith('[')) {
        return this.ruleBasedInsight(stats);
      }
      const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean) as InsightItem[];
      if (!Array.isArray(parsed) || parsed.length === 0) return this.ruleBasedInsight(stats);
      return parsed.slice(0, 3);
    } catch {
      return this.ruleBasedInsight(stats);
    }
  }

  private buildInsightPrompt(s: AnalyticsStats): string {
    const sign = (n: number) => (n >= 0 ? `+${n}%` : `${n}%`);
    const lines = [
      `Last ${s.period} days:`,
      `Score: ${s.productivityScore}/100 · streak: ${s.streak} days`,
      `Tasks: ${s.tasks.createdInPeriod} new (${sign(s.deltas.tasks)}), ${s.tasks.completionRate}% completion, ${s.tasks.overdueRate}% overdue, ${s.tasks.velocity}/day`,
      `Notes: ${s.notes.createdInPeriod} created (${sign(s.deltas.notes)}), ${s.notes.editedInPeriod} edited`,
      `Meetings: ${s.meetings.inPeriod} (${Math.round((s.meetings.totalMinutes / 60) * 10) / 10}h total)`,
    ];
    if (s.writing.totalWords > 0) lines.push(`Writing: ${s.writing.overallVelocity} words/day, ${s.writing.overallProgress}% overall`);
    if (s.peakDay) lines.push(`Peak day: ${s.peakDay}s`);
    if (s.scoreHistory.length >= 3) {
      const trend = s.scoreHistory.at(-1)!.score - s.scoreHistory[0].score;
      lines.push(`Score trend: ${sign(trend)} over ${s.scoreHistory.length} recorded days`);
    }
    return lines.join('\n');
  }

  private ruleBasedInsight(s: AnalyticsStats): InsightItem[] {
    const items: InsightItem[] = [];

    if (s.streak >= 3) {
      items.push({ category: 'streak', text: `You're on a ${s.streak}-day streak — strong consistency, keep it alive today.` });
    } else if (s.streak === 0) {
      items.push({ category: 'focus', text: `No activity logged today yet — one task or note will restart your streak.` });
    } else {
      items.push({ category: 'streak', text: `${s.streak}-day streak so far — aim for 3 consecutive days to build momentum.` });
    }

    if (s.tasks.overdueRate >= 30) {
      items.push({ category: 'warning', text: `${s.tasks.overdueRate}% of your open tasks are overdue — close the 2 oldest before adding anything new.` });
    } else if (s.tasks.completionRate >= 70) {
      items.push({ category: 'tasks', text: `Your ${s.tasks.completionRate}% task completion rate is excellent — you're executing well this period.` });
    } else if (s.deltas.tasks > 30 && s.tasks.completionRate < 50) {
      items.push({ category: 'warning', text: `You added ${s.tasks.createdInPeriod} tasks (+${s.deltas.tasks}%) but completion is only ${s.tasks.completionRate}% — clear before creating more.` });
    } else {
      items.push({ category: 'tasks', text: `${s.tasks.completionRate}% completion this period with ${s.tasks.velocity} tasks/day velocity.` });
    }

    if (s.deltas.notes < -25) {
      const gap = Math.round(25 - s.scoreBreakdown.notes);
      items.push({ category: 'notes', text: `Note-taking dropped ${Math.abs(s.deltas.notes)}% — one daily note would recover up to ${gap} score points.` });
    } else if (s.writing.overallVelocity > 0) {
      items.push({ category: 'writing', text: `At ${s.writing.overallVelocity} words/day you're ${s.writing.overallProgress}% through your writing goals.` });
    } else if (s.peakDay) {
      items.push({ category: 'focus', text: `${s.peakDay}s are your most productive day — schedule your deepest work then.` });
    } else {
      items.push({ category: 'focus', text: `Score: ${s.productivityScore}/100 this period. Configure AI in settings for personalised insights.` });
    }

    return items;
  }

  // ─── Score history (localStorage) ─────────────────────────────────────────

  private persistScore(date: string, score: number): void {
    try {
      const raw = localStorage.getItem(SCORE_HISTORY_KEY);
      const history: Record<string, number> = raw ? JSON.parse(raw) : {};
      history[date] = score;
      // Prune anything older than 90 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      for (const d of Object.keys(history)) {
        if (d < cutoffStr) delete history[d];
      }
      localStorage.setItem(SCORE_HISTORY_KEY, JSON.stringify(history));
    } catch { /* localStorage unavailable */ }
  }

  private readScoreHistory(days: number): { date: string; score: number }[] {
    try {
      const raw = localStorage.getItem(SCORE_HISTORY_KEY);
      if (!raw) return [];
      const history: Record<string, number> = JSON.parse(raw);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      return Object.entries(history)
        .filter(([d]) => d >= cutoffStr)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, score]) => ({ date, score }));
    } catch { return []; }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private flattenTasks(tasks: Task[]): Task[] {
    const out: Task[] = [];
    for (const t of tasks) {
      out.push(t);
      if (t.subtasks?.length) out.push(...this.flattenTasks(t.subtasks as Task[]));
    }
    return out;
  }
}
